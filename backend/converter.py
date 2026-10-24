"""
Convierte archivos DIAN Excel (.xlsx) a Parquet.
Replica la misma lógica de normalización de src/parser.js:
  - Encabezados por nombre (trim + mayúsculas); solo las columnas necesarias
  - Columnas obligatorias ausentes → error; opcionales ausentes → vacías
  - Textos sin espacios a los lados; vacíos → '(sin dato)'
  - SUBPARTIDA: solo dígitos → pad_start(10, '0'); vacía → '(sin dato)'
  - Capítulo = 2 primeros dígitos, partida = 4
  - FECHA_DECLARACION_EXPORTACION → Int32 YYYYMMDD (mismos formatos que toYMD)
  - FECHA_PROCESO → str YYYYMM; si falta, se toma de la fecha de declaración
  - Nulos en dims → '(sin dato)', nulos en nums → 0.0
  - Descarta filas sin país, exportador ni FOB (igual que parser.js)
"""
from datetime import date
from pathlib import Path
import os

import fastexcel
import polars as pl

NODATA = '(sin dato)'

# Excel header → nombre interno
DIMS_MAP: dict[str, str] = {
    'FECHA_PROCESO':              'mes',
    'ADUANA_DESPACHO':            'aduana',
    'COD_LUG_SALIDA_ALF':         'lugar',
    'MODO_TRANSPORTE':            'modo',
    'NACIONALIDAD_BANDERA':       'bandera',
    'RAZON_SOCIAL_DECLARANTE':    'declarante',
    'REGION_DE_ORIGEN':           'dpto',
    'REGION_PROCEDENCIA':         'proc',
    'RAZON_SOCIAL_EXPORTADOR':    'exportador',
    'NIT_EXPORTADOR':             'nit',
    'PAIS_DESTINO_FINAL':         'pais',
    'CIUDAD_DESTINATARIO':        'ciudad',
    'RAZON_SOCIAL_DESTINATARIO':  'destinatario',
    'SUBPARTIDA':                 'subpartida',
    'UNIDAD_FISICA':              'unidad',
    'MODALIDAD_EXPORTACION':      'modalidad',
    'TIPO_DESPACHO':              'despacho',
    'TIPO_DE_EMBARQUE':           'embarque',
    'TIPO_DE_DATOS':              'tipo_datos',
    'COD_MONEDA_TRANSACCION':     'moneda',
    'FORMA_PAGO':                 'pago',
    'EXPORTACION_EN_TRANSITO':    'transito',
    'SISTEMAS_ESPECIALES':        'sisesp',
    'TIPO_CERTIFICADO_ORIGEN':    'cert',
    'NUMERO_FORMULARIO':          'formulario',
}
NUMS_MAP: dict[str, str] = {
    'VALOR_FOB_USD':              'fob_usd',
    'VALOR_FOB_PESOS':            'fob_cop',
    'PESO_NETO_KGS':              'kg_neto',
    'PESO_BRUTO_KGS':             'kg_bruto',
    'VALOR_SERIE_FLETES_USD':     'fletes',
    'VALOR_SERIE_SEGUROS_USD':    'seguros',
    'VLR_SERIE_OTROS_GASTOS_USD': 'otros',
    'VLR_SERIE_AGREGADO_NAL_USD': 'agregado',
    'CANTIDAD_UNIDADES_FISICAS':  'cant',
}
FECHA_H = 'FECHA_DECLARACION_EXPORTACION'

# Sin estas columnas las cifras de control no se pueden calcular: se rechaza el archivo.
# Las demás, si faltan, se crean vacías ('(sin dato)' / 0) y se informan en el resultado.
REQUIRED = [
    'NUMERO_FORMULARIO', 'ADUANA_DESPACHO', 'RAZON_SOCIAL_EXPORTADOR',
    'PAIS_DESTINO_FINAL', 'SUBPARTIDA', 'VALOR_FOB_USD', 'PESO_NETO_KGS',
]

# Orden fijo de columnas: todos los Parquet quedan con el mismo esquema
COLUMNS = [*DIMS_MAP.values(), 'capitulo', 'partida', 'fecha', *NUMS_MAP.values()]

EXCEL_EPOCH = date(1899, 12, 30)


class ConversionError(ValueError):
    """Archivo que no se puede convertir; el mensaje es para el usuario."""


def _norm(h: str) -> str:
    """Encabezado comparable, igual que parser.js: trim + mayúsculas."""
    return h.strip().upper()


def _as_text(col: str, dtype: pl.DataType) -> pl.Expr:
    """
    Cualquier tipo leído por calamine → texto. Un entero guardado como número
    (901119000.0, NIT, formulario) se escribe sin decimales, como en el XML.
    """
    e = pl.col(col)
    if dtype.is_float():
        return (pl.when(e == e.floor())
                .then(e.cast(pl.Int64, strict=False).cast(pl.Utf8))
                .otherwise(e.cast(pl.Utf8)))
    return e.cast(pl.Utf8, strict=False)


def _read_sheet(xlsx_path: Path) -> tuple[pl.DataFrame, list[str]]:
    """
    Lee de la primera hoja solo las columnas conocidas, ya renombradas.
    Dimensiones y fecha quedan como texto; las medidas como Float64.
    Retorna (df, encabezados opcionales ausentes).

    Una sola pasada por la hoja: calamine procesa la hoja entera en cada
    load_sheet, así que leer primero los encabezados duplicaría el tiempo.
    Los tipos se infieren con todas las filas (schema_sample_rows=None): con la
    muestra por defecto (1.000 filas) un texto que aparece más abajo en una
    columna numérica se convertiría en nulo sin aviso.
    """
    known = {**DIMS_MAP, FECHA_H: 'fecha', **NUMS_MAP}
    sheet = fastexcel.read_excel(str(xlsx_path)).load_sheet(
        0,
        use_columns=lambda c: _norm(str(c.name)) in known,
        schema_sample_rows=None,
    )
    df = sheet.to_polars()

    by_norm: dict[str, str] = {}
    for c in df.columns:
        by_norm.setdefault(_norm(c), c)
    missing_req = [h for h in REQUIRED if h not in by_norm]
    if missing_req:
        raise ConversionError(
            'Faltan columnas obligatorias en la fila 1: ' + ', '.join(missing_req))
    if 'FECHA_PROCESO' not in by_norm and FECHA_H not in by_norm:
        raise ConversionError(f'Falta FECHA_PROCESO o {FECHA_H}: no se puede saber el mes.')

    present = {h: k for h, k in known.items() if h in by_norm}
    df = df.select([
        (pl.col(by_norm[h]).cast(pl.Float64, strict=False) if h in NUMS_MAP
         else _as_text(by_norm[h], df.schema[by_norm[h]])).alias(k)
        for h, k in present.items()
    ])

    # Columnas opcionales ausentes → vacías, para que el esquema sea siempre igual
    absent = [h for h in known if h not in present]
    df = df.with_columns([
        pl.lit(None, pl.Float64 if h in NUMS_MAP else pl.Utf8).alias(known[h])
        for h in absent
    ])
    return df, absent


def _clean_text(col: str) -> pl.Expr:
    """
    Texto como lo lee parser.js: sin espacios a los lados y con los vacíos
    como null. Un entero que llegue como "87.0" se escribe "87", como aparece
    en el XML del Excel.
    """
    e = pl.col(col).str.strip_chars().str.replace(r'^(-?\d+)\.0+$', '${1}')
    return pl.when(e == '').then(None).otherwise(e)


def _to_ymd(col: str) -> pl.Expr:
    """
    Fecha → entero YYYYMMDD, con las mismas reglas que toYMD() de parser.js:
    'AAAA-MM-DD…', 'DD/MM/AAAA', entero AAAAMMDD o número de serie de Excel.
    Lo que no se reconoce queda en 0.
    """
    s = pl.col(col).str.strip_chars()
    iso = s.str.extract_groups(r'^(\d{4})-(\d{2})-(\d{2})')
    dmy = s.str.extract_groups(r'^(\d{1,2})/(\d{1,2})/(\d{4})')
    part = lambda g, i: g.struct.field(str(i)).cast(pl.Int32)
    n = s.cast(pl.Float64, strict=False)
    serial = pl.lit(EXCEL_EPOCH) + pl.duration(days=n.floor().cast(pl.Int64))
    return pl.coalesce(
        part(iso, 1) * 10000 + part(iso, 2) * 100 + part(iso, 3),
        part(dmy, 3) * 10000 + part(dmy, 2) * 100 + part(dmy, 1),
        pl.when((n >= 19000101) & (n <= 29991231)).then(n.round().cast(pl.Int32)),
        pl.when((n > 20000) & (n < 90000)).then(
            serial.dt.year() * 10000 + serial.dt.month().cast(pl.Int32) * 100
            + serial.dt.day().cast(pl.Int32)),
        pl.lit(0),
    ).cast(pl.Int32)


def _n_distinct(df: pl.DataFrame, col: str) -> int:
    """Valores distintos sin contar '(sin dato)' (igual que query._distinct)."""
    return int(df.filter(pl.col(col) != NODATA)[col].n_unique())


def excel_to_parquet(xlsx_path: Path, output_dir: Path) -> dict:
    """
    Lee el Excel DIAN y escribe output_dir/{mes}.parquet, donde {mes} es el
    FECHA_PROCESO con más filas. Si ya existe un Parquet de ese mes, lo reemplaza.
    Retorna stats de validación para comparar contra los valores de control.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    df, absent = _read_sheet(xlsx_path)

    # ── Textos: trim y vacío → null (se rellena con NODATA más abajo) ─────
    # Sin esto "ESTADOS UNIDOS" y "ESTADOS UNIDOS " cuentan como dos países.
    text_cols = [v for v in DIMS_MAP.values() if v not in ('mes', 'subpartida')]
    df = df.with_columns([_clean_text(c).alias(c) for c in text_cols])

    # ── SUBPARTIDA: solo dígitos, rellenar a 10 con ceros ────────────────
    # El Excel guarda 0901119000 como número 901119000 (pierde el cero inicial).
    # Una subpartida vacía queda en '(sin dato)', no en '0000000000'.
    sub = _clean_text('subpartida').str.replace_all(r'\D', '')
    df = df.with_columns(
        pl.when(sub == '').then(None).otherwise(sub.str.pad_start(10, '0'))
        .alias('subpartida')
    )

    # Derivar capítulo y partida arancelaria (nulos si no hay subpartida)
    df = df.with_columns([
        pl.col('subpartida').str.slice(0, 2).alias('capitulo'),
        pl.col('subpartida').str.slice(0, 4).alias('partida'),
    ])

    # ── FECHA (FECHA_DECLARACION_EXPORTACION): YYYYMMDD como Int32 ────────
    df = df.with_columns(_to_ymd('fecha').alias('fecha'))

    # ── MES (FECHA_PROCESO): "202601.0" → "202601"; si falta, sale de la fecha ──
    mes = _clean_text('mes')
    mes_num = mes.cast(pl.Float64, strict=False).round().cast(pl.Int64).cast(pl.Utf8)
    df = df.with_columns(
        pl.when(mes_num.is_not_null()).then(mes_num)
        .when(mes.is_not_null()).then(mes)
        .when(pl.col('fecha') > 0).then((pl.col('fecha') // 100).cast(pl.Utf8))
        .alias('mes')
    )

    # ── Descartar filas vacías (igual que parser.js línea 212) ───────────
    # Se evalúa antes de rellenar nulos: así una fila con FOB = 0 explícito
    # se conserva, como en el prototipo.
    df = df.filter(
        ~(
            pl.col('pais').is_null() &
            pl.col('fob_usd').is_null() &
            pl.col('exportador').is_null()
        )
    )
    if df.is_empty():
        raise ConversionError('El archivo no tiene filas de datos.')

    # ── Rellenar nulos ───────────────────────────────────────────────────
    df = df.with_columns(
        [pl.col(c).fill_null(NODATA) for c in [*DIMS_MAP.values(), 'capitulo', 'partida']]
        + [pl.col(c).fill_null(0.0) for c in NUMS_MAP.values()]
    ).select(COLUMNS)

    # ── Mes del archivo: el que tiene más filas ──────────────────────────
    # Un archivo de enero con unas pocas filas de diciembre se guarda como
    # enero y no sobrescribe diciembre. El filtro por mes usa la columna
    # `mes`, así que esas filas siguen apareciendo en diciembre.
    by_month = (df.filter(pl.col('mes') != NODATA)
                .group_by('mes').len()
                .sort(['len', 'mes'], descending=[True, False]))
    if by_month.is_empty():
        raise ConversionError('Ninguna fila tiene FECHA_PROCESO ni fecha de declaración.')
    primary = by_month['mes'][0]

    # Escritura atómica: una consulta en curso nunca lee un Parquet a medio escribir
    out_path = output_dir / f'{primary}.parquet'
    replaced = out_path.exists()
    tmp_path = out_path.with_suffix('.parquet.tmp')
    df.write_parquet(tmp_path, compression='snappy')
    os.replace(tmp_path, out_path)

    # ── Stats de validación ───────────────────────────────────────────────
    return {
        'path':          str(out_path),
        'month':         primary,
        'replaced':      replaced,
        'months':        sorted(by_month['mes'].to_list()),
        'rows_by_month': dict(by_month.sort('mes').iter_rows()),
        'missing_columns': absent,
        'n':           len(df),
        'fob_usd':     float(df['fob_usd'].sum()),
        'kg_neto':     float(df['kg_neto'].sum()),
        'formularios': _n_distinct(df, 'formulario'),
        'exportadores':_n_distinct(df, 'exportador'),
        'paises':      _n_distinct(df, 'pais'),
        'subpartidas': _n_distinct(df, 'subpartida'),
        'aduanas':     _n_distinct(df, 'aduana'),
    }

"""
Convierte archivos DIAN Excel (.xlsx) a Parquet.
Replica la misma lógica de normalización de src/parser.js:
  - Solo extrae las columnas necesarias (DIMS + NUMS + FECHA)
  - SUBPARTIDA: float→int→str→pad_start(10, '0')
  - Capítulo = 2 primeros dígitos, partida = 4
  - FECHA_DECLARACION_EXPORTACION → Int32 YYYYMMDD
  - FECHA_PROCESO → str YYYYMM
  - Nulos en dims → '(sin dato)', nulos en nums → 0.0
  - Descarta filas sin país, exportador ni FOB (igual que parser.js)
"""
from pathlib import Path
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

# Columnas que el Excel puede almacenar como float pero deben ser string
# (NITs y formularios pueden tener >15 dígitos significativos)
STR_OVERRIDES = {
    'NUMERO_FORMULARIO': pl.Utf8,
    'NIT_EXPORTADOR':    pl.Utf8,
}


def excel_to_parquet(xlsx_path: Path, output_dir: Path) -> dict:
    """
    Lee el Excel DIAN y escribe output_dir/{mes_principal}.parquet
    Retorna stats de validación para comparar contra los valores de control.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    df = pl.read_excel(
        xlsx_path,
        engine='calamine',
        schema_overrides=STR_OVERRIDES,
    )

    # Solo columnas que necesitamos (defensivo: ignora columnas ausentes)
    want = (set(DIMS_MAP) | set(NUMS_MAP) | {FECHA_H}) & set(df.columns)
    df = df.select(sorted(want, key=lambda c: c))

    # Renombrar a nombres internos
    rename = {}
    for h, k in DIMS_MAP.items():
        if h in df.columns:
            rename[h] = k
    for h, k in NUMS_MAP.items():
        if h in df.columns:
            rename[h] = k
    if FECHA_H in df.columns:
        rename[FECHA_H] = 'fecha'
    df = df.rename(rename)

    # ── SUBPARTIDA: float→int→str→pad_start(10,'0') ──────────────────────
    # El Excel guarda 0901119000 como float 901119000.0 (pierde el cero inicial).
    # Float→Int descarta el .0, luego pad_start restaura el cero.
    if 'subpartida' in df.columns:
        df = df.with_columns(
            pl.col('subpartida')
            .cast(pl.Float64, strict=False)
            .cast(pl.Int64, strict=False)
            .cast(pl.Utf8)
            .fill_null('')
            .str.pad_start(10, '0')
            .alias('subpartida')
        )

    # Derivar capítulo y partida arancelaria
    if 'subpartida' in df.columns:
        df = df.with_columns([
            pl.col('subpartida').str.slice(0, 2).alias('capitulo'),
            pl.col('subpartida').str.slice(0, 4).alias('partida'),
        ])

    # ── MES (FECHA_PROCESO): float→int→str, p. ej. 202601.0 → "202601" ──
    if 'mes' in df.columns:
        df = df.with_columns(
            pl.col('mes')
            .cast(pl.Float64, strict=False)
            .cast(pl.Int64, strict=False)
            .cast(pl.Utf8)
            .fill_null('')
            .alias('mes')
        )

    # ── FECHA (FECHA_DECLARACION_EXPORTACION): YYYYMMDD como Int32 ────────
    if 'fecha' in df.columns:
        df = df.with_columns(
            pl.col('fecha')
            .cast(pl.Float64, strict=False)
            .cast(pl.Int32, strict=False)
            .fill_null(0)
            .alias('fecha')
        )

    # ── Rellenar nulos en dimensiones ────────────────────────────────────
    dim_cols = [v for h, v in DIMS_MAP.items() if v in df.columns]
    for col in ['capitulo', 'partida']:
        if col in df.columns and col not in dim_cols:
            dim_cols.append(col)
    df = df.with_columns([
        pl.col(c).cast(pl.Utf8, strict=False).fill_null(NODATA).alias(c)
        for c in dim_cols
    ])

    # ── Rellenar nulos en medidas ─────────────────────────────────────────
    num_cols = [v for h, v in NUMS_MAP.items() if v in df.columns]
    df = df.with_columns([
        pl.col(c).cast(pl.Float64, strict=False).fill_null(0.0).alias(c)
        for c in num_cols
    ])

    # ── Descartar filas vacías (igual que parser.js línea 212) ───────────
    have = lambda c: c in df.columns
    if have('pais') and have('fob_usd') and have('exportador'):
        df = df.filter(
            ~(
                (pl.col('pais') == NODATA) &
                (pl.col('fob_usd') == 0.0) &
                (pl.col('exportador') == NODATA)
            )
        )

    # ── Determinar mes principal y ruta de salida ─────────────────────────
    months: list[str] = []
    if 'mes' in df.columns:
        months = sorted(
            m for m in df['mes'].unique().to_list()
            if m and m != NODATA
        )
    primary = months[0] if months else 'unknown'
    out_path = output_dir / f'{primary}.parquet'
    df.write_parquet(out_path, compression='snappy')

    # ── Stats de validación ───────────────────────────────────────────────
    return {
        'path':        str(out_path),
        'months':      months,
        'n':           len(df),
        'fob_usd':     float(df['fob_usd'].sum())       if have('fob_usd')     else 0.0,
        'kg_neto':     float(df['kg_neto'].sum())       if have('kg_neto')     else 0.0,
        'formularios': int(df['formulario'].n_unique()) if have('formulario')  else 0,
        'exportadores':int(df['exportador'].n_unique()) if have('exportador')  else 0,
        'paises':      int(df['pais'].n_unique())       if have('pais')        else 0,
        'subpartidas': int(df['subpartida'].n_unique()) if have('subpartida')  else 0,
        'aduanas':     int(df['aduana'].n_unique())     if have('aduana')      else 0,
    }

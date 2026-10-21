"""
Capa de consultas DuckDB sobre archivos Parquet.
Replica las operaciones de app.js: buildMask, groupBy, topIds, unique.
Todas las queries son stateless: cada llamada abre una conexión en memoria,
escanea los Parquet y retorna resultados. Sin caché persistente.
"""
from __future__ import annotations
from pathlib import Path
from typing import Optional, Any
from dataclasses import dataclass, field
import json
import duckdb

# ── Conjuntos válidos (previenen inyección SQL en nombres de columna) ──────
VALID_DIMS = frozenset({
    'mes', 'aduana', 'lugar', 'modo', 'bandera', 'declarante', 'dpto', 'proc',
    'exportador', 'nit', 'pais', 'ciudad', 'destinatario', 'capitulo', 'partida',
    'subpartida', 'unidad', 'modalidad', 'despacho', 'embarque', 'tipo_datos',
    'moneda', 'pago', 'transito', 'sisesp', 'cert', 'formulario',
})
VALID_MEASURES = frozenset({'fob_usd', 'fob_cop', 'kg_neto', 'kg_bruto', 'cant'})
VALID_KG = frozenset({'kg_neto', 'kg_bruto'})
VALID_SORT_RECORDS = frozenset({
    'fecha', 'fob_usd', 'kg_neto', 'exportador', 'pais', 'subpartida', 'aduana', 'modo',
})
TEXT_DIMS = ['exportador', 'destinatario', 'pais', 'subpartida', 'declarante', 'ciudad']


# ── Parámetros de filtro (equivalente al estado S del frontend) ────────────
@dataclass
class FilterParams:
    months:   Optional[list[str]]       = None
    filters:  dict[str, list[str]]      = field(default_factory=dict)
    date_min: Optional[int]             = None   # YYYYMMDD
    date_max: Optional[int]             = None
    fob_min:  Optional[float]           = None
    fob_max:  Optional[float]           = None
    kg_min:   Optional[float]           = None
    kg_max:   Optional[float]           = None
    kg_kind:  str                       = 'kg_neto'
    text:     Optional[str]             = None


@dataclass
class GroupParams(FilterParams):
    dim:     str             = 'pais'
    measure: str             = 'fob_usd'
    limit:   Optional[int]  = 500


@dataclass
class RecordsParams(FilterParams):
    sort:      str = 'fob_usd'
    direction: int = -1   # -1 DESC, 1 ASC
    page:      int = 0
    page_size: int = 100


@dataclass
class TimeParams(FilterParams):
    granularity: str            = 'mes'   # 'mes' | 'dia'
    stack_dim:   Optional[str]  = None


# ── Helpers internos ───────────────────────────────────────────────────────
def resolve_files(data_dir: Path, months: Optional[list[str]]) -> list[Path]:
    if not data_dir.exists():
        return []
    files = sorted(data_dir.glob('*.parquet'))
    if months:
        files = [f for f in files if f.stem in months]
    return files


def _from(files: list[Path]) -> str:
    """Cláusula FROM para DuckDB con lista de Parquet."""
    paths = json.dumps([str(f) for f in files])
    return f'read_parquet({paths})'


def _where(p: FilterParams) -> tuple[str, list]:
    """
    Construye cláusula WHERE y lista de parámetros para DuckDB.
    Valida todos los nombres de columna contra listas blancas.
    """
    clauses: list[str] = []
    args: list[Any] = []

    for dim, values in (p.filters or {}).items():
        if dim not in VALID_DIMS or not values:
            continue
        placeholders = ', '.join('?' for _ in values)
        clauses.append(f'"{dim}" IN ({placeholders})')
        args.extend(values)

    if p.date_min: clauses.append('fecha >= ?');  args.append(p.date_min)
    if p.date_max: clauses.append('fecha <= ?');  args.append(p.date_max)
    if p.fob_min is not None: clauses.append('fob_usd >= ?'); args.append(p.fob_min)
    if p.fob_max is not None: clauses.append('fob_usd <= ?'); args.append(p.fob_max)

    kg_col = p.kg_kind if p.kg_kind in VALID_KG else 'kg_neto'
    if p.kg_min is not None: clauses.append(f'"{kg_col}" >= ?'); args.append(p.kg_min)
    if p.kg_max is not None: clauses.append(f'"{kg_col}" <= ?'); args.append(p.kg_max)

    if p.text and p.text.strip():
        t = f'%{p.text.strip().lower()}%'
        text_clause = ' OR '.join(f'LOWER("{c}") LIKE ?' for c in TEXT_DIMS)
        clauses.append(f'({text_clause})')
        args.extend([t] * len(TEXT_DIMS))

    where = ('WHERE ' + ' AND '.join(clauses)) if clauses else ''
    return where, args


def _run(sql: str, args: list) -> list[tuple]:
    with duckdb.connect() as con:
        return con.execute(sql, args).fetchall()


# ── Funciones públicas ─────────────────────────────────────────────────────
def empty_summary() -> dict:
    return {'n': 0, 'fob': 0.0, 'cop': 0.0, 'kg': 0.0,
            'formularios': 0, 'exportadores': 0, 'paises': 0,
            'subpartidas': 0, 'aduanas': 0}


def month_stats(parquet_path: Path) -> dict:
    """Stats rápidos de un Parquet (para GET /api/months)."""
    row = _run(
        f"SELECT COUNT(*), SUM(fob_usd), SUM(kg_neto) FROM read_parquet('{parquet_path}')",
        []
    )[0]
    return {'n': row[0], 'fob': row[1] or 0.0, 'kg': row[2] or 0.0}


def summary(files: list[Path], p: FilterParams) -> dict:
    """
    Equivalente a R.k en app.js:
    totales y conteos únicos para los filtros aplicados.
    """
    src = _from(files)
    where, args = _where(p)
    sql = f"""
        SELECT
            COUNT(*)                    AS n,
            SUM(fob_usd)               AS fob,
            SUM(fob_cop)               AS cop,
            SUM(kg_neto)               AS kg,
            COUNT(DISTINCT formulario) AS formularios,
            COUNT(DISTINCT exportador) AS exportadores,
            COUNT(DISTINCT pais)       AS paises,
            COUNT(DISTINCT subpartida) AS subpartidas,
            COUNT(DISTINCT aduana)     AS aduanas
        FROM {src}
        {where}
    """
    row = _run(sql, args)[0]
    keys = ['n', 'fob', 'cop', 'kg', 'formularios', 'exportadores', 'paises', 'subpartidas', 'aduanas']
    result = dict(zip(keys, row))
    # Convertir None a 0 si el dataset está vacío
    return {k: (v if v is not None else 0) for k, v in result.items()}


def group(files: list[Path], p: GroupParams) -> list[dict]:
    """
    Equivalente a groupBy(dim, mask) + topIds en app.js.
    Retorna filas ordenadas por la medida pedida.
    """
    if p.dim not in VALID_DIMS:
        return []
    measure = p.measure if p.measure in VALID_MEASURES else 'fob_usd'
    limit = p.limit or 500

    src = _from(files)
    where, args = _where(p)
    sql = f"""
        SELECT
            "{p.dim}"       AS key,
            SUM(fob_usd)   AS fob_usd,
            SUM(fob_cop)   AS fob_cop,
            SUM(kg_neto)   AS kg,
            COUNT(*)       AS cnt
        FROM {src}
        {where}
        GROUP BY "{p.dim}"
        ORDER BY {measure} DESC NULLS LAST
        LIMIT ?
    """
    args.append(limit)
    rows = _run(sql, args)
    return [
        {'key': r[0], 'fob_usd': r[1] or 0.0, 'fob_cop': r[2] or 0.0,
         'kg': r[3] or 0.0, 'cnt': r[4]}
        for r in rows
    ]


def records(files: list[Path], p: RecordsParams) -> dict:
    """
    Registros paginados para la pestaña Registros (equivalente a renderRegistros).
    """
    sort_col = p.sort if p.sort in VALID_SORT_RECORDS else 'fob_usd'
    direction = 'ASC' if p.direction == 1 else 'DESC'
    page_size = min(max(1, p.page_size), 500)
    offset = max(0, p.page) * page_size

    src = _from(files)
    where, args = _where(p)

    with duckdb.connect() as con:
        total = con.execute(f'SELECT COUNT(*) FROM {src} {where}', list(args)).fetchone()[0]
        rows = con.execute(f"""
            SELECT fecha, exportador, pais, subpartida, aduana, modo, kg_neto, fob_usd
            FROM {src}
            {where}
            ORDER BY "{sort_col}" {direction} NULLS LAST
            LIMIT ? OFFSET ?
        """, args + [page_size, offset]).fetchall()

    return {
        'total': total,
        'rows': [
            {'fecha': r[0], 'exportador': r[1], 'pais': r[2], 'subpartida': r[3],
             'aduana': r[4], 'modo': r[5], 'kg_neto': r[6] or 0.0, 'fob_usd': r[7] or 0.0}
            for r in rows
        ],
    }


def timeseries(files: list[Path], p: TimeParams) -> list[dict]:
    """
    Evolución temporal (equivalente a timeChart en app.js).
    Con stack_dim devuelve filas por (periodo, stack_key) para desglose.
    """
    time_col = 'mes' if p.granularity == 'mes' else 'fecha'
    src = _from(files)
    where, args = _where(p)

    if p.stack_dim and p.stack_dim in VALID_DIMS:
        sd = p.stack_dim
        sql = f"""
            SELECT
                "{time_col}"  AS period,
                "{sd}"        AS stack_key,
                SUM(fob_usd) AS fob_usd,
                SUM(fob_cop) AS fob_cop,
                SUM(kg_neto) AS kg,
                COUNT(*)     AS cnt
            FROM {src}
            {where}
            GROUP BY "{time_col}", "{sd}"
            ORDER BY "{time_col}", fob_usd DESC NULLS LAST
        """
        rows = _run(sql, args)
        return [
            {'period': r[0], 'stack_key': r[1], 'fob_usd': r[2] or 0.0,
             'fob_cop': r[3] or 0.0, 'kg': r[4] or 0.0, 'cnt': r[5]}
            for r in rows
        ]
    else:
        sql = f"""
            SELECT
                "{time_col}"  AS period,
                SUM(fob_usd) AS fob_usd,
                SUM(fob_cop) AS fob_cop,
                SUM(kg_neto) AS kg,
                COUNT(*)     AS cnt
            FROM {src}
            {where}
            GROUP BY "{time_col}"
            ORDER BY "{time_col}"
        """
        rows = _run(sql, args)
        return [
            {'period': r[0], 'fob_usd': r[1] or 0.0,
             'fob_cop': r[2] or 0.0, 'kg': r[3] or 0.0, 'cnt': r[4]}
            for r in rows
        ]

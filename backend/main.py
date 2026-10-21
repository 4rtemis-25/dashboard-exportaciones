"""
Panel de Exportaciones — FastAPI backend
Ejecutar: uvicorn main:app --reload  (desde el directorio backend/)
"""
from __future__ import annotations
from pathlib import Path
from typing import Optional
import shutil
import tempfile

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from converter import excel_to_parquet
import query as Q

# Parquet files live in <project_root>/data/parquet/
DATA_DIR = Path(__file__).parent.parent / 'data' / 'parquet'

app = FastAPI(title='Panel de Exportaciones API', version='0.1.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
    allow_methods=['*'],
    allow_headers=['*'],
)


# ── Modelos Pydantic ───────────────────────────────────────────────────────
class FilterBody(BaseModel):
    months:   Optional[list[str]]       = None
    filters:  dict[str, list[str]]      = {}
    date_min: Optional[int]             = None
    date_max: Optional[int]             = None
    fob_min:  Optional[float]           = None
    fob_max:  Optional[float]           = None
    kg_min:   Optional[float]           = None
    kg_max:   Optional[float]           = None
    kg_kind:  str                       = 'kg_neto'
    text:     Optional[str]             = None


class GroupBody(FilterBody):
    dim:     str            = 'pais'
    measure: str            = 'fob_usd'
    limit:   Optional[int]  = 500


class RecordsBody(FilterBody):
    sort:      str = 'fob_usd'
    direction: int = -1
    page:      int = 0
    page_size: int = 100


class TimeBody(FilterBody):
    granularity: str           = 'mes'
    stack_dim:   Optional[str] = None


def _fp(b: FilterBody) -> Q.FilterParams:
    return Q.FilterParams(
        months=b.months, filters=b.filters,
        date_min=b.date_min, date_max=b.date_max,
        fob_min=b.fob_min, fob_max=b.fob_max,
        kg_min=b.kg_min, kg_max=b.kg_max,
        kg_kind=b.kg_kind, text=b.text,
    )


# ── Meses (carga y listado) ────────────────────────────────────────────────
@app.post('/api/months/upload')
def upload_month(file: UploadFile):
    """
    Sube un Excel DIAN, lo convierte a Parquet y retorna stats de validación.
    Si ya existe un Parquet para el mismo mes, lo reemplaza.
    """
    if not (file.filename or '').lower().endswith(('.xlsx', '.xlsm')):
        raise HTTPException(400, 'Solo se aceptan archivos .xlsx o .xlsm')

    content = file.file.read()
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        stats = excel_to_parquet(tmp_path, DATA_DIR)
    except Exception as e:
        raise HTTPException(500, f'Error al procesar el archivo: {e}')
    finally:
        tmp_path.unlink(missing_ok=True)

    return stats


@app.get('/api/months')
def list_months():
    """Lista los meses disponibles con stats básicos."""
    files = sorted(DATA_DIR.glob('*.parquet')) if DATA_DIR.exists() else []
    return [{'month': f.stem, **Q.month_stats(f)} for f in files]


@app.delete('/api/months/{month}')
def delete_month(month: str):
    path = DATA_DIR / f'{month}.parquet'
    if not path.exists():
        raise HTTPException(404, f'Mes {month!r} no encontrado')
    path.unlink()
    return {'deleted': month}


# ── Queries ────────────────────────────────────────────────────────────────
@app.post('/api/query/summary')
def query_summary(body: FilterBody):
    """
    Totales y conteos únicos para los filtros aplicados.
    Equivalente a compute() → R.k en app.js.
    """
    files = Q.resolve_files(DATA_DIR, body.months)
    if not files:
        return Q.empty_summary()
    return Q.summary(files, _fp(body))


@app.post('/api/query/group')
def query_group(body: GroupBody):
    """
    Agrega por una dimensión y retorna filas ordenadas por medida.
    Equivalente a groupBy(dim, mask) + topIds en app.js.

    Ejemplo de respuesta:
    [{"key": "Estados Unidos", "fob_usd": 1234.5, "fob_cop": 4938, "kg": 500, "cnt": 12}, ...]
    """
    files = Q.resolve_files(DATA_DIR, body.months)
    if not files:
        return []
    p = Q.GroupParams(**_fp(body).__dict__, dim=body.dim, measure=body.measure, limit=body.limit)
    return Q.group(files, p)


@app.post('/api/query/records')
def query_records(body: RecordsBody):
    """
    Registros paginados para la pestaña Registros.
    Retorna {total, rows: [{fecha, exportador, pais, subpartida, aduana, modo, kg_neto, fob_usd}]}.
    """
    files = Q.resolve_files(DATA_DIR, body.months)
    if not files:
        return {'total': 0, 'rows': []}
    p = Q.RecordsParams(
        **_fp(body).__dict__,
        sort=body.sort, direction=body.direction,
        page=body.page, page_size=body.page_size,
    )
    return Q.records(files, p)


@app.post('/api/query/timeseries')
def query_timeseries(body: TimeBody):
    """
    Serie temporal para el gráfico de evolución (pestaña Resumen → Gráficos).
    Con stack_dim incluye una columna stack_key para desglose por dimensión.
    """
    files = Q.resolve_files(DATA_DIR, body.months)
    if not files:
        return []
    p = Q.TimeParams(
        **_fp(body).__dict__,
        granularity=body.granularity, stack_dim=body.stack_dim,
    )
    return Q.timeseries(files, p)

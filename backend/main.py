"""
Panel de Exportaciones — FastAPI backend
Ejecutar: uvicorn main:app --reload  (desde el directorio backend/)
"""
from __future__ import annotations
from pathlib import Path
from typing import Literal, Optional
import logging
import re
import shutil
import tempfile

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from converter import ConversionError, excel_to_parquet
import query as Q

# Parquet files live in <project_root>/data/parquet/
DATA_DIR = Path(__file__).parent.parent / 'data' / 'parquet'

# Un mes real pesa ~34 MB; el margen cubre años con más operaciones
MAX_UPLOAD_MB = 200

log = logging.getLogger('panel')

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
    measure: Literal['fob_usd', 'fob_cop', 'kg', 'cnt'] = 'fob_usd'  # = Q.VALID_MEASURES
    limit:   Optional[int]  = 500
    q:       Optional[str]  = None


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

    # Copia por bloques al disco: no carga el archivo entero en memoria
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp:
        shutil.copyfileobj(file.file, tmp, 1024 * 1024)
        size = tmp.tell()
        tmp_path = Path(tmp.name)

    try:
        if size > MAX_UPLOAD_MB * 1024 * 1024:
            raise HTTPException(
                413, f'{file.filename}: pesa {size / 1e6:.0f} MB; el máximo es {MAX_UPLOAD_MB} MB')
        stats = excel_to_parquet(tmp_path, DATA_DIR)
    except ConversionError as e:
        raise HTTPException(400, f'{file.filename}: {e}')
    except HTTPException:
        raise
    except Exception:
        # El detalle va al log del servidor, no al navegador
        log.exception('Error al convertir %s', file.filename)
        raise HTTPException(500, f'{file.filename}: error inesperado al procesar el archivo')
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
    # Solo YYYYMM: evita rutas como '..\otro' (en Windows '\' separa carpetas)
    if not re.fullmatch(r'\d{6}', month):
        raise HTTPException(400, f'Mes no válido: {month!r}')
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
    files = Q.resolve_files(DATA_DIR)
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
    files = Q.resolve_files(DATA_DIR)
    if not files:
        return []
    p = Q.GroupParams(**_fp(body).__dict__, dim=body.dim, measure=body.measure, limit=body.limit, q=body.q)
    return Q.group(files, p)


@app.post('/api/query/records')
def query_records(body: RecordsBody):
    """
    Registros paginados para la pestaña Registros.
    Retorna {total, rows: [{fecha, exportador, pais, subpartida, aduana, modo, kg_neto, fob_usd}]}.
    """
    files = Q.resolve_files(DATA_DIR)
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
    files = Q.resolve_files(DATA_DIR)
    if not files:
        return []
    p = Q.TimeParams(
        **_fp(body).__dict__,
        granularity=body.granularity, stack_dim=body.stack_dim,
    )
    return Q.timeseries(files, p)

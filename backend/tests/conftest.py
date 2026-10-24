import sys
from pathlib import Path

import openpyxl
import pytest

# Permite `import converter, query, main` como lo hace uvicorn desde backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import converter  # noqa: E402

HEADERS = [
    'FECHA_PROCESO', 'FECHA_DECLARACION_EXPORTACION', 'NUMERO_FORMULARIO',
    'ADUANA_DESPACHO', 'RAZON_SOCIAL_EXPORTADOR', 'NIT_EXPORTADOR', 'PAIS_DESTINO_FINAL',
    'SUBPARTIDA', 'FORMA_PAGO', 'VALOR_FOB_USD', 'VALOR_FOB_PESOS', 'PESO_NETO_KGS',
]

# Casos borde reales del formato DIAN (ver auditoría)
ROWS = [
    # mes,   fecha,    formulario, aduana, exportador, nit, país,              subpartida,      pago, fob,   cop,     kg
    [202601, 20260105, 6001, 'BOG', 'A SAS',  900123456, 'ESTADOS UNIDOS',   901119000,       1,    100.0, 400000,  5000],
    [202601, 20260106, 6002, 'BOG', 'B SAS',  900123456, 'ESTADOS UNIDOS ',  901119000,       1,    50.0,  200000,  9000],   # espacio final
    [202601, 20260107, 6003, 'CTG', 'C SAS',  900123456, 'CHINA',            None,            2,    10.0,  40000,   90000],  # sin subpartida
    [202601, 20260108, 6004, 'CTG', 'D SAS',  900123456, '   ',              None,            2,    1.0,   4000,    1],      # país en blanco
    [202601, 20260109, 6005, 'CTG', None,     None, None,               None,            None, None,  None,    None],   # fila vacía → se descarta
    [202601, 20260110, 6006, 'CTG', None,     None, None,               2709000000,      None, 0.0,   0,       0],      # FOB 0 explícito → se conserva
]


def write_xlsx(path: Path, headers: list, rows: list) -> Path:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Sheet1'
    ws.append(headers)
    for r in rows:
        ws.append(r)
    wb.save(path)
    return path


@pytest.fixture
def parquet(tmp_path):
    """Convierte un Excel sintético y retorna (stats, ruta del Parquet)."""
    xlsx = write_xlsx(tmp_path / 'sintetico.xlsx', HEADERS, ROWS)
    stats = converter.excel_to_parquet(xlsx, tmp_path / 'parquet')
    return stats, Path(stats['path'])

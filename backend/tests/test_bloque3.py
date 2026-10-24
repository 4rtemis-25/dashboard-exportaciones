"""Bloque 3 de la auditoría: conteos únicos, búsqueda de texto, rutas y carga."""
import pytest
from fastapi.testclient import TestClient

import main
import query as Q
from conftest import HEADERS, ROWS, write_xlsx


# ── Punto 15: '(sin dato)' no cuenta como un valor distinto ─────────────────
def test_resumen_no_cuenta_sin_dato(parquet):
    stats, path = parquet
    s = Q.summary([path], Q.FilterParams())
    assert s['paises'] == 2
    assert s['exportadores'] == 4        # A, B, C, D (la fila 6 no tiene exportador)
    # el resumen y la validación de la carga cuentan igual
    for k in ['formularios', 'exportadores', 'paises', 'subpartidas', 'aduanas']:
        assert s[k] == stats[k], k


def test_resumen_vacio_cuenta_cero(parquet):
    _, path = parquet
    s = Q.summary([path], Q.FilterParams(filters={'pais': ['(sin dato)']}))
    assert s['n'] == 2 and s['paises'] == 0


# ── Búsqueda de texto literal ───────────────────────────────────────────────
@pytest.mark.parametrize('text, n', [('sas', 4), ('%', 0), ('_', 0), ('china', 1)])
def test_busqueda_de_texto_es_literal(parquet, text, n):
    _, path = parquet
    assert Q.summary([path], Q.FilterParams(text=text))['n'] == n


# ── Punto 18: ruta con apóstrofo ────────────────────────────────────────────
def test_ruta_con_apostrofo(parquet, tmp_path):
    _, path = parquet
    d = tmp_path / "o'neil"
    d.mkdir()
    copia = d / '202601.parquet'
    copia.write_bytes(path.read_bytes())
    assert Q.month_stats(copia)['n'] == 5
    assert Q.summary([copia], Q.FilterParams())['n'] == 5


# ── Carga por la API ────────────────────────────────────────────────────────
@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DATA_DIR', tmp_path / 'parquet')
    return TestClient(main.app)


def test_api_carga_devuelve_validacion_y_lista_meses(client, tmp_path):
    xlsx = write_xlsx(tmp_path / 'ene.xlsx', HEADERS, ROWS)
    r = client.post('/api/months/upload', files={'file': ('ene.xlsx', xlsx.read_bytes())})
    assert r.status_code == 200
    body = r.json()
    assert body['month'] == '202601' and body['n'] == 5 and not body['replaced']
    meses = client.get('/api/months').json()
    assert meses[0]['month'] == '202601' and meses[0]['months'] == ['202601']


def test_api_rechaza_archivo_demasiado_grande(client, tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'MAX_UPLOAD_MB', 0)
    xlsx = write_xlsx(tmp_path / 'ene.xlsx', HEADERS, ROWS)
    r = client.post('/api/months/upload', files={'file': ('ene.xlsx', xlsx.read_bytes())})
    assert r.status_code == 413
    assert not (tmp_path / 'parquet' / '202601.parquet').exists()

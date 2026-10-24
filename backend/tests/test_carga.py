"""Bloque 2 de la auditoría: encabezados, fechas, mes del archivo y meses."""
from datetime import datetime

import polars as pl
import pytest
from fastapi.testclient import TestClient

import converter
import main
import query as Q
from conftest import HEADERS, ROWS, write_xlsx
from converter import NODATA, ConversionError

BASE = ['FECHA_PROCESO', 'FECHA_DECLARACION_EXPORTACION', 'NUMERO_FORMULARIO',
        'ADUANA_DESPACHO', 'RAZON_SOCIAL_EXPORTADOR', 'PAIS_DESTINO_FINAL',
        'SUBPARTIDA', 'VALOR_FOB_USD', 'PESO_NETO_KGS']


def fila(mes, fecha, form='1', fob=1.0):
    return [mes, fecha, form, 'BOG', 'A SAS', 'CHINA', 901119000, fob, 1.0]


def convertir(tmp_path, headers, rows, name='x.xlsx'):
    xlsx = write_xlsx(tmp_path / name, headers, rows)
    return converter.excel_to_parquet(xlsx, tmp_path / 'parquet')


# ── Punto 10: columnas ──────────────────────────────────────────────────────
def test_encabezados_con_espacios_y_minusculas(tmp_path):
    headers = [f'  {h.lower()} ' for h in BASE]
    s = convertir(tmp_path, headers, [fila(202601, 20260105)])
    assert s['n'] == 1 and s['fob_usd'] == 1.0


def test_columna_obligatoria_ausente_se_rechaza(tmp_path):
    headers = [h for h in BASE if h != 'VALOR_FOB_USD']
    rows = [fila(202601, 20260105)[:7] + [1.0]]
    with pytest.raises(ConversionError, match='VALOR_FOB_USD'):
        convertir(tmp_path, headers, rows)


def test_columna_opcional_ausente_queda_vacia_e_informada(tmp_path):
    s = convertir(tmp_path, BASE, [fila(202601, 20260105)])
    assert 'NIT_EXPORTADOR' in s['missing_columns']
    df = pl.read_parquet(s['path'])
    assert df.columns == converter.COLUMNS
    assert df['nit'].to_list() == [NODATA]


def test_parquets_de_esquemas_distintos_se_consultan_juntos(tmp_path):
    """Un archivo con NIT y otro sin él se pueden combinar."""
    convertir(tmp_path, HEADERS, ROWS, 'a.xlsx')
    convertir(tmp_path, BASE, [fila(202602, 20260205)], 'b.xlsx')
    files = Q.resolve_files(tmp_path / 'parquet')
    assert len(files) == 2
    assert Q.summary(files, Q.FilterParams(text='sas'))['n'] == 5


# ── Punto 11: fechas ────────────────────────────────────────────────────────
@pytest.mark.parametrize('valor', [
    20260105,                       # entero AAAAMMDD (formato DIAN)
    datetime(2026, 1, 5),           # celda de fecha de Excel
    '2026-01-05',                   # texto ISO
    '05/01/2026',                   # texto DD/MM/AAAA
    46027,                          # número de serie de Excel
])
def test_formatos_de_fecha(tmp_path, valor):
    s = convertir(tmp_path, BASE, [fila(202601, valor)])
    assert pl.read_parquet(s['path'])['fecha'].to_list() == [20260105]


def test_formatos_de_fecha_mezclados_en_una_columna(tmp_path):
    valores = [20260105, datetime(2026, 1, 6), '2026-01-07', '08/01/2026', 46031]
    s = convertir(tmp_path, BASE, [fila(202601, v, str(i)) for i, v in enumerate(valores)])
    assert pl.read_parquet(s['path'])['fecha'].to_list() == [
        20260105, 20260106, 20260107, 20260108, 20260109]


def test_texto_despues_de_la_fila_1000_no_se_pierde(tmp_path):
    """Formulario numérico en 1.200 filas y un texto al final."""
    rows = [fila(202601, 20260105, 600000000000000 + i) for i in range(1200)]
    rows.append(fila(202601, 20260105, 'PROV-001'))
    s = convertir(tmp_path, BASE, rows)
    forms = pl.read_parquet(s['path'])['formulario'].to_list()
    assert forms[0] == '600000000000000'
    assert forms[-1] == 'PROV-001'
    assert NODATA not in forms


def test_fecha_no_reconocida_es_cero(tmp_path):
    s = convertir(tmp_path, BASE, [fila(202601, 'ayer')])
    assert pl.read_parquet(s['path'])['fecha'].to_list() == [0]


def test_mes_sale_de_la_fecha_si_falta(tmp_path):
    s = convertir(tmp_path, BASE, [fila(None, 20260105)])
    assert s['month'] == '202601'


# ── Punto 9: mes del archivo ───────────────────────────────────────────────
def test_archivo_se_nombra_por_el_mes_con_mas_filas(tmp_path):
    convertir(tmp_path, BASE, [fila(202512, 20251231, fob=99.0)], 'dic.xlsx')
    ene = [fila(202512, 20251230, '1')] + [fila(202601, 20260105, str(i)) for i in range(3)]
    s = convertir(tmp_path, BASE, ene, 'ene.xlsx')
    assert s['month'] == '202601'
    assert s['rows_by_month'] == {'202512': 1, '202601': 3}
    assert not s['replaced']
    # diciembre no se sobrescribió
    dic = pl.read_parquet(tmp_path / 'parquet' / '202512.parquet')
    assert dic['fob_usd'].to_list() == [99.0]


def test_filtro_de_meses_usa_la_columna_mes(tmp_path):
    convertir(tmp_path, BASE, [fila(202512, 20251231)], 'dic.xlsx')
    ene = [fila(202512, 20251230, '1')] + [fila(202601, 20260105, str(i)) for i in range(3)]
    convertir(tmp_path, BASE, ene, 'ene.xlsx')
    files = Q.resolve_files(tmp_path / 'parquet')
    assert Q.summary(files, Q.FilterParams(months=['202512']))['n'] == 2
    assert Q.summary(files, Q.FilterParams(months=['202601']))['n'] == 3
    assert Q.month_stats(tmp_path / 'parquet' / '202601.parquet')['months'] == ['202512', '202601']


def test_subir_el_mismo_mes_lo_reemplaza(tmp_path):
    convertir(tmp_path, BASE, [fila(202601, 20260105)], 'v1.xlsx')
    s = convertir(tmp_path, BASE, [fila(202601, 20260105, fob=7.0)], 'v2.xlsx')
    assert s['replaced']
    assert len(list((tmp_path / 'parquet').glob('*.parquet'))) == 1


# ── Punto 8: búsqueda en filtros más allá del límite ───────────────────────
def test_busqueda_encuentra_valores_fuera_del_top(parquet):
    _, path = parquet
    top1 = Q.group([path], Q.GroupParams(dim='pais', measure='fob_usd', limit=1))
    assert [r['key'] for r in top1] == ['ESTADOS UNIDOS']
    found = Q.group([path], Q.GroupParams(dim='pais', measure='fob_usd', limit=1, q='chi'))
    assert [r['key'] for r in found] == ['CHINA']


def test_busqueda_es_literal(parquet):
    _, path = parquet
    assert Q.group([path], Q.GroupParams(dim='pais', measure='fob_usd', q='%')) == []


# ── Punto 12 + API ──────────────────────────────────────────────────────────
@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, 'DATA_DIR', tmp_path / 'parquet')
    return TestClient(main.app)


def test_api_rechaza_archivo_invalido_con_400(client, tmp_path):
    xlsx = write_xlsx(tmp_path / 'malo.xlsx', ['OTRA'], [[1]])
    r = client.post('/api/months/upload', files={'file': ('malo.xlsx', xlsx.read_bytes())})
    assert r.status_code == 400
    assert 'Faltan columnas obligatorias' in r.json()['detail']


@pytest.mark.parametrize('mes', ['..%5Cotro', 'abc', '2026011'])
def test_api_borrar_valida_el_mes(client, mes):
    assert client.delete(f'/api/months/{mes}').status_code == 400

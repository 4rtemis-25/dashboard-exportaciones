"""Columnas adicionales de Explorar (/api/query/columns)."""
import pytest
from fastapi.testclient import TestClient

import main
import query as Q

US, CN = 'ESTADOS UNIDOS', 'CHINA'


def cols(path, **kw):
    return Q.columns([path], Q.ColumnsParams(**kw))


def test_medidas_por_fila(parquet):
    _, path = parquet
    out = cols(path, dim='pais', keys=[US, CN],
               measures=['fob_usd', 'kg', 'kg_bruto', 'cnt', 'formularios', 'fob_kg'])
    us = out[US]['m']
    assert us['fob_usd'] == 150 and us['kg'] == 14000 and us['cnt'] == 2
    assert us['formularios'] == 2
    assert us['kg_bruto'] == 0                      # columna ausente en el Excel → 0
    assert us['fob_kg'] == pytest.approx(150 / 14000)
    assert out[CN]['m']['fob_usd'] == 10


def test_medidas_coinciden_con_el_ranking(parquet):
    _, path = parquet
    rows = Q.group([path], Q.GroupParams(dim='pais', measure='kg'))
    out = cols(path, dim='pais', keys=[r['key'] for r in rows], measures=['fob_usd', 'kg', 'cnt'])
    for r in rows:
        m = out[r['key']]['m']
        assert (m['fob_usd'], m['kg'], m['cnt']) == pytest.approx((r['fob_usd'], r['kg'], r['cnt']))


def test_relacionados_ordenados_por_la_medida(parquet):
    _, path = parquet
    por_fob = cols(path, dim='pais', keys=[US], related=['exportador'])[US]['r']['exportador']
    assert por_fob['n'] == 2
    assert [t[0] for t in por_fob['top']] == ['A SAS', 'B SAS']
    assert [t[2] for t in por_fob['top']] == pytest.approx([100 / 150, 50 / 150])
    por_kg = cols(path, dim='pais', keys=[US], related=['exportador'], related_measure='kg')[US]['r']['exportador']
    assert [t[0] for t in por_kg['top']] == ['B SAS', 'A SAS']   # 9.000 kg > 5.000 kg


def test_relacionados_n_no_cuenta_sin_dato_y_respeta_top(parquet):
    _, path = parquet
    r = cols(path, dim='aduana', keys=['CTG'], related=['exportador'], related_top=2)['CTG']['r']['exportador']
    assert r['n'] == 2                       # C SAS y D SAS; '(sin dato)' no cuenta
    assert [t[0] for t in r['top']] == ['C SAS', 'D SAS']


def test_relacionados_respetan_los_filtros(parquet):
    _, path = parquet
    r = cols(path, dim='pais', keys=[US], related=['exportador'],
             filters={'exportador': ['B SAS']})[US]['r']['exportador']
    assert r['n'] == 1 and r['top'][0][0] == 'B SAS' and r['top'][0][2] == pytest.approx(1)


def test_columna_relacionada_igual_al_agrupador_no_vale(parquet):
    _, path = parquet
    with pytest.raises(ValueError):
        cols(path, dim='pais', keys=[US], related=['pais'])


@pytest.fixture
def client(parquet, monkeypatch):
    _, path = parquet
    monkeypatch.setattr(main, 'DATA_DIR', path.parent)
    return TestClient(main.app)


def test_api_columns(client):
    r = client.post('/api/query/columns', json={
        'dim': 'pais', 'keys': [US], 'measures': ['kg'], 'related': ['exportador']})
    assert r.status_code == 200
    body = r.json()[US]
    assert body['m']['kg'] == 14000 and body['r']['exportador']['top'][0][0] == 'A SAS'


@pytest.mark.parametrize('payload, status', [
    ({'dim': 'pais', 'keys': [US], 'measures': ['peso']}, 422),
    ({'dim': 'pais', 'keys': [US], 'related': ['inventada']}, 400),
    ({'dim': 'pais', 'keys': [US], 'related_top': 50}, 422),
])
def test_api_columns_valida(client, payload, status):
    assert client.post('/api/query/columns', json=payload).status_code == status

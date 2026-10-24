import pytest
from fastapi.testclient import TestClient

import main
import query as Q


def keys(rows):
    return [r['key'] for r in rows]


@pytest.mark.parametrize('measure, first', [
    ('fob_usd', 'ESTADOS UNIDOS'),   # 150 USD
    ('kg',      'CHINA'),            # 90.000 kg
    ('cnt',     'CHINA'),            # 1 serie, pero ordenado ascendente sería primero
])
def test_group_ordena_por_la_medida_pedida(parquet, measure, first):
    _, path = parquet
    rows = Q.group([path], Q.GroupParams(dim='pais', measure=measure))
    if measure == 'cnt':
        assert rows[-1]['key'] == first   # empate 2-2 arriba; CHINA va al final
    else:
        assert rows[0]['key'] == first
    vals = [r[measure] for r in rows]
    assert vals == sorted(vals, reverse=True)


def test_group_medida_desconocida_no_cae_a_fob(parquet):
    _, path = parquet
    with pytest.raises(ValueError):
        Q.group([path], Q.GroupParams(dim='pais', measure='kg_neto'))


def test_group_n_keys_cuenta_antes_del_limit(parquet):
    _, path = parquet
    rows = Q.group([path], Q.GroupParams(dim='pais', measure='fob_usd', limit=1))
    assert len(rows) == 1
    assert rows[0]['n_keys'] == 3


def test_group_suma_igual_al_resumen(parquet):
    _, path = parquet
    rows = Q.group([path], Q.GroupParams(dim='capitulo', measure='fob_usd'))
    s = Q.summary([path], Q.FilterParams())
    assert sum(r['fob_usd'] for r in rows) == pytest.approx(s['fob'])
    assert sum(r['cnt'] for r in rows) == s['n']


@pytest.fixture
def client(parquet, monkeypatch):
    _, path = parquet
    monkeypatch.setattr(main, 'DATA_DIR', path.parent)
    return TestClient(main.app)


@pytest.mark.parametrize('measure', ['kg_neto', 'kg_bruto', 'cant', 'peso'])
def test_api_rechaza_medida_invalida(client, measure):
    r = client.post('/api/query/group', json={'dim': 'pais', 'measure': measure})
    assert r.status_code == 422


def test_api_group_por_peso(client):
    r = client.post('/api/query/group', json={'dim': 'pais', 'measure': 'kg'})
    assert r.status_code == 200
    assert keys(r.json())[0] == 'CHINA'

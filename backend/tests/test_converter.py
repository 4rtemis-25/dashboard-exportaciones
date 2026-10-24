import os
from pathlib import Path

import polars as pl
import pytest

import converter
from converter import NODATA


def test_textos_sin_espacios_no_duplican_paises(parquet):
    _, path = parquet
    paises = pl.read_parquet(path)['pais'].to_list()
    assert 'ESTADOS UNIDOS ' not in paises
    assert paises.count('ESTADOS UNIDOS') == 2
    # Un país solo con espacios es "sin dato", no un país nuevo
    assert paises.count(NODATA) == 2


def test_subpartida_rellena_y_vacia_es_sin_dato(parquet):
    _, path = parquet
    df = pl.read_parquet(path)
    assert df['subpartida'].to_list()[:3] == ['0901119000', '0901119000', NODATA]
    assert df['capitulo'].to_list()[:3] == ['09', '09', NODATA]
    assert df['partida'].to_list()[:3] == ['0901', '0901', NODATA]
    assert '0000000000' not in df['subpartida'].to_list()


def test_codigos_numericos_sin_decimal(parquet):
    _, path = parquet
    df = pl.read_parquet(path)
    assert df['pago'].to_list()[:3] == ['1', '1', '2']
    assert df['formulario'].to_list()[0] == '6001'


def test_regla_fila_vacia_igual_que_parser_js(parquet):
    stats, path = parquet
    formularios = pl.read_parquet(path)['formulario'].to_list()
    assert '6005' not in formularios     # sin país, exportador ni FOB
    assert '6006' in formularios         # FOB = 0 explícito se conserva
    assert stats['n'] == 5


def test_stats_de_validacion(parquet):
    stats, _ = parquet
    assert stats['months'] == ['202601']
    assert stats['fob_usd'] == pytest.approx(161.0)
    assert stats['paises'] == 2          # ESTADOS UNIDOS, CHINA; '(sin dato)' no cuenta
    assert stats['subpartidas'] == 2     # 0901119000, 2709000000


# ── Valores de control del archivo real (PROMPT.md) ─────────────────────────
CONTROL_XLSX = Path(os.environ.get(
    'CONTROL_XLSX',
    Path(__file__).resolve().parents[2] / 'data' / '01_Exportaciones_2026_Enero.xlsx',
))


@pytest.mark.skipif(not CONTROL_XLSX.exists(), reason=f'No está {CONTROL_XLSX}')
def test_valores_de_control_enero_2026(tmp_path):
    s = converter.excel_to_parquet(CONTROL_XLSX, tmp_path)
    assert s['months'] == ['202601']
    assert s['n'] == 94_888
    assert s['fob_usd'] == pytest.approx(4_276_675_136.65, abs=0.01)
    assert s['kg_neto'] == pytest.approx(7_815_829_737.14, abs=0.01)
    assert s['formularios'] == 40_033
    assert s['exportadores'] == 3_449
    assert s['paises'] == 161
    assert s['subpartidas'] == 3_053
    assert s['aduanas'] == 21

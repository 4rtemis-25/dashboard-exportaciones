import { useEffect, useState } from 'react';
import { useStore, MEASURE_KEY, summaryTotal } from '../store';
import { api, type ColumnsResult, type ExtraMeasure, type GroupRow, type RelatedCell } from '../api';
import { DIMMAP, FILT_DIMS, GROUPS, MEAS } from '../dims';
import { fm, fmFull, nf0, nf1f, nf2f, fmtDim } from '../fmt';
import { tip } from '../tip';

// Columnas de valor que se pueden agregar (EXTRA_MEASURES en query.py)
const VALUE_COLS: { k: ExtraMeasure; l: string; f: (v: number) => string }[] = [
  { k: 'fob_usd',     l: 'FOB USD',             f: v => fm('fob_usd', v) },
  { k: 'fob_cop',     l: 'FOB COP',             f: v => fm('fob_cop', v) },
  { k: 'kg',          l: 'Peso neto',           f: v => fm('kg', v) },
  { k: 'kg_bruto',    l: 'Peso bruto',          f: v => fm('kg', v) },
  { k: 'cnt',         l: 'Series',              f: v => nf0.format(v) },
  { k: 'formularios', l: 'Declaraciones',       f: v => nf0.format(v) },
  { k: 'fob_kg',      l: 'Precio (US$/kg)',     f: v => 'US$ ' + nf2f.format(v) },
  { k: 'fletes',      l: 'Fletes USD',          f: v => fm('fob_usd', v) },
  { k: 'seguros',     l: 'Seguros USD',         f: v => fm('fob_usd', v) },
];
const VALUE_MAP = Object.fromEntries(VALUE_COLS.map(c => [c.k, c]));
const RELATED_SHOWN = 3;   // valores relacionados visibles por celda

// Medida de la UI → columna de valor equivalente (no se repite en la tabla)
const MEASURE_COL: Record<string, string> = { fobUsd: 'm:fob_usd', fobCop: 'm:fob_cop', kg: 'm:kg', cnt: 'm:cnt' };

function RelatedTd({ dim, cell, mKey }: { dim: string; cell?: RelatedCell; mKey: string }) {
  if (!cell) return <td className="wrap rel">…</td>;
  const more = cell.n - cell.top.filter(t => t[0] !== '(sin dato)').length;
  const label = DIMMAP[dim]?.l ?? dim;
  const data = tip(`${label}: ${nf0.format(cell.n)} distintos`,
    cell.top.map(([v, x, s]) => [fmtDim(dim, v), `${fmFull(mKey, x)} · ${nf1f.format(s * 100)} %`]));
  return (
    <td className="wrap rel" data-tip={data}>
      {cell.top.map(([v, , s], i) => (
        <span key={v}>
          {i > 0 && ' · '}{fmtDim(dim, v)} <small>{nf1f.format(s * 100)} %</small>
        </span>
      ))}
      {more > 0 && <small className="more"> +{nf0.format(more)}</small>}
    </td>
  );
}

export function TabExplorar() {
  const { measure, rankDim, rankTop, setRankDim, setRankTop, buildFilter,
          exploreCols, setExploreCols } = useStore();
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [extra, setExtra] = useState<ColumnsResult>({});
  const [colsOpen, setColsOpen] = useState(false);
  const mKey = MEASURE_KEY[measure];

  // Columnas visibles: sin la medida principal ni la propia dimensión agrupada
  const cols = exploreCols.filter(c => c !== MEASURE_COL[measure] && c !== `r:${rankDim}`);
  const measures = cols.filter(c => c.startsWith('m:')).map(c => c.slice(2) as ExtraMeasure);
  const related = cols.filter(c => c.startsWith('r:')).map(c => c.slice(2));

  // Ranking: solo depende de filtros, agrupación, top y medida (nunca de las columnas)
  useEffect(() => {
    let vigente = true;  // descarta respuestas de filtros anteriores
    const f = buildFilter();
    Promise.all([
      api.query.group({ ...f, dim: rankDim, measure: mKey, limit: rankTop || 500 }),
      api.query.summary(f),
    ]).then(([rows, s]) => {
      if (!vigente) return;
      setRows(rows);
      setTotal(summaryTotal(s, measure));
    });
    return () => { vigente = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(buildFilter()), rankDim, rankTop, measure]);

  // Columnas extra para las filas ya listadas
  useEffect(() => {
    let vigente = true;
    setExtra({});
    if (!rows.length || (!measures.length && !related.length)) return;
    api.query.columns({
      ...buildFilter(), dim: rankDim, keys: rows.map(r => r.key),
      measures, related, related_measure: mKey, related_top: RELATED_SHOWN,
    }).then(x => { if (vigente) setExtra(x); });
    return () => { vigente = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cols.join(',')]);

  const max = rows[0]?.[mKey as keyof GroupRow] as number ?? 1;

  function toggleCol(id: string) {
    setExploreCols(exploreCols.includes(id) ? exploreCols.filter(c => c !== id) : [...exploreCols, id]);
  }

  function copyTable() {
    const table = document.getElementById('expTbl') as HTMLTableElement;
    if (!table) return;
    const tsv = [...table.rows].map(r => [...r.cells].map(c => c.textContent?.trim()).join('\t')).join('\n');
    navigator.clipboard?.writeText(tsv).catch(() => {});
  }

  const colLabel = (c: string) => c.startsWith('m:') ? VALUE_MAP[c.slice(2)].l : DIMMAP[c.slice(2)]?.l;

  return (
    <div className="card">
      <div className="ctl">
        <div className="field">
          <label htmlFor="rkDim">Agrupar por</label>
          <select id="rkDim" value={rankDim} onChange={e => setRankDim(e.target.value)}>
            {FILT_DIMS.map(d => <option key={d.k} value={d.k}>{d.l}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: 120 }}>
          <label htmlFor="rkTop">Mostrar</label>
          <select id="rkTop" value={rankTop} onChange={e => setRankTop(+e.target.value)}>
            {[10,25,50,100,500].map(n => <option key={n} value={n}>Top {n}</option>)}
          </select>
        </div>
        <button type="button" className="btn" aria-pressed={colsOpen} onClick={() => setColsOpen(o => !o)}>
          Columnas{cols.length ? ` (${cols.length})` : ''}
        </button>
        <button type="button" className="btn" onClick={copyTable}>Copiar tabla</button>
      </div>

      {colsOpen && (
        <div className="cpanel" id="colPanel">
          <div className="cp-head">
            <b>Columnas de la tabla</b>
            <button type="button" className="btn sm" onClick={() => setExploreCols(['m:fob_usd', 'm:kg', 'm:cnt'])}>
              Restablecer
            </button>
          </div>
          <div className="sec" style={{ padding: 0 }}>Valores</div>
          <div className="cp-grid">
            {VALUE_COLS.map(c => {
              const id = `m:${c.k}`, isMain = id === MEASURE_COL[measure];
              return (
                <label key={id} className="cp-item" title={isMain ? 'Ya es la medida principal de la tabla' : undefined}>
                  <input type="checkbox" checked={isMain || exploreCols.includes(id)} disabled={isMain}
                    onChange={() => toggleCol(id)} />
                  <span className="t">{c.l}</span>
                </label>
              );
            })}
          </div>
          {GROUPS.map(g => {
            const ds = FILT_DIMS.filter(d => d.g === g && d.k !== rankDim);
            if (!ds.length) return null;
            return (
              <div key={g}>
                <div className="sec" style={{ padding: 0 }}>{g} · valores principales</div>
                <div className="cp-grid">
                  {ds.map(d => (
                    <label key={d.k} className="cp-item">
                      <input type="checkbox" checked={exploreCols.includes(`r:${d.k}`)}
                        onChange={() => toggleCol(`r:${d.k}`)} />
                      <span className="t">{d.l}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="note" style={{ padding: 0 }}>
            Las columnas no cambian el orden de la tabla. En las de valores principales se ven
            los {RELATED_SHOWN} mayores de cada fila, con su % dentro de la fila (según {MEAS[measure].l}).
          </div>
        </div>
      )}

      <div className="sub">
        {nf0.format(rows[0]?.n_keys ?? 0)} valores distintos
        {(rows[0]?.n_keys ?? 0) > rows.length && ` (se muestran ${nf0.format(rows.length)})`} · ordenado por {MEAS[measure].l}
      </div>
      <div className="tw" style={{ maxHeight: 640 }}>
        <table id="expTbl">
          <thead>
            <tr>
              <th>#</th>
              <th>{FILT_DIMS.find(d => d.k === rankDim)?.l ?? rankDim}</th>
              <th className="n">{MEAS[measure].s}</th>
              <th className="n">Part. %</th>
              {cols.map(c => (
                <th key={c} className={c.startsWith('m:') ? 'n' : undefined}>
                  {colLabel(c)}{c.startsWith('r:') && <small> (principales)</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const v = r[mKey as keyof GroupRow] as number;
              const x = extra[r.key];
              return (
                <tr key={r.key}>
                  <td className="n">{i + 1}</td>
                  <td className="wrap" title={fmtDim(rankDim, r.key)}>{fmtDim(rankDim, r.key)}</td>
                  <td className="n">
                    {fm(mKey, v)}
                    <span className="mini-bar" style={{ width: Math.max(2, v / max * 60) }} />
                  </td>
                  <td className="n">{total ? nf1f.format(v / total * 100) : '0,0'} %</td>
                  {cols.map(c => {
                    if (c.startsWith('r:')) return <RelatedTd key={c} dim={c.slice(2)} cell={x?.r[c.slice(2)]} mKey={mKey} />;
                    const val = x?.m[c.slice(2) as ExtraMeasure];
                    return <td key={c} className="n">{!x ? '…' : val == null ? '—' : VALUE_MAP[c.slice(2)].f(val)}</td>;
                  })}
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={4 + cols.length} className="note">Sin datos con los filtros actuales.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

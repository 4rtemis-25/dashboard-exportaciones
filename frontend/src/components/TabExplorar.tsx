import { useEffect, useState } from 'react';
import { useStore, MEASURE_KEY, summaryTotal } from '../store';
import { api, type GroupRow } from '../api';
import { FILT_DIMS, MEAS } from '../dims';
import { fm, nf0, nf1, fmtDim } from '../fmt';

export function TabExplorar() {
  const { measure, rankDim, rankTop, setRankDim, setRankTop, buildFilter } = useStore();
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [total, setTotal] = useState(0);
  const mKey = MEASURE_KEY[measure];

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

  const max = rows[0]?.[mKey as keyof GroupRow] as number ?? 1;

  function copyTable() {
    const table = document.getElementById('expTbl') as HTMLTableElement;
    if (!table) return;
    const tsv = [...table.rows].map(r => [...r.cells].map(c => c.textContent?.trim()).join('\t')).join('\n');
    navigator.clipboard?.writeText(tsv).catch(() => {});
  }

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
        <button type="button" className="btn" onClick={copyTable}>Copiar tabla</button>
      </div>
      <div className="sub">
        {nf0.format(rows[0]?.n_keys ?? 0)} valores distintos
        {(rows[0]?.n_keys ?? 0) > rows.length && ` (se muestran ${nf0.format(rows.length)})`} · ordenado por {MEAS[measure].l} · clic para filtrar
      </div>
      <div className="tw" style={{ maxHeight: 640 }}>
        <table id="expTbl">
          <thead>
            <tr>
              <th>#</th>
              <th>{FILT_DIMS.find(d => d.k === rankDim)?.l ?? rankDim}</th>
              <th className="n">{MEAS[measure].s}</th>
              <th className="n">Part. %</th>
              {measure !== 'fobUsd' && <th className="n">FOB USD</th>}
              {measure !== 'kg' && <th className="n">Peso neto</th>}
              {measure !== 'cnt' && <th className="n">Series</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const v = r[mKey as keyof GroupRow] as number;
              return (
                <tr key={r.key} className="clk">
                  <td className="n">{i + 1}</td>
                  <td className="wrap" title={fmtDim(rankDim, r.key)}>{fmtDim(rankDim, r.key)}</td>
                  <td className="n">
                    {fm(mKey, v)}
                    <span className="mini-bar" style={{ width: Math.max(2, v / max * 60) }} />
                  </td>
                  <td className="n">{total ? nf1.format(v / total * 100) : 0}%</td>
                  {measure !== 'fobUsd' && <td className="n">{fm('fob_usd', r.fob_usd)}</td>}
                  {measure !== 'kg'     && <td className="n">{fm('kg_neto', r.kg)}</td>}
                  {measure !== 'cnt'    && <td className="n">{nf0.format(r.cnt)}</td>}
                </tr>
              );
            })}
            {!rows.length && (
              <tr><td colSpan={8} className="note">Sin datos con los filtros actuales.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

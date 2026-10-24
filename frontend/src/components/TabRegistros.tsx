import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { api, type RecordRow } from '../api';
import { nf0, nf2, ymd } from '../fmt';

const COLS = [
  { k: 'fecha',      l: 'Fecha',          n: false },
  { k: 'exportador', l: 'Exportador',      n: false },
  { k: 'pais',       l: 'País destino',    n: false },
  { k: 'subpartida', l: 'Subpartida',      n: false },
  { k: 'aduana',     l: 'Aduana',          n: false },
  { k: 'modo',       l: 'Transporte',      n: false },
  { k: 'kg_neto',    l: 'Peso neto (kg)',  n: true  },
  { k: 'fob_usd',    l: 'FOB USD',         n: true  },
] as const;

const PAGE_SIZE = 100;

export function TabRegistros() {
  const { regSort, regDir, regPage, setRegSort, setRegPage, buildFilter } = useStore();
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<RecordRow[]>([]);

  useEffect(() => {
    let vigente = true;  // descarta respuestas de filtros/páginas anteriores
    const f = buildFilter();
    api.query.records({ ...f, sort: regSort, direction: regDir, page: regPage, page_size: PAGE_SIZE })
      .then(r => { if (vigente) { setTotal(r.total); setRows(r.rows); } });
    return () => { vigente = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(buildFilter()), regSort, regDir, regPage]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = regPage * PAGE_SIZE;

  function copyTable() {
    const t = document.getElementById('regTbl') as HTMLTableElement;
    if (!t) return;
    const tsv = [...t.rows].map(r => [...r.cells].map(c => c.textContent?.trim()).join('\t')).join('\n');
    navigator.clipboard?.writeText(tsv).catch(() => {});
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div className="sub">{nf0.format(total)} registros con los filtros actuales.</div>
        <button className="btn sm" onClick={copyTable}>Copiar tabla</button>
      </div>
      <div className="tw" style={{ maxHeight: 680 }}>
        <table id="regTbl">
          <thead>
            <tr>
              {COLS.map(c => (
                <th key={c.k} className={`s${c.n ? ' n' : ''}`}
                  onClick={() => setRegSort(c.k)}>
                  {c.l}{regSort === c.k ? (regDir < 0 ? ' ↓' : ' ↑') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{ymd(r.fecha)}</td>
                <td className="wrap">{r.exportador}</td>
                <td>{r.pais}</td>
                <td>{r.subpartida}</td>
                <td>{r.aduana}</td>
                <td>{r.modo}</td>
                <td className="n">{nf0.format(r.kg_neto)}</td>
                <td className="n">{nf2.format(r.fob_usd)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={8} className="note">Sin registros.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <span>{total ? nf0.format(from + 1) : 0}–{nf0.format(Math.min(total, from + PAGE_SIZE))} de {nf0.format(total)}</span>
        <button className="btn sm" disabled={regPage === 0} onClick={() => setRegPage(regPage - 1)}>Anterior</button>
        <span>Página {regPage + 1} de {nf0.format(pages)}</span>
        <button className="btn sm" disabled={regPage >= pages - 1} onClick={() => setRegPage(regPage + 1)}>Siguiente</button>
      </div>
    </div>
  );
}

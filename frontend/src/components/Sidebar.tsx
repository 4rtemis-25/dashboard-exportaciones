import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { api, type GroupRow } from '../api';
import { FILT_DIMS, GROUPS, PRIMARY, DIMMAP } from '../dims';
import { compact, fmtDim, mesLabel, nf0, ymd } from '../fmt';

const FACET_LIMIT = 300;

/**
 * Campo con borrador local y debounce propio (un temporizador por campo).
 * Refleja el estado global: si el filtro cambia desde fuera (chip ×, "Limpiar
 * todo") el campo se actualiza. `norm` convierte el borrador al valor que
 * guarda el estado, para no pisar lo que el usuario está escribiendo.
 */
function DraftInput({ value, onCommit, norm, ...rest }: {
  value: string;
  onCommit: (draft: string) => void;
  norm: (draft: string) => string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const [draft, setDraft] = useState(value);
  const sent = useRef(value);

  useEffect(() => {
    if (value !== sent.current) { sent.current = value; setDraft(value); }
  }, [value]);

  useEffect(() => {
    if (norm(draft) === sent.current) return;
    const t = setTimeout(() => { sent.current = norm(draft); onCommit(draft); }, 250);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return <input {...rest} value={draft} onChange={e => setDraft(e.target.value)} />;
}

const numStr = (v: number | null) => v == null ? '' : String(v);
const numNorm = (s: string) => s.trim() === '' || !isFinite(+s) ? '' : String(+s);
const toNum = (s: string) => numNorm(s) === '' ? null : +s;
const dateStr = (v: number | null) => v ? ymd(v) : '';
const toDate = (s: string) => s ? +s.replace(/-/g, '') : null;

function FacetPanel({ dimKey }: { dimKey: string }) {
  const { buildFilter, dimFilters: allFilters, setDimFilter } = useStore();
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');            // q con debounce (temporizador propio del panel)
  const [complete, setComplete] = useState(true); // la lista sin búsqueda trae todos los valores

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Si la lista está completa se busca en el navegador (también por nombre de
  // capítulo); si está truncada, el servidor busca entre todos los valores.
  const serverQ = complete ? '' : dq;

  useEffect(() => {
    let vigente = true;  // descarta respuestas de filtros anteriores
    const f = buildFilter();
    // Para el facet excluimos el filtro de esta dimensión (buildMask(skip=k) en app.js)
    const { [dimKey]: _, ...rest } = f.filters ?? {};
    api.query.group({ ...f, filters: rest, dim: dimKey, measure: 'fob_usd',
                      limit: FACET_LIMIT, q: serverQ || null })
      .then(r => {
        if (!vigente) return;
        setRows(r);
        if (!serverQ) setComplete((r[0]?.n_keys ?? 0) <= r.length);
      });
    return () => { vigente = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(buildFilter()), dimKey, serverQ]);

  const selected = new Set(allFilters[dimKey] ?? []);
  const filtered = q ? rows.filter(r => fmtDim(dimKey, r.key).toLowerCase().includes(q.toLowerCase())) : rows;
  const nKeys = rows[0]?.n_keys ?? 0;
  // Marcados que no están en la lista (fuera del límite o excluidos por otros
  // filtros): se muestran arriba para poder desmarcarlos
  const pinned = [...selected].filter(k => !rows.some(r => r.key === k));

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setDimFilter(dimKey, [...next]);
  }

  return (
    <div style={{ padding: '0 16px 12px' }}>
      <input type="search" className="fq" placeholder="Buscar en la lista…"
        value={q} onChange={e => setQ(e.target.value)} style={{ marginTop: 8 }} />
      <div className="mini">
        <button className="btn sm" onClick={() => setDimFilter(dimKey, filtered.map(r => r.key))}>Marcar visibles</button>
        <button className="btn sm" onClick={() => setDimFilter(dimKey, [])}>Ninguno</button>
      </div>
      <div className="opts">
        {pinned.map(k => (
          <label key={`sel|${k}`} className="opt zero">
            <input type="checkbox" checked onChange={() => toggle(k)} />
            <span className="t" title={fmtDim(dimKey, k)}>{fmtDim(dimKey, k)}</span>
            <span className="c">—</span>
          </label>
        ))}
        {filtered.map(r => (
          <label key={r.key} className={`opt${r.cnt === 0 ? ' zero' : ''}`}>
            <input type="checkbox" checked={selected.has(r.key)}
              onChange={() => toggle(r.key)} />
            <span className="t" title={fmtDim(dimKey, r.key)}>{fmtDim(dimKey, r.key)}</span>
            <span className="c">{r.cnt > 0 ? compact(r.fob_usd) : '0'}</span>
          </label>
        ))}
        {filtered.length === 0 && (!complete && q.trim() !== dq ? <div className="note">Buscando…</div>
                                                   : <div className="note">Sin coincidencias.</div>)}
        {nKeys > rows.length && (
          <div className="note">
            Mostrando {nf0.format(rows.length)} de {nf0.format(nKeys)}
            {serverQ ? ' coincidencias' : ''}. Escribe para acotar.
          </div>
        )}
      </div>
    </div>
  );
}

function AccItem({ dimKey, label }: { dimKey: string; label: string }) {
  const [open, setOpen] = useState(false);
  const { dimFilters } = useStore();
  const cnt = dimFilters[dimKey]?.length ?? 0;

  return (
    <div className={`acc${open ? ' open' : ''}`} data-k={dimKey}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span>{label}</span>
        <span>
          <span className="badge" hidden={cnt === 0}>{cnt}</span>
          {' '}
          <span className="car">›</span>
        </span>
      </button>
      {open && <FacetPanel dimKey={dimKey} />}
    </div>
  );
}

export function Sidebar({ open }: { open: boolean }) {
  const { months, selectedMonths, toggleMonth, text, setText,
          dateMin, dateMax, setDateRange, fobMin, fobMax, setFobRange,
          kgMin, kgMax, setKgRange, clearAllFilters } = useStore();

  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <aside id="side" className={open ? 'show' : ''} aria-label="Filtros">
      <div className="side-head">
        <b>Filtros</b>
        <button className="btn sm ghost" onClick={clearAllFilters}>Limpiar todo</button>
      </div>

      {/* Búsqueda de texto */}
      <div className="block">
        <div className="field">
          <label htmlFor="q">Buscar texto</label>
          <DraftInput id="q" type="search" placeholder="Exportador, destinatario, país, subpartida…"
            value={text} norm={s => s.trim()} onCommit={s => setText(s.trim())} />
        </div>
      </div>

      {/* Selector de meses */}
      <div className="sec">Periodo</div>
      <div className="block">
        <div className="mchips">
          {/* Meses presentes en los datos (un archivo puede traer más de uno) */}
          {[...new Set(months.flatMap(m => m.months))].sort().map(m => (
            <button key={m} type="button" className="mchip"
              aria-pressed={selectedMonths.includes(m)}
              onClick={() => toggleMonth(m)}>
              {mesLabel(m)}
            </button>
          ))}
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="dMin">Declaración desde</label>
            <input id="dMin" type="date" value={dateStr(dateMin)}
              onChange={e => setDateRange(toDate(e.target.value), dateMax)} />
          </div>
          <div className="field">
            <label htmlFor="dMax">hasta</label>
            <input id="dMax" type="date" value={dateStr(dateMax)}
              onChange={e => setDateRange(dateMin, toDate(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Filtros principales */}
      <div className="sec">Filtros principales</div>
      {PRIMARY.map(k => <AccItem key={k} dimKey={k} label={DIMMAP[k].l} />)}

      <button type="button" className="btn more-btn" onClick={() => setMoreOpen(o => !o)}>
        {moreOpen ? 'Ocultar filtros avanzados' : 'Más filtros y rangos'}
      </button>

      {moreOpen && (
        <>
          <div className="sec">Rangos de valor</div>
          <div className="block">
            <div className="row2">
              <div className="field">
                <label htmlFor="fobMin">FOB USD mín.</label>
                <DraftInput id="fobMin" type="number" min="0" value={numStr(fobMin)} norm={numNorm}
                  onCommit={s => setFobRange(toNum(s), useStore.getState().fobMax)} />
              </div>
              <div className="field">
                <label htmlFor="fobMax">FOB USD máx.</label>
                <DraftInput id="fobMax" type="number" min="0" value={numStr(fobMax)} norm={numNorm}
                  onCommit={s => setFobRange(useStore.getState().fobMin, toNum(s))} />
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="kgMin">Peso mínimo (kg)</label>
                <DraftInput id="kgMin" type="number" min="0" value={numStr(kgMin)} norm={numNorm}
                  onCommit={s => setKgRange(toNum(s), useStore.getState().kgMax)} />
              </div>
              <div className="field">
                <label htmlFor="kgMax">Peso máximo (kg)</label>
                <DraftInput id="kgMax" type="number" min="0" value={numStr(kgMax)} norm={numNorm}
                  onCommit={s => setKgRange(useStore.getState().kgMin, toNum(s))} />
              </div>
            </div>
            <div className="note" style={{ padding: 0 }}>
              Los pesos están en kilogramos (neto y bruto).
            </div>
          </div>

          {/* Grupos adicionales */}
          {GROUPS.map(g => {
            const ds = FILT_DIMS.filter(d => d.g === g && !PRIMARY.includes(d.k));
            if (!ds.length) return null;
            return (
              <div key={g}>
                <div className="sec">{g}</div>
                {ds.map(d => <AccItem key={d.k} dimKey={d.k} label={d.l} />)}
              </div>
            );
          })}
        </>
      )}
    </aside>
  );
}

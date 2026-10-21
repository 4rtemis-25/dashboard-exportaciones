import { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { api, type GroupRow } from '../api';
import { FILT_DIMS, GROUPS, PRIMARY, DIMMAP } from '../dims';
import { compact, fmtDim, mesLabel } from '../fmt';

function FacetPanel({ dimKey }: { dimKey: string }) {
  const { buildFilter, dimFilters: allFilters, setDimFilter } = useStore();
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    const f = buildFilter();
    // Para el facet excluimos el filtro de esta dimensión (buildMask(skip=k) en app.js)
    const { [dimKey]: _, ...rest } = f.filters ?? {};
    api.query.group({ ...f, filters: rest, dim: dimKey, measure: 'fob_usd', limit: 300 })
      .then(setRows);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(buildFilter()), dimKey]);

  const selected = new Set(allFilters[dimKey] ?? []);
  const filtered = q ? rows.filter(r => fmtDim(dimKey, r.key).toLowerCase().includes(q.toLowerCase())) : rows;

  function toggle(key: string) {
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
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
        {filtered.slice(0, 300).map(r => (
          <label key={r.key} className={`opt${r.cnt === 0 ? ' zero' : ''}`}>
            <input type="checkbox" checked={selected.has(r.key)}
              onChange={() => toggle(r.key)} />
            <span className="t" title={fmtDim(dimKey, r.key)}>{fmtDim(dimKey, r.key)}</span>
            <span className="c">{r.cnt > 0 ? compact(r.fob_usd) : '0'}</span>
          </label>
        ))}
        {filtered.length === 0 && <div className="note">Sin coincidencias.</div>}
        {filtered.length > 300 && <div className="note">Mostrando 300 de {filtered.length}. Escribe para acotar.</div>}
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
  const textRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          <input id="q" type="search" placeholder="Exportador, destinatario, país, subpartida…"
            defaultValue={text}
            onChange={e => {
              if (textRef.current) clearTimeout(textRef.current);
              textRef.current = setTimeout(() => setText(e.target.value.trim()), 250);
            }} />
        </div>
      </div>

      {/* Selector de meses */}
      <div className="sec">Periodo</div>
      <div className="block">
        <div className="mchips">
          {months.map(m => (
            <button key={m.month} type="button" className="mchip"
              aria-pressed={selectedMonths.includes(m.month)}
              onClick={() => toggleMonth(m.month)}>
              {mesLabel(m.month)}
            </button>
          ))}
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="dMin">Declaración desde</label>
            <input id="dMin" type="date"
              onChange={e => setDateRange(e.target.value ? +e.target.value.replace(/-/g,'') : null, dateMax)} />
          </div>
          <div className="field">
            <label htmlFor="dMax">hasta</label>
            <input id="dMax" type="date"
              onChange={e => setDateRange(dateMin, e.target.value ? +e.target.value.replace(/-/g,'') : null)} />
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
                <input id="fobMin" type="number" min="0"
                  onChange={e => setFobRange(e.target.value ? +e.target.value : null, fobMax)} />
              </div>
              <div className="field">
                <label htmlFor="fobMax">FOB USD máx.</label>
                <input id="fobMax" type="number" min="0"
                  onChange={e => setFobRange(fobMin, e.target.value ? +e.target.value : null)} />
              </div>
            </div>
            <div className="row2">
              <div className="field">
                <label htmlFor="kgMin">Peso mínimo (kg)</label>
                <input id="kgMin" type="number" min="0"
                  onChange={e => setKgRange(e.target.value ? +e.target.value : null, kgMax)} />
              </div>
              <div className="field">
                <label htmlFor="kgMax">Peso máximo (kg)</label>
                <input id="kgMax" type="number" min="0"
                  onChange={e => setKgRange(kgMin, e.target.value ? +e.target.value : null)} />
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

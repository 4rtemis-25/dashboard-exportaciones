import { useStore } from '../store';
import { compact, fm, nf0, ymd, fmtDim, nf2 } from '../fmt';
import { DIMMAP } from '../dims';

export function StatusBar() {
  const { summary, dimFilters, dateMin, dateMax, fobMin, fobMax, kgMin, kgMax, kgKind, text,
          clearDimFilter, clearAllFilters, setDateRange, setFobRange, setKgRange, setText } = useStore();
  void kgKind; // usado en la etiqueta "Peso neto/bruto"

  if (!summary) return null;

  const { n, fob, kg } = summary;

  const stat = (l: string, v: string, big = false) => (
    <div className={`stat${big ? ' big' : ''}`}>
      <span>{l}</span><b>{v}</b>
    </div>
  );

  const UNIT_F: Record<string, number> = { g: 0.001, kg: 1, t: 1000 };

  // Chips de filtros activos
  const chips: React.ReactNode[] = [];
  for (const [dim, vals] of Object.entries(dimFilters)) {
    if (!vals.length) continue;
    const label = DIMMAP[dim]?.l ?? dim;
    const names = vals.map(v => fmtDim(dim, v));
    const txt = names.length <= 2 ? names.join(', ') : names.slice(0, 2).join(', ') + ` +${names.length - 2}`;
    chips.push(
      <span key={dim} className="fl">
        <b>{label}:</b>
        <span className="v" title={names.join(' | ')}>{txt}</span>
        <button onClick={() => clearDimFilter(dim)} aria-label={`Quitar filtro ${label}`}>×</button>
      </span>
    );
  }
  if (dateMin != null || dateMax != null)
    chips.push(<span key="_d" className="fl"><b>Fecha:</b><span className="v">{dateMin ? ymd(dateMin) : '…'} → {dateMax ? ymd(dateMax) : '…'}</span><button onClick={() => setDateRange(null, null)}>×</button></span>);
  if (fobMin != null || fobMax != null)
    chips.push(<span key="_f" className="fl"><b>FOB USD:</b><span className="v">{fobMin != null ? nf0.format(fobMin) : '…'} → {fobMax != null ? nf0.format(fobMax) : '…'}</span><button onClick={() => setFobRange(null, null)}>×</button></span>);
  if (kgMin != null || kgMax != null) {
    const u = 'kg', f = (x: number | null) => x != null ? nf2.format(x / UNIT_F[u]) : '…';
    chips.push(<span key="_k" className="fl"><b>{kgKind === 'kg_neto' ? 'Peso neto' : 'Peso bruto'}:</b><span className="v">{f(kgMin)} → {f(kgMax)} {u}</span><button onClick={() => setKgRange(null, null)}>×</button></span>);
  }
  if (text)
    chips.push(<span key="_t" className="fl"><b>Texto:</b><span className="v">{text}</span><button onClick={() => setText('')}>×</button></span>);

  return (
    <div className="status">
      <div className="stats">
        {stat('Valor FOB', 'US$ ' + compact(fob), true)}
        {stat('Peso neto', fm('kg', kg))}
        {stat('Series', nf0.format(n))}
        {stat('Declaraciones', nf0.format(summary.formularios))}
        {stat('Exportadores', nf0.format(summary.exportadores))}
      </div>
      {chips.length > 0 && (
        <div className="active">
          {chips}
          <button className="btn sm ghost" onClick={clearAllFilters}>Limpiar todo</button>
        </div>
      )}
    </div>
  );
}

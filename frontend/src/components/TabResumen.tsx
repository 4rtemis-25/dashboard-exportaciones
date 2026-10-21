import { useEffect, useState } from 'react';
import { useStore, MEASURE_KEY } from '../store';
import { api, type GroupRow, type TimePoint } from '../api';
import { compact, fm, nf0, nf2, mesLabel, fmtDim } from '../fmt';
import { MEAS } from '../dims';

// ── KPI cards ─────────────────────────────────────────────────────────────
function Kpi({ label, value, detail, main }: { label: string; value: string; detail?: string; main?: boolean }) {
  return (
    <div className={`kpi${main ? ' main' : ''}`}>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      <div className="d">{detail ?? ' '}</div>
    </div>
  );
}

// ── Barra horizontal simple ───────────────────────────────────────────────
function BarList({ rows, measure, dim }: { rows: GroupRow[]; measure: string; dim: string }) {
  const max = rows[0]?.[measure as keyof GroupRow] as number ?? 1;
  if (!rows.length) return <div className="note">Sin datos con los filtros actuales.</div>;
  return (
    <div className="bl">
      {rows.map(r => {
        const v = r[measure as keyof GroupRow] as number;
        const label = fmtDim(dim, r.key);
        return (
          <div key={r.key} className="br">
            <span className="t" title={label}>{label}</span>
            <span className="tr">
              <span className="f" style={{ display: 'block', width: `${Math.max(0.5, v / max * 100)}%` }} />
            </span>
            <span className="v">{fm(measure, v)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Gráfico de barras temporal (SVG) ─────────────────────────────────────
function periodLabel(p: string | number): string {
  const s = String(p);
  if (/^\d{6}$/.test(s)) return mesLabel(s, true);
  if (/^\d{8}$/.test(s)) {
    const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return s.slice(6,8) + ' ' + M[+s.slice(4,6)-1];
  }
  return s;
}

function TimeChart({ points, measure }: { points: TimePoint[]; measure: string }) {
  if (!points.length) return <div className="note">Sin datos.</div>;

  const vals = points.map(p => p[measure as keyof TimePoint] as number);
  const max = Math.max(...vals, 1);
  const niceStep = (x: number) => {
    const e = Math.pow(10, Math.floor(Math.log10(x)));
    const f = x / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
  };
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;

  const W = 700, H = 270, L = 60, Rr = 8, T = 10, Bt = 26;
  const iw = W - L - Rr, ih = H - T - Bt;
  const B = points.length;
  const band = iw / Math.max(B, 1);
  const bw = Math.max(1.5, Math.min(56, band * 0.7));
  const every = Math.max(1, Math.ceil(B / Math.floor(iw / 52)));

  const gridLines = [];
  for (let t = 0; t <= top + 1e-9; t += step) {
    const y = T + ih - t / top * ih;
    gridLines.push(
      <g key={t}>
        <line x1={L} x2={W - Rr} y1={y} y2={y} stroke="var(--grid)" strokeWidth={1} />
        <text x={L - 6} y={y + 4} textAnchor="end" style={{ fill: 'var(--ink-3)', fontSize: 11.5, fontFamily: 'var(--font-num)' }}>
          {compact(measure === 'kg' ? t / 1000 : t)}
        </text>
      </g>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {gridLines}
      {points.map((p, b) => {
        const v = p[measure as keyof TimePoint] as number;
        const h = Math.max(0.5, v / top * ih);
        const cx = L + band * (b + 0.5), x0 = cx - bw / 2;
        return (
          <g key={b}>
            <rect x={x0} y={T + ih - h} width={bw} height={h} fill="var(--bar)" rx={bw > 6 ? 2 : 0} />
            {b % every === 0 && (
              <text x={cx} y={H - 8} textAnchor="middle"
                style={{ fill: 'var(--ink-3)', fontSize: 11.5, fontFamily: 'var(--font-num)' }}>
                {periodLabel(p.period)}
              </text>
            )}
          </g>
        );
      })}
      <line x1={L} x2={W - Rr} y1={T + ih} y2={T + ih} stroke="var(--line)" />
    </svg>
  );
}

// ── Tab Resumen ───────────────────────────────────────────────────────────
export function TabResumen() {
  const { summary, measure, gran, setGran, buildFilter } = useStore();
  const [topRows, setTopRows] = useState<Record<string, GroupRow[]>>({});
  const [timePoints, setTimePoints] = useState<TimePoint[]>([]);
  const mKey = MEASURE_KEY[measure];

  const CARDS = [
    ['pais',      'País de destino'],
    ['capitulo',  'Producto (capítulo)'],
    ['exportador','Exportador'],
    ['dpto',      'Departamento'],
    ['aduana',    'Aduana'],
    ['modo',      'Modo de transporte'],
  ] as const;

  useEffect(() => {
    if (!summary) return;
    const f = buildFilter();
    // Cargar Top 8 para cada card
    CARDS.forEach(([dim]) => {
      api.query.group({ ...f, dim, measure: mKey, limit: 8 })
        .then(rows => setTopRows(prev => ({ ...prev, [dim]: rows })));
    });
    // Serie temporal
    api.query.time({ ...f, granularity: gran }).then(setTimePoints);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(buildFilter()), gran, measure]);

  if (!summary) return null;

  const { n, fob, cop, kg, formularios, exportadores, paises, subpartidas } = summary;

  return (
    <>
      <div className="kpis">
        <Kpi label="Valor FOB (USD)" value={'US$ ' + compact(fob)} main />
        <Kpi label="Valor FOB (COP)" value={'$ ' + compact(cop)} detail={nf0.format(cop / 1e6) + ' millones'} />
        <Kpi label="Peso neto" value={fm('kg', kg)} detail={nf0.format(kg) + ' kg'} />
        <Kpi label="FOB por kilo" value={kg ? 'US$ ' + nf2.format(fob / kg) : '—'} detail="promedio ponderado" />
        <Kpi label="Series" value={nf0.format(n)} detail="líneas de declaración" />
        <Kpi label="Declaraciones" value={nf0.format(formularios)} detail="formularios distintos" />
        <Kpi label="Exportadores" value={nf0.format(exportadores)} />
        <Kpi label="Países destino" value={nf0.format(paises)} detail="distintos" />
        <Kpi label="Subpartidas" value={nf0.format(subpartidas)} detail="productos distintos" />
      </div>

      <div className="card">
        <div className="card-h">
          <div>
            <h3>Evolución · {MEAS[measure].l}</h3>
            <div className="sub">{gran === 'mes' ? 'Por mes de proceso' : 'Por fecha de declaración'}</div>
          </div>
          <div className="tl">
            <div className="seg" role="group">
              {(['mes','dia'] as const).map(g => (
                <button key={g} type="button" aria-pressed={gran === g} onClick={() => setGran(g)}>
                  {g === 'mes' ? 'Mensual' : 'Diario'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="chart">
          <TimeChart points={timePoints} measure={mKey} />
        </div>
      </div>

      <div className="grid2">
        {CARDS.map(([dim, title]) => (
          <div key={dim} className="card">
            <h3>Top 8 · {title}</h3>
            <div className="sub">{MEAS[measure].l}</div>
            <BarList rows={topRows[dim] ?? []} measure={mKey} dim={dim} />
          </div>
        ))}
      </div>
    </>
  );
}

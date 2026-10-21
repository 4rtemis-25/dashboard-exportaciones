/**
 * Pestaña Gráficos: Top N con tipos SVG 2D (torta, dona, barras, hbar, mapa de árbol, líneas).
 * El motor 3D (three.js) se puede agregar en la siguiente iteración.
 */
import { useEffect, useState } from 'react';
import { useStore, MEASURE_KEY } from '../store';
import { api, type GroupRow, type TimePoint } from '../api';
import { FILT_DIMS, MEAS } from '../dims';
import { fm, nf0, nf1, compact, fmtDim, mesLabel } from '../fmt';
import { Chart3D, type ChartItem } from './Chart3D';

const PALETTES: Record<string, string[]> = {
  base:      ['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#6250d6','#e34948','#2f9e44','#2aa7c9','#9a6b43','#8fb339','#5f7d95'],
  calida:    ['#b5382a','#e2662b','#f0a030','#f2cf5b','#c25b7b','#8c3b5a','#d98d5f','#a8562f','#e7b08a','#7a3b2e','#c9a36b','#5e3a2a'],
  fria:      ['#1d4e89','#2a78d6','#1bb4c8','#18a999','#5fb7e5','#3a5f9e','#6c8ebf','#0f766e','#86c5da','#4b6584','#2b9e8a','#9ecae1'],
  contraste: ['#0072b2','#e69f00','#009e73','#d55e00','#cc79a7','#56b4e9','#f0e442','#222222','#7a7a7a','#882255','#44aa99','#aa4499'],
  mono:      ['#0d366b','#184f95','#1c5cab','#256abf','#2a78d6','#3987e5','#5598e7','#6da7ec','#86b6ef','#9ec5f4','#b7d3f6','#cde2fb'],
};
const PAL_NAMES = { base:'Predeterminada', calida:'Cálida', fria:'Fría', contraste:'Alto contraste', mono:'Azules' };
const OTHER_COLOR = '#9aa6a2';
const TOPS = [3,4,5,6,8,10,12];
const TYPES_2D = [['pie','Torta'],['donut','Dona'],['bar','Barras'],['hbar','H. Barras'],['tree','Árbol'],['line','Líneas']] as const;
const TYPES_3D = [['bar3d','Barras 3D'],['pie3d','Torta 3D'],['donut3d','Dona 3D']] as const;

function arcPath(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as [number, number];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1);
  if (r0 <= 0) return `M${cx},${cy} L${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} Z`;
  const [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`;
}

function niceStep(x: number) {
  const e = Math.pow(10, Math.floor(Math.log10(x)));
  const f = x / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
}

export function TabGraficos() {
  const { measure, months, buildFilter } = useStore();
  const [dim, setDim] = useState('pais');
  const [top, setTop] = useState(5);
  const [type, setType] = useState<string>('pie');
  const [showRest, setShowRest] = useState(false);
  const [pal, setPal] = useState('base');
  const [colors] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [total, setTotal] = useState(0);
  const [lineData, setLineData] = useState<TimePoint[]>([]);
  const mKey = MEASURE_KEY[measure];

  useEffect(() => {
    const f = buildFilter();
    api.query.group({ ...f, dim, measure: mKey, limit: Math.max(top + 20, 50) }).then(rows => {
      setRows(rows);
      setTotal(rows.reduce((s, r) => s + (r[mKey as keyof GroupRow] as number), 0));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(buildFilter()), dim, top, measure]);

  useEffect(() => {
    if (type !== 'line') return;
    const f = buildFilter();
    api.query.time({ ...f, granularity: 'mes', stack_dim: dim }).then(setLineData).catch(() => setLineData([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type === 'line' ? JSON.stringify(buildFilter()) : null, dim, type, measure]);

  const palette = PALETTES[pal] ?? PALETTES.base;
  const colorFor = (name: string, rank: number) => colors[`${dim}|${name}`] ?? palette[rank % 12];

  const items = rows.slice(0, top).map((r, i) => ({
    ...r,
    color: colorFor(fmtDim(dim, r.key), i),
    displayKey: fmtDim(dim, r.key),
  }));
  const restV = total - items.reduce((s, it) => s + (it[mKey as keyof typeof it] as number), 0);
  if (showRest && rows.length > top && restV > 0) {
    items.push({ key: `__otros`, fob_usd: restV, fob_cop: 0, kg: 0, cnt: 0,
      color: colors[`${dim}|__otros`] ?? OTHER_COLOR, displayKey: `Otros (${rows.length - top})` } as any);
  }

  function renderChart() {
    if (!items.length || total <= 0) return <div className="note">Sin datos con los filtros actuales.</div>;
    const sum = items.reduce((s, it) => s + (it[mKey as keyof typeof it] as number), 0);

    if (type === 'pie' || type === 'donut') {
      const cx = 130, cy = 130, r1 = 122, r0 = type === 'donut' ? 72 : 0; let a = -Math.PI / 2;
      return (
        <svg viewBox="0 0 260 260" style={{ maxWidth: 300, display: 'block', width: '100%', height: 'auto' }}>
          {items.map(it => {
            const v = it[mKey as keyof typeof it] as number;
            const f = Math.min(v / sum, 0.99999), a1 = a + f * Math.PI * 2;
            const path = arcPath(cx, cy, r0, r1, a, a1); a = a1;
            return <path key={it.key} d={path} fill={it.color} stroke="var(--surface)" strokeWidth={2} style={{ cursor: 'pointer' }} />;
          })}
          {type === 'donut' && <>
            <text x="130" y="126" textAnchor="middle" style={{ fontSize: 11, fill: 'var(--ink-3)' }}>Total</text>
            <text x="130" y="146" textAnchor="middle" style={{ fontSize: 15, fontWeight: 600, fill: 'var(--ink)' }}>{fm(mKey, total)}</text>
          </>}
        </svg>
      );
    }

    if (type === 'bar') {
      const W = 560, H = 280, L = 64, Rr = 8, T = 10, Bt = 44;
      const maxV = Math.max(...items.map(it => it[mKey as keyof typeof it] as number));
      const step = niceStep(maxV / 4), topV = Math.ceil(maxV / step) * step;
      const iw = W - L - Rr, ih = H - T - Bt, band = iw / items.length, bw = Math.min(70, band * 0.65);
      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {Array.from({ length: Math.round(topV / step) + 1 }, (_, i) => i * step).map(t => {
            const y = T + ih - t / topV * ih;
            return <g key={t}><line x1={L} x2={W-Rr} y1={y} y2={y} stroke="var(--grid)"/>
              <text x={L-6} y={y+4} textAnchor="end" style={{ fill:'var(--ink-3)', fontSize:11.5, fontFamily:'var(--font-num)' }}>{compact(t)}</text></g>;
          })}
          {items.map((it, i) => {
            const v = it[mKey as keyof typeof it] as number;
            const h = Math.max(1, v / topV * ih), x = L + band * i + (band - bw) / 2;
            return <g key={it.key}>
              <rect x={x} y={T+ih-h} width={bw} height={h} rx={3} fill={it.color} />
              <text x={x+bw/2} y={H-24} textAnchor="middle" style={{ fontSize: 11, fill: 'var(--ink-3)', fontFamily: 'var(--font-ui)' }}>{it.displayKey.slice(0,10)}</text>
            </g>;
          })}
          <line x1={L} x2={W-Rr} y1={T+ih} y2={T+ih} stroke="var(--line)" />
        </svg>
      );
    }

    if (type === 'hbar') {
      const maxV = Math.max(...items.map(it => it[mKey as keyof typeof it] as number));
      return (
        <div className="bl" style={{ width: '100%' }}>
          {items.map(it => {
            const v = it[mKey as keyof typeof it] as number;
            return (
              <div key={it.key} className="br">
                <span className="t">{it.displayKey}</span>
                <span className="tr"><span className="f" style={{ display:'block', width: `${Math.max(0.5, v/maxV*100)}%`, background: it.color }} /></span>
                <span className="v">{fm(mKey, v)}</span>
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'tree') {
      const W = 560, H = 280;
      type Rect = [typeof items[0], number, number, number, number];
      const rects: Rect[] = [];
      const sorted = [...items].sort((a, b) => (b[mKey as keyof typeof b] as number) - (a[mKey as keyof typeof a] as number));
      function lay(arr: typeof sorted, x: number, y: number, w: number, h: number) {
        if (arr.length === 1) { rects.push([arr[0], x, y, w, h]); return; }
        const val = (item: (typeof arr)[0]) => item[mKey as keyof typeof item] as number;
        const t = arr.reduce((s, q) => s + val(q), 0); let acc = 0, k = 0;
        while (k < arr.length - 1 && acc + val(arr[k]) < t / 2) acc += val(arr[k++]);
        if (k === 0) { acc = arr[0][mKey as keyof typeof arr[0]] as number; k = 1; }
        const f = acc / t;
        if (w >= h) { lay(arr.slice(0,k), x, y, w*f, h); lay(arr.slice(k), x+w*f, y, w*(1-f), h); }
        else { lay(arr.slice(0,k), x, y, w, h*f); lay(arr.slice(k), x, y+h*f, w, h*(1-f)); }
      }
      if (sorted.length) lay(sorted, 0, 0, W, H);
      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {rects.map(([it, x, y, w, h]) => (
            <g key={it.key}>
              <rect x={x+1} y={y+1} width={Math.max(w-2,0)} height={Math.max(h-2,0)} rx={4} fill={it.color} />
              {w > 70 && h > 40 && <text x={x+10} y={y+22} style={{ fill:'#fff', fontSize:13, fontWeight:600, fontFamily:'var(--font-ui)' }}>{it.displayKey.slice(0,12)}</text>}
            </g>
          ))}
        </svg>
      );
    }

    if (type === 'line') {
      const periods = [...new Set(lineData.map(r => String(r.period)))].sort();
      const nM = periods.length;
      if (months.length < 2 || nM < 2)
        return <div className="note">Las líneas por mes necesitan al menos 2 meses cargados. Carga otro mes o elige otro tipo de gráfico.</div>;

      const matMap = new Map<string, Map<string, number>>();
      lineData.forEach(r => {
        const sk = String(r.stack_key ?? '');
        if (!matMap.has(sk)) matMap.set(sk, new Map());
        matMap.get(sk)!.set(String(r.period), r[mKey as keyof TimePoint] as number ?? 0);
      });

      const W = 560, H = 280, L = 64, Rr = 26, T = 10, Bt = 26;
      const iw = W - L - Rr, ih = H - T - Bt;
      const showItems = items.filter(it => it.key !== '__otros');
      const allVals = showItems.flatMap(it => periods.map(p => matMap.get(it.key)?.get(p) ?? 0));
      const maxV = Math.max(...allVals, 1);
      const step = niceStep(maxV / 4);
      const topV = Math.ceil(maxV / step) * step;
      const X = (b: number) => L + b * iw / (nM - 1);
      const Y = (v: number) => T + ih - v / topV * ih;
      const every = Math.max(1, Math.ceil(nM / 8));

      return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {Array.from({ length: Math.round(topV / step) + 1 }, (_, i) => i * step).map(t => {
            const y = Y(t);
            return <g key={t}>
              <line x1={L} x2={W - Rr} y1={y} y2={y} stroke="var(--grid)" strokeWidth={1} />
              <text x={L-6} y={y+4} textAnchor="end" style={{ fill:'var(--ink-3)', fontSize:11.5, fontFamily:'var(--font-num)' }}>
                {compact(mKey === 'kg' ? t/1000 : t)}
              </text>
            </g>;
          })}
          {periods.map((p, b) => b % every === 0 && (
            <text key={p} x={X(b)} y={H-8} textAnchor="middle" style={{ fill:'var(--ink-3)', fontSize:11.5, fontFamily:'var(--font-num)' }}>
              {mesLabel(p, true)}
            </text>
          ))}
          {showItems.map(it => {
            const pts = periods.map((p, b) => `${X(b)},${Y(matMap.get(it.key)?.get(p) ?? 0)}`).join(' ');
            return (
              <g key={it.key}>
                <polyline fill="none" stroke={it.color} strokeWidth={2.5} strokeLinejoin="round" points={pts} />
                {periods.map((p, b) => {
                  const v = matMap.get(it.key)?.get(p) ?? 0;
                  return <circle key={p} cx={X(b)} cy={Y(v)} r={4.5} fill={it.color} stroke="var(--surface)" strokeWidth={2} />;
                })}
              </g>
            );
          })}
          <line x1={L} x2={W - Rr} y1={T + ih} y2={T + ih} stroke="var(--line)" strokeWidth={1} />
        </svg>
      );
    }

    if (type === 'bar3d' || type === 'pie3d' || type === 'donut3d') {
      return <Chart3D items={items as ChartItem[]} type={type as 'bar3d' | 'pie3d' | 'donut3d'} mKey={mKey} total={sum} />;
    }

    return <div className="note">Tipo no disponible aún.</div>;
  }

  return (
    <div className="card studio">
      <div className="card-h">
        <div>
          <h2 className="h2">Top {top} · {FILT_DIMS.find(d => d.k === dim)?.l} · {MEAS[measure].s}</h2>
          <div className="sub">Según los filtros actuales</div>
        </div>
      </div>

      {/* Controles */}
      <div className="ctrls">
        <div className="field">
          <label htmlFor="pieDim">Agrupar por</label>
          <select id="pieDim" value={dim} onChange={e => setDim(e.target.value)}>
            {FILT_DIMS.map(d => <option key={d.k} value={d.k}>{d.l}</option>)}
          </select>
        </div>
        <div className="field narrow">
          <label htmlFor="pieTop">Top</label>
          <select id="pieTop" value={top} onChange={e => setTop(+e.target.value)}>
            {TOPS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="field narrow">
          <label htmlFor="palSel">Paleta</label>
          <select id="palSel" value={pal} onChange={e => setPal(e.target.value)}>
            {Object.entries(PAL_NAMES).map(([k,l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <label className="chk">
          <input type="checkbox" checked={showRest} onChange={e => setShowRest(e.target.checked)} />
          Mostrar "Otros"
        </label>
      </div>

      {/* Tipo de gráfico */}
      <div className="typebar">
        <div className="tgroup">
          <span className="tl-lbl">2D</span>
          <div className="seg wrapseg" role="group">
            {TYPES_2D.map(([k, l]) => (
              <button key={k} type="button" data-pt={k} aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>
            ))}
          </div>
        </div>
        <div className="tgroup">
          <span className="tl-lbl">3D</span>
          <div className="seg wrapseg" role="group">
            {TYPES_3D.map(([k, l]) => (
              <button key={k} type="button" data-pt={k} aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Área del gráfico + leyenda */}
      <div className="piewrap">
        <div className={`pie${type === 'hbar' ? ' wide' : ''}${type.endsWith('3d') ? ' p3d' : ''}`}>
          {renderChart()}
        </div>
        <div className="lgs">
          {items.map(it => {
            const v = it[mKey as keyof typeof it] as number;
            return (
              <div key={it.key} className="lg">
                <i style={{ background: it.color, width: 14, height: 14, borderRadius: 4, display: 'block' }} />
                <span className="t" title={it.displayKey}>{it.displayKey}</span>
                <span className="v">{fm(mKey, v)}</span>
                <span className="p">{total ? nf1.format(v / total * 100) : 0}%</span>
              </div>
            );
          })}
          <div className="note">{nf0.format(rows.length)} valores · total {fm(mKey, total)}</div>
        </div>
      </div>
    </div>
  );
}

/* ===== Estudio de gráficos: Top N en 2D y 3D, colores, orden y enfoque ===== */
const PALETTES = {
  base: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#e34948', '#2f9e44', '#2aa7c9', '#9a6b43', '#8fb339', '#5f7d95'],
  calida: ['#b5382a', '#e2662b', '#f0a030', '#f2cf5b', '#c25b7b', '#8c3b5a', '#d98d5f', '#a8562f', '#e7b08a', '#7a3b2e', '#c9a36b', '#5e3a2a'],
  fria: ['#1d4e89', '#2a78d6', '#1bb4c8', '#18a999', '#5fb7e5', '#3a5f9e', '#6c8ebf', '#0f766e', '#86c5da', '#4b6584', '#2b9e8a', '#9ecae1'],
  contraste: ['#0072b2', '#e69f00', '#009e73', '#d55e00', '#cc79a7', '#56b4e9', '#f0e442', '#222222', '#7a7a7a', '#882255', '#44aa99', '#aa4499'],
  mono: ['#0d366b', '#184f95', '#1c5cab', '#256abf', '#2a78d6', '#3987e5', '#5598e7', '#6da7ec', '#86b6ef', '#9ec5f4', '#b7d3f6', '#cde2fb'],
};
const PAL_NAMES = { base: 'Predeterminada', calida: 'Cálida', fria: 'Fría', contraste: 'Alto contraste', mono: 'Azules' };
const SORTS = { measure: 'Valor (medida actual)', fobUsd: 'FOB USD', fobCop: 'FOB COP', kg: 'Peso neto', cnt: 'Series', name: 'Nombre' };
const TYPES2D = [['pie', 'Torta'], ['donut', 'Dona'], ['bar', 'Barras'], ['hbar', 'Barras horizontales'], ['tree', 'Mapa de árbol'], ['line', 'Líneas por mes']];
const TYPES3D = [['bar3d', 'Barras 3D'], ['pie3d', 'Torta 3D'], ['donut3d', 'Dona 3D']];
const OTHER_COLOR = '#9aa6a2';
const TOPS = [3, 4, 5, 6, 8, 10, 12];

function colorFor(dim, name, rank) { return S.colors[dim + '|' + name] || PALETTES[S.pal][rank % 12]; }
function textOn(hex) { const n = parseInt(String(hex).slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#12201d' : '#ffffff'; }
function saveColors() { try { localStorage.setItem('pe-colors', JSON.stringify({ c: S.colors, p: S.pal })); } catch (e) { } }
function loadColors() { try { const o = JSON.parse(localStorage.getItem('pe-colors') || 'null'); if (o) { S.colors = o.c || {}; if (PALETTES[o.p]) S.pal = o.p; } } catch (e) { } }

/* Máscara del gráfico: filtros globales + enfoque en un ítem */
function chartMask() {
  const f = S.focus;
  if (!f.dim || f.id == null) return R.mask;
  const key = f.dim + '|' + f.id;
  if (R.fmask && R.fmask.k === key) return R.fmask.m;
  const ids = G.dims[f.dim].ids, m = new Uint8Array(G.n);
  for (let i = 0; i < G.n; i++) if (R.mask[i] && ids[i] === f.id) m[i] = 1;
  R.fmask = { k: key, m };
  return m;
}
function focusLabel() { const f = S.focus; return f.dim && f.id != null ? `${DIMMAP[f.dim].l}: ${fmtVal(f.dim, G.dims[f.dim].vals[f.id])}` : ''; }

function pieData() {
  const d = S.pie, m = S.measure, mask = chartMask(), a = groupBy(d.dim, mask), ids = topIds(a, m);
  let tot = 0; ids.forEach(i => tot += a[m][i]);
  const items = ids.slice(0, d.top).map((id, r) => {
    const name = fmtVal(d.dim, G.dims[d.dim].vals[id]);
    return { id, name, v: a[m][id], cnt: a.cnt[id], fobUsd: a.fobUsd[id], fobCop: a.fobCop[id], kg: a.kg[id], color: colorFor(d.dim, name, r), ckey: d.dim + '|' + name };
  });
  const key = d.sort === 'measure' ? m : d.sort, sgn = d.dir === 'desc' ? -1 : 1;
  items.sort((p, q) => key === 'name' ? sgn * p.name.localeCompare(q.name, 'es') : sgn * (p[key] - q[key]));
  const restV = tot - items.reduce((s, x) => s + x.v, 0);
  if (d.rest && ids.length > d.top && restV > 0) items.push({ id: null, name: `Otros (${nf0.format(ids.length - d.top)})`, v: restV, cnt: 0, color: S.colors[d.dim + '|__otros'] || OTHER_COLOR, ckey: d.dim + '|__otros' });
  return { items, tot, nAll: ids.length };
}
function pieTip(it, tot) {
  const m = S.measure;
  return `<b>${esc(it.name)}</b><div class="r"><span>${MEAS[m].s}</span><span>${esc(fmFull(m, it.v))}</span></div><div class="r"><span>Participación</span><span>${tot ? nf1.format(it.v / tot * 100) : 0}%</span></div>` + (it.cnt ? `<div class="r"><span>Series</span><span>${nf0.format(it.cnt)}</span></div>` : '');
}

/* ===== Controles ===== */
function studioHTML() {
  const d = S.pie, f = S.focus;
  const dimOpts = FILT_DIMS.map(x => `<option value="${x.k}"${x.k === d.dim ? ' selected' : ''}>${esc(x.l)}</option>`).join('');
  const fOpts = '<option value="">Sin enfoque</option>' + FILT_DIMS.map(x => `<option value="${x.k}"${x.k === f.dim ? ' selected' : ''}>${esc(x.l)}</option>`).join('');
  const seg = (arr) => arr.map(([k, l]) => `<button type="button" data-pt="${k}" aria-pressed="${d.type === k}">${l}</button>`).join('');
  const dirTxt = d.sort === 'name' ? (d.dir === 'asc' ? 'A → Z' : 'Z → A') : (d.dir === 'desc' ? 'Mayor a menor' : 'Menor a mayor');
  const fl = focusLabel();
  return `<div class="card studio">
  <div class="card-h"><div><h2 id="chTitle" class="h2"></h2><div class="sub" id="chSub"></div></div>
    <div class="tl"><button type="button" class="btn" data-cp="toggle" aria-pressed="${S.colorsOpen}">Colores</button></div></div>
  <div class="ctrls">
    <div class="field"><label for="pieDim">Agrupar por</label><select id="pieDim">${dimOpts}</select></div>
    <div class="field narrow"><label for="pieTop">Cantidad (Top)</label><select id="pieTop">${TOPS.map(x => `<option value="${x}"${d.top === x ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label for="pieSort">Ordenar por</label><select id="pieSort">${Object.keys(SORTS).map(k => `<option value="${k}"${d.sort === k ? ' selected' : ''}>${SORTS[k]}</option>`).join('')}</select></div>
    <div class="field narrow"><label>Sentido</label><button type="button" class="btn full" data-dir="1">${dirTxt}</button></div>
    <label class="chk"><input type="checkbox" id="pieRest" ${d.rest ? 'checked' : ''}> Mostrar “Otros”</label>
  </div>
  <div class="focusrow">
    <div class="field"><label for="fcDim">Enfocar en un ítem de…</label><select id="fcDim">${fOpts}</select></div>
    <div class="field grow combo"><label for="fcQ">${f.dim ? 'Buscar ' + esc(DIMMAP[f.dim].l.toLowerCase()) : 'Elige primero una categoría'}</label>
      <input type="search" id="fcQ" autocomplete="off" placeholder="${f.dim ? 'Escribe para buscar (ej. 0901 o café)' : 'Ej. Partida (4 dígitos)'}" value="${esc(f.q || '')}" ${f.dim ? '' : 'disabled'}>
      <div id="fcRes" class="fcres" hidden></div></div>
    ${fl ? `<div class="fl focuschip"><b>Solo:</b><span class="v" title="${esc(fl)}">${esc(fl)}</span><button type="button" data-fclear="1" aria-label="Quitar enfoque">×</button></div><button type="button" class="btn sm" data-fglobal="1">Usar como filtro global</button>` : ''}
  </div>
  <div class="typebar">
    <div class="tgroup"><span class="tl-lbl">2D</span><div class="seg wrapseg" role="group" aria-label="Gráficos 2D">${seg(TYPES2D)}</div></div>
    <div class="tgroup"><span class="tl-lbl">3D</span><div class="seg wrapseg" role="group" aria-label="Gráficos 3D">${seg(TYPES3D)}</div></div>
  </div>
  <div id="colorPanel" class="cpanel" hidden></div>
  <div id="pieChart" class="piewrap"></div></div>`;
}
function renderFocusResults() {
  const box = $('#fcRes'); if (!box) return;
  const f = S.focus; if (!f.dim) { box.hidden = true; return; }
  const a = groupBy(f.dim, R.mask), q = (f.q || '').toLowerCase(), m = S.measure;
  let ids = topIds(a, m);
  if (q) ids = ids.filter(i => fmtVal(f.dim, G.dims[f.dim].vals[i]).toLowerCase().includes(q));
  box.innerHTML = ids.slice(0, 40).map(i => `<button type="button" class="fcopt" data-fpick="${i}"><span class="t">${esc(fmtVal(f.dim, G.dims[f.dim].vals[i]))}</span><span class="c">${compact(a[m][i])}</span></button>`).join('')
    + (ids.length > 40 ? `<div class="note">${nf0.format(ids.length)} coincidencias. Escribe más para acotar.</div>` : '') + (!ids.length ? '<div class="note">Sin coincidencias con los filtros actuales.</div>' : '');
  box.hidden = false;
}
function renderColorPanel(items) {
  const p = $('#colorPanel'); if (!p) return;
  if (!S.colorsOpen) { p.hidden = true; p.innerHTML = ''; return; }
  p.hidden = false;
  p.innerHTML = `<div class="cp-head"><div class="field"><label for="palSel">Paleta</label><select id="palSel">${Object.keys(PALETTES).map(k => `<option value="${k}"${S.pal === k ? ' selected' : ''}>${PAL_NAMES[k]}</option>`).join('')}</select></div>
    <div class="pal-prev" aria-hidden="true">${PALETTES[S.pal].slice(0, 8).map(c => `<i style="background:${c}"></i>`).join('')}</div>
    <button type="button" class="btn sm" data-cp="reset">Restablecer colores</button></div>
    <div class="cp-grid">${items.map((it, i) => `<label class="cp-item" for="clr-${i}"><input type="color" id="clr-${i}" data-ck="${esc(it.ckey)}" value="${it.color}"><span class="t" title="${esc(it.name)}">${esc(it.name)}</span></label>`).join('')}</div>
    <div class="note">Cada color queda asociado al elemento (no a su posición): no cambia al reordenar o filtrar.</div>`;
}

/* ===== Dibujo principal ===== */
function renderGraficos() {
  dispose3D();
  $('#view').innerHTML = studioHTML();
  drawChart({ panel: true });
}
function drawChart(opts) {
  const box = $('#pieChart'); if (!box) return;
  dispose3D();
  const d = S.pie, m = S.measure;
  const { items, tot, nAll } = pieData();
  $('#chTitle').textContent = `Top ${d.top} · ${DIMMAP[d.dim].l} · ${MEAS[m].s}`;
  const fl = focusLabel();
  $('#chSub').textContent = fl ? `Solo con ${fl}` : 'Según los filtros actuales · clic en un elemento para filtrar (Ctrl/⇧ suma)';
  if (!opts || opts.panel !== false) renderColorPanel(items);
  if (!items.length || tot <= 0) { box.innerHTML = '<div class="note">Sin datos con los filtros actuales.</div>'; return; }
  const sum = items.reduce((s, x) => s + x.v, 0);
  const attrs = it => (it.id == null ? '' : `data-dim="${d.dim}" data-id="${it.id}" `) + `data-tip="${esc(pieTip(it, tot))}"`;
  const sel = S.filters[d.dim] || new Set();
  const legend = `<div class="lgs">${items.map(it => `<div class="lg${it.id != null && sel.has(it.id) ? ' sel' : ''}" ${attrs(it)}><i style="background:${it.color}"></i><span class="t" title="${esc(it.name)}">${esc(it.name)}</span><span class="v">${esc(fm(m, it.v))}</span><span class="p">${nf1.format(it.v / tot * 100)}%</span></div>`).join('')}<div class="note">${nf0.format(nAll)} ${nAll === 1 ? 'valor' : 'valores'} en total · total ${esc(fm(m, tot))}</div></div>`;
  if (d.type.endsWith('3d')) {
    box.innerHTML = `<div class="pie p3d" id="c3dHost"></div>${legend}`;
    draw3D($('#c3dHost'), items, tot);
    return;
  }
  let svg = '';
  const ax = DIMMAP[d.dim].l;
  if (d.type === 'pie' || d.type === 'donut') {
    const cx = 130, cy = 130, r1 = 122, r0 = d.type === 'donut' ? 72 : 0; let a = -Math.PI / 2;
    svg = `<svg viewBox="0 0 260 260" role="img" aria-label="${esc(ax)}: participación en ${MEAS[m].s}" style="max-width:300px">`;
    for (const it of items) {
      const f = Math.min(it.v / sum, 0.99999), a1 = a + f * Math.PI * 2;
      svg += `<path d="${arcPath(cx, cy, r0, r1, a, a1)}" fill="${it.color}" stroke="var(--surface)" stroke-width="2" class="sl" ${attrs(it)}/>`;
      a = a1;
    }
    if (d.type === 'donut') svg += `<text x="130" y="126" text-anchor="middle" style="font-size:11px">Total</text><text x="130" y="146" text-anchor="middle" style="font-size:15px;font-weight:600;fill:var(--ink)">${esc(fm(m, tot))}</text>`;
    svg += '</svg>';
  } else if (d.type === 'bar') {
    const W = 560, H = 280, L = 64, Rr = 8, T = 10, Bt = 44, max = Math.max(...items.map(x => x.v)), step = niceStep(max / 4), top = Math.ceil(max / step) * step, iw = W - L - Rr, ih = H - T - Bt, band = iw / items.length, bw = Math.min(70, band * 0.65);
    svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Barras de ${esc(ax)}">`;
    for (let t = 0; t <= top + 1e-9; t += step) { const y = T + ih - t / top * ih; svg += `<line x1="${L}" x2="${W - Rr}" y1="${y}" y2="${y}" stroke="var(--grid)"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${axisFmt(m, t)}</text>`; }
    items.forEach((it, i) => {
      const h = it.v / top * ih, x = L + band * i + (band - bw) / 2, mx = Math.max(6, Math.floor(band / 6.5)), nm = it.name.length > mx ? it.name.slice(0, mx - 1) + '…' : it.name;
      svg += `<rect x="${x}" y="${T + ih - h}" width="${bw}" height="${Math.max(h, 1)}" rx="3" fill="${it.color}" class="sl" ${attrs(it)}/><text x="${x + bw / 2}" y="${H - 24}" text-anchor="middle">${esc(nm)}</text><text x="${x + bw / 2}" y="${H - 9}" text-anchor="middle">${nf1.format(it.v / tot * 100)}%</text>`;
    });
    svg += `<line x1="${L}" x2="${W - Rr}" y1="${T + ih}" y2="${T + ih}" stroke="var(--line)"/></svg>`;
  } else if (d.type === 'hbar') {
    const max = Math.max(...items.map(x => x.v));
    svg = `<div class="bl" style="width:100%">${items.map(it => `<div class="br" ${attrs(it)}><span class="t">${esc(it.name)}</span><span class="tr"><span class="f" style="display:block;width:${Math.max(0.5, it.v / max * 100)}%;background:${it.color}"></span></span><span class="v">${esc(fm(m, it.v))}</span></div>`).join('')}</div>`;
  } else if (d.type === 'tree') {
    const W = 560, H = 280, rects = [];
    const lay = (arr, x, y, w, h) => {
      if (arr.length === 1) { rects.push([arr[0], x, y, w, h]); return; }
      const total = arr.reduce((s, q) => s + q.v, 0); let acc = 0, k = 0;
      while (k < arr.length - 1 && acc + arr[k].v < total / 2) acc += arr[k++].v;
      if (k === 0) { acc = arr[0].v; k = 1; }
      const f = acc / total;
      if (w >= h) { lay(arr.slice(0, k), x, y, w * f, h); lay(arr.slice(k), x + w * f, y, w * (1 - f), h); }
      else { lay(arr.slice(0, k), x, y, w, h * f); lay(arr.slice(k), x, y + h * f, w, h * (1 - f)); }
    };
    lay(items.slice().sort((p, q) => q.v - p.v), 0, 0, W, H);
    svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mapa de árbol de ${esc(ax)}">` + rects.map(([it, x, y, w, h]) => {
      const mx = Math.max(3, Math.floor(w / 7.5) - 1), nm = it.name.length > mx ? it.name.slice(0, mx) + '…' : it.name, tc = textOn(it.color);
      return `<rect x="${x + 1}" y="${y + 1}" width="${Math.max(w - 2, 0)}" height="${Math.max(h - 2, 0)}" rx="4" fill="${it.color}" class="sl" ${attrs(it)}/>` + (w > 70 && h > 40 ? `<text x="${x + 10}" y="${y + 22}" style="fill:${tc};font-family:var(--font-ui);font-size:13px;font-weight:600">${esc(nm)}</text><text x="${x + 10}" y="${y + 40}" style="fill:${tc};font-size:12px">${nf1.format(it.v / tot * 100)}%</text>` : '');
    }).join('') + '</svg>';
  } else if (d.type === 'line') {
    const nM = G.monthIds.length;
    if (nM < 2) svg = '<div class="note">Las líneas por mes necesitan al menos 2 meses cargados. Carga otro mes o elige otro tipo de gráfico.</div>';
    else {
      const mask = chartMask(), pos = new Map(); items.forEach((it, i) => { if (it.id != null) pos.set(it.id, i); });
      const mat = items.map(() => new Float64Array(nM)), ri = items.findIndex(x => x.id == null), arr = m === 'cnt' ? null : G.nums[m], dm = G.dims.mes.ids, rk = G.monthRank, ids = G.dims[d.dim].ids;
      for (let i = 0; i < G.n; i++) if (mask[i]) { let p = pos.get(ids[i]); if (p === undefined) { if (ri < 0) continue; p = ri; } mat[p][rk[dm[i]]] += arr ? arr[i] : 1; }
      let max = 0; mat.forEach(r => r.forEach(v => { if (v > max) max = v; }));
      const W = 560, H = 280, L = 64, Rr = 26, T = 10, Bt = 26, step = niceStep((max || 1) / 4), top = Math.ceil((max || 1) / step) * step, iw = W - L - Rr, ih = H - T - Bt;
      const X = b => L + b * iw / (nM - 1), Y = v => T + ih - v / top * ih;
      svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución mensual">`;
      for (let t = 0; t <= top + 1e-9; t += step) svg += `<line x1="${L}" x2="${W - Rr}" y1="${Y(t)}" y2="${Y(t)}" stroke="var(--grid)"/><text x="${L - 6}" y="${Y(t) + 4}" text-anchor="end">${axisFmt(m, t)}</text>`;
      const every = Math.max(1, Math.ceil(nM / 8));
      G.monthIds.forEach((id, b) => { if (b % every === 0) svg += `<text x="${X(b)}" y="${H - 8}" text-anchor="middle">${esc(mesLabel(G.dims.mes.vals[id], true))}</text>`; });
      mat.forEach((r, i) => {
        svg += `<polyline fill="none" stroke="${items[i].color}" stroke-width="2.5" stroke-linejoin="round" points="${[...r].map((v, b) => X(b) + ',' + Y(v)).join(' ')}"/>`;
        r.forEach((v, b) => { svg += `<circle cx="${X(b)}" cy="${Y(v)}" r="4.5" fill="${items[i].color}" stroke="var(--surface)" stroke-width="2" data-tip="${esc(`<b>${esc(items[i].name)}</b><div class='r'><span>${esc(mesLabel(G.dims.mes.vals[G.monthIds[b]]))}</span><span>${esc(fm(m, v))}</span></div>`)}"/>`; });
      });
      svg += `<line x1="${L}" x2="${W - Rr}" y1="${T + ih}" y2="${T + ih}" stroke="var(--line)"/></svg>`;
    }
  }
  box.innerHTML = `<div class="pie${d.type === 'hbar' ? ' wide' : ''}">${svg}</div>${legend}`;
}
function arcPath(cx, cy, r0, r1, a0, a1) {
  const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0, [x0, y0] = p(r1, a0), [x1, y1] = p(r1, a1);
  if (r0 <= 0) return `M${cx},${cy} L${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} Z`;
  const [x2, y2] = p(r0, a1), [x3, y3] = p(r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 0 ${x3},${y3} Z`;
}

/* ===== Motor 3D (three.js) ===== */
let T3 = null;
function dispose3D() {
  if (!T3) return;
  cancelAnimationFrame(T3.raf); T3.ro && T3.ro.disconnect();
  T3.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
  T3.renderer.dispose(); T3 = null;
}
const cssv = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
function sprite(text, color, px, weight) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), dpr = 2;
  const font = `${weight || 600} ${px * dpr}px "Schibsted Grotesk", system-ui, sans-serif`;
  ctx.font = font; const w = Math.ceil(ctx.measureText(text).width) + 8 * dpr, h = Math.ceil(px * dpr * 1.5);
  c.width = w; c.height = h; ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c); tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(w / dpr / 30, h / dpr / 30, 1); s.renderOrder = 10; return s;
}
function draw3D(host, items, tot) {
  if (typeof THREE === 'undefined') { host.innerHTML = '<div class="note">No se pudo cargar el motor 3D (¿sin conexión?). Usa un gráfico 2D.</div>'; return; }
  const d = S.pie, m = S.measure, W = Math.max(300, host.clientWidth || 520), H = Math.round(Math.min(460, Math.max(320, W * 0.72)));
  host.innerHTML = `<div class="c3d" style="height:${H}px"><div class="c3d-ctl"><button type="button" class="btn sm" data-c3="auto" aria-pressed="${!!d.auto}">Girar solo</button><button type="button" class="btn sm" data-c3="reset">Reiniciar vista</button><button type="button" class="btn sm" data-c3="in" aria-label="Acercar">+</button><button type="button" class="btn sm" data-c3="out" aria-label="Alejar">−</button></div><div class="c3d-hint">Arrastra para girar</div></div>`;
  const wrap = host.firstChild;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
  catch (e) { host.innerHTML = '<div class="note">Tu navegador no permite gráficos 3D (WebGL). Usa un gráfico 2D.</div>'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
  wrap.insertBefore(renderer.domElement, wrap.firstChild);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 200), root = new THREE.Group();
  scene.add(root);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dl = new THREE.DirectionalLight(0xffffff, 0.5); dl.position.set(6, 12, 8); scene.add(dl);
  const dl2 = new THREE.DirectionalLight(0xffffff, 0.15); dl2.position.set(-8, 4, -6); scene.add(dl2);
  const ink = cssv('--ink') || '#12201d', ink2 = cssv('--ink-2') || '#4a5a56', lineC = cssv('--line') || '#d3dbd8', floorC = cssv('--surface-2') || '#e6ebe9';
  const meshes = []; const isBar = d.type === 'bar3d';
  const asp = W / H, tan = Math.tan(20 * Math.PI / 180);
  let startX, startY, camZ, lookY = 0;
  if (isBar) {
    const n = items.length, sp = 1.9, bw = 1.2, maxH = 6, max = Math.max(...items.map(x => x.v)) || 1, fw = n * sp + 1.4;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.16, 3.2), new THREE.MeshStandardMaterial({ color: floorC })); floor.position.y = -0.08; root.add(floor);
    const grid = new THREE.GridHelper(fw, Math.max(2, Math.round(fw)), lineC, lineC); grid.scale.z = 3.2 / fw; grid.position.y = 0.01; root.add(grid);
    items.forEach((it, i) => {
      const h = Math.max(0.12, it.v / max * maxH), x = (i - (n - 1) / 2) * sp;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bw), new THREE.MeshStandardMaterial({ color: it.color, roughness: 0.55, metalness: 0.05 }));
      mesh.position.set(x, h / 2, 0); mesh.userData.it = it; root.add(mesh); meshes.push(mesh);
      const vs = sprite(fm(m, it.v), ink, 12, 600); vs.position.set(x, h + 0.55, 0); root.add(vs);
      const nm = it.name.length > 16 ? it.name.slice(0, 15) + '…' : it.name, ns = sprite(nm, ink2, 11, 500); ns.position.set(x, 0.25, 2.05); root.add(ns);
    });
    startX = 0.38; startY = -0.4; camZ = Math.max(13, (fw / 2 + 1.5) / (tan * asp)) * 1.12; lookY = 2.6;
  } else {
    const donut = d.type === 'donut3d', R0 = 4.4, r0 = donut ? 2.2 : 0, depth = 1.3, sum = items.reduce((s, x) => s + x.v, 0);
    const inner = new THREE.Group(); inner.rotation.x = -Math.PI / 2; root.add(inner);
    let a = 0;
    items.forEach(it => {
      const f = Math.min(it.v / sum, 0.99999), a1 = a + f * Math.PI * 2, sh = new THREE.Shape();
      if (donut) { sh.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); sh.lineTo(Math.cos(a) * R0, Math.sin(a) * R0); sh.absarc(0, 0, R0, a, a1, false); sh.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0); sh.absarc(0, 0, r0, a1, a, true); }
      else { sh.moveTo(0, 0); sh.lineTo(Math.cos(a) * R0, Math.sin(a) * R0); sh.absarc(0, 0, R0, a, a1, false); sh.lineTo(0, 0); }
      const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 64 });
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: it.color, roughness: 0.55, metalness: 0.05 }));
      const mid = (a + a1) / 2; mesh.userData.it = it; mesh.userData.dir = [Math.cos(mid), Math.sin(mid)]; inner.add(mesh); meshes.push(mesh);
      if (f > 0.04) { const rr = donut ? (R0 + r0) / 2 : R0 * 0.66, ps = sprite(nf1.format(it.v / tot * 100) + '%', textOn(it.color), 13, 700); ps.position.set(Math.cos(mid) * rr, depth + 0.45, -Math.sin(mid) * rr); root.add(ps); }
      a = a1;
    });
    startX = 0.95; startY = 0; camZ = Math.max(13, (R0 + 1.4) / (tan * Math.min(asp, 1.2))) * 1.18; lookY = 0;
  }
  root.rotation.set(startX, startY, 0); camera.position.set(0, lookY, camZ); camera.lookAt(0, lookY, 0);
  const st = { startX, startY, camZ };
  const render = () => renderer.render(scene, camera);
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let hover = null, drag = false, moved = 0, lx = 0, ly = 0;
  const canvas = renderer.domElement, tip = $('#tip');
  const setHover = (mesh, e) => {
    if (hover !== mesh) {
      if (hover) { hover.material.emissive.setHex(0x000000); if (hover.userData.dir) hover.position.set(0, 0, 0); }
      hover = mesh;
      if (mesh) { mesh.material.emissive.set(mesh.userData.it.color).multiplyScalar(0.28); if (mesh.userData.dir) mesh.position.set(mesh.userData.dir[0] * 0.35, mesh.userData.dir[1] * 0.35, 0); }
      render();
    }
    if (mesh && e) {
      tip.innerHTML = pieTip(mesh.userData.it, tot); tip.style.display = 'block';
      const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14;
      if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14;
      tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
    } else tip.style.display = 'none';
    canvas.style.cursor = mesh && mesh.userData.it.id != null ? 'pointer' : (drag ? 'grabbing' : 'grab');
  };
  canvas.addEventListener('pointerdown', e => { drag = true; moved = 0; lx = e.clientX; ly = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (x) { } canvas.style.cursor = 'grabbing'; });
  canvas.addEventListener('pointermove', e => {
    if (drag) {
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      root.rotation.y += dx * 0.01; root.rotation.x = Math.max(0.05, Math.min(1.5, root.rotation.x + dy * 0.01)); render(); return;
    }
    const r = canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(meshes, false)[0];
    setHover(hit ? hit.object : null, e);
  });
  canvas.addEventListener('pointerup', e => {
    drag = false;
    if (moved < 5 && hover && hover.userData.it.id != null) { tip.style.display = 'none'; setOnly(d.dim, hover.userData.it.id, e.ctrlKey || e.metaKey || e.shiftKey); }
  });
  canvas.addEventListener('pointerleave', () => { if (!drag) setHover(null); });
  canvas.style.touchAction = 'pan-y';
  const loop = () => { T3.raf = requestAnimationFrame(loop); if (S.pie.auto && !drag) { root.rotation.y += 0.006; render(); } };
  const ro = new ResizeObserver(() => { const w = Math.max(300, host.clientWidth); renderer.setSize(w, H, false); camera.aspect = w / H; camera.updateProjectionMatrix(); render(); });
  ro.observe(host);
  T3 = { renderer, scene, camera, root, ro, raf: 0, st, render, zoom(f) { camera.position.z = Math.max(5, Math.min(40, camera.position.z * f)); render(); },
    reset() { root.rotation.set(st.startX, st.startY, 0); camera.position.z = st.camZ; render(); } };
  render(); loop();
}

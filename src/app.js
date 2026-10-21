/* ===== Utilidades ===== */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const UNIT_F = { g: 0.001, kg: 1, t: 1000 };
const nf0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const mesLabel = (v, short) => /^\d{6}$/.test(v) ? MESES[+v.slice(4) - 1] + ' ' + (short ? v.slice(2, 4) : v.slice(0, 4)) : v;
const ymd = n => n ? `${String(n).slice(0, 4)}-${String(n).slice(4, 6)}-${String(n).slice(6, 8)}` : '—';
const CAP = { '01': 'Animales vivos', '02': 'Carnes y despojos comestibles', '03': 'Pescados y crustáceos', '04': 'Lácteos, huevos y miel', '05': 'Demás productos de origen animal', '06': 'Plantas vivas y flores', '07': 'Hortalizas', '08': 'Frutas y frutos comestibles', '09': 'Café, té, yerba mate y especias', '10': 'Cereales', '11': 'Productos de molinería', '12': 'Semillas y frutos oleaginosos', '13': 'Gomas, resinas y extractos vegetales', '14': 'Materias trenzables vegetales', '15': 'Grasas y aceites', '16': 'Preparaciones de carne y pescado', '17': 'Azúcares y confitería', '18': 'Cacao y sus preparaciones', '19': 'Preparaciones de cereales y pastelería', '20': 'Preparaciones de hortalizas y frutas', '21': 'Preparaciones alimenticias diversas', '22': 'Bebidas y líquidos alcohólicos', '23': 'Residuos de industrias alimentarias', '24': 'Tabaco', '25': 'Sal, azufre, tierras, piedras y cementos', '26': 'Minerales, escorias y cenizas', '27': 'Combustibles minerales, petróleo y carbón', '28': 'Productos químicos inorgánicos', '29': 'Productos químicos orgánicos', '30': 'Productos farmacéuticos', '31': 'Abonos', '32': 'Taninos, tintes y pinturas', '33': 'Perfumería y cosméticos', '34': 'Jabones y ceras', '35': 'Materias albuminoideas y colas', '36': 'Pólvoras y explosivos', '37': 'Productos fotográficos', '38': 'Productos diversos de la industria química', '39': 'Plásticos y sus manufacturas', '40': 'Caucho y sus manufacturas', '41': 'Pieles y cueros', '42': 'Manufacturas de cuero', '43': 'Peletería', '44': 'Madera y sus manufacturas', '45': 'Corcho', '46': 'Espartería y cestería', '47': 'Pasta de madera', '48': 'Papel y cartón', '49': 'Libros e impresos', '50': 'Seda', '51': 'Lana y pelo fino', '52': 'Algodón', '53': 'Demás fibras textiles vegetales', '54': 'Filamentos sintéticos o artificiales', '55': 'Fibras sintéticas o artificiales discontinuas', '56': 'Guatas, fieltros y cordelería', '57': 'Alfombras', '58': 'Tejidos especiales', '59': 'Tejidos impregnados o recubiertos', '60': 'Tejidos de punto', '61': 'Prendas de vestir de punto', '62': 'Prendas de vestir (no de punto)', '63': 'Demás artículos textiles confeccionados', '64': 'Calzado', '65': 'Sombreros', '66': 'Paraguas', '67': 'Plumas y flores artificiales', '68': 'Manufacturas de piedra, yeso y cemento', '69': 'Productos cerámicos', '70': 'Vidrio y sus manufacturas', '71': 'Perlas, piedras y metales preciosos', '72': 'Fundición, hierro y acero', '73': 'Manufacturas de hierro o acero', '74': 'Cobre y sus manufacturas', '75': 'Níquel y sus manufacturas', '76': 'Aluminio y sus manufacturas', '78': 'Plomo', '79': 'Cinc', '80': 'Estaño', '81': 'Demás metales comunes', '82': 'Herramientas y cuchillería', '83': 'Manufacturas diversas de metal común', '84': 'Máquinas y aparatos mecánicos', '85': 'Máquinas y aparatos eléctricos', '86': 'Vehículos y material para vías férreas', '87': 'Vehículos automóviles y tractores', '88': 'Aeronaves', '89': 'Barcos y embarcaciones', '90': 'Instrumentos ópticos, médicos y de medida', '91': 'Relojería', '92': 'Instrumentos musicales', '93': 'Armas y municiones', '94': 'Muebles', '95': 'Juguetes y artículos deportivos', '96': 'Manufacturas diversas', '97': 'Objetos de arte y antigüedades', '98': 'Operaciones especiales (98)', '99': 'Operaciones especiales (99)' };
const DIMMAP = Object.fromEntries(DIMS.map(d => [d.k, d]));
const FILT_DIMS = DIMS.filter(d => d.g && d.k !== 'mes');
const GROUPS = ['Origen', 'Destino', 'Producto', 'Logística', 'Operación'];
const MEAS = {
  fobUsd: { l: 'Valor FOB (USD)', s: 'FOB USD' },
  kg: { l: 'Peso neto (toneladas)', s: 'Peso neto' },
  cnt: { l: 'Series (registros)', s: 'Series' },
  fobCop: { l: 'Valor FOB (COP)', s: 'FOB COP' },
};
function compact(v) {
  const a = Math.abs(v);
  if (a >= 1e12) return nf2.format(v / 1e12) + ' B';
  if (a >= 1e9) return nf2.format(v / 1e9) + ' mil M';
  if (a >= 1e6) return nf1.format(v / 1e6) + ' M';
  if (a >= 1e4) return nf1.format(v / 1e3) + ' mil';
  return nf0.format(v);
}
function fm(m, v) {
  if (m === 'fobUsd') return 'US$ ' + compact(v);
  if (m === 'fobCop') return '$ ' + compact(v);
  if (m === 'kg') { const t = v / 1000; return (Math.abs(t) >= 1e4 ? compact(t) : nf1.format(t)) + ' t'; }
  return nf0.format(v);
}
function fmFull(m, v) {
  if (m === 'fobUsd') return 'US$ ' + nf0.format(v);
  if (m === 'fobCop') return '$ ' + nf0.format(v);
  if (m === 'kg') return nf0.format(v) + ' kg';
  return nf0.format(v);
}
const axisFmt = (m, v) => compact(m === 'kg' ? v / 1000 : v);
function fmtVal(k, v) {
  if (k === 'mes') return mesLabel(v);
  if (k === 'capitulo') return CAP[v] ? `${v} · ${CAP[v]}` : v;
  return v;
}
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];

/* ===== Estado ===== */
let chunks = [];
let G = null;
let R = null;
const S = {
  measure: 'fobUsd', tab: 'graficos', filters: {}, text: '', rng: {}, open: null, facetQ: {},
  gran: 'mes', stack: '', pie: { dim: 'exportador', type: 'pie', top: 5, rest: false, sort: 'measure', dir: 'desc', auto: false }, focus: { dim: '', id: null, q: '' }, colors: {}, pal: 'base', colorsOpen: false, theme: 'auto', moreOpen: false, wKind: 'kg', wUnit: 'kg', granSet: false, rank: { dim: 'pais', top: 25, byMonth: false }, reg: { sort: 'fobUsd', dir: -1, page: 0 },
};
let TIPS = [];

/* ===== Persistencia local (IndexedDB, opcional) ===== */
const idb = {
  db: null,
  async open() {
    if (this.db) return this.db;
    this.db = await new Promise((res, rej) => {
      const r = indexedDB.open('panel-exportaciones', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('chunks', { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return this.db;
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('chunks', mode); const st = t.objectStore('chunks');
      const rq = fn(st); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  put(c) { return this.tx('readwrite', s => s.put(c)); },
  del(id) { return this.tx('readwrite', s => s.delete(id)); },
  all() { return this.tx('readonly', s => s.getAll()); },
};

/* ===== Combinar archivos cargados ===== */
function merge() {
  const keep = {};
  if (G) for (const k in S.filters) keep[k] = [...S.filters[k]].map(i => G.dims[k].vals[i]);
  if (!chunks.length) { G = null; R = null; S.filters = {}; return; }
  const n = chunks.reduce((a, c) => a + c.n, 0);
  G = { n, dims: {}, nums: {}, fecha: new Uint32Array(n) };
  for (const k of DIM_KEYS) {
    const map = new Map(), vals = [], ids = new Uint32Array(n);
    let off = 0;
    for (const c of chunks) {
      const D = c.dims[k], remap = new Uint32Array(D.vals.length);
      for (let i = 0; i < D.vals.length; i++) {
        const v = D.vals[i]; let id = map.get(v);
        if (id === undefined) { id = vals.length; vals.push(v); map.set(v, id); }
        remap[i] = id;
      }
      for (let j = 0; j < c.n; j++) ids[off + j] = remap[D.ids[j]];
      off += c.n;
    }
    G.dims[k] = { vals, ids, map };
  }
  for (const k of NUM_KEYS) {
    const a = new Float64Array(n); let off = 0;
    for (const c of chunks) { a.set(c.nums[k], off); off += c.n; }
    G.nums[k] = a;
  }
  { let off = 0; for (const c of chunks) { G.fecha.set(c.fecha, off); off += c.n; } }
  // Meses ordenados y días
  const mv = G.dims.mes.vals;
  G.monthIds = mv.map((v, i) => i).sort((a, b) => mv[a] < mv[b] ? -1 : 1);
  G.monthRank = new Int16Array(mv.length); G.monthIds.forEach((id, r) => G.monthRank[id] = r);
  const days = [...new Set(G.fecha)].filter(x => x > 0).sort((a, b) => a - b);
  G.days = days; const dmap = new Map(days.map((d, i) => [d, i]));
  G.dayIdx = new Uint16Array(n);
  for (let i = 0; i < n; i++) { const d = G.fecha[i]; G.dayIdx[i] = d ? dmap.get(d) : 65535; }
  let tot = 0; for (let i = 0; i < n; i++) tot += G.nums.fobUsd[i];
  G.totFob = tot; G.dmin = days[0] || 0; G.dmax = days[days.length - 1] || 0;
  S.focus = { dim: S.focus.dim, id: null, q: '' };
  if (!S.granSet) S.gran = G.monthIds.length > 1 ? 'mes' : 'dia';
  // Restaurar filtros por valor
  S.filters = {};
  for (const k in keep) {
    const set = new Set(); keep[k].forEach(v => { const id = G.dims[k].map.get(v); if (id !== undefined) set.add(id); });
    if (set.size) S.filters[k] = set;
  }
}

/* ===== Filtrado y agregaciones ===== */
const TEXT_DIMS = ['exportador', 'destinatario', 'pais', 'subpartida', 'declarante', 'ciudad'];
function buildMask(skip) {
  const n = G.n, act = [];
  for (const k in S.filters) {
    if (k === skip || !S.filters[k].size) continue;
    const lk = new Uint8Array(G.dims[k].vals.length); S.filters[k].forEach(i => lk[i] = 1);
    act.push([G.dims[k].ids, lk]);
  }
  let txt = null;
  if (S.text && skip !== '_text') {
    const q = S.text.toLowerCase();
    txt = TEXT_DIMS.map(k => { const vs = G.dims[k].vals, lk = new Uint8Array(vs.length); let any = 0; for (let i = 0; i < vs.length; i++) if (vs[i].toLowerCase().includes(q)) { lk[i] = 1; any = 1; } return any ? [G.dims[k].ids, lk] : null; }).filter(Boolean);
  }
  const r = S.rng, f = G.nums.fobUsd, kg = G.nums[S.wKind] || G.nums.kg, fe = G.fecha;
  const fMin = r.fobMin ?? -Infinity, fMax = r.fobMax ?? Infinity, kMin = r.kgMin ?? -Infinity, kMax = r.kgMax ?? Infinity, dMin = r.dMin ?? 0, dMax = r.dMax ?? 99999999;
  const useR = r.fobMin != null || r.fobMax != null || r.kgMin != null || r.kgMax != null || r.dMin != null || r.dMax != null;
  const mask = new Uint8Array(n);
  outer: for (let i = 0; i < n; i++) {
    for (let a = 0; a < act.length; a++) if (!act[a][1][act[a][0][i]]) continue outer;
    if (useR) {
      const x = f[i], y = kg[i], d = fe[i];
      if (x < fMin || x > fMax || y < kMin || y > kMax || d < dMin || d > dMax) continue;
    }
    if (txt) {
      if (!txt.length) continue;
      let ok = false;
      for (let a = 0; a < txt.length; a++) if (txt[a][1][txt[a][0][i]]) { ok = true; break; }
      if (!ok) continue;
    }
    mask[i] = 1;
  }
  return mask;
}
function groupBy(dim, mask) {
  const cc = mask._c || (mask._c = {}); if (cc[dim]) return cc[dim];
  const D = G.dims[dim], m = D.vals.length, ids = D.ids, n = G.n;
  const fo = G.nums.fobUsd, co = G.nums.fobCop, kg = G.nums.kg;
  const a = { fobUsd: new Float64Array(m), fobCop: new Float64Array(m), kg: new Float64Array(m), cnt: new Float64Array(m) };
  for (let i = 0; i < n; i++) if (mask[i]) { const j = ids[i]; a.fobUsd[j] += fo[i]; a.fobCop[j] += co[i]; a.kg[j] += kg[i]; a.cnt[j]++; }
  cc[dim] = a;
  return a;
}
function topIds(a, measure, limit) {
  const out = []; for (let j = 0; j < a.cnt.length; j++) if (a.cnt[j] > 0) out.push(j);
  out.sort((x, y) => a[measure][y] - a[measure][x]);
  return limit ? out.slice(0, limit) : out;
}
function unique(dim, mask) {
  const D = G.dims[dim], seen = new Uint8Array(D.vals.length), ids = D.ids; let c = 0;
  for (let i = 0; i < G.n; i++) if (mask[i] && !seen[ids[i]]) { seen[ids[i]] = 1; c++; }
  return c;
}
function compute() {
  const mask = buildMask(null);
  R = { mask, cache: {}, ver: (R ? R.ver : 0) + 1, idx: null, sorted: null };
  let fob = 0, cop = 0, kg = 0, n = 0;
  const f = G.nums.fobUsd, c = G.nums.fobCop, k = G.nums.kg;
  for (let i = 0; i < G.n; i++) if (mask[i]) { fob += f[i]; cop += c[i]; kg += k[i]; n++; }
  R.k = { fob, cop, kg, n, decl: unique('formulario', mask), exp: unique('exportador', mask), pais: unique('pais', mask), sub: unique('subpartida', mask) };
}

/* ===== Cabecera y archivos ===== */
function renderTop() {
  const el = $('#files');
  el.innerHTML = chunks.map((c, i) => `<span class="fchip" title="${esc(c.name)}"><span>${esc(c.meses.slice().sort().map(m => mesLabel(m)).join(', '))}</span><i>${nf0.format(c.n)} filas</i><button data-rm="${i}" aria-label="Quitar ${esc(c.name)}">×</button></span>`).join('');
}

/* ===== Panel lateral ===== */
const PRIMARY = ['pais', 'exportador', 'subpartida', 'capitulo', 'aduana', 'modo', 'dpto'];
const accHTML = d => `<div class="acc" data-k="${d.k}"><button type="button" data-acc="${d.k}" aria-expanded="false"><span>${esc(d.l)}</span><span><span class="badge" hidden></span> <span class="car">›</span></span></button><div class="body"></div></div>`;
function buildSide() {
  const a = $('#side');
  if (!G) { a.innerHTML = ''; return; }
  let h = `<div class="side-head"><b>Filtros</b><button class="btn sm ghost" id="clearAll">Limpiar todo</button></div>
  <div class="block"><div class="field"><label for="q">Buscar texto</label><input type="search" id="q" placeholder="Exportador, destinatario, país, subpartida…" value="${esc(S.text)}"></div></div>
  <div class="sec">Periodo</div>
  <div class="block"><div class="mchips" id="mchips"></div>
    <div class="row2"><div class="field"><label for="dMin">Declaración desde</label><input type="date" id="dMin"></div><div class="field"><label for="dMax">hasta</label><input type="date" id="dMax"></div></div></div>
  <div class="sec">Filtros principales</div>`;
  for (const k of PRIMARY) h += accHTML(DIMMAP[k]);
  h += `<button type="button" class="btn more-btn" data-more="1">${S.moreOpen ? 'Ocultar filtros avanzados' : 'Más filtros y rangos'}</button><div id="moreBox" ${S.moreOpen ? '' : 'hidden'}>
  <div class="sec">Rangos de valor</div>
  <div class="block"><div class="row2"><div class="field"><label for="fobMin">FOB USD mín.</label><input type="number" id="fobMin" min="0" step="any" inputmode="decimal"></div><div class="field"><label for="fobMax">FOB USD máx.</label><input type="number" id="fobMax" min="0" step="any" inputmode="decimal"></div></div>
    <div class="field"><label for="wKind">Filtrar por peso</label><div class="row2"><select id="wKind"><option value="kg"${S.wKind === 'kg' ? ' selected' : ''}>Peso neto</option><option value="kgBruto"${S.wKind === 'kgBruto' ? ' selected' : ''}>Peso bruto</option></select><select id="wUnit"><option value="g"${S.wUnit === 'g' ? ' selected' : ''}>gramos (g)</option><option value="kg"${S.wUnit === 'kg' ? ' selected' : ''}>kilogramos (kg)</option><option value="t"${S.wUnit === 't' ? ' selected' : ''}>toneladas (t)</option></select></div></div>
    <div class="row2"><div class="field"><label for="kgMin">Peso mínimo</label><input type="number" id="kgMin" min="0" step="any" inputmode="decimal"></div><div class="field"><label for="kgMax">Peso máximo</label><input type="number" id="kgMax" min="0" step="any" inputmode="decimal"></div></div>
    <div class="note" style="padding:0">El archivo trae el peso en kilogramos (neto y bruto). No incluye peso fino ni pureza.</div></div>`;
  for (const g of GROUPS) {
    const ds = FILT_DIMS.filter(x => x.g === g && !PRIMARY.includes(x.k)); if (!ds.length) continue;
    h += `<div class="sec">${g}</div>` + ds.map(accHTML).join('');
  }
  h += '</div>';
  a.innerHTML = h;
  const d0 = ymd(G.dmin), d1 = ymd(G.dmax);
  $('#dMin').min = $('#dMax').min = d0; $('#dMin').max = $('#dMax').max = d1;
  syncInputs();
}
function updateSide() {
  if (!G) return;
  const mc = $('#mchips');
  if (mc) mc.innerHTML = G.monthIds.map(id => `<button type="button" class="mchip" data-m="${id}" aria-pressed="${!!(S.filters.mes && S.filters.mes.has(id))}">${esc(mesLabel(G.dims.mes.vals[id]))}</button>`).join('');
  document.querySelectorAll('.acc').forEach(acc => {
    const k = acc.dataset.k, b = acc.querySelector('.badge'), cnt = S.filters[k] ? S.filters[k].size : 0;
    b.hidden = !cnt; b.textContent = cnt;
    const open = S.open === k; acc.classList.toggle('open', open); acc.querySelector('button').setAttribute('aria-expanded', open);
    if (open) renderFacet(k, acc);
  });
}
function renderFacet(k, acc) {
  const body = acc.querySelector('.body');
  if (!body.firstChild) {
    body.innerHTML = `<input type="search" class="fq" id="fq-${k}" placeholder="Buscar en la lista…" value="${esc(S.facetQ[k] || '')}"><div class="mini"><button type="button" class="btn sm" data-act="vis">Marcar visibles</button><button type="button" class="btn sm" data-act="none">Ninguno</button></div><div class="opts"></div>`;
  }
  const mask = buildMask(k), a = groupBy(k, mask), q = (S.facetQ[k] || '').toLowerCase();
  const sel = S.filters[k] || new Set();
  let ids = topIds(a, 'fobUsd');
  sel.forEach(i => { if (!(a.cnt[i] > 0)) ids.push(i); });
  const all = ids.length;
  if (q) ids = ids.filter(i => fmtVal(k, G.dims[k].vals[i]).toLowerCase().includes(q));
  const shown = ids.slice(0, 300);
  const box = body.querySelector('.opts');
  box.innerHTML = shown.map(i => `<label class="opt${a.cnt[i] > 0 ? '' : ' zero'}"><input type="checkbox" data-id="${i}" ${sel.has(i) ? 'checked' : ''}><span class="t" title="${esc(fmtVal(k, G.dims[k].vals[i]))}">${esc(fmtVal(k, G.dims[k].vals[i]))}</span><span class="c">${a.cnt[i] > 0 ? compact(a.fobUsd[i]) : '0'}</span></label>`).join('')
    + (ids.length > 300 ? `<div class="note">Mostrando 300 de ${nf0.format(ids.length)}. Escribe para acotar la lista.</div>` : '') + (!ids.length ? `<div class="note">Sin coincidencias${all ? '' : ' con los otros filtros'}.</div>` : '');
  box._ids = ids;
}

/* ===== Filtros activos ===== */
function renderActive() {
  const parts = [];
  for (const k in S.filters) {
    const s = S.filters[k]; if (!s.size) continue;
    const names = [...s].map(i => fmtVal(k, G.dims[k].vals[i]));
    const txt = names.length <= 2 ? names.join(', ') : names.slice(0, 2).join(', ') + ` +${names.length - 2}`;
    parts.push(`<span class="fl"><b>${esc(DIMMAP[k].l)}:</b><span class="v" title="${esc(names.join(' | '))}">${esc(txt)}</span><button data-clr="${k}" aria-label="Quitar filtro ${esc(DIMMAP[k].l)}">×</button></span>`);
  }
  const r = S.rng;
  if (r.dMin != null || r.dMax != null) parts.push(`<span class="fl"><b>Fecha:</b><span class="v">${r.dMin ? ymd(r.dMin) : '…'} → ${r.dMax ? ymd(r.dMax) : '…'}</span><button data-clr="_d" aria-label="Quitar filtro de fecha">×</button></span>`);
  if (r.fobMin != null || r.fobMax != null) parts.push(`<span class="fl"><b>FOB USD:</b><span class="v">${r.fobMin != null ? nf0.format(r.fobMin) : '…'} → ${r.fobMax != null ? nf0.format(r.fobMax) : '…'}</span><button data-clr="_f" aria-label="Quitar filtro FOB">×</button></span>`);
  if (r.kgMin != null || r.kgMax != null) { const u = S.wUnit, f = x => x != null ? nf2.format(x / UNIT_F[u]) : '…'; parts.push(`<span class="fl"><b>${S.wKind === 'kg' ? 'Peso neto' : 'Peso bruto'}:</b><span class="v">${f(r.kgMin)} → ${f(r.kgMax)} ${u}</span><button data-clr="_k" aria-label="Quitar filtro de peso">×</button></span>`); }
  if (S.text) parts.push(`<span class="fl"><b>Texto:</b><span class="v">${esc(S.text)}</span><button data-clr="_t" aria-label="Quitar búsqueda">×</button></span>`);
  $('#active').innerHTML = parts.join('') + (parts.length ? '<button class="btn sm ghost" data-clr="_all">Limpiar todo</button>' : '');
}
function clearFilter(k) {
  if (k === '_all') { S.filters = {}; S.rng = {}; S.text = ''; }
  else if (k === '_d') { delete S.rng.dMin; delete S.rng.dMax; }
  else if (k === '_f') { delete S.rng.fobMin; delete S.rng.fobMax; }
  else if (k === '_k') { delete S.rng.kgMin; delete S.rng.kgMax; }
  else if (k === '_t') S.text = '';
  else delete S.filters[k];
  S.reg.page = 0;
  syncInputs(); schedule();
}
function syncInputs() {
  const set = (id, v) => { const e = $('#' + id); if (e) e.value = v; };
  const r = S.rng;
  set('q', S.text); set('dMin', r.dMin ? ymd(r.dMin) : ''); set('dMax', r.dMax ? ymd(r.dMax) : '');
  set('fobMin', r.fobMin ?? ''); set('fobMax', r.fobMax ?? ''); set('kgMin', r.kgMin != null ? +(r.kgMin / UNIT_F[S.wUnit]).toPrecision(12) : ''); set('kgMax', r.kgMax != null ? +(r.kgMax / UNIT_F[S.wUnit]).toPrecision(12) : '');
}
function setOnly(dim, id, add) {
  const s = S.filters[dim];
  if (add) { const n = new Set(s || []); n.has(id) ? n.delete(id) : n.add(id); if (n.size) S.filters[dim] = n; else delete S.filters[dim]; }
  else if (s && s.size === 1 && s.has(id)) delete S.filters[dim];
  else S.filters[dim] = new Set([id]);
  S.reg.page = 0; schedule();
}

/* ===== Componentes de gráfico ===== */
function barList(dim, n, opts = {}) {
  const a = groupBy(dim, R.mask), m = S.measure, ids = topIds(a, m, n);
  const tot = m === 'cnt' ? R.k.n : m === 'fobUsd' ? R.k.fob : m === 'fobCop' ? R.k.cop : R.k.kg;
  const max = ids.length ? a[m][ids[0]] : 1, sel = S.filters[dim] || new Set();
  if (!ids.length) return '<div class="note">Sin datos con los filtros actuales.</div>';
  return `<div class="bl">` + ids.map(i => {
    const name = fmtVal(dim, G.dims[dim].vals[i]), v = a[m][i];
    const tip = `<b>${esc(name)}</b><div class="r"><span>${MEAS[m].s}</span><span>${esc(fmFull(m, v))}</span></div><div class="r"><span>Participación</span><span>${tot ? nf1.format(v / tot * 100) : 0}%</span></div><div class="r"><span>Series</span><span>${nf0.format(a.cnt[i])}</span></div>`;
    return `<div class="br${sel.has(i) ? ' sel' : ''}" data-dim="${dim}" data-id="${i}" data-tip="${esc(tip)}"><span class="t">${esc(name)}</span><span class="tr"><span class="f" style="display:block;width:${Math.max(0.5, v / max * 100)}%"></span></span><span class="v">${fm(m, v)}</span></div>`;
  }).join('') + `</div>`;
}
function niceStep(x) { const e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; }
function timeChart() {
  const m = S.measure, mask = R.mask, n = G.n;
  const byMes = S.gran === 'mes';
  const B = byMes ? G.monthIds.length : G.days.length;
  const bk = byMes ? (() => { const ids = G.dims.mes.ids, rk = G.monthRank; return i => rk[ids[i]]; })() : (() => { const di = G.dayIdx; return i => di[i] === 65535 ? -1 : di[i]; })();
  let NS = 1, labels = ['Total'], lk = null;
  if (S.stack) {
    const a = groupBy(S.stack, mask), ids = topIds(a, m);
    const top = ids.slice(0, 5); NS = top.length + (ids.length > 5 ? 1 : 0);
    lk = new Uint8Array(G.dims[S.stack].vals.length).fill(5);
    top.forEach((id, r) => lk[id] = r);
    labels = top.map(id => fmtVal(S.stack, G.dims[S.stack].vals[id]));
    if (ids.length > 5) labels.push('Otros'); else lk = lk;
    if (ids.length <= 5) for (let i = 0; i < lk.length; i++) if (lk[i] === 5) lk[i] = 0;
    if (!top.length) { NS = 1; labels = ['Total']; lk = null; }
  }
  const vals = new Float64Array(B * NS), sids = S.stack && lk ? G.dims[S.stack].ids : null;
  const arr = m === 'cnt' ? null : G.nums[m];
  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue; const b = bk(i); if (b < 0) continue;
    vals[b * NS + (sids ? lk[sids[i]] : 0)] += arr ? arr[i] : 1;
  }
  const tot = new Float64Array(B); let max = 0;
  for (let b = 0; b < B; b++) { let t = 0; for (let s = 0; s < NS; s++) t += vals[b * NS + s]; tot[b] = t; if (t > max) max = t; }
  const box = $('#timeChart'); const W = Math.max(320, box.clientWidth || 700), H = 270, L = 54, Rr = 8, T = 10, Bt = 26;
  const step = niceStep((max || 1) / 4), top = Math.ceil((max || 1) / step) * step;
  const iw = W - L - Rr, ih = H - T - Bt, band = iw / Math.max(B, 1);
  const bw = Math.max(1.5, Math.min(byMes ? 56 : 30, band * (byMes ? 0.7 : 0.8)));
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución de ${MEAS[m].s} por ${byMes ? 'mes' : 'día'}">`;
  for (let t = 0; t <= top + 1e-9; t += step) {
    const y = T + ih - t / top * ih;
    svg += `<line x1="${L}" x2="${W - Rr}" y1="${y}" y2="${y}" stroke="var(--grid)" stroke-width="1"/><text x="${L - 6}" y="${y + 4}" text-anchor="end">${axisFmt(m, t)}</text>`;
  }
  TIPS = [];
  const every = Math.max(1, Math.ceil(B / Math.floor(iw / (byMes ? 52 : 34))));
  for (let b = 0; b < B; b++) {
    const cx = L + band * (b + 0.5), x0 = cx - bw / 2; let y = T + ih;
    for (let s = 0; s < NS; s++) {
      const v = vals[b * NS + s]; if (v <= 0) continue; const h = v / top * ih;
      svg += `<rect x="${x0}" y="${y - h}" width="${bw}" height="${Math.max(h - (NS > 1 ? 1 : 0), 0.5)}" fill="${NS === 1 ? 'var(--bar)' : (s === 5 || (labels[s] === 'Otros') ? 'var(--s-other)' : SERIES[s])}" rx="${bw > 6 ? 2 : 0}"/>`;
      y -= h;
    }
    const lab = byMes ? mesLabel(G.dims.mes.vals[G.monthIds[b]], true) : (G.days[b] % 100 === 1 || b === 0 ? MESES[Math.floor(G.days[b] / 100) % 100 - 1] + ' ' + (G.days[b] % 100) : String(G.days[b] % 100));
    if (b % every === 0) svg += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(lab)}</text>`;
    let tip = `<b>${esc(byMes ? mesLabel(G.dims.mes.vals[G.monthIds[b]]) : ymd(G.days[b]))}</b><div class="r"><span>Total</span><span>${esc(fmFull(m, tot[b]))}</span></div>`;
    if (NS > 1) for (let s = NS - 1; s >= 0; s--) { const v = vals[b * NS + s]; if (v > 0) tip += `<div class="r"><span><i class="sw" style="background:${labels[s] === 'Otros' ? 'var(--s-other)' : SERIES[s]}"></i>${esc(labels[s].slice(0, 28))}</span><span>${esc(fm(m, v))}</span></div>`; }
    TIPS.push(tip);
    svg += `<rect class="hit" x="${L + band * b}" y="${T}" width="${band}" height="${ih}" fill="transparent" data-ti="${b}"/>`;
  }
  svg += `<line x1="${L}" x2="${W - Rr}" y1="${T + ih}" y2="${T + ih}" stroke="var(--line)"/></svg>`;
  const legend = NS > 1 ? `<div class="legend">${labels.map((l, s) => `<span><i style="background:${l === 'Otros' ? 'var(--s-other)' : SERIES[s]}"></i>${esc(l)}</span>`).join('')}</div>` : '';
  box.innerHTML = legend + svg;
}

/* ===== Pestañas ===== */
function measureBar() {
  return `<div class="seg" role="group" aria-label="Medida">${Object.keys(MEAS).map(k => `<button type="button" data-meas="${k}" aria-pressed="${S.measure === k}">${MEAS[k].s}</button>`).join('')}</div>`;
}
function renderResumen() {
  const k = R.k, tf = G.totFob, pct = tf ? k.fob / tf * 100 : 0;
  const active = Object.keys(S.filters).length || S.text || Object.keys(S.rng).length;
  const kp = (l, v, d, main) => `<div class="kpi${main ? ' main' : ''}"><div class="l">${l}</div><div class="v" title="${esc(v)}">${v}</div><div class="d">${d || '&nbsp;'}</div></div>`;
  const stackOpts = '<option value="">Sin desglose</option>' + FILT_DIMS.filter(d => d.k !== 'nit' && d.k !== 'subpartida' && d.k !== 'destinatario' && d.k !== 'ciudad').map(d => `<option value="${d.k}"${S.stack === d.k ? ' selected' : ''}>${esc(d.l)}</option>`).join('');
  const cards = [['pais', 'País de destino'], ['capitulo', 'Producto (capítulo arancelario)'], ['exportador', 'Exportador'], ['dpto', 'Departamento de origen'], ['aduana', 'Aduana de despacho'], ['modo', 'Modo de transporte']];
  $('#view').innerHTML = `
  <div class="kpis">
    ${kp('Valor FOB (USD)', 'US$ ' + compact(k.fob), active ? nf1.format(pct) + '% del total cargado' : 'Total cargado', true)}
    ${kp('Valor FOB (COP)', '$ ' + compact(k.cop), nf0.format(k.cop / 1e6) + ' millones')}
    ${kp('Peso neto', fm('kg', k.kg), nf0.format(k.kg) + ' kg')}
    ${kp('FOB por kilo', k.kg ? 'US$ ' + nf2.format(k.fob / k.kg) : '—', 'promedio ponderado')}
    ${kp('Series', nf0.format(k.n), 'líneas de declaración')}
    ${kp('Declaraciones', nf0.format(k.decl), 'formularios distintos')}
    ${kp('Exportadores', nf0.format(k.exp), 'razones sociales')}
    ${kp('Países destino', nf0.format(k.pais), 'distintos')}
    ${kp('Subpartidas', nf0.format(k.sub), 'productos distintos')}
  </div>
  <div class="card">
    <div class="card-h"><div><h3>Evolución · ${MEAS[S.measure].l}</h3><div class="sub">${S.gran === 'mes' ? 'Por mes de proceso' : 'Por fecha de declaración de exportación'}</div></div>
      <div class="tl"><div class="seg" role="group" aria-label="Granularidad"><button type="button" data-gran="mes" aria-pressed="${S.gran === 'mes'}">Mensual</button><button type="button" data-gran="dia" aria-pressed="${S.gran === 'dia'}">Diario</button></div>
      <label class="tl"><small>Desglosar por</small><select id="stackSel">${stackOpts}</select></label></div></div>
    <div id="timeChart" class="chart"></div></div>
  <div class="grid2">${cards.map(([d, t]) => `<div class="card"><h3>Top 8 · ${t}</h3><div class="sub">${MEAS[S.measure].l} · clic para filtrar (Ctrl/⇧ para sumar)</div>${barList(d, 8)}</div>`).join('')}</div>`;
  timeChart();
}
function renderExplorar() {
  const d = S.rank.dim, m = S.measure, a = groupBy(d, R.mask);
  const ids = topIds(a, m, S.rank.top === 0 ? 0 : S.rank.top);
  const nM = G.monthIds.length, withM = S.rank.byMonth && nM > 1;
  const tot = m === 'cnt' ? R.k.n : m === 'fobUsd' ? R.k.fob : m === 'fobCop' ? R.k.cop : R.k.kg;
  let mm = null;
  if (withM) {
    const D = G.dims[d], dm = G.dims.mes.ids, rk = G.monthRank, mask = R.mask, arr = m === 'cnt' ? null : G.nums[m];
    mm = new Float64Array(D.vals.length * nM);
    for (let i = 0; i < G.n; i++) if (mask[i]) mm[D.ids[i] * nM + rk[dm[i]]] += arr ? arr[i] : 1;
  }
  const max = ids.length ? a[m][ids[0]] : 1, sel = S.filters[d] || new Set();
  const dimOpts = FILT_DIMS.map(x => `<option value="${x.k}"${x.k === d ? ' selected' : ''}>${esc(x.l)}</option>`).join('');
  const head = `<th>#</th><th>${esc(DIMMAP[d].l)}</th><th class="n">${MEAS[m].s}</th><th class="n">Part. %</th>` + (m !== 'fobUsd' ? '<th class="n">FOB USD</th>' : '') + (m !== 'kg' ? '<th class="n">Peso (t)</th>' : '') + (m !== 'cnt' ? '<th class="n">Series</th>' : '') + (withM ? G.monthIds.map(id => `<th class="n">${esc(mesLabel(G.dims.mes.vals[id], true))}</th>`).join('') : '');
  const rows = ids.map((i, r) => {
    const name = fmtVal(d, G.dims[d].vals[i]), v = a[m][i];
    return `<tr class="clk${sel.has(i) ? ' sel' : ''}" data-dim="${d}" data-id="${i}"><td class="n">${r + 1}</td><td class="wrap" title="${esc(name)}">${esc(name)}</td><td class="n">${esc(fm(m, v))}<span class="mini-bar" style="width:${Math.max(2, v / max * 60)}px"></span></td><td class="n">${tot ? nf1.format(v / tot * 100) : 0}%</td>`
      + (m !== 'fobUsd' ? `<td class="n">${esc(fm('fobUsd', a.fobUsd[i]))}</td>` : '') + (m !== 'kg' ? `<td class="n">${esc(fm('kg', a.kg[i]))}</td>` : '') + (m !== 'cnt' ? `<td class="n">${nf0.format(a.cnt[i])}</td>` : '')
      + (withM ? G.monthIds.map((_, b) => `<td class="n">${esc(fm(m, mm[i * nM + b]))}</td>`).join('') : '') + '</tr>';
  }).join('');
  const nAll = topIds(a, m).length;
  $('#view').innerHTML = `<div class="card"><div class="ctl">
    <div class="field"><label for="rkDim">Agrupar por</label><select id="rkDim">${dimOpts}</select></div>
    <div class="field" style="min-width:110px"><label for="rkTop">Mostrar</label><select id="rkTop">${[10, 25, 50, 100, 500].map(x => `<option value="${x}"${S.rank.top === x ? ' selected' : ''}>Top ${x}</option>`).join('')}</select></div>
    ${nM > 1 ? `<label class="tl" style="padding-bottom:7px"><input type="checkbox" id="rkMes" ${S.rank.byMonth ? 'checked' : ''}> Columnas por mes</label>` : ''}
    <button type="button" class="btn" id="copyTbl">Copiar tabla</button></div>
    <div class="sub">${nf0.format(nAll)} ${nAll === 1 ? 'valor distinto' : 'valores distintos'} con los filtros actuales. Ordenado por ${MEAS[m].l}. Clic en una fila para filtrar.</div>
    <div class="tw" style="max-height:640px"><table id="rkTbl"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
const REGCOLS = [{ k: '_fecha', l: 'Fecha' }, { k: 'exportador', l: 'Exportador' }, { k: 'pais', l: 'País destino' }, { k: 'subpartida', l: 'Subpartida' }, { k: 'aduana', l: 'Aduana' }, { k: 'modo', l: 'Transporte' }, { k: 'kg', l: 'Peso neto (kg)', n: 1 }, { k: 'fobUsd', l: 'FOB USD', n: 1 }];
function sortedIdx() {
  const { sort, dir } = S.reg;
  if (!R.idx) { const out = []; for (let i = 0; i < G.n; i++) if (R.mask[i]) out.push(i); R.idx = Uint32Array.from(out); }
  const ck = sort + dir; if (R.sortCk === ck) return R.sorted;
  let cmp;
  if (sort === '_fecha') { const f = G.fecha; cmp = (a, b) => (f[a] - f[b]) * dir; }
  else if (G.nums[sort]) { const f = G.nums[sort]; cmp = (a, b) => (f[a] - f[b]) * dir; }
  else {
    const D = G.dims[sort], ord = D.vals.map((v, i) => i).sort((x, y) => D.vals[x].localeCompare(D.vals[y], 'es')); const rk = new Uint32Array(D.vals.length); ord.forEach((id, r) => rk[id] = r);
    const ids = D.ids; cmp = (a, b) => (rk[ids[a]] - rk[ids[b]]) * dir;
  }
  R.sorted = R.idx.slice().sort(cmp); R.sortCk = ck; return R.sorted;
}
function renderRegistros() {
  const n = R.k.n, PS = 100, pages = Math.max(1, Math.ceil(n / PS)); S.reg.page = Math.min(S.reg.page, pages - 1);
  const idx = n ? sortedIdx() : [], p = S.reg.page, from = p * PS;
  const head = REGCOLS.map(c => `<th class="s${c.n ? ' n' : ''}" data-sort="${c.k}">${esc(c.l)}${S.reg.sort === c.k ? (S.reg.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('');
  let rows = '';
  for (let r = from; r < Math.min(n, from + PS); r++) {
    const i = idx[r], g = k => G.dims[k].vals[G.dims[k].ids[i]];
    rows += `<tr><td>${ymd(G.fecha[i])}</td><td class="wrap">${esc(g('exportador'))}</td><td>${esc(g('pais'))}</td><td title="${esc(CAP[g('capitulo')] || '')}">${esc(g('subpartida'))}</td><td>${esc(g('aduana'))}</td><td>${esc(g('modo'))}</td><td class="n">${nf0.format(G.nums.kg[i])}</td><td class="n">${nf2.format(G.nums.fobUsd[i])}</td></tr>`;
  }
  $('#view').innerHTML = `<div class="card"><div class="sub">${nf0.format(n)} registros con los filtros actuales. Clic en un encabezado para ordenar.</div>
    <div class="tw" style="max-height:680px"><table><thead><tr>${head}</tr></thead><tbody>${rows || '<tr><td colspan="8" class="note">Sin registros.</td></tr>'}</tbody></table></div>
    <div class="pager"><span>${n ? nf0.format(from + 1) : 0}–${nf0.format(Math.min(n, from + PS))} de ${nf0.format(n)}</span><button class="btn sm" data-pg="-1" ${p === 0 ? 'disabled' : ''}>Anterior</button><span>Página ${p + 1} de ${nf0.format(pages)}</span><button class="btn sm" data-pg="1" ${p >= pages - 1 ? 'disabled' : ''}>Siguiente</button></div></div>`;
}


/* ===== Render general ===== */
let pending = false;
function schedule() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; refresh(); }); }
function emptyState() {
  $('#view').innerHTML = `<div class="drop" id="dropzone"><h2>Carga tus archivos de exportaciones</h2>
    <p>Arrastra aquí los Excel (.xlsx) o usa el botón. Cada mes que cargues se suma a los anteriores. Si subes de nuevo un mes que ya existe, lo reemplaza.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button class="btn primary" type="button" data-pick>Elegir archivos</button><button class="btn" type="button" id="sampleBtn">Ver con datos de ejemplo</button></div>
    <div class="steps"><span>Los datos se procesan en tu navegador y no se envían a ningún servidor</span><span>Archivos grandes (100.000 filas) tardan unos segundos</span></div></div>`;
}
function activeCount() {
  const r = S.rng; let n = Object.keys(S.filters).length;
  if (S.text) n++; if (r.dMin != null || r.dMax != null) n++; if (r.fobMin != null || r.fobMax != null) n++; if (r.kgMin != null || r.kgMax != null) n++;
  return n;
}
function renderStatus() {
  const k = R.k, st = (l, v, big) => `<div class="stat${big ? ' big' : ''}"><span>${l}</span><b>${v}</b></div>`;
  $('#stats').innerHTML = st('Valor FOB', 'US$ ' + compact(k.fob), true) + st('Peso neto', fm('kg', k.kg)) + st('Series', nf0.format(k.n) + (k.n !== G.n ? ` <small style="font-size:13px;color:var(--ink-3)">de ${nf0.format(G.n)}</small>` : '')) + st('Declaraciones', nf0.format(k.decl)) + st('Exportadores', nf0.format(k.exp));
}
function refresh() {
  dispose3D();
  document.body.classList.toggle('empty', !G);
  renderTop();
  const sample = chunks.some(c => c.sample);
  $('#banner').innerHTML = sample ? `<div class="banner"><b>Datos de ejemplo ficticios.</b> Carga tus archivos .xlsx para reemplazarlos.<button class="btn sm primary" type="button" data-pick>Elegir archivos</button></div>` : '';
  if (!G) { $('#toolbar').hidden = true; $('#status').hidden = true; $('#active').innerHTML = ''; buildSide(); emptyState(); return; }
  $('#toolbar').hidden = false; $('#status').hidden = false;
  compute();
  if (!G._side) { G._side = 1; buildSide(); }
  renderActive(); renderStatus(); updateSide();
  const nf = activeCount(); $('#filtToggle').textContent = 'Filtros' + (nf ? ` (${nf})` : '');
  $('#measure').innerHTML = measureBar();
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === S.tab));
  if (S.tab === 'graficos') renderGraficos(); else if (S.tab === 'resumen') renderResumen(); else if (S.tab === 'explorar') renderExplorar(); else renderRegistros();
}

/* ===== Carga de archivos ===== */
function progress(show, text, f) {
  const o = $('#overlay'); o.hidden = !show;
  if (show) { $('#ptext').textContent = text; $('#pfill').style.width = Math.round((f || 0) * 100) + '%'; }
}
let toastT;
function toast(msg, ms = 4500) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', ms); }
function addChunk(c) {
  c.id = c.name + '|' + c.meses.slice().sort().join(',');
  const dup = chunks.filter(x => x.sample || x.meses.some(m => c.meses.includes(m)));
  dup.forEach(x => { chunks.splice(chunks.indexOf(x), 1); if (!x.sample) idb.del(x.id).catch(() => { }); });
  chunks.push(c);
  return dup.filter(x => !x.sample);
}
async function loadFiles(list) {
  const files = [...list]; const errs = []; let ok = 0, replaced = [];
  for (const f of files) {
    if (!/\.xls[xm]$/i.test(f.name)) { errs.push(`${f.name}: formato no compatible (usa .xlsx)`); continue; }
    try {
      progress(true, `Abriendo ${f.name}…`, 0.01);
      const buf = await f.arrayBuffer();
      const c = await parseXlsx(buf, (t, p) => progress(true, `${f.name} · ${t}`, p), f.name);
      replaced = replaced.concat(addChunk(c)); ok++;
      progress(true, 'Guardando en este navegador…', 0.99);
      try { await idb.put(c); } catch (e) { }
    } catch (e) { console.error(e); errs.push(`${f.name}: ${e.message || e}`); }
  }
  progress(false);
  progress(true, 'Combinando datos…', 1);
  await new Promise(r => setTimeout(r, 20));
  merge(); S.reg.page = 0;
  progress(false);
  refresh();
  const msgs = [];
  if (ok) msgs.push(`Se cargaron ${ok} archivo${ok > 1 ? 's' : ''}.`);
  if (replaced.length) msgs.push(`Reemplazó ${replaced.map(x => x.meses.map(m => mesLabel(m)).join(', ')).join('; ')}.`);
  if (errs.length) msgs.push('No se pudo leer: ' + errs.join(' | '));
  if (msgs.length) toast(msgs.join(' '), errs.length ? 9000 : 5000);
}

/* ===== Datos de ejemplo (ficticios) ===== */
function makeSample() {
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const pick = (a, w) => { if (!w) return a[Math.floor(rnd() * a.length)]; let t = rnd() * w.reduce((x, y) => x + y, 0); for (let i = 0; i < a.length; i++) { t -= w[i]; if (t <= 0) return a[i]; } return a[a.length - 1]; };
  const paises = ['Estados Unidos', 'Ecuador', 'Panamá', 'Países Bajos', 'Perú', 'México', 'España', 'Brasil', 'Chile', 'China', 'Japón', 'Alemania'];
  const pw = [30, 10, 8, 8, 6, 6, 5, 4, 4, 5, 3, 3];
  const prods = [['0901119000', 'kg', 'Terrestre'], ['2709000000', 'kg'], ['2701120000', 'kg'], ['0603110000', 'kg'], ['0803901100', 'kg'], ['7108120000', 'kg'], ['1801001900', 'kg'], ['1701999100', 'kg'], ['3304990000', 'U'], ['3923210000', 'kg']];
  const prw = [20, 22, 15, 12, 10, 8, 3, 4, 3, 3];
  const adu = [['Aduanas de Cartagena', 'CTG'], ['Aduanas de Barranquilla', 'BAQ'], ['Aduanas de Buenaventura', 'BUN'], ['Aduanas de Bogotá', 'BOG'], ['Impuestos y Aduanas de Santa Marta', 'SMR']];
  const dptos = ['ANTIOQUIA', 'BOGOTA DC', 'VALLE DEL CAUCA', 'ATLANTICO', 'CALDAS', 'CUNDINAMARCA', 'BOLIVAR', 'CESAR'];
  const modos = ['Marítimo', 'Aéreo', 'Terrestre (carretero)'];
  const exps = Array.from({ length: 60 }, (_, i) => `Exportadora Ejemplo ${String(i + 1).padStart(2, '0')} S.A.S.`);
  const out = [];
  for (const mes of ['202511', '202512', '202601']) {
    const b = new ChunkBuilder(), days = 28;
    for (let i = 0; i < 4500; i++) {
      const pr = pick(prods, prw), kg = Math.round(Math.exp(5 + rnd() * 6)), price = pr[0].startsWith('27') ? 0.55 : pr[0].startsWith('71') ? 60000 : pr[0].startsWith('09') ? 5.2 : 1 + rnd() * 3;
      const a = pick(adu), e = Math.floor(Math.pow(rnd(), 2) * exps.length);
      const mo = pr[0].startsWith('06') ? 'Aéreo' : pick(modos, [60, 15, 25]), p = pick(paises, pw);
      b.add({ mes, aduana: a[0], lugar: a[1], modo: mo, bandera: pick(['Panamá', 'Liberia', 'Colombia', 'Islas Marshall']), declarante: 'Agencia de Aduanas Ejemplo ' + (1 + Math.floor(rnd() * 12)),
        dpto: pick(dptos), proc: pick(dptos), exportador: exps[e], nit: String(900000000 + e * 137), pais: p, ciudad: 'Ciudad ' + (1 + Math.floor(rnd() * 20)), destinatario: 'Importadora ' + p.split(' ')[0] + ' ' + (1 + Math.floor(rnd() * 40)),
        capitulo: pr[0].slice(0, 2), partida: pr[0].slice(0, 4), subpartida: pr[0], unidad: pr[1] === 'U' ? 'Unidades o artículos' : 'Kilogramo', modalidad: 'Exportación definitiva de mercancías de fabricación o producción nacional',
        despacho: pick(['Inicial', 'Correción'], [95, 5]), embarque: 'Unico', tipoDatos: 'Definitivos al embarque', moneda: 'USD', pago: pick(['1', '2']), transito: 'NO', sisesp: 'NO', cert: pick(['1', '5', '8']),
        formulario: String(6000000000000 + Math.floor(i / 2)), fobUsd: kg * price, fobCop: kg * price * 4000, kg, kgBruto: kg * 1.02, fletes: 0, seguros: 0, otros: 0, agregado: 0, cant: kg,
        _fecha: +mes * 100 + 1 + Math.floor(rnd() * days) });
    }
    const c = b.finish('Ejemplo ' + mes); c.sample = true; c.id = 'sample' + mes; out.push(c);
  }
  return out;
}

/* ===== Eventos ===== */
function applyTheme(t) {
  S.theme = t; const r = document.documentElement;
  if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t);
  else if (S.hostTheme) r.setAttribute('data-theme', S.hostTheme); else r.removeAttribute('data-theme');
  try { localStorage.setItem('pe-theme', t); } catch (e) { }
  document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', b.dataset.themeSet === t));
  if (G && S.tab === 'graficos' && S.pie.type.endsWith('3d') && $('#pieChart')) drawChart({ panel: false });
}
function init() {
  const fileIn = $('#fileIn');
  S.hostTheme = document.documentElement.getAttribute('data-theme');
  loadColors();
  let th = 'auto'; try { th = localStorage.getItem('pe-theme') || 'auto'; } catch (e) { }
  applyTheme(th);
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(S.theme)); } catch (e) { }
  document.addEventListener('click', e => {
    if (!e.target.closest('.combo')) { const rr = $('#fcRes'); if (rr) rr.hidden = true; }
    const t = e.target.closest('button, [data-dim], th[data-sort], [data-pick]'); if (!t) return;
    if (t.dataset.themeSet) { applyTheme(t.dataset.themeSet); return; }
    if (t.dataset.more) { S.moreOpen = !S.moreOpen; $('#moreBox').hidden = !S.moreOpen; t.textContent = S.moreOpen ? 'Ocultar filtros avanzados' : 'Más filtros y rangos'; return; }
    if (t.dataset.dir) { S.pie.dir = S.pie.dir === 'desc' ? 'asc' : 'desc'; renderGraficos(); return; }
    if (t.dataset.cp) { if (t.dataset.cp === 'toggle') S.colorsOpen = !S.colorsOpen; else { S.colors = {}; saveColors(); } renderGraficos(); return; }
    if (t.dataset.fpick != null) { S.focus.id = +t.dataset.fpick; S.focus.q = ''; renderGraficos(); return; }
    if (t.dataset.fclear) { S.focus.id = null; renderGraficos(); return; }
    if (t.dataset.fglobal) { S.filters[S.focus.dim] = new Set([S.focus.id]); S.focus.id = null; schedule(); return; }
    if (t.dataset.c3) { if (t.dataset.c3 === 'auto') { S.pie.auto = !S.pie.auto; t.setAttribute('aria-pressed', S.pie.auto); } else if (T3) { if (t.dataset.c3 === 'reset') T3.reset(); else T3.zoom(t.dataset.c3 === 'in' ? 0.85 : 1.18); } return; }
    if (t.hasAttribute('data-pick')) { fileIn.click(); return; }
    if (t.id === 'sampleBtn') { chunks = makeSample(); merge(); refresh(); return; }
    if (t.dataset.rm != null) { const c = chunks[+t.dataset.rm]; chunks.splice(+t.dataset.rm, 1); if (!c.sample) idb.del(c.id).catch(() => { }); merge(); refresh(); return; }
    if (t.dataset.meas) { S.measure = t.dataset.meas; schedule(); return; }
    if (t.dataset.tab) { S.tab = t.dataset.tab; schedule(); return; }
    if (t.dataset.pt) { S.pie.type = t.dataset.pt; renderGraficos(); return; }
    if (t.dataset.gran) { S.gran = t.dataset.gran; S.granSet = true; schedule(); return; }
    if (t.dataset.clr) { clearFilter(t.dataset.clr); return; }
    if (t.id === 'clearAll') { clearFilter('_all'); return; }
    if (t.dataset.m != null) { setOnly('mes', +t.dataset.m, true); return; }
    if (t.dataset.acc) { S.open = S.open === t.dataset.acc ? null : t.dataset.acc; document.querySelectorAll('.acc .body').forEach(b => b.innerHTML = ''); updateSide(); return; }
    if (t.dataset.act) {
      const acc = t.closest('.acc'), k = acc.dataset.k, box = acc.querySelector('.opts');
      if (t.dataset.act === 'none') delete S.filters[k]; else S.filters[k] = new Set([...(S.filters[k] || []), ...(box._ids || []).slice(0, 300)]);
      schedule(); return;
    }
    if (t.dataset.sort) { if (S.reg.sort === t.dataset.sort) S.reg.dir *= -1; else { S.reg.sort = t.dataset.sort; S.reg.dir = -1; } S.reg.page = 0; schedule(); return; }
    if (t.dataset.pg) { S.reg.page += +t.dataset.pg; renderRegistros(); return; }
    if (t.id === 'filtToggle') { $('#side').classList.toggle('show'); return; }
    if (t.id === 'copyTbl') { copyTable(); return; }
    if (t.dataset.dim) { setOnly(t.dataset.dim, +t.dataset.id, e.ctrlKey || e.metaKey || e.shiftKey); return; }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t === fileIn) { if (t.files.length) loadFiles(t.files); t.value = ''; return; }
    if (t.matches('.opt input')) { const k = t.closest('.acc').dataset.k, id = +t.dataset.id; const s = new Set(S.filters[k] || []); t.checked ? s.add(id) : s.delete(id); if (s.size) S.filters[k] = s; else delete S.filters[k]; schedule(); return; }
    if (t.id === 'stackSel') { S.stack = t.value; schedule(); }
    else if (t.id === 'pieDim') { S.pie.dim = t.value; renderGraficos(); }
    else if (t.id === 'wUnit') { S.wUnit = t.value; syncInputs(); schedule(); }
    else if (t.id === 'wKind') { S.wKind = t.value; S.reg.page = 0; schedule(); }
    else if (t.id === 'pieSort') { S.pie.sort = t.value; S.pie.dir = t.value === 'name' ? 'asc' : 'desc'; renderGraficos(); }
    else if (t.id === 'fcDim') { S.focus = { dim: t.value, id: null, q: '' }; renderGraficos(); if (t.value) { const q = $('#fcQ'); q.focus(); renderFocusResults(); } }
    else if (t.id === 'palSel') { S.pal = t.value; S.colors = {}; saveColors(); renderGraficos(); }
    else if (t.id === 'pieTop') { S.pie.top = +t.value; renderGraficos(); }
    else if (t.id === 'pieRest') { S.pie.rest = t.checked; renderGraficos(); }
    else if (t.id === 'rkDim') { S.rank.dim = t.value; schedule(); }
    else if (t.id === 'rkTop') { S.rank.top = +t.value; schedule(); }
    else if (t.id === 'rkMes') { S.rank.byMonth = t.checked; schedule(); }
    else if (t.id === 'dMin' || t.id === 'dMax') { const v = t.value ? +t.value.replace(/-/g, '') : null; const key = t.id; if (v == null) delete S.rng[key]; else S.rng[key] = v; schedule(); }
  });
  let tm;
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'fcQ') { S.focus.q = t.value; renderFocusResults(); return; }
    if (t.dataset && t.dataset.ck) { S.colors[t.dataset.ck] = t.value; saveColors(); cancelAnimationFrame(S._cr); S._cr = requestAnimationFrame(() => drawChart({ panel: false })); return; }
    if (t.id === 'q') { clearTimeout(tm); tm = setTimeout(() => { S.text = t.value.trim(); S.reg.page = 0; schedule(); }, 250); }
    else if (t.classList.contains('fq')) { const k = t.closest('.acc').dataset.k; S.facetQ[k] = t.value; renderFacet(k, t.closest('.acc')); }
    else if (['fobMin', 'fobMax', 'kgMin', 'kgMax'].includes(t.id)) { clearTimeout(S['_t' + t.id]); S['_t' + t.id] = setTimeout(() => { if (t.value === '' || !isFinite(+t.value)) delete S.rng[t.id]; else S.rng[t.id] = (t.id.startsWith('kg') ? UNIT_F[S.wUnit] : 1) * +t.value; S.reg.page = 0; schedule(); }, 350); }
  });
  document.addEventListener('focusin', e => { if (e.target.id === 'fcQ') renderFocusResults(); });
  // Tooltip
  const tip = $('#tip');
  document.addEventListener('mousemove', e => {
    if (e.target.closest && e.target.closest('.c3d')) return;
    const el = e.target.closest && e.target.closest('[data-tip],[data-ti]');
    if (!el) { tip.style.display = 'none'; return; }
    tip.innerHTML = el.dataset.ti != null ? TIPS[+el.dataset.ti] : el.dataset.tip;
    tip.style.display = 'block';
    const w = tip.offsetWidth, h = tip.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + h > innerHeight - 8) y = e.clientY - h - 14;
    tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
  });
  document.addEventListener('mouseleave', () => tip.style.display = 'none');
  // Arrastrar y soltar
  let dc = 0;
  addEventListener('dragenter', e => { e.preventDefault(); dc++; document.body.classList.add('dragging'); });
  addEventListener('dragleave', () => { if (--dc <= 0) { dc = 0; document.body.classList.remove('dragging'); } });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => { e.preventDefault(); dc = 0; document.body.classList.remove('dragging'); if (e.dataTransfer.files.length) loadFiles(e.dataTransfer.files); });
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (G && S.tab === 'resumen' && $('#timeChart')) timeChart(); }, 150); });
  // Recuperar datos guardados
  (async () => {
    try {
      const saved = await idb.all();
      if (saved && saved.length) { chunks = saved.filter(c => c && c.dims); merge(); refresh(); toast(`Se recuperaron ${chunks.length} archivo${chunks.length > 1 ? 's' : ''} guardados en este navegador.`); }
    } catch (e) { }
  })();
  refresh();
}
function copyTable() {
  const t = $('#rkTbl'); if (!t) return;
  const tsv = [...t.rows].map(r => [...r.cells].map(c => c.textContent.trim()).join('\t')).join('\n');
  const fallback = () => { const ta = document.createElement('textarea'); ta.value = tsv; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Tabla copiada. Pégala en Excel.'); } catch (e) { toast('No se pudo copiar.'); } ta.remove(); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(tsv).then(() => toast('Tabla copiada. Pégala en Excel.'), fallback); else fallback();
}
window.__dash = { loadFiles, S, get G() { return G; }, get R() { return R; } };
init();

/* ===== Definición de columnas ===== */
const DIMS = [
  { k: 'mes', h: 'FECHA_PROCESO', l: 'Mes de proceso', g: 'Periodo' },
  { k: 'aduana', h: 'ADUANA_DESPACHO', l: 'Aduana de despacho', g: 'Logística' },
  { k: 'lugar', h: 'COD_LUG_SALIDA_ALF', l: 'Lugar de salida', g: 'Logística' },
  { k: 'modo', h: 'MODO_TRANSPORTE', l: 'Modo de transporte', g: 'Logística' },
  { k: 'bandera', h: 'NACIONALIDAD_BANDERA', l: 'Bandera del transporte', g: 'Logística' },
  { k: 'declarante', h: 'RAZON_SOCIAL_DECLARANTE', l: 'Declarante (agencia)', g: 'Logística' },
  { k: 'dpto', h: 'REGION_DE_ORIGEN', l: 'Departamento de origen', g: 'Origen' },
  { k: 'proc', h: 'REGION_PROCEDENCIA', l: 'Región de procedencia', g: 'Origen' },
  { k: 'exportador', h: 'RAZON_SOCIAL_EXPORTADOR', l: 'Exportador', g: 'Origen' },
  { k: 'nit', h: 'NIT_EXPORTADOR', l: 'NIT del exportador', g: 'Origen' },
  { k: 'pais', h: 'PAIS_DESTINO_FINAL', l: 'País de destino', g: 'Destino' },
  { k: 'ciudad', h: 'CIUDAD_DESTINATARIO', l: 'Ciudad del destinatario', g: 'Destino' },
  { k: 'destinatario', h: 'RAZON_SOCIAL_DESTINATARIO', l: 'Destinatario', g: 'Destino' },
  { k: 'capitulo', h: null, l: 'Capítulo arancelario', g: 'Producto' },
  { k: 'partida', h: null, l: 'Partida (4 dígitos)', g: 'Producto' },
  { k: 'subpartida', h: 'SUBPARTIDA', l: 'Subpartida arancelaria', g: 'Producto' },
  { k: 'unidad', h: 'UNIDAD_FISICA', l: 'Unidad física', g: 'Producto' },
  { k: 'modalidad', h: 'MODALIDAD_EXPORTACION', l: 'Modalidad de exportación', g: 'Operación' },
  { k: 'despacho', h: 'TIPO_DESPACHO', l: 'Tipo de despacho', g: 'Operación' },
  { k: 'embarque', h: 'TIPO_DE_EMBARQUE', l: 'Tipo de embarque', g: 'Operación' },
  { k: 'tipoDatos', h: 'TIPO_DE_DATOS', l: 'Tipo de datos', g: 'Operación' },
  { k: 'moneda', h: 'COD_MONEDA_TRANSACCION', l: 'Moneda de la transacción', g: 'Operación' },
  { k: 'pago', h: 'FORMA_PAGO', l: 'Forma de pago (cód.)', g: 'Operación' },
  { k: 'transito', h: 'EXPORTACION_EN_TRANSITO', l: 'Exportación en tránsito', g: 'Operación' },
  { k: 'sisesp', h: 'SISTEMAS_ESPECIALES', l: 'Sistemas especiales', g: 'Operación' },
  { k: 'cert', h: 'TIPO_CERTIFICADO_ORIGEN', l: 'Certificado de origen (cód.)', g: 'Operación' },
  { k: 'formulario', h: 'NUMERO_FORMULARIO', l: 'Formulario', g: null },
];
const NUMS = [
  { k: 'fobUsd', h: 'VALOR_FOB_USD' },
  { k: 'fobCop', h: 'VALOR_FOB_PESOS' },
  { k: 'kg', h: 'PESO_NETO_KGS' },
  { k: 'kgBruto', h: 'PESO_BRUTO_KGS' },
  { k: 'fletes', h: 'VALOR_SERIE_FLETES_USD' },
  { k: 'seguros', h: 'VALOR_SERIE_SEGUROS_USD' },
  { k: 'otros', h: 'VLR_SERIE_OTROS_GASTOS_USD' },
  { k: 'agregado', h: 'VLR_SERIE_AGREGADO_NAL_USD' },
  { k: 'cant', h: 'CANTIDAD_UNIDADES_FISICAS' },
];
const FECHA_H = 'FECHA_DECLARACION_EXPORTACION';
const DIM_KEYS = DIMS.map(d => d.k);
const NUM_KEYS = NUMS.map(d => d.k);
const NODATA = '(sin dato)';

class ChunkBuilder {
  constructor() {
    this.d = {}; this.nums = {}; this.fecha = []; this.n = 0;
    for (const k of DIM_KEYS) this.d[k] = { map: new Map(), vals: [], ids: [] };
    for (const k of NUM_KEYS) this.nums[k] = [];
  }
  add(r) {
    for (let i = 0; i < DIM_KEYS.length; i++) {
      const k = DIM_KEYS[i], D = this.d[k];
      let v = r[k];
      v = (v == null || v === '') ? NODATA : String(v).trim();
      if (v === '') v = NODATA;
      let id = D.map.get(v);
      if (id === undefined) { id = D.vals.length; D.vals.push(v); D.map.set(v, id); }
      D.ids.push(id);
    }
    for (let i = 0; i < NUM_KEYS.length; i++) {
      const k = NUM_KEYS[i];
      const x = parseFloat(r[k]);
      this.nums[k].push(isFinite(x) ? x : 0);
    }
    this.fecha.push(r._fecha || 0);
    this.n++;
  }
  finish(name) {
    const dims = {}, nums = {};
    for (const k of DIM_KEYS) dims[k] = { vals: this.d[k].vals, ids: Uint32Array.from(this.d[k].ids) };
    for (const k of NUM_KEYS) nums[k] = Float64Array.from(this.nums[k]);
    return { name, n: this.n, dims, nums, fecha: Uint32Array.from(this.fecha), meses: dims.mes.vals.slice() };
  }
}

function colIdx(s) { let n = 0; for (let i = 0; i < s.length; i++) n = n * 26 + s.charCodeAt(i) - 64; return n - 1; }
function unesc(s) {
  if (s.indexOf('&') < 0) return s;
  return s.replace(/&(lt|gt|quot|apos|amp|#(\d+)|#x([0-9a-fA-F]+));/g, (m, a, d, h) =>
    a === 'lt' ? '<' : a === 'gt' ? '>' : a === 'quot' ? '"' : a === 'apos' ? "'" : a === 'amp' ? '&' : String.fromCodePoint(d ? +d : parseInt(h, 16)));
}
function toYMD(v) {
  if (v == null || v === '') return 0;
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return +m[1] * 10000 + +m[2] * 100 + +m[3];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
  if (m) return +m[3] * 10000 + +m[2] * 100 + +m[1];
  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  if (n >= 19000101 && n <= 29991231) return Math.round(n);
  if (n > 20000 && n < 90000) {
    const d = new Date(Math.round((n - 25569) * 86400000));
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  }
  return 0;
}
const tick = () => new Promise(r => setTimeout(r, 0));

async function parseXlsx(buf, onProg, name) {
  onProg && onProg('Descomprimiendo archivo…', 0.02);
  await tick();
  let sheetName = null;
  const files = fflate.unzipSync(new Uint8Array(buf), {
    filter: f => {
      if (f.name === 'xl/sharedStrings.xml') return true;
      if (/^xl\/worksheets\/sheet\d+\.xml$/.test(f.name) && sheetName === null) { sheetName = f.name; return true; }
      return false;
    }
  });
  if (!sheetName) throw new Error('El archivo no tiene hojas de cálculo legibles.');
  onProg && onProg('Leyendo textos compartidos…', 0.1);
  await tick();
  const sst = [];
  if (files['xl/sharedStrings.xml']) {
    const t = new TextDecoder().decode(files['xl/sharedStrings.xml']);
    const re = /<si>([\s\S]*?)<\/si>|<si\/>/g; let m;
    while ((m = re.exec(t))) {
      if (m[1] === undefined) { sst.push(''); continue; }
      const body = m[1]; let s = '';
      if (body.indexOf('<r>') < 0) {
        const a = body.indexOf('>', body.indexOf('<t')), b = body.lastIndexOf('</t>');
        s = (a >= 0 && b > a) ? body.slice(a + 1, b) : '';
      } else {
        const tr = /<t[^>]*>([\s\S]*?)<\/t>/g; let x;
        while ((x = tr.exec(body))) s += x[1];
      }
      sst.push(unesc(s));
    }
  }
  const u8 = files[sheetName];
  const dec = new TextDecoder();
  const CH = 3 * 1024 * 1024;
  const rowRe = /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g;
  const cellRe = /<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  const builder = new ChunkBuilder();
  let target = null;           // colIdx -> {key, kind}
  let headerDone = false;
  const wantDim = new Map(), wantNum = new Map();
  for (const d of DIMS) if (d.h) wantDim.set(d.h, d.k);
  for (const d of NUMS) wantNum.set(d.h, d.k);
  let pos = 0, carry = '', lastProg = 0;

  const cellVal = (attrs, inner) => {
    if (inner === undefined) return null;
    const isS = attrs.indexOf('t="s"') >= 0;
    let i = inner.indexOf('<v>');
    if (i >= 0) {
      const j = inner.indexOf('</v>', i);
      const v = inner.slice(i + 3, j);
      if (isS) return sst[+v];
      if (attrs.indexOf('t="str"') >= 0) return unesc(v);
      return v;
    }
    if (attrs.indexOf('inlineStr') >= 0) {
      const a = inner.indexOf('<t'); if (a < 0) return null;
      const b = inner.indexOf('>', a), c = inner.indexOf('</t>', b);
      return unesc(inner.slice(b + 1, c));
    }
    return null;
  };

  while (pos < u8.length) {
    const end = Math.min(pos + CH, u8.length);
    const last = end >= u8.length;
    let text = carry + dec.decode(u8.subarray(pos, end), { stream: !last });
    pos = end;
    if (!last) {
      const cut = text.lastIndexOf('</row>');
      if (cut < 0) { carry = text; continue; }
      carry = text.slice(cut + 6); text = text.slice(0, cut + 6);
    } else carry = '';
    rowRe.lastIndex = 0;
    let rm;
    while ((rm = rowRe.exec(text))) {
      const body = rm[1];
      if (!body) continue;
      cellRe.lastIndex = 0;
      let cm;
      if (!headerDone) {
        target = new Map();
        while ((cm = cellRe.exec(body))) {
          const h = String(cellVal(cm[2], cm[3]) || '').trim().toUpperCase();
          const c = colIdx(cm[1]);
          if (wantDim.has(h)) target.set(c, { k: wantDim.get(h), t: 'd' });
          else if (wantNum.has(h)) target.set(c, { k: wantNum.get(h), t: 'n' });
          else if (h === FECHA_H) target.set(c, { k: '_fecha', t: 'f' });
        }
        if (target.size < 3) { target = null; continue; }
        headerDone = true;
        continue;
      }
      const r = {};
      while ((cm = cellRe.exec(body))) {
        const tg = target.get(colIdx(cm[1]));
        if (tg === undefined) continue;
        const v = cellVal(cm[2], cm[3]);
        if (v == null) continue;
        r[tg.k] = tg.t === 'f' ? toYMD(v) : v;
      }
      if (r._fecha === undefined) r._fecha = 0;
      if (r.mes != null && r.mes !== '') { const n = parseFloat(r.mes); if (isFinite(n)) r.mes = String(Math.round(n)); }
      else if (r._fecha) r.mes = String(Math.floor(r._fecha / 100));
      if (r.subpartida != null) {
        let s = String(r.subpartida).replace(/\D/g, '');
        if (s.length && s.length < 10) s = s.padStart(10, '0');
        r.subpartida = s; r.capitulo = s.slice(0, 2); r.partida = s.slice(0, 4);
      }
      if (r.pais == null && r.fobUsd == null && r.exportador == null) continue;
      builder.add(r);
    }
    const f = pos / u8.length;
    if (f - lastProg > 0.02 || last) {
      lastProg = f;
      onProg && onProg(`Leyendo filas… ${builder.n.toLocaleString('es-CO')}`, 0.12 + f * 0.86);
      await tick();
    }
  }
  if (!headerDone) throw new Error('No se encontraron los encabezados esperados (fila 1).');
  if (builder.n === 0) throw new Error('El archivo no tiene filas de datos.');
  return builder.finish(name);
}

if (typeof module !== 'undefined') module.exports = { parseXlsx, DIMS, NUMS, DIM_KEYS, NUM_KEYS, ChunkBuilder, NODATA };

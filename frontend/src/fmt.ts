/**
 * Utilidades de formato numérico y de fecha.
 * Traducción directa de las funciones en app.js.
 */
export const nf0 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
export const nf1 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
export const nf2 = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });
// Decimales fijos para tablas: "14,0 %" y "US$ 133.923,20" alinean con el resto
export const nf1f = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const nf2f = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function mesLabel(v: string | number, short = false): string {
  const s = String(v);
  if (!/^\d{6}$/.test(s)) return s;
  return MESES[+s.slice(4) - 1] + ' ' + (short ? s.slice(2, 4) : s.slice(0, 4));
}

export function ymd(n: number): string {
  if (!n) return '—';
  const s = String(n);
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
}

export function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e12) return nf2.format(v / 1e12) + ' B';
  if (a >= 1e9)  return nf2.format(v / 1e9)  + ' mil M';
  if (a >= 1e6)  return nf1.format(v / 1e6)  + ' M';
  if (a >= 1e4)  return nf1.format(v / 1e3)  + ' mil';
  return nf0.format(v);
}

export function fm(measure: string, v: number): string {
  if (measure === 'fobUsd' || measure === 'fob_usd') return 'US$ ' + compact(v);
  if (measure === 'fobCop' || measure === 'fob_cop') return '$ '   + compact(v);
  if (measure === 'kg' || measure === 'kg_neto') {
    // Menos de 1 t en kg: con toneladas, 15 kg de oro (US$ 1,6 M) se veía "0 t"
    if (Math.abs(v) < 1000) return nf1.format(v) + ' kg';
    const t = v / 1000;
    return (Math.abs(t) >= 1e4 ? compact(t) : nf1.format(t)) + ' t';
  }
  return nf0.format(v);
}

/**
 * Etiqueta de un eje cuya marca más alta es `top`. El peso va en t si la
 * escala llega a 10 t y en kg si no; con escalas pequeñas lleva decimales
 * (compact() redondea a entero y 0,5 kg se vería "1").
 */
export function axisFmt(measure: string, v: number, top: number): string {
  if (measure === 'kg' || measure === 'kg_neto') {
    if (top >= 1e4) return compact(v / 1000) + ' t';
    return (top < 10 ? nf2.format(v) : compact(v)) + ' kg';
  }
  return top < 10 ? nf2.format(v) : compact(v);
}

export function fmFull(measure: string, v: number): string {
  if (measure === 'fobUsd' || measure === 'fob_usd') return 'US$ ' + nf0.format(v);
  if (measure === 'fobCop' || measure === 'fob_cop') return '$ '   + nf0.format(v);
  if (measure === 'kg' || measure === 'kg_neto')     return nf0.format(v) + ' kg';
  return nf0.format(v);
}

// Nombres de capítulo arancelario (mismo objeto CAP de app.js)
export const CAP: Record<string, string> = {
  '01':'Animales vivos','02':'Carnes y despojos comestibles','03':'Pescados y crustáceos',
  '04':'Lácteos, huevos y miel','05':'Demás productos de origen animal','06':'Plantas vivas y flores',
  '07':'Hortalizas','08':'Frutas y frutos comestibles','09':'Café, té, yerba mate y especias',
  '10':'Cereales','11':'Productos de molinería','12':'Semillas y frutos oleaginosos',
  '13':'Gomas, resinas y extractos vegetales','14':'Materias trenzables vegetales',
  '15':'Grasas y aceites','16':'Preparaciones de carne y pescado',
  '17':'Azúcares y confitería','18':'Cacao y sus preparaciones',
  '19':'Preparaciones de cereales y pastelería','20':'Preparaciones de hortalizas y frutas',
  '21':'Preparaciones alimenticias diversas','22':'Bebidas y líquidos alcohólicos',
  '23':'Residuos de industrias alimentarias','24':'Tabaco',
  '25':'Sal, azufre, tierras, piedras y cementos','26':'Minerales, escorias y cenizas',
  '27':'Combustibles minerales, petróleo y carbón','28':'Productos químicos inorgánicos',
  '29':'Productos químicos orgánicos','30':'Productos farmacéuticos','31':'Abonos',
  '32':'Taninos, tintes y pinturas','33':'Perfumería y cosméticos','34':'Jabones y ceras',
  '35':'Materias albuminoideas y colas','36':'Pólvoras y explosivos',
  '37':'Productos fotográficos','38':'Productos diversos de la industria química',
  '39':'Plásticos y sus manufacturas','40':'Caucho y sus manufacturas',
  '41':'Pieles y cueros','42':'Manufacturas de cuero','43':'Peletería',
  '44':'Madera y sus manufacturas','45':'Corcho','46':'Espartería y cestería',
  '47':'Pasta de madera','48':'Papel y cartón','49':'Libros e impresos',
  '50':'Seda','51':'Lana y pelo fino','52':'Algodón',
  '53':'Demás fibras textiles vegetales','54':'Filamentos sintéticos o artificiales',
  '55':'Fibras sintéticas o artificiales discontinuas','56':'Guatas, fieltros y cordelería',
  '57':'Alfombras','58':'Tejidos especiales','59':'Tejidos impregnados o recubiertos',
  '60':'Tejidos de punto','61':'Prendas de vestir de punto','62':'Prendas de vestir (no de punto)',
  '63':'Demás artículos textiles confeccionados','64':'Calzado','65':'Sombreros',
  '66':'Paraguas','67':'Plumas y flores artificiales',
  '68':'Manufacturas de piedra, yeso y cemento','69':'Productos cerámicos',
  '70':'Vidrio y sus manufacturas','71':'Perlas, piedras y metales preciosos',
  '72':'Fundición, hierro y acero','73':'Manufacturas de hierro o acero',
  '74':'Cobre y sus manufacturas','75':'Níquel y sus manufacturas',
  '76':'Aluminio y sus manufacturas','78':'Plomo','79':'Cinc','80':'Estaño',
  '81':'Demás metales comunes','82':'Herramientas y cuchillería',
  '83':'Manufacturas diversas de metal común','84':'Máquinas y aparatos mecánicos',
  '85':'Máquinas y aparatos eléctricos','86':'Vehículos y material para vías férreas',
  '87':'Vehículos automóviles y tractores','88':'Aeronaves','89':'Barcos y embarcaciones',
  '90':'Instrumentos ópticos, médicos y de medida','91':'Relojería',
  '92':'Instrumentos musicales','93':'Armas y municiones','94':'Muebles',
  '95':'Juguetes y artículos deportivos','96':'Manufacturas diversas',
  '97':'Objetos de arte y antigüedades','98':'Operaciones especiales (98)',
  '99':'Operaciones especiales (99)',
};

export function fmtDim(key: string, val: string): string {
  if (key === 'mes') return mesLabel(val);
  if (key === 'capitulo') return CAP[val] ? `${val} · ${CAP[val]}` : val;
  return val;
}

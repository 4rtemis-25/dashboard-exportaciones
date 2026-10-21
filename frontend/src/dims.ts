/**
 * Definición de dimensiones y medidas — espejo de DIMS/NUMS en parser.js.
 */
export interface DimDef {
  k: string;   // clave interna
  l: string;   // label legible
  g: string | null;  // grupo (Origen, Destino, Producto, Logística, Operación)
}

export const DIMS: DimDef[] = [
  { k: 'mes',         l: 'Mes de proceso',           g: 'Periodo' },
  { k: 'aduana',      l: 'Aduana de despacho',        g: 'Logística' },
  { k: 'lugar',       l: 'Lugar de salida',           g: 'Logística' },
  { k: 'modo',        l: 'Modo de transporte',        g: 'Logística' },
  { k: 'bandera',     l: 'Bandera del transporte',    g: 'Logística' },
  { k: 'declarante',  l: 'Declarante (agencia)',      g: 'Logística' },
  { k: 'dpto',        l: 'Departamento de origen',    g: 'Origen' },
  { k: 'proc',        l: 'Región de procedencia',     g: 'Origen' },
  { k: 'exportador',  l: 'Exportador',                g: 'Origen' },
  { k: 'nit',         l: 'NIT del exportador',        g: 'Origen' },
  { k: 'pais',        l: 'País de destino',           g: 'Destino' },
  { k: 'ciudad',      l: 'Ciudad del destinatario',   g: 'Destino' },
  { k: 'destinatario',l: 'Destinatario',              g: 'Destino' },
  { k: 'capitulo',    l: 'Capítulo arancelario',      g: 'Producto' },
  { k: 'partida',     l: 'Partida (4 dígitos)',        g: 'Producto' },
  { k: 'subpartida',  l: 'Subpartida arancelaria',    g: 'Producto' },
  { k: 'unidad',      l: 'Unidad física',             g: 'Producto' },
  { k: 'modalidad',   l: 'Modalidad de exportación',  g: 'Operación' },
  { k: 'despacho',    l: 'Tipo de despacho',          g: 'Operación' },
  { k: 'embarque',    l: 'Tipo de embarque',          g: 'Operación' },
  { k: 'tipo_datos',  l: 'Tipo de datos',             g: 'Operación' },
  { k: 'moneda',      l: 'Moneda de la transacción',  g: 'Operación' },
  { k: 'pago',        l: 'Forma de pago (cód.)',      g: 'Operación' },
  { k: 'transito',    l: 'Exportación en tránsito',   g: 'Operación' },
  { k: 'sisesp',      l: 'Sistemas especiales',       g: 'Operación' },
  { k: 'cert',        l: 'Certificado de origen (cód.)', g: 'Operación' },
  { k: 'formulario',  l: 'Formulario',                g: null },
];

export const DIMMAP = Object.fromEntries(DIMS.map(d => [d.k, d]));

// Dimensiones que aparecen en filtros de barra lateral
export const FILT_DIMS = DIMS.filter(d => d.g && d.k !== 'mes');

export const GROUPS = ['Origen', 'Destino', 'Producto', 'Logística', 'Operación'];

// Dimensiones que aparecen primero en la barra lateral
export const PRIMARY = ['pais', 'exportador', 'subpartida', 'capitulo', 'aduana', 'modo', 'dpto'];

export interface MeasDef { l: string; s: string; apiKey: string; }
export const MEAS: Record<string, MeasDef> = {
  fobUsd: { l: 'Valor FOB (USD)',       s: 'FOB USD',   apiKey: 'fob_usd' },
  kg:     { l: 'Peso neto (toneladas)', s: 'Peso neto', apiKey: 'kg'      },
  cnt:    { l: 'Series (registros)',    s: 'Series',    apiKey: 'cnt'     },
  fobCop: { l: 'Valor FOB (COP)',       s: 'FOB COP',   apiKey: 'fob_cop' },
};

/**
 * Cliente HTTP para el backend FastAPI.
 * Todos los tipos reflejan exactamente lo que retorna query.py.
 */

// ── Tipos ──────────────────────────────────────────────────────────────────
// Un archivo cargado; `month` es su mes principal (el de más filas)
export interface MonthInfo {
  month: string;    // "202601"
  months: string[]; // FECHA_PROCESO presentes en el archivo
  n: number;
  fob: number;
  kg: number;
}

export interface UploadResult {
  path: string;
  month: string;
  replaced: boolean;
  months: string[];
  rows_by_month: Record<string, number>;
  missing_columns: string[];
  n: number;
  fob_usd: number;
  kg_neto: number;
  formularios: number;
  exportadores: number;
  paises: number;
  subpartidas: number;
  aduanas: number;
}

export interface Summary {
  n: number;
  fob: number;
  cop: number;
  kg: number;
  formularios: number;
  exportadores: number;
  paises: number;
  subpartidas: number;
  aduanas: number;
}

export interface GroupRow {
  key: string;
  fob_usd: number;
  fob_cop: number;
  kg: number;
  cnt: number;
  n_keys: number;  // valores distintos de la dimensión antes del límite
}

// Medidas por las que el backend puede ordenar (VALID_MEASURES en query.py)
export type GroupMeasure = 'fob_usd' | 'fob_cop' | 'kg' | 'cnt';

export interface RecordRow {
  fecha: number;
  exportador: string;
  pais: string;
  subpartida: string;
  aduana: string;
  modo: string;
  kg_neto: number;
  fob_usd: number;
}

export interface RecordsResult {
  total: number;
  rows: RecordRow[];
}

export interface TimePoint {
  period: string | number;
  fob_usd: number;
  fob_cop: number;
  kg: number;
  cnt: number;
  stack_key?: string;
}

// ── Parámetros de filtro (espejo de FilterBody en main.py) ────────────────
export interface FilterParams {
  months?: string[] | null;
  filters?: Record<string, string[]>;
  date_min?: number | null;
  date_max?: number | null;
  fob_min?: number | null;
  fob_max?: number | null;
  kg_min?: number | null;
  kg_max?: number | null;
  kg_kind?: 'kg_neto' | 'kg_bruto';
  text?: string | null;
}

export interface GroupParams extends FilterParams {
  dim: string;
  measure?: GroupMeasure;
  limit?: number;
  q?: string | null;  // búsqueda dentro de los valores de `dim`
}

export interface RecordsParams extends FilterParams {
  sort?: string;
  direction?: 1 | -1;
  page?: number;
  page_size?: number;
}

// Columnas de valor de Explorar (EXTRA_MEASURES en query.py)
export type ExtraMeasure = 'fob_usd' | 'fob_cop' | 'kg' | 'kg_bruto' | 'cnt'
                         | 'formularios' | 'fob_kg' | 'fletes' | 'seguros';

export interface ColumnsParams extends FilterParams {
  dim: string;
  keys: string[];                 // filas ya rankeadas; el orden no cambia
  measures?: ExtraMeasure[];
  related?: string[];             // dimensiones relacionadas
  related_measure?: GroupMeasure; // ordena los valores relacionados
  related_top?: number;
}

export interface RelatedCell {
  n: number;                          // valores distintos (sin "(sin dato)")
  top: [string, number, number][];    // [valor, medida, participación 0–1]
}

export type ColumnsResult = Record<string, {
  m: Partial<Record<ExtraMeasure, number | null>>;
  r: Record<string, RelatedCell>;
}>;

export interface TimeParams extends FilterParams {
  granularity?: 'mes' | 'dia';
  stack_dim?: string | null;
}

// ── Funciones de llamada ───────────────────────────────────────────────────
async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? res.statusText);
  }
  return res.json();
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export const api = {
  months: {
    list: () => get<MonthInfo[]>('/api/months'),
    upload: (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return fetch('/api/months/upload', { method: 'POST', body: fd })
        .then(r => r.ok ? r.json() as Promise<UploadResult> : r.json().then(e => { throw new Error(e.detail); }));
    },
    delete: (month: string) =>
      fetch(`/api/months/${encodeURIComponent(month)}`, { method: 'DELETE' })
        .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.detail); })),
  },

  query: {
    summary: (p: FilterParams)  => post<Summary>('/api/query/summary', p),
    group:   (p: GroupParams)   => post<GroupRow[]>('/api/query/group', p),
    records: (p: RecordsParams) => post<RecordsResult>('/api/query/records', p),
    time:    (p: TimeParams)    => post<TimePoint[]>('/api/query/timeseries', p),
    columns: (p: ColumnsParams) => post<ColumnsResult>('/api/query/columns', p),
  },
};

/**
 * Cliente HTTP para el backend FastAPI.
 * Todos los tipos reflejan exactamente lo que retorna query.py.
 */

// ── Tipos ──────────────────────────────────────────────────────────────────
export interface MonthInfo {
  month: string;   // "202601"
  n: number;
  fob: number;
  kg: number;
}

export interface UploadResult {
  path: string;
  months: string[];
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
}

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
  measure?: string;
  limit?: number;
}

export interface RecordsParams extends FilterParams {
  sort?: string;
  direction?: 1 | -1;
  page?: number;
  page_size?: number;
}

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
      fetch(`/api/months/${month}`, { method: 'DELETE' }).then(r => r.json()),
  },

  query: {
    summary: (p: FilterParams)  => post<Summary>('/api/query/summary', p),
    group:   (p: GroupParams)   => post<GroupRow[]>('/api/query/group', p),
    records: (p: RecordsParams) => post<RecordsResult>('/api/query/records', p),
    time:    (p: TimeParams)    => post<TimePoint[]>('/api/query/timeseries', p),
  },
};

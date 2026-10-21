/**
 * Estado global de la aplicación — espejo de S en app.js.
 * Zustand: estado reactivo sin Redux, sin contexto externo.
 */
import { create } from 'zustand';
import type { MonthInfo, Summary, FilterParams } from './api';

export type Measure = 'fobUsd' | 'kg' | 'cnt' | 'fobCop';
export type Tab = 'graficos' | 'resumen' | 'explorar' | 'registros';
export type Theme = 'auto' | 'light' | 'dark';
export type Gran = 'mes' | 'dia';

// Mapa medida UI → campo API
export const MEASURE_KEY: Record<Measure, string> = {
  fobUsd: 'fob_usd', fobCop: 'fob_cop', kg: 'kg', cnt: 'cnt',
};

export interface AppState {
  // Datos
  months: MonthInfo[];
  summary: Summary | null;
  loading: boolean;
  error: string | null;

  // Filtros (equivalente a S.filters + S.rng + S.text en app.js)
  selectedMonths: string[];           // meses activados (vacío = todos)
  dimFilters: Record<string, string[]>; // dim → valores seleccionados
  dateMin: number | null;             // YYYYMMDD
  dateMax: number | null;
  fobMin: number | null;
  fobMax: number | null;
  kgMin: number | null;
  kgMax: number | null;
  kgKind: 'kg_neto' | 'kg_bruto';
  text: string;

  // UI
  measure: Measure;
  tab: Tab;
  theme: Theme;
  gran: Gran;
  stackDim: string;
  rankDim: string;
  rankTop: number;
  rankByMonth: boolean;
  sideOpen: boolean;

  // Registro
  regSort: string;
  regDir: 1 | -1;
  regPage: number;

  // Acciones
  setMonths: (months: MonthInfo[]) => void;
  setSummary: (s: Summary | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  setMeasure: (m: Measure) => void;
  setTab: (t: Tab) => void;
  setTheme: (t: Theme) => void;
  setGran: (g: Gran) => void;
  setStackDim: (d: string) => void;
  toggleMonth: (month: string) => void;
  setDimFilter: (dim: string, values: string[]) => void;
  clearDimFilter: (dim: string) => void;
  clearAllFilters: () => void;
  setDateRange: (min: number | null, max: number | null) => void;
  setFobRange: (min: number | null, max: number | null) => void;
  setKgRange: (min: number | null, max: number | null, kind?: 'kg_neto' | 'kg_bruto') => void;
  setText: (t: string) => void;
  setRankDim: (d: string) => void;
  setRankTop: (n: number) => void;
  setRankByMonth: (v: boolean) => void;
  setSideOpen: (v: boolean) => void;
  setRegSort: (col: string, dir?: 1 | -1) => void;
  setRegPage: (p: number) => void;

  // Helper: construye FilterParams para la API
  buildFilter: () => FilterParams;
}

export const useStore = create<AppState>((set, get) => ({
  months: [], summary: null, loading: false, error: null,
  selectedMonths: [], dimFilters: {},
  dateMin: null, dateMax: null,
  fobMin: null, fobMax: null,
  kgMin: null, kgMax: null, kgKind: 'kg_neto',
  text: '',
  measure: 'fobUsd', tab: 'graficos', theme: 'auto', gran: 'mes',
  stackDim: '', rankDim: 'pais', rankTop: 25, rankByMonth: false,
  sideOpen: true,
  regSort: 'fob_usd', regDir: -1, regPage: 0,

  setMonths:    (months) => set({ months }),
  setSummary:   (summary) => set({ summary }),
  setLoading:   (loading) => set({ loading }),
  setError:     (error) => set({ error }),
  setMeasure:   (measure) => set({ measure }),
  setTab:       (tab) => set({ tab }),
  setTheme:     (theme) => set({ theme }),
  setGran:      (gran) => set({ gran }),
  setStackDim:  (stackDim) => set({ stackDim }),
  setSideOpen:  (sideOpen) => set({ sideOpen }),
  setRankDim:   (rankDim) => set({ rankDim }),
  setRankTop:   (rankTop) => set({ rankTop }),
  setRankByMonth: (rankByMonth) => set({ rankByMonth }),
  setText:      (text) => set({ text, regPage: 0 }),
  setRegPage:   (regPage) => set({ regPage }),

  toggleMonth: (month) => set(s => {
    const cur = s.selectedMonths;
    const next = cur.includes(month) ? cur.filter(m => m !== month) : [...cur, month];
    return { selectedMonths: next, regPage: 0 };
  }),

  setDimFilter: (dim, values) => set(s => ({
    dimFilters: values.length ? { ...s.dimFilters, [dim]: values } : (() => {
      const d = { ...s.dimFilters }; delete d[dim]; return d;
    })(),
    regPage: 0,
  })),

  clearDimFilter: (dim) => set(s => {
    const d = { ...s.dimFilters }; delete d[dim];
    return { dimFilters: d, regPage: 0 };
  }),

  clearAllFilters: () => set({
    dimFilters: {}, selectedMonths: [],
    dateMin: null, dateMax: null,
    fobMin: null, fobMax: null,
    kgMin: null, kgMax: null,
    text: '', regPage: 0,
  }),

  setDateRange: (dateMin, dateMax) => set({ dateMin, dateMax, regPage: 0 }),
  setFobRange:  (fobMin, fobMax)   => set({ fobMin, fobMax, regPage: 0 }),
  setKgRange:   (kgMin, kgMax, kind) => set(s => ({
    kgMin, kgMax, kgKind: kind ?? s.kgKind, regPage: 0,
  })),

  setRegSort: (col, dir) => set(s => ({
    regSort: col,
    regDir: dir ?? (s.regSort === col ? (s.regDir === -1 ? 1 : -1) : -1),
    regPage: 0,
  })),

  buildFilter: (): FilterParams => {
    const s = get();
    return {
      months:   s.selectedMonths.length ? s.selectedMonths : null,
      filters:  s.dimFilters,
      date_min: s.dateMin,
      date_max: s.dateMax,
      fob_min:  s.fobMin,
      fob_max:  s.fobMax,
      kg_min:   s.kgMin,
      kg_max:   s.kgMax,
      kg_kind:  s.kgKind,
      text:     s.text || null,
    };
  },
}));

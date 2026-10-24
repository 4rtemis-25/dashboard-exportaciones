import { useRef } from 'react';
import { useStore, type UploadOutcome } from '../store';
import { api, type MonthInfo } from '../api';
import { mesLabel, nf0 } from '../fmt';

export function Header() {
  const { months, setMonths, setSummary, setLoading, setError, setUploads, theme, setTheme } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setLoading(true); setError(null); setUploads(null);
    // Se guarda el resultado de cada archivo: cifras de validación o error
    const outcomes: UploadOutcome[] = [];
    for (const f of Array.from(files)) {
      try {
        outcomes.push({ file: f.name, result: await api.months.upload(f) });
      } catch (e: any) {
        outcomes.push({ file: f.name, error: e.message });
      }
    }
    setUploads(outcomes);
    const updated = await api.months.list();
    setMonths(updated);
    setLoading(false);
    // Permite volver a elegir el mismo archivo (si no, onChange no se dispara)
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleDelete(m: MonthInfo) {
    // Borra el Parquet del servidor: no se puede deshacer
    const msg = `¿Quitar ${mesLabel(m.month)} (${nf0.format(m.n)} filas)? `
      + 'Se borra del servidor y habrá que volver a subir el Excel.';
    if (!window.confirm(msg)) return;
    try {
      await api.months.delete(m.month);
    } catch (e: any) {
      setError(e.message);
    }
    const updated = await api.months.list();
    setMonths(updated);
    setSummary(null);
  }

  function applyTheme(t: typeof theme) {
    setTheme(t);
    const r = document.documentElement;
    if (t === 'light' || t === 'dark') r.setAttribute('data-theme', t);
    else r.removeAttribute('data-theme');
    try { localStorage.setItem('pe-theme', t); } catch {}
  }

  return (
    <header className="top">
      <div className="brand">
        <span className="logo" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="11" width="4" height="9" rx="1" fill="currentColor"/>
            <rect x="9" y="5" width="4" height="15" rx="1" fill="currentColor"/>
            <rect x="16" y="8" width="4" height="12" rx="1" fill="currentColor" opacity=".7"/>
          </svg>
        </span>
        <div><b>Panel de Exportaciones</b><span className="s">Declaraciones de exportación · carga mensual</span></div>
      </div>

      <div className="files">
        {months.map(m => (
          <span key={m.month} className="fchip">
            <span>{mesLabel(m.month)}</span>
            <i>{nf0.format(m.n)} filas</i>
            <button onClick={() => handleDelete(m)} aria-label={`Quitar ${m.month}`}>×</button>
          </span>
        ))}
      </div>

      <div className="seg themeseg" role="group" aria-label="Tema de color">
        {(['auto','light','dark'] as const).map(t => (
          <button key={t} type="button"
            aria-pressed={theme === t}
            onClick={() => applyTheme(t)}>
            {t === 'auto' ? 'Auto' : t === 'light' ? 'Claro' : 'Oscuro'}
          </button>
        ))}
      </div>

      <button className="btn primary" onClick={() => fileRef.current?.click()}>
        Cargar archivos
      </button>
      <input ref={fileRef} type="file" accept=".xlsx,.xlsm" multiple hidden
        onChange={e => handleFiles(e.target.files)} />
    </header>
  );
}

import { useEffect } from 'react';
import { useStore, type Measure } from './store';
import { api } from './api';
import { MEAS } from './dims';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TabGraficos } from './components/TabGraficos';
import { TabResumen } from './components/TabResumen';
import { TabExplorar } from './components/TabExplorar';
import { TabRegistros } from './components/TabRegistros';
import './style.css';

export default function App() {
  const { months, tab, measure, sideOpen, setSideOpen,
          setMonths, setSummary, setLoading, setError,
          setMeasure, setTab, buildFilter, loading, error,
          dimFilters, text, dateMin, dateMax, fobMin, fobMax, kgMin, kgMax } = useStore();

  const hasData = months.length > 0;

  // Carga inicial de meses disponibles
  useEffect(() => {
    api.months.list()
      .then(m => setMonths(m))
      .catch(() => {});
  }, []);

  // Re-calcula el resumen cuando cambian los filtros o los meses cargados
  useEffect(() => {
    if (!hasData) { setSummary(null); return; }
    setLoading(true);
    api.query.summary(buildFilter())
      .then(s => { setSummary(s); setError(null); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  // La dependencia real son los filtros serializados + la lista de meses
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(buildFilter()), months.map(m => m.month).join(',')]);

  // Tema guardado en localStorage
  useEffect(() => {
    const t = localStorage.getItem('pe-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  }, []);

  function activeCount() {
    let n = Object.values(dimFilters).filter(v => v.length).length;
    if (text) n++;
    if (dateMin != null || dateMax != null) n++;
    if (fobMin != null || fobMax != null) n++;
    if (kgMin != null || kgMax != null) n++;
    return n;
  }

  return (
    <div className={!hasData ? 'empty' : ''}>
      <Header />

      {error && (
        <div style={{ background: 'var(--warn)', color: '#fff', padding: '10px 16px', fontSize: 14 }}>
          {error}
        </div>
      )}

      <div className="layout">
        {hasData && <Sidebar open={sideOpen} />}
        <main>
          {hasData && <StatusBar />}

          {hasData && (
            <div className="toolbar">
              <div className="tl">
                <button className="btn" id="filtToggle" onClick={() => setSideOpen(!sideOpen)}>
                  Filtros{activeCount() ? ` (${activeCount()})` : ''}
                </button>
                <div className="tabs" role="tablist">
                  {(['graficos','resumen','explorar','registros'] as const).map(t => (
                    <button key={t} role="tab"
                      aria-selected={tab === t}
                      onClick={() => setTab(t)}>
                      {t === 'graficos' ? 'Gráficos' : t === 'resumen' ? 'Resumen' :
                       t === 'explorar' ? 'Explorar' : 'Registros'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mseg">
                <span>Medir en</span>
                <div className="seg" role="group">
                  {Object.entries(MEAS).map(([k, m]) => (
                    <button key={k} type="button"
                      aria-pressed={measure === k}
                      onClick={() => setMeasure(k as Measure)}>
                      {m.s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div id="view" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
            {!hasData ? (
              <div className="drop">
                <h2>Carga tus archivos de exportaciones</h2>
                <p>Arrastra aquí los Excel (.xlsx) o usa el botón. Cada mes que cargues se suma a los anteriores. Si subes de nuevo un mes que ya existe, lo reemplaza.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn primary" type="button"
                    onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
                    Elegir archivos
                  </button>
                </div>
                <div className="steps">
                  <span>Los datos se procesan en el servidor y quedan guardados entre sesiones</span>
                  <span>Archivos de 100.000 filas tardan unos segundos en convertirse a Parquet</span>
                </div>
              </div>
            ) : loading && !months.length ? (
              <div className="note" style={{ padding: 24 }}>Cargando…</div>
            ) : tab === 'graficos' ? <TabGraficos /> :
               tab === 'resumen'   ? <TabResumen />  :
               tab === 'explorar'  ? <TabExplorar /> :
                                     <TabRegistros />
            }
          </div>
        </main>
      </div>
    </div>
  );
}

import { useStore } from '../store';
import type { UploadResult } from '../api';
import { mesLabel, nf0, nf2 } from '../fmt';

/**
 * Resultado de la última carga: cifras de validación por archivo (para
 * compararlas con los valores de control) y los errores de cada uno.
 */
export function UploadReport() {
  const { uploads, setUploads } = useStore();
  if (!uploads?.length) return null;

  const ok = uploads.filter(u => 'result' in u);
  const errs = uploads.filter(u => 'error' in u);

  return (
    <div className="card" style={{ margin: '12px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h3>
          Carga: {ok.length} archivo{ok.length === 1 ? '' : 's'} convertido{ok.length === 1 ? '' : 's'}
          {errs.length > 0 && `, ${errs.length} con error`}
        </h3>
        <button className="btn sm ghost" onClick={() => setUploads(null)}>Cerrar</button>
      </div>

      {errs.map(u => 'error' in u && (
        <div key={u.file} className="note" style={{ color: 'var(--warn)', padding: '4px 0' }}>
          <b>{u.file}:</b> {u.error}
        </div>
      ))}

      {ok.length > 0 && (
        <>
          <div className="sub">Cifras leídas de cada archivo. Compáralas con las de la DIAN antes de usar los datos.</div>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Archivo</th><th>Mes</th>
                  <th className="n">Series</th><th className="n">FOB USD</th><th className="n">Peso neto (kg)</th>
                  <th className="n">Declaraciones</th><th className="n">Exportadores</th>
                  <th className="n">Países</th><th className="n">Subpartidas</th><th className="n">Aduanas</th>
                </tr>
              </thead>
              <tbody>
                {ok.map(u => 'result' in u && (
                  <tr key={u.file}>
                    <td>{u.file}</td>
                    <td>{mesLabel(u.result.month)}</td>
                    <td className="n">{nf0.format(u.result.n)}</td>
                    <td className="n">{nf2.format(u.result.fob_usd)}</td>
                    <td className="n">{nf2.format(u.result.kg_neto)}</td>
                    <td className="n">{nf0.format(u.result.formularios)}</td>
                    <td className="n">{nf0.format(u.result.exportadores)}</td>
                    <td className="n">{nf0.format(u.result.paises)}</td>
                    <td className="n">{nf0.format(u.result.subpartidas)}</td>
                    <td className="n">{nf0.format(u.result.aduanas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ok.map(u => 'result' in u && <Notes key={u.file} file={u.file} r={u.result} />)}
        </>
      )}
    </div>
  );
}

function Notes({ file, r }: { file: string; r: UploadResult }) {
  const notes: string[] = [];
  if (r.replaced) notes.push(`reemplazó los datos que ya había de ${mesLabel(r.month)}`);
  const otros = Object.entries(r.rows_by_month).filter(([m]) => m !== r.month);
  if (otros.length)
    notes.push('también trae filas de ' + otros.map(([m, n]) => `${mesLabel(m)} (${nf0.format(n)})`).join(', '));
  if (r.missing_columns.length)
    notes.push('columnas ausentes, quedan como "(sin dato)" o 0: ' + r.missing_columns.join(', '));
  if (!notes.length) return null;
  return <div className="note" style={{ padding: '4px 0' }}><b>{file}:</b> {notes.join('; ')}.</div>;
}

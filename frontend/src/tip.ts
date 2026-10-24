/**
 * Contenido de tooltips: JSON {t: título, r: [[etiqueta, valor], …]} que se pone
 * en el atributo data-tip de cualquier elemento y muestra components/Tooltip.
 */
import { fmFull, nf0, nf1 } from './fmt';

export interface TipSpec { t: string; r: [string, string][] }

export function tip(t: string, r: [string, string][]): string {
  return JSON.stringify({ t, r } satisfies TipSpec);
}

export const MEAS_LABEL: Record<string, string> = {
  fob_usd: 'FOB USD', fob_cop: 'FOB COP', kg: 'Peso neto', cnt: 'Series',
};

/** Tooltip de un elemento de gráfico: valor, participación y series. */
export function itemTip(
  it: { displayKey: string; cnt: number } & Record<string, unknown>,
  mKey: string, total: number,
): string {
  const v = it[mKey] as number;
  const r: [string, string][] = [
    [MEAS_LABEL[mKey] ?? mKey, fmFull(mKey, v)],
    ['Participación', total ? nf1.format(v / total * 100) + ' %' : '—'],
  ];
  if (mKey !== 'cnt' && it.cnt) r.push(['Series', nf0.format(it.cnt)]);
  return tip(it.displayKey, r);
}

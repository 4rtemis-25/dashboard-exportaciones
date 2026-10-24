/**
 * Tooltip global (equivalente a #tip en app.js): cualquier elemento con
 * data-tip muestra su contenido al pasar el ratón. El contenido es JSON
 * {t: título, r: [[etiqueta, valor], …]} y se escribe con textContent, así un
 * nombre de exportador con "<" o "&" nunca se interpreta como HTML.
 */
import { useEffect, useRef } from 'react';
import type { TipSpec } from '../tip';

export function Tooltip() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = ref.current!;
    let last = '';
    const hide = () => { box.style.display = 'none'; last = ''; };

    const move = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('[data-tip]') as HTMLElement | null;
      const raw = el?.dataset.tip;
      if (!raw) { hide(); return; }
      if (raw !== last) {
        last = raw;
        let spec: TipSpec;
        try { spec = JSON.parse(raw); } catch { hide(); return; }
        const b = document.createElement('b');
        b.textContent = spec.t;
        box.replaceChildren(b, ...spec.r.map(([l, v]) => {
          const row = document.createElement('div');
          row.className = 'r';
          const a = document.createElement('span'); a.textContent = l;
          const c = document.createElement('span'); c.textContent = v;
          row.append(a, c);
          return row;
        }));
      }
      box.style.display = 'block';
      // Igual que el prototipo: a la derecha/abajo del cursor, sin salirse de la ventana
      const w = box.offsetWidth, h = box.offsetHeight;
      let x = e.clientX + 14, y = e.clientY + 14;
      if (x + w > innerWidth - 8) x = e.clientX - w - 14;
      if (y + h > innerHeight - 8) y = e.clientY - h - 14;
      box.style.left = Math.max(4, x) + 'px';
      box.style.top = Math.max(4, y) + 'px';
    };

    document.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', hide);
    window.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseleave', hide);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);

  return <div id="tip" ref={ref} role="tooltip" />;
}

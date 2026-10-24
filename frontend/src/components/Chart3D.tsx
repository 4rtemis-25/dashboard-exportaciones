import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { fm, nf1 } from '../fmt';
import { itemTip } from '../tip';

export interface ChartItem {
  key: string;
  displayKey: string;
  color: string;
  fob_usd: number;
  fob_cop: number;
  kg: number;
  cnt: number;
}

interface Chart3DProps {
  items: ChartItem[];
  type: 'bar3d' | 'pie3d' | 'donut3d';
  mKey: string;
  total: number;
}

function textOn(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#12201d' : '#ffffff';
}

function cssv(v: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
}

function makeSprite(text: string, color: string, px: number, weight: number): THREE.Sprite {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  const dpr = 2;
  const font = `${weight} ${px * dpr}px "Schibsted Grotesk", system-ui, sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 8 * dpr;
  const h = Math.ceil(px * dpr * 1.5);
  c.width = w; c.height = h;
  ctx.font = font; ctx.fillStyle = color;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(w / dpr / 30, h / dpr / 30, 1);
  s.renderOrder = 10;
  return s;
}

export function Chart3D({ items, type, mKey, total }: Chart3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const autoRef = useRef(false);
  const [autoUI, setAutoUI] = useState(false);
  const ctrlRef = useRef<{ zoom: (f: number) => void; reset: () => void } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !items.length) return;

    const W = Math.max(300, host.clientWidth || 520);
    const H = Math.round(Math.min(460, Math.max(320, W * 0.72)));

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      host.textContent = 'Tu navegador no permite gráficos 3D (WebGL). Usa un gráfico 2D.';
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H, false);
    host.insertBefore(renderer.domElement, host.firstChild);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);
    const root = new THREE.Group();
    scene.add(root);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dl = new THREE.DirectionalLight(0xffffff, 0.5); dl.position.set(6, 12, 8); scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0xffffff, 0.15); dl2.position.set(-8, 4, -6); scene.add(dl2);

    const ink = cssv('--ink') || '#12201d';
    const ink2 = cssv('--ink-2') || '#4a5a56';
    const lineC = parseInt((cssv('--line') || '#d3dbd8').replace('#',''), 16);
    const floorC = parseInt((cssv('--surface-2') || '#e6ebe9').replace('#',''), 16);
    const meshes: THREE.Mesh[] = [];
    const tan = Math.tan(20 * Math.PI / 180);
    let startRotX = 0, startRotY = 0, camZ = 20, lookY = 0;

    if (type === 'bar3d') {
      const n = items.length, sp = 1.9, bw = 1.2, maxH = 6;
      const maxV = Math.max(...items.map(x => x[mKey as keyof ChartItem] as number)) || 1;
      const fw = n * sp + 1.4;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.16, 3.2), new THREE.MeshStandardMaterial({ color: floorC }));
      floor.position.y = -0.08; root.add(floor);
      const grid = new THREE.GridHelper(fw, Math.max(2, Math.round(fw)), lineC, lineC);
      grid.scale.z = 3.2 / fw; grid.position.y = 0.01; root.add(grid);

      items.forEach((it, i) => {
        const v = it[mKey as keyof ChartItem] as number;
        const h = Math.max(0.12, v / maxV * maxH);
        const x = (i - (n - 1) / 2) * sp;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(bw, h, bw),
          new THREE.MeshStandardMaterial({ color: it.color, roughness: 0.55, metalness: 0.05 })
        );
        mesh.position.set(x, h / 2, 0);
        (mesh as any).userData.it = it;
        root.add(mesh); meshes.push(mesh);
        const vs = makeSprite(fm(mKey, v), ink, 12, 600);
        vs.position.set(x, h + 0.55, 0); root.add(vs);
        const nm = it.displayKey.length > 16 ? it.displayKey.slice(0, 15) + '…' : it.displayKey;
        const ns = makeSprite(nm, ink2, 11, 500);
        ns.position.set(x, 0.25, 2.05); root.add(ns);
      });
      startRotX = 0.38; startRotY = -0.4;
      camZ = Math.max(13, (fw / 2 + 1.5) / (tan * W / H)) * 1.12; lookY = 2.6;
    } else {
      const donut = type === 'donut3d';
      const R0 = 4.4, r0 = donut ? 2.2 : 0, depth = 1.3;
      const sum = items.reduce((s, x) => s + (x[mKey as keyof ChartItem] as number), 0);
      const inner = new THREE.Group(); inner.rotation.x = -Math.PI / 2; root.add(inner);
      let a = 0;
      items.forEach(it => {
        const v = it[mKey as keyof ChartItem] as number;
        const f = Math.min(v / sum, 0.99999), a1 = a + f * Math.PI * 2;
        const sh = new THREE.Shape();
        if (donut) {
          sh.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          sh.lineTo(Math.cos(a) * R0, Math.sin(a) * R0);
          sh.absarc(0, 0, R0, a, a1, false);
          sh.lineTo(Math.cos(a1) * r0, Math.sin(a1) * r0);
          sh.absarc(0, 0, r0, a1, a, true);
        } else {
          sh.moveTo(0, 0);
          sh.lineTo(Math.cos(a) * R0, Math.sin(a) * R0);
          sh.absarc(0, 0, R0, a, a1, false);
          sh.lineTo(0, 0);
        }
        const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 64 });
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: it.color, roughness: 0.55, metalness: 0.05 }));
        const mid = (a + a1) / 2;
        (mesh as any).userData.it = it;
        (mesh as any).userData.dir = [Math.cos(mid), Math.sin(mid)];
        inner.add(mesh); meshes.push(mesh);
        if (f > 0.04) {
          const rr = donut ? (R0 + r0) / 2 : R0 * 0.66;
          const ps = makeSprite(nf1.format(v / total * 100) + '%', textOn(it.color), 13, 700);
          ps.position.set(Math.cos(mid) * rr, depth + 0.45, -Math.sin(mid) * rr); root.add(ps);
        }
        a = a1;
      });
      startRotX = 0.95; startRotY = 0;
      camZ = Math.max(13, (R0 + 1.4) / (tan * Math.min(W / H, 1.2))) * 1.18;
    }

    root.rotation.set(startRotX, startRotY, 0);
    camera.position.set(0, lookY, camZ); camera.lookAt(0, lookY, 0);
    const st = { startRotX, startRotY, camZ, lookY };

    const renderScene = () => renderer.render(scene, camera);
    const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
    let hover: THREE.Mesh | null = null, drag = false, moved = 0, lx = 0, ly = 0;

    const setHover = (mesh: THREE.Mesh | null) => {
      if (hover === mesh) return;
      if (hover) {
        (hover.material as THREE.MeshStandardMaterial).emissive.setHex(0);
        if ((hover as any).userData.dir) hover.position.set(0, 0, 0);
      }
      hover = mesh;
      // El Tooltip global lee data-tip del canvas en el mismo movimiento del ratón
      if (mesh) renderer.domElement.dataset.tip = itemTip(mesh.userData.it, mKey, total);
      else delete renderer.domElement.dataset.tip;
      if (mesh) {
        (mesh.material as THREE.MeshStandardMaterial).emissive.set(mesh.userData.it.color).multiplyScalar(0.28);
        if (mesh.userData.dir) mesh.position.set(mesh.userData.dir[0] * 0.35, mesh.userData.dir[1] * 0.35, 0);
      }
      renderScene();
    };

    const canvas = renderer.domElement;
    canvas.addEventListener('pointerdown', e => {
      drag = true; moved = 0; lx = e.clientX; ly = e.clientY;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', e => {
      if (drag) {
        const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        root.rotation.y += dx * 0.01;
        root.rotation.x = Math.max(0.05, Math.min(1.5, root.rotation.x + dy * 0.01));
        renderScene(); return;
      }
      const rect = canvas.getBoundingClientRect();
      ptr.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const hit = ray.intersectObjects(meshes, false)[0];
      setHover(hit ? hit.object as THREE.Mesh : null);
      canvas.style.cursor = hover ? 'pointer' : 'grab';
    });
    canvas.addEventListener('pointerup', () => { drag = false; canvas.style.cursor = 'grab'; if (moved < 5) setHover(null); });
    canvas.addEventListener('pointerleave', () => { if (!drag) setHover(null); });
    canvas.style.touchAction = 'pan-y';

    ctrlRef.current = {
      zoom: (f) => { camera.position.z = Math.max(5, Math.min(40, camera.position.z * f)); renderScene(); },
      reset: () => { root.rotation.set(st.startRotX, st.startRotY, 0); camera.position.set(0, st.lookY, st.camZ); camera.lookAt(0, st.lookY, 0); renderScene(); },
    };

    let rafId = 0;
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      if (autoRef.current && !drag) { root.rotation.y += 0.006; renderScene(); }
    };
    const ro = new ResizeObserver(() => {
      const w = Math.max(300, host.clientWidth);
      renderer.setSize(w, H, false);
      camera.aspect = w / H; camera.updateProjectionMatrix(); renderScene();
    });
    ro.observe(host);
    renderScene(); loop();

    return () => {
      cancelAnimationFrame(rafId); ro.disconnect();
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => mt.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
      ctrlRef.current = null;
    };
  // `items` es un array nuevo en cada render del padre: depender de él
  // reconstruiría la escena WebGL en cada render. Se depende de su contenido.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items.map(it => [it.key, it.displayKey, it.color, it[mKey as keyof ChartItem]])), type, mKey, total]);

  return (
    <div ref={hostRef} className="c3d" style={{ height: 380 }}>
      <div className="c3d-ctl">
        <button type="button" className="btn sm" aria-pressed={autoUI}
          onClick={() => { autoRef.current = !autoRef.current; setAutoUI(autoRef.current); }}>
          Girar solo
        </button>
        <button type="button" className="btn sm" onClick={() => ctrlRef.current?.reset()}>Reiniciar</button>
        <button type="button" className="btn sm" onClick={() => ctrlRef.current?.zoom(0.8)}>+</button>
        <button type="button" className="btn sm" onClick={() => ctrlRef.current?.zoom(1.25)}>−</button>
      </div>
      <div className="c3d-hint">Arrastra para girar</div>
    </div>
  );
}

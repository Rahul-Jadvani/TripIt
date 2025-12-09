import React, { useEffect, useRef } from 'react';

type GlobeProps = {
  className?: string;
  size?: number; // px
  globeConfig?: GlobeConfig;
  data?: Position[];
};

// Lightweight canvas globe (no deps). Renders a shaded sphere with rotating dots.
export function Globe({ className = '', size = 280, globeConfig, data = [] }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const W = size;
    const H = size;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const R = Math.min(W, H) * 0.48;
    const cx = W / 2;
    const cy = H / 2;

    // Pre-generate random points on sphere
    const pts: Array<{ lat: number; lon: number }> = [];
    const N = 450;
    for (let i = 0; i < N; i++) {
      // Fibonacci sphere for nicer distribution
      const k = i + 0.5;
      const phi = Math.acos(1 - (2 * k) / N); // lat
      const theta = Math.PI * (1 + Math.sqrt(5)) * k; // lon
      const lat = phi - Math.PI / 2;
      const lon = theta % (2 * Math.PI);
      pts.push({ lat, lon });
    }

    // Precompute arc paths (great circle approximation)
    type ArcSeg = { x: number; y: number; z: number; color: string; order: number; t: number };
    const arcSegments: ArcSeg[] = [];
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const arcSteps = 90;
    (data || []).forEach((arc) => {
      const lat1 = toRad(arc.startLat);
      const lon1 = toRad(arc.startLng);
      const lat2 = toRad(arc.endLat);
      const lon2 = toRad(arc.endLng);
      for (let i = 0; i <= arcSteps; i++) {
        const t = i / arcSteps;
        // Spherical linear interpolation (simple lerp fallback)
        const lat = lerp(lat1, lat2, t);
        const lon = lerp(lon1, lon2, t);
        const alt = (globeConfig?.arcLength ?? 0.9) * (globeConfig?.arcTime ? 1 : 1) * (arc.arcAlt || 0.2);
        const x3 = Math.cos(lat) * Math.cos(lon);
        const y3 = Math.sin(lat);
        const z3 = Math.cos(lat) * Math.sin(lon);
        arcSegments.push({ x: x3, y: y3, z: z3 + alt * Math.sin(Math.PI * t), color: arc.color, order: arc.order, t });
      }
    });

    let rot = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Background glow
      const g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.2);
      g.addColorStop(0, 'rgba(255,255,255,0.06)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Sphere base gradient (brand-aware with safe fallback)
      const sphereGrad = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R);
      let brand = '#6d28d9'; // fallback violet
      try {
        const root = getComputedStyle(document.documentElement);
        const v = root.getPropertyValue('--primary').trim();
        if (v) brand = `hsl(${v} / 0.9)`; // e.g. "222 84% 60%" -> hsl(222 84% 60% / 0.9)
      } catch {}
      try {
        sphereGrad.addColorStop(0, brand);
      } catch {
        sphereGrad.addColorStop(0, 'rgba(109,40,217,0.9)');
      }
      sphereGrad.addColorStop(1, '#0d0d0d');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Atmosphere glow
      if (globeConfig?.showAtmosphere ?? true) {
        const atm = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.15);
        atm.addColorStop(0, 'rgba(255,255,255,0)');
        atm.addColorStop(1, (globeConfig?.atmosphereColor ?? '#ffffff') + '22');
        ctx.fillStyle = atm;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // Land dots
      for (const p of pts) {
        const x3 = Math.cos(p.lat) * Math.cos(p.lon + rot);
        const y3 = Math.sin(p.lat);
        const z3 = Math.cos(p.lat) * Math.sin(p.lon + rot);
        // Only draw front hemisphere (z3 > 0)
        if (z3 <= 0) continue;
        const x = cx + x3 * R * 0.96;
        const y = cy + y3 * R * 0.96;
        const s = 1.5 + 1.5 * z3; // size based on depth
        ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.45 * z3).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
      }

      // Animated arcs (dashed with moving head)
      if (arcSegments.length) {
        const dash = 0.06; // visible segment length along t
        const speed = 0.004 * (globeConfig?.autoRotateSpeed ?? 1);
        const head = (performance.now() * speed) % 1;
        for (const seg of arcSegments) {
          // show only segments within [head - dash, head]
          const segT = (seg.t + seg.order * 0.03) % 1;
          const visible = segT < head && segT > head - dash;
          if (!visible) continue;
          const x3 = seg.x * Math.cos(rot) - seg.z * Math.sin(rot);
          const z3 = seg.x * Math.sin(rot) + seg.z * Math.cos(rot);
          const y3 = seg.y;
          if (z3 <= 0) continue; // back side not visible
          const x = cx + x3 * R * 0.96;
          const y = cy + y3 * R * 0.96;
          const s = 1.6 + 1.2 * z3;
          ctx.fillStyle = seg.color || '#38bdf8';
          ctx.beginPath();
          ctx.arc(x, y, s, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const auto = globeConfig?.autoRotate ?? true;
      const spd = globeConfig?.autoRotateSpeed ?? 0.5;
      rot += (auto ? 0.0032 : 0) * (0.5 + spd);
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [size]);

  return (
    <div className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${className || ''}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}

// Types compatible with MagicUI Globe API (for demo wrapper)
export type GlobeConfig = {
  pointSize?: number;
  globeColor?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereAltitude?: number;
  emissive?: string;
  emissiveIntensity?: number;
  shininess?: number;
  polygonColor?: string;
  ambientLight?: string;
  directionalLeftLight?: string;
  directionalTopLight?: string;
  pointLight?: string;
  arcTime?: number;
  arcLength?: number;
  rings?: number;
  maxRings?: number;
  initialPosition?: { lat: number; lng: number };
  autoRotate?: boolean;
  autoRotateSpeed?: number;
};

export type Position = {
  order: number;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  arcAlt: number;
  color: string;
};

// Lightweight fallback that matches World signature without three.js
export function World(_props: { globeConfig: GlobeConfig; data: Position[] }) {
  return (
    <div className="relative w-full h-full">
      <Globe className="top-8" size={360} />
    </div>
  );
}

export default Globe;

import { useEffect, useRef } from "react";

export default function ShaderBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mql.matches) return;

    const c = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ctx = c.getContext("2d")!;
    let raf = 0;

    function resize() {
      c.width = innerWidth * dpr;
      c.height = innerHeight * dpr;
      c.style.width = innerWidth + "px";
      c.style.height = innerHeight + "px";
    }
    resize();
    addEventListener("resize", resize);

    function draw(t: number) {
      const { width: w, height: h } = c;
      ctx.clearRect(0, 0, w, h);

      const count = 60;
      for (let i = 0; i < count; i++) {
        const x = (w * (i / count)) + Math.sin(t * 0.0005 + i) * 40 * dpr;
        const y = (h / 2) + Math.cos(t * 0.0003 + i * 1.3) * (h * 0.25);
        const r = 1.2 * dpr + (Math.sin(t*0.001 + i) + 1) * 1.2 * dpr;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 90 * dpr);
        g.addColorStop(0, "rgba(147, 197, 253, 0.35)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 90 * dpr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, []);

  return <canvas aria-hidden="true" ref={ref} style={{position:"fixed", inset:0, zIndex:0}} />;
}

import { useEffect, useRef, useState } from "react";

export default function BeforeAfter({
  before, after, altBefore, altAfter
}: { before: string; after: string; altBefore: string; altAfter: string; }) {
  const [pos, setPos] = useState(0.5);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current!;
    function onMove(e: MouseEvent | TouchEvent) {
      const rect = el.getBoundingClientRect();
      const x = ("touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX) - rect.left;
      setPos(Math.max(0, Math.min(1, x / rect.width)));
    }
    function drag(e: MouseEvent) { e.preventDefault(); onMove(e); document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", up); }
    function up() { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", up); }
    el.addEventListener("mousedown", drag);
    el.addEventListener("touchmove", onMove, { passive: true });
    return () => { el.removeEventListener("mousedown", drag); el.removeEventListener("touchmove", onMove); };
  }, []);

  return (
    <div ref={wrap} className="relative isolate h-72 rounded-lg overflow-hidden border border-white/10">
      <img src={before} alt={altBefore} className="absolute inset-0 h-full w-full object-cover" />
      <img src={after} alt={altAfter} style={{clipPath: `inset(0 0 0 ${pos*100}%)`}}
           className="absolute inset-0 h-full w-full object-cover will-change-transform" />
      <input
        type="range" min={0} max={100} value={Math.round(pos*100)}
        onChange={(e) => setPos(parseInt(e.target.value)/100)}
        aria-label="Reveal after image"
        className="absolute inset-x-0 bottom-4 mx-auto w-64"
      />
      <div aria-hidden className="absolute inset-y-0" style={{left: `${pos*100}%`, width: 2, background: "rgba(255,255,255,0.4)"}} />
      <div aria-hidden className="absolute inset-y-0 -translate-x-1/2" style={{left: `${pos*100}%`}}>
        <div className="mt-32 rounded-full border px-2 py-1 text-xs bg-black/40 backdrop-blur">↔</div>
      </div>
    </div>
  );
}

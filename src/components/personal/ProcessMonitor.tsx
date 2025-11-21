import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type Process = {
  name: string;
  status: "steady" | "green" | "idle" | "warming up";
  load: number;
  lane: "active" | "queued";
};

type Props = {
  cpuLoad: number;
  items: Process[];
};

const statusColor: Record<Process["status"], string> = {
  steady: "bg-primary/20 text-primary",
  green: "bg-success/20 text-success",
  idle: "bg-border/60 text-text-secondary",
  "warming up": "bg-amber-200/20 text-amber-400",
};

export default function ProcessMonitor({ cpuLoad, items }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="rounded-3xl border border-border/70 bg-surface/90 p-6 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-text-tertiary">Processes</p>
          <h2 className="text-2xl font-semibold text-text-primary">Process monitor</h2>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-text-secondary ring-1 ring-border/60">
          Monitoring
        </span>
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border border-border/60 bg-surface/80 p-4">
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>CPU utilization</span>
          <span>{Math.round(cpuLoad * 100)}%</span>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-border/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary/80 via-secondary/70 to-amber-300/80"
            initial={{ width: "0%" }}
            animate={{ width: inView ? `${cpuLoad * 100}%` : "0%" }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          <motion.span
            className="absolute -top-1.5 h-6 w-6 rounded-full border border-border/70 bg-surface shadow-soft"
            initial={{ left: "0%" }}
            animate={{ left: inView ? `${cpuLoad * 100}%` : "0%" }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </div>
        <p className="text-xs uppercase tracking-[0.1em] text-text-tertiary">Process lanes</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-surface/80">
        <div className="grid grid-cols-[1.2fr_0.4fr_1fr] gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-[0.1em] text-text-tertiary">
          <span>Name</span>
          <span>Status</span>
          <span>Load</span>
        </div>
        <div className="divide-y divide-border/60 font-mono text-[13px]">
          {items.map((item, index) => (
            <div key={item.name} className="grid grid-cols-[1.2fr_0.4fr_1fr] items-center gap-3 px-4 py-3">
              <span className="text-text-primary">{item.name}</span>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor[item.status]}`}>
                {item.status}
              </span>
              <div className="flex items-center gap-3">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-border/60">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary/80 to-secondary/70"
                    initial={{ width: "0%" }}
                    animate={{ width: inView ? `${Math.round(item.load * 100)}%` : "0%" }}
                    transition={{ duration: 0.9, delay: index * 0.08, ease: "easeOut" }}
                  />
                </div>
                <span className="w-12 text-right text-text-secondary">{Math.round(item.load * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

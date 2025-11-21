import { motion } from "framer-motion";

export type ProcessItem = {
  name: string;
  status: "steady" | "green" | "idle" | "warming up";
  load: number;
  lane: "active" | "queued";
};

type Props = {
  cpuLoad: number;
  items: ProcessItem[];
};

const statusColors: Record<ProcessItem["status"], string> = {
  steady: "bg-cyan-400/20 text-cyan-100 border-cyan-400/40",
  green: "bg-emerald-400/20 text-emerald-100 border-emerald-400/40",
  idle: "bg-slate-400/15 text-slate-100 border-slate-400/30",
  "warming up": "bg-amber-400/20 text-amber-100 border-amber-400/40",
};

export default function ProcessLanes({ cpuLoad, items }: Props) {
  const active = items.filter((item) => item.lane === "active");
  const queued = items.filter((item) => item.lane === "queued");

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 shadow-soft">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-text-tertiary">Process lanes</p>
            <p className="text-xl font-semibold text-white">Energy / attention load</p>
          </div>
          <div className="text-sm text-text-secondary">Live</div>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-amber-300"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.round(cpuLoad * 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ProcessColumn title="Active" items={active} />
          <ProcessColumn title="Queued / idle" items={queued} />
        </div>
      </div>
    </div>
  );
}

type ColumnProps = { title: string; items: ProcessItem[] };

function ProcessColumn({ title, items }: ColumnProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.name} className="grid gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">{item.name}</p>
              <span className={`rounded-full border px-2 py-1 text-xs ${statusColors[item.status]}`}>{item.status}</span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-amber-300"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.round(item.load * 100)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

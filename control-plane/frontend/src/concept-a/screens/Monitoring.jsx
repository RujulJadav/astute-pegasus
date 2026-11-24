import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, BellRing, ExternalLink, Gauge, Waves, Cloud, Workflow, Radio, ChevronDown, Settings2 } from "lucide-react";
import { cx, sparkPath, Sparkline } from "../../shared/ui.jsx";
import { hosts, alarms, monitoringSource } from "../../shared/data.js";
import { Panel, PanelHead, Button, Pill, PageHeader, Segmented, Sparkle, ease } from "../kit.jsx";
import { useShell } from "../App.jsx";

export default function Monitoring() {
  const { go, askAgent } = useShell();
  const [range, setRange] = useState("6h");
  const [open, setOpen] = useState(0);
  return (
    <div className="@container">
      <PageHeader eyebrow={<><Activity className="size-3.5" />Monitoring</>} title="Every instance, one view"
        sub="Metrics and alarms from the monitoring each client already has, next to patching and schedules. Today: OCI Monitoring. SolarWinds and Nagios are built per client during implementation."
        actions={<><Segmented layoutId="mon-range" value={range} onChange={setRange} options={["1h", "6h", "24h", "7d"]} /><Button icon={ExternalLink}>Open in OCI Console</Button></>} />

      <Pipeline onConfigure={() => go("integrations")} />

      <div className="mt-4 grid grid-cols-1 gap-4 @5xl:grid-cols-12">
        <Panel className="@5xl:col-span-5">
          <PanelHead icon={BellRing} title="Alarms" meta={`${alarms.length} open`} />
          <div className="space-y-2 px-3 pb-3">
            {alarms.map((a, i) => {
              const tone = a.sev === "critical" ? "orange" : a.sev === "warning" ? "apricot" : "neutral";
              const isOpen = open === i;
              return (
                <motion.div key={a.title} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease }}
                  className={cx("overflow-hidden rounded-xl border", a.sev === "critical" ? "border-orange/35 bg-orange/[0.05]" : "border-line bg-fg/[0.035]")}>
                  <button onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-start gap-3 px-3.5 py-3 text-left">
                    <span className={cx("mt-1.5 size-2 shrink-0 rounded-full", a.sev === "critical" ? "animate-pulse bg-orange shadow-[0_0_10px_#FA9137]" : a.sev === "warning" ? "bg-apricot" : "bg-silver")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-fg">{a.title}</span>
                      <span className="block text-[11.5px] text-muted/80"><span className="font-mono">{a.host}</span> · {a.env} · for {a.since}</span>
                    </span>
                    <Pill tone={tone}>{a.sev}</Pill>
                    <ChevronDown className={cx("mt-1 size-3.5 text-muted/70 transition-transform", isOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} transition={{ duration: 0.3, ease }}>
                        <div className="mx-3.5 mb-3 rounded-lg border border-accent/20 bg-accent/[0.05] p-3">
                          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent"><Sparkle className="size-3" />Pegasus reads this as</div>
                          <p className="text-[12.5px] leading-[19px] text-fg/90">{a.agent}</p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {a.sev === "warning" && <Button size="sm" variant="cyan" onClick={() => askAgent("Clean up /u01 on pkhdevapp01")}>Free 11.4 GB</Button>}
                            {a.sev === "critical" && <Button size="sm" variant="cyan" onClick={() => askAgent("Why is pkhprdapp01 CPU high?")}>Watch until 8 PM</Button>}
                            <Button size="sm">Acknowledge</Button>
                            <span className="ml-auto self-center font-mono text-[11px] text-muted/70">{a.source} · {a.metric}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </Panel>

        <Panel className="@5xl:col-span-7">
          <PanelHead icon={Gauge} title={<span>CPU <span className="ml-1 font-mono text-[13px] font-normal text-muted">pkhprdapp01</span></span>} meta="Parker HCM PRD · app server"
            action={<Pill tone="orange">88% · above 85% for 14 min</Pill>} />
          <BigChart data={hosts[0].cpu} />
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {hosts.map((h, i) => <HostTile key={h.host} h={h} i={i} />)}
      </div>
    </div>
  );
}

function Pipeline({ onConfigure }) {
  const nodes = [
    { icon: Cloud, label: "OCI Monitoring", sub: "metrics + alarms" },
    { icon: Workflow, label: "Connector Hub", sub: "routes out of OCI" },
    { icon: Waves, label: "OCI Streaming", sub: "pegasus-metrics" },
    { icon: Radio, label: "Pegasus", sub: "this view", me: true },
  ];
  return (
    <Panel className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
      <div className="flex min-w-0 flex-1 items-center">
        {nodes.map((n, i) => (
          <div key={n.label} className="flex min-w-0 flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2.5">
              <span className={cx("grid size-9 place-items-center rounded-xl ring-1", n.me ? "bg-accent/15 text-accent ring-accent/40 shadow-[0_0_20px_-4px_#00C6FF]" : "bg-fg/[0.04] text-muted ring-fg/10")}><n.icon className="size-4" /></span>
              <span className="whitespace-nowrap"><span className="block text-[12.5px] font-medium text-fg">{n.label}</span><span className="block text-[11px] text-muted/80">{n.sub}</span></span>
            </div>
            {i < nodes.length - 1 && (
              <div className="relative mx-3 h-px min-w-6 flex-1 bg-fg/10">
                {[0, 1].map((k) => (
                  <motion.span key={k} className="absolute -top-[2px] size-[5px] rounded-full bg-accent shadow-[0_0_8px_#00C6FF]"
                    animate={{ left: ["0%", "100%"], opacity: [0, 1, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: k * 0.9 + i * 0.3, ease: "linear" }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 border-l border-fg/[0.07] pl-6 text-[12px]">
        <span className="flex items-center gap-1.5 text-accent"><span className="size-1.5 animate-pulse rounded-full bg-accent" />{monitoringSource.status}</span>
        <span className="text-muted/70">{monitoringSource.tenancies} tenancies · lag <span className="tabular text-fg">{monitoringSource.lag}</span></span>
        <Button size="sm" variant="ghost" icon={Settings2} onClick={onConfigure}>Configure</Button>
      </div>
    </Panel>
  );
}

const TIMES = ["1:12 PM", "2:12", "3:12", "4:12", "5:12", "6:12", "7:12 PM"];
function BigChart({ data }) {
  const day = useShell().theme === "day";
  const W = 680, H = 240;
  const { line, area } = sparkPath(data, W, H, 6);
  const [hi, setHi] = useState(null);
  const step = (W - 12) / (data.length - 1);
  const y = (v) => H - 6 - (v / 100) * (H - 12);
  return (
    <div className="px-5 pb-4">
      <div className="relative" onMouseLeave={() => setHi(null)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round(((e.clientX - r.left) / r.width) * (W - 12) / step); setHi(Math.max(0, Math.min(data.length - 1, i))); }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
          <defs>
            <linearGradient id="bigfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#FA9137" stopOpacity="0.35" /><stop offset="60%" stopColor="#0B89A1" stopOpacity="0.12" /><stop offset="100%" stopColor="#0B89A1" stopOpacity="0" /></linearGradient>
            <linearGradient id="bigline" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor={day ? "#0B89A1" : "#00C6FF"} /><stop offset="70%" stopColor={day ? "#0B89A1" : "#00C6FF"} /><stop offset="100%" stopColor="#FA9137" /></linearGradient>
          </defs>
          {[0, 25, 50, 75].map((v) => (
            <g key={v}><line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke={day ? "#003C51" : "#FFFFFF"} strokeOpacity={day ? 0.08 : 0.05} /><text x="4" y={y(v) - 4} className="fill-muted font-mono text-[10px]" opacity="0.45">{v}%</text></g>
          ))}
          <line x1="0" x2={W} y1={y(85)} y2={y(85)} stroke="#FA9137" strokeOpacity="0.7" strokeDasharray="5 4" />
          <rect x="40" y={y(85) - 17} width="84" height="15" rx="4" fill={day ? "#FDD8B9" : "#003C51"} fillOpacity={day ? 1 : 0.7} /><text x="46" y={y(85) - 6} className={day ? "fill-navy font-mono text-[10.5px]" : "fill-orange font-mono text-[10.5px]"}>alarm at 85%</text>
          <motion.path d={area} fill="url(#bigfill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />
          <motion.path d={line} fill="none" stroke="url(#bigline)" strokeWidth="2.2" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease }} />
          {hi != null && (
            <g>
              <line x1={6 + hi * step} x2={6 + hi * step} y1="0" y2={H} stroke={day ? "#003C51" : "#FFFFFF"} strokeOpacity="0.25" />
              <circle cx={6 + hi * step} cy={y(data[hi])} r="4.5" fill={day ? "#FFFFFF" : "#003C51"} stroke={data[hi] >= 85 ? "#FA9137" : day ? "#0B89A1" : "#00C6FF"} strokeWidth="2" />
            </g>
          )}
        </svg>
        {hi != null && (
          <div className="pointer-events-none absolute top-1 rounded-lg border border-fg/10 bg-raised px-2.5 py-1.5 text-[11.5px] shadow-[0_12px_30px_-8px_#003C51] day:shadow-pop"
            style={{ left: `calc(${((6 + hi * step) / W) * 100}% + ${hi > data.length * 0.7 ? -120 : 10}px)` }}>
            <div className="font-mono text-muted/80">{hi === data.length - 1 ? "now" : `${Math.round((data.length - 1 - hi) * 7.5)} min ago`}</div>
            <div className={cx("font-display text-[15px] font-bold tabular", data[hi] >= 85 ? "text-risk" : "text-fg")}>{data[hi].toFixed(1)}%</div>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10.5px] text-muted/70">{TIMES.map((t) => <span key={t}>{t}</span>)}</div>
    </div>
  );
}

function HostTile({ h, i }) {
  const day = useShell().theme === "day";
  const hot = h.alarm === "critical";
  const cpu = h.cpu[h.cpu.length - 1], mem = h.mem[h.mem.length - 1];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05, ease, duration: 0.5 }}
      className={cx("rounded-2xl border p-4", hot ? "border-orange/30 bg-orange/[0.04]" : "border-fg/[0.08] bg-surface")}>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[12.5px] text-fg">{h.host}</span>
        {h.alarm && <span className={cx("size-1.5 rounded-full", hot ? "bg-orange" : h.alarm === "warning" ? "bg-apricot" : "bg-silver")} />}
        <span className="ml-auto text-[11px] text-muted/80">{h.role}</span>
      </div>
      <div className="text-[11px] text-muted/70">{h.env}</div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Metric label="CPU" v={cpu} data={h.cpu} color={hot ? "#FA9137" : day ? "#0B89A1" : "#00C6FF"} id={`c${i}`} />
        <Metric label="Memory" v={mem} data={h.mem} color="#0B89A1" id={`m${i}`} />
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px]"><span className="text-muted/80">/u01 block volume</span><span className={cx("tabular", h.disk >= 85 ? "text-risk" : "text-muted")}>{h.disk}%</span></div>
        <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
          <motion.div className={cx("h-full rounded-full", h.disk >= 85 ? "bg-orange" : "bg-teal")} initial={{ width: 0 }} animate={{ width: `${h.disk}%` }} transition={{ duration: 1, ease, delay: 0.2 }} />
        </div>
      </div>
    </motion.div>
  );
}

function Metric({ label, v, data, color, id }) {
  return (
    <div>
      <div className="flex items-baseline justify-between"><span className="text-[10.5px] uppercase tracking-wider text-muted/70">{label}</span><span className={cx("font-display text-[15px] font-bold tabular", v >= 85 ? "text-risk" : "text-fg")}>{Math.round(v)}%</span></div>
      <Sparkline id={id} data={data} width={130} height={30} stroke={color} />
    </div>
  );
}

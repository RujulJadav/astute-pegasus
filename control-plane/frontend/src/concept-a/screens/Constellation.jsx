import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Orbit } from "lucide-react";
import { clients, severity } from "../../shared/data.js";
import { cx } from "../../shared/ui.jsx";
import { Panel, PanelHead, Segmented, STATE_LABEL, SEV, TierTag, ease } from "../kit.jsx";
import { useShell } from "../App.jsx";

const W = 680, H = 400, CX = 340, CY = 200;
const ANGLE = { parker: -150, northwind: -30, cascade: 30, summit: 150 };
const rad = (d) => (d * Math.PI) / 180;

// Night keeps the Deep Ink map; day draws on white: hollow white markers, Navy-tinted orbits and white client pills.
const PAL = {
  night: {
    fill: { running: "#0B89A1", stopped: "#003C51", unknown: "#003C51", unreachable: "#003C51" },
    stroke: { running: "#00C6FF", stopped: "#6D6E71", unknown: "#BCBDC0", unreachable: "#FA9137" },
    upToDate: ["#003C51", "#0B89A1"], line: "#FFFFFF", particle: "#00C6FF", window: "#00C6FF", markerEdge: "#003C51",
    pill: "#003C51", pillEdge: "#0B89A1", online: "#00C6FF", offline: "#003C51", pillShadow: undefined,
  },
  day: {
    fill: { running: "#0B89A1", stopped: "#FFFFFF", unknown: "#FFFFFF", unreachable: "#FFFFFF" },
    stroke: { running: "#00C6FF", stopped: "#6D6E71", unknown: "#BCBDC0", unreachable: "#FA9137" },
    upToDate: ["#E6F4F1", "#0B89A1"], line: "#003C51", particle: "#0B89A1", window: "#0B89A1", markerEdge: "#FFFFFF",
    pill: "#FFFFFF", pillEdge: "#0B89A14d", online: "#0B89A1", offline: "#FFFFFF", pillShadow: "drop-shadow(0 6px 12px #003C5126)",
  },
};

// Clicking a dot opens that one instance (onSelect → slide-in panel on Mission Control), not the whole fleet.
export default function Constellation({ onSelect, selected }) {
  const { go } = useShell();
  const [mode, setMode] = useState("live");
  const [hover, setHover] = useState(null);
  const P = PAL[useShell().theme === "day" ? "day" : "night"];

  const layout = useMemo(() => clients.map((c) => {
    const a = ANGLE[c.id];
    const hx = CX + 222 * Math.cos(rad(a)), hy = CY + 118 * Math.sin(rad(a));
    const n = c.envs.length, spread = 124;
    const envs = c.envs.map((e, i) => {
      const ea = a - spread / 2 + (spread * (i + 0.5)) / n;
      return { ...e, x: hx + 98 * Math.cos(rad(ea)), y: hy + 60 * Math.sin(rad(ea)) };
    });
    const mx = (hx + CX) / 2, my = (hy + CY) / 2;
    const nx = -(CY - hy), ny = CX - hx, len = Math.hypot(nx, ny);
    const k = (c.id === "parker" || c.id === "cascade" ? 1 : -1) * 34;
    const link = `M${hx.toFixed(1)},${hy.toFixed(1)} Q${(mx + (nx / len) * k).toFixed(1)},${(my + (ny / len) * k).toFixed(1)} ${CX},${CY}`;
    const pw = 72 + c.name.split(" ")[0].length * 8.2;
    return { ...c, hx, hy, envs, link, pw };
  }), []);

  const fillFor = (e) => (mode === "risk" ? (e.maxCvss ? SEV[severity(e.maxCvss)].hex : P.upToDate[0]) : P.fill[e.state]);
  const strokeFor = (e) => (mode === "risk" ? (e.maxCvss ? SEV[severity(e.maxCvss)].hex : P.upToDate[1]) : P.stroke[e.state]);

  return (
    <Panel className="overflow-hidden">
      <PanelHead icon={Orbit} title="Fleet constellation" meta="Connectors call out over HTTPS · nothing calls in"
        action={<Segmented size="sm" layoutId="const-mode" value={mode} onChange={setMode} options={[{ value: "live", label: "Live state" }, { value: "risk", label: "Patch risk" }]} />} />
      <div className="relative mx-auto max-w-[620px] day:bg-[radial-gradient(closest-side,#E6F4F1,transparent)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Map of clients, connectors and environments">
          <defs>
            <radialGradient id="core-glow"><stop offset="0%" stopColor="#00C6FF" stopOpacity="0.45" /><stop offset="100%" stopColor="#00C6FF" stopOpacity="0" /></radialGradient>
            <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#00C6FF" stopOpacity="0" /><stop offset="100%" stopColor="#00C6FF" stopOpacity="0.1" /></linearGradient>
            {layout.map((c) => (
              <linearGradient key={c.id} id={`lg-${c.id}`} gradientUnits="userSpaceOnUse" x1={c.hx} y1={c.hy} x2={CX} y2={CY}>
                <stop offset="0%" stopColor={c.connector.status === "offline" ? "#6D6E71" : "#0B89A1"} stopOpacity="0.6" />
                <stop offset="100%" stopColor={c.connector.status === "offline" ? "#6D6E71" : "#00C6FF"} stopOpacity="0.9" />
              </linearGradient>
            ))}
          </defs>

          {/* orbits */}
          <ellipse cx={CX} cy={CY} rx="222" ry="118" fill="none" stroke={P.line} strokeOpacity={P.line === "#FFFFFF" ? 0.06 : 0.12} strokeDasharray="2 6" />


          {/* connector links */}
          {layout.map((c) => (
            <g key={c.id}>
              <path id={`link-${c.id}`} d={c.link} fill="none" stroke={`url(#lg-${c.id})`} strokeWidth="1.4" strokeDasharray={c.connector.status === "offline" ? "3 5" : undefined} />
              {c.connector.status !== "offline" &&
                [0, 1].map((i) => (
                  <circle key={i} r="1.8" fill={P.particle} style={{ filter: "drop-shadow(0 0 4px #00C6FF)" }}>
                    <animateMotion dur="3.4s" begin={`${i * 1.7}s`} repeatCount="indefinite"><mpath href={`#link-${c.id}`} /></animateMotion>
                  </circle>
                ))}
              {c.envs.map((e) => (
                <line key={e.id} x1={c.hx} y1={c.hy} x2={e.x} y2={e.y} stroke={P.line} strokeOpacity={hover?.id === e.id ? 0.4 : P.line === "#FFFFFF" ? 0.1 : 0.16} />
              ))}
            </g>
          ))}

          {/* core */}
          <circle cx={CX} cy={CY} r="70" fill="url(#core-glow)" />
          <motion.circle cx={CX} cy={CY} r="36" fill="none" stroke="#00C6FF" strokeOpacity="0.5"
            animate={{ r: [36, 52], strokeOpacity: [0.5, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }} />
          <circle cx={CX} cy={CY} r="34" fill="#003C51" stroke="#00C6FF" strokeOpacity="0.6" />
          <svg x={CX - 15} y={CY - 16} width="30" height="29" viewBox="0 0 39 37">
            <path d="M27.73 36.74L14.69 9.82 19.72 0l18.62 36.74z" fill="#FFFFFF" />
            <path d="M.88 36.74L19.72 0l4.92 9.71-13.14 27.03z" fill="#FFFFFF" />
            <path d="M.88 36.74l4.71-9.18h17.69l4.53 9.18z" fill="#FFFFFF" />
          </svg>
          <text x={CX} y={CY + 56} textAnchor="middle" className="fill-muted font-sans text-[12px]" opacity="0.85">Pegasus control plane</text>

          {/* client hubs + environments */}
          {layout.map((c) => (
            <g key={c.id}>
              {c.envs.map((e, i) => {
                const r = e.tier === "PRD" ? 8.5 : 6.5;
                return (
                  <g key={e.id} onMouseEnter={() => setHover({ ...e, client: c.name })} onMouseLeave={() => setHover(null)} onClick={() => (onSelect ? onSelect({ ...e, client: c.name, clientId: c.id }) : go("fleet"))} className="cursor-pointer">
                    <circle cx={e.x} cy={e.y} r="16" fill="#003C51" fillOpacity="0" />
                    {e.window && (
                      <motion.circle cx={e.x} cy={e.y} r={r + 6} fill="none" stroke={P.window} strokeWidth="1.2" strokeDasharray="2 3"
                        animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} style={{ transformBox: "fill-box", transformOrigin: "center" }} />
                    )}
                    <motion.circle
                      cx={e.x} cy={e.y} initial={{ r: 0 }} animate={{ r: hover?.id === e.id ? r + 2 : r, fill: fillFor(e), stroke: strokeFor(e) }}
                      transition={{ duration: 0.5, ease, delay: hover ? 0 : 0.3 + i * 0.05 }}
                      strokeWidth="1.5" strokeDasharray={e.state === "unknown" && mode === "live" ? "2 2" : undefined}
                      style={{ filter: mode === "live" && e.state === "running" ? "drop-shadow(0 0 5px #00C6FF99)" : undefined }}
                    />
                    {selected === e.id && <circle cx={e.x} cy={e.y} r={r + 5} fill="none" stroke={P.window} strokeWidth="2" />}
                    {mode === "live" && e.maxCvss >= 9 && <circle cx={e.x + r * 0.75} cy={e.y - r * 0.75} r="2.6" fill="#FA9137" stroke={P.markerEdge} strokeWidth="1" />}
                  </g>
                );
              })}
              <g>
                <rect x={c.hx - c.pw / 2} y={c.hy - 15} width={c.pw} height="30" rx="15" fill={P.pill} stroke={c.connector.status === "offline" ? "#6D6E71" : P.pillEdge} strokeOpacity="0.9" style={{ filter: P.pillShadow }} />
                <text x={c.hx - c.pw / 2 + 12} y={c.hy + 4.5} className="fill-accent font-mono text-[11.5px] font-semibold">{c.code}</text>
                <text x={c.hx - c.pw / 2 + 43} y={c.hy + 5} className="fill-fg font-display text-[13.5px] font-bold">{c.name.split(" ")[0]}</text>
                <circle cx={c.hx + c.pw / 2 - 12} cy={c.hy} r="3" fill={c.connector.status === "online" ? P.online : c.connector.status === "update" ? "#FBB273" : P.offline} stroke={c.connector.status === "offline" ? "#BCBDC0" : "none"} />
              </g>
            </g>
          ))}
          {/* labels for scheduled patch windows (the spinning dashed ring), drawn last so nothing covers them */}
          {layout.flatMap((c) => c.envs.filter((e) => e.window).map((e) => {
            const r = (e.tier === "PRD" ? 8.5 : 6.5) + 6, lx = Math.max(6, e.x - 18), ly = e.y + r + 10;
            return (
              <g key={`win-${e.id}`} pointerEvents="none">
                <line x1={e.x} x2={e.x} y1={e.y + r} y2={ly} stroke={P.window} strokeOpacity="0.7" strokeDasharray="2 2" />
                <rect x={lx} y={ly} width="168" height="20" rx="10" fill={P.pill} stroke={P.window} strokeOpacity="0.8" style={{ filter: P.pillShadow }} />
                <circle cx={lx + 11} cy={ly + 10} r="3" fill={P.window} />
                <text x={lx + 20} y={ly + 14} className="fill-fg font-sans text-[10.5px] font-medium">{c.name.split(" ")[0]} {e.name} · patch 12–7 AM</text>
              </g>
            );
          }))}
        </svg>

        <AnimatePresence>
          {hover && (
            <motion.div
              key={hover.id}
              initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 rounded-xl border border-fg/10 bg-raised p-3 shadow-[0_20px_50px_-10px_#003C51] day:shadow-pop"
              style={{ left: `${(hover.x / W) * 100}%`, top: `calc(${(hover.y / H) * 100}% + 18px)` }}
            >
              <div className="flex items-center gap-2">
                <span className="font-display text-[13px] font-bold">{hover.client} · {hover.name}</span>
                <TierTag tier={hover.tier} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-y-1 text-[11.5px]">
                <span className="text-muted/70">State</span><span className="text-right">{STATE_LABEL[hover.state]}</span>
                <span className="text-muted/70">Servers</span><span className="text-right tabular">{hover.hosts.length}</span>
                <span className="text-muted/70">Behind</span><span className="text-right tabular">{hover.behind ? `${hover.behind} updates` : "Up to date"}</span>
                <span className="text-muted/70">Top CVSS</span><span className={cx("text-right font-mono tabular", hover.maxCvss ? SEV[severity(hover.maxCvss)].text : "text-muted")}>{hover.maxCvss ? hover.maxCvss.toFixed(1) : "–"}</span>
              </div>
              {(hover.window || hover.note) && <div className="mt-2 border-t border-fg/[0.08] pt-2 text-[11.5px] text-accent">{hover.window ? `${hover.window} · ${hover.cr}` : hover.note}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-fg/[0.06] px-5 py-3 text-[11.5px] text-muted/80">
        {mode === "live" ? (
          <>
            <Legend dot="bg-accent shadow-[0_0_6px_#00C6FF]" label="Running" />
            <Legend dot="border border-graphite" label="Stopped" />
            <Legend dot="border border-dashed border-muted" label="Unknown (connector offline)" />
            <Legend dot="border border-dashed border-accent" label="Scheduled patch window (spinning ring)" />
            <Legend dot="bg-orange size-1.5" label="CVSS ≥ 9" />
          </>
        ) : (
          <>
            <Legend dot="bg-orange" label="Critical ≥ 9" />
            <Legend dot="bg-apricot" label="High 7–8.9" />
            <Legend dot="bg-teal" label="Medium 4–6.9" />
            <Legend dot="bg-navy border border-teal day:bg-mint" label="Up to date" />
          </>
        )}
        <span className="ml-auto">Larger dots are production · hover for detail, click to open the instance</span>
      </div>
    </Panel>
  );
}

function Legend({ dot, label }) {
  return <span className="flex items-center gap-1.5"><span className={cx("inline-block size-2 rounded-full", dot)} />{label}</span>;
}

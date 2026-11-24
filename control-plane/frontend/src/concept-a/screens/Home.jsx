import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw, ArrowRight, Clock3, Layers, Plus, ShieldAlert, CalendarClock, CalendarRange, Power, Bug, Siren, Users2, Activity, Server, Cable, ExternalLink,
  CircleAlert, ListTodo, Ticket, Check,
} from "lucide-react";
import { AnimatedNumber, cx, Sparkline } from "../../shared/ui.jsx";
import { fleetStats, components, NOW_LABEL, clients } from "../../shared/data.js";
import { Panel, PanelHead, Button, Pill, PageHeader, SEV, ease, Sparkle, Tooltip, Avatar, Drawer, TierTag, StateDot, STATE_LABEL } from "../kit.jsx";
import { useShell } from "../App.jsx";
import Constellation from "./Constellation.jsx";
import { severity } from "../../shared/data.js";
import { fleetBriefing, health, envExtras, envLink } from "../fleetExtras.js";
import { Stat, Section, AlertRow, JiraRow, Empty } from "../parts/bits.jsx";

// Mission Control is fleet-wide (5 Nov review): a fleet briefing (patching, downtime, CVEs, advisories) and an overall
// health monitor. Instance alerts and the customer KPI cards moved to the Fleet page; clicking a dot in the
// constellation opens that one instance in a slide-in panel.
export default function Home() {
  const { go } = useShell();
  const [picked, setPicked] = useState(null);
  return (
    <div className="@container">
      <PageHeader
        eyebrow={<><span className="size-1.5 animate-pulse rounded-full bg-accent" />{NOW_LABEL} EDT · all systems reporting</>}
        title="Mission Control"
        sub={`${fleetStats.clients} clients · ${fleetStats.envs} environments · ${fleetStats.hosts} servers on OCI, Azure and on-prem. Last full status check 2 min ago.`}
        actions={<>
          <Button icon={RefreshCw}>Check status everywhere</Button>
          <Button variant="primary" icon={Plus} onClick={() => go("patching")}>New change</Button>
        </>}
      />

      <FleetBriefing />
      <HealthMonitor />

      <div className="mt-5 grid grid-cols-1 gap-5 @4xl:grid-cols-12">
        <motion.div className="@4xl:col-span-8" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.1 }}>
          <Constellation onSelect={setPicked} selected={picked?.id} />
        </motion.div>
        <motion.div className="@4xl:col-span-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.18 }}>
          <Customers />
        </motion.div>
        <motion.div className="@4xl:col-span-8" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.24 }}>
          <Next24 />
        </motion.div>
        <motion.div className="@4xl:col-span-4" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.3 }}>
          <Exposure />
        </motion.div>
      </div>

      <InstancePanel env={picked} onClose={() => setPicked(null)} onPick={setPicked} />
    </div>
  );
}

// ── Fleet briefing ──────────────────────────────────────────────────────────────────────────────
const BRIEF_ICON = { patching: CalendarClock, downtime: Power, cve: Bug, advisory: Siren };
const BRIEF_TONE = {
  patching: "bg-accent/10 text-accent ring-accent/25 day:bg-[linear-gradient(135deg,#FFFFFF,#E6F4F1)] day:text-teal day:ring-teal/25",
  downtime: "bg-fg/[0.05] text-muted ring-fg/10 day:bg-[linear-gradient(135deg,#FFFFFF,#F6F6F6)] day:text-navy day:ring-fg/10",
  cve: "bg-orange/10 text-risk ring-orange/30 day:bg-[linear-gradient(135deg,#FDD8B9,#FBB273)] day:text-navy day:ring-apricot/60",
  advisory: "bg-apricot/10 text-warn ring-apricot/25 day:bg-[linear-gradient(135deg,#FFFFFF,#F2E8C4)] day:text-navy day:ring-apricot/50",
};
const LIVE = [
  "Watching 16 environments through 4 connectors",
  "Checked Oracle's advisory feed and CISA KEV 4 min ago",
  "Next status sweep at 7:20 PM EDT",
  "3 patch windows and 2 planned outages in the next 7 days",
];

function FleetBriefing() {
  const { askAgent, setAgentOpen } = useShell();
  const [i, setI] = useState(0);
  useEffect(() => { const id = setInterval(() => setI((x) => (x + 1) % LIVE.length), 3600); return () => clearInterval(id); }, []);
  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
      className="mb-5 overflow-hidden rounded-2xl border border-agent/20 bg-[linear-gradient(90deg,#F2E8C414,#E6F4F108_45%,transparent_75%)] day:aurora-frame day:animate-aurora day:[--frame-fill:linear-gradient(100deg,#FFFFFF,#FFFFFF_55%,#E6F4F1)] day:shadow-[0_16px_36px_-22px_#0B89A1]">
      <div className="flex items-center gap-4 px-5 py-3.5">
        <Avatar kind="agent" size={34} spin />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] text-fg/90"><span className="font-medium text-agent">Fleet briefing · </span>What's coming across every customer this week. Instance alerts live on each customer's Fleet page.</p>
          <p className="mt-0.5 flex h-[18px] items-center gap-2 overflow-hidden text-[11.5px] text-muted/80">
            <span className="relative flex size-1.5 shrink-0"><span className="absolute inset-0 animate-ping rounded-full bg-accent/60" /><span className="relative size-1.5 rounded-full bg-accent" /></span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={i} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.3 }} className="truncate text-shimmer">{LIVE[i]}</motion.span>
            </AnimatePresence>
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => askAgent("What's our exposure to the October CPU?")}>Ask about exposure</Button>
        <Button size="sm" onClick={() => setAgentOpen(true)}>Open the agent</Button>
      </div>
      <div className="grid grid-cols-1 gap-px border-t border-fg/[0.07] bg-fg/[0.06] @3xl:grid-cols-2 @6xl:grid-cols-4">
        {fleetBriefing.map((b, bi) => {
          const Icon = BRIEF_ICON[b.kind];
          return (
            <motion.div key={b.kind} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + bi * 0.06 }} className="bg-surface px-5 py-4 day:bg-white">
              <div className="mb-2.5 flex items-center gap-2">
                <span className={cx("grid size-7 place-items-center rounded-lg ring-1", BRIEF_TONE[b.kind])}><Icon className="size-3.5" strokeWidth={2.2} /></span>
                <span className="font-display text-[13.5px] font-bold text-fg">{b.title}</span>
                <span className="ml-auto text-[11px] text-muted/70">{b.lines.length}</span>
              </div>
              <ul className="space-y-2">
                {b.lines.map((l) => (
                  <li key={l.text} className="text-[12.5px] leading-[17px]">
                    <span className="block text-fg">{l.text}</span>
                    <span className="block text-[11.5px] text-muted/80">{l.meta}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

// ── Overall health monitor (replaces the customer KPI cards) ────────────────────────────────────
const tileCls = "relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card";

function HealthMonitor() {
  const { go, setScope } = useShell();
  const pct = Math.round((health.current / health.total) * 100);
  const sevBar = health.bySeverity;
  return (
    <div className="grid grid-cols-1 gap-5 @4xl:grid-cols-3">
      {/* Patch currency */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
        className={cx(tileCls, "day:bg-[linear-gradient(160deg,#FFFFFF_50%,#E6F4F1)]")}>
        <TileHead icon={Layers} label="Patching: current vs behind" meta="Oct 2026 CPU" />
        <div className="mt-3 flex items-center gap-5">
          <Donut parts={[{ v: health.current, c: "#0B89A1" }, { v: health.behind, c: "#FBB273" }]} label={`${pct}%`} sub="current" />
          <div className="min-w-0 flex-1 space-y-1.5 text-[12.5px]">
            <Row dot="bg-teal" label="On the latest release" v={health.current} />
            <Row dot="bg-apricot" label="Behind (≥ 1 component)" v={health.behind} />
            <div className="pt-1.5">
              <div className="mb-0.5 text-[11px] text-muted/70">% current, last 8 weeks</div>
              <Sparkline id="hm-cur" data={health.currentTrend} width={170} height={26} stroke="#0B89A1" />
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2 border-t border-fg/[0.08] pt-3">
          {health.byClient.map((c) => (
            <button key={c.id} onClick={() => { setScope(c.id); go(`fleet/${c.id}`); }} className="group flex w-full items-center gap-3 text-left text-[12px]">
              <span className="w-20 truncate text-fg group-hover:text-accent">{c.name.split(" ")[0]}</span>
              <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-fg/[0.06]">
                <span className="h-full bg-teal" style={{ width: `${(c.current / c.envs) * 100}%` }} />
                <span className="h-full bg-apricot" style={{ width: `${(c.behind / c.envs) * 100}%` }} />
              </span>
              <span className="w-12 text-right tabular text-muted/80">{c.current}/{c.envs}</span>
            </button>
          ))}
        </div>
        <Insight>The Oct CPU landed on Oct 20; one WebLogic fix clears 8 environments.</Insight>
      </motion.div>

      {/* Vulnerability exposure */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.06 }}
        className={cx(tileCls, "day:bg-[linear-gradient(160deg,#FFFFFF_45%,#FDD8B9)]")}>
        <TileHead icon={ShieldAlert} label="Vulnerability exposure" meta="highest CVSS per environment" />
        <div className="mt-3 flex items-end gap-2">
          <AnimatedNumber value={health.prodCritical} className="font-display text-[38px] font-extrabold leading-none tracking-[-0.02em] text-risk day:text-navy" />
          <span className="mb-1 text-[12.5px] text-muted/80">production environments at CVSS ≥ 9</span>
        </div>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-fg/[0.06]">
          {sevBar.map((s) => s.n > 0 && (
            <motion.span key={s.k} title={`${s.n} environments · ${s.k === "none" ? "no known CVEs" : SEV[s.k].label}`} initial={{ width: 0 }} animate={{ width: `${(s.n / health.total) * 100}%` }} transition={{ duration: 0.9, ease, delay: 0.3 }}
              className={cx("block h-full", s.k === "none" ? "bg-teal/40 day:bg-mint" : SEV[s.k].bg)} />
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
          {sevBar.map((s) => (
            <Row key={s.k} dot={s.k === "none" ? "bg-teal/40 day:bg-mint ring-1 ring-teal/40" : SEV[s.k].bg} label={s.k === "none" ? "No known CVEs" : SEV[s.k].label} v={s.n} />
          ))}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-fg/[0.08] pt-3">
          <div className="text-[12px]"><span className="font-display text-[18px] font-bold text-fg">{health.openCves}</span> <span className="text-muted/80">open CVEs across the fleet</span></div>
          <div className="text-right"><div className="text-[10.5px] text-muted/70">exposed envs, 8 weeks</div><Sparkline id="hm-exp" data={health.exposureTrend.map((v) => (v / health.total) * 100)} width={110} height={24} stroke="#FA9137" /></div>
        </div>
        <Insight>CVE-2026-61842 is on CISA's exploited list; Parker and Northwind production share it.</Insight>
      </motion.div>

      {/* Reachability and uptime */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.12 }}
        className={cx(tileCls, "day:bg-[linear-gradient(160deg,#FFFFFF_50%,#F2E8C4)]")}>
        <TileHead icon={Activity} label="Reachability and uptime" meta="last 30 days" />
        <div className="mt-3 flex items-end gap-2">
          <span className="font-display text-[38px] font-extrabold leading-none tracking-[-0.02em] text-fg">{health.uptime30}</span>
          <span className="mb-1 text-[12.5px] text-muted/80">production uptime (SLA 99.9%)</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[["running", health.running], ["stopped", health.stopped], ["unknown", health.unknown]].map(([s, n]) => (
            <div key={s} className="rounded-xl border border-fg/[0.08] bg-well px-3 py-2.5 day:bg-white/70">
              <div className="flex items-center gap-1.5 text-[11px] text-muted/80"><StateDot state={s} size={7} />{STATE_LABEL[s]}</div>
              <div className="mt-1 font-display text-[20px] font-bold tabular text-fg">{n}</div>
            </div>
          ))}
        </div>
        <div className="mt-auto flex items-center gap-2 border-t border-fg/[0.08] pt-3 text-[12px]">
          <Cable className="size-3.5 text-accent" />
          <span className="text-fg">{health.connectorsOnline} of {clients.length} connectors online</span>
          <span className="ml-auto text-muted/80">Summit offline 3 h</span>
        </div>
        <Insight>Unknown states are Summit's; they are last-known until its connector is back.</Insight>
      </motion.div>
    </div>
  );
}

function TileHead({ icon: Icon, label, meta }) {
  return (
    <div className="flex items-center gap-2.5 text-[12.5px] text-muted">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/25 day:bg-white day:text-teal day:ring-teal/25"><Icon className="size-3.5" strokeWidth={2.2} /></span>
      <span className="font-medium text-fg">{label}</span>
      <span className="ml-auto truncate text-[11px] text-muted/70">{meta}</span>
    </div>
  );
}
function Row({ dot, label, v }) {
  return <div className="flex items-center gap-2"><span className={cx("size-2 shrink-0 rounded-full", dot)} /><span className="min-w-0 flex-1 truncate text-muted">{label}</span><span className="font-medium tabular text-fg">{v}</span></div>;
}
function Insight({ children }) {
  return <div className="mt-3 flex items-center gap-1.5 border-t border-fg/[0.08] pt-2.5 text-[11.5px] text-fg/85"><Sparkle className="size-3 shrink-0 text-agent" /><span className="truncate">{children}</span></div>;
}
function Donut({ parts, label, sub, size = 92, stroke = 11 }) {
  const total = parts.reduce((n, p) => n + p.v, 0);
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={stroke} className="text-fg" />
        {parts.map((p, i) => {
          const len = (p.v / total) * c;
          const el = <motion.circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.c} strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`}
            initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: -off }} transition={{ duration: 1.1, ease, delay: 0.2 + i * 0.1 }} />;
          off += len;
          return el;
        })}
      </svg>
      <span className="absolute text-center"><span className="block font-display text-[20px] font-extrabold leading-none text-fg">{label}</span><span className="text-[10.5px] text-muted/80">{sub}</span></span>
    </div>
  );
}

// ── Customers (for leads; each row opens that customer's Fleet page) ─────────────────────────────
function Customers() {
  const { go, setScope } = useShell();
  return (
    <Panel className="h-full">
      <PanelHead icon={Users2} title="Customers" meta="open one to work on it" />
      <ul className="px-2 pb-2">
        {health.byClient.map((c, i) => {
          const sev = SEV[severity(c.top)];
          return (
            <motion.li key={c.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.06, ease, duration: 0.5 }}>
              <button onClick={() => { setScope(c.id); go(`fleet/${c.id}`); }} className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-fg/[0.04]">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy font-mono text-[10.5px] font-semibold text-cyan">{c.code}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] font-medium text-fg">{c.name}
                    <span className={cx("size-1.5 rounded-full", c.connector === "online" ? "bg-accent" : c.connector === "update" ? "bg-apricot" : "border border-muted")} />
                  </span>
                  <span className="block text-[11.5px] text-muted/80">{c.envs} environments · {c.behind} behind · top CVSS <span className={cx("font-mono", sev.text)}>{c.top ? c.top.toFixed(1) : "–"}</span></span>
                </span>
                <ArrowRight className="size-4 text-muted/50 transition group-hover:translate-x-0.5 group-hover:text-accent" />
              </button>
            </motion.li>
          );
        })}
      </ul>
    </Panel>
  );
}

// ── Option B: the clicked instance in a slide-in panel, without leaving Mission Control ───────────
function InstancePanel({ env, onClose, onPick }) {
  const { go, askAgent, setScope } = useShell();
  const x = env ? envExtras(env) : null;
  const client = env ? clients.find((c) => c.id === env.clientId) : null;
  const open = () => { setScope(env.clientId); go(envLink(env.clientId, env.id)); };
  return (
    <Drawer open={!!env} onClose={onClose} width={580} eyebrow={`Instance · ${env?.client || ""}`} title={env ? `${env.client} · ${env.name}` : ""}
      footer={<>
        <Button size="sm" variant="ghost" icon={Sparkle} onClick={() => { onClose(); askAgent(`Summarise ${env.client} ${env.name}`); }}>Ask the agent</Button>
        <Button variant="primary" className="ml-auto" iconRight={ExternalLink} onClick={open}>Open in Fleet</Button>
      </>}>
      {env && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <TierTag tier={env.tier} />
            <span className="flex items-center gap-1.5 text-[12.5px] text-muted"><StateDot state={env.state} size={7} />{STATE_LABEL[env.state]}</span>
            <span className="text-[12px] text-muted/80">· {env.hosts.length} servers · {client.cloud} {client.region}</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 @container">
            <Stat label="Patching" value={env.behind ? `${env.behind} behind` : "Current"} tone={env.behind ? "warn" : "ok"} />
            <Stat label="Top CVSS" value={env.maxCvss ? env.maxCvss.toFixed(1) : "–"} tone={env.maxCvss >= 9 ? "risk" : env.maxCvss ? "warn" : "ok"} mono />
            <Stat label="Uptime (30 days)" value={x.uptime != null ? `${x.uptime}%` : "Stopped by plan"} sub={`SLA ${x.sla}%`} />
            <Stat label="Next" value={x.schedule} small />
          </div>

          <Section icon={CircleAlert} title="Alerts" count={x.alerts.length}>
            {x.alerts.length ? x.alerts.map((a) => <AlertRow key={a.text} a={a} />) : <Empty>No open alerts</Empty>}
          </Section>
          <Section icon={ListTodo} title="Pending tasks" count={x.tasks.length}>
            {x.tasks.length ? x.tasks.map((t) => <div key={t} className="flex items-center gap-2 py-1 text-[12.5px] text-fg"><span className="size-1.5 rounded-full bg-accent" />{t}</div>) : <Empty>Nothing pending</Empty>}
          </Section>
          <Section icon={Ticket} title="Active ticket">
            {x.jira ? <JiraRow j={x.jira} /> : <Empty>No open change ticket</Empty>}
          </Section>
          <Section icon={Server} title="Servers" count={x.servers.length}>
            <div className="divide-y divide-fg/[0.06] rounded-xl border border-fg/[0.08]">
              {x.servers.map((s) => (
                <div key={s.host} className="flex items-center gap-3 px-3 py-2 text-[12px]">
                  <StateDot state={s.state} size={7} />
                  <span className="font-mono text-fg">{s.host}</span>
                  <span className="text-muted/70">{s.role === "web" ? "Web" : s.role === "prcs" ? "Process scheduler" : "App server"}</span>
                  <span className="ml-auto"><Sparkline id={`ip-${s.host}`} data={s.cpu} width={80} height={20} stroke={s.cpu[s.cpu.length - 1] >= 85 ? "#FA9137" : "#0B89A1"} fill={false} /></span>
                  <span className="w-10 text-right tabular text-muted">{Math.round(s.cpu[s.cpu.length - 1])}%</span>
                </div>
              ))}
            </div>
          </Section>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">Other instances at {env.client}</div>
            <div className="flex flex-wrap gap-2">
              {client.envs.filter((e) => e.id !== env.id).map((e) => (
                <button key={e.id} onClick={() => onPick({ ...e, client: env.client, clientId: env.clientId })}
                  className="flex items-center gap-1.5 rounded-lg border border-fg/10 bg-fg/[0.03] px-2.5 py-1.5 text-[12px] text-fg hover:border-accent/50 day:bg-white">
                  <StateDot state={e.state} size={6} />{e.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}

// ── Next 24 hours (fleet-wide, unchanged) ───────────────────────────────────────────────────────
// 24 hours from now (7 PM Thu) to 7 PM Fri, in EDT. x is hours from now.
const LANES = [
  { name: "Parker · HCM DEV", zone: "EDT", items: [
    { type: "skip", at: 0, label: "7:00 PM stop skipped for PSADMIN-872" },
    { type: "up", from: 0, to: 5 },
    { type: "window", from: 5, to: 12, label: "PSADMIN-872 · Linux, WebLogic, JDK, Tuxedo" },
    { type: "up", from: 12, to: 24 },
  ] },
  { name: "Parker · CS DEV", zone: "EDT", items: [{ type: "down", from: 0, to: 24, label: "Off Thursdays and Fridays" }] },
  { name: "Northwind · CS TST", zone: "MST", items: [
    { type: "up", from: 0, to: 4 }, { type: "down", from: 4, to: 14, label: "Nightly stop · 8 PM–6 AM MST" }, { type: "up", from: 14, to: 24 },
  ] },
  { name: "Parker · HCM PRD", zone: "EDT", items: [{ type: "up", from: 0, to: 24 }, { type: "event", at: 7, label: "OCI backup 2:00 AM" }] },
];
const TICKS = ["7 PM", "11 PM", "3 AM", "7 AM", "11 AM", "3 PM", "7 PM"];

function Next24() {
  const pct = (h) => `${(h / 24) * 100}%`;
  return (
    <Panel className="h-full">
      <PanelHead icon={Clock3} title="Next 24 hours" meta="Times in EDT, the server default · client zones on hover" />
      <div className="px-5 pb-5">
        <div className="relative ml-[150px] mb-1 h-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted/70">
          <span className="absolute left-0">Thu</span>
          <span className="absolute -translate-x-1/2 text-muted/70" style={{ left: pct(5) }}>Fri</span>
        </div>
        <div className="relative ml-[150px] h-5 text-[10.5px] text-muted/80">
          {TICKS.map((t, i) => (
            <span key={i} className={cx("absolute whitespace-nowrap tabular", i === 0 ? "" : i === TICKS.length - 1 ? "-translate-x-full" : "-translate-x-1/2")} style={{ left: pct(i * 4) }}>{t}</span>
          ))}
        </div>
        <div className="relative space-y-2.5">
          <div className="pointer-events-none absolute inset-y-0 left-[150px] right-0">
            {TICKS.map((_, i) => <span key={i} className="absolute inset-y-0 w-px bg-fg/[0.05]" style={{ left: pct(i * 4) }} />)}
            <span className="absolute -top-9 bottom-[-6px] w-px bg-fg/20" style={{ left: pct(5) }} />
            <span className="absolute inset-y-[-6px] left-0 w-0.5 bg-accent shadow-[0_0_10px_#00C6FF]" />
          </div>
          {LANES.map((lane, li) => (
            <div key={lane.name} className="flex items-center">
              <div className="w-[150px] shrink-0 pr-3">
                <div className="truncate text-[12.5px] text-fg">{lane.name}</div>
              </div>
              <div className="relative h-7 flex-1">
                {lane.items.map((it, i) => {
                  if (it.type === "up") return <motion.span key={i} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease, delay: 0.4 + li * 0.08 }} className="absolute top-1/2 h-1.5 origin-left -translate-y-1/2 rounded-full bg-teal/50" style={{ left: pct(it.from), width: pct(it.to - it.from) }} />;
                  if (it.type === "down") return (
                    <Tooltip key={i} content={it.label} className="absolute inset-0">
                      <span className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md border border-fg/10 bg-[repeating-linear-gradient(135deg,#FFFFFF0f_0_5px,transparent_5px_10px)] day:bg-[repeating-linear-gradient(135deg,#003C5112_0_5px,transparent_5px_10px)]" style={{ left: pct(it.from), width: pct(it.to - it.from) }}>
                        <span className="absolute inset-0 flex items-center px-2 text-[10.5px] text-muted/70"><span className="truncate">{it.label}</span></span>
                      </span>
                    </Tooltip>
                  );
                  if (it.type === "window") return (
                    <motion.span key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease, delay: 0.7 }}
                      className="absolute top-0 flex h-7 items-center overflow-hidden rounded-md border border-accent/50 bg-[linear-gradient(90deg,#0B89A1cc,#003C51e6)] px-2 text-[11px] font-medium text-white shadow-[0_0_24px_-4px_#00C6FF80]"
                      style={{ left: pct(it.from), width: pct(it.to - it.from) }}>
                      <span className="absolute inset-0 animate-[pulse_2.4s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent,#00C6FF26,transparent)]" />
                      <span className="relative truncate">{it.label}</span>
                    </motion.span>
                  );
                  if (it.type === "skip") return (
                    <Tooltip key={i} content={it.label}>
                      <span className="absolute top-1/2 grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-apricot/60 bg-well text-[9px] text-warn" style={{ left: pct(it.at) }}>⏸</span>
                    </Tooltip>
                  );
                  return (
                    <Tooltip key={i} content={it.label}>
                      <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-muted/60 bg-well" style={{ left: pct(it.at) }} />
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

const EXPOSURE = [
  { name: "WebLogic", envs: 8 }, { name: "Oracle Linux", envs: 12 }, { name: "Java (JDK)", envs: 11 }, { name: "Tuxedo", envs: 9 }, { name: "Database Client", envs: 4 },
].map((x, i) => ({ ...x, score: components[i].cvss }));

function Exposure() {
  return (
    <Panel className="h-full">
      <PanelHead icon={Layers} title="Exposure by component" meta="Oct CPU" />
      <div className="space-y-3.5 px-5 pb-5 pt-1">
        {EXPOSURE.map((x, i) => {
          const sev = SEV[severity(x.score)];
          return (
            <div key={x.name}>
              <div className="mb-1.5 flex items-baseline text-[12.5px]">
                <span className="text-fg">{x.name}</span>
                <span className="ml-2 text-[11px] text-muted/80">{x.envs} envs</span>
                <span className={cx("ml-auto font-mono text-[12px] tabular", sev.text)}>{x.score.toFixed(1)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
                <motion.div className={cx("h-full rounded-full", sev.bg)} initial={{ width: 0 }} animate={{ width: `${x.score * 10}%` }} transition={{ duration: 1, ease, delay: 0.4 + i * 0.07 }}
                  style={{ boxShadow: x.score >= 9 ? "0 0 12px #FA9137" : undefined }} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

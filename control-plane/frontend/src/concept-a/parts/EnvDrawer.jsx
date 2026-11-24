// Environment detail (5 Nov review): overview with actions and per-server start/stop, consolidated monitoring
// (one chart per metric across servers, click a server to drill in), uptime for SLA, PeopleSoft log files read from the
// OCI block volume, and removal through a change request instead of a popup.
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw, Play, Square, RotateCcw, Eraser, Cable, Trash2, Check, History, Link2, Mail, ShieldCheck, ArrowRight, Search, Download, Radio,
  FileText, HardDrive, CircleAlert, ListTodo, Ticket, X, Clock3, ArchiveRestore, UserCheck,
} from "lucide-react";
import { cx, sparkPath } from "../../shared/ui.jsx";
import { jobs, DOMAIN_STATES, people } from "../../shared/data.js";
import { useLive, ago } from "../../api/live.jsx";
import { Button, Pill, Segmented, StateDot, TierTag, Drawer, Field, inputCls, Confirm, ease, dots } from "../kit.jsx";
import { useShell } from "../App.jsx";
import { envExtras, logFiles, logLines, envLink, signinLink, PS_CFG_HOME } from "../fleetExtras.js";
import { Section, AlertRow, JiraRow, Empty, TICKET_LABEL } from "./bits.jsx";

export const ROLE_LABEL = { web: "Web (PIA)", app: "App server", prcs: "Process scheduler" };
export const ACTIONS = [
  { id: "status", label: "Check status", icon: RefreshCw }, { id: "start", label: "Start all", icon: Play },
  { id: "stop", label: "Stop all", icon: Square, danger: true }, { id: "restart", label: "Restart", icon: RotateCcw },
  { id: "clearcache", label: "Clear cache", icon: Eraser }, { id: "ping", label: "Test connection", icon: Cable },
];
// Brand colours for one line per server.
const LINE = ["#0B89A1", "#003C51", "#FBB273", "#00C6FF", "#6D6E71", "#FA9137"];
const TABS = [
  { value: "overview", label: "Overview" }, { value: "monitoring", label: "Monitoring" }, { value: "uptime", label: "Uptime" },
  { value: "logs", label: "Logs" }, { value: "jobs", label: "Jobs" },
];

export default function EnvDrawer({ env, ticket, onClose, onJob, onRemovalRequested }) {
  const { clients } = useLive();
  const [tab, setTab] = useState("overview");
  const [confirm, setConfirm] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [logServer, setLogServer] = useState(null);
  const [email, setEmail] = useState(false);
  const x = useMemo(() => (env ? envExtras(env) : null), [env?.id]);
  useEffect(() => { setTab("overview"); setLogServer(null); }, [env?.id]);
  const client = env ? clients.find((c) => c.id === env.clientId) : null;
  const name = env ? `${env.client} · ${env.name}` : "";
  const prd = env?.tier === "PRD";
  // s: one server/domain row, or nothing for the whole environment.
  const run = (a, s) => {
    const host = s?.host;
    const job = { what: a.label + (host ? ` · ${host}${s.domain && env.live ? ` ${s.domain}` : ""}` : ""), env: env.name, by: "you", action: a.id, server: s };
    if (prd && ["stop", "restart", "start", "clearcache"].includes(a.id) && (a.id !== "start" || env.live)) setConfirm({ a, job });
    else onJob(job);
  };
  const openLogs = (host) => { setLogServer(host); setTab("logs"); };

  return (
    <>
      <Drawer open={!!env} onClose={onClose} width={860} eyebrow={`Environment · ${client?.cloud || ""} ${client?.region || ""}`} title={name}
        footer={<>
          {!env?.live && <><Button variant="danger" icon={Trash2} size="sm" onClick={() => setRemoving(true)}>Request removal</Button>
          <span className="text-[11.5px] text-muted/80">Needs a change ticket and a second approver. Kept 30 days, restorable.</span></>}
          <span className="ml-auto text-[11.5px] text-muted/80">Actions run through {client?.connector.id}, in the safe order</span>
        </>}>
        {env && (
          <div className="space-y-5">
            {ticket && x.jira && <DeepLinkBanner env={env} j={x.jira} onEmail={() => setEmail(true)} />}

            <div className="flex flex-wrap items-center gap-2">
              <TierTag tier={env.tier} />
              <span className="flex items-center gap-1.5 text-[12.5px] text-muted"><StateDot state={env.state} size={7} />{env.live ? `${x.servers.filter((s) => s.state === "running").length} of ${x.servers.length} domains running` : `${x.servers.length} ${DOMAIN_STATES[x.servers[0]?.state]?.toLowerCase()}`}</span>
              <span className="text-[12px] text-muted/80">· checked {x.servers[0]?.checked}</span>
              <ShareLink route={envLink(env.clientId, env.id, x.jira?.key)} />
            </div>

            <Segmented layoutId="env-tab" value={tab} onChange={setTab} options={env.live ? TABS.filter((t) => t.value === "overview" || t.value === "jobs") : TABS} />

            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {tab === "overview" && <Overview env={env} x={x} run={run} onEmail={() => setEmail(true)} openLogs={openLogs} />}
                {tab === "monitoring" && <Monitoring x={x} run={run} openLogs={openLogs} />}
                {tab === "uptime" && <Uptime env={env} x={x} />}
                {tab === "logs" && <Logs x={x} server={logServer} setServer={setLogServer} connector={client.connector.id} />}
                {tab === "jobs" && <Jobs onJob={onJob} env={env} client={client} />}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </Drawer>
      <Confirm open={!!confirm} onClose={() => setConfirm(null)} danger
        title={`${confirm?.a.label} on ${name}?`} typeToConfirm={prd ? env?.name : null} cta={confirm?.a.label}
        onConfirm={() => { const c = confirm; setConfirm(null); onJob({ ...c.job, confirmed: true }); }}>
        {`${env?.name} is a production environment. Pegasus stops every domain in the safe order (web, process scheduler, app server)${confirm?.a.id === "restart" ? " and starts them again" : ""}.`}
      </Confirm>
      <RemovalRequest open={removing} env={env} x={x} onClose={() => setRemoving(false)} onDone={(r) => { setRemoving(false); onRemovalRequested?.(r); onClose(); }} />
      <JiraEmail open={email} env={env} j={x?.jira} onClose={() => setEmail(false)} />
    </>
  );
}

// ── Deep link from Jira ─────────────────────────────────────────────────────────────────────────
function DeepLinkBanner({ env, j, onEmail }) {
  const { go } = useShell();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-teal/40 bg-[linear-gradient(100deg,#0B89A126,transparent)] px-4 py-3 day:bg-[linear-gradient(100deg,#E6F4F1,#FFFFFF)]">
      <span className="grid size-8 place-items-center rounded-lg bg-teal text-white"><Link2 className="size-4" /></span>
      <div className="min-w-0 flex-1 text-[12.5px]">
        <div className="font-medium text-fg">Opened from Jira <span className="font-mono text-accent">{j.key}</span> · {TICKET_LABEL[j.status]}</div>
        <div className="text-muted/80">{j.title}. {j.status === "approved" ? "Updates are staged and the window is open from 12:00 AM EDT." : "Apply unlocks once the ticket is approved."}</div>
      </div>
      <Button size="sm" variant="ghost" icon={Mail} onClick={onEmail}>See the email</Button>
      <Button size="sm" variant="primary" icon={ShieldCheck} onClick={() => go("patching")}>{j.status === "approved" ? "Apply patch" : "Open change"}</Button>
    </div>
  );
}

function ShareLink({ route }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin === "null" ? "pegasus.beastute.com" : window.location.host || "pegasus.beastute.com"}/#/${route}`;
  return (
    <button onClick={() => { try { navigator.clipboard?.writeText(`https://pegasus.beastute.com/#/${route}`); } catch {} setCopied(true); setTimeout(() => setCopied(false), 1600); }}
      title={url} className="ml-auto flex items-center gap-1.5 rounded-lg border border-fg/10 px-2.5 py-1 text-[11.5px] text-muted hover:border-accent/50 hover:text-fg day:bg-white">
      {copied ? <Check className="size-3.5 text-accent" /> : <Link2 className="size-3.5" />}{copied ? "Link copied" : "Copy link"}
    </button>
  );
}

// ── Overview ────────────────────────────────────────────────────────────────────────────────────
function Overview({ env, x, run, onEmail, openLogs }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-fg/[0.08] bg-well p-3.5 day:bg-white">
          <Section icon={CircleAlert} title="Alerts" count={x.alerts.length}>{x.alerts.length ? x.alerts.map((a) => <AlertRow key={a.text} a={a} />) : <Empty>No open alerts</Empty>}</Section>
        </div>
        <div className="rounded-xl border border-fg/[0.08] bg-well p-3.5 day:bg-white">
          <Section icon={ListTodo} title="Pending tasks" count={x.tasks.length}>{x.tasks.length ? x.tasks.map((t) => <div key={t} className="flex items-center gap-2 py-1 text-[12.5px] text-fg"><span className="size-1.5 shrink-0 rounded-full bg-accent" />{t}</div>) : <Empty>Nothing pending</Empty>}</Section>
        </div>
        <div className="rounded-xl border border-fg/[0.08] bg-well p-3.5 day:bg-white">
          <Section icon={Ticket} title="Active ticket">{x.jira ? <><JiraRow j={x.jira} /><button onClick={onEmail} className="mt-2 flex items-center gap-1 text-[11.5px] text-accent hover:underline"><Mail className="size-3" />Jira email with the Pegasus link</button></> : <Empty>No open change ticket</Empty>}</Section>
        </div>
      </div>

      <div>
        <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">Run on every domain</div>
        <div className="flex flex-wrap gap-2">
          {ACTIONS.map((a) => <Button key={a.id} size="sm" icon={a.icon} variant={a.danger ? "danger" : "secondary"} onClick={() => run(a)}>{a.label}</Button>)}
        </div>
      </div>

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">Servers and domains</div>
        <div className="overflow-hidden rounded-xl border border-fg/[0.08]">
          <table className="w-full text-[12.5px]">
            <thead className="bg-fg/[0.03] text-left text-[10.5px] uppercase tracking-[0.1em] text-muted/70">
              <tr>{["Host", "Role", "Domain", "OS user", "Status", ""].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {x.servers.map((s) => (
                <tr key={s.key || s.host} className="border-t border-fg/[0.06]">
                  <td className="px-3 py-2.5"><span className="font-mono text-fg">{s.host}</span><span className="block font-mono text-[11px] text-muted/70">{s.ip}</span></td>
                  <td className="px-3 py-2.5 text-muted">{ROLE_LABEL[s.role]}</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{s.domain}</td>
                  <td className="px-3 py-2.5 font-mono text-muted">{s.osUser}</td>
                  <td className="px-3 py-2.5"><span className="flex items-center gap-1.5"><StateDot state={s.state} size={7} />{DOMAIN_STATES[s.state]}</span><span className="text-[11px] text-muted/70">{s.checked}</span></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-right text-[11.5px]">
                    {[["start", "Start"], ["stop", "Stop"], ["restart", "Restart"], ["clearcache", "Clear cache"]].map(([id, label]) => (
                      <button key={id} onClick={() => run({ ...(ACTIONS.find((a) => a.id === id) || {}), id, label }, s)} className={cx("ml-2.5", id === "stop" ? "text-risk/80 hover:text-risk day:text-navy" : "text-accent/80 hover:text-accent")}>{label}</button>
                    ))}
                    {!x.live && <button onClick={() => openLogs(s.host)} className="ml-2.5 text-accent/80 hover:text-accent">Logs</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Monitoring: one chart per metric across every server, then drill into one ──────────────────
const TIMES = ["1:12 PM", "2:12", "3:12", "4:12", "5:12", "6:12", "7:12 PM"];
function Monitoring({ x, run, openLogs }) {
  const day = useShell().theme === "day";
  const [metric, setMetric] = useState("cpu");
  const [focus, setFocus] = useState(null);
  const [hidden, setHidden] = useState({});
  const [hi, setHi] = useState(null);
  const W = 760, H = 230, n = 48, step = (W - 12) / (n - 1);
  const y = (v) => H - 6 - (v / 100) * (H - 12);
  const sel = x.servers.find((s) => s.host === focus);
  const shown = x.servers.filter((s) => !hidden[s.host]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented size="sm" layoutId="mon-metric" value={metric} onChange={setMetric} options={[{ value: "cpu", label: "CPU" }, { value: "mem", label: "Memory" }, { value: "disk", label: "Disk (/u01)" }]} />
        <span className="text-[11.5px] text-muted/80">Last 6 hours · OCI Monitoring through the connector · {x.servers.length} servers on one chart</span>
        <Pill tone="cyan" className="ml-auto" icon={Radio}>Live from OCI</Pill>
      </div>

      <div className="rounded-xl border border-fg/[0.08] bg-well p-4 day:bg-white">
        {metric === "disk" ? (
          <div className="space-y-3">
            {x.servers.map((s, i) => (
              <button key={s.host} onClick={() => setFocus(s.host === focus ? null : s.host)} className={cx("block w-full text-left", focus && focus !== s.host && "opacity-45")}>
                <div className="mb-1 flex text-[12px]"><span className="font-mono text-fg">{s.host}</span><span className="ml-2 text-muted/70">{ROLE_LABEL[s.role]}</span><span className={cx("ml-auto tabular", s.disk >= 85 ? "font-semibold text-risk day:text-navy" : "text-muted")}>{s.disk}%</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-fg/[0.06]"><motion.div className={cx("h-full rounded-full", s.disk >= 85 ? "bg-orange" : "bg-teal")} initial={{ width: 0 }} animate={{ width: `${s.disk}%` }} transition={{ duration: 0.8, ease, delay: i * 0.05 }} /></div>
              </button>
            ))}
            <div className="text-[11px] text-muted/70">Alarm at 85% · old patch bundles under /u01/staging can be cleaned up by the agent</div>
          </div>
        ) : (
          <>
            <div className="relative" onMouseLeave={() => setHi(null)}
              onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const i = Math.round((((e.clientX - r.left) / r.width) * (W - 12)) / step); setHi(Math.max(0, Math.min(n - 1, i))); }}>
              <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
                {[0, 25, 50, 75, 100].map((v) => (
                  <g key={v}><line x1="0" x2={W} y1={y(v)} y2={y(v)} stroke={day ? "#003C51" : "#FFFFFF"} strokeOpacity={day ? 0.08 : 0.05} /><text x="4" y={y(v) - 4} className="fill-muted font-mono text-[10px]" opacity="0.5">{v}%</text></g>
                ))}
                <line x1="0" x2={W} y1={y(85)} y2={y(85)} stroke="#FA9137" strokeOpacity="0.7" strokeDasharray="5 4" />
                {shown.map((s) => {
                  const i = x.servers.indexOf(s);
                  const { line } = sparkPath(s[metric], W, H, 6);
                  const dim = focus && focus !== s.host;
                  return (
                    <motion.path key={s.host + metric} d={line} fill="none" stroke={day && i === 1 ? "#003C51" : !day && i === 1 ? "#E6F4F1" : LINE[i % LINE.length]}
                      strokeWidth={focus === s.host ? 3 : 1.8} strokeOpacity={dim ? 0.2 : 1} strokeLinecap="round" className="cursor-pointer"
                      onClick={() => setFocus(s.host === focus ? null : s.host)}
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease }} />
                  );
                })}
                {hi != null && <line x1={6 + hi * step} x2={6 + hi * step} y1="0" y2={H} stroke={day ? "#003C51" : "#FFFFFF"} strokeOpacity="0.25" />}
              </svg>
              {hi != null && (
                <div className="pointer-events-none absolute top-1 min-w-44 rounded-lg border border-fg/10 bg-raised px-2.5 py-1.5 text-[11.5px] shadow-pop"
                  style={{ left: `calc(${((6 + hi * step) / W) * 100}% + ${hi > n * 0.65 ? -190 : 12}px)` }}>
                  <div className="mb-1 font-mono text-muted/80">{hi === n - 1 ? "now" : `${Math.round((n - 1 - hi) * 7.5)} min ago`}</div>
                  {shown.map((s) => (
                    <div key={s.host} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: LINE[x.servers.indexOf(s) % LINE.length] }} /><span className="font-mono text-fg">{s.host}</span><span className={cx("ml-auto tabular", s[metric][hi] >= 85 ? "font-semibold text-risk day:text-navy" : "text-fg")}>{s[metric][hi].toFixed(0)}%</span></div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10.5px] text-muted/70">{TIMES.map((t) => <span key={t}>{t}</span>)}</div>
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-2 border-t border-fg/[0.06] pt-3">
          {x.servers.map((s, i) => (
            <button key={s.host} onClick={() => setFocus(s.host === focus ? null : s.host)} onDoubleClick={() => setHidden((h) => ({ ...h, [s.host]: !h[s.host] }))}
              className={cx("flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11.5px]", focus === s.host ? "border-accent bg-accent/10 text-fg" : "border-fg/10 text-muted hover:text-fg", hidden[s.host] && "line-through opacity-50")}>
              <span className="size-2 rounded-full" style={{ background: LINE[i % LINE.length] }} /><span className="font-mono">{s.host}</span>
            </button>
          ))}
          <span className="ml-auto self-center text-[11px] text-muted/70">Click a line or server to drill in · double-click to hide</span>
        </div>
      </div>

      <AnimatePresence>
        {sel && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-accent/30 bg-surface p-4 day:bg-[linear-gradient(160deg,#FFFFFF,#E6F4F1)]">
            <div className="flex flex-wrap items-center gap-2">
              <StateDot state={sel.state} size={8} /><span className="font-mono text-[14px] font-semibold text-fg">{sel.host}</span>
              <span className="text-[12px] text-muted/80">{ROLE_LABEL[sel.role]} · domain <span className="font-mono">{sel.domain}</span> · {sel.ip}</span>
              <button onClick={() => setFocus(null)} className="ml-auto rounded p-1 text-muted hover:text-fg" aria-label="Close server"><X className="size-4" /></button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[["CPU now", `${Math.round(sel.cpu[47])}%`, sel.cpu[47] >= 85], ["Memory now", `${Math.round(sel.mem[47])}%`, sel.mem[47] >= 85], ["/u01 used", `${sel.disk}%`, sel.disk >= 85]].map(([l, v, hot]) => (
                <div key={l} className="rounded-lg border border-fg/[0.08] bg-well px-3 py-2 day:bg-white"><div className="text-[11px] text-muted/80">{l}</div><div className={cx("font-display text-[18px] font-bold tabular", hot ? "text-risk day:text-navy" : "text-fg")}>{v}</div></div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" icon={Play} onClick={() => run({ id: "start", label: "Start" }, sel.host)}>Start</Button>
              <Button size="sm" variant="danger" icon={Square} onClick={() => run({ id: "stop", label: "Stop" }, sel.host)}>Stop</Button>
              <Button size="sm" icon={Eraser} onClick={() => run({ id: "clearcache", label: "Clear cache" }, sel.host)}>Clear cache</Button>
              <Button size="sm" variant="ghost" icon={FileText} className="ml-auto" onClick={() => openLogs(sel.host)}>Open its logs</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Uptime (affects SLA) ────────────────────────────────────────────────────────────────────────
const DAY_CLS = { up: "bg-teal", partial: "bg-apricot", down: "bg-orange", planned: "bg-fg/15 day:bg-silver" };
const DAY_LABEL = { up: "Up all day", partial: "Partial outage", down: "Down", planned: "Planned stop (not counted)" };
function Uptime({ env, x }) {
  const met = x.uptime == null || x.uptime >= x.sla;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className={cx("rounded-xl border p-4", met ? "border-fg/[0.08] bg-well day:bg-[linear-gradient(160deg,#FFFFFF,#E6F4F1)]" : "border-orange/40 bg-orange/[0.06] day:bg-[linear-gradient(160deg,#FFFFFF,#FDD8B9)]")}>
          <div className="text-[11.5px] text-muted/80">Uptime, last 30 days</div>
          <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-fg">{x.uptime != null ? `${x.uptime}%` : "–"}</div>
          <div className="mt-1.5 text-[11.5px]">{x.uptime == null ? <span className="text-muted/80">Stopped by plan; not measured</span> : met ? <span className="text-accent day:text-teal">Meets the {x.sla}% SLA</span> : <span className="font-medium text-risk day:text-navy">Below the {x.sla}% SLA</span>}</div>
        </div>
        <div className="rounded-xl border border-fg/[0.08] bg-well p-4 day:bg-white">
          <div className="text-[11.5px] text-muted/80">SLA target ({env.tier})</div>
          <div className="mt-1 font-display text-[30px] font-extrabold leading-none text-fg">{x.sla}%</div>
          <div className="mt-1.5 text-[11.5px] text-muted/80">≈ {Math.round(((100 - x.sla) / 100) * 30 * 24 * 60)} min of downtime allowed a month</div>
        </div>
        <div className="rounded-xl border border-fg/[0.08] bg-well p-4 day:bg-white">
          <div className="text-[11.5px] text-muted/80">Measured by</div>
          <div className="mt-1 text-[13px] font-medium text-fg">Sign-in page check every minute, plus domain status every 10 minutes</div>
          <div className="mt-1.5 text-[11.5px] text-muted/80">Approved change windows and schedules are excluded</div>
        </div>
      </div>
      <div className="rounded-xl border border-fg/[0.08] bg-well p-4 day:bg-white">
        <div className="mb-2 flex text-[11.5px] text-muted/80"><span>30 days ago</span><span className="ml-auto">Today</span></div>
        <div className="flex gap-1">
          {x.days.map((d, i) => <motion.span key={i} title={`${30 - i} days ago · ${DAY_LABEL[d]}`} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.012, duration: 0.3 }} className={cx("h-9 flex-1 origin-bottom rounded-[3px]", DAY_CLS[d])} />)}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-muted/80">
          {Object.entries(DAY_LABEL).map(([k, l]) => <span key={k} className="flex items-center gap-1.5"><span className={cx("size-2.5 rounded-[2px]", DAY_CLS[k])} />{l}</span>)}
        </div>
      </div>
      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">Incidents</div>
        {x.incidents.length ? x.incidents.map((i) => (
          <div key={i.when} className="flex items-center gap-3 border-t border-fg/[0.06] py-2.5 text-[12.5px]">
            <span className="w-32 shrink-0 text-muted/80">{i.when}</span><span className="flex-1 text-fg">{i.what}</span><Pill tone="apricot" icon={Clock3}>{i.dur}</Pill>
          </div>
        )) : <Empty>No unplanned downtime in the last 30 days</Empty>}
      </div>
    </div>
  );
}

// ── Logs: read PeopleSoft logs from the OCI block volume without remote desktop or a terminal ───
const LEVEL = { INFO: "text-muted", WARN: "text-warn", ERROR: "text-risk" };
function Logs({ x, server, setServer, connector }) {
  const s = x.servers.find((v) => v.host === server) || x.servers.find((v) => v.role === "app") || x.servers[0];
  const files = logFiles(s);
  const [fileId, setFileId] = useState(files[0].id);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [tail, setTail] = useState(true);
  useEffect(() => setFileId(logFiles(s)[0].id), [s.host]);
  const file = files.find((f) => f.id === fileId) || files[0];
  const lines = logLines(s, file).filter(([, lv, t]) => (level === "all" || lv === level) && (!q || t.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {x.servers.map((v) => (
          <button key={v.host} onClick={() => setServer(v.host)} className={cx("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px]", v.host === s.host ? "border-accent bg-accent/10 text-fg day:bg-mint" : "border-fg/10 text-muted hover:text-fg day:bg-white")}>
            <StateDot state={v.state} size={6} /><span className="font-mono">{v.host}</span><span className="text-muted/70">{ROLE_LABEL[v.role]}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[220px_1fr] gap-3">
        <div className="space-y-1.5">
          {files.map((f) => (
            <button key={f.id} onClick={() => setFileId(f.id)} className={cx("block w-full rounded-lg border px-3 py-2 text-left", f.id === file.id ? "border-accent/60 bg-accent/[0.06] day:bg-mint" : "border-fg/[0.08] hover:border-fg/20 day:bg-white")}>
              <span className="flex items-center gap-1.5 font-mono text-[12px] text-fg"><FileText className="size-3.5 text-accent" />{f.name}</span>
              <span className="text-[11px] text-muted/70">{f.size} · updated just now</span>
            </button>
          ))}
          <div className="rounded-lg border border-dashed border-fg/15 px-3 py-2 text-[11px] leading-4 text-muted/80">
            <HardDrive className="mb-1 size-3.5" />Read from the OCI block volume at <span className="font-mono">/u01</span>, the standard path under the domain, through {connector}. Read-only.
          </div>
        </div>
        <div className="min-w-0 overflow-hidden rounded-xl border border-fg/[0.08]">
          <div className="flex flex-wrap items-center gap-2 border-b border-fg/[0.08] bg-fg/[0.03] px-3 py-2">
            <span className="w-full break-all font-mono text-[11px] text-muted" title={file.path}>{file.path}</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted/70" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className={cx(inputCls, "h-7 w-36 pl-6 text-[11.5px]")} />
            </div>
            <Segmented size="sm" layoutId="log-level" value={level} onChange={setLevel} options={[{ value: "all", label: "All" }, { value: "WARN", label: "Warn" }, { value: "ERROR", label: "Error" }]} />
            <button onClick={() => setTail((t) => !t)} className={cx("flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11.5px]", tail ? "border-accent/50 text-accent" : "border-fg/10 text-muted")}><Radio className="size-3" />{tail ? "Following" : "Paused"}</button>
            <Button size="sm" variant="ghost" icon={Download}>Download</Button>
          </div>
          <div data-theme="night" className="h-[300px] overflow-auto bg-term px-3 py-2.5 font-mono text-[11.5px] leading-[19px]">
            {lines.map(([t, lv, msg], i) => (
              <motion.div key={file.id + i + q + level} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex gap-3 whitespace-pre-wrap">
                <span className="shrink-0 text-muted/60">{t}</span><span className={cx("w-10 shrink-0", LEVEL[lv])}>{lv}</span><span className="text-body">{msg}</span>
              </motion.div>
            ))}
            {!lines.length && <div className="text-muted/70">No lines match.</div>}
            {tail && <div className="mt-1 flex items-center gap-2 text-muted/60"><span className="inline-block h-3 w-1.5 animate-pulse bg-cyan" />following {file.name}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const JOB_TONE = { succeeded: "teal", failed: "orange", expired: "neutral", cancelled: "neutral" };
function Jobs({ onJob, env, client }) {
  if (env?.live) {
    const mine = (client?.jobs || []).filter((j) => j.environment === env.name);
    return (
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80"><History className="size-3.5" />Recent jobs</div>
        {!mine.length && <div className="border-t border-fg/[0.06] py-3 text-[12.5px] text-muted/80">No jobs on {env.name} yet.</div>}
        {mine.map((j) => (
          <div key={j.id} className="flex items-center gap-3 border-t border-fg/[0.06] py-2.5 text-[12.5px]">
            <span className="w-20 shrink-0 text-[11.5px] text-muted/70">{ago(j.created_at)}</span>
            <button onClick={() => onJob({ id: j.id, what: j.title, env: env.name, by: j.created_by })} className="text-left text-fg hover:text-accent">{j.title}{j.note && <span className="block text-[11.5px] text-muted/80">{j.note}</span>}</button>
            <span className="ml-auto text-muted/80">{j.created_by}</span>
            <Pill tone={JOB_TONE[j.status] || "cyan"} icon={j.status === "succeeded" ? Check : undefined}>{j.status}</Pill>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80"><History className="size-3.5" />Recent jobs</div>
      {jobs.map((j) => (
        <div key={j.when + j.what} className="flex items-center gap-3 border-t border-fg/[0.06] py-2.5 text-[12.5px]">
          <span className="w-20 shrink-0 text-[11.5px] text-muted/70">{j.when}</span>
          <button onClick={() => onJob(j)} className="text-left text-fg hover:text-accent">{j.what} · {j.env}{j.note && <span className="block text-[11.5px] text-muted/80">{j.note}</span>}</button>
          <span className="ml-auto text-muted/80">{j.by}</span>
          <Pill tone="teal" icon={Check}>{j.result}</Pill>
        </div>
      ))}
    </div>
  );
}

// ── Removal through change management (never a one-click popup) ─────────────────────────────────
const REASONS = ["Decommissioned by the customer", "Migrated to another environment", "Duplicate or test entry", "Other"];
const STEPS = ["Reason", "Change ticket", "Approver", "Confirm"];
function RemovalRequest({ open, env, x, onClose, onDone }) {
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [ticket, setTicket] = useState("");
  const [approver, setApprover] = useState("");
  const [typed, setTyped] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => { if (open) { setStep(0); setReason(""); setDetail(""); setTicket(""); setApprover(""); setTyped(""); setSent(false); } }, [open]);
  if (!env) return null;
  const approvers = people.filter((p) => p.name && !/Arvind/.test(p.name)).slice(0, 4);
  const prefix = env.clientId === "parker" ? "PSADMIN" : env.clientId === "northwind" ? "NWOPS" : env.clientId === "cascade" ? "CHG" : "SCIT";
  const ok = [reason && (reason !== "Other" || detail.trim()), /^[A-Z]+-?\d+$/.test(ticket.trim()), !!approver, typed.trim() === env.name][step];
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[66] grid place-items-center bg-scrim p-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-label="Request removal" onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="w-full max-w-[600px] rounded-2xl border border-fg/10 bg-raised text-fg shadow-pop">
            <div className="border-b border-fg/[0.07] px-6 pb-4 pt-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-risk day:text-navy">Change request · removal</div>
              <h2 className="mt-1 font-display text-[19px] font-bold">{dots(`Remove ${env.client} · ${env.name}`)}</h2>
              {!sent && <div className="mt-3 flex gap-1.5">{STEPS.map((s, i) => <div key={s} className="flex-1"><div className={cx("h-1 rounded-full", i <= step ? "bg-accent day:bg-teal" : "bg-fg/10")} /><div className={cx("mt-1 text-[11px]", i === step ? "text-fg" : "text-muted/70")}>{i + 1}. {s}</div></div>)}</div>}
            </div>
            <div className="min-h-[230px] px-6 py-5 text-[13px]">
              {sent ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[15px] font-medium"><span className="grid size-7 place-items-center rounded-full bg-teal text-white"><Check className="size-4" /></span>Removal requested</div>
                  <p className="text-muted">Nothing is removed yet. <b className="font-medium text-fg">{approver}</b> has been asked to approve it on <span className="font-mono text-accent">{ticket.trim()}</span>. Until then {env.name} stays as it is, marked <i>Pending removal</i>.</p>
                  <div className="rounded-xl border border-fg/[0.08] bg-well p-3.5 text-[12.5px] day:bg-white">
                    <div className="flex items-center gap-2"><ArchiveRestore className="size-4 text-accent" />After approval it's kept for <b className="font-medium">30 days</b> and can be restored with its servers, domains and schedules (schedules come back paused).</div>
                  </div>
                </div>
              ) : step === 0 ? (
                <div className="space-y-2">
                  <p className="mb-2 text-muted">Why is this environment being removed?</p>
                  {REASONS.map((r) => (
                    <label key={r} className={cx("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2", reason === r ? "border-accent bg-accent/[0.06] day:bg-mint" : "border-fg/10 day:bg-white")}>
                      <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-teal" />{r}
                    </label>
                  ))}
                  <textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder={reason === "Other" ? "Tell the approver why (required)" : "Notes for the approver (optional)"} className={cx(inputCls, "mt-1 h-16 py-2 text-[12.5px]")} />
                </div>
              ) : step === 1 ? (
                <div className="space-y-3">
                  <Field label="Change ticket" hint={`Removal must be tracked like any other change. Use the customer's ticket (${client(env).ticketing}).`}>
                    <input autoFocus value={ticket} onChange={(e) => setTicket(e.target.value.toUpperCase())} placeholder={`${prefix}-881`} className={cx(inputCls, "font-mono")} />
                  </Field>
                  <button onClick={() => setTicket(`${prefix}-881`)} className="text-[12px] text-accent hover:underline">Raise a new ticket for me ({prefix}-881)</button>
                </div>
              ) : step === 2 ? (
                <div className="space-y-2">
                  <p className="mb-2 text-muted">A second person must approve. You can't approve your own request.</p>
                  {approvers.map((p) => (
                    <label key={p.name} className={cx("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2", approver === p.name ? "border-accent bg-accent/[0.06] day:bg-mint" : "border-fg/10 day:bg-white")}>
                      <input type="radio" name="approver" checked={approver === p.name} onChange={() => setApprover(p.name)} className="accent-teal" />
                      <UserCheck className="size-4 text-muted" /><span className="flex-1">{p.name}</span><span className="text-[11.5px] text-muted/70">{p.role}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl border border-fg/[0.08] bg-well p-3.5 text-[12.5px] day:bg-white">
                    <div className="mb-1.5 font-medium text-fg">What happens after approval</div>
                    <ul className="list-disc space-y-1 pl-4 text-muted">
                      <li>{x.servers.length} servers, {x.servers.length} domains and their schedules are removed from Pegasus. Nothing on the servers changes.</li>
                      <li>Kept for 30 days in <i>Recently removed</i> and restorable until Dec 5, 2026.</li>
                      <li>Reason, ticket {ticket.trim()} and both names go to the audit log.</li>
                    </ul>
                  </div>
                  <label className="block">
                    <span className="mb-1.5 block text-[12px] text-muted">Type <b className="font-mono text-risk day:text-navy">{env.name}</b> to confirm</span>
                    <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className={inputCls} />
                  </label>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-fg/[0.07] px-6 py-4">
              {sent ? <Button variant="primary" className="ml-auto" onClick={() => onDone({ env: env.name, client: env.client, ticket: ticket.trim(), approver })}>Done</Button> : <>
                <Button variant="ghost" onClick={step ? () => setStep(step - 1) : onClose}>{step ? "Back" : "Cancel"}</Button>
                {step < 3
                  ? <Button variant="primary" className="ml-auto" disabled={!ok} iconRight={ArrowRight} onClick={() => setStep(step + 1)}>Next</Button>
                  : <Button variant="danger" className="ml-auto" disabled={!ok} icon={Trash2} onClick={() => setSent(true)}>Send for approval</Button>}
              </>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
const client = (env) => clients.find((c) => c.id === env.clientId);

// ── The Jira notification email, with a deep link straight to this environment ──────────────────
function JiraEmail({ open, env, j, onClose }) {
  if (!env || !j) return null;
  const route = envLink(env.clientId, env.id, j.key);
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[66] grid place-items-center bg-scrim p-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div onMouseDown={(e) => e.stopPropagation()} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            data-theme="day" className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-silver bg-white text-navy shadow-pop">
            <div className="border-b border-mist bg-mist px-5 py-3 text-[12px]">
              <div><b className="font-medium">From:</b> Jira &lt;jira@astute.atlassian.net&gt;</div>
              <div><b className="font-medium">Subject:</b> [JIRA] ({j.key}) {j.title} · {env.client} {env.name} · {TICKET_LABEL[j.status]}</div>
            </div>
            <div className="space-y-3 px-5 py-5 text-[13px] leading-[20px]">
              <p><b className="font-medium">Gopinath Samraj</b> changed the status of <span className="font-mono text-teal">{j.key}</span> to <b className="font-medium">{TICKET_LABEL[j.status]}</b>.</p>
              <p className="text-navy/80">Window: tonight 12:00–7:00 AM EDT · Environment: {env.client} {env.name} · Components: Oracle Linux, WebLogic, JDK, Tuxedo</p>
              <div className="rounded-xl border border-teal/30 bg-[linear-gradient(160deg,#FFFFFF,#E6F4F1)] p-4">
                <div className="text-[12px] text-navy/80">Added by Pegasus to every change ticket</div>
                <a href={signinLink(route)} onClick={onClose} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-[13px] font-semibold text-white hover:bg-navy">
                  Open {env.name} in Pegasus <ArrowRight className="size-4" />
                </a>
                <div className="mt-2 break-all font-mono text-[11px] text-navy/70">https://pegasus.beastute.com/#/{route}</div>
              </div>
              <p className="text-[12px] text-navy/70">Sign in if asked; you land on this environment with the ticket open, ready to apply.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

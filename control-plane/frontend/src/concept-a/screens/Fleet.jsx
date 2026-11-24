import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw, Plus, Search, Cloud, Server, ArrowRight, Check, Loader2, Fingerprint, ScanLine, ExternalLink, Bot, ArchiveRestore, FileSpreadsheet, ChevronDown,
  ChevronLeft, ChevronRight, Menu, Play, Square, Eraser, Cable, Link2, Layers, ShieldAlert, CalendarClock, ShieldCheck, HardDrive, KeyRound, Cpu, WifiOff,
  Zap, Radio, CircleAlert, ListTodo, Ticket, Users2, Clock3, KeyRound as KeyIcon,
} from "lucide-react";
import { cx, AnimatedNumber } from "../../shared/ui.jsx";
import { removedEnvs, changeRequest } from "../../shared/data.js";
import { useLive, ago } from "../../api/live.jsx";
import LiveAddServers from "../parts/LiveAddServers.jsx";
import { get as apiGet, post as apiPost, api as apiCall } from "../../api/client.js";
const del = (path, body) => apiCall(path, { method: "DELETE", body });
import { Panel, PanelHead, Button, Pill, PageHeader, Segmented, StateDot, STATE_LABEL, TierTag, Drawer, Field, inputCls, Confirm, ease, Sparkle, Avatar } from "../kit.jsx";
import { useShell } from "../App.jsx";
import JobConsole from "../parts/JobConsole.jsx";
import EnvDrawer, { ROLE_LABEL } from "../parts/EnvDrawer.jsx";
import { JiraRow, TICKET_LABEL } from "../parts/bits.jsx";
import { envExtras, customerBriefing, customerQueue, ociConnection, envLink } from "../fleetExtras.js";

const FILTERS = [
  { value: "all", label: "All" }, { value: "prd", label: "Production" }, { value: "behind", label: "Behind on patches" }, { value: "stopped", label: "Stopped or unknown" },
];

// Fleet (5 Nov review): admins work one customer at a time, so the page opens on the customer they're working on,
// with that customer's KPI cards and agent alerts (moved here from Mission Control). Environments are large tiles in a
// carousel. Deep links: #/fleet/<client>/<env>?ticket=<key> opens that environment, as Jira emails do.
export default function Fleet() {
  const { scope, setScope, route, go, openConsoleAi } = useShell();
  const { clients, allEnvs, live, run, checkAll, loading, refresh } = useLive();
  const [notice, setNotice] = useState(null);
  const [removeEnv, setRemoveEnv] = useState(null);
  const [removedTick, setRemovedTick] = useState(0);
  const removeLive = async (e) => {
    setRemoveEnv(null);
    try {
      await del(`/api/clients/${e.clientId}/environments/${encodeURIComponent(e.name)}`, { confirm: e.name });
      go(base); setRemovedTick((n) => n + 1); refresh();
      setNotice({ text: `${e.name} removed. Its servers and schedules are kept for 30 days: restore it under Removed environments.` });
    } catch (err) { setNotice({ tone: "error", text: err.message }); }
  };
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [discover, setDiscover] = useState(false);
  const [oci, setOci] = useState(false);
  const [job, setJob] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [pending, setPending] = useState([]);

  // route: fleet[/client[/env]][?ticket=KEY]
  const [path, query] = route.split("?");
  const [, linkClient, linkEnv] = path.split("/");
  const ticket = new URLSearchParams(query || "").get("ticket");
  useEffect(() => { if (linkClient && clients.some((c) => c.id === linkClient)) setScope(linkClient); }, [linkClient, clients.length]);
  const detail = useMemo(() => {
    const e = linkEnv && allEnvs.find((x) => x.id === linkEnv && (!linkClient || x.clientId === linkClient));
    return e ? { ...e } : null;
  }, [linkEnv, linkClient, allEnvs]);
  const base = scope === "all" ? "fleet" : `fleet/${scope}`;
  const openEnv = (c, e) => go(envLink(c.id, e.id));
  const pick = (id) => { setScope(id); go(id === "all" ? "fleet" : `fleet/${id}`); };

  const pass = (e) =>
    (filter === "all" || (filter === "prd" && e.tier === "PRD") || (filter === "behind" && e.behind > 0) || (filter === "stopped" && (e.state === "stopped" || e.state === "unknown"))) &&
    (!q || `${e.name} ${e.hosts.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  const shown = clients.filter((c) => scope === "all" || c.id === scope);
  const one = scope !== "all" ? shown[0] : null;
  const scopeEnvs = shown.flatMap((c) => c.envs);
  const counts = ["running", "stopped", "unknown"].map((s) => [s, scopeEnvs.filter((e) => e.state === s).length]);

  // Live: queue the job on the control plane and open its console. Demo: play the sample output.
  const startJob = async (clientId, e, j, confirmed) => {
    if (!live) return setJob(j);
    try {
      const id = await run(clientId, e.name, j.action, { ...(j.server ? { host: j.server.host, role: j.server.role, domain: j.server.domain } : {}), confirm: confirmed ? e.name : undefined });
      setJob({ ...j, id });
    } catch (err) {
      if (err.body?.need_confirm) setConfirm({ e, j, a: { id: j.action, label: j.what }, clientId });
      else setNotice({ tone: "error", text: err.message });
    }
  };
  const action = (c, e, a) => {
    const j = { what: a.label, env: `${c.name} · ${e.name}`, by: "you", action: a.id };
    if (e.tier === "PRD" && a.id === "stop") setConfirm({ e, j, a, clientId: c.id });
    else startJob(c.id, e, j);
  };
  const checkStatus = async () => {
    if (!live) return setJob({ what: "Check status", env: one ? `every ${one.name} environment` : "every environment", by: "you" });
    try {
      await Promise.all(shown.map((c) => checkAll(c.id)));
      setNotice({ text: `Checking every domain${one ? ` of ${one.name}` : ""}. States update here as the connector reports back.` });
    } catch (err) { setNotice({ tone: "error", text: err.message }); }
  };

  return (
    <div className="@container">
      <PageHeader eyebrow={<><Server className="size-3.5" />Fleet{one ? ` · ${one.code}` : " · all customers"}</>} title={one ? one.name : "All customers"}
        sub={one
          ? (one.live
            ? `${one.envs.length} environment${one.envs.length === 1 ? "" : "s"}${one.cloud ? ` on ${one.cloud}${one.region ? ` ${one.region}` : ""}` : ""}. Domains are checked every 10 minutes through ${one.connector.id}; ${one.checking ? "a check is running now" : `the last check was ${ago(one.lastAuto)}`}.`
            : `${one.envs.length} environments on ${one.cloud} ${one.region}. Domains are checked every 10 minutes through ${one.connector.id}; the last check was 2 min ago.`)
          : live && !clients.length ? (loading ? "Loading customers…" : "No customers yet. An admin adds them in the current app (Clients).") : "Every customer at once, for leads. Admins usually work on one customer: pick it above."}
        actions={<><Button icon={RefreshCw} onClick={checkStatus}>Check status</Button><Button variant="primary" icon={Plus} onClick={() => setDiscover(true)} disabled={live && !one}>Add servers</Button></>} />

      {notice && (
        <div role="status" className={cx("mb-5 flex items-center gap-3 rounded-xl border px-4 py-2.5 text-[12.5px] text-fg", notice.tone === "error" ? "border-orange/50 bg-orange/10" : "border-teal/40 bg-teal/10")}>
          {notice.text}<button onClick={() => setNotice(null)} className="ml-auto text-muted hover:text-fg">Dismiss</button>
        </div>
      )}

      <CustomerPicker scope={scope} onPick={pick} />

      {one && (one.live ? <LiveSummary c={one} /> : <CustomerSummary c={one} onOci={() => setOci(true)} onOpenEnv={(id) => go(envLink(one.id, id))} />)}

      <div className="mb-4 mt-7 flex flex-wrap items-center gap-3">
        <h2 className="mr-2 font-display text-[18px] font-bold text-fg">Environments</h2>
        <Segmented layoutId="fleet-filter" value={filter} onChange={setFilter} options={FILTERS} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/70" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a server or environment" className={cx(inputCls, "h-9 w-60 pl-8 text-[12.5px]")} />
        </div>
        <div className="ml-auto flex items-center gap-4 text-[12px] text-muted/75">
          {counts.map(([s, n]) => <span key={s} className="flex items-center gap-1.5 whitespace-nowrap"><StateDot state={s} size={7} />{n} {STATE_LABEL[s].toLowerCase()}</span>)}
        </div>
      </div>

      <div className="space-y-8">
        {shown.map((c, ci) => {
          const envs = c.envs.filter(pass);
          return (
            <motion.section key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: ci * 0.06 }}>
              {!one && <ClientHeader c={c} onOpen={() => pick(c.id)} />}
              {one && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {c.cloud && <Pill icon={Cloud}>{c.cloud}{c.region ? ` · ${c.region}` : ""}</Pill>}{c.cadence && <Pill tone="cream">{c.cadence}</Pill>}{c.ticketing && <Pill>{c.ticketing}</Pill>}
                  {c.cloud === "OCI" && <span className="ml-auto flex gap-2"><Button size="sm" variant="ghost" icon={ExternalLink} onClick={() => c.ociUrl && window.open(c.ociUrl, "_blank", "noopener")}>Open OCI Console</Button>{!live && <Button size="sm" variant="ghost" icon={Bot} onClick={openConsoleAi}>Console AI</Button>}</span>}
                </div>
              )}
              {envs.length
                ? <EnvCarousel envs={envs} client={c} pending={pending} onOpen={(e) => openEnv(c, e)} onAction={(e, a) => action(c, e, a)} />
                : <div className="rounded-2xl border border-dashed border-fg/15 px-5 py-8 text-center text-[13px] text-muted/80">{c.envs.length ? "No environments match this filter." : "No environments yet. Use Add servers in the current app to scan servers through the connector."}</div>}
            </motion.section>
          );
        })}
      </div>

      {live && one && <LiveRemovals key={`${one.id}|${removedTick}`} c={one} onRestored={(t) => { refresh(); setNotice({ text: t }); }} onError={(t) => setNotice({ tone: "error", text: t })} />}
      {live && <Confirm open={!!removeEnv} onClose={() => setRemoveEnv(null)} danger typeToConfirm={removeEnv?.name} title={`Remove ${removeEnv?.name}?`} cta="Remove environment" onConfirm={() => removeLive(removeEnv)}>
        {`Its ${removeEnv?.servers?.length || 0} domains and any schedules leave Pegasus now. Nothing changes on the servers, and it can be restored for 30 days.`}
      </Confirm>}
      {!live && <Panel className="mt-8">
        <PanelHead icon={ArchiveRestore} title="Removals" meta="Removal needs a change ticket and a second approver. Removed environments are kept for 30 days and can be restored." />
        {pending.map((r) => (
          <div key={r.env + r.ticket} className="flex items-center gap-4 border-t border-fg/[0.06] px-5 py-3 text-[12.5px]">
            <span><b className="font-medium text-fg">{r.client} · {r.env}</b><span className="block text-muted/80">Requested by you · <span className="font-mono">{r.ticket}</span></span></span>
            <Pill tone="apricot" icon={Clock3}>Waiting for {r.approver.split(" ")[0]}</Pill>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setPending((p) => p.filter((x) => x !== r))}>Withdraw request</Button>
          </div>
        ))}
        {removedEnvs.map((r) => (
          <div key={r.env} className="flex items-center gap-4 border-t border-fg/[0.06] px-5 py-3 text-[12.5px]">
            <span><b className="font-medium text-fg">Parker · {r.env}</b><span className="block text-muted/80">{r.domains} domains, {r.schedules} schedule · removed by {r.by} {r.when} · PSADMIN-858, approved by Gopinath</span></span>
            <span className="flex min-w-40 flex-col gap-1">
              <span className="text-[11.5px] text-muted/80">27 of 30 days left · until {r.until}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]"><span className="block h-full rounded-full bg-teal" style={{ width: "90%" }} /></span>
            </span>
            <Button size="sm" className="ml-auto" icon={ArchiveRestore}>Restore</Button>
          </div>
        ))}
      </Panel>}

      <EnvDrawer env={detail} ticket={ticket} onClose={() => go(base)} onRemoveLive={(e) => setRemoveEnv(e)} onJob={(j) => (j.id || !j.action || !detail ? setJob(j) : startJob(detail.clientId, detail, j, j.confirmed))} onRemovalRequested={(r) => setPending((p) => [...p, r])} />
      {live ? one && <LiveAddServers open={discover} onClose={() => setDiscover(false)} client={one} /> : <Discover open={discover} onClose={() => setDiscover(false)} />}
      <OciConnect open={oci} c={one} onClose={() => setOci(false)} />
      <JobConsole job={job} onClose={() => setJob(null)} />
      <Confirm open={!!confirm} onClose={() => setConfirm(null)} danger title={`${confirm?.a.label || "Stop all"} on ${confirm?.j.env}?`} typeToConfirm={confirm?.e.name} cta={confirm?.a.label || "Stop all"}
        onConfirm={() => { const c = confirm; setConfirm(null); if (live) startJob(c.clientId, c.e, c.j, true); else setJob(c.j); }}>
        {`${confirm?.e.name} is a production environment. Pegasus runs this on every domain in the safe order (stop: web, process scheduler, app server; start: the reverse).`}
      </Confirm>
    </div>
  );
}

// ── Customer filter: a searchable dropdown, so it scales to many customers ───────────────────────
function CustomerPicker({ scope, onPick }) {
  const { clients } = useLive();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const sel = clients.find((c) => c.id === scope);
  const list = clients.filter((c) => !q || `${c.name} ${c.code} ${c.cloud} ${c.region}`.toLowerCase().includes(q.toLowerCase()));
  const choose = (id) => { onPick(id); setOpen(false); setQ(""); };
  const dot = (c) => <span className={cx("size-1.5 shrink-0 rounded-full", c.connector.status === "online" ? "bg-accent" : c.connector.status === "update" ? "bg-apricot" : "border border-muted")} />;
  return (
    <div className="relative mb-6 flex flex-wrap items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted/80">Customer</span>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className={cx("flex h-11 min-w-[320px] items-center gap-3 rounded-xl border bg-surface pl-1.5 pr-3 text-left shadow-card transition-colors day:bg-white", open ? "border-teal" : "border-fg/10 hover:border-teal/50")}>
        <span className="grid h-8 min-w-8 place-items-center rounded-lg bg-[linear-gradient(135deg,#0B89A1,#003C51)] px-1 font-mono text-[10px] font-semibold text-white">{sel ? sel.code : "ALL"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-medium text-fg">{sel ? sel.name : "All customers"}</span>
          <span className="block truncate text-[11px] text-muted/75">{sel ? `${sel.envs.length} environment${sel.envs.length === 1 ? "" : "s"}${sel.cloud ? ` · ${sel.cloud} ${sel.region}` : ""}` : `${clients.length} customers · cross-customer view for leads`}</span>
        </span>
        {sel && dot(sel)}
        <ChevronDown className={cx("size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      <span className="text-[11.5px] text-muted/70">{clients.length} customer{clients.length === 1 ? "" : "s"}</span>
      <AnimatePresence>
        {open && <>
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setQ(""); }} />
          <motion.div role="listbox" initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
            className="absolute left-[86px] top-12 z-40 w-[380px] overflow-hidden rounded-xl border border-fg/10 bg-raised shadow-pop">
            <div className="border-b border-fg/[0.08] p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted/70" />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers"
                  onKeyDown={(e) => { if (e.key === "Enter" && list[0]) choose(list[0].id); if (e.key === "Escape") { setOpen(false); setQ(""); } }}
                  className={cx(inputCls, "h-9 pl-8 text-[12.5px]")} />
              </div>
            </div>
            <div className="max-h-[320px] overflow-y-auto p-1.5">
              {list.map((c) => {
                const behind = c.envs.filter((e) => e.behind > 0).length;
                return (
                  <button key={c.id} role="option" aria-selected={scope === c.id} onClick={() => choose(c.id)}
                    className={cx("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-fg/[0.06]", scope === c.id && "bg-teal/10 day:bg-mint")}>
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-navy font-mono text-[10px] font-semibold text-cyan">{c.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[13px] text-fg">{c.name}{dot(c)}</span>
                      <span className="block truncate text-[11.5px] text-muted/75">{c.envs.length} environments{c.live ? ` · connector ${c.connector.status}` : ` · ${behind} behind`}{c.cloud ? ` · ${c.cloud} ${c.region}` : ""}</span>
                    </span>
                    {scope === c.id && <Check className="size-4 text-accent day:text-teal" />}
                  </button>
                );
              })}
              {!list.length && <div className="px-3 py-4 text-center text-[12.5px] text-muted/75">No customer matches “{q}”</div>}
            </div>
            <button onClick={() => choose("all")} className={cx("flex w-full items-center gap-2.5 border-t border-fg/[0.08] px-4 py-3 text-left text-[13px] hover:bg-fg/[0.04]", scope === "all" ? "text-fg" : "text-muted")}>
              <Users2 className="size-4" />All customers<span className="text-[11px] text-muted/60">cross-customer view for leads</span>
              {scope === "all" && <Check className="ml-auto size-4 text-accent day:text-teal" />}
            </button>
          </motion.div>
        </>}
      </AnimatePresence>
    </div>
  );
}

// ── Customer summary: the KPI cards and agent alerts that used to sit on Mission Control ─────────
const Q_ICON = { shield: ShieldCheck, disk: HardDrive, key: KeyRound, cpu: Cpu, refresh: RefreshCw, offline: WifiOff };
const Q_TONE = {
  cyan: "bg-accent/10 text-accent ring-accent/25 day:bg-[linear-gradient(135deg,#FFFFFF,#E6F4F1)] day:text-teal day:ring-teal/25",
  orange: "bg-orange/10 text-risk ring-orange/30 day:bg-orange day:text-navy day:ring-orange",
  apricot: "bg-apricot/10 text-warn ring-apricot/25 day:bg-[linear-gradient(135deg,#FDD8B9,#FBB273)] day:text-navy day:ring-apricot/60",
  silver: "bg-fg/[0.05] text-muted ring-fg/10 day:bg-[linear-gradient(135deg,#FFFFFF,#F6F6F6)] day:text-graphite day:ring-fg/10",
};

function CustomerSummary({ c, onOci, onOpenEnv }) {
  const { go, askAgent, setAgentOpen } = useShell();
  const envs = c.envs;
  const comps = envs.reduce((n, e) => n + e.behind, 0);
  const behind = envs.filter((e) => e.behind > 0).length;
  const prdCrit = envs.filter((e) => e.tier === "PRD" && e.maxCvss >= 9);
  const win = envs.find((e) => e.window);
  const queue = customerQueue.filter((x) => x.client === c.id);
  const live = ociConnection[c.id];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 @4xl:grid-cols-4">
        <Kpi icon={Layers} label="Components behind the latest release" value={comps} suffix=" components" foot={`across ${behind} environments`} tone="cyan" onClick={() => go("patching")} />
        <Kpi icon={Server} label="Environments behind" value={behind} suffix={` of ${envs.length}`} foot="at least one component to update" tone="apricot" arc={(behind / envs.length) * 100} />
        <Kpi icon={ShieldAlert} label="Production at CVSS ≥ 9" value={prdCrit.length} suffix=" envs" foot={prdCrit.length ? prdCrit.map((e) => e.name).join(", ") : "None"} tone="orange" onClick={() => go("patching")} />
        <Kpi icon={CalendarClock} label="Next maintenance window" text={win ? "12:00 AM" : "None set"} foot={win ? `${win.name} · ${changeRequest.key} · in ${changeRequest.startsIn}` : "No approved change windows"} tone="hero" onClick={() => go("patching")} />
      </div>

      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-12">
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-agent/20 bg-[linear-gradient(90deg,#F2E8C41a,#E6F4F108_45%,transparent_75%)] p-5 @4xl:col-span-7 day:aurora-frame day:animate-aurora day:[--frame-fill:linear-gradient(100deg,#FFFFFF,#E6F4F1_55%,#F2E8C4)]">
          <div className="flex items-start gap-3">
            <Avatar kind="agent" size={34} spin />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium text-agent">Agent briefing · {c.name}</div>
              <p className="mt-0.5 text-[13.5px] leading-[20px] text-fg/90">{customerBriefing[c.id]}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {c.id === "parker" && <Button size="sm" variant="cyan" icon={Sparkle} onClick={() => askAgent("Clean up /u01 on pkhdevapp01")}>Clean up /u01 on pkhdevapp01</Button>}
            <Button size="sm" onClick={() => setAgentOpen(true)}>Open the agent</Button>
            <span className="ml-auto">{live
              ? <button onClick={onOci} className="flex items-center gap-1.5 rounded-full border border-teal/40 bg-teal/10 px-2.5 py-1 text-[11.5px] text-fg hover:border-teal day:bg-white"><Radio className="size-3 text-accent" />Live from OCI · synced {live.synced}</button>
              : c.cloud === "OCI" && <button onClick={onOci} className="flex items-center gap-1.5 rounded-full border border-dashed border-fg/20 px-2.5 py-1 text-[11.5px] text-muted hover:text-fg"><Cable className="size-3" />Connect OCI for live data</button>}</span>
          </div>
        </div>
        <Panel className="@4xl:col-span-5">
          <PanelHead icon={Zap} title="Needs you" meta={c.name} action={<Pill tone={queue.length ? "orange" : "neutral"}>{queue.length}</Pill>} />
          <ul className="px-2 pb-2">
            {queue.length ? queue.map((x) => {
              const Icon = Q_ICON[x.icon];
              return (
                <li key={x.title}>
                  <button onClick={() => (x.ask ? askAgent(x.ask) : x.env && x.to === "patching" ? onOpenEnv(x.env) : go(x.to))} className="group flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-fg/[0.04]">
                    <span className={cx("mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ring-1", Q_TONE[x.tone])}><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-fg">{x.title}</span>
                      <span className="block truncate text-[11.5px] text-muted/80">{x.sub}</span>
                    </span>
                    <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-accent">{x.ask && <Sparkle className="size-3" />}{x.cta}<ArrowRight className="size-3" /></span>
                  </button>
                </li>
              );
            }) : <li className="px-3 py-3 text-[12.5px] text-muted/80">Nothing needs you for {c.name}.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

// Removed environments (kept 30 days): GET /api/clients/<cid>/removed-environments, POST …/restore.
function LiveRemovals({ c, onRestored, onError }) {
  const [rows, setRows] = useState(null);
  const load = () => apiGet(`/api/clients/${c.id}/removed-environments`).then((r) => setRows(r.removed)).catch(() => setRows([]));
  useEffect(() => { load(); }, [c.id]);
  if (!rows?.length) return null;
  const restore = async (r) => {
    try { await apiPost(`/api/removed-environments/${r.id}/restore`, {}); await load(); onRestored(`${r.environment} restored, with its ${r.servers} domains${r.schedules ? ` and ${r.schedules} schedules` : ""}.`); }
    catch (e) { onError(e.message); }
  };
  return (
    <Panel className="mt-8">
      <PanelHead icon={ArchiveRestore} title="Removed environments" meta="Kept for 30 days, then deleted" />
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-t border-fg/[0.06] px-6 py-3 text-[12.5px]">
          <span className="font-medium text-fg">{r.environment}</span>
          <span className="text-muted/80">{r.servers} domains{r.schedules ? ` · ${r.schedules} schedules` : ""} · removed by {r.removed_by} {ago(r.removed_at)} · restorable until {new Date(r.until).toLocaleDateString()}</span>
          <Button size="sm" className="ml-auto" icon={ArchiveRestore} onClick={() => restore(r)}>Restore</Button>
        </div>
      ))}
    </Panel>
  );
}

// Live customer summary: only numbers the control plane actually has (environments, domain states, connector).
function LiveSummary({ c }) {
  const domains = c.envs.flatMap((e) => e.servers);
  const running = domains.filter((s) => s.state === "running").length;
  const stopped = domains.filter((s) => s.state === "stopped").length;
  const unknown = domains.length - running - stopped;
  const prd = c.envs.filter((e) => e.tier === "PRD");
  const con = c.connector;
  return (
    <div className="grid grid-cols-2 gap-4 @4xl:grid-cols-4">
      <Kpi icon={Layers} label="Environments" value={c.envs.length} suffix={` · ${prd.length} production`} foot={`${new Set(domains.map((s) => s.host)).size} servers, ${domains.length} domains`} tone="cyan" />
      <Kpi icon={Server} label="Domains running" value={running} suffix={` of ${domains.length}`} foot={`${stopped} stopped · ${unknown} unknown or unreachable`} tone="apricot" arc={domains.length ? (running / domains.length) * 100 : 0} />
      <Kpi icon={Cable} label="Connector" text={con.status === "offline" ? "Offline" : con.status === "update" ? "Update ready" : "Online"} foot={con.count ? `${con.id}${con.version ? ` · v${con.version}` : ""} · seen ${con.lastSeen}` : "No connector registered yet"} tone={con.status === "offline" ? "orange" : "cyan"} />
      <Kpi icon={CalendarClock} label="Last status check" text={c.checking ? "Running" : c.lastAuto ? ago(c.lastAuto) : "Not yet"} foot={con.certDays != null ? `Connector certificate: ${con.certDays} days left` : "Automatic checks every 10 minutes"} tone="hero" />
    </div>
  );
}

const KPI_TONE = {
  cyan: { text: "text-accent day:text-teal", icon: "bg-accent/10 text-accent ring-accent/25 day:bg-[linear-gradient(135deg,#FFFFFF,#E6F4F1)] day:text-teal day:ring-teal/25", tile: "day:bg-[linear-gradient(165deg,#FFFFFF_45%,#E6F4F1)]", ring: "#0B89A1" },
  apricot: { text: "text-fg", icon: "bg-apricot/10 text-warn ring-apricot/25 day:bg-[linear-gradient(135deg,#FDD8B9,#FBB273)] day:text-navy day:ring-apricot/50", tile: "day:bg-[linear-gradient(165deg,#FFFFFF_45%,#F2E8C4)]", ring: "#FBB273" },
  orange: { text: "text-risk day:text-navy", icon: "bg-orange/10 text-risk ring-orange/30 day:bg-white/75 day:text-orange day:ring-white", tile: "day:bg-[linear-gradient(160deg,#FDD8B9,#FBB273)] day:border-apricot", ring: "#FA9137" },
  hero: { text: "text-accent", icon: "bg-accent/10 text-accent ring-accent/25", tile: "", ring: "#00C6FF" },
};
function Kpi({ icon: Icon, label, value, text, suffix = "", foot, tone, arc, onClick }) {
  const t = KPI_TONE[tone];
  const island = tone === "hero";
  return (
    <motion.button onClick={onClick} whileHover={{ y: -2 }} data-theme={island ? "night" : undefined}
      className={cx("relative flex flex-col overflow-hidden rounded-2xl border border-line p-5 text-left transition-colors hover:border-teal/50", island ? "bg-[linear-gradient(150deg,#0B89A1,#003C51_70%)] text-fg shadow-[0_18px_40px_-20px_#003C51]" : "bg-surface shadow-card", t.tile)}>
      <div className="flex items-center gap-2.5 text-[12px] text-muted">
        <span className={cx("grid size-7 shrink-0 place-items-center rounded-lg ring-1", t.icon)}><Icon className="size-3.5" strokeWidth={2.2} /></span>
        <span className="min-w-0 truncate">{label}</span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        {text ? <span className={cx("font-display text-[28px] font-extrabold leading-none", t.text)}>{text}</span>
          : <><AnimatedNumber value={value} className={cx("font-display text-[32px] font-extrabold leading-none", t.text)} /><span className="mb-0.5 text-[13px] text-muted/80">{suffix}</span></>}
        {arc != null && (
          <svg viewBox="0 0 36 36" className="mb-0.5 ml-auto size-10 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="3" className="text-fg" />
            <motion.circle cx="18" cy="18" r="15" fill="none" stroke={t.ring} strokeWidth="3" strokeLinecap="round" strokeDasharray="94.2" initial={{ strokeDashoffset: 94.2 }} animate={{ strokeDashoffset: 94.2 * (1 - arc / 100) }} transition={{ duration: 1.2, ease }} />
          </svg>
        )}
      </div>
      <div className="mt-2 truncate text-[11.5px] text-muted/80">{foot}</div>
    </motion.button>
  );
}

function ClientHeader({ c, onOpen }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="grid size-8 place-items-center rounded-lg bg-navy font-mono text-[10.5px] font-semibold text-cyan ring-1 ring-fg/10">{c.code}</span>
      <h3 className="font-display text-[17px] font-bold">{c.name}</h3>
      {c.cloud && <Pill icon={Cloud}>{c.cloud}{c.region ? ` · ${c.region}` : ""}</Pill>}
      <span className="flex items-center gap-1.5 whitespace-nowrap text-[12px] text-muted/70">
        <span className={cx("size-1.5 rounded-full", c.connector.status === "online" ? "bg-accent" : c.connector.status === "update" ? "bg-apricot" : "border border-muted")} />
        {c.connector.status === "offline" ? `connector offline · last seen ${c.connector.lastSeen}` : "connector online"}
      </span>
      <Button size="sm" variant="ghost" className="ml-auto" iconRight={ArrowRight} onClick={onOpen}>Work on {c.name.split(" ")[0]}</Button>
    </div>
  );
}

// ── Carousel of large environment tiles (2–3 per row, scroll left/right) ────────────────────────
function EnvCarousel({ envs, client, pending, onOpen, onAction }) {
  const ref = useRef(null);
  const [st, setSt] = useState({ first: 0, per: 3, left: false, right: true });
  const measure = () => {
    const el = ref.current; if (!el || !el.firstChild) return;
    const w = el.firstChild.offsetWidth + 16;
    const per = Math.max(1, Math.round(el.clientWidth / w));
    setSt({ first: Math.round(el.scrollLeft / w), per, left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => { measure(); window.addEventListener("resize", measure); return () => window.removeEventListener("resize", measure); }, [envs.length]);
  const by = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth, behavior: "smooth" });
  const pages = Math.max(1, Math.ceil(envs.length / st.per));
  const page = Math.min(pages - 1, Math.round(st.first / st.per));
  return (
    <div className="relative">
      <div ref={ref} onScroll={measure} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {envs.map((e, i) => (
          <div key={e.id} className="w-full shrink-0 snap-start @3xl:w-[calc((100%-16px)/2)] @5xl:w-[calc((100%-32px)/3)]">
            <EnvTile e={e} client={client} i={i} pending={pending.some((p) => p.client === client.name && p.env === e.name)} onOpen={() => onOpen(e)} onAction={(a) => onAction(e, a)} />
          </div>
        ))}
      </div>
      {envs.length > st.per && <>
        <CarouselArrow side="left" show={st.left} onClick={() => by(-1)} />
        <CarouselArrow side="right" show={st.right} onClick={() => by(1)} />
      </>}
      <div className="mt-3 flex items-center gap-3 text-[11.5px] text-muted/80">
        <span className="tabular">{Math.min(st.first + 1, envs.length)}–{Math.min(st.first + st.per, envs.length)} of {envs.length}</span>
        {pages > 1 && <span className="flex gap-1.5">{Array.from({ length: pages }, (_, p) => (
          <button key={p} aria-label={`Page ${p + 1}`} onClick={() => ref.current?.scrollTo({ left: p * ref.current.clientWidth, behavior: "smooth" })}
            className={cx("h-1.5 rounded-full transition-all", p === page ? "w-6 bg-accent day:bg-teal" : "w-1.5 bg-fg/20 hover:bg-fg/40")} />
        ))}</span>}
        {pages > 1 && <span className="ml-auto">Scroll or use the arrows for more environments</span>}
      </div>
    </div>
  );
}
function CarouselArrow({ side, show, onClick }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClick} aria-label={side === "left" ? "Previous environments" : "Next environments"}
          className={cx("absolute top-[calc(50%-18px)] z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-fg/10 bg-raised text-fg shadow-pop hover:border-teal day:bg-white", side === "left" ? "-left-4" : "-right-4")}>
          {side === "left" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

const TILE_ACTIONS = [
  { id: "start", label: "Start all", icon: Play }, { id: "stop", label: "Stop all", icon: Square, danger: true },
  { id: "clearcache", label: "Clear cache", icon: Eraser }, { id: "ping", label: "Test connection", icon: Cable },
];
function EnvTile({ e, client, i, pending, onOpen, onAction }) {
  const x = useMemo(() => envExtras(e), [e.id]);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const shownServers = x.servers.slice(0, 4);
  const met = x.uptime == null || x.uptime >= x.sla;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease, delay: i * 0.04 }}
      role="button" tabIndex={0} onClick={onOpen} onKeyDown={(ev) => ev.key === "Enter" && onOpen()}
      className={cx("group relative flex h-full min-h-[430px] cursor-pointer flex-col rounded-2xl border bg-surface p-5 text-left shadow-card transition-colors hover:border-teal/60",
        e.window ? "border-accent/40 day:bg-[linear-gradient(170deg,#FFFFFF_60%,#E6F4F1)]" : "border-fg/[0.08]", pending && "border-dashed border-apricot")}>
      {/* header */}
      <div className="flex items-center gap-2">
        <span className="font-display text-[17px] font-bold text-fg">{e.name}</span>
        <TierTag tier={e.tier} />
        {pending && <Pill tone="apricot">Pending removal</Pill>}
        <span className="ml-auto flex items-center gap-1.5 text-[12px] text-muted"><StateDot state={e.state} size={7} />{STATE_LABEL[e.state]}</span>
        <div className="relative" onClick={(ev) => ev.stopPropagation()}>
          <button onClick={() => setMenu((m) => !m)} aria-label={`Actions for ${e.name}`} aria-expanded={menu}
            className={cx("grid size-8 place-items-center rounded-lg border text-muted transition-colors hover:text-fg", menu ? "border-teal bg-mint/10 text-fg day:bg-mint" : "border-fg/10 day:bg-white")}>
            <Menu className="size-4" />
          </button>
          <AnimatePresence>
            {menu && <>
              <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
              <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}
                className="absolute right-0 top-10 z-30 w-56 rounded-xl border border-fg/10 bg-raised p-1.5 shadow-pop">
                <div className="px-2.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted/70">Maintenance</div>
                {TILE_ACTIONS.map((a) => (
                  <button key={a.id} onClick={() => { setMenu(false); onAction(a); }}
                    className={cx("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] hover:bg-fg/[0.06]", a.danger ? "text-risk day:text-navy" : "text-fg")}>
                    <a.icon className={cx("size-4", a.danger ? "text-risk day:text-orange" : "text-muted")} />{a.label}
                    {a.danger && e.tier === "PRD" && <span className="ml-auto text-[10.5px] text-muted/70">confirm</span>}
                  </button>
                ))}
                <div className="my-1 h-px bg-fg/[0.08]" />
                <button onClick={() => { try { navigator.clipboard?.writeText(`https://pegasus.beastute.com/#/${envLink(client.id, e.id)}`); } catch {} setCopied(true); setTimeout(() => { setCopied(false); setMenu(false); }, 900); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-fg hover:bg-fg/[0.06]">
                  {copied ? <Check className="size-4 text-accent" /> : <Link2 className="size-4 text-muted" />}{copied ? "Link copied" : "Copy link"}
                </button>
                <div className="px-2.5 pb-1 pt-1 text-[11px] text-muted/70">Single servers: open the environment</div>
              </motion.div>
            </>}
          </AnimatePresence>
        </div>
      </div>
      <div className="mt-0.5 text-[11.5px] text-muted/75">{x.live ? `${e.hosts.length} servers · ${x.servers.length} domains` : `${x.servers.length} servers · ${client.cloud} ${client.region}`}</div>

      {/* status row */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <Mini label="Patching">{x.live
          ? <span className="text-[11.5px] text-muted/80">See Patching</span>
          : e.behind
          ? <span className={cx("font-mono text-[12.5px] font-semibold", e.maxCvss >= 9 ? "text-risk day:text-navy" : "text-warn day:text-navy")}>CVSS {e.maxCvss.toFixed(1)}<span className="block font-sans text-[11px] font-normal text-muted/80">{e.behind} behind</span></span>
          : <span className="flex items-center gap-1 text-[12.5px] font-medium text-accent day:text-teal"><Check className="size-3.5" />Current</span>}
        </Mini>
        <Mini label="Uptime 30d">
          <span className={cx("text-[12.5px] font-semibold tabular", met ? "text-fg" : "text-risk day:text-navy")}>{x.uptime != null ? `${x.uptime}%` : "–"}</span>
          <span className="block text-[11px] text-muted/80">SLA {x.sla}%</span>
        </Mini>
        <Mini label="Schedule"><span className="line-clamp-2 text-[11.5px] leading-[15px] text-fg">{x.schedule}</span></Mini>
      </div>

      {/* servers */}
      <div className="mt-3.5">
        <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted/70">Servers</div>
        <div className="divide-y divide-fg/[0.06] rounded-xl border border-fg/[0.08] bg-well day:bg-white">
          {shownServers.map((s) => {
            const cpu = s.cpu ? Math.round(s.cpu[s.cpu.length - 1]) : null;
            return (
              <div key={s.key || s.host} className="flex items-center gap-2 px-2.5 py-1.5 text-[11.5px]">
                <StateDot state={s.state} size={6} />
                <span className="truncate font-mono text-fg">{s.host}</span>
                <span className="truncate text-muted/70">{ROLE_LABEL[s.role]}</span>
                <span className={cx("ml-auto tabular", cpu >= 85 ? "font-semibold text-risk day:text-navy" : "text-muted")}>{x.live ? (s.domain || "") : s.state === "running" ? `${cpu}% CPU` : "–"}</span>
              </div>
            );
          })}
          {x.servers.length > 4 && <div className="px-2.5 py-1.5 text-[11px] text-muted/70">+{x.servers.length - 4} more</div>}
        </div>
      </div>

      {/* alerts + tasks */}
      <div className="mt-3.5 grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted/70"><CircleAlert className="size-3" />Alerts {x.alerts.length > 0 && <span className="rounded-full bg-orange px-1.5 text-[10px] text-navy">{x.alerts.length}</span>}</div>
          {x.alerts.length ? x.alerts.slice(0, 2).map((a) => (
            <div key={a.text} className="flex items-start gap-1.5 text-[11.5px] leading-[15px] text-fg"><span className={cx("mt-1 size-1.5 shrink-0 rounded-full", a.sev === "critical" ? "bg-orange" : a.sev === "warning" ? "bg-apricot" : "bg-silver")} />{a.text}</div>
          )) : <div className="text-[11.5px] text-muted/70">None</div>}
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted/70"><ListTodo className="size-3" />{x.live ? "Manual steps" : "Pending tasks"}</div>
          {x.tasks.length ? x.tasks.slice(0, 2).map((t) => (
            <div key={t} className="flex items-start gap-1.5 text-[11.5px] leading-[15px] text-fg"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />{t}</div>
          )) : <div className="text-[11.5px] text-muted/70">None</div>}
        </div>
      </div>

      {/* jira + footer */}
      <div className="mt-auto pt-3.5">
        <div className="rounded-xl border border-fg/[0.08] px-3 py-2 day:bg-white">
          <div className="mb-0.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted/70"><Ticket className="size-3" />Active Jira ticket</div>
          {x.jira ? <JiraRow j={x.jira} /> : <div className="text-[12px] text-muted/70">No open change ticket</div>}
        </div>
        <div className="mt-3 flex items-center text-[12px] font-medium text-accent day:text-teal">
          {e.window ? <span className="flex items-center gap-1.5"><CalendarClock className="size-3.5" />{e.window}</span> : <span className="text-muted/70">{e.note || ""}</span>}
          <span className="ml-auto inline-flex items-center gap-1 opacity-80 group-hover:opacity-100">Details, monitoring and logs<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
        </div>
      </div>
    </motion.div>
  );
}
function Mini({ label, children }) {
  return (
    <div className="rounded-xl border border-fg/[0.08] bg-well px-2.5 py-2 day:bg-white">
      <div className="mb-0.5 text-[10.5px] text-muted/70">{label}</div>
      {children}
    </div>
  );
}

// ── Connect OCI for live data (Parker first): authenticate with OCIDs and an API key ─────────────
const OCI_STEPS = [
  "Signing the request with API key 4f:9a:21:…:c8:0e",
  "Tenancy found · parkeroci (us-ashburn-1)",
  "Compartment PeopleSoft · 17 compute instances, 17 boot volumes, 15 block volumes",
  "Monitoring: oci_computeagent metrics readable · Connector Hub stream pegasus-metrics",
];
function OciConnect({ open, c, onClose }) {
  const conf = (c && ociConnection[c.id]) || { tenancy: "", user: "", fingerprint: "", region: c?.region || "", compartment: "" };
  const [phase, setPhase] = useState("form");
  const [n, setN] = useState(0);
  useEffect(() => { if (open) { setPhase(ociConnection[c?.id] ? "live" : "form"); setN(0); } }, [open]);
  const test = () => {
    setPhase("testing"); setN(0);
    OCI_STEPS.forEach((_, i) => setTimeout(() => setN(i + 1), 550 * (i + 1)));
    setTimeout(() => setPhase("live"), 550 * (OCI_STEPS.length + 1));
  };
  return (
    <Drawer open={open} onClose={onClose} width={600} eyebrow={`Live data · ${c?.name || ""}`} title="Connect to OCI"
      footer={<><span className="text-[11.5px] text-muted/80">Read-only: Pegasus reads instances, volumes and metrics. Nothing is changed in OCI.</span>
        <Button variant="primary" className="ml-auto shrink-0" icon={phase === "testing" ? Loader2 : Cable} onClick={test} disabled={phase === "testing"}>{phase === "live" ? "Test again" : "Test and connect"}</Button></>}>
      <div className="space-y-4">
        {phase === "live" && (
          <div className="flex items-center gap-3 rounded-xl border border-teal/40 bg-[linear-gradient(100deg,#0B89A126,transparent)] px-4 py-3 day:bg-[linear-gradient(100deg,#E6F4F1,#FFFFFF)]">
            <span className="grid size-8 place-items-center rounded-full bg-teal text-white"><Check className="size-4" /></span>
            <div className="text-[12.5px]"><div className="font-medium text-fg">Authenticated · live data on</div><div className="text-muted/80">{conf.instances || 17} instances · metrics every minute · last sync {conf.synced || "just now"}</div></div>
          </div>
        )}
        <Field label="Tenancy OCID"><input defaultValue={conf.tenancy} placeholder="ocid1.tenancy.oc1..aaaa…" className={cx(inputCls, "font-mono text-[12px]")} /></Field>
        <Field label="User OCID" hint="A dedicated read-only user in a group with inspect/read policies on the PeopleSoft compartment."><input defaultValue={conf.user} placeholder="ocid1.user.oc1..aaaa…" className={cx(inputCls, "font-mono text-[12px]")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="API key fingerprint"><input defaultValue={conf.fingerprint} className={cx(inputCls, "font-mono text-[12px]")} /></Field>
          <Field label="Region"><input defaultValue={conf.region} className={cx(inputCls, "font-mono text-[12px]")} /></Field>
        </div>
        <Field label="Compartment OCID"><input defaultValue={conf.compartment} placeholder="ocid1.compartment.oc1..aaaa…" className={cx(inputCls, "font-mono text-[12px]")} /></Field>
        <Field label="Private key" hint="Stored encrypted in the Pegasus vault; never shown again."><div className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-fg/20 px-3 text-[12.5px] text-muted"><KeyIcon className="size-4" />{conf.fingerprint ? "pegasus-parker.pem · uploaded Oct 14" : "Drop a .pem file or click to choose"}</div></Field>
        {phase !== "form" && (
          <div className="space-y-1.5 rounded-xl border border-fg/[0.08] bg-well p-3.5 day:bg-white">
            {OCI_STEPS.map((s, i) => (
              <div key={s} className={cx("flex items-center gap-2 text-[12.5px]", (phase === "live" || i < n) ? "text-fg" : "text-muted/50")}>
                {phase === "live" || i < n ? <Check className="size-3.5 text-accent" /> : i === n ? <Loader2 className="size-3.5 animate-spin text-accent" /> : <span className="size-3.5" />}{s}
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ── Add servers (unchanged) ─────────────────────────────────────────────────────────────────────
function Discover({ open, onClose }) {
  const [phase, setPhase] = useState("form");
  const [trusted, setTrusted] = useState(false);
  const [csv, setCsv] = useState(false);
  const go = () => { setPhase("scanning"); setTimeout(() => setPhase("done"), 1800); };
  const found = [
    { ip: "10.0.4.21", host: "pkhuatweb01", owner: "psadm2", fp: "SHA256:8vQe…nT2w", domains: ["web · peoplesoft"] },
    { ip: "10.0.4.22", host: "pkhuatapp01", owner: "psadm2", fp: "SHA256:Hq3k…Zp7c", domains: ["app · HCMUAT", "prcs · PSUNX"] },
  ];
  return (
    <Drawer open={open} onClose={() => { onClose(); setPhase("form"); setTrusted(false); }} width={620} eyebrow="Add servers" title="Discover from IP addresses"
      footer={phase === "done" && trusted
        ? <><span className="text-[11.5px] text-muted/80">Nothing is saved until you click Import.</span><Button variant="primary" className="ml-auto" iconRight={ArrowRight}>Add ticked domains</Button></>
        : <><span className="text-[11.5px] text-muted/80">The connector signs in to each server; nothing on the servers changes. No cloud IDs needed, so on-prem works too.</span><Button variant="primary" className="ml-auto shrink-0" icon={ScanLine} onClick={go} disabled={phase === "scanning"}>Scan servers</Button></>}>
      <div className="space-y-5">
        <Field label="IP addresses" hint="Web, app server and process scheduler servers. Add :port if SSH isn't on 22.">
          <input defaultValue="10.0.4.21, 10.0.4.22" className={cx(inputCls, "font-mono text-[12.5px]")} />
        </Field>
        <Field label="OS users (optional)" hint="Blank: whoever runs PeopleSoft, else psadm1, psadm2, psadm3.">
          <input placeholder="psadm2" className={cx(inputCls, "font-mono text-[12.5px]")} />
        </Field>
        <AnimatePresence mode="wait">
          {phase === "scanning" && (
            <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 rounded-xl border border-fg/10 bg-fg/[0.03] p-4 text-[13px] text-muted">
              <Loader2 className="size-4 animate-spin text-accent" />Connecting over SSH, finding the PeopleSoft owner, reading PS_HOME and the domains…
            </motion.div>
          )}
          {phase === "done" && (
            <motion.div key="d" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {found.map((f, i) => (
                <motion.div key={f.ip} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }} className="rounded-xl border border-fg/10 bg-navy/25 p-4 day:bg-[linear-gradient(160deg,#FFFFFF,#E6F4F1)]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[13px] text-fg">{f.host}</span><span className="font-mono text-[11.5px] text-muted/80">{f.ip}</span>
                    {trusted && <Pill tone="cyan" icon={Check} className="ml-auto">Owner {f.owner}</Pill>}
                  </div>
                  {!trusted ? (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] text-muted/75">
                      <Fingerprint className="size-3.5 text-warn" />New host key <span className="font-mono text-fg">{f.fp}</span>. Check it matches the server, then trust it.
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {f.domains.map((d) => <label key={d} className="flex items-center gap-2 rounded-lg border border-fg/10 bg-well px-2.5 py-1.5 text-[12px]"><span className="grid size-4 place-items-center rounded bg-accent text-on-accent"><Check className="size-3" strokeWidth={3} /></span>{d}</label>)}
                    </div>
                  )}
                </motion.div>
              ))}
              {!trusted && <Button size="sm" variant="primary" icon={Fingerprint} onClick={() => setTrusted(true)}>Trust keys and scan</Button>}
              {trusted && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Field label="Environment name"><input defaultValue="HCM UAT" className={inputCls} /></Field>
                  <Field label="Tier"><select className={inputCls}><option className="bg-raised">UAT</option><option className="bg-raised">PRD</option></select></Field>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="rounded-xl border border-fg/[0.08]">
          <button onClick={() => setCsv((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[12.5px] text-muted">
            <FileSpreadsheet className="size-4 text-muted/80" />Or import a CSV (replaces this client's whole inventory)<ChevronDown className={cx("ml-auto size-4 transition", csv && "rotate-180")} />
          </button>
          <AnimatePresence initial={false}>
            {csv && (
              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="space-y-2 px-4 pb-4">
                  <p className="text-[11.5px] text-muted/80">One row per server and domain. Columns: environment, tier, host, ip, role (app, prcs or web), os_user, domain, env_script.</p>
                  <textarea placeholder="environment,tier,host,ip,role,os_user,domain,env_script" className={cx(inputCls, "h-24 py-2 font-mono text-[12px]")} />
                  <Button size="sm">Import CSV</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Drawer>
  );
}

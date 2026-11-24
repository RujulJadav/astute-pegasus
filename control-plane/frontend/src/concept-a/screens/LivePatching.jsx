// Patching on live data: the same layout as the design (lifecycle strip, ranked updates, plan bar, change tickets,
// Oracle releases, automatic checks), driven by the control plane:
//
//   GET  /api/clients/<cid>/patching?environment=…[&refresh=1]   levels, outstanding updates, staged files, tickets
//   POST /api/clients/<cid>/patching/check                          read installed levels (then Oracle's latest)
//   POST /api/clients/<cid>/patching/lookup                         ask Oracle again (skip the 12-hour cache)
//   POST /api/clients/<cid>/patching/stage                          download on the connector, stage on each server
//   POST /api/clients/<cid>/change-requests                         raise the Jira / ServiceNow ticket
//   POST /api/change-requests/<id>/withdraw
//   POST /api/clients/<cid>/patching/apply                          the maintenance window
//   GET|PUT /api/clients/<cid>/patch-watch, /patch-settings          automatic checks, cadence
//
// The backend applies one update, or every outstanding update, per window and per ticket ("scope"), so the
// selection here is one row or all of them.
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw, Search, ChevronDown, ChevronRight, Check, Play, FileText, TriangleAlert, ShieldCheck, Clock3, PlugZap, Archive,
  ListChecks, Download, Ticket, Bot, Loader2, CalendarDays, Globe2, ExternalLink, CircleAlert, Server,
} from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { severity } from "../../shared/data.js";
import { Panel, PanelHead, Button, Pill, PageHeader, ScoreDial, Segmented, SEV, Tooltip, ExtLink, ease, Confirm, Toggle, inputCls, Drawer, Field } from "../kit.jsx";
import { useShell } from "../App.jsx";
import { get, post, put } from "../../api/client.js";
import { useLive, ago } from "../../api/live.jsx";
import JobConsole from "../parts/JobConsole.jsx";

const COMP_TITLE = { os: "OS updates", jdk: "JDK", weblogic: "WebLogic", dbclient: "Oracle Database Client", tuxedo: "Tuxedo" };
const RANK = { needed: 0, deferred: 1, ok: 2, "no-target": 3 };
const TICKET_TONE = { approved: "cyan", pending: "apricot", applying: "cyan", applied: "teal", rejected: "orange", stale: "neutral", failed: "orange", withdrawn: "neutral", superseded: "neutral" };
const TICKET_LABEL = { approved: "Approved", pending: "Waiting for approval", applying: "Applying", applied: "Applied", rejected: "Declined", stale: "Plan changed", failed: "Apply failed", withdrawn: "Withdrawn", superseded: "Replaced" };

// Rows "by component": one per (component, update key), across the environment's servers.
function groupRows(view) {
  const adv = view?.advisory?.components || {};
  const map = new Map();
  for (const h of view?.hosts || []) {
    for (const it of h.items) {
      const id = it.key ? `${it.component}~${it.key}` : `${it.component}~${it.status}~${it.installed}`;
      let r = map.get(id);
      if (!r) {
        const a = adv[it.component];
        r = { id, scope: it.key ? `${it.component}~${it.key}` : null, component: it.component, name: COMP_TITLE[it.component] || it.component,
          latest: it.latest_label || it.target || "", installed: new Set(), hosts: [], hostKeys: [], staged: 0, needed: 0, status: it.status,
          patch: it.patch_number || "", platform: it.platform || "", source: it.source || "", detail: it.detail || "", released: it.released || "",
          cvss: a?.max || 0, cves: a?.cves || [], advTitle: a?.title };
        map.set(id, r);
      }
      r.installed.add(it.installed);
      r.hosts.push(h.host);
      r.hostKeys.push(h.host_key);
      if (it.status === "needed") { r.needed++; if (it.staged) r.staged++; }
      if (RANK[it.status] < RANK[r.status]) r.status = it.status;
    }
  }
  return [...map.values()].map((r) => ({ ...r, installed: [...r.installed] }))
    .sort((a, b) => RANK[a.status] - RANK[b.status] || b.cvss - a.cvss || a.name.localeCompare(b.name));
}

export default function LivePatching() {
  const { scope } = useShell();
  const { clients, loading } = useLive();
  const client = clients.find((c) => c.id === scope) || clients[0];
  const envs = client?.envs || [];
  const [envName, setEnvName] = useState("");
  useEffect(() => {
    if (!envs.length) return;
    if (!envs.some((e) => e.name === envName)) setEnvName((envs.find((e) => e.tier !== "PRD") || envs[0]).name);
  }, [client?.id, envs.length]);

  if (!client) return <Empty title="Patching" text={loading ? "Loading customers…" : "No customers yet."} />;
  if (!envs.length) return <Empty title={`Patching · ${client.name}`} text="This customer has no environments yet. Add servers first (Fleet)." />;
  if (!envName) return null;
  return <EnvPatching key={`${client.id}|${envName}`} client={client} envName={envName} envs={envs} onEnv={setEnvName} />;
}

function Empty({ title, text }) {
  return (
    <div>
      <PageHeader eyebrow={<><ShieldCheck className="size-3.5" />Patching</>} title={title} />
      <div className="rounded-2xl border border-dashed border-fg/15 px-5 py-10 text-center text-[13px] text-muted/80">{text}</div>
    </div>
  );
}

function EnvPatching({ client, envName, envs, onEnv }) {
  const cid = client.id;
  const env = envs.find((e) => e.name === envName);
  const [view, setView] = useState(null);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState(null);
  const [tab, setTab] = useState("component");
  const [sel, setSel] = useState(new Set());
  const [open, setOpen] = useState(null);
  const [job, setJob] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [reboot, setReboot] = useState(true);
  const [envMenu, setEnvMenu] = useState(false);

  const load = useCallback(async (refresh) => {
    try {
      const v = await get(`/api/clients/${cid}/patching?environment=${encodeURIComponent(envName)}${refresh ? "&refresh=1" : ""}`);
      setView(v); setErr("");
      return v;
    } catch (e) { setErr(e.message); }
  }, [cid, envName]);
  useEffect(() => { load(true); }, [load]);

  const rows = useMemo(() => groupRows(view), [view]);
  const needed = rows.filter((r) => r.status === "needed" && r.scope);
  // Keep the selection to rows that are still outstanding; start with everything outstanding selected.
  useEffect(() => {
    setSel((s) => {
      const ids = new Set(needed.map((r) => r.id));
      const kept = new Set([...s].filter((x) => ids.has(x)));
      return kept.size ? kept : ids;
    });
  }, [view]);

  const picked = needed.filter((r) => sel.has(r.id));
  const scopeId = picked.length && picked.length === needed.length ? "all" : picked.length === 1 ? picked[0].scope : null;
  const crs = view?.change_requests || [];
  const cr = scopeId ? crs.find((c) => c.scope === scopeId && ["pending", "approved", "applying"].includes(c.status)) : null;
  const approval = view?.approval || {};
  const toStage = picked.reduce((n, r) => n + (r.needed - r.staged), 0);
  const servers = new Set(picked.flatMap((r) => r.hosts)).size;
  const top = picked.reduce((m, r) => Math.max(m, r.cvss), 0);
  const levelsRead = (view?.hosts || []).map((h) => h.checked).filter(Boolean).sort()[0];
  const prd = view?.tier && ["PRD", "PROD", "PRODUCTION"].includes(String(view.tier).toUpperCase());

  const act = async (fn, after) => {
    setNotice(null);
    try {
      const r = await fn();
      if (r?.job) setJob({ id: r.job, what: after?.what || "Job", env: `${client.name} · ${envName}`, by: "you", onDone: () => load() });
      if (after?.notice) setNotice({ text: after.notice(r) });
      await load();
      return r;
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    }
  };
  const check = () => act(() => post(`/api/clients/${cid}/patching/check`, { environment: envName }), { what: "Check patch levels" });
  const lookup = () => act(() => post(`/api/clients/${cid}/patching/lookup`, {}), { what: "Look up Oracle's latest" });
  const stage = (rowsToStage) => {
    const all = rowsToStage === "all";
    const items = all ? [] : rowsToStage.flatMap((r) => (view?.hosts || []).flatMap((h) => h.items
      .filter((it) => it.status === "needed" && !it.staged && `${it.component}~${it.key}` === r.scope).map((it) => ({ host_key: h.host_key, key: it.key }))));
    return act(() => post(`/api/clients/${cid}/patching/stage`, { environment: envName, ...(all ? { all: true } : { items }) }), { what: "Download and stage" });
  };
  const stageOne = (host, it) => act(() => post(`/api/clients/${cid}/patching/stage`, { environment: envName, items: [{ host_key: host.host_key, key: it.key }] }), { what: `Download ${COMP_TITLE[it.component]} on ${host.host}` });
  const withdraw = (c) => act(() => post(`/api/change-requests/${c.id}/withdraw`, {}), { notice: () => `${c.jira_key} withdrawn.` });
  const apply = async (confirmed) => {
    setConfirmApply(false);
    try {
      const r = await post(`/api/clients/${cid}/patching/apply`, { environment: envName, scope: scopeId, change_request: cr?.id, reboot, confirm: confirmed ? envName : undefined });
      setNotice(null);
      setJob({ id: r.job, what: scopeId === "all" ? "Apply all outstanding updates" : `Apply ${picked[0]?.name}`, env: `${client.name} · ${envName}`, by: "you", onDone: () => load() });
      await load();
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
    }
  };
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const subParts = [
    env?.hosts?.length ? `${env.hosts.length} server${env.hosts.length === 1 ? "" : "s"}` : null,
    (view?.hosts || []).find((h) => h.pt) ? `PeopleTools ${(view.hosts.find((h) => h.pt)).pt}` : null,
    levelsRead ? `levels read ${ago(levelsRead)}` : "levels not read yet",
    view?.catalog_checked ? `Oracle looked up ${ago(view.catalog_checked)}` : "Oracle not looked up yet",
  ].filter(Boolean);

  return (
    <div className="@container">
      <PageHeader
        eyebrow={<><ShieldCheck className="size-3.5" />Patching{view?.cpu ? ` · ${cpuName(view.cpu.last)} CPU` : ""}</>}
        title={<span className="relative flex items-center gap-3"><span>{`${client.name} · ${envName}`}</span>
          <button onClick={() => setEnvMenu((o) => !o)} className="grid size-8 place-items-center rounded-lg border border-fg/10 bg-fg/[0.04] text-muted hover:text-fg" aria-label="Switch environment"><ChevronDown className="size-4" /></button>
          {envMenu && (
            <div className="absolute left-0 top-12 z-30 w-72 rounded-xl border border-fg/10 bg-raised p-1.5 text-[13px] font-normal tracking-normal shadow-pop">
              {envs.map((e) => (
                <button key={e.name} onClick={() => { setEnvMenu(false); onEnv(e.name); }} className={cx("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-sans hover:bg-fg/[0.06]", e.name === envName && "text-accent")}>
                  <span className="font-medium">{e.name}</span><span className="text-[11.5px] text-muted/80">{e.tier}</span>{e.name === envName && <Check className="ml-auto size-4" />}
                </button>
              ))}
            </div>
          )}
        </span>}
        sub={subParts.join(" · ")}
        actions={<>
          <Tooltip content="Ask Oracle again instead of using the connector's 12-hour cache"><Button icon={Search} onClick={lookup}>Look up latest again</Button></Tooltip>
          <Button variant="primary" icon={RefreshCw} onClick={check}>Check patch levels</Button>
        </>}
      />

      {err && <Banner tone="error">{err}</Banner>}
      {notice && <Banner tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Banner>}
      {view?.oracle_error && <Banner tone="warn">Oracle lookup: {view.oracle_error}</Banner>}
      {(view?.hosts || []).filter((h) => h.error).map((h) => <Banner key={h.host} tone="warn">{h.host}: {h.error}</Banner>)}
      {approval.error && <Banner tone="warn">{approval.system}: {approval.error}</Banner>}

      {view && <Lifecycle view={view} scopeId={scopeId} picked={picked} cr={cr} toStage={toStage} levelsRead={levelsRead}
        onDownload={() => stage(picked)} onApply={() => setConfirmApply(true)} />}

      <div className="mt-5 grid grid-cols-1 gap-5 @5xl:grid-cols-12">
        <div className="space-y-5 @5xl:col-span-8">
          <Panel>
            <PanelHead icon={ListChecks} title="Updates for this environment" meta={tab === "component" ? "Outstanding first, highest security score first" : "Read from each server"}
              action={<>
                <Segmented size="sm" layoutId="lpview" value={tab} onChange={setTab} options={[{ value: "component", label: "By component" }, { value: "server", label: "By server" }]} />
                <Cadence cid={cid} cadence={view?.settings?.cadence} onSaved={() => load()} onError={(m) => setNotice({ tone: "error", text: m })} />
              </>} />
            {!view ? <div className="flex items-center gap-2 px-6 pb-6 text-[12.5px] text-muted"><Loader2 className="size-4 animate-spin text-accent" />Loading…</div>
              : !rows.length ? (
                <div className="mx-5 mb-5 rounded-xl border border-dashed border-fg/15 px-5 py-8 text-center text-[13px] text-muted/80">
                  Pegasus hasn't read the installed levels on {envName} yet. <button onClick={check} className="text-accent hover:underline">Check patch levels</button>
                </div>
              ) : tab === "server" ? <ByServer view={view} onStage={stageOne} onStageAll={() => stage("all")} />
                : <>
                  <div className="grid grid-cols-[28px_52px_minmax(0,1.5fr)_minmax(0,1.6fr)_84px_104px] items-center gap-x-3 border-y border-fg/[0.06] bg-fg/[0.02] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted/70">
                    <span /><span>CVSS</span><span>Component</span><span>Latest · installed</span><span>Fixes</span><span className="text-right">Status</span>
                  </div>
                  <ul>{rows.map((r, i) => <Row key={r.id} r={r} i={i} checked={sel.has(r.id)} onToggle={() => toggle(r.id)} expanded={open === r.id}
                    onExpand={() => setOpen(open === r.id ? null : r.id)} onStage={() => stage([r])} advUrl={view.advisory?.url} />)}</ul>
                </>}
            {view && rows.length > 0 && <PlanBar picked={picked} needed={needed} scopeId={scopeId} servers={servers} top={top} cr={cr} approval={approval}
              onAll={() => setSel(new Set(needed.map((r) => r.id)))} onRequest={() => setRequesting(true)} />}
          </Panel>
          <Tickets crs={crs} approval={approval} client={client} onCheck={() => { setNotice(null); load(true); }} onWithdraw={withdraw} onRequest={() => setRequesting(true)} />
        </div>

        <div className="space-y-5 @5xl:col-span-4">
          <Preflight client={client} view={view} picked={picked} toStage={toStage} cr={cr} approval={approval} levelsRead={levelsRead} />
          <Panel>
            <PanelHead icon={FileText} title="Oracle releases and checks" />
            <div className="space-y-2.5 px-6 pb-4 text-[12.5px]">
              <Line k="Critical Patch Update" v={view?.cpu ? cpuName(view.cpu.last) : "–"} />
              <Line k="Released" v={view?.cpu?.last || "–"} />
              <Line k="Next CPU" v={view?.cpu?.next || "–"} />
              <Line k={`${client.name} takes`} v={view?.settings?.cadence === "quarterly" ? "Quarterly CPUs only" : "Every release (monthly)"} />
              <Line k="Latest Infrastructure DPK" v={view?.infra_dpk ? `${view.infra_dpk.patch || ""}${view.infra_dpk.released ? ` · ${view.infra_dpk.released}` : ""}` || "–" : "–"} />
              <Line k="Advisory scores" v={view?.advisory?.checked ? `read ${ago(view.advisory.checked)}` : "not read yet"} />
              {view?.advisory?.error && <p className="text-[11.5px] text-muted/80">{view.advisory.error}</p>}
              <div className="flex gap-3 pt-1">{view?.advisory?.url && <ExtLink href={view.advisory.url}>Advisory</ExtLink>}</div>
            </div>
            <AutoChecks cid={cid} onError={(m) => setNotice({ tone: "error", text: m })} />
          </Panel>
        </div>
      </div>

      <RequestApproval open={requesting} onClose={() => setRequesting(false)} cid={cid} client={client} envName={envName} view={view}
        picked={picked} scopeId={scopeId} servers={servers} onRaised={(r) => { setRequesting(false); setNotice({ text: r.note || `${r.request.jira_key} raised in ${approval.system}. Pegasus checks it every 5 minutes; use Check now to look sooner.` }); load(); }} />
      <Confirm open={confirmApply} onClose={() => setConfirmApply(false)} danger={prd} typeToConfirm={prd ? envName : undefined}
        title={scopeId === "all" ? `Apply all outstanding updates to ${envName}?` : `Apply ${picked[0]?.name} to ${envName}?`} cta="Apply"
        onConfirm={() => apply(prd)}>
        <p>This takes {envName} down once: every domain is stopped, Pegasus checks nothing is still running, then applies {picked.map((r) => `${r.name} ${r.latest}`).join("; ")} on {servers} server{servers === 1 ? "" : "s"}. Each middleware home is backed up first. If a step fails the rest are skipped, and the domains are started again either way.</p>
        {cr && <p className="mt-2">Under {cr.jira_key}{cr.approver ? `, approved by ${cr.approver}` : ""}. Pegasus confirms the approval with {approval.system} before it starts and posts the result back to the ticket.</p>}
        <label className="mt-3 flex items-start gap-2 text-fg"><input type="checkbox" checked={reboot} onChange={(e) => setReboot(e.target.checked)} className="mt-1 accent-[#0B89A1]" />Reboot servers where Linux says it's needed (after all updates, before PeopleSoft starts)</label>
      </Confirm>
      <JobConsole job={job} onClose={() => setJob(null)} />
    </div>
  );
}

const cpuName = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};

function Banner({ tone, children, onClose }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-[12.5px] text-fg",
      tone === "error" ? "border-orange/50 bg-orange/10" : tone === "warn" ? "border-apricot/60 bg-apricot/10" : "border-teal/40 bg-teal/10")}>
      {tone ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-orange" /> : <Check className="mt-0.5 size-4 shrink-0 text-accent" />}
      <span className="min-w-0 flex-1">{children}</span>
      {onClose && <button onClick={onClose} className="text-muted hover:text-fg">Dismiss</button>}
    </div>
  );
}

function Lifecycle({ view, scopeId, picked, cr, toStage, levelsRead, onDownload, onApply }) {
  const approval = view.approval || {};
  const needsTicket = approval.required;
  const nothing = !(view.hosts || []).some((h) => h.items.some((it) => it.status === "needed"));
  const staged = picked.length > 0 && toStage === 0;
  const approved = !needsTicket || cr?.status === "approved";
  const ready = scopeId && staged && (!needsTicket || cr);
  const steps = [
    { k: "Levels read", who: levelsRead ? ago(levelsRead) : "not yet", done: !!levelsRead },
    { k: "Downloaded", who: picked.length ? (toStage ? `${toStage} still to download` : "on every server") : "nothing selected", done: staged },
    ...(needsTicket ? [
      { k: "Ticket raised", who: cr ? `${cr.jira_key} · ${cr.requested_by}` : "not yet", done: !!cr },
      { k: "Approved", who: cr?.status === "approved" ? (cr.approver || "approved") : cr ? "waiting" : "–", done: cr?.status === "approved" },
    ] : [{ k: "Approval", who: approval.enabled ? "not needed for this environment" : "not switched on", done: true }]),
    { k: "Apply", who: cr?.status === "applying" ? "running" : "a person clicks Apply", done: false },
    { k: "Verify", who: "levels read again after apply", done: false },
  ];
  const current = steps.findIndex((s) => !s.done);
  const status = nothing ? { tone: "text-accent", text: "Nothing outstanding" }
    : !scopeId ? { tone: "text-risk", text: "Choose one update, or all of them" }
    : toStage ? { tone: "text-warn", text: `Download on every server first (${toStage} to go)` }
    : needsTicket && !cr ? { tone: "text-warn", text: `Needs an approved ${approval.system} ticket` }
    : needsTicket && !approved ? { tone: "text-warn", text: `${cr.jira_key} is waiting for approval` }
    : { tone: "text-accent", text: cr ? `Covered by ${cr.jira_key}` : "Ready to apply" };
  return (
    <Panel glow className="overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_180px_at_85%_0%,#0B89A126,transparent_70%)]" />
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-teal/20 text-accent ring-1 ring-accent/30"><PlugZap className="size-3.5" /></span>
            {cr ? <><a href={cr.url} target="_blank" rel="noopener" className="font-mono text-[12.5px] text-accent hover:underline">{cr.jira_key}</a>
              <Pill tone={TICKET_TONE[cr.status]} icon={cr.status === "approved" ? Check : undefined}>{TICKET_LABEL[cr.status] || cr.status}{cr.status === "approved" ? ` in ${approval.system}` : ""}</Pill></>
              : <span className="text-[12.5px] text-muted">{needsTicket ? `No ${approval.system} ticket for this selection yet` : "Change approval isn't required here"}</span>}
          </div>
          <div className="mt-1.5 max-w-xl text-[14px] font-medium text-fg">{cr?.summary || (picked.length ? `${picked.length} update${picked.length === 1 ? "" : "s"} selected: ${picked.map((r) => r.name).join(", ")}` : "Select updates below")}</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right text-[11.5px] leading-4"><div className={status.tone}>{status.text}</div></div>
          {scopeId && toStage > 0 && <Button icon={Download} onClick={onDownload}>Download</Button>}
          <motion.button whileTap={{ scale: 0.97 }} disabled={!ready} onClick={onApply}
            className="relative flex h-11 items-center gap-2 overflow-hidden rounded-xl bg-accent px-5 font-display text-[15px] font-bold text-on-accent shadow-[0_0_0_1px_#00C6FF,0_0_40px_-6px_#00C6FF] day:shadow-[0_12px_30px_-12px_#0B89A1] transition disabled:bg-fg/10 disabled:text-muted/70 disabled:shadow-none">
            <Play className="relative size-4 fill-current" /><span className="relative">Apply to {view.environment}</span>
          </motion.button>
        </div>
      </div>
      <div className="relative grid border-t border-fg/[0.06] px-5 py-3.5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((s, i) => {
          const done = s.done && (current === -1 || i < current), now = i === current;
          return (
            <div key={s.k} className="relative pr-3">
              {i < steps.length - 1 && <div className="absolute left-[18px] right-0 top-[9px] h-px bg-fg/10">{done && <div className="h-full bg-accent" />}</div>}
              <div className={cx("relative grid size-[18px] place-items-center rounded-full", done ? "bg-accent text-on-accent" : now ? "border-2 border-accent bg-well" : "border border-fg/20 bg-well")}>
                {done && <Check className="size-3" strokeWidth={3} />}{now && <span className="size-1.5 animate-pulse rounded-full bg-accent" />}
              </div>
              <div className={cx("mt-2 text-[12.5px] font-medium", done || now ? "text-fg" : "text-muted/80")}>{s.k}</div>
              <div className="truncate text-[11.5px] text-muted/80">{s.who}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Row({ r, i, checked, onToggle, expanded, onExpand, onStage, advUrl }) {
  const sev = SEV[severity(r.cvss)];
  const needed = r.status === "needed" && r.scope;
  return (
    <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04, duration: 0.4, ease }}
      className={cx("border-b border-fg/[0.05] last:border-0", expanded && "bg-fg/[0.025]")}>
      <div className="grid grid-cols-[28px_52px_minmax(0,1.5fr)_minmax(0,1.6fr)_84px_104px] items-center gap-x-3 px-5 py-3">
        <button onClick={onToggle} disabled={!needed} aria-label={`Include ${r.name}`} aria-pressed={checked && !!needed}
          className={cx("grid size-[18px] place-items-center rounded-[5px] border transition", checked && needed ? "border-accent bg-accent text-on-accent" : "border-fg/25 bg-well day:bg-white", !needed && "opacity-30")}>
          {checked && needed && <Check className="size-3" strokeWidth={3} />}
        </button>
        {r.cvss ? <ScoreDial score={r.cvss} size={42} /> : <span className="grid size-[42px] place-items-center text-[11px] text-muted/60">–</span>}
        <button onClick={onExpand} className="min-w-0 text-left">
          <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-fg">{expanded ? <ChevronDown className="size-3.5 text-muted" /> : <ChevronRight className="size-3.5 text-muted" />}{r.name}</div>
          <div className="truncate pl-5 font-mono text-[11px] text-muted/80">{r.patch ? `patch ${r.patch}` : r.source}</div>
        </button>
        <div className="min-w-0">
          <div className={cx("truncate font-mono text-[12px]", r.status === "needed" ? "text-fg" : "text-muted/70")}>{r.latest || "–"}</div>
          <div className="truncate text-[11px] text-muted/70">installed <span className="font-mono">{r.installed.join(", ")}</span></div>
        </div>
        <CvePopover r={r} sev={sev} />
        <div className="text-right">
          {r.status === "needed" && (r.staged === r.needed ? <Pill tone="cyan" icon={Check}>Downloaded</Pill> : <Pill tone="apricot">Needed</Pill>)}
          {r.status === "ok" && <Pill tone="teal" icon={Check}>Up to date</Pill>}
          {r.status === "deferred" && <Tooltip content="This client takes quarterly CPUs only; this release comes with the next CPU."><Pill>Deferred</Pill></Tooltip>}
          {r.status === "no-target" && <Tooltip content={r.detail}><Pill>No target</Pill></Tooltip>}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease }} className="overflow-hidden">
            <div className="grid grid-cols-1 gap-4 px-5 pb-4 pl-[108px] @3xl:grid-cols-[1fr_240px]">
              <div className="space-y-1.5">
                {r.detail && <p className="pb-1 text-[12px] leading-[18px] text-muted">{r.detail}</p>}
                {r.cves.slice(0, 12).map((c) => {
                  const s = SEV[severity(c.score)];
                  return (
                    <div key={c.cve} className="grid grid-cols-[132px_1fr_36px] items-center gap-3 text-[12px]">
                      <a href={c.url} target="_blank" rel="noopener" className="font-mono text-muted hover:text-accent">{c.cve}</a>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-fg/[0.06]"><div className={cx("h-full rounded-full", s.bg)} style={{ width: `${c.score * 10}%` }} /></div>
                        <span className="truncate text-muted/80">{c.component || c.product}</span>
                      </div>
                      <span className={cx("text-right font-mono tabular", s.text)}>{Number(c.score).toFixed(1)}</span>
                    </div>
                  );
                })}
                {r.cves.length > 12 && <div className="text-[11px] text-muted/70">and {r.cves.length - 12} more in the advisory</div>}
              </div>
              <div className="space-y-2 rounded-xl border border-line bg-fg/[0.035] p-3 text-[12px]">
                <div className="text-muted/80">Applies to</div>
                <div className="flex flex-wrap gap-1">{r.hosts.map((h) => <span key={h} className="rounded bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-muted">{h}</span>)}</div>
                {r.status === "needed" && <div className="text-muted/80">{r.staged} of {r.needed} downloaded</div>}
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                  {r.patch && <ExtLink href={`https://updates.oracle.com/Orion/SimpleSearch/process_form?search_type=patch&patch_number=${encodeURIComponent(r.patch)}&plat_lang=${encodeURIComponent(r.platform || "226P")}`}>Readme</ExtLink>}
                  {advUrl && r.cves.length > 0 && <ExtLink href={advUrl}>Advisory</ExtLink>}
                </div>
                {r.status === "needed" && r.staged < r.needed && <Button size="sm" icon={Download} onClick={onStage}>Download</Button>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

function CvePopover({ r, sev }) {
  const [open, setOpen] = useState(false);
  if (!r.cves.length) return <span className="text-[11.5px] text-muted/60">{r.component === "os" ? "errata" : "–"}</span>;
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className={cx("inline-flex cursor-help items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11.5px] whitespace-nowrap", r.cvss >= 9 ? "border-orange/40 bg-orange/10 text-risk" : "border-fg/10 bg-fg/[0.04] text-muted")}>{r.cves.length} CVEs</span>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
            className="absolute left-1/2 top-9 z-30 w-80 -translate-x-1/2 rounded-xl border border-fg/10 bg-raised p-3 shadow-pop">
            <div className="mb-2 flex items-center gap-2 text-[12px]"><span className="font-display font-bold text-fg">{r.advTitle || r.name}</span><span className={cx("ml-auto font-mono", sev.text)}>max {r.cvss.toFixed(1)} · {sev.label}</span></div>
            {r.cves.slice(0, 6).map((c) => (
              <div key={c.cve} className="flex items-center gap-2 py-0.5 text-[11.5px]"><span className="font-mono text-muted">{c.cve}</span><span className="truncate text-muted/80">{c.component}</span>
                <span className={cx("ml-auto font-mono tabular", SEV[severity(c.score)].text)}>{Number(c.score).toFixed(1)}</span></div>
            ))}
            {r.cves.length > 6 && <div className="pt-1 text-[11px] text-muted/70">and {r.cves.length - 6} more in the advisory</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlanBar({ picked, needed, scopeId, servers, top, cr, approval, onAll, onRequest }) {
  const canRequest = scopeId && approval.enabled && approval.required && !cr;
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-b-2xl border-t border-fg/[0.08] bg-raised px-5 py-3.5 backdrop-blur-xl">
      <div className="flex items-center gap-4 text-[12.5px]">
        <span><b className="font-display text-[15px] text-fg">{picked.length}</b> <span className="text-muted/70">of {needed.length} updates</span></span>
        <span className="text-muted/30">·</span>
        <span className="tabular text-muted"><b className="text-fg">{servers}</b> server{servers === 1 ? "" : "s"}</span>
        <span className="text-muted/30">·</span>
        <span className="text-muted">highest <b className={top >= 9 ? "text-risk" : "text-fg"}>{top ? top.toFixed(1) : "–"}</b></span>
      </div>
      {!scopeId && picked.length > 1
        ? <span className="flex items-center gap-1.5 text-[12px] text-risk"><TriangleAlert className="size-3.5" />Pegasus applies one update or all of them per window. <button onClick={onAll} className="text-accent hover:underline">Select all</button></span>
        : cr ? <span className="flex items-center gap-1.5 text-[12px] text-accent"><Check className="size-3.5" />Covered by {cr.jira_key}</span>
        : approval.required && scopeId ? <span className="text-[12px] text-muted">Needs an approved {approval.system} ticket</span>
        : !approval.enabled ? <span className="text-[12px] text-muted/80">Change approval is off for this client (Integrations)</span> : null}
      <Button variant="primary" className="ml-auto" disabled={!canRequest} onClick={onRequest}>Request approval</Button>
    </div>
  );
}

function Preflight({ client, view, picked, toStage, cr, approval, levelsRead }) {
  const con = client.connector;
  const items = [
    { icon: PlugZap, label: "Connector online", meta: con.count ? `${con.id} · seen ${con.lastSeen}` : "No connector registered", ok: con.status !== "offline" },
    { icon: Server, label: "Installed levels read", meta: levelsRead ? `${ago(levelsRead)} on ${(view?.hosts || []).filter((h) => h.checked).length} of ${(view?.hosts || []).length} servers` : "Not yet: Check patch levels", ok: !!levelsRead },
    { icon: Archive, label: "Patches downloaded", meta: !picked.length ? "Nothing selected" : toStage ? `${toStage} still to download` : `to ${view?.settings?.staging_root || "the staging folder"} on every server`, ok: picked.length > 0 && !toStage },
    { icon: Ticket, label: "Change approval", meta: !approval.required ? (approval.enabled ? "Not required for this environment" : "Switched off for this client") : cr ? `${cr.jira_key} · ${TICKET_LABEL[cr.status] || cr.status}` : `No ${approval.system} ticket yet`, ok: !approval.required || cr?.status === "approved" },
    { icon: Clock3, label: "Nothing else running", meta: "Pegasus refuses to apply while another job runs on this environment", ok: true },
  ];
  const todo = items.filter((x) => !x.ok).length;
  return (
    <Panel>
      <PanelHead icon={ShieldCheck} title="Pre-flight" action={<Pill tone={todo ? "apricot" : "teal"}>{todo ? `${todo} to check` : "All clear"}</Pill>} />
      <ul className="space-y-0.5 px-3 pb-3">
        {items.map((p) => (
          <li key={p.label} className={cx("flex items-start gap-3 rounded-xl px-2 py-2", !p.ok && "bg-orange/[0.06] ring-1 ring-orange/25")}>
            <span className={cx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", p.ok ? "bg-accent/15 text-accent" : "bg-orange/15 text-risk")}>{p.ok ? <Check className="size-3.5" strokeWidth={2.6} /> : <TriangleAlert className="size-3.5" />}</span>
            <span className="min-w-0 flex-1"><span className="block text-[12.5px] text-fg">{p.label}</span><span className="block text-[11.5px] text-muted/80">{p.meta}</span></span>
          </li>
        ))}
      </ul>
      <div className="mx-5 mb-4 rounded-lg bg-fg/[0.03] px-3 py-2 text-[11.5px] leading-4 text-muted/80">Before anything is stopped, Pegasus checks free disk space on each server, and backs up each middleware home it changes.</div>
    </Panel>
  );
}

function Line({ k, v }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted/80">{k}</span><span className="text-right text-fg">{v}</span></div>;
}

function ByServer({ view, onStage, onStageAll }) {
  const left = view.hosts.reduce((n, h) => n + h.items.filter((it) => it.status === "needed" && !it.staged).length, 0);
  return (
    <div>
      {left > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-y border-fg/[0.06] bg-fg/[0.02] px-5 py-2.5">
          <Button size="sm" variant="primary" icon={Download} onClick={onStageAll}>Download all {left} update{left === 1 ? "" : "s"}</Button>
          <span className="text-[11.5px] text-muted/80">Downloaded on the connector once, copied to {view.settings?.staging_root} on each server. Nothing is installed or restarted.</span>
        </div>
      )}
      <table className="w-full text-[12.5px]">
        <thead className="border-b border-fg/[0.06] text-left text-[11px] uppercase tracking-[0.1em] text-muted/70">
          <tr>{["Server", "Component", "Installed", "Latest", "Status", ""].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {view.hosts.map((h) => (h.items.length ? h.items : [null]).map((it, i) => (
            <tr key={`${h.host_key}|${it?.component || "none"}|${i}`} className={cx("border-b border-fg/[0.04]", i === h.items.length - 1 && "border-fg/[0.08]")}>
              <td className="px-5 py-2.5 align-top">{i === 0 && <><span className="font-mono text-fg">{h.host}</span><span className="block text-[11px] text-muted/80">{h.roles.join(", ")}{h.pt ? ` · PeopleTools ${h.pt}` : ""}</span>
                {h.warnings?.map((w) => <span key={w} className="block text-[11px] text-warn">{w}</span>)}</>}</td>
              {it ? <>
                <td className="px-5 py-2.5 text-fg">{COMP_TITLE[it.component] || it.component}</td>
                <td className="px-5 py-2.5 font-mono text-[11.5px] text-muted">{it.installed}</td>
                <td className="px-5 py-2.5"><span className="font-mono text-[11.5px] text-fg">{it.latest_label || it.target || "–"}</span>{it.patch_number && it.status === "needed" && <span className="block text-[11px] text-muted/70">patch {it.patch_number}</span>}</td>
                <td className="px-5 py-2.5"><Pill tone={it.status === "ok" ? "teal" : it.status === "needed" ? "apricot" : "neutral"}>{{ needed: "Needed", ok: "Up to date", deferred: "Deferred", "no-target": "No target" }[it.status] || it.status}</Pill></td>
                <td className="px-5 py-2.5 text-right">{it.status === "needed" && it.key && (it.staged ? <Pill tone="cyan" icon={Check}>Downloaded</Pill> : <Button size="sm" icon={Download} onClick={() => onStage(h, it)}>Download</Button>)}</td>
              </> : <td colSpan={5} className="px-5 py-2.5 text-muted/80">{h.error || "Levels not read yet"}</td>}
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}

function Cadence({ cid, cadence, onSaved, onError }) {
  if (!cadence) return null;
  const set = async (v) => {
    if (v === cadence) return;
    try { await put(`/api/clients/${cid}/patch-settings`, { cadence: v }); onSaved(); } catch (e) { onError(e.message); }
  };
  return <Segmented size="sm" layoutId="lpcadence" value={cadence} onChange={set} options={[{ value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly only" }]} />;
}

function AutoChecks({ cid, onError }) {
  const [w, setW] = useState(null);
  useEffect(() => { get(`/api/clients/${cid}/patch-watch`).then(setW).catch(() => {}); }, [cid]);
  if (!w) return null;
  const save = async (patch) => {
    try { const r = await put(`/api/clients/${cid}/patch-watch`, patch); setW((x) => ({ ...x, settings: r.settings })); } catch (e) { onError(e.message); }
  };
  return (
    <div className="border-t border-fg/[0.06] px-6 pb-5 pt-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80"><Bot className="size-3.5" />Automatic checks<span className="font-normal normal-case tracking-normal text-muted/70">· {w.last ? `last ran ${ago(w.last)}` : "not run yet"}</span></div>
      <div className="space-y-3">
        <Toggle on={w.settings.check} onChange={(v) => save({ check: v })} label={`Check patch levels and Oracle's latest releases every ${w.every_hours} hours`} />
        <label className="block text-[12px] text-muted">Download and stage new updates automatically
          <select disabled={!w.settings.check} value={w.settings.stage} onChange={(e) => save({ stage: e.target.value })} className={cx(inputCls, "mt-1.5 h-9 text-[12.5px]")}>
            <option className="bg-raised" value="off">Off</option><option className="bg-raised" value="nonprod">Non-production environments</option><option className="bg-raised" value="all">All environments</option>
          </select>
        </label>
        <p className="text-[11.5px] leading-4 text-muted/80">Staging only copies files. Applying always needs a person, and approval where it's required.</p>
      </div>
    </div>
  );
}

function Tickets({ crs, approval, client, onCheck, onWithdraw, onRequest }) {
  return (
    <Panel>
      <PanelHead icon={Ticket} title={`Change tickets · ${client.name}`} meta={approval.enabled ? `${approval.system} · checked every 5 minutes` : "Change approval is off for this client"}
        action={approval.enabled && <Button size="sm" variant="ghost" icon={RefreshCw} onClick={onCheck}>Check now</Button>} />
      <div className="px-2 pb-2">
        {!crs.length && <div className="px-4 pb-3 text-[12.5px] text-muted/80">No change tickets for this environment yet.</div>}
        {crs.map((t) => (
          <div key={t.id} className="grid grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl px-3 py-2.5 text-[12.5px] hover:bg-fg/[0.03]">
            <a href={t.url} target="_blank" rel="noopener" className="flex items-center gap-1 font-mono text-accent">{t.jira_key}<ExternalLink className="size-3" /></a>
            <span className="min-w-0">
              <Pill tone={TICKET_TONE[t.status]}>{TICKET_LABEL[t.status] || t.status}</Pill>
              <span className="ml-2 text-[11.5px] text-muted/80">{t.scope === "all" ? "All outstanding" : COMP_TITLE[t.scope.split("~")[0]]}{t.approver ? ` · approved by ${t.approver}` : ""}{t.jira_status && t.jira_status !== TICKET_LABEL[t.status] ? ` · ${approval.system || "ticket"}: ${t.jira_status}` : ""} · by {t.requested_by} {ago(t.requested_at)}</span>
            </span>
            <span className="flex justify-end gap-3 whitespace-nowrap text-[12px]">
              {t.status === "approved" && <span className="text-accent">Apply unlocked</span>}
              {["pending", "approved"].includes(t.status) && <button onClick={() => onWithdraw(t)} className="text-risk/80 hover:text-risk">Withdraw</button>}
              {["applied", "rejected", "stale", "failed", "withdrawn"].includes(t.status) && approval.enabled && <button onClick={onRequest} className="text-accent hover:underline">Request again</button>}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Request approval: raise the Jira / ServiceNow change for exactly the selected plan ─────────────────────
const ZONES = (() => { try { return Intl.supportedValuesOf("timeZone"); } catch { return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"]; } })();
function nextMidnight(addHours = 0) {
  const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(addHours, 0, 0, 0);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function RequestApproval({ open, onClose, cid, client, envName, view, picked, scopeId, servers, onRaised }) {
  const system = view?.approval?.system || "Jira";
  const defaultTz = view?.settings?.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const [f, setF] = useState({ tz: defaultTz, start: nextMidnight(0), end: nextMidnight(4), changeType: "Normal", notes: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (open) { setErr(""); setF((x) => ({ ...x, tz: defaultTz })); } }, [open]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const r = await post(`/api/clients/${cid}/change-requests`, { environment: envName, scope: scopeId, change_type: f.changeType, notes: f.notes,
        window: { tz: f.tz, start: f.start, end: f.end } });
      onRaised(r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} width={600} eyebrow={`${client.name} · ${envName}`} title="Request approval"
      footer={<>
        <span className="text-[11.5px] leading-4 text-muted/80">Anyone but the account that raises it can approve.<br />Pegasus checks every 5 minutes.</span>
        <Button variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={busy ? Loader2 : Ticket} disabled={busy || !scopeId} onClick={submit}>{system === "ServiceNow" ? "Raise ServiceNow change" : "Raise Jira ticket"}</Button>
      </>}>
      <div className="space-y-7">
        <Section n="1" title="What will change">
          <div className="flex flex-wrap gap-2">
            {picked.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-2 rounded-lg border border-fg/10 bg-fg/[0.04] px-2.5 py-1.5 text-[12.5px]">
                {p.cvss > 0 && <span className={cx("font-mono text-[11px]", SEV[severity(p.cvss)].text)}>{p.cvss.toFixed(1)}</span>}{p.name} <span className="font-mono text-[11px] text-muted">{p.latest}</span>
              </span>
            ))}
          </div>
          <div className="mt-2 text-[12px] text-muted/80">{servers} server{servers === 1 ? "" : "s"}. {envName} is unavailable for the whole window. Every update must be downloaded first, so the ticket lists exactly what will be applied. Nothing changes until it's approved and someone clicks Apply.</div>
        </Section>
        <Section n="2" title="When">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-accent" /><input type="datetime-local" value={f.start} onChange={set("start")} className={cx(inputCls, "pl-9")} /></div></Field>
            <Field label="Ends"><div className="relative"><Clock3 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-accent" /><input type="datetime-local" value={f.end} onChange={set("end")} className={cx(inputCls, "pl-9")} /></div></Field>
          </div>
          <Field className="mt-3" label="Time zone" hint="The times above are in this zone. Every time on the ticket is written with its zone.">
            <div className="relative"><Globe2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-accent" />
              <select value={f.tz} onChange={set("tz")} className={cx(inputCls, "appearance-none pl-9")}>{ZONES.map((z) => <option key={z} value={z} className="bg-raised">{z}</option>)}</select>
            </div>
          </Field>
        </Section>
        <Section n="3" title="Ticket">
          <Field label="Change type"><select value={f.changeType} onChange={set("changeType")} className={inputCls}>{["Normal", "Standard", "Emergency"].map((t) => <option key={t} className="bg-raised">{t}</option>)}</select></Field>
          <Field className="mt-3" label="Notes for the approver" hint="Added to the ticket under the plan."><textarea value={f.notes} onChange={set("notes")} rows={3} className={cx(inputCls, "h-auto py-2")} /></Field>
        </Section>
        {err && <p role="alert" className="rounded-lg border border-orange/50 bg-orange/10 px-3 py-2 text-[12.5px] text-fg">{err}</p>}
      </div>
    </Drawer>
  );
}

function Section({ n, title, children }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5"><span className="grid size-6 place-items-center rounded-full bg-accent/15 font-display text-[12px] font-bold text-accent">{n}</span><h3 className="font-display text-[15px] font-bold">{title}</h3></div>
      {children}
    </section>
  );
}

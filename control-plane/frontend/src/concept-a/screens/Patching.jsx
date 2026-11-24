import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw, Search, ChevronDown, ChevronRight, Check, Play, FileText, ExternalLink, TriangleAlert, HardDrive,
  ShieldCheck, Clock3, PlugZap, Archive, DatabaseBackup, ListChecks, GitBranch, Lock, Sparkles, Download, RotateCw, Ticket, Bot, Loader2,
} from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { components, changeRequest, advisory, comingModules, focusEnv, severity, TZ, patchHosts, PATCH_STATUS, patchChecks, changeTickets, TICKET_STATUS, infraDpk, clientSettings } from "../../shared/data.js";
import { Panel, PanelHead, Button, Pill, PageHeader, ScoreDial, Segmented, SEV, Tooltip, ExtLink, Sparkle, ease, dots, Confirm, Toggle, inputCls } from "../kit.jsx";
import { useShell } from "../App.jsx";
import RequestApproval from "./RequestApproval.jsx";
import PatchRun from "./PatchRun.jsx";

const APPROVED = changeRequest.plan;
const NEEDED = patchHosts.flatMap((h) => h.items.filter((it) => it.status === "needed").map((it) => `${h.host}|${it.comp}`));

export default function Patching() {
  const { askAgent } = useShell();
  const [cadence, setCadence] = useState("monthly");
  const [sel, setSel] = useState(new Set(APPROVED));
  const [open, setOpen] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const [view, setView] = useState("component");
  const [staged, setStaged] = useState(() => new Set(patchHosts.flatMap((h) => h.items.filter((it) => it.staged).map((it) => `${h.host}|${it.comp}`))));
  const [downloading, setDownloading] = useState(null);
  const toStage = NEEDED.filter((k) => !staged.has(k));
  const download = (keys) => { setDownloading(keys); setTimeout(() => { setStaged((s) => new Set([...s, ...keys])); setDownloading(null); }, 1600); };

  const rows = useMemo(() => [...components].sort((a, b) => b.cvss - a.cvss).map((c) => ({
    ...c, status: cadence === "quarterly" && c.key === "os" ? "deferred" : c.status,
  })), [cadence]);
  const picked = rows.filter((r) => sel.has(r.key) && r.status === "needed");
  const matches = picked.length === APPROVED.length && APPROVED.every((k) => sel.has(k));
  const servers = new Set(picked.flatMap((r) => r.hosts)).size;
  const top = picked.reduce((m, r) => Math.max(m, r.cvss), 0);

  const toggle = (k) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="@container">
      <PageHeader
        eyebrow={<><ShieldCheck className="size-3.5" />Patching · {advisory.name}</>}
        title={<span className="flex items-center gap-3"><span>{dots(`${focusEnv.client} · ${focusEnv.name}`)}</span><button className="grid size-8 place-items-center rounded-lg border border-fg/10 bg-fg/[0.04] text-muted hover:text-fg" aria-label="Switch environment"><ChevronDown className="size-4" /></button></span>}
        sub={`PeopleTools ${focusEnv.ptools} · ${focusEnv.os} · ${focusEnv.cloud} · levels read ${patchChecks.levelsRead} · Oracle looked up ${patchChecks.oracleLookedUp}`}
        actions={<>
          <Tooltip content="Ask Oracle again instead of using the connector's 12-hour cache"><Button icon={Search}>Look up latest again</Button></Tooltip>
          <Button variant="primary" icon={RefreshCw}>Check patch levels</Button>
        </>}
      />

      <ChangeLifecycle matches={matches} toStage={toStage} downloading={downloading} onDownload={() => download(toStage)} onApply={() => setConfirmApply(true)} />

      <div className="mt-5 grid grid-cols-1 gap-5 @5xl:grid-cols-12">
        <div className="space-y-5 @5xl:col-span-8">
        <Panel>
          <PanelHead icon={ListChecks} title="Updates for this environment" meta={view === "component" ? "Highest security score first" : "Read live from each server"}
            action={<>
              <Segmented size="sm" layoutId="pview" value={view} onChange={setView} options={[{ value: "component", label: "By component" }, { value: "server", label: "By server" }]} />
              <Segmented size="sm" layoutId="cadence" value={cadence} onChange={setCadence} options={[{ value: "monthly", label: "Monthly" }, { value: "quarterly", label: "Quarterly only" }]} />
            </>} />
          {view === "server" ? <ByServer staged={staged} downloading={downloading} toStage={toStage} onDownload={download} /> : <>
          <div className="grid grid-cols-[28px_52px_minmax(0,1.6fr)_minmax(0,1.5fr)_84px_92px] items-center gap-x-3 border-y border-fg/[0.06] bg-fg/[0.02] px-5 py-2 text-[11px] font-medium uppercase tracking-[0.1em] text-muted/70">
            <span /><span>CVSS</span><span>Component</span><span>Latest · installed</span><span>Fixes</span><span className="text-right">Status</span>
          </div>
          <ul>
            {rows.map((r, i) => (
              <Row key={r.key} r={r} i={i} checked={sel.has(r.key)} onToggle={() => toggle(r.key)} expanded={open === r.key} onExpand={() => setOpen(open === r.key ? null : r.key)} />
            ))}
          </ul>
          </>}
          <PlanBar picked={picked} matches={matches} servers={servers} top={top} onRequest={() => setRequesting(true)} />
        </Panel>
        <Tickets onRequest={() => setRequesting(true)} />
        </div>

        <div className="space-y-5 @5xl:col-span-4">
          <Preflight onFree={() => askAgent("Clean up /u01 on pkhdevapp01")} toStage={toStage} />
          <Panel>
            <PanelHead icon={FileText} title="Oracle releases and checks" />
            <div className="space-y-2.5 px-6 pb-4 text-[12.5px]">
              <Line k="Critical Patch Update" v="October 2026" />
              <Line k="Released" v={advisory.released} />
              <Line k="Next CPU" v={advisory.next} />
              <Line k="Parker takes" v="Monthly + quarterly" />
              <Line k="Latest Infrastructure DPK" v={`${infraDpk.patch} · ${infraDpk.released}`} />
              <div className="flex gap-3 pt-1"><ExtLink>Advisory</ExtLink><ExtLink>Risk matrix</ExtLink><ExtLink>Cloud Manager notes</ExtLink></div>
            </div>
            <AutoChecks />
          </Panel>
          <Panel>
            <PanelHead icon={GitBranch} title="Coming next" meta="Same flow, more of the stack" />
            <ul className="space-y-1 px-3 pb-3">
              {comingModules.map((m) => (
                <li key={m.key} className="flex items-start gap-3 rounded-xl px-2 py-2">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-dashed border-fg/15 text-muted/80"><Lock className="size-3.5" /></span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] text-fg">{m.name}</span>
                    <span className="block text-[11.5px] text-muted/80">{m.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <RequestApproval open={requesting} onClose={() => setRequesting(false)} picked={picked} servers={servers} />
      <Confirm open={confirmApply} onClose={() => setConfirmApply(false)} title="Apply all outstanding updates to HCM DEV?" cta="Apply"
        onConfirm={() => { setConfirmApply(false); setRunning(true); }}>
        <p>This takes HCM DEV down once: every domain is stopped, Pegasus checks nothing is still running, then applies in order: OS updates (sudo yum -y update) on all 3 servers; JDK 21.0.13; WebLogic Oct2026 CPU on pkhdevweb01; Tuxedo RP052 on pkhdevapp01, pkhdevprcs01. Each middleware home is backed up first, and the boot and block volumes before that. If a step fails the rest are skipped, and the domains are started again either way.</p>
        <p className="mt-2">Approved under PSADMIN-872 by Gopinath S.; the result is posted back to the ticket.</p>
        <label className="mt-3 flex items-start gap-2 text-fg"><input type="checkbox" defaultChecked className="mt-1 accent-[#0B89A1]" />Reboot servers where Linux says it's needed (after all updates, before PeopleSoft starts)</label>
      </Confirm>
      <PatchRun open={running} onClose={() => setRunning(false)} />
    </div>
  );
}

const STEPS = [
  { k: "Plan drafted", who: "Pegasus Agent", t: "3:05 PM", agent: true },
  { k: "Ticket raised", who: "Ashwini C.", t: "3:22 PM" },
  { k: "Approved", who: "Gopinath S.", t: "3:31 PM" },
  { k: "Window", who: "Fri 12:00–7:00 AM", t: "EDT" },
  { k: "Apply", who: "Safi (operator)", t: "on shift" },
  { k: "Verify", who: "Pegasus", t: "after apply" },
];

function ChangeLifecycle({ matches, toStage, downloading, onDownload, onApply }) {
  const current = 3;
  const ready = matches && !toStage.length;
  return (
    <Panel glow className="overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_180px_at_85%_0%,#0B89A126,transparent_70%)]" />
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-teal/20 text-accent ring-1 ring-accent/30"><PlugZap className="size-3.5" /></span>
            <span className="font-mono text-[12.5px] text-accent">{changeRequest.key}</span>
            <Pill tone="cyan" icon={Check}>Approved in Jira</Pill>
          </div>
          <div className="mt-1.5 max-w-xl text-[14px] font-medium text-fg">{changeRequest.title}</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right text-[11.5px] leading-4">
            <div className={!matches ? "text-risk" : toStage.length ? "text-warn" : "text-accent"}><span className={cx("mr-1.5 hidden size-1.5 rounded-full align-middle day:inline-block", !matches ? "bg-orange" : toStage.length ? "bg-apricot" : "bg-teal")} />{!matches ? "Plan changed since approval" : toStage.length ? `Download on every server first (${NEEDED.length - toStage.length} of ${NEEDED.length} done)` : "Plan matches the approval"}</div>
            <div className="font-mono text-muted/80">signature 7f3c·91ab</div>
          </div>
          {matches && toStage.length > 0 && <Button icon={downloading ? Loader2 : Download} onClick={onDownload} disabled={!!downloading}>{downloading ? "Downloading…" : `Download the last ${toStage.length}`}</Button>}
          <Tooltip content={!matches ? "The selection differs from what was approved. Raise a new ticket to apply it." : toStage.length ? "Every update has to be downloaded to every server first." : "Approved by Gopinath S. Applies exactly the approved plan."}>
            <motion.button whileTap={{ scale: 0.97 }} disabled={!ready} onClick={onApply}
              className="relative flex h-11 items-center gap-2 overflow-hidden rounded-xl bg-accent px-5 font-display text-[15px] font-bold text-on-accent shadow-[0_0_0_1px_#00C6FF,0_0_40px_-6px_#00C6FF] day:shadow-[0_12px_30px_-12px_#0B89A1] transition disabled:bg-fg/10 disabled:text-muted/70 disabled:shadow-none">
              {ready && <motion.span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,#FFFFFF80_50%,transparent_70%)]" animate={{ x: ["-120%", "120%"] }} transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.6 }} />}
              <Play className="relative size-4 fill-current" /><span className="relative">Apply to HCM DEV</span>
            </motion.button>
          </Tooltip>
        </div>
      </div>
      <div className="relative grid grid-cols-6 border-t border-fg/[0.06] px-5 py-3.5">
        {STEPS.map((s, i) => {
          const done = i < current, now = i === current;
          return (
            <div key={s.k} className="relative pr-3">
              {i < STEPS.length - 1 && (
                <div className="absolute left-[18px] right-0 top-[9px] h-px bg-fg/10">
                  {done && <motion.div className="h-full origin-left bg-accent" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.2 + i * 0.15, ease }} />}
                </div>
              )}
              <div className={cx("relative grid size-[18px] place-items-center rounded-full", done ? "bg-accent text-on-accent" : now ? "border-2 border-accent bg-well" : "border border-fg/20 bg-well")}>
                {done && <Check className="size-3" strokeWidth={3} />}
                {now && <span className="size-1.5 animate-pulse rounded-full bg-accent" />}
              </div>
              <div className={cx("mt-2 flex items-center gap-1 text-[12.5px] font-medium", done || now ? "text-fg" : "text-muted/80")}>{s.agent && <Sparkle className="size-3 text-agent" />}{s.k}</div>
              <div className="truncate text-[11.5px] text-muted/80">{s.who}</div>
              <div className={cx("font-mono text-[11px]", now ? "text-accent" : "text-muted/70")}>{s.t}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function Row({ r, i, checked, onToggle, expanded, onExpand }) {
  const sev = SEV[severity(r.cvss)];
  const needed = r.status === "needed";
  return (
    <motion.li initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + i * 0.05, duration: 0.45, ease }}
      className={cx("border-b border-fg/[0.05] last:border-0", expanded && "bg-fg/[0.025]")}>
      <div className="grid grid-cols-[28px_52px_minmax(0,1.6fr)_minmax(0,1.5fr)_84px_92px] items-center gap-x-3 px-5 py-3">
        <button onClick={onToggle} disabled={!needed} aria-label={`Include ${r.name}`}
          className={cx("grid size-[18px] place-items-center rounded-[5px] border transition", checked && needed ? "border-accent bg-accent text-on-accent" : "border-fg/25 bg-well day:bg-white", !needed && "opacity-30")}>
          {checked && needed && <Check className="size-3" strokeWidth={3} />}
        </button>
        <ScoreDial score={r.cvss} size={42} />
        <button onClick={onExpand} className="min-w-0 text-left">
          <div className="flex items-center gap-1.5 text-[13.5px] font-medium text-fg">
            {expanded ? <ChevronDown className="size-3.5 text-muted" /> : <ChevronRight className="size-3.5 text-muted" />}{r.name}
          </div>
          <div className="truncate pl-5 font-mono text-[11px] text-muted/80">{r.patch}</div>
        </button>
        <div className="min-w-0">
          <div className={cx("truncate font-mono text-[12px]", needed ? "text-fg" : "text-muted/70")}>{r.latest} <span className="font-sans text-[11px] text-accent/80">{r.latestLabel}</span></div>
          <div className="truncate text-[11px] text-muted/70">from <span className="font-mono">{r.installed}</span> · {r.installedLabel}</div>
        </div>
        <CvePopover r={r} sev={sev} />
        <div className="text-right">
          {r.status === "needed" && <Pill tone="apricot">Needed</Pill>}
          {r.status === "ok" && <Pill tone="teal" icon={Check}>Up to date</Pill>}
          {r.status === "deferred" && <Tooltip content="Parker is set to quarterly CPUs only; monthly OS errata wait for the January CPU."><Pill>Deferred</Pill></Tooltip>}
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease }} className="overflow-hidden">
            <div className="grid grid-cols-1 gap-4 px-5 pb-4 pl-[108px] @3xl:grid-cols-[1fr_220px]">
              <div className="space-y-1.5">
                {r.cves.map((c, j) => {
                  const s = SEV[severity(c.score)];
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: j * 0.03 }} className="grid grid-cols-[132px_1fr_36px] items-center gap-3 text-[12px]">
                      <a href="#" onClick={(e) => e.preventDefault()} className="font-mono text-muted hover:text-accent">{c.id}</a>
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-fg/[0.06]"><div className={cx("h-full rounded-full", s.bg)} style={{ width: `${c.score * 10}%` }} /></div>
                        <span className="truncate text-muted/80">{c.part}{c.note ? ` · ${c.note}` : ""}</span>
                      </div>
                      <span className={cx("text-right font-mono tabular", s.text)}>{c.score.toFixed(1)}</span>
                    </motion.div>
                  );
                })}
              </div>
              <div className="space-y-2 rounded-xl border border-line bg-fg/[0.035] p-3 text-[12px]">
                <div className="text-muted/80">Applies to</div>
                <div className="flex flex-wrap gap-1">{r.hosts.map((h) => <span key={h} className="rounded bg-fg/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-muted">{h}</span>)}</div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1"><ExtLink>{r.doc}</ExtLink><ExtLink>Advisory</ExtLink></div>
                {r.note && <div className="text-accent/90">{r.note}</div>}
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
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className={cx("inline-flex cursor-help items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11.5px] whitespace-nowrap", r.cvss >= 9 ? "border-orange/40 bg-orange/10 text-risk" : "border-fg/10 bg-fg/[0.04] text-muted")}>
        {r.cves.length} {r.key === "os" ? "errata" : "CVEs"}
      </span>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.16 }}
            className="absolute left-1/2 top-9 z-30 w-80 -translate-x-1/2 rounded-xl border border-fg/10 bg-raised p-3 shadow-[0_24px_60px_-12px_#003C51,0_0_0_1px_#00C6FF14] backdrop-blur-xl day:shadow-pop">
            <div className="mb-2 flex items-center gap-2 text-[12px]">
              <span className="font-display font-bold text-fg">{r.name}</span>
              <span className={cx("ml-auto font-mono", sev.text)}>max {r.cvss.toFixed(1)} · {sev.label}</span>
            </div>
            {r.cves.slice(0, 6).map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-0.5 text-[11.5px]">
                <span className="font-mono text-muted">{c.id}</span><span className="truncate text-muted/80">{c.part}</span>
                <span className={cx("ml-auto font-mono tabular", SEV[severity(c.score)].text)}>{c.score.toFixed(1)}</span>
              </div>
            ))}
            {r.cves.length > 6 && <div className="pt-1 text-[11px] text-muted/70">and {r.cves.length - 6} more in the advisory</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PlanBar({ picked, matches, servers, top, onRequest }) {
  return (
    <div className="sticky bottom-0 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-b-2xl border-t border-fg/[0.08] bg-raised px-5 py-3.5 backdrop-blur-xl">
      <div className="flex items-center gap-4 text-[12.5px]">
        <span><b className="font-display text-[15px] text-fg">{picked.length}</b> <span className="text-muted/70">updates</span></span>
        <span className="text-muted/30">·</span>
        <span className="tabular text-muted"><b className="text-fg">{servers}</b> servers, one at a time</span>
        <span className="text-muted/30">·</span>
        <span className="text-muted">highest <b className={top >= 9 ? "text-risk" : "text-fg"}>{top ? top.toFixed(1) : "–"}</b></span>
      </div>
      <AnimatePresence mode="wait">
        {matches ? (
          <motion.span key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[12px] text-accent"><Check className="size-3.5" />Same as PSADMIN-872</motion.span>
        ) : (
          <motion.span key="d" initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[12px] text-risk"><TriangleAlert className="size-3.5" />Differs from PSADMIN-872, so it needs a new ticket</motion.span>
        )}
      </AnimatePresence>
      <Button variant="primary" className="ml-auto" disabled={!picked.length} onClick={onRequest}>Request approval</Button>
    </div>
  );
}

const PRE = [
  { icon: PlugZap, label: "Connector online", meta: "pkr-conn-01 · 12s ago", state: "ok" },
  { icon: Archive, label: "Patches downloaded", meta: "to /u01/staging on every server", state: "staged" },
  { icon: HardDrive, label: "Disk space on pkhdevapp01", meta: "/u01 87% · 18.2 GB free, needs 6.4 GB", state: "warn" },
  { icon: DatabaseBackup, label: "Boot volume backups", meta: "OCI · 3 volumes, at window start", state: "ok", isNew: true },
  { icon: DatabaseBackup, label: "Block volume backups", meta: "OCI · /u01 on 3 hosts", state: "ok", isNew: true },
  { icon: Clock3, label: "Weekly plan", meta: "7:00 PM stop skipped tonight", state: "ok" },
];

function Preflight({ onFree, toStage }) {
  return (
    <Panel>
      <PanelHead icon={ShieldCheck} title="Pre-flight for tonight" action={<Pill tone="apricot">{toStage.length ? 2 : 1} to check</Pill>} />
      <ul className="space-y-0.5 px-3 pb-3">
        {PRE.map((p0, i) => { const p = p0.state === "staged" ? { ...p0, state: toStage.length ? "warn" : "ok", meta: toStage.length ? `${toStage.length} still to download (Tuxedo on pkhdevprcs01)` : p0.meta } : p0; return (
          <motion.li key={p.label} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05, ease }}
            className={cx("flex items-start gap-3 rounded-xl px-2 py-2", p.state === "warn" && "bg-orange/[0.06] ring-1 ring-orange/25")}>
            <span className={cx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", p.state === "ok" ? "bg-accent/15 text-accent" : "bg-orange/15 text-risk")}>
              {p.state === "ok" ? <Check className="size-3.5" strokeWidth={2.6} /> : <TriangleAlert className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[12.5px] text-fg">{p.label}{p.isNew && <Pill tone="cream" className="!h-[18px] !px-1.5 !text-[10px]">New</Pill>}</span>
              <span className="block text-[11.5px] text-muted/80">{p.meta}</span>
              {p.state === "warn" && p.icon === HardDrive && (
                <button onClick={onFree} className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent hover:underline"><Sparkle className="size-3" />Free 11.4 GB of old bundles</button>
              )}
            </span>
          </motion.li>
        ); })}
      </ul>
      <div className="mx-5 mb-4 flex items-start gap-2 rounded-lg bg-fg/[0.03] px-3 py-2 text-[11.5px] leading-4 text-muted/80">
        <Sparkles className="mt-0.5 size-3 shrink-0 text-accent" />Rollback is ready: jdk.bak, a WebLogic home archive, yum history and the OCI backups.
      </div>
    </Panel>
  );
}

function Line({ k, v }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted/80">{k}</span><span className="text-fg">{v}</span></div>;
}

function ByServer({ staged, downloading, toStage, onDownload }) {
  return (
    <div>
      {toStage.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-y border-fg/[0.06] bg-fg/[0.02] px-5 py-2.5">
          <Button size="sm" variant="primary" icon={downloading ? Loader2 : Download} disabled={!!downloading} onClick={() => onDownload(toStage)}>{downloading ? "Downloading…" : `Download all ${toStage.length} update${toStage.length === 1 ? "" : "s"}`}</Button>
          <span className="text-[11.5px] text-muted/80">Downloaded on the connector once, copied to {clientSettings.stagingRoot} on each server. Nothing is installed or restarted.</span>
        </div>
      )}
      <table className="w-full text-[12.5px]">
        <thead className="border-b border-fg/[0.06] text-left text-[11px] uppercase tracking-[0.1em] text-muted/70">
          <tr>{["Server", "Component", "Installed", "Latest", "Status", ""].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {patchHosts.map((h) => h.items.map((it, i) => {
            const k = `${h.host}|${it.comp}`, isStaged = staged.has(k), busy = downloading?.includes(k);
            return (
              <tr key={k} className={cx("border-b border-fg/[0.04]", i === h.items.length - 1 && "border-fg/[0.08]")}>
                <td className="px-5 py-2.5 align-top">{i === 0 && <><span className="font-mono text-fg">{h.host}</span><span className="block text-[11px] text-muted/80">{h.roles} · PeopleTools {h.pt}</span></>}</td>
                <td className="px-5 py-2.5 text-fg">{it.name}</td>
                <td className="px-5 py-2.5 font-mono text-[11.5px] text-muted">{it.installed}</td>
                <td className="px-5 py-2.5"><span className="font-mono text-[11.5px] text-fg">{it.latest}</span>{it.patch && it.status === "needed" && <span className="block text-[11px] text-muted/70">patch {it.patch}</span>}</td>
                <td className="px-5 py-2.5">
                  <Pill tone={it.status === "ok" ? "teal" : "apricot"}>{PATCH_STATUS[it.status]}</Pill>
                  {it.reboot && <Tooltip content="Linux says this server needs a reboot for earlier updates to take effect"><Pill tone="cream" className="ml-1.5" icon={RotateCw}>Reboot pending</Pill></Tooltip>}
                </td>
                <td className="px-5 py-2.5 text-right">
                  {it.status === "needed" && (isStaged ? <Pill tone="cyan" icon={Check}>Downloaded</Pill>
                    : <Button size="sm" icon={busy ? Loader2 : Download} disabled={busy} onClick={() => onDownload([k])}>{busy ? "Downloading" : "Download"}</Button>)}
                </td>
              </tr>
            );
          }))}
        </tbody>
      </table>
    </div>
  );
}

function AutoChecks() {
  const [on, setOn] = useState(patchChecks.auto.check);
  return (
    <div className="border-t border-fg/[0.06] px-6 pb-5 pt-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80"><Bot className="size-3.5" />Automatic checks<span className="font-normal normal-case tracking-normal text-muted/70">· last ran {patchChecks.auto.last}</span></div>
      <div className="space-y-3">
        <Toggle on={on} onChange={setOn} label={`Check patch levels and Oracle's latest releases ${patchChecks.auto.every}`} />
        <label className="block text-[12px] text-muted">Download and stage new updates automatically
          <select disabled={!on} defaultValue="nonprod" className={cx(inputCls, "mt-1.5 h-9 text-[12.5px]")}>
            <option className="bg-raised" value="off">Off</option><option className="bg-raised" value="nonprod">Non-production environments</option><option className="bg-raised" value="all">All environments</option>
          </select>
        </label>
        <p className="text-[11.5px] leading-4 text-muted/80">Staging only copies files. Applying always needs a person, and approval where it's required.</p>
      </div>
    </div>
  );
}

const TONE = { approved: "cyan", pending: "apricot", applying: "cyan", applied: "teal", rejected: "orange", stale: "neutral", failed: "orange" };
function Tickets({ onRequest }) {
  return (
    <Panel>
      <PanelHead icon={Ticket} title="Change tickets · Parker" meta="Jira PSADMIN · checked every 5 minutes" action={<Button size="sm" variant="ghost" icon={RefreshCw}>Check now</Button>} />
      <div className="px-2 pb-2">
        {changeTickets.map((t, i) => (
          <motion.div key={t.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease }}
            className="grid grid-cols-[104px_minmax(0,110px)_minmax(0,1fr)_auto] items-center gap-4 rounded-xl px-3 py-2.5 text-[12.5px] hover:bg-fg/[0.03]">
            <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1 font-mono text-accent">{t.key}<ExternalLink className="size-3" /></a>
            <span className="text-fg">{t.env}<span className="block truncate text-[11px] text-muted/80">{t.scope}</span></span>
            <span className="min-w-0"><Pill tone={TONE[t.status]}>{TICKET_STATUS[t.status]}</Pill><span className="ml-2 text-[11.5px] text-muted/80">{t.detail}{t.window ? ` · ${t.window}` : ""}</span></span>
            <span className="flex justify-end gap-3 whitespace-nowrap text-[12px]">
              {t.status === "approved" && <span className="text-accent">Apply unlocked</span>}
              {t.status === "pending" && <><button className="text-accent hover:underline">Check now</button><button className="text-risk/80 hover:text-risk">Withdraw</button></>}
              {["applied", "rejected", "stale", "failed"].includes(t.status) && <button onClick={onRequest} className="text-accent hover:underline">Request again</button>}
            </span>
          </motion.div>
        ))}
      </div>
    </Panel>
  );
}

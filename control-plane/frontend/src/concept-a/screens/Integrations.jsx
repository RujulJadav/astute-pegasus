import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Blocks, Ticket, Activity, Cloud, Mail, Check, Loader2, FileCode2, ShieldAlert, Eye, PenLine, Plug, ArrowRight, Workflow, Webhook, ScrollText, Sun, Radar, Building2, KeyRound, MessagesSquare, Hash, Server } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { integrations, agent, clients } from "../../shared/data.js";
import { Panel, PanelHead, Button, Pill, PageHeader, Drawer, Field, inputCls, Segmented, Sparkle, ease } from "../kit.jsx";

const GROUP_ICON = [Ticket, Activity, Cloud, Mail];
const ITEM_ICON = { jira: Ticket, servicenow: Workflow, webhook: Webhook, "oci-monitoring": Activity, "oci-logging": ScrollText, solarwinds: Sun, nagios: Radar, oci: Cloud, azure: Cloud, aws: Server, onprem: Building2, email: Mail, google: KeyRound, teams: MessagesSquare, slack: Hash };
const STATUS = {
  connected: { tone: "cyan", label: "Connected" }, ready: { tone: "neutral", label: "Ready to set up" }, beta: { tone: "cream", label: "Beta" },
  implementation: { tone: "apricot", label: "Built per client" }, planned: { tone: "neutral", label: "Planned" },
};

export default function Integrations() {
  const [cfg, setCfg] = useState(null);
  return (
    <div className="@container">
      <PageHeader eyebrow={<><Blocks className="size-3.5" />Integrations</>} title="Adapters, not hard-coding"
        sub="Pegasus talks to help desks, monitoring and clouds through adapters. Each one is configured here and saved to its own config, so a new client's ServiceNow or SolarWinds is a setup task, not a code change." />

      <AdapterDiagram />

      <div className="mt-6 space-y-7">
        {integrations.map((g, gi) => {
          const Icon = GROUP_ICON[gi];
          return (
            <section key={g.group}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="flex items-center gap-2 font-display text-[16px] font-bold"><Icon className="size-4 text-accent" />{g.group}</h2>
                {g.note && <span className="text-[12px] text-muted/80">{g.note}</span>}
              </div>
              <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2 @6xl:grid-cols-4">
                {g.items.map((it, i) => (
                  <motion.button key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 + i * 0.04, ease }} whileHover={{ y: -2 }}
                    onClick={() => it.status !== "planned" && setCfg(it)}
                    className={cx("group flex flex-col rounded-2xl border p-4 text-left transition-colors", it.status === "connected" ? "border-accent/25 bg-navy/30 day:bg-[linear-gradient(160deg,#FFFFFF,#E6F4F1)] day:border-teal/40 day:shadow-card" : "border-fg/[0.08] bg-fg/[0.02] hover:border-fg/20")}>
                    <div className="flex items-center gap-2.5">
                      <span className={cx("grid size-9 place-items-center rounded-xl ring-1", it.status === "connected" ? "bg-accent/10 text-accent ring-accent/30" : "bg-fg/[0.04] text-muted ring-fg/10")}>{(() => { const I = ITEM_ICON[it.id] || Plug; return <I className="size-4" />; })()}</span>
                      <span className="text-[14px] font-medium text-fg">{it.name}</span>
                    </div>
                    <p className="mt-2.5 flex-1 text-[12px] leading-[18px] text-muted/70">{it.detail}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <Pill tone={STATUS[it.status].tone} icon={it.status === "connected" ? Check : undefined}>{STATUS[it.status].label}</Pill>
                      {it.used && <span className="truncate text-[11px] text-muted/70">{it.used}</span>}
                      {it.status !== "planned" && <ArrowRight className="ml-auto size-3.5 text-muted/70 transition group-hover:translate-x-0.5 group-hover:text-accent" />}
                    </div>
                  </motion.button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <AgentPermissions />
      <Configure item={cfg} onClose={() => setCfg(null)} />
    </div>
  );
}

function AdapterDiagram() {
  const right = ["Jira", "ServiceNow", "OCI Monitoring", "SolarWinds", "SMTP"];
  return (
    <Panel glow className="overflow-hidden px-6 py-5">
      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-4">
        <div data-theme="night" className="rounded-2xl border border-accent/30 bg-well px-5 py-4 text-center text-fg shadow-[0_0_40px_-12px_#00C6FF]">
          <div className="font-display text-[15px] font-bold">Pegasus core</div>
          <div className="text-[11px] text-muted/80">patching · schedules · access</div>
        </div>
        <Flow />
        <div className="rounded-2xl border border-fg/15 bg-well px-5 py-4 text-center">
          <div className="flex items-center justify-center gap-1.5 font-display text-[14px] font-bold"><Plug className="size-4 text-accent" />Adapter interface</div>
          <div className="font-mono text-[11px] text-muted/80">create · poll · close · notify</div>
        </div>
        <Flow />
        <div className="flex flex-col gap-1.5">
          {right.map((r, i) => (
            <motion.span key={r} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}
              className={cx("rounded-lg border px-3 py-1 text-[12px]", i < 3 ? "border-accent/30 bg-accent/[0.06] text-fg" : "border-fg/10 text-muted/70")}>{r}</motion.span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-fg/[0.06] pt-3 text-[11.5px] text-muted/80">
        <FileCode2 className="size-3.5 text-accent" />Saved per adapter, e.g. <span className="font-mono text-muted">config/adapters/ticketing.servicenow.json</span> · secrets go to the vault, never the file.
      </div>
    </Panel>
  );
}

function Flow() {
  return (
    <div className="relative h-px bg-fg/15">
      {[0, 1, 2].map((k) => (
        <motion.span key={k} className="absolute -top-[2px] size-[5px] rounded-full bg-accent shadow-[0_0_8px_#00C6FF]" animate={{ left: ["0%", "100%"], opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: k * 0.66, ease: "linear" }} />
      ))}
    </div>
  );
}

function Configure({ item, onClose }) {
  const [test, setTest] = useState("idle");
  const [saved, setSaved] = useState(false);
  const isJira = item?.id === "jira";
  const run = () => { setTest("running"); setTimeout(() => setTest("ok"), 1400); };
  return (
    <Drawer open={!!item} onClose={() => { onClose(); setTest("idle"); setSaved(false); }} width={580} eyebrow="Configure adapter" title={item?.name || ""}
      footer={<>
        <AnimatePresence mode="wait">
          {saved ? <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-[12px] text-accent"><Check className="size-3.5" />Saved to config/adapters/ticketing.{item?.id}.json</motion.span>
            : <motion.span key="n" className="text-[11.5px] text-muted/80">Tokens are encrypted and kept in the vault.</motion.span>}
        </AnimatePresence>
        <Button className="ml-auto" onClick={run} disabled={test === "running"} icon={test === "running" ? Loader2 : undefined}>{test === "ok" ? "Test again" : "Test connection"}</Button>
        <Button variant="primary" onClick={() => setSaved(true)}>Save</Button>
      </>}>
      {item && (
        <div className="space-y-5">
          <p className="text-[12.5px] leading-[19px] text-muted/75">{item.detail}</p>
          <Field label={isJira ? "Jira site" : "Instance URL"}><input className={inputCls} defaultValue={isJira ? "https://astute.atlassian.net" : "https://cascadehealth.service-now.com"} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sign in with"><select className={inputCls}><option className="bg-raised">{isJira ? "API token" : "OAuth client"}</option><option className="bg-raised">Basic (service account)</option></select></Field>
            <Field label={isJira ? "Project" : "Change model"}>{isJira ? <input className={inputCls} defaultValue="PSADMIN" /> : <select className={inputCls}><option className="bg-raised">Normal</option><option className="bg-raised">Standard (pre-approved)</option></select>}</Field>
          </div>
          {!isJira && <Field label="Assignment group"><input className={inputCls} defaultValue="PeopleSoft Ops" /></Field>}
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted">Which states mean "approved"</div>
            <div className="flex flex-wrap gap-2">
              {(isJira ? ["Approved", "Ready to implement"] : ["Scheduled", "Implement"]).map((s) => <Pill key={s} tone="cyan" icon={Check}>{s}</Pill>)}
              <button className="rounded-full border border-dashed border-fg/20 px-2.5 text-[11.5px] text-muted/80">+ add</button>
            </div>
          </div>
          <Field label="Check for approval every"><Segmented size="sm" layoutId="poll" value="5" onChange={() => {}} options={[{ value: "1", label: "1 min" }, { value: "5", label: "5 min" }, { value: "15", label: "15 min" }]} /></Field>
          <AnimatePresence>
            {test !== "idle" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cx("rounded-xl border p-3.5 text-[12.5px]", test === "ok" ? "border-accent/30 bg-accent/[0.06]" : "border-fg/10 bg-fg/[0.03]")}>
                {test === "running" ? <span className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin text-accent" />Signing in, reading the {isJira ? "project" : "change table"}, creating a draft and deleting it…</span>
                  : <div className="space-y-1">{[`Signed in as svc-pegasus`, isJira ? "Project PSADMIN found · issue type Change" : "change_request table readable and writable", "Draft created and deleted · 412 ms"].map((l) => <div key={l} className="flex items-center gap-2 text-fg"><Check className="size-3.5 text-accent" />{l}</div>)}</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Drawer>
  );
}

const TIERS = [
  { icon: Eye, name: "Read", rule: "Runs on its own", eg: "status, patch levels, metrics, disk usage", tone: "text-muted" },
  { icon: PenLine, name: "Change", rule: "A person approves the exact plan", eg: "raise a ticket, stage patches, start/stop", tone: "text-accent" },
  { icon: ShieldAlert, name: "Destructive", rule: "Two people and a change ticket", eg: "apply patches, delete files, remove keys", tone: "text-risk" },
];

function AgentPermissions() {
  const [levels, setLevels] = useState({ parker: 2, northwind: 1, cascade: 1, summit: 0 });
  return (
    <Panel glow className="mt-8">
      <PanelHead icon={() => <Sparkle className="size-4 text-agent" />} title="Agent permissions" meta="How far the Pegasus Agent may go, per client" />
      <div className="grid grid-cols-1 gap-6 px-5 pb-5 @4xl:grid-cols-[1.25fr_1fr]">
        <div className="space-y-2">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-line bg-fg/[0.035] px-3 py-2.5">
              <span className="grid size-7 place-items-center rounded-md bg-navy font-mono text-[10px] text-cyan">{c.code}</span>
              <span className="w-32 truncate text-[13px]">{c.name}</span>
              <div className="ml-auto flex gap-1">
                {agent.autonomy.map((a) => {
                  const on = levels[c.id] >= a.level, cur = levels[c.id] === a.level;
                  return (
                    <button key={a.level} onClick={() => setLevels((l) => ({ ...l, [c.id]: a.level }))} title={a.desc}
                      className={cx("relative h-8 whitespace-nowrap rounded-lg px-2.5 text-[11.5px] transition", cur ? "text-on-accent" : on ? "bg-accent/15 text-accent" : "bg-fg/[0.04] text-muted/80 hover:text-fg")}>
                      {cur && <motion.span layoutId={`lvl-${c.id}`} className="absolute inset-0 rounded-lg bg-accent" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                      <span className="relative">{a.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {TIERS.map((t) => (
            <div key={t.name} className="flex items-start gap-3 rounded-xl border border-fg/[0.07] px-3.5 py-3">
              <t.icon className={cx("mt-0.5 size-4", t.tone)} />
              <div>
                <div className="text-[13px] font-medium text-fg">{t.name} <span className={cx("font-normal", t.tone)}>· {t.rule}</span></div>
                <div className="text-[11.5px] text-muted/80">{t.eg}</div>
              </div>
            </div>
          ))}
          <p className="px-1 pt-1 text-[11.5px] leading-4 text-muted/80">Every agent action is in the audit log, and an approval covers only the plan that was approved. If the plan changes, it asks again.</p>
        </div>
      </div>
    </Panel>
  );
}

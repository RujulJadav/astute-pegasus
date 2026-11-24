import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2, TriangleAlert, CalendarDays, Clock3, Globe2, ExternalLink, Ticket } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { TIMEZONES, focusEnv, severity, CHANGE_TYPES } from "../../shared/data.js";
import { Drawer, Button, Field, inputCls, Toggle, Segmented, Pill, SEV, Sparkle, ease } from "../kit.jsx";

export default function RequestApproval({ open, onClose, picked, servers }) {
  const [tz, setTz] = useState(TIMEZONES[0].id);
  const [system, setSystem] = useState("jira");
  const [changeType, setChangeType] = useState("Normal");
  const [boot, setBoot] = useState(true);
  const [block, setBlock] = useState(true);
  const [reboot, setReboot] = useState(true);
  const [phase, setPhase] = useState("form");
  const zone = TIMEZONES.find((z) => z.id === tz);
  const abbr = zone.label.match(/\(([A-Z]+)/)?.[1] || "UTC";
  const key = system === "jira" ? "PSADMIN-873" : "CHG0031842";

  useEffect(() => { if (open) setPhase("form"); }, [open]);
  useEffect(() => {
    if (phase === "creating") { const t = setTimeout(() => setPhase("waiting"), 1600); return () => clearTimeout(t); }
  }, [phase]);

  return (
    <Drawer open={open} onClose={onClose} width={620} eyebrow={`${focusEnv.client} · ${focusEnv.name}`} title={phase === "form" ? "Request approval" : `${key}`}
      footer={phase === "form" ? (
        <>
          <span className="text-[11.5px] leading-4 text-muted/80">Anyone but you can approve it.<br />Pegasus checks every 5 minutes.</span>
          <Button variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Ticket} onClick={() => setPhase("creating")}>{system === "jira" ? "Raise Jira ticket" : "Raise ServiceNow change"}</Button>
        </>
      ) : phase === "approved" ? (
        <Button variant="cyan" className="ml-auto" onClick={onClose}>Done</Button>
      ) : (
        <Button variant="ghost" className="ml-auto" onClick={onClose}>Close · keeps checking</Button>
      )}>
      <AnimatePresence mode="wait">
        {phase === "form" ? (
          <motion.div key="form" exit={{ opacity: 0, x: -20 }} className="space-y-7">
            <Section n="1" title="What will change">
              <div className="flex flex-wrap gap-2">
                {picked.map((p) => (
                  <span key={p.key} className="inline-flex items-center gap-2 rounded-lg border border-fg/10 bg-fg/[0.04] px-2.5 py-1.5 text-[12.5px]">
                    <span className={cx("font-mono text-[11px]", SEV[severity(p.cvss)].text)}>{p.cvss.toFixed(1)}</span>{p.name}
                  </span>
                ))}
              </div>
              <div className="mt-2 text-[12px] text-muted/80">{servers} servers, one at a time. HCM DEV is unavailable for the whole window. Nothing changes until it's approved and someone clicks Apply.</div>
            </Section>

            <Section n="2" title="When">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Date"><Adorned icon={CalendarDays} value="Fri, Oct 30" /></Field>
                <Field label="Starts"><Adorned icon={Clock3} value="12:00 AM" suffix={abbr} /></Field>
                <Field label="Ends"><Adorned icon={Clock3} value="7:00 AM" suffix={abbr} /></Field>
              </div>
              <Field className="mt-3" label="Time zone" hint="Defaults to the zone Pegasus runs in. Every time on the ticket is written with its zone.">
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-accent" />
                  <select value={tz} onChange={(e) => setTz(e.target.value)} className={cx(inputCls, "appearance-none pl-9")}>
                    {TIMEZONES.map((z) => <option key={z.id} value={z.id} className="bg-raised">{z.label}{z.note ? `  ·  ${z.note}` : ""}</option>)}
                  </select>
                </div>
              </Field>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/[0.05] px-3 py-2 text-[12px] leading-[18px] text-muted">
                <Check className="mt-0.5 size-3.5 shrink-0 text-accent" />No other change overlaps this window. HCM DEV's 7:00 PM {abbr} weekly stop will be skipped tonight and resumes tomorrow.
              </div>
            </Section>

            <Section n="3" title="Safety net">
              <div className="space-y-3.5">
                <Toggle on={boot} onChange={setBoot} label={<span className="flex items-center gap-2">Back up boot volumes first <Pill tone="cream" className="!h-[18px] !text-[10px]">New</Pill></span>} hint="Full OCI backup of each server's boot volume, so a server that won't start can be restored." />
                <Toggle on={block} onChange={setBlock} label={<span className="flex items-center gap-2">Back up block volumes first <Pill tone="cream" className="!h-[18px] !text-[10px]">New</Pill></span>} hint="Full OCI backup of /u01 on each server (PS_HOME, WebLogic, Tuxedo, staging)." />
                <Toggle on={reboot} onChange={setReboot} label="Reboot only where Linux needs it" hint="After all updates and before PeopleSoft is started again." />
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-orange/30 bg-orange/[0.06] px-3 py-2.5 text-[12px] leading-[18px]">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-risk" />
                <div className="flex-1 text-muted">
                  <b className="font-medium text-fg">/u01 on pkhdevapp01 is 87% full.</b> The patch fits (needs 6.4 GB of 18.2 GB), but backups and logs will be tight.
                  <button className="mt-1 flex items-center gap-1 font-medium text-accent hover:underline"><Sparkle className="size-3" />Have the agent free 11.4 GB of old bundles first</button>
                </div>
              </div>
            </Section>

            <Section n="4" title="Change ticket">
              <Segmented layoutId="ticketsys" value={system} onChange={setSystem} options={[{ value: "jira", label: "Jira · PSADMIN" }, { value: "servicenow", label: "ServiceNow · CHG" }]} />
              <p className="mt-2 text-[11.5px] text-muted/80">Whichever help desk the client uses is set once under Integrations. Pegasus writes the same content to either.</p>
              <div className="mt-4 grid grid-cols-[auto_1fr] items-start gap-4">
                <Field label="Change type"><Segmented size="sm" layoutId="ctype" value={changeType} onChange={setChangeType} options={CHANGE_TYPES} /></Field>
                <Field label="Notes for the approver"><textarea className={cx(inputCls, "h-[60px] py-2")} placeholder="e.g. tested on FIN UAT under PSADMIN-866" /></Field>
              </div>
              <TicketPreview picked={picked} abbr={abbr} system={system} boot={boot} block={block} />
            </Section>
          </motion.div>
        ) : (
          <Lifecycle key="life" phase={phase} setPhase={setPhase} ticket={key} system={system} />
        )}
      </AnimatePresence>
    </Drawer>
  );
}

function Section({ n, title, children }) {
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2.5 font-display text-[14px] font-bold text-fg">
        <span className="grid size-5 place-items-center rounded-full bg-fg/10 font-mono text-[10.5px] text-muted">{n}</span>{title}
      </h3>
      {children}
    </section>
  );
}

function Adorned({ icon: Icon, value, suffix }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted/80" />
      <input defaultValue={value} className={cx(inputCls, "pl-9 pr-12 tabular")} />
      {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[10.5px] text-accent">{suffix}</span>}
    </div>
  );
}

function TicketPreview({ picked, abbr, system, boot, block }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-fg/10 bg-mist text-navy">
      <div className="flex items-center gap-2 border-b border-muted/50 bg-white px-4 py-2.5">
        <span className={cx("grid size-5 place-items-center rounded text-[10px] font-bold text-white", system === "jira" ? "bg-teal" : "bg-navy")}>{system === "jira" ? "J" : "S"}</span>
        <span className="text-[12px] font-medium text-muted/75">Preview · exactly what the approver sees</span>
      </div>
      <div className="space-y-3 px-4 py-3.5 text-[12px] leading-[18px]">
        <div className="font-display text-[14px] font-bold text-navy">Patch Parker HCM DEV: {picked.map((p) => p.name.split(" ")[0]).join(", ")} (Oct 2026 CPU)</div>
        <div>
          <div className="mb-1 font-semibold text-navy">What will change</div>
          <table className="w-full text-[11.5px]">
            <tbody>{picked.map((p) => <tr key={p.key} className="border-t border-muted/40"><td className="py-1 pr-2">{p.name}</td><td className="py-1 pr-2 font-mono">{p.latest}</td><td className="py-1 text-muted/75">{p.hosts.join(", ")}</td></tr>)}</tbody>
          </table>
        </div>
        <div><span className="font-semibold text-navy">Security fixes · </span>{picked.reduce((n, p) => n + p.cves.length, 0)} CVEs, highest CVSS {Math.max(0, ...picked.map((p) => p.cvss)).toFixed(1)} (CVE-2026-61842)</div>
        <div><span className="font-semibold text-navy">Impact · </span>HCM DEV is unavailable for the window: Fri, Oct 30, 12:00–7:00 AM {abbr}.</div>
        <div><span className="font-semibold text-navy">Backout · </span>{[boot && "OCI boot volume backups", block && "OCI block volume backups", "jdk.bak", "WebLogic home archive", "yum history undo"].filter(Boolean).join(" · ")}</div>
        <div className="rounded-md bg-mint px-2.5 py-2 text-navy">Pegasus applies exactly this plan once, and only after someone other than the requester approves it. If the plan changes, it asks for a new ticket.</div>
      </div>
    </div>
  );
}

function Lifecycle({ phase, setPhase, ticket, system }) {
  const steps = [
    { k: "creating", label: `Creating the change in ${system === "jira" ? "Jira" : "ServiceNow"}`, done: `${ticket} created`, sub: "Description, CVEs, impact, backout and window filled in" },
    { k: "waiting", label: "Waiting for approval", done: "Approved by Gopinath S.", sub: "Checked every 5 minutes · last check just now" },
    { k: "approved", label: "Apply unlocks", done: "Apply unlocked for the window", sub: "Fri, Oct 30, 12:00–7:00 AM EDT · Safi is on shift" },
  ];
  const order = ["creating", "waiting", "approved"];
  const at = order.indexOf(phase);
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease }}>
      <div className="relative mx-auto mb-6 mt-2 grid size-28 place-items-center">
        <motion.div className="absolute inset-0 rounded-full border border-accent/30" animate={{ scale: [1, 1.25], opacity: [0.6, 0] }} transition={{ duration: 2, repeat: Infinity }} />
        <div className={cx("grid size-24 place-items-center rounded-full border transition-colors", phase === "approved" ? "border-accent bg-accent/15 shadow-[0_0_60px_-10px_#00C6FF]" : "border-fg/15 bg-fg/[0.04]")}>
          <AnimatePresence mode="wait">
            {phase === "approved"
              ? <motion.span key="ok" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 300, damping: 15 }}><Check className="size-11 text-accent" strokeWidth={2.5} /></motion.span>
              : <motion.span key="spin" exit={{ scale: 0 }}><Loader2 className="size-9 animate-spin text-accent" /></motion.span>}
          </AnimatePresence>
        </div>
      </div>
      <ol className="space-y-1">
        {steps.map((s, i) => {
          const done = i < at || (phase === "approved" && i === at);
          const now = i === at && !done;
          return (
            <motion.li key={s.k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className={cx("flex items-start gap-3 rounded-xl px-3 py-3", now && "bg-fg/[0.04]")}>
              <span className={cx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", done ? "bg-accent text-on-accent" : now ? "border-2 border-accent" : "border border-fg/15")}>
                {done ? <Check className="size-3.5" strokeWidth={3} /> : now ? <span className="size-1.5 animate-pulse rounded-full bg-accent" /> : null}
              </span>
              <span className="flex-1">
                <span className={cx("block text-[13.5px] font-medium", done || now ? "text-fg" : "text-muted/70")}>{done ? s.done : s.label}</span>
                <span className="block text-[12px] text-muted/80">{s.sub}</span>
              </span>
              {s.k === "creating" && done && <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-1 font-mono text-[12px] text-accent">{ticket}<ExternalLink className="size-3" /></a>}
            </motion.li>
          );
        })}
      </ol>
      {phase === "waiting" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-6 rounded-xl border border-dashed border-fg/15 p-4 text-center">
          <div className="text-[12px] text-muted/80">Demo only: in real life the approver acts in {system === "jira" ? "Jira" : "ServiceNow"}.</div>
          <Button size="sm" className="mt-2.5" onClick={() => setPhase("approved")}>Simulate Gopinath approving</Button>
        </motion.div>
      )}
    </motion.div>
  );
}

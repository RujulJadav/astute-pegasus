import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, Plus, ShieldCheck, Users2, Check, Loader2, Fingerprint, Ticket, UserMinus, UserPlus, RefreshCw, TerminalSquare, SearchCheck, Trash2 } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { accessRequests, sshKeys, me } from "../../shared/data.js";
import { Panel, PanelHead, Button, Pill, PageHeader, Avatar, Drawer, Field, inputCls, Toggle, Tooltip, ease } from "../kit.jsx";

export default function Access() {
  const [give, setGive] = useState(false);
  const [rule, setRule] = useState(true);
  return (
    <div className="@container">
      <PageHeader eyebrow={<><KeyRound className="size-3.5" />SSH access</>} title="Who can reach which servers"
        sub="Every key Pegasus adds or removes, who asked, who approved, and the ticket behind it."
        actions={<Button variant="primary" icon={Plus} onClick={() => setGive(true)}>Give someone access</Button>} />

      <Panel glow className="mb-4 flex flex-wrap items-center gap-4 px-5 py-4">
        <span className="grid size-10 place-items-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/30"><Users2 className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[15px] font-bold">Two-person rule {rule ? "is on" : "is off"}</div>
          <div className="text-[12.5px] text-muted/70">Adding or removing a key needs a second person's approval and a Jira ticket. The person who asked can't approve their own request.</div>
        </div>
        <div className="w-56"><Toggle on={rule} onChange={setRule} label={rule ? "Required for every client" : "Off"} hint="Admins only" /></div>
      </Panel>

      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">Requests <Pill tone="apricot">1 waiting</Pill>
        <span className="ml-auto normal-case tracking-normal"><Button size="sm" variant="ghost" icon={RefreshCw}>Check Jira now</Button></span>
      </div>
      <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-2">
        {accessRequests.map((r, i) => <RequestCard key={r.id} r={r} i={i} />)}
      </div>

      <Panel className="mt-6">
        <PanelHead icon={ShieldCheck} title="Keys Pegasus has added" meta={`${sshKeys.length} people · checked against servers nightly`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12.5px]">
            <thead className="border-y border-fg/[0.06] bg-fg/[0.02] text-left text-[11px] uppercase tracking-[0.1em] text-muted/70">
              <tr>{["Person", "Key", "Where", "OS user", "Added", "Approved by", ""].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {sshKeys.map((k, i) => (
                <motion.tr key={k.fp} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.05 }} className="border-b border-fg/[0.05] last:border-0 hover:bg-fg/[0.02]">
                  <td className="px-5 py-3"><span className="flex items-center gap-2.5"><Avatar initials={k.person.split(" ").map((w) => w[0]).join("").slice(0, 2)} size={26} />{k.person}</span></td>
                  <td className="px-5 py-3 font-mono text-[11.5px] text-muted"><span className="text-muted/70">{k.type}</span> {k.fp}</td>
                  <td className="px-5 py-3 text-muted">{k.scope} <span className="text-muted/70">· {k.hosts} hosts</span></td>
                  <td className="px-5 py-3 font-mono text-[11.5px] text-muted">{k.osUser}</td>
                  <td className="px-5 py-3 text-muted/70">{k.added}</td>
                  <td className="px-5 py-3 text-muted/70">{k.approvedBy}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-[12px]"><button className="mr-3 text-accent hover:underline">Check</button><button className="text-risk/80 hover:text-risk">Remove…</button></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <GiveAccess open={give} onClose={() => setGive(false)} />
    </div>
  );
}

function RequestCard({ r, i }) {
  const [state, setState] = useState(r.status);
  const mine = r.requestedBy.startsWith(me.first);
  const approve = () => { setState("applying"); setTimeout(() => setState("done"), 1600); };
  const add = r.action === "add";
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, ease }}
      className={cx("rounded-2xl border p-4", state === "waiting" ? "border-apricot/35 bg-apricot/[0.04]" : "border-fg/[0.08] bg-surface")}>
      <div className="flex items-start gap-3">
        <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl ring-1", add ? "bg-accent/10 text-accent ring-accent/30" : "bg-orange/10 text-risk ring-orange/30")}>
          {add ? <UserPlus className="size-4" /> : <UserMinus className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-fg">{add ? "Add a key for" : "Remove the key of"} {r.person}</div>
          <div className="text-[12px] text-muted/80">{r.env} · {r.hosts} hosts · as <span className="font-mono">{r.osUser}</span></div>
        </div>
        <span className="flex items-center gap-1 font-mono text-[11.5px] text-accent"><Ticket className="size-3.5" />{r.ticket}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-well px-3 py-2 font-mono text-[11.5px] text-muted"><Fingerprint className="size-3.5 text-muted/70" />{r.keyType} · {r.fp}</div>
      <div className="mt-2 text-[12px] text-muted/70">{r.action === "add" ? "Who and why: DBA support for the HCM TST refresh · until Jan 31, 2027" : "Who and why: contract ended Sep 30"}</div>
      <div className="mt-3 flex items-center gap-2 text-[12px] text-muted/70">
        Asked by <span className="text-fg">{r.requestedBy}</span> · {r.when}
        <span className="ml-auto">
          <AnimatePresence mode="wait">
            {state === "waiting" && (
              <motion.span key="w" exit={{ opacity: 0 }} className="flex items-center gap-2">
                {mine && <button className="h-8 rounded-lg px-2.5 text-[12.5px] text-muted hover:bg-fg/[0.06] hover:text-fg">Withdraw</button>}
                <button className="h-8 rounded-lg px-2.5 text-[12.5px] text-muted hover:bg-fg/[0.06] hover:text-fg">Reject</button>
                <Tooltip content={mine ? "You raised this request. Someone else must approve it." : "Approves in Pegasus and on the Jira ticket"}>
                  <Button size="sm" variant="primary" icon={Check} onClick={approve} disabled={mine}>Approve as second person</Button>
                </Tooltip>
              </motion.span>
            )}
            {state === "applying" && <motion.span key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-accent"><Loader2 className="size-3.5 animate-spin" />Adding to {r.hosts} hosts…</motion.span>}
            {state === "done" && <motion.span key="d" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}><Pill tone="cyan" icon={Check}>Approved by you · added</Pill></motion.span>}
            {state === "approved" && <span className="flex items-center gap-2"><Pill tone="teal" icon={Check}>Approved by Kanchan S. · removed from 17 hosts</Pill><button className="flex items-center gap-1 text-accent hover:underline"><TerminalSquare className="size-3" />Job</button></span>}
          </AnimatePresence>
        </span>
      </div>
    </motion.div>
  );
}

function GiveAccess({ open, onClose }) {
  const [parsed, setParsed] = useState(true);
  return (
    <Drawer open={open} onClose={onClose} width={580} eyebrow="SSH access" title="Give someone access"
      footer={<><span className="text-[11.5px] leading-4 text-muted/80">Add and Remove raise a Jira ticket;<br />Check runs straight away.</span><Button className="ml-auto" icon={SearchCheck}>Check</Button><Button variant="danger" icon={Trash2}>Remove key</Button><Button variant="primary" icon={Check}>Add key</Button></>}>
      <div className="space-y-5">
        <Field label="Their public key" hint="They send it to you. Pegasus never sees or stores a private key.">
          <textarea onChange={(e) => setParsed(e.target.value.trim().startsWith("ssh-"))} defaultValue="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK3mQ9x7pRZ0vYtN2bF8sL1cH4wJ6uD5eG7kP9aT2qVn mohammed@astute-laptop"
            className={cx(inputCls, "h-24 py-2 font-mono text-[11.5px] leading-[18px]")} />
        </Field>
        <AnimatePresence>
          {parsed && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="grid grid-cols-3 gap-2 overflow-hidden">
              {[["Type", "ed25519"], ["Fingerprint", "SHA256:Qe4p…8hVx"], ["Comment", "mohammed@astute-laptop"]].map(([k, v]) => (
                <div key={k} className="min-w-0 rounded-lg border border-accent/20 bg-accent/[0.05] px-3 py-2"><div className="text-[10.5px] text-muted/80">{k}</div><div className="truncate font-mono text-[11.5px] text-fg">{v}</div></div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <Field label="Note (who and why)"><input defaultValue="Mohammed Jiyash, DBA support for the HCM TST refresh" className={inputCls} /></Field>
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-muted">Environments</div>
          <div className="flex flex-wrap gap-2">
            {["Parker · HCM DEV", "Parker · HCM TST", "Parker · HCM PRD", "Parker · CS DEV"].map((e, i) => (
              <span key={e} className={cx("rounded-lg border px-2.5 py-1.5 text-[12px]", i === 1 ? "border-accent/50 bg-accent/10 text-fg" : "border-fg/10 bg-fg/[0.03] text-muted")}>{i === 1 && <Check className="mr-1 inline size-3 text-accent" />}{e}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account on the servers" hint="Blank: the connector's SSH user (e.g. opc)."><input defaultValue="psadm2" className={cx(inputCls, "font-mono")} /></Field>
          <Field label="Access until" hint="Needed for production. Removed automatically after."><input type="date" defaultValue="2027-01-31" className={inputCls} /></Field>
        </div>
        <div className="rounded-xl border border-fg/[0.08] bg-fg/[0.03] p-3.5">
          <Toggle on onChange={() => {}} label="Needs a second person's approval" hint="Locked on by the two-person rule. Turn the rule off above to change it." />
        </div>
      </div>
    </Drawer>
  );
}

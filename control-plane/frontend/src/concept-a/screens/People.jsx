import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Users, UserPlus, ShieldCheck, Mail, Check, Smartphone, Send, Eye, Wrench, Crown, Lock, Ban, KeyRound } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { people, roles } from "../../shared/data.js";
import { Panel, Button, Pill, PageHeader, Avatar, Drawer, Field, inputCls, Toggle, Segmented, ease } from "../kit.jsx";

const STATUS_TONE = { Active: ["teal", ShieldCheck], "Temporary password": ["apricot", Mail], "MFA not set up": ["apricot", KeyRound], Locked: ["orange", Lock], Disabled: ["neutral", Ban] };
import { AstuteLogo } from "../../shared/Logo.jsx";
import LivePeople from "./LivePeople.jsx";
import { useLive as useLiveMode } from "../../api/live.jsx";

export default function People() {
  return useLiveMode().live ? <LivePeople /> : <DemoPeople />;
}

const ROLE_ICON = { Viewer: Eye, Operator: Wrench, Admin: Crown };

function DemoPeople() {
  const [add, setAdd] = useState(false);
  return (
    <div className="@container">
      <PageHeader eyebrow={<><Users className="size-3.5" />People</>} title="People and access"
        sub="Everyone signs in with a password and an authenticator app. Astute staff see every client; a client's own people see only theirs."
        actions={<Button variant="primary" icon={UserPlus} onClick={() => setAdd(true)}>Add a person</Button>} />

      <div className="mb-4 grid grid-cols-1 gap-3 @3xl:grid-cols-3">
        {roles.map((r, i) => {
          const Icon = ROLE_ICON[r.role];
          return (
            <motion.div key={r.role} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, ease }}>
              <Panel className="h-full p-4">
                <div className="flex items-center gap-2 font-display text-[14px] font-bold"><Icon className="size-4 text-accent" />{r.role}<span className="ml-auto font-sans text-[12px] font-normal text-muted/80">{people.filter((p) => p.role === r.role).length} people</span></div>
                <p className="mt-1.5 text-[12px] leading-[18px] text-muted/70">{r.can}</p>
              </Panel>
            </motion.div>
          );
        })}
      </div>

      <Panel className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="border-b border-fg/[0.06] bg-fg/[0.02] text-left text-[11px] uppercase tracking-[0.1em] text-muted/70">
            <tr>{["Person", "Role", "Works for", "Status", "Last sign-in", ""].map((h) => <th key={h} className="px-5 py-2.5 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {people.map((p, i) => (
              <motion.tr key={p.email} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04, ease }} className="border-b border-fg/[0.05] last:border-0 hover:bg-fg/[0.02]">
                <td className="px-5 py-3">
                  <span className="flex items-center gap-3"><Avatar initials={p.initials} size={30} />
                    <span><span className="block text-fg">{p.name}</span><span className="block text-[11.5px] text-muted/80">{p.email}</span></span>
                  </span>
                </td>
                <td className="px-5 py-3">
                  <select defaultValue={p.role} className="h-8 rounded-lg border border-fg/10 bg-fg/[0.04] px-2 text-[12.5px] text-fg outline-none">{["Viewer", "Operator", "Admin"].map((r) => <option key={r} className="bg-raised">{r}</option>)}</select>
                </td>
                <td className="px-5 py-3 text-muted">{p.scope === "All clients" ? "Astute (all clients)" : p.scope}</td>
                <td className="px-5 py-3">{(() => { const [tone, Icon] = STATUS_TONE[p.status]; return <Pill tone={tone} icon={Icon}>{p.status}</Pill>; })()}</td>
                <td className="px-5 py-3 text-[12px] text-muted/80">{p.last}</td>
                <td className="whitespace-nowrap px-5 py-3 text-right text-[12px]">
                  <span className="space-x-3 text-muted/80">
                    {p.pending && <button className="text-accent hover:underline">Resend email</button>}
                    <button className="hover:text-fg">Reset password</button><button className="hover:text-fg">Reset MFA</button>
                    {p.status === "Disabled" ? <button className="text-accent hover:underline">Enable</button> : <button className="text-risk/80 hover:text-risk">Disable</button>}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <AddPerson open={add} onClose={() => setAdd(false)} />
    </div>
  );
}

function AddPerson({ open, onClose }) {
  const [role, setRole] = useState("Operator");
  const [email, setEmail] = useState(true);
  const [sent, setSent] = useState(false);
  return (
    <Drawer open={open} onClose={() => { onClose(); setSent(false); }} width={600} eyebrow="People" title={sent ? "Invite sent" : "Add a person"}
      footer={sent ? <Button variant="cyan" className="ml-auto" onClick={() => { onClose(); setSent(false); }}>Done</Button>
        : <><Button variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Button><Button variant="primary" icon={email ? Send : Check} onClick={() => setSent(true)}>{email ? "Add and send email" : "Add"}</Button></>}>
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div key="sent" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }} className="mx-auto grid size-16 place-items-center rounded-full bg-accent/15 text-accent ring-1 ring-accent/40"><Mail className="size-7" /></motion.div>
            <div className="mt-4 font-display text-[18px] font-bold">Mohammed's invite is on its way</div>
            <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-muted/70">mohammed@beastute.com gets a sign-in link and a temporary password that expires in 24 hours. At first sign-in they choose a password and scan a QR code with an authenticator app.</p>
          </motion.div>
        ) : (
          <motion.div key="form" exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name"><input className={inputCls} defaultValue="Mohammed" /></Field>
              <Field label="Last name"><input className={inputCls} defaultValue="Jiyash" /></Field>
            </div>
            <Field label="Work email"><input className={inputCls} defaultValue="mohammed@beastute.com" /></Field>
            <div>
              <div className="mb-1.5 text-[12px] font-medium text-muted">Role</div>
              <Segmented layoutId="role" value={role} onChange={setRole} options={["Viewer", "Operator", "Admin"]} />
              <p className="mt-1.5 text-[11.5px] text-muted/80">{roles.find((r) => r.role === role).can}</p>
            </div>
            <Field label="Sees"><select className={inputCls}><option className="bg-raised">All clients (Astute staff)</option><option className="bg-raised">Parker only</option></select></Field>
            <div className="rounded-xl border border-accent/25 bg-accent/[0.04] p-4">
              <Toggle on={email} onChange={setEmail} label="Email a temporary password and sign-in link" hint="No more copying passwords into chat. The link and password expire in 24 hours." />
              <AnimatePresence>
                {email && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <EmailPreview />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="flex items-start gap-2.5 text-[12px] leading-[18px] text-muted/80"><Smartphone className="mt-0.5 size-4 shrink-0 text-accent" />At first sign-in they set up Microsoft Authenticator, Google Authenticator, Duo or 1Password by scanning a QR code, and save 10 recovery codes.</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Drawer>
  );
}

function EmailPreview() {
  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-white text-navy shadow-[0_20px_50px_-20px_#003C51]">
      <div className="border-b border-muted/50 px-4 py-2 text-[11px] text-muted/75"><b className="text-navy">From</b> Pegasus &lt;no-reply@beastute.com&gt; · <b className="text-navy">Subject</b> You've been added to Pegasus</div>
      <div className="px-5 py-4">
        <AstuteLogo className="h-5 w-auto" />
        <div className="mt-3 font-display text-[16px] font-bold text-navy">Hi Mohammed, welcome to Pegasus.</div>
        <p className="mt-1 text-[12px] leading-[18px] text-muted/75">Arvind Rajan added you as an Operator for all clients. Sign in with this temporary password, then choose your own.</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="rounded-md bg-mist px-2.5 py-1.5 font-mono text-[12px] tracking-wider text-navy">••••-••••-7Q4K</span>
          <span className="rounded-md bg-teal px-3 py-1.5 text-[12px] font-medium text-fg">Sign in to Pegasus →</span>
        </div>
        <p className="mt-3 text-[10.5px] text-muted/75">Expires in 24 hours. If you weren't expecting this, ignore it.</p>
      </div>
    </div>
  );
}

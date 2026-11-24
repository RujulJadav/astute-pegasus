// People on live data: GET/POST /api/users, PATCH /api/users/<id>, POST …/reset-password, …/reset-mfa.
// Only Astute staff admins manage accounts; others get the backend's own refusal.
import { useState } from "react";
import { Users, UserPlus, ShieldCheck, Mail, Check, Eye, Wrench, Crown, Lock, Ban, KeyRound, Copy, Loader2, Send } from "lucide-react";
import { Panel, Button, Pill, PageHeader, Avatar, Drawer, Field, inputCls, Toggle, Segmented } from "../kit.jsx";
import { post, api } from "../../api/client.js";
import { useLive, initials, ago } from "../../api/live.jsx";
import { useGet, useNotice, Loading, Banner } from "../liveKit.jsx";

const ROLES = [
  { id: "viewer", label: "Viewer", icon: Eye, can: "Sees environments, jobs, patch levels and the audit log. Changes nothing." },
  { id: "operator", label: "Operator", icon: Wrench, can: "Starts and stops domains, checks status, downloads and applies patches (with approval where it's required)." },
  { id: "admin", label: "Admin", icon: Crown, can: "Everything, plus people, connectors, settings and integrations. Astute staff only." },
];

function status(u) {
  if (u.disabled) return ["Disabled", "neutral", Ban];
  if (u.locked) return ["Locked", "orange", Lock];
  if (u.invite_pending) return ["Invite sent", "apricot", Mail];
  if (u.must_change) return ["Temporary password", "apricot", Mail];
  if (!u.mfa) return ["MFA not set up", "apricot", KeyRound];
  return ["Active", "teal", ShieldCheck];
}

export default function LivePeople() {
  const { clients, me } = useLive();
  const { data, error, loading, reload } = useGet("/api/users");
  const { run, view, setNotice } = useNotice();
  const [add, setAdd] = useState(false);
  const [handover, setHandover] = useState(null);
  const users = data?.users || [];
  const clientName = (id) => (id ? clients.find((c) => c.id === id)?.name || id : "Astute (all clients)");

  const patch = (u, body, ok) => run(async () => { await api(`/api/users/${u.id}`, { method: "PATCH", body }); await reload(); }, ok);
  const resetPw = (u) => run(async () => { const r = await post(`/api/users/${u.id}/reset-password`, {}); setHandover({ ...r, name: u.name }); await reload(); });
  const resetMfa = (u) => run(async () => { await post(`/api/users/${u.id}/reset-mfa`, {}); await reload(); }, `${u.name} sets up an authenticator app again at next sign-in.`);

  return (
    <div className="@container">
      <PageHeader eyebrow={<><Users className="size-3.5" />People</>} title="People and access"
        sub="Everyone signs in with a password and an authenticator app. Astute staff see every client; a client's own people see only theirs."
        actions={<Button variant="primary" icon={UserPlus} onClick={() => setAdd(true)}>Add a person</Button>} />
      {error && <Banner tone="error">{error}</Banner>}
      {view}
      {handover && <Handover h={handover} onClose={() => setHandover(null)} />}

      <div className="mb-4 grid grid-cols-1 gap-3 @3xl:grid-cols-3">
        {ROLES.map((r) => (
          <Panel key={r.id} className="h-full p-4">
            <div className="flex items-center gap-2 font-display text-[14px] font-bold"><r.icon className="size-4 text-accent" />{r.label}<span className="ml-auto font-sans text-[12px] font-normal text-muted/80">{users.filter((u) => u.role === r.id).length} people</span></div>
            <p className="mt-1.5 text-[12px] leading-[18px] text-muted/70">{r.can}</p>
          </Panel>
        ))}
      </div>

      <Panel className="overflow-hidden">
        {loading ? <Loading /> : (
          <table className="w-full text-[13px]">
            <thead className="border-b border-fg/[0.06] bg-fg/[0.02] text-left text-[11px] uppercase tracking-[0.1em] text-muted/70">
              <tr>{["Person", "Role", "Works for", "Status", "Last sign-in", ""].map((h) => <th key={h} className="px-5 py-2.5 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const [label, tone, Icon] = status(u);
                const self = me?.email === u.email;
                return (
                  <tr key={u.id} className="border-b border-fg/[0.05] last:border-0 hover:bg-fg/[0.02]">
                    <td className="px-5 py-3"><span className="flex items-center gap-3"><Avatar initials={initials(u.name).slice(0, 2)} size={30} />
                      <span><span className="block text-fg">{u.name}{self && <span className="ml-1.5 text-[11px] text-muted">(you)</span>}</span><span className="block text-[11.5px] text-muted/80">{u.email}</span></span></span></td>
                    <td className="px-5 py-3">
                      <select aria-label={`Role for ${u.name}`} value={u.role} onChange={(e) => patch(u, { role: e.target.value }, `${u.name} is now ${e.target.value === "admin" ? "an" : "a"} ${e.target.value}.`)}
                        className="h-8 rounded-lg border border-fg/10 bg-fg/[0.04] px-2 text-[12.5px] text-fg outline-none">
                        {ROLES.filter((r) => !(u.client_id && r.id === "admin")).map((r) => <option key={r.id} value={r.id} className="bg-raised">{r.label}</option>)}
                      </select>
                    </td>
                    <td className="px-5 py-3 text-muted">{clientName(u.client_id)}</td>
                    <td className="px-5 py-3"><Pill tone={tone} icon={Icon}>{label}</Pill>{u.mfa && u.recovery_left < 3 && <span className="ml-2 text-[11px] text-warn">{u.recovery_left} recovery codes left</span>}</td>
                    <td className="px-5 py-3 text-[12px] text-muted/80">{u.last_login ? ago(u.last_login) : "never"}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right text-[12px]">
                      <span className="space-x-3 text-muted/80">
                        <button onClick={() => resetPw(u)} className="hover:text-fg">{u.invite_pending ? "Resend link" : "Reset password"}</button>
                        {u.mfa && <button onClick={() => resetMfa(u)} className="hover:text-fg">Reset MFA</button>}
                        {!self && (u.disabled
                          ? <button onClick={() => patch(u, { disabled: false }, `${u.name} can sign in again.`)} className="text-accent hover:underline">Enable</button>
                          : <button onClick={() => patch(u, { disabled: true }, `${u.name} is disabled and signed out everywhere.`)} className="text-risk/80 hover:text-risk">Disable</button>)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <AddPerson open={add} onClose={() => setAdd(false)} clients={clients} onAdded={(r) => { setAdd(false); setHandover(r); setNotice(null); reload(); }} />
    </div>
  );
}

// After adding someone or resetting a password: emailed link, or a temporary password to pass on.
function Handover({ h, onClose }) {
  const [copied, setCopied] = useState(false);
  const who = h.user?.name || h.name;
  if (h.emailed) return <Banner onClose={onClose}>{who} has been emailed a one-time sign-in link (valid 3 days).</Banner>;
  return (
    <Banner tone="warn" onClose={onClose}>
      <span className="block">{h.email_error ? `The email couldn't be sent (${h.email_error}). ` : "Email isn't set up, so "}pass this temporary password to {who} yourself. They choose their own at first sign-in.</span>
      <span className="mt-2 flex items-center gap-2"><code className="select-all rounded bg-fg/[0.06] px-2 py-1 font-mono text-[13px]">{h.temporary_password}</code>
        <button onClick={() => { try { navigator.clipboard?.writeText(h.temporary_password); } catch {} setCopied(true); }} className="inline-flex items-center gap-1 text-accent hover:underline">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}</button></span>
    </Banner>
  );
}

function AddPerson({ open, onClose, clients, onAdded }) {
  const [f, setF] = useState({ name: "", email: "", role: "operator", client_id: "", email_link: true });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const submit = async () => {
    setBusy(true); setErr("");
    try {
      const r = await post("/api/users", { ...f, client_id: f.client_id || null });
      setF({ name: "", email: "", role: "operator", client_id: "", email_link: true });
      onAdded(r);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} width={560} eyebrow="People" title="Add a person"
      footer={<><Button variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Button><Button variant="primary" icon={busy ? Loader2 : f.email_link ? Send : Check} disabled={busy} onClick={submit}>Add</Button></>}>
      <div className="space-y-5">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={set("name")} autoComplete="off" /></Field>
        <Field label="Work email"><input type="email" className={inputCls} value={f.email} onChange={set("email")} autoComplete="off" /></Field>
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-muted">Role</div>
          <Segmented layoutId="add-role" value={f.role} onChange={set("role")} options={ROLES.filter((r) => !(f.client_id && r.id === "admin")).map((r) => ({ value: r.id, label: r.label }))} />
          <p className="mt-1.5 text-[11.5px] text-muted/80">{ROLES.find((r) => r.id === f.role)?.can}</p>
        </div>
        <Field label="Sees"><select className={inputCls} value={f.client_id} onChange={(e) => setF((x) => ({ ...x, client_id: e.target.value, role: e.target.value && x.role === "admin" ? "operator" : x.role }))}>
          <option className="bg-raised" value="">All clients (Astute staff)</option>
          {clients.map((c) => <option key={c.id} value={c.id} className="bg-raised">{c.name} only</option>)}
        </select></Field>
        <div className="rounded-xl border border-accent/25 bg-accent/[0.04] p-4">
          <Toggle on={f.email_link} onChange={set("email_link")} label="Email a sign-in link" hint="Sent when email is set up (Settings). Otherwise you'll get a temporary password to pass on." />
        </div>
        {err && <p role="alert" className="rounded-lg border border-orange/50 bg-orange/10 px-3 py-2 text-[12.5px] text-fg">{err}</p>}
      </div>
    </Drawer>
  );
}

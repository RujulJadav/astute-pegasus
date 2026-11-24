// SSH access on live data:
//   GET  /api/clients/<cid>/access                         the key register (which key is on which servers)
//   POST /api/clients/<cid>/access                         add / remove / check a key (add and remove become a
//                                                          request when approval is on; check runs straight away)
//   POST /api/access/parse                                 read a pasted public key (type, fingerprint)
//   GET  /api/clients/<cid>/access-requests[/check]        requests, and whether approval is on / goes through Jira
//   POST /api/access-requests/<id>/approve|reject|withdraw
//   PUT  /api/clients/<cid>/access-settings                approval on or off (admins)
import { useEffect, useState } from "react";
import { KeyRound, Plus, ShieldCheck, Trash2, RefreshCw, Check, X, Loader2, Search, Ticket, ExternalLink } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { Panel, PanelHead, Button, Pill, PageHeader, Drawer, Field, inputCls, Toggle, Confirm, Segmented } from "../kit.jsx";
import { post, put } from "../../api/client.js";
import { ago } from "../../api/live.jsx";
import JobConsole from "../parts/JobConsole.jsx";
import { useClient, useGet, useNotice, Loading, NoClient, EmptyBox, Banner } from "../liveKit.jsx";

const REQ_TONE = { pending: "apricot", approved: "teal", rejected: "orange", withdrawn: "neutral" };

export default function LiveAccess() {
  const { client, loading } = useClient();
  if (!client) return <NoClient eyebrow={<><KeyRound className="size-3.5" />SSH access</>} title="SSH access" loading={loading} />;
  return <ClientAccess key={client.id} client={client} />;
}

function ClientAccess({ client }) {
  const cid = client.id;
  const keys = useGet(`/api/clients/${cid}/access`);
  const reqs = useGet(`/api/clients/${cid}/access-requests`, { every: 60000 });
  const { run, view, setNotice } = useNotice();
  const [giving, setGiving] = useState(false);
  const [job, setJob] = useState(null);
  const [confirm, setConfirm] = useState(null); // { body, expected, title }
  const [q, setQ] = useState("");
  const approval = reqs.data?.approval;
  const reload = () => { keys.reload(); reqs.reload(); };

  // add / remove / check through the one endpoint; handles the production confirmation and request-vs-job answers
  const access = async (body, what) => {
    setNotice(null);
    try {
      const r = await post(`/api/clients/${cid}/access`, body);
      if (r.pending) setNotice({ text: `${what}: request saved${r.jira_key ? ` as ${r.jira_key}` : ""}. ${r.jira_key ? `It runs when it's approved in ${reqs.data?.system || "Jira"}.` : "Another admin approves it here, then it runs."}` });
      if (r.job) setJob({ id: r.job, what, env: client.name, by: "you", onDone: reload });
      reload();
      return true;
    } catch (e) {
      if (e.body?.need_confirm) { setConfirm({ body, expected: e.body.expected, what }); return false; }
      setNotice({ tone: "error", text: e.message });
      return false;
    }
  };
  const decide = (r, how) => run(async () => {
    const res = await post(`/api/access-requests/${r.id}/${how}`, {});
    if (res.job) setJob({ id: res.job, what: r.summary, env: client.name, by: "you", onDone: reload });
    reload();
  }, how === "approve" ? "Approved; the change is running." : how === "reject" ? "Rejected." : "Withdrawn.").catch(() => {});
  const approveWithConfirm = async (r) => {
    setNotice(null);
    try {
      const res = await post(`/api/access-requests/${r.id}/approve`, {});
      setJob({ id: res.job, what: r.summary, env: client.name, by: "you", onDone: reload }); reload();
    } catch (e) {
      if (e.body?.need_confirm) setConfirm({ approve: r, expected: e.body.expected, what: r.summary });
      else setNotice({ tone: "error", text: e.message });
    }
  };

  const shown = (keys.data?.keys || []).filter((k) => !q || `${k.comment} ${k.fingerprint} ${k.account} ${k.note} ${k.servers.join(" ")}`.toLowerCase().includes(q.toLowerCase()));
  const pending = (reqs.data?.requests || []).filter((r) => r.status === "pending");

  return (
    <div className="@container">
      <PageHeader eyebrow={<><KeyRound className="size-3.5" />SSH access · {client.name}</>} title="Who can sign in to the servers"
        sub="Public keys Pegasus has put on each server's authorized_keys, and who asked for them. Adding or removing a key needs a second person when approval is on."
        actions={<Button variant="primary" icon={Plus} onClick={() => setGiving(true)} disabled={!client.envs.length}>Give access</Button>} />
      {(keys.error || reqs.error) && <Banner tone="error">{keys.error || reqs.error}</Banner>}
      {view}

      <div className="grid grid-cols-1 gap-5 @6xl:grid-cols-12">
        <div className="space-y-5 @6xl:col-span-8">
          <Panel>
            <PanelHead icon={KeyRound} title="Key register" meta={`${keys.data?.keys?.length ?? "…"} keys`}
              action={<div className="relative"><Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted/70" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a key or server" aria-label="Find a key or server" className={cx(inputCls, "h-8 w-56 pl-8 text-[12px]")} /></div>} />
            {keys.loading ? <Loading /> : !shown.length ? <div className="px-5 pb-5"><EmptyBox>{q ? "Nothing matches." : "No keys added through Pegasus yet."}</EmptyBox></div> : (
              <ul className="px-3 pb-3">
                {shown.map((k) => (
                  <li key={k.id} className="flex flex-wrap items-start gap-3 rounded-xl px-3 py-3 hover:bg-fg/[0.03]">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent"><KeyRound className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-fg">{k.comment || "(no comment)"} <span className="text-[11.5px] text-muted">{k.type}{k.account ? ` · account ${k.account}` : ""}</span></div>
                      <div className="truncate font-mono text-[11px] text-muted/80">{k.fingerprint}</div>
                      <div className="mt-1 text-[11.5px] text-muted">{k.servers.length} server{k.servers.length === 1 ? "" : "s"} in {k.environments.join(", ") || "–"} · added by {k.added_by} {ago(k.added_at)}{k.expires_on ? ` · ends ${k.expires_on}` : ""}</div>
                      {k.note && <div className="text-[11.5px] text-muted/80">{k.note}</div>}
                    </div>
                    <span className="flex gap-2">
                      <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => access({ action: "check", record: k.id }, `Check key ${k.comment || ""}`)}>Check</Button>
                      <Button size="sm" variant="danger" icon={Trash2} onClick={() => setConfirm({ remove: k, what: `Remove key ${k.comment || k.fingerprint.slice(0, 20)}` })}>Remove</Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHead icon={Ticket} title="Requests" meta={approval === undefined ? "" : approval ? (reqs.data?.jira ? `approved in ${reqs.data.system}` : "approved by another admin here") : "approval is off"}
              action={reqs.data?.jira && <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => run(async () => { reqs.setData(await post(`/api/clients/${cid}/access-requests/check`, {})); })}>Check now</Button>} />
            {reqs.loading ? <Loading /> : !(reqs.data?.requests || []).length ? <div className="px-5 pb-5 text-[12.5px] text-muted/80">No requests yet.</div> : (
              <ul className="px-3 pb-3">
                {reqs.data.requests.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start gap-3 rounded-xl px-3 py-2.5 text-[12.5px] hover:bg-fg/[0.03]">
                    <Pill tone={REQ_TONE[r.status]}>{r.status}</Pill>
                    <div className="min-w-0 flex-1">
                      <div className="text-fg">{r.summary} <span className="text-muted">on {r.environments.join(", ")}</span></div>
                      <div className="text-[11.5px] text-muted/80">{r.note} · by {r.requested_by} {ago(r.requested_at)}{r.expires_on ? ` · ends ${r.expires_on}` : ""}{r.decided_by ? ` · ${r.status} by ${r.decided_by}` : ""}</div>
                      {r.jira_key && <a href={r.jira_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-mono text-[11.5px] text-accent">{r.jira_key}<ExternalLink className="size-3" />{r.jira_status && <span className="font-sans text-muted"> · {r.jira_status}</span>}</a>}
                    </div>
                    <span className="flex gap-3 whitespace-nowrap">
                      {r.can_decide && <><button onClick={() => approveWithConfirm(r)} className="inline-flex items-center gap-1 text-accent hover:underline"><Check className="size-3.5" />Approve</button>
                        <button onClick={() => decide(r, "reject")} className="inline-flex items-center gap-1 text-risk/80 hover:text-risk"><X className="size-3.5" />Reject</button></>}
                      {r.status === "pending" && r.mine && !r.jira_key && <span className="text-[11.5px] text-muted/70">Waiting for another admin</span>}
                      {r.can_withdraw && <button onClick={() => decide(r, "withdraw")} className="text-muted hover:text-fg">Withdraw</button>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-5 @6xl:col-span-4">
          <Panel>
            <PanelHead icon={ShieldCheck} title="Approval" />
            <div className="space-y-3 px-5 pb-5">
              {approval !== undefined && <Toggle on={approval} onChange={(v) => run(async () => { await put(`/api/clients/${cid}/access-settings`, { approval: v }); reqs.reload(); }, v ? "Adding or removing a key now needs a second person." : "Keys are now added and removed straight away.")}
                label="A second person approves each change" hint={reqs.data?.jira ? `${client.name} has ${reqs.data.system} change approval on, so requests become ${reqs.data.system} tickets.` : "Another admin approves it here. With Jira or ServiceNow change approval on (Integrations), it becomes a ticket instead."} />}
              <p className="text-[11.5px] leading-4 text-muted/80">Production access needs an end date; Pegasus removes the key by itself after it. Keys are never added for root.</p>
              {pending.length > 0 && <Pill tone="apricot">{pending.length} waiting for approval</Pill>}
            </div>
          </Panel>
        </div>
      </div>

      <GiveAccess open={giving} onClose={() => setGiving(false)} client={client} approval={approval} onSubmit={async (body) => { const ok = await access(body, "Give access"); if (ok) setGiving(false); }} />
      <Confirm open={!!confirm} onClose={() => setConfirm(null)} danger typeToConfirm={confirm?.expected} title={confirm?.what ? `${confirm.what}?` : ""} cta={confirm?.remove ? "Remove" : "Confirm"}
        onConfirm={async () => {
          const c = confirm; setConfirm(null);
          if (c.remove) return access({ action: "remove", record: c.remove.id, note: `Removed from ${client.name}'s register` }, c.what);
          if (c.approve) {
            try { const res = await post(`/api/access-requests/${c.approve.id}/approve`, { confirm: c.expected }); setJob({ id: res.job, what: c.what, env: client.name, by: "you", onDone: reload }); reload(); }
            catch (e) { setNotice({ tone: "error", text: e.message }); }
            return;
          }
          access({ ...c.body, confirm: c.expected }, c.what);
        }}>
        {confirm?.remove ? `Takes the key off ${confirm.remove.servers.length} server${confirm.remove.servers.length === 1 ? "" : "s"}${approval ? ", once another person approves" : ""}.` : confirm?.expected ? `This touches production. Type ${confirm.expected} to go ahead.` : ""}
      </Confirm>
      <JobConsole job={job} onClose={() => setJob(null)} />
    </div>
  );
}

function GiveAccess({ open, onClose, client, approval, onSubmit }) {
  const [f, setF] = useState({ key: "", account: "", environments: [], note: "", expires_on: "" });
  const [parsed, setParsed] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF({ key: "", account: "", environments: [], note: "", expires_on: "" }); setParsed(null); } }, [open]);
  useEffect(() => {
    if (!f.key.trim()) { setParsed(null); return; }
    const t = setTimeout(() => post("/api/access/parse", { key: f.key }).then(setParsed).catch((e) => setParsed({ error: e.message })), 300);
    return () => clearTimeout(t);
  }, [f.key]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const toggleEnv = (n) => setF((x) => ({ ...x, environments: x.environments.includes(n) ? x.environments.filter((y) => y !== n) : [...x.environments, n] }));
  const prd = client.envs.filter((e) => e.tier === "PRD" && f.environments.includes(e.name));
  return (
    <Drawer open={open} onClose={onClose} width={580} eyebrow={`SSH access · ${client.name}`} title="Give access"
      footer={<><span className="text-[11.5px] text-muted/80">{approval ? "Saved as a request; runs once someone else approves." : "Runs straight away."}</span>
        <Button variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={busy ? Loader2 : Plus} disabled={busy || !parsed || parsed.error} onClick={async () => { setBusy(true); await onSubmit({ action: "add", ...f }); setBusy(false); }}>{approval ? "Request access" : "Give access"}</Button></>}>
      <div className="space-y-5">
        <Field label="Public key" hint="The whole line from the person's id_ed25519.pub or id_rsa.pub. Never a private key.">
          <textarea rows={3} value={f.key} onChange={set("key")} className={cx(inputCls, "h-auto py-2 font-mono text-[11.5px]")} placeholder="ssh-ed25519 AAAA… name@laptop" />
        </Field>
        {parsed && (parsed.error ? <p role="alert" className="text-[12px] text-risk">{parsed.error}</p>
          : <p className="flex items-center gap-2 text-[12px] text-muted"><Check className="size-3.5 text-accent" />{parsed.type} {parsed.bits ? `${parsed.bits}-bit ` : ""}· {parsed.comment || "no comment"} · <span className="font-mono">{parsed.fingerprint}</span></p>)}
        <Field label="Account (optional)" hint="Leave empty for the connector's SSH account (usually opc)."><input className={inputCls} value={f.account} onChange={set("account")} placeholder="opc" /></Field>
        <div role="group" aria-label="Environments">
          <div className="mb-1.5 text-[12px] font-medium text-muted">Environments</div>
          <div className="flex flex-wrap gap-1.5">
            {client.envs.map((e) => <button key={e.name} type="button" aria-pressed={f.environments.includes(e.name)} onClick={() => toggleEnv(e.name)}
              className={cx("h-9 rounded-lg border px-3 text-[12.5px]", f.environments.includes(e.name) ? "border-accent bg-accent/15 text-fg" : "border-fg/10 text-muted")}>{e.name} <span className="text-[11px] text-muted">{e.tier}</span></button>)}
          </div>
        </div>
        <Field label="Who it's for and why" hint={approval ? "The approver reads this." : undefined}><input className={inputCls} value={f.note} onChange={set("note")} maxLength={300} /></Field>
        <Field label={`Access ends${prd.length ? " (required for production)" : " (optional)"}`} hint="Pegasus removes the key by itself after this date."><input type="date" className={inputCls} value={f.expires_on} onChange={set("expires_on")} /></Field>
      </div>
    </Drawer>
  );
}

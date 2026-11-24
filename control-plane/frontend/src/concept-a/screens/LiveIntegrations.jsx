// Integrations on live data. The ticketing adapters are real and per customer:
//
//   GET|PUT /api/clients/<cid>/ticketing                  which system change approvals go through (jira | servicenow)
//   GET|PUT /api/clients/<cid>/<jira|servicenow>          the adapter's settings (token write-only, kept encrypted)
//   DELETE  /api/clients/<cid>/<jira|servicenow>/token
//   POST    /api/clients/<cid>/<jira|servicenow>/test     sign in and read the project / change table
//
// The other adapters in the design (monitoring, clouds, chat) aren't in the control plane yet; they're shown as such.
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Blocks, Ticket, Activity, Cloud, Mail, Check, Loader2, Plug, ArrowRight, Workflow, Webhook, ScrollText, Sun, Radar, Building2, KeyRound, MessagesSquare, Hash, Server, CircleAlert, Trash2, FileCode2 } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { integrations } from "../../shared/data.js";
import { Panel, Button, Pill, PageHeader, Drawer, Field, inputCls, Segmented, Toggle, ease } from "../kit.jsx";
import { useShell } from "../App.jsx";
import { get, put, post, del } from "../../api/client.js";
import { useLive } from "../../api/live.jsx";

const GROUP_ICON = [Ticket, Activity, Cloud, Mail];
const ITEM_ICON = { jira: Ticket, servicenow: Workflow, webhook: Webhook, "oci-monitoring": Activity, "oci-logging": ScrollText, solarwinds: Sun, nagios: Radar, oci: Cloud, azure: Cloud, aws: Server, onprem: Building2, email: Mail, google: KeyRound, teams: MessagesSquare, slack: Hash };
const NAMES = { jira: "Jira", servicenow: "ServiceNow" };

export default function LiveIntegrations() {
  const { scope } = useShell();
  const { clients, session } = useLive();
  const client = clients.find((c) => c.id === scope) || clients[0];
  const [state, setState] = useState(null); // { system, jira: {config, has_token}, servicenow: {...} }
  const [err, setErr] = useState("");
  const [cfg, setCfg] = useState(null);

  const load = useCallback(async () => {
    if (!client) return;
    try {
      const [t, j, s] = await Promise.all([get(`/api/clients/${client.id}/ticketing`), get(`/api/clients/${client.id}/jira`), get(`/api/clients/${client.id}/servicenow`)]);
      setState({ system: t.system, jira: j, servicenow: s }); setErr("");
    } catch (e) { setErr(e.message); }
  }, [client?.id]);
  useEffect(() => { setState(null); load(); }, [load]);

  const statusOf = (id) => {
    if (id === "jira" || id === "servicenow") {
      if (!state) return { tone: "neutral", label: "Loading…" };
      const a = state[id], active = state.system === id;
      if (active && a.config.enabled && a.has_token) return { tone: "cyan", label: "Connected · approvals on", live: true };
      if (a.has_token || a.config.url) return { tone: "apricot", label: active ? "Set up · approvals off" : "Set up · not in use", live: true };
      return { tone: "neutral", label: "Ready to set up", live: true };
    }
    if (id === "google") return session?.google ? { tone: "cyan", label: "On (set on the server)" } : { tone: "neutral", label: "Off (set on the server)" };
    if (id === "email") return { tone: "neutral", label: "Set on the server" };
    return { tone: "neutral", label: "Not in Pegasus yet" };
  };
  const detailOf = (it) => {
    if (!state || !(it.id in NAMES)) return it.detail;
    const c = state[it.id].config;
    if (!c.url) return it.id === "jira" ? "Jira Cloud or Data Center: Pegasus raises a Change, waits for approval, then unlocks Apply." : "Change requests in ServiceNow: Pegasus raises one, waits for approval, then unlocks Apply.";
    return [c.url.replace(/^https:\/\//, ""), it.id === "jira" ? (c.project && `project ${c.project}`) : (c.assignment_group && `group ${c.assignment_group}`),
      c.require === "prd" ? "production only" : "every environment"].filter(Boolean).join(" · ");
  };

  if (!client) return <PageHeader eyebrow={<><Blocks className="size-3.5" />Integrations</>} title="Adapters, not hard-coding" sub="No customers yet." />;

  return (
    <div className="@container">
      <PageHeader eyebrow={<><Blocks className="size-3.5" />Integrations · {client.name}</>} title="Adapters, not hard-coding"
        sub={`Pegasus talks to help desks through adapters, configured per customer. ${client.name}'s change approvals go through ${state ? NAMES[state.system] : "…"}. Switch customer in the top bar.`} />
      {err && <div role="alert" className="mb-5 flex gap-2 rounded-xl border border-orange/50 bg-orange/10 px-4 py-2.5 text-[12.5px] text-fg"><CircleAlert className="mt-0.5 size-4 text-orange" />{err}</div>}

      <div className="space-y-7">
        {integrations.map((g, gi) => {
          const Icon = GROUP_ICON[gi];
          return (
            <section key={g.group}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="flex items-center gap-2 font-display text-[16px] font-bold"><Icon className="size-4 text-accent" />{g.group}</h2>
                {g.note && <span className="text-[12px] text-muted/80">{g.note}</span>}
              </div>
              <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2 @6xl:grid-cols-4">
                {g.items.map((it, i) => {
                  const st = statusOf(it.id), on = st.tone === "cyan", inUse = state?.system === it.id;
                  const I = ITEM_ICON[it.id] || Plug;
                  return (
                    <motion.button key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.05 + i * 0.04, ease }} whileHover={st.live ? { y: -2 } : undefined}
                      onClick={() => st.live && setCfg(it.id)} disabled={!st.live} aria-label={st.live ? `Configure ${it.name}` : undefined}
                      className={cx("group flex flex-col rounded-2xl border p-4 text-left transition-colors", on ? "border-accent/25 bg-navy/30 day:bg-[linear-gradient(160deg,#FFFFFF,#E6F4F1)] day:border-teal/40 day:shadow-card" : st.live ? "border-fg/[0.08] bg-fg/[0.02] hover:border-fg/20" : "cursor-default border-fg/[0.06] bg-fg/[0.01] opacity-70")}>
                      <div className="flex items-center gap-2.5">
                        <span className={cx("grid size-9 place-items-center rounded-xl ring-1", on ? "bg-accent/10 text-accent ring-accent/30" : "bg-fg/[0.04] text-muted ring-fg/10")}><I className="size-4" /></span>
                        <span className="text-[14px] font-medium text-fg">{it.id in NAMES ? NAMES[it.id] : it.name}</span>
                        {inUse && <span className="ml-auto text-[11px] text-accent">In use</span>}
                      </div>
                      <p className="mt-2.5 flex-1 text-[12px] leading-[18px] text-muted/70">{detailOf(it)}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Pill tone={st.tone} icon={on ? Check : undefined}>{st.label}</Pill>
                        {st.live && <ArrowRight className="ml-auto size-3.5 text-muted/70 transition group-hover:translate-x-0.5 group-hover:text-accent" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <Panel className="mt-8 px-6 py-4">
        <div className="flex items-center gap-2 text-[11.5px] text-muted/80"><FileCode2 className="size-3.5 text-accent" />Settings are saved per customer in the control plane. Tokens and passwords are encrypted and never sent back to the browser.</div>
      </Panel>

      {state && <Configure system={cfg} client={client} state={state} onClose={() => setCfg(null)} onChanged={load} />}
    </div>
  );
}

const listText = (v) => (Array.isArray(v) ? v.join(", ") : v || "");

function Configure({ system, client, state, onClose, onChanged }) {
  const cid = client.id;
  const a = system ? state[system] : null;
  const [f, setF] = useState(null);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!a) return;
    const c = a.config;
    setF({ ...c, approved_statuses: listText(c.approved_statuses), rejected_statuses: listText(c.rejected_statuses), extra_fields: JSON.stringify(c.extra_fields || {}, null, 0) });
    setToken(""); setMsg(null);
  }, [system]);
  if (!system || !f) return <Drawer open={false} onClose={onClose} />;
  const isJira = system === "jira";
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const inUse = state.system === system;

  const run = (key, fn) => async () => {
    setBusy(key); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ tone: "error", text: e.message }); } finally { setBusy(""); }
  };
  const save = run("save", async () => {
    const body = { ...f, ...(token ? { token } : {}) };
    await put(`/api/clients/${cid}/${system}`, body);
    setToken("");
    await onChanged();
    setMsg({ text: `Saved for ${client.name}.` });
  });
  const test = run("test", async () => {
    const r = await post(`/api/clients/${cid}/${system}/test`, {});
    setMsg({ tone: r.warning ? "warn" : undefined, lines: [`Signed in as ${r.user || "the integration user"}`, isJira ? `Project: ${r.project}${r.issue_types?.length ? ` · issue types ${r.issue_types.join(", ")}` : ""}` : "change_request table readable",
      ...(r.filled?.length ? [`Fills: ${r.filled.join(", ")}`] : [])], text: r.warning });
  });
  const forget = run("forget", async () => { await del(`/api/clients/${cid}/${system}/token`); await onChanged(); setF((x) => ({ ...x, enabled: false })); setMsg({ text: "Token removed; approvals switched off." }); });
  const use = run("use", async () => { await put(`/api/clients/${cid}/ticketing`, { system }); await onChanged(); setMsg({ text: `${client.name}'s change approvals now go through ${NAMES[system]}.` }); });

  return (
    <Drawer open={!!system} onClose={onClose} width={600} eyebrow={`Configure adapter · ${client.name}`} title={NAMES[system]}
      footer={<>
        <span className="text-[11.5px] text-muted/80">Test uses the saved settings: save first.</span>
        <Button className="ml-auto" onClick={test} disabled={!!busy} icon={busy === "test" ? Loader2 : undefined}>Test connection</Button>
        <Button variant="primary" onClick={save} disabled={!!busy} icon={busy === "save" ? Loader2 : undefined}>Save</Button>
      </>}>
      <div className="space-y-5">
        <div className={cx("flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-[12.5px]", inUse ? "border-accent/30 bg-accent/[0.06]" : "border-fg/10 bg-fg/[0.03]")}>
          {inUse ? <><Check className="size-4 text-accent" /><span>Change approvals for {client.name} go through {NAMES[system]}.</span></>
            : <><span className="text-muted">{client.name} uses {NAMES[state.system]} for change approvals.</span><Button size="sm" className="ml-auto" onClick={use} disabled={!!busy}>Use {NAMES[system]} instead</Button></>}
        </div>

        <Toggle on={!!f.enabled} onChange={set("enabled")} label="Require change approval before Apply" hint="Pegasus raises the ticket, checks it every 5 minutes, and unlocks Apply only once someone else approves it." />
        <div role="group" aria-labelledby={`req-${system}-label`}>
          <span id={`req-${system}-label`} className="mb-1.5 block text-[12px] font-medium text-muted">Which environments need approval</span>
          <Segmented size="sm" layoutId={`req-${system}`} value={f.require} onChange={set("require")} options={[{ value: "all", label: "Every environment" }, { value: "prd", label: "Production only" }]} />
        </div>

        <Field label={isJira ? "Jira site" : "Instance URL"} hint={isJira ? "https://yourcompany.atlassian.net or your Data Center URL" : "https://yourcompany.service-now.com"}><input className={inputCls} value={f.url} onChange={set("url")} placeholder="https://" /></Field>
        <div className="grid grid-cols-2 gap-3">
          {isJira
            ? <Field label="Deployment"><select className={inputCls} value={f.deployment} onChange={set("deployment")}><option className="bg-raised" value="cloud">Jira Cloud (email + API token)</option><option className="bg-raised" value="datacenter">Data Center (personal access token)</option></select></Field>
            : <Field label="Sign in with"><select className={inputCls} value={f.auth} onChange={set("auth")}><option className="bg-raised" value="basic">User and password</option><option className="bg-raised" value="oauth">OAuth token</option></select></Field>}
          <Field label={isJira ? "Account email" : "Integration user"} hint={isJira && f.deployment === "datacenter" ? "Not needed for Data Center" : undefined}><input className={inputCls} value={f.user} onChange={set("user")} /></Field>
        </div>
        <Field label={isJira ? "API token" : f.auth === "oauth" ? "OAuth token" : "Password"} hint={a.has_token ? "A token is saved. Leave blank to keep it." : "Kept encrypted. Never shown again."}>
          <div className="flex gap-2">
            <input type="password" autoComplete="new-password" className={inputCls} value={token} onChange={(e) => setToken(e.target.value)} placeholder={a.has_token ? "••••••••  (saved)" : ""} />
            {a.has_token && <Button size="sm" variant="ghost" icon={Trash2} onClick={forget} disabled={!!busy}>Forget</Button>}
          </div>
        </Field>
        {isJira ? (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Project key"><input className={inputCls} value={f.project} onChange={set("project")} placeholder="CHG" /></Field>
            <Field label="Issue type"><input className={inputCls} value={f.issue_type} onChange={set("issue_type")} /></Field>
            <Field label="Change type"><input className={inputCls} value={f.change_type} onChange={set("change_type")} /></Field>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Field label="Change type"><select className={inputCls} value={f.change_type} onChange={set("change_type")}>{["Normal", "Standard", "Emergency"].map((t) => <option key={t} className="bg-raised">{t}</option>)}</select></Field>
            <Field label="Assignment group"><input className={inputCls} value={f.assignment_group} onChange={set("assignment_group")} /></Field>
            <Field label="Category"><input className={inputCls} value={f.category} onChange={set("category")} /></Field>
          </div>
        )}
        <Field label={'States that mean "approved"'} hint="Comma-separated, as they appear in the ticket."><input className={inputCls} value={f.approved_statuses} onChange={set("approved_statuses")} /></Field>
        <Field label={'States that mean "declined"'}><input className={inputCls} value={f.rejected_statuses} onChange={set("rejected_statuses")} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="After creating" hint="Sends it for approval"><input className={inputCls} value={f.submit_transition} onChange={set("submit_transition")} /></Field>
          <Field label="When Apply starts"><input className={inputCls} value={f.start_transition} onChange={set("start_transition")} /></Field>
          <Field label="When it succeeds"><input className={inputCls} value={f.done_transition} onChange={set("done_transition")} /></Field>
        </div>
        <Field label="Additional fields (JSON)" hint={isJira ? 'Any other fields the project requires, e.g. {"labels": ["pegasus"]}' : 'e.g. {"u_service": "PeopleSoft"}'}><textarea rows={2} className={cx(inputCls, "h-auto py-2 font-mono text-[12px]")} value={f.extra_fields} onChange={set("extra_fields")} /></Field>
        <Toggle on={!!f.block_self_approval} onChange={set("block_self_approval")} label="Don't accept approval by the account Pegasus uses" hint="Someone other than the integration account must approve." />

        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role={msg.tone === "error" ? "alert" : "status"}
              className={cx("rounded-xl border p-3.5 text-[12.5px]", msg.tone === "error" ? "border-orange/50 bg-orange/10" : msg.tone === "warn" ? "border-apricot/60 bg-apricot/10" : "border-accent/30 bg-accent/[0.06]")}>
              {msg.lines && <div className="space-y-1">{msg.lines.map((l) => <div key={l} className="flex items-center gap-2 text-fg"><Check className="size-3.5 text-accent" />{l}</div>)}</div>}
              {msg.text && <div className={cx("text-fg", msg.lines && "mt-2")}>{msg.text}</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Drawer>
  );
}

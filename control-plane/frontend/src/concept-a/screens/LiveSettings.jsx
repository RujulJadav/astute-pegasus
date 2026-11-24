// Settings on live data. Per customer (switch customer in the top bar):
//   GET/PUT /api/clients/<cid>/patch-settings     staging folder, servers at once, backups kept, time zone, cadence, CPU targets
//   PUT     /api/clients/<cid>/oci-console        OCI tenancy and region (for "Open OCI Console")
//   PUT     /api/clients/<cid>/environments/<env>/start-order   custom start order and manual follow-up steps
// For everyone (Astute staff admins):
//   GET/PUT /api/mail, POST /api/mail/test        email for sign-in links and password resets
// Ticketing (Jira / ServiceNow) is under Integrations.
import { useEffect, useState } from "react";
import { Settings2, HardDrive, Target, Cloud, ListOrdered, Mail, Plus, Trash2, Check, Loader2, Send } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { Panel, PanelHead, Button, PageHeader, Field, inputCls, Segmented, Toggle } from "../kit.jsx";
import { put, post } from "../../api/client.js";
import { useLive } from "../../api/live.jsx";
import { useClient, useGet, useNotice, Loading, NoClient, Banner } from "../liveKit.jsx";

const ZONES = (() => { try { return Intl.supportedValuesOf("timeZone"); } catch { return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"]; } })();
const COMP = { jdk: "JDK", weblogic: "WebLogic", dbclient: "Oracle Database Client", tuxedo: "Tuxedo" };
const ROLE = { app: "App server", prcs: "Process scheduler", web: "Web (PIA)" };

export default function LiveSettings() {
  const { client, loading } = useClient();
  if (!client) return <NoClient eyebrow={<><Settings2 className="size-3.5" />Settings</>} title="Settings" loading={loading} />;
  return <ClientSettings key={client.id} client={client} />;
}

function ClientSettings({ client }) {
  const cid = client.id;
  const ps = useGet(`/api/clients/${cid}/patch-settings`);
  const { run, view } = useNotice();
  return (
    <div className="@container">
      <PageHeader eyebrow={<><Settings2 className="size-3.5" />Settings · {client.name}</>} title="Settings"
        sub={`How Pegasus works for ${client.name}: patching, the OCI Console link and start order. Email is shared by every customer. Jira and ServiceNow are under Integrations.`} />
      {ps.error && <Banner tone="error">{ps.error}</Banner>}
      {view}
      <div className="grid grid-cols-1 gap-5 @6xl:grid-cols-2">
        {ps.loading ? <Panel><Loading /></Panel> : ps.data && <PatchPanel cid={cid} s={ps.data} run={run} onSaved={ps.setData} />}
        <OciPanel client={client} run={run} />
        {ps.data && <div className="@6xl:col-span-2"><TargetsPanel cid={cid} s={ps.data} run={run} onSaved={ps.setData} /></div>}
        <div className="@6xl:col-span-2"><StartOrderPanel client={client} run={run} /></div>
        <div className="@6xl:col-span-2"><MailPanel run={run} /></div>
      </div>
    </div>
  );
}

function SaveRow({ busy, onSave, children }) {
  return <div className="flex items-center gap-3 pt-2">{children}<Button variant="primary" className="ml-auto" icon={busy ? Loader2 : Check} disabled={busy} onClick={onSave}>Save</Button></div>;
}

function useSaver(run) {
  const [busy, setBusy] = useState(false);
  return [busy, async (fn, ok) => { setBusy(true); const r = await run(fn, ok); setBusy(false); return r; }];
}

function PatchPanel({ cid, s, run, onSaved }) {
  const [f, setF] = useState({ staging_root: s.staging_root, parallel: s.parallel, keep_backups: s.keep_backups, time_zone: s.time_zone, cadence: s.cadence });
  const [busy, save] = useSaver(run);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  return (
    <Panel>
      <PanelHead icon={HardDrive} title="Patching" />
      <div className="space-y-4 px-5 pb-5">
        <Field label="Staging folder on each server" hint="Downloads are copied here before an apply. A dedicated folder, e.g. /u01/app/oracle/staging/cpu."><input className={cx(inputCls, "font-mono text-[12.5px]")} value={f.staging_root} onChange={set("staging_root")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Servers at once" hint={s.parallel_ready ? "During downloads and applies (1–10)." : "Needs every connector on 0.7 or later."}><input type="number" min={1} max={10} disabled={!s.parallel_ready} className={inputCls} value={f.parallel} onChange={set("parallel")} /></Field>
          <Field label="Backups kept per home" hint="After a successful apply. 0 keeps them all."><input type="number" min={0} max={20} className={inputCls} value={f.keep_backups} onChange={set("keep_backups")} /></Field>
        </div>
        <Field label="Time zone" hint="Used for change windows and shown on tickets."><select className={inputCls} value={f.time_zone} onChange={set("time_zone")}><option value="" className="bg-raised">Not set</option>{ZONES.map((z) => <option key={z} className="bg-raised">{z}</option>)}</select></Field>
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-muted">Releases this client takes</div>
          <Segmented layoutId="set-cadence" value={f.cadence} onChange={set("cadence")} options={[{ value: "monthly", label: "Every release (monthly)" }, { value: "quarterly", label: "Quarterly CPUs only" }]} />
        </div>
        <SaveRow busy={busy} onSave={() => save(async () => onSaved(await put(`/api/clients/${cid}/patch-settings`, { ...f, parallel: Number(f.parallel), keep_backups: Number(f.keep_backups) })), "Patching settings saved.")} />
      </div>
    </Panel>
  );
}

function OciPanel({ client, run }) {
  const { refresh } = useLive();
  const [f, setF] = useState({ tenancy: "", region: client.region || "" });
  const [busy, save] = useSaver(run);
  useEffect(() => { if (client.ociUrl) { const u = new URL(client.ociUrl); setF({ tenancy: u.searchParams.get("tenant") || "", region: u.searchParams.get("region") || "" }); } }, [client.id]);
  return (
    <Panel>
      <PanelHead icon={Cloud} title="OCI Console" meta="For the Open OCI Console button" />
      <div className="space-y-4 px-5 pb-5">
        <Field label="Tenancy name" hint="As it appears in the OCI Console sign-in. Leave empty to hide the button."><input className={inputCls} value={f.tenancy} onChange={(e) => setF((x) => ({ ...x, tenancy: e.target.value }))} /></Field>
        <Field label="Home region" hint="e.g. us-ashburn-1"><input className={inputCls} value={f.region} onChange={(e) => setF((x) => ({ ...x, region: e.target.value }))} /></Field>
        <SaveRow busy={busy} onSave={() => save(async () => { await put(`/api/clients/${client.id}/oci-console`, f); refresh(); }, f.tenancy ? "OCI Console link saved." : "OCI Console link removed.")}>
          {client.ociUrl && <a href={client.ociUrl} target="_blank" rel="noopener" className="text-[12px] text-accent hover:underline">Open the current link</a>}
        </SaveRow>
      </div>
    </Panel>
  );
}

const BLANK = { component: "weblogic", applies_to: "", target: "", patch_number: "", platform: "", file_filter: "", label: "", notes: "" };
function TargetsPanel({ cid, s, run, onSaved }) {
  const [rows, setRows] = useState(s.targets.length ? s.targets : []);
  const [busy, save] = useSaver(run);
  const set = (i, k) => (e) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)));
  return (
    <Panel>
      <PanelHead icon={Target} title="CPU targets" meta="Pin a level Pegasus should hold an environment to, instead of Oracle's latest" />
      <div className="px-5 pb-5">
        {!rows.length ? <p className="pb-2 text-[12.5px] text-muted/80">No targets: Pegasus compares against Oracle's latest releases.</p> : (
          <table className="w-full text-[12px]">
            <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-muted/70"><tr>{["Component", "Applies to version", "Target", "Patch number", "Platform", "Label", ""].map((h) => <th key={h} className="pb-1.5 pr-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2"><select aria-label="Component" className={cx(inputCls, "h-9")} value={r.component} onChange={set(i, "component")}>{Object.entries(COMP).map(([k, v]) => <option key={k} value={k} className="bg-raised">{v}</option>)}</select></td>
                  <td className="py-1 pr-2"><input aria-label="Applies to version" className={cx(inputCls, "h-9")} value={r.applies_to} onChange={set(i, "applies_to")} placeholder="14.1.2" /></td>
                  <td className="py-1 pr-2"><input aria-label="Target" className={cx(inputCls, "h-9")} value={r.target} onChange={set(i, "target")} placeholder="37000001 or 21.0.6" /></td>
                  <td className="py-1 pr-2"><input aria-label="Patch number" className={cx(inputCls, "h-9")} value={r.patch_number} onChange={set(i, "patch_number")} /></td>
                  <td className="py-1 pr-2"><input aria-label="Platform" className={cx(inputCls, "h-9 w-24")} value={r.platform} onChange={set(i, "platform")} placeholder="226P" /></td>
                  <td className="py-1 pr-2"><input aria-label="Label" className={cx(inputCls, "h-9")} value={r.label} onChange={set(i, "label")} /></td>
                  <td className="py-1"><button aria-label="Remove target" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="grid size-9 place-items-center text-muted hover:text-risk"><Trash2 className="size-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <SaveRow busy={busy} onSave={() => save(async () => onSaved(await put(`/api/clients/${cid}/patch-settings`, { targets: rows })), "CPU targets saved.")}>
          <Button size="sm" icon={Plus} onClick={() => setRows((r) => [...r, { ...BLANK }])}>Add a target</Button>
        </SaveRow>
      </div>
    </Panel>
  );
}

function StartOrderPanel({ client, run }) {
  const { refresh } = useLive();
  const [env, setEnv] = useState(client.envs[0]?.name || "");
  const e = client.envs.find((x) => x.name === env);
  const [stages, setStages] = useState({});
  const [manual, setManual] = useState("");
  const [busy, save] = useSaver(run);
  useEffect(() => {
    if (!e) return;
    setStages(Object.fromEntries(e.servers.map((s) => [`${s.ip || s.host}|${s.role}|${s.domain}`, s.stage ?? ""])));
    setManual((e.manualSteps || []).join("\n"));
  }, [env, client.id]);
  if (!e) return null;
  return (
    <Panel>
      <PanelHead icon={ListOrdered} title="Start order" meta="Stage 1 starts first; stopping runs it backwards. Leave empty for the usual order (app, scheduler, web)." />
      <div className="grid grid-cols-1 gap-5 px-5 pb-5 @4xl:grid-cols-[1fr_1fr]">
        <div>
          <Field label="Environment"><select className={inputCls} value={env} onChange={(x) => setEnv(x.target.value)}>{client.envs.map((v) => <option key={v.name} className="bg-raised">{v.name}</option>)}</select></Field>
          <table className="mt-3 w-full text-[12.5px]">
            <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-muted/70"><tr><th className="pb-1.5 font-medium">Domain</th><th className="pb-1.5 font-medium">Server</th><th className="w-24 pb-1.5 font-medium">Stage</th></tr></thead>
            <tbody>
              {e.servers.map((s) => { const k = `${s.ip || s.host}|${s.role}|${s.domain}`; return (
                <tr key={k}><td className="py-1 pr-2 text-fg">{s.domain} <span className="text-[11px] text-muted">{ROLE[s.role]}</span></td><td className="py-1 pr-2 font-mono text-[11.5px] text-muted">{s.host}</td>
                  <td className="py-1"><input type="number" min={1} max={99} aria-label={`Stage for ${s.domain} on ${s.host}`} className={cx(inputCls, "h-9")} value={stages[k] ?? ""} onChange={(x) => setStages((st) => ({ ...st, [k]: x.target.value }))} /></td></tr>
              ); })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col">
          <Field label="Manual steps after start" hint="One per line. Shown on the environment so operators don't miss them."><textarea rows={6} className={cx(inputCls, "h-auto py-2")} value={manual} onChange={(x) => setManual(x.target.value)} /></Field>
          <div className="mt-auto"><SaveRow busy={busy} onSave={() => save(async () => {
            await put(`/api/clients/${client.id}/environments/${encodeURIComponent(env)}/start-order`, { stages: Object.fromEntries(Object.entries(stages).filter(([, v]) => v !== "" && v != null).map(([k, v]) => [k, Number(v)])), manual: manual.split("\n") });
            refresh();
          }, `Start order for ${env} saved.`)} /></div>
        </div>
      </div>
    </Panel>
  );
}

function MailPanel({ run }) {
  const { data, error, setData } = useGet("/api/mail");
  const [f, setF] = useState(null);
  const [pw, setPw] = useState("");
  const [busy, save] = useSaver(run);
  useEffect(() => { if (data) setF(data.config); }, [data]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  return (
    <Panel>
      <PanelHead icon={Mail} title="Email" meta="For sign-in links to new people and password resets. Shared by every customer." />
      <div className="px-5 pb-5">
        {error ? <p className="text-[12.5px] text-muted/80">{error}</p> : !f ? <Loading /> : (
          <div className="space-y-4">
            <Toggle on={!!f.enabled} onChange={set("enabled")} label="Send email" hint="Off: new people get a temporary password for an admin to pass on." />
            <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-4">
              <Field label="SMTP server" className="@3xl:col-span-2"><input className={inputCls} value={f.host} onChange={set("host")} placeholder="smtp.email.us-ashburn-1.oci.oraclecloud.com" /></Field>
              <Field label="Port"><input type="number" className={inputCls} value={f.port} onChange={set("port")} /></Field>
              <Field label="Security"><select className={inputCls} value={f.security} onChange={set("security")}><option value="starttls" className="bg-raised">STARTTLS</option><option value="ssl" className="bg-raised">SSL</option><option value="none" className="bg-raised">None</option></select></Field>
              <Field label="User" className="@3xl:col-span-2"><input className={inputCls} value={f.user} onChange={set("user")} autoComplete="off" /></Field>
              <Field label="Password" className="@3xl:col-span-2" hint={data.has_password ? "Saved. Leave blank to keep it." : undefined}><input type="password" autoComplete="new-password" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} placeholder={data.has_password ? "••••••••  (saved)" : ""} /></Field>
              <Field label="From address" className="@3xl:col-span-2"><input className={inputCls} value={f.from_email} onChange={set("from_email")} /></Field>
              <Field label="From name" className="@3xl:col-span-2"><input className={inputCls} value={f.from_name} onChange={set("from_name")} /></Field>
            </div>
            <SaveRow busy={busy} onSave={() => save(async () => { const r = await put("/api/mail", { ...f, port: Number(f.port), ...(pw ? { password: pw } : {}) }); setPw(""); setData(r); }, "Email settings saved.")}>
              <Button size="sm" icon={Send} onClick={() => run(async () => post("/api/mail/test", {}), (r) => `Test email sent to ${r.to}.`)}>Send a test email</Button>
            </SaveRow>
          </div>
        )}
      </div>
    </Panel>
  );
}

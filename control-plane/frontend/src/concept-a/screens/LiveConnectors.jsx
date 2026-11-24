// Connectors on live data:
//   GET    /api/clients/<cid>                       connectors (version, certificate, update state), update mode, latest release
//   POST   /api/clients/<cid>/tokens                one-time registration token + the command to run on the admin host
//   DELETE /api/connectors/<id>                     remove (its certificate stops working at once)
//   POST   /api/connectors/<id>/update              update to the newest release
//   PUT    /api/clients/<cid>/connector-updates     manual or automatic updates
//   GET    /api/releases                            published connector releases (Astute staff)
import { useState } from "react";
import { Cable, Plus, Trash2, ArrowUpCircle, Copy, Check, ShieldCheck, Package, Server } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { Panel, PanelHead, Button, Pill, PageHeader, Drawer, Confirm, Segmented } from "../kit.jsx";
import { post, put, del } from "../../api/client.js";
import { useLive, ago } from "../../api/live.jsx";
import { useClient, useGet, useNotice, Loading, NoClient, EmptyBox, Banner, fmtTime } from "../liveKit.jsx";

export default function LiveConnectors() {
  const { client, loading } = useClient();
  if (!client) return <NoClient eyebrow={<><Cable className="size-3.5" />Connectors</>} title="Connectors" loading={loading} />;
  return <ClientConnectors key={client.id} client={client} />;
}

function ClientConnectors({ client }) {
  const cid = client.id;
  const { refresh } = useLive();
  const detail = useGet(`/api/clients/${cid}`, { every: 20000 });
  const rel = useGet("/api/releases");
  const { run, view } = useNotice();
  const [token, setToken] = useState(null);
  const [removing, setRemoving] = useState(null);
  const cons = detail.data?.connectors || [];
  const reload = () => { detail.reload(); refresh(); };

  const newToken = () => run(async () => setToken(await post(`/api/clients/${cid}/tokens`, {})));
  const update = (c) => run(async () => { const r = await post(`/api/connectors/${c.id}/update`, {}); reload(); return r; }, (r) => `${c.name} will update to ${r.version} on its next check-in.`);
  const setMode = (mode) => run(async () => { await put(`/api/clients/${cid}/connector-updates`, { mode }); reload(); }, mode === "auto" ? "Connectors update themselves when a new release is published." : "Connectors update when an admin clicks Update.");

  return (
    <div className="@container">
      <PageHeader eyebrow={<><Cable className="size-3.5" />Connectors · {client.name}</>} title="Connectors"
        sub="A connector runs on an admin host inside the client's network. It only makes outbound HTTPS calls to Pegasus, checks every job's signature, and runs it over SSH."
        actions={<Button variant="primary" icon={Plus} onClick={newToken}>Add a connector</Button>} />
      {detail.error && <Banner tone="error">{detail.error}</Banner>}
      {view}

      <div className="grid grid-cols-1 gap-5 @6xl:grid-cols-12">
        <div className="space-y-4 @6xl:col-span-8">
          {detail.loading ? <Panel><Loading /></Panel> : !cons.length ? <EmptyBox>No connectors for {client.name} yet. Add one to run jobs on its servers.</EmptyBox> : cons.map((c) => {
            const days = c.certificate?.valid_until ? Math.round((new Date(c.certificate.valid_until) - Date.now()) / 86400000) : null;
            return (
              <Panel key={c.id} className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className={cx("grid size-10 place-items-center rounded-xl ring-1", c.online ? "bg-accent/10 text-accent ring-accent/30" : "bg-orange/10 text-risk ring-orange/30")}><Server className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-display text-[16px] font-bold text-fg">{c.name}</span><Pill tone={c.online ? "teal" : "orange"}>{c.online ? "Online" : "Offline"}</Pill>
                      {c.update_available && <Pill tone="apricot">Update {c.update_available} available</Pill>}</div>
                    <div className="mt-0.5 text-[12px] text-muted">{c.hostname} · version {c.version} · seen {ago(c.last_seen)}</div>
                    <div className="text-[11.5px] text-muted/80">{c.platform}</div>
                  </div>
                  <span className="flex gap-2">
                    {c.update_available && c.can_update && !c.update_to && <Button size="sm" icon={ArrowUpCircle} onClick={() => update(c)}>Update</Button>}
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => setRemoving(c)}>Remove</Button>
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 text-[12px] @3xl:grid-cols-3">
                  <Fact label="Signs in with">{c.auth === "certificate" ? `Certificate ${c.certificate?.serial || ""}` : "Shared secret (older)"}</Fact>
                  <Fact label="Certificate">{days == null ? "–" : <span className={days < 14 ? "text-risk" : ""}>{days} days left · renews itself</span>}</Fact>
                  <Fact label="Registered">{fmtTime(c.created_at)}</Fact>
                </div>
                {(c.update_to || c.update) && <p className="mt-3 text-[12px] text-muted">{c.update_to ? `Updating to ${c.update_to} on its next check-in.` : ""} {c.update ? `Last update: ${c.update.state}${c.update.version ? ` (${c.update.version})` : ""}${c.update.detail ? ` · ${c.update.detail}` : ""}` : ""}</p>}
                {!c.can_update && c.update_available && <p className="mt-3 text-[12px] text-muted/80">This version can't update itself; install the new release on the host.</p>}
              </Panel>
            );
          })}
        </div>

        <div className="space-y-5 @6xl:col-span-4">
          <Panel>
            <PanelHead icon={ArrowUpCircle} title="Updates" />
            <div className="space-y-3 px-5 pb-5">
              {detail.data && <Segmented layoutId="con-upd" value={detail.data.connector_updates} onChange={setMode} options={[{ value: "manual", label: "When I click Update" }, { value: "auto", label: "Automatically" }]} />}
              <p className="text-[11.5px] leading-4 text-muted/80">Releases are signed. A connector checks the signature before it installs anything.</p>
              {detail.data?.latest_release && <p className="text-[12px] text-muted">Newest release: <b className="text-fg">{detail.data.latest_release.version}</b></p>}
            </div>
          </Panel>
          <Panel>
            <PanelHead icon={Package} title="Releases" />
            <div className="px-5 pb-5">
              {rel.error ? <p className="text-[12px] text-muted/80">{rel.error}</p> : rel.loading ? <Loading /> : !(rel.data?.releases || []).length ? <p className="text-[12px] text-muted/80">No releases published on this control plane yet.</p> : (
                <ul className="space-y-2">{rel.data.releases.map((r) => <li key={r.version} className="text-[12px]"><span className="font-mono text-fg">{r.version}</span> <span className="text-muted">· {fmtTime(r.created_at)}</span>{r.notes && <span className="block text-muted/80">{r.notes}</span>}</li>)}</ul>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <TokenDrawer token={token} client={client} onClose={() => { setToken(null); reload(); }} />
      <Confirm open={!!removing} onClose={() => setRemoving(null)} danger typeToConfirm={removing?.name} title={`Remove ${removing?.name}?`} cta="Remove"
        onConfirm={() => { const c = removing; setRemoving(null); run(async () => { await del(`/api/connectors/${c.id}`); reload(); }, `${c.name} removed. Its certificate no longer works.`); }}>
        {"Its certificate stops working at once and any job it's running is marked failed. To use the host again, register it with a new token."}
      </Confirm>
    </div>
  );
}

function Fact({ label, children }) {
  return <div className="rounded-lg border border-fg/[0.07] bg-fg/[0.02] px-3 py-2"><div className="text-[11px] text-muted/80">{label}</div><div className="text-fg">{children}</div></div>;
}

function TokenDrawer({ token, client, onClose }) {
  const [copied, setCopied] = useState(false);
  return (
    <Drawer open={!!token} onClose={onClose} width={620} eyebrow={`Connectors · ${client.name}`} title="Register a connector"
      footer={<Button variant="primary" className="ml-auto" onClick={onClose}>Done</Button>}>
      {token && (
        <div className="space-y-5 text-[13px]">
          <p className="text-muted">On the admin host (Python 3.9+, SSH access to the PeopleSoft servers), install the connector, then run this once. The token works once and expires {fmtTime(token.expires_at)}.</p>
          <div className="relative rounded-xl border border-fg/10 bg-term p-4 pr-12 font-mono text-[12px] leading-[20px] text-muted/90" data-theme="night">
            <span className="select-all break-all">{token.command}</span>
            <button onClick={() => { try { navigator.clipboard?.writeText(token.command); } catch {} setCopied(true); }} aria-label="Copy the command" className="absolute right-3 top-3 text-muted hover:text-fg">{copied ? <Check className="size-4 text-accent" /> : <Copy className="size-4" />}</button>
          </div>
          <div className="flex items-start gap-2 rounded-lg border border-accent/25 bg-accent/[0.05] px-3 py-2.5 text-[12px] text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>The connector prints Pegasus's signing key when it registers. Check it matches <span className="font-mono text-fg">{token.fingerprint}</span> before you trust it.</span></div>
          <p className="text-[12px] text-muted/80">Change <span className="font-mono">--ssh-user</span> and <span className="font-mono">--ssh-key</span> to the account and key the connector uses for SSH. It shows up here within a minute of registering.</p>
        </div>
      )}
    </Drawer>
  );
}

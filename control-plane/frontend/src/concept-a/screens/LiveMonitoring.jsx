// Monitoring on live data: what the control plane actually watches today, per customer.
//   domain states       GET /api/clients/<cid>/states (polled by the app; checked automatically every 10 min)
//   connector health    GET /api/clients/<cid> (heartbeat, certificate)
//   TLS certificates    GET/PUT /api/clients/<cid>/certs, POST /api/clients/<cid>/certs/check
//   failed jobs         recent jobs from GET /api/clients/<cid>
// Metrics and alarms from OCI Monitoring aren't in the control plane yet, so this screen says so instead of
// showing made-up charts.
import { useEffect, useState } from "react";
import { Activity, Server, Cable, Lock, RefreshCw, CircleAlert, Check, Pencil, Loader2, ExternalLink, History } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { Panel, PanelHead, Button, Pill, PageHeader, Drawer, Field, inputCls, StateDot, TierTag } from "../kit.jsx";
import { post, put } from "../../api/client.js";
import { useLive, ago } from "../../api/live.jsx";
import JobConsole from "../parts/JobConsole.jsx";
import { useClient, useGet, useNotice, Loading, NoClient, Banner, fmtTime } from "../liveKit.jsx";

const STATE = { running: "Running", stopped: "Stopped", unknown: "Unknown", unreachable: "Unreachable", partial: "Partly running" };

export default function LiveMonitoring() {
  const { client, loading } = useClient();
  if (!client) return <NoClient eyebrow={<><Activity className="size-3.5" />Monitoring</>} title="Monitoring" loading={loading} />;
  return <ClientMonitoring key={client.id} client={client} />;
}

function ClientMonitoring({ client }) {
  const cid = client.id;
  const { checkAll } = useLive();
  const certs = useGet(`/api/clients/${cid}/certs`, { every: 30000 });
  const { run, view } = useNotice();
  const [job, setJob] = useState(null);
  const [editing, setEditing] = useState(false);
  const domains = client.envs.flatMap((e) => e.servers.map((s) => ({ ...s, env: e.name, tier: e.tier })));
  const notRunning = domains.filter((d) => d.state !== "running");
  const failed = (client.jobs || []).filter((j) => ["failed", "expired"].includes(j.status)).slice(0, 8);
  const con = client.connector;
  const c = certs.data;
  const warnDays = c?.warn_days ?? 30;
  const certRows = c?.certs || [];
  const certBad = certRows.filter((x) => x.error || (x.days_left != null && x.days_left <= warnDays));

  return (
    <div className="@container">
      <PageHeader eyebrow={<><Activity className="size-3.5" />Monitoring · {client.name}</>} title="What Pegasus watches"
        sub="Domain availability, the connector, and the TLS certificates of the client's sites. Everything here comes from the connector."
        actions={<Button icon={RefreshCw} onClick={() => run(async () => checkAll(cid), "Checking every domain now. States update as the connector reports back.")}>Check domains now</Button>} />
      <Banner tone="warn">Metrics and alarms from OCI Monitoring (CPU, memory, disk, uptime) aren't connected to Pegasus yet, so they aren't shown here.</Banner>
      {certs.error && <Banner tone="error">{certs.error}</Banner>}
      {view}

      <div className="mb-5 grid grid-cols-2 gap-4 @4xl:grid-cols-4">
        <Stat icon={Server} label="Domains running" value={`${domains.length - notRunning.length} of ${domains.length}`} bad={notRunning.length > 0} foot={client.checking ? "A check is running" : `Checked ${client.lastAuto ? ago(client.lastAuto) : "not yet"}`} />
        <Stat icon={Cable} label="Connector" value={con.status === "offline" ? "Offline" : "Online"} bad={con.status === "offline"} foot={con.count ? `seen ${con.lastSeen}` : "none registered"} />
        <Stat icon={Lock} label="Certificates" value={c ? `${certRows.length - certBad.length} of ${certRows.length} fine` : "…"} bad={certBad.length > 0} foot={c?.checked ? `checked ${ago(c.checked)}` : "not checked yet"} />
        <Stat icon={History} label="Failed jobs" value={String(failed.length)} bad={failed.length > 0} foot="among the latest 25" />
      </div>

      <div className="grid grid-cols-1 gap-5 @6xl:grid-cols-12">
        <div className="space-y-5 @6xl:col-span-7">
          <Panel>
            <PanelHead icon={Server} title="Domain availability" meta="Checked automatically every 10 minutes" />
            <table className="w-full text-[12.5px]">
              <thead className="border-y border-fg/[0.06] bg-fg/[0.02] text-left text-[11px] uppercase tracking-[0.1em] text-muted/70"><tr>{["Environment", "Domain", "Server", "State", "Checked"].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {[...notRunning, ...domains.filter((d) => d.state === "running")].map((d) => (
                  <tr key={`${d.env}|${d.key}`} className="border-b border-fg/[0.05] last:border-0">
                    <td className="px-4 py-2"><span className="flex items-center gap-2 text-fg">{d.env}<TierTag tier={d.tier} /></span></td>
                    <td className="px-4 py-2 text-fg">{d.domain} <span className="text-[11px] text-muted">{d.role}</span></td>
                    <td className="px-4 py-2 font-mono text-[11.5px] text-muted">{d.host}</td>
                    <td className="px-4 py-2"><span className="flex items-center gap-1.5"><StateDot state={d.state} size={7} />{STATE[d.state] || d.state}</span></td>
                    <td className="px-4 py-2 text-muted/80">{d.checked}</td>
                  </tr>
                ))}
                {!domains.length && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted/80">No servers yet.</td></tr>}
              </tbody>
            </table>
          </Panel>

          <Panel>
            <PanelHead icon={Lock} title="TLS certificates" meta={c ? `Checked every ${c.every_hours} hours · warns ${warnDays} days ahead` : ""}
              action={<><Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>Addresses</Button>
                <Button size="sm" icon={c?.running ? Loader2 : RefreshCw} disabled={c?.running || (c && !c.capable)} onClick={() => run(async () => { const r = await post(`/api/clients/${cid}/certs/check`, {}); setJob({ id: r.job, what: "Check SSL certificates", env: client.name, by: "you", onDone: certs.reload }); certs.reload(); })}>Check now</Button></>} />
            {certs.loading ? <Loading /> : !certRows.length ? <p className="px-6 pb-5 text-[12.5px] text-muted/80">No addresses yet. Add the client's PeopleSoft and Integration Broker URLs under Addresses.</p> : (
              <ul className="px-3 pb-3">
                {certRows.map((x) => {
                  const bad = x.error || (x.days_left != null && x.days_left <= warnDays);
                  return (
                    <li key={x.url} className={cx("flex items-start gap-3 rounded-xl px-3 py-2.5", bad && "bg-orange/[0.06] ring-1 ring-orange/25")}>
                      <span className={cx("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", bad ? "bg-orange/15 text-risk" : x.pending ? "bg-fg/[0.06] text-muted" : "bg-accent/15 text-accent")}>{bad ? <CircleAlert className="size-3.5" /> : <Check className="size-3.5" />}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] text-fg">{x.host}{x.port !== 443 ? `:${x.port}` : ""} {x.subject && <span className="text-muted">· {x.subject}</span>}</div>
                        <div className="text-[11.5px] text-muted/80">{x.pending ? "Not checked yet" : x.error ? x.error : `${x.issuer ? `${x.issuer} · ` : ""}expires ${fmtTime(x.not_after)}`}</div>
                      </div>
                      {x.days_left != null && !x.error && <Pill tone={x.days_left <= 7 ? "orange" : x.days_left <= warnDays ? "apricot" : "teal"}>{x.days_left} days</Pill>}
                    </li>
                  );
                })}
              </ul>
            )}
            {c && !c.capable && <p className="px-6 pb-4 text-[11.5px] text-muted/80">Needs every connector on {c.need_version} or later.</p>}
            {c?.ticket && <p className="px-6 pb-4 text-[12px] text-muted">Open {c.ticket_system} ticket for expiring certificates: <a href={c.ticket.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-accent">{c.ticket.key}<ExternalLink className="size-3" /></a></p>}
            {c?.ticket_error && <p className="px-6 pb-4 text-[12px] text-risk">{c.ticket_error}</p>}
          </Panel>
        </div>

        <div className="space-y-5 @6xl:col-span-5">
          <Panel>
            <PanelHead icon={Cable} title="Connector" />
            <div className="space-y-2 px-6 pb-5 text-[12.5px]">
              {!con.count ? <p className="text-muted/80">No connector registered.</p> : (con.raw || []).map((x) => (
                <div key={x.id} className="flex items-center gap-2"><StateDot state={x.online ? "running" : "stopped"} size={7} /><span className="text-fg">{x.name}</span><span className="text-muted">v{x.version} · seen {ago(x.last_seen)}</span></div>
              ))}
              {con.certDays != null && <p className="text-muted">Certificate: {con.certDays} days left (renews itself).</p>}
            </div>
          </Panel>
          <Panel>
            <PanelHead icon={History} title="Failed jobs" />
            <ul className="px-3 pb-3">
              {!failed.length && <li className="px-3 pb-2 text-[12.5px] text-muted/80">None among the latest jobs.</li>}
              {failed.map((j) => (
                <li key={j.id}><button onClick={() => setJob({ id: j.id, what: j.title, env: j.environment || client.name, by: j.created_by })} className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-[12.5px] hover:bg-fg/[0.03]">
                  <Pill tone="orange">{j.status}</Pill><span className="min-w-0 flex-1"><span className="block text-fg">{j.title}</span><span className="block text-[11.5px] text-muted/80">{j.note || ""} {ago(j.created_at)} · {j.created_by}</span></span>
                </button></li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <CertAddresses open={editing} onClose={() => setEditing(false)} cid={cid} data={c} onSaved={() => { setEditing(false); certs.reload(); }} run={run} />
      <JobConsole job={job} onClose={() => setJob(null)} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, foot, bad }) {
  return (
    <Panel className={cx("p-4", bad && "ring-1 ring-orange/30")}>
      <div className="flex items-center gap-2 text-[12px] text-muted"><Icon className={cx("size-4", bad ? "text-risk" : "text-accent")} />{label}</div>
      <div className="mt-2 font-display text-[24px] font-extrabold text-fg">{value}</div>
      <div className="text-[11.5px] text-muted/80">{foot}</div>
    </Panel>
  );
}

function CertAddresses({ open, onClose, cid, data, onSaved, run }) {
  const [urls, setUrls] = useState("");
  const [days, setDays] = useState(30);
  useEffect(() => { if (open && data) { setUrls((data.urls || []).join("\n")); setDays(data.warn_days); } }, [open]);
  return (
    <Drawer open={open} onClose={onClose} width={540} eyebrow="Monitoring" title="Certificate addresses"
      footer={<><Button variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={async () => { const ok = await run(async () => put(`/api/clients/${cid}/certs`, { urls, warn_days: Number(days) }), "Saved. The new list is checked on the next round."); if (ok) onSaved(); }}>Save</Button></>}>
      <div className="space-y-5">
        <Field label="Addresses" hint="One per line: a URL, host or host:port. The connector connects from inside the network, so internal names work."><textarea rows={8} className={cx(inputCls, "h-auto py-2 font-mono text-[12px]")} value={urls} onChange={(e) => setUrls(e.target.value)} placeholder="https://hr.example.edu/psp/ps/" /></Field>
        <Field label="Warn this many days ahead"><input type="number" min={1} max={365} className={inputCls} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
      </div>
    </Drawer>
  );
}

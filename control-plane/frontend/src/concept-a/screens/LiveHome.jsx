// Mission Control on live data: one fleet-wide view built from what the control plane knows about every customer
// the signed-in person can see. Per customer it reads GET /api/clients/<cid> (via the shared live data),
// GET /api/clients/<cid>/patching?environment=… for each environment, GET /api/clients/<cid>/certs and
// GET /api/clients/<cid>/access-requests. Nothing here is estimated: counts are of real rows.
import { useEffect, useMemo, useState } from "react";
import { Radar, Server, Cable, ShieldCheck, Ticket, Lock, KeyRound, History, CircleAlert, Check, ArrowRight, RefreshCw, Building2 } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { Panel, PanelHead, Button, Pill, PageHeader, StateDot } from "../kit.jsx";
import { useShell } from "../App.jsx";
import { get } from "../../api/client.js";
import { useLive, ago } from "../../api/live.jsx";
import { Banner, Loading } from "../liveKit.jsx";

const sevTone = (s) => (s >= 9 ? "orange" : s >= 7 ? "apricot" : "neutral");

export default function LiveHome() {
  const { clients, me, loading } = useLive();
  const { go, setScope } = useShell();
  const [extra, setExtra] = useState({});      // cid -> { patching: {env: view}, certs, access }
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState(null);

  const loadExtra = async () => {
    setBusy(true);
    const out = {};
    await Promise.all(clients.map(async (c) => {
      const [patching, certs, access] = await Promise.all([
        Promise.all(c.envs.map((e) => get(`/api/clients/${c.id}/patching?environment=${encodeURIComponent(e.name)}`).then((v) => [e.name, v]).catch(() => [e.name, null]))).then(Object.fromEntries),
        get(`/api/clients/${c.id}/certs`).catch(() => null),
        get(`/api/clients/${c.id}/access-requests`).catch(() => null),
      ]);
      out[c.id] = { patching, certs, access };
    }));
    setExtra(out); setBusy(false); setStamp(new Date().toISOString());
  };
  const ids = clients.map((c) => `${c.id}:${c.envs.length}`).join();
  useEffect(() => { if (clients.length) loadExtra(); }, [ids]);

  const rows = useMemo(() => clients.map((c) => {
    const x = extra[c.id] || {};
    const domains = c.envs.flatMap((e) => e.servers);
    const running = domains.filter((s) => s.state === "running").length;
    const envPatch = c.envs.map((e) => {
      const v = x.patching?.[e.name];
      if (!v) return { env: e, outstanding: null };
      const adv = v.advisory?.components || {};
      const comps = new Set();
      let top = 0;
      for (const h of v.hosts) for (const it of h.items) if (it.status === "needed") { comps.add(it.component); top = Math.max(top, adv[it.component]?.max || 0); }
      return { env: e, outstanding: v.outstanding, comps: [...comps], top, read: v.hosts.some((h) => h.checked), tickets: v.change_requests.filter((t) => ["pending", "approved"].includes(t.status)) };
    });
    const warn = x.certs?.warn_days ?? 30;
    const certsBad = (x.certs?.certs || []).filter((r) => r.error || (r.days_left != null && r.days_left <= warn));
    const accessPending = (x.access?.requests || []).filter((r) => r.status === "pending");
    const failed = (c.jobs || []).filter((j) => ["failed", "expired"].includes(j.status) && Date.now() - new Date(j.created_at) < 86400000);
    return { c, domains, running, envPatch, certsBad, accessPending, failed,
      outstanding: envPatch.reduce((n, p) => n + (p.outstanding || 0), 0), behind: envPatch.filter((p) => p.outstanding).length,
      top: Math.max(0, ...envPatch.map((p) => p.top || 0)), tickets: envPatch.flatMap((p) => (p.tickets || []).map((t) => ({ ...t, env: p.env.name }))) };
  }), [clients, extra]);

  const sum = (f) => rows.reduce((n, r) => n + f(r), 0);
  const allDomains = sum((r) => r.domains.length), allRunning = sum((r) => r.running);
  const cons = rows.map((r) => r.c.connector);
  const consOnline = cons.reduce((n, k) => n + k.online, 0), consAll = cons.reduce((n, k) => n + k.count, 0);
  const envs = sum((r) => r.c.envs.length);

  // The briefing: everything that needs a person, most urgent first.
  const items = [];
  for (const r of rows) {
    const open = (route) => { setScope(r.c.id); go(route); };
    if (r.c.connector.status === "offline") items.push({ rank: 0, icon: Cable, tone: "orange", text: `${r.c.name}: ${r.c.connector.count ? `connector offline (seen ${r.c.connector.lastSeen})` : "no connector registered"}`, act: "Connectors", go: () => open("connectors") });
    const down = r.domains.filter((s) => s.state === "stopped" || s.state === "unreachable");
    if (down.length) items.push({ rank: 1, icon: Server, tone: "orange", text: `${r.c.name}: ${down.length} domain${down.length === 1 ? "" : "s"} not running (${[...new Set(down.map((s) => s.host))].slice(0, 3).join(", ")})`, act: "Fleet", go: () => open("fleet") });
    for (const p of r.envPatch) if (p.outstanding) items.push({ rank: p.top >= 9 ? 1 : 2, icon: ShieldCheck, tone: sevTone(p.top), text: `${r.c.name} · ${p.env.name}: ${p.outstanding} update${p.outstanding === 1 ? "" : "s"} outstanding (${p.comps.join(", ")})${p.top ? `, highest CVSS ${p.top.toFixed(1)}` : ""}`, act: "Patching", go: () => open("patching") });
    for (const t of r.tickets) items.push({ rank: 2, icon: Ticket, tone: t.status === "approved" ? "cyan" : "apricot", text: `${r.c.name} · ${t.env}: ${t.jira_key} ${t.status === "approved" ? "approved, ready to apply" : "waiting for approval"}`, act: "Patching", go: () => open("patching") });
    for (const a of r.accessPending) items.push({ rank: 2, icon: KeyRound, tone: "apricot", text: `${r.c.name}: SSH access request from ${a.requested_by} (${a.summary})`, act: "SSH access", go: () => open("access") });
    for (const k of r.certsBad) items.push({ rank: k.error ? 2 : k.days_left <= 7 ? 1 : 2, icon: Lock, tone: k.days_left <= 7 ? "orange" : "apricot", text: `${r.c.name}: certificate for ${k.host} ${k.error ? `couldn't be checked (${k.error})` : `expires in ${k.days_left} days`}`, act: "Monitoring", go: () => open("monitoring") });
    if (r.failed.length) items.push({ rank: 3, icon: History, tone: "apricot", text: `${r.c.name}: ${r.failed.length} job${r.failed.length === 1 ? "" : "s"} failed in the last 24 hours (${r.failed[0].title}${r.failed.length > 1 ? ", …" : ""})`, act: "Monitoring", go: () => open("monitoring") });
    for (const p of r.envPatch) if (p.outstanding === 0 && !p.read) items.push({ rank: 4, icon: ShieldCheck, tone: "neutral", text: `${r.c.name} · ${p.env.name}: patch levels never read`, act: "Patching", go: () => open("patching") });
  }
  items.sort((a, b) => a.rank - b.rank);

  return (
    <div className="@container">
      <PageHeader eyebrow={<><Radar className="size-3.5" />Mission Control</>} title={me ? `Good ${greeting()}, ${me.first}` : "Mission Control"}
        sub={`Every customer you can see, in one place. ${stamp ? `Updated ${ago(stamp)}.` : ""}`}
        actions={<Button icon={busy ? RefreshCw : RefreshCw} onClick={loadExtra} disabled={busy}>{busy ? "Refreshing…" : "Refresh"}</Button>} />
      {loading && !clients.length ? <Loading text="Loading customers…" /> : !clients.length ? <Banner tone="warn">No customers yet. An admin adds them in the current app (Clients).</Banner> : <>
        <div className="mb-5 grid grid-cols-2 gap-4 @4xl:grid-cols-5">
          <Stat icon={Building2} label="Customers" value={clients.length} foot={`${envs} environments`} />
          <Stat icon={Server} label="Domains running" value={`${allRunning} of ${allDomains}`} bad={allRunning < allDomains} foot={`${allDomains - allRunning} not running or unknown`} />
          <Stat icon={Cable} label="Connectors online" value={`${consOnline} of ${consAll}`} bad={consOnline < consAll || consAll < clients.length} foot={consAll < clients.length ? `${clients.length - rows.filter((r) => r.c.connector.count).length} customer(s) without one` : "heartbeat every 30 s"} />
          <Stat icon={ShieldCheck} label="Updates outstanding" value={busy && !stamp ? "…" : sum((r) => r.outstanding)} bad={sum((r) => r.outstanding) > 0} foot={`${sum((r) => r.behind)} environment(s) behind`} />
          <Stat icon={Ticket} label="Open change tickets" value={busy && !stamp ? "…" : sum((r) => r.tickets.length)} foot={`${sum((r) => r.accessPending.length)} SSH access request(s) waiting`} />
        </div>

        <div className="grid grid-cols-1 gap-5 @6xl:grid-cols-12">
          <Panel className="@6xl:col-span-7">
            <PanelHead icon={CircleAlert} title="Needs you" meta={stamp ? `${items.length} item${items.length === 1 ? "" : "s"}` : "Gathering…"} />
            {!stamp ? <Loading /> : !items.length ? <div className="flex items-center gap-2 px-6 pb-6 text-[13px] text-muted"><Check className="size-4 text-accent" />Nothing needs attention right now.</div> : (
              <ul className="px-3 pb-3">
                {items.slice(0, 14).map((it, i) => (
                  <li key={i}><button onClick={it.go} className="group flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-fg/[0.03]">
                    <span className={cx("mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg", it.tone === "orange" ? "bg-orange/15 text-risk" : it.tone === "apricot" ? "bg-apricot/20 text-warn" : "bg-accent/10 text-accent")}><it.icon className="size-3.5" /></span>
                    <span className="min-w-0 flex-1 text-[12.5px] text-fg">{it.text}</span>
                    <span className="flex shrink-0 items-center gap-1 text-[11.5px] text-muted group-hover:text-accent">{it.act}<ArrowRight className="size-3" /></span>
                  </button></li>
                ))}
                {items.length > 14 && <li className="px-3 py-1 text-[11.5px] text-muted/80">and {items.length - 14} more</li>}
              </ul>
            )}
          </Panel>

          <Panel className="@6xl:col-span-5">
            <PanelHead icon={Building2} title="Customers" />
            <ul className="px-3 pb-3">
              {rows.map((r) => (
                <li key={r.c.id}><button onClick={() => { setScope(r.c.id); go("fleet"); }} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-fg/[0.03]">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy font-mono text-[10px] text-cyan">{r.c.code}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-fg">{r.c.name}</span>
                    <span className="flex items-center gap-1.5 text-[11.5px] text-muted/80"><StateDot state={r.c.connector.status === "offline" ? "stopped" : "running"} size={6} />{r.c.envs.length} env · {r.running}/{r.domains.length} running{stamp ? ` · ${r.outstanding} outstanding` : ""}</span>
                  </span>
                  {r.top > 0 && <Pill tone={sevTone(r.top)}>CVSS {r.top.toFixed(1)}</Pill>}
                  <ArrowRight className="size-3.5 text-muted/70 group-hover:text-accent" />
                </button></li>
              ))}
            </ul>
          </Panel>
        </div>
      </>}
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

function Stat({ icon: Icon, label, value, foot, bad }) {
  return (
    <Panel className={cx("p-4", bad && "ring-1 ring-orange/30")}>
      <div className="flex items-center gap-2 text-[12px] text-muted"><Icon className={cx("size-4", bad ? "text-risk" : "text-accent")} />{label}</div>
      <div className="mt-2 font-display text-[26px] font-extrabold text-fg">{value}</div>
      <div className="text-[11.5px] text-muted/80">{foot}</div>
    </Panel>
  );
}

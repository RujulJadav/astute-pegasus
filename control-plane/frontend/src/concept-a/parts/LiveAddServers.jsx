// Add servers on live data: scan by IP through the connector, trust a new server's host key after comparing its
// fingerprint, tick the domains found, and add them to an environment.
//   POST /api/clients/<cid>/discover            {targets, users}  -> job
//   GET  /api/jobs/<job>/discovery              results per server: rows (role, domain, owner, path), needs_trust…
//   POST /api/clients/<cid>/trust-host          {target, fingerprint} -> job, then scan that server again
//   POST /api/clients/<cid>/inventory/add       {environment, tier, rows}
import { useEffect, useState } from "react";
import { Radar, Loader2, ShieldAlert, Check, Plus } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { Drawer, Button, Field, inputCls } from "../kit.jsx";
import { get, post } from "../../api/client.js";
import { useLive } from "../../api/live.jsx";

const DONE = ["succeeded", "failed", "expired", "cancelled"];
async function waitJob(id) {
  for (let i = 0; i < 300; i++) {
    const j = await get(`/api/jobs/${id}`);
    if (DONE.includes(j.status)) return j;
    await new Promise((r) => setTimeout(r, 1200));
  }
  throw new Error("The scan is taking too long. Check the connector.");
}

export default function LiveAddServers({ open, onClose, client }) {
  const { refresh } = useLive();
  const [targets, setTargets] = useState("");
  const [users, setUsers] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [results, setResults] = useState([]);
  const [env, setEnv] = useState("");
  const [tier, setTier] = useState("");
  const [done, setDone] = useState(null);
  useEffect(() => { if (open) { setErr(""); setDone(null); } }, [open]);

  const scan = async (t, merge) => {
    setBusy(merge ? `trust:${t}` : "scan"); setErr("");
    try {
      const { job } = await post(`/api/clients/${client.id}/discover`, { targets: t, users });
      await waitJob(job);
      const r = await get(`/api/jobs/${job}/discovery`);
      const fresh = r.results.map((x) => ({ ...x, rows: (x.rows || []).map((row) => ({ ...row })) }));
      setResults((old) => (merge ? old.map((x) => fresh.find((y) => y.target === x.target) || x) : fresh));
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const trust = async (r) => {
    setBusy(`trust:${r.target}`); setErr("");
    try {
      const { job } = await post(`/api/clients/${client.id}/trust-host`, { target: r.target, fingerprint: r.fingerprint });
      const j = await waitJob(job);
      if (j.status !== "succeeded") throw new Error(`Trusting the host key ${j.status}.`);
      await scan(r.target, true);
    } catch (e) { setErr(e.message); setBusy(""); }
  };
  const toggle = (ri, xi) => setResults((rs) => rs.map((r, i) => (i !== ri ? r : { ...r, rows: r.rows.map((x, j) => (j === xi ? { ...x, use: !x.use } : x)) })));
  const picked = results.flatMap((r) => (r.rows || []).filter((x) => x.use));
  const add = async () => {
    setBusy("add"); setErr("");
    try {
      const r = await post(`/api/clients/${client.id}/inventory/add`, { environment: env.trim(), tier: tier.trim(), rows: picked });
      setDone(`${env.trim()}: ${r.added} domain${r.added === 1 ? "" : "s"} added${r.updated ? `, ${r.updated} updated` : ""}. Pegasus is reading their patch levels now.`);
      setResults([]); setTargets("");
      refresh();
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };

  return (
    <Drawer open={open} onClose={onClose} width={680} eyebrow={`Add servers · ${client?.name || ""}`} title="Discover from IP addresses"
      footer={picked.length > 0
        ? <><span className="text-[11.5px] text-muted/80">{picked.length} domain{picked.length === 1 ? "" : "s"} ticked</span><Button variant="primary" className="ml-auto" icon={busy === "add" ? Loader2 : Plus} disabled={!!busy} onClick={add}>Add ticked domains</Button></>
        : <><span className="text-[11.5px] text-muted/80">Read-only on the servers: the scan only looks.</span><Button className="ml-auto" onClick={onClose}>Close</Button></>}>
      <div className="space-y-5">
        {done && <p role="status" className="flex items-start gap-2 rounded-lg border border-teal/40 bg-teal/10 px-3 py-2 text-[12.5px] text-fg"><Check className="mt-0.5 size-4 text-accent" />{done}</p>}
        <div className="grid grid-cols-[1fr_200px] gap-3">
          <Field label="IP addresses" hint="Up to 20, separated by spaces or commas. host:port for a non-standard SSH port."><input className={cx(inputCls, "font-mono text-[12.5px]")} value={targets} onChange={(e) => setTargets(e.target.value)} placeholder="10.0.1.11 10.0.1.21" /></Field>
          <Field label="OS users (optional)" hint="Who owns PeopleSoft, e.g. psadm2"><input className={cx(inputCls, "font-mono text-[12.5px]")} value={users} onChange={(e) => setUsers(e.target.value)} /></Field>
        </div>
        <Button variant="primary" icon={busy === "scan" ? Loader2 : Radar} disabled={!!busy || !targets.trim()} onClick={() => scan(targets, false)}>{busy === "scan" ? "Scanning…" : "Scan"}</Button>
        {err && <p role="alert" className="rounded-lg border border-orange/50 bg-orange/10 px-3 py-2 text-[12.5px] text-fg">{err}</p>}

        {results.map((r, ri) => (
          <section key={r.target} className="rounded-xl border border-fg/10 p-4">
            <h3 className="font-mono text-[13px] text-fg">{r.host ? `${r.host}  (${r.target})` : r.target}</h3>
            {r.error && <p className="mt-2 text-[12.5px] text-risk">{r.error}</p>}
            {r.needs_trust && (
              <div className="mt-3 rounded-lg border border-apricot/60 bg-apricot/10 p-3 text-[12.5px] text-fg">
                <div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
                  <span>The connector hasn't connected to this server before. Its {r.key_type} host key fingerprint is <b className="select-all font-mono">{r.fingerprint}</b>. Compare it on the server (<code className="font-mono">ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub</code>); if it matches, trust it and Pegasus scans again.</span></div>
                <Button size="sm" className="mt-2" icon={busy === `trust:${r.target}` ? Loader2 : Check} disabled={!!busy} onClick={() => trust(r)}>Trust key and scan</Button>
              </div>
            )}
            {(r.notes || []).map((n) => <p key={n} className="mt-1 text-[11.5px] text-muted/80">{n}</p>)}
            {r.rows?.length > 0 && (
              <table className="mt-3 w-full text-[12px]">
                <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-muted/70"><tr>{["", "Role", "Domain", "Owner", "Folder", ""].map((h, i) => <th key={i} className="pb-1.5 pr-2 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {r.rows.map((x, xi) => (
                    <tr key={xi} className="border-t border-fg/[0.05]">
                      <td className="py-1.5 pr-2"><input type="checkbox" checked={!!x.use} onChange={() => toggle(ri, xi)} aria-label={`Add ${x.role} ${x.domain}`} className="accent-[#0B89A1]" /></td>
                      <td className="py-1.5 pr-2 text-fg">{x.role}</td><td className="py-1.5 pr-2 font-mono text-fg">{x.domain}</td><td className="py-1.5 pr-2 font-mono text-muted">{x.owner}</td>
                      <td className="py-1.5 pr-2 font-mono text-[11px] text-muted/80">{x.path}</td><td className="py-1.5 text-[11px] text-muted/80">{x.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))}

        {results.some((r) => r.rows?.length) && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Environment" hint="A new name, or an existing one to add to"><input list="lenv" className={cx(inputCls, "font-mono")} value={env} onChange={(e) => setEnv(e.target.value)} /><datalist id="lenv">{(client?.envs || []).map((e) => <option key={e.name} value={e.name} />)}</datalist></Field>
            <Field label="Tier"><input className={inputCls} value={tier} onChange={(e) => setTier(e.target.value)} placeholder="DEV, TST, PRD…" /></Field>
          </div>
        )}
      </div>
    </Drawer>
  );
}

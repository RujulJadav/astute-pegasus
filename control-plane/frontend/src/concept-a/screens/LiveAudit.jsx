// Audit log on live data: GET /api/audit[?client=<id>] (the latest 300 events). Export is done here, as CSV.
import { useMemo, useState } from "react";
import { ScrollText, Download, Search, RefreshCw } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { Panel, Button, Pill, PageHeader, Avatar, Segmented, inputCls } from "../kit.jsx";
import { useLive, initials } from "../../api/live.jsx";
import { useGet, Banner, Loading, fmtTime } from "../liveKit.jsx";

const TAG_TONE = { Change: "cyan", People: "neutral", Access: "apricot", "Sign-in": "neutral", Schedule: "neutral", Connector: "neutral", Integrations: "cream", Patching: "cyan", Settings: "neutral", System: "neutral" };

function tagOf(ev) {
  if (/^(login|logout|mfa_enrolled|sso|password_changed|signin)/.test(ev)) return "Sign-in";
  if (/^(user_|password_reset|mfa_reset|invite)/.test(ev)) return "People";
  if (/^access/.test(ev)) return "Access";
  if (/^schedule|weekly/.test(ev)) return "Schedule";
  if (/^connector|^release|token/.test(ev)) return "Connector";
  if (/jira|servicenow|ticketing/.test(ev)) return "Integrations";
  if (/^(apply|change_request|patch|stage|cpu|catalog)/.test(ev)) return "Patching";
  if (/^job|environment|inventory|discover/.test(ev)) return "Change";
  if (/settings|changed$|time_zone|oci|mail|parallel|keep_backups/.test(ev)) return "Settings";
  return "System";
}

const human = (ev) => ev.replace(/_/g, " ");
const SKIP = new Set(["client_id"]);
function detailText(d) {
  return Object.entries(d || {}).filter(([k, v]) => !SKIP.has(k) && v !== null && v !== "" && v !== undefined)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "object" ? JSON.stringify(v) : v}`).join(" · ");
}

export default function LiveAudit() {
  const { clients } = useLive();
  const [scope, setScope] = useState("");
  const { data, error, loading, reload } = useGet(`/api/audit${scope ? `?client=${scope}` : ""}`);
  const [who, setWho] = useState("all");
  const [q, setQ] = useState("");
  const cname = (id) => clients.find((c) => c.id === id)?.name || "";
  const rows = useMemo(() => (data?.events || []).map((e) => ({ ...e, tag: tagOf(e.event), kind: e.actor === "pegasus" || /^pegasus/.test(e.actor || "") ? "system" : "human", text: detailText(e.detail) }))
    .filter((a) => (who === "all" || a.kind === who) && (!q || `${a.actor} ${a.event} ${a.text} ${cname(a.client_id)}`.toLowerCase().includes(q.toLowerCase()))), [data, who, q, clients]);

  const exportCsv = () => {
    const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [["time", "actor", "client", "event", "detail"].join(","), ...rows.map((r) => [r.at, r.actor, cname(r.client_id), r.event, r.text].map(esc).join(","))];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = `pegasus-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="@container">
      <PageHeader eyebrow={<><ScrollText className="size-3.5" />Audit log</>} title="Who did what, and when"
        sub="People and Pegasus itself, in one record: the latest 300 events. Export CSV saves what's shown."
        actions={<><Button icon={RefreshCw} onClick={reload}>Refresh</Button><Button icon={Download} onClick={exportCsv} disabled={!rows.length}>Export CSV</Button></>} />
      {error && <Banner tone="error">{error}</Banner>}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented layoutId="laudit-who" value={who} onChange={setWho} options={[{ value: "all", label: "Everyone" }, { value: "human", label: "People" }, { value: "system", label: "Pegasus" }]} />
        <select aria-label="Customer" value={scope} onChange={(e) => setScope(e.target.value)} className={cx(inputCls, "h-9 w-56 text-[12.5px]")}>
          <option value="" className="bg-raised">All customers</option>
          {clients.map((c) => <option key={c.id} value={c.id} className="bg-raised">{c.name}</option>)}
        </select>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/70" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the log" aria-label="Search the log" className={cx(inputCls, "h-9 w-64 pl-8 text-[12.5px]")} />
        </div>
        <span className="ml-auto text-[12px] text-muted/80">{rows.length} events · your local time</span>
      </div>

      <Panel className="px-2 py-2">
        {loading ? <Loading /> : (
          <ol className="relative">
            {rows.map((a, i) => (
              <li key={`${a.at}-${i}`} className="relative flex items-start gap-4 rounded-xl px-3 py-3">
                <span className="w-24 shrink-0 pt-1 text-right font-mono text-[11.5px] text-muted/80">{fmtTime(a.at)}</span>
                <Avatar initials={a.kind === "system" ? "⚙" : initials(a.actor).slice(0, 2)} size={28} />
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-fg"><span className="font-medium">{a.kind === "system" ? "Pegasus" : a.actor}</span> <span className="text-fg/85">{human(a.event)}</span>{a.client_id && <span className="text-muted"> · {cname(a.client_id)}</span>}</div>
                  {a.text && <div className="break-words text-[12px] text-muted/80">{a.text}</div>}
                </div>
                <Pill tone={TAG_TONE[a.tag]}>{a.tag}</Pill>
              </li>
            ))}
            {!rows.length && <li className="px-4 py-10 text-center text-[13px] text-muted/80">Nothing matches.</li>}
          </ol>
        )}
      </Panel>
    </div>
  );
}

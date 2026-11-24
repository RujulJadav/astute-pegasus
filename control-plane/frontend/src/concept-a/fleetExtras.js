// Extra sample data for the 5 Nov review changes (Mission Control health monitor, fleet-wide briefing,
// per-environment tiles, monitoring, uptime and logs). Illustrative only, like shared/data.js.
import { clients, allEnvs, series, serversFor } from "../shared/data.js";

// ── Mission Control: fleet-wide briefing (no instance-specific alerts here) ──────────────────────
export const fleetBriefing = [
  { kind: "patching", title: "Scheduled patching", lines: [
    { text: "Parker HCM DEV · tonight 12:00–7:00 AM EDT", meta: "PSADMIN-872 · approved" },
    { text: "Northwind CS TST · Sat 10:00 PM MST", meta: "NWOPS-311 · waiting for approval" },
    { text: "Cascade HCM TST · Tue 9:00 PM PST", meta: "CHG0041877 · draft" },
  ] },
  { kind: "downtime", title: "Planned downtime", lines: [
    { text: "Parker HCM PRD · Sun 2:00–4:00 AM EDT", meta: "OCI host maintenance (us-ashburn-1)" },
    { text: "Summit County datacenter · Sat 6:00 PM MDT", meta: "Customer network work · connector offline expected" },
  ] },
  { kind: "cve", title: "New CVEs", lines: [
    { text: "CVE-2026-61842 · WebLogic · CVSS 9.8", meta: "Oct CPU · 8 environments, 3 production" },
    { text: "CVE-2026-60117 · Oracle Linux kernel · CVSS 7.8", meta: "ELSA-2026-8812 · 12 environments" },
  ] },
  { kind: "advisory", title: "Threat advisories", lines: [
    { text: "CISA KEV adds CVE-2026-61842", meta: "Exploitation seen in the wild · due date Nov 19" },
    { text: "Oracle Security Alert (out of band)", meta: "None this month · next CPU Jan 19, 2027" },
  ] },
];

// ── Mission Control: overall health monitor ──────────────────────────────────────────────────────
const sevOf = (s) => (s >= 9 ? "critical" : s >= 7 ? "high" : s >= 4 ? "medium" : s > 0 ? "low" : "none");
export const health = {
  current: allEnvs.filter((e) => !e.behind).length,
  behind: allEnvs.filter((e) => e.behind > 0).length,
  total: allEnvs.length,
  // share of environments on the latest release, last 8 weeks (the Oct CPU landed in week 6)
  currentTrend: [81, 81, 88, 88, 88, 19, 19, 19],
  bySeverity: ["critical", "high", "medium", "none"].map((k) => ({ k, n: allEnvs.filter((e) => (k === "none" ? !e.maxCvss : sevOf(e.maxCvss) === k)).length })),
  prodCritical: allEnvs.filter((e) => e.tier === "PRD" && e.maxCvss >= 9).length,
  openCves: 14,
  exposureTrend: [3, 3, 2, 2, 2, 11, 11, 11],
  byClient: clients.map((c) => ({
    id: c.id, name: c.name, code: c.code, envs: c.envs.length,
    current: c.envs.filter((e) => !e.behind).length, behind: c.envs.filter((e) => e.behind > 0).length,
    top: Math.max(...c.envs.map((e) => e.maxCvss)), connector: c.connector.status,
  })),
  running: allEnvs.filter((e) => e.state === "running").length,
  unknown: allEnvs.filter((e) => e.state === "unknown").length,
  stopped: allEnvs.filter((e) => e.state === "stopped").length,
  uptime30: "99.94%",
  connectorsOnline: clients.filter((c) => c.connector.status !== "offline").length,
};

// ── Fleet: customer-level alerts (moved here from Mission Control) ───────────────────────────────
export const customerBriefing = {
  parker: "HCM DEV is cleared to patch tonight, 12:00–7:00 AM EDT (PSADMIN-872, approved by Gopinath at 3:31 PM). I'll take boot and block volume backups before anything changes. Two things need you: an SSH key request is waiting for a second approver, and /u01 on pkhdevapp01 is 87% full.",
  northwind: "CS PRD is one component behind (WebLogic). NWOPS-311 for CS TST is waiting for approval; the Process Scheduler queue on nwcprdprcs01 is rising but within the normal range for term start.",
  cascade: "Connector csh-conn-02 is on 2.3.8 and its certificate expires in 12 days. HCM PRD and TST share CVSS 7.5 in Tuxedo.",
  summit: "The connector has been offline for 3 hours, so every state here is last-known. Summit's network team scheduled work this Saturday.",
};
export const customerQueue = [
  { client: "parker", env: "pkr-hcm-dev", icon: "shield", tone: "cyan", title: "PSADMIN-872 is approved", sub: "HCM DEV · Apply unlocks for the 12:00 AM EDT window", cta: "Open change", to: "patching" },
  { client: "parker", env: "pkr-hcm-dev", icon: "disk", tone: "orange", title: "/u01 is 87% full on pkhdevapp01", sub: "Tonight's patch needs 6.4 GB · 11.4 GB can be freed", cta: "Ask agent", ask: "Clean up /u01 on pkhdevapp01" },
  { client: "parker", env: "pkr-hcm-tst", icon: "key", tone: "apricot", title: "SSH key needs a second approver", sub: "Mohammed Jiyash · HCM TST · PSADMIN-874", cta: "Review", to: "access" },
  { client: "parker", env: "pkr-hcm-prd", icon: "cpu", tone: "orange", title: "CPU above 85% on pkhprdapp01", sub: "HCM PRD · 14 min · payroll run", cta: "Ask agent", ask: "Why is pkhprdapp01 CPU high?" },
  { client: "northwind", env: "nwc-cs-tst", icon: "shield", tone: "apricot", title: "NWOPS-311 waiting for approval", sub: "CS TST · Sat 10:00 PM MST window", cta: "Open change", to: "patching" },
  { client: "cascade", env: null, icon: "refresh", tone: "apricot", title: "Connector 2.3.8 → 2.4.1", sub: "Update available · certificate expires in 12 days", cta: "Update", to: "connectors" },
  { client: "summit", env: null, icon: "offline", tone: "silver", title: "Connector offline for 3 h", sub: "On-prem · last seen 4:12 PM EDT", cta: "Diagnose", ask: "Why is the Summit connector offline?" },
];

// ── Per-environment detail for the large tiles ───────────────────────────────────────────────────
const JIRA = {
  "pkr-hcm-dev": { key: "PSADMIN-872", status: "approved", title: "Oct 2026 CPU · Linux, WebLogic, JDK, Tuxedo" },
  "pkr-hcm-tst": { key: "PSADMIN-874", status: "pending", title: "SSH key for Mohammed Jiyash" },
  "pkr-hcm-prd": { key: "PSADMIN-879", status: "pending", title: "Oct 2026 CPU · production, after TST sign-off" },
  "pkr-fin-uat": { key: "PSADMIN-866", status: "applied", title: "Sep 2026 bundle applied" },
  "nwc-cs-tst": { key: "NWOPS-311", status: "pending", title: "Oct 2026 CPU · CS TST" },
  "csh-hcm-tst": { key: "CHG0041877", status: "draft", title: "Oct 2026 CPU · Tuxedo RP052" },
};
const ALERTS = {
  "pkr-hcm-dev": [{ sev: "warning", text: "/u01 87% full on pkhdevapp01" }],
  "pkr-hcm-prd": [{ sev: "critical", text: "CPU above 85% on pkhprdapp01 · 14 min" }],
  "nwc-cs-prd": [{ sev: "info", text: "Process Scheduler queue rising" }],
  "smc-fin-dev": [{ sev: "warning", text: "Connector offline · state is last-known" }],
  "smc-fin-prd": [{ sev: "warning", text: "Connector offline · state is last-known" }],
  "smc-hcm-prd": [{ sev: "warning", text: "Connector offline · state is last-known" }],
};
const TASKS = {
  "pkr-hcm-dev": ["Download the last update (1 of 4)", "Free space on /u01 before 12:00 AM"],
  "pkr-hcm-tst": ["Second approver for an SSH key"],
  "pkr-hcm-prd": ["Plan the Oct CPU after TST sign-off"],
  "pkr-cs-dev": ["Patch levels not checked for 3 days"],
  "nwc-cs-tst": ["Approval for NWOPS-311"],
  "csh-hcm-prd": ["Raise a change for Tuxedo RP052"],
};
const SCHEDULE = {
  "pkr-hcm-dev": "Patch window tonight 12:00–7:00 AM EDT",
  "pkr-hcm-tst": "Always on",
  "pkr-hcm-prd": "OCI host maintenance Sun 2:00 AM EDT",
  "pkr-cs-dev": "Off Thu & Fri · starts Sat 12:00 AM",
  "pkr-cs-prd": "Always on · OCI backup 2:00 AM",
  "pkr-fin-uat": "Weekdays 7 AM–7 PM",
  "nwc-cs-tst": "Nightly stop 8 PM–6 AM MST",
};
const UPTIME = { "pkr-hcm-prd": 99.97, "pkr-cs-prd": 99.99, "nwc-cs-prd": 99.92, "nwc-fin-prd": 100, "csh-hcm-prd": 99.95, "csh-elm-prd": 99.98, "smc-fin-prd": 99.61, "smc-hcm-prd": 99.7 };
const SLA = { PRD: 99.9, UAT: 99.5, TST: 99.0, DEV: 98.0 };

let seed = 100;
export function envExtras(e) {
  // Live environments (from the control plane): real servers and domain states. Monitoring, uptime, alerts and
  // tickets aren't in the API yet, so they're empty rather than made up.
  if (e.live) {
    return {
      live: true, servers: e.servers, alerts: [], tasks: e.manualSteps || [], schedule: "See Schedules", jira: null,
      uptime: null, sla: SLA[e.tier] ?? 99, days: [], incidents: [],
    };
  }
  const servers = serversFor(e).map((s, i) => {
    const base = s.role === "app" ? 48 : s.role === "web" ? 30 : 36;
    const hot = e.id === "pkr-hcm-prd" && i === 2;
    const off = s.state !== "running";
    return {
      ...s,
      cpu: off ? Array(48).fill(2) : series(e.id.length * 7 + i * 13, 48, hot ? 64 : base, 18, hot ? 0.5 : 0),
      mem: off ? Array(48).fill(2) : series(e.id.length * 5 + i * 11, 48, base + 22, 7),
      disk: e.id === "pkr-hcm-dev" && s.role === "app" ? 87 : 38 + ((s.host.length * 7 + i * 9) % 30),
    };
  });
  seed++;
  const uptime = UPTIME[e.id] ?? (e.state === "stopped" ? null : e.tier === "DEV" ? 99.4 : 99.8);
  // 30 days, oldest first: "up" | "partial" | "down" | "planned"
  const days = Array.from({ length: 30 }, (_, d) => {
    if (e.id === "pkr-hcm-prd" && d === 17) return "partial";
    if (e.id === "smc-fin-prd" && (d === 9 || d === 29)) return d === 29 ? "down" : "partial";
    if (e.tier !== "PRD" && d % 7 === 5) return "planned";
    if (e.id === "pkr-hcm-dev" && d === 29) return "planned";
    return "up";
  });
  return {
    servers,
    alerts: ALERTS[e.id] || [],
    tasks: TASKS[e.id] || [],
    schedule: SCHEDULE[e.id] || (e.tier === "PRD" ? "Always on" : "No schedule"),
    jira: JIRA[e.id] || null,
    uptime, sla: SLA[e.tier] ?? 99, days,
    incidents: e.id === "pkr-hcm-prd" ? [{ when: "Oct 12, 2:14 AM", dur: "11 min", what: "App server restarted after a Tuxedo IPC limit (counted against SLA)" }]
      : e.id === "smc-fin-prd" ? [{ when: "Oct 21", dur: "2 h 40 min", what: "Datacenter network outage" }, { when: "Today", dur: "3 h, ongoing", what: "Connector offline: state unknown, not counted until confirmed" }] : [],
  };
}

// ── Logs: PeopleSoft log files on the OCI block volume (/u01), standard paths under each domain ─
export const PS_CFG_HOME = "/u01/app/psoft/ps_cfg_home";
export function logFiles(server) {
  const d = server.domain;
  if (server.role === "web") return [
    { id: "pia", name: "PIA_weblogic.log", path: `${PS_CFG_HOME}/webserv/${d}/servers/PIA/logs/PIA_weblogic.log`, size: "18.4 MB" },
    { id: "stdout", name: "PIA_stdout.log", path: `${PS_CFG_HOME}/webserv/${d}/servers/PIA/logs/PIA_stdout.log`, size: "2.1 MB" },
    { id: "access", name: "PIA_access.log", path: `${PS_CFG_HOME}/webserv/${d}/servers/PIA/logs/PIA_access.log`, size: "64.0 MB" },
  ];
  if (server.role === "prcs") return [
    { id: "schdlr", name: "SCHDLR_1029.LOG", path: `${PS_CFG_HOME}/appserv/prcs/${d}/LOGS/SCHDLR_1029.LOG`, size: "1.3 MB" },
    { id: "distsrv", name: "DSTAGNT_1029.LOG", path: `${PS_CFG_HOME}/appserv/prcs/${d}/LOGS/DSTAGNT_1029.LOG`, size: "0.6 MB" },
    { id: "tuxlog", name: "TUXLOG.102926", path: `${PS_CFG_HOME}/appserv/prcs/${d}/LOGS/TUXLOG.102926`, size: "0.4 MB" },
  ];
  return [
    { id: "appsrv", name: "APPSRV_1029.LOG", path: `${PS_CFG_HOME}/appserv/${d}/LOGS/APPSRV_1029.LOG`, size: "9.7 MB" },
    { id: "tuxlog", name: "TUXLOG.102926", path: `${PS_CFG_HOME}/appserv/${d}/LOGS/TUXLOG.102926`, size: "1.2 MB" },
    { id: "monsrv", name: "MONITORSERVER_1029.LOG", path: `${PS_CFG_HOME}/appserv/${d}/LOGS/MONITORSERVER_1029.LOG`, size: "0.3 MB" },
  ];
}
export function logLines(server, file) {
  const h = server.host;
  if (server.role === "web") return [
    ["19:11:58", "INFO", `<BEA-000365> Server state changed to RUNNING (${h})`],
    ["19:12:02", "INFO", "PSPIA: user PS signed in from 10.0.8.14"],
    ["19:12:05", "WARN", "<BEA-101162> User defined listener failed: session timeout 1200s exceeded for 3 sessions"],
    ["19:12:09", "INFO", "Jolt connection pool: 12 of 20 in use (pkhdevapp01:9033)"],
    ["19:12:11", "ERROR", "<BEA-101020> Servlet failed with an IOException: client closed connection (/psc/ps/EMPLOYEE/HRMS/c/…)"],
    ["19:12:14", "INFO", "Health check OK: signon page answered in 412 ms"],
  ];
  if (server.role === "prcs") return [
    ["19:10:00", "INFO", "PSPRCSRV.24117 Server: PSUNX checking status of requests"],
    ["19:10:31", "INFO", "Process 884213 (AE · PER099) queued by PS"],
    ["19:11:02", "INFO", "Process 884213 started on PSUNX"],
    ["19:11:46", "WARN", "Process 884207 (SQR · PAY003) running longer than 30 min"],
    ["19:12:03", "INFO", "Process 884213 success · posted 3 files to report repository"],
    ["19:12:10", "INFO", "PSDSTSRV: transfer of 3 reports completed"],
  ];
  return [
    ["19:11:52", "INFO", "PSAPPSRV.31544 (2) [10/29/26 19:11:52 PS@10.0.8.14] Starting service ICPanel"],
    ["19:11:55", "INFO", "PSAPPSRV.31544 (2) ICPanel completed in 0.214 s"],
    ["19:12:01", "WARN", "PSAPPSRV.31561 (1) Service request ICScript took 9.8 s (threshold 5 s)"],
    ["19:12:04", "INFO", "PSMONITORSRV: 6 of 8 PSAPPSRV processes busy"],
    ["19:12:07", "ERROR", "PSAPPSRV.31561 (1) SQL error. Stmt #: 1849 Error Position: 0 Return: 8603 - ORA-03113: end-of-file on communication channel (recovered, retry 1 OK)"],
    ["19:12:12", "INFO", "PSAPPSRV.31544 (2) Starting service ICQuery"],
    ["19:12:13", "INFO", "PSSAMSRV.31602 (1) Service completed in 0.031 s"],
  ];
}

// ── OCI connection for live data (Parker first) ──────────────────────────────────────────────────
export const ociConnection = {
  parker: { tenancy: "ocid1.tenancy.oc1..aaaaaaaa7xq2k3pmh4lzv5d", user: "ocid1.user.oc1..aaaaaaaapegasus2v6n3", fingerprint: "4f:9a:21:…:c8:0e", region: "us-ashburn-1", compartment: "ocid1.compartment.oc1..aaaaaaaaparkerpsft", status: "live", synced: "38s ago", instances: 17 },
};

// ── Deep links ───────────────────────────────────────────────────────────────────────────────────
export const envLink = (clientId, envId, ticket) => `fleet/${clientId}/${envId}${ticket ? `?ticket=${ticket}` : ""}`;
export const signinLink = (route) => `#/signin?next=${encodeURIComponent(route)}`;

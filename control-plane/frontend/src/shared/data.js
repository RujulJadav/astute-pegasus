// Sample data for the Pegasus design directions. Everything here is illustrative: the story
// follows the 29 Oct 2026 weekly review (Parker HCM DEV patched under PSADMIN-872, approved by
// Gopinath), but CVE numbers, hosts and metrics are made up. Swap client names before any
// external showing.

export const NOW_LABEL = "Thu, Oct 29 · 7:12 PM";
export const TZ = { id: "America/New_York", abbr: "EDT", offset: "UTC−4", label: "Eastern Time (EDT · UTC−4)" };
export const TIMEZONES = [
  { id: "America/New_York", label: "Eastern (EDT · UTC−4)", note: "Pegasus server default" },
  { id: "America/Chicago", label: "Central (CDT · UTC−5)" },
  { id: "America/Denver", label: "Mountain (MDT · UTC−6)" },
  { id: "America/Los_Angeles", label: "Pacific (PDT · UTC−7)", note: "Parker data centre" },
  { id: "UTC", label: "UTC" },
  { id: "Asia/Kolkata", label: "India (IST · UTC+5:30)" },
];

export const me = { name: "Arvind Rajan", first: "Arvind", initials: "AR", role: "Admin", org: "Astute" };

// ── Fleet ────────────────────────────────────────────────────────────────────
const env = (id, name, tier, state, behind, maxCvss, hosts, extra = {}) => ({ id, name, tier, state, behind, maxCvss, hosts, ...extra });

export const clients = [
  {
    id: "parker", name: "Parker", code: "PKR", cloud: "OCI", region: "us-ashburn-1", tz: "America/New_York",
    connector: { id: "pkr-conn-01", version: "2.4.1", status: "online", lastSeen: "12s ago", certDays: 61 },
    ticketing: "Jira · PSADMIN", cadence: "Monthly + quarterly CPU", people: 6,
    envs: [
      env("pkr-hcm-dev", "HCM DEV", "DEV", "running", 4, 9.8, ["pkhdevweb01", "pkhdevapp01", "pkhdevprcs01"], { window: "Tonight 12:00–7:00 AM", cr: "PSADMIN-872" }),
      env("pkr-hcm-tst", "HCM TST", "TST", "running", 4, 9.8, ["pkhtstweb01", "pkhtstapp01", "pkhtstprcs01"]),
      env("pkr-hcm-prd", "HCM PRD", "PRD", "running", 5, 9.8, ["pkhprdweb01", "pkhprdweb02", "pkhprdapp01", "pkhprdapp02", "pkhprdprcs01"]),
      env("pkr-cs-dev", "CS DEV", "DEV", "stopped", 3, 9.8, ["pkcdevweb01", "pkcdevapp01"], { note: "Off Thu & Fri (weekly plan)" }),
      env("pkr-cs-prd", "CS PRD", "PRD", "running", 2, 9.8, ["pkcprdweb01", "pkcprdapp01", "pkcprdprcs01"]),
      env("pkr-fin-uat", "FIN UAT", "UAT", "running", 0, 0, ["pkfuatweb01", "pkfuatapp01"]),
    ],
  },
  {
    id: "northwind", name: "Northwind College", code: "NWC", cloud: "OCI", region: "us-phoenix-1", tz: "America/Phoenix",
    connector: { id: "nwc-conn-01", version: "2.4.1", status: "online", lastSeen: "4s ago", certDays: 83 },
    ticketing: "Jira · NWOPS", cadence: "Quarterly CPU only", people: 4,
    envs: [
      env("nwc-cs-dev", "CS DEV", "DEV", "running", 3, 9.8, ["nwcdevweb01", "nwcdevapp01"]),
      env("nwc-cs-tst", "CS TST", "TST", "stopped", 3, 9.8, ["nwctstweb01", "nwctstapp01"], { note: "Nightly stop 8 PM" }),
      env("nwc-cs-prd", "CS PRD", "PRD", "running", 1, 9.8, ["nwcprdweb01", "nwcprdweb02", "nwcprdapp01", "nwcprdprcs01"]),
      env("nwc-fin-prd", "FIN PRD", "PRD", "running", 0, 0, ["nwfprdweb01", "nwfprdapp01"]),
    ],
  },
  {
    id: "cascade", name: "Cascade Health", code: "CSH", cloud: "Azure", region: "East US 2", tz: "America/Los_Angeles",
    connector: { id: "csh-conn-02", version: "2.3.8", status: "update", lastSeen: "21s ago", certDays: 12 },
    ticketing: "ServiceNow · CHG", cadence: "Quarterly CPU only", people: 3,
    envs: [
      env("csh-hcm-tst", "HCM TST", "TST", "running", 2, 7.5, ["cshtstweb01", "cshtstapp01"]),
      env("csh-hcm-prd", "HCM PRD", "PRD", "running", 2, 7.5, ["cshprdweb01", "cshprdapp01", "cshprdprcs01"]),
      env("csh-elm-prd", "ELM PRD", "PRD", "running", 0, 0, ["csleweb01", "csleapp01"]),
    ],
  },
  {
    id: "summit", name: "Summit County", code: "SMC", cloud: "On-prem", region: "Datacenter A", tz: "America/Denver",
    connector: { id: "smc-conn-01", version: "2.4.1", status: "offline", lastSeen: "3h ago", certDays: 44 },
    ticketing: "Jira · SCIT", cadence: "Monthly + quarterly CPU", people: 2,
    envs: [
      env("smc-fin-dev", "FIN DEV", "DEV", "unknown", 2, 8.1, ["smfdevweb01", "smfdevapp01"]),
      env("smc-fin-prd", "FIN PRD", "PRD", "unknown", 2, 8.1, ["smfprdweb01", "smfprdapp01", "smfprdprcs01"]),
      env("smc-hcm-prd", "HCM PRD", "PRD", "unknown", 1, 6.5, ["smhprdweb01", "smhprdapp01"]),
    ],
  },
];

export const allEnvs = clients.flatMap((c) => c.envs.map((e) => ({ ...e, client: c.name, clientId: c.id, cloud: c.cloud })));
export const fleetStats = {
  clients: clients.length,
  envs: allEnvs.length,
  hosts: allEnvs.reduce((n, e) => n + e.hosts.length, 0),
  behind: allEnvs.filter((e) => e.behind > 0).length,
  critical: allEnvs.filter((e) => e.maxCvss >= 9).length,
  prodCritical: allEnvs.filter((e) => e.maxCvss >= 9 && e.tier === "PRD").length,
  running: allEnvs.filter((e) => e.state === "running").length,
  // the app's own measure ("N components behind the latest Oracle release"), summed over the fleet
  componentsBehind: allEnvs.reduce((n, e) => n + e.behind, 0),
};

// Domain layout of the environment being patched tonight (Web → App, Process Scheduler alongside).
export const focusEnv = {
  client: "Parker", name: "HCM DEV", ptools: "8.62.08", os: "Oracle Linux 8.10", cloud: "OCI · us-ashburn-1",
  domains: [
    { kind: "web", label: "Web server", host: "pkhdevweb01", domain: "peoplesoft", tech: "WebLogic 14.1.2.0", state: "running", port: "8000" },
    { kind: "app", label: "Application server", host: "pkhdevapp01", domain: "HCMDEV", tech: "Tuxedo 22.1.0.0.0", state: "running", port: "9033" },
    { kind: "prcs", label: "Process Scheduler", host: "pkhdevprcs01", domain: "PSUNX", tech: "Tuxedo 22.1.0.0.0", state: "running" },
  ],
};

// ── Patching (Oracle Critical Patch Update, Oct 2026) ────────────────────────
export const advisory = { name: "Critical Patch Update · October 2026", released: "Oct 20, 2026", next: "Jan 19, 2027", url: "https://www.oracle.com/security-alerts/" };

export const components = [
  {
    key: "weblogic", name: "WebLogic Server", installed: "14.1.2.0.260425", installedLabel: "Apr 2026 CPU",
    latest: "14.1.2.0.260930", latestLabel: "Oct 2026 CPU", patch: "38951207 · Stack Patch Bundle",
    cvss: 9.8, status: "needed", hosts: ["pkhdevweb01"], doc: "Readme",
    cves: [
      { id: "CVE-2026-61842", score: 9.8, part: "Core · T3/IIOP", note: "Remote, no sign-in needed" },
      { id: "CVE-2026-61851", score: 9.8, part: "Core · IIOP" },
      { id: "CVE-2026-61877", score: 8.1, part: "Web Container" },
      { id: "CVE-2026-61803", score: 7.5, part: "Console" },
      { id: "CVE-2026-61866", score: 7.5, part: "JNDI" },
      { id: "CVE-2026-61891", score: 6.1, part: "Web Services" },
      { id: "CVE-2026-61812", score: 5.3, part: "Security Service" },
      { id: "CVE-2026-61829", score: 5.3, part: "Diagnostics" },
      { id: "CVE-2026-61835", score: 4.3, part: "Console" },
    ],
  },
  {
    key: "os", name: "Oracle Linux packages", installed: "UEK 5.15.0-312", installedLabel: "Sep 14 errata",
    latest: "42 updates", latestLabel: "3 kernel, 39 userspace", patch: "yum · ol8_baseos_latest",
    cvss: 8.8, status: "needed", hosts: ["pkhdevweb01", "pkhdevapp01", "pkhdevprcs01"], doc: "Errata",
    cves: [
      { id: "ELSA-2026-8812", score: 8.8, part: "kernel-uek · privilege escalation" },
      { id: "ELSA-2026-8790", score: 7.8, part: "glibc" },
      { id: "ELSA-2026-8766", score: 7.5, part: "openssl" },
      { id: "ELSA-2026-8741", score: 5.9, part: "openssh" },
    ],
  },
  {
    key: "jdk", name: "Java (JDK)", installed: "21.0.12", installedLabel: "Jul 2026 CPU",
    latest: "21.0.13", latestLabel: "Oct 2026 CPU", patch: "jdk-21.0.13_linux-x64",
    cvss: 7.5, status: "needed", hosts: ["pkhdevweb01", "pkhdevapp01", "pkhdevprcs01"], doc: "Release notes",
    cves: [
      { id: "CVE-2026-62210", score: 7.5, part: "Hotspot" },
      { id: "CVE-2026-62218", score: 7.4, part: "JSSE" },
      { id: "CVE-2026-62231", score: 5.9, part: "Networking" },
      { id: "CVE-2026-62247", score: 5.3, part: "Libraries" },
      { id: "CVE-2026-62259", score: 3.7, part: "2D" },
      { id: "CVE-2026-62263", score: 3.1, part: "Serialization" },
    ],
  },
  {
    key: "tuxedo", name: "Tuxedo", installed: "22.1.0.0.0 RP048", installedLabel: "Jul 2026",
    latest: "RP052", latestLabel: "Oct 2026 rolling patch", patch: "39012874 · RP052",
    cvss: 7.2, status: "needed", hosts: ["pkhdevapp01", "pkhdevprcs01"], doc: "Readme",
    cves: [
      { id: "CVE-2026-61930", score: 7.2, part: "Core" },
      { id: "CVE-2026-61938", score: 4.8, part: "Jolt" },
    ],
  },
  {
    key: "dbclient", name: "Oracle Database Client", installed: "19.32 RU", installedLabel: "Jul 2026",
    latest: "19.33 RU", latestLabel: "Oct 2026 release update", patch: "39188120 · DB RU",
    cvss: 6.5, status: "ok", hosts: ["pkhdevapp01"], doc: "Readme", note: "Already applied on Oct 22",
    cves: [
      { id: "CVE-2026-61705", score: 6.5, part: "Oracle Net" },
      { id: "CVE-2026-61711", score: 4.3, part: "SQL*Plus" },
      { id: "CVE-2026-61716", score: 3.1, part: "Core RDBMS" },
    ],
  },
];

export const comingModules = [
  { key: "peopletools", name: "PeopleTools patches", note: "8.62.08 → 8.62.10, via change assistant", phase: "Next phase" },
  { key: "windows", name: "Windows Server updates", note: "For on-prem and Azure process schedulers", phase: "Next phase" },
  { key: "dbcs", name: "Database (DBCS / ExaCS) patching", note: "Release updates in the same window", phase: "Next phase" },
];

export const severity = (s) => (s >= 9 ? "critical" : s >= 7 ? "high" : s >= 4 ? "medium" : s > 0 ? "low" : "none");

// ── The change tonight ───────────────────────────────────────────────────────
export const changeRequest = {
  key: "PSADMIN-872", system: "Jira", url: "#", client: "Parker", env: "HCM DEV",
  title: "Patch Parker HCM DEV: Oracle Linux, WebLogic, JDK, Tuxedo (Oct 2026 CPU)",
  raisedBy: "Ashwini C.", raisedAt: "3:22 PM", approver: "Gopinath S.", approvedAt: "3:31 PM",
  window: { start: "12:00 AM", end: "7:00 AM", day: "Fri, Oct 30", tz: "EDT" },
  operator: "Safi", status: "approved", startsIn: "4h 48m",
  plan: ["os", "weblogic", "jdk", "tuxedo"],
};

export const applySteps = [
  { id: "preflight", label: "Pre-flight checks", detail: "Connector online · 18.2 GB free on /u01 (needs 6.4 GB)", dur: "14s" },
  { id: "boot-backup", label: "Boot volume backups", detail: "OCI full backups of 3 boot volumes", dur: "4m 12s", isNew: true },
  { id: "block-backup", label: "Block volume backups", detail: "OCI full backups of /u01 on 3 hosts", dur: "6m 40s", isNew: true },
  { id: "stop", label: "Stop domains", detail: "Web → Process Scheduler → App server", dur: "1m 51s" },
  { id: "procs", label: "Confirm nothing is running", detail: "No WebLogic or Tuxedo processes left", dur: "6s" },
  { id: "os", label: "Oracle Linux updates", detail: "yum update · 42 packages on 3 hosts", dur: "9m 03s" },
  { id: "weblogic", label: "WebLogic Oct 2026 CPU", detail: "Archive home, apply 14.1.2.0.260930", dur: "7m 22s" },
  { id: "jdk", label: "JDK 21.0.13", detail: "Install, keep jdk.bak, verify", dur: "1m 18s" },
  { id: "tuxedo", label: "Tuxedo RP052", detail: "Back up home, apply rolling patch", dur: "3m 47s" },
  { id: "reboot", label: "Reboot", detail: "Linux reports a reboot is needed on 3 hosts", dur: "2m 35s" },
  { id: "start", label: "Start and verify", detail: "Start every domain, check status, sign-in page answers", dur: "3m 02s" },
  { id: "close", label: "Update PSADMIN-872", detail: "Result, versions and backup IDs posted to Jira", dur: "2s" },
];

export const applyLog = [
  "[00:00:02] pkr-conn-01 · job 7f3c signed by control plane · verified",
  "[00:00:09] pre-flight: /u01 18.2G free (needs 6.4G) · ok",
  "[00:00:16] oci: boot volume backup ocid1.bootvolumebackup…pkhdevweb01 · CREATING",
  "[00:04:28] oci: 3/3 boot volume backups AVAILABLE",
  "[00:11:08] oci: 3/3 block volume backups AVAILABLE",
  "[00:11:10] psadmin -w shutdown -d peoplesoft · stopped",
  "[00:12:59] psadmin -c shutdown! -d HCMDEV · stopped",
  "[00:13:05] ps -ef | grep -E 'weblogic|BBL' · none",
  "[00:13:06] yum -y update · 42 packages · resolving",
  "[00:22:09] yum: Complete! · needs-restarting -r → reboot required",
  "[00:22:11] opatch apply 38951207 · WLS PATCH SET UPDATE 14.1.2.0.260930",
];

// ── Schedules (start/stop) ───────────────────────────────────────────────────
// 7 days × 24 hours; 1 = up, 0 = stopped.
const plan = (fn) => Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => (fn(d, h) ? 1 : 0)));
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const schedules = [
  { env: "Parker · HCM DEV", rule: "Weekdays 7 AM–7 PM, weekends off", grid: plan((d, h) => d < 5 && h >= 7 && h < 19), saved: "61%", next: "Stops 7:00 PM tonight · skipped for PSADMIN-872", override: true },
  { env: "Parker · CS DEV", rule: "Off on Thursdays and Fridays", grid: plan((d) => d !== 3 && d !== 4), saved: "29%", next: "Starts Sat 12:00 AM" },
  { env: "Northwind · CS TST", rule: "Stop every night 8 PM, start 6 AM", grid: plan((d, h) => h >= 6 && h < 20), saved: "42%", next: "Starts Fri 6:00 AM" },
  { env: "Parker · HCM TST", rule: "Always on", grid: plan(() => true), saved: "0%", next: "No schedule" },
];

// ── SSH access ───────────────────────────────────────────────────────────────
export const accessRequests = [
  { id: "ar-31", action: "add", person: "Mohammed Jiyash", keyType: "ed25519", fp: "SHA256:Qe4p…8hVx", env: "Parker · HCM TST", hosts: 3, osUser: "psadm2", requestedBy: "Ashwini C.", when: "2h ago", ticket: "PSADMIN-874", status: "waiting" },
  { id: "ar-30", action: "remove", person: "Former contractor (j.doe)", keyType: "rsa 4096", fp: "SHA256:1bZr…Kq0M", env: "Parker · all", hosts: 17, osUser: "psadm2", requestedBy: "Gopinath S.", when: "yesterday", ticket: "PSADMIN-869", status: "approved" },
];
export const sshKeys = [
  { person: "Gopinath Samraj", type: "ed25519", fp: "SHA256:q8Jt…3fXc", scope: "Parker · HCM DEV, TST", hosts: 6, osUser: "psadm2", added: "Oct 14", approvedBy: "Rujul J." },
  { person: "Safi", type: "ed25519", fp: "SHA256:Lm2c…a9Wd", scope: "Parker · HCM DEV", hosts: 3, osUser: "psadm2", added: "Oct 28", approvedBy: "Gopinath S." },
  { person: "Rajes", type: "rsa 4096", fp: "SHA256:Zt7y…P0eQ", scope: "Parker · HCM DEV", hosts: 3, osUser: "psadm2", added: "Oct 28", approvedBy: "Gopinath S." },
  { person: "Ashwini Chandrashekaraiah", type: "ed25519", fp: "SHA256:cR5u…T2nB", scope: "All clients", hosts: 41, osUser: "opc", added: "Sep 02", approvedBy: "Arvind R." },
];

// ── People ───────────────────────────────────────────────────────────────────
export const people = [
  { name: "Ashwini Chandrashekaraiah", initials: "AC", email: "ashwini@beastute.com", role: "Admin", scope: "All clients", mfa: true, last: "2 min ago", status: "Active" },
  { name: "Gopinath Samraj", initials: "GS", email: "gopinath@beastute.com", role: "Admin", scope: "All clients", mfa: true, last: "12 min ago", status: "Active" },
  { name: "Safi", initials: "SF", email: "safi@parker.example", role: "Operator", scope: "Parker", mfa: true, last: "Yesterday", status: "Active" },
  { name: "Rajes", initials: "RJ", email: "rajes@parker.example", role: "Operator", scope: "Parker", mfa: true, last: "Yesterday", status: "Active" },
  { name: "Kanchan Singh", initials: "KS", email: "kanchan@beastute.com", role: "Operator", scope: "All clients", mfa: true, last: "Oct 27", status: "Active" },
  { name: "Rujul Jadav Prakash", initials: "RP", email: "rujul@beastute.com", role: "Viewer", scope: "All clients", mfa: true, last: "1h ago", status: "Active" },
  { name: "Balamurugan Manickaraj", initials: "BM", email: "bala@beastute.com", role: "Viewer", scope: "All clients", mfa: false, last: "never", pending: true, status: "Temporary password" },
  { name: "Northwind DBA (shared)", initials: "ND", email: "dba@northwind.example", role: "Viewer", scope: "Northwind College", mfa: false, last: "never", status: "MFA not set up" },
  { name: "Parker night operator", initials: "PN", email: "nightops@parker.example", role: "Operator", scope: "Parker", mfa: true, last: "Oct 26", status: "Locked" },
  { name: "j.doe (former contractor)", initials: "JD", email: "j.doe@parker.example", role: "Operator", scope: "Parker", mfa: true, last: "Sep 30", status: "Disabled" },
];
export const roles = [
  { role: "Viewer", can: "See clients, environments, patch posture, jobs and activity. Change nothing." },
  { role: "Operator", can: "Run status/start/stop, check and download patches, request approval and apply, manage SSH keys." },
  { role: "Admin", can: "Add clients and connectors, import inventory, integrations and patch settings, manage people." },
];

// ── Audit ────────────────────────────────────────────────────────────────────
export const audit = [
  { t: "3:31 PM", actor: "Gopinath S.", kind: "human", what: "approved PSADMIN-872 in Jira", detail: "Pegasus unlocked Apply for Parker HCM DEV", tag: "Change" },
  { t: "3:22 PM", actor: "Ashwini C.", kind: "human", what: "raised PSADMIN-872", detail: "Oracle Linux, WebLogic, JDK, Tuxedo · window Fri 12:00–7:00 AM EDT", tag: "Change" },
  { t: "3:05 PM", actor: "Pegasus Agent", kind: "agent", what: "drafted a patch plan for Parker HCM DEV", detail: "4 components, highest CVSS 9.8, boot + block volume backups added", tag: "Agent" },
  { t: "2:52 PM", actor: "Ashwini C.", kind: "human", what: "added Gopinath S. as Operator for Parker", detail: "Temporary password and sign-in link emailed", tag: "People" },
  { t: "2:40 PM", actor: "Ashwini C.", kind: "human", what: "requested SSH key for Mohammed Jiyash", detail: "Parker HCM TST · waiting for a second approver · PSADMIN-874", tag: "Access" },
  { t: "12:10 PM", actor: "Safi", kind: "human", what: "signed in", detail: "Password + authenticator code", tag: "Sign-in" },
  { t: "12:08 PM", actor: "Safi", kind: "human", what: "set up an authenticator app", detail: "Microsoft Authenticator · 10 recovery codes issued", tag: "Sign-in" },
  { t: "12:06 PM", actor: "Safi", kind: "human", what: "changed the temporary password", detail: "First sign-in", tag: "Sign-in" },
  { t: "9:00 AM", actor: "Schedule", kind: "system", what: "kept Parker CS DEV stopped", detail: "Weekly plan: off Thursdays and Fridays", tag: "Schedule" },
  { t: "7:00 AM", actor: "Schedule", kind: "system", what: "started Parker HCM DEV", detail: "Weekly plan: weekdays 7 AM–7 PM", tag: "Schedule" },
  { t: "6:58 AM", actor: "pkr-conn-01", kind: "system", what: "renewed its certificate", detail: "New Ed25519 key · valid 90 days", tag: "Connector" },
];

// ── Monitoring (OCI Monitoring via Connector Hub) ────────────────────────────
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export function series(seed, n = 48, base = 40, amp = 18, drift = 0) {
  const r = rng(seed);
  let v = base;
  return Array.from({ length: n }, (_, i) => {
    v += (r() - 0.5) * amp * 0.5 + drift;
    v = v * 0.85 + (base + drift * i) * 0.15;
    return Math.max(2, Math.min(99, Math.round(v * 10) / 10));
  });
}
export const hosts = [
  { host: "pkhprdapp01", env: "Parker · HCM PRD", role: "App server", cpu: series(11, 48, 62, 20, 0.5), mem: series(12, 48, 71, 8), disk: 64, alarm: "critical" },
  { host: "pkhprdweb01", env: "Parker · HCM PRD", role: "Web server", cpu: series(13, 48, 38, 16), mem: series(14, 48, 58, 6), disk: 41 },
  { host: "pkhdevapp01", env: "Parker · HCM DEV", role: "App server", cpu: series(15, 48, 22, 12), mem: series(16, 48, 49, 6), disk: 87, alarm: "warning" },
  { host: "pkhdevweb01", env: "Parker · HCM DEV", role: "Web server", cpu: series(17, 48, 18, 10), mem: series(18, 48, 44, 6), disk: 52 },
  { host: "nwcprdapp01", env: "Northwind · CS PRD", role: "App server", cpu: series(19, 48, 45, 18), mem: series(20, 48, 63, 7), disk: 58 },
  { host: "nwcprdprcs01", env: "Northwind · CS PRD", role: "Process Scheduler", cpu: series(21, 48, 33, 22), mem: series(22, 48, 52, 9), disk: 47, alarm: "info" },
];
export const alarms = [
  { sev: "critical", title: "CPU above 85% for 10 minutes", host: "pkhprdapp01", env: "Parker · HCM PRD", since: "14 min", source: "OCI Monitoring", metric: "CpuUtilization", agent: "Two app server processes (PSAPPSRV) are pinned since the 6:30 PM payroll run started. Pattern matches last Thursday's; it eased after the run." },
  { sev: "warning", title: "/u01 block volume 87% full", host: "pkhdevapp01", env: "Parker · HCM DEV", since: "2 h", source: "OCI Monitoring", metric: "DiskUtilization", agent: "Tonight's patch needs 6.4 GB. Three old patch bundles from the Apr and Jul CPUs use 11.4 GB and can be removed." },
  { sev: "info", title: "Process Scheduler queue rising", host: "nwcprdprcs01", env: "Northwind · CS PRD", since: "32 min", source: "OCI Logging", metric: "Queued requests", agent: "41 queued requests, mostly nightly enrolment reports. Within normal range for term start." },
];
export const monitoringSource = { name: "OCI Monitoring", via: "OCI Connector Hub → Streaming → Pegasus", tenancies: 2, lag: "38s", status: "streaming" };

// ── Integrations (adapters, configured on screen, saved to config) ───────────
export const integrations = [
  {
    group: "Ticketing and change approval", note: "Pegasus raises the change, waits for approval, then unlocks Apply.",
    items: [
      { id: "jira", name: "Jira Cloud", status: "connected", detail: "astute.atlassian.net · project PSADMIN · checks every 5 min", used: "Parker, Northwind, Summit" },
      { id: "servicenow", name: "ServiceNow", status: "ready", detail: "Change requests (Normal or Standard), CAB approval state, assignment group", used: "Cascade Health" },
      { id: "webhook", name: "Other help desk (webhook)", status: "planned", detail: "Generic adapter: create, poll and close a change through a webhook" },
    ],
  },
  {
    group: "Monitoring and observability", note: "One module, one view of each instance, whichever tool collects the data.",
    items: [
      { id: "oci-monitoring", name: "OCI Monitoring", status: "connected", detail: "Metrics and alarms through OCI Connector Hub → Streaming", used: "Parker, Northwind" },
      { id: "oci-logging", name: "OCI Logging", status: "beta", detail: "Audit and service logs for history and search" },
      { id: "solarwinds", name: "SolarWinds", status: "implementation", detail: "Built per customer during implementation" },
      { id: "nagios", name: "Nagios", status: "implementation", detail: "Built per customer during implementation" },
    ],
  },
  {
    group: "Where environments run", note: "Discovery works from IP addresses, so on-prem servers need no cloud IDs.",
    items: [
      { id: "oci", name: "Oracle Cloud (OCI)", status: "connected", detail: "Connector + OCI API for boot and block volume backups", used: "2 clients" },
      { id: "azure", name: "Microsoft Azure", status: "connected", detail: "Connector in the client's VNet · outbound HTTPS only", used: "1 client" },
      { id: "aws", name: "Amazon Web Services", status: "ready", detail: "Connector + EBS snapshots for backups" },
      { id: "onprem", name: "On-premises", status: "connected", detail: "Connector on an admin host · IP-based discovery", used: "1 client" },
    ],
  },
  {
    group: "Identity and notifications", note: "",
    items: [
      { id: "email", name: "Email (SMTP)", status: "connected", detail: "Sends temporary passwords and sign-in links to new people" },
      { id: "google", name: "Google sign-in", status: "connected", detail: "Single sign-on for Astute staff" },
      { id: "teams", name: "Microsoft Teams", status: "ready", detail: "Approvals and run updates in a channel" },
      { id: "slack", name: "Slack", status: "ready", detail: "Approvals and run updates in a channel" },
    ],
  },
];

// ── The agent (future scope: agentic Pegasus) ────────────────────────────────
export const agent = {
  name: "Pegasus Agent",
  briefing: [
    "Parker HCM DEV is cleared to patch tonight, 12:00–7:00 AM EDT (PSADMIN-872, approved by Gopinath at 3:31 PM). I'll take boot and block volume backups before anything changes.",
    "Two things need you: an SSH key request is waiting for a second approver, and /u01 on pkhdevapp01 is 87% full. The patch needs 6.4 GB; I can free 11.4 GB of old patch bundles.",
  ],
  suggestions: [
    "What's our exposure to the October CPU?",
    "Clean up /u01 on pkhdevapp01",
    "Why is pkhprdapp01 CPU high?",
    "Plan Northwind's quarterly patching",
  ],
  autonomy: [
    { level: 0, name: "Observe", desc: "Reads posture, metrics and logs. Changes nothing." },
    { level: 1, name: "Suggest", desc: "Drafts plans and change tickets for a person to raise." },
    { level: 2, name: "Act with approval", desc: "Raises changes and runs them after a person approves the exact plan." },
    { level: 3, name: "Autopilot (low risk)", desc: "Runs routine, reversible work (status, cache clears, cleanup) on its own and reports back." },
  ],
  // Scripted answers for the demo. tier: read (runs on its own) · write (needs approval) · destructive (two people + ticket)
  scripts: {
    "What's our exposure to the October CPU?": {
      tools: [
        { name: "advisory.read", args: "cpu=2026-10", out: "5 components · 24 CVEs", ms: 820, tier: "read" },
        { name: "fleet.patch_levels", args: "clients=all", out: "16 environments", ms: 1240, tier: "read" },
      ],
      answer: "13 of 16 environments are behind the October CPU. The biggest risk is WebLogic CVE-2026-61842 (CVSS 9.8, exploitable remotely without signing in). It affects 8 environments, 3 of them production: Parker HCM PRD, Parker CS PRD and Northwind CS PRD. Summit's connector has been offline for 3h, so its 3 environments are last-known only.",
      table: [["Parker", "5 of 6", "9.8"], ["Northwind", "3 of 4", "9.8"], ["Summit", "3 of 3", "8.1"], ["Cascade", "2 of 3", "7.5"]],
      proposal: { title: "Draft change requests for the 3 production environments", steps: ["Pick windows from each client's maintenance calendar", "Add boot and block volume backups", "Raise in Jira (Parker) and ServiceNow (Cascade)"], tier: "write" },
    },
    "Clean up /u01 on pkhdevapp01": {
      tools: [
        { name: "host.disk_usage", args: "host=pkhdevapp01 path=/u01", out: "87% · 18.2 GB free", ms: 610, tier: "read" },
        { name: "staging.list", args: "host=pkhdevapp01", out: "3 old bundles · 11.4 GB", ms: 540, tier: "read" },
      ],
      answer: "Three staged bundles are from CPUs already applied here: WebLogic Apr 2026 (4.1 GB), WebLogic Jul 2026 (4.3 GB) and DB RU 19.31 (3.0 GB). Nothing references them. Removing them takes /u01 from 87% to 61%, with room for tonight's 6.4 GB.",
      proposal: { title: "Delete 3 staged bundles (11.4 GB) on pkhdevapp01", steps: ["Keep the Oct 2026 bundle staged for tonight", "Delete /u01/staging/2026-Apr, 2026-Jul, dbru-19.31", "Re-check free space and post to PSADMIN-872"], tier: "destructive" },
    },
    "Why is pkhprdapp01 CPU high?": {
      tools: [
        { name: "monitoring.query", args: "CpuUtilization[1m]{host=pkhprdapp01}", out: "88% avg · 14 min", ms: 930, tier: "read" },
        { name: "psadmin.status", args: "domain=HCMPRD", out: "PSAPPSRV 6/6 busy", ms: 1480, tier: "read" },
      ],
      answer: "The 6:30 PM payroll calculation is running. All 6 PSAPPSRV processes are busy and CPU has held at 88% for 14 minutes. Last Thursday's run looked the same and eased by 7:40 PM. No action needed. I'll page the on-call if it is still above 85% at 8:00 PM.",
      proposal: { title: "Watch until 8:00 PM, then notify on-call in Teams", steps: ["Re-check every 5 minutes", "If still above 85% at 8:00 PM, post to #ps-oncall"], tier: "read" },
    },
    "Plan Northwind's quarterly patching": {
      tools: [
        { name: "fleet.patch_levels", args: "client=northwind", out: "3 of 4 behind", ms: 990, tier: "read" },
        { name: "schedules.windows", args: "client=northwind", out: "Sat 10 PM–Sun 6 AM", ms: 410, tier: "read" },
      ],
      answer: "Northwind takes quarterly CPUs only. I'd patch in three waves: CS DEV this Saturday, CS TST next Saturday, then CS PRD on Nov 14 after a week of testing. Each wave stops domains for about 45 minutes inside the Saturday 10 PM–Sun 6 AM window (MST, the client's time zone).",
      proposal: { title: "Raise 3 Jira changes in NWOPS, one per wave", steps: ["CS DEV · Sat Oct 31", "CS TST · Sat Nov 7", "CS PRD · Sat Nov 14"], tier: "write" },
    },
  },
};

// Where each point from the 29 Oct review shows up in the designs.
export const traceability = [
  { said: "Security score per patch, highest first, CVEs on hover", who: "Arvind (last review)", where: "Patching: CVSS-ranked list, CVE popover, advisory and readme links" },
  { said: "Show the time zone next to every scheduled time; default to the server's", who: "Gopinath, Kanchan", where: "Request approval: time zone menu (server default), zone shown beside every time" },
  { said: "Back up boot and block volumes before OS and CPU patches", who: "Gopinath", where: "Pre-flight checklist and run ledger steps 2–3" },
  { said: "Clean up old patch downloads before block volumes fill", who: "Gopinath", where: "Monitoring alarm and an agent cleanup plan for /u01" },
  { said: "Email the temporary password and sign-in link automatically", who: "Gopinath", where: "Add a person: “Email a temporary password and sign-in link” on by default" },
  { said: "Two-person approval for adding or removing SSH keys", who: "Arvind", where: "SSH access: request cards with a second approver and Jira ticket" },
  { said: "Monitoring module: OCI observability in a single pane of glass", who: "Arvind", where: "Monitoring: host metrics, alarms, source shown as OCI Connector Hub" },
  { said: "Ticketing as a pluggable adapter with a config screen (Jira, ServiceNow)", who: "Arvind, Kanchan", where: "Integrations: adapter cards with on-screen configuration" },
  { said: "Monthly vs quarterly CPU per client", who: "Ashwini", where: "Client cadence chip; patching cadence toggle" },
  { said: "Next phases: Windows, database and PeopleTools patching", who: "Arvind, Gopinath", where: "Patching: ‘Coming next’ modules" },
  { said: "Works off OCI: on-prem, Azure, AWS", who: "Kanchan", where: "Fleet shows cloud per client; Integrations ‘Where environments run’" },
  { said: "Make it agentic", who: "Bala (future scope)", where: "Agent briefing, plan cards with permission tiers, autonomy levels, agent rows in audit" },
];


// Feedback from the Nov 5 review of Mission Control, and where each point landed.
export const traceabilityNov5 = [
  { said: "Light, white background with flat colour; dark mode deprioritised. Gradients only on tiles and buttons", where: "Mission Control opens in the light theme; the page background is flat Mist with no glows; top bar and rail are solid white. Night edition kept behind the sun/moon button" },
  { said: "Clicking a bubble in the constellation should drill into that instance, not all instances", where: "Option B: the clicked instance opens in a slide-in panel over Mission Control (alerts, tasks, ticket, servers, other instances), with “Open in Fleet” for the full page" },
  { said: "Agent briefing alerts are instance-specific: move them to the customer page", where: "Fleet › customer: agent briefing and “Needs you” for that customer" },
  { said: "Mission Control briefing should be fleet-wide: patching, planned downtime, new CVEs, threat advisories", where: "Mission Control: fleet briefing in four columns" },
  { said: "KPI cards belong on the customer page; replace them with an overall health monitor", where: "Fleet › customer: the four KPI cards, scoped to the customer. Mission Control: patching current vs behind, vulnerability exposure, reachability and uptime" },
  { said: "Larger tiles, 2–3 per row, with alerts, pending tasks, schedule, Jira ticket and server details; scroll left/right", where: "Fleet: large environment tiles in a carousel with arrows and page dots" },
  { said: "Customer filter at the top; default to the customer the admin works on; cross-customer view for leads", where: "Fleet: customer picker, opens on Parker; “All customers · for leads”" },
  { said: "Hamburger menu on each tile: start all, stop all, clear cache, test connection; single servers stay in the detail", where: "Tile menu (☰) with the four actions and Copy link; per-server Start/Stop/Restart in the environment detail" },
  { said: "Remove must not be a simple popup: change management, kept 30 days, restorable", where: "Request removal: reason → change ticket → second approver → type the name; Pending removal until approved; Removals panel with the 30-day countdown and Restore" },
  { said: "Connect to Parker first via OCID and pull live data", where: "Fleet › Parker: “Live from OCI” and a Connect to OCI drawer (tenancy, user and compartment OCIDs, API key, test)" },
  { said: "Consolidated graphs per metric across servers, drill into one server; uptime for SLA", where: "Environment › Monitoring: one CPU / memory / disk chart for all servers, click a server to drill in. Environment › Uptime: 30-day bars, SLA target, incidents" },
  { said: "View PeopleSoft logs (app server, web server, process scheduler) without remote desktop", where: "Environment › Logs: files from the standard path under each domain on the /u01 block volume, with search, level filter, follow and download" },
  { said: "Jira emails should deep-link into Pegasus, straight to the environment, ready to patch", where: "Every environment has a link (#/fleet/<client>/<env>?ticket=…); sign-in returns to it; a banner offers Apply patch. Preview the email from the ticket" },
];

// ══ Everything below mirrors what today's Pegasus app shows, so the new designs keep it all ══

export const infraDpk = { patch: "38712455", label: "PeopleTools 8.62 Infrastructure DPK", released: "Oct 21, 2026" };

// Environments tab: one row per domain (host, IP, role, domain, OS user, status).
const ROLE = { web: "web", app: "app", prcs: "prcs" };
const DOMAIN = { web: "peoplesoft", app: (e) => e.name.replace(/\s/g, ""), prcs: "PSUNX" };
export function serversFor(e) {
  return e.hosts.map((h, i) => {
    const role = /web/.test(h) ? ROLE.web : /prcs/.test(h) ? ROLE.prcs : ROLE.app;
    const state = e.state === "unknown" ? "unknown" : e.state === "stopped" ? "stopped" : "running";
    return {
      host: h, ip: `10.0.${4 + (h.length % 5)}.${21 + i}`, role,
      domain: role === "app" ? DOMAIN.app(e) : DOMAIN[role], osUser: "psadm2",
      state, checked: e.state === "unknown" ? "3 h ago" : "2 min ago",
    };
  });
}
export const DOMAIN_STATES = { running: "Running", stopped: "Stopped", unknown: "Unknown", unreachable: "Unreachable" };

export const jobs = [
  { when: "7:10 PM", what: "Check status", env: "HCM DEV", by: "Schedule", result: "done", note: "3 of 3 running" },
  { when: "3:02 PM", what: "Check patch levels", env: "HCM DEV", by: "Ashwini C.", result: "done", note: "4 components behind" },
  { when: "2:41 PM", what: "Download and stage", env: "HCM DEV", by: "Ashwini C.", result: "done", note: "Copied to /u01/staging on 3 servers" },
  { when: "11:20 AM", what: "Clear cache", env: "HCM TST", by: "Safi", result: "done" },
  { when: "7:00 AM", what: "Start all", env: "HCM DEV", by: "Schedule", result: "done" },
  { when: "Yesterday", what: "Apply all", env: "FIN UAT", by: "Rajes", result: "done", note: "PSADMIN-866" },
];
export const jobOutput = [
  "job 41c2 · start all · Parker HCM DEV · signed, verified by pkr-conn-01",
  "pkhdevapp01 · psadmin -c boot -d HCMDEV",
  "  Booting all admin and server processes in /u01/psft/cfg/appserv/HCMDEV/PSTUXCFG",
  "  tmboot: 14 processes started",
  "pkhdevprcs01 · psadmin -p start -d PSUNX",
  "  Process Scheduler Server PSUNX started",
  "pkhdevweb01 · psadmin -w start -d peoplesoft",
  "  WebLogic Server peoplesoft started · RUNNING",
  "status · 3 of 3 domains running",
];

// Patching tab: levels read live from each server.
export const patchHosts = [
  { host: "pkhdevweb01", roles: "Web (PIA)", pt: "8.62.08", items: [
    { comp: "os", name: "OS updates", installed: "Oracle Linux 8.10", latest: "42 packages", status: "needed", staged: true, reboot: true },
    { comp: "jdk", name: "JDK", installed: "21.0.12", latest: "21.0.13 Oct 2026 CPU", status: "needed", staged: true },
    { comp: "weblogic", name: "WebLogic", installed: "14.1.2.0.260425", latest: "14.1.2.0 Oct2026 CPU", patch: "38951207", status: "needed", staged: true },
  ] },
  { host: "pkhdevapp01", roles: "App server", pt: "8.62.08", items: [
    { comp: "os", name: "OS updates", installed: "Oracle Linux 8.10", latest: "42 packages", status: "needed", staged: true },
    { comp: "jdk", name: "JDK", installed: "21.0.12", latest: "21.0.13 Oct 2026 CPU", status: "needed", staged: true },
    { comp: "tuxedo", name: "Tuxedo", installed: "22.1.0.0.0 RP048", latest: "22.1.0.0.0 RP052", patch: "39012874", status: "needed", staged: true },
    { comp: "dbclient", name: "Database client", installed: "19.33.0.0", latest: "19.33 Oct 2026 CPU", status: "ok" },
  ] },
  { host: "pkhdevprcs01", roles: "Process scheduler", pt: "8.62.08", items: [
    { comp: "os", name: "OS updates", installed: "Oracle Linux 8.10", latest: "42 packages", status: "needed", staged: true },
    { comp: "jdk", name: "JDK", installed: "21.0.12", latest: "21.0.13 Oct 2026 CPU", status: "needed", staged: true },
    { comp: "tuxedo", name: "Tuxedo", installed: "22.1.0.0.0 RP048", latest: "22.1.0.0.0 RP052", patch: "39012874", status: "needed", staged: false },
  ] },
];
export const PATCH_STATUS = { needed: "Update available", ok: "Up to date", "no-target": "Unknown", deferred: "With the next CPU" };
export const patchChecks = { levelsRead: "6 min ago", oracleLookedUp: "2 h ago", cacheHours: 12, auto: { check: true, every: "every day", stage: "Non-production environments", last: "6:00 AM" } };

// Change tickets for Parker, one per state the app knows.
export const changeTickets = [
  { key: "PSADMIN-872", env: "HCM DEV", scope: "All 4 outstanding updates", status: "approved", detail: "Approved by Gopinath S. · 3:31 PM", window: "Fri 12:00–7:00 AM EDT" },
  { key: "PSADMIN-870", env: "HCM TST", scope: "All 4 outstanding updates", status: "pending", detail: "Not approved yet (Jira status: Waiting for approval) · checked 2 min ago", window: "Sat 10:00 PM–Sun 4:00 AM EDT" },
  { key: "PSADMIN-866", env: "FIN UAT", scope: "JDK 21.0.13", status: "applied", detail: "Applied yesterday 11:48 PM · result posted to the ticket" },
  { key: "PSADMIN-861", env: "HCM PRD", scope: "WebLogic Oct2026 CPU", status: "stale", detail: "The plan changed after this ticket was raised" },
  { key: "PSADMIN-857", env: "CS PRD", scope: "All 2 outstanding updates", status: "rejected", detail: "Rejected by Kanchan S.: “wait for the payroll freeze to end”" },
];
export const TICKET_STATUS = { approved: "Approved", pending: "Waiting for approval", applying: "Applying now", applied: "Applied", rejected: "Rejected", stale: "Plan changed", failed: "Last apply failed" };
export const CHANGE_TYPES = ["Standard", "Normal", "Emergency"];

// Connectors tab.
export const connectors = [
  { client: "Parker", name: "pkr-conn-01", hostname: "pkrjump01", online: true, lastSeen: "12s ago", version: "2.4.1", update: "Up to date", auth: "Certificate", authDetail: "valid until Dec 29, 2026, renews by itself" },
  { client: "Northwind College", name: "nwc-conn-01", hostname: "nwcadm01", online: true, lastSeen: "4s ago", version: "2.4.1", update: "Up to date", auth: "Certificate", authDetail: "valid until Jan 20, 2027, renews by itself" },
  { client: "Cascade Health", name: "csh-conn-02", hostname: "cshjump02", online: true, lastSeen: "21s ago", version: "2.3.8", update: "2.4.1 available", canUpdate: true, auth: "Certificate", authDetail: "valid until Dec 02, 2026, renews by itself" },
  { client: "Summit County", name: "smc-conn-01", hostname: "smcadmin", online: false, lastSeen: "3 h ago", version: "2.4.1", update: "Up to date", auth: "Shared secret", authDetail: "switches to a certificate the next time the connector starts" },
];
export const connectorRelease = { version: "2.4.1", notes: "faster patch-level checks", key: "SHA256:7Xq2…pA9e", mode: "manual" };
export const signingKey = "ed25519 · SHA256:Mk3v…Qe8T";

// Settings tab (per client).
export const clientSettings = {
  oci: { tenancy: "parkeroci", region: "us-ashburn-1" },
  jira: {
    enabled: true, require: "Every environment", deployment: "Jira Cloud", url: "https://astute.atlassian.net", user: "svc-pegasus@beastute.com",
    project: "PSADMIN", issueType: "Change", changeType: "Normal", risk: "Medium", impact: "Moderate", urgency: "Medium",
    submit: "Submit for approval", start: "Implement", done: "Done", approved: "Approved, Ready to implement", rejected: "Rejected, Declined", blockSelf: true,
  },
  cadence: "monthly",
  stagingRoot: "/u01/staging",
  targets: [{ component: "tuxedo", appliesTo: "12.2.2.0.0", target: "093", patch: "36123540", platform: "226P", filter: "", label: "2026-Oct" }],
};

// Schedules tab: every schedule with its next and last run.
export const scheduleRuns = [
  { env: "HCM DEV", tier: "DEV", what: "Stop all", when: "Mon–Fri at 7:00 PM", tz: "America/New_York", next: "Skipping tonight", nextNote: "kept up for PSADMIN-872", last: "done", lastWhen: "yesterday 7:00 PM", source: "Weekly plan" },
  { env: "HCM DEV", tier: "DEV", what: "Start all", when: "Mon–Fri at 7:00 AM", tz: "America/New_York", next: "Fri 7:00 AM", nextNote: "in 12 h", last: "done", lastWhen: "today 7:00 AM", source: "Weekly plan" },
  { env: "CS DEV", tier: "DEV", what: "Stop all", when: "Thu at 12:00 AM", tz: "America/New_York", next: "Thu, Nov 5", nextNote: "in 6 days", last: "done", lastWhen: "today 12:00 AM", source: "Weekly plan" },
  { env: "CS DEV", tier: "DEV", what: "Start all", when: "Sat at 12:00 AM", tz: "America/New_York", next: "Sat 12:00 AM", nextNote: "in 29 h", last: "done", lastWhen: "Sat, Oct 24", source: "Weekly plan" },
  { env: "HCM TST", tier: "TST", what: "Clear cache and restart", when: "Once on Nov 2 at 6:00 AM", tz: "America/New_York", next: "Mon, Nov 2", nextNote: "in 4 days", last: "not yet", note: "after the TST refresh" },
  { env: "HCM PRD", tier: "PRD", what: "Restart all", when: "Sun at 5:00 AM", tz: "America/New_York", next: "Paused", last: "skipped", lastWhen: "Sun, Oct 25 · another job was running", paused: true },
];
export const SCHEDULE_ACTIONS = ["Office hours: start, then stop", "Stop all", "Start all", "Restart all", "Clear cache and restart"];

export const removedEnvs = [{ env: "HCM SBX", domains: 2, schedules: 1, by: "Ashwini C.", when: "3 days ago", until: "Nov 27, 2026" }];

// People statuses as the app shows them.
export const PERSON_STATUS = ["Active", "Temporary password", "MFA not set up", "Locked", "Disabled"];

// The app's existing Console AI: asks the client's OCI Console AI through your own OCI sign-in.
export const consoleAi = {
  tenancy: "parkeroci", region: "us-ashburn-1",
  q: "Which block volumes attached to pkhdevapp01 have no backup policy?",
  a: "One: pkhdevapp01-u01 (512 GB, /u01) has no backup policy assigned. The boot volume uses the Bronze policy. You can assign a policy under Block Storage → Block Volumes → pkhdevapp01-u01 → Backup policy.",
};

// "Nothing from today's app is lost": where each existing feature lives in the new designs.
export const parity = [
  { today: "Sign-in", what: "Password + authenticator code, Google sign-in, first-time QR setup, 10 recovery codes, new password", where: "Sign-in screens" },
  { today: "Sidebar", what: "Clients with environment and connector counts, Add client, People and access, signing key, My account, Sign out", where: "Client switcher and the account menu" },
  { today: "Client header", what: "Open OCI Console, Console AI", where: "Client header and ⌘K" },
  { today: "Environments", what: "Environments with tier and domain status counts; Check all now; Check status, Start all, Stop all, Restart, Clear cache, Test connection, Remove; each domain's host, IP, role, domain, OS user and status, with its own actions; typed confirmation on production", where: "Fleet" },
  { today: "Environments", what: "Recent jobs and live job output", where: "Fleet → environment, job console" },
  { today: "Environments", what: "Add servers by IP (OS users, host-key check), CSV import, Recently removed with Restore", where: "Fleet" },
  { today: "Schedules", what: "Every schedule with next and last run, Skip next run, Pause, Delete; weekly plan with time zone and fill-in presets; Add a schedule (start, stop, restart, clear cache; weekly or once; note)", where: "Schedules" },
  { today: "Patching", what: "Environment picker, Check patch levels, Look up latest again, automatic checks and staging; levels per server (installed, latest, patch number, status, reboot pending); Download, Download all; Apply one or all", where: "Patching" },
  { today: "Patching", what: "CVSS per component with its CVE list and readme; last and next CPU; PeopleTools Infrastructure DPK", where: "Patching" },
  { today: "Patching", what: "Request approval (planned start and end, change type, notes); Not approved yet with Check now and Withdraw; Approved by; Applying; Applied; Rejected; plan changed", where: "Patching → change tickets" },
  { today: "SSH access", what: "Add, Check or Remove a key (account, who and why, access until, environments); requests with Approve, Reject, Withdraw, Job; Check Jira now; second-person setting; keys Pegasus added", where: "SSH access" },
  { today: "Connectors", what: "Online and last seen, version and update status, certificate, Update and Remove, Add connector command, manual or automatic updates, newest release", where: "Connectors" },
  { today: "Settings", what: "OCI Console tenancy and region; Jira change approval (needed for, Cloud or Data Center, project, issue and change type, risk, impact, urgency, transitions, approved and rejected statuses, block self-approval, test, remove token); patch plan; staging folder; CPU targets", where: "Settings" },
  { today: "Activity", what: "Everything people and Pegasus did, per client and overall", where: "Audit log" },
  { today: "People and access", what: "Add a person, role, works for, status (active, temporary password, MFA not set up, locked, disabled), reset password, reset MFA, disable", where: "People" },
];

# Pegasus frontend (Mission Control redesign)

The redesigned Pegasus UI ("Concept A · Mission Control" from the Nov 2026 design review), connected to the control
plane API. React 19, Tailwind 4, Motion, Vite.

It runs beside the current page: the control plane serves the current UI at `/` and this one at **`/next/`**, so
nothing changes for anyone using `/` until we switch.

## What's connected

| Screen | State |
|---|---|
| Sign-in | **Live.** First-admin setup, email + password, authenticator setup (real QR), recovery codes, 6-digit or recovery code, forced password change, Google sign-in when the server has it on, sign out |
Every screen runs on the control plane. Nothing in live mode is sample data.

| Screen | State |
|---|---|
| Mission Control | **Live.** Fleet-wide numbers (customers, domains running, connectors online, updates outstanding, open tickets) and a *Needs you* list built from real rows: offline connectors, domains not running, outstanding updates by CVSS, tickets waiting or approved, SSH access requests, expiring certificates, failed jobs |
| Fleet | **Live.** Customers, environments, servers and domains, domain states (polled every 30 s), connector status, Check status, Start / Stop / Restart / Clear cache / Test connection per environment and per domain, typed confirmation on production, live job output, recent jobs, Add servers (scan by IP, trust a new host key, add the domains found), Remove environment and Restore (kept 30 days), OCI Console link |
| Patching | **Live.** Per environment: installed levels and Oracle's latest (Check patch levels, Look up latest again), outstanding updates ranked by CVSS from Oracle's advisory, by component or by server, Download (stage) per update or all, change ticket (Request approval with window, time zone, change type, notes), ticket list with Check now and Withdraw, Apply (typed confirmation on production, reboot option) with live output, monthly/quarterly cadence, automatic checks |
| Integrations | **Live** for the ticketing adapters: Jira and ServiceNow settings per customer (URL, sign-in, project or group, approval states, transitions, extra fields), token saved encrypted and never sent back, Test connection, which system approvals go through, approval for every environment or production only. The other adapters are shown as not in Pegasus yet |
| Monitoring | **Live** for what the control plane watches: domain availability, connector health, TLS certificates (addresses, warning days, Check now, the expiry ticket) and failed jobs |
| SSH access | **Live.** Key register, Give access (pasted key checked by the backend), Check, Remove, requests with Approve / Reject / Withdraw, Jira tickets when change approval is on, approval on or off, production needs an end date and the name typed |
| Schedules | **Live.** All schedules with Pause / Resume / Skip next / Delete, Add a schedule (weekly or once, time zone), the weekly start/stop plan per environment, typed confirmation on production |
| Connectors | **Live.** Each connector (online, version, certificate, updates), Add a connector (one-time token and the command to run), Update, Remove, manual or automatic updates, releases |
| Settings | **Live.** Patching (staging folder, servers at once, backups kept, time zone, cadence), CPU targets, OCI Console, start order and manual steps per environment, email (SMTP) with a test email |
| People | **Live.** Everyone with role, client and status, Add a person (emailed link, or a temporary password to pass on), change role, Disable / Enable, Reset password, Reset MFA |
| Audit log | **Live.** The latest 300 events, by customer, people or Pegasus, search, Export CSV |
| My account | **Live.** Change password, new recovery codes |

Not in the control plane, so not shown in live mode (the design keeps them under `?demo`): metrics and alarms from
OCI Monitoring (CPU, memory, disk, uptime, logs), the Pegasus Agent and Console AI, notifications, per-environment
alerts and SLA uptime on Fleet tiles, removal as a change request with a second approver, and the other adapters on
Integrations (monitoring tools, clouds, chat). Each of these needs backend work first.

## Run it

The control plane first (from `control-plane/`):

```bash
python3 -m pip install -r requirements.txt
export PEGASUS_ADMIN_PASSWORD='choose-one'
export PEGASUS_COOKIE_SECURE=false        # plain http on localhost
python3 -m pegasus_cloud                  # http://127.0.0.1:8443
```

Then either:

* **Work on the UI** (hot reload): `cd control-plane/frontend && npm install && npm run dev`, open
  http://localhost:5173/next/. Vite forwards `/api` to the control plane (`PEGASUS_URL`, default
  `http://127.0.0.1:8443`), so the browser sees one origin and the session cookie works.
* **Use the built UI**: `npm run build` writes it to `control-plane/pegasus_cloud/static/next/`; open
  http://127.0.0.1:8443/next/. The build is committed, so the control plane serves it without Node.

**Everything at once, with nothing real behind it** (from the repo root): `python scripts/dev_stack.py`, then open
http://127.0.0.1:8443/next/ (setup password `dev-setup-password`). It runs the control plane, a connector registered
to a sample client, simulated servers, a stand-in Oracle (levels, the latest releases and downloads work offline) and a
stand-in Jira/ServiceNow that approves each ticket 20 seconds after it's raised, so the whole patching flow can be
tried end to end. `--reset` starts again from an empty database.

## How it talks to the backend

* `src/api/client.js` is the only place that calls `fetch`. It sends `X-Requested-With: pegasus` (the backend refuses
  any other non-GET request) and the same-origin session cookie, and turns errors into the backend's own message.
* `src/api/live.jsx` loads the session, clients (`/api/clients`, `/api/clients/<id>`, `/api/clients/<id>/states`) and
  maps them into the same shape as the design's sample data (`src/shared/data.js`), so screens switch over without
  being rewritten. It also queues jobs (`POST /api/clients/<id>/run`) and runs Check status.
* `parts/JobConsole.jsx` streams a job's output from `GET /api/jobs/<id>?since=<n>`.
* Each screen has a live version, `screens/Live*.jsx`, with the endpoints it uses listed at the top of the file. The
  design's original (`Patching.jsx`, `People.jsx`, …) picks the live version when the app is live, and keeps the demo
  for `?demo`. `liveKit.jsx` has the small shared pieces (current customer, load/reload, messages).
  The backend applies one update or all outstanding updates per window and per ticket, so Patching's selection is one
  row or all of them.

Domain states use the backend's key, `environment|ip-or-host|role|domain`.

## Demo mode

Add `?demo` to the URL (or open `npm run build:demo`'s single file, `dist/demo/concept-a.html`) for the original
prototype: sample data, any input works. Useful for design reviews without a backend.

## Brand

Only the 13 Astute colours. `npm run brand-lint` fails on any other colour in the source or the built CSS.

Sample data still uses a real client name and real team names in places: swap them before showing it outside Astute.

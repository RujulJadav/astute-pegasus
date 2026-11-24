# Pegasus frontend (Mission Control redesign)

The redesigned Pegasus UI ("Concept A · Mission Control" from the Nov 2026 design review), connected to the control
plane API. React 19, Tailwind 4, Motion, Vite.

It runs beside the current page: the control plane serves the current UI at `/` and this one at **`/next/`**, so
nothing changes for anyone using `/` until we switch.

## What's live and what's still sample data

| Screen | State |
|---|---|
| Sign-in | **Live.** First-admin setup, email + password, authenticator setup (real QR), recovery codes, 6-digit or recovery code, forced password change, Google sign-in when the server has it on, sign out |
| Fleet | **Live.** Customers, environments, servers and domains, domain states (polled every 30 s), connector status, Check status, Start / Stop / Restart / Clear cache / Test connection per environment and per domain, typed confirmation on production, live job output, recent jobs |
| Patching | **Live.** Per environment: installed levels and Oracle's latest (Check patch levels, Look up latest again), outstanding updates ranked by CVSS from Oracle's advisory, by component or by server, Download (stage) per update or all, change ticket (Request approval with window, time zone, change type, notes), ticket list with Check now and Withdraw, Apply (typed confirmation on production, reboot option) with live output, monthly/quarterly cadence, automatic checks |
| Integrations | **Live** for the ticketing adapters: Jira and ServiceNow settings per customer (URL, sign-in, project or group, approval states, transitions, extra fields), token saved encrypted and never sent back, Test connection, which system approvals go through, approval for every environment or production only. The other adapters are shown as not in Pegasus yet |
| My account | **Live.** Change password, new recovery codes |
| Mission Control, Monitoring, SSH access, Schedules, Connectors, Settings, People, Audit log | Sample data, with a banner saying so. Next to connect |
| On a Fleet tile or environment: uptime, alerts, Jira ticket, monitoring, logs, removal, Add servers, Connect OCI | Not in the API yet, so they're hidden or empty for live environments rather than made up |

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
* `screens/LivePatching.jsx` and `screens/LiveIntegrations.jsx` are the live versions of those screens (the endpoints
  they use are listed at the top of each file); `Patching.jsx` and `Integrations.jsx` keep the design's demo for `?demo`.
  The backend applies one update or all outstanding updates per window and per ticket, so Patching's selection is one
  row or all of them.

Domain states use the backend's key, `environment|ip-or-host|role|domain`.

## Demo mode

Add `?demo` to the URL (or open `npm run build:demo`'s single file, `dist/demo/concept-a.html`) for the original
prototype: sample data, any input works. Useful for design reviews without a backend.

## Brand

Only the 13 Astute colours. `npm run brand-lint` fails on any other colour in the source or the built CSS.

Sample data still uses a real client name and real team names in places: swap them before showing it outside Astute.

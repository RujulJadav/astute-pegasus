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
| My account | **Live.** Change password, new recovery codes |
| Mission Control, Patching, Monitoring, SSH access, Schedules, Connectors, Integrations, Settings, People, Audit log | Sample data, with a banner saying so. Next to connect |
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

For something to look at without real servers, run a connector against simulated ones:
`python scripts/demo_servers.py --config <connector config.json>` (see the repo README).

## How it talks to the backend

* `src/api/client.js` is the only place that calls `fetch`. It sends `X-Requested-With: pegasus` (the backend refuses
  any other non-GET request) and the same-origin session cookie, and turns errors into the backend's own message.
* `src/api/live.jsx` loads the session, clients (`/api/clients`, `/api/clients/<id>`, `/api/clients/<id>/states`) and
  maps them into the same shape as the design's sample data (`src/shared/data.js`), so screens switch over without
  being rewritten. It also queues jobs (`POST /api/clients/<id>/run`) and runs Check status.
* `parts/JobConsole.jsx` streams a job's output from `GET /api/jobs/<id>?since=<n>`.

Domain states use the backend's key, `environment|ip-or-host|role|domain`.

## Demo mode

Add `?demo` to the URL (or open `npm run build:demo`'s single file, `dist/demo/concept-a.html`) for the original
prototype: sample data, any input works. Useful for design reviews without a backend.

## Brand

Only the 13 Astute colours. `npm run brand-lint` fails on any other colour in the source or the built CSS.

Sample data still uses a real client name and real team names in places: swap them before showing it outside Astute.

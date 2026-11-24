// Live data from the Pegasus control plane, mapped into the shape the Mission Control screens were designed around
// (the `clients` / `envs` objects in shared/data.js), so the screens can switch from sample data to real data
// without being rewritten.
//
// Two modes:
//   live  (default when served over http by the backend or the Vite dev server): sign-in, clients, environments,
//         domain states and jobs come from the API.
//   demo  (?demo in the URL, or the page opened as a file): the original sample data, any input works. Kept so the
//         design can still be shown without a backend.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { get, post, setSignedOutHandler } from "./client.js";
import * as sample from "../shared/data.js";

const params = new URLSearchParams(window.location.search);
export const LIVE = !params.has("demo") && window.location.protocol.startsWith("http");

const Ctx = createContext(null);
export const useLive = () => useContext(Ctx);

const POLL_MS = 30_000;

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "env";

export function initials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

// The backend accepts any tier text; production is prd / prod / production (is_prd in app.py).
export function normTier(t) {
  const v = String(t || "").trim().toUpperCase();
  if (["PRD", "PROD", "PRODUCTION"].includes(v)) return "PRD";
  if (["TEST", "TST"].includes(v)) return "TST";
  return v || "—";
}

export function ago(iso) {
  if (!iso) return "never";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

// Domain state key, as the backend builds it: environment|ip-or-host|role|domain (domain_key in app.py).
const stateKey = (env, s) => `${env}|${s.ip || s.host}|${s.role}|${s.domain}`;

function rollUp(states) {
  if (!states.length || states.every((s) => s === "unknown")) return "unknown";
  if (states.every((s) => s === "running")) return "running";
  if (states.every((s) => s === "stopped")) return "stopped";
  if (states.includes("unreachable") && !states.includes("running")) return "unreachable";
  return "partial";
}

function mapConnector(cons) {
  const c = cons.find((x) => x.online) || cons[0];
  if (!c) return { id: "no connector", version: "", status: "offline", lastSeen: "never", certDays: null, count: 0, online: 0 };
  const days = c.certificate?.valid_until ? Math.round((new Date(c.certificate.valid_until) - Date.now()) / 86400000) : null;
  return {
    id: c.name || c.hostname || c.id, version: c.version || "", lastSeen: ago(c.last_seen), certDays: days,
    status: c.online ? (c.update_available ? "update" : "online") : "offline",
    count: cons.length, online: cons.filter((x) => x.online).length, raw: cons,
  };
}

export function mapClient(detail, statesResp) {
  const states = statesResp?.states || {};
  const envs = (detail.environments || []).map((e) => {
    const servers = e.servers.map((s) => {
      const st = states[stateKey(e.name, s)];
      return {
        key: `${s.ip || s.host}|${s.role}|${s.domain}`, host: s.host || s.ip, ip: s.ip || "", role: s.role, domain: s.domain,
        osUser: s.os_user || "", state: st?.state || "unknown", checked: st ? ago(st.at) : "not checked yet", stage: s.stage,
        cpu: null, mem: null, disk: null,
      };
    });
    return {
      id: slug(e.name), name: e.name, tier: normTier(e.tier), tierRaw: e.tier, state: rollUp(servers.map((s) => s.state)),
      behind: 0, maxCvss: 0, hosts: [...new Set(servers.map((s) => s.host))], servers, manualSteps: e.manual_steps || [],
      clientId: detail.id, client: detail.name, live: true,
    };
  });
  const oci = detail.oci_console;
  return {
    id: detail.id, name: detail.name, code: initials(detail.name), live: true,
    cloud: oci ? "OCI" : "", region: oci?.region || "", ociUrl: oci?.url || null, tz: detail.time_zone || "",
    connector: mapConnector(detail.connectors || []), ticketing: detail.ticketing || "", cadence: "", people: null,
    envs, jobs: detail.jobs || [], checking: !!statesResp?.checking, lastAuto: statesResp?.last_auto || null,
    online: !!statesResp?.online,
  };
}

function mapMe(session) {
  const u = session.user;
  const name = u.name || u.email;
  return {
    name, first: name.split(/\s+/)[0], initials: initials(name).slice(0, 2), email: u.email,
    role: u.role[0].toUpperCase() + u.role.slice(1), roleId: u.role, clientId: u.client_id, org: u.client_id ? "" : "Astute",
  };
}

// ── provider ────────────────────────────────────────────────────────────────────────────────────
export function LiveProvider({ children }) {
  const [session, setSession] = useState(LIVE ? null : { auth: true, demo: true });
  const [clients, setClients] = useState(LIVE ? [] : sample.clients);
  const [loading, setLoading] = useState(LIVE);
  const [error, setError] = useState(null);
  const alive = useRef(true);

  const loadSession = useCallback(async () => {
    if (!LIVE) return;
    try {
      const s = await get("/api/session");
      setSession(s);
      setError(null);
      return s;
    } catch (e) {
      setError(e.message);
      setSession({ auth: false, unreachable: true });
    }
  }, []);

  const loadClients = useCallback(async () => {
    if (!LIVE) return;
    try {
      const { clients: list } = await get("/api/clients");
      const full = await Promise.all(list.map(async (c) => {
        const [detail, states] = await Promise.all([get(`/api/clients/${c.id}`), get(`/api/clients/${c.id}/states`).catch(() => null)]);
        return mapClient(detail, states);
      }));
      if (alive.current) { setClients(full); setError(null); }
    } catch (e) {
      if (alive.current && e.status !== 401) setError(e.message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    setSignedOutHandler(() => setSession((s) => (s ? { ...s, auth: false } : s)));
    loadSession();
    return () => { alive.current = false; };
  }, [loadSession]);

  const authed = !!session?.auth && !session?.must_change_password;
  useEffect(() => {
    if (!LIVE || !authed) return;
    setLoading(true);
    loadClients();
    const id = setInterval(loadClients, POLL_MS);
    return () => clearInterval(id);
  }, [authed, loadClients]);

  // Queue a job: environment-wide, or one server/domain. Resolves with the job id. Rejects with an ApiError whose
  // body.need_confirm is true when a production environment needs its name typed.
  const run = useCallback(async (clientId, env, action, { host, role, domain, confirm } = {}) => {
    if (!LIVE) return null;
    const r = await post(`/api/clients/${clientId}/run`, { environment: env, action, host, role, domain, confirm });
    return r.job;
  }, []);

  // "Check all now": the backend queues a status check of every domain of the client.
  const checkAll = useCallback(async (clientId) => {
    if (!LIVE) return;
    await get(`/api/clients/${clientId}/states?now=1`);
    setTimeout(loadClients, 1500);
  }, [loadClients]);

  const signOut = useCallback(async () => {
    if (LIVE) { await post("/api/logout").catch(() => {}); await loadSession(); setClients([]); }
    window.location.hash = "/home";
  }, [loadSession]);

  const value = useMemo(() => {
    const allEnvs = clients.flatMap((c) => c.envs.map((e) => ({ ...e, client: c.name, clientId: c.id, cloud: c.cloud })));
    return {
      live: LIVE, session, loading, error, clients, allEnvs,
      me: LIVE ? (session?.user ? mapMe(session) : null) : sample.me,
      signingKey: LIVE ? (session?.signing_key || "") : sample.signingKey,
      refresh: loadClients, reloadSession: loadSession, run, checkAll, signOut,
    };
  }, [session, loading, error, clients, loadClients, loadSession, run, checkAll, signOut]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

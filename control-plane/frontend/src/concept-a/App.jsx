import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Radar, Server, ShieldCheck, Activity, KeyRound, CalendarClock, Blocks, Users, ScrollText,
  Search, Bell, ChevronDown, LayoutGrid, Globe2, PanelRightOpen, Check, Cable, Settings2, UserCog, LogOut, KeyRound as KeyIcon, Sun, Moon, FlaskConical, Loader2,
} from "lucide-react";
import { AstuteLogo } from "../shared/Logo.jsx";
import { cx, useHashRoute, useKey, useAgentTurns } from "../shared/ui.jsx";
import { TZ, NOW_LABEL } from "../shared/data.js";
import { useLive } from "../api/live.jsx";
import { post } from "../api/client.js";
import { Tooltip, Kbd, Sparkle, ease, Drawer, Field, inputCls, Button } from "./kit.jsx";
import AgentPanel from "./Agent.jsx";
import Palette from "./Palette.jsx";
import Home from "./screens/Home.jsx";
import Fleet from "./screens/Fleet.jsx";
import Patching from "./screens/Patching.jsx";
import Monitoring from "./screens/Monitoring.jsx";
import Access from "./screens/Access.jsx";
import Schedules from "./screens/Schedules.jsx";
import Integrations from "./screens/Integrations.jsx";
import People from "./screens/People.jsx";
import Audit from "./screens/Audit.jsx";
import Connectors from "./screens/Connectors.jsx";
import Settings from "./screens/Settings.jsx";
import SignIn from "./screens/SignIn.jsx";
import ConsoleAi from "./parts/ConsoleAi.jsx";

export const NAV = [
  { id: "home", label: "Mission Control", icon: Radar, el: Home, live: true },
  { id: "fleet", label: "Fleet", icon: Server, el: Fleet, live: true },
  { id: "patching", label: "Patching", icon: ShieldCheck, el: Patching, badge: 1, live: true },
  { id: "monitoring", label: "Monitoring", icon: Activity, el: Monitoring, badge: 1, tone: "orange", live: true },
  { id: "access", label: "SSH access", icon: KeyRound, el: Access, badge: 1, live: true },
  { id: "schedules", label: "Schedules", icon: CalendarClock, el: Schedules, live: true },
  { id: "connectors", label: "Connectors", icon: Cable, el: Connectors, live: true },
  { id: "integrations", label: "Integrations", icon: Blocks, el: Integrations, live: true },
  { id: "settings", label: "Settings", icon: Settings2, el: Settings, live: true },
  { id: "people", label: "People", icon: Users, el: People, live: true },
  { id: "audit", label: "Audit log", icon: ScrollText, el: Audit, live: true },
];

const Ctx = createContext(null);
export const useShell = () => useContext(Ctx);

export default function App() {
  const L = useLive();
  const [route, go] = useHashRoute("home");
  const page = route.split(/[/?]/)[0];
  const current = NAV.find((n) => n.id === page) || NAV[0];
  // Closed by default so pages get the full width; opening it keeps it open across pages.
  const [agentOpen, setAgentOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Admins work one customer at a time: default to the one they are on (Parker in the demo). "All" is for leads.
  const [scope, setScope] = useState(L.live ? "" : "parker");
  // Live: start on the signed-in person's own client, else the first one; fall back if the current one disappears.
  useEffect(() => {
    if (!L.live || !L.clients.length) return;
    if (scope === "all" || L.clients.some((c) => c.id === scope)) return;
    setScope(L.me?.clientId || L.clients[0].id);
  }, [L.live, L.clients, L.me?.clientId, scope]);
  const [consoleAi, setConsoleAi] = useState(false);
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "day");
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const agentState = useAgentTurns();

  const askAgent = useCallback((q) => { setAgentOpen(true); agentState.ask(q); }, [agentState.ask]);
  useKey("mod+k", useCallback(() => setPaletteOpen((o) => !o), []));

  const shell = { route, go, agentOpen, setAgentOpen, askAgent, scope, setScope, openPalette: () => setPaletteOpen(true), openConsoleAi: () => setConsoleAi(true), theme, setTheme, working: agentState.turns.some((t) => !t.answering) };
  const Screen = current.el;
  if (L.live && !L.session) return <Loading />;
  if (page === "signin" || (L.live && (!L.session.auth || L.session.must_change_password))) return <SignIn />;

  return (
    <Ctx.Provider value={shell}>
      <div className="relative flex h-screen overflow-hidden bg-ink text-body">
        <AuroraDefs />
        <Atmosphere day={theme === "day"} />
        <Rail page={current.id} go={go} />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <TopBar title={current.label} />
          <main className="relative flex-1 overflow-y-auto overflow-x-hidden [scrollbar-color:#FFFFFF26_transparent] day:[scrollbar-color:#003C5133_transparent]">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
                transition={{ duration: 0.35, ease }}
                className="mx-auto w-full max-w-[1400px] px-10 pb-24 pt-9"
              >
                {L.live && !current.live && <SampleBanner />}
                {L.error && <div role="alert" className="mb-5 rounded-xl border border-orange/50 bg-orange/10 px-4 py-2.5 text-[12.5px] text-fg">{L.error}</div>}
                <Screen />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <motion.div
          initial={false}
          animate={{ width: agentOpen ? 404 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 34 }}
          className="relative shrink-0 overflow-hidden border-l border-fg/[0.07]"
        >
          <div className="h-full w-[404px]">
            <AgentPanel {...agentState} onClose={() => setAgentOpen(false)} />
          </div>
        </motion.div>
        <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <ConsoleAi open={consoleAi} onClose={() => setConsoleAi(false)} />
      </div>
    </Ctx.Provider>
  );
}

function Loading() {
  return <div className="grid h-screen place-items-center bg-ink text-muted"><Loader2 className="size-6 animate-spin text-accent" /></div>;
}

// Shown on screens that are still on the design's sample data while the rest of the app is live.
function SampleBanner() {
  return (
    <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-dashed border-apricot/70 bg-apricot/10 px-4 py-2.5 text-[12.5px] text-fg">
      <FlaskConical className="size-4 shrink-0 text-warn day:text-orange" />
      <span><b className="font-medium">Sample data.</b> This screen isn't connected to the control plane yet. Sign-in, Fleet, Patching and Integrations are live.</span>
    </div>
  );
}

// The gradient the agent's sparkles are painted with in daylight (Teal → Cyan → Apricot).
function AuroraDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <linearGradient id="aurora-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B89A1" /><stop offset="0.55" stopColor="#00C6FF" /><stop offset="1" stopColor="#FBB273" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Day (the default since the 5 Nov review): the page background is flat, no glows. Gradients live only on tiles and buttons.
function Atmosphere({ day }) {
  if (day) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -left-[15%] -top-[45%] h-[95%] w-[85%] rounded-full bg-[radial-gradient(closest-side,#003C5180,transparent)]" />
      <div className="absolute -right-[10%] -top-[30%] h-[60%] w-[45%] rounded-full bg-[radial-gradient(closest-side,#0B89A12e,transparent)]" />
      <div className="absolute -bottom-[35%] -right-[10%] h-[80%] w-[60%] rounded-full bg-[radial-gradient(closest-side,#0B89A124,transparent)]" />
      <div className="absolute -bottom-[40%] left-[5%] h-[70%] w-[55%] rounded-full bg-[radial-gradient(closest-side,#003C51cc,transparent)]" />
    </div>
  );
}

function Rail({ page, go }) {
  const { live } = useLive();
  return (
    <nav aria-label="Modules" className="relative z-10 flex w-[76px] shrink-0 flex-col items-center border-r border-line bg-rail py-4">
      <button onClick={() => go("home")} className="mb-6 grid size-11 place-items-center rounded-xl bg-navy ring-1 ring-fg/10 day:bg-white day:shadow-[0_4px_14px_-6px_#003C5159]" aria-label="Pegasus home">
        <AstuteLogo variant={useShell().theme === "day" ? "color" : "white"} markOnly className="h-[22px] w-auto" />
      </button>
      <div className="flex flex-1 flex-col items-center gap-1">
        {NAV.map((n, i) => {
          const on = n.id === page;
          return (
            <div key={n.id} className="contents">
              {(i === 6 || i === 9) && <div className="my-1 h-px w-7 bg-fg/10" />}
              <Tooltip content={n.label} side="right">
                <button
                  onClick={() => go(n.id)}
                  aria-label={n.label}
                  aria-current={on ? "page" : undefined}
                  className={cx("relative grid size-11 place-items-center rounded-xl transition-colors", on ? "text-white" : "text-muted/70 hover:bg-fg/[0.06] hover:text-fg day:text-muted/80")}
                >
                  {on && (
                    <motion.span layoutId="rail-active" className="absolute inset-0 rounded-xl bg-[linear-gradient(135deg,#0B89A14d,#003C5199)] shadow-[inset_0_0_0_1px_#00C6FF40,0_0_24px_-6px_#00C6FF80] day:bg-[linear-gradient(135deg,#0B89A1,#003C51)] day:shadow-[0_10px_22px_-10px_#003C51]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                  )}
                  {on && <motion.span layoutId="rail-bar" className="absolute -left-[17px] h-5 w-[3px] rounded-r bg-accent shadow-[0_0_12px_#00C6FF] day:bg-cyan" />}
                  <n.icon className="relative size-[19px]" strokeWidth={1.8} />
                  {n.badge && !live && (
                    <span className={cx("absolute right-1.5 top-1.5 size-2 rounded-full ring-2 ring-navy day:ring-white", n.tone === "orange" ? "bg-orange" : "bg-accent")} />
                  )}
                </button>
              </Tooltip>
            </div>
          );
        })}
      </div>
      {!live && <Tooltip content="All design directions" side="right">
        <a href="index.html" className="grid size-11 place-items-center rounded-xl text-muted/70 hover:bg-fg/[0.06] hover:text-fg" aria-label="All design directions">
          <LayoutGrid className="size-[18px]" strokeWidth={1.8} />
        </a>
      </Tooltip>}
      <AccountMenu />
    </nav>
  );
}

function TopBar({ title }) {
  const { agentOpen, setAgentOpen, scope, setScope, openPalette, theme, setTheme, working } = useShell();
  const { clients, live } = useLive();
  const [scopeOpen, setScopeOpen] = useState(false);
  const sel = clients.find((c) => c.id === scope);
  const conn = clients.map((c) => c.connector.status);
  return (
    <header className="@container relative z-20 flex h-16 shrink-0 items-center gap-4 border-b border-line bg-[#003C5133] px-6 backdrop-blur-xl day:bg-white day:backdrop-blur-none">
      <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
        <span className="font-display text-[17px] font-extrabold tracking-[-0.01em]">Pegasus</span>
        <span className="text-fg/20">/</span>
        <span className="text-[14px] text-muted">{title}</span>
      </div>

      <div className="relative ml-1 shrink-0">
        <button onClick={() => setScopeOpen((o) => !o)} className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-fg/10 bg-fg/[0.04] pl-1.5 pr-2.5 text-[13px] hover:bg-fg/[0.08]">
          <span className="grid h-6 min-w-6 place-items-center rounded-md bg-navy px-1 font-mono text-[9.5px] font-semibold text-cyan ring-1 ring-fg/10">{sel ? sel.code : clients.length}</span>
          {sel ? sel.name : "All clients"}
          <ChevronDown className="size-3.5 text-muted" />
        </button>
        <AnimatePresence>
          {scopeOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.16 }}
              className="absolute left-0 top-11 w-72 rounded-xl border border-fg/10 bg-raised p-1.5 shadow-pop backdrop-blur-xl"
            >
              {[{ id: "all", name: "All clients", code: "ALL", cloud: `${clients.length} clients` }, ...clients].map((c) => (
                <button key={c.id} onClick={() => { setScope(c.id); setScopeOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left hover:bg-fg/[0.06]">
                  <span className="grid size-7 place-items-center rounded-md bg-navy font-mono text-[10px] font-semibold text-white">{c.code}</span>
                  <span className="flex-1">
                    <span className="block text-[13px]">{c.name}</span>
                    <span className="block text-[11.5px] text-muted/70">{c.envs ? `${c.envs.length} environments · ${c.live ? `${c.connector.online} of ${c.connector.count}` : c.connector.status === "offline" ? "0 of 1" : "1 of 1"} connector online` : c.cloud}</span>
                  </span>
                  {scope === c.id && <Check className="size-4 text-accent" />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button onClick={openPalette} className="group mx-auto flex h-10 min-w-0 w-full max-w-[460px] items-center gap-3 whitespace-nowrap rounded-xl border border-fg/10 bg-fg/[0.035] px-3.5 text-left text-[13px] text-muted/70 transition hover:border-accent/30 hover:bg-fg/[0.06] hover:shadow-[0_0_0_4px_#00C6FF0f]">
        <Search className="size-4 text-muted/80 group-hover:text-accent" />
        <span className="hidden min-w-0 flex-1 truncate @4xl:block">{live ? "Jump to a screen or environment…" : "Ask Pegasus or jump to…"}</span><span className="flex-1 @4xl:hidden" />
        <Kbd>⌘</Kbd><Kbd>K</Kbd>
      </button>

      <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
        <Tooltip content={<span>Times are shown in <b>{TZ.label}</b>, the Pegasus server default. Each client's own zone is shown where it differs.</span>} side="bottom">
          <span className="flex h-9 items-center gap-2 px-2 text-[12.5px]">
            <Globe2 className="size-3.5 text-accent" />
            <span className="tabular text-fg">{NOW_LABEL.split("· ")[1]}</span>
            <span className="font-mono text-[11px] text-muted/80">{TZ.abbr}</span>
          </span>
        </Tooltip>
        <Tooltip content={theme === "day" ? "Switch to the night theme" : "Switch to the day theme"} side="bottom">
          <button onClick={() => setTheme(theme === "day" ? "night" : "day")} className="relative grid size-9 place-items-center overflow-hidden rounded-lg border border-fg/10 bg-fg/[0.035] text-muted hover:text-fg day:bg-white" aria-label="Switch theme">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={theme} initial={{ y: 14, rotate: -40, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} exit={{ y: -14, rotate: 40, opacity: 0 }} transition={{ duration: 0.25 }}>
                {theme === "day" ? <Moon className="size-4" /> : <Sun className="size-4" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </Tooltip>
        {!live && <button className="relative grid size-9 place-items-center rounded-lg border border-fg/10 bg-fg/[0.035] text-muted hover:text-fg day:bg-white" aria-label="Notifications">
          <Bell className="size-4" />
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange px-1 text-[10px] font-bold text-navy">4</span>
        </button>}
        {/* The agent is future scope (no backend yet), so it's only in the demo. */}
        {!live && !agentOpen && theme !== "day" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={() => setAgentOpen(true)}
            className="relative flex h-9 items-center gap-2 overflow-hidden rounded-lg bg-[linear-gradient(135deg,#F2E8C4,#E6F4F1)] px-3 text-[13px] font-semibold text-navy shadow-[0_0_28px_-8px_#F2E8C4]"
          >
            <Sparkle className="size-4 text-teal" /> Agent
            <PanelRightOpen className="size-3.5 text-navy/60" />
          </motion.button>
        )}
        {!live && !agentOpen && theme === "day" && (
          <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={() => setAgentOpen(true)}
            className="relative rounded-[10px] bg-aurora p-[1.5px] shadow-[0_8px_24px_-10px_#00C6FF] animate-aurora">
            <span className="flex h-[33px] items-center gap-2 rounded-[8.5px] bg-navy pl-2.5 pr-3 text-[13px] font-semibold text-white">
              <span className="relative grid size-5 place-items-center">
                <span className="absolute inset-0 animate-ping rounded-full bg-cyan/30 [animation-duration:2.6s]" />
                <Sparkle className="relative size-4 [--sparkle-fill:url(#aurora-fill)]" />
              </span>
              Agent
              <span className="rounded-full bg-white/15 px-1.5 text-[10.5px] font-medium text-mint">{working ? "working" : "2 ideas"}</span>
            </span>
          </motion.button>
        )}
      </div>
    </header>
  );
}

// The account menu: what the app's sidebar footer has today (who you are, My account, signing key, Sign out).
function AccountMenu() {
  const { me, signingKey, signOut, live } = useLive();
  const [open, setOpen] = useState(false);
  const [acct, setAcct] = useState(false);
  if (!me) return null;
  return (
    <div className="relative mt-2">
      <button onClick={() => setOpen((o) => !o)} aria-label="Account" className="grid size-9 place-items-center rounded-full bg-[linear-gradient(135deg,#0B89A1,#003C51)] font-display text-[12px] font-bold text-white ring-2 ring-fg/10 hover:ring-accent/50">{me.initials}</button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.15 }}
            className="absolute bottom-0 left-12 z-50 w-72 rounded-xl border border-fg/10 bg-raised p-1.5 shadow-pop backdrop-blur-xl">
            <div className="px-3 py-2.5">
              <div className="text-[13.5px] font-medium">{me.name}</div>
              <div className="text-[11.5px] text-muted/80">{me.role}{me.org ? ` · ${me.org} (all clients)` : ""}</div>
            </div>
            <div className="mx-2 mb-1 rounded-lg bg-fg/[0.04] px-2.5 py-2 text-[11px] text-muted/70"><span className="flex items-center gap-1.5"><KeyIcon className="size-3" />Signing key</span><span className="font-mono text-muted">{signingKey}</span></div>
            <button onClick={() => { setAcct(true); setOpen(false); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-fg/[0.06]"><UserCog className="size-4 text-muted" />My account</button>
            {live
              ? <button onClick={() => { setOpen(false); signOut(); }} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-fg/[0.06]"><LogOut className="size-4 text-muted" />Sign out</button>
              : <a href="#/signin" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] hover:bg-fg/[0.06]"><LogOut className="size-4 text-muted" />Sign out</a>}
          </motion.div>
        )}
      </AnimatePresence>
      <Drawer open={acct} onClose={() => setAcct(false)} width={460} eyebrow="My account" title={me.name}
        footer={<Button variant="primary" className="ml-auto" onClick={() => setAcct(false)}>Close</Button>}>
        <MyAccount live={live} />
      </Drawer>
    </div>
  );
}

// My account: change password and replace recovery codes (POST /api/password, /api/mfa/recovery-codes).
function MyAccount({ live }) {
  const [f, setF] = useState({ current: "", newPw: "", pw: "" });
  const [msg, setMsg] = useState({});
  const [codes, setCodes] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const act = (key, fn) => async () => {
    if (!live) return setMsg({ [key]: "Prototype: nothing is saved." });
    setMsg({});
    try { await fn(); } catch (e) { setMsg({ [key]: e.message }); }
  };
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="font-display text-[14px] font-bold">Change password</h3>
        <Field label="Current password"><input type="password" className={inputCls} value={f.current} onChange={set("current")} autoComplete="current-password" /></Field>
        <Field label="New password" hint="12 characters or more."><input type="password" className={inputCls} value={f.newPw} onChange={set("newPw")} autoComplete="new-password" /></Field>
        <Button onClick={act("pw", async () => { await post("/api/password", { current: f.current, new: f.newPw }); setF((x) => ({ ...x, current: "", newPw: "" })); setMsg({ pw: "Password changed." }); })}>Change password</Button>
        {msg.pw && <p className="text-[12.5px] text-muted">{msg.pw}</p>}
      </section>
      <section className="space-y-3 border-t border-fg/[0.07] pt-5">
        <h3 className="font-display text-[14px] font-bold">Recovery codes</h3>
        <p className="text-[12.5px] text-muted/70">Get a new set. The old ones stop working.</p>
        <Field label="Password"><input type="password" className={inputCls} value={f.pw} onChange={set("pw")} autoComplete="current-password" /></Field>
        <Button onClick={act("rc", async () => { const r = await post("/api/mfa/recovery-codes", { password: f.pw }); setCodes(r.recovery_codes); setF((x) => ({ ...x, pw: "" })); })}>New recovery codes</Button>
        {msg.rc && <p className="text-[12.5px] text-muted">{msg.rc}</p>}
        {codes && <div className="grid grid-cols-2 gap-2 rounded-xl border border-fg/10 bg-fg/[0.03] p-4 font-mono text-[13px]">{codes.map((c) => <span key={c}>{c}</span>)}</div>}
      </section>
    </div>
  );
}

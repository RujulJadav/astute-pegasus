import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowLeft, Copy, Check, KeyRound, Smartphone, CircleAlert, Loader2 } from "lucide-react";
import qrcode from "qrcode-generator";
import { AstuteLogo, APattern } from "../../shared/Logo.jsx";
import { cx } from "../../shared/ui.jsx";
import { Button, Field, inputCls, ease } from "../kit.jsx";
import { post } from "../../api/client.js";
import { useLive } from "../../api/live.jsx";

const DEMO_CODES = ["7KQ2-M9XD", "P4TR-8WZN", "J2VH-6QKC", "R8LB-3TYF", "N5DE-9GXA", "W3MC-7PHU", "B6ZK-2RJQ", "H9FT-4VNE", "Q2XW-8LDM", "C7NP-5KAS"];

// Sign-in as the app does it: email + password, then a 6-digit authenticator code. The first sign-in sets up the
// authenticator (QR) and shows 10 one-time recovery codes. With no accounts yet, the first admin is created here.
// Live mode calls the control plane (/api/setup, /api/login, /api/login/mfa, /api/mfa/enroll, /api/password);
// demo mode (?demo) keeps the prototype flow where any input works.
export default function SignIn() {
  const { live, session, reloadSession } = useLive();
  const day = document.documentElement.dataset.theme === "day";
  const nextRoute = new URLSearchParams(window.location.hash.split("?").slice(1).join("?")).get("next");

  const initial = !live ? "password" : session?.setup_needed ? "setup-admin" : session?.must_change_password ? "change" : "password";
  const [step, setStep] = useState(initial);
  useEffect(() => { setStep(initial); }, [initial]);
  const [first, setFirst] = useState(false); // demo only
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [f, setF] = useState({ email: "", password: "", name: "", setupPassword: "", code: "", current: "", newPw: "" });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const [enroll, setEnroll] = useState(null); // { secret, uri }
  const [codes, setCodes] = useState(DEMO_CODES);
  const [copied, setCopied] = useState(false);

  const finish = async () => {
    if (live) await reloadSession();
    window.location.hash = "/" + (nextRoute || (live ? "fleet" : "home"));
  };

  // One wrapper for every live call: busy state, the backend's own error text, restart when the session expired.
  const call = async (fn) => {
    setBusy(true); setErr("");
    try { await fn(); } catch (e) {
      setErr(e.message);
      if (e.body?.restart) { setStep("password"); setF((x) => ({ ...x, code: "" })); }
    } finally { setBusy(false); }
  };

  const submit = (ev) => {
    ev?.preventDefault();
    if (!live) {
      if (step === "password") return setStep(first ? "setup" : "code");
      if (step === "setup") return setStep("recovery");
      return finish();
    }
    if (step === "setup-admin") return call(async () => {
      await post("/api/setup", { setup_password: f.setupPassword, name: f.name, email: f.email, password: f.password });
      setNote("Account created. Sign in to set up your authenticator app.");
      await reloadSession();
      setStep("password");
    });
    if (step === "password") return call(async () => {
      const r = await post("/api/login", { email: f.email, password: f.password });
      if (r.next === "mfa") setStep("code");
      else { setEnroll({ secret: r.secret, uri: r.uri }); setStep("setup"); }
      setF((x) => ({ ...x, code: "" }));
    });
    if (step === "code") return call(async () => {
      const r = await post("/api/login/mfa", { code: f.code.replace(/\s+/g, "") });
      if (r.recovery_left != null) setNote(`Recovery code used. ${r.recovery_left} left.`);
      const s = await reloadSession();
      if (s?.must_change_password) setStep("change"); else await finish();
    });
    if (step === "setup") return call(async () => {
      const r = await post("/api/mfa/enroll", { code: f.code.replace(/\s+/g, "") });
      setCodes(r.recovery_codes || []);
      setStep("recovery");
    });
    if (step === "recovery") return call(async () => {
      const s = await reloadSession();
      if (s?.must_change_password) setStep("change"); else await finish();
    });
    if (step === "change") return call(async () => {
      await post("/api/password", { current: f.current, new: f.newPw });
      await finish();
    });
  };

  const shownSteps = live
    ? (step === "setup-admin" ? ["setup-admin"] : step === "change" ? ["change"] : enroll ? ["password", "setup", "recovery"] : ["password", "code"])
    : ["password", "code", "setup", "recovery"].filter((s) => first || (s !== "setup" && s !== "recovery"));
  const at = shownSteps.indexOf(step);

  return (
    <div className="relative grid min-h-screen grid-cols-1 bg-ink text-fg lg:grid-cols-[1.1fr_1fr]">
      <div data-theme={day ? "night" : undefined} className={cx("relative hidden overflow-hidden lg:block", day ? "bg-[radial-gradient(900px_600px_at_20%_10%,#0B89A1,#003C51_70%)] text-fg" : "bg-[radial-gradient(900px_600px_at_20%_10%,#003C51,transparent_75%)]")}>
        <APattern className="absolute -bottom-24 -left-24 h-[720px] w-[680px]" color="#00C6FF" opacity={0.06} />
        <div className="relative flex h-full flex-col justify-between p-14">
          <AstuteLogo variant="white" className="h-8 w-auto" />
          <div>
            <h1 className="max-w-lg font-display text-[44px] font-extrabold leading-[52px] tracking-[-0.02em]">PeopleSoft environments, governed by Astute.</h1>
            <p className="mt-4 max-w-md text-[15px] leading-[24px] text-muted">Start, stop, patch and secure every environment from one place, with change approval and a full audit trail.</p>
          </div>
          <p className="text-[12px] text-muted/70">Five wrong passwords or codes lock the account for 15 minutes.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-[400px]">
          <div className="mb-8 lg:hidden"><AstuteLogo variant="white" className="h-7 w-auto" /></div>
          {shownSteps.length > 1 && <div className="mb-6 flex gap-1.5">{shownSteps.map((s, i) => <span key={s} className={cx("h-1 flex-1 rounded-full", i <= at ? "bg-accent" : "bg-fg/10")} />)}</div>}
          {live && session?.unreachable && <Alert>Can't reach the Pegasus control plane. Start it (python -m pegasus_cloud) and reload.</Alert>}
          {note && !err && <p className="mb-4 rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-2 text-[12.5px] text-fg">{note}</p>}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.3, ease }}>
              {step === "setup-admin" && (
                <div className="space-y-4">
                  <h2 className="font-display text-[28px] font-extrabold">Set up Pegasus Cloud</h2>
                  <p className="text-[13.5px] text-muted">There are no accounts yet. Create the first admin. You'll set up your authenticator app when you sign in.</p>
                  {session?.setup_needs_password && <Field label="Setup password" hint="PEGASUS_ADMIN_PASSWORD on the server."><input className={inputCls} type="password" value={f.setupPassword} onChange={set("setupPassword")} autoFocus /></Field>}
                  <Field label="Your name"><input className={inputCls} value={f.name} onChange={set("name")} autoComplete="name" /></Field>
                  <Field label="Email"><input className={inputCls} type="email" value={f.email} onChange={set("email")} autoComplete="email" /></Field>
                  <Field label="Password" hint="12 characters or more."><input className={inputCls} type="password" value={f.password} onChange={set("password")} autoComplete="new-password" /></Field>
                  <Button type="submit" variant="primary" size="lg" className="w-full" iconRight={busy ? Loader2 : ArrowRight} disabled={busy}>Create admin account</Button>
                </div>
              )}
              {step === "password" && (
                <div className="space-y-4">
                  <h2 className="font-display text-[28px] font-extrabold">Sign in to Pegasus</h2>
                  {nextRoute && <p className="rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-2 text-[12.5px] text-fg">You opened a link from a change ticket. After signing in you'll go straight to <b className="font-medium">{nextRoute.split("?")[0].split("/").slice(1).join(" · ") || nextRoute}</b>.</p>}
                  {(!live || session?.google) && <>
                    <a href={live ? "/api/sso/google/start" : undefined} className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-fg/15 bg-fg/[0.04] text-[14px] hover:bg-fg/[0.08]">
                      <span className="grid size-5 place-items-center rounded-full bg-white font-display text-[12px] font-bold text-navy">G</span>Sign in with Google
                    </a>
                    <div className="flex items-center gap-3 text-[11.5px] text-muted/70"><span className="h-px flex-1 bg-fg/10" />or with a password<span className="h-px flex-1 bg-fg/10" /></div>
                  </>}
                  <Field label="Email"><input className={inputCls} type="email" autoComplete="username" autoFocus {...(live ? { value: f.email, onChange: set("email") } : { defaultValue: "arvind@beastute.com" })} /></Field>
                  <Field label="Password" hint="12 characters or more."><input className={inputCls} type="password" autoComplete="current-password" {...(live ? { value: f.password, onChange: set("password") } : { defaultValue: "••••••••••••••" })} /></Field>
                  {!live && <label className="flex items-center gap-2 text-[12.5px] text-muted"><input type="checkbox" checked={first} onChange={(e) => setFirst(e.target.checked)} className="accent-[#0B89A1]" />Show the first-time setup (temporary password)</label>}
                  <Button type="submit" variant="primary" size="lg" className="w-full" iconRight={busy ? Loader2 : ArrowRight} disabled={busy}>Continue</Button>
                </div>
              )}
              {step === "code" && (
                <div className="space-y-4">
                  <h2 className="font-display text-[28px] font-extrabold">Enter your code</h2>
                  <p className="text-[13.5px] text-muted">The 6-digit code from your authenticator app, or one of your recovery codes.</p>
                  <input className={cx(inputCls, "h-14 text-center font-display text-[22px] font-bold tracking-[0.4em]")} inputMode="text" autoComplete="one-time-code" autoFocus
                    {...(live ? { value: f.code, onChange: set("code") } : { defaultValue: "481927" })} />
                  <Button type="submit" variant="primary" size="lg" className="w-full" iconRight={busy ? Loader2 : ArrowRight} disabled={busy}>Sign in</Button>
                </div>
              )}
              {step === "setup" && (
                <div className="space-y-4">
                  <h2 className="font-display text-[28px] font-extrabold">Set up your authenticator app</h2>
                  <p className="flex gap-2 text-[13.5px] text-muted"><Smartphone className="mt-0.5 size-4 shrink-0 text-accent" />Scan this with Microsoft Authenticator, Google Authenticator, Duo or 1Password, then enter the code it shows.</p>
                  <div className="mx-auto w-fit rounded-2xl bg-white p-4">{live && enroll ? <RealQr uri={enroll.uri} /> : <QrMark />}</div>
                  {live && enroll && <p className="text-center text-[11.5px] text-muted/80">Can't scan? Enter this key: <span className="select-all font-mono text-fg">{enroll.secret}</span></p>}
                  <Field label="Code from the app"><input className={cx(inputCls, "text-center font-mono tracking-[0.4em]")} inputMode="numeric" autoComplete="one-time-code" autoFocus {...(live ? { value: f.code, onChange: set("code") } : { defaultValue: "481927" })} /></Field>
                  <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>{busy ? "Checking…" : "Turn on"}</Button>
                </div>
              )}
              {step === "recovery" && (
                <div className="space-y-4">
                  <h2 className="font-display text-[28px] font-extrabold">Save your recovery codes</h2>
                  <p className="text-[13.5px] text-muted">Each works once, if you lose your phone. Keep them somewhere safe. They aren't shown again.</p>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-fg/10 bg-fg/[0.03] p-4 font-mono text-[13px]">{codes.map((c) => <span key={c}>{c}</span>)}</div>
                  <div className="flex gap-2">
                    <Button type="button" icon={copied ? Check : Copy} onClick={() => { try { navigator.clipboard?.writeText(codes.join("\n")); } catch {} setCopied(true); }}>{copied ? "Copied" : "Copy codes"}</Button>
                    <Button type="submit" variant="primary" className="flex-1" icon={Check} disabled={busy}>I've saved them</Button>
                  </div>
                </div>
              )}
              {step === "change" && (
                <div className="space-y-4">
                  <h2 className="font-display text-[28px] font-extrabold">Choose a new password</h2>
                  <p className="text-[13.5px] text-muted">You signed in with a temporary password. Choose your own to continue.</p>
                  <Field label="Temporary password"><input className={inputCls} type="password" value={f.current} onChange={set("current")} autoComplete="current-password" autoFocus /></Field>
                  <Field label="New password" hint="12 characters or more."><input className={inputCls} type="password" value={f.newPw} onChange={set("newPw")} autoComplete="new-password" /></Field>
                  <Button type="submit" variant="primary" size="lg" className="w-full" iconRight={busy ? Loader2 : ArrowRight} disabled={busy}>Save and continue</Button>
                </div>
              )}
              {err && <Alert className="mt-4">{err}</Alert>}
            </motion.div>
          </AnimatePresence>
          {(step === "code" || step === "setup") && <button type="button" onClick={() => { setStep("password"); setErr(""); setEnroll(null); }} className="mt-6 flex items-center gap-1 text-[12.5px] text-muted/80 hover:text-fg"><ArrowLeft className="size-3.5" />Start over</button>}
          {!live && <div className="mt-10 flex items-center gap-2 text-[11.5px] text-muted/70"><KeyRound className="size-3.5" />Prototype: any input works.</div>}
        </form>
      </div>
    </div>
  );
}

function Alert({ children, className = "" }) {
  return <p role="alert" className={cx("mb-4 flex gap-2 rounded-lg border border-orange/50 bg-orange/10 px-3 py-2 text-[12.5px] text-fg", className)}><CircleAlert className="mt-0.5 size-4 shrink-0 text-orange" />{children}</p>;
}

// A real QR code of the otpauth:// URI the backend returns.
function RealQr({ uri }) {
  const svg = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(uri);
    q.make();
    return q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
  }, [uri]);
  return <div className="size-44 [&>svg]:size-full" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// A QR-like placeholder (demo mode only), drawn from a fixed pattern.
function QrMark() {
  const n = 25, cells = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const finder = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
    if (finder) continue;
    if (((x * 7 + y * 13 + x * y) % 5) < 2) cells.push([x, y]);
  }
  const Finder = ({ x, y }) => (<g><rect x={x} y={y} width="7" height="7" fill="#003C51" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="#FFFFFF" /><rect x={x + 2} y={y + 2} width="3" height="3" fill="#003C51" /></g>);
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="size-44" shapeRendering="crispEdges" aria-label="QR code placeholder">
      {cells.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#003C51" />)}
      <Finder x={0} y={0} /><Finder x={n - 7} y={0} /><Finder x={0} y={n - 7} />
    </svg>
  );
}

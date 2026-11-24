import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2, X, Pause, Hand, TerminalSquare, PartyPopper } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { applySteps, applyLog, changeRequest } from "../../shared/data.js";
import { Button, Pill, Sparkle, ease } from "../kit.jsx";

const STEP_MS = 1100;
const extraLog = [
  "[00:29:33] WebLogic 14.1.2.0.260930 · opatch lspatches · verified",
  "[00:30:51] JDK 21.0.13 installed · jdk.bak.20261030 kept",
  "[00:34:38] Tuxedo RP052 applied · tmadmin -v · verified",
  "[00:37:13] reboot · 3/3 hosts back in 2m 35s",
  "[00:40:15] psadmin start · web, app, prcs · all running · sign-in page 200",
  "[00:40:17] PSADMIN-872 · comment posted · status → Done",
];

export default function PatchRun({ open, onClose }) {
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const logRef = useRef(null);
  const done = step >= applySteps.length;

  useEffect(() => { if (open) { setStep(0); setPaused(false); } }, [open]);
  useEffect(() => {
    if (!open || paused || done) return;
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 700 : STEP_MS);
    return () => clearTimeout(t);
  }, [open, step, paused, done]);

  const lines = [...applyLog, ...extraLog].slice(0, Math.min(applyLog.length + extraLog.length, Math.round(step * 1.45) + 1));
  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }); }, [lines.length]);
  const pct = Math.round((Math.min(step, applySteps.length) / applySteps.length) * 100);
  const elapsed = done ? "40m 17s" : `${Math.floor(step * 3.4)}m ${String((step * 37) % 60).padStart(2, "0")}s`;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex bg-scrim p-6 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.5, ease }}
            className="relative mx-auto flex w-full max-w-[1240px] flex-col overflow-hidden rounded-3xl border border-fg/10 bg-raised shadow-[0_40px_140px_-30px_#00C6FF55] day:shadow-[0_40px_120px_-30px_#003C5180]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(800px_240px_at_20%_-10%,#003C51,transparent_70%)] day:bg-[radial-gradient(800px_240px_at_20%_-10%,#E6F4F1,transparent_70%)]" />
            <header className="relative flex items-center gap-5 border-b border-fg/[0.07] px-7 py-5">
              <Ring pct={pct} done={done} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.14em] text-accent">
                  {done ? "Finished" : paused ? "Paused after this step" : "Applying"} · <span className="font-mono normal-case tracking-normal">{changeRequest.key}</span>
                </div>
                <h2 className="mt-1 font-display text-[24px] font-extrabold leading-8">October 2026 CPU → Parker HCM DEV</h2>
                <div className="text-[12.5px] text-muted/70">Run by Safi · started 12:00 AM EDT · elapsed <span className="tabular text-fg">{elapsed}</span> · 3 servers, one at a time</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {!done && <Button icon={Pause} onClick={() => setPaused((p) => !p)}>{paused ? "Resume" : "Pause after this step"}</Button>}
                {!done && <Button icon={Hand} variant="ghost">Take over</Button>}
                <button onClick={onClose} className="ml-1 rounded-lg p-2 text-muted hover:bg-fg/10 hover:text-fg" aria-label="Close"><X className="size-5" /></button>
              </div>
            </header>

            <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
              <ol className="min-h-0 overflow-y-auto px-5 py-4">
                {applySteps.map((s, i) => {
                  const st = i < step ? "done" : i === step && !done ? "running" : "waiting";
                  return (
                    <motion.li key={s.id} layout className={cx("relative flex gap-4 rounded-xl px-3 py-2.5", st === "running" && "bg-accent/[0.07] ring-1 ring-accent/30")}>
                      {i < applySteps.length - 1 && <span className={cx("absolute left-[23px] top-9 h-[calc(100%-18px)] w-px", i < step ? "bg-accent/60" : "bg-fg/10")} />}
                      <span className={cx("relative z-10 mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-full", st === "done" ? "bg-accent text-on-accent" : st === "running" ? "border-2 border-accent bg-well" : "border border-fg/20 bg-well")}>
                        {st === "done" && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}><Check className="size-3.5" strokeWidth={3} /></motion.span>}
                        {st === "running" && <Loader2 className="size-3 animate-spin text-accent" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className={cx("flex items-center gap-2 text-[13.5px] font-medium", st === "waiting" ? "text-muted/70" : "text-fg")}>
                          {s.label}{s.isNew && <Pill tone="cream" className="!h-[18px] !text-[10px]">New</Pill>}
                        </div>
                        <div className={cx("text-[12px]", st === "waiting" ? "text-muted/35" : "text-muted/80")}>{s.detail}</div>
                      </div>
                      <span className="pt-0.5 font-mono text-[11.5px] text-muted/70">{st === "done" ? s.dur : st === "running" ? "…" : ""}</span>
                    </motion.li>
                  );
                })}
              </ol>
              <div className="flex min-h-0 flex-col border-l border-fg/[0.07] bg-[linear-gradient(180deg,#0B89A11a,#003C5100)]">
                <div className="flex items-center gap-2 px-5 py-3 text-[12px] text-muted/70"><TerminalSquare className="size-4 text-accent" />Live output · pkr-conn-01<span className="ml-auto font-mono text-[11px] text-muted/70">signed job 7f3c</span></div>
                <div ref={logRef} data-theme="night" className="mx-5 mb-5 min-h-0 flex-1 overflow-y-auto rounded-xl border border-fg/[0.07] bg-term p-4 font-mono text-[12px] leading-[20px]">
                  {lines.map((l, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className={cx(/verified|AVAILABLE|ok$|Complete|running|Done/.test(l) ? "text-accent" : "text-muted/80")}>
                      <span className="text-muted/70">{l.slice(0, 10)}</span>{l.slice(10)}
                    </motion.div>
                  ))}
                  {!done && <span className="inline-block h-3.5 w-2 animate-pulse bg-accent/80" />}
                </div>
                <AnimatePresence>
                  {done && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} className="mx-5 mb-5 rounded-2xl border border-accent/30 bg-accent/[0.07] p-4">
                      <div className="flex items-center gap-2 font-display text-[16px] font-bold text-fg"><PartyPopper className="size-4.5 text-accent" />HCM DEV is patched and running</div>
                      <div className="mt-1 text-[12.5px] text-muted">WebLogic 14.1.2.0.260930 · JDK 21.0.13 · Tuxedo RP052 · 42 Linux packages. Backups kept 14 days. PSADMIN-872 updated and closed.</div>
                      <div className="mt-2.5 flex items-center gap-1.5 text-[12px] text-accent"><Sparkle className="size-3.5" />Next: same plan for HCM TST. Want me to draft PSADMIN-876?</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Ring({ pct, done }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-16 shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="4" className="text-fg" />
        <motion.circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-accent" strokeLinecap="round" strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 0.6, ease }} style={{ filter: "drop-shadow(0 0 6px #00C6FF)" }} />
      </svg>
      <span className={cx("font-display text-[15px] font-bold tabular", done ? "text-accent" : "text-fg")}>{pct}%</span>
    </div>
  );
}

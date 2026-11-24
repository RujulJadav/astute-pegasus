import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, LogIn, ExternalLink, ArrowUp, Loader2, ShieldCheck } from "lucide-react";
import { consoleAi } from "../../shared/data.js";
import { cx } from "../../shared/ui.jsx";
import { Drawer, Button, Pill } from "../kit.jsx";

// The app's existing Console AI: asks the client's OCI Console AI through your own OCI sign-in,
// via the helper on this computer. Pegasus never sees the session, the questions or the answers.
export default function ConsoleAi({ open, onClose }) {
  const [phase, setPhase] = useState("out");
  const [asked, setAsked] = useState(false);
  const [answered, setAnswered] = useState(false);
  const signIn = () => { setPhase("signing"); setTimeout(() => setPhase("in"), 1400); };
  const ask = () => { setAsked(true); setTimeout(() => setAnswered(true), 1600); };
  return (
    <Drawer open={open} onClose={onClose} width={480} eyebrow="Console AI" title={`${consoleAi.tenancy} · ${consoleAi.region}`}
      footer={phase === "in" ? (
        <div className="flex w-full items-center gap-2 rounded-xl border border-fg/10 bg-fg/[0.04] p-2">
          <input disabled={asked} defaultValue={asked ? "" : consoleAi.q} className="flex-1 bg-transparent px-2 text-[13px] text-fg outline-none" />
          <button onClick={ask} disabled={asked} className="grid size-8 place-items-center rounded-lg bg-accent text-on-accent disabled:bg-fg/10 disabled:text-muted/70"><ArrowUp className="size-4" /></button>
        </div>
      ) : <span className="text-[11.5px] text-muted/80">The helper listens on this computer only (127.0.0.1:8765).</span>}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-fg/[0.08] bg-fg/[0.03] p-3.5 text-[12.5px] leading-[19px] text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" />
          Asks Parker's OCI Console AI through your own OCI sign-in, using the helper on this computer. Your session, questions and answers never reach the Pegasus server.
        </div>
        {phase !== "in" ? (
          <div className="py-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-navy text-cyan ring-1 ring-fg/10"><Bot className="size-6" /></span>
            <p className="mx-auto mt-3 max-w-xs text-[13px] text-muted/75">A console window opens. Sign in there (MFA included); it minimizes by itself and stays signed in.</p>
            <div className="mt-4 flex justify-center gap-2">
              <Button variant="primary" icon={phase === "signing" ? Loader2 : LogIn} onClick={signIn} disabled={phase === "signing"}>{phase === "signing" ? "Waiting for your sign-in…" : "Sign in to OCI"}</Button>
              <Button icon={ExternalLink}>Open OCI Console</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Pill tone="cyan">Signed in · this session lasts as long as OCI keeps it alive</Pill>
            <AnimatePresence>
              {asked && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-fg/[0.08] px-3.5 py-2 text-[13px]">{consoleAi.q}</motion.div>
              )}
              {asked && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  className={cx("max-w-[92%] rounded-2xl rounded-bl-md border border-fg/[0.08] bg-navy/40 px-3.5 py-2.5 day:bg-[linear-gradient(160deg,#FFFFFF,#E6F4F1)] text-[13px] leading-[20px]", !answered && "text-muted/80")}>
                  {answered ? consoleAi.a : <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin text-accent" />Console AI is answering…</span>}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </Drawer>
  );
}

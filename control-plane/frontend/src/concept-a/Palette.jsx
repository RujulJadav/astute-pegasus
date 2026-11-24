import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Search, CornerDownLeft, ArrowRight, Server, Zap } from "lucide-react";
import { cx } from "../shared/ui.jsx";
import { agent, allEnvs as sampleEnvs } from "../shared/data.js";
import { useLive } from "../api/live.jsx";
import { useShell, NAV } from "./App.jsx";
import { Sparkle, Kbd, StateDot } from "./kit.jsx";

export default function Palette({ open, onClose }) {
  const { go, askAgent, openConsoleAi } = useShell();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef(null);

  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);

  const { live, allEnvs: liveEnvs } = useLive();
  const allEnvs = live ? liveEnvs : sampleEnvs;
  const groups = useMemo(() => {
    const m = (s) => s.toLowerCase().includes(q.toLowerCase());
    const ask = q.trim() ? [{ id: "ask", label: `Ask Pegasus: “${q.trim()}”`, icon: "agent", run: () => askAgent(q.trim()) }] : [];
    return [
      { name: "Ask the agent", items: live ? [] : [...ask, ...agent.suggestions.filter(m).map((s) => ({ id: s, label: s, icon: "agent", run: () => askAgent(s) }))] },
      { name: "Go to", items: NAV.filter((n) => m(n.label)).map((n) => ({ id: n.id, label: n.label, Icon: n.icon, run: () => go(n.id) })) },
      { name: "Environments", items: allEnvs.filter((e) => m(`${e.client} ${e.name} ${e.hosts.join(" ")}`)).slice(0, 6).map((e) => ({ id: e.id, label: `${e.client} · ${e.name}`, state: e.state, hint: live ? e.tier : e.behind ? `${e.behind} behind` : "Up to date", run: () => go(`fleet/${e.clientId}/${e.id}`) })) },
      { name: "Actions", items: [
        { id: "a1", label: "Check status everywhere", Icon: Zap, run: () => go("fleet") },
        { id: "a2", label: "Request approval for a patch", Icon: Zap, run: () => go("patching") },
        { id: "a3", label: "Add a person", Icon: Zap, run: () => go("people") },
        { id: "a4", label: "Give someone SSH access", Icon: Zap, run: () => go("access") },
        ...(live ? [] : [{ id: "a5", label: "Console AI · Parker (parkeroci)", Icon: Zap, run: () => openConsoleAi() }]),
        { id: "a6", label: "Add a connector", Icon: Zap, run: () => go("connectors") },
        { id: "a7", label: "Change approval settings (Jira)", Icon: Zap, run: () => go(live ? "integrations" : "settings") },
        ...(live ? [] : [{ id: "a8", label: "Sign-in screens", Icon: Zap, run: () => go("signin") }]),
      ].filter((a) => m(a.label)) },
    ].filter((g) => g.items.length);
  }, [q, live, allEnvs]);
  const flat = groups.flatMap((g) => g.items);

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(flat.length - 1, i + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter" && flat[idx]) { flat[idx].run(); onClose(); }
    if (e.key === "Escape") onClose();
  };

  let n = -1;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[60] flex items-start justify-center bg-scrim pt-[12vh] backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="w-[640px] overflow-hidden rounded-2xl border border-fg/10 bg-raised shadow-[0_40px_120px_-20px_#003C51,0_0_0_1px_#00C6FF1f,0_0_80px_-30px_#00C6FF] day:shadow-[0_40px_100px_-24px_#003C5180,0_0_0_1px_#003C511a,0_0_80px_-30px_#00C6FF]"
          >
            <div className="flex items-center gap-3 border-b border-fg/[0.07] px-4">
              <Search className="size-4 text-accent" />
              <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} onKeyDown={onKey}
                placeholder="Ask Pegasus, or jump to a screen, environment or action…"
                className="h-14 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-muted/70" />
              <Kbd>esc</Kbd>
            </div>
            <div className="max-h-[56vh] overflow-y-auto p-2">
              {groups.map((g) => (
                <div key={g.name} className="mb-1">
                  <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/70">{g.name}</div>
                  {g.items.map((it) => {
                    n += 1;
                    const on = n === idx;
                    const my = n;
                    return (
                      <button key={it.id} onMouseEnter={() => setIdx(my)} onClick={() => { it.run(); onClose(); }}
                        className={cx("relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px]", on ? "text-fg" : "text-muted")}>
                        {on && <motion.span layoutId="pal-hl" className="absolute inset-0 rounded-lg bg-fg/[0.07]" transition={{ type: "spring", stiffness: 600, damping: 40 }} />}
                        <span className="relative grid size-6 place-items-center">
                          {it.icon === "agent" ? <Sparkle className="size-4 text-agent" /> : it.state ? <StateDot state={it.state} /> : it.Icon ? <it.Icon className="size-4" /> : <Server className="size-4" />}
                        </span>
                        <span className="relative flex-1 truncate">{it.label}</span>
                        {it.hint && <span className="relative text-[11.5px] text-muted/80">{it.hint}</span>}
                        {on && <span className="relative">{it.icon === "agent" ? <CornerDownLeft className="size-3.5 text-accent" /> : <ArrowRight className="size-3.5 text-muted" />}</span>}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 border-t border-fg/[0.07] px-4 py-2.5 text-[11px] text-muted/70">
              <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
              <span className="ml-auto flex items-center gap-1.5"><Sparkle className="size-3 text-agent" /> Questions go to the Pegasus Agent</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowUp, Loader2, Check, ChevronDown, Wrench, CornerDownRight, ShieldAlert, Eye, PenLine } from "lucide-react";
import { cx, useStream } from "../shared/ui.jsx";
import { agent, fleetStats } from "../shared/data.js";
import { Avatar, Sparkle, Pill, ease } from "./kit.jsx";

const TOKENS = /(PSADMIN-\d+|pkh\w+|12:00–7:00 AM EDT|CVE-\d{4}-\d+|CVSS \d\.\d)/g;
export function Rich({ text }) {
  return text.split(TOKENS).map((part, i) =>
    i % 2 ? (
      <span key={i} className={cx("rounded px-1 py-px font-mono text-[11.5px]", /CVSS|CVE/.test(part) ? "bg-orange/15 text-risk day:bg-orange/20" : "bg-accent/10 text-accent day:bg-mint day:text-navy")}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export const TIER = {
  read: { label: "Runs on its own", icon: Eye, tone: "neutral", cta: "Okay, keep watching", done: "Watching. I'll report back here." },
  write: { label: "Needs your approval", icon: PenLine, tone: "cyan", cta: "Approve and raise", done: "Approved. Changes raised; you'll see them under Needs you." },
  destructive: { label: "Two people + change ticket", icon: ShieldAlert, tone: "orange", cta: "Approve, ask a 2nd person", done: "Your approval is recorded. Sent to Gopinath S. for the second approval (PSADMIN-875)." },
};

export default function AgentPanel({ turns, ask, decide, onClose }) {
  const [level, setLevel] = useState(2);
  const [levelOpen, setLevelOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const scroller = useRef(null);
  const [brief, briefDone] = useStream(agent.briefing.join("\n\n"), { speed: 22 });

  // Follow the conversation as it grows (tool results, streamed text, plan cards).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const obs = new MutationObserver(() => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, []);

  const submit = (q) => { if (!q.trim()) return; ask(q.trim()); setDraft(""); };

  return (
    <aside className="relative flex h-full flex-col bg-[linear-gradient(180deg,#003C51b3,transparent_60%)] day:bg-[linear-gradient(180deg,#E6F4F1,#FFFFFF_38%)]" aria-label="Pegasus Agent">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(380px_180px_at_60%_-10%,#F2E8C41f,transparent_70%)] day:bg-[radial-gradient(360px_200px_at_85%_-15%,#F2E8C4,transparent_70%)]" />
      <header className="relative flex h-16 shrink-0 items-center gap-3 border-b border-fg/[0.07] px-5">
        <Avatar kind="agent" size={30} spin={turns.some((t) => !t.answering)} />
        <div className="min-w-0">
          <div className="whitespace-nowrap font-display text-[15px] font-bold leading-5">{agent.name}</div>
          <div className="truncate text-[11.5px] text-muted/70">{fleetStats.clients} clients · {fleetStats.envs} environments</div>
        </div>
        <div className="relative ml-auto">
          <button onClick={() => setLevelOpen((o) => !o)} className="flex h-7 items-center gap-1 whitespace-nowrap rounded-full border border-accent/30 bg-accent/10 pl-2.5 pr-1.5 text-[11.5px] font-medium text-accent day:bg-white day:text-navy day:border-teal/50">
            {agent.autonomy[level].name}<ChevronDown className="size-3" />
          </button>
          <AnimatePresence>
            {levelOpen && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
                className="absolute right-0 top-9 z-10 w-72 rounded-xl border border-fg/10 bg-raised p-1.5 shadow-pop">
                <div className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">How much the agent may do</div>
                {agent.autonomy.map((a) => (
                  <button key={a.level} onClick={() => { setLevel(a.level); setLevelOpen(false); }} className="flex w-full gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-fg/[0.06]">
                    <span className="mt-0.5 flex gap-0.5">{[0, 1, 2, 3].map((i) => <span key={i} className={cx("h-3.5 w-1 rounded-full", i <= a.level ? "bg-accent" : "bg-fg/15")} />)}</span>
                    <span className="flex-1">
                      <span className="block text-[12.5px] font-medium">{a.name}</span>
                      <span className="block text-[11.5px] leading-4 text-muted/70">{a.desc}</span>
                    </span>
                    {level === a.level && <Check className="size-3.5 text-accent" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-fg/10 hover:text-fg" aria-label="Close agent"><X className="size-4" /></button>
      </header>

      <div ref={scroller} className="relative flex-1 space-y-5 overflow-y-auto px-5 py-5 [scrollbar-width:thin]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}
          className="rounded-2xl border border-agent/20 bg-[linear-gradient(160deg,#F2E8C41a,#E6F4F10d_50%,#003C5100)] p-4 shadow-[inset_0_1px_0_#FFFFFF14] day:border-transparent day:[background:linear-gradient(160deg,#FFFFFF,#E6F4F1_55%,#F2E8C4)_padding-box,conic-gradient(from_200deg,#0B89A1,#00C6FF,#E6F4F1,#F2E8C4,#FDD8B9,#FBB273,#0B89A1)_border-box] day:border-[1.5px] day:shadow-[0_14px_34px_-20px_#0B89A1]">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-agent">
            <Sparkle className="size-3.5" /> Evening briefing <span className="font-normal normal-case tracking-normal text-muted/80">· 7:12 PM EDT</span>
          </div>
          <div className="space-y-2.5 text-[13.5px] leading-[21px] text-fg/90">
            {brief.split("\n\n").map((p, i) => <p key={i}><Rich text={p} /></p>)}
            {!briefDone && <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-cream" />}
          </div>
        </motion.div>

        {turns.length === 0 && briefDone && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">Try asking</div>
            <div className="space-y-1.5">
              {agent.suggestions.map((s, i) => (
                <motion.button key={s} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 * i, ease }}
                  onClick={() => ask(s)}
                  className="group flex w-full items-center gap-2 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2.5 text-left text-[13px] text-fg/90 transition hover:border-accent/30 hover:bg-accent/[0.06]">
                  <CornerDownRight className="size-3.5 text-muted/70 group-hover:text-accent" />{s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {turns.map((t) => <Turn key={t.id} turn={t} decide={decide} />)}
      </div>

      <div className="relative shrink-0 border-t border-fg/[0.07] p-4">
        {turns.length > 0 && (
          <div className="mb-2.5 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {agent.suggestions.filter((s) => !turns.some((t) => t.q === s)).map((s) => (
              <button key={s} onClick={() => ask(s)} className="shrink-0 rounded-full border border-fg/10 bg-fg/[0.04] px-2.5 py-1 text-[11.5px] text-muted hover:border-accent/30 hover:text-fg">{s}</button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); submit(draft); }}
          className="flex items-end gap-2 rounded-xl border border-fg/10 bg-fg/[0.04] p-2 transition focus-within:border-accent/40 focus-within:shadow-[0_0_0_3px_#00C6FF14]">
          <textarea
            value={draft} onChange={(e) => setDraft(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(draft); } }}
            placeholder="Ask about patches, alarms, schedules…"
            className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[13px] text-fg outline-none placeholder:text-muted/70"
          />
          <button type="submit" disabled={!draft.trim()} className="grid size-9 place-items-center rounded-lg bg-accent text-on-accent transition disabled:bg-fg/10 disabled:text-muted/70" aria-label="Send">
            <ArrowUp className="size-4" strokeWidth={2.4} />
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted/70">Reads run on their own. Changes wait for a person to approve the exact plan.</p>
      </div>
    </aside>
  );
}

function Turn({ turn, decide }) {
  const { script, toolsDone, answering, decided } = turn;
  const [answer, done] = useStream(script.answer, { start: answering, speed: 16 });
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }} className="space-y-3">
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-fg/[0.08] px-3.5 py-2 text-[13px] text-fg day:bg-navy day:text-white">{turn.q}</div>
      </div>
      <div className="flex gap-2.5">
        <Avatar kind="agent" size={24} />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="overflow-hidden rounded-xl border border-fg/[0.08] bg-well">
            {script.tools.map((tool, i) => {
              const state = i < toolsDone ? "done" : i === toolsDone ? "running" : "waiting";
              return (
                <div key={tool.name} className={cx("flex gap-2.5 px-3 py-2 text-[12px]", i > 0 && "border-t border-fg/[0.06]")}>
                  <span className="mt-0.5 shrink-0">{state === "done" ? <Check className="size-3.5 text-accent" strokeWidth={2.5} /> : state === "running" ? <Loader2 className="size-3.5 animate-spin text-accent" /> : <Wrench className="size-3.5 text-muted/30" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className={cx("font-mono", state === "waiting" ? "text-muted/70" : "text-fg")}>{tool.name}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10.5px] text-muted/70">{state === "done" ? `${tool.ms} ms` : state === "running" ? "running" : ""}</span>
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted/70">{tool.args}{state === "done" && <span className="text-accent/80">{"  →  "}{tool.out}</span>}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {answering && (
            <div className="text-[13.5px] leading-[21px] text-fg/90">
              <Rich text={answer} />
              {!done && <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-accent" />}
            </div>
          )}

          {done && script.table && (
            <motion.table initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full overflow-hidden rounded-xl border border-fg/[0.08] text-[12px]">
              <thead className="bg-fg/[0.04] text-left text-muted/70">
                <tr><th className="px-3 py-1.5 font-medium">Client</th><th className="px-3 py-1.5 font-medium">Behind</th><th className="px-3 py-1.5 text-right font-medium">Top CVSS</th></tr>
              </thead>
              <tbody>
                {script.table.map((r) => (
                  <tr key={r[0]} className="border-t border-fg/[0.06]">
                    <td className="px-3 py-1.5">{r[0]}</td><td className="px-3 py-1.5 tabular text-muted">{r[1]}</td>
                    <td className={cx("px-3 py-1.5 text-right font-mono tabular", parseFloat(r[2]) >= 9 ? "text-risk" : "text-warn")}>{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </motion.table>
          )}

          {done && script.proposal && <PlanCard proposal={script.proposal} decided={decided} onDecide={(d) => decide(turn.id, d)} />}
        </div>
      </div>
    </motion.div>
  );
}

export function PlanCard({ proposal, decided, onDecide }) {
  const tier = TIER[proposal.tier];
  const border = proposal.tier === "destructive" ? "border-orange/35" : proposal.tier === "write" ? "border-accent/30" : "border-fg/10";
  return (
    <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.45, ease }}
      className={cx("overflow-hidden rounded-xl border bg-fg/[0.03]", border)}>
      <div className="flex items-center gap-2 border-b border-fg/[0.06] px-3.5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">Proposed plan</span>
        <Pill tone={tier.tone} icon={tier.icon} className="ml-auto">{tier.label}</Pill>
      </div>
      <div className="px-3.5 py-3">
        <div className="text-[13.5px] font-medium text-fg">{proposal.title}</div>
        <ol className="mt-2 space-y-1.5">
          {proposal.steps.map((s, i) => (
            <li key={s} className="flex gap-2.5 text-[12.5px] text-muted">
              <span className="grid size-[18px] shrink-0 place-items-center rounded-full border border-fg/15 font-mono text-[10px] text-muted/80">{i + 1}</span>{s}
            </li>
          ))}
        </ol>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {decided ? (
          <motion.div key="d" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className={cx("flex items-start gap-2 border-t px-3.5 py-2.5 text-[12.5px]", decided === "dismiss" ? "border-fg/[0.06] text-muted/70" : "border-accent/20 bg-accent/[0.06] text-accent")}>
            {decided === "dismiss" ? "Dismissed. Nothing was changed." : <><Check className="mt-0.5 size-3.5 shrink-0" />{tier.done}</>}
          </motion.div>
        ) : (
          <motion.div key="a" exit={{ opacity: 0 }} className="flex items-center gap-1 whitespace-nowrap border-t border-fg/[0.06] px-3 py-2.5">
            <button onClick={() => onDecide("approve")} className={cx("h-8 rounded-lg px-3 text-[12.5px] font-medium", proposal.tier === "destructive" ? "bg-orange text-navy" : proposal.tier === "write" ? "bg-accent text-on-accent" : "bg-fg/10 text-fg")}>{tier.cta}</button>
            <button className="h-8 rounded-lg px-2 text-[12.5px] text-muted hover:bg-fg/[0.06] hover:text-fg">Edit</button>
            <button onClick={() => onDecide("dismiss")} className="ml-auto h-8 rounded-lg px-2 text-[12.5px] text-muted/80 hover:text-fg">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

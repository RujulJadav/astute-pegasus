import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollText, Download, Search } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { audit } from "../../shared/data.js";
import { Panel, Button, Pill, PageHeader, Avatar, Segmented, inputCls, Sparkle, ease } from "../kit.jsx";

const TAG_TONE = { Change: "cyan", Agent: "cream", People: "neutral", Access: "apricot", "Sign-in": "neutral", Schedule: "neutral", Connector: "neutral" };

export default function Audit() {
  const [who, setWho] = useState("all");
  const [q, setQ] = useState("");
  const rows = audit.filter((a) => (who === "all" || a.kind === who) && (!q || `${a.actor} ${a.what} ${a.detail}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="@container">
      <PageHeader eyebrow={<><ScrollText className="size-3.5" />Audit log</>} title="Who did what, and when"
        sub="People, the agent and the system, in one record. Kept for a year and exportable for audits."
        actions={<Button icon={Download}>Export CSV</Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented layoutId="audit-who" value={who} onChange={setWho} options={[{ value: "all", label: "Everyone" }, { value: "human", label: "People" }, { value: "agent", label: "Agent" }, { value: "system", label: "System" }]} />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/70" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the log" className={cx(inputCls, "h-9 w-64 pl-8 text-[12.5px]")} />
        </div>
        <span className="ml-auto text-[12px] text-muted/80">Today · Thu, Oct 29 · times in EDT</span>
      </div>

      <Panel className="px-2 py-2">
        <ol className="relative">
          <span className="absolute bottom-6 left-[92px] top-6 w-px bg-fg/[0.07]" />
          <AnimatePresence initial={false}>
            {rows.map((a, i) => (
              <motion.li key={a.t + a.what} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03, ease }}
                className={cx("relative flex items-start gap-4 rounded-xl px-3 py-3", a.kind === "agent" && "bg-[linear-gradient(90deg,#F2E8C412,transparent_60%)] day:bg-[linear-gradient(90deg,#E6F4F1,#F2E8C459_45%,transparent_80%)]")}>
                <span className="w-16 shrink-0 pt-1 text-right font-mono text-[11.5px] text-muted/80">{a.t}</span>
                <span className="relative z-10"><Avatar kind={a.kind} initials={a.kind === "system" ? (a.actor === "Schedule" ? "⏱" : "⚙") : a.actor.split(" ").map((w) => w[0]).join("").slice(0, 2)} size={28} /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] text-fg"><span className={cx("font-medium", a.kind === "agent" && "text-agent")}>{a.actor}</span> <span className="text-fg/85">{a.what}</span></div>
                  <div className="text-[12px] text-muted/80">{a.detail}</div>
                </div>
                <Pill tone={TAG_TONE[a.tag]} icon={a.kind === "agent" ? () => <Sparkle className="size-3" /> : undefined}>{a.tag}</Pill>
              </motion.li>
            ))}
          </AnimatePresence>
          {!rows.length && <li className="px-4 py-10 text-center text-[13px] text-muted/80">Nothing matches.</li>}
        </ol>
      </Panel>
    </div>
  );
}

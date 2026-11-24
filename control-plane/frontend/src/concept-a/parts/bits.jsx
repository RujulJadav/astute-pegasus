// Small building blocks shared by the Mission Control instance panel and the Fleet page (5 Nov review).
import { Check } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { Pill } from "../kit.jsx";

export function Stat({ label, value, sub, tone, mono, small }) {
  const t = tone === "risk" ? "text-risk day:text-navy" : tone === "warn" ? "text-warn day:text-navy" : tone === "ok" ? "text-accent day:text-teal" : "text-fg";
  return (
    <div className={cx("rounded-xl border border-fg/[0.08] bg-well px-3.5 py-3 day:bg-white", tone === "risk" && "day:border-apricot day:bg-[linear-gradient(160deg,#FFFFFF,#FDD8B9)]")}>
      <div className="text-[11px] text-muted/80">{label}</div>
      <div className={cx("mt-1 font-display font-bold leading-tight", small ? "text-[13px]" : "text-[18px]", mono && "font-mono", t)}>{value}</div>
      {sub && <div className="text-[11px] text-muted/70">{sub}</div>}
    </div>
  );
}
export function Section({ icon: Icon, title, count, children }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80"><Icon className="size-3.5" />{title}{count != null && <span className="font-normal normal-case tracking-normal text-muted/60">· {count}</span>}</div>
      {children}
    </div>
  );
}
export function AlertRow({ a }) {
  return (
    <div className="flex items-center gap-2 py-1 text-[12.5px] text-fg">
      <span className={cx("size-2 shrink-0 rounded-full", a.sev === "critical" ? "bg-orange" : a.sev === "warning" ? "bg-apricot" : "bg-silver")} />
      <span className="min-w-0 flex-1 truncate">{a.text}</span>
      <Pill tone={a.sev === "critical" ? "orange" : a.sev === "warning" ? "apricot" : "neutral"}>{a.sev}</Pill>
    </div>
  );
}
export const TICKET_TONE = { approved: "teal", pending: "apricot", applied: "neutral", draft: "neutral" };
export const TICKET_LABEL = { approved: "Approved", pending: "Waiting for approval", applied: "Applied", draft: "Draft" };
export function JiraRow({ j }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="font-mono font-semibold text-accent">{j.key}</span>
      <span className="min-w-0 flex-1 truncate text-fg">{j.title}</span>
      <Pill tone={TICKET_TONE[j.status]} icon={j.status === "approved" ? Check : undefined}>{TICKET_LABEL[j.status]}</Pill>
    </div>
  );
}
export function Empty({ children }) {
  return <div className="py-1 text-[12.5px] text-muted/70">{children}</div>;
}


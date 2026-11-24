// Concept A primitives: dark, glassy, dense. Brand colours only (see shared/brand.css).
import { useState, useId, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowUpRight } from "lucide-react";
import { cx } from "../shared/ui.jsx";
import { severity } from "../shared/data.js";

export const ease = [0.16, 1, 0.3, 1];

// Overpass sets "·" with uneven side bearings, so headings draw the separator in Roboto.
export const dots = (t) =>
  typeof t === "string" && t.includes(" · ")
    ? t.split(" · ").flatMap((p, i) => (i ? [<span key={i} className="mx-[0.3em] font-sans font-normal opacity-45">·</span>, p] : [p]))
    : t;

export function Panel({ className = "", children, as: As = "section", glow = false, ...rest }) {
  return (
    <As
      className={cx(
        "relative rounded-2xl border border-line bg-surface shadow-card",
        className,
      )}
      {...rest}
    >
      {children}
    </As>
  );
}

export function PanelHead({ icon: Icon, title, meta, action, className = "" }) {
  return (
    <div className={cx("flex items-center gap-3 px-6 pt-5 pb-3.5", className)}>
      {Icon && <Icon className="size-4 text-accent" strokeWidth={2} />}
      <h2 className="whitespace-nowrap font-display text-[15px] font-bold tracking-[-0.01em] text-fg">{dots(title)}</h2>
      {meta && <span className="min-w-0 truncate text-[12px] text-muted/70">{meta}</span>}
      {action && <div className="ml-auto flex items-center gap-2">{action}</div>}
    </div>
  );
}

const BTN = {
  primary: "bg-accent text-on-accent font-semibold hover:bg-[#00C6FFe6] shadow-[0_8px_24px_-10px_#00C6FF] day:hover:bg-navy day:shadow-[0_8px_20px_-10px_#0B89A1]",
  secondary: "bg-transparent text-fg border border-[#E6F4F126] hover:border-[#E6F4F14d] hover:bg-fg/[0.04] day:bg-white day:text-teal day:border-teal/70 day:hover:border-teal day:hover:bg-mint",
  ghost: "text-muted hover:text-fg hover:bg-fg/[0.06]",
  danger: "text-risk border border-orange/40 hover:bg-orange/10 day:bg-white day:border-orange day:hover:bg-orange/15",
  cyan: "bg-accent text-on-accent hover:bg-[#00C6FFe6] shadow-[0_0_28px_-6px_#00C6FF] day:bg-navy day:text-white day:hover:bg-teal day:shadow-[0_10px_24px_-12px_#003C51]",
};
export function Button({ variant = "secondary", size = "md", icon: Icon, iconRight: IconR, className = "", children, ...rest }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-40 disabled:shadow-none",
        size === "sm" ? "h-8 px-3 text-[12.5px]" : size === "lg" ? "h-11 px-5 text-[14px]" : "h-9 px-3.5 text-[13px]",
        BTN[variant], className,
      )}
      {...rest}
    >
      {Icon && <Icon className={size === "sm" ? "size-3.5" : "size-4"} strokeWidth={2} />}
      {children}
      {IconR && <IconR className="size-3.5" strokeWidth={2} />}
    </motion.button>
  );
}

const PILL = {
  neutral: "bg-fg/[0.06] text-muted border-fg/10",
  teal: "bg-teal/15 text-accent border-teal/40 day:bg-teal/10 day:text-navy day:border-teal/45",
  cyan: "bg-accent/10 text-accent border-accent/30 day:bg-mint day:text-navy day:border-teal/45",
  orange: "bg-orange/15 text-risk border-orange/40 day:bg-orange/20 day:border-orange/70",
  apricot: "bg-apricot/10 text-warn border-apricot/30 day:bg-peach day:border-apricot",
  cream: "bg-cream/10 text-agent border-agent/25 day:bg-cream day:text-navy day:border-apricot/50",
  solid: "bg-white text-navy border-white day:bg-navy day:text-white day:border-navy",
};
export function Pill({ tone = "neutral", className = "", children, icon: Icon }) {
  return (
    <span className={cx("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-[11.5px] font-medium", PILL[tone], className)}>
      {Icon && <Icon className="size-3" strokeWidth={2.2} />}
      {children}
    </span>
  );
}

export function TierTag({ tier }) {
  return tier === "PRD"
    ? <Pill tone="orange" className="font-mono !text-[10.5px] tracking-wider">PRD</Pill>
    : <Pill className="font-mono !text-[10.5px] tracking-wider">{tier}</Pill>;
}

export function StateDot({ state, size = 8, className = "" }) {
  const s = { width: size, height: size };
  if (state === "running")
    return (
      <span className={cx("relative inline-flex", className)} style={s}>
        <span className="absolute inset-0 animate-ping rounded-full bg-accent/40 [animation-duration:2.4s]" />
        <span className="relative inline-flex rounded-full bg-accent shadow-[0_0_10px_#00C6FF]" style={s} />
      </span>
    );
  if (state === "unreachable") return <span className={cx("inline-flex rounded-full border-[1.5px] border-orange", className)} style={s} />;
  if (state === "patching") return <span className={cx("inline-flex rounded-full border-2 border-accent", className)} style={s} />;
  if (state === "partial") return <span className={cx("inline-flex rounded-full border-[1.5px] border-accent bg-[linear-gradient(90deg,#00C6FF_50%,transparent_50%)]", className)} style={s} />;
  if (state === "stopped") return <span className={cx("inline-flex rounded-full border-[1.5px] border-graphite", className)} style={s} />;
  return <span className={cx("inline-flex rounded-full border-[1.5px] border-dashed border-muted/60", className)} style={s} />;
}
export const STATE_LABEL = { running: "Running", stopped: "Stopped", unknown: "Unknown", unreachable: "Unreachable", patching: "Patching", partial: "Partly running" };

export const SEV = {
  critical: { text: "text-risk", bg: "bg-orange", hex: "#FA9137", label: "Critical" },
  high: { text: "text-warn", bg: "bg-apricot", hex: "#FBB273", label: "High" },
  medium: { text: "text-body", bg: "bg-teal", hex: "#0B89A1", label: "Medium" },
  low: { text: "text-muted", bg: "bg-silver", hex: "#BCBDC0", label: "Low" },
  none: { text: "text-muted/75", bg: "bg-graphite", hex: "#6D6E71", label: "None" },
};

// CVSS score as a ring: arc length = score/10, colour = severity.
export function ScoreDial({ score, size = 44, stroke = 3.5 }) {
  const sev = SEV[severity(score)];
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={stroke} className="text-fg" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={sev.hex} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 10) }}
          transition={{ duration: 1.1, ease, delay: 0.15 }}
          style={{ filter: score >= 9 ? "drop-shadow(0 0 4px #FA9137)" : undefined }}
        />
      </svg>
      <span className={cx("absolute font-display text-[13px] font-bold tabular", sev.text)}>{score ? score.toFixed(1) : "–"}</span>
    </div>
  );
}

export function Segmented({ options, value, onChange, size = "md", layoutId }) {
  const fallback = useId();
  return (
    <div className="inline-flex shrink-0 whitespace-nowrap rounded-lg border border-fg/10 bg-well p-0.5">
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const label = typeof o === "string" ? o : o.label;
        const on = v === value;
        return (
          <button key={v} onClick={() => onChange(v)} className={cx("relative rounded-md px-3 font-medium transition-colors", size === "sm" ? "h-7 text-[12px]" : "h-8 text-[12.5px]", on ? "text-fg" : "text-muted/80 hover:text-fg")}>
            {on && <motion.span layoutId={layoutId || fallback} className="absolute inset-0 rounded-md bg-fg/10 shadow-[inset_0_1px_0_#FFFFFF1a] day:bg-white day:shadow-[0_1px_3px_#003C5133]" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Toggle({ on, onChange, label, hint }) {
  return (
    <button type="button" onClick={() => onChange(!on)} className="flex w-full items-start gap-3 text-left">
      <span className={cx("mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors", on ? "bg-teal" : "bg-fg/15")}>
        <motion.span layout className="size-4 rounded-full bg-white shadow" style={{ marginLeft: on ? 16 : 0 }} transition={{ type: "spring", stiffness: 600, damping: 35 }} />
      </span>
      <span>
        <span className="block text-[13px] font-medium text-fg">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] leading-[18px] text-muted/75">{hint}</span>}
      </span>
    </button>
  );
}

export function Drawer({ open, onClose, title, eyebrow, width = 560, children, footer }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-40 bg-scrim backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog" aria-label={title}
            className="fixed inset-y-3 right-3 z-50 flex flex-col overflow-hidden rounded-2xl border border-fg/10 bg-raised shadow-[0_30px_80px_-20px_#003C51,0_0_0_1px_#00C6FF14] backdrop-blur-xl day:shadow-[0_28px_80px_-20px_#003C5180,0_0_0_1px_#003C511a]"
            style={{ width }}
            initial={{ x: width + 40, opacity: 0.6 }} animate={{ x: 0, opacity: 1 }} exit={{ x: width + 40, opacity: 0.6 }}
            transition={{ type: "spring", stiffness: 320, damping: 36 }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(500px_160px_at_30%_0%,#003C51,transparent_75%)] day:bg-[radial-gradient(520px_170px_at_25%_0%,#E6F4F1,transparent_75%)]" />
            <header className="relative flex items-start gap-3 border-b border-fg/[0.07] px-6 pb-4 pt-5">
              <div>
                {eyebrow && <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent/80 day:text-teal">{eyebrow}</div>}
                <h2 className="font-display text-[20px] font-bold leading-7 text-fg">{dots(title)}</h2>
              </div>
              <button onClick={onClose} className="ml-auto rounded-lg p-1.5 text-muted hover:bg-fg/10 hover:text-fg" aria-label="Close"><X className="size-4" /></button>
            </header>
            <div className="relative flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && <footer className="relative flex items-center gap-2 border-t border-line bg-fg/[0.03] px-6 py-4">{footer}</footer>}
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function Tooltip({ content, children, side = "top", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos(side === "right" ? { x: r.right + 10, y: r.top + r.height / 2 } : side === "bottom" ? { x: r.left + r.width / 2, y: r.bottom + 8 } : { x: r.left + r.width / 2, y: r.top - 8 });
  }, [open]);
  return (
    <span ref={ref} className={cx("inline-flex", className)} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      {children}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.14 }}
              data-theme="night" className="pointer-events-none fixed z-[70] max-w-xs rounded-lg border border-fg/10 bg-raised px-2.5 py-1.5 text-[12px] leading-[17px] text-fg shadow-[0_12px_30px_-8px_#003C51]"
              style={{
                left: pos.x, top: pos.y,
                translate: side === "right" ? "0 -50%" : side === "bottom" ? "-50% 0" : "-50% -100%",
              }}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </span>
  );
}

export function Kbd({ children, className = "" }) {
  return <kbd className={cx("inline-flex h-5 min-w-5 items-center justify-center rounded border border-fg/15 bg-fg/[0.06] px-1 font-mono text-[10.5px] text-muted", className)}>{children}</kbd>;
}

export function Avatar({ initials, kind = "human", size = 28, spin = false }) {
  if (kind === "agent")
    return (
      <span className={cx("grid shrink-0 place-items-center rounded-full bg-[conic-gradient(from_180deg,#F2E8C4,#E6F4F1,#0B89A1,#F2E8C4)] p-[1.5px] day:bg-aurora", spin && "day:animate-aurora")} style={{ width: size, height: size }}>
        <span className="grid size-full place-items-center rounded-full bg-raised text-agent day:bg-white"><Sparkle className="size-[55%]" /></span>
      </span>
    );
  if (kind === "system")
    return <span className="grid shrink-0 place-items-center rounded-full border border-fg/10 bg-fg/[0.04] font-mono text-[10px] text-muted" style={{ width: size, height: size }}>{initials || "sys"}</span>;
  return <span className="grid shrink-0 place-items-center rounded-full bg-teal/40 font-display text-[11px] font-bold text-fg ring-1 ring-teal/70 day:bg-[linear-gradient(135deg,#0B89A1,#003C51)] day:text-white day:ring-white" style={{ width: size, height: size }}>{initials}</span>;
}

// Four-point sparkle used for anything the agent did or suggests.
export function Sparkle({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={{ fill: "var(--sparkle-fill)" }} aria-hidden="true">
      <path d="M12 2.5c.5 4.6 2.9 7 7.5 7.5v1c-4.6.5-7 2.9-7.5 7.5h-1c-.5-4.6-2.9-7-7.5-7.5v-1c4.6-.5 7-2.9 7.5-7.5h1z" />
      <path d="M19 15.5c.2 1.8 1.2 2.8 3 3v.6c-1.8.2-2.8 1.2-3 3h-.6c-.2-1.8-1.2-2.8-3-3v-.6c1.8-.2 2.8-1.2 3-3h.6z" opacity=".7" />
    </svg>
  );
}

export function ExtLink({ children, href = "#" }) {
  return (
    <a href={href} onClick={(e) => href === "#" && e.preventDefault()} className="inline-flex items-center gap-0.5 text-[12px] text-accent/90 hover:text-accent">
      {children}<ArrowUpRight className="size-3" />
    </a>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1.5 block text-[12px] font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] leading-4 text-muted/80">{hint}</span>}
    </label>
  );
}
export const inputCls = "h-10 w-full rounded-lg border border-fg/10 bg-fg/[0.04] px-3 text-[13.5px] text-fg placeholder:text-muted/70 outline-none transition focus:border-accent/60 focus:bg-fg/[0.06] focus:shadow-[0_0_0_3px_#00C6FF1f] day:bg-white day:border-fg/15 day:focus:bg-white day:focus:border-teal day:focus:shadow-[0_0_0_3px_#0B89A126]";

export function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <div className="mb-8 flex items-start gap-6">
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="mb-2 flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-accent/80 day:text-teal">{eyebrow}</div>}
        <h1 className="font-display text-[34px] font-extrabold leading-[40px] tracking-[-0.02em] text-fg">{dots(title)}</h1>
        {sub && <p className="mt-1.5 max-w-3xl text-[14px] leading-[22px] text-muted/80">{sub}</p>}
      </div>
      {actions && <div className="mt-6 flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
    </div>
  );
}

export const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } },
};

// Centred confirmation, like the app's confirm dialog: optional "type the name" for production.
export function Confirm({ open, onClose, onConfirm, title, children, typeToConfirm, cta = "Continue", danger }) {
  const [typed, setTyped] = useState("");
  const ok = !typeToConfirm || typed.trim() === typeToConfirm;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[65] grid place-items-center bg-scrim p-6 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="w-full max-w-[520px] rounded-2xl border border-fg/10 bg-raised p-6 text-fg shadow-[0_40px_100px_-20px_#003C51,0_0_0_1px_#00C6FF14] day:shadow-[0_30px_80px_-20px_#003C5180]">
            <h2 className="font-display text-[19px] font-bold">{dots(title)}</h2>
            <div className="mt-2 text-[13px] leading-[20px] text-muted">{children}</div>
            {typeToConfirm && (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-[12px] text-muted">Type <b className="font-mono text-risk">{typeToConfirm}</b> to confirm</span>
                <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className={inputCls} />
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setTyped(""); onClose(); }}>Cancel</Button>
              <Button variant={danger ? "danger" : "primary"} disabled={!ok} onClick={() => { setTyped(""); onConfirm(); }}>{cta}</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

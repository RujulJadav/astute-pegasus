// Small pieces shared by the live screens.
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Loader2 } from "lucide-react";
import { cx } from "../shared/ui.jsx";
import { PageHeader } from "./kit.jsx";
import { useShell } from "./App.jsx";
import { useLive } from "../api/live.jsx";
import { get } from "../api/client.js";

// The customer picked in the top bar (or the first one), for per-customer screens.
export function useClient() {
  const { scope } = useShell();
  const { clients, loading } = useLive();
  return { client: clients.find((c) => c.id === scope) || clients[0] || null, clients, loading };
}

// GET a path; returns { data, error, loading, reload }. Pass null to skip. Optional polling.
export function useGet(path, { every } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!path);
  const cur = useRef(path);
  cur.current = path;
  const reload = useCallback(async () => {
    if (!path) return null;
    try {
      const d = await get(path);
      if (cur.current === path) { setData(d); setError(""); }
      return d;
    } catch (e) {
      if (cur.current === path) setError(e.message);
      return null;
    } finally {
      if (cur.current === path) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null); setLoading(!!path); reload();
    if (!every || !path) return;
    const id = setInterval(reload, every);
    return () => clearInterval(id);
  }, [reload, every, path]);
  return { data, error, loading, reload, setData };
}

// One message line for results and errors. tone: undefined (ok), "warn", "error".
export function Banner({ tone, children, onClose, className = "" }) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("mb-4 flex items-start gap-2.5 rounded-xl border px-4 py-2.5 text-[12.5px] text-fg",
      tone === "error" ? "border-orange/50 bg-orange/10" : tone === "warn" ? "border-apricot/60 bg-apricot/10" : "border-teal/40 bg-teal/10", className)}>
      {tone ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-orange" /> : <Check className="mt-0.5 size-4 shrink-0 text-accent" />}
      <span className="min-w-0 flex-1 whitespace-pre-line">{children}</span>
      {onClose && <button onClick={onClose} className="text-muted hover:text-fg">Dismiss</button>}
    </div>
  );
}

// A notice state plus a wrapper that runs an action and reports its error or result.
export function useNotice() {
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    if (!notice || notice.tone) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);
  const run = useCallback(async (fn, ok) => {
    setNotice(null);
    try {
      const r = await fn();
      if (ok) setNotice({ text: typeof ok === "function" ? ok(r) : ok });
      return r ?? true;
    } catch (e) {
      setNotice({ tone: "error", text: e.message });
      return null;
    }
  }, []);
  // Floats at the bottom right, so the result of a save is visible however far down the page it was.
  const view = notice ? (
    <div className="fixed bottom-5 right-5 z-[70] w-[440px] max-w-[calc(100vw-2.5rem)] rounded-xl bg-raised shadow-pop">
      <Banner className="!mb-0" tone={notice.tone} onClose={() => setNotice(null)}>{notice.text}</Banner>
    </div>
  ) : null;
  return { notice, setNotice, run, view };
}

export function Loading({ text = "Loading…" }) {
  return <div className="flex items-center gap-2 px-6 py-6 text-[12.5px] text-muted"><Loader2 className="size-4 animate-spin text-accent" />{text}</div>;
}

export function EmptyBox({ children }) {
  return <div className="rounded-2xl border border-dashed border-fg/15 px-5 py-8 text-center text-[13px] text-muted/80">{children}</div>;
}

export function NoClient({ eyebrow, title, loading }) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} />
      <EmptyBox>{loading ? "Loading customers…" : "No customers yet."}</EmptyBox>
    </div>
  );
}

export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "–");

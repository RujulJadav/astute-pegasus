import { useEffect, useRef, useState, useCallback } from "react";
import { animate, useInView } from "motion/react";
import { agent } from "./data.js";

export const cx = (...c) => c.filter(Boolean).join(" ");

// Hash routing (#/patching) so screens are linkable and Back works, even from file://.
export function useHashRoute(fallback = "home") {
  const read = () => (window.location.hash.replace(/^#\/?/, "") || fallback);
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const go = useCallback((r) => { window.location.hash = "/" + r; }, []);
  return [route, go];
}

// Counts up when it scrolls into view.
export function AnimatedNumber({ value, decimals = 0, duration = 1.1, className = "", suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const controls = animate(0, value, {
      duration, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { if (ref.current) ref.current.textContent = v.toFixed(decimals) + suffix; },
    });
    return () => controls.stop();
  }, [inView, value]);
  return <span ref={ref} className={cx("tabular", className)}>{(0).toFixed(decimals) + suffix}</span>;
}

export function sparkPath(data, w, h, pad = 2) {
  const max = 100, min = 0;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => [pad + i * step, h - pad - ((v - min) / (max - min)) * (h - pad * 2)]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return { line: d, area: `${d} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`, last: pts[pts.length - 1] };
}

export function Sparkline({ data, width = 120, height = 32, stroke = "#00C6FF", fill = true, strokeWidth = 1.5, threshold, id }) {
  const { line, area, last } = sparkPath(data, width, height);
  const gid = `sg-${id || Math.random().toString(36).slice(2, 8)}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {threshold != null && (
        <line x1="0" x2={width} y1={height - (threshold / 100) * height} y2={height - (threshold / 100) * height} stroke={stroke} strokeOpacity="0.35" strokeDasharray="3 3" />
      )}
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={stroke} />
    </svg>
  );
}

// Streams text in word by word, like a model reply.
export function useStream(text, { speed = 18, start = true } = {}) {
  const [out, setOut] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!start || !text) return;
    setOut(""); setDone(false);
    const words = text.split(/(\s+)/);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setOut(words.slice(0, i).join(""));
      if (i >= words.length) { clearInterval(id); setDone(true); }
    }, speed);
    return () => clearInterval(id);
  }, [text, start]);
  return [out, done];
}

// Drives one scripted agent turn: tool calls run one after another, then the answer streams.
// Returns the turn's visible state; the visual design is left to each concept.
export function useAgentTurns() {
  const [turns, setTurns] = useState([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const ask = useCallback((q) => {
    const script = agent.scripts[q] || {
      tools: [{ name: "pegasus.search", args: `q="${q.slice(0, 32)}"`, out: "context gathered", ms: 700, tier: "read" }],
      answer: "In the live product I'd answer from Pegasus data, OCI Monitoring and your change tickets. This demo only has scripted answers for the suggested questions.",
    };
    const id = Date.now();
    setTurns((t) => [...t, { id, q, script, toolsDone: 0, answering: false, decided: null }]);
    let at = 450;
    script.tools.forEach((tool, i) => {
      at += tool.ms;
      later(() => setTurns((t) => t.map((x) => (x.id === id ? { ...x, toolsDone: i + 1 } : x))), at);
    });
    later(() => setTurns((t) => t.map((x) => (x.id === id ? { ...x, answering: true } : x))), at + 250);
  }, []);

  const decide = useCallback((id, decision) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, decided: decision } : x))), []);
  const reset = useCallback(() => setTurns([]), []);
  return { turns, ask, decide, reset };
}

export function useKey(combo, handler) {
  useEffect(() => {
    const on = (e) => {
      if ((combo === "mod+k" && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") || (combo === "esc" && e.key === "Escape")) {
        e.preventDefault();
        handler(e);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [handler]);
}

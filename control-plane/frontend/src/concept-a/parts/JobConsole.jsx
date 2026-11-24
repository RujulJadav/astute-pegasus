import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { TerminalSquare, Check, Loader2, X, Clock3 } from "lucide-react";
import { jobOutput } from "../../shared/data.js";
import { Drawer, Pill } from "../kit.jsx";
import { get } from "../../api/client.js";
import { useLive } from "../../api/live.jsx";

const DONE = ["succeeded", "failed", "expired", "cancelled"];
const POLL_MS = 1500;

// The app's job console: the live output of any job (start, stop, check status, downloads…).
// A job with an id streams from GET /api/jobs/<id>?since=<n>; a job without one (demo mode) plays the sample output.
export default function JobConsole({ job, onClose }) {
  return job?.id ? <LiveConsole job={job} onClose={onClose} /> : <DemoConsole job={job} onClose={onClose} />;
}

function LiveConsole({ job, onClose }) {
  const { refresh } = useLive();
  const [text, setText] = useState("");
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState("");
  const box = useRef(null);

  useEffect(() => {
    let since = 0, stop = false, timer;
    setText(""); setInfo(null); setErr("");
    const tick = async () => {
      try {
        const j = await get(`/api/jobs/${job.id}?since=${since}`);
        if (stop) return;
        if (j.text) setText((t) => t + j.text);
        since = j.next ?? since;
        setInfo(j);
        if (DONE.includes(j.status)) { refresh?.(); return; }
      } catch (e) {
        if (!stop) setErr(e.message);
      }
      if (!stop) timer = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => { stop = true; clearTimeout(timer); };
  }, [job.id]);

  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [text]);

  const status = info?.status || "queued";
  const steps = info?.steps || [];
  const done = steps.filter((s) => s.done).length;
  return (
    <Drawer open onClose={onClose} width={680} eyebrow="Job output" title={`${job.what} · ${job.env}`}
      footer={<><span className="text-[11.5px] text-muted/80">Started by {info?.created_by || job.by || "you"} · runs through the client's connector{steps.length ? ` · step ${done} of ${steps.length}` : ""}</span>
        <span className="ml-auto"><StatusPill status={status} /></span></>}>
      <div className="flex items-center gap-2 pb-3 text-[12px] text-muted/70"><TerminalSquare className="size-4 text-accent" />Output streamed from the servers · job <span className="font-mono">{job.id}</span></div>
      {status === "queued" && <p className="mb-3 text-[12.5px] text-muted">Waiting for the connector to pick this up. Queued jobs expire after 15 minutes.</p>}
      {err && <p role="alert" className="mb-3 rounded-lg border border-orange/50 bg-orange/10 px-3 py-2 text-[12.5px] text-fg">{err}</p>}
      <div ref={box} data-theme="night" className="max-h-[52vh] min-h-[340px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-fg/[0.08] bg-term p-4 font-mono text-[12px] leading-[20px] text-muted/90 day:border-transparent">
        {text || <span className="text-muted/60">No output yet.</span>}
        {!DONE.includes(status) && <span className="ml-0.5 inline-block h-3.5 w-2 animate-pulse bg-accent/80 align-middle" />}
      </div>
      {steps.length > 0 && (
        <div className="mt-4 space-y-1">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              {s.done ? (s.exit_code === 0 ? <Check className="size-3.5 text-accent" /> : <X className="size-3.5 text-orange" />) : <Clock3 className="size-3.5 text-muted/60" />}
              <span className="text-fg">{s.label}</span>{s.host && <span className="font-mono text-muted/70">{s.host}</span>}
              {s.state && <span className="ml-auto text-muted">{s.state}</span>}
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}

function StatusPill({ status }) {
  if (status === "succeeded") return <Pill tone="cyan" icon={Check}>succeeded</Pill>;
  if (status === "failed") return <Pill tone="orange" icon={X}>failed</Pill>;
  if (DONE.includes(status)) return <Pill>{status}</Pill>;
  return <Pill icon={Loader2}>{status}</Pill>;
}

function DemoConsole({ job, onClose }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!job) return;
    setN(0);
    const id = setInterval(() => setN((x) => (x >= jobOutput.length ? x : x + 1)), 380);
    return () => clearInterval(id);
  }, [job]);
  const done = n >= jobOutput.length;
  return (
    <Drawer open={!!job} onClose={onClose} width={620} eyebrow="Job output" title={job ? `${job.what} · ${job.env}` : ""}
      footer={<><span className="text-[11.5px] text-muted/80">Started by {job?.by || "you"} · runs through the client's connector</span>
        <span className="ml-auto">{done ? <Pill tone="cyan" icon={Check}>done</Pill> : <Pill icon={Loader2}>running</Pill>}</span></>}>
      <div className="flex items-center gap-2 pb-3 text-[12px] text-muted/70"><TerminalSquare className="size-4 text-accent" />psadmin output, streamed from the servers</div>
      <div data-theme="night" className="min-h-[340px] rounded-xl border border-fg/[0.08] bg-term p-4 font-mono text-[12px] leading-[20px] day:border-transparent">
        {jobOutput.slice(0, n).map((l, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className={/started|RUNNING|running|verified/.test(l) ? "text-accent" : "text-muted/80"}>{l}</motion.div>
        ))}
        {!done && <span className="inline-block h-3.5 w-2 animate-pulse bg-accent/80" />}
      </div>
    </Drawer>
  );
}

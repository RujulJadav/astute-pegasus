import { useRef, useState } from "react";
import { motion } from "motion/react";
import { CalendarClock, Plus, Globe2, PauseCircle, Leaf, MousePointer2, ListTree, SkipForward, Play, Trash2, TerminalSquare } from "lucide-react";
import { cx, AnimatedNumber } from "../../shared/ui.jsx";
import { schedules, DAYS, TZ, scheduleRuns, SCHEDULE_ACTIONS, TIMEZONES } from "../../shared/data.js";
import { Panel, PanelHead, Button, Pill, PageHeader, Segmented, ease, dots, Drawer, Field, inputCls, TierTag } from "../kit.jsx";
import LiveSchedules from "./LiveSchedules.jsx";
import { useLive as useLiveMode } from "../../api/live.jsx";

export default function Schedules() {
  return useLiveMode().live ? <LiveSchedules /> : <DemoSchedules />;
}

const PRESETS = {
  office: (d, h) => d < 5 && h >= 7 && h < 19,
  nights: (d, h) => h >= 6 && h < 20,
  thufri: (d) => d !== 3 && d !== 4,
  always: () => true,
};
const build = (fn) => Array.from({ length: 7 }, (_, d) => Array.from({ length: 24 }, (_, h) => (fn(d, h) ? 1 : 0)));

function DemoSchedules() {
  const [add, setAdd] = useState(false);
  return (
    <div className="@container">
      <PageHeader eyebrow={<><CalendarClock className="size-3.5" />Schedules</>} title="Start and stop on a weekly plan"
        sub="Environments that don't need to run all week stop on their own and start before people need them. Change windows override the plan automatically."
        actions={<Button variant="primary" icon={Plus} onClick={() => setAdd(true)}>Add a schedule</Button>} />

      <div className="mb-4 grid grid-cols-1 gap-3 @3xl:grid-cols-3">
        <Stat icon={Leaf} label="Hours stopped per week" value={schedules.filter((x) => x.rule !== "Always on").reduce((n, x) => n + 168 - x.grid.flat().reduce((a, b) => a + b, 0), 0)} suffix=" of 504" foot="across the 3 environments on a plan" />
        <Stat icon={CalendarClock} label="Environments on a plan" value={3} suffix=" of 16" foot="13 run around the clock" />
        <Stat icon={PauseCircle} label="Next action" text="7:00 PM" foot="Parker HCM DEV stop · skipped for PSADMIN-872" tone="apricot" />
      </div>

      <AllSchedules />

      <div className="mb-3 mt-8 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted/80">Weekly plans</div>
      <div className="space-y-4">
        {schedules.map((s, i) => <Plan key={s.env} s={s} i={i} editable={i === 0} />)}
      </div>
      <AddSchedule open={add} onClose={() => setAdd(false)} />
    </div>
  );
}

function AllSchedules() {
  const [rows, setRows] = useState(scheduleRuns);
  const patch = (i, ch) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...ch } : x)));
  return (
    <Panel>
      <PanelHead icon={ListTree} title="Every schedule" meta="Each run is the same job as clicking Start all or Stop all, in the same safe order. A run more than 15 minutes late, or while another job is busy on that environment, is skipped and shows here." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[12.5px]">
          <thead className="border-y border-fg/[0.06] bg-fg/[0.02] text-left text-[11px] uppercase tracking-[0.1em] text-muted/70">
            <tr>{["Environment", "What", "When", "Next run", "Last run", ""].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.env + r.what + r.when} className="border-b border-fg/[0.05] last:border-0">
                <td className="px-5 py-3"><span className="flex items-center gap-2 text-fg">Parker · {r.env}<TierTag tier={r.tier} /></span>{r.note && <span className="text-[11.5px] text-muted/80">{r.note}</span>}{r.source && <span className="text-[11.5px] text-muted/70">{r.source}</span>}</td>
                <td className="px-5 py-3 text-fg">{r.what}</td>
                <td className="px-5 py-3"><span className="text-muted">{r.when}</span><span className="block font-mono text-[11px] text-muted/70">{r.tz}</span></td>
                <td className="px-5 py-3">
                  {r.paused ? <Pill>Paused</Pill> : r.skip || r.next.startsWith("Skipping") ? <><Pill tone="apricot">Skipping</Pill><span className="block text-[11.5px] text-muted/80">{r.nextNote || "next run only"}</span></> : <><span className="text-fg">{r.next}</span><span className="block text-[11.5px] text-muted/80">{r.nextNote}</span></>}
                </td>
                <td className="px-5 py-3">
                  <Pill tone={r.last === "done" ? "teal" : r.last === "skipped" ? "apricot" : "neutral"}>{r.last}</Pill>
                  {r.lastWhen && <span className="block text-[11.5px] text-muted/80">{r.lastWhen}</span>}
                  {r.last === "done" && <button className="mt-0.5 flex items-center gap-1 text-[11.5px] text-accent hover:underline"><TerminalSquare className="size-3" />Show output</button>}
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right text-[12px]">
                  {!r.paused && <button onClick={() => patch(i, { skip: !r.skip, next: r.skip && r.next.startsWith("Skipping") ? "Mon 7:00 PM" : r.next })} className="mr-3 inline-flex items-center gap-1 text-accent hover:underline"><SkipForward className="size-3" />{r.skip || r.next.startsWith("Skipping") ? "Don't skip" : "Skip next run"}</button>}
                  <button onClick={() => patch(i, { paused: !r.paused })} className="mr-3 inline-flex items-center gap-1 text-accent hover:underline">{r.paused ? <><Play className="size-3" />Resume</> : <><PauseCircle className="size-3" />Pause</>}</button>
                  <button onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="inline-flex items-center gap-1 text-risk/80 hover:text-risk"><Trash2 className="size-3" />Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function AddSchedule({ open, onClose }) {
  const [what, setWhat] = useState(SCHEDULE_ACTIONS[0]);
  const [repeat, setRepeat] = useState("weekly");
  const [days, setDays] = useState([0, 1, 2, 3, 4]);
  const hours = what === SCHEDULE_ACTIONS[0];
  return (
    <Drawer open={open} onClose={onClose} width={560} eyebrow="Schedules" title="Add a schedule"
      footer={<><span className="text-[11.5px] text-muted/80">Production needs you to type its name to confirm.</span><Button variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Button><Button variant="primary" icon={Plus} onClick={onClose}>Add schedule</Button></>}>
      <div className="space-y-4">
        <Field label="Environment"><select className={inputCls}>{["HCM DEV", "HCM TST", "HCM PRD (production)", "CS DEV", "CS PRD (production)", "FIN UAT"].map((e) => <option key={e} className="bg-raised">{e}</option>)}</select></Field>
        <Field label="What"><select value={what} onChange={(e) => setWhat(e.target.value)} className={inputCls}>{SCHEDULE_ACTIONS.map((a) => <option key={a} className="bg-raised">{a}</option>)}</select></Field>
        <Field label="Repeat"><Segmented size="sm" layoutId="rep" value={repeat} onChange={setRepeat} options={[{ value: "weekly", label: "Weekly" }, { value: "once", label: "Once" }]} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={hours ? "Start at" : "At"}><input type="time" defaultValue="07:00" className={inputCls} /></Field>
          {hours && <Field label="Stop at"><input type="time" defaultValue="19:00" className={inputCls} /></Field>}
          {repeat === "once" && <Field label="Date"><input type="date" defaultValue="2026-11-02" className={inputCls} /></Field>}
        </div>
        {repeat === "weekly" && (
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const on = days.includes(i);
              return <button key={d} onClick={() => setDays((x) => (on ? x.filter((y) => y !== i) : [...x, i]))} className={cx("h-8 w-12 rounded-lg border text-[12px]", on ? "border-accent/50 bg-accent/10 text-fg" : "border-fg/10 text-muted/80")}>{d}</button>;
            })}
          </div>
        )}
        <Field label="Time zone"><select className={inputCls}>{TIMEZONES.map((z) => <option key={z.id} className="bg-raised">{z.id}{z.note ? ` · ${z.note}` : ""}</option>)}</select></Field>
        <Field label="Note (optional)"><input className={inputCls} placeholder="e.g. save OCI cost overnight" /></Field>
      </div>
    </Drawer>
  );
}

function Stat({ icon: Icon, label, value, text, suffix, foot, tone }) {
  return (
    <Panel className="p-4">
      <div className="flex items-center gap-2 text-[12px] text-muted/75"><Icon className="size-3.5 text-accent" />{label}</div>
      <div className={cx("mt-2 font-display text-[28px] font-extrabold leading-8", tone === "apricot" ? "text-warn" : "text-fg")}>
        {text || <><AnimatedNumber value={value} /><span className="text-[14px] font-medium text-muted/70">{suffix}</span></>}
      </div>
      <div className="mt-1 text-[11.5px] text-muted/80">{foot}</div>
    </Panel>
  );
}

function Plan({ s, i, editable }) {
  const [grid, setGrid] = useState(s.grid);
  const [preset, setPreset] = useState("office");
  const painting = useRef(null);
  const up = grid.flat().reduce((a, b) => a + b, 0);

  const paint = (d, h, v) => setGrid((g) => g.map((row, di) => (di === d ? row.map((c, hi) => (hi === h ? v : c)) : row)));
  const apply = (p) => { setPreset(p); setGrid(build(PRESETS[p])); };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07, duration: 0.5, ease }}>
      <Panel className={cx("p-5", s.override && "border-accent/25")}>
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="font-display text-[16px] font-bold">{dots(s.env)}</h2>
          <span className="text-[12.5px] text-muted/70">{s.rule}</span>
          <Pill icon={Globe2}>{s.env.startsWith("Northwind") ? "MST · client zone" : `${TZ.abbr} · client zone`}</Pill>
          <span className="ml-auto flex items-center gap-3 text-[12px]">
            <span className="text-muted/80">{up} of 168 hours up</span>
            <Pill tone="teal">stopped {168 - up} h a week</Pill>
          </span>
        </div>
        {editable && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Segmented size="sm" layoutId={`preset-${i}`} value={preset} onChange={apply}
              options={[{ value: "office", label: "Weekdays 7 AM–7 PM" }, { value: "nights", label: "Stop nightly 8 PM–6 AM" }, { value: "thufri", label: "Off Thu & Fri" }, { value: "always", label: "Clear" }]} />
            <select className={cx(inputCls, "!h-8 !w-auto py-0 text-[12px]")} defaultValue="America/New_York">{TIMEZONES.map((z) => <option key={z.id} className="bg-raised">{z.id}</option>)}</select>
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted/80"><MousePointer2 className="size-3.5" />Drag to paint hours. A day left empty keeps the environment as it is that day.</span>
            <Button size="sm" variant="primary" className="ml-auto">Save weekly plan</Button>
          </div>
        )}
        <div className="select-none overflow-x-auto" onMouseLeave={() => (painting.current = null)} onMouseUp={() => (painting.current = null)}>
          <div className="min-w-[680px]">
            <div className="ml-11 grid grid-cols-24 gap-[3px] pb-1.5 text-[9.5px] text-muted/70">
              {Array.from({ length: 24 }, (_, h) => <span key={h} className="text-center tabular">{h % 3 === 0 ? (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`) : ""}</span>)}
            </div>
            {grid.map((row, d) => (
              <div key={d} className="mb-[3px] flex items-center">
                <span className="w-11 text-[11px] text-muted/80">{DAYS[d]}</span>
                <div className="grid flex-1 grid-cols-24 gap-[3px]">
                  {row.map((v, h) => {
                    const tonight = s.override && d === 3 && h >= 19;
                    return (
                      <motion.button
                        key={h} type="button" aria-label={`${DAYS[d]} ${h}:00 ${v ? "up" : "stopped"}`}
                        onMouseDown={() => { if (!editable) return; painting.current = v ? 0 : 1; paint(d, h, painting.current); }}
                        onMouseEnter={() => editable && painting.current != null && paint(d, h, painting.current)}
                        initial={false} animate={{ opacity: 1 }}
                        className={cx("h-5 rounded-[4px] transition-colors", editable ? "cursor-crosshair" : "cursor-default",
                          tonight ? "bg-accent shadow-[0_0_8px_#00C6FF80] day:bg-cyan" : v ? "bg-teal/70 hover:bg-teal day:bg-teal/80" : "bg-fg/[0.05] hover:bg-fg/10 day:bg-fg/[0.07]")}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-muted/80">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded-sm bg-teal/70" />Up</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-3.5 rounded-sm bg-fg/10" />Stopped</span>
          {s.override && <span className="flex items-center gap-1.5 text-accent"><span className="h-2.5 w-3.5 rounded-sm bg-accent day:bg-cyan" />Kept up tonight for PSADMIN-872</span>}
          <span className="ml-auto">{s.next}</span>
        </div>
      </Panel>
    </motion.div>
  );
}

// Schedules on live data:
//   GET/POST /api/clients/<cid>/schedules, PATCH/DELETE /api/schedules/<id>   (pause, resume, skip next, delete)
//   GET/PUT  /api/clients/<cid>/schedules/weekly?environment=…               (a start and a stop time per weekday)
// Production needs its name typed, for both.
import { useEffect, useState } from "react";
import { CalendarClock, Plus, Pause, Play, SkipForward, Trash2, Loader2, CalendarDays, Check } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { Panel, PanelHead, Button, Pill, PageHeader, Drawer, Field, inputCls, Segmented, Confirm, TierTag } from "../kit.jsx";
import { get, post, put, del, api } from "../../api/client.js";
import { ago } from "../../api/live.jsx";
import { useClient, useGet, useNotice, Loading, NoClient, EmptyBox, Banner, fmtTime } from "../liveKit.jsx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ACTIONS = [{ value: "start", label: "Start" }, { value: "stop", label: "Stop" }, { value: "restart", label: "Restart" }, { value: "clearcache", label: "Clear cache" }];
const ACTION_LABEL = Object.fromEntries(ACTIONS.map((a) => [a.value, a.label]));
const ZONES = (() => { try { return Intl.supportedValuesOf("timeZone"); } catch { return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"]; } })();
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const isPrd = (t) => ["PRD", "PROD", "PRODUCTION"].includes(String(t || "").toUpperCase());

function when(s) {
  if (s.once_date) return `once on ${s.once_date}`;
  const d = s.days || [];
  if (d.length === 7) return "every day";
  if (d.join() === "0,1,2,3,4") return "Mon–Fri";
  if (d.join() === "5,6") return "weekends";
  return d.map((x) => DAYS[x]).join(", ");
}

export default function LiveSchedules() {
  const { client, loading: lc } = useClient();
  if (!client) return <NoClient eyebrow={<><CalendarClock className="size-3.5" />Schedules</>} title="Schedules" loading={lc} />;
  return <ClientSchedules key={client.id} client={client} />;
}

function ClientSchedules({ client }) {
  const cid = client.id;
  const { data, error, loading, reload } = useGet(`/api/clients/${cid}/schedules`, { every: 30000 });
  const { run, view, setNotice } = useNotice();
  const [adding, setAdding] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [planEnv, setPlanEnv] = useState(client.envs[0]?.name || "");
  const list = data?.schedules || [];

  const patch = (s, body, ok) => run(async () => { await api(`/api/schedules/${s.id}`, { method: "PATCH", body }); await reload(); }, ok);

  return (
    <div className="@container">
      <PageHeader eyebrow={<><CalendarClock className="size-3.5" />Schedules · {client.name}</>} title="Schedules"
        sub="Start, stop, restart or clear cache on a timetable, in each schedule's own time zone. Runs through the connector like any other job, and appears in the audit log."
        actions={<Button variant="primary" icon={Plus} onClick={() => setAdding(true)} disabled={!client.envs.length}>Add a schedule</Button>} />
      {error && <Banner tone="error">{error}</Banner>}
      {view}

      <div className="grid grid-cols-1 gap-5 @6xl:grid-cols-12">
        <Panel className="@6xl:col-span-7">
          <PanelHead icon={CalendarDays} title="All schedules" meta={`${list.length} for ${client.name}`} />
          {loading ? <Loading /> : !list.length ? <div className="px-5 pb-5"><EmptyBox>No schedules yet.</EmptyBox></div> : (
            <table className="w-full text-[12.5px]">
              <thead className="border-y border-fg/[0.06] bg-fg/[0.02] text-left text-[11px] uppercase tracking-[0.1em] text-muted/70">
                <tr>{["Environment", "Does", "When", "Next run", "Last run", ""].map((h) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className={cx("border-b border-fg/[0.05] last:border-0", !s.enabled && "opacity-60")}>
                    <td className="px-4 py-2.5"><span className="flex items-center gap-2 text-fg">{s.environment}<TierTag tier={isPrd(s.tier) ? "PRD" : s.tier} /></span>{s.note && <span className="block text-[11px] text-muted/80">{s.note}</span>}</td>
                    <td className="px-4 py-2.5 text-fg">{ACTION_LABEL[s.action] || s.action}</td>
                    <td className="px-4 py-2.5 text-muted">{when(s)} · <span className="font-mono">{s.time}</span> <span className="text-[11px]">{s.tz}</span></td>
                    <td className="px-4 py-2.5 text-muted">{!s.enabled ? "Paused" : s.next_run ? fmtTime(s.next_run) : "–"}{s.skip_next && s.enabled && <Pill tone="apricot" className="ml-1.5">skips next</Pill>}</td>
                    <td className="px-4 py-2.5 text-muted">{s.last_run ? <>{ago(s.last_run)} <Pill tone={s.last_status === "queued" || s.last_job_status === "succeeded" ? "teal" : s.last_status === "skipped" ? "neutral" : "orange"}>{s.last_job_status || s.last_status}</Pill></> : "never"}{s.last_detail && <span className="block text-[11px] text-muted/80">{s.last_detail}</span>}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <span className="inline-flex gap-1">
                        <IconBtn label={s.enabled ? `Pause ${s.environment} ${s.action}` : `Resume ${s.environment} ${s.action}`} icon={s.enabled ? Pause : Play} onClick={() => patch(s, { enabled: !s.enabled }, s.enabled ? "Paused." : "Resumed.")} />
                        {s.enabled && !s.once_date && <IconBtn label={s.skip_next ? "Don't skip the next run" : "Skip the next run"} icon={SkipForward} on={s.skip_next} onClick={() => patch(s, { skip_next: !s.skip_next }, s.skip_next ? "The next run will happen." : "The next run will be skipped.")} />}
                        <IconBtn label={`Delete ${s.environment} ${s.action}`} icon={Trash2} danger onClick={() => setConfirmDel(s)} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <div className="@6xl:col-span-5">
          {client.envs.length > 0 && <WeeklyPlan key={`${cid}|${planEnv}`} cid={cid} envs={client.envs} env={planEnv} onEnv={setPlanEnv}
            onSaved={(r) => { setNotice({ text: r.schedules ? `Weekly plan saved: ${r.described.join("; ")}.` : "Weekly plan cleared." }); reload(); }} onError={(m) => setNotice({ tone: "error", text: m })} />}
        </div>
      </div>

      <AddSchedule open={adding} onClose={() => setAdding(false)} client={client} onAdded={() => { setAdding(false); setNotice({ text: "Schedule added." }); reload(); }} />
      <Confirm open={!!confirmDel} onClose={() => setConfirmDel(null)} danger title="Delete this schedule?" cta="Delete"
        onConfirm={() => { const s = confirmDel; setConfirmDel(null); run(async () => { await del(`/api/schedules/${s.id}`); await reload(); }, "Schedule deleted."); }}>
        {confirmDel && `${ACTION_LABEL[confirmDel.action]} ${confirmDel.environment} ${when(confirmDel)} at ${confirmDel.time} ${confirmDel.tz}.`}
      </Confirm>
    </div>
  );
}

function IconBtn({ label, icon: Icon, onClick, danger, on }) {
  return <button onClick={onClick} aria-label={label} title={label} className={cx("grid size-8 place-items-center rounded-lg border border-fg/10 text-muted hover:text-fg", danger && "hover:text-risk", on && "border-accent/40 text-accent")}><Icon className="size-3.5" /></button>;
}

function WeeklyPlan({ cid, envs, env, onEnv, onSaved, onError }) {
  const e = envs.find((x) => x.name === env) || envs[0];
  const [plan, setPlan] = useState(null);
  const [tz, setTz] = useState(LOCAL_TZ);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    get(`/api/clients/${cid}/schedules/weekly?environment=${encodeURIComponent(e.name)}`).then((r) => { setPlan(r.plan); if (r.tz) setTz(r.tz); }).catch((x) => onError(x.message));
  }, [cid, e.name]);
  const set = (d, k) => (ev) => setPlan((p) => p.map((r) => (r.day === d ? { ...r, [k]: ev.target.value } : r)));
  const save = async (confirmed) => {
    setBusy(true); setConfirm(false);
    try { onSaved(await put(`/api/clients/${cid}/schedules/weekly`, { environment: e.name, tz, plan, confirm: confirmed ? e.name : undefined })); }
    catch (x) { if (x.body?.need_confirm) setConfirm(true); else onError(x.message); }
    finally { setBusy(false); }
  };
  return (
    <Panel>
      <PanelHead icon={CalendarClock} title="Weekly plan" meta="A start and a stop time per day" />
      <div className="space-y-3 px-5 pb-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Environment"><select className={inputCls} value={e.name} onChange={(x) => onEnv(x.target.value)}>{envs.map((v) => <option key={v.name} className="bg-raised">{v.name}</option>)}</select></Field>
          <Field label="Time zone"><select className={inputCls} value={tz} onChange={(x) => setTz(x.target.value)}>{ZONES.map((z) => <option key={z} className="bg-raised">{z}</option>)}</select></Field>
        </div>
        {!plan ? <Loading /> : (
          <table className="w-full text-[12.5px]">
            <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-muted/70"><tr><th className="py-1.5 font-medium">Day</th><th className="py-1.5 font-medium">Start</th><th className="py-1.5 font-medium">Stop</th></tr></thead>
            <tbody>
              {plan.map((r) => (
                <tr key={r.day}>
                  <td className="py-1 pr-3 text-fg">{DAYS[r.day]}</td>
                  <td className="py-1 pr-2"><input type="time" aria-label={`${DAYS[r.day]} start`} value={r.start} onChange={set(r.day, "start")} className={cx(inputCls, "h-9")} /></td>
                  <td className="py-1"><input type="time" aria-label={`${DAYS[r.day]} stop`} value={r.stop} onChange={set(r.day, "stop")} className={cx(inputCls, "h-9")} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11.5px] text-muted/80">Days that share a time become one schedule. Leave a time empty for no start or stop.</span>
          <Button variant="primary" className="ml-auto shrink-0" icon={busy ? Loader2 : Check} disabled={!plan || busy} onClick={() => save(false)}>Save plan</Button>
        </div>
      </div>
      <Confirm open={confirm} onClose={() => setConfirm(false)} danger typeToConfirm={e.name} title={`Save the weekly plan for ${e.name}?`} cta="Save plan" onConfirm={() => save(true)}>
        {`${e.name} is a production environment. Its domains will start and stop at these times.`}
      </Confirm>
    </Panel>
  );
}

function AddSchedule({ open, onClose, client, onAdded }) {
  const blank = { environment: client.envs[0]?.name || "", action: "stop", mode: "weekly", days: [0, 1, 2, 3, 4], once_date: "", time: "19:00", tz: client.tz || LOCAL_TZ, note: "" };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (open) { setF(blank); setErr(""); } }, [open]);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e?.target ? e.target.value : e }));
  const toggleDay = (d) => setF((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((y) => y !== d) : [...x.days, d].sort() }));
  const submit = async (confirmed) => {
    setBusy(true); setErr(""); setConfirm(false);
    try {
      await post(`/api/clients/${client.id}/schedules`, { environment: f.environment, action: f.action, time: f.time, tz: f.tz, note: f.note,
        ...(f.mode === "once" ? { once_date: f.once_date } : { days: f.days }), confirm: confirmed ? f.environment : undefined });
      onAdded();
    } catch (e) { if (e.body?.need_confirm) setConfirm(true); else setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Drawer open={open} onClose={onClose} width={540} eyebrow={`Schedules · ${client.name}`} title="Add a schedule"
      footer={<><Button variant="ghost" className="ml-auto" onClick={onClose}>Cancel</Button><Button variant="primary" icon={busy ? Loader2 : Plus} disabled={busy} onClick={() => submit(false)}>Add schedule</Button></>}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Environment"><select className={inputCls} value={f.environment} onChange={set("environment")}>{client.envs.map((e) => <option key={e.name} className="bg-raised">{e.name}</option>)}</select></Field>
          <Field label="Does"><select className={inputCls} value={f.action} onChange={set("action")}>{ACTIONS.map((a) => <option key={a.value} value={a.value} className="bg-raised">{a.label}</option>)}</select></Field>
        </div>
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-muted">Repeats</div>
          <Segmented layoutId="sch-mode" value={f.mode} onChange={set("mode")} options={[{ value: "weekly", label: "Every week" }, { value: "once", label: "Once" }]} />
        </div>
        {f.mode === "weekly" ? (
          <div role="group" aria-label="Days" className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => <button key={d} type="button" aria-pressed={f.days.includes(i)} onClick={() => toggleDay(i)} className={cx("h-9 w-12 rounded-lg border text-[12.5px]", f.days.includes(i) ? "border-accent bg-accent/15 text-fg" : "border-fg/10 text-muted")}>{d}</button>)}
          </div>
        ) : <Field label="Date"><input type="date" className={inputCls} value={f.once_date} onChange={set("once_date")} /></Field>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Time (24-hour)"><input type="time" className={inputCls} value={f.time} onChange={set("time")} /></Field>
          <Field label="Time zone"><select className={inputCls} value={f.tz} onChange={set("tz")}>{ZONES.map((z) => <option key={z} className="bg-raised">{z}</option>)}</select></Field>
        </div>
        <Field label="Note (optional)"><input className={inputCls} value={f.note} onChange={set("note")} maxLength={200} /></Field>
        {err && <p role="alert" className="rounded-lg border border-orange/50 bg-orange/10 px-3 py-2 text-[12.5px] text-fg">{err}</p>}
      </div>
      <Confirm open={confirm} onClose={() => setConfirm(false)} danger typeToConfirm={f.environment} title={`Schedule ${ACTION_LABEL[f.action].toLowerCase()} on ${f.environment}?`} cta="Add schedule" onConfirm={() => submit(true)}>
        {`${f.environment} is a production environment.`}
      </Confirm>
    </Drawer>
  );
}

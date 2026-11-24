import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings2, Cloud, Ticket, CalendarRange, FolderTree, Crosshair, Check, Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { clientSettings } from "../../shared/data.js";
import { Panel, PanelHead, Button, PageHeader, Field, inputCls, Toggle, Segmented, ExtLink, ease } from "../kit.jsx";
import { useShell } from "../App.jsx";
import LiveSettings from "./LiveSettings.jsx";
import { useLive as useLiveMode } from "../../api/live.jsx";

export default function Settings() {
  return useLiveMode().live ? <LiveSettings /> : <DemoSettings />;
}

const J = clientSettings.jira;

function DemoSettings() {
  const { go } = useShell();
  const [jiraOn, setJiraOn] = useState(J.enabled);
  const [blockSelf, setBlockSelf] = useState(J.blockSelf);
  const [cadence, setCadence] = useState(clientSettings.cadence);
  const [test, setTest] = useState("idle");
  const [saved, setSaved] = useState(null);
  const save = (k) => { setSaved(k); setTimeout(() => setSaved(null), 1800); };
  const Saved = ({ k }) => <AnimatePresence>{saved === k && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-[12px] text-accent"><Check className="size-3.5" />Saved</motion.span>}</AnimatePresence>;

  return (
    <div className="@container">
      <PageHeader eyebrow={<><Settings2 className="size-3.5" />Settings · Parker</>} title="Client settings"
        sub="How Pegasus works for this client: their OCI console, change approval, patch plan and where patches are staged. Admins can change these; everyone else sees them read-only." />

      <div className="grid grid-cols-1 gap-4 @5xl:grid-cols-12">
        <div className="space-y-4 @5xl:col-span-7">
          <Panel>
            <PanelHead icon={Ticket} title="Change approval (Jira)" meta="Help desk adapters live in Integrations"
              action={<button onClick={() => go("integrations")} className="text-[12px] text-accent hover:underline">Integrations</button>} />
            <div className="space-y-4 px-5 pb-5">
              <Toggle on={jiraOn} onChange={setJiraOn} label="Require an approved Jira ticket before patching"
                hint="Apply doesn't patch anything by itself: Pegasus raises a ticket describing exactly what will change, and Apply unlocks only after someone other than the Pegasus account approves it. The token is stored encrypted." />
              <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-3">
                <Field label="Needed for"><select className={inputCls} defaultValue={J.require}><option className="bg-raised">Every environment</option><option className="bg-raised">Production only</option></select></Field>
                <Field label="Jira"><select className={inputCls} defaultValue={J.deployment}><option className="bg-raised">Jira Cloud</option><option className="bg-raised">Jira Data Center</option></select></Field>
                <Field label="Jira URL"><input className={inputCls} defaultValue={J.url} /></Field>
                <Field label="Account email"><input className={inputCls} defaultValue={J.user} /></Field>
                <Field label="API token"><input className={inputCls} type="password" placeholder="saved (leave blank to keep)" /></Field>
                <Field label="Project key"><input className={inputCls} defaultValue={J.project} /></Field>
                <Field label="Issue type"><input className={inputCls} defaultValue={J.issueType} /></Field>
                <Field label="Change type"><input className={inputCls} defaultValue={J.changeType} /></Field>
                <Field label="Change risk"><input className={inputCls} defaultValue={J.risk} /></Field>
                <Field label="Impact"><input className={inputCls} defaultValue={J.impact} /></Field>
                <Field label="Urgency"><input className={inputCls} defaultValue={J.urgency} /></Field>
                <Field label="Submit transition"><input className={inputCls} defaultValue={J.submit} /></Field>
                <Field label="Start transition"><input className={inputCls} defaultValue={J.start} /></Field>
                <Field label="Done transition"><input className={inputCls} defaultValue={J.done} /></Field>
              </div>
              <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
                <Field label="Statuses that mean approved"><input className={inputCls} defaultValue={J.approved} /></Field>
                <Field label="Statuses that mean rejected"><input className={inputCls} defaultValue={J.rejected} /></Field>
              </div>
              <Field label="Additional fields (JSON)"><input className={cx(inputCls, "font-mono text-[12.5px]")} placeholder='{"customfield_10052": "PeopleSoft"}' /></Field>
              <Toggle on={blockSelf} onChange={setBlockSelf} label="Don't accept approval by the account Pegasus raises tickets with" />
              <AnimatePresence>
                {test !== "idle" && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className={cx("rounded-lg border px-3 py-2 text-[12.5px]", test === "ok" ? "border-accent/30 bg-accent/[0.06] text-fg" : "border-fg/10 text-muted")}>
                    {test === "ok" ? <span className="flex items-center gap-2"><Check className="size-3.5 text-accent" />Connected as {J.user} to project {J.project}. Pegasus fills in: change type, risk, impact, urgency.</span>
                      : <span className="flex items-center gap-2"><Loader2 className="size-3.5 animate-spin text-accent" />Testing…</span>}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-2">
                <Button variant="primary" onClick={() => save("jira")}>Save</Button>
                <Button onClick={() => { setTest("run"); setTimeout(() => setTest("ok"), 1300); }}>Test connection</Button>
                <Button variant="danger" icon={Trash2}>Remove token</Button>
                <span className="ml-auto"><Saved k="jira" /></span>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4 @5xl:col-span-5">
          <Panel>
            <PanelHead icon={Cloud} title="OCI Console" />
            <div className="space-y-3 px-5 pb-5">
              <p className="text-[12.5px] leading-[19px] text-muted/75">The client's OCI tenancy and home region. <b className="text-fg">Open OCI Console</b> then opens their console, where you sign in with your own OCI account and can use Console AI. Pegasus stores no OCI credentials.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tenancy name"><input className={inputCls} defaultValue={clientSettings.oci.tenancy} /></Field>
                <Field label="Region"><input className={inputCls} defaultValue={clientSettings.oci.region} /></Field>
              </div>
              <div className="flex items-center gap-3"><Button variant="primary" onClick={() => save("oci")}>Save</Button><ExtLink>Try it</ExtLink><span className="ml-auto"><Saved k="oci" /></span></div>
            </div>
          </Panel>
          <Panel>
            <PanelHead icon={CalendarRange} title="Patch plan" meta="What this client signed up for" />
            <div className="space-y-2 px-5 pb-5">
              <Segmented layoutId="plan" value={cadence} onChange={(v) => { setCadence(v); save("plan"); }} options={[{ value: "monthly", label: "Every release (monthly)" }, { value: "quarterly", label: "Quarterly CPUs only" }]} />
              <p className="text-[12px] leading-[18px] text-muted/80">On quarterly CPUs only, releases Oracle ships between CPUs show as coming with the next CPU, and can't be downloaded or applied.</p>
              <Saved k="plan" />
            </div>
          </Panel>
          <Panel>
            <PanelHead icon={FolderTree} title="Staging folder" />
            <div className="space-y-2 px-5 pb-5">
              <div className="flex gap-2"><input className={cx(inputCls, "font-mono")} defaultValue={clientSettings.stagingRoot} /><Button onClick={() => save("stage")}>Save</Button></div>
              <p className="text-[12px] leading-[18px] text-muted/80">Where downloaded patches are copied on each server. Pegasus creates it (with sudo if it must) and gives it to the PeopleSoft owner.</p>
              <Saved k="stage" />
            </div>
          </Panel>
        </div>

        <Panel className="@5xl:col-span-12">
          <PanelHead icon={Crosshair} title="CPU targets (optional)" meta="Pegasus finds the latest JDK, WebLogic 14.1.2, Tuxedo 22.1 and Database 19c client patches by itself. Pin a target only for other releases, or to hold a component at a level." />
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[820px] text-[12.5px]">
              <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-muted/70">
                <tr>{["Component", "Applies to version", "Target", "MOS patch", "Platform", "File filter", "Label", ""].map((h) => <th key={h} className="pb-2 pr-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {clientSettings.targets.map((t) => (
                  <tr key={t.patch}>
                    {[t.component, t.appliesTo, t.target, t.patch, t.platform, t.filter, t.label].map((v, i) => (
                      <td key={i} className="py-1 pr-3"><input className={cx(inputCls, "h-9 font-mono text-[12px]")} defaultValue={v} placeholder={i === 4 ? "auto" : ""} /></td>
                    ))}
                    <td className="py-1"><button className="text-[12px] text-risk/80 hover:text-risk">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex items-center gap-2"><Button size="sm" icon={Plus}>Add target</Button><Button size="sm" variant="primary" onClick={() => save("targets")}>Save targets</Button><Saved k="targets" /></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

import { useState } from "react";
import { motion } from "motion/react";
import { Cable, Plus, Copy, Check, ShieldCheck, KeyRound, RefreshCw, Trash2, Info } from "lucide-react";
import { cx } from "../../shared/ui.jsx";
import { connectors, connectorRelease, signingKey } from "../../shared/data.js";
import { Panel, PanelHead, Button, Pill, PageHeader, Drawer, Segmented, ease } from "../kit.jsx";
import LiveConnectors from "./LiveConnectors.jsx";
import { useLive as useLiveMode } from "../../api/live.jsx";

export default function Connectors() {
  return useLiveMode().live ? <LiveConnectors /> : <DemoConnectors />;
}

function DemoConnectors() {
  const [add, setAdd] = useState(false);
  const [mode, setMode] = useState(connectorRelease.mode);
  return (
    <div className="@container">
      <PageHeader eyebrow={<><Cable className="size-3.5" />Connectors</>} title="Connectors"
        sub="Each connector runs inside a client's network and only connects out to Pegasus. Its SSH key never leaves that machine."
        actions={<Button variant="primary" icon={Plus} onClick={() => setAdd(true)}>Add connector</Button>} />

      <Panel className="overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="border-b border-fg/[0.06] bg-fg/[0.02] text-left text-[11px] uppercase tracking-[0.1em] text-muted/70">
            <tr>{["Name", "Client", "Status", "Version", "Signs in with", ""].map((h) => <th key={h} className="px-5 py-2.5 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {connectors.map((c, i) => (
              <motion.tr key={c.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ease }} className="border-b border-fg/[0.05] last:border-0 hover:bg-fg/[0.02]">
                <td className="px-5 py-3.5"><div className="font-mono text-fg">{c.name}</div><div className="text-[11.5px] text-muted/80">{c.hostname}</div></td>
                <td className="px-5 py-3.5 text-muted">{c.client}</td>
                <td className="px-5 py-3.5">
                  <span className={cx("flex items-center gap-1.5", c.online ? "text-accent" : "text-muted")}><span className={cx("size-1.5 rounded-full", c.online ? "bg-accent shadow-[0_0_6px_#00C6FF]" : "border border-muted")} />{c.online ? "Online" : "Offline"}</span>
                  <div className="text-[11.5px] text-muted/80">{c.lastSeen}</div>
                </td>
                <td className="px-5 py-3.5"><div className="font-mono text-fg">{c.version}</div><div className={cx("text-[11.5px]", c.canUpdate ? "text-warn" : "text-muted/80")}>{c.update}</div></td>
                <td className="px-5 py-3.5">
                  <Pill tone={c.auth === "Certificate" ? "teal" : "apricot"} icon={c.auth === "Certificate" ? ShieldCheck : KeyRound}>{c.auth}</Pill>
                  <div className="mt-1 text-[11.5px] text-muted/80">{c.authDetail}</div>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <span className="inline-flex flex-col items-end gap-1 text-[12px]">
                    {c.canUpdate && <button className="flex items-center gap-1 text-accent hover:underline"><RefreshCw className="size-3" />Update to {connectorRelease.version}</button>}
                    <button className="flex items-center gap-1 text-risk/80 hover:text-risk"><Trash2 className="size-3" />Remove</button>
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className="mt-4 grid grid-cols-1 gap-4 @4xl:grid-cols-2">
        <Panel>
          <PanelHead icon={RefreshCw} title="Connector updates" />
          <div className="space-y-3 px-5 pb-5">
            <Segmented layoutId="cupd" value={mode} onChange={setMode} options={[{ value: "manual", label: "Manual: an admin clicks Update" }, { value: "auto", label: "Automatic: as soon as a release is out" }]} />
            <p className="text-[12.5px] leading-[19px] text-muted/75">
              Newest connector release: <b className="font-mono text-fg">{connectorRelease.version}</b> ({connectorRelease.notes}), signed with <span className="font-mono">{connectorRelease.key}</span>.
              A connector installs only releases signed with Astute's release key, waits until no job is running, and goes back to its previous version if the new one doesn't start.
              The client can refuse updates in the connector's local policy.
            </p>
          </div>
        </Panel>
        <Panel>
          <PanelHead icon={KeyRound} title="Signing key" />
          <div className="space-y-2 px-5 pb-5 text-[12.5px] leading-[19px] text-muted/75">
            <div className="rounded-lg bg-well px-3 py-2 font-mono text-[12px] text-fg">{signingKey}</div>
            <p>Connectors trust only this key, for jobs and for their certificates. Each one holds its own Ed25519 key and renews a 90-day certificate about monthly; Remove revokes it at once.</p>
          </div>
        </Panel>
      </div>

      <AddConnector open={add} onClose={() => setAdd(false)} />
    </div>
  );
}

function AddConnector({ open, onClose }) {
  const [copied, setCopied] = useState(false);
  const cmd = "python -m pegasus_connector register \\\n  --url https://pegasus.beastute.com --token 7HcQ-29fK-xa1M \\\n  --ssh-user opc --ssh-key ~/.ssh/pegasus";
  return (
    <Drawer open={open} onClose={onClose} width={600} eyebrow="Connectors" title="Add a connector"
      footer={<><span className="flex items-center gap-1.5 text-[11.5px] text-muted/80"><Info className="size-3.5" />The token works once and expires in 24 hours.</span><Button variant="primary" className="ml-auto" onClick={onClose}>Done</Button></>}>
      <div className="space-y-5 text-[13px] leading-[20px] text-muted">
        <p>Run this on the client's jump host, or a small VM that can reach their PeopleSoft servers over SSH. Replace the SSH user and key path with the ones the connector should use.</p>
        <div className="relative">
          <pre data-theme="night" className="overflow-x-auto rounded-xl border border-fg/10 bg-term p-4 font-mono text-[12px] leading-[20px] text-accent">{cmd}</pre>
          <button onClick={() => setCopied(true)} className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-fg/10 px-2 py-1 text-[11.5px] text-fg">{copied ? <Check className="size-3" /> : <Copy className="size-3" />}{copied ? "Copied" : "Copy command"}</button>
        </div>
        <p>The connector creates its own key and gets a certificate from Pegasus. It prints the control plane's signing key when it registers; check it matches <span className="font-mono text-fg">{signingKey}</span>. Then start it with <span className="font-mono text-fg">python -m pegasus_connector run</span>.</p>
        <div className="rounded-xl border border-fg/[0.08] bg-fg/[0.03] p-3.5">
          <div className="text-[12.5px] font-medium text-fg">For patching, also save the client's Oracle Support account on the connector</div>
          <pre data-theme="night" className="mt-2 rounded-lg bg-term px-3 py-2 font-mono text-[12px] text-accent">python -m pegasus_connector oracle-login --user name@client.com</pre>
          <p className="mt-2 text-[12px] text-muted/80">It never leaves the client's network; Pegasus never sees it.</p>
        </div>
      </div>
    </Drawer>
  );
}

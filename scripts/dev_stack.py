"""Run the whole of Pegasus on a laptop for UI work, with nothing real behind it.

  python scripts/dev_stack.py                 # then open http://127.0.0.1:8443/next/
  python scripts/dev_stack.py --reset         # start again from an empty database

What runs, all in this one process:
  * the control plane (http://127.0.0.1:8443), with its data in .dev-stack/
  * a connector, registered to a sample client ("Demo University") on first start
  * simulated PeopleSoft servers (tests/fakes.py) behind the connector: psadmin, levels, staging, apply
  * a stand-in for Oracle: Java releases and Oracle Support answer with a fixed catalog, downloads are tiny files
  * a stand-in for Jira and ServiceNow: tickets live in memory and are approved by "Dev Approver" 20 seconds after
    they're raised (so Request approval -> Apply can be tried end to end), and Test connection always succeeds
  * sample CVSS scores for the current CPU (the real ones come from Oracle's advisory page, which may be unreachable)

The first time, open the page and create the admin (setup password: dev-setup-password), then set up an
authenticator app as usual. To try change approval: Integrations -> Jira -> any https URL, project key, email and
token -> switch approval on -> Save.

Nothing here is used by the real control plane or connector; it only swaps those pieces in this process.
"""
import argparse
import os
import shutil
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / ".dev-stack"
sys.path[:0] = [str(ROOT / "control-plane"), str(ROOT / "connector"), str(ROOT / "tests")]

INVENTORY = """environment,tier,host,ip,role,os_user,domain,env_script
HRDEV,DEV,hrdevweb01,10.0.1.11,web,psadm2,peoplesoft,/u01/pt/psconfig.sh
HRDEV,DEV,hrdevapp01,10.0.1.21,app,psadm2,HRDEV,/u01/pt/psconfig.sh
HRDEV,DEV,hrdevapp01,10.0.1.21,prcs,psadm2,PSUNX,/u01/pt/psconfig.sh
HRPRD,PRD,hrprdapp01,10.0.9.21,app,psadm2,HRPRD,/u01/pt/psconfig.sh
"""

CATALOG = {
    "java": {"21": {"version": "21.0.8", "date": "2025-07-15"}},
    "java_dates": {"21.0.5": "2024-10-15"},
    "oracle": {"weblogic": {"stamp": "251015", "psu_patch": "38000001", "spb_patch": "38000002", "released": "2025-10-21",
                            "released_by_stamp": {"250705": "2025-07-15", "251015": "2025-10-21"}}},
}

ADVISORY = {
    "weblogic": {"max": 9.8, "cve": "CVE-2025-0001", "count": 3, "product": "Oracle WebLogic Server", "cves": [
        {"cve": "CVE-2025-0001", "score": 9.8, "product": "Oracle WebLogic Server", "component": "Core (sample)"},
        {"cve": "CVE-2025-0002", "score": 7.5, "product": "Oracle WebLogic Server", "component": "Web Services (sample)"},
        {"cve": "CVE-2025-0003", "score": 5.3, "product": "Oracle WebLogic Server", "component": "Console (sample)"}]},
    "jdk": {"max": 7.4, "cve": "CVE-2025-0101", "count": 2, "product": "Java SE", "cves": [
        {"cve": "CVE-2025-0101", "score": 7.4, "product": "Java SE", "component": "JSSE (sample)"},
        {"cve": "CVE-2025-0102", "score": 3.7, "product": "Java SE", "component": "Libraries (sample)"}]},
}

APPROVE_AFTER = 20


class DevTickets:
    """Stands in for jira.Jira and servicenow.ServiceNow. Tickets are approved APPROVE_AFTER seconds after creation."""
    tickets, n = {}, 0

    def __init__(self, cfg, token):
        self.cfg = cfg

    def browse(self, key):
        return f"{(self.cfg.get('url') or 'https://jira.example.com').rstrip('/')}/browse/{key}"

    def create(self, summary, description, window=None):
        DevTickets.n += 1
        prefix = self.cfg.get("project") or "CHG"
        key = f"{prefix}-{100 + DevTickets.n}"
        DevTickets.tickets[key] = {"summary": summary, "created": time.time(), "state": "pending"}
        print(f"[dev tickets] {key} raised: {summary} (approved in {APPROVE_AFTER}s)")
        return key

    def transition(self, key, name):
        pass

    def approval_state(self, key):
        t = DevTickets.tickets.get(key)
        if not t:
            return "pending", "Unknown (dev stack restarted)", ""
        if t["state"] == "pending" and time.time() - t["created"] >= APPROVE_AFTER:
            t["state"] = "approved"
        return (("approved", "Approved", "Dev Approver") if t["state"] == "approved" else ("pending", "Waiting for approval", ""))

    def comment(self, key, text):
        print(f"[dev tickets] {key}: {text}")

    def myself(self):
        return {"displayName": "Pegasus (dev stack)"}

    def project(self):
        return {"name": f"{self.cfg.get('project') or 'CHG'} (dev stack)", "issueTypes": [{"name": "Change"}]}

    def create_meta(self):
        return {}

    def change_fields(self, meta, window):
        return {}


def fake_oracle():
    from pegasus_connector import oracle

    def catalog(config_path, cache_dir, majors, versions, refresh=False, log=print):
        return dict(CATALOG, checked=time.strftime("%Y-%m-%dT%H:%M:%S+00:00", time.gmtime()))

    def download_patch(config_path, cache_dir, patch, platform, filt, log, mos=None):
        d = Path(cache_dir) / patch
        d.mkdir(parents=True, exist_ok=True)
        (d / f"p{patch}_141200_Generic.zip").write_bytes(b"zip " + patch.encode())
        log(f"Patch {patch}: downloaded (dev stack)\n")
        return sorted(d.iterdir()), mos

    def download_jdk(config_path, cache_dir, version, log):
        d = Path(cache_dir) / f"jdk-{version}"
        d.mkdir(parents=True, exist_ok=True)
        (d / f"jdk-{version}_linux-x64_bin.tar.gz").write_bytes(b"tar " + version.encode())
        log(f"JDK {version}: downloaded (dev stack)\n")
        return sorted(d.iterdir())

    oracle.catalog, oracle.download_patch, oracle.download_jdk = catalog, download_patch, download_jdk


def seed(cp, url):
    """First start only: a client with an inventory, and a registered connector."""
    from pegasus_connector import agent as ag
    import secrets
    import uuid
    cfg = DATA / "connector" / "config.json"
    if cfg.exists():
        return cfg
    c = cp.connect()
    cid = "c_" + uuid.uuid4().hex[:12]
    c.execute("INSERT INTO clients VALUES (?,?,?)", (cid, "Demo University", time.time()))
    rows, problems = cp.parse_inventory(INVENTORY)
    assert not problems, problems
    c.executemany("INSERT INTO servers (client_id, environment, tier, host, ip, role, os_user, domain, env_script, ssh_port) "
                  "VALUES (?,?,?,?,?,?,?,?,?,?)", [(cid, *[s[k] for k in cp.SERVER_COLS]) for s in rows])
    token = "pgr_" + secrets.token_urlsafe(24)
    c.execute("INSERT INTO reg_tokens (token_hash, client_id, created_by, created_at, expires_at) VALUES (?,?,?,?,?)",
              (cp.sha(token), cid, "dev stack", time.time(), time.time() + 3600))
    c.commit()
    c.close()
    key = DATA / "connector" / "id_rsa"
    key.parent.mkdir(parents=True, exist_ok=True)
    key.write_text("not a real key (dev stack)\n")
    ag.register(url, token, str(cfg), "opc", str(key), name="dev-connector")
    print("Seeded: client 'Demo University' with HRDEV and HRPRD, and a registered connector.")
    return cfg


def main():
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--reset", action="store_true", help="delete .dev-stack/ first")
    p.add_argument("--port", type=int, default=8443)
    a = p.parse_args()
    if a.reset and DATA.exists():
        shutil.rmtree(DATA)
    DATA.mkdir(exist_ok=True)
    os.environ.setdefault("PEGASUS_DATA", str(DATA / "control-plane"))
    os.environ.setdefault("PEGASUS_ADMIN_PASSWORD", "dev-setup-password")
    os.environ.setdefault("PEGASUS_COOKIE_SECURE", "false")
    os.environ.setdefault("PEGASUS_STATUS_EVERY", "300")
    os.environ["PEGASUS_PORT"] = str(a.port)
    url = f"http://127.0.0.1:{a.port}"

    from pegasus_cloud import app as cp, jira as jiramod, servicenow as snmod
    jiramod.Jira = DevTickets
    snmod.ServiceNow = DevTickets
    cp.fetch_advisory_page = lambda u: (_ for _ in ()).throw(RuntimeError("not fetched in the dev stack"))
    cp.init_db()
    with cp.app.app_context():
        cpu = cp.ev.cpu_dates()["last"]
        cp.put_setting("_global", "cpu_advisory", {"cpu": cpu, "url": cp.advisory.advisory_url(cpu), "fetched": time.time(),
                                                    "tried": time.time(), "components": ADVISORY,
                                                    "error": "Sample scores (dev stack), not Oracle's."})
    fake_oracle()

    threading.Thread(target=cp.main, daemon=True).start()
    for _ in range(50):
        try:
            import requests
            requests.get(url + "/api/session", timeout=1)
            break
        except Exception:
            time.sleep(0.2)
    cfg = seed(cp, url)

    from pegasus_connector.agent import Agent
    from fakes import FakeServers

    class SlowFake(FakeServers):
        def run(self, *args, **kw):
            time.sleep(0.4)          # feels a bit like real psadmin
            return super().run(*args, **kw)

    print(f"\nOpen {url}/next/  (setup password: {os.environ['PEGASUS_ADMIN_PASSWORD']}). Ctrl+C stops everything.\n")
    try:
        Agent(str(cfg), runner=SlowFake()).run_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

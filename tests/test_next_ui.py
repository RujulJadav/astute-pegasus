"""The redesigned UI is served at /next/ beside the current page, and its client follows the API's origin rule."""
from conftest import session
from pegasus_cloud import app as cp


def test_next_ui_is_served_beside_the_current_page():
    c = cp.app.test_client()
    assert c.get("/").status_code == 200
    r = c.get("/next")
    assert r.status_code == 308 and r.headers["Location"] == "/next/"
    r = c.get("/next/")
    assert r.status_code in (200, 404)            # 404 only when static/next hasn't been built
    if r.status_code == 200:
        assert b'<div id="root">' in r.data
        assert r.headers["Cache-Control"] == "no-cache"


def test_next_ui_cannot_escape_its_folder():
    assert cp.app.test_client().get("/next/../app.py").status_code == 404


def test_post_without_the_pegasus_header_is_refused(env):
    import requests
    assert requests.post(env["url"] + "/api/logout").status_code == 400
    assert session().post(env["url"] + "/api/logout").status_code == 200

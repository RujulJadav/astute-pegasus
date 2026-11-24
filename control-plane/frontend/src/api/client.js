// The one way the UI talks to the Pegasus control plane.
//
// The backend's rules (control-plane/pegasus_cloud/app.py, guard()):
//   * sign-in is a session cookie, so requests go to the same origin (in dev, Vite proxies /api to :8443)
//   * every request other than GET must carry X-Requested-With: pegasus, or it is refused as "Bad request origin"
//
// api() resolves with the JSON body, or rejects with an ApiError carrying the status and the backend's own message.

export class ApiError extends Error {
  constructor(status, body) {
    super((body && body.error) || `The server answered ${status}.`);
    this.status = status;
    this.body = body || {};
  }
}

// Called on any 401 outside the sign-in calls, so the app can drop back to the sign-in screen.
let onSignedOut = null;
export const setSignedOutHandler = (fn) => { onSignedOut = fn; };

const QUIET_401 = ["/api/login", "/api/login/mfa", "/api/mfa/enroll", "/api/setup", "/api/password"];

export async function api(path, { method = "GET", body } = {}) {
  const opt = { method, headers: { "X-Requested-With": "pegasus" }, credentials: "same-origin" };
  if (body !== undefined) {
    opt.headers["Content-Type"] = "application/json";
    opt.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(path, opt);
  } catch {
    throw new ApiError(0, { error: "Can't reach Pegasus. Is the control plane running?" });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && onSignedOut && !QUIET_401.includes(path)) onSignedOut();
    throw new ApiError(res.status, json);
  }
  return json;
}

export const get = (path) => api(path);
export const post = (path, body = {}) => api(path, { method: "POST", body });
export const put = (path, body = {}) => api(path, { method: "PUT", body });
export const del = (path) => api(path, { method: "DELETE" });

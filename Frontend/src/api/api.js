// ============================================================
// ⚡ API CONFIGURATION
// Uses VITE_API_URL if set (e.g. in a .env file), otherwise
// falls back to localhost for local development.
// ============================================================
export const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:5000/api";

// Token stored in memory + mirrored to localStorage by the app
let _authToken = null;
export const setToken = (t) => { _authToken = t; };
export const getToken = () => _authToken;

// ── Session / auth event hooks ──────────────────────────────
// App.jsx registers a callback here so a 401 from any request
// (expired/invalid token) triggers a clean, global logout instead
// of leaving the UI in a broken state.
let _onUnauthorized = null;
export const onUnauthorized = (cb) => { _onUnauthorized = cb; };

// ── Core API Helper ──────────────────────────────────────────
export const api = {
  async request(endpoint, method = "GET", body = null, isFormData = false) {
    const headers = {};
    if (!isFormData) headers["Content-Type"] = "application/json";
    if (getToken()) headers["Authorization"] = `Bearer ${getToken()}`;

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, opts);

      // Session expired / invalid token — fire global handler once
      if (res.status === 401 && endpoint !== "/auth/login" && endpoint !== "/auth/register") {
        if (_onUnauthorized) _onUnauthorized();
      }

      let data = {};
      try { data = await res.json(); } catch { /* empty body */ }

      if (!res.ok) {
        // Rate-limited: surface retry-after info to the caller
        if (res.status === 429) {
          return {
            ok: false,
            status: 429,
            error: data.error || "Too many attempts. Please slow down.",
            retryAfter: data.retryAfter || null,
          };
        }
        return { ok: false, status: res.status, error: data.error || "Request failed" };
      }
      return { ok: true, status: res.status, data };
    } catch (err) {
      console.error(`API ${method} ${endpoint}:`, err.message);
      return { ok: false, status: 0, error: "Network error — check your connection or the server." };
    }
  },

  get:    (ep)       => api.request(ep, "GET"),
  post:   (ep, body) => api.request(ep, "POST",   body),
  put:    (ep, body) => api.request(ep, "PUT",    body),
  delete: (ep, body) => api.request(ep, "DELETE", body),

  uploadImage: (endpoint, file, fieldName = "image") => {
    const fd = new FormData();
    fd.append(fieldName, file);
    return api.request(endpoint, "POST", fd, true);
  },
};

// ── Server URL for images ────────────────────────────────────
export const serverImg = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${API_BASE.replace(/\/api$/, "")}${path}`;
};

// ============================================================
// ⚡ API CONFIGURATION — Change this to your backend URL
// ============================================================
export const API_BASE = "http://localhost:5000/api";

// Token stored in memory
let _authToken = null;
export const setToken = (t) => { _authToken = t; };
export const getToken = () => _authToken;

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return { ok: true, data };
    } catch (err) {
      console.error(`API ${method} ${endpoint}:`, err.message);
      return { ok: false, error: err.message };
    }
  },

  get:    (ep)       => api.request(ep, "GET"),
  post:   (ep, body) => api.request(ep, "POST",   body),
  put:    (ep, body) => api.request(ep, "PUT",    body),
  delete: (ep)       => api.request(ep, "DELETE"),

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
  return `http://localhost:5000${path}`;
};

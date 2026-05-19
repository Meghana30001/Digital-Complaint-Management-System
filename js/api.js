/**
 * js/api.js — DCMS Frontend API Service Layer
 */

function resolveApiBase() {
  if (window.DCMS_API_BASE) return window.DCMS_API_BASE.replace(/\/$/, '');

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '';

  if (isLocal) {
    return `http://${host || 'localhost'}:5005/api`;
  }

  // Deployed static site (e.g. Vercel) — set your hosted API URL here after deploying the server
  if (host.includes('vercel.app') && window.DCMS_PROD_API) {
    return window.DCMS_PROD_API.replace(/\/$/, '');
  }

  return `http://localhost:5005/api`;
}

const API_BASE = resolveApiBase();
window.DCMS_API_BASE = API_BASE;

function formatFetchError(err) {
  const msg = (err && err.message) ? err.message : String(err);
  if (err instanceof TypeError || /failed to fetch|network|load failed/i.test(msg)) {
    return `Cannot reach the API at ${API_BASE}. Start the backend: open a terminal, run "cd server" then "npm run dev", and keep this page on http://localhost:8080 (not file://).`;
  }
  return msg;
}

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('dcmsToken');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      mode: 'cors',
      credentials: 'omit'
    });
  } catch (err) {
    throw new Error(formatFetchError(err));
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

const api = {
  getBaseUrl: () => API_BASE,

  register: (payload) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (email, password, role) =>
    apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password, role })
    }),

  getMe: () => apiFetch('/auth/me'),

  updateMe: (updates) =>
    apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(updates) }),

  changePassword: (currentPassword, newPassword) =>
    apiFetch('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword })
    }),

  getComplaints: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/complaints${qs ? '?' + qs : ''}`);
  },

  getComplaint: (cmpId) => apiFetch(`/complaints/${cmpId}`),

  trackComplaint: async (cmpId) => {
    try {
      const res = await fetch(`${API_BASE}/complaints/track/${encodeURIComponent(cmpId)}`, {
        mode: 'cors'
      });
      return res.json();
    } catch (err) {
      throw new Error(formatFetchError(err));
    }
  },

  createComplaint: (data) =>
    apiFetch('/complaints', { method: 'POST', body: JSON.stringify(data) }),

  updateComplaint: (cmpId, updates) =>
    apiFetch(`/complaints/${cmpId}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  deleteComplaint: (cmpId) =>
    apiFetch(`/complaints/${cmpId}`, { method: 'DELETE' }),

  getStats: () => apiFetch('/complaints/stats'),

  getAnalytics: () => apiFetch('/complaints/analytics'),

  getUsers: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/users${qs ? '?' + qs : ''}`);
  },

  getUserStats: () => apiFetch('/users/stats'),

  createUser: (payload) =>
    apiFetch('/users', { method: 'POST', body: JSON.stringify(payload) }),

  updateUser: (userId, updates) =>
    apiFetch(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  deleteUser: (userId) =>
    apiFetch(`/users/${userId}`, { method: 'DELETE' }),

  health: () => apiFetch('/health'),

  ping: async () => {
    try {
      await api.health();
      return true;
    } catch {
      return false;
    }
  },

  saveToken: (token)  => localStorage.setItem('dcmsToken', token),
  clearToken: ()      => localStorage.removeItem('dcmsToken'),
  getToken: ()        => localStorage.getItem('dcmsToken'),
  hasToken: ()        => !!localStorage.getItem('dcmsToken'),

  decodeToken: () => {
    const token = localStorage.getItem('dcmsToken');
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch { return null; }
  },

  isTokenExpired: () => {
    const payload = api.decodeToken();
    if (!payload) return true;
    return payload.exp * 1000 < Date.now();
  }
};

window.dcmsApi = api;

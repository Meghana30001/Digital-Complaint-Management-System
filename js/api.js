/**
 * js/api.js — DCMS Frontend API Service Layer
 * All fetch() calls to the Express backend.
 * Automatically attaches JWT from localStorage.
 */

const API_BASE = 'http://localhost:5005/api';

// ── Core fetch wrapper ─────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('dcmsToken');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// ── Auth ───────────────────────────────────────────────────
const api = {

  // Register a new user
  register: (payload) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  // Login
  login: (email, password, role) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),

  // Get current user profile
  getMe: () => apiFetch('/auth/me'),

  // Update profile
  updateMe: (updates) =>
    apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(updates) }),

  // ── Complaints ─────────────────────────────────────────

  // Get complaints (role-filtered on server)
  getComplaints: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/complaints${qs ? '?' + qs : ''}`);
  },

  // Get single complaint by CMP ID (authenticated)
  getComplaint: (cmpId) => apiFetch(`/complaints/${cmpId}`),

  // Public complaint tracker — no auth needed
  trackComplaint: (cmpId) =>
    fetch(`${API_BASE}/complaints/track/${cmpId}`)
      .then(r => r.json()),

  // File a new complaint (citizen)
  createComplaint: (data) =>
    apiFetch('/complaints', { method: 'POST', body: JSON.stringify(data) }),

  // Update complaint (officer/admin: status/remarks | citizen: rating)
  updateComplaint: (cmpId, updates) =>
    apiFetch(`/complaints/${cmpId}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  // Delete complaint (admin only)
  deleteComplaint: (cmpId) =>
    apiFetch(`/complaints/${cmpId}`, { method: 'DELETE' }),

  // Dashboard KPI stats
  getStats: () => apiFetch('/complaints/stats'),

  // Health check
  health: () => apiFetch('/health'),

  // ── Token helpers ──────────────────────────────────────

  saveToken: (token)  => localStorage.setItem('dcmsToken', token),
  clearToken: ()      => localStorage.removeItem('dcmsToken'),
  getToken: ()        => localStorage.getItem('dcmsToken'),
  hasToken: ()        => !!localStorage.getItem('dcmsToken'),

  // Decode JWT payload (no verification — just for reading)
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

// Expose globally
window.dcmsApi = api;

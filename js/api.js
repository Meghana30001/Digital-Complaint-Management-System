/**
 * js/api.js — DCMS Frontend API Service Layer
 * All fetch() calls to the Express + MongoDB backend.
 */

const API_BASE = window.DCMS_API_BASE || 'http://localhost:5005/api';
window.DCMS_API_BASE = API_BASE;

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('dcmsToken');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

const api = {
  register: (payload) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),

  login: (email, password, role) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, role }) }),

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

  trackComplaint: (cmpId) =>
    fetch(`${API_BASE}/complaints/track/${encodeURIComponent(cmpId)}`).then(r => r.json()),

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

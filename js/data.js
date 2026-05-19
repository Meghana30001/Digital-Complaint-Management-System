/**
 * js/data.js — DCMS Data Engine
 * MongoDB via Express API; localStorage fallback when offline.
 */

const DCMS_DATA_KEY = 'dcmsComplaints';
const DCMS_COUNTER  = 'dcmsCmpCounter';
const USE_BACKEND   = true;

let _backendOk = null;

function apiBase() {
  return (window.DCMS_API_BASE || 'http://localhost:5005/api').replace(/\/$/, '');
}

async function isBackendReachable() {
  if (_backendOk !== null) return _backendOk;
  if (typeof dcmsApi !== 'undefined' && dcmsApi.ping) {
    _backendOk = await dcmsApi.ping();
    return _backendOk;
  }
  try {
    const r = await fetch(`${apiBase()}/health`, { signal: AbortSignal.timeout(5000), mode: 'cors' });
    _backendOk = r.ok;
  } catch {
    _backendOk = false;
  }
  return _backendOk;
}

function canUseApi() {
  return USE_BACKEND && typeof dcmsApi !== 'undefined' && typeof isLoggedIn === 'function'
    && isLoggedIn() && dcmsApi.hasToken() && !dcmsApi.isTokenExpired();
}

function fmtDate(d) {
  if (!d) return '';
  if (typeof d === 'string' && d.length === 10 && d.includes('-')) return d;
  const dt = new Date(d);
  return isNaN(dt) ? String(d).split('T')[0] : dt.toISOString().split('T')[0];
}

function refId(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  return val._id ? String(val._id) : (val.userId || null);
}

/** Normalize MongoDB complaint → UI shape (id = cmpId). */
function normalizeComplaint(c) {
  if (!c) return null;
  const id = c.cmpId || c.id;
  return {
    ...c,
    id,
    cmpId: id,
    citizenId: refId(c.citizenId),
    citizenName: c.citizenName || (c.citizenId && c.citizenId.name) || '',
    officerId: refId(c.officerId),
    date: fmtDate(c.date || c.createdAt),
    resolvedDate: c.resolvedDate ? fmtDate(c.resolvedDate) : null
  };
}

function normalizeList(list) {
  return (list || []).map(normalizeComplaint).filter(Boolean);
}

const DEPT_MAP = {
  'Infrastructure':        'Infrastructure Dept.',
  'Billing & Payments':    'Billing & Finance',
  'Roads & Transport':     'Roads & Transport',
  'Utilities (Water/Power)': 'Utilities Dept.',
  'Sanitation':            'Sanitation Dept.',
  'Health Services':       'Health & Safety',
  'Education':             'Education Dept.',
  'Security / Safety':     'General Admin',
  'Other':                 'General Admin',
  'Roads':                 'Roads & Transport',
  'Utilities':             'Utilities Dept.',
  'Water Supply':          'Utilities Dept.',
  'Billing':               'Billing & Finance',
  'Health':                'Health & Safety',
  'Environment':           'Environment Dept.'
};

/* ── localStorage seed (offline demo) ── */
function dcmsSeedData() {
  if (localStorage.getItem(DCMS_DATA_KEY)) return;
  const seed = [
    { id:'CMP-2401001', title:'Pothole on MG Road near Silk Board junction', category:'Roads & Transport', dept:'Roads & Transport', description:'Deep pothole on MG Road.', priority:'high', status:'resolved', citizenName:'Arjun Sharma', citizenId:'USR-1040', officerId:'USR-0218', date:'2024-01-08', resolvedDate:'2024-01-21', rating:4, remarks:'Pothole filled.', location:'MG Road, Bengaluru' }
  ];
  localStorage.setItem(DCMS_DATA_KEY, JSON.stringify(seed));
  localStorage.setItem(DCMS_COUNTER, '5000');
}

async function dcmsGetComplaints(params = {}) {
  if (canUseApi()) {
    try {
      if (await isBackendReachable()) {
        const res = await dcmsApi.getComplaints(params);
        return normalizeList(res.complaints);
      }
    } catch (e) {
      console.warn('API getComplaints failed:', e.message);
    }
  }
  dcmsSeedData();
  try {
    return normalizeList(JSON.parse(localStorage.getItem(DCMS_DATA_KEY)) || []);
  } catch {
    return [];
  }
}

async function dcmsGetMyComplaints() {
  const u = typeof dcmsGetUser === 'function' ? dcmsGetUser() : null;
  if (canUseApi()) {
    try {
      if (await isBackendReachable()) return await dcmsGetComplaints();
    } catch (e) {
      console.warn('API getMyComplaints failed:', e.message);
    }
  }
  const all = await dcmsGetComplaints();
  if (!u) return all;
  return all.filter(c =>
    c.citizenId === u.id || c.citizenId === u.userId || c.citizenId === String(u._id)
  );
}

async function dcmsAddComplaint(data) {
  if (canUseApi()) {
    try {
      if (await isBackendReachable()) {
        const res = await dcmsApi.createComplaint(data);
        return normalizeComplaint(res.complaint);
      }
    } catch (e) {
      console.warn('API createComplaint failed:', e.message);
      throw e;
    }
  }
  const list = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  const u = dcmsGetUser();
  const n = parseInt(localStorage.getItem(DCMS_COUNTER) || '5000', 10) + 1;
  localStorage.setItem(DCMS_COUNTER, String(n));
  const complaint = normalizeComplaint({
    id: 'CMP-' + n, ...data,
    status: 'open', citizenName: u ? u.name : 'Anonymous',
    citizenId: u ? (u.id || u.userId) : null, officerId: null,
    date: new Date().toISOString().split('T')[0],
    resolvedDate: null, rating: null, remarks: ''
  });
  list.unshift(complaint);
  localStorage.setItem(DCMS_DATA_KEY, JSON.stringify(list));
  return complaint;
}

async function dcmsUpdateComplaint(id, changes) {
  const cmpId = id;
  if (canUseApi()) {
    try {
      if (await isBackendReachable()) {
        const res = await dcmsApi.updateComplaint(cmpId, changes);
        return normalizeComplaint(res.complaint);
      }
    } catch (e) {
      console.warn('API updateComplaint failed:', e.message);
      throw e;
    }
  }
  const list = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  const idx = list.findIndex(c => c.id === cmpId || c.cmpId === cmpId);
  if (idx === -1) return null;
  Object.assign(list[idx], changes);
  if (changes.status === 'resolved' && !list[idx].resolvedDate)
    list[idx].resolvedDate = new Date().toISOString().split('T')[0];
  localStorage.setItem(DCMS_DATA_KEY, JSON.stringify(list));
  return normalizeComplaint(list[idx]);
}

async function dcmsGetComplaintById(id) {
  if (canUseApi()) {
    try {
      if (await isBackendReachable()) {
        const res = await dcmsApi.getComplaint(id);
        return normalizeComplaint(res.complaint);
      }
    } catch (e) {
      console.warn('API getComplaint failed:', e.message);
    }
  }
  const list = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  const c = list.find(x => x.id === id || x.cmpId === id);
  return normalizeComplaint(c);
}

async function dcmsTrackComplaint(cmpId) {
  if (typeof dcmsApi !== 'undefined') {
    try {
      if (await isBackendReachable()) {
        const res = await dcmsApi.trackComplaint(cmpId);
        if (!res.success) return null;
        return normalizeComplaint(res.complaint);
      }
    } catch (e) {
      console.warn('API track failed:', e.message);
    }
  }
  const list = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  const c = list.find(x => x.id === cmpId || x.cmpId === cmpId);
  return normalizeComplaint(c);
}

async function dcmsGetStats() {
  if (canUseApi()) {
    try {
      if (await isBackendReachable()) {
        const res = await dcmsApi.getStats();
        return res.stats;
      }
    } catch (e) {
      console.warn('API getStats failed:', e.message);
    }
  }
  const all = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  return {
    total: all.length,
    open: all.filter(c => c.status === 'open').length,
    inProgress: all.filter(c => c.status === 'in-progress').length,
    resolved: all.filter(c => c.status === 'resolved').length,
    escalated: all.filter(c => c.status === 'escalated').length
  };
}

async function dcmsGetAnalytics() {
  if (canUseApi()) {
    try {
      if (await isBackendReachable()) {
        const res = await dcmsApi.getAnalytics();
        return res.analytics;
      }
    } catch (e) {
      console.warn('API analytics failed:', e.message);
    }
  }
  return null;
}

async function dcmsDeleteComplaint(cmpId) {
  if (canUseApi()) {
    try {
      if (await isBackendReachable()) {
        await dcmsApi.deleteComplaint(cmpId);
        return true;
      }
    } catch (e) {
      throw e;
    }
  }
  const list = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  const filtered = list.filter(c => c.id !== cmpId && c.cmpId !== cmpId);
  localStorage.setItem(DCMS_DATA_KEY, JSON.stringify(filtered));
  return true;
}

function dcmsGetComplaintsSync() {
  dcmsSeedData();
  try {
    return normalizeList(JSON.parse(localStorage.getItem(DCMS_DATA_KEY)) || []);
  } catch {
    return [];
  }
}

const DCMS_REAL_STATS = {
  year: 2024, source: 'CPGRAMS / DARPG India',
  totalReceived: 2923000, totalResolved: 2646000,
  resolutionRate: 90.5, avgDisposalDays: 15
};

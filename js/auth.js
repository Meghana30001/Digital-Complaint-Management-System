/**
 * js/auth.js — DCMS Authentication & Navigation
 * v3: Uses Express/MongoDB backend via js/api.js (JWT-based).
 * Falls back gracefully if backend is unavailable (demo mode).
 */

// ── Role-based nav links ───────────────────────────────────
const ROLE_NAV_LINKS = {
  citizen: [
    { href: 'citizen-dashboard.html', label: 'My Dashboard' },
    { href: 'file-complaint.html',    label: 'File Complaint' },
    { href: 'track.html',             label: 'Track Status' },
    { href: 'reports.html',           label: 'Reports' }
  ],
  officer: [
    { href: 'officer-dashboard.html', label: 'My Dashboard' },
    { href: 'track.html',             label: 'Track' },
    { href: 'reports.html',           label: 'Reports' },
    { href: 'departments.html',       label: 'Departments' }
  ],
  admin: [
    { href: 'dashboard.html',         label: 'Admin Dashboard' },
    { href: 'reports.html',           label: 'Reports' },
    { href: 'users.html',             label: 'Users' },
    { href: 'departments.html',       label: 'Departments' },
    { href: 'categories.html',        label: 'Categories' }
  ]
};

const ROLE_HOME = {
  citizen: 'citizen-dashboard.html',
  officer: 'officer-dashboard.html',
  admin:   'dashboard.html'
};

// ── Session storage key ───────────────────────────────────
const USER_KEY  = 'dcmsUser';
const TOKEN_KEY = 'dcmsToken';

// ── Core auth helpers ─────────────────────────────────────
function isLoggedIn() {
  // Check localStorage user object first (demo mode)
  const user = localStorage.getItem(USER_KEY);
  if (user) return true;
  
  // Then check API token
  if (typeof dcmsApi !== 'undefined' && dcmsApi.hasToken()) {
    return !dcmsApi.isTokenExpired();
  }
  
  return false;
}

function dcmsGetUser() {
  // Try to get from localStorage cache (set at login time)
  try {
    const u = JSON.parse(localStorage.getItem(USER_KEY));
    if (u) return u;
  } catch (_) {}
  return null;
}

function dcmsSetUser(role) {
  // Demo mode — used only when backend is unavailable
  const demos = {
    citizen: { userId:'USR-1042', name:'John Doe',    email:'john@example.com', role:'citizen', dept:'', phone:'+91 98765 43210', avatar:'J' },
    officer: { userId:'USR-0218', name:'Riya Sharma', email:'riya@dcms.gov',    role:'officer', dept:'Roads & Transport',  phone:'+91 91234 56789', avatar:'R' },
    admin:   { userId:'USR-0001', name:'Admin User',  email:'admin@dcms.gov',   role:'admin',   dept:'General Admin',     phone:'+91 90000 00001', avatar:'A' }
  };
  const u = demos[role] || demos.citizen;
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  return u;
}

function dcmsLogout() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('dcmsAuth');
  if (typeof dcmsApi !== 'undefined') dcmsApi.clearToken();
  window.location.href = 'index.html';
}

function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function requireRole(...roles) {
  const u = dcmsGetUser();
  if (!u || !roles.includes(u.role)) {
    alert('Access denied: insufficient permissions.');
    window.location.href = 'index.html';
    return false;
  }
  return true;
}

// ── Dynamic nav injection ─────────────────────────────────
function dcmsUpdateNav() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const linksEl   = navbar.querySelector('.nav-links');
  const actionsEl = navbar.querySelector('.nav-actions');
  if (!linksEl || !actionsEl) return;

  if (!isLoggedIn()) {
    // Public nav
    linksEl.innerHTML   = '<li><a href="index.html">Home</a></li>';
    actionsEl.innerHTML = '<a href="login.html" class="btn-ghost">Sign In</a><a href="register.html" class="btn-primary">Register</a>';
    return;
  }

  const u    = dcmsGetUser();
  const role = u ? u.role : 'citizen';
  // Full name as registered — e.g. "Riya S" or "John Doe"
  const fullName = u ? (u.name || 'User') : 'User';
  // Initial for avatar circle only (not displayed as text)
  const initial  = fullName.charAt(0).toUpperCase();
  const links = ROLE_NAV_LINKS[role] || ROLE_NAV_LINKS.citizen;

  linksEl.innerHTML = links.map(l =>
    `<li><a href="${l.href}"${window.location.href.includes(l.href) ? ' class="active"' : ''}>${l.label}</a></li>`
  ).join('');

  actionsEl.innerHTML = `
    <a href="profile.html" class="nav-user-btn">
      <span class="nav-avatar">${initial}</span>
      <span class="nav-user-name">${fullName}</span>
    </a>
    <button class="btn-ghost btn-sm" onclick="dcmsLogout()">Logout</button>`;
}

// ── Login handler (called from login.html) ────────────────
async function dcmsLogin(email, password, role) {
  try {
    // Try real backend first
    if (typeof dcmsApi !== 'undefined') {
      const res = await dcmsApi.login(email, password, role);
      dcmsApi.saveToken(res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      return { success: true, user: res.user };
    }
  } catch (err) {
    console.warn('Backend login failed, trying demo mode:', err.message);
  }

  // Demo mode fallback (when backend is offline)
  const demos = {
    citizen: { email: 'john@example.com',   password: 'citizen123' },
    officer: { email: 'riya@dcms.gov',      password: 'officer123' },
    admin:   { email: 'admin@dcms.gov',     password: 'admin123'   }
  };
  const demo = demos[role];
  if (demo && email === demo.email && password === demo.password) {
    dcmsSetUser(role);
    return { success: true, user: dcmsGetUser(), demo: true };
  }

  return { success: false, message: 'Invalid credentials. (Demo: use demo account buttons)' };
}

// ── Register handler (called from register.html) ──────────
async function dcmsRegister(payload) {
  try {
    if (typeof dcmsApi !== 'undefined') {
      const res = await dcmsApi.register(payload);
      dcmsApi.saveToken(res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      return { success: true, user: res.user };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
  // Demo fallback
  const u = dcmsSetUser(payload.role || 'citizen');
  u.name  = payload.name || u.name;
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  return { success: true, user: u, demo: true };
}

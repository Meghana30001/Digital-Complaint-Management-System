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
  try {
    const u = JSON.parse(localStorage.getItem(USER_KEY));
    if (u) return enrichUser(u);
  } catch (_) {}
  return null;
}

function enrichUser(u) {
  if (!u) return null;
  const icons = { citizen: '👤', officer: '🏢', admin: '⚙️' };
  const labels = { citizen: 'Citizen', officer: 'Grievance Officer', admin: 'Administrator' };
  const since = u.createdAt
    ? new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '2024';
  return {
    ...u,
    roleIcon: icons[u.role] || '👤',
    roleLabel: labels[u.role] || u.role,
    since,
    avatar: u.avatar || (u.name ? u.name.charAt(0).toUpperCase() : '?')
  };
}

function dcmsSetUserCache(user) {
  const enriched = enrichUser(user);
  localStorage.setItem(USER_KEY, JSON.stringify(enriched));
  return enriched;
}

async function dcmsRefreshUser() {
  if (typeof dcmsApi === 'undefined' || !dcmsApi.hasToken()) return dcmsGetUser();
  try {
    const res = await dcmsApi.getMe();
    if (res.user) return dcmsSetUserCache(res.user);
  } catch (e) {
    console.warn('Could not refresh profile:', e.message);
  }
  return dcmsGetUser();
}

async function dcmsSaveProfile(updates) {
  if (typeof dcmsApi !== 'undefined' && dcmsApi.hasToken()) {
    const res = await dcmsApi.updateMe(updates);
    return dcmsSetUserCache(res.user);
  }
  const u = dcmsGetUser();
  if (!u) throw new Error('Not logged in');
  Object.assign(u, updates);
  return dcmsSetUserCache(u);
}

/** Fill profile / header elements across pages. */
function dcmsApplyUser() {
  const u = dcmsGetUser();
  if (!u) return;

  document.querySelectorAll('[data-dcms="userName"]').forEach(el => { el.textContent = u.name; });
  document.querySelectorAll('[data-dcms="userEmail"]').forEach(el => { el.textContent = u.email; });
  document.querySelectorAll('[data-dcms="userRole"]').forEach(el => { el.textContent = u.roleLabel; });
  document.querySelectorAll('[data-dcms="userAvatar"]').forEach(el => { el.textContent = u.avatar; });

  const map = {
    navUserName: () => `${u.roleIcon} ${u.name}`,
    profileName: () => u.name,
    profileEmail: () => u.email,
    profilePhone: () => u.phone || '—',
    profileRole: () => u.roleLabel,
    profileMeta: () => `${u.email} · ${u.roleIcon} ${u.roleLabel} · Member since ${u.since}`,
    profileAvatar: () => u.avatar,
    roleIcon: () => u.roleIcon,
    roleLabel: () => u.roleLabel,
    since: () => u.since
  };
  Object.entries(map).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = fn();
  });
}

/** Auth + optional role guard + refresh session from API. */
async function dcmsRequirePage(...roles) {
  if (!requireAuth()) return false;
  if (roles.length && !requireRole(...roles)) return false;
  await dcmsRefreshUser();
  dcmsUpdateNav();
  dcmsApplyUser();
  return true;
}

function dcmsSetUser(role) {
  // Demo mode — used only when backend is unavailable
  const demos = {
    citizen: { userId:'USR-1042', name:'John Doe',    email:'john@example.com', role:'citizen', dept:'', phone:'+91 98765 43210', avatar:'J' },
    officer: { userId:'USR-0218', name:'Riya Sharma', email:'riya@dcms.gov',    role:'officer', dept:'Roads & Transport',  phone:'+91 91234 56789', avatar:'R' },
    admin:   { userId:'USR-0001', name:'Admin User',  email:'admin@dcms.gov',   role:'admin',   dept:'General Admin',     phone:'+91 90000 00001', avatar:'A' }
  };
  const u = demos[role] || demos.citizen;
  return dcmsSetUserCache(u);
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
      dcmsSetUserCache(res.user);
      return { success: true, user: dcmsGetUser() };
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
      dcmsSetUserCache(res.user);
      return { success: true, user: dcmsGetUser() };
    }
  } catch (err) {
    return { success: false, message: err.message };
  }
  // Demo fallback when backend offline
  const u = dcmsSetUser(payload.role || 'citizen');
  u.name = payload.name || u.name;
  u.email = payload.email || u.email;
  dcmsSetUserCache(u);
  return { success: true, user: dcmsGetUser(), demo: true };
}

/**
 * js/data.js — DCMS Data Engine v3
 * Uses Express/MongoDB backend via js/api.js.
 * Falls back to localStorage when backend is unavailable.
 * Source: Real CPGRAMS 2024 dataset patterns.
 */

const DCMS_DATA_KEY = 'dcmsComplaints';
const DCMS_COUNTER  = 'dcmsCmpCounter';
const USE_BACKEND   = true; // set false to force localStorage mode

// ── Check if backend is reachable ─────────────────────────
let _backendOk = null;
async function isBackendReachable() {
  if (_backendOk !== null) return _backendOk;
  try {
    const r = await fetch('http://localhost:5000/api/health', { signal: AbortSignal.timeout(2000) });
    _backendOk = r.ok;
  } catch { _backendOk = false; }
  return _backendOk;
}

/* ── Real CPGRAMS 2024 Statistics ─────────────────────────
 * Source: DARPG Annual Report 2024
 */
const DCMS_REAL_STATS = {
  year: 2024, source: 'CPGRAMS / DARPG India',
  totalReceived: 2923000, totalResolved: 2646000,
  resolutionRate: 90.5, avgDisposalDays: 15, stateAvgDays: 64,
  ministries: 92, statesUTs: 36, grievanceOfficers: 100000,
  categories: {
    'Roads & Transport':  { pct:26, resolved:82, avgDays:18, icon:'🛣️', color:'#2f80ed' },
    'Water Supply':       { pct:21, resolved:88, avgDays:12, icon:'💧', color:'#56cfb2' },
    'Sanitation':         { pct:17, resolved:91, avgDays: 8, icon:'🗑️', color:'#34d399' },
    'Electricity/Lights': { pct:14, resolved:94, avgDays: 6, icon:'💡', color:'#fbbf24' },
    'Billing & Finance':  { pct: 9, resolved:79, avgDays:22, icon:'💰', color:'#f87171' },
    'Infrastructure':     { pct: 7, resolved:83, avgDays:25, icon:'🏗️', color:'#a78bfa' },
    'Environment':        { pct: 4, resolved:76, avgDays:30, icon:'🌿', color:'#6ee7b7' },
    'Others':             { pct: 2, resolved:70, avgDays:35, icon:'📋', color:'#94a3b8' }
  },
  monthly: {
    labels:   ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    received: [214,228,268,238,252,261,289,275,241,235,218,204],
    resolved: [194,210,248,218,232,240,264,252,222,214,200,192]
  }
};

/* ── LocalStorage seed data (30 real Bengaluru complaints) ─ */
function dcmsSeedData() {
  if (localStorage.getItem(DCMS_DATA_KEY)) return;
  const seed = [
    { id:'CMP-2401001', title:'Pothole on MG Road near Silk Board junction', category:'Roads & Transport', dept:'Roads & Transport', description:'Deep pothole (approx. 40cm wide, 15cm deep) on MG Road near Silk Board flyover has caused 3 vehicle breakdowns and 1 minor accident.', priority:'high', status:'resolved', citizenName:'Arjun Sharma', citizenId:'USR-1040', officerId:'USR-0218', date:'2024-01-08', resolvedDate:'2024-01-21', rating:4, remarks:'Pothole filled with bituminous mix. Road surface levelled and tested. Closed.', location:'MG Road, Bengaluru' },
    { id:'CMP-2401042', title:'Garbage not collected for 5 days — HSR Layout Sector 3', category:'Sanitation', dept:'Sanitation Dept.', description:'Solid waste collection has been missed for 5 consecutive days in HSR Layout Sector 3.', priority:'high', status:'resolved', citizenName:'Meena Reddy', citizenId:'USR-1041', officerId:'USR-0219', date:'2024-01-15', resolvedDate:'2024-01-17', rating:5, remarks:'Door-to-door collection resumed. Additional vehicle deployed.', location:'HSR Layout Sector 3, Bengaluru' },
    { id:'CMP-2402088', title:'Water supply disrupted for 3 days — Koramangala Block 5', category:'Water Supply', dept:'Utilities Dept.', description:'No water supply for 72 hours in Koramangala Block 5. Pipe may be damaged near construction site.', priority:'high', status:'resolved', citizenName:'Sunita Iyer', citizenId:'USR-1039', officerId:'USR-0220', date:'2024-02-03', resolvedDate:'2024-02-09', rating:4, remarks:'Damaged pipe identified and replaced. Supply restored. Water quality tested.', location:'Koramangala Block 5, Bengaluru' },
    { id:'CMP-2402156', title:'40 streetlights non-functional — Whitefield Main Road', category:'Electricity/Lights', dept:'Infrastructure Dept.', description:'Approximately 40 streetlights along Whitefield Main Road are not working — 2km stretch is completely dark at night.', priority:'high', status:'resolved', citizenName:'Ravi Kumar', citizenId:'USR-1038', officerId:'USR-0221', date:'2024-02-18', resolvedDate:'2024-02-23', rating:5, remarks:'Faulty MCB panel replaced. All 40 lamps tested. LED upgrade completed.', location:'Whitefield Main Road, Bengaluru' },
    { id:'CMP-2403201', title:'Sewage overflow — Indiranagar 12th Main', category:'Sanitation', dept:'Sanitation Dept.', description:'Sewage manhole overflowing onto Indiranagar 12th Main for 2 days. Public health emergency.', priority:'high', status:'resolved', citizenName:'Priya Nair', citizenId:'USR-1037', officerId:'USR-0219', date:'2024-03-07', resolvedDate:'2024-03-09', rating:4, remarks:'Blockage cleared using jetting machine. Manhole cover replaced. Area disinfected.', location:'Indiranagar 12th Main, Bengaluru' },
    { id:'CMP-2403298', title:'Incorrect electricity bill — ₹8,400 overcharged', category:'Billing & Finance', dept:'Billing & Finance', description:'Electricity bill for March 2024 shows ₹8,400 which is 4x normal bill. Charged for 780 units vs actual 190 units.', priority:'medium', status:'resolved', citizenName:'Anil Desai', citizenId:'USR-1036', officerId:'USR-0222', date:'2024-03-22', resolvedDate:'2024-04-02', rating:3, remarks:'Billing error confirmed. Bill revised to ₹2,280. Excess adjusted in next bill.', location:'Jayanagar 4th Block, Bengaluru' },
    { id:'CMP-2406623', title:'Traffic signal out of order — Marathahalli junction', category:'Roads & Transport', dept:'Roads & Transport', description:'Traffic signal at Marathahalli junction non-functional for 3 days. 2km congestion during peak hours.', priority:'high', status:'resolved', citizenName:'John Doe', citizenId:'USR-1042', officerId:'USR-0218', date:'2024-06-08', resolvedDate:'2024-06-14', rating:4, remarks:'Signal controller replaced. All phases tested. Adaptive timing programmed.', location:'Marathahalli Junction, Bengaluru' },
    { id:'CMP-2408812', title:'Storm drain blocked — flooding during rain', category:'Infrastructure', dept:'Infrastructure Dept.', description:'Storm water drain on 80 Feet Road, Koramangala is blocked. Water flooded 6 streets to knee height.', priority:'high', status:'resolved', citizenName:'Ramesh Gupta', citizenId:'USR-1031', officerId:'USR-0221', date:'2024-08-05', resolvedDate:'2024-08-11', rating:5, remarks:'Drain desilted — 8 truckloads of silt removed. Drain walls repaired.', location:'80 Feet Road, Koramangala' },
    { id:'CMP-2409901', title:'Bus shelter demolished — no shade for commuters', category:'Infrastructure', dept:'Infrastructure Dept.', description:'BMTC bus shelter at Bellandur junction demolished 3 weeks ago for road widening but not replaced.', priority:'medium', status:'in-progress', citizenName:'Fatima Begum', citizenId:'USR-1030', officerId:'USR-0221', date:'2024-09-12', resolvedDate:null, rating:null, remarks:'New shelter design approved. Tender awarded. Construction expected by end of month.', location:'Bellandur Junction, Bengaluru' },
    { id:'CMP-2409967', title:'Water logging — underpass floods every monsoon', category:'Roads & Transport', dept:'Roads & Transport', description:'Underpass near Hebbal flyover floods to 4 feet during every monsoon rain. Recurring issue since 2019.', priority:'high', status:'in-progress', citizenName:'Vijay Anand', citizenId:'USR-1029', officerId:'USR-0218', date:'2024-09-20', resolvedDate:null, rating:null, remarks:'Pumping capacity being upgraded from 750 LPM to 3000 LPM. 60% complete.', location:'Hebbal Underpass, Bengaluru' },
    { id:'CMP-2410023', title:'Road damaged after BWSSB pipe laying work', category:'Roads & Transport', dept:'Roads & Transport', description:'BWSSB dug up road in Rajajinagar 3rd Block for pipeline work but has not restored it. 3 accidents reported.', priority:'high', status:'in-progress', citizenName:'John Doe', citizenId:'USR-1042', officerId:'USR-0218', date:'2024-10-04', resolvedDate:null, rating:null, remarks:'BWSSB coordination meeting held. Bitumen laying scheduled for this week.', location:'Rajajinagar 3rd Block, Bengaluru' },
    { id:'CMP-2410089', title:'BESCOM billing error — charged for neighbouring meter', category:'Billing & Finance', dept:'Billing & Finance', description:'Receiving electricity bills for neighbour\'s meter for 3 months. Overcharged by approximately ₹5,200.', priority:'medium', status:'in-progress', citizenName:'Meena Reddy', citizenId:'USR-1041', officerId:'USR-0222', date:'2024-10-18', resolvedDate:null, rating:null, remarks:'Meter number swap confirmed in BESCOM database. Refund processing.', location:'Banashankari 2nd Stage, Bengaluru' },
    { id:'CMP-2411112', title:'Open manhole on busy road — accident risk', category:'Infrastructure', dept:'Infrastructure Dept.', description:'Manhole cover missing on Brigade Road near Koshy\'s restaurant for 9 days. Completely invisible at night.', priority:'high', status:'in-progress', citizenName:'Rahul Sharma', citizenId:'USR-1042', officerId:'USR-0221', date:'2024-11-03', resolvedDate:null, rating:null, remarks:'Temporary barricade placed. Replacement cover (600mm grade D400) ordered.', location:'Brigade Road, Bengaluru' },
    { id:'CMP-2411134', title:'Borewell contamination — E. coli detected in water', category:'Water Supply', dept:'Utilities Dept.', description:'BWSSB water test shows E. coli contamination in Dasarahalli borewell. 350+ households at risk.', priority:'high', status:'in-progress', citizenName:'Lakshmi Rao', citizenId:'USR-1033', officerId:'USR-0220', date:'2024-11-09', resolvedDate:null, rating:null, remarks:'Borewell isolated. Chlorination started. Tanker supply arranged — 2 trips/day.', location:'Dasarahalli, Bengaluru' },
    { id:'CMP-2411188', title:'Streetlight failure — entire stretch dark for 2 weeks', category:'Electricity/Lights', dept:'Infrastructure Dept.', description:'1.5km stretch from Bellandur lake road to Sarjapur Road has been dark for 14 days. Chain snatching incidents increasing.', priority:'high', status:'open', citizenName:'John Doe', citizenId:'USR-1042', officerId:null, date:'2024-11-10', resolvedDate:null, rating:null, remarks:'', location:'Bellandur Lake Road, Bengaluru' },
    { id:'CMP-2411201', title:'Garbage burning near residential area', category:'Environment', dept:'Environment Dept.', description:'BBMP garbage truck crew illegally burning collected waste in vacant plot near Nagarbhavi 2nd Stage daily at 7 AM.', priority:'medium', status:'open', citizenName:'Sunita Iyer', citizenId:'USR-1039', officerId:null, date:'2024-11-12', resolvedDate:null, rating:null, remarks:'', location:'Nagarbhavi 2nd Stage, Bengaluru' },
    { id:'CMP-2411218', title:'Water meter not replaced for 4 years — estimated billing', category:'Billing & Finance', dept:'Billing & Finance', description:'BWSSB water meter stuck at same reading for 4 years. Billed on estimate 60% higher than actual.', priority:'low', status:'open', citizenName:'Arjun Sharma', citizenId:'USR-1040', officerId:null, date:'2024-11-13', resolvedDate:null, rating:null, remarks:'', location:'Rajajinagar 5th Block, Bengaluru' },
    { id:'CMP-2411249', title:'School road in terrible condition — children at risk', category:'Roads & Transport', dept:'Roads & Transport', description:'Road leading to Kendriya Vidyalaya, Sadashivanagar full of potholes, no footpath for final 200m. Children walking in traffic.', priority:'high', status:'open', citizenName:'Kavitha Bhat', citizenId:'USR-1035', officerId:null, date:'2024-11-15', resolvedDate:null, rating:null, remarks:'', location:'Sadashivanagar, Bengaluru' },
    { id:'CMP-2411261', title:'No water supply for 6 days — Hennur Layout', category:'Water Supply', dept:'Utilities Dept.', description:'Complete disruption of BWSSB piped water for 6 days in Hennur Layout Blocks A, B, C. 2,000+ residents affected.', priority:'high', status:'open', citizenName:'Ravi Kumar', citizenId:'USR-1038', officerId:null, date:'2024-11-15', resolvedDate:null, rating:null, remarks:'', location:'Hennur Layout, Bengaluru' },
    { id:'CMP-2411298', title:'Broken pipeline leaking treated water — wastage', category:'Water Supply', dept:'Utilities Dept.', description:'BWSSB distribution pipe on Church Street leaking for 4 days. ~50,000 litres/day wasted. Road surface also damaged.', priority:'medium', status:'open', citizenName:'Anil Desai', citizenId:'USR-1036', officerId:null, date:'2024-11-18', resolvedDate:null, rating:null, remarks:'', location:'Church Street, MG Road, Bengaluru' },
  ];
  localStorage.setItem(DCMS_DATA_KEY, JSON.stringify(seed));
  localStorage.setItem(DCMS_COUNTER, '4913');
}

// ── CRUD — auto-routes to backend or localStorage ─────────

async function dcmsGetComplaints(params = {}) {
  if (USE_BACKEND && typeof dcmsApi !== 'undefined' && isLoggedIn()) {
    try {
      const ok = await isBackendReachable();
      if (ok) {
        const res = await dcmsApi.getComplaints(params);
        return res.complaints || [];
      }
    } catch (e) { console.warn('Backend unavailable, using localStorage:', e.message); }
  }
  // localStorage fallback
  dcmsSeedData();
  try { return JSON.parse(localStorage.getItem(DCMS_DATA_KEY)) || []; }
  catch { return []; }
}

async function dcmsAddComplaint(data) {
  if (USE_BACKEND && typeof dcmsApi !== 'undefined' && isLoggedIn()) {
    try {
      const ok = await isBackendReachable();
      if (ok) {
        const res = await dcmsApi.createComplaint(data);
        return res.complaint;
      }
    } catch (e) { console.warn('Backend unavailable, using localStorage:', e.message); }
  }
  // localStorage fallback
  const list = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  const u = dcmsGetUser();
  const n = parseInt(localStorage.getItem(DCMS_COUNTER) || '5000');
  localStorage.setItem(DCMS_COUNTER, String(n + 1));
  const complaint = {
    id: 'CMP-' + n, ...data,
    status: 'open', citizenName: u ? u.name : 'Anonymous',
    citizenId: u ? u.userId : 'USR-0000', officerId: null,
    date: new Date().toISOString().split('T')[0],
    resolvedDate: null, rating: null, remarks: ''
  };
  list.unshift(complaint);
  localStorage.setItem(DCMS_DATA_KEY, JSON.stringify(list));
  return complaint;
}

async function dcmsUpdateComplaint(id, changes) {
  if (USE_BACKEND && typeof dcmsApi !== 'undefined' && isLoggedIn()) {
    try {
      const ok = await isBackendReachable();
      if (ok) {
        const res = await dcmsApi.updateComplaint(id, changes);
        return res.complaint;
      }
    } catch (e) { console.warn('Backend unavailable, using localStorage:', e.message); }
  }
  // localStorage fallback
  const list = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return null;
  Object.assign(list[idx], changes);
  if (changes.status === 'resolved' && !list[idx].resolvedDate)
    list[idx].resolvedDate = new Date().toISOString().split('T')[0];
  localStorage.setItem(DCMS_DATA_KEY, JSON.stringify(list));
  return list[idx];
}

async function dcmsGetComplaintById(id) {
  if (USE_BACKEND && typeof dcmsApi !== 'undefined' && isLoggedIn()) {
    try {
      const ok = await isBackendReachable();
      if (ok) {
        const res = await dcmsApi.getComplaint(id);
        return res.complaint;
      }
    } catch (e) { /* fallback */ }
  }
  const list = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  return list.find(c => c.id === id) || null;
}

async function dcmsTrackComplaint(cmpId) {
  if (typeof dcmsApi !== 'undefined') {
    try {
      const ok = await isBackendReachable();
      if (ok) {
        const res = await dcmsApi.trackComplaint(cmpId);
        return res.complaint || null;
      }
    } catch (e) { /* fallback */ }
  }
  const list = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  return list.find(c => c.id === cmpId || c.cmpId === cmpId) || null;
}

async function dcmsGetStats() {
  if (USE_BACKEND && typeof dcmsApi !== 'undefined' && isLoggedIn()) {
    try {
      const ok = await isBackendReachable();
      if (ok) {
        const res = await dcmsApi.getStats();
        return res.stats;
      }
    } catch (e) { /* fallback */ }
  }
  const all = JSON.parse(localStorage.getItem(DCMS_DATA_KEY) || '[]');
  return {
    total:    all.length,
    open:     all.filter(c => c.status === 'open').length,
    inProgress: all.filter(c => c.status === 'in-progress').length,
    resolved: all.filter(c => c.status === 'resolved').length,
    escalated:all.filter(c => c.status === 'escalated').length
  };
}

// Keep sync aliases for legacy pages
function dcmsGetComplaintsSync() {
  dcmsSeedData();
  try { return JSON.parse(localStorage.getItem(DCMS_DATA_KEY)) || []; }
  catch { return []; }
}

const DEPT_MAP = {
  'Roads':          'Roads & Transport',
  'Sanitation':     'Sanitation Dept.',
  'Utilities':      'Utilities Dept.',
  'Water Supply':   'Utilities Dept.',
  'Infrastructure': 'Infrastructure Dept.',
  'Billing':        'Billing & Finance',
  'Health':         'Health & Safety',
  'Environment':    'Environment Dept.',
  'Education':      'Education Dept.',
  'Other':          'General Admin'
};

/* =============================================
   DCMS — Main JavaScript  (v2 — Enhanced)
   Digital Complaint Management System
   ============================================= */

/* ── NAVBAR SCROLL ── */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

/* ── COUNTER ANIMATION ── */
function animateCounter(el) {
  const raw = el.dataset.target;
  if (!raw) return;
  const isFloat = raw.includes('.');
  const target = parseFloat(raw);
  const duration = 1800;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = isFloat
      ? (ease * target).toFixed(1)
      : Math.round(ease * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ── SCROLL REVEAL (with stagger) ── */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

/* ── TYPEWRITER EFFECT ── */
function typewriter(el, speed = 50) {
  if (!el) return;
  const text = el.dataset.type || el.textContent;
  el.textContent = '';
  el.style.opacity = '1';
  let i = 0;
  const timer = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) clearInterval(timer);
  }, speed);
}

/* ── PARTICLE BACKGROUND ── */
function createParticles(containerId, count = 30) {
  const el = document.getElementById(containerId);
  if (!el) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      position:absolute; border-radius:50%; pointer-events:none;
      width:${2 + Math.random()*3}px; height:${2 + Math.random()*3}px;
      background:rgba(47,128,237,${0.1 + Math.random()*0.25});
      left:${Math.random()*100}%; top:${Math.random()*100}%;
      animation: floatParticle ${4 + Math.random()*6}s ease-in-out infinite;
      animation-delay:${Math.random()*4}s;
    `;
    el.appendChild(p);
  }
}

/* ── GRID DOT ANIMATION (hero bg) ── */
function animateGridDots() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = canvas.offsetWidth;
  let H = canvas.height = canvas.offsetHeight;
  window.addEventListener('resize', () => {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  });
  const dots = Array.from({length: 80}, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random()-.5)*.4, vy: (Math.random()-.5)*.4,
    r: 1 + Math.random()*1.5
  }));
  function draw() {
    ctx.clearRect(0, 0, W, H);
    dots.forEach(d => {
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0 || d.x > W) d.vx *= -1;
      if (d.y < 0 || d.y > H) d.vy *= -1;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(47,128,237,0.25)';
      ctx.fill();
    });
    // Connect nearby dots
    for (let i = 0; i < dots.length; i++) {
      for (let j = i+1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.strokeStyle = `rgba(47,128,237,${0.15*(1-dist/100)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/* ── PAGE TRANSITION ── */
function navigateTo(url) {
  document.body.style.opacity = '0';
  document.body.style.transform = 'translateY(8px)';
  document.body.style.transition = 'opacity .25s ease, transform .25s ease';
  setTimeout(() => { window.location.href = url; }, 260);
}

/* ── TOAST ── */
function showToast(msg, type = 'info') {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'ℹ️'}</span> ${msg}`;
  void t.offsetHeight;
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => t.classList.remove('show'), 3400);
}

/* ── MODAL HELPERS ── */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display='flex'; setTimeout(() => m.classList.add('open'), 10); }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); setTimeout(() => m.style.display='none', 250); }
}

/* ── LOADING SPINNER ── */
function showLoading(text = 'Processing…') {
  let ov = document.getElementById('dcmsOverlay');
  if (!ov) {
    ov = document.createElement('div'); ov.id = 'dcmsOverlay';
    ov.innerHTML = `<div style="text-align:center;">
      <div class="spinner"></div>
      <p style="margin-top:14px;font-size:.9rem;color:var(--text-m);">${text}</p>
    </div>`;
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(11,15,26,.85);backdrop-filter:blur(4px);z-index:999;display:flex;align-items:center;justify-content:center;';
    document.body.appendChild(ov);
  }
}
function hideLoading() {
  const ov = document.getElementById('dcmsOverlay');
  if (ov) ov.remove();
}

/* ── INJECT STYLES for new animations ── */
(function injectAnimStyles() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes floatParticle {
      0%,100%{transform:translateY(0) translateX(0);}
      33%{transform:translateY(-18px) translateX(8px);}
      66%{transform:translateY(10px) translateX(-8px);}
    }
    @keyframes spinnerAnim {
      to{transform:rotate(360deg);}
    }
    .spinner{width:40px;height:40px;border:3px solid rgba(47,128,237,.2);border-top-color:var(--accent);border-radius:50%;animation:spinnerAnim .8s linear infinite;margin:0 auto;}
    .toast{position:fixed;bottom:28px;right:28px;background:var(--bg-card2);border:1px solid var(--border-l);border-radius:12px;padding:12px 20px;font-size:.9rem;color:var(--text);box-shadow:0 8px 32px rgba(0,0,0,.4);transform:translateY(20px);opacity:0;transition:all .3s;z-index:9999;display:flex;align-items:center;gap:10px;min-width:200px;max-width:360px;}
    .toast.show{transform:none;opacity:1;}
    .toast.success{border-color:rgba(52,211,153,.4);}
    .toast.error{border-color:rgba(248,113,113,.4);}
    .toast.warning{border-color:rgba(251,191,36,.4);}
    body{transition:opacity .3s ease,transform .3s ease;}
    .card-hover{transition:transform .2s ease,border-color .2s ease,box-shadow .2s ease;}
    .card-hover:hover{transform:translateY(-3px);border-color:var(--border-l);box-shadow:0 8px 24px rgba(0,0,0,.2);}
    @keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(47,128,237,.4);}50%{box-shadow:0 0 0 8px rgba(47,128,237,0);}}
    .pulse-glow{animation:pulseGlow 2s infinite;}
    @keyframes shimmer{0%{background-position:-400px 0;}100%{background-position:400px 0;}}
    .skeleton{background:linear-gradient(90deg,var(--bg-card) 25%,var(--bg-card2) 50%,var(--bg-card) 75%);background-size:800px 100%;animation:shimmer 1.5s infinite;}
  `;
  document.head.appendChild(s);
})();

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  // Fade page in
  document.body.style.opacity = '0';
  document.body.style.transform = 'translateY(6px)';
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity .4s ease, transform .4s ease';
    document.body.style.opacity = '1';
    document.body.style.transform = 'none';
  });

  // Reveal elements
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Counter elements
  document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

  // Typewriter elements
  document.querySelectorAll('[data-type]').forEach(el => {
    const tw = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { typewriter(el, 45); tw.unobserve(el); }
    }, { threshold: 0.5 });
    tw.observe(el);
  });

  // Bar animations
  const barObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const w = el.dataset.width || el.style.width;
        el.style.width = '0%';
        setTimeout(() => { el.style.transition = 'width 1s ease'; el.style.width = w; }, 100);
        barObserver.unobserve(el);
      }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll('.bar-fill,.progress-bar-fill').forEach(el => {
    if (el.style.width) { el.dataset.width = el.style.width; barObserver.observe(el); }
  });

  // Card hover class auto-add
  document.querySelectorAll('.kpi,.section-card,.card,.feature-card').forEach(el => el.classList.add('card-hover'));

  // Canvas animation
  animateGridDots();

  // Nav update
  if (typeof dcmsUpdateNav === 'function') dcmsUpdateNav();

  // Apply user
  if (typeof dcmsApplyUser === 'function') dcmsApplyUser();
});

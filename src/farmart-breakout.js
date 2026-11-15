/* Farmart Breakout – paste into Admin > Appearance > Custom JS (no <script> tags).
 * Fully procedural: no images, video or external libraries. Edit DEFAULTS or override
 * from the Custom HTML field with window.FARMART_BREAKOUT = {...}.
 */
(function () {
  'use strict';
  if (window.FarmartBreakout) return;

  var DEFAULTS = {
    kicker: 'One weekend only',
    title: 'Farm Fest',
    big: '50', bigSuffix: '% off',
    sub: 'Fresh from the field to your door',
    date: 'Sat 12 – Sun 13 Dec',
    codeLabel: 'Use code', code: 'FRESH50',
    cta: 'Shop the event', url: '/products',
    delay: 2500,        // ms after page load before the page "breaks"
    hideHours: 24,      // hours to stay hidden after the visitor closes it
    force: false        // true = ignore the hide timer (for testing)
  };
  var KEY = 'fmb_hidden_until', TL = { crack: 0, crackEnd: 1000, tear: 850, tearDur: 750, card: 1450, idle: 2700 };

  var C, root, bc, fc, bx, fx, card, closeBtn, W, H, dpr, cx, cy, F, U, raf, T0, dbg = null, closed = false;
  var cracks = [], L0 = 1, TV = [], FL = [], parts = [], motes = [], mx = 0, my = 0, smx = 0, smy = 0;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = Math.min(screen.width, innerWidth) < 760 || /Mobi|Android/i.test(navigator.userAgent);

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function eo3(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); }
  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  function store(get, v) { try { if (get) return localStorage.getItem(KEY); localStorage.setItem(KEY, v); } catch (e) { } }

  /* ---------- DOM ---------- */
  function build() {
    root = document.createElement('div');
    root.className = 'fmb-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', C.title + ' – ' + C.big + C.bigSuffix);
    var layers = '';
    for (var i = 7; i >= 1; i--) layers += '<div class="fmb-lay' + (i === 7 ? ' fmb-glow' : '') + '" style="transform:translateZ(-' + (i * 2.2).toFixed(1) + 'px);filter:brightness(' + (1 - i * 0.05).toFixed(2) + ')"></div>';
    root.innerHTML =
      '<canvas class="fmb-cv"></canvas>' +
      '<div class="fmb-stage"><div class="fmb-card">' + layers +
      '<div class="fmb-face">' +
      '<span class="fmb-kicker">' + esc(C.kicker) + '</span>' +
      '<h2 class="fmb-title">' + esc(C.title) + '</h2>' +
      '<div class="fmb-big"><b>' + esc(C.big) + '</b><span>' + esc(C.bigSuffix) + '</span></div>' +
      '<p class="fmb-sub">' + esc(C.sub) + '</p>' +
      '<span class="fmb-date">' + esc(C.date) + '</span>' +
      (C.code ? '<div class="fmb-code">' + esc(C.codeLabel) + '<strong>' + esc(C.code) + '</strong></div>' : '') +
      '<a class="fmb-cta" href="' + esc(C.url) + '">' + esc(C.cta) + ' &rarr;</a>' +
      '</div></div></div>' +
      '<canvas class="fmb-cv"></canvas>' +
      '<button class="fmb-close" type="button" aria-label="Close"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M4 4l12 12M16 4L4 16"/></svg></button>';
    document.body.appendChild(root);
    var cv = root.querySelectorAll('canvas');
    bc = cv[0]; fc = cv[1]; bx = bc.getContext('2d'); fx = fc.getContext('2d');
    card = root.querySelector('.fmb-card');
    closeBtn = root.querySelector('.fmb-close');
    closeBtn.addEventListener('click', close);
    root.querySelector('.fmb-cta').addEventListener('click', function () { store(false, Date.now() + C.hideHours * 36e5); });
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', size);
    window.addEventListener('pointermove', function (e) { mx = e.clientX / W * 2 - 1; my = e.clientY / H * 2 - 1; });
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  function size() {
    W = innerWidth; H = innerHeight; dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    [bc, fc].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    bx.setTransform(dpr, 0, 0, dpr, 0, 0); fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H * 0.48; F = Math.max(W, H) * 0.9; U = clamp(Math.min(W, H) / 700, 0.55, 1.4);
    buildCracks();
    if (dbg != null || reduced) render(dbg != null ? dbg : 5000);
  }

  /* ---------- static scene data ---------- */
  function buildCracks() {
    cracks = []; var r = rng(11); L0 = Math.hypot(W, H) * 0.55; var N = isMobile ? 8 : 11;
    function walk(x, y, ang, len, w, off, depth) {
      var pts = [{ x: x, y: y, d: off }], d = off, end = off + len;
      while (d < end) {
        var s = (16 + r() * 30) * U; ang += (r() - 0.5) * 0.75; x += Math.cos(ang) * s; y += Math.sin(ang) * s; d += s;
        pts.push({ x: x, y: y, d: d });
        if (depth < 2 && r() < 0.17) walk(x, y, ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.8), (end - d) * 0.6, w * 0.62, d, depth + 1);
      }
      cracks.push({ pts: pts, w: w });
    }
    for (var i = 0; i < N; i++) walk(cx, cy, i / N * 6.2832 + r() * 0.5, L0 * (0.5 + r() * 0.55), 2.8 * U, 0, 0);
  }
  function buildStatic() {
    var r = rng(5), n = 80, ph = r() * 6, i;
    TV = []; for (i = 0; i < n; i++) { var a = i / n * 6.2832; TV.push({ a: a, m: 0.9 + r() * 0.12 + Math.sin(a * 3 + ph) * 0.06 - (i % 2 ? 0.03 : 0), st: r() * 330 }); }
    FL = []; for (i = 3; i < n; i += 7) FL.push({ i: i, len: 0.7 + r() * 0.7, sh: (r() - 0.5) * 0.8 });
    motes = []; for (i = 0; i < (isMobile ? 26 : 50); i++) motes.push({ x: r(), y: r(), z: 0.3 + r() * 0.9, s: r() * 6 });
    parts = [];
    var nF = isMobile ? 14 : 22, nL = isMobile ? 12 : 20, nS = isMobile ? 16 : 28, kinds = ['apple', 'orange', 'tomato', 'lemon', 'apple', 'orange', 'tomato'];
    for (i = 0; i < nF; i++) parts.push({ k: kinds[Math.floor(r() * kinds.length)], seed: 100 + i, ts: 1100 + i * (1000 / nF) + r() * 60 });
    for (i = 0; i < nL; i++) parts.push({ k: 'leaf', seed: 300 + i, ts: 1200 + r() * 1200 });
    for (i = 0; i < nS; i++) parts.push({ k: 'shard', seed: 500 + i, ts: 900 + r() * 1050 });
  }

  /* ---------- particle kinematics ---------- */
  var KINDS = ['apple', 'orange', 'tomato', 'lemon'];
  function evalP(o, t, amb) {
    var r = rng(o.seed), isS = o.k === 'shard', isL = o.k === 'leaf';
    var T = amb ? 2600 + r() * 1200 : (isS ? 1000 : 1000) + r() * 600;
    var p = (t - o.ts) / T; if (p < 0 || p > 1) return null;
    var a = r() * 6.2832, Dm = Math.max(W, H) * 0.5, D = amb ? Dm * (1.05 + r() * 0.5) : Dm * (isS ? 1.1 + r() * 0.5 : 0.08 + r() * 1.2);
    var z0 = F * 2.3, zE = F * (amb ? 0.45 : isS ? 0.22 : 0.17);
    var sx0 = 0, sy0 = 0;
    if (isS) { sx0 = Math.cos(a) * W * 0.4 * 0.9; sy0 = Math.sin(a) * H * 0.42 * 0.9; }
    var q = Math.pow(p, 1.15), z = z0 + (zE - z0) * q, e = Math.pow(p, isS ? 1.1 : 1.3);
    var sx = cx + sx0 + (Math.cos(a) * D - sx0) * e, sy = cy + sy0 + (Math.sin(a) * D * 0.82 - sy0) * e + (isL ? Math.sin(p * 9 + o.seed) * 26 * U * p : 0);
    var R = (isL ? 30 + r() * 18 : isS ? 28 + r() * 30 : 58 + r() * 40) * U;
    var kind = o.k; if (amb) kind = isL ? 'leaf' : KINDS[Math.floor(r() * 4)];
    var spin = r() * 6.28 + (r() - 0.5) * 9 * p;
    return { k: kind, z: z, sx: sx, sy: sy, r: R * F / z, rot: spin, flip: r() * 6 + p * (4 + r() * 8), seed: o.seed, p: p, vis: p > 0.9 ? clamp((1 - p) / 0.1, 0, 1) : 1, pv: p };
  }

  /* ---------- drawing: objects ---------- */
  var COL = {
    apple: ['#ff8a72', '#d9261c', '#5e0710'], tomato: ['#ff8266', '#e4301c', '#6d0e06'],
    orange: ['#ffcf72', '#ff8f0a', '#9b3f06'], lemon: ['#fffbb0', '#f7d814', '#8f7704']
  };
  function sphere(c, x, y, r, col) {
    var g = c.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.06, x, y, r * 1.02);
    g.addColorStop(0, col[0]); g.addColorStop(0.5, col[1]); g.addColorStop(1, col[2]);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
    var b = c.createRadialGradient(x + r * 0.5, y + r * 0.6, 0, x + r * 0.5, y + r * 0.6, r * 0.9);
    b.addColorStop(0, 'rgba(255,200,120,.28)'); b.addColorStop(1, 'rgba(255,200,120,0)');
    c.fillStyle = b; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
  }
  function spec(c, x, y, r) {
    c.save(); c.translate(x - r * 0.4, y - r * 0.46); c.rotate(-0.7);
    c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(0, 0, r * 0.26, r * 0.12, 0, 0, 6.2832); c.fill();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(-r * 0.04, 0, r * 0.05, 0, 6.2832); c.fill(); c.restore();
  }
  function dots(c, x, y, r, rot, seed, col) {
    for (var k = 0; k < 18; k++) {
      var th = k * 2.4 + rot, ph = Math.acos(1 - 2 * ((k * 0.61 + seed * 0.13) % 1));
      var X = Math.sin(ph) * Math.cos(th), Y = Math.cos(ph), Z = Math.sin(ph) * Math.sin(th);
      if (Z < 0.15) continue;
      c.fillStyle = col; c.beginPath(); c.ellipse(x + X * r * 0.93, y + Y * r * 0.93, r * 0.035 * Z, r * 0.035, 0, 0, 6.2832); c.fill();
    }
  }
  function leafShape(c, r) {
    c.beginPath(); c.moveTo(-r, 0); c.quadraticCurveTo(-r * 0.2, -r * 0.75, r, 0); c.quadraticCurveTo(-r * 0.2, r * 0.75, -r, 0);
  }
  function drawLeaf(c, x, y, r, rot, flip, a) {
    c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(rot); var f = Math.cos(flip); c.scale(1, Math.abs(f) < 0.12 ? 0.12 : f);
    var g = c.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
    if (f > 0) { g.addColorStop(0, '#8fe36a'); g.addColorStop(1, '#2c8a2e'); } else { g.addColorStop(0, '#5fb04a'); g.addColorStop(1, '#1d5f22'); }
    c.fillStyle = g; leafShape(c, r); c.fill();
    c.strokeStyle = 'rgba(20,70,20,.55)'; c.lineWidth = Math.max(1, r * 0.04); c.beginPath(); c.moveTo(-r * 0.9, 0); c.lineTo(r * 0.9, 0); c.stroke();
    c.restore();
  }
  function drawFruitBody(c, o, x, y, r, a) {
    c.save(); c.globalAlpha = a; var col = COL[o.k];
    if (o.k === 'lemon') {
      c.translate(x, y); c.rotate(o.rot); c.scale(1.22, 1); sphere(c, 0, 0, r, col);
      c.fillStyle = col[1]; c.beginPath(); c.arc(r * 0.95, 0, r * 0.13, 0, 6.2832); c.arc(-r * 0.95, 0, r * 0.13, 0, 6.2832); c.fill();
      dots(c, 0, 0, r, o.flip, o.seed, 'rgba(120,90,0,.28)'); c.rotate(-o.rot); spec(c, 0, 0, r);
    } else {
      sphere(c, x, y, r, col);
      if (o.k === 'orange') { dots(c, x, y, r, o.flip, o.seed, 'rgba(120,45,0,.3)'); }
      if (o.k === 'apple') {
        c.fillStyle = 'rgba(255,214,90,.22)'; c.beginPath(); c.ellipse(x + r * 0.15, y, r * 0.18, r * 0.7, 0.3, 0, 6.2832); c.fill();
        c.fillStyle = 'rgba(40,0,0,.45)'; c.beginPath(); c.ellipse(x, y - r * 0.86, r * 0.3, r * 0.1, 0, 0, 6.2832); c.fill();
        c.strokeStyle = '#4a2a10'; c.lineWidth = Math.max(1.5, r * 0.07); c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y - r * 0.85); c.quadraticCurveTo(x + r * 0.05, y - r * 1.15, x + r * 0.2, y - r * 1.3); c.stroke();
        drawLeaf(c, x + r * 0.42, y - r * 1.12, r * 0.38, -0.5 + Math.sin(o.rot) * 0.3, 0.4, a);
      }
      if (o.k === 'tomato') {
        var cxx = x + Math.sin(o.rot) * r * 0.22, cyy = y - r * 0.8;
        c.fillStyle = '#3f9a36'; for (var k = 0; k < 6; k++) { c.save(); c.translate(cxx, cyy); c.rotate(k * 1.047 + o.rot * 0.3); c.beginPath(); c.ellipse(r * 0.17, 0, r * 0.2, r * 0.07, 0, 0, 6.2832); c.fill(); c.restore(); }
        c.fillStyle = '#2b6a22'; c.beginPath(); c.arc(cxx, cyy, r * 0.06, 0, 6.2832); c.fill();
      }
      spec(c, x, y, r);
    }
    c.restore();
  }
  function drawObj(c, o, tNow, amb) {
    var a = o.vis;
    if (o.k === 'shard') { drawShard(c, o, a); return; }
    var prev = evalP(o.src, tNow - 40, amb), step = prev ? Math.hypot(o.sx - prev.sx, o.sy - prev.sy) : 0;
    if (prev && step > 12) {
      for (var k = 3; k >= 1; k--) {
        var f = k / 4, gx = o.sx + (prev.sx - o.sx) * f, gy = o.sy + (prev.sy - o.sy) * f, gr = o.r + (prev.r - o.r) * f;
        if (o.k === 'leaf') drawLeaf(c, gx, gy, gr, o.rot, o.flip, a * 0.12); else drawFruitBody(c, o, gx, gy, gr, a * 0.12);
      }
    }
    if (o.k === 'leaf') drawLeaf(c, o.sx, o.sy, o.r, o.rot, o.flip, a); else drawFruitBody(c, o, o.sx, o.sy, o.r, a);
  }
  function drawShard(c, o, a) {
    var r = rng(o.seed + 77), n = 5, pts = [], i, f = Math.cos(o.flip);
    for (i = 0; i < n; i++) { var an = i / n * 6.2832 + r() * 0.7, rad = 0.55 + r() * 0.55; pts.push([Math.cos(an) * rad, Math.sin(an) * rad * 0.8]); }
    c.save(); c.globalAlpha = a; c.translate(o.sx, o.sy); c.rotate(o.rot); c.scale(1, Math.abs(f) < 0.1 ? 0.1 : f);
    c.beginPath(); for (i = 0; i < n; i++) c.lineTo(pts[i][0] * o.r, pts[i][1] * o.r); c.closePath();
    var g = c.createLinearGradient(-o.r, -o.r, o.r, o.r);
    if (f > 0) { g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#d8cfb6'); } else { g.addColorStop(0, '#b9b09a'); g.addColorStop(1, '#8f8670'); }
    c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 8; c.fillStyle = g; c.fill(); c.shadowBlur = 0;
    c.strokeStyle = 'rgba(90,70,40,.5)'; c.lineWidth = 1; c.stroke(); c.restore();
  }

  /* ---------- drawing: scene ---------- */
  function strokeCracks(c, dist, lw, style, dx, blur, bcol) {
    c.strokeStyle = style; c.lineWidth = lw; c.shadowBlur = blur || 0; c.shadowColor = bcol || 'transparent';
    for (var i = 0; i < cracks.length; i++) {
      var pts = cracks[i].pts; if (pts[0].d > dist) continue;
      c.lineWidth = lw * cracks[i].w / (2.8 * U); c.beginPath(); c.moveTo(pts[0].x + dx, pts[0].y + dx);
      for (var j = 1; j < pts.length; j++) {
        if (pts[j].d <= dist) c.lineTo(pts[j].x + dx, pts[j].y + dx);
        else { var f = (dist - pts[j - 1].d) / (pts[j].d - pts[j - 1].d); c.lineTo(pts[j - 1].x + (pts[j].x - pts[j - 1].x) * f + dx, pts[j - 1].y + (pts[j].y - pts[j - 1].y) * f + dx); break; }
      }
      c.stroke();
    }
    c.shadowBlur = 0;
  }
  function drawCracks(c, t) {
    var g = clamp((t - TL.crack) / (TL.crackEnd - TL.crack), 0, 1); if (g <= 0) return;
    g = 1 - Math.pow(1 - g, 2); var dist = g * L0 * 1.5, glow = clamp(t / TL.crackEnd, 0, 1);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    var v = c.createRadialGradient(cx, cy, Math.min(W, H) * 0.2, cx, cy, Math.hypot(W, H) * 0.6);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (0.38 * g).toFixed(3) + ')'); c.fillStyle = v; c.fillRect(0, 0, W, H);
    strokeCracks(c, dist, 7 * U, 'rgba(255,150,40,' + (0.5 * glow).toFixed(3) + ')', 0, 18 * U, '#ffa530');
    strokeCracks(c, dist, 2.8 * U, 'rgba(18,10,4,.92)', 0);
    strokeCracks(c, dist, 1.1 * U, 'rgba(255,248,225,.6)', -1 * U);
    c.restore();
  }
  function tearPoly(t) {
    var pts = [], any = false, rx = W * (W < 700 ? 0.47 : 0.42), ry = H * (W < 700 ? 0.42 : 0.44);
    for (var i = 0; i < TV.length; i++) {
      var v = TV[i], p = eo3((t - TL.tear - v.st) / TL.tearDur); if (p > 0) any = true;
      var r = v.m * p; pts.push({ x: cx + Math.cos(v.a) * rx * r, y: cy + Math.sin(v.a) * ry * r, p: p, nx: Math.cos(v.a), ny: Math.sin(v.a) });
    }
    return any ? pts : null;
  }
  function polyPath(c, pts) { c.beginPath(); for (var i = 0; i < pts.length; i++) c[i ? 'lineTo' : 'moveTo'](pts[i].x, pts[i].y); c.closePath(); }
  function hill(c, base, amp, f, sp, ph, color, t) {
    c.fillStyle = color; c.beginPath(); c.moveTo(0, H);
    for (var x = 0; x <= W + 20; x += 20) c.lineTo(x, base + Math.sin(x * f + t * sp + ph) * amp + Math.sin(x * f * 2.3 + ph * 2) * amp * 0.4);
    c.lineTo(W + 20, H); c.closePath(); c.fill();
  }
  function drawVoid(c, t) {
    var pts = tearPoly(t); if (!pts) return;
    var open = eo3((t - TL.tear) / (TL.tearDur + 330)), n = pts.length, i, sunY = H * 0.6;
    c.save(); polyPath(c, pts); c.clip();
    var s = 1 + 0.32 * (1 - open); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
    var sky = c.createLinearGradient(0, 0, 0, H * 0.8);
    sky.addColorStop(0, '#102a55'); sky.addColorStop(0.35, '#5b3f86'); sky.addColorStop(0.62, '#ff8f4f'); sky.addColorStop(0.85, '#ffd382'); sky.addColorStop(1, '#ffe9b0');
    c.fillStyle = sky; c.fillRect(-W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
    var sun = c.createRadialGradient(cx, sunY, 0, cx, sunY, Math.max(W, H) * 0.62);
    sun.addColorStop(0, 'rgba(255,250,215,1)'); sun.addColorStop(0.07, 'rgba(255,226,150,.95)'); sun.addColorStop(0.3, 'rgba(255,150,70,.5)'); sun.addColorStop(1, 'rgba(255,120,60,0)');
    c.fillStyle = sun; c.fillRect(-W * 0.2, -H * 0.2, W * 1.4, H * 1.4);
    c.globalCompositeOperation = 'lighter'; var K = 14, len = Math.hypot(W, H);
    for (i = 0; i < K; i++) {
      var ang = i / K * 6.2832 + t * 0.00013, wd = 0.07 + (i % 3) * 0.02, g = c.createRadialGradient(cx, sunY, 0, cx, sunY, len * 0.8);
      g.addColorStop(0, 'rgba(255,230,160,.34)'); g.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = g;
      c.beginPath(); c.moveTo(cx, sunY); c.lineTo(cx + Math.cos(ang - wd) * len, sunY + Math.sin(ang - wd) * len); c.lineTo(cx + Math.cos(ang + wd) * len, sunY + Math.sin(ang + wd) * len); c.closePath(); c.fill();
    }
    c.globalCompositeOperation = 'source-over';
    hill(c, H * 0.66, 22 * U, 0.004, 0.00006, 1, '#7d8a63', t);
    hill(c, H * 0.72, 30 * U, 0.0055, 0.00009, 3, '#3f8a43', t);
    hill(c, H * 0.8, 26 * U, 0.007, 0.00012, 5, '#1f6030', t);
    hill(c, H * 0.9, 20 * U, 0.009, 0.00016, 8, '#0f3e20', t);
    for (i = 0; i < motes.length; i++) {
      var m = motes[i], mxx = ((m.x + t * 0.00002 * m.z) % 1) * W, myy = ((m.y - t * 0.00004 * m.z + 1) % 1) * H;
      c.fillStyle = 'rgba(255,240,190,' + (0.25 + 0.3 * Math.sin(t * 0.002 + m.s)).toFixed(2) + ')'; c.beginPath(); c.arc(mxx, myy, 1 + m.z * 1.8 * U, 0, 6.2832); c.fill();
    }
    c.restore();
    // peeled paper flaps
    c.save(); c.lineJoin = 'round';
    for (i = 0; i < FL.length; i++) {
      var f = FL[i], a = pts[(f.i - 3 + n) % n], b = pts[(f.i + 3) % n], m0 = pts[f.i], pr = m0.p; if (pr < 0.4) continue;
      var k = eo3((pr - 0.4) / 0.6), L = 70 * U * f.len * k, tx = m0.x + m0.nx * L + (b.x - a.x) * f.sh, ty = m0.y + m0.ny * L + (b.y - a.y) * f.sh;
      var g2 = c.createLinearGradient(m0.x, m0.y, tx, ty); g2.addColorStop(0, '#d2c8ac'); g2.addColorStop(0.5, '#fbf6e6'); g2.addColorStop(1, '#e8dfc6');
      c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 14 * U; c.shadowOffsetY = 5 * U; c.fillStyle = g2;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(tx, ty); c.lineTo(b.x, b.y); c.closePath(); c.fill();
      c.shadowBlur = 0; c.shadowOffsetY = 0; c.strokeStyle = 'rgba(120,95,50,.45)'; c.lineWidth = 1; c.stroke();
    }
    c.restore();
    // torn rim: inner glow, paper edge
    c.save(); c.lineJoin = 'round'; polyPath(c, pts);
    c.shadowColor = 'rgba(255,170,50,.95)'; c.shadowBlur = 24 * U; c.strokeStyle = 'rgba(255,205,110,.9)'; c.lineWidth = 3 * U; c.stroke();
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 26 * U; c.shadowOffsetY = 6 * U; c.strokeStyle = '#f7f0dc'; c.lineWidth = 6 * U; c.stroke();
    c.restore();
  }

  function renderParts(t) {
    var list = [], i, o, amb;
    for (i = 0; i < parts.length; i++) { o = evalP(parts[i], t, false); if (o) { o.src = parts[i]; list.push(o); } }
    if (!reduced && t > TL.idle) {
      var gap = 1500, last = Math.floor((t - TL.idle) / gap), first = Math.max(0, last - 3);
      for (i = first; i <= last; i++) {
        var po = { k: i % 3 === 0 ? 'leaf' : 'fruit', seed: 900 + i, ts: TL.idle + i * gap };
        o = evalP(po, t, true); if (o) { o.src = po; o.amb = true; list.push(o); }
      }
    }
    list.sort(function (a, b) { return b.z - a.z; });
    for (i = 0; i < list.length; i++) { o = list[i]; if (o.z > F * 1.04) drawObj(bx, o, t, o.amb); else drawObj(fx, o, t, o.amb); }
  }

  function renderCard(t) {
    var tau = (t - TL.card) / 1000;
    if (tau < 0) { card.style.visibility = 'hidden'; return; }
    card.style.visibility = 'visible';
    var s = 1 - Math.exp(-8 * tau) * Math.cos(11 * tau), k = 1 - s;
    if (reduced) { s = 1; k = 0; }
    var idle = tau > 0.8 && !reduced ? 1 : 0;
    smx += (mx - smx) * 0.06; smy += (my - smy) * 0.06;
    var sway = Math.sin(t * 0.0011) * 3, sway2 = Math.cos(t * 0.0009) * 2;
    var ry = -62 * k + idle * (smx * 9 + sway), rx = 24 * k + idle * (-smy * 7 + sway2), rz = -16 * k;
    var z = Math.min(-2300 * k, isMobile || W < 700 ? 30 : 170), shx = 0, shy = 0, since = tau - 0.143;
    if (since > 0 && !reduced) { var amp = 13 * U * Math.exp(-since * 7); shx = Math.sin(since * 95) * amp; shy = Math.cos(since * 80) * amp * 0.7; }
    card.style.opacity = reduced ? 1 : clamp(tau * 9, 0, 1);
    card.style.transform = 'translate3d(' + shx.toFixed(2) + 'px,' + shy.toFixed(2) + 'px,' + z.toFixed(1) + 'px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) rotateZ(' + rz.toFixed(2) + 'deg)';
    card.style.setProperty('--sx', (clamp(-60 + (ry + 40) * 3.2 + ((t * 0.04) % 160 - 40) * (idle ? 0.4 : 0), -140, 140)).toFixed(1) + '%');
    if (tau > 0.3 && !card.classList.contains('fmb-landed')) card.classList.add('fmb-landed');
  }
  function renderFlash(c, t) {
    var f1 = clamp(1 - Math.abs(t - 320) / 70, 0, 1) * 0.16, f2 = clamp(1 - (t - TL.tear) / 260, 0, 1) * (t >= TL.tear ? 0.38 : 0);
    var ti = (t - (TL.card + 143)); var f3 = ti > 0 ? clamp(1 - ti / 520, 0, 1) : 0;
    var a = Math.max(f1, f2);
    if (a > 0.005) { c.fillStyle = 'rgba(255,244,214,' + a.toFixed(3) + ')'; c.fillRect(0, 0, W, H); }
    if (f3 > 0) {
      var rad = (1 - f3) * Math.max(W, H) * 0.75 + 40, g = c.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, 'rgba(255,240,200,' + (0.5 * f3).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(255,235,170,' + (0.65 * f3).toFixed(3) + ')'; c.lineWidth = 5 * U * f3 + 1; c.beginPath(); c.arc(cx, cy, rad * 0.9, 0, 6.2832); c.stroke();
    }
  }

  function render(t) {
    bx.clearRect(0, 0, W, H); fx.clearRect(0, 0, W, H);
    if (reduced) { var rt = 5000; drawVoid(bx, rt); renderCard(rt); return; }
    drawCracks(bx, t); drawVoid(bx, t); renderParts(t); renderCard(t); renderFlash(fx, t);
    if (t > 900 && !closeBtn.classList.contains('fmb-show')) closeBtn.classList.add('fmb-show');
    if (t > 1200 && !root.classList.contains('fmb-live')) { root.classList.add('fmb-live'); lock(true); }
  }
  function frame() { if (closed) return; render(dbg != null ? dbg : performance.now() - T0); raf = requestAnimationFrame(frame); }

  /* ---------- lifecycle ---------- */
  var savedOv = [];
  function lock(on) {
    var els = [document.documentElement, document.body];
    if (on) { savedOv = els.map(function (e) { return e.style.overflow; }); els.forEach(function (e) { e.style.overflow = 'hidden'; }); }
    else els.forEach(function (e, i) { e.style.overflow = savedOv[i] || ''; });
  }
  function play(opts) {
    if (root) return; closed = false; C = Object.assign({}, DEFAULTS, window.FARMART_BREAKOUT || {}, opts || {});
    build(); buildStatic(); size(); T0 = performance.now();
    if (reduced) { root.classList.add('fmb-live'); closeBtn.classList.add('fmb-show'); lock(true); render(5000); return; }
    raf = requestAnimationFrame(frame);
  }
  function close() {
    if (!root || closed) return; closed = true; cancelAnimationFrame(raf); lock(false);
    store(false, Date.now() + (C.hideHours || 24) * 36e5);
    document.removeEventListener('keydown', onKey); window.removeEventListener('resize', size);
    root.classList.add('fmb-out'); var r = root; root = null; setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 500);
  }
  function seek(ms) { dbg = ms; cancelAnimationFrame(raf); closed = false; if (!root) play(); render(ms); }

  window.FarmartBreakout = { play: play, close: close, seek: seek };

  function start() {
    var cfg = Object.assign({}, DEFAULTS, window.FARMART_BREAKOUT || {}), force = cfg.force || /[?&]fmb=1/.test(location.search);
    if (!force) { var until = +store(true); if (until && until > Date.now()) return; }
    setTimeout(function () { play(); }, cfg.delay);
  }
  function boot() { if (getComputedStyle(document.documentElement).getPropertyValue('--fmb-ok').trim() !== '1') console.warn('[Farmart Breakout] CSS not found – paste farmart-breakout.css into Custom CSS.'); start(); }
  if (document.readyState === 'complete') boot(); else window.addEventListener('load', boot);
})();

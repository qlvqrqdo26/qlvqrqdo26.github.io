(function () {
  var cv = document.getElementById('fish');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1;
  var fish = [], drops = [], parts = [], minis = [], bubbles = [];
  var ptr = { x: -9999, y: -9999, on: false };
  var N = 20; // segmentos de la columna

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function angDiff(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.max(4, Math.min(8, Math.round(W * H / 170000)));
    while (fish.length < n) fish.push(make());
    fish.length = n;
    var nb = Math.round(Math.min(26, W * H / 40000));
    while (bubbles.length < nb) bubbles.push(makeBubble(true));
    bubbles.length = nb;
  }

  function makeBubble(init) {
    return { x: rnd(0, W), y: init ? rnd(0, H) : H + 10, r: rnd(1, 3.2), v: rnd(10, 30), p: rnd(0, 6), a: rnd(0.08, 0.28) };
  }

  function make() {
    var L = rnd(120, 210), a = rnd(0, 6.283), x = rnd(0, W), y = rnd(0, H), pts = [], i;
    var seg = L / N;
    for (i = 0; i <= N; i++) pts.push({ x: x - Math.cos(a) * seg * i, y: y - Math.sin(a) * seg * i });
    var spots = [];
    for (i = 0; i < 34; i++) spots.push({ u: rnd(0.04, 0.95), v: rnd(-0.95, 0.95), r: rnd(0.008, 0.03), dark: Math.random() < 0.62, a: rnd(0.12, 0.32) });
    var depth = rnd(0.35, 1);
    return {
      L: L, ang: a, w: 0, speed: rnd(26, 46), base: rnd(26, 46), ph: rnd(0, 10), pts: pts, spots: spots,
      depth: depth, tone: 95 + depth * 125, k1: rnd(0.4, 1.1), p1: rnd(0, 6), k2: rnd(0.2, 0.7), p2: rnd(0, 6), boost: 0
    };
  }

  function ringR(tk) { return 20 + 250 * (1 - Math.exp(-tk * 2.1)); }

  function addDrop(x, y) {
    drops.push({ x: x, y: y, t: 0 });
  }

  window.addEventListener('pointermove', function (e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; }, { passive: true });
  window.addEventListener('pointerleave', function () { ptr.on = false; ptr.x = ptr.y = -9999; });
  window.addEventListener('pointerdown', function (e) { ptr.x = e.clientX; ptr.y = e.clientY; addDrop(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('resize', resize);

  function step(f, t, dt) {
    var h = f.pts[0], i;
    // deriva suave y aleatoria del rumbo
    f.w += (Math.sin(t * 0.00055 * f.k1 + f.p1) + Math.sin(t * 0.0011 * f.k2 + f.p2)) * 0.5 * dt;
    // evita los bordes
    var m = 140, cx = W / 2, cy = H / 2;
    if (h.x < m || h.x > W - m || h.y < m || h.y > H - m) {
      var d = angDiff(f.ang, Math.atan2(cy - h.y, cx - h.x));
      f.w += d * 1.6 * dt;
    }
    // evita el puntero con suavidad
    var dx = h.x - ptr.x, dy = h.y - ptr.y, dd = Math.sqrt(dx * dx + dy * dy), boostT = 0;
    if (ptr.on && dd < 220) {
      var s = 1 - dd / 220;
      f.w += angDiff(f.ang, Math.atan2(dy, dx)) * 3.2 * s * dt;
      boostT = s * 0.9;
    }
    // la onda de cada gota los empuja
    for (i = 0; i < drops.length; i++) {
      var dr = drops[i], rx = h.x - dr.x, ry = h.y - dr.y, rd = Math.sqrt(rx * rx + ry * ry) || 1;
      var rr = ringR(dr.t), gap = Math.abs(rd - rr);
      if (dr.t < 1.4 && gap < 70) {
        var k = (1 - gap / 70) * (1 - dr.t / 1.4);
        f.w += angDiff(f.ang, Math.atan2(ry, rx)) * 5 * k * dt;
        boostT = Math.max(boostT, k * 2.4);
      }
    }
    f.boost += (boostT - f.boost) * Math.min(1, dt * 4);
    f.w *= Math.exp(-2.4 * dt);
    if (f.w > 2.2) f.w = 2.2; else if (f.w < -2.2) f.w = -2.2;
    f.ang += f.w * dt;
    var tgt = f.base * (1 + f.boost * 2.2);
    f.speed += (tgt - f.speed) * Math.min(1, dt * 2.2);
    h.x += Math.cos(f.ang) * f.speed * dt;
    h.y += Math.sin(f.ang) * f.speed * dt;
    f.ph += dt * (2.0 + f.speed * 0.045);
    // la columna sigue a la cabeza
    var seg = f.L / N;
    for (i = 1; i <= N; i++) {
      var p = f.pts[i - 1], q = f.pts[i], vx = q.x - p.x, vy = q.y - p.y, l = Math.sqrt(vx * vx + vy * vy) || 1;
      q.x = p.x + vx / l * seg; q.y = p.y + vy / l * seg;
    }
  }

  function tone(f, k, a) { var v = Math.max(0, Math.min(255, Math.round(f.tone * k))); return 'rgba(' + v + ',' + v + ',' + v + ',' + (a == null ? 1 : a) + ')'; }

  function prof(u) {
    if (u < 0.16) return 0.58 + (u / 0.16) * 0.42;
    if (u < 0.38) return 1;
    return 1 - Math.pow((u - 0.38) / 0.62, 1.5) * 0.88;
  }

  function smooth(pts, move) {
    if (move) ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length - 1; i++) {
      var mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
    }
    var l = pts[pts.length - 1];
    ctx.lineTo(l.x, l.y);
  }

  function draw(f) {
    var L = f.L, i, sp = [], u;
    var amp = (0.5 + Math.min(1.6, f.speed / 40)) * L * 0.05;
    // columna ondulada
    for (i = 0; i <= N; i++) {
      var a = f.pts[Math.max(0, i - 1)], b = f.pts[Math.min(N, i + 1)];
      var tx = a.x - b.x, ty = a.y - b.y, tl = Math.sqrt(tx * tx + ty * ty) || 1;
      tx /= tl; ty /= tl; u = i / N;
      var wv = Math.sin(f.ph - u * 4.6) * amp * (0.1 + u * u * 1.7);
      sp.push({ x: f.pts[i].x - ty * wv, y: f.pts[i].y + tx * wv, tx: tx, ty: ty });
    }
    for (i = 0; i <= N; i++) {
      var a2 = sp[Math.max(0, i - 1)], b2 = sp[Math.min(N, i + 1)];
      var ux = a2.x - b2.x, uy = a2.y - b2.y, ul = Math.sqrt(ux * ux + uy * uy) || 1;
      sp[i].tx = ux / ul; sp[i].ty = uy / ul; sp[i].nx = -uy / ul; sp[i].ny = ux / ul;
      sp[i].w = L * 0.115 * prof(i / N);
    }
    var h = sp[0];
    function side(i, s, k, extra) { var p = sp[i]; return { x: p.x + p.nx * p.w * s * k + (extra ? p.tx * extra : 0), y: p.y + p.ny * p.w * s * k + (extra ? p.ty * extra : 0) }; }
    function outline(k) {
      var left = [], right = [];
      for (var j = 0; j <= N; j++) { left.push(side(j, 1, k)); right.push(side(j, -1, k)); }
      return { left: left, right: right };
    }
    function bodyPath(k) {
      var o = outline(k), nose = { x: h.x + h.tx * L * 0.06, y: h.y + h.ty * L * 0.06 };
      ctx.beginPath();
      ctx.moveTo(o.right[0].x, o.right[0].y);
      ctx.quadraticCurveTo(nose.x + h.nx * h.w * k * 0.5, nose.y + h.ny * h.w * k * 0.5, nose.x, nose.y);
      ctx.quadraticCurveTo(nose.x - h.nx * h.w * k * 0.5, nose.y - h.ny * h.w * k * 0.5, o.left[0].x, o.left[0].y);
      smooth(o.left, false);
      var tl = o.left[N], tr = o.right[N];
      ctx.lineTo(tr.x, tr.y);
      var rr = o.right.slice().reverse();
      smooth(rr, false);
      ctx.closePath();
    }

    // aleta caudal
    var tN = sp[N], sw = Math.sin(f.ph - u * 4.6 - 0.9) * L * 0.05;
    ctx.save();
    var tfx = tN.tx, tfy = tN.ty, tnx = tN.nx, tny = tN.ny;
    var tipx = tN.x + tfx * L * 0.2 + tnx * sw, tipy = tN.y + tfy * L * 0.2 + tny * sw;
    var upx = tipx + tnx * L * 0.085, upy = tipy + tny * L * 0.085, dnx = tipx - tnx * L * 0.085, dny = tipy - tny * L * 0.085;
    ctx.fillStyle = tone(f, 0.62);
    ctx.beginPath();
    ctx.moveTo(tN.x + tnx * 2, tN.y + tny * 2);
    ctx.bezierCurveTo(tN.x + tfx * L * 0.06 + tnx * L * 0.1, tN.y + tfy * L * 0.06 + tny * L * 0.1, upx - tfx * L * 0.03, upy - tfy * L * 0.03, upx, upy);
    ctx.quadraticCurveTo(tipx + tfx * L * 0.05, tipy + tfy * L * 0.05, dnx, dny);
    ctx.bezierCurveTo(dnx - tfx * L * 0.03, dny - tfy * L * 0.03, tN.x + tfx * L * 0.06 - tnx * L * 0.1, tN.y + tfy * L * 0.06 - tny * L * 0.1, tN.x - tnx * 2, tN.y - tny * 2);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = tone(f, 0.95, 0.35); ctx.lineWidth = 0.8;
    for (i = -3; i <= 3; i++) {
      ctx.beginPath(); ctx.moveTo(tN.x, tN.y);
      ctx.lineTo(tipx + tnx * i * L * 0.028 + tfx * L * 0.02 * (3 - Math.abs(i)) * 0.4, tipy + tny * i * L * 0.028 + tfy * L * 0.02 * (3 - Math.abs(i)) * 0.4);
      ctx.stroke();
    }
    ctx.restore();

    // aletas pectorales y pelvicas
    function fin(idx, s, len, sweep, wid, flap) {
      var p = sp[idx], bx = p.x + p.nx * p.w * s * 0.85, by = p.y + p.ny * p.w * s * 0.85;
      var ex = bx + p.nx * s * len * (1 + flap) - p.tx * len * sweep, ey = by + p.ny * s * len * (1 + flap) - p.ty * len * sweep;
      var bx2 = bx - p.tx * len * wid, by2 = by - p.ty * len * wid;
      ctx.fillStyle = tone(f, 0.66);
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + p.nx * s * len * 0.8 + p.tx * len * 0.15, by + p.ny * s * len * 0.8 + p.ty * len * 0.15, ex, ey);
      ctx.quadraticCurveTo(ex - p.tx * len * 0.3 - p.nx * s * len * 0.15, ey - p.ty * len * 0.3 - p.ny * s * len * 0.15, bx2, by2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = tone(f, 1, 0.3); ctx.lineWidth = 0.8;
      for (var r = 0; r < 5; r++) {
        var q = r / 4;
        ctx.beginPath(); ctx.moveTo(bx - p.tx * len * wid * q * 0.9, by - p.ty * len * wid * q * 0.9);
        ctx.lineTo(ex - p.tx * len * 0.3 * q - p.nx * s * len * 0.15 * q, ey - p.ty * len * 0.3 * q - p.ny * s * len * 0.15 * q);
        ctx.stroke();
      }
    }
    var fl = Math.sin(f.ph * 0.9) * 0.12;
    fin(3, 1, L * 0.22, 0.45, 0.14, fl); fin(3, -1, L * 0.22, 0.45, 0.14, -fl);
    fin(9, 1, L * 0.12, 0.35, 0.1, fl * 0.6); fin(9, -1, L * 0.12, 0.35, 0.1, -fl * 0.6);
    fin(15, 1, L * 0.07, 0.3, 0.08, 0); fin(15, -1, L * 0.07, 0.3, 0.08, 0);

    // barbillas
    ctx.lineCap = 'round';
    function barbel(bx, by, ang0, len, wob, lw, ph) {
      ctx.beginPath(); ctx.moveTo(bx, by);
      var x = bx, y = by, a0 = ang0, st = len / 9;
      for (var k = 1; k <= 9; k++) {
        a0 += Math.sin(f.ph * 1.2 + ph + k * 0.7) * wob;
        x += Math.cos(a0) * st; y += Math.sin(a0) * st;
        ctx.lineTo(x, y);
      }
      ctx.lineWidth = lw; ctx.stroke();
    }
    var ha = Math.atan2(h.ty, h.tx);
    ctx.strokeStyle = tone(f, 0.9);
    var nb = { x: h.x + h.tx * L * 0.05, y: h.y + h.ty * L * 0.05 };
    for (var sd = -1; sd <= 1; sd += 2) {
      barbel(nb.x + h.nx * sd * h.w * 0.35, nb.y + h.ny * sd * h.w * 0.35, ha + sd * 0.5, L * 0.13, 0.07, Math.max(1, L * 0.011), 0);
      barbel(nb.x - h.tx * L * 0.02 + h.nx * sd * h.w * 0.78, nb.y - h.ty * L * 0.02 + h.ny * sd * h.w * 0.78, ha + sd * 1.0, L * 0.22, 0.09, Math.max(1.2, L * 0.013), 1.5);
      barbel(h.x + h.nx * sd * h.w * 0.62, h.y + h.ny * sd * h.w * 0.62, ha + sd * 1.7, L * 0.1, 0.1, Math.max(0.9, L * 0.009), 3);
      barbel(h.x + h.tx * L * 0.02 + h.nx * sd * h.w * 0.3, h.y + h.ty * L * 0.02 + h.ny * sd * h.w * 0.3, ha + sd * 2.2, L * 0.07, 0.11, Math.max(0.9, L * 0.009), 4.5);
    }

    // cuerpo en capas (degradado suave)
    var layers = [[1, 0.9], [0.84, 0.72], [0.66, 0.56], [0.46, 0.44], [0.26, 0.34]];
    for (i = 0; i < layers.length; i++) { bodyPath(layers[i][0]); ctx.fillStyle = tone(f, layers[i][1]); ctx.fill(); }
    // manchas recortadas al cuerpo
    ctx.save(); bodyPath(1); ctx.clip();
    for (i = 0; i < f.spots.length; i++) {
      var s = f.spots[i], fi = s.u * N, i0 = Math.floor(fi), i1 = Math.min(N, i0 + 1), fr = fi - i0;
      var px = sp[i0].x + (sp[i1].x - sp[i0].x) * fr, py = sp[i0].y + (sp[i1].y - sp[i0].y) * fr;
      var nx = sp[i0].nx, ny = sp[i0].ny, ww = sp[i0].w;
      ctx.fillStyle = s.dark ? 'rgba(0,0,0,' + s.a + ')' : 'rgba(255,255,255,' + (s.a * 0.6) + ')';
      ctx.beginPath(); ctx.arc(px + nx * ww * s.v, py + ny * ww * s.v, L * s.r, 0, 6.283); ctx.fill();
    }
    ctx.restore();
    // contorno fino y linea lateral
    bodyPath(1); ctx.strokeStyle = tone(f, 1, 0.32); ctx.lineWidth = 0.8; ctx.stroke();
    ctx.setLineDash([2, 5]); ctx.strokeStyle = tone(f, 1, 0.45); ctx.lineWidth = 1;
    for (var sd2 = -1; sd2 <= 1; sd2 += 2) {
      ctx.beginPath();
      for (i = 3; i <= N - 2; i++) { var q = side(i, sd2, 0.45); if (i === 3) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // cresta dorsal
    ctx.strokeStyle = tone(f, 1, 0.3); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(sp[4].x, sp[4].y); for (i = 5; i <= 10; i++) ctx.lineTo(sp[i].x, sp[i].y); ctx.stroke();
    // agallas, boca y ojos
    ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 1.1;
    var g1 = side(3, 1, 0.9), g2 = side(3, -1, 0.9), gc = { x: sp[3].x + sp[3].tx * -L * 0.02, y: sp[3].y + sp[3].ty * -L * 0.02 };
    ctx.beginPath(); ctx.moveTo(g1.x, g1.y); ctx.quadraticCurveTo(gc.x - sp[3].tx * L * 0.05, gc.y - sp[3].ty * L * 0.05, g2.x, g2.y); ctx.stroke();
    var m1 = { x: h.x + h.tx * L * 0.045 + h.nx * h.w * 0.62, y: h.y + h.ty * L * 0.045 + h.ny * h.w * 0.62 };
    var m2 = { x: h.x + h.tx * L * 0.045 - h.nx * h.w * 0.62, y: h.y + h.ty * L * 0.045 - h.ny * h.w * 0.62 };
    ctx.beginPath(); ctx.moveTo(m1.x, m1.y); ctx.quadraticCurveTo(h.x + h.tx * L * 0.07, h.y + h.ty * L * 0.07, m2.x, m2.y); ctx.stroke();
    for (var e = -1; e <= 1; e += 2) {
      var ex = sp[1].x + sp[1].nx * sp[1].w * 0.6 * e + sp[1].tx * L * 0.01, ey = sp[1].y + sp[1].ny * sp[1].w * 0.6 * e + sp[1].ty * L * 0.01;
      var er = Math.max(1.8, L * 0.016);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(ex, ey, er * 1.35, 0, 6.283); ctx.fill();
      ctx.fillStyle = tone(f, 1.15); ctx.beginPath(); ctx.arc(ex, ey, er, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, er * 0.55, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - er * 0.2, ey - er * 0.2, er * 0.18, 0, 6.283); ctx.fill();
    }
  }

  function drawWater(dt) {
    var i, k;
    for (i = drops.length - 1; i >= 0; i--) {
      var d = drops[i]; d.t += dt;
      if (d.t > 3.4) { drops.splice(i, 1); continue; }
      if (d.t < 0.3) {
        var q = 1 - d.t / 0.3;
        var g = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 16 * q + 2);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.9 * q) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(d.x, d.y, 16 * q + 2, 0, 6.283); ctx.fill();
      }
      for (k = 0; k < 1; k++) {
        var tk = d.t - k * 0.15; if (tk <= 0) continue;
        var r = ringR(tk), a = Math.max(0, 1 - tk / 2.6) * (0.6 - k * 0.11);
        if (a <= 0) continue;
        if (k === 0) {
          var gr = ctx.createRadialGradient(d.x, d.y, r * 0.55, d.x, d.y, r);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,' + (a * 0.12) + ')');
          ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, 6.283); ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255,255,255,' + a + ')'; ctx.lineWidth = 2 - k * 0.3;
        ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, 6.283); ctx.stroke();
      }
    }
    for (i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.985; p.vy *= 0.985; p.vz -= 640 * dt; p.z += p.vz * dt;
      if (p.z < 0 && p.vz < 0) { minis.push({ x: p.x, y: p.y, t: 0 }); parts.splice(i, 1); continue; }
      var sc = 1 + p.z / 110;
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(p.x, p.y - p.z * 0.35, p.r * sc, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(p.x, p.y + 2, p.r * 0.9, 0, 6.283); ctx.fill();
    }
    for (i = minis.length - 1; i >= 0; i--) {
      var m = minis[i]; m.t += dt;
      if (m.t > 0.8) { minis.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - m.t / 0.8)) + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(m.x, m.y, 3 + m.t * 34, 0, 6.283); ctx.stroke();
    }
  }

  var last = performance.now();
  function loop(t) {
    var dt = Math.min((t - last) / 1000, 0.05); last = t;
    ctx.clearRect(0, 0, W, H);
    var i;
    for (i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      b.y -= b.v * dt; b.x += Math.sin(t * 0.001 + b.p) * 6 * dt;
      if (b.y < -10) bubbles[i] = makeBubble(false);
      ctx.strokeStyle = 'rgba(255,255,255,' + b.a + ')'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.stroke();
    }
    fish.sort(function (a, c) { return a.depth - c.depth; });
    for (i = 0; i < fish.length; i++) { step(fish[i], t, dt); draw(fish[i]); }
    drawWater(dt);
    if (!document.hidden) requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { last = performance.now(); requestAnimationFrame(loop); }
  });

  resize();
  if (reduce) { fish.forEach(function (f) { f.base = 6; }); }
  requestAnimationFrame(loop);
  window.__fish = { addDrop: addDrop, fish: fish };
})();

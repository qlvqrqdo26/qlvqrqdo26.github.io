(function () {
  var cv = document.getElementById('fish');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dpr = 1;
  var fish = [], ripples = [];
  var ptr = { x: -9999, y: -9999, on: false };
  var palette = [
    [196, 66, 95], [150, 150, 162], [122, 31, 61], [112, 104, 116], [226, 120, 140], [96, 84, 96]
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.max(5, Math.min(9, Math.round(W * H / 150000)));
    while (fish.length < n) fish.push(make());
    fish.length = n;
  }

  function make() {
    var s = 34 + Math.random() * 30;
    var a = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: Math.cos(a), vy: Math.sin(a),
      s: s, sp: 0.28 + Math.random() * 0.34,
      ph: Math.random() * 10, c: palette[(Math.random() * palette.length) | 0],
      depth: 0.45 + Math.random() * 0.55, boost: 0
    };
  }

  function scatter(x, y, power) {
    ripples.push({ x: x, y: y, r: 0, a: 0.5 });
    fish.forEach(function (f) {
      var dx = f.x - x, dy = f.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 360) {
        var k = (1 - d / 360) * power;
        f.vx += dx / d * k * 2.2; f.vy += dy / d * k * 2.2;
        f.boost = Math.max(f.boost, k);
      }
    });
  }

  window.addEventListener('pointermove', function (e) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; }, { passive: true });
  window.addEventListener('pointerleave', function () { ptr.on = false; ptr.x = ptr.y = -9999; });
  window.addEventListener('pointerdown', function (e) { ptr.x = e.clientX; ptr.y = e.clientY; scatter(e.clientX, e.clientY, 1); }, { passive: true });
  window.addEventListener('resize', resize);

  function step(f, t, dt) {
    f.ph += dt * (3 + f.sp * 4 + f.boost * 6);
    var ang = Math.atan2(f.vy, f.vx);
    ang += Math.sin(t * 0.0004 * (1 + f.sp) + f.ph * 0.15) * 0.012;
    var sp = Math.sqrt(f.vx * f.vx + f.vy * f.vy);
    var target = f.sp * 1.1 * (0.6 + f.depth * 0.6);
    sp += (target - sp) * 0.02;
    if (sp > 6) sp = 6;
    // evita el puntero
    var dx = f.x - ptr.x, dy = f.y - ptr.y, d = Math.sqrt(dx * dx + dy * dy);
    if (ptr.on && d < 150) {
      var a2 = Math.atan2(dy, dx), diff = a2 - ang;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      ang += diff * 0.12 * (1 - d / 150);
      sp += (1 - d / 150) * 0.35;
      f.boost = Math.max(f.boost, (1 - d / 150) * 0.6);
    }
    // vuelta suave en los bordes
    var m = 60;
    if (f.x < m) ang = turn(ang, 0, 0.03); else if (f.x > W - m) ang = turn(ang, Math.PI, 0.03);
    if (f.y < m) ang = turn(ang, Math.PI / 2, 0.03); else if (f.y > H - m) ang = turn(ang, -Math.PI / 2, 0.03);
    f.vx = Math.cos(ang) * sp; f.vy = Math.sin(ang) * sp;
    f.x += f.vx * dt * 60; f.y += f.vy * dt * 60;
    f.boost *= 0.96;
  }

  function turn(a, to, k) {
    var d = Math.atan2(Math.sin(to - a), Math.cos(to - a));
    return a + d * k;
  }

  function draw(f) {
    var ang = Math.atan2(f.vy, f.vx), s = f.s;
    var c = f.c, al = 0.2 + f.depth * 0.34;
    var N = 16, top = [], bot = [], i, u, w, x, y;
    for (i = 0; i <= N; i++) {
      u = i / N;
      x = s * (1 - u * 2.5);
      w = s * 0.5 * (u < 0.18 ? 0.8 + u * 1.1 : Math.max(0.1, 1 - (u - 0.18) * 1.05));
      y = Math.sin(f.ph - u * 3.2) * s * 0.2 * u * u * 1.8;
      top.push([x, y - w]); bot.push([x, y + w]);
    }
    var tail = top[N], tailB = bot[N], ty = (tail[1] + tailB[1]) / 2;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(ang);
    var col = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',';
    // bigotes (barbillas)
    ctx.strokeStyle = col + (al * 0.9) + ')';
    ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.lineCap = 'round';
    var b, side, len, k;
    for (side = -1; side <= 1; side += 2) {
      for (b = 0; b < 3; b++) {
        len = s * (b === 0 ? 1.15 : 0.8);
        var a0 = side * (0.35 + b * 0.38);
        var sx = s * 0.97, sy = side * s * 0.08 * (b + 1) * 0.6;
        ctx.beginPath(); ctx.moveTo(sx, sy);
        for (k = 1; k <= 6; k++) {
          var t = k / 6;
          ctx.lineTo(sx + Math.cos(a0) * len * t + Math.sin(f.ph * 1.3 + b + t * 4) * s * 0.05 * t,
                     sy + Math.sin(a0) * len * t * 0.9 + Math.sin(f.ph * 1.3 + b * 2 + t * 5) * s * 0.07 * t);
        }
        ctx.stroke();
      }
    }
    ctx.fillStyle = col + al + ')';
    // cola redondeada
    var sw = Math.sin(f.ph - 3.2) * 0.3;
    ctx.save();
    ctx.translate(tail[0] + s * 0.05, ty);
    ctx.rotate(sw);
    ctx.beginPath();
    ctx.moveTo(s * 0.12, -s * 0.07);
    ctx.bezierCurveTo(-s * 0.35, -s * 0.5, -s * 0.7, -s * 0.34, -s * 0.62, 0);
    ctx.bezierCurveTo(-s * 0.7, s * 0.34, -s * 0.35, s * 0.5, s * 0.12, s * 0.07);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // aleta dorsal y de la cola baja
    ctx.fillStyle = col + (al * 0.7) + ')';
    ctx.beginPath();
    ctx.moveTo(top[4][0], top[4][1] + s * 0.04);
    ctx.quadraticCurveTo(top[6][0], top[6][1] - s * 0.22, top[8][0], top[8][1] + s * 0.04);
    ctx.fill();
    // cuerpo
    ctx.fillStyle = col + al + ')';
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    ctx.quadraticCurveTo(s * 1.45, 0, bot[0][0], bot[0][1]);
    for (i = 0; i <= N; i++) ctx.lineTo(bot[i][0], bot[i][1]);
    for (i = N; i >= 0; i--) ctx.lineTo(top[i][0], top[i][1]);
    ctx.closePath(); ctx.fill();
    // vientre mas claro
    ctx.fillStyle = 'rgba(255,255,255,' + (al * 0.16) + ')';
    ctx.beginPath();
    for (i = 0; i <= N - 2; i++) {
      var yy = (top[i][1] + bot[i][1]) / 2;
      if (i === 0) ctx.moveTo(bot[i][0], yy + (bot[i][1] - yy) * 0.1); 
      ctx.lineTo(bot[i][0], yy + (bot[i][1] - yy) * 0.25);
    }
    for (i = N - 2; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1] - s * 0.01);
    ctx.closePath(); ctx.fill();
    // aletas pectorales
    ctx.fillStyle = col + (al * 0.8) + ')';
    for (side = -1; side <= 1; side += 2) {
      ctx.beginPath();
      ctx.moveTo(s * 0.55, side * s * 0.22);
      ctx.quadraticCurveTo(s * 0.25, side * s * (0.62 + Math.sin(f.ph) * 0.1), s * 0.1, side * s * 0.3);
      ctx.fill();
    }
    // ojos pequenos
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.9, al + 0.3) + ')';
    for (side = -1; side <= 1; side += 2) {
      ctx.beginPath(); ctx.arc(s * 0.8, side * s * 0.17, Math.max(1.4, s * 0.045), 0, 6.283); ctx.fill();
    }
    ctx.restore();
  }

  var last = performance.now();
  function loop(t) {
    var dt = Math.min((t - last) / 1000, 0.05); last = t;
    ctx.clearRect(0, 0, W, H);
    for (var i = ripples.length - 1; i >= 0; i--) {
      var r = ripples[i];
      r.r += dt * 380; r.a -= dt * 0.55;
      if (r.a <= 0) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(196,66,95,' + r.a + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283); ctx.stroke();
    }
    fish.sort(function (a, b) { return a.depth - b.depth; });
    for (var j = 0; j < fish.length; j++) { step(fish[j], t, dt); draw(fish[j]); }
    if (!document.hidden) requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { last = performance.now(); requestAnimationFrame(loop); }
  });

  resize();
  if (reduce) { fish.forEach(function (f) { f.sp = 0.08; }); }
  requestAnimationFrame(loop);
  window.__fish = { scatter: scatter, fish: fish };
})();

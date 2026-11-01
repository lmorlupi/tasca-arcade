// FLIPPER DEL BAR: un flipper all'italiana, di quelli del bar sotto casa. Gioco originale: tutto disegnato e suonato dal codice.
registerGame({
  id: 'flipper-del-bar',
  title: 'FLIPPER DEL BAR',
  author: 'Tasca Arcade',
  license: 'MIT',
  color: '#e8455f',
  blurb: 'Il flipper del bar sotto casa: tira la molla, tieni la pallina in gioco con le due palette, colpisci i paraurti e accendi i tre bersagli per il bonus. Tocca a sinistra e a destra, o usa la croce.',
  inputs: ['TOCCO', 'D-PAD', 'MULTI-TOCCO'],
  size: [360, 640],
  bg: '#1a0f26',
  flexH: true,
  flexMin: 1.2,
  create(api) {
    const { cv, g, held } = api;
    const CW = cv.width, CH = cv.height;
    const VWd = 360, VHd = 640;
    const S = Math.min(CW / VWd, CH / VHd), OX = (CW - VWd * S) / 2, OY = (CH - VHd * S) / 2;
    const R = 7, GRAV = 640, CX = 180, CY = 220, AR = 162, LANE_X = 322, WALL_L = 18, WALL_R = 342;
    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, balls = 3, ball = null, charge = 0, charging = false, time = 0, msg = '', msgT = 0, bonusLit = [false, false, false], flashT = 0, chain = 0;
    const flip = { L: { a: 0.5, w: 0, down: false }, R: { a: Math.PI - 0.5, w: 0, down: false } };
    const REST = 0.5, ACT = -0.45, FSPEED = 20, FLEN = 62, FR = 7;
    const PIV = { L: [118, 566], R: [242, 566] };
    const bumpers = [{ x: 108, y: 255, r: 18, l: 0 }, { x: 232, y: 255, r: 18, l: 0 }, { x: 170, y: 330, r: 18, l: 0 }];
    const targets = [{ x: 62, y: 170, lit: false }, { x: 180, y: 120, lit: false }, { x: 288, y: 170, lit: false }];
    const guides = [[18, 505, 118, 566], [322, 505, 242, 566]];
    const lights = Array.from({ length: 14 }, (_, i) => ({ a: Math.PI * (1.05 + 0.9 * i / 13) }));
    const pointers = new Map();
    const flash = t => { msg = t; msgT = 1.3; };
    const spawn = () => { ball = { x: 332, y: 602, vx: 0, vy: 0, lane: true }; charge = 0; charging = false; };
    const newGame = () => { score = 0; balls = 3; state = 'play'; targets.forEach(t => t.lit = false); spawn(); };
    const endGame = () => { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } };

    const colCircleOut = (cx, cy, cr, e, kick) => {          // la pallina deve restare fuori dal cerchio
      const dx = ball.x - cx, dy = ball.y - cy, d = Math.hypot(dx, dy), m = cr + R;
      if (d >= m || d === 0) return false;
      const nx = dx / d, ny = dy / d; ball.x = cx + nx * m; ball.y = cy + ny * m;
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; }
      if (kick) { ball.vx += nx * kick; ball.vy += ny * kick; }
      return true;
    };
    const colSegment = (ax, ay, bx, by, rad, e, wx, wy) => {   // capsula (segmento con spessore); (wx,wy) = velocita' della superficie
      const abx = bx - ax, aby = by - ay, l2 = abx * abx + aby * aby;
      let t = ((ball.x - ax) * abx + (ball.y - ay) * aby) / l2; t = Math.max(0, Math.min(1, t));
      const px = ax + abx * t, py = ay + aby * t, dx = ball.x - px, dy = ball.y - py, d = Math.hypot(dx, dy), m = rad + R;
      if (d >= m || d === 0) return false;
      const nx = dx / d, ny = dy / d; ball.x = px + nx * m; ball.y = py + ny * m;
      const sx = (wx || 0) * t, sy = (wy || 0) * t;
      const rvx = ball.vx - sx, rvy = ball.vy - sy, vn = rvx * nx + rvy * ny;
      if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; }
      return true;
    };
    const flipperTip = (k) => { const p = PIV[k], a = flip[k].a; return [p[0] + Math.cos(a) * FLEN, p[1] + Math.sin(a) * FLEN]; };

    const step = h => {
      ball.vy += GRAV * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
      const sp = Math.hypot(ball.vx, ball.vy); if (sp > 1100) { ball.vx *= 1100 / sp; ball.vy *= 1100 / sp; }
      if (ball.lane) {
        if (ball.x < LANE_X + R) { ball.x = LANE_X + R; ball.vx = Math.abs(ball.vx) * 0.2; }
        if (ball.y > 250 && ball.x > WALL_R - R) { ball.x = WALL_R - R; ball.vx = -Math.abs(ball.vx) * 0.2; }
        if (ball.y > 602) { ball.y = 602; ball.vy = Math.min(0, ball.vy); }
        if (ball.y <= 250) ball.lane = false;
      } else if (ball.y > 250) {
        if (ball.x > LANE_X - R) { ball.x = LANE_X - R; ball.vx = -Math.abs(ball.vx) * 0.5; }
        if (ball.x < WALL_L + R) { ball.x = WALL_L + R; ball.vx = Math.abs(ball.vx) * 0.5; }
      }
      if (ball.y < CY) {                                        // arco in alto
        const dx = ball.x - CX, dy = ball.y - CY, d = Math.hypot(dx, dy);
        if (d > AR - R) { const nx = dx / d, ny = dy / d; ball.x = CX + nx * (AR - R); ball.y = CY + ny * (AR - R); const vn = ball.vx * nx + ball.vy * ny; if (vn > 0) { ball.vx -= 1.45 * vn * nx; ball.vy -= 1.45 * vn * ny; } }
      } else if (ball.y <= 250 && !ball.lane) {
        if (ball.x < WALL_L + R) { ball.x = WALL_L + R; ball.vx = Math.abs(ball.vx) * 0.5; }
        if (ball.x > WALL_R - R) { ball.x = WALL_R - R; ball.vx = -Math.abs(ball.vx) * 0.5; }
      }
      for (const b of bumpers) if (colCircleOut(b.x, b.y, b.r, 0.5, 340)) { b.l = 0.25; score += 100 + chain * 10; chain = Math.min(chain + 1, 20); api.haptic(8); api.beep(520 + (b.x % 5) * 60, 0.05, 'square', 0.05); }
      for (const t of targets) if (colCircleOut(t.x, t.y, 8, 0.3, 80)) { if (!t.lit) { t.lit = true; score += 250; api.beep(900, 0.07, 'triangle', 0.05); if (targets.every(q => q.lit)) { score += 1000; flash('BONUS +1000!'); targets.forEach(q => q.lit = false); api.haptic(30); [660, 880, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.1, 'triangle', 0.05), i * 90)); } } }
      for (const [ax, ay, bx, by] of guides) colSegment(ax, ay, bx, by, 3, 0.35);
      for (const k of ['L', 'R']) {
        const p = PIV[k], tp = flipperTip(k), w = flip[k].w;
        // velocita' della punta (perpendicolare al segmento): w * lunghezza
        const a = flip[k].a, wx = -Math.sin(a) * w * FLEN, wy = Math.cos(a) * w * FLEN;
        if (colSegment(p[0], p[1], tp[0], tp[1], FR, 0.45, wx, wy) && Math.abs(w) > 1) { api.haptic(6); }
      }
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt); flashT = Math.max(0, flashT - dt);
      bumpers.forEach(b => b.l = Math.max(0, b.l - dt));
      if (state !== 'play') return;
      const wantL = held.left || held.b || [...pointers.values()].includes('L'), wantR = held.right || held.a || [...pointers.values()].includes('R');
      if (ball.lane && ball.y > 590) { if (wantR || charging) { charging = true; charge = Math.min(1, charge + dt * 1.1); } }
      for (const k of ['L', 'R']) {
        const f = flip[k], on = k === 'L' ? wantL : wantR, was = f.down; f.down = on;
        if (on && !was && !ball.lane) { api.haptic(10); api.beep(160, 0.04, 'square', 0.04); }
        const target = k === 'L' ? (on ? ACT : REST) : (on ? Math.PI - ACT : Math.PI - REST);
        const diff = target - f.a, mv = Math.sign(diff) * Math.min(Math.abs(diff), FSPEED * dt);
        f.w = dt > 0 ? mv / dt : 0; f.a += mv;
      }
      const n = 8; for (let i = 0; i < n; i++) step(dt / n);
      if (ball.y > 668) {
        balls--; chain = 0; api.haptic(40); api.beep(140, 0.35, 'sawtooth', 0.06);
        if (balls <= 0) endGame(); else { spawn(); flash('PALLINA ' + (4 - balls)); }
      }
    };
    const launch = () => {
      if (!ball || !ball.lane || ball.y < 590) return;
      ball.vy = -(780 + 330 * charge); ball.vx = 0; api.haptic(25); api.beep(220, 0.1, 'square', 0.05); charging = false; charge = 0;
    };
    const act = k => {
      if (k === 'start' || (k === 'a' && state !== 'play')) { if (state === 'title' || state === 'over') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; return; }
      if (k === 'select' && state !== 'title') newGame();
    };
    const onRelease = k => { if (k === 'a' && state === 'play' && charging) launch(); };
    const onPointer = e => {
      const vx = (e.x - OX) / S;
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(); return; }
        if (state === 'pause') { state = 'play'; return; }
        if (ball && ball.lane && ball.y > 590 && vx > 280) { pointers.set(e.id, 'P'); charging = true; return; }
        pointers.set(e.id, vx < VWd / 2 ? 'L' : 'R');
      } else if (e.type === 'up') {
        if (pointers.get(e.id) === 'P' && charging) launch();
        pointers.delete(e.id);
      }
    };

    // ---- disegno ----
    const text = (s, x, y, size, align, c) => { g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#fff4e0'; g.fillText(s, x, y); };
    const banner = rows => { const h = rows.length * 26 + 16, w = 260, x = (VWd - w) / 2, y = (VHd - h) / 2; g.fillStyle = '#fff4e0'; g.fillRect(x, y, w, h); g.fillStyle = '#2a1238'; g.fillRect(x + 2, y + 2, w - 4, h - 4); rows.forEach((t, i) => text(t, VWd / 2, y + 12 + i * 26, 18, 'center')); };
    const glowDot = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.4); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.4, 0, 7); g.fill(); g.globalAlpha = 1; };
    const drawFlipper = k => {
      const p = PIV[k], tp = flipperTip(k), dir = k === 'L' ? 1 : -1;
      const ang = Math.atan2(tp[1] - p[1], tp[0] - p[0]);
      g.save(); g.translate(p[0], p[1]); g.rotate(ang);
      const fg = g.createLinearGradient(0, -FR - 2, 0, FR + 2); fg.addColorStop(0, '#fff3c4'); fg.addColorStop(0.5, '#f2b81c'); fg.addColorStop(1, '#a8660c');
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.roundRect(-FR + 1, -FR + 4, FLEN + FR * 2, FR * 2, FR); g.fill();
      g.fillStyle = fg; g.beginPath(); g.moveTo(0, -FR - 1.5); g.lineTo(FLEN, -4); g.arc(FLEN, 0, 4, -Math.PI / 2, Math.PI / 2); g.lineTo(0, FR + 1.5); g.arc(0, 0, FR + 1.5, Math.PI / 2, -Math.PI / 2); g.closePath(); g.fill();
      g.fillStyle = '#e8455f'; g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(6, -FR + 1.5, FLEN - 14, 1.6);
      g.restore();
    };
    const render = () => {
      g.fillStyle = '#12081c'; g.fillRect(0, 0, CW, CH);
      g.save(); g.translate(OX, OY); g.scale(S, S);
      // tavolo
      const bg = g.createLinearGradient(0, 0, 0, VHd); bg.addColorStop(0, '#3b1a5c'); bg.addColorStop(0.55, '#26104a'); bg.addColorStop(1, '#1a0b36'); g.fillStyle = bg; g.fillRect(0, 0, VWd, VHd);
      g.save(); g.beginPath(); g.moveTo(WALL_L, VHd); g.lineTo(WALL_L, CY); g.arc(CX, CY, AR, Math.PI, 0); g.lineTo(WALL_R, VHd); g.closePath(); g.clip();
      const bl = g.createRadialGradient(CX, 300, 20, CX, 300, 300); bl.addColorStop(0, 'rgba(255,120,200,.22)'); bl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bl; g.fillRect(0, 0, VWd, VHd);
      // insegna BAR
      g.fillStyle = 'rgba(255,230,120,' + (0.55 + 0.25 * Math.sin(time * 3)) + ')'; g.font = 'bold 34px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAR', CX, 470);
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let y = 0; y < VHd; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(VWd, y); g.stroke(); }
      g.restore();
      // bordi
      g.strokeStyle = '#e9d9ff'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); g.moveTo(WALL_L - 2, VHd); g.lineTo(WALL_L - 2, CY); g.arc(CX, CY, AR + 2, Math.PI, 0); g.lineTo(WALL_R + 2, VHd); g.stroke();
      g.strokeStyle = 'rgba(160,110,230,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(LANE_X, 250); g.lineTo(LANE_X, VHd - 20); g.stroke();
      lights.forEach((l, i) => { const on = ((time * 6 + i) | 0) % 3 === 0; const lx = CX + Math.cos(l.a) * (AR - 12), ly = CY + Math.sin(l.a) * (AR - 12); glowDot(lx, ly, 3, on ? '#ffe66a' : '#6b4fa0', on ? 0.7 : 0.25); g.fillStyle = on ? '#fff3b0' : '#8a6cc8'; g.beginPath(); g.arc(lx, ly, 2.4, 0, 7); g.fill(); });
      for (const [ax, ay, bx, by] of guides) { g.strokeStyle = '#e9d9ff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.strokeStyle = '#8a6cc8'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
      // paraurti
      for (const b of bumpers) {
        const k = b.l > 0 ? 1 : 0; glowDot(b.x, b.y, b.r, k ? '#fff3b0' : '#ff5a8a', k ? 0.9 : 0.45);
        const bgr = g.createRadialGradient(b.x - 5, b.y - 6, 2, b.x, b.y, b.r); bgr.addColorStop(0, k ? '#ffffff' : '#ff9ab8'); bgr.addColorStop(1, k ? '#ffd54a' : '#c8185a');
        g.fillStyle = bgr; g.beginPath(); g.arc(b.x, b.y, b.r - 2 + k * 2, 0, 7); g.fill(); g.strokeStyle = '#fff4e0'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(b.x - 5, b.y - 7, 5, 2.4, -0.6, 0, 7); g.fill();
      }
      for (const t of targets) { glowDot(t.x, t.y, 8, t.lit ? '#6fffa0' : '#5a4a8a', t.lit ? 0.8 : 0.3); g.fillStyle = t.lit ? '#6fffa0' : '#6a5aa0'; g.beginPath(); g.arc(t.x, t.y, 8, 0, 7); g.fill(); g.strokeStyle = '#fff4e0'; g.lineWidth = 2; g.stroke(); }
      // molla
      const py = ball && ball.lane ? ball.y + R + charge * 14 : 614;
      g.strokeStyle = '#c9c0d8'; g.lineWidth = 2.2; g.beginPath(); for (let i = 0; i < 8; i++) { const y = py + i * (VHd - 12 - py) / 8; g.lineTo(332 + (i % 2 ? 5 : -5), y); } g.stroke();
      g.fillStyle = '#e8455f'; g.fillRect(324, py - 2, 16, 4);
      drawFlipper('L'); drawFlipper('R');
      // pallina
      if (ball) {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(ball.x + 3, ball.y + 5, R, R * 0.7, 0, 0, 7); g.fill();
        const gb = g.createRadialGradient(ball.x - 2.5, ball.y - 3, 0.5, ball.x, ball.y, R + 1); gb.addColorStop(0, '#ffffff'); gb.addColorStop(0.5, '#c9d2e8'); gb.addColorStop(1, '#5b6580');
        g.fillStyle = gb; g.beginPath(); g.arc(ball.x, ball.y, R, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(ball.x - 2.2, ball.y - 2.6, 1.6, 0, 7); g.fill();
      }
      // HUD
      g.fillStyle = 'rgba(10,4,24,.7)'; g.fillRect(0, 0, VWd, 26);
      text('PUNTI ' + String(score).padStart(6, '0'), 8, 6, 13); for (let i = 0; i < balls; i++) { g.fillStyle = '#dfe6ff'; g.beginPath(); g.arc(VWd - 14 - i * 16, 13, 5, 0, 7); g.fill(); }
      if (msgT > 0) text(msg, VWd / 2, 60, 18, 'center', '#ffe66a');
      if (state === 'play' && ball && ball.lane && ball.y > 590) text(charging ? 'LASCIA PER LANCIARE' : 'TIENI PREMUTO LA MOLLA (A)', VWd / 2, 596, 10, 'center', '#ffe66a');
      if (state === 'title') {
        g.fillStyle = 'rgba(12,4,26,.78)'; g.fillRect(0, 0, VWd, VHd);
        text('FLIPPER', VWd / 2, 150, 50, 'center', '#ff5a8a'); text('DEL BAR', VWd / 2, 206, 44, 'center', '#ffe66a');
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', VWd / 2, 330, 16, 'center', '#fff4e0');
        text('SINISTRA / DESTRA = LE PALETTE', VWd / 2, 380, 11, 'center', '#c9b6e8'); text('TIENI PREMUTA LA MOLLA A DESTRA PER LANCIARE', VWd / 2, 402, 10, 'center', '#c9b6e8');
        text('RECORD ' + hi, VWd / 2, 450, 14, 'center');
      }
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['FINE PARTITA', 'PUNTI ' + score, 'RECORD ' + hi, 'TOCCA']);
      g.restore();
    };

    spawn();
    return {
      onPress: act, onRelease, onPointer,
      onHide() { if (state === 'play') state = 'pause'; pointers.clear(); },
      update, render,
      debug: { newGame, get state() { return state; }, get ball() { return ball; }, get score() { return score; }, get balls() { return balls; }, launch, flip, step, set charge(v) { charge = v; } },
    };
  },
});

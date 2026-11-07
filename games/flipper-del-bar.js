// FLIPPER DEL BAR: un flipper all'italiana, di quelli del bar sotto casa. Gioco originale: tutto disegnato e suonato dal codice.
registerGame({
  id: 'flipper-del-bar',
  title: 'FLIPPER DEL BAR',
  author: 'Tasca Arcade',
  license: 'MIT',
  color: '#e8455f',
  blurb: "Tieni in gioco la pallina e colpisci i bersagli per fare punti.",
  inputs: ['TOCCO', 'D-PAD', 'ANCA E BACINO'],
  size: [360, 640],
  bg: '#1a0f26',
  flexH: true,
  flexMin: 1.2,
  tilt: true,
  create(api) {
    const { cv, g, held, tilt } = api;
    const CW = cv.width, CH = cv.height;
    const VWd = 360, VHd = 640;
    const S = Math.min(CW / VWd, CH / VHd), OX = (CW - VWd * S) / 2, OY = (CH - VHd * S) / 2;
    const R = 7, GRAV = 640, CX = 180, CY = 220, AR = 162, LANE_X = 322, WALL_L = 18, WALL_R = 342;
    let hi = api.store.get('hi', 0);
    // Suoni sintetizzati (nessun file) e vibrazioni piu' decise
    const tone = (f, d, type, v, at) => at ? setTimeout(() => api.beep(f, d, type, v), at) : api.beep(f, d, type, v);
    const hap = (...ms) => { ms.forEach((m, i) => { if (i === 0) api.haptic(m); else setTimeout(() => api.haptic(m), i * 55); }); };
    // Stile elettromeccanico: raffiche di scatti e campanelli sottili (1-6 kHz, note ricorrenti intorno a 950, 1300 e 2000 Hz),
    // e il colpo sordo delle bobine intorno ai 190 Hz. Tutto sintetizzato.
    const bell = (f, v, at) => { tone(f, 0.5, 'sine', v, at); tone(f * 2.4, 0.28, 'sine', v * 0.5, at); tone(f * 4.1, 0.14, 'sine', v * 0.28, at); };
    const ticks = (n, v, at0) => { const F = [1350, 2050, 2550, 1700]; for (let k = 0; k < n; k++) { const at = (at0 || 0) + k * (95 + (k % 2) * 28); tone(F[k % 4], 0.018, 'square', v, at || undefined); tone(F[(k + 1) % 4] * 1.5, 0.01, 'square', v * 0.5, at + 6); } };
    const thud = (v, at) => { tone(190, 0.11, 'sine', v, at); tone(95, 0.09, 'triangle', v * 0.7, at); tone(2400, 0.008, 'square', v * 0.3, at); };
    const knock = (at) => { thud(0.16, at); tone(60, 0.16, 'sine', 0.16, at); };
    const sfx = {
      flipper() { thud(0.12); ticks(1, 0.05, 4); hap(30); },
      flipperHit() { thud(0.1); tone(1350, 0.02, 'square', 0.06, 6); hap(42); },
      bumper(i) { bell([950, 1300, 2000][(i || 0) % 3], 0.09); ticks(2, 0.05, 8); thud(0.07); hap(50, 22); },
      sling() { thud(0.1); ticks(2, 0.05, 6); hap(38, 16); },
      target() { bell(1300, 0.08); ticks(2, 0.04, 40); hap(26); },
      drop() { thud(0.09); ticks(1, 0.05, 20); tone(950, 0.05, 'triangle', 0.06, 30); hap(28); },
      lane(i) { bell([950, 1300, 2000][i % 3], 0.06); hap(14); },
      saucer() { thud(0.1); ticks(4, 0.04, 40); hap(45, 25); },
      eject() { thud(0.12); ticks(2, 0.05, 20); bell(2000, 0.05, 40); hap(55); },
      launch() { tone(55, 0.18, 'sine', 0.14); ticks(5, 0.04, 40); thud(0.1, 150); hap(70, 30); },
      drain() { for (let k = 0; k < 4; k++) tone(260 - k * 50, 0.14, 'sawtooth', 0.06, k * 100); knock(420); hap(120, 60, 30); },
      jingle() { bell(950, 0.08); bell(1300, 0.08, 150); bell(2000, 0.08, 300); ticks(8, 0.04, 450); knock(560); hap(45, 35, 35); },
      wall(v) { if (v > 260) tone(1500 + Math.random() * 600, 0.01, 'square', Math.min(0.04, v / 18000)); },
    };
    let lastN = [0, -1], slingRun = 0, slingCool = [0, 0], mult = 0, bonusN = 0, laneLit = [false, false, false], saucer = { x: 180, y: 192, t: 0, ball: false }, slingL = 0, slingR = 0, extraLit = false;
    const MULTS = [1, 2, 3, 5, 10];
    const drops = Array.from({ length: 4 }, (_, i) => ({ x: 300, y: 196 + i * 18, down: false })); let dropReset = 0, starL = 0, starR = 0, extraFlash = 0;
    let state = 'title', score = 0, balls = 3, ball = null, charge = 0, charging = false, time = 0, msg = '', msgT = 0, bonusLit = [false, false, false], flashT = 0, chain = 0, ballSave = 0, saveReady = true;
    const flip = { L: { a: 0.5, w: 0, down: false }, R: { a: Math.PI - 0.5, w: 0, down: false } };
    const REST = 0.5, ACT = -0.45, FSPEED = 20, FLEN = 48, FR = 7;
    const PIV = { L: [118, 566], R: [242, 566] };
    const bumpers = [{ x: 108, y: 255, r: 18, l: 0 }, { x: 232, y: 255, r: 18, l: 0 }, { x: 170, y: 330, r: 18, l: 0 }];
    const targets = [{ x: 62, y: 170, lit: false }, { x: 180, y: 148, lit: false }, { x: 288, y: 170, lit: false }];
    const guides = [[18, 505, 118, 566], [322, 505, 242, 566]];
    const lights = Array.from({ length: 14 }, (_, i) => ({ a: Math.PI * (1.05 + 0.9 * i / 13) }));
    const pointers = new Map(), trail = [];
    const flash = t => { msg = t; msgT = 1.3; };
    // Anca e bacino: spintarelle al tavolo. Troppe e troppo ravvicinate fanno scattare il TILT.
    let tiltG = 0, tilted = false, shake = { x: 0, y: 0, t: 0 }, prevTx = 0, nudgeCool = 0, prevUp = false;
    const nudge = (dx, dy) => {
      if (state !== 'play' || tilted || nudgeCool > 0 || !ball || ball.lane || saucer.ball) return;
      nudgeCool = 0.28; tiltG += 0.3; ball.vx += dx * 110; ball.vy += dy * 130;
      shake = { x: dx * 3.2, y: dy * 3.2, t: 0.22 }; hap(60, 35, 20, 10); tone(85, 0.12, 'triangle', 0.12); tone(60, 0.1, 'square', 0.09, 30);
      if (tiltG >= 1) { tilted = true; bonusN = 0; flash('TILT!'); msgT = 2.4; hap(120, 90, 90, 70, 70, 50); for (let k = 0; k < 6; k++) tone(180 - k * 20, 0.16, 'sawtooth', 0.1, k * 110); }
      else if (tiltG >= 0.6) { flash('ATTENTO AL TILT!'); }
    };
    const spawn = () => { slingRun = 0; slingCool = [0, 0]; ball = { x: 332, y: 602, vx: 0, vy: 0, lane: true }; charge = 0; charging = false; tilted = false; tiltG = 0; };
    const newGame = () => { score = 0; balls = 3; ballSave = 0; saveReady = true; mult = 0; bonusN = 0; laneLit = [false, false, false]; extraLit = false; drops.forEach(d => d.down = false); state = 'play'; targets.forEach(t => t.lit = false); spawn(); };
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
      const nx = dx / d, ny = dy / d; ball.x = px + nx * m; ball.y = py + ny * m; lastN = [nx, ny];
      const sx = (wx || 0) * t, sy = (wy || 0) * t;
      const rvx = ball.vx - sx, rvy = ball.vy - sy, vn = rvx * nx + rvy * ny;
      if (vn < 0) { ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny; }
      return true;
    };
    const flipperTip = (k) => { const p = PIV[k], a = flip[k].a; return [p[0] + Math.cos(a) * FLEN, p[1] + Math.sin(a) * FLEN]; };

    const laneX = [150, 180, 210];
    const posts = [[40, 428], [96, 500], [320, 428], [264, 500]];
    const step = h => {
      if (saucer.ball) { saucer.t -= h; if (saucer.t <= 0) { saucer.ball = false; ball.vx = (Math.random() * 2 - 1) * 160; ball.vy = 230; saucer.cool = 0.5; sfx.eject(); } else { ball.x = saucer.x; ball.y = saucer.y; return; } }
      ball.vy += GRAV * h; ball.x += ball.vx * h; ball.y += ball.vy * h;
      const sp = Math.hypot(ball.vx, ball.vy); if (sp > 1100) { ball.vx *= 1100 / sp; ball.vy *= 1100 / sp; }
      const pvx = ball.vx, pvy = ball.vy;
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
      if (Math.abs(ball.vx - pvx) + Math.abs(ball.vy - pvy) > 220) sfx.wall(Math.hypot(ball.vx, ball.vy));
      for (const b of bumpers) if (colCircleOut(b.x, b.y, b.r, 0.5, 340)) { slingRun = 0; b.l = 0.25; bonusN = Math.min(10, bonusN + (chain % 3 === 2 ? 1 : 0)); score += 100 + chain * 10; chain = Math.min(chain + 1, 20); sfx.bumper(bumpers.indexOf(b)); }
      for (const t of targets) if (colCircleOut(t.x, t.y, 8, 0.3, 80)) { slingRun = 0; if (!t.lit) { t.lit = true; score += 250; sfx.target(); if (targets.every(q => q.lit)) { score += 1000; if (balls < 5) { balls++; flash('PALLINA EXTRA!'); } else flash('BONUS +1000!'); targets.forEach(q => q.lit = false); extraFlash = 2; api.haptic(30); sfx.jingle(); } } }
      for (const dt of drops) if (!dt.down && colCircleOut(dt.x, dt.y, 7, 0.3, 40)) { slingRun = 0; dt.down = true; score += 200; sfx.drop(); if (drops.every(q => q.down)) { score += 1000; dropReset = 1.2; flash('BANCO COMPLETO +1000'); if (mult < MULTS.length - 1 && drops.length) { bonusN = Math.min(10, bonusN + 2); } } }
      if (Math.hypot(ball.x - 58, ball.y - 484) < 9 && starL <= 0) { starL = 2; score += 200; sfx.lane(2); }
      if (Math.hypot(ball.x - 302, ball.y - 484) < 9 && starR <= 0) { starR = 2; score += 200; sfx.lane(2); }
      for (const [ax, ay, bx, by] of guides) colSegment(ax, ay, bx, by, 3, 0.35);
      for (const [px, py] of posts) colCircleOut(px, py, 4, 0.5, 0);
      // rimbalzatori a molla sopra le palette
      // Il calcio della fionda si spegne a ogni colpo di fila senza toccare altro: altrimenti la pallina prende energia
      // a ogni rimbalzo e va avanti e indietro tra le due fionde senza scendere mai alle palette.
      slingCool[0] = Math.max(0, slingCool[0] - h); slingCool[1] = Math.max(0, slingCool[1] - h);
      [[46, 432, 96, 500, 0], [314, 432, 264, 500, 1]].forEach(([ax, ay, bx, by, i]) => {
        if (!colSegment(ax, ay, bx, by, 3, 0.2) || slingCool[i] > 0) return;
        slingCool[i] = 0.12;
        const k = Math.max(0, 1 - 0.34 * slingRun);
        ball.vx += lastN[0] * 300 * k; ball.vy += lastN[1] * 300 * k;
        if (i) slingR = 0.2; else slingL = 0.2;
        if (slingRun < 3) score += 10;
        slingRun++;
        if (k > 0) sfx.sling();
      });
      // corsie in alto: accendi A, B, C per salire di moltiplicatore
      if (ball.y > 92 && ball.y < 116) laneX.forEach((lx, i) => { if (Math.abs(ball.x - lx) < 9 && !laneLit[i]) { laneLit[i] = true; score += 50; sfx.lane(i); if (laneLit.every(Boolean)) { laneLit = [false, false, false]; if (mult < MULTS.length - 1) { mult++; flash('MOLTIPLICATORE x' + MULTS[mult]); sfx.jingle(); } else { score += 500; flash('ZONA BONUS +500'); } } } });
      // piattello: trattiene la pallina un attimo, poi la sputa via
      if (saucer.cool > 0) saucer.cool -= h;
      if (!saucer.ball && !(saucer.cool > 0) && Math.hypot(ball.x - saucer.x, ball.y - saucer.y) < 10) { slingRun = 0; saucer.ball = true; saucer.t = 0.8; ball.vx = 0; ball.vy = 0; score += 500; bonusN = Math.min(10, bonusN + 1); sfx.saucer(); if (mult >= 2) { score += 2500; flash('SPECIAL +2500!'); sfx.jingle(); } }
      if (saucer.ball) { ball.x = saucer.x; ball.y = saucer.y; ball.vx = 0; ball.vy = 0; }
      for (const k of ['L', 'R']) {
        const p = PIV[k], tp = flipperTip(k), w = flip[k].w;
        // velocita' della punta (perpendicolare al segmento): w * lunghezza
        const a = flip[k].a, wx = -Math.sin(a) * w * FLEN, wy = Math.cos(a) * w * FLEN;
        if (colSegment(p[0], p[1], tp[0], tp[1], FR, 0.45, wx, wy)) { slingRun = 0; if (Math.abs(w) > 1) sfx.flipperHit(); }
      }
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt); flashT = Math.max(0, flashT - dt);
      bumpers.forEach(b => b.l = Math.max(0, b.l - dt)); starL = Math.max(0, starL - dt); starR = Math.max(0, starR - dt); extraFlash = Math.max(0, extraFlash - dt); if (dropReset > 0) { dropReset -= dt; if (dropReset <= 0) drops.forEach(d => d.down = false); } slingL = Math.max(0, slingL - dt); slingR = Math.max(0, slingR - dt);
      if (state !== 'play') return;
      if (!ball.lane) ballSave = Math.max(0, ballSave - dt);
      tiltG = Math.max(0, tiltG - 0.3 * dt); nudgeCool = Math.max(0, nudgeCool - dt); shake.t = Math.max(0, shake.t - dt);
      if (held.up && !prevUp) nudge(0, -1); prevUp = !!held.up;
      if (tilt && tilt.sensor) { const dtx = tilt.x - prevTx; prevTx = tilt.x; if (Math.abs(dtx) > 0.16) nudge(Math.sign(dtx), -0.25); }
      let wantL = held.left || held.b || [...pointers.values()].includes('L'), wantR = held.right || held.a || [...pointers.values()].includes('R');
      if (tilted) { wantL = false; wantR = false; }
      if (ball.lane && ball.y > 590) { if (wantR || charging) { charging = true; charge = Math.min(1, charge + dt * 1.1); } }
      for (const k of ['L', 'R']) {
        const f = flip[k], on = k === 'L' ? wantL : wantR, was = f.down; f.down = on;
        if (on && !was && !ball.lane) { sfx.flipper(); }
        const target = k === 'L' ? (on ? ACT : REST) : (on ? Math.PI - ACT : Math.PI - REST);
        const diff = target - f.a, mv = Math.sign(diff) * Math.min(Math.abs(diff), FSPEED * dt);
        f.w = dt > 0 ? mv / dt : 0; f.a += mv;
      }
      const n = 8; for (let i = 0; i < n; i++) step(dt / n);
      if (ball.y > 668) {
        if (ballSave > 0 && !tilted) { ballSave = 0; spawn(); flash('PALLINA SALVATA!'); return; }
        const bonus = bonusN * 1000 * MULTS[mult]; score += bonus; const had = bonusN;
        balls--; chain = 0; bonusN = 0; sfx.drain();
        if (balls <= 0) endGame(); else { spawn(); flash(had ? 'BONUS ' + bonus : 'PALLINA ' + (4 - balls)); }
      }
    };
    const launch = () => {
      if (!ball || !ball.lane || ball.y < 590) return;
      if (saveReady) { saveReady = false; ballSave = 6; }
      ball.vy = -(780 + 330 * charge); ball.vx = 0; sfx.launch(); charging = false; charge = 0;
    };
    const act = k => {
      if (k === 'start' || (k === 'a' && state !== 'play')) { if (state === 'title' || state === 'over') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; return; }
      if (k === 'select' && state !== 'title') newGame();
    };
    const onRelease = k => { if (k === 'a' && state === 'play' && charging) launch(); };
    const swipes = new Map();
    const onPointer = e => {
      const vx = (e.x - OX) / S;
      if (e.type === 'down') swipes.set(e.id, { x: e.x, y: e.y, t: e.t });
      else if (e.type === 'move' && swipes.has(e.id)) {
        const s0 = swipes.get(e.id), dx = (e.x - s0.x) / S, dy = (e.y - s0.y) / S, dt = e.t - s0.t;
        if (dt < 260 && (dy < -46 || Math.abs(dx) > 52) && state === 'play') { swipes.delete(e.id); pointers.delete(e.id); nudge(Math.abs(dx) > 52 ? Math.sign(dx) : 0, dy < -46 ? -1 : -0.25); }
        else if (dt >= 260) swipes.set(e.id, { x: e.x, y: e.y, t: e.t });
      } else if (e.type === 'up') swipes.delete(e.id);
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
      g.fillStyle = '#fff4e0'; g.beginPath(); g.arc(0, 0, 2.1, 0, 7); g.fill(); g.strokeStyle = '#8a1a30'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(-1.5, 0.4); g.lineTo(1.5, -0.4); g.stroke();
      g.fillStyle = 'rgba(70,30,0,.35)'; for (let i = 0; i < 3; i++) g.fillRect(FLEN - 13 + i * 3.6, -3.4, 1.4, 6.8); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(6, FR - 3, FLEN - 12, 1.4);
      g.restore();
    };
    const render = () => {
      g.fillStyle = '#12081c'; g.fillRect(0, 0, CW, CH);
      const shk = shake.t > 0 ? (shake.t / 0.22) : 0;
      g.save(); g.translate(OX + shake.x * shk * S * Math.sin(shake.t * 90), OY + shake.y * shk * S * Math.sin(shake.t * 90)); g.scale(S, S);
      // tavolo
      const bg = g.createLinearGradient(0, 0, 0, VHd); bg.addColorStop(0, '#3b1a5c'); bg.addColorStop(0.55, '#26104a'); bg.addColorStop(1, '#1a0b36'); g.fillStyle = bg; g.fillRect(0, 0, VWd, VHd);
      g.save(); g.beginPath(); g.moveTo(WALL_L, VHd); g.lineTo(WALL_L, CY); g.arc(CX, CY, AR, Math.PI, 0); g.lineTo(WALL_R, VHd); g.closePath(); g.clip();
      const bl = g.createRadialGradient(CX, 300, 20, CX, 300, 300); bl.addColorStop(0, 'rgba(255,120,200,.22)'); bl.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bl; g.fillRect(0, 0, VWd, VHd);
      // raggiera dipinta e coppa neon
      for (let i = 0; i < 20; i++) { const a0 = i / 20 * Math.PI, a1 = (i + 0.5) / 20 * Math.PI; g.fillStyle = i % 2 ? 'rgba(255,120,160,.07)' : 'rgba(255,200,90,.06)'; g.beginPath(); g.moveTo(CX, 640); g.arc(CX, 640, 520, Math.PI + a0, Math.PI + a1); g.closePath(); g.fill(); }
      // intarsi dipinti: rosone con tacche attorno ai paraurti, fili d'oro, rombi lungo le fiancate
      g.save(); g.translate(CX, 292);
      for (let r = 52; r <= 142; r += 30) { g.strokeStyle = 'rgba(255,230,120,' + (r === 112 ? 0.2 : 0.09) + ')'; g.lineWidth = r === 112 ? 1.6 : 1; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
      g.strokeStyle = 'rgba(255,230,120,.16)'; g.lineWidth = 1;
      for (let i = 0; i < 36; i++) { const a = i / 36 * 6.2832; g.beginPath(); g.moveTo(Math.cos(a) * 106, Math.sin(a) * 106); g.lineTo(Math.cos(a) * (i % 3 ? 112 : 118), Math.sin(a) * (i % 3 ? 112 : 118)); g.stroke(); }
      g.restore();
      for (let y = 300; y < 426; y += 18) [[30, 1], [330, -1]].forEach(([x]) => { g.fillStyle = 'rgba(255,200,120,.1)'; g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 5, y); g.lineTo(x, y + 6); g.lineTo(x - 5, y); g.closePath(); g.fill(); });
      g.strokeStyle = 'rgba(255,230,120,.2)'; g.lineWidth = 1; [[96, 30], [264, 30]].forEach(([x]) => { for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - 7, 132 + k * 7); g.lineTo(x, 139 + k * 7); g.lineTo(x + 7, 132 + k * 7); g.stroke(); } });
      g.strokeStyle = 'rgba(255,230,120,.55)'; g.lineWidth = 2.4; g.lineJoin = 'round'; g.beginPath(); g.moveTo(150, 378); g.lineTo(210, 378); g.lineTo(180, 412); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(180, 412); g.lineTo(180, 430); g.moveTo(166, 430); g.lineTo(194, 430); g.stroke(); g.beginPath(); g.arc(196, 386, 3, 0, 7); g.stroke(); g.beginPath(); g.moveTo(196, 384); g.lineTo(206, 366); g.stroke();
      // insegna BAR
      g.fillStyle = 'rgba(255,230,120,' + (0.55 + 0.25 * Math.sin(time * 3)) + ')'; g.font = 'bold 34px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAR', CX, 470);
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; for (let y = 0; y < VHd; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(VWd, y); g.stroke(); }
      g.restore();
      // bordi
      g.strokeStyle = '#e9d9ff'; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); g.moveTo(WALL_L - 2, VHd); g.lineTo(WALL_L - 2, CY); g.arc(CX, CY, AR + 2, Math.PI, 0); g.lineTo(WALL_R + 2, VHd); g.stroke();
      g.strokeStyle = 'rgba(160,110,230,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(LANE_X, 250); g.lineTo(LANE_X, VHd - 20); g.stroke();
      lights.forEach((l, i) => { const on = ((time * 6 + i) | 0) % 3 === 0; const lx = CX + Math.cos(l.a) * (AR - 12), ly = CY + Math.sin(l.a) * (AR - 12); glowDot(lx, ly, 3, on ? '#ffe66a' : '#6b4fa0', on ? 0.7 : 0.25); g.fillStyle = on ? '#fff3b0' : '#8a6cc8'; g.beginPath(); g.arc(lx, ly, 2.4, 0, 7); g.fill(); });
      for (const [ax, ay, bx, by] of guides) { g.strokeStyle = '#e9d9ff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.strokeStyle = '#8a6cc8'; g.lineWidth = 2; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); }
      // viti sulle guide e lucine che scorrono verso le palette
      for (const [ax, ay, bx, by] of guides) {
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy); let nx = dy / L, ny = -dx / L; if (ny > 0) { nx = -nx; ny = -ny; }
        for (let i = 0; i < 5; i++) { const t = 0.18 + i * 0.16, on = ((time * 7) | 0) % 5 === i, x = ax + dx * t + nx * 14, y = ay + dy * t + ny * 14; glowDot(x, y, 3, on ? '#ffe66a' : '#6b4fa0', on ? 0.8 : 0.15); g.fillStyle = on ? '#fff3b0' : '#5a4a8a'; g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
        [[ax, ay], [bx, by]].forEach(([x, y]) => { g.fillStyle = '#c9c0d8'; g.beginPath(); g.arc(x, y, 3.4, 0, 7); g.fill(); g.strokeStyle = '#5a4a8a'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 2, y - 1); g.lineTo(x + 2, y + 1); g.stroke(); });
      }
      // paraurti
      for (const b of bumpers) {
        const k = b.l > 0 ? 1 : 0; glowDot(b.x, b.y, b.r, k ? '#fff3b0' : '#ff5a8a', k ? 0.9 : 0.45);
        const bgr = g.createRadialGradient(b.x - 5, b.y - 6, 2, b.x, b.y, b.r); bgr.addColorStop(0, k ? '#ffffff' : '#ff9ab8'); bgr.addColorStop(1, k ? '#ffd54a' : '#c8185a');
        g.fillStyle = bgr; g.beginPath(); g.arc(b.x, b.y, b.r - 2 + k * 2, 0, 7); g.fill(); g.strokeStyle = '#fff4e0'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(b.x - 5, b.y - 7, 5, 2.4, -0.6, 0, 7); g.fill();
        const ro = b.r + 5; g.strokeStyle = k ? 'rgba(255,243,176,.9)' : 'rgba(255,140,190,.3)'; g.lineWidth = 1.3; g.beginPath(); g.arc(b.x, b.y, ro, 0, 7); g.stroke();
        for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832 + time * (k ? 4 : 0.35), lit = k || (i + ((time * 3) | 0)) % 5 === 0; g.fillStyle = lit ? '#fff3b0' : '#7a3a7a'; g.beginPath(); g.arc(b.x + Math.cos(a) * ro, b.y + Math.sin(a) * ro, 1.6, 0, 7); g.fill(); }
        g.fillStyle = k ? '#fff3b0' : '#7a0f38'; g.beginPath(); g.arc(b.x, b.y, 5.5, 0, 7); g.fill(); g.strokeStyle = '#fff4e0'; g.lineWidth = 1.2; g.stroke();
        g.strokeStyle = k ? '#c8185a' : '#ffb0c8'; g.lineWidth = 1; g.beginPath(); g.moveTo(b.x - 3, b.y); g.lineTo(b.x + 3, b.y); g.moveTo(b.x, b.y - 3); g.lineTo(b.x, b.y + 3); g.stroke();
      }
      for (const t of targets) { glowDot(t.x, t.y, 8, t.lit ? '#6fffa0' : '#5a4a8a', t.lit ? 0.8 : 0.3); g.fillStyle = t.lit ? '#6fffa0' : '#6a5aa0'; g.beginPath(); g.arc(t.x, t.y, 8, 0, 7); g.fill(); g.strokeStyle = '#fff4e0'; g.lineWidth = 2; g.stroke();
        g.fillStyle = t.lit ? '#06301a' : '#3a2a62'; g.beginPath(); g.arc(t.x, t.y, 3, 0, 7); g.fill();
        if (t.lit) { g.strokeStyle = 'rgba(111,255,160,.7)'; g.lineWidth = 1.2; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + time * 2; g.beginPath(); g.moveTo(t.x + Math.cos(a) * 11, t.y + Math.sin(a) * 11); g.lineTo(t.x + Math.cos(a) * 15, t.y + Math.sin(a) * 15); g.stroke(); } } }
      // corsie in alto con lucine A B C
      laneX.forEach((lx, i) => {
        g.strokeStyle = '#e9d9ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(lx - 15, 86); g.lineTo(lx - 15, 118); g.stroke(); g.beginPath(); g.moveTo(lx + 15, 86); g.lineTo(lx + 15, 118); g.stroke();
        const on = laneLit[i]; glowDot(lx, 104, 6, on ? '#ffe66a' : '#5a4a8a', on ? 0.9 : 0.25); g.fillStyle = on ? '#fff3b0' : '#4a3a7a'; g.beginPath(); g.arc(lx, 104, 6, 0, 7); g.fill();
        text('ABC'[i], lx, 98, 9, 'center', on ? '#3a1a00' : '#a894d6');
        [[lx - 15, 86], [lx + 15, 86], [lx - 15, 118], [lx + 15, 118]].forEach(([x, y]) => { g.fillStyle = '#c9c0d8'; g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); g.fillStyle = '#5a4a8a'; g.fillRect(x - 1.2, y - 0.4, 2.4, 0.8); });
      });
      // piattello
      glowDot(saucer.x, saucer.y, 9, saucer.ball ? '#ffe66a' : '#ff9a3a', saucer.ball ? 0.9 : 0.35);
      const sgd = g.createRadialGradient(saucer.x, saucer.y, 2, saucer.x, saucer.y, 12); sgd.addColorStop(0, '#05020c'); sgd.addColorStop(0.7, '#1a0b30'); sgd.addColorStop(1, '#8a6cc8'); g.fillStyle = sgd; g.beginPath(); g.arc(saucer.x, saucer.y, 12, 0, 7); g.fill(); g.strokeStyle = '#e9d9ff'; g.lineWidth = 2; g.stroke();
      text('500', saucer.x, saucer.y + 15, 8, 'center', '#c9b6e8');
      for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + time * (saucer.ball ? 6 : 1.2), lit = saucer.ball || (i + ((time * 4) | 0)) % 4 === 0; g.fillStyle = lit ? '#ffe66a' : '#6b4fa0'; g.beginPath(); g.arc(saucer.x + Math.cos(a) * 16, saucer.y + Math.sin(a) * 16, 1.7, 0, 7); g.fill(); }
      // scala del bonus (10 lucine) e moltiplicatori
      for (let i = 0; i < 10; i++) { const on = i < bonusN, ly = 392 - i * 13; glowDot(40, ly, 4, on ? '#ffb03a' : '#4a3a7a', on ? 0.8 : 0.15); g.fillStyle = on ? '#ffd27a' : '#3a2a62'; g.beginPath(); g.arc(40, ly, 4.2, 0, 7); g.fill(); if (i % 3 === 2) text(String(i + 1), 52, ly - 4, 8, 'left', '#8a76b8'); }
      text('BONUS', 40, 408, 8, 'center', '#c9b6e8');
      ['2X', '3X', '5X', '10X'].forEach((t, i) => { const on = mult > i, lx = 143 + i * 25; glowDot(lx, 528, 8, on ? '#6fffa0' : '#5a4a8a', on ? 0.85 : 0.18); g.fillStyle = on ? '#6fffa0' : '#33265a'; g.beginPath(); g.arc(lx, 528, 8.5, 0, 7); g.fill(); g.strokeStyle = '#e9d9ff'; g.lineWidth = 1.4; g.stroke(); text(t, lx, 524, 8, 'center', on ? '#06301a' : '#8a76b8'); });
      // frecce sulle corsie laterali
      [[34, 470, 1], [326, 470, -1]].forEach(([ax, ay, d], i) => { const on = ((time * 3 + i) | 0) % 2; g.fillStyle = on ? '#ffe66a' : '#6b4fa0'; g.beginPath(); g.moveTo(ax, ay + 12); g.lineTo(ax + d * 7, ay); g.lineTo(ax + d * 14, ay + 12); g.closePath(); g.fill(); });
      // rimbalzatori a molla
      [[46, 432, 96, 500, slingL], [298, 500, 248, 432, slingR]].forEach(([ax, ay, bx, by, l], i) => {
        const side = i ? 1 : -1; const tip = i ? [314, 432, 264, 500] : null;
        g.fillStyle = l > 0 ? '#ffe66a' : '#c8185a'; g.beginPath(); if (!i) { g.moveTo(40, 428); g.lineTo(96, 500); g.lineTo(40, 500); } else { g.moveTo(320, 428); g.lineTo(264, 500); g.lineTo(320, 500); } g.closePath(); g.fill();
        g.strokeStyle = '#fff4e0'; g.lineWidth = 3; g.beginPath(); if (!i) { g.moveTo(40, 428); g.lineTo(96, 500); } else { g.moveTo(320, 428); g.lineTo(264, 500); } g.stroke();
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); if (!i) { g.moveTo(44, 440); g.lineTo(44, 488); g.lineTo(74, 488); } else { g.moveTo(316, 440); g.lineTo(316, 488); g.lineTo(286, 488); } g.closePath(); g.fill();
      });
      // perni di gomma e stelle dipinte sulle fionde
      [[40, 428], [96, 500], [320, 428], [264, 500]].forEach(([x, y]) => { g.fillStyle = '#fff4e0'; g.beginPath(); g.arc(x, y, 3.6, 0, 7); g.fill(); g.fillStyle = '#7a0f38'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); });
      [[58, 482, slingL], [302, 482, slingR]].forEach(([x, y, l]) => { g.strokeStyle = l > 0 ? '#7a4a00' : 'rgba(255,244,224,.6)'; g.lineWidth = 1.2; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.6 : 6, a = k / 10 * 6.2832 - 1.5708; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.stroke(); });
      // bersagli a cadere
      drops.forEach(d => { if (d.down) { g.fillStyle = '#2a1a4a'; g.fillRect(d.x - 7, d.y + 3, 14, 3); } else { const dg = g.createLinearGradient(d.x - 7, 0, d.x + 7, 0); dg.addColorStop(0, '#ffd27a'); dg.addColorStop(1, '#e8801c'); g.fillStyle = dg; g.beginPath(); g.roundRect(d.x - 7, d.y - 7, 14, 14, 3); g.fill(); g.strokeStyle = '#fff4e0'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = 'rgba(120,40,0,.45)'; g.fillRect(d.x - 5, d.y - 1, 10, 2); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(d.x - 5, d.y - 5.5, 10, 1.6); } });
      // stelle sulle corsie laterali
      [[58, 484, starL], [302, 484, starR]].forEach(([x, y, l]) => { const on = l > 0; glowDot(x, y, 6, on ? '#ffe66a' : '#6b4fa0', on ? 0.9 : 0.2); g.fillStyle = on ? '#fff3b0' : '#5a4a8a'; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 3 : 7, a = k / 10 * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); });
      // luci SPECIAL e PALLINA EXTRA
      [['SPECIAL', 90, 316, mult >= 2], ['EXTRA', 270, 316, extraFlash > 0 && ((time * 6) | 0) % 2 === 0]].forEach(([t, x, y, on]) => { g.fillStyle = on ? '#ffe66a' : '#33265a'; g.beginPath(); g.roundRect(x - 24, y - 7, 48, 14, 7); g.fill(); g.strokeStyle = '#e9d9ff'; g.lineWidth = 1.4; g.stroke(); text(t, x, y - 4, 8, 'center', on ? '#3a1a00' : '#8a76b8'); });
      // paletti di gomma
      posts.forEach(([x, y]) => { g.fillStyle = '#e8455f'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.strokeStyle = '#fff4e0'; g.lineWidth = 1.6; g.stroke(); g.fillStyle = '#c8e0ff'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x - 1.8, y - 2, 1, 0, 7); g.fill(); });
      // molla
      const py = ball && ball.lane ? ball.y + R + charge * 14 : 614;
      g.strokeStyle = '#c9c0d8'; g.lineWidth = 2.2; g.beginPath(); for (let i = 0; i < 8; i++) { const y = py + i * (VHd - 12 - py) / 8; g.lineTo(332 + (i % 2 ? 5 : -5), y); } g.stroke();
      g.fillStyle = '#e8455f'; g.fillRect(324, py - 2, 16, 4); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(324, py - 2, 16, 1); g.fillStyle = 'rgba(80,0,20,.5)'; for (let i = 0; i < 4; i++) g.fillRect(326 + i * 4, py - 1, 1, 3); g.fillStyle = '#b8123a'; g.beginPath(); g.arc(332, VHd - 4, 6, 0, 7); g.fill();
      drawFlipper('L'); drawFlipper('R');
      // grembiule con le istruzioni (la pallina scompare qui sotto)
      const ag = g.createLinearGradient(0, 604, 0, VHd); ag.addColorStop(0, '#5a1a3a'); ag.addColorStop(1, '#2a0a24'); g.fillStyle = ag; g.fillRect(12, 606, 306, VHd - 606); g.fillStyle = '#e9d9ff'; g.fillRect(12, 606, 306, 2);
      g.fillStyle = '#fff4e0'; g.fillRect(24, 614, 100, 20); g.fillRect(206, 614, 100, 20); text('PALETTE: TOCCA', 74, 619, 8, 'center', '#3a1a30'); text('SINISTRA / DESTRA', 74, 627, 7, 'center', '#6a3a50'); text('COLPO ANCA: SWIPE', 256, 619, 8, 'center', '#3a1a30'); text('ATTENTO AL TILT', 256, 627, 7, 'center', '#6a3a50');
      g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(165, 624, 7, 0, 7); g.fill(); g.strokeStyle = '#fff4e0'; g.lineWidth = 1.5; g.stroke(); text('€', 165, 619, 9, 'center', '#6a3a00');
      g.fillStyle = '#12040f'; g.beginPath(); g.roundRect(153, 634, 24, 3, 1.5); g.fill();
      [[19, 612], [311, 612], [19, 633], [311, 633]].forEach(([x, y]) => { g.fillStyle = '#c9c0d8'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); g.strokeStyle = '#5a4a8a'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(x - 1.8, y - 0.6); g.lineTo(x + 1.8, y + 0.6); g.stroke(); });
      // pallina
      if (ball) {
        const lt = trail[trail.length - 1];
        if (lt && Math.hypot(ball.x - lt.x, ball.y - lt.y) > 50) trail.length = 0;
        trail.push({ x: ball.x, y: ball.y }); if (trail.length > 8) trail.shift();
        const spd = Math.hypot(ball.vx, ball.vy);
        if (spd > 300) trail.forEach((q, i) => { g.globalAlpha = Math.min(0.28, (spd - 300) / 1500) * (i / trail.length); g.fillStyle = '#cfe0ff'; g.beginPath(); g.arc(q.x, q.y, R * (0.5 + 0.5 * i / trail.length), 0, 7); g.fill(); }); g.globalAlpha = 1;
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(ball.x + 3, ball.y + 5, R, R * 0.7, 0, 0, 7); g.fill();
        const gb = g.createRadialGradient(ball.x - 2.5, ball.y - 3, 0.5, ball.x, ball.y, R + 1); gb.addColorStop(0, '#ffffff'); gb.addColorStop(0.5, '#c9d2e8'); gb.addColorStop(1, '#5b6580');
        g.fillStyle = gb; g.beginPath(); g.arc(ball.x, ball.y, R, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(ball.x - 2.2, ball.y - 2.6, 1.6, 0, 7); g.fill(); g.fillStyle = 'rgba(255,150,200,.35)'; g.beginPath(); g.arc(ball.x + 2.4, ball.y + 3, 1.8, 0, 7); g.fill();
      }
      // vetro del tavolo: display ambra e insegna
      const bgl = g.createLinearGradient(0, 0, 0, 56); bgl.addColorStop(0, '#1a0a2e'); bgl.addColorStop(1, '#2d1250'); g.fillStyle = bgl; g.fillRect(0, 0, VWd, 56);
      for (let x = 6; x < VWd; x += 12) { const on = (((x / 12) | 0) + ((time * 5) | 0)) % 4 === 0; g.fillStyle = on ? '#ffe66a' : '#5a3a8a'; g.beginPath(); g.arc(x, 53, 1.7, 0, 7); g.fill(); }
      g.fillStyle = '#c8a050'; g.fillRect(0, 55, VWd, 1);
      for (let i = 0; i < 9; i++) { const sx = 130 + (i * 37) % 100, sy = 12 + (i * 53) % 18; g.globalAlpha = 0.25 + 0.25 * Math.sin(time * 2 + i * 1.7); g.fillStyle = '#ffe9a0'; g.fillRect(sx, sy, 1.5, 1.5); } g.globalAlpha = 1;
      g.fillStyle = '#0b0414'; g.fillRect(6, 6, 118, 22); g.fillRect(236, 6, 118, 22);
      g.strokeStyle = '#6b4fa0'; g.lineWidth = 1; g.strokeRect(6, 6, 118, 22); g.strokeRect(236, 6, 118, 22);
      g.save(); g.shadowColor = '#ffb03a'; g.shadowBlur = 8; text(String(score).padStart(7, '0'), 14, 9, 17, 'left', '#ffb03a'); text(String(bonusN * 1000 * MULTS[mult]).padStart(7, '0'), 244, 9, 17, 'left', '#ff7a3a'); g.restore();
      text('PUNTI', 8, 30, 8, 'left', '#a894d6'); text('BONUS', 238, 30, 8, 'left', '#a894d6');
      text('FLIPPER DEL BAR', VWd / 2, 8, 9, 'center', '#ffe66a'); text('PALLINE', VWd / 2, 36, 8, 'center', '#a894d6'); for (let i = 0; i < balls; i++) { g.fillStyle = '#dfe6ff'; g.beginPath(); g.arc(VWd / 2 - (balls - 1) * 7 + i * 14, 26, 4, 0, 7); g.fill(); }
      text('x' + MULTS[mult], 336, 38, 12, 'center', '#6fffa0');
      text('TILT', 238, 38, 8, 'left', tilted ? '#ff4a4a' : '#a894d6');
      for (let i = 0; i < 5; i++) { const on = tilted || tiltG > (i + 0.5) / 5 * 1.0 - 0.1; g.fillStyle = on ? (i > 2 || tilted ? '#ff4a4a' : '#ffb03a') : '#3a2a62'; g.fillRect(262 + i * 12, 38, 9, 6); }
      // fiancate di legno e metallo
      const rail = (x, w) => { const rg = g.createLinearGradient(x, 0, x + w, 0); rg.addColorStop(0, '#6b4a2a'); rg.addColorStop(0.5, '#a8774a'); rg.addColorStop(1, '#5a3a1e'); g.fillStyle = rg; g.fillRect(x, 56, w, VHd - 56); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + 1, 56, 1.5, VHd - 56); g.strokeStyle = 'rgba(40,20,5,.35)'; g.lineWidth = 0.8; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(x + i * w / 4, 56); g.lineTo(x + i * w / 4 + (i % 2 ? 1.5 : -1.5), VHd); g.stroke(); } g.fillStyle = '#c8a050'; g.fillRect(x + (x ? 0 : w - 1.5), 56, 1.5, VHd - 56); };
      rail(0, 12); rail(VWd - 12, 12);
      for (let y = 90; y < VHd; y += 120) { g.fillStyle = '#c9c0d8'; g.beginPath(); g.arc(6, y, 2.2, 0, 7); g.arc(VWd - 6, y, 2.2, 0, 7); g.fill(); g.strokeStyle = '#5a4a8a'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(4.6, y - 0.8); g.lineTo(7.4, y + 0.8); g.moveTo(VWd - 7.4, y - 0.8); g.lineTo(VWd - 4.6, y + 0.8); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.035)'; g.beginPath(); g.moveTo(70, 56); g.lineTo(150, 56); g.lineTo(40, 420); g.lineTo(-10, 420); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.025)'; g.beginPath(); g.moveTo(170, 56); g.lineTo(200, 56); g.lineTo(90, 420); g.lineTo(60, 420); g.closePath(); g.fill();
      if (msgT > 0) text(msg, VWd / 2, 60, 18, 'center', '#ffe66a');
      if (state === 'play' && ball && ball.lane && ball.y > 590) text(charging ? 'LASCIA PER LANCIARE' : 'TIENI PREMUTO LA MOLLA (A)', VWd / 2, 596, 10, 'center', '#ffe66a');
      if (tilted && state === 'play') text('TILT!', VWd / 2, 300, 40, 'center', '#ff4a4a');
      if (state === 'title') {
        g.fillStyle = 'rgba(12,4,26,.78)'; g.fillRect(0, 0, VWd, VHd);
        text('FLIPPER', VWd / 2, 150, 50, 'center', '#ff5a8a'); text('DEL BAR', VWd / 2, 206, 44, 'center', '#ffe66a');
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', VWd / 2, 330, 16, 'center', '#fff4e0');
        text('SINISTRA / DESTRA = LE PALETTE', VWd / 2, 380, 11, 'center', '#c9b6e8'); text('TIENI PREMUTA LA MOLLA A DESTRA PER LANCIARE', VWd / 2, 402, 10, 'center', '#c9b6e8');
        text('ANCA E BACINO: SWIPE VELOCE, SU, O SCUOTI IL TELEFONO', VWd / 2, 424, 9, 'center', '#c9b6e8');
        text('ATTENTO: TROPPE SPINTE FANNO SCATTARE IL TILT', VWd / 2, 440, 9, 'center', '#ffb03a');
        text('RECORD ' + hi, VWd / 2, 470, 14, 'center');
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
      debug: { newGame, get state() { return state; }, get ball() { return ball; }, get score() { return score; }, get balls() { return balls; }, nudge, get tiltG() { return tiltG; }, get tilted() { return tilted; }, launch, flip, step, set charge(v) { charge = v; } },
    };
  },
});

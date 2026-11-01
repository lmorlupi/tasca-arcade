// LABIRINTO DI MARGOT: gioco originale. Margot raccoglie i bocconcini in un labirinto di casa (diverso a ogni quadro),
// inseguita da quattro robot pulisci casa. Con la scatoletta di tonno i robot vanno in tilt e puoi mandarli a ricaricarsi.
registerGame({
  id: 'labirinto-di-margot',
  title: 'LABIRINTO DI MARGOT',
  author: 'Tasca Arcade',
  license: 'MIT',
  color: '#f2c94c',
  blurb: 'Raccogli tutti i bocconcini nel labirinto di casa, senza farti prendere dai quattro robot pulisci casa. Il tonno li manda in tilt: corri a mandarli a ricaricarsi! Il labirinto cambia a ogni quadro. Croce o swipe per girare.',
  inputs: ['D-PAD', 'SWIPE'],
  size: [360, 600],
  bg: '#1a1228',
  flexH: true,
  flexMin: 1.1,
  create(api) {
    const { cv, g, held } = api;
    const CW = cv.width, CH = cv.height, VWd = CW, VHd = CH;
    const S = 1, OX = 0, OY = 0;
    // Il labirinto riempie tutta l'area: sceglie quante righe usare (15, 19, 23 o 27) in base alla forma dello schermo.
    const COLS = 15, HUD = 58, FOOT = 34;
    let ROWS = 19, T = 23, MX = 0, MY = HUD, MID = 9, KT = 1;
    (() => { const availH = CH - HUD - FOOT; let best = null; for (const r of [15, 19, 23, 27]) { const t = Math.min(CW / COLS, availH / r), cover = t * r / availH; if (!best || (cover >= 0.82 && t > best.t) || (best.cover < 0.82 && cover > best.cover)) best = { r, t, cover }; } ROWS = best.r; T = Math.floor(best.t * 10) / 10; MID = (ROWS - 1) / 2; MX = (CW - COLS * T) / 2; MY = HUD + Math.max(0, (availH - ROWS * T) / 2); KT = T / 23; })();
    const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
    const COLORS = ['#e5413b', '#25c4f0', '#f58a25', '#a66bff'];
    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, time = 0, stateT = 0, msg = '', msgT = 0;
    let maze, dots, dotsLeft, eaten, power = 0, combo = 0, margot, robots, bonus = null, bonusN = 0, desired = [0, 0], munch = 0, rngS = 1;
    const fieldCache = new Map();

    // ---- labirinto: generato a metà e specchiato, con qualche anello per non avere vicoli ciechi
    const rnd = () => { rngS = (rngS * 1664525 + 1013904223) >>> 0; return rngS / 4294967296; };
    const open = (x, y) => { if (x < 0 || x >= COLS) return y === MID; return y >= 0 && y < ROWS && maze[y][x] !== 1; };
    const build = () => {
      rngS = (level * 7919 + 13) >>> 0;
      maze = Array.from({ length: ROWS }, () => new Array(COLS).fill(1));
      const cw = 7, ch = (ROWS - 1) / 2, seen = Array.from({ length: ch }, () => new Array(cw).fill(false));
      seen[(ch - 1) / 2][3] = true;                                           // la cella centrale e' la "tana" dei robot
      const stack = [[0, 0]]; seen[0][0] = true; maze[1][1] = 0;
      while (stack.length) {
        const [cx, cy] = stack[stack.length - 1];
        const nb = DIRS.map(([dx, dy]) => [cx + dx, cy + dy, dx, dy]).filter(([nx, ny]) => nx >= 0 && nx <= 3 && ny >= 0 && ny < ch && !seen[ny][nx]);
        if (!nb.length) { stack.pop(); continue; }
        const [nx, ny, dx, dy] = nb[(rnd() * nb.length) | 0];
        seen[ny][nx] = true; maze[ny * 2 + 1][nx * 2 + 1] = 0; maze[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0; stack.push([nx, ny]);
      }
      for (let k = 0; k < 26; k++) {                                // anelli: apre pareti tra due corridoi
        const x = 1 + ((rnd() * 7) | 0), y = 1 + ((rnd() * (ROWS - 2)) | 0);
        if (maze[y][x] === 1 && ((x % 2 === 0 && y % 2 === 1 && maze[y][x - 1] === 0 && maze[y][x + 1] === 0) || (x % 2 === 1 && y % 2 === 0 && maze[y - 1][x] === 0 && maze[y + 1][x] === 0))) maze[y][x] = 0;
      }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x <= 7; x++) maze[y][14 - x] = maze[y][x];
      // tana centrale con un'uscita in alto
      for (let y = MID - 1; y <= MID + 1; y++) for (let x = 5; x <= 9; x++) maze[y][x] = 1;
      for (let x = 6; x <= 8; x++) maze[MID][x] = 0;
      maze[MID - 1][7] = 0; maze[MID - 2][7] = 0;
      // passaggio laterale
      maze[MID][0] = 0; maze[MID][1] = 0; maze[MID][13] = 0; maze[MID][14] = 0;
      maze[MID][2] = maze[MID][2] === 1 && maze[MID][3] === 1 ? 0 : maze[MID][2];
      maze[MID][12] = maze[MID][2];
      // tutto deve restare collegato: dove la tana ha spezzato il labirinto, si apre un varco tra le due parti
      const flood = () => { const reach = Array.from({ length: ROWS }, () => new Array(COLS).fill(false)); const q = [[7, ROWS - 6]]; maze[ROWS - 6][7] = 0; reach[ROWS - 6][7] = true;
        while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { let nx = x + dx, ny = y + dy; if (nx < 0) nx = COLS - 1; if (nx >= COLS) nx = 0; if (ny < 0 || ny >= ROWS || maze[ny][nx] === 1 || reach[ny][nx]) continue; reach[ny][nx] = true; q.push([nx, ny]); } }
        return reach; };
      for (let guard = 0; guard < 40; guard++) {
        const reach = flood(); let fixed = false;
        for (let y = 1; y < ROWS - 1 && !fixed; y++) for (let x = 1; x < COLS - 1 && !fixed; x++) {
          if (maze[y][x] !== 1 || (y >= MID - 1 && y <= MID + 1 && x >= 5 && x <= 9)) continue;
          for (const [dx, dy] of [[1, 0], [0, 1]]) { const ax = x - dx, ay = y - dy, bx = x + dx, by = y + dy; if (maze[ay][ax] === 1 || maze[by][bx] === 1) continue; if (reach[ay][ax] !== reach[by][bx]) { maze[y][x] = 0; maze[y][14 - x] = 0; fixed = true; break; } }
        }
        if (!fixed) break;
      }
      const reach = flood();
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (!reach[y][x]) maze[y][x] = 1;
      dots = Array.from({ length: ROWS }, (_, y) => Array.from({ length: COLS }, (_, x) => (maze[y][x] === 0 && !(y >= MID - 1 && y <= MID + 1 && x >= 6 && x <= 8) && !(x === 7 && y === ROWS - 6) ? 1 : 0)));
      for (const [x, y] of [[1, 1], [13, 1], [1, ROWS - 2], [13, ROWS - 2]]) if (maze[y][x] === 0) dots[y][x] = 2;
      dotsLeft = 0; for (const r of dots) for (const v of r) if (v) dotsLeft++;
      eaten = 0; bonus = null; bonusN = 0; fieldCache.clear();
    };

    // ---- distanze (per far inseguire bene i robot)
    const field = (tx, ty) => {
      const key = tx + ',' + ty; if (fieldCache.has(key)) return fieldCache.get(key);
      const d = Array.from({ length: ROWS }, () => new Array(COLS).fill(999)); const q = [[tx, ty]]; d[ty][tx] = 0;
      while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of DIRS) { let nx = x + dx, ny = y + dy; if (nx < 0) nx = COLS - 1; if (nx >= COLS) nx = 0; if (ny < 0 || ny >= ROWS || maze[ny][nx] === 1 || d[ny][nx] !== 999) continue; d[ny][nx] = d[y][x] + 1; q.push([nx, ny]); } }
      if (fieldCache.size > 40) fieldCache.clear(); fieldCache.set(key, d); return d;
    };
    const nearestOpen = (x, y) => { x = Math.max(0, Math.min(COLS - 1, x)); y = Math.max(0, Math.min(ROWS - 1, y)); if (maze[y][x] !== 1) return [x, y]; let best = [7, ROWS - 6], bd = 999; for (let yy = 0; yy < ROWS; yy++) for (let xx = 0; xx < COLS; xx++) if (maze[yy][xx] !== 1) { const dd = Math.abs(xx - x) + Math.abs(yy - y); if (dd < bd) { bd = dd; best = [xx, yy]; } } return best; };

    // ---- stato
    const spawn = () => {
      margot = { x: 7, y: ROWS - 6, dx: 0, dy: 0 }; desired = [0, 0];
      robots = [
        { x: 7, y: MID - 2, dx: 1, dy: 0, k: 0, out: true, mode: 'chase', wait: 0 },
        { x: 6, y: MID, dx: 0, dy: -1, k: 1, out: false, mode: 'chase', wait: 3 },
        { x: 7, y: MID, dx: 0, dy: -1, k: 2, out: false, mode: 'chase', wait: 6 },
        { x: 8, y: MID, dx: 0, dy: -1, k: 3, out: false, mode: 'chase', wait: 9 },
      ];
      power = 0; combo = 0;
    };
    const flash = t => { msg = t; msgT = 1.5; };
    const newGame = () => { score = 0; lives = 3; level = 1; build(); spawn(); state = 'ready'; stateT = 1.8; api.beep(523, 0.1, 'triangle', 0.07); setTimeout(() => api.beep(659, 0.1, 'triangle', 0.07), 120); setTimeout(() => api.beep(784, 0.18, 'triangle', 0.07), 240); };
    const nextLevel = () => { level++; build(); spawn(); state = 'ready'; stateT = 1.8; };
    const endGame = () => { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } };

    // ---- movimento su griglia: x,y sono coordinate di tessera (intero = centro)
    const frac = v => Math.abs(v - Math.round(v)) < 1e-6;
    const step = (e, speed, dt, choose) => {
      let rem = speed * dt, guard = 0;
      while (rem > 1e-6 && guard++ < 6) {
        if (e.dx === 0 && e.dy === 0) { choose(e); if (e.dx === 0 && e.dy === 0) return; }
        const cx = Math.round(e.x), cy = Math.round(e.y);
        const atC = frac(e.x) && frac(e.y);
        if (atC) { choose(e); if (e.dx === 0 && e.dy === 0) return; if (!open(cx + e.dx, cy + e.dy)) { e.dx = 0; e.dy = 0; return; } }
        // distanza al prossimo centro
        let dist = e.dx > 0 ? Math.floor(e.x + 1e-6) + 1 - e.x : e.dx < 0 ? e.x - (Math.ceil(e.x - 1e-6) - 1) : e.dy > 0 ? Math.floor(e.y + 1e-6) + 1 - e.y : e.y - (Math.ceil(e.y - 1e-6) - 1);
        if (dist < 1e-6) dist = 1;
        const m = Math.min(rem, dist); e.x += e.dx * m; e.y += e.dy * m; rem -= m;
        if (m === dist) { e.x = Math.round(e.x); e.y = Math.round(e.y); if (e.x < 0) e.x = COLS - 1; if (e.x > COLS - 1) e.x = 0; }
      }
    };
    const chooseMargot = e => {
      const cx = Math.round(e.x), cy = Math.round(e.y);
      if ((desired[0] || desired[1]) && open(cx + desired[0], cy + desired[1])) { e.dx = desired[0]; e.dy = desired[1]; }
      else if (!open(cx + e.dx, cy + e.dy)) { e.dx = 0; e.dy = 0; }
    };
    const targetFor = r => {
      const mx = Math.round(margot.x), my = Math.round(margot.y);
      if (r.k === 0) return [mx, my];                                              // inseguitore
      if (r.k === 1) return nearestOpen(mx + margot.dx * 4, my + margot.dy * 4);    // tende l'agguato
      if (r.k === 2) { const dd = field(mx, my)[Math.round(r.y)][Math.round(r.x)]; return dd > 7 ? [mx, my] : [1, ROWS - 2]; }   // insegue da lontano, scappa da vicino
      return null;                                                                 // vagabondo
    };
    const chooseRobot = r => {
      const cx = Math.round(r.x), cy = Math.round(r.y);
      const opts = DIRS.filter(([dx, dy]) => open(cx + dx, cy + dy) && !(dx === -r.dx && dy === -r.dy));
      if (!opts.length) { r.dx = -r.dx; r.dy = -r.dy; return; }
      let pick;
      if (r.mode === 'eyes') { const f = field(7, MID); pick = opts.reduce((b, o) => (f[(cy + o[1])][(cx + o[0] + COLS) % COLS] < f[(cy + b[1])][(cx + b[0] + COLS) % COLS] ? o : b)); }
      else if (r.mode === 'scared' || (r.k === 3 && Math.random() < 0.75) || Math.random() < 0.08) pick = opts[(Math.random() * opts.length) | 0];
      else { const t = targetFor(r) || [Math.round(margot.x), Math.round(margot.y)]; const f = field(t[0], t[1]); pick = opts.reduce((b, o) => (f[(cy + o[1])][(cx + o[0] + COLS) % COLS] < f[(cy + b[1])][(cx + b[0] + COLS) % COLS] ? o : b)); }
      r.dx = pick[0]; r.dy = pick[1];
    };

    const die = () => {
      state = 'dead'; stateT = 1.5; lives--; api.haptic(100); setTimeout(() => api.haptic(60), 140);
      for (let k = 0; k < 5; k++) setTimeout(() => api.beep(520 - k * 80, 0.16, 'sawtooth', 0.07), k * 110);
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      if (state === 'ready') { stateT -= dt; if (stateT <= 0) state = 'play'; return; }
      if (state === 'dead') { stateT -= dt; if (stateT <= 0) { if (lives <= 0) endGame(); else { spawn(); state = 'ready'; stateT = 1.4; } } return; }
      if (state === 'clear') { stateT -= dt; if (stateT <= 0) nextLevel(); return; }
      if (state !== 'play') return;
      const dI = held.left ? [-1, 0] : held.right ? [1, 0] : held.up ? [0, -1] : held.down ? [0, 1] : null; if (dI) desired = dI;
      // inversione immediata
      if ((desired[0] && desired[0] === -margot.dx) || (desired[1] && desired[1] === -margot.dy)) { margot.dx = desired[0]; margot.dy = desired[1]; }
      const sp = 5.6 * (1 + 0.02 * Math.min(level, 10));
      step(margot, sp, dt, chooseMargot);
      // bocconcino sotto Margot
      const tx = Math.round(margot.x), ty = Math.round(margot.y);
      if (Math.abs(margot.x - tx) < 0.35 && Math.abs(margot.y - ty) < 0.35 && dots[ty] && dots[ty][tx]) {
        const v = dots[ty][tx]; dots[ty][tx] = 0; dotsLeft--; eaten++;
        if (v === 2) { score += 50; power = Math.max(2.5, 7 - level * 0.45); combo = 0; robots.forEach(r => { if (r.mode === 'chase') { r.mode = 'scared'; r.dx = -r.dx; r.dy = -r.dy; } }); api.haptic(35); api.beep(180, 0.1, 'square', 0.08); setTimeout(() => api.beep(360, 0.14, 'triangle', 0.08), 70); flash('TONNO! ROBOT IN TILT'); }
        else { score += 10; munch ^= 1; api.beep(munch ? 520 : 640, 0.04, 'triangle', 0.06); }
        if ((eaten === 60 || eaten === 130) && !bonus) bonus = { x: 7, y: ROWS - 6, t: 10 };
        if (dotsLeft <= 0) { state = 'clear'; stateT = 1.8; api.haptic(60); [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.14, 'triangle', 0.08), i * 110)); flash('QUADRO PULITO!'); return; }
      }
      if (bonus) { bonus.t -= dt; if (Math.hypot(margot.x - bonus.x, margot.y - bonus.y) < 0.6) { score += 500; flash('GRILLO +500'); api.haptic(25); api.beep(880, 0.1, 'triangle', 0.08); setTimeout(() => api.beep(1175, 0.12, 'triangle', 0.08), 90); bonus = null; } else if (bonus.t <= 0) bonus = null; }
      if (power > 0) { power -= dt; if (power <= 0) { power = 0; robots.forEach(r => { if (r.mode === 'scared') r.mode = 'chase'; }); } }
      // robot
      for (const r of robots) {
        if (!r.out) { r.wait -= dt; if (r.wait <= 0) { r.out = true; r.x = 7; r.y = MID; r.dx = 0; r.dy = -1; } else continue; }
        const base = 4.6 + 0.12 * Math.min(level, 12);
        const spd = r.mode === 'scared' ? base * 0.55 : r.mode === 'eyes' ? 9 : base * (r.k === 0 ? 1.04 : 1);
        step(r, spd, dt, chooseRobot);
        if (r.mode === 'eyes' && Math.abs(r.x - 7) < 0.2 && Math.abs(r.y - MID) < 0.2) { r.mode = power > 0 ? 'scared' : 'chase'; r.out = false; r.wait = 1.2; r.x = 7; r.y = MID; }
        if (r.out && r.mode !== 'eyes' && Math.hypot(r.x - margot.x, r.y - margot.y) < 0.62) {
          if (r.mode === 'scared') { r.mode = 'eyes'; combo++; const pts = 200 * Math.pow(2, Math.min(combo - 1, 3)); score += pts; flash('ROBOT RICARICA! +' + pts); api.haptic(40); api.beep(300, 0.08, 'square', 0.08); setTimeout(() => api.beep(900, 0.14, 'triangle', 0.08), 70); setTimeout(() => api.beep(1300, 0.14, 'triangle', 0.08), 150); }
          else { die(); return; }
        }
      }
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'over') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'select' && state !== 'title') newGame();
    };
    const sw = new Map();
    const onPointer = e => {
      if (e.type === 'down') { if (state === 'title' || state === 'over') { newGame(); return; } if (state === 'pause') { state = 'play'; return; } sw.set(e.id, { x: e.x, y: e.y }); }
      else if (e.type === 'move' && sw.has(e.id)) {
        const s0 = sw.get(e.id), dx = (e.x - s0.x) / S, dy = (e.y - s0.y) / S;
        if (Math.abs(dx) > 14 || Math.abs(dy) > 14) { desired = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; sw.set(e.id, { x: e.x, y: e.y }); }
      } else if (e.type === 'up') sw.delete(e.id);
    };

    // ---- disegno
    const text = (s, x, y, size, align, c) => { g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#fff4e0'; g.fillText(s, x, y); };
    const banner = rows => { const h = rows.length * 26 + 16, w = 260, x = (VWd - w) / 2, y = MY + ROWS * T / 2 - h / 2; g.fillStyle = '#fff4e0'; g.fillRect(x, y, w, h); g.fillStyle = '#2a1238'; g.fillRect(x + 2, y + 2, w - 4, h - 4); rows.forEach((t, i) => text(t, VWd / 2, y + 12 + i * 26, 18, 'center')); };
    const px = v => MX + v * T + T / 2, py = v => MY + v * T + T / 2;
    const catFace = (x, y, r, dx, dy, ang, sc) => {
      g.save(); g.translate(x, y); g.rotate(ang || 0); g.scale(sc == null ? 1 : sc, sc == null ? 1 : sc);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(0, r * 0.95, r * 0.9, r * 0.28, 0, 0, 7); g.fill();
      g.fillStyle = '#c27a30'; g.beginPath(); g.moveTo(-r * 0.85, -r * 0.2); g.lineTo(-r * 0.7, -r * 1.15); g.lineTo(-r * 0.15, -r * 0.7); g.closePath(); g.moveTo(r * 0.85, -r * 0.2); g.lineTo(r * 0.7, -r * 1.15); g.lineTo(r * 0.15, -r * 0.7); g.closePath(); g.fill();
      g.fillStyle = '#f2a9bd'; g.beginPath(); g.moveTo(-r * 0.7, -r * 0.45); g.lineTo(-r * 0.62, -r * 0.95); g.lineTo(-r * 0.32, -r * 0.65); g.closePath(); g.moveTo(r * 0.7, -r * 0.45); g.lineTo(r * 0.62, -r * 0.95); g.lineTo(r * 0.32, -r * 0.65); g.closePath(); g.fill();
      const hg = g.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r * 1.1); hg.addColorStop(0, '#f6b657'); hg.addColorStop(1, '#b8651c'); g.fillStyle = hg; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(90,40,10,.6)'; g.lineWidth = 1.6; for (const k of [-1, 0, 1]) { g.beginPath(); g.moveTo(k * r * 0.3, -r * 0.95); g.lineTo(k * r * 0.26, -r * 0.5); g.stroke(); }
      g.fillStyle = '#fff4e0'; g.beginPath(); g.ellipse(0, r * 0.35, r * 0.5, r * 0.38, 0, 0, 7); g.fill();
      for (const sx of [-1, 1]) { const ex = sx * r * 0.4 + dx * 1.6, ey = -r * 0.05 + dy * 1.6; g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * r * 0.4, -r * 0.05, r * 0.27, 0, 7); g.fill(); g.fillStyle = '#6aa83a'; g.beginPath(); g.arc(ex, ey, r * 0.17, 0, 7); g.fill(); g.fillStyle = '#10131f'; g.beginPath(); g.ellipse(ex, ey, r * 0.06, r * 0.14, 0, 0, 7); g.fill(); }
      g.fillStyle = '#e07a8a'; g.beginPath(); g.moveTo(-r * 0.1, r * 0.2); g.lineTo(r * 0.1, r * 0.2); g.lineTo(0, r * 0.33); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.9; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * r * 0.3, r * 0.32); g.lineTo(sx * r * 1.1, r * 0.2); g.moveTo(sx * r * 0.3, r * 0.4); g.lineTo(sx * r * 1.1, r * 0.5); g.stroke(); }
      g.restore();
    };
    const drawRobot = r => {
      const x = px(r.x), y = py(r.y), rad = T * 0.42;
      if (r.mode === 'eyes') { for (const sx of [-1, 1]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + sx * 4.5, y, 3.6, 0, 7); g.fill(); g.fillStyle = '#10131f'; g.beginPath(); g.arc(x + sx * 4.5 + r.dx * 1.4, y + r.dy * 1.4, 1.7, 0, 7); g.fill(); } return; }
      const sc = r.mode === 'scared'; const blink = sc && power < 2 && ((time * 8) | 0) % 2;
      const base = sc ? (blink ? '#fff4e0' : '#8fb4ff') : COLORS[r.k];
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(x, y + rad * 0.85, rad * 0.95, rad * 0.3, 0, 0, 7); g.fill();
      const gg = g.createRadialGradient(x - rad * 0.3, y - rad * 0.4, 1, x, y, rad * 1.1); gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.25, base); gg.addColorStop(1, '#222'); gg.addColorStop(0.25, base);
      g.fillStyle = base; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
      const sh = g.createLinearGradient(x, y - rad, x, y + rad); sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = sh; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill();
      g.strokeStyle = 'rgba(20,20,40,.8)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, rad, r.dx || r.dy ? Math.atan2(r.dy, r.dx) - 0.9 : -0.9, (r.dx || r.dy ? Math.atan2(r.dy, r.dx) : 0) + 0.9); g.stroke();   // paraurti
      if (sc) { g.strokeStyle = '#10131f'; g.lineWidth = 1.5; g.beginPath(); for (let a = 0; a < 12; a += 0.4) g.lineTo(x + Math.cos(a + time * 6) * a * 0.55, y + Math.sin(a + time * 6) * a * 0.55); g.stroke(); }
      else { g.fillStyle = '#10131f'; g.fillRect(x - 5 + r.dx * 2, y - 3 + r.dy * 2, 10, 4); g.fillStyle = '#ff5a5a'; g.fillRect(x - 3.5 + r.dx * 2, y - 2 + r.dy * 2, 2, 2); g.fillRect(x + 1.5 + r.dx * 2, y - 2 + r.dy * 2, 2, 2); }
    };
    const render = () => {
      g.fillStyle = '#12091e'; g.fillRect(0, 0, CW, CH);
      g.save(); g.translate(OX, OY); g.scale(S, S);
      g.fillStyle = '#000'; g.fillRect(0, 0, VWd, VHd);
      if (state === 'title') {
        text('LABIRINTO', VWd / 2, 110, 40, 'center', '#f2c94c'); text('DI MARGOT', VWd / 2, 156, 40, 'center', '#ff7a9a');
        catFace(VWd / 2, 270, 38, 1, 0, Math.sin(time * 2) * 0.12);
        for (let k = 0; k < 4; k++) { const rr = { x: 0, y: 0, dx: 0, dy: 0, k, mode: 'chase' }; g.save(); g.translate(VWd / 2 - 90 + k * 60 - MX - 11.5, 330 - MY - 11.5); drawRobot({ ...rr, x: 0, y: 0 }); g.restore(); }
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', VWd / 2, 400, 16, 'center', '#fff4e0');
        text('CROCE O SWIPE PER GIRARE', VWd / 2, 440, 11, 'center', '#c9b6e8'); text('IL TONNO MANDA I ROBOT IN TILT', VWd / 2, 458, 11, 'center', '#c9b6e8');
        text('RECORD ' + hi, VWd / 2, 500, 14, 'center');
        g.restore(); return;
      }
      // pavimento nero e pareti con contorno blu neon (stile sala giochi)
      g.fillStyle = '#000'; g.fillRect(MX - 6, MY - 6, COLS * T + 12, ROWS * T + 12);
      const W1 = (x, y) => (y < 0 || y >= ROWS || x < 0 || x >= COLS ? true : maze[y][x] === 1), LW = 3;
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (maze[y][x] === 1) { g.fillStyle = 'rgba(60,80,255,.16)'; g.fillRect(MX + x * T - 3, MY + y * T - 3, T + 6, T + 6); }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (maze[y][x] === 1) { g.fillStyle = '#2f4cff'; g.fillRect(MX + x * T, MY + y * T, T, T); }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (maze[y][x] === 1) {
        const X = MX + x * T, Y = MY + y * T, l = W1(x - 1, y), r = W1(x + 1, y), u = W1(x, y - 1), d = W1(x, y + 1);
        g.fillStyle = '#000'; g.fillRect(X + (l ? 0 : LW), Y + (u ? 0 : LW), T - (l ? 0 : LW) - (r ? 0 : LW), T - (u ? 0 : LW) - (d ? 0 : LW));
        g.fillStyle = '#2f4cff';
        if (l && u && !W1(x - 1, y - 1)) g.fillRect(X, Y, LW, LW); if (r && u && !W1(x + 1, y - 1)) g.fillRect(X + T - LW, Y, LW, LW);
        if (l && d && !W1(x - 1, y + 1)) g.fillRect(X, Y + T - LW, LW, LW); if (r && d && !W1(x + 1, y + 1)) g.fillRect(X + T - LW, Y + T - LW, LW, LW);
        g.fillStyle = 'rgba(120,150,255,.55)'; if (!u) g.fillRect(X + (l ? 0 : LW), Y + 1, T - (l ? 0 : LW) - (r ? 0 : LW), 1);
      }
      // porta della tana
      g.fillStyle = '#ffb0d0'; g.fillRect(MX + 7 * T + 2, MY + (MID - 1) * T + T / 2 - 1.5, T - 4, 3);
      // bocconcini e tonno
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const v = dots[y][x]; if (!v) continue; const cx = px(x), cy = py(y);
        g.save(); g.translate(cx, cy); g.scale(KT, KT);
        if (v === 1) { g.fillStyle = '#ffd9b0'; g.beginPath(); g.arc(0, 0, 2.6, 0, 7); g.fill(); }
        else if (((time * 5) | 0) % 2 === 0 || true) { const bob = 0; if (((time * 5) | 0) % 2) g.globalAlpha = 0.45; g.fillStyle = 'rgba(120,200,255,.3)'; g.beginPath(); g.arc(0, bob, 9, 0, 7); g.fill(); const cg = g.createLinearGradient(-6, 0, 6, 0); cg.addColorStop(0, '#2f6fb3'); cg.addColorStop(0.5, '#6ab0ee'); cg.addColorStop(1, '#2a5f9c'); g.fillStyle = cg; g.fillRect(-6, -5 + bob, 12, 10); g.fillStyle = '#cfd6e0'; g.fillRect(-6, -6 + bob, 12, 2); g.fillRect(-6, 4 + bob, 12, 2); g.fillStyle = '#fff4e0'; g.beginPath(); g.ellipse(0, bob, 3, 1.8, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
        g.restore();
      }
      if (bonus) { const bx = 0, by = Math.sin(time * 9) * 1.5; g.save(); g.translate(px(bonus.x), py(bonus.y)); g.scale(KT * 1.2, KT * 1.2); g.strokeStyle = '#3f6b2f'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(bx - 3, by); g.lineTo(bx - 8, by - 5); g.lineTo(bx - 9, by + 3); g.moveTo(bx + 1, by); g.lineTo(bx - 3, by - 6); g.lineTo(bx - 4, by + 4); g.stroke(); g.fillStyle = '#5c9a43'; g.beginPath(); g.ellipse(bx, by, 6.5, 3.2, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(bx + 6, by - 1, 2.6, 2.4, 0, 0, 7); g.fill(); g.restore(); }
      // personaggi
      robots.forEach(r => { if (r.out || state === 'ready' || state === 'dead') drawRobot(r); else if (!r.out) { drawRobot({ ...r, x: r.x, y: r.y }); } });
      if (state === 'dead') { const k = 1 - stateT / 1.5; catFace(px(margot.x), py(margot.y), T * 0.42, 0, 0, k * 12, Math.max(0, 1 - k)); }
      else catFace(px(margot.x), py(margot.y), T * 0.42, margot.dx, margot.dy, Math.sin(time * 14) * (margot.dx || margot.dy ? 0.12 : 0));
      // HUD
      g.fillStyle = 'rgba(10,4,24,.7)'; g.fillRect(0, 0, VWd, 52);
      text('PUNTI', 12, 8, 9, 'left', '#a894d6'); text(String(score).padStart(6, '0'), 12, 20, 18, 'left', '#ffb03a');
      text('QUADRO ' + level, VWd / 2, 8, 9, 'center', '#a894d6'); text('RECORD ' + hi, VWd / 2, 22, 10, 'center', '#c9b6e8');
      for (let i = 0; i < lives; i++) { g.save(); g.translate(VWd - 22 - i * 24, 28); g.scale(0.7, 0.7); catFace(0, 0, 11, 0, 0, 0); g.restore(); }
      if (power > 0) { g.fillStyle = 'rgba(120,200,255,.3)'; g.fillRect(MX, MY + ROWS * T + 6, COLS * T, 6); g.fillStyle = '#6ab0ee'; g.fillRect(MX, MY + ROWS * T + 6, COLS * T * Math.min(1, power / 7), 6); }
      if (msgT > 0) text(msg, VWd / 2, MY + ROWS * T + 16, 13, 'center', '#ffe66a');
      if (state === 'ready') banner(['PRONTA?', 'QUADRO ' + level]);
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['FINE PARTITA', 'PUNTI ' + score, 'TOCCA']);
      g.restore();
    };

    build(); spawn();
    return {
      onPress: act, onPointer, onHide() { if (state === 'play') state = 'pause'; sw.clear(); },
      update, render,
      debug: { newGame, get state() { return state; }, get score() { return score; }, get lives() { return lives; }, get margot() { return margot; }, get robots() { return robots; }, get maze() { return maze; }, get dotsLeft() { return dotsLeft; }, get level() { return level; }, nextLevel, set desired(v) { desired = v; } },
    };
  },
});

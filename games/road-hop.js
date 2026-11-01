registerGame({
  id: 'road-hop',
  title: 'ROAD HOP',
  color: '#f5d31c',
  blurb: 'Porta il pulcino dall\'altra parte: schiva le auto, salta sui tronchi e raggiungi le quattro tane. Striscia il dito per saltare, o tocca per andare avanti.',
  inputs: ['SWIPE', 'TOCCO', 'D-PAD'],
  size: [360, 640],
  bg: '#0b1020',
  flexH: true,
  create(api) {
    const { cv, g } = api;
    const W = cv.width, H = cv.height;
    const C = 40, COLS = 9, TOP = 50;
    const R = Math.max(10, Math.floor((H - TOP) / C));
    const OFFY = TOP + Math.floor((H - TOP - R * C) / 2);
    const rowY = r => OFFY + r * C;
    // righe dall'alto: 0 tane, 1-4 fiume, 5 aiuola, poi strada, poi erba fino alla partenza
    const ROADS = Math.min(5, R - 7), ROAD0 = 6, START = R - 1;
    const CAR_COLORS = ['#e5413b', '#25c4f0', '#f58a25', '#a655b8', '#eef1ff'];

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, time = 0, left = 30, deadT = 0, msg = '', msgT = 0;
    let P, lanes = [], bays = [], maxRow = START, sw = null, why = '';

    const buildLanes = () => {
      lanes = [];
      for (let k = 0; k < ROADS; k++) {
        const row = ROAD0 + k, dir = k % 2 ? 1 : -1, truck = k % 3 === 2;
        const w = truck ? 88 : 48, span = W + 160, n = Math.max(2, Math.floor(span / (w + 90 + (4 - k % 4) * 12)));
        lanes.push({ row, kind: 'car', dir, speed: (46 + k * 11 + level * 7) * (0.9 + (k % 3) * 0.12), w, span, n, color: CAR_COLORS[k % CAR_COLORS.length], off: k * 53 });
      }
      for (let k = 0; k < 4; k++) {
        const row = 1 + k, dir = k % 2 ? -1 : 1, w = [124, 92, 150, 104][k], span = W + 200, n = Math.max(2, Math.floor(span / (w + 78)));
        lanes.push({ row, kind: 'log', dir, speed: 30 + k * 7 + level * 4, w, span, n, off: k * 71 });
      }
    };
    // Posizione (bordo sinistro) di un oggetto di una corsia: calcolata dal tempo, così è sempre la stessa per disegno e collisioni.
    const itemX = (l, i) => {
      const gap = l.span / l.n, p = ((i * gap + l.off + l.dir * l.speed * time) % l.span + l.span) % l.span;
      return p - l.w - 20;
    };
    const resetPlayer = () => { P = { x: W / 2 - ((W / 2) % C) + C / 2 - (COLS % 2 ? 0 : 0), r: START, vx: 0, vy: 0, hop: 0, carried: 0 }; P.x = Math.floor(COLS / 2) * C + C / 2 + (W - COLS * C) / 2; maxRow = START; left = 30; };
    const newGame = () => { score = 0; lives = 3; level = 1; bays = [false, false, false, false]; buildLanes(); resetPlayer(); state = 'play'; };
    const flash = s => { msg = s; msgT = 1.2; };
    const die = reason => {
      if (state !== 'play') return;
      state = 'dead'; deadT = 0.9; why = reason; lives--; api.haptic(45); api.beep(140, 0.35, 'sawtooth', 0.06);
    };
    const hop = (dx, dy) => {
      if (state !== 'play' || P.hop > 0.04) return;
      const nr = P.r + dy;
      if (nr < 0 || nr > START) return;
      const nx = P.x + dx * C;
      if (nx < (W - COLS * C) / 2 || nx > W - (W - COLS * C) / 2) return;
      P.x = nx; P.r = nr; P.vx = -dx * C; P.vy = -dy * C; P.hop = 0.1;
      api.haptic(4); api.beep(520 + (START - P.r) * 25, 0.03, 'triangle', 0.04);
      if (P.r < maxRow) { maxRow = P.r; score += 10; }
      if (P.r === 0) landGoal();
    };
    const landGoal = () => {
      const base = (W - COLS * C) / 2, idx = Math.round((P.x - base - C / 2) / C);
      if (idx % 2 === 1 && idx >= 1 && idx <= 7 && !bays[(idx - 1) / 2]) {
        bays[(idx - 1) / 2] = true; score += 100 + Math.round(left) * 2; api.haptic(30); api.beep(988, 0.1); flash('TANA!');
        if (bays.every(Boolean)) { level++; bays = [false, false, false, false]; buildLanes(); flash('LIVELLO ' + level); [660, 880, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.1), i * 110)); }
        resetPlayer();
      } else die('SIEPE');
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      if (state === 'dead') { deadT -= dt; if (deadT <= 0) { if (lives <= 0) { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } } else { resetPlayer(); state = 'play'; } } return; }
      if (state !== 'play') return;
      P.hop = Math.max(0, P.hop - dt);
      P.vx *= Math.max(0, 1 - dt * 14); P.vy *= Math.max(0, 1 - dt * 14);
      left -= dt; if (left <= 0) { die('TEMPO'); return; }
      const lane = lanes.find(l => l.row === P.r);
      if (lane && lane.kind === 'car') {
        for (let i = 0; i < lane.n; i++) { const x = itemX(lane, i); if (P.x + 12 > x && P.x - 12 < x + lane.w) { die('AUTO'); return; } }
      } else if (lane && lane.kind === 'log') {
        let on = false;
        for (let i = 0; i < lane.n; i++) { const x = itemX(lane, i); if (P.x > x + 4 && P.x < x + lane.w - 4) { on = true; break; } }
        if (!on) { die('ACQUA'); return; }
        P.x += lane.dir * lane.speed * dt;
        if (P.x < 4 || P.x > W - 4) { die('FUORI'); return; }
      }
    };

    const act = k => {
      if (k === 'left') hop(-1, 0); else if (k === 'right') hop(1, 0); else if (k === 'up') hop(0, -1); else if (k === 'down') hop(0, 1);
      else if (k === 'a' || k === 'b') { if (state === 'title' || state === 'over') newGame(); else hop(0, -1); }
      else if (k === 'start') {
        if (state === 'title' || state === 'over') newGame();
        else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play';
      } else if (k === 'select' && state !== 'title') newGame();
    };
    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(); return; }
        if (state === 'pause') { state = 'play'; return; }
        sw = { id: e.id, x: e.x, y: e.y, done: false };
      } else if (e.type === 'move' && sw && e.id === sw.id && !sw.done) {
        const dx = e.x - sw.x, dy = e.y - sw.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) { sw.done = true; if (Math.abs(dx) > Math.abs(dy)) hop(dx > 0 ? 1 : -1, 0); else hop(0, dy > 0 ? 1 : -1); }
      } else if (e.type === 'up' && sw && e.id === sw.id) { if (!sw.done && state === 'play') hop(0, -1); sw = null; }
    };

    // Disegno
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#eef1ff';
      g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = '#eef1ff'; g.fillRect(x, y, w, h);
      g.fillStyle = '#141a2e'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };
    const drawChick = (x, y, dead) => {
      g.fillStyle = dead ? '#c9b24a' : '#f5d31c'; g.beginPath(); g.arc(x, y + 2, 13, 0, 7); g.fill();
      g.fillStyle = '#f58a25'; g.fillRect(x - 3, y - 14, 6, 4);                                   // ciuffo
      g.fillStyle = '#f58a25'; g.beginPath(); g.moveTo(x - 4, y + 2); g.lineTo(x + 4, y + 2); g.lineTo(x, y + 9); g.fill();   // becco
      g.fillStyle = '#141a2e'; g.fillRect(x - 7, y - 4, 3, 3); g.fillRect(x + 4, y - 4, 3, 3);
    };
    const render = () => {
      g.fillStyle = '#0b1020'; g.fillRect(0, 0, W, H);
      if (state === 'title') {
        text('ROAD', W / 2, 150, 56, 'center', '#f5d31c'); text('HOP', W / 2, 206, 56, 'center');
        drawChick(W / 2, 320, false);
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 390, 16, 'center', '#f5d31c');
        text('STRISCIA PER SALTARE · TOCCA PER AVANZARE', W / 2, 440, 11, 'center', '#aab3d8');
        text('RECORD ' + hi, W / 2, 480, 14, 'center');
        return;
      }
      const base = (W - COLS * C) / 2;
      for (let r = 0; r < R; r++) {
        const y = rowY(r);
        g.fillStyle = r === 0 ? '#1e5a2a' : r <= 4 ? '#1a4f86' : (r === 5 || r > ROAD0 + ROADS - 1) ? '#2d7a3c' : '#262b40';
        g.fillRect(0, y, W, C);
        if (r >= ROAD0 && r < ROAD0 + ROADS && r > ROAD0) { g.fillStyle = 'rgba(238,241,255,.22)'; for (let x = 0; x < W; x += 36) g.fillRect(x, y, 18, 2); }
      }
      // tane
      for (let i = 0; i < 4; i++) { const bx = base + (1 + i * 2) * C; g.fillStyle = bays[i] ? '#2d7a3c' : '#0f2b6b'; g.fillRect(bx, rowY(0) + 4, C, C - 4); if (bays[i]) drawChick(bx + C / 2, rowY(0) + C / 2 + 2, false); }
      for (const l of lanes) {
        const y = rowY(l.row);
        for (let i = 0; i < l.n; i++) {
          const x = itemX(l, i);
          if (l.kind === 'car') {
            g.fillStyle = l.color; g.fillRect(x, y + 7, l.w, C - 14);
            g.fillStyle = 'rgba(11,16,32,.75)'; g.fillRect(x + (l.dir > 0 ? l.w - 18 : 6), y + 11, 12, C - 22);
            g.fillStyle = '#141a2e'; g.fillRect(x + 6, y + C - 9, 8, 4); g.fillRect(x + l.w - 14, y + C - 9, 8, 4);
          } else {
            g.fillStyle = '#7a4a22'; g.fillRect(x, y + 6, l.w, C - 12);
            g.fillStyle = '#a8662f'; g.fillRect(x, y + 6, l.w, 5);
            g.fillStyle = '#5e3716'; for (let k = 16; k < l.w - 8; k += 22) g.fillRect(x + k, y + 16, 2, 10);
          }
        }
      }
      const px = P.x + P.vx, py = rowY(P.r) + C / 2 + P.vy;
      drawChick(px, py, state === 'dead');
      g.fillStyle = '#0b1020'; g.fillRect(0, 0, W, TOP);
      text('PUNTI ' + score, 10, 8, 15); text('LV ' + level, W / 2 + 10, 8, 15, 'center');
      for (let i = 0; i < lives; i++) { g.fillStyle = '#f5d31c'; g.beginPath(); g.arc(W - 16 - i * 18, 16, 6, 0, 7); g.fill(); }
      g.fillStyle = '#1f2744'; g.fillRect(10, 32, W - 20, 8); g.fillStyle = left < 8 ? '#e5413b' : '#4cc24a'; g.fillRect(10, 32, (W - 20) * Math.max(0, left) / 30, 8);
      if (msgT > 0) text(msg, W / 2, TOP + 8, 20, 'center', '#f5d31c');
      if (state === 'dead') text(why, W / 2, H / 2, 24, 'center', '#ff6a5e');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    P = { x: W / 2, r: START, vx: 0, vy: 0, hop: 0 }; bays = [false, false, false, false]; buildLanes();
    return {
      onPress: act, onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update, render,
      debug: { newGame, hop, get state() { return state; }, get P() { return P; }, get lanes() { return lanes; }, get bays() { return bays; }, get score() { return score; }, get lives() { return lives; }, itemX, rowY, R, START, C, ROADS, set time(v) { time = v; } },
    };
  },
});

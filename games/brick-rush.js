registerGame({
  id: 'brick-rush',
  title: 'BRICK RUSH',
  color: '#e5413b',
  blurb: 'Fai rimbalzare la palla e distruggi tutti i mattoncini. Trascina il dito per muovere la racchetta, tocca per lanciare. Più vai avanti, più è veloce.',
  inputs: ['TRASCINA', 'TOCCO', 'D-PAD'],
  size: [360, 640],
  bg: '#0b1020',
  flexH: true,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const PAD_Y = H - 96, PAD_H = 12, R = 6, COLS = 9, BH = 18, TOP = 84, WALL_T = 58;
    const BW = (W - 24) / COLS;
    const COLORS = ['#e5413b', '#f58a25', '#f5d31c', '#4cc24a', '#25c4f0', '#3d5fe0', '#a655b8', '#eef1ff'];

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, msg = '', msgT = 0, time = 0;
    let pad = { x: W / 2, w: 78 }, ball, bricks = [], target = null, parts = [];

    const speed = () => Math.min(620, 310 + level * 24);
    const build = () => {
      bricks = [];
      const rows = Math.min(8, 3 + level);
      for (let r = 0; r < rows; r++) for (let c = 0; c < COLS; c++) {
        if (level % 3 === 2 && (c + r) % 2) continue;        // scacchiera
        if (level % 3 === 0 && c === 4 && r % 2 === 0) continue;  // un varco al centro
        bricks.push({ x: 12 + c * BW, y: TOP + r * (BH + 3), w: BW - 3, h: BH, hp: r === 0 && level > 1 ? 2 : 1, color: COLORS[r % COLORS.length] });
      }
    };
    const resetBall = () => { ball = { x: pad.x, y: PAD_Y - R - 1, vx: 0, vy: 0, on: true }; };
    const newGame = () => { score = 0; lives = 3; level = 1; pad.w = 78; pad.x = W / 2; build(); resetBall(); state = 'play'; };
    const flash = s => { msg = s; msgT = 1.3; };
    const burst = (x, y, c, n) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 50 + Math.random() * 110; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.5 + Math.random() * 0.3, c }); } };
    const launch = () => {
      if (!ball.on) return;
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.5, s = speed();
      ball.vx = Math.cos(a) * s; ball.vy = Math.sin(a) * s; ball.on = false; api.beep(520, 0.05);
    };

    const step = dt => {
      let s = Math.hypot(ball.vx, ball.vy);
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < WALL_T + R) { ball.y = WALL_T + R; ball.vy = Math.abs(ball.vy); }
      if (ball.vy > 0 && ball.y + R >= PAD_Y && ball.y - R <= PAD_Y + PAD_H && Math.abs(ball.x - pad.x) <= pad.w / 2 + R) {
        const rel = Math.max(-1, Math.min(1, (ball.x - pad.x) / (pad.w / 2)));
        const ang = rel * 1.05; s = Math.max(s, speed());
        ball.vx = Math.sin(ang) * s; ball.vy = -Math.cos(ang) * s; ball.y = PAD_Y - R;
        api.haptic(6); api.beep(300, 0.03, 'triangle', 0.05);
      }
      for (const b of bricks) {
        const nx = Math.max(b.x, Math.min(ball.x, b.x + b.w)), ny = Math.max(b.y, Math.min(ball.y, b.y + b.h));
        const dx = ball.x - nx, dy = ball.y - ny;
        if (dx * dx + dy * dy >= R * R) continue;
        if (Math.abs(dx) > Math.abs(dy)) ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
        else ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
        b.hp--;
        if (b.hp <= 0) { b.dead = true; score += 10 * level; burst(b.x + b.w / 2, b.y + b.h / 2, b.color, 6); api.haptic(8); api.beep(640 + (b.y % 7) * 40, 0.04, 'square', 0.04); }
        else { api.beep(380, 0.03, 'square', 0.04); }
        break;
      }
      bricks = bricks.filter(b => !b.dead);
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 300 * dt; p.t -= dt; });
      parts = parts.filter(p => p.t > 0);
      if (state !== 'play') return;
      pad.x += ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * 400 * dt;
      if (target !== null) pad.x += (target - pad.x) * Math.min(1, dt * 20);
      pad.x = Math.max(pad.w / 2, Math.min(W - pad.w / 2, pad.x));
      if (ball.on) { ball.x = pad.x; return; }
      const n = Math.max(1, Math.ceil(Math.hypot(ball.vx, ball.vy) * dt / 4));
      for (let i = 0; i < n; i++) step(dt / n);
      if (ball.y > H + R) {
        lives--; api.haptic(40); api.beep(140, 0.3, 'sawtooth', 0.06);
        if (lives <= 0) { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } } else resetBall();
      }
      if (!bricks.length) { level++; build(); resetBall(); flash('LIVELLO ' + level); api.haptic(25); [660, 880].forEach((f, i) => setTimeout(() => api.beep(f, 0.1), i * 110)); }
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame();
        else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play';
      } else if (k === 'select') { if (state !== 'title') newGame(); }
      else if ((k === 'a' || k === 'b') && state === 'play') launch();
    };
    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(); return; }
        if (state === 'pause') { state = 'play'; return; }
        target = e.x; launch();
      } else if (e.type === 'move' && state === 'play') target = e.x;
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
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
    let trail = [];
    const render = () => {
      const bgG = g.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, '#0b1230'); bgG.addColorStop(1, '#060a1c'); g.fillStyle = bgG; g.fillRect(0, 0, W, H);
      const hz = g.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.35, H * 0.7); hz.addColorStop(0, 'rgba(70,90,200,.20)'); hz.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hz; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(120,140,220,.06)'; g.lineWidth = 1; for (let x = 0; x < W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      if (state === 'title') {
        text('BRICK', W / 2, 150, 56, 'center', '#e5413b'); text('RUSH', W / 2, 206, 56, 'center');
        for (let i = 0; i < 8; i++) { g.fillStyle = COLORS[i]; g.fillRect(40 + i * 33, 300, 30, 16); }
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 380, 16, 'center', '#f5d31c');
        text('TRASCINA PER MUOVERE · TOCCA PER LANCIARE', W / 2, 430, 11, 'center', '#aab3d8');
        text('RECORD ' + hi, W / 2, 470, 14, 'center');
        return;
      }
      g.fillStyle = '#1f2744'; g.fillRect(0, WALL_T - 4, W, 4);
      for (const b of bricks) {
        const bgr = g.createLinearGradient(0, b.y, 0, b.y + b.h); bgr.addColorStop(0, 'rgba(255,255,255,.55)'); bgr.addColorStop(0.18, 'rgba(255,255,255,0)'); bgr.addColorStop(1, 'rgba(0,0,0,.38)');
        g.fillStyle = b.color; rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 4); g.fill(); g.fillStyle = bgr; rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 4); g.fill();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(b.x + 4, b.y + 2.5, b.w * 0.45, 1.6);
        if (b.hp > 1) { g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2; rr(b.x + 3, b.y + 3, b.w - 6, b.h - 6, 3); g.stroke(); }
      }
      g.fillStyle = 'rgba(37,196,240,.22)'; rr(pad.x - pad.w / 2 - 3, PAD_Y - 3, pad.w + 6, PAD_H + 6, PAD_H / 2 + 3); g.fill();
      const pg = g.createLinearGradient(0, PAD_Y, 0, PAD_Y + PAD_H); pg.addColorStop(0, '#9be8ff'); pg.addColorStop(0.5, '#25c4f0'); pg.addColorStop(1, '#0e6f93');
      g.fillStyle = pg; rr(pad.x - pad.w / 2, PAD_Y, pad.w, PAD_H, PAD_H / 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; rr(pad.x - pad.w / 2 + 6, PAD_Y + 2, pad.w - 12, 2.4, 1.2); g.fill();
      trail.push({ x: ball.x, y: ball.y }); if (trail.length > 8) trail.shift();
      trail.forEach((t, i) => { g.fillStyle = 'rgba(190,220,255,' + (i / trail.length * 0.25) + ')'; g.beginPath(); g.arc(t.x, t.y, R * (0.5 + i / trail.length * 0.5), 0, 7); g.fill(); });
      const bl = g.createRadialGradient(ball.x - R * 0.35, ball.y - R * 0.4, 1, ball.x, ball.y, R * 1.1); bl.addColorStop(0, '#ffffff'); bl.addColorStop(1, '#9fb0e8');
      g.fillStyle = 'rgba(180,200,255,.25)'; g.beginPath(); g.arc(ball.x, ball.y, R + 3, 0, 7); g.fill(); g.fillStyle = bl; g.beginPath(); g.arc(ball.x, ball.y, R, 0, 7); g.fill();
      parts.forEach(p => { g.globalAlpha = Math.min(1, p.t * 2.5); g.fillStyle = p.c; g.fillRect(p.x - 2, p.y - 2, 4, 4); });
      g.globalAlpha = 1;
      text('PUNTI ' + score, 10, 10, 15); text('LV ' + level, W / 2, 10, 15, 'center');
      for (let i = 0; i < lives; i++) { g.fillStyle = '#eef1ff'; g.beginPath(); g.arc(W - 16 - i * 18, 18, 6, 0, 7); g.fill(); }
      text('RECORD ' + hi, 10, 32, 11, 'left', '#aab3d8');
      if (ball.on && state === 'play') text('TOCCA PER LANCIARE', W / 2, PAD_Y - 60, 13, 'center', '#f5d31c');
      if (msgT > 0) text(msg, W / 2, H / 2, 22, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    bricks = []; resetBall();
    return {
      onPress: act, onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update, render,
      debug: { newGame, get state() { return state; }, get bricks() { return bricks; }, get ball() { return ball; }, get pad() { return pad; }, get score() { return score; }, get lives() { return lives; }, launch },
    };
  },
});

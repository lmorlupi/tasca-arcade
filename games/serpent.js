registerGame({
  id: 'serpent',
  title: 'SERPENT',
  color: '#4cc24a',
  blurb: 'Il serpente cresce mangiando le mele. Striscia il dito nella direzione in cui vuoi girare, senza toccare muri né te stesso. Le mele dorate valgono di più.',
  inputs: ['SWIPE', 'D-PAD', 'VIBRAZIONE'],
  size: [360, 640],
  bg: '#0b1020',
  flexH: true,
  create(api) {
    const { cv, g } = api;
    const W = cv.width, H = cv.height;
    const CELL = 24, COLS = Math.floor(W / CELL), TOPY = 58;
    const ROWS = Math.floor((H - TOPY - 6) / CELL), OX = Math.floor((W - COLS * CELL) / 2), OY = TOPY;

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, eaten = 0, tick = 0, time = 0, deadT = 0;
    let snake, dir, queue, apple, gold, parts = [], sw = null;

    const interval = () => Math.max(0.07, 0.17 - eaten * 0.0035);
    const freeCell = () => {
      for (let k = 0; k < 200; k++) {
        const c = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 };
        if (!snake.some(s => s.x === c.x && s.y === c.y) && !(apple && apple.x === c.x && apple.y === c.y)) return c;
      }
      return { x: 0, y: 0 };
    };
    const newGame = () => {
      const cx = (COLS / 2) | 0, cy = (ROWS / 2) | 0;
      snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
      dir = { x: 1, y: 0 }; queue = []; apple = null; apple = freeCell(); gold = null;
      score = 0; eaten = 0; tick = 0; parts = []; state = 'play';
    };
    const turn = (x, y) => {
      if (state !== 'play' || queue.length >= 2) return;
      const last = queue.length ? queue[queue.length - 1] : dir;
      if ((last.x === x && last.y === y) || (last.x === -x && last.y === -y)) return;
      queue.push({ x, y }); api.haptic(3);
    };
    const burst = (x, y, c, n) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 100; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.5, c }); } };
    const die = () => {
      state = 'dead'; deadT = 1.0; api.haptic(50); api.beep(130, 0.35, 'sawtooth', 0.06);
      burst(OX + snake[0].x * CELL + CELL / 2, OY + snake[0].y * CELL + CELL / 2, '#4cc24a', 14);
      if (score > hi) { hi = score; api.store.set('hi', hi); }
    };

    const move = () => {
      if (queue.length) dir = queue.shift();
      const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      if (h.x < 0 || h.y < 0 || h.x >= COLS || h.y >= ROWS || snake.slice(0, -1).some(s => s.x === h.x && s.y === h.y)) { die(); return; }
      snake.unshift(h);
      if (h.x === apple.x && h.y === apple.y) {
        eaten++; score += 10; api.haptic(10); api.beep(700 + Math.min(500, eaten * 18), 0.06);
        burst(OX + h.x * CELL + CELL / 2, OY + h.y * CELL + CELL / 2, '#e5413b', 8);
        apple = freeCell();
        if (eaten % 5 === 0) { gold = Object.assign(freeCell(), { t: 7 }); }
      } else if (gold && h.x === gold.x && h.y === gold.y) {
        score += 50; gold = null; api.haptic(20); api.beep(1100, 0.1); [1318].forEach(f => setTimeout(() => api.beep(f, 0.1), 90));
      } else snake.pop();
    };

    const update = dt => {
      time += dt;
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; });
      parts = parts.filter(p => p.t > 0);
      if (state === 'dead') { deadT -= dt; if (deadT <= 0) state = 'over'; return; }
      if (state !== 'play') return;
      if (gold) { gold.t -= dt; if (gold.t <= 0) gold = null; }
      tick += dt;
      while (tick >= interval() && state === 'play') { tick -= interval(); move(); }
    };

    const act = k => {
      if (k === 'left') turn(-1, 0); else if (k === 'right') turn(1, 0); else if (k === 'up') turn(0, -1); else if (k === 'down') turn(0, 1);
      else if (k === 'start' || k === 'a') {
        if (state === 'title' || state === 'over') newGame();
        else if (k === 'start') { if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      } else if (k === 'select' && state !== 'title') newGame();
    };
    // Swipe: gira appena il dito si è mosso abbastanza, senza aspettare che lo si sollevi.
    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(); return; }
        if (state === 'pause') { state = 'play'; return; }
        sw = { id: e.id, x: e.x, y: e.y };
      } else if (e.type === 'move' && sw && e.id === sw.id) {
        const dx = e.x - sw.x, dy = e.y - sw.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 20) {
          if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1);
          sw.x = e.x; sw.y = e.y;
        }
      } else if (e.type === 'up') sw = null;
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
    const cellXY = c => [OX + c.x * CELL, OY + c.y * CELL];
    const render = () => {
      g.fillStyle = '#0b1020'; g.fillRect(0, 0, W, H);
      if (state === 'title') {
        text('SERPENT', W / 2, 160, 50, 'center', '#4cc24a');
        for (let i = 0; i < 9; i++) { g.fillStyle = i === 8 ? '#9bf08d' : '#4cc24a'; g.fillRect(70 + i * 24, 270 + Math.sin(i * 0.9) * 10, 22, 22); }
        g.fillStyle = '#e5413b'; g.beginPath(); g.arc(300, 281, 9, 0, 7); g.fill();
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 380, 16, 'center', '#f5d31c');
        text('STRISCIA IL DITO PER GIRARE', W / 2, 430, 12, 'center', '#aab3d8');
        text('RECORD ' + hi, W / 2, 470, 14, 'center');
        return;
      }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { g.fillStyle = (x + y) % 2 ? '#101830' : '#0d1428'; g.fillRect(OX + x * CELL, OY + y * CELL, CELL, CELL); }
      g.strokeStyle = '#5a6aa0'; g.lineWidth = 2; g.strokeRect(OX - 1, OY - 1, COLS * CELL + 2, ROWS * CELL + 2);
      // mela e mela dorata
      let [ax, ay] = cellXY(apple);
      g.fillStyle = '#e5413b'; g.beginPath(); g.arc(ax + CELL / 2, ay + CELL / 2 + 1, 9, 0, 7); g.fill();
      g.fillStyle = '#4cc24a'; g.fillRect(ax + CELL / 2, ay + 2, 3, 6);
      if (gold) {
        [ax, ay] = cellXY(gold);
        g.fillStyle = ((gold.t * 6) | 0) % 2 || gold.t > 2 ? '#f5d31c' : '#fff6b0'; g.beginPath(); g.arc(ax + CELL / 2, ay + CELL / 2 + 1, 10, 0, 7); g.fill();
        g.fillStyle = '#c99a00'; g.fillRect(ax + CELL / 2, ay + 1, 3, 6);
      }
      snake.forEach((s, i) => {
        const [x, y] = cellXY(s), t = 1 - i / Math.max(8, snake.length);
        g.fillStyle = i === 0 ? '#9bf08d' : `rgb(${40 + 30 * t | 0},${150 + 50 * t | 0},${60 + 20 * t | 0})`;
        g.fillRect(x + 2, y + 2, CELL - 4, CELL - 4);
        if (i === 0) {
          g.fillStyle = '#0b1020';
          const ex = dir.y ? [x + 7, x + 16] : [x + (dir.x > 0 ? 15 : 6), x + (dir.x > 0 ? 15 : 6)], ey = dir.y ? [y + (dir.y > 0 ? 15 : 6), y + (dir.y > 0 ? 15 : 6)] : [y + 6, y + 15];
          g.fillRect(ex[0], ey[0], 3, 3); g.fillRect(ex[1], ey[1], 3, 3);
        }
      });
      parts.forEach(p => { g.globalAlpha = Math.min(1, p.t * 2.5); g.fillStyle = p.c; g.fillRect(p.x - 2, p.y - 2, 4, 4); });
      g.globalAlpha = 1;
      text('PUNTI ' + score, 12, 14, 18); text('RECORD ' + hi, W - 12, 18, 12, 'right', '#aab3d8');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    snake = [{ x: 3, y: 3 }]; dir = { x: 1, y: 0 }; queue = []; apple = { x: 8, y: 8 };
    return {
      onPress: act, onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update, render,
      debug: { newGame, turn, move, get state() { return state; }, get snake() { return snake; }, get apple() { return apple; }, get score() { return score; }, get dir() { return dir; }, COLS, get ROWS() { return ROWS; } },
    };
  },
});

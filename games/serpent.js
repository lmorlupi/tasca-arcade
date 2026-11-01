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
      const bgG = g.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, '#0b1230'); bgG.addColorStop(1, '#060a1c'); g.fillStyle = bgG; g.fillRect(0, 0, W, H);
      if (state === 'title') {
        text('SERPENT', W / 2, 160, 50, 'center', '#4cc24a');
        for (let i = 0; i < 9; i++) { g.fillStyle = i === 8 ? '#9bf08d' : '#4cc24a'; g.fillRect(70 + i * 24, 270 + Math.sin(i * 0.9) * 10, 22, 22); }
        g.fillStyle = '#e5413b'; g.beginPath(); g.arc(300, 281, 9, 0, 7); g.fill();
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 380, 16, 'center', '#f5d31c');
        text('STRISCIA IL DITO PER GIRARE', W / 2, 430, 12, 'center', '#aab3d8');
        text('RECORD ' + hi, W / 2, 470, 14, 'center');
        return;
      }
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { g.fillStyle = (x + y) % 2 ? '#14213a' : '#101a30'; g.fillRect(OX + x * CELL, OY + y * CELL, CELL, CELL); if ((x * 7 + y * 13) % 5 === 0) { g.fillStyle = 'rgba(120,200,120,.07)'; g.fillRect(OX + x * CELL + 6, OY + y * CELL + 7, 3, 3); } }
      g.strokeStyle = '#5a6aa0'; g.lineWidth = 2; g.strokeRect(OX - 1, OY - 1, COLS * CELL + 2, ROWS * CELL + 2);
      // mela e mela dorata
      const fruit = (cx, cy, r, c0, c1, leaf) => {
        g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(cx, cy + r + 1, r * 0.8, 2.2, 0, 0, 7); g.fill();
        const fg = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 1, cx, cy, r * 1.15); fg.addColorStop(0, c0); fg.addColorStop(1, c1);
        g.fillStyle = fg; g.beginPath(); g.arc(cx - r * 0.3, cy, r * 0.8, 0, 7); g.arc(cx + r * 0.3, cy, r * 0.8, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(cx - r * 0.45, cy - r * 0.45, r * 0.3, r * 0.17, -0.6, 0, 7); g.fill();
        g.strokeStyle = '#5b3a1c'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx, cy - r * 0.6); g.lineTo(cx + 1.5, cy - r * 1.15); g.stroke();
        g.fillStyle = leaf; g.beginPath(); g.ellipse(cx + 5, cy - r * 0.95, 4.5, 2.2, -0.5, 0, 7); g.fill();
      };
      let [ax, ay] = cellXY(apple);
      fruit(ax + CELL / 2, ay + CELL / 2 + 1, 9, '#ff8a80', '#b3201c', '#4cc24a');
      if (gold) {
        [ax, ay] = cellXY(gold);
        const blink = ((gold.t * 6) | 0) % 2 || gold.t > 2;
        g.fillStyle = 'rgba(255,220,80,.22)'; g.beginPath(); g.arc(ax + CELL / 2, ay + CELL / 2, 15, 0, 7); g.fill();
        fruit(ax + CELL / 2, ay + CELL / 2 + 1, 10, blink ? '#fff3a0' : '#ffffff', blink ? '#d8a008' : '#f0c840', '#7bd85a');
      }
      // corpo: cerchi morbidi che si fondono, con scaglie
      for (let i = snake.length - 1; i >= 0; i--) {
        const [x, y] = cellXY(snake[i]), cx = x + CELL / 2, cy = y + CELL / 2, t = 1 - i / Math.max(8, snake.length);
        const rad = i === 0 ? CELL / 2 - 0.5 : CELL / 2 - 2 - (i > snake.length - 4 ? (i - (snake.length - 4)) * 0.8 : 0);
        const col = i === 0 ? ['#c2ff9d', '#4cae3a'] : [`rgb(${70 + 40 * t | 0},${190 + 30 * t | 0},${80 + 20 * t | 0})`, `rgb(${25 + 20 * t | 0},${110 + 40 * t | 0},${40 + 15 * t | 0})`];
        const sg = g.createRadialGradient(cx - 3, cy - 4, 1, cx, cy, rad + 2); sg.addColorStop(0, col[0]); sg.addColorStop(1, col[1]);
        g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, rad, 0, 7); g.fill();
        if (i > 0 && i % 2 === 0) { g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.arc(cx, cy, rad * 0.5, 0, 7); g.fill(); }
        if (i > 0) { const [px, py] = cellXY(snake[i - 1]); g.fillStyle = col[1]; g.fillRect(Math.min(cx, px + CELL / 2) - 1, Math.min(cy, py + CELL / 2) - rad * 0.55, Math.abs(cx - px - CELL / 2) + 2 || 2, Math.abs(cy - py - CELL / 2) ? Math.abs(cy - py - CELL / 2) + 2 : rad * 1.1); }
        if (i === 0) {
          const fx = dir.x, fy = dir.y, sx = -fy, sy = fx;
          g.fillStyle = '#e5413b'; g.beginPath(); g.moveTo(cx + fx * rad, cy + fy * rad); g.lineTo(cx + fx * (rad + 6) + sx * 2.5, cy + fy * (rad + 6) + sy * 2.5); g.lineTo(cx + fx * (rad + 6) - sx * 2.5, cy + fy * (rad + 6) - sy * 2.5); g.closePath(); if (((performance.now() / 300) | 0) % 2) g.fill();
          for (const k of [-1, 1]) { const ex = cx + fx * 3 + sx * 5.5 * k, ey = cy + fy * 3 + sy * 5.5 * k; g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, 3.2, 0, 7); g.fill(); g.fillStyle = '#0b1020'; g.beginPath(); g.arc(ex + fx * 1, ey + fy * 1, 1.7, 0, 7); g.fill(); }
        }
      }
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

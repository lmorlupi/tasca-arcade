registerGame({
  id: 'tilt-ball',
  title: 'TILT BALL',
  color: '#4cc24a',
  blurb: 'Inclina l\'iPhone per far rotolare la sfera nel labirinto. Evita i buchi, raccogli le monete, raggiungi l\'uscita. A azzera l\'inclinazione.',
  inputs: ['INCLINA', 'VIBRAZIONE', 'D-PAD'],
  size: [468, 568],
  tilt: true,
  create(api) {
    const { cv, g, tilt } = api;
    const T = 36, COLS = 13, ROWS = 15, HUD = 28, R = 11;
    const PAL = ['#141a2e', '#1f2744', '#5a6aa0', '#eef1ff'];

    let hi = api.store.get('hi', 0);
    let state = 'play', score = 0, lives = 3, level = 1, elapsed = 0, stateT = 0, msgT = 0, msg = '';
    let grid, holes, coins, goal, ball, tx = 0, ty = 0, fallAt = null;

    const rng = seed => () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    const bfs = (from, blocked) => {
      const d = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
      const q = [from]; d[from[1]][from[0]] = 0;
      while (q.length) {
        const [x, y] = q.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || d[ny][nx] >= 0 || blocked(nx, ny)) continue;
          d[ny][nx] = d[y][x] + 1; q.push([nx, ny]);
        }
      }
      return d;
    };

    // Labirinto con anelli: una strada sola sarebbe troppo facile da bloccare con i buchi.
    const build = lv => {
      const rand = rng(lv * 7919 + 13);
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(1));
      const cw = (COLS - 1) / 2, ch = (ROWS - 1) / 2;
      const seen = Array.from({ length: ch }, () => Array(cw).fill(false));
      const stack = [[0, 0]]; seen[0][0] = true; grid[1][1] = 0;
      while (stack.length) {
        const [cx, cy] = stack[stack.length - 1];
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]]
          .filter(([dx, dy]) => cx + dx >= 0 && cy + dy >= 0 && cx + dx < cw && cy + dy < ch && !seen[cy + dy][cx + dx]);
        if (!opts.length) { stack.pop(); continue; }
        const [dx, dy] = opts[(rand() * opts.length) | 0];
        grid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0;
        grid[(cy + dy) * 2 + 1][(cx + dx) * 2 + 1] = 0;
        seen[cy + dy][cx + dx] = true; stack.push([cx + dx, cy + dy]);
      }
      const walls = [];
      for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
        if (grid[y][x] !== 1 || (x + y) % 2 === 0) continue;
        const open = (x % 2 === 1) ? (!grid[y - 1][x] && !grid[y + 1][x]) : (!grid[y][x - 1] && !grid[y][x + 1]);
        if (open) walls.push([x, y]);
      }
      for (let i = 0; i < 5 && walls.length; i++) {
        const [x, y] = walls.splice((rand() * walls.length) | 0, 1)[0];
        grid[y][x] = 0;
      }

      const dist = bfs([1, 1], (x, y) => grid[y][x] === 1);
      let best = 0; goal = [1, 1];
      for (let y = 1; y < ROWS; y += 2) for (let x = 1; x < COLS; x += 2) {
        if (dist[y][x] > best) { best = dist[y][x]; goal = [x, y]; }
      }

      const free = [];
      for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) {
        if (grid[y][x] === 0 && !(x === 1 && y === 1) && !(x === goal[0] && y === goal[1])
          && Math.abs(x - 1) + Math.abs(y - 1) > 2 && Math.abs(x - goal[0]) + Math.abs(y - goal[1]) > 1) free.push([x, y]);
      }
      for (let i = free.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [free[i], free[j]] = [free[j], free[i]]; }

      holes = [];
      const want = Math.min(2 + lv, 11);
      for (const [x, y] of free) {
        if (holes.length >= want) break;
        const probe = [...holes, [x, y]];
        const d = bfs([1, 1], (nx, ny) => grid[ny][nx] === 1 || probe.some(h => h[0] === nx && h[1] === ny));
        if (d[goal[1]][goal[0]] >= 0) holes.push([x, y]);
      }
      coins = [];
      for (const [x, y] of free) {
        if (coins.length >= 3) break;
        if (!holes.some(h => h[0] === x && h[1] === y)) coins.push({ x, y, got: false });
      }
    };

    const px = tile => tile * T + T / 2;
    const resetBall = () => { ball = { x: px(1), y: HUD + px(1), vx: 0, vy: 0, s: 1 }; fallAt = null; elapsed = 0; };
    const startLevel = () => { build(level); resetBall(); state = 'play'; };
    const newGame = () => { score = 0; lives = 3; level = 1; startLevel(); };
    const flash = s => { msg = s; msgT = 1.2; };

    const endGame = () => {
      state = 'over';
      if (score > hi) { hi = score; api.store.set('hi', hi); }
    };

    const wallAt = (x, y) => x < 0 || y < 0 || x >= COLS || y >= ROWS || grid[y][x] === 1;

    const step = dt => {
      const ax = tx * 1100, ay = ty * 1100;
      ball.vx += ax * dt; ball.vy += ay * dt;
      const damp = Math.exp(-0.9 * dt);
      ball.vx *= damp; ball.vy *= damp;
      const sp = Math.hypot(ball.vx, ball.vy);
      if (sp > 420) { ball.vx *= 420 / sp; ball.vy *= 420 / sp; }
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;

      const cx = Math.floor(ball.x / T), cy = Math.floor((ball.y - HUD) / T);
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
        if (!wallAt(x, y)) continue;
        const rx = x * T, ry = HUD + y * T;
        const nx = Math.max(rx, Math.min(ball.x, rx + T)), ny = Math.max(ry, Math.min(ball.y, ry + T));
        let dx = ball.x - nx, dy = ball.y - ny, d = Math.hypot(dx, dy);
        if (d >= R) continue;
        if (d === 0) { dx = 0; dy = -1; d = 1; }
        const ux = dx / d, uy = dy / d;
        ball.x = nx + ux * R; ball.y = ny + uy * R;
        const vn = ball.vx * ux + ball.vy * uy;
        if (vn < 0) {
          ball.vx -= 1.35 * vn * ux; ball.vy -= 1.35 * vn * uy;
          if (-vn > 150) { api.haptic(6); api.beep(200, 0.02, 'triangle', 0.03); }
        }
      }
    };

    const update = dt => {
      msgT = Math.max(0, msgT - dt);
      tx += (tilt.x - tx) * Math.min(1, dt * 12);
      ty += (tilt.y - ty) * Math.min(1, dt * 12);

      if (state === 'play') {
        elapsed += dt;
        const n = Math.ceil(dt / 0.008);
        for (let i = 0; i < n; i++) step(dt / n);

        for (const [hx, hy] of holes) {
          const cx = px(hx), cy = HUD + px(hy);
          const dx = cx - ball.x, dy = cy - ball.y, d = Math.hypot(dx, dy);
          if (d < 22) {
            ball.vx += dx / d * 1200 * (1 - d / 22) * dt; ball.vy += dy / d * 1200 * (1 - d / 22) * dt;
          }
          if (d < 9) {
            state = 'fall'; stateT = 0.9; fallAt = [cx, cy]; lives--;
            api.haptic(60); api.beep(180, 0.4, 'sawtooth', 0.05);
            return;
          }
        }
        for (const c of coins) {
          if (c.got) continue;
          if (Math.hypot(px(c.x) - ball.x, HUD + px(c.y) - ball.y) < 15) {
            c.got = true; score += 50; api.haptic(12); api.beep(988, 0.08, 'square', 0.04); flash('+50');
          }
        }
        if (Math.hypot(px(goal[0]) - ball.x, HUD + px(goal[1]) - ball.y) < 13) {
          const bonus = Math.max(0, Math.round((60 - elapsed) * 10));
          score += level * 100 + bonus;
          state = 'win'; stateT = 1.6; api.haptic(35);
          [660, 880, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.12), i * 110));
          flash('+' + (level * 100 + bonus));
        }
      } else if (state === 'fall') {
        stateT -= dt;
        ball.x += (fallAt[0] - ball.x) * Math.min(1, dt * 10);
        ball.y += (fallAt[1] - ball.y) * Math.min(1, dt * 10);
        ball.s = Math.max(0, stateT / 0.9);
        if (stateT <= 0) { if (lives <= 0) endGame(); else { build(level); resetBall(); state = 'play'; } }
      } else if (state === 'win') {
        stateT -= dt;
        if (stateT <= 0) { level++; startLevel(); }
      }
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'over') newGame();
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
      } else if (k === 'select') newGame();
      else if (k === 'a' && state === 'play') { tilt.calibrate(); api.haptic(15); flash('AZZERATO'); }
    };

    const onPointer = e => { if (e.type === 'up' && !e.cancelled && state === 'over') act('start'); };

    // Disegno
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || PAL[3];
      g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 300, x = (cv.width - w) / 2, y = (cv.height - h) / 2;
      g.fillStyle = PAL[3]; g.fillRect(x, y, w, h);
      g.fillStyle = PAL[0]; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, cv.width / 2, y + 12 + i * 26, 18, 'center'));
    };

    const render = () => {
      g.fillStyle = PAL[0]; g.fillRect(0, 0, cv.width, cv.height);
      const now = performance.now() / 1000;

      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const X = x * T, Y = HUD + y * T;
        if (grid[y][x] === 1) {
          g.fillStyle = '#4a5aa0'; g.fillRect(X, Y, T, T);
          g.fillStyle = '#7f8fd0'; g.fillRect(X, Y, T, 3); g.fillRect(X, Y, 3, T);
          g.fillStyle = '#2a3566'; g.fillRect(X, Y + T - 3, T, 3); g.fillRect(X + T - 3, Y, 3, T);
        } else {
          g.fillStyle = (x + y) % 2 ? '#12182c' : '#161e36'; g.fillRect(X, Y, T, T);
        }
      }

      for (const [hx, hy] of holes) {
        const cx = px(hx), cy = HUD + px(hy);
        const gr = g.createRadialGradient(cx, cy, 2, cx, cy, 15);
        gr.addColorStop(0, '#000'); gr.addColorStop(.75, '#05070f'); gr.addColorStop(1, '#2a3566');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.fill();
      }
      for (const c of coins) {
        if (c.got) continue;
        const cx = px(c.x), cy = HUD + px(c.y) + Math.sin(now * 4 + c.x) * 2;
        g.fillStyle = '#f5d31c'; g.beginPath(); g.arc(cx, cy, 7, 0, 7); g.fill();
        g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(cx - 2, cy - 2, 2.5, 0, 7); g.fill();
      }
      const gx = px(goal[0]), gyy = HUD + px(goal[1]), pulse = 12 + Math.sin(now * 5) * 2;
      g.strokeStyle = '#4cc24a'; g.lineWidth = 3; g.beginPath(); g.arc(gx, gyy, pulse, 0, 7); g.stroke();
      g.fillStyle = '#4cc24a'; g.beginPath(); g.arc(gx, gyy, 6, 0, 7); g.fill();

      // sfera con ombra spostata dall'inclinazione
      const r = R * ball.s;
      g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(ball.x + 3 - tx * 2, ball.y + 5 - ty * 2, r, r * .8, 0, 0, 7); g.fill();
      const bg = g.createRadialGradient(ball.x - r * .35, ball.y - r * .4, 1, ball.x, ball.y, r);
      bg.addColorStop(0, '#fff'); bg.addColorStop(.45, '#e5413b'); bg.addColorStop(1, '#7a1d1a');
      g.fillStyle = bg; g.beginPath(); g.arc(ball.x, ball.y, Math.max(0.1, r), 0, 7); g.fill();

      // intestazione
      g.fillStyle = '#0b1020'; g.fillRect(0, 0, cv.width, HUD);
      text('LV ' + level, 8, 7, 14);
      text(String(score).padStart(5, '0'), 80, 7, 14);
      text(Math.max(0, Math.round(elapsed)) + 's', 170, 7, 14);
      for (let i = 0; i < lives; i++) { g.fillStyle = '#e5413b'; g.beginPath(); g.arc(246 + i * 18, 14, 6, 0, 7); g.fill(); }
      text(tilt.sensor ? 'INCLINA' : 'D-PAD', cv.width - 8, 7, 12, 'right', tilt.sensor ? '#4cc24a' : '#f5d31c');

      if (msgT > 0) text(msg, cv.width / 2, HUD + 6, 18, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    newGame();
    return {
      onPress: act,
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update,
      render,
      debug: { get ball() { return ball; }, get holes() { return holes; }, get goal() { return goal; }, get grid() { return grid; }, get state() { return state; }, bfs },
    };
  },
});

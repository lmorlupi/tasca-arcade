registerGame({
  id: 'space-raiders',
  title: 'SPACE RAIDERS',
  color: '#4cc24a',
  blurb: 'Ondate di invasori scendono a gruppi. Trascina il dito per guidare la nave: spara da sola mentre tocchi. Ripara dietro gli scudi.',
  inputs: ['TRASCINA', 'AUTO-FUOCO', 'VIBRAZIONE'],
  size: [360, 640],
  pixel: true,
  bg: '#0b1020',
  flexH: true,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const PAL = ['#0b1020', '#1f2744', '#5a6aa0', '#eef1ff'];
    const COLS = 9, ROWS = 5, SX = 32, SY = 30, AW = 24, STEP = 6, DROP = 14, PX = 3;
    const SHIP_Y = H - 52, SHIELD_Y = H - 150;

    // Sprite 8x8 a due fotogrammi (disegno originale).
    const SPR = [
      [['...##...', '..####..', '.######.', '##.##.##', '########', '.#.##.#.', '#......#', '.#....#.'],
       ['...##...', '..####..', '.######.', '##.##.##', '########', '..#..#..', '.#.##.#.', '#......#']],
      [['.#....#.', '..#..#..', '.######.', '##.##.##', '########', '#.####.#', '#.#..#.#', '..#..#..'],
       ['.#....#.', '#.#..#.#', '#.####.#', '###..###', '########', '.######.', '..#..#..', '.#....#.']],
      [['..####..', '.######.', '########', '#.#..#.#', '########', '.##..##.', '#..##..#', '........'],
       ['..####..', '.######.', '########', '#.#..#.#', '########', '..#..#..', '.#.##.#.', '#......#']],
    ];
    const ROW_TYPE = [0, 1, 1, 2, 2];
    const TYPE_COLOR = ['#a655b8', '#25c4f0', '#4cc24a'];
    const TYPE_PTS = [30, 20, 10];

    const bmp = (rows, x, y, px, color) => {
      g.fillStyle = color;
      rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') g.fillRect(Math.round(x + i * px), Math.round(y + j * px), px, px); });
    };

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, wave = 1;
    let ship, bullet, ebullets, aliens, ox, oy, dir, tickT, frame, shootT, shields, ufo, ufoT, parts, deadT, sound = 0;
    let touch = null, flashMsg = '', flashT = 0;
    const stars = Array.from({ length: 50 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.5 + .5 }));

    const buildShields = () => {
      shields = [];
      for (let i = 0; i < 4; i++) {
        const cells = Array.from({ length: 10 }, (_, r) => Array.from({ length: 16 }, (_, c) => {
          if (r === 0 && (c < 2 || c > 13)) return false;
          if (r === 1 && (c < 1 || c > 14)) return false;
          if (r >= 6 && c >= 5 && c <= 10) return false;
          return true;
        }));
        shields.push({ x: 28 + i * 84, cells });
      }
    };
    const spawnWave = () => {
      aliens = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) aliens.push({ r, c, alive: true, type: ROW_TYPE[r] });
      ox = 28; oy = 84 + Math.min(wave - 1, 5) * 10; dir = 1; tickT = 0; frame = 0; shootT = 1;
      ebullets = []; bullet = null; ufo = null; ufoT = 14 + Math.random() * 8;
      if ((wave - 1) % 3 === 0) buildShields();
    };
    const newGame = () => {
      score = 0; lives = 3; wave = 1; parts = [];
      ship = { x: W / 2, cd: 0, inv: 0 }; deadT = 0;
      spawnWave(); state = 'play';
    };
    const endGame = () => {
      state = 'over';
      if (score > hi) { hi = score; api.store.set('hi', hi); }
    };
    const aliveCount = () => aliens.reduce((n, a) => n + (a.alive ? 1 : 0), 0);
    const apos = a => [ox + a.c * SX, oy + a.r * SY];
    const boom = (x, y, color, n = 10) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 40 + Math.random() * 120; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.5 + Math.random() * 0.3, c: color }); } };
    const flash = s => { flashMsg = s; flashT = 1.2; };

    const shieldHit = (bx, by) => {
      for (const s of shields) {
        const c = Math.floor((bx - s.x) / PX), r = Math.floor((by - SHIELD_Y) / PX);
        if (r < 0 || r >= 10 || c < 0 || c >= 16 || !s.cells[r][c]) continue;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < 10 && cc >= 0 && cc < 16 && (Math.abs(dr) + Math.abs(dc) < 2 || Math.random() < 0.5)) s.cells[rr][cc] = false;
        }
        return true;
      }
      return false;
    };

    const fire = () => {
      if (bullet || ship.cd > 0 || deadT > 0) return;
      bullet = { x: ship.x, y: SHIP_Y - 10 }; ship.cd = 0.28;
      api.beep(880, 0.04, 'square', 0.03);
    };

    const hitShip = () => {
      if (ship.inv > 0 || deadT > 0) return;
      lives--; deadT = 1.2; boom(ship.x, SHIP_Y, '#eef1ff', 18); api.haptic(50); api.beep(120, 0.4, 'sawtooth', 0.06);
      ebullets = [];
    };

    const update = dt => {
      flashT = Math.max(0, flashT - dt);
      stars.forEach(s => { s.y += s.s * 10 * dt; if (s.y > H) s.y = 0; });
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; });
      parts = parts.filter(p => p.t > 0);
      if (state !== 'play') return;

      ship.cd = Math.max(0, ship.cd - dt); ship.inv = Math.max(0, ship.inv - dt);
      if (deadT > 0) {
        deadT -= dt;
        if (deadT <= 0) { if (lives <= 0) { endGame(); return; } ship.x = W / 2; ship.inv = 1.5; }
      } else {
        const mv = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        ship.x += mv * 240 * dt;
        if (touch) ship.x += (touch.x - ship.x) * Math.min(1, dt * 18);
        ship.x = Math.max(18, Math.min(W - 18, ship.x));
        if (touch || held.a || held.b) fire();
      }

      // giocatore: proiettile a passi piccoli per non attraversare gli scudi
      if (bullet) {
        let left = 560 * dt;
        while (left > 0 && bullet) {
          const d = Math.min(2, left); left -= d; bullet.y -= d;
          if (bullet.y < 40) { bullet = null; break; }
          if (shieldHit(bullet.x, bullet.y)) { bullet = null; break; }
          if (ufo && Math.abs(bullet.x - ufo.x) < 18 && Math.abs(bullet.y - 56) < 10) {
            const pts = [50, 100, 150, 300][(Math.random() * 4) | 0];
            score += pts; boom(ufo.x, 56, '#e5413b', 14); flash('+' + pts); api.haptic(25); api.beep(1200, 0.2); ufo = null; bullet = null; break;
          }
          for (const a of aliens) {
            if (!a.alive) continue;
            const [ax, ay] = apos(a);
            if (bullet.x > ax - 2 && bullet.x < ax + AW + 2 && bullet.y > ay && bullet.y < ay + AW) {
              a.alive = false; score += TYPE_PTS[a.type]; boom(ax + AW / 2, ay + AW / 2, TYPE_COLOR[a.type]);
              api.haptic(12); api.beep(300, 0.08, 'square', 0.05);
              bullet = null; break;
            }
          }
        }
      }

      // invasori
      const n = aliveCount();
      if (n === 0) { wave++; flash('ONDATA ' + wave); api.haptic(30); spawnWave(); return; }
      tickT += dt;
      const interval = Math.max(0.02, 0.62 * n / (COLS * ROWS)) * Math.pow(0.92, wave - 1);
      if (tickT >= interval) {
        tickT = 0; frame ^= 1;
        let minX = 1e9, maxX = -1e9, maxY = 0;
        for (const a of aliens) if (a.alive) { const [x, y] = apos(a); minX = Math.min(minX, x); maxX = Math.max(maxX, x + AW); maxY = Math.max(maxY, y + AW); }
        if ((dir > 0 && maxX + STEP > W - 8) || (dir < 0 && minX - STEP < 8)) { oy += DROP; dir = -dir; }
        else ox += dir * STEP;
        api.beep([110, 98, 87, 78][sound++ & 3], 0.05, 'square', 0.04);
        if (maxY + DROP >= SHIELD_Y) {
          for (const a of aliens) if (a.alive) { const [x, y] = apos(a); for (const s of shields) for (let r = 0; r < 10; r++) for (let c = 0; c < 16; c++) {
            const sx = s.x + c * PX, sy = SHIELD_Y + r * PX;
            if (sx > x - 3 && sx < x + AW && sy > y - 3 && sy < y + AW) s.cells[r][c] = false;
          } }
        }
        if (maxY >= SHIP_Y - 14) { lives = 0; hitShip(); }
      }

      // colpi degli invasori
      shootT -= dt;
      if (shootT <= 0 && ebullets.length < 3 + Math.floor(wave / 2) && deadT <= 0) {
        const cols = {};
        for (const a of aliens) if (a.alive && (!cols[a.c] || a.r > cols[a.c].r)) cols[a.c] = a;
        const list = Object.values(cols);
        if (list.length) { const a = list[(Math.random() * list.length) | 0]; const [x, y] = apos(a); ebullets.push({ x: x + AW / 2, y: y + AW }); }
        shootT = Math.max(0.35, 1.1 - wave * 0.08) * (0.6 + Math.random() * 0.8);
      }
      for (const b of ebullets) {
        let left = (170 + wave * 12) * dt;
        while (left > 0 && !b.dead) {
          const d = Math.min(2, left); left -= d; b.y += d;
          if (b.y > H) { b.dead = true; break; }
          if (b.y > SHIELD_Y - 6 && b.y < SHIELD_Y + 40 && shieldHit(b.x, b.y)) { b.dead = true; break; }
          if (deadT <= 0 && ship.inv <= 0 && Math.abs(b.x - ship.x) < 14 && b.y > SHIP_Y - 8 && b.y < SHIP_Y + 10) { b.dead = true; hitShip(); break; }
        }
      }
      ebullets = ebullets.filter(b => !b.dead);

      // disco volante
      ufoT -= dt;
      if (!ufo && ufoT <= 0) { const d = Math.random() < 0.5 ? 1 : -1; ufo = { x: d > 0 ? -20 : W + 20, d }; ufoT = 18 + Math.random() * 10; }
      if (ufo) { ufo.x += ufo.d * 90 * dt; if (ufo.x < -30 || ufo.x > W + 30) ufo = null; }
    };

    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(); return; }
        touch = { id: e.id, x: e.x };
      } else if (e.type === 'move' && touch && e.id === touch.id) touch.x = e.x;
      else if (e.type === 'up' && touch && e.id === touch.id) touch = null;
    };
    const act = k => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame();
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
      } else if (k === 'select' && state !== 'title') newGame();
    };

    // Disegno
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || PAL[3];
      g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = PAL[3]; g.fillRect(x, y, w, h);
      g.fillStyle = PAL[0]; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };
    const drawShip = (x, y) => {
      g.fillStyle = '#eef1ff'; g.fillRect(x - 14, y, 28, 8);
      g.fillStyle = '#25c4f0'; g.fillRect(x - 8, y - 6, 16, 8);
      g.fillStyle = '#e5413b'; g.fillRect(x - 2, y - 14, 4, 10);
      g.fillStyle = '#5a6aa0'; g.fillRect(x - 14, y + 6, 6, 4); g.fillRect(x + 8, y + 6, 6, 4);
    };

    const render = () => {
      g.fillStyle = PAL[0]; g.fillRect(0, 0, W, H);
      g.fillStyle = '#5a6aa0'; stars.forEach(s => g.fillRect(s.x, s.y, s.s, s.s));

      if (state === 'title') {
        text('SPACE', W / 2, 150, 44, 'center', '#4cc24a'); text('RAIDERS', W / 2, 198, 44, 'center');
        bmp(SPR[0][0], W / 2 - 60, 290, 4, TYPE_COLOR[0]); bmp(SPR[1][0], W / 2 - 16, 290, 4, TYPE_COLOR[1]); bmp(SPR[2][0], W / 2 + 28, 290, 4, TYPE_COLOR[2]);
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 370, 16, 'center', '#f5d31c');
        text('TRASCINA PER MUOVERE · SPARA DA SOLA', W / 2, 410, 11, 'center', '#aab3d8');
        text('RECORD ' + hi, W / 2, 440, 13, 'center');
        return;
      }

      for (const a of aliens) if (a.alive) { const [x, y] = apos(a); bmp(SPR[a.type][frame], x, y, 3, TYPE_COLOR[a.type]); }
      for (const s of shields) {
        g.fillStyle = '#4cc24a';
        s.cells.forEach((row, r) => row.forEach((on, c) => { if (on) g.fillRect(s.x + c * PX, SHIELD_Y + r * PX, PX, PX); }));
      }
      if (ufo) { g.fillStyle = '#e5413b'; g.fillRect(ufo.x - 14, 52, 28, 7); g.fillRect(ufo.x - 8, 47, 16, 6); g.fillStyle = '#f5d31c'; g.fillRect(ufo.x - 8, 56, 3, 3); g.fillRect(ufo.x + 5, 56, 3, 3); }
      if (bullet) { g.fillStyle = '#eef1ff'; g.fillRect(bullet.x - 1.5, bullet.y, 3, 10); }
      g.fillStyle = '#f5d31c'; ebullets.forEach(b => { g.fillRect(b.x - 1.5, b.y - 8, 3, 8); g.fillRect(b.x - 3, b.y - 5, 6, 2); });
      if (deadT <= 0 && !(ship.inv > 0 && ((ship.inv * 10) | 0) % 2 === 0)) drawShip(ship.x, SHIP_Y);
      parts.forEach(p => { g.fillStyle = p.c; g.fillRect(p.x, p.y, 3, 3); });
      g.fillStyle = '#4cc24a'; g.fillRect(0, H - 22, W, 2);

      text('PUNTI ' + String(score).padStart(5, '0'), 10, 8, 14);
      text('ONDATA ' + wave, W / 2, 8, 14, 'center');
      for (let i = 0; i < lives; i++) drawShip(W - 26 - i * 34, 12);
      if (flashT > 0) text(flashMsg, W / 2, 80, 20, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    parts = []; aliens = []; shields = []; ebullets = []; ship = { x: W / 2, cd: 0, inv: 0 };
    return {
      onPress: act,
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; touch = null; },
      update,
      render,
      debug: { newGame, get state() { return state; }, get aliens() { return aliens; }, get ship() { return ship; }, get score() { return score; }, fire, get bullet() { return bullet; } },
    };
  },
});

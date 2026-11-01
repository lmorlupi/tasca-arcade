registerGame({
  id: 'galaxy-strike',
  title: 'GALAXY STRIKE',
  color: '#3d5fe0',
  blurb: 'Gli alieni restano in formazione, poi si buttano in picchiata verso di te. Trascina il dito per schivare: la nave spara da sola mentre tocchi.',
  inputs: ['TRASCINA', 'AUTO-FUOCO', 'VIBRAZIONE'],
  size: [360, 640],
  pixel: true,
  bg: '#070b18',
  flexH: true,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const PAL = ['#070b18', '#1f2744', '#5a6aa0', '#eef1ff'];
    const SHIP_Y = H - 56;

    // Sprite 8x8 a due fotogrammi (disegno originale).
    const SPR = [
      [['..#..#..', '.#.##.#.', '########', '#.####.#', '########', '.#.##.#.', '#..##..#', '...##...'],
       ['..#..#..', '.#.##.#.', '########', '#.####.#', '########', '..#..#..', '.#.##.#.', '#..##..#']],
      [['#..##..#', '##.##.##', '########', '.######.', '..####..', '.#.##.#.', '#......#', '........'],
       ['#..##..#', '##.##.##', '########', '.######.', '..####..', '..#..#..', '.#....#.', '#......#']],
      [['.######.', '########', '##.##.##', '########', '.##..##.', '#.####.#', '#......#', '.#....#.'],
       ['.######.', '########', '##.##.##', '########', '.##..##.', '#.####.#', '.#....#.', '#......#']],
    ];
    const COLOR = [['#f5d31c'], ['#e5413b'], ['#4cc24a', '#a655b8']];
    const PTS = [50, 80, 150];
    const bmp = (rows, x, y, px, color) => {
      g.fillStyle = color;
      rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') g.fillRect(Math.round(x + i * px), Math.round(y + j * px), px, px); });
    };

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, wave = 1, time = 0;
    let ship, shots, enemies, ebullets, parts, diveT, deadT, clearT, touch = null, flashMsg = '', flashT = 0, cd = 0;
    const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.8 + .4 }));

    const spawnWave = () => {
      enemies = []; ebullets = []; shots = [];
      const layout = [[4, 2], [8, 1], [8, 1], [10, 0], [10, 0]];
      let i = 0;
      layout.forEach(([n, type], r) => {
        for (let c = 0; c < n; c++) {
          const sx = W / 2 + (c - (n - 1) / 2) * 32, sy = 96 + r * 30;
          enemies.push({ type, hp: type === 2 ? 2 : 1, sx, sy, x: sx, y: -30, state: 'wait', delay: 0.3 + i++ * 0.05, u: 0, shots: 0 });
        }
      });
      diveT = 3; clearT = 0;
    };
    const newGame = () => {
      score = 0; lives = 3; wave = 1; parts = []; deadT = 0; cd = 0;
      ship = { x: W / 2, inv: 0 };
      spawnWave(); state = 'play';
    };
    const endGame = () => {
      state = 'over';
      if (score > hi) { hi = score; api.store.set('hi', hi); }
    };
    const boom = (x, y, color, n = 10) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 40 + Math.random() * 140; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.4 + Math.random() * 0.4, c: color }); } };
    const flash = s => { flashMsg = s; flashT = 1.3; };

    const hitShip = () => {
      if (ship.inv > 0 || deadT > 0) return;
      lives--; deadT = 1.3; boom(ship.x, SHIP_Y, '#eef1ff', 20); api.haptic(50); api.beep(120, 0.4, 'sawtooth', 0.06);
      ebullets = [];
    };

    const aimShot = e => {
      const dx = ship.x - e.x, dy = SHIP_Y - e.y, d = Math.hypot(dx, dy) || 1;
      ebullets.push({ x: e.x, y: e.y + 8, vx: dx / d * 190, vy: Math.max(80, dy / d * 190) });
    };

    const update = dt => {
      time += dt; flashT = Math.max(0, flashT - dt);
      stars.forEach(s => { s.y += s.s * 40 * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; });
      parts = parts.filter(p => p.t > 0);
      if (state !== 'play') return;

      ship.inv = Math.max(0, ship.inv - dt); cd = Math.max(0, cd - dt);
      if (deadT > 0) {
        deadT -= dt;
        if (deadT <= 0) { if (lives <= 0) { endGame(); return; } ship.x = W / 2; ship.inv = 1.6; }
      } else {
        const mv = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        ship.x += mv * 260 * dt;
        if (touch) ship.x += (touch.x - ship.x) * Math.min(1, dt * 20);
        ship.x = Math.max(16, Math.min(W - 16, ship.x));
        if ((touch || held.a || held.b) && cd <= 0 && shots.length < 2) {
          shots.push({ x: ship.x, y: SHIP_Y - 12 }); cd = 0.18; api.beep(1100, 0.03, 'square', 0.025);
        }
      }

      const sway = Math.sin(time * 0.9) * 22;
      let divers = 0;
      for (const e of enemies) {
        if (e.state === 'wait') { e.delay -= dt; if (e.delay <= 0) { e.state = 'enter'; e.x = e.sx + sway; } }
        else if (e.state === 'enter' || e.state === 'return') {
          e.x += (e.sx + sway - e.x) * Math.min(1, dt * 6);
          e.y += 260 * dt;
          if (e.y >= e.sy) { e.y = e.sy; e.state = 'form'; }
        } else if (e.state === 'form') { e.x = e.sx + sway; e.y = e.sy + Math.sin(time * 2 + e.sx * 0.05) * 2; }
        else if (e.state === 'dive') {
          divers++;
          e.u += dt / (3.1 - Math.min(1, wave * 0.1));
          const u = e.u;
          e.x = e.x0 + (e.tx - e.x0) * u * 0.75 + e.sign * Math.sin(u * 7.5) * 46 * (1 - u * 0.4);
          e.y = e.y0 + (H + 50 - e.y0) * u * u * 0.55 + (H + 50 - e.y0) * u * 0.45;
          if (e.shots === 0 && u > 0.2 && deadT <= 0 && e.y < H - 200) { e.shots = 1; aimShot(e); }
          if (e.shots === 1 && u > 0.45 && deadT <= 0 && e.y < H - 200 && wave > 1) { e.shots = 2; aimShot(e); }
          if (u >= 1) { e.state = 'return'; e.y = -30; e.shots = 0; }
        }
        // contatto con la nave
        if (deadT <= 0 && ship.inv <= 0 && Math.abs(e.x - ship.x) < 18 && Math.abs(e.y - SHIP_Y) < 18 && e.state !== 'wait') {
          boom(e.x, e.y, COLOR[e.type][0], 12); e.dead = true; hitShip();
        }
      }

      diveT -= dt;
      if (diveT <= 0 && deadT <= 0) {
        const cand = enemies.filter(e => e.state === 'form');
        if (cand.length && divers < 2 + Math.floor(wave / 2)) {
          const e = cand[(Math.random() * cand.length) | 0];
          e.state = 'dive'; e.u = 0; e.x0 = e.x; e.y0 = e.y; e.tx = ship.x; e.sign = e.x < W / 2 ? 1 : -1; e.shots = 0;
        }
        diveT = Math.max(0.5, 1.8 - wave * 0.12) * (0.6 + Math.random() * 0.8);
      }

      for (const s of shots) {
        s.y -= 600 * dt;
        for (const e of enemies) {
          if (e.dead || e.state === 'wait') continue;
          if (Math.abs(s.x - e.x) < 15 && Math.abs(s.y - e.y) < 14) {
            s.dead = true; e.hp--;
            if (e.hp <= 0) {
              e.dead = true;
              const pts = PTS[e.type] * (e.state === 'dive' ? 2 : 1);
              score += pts; boom(e.x, e.y, COLOR[e.type][0], 14); api.haptic(14); api.beep(260, 0.1, 'square', 0.05);
              if (e.state === 'dive') flash('+' + pts);
            } else { api.haptic(6); api.beep(500, 0.04); boom(e.x, e.y, '#eef1ff', 4); }
            break;
          }
        }
      }
      shots = shots.filter(s => !s.dead && s.y > -10);
      enemies = enemies.filter(e => !e.dead);

      for (const b of ebullets) {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (deadT <= 0 && ship.inv <= 0 && Math.abs(b.x - ship.x) < 13 && Math.abs(b.y - SHIP_Y) < 12) { b.dead = true; hitShip(); }
      }
      ebullets = ebullets.filter(b => !b.dead && b.y < H + 10 && b.x > -10 && b.x < W + 10);

      if (!enemies.length) {
        clearT += dt;
        if (clearT > 1.4) { wave++; flash('ONDATA ' + wave); api.haptic(30); spawnWave(); }
      }
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
    const drawShip = (x, y, s = 1) => {
      g.fillStyle = '#eef1ff'; g.fillRect(x - 3 * s, y - 14 * s, 6 * s, 20 * s);
      g.fillStyle = '#3d5fe0'; g.fillRect(x - 12 * s, y - 2 * s, 24 * s, 8 * s);
      g.fillStyle = '#e5413b'; g.fillRect(x - 16 * s, y + 4 * s, 8 * s, 6 * s); g.fillRect(x + 8 * s, y + 4 * s, 8 * s, 6 * s);
      g.fillStyle = '#25c4f0'; g.fillRect(x - 2 * s, y - 8 * s, 4 * s, 6 * s);
    };

    const render = () => {
      g.fillStyle = PAL[0]; g.fillRect(0, 0, W, H);
      stars.forEach(s => { g.fillStyle = s.s > 1.4 ? '#eef1ff' : '#5a6aa0'; g.fillRect(s.x, s.y, s.s, s.s); });

      if (state === 'title') {
        text('GALAXY', W / 2, 140, 46, 'center', '#3d5fe0'); text('STRIKE', W / 2, 190, 46, 'center');
        bmp(SPR[0][0], W / 2 - 70, 290, 4, COLOR[0][0]); bmp(SPR[1][0], W / 2 - 16, 290, 4, COLOR[1][0]); bmp(SPR[2][0], W / 2 + 38, 290, 4, COLOR[2][0]);
        drawShip(W / 2, 400, 1.4);
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 340, 16, 'center', '#f5d31c');
        text('RECORD ' + hi, W / 2, 450, 13, 'center');
        return;
      }

      const f = ((time * 4) | 0) & 1;
      for (const e of enemies) {
        if (e.state === 'wait') continue;
        const col = COLOR[e.type][e.hp < (e.type === 2 ? 2 : 1) ? 1 : 0];
        bmp(SPR[e.type][f], e.x - 12, e.y - 12, 3, col);
      }
      g.fillStyle = '#eef1ff'; shots.forEach(s => g.fillRect(s.x - 1.5, s.y, 3, 12));
      g.fillStyle = '#f5d31c'; ebullets.forEach(b => { g.beginPath(); g.arc(b.x, b.y, 3.5, 0, 7); g.fill(); });
      if (deadT <= 0 && !(ship.inv > 0 && ((ship.inv * 10) | 0) % 2 === 0)) drawShip(ship.x, SHIP_Y);
      parts.forEach(p => { g.fillStyle = p.c; g.fillRect(p.x, p.y, 3, 3); });

      text('PUNTI ' + String(score).padStart(5, '0'), 10, 8, 14);
      text('ONDATA ' + wave, W / 2 + 10, 8, 14, 'center');
      for (let i = 0; i < lives; i++) drawShip(W - 24 - i * 30, 22, 0.6);
      if (flashT > 0) text(flashMsg, W / 2, 56, 20, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    parts = []; enemies = []; shots = []; ebullets = []; ship = { x: W / 2, inv: 0 };
    return {
      onPress: act,
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; touch = null; },
      update,
      render,
      debug: { newGame, get state() { return state; }, get enemies() { return enemies; }, get ship() { return ship; }, get score() { return score; } },
    };
  },
});

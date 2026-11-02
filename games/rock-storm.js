registerGame({
  id: 'rock-storm',
  title: 'ROCK STORM',
  color: '#5a6aa0',
  blurb: 'Una navicella nella tempesta di asteroidi: spezzali prima che ti colpiscano. Metti il dito dove vuoi andare: la nave ti segue. Con A spari, con B ti teletrasporti.',
  inputs: ['TOCCO DIRETTO', 'D-PAD', 'VIBRAZIONE'],
  size: [360, 640],
  bg: '#05070f',
  flexH: true,
  flexMin: 1.15,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const TAU = Math.PI * 2;
    const SIZES = [{ r: 12, pts: 100 }, { r: 22, pts: 50 }, { r: 38, pts: 20 }];

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, wave = 1, time = 0, msg = '', msgT = 0, respawnT = 0, deadT = 0, cd = 0;
    let ship, bullets = [], rocks = [], touch = null;

    const blob = (r) => {
      const n = 10, pts = [];
      for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.72 + Math.random() * 0.4; pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k]); }
      return pts;
    };
    const makeRock = (x, y, size, vx, vy) => {
      const a = Math.random() * TAU, s = (24 + Math.random() * 38 + wave * 3) * (size === 2 ? 0.8 : size === 1 ? 1.25 : 1.8);
      return { x, y, size, vx: vx !== undefined ? vx : Math.cos(a) * s, vy: vy !== undefined ? vy : Math.sin(a) * s, a: 0, w: (Math.random() - 0.5) * 1.6, pts: blob(SIZES[size].r) };
    };
    const spawnWave = () => {
      rocks = [];
      for (let i = 0; i < Math.min(11, 3 + wave); i++) {
        let x, y; do { x = Math.random() * W; y = Math.random() * H; } while (Math.hypot(x - W / 2, y - H / 2) < 140);
        rocks.push(makeRock(x, y, 2));
      }
    };
    const newShip = () => ({ x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, inv: 2 });
    const saved = () => api.store.get('stage', 1);
    const newGame = (from = 1) => { score = 0; lives = 3; wave = from; bullets = []; api.fx.clear(); ship = newShip(); spawnWave(); state = 'play'; };
    const flash = s => { msg = s; msgT = 1.3; };
    const burst = (x, y, c, n) => api.fx.burst(x, y, { n, color: c, speed: 150, life: 1, size: 3, drag: 0 });
    const shoot = () => {
      if (state !== 'play' || deadT > 0 || cd > 0 || bullets.length >= 5) return;
      cd = 0.16; bullets.push({ x: ship.x + Math.cos(ship.a) * 14, y: ship.y + Math.sin(ship.a) * 14, vx: ship.vx + Math.cos(ship.a) * 440, vy: ship.vy + Math.sin(ship.a) * 440, t: 0.95 });
      api.beep(900, 0.03, 'square', 0.025);
    };
    const hyper = () => {
      if (state !== 'play' || deadT > 0) return;
      ship.x = 30 + Math.random() * (W - 60); ship.y = 80 + Math.random() * (H - 160); ship.vx = ship.vy = 0; ship.inv = 0.8;
      api.haptic(15); api.beep(300, 0.15, 'sine', 0.05);
      if (Math.random() < 0.12) hit();
    };
    const hit = () => {
      if (deadT > 0) return;
      lives--; deadT = 1.4; api.haptic(50); api.beep(110, 0.5, 'sawtooth', 0.07);
      burst(ship.x, ship.y, '#25c4f0', 18); api.fx.shake(7, 0.45); api.fx.flash('#e5413b', 0.25, 0.4);
    };
    const wrap = o => { if (o.x < -40) o.x += W + 80; if (o.x > W + 40) o.x -= W + 80; if (o.y < -40) o.y += H + 80; if (o.y > H + 40) o.y -= H + 80; };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt); cd = Math.max(0, cd - dt);
      if (state !== 'play') return;
      for (const r of rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.w * dt; wrap(r); }

      if (deadT > 0) {
        deadT -= dt;
        if (deadT <= 0) {
          if (lives <= 0) { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } return; }
          if (rocks.every(r => Math.hypot(r.x - W / 2, r.y - H / 2) > 110)) ship = newShip(); else deadT = 0.2;
        }
      } else {
        ship.inv = Math.max(0, ship.inv - dt);
        const rot = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        let thrust = !!(held.up || held.b);
        ship.a += rot * 3.6 * dt;
        if (touch) {
          const dx = touch.x - ship.x, dy = touch.y - ship.y, d = Math.hypot(dx, dy);
          if (d > 14) {
            let diff = Math.atan2(dy, dx) - ship.a; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
            ship.a += Math.max(-6 * dt, Math.min(6 * dt, diff));
            if (d > 46 && Math.abs(diff) < 1.1) thrust = true;
          }
        }
        if (thrust) { ship.vx += Math.cos(ship.a) * 260 * dt; ship.vy += Math.sin(ship.a) * 260 * dt; }
        const damp = Math.exp(-0.45 * dt); ship.vx *= damp; ship.vy *= damp;
        const sp = Math.hypot(ship.vx, ship.vy); if (sp > 320) { ship.vx *= 320 / sp; ship.vy *= 320 / sp; }
        ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship);
        if (held.a) shoot();
      }

      for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; wrap(b); }
      bullets = bullets.filter(b => b.t > 0);

      // colpi contro asteroidi
      const added = [];
      for (const b of bullets) {
        for (const r of rocks) {
          if (r.dead) continue;
          if (Math.hypot(b.x - r.x, b.y - r.y) < SIZES[r.size].r * 0.85) {
            b.t = 0; r.dead = true; score += SIZES[r.size].pts; api.haptic(r.size === 2 ? 14 : 8); api.beep(180 + r.size * 120, 0.08, 'square', 0.04);
            burst(r.x, r.y, '#aab3d8', 6 + r.size * 3); api.fx.text(r.x, r.y, '+' + SIZES[r.size].pts, { size: 12, color: '#dfe6ff' });
            if (r.size === 2) api.fx.shake(3, 0.15);
            if (r.size > 0) { added.push(makeRock(r.x, r.y, r.size - 1), makeRock(r.x, r.y, r.size - 1)); }
            break;
          }
        }
      }
      rocks = rocks.filter(r => !r.dead).concat(added);
      bullets = bullets.filter(b => b.t > 0);
      // la nave contro gli asteroidi
      if (deadT <= 0 && ship.inv <= 0) for (const r of rocks) if (Math.hypot(ship.x - r.x, ship.y - r.y) < SIZES[r.size].r * 0.85 + 8) { hit(); break; }
      if (!rocks.length && deadT <= 0) { wave++; if (wave > saved()) api.store.set('stage', wave); flash('ONDATA ' + wave); api.haptic(25); spawnWave(); ship.inv = 1.5; }
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame(saved());
        else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play';
      } else if (k === 'select') { if (state === 'title') api.store.set('stage', 1); newGame(1); }
      else if (k === 'a') { if (state === 'title' || state === 'over') newGame(saved()); else shoot(); }
      else if (k === 'b' && state === 'play' && api.tilt) { /* B è anche la spinta: il teletrasporto è con SELECT+B */ }
    };
    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(saved()); return; }
        if (state === 'pause') { state = 'play'; return; }
        touch = { id: e.id, x: e.x, y: e.y };
      } else if (e.type === 'move' && touch && e.id === touch.id) { touch.x = e.x; touch.y = e.y; }
      else if (e.type === 'up' && touch && e.id === touch.id) touch = null;
    };

    // Disegno vettoriale
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
    const drawShip = (s, scale = 1, thrusting = false) => {
      g.save(); g.translate(s.x, s.y); g.rotate(s.a + Math.PI / 2); g.scale(scale, scale);
      Art.fighter(g, 0, 2, 1.0, thrusting ? performance.now() / 1000 : 0, '#dfe6ff', '#25a8d6');
      g.restore();
    };
    const render = () => {
      Art.nebula(g, W, H, 0);
      const tt = performance.now() / 1000;
      for (let i = 0; i < 46; i++) { g.fillStyle = i % 5 ? '#3a4672' : 'rgba(235,240,255,' + (0.6 + 0.4 * Math.sin(tt * 2 + i)) + ')'; g.fillRect((i * 97) % W, (i * 211) % H, 2, 2); }
      if (state === 'title') {
        text('ROCK', W / 2, 150, 56, 'center', '#5a6aa0'); text('STORM', W / 2, 206, 56, 'center');
        drawShip({ x: W / 2, y: 340, a: -Math.PI / 2 + Math.sin(performance.now() / 600) * 0.4 }, 2);
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 410, 16, 'center', '#f5d31c');
        text('DITO = DOVE ANDARE · A SPARA', W / 2, 460, 12, 'center', '#aab3d8');
        text('RECORD ' + hi, W / 2, 500, 14, 'center');
        if (saved() > 1) { text('TOCCA: CONTINUA DALL\'ONDATA ' + saved(), W / 2, 530, 12, 'center', '#7bdc72'); text('SELECT: RICOMINCIA', W / 2, 550, 11, 'center', '#aab3d8'); }
        return;
      }
      g.lineWidth = 1.6; g.lineJoin = 'round';
      for (const r of rocks) {
        g.save(); g.translate(r.x, r.y); g.rotate(r.a);
        const rad = Math.max(...r.pts.map(([x, y]) => Math.hypot(x, y)));
        const rg = g.createRadialGradient(-rad * 0.35, -rad * 0.4, rad * 0.1, 0, 0, rad * 1.05); rg.addColorStop(0, '#b4b2b8'); rg.addColorStop(0.55, '#6e6c78'); rg.addColorStop(1, '#2e2d3a');
        g.fillStyle = rg; g.strokeStyle = 'rgba(210,214,230,.55)';
        g.beginPath(); r.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(20,18,30,.35)'; [[0.3, 0.1, 0.22], [-0.35, 0.3, 0.16], [0.05, -0.4, 0.13]].forEach(([cx, cy, cr]) => { g.beginPath(); g.arc(cx * rad, cy * rad, cr * rad, 0, 7); g.fill(); });
        g.restore();
      }
      bullets.forEach(b => { g.fillStyle = 'rgba(255,220,90,.28)'; g.beginPath(); g.arc(b.x, b.y, 5, 0, 7); g.fill(); g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(b.x, b.y, 2, 0, 7); g.fill(); });
      if (deadT <= 0 && !(ship.inv > 0 && ((ship.inv * 10) | 0) % 2 === 0)) drawShip(ship, 1, !!(held.up || held.b || (touch && Math.hypot(touch.x - ship.x, touch.y - ship.y) > 46)));
      g.globalAlpha = 1;
      text('PUNTI ' + score, 10, 10, 15); text('ONDATA ' + wave, W / 2 + 14, 10, 15, 'center');
      for (let i = 0; i < lives; i++) drawShip({ x: W - 20 - i * 24, y: 22, a: -Math.PI / 2 }, 0.8);
      if (msgT > 0) text(msg, W / 2, 60, 20, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    ship = newShip();
    return {
      onPress(k) { if (k === 'select' && held.b) hyper(); else act(k); },
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; touch = null; },
      update, render,
      debug: { newGame, get state() { return state; }, get rocks() { return rocks; }, get ship() { return ship; }, get score() { return score; }, get lives() { return lives; }, shoot, hyper, get bullets() { return bullets; } },
    };
  },
});

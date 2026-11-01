registerGame({
  id: 'canyon-raid',
  title: 'CANYON RAID',
  color: '#e0a020',
  blurb: 'Sorvola montagne, città e caverne fino alla base nemica. Laser in avanti, bombe verso il basso (partono da sole sopra i bersagli). Il carburante cala sempre: bombarda i serbatoi per fare il pieno. Evita missili, dischi volanti, meteore e il terreno. Trascina il dito per pilotare.',
  inputs: ['TRASCINA', 'LASER AUTO', 'BOMBE AUTO'],
  size: [360, 640],
  bg: '#05070f',
  flexH: true,
  flexMin: 1.15,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const SEC = 2600, NS = 6, LEN = SEC * NS, HP = Math.PI / 2, TAU = Math.PI * 2;
    const AMP = [28, 95, 14, 40, 105, 10], BASEY = H * 0.80, TOPH = 44;
    const PAL = [['#58a850', '#27602f'], ['#a8855a', '#5b4328'], ['#8a93a6', '#454c5e'], ['#5c5266', '#2a2434'], ['#b8613f', '#6a2f1c'], ['#7a8aa0', '#38465a']];
    const NAMES = ['COLLINE', 'MONTAGNE', 'CITTA', 'CAVERNE', 'METEORE', 'BASE'];

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, fuel = 100, loop = 0, sx = 0, time = 0, deadT = 0, flashMsg = '', flashT = 0, nextExtra = 30000;
    let ship = { x: 70, y: H * 0.4, inv: 0 }, lasers = [], bombs = [], objs = [], parts = [], texts = [], touch = null, laserCd = 0, bombCd = 0, genTo = -1, meteorT = 0, lowBeep = 0, bPressed = false;
    const stars = Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.6, s: Math.random() * 1.5 + 0.4 }));

    const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const secOf = wx => ((Math.floor(wx / SEC) % NS) + NS) % NS;
    const tunnelW = wx => { const m = ((wx % LEN) + LEN) % LEN, s = Math.floor(m / SEC); if (s !== 3) return 0; const f = (m - 3 * SEC) / SEC; return ss(0.04, 0.16, f) * (1 - ss(0.86, 0.98, f)); };
    const groundY = wx => {
      const m = ((wx % LEN) + LEN) % LEN, u = m / SEC, i = Math.floor(u), f = u - i, a = AMP[i], b = AMP[(i + 1) % NS];
      const amp = a + (b - a) * ss(0.85, 1, f);
      return BASEY - tunnelW(wx) * 45 - amp * (0.55 * Math.sin(wx * 0.0045 + 1.3) + 0.35 * Math.sin(wx * 0.012 + 2.1) + 0.15 * Math.sin(wx * 0.031));
    };
    const ceilAt = wx => { const tw = tunnelW(wx); if (tw <= 0.01) return -999; return -60 + (groundY(wx) - (215 + 45 * Math.sin(wx * 0.009)) + 60) * tw; };

    const arp = (notes, step, type, vol) => notes.forEach((f, i) => setTimeout(() => api.beep(f, step * 1.4, type || 'triangle', vol || 0.04), i * step * 1000));
    const flash = s => { flashMsg = s; flashT = 1.8; };
    const addText = (x, y, s) => texts.push({ x, y, s: String(s), t: 0.9 });
    const boom = (x, y, c, n = 12) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 40 + Math.random() * 150; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.4 + Math.random() * 0.45, c }); } };
    const addScore = n => { score += n; while (score >= nextExtra) { lives = Math.min(6, lives + 1); nextExtra += 40000; flash('NAVE EXTRA'); arp([523, 659, 784, 1047], 0.09); } };

    // --- generazione dei bersagli per sezione ---
    const genSection = sa => {
      const s = ((sa % NS) + NS) % NS, x0 = sa * SEC; let seed = sa * 7919 + 13;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const put = (k, x, extra) => objs.push(Object.assign({ k, x, y: groundY(x), alive: true, st: 'idle', ph: rnd() * 6 }, extra || {}));
      const spread = (n, from, to) => Array.from({ length: n }, (_, i) => from + (to - from) * (i + 0.3 + rnd() * 0.4) / n);
      if (s === 0) { spread(6, 500, SEC - 200).forEach(x => put('missile', x0 + x)); spread(3, 700, SEC - 300).forEach(x => put('tank', x0 + x)); }
      else if (s === 1) { spread(9, 300, SEC - 200).forEach(x => put('missile', x0 + x)); spread(4, 600, SEC - 300).forEach(x => put('tank', x0 + x)); }
      else if (s === 2) { spread(11, 250, SEC - 200).forEach(x => put('bld', x0 + x, { h: 30 + rnd() * 40, w: 26 + rnd() * 10 })); spread(3, 500, SEC - 300).forEach(x => put('tank', x0 + x)); spread(5, 500, SEC - 200).forEach(x => objs.push({ k: 'ufo', x: x0 + x, y: H * (0.25 + rnd() * 0.25), y0: H * (0.25 + rnd() * 0.25), alive: true, st: 'idle', ph: rnd() * 6 })); }
      else if (s === 3) { spread(4, 500, SEC - 300).forEach(x => put('tank', x0 + x)); spread(6, 400, SEC - 300).forEach(x => put('missile', x0 + x)); }
      else if (s === 4) { spread(3, 500, SEC - 300).forEach(x => put('tank', x0 + x)); spread(5, 400, SEC - 300).forEach(x => put('missile', x0 + x)); }
      else { spread(2, 400, SEC - 900).forEach(x => put('tank', x0 + x)); put('base', x0 + SEC - 450); }
    };
    const ensureGen = () => { while (genTo * SEC < sx + W * 2.2) { genTo++; genSection(genTo); } };

    const respawn = () => {
      deadT = 0; ship.x = 70; ship.y = H * 0.4; ship.inv = 2; fuel = 100;
      lasers = []; bombs = []; meteorT = 1;
    };
    const newGame = () => {
      score = 0; lives = 3; loop = 0; sx = 0; fuel = 100; nextExtra = 30000; parts = []; texts = []; objs = []; genTo = -1;
      respawn(); ship.inv = 1; ensureGen(); state = 'play';
    };
    const endGame = () => { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } };
    const die = why => {
      if (ship.inv > 0 || deadT > 0) return;
      boom(sx + ship.x - sx, ship.y, '#ffd27f', 24); boom(ship.x, ship.y, '#ff6a3a', 16);
      api.haptic(50); api.beep(120, 0.5, 'sawtooth', 0.06); setTimeout(() => api.beep(70, 0.6, 'sawtooth', 0.05), 120);
      lives--; deadT = 1.7; if (why) flash(why);
    };
    const checkpoint = () => {
      const sa = Math.floor((sx + ship.x) / SEC); sx = sa * SEC;
      objs = objs.filter(o => o.x < sx); genTo = sa - 1; ensureGen();
    };

    const OBJ = { missile: [10, 30], tank: [22, 20], bld: [28, 50], base: [70, 70], ufo: [26, 12], meteor: [14, 14] };
    const box = o => { const d = OBJ[o.k], w = o.w || d[0], h = o.h || d[1]; return o.k === 'ufo' || o.k === 'meteor' ? [o.x - w / 2, o.y - h / 2, w, h] : [o.x - w / 2, o.y - h, w, h]; };
    const hitBox = (px, py, o, pad) => { const b = box(o); return px > b[0] - pad && px < b[0] + b[2] + pad && py > b[1] - pad && py < b[1] + b[3] + pad; };
    const killObj = (o, byBomb) => {
      o.alive = false;
      const pts = { missile: o.st === 'up' ? 80 : 50, tank: 150, ufo: 100, meteor: 100, bld: 100, base: 800 }[o.k] || 50;
      addScore(pts); addText(o.x - sx, o.y - 16, pts);
      const bx = box(o); boom(o.x - sx, bx[1] + bx[3] / 2, o.k === 'tank' ? '#ffae3a' : '#ffd27f', o.k === 'base' ? 40 : 14);
      api.haptic(14); api.beep(220, 0.1, 'sawtooth', 0.05); setTimeout(() => api.beep(140, 0.15, 'sawtooth', 0.04), 50);
      if (o.k === 'tank') { fuel = Math.min(100, fuel + 30); flash('PIENO DI CARBURANTE'); arp([660, 880], 0.07); }
      if (o.k === 'base') { addScore(5000); flash('MISSIONE COMPIUTA! +5000'); loop++; arp([523, 659, 784, 1047, 1319], 0.1, 'triangle', 0.05); }
    };

    const update = dt => {
      time += dt; flashT = Math.max(0, flashT - dt);
      stars.forEach(s => { s.x -= s.s * 8 * dt; if (s.x < 0) s.x = W; });
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }); parts = parts.filter(p => p.t > 0);
      texts.forEach(t => { t.y -= 22 * dt; t.t -= dt; }); texts = texts.filter(t => t.t > 0);
      if (state !== 'play') return;
      ship.inv = Math.max(0, ship.inv - dt); laserCd = Math.max(0, laserCd - dt); bombCd = Math.max(0, bombCd - dt);
      if (deadT > 0) { deadT -= dt; if (deadT <= 0) { if (lives <= 0) { endGame(); return; } checkpoint(); respawn(); } return; }
      const speed = Math.min(150, 72 + loop * 10);
      sx += speed * dt; ensureGen();
      fuel -= 4.2 * dt;
      if (fuel < 25) { lowBeep -= dt; if (lowBeep <= 0) { api.beep(880, 0.08, 'square', 0.025); lowBeep = 0.6; } }
      if (fuel <= 0) { fuel = 0; die('SENZA CARBURANTE!'); }

      // nave
      const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      ship.x += dx * 190 * dt; ship.y += dy * 190 * dt;
      if (touch) { ship.x += (touch.x - ship.x) * Math.min(1, dt * 9); ship.y += (touch.y - 38 - ship.y) * Math.min(1, dt * 9); }
      ship.x = Math.max(24, Math.min(W * 0.58, ship.x)); ship.y = Math.max(TOPH + 8, Math.min(H - 40, ship.y));
      const wx = sx + ship.x;
      // laser
      if ((touch || held.a) && laserCd <= 0 && lasers.length < 3) { lasers.push({ x: ship.x + 14, y: ship.y }); laserCd = 0.2; api.beep(1300, 0.025, 'square', 0.018); }
      // bombe: automatiche sopra i bersagli, oppure con B
      if (bombs.length < 1 && bombCd <= 0) {
        let drop = bPressed; bPressed = false;
        if (!drop && (touch || held.a)) drop = objs.some(o => o.alive && (o.k === 'tank' || o.k === 'bld' || o.k === 'base' || (o.k === 'missile' && o.st === 'idle')) && o.x - wx > 14 && o.x - wx < 120 && o.y - ship.y > 24);
        if (drop) { bombs.push({ x: wx, y: ship.y + 8, vx: speed + 30, vy: 20 }); bombCd = 0.5; api.beep(700, 0.18, 'sine', 0.03); }
      }
      // terreno
      for (const off of [-9, 0, 9]) {
        if (ship.y + 6 > groundY(wx + off)) { die(); break; }
        const c = ceilAt(wx + off); if (c > -900 && ship.y - 6 < c) { die(); break; }
      }
      // meteore
      if (secOf(sx + W) === 4) { meteorT -= dt; if (meteorT <= 0) { objs.push({ k: 'meteor', x: sx + W + 20 + Math.random() * 160, y: -20, vx: -50, vy: 150 + Math.random() * 70, alive: true, st: 'idle', ph: Math.random() * 6 }); meteorT = Math.max(0.5, 1.2 - loop * 0.15) * (0.6 + Math.random() * 0.8); } }

      for (const o of objs) {
        if (!o.alive) continue;
        o.ph += dt;
        if (o.k === 'missile') {
          if (o.st === 'idle' && o.x - wx < 230 && o.x - wx > -20 && Math.random() < dt * (0.9 + loop * 0.3)) { o.st = 'up'; o.v = 40; api.beep(260, 0.25, 'sawtooth', 0.025); }
          if (o.st === 'up') { o.v = Math.min(300, o.v + 220 * dt); o.y -= o.v * dt; const c = ceilAt(o.x); if (o.y < -40 || (c > -900 && o.y - 30 < c)) o.alive = false; }
        } else if (o.k === 'ufo') {
          o.x -= 35 * dt; o.y = o.y0 + Math.sin(o.ph * 3) * 45;
        } else if (o.k === 'meteor') {
          o.x += o.vx * dt; o.y += o.vy * dt; if (o.y > groundY(o.x) - 4) { o.alive = false; boom(o.x - sx, o.y, '#ffae3a', 8); }
        }
        if (o.alive && ship.inv <= 0 && hitBox(wx, ship.y, o, 6)) { die(); }
      }
      for (const l of lasers) {
        l.x += 560 * dt; const lw = sx + l.x;
        for (const o of objs) if (o.alive && hitBox(lw, l.y, o, 3)) { killObj(o); l.dead = true; break; }
      }
      lasers = lasers.filter(l => !l.dead && l.x < W + 20);
      for (const b of bombs) {
        b.vy += 560 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        for (const o of objs) if (o.alive && hitBox(b.x, b.y, o, 4)) { killObj(o, true); b.dead = true; break; }
        if (!b.dead && b.y > groundY(b.x)) { b.dead = true; boom(b.x - sx, b.y, '#ffd27f', 8); api.beep(180, 0.1, 'sawtooth', 0.04); }
        if (b.y > H) b.dead = true;
      }
      bombs = bombs.filter(b => !b.dead);
      objs = objs.filter(o => o.alive && o.x > sx - 120);
      if (ship.y > 0) void 0;
    };

    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(); return; }
        if (state === 'pause') { state = 'play'; return; }
        touch = { id: e.id, x: e.x, y: e.y };
      } else if (e.type === 'move' && touch && e.id === touch.id) { touch.x = e.x; touch.y = e.y; }
      else if (e.type === 'up' && touch && e.id === touch.id) touch = null;
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'over') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'select') { if (state !== 'title') newGame(); }
      else if (k === 'b' && state === 'play') bPressed = true;
    };

    // --- disegno ---
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#eef1ff'; g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = '#eef1ff'; g.fillRect(x, y, w, h); g.fillStyle = '#0b1020'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };
    const drawShip = (x, y, s) => {
      g.save(); g.translate(x, y); g.scale(s, s);
      const f = 6 + Math.sin(time * 40) * 2; g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(-12, -2); g.lineTo(-12 - f, 0); g.lineTo(-12, 2); g.fill();
      g.fillStyle = '#c9d3ea'; g.beginPath(); g.moveTo(16, 0); g.lineTo(2, -5); g.lineTo(-12, -4); g.lineTo(-12, 4); g.lineTo(2, 5); g.closePath(); g.fill();
      g.fillStyle = '#e5413b'; g.beginPath(); g.moveTo(-2, -4); g.lineTo(-13, -12); g.lineTo(-12, -3); g.fill(); g.beginPath(); g.moveTo(-2, 4); g.lineTo(-13, 12); g.lineTo(-12, 3); g.fill();
      const cg = g.createLinearGradient(0, -4, 0, 2); cg.addColorStop(0, '#bff3ff'); cg.addColorStop(1, '#2a76d0'); g.fillStyle = cg; g.beginPath(); g.ellipse(3, -1, 5, 3, 0, 0, TAU); g.fill();
      g.restore();
    };
    const drawObj = o => {
      const x = o.x - sx, y = o.y; if (x < -60 || x > W + 60) return;
      g.save(); g.translate(x, y);
      if (o.k === 'missile') {
        if (o.st === 'up') { g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(-3, 0); g.lineTo(0, 10 + Math.sin(time * 40) * 4); g.lineTo(3, 0); g.fill(); }
        const mg = g.createLinearGradient(-5, 0, 5, 0); mg.addColorStop(0, '#9aa3b8'); mg.addColorStop(0.5, '#f2f5fb'); mg.addColorStop(1, '#6a7388');
        g.fillStyle = mg; g.fillRect(-4, -22, 8, 22); g.fillStyle = '#e5413b'; g.beginPath(); g.moveTo(-4, -22); g.lineTo(0, -32); g.lineTo(4, -22); g.fill();
        g.fillStyle = '#e5413b'; g.beginPath(); g.moveTo(-4, -6); g.lineTo(-9, 0); g.lineTo(-4, 0); g.fill(); g.beginPath(); g.moveTo(4, -6); g.lineTo(9, 0); g.lineTo(4, 0); g.fill();
      } else if (o.k === 'tank') {
        const tg = g.createLinearGradient(-11, 0, 11, 0); tg.addColorStop(0, '#d9473f'); tg.addColorStop(0.5, '#ff8a6a'); tg.addColorStop(1, '#8a2018');
        g.fillStyle = tg; g.beginPath(); g.roundRect(-11, -20, 22, 20, 4); g.fill();
        g.fillStyle = '#fff'; g.fillRect(-11, -12, 22, 3); text('F', 0, -19, 9, 'center', '#fff');
      } else if (o.k === 'bld') {
        const w = o.w, h = o.h, bg = g.createLinearGradient(0, -h, 0, 0); bg.addColorStop(0, '#9aa7c2'); bg.addColorStop(1, '#4a5470');
        g.fillStyle = bg; g.fillRect(-w / 2, -h, w, h);
        g.fillStyle = '#ffe28a'; for (let r = 0; r < h / 9 - 1; r++) for (let c = 0; c < 3; c++) if ((r * 7 + c * 3 + (o.x | 0)) % 5 !== 0) g.fillRect(-w / 2 + 4 + c * (w - 8) / 3, -h + 5 + r * 9, 4, 5);
      } else if (o.k === 'ufo') {
        const ug = g.createLinearGradient(0, -6, 0, 6); ug.addColorStop(0, '#e8fbff'); ug.addColorStop(1, '#4a7ad0');
        g.fillStyle = ug; g.beginPath(); g.ellipse(0, 1, 14, 5, 0, 0, TAU); g.fill();
        g.fillStyle = '#9be8ff'; g.beginPath(); g.ellipse(0, -2, 7, 5, 0, Math.PI, 0); g.fill();
        g.fillStyle = Math.sin(time * 12 + o.ph) > 0 ? '#ffd23f' : '#e5413b'; g.fillRect(-9, 2, 3, 2); g.fillRect(-1, 3, 3, 2); g.fillRect(7, 2, 3, 2);
      } else if (o.k === 'meteor') {
        g.rotate(o.ph * 3); g.fillStyle = '#ff8a3a'; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill();
        const mg = g.createRadialGradient(-3, -3, 1, 0, 0, 9); mg.addColorStop(0, '#d9c2a8'); mg.addColorStop(1, '#6a4a34'); g.fillStyle = mg; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8, r = 7 + (i % 3); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
      } else if (o.k === 'base') {
        const bg = g.createLinearGradient(0, -70, 0, 0); bg.addColorStop(0, '#8fa0be'); bg.addColorStop(1, '#3a4660');
        g.fillStyle = bg; g.fillRect(-35, -40, 70, 40); g.fillRect(-22, -62, 44, 24); g.fillStyle = '#e5413b'; g.fillRect(-4, -78, 8, 18);
        g.fillStyle = Math.sin(time * 6) > 0 ? '#ffd23f' : '#ff6a3a'; g.beginPath(); g.arc(0, -32, 9, 0, TAU); g.fill(); g.fillStyle = '#ffe28a'; g.fillRect(-30, -14, 10, 6); g.fillRect(20, -14, 10, 6);
      }
      g.restore();
    };

    const render = () => {
      const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#05070f'); sky.addColorStop(0.6, '#142048'); sky.addColorStop(1, '#2a3a70');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      stars.forEach(s => { g.fillStyle = s.s > 1.1 ? '#eef1ff' : '#6a7aa8'; g.fillRect(s.x, s.y, s.s, s.s); });
      if (state === 'title') {
        text('CANYON', W / 2, H * 0.2, 44, 'center', '#e0a020'); text('RAID', W / 2, H * 0.2 + 46, 44, 'center');
        drawShip(W / 2, H * 0.5 + Math.sin(time * 2) * 6, 2);
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, H * 0.62, 16, 'center', '#f5d31c');
        text('RECORD ' + hi, W / 2, H * 0.62 + 30, 13, 'center');
        text('TRASCINA PER PILOTARE · LASER E BOMBE AUTOMATICI', W / 2, H * 0.62 + 56, 10, 'center', '#aab3d8');
        return;
      }
      // montagne lontane
      g.fillStyle = 'rgba(40,60,110,.55)'; g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W + 8; x += 8) { const wx = x + sx * 0.3; g.lineTo(x, H * 0.62 - 40 * Math.abs(Math.sin(wx * 0.006)) - 18 * Math.abs(Math.sin(wx * 0.017))); }
      g.lineTo(W + 8, H); g.closePath(); g.fill();
      // terreno e soffitto
      for (let x = 0; x < W + 6; x += 6) {
        const wx = sx + x, sec = secOf(wx), gy = groundY(wx), p = PAL[sec];
        const gg = g.createLinearGradient(0, gy, 0, H); gg.addColorStop(0, p[0]); gg.addColorStop(1, p[1]);
        g.fillStyle = gg; g.fillRect(x, gy, 6.5, H - gy + 1);
        g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(x, gy, 6.5, 2);
        const c = ceilAt(wx); if (c > -900) { g.fillStyle = p[1]; g.fillRect(x, 0, 6.5, c); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, c - 2, 6.5, 2); }
      }
      objs.forEach(drawObj);
      lasers.forEach(l => { g.fillStyle = '#bff3ff'; g.fillRect(l.x, l.y - 1.2, 18, 2.4); g.fillStyle = '#fff'; g.fillRect(l.x + 4, l.y - 0.5, 14, 1); });
      bombs.forEach(b => { g.save(); g.translate(b.x - sx, b.y); g.rotate(Math.atan2(b.vy, b.vx)); g.fillStyle = '#2a2f40'; g.beginPath(); g.ellipse(0, 0, 6, 3, 0, 0, TAU); g.fill(); g.fillStyle = '#e5413b'; g.fillRect(-7, -2, 3, 4); g.restore(); });
      if (deadT <= 0 && !(ship.inv > 0 && ((ship.inv * 10) | 0) % 2 === 0)) drawShip(ship.x, ship.y, 1);
      parts.forEach(p => { g.fillStyle = p.c; g.fillRect(p.x, p.y, 3, 3); });
      texts.forEach(t => text(t.s, t.x, t.y, 12, 'center', '#f5d31c'));
      // HUD
      g.fillStyle = 'rgba(5,7,15,.55)'; g.fillRect(0, 0, W, TOPH);
      text('PUNTI ' + String(score).padStart(6, '0'), 10, 6, 14); text('RECORD ' + Math.max(hi, score), W - 10, 8, 11, 'right', '#aab3d8');
      const cur = secOf(sx + ship.x);
      for (let i = 0; i < NS; i++) { g.fillStyle = i === cur ? '#e0a020' : i < cur ? '#4cc24a' : '#2a3358'; g.fillRect(10 + i * 26, 28, 22, 8); }
      text(NAMES[cur] + (loop ? ' · GIRO ' + (loop + 1) : ''), W - 10, 25, 10, 'right', '#e0a020');
      const fw = W - 110; g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(10, H - 24, fw + 4, 14); g.fillStyle = fuel < 25 ? '#e5413b' : '#ffd23f'; g.fillRect(12, H - 22, fw * fuel / 100, 10);
      text('CARBURANTE', 14, H - 21, 8, 'left', '#000');
      for (let i = 0; i < Math.max(0, lives - 1) && i < 5; i++) drawShip(W - 22 - i * 24, H - 17, 0.7);
      if (flashT > 0) text(flashMsg, W / 2, H * 0.3, 18, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    return {
      onPress: act, onPointer,
      onHide() { if (state === 'play') state = 'pause'; touch = null; },
      update, render,
      debug: { newGame, get state() { return state; }, get ship() { return ship; }, get objs() { return objs; }, get score() { return score; }, get lives() { return lives; }, get sx() { return sx; }, set sx(v) { sx = v; objs = objs.filter(o => o.x > v - 100); genTo = Math.floor(v / SEC) - 1; ensureGen(); }, get fuel() { return fuel; }, set fuel(v) { fuel = v; }, get loop() { return loop; } },
    };
  },
});

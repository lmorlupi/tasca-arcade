registerGame({
  id: 'canyon-raid',
  title: 'CANYON RAID',
  color: '#e0a020',
  blurb: 'Sorvola montagne, città e caverne fino alla base nemica. Laser in avanti, bombe verso il basso (partono da sole sopra i bersagli). Il carburante cala sempre: bombarda i serbatoi per fare il pieno. Evita missili, dischi volanti, meteore e il terreno. Trascina il dito per pilotare.',
  inputs: ['TRASCINA', 'LASER AUTO', 'BOMBE AUTO'],
  size: [360, 640],
  bg: '#000000',
  flexH: true,
  flexMin: 1.15,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const SEC = 2600, NS = 6, LEN = SEC * NS, TAU = Math.PI * 2;
    const AMP = [28, 95, 14, 40, 105, 10], BASEY = H * 0.80, TOPH = 44;
    // Colori dei quadri come nell'arcade: riempimento, puntini della trama, puntini rari, bordo luminoso.
    const PAL = [
      ['#6e2a10', '#c8661c', '#ffd23f', '#ffa030'], ['#34175e', '#7448c8', '#ff6ad0', '#c48aff'], ['#0c3e22', '#25a050', '#e8ff6a', '#6aff7a'],
      ['#0a2560', '#2a64d0', '#9be8ff', '#56c8ff'], ['#4e0c18', '#c8343a', '#ffb05a', '#ff7a4a'], ['#262a44', '#6474b0', '#ffe28a', '#dfe5ff'],
    ];
    const NAMES = ['COLLINE', 'MONTAGNE', 'CITTA', 'CAVERNE', 'METEORE', 'BASE'];
    const SHORT = ['1', '2', '3', '4', '5', 'B'];

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, fuel = 100, loop = 0, sx = 0, time = 0, deadT = 0, flashMsg = '', flashT = 0, nextExtra = 30000;
    let ship = { x: 70, y: H * 0.4, inv: 0, vx: 0, vy: 0, tilt: 0 }, lasers = [], bombs = [], objs = [], texts = [], pops = [], touch = null, laserCd = 0, bombCd = 0, genTo = -1, meteorT = 0, lowBeep = 0, bPressed = false;
    const STAR_C = ['#ffffff', '#ff5a5a', '#ffd23f', '#5ad0ff', '#c48aff', '#6aff7a'];
    const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: TOPH + Math.random() * (H * 0.72 - TOPH), d: Math.random(), c: STAR_C[(Math.random() * STAR_C.length) | 0], ph: Math.random() * TAU }));

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
    // Esplosione a pixel come nell'arcade (in coordinate del mondo, così scorre col terreno) più le particelle condivise.
    const boom = (x, y, c, n = 12) => { pops.push({ x: x + sx, y, t: 0, big: n >= 20 }); api.fx.burst(x, y, { n, color: c, speed: 190, life: 0.85, size: 3, drag: 0 }); };
    const addScore = n => { score += n; while (score >= nextExtra) { lives = Math.min(6, lives + 1); nextExtra += 40000; flash('NAVE EXTRA'); arp([523, 659, 784, 1047], 0.09); } };

    // --- generazione dei bersagli per sezione ---
    const genSection = sa => {
      const s = ((sa % NS) + NS) % NS, x0 = sa * SEC; let seed = sa * 7919 + 13;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const put = (k, x, extra) => objs.push(Object.assign({ k, x, y: groundY(x), alive: true, st: 'idle', ph: rnd() * 6 }, extra || {}));
      const spread = (n, from, to) => Array.from({ length: n }, (_, i) => from + (to - from) * (i + 0.3 + rnd() * 0.4) / n);
      if (s === 0) { spread(6, 500, SEC - 200).forEach(x => put('missile', x0 + x)); spread(3, 700, SEC - 300).forEach(x => put('tank', x0 + x)); }
      else if (s === 1) { spread(9, 300, SEC - 200).forEach(x => put('missile', x0 + x)); spread(4, 600, SEC - 300).forEach(x => put('tank', x0 + x)); }
      else if (s === 2) { spread(11, 250, SEC - 200).forEach(x => put('bld', x0 + x, { h: 30 + rnd() * 40, w: 26 + rnd() * 10, c: (rnd() * 3) | 0 })); spread(3, 500, SEC - 300).forEach(x => put('tank', x0 + x)); spread(5, 500, SEC - 200).forEach(x => objs.push({ k: 'ufo', x: x0 + x, y: H * (0.25 + rnd() * 0.25), y0: H * (0.25 + rnd() * 0.25), alive: true, st: 'idle', ph: rnd() * 6 })); }
      else if (s === 3) { spread(4, 500, SEC - 300).forEach(x => put('tank', x0 + x)); spread(6, 400, SEC - 300).forEach(x => put('missile', x0 + x)); }
      else if (s === 4) { spread(3, 500, SEC - 300).forEach(x => put('tank', x0 + x)); spread(5, 400, SEC - 300).forEach(x => put('missile', x0 + x)); }
      else { spread(2, 400, SEC - 900).forEach(x => put('tank', x0 + x)); put('base', x0 + SEC - 450); }
    };
    const ensureGen = () => { while (genTo * SEC < sx + W * 2.2) { genTo++; genSection(genTo); } };

    const respawn = () => {
      deadT = 0; ship.x = 70; ship.y = H * 0.4; ship.inv = 2; ship.vx = ship.vy = ship.tilt = 0; fuel = 100;
      lasers = []; bombs = []; meteorT = 1; if (touch) { touch.ox = ship.x - touch.x; touch.oy = ship.y - touch.y; }
    };
    const newGame = () => {
      score = 0; lives = 3; loop = 0; sx = 0; fuel = 100; nextExtra = 30000; api.fx.clear(); texts = []; pops = []; objs = []; genTo = -1;
      respawn(); ship.inv = 1; ensureGen(); state = 'play';
    };
    const endGame = () => { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } };
    const die = why => {
      if (ship.inv > 0 || deadT > 0) return;
      boom(ship.x, ship.y, '#ffd27f', 24); boom(ship.x, ship.y, '#ff6a3a', 16);
      api.haptic(50); api.beep(120, 0.5, 'sawtooth', 0.06); setTimeout(() => api.beep(70, 0.6, 'sawtooth', 0.05), 120);
      lives--; deadT = 1.7; if (why) flash(why);
      api.fx.shake(7, 0.45); api.fx.flash('#e5413b', 0.25, 0.4);
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
      if (o.k === 'bld') api.fx.shake(2.5, 0.15);
      if (o.k === 'tank') { fuel = Math.min(100, fuel + 30); flash('PIENO DI CARBURANTE'); arp([660, 880], 0.07); }
      if (o.k === 'base') { api.fx.shake(8, 0.6); api.fx.flash('#ffd27f', 0.3, 0.45); addScore(5000); flash('MISSIONE COMPIUTA! +5000'); loop++; arp([523, 659, 784, 1047, 1319], 0.1, 'triangle', 0.05); }
    };

    const XMIN = 24, XMAX = W * 0.58, YMIN = TOPH + 8, YMAX = H - 40;
    const update = dt => {
      time += dt; flashT = Math.max(0, flashT - dt);
      const scroll = state === 'play' && deadT <= 0 ? Math.min(150, 72 + loop * 10) : 30;
      stars.forEach(s => { s.x -= (4 + s.d * s.d * 26) * (scroll / 72) * dt; if (s.x < 0) s.x += W; });
      texts.forEach(t => { t.y -= 22 * dt; t.t -= dt; }); texts = texts.filter(t => t.t > 0);
      pops.forEach(p => { p.t += dt; }); pops = pops.filter(p => p.t < (p.big ? 0.7 : 0.45));
      if (state !== 'play') return;
      ship.inv = Math.max(0, ship.inv - dt); laserCd = Math.max(0, laserCd - dt); bombCd = Math.max(0, bombCd - dt);
      if (deadT > 0) { deadT -= dt; if (deadT <= 0) { if (lives <= 0) { endGame(); return; } checkpoint(); respawn(); } return; }
      const speed = scroll;
      sx += speed * dt; ensureGen();
      fuel -= 4.2 * dt;
      if (fuel < 25) { lowBeep -= dt; if (lowBeep <= 0) { api.beep(880, 0.08, 'square', 0.025); lowBeep = 0.6; } }
      if (fuel <= 0) { fuel = 0; die('SENZA CARBURANTE!'); }

      // nave: il dito la sposta di quanto si muove lui (senza coprirla), i tasti con una piccola accelerazione
      const px = ship.x, py = ship.y;
      if (touch) {
        const tx = touch.x + touch.ox, ty = touch.y + touch.oy;
        const cx = Math.max(XMIN, Math.min(XMAX, tx)), cy = Math.max(YMIN, Math.min(YMAX, ty));
        if (cx !== tx) touch.ox = cx - touch.x; if (cy !== ty) touch.oy = cy - touch.y;   // al bordo non resta "gioco" morto
        const k = 1 - Math.exp(-dt * 40);
        ship.x += (cx - ship.x) * k; ship.y += (cy - ship.y) * k;
      } else {
        const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.up ? 1 : 0), k = 1 - Math.exp(-dt * 16);
        ship.vx += (dx * 200 - ship.vx) * k; ship.vy += (dy * 200 - ship.vy) * k;
        ship.x += ship.vx * dt; ship.y += ship.vy * dt;
      }
      ship.x = Math.max(XMIN, Math.min(XMAX, ship.x)); ship.y = Math.max(YMIN, Math.min(YMAX, ship.y));
      ship.tilt += (Math.max(-0.3, Math.min(0.3, (ship.y - py) / dt * 0.0016)) - ship.tilt) * (1 - Math.exp(-dt * 12));
      if (touch) { ship.vx = (ship.x - px) / dt; ship.vy = (ship.y - py) / dt; }
      const wx = sx + ship.x;
      // laser
      if ((touch || held.a) && laserCd <= 0 && lasers.length < 3) { lasers.push({ x: ship.x + 16, y: ship.y + 1 }); laserCd = 0.2; api.beep(1300, 0.025, 'square', 0.018); }
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
    };

    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') newGame();
        else if (state === 'pause') state = 'play';
        touch = { id: e.id, x: e.x, y: e.y, ox: ship.x - e.x, oy: ship.y - e.y };
      } else if (e.type === 'move' && touch && e.id === touch.id) { touch.x = e.x; touch.y = e.y; }
      else if (e.type === 'up' && touch && e.id === touch.id) { touch = null; ship.vx = ship.vy = 0; }
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'over') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'select') { if (state !== 'title') newGame(); }
      else if (k === 'b' && state === 'play') bPressed = true;
    };

    // --- grafica a pixel come nell'arcade ---
    // Ogni sprite è una griglia di lettere (una per colore) disegnata una volta su un canvas nascosto molto grande:
    // poi si stampa con drawImage, nitida anche sugli schermi Retina e senza ricalcolare nulla a ogni fotogramma.
    const SC = 10, P = 2;   // pixel del canvas nascosto per pixel dello sprite; unità di gioco per pixel dello sprite
    const COL = { W: '#ffffff', w: '#c8d0e8', B: '#2a64ff', b: '#9be8ff', R: '#ff2a2a', r: '#a01818', Y: '#ffd23f', O: '#ff8a1a', G: '#8890a8', g: '#4a5068', M: '#e0247a', m: '#8a1048', P: '#ff9ad8', C: '#5ad0ff', K: '#101018', L: '#6aff7a' };
    const sprite = rows => {
      const c = document.createElement('canvas'); c.width = rows[0].length * SC; c.height = rows.length * SC;
      const x = c.getContext('2d');
      rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (COL[r[i]]) { x.fillStyle = COL[r[i]]; x.fillRect(i * SC, j * SC, SC, SC); } });
      return c;
    };
    const SPR = {
      ship: sprite([
        '..RR............',
        '..RRR...........',
        '.wRRRWW.........',
        'OYwWWWWWWbbB....',
        'YOwWWWWWWWBBWWW.',
        'OYwWWWWWWWWWWWWW',
        '.wRRRWWWWWWWWW..',
        '..RRR...........',
        '..RR............',
      ]),
      rocket: sprite([
        '..R..', '.RRR.', '.RWR.', '.YYY.', '.YWY.', '.YYY.', '.YRY.', '.YYY.', '.YYY.', '.YRY.', '.YYY.', 'RYYYR', 'RYYYR', 'R.G.R', 'R...R',
      ]),
      tank: sprite([
        '....GGG....', '..MMMMMMM..', '.MPPPPPPPM.', 'MMMMMMMMMMM', 'MMMMMMMMMMM', 'MMMMMMMMMMM', 'MMMMMMMMMMM', '.MmmmmmmmM.', '..MMMMMMM..', '.GG.....GG.',
      ]),
      ufoA: sprite(['....bbbbb....', '..bbWWWWWbb..', 'BBBBBBBBBBBBB', 'RBYBRBYBRBYBR', '.BBBBBBBBBBB.', '...B.....B...']),
      ufoB: sprite(['....bbbbb....', '..bbWWWWWbb..', 'BBBBBBBBBBBBB', 'YBRBYBRBYBRBY', '.BBBBBBBBBBB.', '...B.....B...']),
      meteor: sprite(['..OOO..', '.OYYYO.', 'OYWWYYO', 'OYWYYRO', 'OYYYRRO', '.ORRRO.', '..OOO..']),
      bomb: sprite(['.KKK.', 'KGGGK', 'KGWGK', 'KGGGK', '.KKK.']),
    };
    const stamp = (s, x, y, ax, ay) => { const w = s.width / SC * P, h = s.height / SC * P; g.drawImage(s, x - w * ax, y - h * ay, w, h); };

    // Trama del terreno: una piastrella di 32 unità per quadro, ripetuta e agganciata al mondo, così scorre col terreno.
    const TILE = 32, TR = 8;
    const pats = PAL.map(p => {
      const c = document.createElement('canvas'); c.width = c.height = TILE * TR; const x = c.getContext('2d');
      x.fillStyle = p[0]; x.fillRect(0, 0, c.width, c.height);
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const h = (i * 37 + j * 91) % 11;
        if ((i + (j & 1) * 2) % 4 === 0) { x.fillStyle = h < 2 ? p[2] : p[1]; x.fillRect(i * 4 * TR, j * 4 * TR, 2 * TR, 2 * TR); }
        else if (h === 5) { x.fillStyle = p[1]; x.fillRect((i * 4 + 2) * TR, (j * 4 + 2) * TR, TR, TR); }
      }
      return g.createPattern(c, 'repeat');
    });
    const sky = (() => { const s = g.createLinearGradient(0, 0, 0, H); s.addColorStop(0, '#000000'); s.addColorStop(0.75, '#02030c'); s.addColorStop(1, '#0a0820'); return s; })();

    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#eef1ff'; g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 18, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = '#ff2a2a'; g.fillRect(x, y, w, h); g.fillStyle = '#ffd23f'; g.fillRect(x + 3, y + 3, w - 6, h - 6); g.fillStyle = '#000'; g.fillRect(x + 6, y + 6, w - 12, h - 12);
      rows.forEach((t, i) => text(t, W / 2, y + 13 + i * 26, 18, 'center', i ? '#ffffff' : '#ffd23f'));
    };
    const drawShip = (x, y, s, tilt) => {
      g.save(); g.translate(x, y); if (tilt) g.rotate(tilt); g.scale(s, s);
      // fiamma del reattore a pixel che tremola
      const f = ((time * 30) | 0) % 3;
      g.fillStyle = f ? '#ffd23f' : '#ff8a1a'; g.fillRect(-16 - 4 - f * 2, -1, 4 + f * 2, 4);
      g.fillStyle = '#ff2a2a'; g.fillRect(-16 - 8 - f * 3, 0, 4, 2);
      stamp(SPR.ship, 0, 0, 0.5, 0.5);
      g.restore();
    };

    const drawTerrain = () => {
      const S = 4, a = Math.floor(sx / S) * S, n = Math.ceil((W + S) / S) + 1;
      const xs = [], gy = [], cy = [], sc = [];
      for (let i = 0; i < n; i++) {
        const wx = a + i * S; xs.push(wx - sx); sc.push(secOf(wx));
        gy.push(Math.round(groundY(wx) / 2) * 2); const c = ceilAt(wx); cy.push(c > -900 ? Math.round(c / 2) * 2 : -1);
      }
      const off = -(((sx % TILE) + TILE) % TILE);
      for (let i0 = 0; i0 < n;) {
        let i1 = i0; while (i1 + 1 < n && sc[i1 + 1] === sc[i0]) i1++;
        const s = sc[i0], p = PAL[s], pat = pats[s];
        if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(off, 0).scale(1 / TR));
        // suolo
        const top = new Path2D(); top.moveTo(xs[i0], gy[i0]);
        for (let i = i0; i <= i1; i++) { top.lineTo(xs[i], gy[i]); top.lineTo(xs[i] + S, gy[i]); }
        const fill = new Path2D(top); fill.lineTo(xs[i1] + S, H + 2); fill.lineTo(xs[i0], H + 2); fill.closePath();
        g.fillStyle = pat; g.fill(fill);
        g.strokeStyle = p[3]; g.lineWidth = 2; g.lineJoin = 'miter'; g.stroke(top);
        // soffitto delle caverne
        for (let j = i0; j <= i1;) {
          if (cy[j] < 0) { j++; continue; }
          let j1 = j; while (j1 + 1 <= i1 && cy[j1 + 1] >= 0) j1++;
          const edge = new Path2D(); edge.moveTo(xs[j], cy[j]);
          for (let i = j; i <= j1; i++) { edge.lineTo(xs[i], cy[i]); edge.lineTo(xs[i] + S, cy[i]); }
          const roof = new Path2D(edge); roof.lineTo(xs[j1] + S, -2); roof.lineTo(xs[j], -2); roof.closePath();
          g.fillStyle = pat; g.fill(roof); g.strokeStyle = p[3]; g.stroke(edge);
          j = j1 + 1;
        }
        i0 = i1 + 1;
      }
    };
    const BLD = [['#2a64ff', '#9be8ff'], ['#e0247a', '#ff9ad8'], ['#25a050', '#e8ff6a']];
    const drawBld = o => {
      const w = Math.round(o.w / 2) * 2, h = Math.round(o.h / 2) * 2, c = BLD[o.c || 0];
      // palazzo a blocchi impilati, con il bordo chiaro e le finestre accese
      g.fillStyle = '#000'; g.fillRect(-w / 2 - 2, -h - 2, w + 4, h + 2);
      g.fillStyle = c[0]; g.fillRect(-w / 2, -h, w, h);
      g.fillStyle = c[1]; g.fillRect(-w / 2, -h, w, 2); g.fillRect(-w / 2, -h, 2, h);
      for (let y = -h + 8; y < -2; y += 8) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(-w / 2, y, w, 2); }
      for (let r = 0; r < h / 8 - 1; r++) for (let k = 0; k < 3; k++) {
        const on = (r * 7 + k * 3 + (o.x | 0)) % 5 !== 0;
        g.fillStyle = on ? '#ffd23f' : '#101018'; g.fillRect(-w / 2 + 4 + k * Math.floor((w - 6) / 3), -h + 4 + r * 8, 4, 4);
      }
      g.fillStyle = c[1]; g.fillRect(-2, -h - 6, 2, 6); if (((time * 3 + o.ph) | 0) % 2) { g.fillStyle = '#ff2a2a'; g.fillRect(-3, -h - 8, 4, 2); }
    };
    const drawBase = () => {
      const blink = ((time * 4) | 0) % 2;
      g.fillStyle = '#000'; g.fillRect(-37, -44, 74, 44); g.fillRect(-24, -66, 48, 26);
      g.fillStyle = '#6474b0'; g.fillRect(-35, -42, 70, 42); g.fillStyle = '#9aa8d8'; g.fillRect(-22, -64, 44, 24);
      g.fillStyle = '#dfe5ff'; g.fillRect(-35, -42, 70, 2); g.fillRect(-22, -64, 44, 2);
      for (let i = 0; i < 6; i++) { g.fillStyle = '#262a44'; g.fillRect(-32 + i * 11, -30, 8, 8); g.fillStyle = blink ^ (i & 1) ? '#ffd23f' : '#ff8a1a'; g.fillRect(-30 + i * 11, -28, 4, 4); }
      g.fillStyle = '#ff2a2a'; g.fillRect(-4, -78, 8, 14); g.fillStyle = blink ? '#ffd23f' : '#ff2a2a'; g.fillRect(-6, -82, 12, 4);
      g.fillStyle = blink ? '#5ad0ff' : '#2a64ff'; g.fillRect(-14, -56, 28, 8);
      text('BASE', 0, -14, 10, 'center', '#ffffff');
    };
    const drawObj = o => {
      const x = o.x - sx, y = o.y; if (x < -60 || x > W + 60) return;
      g.save(); g.translate(x, y);
      if (o.k === 'missile') {
        if (o.st === 'up') { const f = ((time * 30 + o.ph) | 0) % 3; g.fillStyle = f ? '#ffd23f' : '#ff8a1a'; g.fillRect(-2, 0, 4, 6 + f * 3); g.fillStyle = '#ff2a2a'; g.fillRect(-1, 6 + f * 3, 2, 4); }
        stamp(SPR.rocket, 0, 0, 0.5, 1);
      } else if (o.k === 'tank') {
        stamp(SPR.tank, 0, 0, 0.5, 1);
        g.font = 'bold 7px ui-monospace, Menlo, Consolas, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#ffffff'; g.fillText('FUEL', 0, -9);
      } else if (o.k === 'bld') drawBld(o);
      else if (o.k === 'ufo') stamp(((time * 8 + o.ph) | 0) % 2 ? SPR.ufoA : SPR.ufoB, 0, 0, 0.5, 0.5);
      else if (o.k === 'meteor') {
        const d = Math.hypot(o.vx, o.vy), ux = -o.vx / d, uy = -o.vy / d;
        for (let i = 1; i <= 5; i++) { g.globalAlpha = 0.75 - i * 0.13; g.fillStyle = i < 3 ? '#ffd23f' : '#ff2a2a'; const z = 8 - i; g.fillRect(ux * i * 6 - z / 2, uy * i * 6 - z / 2, z, z); }
        g.globalAlpha = 1; stamp(SPR.meteor, 0, 0, 0.5, 0.5);
      } else if (o.k === 'base') drawBase();
      g.restore();
    };
    // esplosione a pixel: anello di quadratini che si allarga, bianco → giallo → rosso
    const POP = ['#ffffff', '#ffd23f', '#ff8a1a', '#ff2a2a'];
    const drawPop = p => {
      const x = p.x - sx, life = p.big ? 0.7 : 0.45, f = p.t / life, r = (p.big ? 34 : 18) * Math.sqrt(f), n = p.big ? 12 : 8, z = Math.max(2, Math.round((1 - f) * (p.big ? 8 : 6) / 2) * 2);
      g.fillStyle = POP[Math.min(3, (f * 4) | 0)];
      for (let i = 0; i < n; i++) { const a = i * TAU / n + (i & 1) * 0.3, rr = r * (i & 1 ? 0.7 : 1); g.fillRect(x + Math.cos(a) * rr - z / 2, p.y + Math.sin(a) * rr - z / 2, z, z); }
      if (f < 0.35) { g.fillStyle = '#ffffff'; const c = (p.big ? 10 : 6) * (1 - f * 2); g.fillRect(x - c / 2, p.y - c / 2, c, c); }
    };

    const drawStars = () => {
      for (const s of stars) {
        if (Math.sin(time * (1.5 + s.d * 3) + s.ph) < -0.55) continue;   // le stelle si accendono e si spengono
        g.fillStyle = s.c; const z = s.d > 0.8 ? 2 : 1.5; g.fillRect(s.x, s.y, z, z);
      }
    };
    const hudTop = () => {
      g.fillStyle = '#000'; g.fillRect(0, 0, W, TOPH);
      text('1UP', 12, 4, 11, 'left', '#ff2a2a'); text(String(score).padStart(6, '0'), 12, 16, 14, 'left', '#ffffff');
      text('HIGH SCORE', W - 12, 4, 11, 'right', '#ff2a2a'); text(String(Math.max(hi, score)).padStart(6, '0'), W - 12, 16, 14, 'right', '#ffffff');
    };

    const render = () => {
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      drawStars();
      if (state === 'title') {
        hudTop();
        text('CANYON', W / 2, H * 0.14, 48, 'center', '#ff2a2a'); text('CANYON', W / 2 - 2, H * 0.14 - 2, 48, 'center', '#ffd23f');
        text('RAID', W / 2, H * 0.14 + 50, 48, 'center', '#2a64ff'); text('RAID', W / 2 - 2, H * 0.14 + 48, 48, 'center', '#ffffff');
        drawShip(W / 2, H * 0.37 + Math.sin(time * 2) * 6, 2);
        // tabella dei punti, come nella schermata d'attesa dell'arcade
        const ty = H * 0.46, rows = [[SPR.rocket, '50 · 80 IN VOLO'], [SPR.ufoA, '100'], [SPR.meteor, '100'], [SPR.tank, '150 + CARBURANTE'], [null, '800 + 5000']];
        text('- TABELLA PUNTI -', W / 2, ty, 13, 'center', '#5ad0ff');
        rows.forEach((r, i) => {
          const y = ty + 34 + i * 30;
          if (r[0]) stamp(r[0], W / 2 - 74, y, 0.5, 0.5); else text('BASE', W / 2 - 74, y - 6, 10, 'center', '#dfe5ff');
          text('...', W / 2 - 50, y - 7, 12, 'left', '#6474b0'); text(r[1], W / 2 - 22, y - 7, 12, 'left', '#ffffff');
        });
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, H * 0.8, 16, 'center', '#ffd23f');
        text('TRASCINA PER PILOTARE · LASER E BOMBE AUTOMATICI', W / 2, H * 0.8 + 28, 10, 'center', '#c48aff');
        return;
      }
      drawTerrain();
      objs.forEach(drawObj);
      pops.forEach(drawPop);
      lasers.forEach(l => { g.fillStyle = '#ffd23f'; g.fillRect(l.x, l.y - 2, 14, 4); g.fillStyle = '#ffffff'; g.fillRect(l.x + 4, l.y - 1, 10, 2); });
      bombs.forEach(b => stamp(SPR.bomb, b.x - sx, b.y, 0.5, 0.5));
      if (deadT <= 0 && !(ship.inv > 0 && ((ship.inv * 10) | 0) % 2 === 0)) drawShip(ship.x, ship.y, 1, ship.tilt);
      texts.forEach(t => text(t.s, t.x, t.y, 12, 'center', '#ffffff'));
      // HUD in alto: punti e avanzamento nei sei quadri
      hudTop();
      const cur = secOf(sx + ship.x), bw = 26, bx0 = W / 2 - (NS * bw) / 2;
      for (let i = 0; i < NS; i++) {
        g.fillStyle = i === cur ? PAL[i][3] : i < cur ? PAL[i][1] : '#1a1d30'; g.fillRect(bx0 + i * bw + 1, 6, bw - 2, 12);
        text(SHORT[i], bx0 + i * bw + bw / 2, 7, 10, 'center', i <= cur ? '#000' : '#4a5068');
      }
      text(NAMES[cur] + (loop ? ' · GIRO ' + (loop + 1) : ''), W / 2, 24, 10, 'center', PAL[cur][3]);
      g.fillStyle = PAL[cur][3]; g.fillRect(0, TOPH - 2, W, 2);
      // HUD in basso: carburante a tacche e navi di riserva
      g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, H - 30, W, 30);
      text('FUEL', 10, H - 22, 12, 'left', '#ff2a2a');
      const seg = 20, segW = (W - 150) / seg, on = Math.ceil(fuel / 100 * seg), low = fuel < 25 && ((time * 4) | 0) % 2;
      for (let i = 0; i < seg; i++) { g.fillStyle = i >= on ? '#1a1d30' : low ? '#ff2a2a' : i < seg * 0.25 ? '#ff8a1a' : i < seg * 0.6 ? '#ffd23f' : '#6aff7a'; g.fillRect(48 + i * segW, H - 22, segW - 2, 12); }
      for (let i = 0; i < Math.max(0, lives - 1) && i < 4; i++) drawShip(W - 20 - i * 22, H - 16, 0.6);
      if (flashT > 0) { text(flashMsg, W / 2 + 2, H * 0.3 + 2, 18, 'center', '#ff2a2a'); text(flashMsg, W / 2, H * 0.3, 18, 'center', '#ffd23f'); }
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

registerGame({
  id: 'galaxy-strike',
  title: 'GALAXY STRIKE',
  color: '#3d5fe0',
  blurb: 'Gli alieni entrano a ondate, si mettono in formazione e si buttano in picchiata. I Boss verdi ti catturano la nave col raggio traente: abbattili mentre scendono per riaverla e avere due navi affiancate. Ogni tanto c\'è un quadro bonus senza spari nemici. Trascina il dito: spara da sola.',
  inputs: ['TRASCINA', 'AUTO-FUOCO', 'VIBRAZIONE'],
  size: [360, 640],
  bg: '#070b18',
  flexH: true,
  flexMin: 1.15,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const SHIP_Y = H - 62;
    const DX = 27, DY = 27, TOP = 78;
    const TAU = Math.PI * 2, HP = Math.PI / 2;
    const PAL = ['#070b18', '#1f2744', '#5a6aa0', '#eef1ff'];

    // Sprite 8x8 a due fotogrammi (disegno originale): 0 ape, 1 farfalla, 2 boss.
    const SPR = [
      [['..#..#..', '.#.##.#.', '########', '#.####.#', '########', '.#.##.#.', '#..##..#', '...##...'],
       ['..#..#..', '.#.##.#.', '########', '#.####.#', '########', '..#..#..', '.#.##.#.', '#..##..#']],
      [['#..##..#', '##.##.##', '########', '.######.', '..####..', '.#.##.#.', '#......#', '........'],
       ['#..##..#', '##.##.##', '########', '.######.', '..####..', '..#..#..', '.#....#.', '#......#']],
      [['.######.', '########', '##.##.##', '########', '.##..##.', '#.####.#', '#......#', '.#....#.'],
       ['.######.', '########', '##.##.##', '########', '.##..##.', '#.####.#', '.#....#.', '#......#']],
    ];
    const COLOR = [['#f5d31c'], ['#e5413b'], ['#4cc24a', '#a655b8']];
    const MAXHP = [1, 1, 2];
    const bmp = (rows, x, y, px, color) => Art.bmpGlow(g, rows, x, y, px, color);
    const ATT = new Set(['dive', 'escort', 'beamIn', 'beam', 'back']);

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, reserve = 2, stage = 1, time = 0, nextExtra = 20000;
    let ship, shots, enemies, ebullets, parts, texts, rescue, capt;
    let phase = 'intro', phaseT = 0, et = 0, attackT = 1, challenge = false, chHits = 0, chTotal = 0;
    let deadT = 0, finalDeath = false, touch = null, cd = 0, flashMsg = '', flashT = 0, beamSnd = 0, resultLines = [];
    let fired = 0, hitsTotal = 0, sway = 0, breath = 0;
    const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.8 + .4 }));

    const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
    const vDive = () => Math.min(340, 210 + stage * 8);
    const maxAtt = () => Math.min(2 + (stage >> 1), 7);
    const bz = (x0, y0, cx, cy, x1, y1, u) => {
      const m = 1 - u;
      return [m * m * x0 + 2 * m * u * cx + u * u * x1, m * m * y0 + 2 * m * u * cy + u * u * y1,
        2 * m * (cx - x0) + 2 * u * (x1 - cx), 2 * m * (cy - y0) + 2 * u * (y1 - cy)];
    };

    // Suoni (solo oscillatori, originali)
    const arp = (notes, step, type, vol) => notes.forEach((f, i) => setTimeout(() => api.beep(f, step * 1.4, type || 'square', vol || 0.04), i * step * 1000));
    const sfx = {
      shot: () => api.beep(1000, 0.03, 'square', 0.02),
      hit: () => api.beep(320, 0.05, 'square', 0.04),
      boom: () => { api.beep(190, 0.14, 'sawtooth', 0.05); setTimeout(() => api.beep(110, 0.2, 'sawtooth', 0.04), 60); },
      ship: () => { api.beep(120, 0.5, 'sawtooth', 0.06); setTimeout(() => api.beep(70, 0.5, 'sawtooth', 0.05), 120); },
    };

    const flash = s => { flashMsg = s; flashT = 1.6; };
    const addText = (x, y, s) => texts.push({ x, y, s: String(s), t: 0.9 });
    const boom = (x, y, color, n = 10) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 40 + Math.random() * 140; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.4 + Math.random() * 0.4, c: color }); } };
    const addScore = n => {
      score += n;
      while (score >= nextExtra) {
        reserve = Math.min(reserve + 1, 6); nextExtra = nextExtra === 20000 ? 70000 : nextExtra + 70000;
        flash('NAVE EXTRA'); arp([523, 659, 784, 1047], 0.09, 'triangle', 0.05);
      }
    };

    // Formazione: 10 colonne, 5 righe (4 boss, 16 farfalle, 20 api).
    const slotOf = e => {
      const br = 1 + 0.09 * breath;
      return { x: W / 2 + sway + (e.col - 4.5) * DX * br, y: TOP + e.row * DY * (1 + 0.04 * breath) };
    };
    const mk = (type, col, row, gi, i) => ({ type, col, row, gi, hp: MAXHP[type], state: 'wait', x: 0, y: -40, th: HP, v: 250, delay: 0.15 + gi * 2.5 + i * 0.13, sc: [], si: 0, st: 0 });

    const buildFormation = () => {
      const G = [[], [], [], [], []];
      const put = (gi, type, col, row) => G[gi].push([type, col, row]);
      [3, 4, 5, 6].forEach(c => { put(0, 2, c, 0); put(0, 1, c, 1); });
      for (let c = 1; c <= 8; c++) put(1, 1, c, 2);
      [1, 2, 7, 8].forEach(c => put(2, 1, c, 1)); [3, 4, 5, 6].forEach(c => put(2, 0, c, 3));
      [0, 1, 2, 7, 8, 9].forEach(c => put(3, 0, c, 3)); [4, 5].forEach(c => put(3, 0, c, 4));
      [0, 1, 2, 3, 6, 7, 8, 9].forEach(c => put(4, 0, c, 4));
      G.forEach((arr, gi) => arr.forEach((m, i) => enemies.push(mk(m[0], m[1], m[2], gi, i))));
    };

    // Quadro bonus: 5 gruppi da 8 che attraversano lo schermo senza sparare.
    const CH = [
      t => ({ x: W / 2 + W * 0.36 * Math.sin(1.7 * t), y: -20 + 150 * t }),
      t => ({ x: W / 2 - W * 0.36 * Math.sin(1.7 * t), y: -20 + 150 * t }),
      t => ({ x: -20 + 170 * t, y: H * 0.30 + H * 0.17 * Math.sin(1.9 * t) }),
      t => ({ x: W + 20 - 170 * t, y: H * 0.30 + H * 0.17 * Math.sin(1.9 * t) }),
      t => ({ x: W / 2 + W * 0.30 * Math.sin(2.6 * t), y: -20 + 110 * t + H * 0.10 * (1 - Math.cos(2.6 * t)) }),
    ];
    const buildChallenge = () => {
      const types = [0, 1, 0, 1, 0];
      for (let gi = 0; gi < 5; gi++) for (let i = 0; i < 8; i++) {
        const e = mk(types[gi], 0, 0, gi, i); e.delay = 0.2 + gi * 2.6 + i * 0.2; e.t = 0; enemies.push(e);
      }
      chTotal = 40;
    };

    const spawnStage = () => {
      enemies = []; ebullets = []; shots = []; rescue = null; capt = null;
      challenge = stage % 4 === 3; chHits = 0; chTotal = 0; resultLines = [];
      phase = 'intro'; phaseT = 2.2; et = 0;
      if (challenge) buildChallenge(); else buildFormation();
      arp([523, 659, 784, 1047], 0.1, 'square', 0.03);
    };
    const respawn = () => { deadT = 0; ship.x = W / 2; ship.inv = 1.6; ship.dual = false; };
    const newGame = () => {
      score = 0; reserve = 2; stage = 1; nextExtra = 20000; fired = 0; hitsTotal = 0;
      parts = []; texts = []; deadT = 0; finalDeath = false; cd = 0; capt = null; rescue = null;
      ship = { x: W / 2, inv: 0, dual: false };
      spawnStage(); state = 'play';
    };
    const endGame = () => {
      state = 'over';
      if (score > hi) { hi = score; api.store.set('hi', hi); }
    };

    const hitShip = hx => {
      if (ship.inv > 0 || deadT > 0 || capt) return;
      if (ship.dual) {
        ship.dual = false; ship.inv = 1.4;
        boom(hx > ship.x ? ship.x + 13 : ship.x - 13, SHIP_Y, '#eef1ff', 16); api.haptic(40); sfx.ship();
        ebullets = []; return;
      }
      boom(ship.x, SHIP_Y, '#eef1ff', 22); api.haptic(50); sfx.ship(); ebullets = [];
      if (reserve > 0) { reserve--; finalDeath = false; } else finalDeath = true;
      deadT = 1.6;
    };

    const aimShot = e => {
      if (ebullets.length >= 3 + Math.min(4, stage)) return;
      const dx = ship.x - e.x, dy = SHIP_Y - e.y, d = Math.hypot(dx, dy) || 1, sp = Math.min(250, 150 + stage * 7);
      ebullets.push({ x: e.x, y: e.y + 8, vx: dx / d * sp, vy: Math.max(60, dy / d * sp) });
    };

    // --- movimenti dei nemici ---
    const turtle = (e, dt) => {
      let left = dt;
      while (left > 1e-9 && e.si < e.sc.length) {
        const st = e.sc[e.si], take = Math.min(left, st[0] - e.st);
        e.th += st[1] * take; e.x += Math.cos(e.th) * e.v * take; e.y += Math.sin(e.th) * e.v * take;
        e.st += take; left -= take;
        if (e.st >= st[0] - 1e-9) { e.si++; e.st = 0; }
      }
      return left;
    };
    const startEntry = e => {
      const gi = e.gi, s = gi % 2 === 0 ? -1 : 1, side = gi === 2 || gi === 3;
      e.v = Math.min(330, 250 + stage * 4);
      if (side) {
        e.x = s < 0 ? -18 : W + 18; e.y = H * 0.30; e.th = s < 0 ? 0.35 : Math.PI - 0.35;
        e.sc = [[0.55, 0], [0.6, s * 3.2], [TAU / 5.5, -s * 5.5]];
      } else {
        e.x = W / 2 + s * (gi === 4 ? W * 0.12 : W * 0.30); e.y = -18; e.th = HP;
        e.sc = [[0.7, 0], [0.87, s * 3.6], [TAU / 5.5, -s * 5.5]];
      }
      e.si = 0; e.st = 0; e.state = 'enter';
    };
    const startHome = e => {
      const s = slotOf(e), d = Math.hypot(s.x - e.x, s.y - e.y) || 1;
      e.h = { x0: e.x, y0: e.y, cx: e.x + Math.cos(e.th) * d * 0.45, cy: e.y + Math.sin(e.th) * d * 0.45, t: 0, T: Math.max(0.45, d * 1.15 / (e.v || 250)) };
      e.state = 'home';
    };
    const launchDive = e => {
      const k = e.x < W / 2 ? 1 : -1;
      e.v = vDive(); e.th = HP; e.si = 0; e.st = 0; e.shotsLeft = stage < 2 ? 1 : stage < 5 ? 2 : 3; e.fireT = 0.35 + Math.random() * 0.3;
      e.sc = e.type === 0 ? [[0.30, k * 5.2], [0.55, -k * 5.2]]
        : e.type === 1 ? [[0.25, k * 5], [TAU / 6, -k * 6], [0.2, 0]]
        : [[0.6, k * 1.1]];
      e.state = 'dive'; api.beep(700, 0.06, 'triangle', 0.025);
    };
    const startBossDive = (e, form) => {
      launchDive(e);
      if (e.holding) return;
      const gs = form.filter(o => o.type === 1 && o.state === 'form').sort((a, b) => Math.abs(a.col - e.col) - Math.abs(b.col - e.col)).slice(0, Math.random() < 0.5 ? 2 : 1);
      gs.forEach((o, i) => { o.state = 'escort'; o.lead = e; o.ox = i ? 22 : -22; o.oy = 14; o.shotsLeft = 1; o.fireT = 0.6; });
    };
    const startBeam = e => {
      const tx = Math.max(46, Math.min(W - 46, ship.x)), ty = Math.max(SHIP_Y - 190, TOP + 5 * DY + 30);
      e.state = 'beamIn'; e.v = 250;
      e.b = { x0: e.x, y0: e.y, x1: tx, y1: ty, cx: e.x - (e.x < W / 2 ? 1 : -1) * 90, cy: e.y + (ty - e.y) * 0.45, t: 0, T: 1.2 };
    };
    const beamHalf = d => 9 + d * 0.15;
    const beginCapture = e => {
      capt = { boss: e, t: 0, x0: ship.x };
      api.haptic(40); arp([880, 740, 620, 520, 440, 370], 0.1, 'triangle', 0.05);
    };
    const finishCapture = () => {
      const b = capt.boss; capt = null;
      b.holding = true; flash('NAVE CATTURATA');
      if (reserve > 0) { reserve--; finalDeath = false; } else finalDeath = true;
      deadT = 1.4;
      b.v = 250; b.th = HP; startHome(b);
    };

    const pickAttack = form => {
      const e = form[(Math.random() * form.length) | 0];
      if (e.type === 2) {
        const canBeam = !e.holding && !ship.dual && deadT <= 0 && !capt && !rescue && !finalDeath
          && !enemies.some(b => b.holding || b.state === 'beamIn' || b.state === 'beam');
        if (canBeam && Math.random() < 0.55) startBeam(e); else startBossDive(e, form);
      } else {
        launchDive(e);
        if (stage >= 3 && Math.random() < 0.5) {
          const nb = form.find(o => o !== e && o.state === 'form' && o.type === e.type && o.row === e.row && Math.abs(o.col - e.col) === 1);
          if (nb) launchDive(nb);
        }
      }
    };

    const kill = e => {
      if (e.dead) return;
      e.dead = true;
      const diving = ATT.has(e.state);
      let pts;
      if (challenge) pts = 100;
      else if (e.type === 0) pts = diving ? 100 : 50;
      else if (e.type === 1) pts = diving ? 160 : 80;
      else if (!diving) pts = 150;
      else { const n = enemies.filter(o => o.lead === e && !o.dead && o.state === 'escort').length; pts = n === 2 ? 1600 : n === 1 ? 800 : 400; }
      if (e.holding && e.state !== 'form') pts = 1000;
      addScore(pts); addText(e.x, e.y - 12, pts);
      boom(e.x, e.y, COLOR[e.type][0], 14); api.haptic(14); sfx.boom();
      if (challenge) chHits++;
      if (e.holding) {
        if (e.state === 'form' || e.state === 'enter') { boom(e.x, e.y - 24, '#ff6b5e', 16); addText(e.x, e.y - 30, 'NAVE PERSA'); }
        else { rescue = { x: e.x, y: e.y - 24, t: 0 }; arp([392, 523, 659], 0.08, 'triangle', 0.05); }
      }
      if (capt && capt.boss === e) { capt = null; ship.inv = 2; }
    };

    // --- aggiornamento ---
    const updateShip = dt => {
      if (capt) { capt.t += dt; if (capt.t >= 1.7) finishCapture(); }
      else if (deadT > 0) {
        deadT -= dt;
        if (deadT <= 0) { if (finalDeath) { endGame(); return; } respawn(); }
      }
      if (capt || deadT > 0) return;
      const mv = (held.right ? 1 : 0) - (held.left ? 1 : 0), mg = ship.dual ? 32 : 18;
      ship.x += mv * 260 * dt;
      if (touch) ship.x += (touch.x - ship.x) * Math.min(1, dt * 20);
      ship.x = Math.max(mg, Math.min(W - mg, ship.x));
      if ((touch || held.a || held.b) && cd <= 0 && shots.length < (ship.dual ? 4 : 2)) {
        if (ship.dual) { shots.push({ x: ship.x - 13, y: SHIP_Y - 12 }, { x: ship.x + 13, y: SHIP_Y - 12 }); fired += 2; }
        else { shots.push({ x: ship.x, y: SHIP_Y - 12 }); fired++; }
        cd = 0.18; sfx.shot();
      }
    };

    const updatePhase = dt => {
      if (phase === 'intro') {
        phaseT -= dt;
        if (phaseT <= 0) phase = 'enter';
      } else if (phase === 'enter') {
        et += dt;
        for (const e of enemies) if (e.state === 'wait') {
          e.delay -= dt;
          if (e.delay <= 0) { if (challenge) { e.state = 'ch'; e.t = 0; } else startEntry(e); }
        }
        if (challenge) {
          if (!enemies.length) {
            phase = 'result'; phaseT = 4;
            const perfect = chHits >= chTotal;
            resultLines = ['COLPITI ' + chHits, perfect ? 'PERFETTO! +10000' : 'BONUS ' + chHits * 100];
            if (perfect) { addScore(10000); arp([523, 659, 784, 1047, 784, 1047], 0.1, 'triangle', 0.05); }
          }
        } else if (enemies.every(e => e.state === 'form')) { phase = 'fight'; attackT = 1.0; }
      } else if (phase === 'fight') {
        attackT -= dt;
        if (attackT <= 0 && deadT <= 0 && !capt) {
          const att = enemies.filter(e => ATT.has(e.state)).length, form = enemies.filter(e => e.state === 'form');
          if (form.length && att < maxAtt()) pickAttack(form);
          attackT = Math.max(0.35, 1.9 - stage * 0.1) * (0.6 + Math.random() * 0.8) * (enemies.length <= 4 ? 0.4 : 1);
        }
        if (!enemies.length && !capt) { phase = 'clear'; phaseT = 1.6; }
      } else if (phase === 'clear' || phase === 'result') {
        phaseT -= dt;
        if (phaseT <= 0) { stage++; spawnStage(); }
      }
    };

    const steer = (e, dt) => {
      const ph = Math.atan2(SHIP_Y - e.y, ship.x - e.x), lim = (1.2 + stage * 0.06) * dt;
      e.th += Math.max(-lim, Math.min(lim, angDiff(ph, e.th)));
    };
    const enemyFire = (e, dt) => {
      e.fireT -= dt;
      if (e.shotsLeft > 0 && e.fireT <= 0 && e.y > 50 && e.y < SHIP_Y - 120 && deadT <= 0 && !capt) { aimShot(e); e.shotsLeft--; e.fireT = 0.45; }
    };

    const updateEnemies = dt => {
      sway = Math.sin(time * 0.8) * 16; breath = 0.5 + 0.5 * Math.sin(time * 1.25);
      const cs = 1 + stage * 0.02;
      for (const e of enemies) {
        if (e.dead || e.state === 'wait') continue;
        if (e.state === 'ch') {
          e.t += dt * cs;
          const p = CH[e.gi](e.t), q = CH[e.gi](e.t + 0.03);
          e.x = p.x; e.y = p.y; e.th = Math.atan2(q.y - p.y, q.x - p.x);
          if (e.t > 0.6 && (e.y > H + 30 || e.y < -60 || e.x < -50 || e.x > W + 50)) e.dead = true;
          continue;
        }
        if (e.state === 'enter') {
          turtle(e, dt);
          if (e.si >= e.sc.length) startHome(e);
        } else if (e.state === 'home') {
          const h = e.h, s = slotOf(e);
          h.t += dt; const u = Math.min(1, h.t / h.T), m = 1 - u;
          e.x = m * m * h.x0 + 2 * m * u * h.cx + u * u * s.x; e.y = m * m * h.y0 + 2 * m * u * h.cy + u * u * s.y;
          let th = Math.atan2(2 * m * (h.cy - h.y0) + 2 * u * (s.y - h.cy), 2 * m * (h.cx - h.x0) + 2 * u * (s.x - h.cx));
          if (u > 0.82) th = HP + angDiff(th, HP) * (1 - (u - 0.82) / 0.18);
          e.th = th;
          if (u >= 1) { e.state = 'form'; e.th = HP; }
        } else if (e.state === 'form') {
          const s = slotOf(e); e.x = s.x; e.y = s.y; e.th = HP;
        } else if (e.state === 'dive') {
          const left = turtle(e, dt);
          if (e.si >= e.sc.length) {
            if (e.y < SHIP_Y - 150 && e.y > -10) steer(e, dt);
            e.x += Math.cos(e.th) * e.v * left; e.y += Math.sin(e.th) * e.v * left;
          }
          enemyFire(e, dt);
          if (e.y > H + 30 || e.y < -80 || Math.abs(e.x - W / 2) > W / 2 + 80) { e.state = 'back'; e.x = slotOf(e).x; e.y = -24; e.th = HP; }
        } else if (e.state === 'escort') {
          const L = e.lead;
          if (!L || L.dead) { e.state = 'dive'; e.v = vDive(); e.sc = []; e.si = 0; e.st = 0; }
          else if (L.state === 'back' || L.state === 'form') { e.state = 'back'; e.x = slotOf(e).x; e.y = -24; e.th = HP; }
          else {
            const fx = Math.cos(L.th), fy = Math.sin(L.th);
            e.x = L.x - fx * e.oy - fy * e.ox; e.y = L.y - fy * e.oy + fx * e.ox; e.th = L.th;
            enemyFire(e, dt);
          }
        } else if (e.state === 'beamIn') {
          const b = e.b; b.t += dt;
          const u = Math.min(1, b.t / b.T), uu = 1 - (1 - u) * (1 - u);
          const p = bz(b.x0, b.y0, b.cx, b.cy, b.x1, b.y1, uu);
          e.x = p[0]; e.y = p[1];
          let th = Math.atan2(p[3], p[2]);
          if (u > 0.7) th = HP + angDiff(th, HP) * (1 - (u - 0.7) / 0.3);
          e.th = th;
          if (u >= 1) { e.state = 'beam'; e.beamT = 0; e.th = HP; }
        } else if (e.state === 'beam') {
          e.beamT += dt; beamSnd -= dt;
          if (beamSnd <= 0) { api.beep(((e.beamT * 12) | 0) % 2 ? 520 : 660, 0.07, 'square', 0.018); beamSnd = 0.06; }
          if (!capt && deadT <= 0 && e.beamT > 0.35 && Math.abs(ship.x - e.x) < beamHalf(SHIP_Y - e.y - 14) - 6) beginCapture(e);
          if (!capt && e.beamT > 2.6) {
            e.state = 'dive'; e.v = vDive(); e.th = HP; e.sc = []; e.si = 0; e.st = 0; e.shotsLeft = 1; e.fireT = 0.4;
          }
        } else if (e.state === 'back') {
          const s = slotOf(e);
          e.x += (s.x - e.x) * Math.min(1, dt * 4); e.y += (e.v || 250) * dt * 0.9; e.th = HP;
          if (e.y >= s.y) { e.y = s.y; e.state = 'form'; }
        }
        // contatto con la nave
        if (!e.dead && ATT.has(e.state) && deadT <= 0 && !capt && ship.inv <= 0 && Math.abs(e.y - SHIP_Y) < 18 && Math.abs(e.x - ship.x) < (ship.dual ? 28 : 18)) {
          boom(e.x, e.y, COLOR[e.type][0], 12); e.dead = true; hitShip(e.x);
        }
      }
      enemies = enemies.filter(e => !e.dead);
    };

    const updateShots = dt => {
      for (const s of shots) {
        s.y -= 600 * dt;
        for (const e of enemies) {
          if (e.dead || e.state === 'wait') continue;
          if (Math.abs(s.x - e.x) < 15 && Math.abs(s.y - e.y) < 14) {
            s.dead = true; hitsTotal++; e.hp--;
            if (e.hp <= 0) kill(e); else { api.haptic(6); sfx.hit(); boom(e.x, e.y, '#eef1ff', 4); }
            break;
          }
        }
      }
      shots = shots.filter(s => !s.dead && s.y > -10);
      enemies = enemies.filter(e => !e.dead);
    };
    const updateBullets = dt => {
      for (const b of ebullets) {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (deadT <= 0 && !capt && ship.inv <= 0 && Math.abs(b.y - SHIP_Y) < 12 && Math.abs(b.x - ship.x) < (ship.dual ? 25 : 13)) { b.dead = true; hitShip(b.x); }
      }
      ebullets = ebullets.filter(b => !b.dead && b.y < H + 10 && b.x > -10 && b.x < W + 10);
    };
    const updateRescue = dt => {
      if (!rescue) return;
      rescue.t += dt;
      rescue.y = Math.min(SHIP_Y, rescue.y + 150 * dt);
      rescue.x += (ship.x + 13 - rescue.x) * Math.min(1, dt * 3);
      if (rescue.y >= SHIP_Y - 1 && deadT <= 0 && !capt) {
        rescue = null; ship.dual = true; flash('DOPPIA NAVE'); api.haptic(30);
        arp([523, 659, 784, 1047], 0.08, 'triangle', 0.05);
      }
    };

    const update = dt => {
      time += dt; flashT = Math.max(0, flashT - dt);
      stars.forEach(s => { s.y += s.s * 40 * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; });
      parts = parts.filter(p => p.t > 0);
      texts.forEach(t => { t.y -= 22 * dt; t.t -= dt; });
      texts = texts.filter(t => t.t > 0);
      if (state !== 'play') return;
      cd = Math.max(0, cd - dt); ship.inv = Math.max(0, ship.inv - dt);
      updateShip(dt); if (state !== 'play') return;
      updatePhase(dt);
      updateEnemies(dt);
      updateShots(dt);
      updateBullets(dt);
      updateRescue(dt);
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

    // --- disegno ---
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
    const drawShip = (x, y, s = 1, c1, c2) => Art.fighter(g, x, y - 2 * s, s * 1.05, performance.now() / 1000, c1 || '#e8eeff', c2 || '#e5413b');
    const drawEnemy = e => {
      const f = ((time * 4) | 0) & 1, col = COLOR[e.type][e.hp < MAXHP[e.type] ? 1 : 0];
      g.save(); g.translate(e.x, e.y); g.rotate(e.th - HP);
      bmp(SPR[e.type][f], -12, -12, 3, col);
      if (e.holding) drawShip(0, -26, 0.7, '#ff7a6e', '#ffd0cb');
      g.restore();
    };
    const drawBeam = e => {
      const by = e.y + 14, L = H - 24 - by, a = Math.min(1, e.beamT / 0.4) * (e.beamT > 2.3 ? Math.max(0, (2.6 - e.beamT) / 0.3) : 1);
      if (L <= 0 || a <= 0) return;
      g.save(); g.globalAlpha = a;
      const gr = g.createLinearGradient(0, by, 0, by + L); gr.addColorStop(0, 'rgba(90,200,255,.55)'); gr.addColorStop(1, 'rgba(90,200,255,.12)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(e.x - 9, by); g.lineTo(e.x + 9, by); g.lineTo(e.x + beamHalf(L), by + L); g.lineTo(e.x - beamHalf(L), by + L); g.closePath(); g.fill();
      for (let i = 0; i < 9; i++) {
        const d = ((time * 210 + i * L / 9) % L), w = beamHalf(d);
        g.strokeStyle = ((time * 12 + i) | 0) % 2 ? '#bff3ff' : '#4aa3ff'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(e.x, by + d, w, 4 + w * 0.12, 0, 0, TAU); g.stroke();
      }
      g.restore();
    };
    const drawBadge = (kind, x, y) => {
      g.save(); g.translate(x, y);
      if (kind === 1) { g.fillStyle = '#4aa3ff'; g.fillRect(-1, -12, 2, 12); g.beginPath(); g.moveTo(1, -12); g.lineTo(9, -9); g.lineTo(1, -6); g.fill(); }
      else if (kind === 5) { g.fillStyle = '#ffd23f'; g.fillRect(-1, -14, 2, 14); g.beginPath(); g.moveTo(1, -14); g.lineTo(11, -10); g.lineTo(6, -7); g.lineTo(11, -4); g.lineTo(1, -1); g.fill(); }
      else if (kind === 10) { g.fillStyle = '#e5413b'; g.beginPath(); g.moveTo(-6, -14); g.lineTo(6, -14); g.lineTo(6, -5); g.lineTo(0, 0); g.lineTo(-6, -5); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.fillRect(-1.5, -11, 3, 6); }
      else { g.fillStyle = '#4cc24a'; g.beginPath(); g.moveTo(-7, -14); g.lineTo(7, -14); g.lineTo(7, -4); g.lineTo(0, 1); g.lineTo(-7, -4); g.closePath(); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-4, -10); g.lineTo(0, -6); g.lineTo(4, -10); g.lineTo(4, -7); g.lineTo(0, -3); g.lineTo(-4, -7); g.closePath(); g.fill(); }
      g.restore();
    };

    const render = () => {
      Art.nebula(g, W, H, 0);
      stars.forEach(s => { g.fillStyle = s.s > 1.4 ? '#eef1ff' : '#5a6aa0'; g.fillRect(s.x, s.y, s.s, s.s); });

      if (state === 'title') {
        text('GALAXY', W / 2, 110, 46, 'center', '#3d5fe0'); text('STRIKE', W / 2, 160, 46, 'center');
        [[0, '50 / 100'], [1, '80 / 160'], [2, '150 / 400+']].forEach(([t, s], i) => {
          bmp(SPR[t][((performance.now() / 250) | 0) & 1], W / 2 - 84, 250 + i * 40, 3, COLOR[t][0]);
          text(s, W / 2 - 40, 255 + i * 40, 16);
        });
        drawShip(W / 2, 420, 1.4);
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 365, 16, 'center', '#f5d31c');
        text('RECORD ' + hi, W / 2, 470, 13, 'center');
        return;
      }

      enemies.forEach(e => { if (e.state === 'beam') drawBeam(e); });
      enemies.forEach(e => { if (e.state !== 'wait') drawEnemy(e); });
      g.fillStyle = '#eef1ff'; shots.forEach(s => g.fillRect(s.x - 1.5, s.y, 3, 12));
      g.fillStyle = '#f5d31c'; ebullets.forEach(b => { g.beginPath(); g.arc(b.x, b.y, 3.5, 0, 7); g.fill(); });
      if (rescue) { g.save(); g.translate(rescue.x, rescue.y); g.rotate(rescue.t * 8); drawShip(0, 0, 1); g.restore(); }
      if (capt) {
        const u = Math.min(1, capt.t / 1.6), q = u * u, b = capt.boss;
        g.save(); g.translate(capt.x0 + (b.x - capt.x0) * q, SHIP_Y + (b.y + 16 - SHIP_Y) * q); g.rotate(capt.t * 9); g.scale(1 - 0.35 * q, 1 - 0.35 * q); drawShip(0, 0, 1); g.restore();
      } else if (deadT <= 0 && !(ship.inv > 0 && ((ship.inv * 10) | 0) % 2 === 0)) {
        if (ship.dual) { drawShip(ship.x - 13, SHIP_Y); drawShip(ship.x + 13, SHIP_Y); } else drawShip(ship.x, SHIP_Y);
      }
      parts.forEach(p => { g.fillStyle = p.c; g.fillRect(p.x, p.y, 3, 3); });
      texts.forEach(t => text(t.s, t.x, t.y, 12, 'center', '#f5d31c'));

      text('1UP', 10, 6, 11, 'left', '#e5413b'); text(String(score).padStart(5, '0'), 10, 18, 14);
      text('RECORD', W / 2, 6, 11, 'center', '#e5413b'); text(String(Math.max(hi, score)).padStart(5, '0'), W / 2, 18, 14, 'center');
      for (let i = 0; i < reserve; i++) drawShip(18 + i * 20, H - 14, 0.6);
      const bd = []; let n = stage;
      [20, 10, 5, 1].forEach(v => { while (n >= v) { bd.push(v); n -= v; } });
      bd.slice(0, 7).forEach((v, i) => drawBadge(v, W - 14 - i * 15, H - 8));

      if (state === 'play' && phase === 'intro') {
        text(challenge ? 'QUADRO BONUS' : 'QUADRO ' + stage, W / 2, H * 0.44, 26, 'center', '#6ad0ff');
        text(challenge ? 'ABBATTILI TUTTI!' : 'PRONTO', W / 2, H * 0.44 + 38, 16, 'center');
      }
      if (state === 'play' && phase === 'result') {
        text('QUADRO BONUS', W / 2, H * 0.38, 20, 'center', '#6ad0ff');
        resultLines.forEach((l, i) => text(l, W / 2, H * 0.38 + 40 + i * 30, 20, 'center', i ? '#f5d31c' : '#eef1ff'));
      }
      if (flashT > 0) text(flashMsg, W / 2, H * 0.56, 20, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') {
        const acc = fired ? Math.round(hitsTotal / fired * 100) : 0;
        banner(['GAME OVER', 'PUNTI ' + score, 'SPARI ' + fired, 'COLPITI ' + hitsTotal + ' (' + acc + '%)', 'TOCCA']);
      }
    };

    parts = []; texts = []; enemies = []; shots = []; ebullets = []; ship = { x: W / 2, inv: 0, dual: false };
    return {
      onPress: act,
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; touch = null; },
      update,
      render,
      debug: {
        newGame, spawnStage, attack(e) { pickAttack([e]); },
        goStage(n) { stage = n; spawnStage(); phase = 'enter'; },
        get state() { return state; }, get enemies() { return enemies; }, get ship() { return ship; },
        get score() { return score; }, get stage() { return stage; }, get phase() { return phase; },
        get capt() { return capt; }, get rescue() { return rescue; }, get reserve() { return reserve; },
        get challenge() { return challenge; }, get chHits() { return chHits; },
        get shots() { return shots; },
      },
    };
  },
});

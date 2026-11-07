registerGame({
  id: 'mouse-castle',
  title: 'MOUSE CASTLE',
  color: '#a655b8',
  blurb: 'Nel castello sali le scale, entra nei tubi e nelle porte magiche, raccogli tutte le chiavi ed esci. Con A salti fantasmi e gatti, con B spingi le casse e usi arco, bomba, martello e pozione.',
  inputs: ['D-PAD', 'PUZZLE', 'A SALTO', 'B OGGETTO'],
  size: [352, 576],
  bg: '#1a1633',
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    // 6 piani (0 in alto), alti 80 px; le scale salgono a 45 gradi di un piano su 5 colonne da 16 px.
    // Il salto è corto: basta a scavalcare un nemico, non a cambiare piano.
    const C = 16, FLOORS = 6, FH = 80, WALK = 70, CLIMB = 58, JUMP = 300, GRAV = 1000;
    const Y = f => 112 + f * FH;                  // pavimento del piano f
    const X = c => c * C + 8;                     // centro della colonna c (1..20)
    const XMIN = 24, XMAX = W - 24;

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, stateT = 0, msg = '', msgT = 0, time = 0;
    let parts = [];
    const burst = (x, y, c, n) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 90; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0.5 + Math.random() * 0.4, c }); } };
    let stairs, pipes, doors, walls, keys, items, crates, foes, arrows, bombs, exit, start, need, got, P, hint = '', freeze = 0;

    const rng = seed => () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    // Quadri disegnati a mano, come i castelli dei vecchi giochi del Game Boy: uno schermo, niente salto.
    // stairs [piano basso, colonna, verso]: la cima è sul piano sopra, 5 colonne più in là nel verso indicato
    // pipes [piano, col, piano uscita, col]  (si entra con ▼, a senso unico)   doors [piano, col, piano, col]  (▲, nei due sensi)
    // walls [piano, col, crepato?]   items [tipo, piano, col]: crate, bow, bomb, hammer, potion   foes [g fantasma | c gatto, piano, col]
    const LEVELS = [
      { hint: 'SCALE CON SU E GIU, A SALTA IL FANTASMA', start: [5, 2], exit: [0, 18],
        stairs: [[5, 8, 1], [4, 17, -1], [3, 6, 1], [2, 16, -1], [1, 4, 1]],
        keys: [[5, 16], [4, 3], [3, 18], [2, 3], [1, 17], [0, 4]], foes: [['g', 2, 9]] },
      { hint: 'GIU NEI TUBI: TI PORTANO LONTANO', start: [5, 1], exit: [0, 19],
        stairs: [[5, 6, 1], [4, 18, -1], [2, 3, 1], [1, 14, 1]], pipes: [[3, 4, 2, 17], [2, 10, 4, 2]],
        keys: [[5, 17], [4, 3], [4, 15], [3, 19], [2, 13], [1, 2], [1, 19], [0, 6]], foes: [['g', 4, 8], ['g', 1, 10]] },
      { hint: 'LE PORTE MAGICHE FERMANO I NEMICI', start: [5, 10], exit: [0, 2],
        stairs: [[5, 3, 1], [5, 17, -1], [3, 14, 1], [2, 5, 1], [1, 16, -1]], doors: [[4, 19, 3, 2]],
        keys: [[5, 1], [5, 20], [4, 4], [3, 10], [3, 20], [2, 2], [1, 18], [0, 17]], foes: [['g', 4, 15], ['c', 2, 13], ['g', 0, 6]] },
      { hint: 'B: SPINGI LA CASSA CONTRO I NEMICI', start: [5, 1], exit: [0, 10],
        stairs: [[5, 12, 1], [4, 6, -1], [3, 9, 1], [2, 19, -1], [1, 4, 1]],
        items: [['crate', 4, 13], ['crate', 1, 10]],
        keys: [[5, 19], [4, 2], [3, 6], [3, 18], [2, 3], [1, 1], [1, 19], [0, 16]], foes: [['g', 4, 3], ['c', 1, 6], ['g', 2, 8]] },
      { hint: 'PRENDI L ARCO E TIRA CON B', start: [5, 19], exit: [0, 1],
        stairs: [[5, 4, 1], [4, 16, -1], [3, 3, 1], [2, 15, 1], [1, 12, -1]],
        items: [['bow', 5, 10], ['bow', 2, 12]],
        keys: [[5, 1], [4, 19], [4, 3], [3, 18], [2, 2], [1, 4], [0, 12], [0, 19]], foes: [['g', 4, 12], ['c', 3, 7], ['g', 1, 8], ['c', 0, 15]] },
      { hint: 'MARTELLO E BOMBA ROMPONO I MURI CREPATI', start: [5, 1], exit: [0, 19],
        stairs: [[5, 4, 1], [4, 17, -1], [3, 5, 1], [2, 18, -1], [1, 6, 1]], walls: [[5, 12, 1], [3, 14, 1]],
        items: [['hammer', 5, 7], ['bomb', 3, 9]],
        keys: [[5, 16], [4, 2], [4, 19], [3, 18], [2, 3], [1, 1], [1, 19], [0, 4]], foes: [['g', 4, 13], ['g', 2, 14], ['c', 1, 11]] },
      { hint: 'LA POZIONE TI RENDE INVINCIBILE', start: [5, 10], exit: [0, 4],
        stairs: [[5, 2, 1], [5, 19, -1], [4, 10, 1], [3, 4, 1], [3, 18, -1], [2, 11, -1], [1, 16, -1]], walls: [[1, 3, 1]],
        items: [['potion', 4, 18], ['bomb', 3, 10]],
        keys: [[5, 6], [5, 15], [4, 3], [3, 1], [3, 20], [2, 17], [1, 1], [0, 18]], foes: [['c', 4, 5], ['g', 3, 13], ['g', 2, 5], ['c', 1, 12], ['g', 0, 14]] },
      { hint: 'TUBI, PORTE E SCALE INSIEME', start: [5, 1], exit: [0, 20],
        stairs: [[5, 14, -1], [3, 2, 1], [1, 8, 1]], pipes: [[4, 19, 3, 5], [2, 18, 1, 2]], doors: [[3, 16, 4, 3], [1, 17, 2, 15]],
        items: [['crate', 5, 8], ['bow', 2, 10]],
        keys: [[5, 11], [5, 20], [4, 14], [3, 10], [3, 19], [2, 3], [1, 11], [0, 5]], foes: [['g', 5, 17], ['c', 3, 12], ['g', 2, 5], ['c', 1, 5], ['g', 0, 9]] },
    ];

    const build = d => {
      start = { f: d.start[0], x: X(d.start[1]) };
      exit = { f: d.exit[0], x: X(d.exit[1]) };
      stairs = (d.stairs || []).map(([f, c, dir]) => ({ f, x: X(c), dir, tx: X(c + 5 * dir) }));
      pipes = (d.pipes || []).map(([f, c, f2, c2]) => ({ f, x: X(c), f2, x2: X(c2) }));
      doors = [];
      (d.doors || []).forEach(([fa, ca, fb, cb]) => { const a = { f: fa, x: X(ca) }, b = { f: fb, x: X(cb) }; a.pair = b; b.pair = a; doors.push(a, b); });
      walls = (d.walls || []).map(([f, c, cracked]) => ({ f, x0: c * C, x1: c * C + C, cracked: !!cracked, broken: false }));
      keys = d.keys.map(([f, c], i) => ({ f, x: X(c), got: false, bob: i * 1.3 }));
      items = (d.items || []).filter(i => i[0] !== 'crate').map(([type, f, c]) => ({ type, f, x: X(c), got: false }));
      crates = (d.items || []).filter(i => i[0] === 'crate').map(([, f, c]) => ({ f, x: X(c), vx: 0, gone: false }));
      foes = (d.foes || []).map(([type, f, c], i) => ({ type, home: { f, x: X(c) }, f, x: X(c), dir: i % 2 ? 1 : -1, st: null, s: 0, cool: 0, dead: 0, t: i }));
      arrows = []; bombs = [];
      need = keys.length; got = 0; hint = d.hint || '';
    };

    // Dopo i quadri disegnati a mano: castelli generati dal numero del livello (sempre risolvibili, senza muri).
    const gen = lv => {
      if (lv <= LEVELS.length) { build(LEVELS[lv - 1]); return; }
      const rand = rng(lv * 7717 + 3), pick = (a, b) => a + ((rand() * (b - a + 1)) | 0);
      const d = { stairs: [], pipes: [], doors: [], items: [], keys: [], foes: [] }, used = new Set();
      const mark = (f, c) => { for (let k = -1; k <= 1; k++) used.add(f + ':' + (c + k)); };
      for (let f = FLOORS - 1; f >= 1; f--) {
        const dir = rand() < .5 ? 1 : -1, c = dir > 0 ? pick(1, 15) : pick(6, 20);
        d.stairs.push([f, c, dir]); mark(f, c); mark(f - 1, c + 5 * dir);
      }
      const spot = f => { for (let k = 0; k < 80; k++) { const c = pick(1, 20); if (!used.has(f + ':' + c)) { mark(f, c); return c; } } return null; };
      const place = (arr, mk, f) => { const c = spot(f); if (c !== null) arr.push(mk(c)); };
      d.start = [5, spot(5)]; d.exit = [0, spot(0)];
      if (lv % 2) { const a = pick(3, 5), b = a - pick(1, 2); place(d.pipes, c => [a, c, b, spot(b) || 10], a); }
      else { const a = pick(2, 5), b = pick(0, 1); const ca = spot(a), cb = spot(b); if (ca && cb) d.doors.push([a, ca, b, cb]); }
      for (let k = 0; k < 8; k++) place(d.keys, c => [k % FLOORS, c], k % FLOORS);
      const kinds = ['crate', 'bow', 'bomb', 'potion'];
      for (let k = 0; k < 3; k++) { const f = pick(1, 5); place(d.items, c => [kinds[pick(0, 3)], f, c], f); }
      for (let k = 0, n = Math.min(3 + (lv >> 2), 7); k < n; k++) {
        const f = k % 5, type = rand() < Math.min(.6, .2 + lv * .03) ? 'c' : 'g';
        place(d.foes, c => [type, f, c], f);
      }
      build(d); hint = '';
    };

    const resetPlayer = () => {
      P = { f: start.f, x: start.x, face: 1, walk: 0, st: null, s: 0, anim: null, item: null, inv: 1.5, star: 0, jy: 0, jv: 0, jb: 0 };
      foes.forEach(e => { if (!e.dead) { e.f = e.home.f; e.x = e.home.x; e.st = null; } });
      arrows = []; freeze = 1;
    };
    let introT = 0;
    const saved = () => api.store.get('stage', 1);
    const intro = () => { state = 'intro'; introT = 1.8; };
    const newGame = (from = 1) => { score = 0; lives = 3; level = from; gen(level); resetPlayer(); intro(); };
    const restartStage = () => { gen(level); resetPlayer(); intro(); };
    const nextLevel = () => { level++; if (level > saved()) api.store.set('stage', level); gen(level); resetPlayer(); intro(); };
    const endGame = () => {
      state = 'over';
      parts = [];
      if (score > hi) { hi = score; api.store.set('hi', hi); }
    };
    const flash = s => { msg = s; msgT = 1.3; };
    const hurt = why => {
      if (state !== 'play' || P.inv > 0 || P.star > 0) return;
      state = 'dead'; stateT = 1.4; lives--; api.haptic(50); api.beep(150, 0.3, 'sawtooth', 0.06);
      P.dy = 0; P.vy = -300; P.anim = null;
      if (why) flash(why);
    };

    // Posizione sullo schermo (piedi) di chi sta su un piano o su una scala.
    const pos = o => o.st ? { x: o.st.x + (o.st.tx - o.st.x) * o.s, y: Y(o.st.f) - FH * o.s } : { x: o.x, y: Y(o.f) - (o.jy || 0) };
    const floorOf = o => o.st ? (o.s < 0.15 ? o.st.f : o.s > 0.85 ? o.st.f - 1 : -1) : o.f;
    // Ostacoli orizzontali sul piano f: muri interi e casse ferme.
    const blockers = f => {
      const b = walls.filter(w => w.f === f && !w.broken).map(w => [w.x0, w.x1]);
      crates.forEach(k => { if (!k.gone && k.f === f && !k.vx) b.push([k.x - 10, k.x + 10]); });
      return b;
    };
    const slide = (f, x, nx, half) => {
      for (const [a, b] of blockers(f)) {
        if (x <= a - half && nx > a - half) nx = a - half;
        if (x >= b + half && nx < b + half) nx = b + half;
      }
      return Math.max(XMIN, Math.min(XMAX, nx));
    };
    const near = (o, f, x, r) => floorOf(o) === f && Math.abs(pos(o).x - x) < r;

    const startStair = (o, st, s) => { o.st = st; o.s = s; o.x = s ? st.tx : st.x; };
    const leaveStair = o => { const top = o.s >= 1; o.f = top ? o.st.f - 1 : o.st.f; o.x = top ? o.st.tx : o.st.x; o.st = null; };

    const movePlayer = dt => {
      P.jb = Math.max(0, P.jb - dt);
      if (P.anim) {
        const a = P.anim; a.t += dt;
        if (a.t >= a.dur) {
          if (a.phase === 'in') { P.f = a.to.f; P.x = a.to.x; a.phase = 'out'; a.t = 0; if (a.type === 'door') { freeze = 2.2; flash('NEMICI FERMI!'); } api.beep(a.type === 'pipe' ? 300 : 1200, 0.1, 'sine', 0.05); }
          else P.anim = null;
        }
        return;
      }
      const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (P.st) {
        // su o destra/sinistra verso la cima: si sale; giù o il verso opposto: si scende
        const v = dy ? -dy : dx ? dx * P.st.dir : 0;
        if (v) { P.s += v * CLIMB / FH * dt; P.walk += dt * 9; P.face = (v > 0 ? 1 : -1) * P.st.dir; }
        if (P.s >= 1 || P.s <= 0) { P.s = P.s >= 1 ? 1 : 0; leaveStair(P); }
        return;
      }
      if (P.jy > 0 || P.jv > 0) {
        P.jy += P.jv * dt; P.jv -= GRAV * dt;
        if (P.jy <= 0) { P.jy = 0; P.jv = 0; api.beep(240, 0.03, 'triangle', 0.03); if (P.jb > 0) { P.jb = 0; jump(); } }
      }
      if (dy && !P.jy) {
        const st = stairs.find(s => dy < 0 ? s.f === P.f && Math.abs(P.x - s.x) < 7 : s.f - 1 === P.f && Math.abs(P.x - s.tx) < 7);
        if (st) { startStair(P, st, dy < 0 ? 0 : 1); return; }
      }
      if (dx) { P.face = dx; P.walk += dt * 10; P.x = slide(P.f, P.x, P.x + dx * WALK * dt, 7); }
    };

    // ▲ porte (uscita compresa), ▼ tubi. Si usano alla pressione, non tenendo premuto.
    const jump = () => {
      // Premuto ancora in aria: il salto parte appena il topo tocca terra (entro 0,12 s).
      if (P.jy > 0 && !P.st && !P.anim) { P.jb = 0.12; return; }
      if (P.st || P.anim || P.jy > 0) return;
      P.jv = JUMP; P.jy = 0.01; api.haptic(6); api.beep(560, 0.06);
    };
    const enter = k => {
      if (P.st || P.anim || P.jy > 0) return;
      if (k === 'up') {
        if (Math.abs(P.x - exit.x) < 10 && P.f === exit.f) {
          if (got >= need) {
            state = 'win'; stateT = 2; score += 500 + lives * 100; api.haptic(35);
            [660, 880, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.12), i * 110));
          } else flash('SERVONO ' + (need - got) + ' CHIAVI');
          return;
        }
        const d = doors.find(o => o.f === P.f && Math.abs(P.x - o.x) < 10);
        if (d) P.anim = { type: 'door', phase: 'in', t: 0, dur: 0.28, to: d.pair };
      } else if (k === 'down') {
        const p = pipes.find(o => o.f === P.f && Math.abs(P.x - o.x) < 9);
        if (p) { P.x = p.x; P.anim = { type: 'pipe', phase: 'in', t: 0, dur: 0.35, to: { f: p.f2, x: p.x2 } }; api.beep(500, 0.12, 'square', 0.04); }
      }
    };

    const useItem = () => {
      if (P.st || P.anim || P.jy > 0) return;
      const cr = crates.find(k => !k.gone && !k.vx && k.f === P.f && (k.x - P.x) * P.face > 0 && Math.abs(k.x - P.x) < 22);
      if (cr) { cr.vx = P.face * 230; api.haptic(10); api.beep(200, 0.08, 'triangle', 0.06); return; }
      const it = P.item;
      if (!it) return;
      if (it === 'bow') { arrows.push({ f: P.f, x: P.x + P.face * 10, dir: P.face }); api.beep(880, 0.06, 'triangle', 0.05); }
      else if (it === 'bomb') { bombs.push({ f: P.f, x: P.x, t: 1.3 }); api.beep(400, 0.05); }
      else if (it === 'hammer') {
        const w = walls.find(w => w.f === P.f && w.cracked && !w.broken && ((w.x0 + C / 2) - P.x) * P.face > 0 && Math.abs(w.x0 + C / 2 - P.x) < 28);
        if (!w) { flash('NIENTE DA ROMPERE'); return; }
        breakWall(w);
      }
      P.item = null;
    };
    const breakWall = w => { w.broken = true; score += 30; burst(w.x0 + C / 2, Y(w.f) - 36, '#7d86b8', 16); api.haptic(25); api.beep(120, 0.15, 'sawtooth', 0.06); };
    const kill = e => {
      if (e.dead) return;
      const p = pos(e); e.dead = 8; e.st = null; score += 100;
      burst(p.x, p.y - 12, e.type === 'c' ? '#f0a040' : '#eef1ff', 14); api.haptic(15); api.beep(1000, 0.08, 'square', 0.05);
    };

    const moveFoe = (e, dt) => {
      e.t += dt; e.cool = Math.max(0, e.cool - dt);
      if (e.dead) {
        e.dead -= dt;
        if (e.dead <= 0) {
          const pp = pos(P);
          if (Math.abs(pp.x - e.home.x) < 50 && Math.abs(pp.y - Y(e.home.f)) < 30) e.dead = 1;   // non rinasce addosso al topo
          else { e.dead = 0; e.f = e.home.f; e.x = e.home.x; e.cool = 1; burst(e.x, Y(e.f) - 12, '#aab3d8', 8); }
        }
        return;
      }
      if (freeze > 0) return;
      const sp = (e.type === 'c' ? 44 : 34) * Math.min(1, 0.85 + (level - 1) * 0.075);
      if (e.st) {
        e.s += e.up * sp / FH * dt;
        if (e.s >= 1 || e.s <= 0) { e.s = e.s >= 1 ? 1 : 0; leaveStair(e); e.cool = 0.8; }
        return;
      }
      // il gatto si gira verso il topo quando sono sullo stesso piano
      if (e.type === 'c' && !P.st && P.f === e.f && Math.abs(P.x - e.x) > 6) e.dir = P.x > e.x ? 1 : -1;
      const nx = e.x + e.dir * sp * dt, sx = slide(e.f, e.x, nx, 9);
      if (sx !== nx) e.dir = -e.dir;
      e.x = sx;
      if (e.cool <= 0) {
        for (const s of stairs) {
          const bottom = s.f === e.f && Math.abs(e.x - s.x) < 2, top = s.f - 1 === e.f && Math.abs(e.x - s.tx) < 2;
          if (!bottom && !top) continue;
          e.cool = 1.2;
          // il gatto preferisce andare verso il piano del topo
          const want = e.type === 'c' && !P.st ? (P.f < e.f ? bottom : P.f > e.f ? top : false) : Math.random() < 0.45;
          if (want) { startStair(e, s, bottom ? 0 : 1); e.up = bottom ? 1 : -1; }
          break;
        }
      }
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.t -= dt; });
      parts = parts.filter(p => p.t > 0);
      if (state === 'intro') { introT -= dt; if (introT <= 0) state = 'play'; return; }
      if (state === 'play') {
        P.inv = Math.max(0, P.inv - dt); P.star = Math.max(0, P.star - dt); freeze = Math.max(0, freeze - dt);
        movePlayer(dt);
        const pp = pos(P), pf = floorOf(P), hidden = !!P.anim;

        if (!hidden && pf >= 0) {
          for (const k of keys) {
            if (k.got || k.f !== pf || Math.abs(k.x - pp.x) > 11) continue;
            k.got = true; got++; score += 50; api.haptic(10); api.beep(900 + got * 60, 0.08, 'square', 0.05);
            burst(k.x, Y(k.f) - 16, '#f5d31c', 10);
            if (got === need) flash('PORTA APERTA!');
          }
          for (const it of items) {
            if (it.got || it.f !== pf || Math.abs(it.x - pp.x) > 11) continue;
            if (it.type === 'potion') { it.got = true; P.star = 8; flash('INVINCIBILE!'); api.beep(1300, 0.2, 'sine', 0.05); }
            else if (!P.item) { it.got = true; P.item = it.type; api.beep(700, 0.06, 'square', 0.05); }
          }
        }

        for (const k of crates) {
          if (k.gone || !k.vx) continue;
          const nx = k.x + k.vx * dt;
          const hit = walls.some(w => w.f === k.f && !w.broken && nx + 10 > w.x0 && nx - 10 < w.x1) || nx < XMIN || nx > XMAX;
          if (hit) { k.gone = true; burst(k.x, Y(k.f) - 10, '#c98a52', 14); api.beep(160, 0.12, 'sawtooth', 0.05); continue; }
          k.x = nx;
          foes.forEach(e => { if (!e.dead && near(e, k.f, k.x, 16)) kill(e); });
        }
        for (const a of arrows) {
          a.x += a.dir * 260 * dt;
          if (a.x < XMIN - 10 || a.x > XMAX + 10 || walls.some(w => w.f === a.f && !w.broken && a.x > w.x0 && a.x < w.x1)) { a.done = true; continue; }
          const e = foes.find(e => !e.dead && near(e, a.f, a.x, 10));
          if (e) { kill(e); a.done = true; }
        }
        arrows = arrows.filter(a => !a.done);
        for (const b of bombs) {
          b.t -= dt;
          if (b.t > 0) continue;
          b.done = true; burst(b.x, Y(b.f) - 12, '#ff9a3c', 26); api.haptic(40); api.beep(90, 0.3, 'sawtooth', 0.07);
          foes.forEach(e => { if (near(e, b.f, b.x, 52)) kill(e); });
          walls.forEach(w => { if (w.f === b.f && w.cracked && !w.broken && Math.abs(w.x0 + C / 2 - b.x) < 52) breakWall(w); });
        }
        bombs = bombs.filter(b => !b.done);

        for (const e of foes) {
          moveFoe(e, dt);
          if (e.dead || hidden) continue;
          const ep = pos(e);
          if (Math.abs(ep.x - pp.x) < 13 && Math.abs(ep.y - pp.y) < 16) {
            if (P.star > 0) kill(e); else hurt(e.type === 'c' ? 'IL GATTO!' : 'FANTASMA!');
          }
        }
      } else if (state === 'dead') {
        stateT -= dt; P.vy += 900 * dt; P.dy += P.vy * dt;
        if (stateT <= 0) { if (lives <= 0) endGame(); else { resetPlayer(); state = 'play'; } }
      } else if (state === 'win') {
        stateT -= dt;
        if (stateT <= 0) nextLevel();
      }
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame(Math.min(saved(), LEVELS.length + 20));
        else if (state === 'intro') state = 'play';
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
      } else if (k === 'select') {
        if (state === 'title') { api.store.set('stage', 1); newGame(1); }
        else if (state === 'play' || state === 'pause' || state === 'intro') restartStage();
        else if (state === 'over') newGame(1);
      } else if (state === 'play') {
        if (k === 'a') jump();
        else if (k === 'b') useItem();
        else if (k === 'up' || k === 'down') enter(k);
      }
    };
    const onPointer = e => { if (e.type === 'down' && (state === 'title' || state === 'over')) newGame(Math.min(saved(), LEVELS.length + 20)); };

    // Disegno
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
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

    const stoneRow = (y, h) => {
      for (let x = 0; x < W; x += 32) {
        R(x, y, 32, h, '#7d86b8'); R(x, y, 32, 2, '#a9b2dc'); R(x, y + h - 2, 32, 2, '#4d5688'); R(x + 31, y, 1, h, '#4d5688');
      }
    };
    const drawMouse = (x, y, face, walk, climb, air) => Art.drawMouseHD(g, x, y, face, walk, !!air, climb);
    const drawKey = k => {
      const x = k.x, y = Y(k.f) - 16 + Math.sin(time * 4 + k.bob) * 2;
      g.fillStyle = '#f5d31c'; g.beginPath(); g.arc(x - 6, y, 6, 0, 7); g.fill();
      g.fillStyle = '#1a1633'; g.beginPath(); g.arc(x - 6, y, 2.5, 0, 7); g.fill();
      R(x - 1, y - 2, 12, 4, '#f5d31c'); R(x + 6, y + 2, 3, 5, '#f5d31c'); R(x + 1, y + 2, 3, 4, '#f5d31c');
    };
    const drawItem = (type, x, y) => {
      if (type === 'bow') {
        g.strokeStyle = '#c98a52'; g.lineWidth = 3; g.beginPath(); g.arc(x - 2, y, 9, -1.2, 1.2); g.stroke();
        g.strokeStyle = '#eef1ff'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 1, y - 8.5); g.lineTo(x + 1, y + 8.5); g.stroke();
        R(x - 6, y - 1, 13, 2, '#eef1ff');
      } else if (type === 'bomb') {
        g.fillStyle = '#2b2b3a'; g.beginPath(); g.arc(x, y + 2, 7, 0, 7); g.fill();
        R(x - 2, y - 7, 4, 3, '#8f8f9c'); R(x + 1, y - 10, 2, 3, '#ff9a3c');
      } else if (type === 'hammer') {
        R(x - 1, y - 6, 3, 15, '#c98a52'); R(x - 7, y - 9, 15, 6, '#8f8f9c'); R(x - 7, y - 9, 15, 2, '#c0c0cc');
      } else if (type === 'potion') {
        g.fillStyle = '#ff5aa8'; g.beginPath(); g.arc(x, y + 3, 7, 0, 7); g.fill();
        R(x - 2, y - 8, 4, 6, '#bfeaff'); R(x - 3, y - 10, 6, 2, '#c98a52');
      }
    };
    const drawGhost = (x, y, t, dir, frozen) => {
      y = y - 2 + (frozen ? 0 : Math.sin(t * 5) * 2);
      g.fillStyle = frozen ? 'rgba(170,210,255,.95)' : 'rgba(240,244,255,.95)'; g.beginPath(); g.arc(x, y - 18, 11, Math.PI, 0);
      g.lineTo(x + 11, y - 2); for (let i = 0; i < 4; i++) g.lineTo(x + 11 - (i + 0.5) * 5.5, y - (i % 2 ? 2 : 7)); g.lineTo(x - 11, y - 2); g.fill();
      R(x - 6 + dir, y - 21, 4, 5, '#1a1633'); R(x + 2 + dir, y - 21, 4, 5, '#1a1633');
      R(x - 3, y - 12, 6, 3, '#e5413b');
    };
    const drawStair = s => {
      const x0 = s.x, y0 = Y(s.f), x1 = s.tx, y1 = Y(s.f - 1);
      g.strokeStyle = '#5d4a1a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - s.dir * 6, y0 + 2); g.lineTo(x1 - s.dir * 6, y1 + 2); g.stroke();
      for (let k = 1; k <= 8; k++) {
        const x = x0 + (x1 - x0) * k / 8, y = y0 + (y1 - y0) * k / 8;
        R(Math.min(x, x - s.dir * 10), y, 10, 3, '#e8b878'); R(Math.min(x, x - s.dir * 10), y + 3, 10, 2, '#a0703a');
      }
    };
    const drawPipeIn = p => {
      const x = p.x, y = Y(p.f);
      R(x - 9, y - 16, 18, 16, '#2f9a48'); R(x - 12, y - 22, 24, 7, '#4cc24a'); R(x - 12, y - 22, 24, 2, '#9ef09a'); R(x - 6, y - 16, 3, 16, '#4cc24a');
      text('▼', x, y - 36, 11, 'center', '#9ef09a');
    };
    const drawPipeOut = p => {
      const x = p.x2, y = Y(p.f2) - FH + 8;
      R(x - 9, y, 18, 14, '#2f9a48'); R(x - 12, y + 13, 24, 7, '#4cc24a'); R(x - 12, y + 18, 24, 2, '#1d6a30');
    };
    const drawDoor = (x, y, body, inner) => {
      R(x - 15, y - 40, 30, 40, '#5a3f94');
      g.fillStyle = body; g.beginPath(); g.arc(x, y - 24, 12, Math.PI, 0); g.fillRect(x - 12, y - 24, 24, 24); g.fill();
      g.fillStyle = inner; g.beginPath(); g.arc(x, y - 22, 8, Math.PI, 0); g.fillRect(x - 8, y - 22, 16, 22); g.fill();
    };

    const render = () => {
      g.fillStyle = '#1a1633'; g.fillRect(0, 0, W, H);

      if (state === 'title') {
        stoneRow(0, 32); stoneRow(H - 32, 32);
        text('MOUSE', W / 2, 90, 46, 'center', '#a655b8'); text('CASTLE', W / 2, 142, 46, 'center');
        g.save(); g.translate(W / 2, 300); g.scale(3, 3); drawMouse(0, 0, 1, time * 6, false); g.restore();
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 340, 16, 'center', '#f5d31c');
        text('A: SALTA I NEMICI', W / 2, 380, 11, 'center', '#aab3d8');
        text('B: SPINGI LA CASSA O USA L OGGETTO', W / 2, 398, 11, 'center', '#aab3d8');
        if (saved() > 1) { text('TOCCA: CONTINUA DAL QUADRO ' + saved(), W / 2, 428, 12, 'center', '#7bdc72'); text('SELECT: RICOMINCIA', W / 2, 448, 11, 'center', '#aab3d8'); }
        text('RECORD ' + hi, W / 2, 482, 13, 'center');
        return;
      }

      // finestre decorative sui muri di fondo
      for (let f = 0; f < FLOORS; f++) for (const c of [4, 11, 17]) {
        const x = c * C, y = Y(f) - 58;
        R(x, y + 8, 18, 22, '#2a2352'); g.fillStyle = '#2a2352'; g.beginPath(); g.arc(x + 9, y + 8, 9, Math.PI, 0); g.fill();
        R(x + 3, y + 10, 12, 18, '#3b3370'); R(x + 8, y + 2, 2, 26, '#1a1633');
      }
      stoneRow(32, 8);
      for (let f = 0; f < FLOORS; f++) stoneRow(Y(f), f === FLOORS - 1 ? H - Y(f) : 8);
      R(0, 40, 6, Y(FLOORS - 1) - 40, '#4d5688'); R(W - 6, 40, 6, Y(FLOORS - 1) - 40, '#4d5688');
      for (const w of walls) {
        if (w.broken) continue;
        const top = Y(w.f) - FH + 8;
        for (let y = top; y < Y(w.f); y += 12) { R(w.x0, y, C, 12, w.cracked ? '#9a8fb8' : '#7d86b8'); R(w.x0, y + 11, C, 1, '#4d5688'); }
        if (w.cracked) { g.strokeStyle = '#2a2352'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(w.x0 + 4, top + 10); g.lineTo(w.x0 + 11, top + 30); g.lineTo(w.x0 + 5, top + 48); g.lineTo(w.x0 + 12, top + 66); g.stroke(); }
      }
      stairs.forEach(drawStair);
      pipes.forEach(drawPipeOut);
      pipes.forEach(drawPipeIn);
      doors.forEach(d => drawDoor(d.x, Y(d.f), '#2a7ac8', freeze > 0 ? '#9fd6ff' : '#141a2e'));
      const open = got >= need;
      if (open) { const p = 0.5 + Math.sin(time * 5) * 0.5; g.fillStyle = `rgba(110,255,140,${0.12 + p * 0.14})`; g.beginPath(); g.arc(exit.x, Y(exit.f) - 22, 30, 0, 7); g.fill(); }
      drawDoor(exit.x, Y(exit.f), open ? '#4cc24a' : '#a655b8', open ? '#0e2a16' : '#141a2e');
      if (!open) { g.fillStyle = '#f5d31c'; g.beginPath(); g.arc(exit.x, Y(exit.f) - 15, 3.5, 0, 7); g.fill(); R(exit.x - 1, Y(exit.f) - 13, 2, 7, '#f5d31c'); }
      keys.forEach(k => { if (!k.got) drawKey(k); });
      items.forEach(it => { if (!it.got) drawItem(it.type, it.x, Y(it.f) - 12 + Math.sin(time * 3) * 1.5); });
      for (const k of crates) {
        if (k.gone) continue;
        const x = k.x - 10, y = Y(k.f) - 20;
        R(x, y, 20, 20, '#a0703a'); R(x, y, 20, 3, '#e8b878'); R(x, y + 17, 20, 3, '#5d4a1a'); R(x + 2, y + 9, 16, 2, '#5d4a1a'); R(x + 9, y + 2, 2, 16, '#5d4a1a');
      }
      for (const b of bombs) { drawItem('bomb', b.x, Y(b.f) - 8); if (((b.t * 10) | 0) % 2) R(b.x + 1, Y(b.f) - 19, 3, 3, '#fff36a'); }
      for (const a of arrows) { const y = Y(a.f) - 12; R(a.x - 8, y, 16, 2, '#eef1ff'); R(a.dir > 0 ? a.x + 6 : a.x - 9, y - 2, 3, 6, '#c0c0cc'); }
      for (const e of foes) {
        if (e.dead) continue;
        const p = pos(e), dir = e.st ? (e.up > 0 ? 1 : -1) * e.st.dir : e.dir;
        if (e.type === 'c') { Art.drawCatHD(g, p.x, p.y, dir, freeze > 0 ? 0 : e.t, false); if (freeze > 0) { g.fillStyle = 'rgba(160,210,255,.35)'; g.fillRect(p.x - 14, p.y - 26, 28, 26); } }
        else drawGhost(p.x, p.y, e.t, dir, freeze > 0);
      }

      if (state === 'dead') {
        const p = pos(P);
        g.save(); g.translate(p.x, p.y + P.dy - 10); g.rotate(Math.PI); drawMouse(0, -10, P.face, 0, false); g.restore();
      } else if (!(P.inv > 0 && state === 'play' && ((P.inv * 12) | 0) % 2 === 0)) {
        const p = pos(P);
        let a = 1, sink = 0;
        if (P.anim) {
          const k = P.anim.t / P.anim.dur;
          if (P.anim.type === 'door') a = P.anim.phase === 'in' ? 1 - k : k;
          else sink = P.anim.phase === 'in' ? k * 26 : 0;
        }
        g.save(); g.globalAlpha = a;
        if (P.anim && P.anim.type === 'pipe') {
          if (P.anim.phase === 'in') { g.beginPath(); g.rect(0, 0, W, p.y - 22); g.clip(); drawMouse(p.x, p.y + sink, P.face, 0, false); }
          else { const k = P.anim.t / P.anim.dur; drawMouse(p.x, Y(P.f) - FH + 30 + (FH - 30) * k * k, P.face, 0, false); }
        } else drawMouse(p.x, p.y, P.face, P.walk, !!P.st, P.jy > 0);
        g.restore();
        if (P.star > 0) { g.strokeStyle = `hsla(${(time * 400) % 360},90%,65%,.8)`; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y - 12, 16, 0, 7); g.stroke(); }
      }
      // tubo d'ingresso davanti al topo che ci scende dentro
      if (P.anim && P.anim.type === 'pipe' && P.anim.phase === 'in') { const p = pipes.find(o => o.f === P.f && Math.abs(o.x - P.x) < 1); if (p) drawPipeIn(p); }

      parts.forEach(p => { g.globalAlpha = Math.min(1, p.t * 2.5); g.fillStyle = p.c; g.fillRect(p.x - 2, p.y - 2, 4, 4); });
      g.globalAlpha = 1;

      // intestazione
      g.fillStyle = '#1a1633'; g.fillRect(0, 0, W, 32);
      text('CHIAVI ' + got + '/' + need, 8, 9, 14, 'left', got >= need ? '#7bdc72' : '#eef1ff');
      text('Q' + level, 136, 9, 14);
      text(String(score), 176, 9, 14, 'left', '#f5d31c');
      R(246, 5, 22, 22, '#2a2352'); if (P.item) drawItem(P.item, 257, 16);
      for (let i = 0; i < lives; i++) { g.fillStyle = '#e5413b'; g.beginPath(); g.arc(W - 14 - i * 18, 16, 6, 0, 7); g.fill(); }
      if (msgT > 0) text(msg, W / 2, 46, 16, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
      if (state === 'win') banner(['BRAVO!', 'QUADRO ' + (level + 1)]);
      if (state === 'intro') {
        const w = 316, h = hint ? 92 : 62, x = (W - w) / 2, y = (H - h) / 2;
        g.fillStyle = '#eef1ff'; g.fillRect(x, y, w, h);
        g.fillStyle = '#141a2e'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
        text('QUADRO ' + level, W / 2, y + 12, 22, 'center');
        if (hint) text(hint, W / 2, y + 52, 11, 'center', '#f5d31c');
        text(need + ' CHIAVI', W / 2, y + (hint ? 70 : 42), 11, 'center', '#aab3d8');
      }
    };

    gen(1); resetPlayer();
    return {
      onPress: act,
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update,
      render,
      debug: { newGame, gen, build, get state() { return state; }, get P() { return P; }, get keys() { return keys; }, get foes() { return foes; }, get stairs() { return stairs; }, get pipes() { return pipes; }, get doors() { return doors; }, get walls() { return walls; }, get items() { return items; }, get crates() { return crates; }, get exit() { return exit; }, get need() { return need; }, get got() { return got; }, LEVELS, Y, X, pos },
    };
  },
});

registerGame({
  id: 'chef-panino',
  title: 'CHEF PANINO',
  color: '#e5a13b',
  blurb: 'Cammina sopra pane, insalata e polpetta per farli cadere di piano in piano fino ai piatti. Pomodoro, fungo e peperoncino ti inseguono: schiacciali sotto gli strati o fermali con il pepe.',
  inputs: ['D-PAD', 'A/B PEPE'],
  size: [352, 576],
  bg: '#141a2e',
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    // 7 piani (0 in alto) e scale verticali. Le colonne sono di 16 px: X(c) è il centro della colonna c (1..20).
    const FLOORS = 7, X = c => c * 16 + 8, Y = f => 82 + f * 62, PLATE = 548, LH = 8, HALF = 24, SEG = 12;
    const BURGERS = [56, 136, 216, 296];
    const KINDS = ['top', 'salad', 'meat', 'bottom'];

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, stateT = 0, msg = '', msgT = 0, time = 0;
    let parts = [], floats = [];
    const burst = (x, y, c, n) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 40 + Math.random() * 90; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, t: 0.5 + Math.random() * 0.4, c }); } };
    const award = (n, x, y) => { score += n; floats.push({ s: String(n), x, y, t: 1 }); };
    let spans, ladders, layers, plates, foes, P, pepper, clouds, bonus, spawns, dropped;

    // Cucine disegnate a mano. spans: tratti di pavimento per piano, in pixel. ladders [colonna, piano alto, piano basso].
    // burgers: per ognuno dei 4 panini, i piani di pane sopra, insalata, polpetta e pane sotto.
    const FULL = [[24, 328]];
    const MAPS = [
      { spans: [FULL, FULL, FULL, FULL, FULL, FULL, FULL],
        ladders: [[1, 0, 6], [20, 0, 6], [5, 0, 3], [5, 4, 6], [10, 1, 5], [11, 0, 1], [15, 0, 2], [16, 3, 6], [11, 5, 6]],
        burgers: [[0, 2, 4, 6], [1, 2, 3, 5], [0, 1, 4, 5], [1, 3, 4, 6]] },
      { spans: [FULL, [[24, 184]], [[168, 328]], FULL, [[24, 248]], [[104, 328]], FULL],
        ladders: [[1, 0, 1], [1, 3, 6], [20, 0, 3], [20, 5, 6], [10, 1, 3], [10, 4, 6], [5, 0, 1], [5, 3, 6], [15, 2, 5], [16, 5, 6]],
        burgers: [[0, 1, 4, 6], [0, 3, 5, 6], [0, 2, 4, 5], [2, 3, 5, 6]] },
      { spans: [FULL, FULL, [[24, 120], [152, 328]], FULL, [[24, 200], [232, 328]], FULL, FULL],
        ladders: [[1, 0, 4], [1, 5, 6], [20, 0, 2], [20, 3, 6], [6, 1, 3], [6, 4, 5], [10, 0, 1], [10, 2, 5], [15, 1, 4], [15, 5, 6], [11, 5, 6]],
        burgers: [[0, 1, 3, 5], [0, 1, 5, 6], [0, 3, 5, 6], [1, 2, 4, 6]] },
    ];
    const mirror = m => ({
      spans: m.spans.map(s => s.map(([a, b]) => [W - b, W - a]).reverse()),
      ladders: m.ladders.map(([c, a, b]) => [21 - c, a, b]),
      burgers: m.burgers.slice().reverse(),
    });
    const mapFor = lv => { const i = (lv - 1) % 6, m = MAPS[i % 3]; return i >= 3 ? mirror(m) : m; };

    const covers = (f, x0, x1) => spans[f].some(([a, b]) => a <= x0 && b >= x1);
    const spanAt = (f, x) => spans[f].find(([a, b]) => x >= a - 0.5 && x <= b + 0.5);

    const build = lv => {
      const m = mapFor(lv);
      spans = m.spans;
      ladders = m.ladders.map(([c, a, b]) => ({ x: X(c), top: a, bot: b }));
      layers = [];
      m.burgers.forEach((fs, b) => fs.forEach((f, k) => layers.push({ b, kind: KINDS[k], x: BURGERS[b], f, y: Y(f), segs: [0, 0, 0, 0], segT: [-9, -9, -9, -9], land: -9, fall: false, vy: 0, to: null, riders: 0, onPlate: false })));
      plates = BURGERS.map(() => 0);
      spawns = [{ f: 0, x: spans[0][0][0], dir: 1 }, { f: 0, x: spans[0][spans[0].length - 1][1], dir: -1 },
                { f: FLOORS - 1, x: spans[FLOORS - 1][0][0], dir: 1 }, { f: FLOORS - 1, x: spans[FLOORS - 1][spans[FLOORS - 1].length - 1][1], dir: -1 }];
      dropped = 0; bonus = null;
    };

    const kinds = ['tomato', 'mushroom', 'chili'];
    const makeFoes = () => {
      const n = Math.min(3 + ((level - 1) >> 1), 6);
      foes = [];
      for (let i = 0; i < n; i++) foes.push({ type: kinds[i % 3], wait: 1.2 + i * 1.6, alive: false, stun: 0, ride: null, dead: 0 });
    };
    const spawnFoe = e => {
      const s = spawns[(Math.random() * spawns.length) | 0];
      Object.assign(e, { alive: true, x: s.x, y: Y(s.f), f: s.f, lad: null, dx: s.dir, dy: 0, stun: 0, ride: null, t: Math.random() * 6 });
    };
    const resetPlayer = () => {
      const f = FLOORS - 1;
      P = { x: W / 2, y: Y(f), f, lad: null, face: 1, walk: 0, vdir: 1, inv: 1 };
      clouds = [];
      foes.forEach((e, i) => { e.alive = false; e.ride = null; e.wait = 1.4 + i * 1.4; });
    };
    let introT = 0;
    const intro = () => { state = 'intro'; introT = 1.6; };
    const startLevel = () => { build(level); pepper = Math.max(pepper, 5); makeFoes(); resetPlayer(); intro(); };
    const saved = () => api.store.get('stage', 1);
    const newGame = (from = 1) => { score = 0; lives = 3; level = from; pepper = 5; startLevel(); };
    const endGame = () => { state = 'over'; parts = []; if (score > hi) { hi = score; api.store.set('hi', hi); } };
    const flash = s => { msg = s; msgT = 1.3; };
    const die = () => {
      if (state !== 'play' || P.inv > 0) return;
      state = 'dead'; stateT = 1.6; lives--; api.haptic(60); api.beep(160, 0.35, 'sawtooth', 0.06);
    };

    // Movimento sul reticolo di pavimenti e scale, comune al cuoco e ai nemici.
    // Restituisce le mosse possibili da qui: 'l', 'r', 'u', 'd'.
    const ladderAt = (x, f, dir) => ladders.find(l => Math.abs(l.x - x) < 0.5 && (dir < 0 ? l.top < f && l.bot >= f : l.bot > f && l.top <= f));
    const floorOnLadder = (l, y) => { for (let f = l.top; f <= l.bot; f++) if (Math.abs(Y(f) - y) < 0.5 && spanAt(f, l.x)) return f; return -1; };
    const options = o => {
      const out = [];
      if (o.lad) {
        if (o.y > Y(o.lad.top) + 0.5) out.push('u');
        if (o.y < Y(o.lad.bot) - 0.5) out.push('d');
        const f = floorOnLadder(o.lad, o.y);
        if (f >= 0) { const s = spanAt(f, o.x); if (o.x > s[0] + 0.5) out.push('l'); if (o.x < s[1] - 0.5) out.push('r'); }
      } else {
        const s = spanAt(o.f, o.x);
        if (o.x > s[0] + 0.5) out.push('l');
        if (o.x < s[1] - 0.5) out.push('r');
        if (ladderAt(o.x, o.f, -1)) out.push('u');
        if (ladderAt(o.x, o.f, 1)) out.push('d');
      }
      return out;
    };
    // Muove o di "d" pixel nella direzione m, fermandosi al primo incrocio. Restituisce i pixel non usati.
    const step = (o, m, d) => {
      if (m === 'u' || m === 'd') {
        const dir = m === 'u' ? -1 : 1;
        if (!o.lad) { o.lad = ladderAt(o.x, o.f, dir); if (!o.lad) return 0; o.x = o.lad.x; }
        let ny = o.y + dir * d;
        // il prossimo piano lungo la scala
        let stop = null;
        for (let f = o.lad.top; f <= o.lad.bot; f++) {
          const fy = Y(f);
          if (!spanAt(f, o.lad.x) && f !== o.lad.top && f !== o.lad.bot) continue;
          if (dir > 0 ? fy > o.y + 0.5 && fy <= ny : fy < o.y - 0.5 && fy >= ny) { if (stop === null || Math.abs(fy - o.y) < Math.abs(stop - o.y)) stop = fy; }
        }
        if (stop !== null) { const rest = d - Math.abs(stop - o.y); o.y = stop; o.f = floorOnLadder(o.lad, o.y); return rest; }
        o.y = ny; o.f = -1; return 0;
      }
      const dir = m === 'l' ? -1 : 1;
      if (o.lad) { const f = floorOnLadder(o.lad, o.y); if (f < 0) return 0; o.f = f; o.lad = null; }
      const s = spanAt(o.f, o.x);
      let nx = Math.max(s[0], Math.min(s[1], o.x + dir * d));
      // incroci con le scale
      for (const l of ladders) {
        if (l.top > o.f || l.bot < o.f || (l.top === o.f && l.bot === o.f)) continue;
        if (dir > 0 ? l.x > o.x + 0.5 && l.x < nx : l.x < o.x - 0.5 && l.x > nx) nx = l.x;
      }
      const rest = d - Math.abs(nx - o.x);
      o.x = nx;
      return nx === s[0] || nx === s[1] || ladders.some(l => Math.abs(l.x - nx) < 0.5) ? rest : 0;
    };
    // Per il cuoco: se si chiede di salire o scendere vicino a una scala, ci si aggancia da soli.
    const snapLadder = (o, dir) => {
      if (o.lad) return true;
      const l = ladders.find(l => Math.abs(l.x - o.x) < 10 && (dir < 0 ? l.top < o.f && l.bot >= o.f : l.bot > o.f && l.top <= o.f));
      if (l) { o.x = l.x; return true; }
      return false;
    };

    const movePlayer = dt => {
      const sp = 72;
      const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      let want = null;
      if (dy && (P.lad || snapLadder(P, dy))) want = dy < 0 ? 'u' : 'd';
      if (dx && (!want || (P.lad && options(P).includes(dx < 0 ? 'l' : 'r')))) want = dx < 0 ? 'l' : 'r';
      // su una scala, a metà, la croce orizzontale non fa nulla: si continua a salire o scendere se richiesto
      if (want === 'l' || want === 'r') {
        if (P.lad && !options(P).includes(want)) want = dy ? (dy < 0 ? 'u' : 'd') : null;
      }
      if (!want) return;
      if (want === 'l' || want === 'r') P.face = want === 'l' ? -1 : 1; else P.vdir = want === 'u' ? -1 : 1;
      P.walk += dt * 10;
      let d = sp * dt;
      for (let k = 0; k < 3 && d > 0.01; k++) {
        if (!options(P).includes(want)) break;
        d = step(P, want, d);
      }
    };

    const chase = e => {
      const opts = options(e);
      if (!opts.length) return null;
      const back = e.dx < 0 ? 'r' : e.dx > 0 ? 'l' : e.dy < 0 ? 'd' : 'u';
      let pool = opts.length > 1 ? opts.filter(o => o !== back) : opts;
      if (Math.random() < 0.18) return pool[(Math.random() * pool.length) | 0];
      const tx = P.x, ty = P.y;
      const score = o => {
        if (o === 'u') return ty < e.y - 4 ? 3 : -1;
        if (o === 'd') return ty > e.y + 4 ? 3 : -1;
        if (o === 'l') return tx < e.x ? 2 : 0;
        return tx > e.x ? 2 : 0;
      };
      pool = pool.slice().sort((a, b) => score(b) - score(a));
      return pool[0];
    };
    const moveFoe = (e, dt) => {
      e.t += dt;
      if (!e.alive) { e.wait -= dt; if (e.wait <= 0) spawnFoe(e); return; }
      if (e.ride) { e.x = Math.max(e.ride.x - 18, Math.min(e.ride.x + 18, e.x)); e.y = e.ride.y; return; }
      if (e.stun > 0) { e.stun -= dt; return; }
      const sp = (e.type === 'chili' ? 50 : e.type === 'mushroom' ? 40 : 44) + Math.min(level, 10) * 2.5;
      let d = sp * dt;
      for (let k = 0; k < 3 && d > 0.01; k++) {
        let m = e.dx < 0 ? 'l' : e.dx > 0 ? 'r' : e.dy < 0 ? 'u' : 'd';
        const opts = options(e);
        const atNode = e.lad ? floorOnLadder(e.lad, e.y) >= 0 : ladders.some(l => Math.abs(l.x - e.x) < 0.5 && l.top <= e.f && l.bot >= e.f) || !opts.includes(m);
        if (atNode && !e.justTurned) { m = chase(e); if (!m) return; e.justTurned = true; }
        if (!opts.includes(m)) { m = chase(e); if (!m) return; }
        e.dx = m === 'l' ? -1 : m === 'r' ? 1 : 0; e.dy = m === 'u' ? -1 : m === 'd' ? 1 : 0;
        const before = e.x + e.y;
        d = step(e, m, d);
        if (e.x + e.y !== before) e.justTurned = false;
      }
    };
    const kill = (e, pts) => {
      e.alive = false; e.ride = null; e.wait = 4 + Math.random() * 2;
      award(pts, e.x, e.y - 30); burst(e.x, e.y - 10, foeColor(e.type), 14); api.haptic(20); api.beep(1100, 0.08, 'square', 0.05);
    };

    // Strati del panino: si cammina sopra per segnarli, poi cadono di un piano (o nel piatto).
    const dropLayer = L => {
      if (L.fall || L.onPlate) return;
      L.fall = true; L.vy = 60; L.segs = [0, 0, 0, 0];
      let nf = -1;
      for (let f = L.f + 1; f < FLOORS; f++) if (covers(f, L.x - HALF, L.x + HALF)) { nf = f; break; }
      L.to = nf;
      // i nemici in piedi sullo strato cadono con lui
      L.riders = 0;
      for (const e of foes) if (e.alive && !e.lad && e.f === L.f && Math.abs(e.x - L.x) < HALF + 4 && !e.ride) { e.ride = L; L.riders++; }
      api.beep(300, 0.08, 'triangle', 0.05);
    };
    const updateLayers = dt => {
      if (state === 'play' && !P.lad && P.f >= 0) {
        for (const L of layers) {
          if (L.fall || L.onPlate || L.f !== P.f || Math.abs(P.x - L.x) > HALF) continue;
          const s = Math.min(3, Math.max(0, Math.floor((P.x - (L.x - HALF)) / SEG)));
          if (!L.segs[s]) { L.segs[s] = 1; L.segT[s] = time; api.beep(500 + s * 60, 0.03, 'square', 0.03); }
          if (L.segs.every(Boolean)) { dropLayer(L); award(50, L.x, L.y - 20); }
        }
      }
      for (const L of layers) {
        if (!L.fall) continue;
        L.vy = Math.min(L.vy + 900 * dt, 360);
        const prev = L.y;
        L.y += L.vy * dt;
        // schiaccia chi sta sotto
        for (const e of foes) {
          if (!e.alive || e.ride === L || e.stun < 0) continue;
          if (Math.abs(e.x - L.x) < HALF && e.y - 20 < L.y && e.y > prev) kill(e, 500);
        }
        const target = L.to >= 0 ? Y(L.to) : PLATE - plates[L.b] * LH;
        if (L.y >= target) {
          L.y = target; L.fall = false; L.vy = 0; L.land = time;
          if (L.to >= 0) {
            L.f = L.to;
            const under = layers.find(o => o !== L && !o.fall && !o.onPlate && o.b === L.b && o.f === L.f);
            if (under) dropLayer(under);
            api.beep(220, 0.06, 'triangle', 0.05);
          } else {
            L.onPlate = true; L.f = -1; plates[L.b]++; dropped++;
            api.haptic(15); api.beep(660, 0.1, 'square', 0.05); burst(L.x, L.y - 4, '#f5d31c', 8);
            if (dropped === 6 && !bonus) bonus = { x: W / 2, f: 3, t: 9 };
            if (plates[L.b] === 4) {
              // panino finito: tutta la pila rimbalza, coriandoli e scritta
              layers.forEach(o => { if (o.b === L.b) o.land = time + (3 - KINDS.indexOf(o.kind)) * 0.05; });
              api.fx.burst(L.x, L.y - 20, { n: 26, color: ['#f5d31c', '#4cc24a', '#e5413b', '#ffffff'], speed: 170, gravity: 320, life: 0.9, angle: -Math.PI / 2, spread: 2.4 });
              api.fx.text(L.x, L.y - 44, 'PANINO!', { size: 12, color: '#f5d31c', life: 1 });
            }
          }
          // chi cavalcava lo strato
          for (const e of foes) if (e.ride === L) kill(e, L.riders > 1 ? 2000 : 1000);
          L.riders = 0;
        }
      }
    };

    const throwPepper = () => {
      if (pepper <= 0) { flash('PEPE FINITO'); return; }
      pepper--;
      const cx = P.lad ? P.x : P.x + P.face * 24, cy = P.lad ? P.y - 10 + P.vdir * 28 : P.y - 12;
      clouds.push({ x: cx, y: cy, t: 0.45 });
      api.haptic(8); api.beep(1400, 0.05, 'triangle', 0.04);
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.t -= dt; });
      parts = parts.filter(p => p.t > 0);
      floats.forEach(f => { f.t -= dt; f.y -= 24 * dt; });
      floats = floats.filter(f => f.t > 0);
      if (state === 'intro') { introT -= dt; if (introT <= 0) state = 'play'; return; }
      if (state === 'play') {
        P.inv = Math.max(0, P.inv - dt);
        movePlayer(dt);
        updateLayers(dt);
        for (const c of clouds) {
          c.t -= dt;
          for (const e of foes) if (e.alive && !e.ride && Math.abs(e.x - c.x) < 22 && Math.abs(e.y - 10 - c.y) < 22) { if (e.stun <= 0) award(100, e.x, e.y - 30); e.stun = 3.2; }
        }
        clouds = clouds.filter(c => c.t > 0);
        for (const e of foes) {
          moveFoe(e, dt);
          if (!e.alive || e.ride || e.stun > 0) continue;
          if (Math.abs(e.x - P.x) < 12 && Math.abs(e.y - P.y) < 14) die();
        }
        if (bonus) {
          bonus.t -= dt;
          if (bonus.t <= 0) bonus = null;
          else if (!P.lad && P.f === bonus.f && Math.abs(P.x - bonus.x) < 12) { pepper++; award(500, bonus.x, Y(bonus.f) - 30); flash('+1 PEPE'); api.beep(1300, 0.15, 'sine', 0.05); bonus = null; }
        }
        if (layers.every(L => L.onPlate)) {
          state = 'win'; stateT = 2.2; award(1000, W / 2, H / 2); api.haptic(35);
          [660, 880, 1046, 1318].forEach((f, i) => setTimeout(() => api.beep(f, 0.12), i * 110));
        }
      } else if (state === 'dead') {
        stateT -= dt;
        if (stateT <= 0) { if (lives <= 0) endGame(); else { resetPlayer(); state = 'play'; } }
      } else if (state === 'win') {
        stateT -= dt;
        if (stateT <= 0) { level++; if (level > saved()) api.store.set('stage', level); startLevel(); }
      }
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame(saved());
        else if (state === 'intro') state = 'play';
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
      } else if (k === 'select') {
        if (state === 'title') { api.store.set('stage', 1); newGame(1); }
        else if (state === 'over') newGame(1);
      } else if ((k === 'a' || k === 'b') && state === 'play') throwPepper();
    };
    const onPointer = e => { if (e.type === 'down' && (state === 'title' || state === 'over')) newGame(saved()); };

    // Disegno
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const circ = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
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
    const foeColor = t => t === 'tomato' ? '#e5413b' : t === 'mushroom' ? '#d8c8b0' : '#ff6a2a';

    // Strato del panino: (x, y) = centro in basso. segs abbassa i pezzi già calpestati.
    // Sfumature degli strati, create una volta in coordinate locali (lo strato si disegna con l'origine in (x, y)).
    const lgr = (y0, y1, a, b) => { const k = g.createLinearGradient(0, y0, 0, y1); k.addColorStop(0, a); k.addColorStop(1, b); return k; };
    const GR = { bun: lgr(-LH - 4, 0, '#f2b45e', '#c4742c'), meat: lgr(-LH, 0, '#94502e', '#5a2a14'), salad: lgr(-LH + 2, 0, '#62d454', '#2f9a34'), bottom: lgr(-LH, 0, '#e8a04a', '#b86a28') };
    // Rimbalzo: lo strato si schiaccia e torna su oscillando dopo l'atterraggio; il pezzo calpestato affonda e risale un poco.
    const squash = t => { const u = time - t; return u >= 0 && u < 0.6 ? 0.28 * Math.exp(-u * 7) * Math.cos(u * 22) : 0; };
    const dip = t => { const u = time - t; return u >= 0 && u < 0.4 ? 2.5 * Math.exp(-u * 9) * Math.cos(u * 26) : 0; };
    const drawLayer = (kind, x, y, segs, L) => {
      const a = L ? squash(L.land) : 0;
      g.save(); g.translate(x, y); if (a) g.scale(1 + a * 0.5, 1 - a);
      layerBody(kind, segs, L);
      g.restore();
    };
    const layerBody = (kind, segs, L) => {
      const x = 0, y = 0;
      for (let s = 0; s < 4; s++) {
        const x0 = x - HALF + s * SEG, yy = y - LH + (segs && segs[s] ? 3 + (L ? dip(L.segT[s]) : 0) : 0), first = s === 0, last = s === 3;
        if (kind === 'top') {
          g.fillStyle = GR.bun; g.beginPath();
          if (first) { g.moveTo(x0 + SEG, yy - 4); g.quadraticCurveTo(x0, yy - 4, x0, yy + LH); g.lineTo(x0 + SEG, yy + LH); }
          else if (last) { g.moveTo(x0, yy - 4); g.quadraticCurveTo(x0 + SEG, yy - 4, x0 + SEG, yy + LH); g.lineTo(x0, yy + LH); }
          else g.rect(x0, yy - 4, SEG, LH + 4);
          g.fill();
          if (!first && !last) { R(x0 + 3, yy - 1, 2, 1, '#fff2c8'); R(x0 + 8, yy + 1, 2, 1, '#fff2c8'); }
          R(x0, yy + LH - 2, SEG, 2, '#b06a2a');
        } else if (kind === 'salad') {
          R(x0, yy + 2, SEG, LH - 2, GR.salad);
          for (let k = 0; k < SEG; k += 4) circ(x0 + k + 2, yy + 3, 2.4, '#7be06a');
        } else if (kind === 'meat') {
          g.fillStyle = GR.meat; g.beginPath(); g.roundRect(x0 - (first ? 0 : 1), yy, SEG + (first || last ? 1 : 2), LH, first ? [4, 0, 0, 4] : last ? [0, 4, 4, 0] : 0); g.fill();
          R(x0 + 2, yy + 2, 3, 1, '#a85a32'); R(x0 + 7, yy + 5, 3, 1, '#a85a32');
        } else {
          g.fillStyle = GR.bottom; g.beginPath(); g.roundRect(x0, yy, SEG, LH, first ? [0, 0, 0, 5] : last ? [0, 0, 5, 0] : 0); g.fill();
          R(x0, yy, SEG, 2, '#f0b060');
        }
      }
    };
    const drawChef = (x, y, face, walk, climb) => {
      const step = climb ? 0 : Math.sin(walk * Math.PI) * 2;
      g.save(); g.translate(x, y);
      if (!climb) g.scale(face, 1);
      R(-6 + step, -5, 4, 5, '#2a2a3a'); R(2 - step, -5, 4, 5, '#2a2a3a');            // scarpe e gambe
      g.fillStyle = '#eef1ff'; g.beginPath(); g.roundRect(-7, -17, 14, 13, 3); g.fill(); // giacca
      R(-5, -12, 10, 8, '#3a7ad8');                                                    // grembiule
      circ(0, -21, 6, '#f2c8a0');                                                      // testa
      if (!climb) { R(2, -23, 2, 2, '#1a1633'); R(1, -18, 4, 1.5, '#8a3a2a'); }        // occhio e baffo
      g.fillStyle = '#ffffff'; g.beginPath(); g.roundRect(-6, -30, 12, 6, 2); g.fill(); // cappello
      circ(-3, -31, 4, '#ffffff'); circ(3, -31, 4, '#ffffff'); circ(0, -33, 4, '#ffffff');
      const arm = climb ? Math.sin(walk * Math.PI) * 3 : 0;
      R(-9, -15 + arm, 3, 7, '#eef1ff'); R(6, -15 - arm, 3, 7, '#eef1ff');
      g.restore();
    };
    const drawFoe = e => {
      const x = e.x, y = e.y, bob = e.stun > 0 ? 0 : Math.abs(Math.sin(e.t * 8)) * 2, dir = e.dx || 1;
      g.save();
      if (e.stun > 0) g.globalAlpha = 0.6 + Math.sin(time * 20) * 0.3;
      const legs = () => { R(x - 6, y - 4, 3, 4, '#1a1633'); R(x + 3, y - 4, 3, 4, '#1a1633'); };
      const eyes = (ey, c) => { circ(x - 3 + dir, ey, 2.6, '#fff'); circ(x + 4 + dir, ey, 2.6, '#fff'); circ(x - 3 + dir * 2, ey, 1.2, c || '#1a1633'); circ(x + 4 + dir * 2, ey, 1.2, c || '#1a1633'); };
      if (e.type === 'tomato') {
        legs(); circ(x, y - 12 - bob, 9, '#e5413b'); circ(x - 3, y - 15 - bob, 2.5, '#ff8a7a');
        g.fillStyle = '#3a9a3a'; for (let k = 0; k < 5; k++) { const a = k * 1.256 - 1.57; g.beginPath(); g.ellipse(x + Math.cos(a) * 3, y - 21 - bob + Math.sin(a) * 1.5, 3, 1.4, a, 0, 7); g.fill(); }
        eyes(y - 13 - bob);
      } else if (e.type === 'mushroom') {
        legs(); R(x - 5, y - 13 - bob, 10, 10, '#f2e6d0');
        g.fillStyle = '#c84a3a'; g.beginPath(); g.ellipse(x, y - 14 - bob, 11, 8, 0, Math.PI, 0); g.fill();
        circ(x - 5, y - 18 - bob, 1.8, '#fff'); circ(x + 3, y - 20 - bob, 2, '#fff'); circ(x + 7, y - 16 - bob, 1.4, '#fff');
        eyes(y - 9 - bob);
      } else {
        legs(); g.fillStyle = '#ff6a2a'; g.beginPath(); g.ellipse(x, y - 12 - bob, 6, 10, dir * 0.25, 0, 7); g.fill();
        R(x - 1, y - 25 - bob, 3, 4, '#3a9a3a'); R(x - 3, y - 23 - bob, 7, 2, '#3a9a3a');
        eyes(y - 14 - bob, '#5a0a0a'); R(x - 4 + dir, y - 18 - bob, 4, 1, '#5a0a0a'); R(x + 2 + dir, y - 18 - bob, 4, 1, '#5a0a0a');
      }
      if (e.stun > 0) for (let k = 0; k < 3; k++) { const a = time * 5 + k * 2.1; circ(x + Math.cos(a) * 10, y - 28 + Math.sin(a) * 3, 1.6, '#f5d31c'); }
      g.restore();
    };

    const render = () => {
      g.fillStyle = '#141a2e'; g.fillRect(0, 0, W, H);

      if (state === 'title') {
        text('CHEF', W / 2, 80, 46, 'center', '#e5a13b'); text('PANINO', W / 2, 132, 46, 'center');
        drawLayer('top', W / 2, 228); drawLayer('salad', W / 2, 238); drawLayer('meat', W / 2, 248); drawLayer('bottom', W / 2, 258);
        g.save(); g.translate(W / 2 - 70, 330); g.scale(2.4, 2.4); drawChef(0, 0, 1, time * 4, false); g.restore();
        ['tomato', 'mushroom', 'chili'].forEach((t, i) => { g.save(); g.translate(W / 2 + 10 + i * 36, 330); g.scale(1.6, 1.6); drawFoe({ type: t, x: 0, y: 0, t: time + i, stun: 0, dx: -1 }); g.restore(); });
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 368, 16, 'center', '#f5d31c');
        text('CAMMINA SUGLI STRATI PER FARLI CADERE', W / 2, 408, 11, 'center', '#aab3d8');
        text('A/B: PEPE CONTRO I NEMICI', W / 2, 426, 11, 'center', '#aab3d8');
        if (saved() > 1) { text('TOCCA: CONTINUA DAL LIVELLO ' + saved(), W / 2, 448, 12, 'center', '#7bdc72'); text('SELECT: RICOMINCIA', W / 2, 468, 11, 'center', '#aab3d8'); }
        text('RECORD ' + hi, W / 2, saved() > 1 ? 494 : 470, 13, 'center');
        return;
      }

      // scale, poi pavimenti
      for (const l of ladders) {
        const y0 = Y(l.top), y1 = Y(l.bot);
        R(l.x - 8, y0, 2, y1 - y0, '#5a8ae8'); R(l.x + 6, y0, 2, y1 - y0, '#5a8ae8');
        for (let y = y0 + 6; y < y1; y += 8) R(l.x - 8, y, 16, 2, '#3a5ab8');
      }
      for (let f = 0; f < FLOORS; f++) for (const [a, b] of spans[f]) { R(a - 10, Y(f), b - a + 20, 4, '#3a7ad8'); R(a - 10, Y(f) + 4, b - a + 20, 2, '#1e3a7a'); }
      // piatti
      for (const x of BURGERS) { R(x - 30, PLATE, 60, 4, '#d8dcef'); R(x - 26, PLATE + 4, 52, 3, '#8a90b0'); }
      for (const L of layers) drawLayer(L.kind, L.x, L.y, L.fall || L.onPlate ? null : L.segs, L);
      if (bonus && (bonus.t > 2 || ((bonus.t * 8) | 0) % 2)) {
        const x = bonus.x, y = Y(bonus.f);
        g.fillStyle = '#f2e6d0'; g.beginPath(); g.moveTo(x - 6, y - 16); g.lineTo(x + 6, y - 16); g.lineTo(x, y - 2); g.fill();
        circ(x, y - 18, 6, '#ff9ac8'); circ(x - 2, y - 20, 2, '#fff');
      }
      foes.forEach(e => { if (e.alive) drawFoe(e); });
      for (const c of clouds) { g.globalAlpha = Math.min(1, c.t * 3); for (let k = 0; k < 6; k++) circ(c.x + Math.cos(k * 1.05 + time * 3) * 9, c.y + Math.sin(k * 1.05 + time * 3) * 6, 5, '#eef1ff'); g.globalAlpha = 1; }
      if (state === 'dead') {
        const k = 1 - stateT / 1.6;
        g.save(); g.translate(P.x, P.y - 14); g.rotate(k * 12); drawChef(0, 14, 1, 0, false); g.restore();
      } else if (!(P.inv > 0 && ((P.inv * 12) | 0) % 2 === 0)) drawChef(P.x, P.y, P.face, P.walk, !!P.lad && floorOnLadder(P.lad, P.y) < 0);

      parts.forEach(p => { g.globalAlpha = Math.min(1, p.t * 2.5); g.fillStyle = p.c; g.fillRect(p.x - 2, p.y - 2, 4, 4); });
      g.globalAlpha = 1;
      floats.forEach(f => text(f.s, f.x, f.y, 12, 'center', '#f5d31c'));

      // intestazione
      g.fillStyle = '#141a2e'; g.fillRect(0, 0, W, 36);
      text(String(score), 8, 10, 15, 'left', '#f5d31c');
      text('LIV ' + level, 120, 10, 14);
      text('PEPE ' + pepper, 192, 10, 14, 'left', pepper ? '#eef1ff' : '#ff6a5e');
      for (let i = 0; i < lives; i++) { g.save(); g.translate(W - 16 - i * 18, 30); g.scale(0.6, 0.6); drawChef(0, 0, 1, 0, false); g.restore(); }
      if (msgT > 0) text(msg, W / 2, 42, 16, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
      if (state === 'win') banner(['PANINI PRONTI!', 'LIVELLO ' + (level + 1)]);
      if (state === 'intro') banner(['LIVELLO ' + level, 'PEPE ' + pepper]);
    };

    level = 1; pepper = 5; build(1); makeFoes(); resetPlayer();
    return {
      onPress: act,
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update,
      render,
      debug: { newGame, build, get state() { return state; }, get P() { return P; }, get foes() { return foes; }, get layers() { return layers; }, get ladders() { return ladders; }, get spans() { return spans; }, get level() { return level; }, set level(v) { level = v; }, startLevel, options, step, X, Y, MAPS, mapFor },
    };
  },
});

registerGame({
  id: 'brick-rush',
  title: 'BRICK RUSH',
  color: '#e5413b',
  blurb: 'Rompi tutti i mattoncini con la palla. Dai mattoni cadono capsule: S rallenta, C attacca la palla, E allarga, D fa tre palle, L spara laser, B apre l\'uscita, P una vita. I mattoni d\'argento vogliono più colpi, quelli d\'oro non si rompono. Trascina per muovere, tocca per lanciare.',
  inputs: ['TRASCINA', 'TOCCO: LANCIO / LASER'],
  size: [360, 640],
  bg: '#0b1020',
  flexH: true,
  create(api) {
    const { cv, g, held } = api;
    let W = cv.width, H = cv.height;
    const PAD_H = 12, R = 5.5, COLS = 13, BH = 13, TOP = 78, WALL_T = 56, SIDE = 10;
    let PAD_Y = H - 78, BW = (W - SIDE * 2) / COLS;

    // Colori e punteggi (w bianco, o arancio, c azzurro, g verde, r rosso, b blu, m viola, y giallo, s argento, G oro)
    const BR = {
      w: ['#eef1ff', 50], o: ['#f58a25', 60], c: ['#25c4f0', 70], g: ['#4cc24a', 80], r: ['#e5413b', 90],
      b: ['#3d5fe0', 100], m: ['#e050c8', 110], y: ['#f5d31c', 120], s: ['#aab4c4', 50], G: ['#d8a82a', 0],
    };
    // 24 quadri originali: i primi dodici conservati, dodici nuove figure; poi si ricomincia.
    const LV = [
      ['sssssssssssss', 'rrrrrrrrrrrrr', 'yyyyyyyyyyyyy', 'bbbbbbbbbbbbb', 'mmmmmmmmmmmmm', 'ggggggggggggg'],
      ['......G......', '.....ooo.....', '....ccccc....', '...ggggggg...', '..rrrrrrrrr..', '.bbbbbbbbbbb.', 'mmmmmmmmmmmmm'],
      ['G.G.G.G.G.G.G', '.o.o.o.o.o.o.', 'cscscscscscsc', '.g.g.g.g.g.g.', 'rsrsrsrsrsrsr', '.b.b.b.b.b.b.', 'ymymymymymymy'],
      ['wwwwwwGwwwwww', 'oooooo.oooooo', 'ccccccGcccccc', 'gggggg.gggggg', 'rrrrrrGrrrrrr', 'bbbbbb.bbbbbb'],
      ['G.s.G.s.G.s.G', 'G.o.G.c.G.g.G', 'G.r.G.b.G.m.G', 'G.y.G.o.G.c.G', 'G.g.G.r.G.b.G', 'G.m.G.y.G.o.G'],
      ['......o......', '.....ccc.....', '....ggggg....', '...rrrrrrr...', '..bbbbbbbbb..', '...mmmmmmm...', '....yyyyy....', '.....sss.....', '......s......'],
      ['o.o.o.o.o.o.o', '.c.c.c.c.c.c.', 'g.g.g.g.g.g.g', '.r.r.r.r.r.r.', 'b.b.b.b.b.b.b', '.m.m.m.m.m.m.', 'y.y.y.y.y.y.y'],
      ['GGGGGGGGGGGGG', 'G...........G', 'G.sssssssss.G', 'G.srrrrrrrs.G', 'G.sybbbbbys.G', 'G.sssssssss.G'],
      ['rrr..........', 'yyyrrr.......', '.bbbyyyrrr...', '...mmmbbbyyy.', '......gggmmmb', '.........cccc'],
      ['GGGGGGGGGGGGG', 'GsssssssssssG', 'GsrrrrrrrrrsG', 'GsrbbbbbbbrsG', 'GsrbmmmmmbrsG', 'GsrbmyyymbrsG'],
      ['sssssssssssss', 'ogogogogogogo', 'gogogogogogog', 'rbrbrbrbrbrbr', 'brbrbrbrbrbrb', 'mymymymymymym', 'ymymymymymymy'],
      ['GG...........', 'sGG..........', 'osGG.........', 'cosGG........', 'gcosGG.......', 'rgcosGG......', 'brgcosGG.....'],
      ["......y......", ".....yyy.....", "....yyyyy....", "...oo.oo.oo..", "..cc.....cc..", ".gg.......gg.", "rrrrrrrrrrrrr"],
      ["..rrr...rrr..", ".rooor.rooor.", "rocccccccccor", "rgcccccccccgr", ".rgggggggggr.", "..rgggggggr..", "...rrrrrrr..."],
      ["..ccc...ccc..", ".ccbcc.ccbcc.", "ccbbbcccbbbcc", ".ccbcc.ccbcc.", "..ccc...ccc..", ".....sss.....", "......s......"],
      ["y...y...y...y", ".y.y.y.y.y.y.", "..y...y...y..", ".o.o.o.o.o.o.", "ccccccccccccc", "..g..g..g..g.", "rr..rr.rr..rr"],
      ["..mmm...mmm..", ".m...m.m...m.", "m..s..m..s..m", ".m...m.m...m.", "..mmm...mmm..", "....ccccc....", "...ggggggg..."],
      ["......r......", ".....ror.....", "....rcccr....", "...rgggggr...", "..rbbbbbbbr..", ".rmmmmmmmmmr.", "rrrrrr.rrrrrr"],
      ["...sss.sss...", "..sooo.ooos..", ".scccc.ccccs.", "sggggg.gggggs", "..bbbb.bbbb..", "...mmm.mmm..."],
      ["y.y.y.y.y.y.y", ".o.o.o.o.o.o.", "..c.c.c.c.c..", "...g.g.g.g...", "....r.r.r....", ".....b.b.....", "......m......"],
      [".sss.....sss.", "s...s...s...s", "s.r.s...s.r.s", "s...s...s...s", ".sss.....sss.", ".....ccc.....", "....ggggg...."],
      ["rrrr..G..rrrr", ".yyy.....yyy.", "..bbb...bbb..", "...mmm.mmm...", "....ggggg....", ".....ccc.....", "......s......"],
      ["..y..y.y..y..", ".ooo.ooo.ooo.", "ccccc...ccccc", ".ggg.ggg.ggg.", "..r..r.r..r..", "...bbbbbbb...", "....mmmmm...."],
      ["......y......", ".s...yyy...s.", "sss.yyyyy.sss", ".s.ccccccccs.", "..ggggggggg..", "...rrrrrrr...", "....bbbbb....", ".....mmm....."],
    ];
    const CAP = { S: ['#f58a25', 'RALLENTA'], C: ['#4cc24a', 'ATTACCA'], E: ['#3d5fe0', 'ALLARGA'], D: ['#25c4f0', 'TRE PALLE'], L: ['#e5413b', 'LASER'], B: ['#e050c8', 'USCITA'], P: ['#aab4c4', 'VITA'] };
    const CAPKEYS = 'SSCCEEDDLLBPP';

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, msg = '', msgT = 0, time = 0, hits = 0, nextExtra = 20000, introT = 0;
    let pad = { x: W / 2, w: 64, mode: '' }, balls = [], bricks = [], caps = [], enemies = [], bolts = [], target = null, touching = false;
    let slow = false, exitOpen = false, laserCd = 0, enemyT = 8;
    const THEMES = [
      { name: 'NEON BLU', top: '#0b1230', bottom: '#060a1c', glow: 'rgba(70,90,200,.20)', grid: 'rgba(120,140,220,.07)' },
      { name: 'TRAMONTO', top: '#321c38', bottom: '#160e25', glow: 'rgba(232,124,91,.17)', grid: 'rgba(220,150,180,.07)' },
      { name: 'ACQUAMARINA', top: '#0b2c36', bottom: '#06181f', glow: 'rgba(58,188,190,.16)', grid: 'rgba(120,220,220,.07)' },
      { name: 'AURORA', top: '#231c46', bottom: '#100e25', glow: 'rgba(177,115,231,.18)', grid: 'rgba(190,160,235,.07)' },
    ];
    const theme = () => THEMES[Math.floor((level - 1) / 6) % THEMES.length];
    const effect = (name, f = 640) => api.sound ? api.sound(name, { gain: .035, frequency: f }) : api.beep(f, .06);

    const baseSpeed = () => Math.min(400, 262 + level * 7) * Math.min(1, 0.88 + (level - 1) * 0.04);
    const ballSpeed = () => Math.min(540, baseSpeed() + Math.min(130, hits * 1.3)) * (slow ? 0.72 : 1);
    const flash = (s, t) => { msg = s; msgT = t || 1.4; };
    const burst = (x, y, c, n) => api.fx.burst(x, y, { n, color: c, speed: 160, life: 0.8, size: 4, gravity: 300, drag: 0 });
    const addScore = n => { score += n; while (score >= nextExtra) { lives = Math.min(8, lives + 1); nextExtra += nextExtra === 20000 ? 40000 : 60000; flash('VITA EXTRA'); [660, 880, 1100].forEach((f, i) => setTimeout(() => api.beep(f, 0.1, 'triangle', 0.05), i * 90)); } };

    const build = () => {
      bricks = []; const L = LV[(level - 1) % LV.length], sil = 2 + Math.floor((level - 1) / 8);
      L.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch === '.') return;
        const d = BR[ch];
        bricks.push({ x: SIDE + c * BW, y: TOP + r * (BH + 1.5), w: BW - 1.5, h: BH, k: ch, color: d[0], pts: ch === 's' ? 50 * level : d[1], hp: ch === 'G' ? 99 : ch === 's' ? sil : 1, gold: ch === 'G', flashT: 0 });
      }));
    };
    const resetBall = () => { balls = [{ x: pad.x, y: PAD_Y - R - 1, vx: 0, vy: 0, on: true, off: 0 }]; slow = false; };
    const clearPowers = () => { pad.mode = ''; pad.w = 64 + Math.max(0, 4 - level) * 4; slow = false; caps = []; bolts = []; exitOpen = false; };
    const startLevel = () => { build(); clearPowers(); resetBall(); enemies = []; enemyT = 9; introT = 1.8; };
    const saved = () => { const n = api.store.get('stage', 1); return Number.isInteger(n) && n >= 1 && n <= 1000000 ? n : 1; };
    const newGame = (from = 1) => { score = 0; lives = 3; level = from; hits = 0; nextExtra = 20000; pad.x = W / 2; state = 'play'; startLevel(); };
    const launch = () => {
      let any = false;
      balls.forEach(b => { if (!b.on) return; const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.5, s = ballSpeed(); b.vx = Math.cos(a) * s; b.vy = Math.sin(a) * s; b.on = false; any = true; });
      if (any) api.beep(520, 0.05);
    };

    const split = () => {
      const src = balls.find(b => !b.on); if (!src) return;
      const a = Math.atan2(src.vy, src.vx), s = Math.hypot(src.vx, src.vy);
      [-0.35, 0.35].forEach(o => balls.push({ x: src.x, y: src.y, vx: Math.cos(a + o) * s, vy: Math.sin(a + o) * s, on: false, off: 0 }));
    };
    const power = k => {
      api.haptic(14);
      if (k === 'P') { lives = Math.min(8, lives + 1); flash('VITA EXTRA'); }
      else if (k === 'S') { slow = true; hits = 0; flash('PALLA LENTA'); balls.forEach(b => { if (!b.on) { const s = ballSpeed(), m = Math.hypot(b.vx, b.vy) || 1; b.vx *= s / m; b.vy *= s / m; } }); }
      else if (k === 'D') { split(); flash('TRE PALLE'); }
      else if (k === 'B') { exitOpen = true; flash('USCITA APERTA!'); }
      else { pad.mode = k === 'C' ? 'catch' : k === 'L' ? 'laser' : ''; pad.w = k === 'E' ? 100 : 64; flash(CAP[k][1]); if (k !== 'C') balls.forEach(b => { if (b.on && b.stuck) { b.stuck = false; } }); }
      [740, 988].forEach((f, i) => setTimeout(() => api.beep(f, 0.07, 'triangle', 0.05), i * 70));
    };
    const normalize = b => {
      const s = ballSpeed(); let m = Math.hypot(b.vx, b.vy) || 1; b.vx *= s / m; b.vy *= s / m;
      const minV = s * 0.28; if (Math.abs(b.vy) < minV) { b.vy = (b.vy < 0 ? -1 : 1) * minV; m = Math.hypot(b.vx, b.vy); b.vx *= s / m; b.vy *= s / m; }
    };
    const hitBrick = (b, dmg) => {
      if (b.gold) { b.flashT = 0.25; effect('metal', 1500); return; }
      b.hp -= dmg;
      if (b.hp <= 0) {
        b.dead = true; addScore(b.pts); burst(b.x + b.w / 2, b.y + b.h / 2, b.color, 6); api.haptic(8);
        effect('brick', 640 + (b.y % 7) * 40);
        if (caps.length < 2 && Math.random() < 0.15) caps.push({ x: b.x + b.w / 2, y: b.y, k: CAPKEYS[(Math.random() * CAPKEYS.length) | 0], t: 0 });
      } else { b.flashT = 0.25; effect('metal', 380); }
    };

    const stepBall = (b, dt) => {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < SIDE + R) { b.x = SIDE + R; b.vx = Math.abs(b.vx); }
      if (b.x > W - SIDE - R) { b.x = W - SIDE - R; b.vx = -Math.abs(b.vx); }
      if (b.y < WALL_T + R) { b.y = WALL_T + R; b.vy = Math.abs(b.vy); hits++; normalize(b); }
      if (b.vy > 0 && b.y + R >= PAD_Y && b.y - R <= PAD_Y + PAD_H && Math.abs(b.x - pad.x) <= pad.w / 2 + R) {
        hits++;
        const rel = Math.max(-1, Math.min(1, (b.x - pad.x) / (pad.w / 2))), ang = rel * 1.05, s = ballSpeed();
        b.vx = Math.sin(ang) * s; b.vy = -Math.cos(ang) * s; b.y = PAD_Y - R;
        api.haptic(6); api.beep(300, 0.03, 'triangle', 0.05);
        if (pad.mode === 'catch') { b.on = true; b.stuck = true; b.off = Math.max(-pad.w / 2 + 6, Math.min(pad.w / 2 - 6, b.x - pad.x)); b.vx = b.vy = 0; }
      }
      for (const br of bricks) {
        if (br.dead) continue;
        const nx = Math.max(br.x, Math.min(b.x, br.x + br.w)), ny = Math.max(br.y, Math.min(b.y, br.y + br.h)), dx = b.x - nx, dy = b.y - ny;
        if (dx * dx + dy * dy >= R * R) continue;
        if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx); else b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
        hits++; hitBrick(br, 1); normalize(b); break;
      }
      for (const e of enemies) {
        if (e.dead) continue;
        if (Math.hypot(b.x - e.x, b.y - e.y) < 12 + R) { e.dead = true; addScore(100); burst(e.x, e.y, '#e8a6ff', 10); api.fx.text(e.x, e.y, '+100', { color: '#e8a6ff' }); api.beep(220, 0.1, 'sawtooth', 0.05); b.vy = -b.vy; }
      }
    };

    const loseLife = () => {
      lives--; api.haptic(40); api.beep(140, 0.3, 'sawtooth', 0.06); clearPowers();
      api.fx.shake(6, 0.35); api.fx.flash('#e5413b', 0.25, 0.35);
      if (lives <= 0) { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } } else resetBall();
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      bricks.forEach(b => { b.flashT = Math.max(0, b.flashT - dt); });
      if (state !== 'play') return;
      introT = Math.max(0, introT - dt);
      pad.x += ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * 400 * dt;
      if (target !== null) pad.x += (target - pad.x) * Math.min(1, dt * 20);
      pad.x = Math.max(pad.w / 2 + SIDE, Math.min(W - pad.w / 2 - (exitOpen ? 0 : SIDE), pad.x));
      if (exitOpen && pad.x >= W - pad.w / 2 - 0.5) { exitOpen = false; level++; if (level > saved()) api.store.set('stage', level); startLevel(); flash('QUADRO ' + level); api.haptic(25); [660, 880, 1100].forEach((f, i) => setTimeout(() => api.beep(f, 0.1), i * 110)); return; }
      // laser
      laserCd = Math.max(0, laserCd - dt);
      if (pad.mode === 'laser' && (touching || held.a || held.b) && laserCd <= 0 && !balls.every(b => b.on && !b.stuck && false)) {
        bolts.push({ x: pad.x - pad.w / 2 + 6, y: PAD_Y - 4 }, { x: pad.x + pad.w / 2 - 6, y: PAD_Y - 4 }); laserCd = 0.24; api.beep(1500, 0.03, 'square', 0.02);
      }
      for (const bo of bolts) {
        bo.y -= 560 * dt;
        for (const br of bricks) if (!br.dead && bo.x > br.x && bo.x < br.x + br.w && bo.y < br.y + br.h && bo.y > br.y - 6) { hitBrick(br, 1); bo.dead = true; break; }
        if (!bo.dead) for (const e of enemies) if (!e.dead && Math.hypot(bo.x - e.x, bo.y - e.y) < 14) { e.dead = true; bo.dead = true; addScore(100); burst(e.x, e.y, '#e8a6ff', 10); api.fx.text(e.x, e.y, '+100', { color: '#e8a6ff' }); }
        if (bo.y < WALL_T) bo.dead = true;
      }
      bolts = bolts.filter(b => !b.dead);
      // palle
      balls.forEach(b => { if (b.on) { b.x = pad.x + (b.stuck ? b.off : 0); b.y = PAD_Y - R - 1; } });
      for (const b of balls) {
        if (b.on) continue;
        const n = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 3));
        for (let i = 0; i < n; i++) { stepBall(b, dt / n); if (b.on) break; }
        if (b.y > H + R) b.dead = true;
      }
      balls = balls.filter(b => !b.dead);
      if (!balls.length) loseLife();
      bricks = bricks.filter(b => !b.dead);
      // capsule
      for (const c of caps) {
        c.t += dt; c.y += 95 * dt;
        if (c.y > PAD_Y - 4 && c.y < PAD_Y + PAD_H + 10 && Math.abs(c.x - pad.x) < pad.w / 2 + 14) { c.dead = true; power(c.k); }
        if (c.y > H + 20) c.dead = true;
      }
      caps = caps.filter(c => !c.dead);
      // nemici
      enemyT -= dt;
      if (enemyT <= 0 && bricks.some(b => !b.gold) && enemies.length < 3) { enemies.push({ x: Math.random() < 0.5 ? W * 0.3 : W * 0.7, y: WALL_T + 4, t: Math.random() * 6, dead: false }); enemyT = 9 + Math.random() * 6; }
      for (const e of enemies) {
        e.t += dt; e.y += 36 * dt; e.x += Math.cos(e.t * 1.8) * 34 * dt; e.x = Math.max(SIDE + 14, Math.min(W - SIDE - 14, e.x));
        if (e.y > PAD_Y + 6 || (e.y > PAD_Y - 8 && Math.abs(e.x - pad.x) < pad.w / 2 + 10)) e.dead = true;
      }
      enemies = enemies.filter(e => !e.dead);
      if (!bricks.some(b => !b.gold)) { level++; if (level > saved()) api.store.set('stage', level); startLevel(); flash('QUADRO ' + level); api.haptic(25); [660, 880, 1100].forEach((f, i) => setTimeout(() => api.beep(f, 0.1), i * 110)); }
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame(saved());
        else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play';
      } else if (k === 'select') { if (state === 'title') api.store.set('stage', 1); newGame(1); }
      else if ((k === 'a' || k === 'b') && state === 'play') launch();
    };
    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(saved()); return; }
        if (state === 'pause') { state = 'play'; return; }
        target = e.x; touching = true; launch();
      } else if (e.type === 'move' && state === 'play') target = e.x;
      else if (e.type === 'up') touching = false;
    };

    // Disegno
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#eef1ff'; g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = '#eef1ff'; g.fillRect(x, y, w, h); g.fillStyle = '#141a2e'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
    const drawBrick = b => {
      const fl = b.flashT > 0;
      if (b.gold) {
        const gg = g.createLinearGradient(0, b.y, 0, b.y + b.h); gg.addColorStop(0, '#fff0a8'); gg.addColorStop(0.45, '#d8a82a'); gg.addColorStop(1, '#8a5f12');
        g.fillStyle = gg; rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 3); g.fill();
        g.fillStyle = 'rgba(60,30,0,.55)'; g.beginPath(); g.arc(b.x + 4, b.y + b.h / 2, 1.3, 0, 7); g.arc(b.x + b.w - 4, b.y + b.h / 2, 1.3, 0, 7); g.fill();
        if (fl) { g.fillStyle = 'rgba(255,255,255,.7)'; rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 3); g.fill(); }
        return;
      }
      if (b.k === 's') {
        const sg = g.createLinearGradient(0, b.y, 0, b.y + b.h); sg.addColorStop(0, '#f2f5fb'); sg.addColorStop(0.5, '#aab4c4'); sg.addColorStop(1, '#5f6a7d');
        g.fillStyle = sg; rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 3); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(b.x + 3, b.y + b.h - 3); g.lineTo(b.x + b.w * 0.5, b.y + 2); g.stroke();
        if (fl) { g.fillStyle = 'rgba(255,255,255,.7)'; rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 3); g.fill(); }
        return;
      }
      const bgr = g.createLinearGradient(0, b.y, 0, b.y + b.h); bgr.addColorStop(0, 'rgba(255,255,255,.55)'); bgr.addColorStop(0.2, 'rgba(255,255,255,0)'); bgr.addColorStop(1, 'rgba(0,0,0,.38)');
      g.fillStyle = b.color; rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 3); g.fill(); g.fillStyle = bgr; rr(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1, 3); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(b.x + 3, b.y + 2, b.w * 0.45, 1.4);
    };
    let trail = [];
    const render = () => {
      const th = theme();
      const bgG = g.createLinearGradient(0, 0, 0, H); bgG.addColorStop(0, th.top); bgG.addColorStop(1, th.bottom); g.fillStyle = bgG; g.fillRect(0, 0, W, H);
      const hz = g.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.35, H * 0.7); hz.addColorStop(0, th.glow); hz.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = hz; g.fillRect(0, 0, W, H);
      g.strokeStyle = th.grid; g.lineWidth = 1; for (let x = 0; x < W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } for (let y = 0; y < H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
      if (state === 'title') {
        text('BRICK', W / 2, 150, 56, 'center', '#e5413b'); text('RUSH', W / 2, 206, 56, 'center');
        ['w', 'o', 'c', 'g', 'r', 'b', 'm', 'y'].forEach((k, i) => { g.fillStyle = BR[k][0]; g.fillRect(40 + i * 33, 300, 30, 16); });
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 380, 16, 'center', '#f5d31c');
        if (saved() > 1) { text('TOCCA: CONTINUA DAL QUADRO ' + saved(), W / 2, 334, 12, 'center', '#7bdc72'); text('SELECT: RICOMINCIA', W / 2, 354, 11, 'center', '#aab3d8'); }
        text('TRASCINA PER MUOVERE · TOCCA PER LANCIARE', W / 2, 430, 11, 'center', '#aab3d8');
        text('RECORD ' + hi, W / 2, 470, 14, 'center');
        return;
      }
      // cornice
      const fg = g.createLinearGradient(0, 0, SIDE, 0); fg.addColorStop(0, '#5a6aa0'); fg.addColorStop(1, '#262f55');
      g.fillStyle = fg; g.fillRect(0, WALL_T - 6, SIDE, H); const fg2 = g.createLinearGradient(W - SIDE, 0, W, 0); fg2.addColorStop(0, '#262f55'); fg2.addColorStop(1, '#5a6aa0');
      g.fillStyle = fg2; g.fillRect(W - SIDE, WALL_T - 6, SIDE, exitOpen ? PAD_Y - 40 - (WALL_T - 6) : H); if (exitOpen) { g.fillRect(W - SIDE, PAD_Y + PAD_H + 20, SIDE, H); g.fillStyle = 'rgba(224,80,200,.35)'; g.fillRect(W - SIDE, PAD_Y - 40, SIDE, PAD_H + 60); }
      const tg = g.createLinearGradient(0, WALL_T - 10, 0, WALL_T); tg.addColorStop(0, '#6b7bb8'); tg.addColorStop(1, '#262f55'); g.fillStyle = tg; g.fillRect(0, WALL_T - 10, W, 10);
      g.fillStyle = '#0b1230'; g.fillRect(W * 0.3 - 16, WALL_T - 10, 32, 10); g.fillRect(W * 0.7 - 16, WALL_T - 10, 32, 10);
      bricks.forEach(drawBrick);
      enemies.forEach(e => {
        g.save(); g.translate(e.x, e.y); g.rotate(e.t * 2.2); const col = ['#e8a6ff', '#7fe0ff', '#ffd27f'][(e.t * 0 + (e.x | 0)) % 3 | 0] || '#e8a6ff';
        const eg = g.createRadialGradient(-3, -3, 1, 0, 0, 12); eg.addColorStop(0, '#fff'); eg.addColorStop(1, '#8a4ad0'); g.fillStyle = eg; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * 1.047, r = i % 2 ? 7 : 12; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.stroke(); g.restore();
      });
      caps.forEach(c => {
        const d = CAP[c.k]; g.save(); g.translate(c.x, c.y);
        const cg = g.createLinearGradient(0, -6, 0, 6); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.25, d[0]); cg.addColorStop(1, 'rgba(0,0,0,.6)');
        g.fillStyle = d[0]; rr(-13, -6.5, 26, 13, 6.5); g.fill(); g.fillStyle = cg; g.globalAlpha = 0.65; rr(-13, -6.5, 26, 13, 6.5); g.fill(); g.globalAlpha = 1;
        g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; rr(-13, -6.5, 26, 13, 6.5); g.stroke();
        text(c.k, 0, -5.5, 11, 'center', '#ffffff'); const sh = (c.t * 60) % 60 - 20; g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(sh - 13, -6, 3, 12); g.restore();
      });
      bolts.forEach(b => { g.fillStyle = '#ff7a6e'; g.fillRect(b.x - 1.2, b.y, 2.4, 10); g.fillStyle = '#fff'; g.fillRect(b.x - 0.5, b.y, 1, 10); });
      g.fillStyle = 'rgba(37,196,240,.22)'; rr(pad.x - pad.w / 2 - 3, PAD_Y - 3, pad.w + 6, PAD_H + 6, PAD_H / 2 + 3); g.fill();
      const pg = g.createLinearGradient(0, PAD_Y, 0, PAD_Y + PAD_H); pg.addColorStop(0, '#9be8ff'); pg.addColorStop(0.5, '#25c4f0'); pg.addColorStop(1, '#0e6f93');
      g.fillStyle = pg; rr(pad.x - pad.w / 2, PAD_Y, pad.w, PAD_H, PAD_H / 2); g.fill();
      g.fillStyle = '#e5413b'; rr(pad.x - pad.w / 2, PAD_Y, 9, PAD_H, 4); g.fill(); rr(pad.x + pad.w / 2 - 9, PAD_Y, 9, PAD_H, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; rr(pad.x - pad.w / 2 + 11, PAD_Y + 2, pad.w - 22, 2.4, 1.2); g.fill();
      if (pad.mode === 'laser') { g.fillStyle = '#ffd6d0'; g.fillRect(pad.x - pad.w / 2 + 4, PAD_Y - 4, 4, 5); g.fillRect(pad.x + pad.w / 2 - 8, PAD_Y - 4, 4, 5); }
      balls.forEach(ball => {
        g.fillStyle = 'rgba(180,200,255,.25)'; g.beginPath(); g.arc(ball.x, ball.y, R + 3, 0, 7); g.fill();
        const bl = g.createRadialGradient(ball.x - R * 0.35, ball.y - R * 0.4, 1, ball.x, ball.y, R * 1.1); bl.addColorStop(0, '#ffffff'); bl.addColorStop(1, '#9fb0e8'); g.fillStyle = bl; g.beginPath(); g.arc(ball.x, ball.y, R, 0, 7); g.fill();
      });
      g.globalAlpha = 1;
      text('PUNTI ' + score, 12, 8, 14); text('QUADRO ' + level, W / 2, 8, 14, 'center'); text('RECORD ' + hi, 12, 28, 10, 'left', '#aab3d8');
      for (let i = 0; i < lives - 1 && i < 6; i++) { g.fillStyle = '#25c4f0'; rr(W - 38 - i * 26 + 14, 12, 22, 7, 3.5); g.fill(); }
      if (balls.some(b => b.on) && state === 'play' && introT <= 0) text(pad.mode === 'catch' ? 'TOCCA PER LANCIARE' : 'TOCCA PER LANCIARE', W / 2, PAD_Y - 60, 13, 'center', '#f5d31c');
      if (introT > 0) { text('QUADRO ' + level, W / 2, H * 0.55, 24, 'center', '#f5d31c'); text(th.name, W / 2, H * 0.55 + 32, 13, 'center', '#b7cde7'); }
      if (msgT > 0 && introT <= 0) text(msg, W / 2, H * 0.5, 20, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    bricks = []; resetBall();
    return {
      onPress: act, onPointer,
      onResize(w,h) { const sx=(w-SIDE*2)/(W-SIDE*2),sy=(h-78-WALL_T)/(PAD_Y-WALL_T),oldBW=BW;W=w;H=h;PAD_Y=H-78;BW=(W-SIDE*2)/COLS;pad.x=SIDE+(pad.x-SIDE)*sx;
        bricks.forEach(b=>{b.x=SIDE+(b.x-SIDE)/oldBW*BW;b.w=BW-1.5;});
        for(const list of [balls,caps,enemies,bolts]) for(const b of list){b.x=SIDE+(b.x-SIDE)*sx;b.y=WALL_T+(b.y-WALL_T)*sy;if('vx'in b){b.vx*=sx;b.vy*=sy;}}
        target=null;touching=false;
      },
      onHide() { if (state === 'play') state = 'pause'; touching = false; },
      update, render,
      debug: { newGame, get layouts() { return LV; }, get theme() { return theme().name; }, get state() { return state; }, get bricks() { return bricks; }, get balls() { return balls; }, get ball() { return balls[0]; }, get pad() { return pad; }, get score() { return score; }, get lives() { return lives; }, get level() { return level; }, get caps() { return caps; }, power, launch, goLevel(n) { level = n; startLevel(); }, get enemies() { return enemies; } },
    };
  },
});

registerGame({
  id: 'vortex-orbit',
  title: 'VORTEX ORBIT',
  color: '#7a4cff',
  blurb: 'La nave gira lungo il cerchio e spara verso il centro. Gli alieni escono a spirale dal fondo del tunnel, ti girano attorno e tornano al centro. Abbatti i tre satelliti per il doppio fuoco; ogni 3 salti arrivi su un pianeta e c\'è un quadro bonus. Metti il dito sul cerchio: la nave ti segue e spara da sola.',
  inputs: ['TRASCINA SUL CERCHIO', 'AUTO-FUOCO', 'VIBRAZIONE'],
  size: [360, 640],
  bg: '#04050f',
  flexH: true,
  flexMin: 1.15,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const CX = W / 2, CY = H * 0.47, RX = W * 0.40, RY = Math.min(H * 0.37, H - CY - 88);
    const TAU = Math.PI * 2;
    const PLANETS = ['NETTUNO', 'URANO', 'SATURNO', 'GIOVE', 'MARTE', 'TERRA'];
    const P = (a, r) => ({ x: CX + RX * r * Math.cos(a), y: CY + RY * r * Math.sin(a) });
    const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, reserve = 2, L = 0, time = 0, nextExtra = 20000;
    let ship = { a: Math.PI / 2, inv: 0, dbl: false };
    let enemies = [], shots = [], ebul = [], parts = [], texts = [], waves = [], satLeft = {};
    let phase = 'intro', phaseT = 0, stageT = 0, chance = false, chHits = 0, chTotal = 0, resultLines = [];
    let deadT = 0, finalDeath = false, touch = null, cd = 0, flashMsg = '', flashT = 0, warpT = 0, fired = 0, hitsTotal = 0, wb = 0;
    const stars = Array.from({ length: 110 }, () => ({ a: Math.random() * TAU, r: Math.random() * 1.2, s: Math.random() }));

    const cycle = () => Math.floor(L / 24);
    const spd = () => 1 + Math.min(0.7, L * 0.035 + cycle() * 0.1);
    const arp = (notes, step, type, vol) => notes.forEach((f, i) => setTimeout(() => api.beep(f, step * 1.4, type || 'triangle', vol || 0.04), i * step * 1000));
    const flash = s => { flashMsg = s; flashT = 1.8; };
    const addText = (x, y, s) => texts.push({ x, y, s: String(s), t: 0.9 });
    const boom = (x, y, c, n = 12) => { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = 40 + Math.random() * 150; parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0.4 + Math.random() * 0.45, c }); } };
    const addScore = n => {
      score += n;
      while (score >= nextExtra) { reserve = Math.min(6, reserve + 1); nextExtra = nextExtra === 20000 ? 70000 : nextExtra + 70000; flash('NAVE EXTRA'); arp([523, 659, 784, 1047], 0.09, 'triangle', 0.05); }
    };

    const spawnStage = () => {
      const idx = L % 4, p = Math.floor(L / 4) % 6;
      chance = idx === 3; enemies = []; shots = []; ebul = []; waves = []; satLeft = {};
      chHits = 0; chTotal = 0; resultLines = []; stageT = 0; phase = 'intro'; phaseT = 2.4;
      if (chance) {
        for (let i = 0; i < 5; i++) waves.push({ t: 1 + i * 2.6, n: 8, type: (i + p) % 3, a0: Math.random() * TAU, dir: i % 2 ? 1 : -1, sat: false });
        chTotal = 40;
      } else {
        const nW = 4 + (cycle() > 0 ? 1 : 0);
        for (let i = 0; i < nW; i++) waves.push({ t: 1 + i * 3.4, n: 6 + Math.min(2, cycle()), type: (i + p) % 3, a0: Math.random() * TAU, dir: i % 2 ? 1 : -1, sat: i === 2 && idx >= 1 });
      }
      arp([392, 494, 587, 784], 0.1, 'square', 0.03);
    };
    const mkEnemy = (type, w, i, grp) => ({
      type, st: 'wait', delay: i * 0.3, a0: w.a0 + i * 0.0, dir: w.dir, t: 0, r: 0, a: w.a0, cyc: 0, grp,
      shotsLeft: chance ? 0 : 1 + Math.min(2, (L / 6) | 0), fireT: 0.5 + Math.random(), orbitT: 0, holdT: 0, hp: 1, x: CX, y: CY, sc: 0.2, sat: type === 3,
    });
    const releaseWave = w => {
      if (w.sat) { for (let i = 0; i < 3; i++) { const e = mkEnemy(3, w, i, 'sat' + L); e.delay = i * 0.35; e.shotsLeft = 0; enemies.push(e); } satLeft['sat' + L] = 3; }
      for (let i = 0; i < w.n; i++) enemies.push(mkEnemy(w.type, w, i + (w.sat ? 4 : 0), 'w'));
    };

    const respawn = () => { deadT = 0; ship.inv = 1.8; ship.dbl = false; };
    const newGame = () => {
      score = 0; reserve = 2; L = 0; nextExtra = 20000; fired = 0; hitsTotal = 0; deadT = 0; finalDeath = false; cd = 0;
      parts = []; texts = []; ship = { a: Math.PI / 2, inv: 1, dbl: false };
      spawnStage(); state = 'play';
    };
    const endGame = () => { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } };

    const shipPos = () => P(ship.a, 1);
    const hitShip = () => {
      if (ship.inv > 0 || deadT > 0) return;
      const p = shipPos(); boom(p.x, p.y, '#eef1ff', 24); api.haptic(50);
      api.beep(120, 0.5, 'sawtooth', 0.06); setTimeout(() => api.beep(70, 0.5, 'sawtooth', 0.05), 120);
      ebul = [];
      if (reserve > 0) { reserve--; finalDeath = false; } else finalDeath = true;
      deadT = 1.6;
    };
    const fireEnemy = e => {
      if (ebul.length >= 3 + Math.min(4, L >> 2)) return;
      const sp = shipPos(), d = Math.hypot(sp.x - e.x, sp.y - e.y) || 1, v = Math.min(260, 150 + L * 4);
      ebul.push({ x: e.x, y: e.y, vx: (sp.x - e.x) / d * v, vy: (sp.y - e.y) / d * v, t: 0, T: d / v });
    };

    const kill = e => {
      e.dead = true; hitsTotal++;
      const pts = chance ? 100 : e.sat ? 200 : 100 + e.type * 50;
      addScore(pts); addText(e.x, e.y - 10, pts); boom(e.x, e.y, e.sat ? '#ffc04a' : e.type === 0 ? '#5ad0ff' : e.type === 1 ? '#ff5a6a' : '#6fe07a', 14);
      api.haptic(14); api.beep(240, 0.1, 'square', 0.05); setTimeout(() => api.beep(150, 0.14, 'sawtooth', 0.04), 50);
      if (chance) chHits++;
      if (e.sat && satLeft[e.grp] !== undefined) {
        satLeft[e.grp]--;
        if (satLeft[e.grp] === 0) { ship.dbl = true; flash('DOPPIO FUOCO'); api.haptic(30); arp([523, 659, 784, 1047, 1319], 0.07, 'triangle', 0.05); }
      }
    };

    const updateEnemy = (e, dt) => {
      const v = spd();
      if (e.st === 'wait') { e.delay -= dt; if (e.delay <= 0) { e.st = 'out'; e.t = 0; } else return; }
      e.t += dt;
      if (e.st === 'out') {
        const T = 2.1 / v, u = Math.min(1, e.t / T);
        e.r = 0.94 * (1 - (1 - u) * (1 - u)); e.a = e.a0 + e.dir * u * 2.6;
        if (u >= 1) { e.st = 'orbit'; e.t = 0; e.orbitT = (chance ? 1.6 : 3 + Math.random() * 2.5) / v; e.a0 = e.a; }
      } else if (e.st === 'orbit') {
        e.a += e.dir * 1.15 * v * dt; e.r = 0.92 + Math.sin(e.t * 2.2) * 0.05; e.orbitT -= dt;
        e.fireT -= dt;
        if (e.shotsLeft > 0 && e.fireT <= 0 && deadT <= 0) { fireEnemy(e); e.shotsLeft--; e.fireT = 0.7; }
        if (e.orbitT <= 0) { e.st = 'in'; e.t = 0; e.a0 = e.a; }
      } else if (e.st === 'in') {
        const T = 2.3 / v, u = Math.min(1, e.t / T);
        e.r = 0.94 * Math.pow(1 - u, 1.4) + 0.04; e.a = e.a0 + e.dir * u * 2.2;
        if (u >= 1) {
          if (chance) { e.dead = true; e.escaped = true; return; }
          e.st = 'hold'; e.t = 0; e.holdT = 1.2 + Math.random() * 1.6; e.cyc++; e.shotsLeft = 1 + Math.min(2, (L / 6) | 0);
        }
      } else if (e.st === 'hold') {
        e.a += e.dir * 2.4 * dt; e.r = 0.05 + Math.sin(e.t * 3) * 0.012; e.holdT -= dt;
        if (e.holdT <= 0) { e.st = 'out'; e.t = 0; e.a0 = Math.random() * TAU; e.dir = Math.random() < 0.5 ? 1 : -1; }
      }
      const p = P(e.a, e.r); e.x = p.x; e.y = p.y; e.sc = 0.22 + 0.78 * Math.min(1, e.r);
      const sp = shipPos();
      if (deadT <= 0 && ship.inv <= 0 && e.st !== 'hold' && Math.hypot(sp.x - e.x, sp.y - e.y) < 9 + 12 * e.sc) { boom(e.x, e.y, '#eef1ff', 10); e.dead = true; hitShip(); }
    };

    const update = dt => {
      time += dt; flashT = Math.max(0, flashT - dt); wb = Math.max(0, wb - dt * 3);
      const warping = phase === 'warp', sm = warping ? 9 : phase === 'clear' ? 3 : 1;
      stars.forEach(s => { s.r += (0.12 + s.r * 1.3) * sm * dt * (0.6 + s.s * 0.8); if (s.r > 1.35) { s.r = 0.02; s.a = Math.random() * TAU; } });
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }); parts = parts.filter(p => p.t > 0);
      texts.forEach(t => { t.y -= 22 * dt; t.t -= dt; }); texts = texts.filter(t => t.t > 0);
      if (state !== 'play') return;
      cd = Math.max(0, cd - dt); ship.inv = Math.max(0, ship.inv - dt);

      // nave
      if (deadT > 0) { deadT -= dt; if (deadT <= 0) { if (finalDeath) { endGame(); return; } respawn(); } }
      else {
        const mv = (held.left ? 1 : 0) - (held.right ? 1 : 0);
        ship.a += mv * 4.2 * dt;
        if (touch) { const d = angDiff(touch.a, ship.a), lim = 7 * dt; ship.a += Math.max(-lim, Math.min(lim, d)); }
        ship.a = (ship.a + TAU) % TAU;
        if ((touch || held.a || held.b) && cd <= 0 && shots.length < (ship.dbl ? 8 : 4) && phase !== 'warp') {
          const offs = ship.dbl ? [-0.06, 0.06] : [0];
          offs.forEach(o => { shots.push({ a: ship.a + o, s: 0 }); fired++; });
          cd = 0.14; api.beep(1250, 0.025, 'square', 0.018);
        }
      }

      // fasi
      if (phase === 'intro') { phaseT -= dt; if (phaseT <= 0) phase = 'play'; }
      else if (phase === 'play') {
        stageT += dt;
        while (waves.length && stageT >= waves[0].t) releaseWave(waves.shift());
        if (!waves.length && !enemies.length) {
          if (chance) {
            phase = 'result'; phaseT = 4; const perfect = chHits >= chTotal;
            resultLines = ['COLPITI ' + chHits, perfect ? 'PERFETTO! +5000' : 'BONUS ' + chHits * 100];
            if (perfect) { addScore(5000); arp([523, 659, 784, 1047, 784, 1047], 0.1, 'triangle', 0.05); }
          } else { phase = 'clear'; phaseT = 1.2; }
        }
      } else if (phase === 'clear') { phaseT -= dt; if (phaseT <= 0) { phase = 'warp'; phaseT = 2.2; arp([220, 262, 330, 392, 523, 659, 880], 0.12, 'sawtooth', 0.025); } }
      else if (phase === 'warp' || phase === 'result') { phaseT -= dt; if (phaseT <= 0) { L++; spawnStage(); } }

      // nemici
      enemies.forEach(e => { if (!e.dead) updateEnemy(e, dt); });
      enemies = enemies.filter(e => !e.dead);
      // colpi
      const sp = shipPos();
      for (const s of shots) {
        const q = P(s.a, 1), len = Math.hypot(q.x - CX, q.y - CY) || 1;
        s.s += 430 * dt / len;
        const x = q.x + (CX - q.x) * s.s, y = q.y + (CY - q.y) * s.s;
        for (const e of enemies) {
          if (e.dead || e.st === 'wait') continue;
          if (Math.hypot(x - e.x, y - e.y) < 6 + 12 * e.sc) { s.dead = true; kill(e); break; }
        }
      }
      shots = shots.filter(s => !s.dead && s.s < 1);
      enemies = enemies.filter(e => !e.dead);
      for (const b of ebul) {
        b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (deadT <= 0 && ship.inv <= 0 && Math.hypot(b.x - sp.x, b.y - sp.y) < 11 && b.t > b.T * 0.6) { b.dead = true; hitShip(); }
      }
      ebul = ebul.filter(b => !b.dead && b.t < b.T * 1.4);
    };

    const onPointer = e => {
      const ang = () => Math.atan2((e.y - CY) / RY, (e.x - CX) / RX);
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(); return; }
        touch = { id: e.id, a: ang() };
      } else if (e.type === 'move' && touch && e.id === touch.id) touch.a = ang();
      else if (e.type === 'up' && touch && e.id === touch.id) touch = null;
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'over') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'select' && state !== 'title') newGame();
    };

    // ---------- disegno ----------
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#eef1ff'; g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = '#eef1ff'; g.fillRect(x, y, w, h); g.fillStyle = '#04050f'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };
    const glow = (x, y, r, c) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };

    const drawPlanet = (p, rad) => {
      const col = [['#7fb0ff', '#1f3f9a'], ['#bff3ff', '#3a9fb5'], ['#f0d8a0', '#a07a3a'], ['#f2c9a0', '#a8643a'], ['#ff9a6a', '#8a2a14'], ['#7fd0ff', '#1a5a2a']][p];
      glow(CX, CY, rad * 2.4, 'rgba(120,150,255,.25)');
      if (p === 2) { g.strokeStyle = 'rgba(240,220,170,.7)'; g.lineWidth = Math.max(1.5, rad * 0.16); g.beginPath(); g.ellipse(CX, CY, rad * 1.9, rad * 0.5, -0.3, Math.PI, TAU); g.stroke(); }
      g.save(); g.beginPath(); g.arc(CX, CY, rad, 0, TAU); g.clip();
      const gr = g.createRadialGradient(CX - rad * 0.4, CY - rad * 0.4, rad * 0.1, CX, CY, rad); gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
      g.fillStyle = gr; g.fillRect(CX - rad, CY - rad, rad * 2, rad * 2);
      if (p === 2 || p === 3) { g.fillStyle = 'rgba(90,50,20,.28)'; for (let i = -2; i <= 2; i++) g.fillRect(CX - rad, CY + i * rad * 0.38 - rad * 0.08, rad * 2, rad * 0.16); }
      if (p === 5) { g.fillStyle = 'rgba(60,160,70,.8)'; g.beginPath(); g.ellipse(CX - rad * 0.2, CY, rad * 0.4, rad * 0.55, 0.4, 0, TAU); g.ellipse(CX + rad * 0.5, CY + rad * 0.2, rad * 0.25, rad * 0.3, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(CX - rad, CY - rad * 0.2, rad * 2, rad * 0.12); }
      const sh = g.createRadialGradient(CX + rad * 0.5, CY + rad * 0.5, rad * 0.3, CX + rad * 0.5, CY + rad * 0.5, rad * 1.5); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,12,.65)');
      g.fillStyle = sh; g.fillRect(CX - rad, CY - rad, rad * 2, rad * 2);
      g.restore();
      if (p === 2) { g.strokeStyle = 'rgba(240,220,170,.8)'; g.lineWidth = Math.max(1.5, rad * 0.16); g.beginPath(); g.ellipse(CX, CY, rad * 1.9, rad * 0.5, -0.3, 0, Math.PI); g.stroke(); }
      if (p === 5) { const ma = time * 0.6; glow(CX + Math.cos(ma) * rad * 2, CY + Math.sin(ma) * rad * 0.7, rad * 0.5, 'rgba(220,220,230,.9)'); }
    };

    const drawFoe = e => {
      const s = e.sc, x = e.x, y = e.y, rot = Math.atan2(y - CY, x - CX) + Math.PI / 2, t = time + e.dir * 3;
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(s * 1.15, s * 1.15);
      if (e.type === 0) { // disco con anello rotante
        glow(0, 0, 20, 'rgba(90,200,255,.35)');
        const gr = g.createRadialGradient(-3, -3, 1, 0, 0, 11); gr.addColorStop(0, '#e8fbff'); gr.addColorStop(1, '#2a76d0');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
        g.strokeStyle = '#bff3ff'; g.lineWidth = 2.4;
        for (let i = 0; i < 3; i++) { const a = t * 4 + i * TAU / 3; g.beginPath(); g.arc(0, 0, 14, a, a + 1.4); g.stroke(); }
        g.fillStyle = '#0b1c4a'; g.beginPath(); g.arc(0, 0, 3.4, 0, TAU); g.fill();
      } else if (e.type === 1) { // ali rosse
        glow(0, 0, 22, 'rgba(255,80,100,.35)');
        const sw = Math.sin(t * 8) * 2;
        g.fillStyle = '#c4243a'; g.beginPath(); g.moveTo(0, -12); g.lineTo(18, 6 + sw); g.lineTo(9, 3); g.lineTo(0, 12); g.lineTo(-9, 3); g.lineTo(-18, 6 + sw); g.closePath(); g.fill();
        g.fillStyle = '#ff8a96'; g.beginPath(); g.moveTo(0, -12); g.lineTo(6, 2); g.lineTo(0, 8); g.lineTo(-6, 2); g.closePath(); g.fill();
        g.fillStyle = '#ffe28a'; g.beginPath(); g.arc(0, -1, 2.6, 0, TAU); g.fill();
      } else if (e.type === 2) { // pungiglione verde
        glow(0, 0, 21, 'rgba(100,230,120,.32)');
        const gr = g.createLinearGradient(0, -12, 0, 12); gr.addColorStop(0, '#9af5a4'); gr.addColorStop(1, '#2a8a3a');
        g.fillStyle = gr; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + Math.PI / 6; g.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); } g.closePath(); g.fill();
        g.strokeStyle = '#d6ffdc'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-8, -9); g.lineTo(-13, -17); g.moveTo(8, -9); g.lineTo(13, -17); g.moveTo(0, 11); g.lineTo(0, 19); g.stroke();
        g.fillStyle = Math.sin(t * 10) > 0 ? '#ff4a4a' : '#7a1a1a'; g.beginPath(); g.arc(0, 0, 3.6, 0, TAU); g.fill();
      } else { // satellite
        glow(0, 0, 22, 'rgba(255,190,70,.4)');
        g.rotate(t * 2.5);
        g.fillStyle = '#3a6ac8'; g.fillRect(-18, -3, 10, 6); g.fillRect(8, -3, 10, 6);
        g.strokeStyle = '#a8c4ff'; g.lineWidth = 0.8; g.strokeRect(-18, -3, 10, 6); g.strokeRect(8, -3, 10, 6);
        const gr = g.createRadialGradient(-2, -2, 1, 0, 0, 8); gr.addColorStop(0, '#fff2b8'); gr.addColorStop(1, '#e08a1a');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
      }
      g.restore();
    };
    const drawShip = (x, y, rot, s) => { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); Art.fighter(g, 0, 0, 1.05, performance.now() / 1000, '#e8eeff', '#7a4cff'); g.restore(); };
    const shipRot = (x, y) => Math.atan2(CY - y, CX - x) + Math.PI / 2;

    const render = () => {
      g.fillStyle = '#04050f'; g.fillRect(0, 0, W, H);
      const pl = Math.floor(L / 4) % 6, close = chance ? 1 : (L % 4) / 3;
      glow(CX, CY, RX * 1.1, 'rgba(70,40,160,.30)');
      stars.forEach(s => {
        const p = P(s.a, s.r * 1.3), z = Math.min(1, s.r);
        g.fillStyle = `rgba(${200 + s.s * 55 | 0},${210 + s.s * 45 | 0},255,${0.25 + z * 0.75})`;
        const sz = 0.5 + z * (phase === 'warp' ? 1.4 : 2.1);
        if (phase === 'warp') { const q = P(s.a, Math.max(0, s.r - 0.12) * 1.3); g.strokeStyle = g.fillStyle; g.lineWidth = sz; g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(p.x, p.y); g.stroke(); }
        else g.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      });
      if (state === 'title') {
        drawPlanet(2, 24);
        const a = time * 1.1, p = P(a, 1); drawShip(p.x, p.y, shipRot(p.x, p.y), 1);
        [0, 1, 2, 3].forEach(i => { const e = { type: i, x: 0, y: 0, sc: 0.8, dir: 1, r: 0.6 }; const q = P(-time * 0.9 + i * 1.5, 0.62); e.x = q.x; e.y = q.y; drawFoe(e); });
        text('VORTEX', W / 2, H * 0.30 - 4, 40, 'center', '#a58bff'); text('ORBIT', W / 2, H * 0.30 + 40, 40, 'center');
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, H * 0.62, 16, 'center', '#f5d31c');
        text('RECORD ' + hi, W / 2, H * 0.62 + 30, 13, 'center');
        return;
      }
      drawPlanet(pl, phase === 'warp' ? 8 + 34 * (1 - Math.max(0, phaseT) / 2.2) + close * 20 : 7 + close * 26);
      g.strokeStyle = 'rgba(122,76,255,.22)'; g.lineWidth = 1; g.beginPath(); g.ellipse(CX, CY, RX, RY, 0, 0, TAU); g.stroke();

      enemies.slice().sort((a, b) => a.sc - b.sc).forEach(e => { if (e.st !== 'wait') drawFoe(e); });
      const sp = shipPos();
      shots.forEach(s => {
        const q = P(s.a, 1), x = q.x + (CX - q.x) * s.s, y = q.y + (CY - q.y) * s.s, x0 = q.x + (CX - q.x) * Math.max(0, s.s - 0.09), y0 = q.y + (CY - q.y) * Math.max(0, s.s - 0.09);
        g.strokeStyle = '#bff3ff'; g.lineWidth = 2.6 * (1 - s.s * 0.6) + 0.6; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x, y); g.stroke();
      });
      ebul.forEach(b => { const k = 0.4 + 0.9 * Math.min(1, b.t / b.T); glow(b.x, b.y, 7 * k + 3, 'rgba(255,200,60,.8)'); g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(b.x, b.y, 2.6 * k, 0, TAU); g.fill(); });
      if (deadT <= 0 && !(ship.inv > 0 && ((ship.inv * 10) | 0) % 2 === 0)) {
        const r = shipRot(sp.x, sp.y);
        if (ship.dbl) { const nx = Math.cos(r) * 11, ny = Math.sin(r) * 11; drawShip(sp.x - nx, sp.y - ny, r, 0.95); drawShip(sp.x + nx, sp.y + ny, r, 0.95); }
        else drawShip(sp.x, sp.y, r, 1.1);
      }
      parts.forEach(p => { g.fillStyle = p.c; g.fillRect(p.x, p.y, 3, 3); });
      texts.forEach(t => text(t.s, t.x, t.y, 12, 'center', '#f5d31c'));

      text('1UP', 10, 6, 11, 'left', '#a58bff'); text(String(score).padStart(6, '0'), 10, 18, 14);
      text('RECORD', W / 2, 6, 11, 'center', '#a58bff'); text(String(Math.max(hi, score)).padStart(6, '0'), W / 2, 18, 14, 'center');
      for (let i = 0; i < reserve; i++) drawShip(18 + i * 20, H - 16, 0, 0.6);
      const w = 3 - (L % 4);
      text(chance ? 'QUADRO BONUS' : w + (w === 1 ? ' SALTO PER ' : ' SALTI PER ') + PLANETS[Math.floor(L / 4) % 6], W - 10, H - 22, 12, 'right', '#a58bff');
      if (state === 'play' && phase === 'intro') {
        text(chance ? 'QUADRO BONUS' : PLANETS[Math.floor(L / 4) % 6], W / 2, H * 0.40, 26, 'center', '#a58bff');
        text(chance ? 'ABBATTILI TUTTI!' : 'PRONTO', W / 2, H * 0.40 + 38, 16, 'center');
      }
      if (state === 'play' && phase === 'warp') text('SALTO!', W / 2, H * 0.40, 26, 'center', '#a58bff');
      if (state === 'play' && phase === 'result') { text('QUADRO BONUS', W / 2, H * 0.36, 20, 'center', '#a58bff'); resultLines.forEach((l, i) => text(l, W / 2, H * 0.36 + 40 + i * 30, 20, 'center', i ? '#f5d31c' : '#eef1ff')); }
      if (flashT > 0) text(flashMsg, W / 2, H * 0.60, 20, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') { const acc = fired ? Math.round(hitsTotal / fired * 100) : 0; banner(['GAME OVER', 'PUNTI ' + score, 'SPARI ' + fired, 'COLPITI ' + hitsTotal + ' (' + acc + '%)', 'TOCCA']); }
    };

    return {
      onPress: act,
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; touch = null; },
      update,
      render,
      debug: {
        newGame, goLevel(n) { L = n; spawnStage(); },
        get state() { return state; }, get enemies() { return enemies; }, get ship() { return ship; }, get score() { return score; },
        get L() { return L; }, get phase() { return phase; }, get shots() { return shots; }, get reserve() { return reserve; }, get chHits() { return chHits; },
      },
    };
  },
});

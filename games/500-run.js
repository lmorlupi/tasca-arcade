registerGame({
  id: '500run',
  title: '500 RUN',
  color: '#2a9d6f',
  blurb: 'Corri in una cinquecento lungo l\'Italia: la costiera, Roma, la Toscana. Supera le auto, evita gli scontri e arriva ai punti di controllo prima che finisca il tempo. Tieni il dito a sinistra o a destra per sterzare; l\'acceleratore è automatico, B frena.',
  inputs: ['TRASCINA PER STERZARE', 'ACCELERA DA SOLA', 'B = FRENO'],
  size: [360, 640],
  bg: '#1a1840',
  flexH: true,
  flexMin: 1.15,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const TOPH = 44, CY = Math.round(H * 0.40);
    const SEGL = 200, RUMBLE = 3, ROADW = 1700, CAMH = 2000, CAMD = 1.664, DRAW = 140, LANES = 3;
    const MAXS = 12000, ACCEL = MAXS / 5, BRAKE = -MAXS, DECEL = -MAXS / 5, OFFDECEL = -MAXS / 2, OFFLIMIT = MAXS / 4, CENTRI = 0.3;
    const PLAYERZ = CAMH * CAMD, HALF = W / 2, S_LEN = 1100, NST = 5;
    const TAU = Math.PI * 2;

    const STAGES = [
      { name: 'NAPOLI', sky: ['#4a56d8', '#9a8fe0', '#e6dcf4'], g1: '#5a9a44', g2: '#4f8a3a', sea: ['#2f7fe0', '#3b8cf0'], road: ['#6a6486', '#625c7e'], wall: true },
      { name: 'ROMA', sky: ['#f07a52', '#f6b08a', '#fbe0b8'], g1: '#8a9a48', g2: '#7e8e40', sea: null, road: ['#706a78', '#66606e'], wall: true },
      { name: 'FIRENZE', sky: ['#5b9be0', '#a8d0f0', '#f4ecc8'], g1: '#7aa84a', g2: '#6e9c40', sea: null, road: ['#6e6a80', '#646078'], wall: true },
      { name: 'VENEZIA', sky: ['#7aa8e8', '#c0d8f4', '#fbe8d8'], g1: '#6aa07a', g2: '#5e946e', sea: ['#58b0c8', '#68c0d8'], road: ['#78768c', '#6e6c84'], wall: false },
      { name: 'SICILIA', sky: ['#f0a040', '#f8c878', '#fff0c8'], g1: '#c8a85a', g2: '#bc9c50', sea: ['#1f6fd0', '#2a7ee0'], road: ['#7a6e6a', '#706460'], wall: true },
    ];
    // dopo ogni tappa si sceglie a sinistra o a destra la tappa successiva
    const CHOICES = [[1, 2], [2, 3], [3, 4], [4, 0], [0, 1]];

    // Radio di bordo: tre brani originali a 8 bit (melodia + basso)
    const RADIO = [
      { name: 'SOLE', bpm: 132, mel: [0, 4, 7, 12, 7, 4, 7, 9, 5, 9, 12, 17, 12, 9, 12, 14, 7, 11, 14, 19, 14, 11, 14, 16, 4, 7, 12, 16, 12, 7, 4, 7], bass: [0, 0, 5, 5, 7, 7, 4, 4] },
      { name: 'MARE', bpm: 116, mel: [9, 12, 16, 12, 9, 12, 16, 19, 7, 11, 14, 11, 7, 11, 14, 17, 5, 9, 12, 9, 5, 9, 12, 16, 4, 8, 11, 8, 4, 8, 11, 14], bass: [-3, -3, -5, -5, -7, -7, -8, -8] },
      { name: 'NOTTE', bpm: 142, mel: [2, -1, 9, 2, -1, 9, 7, -1, 5, -1, 12, 5, -1, 12, 9, -1, 7, -1, 14, 7, -1, 14, 12, -1, 9, 12, 14, 12, 9, 7, 5, 2], bass: [2, 2, 2, 2, 5, 5, 7, 7] },
    ];
    let radio = api.store.get('radio', 0), musicT = 0, musicStep = 0;
    const hz = semi => 261.63 * Math.pow(2, semi / 12);
    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, time = 60, position = 0, speed = 0, playerX = 0, steer = 0, lap = 0, stageIdx = 0, tm = 0, flashMsg = '', flashT = 0;
    let vx = 0, turbo = 0, turboCd = 0, steerT = null, brakeBtn = null, turboBtn = null, smoke = [], skid = 0, braking = false, curMod = 0, choice = 0, stageCount = 1, segments = [], cars = [], trackLength = 0, touch = null, countdown = 0, shake = 0, skyOff = 0, engT = 0, overtakes = 0, lastStage = 0, passedGuard = 0;

    // ---- pista ----
    const lastY = () => (segments.length ? segments[segments.length - 1].p2.world.y : 0);
    const easeIn = (a, b, p) => a + (b - a) * p * p, easeOut = (a, b, p) => a + (b - a) * (1 - (1 - p) * (1 - p)), easeInOut = (a, b, p) => a + (b - a) * (-Math.cos(p * Math.PI) / 2 + 0.5);
    const addSegment = (curve, y) => {
      const n = segments.length;
      segments.push({ index: n, stage: Math.floor(n / S_LEN) % NST, p1: { world: { y: lastY(), z: n * SEGL }, camera: {}, screen: {} }, p2: { world: { y, z: (n + 1) * SEGL }, camera: {}, screen: {} }, curve, sprites: [], cars: [], light: Math.floor(n / RUMBLE) % 2 === 0 });
    };
    const addRoad = (enter, hold, leave, curve, y) => {
      const startY = lastY(), endY = startY + (y || 0) * SEGL, total = enter + hold + leave;
      for (let n = 0; n < enter; n++) addSegment(easeIn(0, curve, n / enter), easeInOut(startY, endY, n / total));
      for (let n = 0; n < hold; n++) addSegment(curve, easeInOut(startY, endY, (enter + n) / total));
      for (let n = 0; n < leave; n++) addSegment(easeInOut(curve, 0, n / leave), easeInOut(startY, endY, (enter + hold + n) / total));
    };
    const straight = n => addRoad(n, n, n, 0, 0), hill = (n, h) => addRoad(n, n, n, 0, h), curve = (n, c, h) => addRoad(n, n, n, c, h);
    const sCurves = () => { addRoad(30, 30, 30, -2, 0); addRoad(30, 30, 30, 4, 12); addRoad(30, 30, 30, -3, -10); addRoad(30, 30, 30, 2, 8); addRoad(30, 30, 30, -4, -6); };
    const buildTrack = () => {
      segments = [];
      const plans = [
        () => { hill(25, 18); curve(40, 3, 10); sCurves(); hill(30, 26); curve(40, -4, -14); curve(45, 5, 12); },
        () => { curve(50, 2, 6); hill(40, 14); curve(50, -3, -8); sCurves(); curve(40, 3, 8); hill(30, -10); },
        () => { hill(35, 30); curve(40, -4, 14); curve(40, 5, -12); sCurves(); curve(50, -5, 10); hill(30, -20); },
        () => { curve(45, 3, 4); sCurves(); curve(50, -4, 6); hill(30, 12); curve(40, 4, -6); },
        () => { hill(30, 24); curve(45, -5, 16); curve(40, 4, -14); sCurves(); curve(40, -3, 10); hill(30, -16); },
      ];
      for (let st = 0; st < NST; st++) {
        addRoad(0, 40, 0, 0, 0); plans[st]();
        while (segments.length < (st + 1) * S_LEN - 100) addRoad(30, 40, 30, 0, 0);
        addRoad(30, 30, 30, 0, -lastY() / SEGL);
        while (segments.length < (st + 1) * S_LEN) addSegment(0, 0);
      }
      trackLength = segments.length * SEGL;
      // scenario
      const rnd = (() => { let s = 4242; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
      segments.forEach(seg => {
        const n = seg.index, st = seg.stage, local = n % S_LEN;
        const side = () => (rnd() < 0.5 ? -1 : 1);
        if (n % 41 === 0) seg.sprites.push({ k: 'sign', off: 1.28 });
        if (n % 29 === 0) seg.sprites.push({ k: 'lamp', off: -1.22 });
        if (st === 0) { if (n % 7 === 0) seg.sprites.push({ k: 'pine', off: 1.7 + rnd() * 1.6 }); if (n % 5 === 0) seg.sprites.push({ k: 'cypress', off: 2.1 + rnd() * 1.5 }); if (n % 11 === 0) seg.sprites.push({ k: 'bush', off: 1.34 }); if (n % 13 === 0) seg.sprites.push({ k: 'house', off: -(3.4 + rnd() * 2) }); }
        else if (st === 1) { if (n % 7 === 0) seg.sprites.push({ k: 'pine', off: side() * (1.8 + rnd() * 1.6) }); if (n % 9 === 0) seg.sprites.push({ k: 'bush', off: -1.4 }); if (n % 17 === 0) seg.sprites.push({ k: 'house', off: side() * (2.6 + rnd() * 1.2) }); if (local === 330 || local === 760) seg.sprites.push({ k: 'colosseum', off: 4.6 }); }
        else if (st === 2) { if (n % 6 === 0) seg.sprites.push({ k: 'cypress', off: -1.5 }); if (n % 6 === 3) seg.sprites.push({ k: 'cypress', off: 1.5 }); if (n % 19 === 0) seg.sprites.push({ k: 'house', off: side() * (3 + rnd() * 1.5) }); if (n % 8 === 0) seg.sprites.push({ k: 'cypress', off: side() * (2.4 + rnd() * 2) }); if (local === 500) seg.sprites.push({ k: 'tower', off: 3.6 }); }
        else if (st === 3) { if (n % 8 === 0) seg.sprites.push({ k: 'house', off: 2.4 + rnd() * 1.6 }); if (n % 14 === 0) seg.sprites.push({ k: 'house', off: -(3 + rnd() * 1.4) }); if (n % 10 === 0) seg.sprites.push({ k: 'bush', off: 1.4 }); if (n % 12 === 0) seg.sprites.push({ k: 'pine', off: 3 + rnd() * 1.5 }); }
        else { if (n % 6 === 0) seg.sprites.push({ k: 'palm', off: side() * (1.7 + rnd() * 1.3) }); if (n % 9 === 0) seg.sprites.push({ k: 'bush', off: 1.34 }); if (n % 15 === 0) seg.sprites.push({ k: 'house', off: 3 + rnd() * 1.6 }); if (local === 300 || local === 820) seg.sprites.push({ k: 'temple', off: 3.9 }); }
      });
      // traffico
      cars = [];
      const palette = ['#d8392f', '#2f6fd8', '#e8b020', '#2fa05a', '#8a4ac8', '#e87a2a'];
      for (let i = 0; i < 110; i++) {
        const offset = (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 0.7), z = Math.floor(Math.random() * segments.length) * SEGL, sp = MAXS / 5 + Math.random() * MAXS / 2.2;
        const kindR = Math.random(), car = { offset, z, speed: sp, color: palette[(Math.random() * palette.length) | 0], kind: kindR < 0.2 ? 'van' : kindR < 0.45 ? 'sport' : 'hatch', w: 0.4, passed: false };
        segments[Math.floor(z / SEGL) % segments.length].cars.push(car); cars.push(car);
      }
    };
    const findSeg = z => segments[Math.floor(z / SEGL) % segments.length];
    const incr = (v, inc, max) => { let r = v + inc; while (r >= max) r -= max; while (r < 0) r += max; return r; };
    const overlap = (x1, w1, x2, w2, pc) => { const h = (pc || 1) / 2, a1 = x1 - w1 * h, a2 = x1 + w1 * h, b1 = x2 - w2 * h, b2 = x2 + w2 * h; return !(a2 < b1 || a1 > b2); };

    const arp = (notes, step, type, vol) => notes.forEach((f, i) => setTimeout(() => api.beep(f, step * 1.4, type || 'triangle', vol || 0.04), i * step * 1000));
    const flash = s => { flashMsg = s; flashT = 2; };
    const newGame = () => {
      score = 0; time = 62; position = 0; speed = 0; playerX = 0; lap = 0; stageIdx = 0; lastStage = 0; curMod = 0; choice = 0; stageCount = 1; shake = 0; skyOff = 0; overtakes = 0;
      if (!segments.length) buildTrack();
      cars.forEach(c => { c.passed = false; });
      countdown = 3.4; state = 'play'; flash('STAGE 1 · ' + STAGES[0].name + ' · LA PROSSIMA TAPPA LA SCEGLI TU');
    };
    const endGame = () => { state = 'over'; if (score > hi) { hi = score; api.store.set('hi', hi); } };

    // ---- aggiornamento ----
    const update = dt => {
      tm += dt; flashT = Math.max(0, flashT - dt); shake = Math.max(0, shake - dt);
      if (state === 'title' || (state === 'play' && countdown <= 0 && time > 0)) {
        const r = RADIO[radio], stepT = 60 / r.bpm / 2; musicT += dt;
        while (musicT >= stepT) { musicT -= stepT; const m = r.mel[musicStep % r.mel.length]; if (m >= 0) api.beep(hz(m), stepT * 0.9, 'square', 0.014); if (musicStep % 4 === 0) api.beep(hz(r.bass[((musicStep / 4) | 0) % r.bass.length] - 12), stepT * 3, 'triangle', 0.03); musicStep++; }
      }
      if (state !== 'play') return;
      if (!segments.length) buildTrack();
      if (countdown > 0) { const c0 = Math.ceil(countdown); countdown -= dt; if (Math.ceil(countdown) !== c0) api.beep(countdown > 0 ? 440 : 880, 0.15, 'square', 0.04); return; }
      time -= dt;
      const playerSeg = findSeg(position + PLAYERZ), speedPct = speed / MAXS, dx = dt * 2 * speedPct;
      position = incr(position, dt * speed, trackLength);
      const key = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      let tgt = key;
      if (steerT) { const d = steerT.x - steerT.ox; const m = Math.max(0, Math.abs(d) - 4) / 56; tgt = Math.sign(d) * Math.min(1, Math.pow(m, 1.15)); }
      steer += (tgt - steer) * Math.min(1, dt * 12);
      braking = !!(held.b || brakeBtn !== null);
      turboCd = Math.max(0, turboCd - dt);
      if ((held.a || turboBtn !== null) && turbo <= 0 && turboCd <= 0 && speed > MAXS * 0.3) { turbo = 2.2; turboCd = 8; shake = 0.25; api.haptic(30); arp([392, 523, 784], 0.05, 'sawtooth', 0.04); }
      turbo = Math.max(0, turbo - dt);
      const maxNow = turbo > 0 ? MAXS * 1.28 : MAXS;
      // sterzo con inerzia laterale: piu' preciso a bassa velocita', scivola in curva
      const vT = steer * (1.5 + 1.5 * speedPct) * (0.35 + 0.65 * Math.min(1, speed / (MAXS * 0.25)));
      vx += (vT - vx) * Math.min(1, dt * 8);
      playerX += vx * dt; playerX -= dx * speedPct * playerSeg.curve * 0.3;
      skid = Math.max(0, Math.abs(playerSeg.curve) * speedPct * speedPct * (1 - Math.min(1, Math.abs(steer) * 0.0)) - 1.7) * (Math.abs(steer) > 0.2 ? 1 : 0.4);
      if (braking) speed += BRAKE * dt; else if (time > 0) speed += (turbo > 0 ? ACCEL * 2.2 : ACCEL) * dt;
      if ((playerX < -1 || playerX > 1) && speed > OFFLIMIT) speed += OFFDECEL * dt;
      playerX = Math.max(-2.2, Math.min(2.2, playerX)); speed = Math.max(0, Math.min(maxNow, speed));
      if (speed > MAXS && turbo <= 0) speed = Math.max(MAXS, speed - MAXS * dt * 0.5);
      // particelle: fumo derapata/freno, polvere fuori strada, fiamma turbo
      if ((skid > 0.15 || (braking && speed > MAXS * 0.35)) && Math.random() < dt * 40) for (const sd of [-1, 1]) smoke.push({ x: W / 2 + sd * W * 0.12, y: H * 0.93, vx: sd * (10 + Math.random() * 20), vy: -20 - Math.random() * 30, t: 0.6, c: 'rgba(235,235,245,' });
      if ((playerX < -1 || playerX > 1) && speed > OFFLIMIT * 0.4 && Math.random() < dt * 45) smoke.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.93, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 30, t: 0.5, c: 'rgba(190,160,110,' });
      smoke.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }); smoke = smoke.filter(p => p.t > 0);
      if (skid > 0.2) { engT -= 0; if (Math.random() < dt * 8) api.beep(520 + Math.random() * 120, 0.12, 'sawtooth', 0.012); }
      // collisioni con le auto
      for (const car of playerSeg.cars) if (speed > car.speed && overlap(playerX, 0.42, car.offset, car.w, 0.8)) {
        speed = car.speed * (car.speed / Math.max(1, speed)); position = incr(car.z, -PLAYERZ, trackLength); shake = 0.4; api.haptic(40); api.beep(110, 0.25, 'sawtooth', 0.06); break;
      }
      // traffico
      for (const car of cars) {
        const old = findSeg(car.z); car.z = incr(car.z, dt * car.speed, trackLength);
        let d = 0;
        for (let i = 1; i < 20 && d === 0; i++) {
          const s = segments[(old.index + i) % segments.length];
          if (s === playerSeg && car.speed > speed && overlap(playerX, 0.42, car.offset, car.w, 1.2)) { const dir = playerX > 0.5 ? -1 : playerX < -0.5 ? 1 : (car.offset > playerX ? 1 : -1); d = dir / i * (car.speed - speed) / MAXS; break; }
          for (const o of s.cars) if (o !== car && car.speed > o.speed && overlap(car.offset, car.w, o.offset, o.w, 1.2)) { const dir = o.offset > 0.5 ? -1 : o.offset < -0.5 ? 1 : (car.offset > o.offset ? 1 : -1); d = dir / i * (car.speed - o.speed) / MAXS; break; }
        }
        if (d === 0) d = car.offset < -0.9 ? 0.1 : car.offset > 0.9 ? -0.1 : 0;
        car.offset = Math.max(-0.95, Math.min(0.95, car.offset + d * dt * 60));
        const ns = findSeg(car.z); if (ns !== old) { old.cars.splice(old.cars.indexOf(car), 1); ns.cars.push(car); }
        // sorpasso
        let rel = car.z - (position + PLAYERZ); if (rel > trackLength / 2) rel -= trackLength; if (rel < -trackLength / 2) rel += trackLength;
        if (!car.passed && rel < -SEGL && rel > -SEGL * 6) { car.passed = true; score += 50; overtakes++; } else if (rel > SEGL * 20) car.passed = false;
      }
      score += Math.floor(speed * dt / 40);
      skyOff += playerSeg.curve * speedPct * dt * 0.06; skyOff = Math.max(-1, Math.min(1, skyOff * (1 - dt * 0.2)));
      // tappe: all'ultimo tratto si sceglie a sinistra o a destra la prossima
      const si = Math.floor(playerSeg.index / S_LEN) % NST, inMod = playerSeg.index - si * S_LEN;
      if (inMod > S_LEN - 230) { choice = playerX < 0 ? 0 : 1; }
      if (si !== curMod) {
        const ch = CHOICES[curMod][choice]; curMod = si; stageCount++; const nat = si;
        if (ch !== nat) position = incr(position, (ch - nat) * S_LEN * SEGL, trackLength);
        stageIdx = ch; curMod = ch; choice = 0;
        const bonus = 42; time += bonus; score += 1000; arp([523, 659, 784, 1047], 0.09, 'triangle', 0.05); api.haptic(25);
        flash('PUNTO DI CONTROLLO +' + bonus + 's · ' + STAGES[ch].name);
      } else stageIdx = si;
      // motore
      engT -= dt; if (engT <= 0 && speed > 0) { api.beep(70 + speedPct * 160, 0.07, 'sawtooth', 0.012); engT = 0.09; }
      if (time <= 0) { time = 0; speed = Math.max(0, speed - MAXS * dt * 0.6); if (speed <= 0) { arp([392, 330, 262], 0.15, 'triangle', 0.05); endGame(); } }
    };

    const BTN = () => [{ k: 'brake', x: 44, y: H - 112, r: 32, label: 'FRENO', c: '#e5413b' }, { k: 'turbo', x: W - 44, y: H - 112, r: 32, label: 'TURBO', c: '#ffb020' }];
    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'title') { const by = H * 0.14 + 136; for (let i = 0; i < 3; i++) { const bx = W / 2 - 120 + i * 82; if (e.x > bx && e.x < bx + 76 && e.y > by && e.y < by + 30) { radio = i; musicStep = 0; musicT = 0; api.store.set('radio', i); return; } } }
        if (state === 'play' && e.y < TOPH && e.x > 150 && e.x < 260) { radio = (radio + 1) % 3; musicStep = 0; musicT = 0; api.store.set('radio', radio); flash('RADIO ' + RADIO[radio].name); return; }
        if (state === 'title' || state === 'over') { newGame(); return; }
        if (state === 'pause') { state = 'play'; return; }
        const hit = BTN().find(b => Math.hypot(e.x - b.x, e.y - b.y) < b.r + 12);
        if (hit) { if (hit.k === 'brake') brakeBtn = e.id; else turboBtn = e.id; return; }
        if (!steerT) steerT = { id: e.id, ox: e.x, x: e.x };
      } else if (e.type === 'move') {
        if (steerT && e.id === steerT.id) { steerT.x = e.x; const d = e.x - steerT.ox; if (Math.abs(d) > 70) steerT.ox = e.x - Math.sign(d) * 70; }
      } else if (e.type === 'up') {
        if (steerT && e.id === steerT.id) steerT = null; if (brakeBtn === e.id) brakeBtn = null; if (turboBtn === e.id) turboBtn = null;
      }
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'over') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'select') { if (state !== 'title') newGame(); }
    };

    // ---- disegno ----
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#eef1ff'; g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = '#eef1ff'; g.fillRect(x, y, w, h); g.fillStyle = '#141234'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };
    const poly = (x1, y1, x2, y2, x3, y3, x4, y4, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.lineTo(x4, y4); g.closePath(); g.fill(); };
    const project = (p, camX, camY, camZ) => {
      p.camera.x = (p.world.x || 0) - camX; p.camera.y = p.world.y - camY; p.camera.z = p.world.z - camZ;
      p.screen.scale = CAMD / p.camera.z;
      p.screen.x = Math.round(W / 2 + p.screen.scale * p.camera.x * HALF);
      p.screen.y = Math.round(CY - p.screen.scale * p.camera.y * HALF);
      p.screen.w = Math.round(p.screen.scale * ROADW * HALF);
    };

    const drawSky = (st, tt) => {
      const sk = g.createLinearGradient(0, TOPH, 0, CY + 2); sk.addColorStop(0, st.sky[0]); sk.addColorStop(0.65, st.sky[1]); sk.addColorStop(1, st.sky[2]);
      g.fillStyle = sk; g.fillRect(0, TOPH, W, CY - TOPH + 2);
      const sh = skyOff * -60;
      // nuvole
      g.fillStyle = 'rgba(255,255,255,.88)';
      for (let i = 0; i < 4; i++) { const cx = ((i * 140 + tt * (4 + i) + sh * 0.5) % (W + 160)) - 60, cy = TOPH + 30 + (i % 3) * 34; g.beginPath(); g.ellipse(cx, cy, 36, 9, 0, 0, TAU); g.ellipse(cx + 18, cy - 7, 24, 9, 0, 0, TAU); g.ellipse(cx - 18, cy - 4, 20, 7, 0, 0, TAU); g.fill(); }
      const base = CY;
      if (stageIdx === 0) {
        // Vesuvio con pennacchio e paese sul golfo
        const vx = W * 0.5 + sh;
        const vg = g.createLinearGradient(0, base - 100, 0, base); vg.addColorStop(0, '#7a5ab0'); vg.addColorStop(1, '#4a3a88');
        g.fillStyle = vg; g.beginPath(); g.moveTo(vx - 190, base); g.lineTo(vx - 60, base - 70); g.lineTo(vx - 22, base - 96); g.lineTo(vx + 4, base - 88); g.lineTo(vx + 26, base - 98); g.lineTo(vx + 70, base - 64); g.lineTo(vx + 200, base); g.closePath(); g.fill();
        g.fillStyle = 'rgba(30,20,70,.35)'; g.beginPath(); g.moveTo(vx + 4, base - 88); g.lineTo(vx + 26, base - 98); g.lineTo(vx + 70, base - 64); g.lineTo(vx + 200, base); g.lineTo(vx + 40, base); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(vx + 4 + Math.sin(tt + i) * 3 + i * 4, base - 100 - i * 11, 6 + i * 2.2, 0, TAU); g.fill(); }
        g.fillStyle = '#6a9a58'; g.beginPath(); g.moveTo(0, base); g.quadraticCurveTo(W * 0.2 + sh * 0.5, base - 40, W * 0.45 + sh * 0.5, base); g.fill();
        for (let i = 0; i < 26; i++) { const hx = 10 + i * 9 + sh * 0.5, hy = base - 4 - ((i * 13) % 14); g.fillStyle = i % 3 ? '#f0d6b0' : '#e8b890'; g.fillRect(hx, hy, 7, 5); g.fillStyle = '#c0583a'; g.fillRect(hx, hy - 1.5, 7, 1.6); }
      } else if (stageIdx === 1) {
        // Roma: Colosseo e cupola di San Pietro
        g.fillStyle = '#b08a9a'; g.beginPath(); g.moveTo(0, base); for (let x = 0; x <= W; x += 20) g.lineTo(x, base - 14 - 8 * Math.abs(Math.sin(x * 0.07 + sh * 0.02))); g.lineTo(W, base); g.fill();
        const cx = W * 0.3 + sh * 0.6; g.fillStyle = '#d8b0a0'; g.fillRect(cx - 40, base - 22, 80, 22);
        g.fillStyle = '#c89888'; g.beginPath(); g.ellipse(cx, base - 22, 22, 28, 0, Math.PI, 0); g.fill(); g.fillRect(cx - 2, base - 56, 4, 10); g.fillRect(cx - 5, base - 52, 10, 2);
        for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(80,50,50,.5)'; g.fillRect(cx - 36 + i * 11, base - 18, 4, 12); }
        const kx = W * 0.72 + sh * 0.7; g.fillStyle = '#e0bc8c'; g.beginPath(); g.ellipse(kx, base - 8, 52, 18, 0, Math.PI, 0); g.fillRect(kx - 52, base - 8, 104, 8); g.fill();
        g.fillStyle = 'rgba(90,50,30,.55)'; for (let r = 0; r < 2; r++) for (let c = 0; c < 9; c++) { g.beginPath(); g.ellipse(kx - 44 + c * 11, base - 4 - r * 9, 3, 4, 0, Math.PI, 0); g.fill(); }
      } else if (stageIdx === 2) {
        // Firenze: Duomo con la cupola del Brunelleschi e campanile di Giotto
        for (const [off, col, amp] of [[0.3, '#8fb27a', 34], [0.6, '#74a060', 22]]) { g.fillStyle = col; g.beginPath(); g.moveTo(0, base); for (let x = 0; x <= W + 8; x += 8) g.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin((x - sh * off * 2) * 0.012 + off * 9)) - 6); g.lineTo(W, base); g.closePath(); g.fill(); }
        const dx0 = W * 0.55 + sh * 0.6;
        g.fillStyle = '#e8d8c0'; g.fillRect(dx0 - 40, base - 30, 80, 30);
        const dg = g.createLinearGradient(0, base - 76, 0, base - 30); dg.addColorStop(0, '#d8603a'); dg.addColorStop(1, '#a8402a');
        g.fillStyle = dg; g.beginPath(); g.ellipse(dx0, base - 30, 26, 44, 0, Math.PI, 0); g.fill();
        g.strokeStyle = '#f0e0c8'; g.lineWidth = 1.4; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(dx0, base - 74); g.quadraticCurveTo(dx0 + i * 12, base - 56, dx0 + i * 20, base - 30); g.stroke(); }
        g.fillStyle = '#e8d8c0'; g.fillRect(dx0 - 3, base - 90, 6, 16);
        g.fillRect(dx0 + 52, base - 70, 12, 70); g.fillStyle = '#d8603a'; g.fillRect(dx0 + 50, base - 72, 16, 4); g.fillStyle = 'rgba(80,60,50,.5)'; for (let i = 0; i < 3; i++) g.fillRect(dx0 + 55, base - 60 + i * 16, 6, 8);
        for (let i = 0; i < 12; i++) { g.fillStyle = '#f0d6b0'; g.fillRect(dx0 - 90 + i * 12, base - 14 - (i % 3) * 3, 9, 9); g.fillStyle = '#c0583a'; g.fillRect(dx0 - 90 + i * 12, base - 15 - (i % 3) * 3, 9, 2); }
      } else if (stageIdx === 3) {
        // Venezia: campanile di San Marco, cupole e Palazzo Ducale sulla laguna
        g.fillStyle = '#68b8d0'; g.fillRect(0, base - 6, W, 6);
        const vx = W * 0.5 + sh * 0.6;
        g.fillStyle = '#c0583a'; g.fillRect(vx - 6, base - 90, 12, 90); g.fillStyle = '#e8d8a8'; g.fillRect(vx - 8, base - 100, 16, 10); g.fillStyle = '#d8a030'; g.beginPath(); g.moveTo(vx - 8, base - 100); g.lineTo(vx, base - 118); g.lineTo(vx + 8, base - 100); g.fill();
        g.fillStyle = '#e8d8c0'; g.fillRect(vx + 22, base - 26, 100, 26); g.fillStyle = 'rgba(120,60,50,.5)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.ellipse(vx + 28 + i * 8, base - 5, 2.6, 5, 0, Math.PI, 0); g.fill(); }
        g.fillStyle = '#f4ecd8'; for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(vx - 70 + i * 22, base - 22, 11, 14, 0, Math.PI, 0); g.fill(); } g.fillRect(vx - 82, base - 22, 90, 22);
        g.fillStyle = '#d8603a'; g.fillRect(vx - 140, base - 20, 50, 20); g.fillStyle = '#f0d0a0'; g.fillRect(vx - 130, base - 34, 30, 14);
        for (let i = 0; i < 3; i++) { const bx = ((i * 130 + tt * 8) % (W + 40)) - 20; g.fillStyle = '#2a1a1a'; g.beginPath(); g.moveTo(bx - 10, base - 3); g.quadraticCurveTo(bx, base + 1, bx + 10, base - 3); g.quadraticCurveTo(bx + 12, base - 6, bx + 10, base - 7); g.lineTo(bx - 10, base - 7); g.fill(); }
      } else {
        // Sicilia: Etna fumante e Taormina sulla costa
        const ex = W * 0.5 + sh * 0.8, eg = g.createLinearGradient(0, base - 110, 0, base); eg.addColorStop(0, '#8a6aa8'); eg.addColorStop(1, '#5a3a78');
        g.fillStyle = eg; g.beginPath(); g.moveTo(ex - 230, base); g.lineTo(ex - 70, base - 80); g.lineTo(ex - 14, base - 108); g.lineTo(ex + 18, base - 104); g.lineTo(ex + 80, base - 74); g.lineTo(ex + 240, base); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.moveTo(ex - 22, base - 100); g.lineTo(ex - 14, base - 108); g.lineTo(ex + 18, base - 104); g.lineTo(ex + 28, base - 94); g.lineTo(ex + 6, base - 88); g.lineTo(ex - 10, base - 96); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(ex + 2 + Math.sin(tt + i) * 3 + i * 6, base - 112 - i * 11, 6 + i * 2.2, 0, TAU); g.fill(); }
        g.fillStyle = '#8a7a58'; g.beginPath(); g.moveTo(0, base); g.lineTo(0, base - 30); g.lineTo(W * 0.3 + sh * 0.5, base - 18); g.lineTo(W * 0.45 + sh * 0.5, base); g.fill();
        for (let i = 0; i < 18; i++) { const hx = 8 + i * 10 + sh * 0.5, hy = base - 8 - ((i * 7) % 20); g.fillStyle = i % 3 ? '#f4e6c8' : '#f0c898'; g.fillRect(hx, hy, 8, 6); g.fillStyle = '#c0583a'; g.fillRect(hx, hy - 1.5, 8, 1.6); }
      }
    };

    const drawPine = (x, y, h) => {
      g.fillStyle = '#7a4c2c'; g.fillRect(x - h * 0.03, y - h * 0.62, h * 0.06, h * 0.62);
      g.fillStyle = '#3a2a1a'; g.fillRect(x + h * 0.01, y - h * 0.62, h * 0.02, h * 0.62);
      const ccx = x, ccy = y - h * 0.8;
      g.fillStyle = '#2a6638'; g.beginPath(); g.ellipse(ccx, ccy, h * 0.46, h * 0.16, 0, 0, TAU); g.ellipse(ccx - h * 0.2, ccy - h * 0.05, h * 0.26, h * 0.13, 0, 0, TAU); g.ellipse(ccx + h * 0.22, ccy - h * 0.04, h * 0.26, h * 0.13, 0, 0, TAU); g.fill();
      g.fillStyle = '#3f8a48'; g.beginPath(); g.ellipse(ccx - h * 0.05, ccy - h * 0.07, h * 0.32, h * 0.1, 0, 0, TAU); g.fill();
      g.fillStyle = '#58a85a'; g.beginPath(); g.ellipse(ccx - h * 0.1, ccy - h * 0.1, h * 0.16, h * 0.05, 0, 0, TAU); g.fill();
    };
    const drawCypress = (x, y, h) => {
      const cg = g.createLinearGradient(x - h * 0.08, 0, x + h * 0.08, 0); cg.addColorStop(0, '#1f5a3a'); cg.addColorStop(1, '#0f3a24');
      g.fillStyle = cg; g.beginPath(); g.moveTo(x, y - h); g.quadraticCurveTo(x + h * 0.12, y - h * 0.5, x + h * 0.07, y); g.lineTo(x - h * 0.07, y); g.quadraticCurveTo(x - h * 0.12, y - h * 0.5, x, y - h); g.fill();
    };
    const drawBush = (x, y, h) => {
      g.fillStyle = '#3f8a48'; g.beginPath(); g.ellipse(x, y - h * 0.3, h * 0.9, h * 0.35, 0, 0, TAU); g.fill();
      g.fillStyle = '#ff6fa8'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x + Math.cos(i * 2.3) * h * 0.7, y - h * 0.3 + Math.sin(i * 1.7) * h * 0.2, h * 0.09, 0, TAU); g.fill(); }
    };
    const drawHouse = (x, y, h) => {
      g.fillStyle = '#f0dcc0'; g.fillRect(x - h * 0.7, y - h * 0.7, h * 1.4, h * 0.7); g.fillStyle = '#c85a3a'; g.beginPath(); g.moveTo(x - h * 0.85, y - h * 0.7); g.lineTo(x, y - h * 1.1); g.lineTo(x + h * 0.85, y - h * 0.7); g.closePath(); g.fill();
      g.fillStyle = '#6a8ab8'; g.fillRect(x - h * 0.45, y - h * 0.5, h * 0.2, h * 0.28); g.fillRect(x + h * 0.25, y - h * 0.5, h * 0.2, h * 0.28);
    };
    const drawSign = (x, y, h) => {
      g.fillStyle = '#5a5a6a'; g.fillRect(x - h * 0.03, y - h * 0.7, h * 0.06, h * 0.7); g.fillRect(x + h * 0.55, y - h * 0.7, h * 0.06, h * 0.7);
      const sg = g.createLinearGradient(0, y - h, 0, y - h * 0.5); sg.addColorStop(0, '#2fa05a'); sg.addColorStop(1, '#1b7a42'); g.fillStyle = sg; g.beginPath(); g.roundRect(x - h * 0.12, y - h, h * 0.9, h * 0.45, h * 0.04); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(1, h * 0.02); g.stroke(); g.fillStyle = '#fff'; g.font = `bold ${Math.max(5, h * 0.16)}px ui-monospace, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('500 RUN', x + h * 0.33, y - h * 0.78);
    };
    const drawLamp = (x, y, h) => {
      g.fillStyle = '#4a4a5a'; g.fillRect(x - h * 0.012, y - h, h * 0.024, h); g.beginPath(); g.moveTo(x, y - h); g.quadraticCurveTo(x + h * 0.18, y - h * 1.04, x + h * 0.26, y - h * 0.96); g.lineWidth = Math.max(1, h * 0.02); g.strokeStyle = '#4a4a5a'; g.stroke();
      g.fillStyle = '#fff6c0'; g.beginPath(); g.ellipse(x + h * 0.27, y - h * 0.95, h * 0.06, h * 0.025, 0, 0, TAU); g.fill();
    };
    const drawTower = (x, y, h) => {
      g.save(); g.translate(x, y); g.rotate(0.07); const w = h * 0.2;
      const tg = g.createLinearGradient(-w, 0, w, 0); tg.addColorStop(0, '#fff6e4'); tg.addColorStop(1, '#c8b896'); g.fillStyle = tg; g.fillRect(-w, -h, w * 2, h);
      g.fillStyle = 'rgba(90,70,50,.5)'; for (let r = 0; r < 8; r++) { g.fillRect(-w, -h + r * h / 8, w * 2, h * 0.012); for (let c = 0; c < 5; c++) { g.beginPath(); g.ellipse(-w * 0.8 + c * w * 0.4, -h + (r + 0.55) * h / 8, w * 0.1, h * 0.03, 0, 0, TAU); g.fill(); } }
      g.fillStyle = '#b8a888'; g.fillRect(-w * 0.7, -h * 1.1, w * 1.4, h * 0.1); g.restore();
    };
    const drawPalm = (x, y, h) => {
      g.strokeStyle = '#6a4a2a'; g.lineWidth = Math.max(2, h * 0.04); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + h * 0.06, y - h * 0.5, x + h * 0.02, y - h * 0.9); g.stroke();
      g.strokeStyle = '#3a8a48'; g.lineWidth = Math.max(1.5, h * 0.03); for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6; g.beginPath(); g.moveTo(x + h * 0.02, y - h * 0.9); g.quadraticCurveTo(x + h * 0.02 + Math.cos(a) * h * 0.2, y - h * 0.98 + Math.sin(a) * h * 0.1, x + h * 0.02 + Math.cos(a) * h * 0.34, y - h * 0.86 - Math.sin(a) * h * 0.02); g.stroke(); }
    };
    const drawTemple = (x, y, h) => {
      const w = h * 2.6; g.fillStyle = '#e8d0a0'; g.fillRect(x - w / 2, y - h * 0.12, w, h * 0.12); g.fillRect(x - w / 2 - h * 0.1, y - h * 0.04, w + h * 0.2, h * 0.04);
      for (let i = 0; i < 6; i++) { const cx = x - w / 2 + h * 0.12 + i * (w - h * 0.24) / 5, cg = g.createLinearGradient(cx - h * 0.07, 0, cx + h * 0.07, 0); cg.addColorStop(0, '#f6e8c0'); cg.addColorStop(1, '#c8a870'); g.fillStyle = cg; g.fillRect(cx - h * 0.07, y - h * 0.82, h * 0.14, h * 0.7); }
      g.fillStyle = '#e8d0a0'; g.fillRect(x - w / 2, y - h * 0.92, w, h * 0.1); g.beginPath(); g.moveTo(x - w / 2, y - h * 0.92); g.lineTo(x, y - h * 1.12); g.lineTo(x + w / 2, y - h * 0.92); g.closePath(); g.fill();
    };
    const drawColosseum = (x, y, h) => {
      const w = h * 2.4, cg = g.createLinearGradient(0, y - h, 0, y); cg.addColorStop(0, '#e8c898'); cg.addColorStop(1, '#b88a5a');
      g.fillStyle = cg; g.beginPath(); g.moveTo(x - w / 2, y); g.lineTo(x - w / 2, y - h * 0.7); g.lineTo(x - w * 0.2, y - h); g.lineTo(x + w * 0.1, y - h * 0.98); g.lineTo(x + w * 0.22, y - h * 0.62); g.lineTo(x + w / 2, y - h * 0.7); g.lineTo(x + w / 2, y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(70,40,20,.62)';
      for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) { const ax = x - w / 2 + (c + 0.5) * w / 9, ay = y - h * (0.18 + r * 0.24); if (r === 2 && (c > 6 && c < 8)) continue; g.beginPath(); g.ellipse(ax, ay, w * 0.026, h * 0.085, 0, Math.PI, 0); g.rect(ax - w * 0.026, ay, w * 0.052, h * 0.07); g.fill(); }
    };
    const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const r = Math.max(0, Math.min(255, ((n >> 16) & 255) * f)), gg = Math.max(0, Math.min(255, ((n >> 8) & 255) * f)), b = Math.max(0, Math.min(255, (n & 255) * f)); return `rgb(${r | 0},${gg | 0},${b | 0})`; };
    // auto vista da dietro. kind: 'c500' (la nostra cinquecento), 'hatch', 'van', 'sport'
    const drawCarRear = (x, y, w, color, kind, tilt, fx) => {
      fx = fx || {}; const cream = kind === 'c500', van = kind === 'van', sport = kind === 'sport';
      g.save(); g.translate(x, y); g.scale(w / 100, w / 100);
      const lean = (tilt || 0) * 6, bodyC = cream ? '#efe6c8' : color;
      g.fillStyle = 'rgba(0,0,0,.34)'; g.beginPath(); g.ellipse(0, 1, 60, 8, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 1, 48, 5, 0, 0, TAU); g.fill();
      // ruote
      for (const sx of [-1, 1]) { g.fillStyle = '#0d0c14'; g.beginPath(); g.roundRect(sx * 46 - 8 + lean * 0.3, -22, 16, 22, 4); g.fill(); g.fillStyle = '#2a2838'; g.fillRect(sx * 46 - 6 + lean * 0.3, -21, 3, 20); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(sx * 46 - 1 + lean * 0.3, -21, 2, 20); }
      const bw = sport ? 108 : 100, top = van ? -96 : sport ? -50 : -54;
      // scocca bassa
      const bg = g.createLinearGradient(0, top, 0, -12); bg.addColorStop(0, shade(bodyC, 1.12)); bg.addColorStop(0.5, shade(bodyC, 1)); bg.addColorStop(1, shade(bodyC, 0.62));
      g.fillStyle = bg; g.beginPath(); g.roundRect(-bw / 2 + lean * 0.5, van ? -88 : -50, bw, van ? 76 : 40, 13); g.fill();
      // abitacolo
      if (!van) {
        const cg = g.createLinearGradient(0, -86, 0, -50); cg.addColorStop(0, shade(bodyC, 1.2)); cg.addColorStop(1, shade(bodyC, 0.9));
        g.fillStyle = cg; g.beginPath();
        if (sport) { g.moveTo(-42 + lean, -48); g.quadraticCurveTo(-32 + lean, -68, -20 + lean, -70); g.lineTo(20 + lean, -70); g.quadraticCurveTo(32 + lean, -68, 42 + lean, -48); }
        else { g.moveTo(-41 + lean, -50); g.quadraticCurveTo(-39 + lean * 1.2, -82, -22 + lean * 1.3, -86); g.lineTo(22 + lean * 1.3, -86); g.quadraticCurveTo(39 + lean * 1.2, -82, 41 + lean, -50); }
        g.closePath(); g.fill();
      }
      // vetro posteriore
      const gl = g.createLinearGradient(0, -82, 0, -52); gl.addColorStop(0, '#5c6c92'); gl.addColorStop(0.5, '#2a3350'); gl.addColorStop(1, '#161a2e');
      g.fillStyle = gl; g.beginPath();
      if (van) g.roundRect(-36 + lean * 0.5, -84, 34, 28, 5); else if (sport) { g.moveTo(-34 + lean, -49); g.quadraticCurveTo(-26 + lean, -64, -17 + lean, -66); g.lineTo(17 + lean, -66); g.quadraticCurveTo(26 + lean, -64, 34 + lean, -49); } else { g.moveTo(-33 + lean, -52); g.quadraticCurveTo(-31 + lean * 1.2, -78, -18 + lean * 1.3, -82); g.lineTo(18 + lean * 1.3, -82); g.quadraticCurveTo(31 + lean * 1.2, -78, 33 + lean, -52); }
      g.closePath(); g.fill();
      if (van) { g.beginPath(); g.roundRect(2 + lean * 0.5, -84, 34, 28, 5); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(lean * 0.5, -90); g.lineTo(lean * 0.5, -14); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.moveTo(-26 + lean, -62); g.lineTo(-10 + lean, -80); g.lineTo(-2 + lean, -80); g.lineTo(-18 + lean, -62); g.closePath(); g.fill();
      // cofano motore (la 500 ha il motore dietro: feritoie)
      if (cream) { g.fillStyle = 'rgba(90,80,55,.55)'; for (let i = 0; i < 5; i++) g.fillRect(-27 + lean * 0.5, -48 + i * 3.4, 54, 1.8); g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 5; i++) g.fillRect(-27 + lean * 0.5, -49.6 + i * 3.4, 54, 0.8); }
      // fanali
      const lc = fx.brake ? '#ff2a2a' : '#c01820';
      for (const sx of [-1, 1]) {
        if (fx.brake) { const rg = g.createRadialGradient(sx * 40 + lean * 0.6, -33, 1, sx * 40 + lean * 0.6, -33, 22); rg.addColorStop(0, 'rgba(255,50,40,.85)'); rg.addColorStop(1, 'rgba(255,50,40,0)'); g.fillStyle = rg; g.fillRect(sx * 40 - 24 + lean * 0.6, -57, 48, 48); }
        g.fillStyle = '#d8d8e0'; g.beginPath(); g.roundRect(sx * 40 - 7 + lean * 0.6, -44, 14, 22, 5); g.fill();
        g.fillStyle = lc; g.beginPath(); g.roundRect(sx * 40 - 5.5 + lean * 0.6, -42.5, 11, 19, 4); g.fill();
        g.fillStyle = fx.brake ? '#ffd0c0' : '#ff9a3a'; g.beginPath(); g.roundRect(sx * 40 - 4 + lean * 0.6, -41, 8, 6, 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(sx * 40 - 4 + lean * 0.6, -41.5, 2, 16);
      }
      // paraurti
      const pg = g.createLinearGradient(0, -22, 0, -12); pg.addColorStop(0, '#f4f6fb'); pg.addColorStop(0.5, '#aab2c4'); pg.addColorStop(1, '#5a6278');
      g.fillStyle = pg; g.beginPath(); g.roundRect(-bw / 2 + 1 + lean * 0.5, -22, bw - 2, 9, 4); g.fill();
      if (cream) { g.fillStyle = '#e8ecf6'; g.beginPath(); g.roundRect(-34 + lean * 0.5, -25, 7, 14, 3); g.roundRect(27 + lean * 0.5, -25, 7, 14, 3); g.fill(); }
      // targa
      g.fillStyle = '#f6f6f2'; g.beginPath(); g.roundRect(-15 + lean * 0.5, -37, 30, 13, 2); g.fill(); g.fillStyle = '#2255a8'; g.fillRect(-15 + lean * 0.5, -37, 4, 13);
      g.fillStyle = '#111'; g.font = 'bold 9px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(cream ? '500' : (((x * 7) | 0) % 900 + 100) + '', 2 + lean * 0.5, -35);
      // scarico
      g.fillStyle = '#20202c'; g.beginPath(); g.ellipse(30 + lean * 0.4, -12, 4.5, 3, 0, 0, TAU); g.fill();
      if (fx.flame) { const fl = 14 + Math.random() * 10; const fg2 = g.createLinearGradient(0, -12, 0, -12 + fl); fg2.addColorStop(0, '#fff6c0'); fg2.addColorStop(0.4, '#ffb020'); fg2.addColorStop(1, 'rgba(255,60,20,0)'); g.fillStyle = fg2; g.beginPath(); g.moveTo(26 + lean * 0.4, -12); g.lineTo(34 + lean * 0.4, -12); g.lineTo(30 + lean * 0.4, -12 + fl); g.closePath(); g.fill(); }
      // riflesso sulla scocca
      g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.roundRect(-bw / 2 + 8 + lean * 0.5, van ? -84 : -48, bw * 0.7, 3, 1.5); g.fill();
      g.restore();
    };
    const drawSprite = (k, sx, sy, sc, clip) => {
      const px = sc * HALF; let wH = 0;
      if (k === 'pine') wH = 5200; else if (k === 'cypress') wH = 5200; else if (k === 'tower') wH = 6000; else if (k === 'palm') wH = 5200; else if (k === 'temple') wH = 3200; else if (k === 'sign') wH = 1500; else if (k === 'lamp') wH = 2400; else if (k === 'bush') wH = 700; else if (k === 'house') wH = 1900; else if (k === 'colosseum') wH = 5200;
      const h = wH * px; if (h < 2) return;
      g.save(); g.beginPath(); g.rect(0, TOPH, W, Math.max(0, clip - TOPH)); g.clip();
      if (k === 'pine') drawPine(sx, sy, h); else if (k === 'cypress') drawCypress(sx, sy, h); else if (k === 'bush') drawBush(sx, sy, h); else if (k === 'house') drawHouse(sx, sy, h); else if (k === 'tower') drawTower(sx, sy, h); else if (k === 'palm') drawPalm(sx, sy, h); else if (k === 'temple') drawTemple(sx, sy, h); else if (k === 'sign') drawSign(sx, sy, h); else if (k === 'lamp') drawLamp(sx, sy, h); else drawColosseum(sx, sy, h);
      g.restore();
    };

    const renderSegment = (x1, y1, w1, x2, y2, w2, seg) => {
      const st = STAGES[seg.stage], l = seg.light;
      g.fillStyle = l ? st.g1 : st.g2; g.fillRect(0, y2, W, y1 - y2 + 1);
      const r1 = w1 / 6, r2 = w2 / 6, la1 = w1 / 24, la2 = w2 / 24;
      if (st.sea) {
        const o1 = w1 * 1.22, o2 = w2 * 1.22;
        poly(0, y1, 0, y2, x2 - o2, y2, x1 - o1, y1, (seg.index % 8 < 4) ? st.sea[0] : st.sea[1]);
        if ((seg.index * 7 + ((tm * 3) | 0)) % 5 === 0) { const gx = (x1 - o1) * (0.2 + ((seg.index * 13) % 7) / 10); g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(gx, y1 - Math.max(1, (y1 - y2) * 0.4), Math.max(2, w1 * 0.25), Math.max(1, (y1 - y2) * 0.3)); }
        // guardrail
        const rh1 = w1 * 0.16, rh2 = w2 * 0.16, a1 = x1 - w1 * 1.12, a2 = x2 - w2 * 1.12, b1 = x1 - w1 * 1.2, b2 = x2 - w2 * 1.2;
        poly(a1, y1, a1, y1 - rh1, a2, y2 - rh2, a2, y2, l ? '#bcc2d8' : '#9aa2c0');
        poly(a1, y1 - rh1, b1, y1 - rh1 * 1.05, b2, y2 - rh2 * 1.05, a2, y2 - rh2, '#e4e8f6');
        if (seg.index % 3 === 0) poly(b1, y1, b1, y1 - rh1 * 1.05, b1 + w1 * 0.03, y1 - rh1 * 1.05, b1 + w1 * 0.03, y1, '#6a7292');
      }
      // muretto in pietra sul lato destro (costiera) o lato destro in genere
      if (st.wall) {
        const a1 = x1 + w1 * 1.12, a2 = x2 + w2 * 1.12, b1 = x1 + w1 * 1.3, b2 = x2 + w2 * 1.3, wh1 = w1 * 0.3, wh2 = w2 * 0.3;
        poly(a1, y1, a1, y1 - wh1, a2, y2 - wh2, a2, y2, l ? '#d8b98c' : '#c4a070');
        poly(a1, y1 - wh1, b1, y1 - wh1, b2, y2 - wh2, a2, y2 - wh2, '#e8d0a8');
        if (seg.index % 2 === 0) poly(a1, y1 - wh1 * 0.5, a1, y1 - wh1 * 0.54, a2, y2 - wh2 * 0.54, a2, y2 - wh2 * 0.5, 'rgba(90,60,30,.35)');
      }
      poly(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, l ? '#f0ecfa' : '#c2394a');
      poly(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, l ? '#f0ecfa' : '#c2394a');
      poly(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, l ? st.road[0] : st.road[1]);
      poly(x1 - w1, y1, x1 - w1 + la1 * 1.3, y1, x2 - w2 + la2 * 1.3, y2, x2 - w2, y2, '#ece8f6');
      poly(x1 + w1 - la1 * 1.3, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 - la2 * 1.3, y2, '#ece8f6');
      if (l) { const lw1 = w1 * 2 / LANES, lw2 = w2 * 2 / LANES; let lx1 = x1 - w1 + lw1, lx2 = x2 - w2 + lw2; for (let i = 1; i < LANES; i++, lx1 += lw1, lx2 += lw2) poly(lx1 - la1 / 2, y1, lx1 + la1 / 2, y1, lx2 + la2 / 2, y2, lx2 - la2 / 2, y2, '#ece8f6'); }
    };

    const render = () => {
      const st = STAGES[state === 'title' ? 0 : stageIdx];
      g.fillStyle = '#1a1840'; g.fillRect(0, 0, W, H);
      g.save(); if (shake > 0) g.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
      drawSky(st, tm);
      g.fillStyle = st.g1; g.fillRect(0, CY, W, H - CY);
      if (!segments.length) { if (state === 'title') buildTrack(); else { g.restore(); return; } }
      const base = findSeg(position), bPct = (position % SEGL) / SEGL, pSeg = findSeg(position + PLAYERZ), pPct = ((position + PLAYERZ) % SEGL) / SEGL;
      const playerY = pSeg.p1.world.y + (pSeg.p2.world.y - pSeg.p1.world.y) * pPct;
      let maxy = H, x = 0, dx = -(base.curve * bPct);
      for (let n = 0; n < DRAW; n++) {
        const seg = segments[(base.index + n) % segments.length], looped = seg.index < base.index; seg.clip = maxy;
        project(seg.p1, playerX * ROADW - x, playerY + CAMH, position - (looped ? trackLength : 0));
        project(seg.p2, playerX * ROADW - x - dx, playerY + CAMH, position - (looped ? trackLength : 0));
        x += dx; dx += seg.curve;
        if (seg.p1.camera.z <= CAMD || seg.p2.screen.y >= seg.p1.screen.y || seg.p2.screen.y >= maxy) continue;
        renderSegment(seg.p1.screen.x, seg.p1.screen.y, seg.p1.screen.w, seg.p2.screen.x, seg.p2.screen.y, seg.p2.screen.w, seg);
        maxy = seg.p1.screen.y;
      }
      for (let n = DRAW - 1; n > 0; n--) {
        const seg = segments[(base.index + n) % segments.length];
        for (const car of seg.cars) {
          const pc = (car.z % SEGL) / SEGL, sc = seg.p1.screen.scale + (seg.p2.screen.scale - seg.p1.screen.scale) * pc;
          const cx = seg.p1.screen.x + (seg.p2.screen.x - seg.p1.screen.x) * pc + sc * car.offset * ROADW * HALF, cy = seg.p1.screen.y + (seg.p2.screen.y - seg.p1.screen.y) * pc;
          const wpx = sc * ROADW * 0.62 * HALF; if (wpx < 2) continue;
          g.save(); g.beginPath(); g.rect(0, TOPH, W, Math.max(0, seg.clip - TOPH)); g.clip(); drawCarRear(cx, cy, wpx, car.color, car.kind, 0, { brake: car.speed < speed * 0.8 }); g.restore();
        }
        for (const sp of seg.sprites) { const sc = seg.p1.screen.scale; drawSprite(sp.k, seg.p1.screen.x + sc * sp.off * ROADW * HALF, seg.p1.screen.y, sc, seg.clip); }
      }
      // auto del giocatore
      if (state !== 'title') {
        const bounce = Math.sin(tm * 30) * (speed / MAXS) * 1.2 + (playerX < -1 || playerX > 1 ? Math.sin(tm * 60) * 2 : 0);
        drawCarRear(W / 2 + vx * 6, H * 0.915 + bounce, W * 0.4, '#efe6c8', 'c500', steer * 0.9 + vx * 0.2, { brake: braking, flame: turbo > 0 });
      }
      // foschia all'orizzonte e vignettatura
      { const fgd = g.createLinearGradient(0, CY - 6, 0, CY + 96); fgd.addColorStop(0, st.sky[2]); fgd.addColorStop(1, 'rgba(255,255,255,0)'); g.globalAlpha = 0.5; g.fillStyle = fgd; g.fillRect(0, CY - 6, W, 102); g.globalAlpha = 1; }
      if (state === 'play' && speed > MAXS * 0.55) { const k2 = (speed / MAXS - 0.5) * (turbo > 0 ? 1.6 : 1); g.strokeStyle = `rgba(255,255,255,${0.12 * k2})`; g.lineWidth = 1.5; for (let i = 0; i < 14; i++) { const sx2 = (i % 2 ? 1 : -1) * (W * 0.34 + ((i * 53 + tm * 900) % (W * 0.3))), t2 = ((tm * 3 + i * 0.37) % 1); const xx = W / 2 + sx2 * (0.3 + t2), yy = CY + 30 + t2 * (H - CY - 30); g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + sx2 * 0.12, yy + 26 * t2 + 4); g.stroke(); } }
      smoke.forEach(p2 => { g.fillStyle = p2.c + (p2.t * 0.9) + ')'; g.beginPath(); g.arc(p2.x, p2.y, 6 + (0.6 - p2.t) * 24, 0, TAU); g.fill(); });
      const vg2 = g.createRadialGradient(W / 2, H * 0.55, H * 0.35, W / 2, H * 0.55, H * 0.8); vg2.addColorStop(0, 'rgba(10,8,30,0)'); vg2.addColorStop(1, 'rgba(10,8,30,.42)'); g.fillStyle = vg2; g.fillRect(0, TOPH, W, H - TOPH);
      if (turbo > 0) { g.fillStyle = `rgba(255,170,40,${0.1 + 0.05 * Math.sin(tm * 30)})`; g.fillRect(0, TOPH, W, H - TOPH); }
      g.restore();
      // HUD
      const hg = g.createLinearGradient(0, 0, 0, TOPH); hg.addColorStop(0, '#12103a'); hg.addColorStop(1, '#241c58'); g.fillStyle = hg; g.fillRect(0, 0, W, TOPH);
      text('SCORE', 8, 4, 9, 'left', '#7fd0ff'); text(String(score).padStart(7, '0'), 8, 16, 14);
      text('TIME', 100, 4, 9, 'left', '#7fd0ff'); g.fillStyle = '#12103a'; g.fillRect(98, 15, 40, 22); g.strokeStyle = '#7a7ac8'; g.lineWidth = 1; g.strokeRect(98.5, 15.5, 39, 21); text(String(Math.ceil(time)), 118, 18, 17, 'center', time < 10 ? '#ff5a5a' : '#ffe14a');
      text('500', 160, 6, 19, 'left', '#ffffff'); text('RUN', 197, 6, 19, 'left', '#ff7aa8');
      g.fillStyle = '#2fa05a'; g.fillRect(160, 31, 30, 3); g.fillStyle = '#f4f4f4'; g.fillRect(190, 31, 30, 3); g.fillStyle = '#d8392f'; g.fillRect(220, 31, 30, 3);
      text('STAGE ' + stageCount, W - 8, 4, 10, 'right', '#7fd0ff'); text(STAGES[stageIdx].name, W - 8, 15, 10, 'right', '#bff3ff');
      const prog = (position % trackLength) / trackLength; g.fillStyle = '#12103a'; g.fillRect(W - 100, 30, 92, 8); g.fillStyle = '#d8392f'; g.fillRect(W - 99, 31, 90 * prog, 6); g.fillStyle = '#eef1ff'; g.fillRect(W - 12, 30, 4, 8);
      if (state !== 'title') {
        text(String(Math.round(speed / MAXS * 180)), 10, H - 44, 24, 'left', turbo > 0 ? '#ff8a3a' : '#ffe14a'); text('km/h', 76, H - 30, 11, 'left', '#ffe14a');
        for (let i = 0; i < 12; i++) { g.fillStyle = i < Math.round(speed / MAXS * 12) ? (i < 5 ? '#4cc24a' : i < 9 ? '#ffd23f' : '#e5413b') : 'rgba(255,255,255,.18)'; g.fillRect(10 + i * 9, H - 14, 7, 8); }
        if (state === 'play') {
          for (const b of BTN()) { const on = (b.k === 'brake' && braking) || (b.k === 'turbo' && turbo > 0); g.fillStyle = on ? b.c : 'rgba(10,12,40,.55)'; g.beginPath(); g.arc(b.x, b.y, b.r, 0, TAU); g.fill(); g.strokeStyle = b.c; g.lineWidth = 3; g.stroke();
            if (b.k === 'turbo') { const rdy = turboCd <= 0; g.strokeStyle = rdy ? '#fff2a8' : 'rgba(255,255,255,.3)'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, b.r - 6, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - Math.min(1, turboCd / 8))); g.stroke(); }
            text(b.label, b.x, b.y - 5, 10, 'center', '#ffffff'); }
          if (steerT) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(steerT.ox, H * 0.78, 34, 0, TAU); g.stroke(); g.fillStyle = 'rgba(255,225,74,.7)'; g.beginPath(); g.arc(Math.max(steerT.ox - 40, Math.min(steerT.ox + 40, steerT.x)), H * 0.78, 16, 0, TAU); g.fill(); }
          else if (speed < MAXS * 0.6) text('TIENI IL DITO E TRASCINA PER STERZARE', W / 2, H * 0.66, 10, 'center', 'rgba(255,255,255,.75)');
        }
        if (countdown > 0) text(countdown > 0.4 ? String(Math.ceil(countdown - 0.4)) : 'VIA!', W / 2, H * 0.3, 54, 'center', '#ffffff');
        if (flashT > 0) text(flashMsg, W / 2, H * 0.22, 15, 'center', '#ffe14a');
        { const pSegF = findSeg(position + PLAYERZ), inM = pSegF.index - (Math.floor(pSegF.index / S_LEN) % NST) * S_LEN, cm = Math.floor(pSegF.index / S_LEN) % NST;
          if (inM > S_LEN - 330 && state === 'play') { const ch = CHOICES[cm]; for (let i = 0; i < 2; i++) { const bx = i ? W - 118 : 10, on = choice === i; g.fillStyle = on ? '#ffe14a' : 'rgba(10,12,40,.75)'; g.beginPath(); g.roundRect(bx, TOPH + 8, 108, 26, 6); g.fill(); text((i ? STAGES[ch[i]].name + ' >' : '< ' + STAGES[ch[i]].name), bx + 54, TOPH + 15, 11, 'center', on ? '#141234' : '#ffffff'); } } }
        if (time < 10 && time > 0 && state === 'play') text('TEMPO!', W / 2, H * 0.12 + 30, 13, 'center', '#ff5a5a');
      }
      if (state === 'title') {
        text('500', W / 2 - 52, H * 0.14, 46, 'center', '#ffffff'); text('RUN', W / 2 + 52, H * 0.14, 46, 'center', '#ff7aa8');
        g.fillStyle = '#2fa05a'; g.fillRect(W / 2 - 112, H * 0.14 + 52, 74, 5); g.fillStyle = '#f4f4f4'; g.fillRect(W / 2 - 38, H * 0.14 + 52, 76, 5); g.fillStyle = '#d8392f'; g.fillRect(W / 2 + 38, H * 0.14 + 52, 74, 5);
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, H * 0.14 + 82, 16, 'center', '#ffe14a');
        text('RECORD ' + hi, W / 2, H * 0.14 + 110, 13, 'center');
        for (let i = 0; i < 3; i++) { const bx = W / 2 - 120 + i * 82, by = H * 0.14 + 136, on = radio === i; g.fillStyle = on ? '#ffe14a' : 'rgba(10,12,40,.7)'; g.beginPath(); g.roundRect(bx, by, 76, 30, 8); g.fill(); g.strokeStyle = '#7a7ac8'; g.lineWidth = 1.5; g.stroke(); text('RADIO', bx + 38, by + 4, 8, 'center', on ? '#141234' : '#7fd0ff'); text(RADIO[i].name, bx + 38, by + 15, 11, 'center', on ? '#141234' : '#ffffff'); }
        text('SCEGLI LA RADIO · TOCCA FUORI PER PARTIRE', W / 2, H * 0.14 + 174, 9, 'center', '#bff3ff');
      }
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['TEMPO SCADUTO', 'PUNTI ' + score, 'SORPASSI ' + overtakes, 'TOCCA']);
    };

    buildTrack();
    return {
      onPress: act, onPointer,
      onHide() { if (state === 'play') state = 'pause'; steerT = brakeBtn = turboBtn = null; },
      update, render,
      debug: { newGame, get state() { return state; }, get speed() { return speed; }, get position() { return position; }, get time() { return time; }, set time(v) { time = v; }, set position(v) { position = v; }, get score() { return score; }, get stage() { return stageIdx; }, get playerX() { return playerX; }, get cars() { return cars; }, get segs() { return segments.length; } },
    };
  },
});

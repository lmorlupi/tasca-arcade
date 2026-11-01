registerGame({
  id: 'mouse-castle',
  title: 'MOUSE CASTLE',
  color: '#a655b8',
  blurb: 'Nel castello: raccogli tutte le chiavi, sali le scale, spingi i blocchi, evita fantasmi e ghiaccioli e usa le caselle W per teletrasportarti. Poi esci dalla porta.',
  inputs: ['D-PAD', 'PUZZLE', 'SALTO'],
  size: [352, 576],
  bg: '#1a1633',
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const T = 32, COLS = 11, ROWS = 18, ROOMS = 4, PW = 6, PH = 20;
    const GRAV = 1300, JUMP = -390, WALK = 92, CLIMB = 78;
    const roomTop = i => 1 + 4 * i;              // prima riga di tile della stanza i (dall'alto)
    const floorRow = i => 4 + 4 * i;             // riga del pavimento sotto la stanza i
    const standRow = i => 3 + 4 * i;             // riga dove si cammina nella stanza i

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, stateT = 0, msg = '', msgT = 0, time = 0, left = 0;
    let grid, keys, ghosts, icicles, blocks, warps, door, start, need, got, P, jumpBuf = 0, inv = 0, warpCool = 0;

    const rng = seed => () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    // Il castello: 4 stanze una sopra l'altra, collegate da scale. Tutto generato dal numero del livello.
    const gen = lv => {
      const rand = rng(lv * 7717 + 3), pick = (a, b) => a + ((rand() * (b - a + 1)) | 0);
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill('#'));
      for (let i = 0; i < ROOMS; i++) for (let r = roomTop(i); r <= standRow(i); r++) for (let c = 1; c <= COLS - 2; c++) grid[r][c] = '.';
      // scale tra stanza i e i+1 (colonne alternate a sinistra e a destra)
      const ladders = [];
      let prev = 0;
      for (let i = 0; i < ROOMS - 1; i++) {
        let c; do { c = i % 2 === 0 ? pick(6, 9) : pick(1, 4); } while (Math.abs(c - prev) < 3);
        ladders.push(c); prev = c;
        for (let r = floorRow(i); r <= floorRow(i) + 3; r++) grid[r][c] = 'H';
      }
      const lc = i => ladders[i];   // scala sotto la stanza i
      const used = new Set();
      const free = (room, c) => !used.has(room + ':' + c) && c >= 1 && c <= COLS - 2
        && !(room < ROOMS - 1 && Math.abs(c - lc(room)) < 1) && !(room > 0 && Math.abs(c - lc(room - 1)) < 1);
      const take = (room, near) => {
        for (let k = 0; k < 60; k++) {
          const c = pick(1, 9);
          if (free(room, c) && (near === undefined || Math.abs(c - near) >= 3)) { used.add(room + ':' + c); return c; }
        }
        return null;
      };

      start = { room: 3, c: pick(1, 3) }; used.add('3:' + start.c);
      door = { room: 0, c: pick(8, 9) }; used.add('0:' + door.c);
      keys = []; const nKeys = Math.min(8, 3 + lv);
      for (let k = 0; k < nKeys; k++) {
        const room = (k + 3) % ROOMS, c = take(room);
        if (c !== null) keys.push({ room, c, got: false, bob: rand() * 6 });
      }
      ghosts = [];
      for (let k = 0, n = Math.min(lv, 4); k < n; k++) {
        const room = 1 + (k % 3), c = take(room, room === 3 ? start.c : undefined);
        if (c !== null) ghosts.push({ room, x: c * T + T / 2, dir: rand() < .5 ? -1 : 1, t: rand() * 6 });
      }
      icicles = [];
      for (let k = 0, n = Math.min(1 + lv, 5); k < n; k++) {
        const room = k % 3, c = take(room);
        if (c !== null) icicles.push({ room, c, st: 'hang', t: 0, y: 0, vy: 0 });
      }
      blocks = [];
      for (let k = 0, n = lv >= 2 ? Math.min(lv - 1, 3) : 0; k < n; k++) {
        const room = (k + 1) % ROOMS, c = take(room);
        if (c !== null && c > 1 && c < 9) blocks.push({ room, c, r: standRow(room), push: 0, fall: 0 });
      }
      warps = [];
      if (lv >= 3) {
        const a = take(3), b = take(1);
        if (a !== null && b !== null) warps.push({ room: 3, c: a, to: 1 }, { room: 1, c: b, to: 3 });
        if (warps.length === 2) { warps[0].pair = warps[1]; warps[1].pair = warps[0]; }
      }
      need = keys.length; got = 0;
      left = 120 + lv * 5;
    };

    const resetPlayer = () => {
      P = { x: start.c * T + T / 2, y: standRow(start.room) * T + T, vx: 0, vy: 0, ground: true, ladder: false, face: 1, walk: 0, cut: false };
      jumpBuf = 0; inv = 1.4; warpCool = 0;
    };
    const newGame = () => { score = 0; lives = 3; level = 1; gen(level); resetPlayer(); state = 'play'; };
    const nextLevel = () => { level++; gen(level); resetPlayer(); state = 'play'; };
    const endGame = () => {
      state = 'over';
      if (score > hi) { hi = score; api.store.set('hi', hi); }
    };
    const flash = s => { msg = s; msgT = 1.3; };
    const hurt = why => {
      if (state !== 'play' || inv > 0) return;
      state = 'dead'; stateT = 1.2; lives--; api.haptic(50); api.beep(150, 0.3, 'sawtooth', 0.06);
      P.vy = -330; P.ladder = false;
      if (why) flash(why);
    };

    // Mappa
    const blockAt = (c, r) => blocks.some(b => b.c === c && b.r === r);
    const solid = (c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS) ? true : (grid[r][c] === '#' || blockAt(c, r));
    const ladderTop = (c, r) => grid[r] && grid[r][c] === 'H' && grid[r - 1] && grid[r - 1][c] !== 'H';
    const ladderExtent = (c, r) => {
      let t = r, b = r;
      while (t > 0 && grid[t - 1][c] === 'H') t--;
      while (b < ROWS - 1 && grid[b + 1][c] === 'H') b++;
      return [t * T, (b + 1) * T];
    };

    const movePlayer = dt => {
      const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dyIn = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      jumpBuf = Math.max(0, jumpBuf - dt);

      if (P.ladder) {
        const c = Math.floor(P.x / T), r = Math.floor((P.y - 8) / T);
        const [topY, botY] = ladderExtent(c, Math.max(0, Math.min(ROWS - 1, r)));
        P.y += dyIn * CLIMB * dt;
        if (dyIn) P.walk += dt * 8;
        if (P.y <= topY) { P.y = topY; P.ladder = false; P.ground = true; P.vy = 0; }
        else if (P.y >= botY) { P.y = botY; P.ladder = false; P.ground = true; P.vy = 0; }
        else if (dx && Math.abs(P.y - topY) < 4 || dx && Math.abs(P.y - botY) < 4) { P.ladder = false; }
        return;
      }

      const target = dx * WALK;
      P.vx += (target - P.vx) * Math.min(1, dt * (P.ground ? 16 : 7));
      if (dx) { P.face = dx; P.walk += dt * 10; }
      if (P.ground && jumpBuf > 0) { P.vy = JUMP; P.ground = false; jumpBuf = 0; P.cut = false; api.haptic(6); api.beep(560, 0.06); }
      if (P.cut && P.vy < -160) P.vy = -160;
      P.cut = false;
      P.vy += GRAV * dt;

      // orizzontale (e spinta dei blocchi)
      P.x += P.vx * dt;
      const r0 = Math.floor((P.y - PH) / T), r1 = Math.floor((P.y - 1) / T);
      const sideC = Math.floor((P.x + (P.vx > 0 ? PW : -PW)) / T);
      for (let r = r0; r <= r1; r++) {
        if (solid(sideC, r)) {
          P.x = P.vx > 0 ? sideC * T - PW - 0.01 : (sideC + 1) * T + PW + 0.01;
          const b = blocks.find(k => k.c === sideC && k.r === r);
          if (b && P.ground && dx) {
            b.push += dt;
            if (b.push > 0.25) {
              const nc = b.c + dx;
              if (!solid(nc, b.r) && grid[b.r][nc] !== 'H') { b.c = nc; api.haptic(8); api.beep(200, 0.05, 'triangle', 0.05); }
              b.push = 0;
            }
          }
          P.vx = 0; break;
        }
      }
      P.x = Math.max(PW + T, Math.min((COLS - 1) * T - PW, P.x));

      // verticale
      const prev = P.y;
      P.y += P.vy * dt; P.ground = false;
      const cA = Math.floor((P.x - PW + 1) / T), cB = Math.floor((P.x + PW - 1) / T);
      if (P.vy >= 0) {
        const row = Math.floor(P.y / T);
        for (let c = cA; c <= cB; c++) {
          if ((solid(c, row) || ladderTop(c, row)) && prev <= row * T + 0.5) { P.y = row * T; P.vy = 0; P.ground = true; break; }
        }
      } else {
        const row = Math.floor((P.y - PH) / T);
        for (let c = cA; c <= cB; c++) if (solid(c, row)) { P.y = (row + 1) * T + PH; P.vy = 0; api.haptic(4); break; }
      }

      // prendi la scala
      if (dyIn && P.ground !== undefined) {
        const c = Math.floor(P.x / T);
        const rowBody = Math.floor((P.y - 10) / T), rowFeet = Math.floor(P.y / T);
        const canUp = dyIn < 0 && grid[rowBody] && grid[rowBody][c] === 'H';
        const canDown = dyIn > 0 && grid[rowFeet] && grid[rowFeet][c] === 'H' && P.ground;
        if ((canUp || canDown) && Math.abs(P.x - (c * T + T / 2)) < 12) { P.ladder = true; P.x = c * T + T / 2; P.vy = 0; P.vx = 0; }
      }
    };

    const roomOfY = y => Math.max(0, Math.min(ROOMS - 1, Math.floor((y - 8 - T) / (4 * T))));

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      if (state === 'play') {
        inv = Math.max(0, inv - dt); warpCool = Math.max(0, warpCool - dt);
        left -= dt;
        if (left <= 0) { left = 0; hurt('TEMPO!'); return; }
        movePlayer(dt);
        if (P.y > ROWS * T + 40) { hurt(); return; }

        for (const k of keys) {
          if (k.got) continue;
          if (Math.hypot(k.c * T + T / 2 - P.x, standRow(k.room) * T + T - 14 - (P.y - 10)) < 20) {
            k.got = true; got++; score += 50; api.haptic(10); api.beep(900 + got * 60, 0.08, 'square', 0.05);
            if (got === need) flash('PORTA APERTA!');
          }
        }

        for (const gh of ghosts) {
          gh.t += dt; gh.x += gh.dir * 40 * dt;
          const gy = standRow(gh.room) * T + T;
          const hitWall = solid(Math.floor((gh.x + gh.dir * 14) / T), standRow(gh.room));
          if (hitWall || gh.x < 1.5 * T || gh.x > (COLS - 1.5) * T) gh.dir = -gh.dir;
          if (Math.abs(gh.x - P.x) < 15 && P.y > gy - 22 && P.y - PH < gy) hurt('FANTASMA!');
        }

        for (const ic of icicles) {
          const hx = ic.c * T + T / 2, hy = roomTop(ic.room) * T;
          if (ic.st === 'hang') {
            if (roomOfY(P.y) === ic.room && Math.abs(P.x - hx) < 22 && P.y > hy + 24) { ic.st = 'warn'; ic.t = 0.45; api.beep(1500, 0.04, 'triangle', 0.04); }
          } else if (ic.st === 'warn') {
            ic.t -= dt; if (ic.t <= 0) { ic.st = 'fall'; ic.y = hy + 20; ic.vy = 0; }
          } else if (ic.st === 'fall') {
            ic.vy += 1100 * dt; ic.y += ic.vy * dt;
            if (Math.abs(P.x - hx) < 9 && ic.y > P.y - PH - 6 && ic.y < P.y) hurt('GHIACCIOLO!');
            if (ic.y >= standRow(ic.room) * T + T) { ic.st = 'gone'; api.beep(700, 0.05, 'square', 0.03); }
          }
        }

        for (const b of blocks) {
          if (!solid(b.c, b.r + 1) && grid[b.r + 1][b.c] !== 'H') { b.fall += dt; if (b.fall > 0.12) { b.r++; b.fall = 0; } } else b.fall = 0;
        }

        if (warpCool <= 0 && P.ground) {
          for (const w of warps) {
            const wy = standRow(w.room) * T + T;
            if (Math.abs(P.x - (w.c * T + T / 2)) < 10 && Math.abs(P.y - wy) < 4) {
              P.x = w.pair.c * T + T / 2; P.y = standRow(w.pair.room) * T + T; P.vx = 0; warpCool = 1; api.haptic(20); api.beep(1200, 0.12, 'sine', 0.05);
              break;
            }
          }
        }

        const dy = standRow(door.room) * T + T;
        if (Math.abs(P.x - (door.c * T + T / 2)) < 12 && Math.abs(P.y - dy) < 4) {
          if (got >= need) {
            const bonus = Math.round(left) * 5;
            state = 'win'; stateT = 2; score += 300 + bonus; api.haptic(35);
            [660, 880, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.12), i * 110));
          } else if (msgT <= 0) flash('SERVONO ' + (need - got) + ' CHIAVI');
        }
      } else if (state === 'dead') {
        stateT -= dt; P.vy += GRAV * dt; P.y += P.vy * dt;
        if (stateT <= 0) { if (lives <= 0) endGame(); else { resetPlayer(); state = 'play'; } }
      } else if (state === 'win') {
        stateT -= dt;
        if (stateT <= 0) nextLevel();
      }
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame();
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
      } else if (k === 'select' && state !== 'title') newGame();
      else if ((k === 'a' || k === 'b') && state === 'play') jumpBuf = 0.12;
    };
    const onPointer = e => { if (e.type === 'down' && (state === 'title' || state === 'over')) newGame(); };

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

    const stone = (X, Y, top) => {
      R(X, Y, T, T, '#7d86b8');
      R(X, Y, T, 3, '#a9b2dc'); R(X, Y + T - 3, T, 3, '#4d5688');
      R(X, Y + 15, T, 2, '#4d5688'); R(X + 15, Y, 2, 16, '#4d5688'); R(X + 7, Y + 17, 2, 15, '#4d5688'); R(X + 23, Y + 17, 2, 15, '#4d5688');
    };
    const drawMouse = (x, y, face, walk, air, ladder) => {
      const f = face, step = Math.floor(walk) % 2 === 0;
      R(x - 9 * f - 1, y - 4, 7, 2, '#c98a52');
      R(x - 6, y - 10, 12, 8, '#9a7b5a'); R(x - 6, y - 12, 12, 3, '#2f9e5b');
      R(x - 5 + (f > 0 ? 3 : 0), y - 20, 8, 8, '#b08d66'); R(x + f * 3 - 1, y - 17, 2, 2, '#141a2e'); R(x + f * 6 - 1, y - 14, 3, 2, '#f2a0b8');
      g.fillStyle = '#b08d66'; g.beginPath(); g.arc(x - 3 * f, y - 21, 5, 0, 7); g.arc(x + 4 * f, y - 21, 5, 0, 7); g.fill();
      g.fillStyle = '#f2a0b8'; g.beginPath(); g.arc(x - 3 * f, y - 21, 2.5, 0, 7); g.arc(x + 4 * f, y - 21, 2.5, 0, 7); g.fill();
      if (ladder) { R(step ? x - 8 : x + 5, y - 14, 3, 5, '#b08d66'); R(step ? x + 5 : x - 8, y - 10, 3, 5, '#b08d66'); R(x - 4, y - 2, 3, 2, '#6b4a2b'); R(x + 1, y - 2, 3, 2, '#6b4a2b'); }
      else if (air) { R(x - 7, y - 3, 5, 3, '#6b4a2b'); R(x + 3, y - 4, 5, 3, '#6b4a2b'); }
      else { R(step ? x - 6 : x - 4, y - 3, 5, 3, '#6b4a2b'); R(step ? x + 2 : x + 1, y - 3, 5, 3, '#6b4a2b'); }
    };
    const drawKey = (k) => {
      const x = k.c * T + T / 2, y = standRow(k.room) * T + T - 16 + Math.sin(time * 4 + k.bob) * 2;
      g.fillStyle = '#f5d31c'; g.beginPath(); g.arc(x - 6, y, 6, 0, 7); g.fill();
      g.fillStyle = '#1a1633'; g.beginPath(); g.arc(x - 6, y, 2.5, 0, 7); g.fill();
      R(x - 1, y - 2, 12, 4, '#f5d31c'); R(x + 6, y + 2, 3, 5, '#f5d31c'); R(x + 1, y + 2, 3, 4, '#f5d31c');
    };
    const drawGhost = gh => {
      const x = gh.x, y = standRow(gh.room) * T + T - 2 + Math.sin(gh.t * 5) * 2;
      g.fillStyle = 'rgba(240,244,255,.95)'; g.beginPath(); g.arc(x, y - 18, 11, Math.PI, 0);
      g.lineTo(x + 11, y - 2); for (let i = 0; i < 4; i++) g.lineTo(x + 11 - (i + 0.5) * 5.5, y - (i % 2 ? 2 : 7)); g.lineTo(x - 11, y - 2); g.fill();
      R(x - 6 + gh.dir, y - 21, 4, 5, '#1a1633'); R(x + 2 + gh.dir, y - 21, 4, 5, '#1a1633');
      R(x - 3, y - 12, 6, 3, '#e5413b');
    };
    const drawIcicle = ic => {
      const x = ic.c * T + T / 2, y = ic.st === 'fall' ? ic.y - 20 : roomTop(ic.room) * T + (ic.st === 'warn' ? Math.sin(time * 60) * 1.5 : 0);
      if (ic.st === 'gone') return;
      g.fillStyle = '#bfeaff'; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.lineTo(x, y + 22); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x - 1, y); g.lineTo(x - 1, y + 14); g.fill();
    };
    const drawDoor = () => {
      const x = door.c * T, y = standRow(door.room) * T + T, open = got >= need;
      R(x - 2, y - 42, T + 4, 42, '#5a3f94');
      g.fillStyle = open ? '#4cc24a' : '#a655b8'; g.beginPath(); g.arc(x + T / 2, y - 26, 14, Math.PI, 0); g.fillRect(x + T / 2 - 14, y - 26, 28, 26); g.fill();
      g.fillStyle = '#141a2e'; g.beginPath(); g.arc(x + T / 2, y - 24, 9, Math.PI, 0); g.fillRect(x + T / 2 - 9, y - 24, 18, 24); g.fill();
      if (!open) { g.fillStyle = '#f5d31c'; g.beginPath(); g.arc(x + T / 2, y - 18, 3.5, 0, 7); g.fill(); R(x + T / 2 - 1, y - 16, 2, 7, '#f5d31c'); }
    };
    const drawWarp = w => {
      const x = w.c * T + T / 2, y = standRow(w.room) * T + T, p = 0.5 + Math.sin(time * 6) * 0.5;
      g.fillStyle = `rgba(255,80,220,${0.35 + p * 0.35})`; g.beginPath(); g.ellipse(x, y - 4, 14, 5, 0, 0, 7); g.fill();
      text('W', x, y - 22, 14, 'center', '#ff7ae6');
    };

    const render = () => {
      g.fillStyle = '#1a1633'; g.fillRect(0, 0, W, H);

      if (state === 'title') {
        g.fillStyle = '#7d86b8'; for (let i = 0; i < 11; i++) { stone(i * T, 0); stone(i * T, H - T); }
        text('MOUSE', W / 2, 90, 46, 'center', '#a655b8'); text('CASTLE', W / 2, 142, 46, 'center');
        g.save(); g.translate(W / 2, 300); g.scale(3, 3); drawMouse(0, 0, 1, time * 6, false, false); g.restore();
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 340, 16, 'center', '#f5d31c');
        text('RACCOGLI LE CHIAVI, ESCI DALLA PORTA', W / 2, 400, 11, 'center', '#aab3d8');
        text('RECORD ' + hi, W / 2, 440, 13, 'center');
        return;
      }

      // finestre decorative
      for (let i = 0; i < ROOMS; i++) for (const c of [3, 7]) {
        const x = c * T + 6, y = (roomTop(i) + 1) * T - 8;
        R(x, y + 8, 20, 22, '#2a2352'); g.fillStyle = '#2a2352'; g.beginPath(); g.arc(x + 10, y + 8, 10, Math.PI, 0); g.fill();
        R(x + 3, y + 11, 14, 17, '#f5d98a'); g.fillStyle = '#f5d98a'; g.beginPath(); g.arc(x + 10, y + 11, 7, Math.PI, 0); g.fill(); R(x + 9, y + 4, 2, 24, '#5d4a1a');
      }
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const t = grid[r][c], X = c * T, Y = r * T;
        if (t === '#') stone(X, Y);
        else if (t === 'H') {
          R(X + 7, Y, 4, T, '#c98a52'); R(X + 21, Y, 4, T, '#c98a52');
          for (let k = 4; k < T; k += 10) R(X + 7, Y + k, 18, 3, '#e8b878');
        }
      }
      warps.forEach(drawWarp);
      drawDoor();
      keys.forEach(k => { if (!k.got) drawKey(k); });
      icicles.forEach(drawIcicle);
      for (const b of blocks) {
        const X = b.c * T, Y = b.r * T;
        R(X + 1, Y + 1, T - 2, T - 2, '#8f8f9c'); R(X + 1, Y + 1, T - 2, 4, '#c0c0cc'); R(X + 1, Y + T - 5, T - 2, 4, '#5f5f6a');
        R(X + 8, Y + 10, 2, 10, '#5f5f6a'); R(X + 14, Y + 18, 8, 2, '#5f5f6a'); R(X + 22, Y + 8, 2, 8, '#5f5f6a');
      }
      ghosts.forEach(drawGhost);
      if (!(inv > 0 && state === 'play' && ((inv * 12) | 0) % 2 === 0)) drawMouse(P.x, P.y, P.face, P.walk, !P.ground && !P.ladder, P.ladder);

      // intestazione sulla riga del soffitto
      g.fillStyle = 'rgba(26,22,51,.78)'; g.fillRect(0, 0, W, T - 2);
      text('CHIAVI ' + got + '/' + need, 8, 8, 14, 'left', got >= need ? '#7bdc72' : '#eef1ff');
      text(String(Math.ceil(left)) + 's', 168, 8, 14, 'left', left < 20 ? '#ff6a5e' : '#eef1ff');
      text('L' + level, 222, 8, 14);
      for (let i = 0; i < lives; i++) { g.fillStyle = '#e5413b'; g.beginPath(); g.arc(W - 14 - i * 18, 16, 6, 0, 7); g.fill(); }
      if (msgT > 0) text(msg, W / 2, 44, 18, 'center', '#f5d31c');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
      if (state === 'win') banner(['BRAVO!', 'LIVELLO ' + (level + 1)]);
    };

    gen(1); resetPlayer();
    return {
      onPress: act,
      onRelease(k) { if ((k === 'a' || k === 'b') && P && P.vy < 0) P.cut = true; },
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update,
      render,
      debug: { newGame, gen, get state() { return state; }, get P() { return P; }, get keys() { return keys; }, get ghosts() { return ghosts; }, get icicles() { return icicles; }, get blocks() { return blocks; }, get grid() { return grid; }, get door() { return door; }, get need() { return need; }, get got() { return got; }, get warps() { return warps; } },
    };
  },
});

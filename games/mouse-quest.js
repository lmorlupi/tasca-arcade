registerGame({
  id: 'mouse-quest',
  title: 'MOUSE QUEST',
  color: '#f5d31c',
  blurb: 'Un topo avventuriero raccoglie il formaggio, salta sui gatti e arriva alla tana. Croce per muoverti, A salta (più a lungo, più in alto), B tenuto premuto per correre.',
  inputs: ['D-PAD', '2 POLLICI', 'SALTO'],
  size: [360, 432],
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const T = 24, VH = 18, GR = 15, PW = 7, PH = 20;
    const GRAV = 1300, JUMP = -520;

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, stateT = 0, msg = '', msgT = 0;
    let grid, cols, cheese, cats, door, need, got, P, camX = 0, jumpBuf = 0, coyote = 0, time = 0;

    const rng = seed => () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    // Livelli generati: buche larghe 2-3 tile, piattaforme a 3 tile d'altezza, tutto raggiungibile col salto.
    const gen = lv => {
      const rand = rng(lv * 104729 + 7);
      cols = Math.min(110, 64 + lv * 8);
      grid = Array.from({ length: VH }, () => new Uint8Array(cols));
      for (let x = 0; x < cols; x++) for (let y = GR; y < VH; y++) grid[y][x] = 1;
      const pits = [];
      let x = 9;
      while (x < cols - 14) {
        const w = 2 + ((rand() * 2) | 0);
        for (let xx = x; xx < x + w; xx++) for (let y = GR; y < VH; y++) grid[y][xx] = 0;
        pits.push([x, w]);
        x += w + 6 + ((rand() * 6) | 0);
      }
      cheese = []; cats = [];
      const add = (cx, cy) => cheese.push({ x: cx * T + T / 2, y: cy * T + T / 2, got: false });
      const segs = [];
      let a = -1;
      for (let c = 0; c <= cols; c++) {
        const solid = c < cols && grid[GR][c] === 1;
        if (solid && a < 0) a = c;
        if (!solid && a >= 0) { segs.push([a, c - 1]); a = -1; }
      }
      for (const [s, e] of segs) {
        const len = e - s + 1;
        if (len >= 7 && e < cols - 8) {
          const w = 3 + ((rand() * 3) | 0), px = s + 1 + ((rand() * (len - w - 1)) | 0);
          for (let c = px; c < px + w; c++) { grid[12][c] = 2; add(c, 11); }
          if (rand() < 0.5) {
            const w2 = 3, px2 = Math.max(s + 1, Math.min(e - w2, px + ((rand() * w) | 0)));
            for (let c = px2; c < px2 + w2; c++) { grid[9][c] = 2; add(c, 8); }
          }
        }
        for (let c = s + 2; c < e - 1; c += 3) if (rand() < 0.5 && c > 5) add(c, 14);
        if (len >= 8 && s > 6 && e < cols - 8 && rand() < 0.75) {
          const cx = ((s + e) / 2) * T + T / 2;
          cats.push({ x: cx, y: GR * T, dir: rand() < 0.5 ? -1 : 1, min: s * T + 14, max: (e + 1) * T - 14, dead: 0, t: rand() * 6 });
        }
      }
      for (const [px, w] of pits) { add(px + ((w - 1) >> 1), 12); if (w === 3) add(px + 2, 12); }
      door = { x: (cols - 4) * T, y: GR * T };
      need = Math.ceil(cheese.length * 0.6); got = 0;
    };

    const resetPlayer = () => {
      P = { x: 2 * T, y: GR * T, vx: 0, vy: 0, face: 1, ground: false, walk: 0, hurt: 0, cut: false };
      camX = 0; jumpBuf = 0; coyote = 0;
    };
    const newGame = () => { score = 0; lives = 3; level = 1; gen(level); resetPlayer(); state = 'play'; };
    const nextLevel = () => { level++; gen(level); resetPlayer(); state = 'play'; };
    const endGame = () => {
      state = 'over';
      if (score > hi) { hi = score; api.store.set('hi', hi); }
    };
    const flash = s => { msg = s; msgT = 1.4; };
    const hurt = () => {
      if (state !== 'play') return;
      state = 'dead'; stateT = 1.2; lives--; api.haptic(50); api.beep(150, 0.3, 'sawtooth', 0.06);
      P.vy = -380; P.vx = 0;
    };

    const tile = (c, r) => (c < 0 || c >= cols || r < 0 || r >= VH) ? 0 : grid[r][c];

    const move = dt => {
      const run = held.b ? 1.45 : 1;
      const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const target = dir * 105 * run;
      P.vx += (target - P.vx) * Math.min(1, dt * (P.ground ? 14 : 6));
      if (dir) { P.face = dir; P.walk += dt * (run > 1 ? 14 : 9); }
      jumpBuf = Math.max(0, jumpBuf - dt); coyote = Math.max(0, coyote - dt);
      if (P.ground) coyote = 0.1;
      if (jumpBuf > 0 && coyote > 0) { P.vy = JUMP; P.ground = false; jumpBuf = 0; coyote = 0; P.cut = false; api.haptic(6); api.beep(560, 0.07); }
      if (P.cut && P.vy < -180) { P.vy = -180; }
      P.cut = false;
      P.vy += GRAV * dt;

      P.x += P.vx * dt;
      const top = P.y - PH, bottom = P.y - 1;
      const r0 = Math.floor(top / T), r1 = Math.floor(bottom / T);
      for (let r = r0; r <= r1; r++) {
        const c = Math.floor((P.x + (P.vx > 0 ? PW : -PW)) / T);
        if (tile(c, r) === 1) { P.x = P.vx > 0 ? c * T - PW - 0.01 : (c + 1) * T + PW + 0.01; P.vx = 0; break; }
      }
      P.x = Math.max(PW, Math.min(cols * T - PW, P.x));

      const prev = P.y;
      P.y += P.vy * dt;
      P.ground = false;
      const cA = Math.floor((P.x - PW + 1) / T), cB = Math.floor((P.x + PW - 1) / T);
      if (P.vy >= 0) {
        const row = Math.floor(P.y / T);
        for (let c = cA; c <= cB; c++) {
          const t = tile(c, row);
          if ((t === 1 || t === 2) && prev <= row * T + 0.5) { P.y = row * T; P.vy = 0; P.ground = true; break; }
        }
      } else {
        const row = Math.floor((P.y - PH) / T);
        for (let c = cA; c <= cB; c++) if (tile(c, row) === 1) { P.y = (row + 1) * T + PH; P.vy = 0; api.haptic(4); break; }
      }
      if (P.y > VH * T + 40) hurt();
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      if (state === 'play') {
        move(dt);
        for (const c of cheese) {
          if (!c.got && Math.hypot(c.x - P.x, c.y - (P.y - 10)) < 15) {
            c.got = true; got++; score += 10; api.haptic(8); api.beep(900 + Math.min(500, got * 25), 0.05, 'square', 0.04);
          }
        }
        for (const k of cats) {
          if (k.dead) continue;
          k.t += dt; k.x += k.dir * 38 * dt;
          if (k.x < k.min) { k.x = k.min; k.dir = 1; }
          if (k.x > k.max) { k.x = k.max; k.dir = -1; }
          if (Math.abs(k.x - P.x) < 14 && P.y > k.y - 22 && P.y - PH < k.y) {
            if (P.vy > 60 && P.y - 8 < k.y - 10) {
              k.dead = 0.4; score += 100; P.vy = -340; api.haptic(15); api.beep(300, 0.1, 'square', 0.05);
            } else { hurt(); break; }
          }
        }
        if (Math.abs(P.x - (door.x + T / 2)) < 12 && P.ground) {
          if (got >= need) {
            state = 'win'; stateT = 2; score += 200 + lives * 50; api.haptic(35);
            [660, 880, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.12), i * 110));
          } else if (msgT <= 0) flash('SERVONO ' + (need - got) + ' FORMAGGI');
        }
      } else if (state === 'dead') {
        stateT -= dt; P.vy += GRAV * dt; P.y += P.vy * dt;
        if (stateT <= 0) { if (lives <= 0) endGame(); else { resetPlayer(); state = 'play'; } }
      } else if (state === 'win') {
        stateT -= dt;
        if (stateT <= 0) nextLevel();
      }
      for (const k of cats) if (k.dead > 0) k.dead -= dt;
      const want = Math.max(0, Math.min(cols * T - W, P.x - W / 2 + P.face * 28));
      camX += (want - camX) * Math.min(1, dt * 6);
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame();
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
      } else if (k === 'select' && state !== 'title') newGame();
      else if (k === 'a' && state === 'play') jumpBuf = 0.12;
    };
    const onPointer = e => { if (e.type === 'down' && (state === 'title' || state === 'over')) newGame(); };

    // Disegno
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#eef1ff';
      g.fillText(s, x, y);
    };
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = '#eef1ff'; g.fillRect(x, y, w, h);
      g.fillStyle = '#141a2e'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };

    const drawMouse = (x, y, face, walk, air, hurtPose) => {
      const f = face, step = Math.floor(walk) % 2 === 0;
      R(x - 9 * f - 1, y - 4, 7, 2, '#c98a52');                               // coda
      R(x - 6, y - 10, 12, 8, '#9a7b5a');                                     // corpo
      R(x - 6, y - 12, 12, 3, '#2f9e5b');                                     // sciarpa
      R(x - 5 + (f > 0 ? 3 : 0), y - 20, 8, 8, '#b08d66');                    // testa
      R(x + f * 3 - 1, y - 17, 2, 2, '#141a2e');                              // occhio
      R(x + f * 6 - 1, y - 14, 3, 2, '#f2a0b8');                              // naso
      g.fillStyle = '#b08d66'; g.beginPath(); g.arc(x - 3 * f, y - 21, 5, 0, 7); g.arc(x + 4 * f, y - 21, 5, 0, 7); g.fill();
      g.fillStyle = '#f2a0b8'; g.beginPath(); g.arc(x - 3 * f, y - 21, 2.5, 0, 7); g.arc(x + 4 * f, y - 21, 2.5, 0, 7); g.fill();
      if (air) { R(x - 7, y - 3, 5, 3, '#6b4a2b'); R(x + 3, y - 4, 5, 3, '#6b4a2b'); }
      else { R(step ? x - 6 : x - 4, y - 3, 5, 3, '#6b4a2b'); R(step ? x + 2 : x + 1, y - 3, 5, 3, '#6b4a2b'); }
    };
    const drawCat = k => {
      const f = k.dir, wag = Math.sin(k.t * 8) * 2;
      if (k.dead > 0) { R(k.x - 11, k.y - 5, 22, 5, '#d98b2b'); return; }
      R(k.x - 12 * f - 2, k.y - 14 + wag, 4, 10, '#d98b2b');
      R(k.x - 11, k.y - 14, 22, 12, '#d98b2b');
      R(k.x - 9, k.y - 4, 5, 4, '#a8631a'); R(k.x + 4, k.y - 4, 5, 4, '#a8631a');
      R(k.x + f * 3 - 6, k.y - 26, 12, 12, '#e69a3a');
      g.fillStyle = '#e69a3a'; g.beginPath(); g.moveTo(k.x + f * 3 - 6, k.y - 26); g.lineTo(k.x + f * 3 - 6, k.y - 32); g.lineTo(k.x + f * 3 - 1, k.y - 26); g.moveTo(k.x + f * 3 + 6, k.y - 26); g.lineTo(k.x + f * 3 + 6, k.y - 32); g.lineTo(k.x + f * 3 + 1, k.y - 26); g.fill();
      R(k.x + f * 3 - 4, k.y - 22, 3, 3, '#141a2e'); R(k.x + f * 3 + 1, k.y - 22, 3, 3, '#141a2e');
      R(k.x + f * 3 - 1, k.y - 18, 2, 2, '#f2a0b8');
    };
    const drawCheese = c => {
      const y = c.y + Math.sin(time * 4 + c.x * 0.05) * 2;
      g.fillStyle = '#f5d31c'; g.beginPath(); g.moveTo(c.x - 8, y + 6); g.lineTo(c.x + 8, y + 6); g.lineTo(c.x + 8, y - 4); g.lineTo(c.x - 8, y + 2); g.fill();
      g.fillStyle = '#c99a00'; g.fillRect(c.x - 3, y + 1, 3, 3); g.fillRect(c.x + 3, y - 2, 3, 3);
    };

    const render = () => {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#5db7ff'); sky.addColorStop(1, '#cdeeff');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);

      if (state === 'title') {
        g.fillStyle = '#4cc24a'; g.fillRect(0, 330, W, 102); g.fillStyle = '#7a4a22'; g.fillRect(0, 348, W, 84);
        text('MOUSE', W / 2, 70, 44, 'center', '#a8500c'); text('QUEST', W / 2, 118, 44, 'center', '#fff');
        g.save(); g.translate(W / 2, 330); g.scale(3, 3); drawMouse(0, 0, 1, time * 6, false); g.restore();
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 190, 16, 'center', '#a8500c');
        text('RECORD ' + hi, W / 2, 230, 13, 'center', '#1f2744');
        return;
      }

      // colline lontane
      g.fillStyle = '#8fd48a';
      for (let i = -1; i < 6; i++) { const hx = i * 140 - (camX * 0.25) % 140; g.beginPath(); g.arc(hx + 70, 372, 90, Math.PI, 0); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 4; i++) { const cx = ((i * 210 - camX * 0.1) % 840 + 840) % 840 - 100; g.beginPath(); g.arc(cx, 60 + i * 14, 14, 0, 7); g.arc(cx + 16, 56 + i * 14, 18, 0, 7); g.arc(cx + 34, 62 + i * 14, 13, 0, 7); g.fill(); }

      g.save(); g.translate(-Math.round(camX), 0);
      const c0 = Math.max(0, Math.floor(camX / T)), c1 = Math.min(cols - 1, c0 + 16);
      for (let r = 0; r < VH; r++) for (let c = c0; c <= c1; c++) {
        const t = grid[r][c]; if (!t) continue;
        const X = c * T, Y = r * T;
        if (t === 1) {
          const topEdge = tile(c, r - 1) === 0;
          g.fillStyle = '#7a4a22'; g.fillRect(X, Y, T, T);
          g.fillStyle = '#5e3716'; g.fillRect(X + 5, Y + 9, 3, 3); g.fillRect(X + 15, Y + 16, 3, 3);
          if (topEdge) { g.fillStyle = '#4cc24a'; g.fillRect(X, Y, T, 7); g.fillStyle = '#2f9e3b'; g.fillRect(X, Y + 5, T, 2); }
        } else {
          g.fillStyle = '#e07a2b'; g.fillRect(X, Y, T, 10);
          g.fillStyle = '#a8500c'; g.fillRect(X, Y + 8, T, 2); g.fillRect(X + 11, Y, 2, 8);
          g.fillStyle = '#f2a45e'; g.fillRect(X, Y, T, 2);
        }
      }
      // tana
      const open = got >= need;
      g.fillStyle = '#5e3716'; g.fillRect(door.x - 2, door.y - 44, T + 4, 44);
      g.fillStyle = open ? '#2f9e5b' : '#7a1d1a'; g.beginPath(); g.arc(door.x + T / 2, door.y - 22, 11, Math.PI, 0); g.fillRect(door.x + T / 2 - 11, door.y - 22, 22, 22); g.fill();
      g.fillStyle = '#141a2e'; g.beginPath(); g.arc(door.x + T / 2, door.y - 20, 7, Math.PI, 0); g.fillRect(door.x + T / 2 - 7, door.y - 20, 14, 20); g.fill();
      cheese.forEach(c => { if (!c.got && c.x > camX - 20 && c.x < camX + W + 20) drawCheese(c); });
      cats.forEach(k => { if (k.x > camX - 40 && k.x < camX + W + 40) drawCat(k); });
      if (!(state === 'dead' && ((stateT * 10) | 0) % 2 === 0 && false)) drawMouse(P.x, P.y, P.face, P.walk, !P.ground, state === 'dead');
      g.restore();

      g.fillStyle = 'rgba(11,16,32,.72)'; g.fillRect(0, 0, W, 26);
      text('FORMAGGI ' + got + '/' + need, 8, 6, 13, 'left', open ? '#7bdc72' : '#eef1ff');
      text(String(score).padStart(5, '0'), W / 2 + 40, 6, 13);
      for (let i = 0; i < lives; i++) { g.fillStyle = '#e5413b'; g.beginPath(); g.arc(W - 14 - i * 18, 13, 6, 0, 7); g.fill(); }
      if (msgT > 0) text(msg, W / 2, 40, 16, 'center', '#a8500c');
      if (state === 'win') banner(['BRAVO!', 'LIVELLO ' + (level + 1)]);
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    gen(1); resetPlayer();
    return {
      onPress: act,
      onRelease(k) { if (k === 'a' && P && P.vy < 0) P.cut = true; },
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update,
      render,
      debug: { newGame, get state() { return state; }, get P() { return P; }, get cats() { return cats; }, get cheese() { return cheese; }, get grid() { return grid; }, get need() { return need; }, get cols() { return cols; } },
    };
  },
});

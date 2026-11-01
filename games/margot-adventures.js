registerGame({
  id: 'margot-adventures',
  title: 'MARGOT ADVENTURES',
  color: '#d98b4a',
  art: 'margot',
  blurb: 'In ricordo di Margot, gatta affettuosa e curiosa che sapeva aprire tutte le porte. Salta tra i mobili, apri le porte saltando sulla maniglia, caccia i grilli, fai cadere le palline dell\'albero e arriva alla ciotola. A salta, B corre.',
  inputs: ['D-PAD', '2 POLLICI', 'SALTO'],
  size: [352, 576],
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const SC = 4 / 3, VW = W / SC;
    const T = 24, VH = 18, GR = 15, PW = 9, PH = 18;
    const GRAV = 1300, JUMP = -520;

    const CHAPTERS = [
      { name: 'SOGGIORNO', wall: ['#f6ead6', '#ead8ba'], skirt: '#fffaf0', floor: ['#b07c4d', '#946340'], deep: '#6d4a2f', accent: '#c97a4a' },
      { name: 'CUCINA', wall: ['#e3f0f6', '#cbe1ec'], skirt: '#f7fcfe', floor: ['#cdc6b9', '#b9b1a3'], deep: '#8f897d', accent: '#4a9ac9' },
      { name: 'CAMERA', wall: ['#eee3f4', '#dccbe8'], skirt: '#fbf7ff', floor: ['#a08060', '#866749'], deep: '#664c36', accent: '#9a6ac9' },
      { name: 'BALCONE', wall: ['#d4ecf9', '#b6ddf1'], skirt: '#f0f7fb', floor: ['#bdb6a8', '#a69e8f'], deep: '#827b6e', accent: '#5cae5c' },
      { name: 'NATALE', wall: ['#3a5a46', '#274236'], skirt: '#efe3c4', floor: ['#94603e', '#7a4d32'], deep: '#4d2f20', accent: '#e5413b' },
    ];
    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, stateT = 0, msg = '', msgT = 0;
    let doorHint = false, crickets = [], trees = [], doors = [], caught = 0, grid, cols, treats, cats, door, need, got, P, camX = 0, jumpBuf = 0, coyote = 0, time = 0;

    const rng = seed => () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };

    // Livelli generati: buche larghe 2-3 tile, piattaforme a 3 tile d'altezza, tutto raggiungibile col salto.
    const gen = lv => {
      flash(CHAPTERS[(lv - 1) % 5].name + ' · QUADRO ' + lv);
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
      treats = []; cats = [];
      const add = (cx, cy) => treats.push({ x: cx * T + T / 2, y: cy * T + T / 2, got: false });
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
      crickets = []; trees = []; doors = [];
      const xmas = (lv - 1) % 5 === 4;
      for (const [s0, e0] of segs) {
        const len0 = e0 - s0 + 1;
        if (len0 >= 6 && s0 > 4 && rand() < 0.75) crickets.push({ x: ((s0 + e0) / 2 + (rand() - 0.5) * 3) * T + T / 2, y: GR * T, vx: 0, vy: 0, hop: 0.4 + rand(), dir: rand() < 0.5 ? -1 : 1, min: s0 * T + 10, max: (e0 + 1) * T - 10, t: rand() * 6, gone: false });
        if (xmas && len0 >= 10 && s0 > 6 && e0 < cols - 8) trees.push(makeTree(((s0 + e0) / 2) * T + T / 2, rand));
        else if (len0 >= 10 && s0 > 7 && e0 < cols - 10 && rand() < 0.65) {
          // una porta chiusa: si apre saltando fino alla maniglia. Si sceglie una colonna senza mensole vicine.
          const span = Math.max(1, len0 - 5), start = (rand() * span) | 0;
          for (let k = 0; k < span; k++) {
            const dc = s0 + 3 + ((start + k) % span);
            let free = true; for (let c = dc - 1; c <= dc + 1; c++) for (let r = 11; r < GR; r++) if (grid[r][c]) free = false;
            if (free) { doors.push({ c: dc, open: false, t: 0 }); for (let r = GR - 3; r < GR; r++) grid[r][dc] = 3; break; }
          }
        }
      }
      treats = treats.filter(t => !doors.some(d => Math.floor(t.x / T) === d.c && t.y > (GR - 3) * T));
      door = { x: (cols - 4) * T, y: GR * T };
      need = Math.ceil(treats.length * 0.6); got = 0;
    };

    const BAUBLE_COLORS = ['#e5413b', '#f5d31c', '#25c4f0', '#a655b8', '#eef1ff', '#4cc24a', '#f58a25'];
    const makeTree = (x, rand) => {
      const balls = [];
      for (let i = 0; i < 9; i++) {
        const row = i % 3, w = 8 + (2 - row) * 8, oy = -16 - row * 20 - (rand() * 6);
        balls.push({ ox: (rand() * 2 - 1) * w, oy, c: BAUBLE_COLORS[(i * 3 + row) % BAUBLE_COLORS.length], st: 'hang', x: 0, y: 0, vx: 0, vy: 0, bounces: 0 });
      }
      return { x, balls };
    };

    const resetPlayer = () => {
      P = { x: 2 * T, y: GR * T, vx: 0, vy: 0, face: 1, ground: false, walk: 0, hurt: 0, cut: false };
      camX = 0; jumpBuf = 0; coyote = 0;
    };
    const newGame = (from = 1) => { score = 0; lives = 3; level = from; caught = 0; doorHint = false; gen(level); resetPlayer(); state = 'play'; };
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

    const SOL = t => t === 1 || t === 3;      // 3 = porta chiusa
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
        if (SOL(tile(c, r))) { P.x = P.vx > 0 ? c * T - PW - 0.01 : (c + 1) * T + PW + 0.01; P.vx = 0; break; }
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
          if ((t === 1 || t === 2 || t === 3) && prev <= row * T + 0.5) { P.y = row * T; P.vy = 0; P.ground = true; break; }
        }
      } else {
        const row = Math.floor((P.y - PH) / T);
        for (let c = cA; c <= cB; c++) if (SOL(tile(c, row))) { P.y = (row + 1) * T + PH; P.vy = 0; api.haptic(4); break; }
      }
      if (P.y > VH * T + 40) hurt();
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      if (state === 'play') {
        move(dt);
        for (const c of treats) {
          if (!c.got && Math.hypot(c.x - P.x, c.y - (P.y - 10)) < 15) {
            c.got = true; got++; score += 10; api.haptic(8); api.beep(900 + Math.min(500, got * 25), 0.05, 'square', 0.04);
          }
        }
        for (const c of crickets) {
          if (c.gone) continue;
          c.t += dt; c.vy += 700 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
          if (c.y >= GR * T) { c.y = GR * T; c.vy = 0; c.vx *= 0.6; c.hop -= dt; if (c.hop <= 0) { if (Math.random() < 0.3) c.dir = -c.dir; c.vy = -170; c.vx = c.dir * 62; c.hop = 0.6 + Math.random() * 1.2; } }
          if (c.x < c.min) { c.x = c.min; c.dir = 1; } if (c.x > c.max) { c.x = c.max; c.dir = -1; }
          if (Math.abs(c.x - P.x) < 15 && Math.abs((c.y - 4) - (P.y - 8)) < 17) {
            c.gone = true; caught++; score += 50; api.haptic(14); api.beep(1500, 0.05, 'triangle', 0.04); setTimeout(() => api.beep(1900, 0.05, 'triangle', 0.04), 70);
            flash('GRILLO CATTURATO!');
          }
        }
        for (const tr of trees) for (const b of tr.balls) {
          const bx = tr.x + b.ox, by = GR * T + b.oy;
          if (b.st === 'hang') {
            b.x = bx; b.y = by;
            if (Math.hypot(bx - P.x, by - (P.y - 8)) < 17) { b.st = 'fall'; b.vx = (bx < P.x ? -1 : 1) * (30 + Math.random() * 40); b.vy = -60; score += 30; api.haptic(10); api.beep(1200 + Math.random() * 500, 0.1, 'sine', 0.05); }
          } else {
            b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
            if (b.y >= GR * T - 4) { b.y = GR * T - 4; if (b.vy > 40) { b.vy = -b.vy * 0.45; b.bounces++; api.beep(900 + b.bounces * 150, 0.04, 'sine', 0.03); } else b.vy = 0; b.vx *= 0.97; }
          }
        }
        for (const d of doors) {
          if (d.open) { d.t += dt; continue; }
          const dx = Math.abs(P.x - (d.c * T + T / 2));
          if (dx < PW + T / 2 + 4 && !P.ground && GR * T - P.y > 20) {
            d.open = true; d.t = 0; for (let r = GR - 3; r < GR; r++) grid[r][d.c] = 0;
            score += 20; api.haptic(15); api.beep(520, 0.05, 'square', 0.05); setTimeout(() => api.beep(780, 0.1, 'triangle', 0.05), 70);
            flash('MARGOT APRE LA PORTA!');
          } else if (dx < 80 && msgT <= 0 && !doorHint) { doorHint = true; flash('SALTA E TOCCA LA MANIGLIA!'); }
        }
        for (const k of cats) {
          if (k.dead) continue;
          k.t += dt; k.x += k.dir * 38 * dt;
          if (k.x < k.min) { k.x = k.min; k.dir = 1; }
          if (k.x > k.max) { k.x = k.max; k.dir = -1; }
          if (Math.abs(k.x - P.x) < 19 && P.y > k.y - 14 && P.y - PH < k.y) {
            if (P.vy > 60 && P.y - 8 < k.y - 6) {
              k.dead = 0.4; score += 100; P.vy = -340; api.haptic(15); api.beep(300, 0.1, 'square', 0.05);
            } else { hurt(); break; }
          }
        }
        if (Math.abs(P.x - (door.x + T / 2)) < 12 && P.ground) {
          if (got >= need) {
            state = 'win'; stateT = 2; score += 200 + lives * 50; api.haptic(35);
            [660, 880, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.12), i * 110));
          } else if (msgT <= 0) flash('SERVONO ' + (need - got) + ' BOCCONCINI');
        }
      } else if (state === 'dead') {
        stateT -= dt; P.vy += GRAV * dt; P.y += P.vy * dt;
        if (stateT <= 0) { if (lives <= 0) endGame(); else { resetPlayer(); state = 'play'; } }
      } else if (state === 'win') {
        stateT -= dt;
        if (stateT <= 0) nextLevel();
      }
      for (const k of cats) if (k.dead > 0) k.dead -= dt;
      const want = Math.max(0, Math.min(cols * T - VW, P.x - VW / 2 + P.face * 28));
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
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = '#eef1ff'; g.fillRect(x, y, w, h);
      g.fillStyle = '#2a2236'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };
    const chap = () => CHAPTERS[(level - 1) % 5];

    // Robot aspirapolvere (il nemico di Margot) e pallina di lana
    const drawVacuum = k => {
      const x = k.x, y = k.y;
      if (k.dead > 0) { g.fillStyle = '#4a5068'; g.beginPath(); g.ellipse(x, y - 2, 15, 3, 0, 0, 7); g.fill(); return; }
      g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(x, y, 16, 3, 0, 0, 7); g.fill();
      const body = g.createLinearGradient(0, y - 15, 0, y - 2); body.addColorStop(0, '#7b84a8'); body.addColorStop(1, '#3a4060');
      g.fillStyle = body; g.beginPath(); g.moveTo(x - 16, y - 3); g.quadraticCurveTo(x - 16, y - 15, x, y - 15); g.quadraticCurveTo(x + 16, y - 15, x + 16, y - 3); g.closePath(); g.fill();
      g.fillStyle = '#c3c9e0'; g.fillRect(x - 15, y - 4, 30, 2);
      const on = ((k.t * 4) | 0) % 2;
      g.fillStyle = on ? '#ff5a4a' : '#7a2a24'; g.beginPath(); g.arc(x + (k.dir > 0 ? 8 : -8), y - 10, 2.2, 0, 7); g.fill();
      g.strokeStyle = '#d9deee'; g.lineWidth = 1; g.beginPath(); g.arc(x - 2, y - 9, 4, 0, 7); g.stroke();
      g.fillStyle = '#20243a'; g.beginPath(); g.arc(x - 9, y - 1, 2.6, 0, 7); g.arc(x + 9, y - 1, 2.6, 0, 7); g.fill();
      g.strokeStyle = '#dfe3f2'; g.lineWidth = 1.2; g.beginPath(); const bx = x + k.dir * 17, sw = Math.sin(k.t * 20) * 3; g.moveTo(bx, y - 2); g.lineTo(bx + k.dir * 4, y - 2 + sw * 0.4); g.moveTo(bx, y - 1); g.lineTo(bx + k.dir * 5, y + sw * 0.3); g.stroke();
    };
    const drawTreat = c => {
      const y = c.y + Math.sin(time * 4 + c.x * 0.05) * 2, x = c.x;
      g.save(); g.translate(x, y); g.rotate(Math.sin(time * 3 + x) * 0.15);
      const fg = g.createLinearGradient(0, -6, 0, 6); fg.addColorStop(0, '#ffd88a'); fg.addColorStop(1, '#e49a3c');
      g.fillStyle = fg; g.beginPath(); g.ellipse(-1, 0, 8, 5, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(6, 0); g.lineTo(12, -5); g.lineTo(12, 5); g.closePath(); g.fill();
      g.fillStyle = '#7a4a1a'; g.beginPath(); g.arc(-5, -1, 1.2, 0, 7); g.fill();
      g.strokeStyle = 'rgba(122,74,26,.55)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, -4); g.lineTo(1, 4); g.moveTo(3, -3); g.lineTo(4, 3); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-3, -3, 3, 1.2, -0.3, 0, 7); g.fill();
      g.restore();
    };
    const drawBowl = (open) => {
      const x = door.x + T / 2, y = door.y;
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y, 17, 3.5, 0, 0, 7); g.fill();
      const bg = g.createLinearGradient(0, y - 14, 0, y); bg.addColorStop(0, '#e9eef7'); bg.addColorStop(1, '#a9b6cf');
      g.fillStyle = bg; g.beginPath(); g.moveTo(x - 16, y - 12); g.quadraticCurveTo(x - 14, y, x - 7, y); g.lineTo(x + 7, y); g.quadraticCurveTo(x + 14, y, x + 16, y - 12); g.closePath(); g.fill();
      g.fillStyle = '#d96a5a'; g.fillRect(x - 15, y - 8, 30, 3);
      g.fillStyle = '#f6f9ff'; g.beginPath(); g.ellipse(x, y - 12, 16, 4, 0, 0, 7); g.fill();
      g.fillStyle = open ? '#b8763a' : '#cfd6e6'; g.beginPath(); g.ellipse(x, y - 11.5, 13, 2.8, 0, 0, 7); g.fill();
      if (open) { g.fillStyle = '#d39a5c'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x - 10 + i * 2.5, y - 13 - (i % 3), 2, 0, 7); g.fill(); } }
      const p = 0.5 + Math.sin(time * 5) * 0.5;
      if (open) { g.fillStyle = `rgba(255,236,160,${0.15 + p * 0.2})`; g.beginPath(); g.arc(x, y - 14, 26, 0, 7); g.fill(); }
    };
    const drawWindow = (x, y, ch) => {
      g.fillStyle = '#fffaf0'; g.fillRect(x - 3, y - 3, 56, 90);
      const sk = g.createLinearGradient(0, y, 0, y + 84); sk.addColorStop(0, ch.name === 'BALCONE' ? '#8fd0f5' : '#b9e0f7'); sk.addColorStop(1, '#eaf6ff');
      g.fillStyle = sk; g.fillRect(x, y, 50, 84);
      g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(x + 14, y + 22, 8, 0, 7); g.arc(x + 24, y + 20, 10, 0, 7); g.arc(x + 34, y + 23, 7, 0, 7); g.fill();
      g.fillStyle = '#fffaf0'; g.fillRect(x + 23, y, 4, 84); g.fillRect(x, y + 40, 50, 4);
      g.fillStyle = ch.accent; g.globalAlpha = 0.55; g.fillRect(x - 8, y - 6, 12, 96); g.fillRect(x + 46, y - 6, 12, 96); g.globalAlpha = 1;
    };
    const drawFrame = (x, y, ch) => {
      g.fillStyle = '#6a4a30'; g.fillRect(x, y, 34, 26); g.fillStyle = '#f5e9d2'; g.fillRect(x + 3, y + 3, 28, 20);
      g.fillStyle = ch.accent; g.beginPath(); g.moveTo(x + 6, y + 21); g.lineTo(x + 14, y + 10); g.lineTo(x + 20, y + 17); g.lineTo(x + 25, y + 12); g.lineTo(x + 29, y + 21); g.closePath(); g.fill();
    };
    const drawPlant = (x, y, ch) => {
      g.fillStyle = '#b5683f'; g.beginPath(); g.moveTo(x - 9, y - 16); g.lineTo(x + 9, y - 16); g.lineTo(x + 6, y); g.lineTo(x - 6, y); g.closePath(); g.fill();
      g.fillStyle = '#3f9a52'; for (let i = -2; i <= 2; i++) { g.beginPath(); g.ellipse(x + i * 5, y - 26 - Math.abs(i) * -3, 4, 13, i * 0.25, 0, 7); g.fill(); }
    };

    const drawTree = tr => {
      const x = tr.x, y = GR * T;
      g.fillStyle = '#6d4a2f'; g.fillRect(x - 4, y - 14, 8, 14);
      [[34, 20], [27, 40], [19, 62]].forEach(([w, base], i) => {
        const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, '#1f7a43'); gr.addColorStop(0.55, '#2f9d58'); gr.addColorStop(1, '#17623a');
        g.fillStyle = gr; g.beginPath(); g.moveTo(x - w, y - base + 16); g.lineTo(x, y - base - 34 - i * 2); g.lineTo(x + w, y - base + 16); g.quadraticCurveTo(x, y - base + 22, x - w, y - base + 16); g.fill();
      });
      g.strokeStyle = '#f5d31c'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x - 24, y - 24); g.quadraticCurveTo(x - 4, y - 14, x + 20, y - 34); g.quadraticCurveTo(x + 6, y - 44, x - 16, y - 54); g.quadraticCurveTo(x, y - 60, x + 12, y - 72); g.stroke();
      g.fillStyle = '#f5d31c'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 - 1.57, r = i % 2 ? 4 : 9; g.lineTo(x + Math.cos(a) * r, y - 100 + Math.sin(a) * r); } g.closePath(); g.fill();
      for (const b of tr.balls) {
        const bx = b.st === 'hang' ? x + b.ox : b.x, by = b.st === 'hang' ? y + b.oy : b.y;
        if (b.st !== 'hang') { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(bx, y - 1, 5, 1.6, 0, 0, 7); g.fill(); }
        g.fillStyle = b.c; g.beginPath(); g.arc(bx, by, 5, 0, 7); g.fill();
        const bg = g.createRadialGradient(bx - 1.5, by - 1.5, 0.5, bx, by, 5.2); bg.addColorStop(0, 'rgba(255,255,255,.95)'); bg.addColorStop(0.4, 'rgba(255,255,255,0)'); bg.addColorStop(1, 'rgba(0,0,0,.45)');
        g.fillStyle = bg; g.beginPath(); g.arc(bx, by, 5, 0, 7); g.fill();
        if (b.st === 'hang') { g.fillStyle = '#f5d31c'; g.fillRect(bx - 1.2, by - 7, 2.4, 3); }
      }
    };
    const drawCricket = c => {
      const x = c.x, y = c.y, f = c.dir, air = Math.abs(c.vy) > 10;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, GR * T, 6, 1.4, 0, 0, 7); g.fill();
      g.fillStyle = '#3f6b2a'; g.beginPath(); g.ellipse(x, y - 5, 6.5, 3.4, f * -0.15, 0, 7); g.fill();
      g.fillStyle = '#5c9a3a'; g.beginPath(); g.ellipse(x + f * 6, y - 6, 3.2, 3, 0, 0, 7); g.fill();
      g.fillStyle = '#c9e87a'; g.beginPath(); g.arc(x + f * 7.4, y - 7, 0.9, 0, 7); g.fill();
      g.strokeStyle = '#2f4f1f'; g.lineWidth = 1; g.beginPath();
      g.moveTo(x - f * 2, y - 6); g.lineTo(x - f * (air ? 9 : 7), y - (air ? 2 : 9)); g.lineTo(x - f * (air ? 12 : 8), y - (air ? 0 : 1));
      g.moveTo(x + f * 8, y - 8); g.quadraticCurveTo(x + f * 12, y - 14, x + f * 16, y - 12); g.moveTo(x + f * 8, y - 8); g.quadraticCurveTo(x + f * 11, y - 12, x + f * 13, y - 16);
      g.moveTo(x, y - 3); g.lineTo(x + f * 2, y); g.moveTo(x - 2, y - 3); g.lineTo(x - 3, y); g.stroke();
    };
    const drawDoorObj = d => {
      const x = d.c * T, y = GR * T, h = 3 * T;
      if (!d.open) {
        const near = Math.abs(P.x - (x + T / 2)) < 60;
        g.fillStyle = '#5a3a22'; g.fillRect(x - 2, y - h - 2, T + 4, h + 2);
        const dg = g.createLinearGradient(x, 0, x + T, 0); dg.addColorStop(0, '#c58b55'); dg.addColorStop(0.5, '#d6a06a'); dg.addColorStop(1, '#b57a47');
        g.fillStyle = dg; g.fillRect(x, y - h, T, h);
        g.strokeStyle = 'rgba(90,58,34,.7)'; g.lineWidth = 1.2; g.strokeRect(x + 4, y - h + 6, T - 8, 24); g.strokeRect(x + 4, y - h + 36, T - 8, 26);
        const pulse = near ? 0.5 + Math.sin(time * 8) * 0.5 : 0;
        if (near) { g.fillStyle = `rgba(255,236,160,${0.25 + pulse * 0.3})`; g.beginPath(); g.arc(x + T - 5, y - 34, 11, 0, 7); g.fill(); }
        g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(x + T - 5, y - 34, 3.4, 0, 7); g.fill(); g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(x + T - 6, y - 35, 1.2, 0, 7); g.fill();
      } else {
        g.fillStyle = 'rgba(30,22,36,.55)'; g.fillRect(x, y - h, T, h);
        const k = Math.min(1, d.t * 4), wdt = T * (1 - k) * 0.9 + 4;
        g.fillStyle = '#b57a47'; g.fillRect(x, y - h, wdt, h); g.fillStyle = '#d6a06a'; g.fillRect(x, y - h, 2, h);
        g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(x + wdt - 2, y - 34, 2.4, 0, 7); g.fill();
      }
    };

    const drawBackdrop = () => {
      const ch = chap();
      const wg = g.createLinearGradient(0, 0, 0, GR * T); wg.addColorStop(0, ch.wall[0]); wg.addColorStop(1, ch.wall[1]);
      g.fillStyle = wg; g.fillRect(0, 0, VW + 2, VH * T);
      // carta da parati a righe leggere che scorre piano
      g.fillStyle = 'rgba(255,255,255,.28)';
      const off = (camX * 0.9) % 28; for (let x = -28; x < VW + 28; x += 28) g.fillRect(x - off, 0, 12, GR * T);
      // arredo lontano (parallasse)
      const par = camX * 0.55;
      for (let i = 0; i < 9; i++) {
        const base = i * 150 - par + 20, x = ((base % 1350) + 1350) % 1350 - 120;
        if (x < -80 || x > VW + 60) continue;
        if (i % 3 === 0) drawWindow(x, 52, ch); else if (i % 3 === 1) drawFrame(x + 30, 80, ch); else drawPlant(x + 30, GR * T, ch);
      }
      if (ch.name === 'NATALE') {
        g.strokeStyle = '#1b2f26'; g.lineWidth = 1.4; g.beginPath();
        for (let x = -10; x < VW + 20; x += 6) { const yy = 24 + Math.sin((x + camX * 0.4) * 0.06) * 8; x === -10 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke();
        for (let x = -10; x < VW + 20; x += 22) {
          const px = x - ((camX * 0.4) % 22), yy = 24 + Math.sin((px + camX * 0.4) * 0.06) * 8, on = (((time * 2) | 0) + ((px / 22) | 0)) % 2;
          g.fillStyle = on ? '#ffd966' : '#e5413b'; g.beginPath(); g.arc(px, yy + 4, 3.2, 0, 7); g.fill();
        }
      }
      // battiscopa
      g.fillStyle = ch.skirt; g.fillRect(0, GR * T - 9, VW + 2, 9);
      g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, GR * T - 9, VW + 2, 2);
    };

    const render = () => {
      const ch = chap();
      if (state === 'title') {
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f6ead6'); bg.addColorStop(1, '#e3c79a');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < W; x += 30) g.fillRect(x, 0, 12, H);
        g.fillStyle = '#9b6a40'; g.fillRect(0, H - 120, W, 120); g.fillStyle = '#b07c4d'; g.fillRect(0, H - 120, W, 8);
        Art.drawPortrait(g, W / 2 - 110, 120, 220, 'calm');
        text('MARGOT', W / 2, 36, 46, 'center', '#8a4a22'); text('ADVENTURES', W / 2, 84, 30, 'center', '#c97a4a');
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 372, 16, 'center', '#8a4a22');
        text('RACCOGLI I BOCCONCINI · ARRIVA ALLA CIOTOLA', W / 2, 410, 11, 'center', '#6d4a2f');
        text('RECORD ' + hi, W / 2, 438, 14, 'center', '#6d4a2f');
        text('IN RICORDO DI MARGOT', W / 2, 470, 15, 'center', '#fff4e0');
        text('AFFETTUOSA · CURIOSA · CORAGGIOSA', W / 2, 494, 11, 'center', '#f3dcc0');
        text('CHE SAPEVA APRIRE TUTTE LE PORTE', W / 2, 512, 11, 'center', '#f3dcc0');
        return;
      }
      g.fillStyle = ch.wall[0]; g.fillRect(0, 0, W, H);
      g.save(); g.scale(SC, SC);
      drawBackdrop();
      g.save(); g.translate(-Math.round(camX), 0);
      const c0 = Math.max(0, Math.floor(camX / T)), c1 = Math.min(cols - 1, c0 + 14);
      // vuoti nel pavimento: ombra scura
      for (let c = c0; c <= c1; c++) if (!grid[GR][c]) { const gx = c * T; const vg = g.createLinearGradient(0, GR * T, 0, VH * T); vg.addColorStop(0, '#1a1426'); vg.addColorStop(1, '#0c0814'); g.fillStyle = vg; g.fillRect(gx, GR * T - 9, T, VH * T - GR * T + 9); }
      for (let r = 0; r < VH; r++) for (let c = c0; c <= c1; c++) {
        const t = grid[r][c]; if (!t) continue;
        const X = c * T, Y = r * T;
        if (t === 1) {
          const topEdge = tile(c, r - 1) === 0;
          g.fillStyle = r === GR ? ch.floor[(c + 1) % 2] : ch.deep; g.fillRect(X, Y, T, T);
          if (r === GR) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(X, Y, T, 3); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(X + T - 1, Y, 1, T); g.fillRect(X, Y + 11, T, 1); }
          else { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(X, Y, T, T); }
        } else {
          // mensola con le staffe
          const sg = g.createLinearGradient(0, Y, 0, Y + 10); sg.addColorStop(0, '#d9a56f'); sg.addColorStop(1, '#9a6a3f');
          g.fillStyle = sg; g.fillRect(X, Y, T, 10); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(X, Y, T, 2);
          g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(X, Y + 9, T, 2);
          if (c % 3 === 1) { g.fillStyle = '#7d5230'; g.beginPath(); g.moveTo(X + 6, Y + 10); g.lineTo(X + 16, Y + 10); g.lineTo(X + 6, Y + 20); g.closePath(); g.fill(); }
        }
      }
      const open = got >= need;
      drawBowl(open);
      doors.forEach(drawDoorObj);
      trees.forEach(drawTree);
      treats.forEach(c => { if (!c.got && c.x > camX - 20 && c.x < camX + VW + 20) drawTreat(c); });
      crickets.forEach(c => { if (!c.gone && c.x > camX - 20 && c.x < camX + VW + 20) drawCricket(c); });
      cats.forEach(k => { if (k.x > camX - 40 && k.x < camX + VW + 40) drawVacuum(k); });
      const pose = state === 'dead' ? 'fall' : !P.ground ? (P.vy < 0 ? 'jump' : 'fall') : Math.abs(P.vx) > 14 ? 'walk' : 'idle';
      g.fillStyle = 'rgba(0,0,0,.18)'; if (P.ground) { g.beginPath(); g.ellipse(P.x, P.y, 17, 3, 0, 0, 7); g.fill(); }
      Art.drawMargot(g, P.x, P.y, 31, pose, pose === 'walk' ? P.walk : time, P.face);
      g.restore();
      g.restore();

      g.fillStyle = 'rgba(42,34,54,.78)'; g.fillRect(0, 0, W, 26);
      text('BOCCONCINI ' + got + '/' + need, 8, 6, 13, 'left', open ? '#9be88b' : '#fff4e0');
      text(String(score).padStart(5, '0'), W / 2 + 40, 6, 13, 'left', '#fff4e0');
      for (let i = 0; i < lives; i++) { g.fillStyle = '#e8745e'; g.beginPath(); g.arc(W - 14 - i * 18, 13, 6, 0, 7); g.fill(); }
      if (caught > 0) text('GRILLI ' + caught, 8, 30, 11, 'left', '#2a2236');
      if (msgT > 0) { g.fillStyle = 'rgba(42,34,54,.7)'; g.fillRect(W / 2 - 120, 36, 240, 26); text(msg, W / 2, 41, 14, 'center', '#ffe9b8'); }
      if (state === 'win') banner(['BRAVO MARGOT!', 'QUADRO ' + (level + 1)]);
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
      debug: { newGame, get state() { return state; }, get P() { return P; }, get cats() { return cats; }, get treats() { return treats; }, get doors() { return doors; }, get trees() { return trees; }, get crickets() { return crickets; }, get score() { return score; }, get grid() { return grid; }, get need() { return need; }, get cols() { return cols; } },
    };
  },
});

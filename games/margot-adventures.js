registerGame({
  id: 'margot-adventures',
  title: 'MARGOT ADVENTURES',
  color: '#d98b4a',
  art: 'margot',
  blurb: 'In ricordo di Margot, gatta affettuosa e curiosa che sapeva aprire tutte le porte. Salta tra i mobili, apri le porte saltando sulla maniglia, caccia i grilli, fai cadere le palline dell\'albero e arriva alla ciotola. A salta, B corre.',
  inputs: ['D-PAD', '2 POLLICI', 'SALTO'],
  size: [480, 540],
  flexH: true,
  flexMin: 0.8,
  create(api) {
    const { cv, g, held } = api;
    const CW = cv.width, CH = cv.height;
    let W = CW, H = CH;
    const SC = 1.9, VW = CW / SC, VISH = CH / SC;
    const UIS = Math.min(CW / 352, CH / 576), UIX = (CW - 352 * UIS) / 2, UIY = (CH - 576 * UIS) / 2;
    const uiOn = () => { g.fillStyle = '#14101a'; g.fillRect(0, 0, CW, CH); g.save(); g.translate(UIX, UIY); g.scale(UIS, UIS); g.beginPath(); g.rect(0, 0, 352, 576); g.clip(); W = 352; H = 576; };
    const uiOff = () => { g.restore(); W = CW; H = CH; };
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
    let coccole = 0, strokes = 0, petFx = [], lastPet = -9, purrT = 0, purrN = 0;
    let memories = [], hugs = [], blankets = [], seen = {}, photoShow = 0, albumIdx = 0, restT = 0, doorHint = false, crickets = [], trees = [], doors = [], caught = 0, grid, cols, treats, cats, door, need, got, P, chaser = { x: -90, on: false, t: 0, beep: 0 }, camX = 0, camY = 0, jumpBuf = 0, coyote = 0, time = 0;

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
      memories = []; hugs = []; blankets = []; seen = {};
      const big = segs.filter(([s0, e0]) => e0 - s0 + 1 >= 6 && s0 > 6 && e0 < cols - 8);
      const pickSeg = f => (big.length ? big[Math.min(big.length - 1, Math.floor(f * big.length))] : null);
      const sm = pickSeg(0.72), sh = pickSeg(0.42), sb = pickSeg(0.22);
      if (sm) memories.push({ x: ((sm[0] + sm[1]) / 2 + 3) * T + T / 2, y: GR * T - 18, got: false });
      if (sh) hugs.push({ x: ((sh[0] + sh[1]) / 2 + 1) * T + T / 2, used: false });
      if (sb) blankets.push({ x: ((sb[0] + sb[1]) / 2 - 2) * T + T / 2, w: 50 });
      treats = treats.filter(t => !doors.some(d => Math.floor(t.x / T) === d.c && t.y > (GR - 3) * T));
      door = { x: (cols - 4) * T, y: GR * T };
      treats.forEach((t, i) => { if (i % 7 === 3) t.kind = 'stick'; });
      if (treats.length > 4) treats[Math.floor(treats.length * 0.55)].kind = 'tuna';
      need = Math.ceil(treats.length * 0.6); got = 0;
    };

    // Le foto di Margot si sbloccano trovando le cornici nei livelli; si rivedono dalla schermata iniziale.
    const PHOTOS = [
      { n: 'face', t: ['Margot.', 'Occhi verdi, carattere deciso.'] },
      { n: 'q3', t: ['Sempre attenta,', 'curiosa di tutto.'] },
      { n: 'sleep', t: ['Affettuosa,', 'anche quando dormiva.'] },
      { n: 'bed', t: ['Pancia all\'aria,', 'regina del letto.'] },
      { n: 'sun', t: ['Una dormitina al sole,', 'senza pensieri.'] },
      { n: 'blanket', t: ['Sotto la coperta,', 'a ronfare in pace.'] },
    ];
    const unlocked = () => api.store.get('album', []);
    const nextPhoto = () => {
      if (state === 'photo') { state = 'play'; return; }
      albumIdx++; if (albumIdx >= unlocked().length) state = 'title';
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
      camX = 0; camY = 0; jumpBuf = 0; coyote = 0;
      chaser = { x: -90, on: false, t: 0, beep: 0 };
    };
    const pet = () => {
      if (state !== 'rest') return;
      strokes++; lastPet = time; restT = Math.min(restT + 0.45, 4.5); const pts = 5 * coccole; score += pts; api.haptic(6); api.beep(300 + Math.min(300, strokes * 20), 0.07, 'sine', 0.04);
      petFx.push({ x: P.x + (Math.random() * 16 - 8), y: P.y - 30, t: 0 });
      if (strokes % 5 === 0) { flash('CHE GRATTINI! FA LE FUSA  +' + pts * 5); score += pts * 5; api.haptic(15); }
    };
    const newGame = (from = 1) => { coccole = 0; strokes = 0; score = 0; lives = 3; level = from; caught = 0; doorHint = false; gen(level); resetPlayer(); state = 'play'; };
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

    const mg = (x, y, h, pose, step, dir, kit) => { if (window.Art3D && Art3D.ok && Art3D.draw(g, x, y, h * 1.12, pose, step, dir, kit)) return; Art.drawMargot(g, x, y, h, pose, step, dir); };

    // TROVA MARGOT: tre nascondigli di casa, tre round
    const SPOTS = [
      { n: 'IL LETTO', sub: 'sotto le coperte', y: 70, h: 150 },
      { n: 'IL DIVANO', sub: 'tra i cuscini', y: 236, h: 150 },
      { n: 'LA SEDIA', sub: 'sotto il tavolo', y: 402, h: 150 },
    ];
    let sk = null;
    const seekStart = () => { sk = { round: 0, pts: 0, sel: 0, spot: 0, tries: 0, t: 0, phase: 'look', shut: [], best: api.store.get('seekBest', 0) }; seekRound(); state = 'seek'; };
    const seekRound = () => { sk.spot = (Math.random() * 3) | 0; sk.tries = 0; sk.t = 0; sk.phase = 'look'; sk.shut = []; sk.tail = 0; };
    const seekPick = i => {
      if (sk.phase !== 'look' || sk.shut.includes(i)) return;
      sk.sel = i;
      if (i === sk.spot) {
        const p = Math.max(50, Math.round(300 - sk.t * 12 - sk.tries * 80)); sk.pts += p; sk.got = p; sk.phase = 'found'; sk.t = 0; api.haptic(30); api.beep(660, 0.12, 'triangle', 0.05);
      } else {
        sk.tries++; sk.shut.push(i); api.haptic(8); api.beep(180, 0.1, 'square', 0.04);
        if (sk.shut.length >= 2) { sk.spot = [0, 1, 2].find(k => !sk.shut.includes(k)); sk.got = 0; sk.phase = 'found'; sk.t = 0; }
      }
    };
    const seekNext = () => {
      if (sk.phase === 'found') { sk.round++; if (sk.round >= 3) { sk.phase = 'end'; if (sk.pts > sk.best) { sk.best = sk.pts; api.store.set('seekBest', sk.best); } } else seekRound(); }
      else if (sk.phase === 'end') state = 'title';
    };
    const seekKey = k => {
      if (k === 'up') sk.sel = (sk.sel + 2) % 3; else if (k === 'down') sk.sel = (sk.sel + 1) % 3;
      else if (k === 'a') { if (sk.phase === 'look') seekPick(sk.sel); else if (sk.t > 0.5) seekNext(); }
      else if (k === 'b') state = 'title';
    };
    const drawSeek = () => {
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f1e3cc'); bg.addColorStop(1, '#d9b98a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      text('TROVA MARGOT', W / 2, 8, 20, 'center', '#8a4a22');
      if (sk.phase !== 'end') text('ROUND ' + (sk.round + 1) + '/3 · PUNTI ' + sk.pts, W / 2, 38, 12, 'center', '#6d4a2f');
      SPOTS.forEach((sp, i) => {
        const y = sp.y, x = 16, w = W - 32, h = sp.h, shut = sk.shut.includes(i), here = sk.spot === i, reveal = (sk.phase === 'found' || sk.phase === 'end') && here;
        g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
        g.fillStyle = i === 0 ? '#e9dcc4' : i === 1 ? '#ead9c0' : '#e3cda8'; g.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(120,80,40,.18)'; g.fillRect(x, y + h - 26, w, 26);
        // Margot dietro l'arredo
        const my = y + h - 34;
        if (reveal) mg(x + w / 2 + (i === 2 ? 0 : 20), my + 14, 76, 'idle', time, -1, sk.round === 0 ? 0.62 : 0);
        else if (here && sk.t > 7 && sk.phase === 'look') { g.fillStyle = '#7a5836'; g.beginPath(); g.moveTo(x + w / 2 + 30, my - 6); g.lineTo(x + w / 2 + 40, my - 26 - Math.sin(time * 3) * 3); g.lineTo(x + w / 2 + 50, my - 6); g.closePath(); g.fill(); }
        // arredo
        const open = shut || reveal;
        if (i === 0) {
          g.fillStyle = '#8a5a34'; g.fillRect(x + 6, y + 20, w - 12, 14); g.fillStyle = '#fbf6ec'; g.fillRect(x + 12, y + 30, 96, 36);
          g.fillStyle = '#7fa3c7'; g.beginPath(); g.moveTo(x + 8, y + h - 30); g.quadraticCurveTo(x + w / 2, y + (open ? h - 26 : 54 + Math.sin(time * 2) * (here ? 2 : 0)), x + w - 8, y + h - 30); g.lineTo(x + w - 8, y + h - 8); g.lineTo(x + 8, y + h - 8); g.closePath(); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + 40 + k * 70, y + h - 12); g.quadraticCurveTo(x + 50 + k * 70, y + h - 40, x + 70 + k * 70, y + h - 14); g.stroke(); }
        } else if (i === 1) {
          g.fillStyle = '#b45c4a'; g.fillRect(x + 6, y + 26, w - 12, h - 62); g.fillStyle = '#c9705c'; g.fillRect(x + 6, y + h - 52, w - 12, 30);
          const cols = ['#e8c15a', '#6fa58f', '#e2e0d6']; for (let k = 0; k < 3; k++) { const cx = x + 46 + k * 98, cy = y + (open ? h - 70 + k * 3 : 44 + (here ? Math.sin(time * 2 + k) * 2 : 0)); g.fillStyle = cols[k]; g.beginPath(); g.ellipse(cx + (open ? (k - 1) * 18 : 0), cy + 20, 44, 26, (k - 1) * 0.15, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 1.5; g.stroke(); }
        } else {
          g.fillStyle = '#a06a3d'; g.fillRect(x + 4, y + 18, w - 8, 14); g.fillRect(x + 20, y + 30, 8, h - 56); g.fillRect(x + w - 28, y + 30, 8, h - 56);
          g.fillStyle = '#8c5a30'; g.fillRect(x + 90, y + 40, 8, 74); g.fillRect(x + 90, y + 40, 120, 8);
          if (!open) { g.fillStyle = '#d9b46a'; g.fillRect(x + 100, y + 50, 150, 64); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x + 100, y + 50, 150, 4); }
        }
        g.restore();
        const on = sk.phase === 'look' && sk.sel === i;
        g.lineWidth = on ? 4 : 2; g.strokeStyle = shut ? '#b0a090' : on ? '#e8455f' : '#8a5a34'; g.strokeRect(x, y, w, h);
        text(sp.n, x + 8, y + 6, 13, 'left', shut ? '#9a8a78' : '#5b3a20'); text(shut ? 'VUOTO!' : sp.sub, x + w - 8, y + 8, 11, 'right', shut ? '#c0603a' : '#8a6a4a');
      });
      if (sk.phase === 'look') text(sk.t < 7 ? 'DOV’È FINITA? TOCCA UN NASCONDIGLIO' : 'PSST... UN ORECCHIO SPUNTA!', W / 2, H - 20, 11, 'center', '#6d4a2f');
      if (sk.phase === 'found' || sk.phase === 'end') { g.save(); g.translate(0, sk.spot === 1 ? 200 : 0); }
      if (sk.phase === 'found') banner([sk.got ? ['MARGOT', 'MAGGHINA', 'MARGHY'][sk.round % 3] + ' TROVATA!' : 'ERA QUI!', (sk.round === 0 ? 'DA PICCOLA ' : '') + (sk.got ? '+' + sk.got : 'SI NASCONDEVA BENE'), 'TOCCA']);
      if (sk.phase === 'end') banner(['MARGOT TROVATA!', 'PUNTI ' + sk.pts, 'RECORD ' + sk.best, 'TOCCA']);
      if (sk.phase === 'found' || sk.phase === 'end') g.restore();
    };
    const seekPointer = e => {
      if (e.type !== 'down') return;
      if (sk.phase === 'look') { const i = SPOTS.findIndex(sp => e.y >= sp.y && e.y <= sp.y + sp.h); if (i >= 0) seekPick(i); }
      else if (sk.t > 0.5) seekNext();
    };


    // PALLINA DI STAGNOLA e CACCIA AI GRILLI: due giochi veloci, tutti da ridere
    const FLOOR = 430;
    let mm = null;
    const crinkle = () => { for (let i = 0; i < 4; i++) setTimeout(() => api.beep(1800 + Math.random() * 1800, 0.025, 'square', 0.02), i * 28); };
    const newCricket = () => ({ x: 50 + Math.random() * 250, y: 0, vx: 0, vy: 0, dir: Math.random() < 0.5 ? -1 : 1, hop: 0.3 + Math.random(), gone: 0, t: Math.random() * 6 });
    const miniStart = kind => {
      mm = { kind, t: 40, score: 0, combo: 0, M: { x: 80, dir: 1, sw: 0, walk: 0, mv: false }, tx: null, phase: 'play', msg: '', msgT: 0, best: api.store.get(kind + 'Best', 0), things: [], clock: 0 };
      if (kind === 'foil') mm.things.push({ x: 230, vx: 0, y: 0, vy: 0, rot: 0 }); else for (let i = 0; i < 3; i++) mm.things.push(newCricket());
      state = 'mini';
    };
    const mmSay = (t) => { mm.msg = t; mm.msgT = 1; };
    const QUIPS = ['AH, LA FURBETTA!', 'CHE SALTO, MAGGHINA!', 'UNO PER LA MERENDA!', 'MARGHY NON SBAGLIA!', 'GRILLO CATTURATO!', 'IMBATTIBILE!'];
    const miniSwat = () => {
      if (!mm || mm.phase !== 'play' || mm.M.sw > 0) return;
      const M = mm.M; M.sw = 0.3; const reach = M.x + M.dir * 28; let hit = false;
      if (mm.kind === 'foil') {
        const b = mm.things[0], d = Math.abs(b.x - reach);
        if (d < 34 && b.y > -24) { const q = 1 - d / 34; b.vx = M.dir * (200 + 190 * q); b.vy = -110 - 70 * q; mm.combo++; const pts = 10 * mm.combo + (q > 0.7 ? 15 : 0); mm.score += pts; mmSay((q > 0.7 ? 'ZAMPATA PERFETTA! +' : 'ZAMPATA! +') + pts); crinkle(); api.haptic(14); hit = true; }
      } else {
        for (const c of mm.things) if (c.gone <= 0 && Math.abs(c.x - reach) < 32 && c.y > -34) { c.gone = 1.1; mm.combo++; const pts = 20 * mm.combo; mm.score += pts; mmSay(QUIPS[(Math.random() * QUIPS.length) | 0] + ' +' + pts); api.haptic(18); api.beep(700, 0.07, 'triangle', 0.05); hit = true; break; }
      }
      if (!hit) { mm.combo = 0; api.beep(220, 0.05, 'square', 0.03); if (mm.kind === 'crickets' && Math.random() < 0.4) mmSay('MANCATO! SALTANO TROPPO!'); }
    };
    const miniUpdate = dt => {
      mm.clock += dt; mm.msgT = Math.max(0, mm.msgT - dt);
      if (mm.phase !== 'play') return;
      const M = mm.M; M.sw = Math.max(0, M.sw - dt); mm.t -= dt;
      const di = (held.right ? 1 : 0) - (held.left ? 1 : 0), spd = held.b ? 200 : 135; M.mv = false;
      if (di) { M.dir = di; M.x += di * spd * dt; mm.tx = null; M.mv = true; }
      else if (mm.tx != null) { const d = mm.tx - M.x; if (Math.abs(d) < 5) mm.tx = null; else { M.dir = d > 0 ? 1 : -1; M.x += M.dir * 150 * dt; M.mv = true; } }
      M.x = Math.max(26, Math.min(326, M.x)); if (M.mv) M.walk += dt * 11;
      for (const c of mm.things) {
        if (mm.kind === 'foil') {
          c.x += c.vx * dt; c.vx *= Math.exp(-0.5 * dt); c.vy += 900 * dt; c.y += c.vy * dt;
          if (c.y > 0) { c.y = 0; c.vy = c.vy > 70 ? -c.vy * 0.4 : 0; }
          if (c.x < 18) { c.x = 18; c.vx = Math.abs(c.vx) * 0.85; crinkle(); } if (c.x > 334) { c.x = 334; c.vx = -Math.abs(c.vx) * 0.85; crinkle(); }
          c.rot += c.vx * dt / 13;
        } else {
          if (c.gone > 0) { c.gone -= dt; if (c.gone <= 0) Object.assign(c, newCricket()); continue; }
          c.t += dt; c.vy += 760 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
          if (c.y >= 0) { c.y = 0; c.vy = 0; c.vx *= 0.5; c.hop -= dt;
            if (c.hop <= 0) { const near = Math.abs(c.x - M.x) < 80; if (near) c.dir = c.x > M.x ? 1 : -1; else if (Math.random() < 0.3) c.dir = -c.dir; c.vy = -(200 + Math.random() * 110); c.vx = c.dir * (70 + Math.random() * 70 + (near ? 50 : 0)); c.hop = near ? 0.35 + Math.random() * 0.3 : 0.6 + Math.random() * 0.9; } }
          if (c.x < 20) { c.x = 20; c.dir = 1; c.vx = Math.abs(c.vx); } if (c.x > 332) { c.x = 332; c.dir = -1; c.vx = -Math.abs(c.vx); }
        }
      }
      if (mm.t <= 0) { mm.phase = 'end'; mm.t = 0; mm.clock = 0; if (mm.score > mm.best) { mm.best = mm.score; api.store.set(mm.kind + 'Best', mm.best); } api.haptic(30); }
    };
    const drawMini = () => {
      const bg = g.createLinearGradient(0, 0, 0, FLOOR); bg.addColorStop(0, '#f6ead6'); bg.addColorStop(1, '#ead3ac'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < W; x += 30) g.fillRect(x, 0, 12, FLOOR);
      g.fillStyle = '#a8764a'; g.fillRect(0, FLOOR, W, H - FLOOR); g.fillStyle = '#c18b58'; g.fillRect(0, FLOOR, W, 8);
      g.fillStyle = 'rgba(0,0,0,.08)'; for (let x = 0; x < W; x += 58) g.fillRect(x, FLOOR + 8, 2, H - FLOOR);
      text(mm.kind === 'foil' ? 'LA PALLINA DI STAGNOLA' : 'CACCIA AI GRILLI', W / 2, 10, 17, 'center', '#8a4a22');
      text('TEMPO ' + Math.ceil(mm.t) + '   PUNTI ' + mm.score + (mm.combo > 1 ? '   x' + mm.combo : ''), W / 2, 36, 12, 'center', '#6d4a2f');
      if (mm.kind === 'foil') {
        const b = mm.things[0], cx = b.x, cy = FLOOR - 11 + b.y;
        g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(cx, FLOOR + 2, 12 - Math.min(5, -b.y / 12), 3, 0, 0, 7); g.fill();
        g.save(); g.translate(cx, cy); g.rotate(b.rot);
        const bgd = g.createRadialGradient(-4, -5, 1, 0, 0, 13); bgd.addColorStop(0, '#ffffff'); bgd.addColorStop(0.45, '#c9ced8'); bgd.addColorStop(1, '#6d7487');
        g.fillStyle = bgd; g.beginPath(); for (let k = 0; k < 11; k++) { const a = k / 11 * 6.283, r = 12.5 + (k % 3) * 0.9; k ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(r, 0); } g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-8, -2); g.lineTo(-2, -8); g.moveTo(2, 4); g.lineTo(8, -1); g.moveTo(-5, 6); g.lineTo(1, 9); g.stroke();
        g.strokeStyle = 'rgba(60,66,90,.45)'; g.beginPath(); g.moveTo(-3, -1); g.lineTo(4, 3); g.moveTo(5, -7); g.lineTo(9, 1); g.stroke();
        g.restore();
        if (Math.sin(mm.clock * 9) > 0.6) { g.fillStyle = '#fff'; g.fillRect(cx - 9, cy - 11, 2, 2); g.fillRect(cx + 6, cy - 4, 2, 2); }
      } else {
        for (const c of mm.things) {
          if (c.gone > 0) { if (c.gone > 0.6) { g.fillStyle = '#e8455f'; g.font = 'bold 14px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('★', c.x, FLOOR - 16 - (1.1 - c.gone) * 40); } continue; }
          g.save(); g.translate(c.x, FLOOR - 5 + c.y); g.scale(c.dir * 1.6, 1.6);
          g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 5 - c.y / 1.6, 7, 1.6, 0, 0, 7); g.fill();
          g.strokeStyle = '#3f6b2f'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-2, 0); g.lineTo(-7, -5); g.lineTo(-9, 3); g.moveTo(1, 0); g.lineTo(-3, -6); g.lineTo(-4, 4); g.moveTo(5, -2); g.lineTo(9, -7); g.moveTo(5, -3); g.lineTo(11, -4); g.stroke();
          g.fillStyle = '#5c9a43'; g.beginPath(); g.ellipse(-1, 0, 6.5, 3.2, -0.1, 0, 7); g.fill(); g.beginPath(); g.ellipse(5, -1, 2.6, 2.4, 0, 0, 7); g.fill();
          g.fillStyle = '#26401c'; g.fillRect(6, -2.2, 1, 1); g.restore();
        }
      }
      const M = mm.M, pose = M.sw > 0 ? 'jump' : M.mv ? 'walk' : 'idle';
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(M.x, FLOOR + 6, 20, 4, 0, 0, 7); g.fill();
      mg(M.x, FLOOR + 8 - (M.sw > 0 ? Math.sin((0.3 - M.sw) / 0.3 * 3.14) * 16 : 0), 70, pose, M.mv ? M.walk : mm.clock, M.dir);
      if (mm.msgT > 0) { g.globalAlpha = Math.min(1, mm.msgT * 2); text(mm.msg, W / 2, 62, 13, 'center', '#c0334d'); g.globalAlpha = 1; }
      if (mm.phase === 'play' && mm.clock < 4) text(mm.kind === 'foil' ? 'A = ZAMPATA · INSEGUI LA PALLINA!' : 'A = SALTA SUL GRILLO!', W / 2, H - 26, 11, 'center', '#6d4a2f');
      if (mm.phase === 'end') banner([mm.score >= mm.best && mm.score > 0 ? 'NUOVO RECORD!' : 'TEMPO!', 'PUNTI ' + mm.score, 'RECORD ' + mm.best, 'TOCCA']);
    };
    const miniPointer = e => {
      if (e.type !== 'down') return;
      if (mm.phase === 'end') { if (mm.clock > 0.5) state = 'title'; return; }
      mm.tx = e.x; mm.M.dir = e.x >= mm.M.x ? 1 : -1; miniSwat();
    };

    // IL PRATO DI MONTAGNA: caccia a lucertole e topolini, e sole per ricaricarsi
    const PS = 1.6;
    let pr = null;
    const pVW = () => CW / PS, pVH = () => CH / PS;
    const pBand = () => ({ hz: pVH() * 0.36, top: pVH() * 0.50, bot: pVH() * 0.93 });
    const pDepth = y => { const b = pBand(); return 0.74 + 0.5 * Math.max(0, Math.min(1, (y - b.top) / (b.bot - b.top))); };
    const pSay = t => { pr.msg = t; pr.msgT = 1.4; };
    const pRand = (a, b) => a + Math.random() * (b - a);
    const pClampY = y => { const b = pBand(); return Math.max(b.top + 6, Math.min(b.bot, y)); };
    const pLizard = () => { const r = pr.rocks[(Math.random() * pr.rocks.length) | 0]; return { kind: 'liz', x: r.x + pRand(-8, 8), y: r.y + 3, dir: Math.random() < 0.5 ? -1 : 1, st: 'bask', t: pRand(1, 3), gone: 0, ph: Math.random() * 6, vx: 0, vy: 0 }; };
    const pMouse = () => { const h = pr.holes[(Math.random() * pr.holes.length) | 0]; return { kind: 'mouse', x: h.x, y: h.y, dir: 1, st: 'hide', t: pRand(0.6, 2.4), gone: 0, ph: 0, tx: h.x, ty: h.y, toHole: false }; };
    const pratoStart = () => {
      const WW = 1900, b = pBand();
      pr = { WW, t: 100, score: 0, combo: 0, combT: 0, en: 100, cam: 0, M: { x: 140, y: (b.top + b.bot) / 2, dir: 1, walk: 0, mv: false, leap: 0, lvx: 0, lvy: 0, still: 0, sun: false, hit: false }, tx: null, ty: null, chase: null, running: false,
        things: [], suns: [], holes: [], rocks: [], flora: [], phase: 'play', msg: '', msgT: 0, clock: 0, endT: 0, paused: false, best: api.store.get('pratoBest', 0), heart: 0 };
      for (let i = 0; i < 4; i++) pr.suns.push({ x: 300 + i * ((WW - 600) / 3) + pRand(-40, 40), y: pRand(b.top + 30, b.bot - 30), r: 54 });
      for (let i = 0; i < 7; i++) pr.rocks.push({ x: 160 + i * ((WW - 320) / 6) + pRand(-30, 30), y: pRand(b.top + 14, b.bot - 14), s: pRand(0.9, 1.35) });
      for (let i = 0; i < 6; i++) pr.holes.push({ x: 90 + (i + 0.5) * ((WW - 180) / 6) + pRand(-30, 30), y: pRand(b.top + 14, b.bot - 10) });
      for (let i = 0; i < 190; i++) pr.flora.push({ x: pRand(0, WW), y: pRand(b.hz + 14, b.bot + 6), k: Math.random() < 0.58 ? 'tuft' : 'flower', c: ['#ffffff', '#ffd23f', '#ff7aa8', '#b58cff', '#ff9a4a'][(Math.random() * 5) | 0], s: pRand(0.7, 1.3), ph: Math.random() * 6 });
      for (let i = 0; i < 5; i++) pr.things.push(pLizard());
      for (let i = 0; i < 3; i++) pr.things.push(pMouse());
      state = 'prato';
    };
    const inSun = (x, y) => pr.suns.some(s => { const dx = (x - s.x) / s.r, dy = (y - s.y) / (s.r * 0.5); return dx * dx + dy * dy < 1; });
    const pratoPounce = () => {
      const M = pr.M; if (pr.phase !== 'play' || M.leap > 0 || pr.en < 4) return;
      pr.en -= 8; M.leap = 0.3; M.hit = false; M.sun = false; M.still = 0;
      let ux = M.dir, uy = 0;
      if (pr.chase && !pr.chase.gone) { const dx = pr.chase.x - M.x, dy = pr.chase.y - M.y, d = Math.hypot(dx, dy) || 1; ux = dx / d; uy = dy / d * 0.7; M.dir = dx >= 0 ? 1 : -1; }
      M.lvx = ux * 270; M.lvy = uy * 270; api.beep(520, 0.06, 'triangle', 0.04);
    };
    const pCatch = c => {
      c.gone = 1.1; pr.combo++; pr.combT = 6; pr.M.hit = true;
      const pts = (c.kind === 'liz' ? 30 : 60) * Math.min(5, pr.combo); pr.score += pts;
      pSay((c.kind === 'liz' ? 'LUCERTOLA! +' : 'TOPOLINO! +') + pts + (pr.combo > 1 ? '  x' + Math.min(5, pr.combo) : ''));
      api.haptic(18); api.beep(c.kind === 'liz' ? 640 : 820, 0.08, 'triangle', 0.05); setTimeout(() => api.beep(980, 0.07, 'triangle', 0.04), 70);
      if (pr.chase === c) pr.chase = null;
    };
    const pratoUpdate = dt => {
      pr.clock += dt; pr.msgT = Math.max(0, pr.msgT - dt);
      if (pr.paused) return;
      if (pr.phase !== 'play') { pr.endT += dt; return; }
      pr.t -= dt; pr.combT = Math.max(0, pr.combT - dt); if (pr.combT <= 0) pr.combo = 0;
      const M = pr.M, b = pBand(), WW = pr.WW;
      const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      const tired = pr.en < 22, run = (held.b || pr.running) && pr.en > 4 && !tired;
      const sp = (tired ? 58 : 108) * (run ? 1.7 : 1);
      M.mv = false;
      if (M.leap > 0) {
        M.leap -= dt; M.x += M.lvx * dt; M.y += M.lvy * dt; M.mv = true;
        if (!M.hit) for (const c of pr.things) if (c.gone <= 0 && Math.abs(c.x - M.x) < 26 && Math.abs(c.y - M.y) < 17) { pCatch(c); break; }
        if (M.leap <= 0 && !M.hit) { pr.combo = 0; if (Math.random() < 0.5) pSay('MANCATO! PIANO PIANO...'); api.beep(200, 0.05, 'square', 0.03); }
      } else if (dx || dy) {
        pr.chase = null; pr.tx = null; pr.running = false;
        if (dx) M.dir = dx; M.x += dx * sp * dt; M.y += dy * sp * 0.7 * dt; M.mv = true;
      } else if (pr.chase) {
        const c = pr.chase, ddx = c.x - M.x, ddy = c.y - M.y, d = Math.hypot(ddx, ddy);
        if (c.gone > 0) pr.chase = null;
        else if (d < 48) { pratoPounce(); }
        else { M.dir = ddx >= 0 ? 1 : -1; M.x += ddx / d * sp * dt; M.y += ddy / d * sp * 0.7 * dt; M.mv = true; }
      } else if (pr.tx != null) {
        const ddx = pr.tx - M.x, ddy = pr.ty - M.y, d = Math.hypot(ddx, ddy);
        if (d < 5) { pr.tx = null; pr.running = false; } else { M.dir = ddx >= 0 ? 1 : -1; M.x += ddx / d * sp * dt; M.y += ddy / d * sp * 0.7 * dt; M.mv = true; }
      }
      M.x = Math.max(30, Math.min(WW - 30, M.x)); M.y = pClampY(M.y);
      if (M.mv && M.leap <= 0) M.walk += dt * (run ? 15 : 10);
      if (!M.mv) M.still += dt; else M.still = 0;
      M.sun = M.still > 0.6 && inSun(M.x, M.y);
      if (M.sun) {
        pr.en = Math.min(100, pr.en + 26 * dt); pr.heart -= dt;
        if (pr.heart <= 0) { pr.heart = 0.7; api.beep(180 + Math.random() * 30, 0.35, 'sine', 0.03); }
      } else { pr.en = Math.max(0, pr.en - (run && M.mv ? 9 : 0.8) * dt); }
      if (tired && Math.random() < dt * 0.4 && pr.msgT <= 0) pSay('MARGOT E STANCA: VAI AL SOLE!');
      pr.cam = Math.max(0, Math.min(WW - pVW(), M.x - pVW() / 2));

      for (const c of pr.things) {
        if (c.gone > 0) { c.gone -= dt; if (c.gone <= 0) Object.assign(c, c.kind === 'liz' ? pLizard() : pMouse()); continue; }
        const d = Math.hypot(c.x - M.x, (c.y - M.y) * 1.6); c.ph += dt;
        if (c.kind === 'liz') {
          if (c.st === 'bask') { c.t -= dt; if (d < 88) { c.st = 'dash'; c.t = pRand(0.35, 0.6); const s = c.x >= M.x ? 1 : -1; c.vx = s * pRand(170, 230); c.vy = pRand(-50, 50); c.dir = s; } }
          else if (c.st === 'dash') { c.x += c.vx * dt; c.y = pClampY(c.y + c.vy * dt); c.t -= dt; if (c.x < 20 || c.x > WW - 20) { c.vx = -c.vx; c.dir = -c.dir; c.x = Math.max(20, Math.min(WW - 20, c.x)); } if (c.t <= 0) { c.st = 'freeze'; c.t = pRand(0.6, 1.4); } }
          else { c.t -= dt; if (d < 62) { c.st = 'dash'; c.t = pRand(0.3, 0.5); const s = c.x >= M.x ? 1 : -1; c.vx = s * pRand(180, 240); c.vy = pRand(-60, 60); c.dir = s; } else if (c.t <= 0) c.st = 'bask'; }
        } else {
          if (c.st === 'hide') { c.t -= dt; if (c.t <= 0) { c.st = 'run'; c.t = pRand(2.2, 3.6); c.toHole = false; c.tx = Math.max(40, Math.min(WW - 40, c.x + pRand(-220, 220))); c.ty = pClampY(c.y + pRand(-60, 60)); } }
          else {
            c.t -= dt;
            if (d < 85 && !c.toHole) { c.toHole = true; let bh = pr.holes[0], bd = 1e9; for (const h of pr.holes) { const hd = Math.hypot(h.x - c.x, h.y - c.y) + (Math.hypot(h.x - M.x, h.y - M.y) < 70 ? 400 : 0); if (hd < bd) { bd = hd; bh = h; } } c.tx = bh.x; c.ty = bh.y; }
            if (c.t <= 0 && !c.toHole) { c.toHole = true; const h = pr.holes[(Math.random() * pr.holes.length) | 0]; c.tx = h.x; c.ty = h.y; }
            const ddx = c.tx - c.x, ddy = c.ty - c.y, dd = Math.hypot(ddx, ddy) || 1, v = c.toHole && d < 130 ? 245 : 150;
            c.dir = ddx >= 0 ? 1 : -1; c.x += ddx / dd * v * dt + Math.sin(c.ph * 9) * 24 * dt; c.y = pClampY(c.y + ddy / dd * v * dt * 0.8);
            if (dd < 8) { if (c.toHole) { c.st = 'hide'; c.t = pRand(1, 2.6); c.toHole = false; } else { c.toHole = true; const h = pr.holes[(Math.random() * pr.holes.length) | 0]; c.tx = h.x; c.ty = h.y; } }
          }
        }
      }
      if (pr.t <= 0) { pr.phase = 'end'; pr.t = 0; pr.endT = 0; if (pr.score > pr.best) { pr.best = pr.score; api.store.set('pratoBest', pr.best); } api.haptic(30); }
    };
    const pratoKey = k => {
      if (pr.phase === 'end') { if (pr.endT > 0.5) state = 'title'; return; }
      if (k === 'a') pratoPounce(); else if (k === 'start') pr.paused = !pr.paused; else if (k === 'select') state = 'title';
    };
    const pratoPointer = e => {
      if (e.type !== 'down') return;
      if (pr.phase === 'end') { if (pr.endT > 0.5) state = 'title'; return; }
      if (pr.paused) { pr.paused = false; return; }
      const wx = e.x / PS + pr.cam, wy = e.y / PS; let best = null, bd = 44;
      for (const c of pr.things) { if (c.gone > 0 || c.st === 'hide') continue; const d = Math.hypot(c.x - wx, (c.y - wy) * 1.1); if (d < bd) { bd = d; best = c; } }
      if (best) { pr.chase = best; pr.tx = null; pr.running = true; } else { pr.chase = null; pr.tx = wx; pr.ty = pClampY(wy); pr.running = false; }
    };

    const drawPrato = () => {
      const VWp = pVW(), VHp = pVH(), b = pBand(), cam = pr.cam, tm = time;
      g.save(); g.scale(PS, PS);
      // cielo
      const sky = g.createLinearGradient(0, 0, 0, b.hz + 20); sky.addColorStop(0, '#5aa8ee'); sky.addColorStop(0.7, '#bfe3fb'); sky.addColorStop(1, '#eaf7ff');
      g.fillStyle = sky; g.fillRect(0, 0, VWp, b.hz + 24);
      const sx0 = VWp * 0.8, sy0 = VHp * 0.1; const sg = g.createRadialGradient(sx0, sy0, 2, sx0, sy0, 70); sg.addColorStop(0, 'rgba(255,248,200,.95)'); sg.addColorStop(0.25, 'rgba(255,240,170,.45)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
      g.fillStyle = sg; g.fillRect(sx0 - 80, sy0 - 80, 160, 160); g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(sx0, sy0, 13, 0, 7); g.fill();
      for (let i = 0; i < 5; i++) { const cx = ((i * 190 + tm * (6 + i * 1.5) - cam * 0.06) % (VWp + 160)) - 60, cy = 24 + (i % 3) * 22; g.fillStyle = 'rgba(255,255,255,.88)'; g.beginPath(); g.ellipse(cx, cy, 30, 8, 0, 0, 7); g.ellipse(cx + 14, cy - 6, 20, 8, 0, 0, 7); g.ellipse(cx - 16, cy - 3, 16, 6, 0, 0, 7); g.fill(); }
      const ridge = (f, base, amp, seed, c1, c2, snow) => {
        const hh = wx => 0.28 + 0.52 * Math.pow(Math.abs(Math.sin(wx * 0.0085 + seed)), 0.7) + 0.2 * Math.abs(Math.sin(wx * 0.021 + seed * 2));
        g.beginPath(); g.moveTo(0, base + 4);
        for (let x = 0; x <= VWp + 6; x += 5) g.lineTo(x, base - amp * hh(x + cam * f));
        g.lineTo(VWp + 6, base + 4); g.closePath();
        const gr = g.createLinearGradient(0, base - amp, 0, base); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fill();
        if (snow) { g.save(); g.clip(); const sn = g.createLinearGradient(0, base - amp, 0, base - amp * 0.55); sn.addColorStop(0, 'rgba(255,255,255,.95)'); sn.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sn; g.fillRect(0, base - amp - 2, VWp, amp * 0.5); g.restore(); }
      };
      ridge(0.10, b.hz - 2, 86, 1.3, '#8fa6c4', '#c9dbee', true);
      ridge(0.22, b.hz + 6, 62, 4.1, '#5f7fa0', '#a9c4d8', true);
      ridge(0.38, b.hz + 14, 38, 7.7, '#3f7a62', '#7fb08a', false);
      // abeti sul crinale
      for (let wx = Math.floor(cam * 0.55 / 12) * 12; wx < cam * 0.55 + VWp + 14; wx += 12) {
        const hsh = Math.abs(Math.sin(wx * 12.9898) * 43758.5453) % 1; if (hsh < 0.25) continue;
        const x = wx - cam * 0.55, h = 12 + hsh * 12, y = b.hz + 20;
        g.fillStyle = '#245a3a'; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + 5, y); g.lineTo(x - 5, y); g.closePath(); g.fill();
        g.fillStyle = '#2f6e46'; g.beginPath(); g.moveTo(x, y - h * 0.8); g.lineTo(x + 4, y - h * 0.3); g.lineTo(x - 4, y - h * 0.3); g.closePath(); g.fill();
      }
      // prato
      const mg0 = g.createLinearGradient(0, b.hz + 16, 0, VHp); mg0.addColorStop(0, '#a9d97a'); mg0.addColorStop(0.45, '#6fb857'); mg0.addColorStop(1, '#3d8f3c');
      g.fillStyle = mg0; g.beginPath(); g.moveTo(0, b.hz + 22); for (let x = 0; x <= VWp + 8; x += 8) g.lineTo(x, b.hz + 14 + Math.sin((x + cam * 0.5) * 0.02) * 4 + Math.sin((x + cam * 0.5) * 0.05) * 1.5); g.lineTo(VWp + 8, VHp); g.lineTo(0, VHp); g.closePath(); g.fill();
      for (let i = 0; i < 9; i++) { const yy = b.hz + 30 + i * (VHp - b.hz - 30) / 9, off = (tm * 8 + i * 37 - cam * (0.4 + i * 0.12)) % 120; g.fillStyle = 'rgba(255,255,255,.05)'; for (let x = -120 + off; x < VWp; x += 120) g.fillRect(x, yy, 70, 3 + i * 0.4); }
      g.translate(-cam, 0);
      // zone di sole
      for (const s of pr.suns) {
        if (s.x < cam - 90 || s.x > cam + VWp + 90) continue;
        const sg2 = g.createRadialGradient(s.x, s.y, 2, s.x, s.y, s.r); sg2.addColorStop(0, 'rgba(255,244,170,.85)'); sg2.addColorStop(0.6, 'rgba(255,236,140,.42)'); sg2.addColorStop(1, 'rgba(255,236,140,0)');
        g.save(); g.translate(0, s.y); g.scale(1, 0.5); g.translate(0, -s.y); g.fillStyle = sg2; g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill(); g.restore();
        g.strokeStyle = `rgba(255,250,200,${0.18 + 0.1 * Math.sin(tm * 2 + s.x)})`; g.lineWidth = 1.2; for (let k = 0; k < 5; k++) { const a = tm * 0.3 + k * 1.26; g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x + Math.cos(a) * s.r * 0.95, s.y + Math.sin(a) * s.r * 0.45); g.stroke(); }
        g.fillStyle = 'rgba(255,255,220,.8)'; for (let k = 0; k < 4; k++) { const a = tm * 0.9 + k * 1.6 + s.x; g.fillRect(s.x + Math.cos(a) * s.r * 0.6, s.y - 4 - ((tm * 12 + k * 9) % 22), 1.6, 1.6); }
      }
      // elementi ordinati per profondita
      const list = [];
      for (const f of pr.flora) if (f.x > cam - 20 && f.x < cam + VWp + 20) list.push({ y: f.y, fn: () => drawFlora(f) });
      for (const r of pr.rocks) if (r.x > cam - 40 && r.x < cam + VWp + 40) list.push({ y: r.y, fn: () => drawRock(r) });
      for (const h of pr.holes) if (h.x > cam - 30 && h.x < cam + VWp + 30) list.push({ y: h.y - 1, fn: () => drawHole(h) });
      for (const c of pr.things) if (c.x > cam - 40 && c.x < cam + VWp + 40) list.push({ y: c.y + 1, fn: () => (c.kind === 'liz' ? drawLizard(c) : drawMouse(c)) });
      list.push({ y: pr.M.y + 2, fn: drawMargotP });
      list.sort((p, q) => p.y - q.y); list.forEach(o => o.fn());
      // farfalle
      for (let i = 0; i < 6; i++) { const bx = ((i * 330 + tm * (14 + i * 3)) % (pr.WW + 100)) - 50, by = b.hz + 60 + i * 24 + Math.sin(tm * 1.8 + i) * 14; if (bx < cam - 10 || bx > cam + VWp + 10) continue; const fl = Math.abs(Math.sin(tm * 14 + i)) * 4 + 1; g.fillStyle = ['#ffd23f', '#ff7aa8', '#8fd4ff'][i % 3]; g.beginPath(); g.ellipse(bx - 2, by, fl, 3, -0.4, 0, 7); g.ellipse(bx + 2, by, fl, 3, 0.4, 0, 7); g.fill(); }
      g.restore();
      // HUD
            text('TEMPO ' + Math.ceil(pr.t) + '   PUNTI ' + pr.score + (pr.combo > 1 ? '   x' + Math.min(5, pr.combo) : ''), W - 10, 10, 12, 'right', '#fffbe0');
      const bw = Math.min(130, W * 0.3);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(10, 8, bw + 4, 14); g.fillStyle = pr.en < 22 ? '#e8455f' : pr.en > 70 ? '#ffd23f' : '#f4a63a'; g.fillRect(12, 10, bw * pr.en / 100, 10);
      g.fillStyle = '#fff6b0'; g.beginPath(); g.arc(18 + bw + 12, 15, 5, 0, 7); g.fill();
      text('ENERGIA', 12, 24, 9, 'left', '#ffffff');
      if (pr.M.sun) text('PRENDE IL SOLE... ZZZ', W / 2, H * 0.2, 14, 'center', '#fff3a0');
      if (pr.msgT > 0) { g.globalAlpha = Math.min(1, pr.msgT * 2); text(pr.msg, W / 2, H * 0.14, 13, 'center', '#ffffff'); g.globalAlpha = 1; }
      if (pr.phase === 'play' && pr.clock < 6) text('TOCCA UNA LUCERTOLA O UN TOPOLINO · A = SALTA · FERMA SUL SOLE = RICARICA', W / 2, H - 16, 9, 'center', '#ffffff');
      if (pr.paused) banner(['PAUSA', 'TOCCA']);
      if (pr.phase === 'end') banner([pr.score >= pr.best && pr.score > 0 ? 'NUOVO RECORD!' : 'TEMPO!', 'PUNTI ' + pr.score, 'RECORD ' + pr.best, 'TOCCA']);
    };
    const drawFlora = f => {
      const k = pDepth(f.y) * f.s, sw = Math.sin(time * 2 + f.ph + f.x * 0.03) * 2 * k;
      g.save(); g.translate(f.x, f.y);
      if (f.k === 'tuft') { g.strokeStyle = '#2f7a35'; g.lineWidth = 1.4 * k; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * 1.8 * k, 0); g.quadraticCurveTo(i * 2.6 * k + sw * 0.4, -7 * k, i * 3.4 * k + sw, -(12 - Math.abs(i) * 2) * k); } g.stroke(); g.strokeStyle = '#7cc761'; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sw * 0.4, -8 * k, sw, -13 * k); g.stroke(); }
      else { g.strokeStyle = '#2f7a35'; g.lineWidth = 1.2 * k; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sw * 0.5, -6 * k, sw, -11 * k); g.stroke(); g.fillStyle = f.c; for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.beginPath(); g.arc(sw + Math.cos(a) * 2.6 * k, -11 * k + Math.sin(a) * 2.6 * k, 2 * k, 0, 7); g.fill(); } g.fillStyle = '#e8a32a'; g.beginPath(); g.arc(sw, -11 * k, 1.5 * k, 0, 7); g.fill(); }
      g.restore();
    };
    const drawRock = r => {
      const k = pDepth(r.y) * r.s; g.save(); g.translate(r.x, r.y);
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(2, 2, 17 * k, 5 * k, 0, 0, 7); g.fill();
      const rg = g.createLinearGradient(-10 * k, -14 * k, 10 * k, 4 * k); rg.addColorStop(0, '#d9d6cf'); rg.addColorStop(1, '#7d7a76');
      g.fillStyle = rg; g.beginPath(); g.moveTo(-16 * k, 2 * k); g.quadraticCurveTo(-14 * k, -11 * k, -3 * k, -12 * k); g.quadraticCurveTo(10 * k, -14 * k, 15 * k, -3 * k); g.quadraticCurveTo(17 * k, 3 * k, 8 * k, 4 * k); g.lineTo(-12 * k, 4 * k); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(60,56,52,.45)'; g.lineWidth = 1; g.stroke(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-3 * k, -8 * k, 6 * k, 2 * k, -0.2, 0, 7); g.fill();
      g.restore();
    };
    const drawHole = h => { const k = pDepth(h.y); g.save(); g.translate(h.x, h.y); g.fillStyle = '#6b4a2c'; g.beginPath(); g.ellipse(0, 0, 11 * k, 5 * k, 0, 0, 7); g.fill(); g.fillStyle = '#1e140c'; g.beginPath(); g.ellipse(0, 0.6 * k, 8 * k, 3.4 * k, 0, 0, 7); g.fill(); g.restore(); };
    const drawLizard = c => {
      const k = pDepth(c.y) * 1.05;
      if (c.gone > 0) { if (c.gone > 0.6) { g.fillStyle = '#e8455f'; g.font = 'bold 13px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('★', c.x, c.y - 14 - (1.1 - c.gone) * 40); } return; }
      const moving = c.st === 'dash', ph = c.ph * (moving ? 22 : 3), up = c.st === 'bask' ? -7 * pDepth(c.y) * 0.7 : 0;
      g.save(); g.translate(c.x, c.y + up); g.scale(c.dir * k, k);
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 4 - up / k, 11, 2.4, 0, 0, 7); g.fill();
      g.strokeStyle = '#4f7a2a'; g.lineWidth = 1.6; g.lineCap = 'round';
      for (const [lx, d] of [[-3, 1], [5, -1]]) { const s = moving ? Math.sin(ph) * 3 * d : 0; g.beginPath(); g.moveTo(lx, 1); g.lineTo(lx + s - 2, 5); g.moveTo(lx, 1); g.lineTo(lx - s + 3, 5); g.stroke(); }
      g.lineWidth = 2.6; g.strokeStyle = '#6fa03a'; g.beginPath(); g.moveTo(-8, 0); const tw = Math.sin(c.ph * (moving ? 18 : 4)) * (moving ? 5 : 3); g.bezierCurveTo(-14, tw, -18, -tw, -24, tw * 0.6); g.stroke();
      const bg = g.createLinearGradient(0, -4, 0, 4); bg.addColorStop(0, '#9ccb52'); bg.addColorStop(1, '#5e8f2e'); g.fillStyle = bg; g.beginPath(); g.ellipse(0, 0, 9.5, 3.8, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(10, -0.5, 4.6, 3, 0, 0, 7); g.fill();
      g.fillStyle = '#3d5f1c'; g.fillRect(-4, -3.4, 2.2, 2); g.fillRect(1, -3.4, 2.2, 2);
      g.fillStyle = '#111'; g.fillRect(11.4, -2.2, 1.3, 1.3);
      g.strokeStyle = '#e8455f'; g.lineWidth = 0.8; if (Math.sin(c.ph * 5) > 0.85) { g.beginPath(); g.moveTo(14.5, -0.4); g.lineTo(18, -0.4); g.stroke(); }
      g.restore();
    };
    const drawMouse = c => {
      if (c.st === 'hide') return;
      const k = pDepth(c.y) * 1.1;
      if (c.gone > 0) { if (c.gone > 0.6) { g.fillStyle = '#e8455f'; g.font = 'bold 13px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('★', c.x, c.y - 14 - (1.1 - c.gone) * 40); } return; }
      const bob = Math.abs(Math.sin(c.ph * 16)) * -2;
      g.save(); g.translate(c.x, c.y + bob); g.scale(c.dir * k, k);
      g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 3 - bob / k, 8, 2, 0, 0, 7); g.fill();
      g.strokeStyle = '#e8a6a6'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-7, -1); g.bezierCurveTo(-13, -2 + Math.sin(c.ph * 12) * 3, -14, 4, -19, 1 + Math.sin(c.ph * 10) * 2); g.stroke();
      const bg = g.createLinearGradient(0, -6, 0, 3); bg.addColorStop(0, '#b9b4b0'); bg.addColorStop(1, '#7e7873'); g.fillStyle = bg; g.beginPath(); g.ellipse(0, -2, 8, 5, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(7, -2.5, 4, 3, 0, 0, 7); g.fill();
      g.fillStyle = '#f2b6c0'; g.beginPath(); g.arc(3.5, -7.2, 3, 0, 7); g.fill(); g.fillStyle = '#d98f9d'; g.beginPath(); g.arc(3.5, -7.2, 1.7, 0, 7); g.fill();
      g.fillStyle = '#111'; g.fillRect(8.4, -4, 1.4, 1.4); g.fillStyle = '#e57b8a'; g.fillRect(10.6, -2.8, 1.5, 1.5);
      g.strokeStyle = '#4a4540'; g.lineWidth = 1; g.beginPath(); g.moveTo(-3, 2); g.lineTo(-4, 3.6); g.moveTo(3, 2); g.lineTo(4, 3.6); g.stroke();
      g.restore();
    };
    const drawMargotP = () => {
      const M = pr.M, k = pDepth(M.y), pose = M.leap > 0 ? 'jump' : M.mv ? 'walk' : 'idle', h = 40 * k;
      g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(M.x, M.y + 2, 17 * k, 4 * k, 0, 0, 7); g.fill();
      if (M.sun) {
        g.save(); g.translate(M.x, M.y + 2); g.scale(1.12, 0.6); mg(0, 0, h, 'idle', time, M.dir); g.restore();
        for (let i = 0; i < 3; i++) { const t = (time * 0.7 + i / 3) % 1; g.globalAlpha = 1 - t; g.fillStyle = '#e8455f'; g.font = `bold ${10 + i * 2}px ui-monospace, monospace`; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('♥', M.x + (i - 1) * 10, M.y - 20 * k - t * 24); }
        g.globalAlpha = 1;
      } else mg(M.x, M.y + 2 - (M.leap > 0 ? Math.sin((0.3 - M.leap) / 0.3 * Math.PI) * 14 : 0), h, pose, M.mv ? M.walk : time, M.dir);
    };

    const update = dt => {
      time += dt; if (state === 'seek') { sk.t += dt; return; }
      if (state === 'prato') { pratoUpdate(dt); return; }
      if (state === 'mini') { miniUpdate(dt); return; } msgT = Math.max(0, msgT - dt);
      if (state === 'play') {
        P.hidden = false;
        for (const b of blankets) if (Math.abs(P.x - b.x) < b.w / 2 && P.ground && held.down) { P.hidden = true; P.vx = 0; }
        if (P.hidden) { if (msgT <= 0) flash('SOTTO LA COPERTA...'); } else move(dt);
        if (P.ground && chap().name === 'CUCINA' && tile(Math.floor(P.x / T), Math.floor(P.y / T)) === 2) {
          const kk = Math.floor(P.x / T / 5);
          if (!seen[kk]) { seen[kk] = 1; score += 10; flash('CURIOSA! SALE SULLA SEDIA'); api.beep(880, 0.05, 'triangle', 0.04); }
        }
        for (const m of memories) if (!m.got && Math.hypot(m.x - P.x, m.y - (P.y - 8)) < 18) {
          m.got = true; const al = unlocked().slice(); let idx = PHOTOS.map((_, i) => i).find(i => !al.includes(i));
          if (idx === undefined) idx = (photoShow + 1) % PHOTOS.length;
          if (!al.includes(idx)) { al.push(idx); api.store.set('album', al); }
          photoShow = idx; state = 'photo'; score += 100; api.haptic(25);
          [660, 784, 988].forEach((f, i) => setTimeout(() => api.beep(f, 0.14, 'sine', 0.05), i * 120));
        }
        for (const h of hugs) if (!h.used && Math.abs(h.x - P.x) < 18 && P.ground && held.down) {
          h.used = true; state = 'rest'; restT = 2.6; lives = Math.min(5, lives + 1); P.vx = 0;
          coccole++; strokes = 0; const bonus = 50 * coccole; score += bonus; api.store.set('coccole', api.store.get('coccole', 0) + 1);
          flash('COCCOLE n.' + coccole + '  +' + bonus + '  · TOCCA A: GRATTINI SULLA TESTA!'); msgT = 2.6;
          flash('TRA LE BRACCIA, AL CALDO'); api.haptic(20);
          [392, 494, 587].forEach((f, i) => setTimeout(() => api.beep(f, 0.3, 'sine', 0.04), i * 220));
        }
        for (const c of treats) {
          if (!c.got && Math.hypot(c.x - P.x, c.y - (P.y - 10)) < 15) {
            c.got = true; got++; score += c.kind === 'tuna' ? 100 : c.kind === 'stick' ? 30 : 10; api.haptic(c.kind ? 20 : 8);
            if (c.kind === 'stick') { msg = 'CHE BUONI, I BASTONCINI!'; msgT = 1.4; }
            if (c.kind === 'tuna') { msg = lives < 5 ? 'TONNO! +1 VITA' : 'TONNO! GNAM!'; msgT = 1.6; lives = Math.min(5, lives + 1); [523, 659, 784].forEach((f, i) => setTimeout(() => api.beep(f, 0.12, 'triangle', 0.05), i * 90)); }
             api.beep(900 + Math.min(500, got * 25), 0.05, 'square', 0.04);
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
          const hh = GR * T - P.y;   // altezza dei piedi da terra: la maniglia sta a 34, il corpo di Margot e' alto 18
          if (dx < PW + T / 2 + 5 && !P.ground && hh >= 4 && hh <= 46) {
            d.open = true; d.t = 0; for (let r = GR - 3; r < GR; r++) grid[r][d.c] = 0;
            score += 20; api.haptic(15); api.beep(520, 0.05, 'square', 0.05); setTimeout(() => api.beep(780, 0.1, 'triangle', 0.05), 70);
            flash('MARGOT APRE LA PORTA!'); d.press = 1;
          } else if (dx < 80 && msgT <= 0 && !doorHint) { doorHint = true; flash('SALTA E TOCCA LA MANIGLIA!'); }
        }
        // il robot pulisci casa: parte dopo un po' e insegue Margot
        if (!chaser.on && P.x > 9 * T && door && P.x < door.x - 10 * T) { chaser.on = true; chaser.x = Math.max(-60, camX - 50); flash('ARRIVA IL ROBOT! SCAPPA!'); api.haptic(30); api.beep(120, 0.4, 'sawtooth', 0.06); }
        if (chaser.on) {
          chaser.t += dt;
          const sp = Math.min(118, 78 + level * 5 + chaser.t * 0.8);
          chaser.x += sp * dt;
          const dx = P.x - chaser.x;
          if (dx > 110 + 40 * 0) chaser.x += (dx - 110) * Math.min(1, dt * 1.2);   // non resta troppo indietro
          chaser.beep -= dt;
          if (chaser.beep <= 0 && dx > -40 && dx < 130) { chaser.beep = 0.35; api.beep(90 + Math.max(0, 130 - dx), 0.08, 'sawtooth', 0.03); api.haptic(3); }
          if (!P.hidden && Math.abs(dx) < 26 && P.y > GR * T - 24 && P.y - PH < GR * T) { flash('IL ROBOT TI HA PRESA!'); hurt(); }
          if (P.hidden && Math.abs(dx) < 26 && msgT <= 0) flash('SHH... IL ROBOT PASSA');
        }
        for (const k of cats) {
          if (k.dead) continue;
          k.t += dt; k.x += k.dir * 38 * dt;
          if (k.x < k.min) { k.x = k.min; k.dir = 1; }
          if (k.x > k.max) { k.x = k.max; k.dir = -1; }
          if (!P.hidden && Math.abs(k.x - P.x) < 19 && P.y > k.y - 14 && P.y - PH < k.y) {
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
      } else if (state === 'rest') {
        restT -= dt; if (restT <= 0) state = 'play';
        purrT -= dt; if (purrT <= 0) { purrT = 0.052; api.beep(78 + (purrN++ % 2) * 7, 0.055, 'triangle', 0.05); }
        petFx.forEach(f => f.t += dt); petFx = petFx.filter(f => f.t < 1);
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
      const wantY = Math.max(0, Math.min(VH * T - VISH, P.y - VISH * 0.68)); camY += (wantY - camY) * Math.min(1, dt * 6);
    };

    const act = k => {
      if (state === 'seek') { seekKey(k); return; }
      if (state === 'prato') { pratoKey(k); return; }
      if (state === 'mini') { if (mm.phase === 'end') { if (mm.clock > 0.5) state = 'title'; } else if (k === 'a') miniSwat(); else if (k === 'b' && false) {} else if (k === 'select') state = 'title'; return; }
      if (state === 'title' && k === 'select') { seekStart(); return; }
      if (state === 'rest' && (k === 'a' || k === 'b')) { pet(); return; }
      if (state === 'photo' || state === 'album') { if (k === 'a' || k === 'b' || k === 'start') nextPhoto(); return; }
      if (state === 'title' && k === 'b' && unlocked().length) { albumIdx = 0; state = 'album'; return; }
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame();
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
      } else if (k === 'select' && state !== 'title') newGame();
      else if (k === 'a' && state === 'play') jumpBuf = 0.12;
    };
    const onPointer = e0 => {
      if (state === 'prato') { pratoPointer(e0); return; }
      const e = { type: e0.type, x: (e0.x - UIX) / UIS, y: (e0.y - UIY) / UIS };
      if (e.type !== 'down') return;
      if (state === 'seek') { seekPointer(e); return; }
      if (state === 'mini') { miniPointer(e); return; }
      if (state === 'title' && e.y >= 388 && e.y <= 416) { seekStart(); return; }
      if (state === 'title' && e.y > 416 && e.y <= 448) { miniStart('foil'); return; }
      if (state === 'title' && e.y > 448 && e.y <= 482) { miniStart('crickets'); return; }
      if (state === 'title' && e.y > 482 && e.y <= 514) { pratoStart(); return; }
      if (state === 'rest') { pet(); return; }
      if (state === 'photo' || state === 'album') { nextPhoto(); return; }
      if (state === 'title' && unlocked().length && e.y > 100 && e.y < 345) { albumIdx = 0; state = 'album'; return; }
      if (state === 'title' || state === 'over') newGame();
    };

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
      if (c.kind === 'stick') {
        g.save(); g.translate(x, y); g.rotate(-0.5 + Math.sin(time * 3 + x) * 0.1);
        g.fillStyle = '#d9843a'; g.beginPath(); g.roundRect(-11, -3, 22, 6, 3); g.fill();
        g.fillStyle = '#b3601f'; for (let k = -8; k < 10; k += 5) g.fillRect(k, -3, 1.4, 6);
        g.fillStyle = '#e8455f'; g.beginPath(); g.roundRect(7, -3, 4, 6, 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(-9, -2.4, 14, 1.2); g.restore(); return;
      }
      if (c.kind === 'tuna') {
        g.save(); g.translate(x, y + Math.sin(time * 5) * 1.5); g.scale(1.25, 1.25);
        g.fillStyle = '#cfd6e0'; g.beginPath(); g.ellipse(0, -7, 9, 3, 0, 0, 7); g.fill();
        const cg = g.createLinearGradient(-9, 0, 9, 0); cg.addColorStop(0, '#2f6fb3'); cg.addColorStop(.5, '#5aa0e0'); cg.addColorStop(1, '#2a5f9c');
        g.fillStyle = cg; g.fillRect(-9, -7, 18, 14); g.fillStyle = '#cfd6e0'; g.beginPath(); g.ellipse(0, 7, 9, 3, 0, 0, 7); g.fill();
        g.fillStyle = '#fff4e0'; g.beginPath(); g.ellipse(-0.5, 0, 4.5, 2.4, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(3.5, 0); g.lineTo(7, -2.4); g.lineTo(7, 2.4); g.closePath(); g.fill();
        g.fillStyle = '#e8455f'; g.fillRect(-9, -3.4, 18, 1.6);
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(-7, -6, 2, 12); g.restore();
        g.fillStyle = 'rgba(255,230,140,.9)'; for (let k = 0; k < 3; k++) { const a = time * 2 + k * 2.1; g.fillRect(x + Math.cos(a) * 16 - 1, y + Math.sin(a) * 12 - 1, 2, 2); }
        return;
      }
      g.save(); g.translate(x, y); g.rotate(Math.sin(time * 3 + x) * 0.15); g.scale(1.05, 1.05);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fill();
      g.strokeStyle = '#0d2a4a'; g.lineWidth = 1.6; g.lineJoin = 'round';
      const fg = g.createLinearGradient(0, -6, 0, 6); fg.addColorStop(0, '#3fd0ff'); fg.addColorStop(1, '#1670d0');
      g.fillStyle = fg; g.beginPath(); g.ellipse(-1, 0, 8, 5, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#ff5a3c'; g.beginPath(); g.moveTo(6, 0); g.lineTo(12, -5); g.lineTo(12, 5); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-1, 2, 5, 1.8, 0, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-5, -1, 2, 0, 7); g.fill();
      g.fillStyle = '#0d2a4a'; g.beginPath(); g.arc(-5.3, -1, 1, 0, 7); g.fill();
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
        if (near) { g.fillStyle = `rgba(255,236,160,${0.25 + pulse * 0.3})`; g.beginPath(); g.arc(x + 9, y - 34, 13, 0, 7); g.fill(); }
        // maniglia a leva (lato da cui arriva Margot)
        g.fillStyle = '#8a6a1c'; g.beginPath(); g.arc(x + 5, y - 34, 4.6, 0, 7); g.fill();
        g.strokeStyle = '#f2c94c'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 5, y - 34); g.lineTo(x + 17, y - 34); g.stroke();
        g.strokeStyle = '#fff3b0'; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 7, y - 35.2); g.lineTo(x + 16, y - 35.2); g.stroke();
        g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(x + 5, y - 34, 2.4, 0, 7); g.fill();
        if (near) { g.fillStyle = '#e8455f'; g.beginPath(); const ay = y - 56 + Math.sin(time * 7) * 3; g.moveTo(x + 5, ay + 8); g.lineTo(x + 0, ay); g.lineTo(x + 10, ay); g.closePath(); g.fill(); }
      } else {
        g.fillStyle = 'rgba(30,22,36,.55)'; g.fillRect(x, y - h, T, h);
        const k = Math.min(1, d.t * 4), wdt = T * (1 - k) * 0.9 + 4;
        g.fillStyle = '#b57a47'; g.fillRect(x, y - h, wdt, h); g.fillStyle = '#d6a06a'; g.fillRect(x, y - h, 2, h);
        g.strokeStyle = '#f2c94c'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 3, y - 34); g.lineTo(x + 3 + Math.min(12, wdt - 2), y - 34 + 7); g.stroke();
      }
    };

    const drawMemory = m => {
      const x = m.x, y = m.y + Math.sin(time * 3) * 2.5;
      g.fillStyle = 'rgba(255,230,160,.25)'; g.beginPath(); g.arc(x, y, 16 + Math.sin(time * 4) * 2, 0, 7); g.fill();
      g.fillStyle = '#8a5a2a'; g.fillRect(x - 11, y - 13, 22, 26); g.fillStyle = '#e3b66a'; g.fillRect(x - 10, y - 12, 20, 24);
      g.fillStyle = '#2a2236'; g.fillRect(x - 8, y - 10, 16, 20);
      const im = window.Art && Art.photo('face');
      if (im) { g.save(); g.beginPath(); g.rect(x - 8, y - 10, 16, 20); g.clip(); const sc = 20 / 640; g.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight, x - 10 - 2, y - 10, im.naturalWidth * sc * 1.1, im.naturalHeight * sc * 1.1); g.restore(); }
    };
    const drawHug = h => {
      const x = h.x, y = GR * T;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, y, 24, 3.4, 0, 0, 7); g.fill();
      g.fillStyle = h.used ? '#b99a7a' : '#d98a7a'; g.beginPath(); g.moveTo(x - 24, y); g.quadraticCurveTo(x - 27, y - 22, x - 12, y - 24); g.lineTo(x + 12, y - 24); g.quadraticCurveTo(x + 27, y - 22, x + 24, y); g.closePath(); g.fill();
      g.fillStyle = h.used ? '#cdb190' : '#f0a898'; g.beginPath(); g.ellipse(x, y - 11, 19, 8, 0, 0, 7); g.fill();
      g.strokeStyle = 'rgba(120,60,50,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 16, y - 12); g.quadraticCurveTo(x, y - 8, x + 16, y - 12); g.stroke();
      if (!h.used) { const hp = 1 + Math.sin(time * 4) * 0.12; g.save(); g.translate(x, y - 34); g.scale(hp, hp); g.fillStyle = '#e8455f'; g.beginPath(); g.moveTo(0, 4); g.bezierCurveTo(-8, -3, -4, -9, 0, -4); g.bezierCurveTo(4, -9, 8, -3, 0, 4); g.fill(); g.restore(); }
    };
    const drawBlanket = (b, cover) => {
      const x = b.x, y = GR * T, w = b.w, ch = chap();
      const bg = g.createLinearGradient(0, y - 28, 0, y); bg.addColorStop(0, ch.accent); bg.addColorStop(1, '#7a5a6a');
      g.fillStyle = bg; g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x - w / 2 + 2, y - 26, x - 6, y - 28); g.quadraticCurveTo(x + 6, y - 31, x + w / 2 - 6, y - 24); g.quadraticCurveTo(x + w / 2, y - 12, x + w / 2 + 2, y); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.lineWidth = 2; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 9 - 4, y - 2); g.quadraticCurveTo(x + i * 9, y - 18, x + i * 7, y - 26); g.stroke(); }
      if (cover) { g.fillStyle = '#241f19'; g.beginPath(); g.arc(x + 8, y - 12, 1.6, 0, 7); g.arc(x + 14, y - 12, 1.6, 0, 7); g.fill(); }
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
      if (state === 'prato') { drawPrato(); return; }
      if (state === 'seek' || state === 'title' || state === 'mini') { uiOn(); try { renderInner(); } finally { uiOff(); } } else renderInner();
    };
    const renderInner = () => {
      const ch = chap();
      if (state === 'seek') { drawSeek(); return; }
      if (state === 'mini') { drawMini(); return; }
      if (state === 'title') {
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f6ead6'); bg.addColorStop(1, '#e3c79a');
        g.fillStyle = bg; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,.35)'; for (let x = 0; x < W; x += 30) g.fillRect(x, 0, 12, H);
        g.fillStyle = '#9b6a40'; g.fillRect(0, H - 120, W, 120); g.fillStyle = '#b07c4d'; g.fillRect(0, H - 120, W, 8);
        if (!Art.drawPhoto(g, 'face', W / 2 - 104, 108, 208, -0.025)) Art.drawPortrait(g, W / 2 - 110, 120, 220, 'calm');
        text('MARGOT', W / 2, 36, 46, 'center', '#8a4a22'); text('ADVENTURES', W / 2, 84, 30, 'center', '#c97a4a');
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', W / 2, 366, 16, 'center', '#8a4a22');
        const btn = (y, label) => { g.fillStyle = '#8a4a22'; g.beginPath(); g.roundRect(W / 2 - 124, y, 248, 28, 14); g.fill(); text(label, W / 2, y + 6, 14, 'center', '#fff4e0'); };
        btn(388, 'TROVA MARGOT'); btn(420, 'PALLINA DI STAGNOLA'); btn(452, 'CACCIA AI GRILLI'); btn(484, 'IL PRATO DI MONTAGNA');
        text('RECORD ' + hi, W / 2, 518, 11, 'center', '#6d4a2f');
        if (unlocked().length) text('TOCCA LA FOTO: RICORDI ' + unlocked().length + '/' + PHOTOS.length, W / 2, 344, 11, 'center', '#8a4a22');
        text('IL GIOCO DI MARGOT', W / 2, 534, 13, 'center', '#fff4e0');
        text('MARGOT · MAGGHINA · MARGHY', W / 2, 551, 11, 'center', '#fff4e0');
        text('CURIOSA, FURBA E IMBATTIBILE CON LE PORTE', W / 2, 565, 9, 'center', '#f3dcc0');
        return;
      }
      g.fillStyle = ch.wall[0]; g.fillRect(0, 0, W, H);
      g.save(); g.scale(SC, SC);
      g.save(); g.translate(0, -Math.round(camY)); drawBackdrop(); g.restore();
      g.save(); g.translate(-Math.round(camX), -Math.round(camY));
      const c0 = Math.max(0, Math.floor(camX / T)), c1 = Math.min(cols - 1, c0 + Math.ceil(VW / T) + 1);
      // vuoti nel pavimento: un buco in cui si vede ancora la stanza che continua, con bordi a righe di pericolo
      for (let c = c0; c <= c1; c++) if (!grid[GR][c]) {
        const gx = c * T, y0 = GR * T - 9, hh = VH * T - y0;
        const vg = g.createLinearGradient(0, y0, 0, VH * T); vg.addColorStop(0, 'rgba(24,14,40,.28)'); vg.addColorStop(0.5, 'rgba(18,10,32,.62)'); vg.addColorStop(1, 'rgba(10,6,20,.9)');
        g.fillStyle = vg; g.fillRect(gx, y0, T, hh);
        const left = grid[GR][c - 1], right = grid[GR][c + 1];
        if (left) { const sg = g.createLinearGradient(gx, 0, gx + 7, 0); sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(gx, GR * T, 7, VH * T - GR * T); }
        if (right) { const sg = g.createLinearGradient(gx + T, 0, gx + T - 7, 0); sg.addColorStop(0, 'rgba(0,0,0,.55)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sg; g.fillRect(gx + T - 7, GR * T, 7, VH * T - GR * T); }
        g.fillStyle = (c % 2) ? '#f2c94c' : '#2a2236'; g.fillRect(gx, GR * T - 3, T, 3);
      }
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
      blankets.forEach(b => drawBlanket(b, false));
      hugs.forEach(drawHug);
      memories.forEach(m => { if (!m.got) drawMemory(m); });
      treats.forEach(c => { if (!c.got && c.x > camX - 20 && c.x < camX + VW + 20) drawTreat(c); });
      crickets.forEach(c => { if (!c.gone && c.x > camX - 20 && c.x < camX + VW + 20) drawCricket(c); });
      if (chaser.on) {
        const gl2 = g.createRadialGradient(chaser.x, GR * T - 14, 6, chaser.x, GR * T - 14, 46); gl2.addColorStop(0, 'rgba(232,69,95,.35)'); gl2.addColorStop(1, 'rgba(232,69,95,0)');
        g.fillStyle = gl2; g.fillRect(chaser.x - 50, GR * T - 62, 100, 70);
        g.save(); g.translate(chaser.x, GR * T); g.scale(1.7, 1.7); g.translate(-chaser.x, -GR * T);
        drawVacuum({ x: chaser.x, y: GR * T, t: chaser.t * 2, dead: 0 }); g.restore();
      }
      cats.forEach(k => { if (k.x > camX - 40 && k.x < camX + VW + 40) drawVacuum(k); });
      const pose = state === 'dead' ? 'fall' : !P.ground ? (P.vy < 0 ? 'jump' : 'fall') : Math.abs(P.vx) > 14 ? 'walk' : 'idle';
      g.fillStyle = 'rgba(0,0,0,.18)'; if (P.ground) { g.beginPath(); g.ellipse(P.x, P.y, 17, 3, 0, 0, 7); g.fill(); }
      if (!P.hidden) {
        const gl = g.createRadialGradient(P.x, P.y - 14, 4, P.x, P.y - 14, 34); gl.addColorStop(0, 'rgba(255,246,214,.75)'); gl.addColorStop(1, 'rgba(255,246,214,0)');
        g.fillStyle = gl; g.fillRect(P.x - 36, P.y - 50, 72, 72);
        g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(P.x, P.y, 15, 3.2, 0, 0, 7); g.fill();
      }
      if (!P.hidden) mg(P.x, P.y, 38, state === 'rest' ? 'idle' : pose, pose === 'walk' ? P.walk : time, P.face);
      if (P.hidden) blankets.forEach(b => { if (Math.abs(P.x - b.x) < b.w / 2) drawBlanket(b, true); });
      if (state === 'rest') {
        const scr = time - lastPet < 0.35, hx = P.x + P.face * 9 + Math.sin(time * 2.4) * (scr ? 2 : 6) + (scr ? Math.sin(time * 42) * 2.2 : 0), hy = P.y - 42 + Math.sin(time * 4.8) * 1.2 + (scr ? Math.sin(time * 38) * 1.4 : 0);
        g.save(); g.translate(hx, hy - 6); g.rotate(Math.sin(time * 2.4 + 1.2) * 0.08); g.scale(1.7, 1.7);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(4, -8, 22, 0, 7); g.fill(); g.lineJoin = 'round'; g.strokeStyle = '#5a3320'; g.lineWidth = 1.1;
        const skin = g.createLinearGradient(-10, -8, 10, 12); skin.addColorStop(0, '#f8d9bb'); skin.addColorStop(1, '#e4ac85');
        g.fillStyle = '#3f6fb0'; g.beginPath(); g.moveTo(8, -14); g.lineTo(34, -48); g.lineTo(48, -38); g.lineTo(20, -4); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#fff4e0'; g.beginPath(); g.moveTo(5, -12); g.lineTo(13, -22); g.lineTo(25, -13); g.lineTo(17, -3); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = skin; g.beginPath(); g.ellipse(0, -5, 10, 8, 0, 0, 7); g.fill(); g.stroke();
        [[-7, 9], [-2.5, 12], [2.5, 11], [7, 8]].forEach(([fx, fl]) => { g.beginPath(); g.roundRect(fx - 2.1, -3, 4.2, fl + 3, 2.1); g.fill(); g.stroke(); });
        g.beginPath(); g.ellipse(-11, -6, 5, 2.6, 0.7, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(150,90,60,.35)'; g.lineWidth = 0.7; for (const fx of [-4.7, 0, 4.7]) { g.beginPath(); g.moveTo(fx, 2); g.lineTo(fx, 10); g.stroke(); }
        g.restore();
        if (time - lastPet < 0.35) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2; for (let k = 0; k < 3; k++) { const a = time * 30 + k * 2; g.beginPath(); g.moveTo(hx - 10 + k * 7, hy + 6); g.lineTo(hx - 12 + k * 7 + Math.sin(a) * 3, hy + 12); g.stroke(); } }
        petFx.forEach(f => { g.globalAlpha = 1 - f.t; g.fillStyle = '#e8455f'; g.font = 'bold 14px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText('\u2665', f.x, f.y - f.t * 26); }); g.globalAlpha = 1; }
      if (state === 'rest') { g.fillStyle = '#e8455f'; for (let i = 0; i < 3; i++) { const t = (time * 0.8 + i / 3) % 1; g.globalAlpha = 1 - t; g.font = `bold ${9 + i * 2}px ui-monospace, monospace`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff4e0'; g.fillText('z', P.x + 8 + i * 5, P.y - 28 - t * 22); } g.globalAlpha = 1; }
      g.restore();
      g.restore();

      g.fillStyle = 'rgba(42,34,54,.78)'; g.fillRect(0, 0, W, 26);
      text('BOCCONCINI ' + got + '/' + need, 8, 6, 13, 'left', open ? '#9be88b' : '#fff4e0');
      text(String(score).padStart(5, '0'), W / 2 + 40, 6, 13, 'left', '#fff4e0');
      for (let i = 0; i < lives; i++) { g.fillStyle = '#e8745e'; g.beginPath(); g.arc(W - 14 - i * 18, 13, 6, 0, 7); g.fill(); }
      if (chaser.on && chaser.x < camX - 24 && state === 'play') {
        const a = 0.5 + 0.5 * Math.sin(time * 10); g.fillStyle = 'rgba(232,69,95,' + (0.5 + a * 0.5) + ')';
        g.beginPath(); g.moveTo(6, H * 0.5); g.lineTo(26, H * 0.5 - 14); g.lineTo(26, H * 0.5 + 14); g.closePath(); g.fill();
        text('ROBOT', 30, H * 0.5 - 6, 11, 'left', '#e8455f');
      }
      if (caught > 0) text('GRILLI ' + caught, 8, 30, 11, 'left', '#2a2236');
      if (coccole > 0) text('COCCOLE ' + coccole, 8, caught > 0 ? 44 : 30, 11, 'left', '#c0334d');
      if (msgT > 0) { g.fillStyle = 'rgba(42,34,54,.7)'; g.fillRect(W / 2 - 120, 36, 240, 26); text(msg, W / 2, 41, 14, 'center', '#ffe9b8'); }
      if (state === 'win') banner(['BRAVA MARGOT!', 'QUADRO ' + (level + 1)]);
      if (state === 'photo' || state === 'album') {
        uiOn();
        const idx = state === 'photo' ? photoShow : unlocked()[Math.min(albumIdx, unlocked().length - 1)], ph = PHOTOS[idx] || PHOTOS[0];
        g.fillStyle = 'rgba(20,14,26,.9)'; g.fillRect(0, 0, W, H);
        text(state === 'photo' ? 'UN RICORDO DI MARGOT' : 'RICORDI ' + (albumIdx + 1) + '/' + unlocked().length, W / 2, 30, 14, 'center', '#ffe9b8');
        const r = Art.drawPhoto(g, ph.n, W / 2 - 150, 62, 300, -0.02);
        const by = (r ? 62 + r.h : 300) + 22;
        text(ph.t[0], W / 2, by, 18, 'center', '#fff4e0'); text(ph.t[1], W / 2, by + 24, 18, 'center', '#fff4e0');
        text('TOCCA PER CONTINUARE', W / 2, H - 38, 12, 'center', '#c9b79a');
        uiOff();
      }
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
    };

    gen(1); resetPlayer();
    return {
      onPress: act,
      onRelease(k) { if (k === 'a' && P && P.vy < 0) P.cut = true; },
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; if (state === 'prato' && pr) pr.paused = true; },
      update,
      render,
      debug: { pratoStart, get pr() { return pr; }, newGame, get state() { return state; }, seekStart, get sk() { return sk; }, seekPick, get P() { return P; }, get cats() { return cats; }, miniStart, get mm() { return mm; }, miniSwat, get coccole() { return coccole; }, pet, get hugs2() { return hugs; }, get chaser() { return chaser; }, get treats() { return treats; }, get doors() { return doors; }, get memories() { return memories; }, get hugs() { return hugs; }, get blankets() { return blankets; }, get lives() { return lives; }, get hidden() { return P.hidden; }, get trees() { return trees; }, get crickets() { return crickets; }, get score() { return score; }, get grid() { return grid; }, get need() { return need; }, get cols() { return cols; } },
    };
  },
});

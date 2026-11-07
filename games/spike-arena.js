registerGame({
  id: 'spike-arena',
  title: 'SPIKE ARENA',
  color: '#d94a3a',
  blurb: 'Pallavolo vista di lato, tre contro tre. Ricevi, alza e schiaccia: tocca al momento giusto quando compare il cerchio sulla palla. Tocca in alto o in basso sul campo avversario per mirare la schiacciata; tocca quando schiaccia l\'avversario per saltare a muro. Si gioca a 15 punti, al meglio dei 3 set.',
  inputs: ['TOCCO A TEMPO', 'MIRA COL DITO'],
  size: [360, 640],
  bg: '#10131c',
  flexH: true,
  flexMin: 1.15,
  create(api) {
    const { cv, g } = api;
    const W = cv.width, H = cv.height;
    const FL = Math.round(H * 0.70), NETX = W / 2, NETH = 128, NETTOP = FL - NETH, GR = 900, BR = 9, TAU = Math.PI * 2;
    const HIT_X = 22, HIT_Y = FL - 186;            // punto di schiacciata (distanza dalla rete, altezza)
    const SET_X = 82, SET_Y = FL - 78;             // posizione dell'alzatore
    const TEAMS = [{ name: 'ITA', shirt: '#f2f4fb', shorts: '#2f5fd0', trim: '#2fa05a', hair: '#2a1a12', skin: '#e8b48c' }, { name: 'RIV', shirt: '#d8392f', shorts: '#f2f4fb', trim: '#2f4fd0', hair: '#e8c870', skin: '#f0c8a4' }];

    let hi = api.store.get('hi', 0);
    let state = 'title', time = 0, score = [0, 0], sets = [0, 0], setNo = 1, server = 0, level = 1, phase = 'serve', phaseT = 0, msg = '', msgT = 0;
    let ball, P, expect = null, tapT = -9, tapX = W * 0.75, tapY = FL, parts = [], texts = [], ring = null, rallyLen = 0, shake = 0, wins = 0, matchMsg = '', blockT = 0;
    let crowd = [];
    { let sd = 99; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }; const cols = ['#4a4f66', '#7a6a6a', '#586a8a', '#8a5a5a', '#6a7a6a', '#a8a8b8', '#3a3f56', '#b09a7a']; for (let row = 0; row < 7; row++) for (let i = 0; i < 26; i++) crowd.push({ x: i * 14 + (row % 2) * 7 + r() * 3, y: 100 + row * 22, c: cols[(r() * cols.length) | 0], s: 5 + r() * 1.5 }); }

    const arp = (notes, step, type, vol) => notes.forEach((f, i) => setTimeout(() => api.beep(f, step * 1.4, type || 'triangle', vol || 0.04), i * step * 1000));
    const say = (s, t) => { msg = s; msgT = t || 1.2; };
    const addText = (x, y, s, c) => texts.push({ x, y, s, c: c || '#ffe14a', t: 0.9 });
    const side = x => (x < NETX ? 0 : 1);
    const dirOf = t => (t === 0 ? 1 : -1);

    const mkTeam = t => [0, 1, 2].map(i => ({ team: t, role: i, hx: NETX + dirOf(t) * -1 * [HIT_X + 20, SET_X, 142][i], x: NETX - dirOf(t) * [HIT_X + 20, SET_X, 142][i], y: 0, vy: 0, act: 'ready', at: 0, face: dirOf(t), run: 0 }));
    const shoot = (b, tx, ty, apexY) => { const hup = Math.max(10, b.y - apexY), vy = -Math.sqrt(2 * GR * hup), tUp = -vy / GR, tDown = Math.sqrt(2 * Math.max(10, ty - apexY) / GR), T = tUp + tDown; b.vx = (tx - b.x) / T; b.vy = vy; };
    const drive = (b, tx, ty, v) => { const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy) || 1; b.vx = dx / d * v; b.vy = dy / d * v; b.line = true; };
    const ttcTo = (b, yT) => { const disc = b.vy * b.vy + 2 * GR * (yT - b.y); if (disc < 0 || b.vy < -9999) return 9; return Math.max(0, (-b.vy + Math.sqrt(disc)) / GR); };
    const landX = (b, yT) => { const t = ttcTo(b, yT); return b.x + b.vx * t; };

    const newMatch = () => { score = [0, 0]; sets = [0, 0]; setNo = 1; server = 0; P = [mkTeam(0), mkTeam(1)]; startServe(0); matchMsg = ''; };
    const startServe = s => {
      server = s; phase = 'serve'; phaseT = 0; expect = null; rallyLen = 0; ring = null;
      P = [mkTeam(0), mkTeam(1)];
      const sx = s === 0 ? 24 : W - 24; ball = { x: sx, y: FL - 70, vx: 0, vy: 0, last: s, touches: 0, line: false, held: true, live: false };
      P[s][2].x = sx; P[s][2].act = 'ready';
      say(s === 0 ? 'TOCCA PER BATTERE' : 'BATTUTA AVVERSARIA', 1.4);
    };
    const winSetCheck = () => { const a = score[0], b = score[1]; return (a >= 15 || b >= 15) && Math.abs(a - b) >= 2 || a >= 17 || b >= 17; };
    const pointTo = (t, why) => {
      if (phase === 'point') return;
      score[t]++; phase = 'point'; phaseT = 1.9; ball.live = false; expect = null; ring = null; shake = 0.25;
      say((t === 0 ? 'PUNTO ' : 'PUNTO ') + TEAMS[t].name + (why ? ' · ' + why : ''), 1.8);
      api.haptic(t === 0 ? 30 : 15); t === 0 ? arp([523, 659, 784, 1047], 0.07, 'triangle', 0.05) : arp([330, 262], 0.12, 'triangle', 0.04);
      server = t;
    };
    const afterPoint = () => {
      if (winSetCheck()) {
        const w = score[0] > score[1] ? 0 : 1; sets[w]++;
        if (sets[w] >= 2) { phase = 'matchEnd'; phaseT = 0; if (w === 0) { wins++; if (wins > hi) { hi = wins; api.store.set('hi', hi); } matchMsg = 'VITTORIA!'; arp([523, 659, 784, 1047, 784, 1047], 0.1, 'triangle', 0.05); } else matchMsg = 'SCONFITTA'; return; }
        setNo++; score = [0, 0]; say('SET ' + setNo, 1.5);
      }
      startServe(server);
    };

    // ---- tocchi ----
    const touchBall = (t, p, kind, q) => {
      ball.last = t; ball.touches++; ball.line = false; p.at = 0.35; p.act = kind;
      rallyLen++; api.beep(kind === 'spike' ? 180 : 260, kind === 'spike' ? 0.1 : 0.06, 'square', kind === 'spike' ? 0.06 : 0.04);
      if (kind === 'spike') { shake = 0.12; api.haptic(18); }
      for (let i = 0; i < 4; i++) parts.push({ x: ball.x, y: ball.y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, t: 0.3 });
    };
    const aiLevel = () => Math.min(5, level) - Math.max(0, 3 - level) * 0.25;
    const doReceive = (t, p, q) => {
      touchBall(t, p, 'dig', q); const d = dirOf(t);
      const err = (1 - q) * 70 * (Math.random() < 0.5 ? -1 : 1), tx = NETX - d * (SET_X + 6) + err * 0.6;
      if (q < 0.25 && Math.random() < 0.7) { shoot(ball, NETX + d * (30 + Math.random() * 120), FL - 60, FL - 260); say('PALLA SPORCA', 0.8); expect = { team: 1 - t, kind: 'receive' }; ball.touches = 0; return; }
      shoot(ball, tx, SET_Y, FL - 215); expect = { team: t, kind: 'set' };
      if (t === 0) addText(p.x, FL - 100, q > 0.9 ? 'PERFETTO!' : q > 0.6 ? 'BUONO' : 'ESTESO', q > 0.9 ? '#7dff9a' : '#ffe14a');
    };
    const doSet = (t, p) => { touchBall(t, p, 'set', 1); const d = dirOf(t); shoot(ball, NETX - d * HIT_X, HIT_Y + 4, HIT_Y - 70); expect = { team: t, kind: 'attack' }; };
    const doSpike = (t, p, q, aimX, aimY) => {
      touchBall(t, p, 'spike', q); const d = dirOf(t);
      let dist = t === 0 ? Math.max(58, Math.min(146, aimX - NETX)) : 58 + Math.random() * 88, targetX = NETX + d * dist;
      if (t === 0) { /* aimY: piu' basso = piu' forte */ }
      const hit = !(q < 0.22 && Math.random() < 0.6);
      if (!hit) { dist = 22; targetX = NETX + d * 22; }
      ball.y = Math.min(ball.y, HIT_Y + 6);
      drive(ball, targetX, FL, 520 + q * 120 + (t === 1 ? aiLevel() * 20 : 0)); ball.spikeBy = t; ball.spikeQ = q;
      expect = { team: 1 - t, kind: 'receive' }; ball.touches = 0;
      if (t === 0) addText(p.x, FL - 140, q > 0.88 ? 'SCHIACCIATA!' : q > 0.55 ? 'BUONA' : 'DEBOLE', q > 0.88 ? '#ff7a4a' : '#ffe14a');
      blockT = 0;
    };

    // ---- aggiornamento ----
    const move = (p, tx, sp, dt) => { const dx = tx - p.x; if (Math.abs(dx) > 2) { p.x += Math.sign(dx) * Math.min(Math.abs(dx), sp * dt); p.run += dt; p.face = Math.sign(dx) || p.face; } };
    const nearestTo = (t, x) => P[t].slice().sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt); shake = Math.max(0, shake - dt);
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; }); parts = parts.filter(p => p.t > 0);
      texts.forEach(t => { t.y -= 24 * dt; t.t -= dt; }); texts = texts.filter(t => t.t > 0);
      if (state !== 'play') return;
      if (P) for (const team of P) for (const p of team) { p.at = Math.max(0, p.at - dt); if (p.at <= 0 && p.act !== 'ready' && p.y <= 0) p.act = 'ready'; if (p.y > 0 || p.vy !== 0) { p.vy -= 1500 * dt; p.y += p.vy * dt; if (p.y <= 0) { p.y = 0; p.vy = 0; } } }
      blockT = Math.max(0, blockT - dt);
      if (phase === 'point') { phaseT -= dt; if (phaseT <= 0) afterPoint(); return; }
      if (phase === 'matchEnd') { phaseT += dt; return; }
      if (phase === 'serve') {
        const sv = P[server][2]; ball.x = sv.x; ball.y = FL - 78 - (sv.y);
        if (server === 1) { phaseT += dt; if (phaseT > 1.3) { aiServe(); } }
        return;
      }
      if (phase === 'toss') {
        ball.vy += GR * dt * 0.8; ball.y += ball.vy * dt; ball.x += ball.vx * dt; phaseT += dt;
        const sv = P[server][2]; sv.act = 'set'; sv.at = 0.2;
        if (server === 1 && ball.vy > -40) { aiHitServe(); }
        if (ball.y > FL - 40) { pointTo(1 - server, 'BATTUTA FALLITA'); }
        return;
      }
      // gioco
      ball.vy += (ball.line ? 0 : GR) * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      const prevX = ball.x - ball.vx * dt;
      // rete / palo
      if ((prevX < NETX) !== (ball.x < NETX) && ball.live) {
        if (ball.y > NETTOP - BR * 0.4 && !ball.netHit) {
          const bl = P[side(prevX) === 0 ? 1 : 0][0], handY = FL - bl.y - 98;
          if (ball.spikeBy !== undefined && ball.touches === 0 && bl.act === 'block' && Math.abs(ball.y - handY) < 34) {
            // muro
            const hitter = ball.spikeBy; ball.netHit = false; ball.line = false; bl.at = 0.4; rallyLen++; api.beep(140, 0.12, 'square', 0.06); shake = 0.2; api.haptic(30);
            addText(bl.x, FL - 150, 'MURO!', '#7dff9a'); const goDown = (bl.team === 0 ? Math.random() < 0.7 : Math.random() < 0.55 + aiLevel() * 0.05);
            ball.spikeBy = undefined; ball.last = bl.team; ball.x = NETX - dirOf(bl.team) * -1 * 0 + (bl.team === 0 ? NETX + 2 : NETX - 2);
            if (goDown) { ball.vx = dirOf(hitter) === 1 ? -90 : 90; ball.vx = hitter === 0 ? -80 : 80; ball.vy = 330; ball.line = false; ball.x = NETX + (hitter === 0 ? -6 : 6); ball.touches = 0; ball.last = bl.team; expect = null; }
            else { ball.vx = hitter === 0 ? 120 : -120; ball.vy = -260; ball.touches = 0; ball.x = NETX + (hitter === 0 ? 6 : -6); expect = { team: hitter, kind: 'receive' }; }
            ball.netHit = false;
          } else if (ball.y > NETTOP - BR * 0.4) {
            ball.netHit = true; ball.line = false; ball.vx *= -0.15; ball.vy = Math.abs(ball.vy) * 0.2; api.beep(120, 0.1, 'square', 0.05); addText(ball.x, NETTOP - 14, 'RETE', '#ff8a6a'); expect = null; ball.last = ball.last;
          }
        }
      }
      // gestione dei tocchi e delle uscite
      const t = expect ? expect.team : null;
      if (expect && ball.live) {
        const e = expect; const human = e.team === 0, d = dirOf(e.team), lvl = aiLevel();
        if (e.kind === 'receive') {
          const lx = landX(ball, FL - 52), want = Math.max(e.team === 0 ? 24 : NETX + 18, Math.min(e.team === 0 ? NETX - 18 : W - 24, lx));
          const rc = e.rc && e.rc.team === e.team ? (Math.abs(e.rc.x - want) < Math.abs(nearestTo(e.team, want).x - want) + 40 ? e.rc : nearestTo(e.team, want)) : nearestTo(e.team, want); e.rc = rc;
          move(rc, want, human ? 200 : 118 + lvl * 16, dt);
          const hand = { x: rc.x + rc.face * 10, y: FL - 52 - rc.y }, dist = Math.hypot(ball.x - hand.x, ball.y - hand.y), age = time - tapT;
          const dive = human && age < 0.55; const reach = 24 + (human ? Math.max(0, 3 - level) * 3 : 0) + (dive ? 36 : 0);
          ring = human && ball.vy > 0 ? { x: ball.x, y: ball.y, k: Math.max(0, Math.min(1, ttcTo(ball, FL - 52) / 0.9)), label: 'RICEVI' } : null;
          if (ball.vy > 0 && dist < reach && side(ball.x) === e.team) {
            if (human) { const q = age < 0.5 ? (age > 0.05 && age < 0.3 ? 1 : 0.8) : 0.62; if (dive && dist > 26) rc.act = 'dive'; doReceive(0, rc, q); }
            else { const q = Math.max(0, Math.min(1, 0.5 + lvl * 0.05 + Math.random() * 0.4 - (ball.spikeQ || 0.5) * 0.25)); doReceive(1, rc, q); }
          }
        } else if (e.kind === 'set') {
          const st = P[e.team][1], want = NETX - d * SET_X; move(st, want, human ? 190 : 150, dt); ring = null;
          if (Math.hypot(ball.x - st.x, ball.y - (FL - 70 - st.y)) < 30 && ball.vy > -80) doSet(e.team, st);
        } else if (e.kind === 'attack') {
          const sp = P[e.team][0]; move(sp, NETX - d * HIT_X, 220, dt);
          const near = Math.abs(ball.x - sp.x) < 60, want = Math.max(0, Math.min(70, FL - ball.y - 96));
          if (near && ball.vy > -120 && ball.y < HIT_Y + 70) { if (sp.y < want && sp.vy <= 0) sp.vy = 520; }
          const age = time - tapT, inZone = ball.y > HIT_Y - 50 && ball.y < HIT_Y + 52 && Math.abs(ball.x - (NETX - d * HIT_X)) < 52;
          ring = human && ball.vy > -200 ? { x: ball.x, y: ball.y, k: Math.max(0, Math.min(1, ttcTo(ball, HIT_Y) / 0.8)), label: 'SCHIACCIA' } : null;
          if (human) {
            if (inZone && age < 0.3) { const q = Math.max(0.1, 1 - Math.abs(ball.y - HIT_Y) / 52); sp.y = Math.max(sp.y, 40); doSpike(0, sp, q, tapX, tapY); }
            else if (ball.y > HIT_Y + 54 && ball.vy > 0) { sp.y = Math.max(sp.y, 20); doSpike(0, sp, 0.15, NETX + 60, FL); say('TARDI!', 0.8); }
          } else if (inZone && ball.vy > 0) { sp.y = Math.max(sp.y, 40); doSpike(1, sp, Math.max(0.2, Math.min(1, 0.28 + lvl * 0.07 + Math.random() * 0.4)), 0, 0); }
          // salto di muro dell'avversario sulla schiacciata umana
        }
        if (!human && expect && expect.kind === 'attack') {
          // prompt di muro per il giocatore
          ring = { x: ball.x, y: ball.y, k: Math.max(0, Math.min(1, ttcTo(ball, HIT_Y) / 0.8)), label: 'MURO', blk: true };
        }
        if (human && expect && expect.kind === 'attack') {
          // l'avversario puo' murare: salta quando sta per colpire
          const ab = P[1][0]; if (ab.act !== 'block' && ball.vy > 0 && ball.y > HIT_Y - 40 && Math.random() < dt * (1.2 + lvl * 0.5)) { ab.act = 'block'; ab.at = 0.55; ab.vy = 560; }
        }
      }
      if (ball.live && ball.last !== undefined && expect === null && ball.netHit) { /* palla caduta dopo la rete */ }
      // pavimento
      if (ball.y >= FL - BR) {
        ball.y = FL - BR; const landSide = side(ball.x), out = ball.x < 18 || ball.x > W - 18;
        if (ball.live) { api.beep(100, 0.12, 'square', 0.06); shake = 0.15;
          if (out) pointTo(1 - ball.last, 'FUORI'); else pointTo(1 - landSide, ''); }
        else { ball.vy = 0; ball.vx *= 0.5; }
      }
      if (ball.live && ball.touches > 3) pointTo(1 - ball.last, 'QUATTRO TOCCHI');
      if (ball.x < -20 || ball.x > W + 20) { if (ball.live) pointTo(1 - ball.last, 'FUORI'); }
      if (ring && (!expect || !ball.live)) ring = null;
    };

    // servizio
    const aiServe = () => { phase = 'toss'; ball.vy = -300; ball.vx = 0; phaseT = 0; ball.held = false; ball.live = false; };
    const aiHitServe = () => { phase = 'rally'; ball.live = true; ball.touches = 0; ball.last = 1; const tx = 30 + Math.random() * 110; ball.line = false; shoot(ball, tx, FL - 60, FL - 250); expect = { team: 0, kind: 'receive' }; rallyLen = 1; api.beep(300, 0.08, 'square', 0.05); };
    const humanServe = () => {
      if (phase === 'serve' && server === 0) { phase = 'toss'; ball.vy = -330; ball.vx = 0; phaseT = 0; ball.held = false; api.beep(500, 0.05, 'triangle', 0.04); }
      else if (phase === 'toss' && server === 0) {
        const q = Math.max(0, 1 - Math.abs(ball.vy) / 260), tx = Math.max(NETX + 36, Math.min(W - 30, tapX));
        ball.live = true; phase = 'rally'; ball.touches = 0; ball.last = 0; touchBall(0, P[0][2], 'spike', q); ball.touches = 0; rallyLen = 1;
        if (q < 0.15) { shoot(ball, NETX - 40, FL - 40, FL - 170); say('BATTUTA FALLITA', 1); expect = { team: 0, kind: 'receive' }; }
        else { shoot(ball, tx, FL - 60, FL - 255 + (1 - q) * 20); expect = { team: 1, kind: 'receive' }; }
        addText(P[0][2].x + 20, FL - 120, q > 0.8 ? 'BATTUTA PERFETTA!' : 'BATTUTA', q > 0.8 ? '#7dff9a' : '#ffe14a');
      }
    };
    const onTap = (x, y) => {
      tapT = time; tapX = x; tapY = y;
      if (state === 'title') { level = 1; wins = 0; newMatch(); state = 'play'; return; }
      if (state === 'over') { state = 'title'; return; }
      if (phase === 'matchEnd') { if (phaseT > 0.8) { if (matchMsg === 'VITTORIA!') { level++; newMatch(); } else state = 'title'; } return; }
      if (phase === 'serve' || phase === 'toss') { if (server === 0) humanServe(); return; }
      if (phase === 'rally' && expect && expect.team === 1 && expect.kind === 'attack') { const b = P[0][0]; if (b.act !== 'block') { b.act = 'block'; b.at = 0.6; b.vy = 560; } }
      else if (phase === 'rally' && expect && expect.team === 1 && expect.kind === 'set') { const b = P[0][0]; if (b.act !== 'block') { b.act = 'block'; b.at = 0.6; b.vy = 560; } }
    };
    const onPointer = e => { if (e.type === 'down') { if (state === 'pause') { state = 'play'; return; } onTap(e.x, e.y); } };
    const act = k => {
      if (k === 'start') { if (state === 'title') onTap(W / 2, FL); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'a' || k === 'b') onTap(NETX + 90, FL - 40);
      else if (k === 'select' && state !== 'title') { state = 'title'; }
    };

    // ---- disegno ----
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#eef1ff'; g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = '#eef1ff'; g.fillRect(x, y, w, h); g.fillStyle = '#12151f'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };
    const limb = (a, b, c, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.stroke(); };
    const drawPlayer = p => {
      const T = TEAMS[p.team], act = p.y > 6 && p.act === 'ready' ? 'jump' : p.act, run = p.run * 12;
      const s = Math.sin(run), moving = Math.abs(p.run - (p.lastRun || 0)) > 0; p.lastRun = p.run;
      g.save(); g.translate(p.x, FL - p.y); g.scale(p.face, 1);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, p.y + 1, 18 - Math.min(8, p.y / 6), 4, 0, 0, TAU); g.fill();
      let hip = [-2, -36], sh = [2, -62], hd = [5, -71], kF = [8, -18], fF = [4, 0], kB = [-6, -18], fB = [-8, 0], eF = [12, -50], hF = [20, -42], eB = [8, -52], hB = [18, -46];
      if (act === 'ready') { hip = [-6, -29]; sh = [3, -53]; hd = [8, -62]; kF = [10, -16]; fF = [6, 0]; kB = [2, -15]; fB = [-6, 0]; eF = [13, -38]; hF = [24, -33]; eB = [11, -37]; hB = [22, -30]; if (p.run > 0 && p.at <= 0 && moving) { fF = [4 + s * 9, Math.max(0, -s * 4)]; fB = [-6 - s * 9, Math.max(0, s * 4)]; } }
      else if (act === 'dig') { hip = [-10, -26]; sh = [4, -48]; hd = [10, -56]; kF = [10, -14]; fF = [8, 0]; kB = [0, -13]; fB = [-8, 0]; eF = [14, -32]; hF = [26, -20]; eB = [13, -31]; hB = [25, -19]; }
      else if (act === 'dive') { g.rotate(-1.15); hip = [-4, -22]; sh = [4, -44]; hd = [10, -52]; kF = [12, -14]; fF = [18, -2]; kB = [2, -14]; fB = [-8, -2]; eF = [16, -42]; hF = [30, -36]; eB = [15, -41]; hB = [29, -35]; }
      else if (act === 'set') { hip = [-3, -34]; sh = [1, -58]; hd = [4, -67]; kF = [6, -17]; fF = [4, 0]; kB = [-4, -17]; fB = [-6, 0]; eF = [8, -76]; hF = [12, -92]; eB = [4, -76]; hB = [8, -92]; }
      else if (act === 'jump') { hip = [-2, -34]; sh = [2, -60]; hd = [5, -69]; kF = [10, -22]; fF = [4, -8]; kB = [-4, -20]; fB = [-10, -10]; eF = [10, -78]; hF = [12, -96]; eB = [4, -76]; hB = [6, -94]; }
      else if (act === 'spike') { const sw = Math.min(1, (0.35 - p.at) / 0.2); hip = [-4, -34]; sh = [0, -60]; hd = [3, -69]; kF = [10, -22]; fF = [6, -8]; kB = [-6, -20]; fB = [-12, -10]; eB = [4 + sw * 6, -78 + sw * 4]; hB = [-8 + sw * 36, -94 + sw * 10]; eF = [12, -70]; hF = [20, -78]; }
      else if (act === 'block') { hip = [-2, -34]; sh = [3, -60]; hd = [6, -69]; kF = [8, -20]; fF = [4, -6]; kB = [-4, -18]; fB = [-8, -6]; eF = [10, -82]; hF = [13, -102]; eB = [6, -82]; hB = [9, -100]; }
      const shortC = T.shorts, legC = T.skin;
      limb([hip[0] - 2, hip[1]], kB, fB, 7, shade2(legC, 0.85)); limb(sh, eB, hB, 6, shade2(T.skin, 0.85));
      g.fillStyle = '#f2f2f2'; g.beginPath(); g.ellipse(fB[0] + 4, fB[1] - 2, 6, 3, 0, 0, TAU); g.fill();
      g.strokeStyle = T.shirt; g.lineWidth = 15; g.lineCap = 'round'; g.beginPath(); g.moveTo(hip[0], hip[1] - 4); g.lineTo(sh[0], sh[1] + 2); g.stroke();
      g.strokeStyle = T.trim; g.lineWidth = 3; g.beginPath(); g.moveTo(hip[0] - 7, hip[1] - 12); g.lineTo(sh[0] - 6, sh[1] + 8); g.stroke();
      g.strokeStyle = shortC; g.lineWidth = 15; g.beginPath(); g.moveTo(hip[0], hip[1] + 1); g.lineTo(hip[0] + 1, hip[1] - 7); g.stroke();
      limb([hip[0] + 2, hip[1]], kF, fF, 7.5, legC); g.fillStyle = '#f6f6f6'; g.beginPath(); g.ellipse(fF[0] + 4, fF[1] - 2, 6.5, 3.2, 0, 0, TAU); g.fill();
      limb([sh[0], sh[1] + 2], eF, hF, 6.5, T.skin); g.fillStyle = T.skin; g.beginPath(); g.arc(hF[0], hF[1], 3.4, 0, TAU); g.fill(); g.beginPath(); g.arc(hB[0], hB[1], 3.2, 0, TAU); g.fill();
      g.fillStyle = T.skin; g.beginPath(); g.arc(hd[0], hd[1], 8, 0, TAU); g.fill();
      g.fillStyle = T.hair; g.beginPath(); g.arc(hd[0] - 1, hd[1] - 2, 8.4, Math.PI * 0.95, Math.PI * 2.05); g.fill(); g.fillRect(hd[0] - 9, hd[1] - 3, 5, 6);
      g.fillStyle = '#222'; g.fillRect(hd[0] + 3, hd[1] - 1, 1.8, 1.8);
      g.fillStyle = T.shirt; g.font = 'bold 7px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = T.team === 0 ? '#1f3fa0' : '#fff'; g.fillText(String(p.role + 4), (hip[0] + sh[0]) / 2 - 1, (hip[1] + sh[1]) / 2);
      g.restore();
    };
    const shade2 = (hex, f) => { const n = parseInt(hex.slice(1), 16); return `rgb(${Math.max(0, ((n >> 16) & 255) * f) | 0},${Math.max(0, ((n >> 8) & 255) * f) | 0},${Math.max(0, (n & 255) * f) | 0})`; };
    TEAMS.forEach((t, i) => { t.team = i; });

    const drawBall = () => {
      if (!ball) return;
      g.fillStyle = 'rgba(0,0,0,.25)'; const sh = Math.max(0.4, 1 - (FL - ball.y) / 380); g.beginPath(); g.ellipse(ball.x, FL + 3, 9 * sh, 2.4 * sh, 0, 0, TAU); g.fill();
      g.save(); g.translate(ball.x, ball.y); g.rotate(time * (ball.vx > 0 ? 8 : -8));
      const bg = g.createRadialGradient(-3, -3, 1, 0, 0, BR + 1); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#c8ccda'); g.fillStyle = bg; g.beginPath(); g.arc(0, 0, BR, 0, TAU); g.fill();
      g.fillStyle = '#d8392f'; g.beginPath(); g.arc(0, 0, BR, -0.5, 0.9); g.lineTo(0, 0); g.fill(); g.fillStyle = '#2f5fd0'; g.beginPath(); g.arc(0, 0, BR, 2.6, 4.0); g.lineTo(0, 0); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, BR, 0, TAU); g.stroke(); g.restore();
    };
    const led = (s, x, y, size) => { g.font = `bold ${size}px ui-monospace, Menlo, monospace`; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = 'rgba(255,60,20,.25)'; g.fillText(s, x + 1, y + 1); g.fillStyle = '#ff5a2a'; g.fillText(s, x, y); };

    const render = () => {
      const t = time;
      g.fillStyle = '#10131c'; g.fillRect(0, 0, W, H);
      g.save(); if (shake > 0) g.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 4);
      // tribune
      const sg = g.createLinearGradient(0, 0, 0, FL - 130); sg.addColorStop(0, '#1a1c28'); sg.addColorStop(1, '#2c2f3e'); g.fillStyle = sg; g.fillRect(0, 0, W, FL - 130);
      g.fillStyle = 'rgba(255,255,255,.07)'; for (let i = 0; i < 6; i++) g.fillRect(0, 92 + i * 22, W, 1.5);
      for (const c of crowd) { if (c.y > FL - 150) continue; const bob = Math.sin(t * 3 + c.x) * (state === 'play' && phase === 'point' ? 3 : 0.6); g.fillStyle = c.c; g.beginPath(); g.arc(c.x, c.y + bob, c.s, 0, TAU); g.fill(); g.fillRect(c.x - c.s * 1.2, c.y + c.s + bob, c.s * 2.4, 7); }
      for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(255,250,220,.5)'; g.beginPath(); g.arc(20 + i * 30, 12, 4, 0, TAU); g.fill(); }
      // tabellone
      const bx = W / 2 - 112; g.fillStyle = '#0c0d12'; g.beginPath(); g.roundRect(bx, 20, 224, 78, 6); g.fill(); g.strokeStyle = '#3a3d4c'; g.lineWidth = 2; g.stroke();
      text(TEAMS[0].name, W / 2 - 62, 26, 13, 'center', '#c8d0a0'); text(TEAMS[1].name, W / 2 + 62, 26, 13, 'center', '#c8d0a0');
      led(String(score[0]).padStart(2, '0'), W / 2 - 62, 44, 34); led('-', W / 2, 44, 34); led(String(score[1]).padStart(2, '0'), W / 2 + 62, 44, 34);
      if (state === 'play') { g.fillStyle = '#ff5a2a'; g.fillRect(W / 2 + (server === 0 ? -86 : 38), 86, 48, 3); text('SET ' + setNo + '  ' + sets[0] + '-' + sets[1], W / 2, 78, 9, 'center', '#c8d0a0'); }
      // cartelloni
      const ag = g.createLinearGradient(0, FL - 130, 0, FL - 88); ag.addColorStop(0, '#6a5a3a'); ag.addColorStop(1, '#4a3c24'); g.fillStyle = ag; g.fillRect(0, FL - 132, W, 46);
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(0, FL - 132, W, 2);
      [['SPIKE ARENA', 20, '#d8d0b0'], ['ITALIA', 138, '#e8c860'], ['ARCADE', 250, '#d8d0b0']].forEach(([s, x, c]) => { g.fillStyle = 'rgba(20,16,10,.35)'; g.fillRect(x - 8, FL - 124, 96, 30); text(s, x + 40, FL - 116, 12, 'center', c); });
      // folla davanti
      for (const c of crowd) { if (c.y <= FL - 150) continue; }
      const fg = g.createLinearGradient(0, FL - 88, 0, FL); fg.addColorStop(0, '#2c4a38'); fg.addColorStop(1, '#1e3a2c'); g.fillStyle = fg; g.fillRect(0, FL - 88, W, 88);
      for (let i = 0; i < 18; i++) { const cx = 10 + i * 20 + (i % 2) * 6, cy = FL - 70 + (i % 3) * 10; g.fillStyle = ['#c8d0e0', '#d8a0a0', '#a0b8d8', '#e0d0a0'][i % 4]; g.beginPath(); g.arc(cx, cy, 6, 0, TAU); g.fill(); g.fillStyle = ['#3a4a6a', '#6a3a3a', '#3a6a4a'][i % 3]; g.fillRect(cx - 8, cy + 6, 16, 14); }
      // campo
      const cg = g.createLinearGradient(0, FL, 0, H); cg.addColorStop(0, '#2f8a5a'); cg.addColorStop(0.2, '#206a46'); cg.addColorStop(1, '#10241a'); g.fillStyle = cg; g.fillRect(0, FL, W, H - FL);
      g.fillStyle = '#eef6f0'; g.fillRect(0, FL - 1, W, 3); g.fillRect(14, FL, 3, 16); g.fillRect(W - 17, FL, 3, 16); g.fillRect(NETX - 1, FL, 3, 10); g.fillRect(NETX - 104, FL, 2, 8); g.fillRect(NETX + 102, FL, 2, 8);
      for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(255,255,255,${0.05 - i * 0.007})`; g.fillRect(0, FL + 18 + i * 14, W, 2); }
      // giocatori e palla
      if (P) { const all = [...P[0], ...P[1]].sort((a, b) => a.x - b.x); all.forEach(drawPlayer); }
      // palo e rete
      const pg = g.createLinearGradient(NETX - 5, 0, NETX + 5, 0); pg.addColorStop(0, '#141a38'); pg.addColorStop(0.45, '#4a5a9a'); pg.addColorStop(1, '#0c1028');
      g.fillStyle = pg; g.fillRect(NETX - 4, NETTOP - 2, 8, NETH + 2); g.fillStyle = '#f2f4fb'; g.fillRect(NETX - 5, NETTOP - 4, 10, 8);
      g.fillStyle = '#e5413b'; g.fillRect(NETX - 1, NETTOP - 28, 2, 26); g.fillStyle = '#fff'; g.fillRect(NETX - 1, NETTOP - 20, 2, 5);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(NETX - 3, NETTOP, 1.5, NETH);
      drawBall();
      parts.forEach(p => { g.globalAlpha = Math.min(1, p.t * 3); g.fillStyle = '#fff'; g.fillRect(p.x - 1, p.y - 1, 3, 3); }); g.globalAlpha = 1;
      if (ring && state === 'play') { const r = 10 + ring.k * 46; g.strokeStyle = ring.blk ? '#6ad0ff' : ring.k < 0.3 ? '#7dff9a' : '#ffe14a'; g.lineWidth = 3; g.beginPath(); g.arc(ring.x, ring.y, r, 0, TAU); g.stroke(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.5; g.beginPath(); g.arc(ring.x, ring.y, 11, 0, TAU); g.stroke(); if (ring.k < 0.4) text(ring.label + '!', ring.x, ring.y - r - 14, 11, 'center', '#ffffff'); }
      texts.forEach(tt => text(tt.s, tt.x, tt.y, 12, 'center', tt.c));
      g.restore();
      // aiuti in basso
      if (state === 'play') {
        let hint = '';
        if (phase === 'serve' && server === 0) hint = 'TOCCA PER LANCIARE LA PALLA · POI TOCCA A TEMPO NEL PUNTO ALTO'; else if (phase === 'toss' && server === 0) hint = 'ORA! TOCCA PER BATTERE (DOVE TOCCHI MIRI)';
        else if (expect && expect.team === 0 && expect.kind === 'receive') hint = 'TOCCA UN PO\' PRIMA CHE ARRIVI PER RICEVERE O TUFFARTI';
        else if (expect && expect.team === 0 && expect.kind === 'attack') hint = 'TOCCA QUANDO IL CERCHIO SI CHIUDE · MIRA: DOVE TOCCHI';
        else if (expect && expect.team === 1 && (expect.kind === 'attack' || expect.kind === 'set')) hint = 'TOCCA PER SALTARE A MURO!';
        if (hint) text(hint, W / 2, FL + 60, 9, 'center', '#cfe8d8');
        text('SET ' + setNo + ' · PARTITA ' + level + ' · VITTORIE ' + wins, W / 2, H - 22, 10, 'center', '#9ab8a8');
        if (msgT > 0) text(msg, W / 2, FL + 22, 16, 'center', '#ffe14a');
      }
      if (state === 'title') {
        g.fillStyle = 'rgba(8,10,16,.6)'; g.fillRect(0, FL + 20, W, H - FL - 20);
        text('SPIKE', W / 2, FL + 36, 36, 'center', '#ff7a4a'); text('ARENA', W / 2, FL + 76, 36, 'center');
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER GIOCARE', W / 2, FL + 128, 15, 'center', '#ffe14a');
        text('RECORD VITTORIE ' + hi, W / 2, FL + 156, 11, 'center', '#9ab8a8');
        if (!P) P = [mkTeam(0), mkTeam(1)];
      }
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'play' && phase === 'matchEnd') banner([matchMsg, sets[0] + ' - ' + sets[1], matchMsg === 'VITTORIA!' ? 'TOCCA: PROSSIMA' : 'TOCCA']);
    };

    P = [mkTeam(0), mkTeam(1)]; ball = { x: W / 2, y: FL - 120, vx: 0, vy: 0, last: 0, touches: 0, live: false };
    return {
      onPress: act, onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update, render,
      debug: { newGame() { level = 1; wins = 0; newMatch(); state = 'play'; }, onTap, get state() { return state; }, get phase() { return phase; }, get score() { return score; }, get sets() { return sets; }, get ball() { return ball; }, get expect() { return expect; }, get P() { return P; }, get rally() { return rallyLen; } },
    };
  },
});

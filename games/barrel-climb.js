registerGame({
  id: 'barrel-climb',
  title: 'BARREL CLIMB',
  color: '#e5413b',
  blurb: 'Scala le travi, salta i barili del gorilla e raggiungi la principessa. Due pollici: croce per muoversi, A per saltare.',
  inputs: ['D-PAD', 'MULTI-TOCCO', 'SALTO'],
  size: [480, 768],
  create(api) {
    // Il gioco lavora in un mondo logico di 240x288; il canvas lo ingrandisce di 2.
    const { cv, g, held } = api;
    const W = 240, H = 384, S = 2;
    const PAL = ['#141a2e', '#1f2744', '#5a6aa0', '#eef1ff'];

    // Travi: da y sinistra a y destra. Il barile scende verso il lato più basso.
    const GIRDERS = [
      { x0: 0,   x1: 240, yL: 372, yR: 364 },
      { x0: 0,   x1: 224, yL: 316, yR: 324 },
      { x0: 16,  x1: 240, yL: 262, yR: 254 },
      { x0: 0,   x1: 224, yL: 204, yR: 212 },
      { x0: 16,  x1: 240, yL: 150, yR: 142 },
      { x0: 0,   x1: 224, yL: 94,  yR: 102 },
      { x0: 120, x1: 200, yL: 52,  yR: 52 },
    ];
    const GOAL = 6;
    const gy = (k, x) => {
      const G = GIRDERS[k];
      return G.yL + (G.yR - G.yL) * ((x - G.x0) / (G.x1 - G.x0));
    };
    const dirOf = k => Math.sign(GIRDERS[k].yR - GIRDERS[k].yL);

    const LADDERS = [
      [1, 0, 190], [1, 0, 40], [2, 1, 70], [2, 1, 170], [3, 2, 40], [3, 2, 180],
      [4, 3, 200], [4, 3, 60], [5, 4, 140], [6, 5, 160],
    ].map(([up, lo, x]) => ({ up, lo, x, top: gy(up, x), bot: gy(lo, x) }));

    const WALK = 52, CLIMB = 55, JUMP = -165, GRAV = 620;

    let hi = api.store.get('hi', 0);
    let state = 'title', score = 0, lives = 3, level = 1, bonus = 2000;
    let P, barrels = [], throwT = 1.5, stateT = 0, popups = [];

    const startPos = () => ({ x: 20, y: gy(0, 20), lv: 0, vx: 0, vy: 0, air: false, ladder: null, face: 1, walk: 0, jumpBuf: 0 });
    const resetLevel = () => {
      P = startPos(); barrels = []; popups = [];
      bonus = 2000; throwT = 1.5;
    };
    const newGame = () => { score = 0; lives = 3; level = 1; resetLevel(); state = 'play'; };
    const endGame = () => {
      state = 'over';
      if (score > hi) { hi = score; api.store.set('hi', hi); }
    };

    const spawnEvery = () => Math.max(0.9, 2.4 - level * 0.2);
    const barrelSpeed = () => Math.min(110, 55 + level * 6);

    const kill = () => {
      if (state !== 'play') return;
      state = 'dead'; stateT = 1.3; lives--; api.haptic(40); api.beep(140, 0.35, 'sawtooth', 0.06);
    };
    const win = () => {
      state = 'win'; stateT = 2; api.haptic(30);
      [660, 880, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.12), i * 110));
      const gain = Math.round(bonus) + 500;
      score += gain;
      popups.push({ x: P.x, y: P.y - 16, t: 1.5, s: '+' + gain });
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame();
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
      } else if (k === 'select') {
        if (state !== 'title') newGame();
      } else if ((k === 'a' || k === 'b') && state === 'play') {
        P.jumpBuf = 0.12;
      }
    };

    // Un tocco sullo schermo avvia o mette in pausa.
    let tap = null;
    const onPointer = e => {
      if (e.type === 'down') tap = { x: e.x, y: e.y, t: e.t };
      else if (e.type === 'up' && tap) {
        const ok = !e.cancelled && Math.hypot(e.x - tap.x, e.y - tap.y) < 16 && e.t - tap.t < 400;
        tap = null;
        if (ok && state !== 'dead' && state !== 'win') act('start');
      }
    };

    // Logica
    const land = k => {
      P.lv = k; P.ladder = null; P.air = false; P.vy = 0;
      if (k === GOAL) win();
    };
    const findLadder = goingUp => {
      for (const l of LADDERS) {
        if (Math.abs(P.x - l.x) > 6) continue;
        if (goingUp && P.lv === l.lo) return l;
        if (!goingUp && P.lv === l.up) return l;
      }
      return null;
    };

    const movePlayer = dt => {
      const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const dyIn = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      P.jumpBuf = Math.max(0, P.jumpBuf - dt);

      if (P.ladder) {
        const l = P.ladder;
        P.y += dyIn * CLIMB * dt;
        if (dyIn) P.walk += dt * 8;
        if (P.y <= l.top) { P.y = l.top; land(l.up); }
        else if (P.y >= l.bot) { P.y = l.bot; land(l.lo); }
        else if (dx) {
          // Si scende dalla scala solo dove incrocia una trave.
          for (let k = 0; k < GIRDERS.length; k++) {
            const G = GIRDERS[k];
            if (P.x >= G.x0 + 2 && P.x <= G.x1 - 2 && Math.abs(P.y - gy(k, P.x)) <= 2) {
              P.y = gy(k, P.x); P.face = dx; land(k); break;
            }
          }
        }
        return;
      }

      const G = GIRDERS[P.lv];
      if (!P.air) {
        if (dx) { P.face = dx; P.x += dx * WALK * dt; P.walk += dt * 10; }
        P.x = Math.max(G.x0 + 3, Math.min(G.x1 - 3, P.x));
        P.y = gy(P.lv, P.x);
        if (dyIn) {
          const l = findLadder(dyIn < 0);
          if (l) { P.ladder = l; P.x = l.x; return; }
        }
        if (P.jumpBuf > 0) { P.air = true; P.vy = JUMP; P.vx = dx * WALK; P.jumpBuf = 0; api.haptic(6); api.beep(520, 0.06); }
      } else {
        P.vy += GRAV * dt;
        P.y += P.vy * dt;
        P.x = Math.max(G.x0 + 3, Math.min(G.x1 - 3, P.x + P.vx * dt));
        const sy = gy(P.lv, P.x);
        if (P.vy > 0 && P.y >= sy) { P.y = sy; P.air = false; P.vy = 0; }
      }
    };

    const moveBarrels = dt => {
      const sp = barrelSpeed();
      for (const b of barrels) {
        if (b.st === 'roll') {
          b.x += b.dir * sp * dt; b.y = gy(b.lv, b.x); b.rot += b.dir * dt * 12;
          for (const l of LADDERS) {
            if (l.up === b.lv && !b.seen[l.x] && Math.abs(b.x - l.x) < 2) {
              b.seen[l.x] = 1;
              if (Math.random() < 0.3) { b.st = 'lad'; b.ladder = l; b.x = l.x; }
            }
          }
          const G = GIRDERS[b.lv];
          if ((b.dir > 0 && b.x >= G.x1) || (b.dir < 0 && b.x <= G.x0)) {
            if (b.lv === 0) b.dead = true;
            else { b.st = 'fall'; b.vy = 0; b.vx = b.dir * 25; }
          }
        } else if (b.st === 'lad') {
          b.y += 60 * dt;
          if (b.y >= b.ladder.bot) { b.y = b.ladder.bot; b.lv = b.ladder.lo; b.st = 'roll'; b.dir = dirOf(b.lv); b.seen = {}; }
        } else {
          b.vy += GRAV * dt; b.y += b.vy * dt; b.x += b.vx * dt; b.rot += b.dir * dt * 12;
          const lower = b.lv - 1, sy = gy(lower, b.x);
          if (b.y >= sy) { b.lv = lower; b.y = sy; b.st = 'roll'; b.dir = dirOf(lower); b.seen = {}; }
        }
      }
      barrels = barrels.filter(b => !b.dead);
    };

    const hitTest = () => {
      for (const b of barrels) {
        const ddx = Math.abs(b.x - P.x);
        if (P.air && !b.scored && b.st === 'roll' && ddx < 9 && P.y < b.y - 9) {
          b.scored = true; score += 100; api.beep(880, 0.05); api.haptic(8);
          popups.push({ x: P.x, y: P.y - 14, t: 0.8, s: '100' });
        }
        if (ddx < 5.5 && Math.abs((b.y - 4) - (P.y - 6)) < 8) { kill(); return; }
      }
    };

    const update = dt => {
      if (state === 'play') {
        bonus = Math.max(0, bonus - 100 * dt);
        if (bonus <= 0) { kill(); return; }
        movePlayer(dt);
        if (state !== 'play') return;
        throwT -= dt;
        if (throwT <= 0) {
          barrels.push({ x: 48, y: gy(5, 48), lv: 5, dir: dirOf(5), vx: 0, vy: 0, st: 'roll', scored: false, seen: {}, rot: 0 });
          throwT = spawnEvery();
        }
        moveBarrels(dt);
        hitTest();
      } else if (state === 'dead') {
        stateT -= dt;
        if (stateT <= 0) { if (lives <= 0) endGame(); else { resetLevel(); state = 'play'; } }
      } else if (state === 'win') {
        stateT -= dt;
        if (stateT <= 0) { level++; resetLevel(); state = 'play'; }
      }
      popups.forEach(p => { p.t -= dt; p.y -= 12 * dt; });
      popups = popups.filter(p => p.t > 0);
    };

    // Disegno
    const rect = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || PAL[3];
      g.fillText(s, x, y);
    };

    const drawGirder = G => {
      g.fillStyle = '#d6453b';
      g.beginPath(); g.moveTo(G.x0, G.yL); g.lineTo(G.x1, G.yR); g.lineTo(G.x1, G.yR + 5); g.lineTo(G.x0, G.yL + 5); g.fill();
      g.strokeStyle = '#ff9a86'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(G.x0, G.yL + .5); g.lineTo(G.x1, G.yR + .5); g.stroke();
      for (let x = G.x0 + 6; x < G.x1 - 2; x += 12) {
        const y = G.yL + (G.yR - G.yL) * ((x - G.x0) / (G.x1 - G.x0));
        rect(x, y + 2.5, 2, 2, '#7a1d1a');
      }
    };
    const drawLadder = l => {
      g.fillStyle = '#25c4f0';
      g.fillRect(l.x - 3, l.top, 1, l.bot - l.top);
      g.fillRect(l.x + 3, l.top, 1, l.bot - l.top);
      for (let y = l.top + 3; y < l.bot; y += 4) g.fillRect(l.x - 3, Math.round(y), 7, 1);
    };

    const drawPlayer = () => {
      const x = Math.round(P.x), y = Math.round(P.y), f = P.face;
      const step = (Math.floor(P.walk) % 2) === 0;
      rect(x - 3, y - 13, 6, 2, '#e5413b');
      rect(f > 0 ? x : x - 4, y - 12, 4, 1, '#e5413b');
      rect(x - 2, y - 11, 5, 3, '#f2c79a');
      rect(f > 0 ? x + 1 : x - 1, y - 10, 1, 1, '#141a2e');
      rect(x - 3, y - 8, 6, 3, '#e5413b');
      rect(x - 3, y - 5, 6, 3, '#3d5fe0');
      if (P.ladder) {
        rect(step ? x - 5 : x + 3, y - 10, 2, 3, '#f2c79a');
        rect(step ? x + 3 : x - 5, y - 8, 2, 3, '#f2c79a');
        rect(x - 3, y - 2, 2, 2, '#7a3b14'); rect(x + 1, y - 2, 2, 2, '#7a3b14');
      } else if (P.air) {
        rect(x - 5, y - 2, 3, 2, '#7a3b14'); rect(x + 2, y - 3, 3, 2, '#7a3b14');
        rect(f > 0 ? x + 3 : x - 5, y - 9, 2, 3, '#f2c79a');
      } else {
        rect(step ? x - 3 : x - 4, y - 2, 3, 2, '#7a3b14');
        rect(step ? x + 1 : x + 2, y - 2, 3, 2, '#7a3b14');
      }
    };

    const drawGorilla = () => {
      const x = 28, y = Math.round(gy(5, 28)), arms = throwT < 0.4;
      rect(x - 11, y - 18, 22, 18, '#8a4b1f');
      rect(x - 7, y - 14, 14, 10, '#c98a52');
      rect(x - 6, y - 28, 12, 11, '#8a4b1f');
      rect(x - 4, y - 24, 8, 6, '#c98a52');
      rect(x - 3, y - 23, 2, 2, '#fff'); rect(x + 1, y - 23, 2, 2, '#fff');
      rect(x - 3, y - 22, 1, 1, '#141a2e'); rect(x + 2, y - 22, 1, 1, '#141a2e');
      if (arms) { rect(x - 15, y - 30, 4, 14, '#8a4b1f'); rect(x + 11, y - 30, 4, 14, '#8a4b1f'); }
      else { rect(x - 15, y - 18, 4, 16, '#8a4b1f'); rect(x + 11, y - 18, 4, 16, '#8a4b1f'); }
      rect(x - 10, y - 2, 7, 2, '#6b3a17'); rect(x + 3, y - 2, 7, 2, '#6b3a17');
    };
    const drawPrincess = () => {
      const x = 160, y = GIRDERS[GOAL].yL;
      rect(x - 3, y - 8, 6, 8, '#ff7ab8');
      rect(x - 2, y - 12, 4, 4, '#f2c79a');
      rect(x - 3, y - 14, 6, 3, '#f5d31c');
      if (((performance.now() / 400) | 0) % 2 === 0) text('♥', x + 5, y - 16, 8, 'left', '#e5413b');
    };

    const drawBarrel = b => {
      g.fillStyle = '#b5651d';
      g.beginPath(); g.arc(b.x, b.y - 4, 4, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(b.x, b.y - 4); g.rotate(b.rot);
      g.fillStyle = '#5a2f0a'; g.fillRect(-4, -.5, 8, 1); g.fillRect(-.5, -4, 1, 8);
      g.restore();
    };

    const banner = rows => {
      const h = rows.length * 12 + 8, y = (H - h) / 2, x = 20, w = W - 40;
      g.fillStyle = PAL[3]; g.fillRect(x, y, w, h);
      g.fillStyle = PAL[0]; g.fillRect(x + 1, y + 1, w - 2, h - 2);
      rows.forEach((t, i) => text(t, W / 2, y + 6 + i * 12, 9, 'center'));
    };

    const render = () => {
      g.setTransform(S, 0, 0, S, 0, 0);
      g.fillStyle = PAL[0]; g.fillRect(0, 0, W, H);

      if (state === 'title') {
        text('BARREL', W / 2, 52, 26, 'center');
        text('CLIMB', W / 2, 82, 26, 'center');
        g.fillStyle = PAL[3]; g.fillRect(W / 2 - 50, 118, 100, 1);
        if (((performance.now() / 500) | 0) % 2 === 0) text('PREMI START', W / 2, 150, 10, 'center');
        text('HI ' + hi, W / 2, 176, 8, 'center');
        text('A/B SALTA  ▲▼ SCALA', W / 2, 200, 6, 'center');
        text('ARRIVA IN CIMA', W / 2, 214, 6, 'center');
        return;
      }

      GIRDERS.forEach(drawGirder);
      LADDERS.forEach(drawLadder);
      drawPrincess();
      drawGorilla();
      barrels.forEach(drawBarrel);
      if (!(state === 'dead' && ((stateT * 8) | 0) % 2 === 0)) drawPlayer();

      text('SCORE ' + String(score).padStart(6, '0'), 3, 2, 7);
      text('BONUS ' + String(Math.round(bonus)).padStart(4, '0'), 88, 2, 7);
      text('L' + level, 160, 2, 7);
      for (let i = 0; i < lives; i++) rect(180 + i * 8, 3, 6, 6, '#e5413b');
      popups.forEach(p => text(p.s, p.x, p.y, 7, 'center', '#f5d31c'));

      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'START']);
      if (state === 'win') banner(['BRAVO!', 'LIVELLO ' + (level + 1)]);
    };

    return {
      onPress: act,
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update,
      render,
      // Aggancio per le prove automatiche.
      debug: { get state() { return state; }, get P() { return P; }, get barrels() { return barrels; }, GIRDERS, LADDERS },
    };
  },
});

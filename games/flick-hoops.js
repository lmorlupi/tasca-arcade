registerGame({
  id: 'flick-hoops',
  title: 'FLICK HOOPS',
  color: '#f58a25',
  blurb: "Scatta col dito e fai canestro prima che finisca il tempo.",
  inputs: ['FLICK', 'TOCCO DIRETTO'],
  size: [360, 620],
  bg: '#141a2e',
  flexH: true,
  create(api) {
    const { cv, g } = api;
    const W = cv.width, H = cv.height;
    const GRAV = 1400, BR = 20, HOOP_HALF = 40, RIM_R = 4;
    const PAL = ['#141a2e', '#1f2744', '#5a6aa0', '#eef1ff'];
    const START = { x: W / 2, y: H - 70 };
    const HY = START.y - 340;

    let hi = api.store.get('hi', 0);
    let state = 'ready', score = 0, timeLeft = 50, streak = 0, best = 0, fire = false, shakeT = 0, bankHit = false, lastSlot = 1, parts = [];
    let ball, hoop, shotT = 0, netWobble = 0, msg = '', msgT = 0, rimHit = false, scored = false;
    let drag = null, trail = [];

    const resetHoop = () => { hoop = { x: W / 2, y: HY, base: W / 2, amp: 0, t: 0 }; };
    const newBall = () => {
      let slot = (Math.random() * 3) | 0; if (slot === lastSlot && Math.random() < 0.7) slot = (slot + 1 + ((Math.random() * 2) | 0)) % 3; lastSlot = slot;
      START.x = [W * 0.2, W * 0.5, W * 0.8][slot];
      ball = { x: START.x, y: START.y, vx: 0, vy: 0, fly: false, pop: 0 }; rimHit = false; scored = false; bankHit = false;
    };
    const newGame = () => { score = 0; timeLeft = 50; streak = 0; best = 0; fire = false; parts = []; resetHoop(); newBall(); state = 'ready'; };
    const flash = s => { msg = s; msgT = 0.9; };

    const endGame = () => {
      state = 'over';
      if (score > hi) { hi = score; api.store.set('hi', hi); }
      api.haptic(40);
    };

    // Lancio: piccolo aiuto sull'asse orizzontale, così lo scatto non deve essere perfetto.
    const aim = (vx, vy) => {
      const dy = START.y - hoop.y;
      const disc = vy * vy - 2 * GRAV * dy;
      if (disc > 0) { const t = (-vy + Math.sqrt(disc)) / GRAV, assist = score < 8 ? 0.46 : 0.4; vx = vx * (1 - assist) + ((hoop.x - START.x) / t) * assist; }
      return vx;
    };
    const flickVel = (last) => {
      const old = trail.find(p => last.t - p.t < 110) || trail[0];
      const dt = Math.max(16, last.t - old.t) / 1000, k = 0.62;
      return [((last.x - old.x) / dt) * k, ((last.y - old.y) / dt) * k];
    };
    const launch = (vx, vy) => {
      if (vy > -380) return false;
      vx = aim(vx, vy);
      ball.vx = vx; ball.vy = vy; ball.fly = true; shotT = 0; rimHit = false; scored = false;
      if (state === 'ready') state = 'play';
      api.haptic(8); api.beep(300, 0.05, 'triangle', 0.05);
      return true;
    };

    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'over') { newGame(); return; }
        if (state !== 'ready' && state !== 'play') return;
        if (!ball.fly && Math.hypot(e.x - ball.x, e.y - ball.y) < 90) {
          drag = { id: e.id }; trail = [{ x: e.x, y: e.y, t: e.t }];
        }
      } else if (e.type === 'move' && drag && e.id === drag.id) {
        trail.push({ x: e.x, y: e.y, t: e.t });
        // Si tengono gli ultimi 150 ms di movimento (con i punti intermedi del dito possono essere molti).
        while (trail.length > 2 && e.t - trail[0].t > 150) trail.shift();
      } else if (e.type === 'up' && drag && e.id === drag.id) {
        drag = null;
        if (e.cancelled) return;
        trail.push({ x: e.x, y: e.y, t: e.t });
        const last = trail[trail.length - 1];
        const [fvx, fvy] = flickVel(last);
        launch(fvx, fvy);
      }
    };

    const act = k => {
      if (k === 'start') {
        if (state === 'over') newGame();
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
      } else if (k === 'select') newGame();
    };

    const burst = (x, y, n, c) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 80 + Math.random() * 220; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, t: 0.5 + Math.random() * 0.5, c: i % 3 ? c : ['#ff5a8a', '#6fffa0', '#6fc8ff', '#fff'][i % 4], s: 3 + Math.random() * 3 }); } };
    const rimPoints = () => [[hoop.x - HOOP_HALF, hoop.y], [hoop.x + HOOP_HALF, hoop.y]];

    const update = dt => {
      msgT = Math.max(0, msgT - dt); shakeT = Math.max(0, shakeT - dt);
      parts.forEach(q => { q.t -= dt; q.vy += 500 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }); parts = parts.filter(q => q.t > 0);
      netWobble = Math.max(0, netWobble - dt * 2);
      ball.pop = Math.max(0, ball.pop - dt * 4);

      if (state === 'play' || state === 'ready') {
        hoop.t += dt;
        const lvl = Math.min(score / 2, 12);
        hoop.amp = lvl >= 3 ? Math.min(100, (lvl - 2.5) * 12) : 0;
        hoop.x = hoop.base + Math.sin(hoop.t * (1.2 + lvl * 0.08)) * hoop.amp;
        hoop.y = HY + (lvl >= 8 ? Math.sin(hoop.t * 1.7) * 30 : 0);
      }
      if (state === 'play') {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; endGame(); return; }
      }
      if ((state === 'play' || state === 'ready') && ball.fly) {
        shotT += dt;
        const prevY = ball.y;
        ball.vy += GRAV * dt;
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        // bordi laterali
        if (ball.x < BR) { ball.x = BR; ball.vx = -ball.vx * 0.6; }
        if (ball.x > W - BR) { ball.x = W - BR; ball.vx = -ball.vx * 0.6; }
        // bordo del canestro
        for (const [rx, ry] of rimPoints()) {
          const dx = ball.x - rx, dy = ball.y - ry, d = Math.hypot(dx, dy);
          if (d < BR + RIM_R && d > 0) {
            const nx = dx / d, ny = dy / d;
            ball.x = rx + nx * (BR + RIM_R); ball.y = ry + ny * (BR + RIM_R);
            const vn = ball.vx * nx + ball.vy * ny;
            if (vn < 0) { ball.vx -= 1.55 * vn * nx; ball.vy -= 1.55 * vn * ny; rimHit = true; api.haptic(8); api.beep(240, 0.04, 'square', 0.04); }
          }
        }
        // tabellone: tocca il quadrato rosso e il tiro vale doppio
        if (!bankHit && ball.vy < 0 && Math.abs(ball.x - hoop.x) < 26 && ball.y < hoop.y - 12 && ball.y > hoop.y - 52 && ball.y > hoop.y - 90) { bankHit = true; ball.vy *= 0.55; ball.vx *= 0.5; api.haptic(10); api.beep(420, 0.05, 'triangle', 0.06); burst(ball.x, ball.y, 6, '#ffffff'); }
        if (fire && ball.fly && ((shotT * 30) | 0) !== ((shotT - dt) * 30 | 0)) parts.push({ x: ball.x + (Math.random() - 0.5) * 10, y: ball.y + 6, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 40, t: 0.4, c: Math.random() < 0.5 ? '#ffd24a' : '#ff6a2a', s: 4 });
        // canestro: la palla attraversa l'anello dall'alto
        if (!scored && prevY < hoop.y && ball.y >= hoop.y && ball.vy > 0 && Math.abs(ball.x - hoop.x) < HOOP_HALF - 8) {
          scored = true; netWobble = 1;
          const swish = !rimHit;
          streak++; best = Math.max(best, streak);
          const far = Math.abs(START.x - hoop.base) > 100;
          let pts = (swish ? 3 : 2) + (far ? 1 : 0) + (bankHit ? 2 : 0);
          if (streak >= 3 && !fire) { fire = true; flash('IN FIAMME!'); api.haptic(40); }
          if (fire) pts *= 2;
          score += pts; timeLeft = Math.min(60, timeLeft + (swish ? 2 : 1));
          shakeT = swish ? 0.3 : 0.15; burst(hoop.x, hoop.y + 8, swish ? 26 : 14, fire ? '#ff9a2a' : '#ffe27a');
          flash((bankHit ? 'TABELLONE ' : swish ? 'SWISH ' : far ? 'DA LONTANO ' : '') + '+' + pts + (fire ? ' 🔥' : ''));
          api.haptic(swish ? 30 : 18); api.beep(swish ? 988 : 784, 0.12);
          if (swish) setTimeout(() => api.beep(1318, 0.12), 90);
        }
        if (ball.y > H + 40 || (shotT > 0.4 && ball.vy > 0 && ball.y > START.y + 30)) {
          if (!scored) { streak = 0; fire = false; }
          newBall(); ball.pop = 1;
        }
        if (scored && ball.y > hoop.y + 120) { newBall(); ball.pop = 1; }
      }
    };

    // Disegno
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || PAL[3];
      g.fillText(s, x, y);
    };
    const banner = rows => {
      const h = rows.length * 26 + 16, w = 260, x = (W - w) / 2, y = (H - h) / 2;
      g.fillStyle = PAL[3]; g.fillRect(x, y, w, h);
      g.fillStyle = PAL[0]; g.fillRect(x + 2, y + 2, w - 4, h - 4);
      rows.forEach((t, i) => text(t, W / 2, y + 12 + i * 26, 18, 'center'));
    };

    const drawBall = (x, y, r) => {
      const gr = g.createRadialGradient(x - r * .3, y - r * .4, 2, x, y, r);
      gr.addColorStop(0, '#ffb066'); gr.addColorStop(.6, '#f58a25'); gr.addColorStop(1, '#a8500c');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.strokeStyle = '#4e2406'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.moveTo(x - r, y); g.lineTo(x + r, y); g.moveTo(x, y - r); g.lineTo(x, y + r); g.stroke();
      g.beginPath(); g.arc(x - r * 1.05, y, r * 0.8, -0.9, 0.9); g.arc(x + r * 1.05, y, r * 0.8, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - r * 0.35, y - r * 0.45, r * 0.28, r * 0.15, -0.6, 0, 7); g.fill();
    };

    const render = () => {
      g.save(); if (shakeT > 0) g.translate((Math.random() - 0.5) * shakeT * 20, (Math.random() - 0.5) * shakeT * 20);
      const wl = g.createLinearGradient(0, 0, 0, H); wl.addColorStop(0, '#141a3a'); wl.addColorStop(0.7, '#2a3566'); wl.addColorStop(1, '#3a4585'); g.fillStyle = wl; g.fillRect(0, 0, W, H);
      for (const lx of [W * 0.2, W * 0.8]) { const sp = g.createRadialGradient(lx, 0, 4, lx, 0, H * 0.7); sp.addColorStop(0, 'rgba(255,240,200,.18)'); sp.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = sp; g.fillRect(0, 0, W, H); }
      g.fillStyle = 'rgba(255,255,255,.04)'; for (let x = 0; x < W; x += 40) g.fillRect(x, H * 0.45, 20, H * 0.2);
      // parquet
      const fl = g.createLinearGradient(0, H - 50, 0, H); fl.addColorStop(0, '#c98a52'); fl.addColorStop(0.15, '#a8662f'); fl.addColorStop(1, '#6b3a17'); g.fillStyle = fl; g.fillRect(0, H - 50, W, 50);
      g.fillStyle = 'rgba(0,0,0,.22)';
      for (let x = 0; x < W; x += 36) g.fillRect(x, H - 50, 1.6, 50);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, H - 50, W, 2.5); g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, H - 47, W, 8);

      // tabellone
      const hx = hoop.x, hy = hoop.y;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.roundRect(hx - 54, hy - 78, 112, 76, 6); g.fill();
      g.fillStyle = '#e8ecff'; g.beginPath(); g.roundRect(hx - 56, hy - 84, 112, 76, 6); g.fill();
      const bgl = g.createLinearGradient(hx - 52, hy - 80, hx + 52, hy - 12); bgl.addColorStop(0, '#32406f'); bgl.addColorStop(1, '#141a3a'); g.fillStyle = bgl; g.beginPath(); g.roundRect(hx - 52, hy - 80, 104, 68, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(hx - 52, hy - 80); g.lineTo(hx - 10, hy - 80); g.lineTo(hx - 40, hy - 12); g.lineTo(hx - 52, hy - 12); g.closePath(); g.fill();
      g.strokeStyle = '#e5413b'; g.lineWidth = 3; g.strokeRect(hx - 24, hy - 46, 48, 34);
      // rete
      const w = 1 + Math.sin(performance.now() / 60) * netWobble * 0.15;
      g.strokeStyle = 'rgba(238,241,255,.8)'; g.lineWidth = 1.5;
      for (let i = 0; i <= 4; i++) {
        const t = i / 4;
        g.beginPath(); g.moveTo(hx - HOOP_HALF + t * HOOP_HALF * 2, hy + 2);
        g.lineTo(hx - HOOP_HALF * 0.55 * w + t * HOOP_HALF * 1.1 * w, hy + 46); g.stroke();
      }
      for (let j = 1; j <= 3; j++) {
        const yy = hy + 2 + j * 11, inset = j * 7;
        g.beginPath(); g.moveTo(hx - HOOP_HALF + inset, yy); g.lineTo(hx + HOOP_HALF - inset, yy); g.stroke();
      }
      const rg = g.createLinearGradient(0, hy - 4, 0, hy + 4); rg.addColorStop(0, '#ffb066'); rg.addColorStop(0.5, '#f58a25'); rg.addColorStop(1, '#a8500c'); g.fillStyle = rg; g.beginPath(); g.roundRect(hx - HOOP_HALF - 5, hy - 3.5, HOOP_HALF * 2 + 10, 7, 3.5); g.fill();

      // palla (davanti alla rete quando scende, dietro quando sale)
      const r = BR * (1 + ball.pop * 0.25);
      if (!ball.fly) {
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(ball.x, ball.y + BR + 6, BR, 6, 0, 0, 7); g.fill();
      }
      if (fire) { const fg = g.createRadialGradient(ball.x, ball.y, r * 0.5, ball.x, ball.y, r * 2.4); fg.addColorStop(0, 'rgba(255,200,60,.7)'); fg.addColorStop(1, 'rgba(255,80,20,0)'); g.fillStyle = fg; g.beginPath(); g.arc(ball.x, ball.y, r * 2.4, 0, 7); g.fill(); }
      drawBall(ball.x, ball.y, r);

      // guida dello scatto
      if (drag && trail.length > 1) {
        const [fvx, fvy] = flickVel(trail[trail.length - 1]);
        if (fvy < -380) {
          const vx0 = aim(fvx, fvy); let px = ball.x, py = ball.y, vx = vx0, vy = fvy;
          for (let i = 0; i < 26; i++) { for (let k = 0; k < 3; k++) { vy += GRAV * 0.016 / 3; px += vx * 0.016 / 3; py += vy * 0.016 / 3; } if (py > H) break; g.fillStyle = 'rgba(255,230,120,' + (0.85 - i * 0.03) + ')'; g.beginPath(); g.arc(px, py, 3.2 - i * 0.05, 0, 7); g.fill(); }
        } else { g.fillStyle = 'rgba(255,230,120,.9)'; g.font = 'bold 12px ui-monospace, monospace'; g.textAlign = 'center'; g.fillText('PIU\' FORTE!', ball.x, ball.y - 40); }
      }
      parts.forEach(q => { g.globalAlpha = Math.max(0, Math.min(1, q.t * 2)); g.fillStyle = q.c; g.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }); g.globalAlpha = 1;
      if (state === 'ready' && !ball.fly) text('SCATTA VERSO L\'ALTO · TABELLONE = PUNTI DOPPI', W / 2, START.y - 120, 11, 'center', '#f5d31c');

      // intestazione
      text('PUNTI ' + score, 10, 8, 16);
      text(Math.ceil(timeLeft) + 's', W / 2, 8, 16, 'center', timeLeft < 10 ? '#e5413b' : PAL[3]);
      text((fire ? 'IN FIAMME x2 ' : 'SERIE ') + streak, W - 10, 8, 16, 'right', fire ? '#ff9a2a' : streak >= 3 ? '#f5d31c' : PAL[3]);
      if (msgT > 0) text(msg, W / 2, 40, 22, 'center', '#f5d31c');

      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['TEMPO!', 'PUNTI ' + score, 'MIGLIOR SERIE ' + best, 'TOCCA']);
      g.restore();
    };

    newGame();
    return {
      onPress: act,
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update,
      render,
      debug: { launch, get ball() { return ball; }, get hoop() { return hoop; }, get state() { return state; }, get score() { return score; } },
    };
  },
});

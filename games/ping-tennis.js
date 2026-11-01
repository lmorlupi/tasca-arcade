// PING TENNIS: il classico "pong" da tennis in versione moderna: campo in prospettiva, rimbalzi veri, effetto,
// punteggio da tennis (15-30-40, vantaggio) e un avversario che migliora a ogni partita. Gioco originale.
registerGame({
  id: 'ping-tennis',
  title: 'PING TENNIS',
  author: 'Tasca Arcade',
  license: 'MIT',
  color: '#6fd36f',
  blurb: 'Il tennis a due racchette, in versione moderna. Trascina il dito a destra e a sinistra per muovere la racchetta: colpisci la palla vicino al bordo per angolare il tiro, tieni premuto A per il colpo potente. Si gioca ai 3 game, con punti da tennis.',
  inputs: ['TRASCINA', 'D-PAD', 'A POTENZA'],
  size: [360, 600],
  bg: '#0e2a22',
  flexH: true,
  flexMin: 1.1,
  create(api) {
    const { cv, g, held } = api;
    const CW = cv.width, CH = cv.height, VWd = 360, VHd = 600;
    const S = Math.min(CW / VWd, CH / VHd), OX = (CW - VWd * S) / 2, OY = (CH - VHd * S) / 2;
    const TOP = 96, BOT = 520, GRAV = 2.4;
    let hi = api.store.get('hi', 0);
    let state = 'title', time = 0, level = 1, wins = api.store.get('wins', 0);
    let pg = 0, ag = 0, ppt = 0, apt = 0, server = 'P', msg = '', msgT = 0, rallyN = 0, longest = 0;
    let ball, racket = { x: 0, vx: 0, sw: 0 }, cpu = { x: 0, vx: 0, sw: 0 }, parts = [], tx = null, dragX = null, charge = 0;
    const PT = ['0', '15', '30', '40'];
    // coordinate di gioco: x in [-1,1], y in [0,1] (0 = lato avversario), z altezza
    const sx = (x, y) => VWd / 2 + x * (VWd * (0.30 + 0.17 * y));
    const sy = y => TOP + (BOT - TOP) * y;
    const sc = y => 0.5 + 0.5 * y;
    const flash = t => { msg = t; msgT = 1.4; };
    const resetBall = () => { ball = { x: server === 'P' ? racket.x : cpu.x, y: server === 'P' ? 1.0 : 0.0, z: 0.1, vx: 0, vy: 0, vz: 0, live: false, last: server, bounces: 0, side: null, hitT: 0, trail: [] }; ball.serveWait = 1.1; };
    const newMatch = () => { pg = 0; ag = 0; ppt = 0; apt = 0; server = 'P'; racket.x = 0; cpu.x = 0; rallyN = 0; resetBall(); state = 'play'; };
    const scoreStr = () => { if (ppt >= 3 && apt >= 3) return ppt === apt ? 'PARITA' : ppt > apt ? 'VANTAGGIO TU' : 'VANTAGGIO CPU'; return PT[Math.min(ppt, 3)] + ' - ' + PT[Math.min(apt, 3)]; };
    const pointTo = (who, why) => {
      longest = Math.max(longest, rallyN); rallyN = 0;
      if (who === 'P') ppt++; else apt++;
      flash((who === 'P' ? 'PUNTO TUO' : 'PUNTO CPU') + (why ? ' · ' + why : ''));
      api.haptic(who === 'P' ? 30 : 60); tone(who === 'P' ? 880 : 200, 0.12, who === 'P' ? 'triangle' : 'sawtooth', 0.08);
      let gameWon = null;
      if (ppt >= 4 && ppt - apt >= 2) gameWon = 'P'; else if (apt >= 4 && apt - ppt >= 2) gameWon = 'A';
      if (gameWon) { if (gameWon === 'P') pg++; else ag++; ppt = 0; apt = 0; server = server === 'P' ? 'A' : 'P'; flash(gameWon === 'P' ? 'GAME TUO!' : 'GAME CPU'); if (gameWon === 'P') [523, 659, 784].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, i * 90)); }
      if (pg >= 3 || ag >= 3) { state = 'end'; if (pg >= 3) { level++; wins++; api.store.set('wins', wins); if (level > hi) { hi = level; api.store.set('hi', hi); } [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.09, i * 120)); } return; }
      state = 'point'; ball.live = false; ball.pause = 1.1;
    };
    const tone = (f, d, type, v, at) => { if (at) setTimeout(() => api.beep(f, d, type, v), at); else api.beep(f, d, type, v); };
    const puff = (x, y, n) => { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 40, t: 0.4 + Math.random() * 0.3 }); };

    // Un colpo: calcola la parabola perche' la palla atterri nella meta' campo avversaria.
    const hit = (who, tgtX, depth, speed, err) => {
      const dir = who === 'P' ? -1 : 1, y0 = ball.y;
      const tyLand = who === 'P' ? depth : 1 - depth;              // profondita' di atterraggio
      const dist = Math.abs(y0 - tyLand), T = dist / speed;
      let vz = (0.5 * GRAV * T * T - Math.max(0, ball.z)) / T;
      const tNet = Math.abs(y0 - 0.5) / speed, zNet = ball.z + vz * tNet - 0.5 * GRAV * tNet * tNet;
      if (zNet < 0.2) vz += (0.2 - zNet) / tNet * 0.9;              // abbastanza alto da passare la rete
      ball.vy = dir * speed; ball.vz = vz; ball.vx = (tgtX + (Math.random() - 0.5) * err - ball.x) / T;
      ball.live = true; ball.last = who; ball.bounces = 0; ball.side = null; ball.hitT = 0; rallyN++;
      tone(who === 'P' ? 330 : 280, 0.04, 'square', 0.09); tone(1800, 0.01, 'square', 0.05, 4); puff(sx(ball.x, ball.y), sy(ball.y), 5);
      if (who === 'P') api.haptic(18);
    };

    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      parts.forEach(p => { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; }); parts = parts.filter(p => p.t > 0);
      if (state === 'point') { ball.pause -= dt; if (ball.pause <= 0) { resetBall(); state = 'play'; } return; }
      if (state !== 'play') return;
      // racchetta del giocatore: dito, croce
      const prev = racket.x; const mv = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      if (mv) racket.x += mv * 4.2 * dt; else if (dragX !== null) racket.x += (Math.max(-1.05, Math.min(1.05, dragX)) - racket.x) * Math.min(1, dt * 40);
      // aiuto: quando la palla arriva, la racchetta scivola un po' da sola verso il punto giusto
      if (ball && ball.live && ball.last === 'A' && ball.vy > 0 && ball.y > 0.45) racket.x += Math.max(-2.6 * dt, Math.min(2.6 * dt, (ball.x + ball.vx * 0.1 - racket.x))) * (mv || dragX !== null ? 0.55 : 1);
      racket.x = Math.max(-1.05, Math.min(1.05, racket.x)); racket.vx = (racket.x - prev) / Math.max(dt, 1e-3);
      racket.sw = Math.max(0, racket.sw - dt); cpu.sw = Math.max(0, cpu.sw - dt);
      if (held.a) charge = Math.min(1, charge + dt * 1.8); else charge = Math.max(0, charge - dt * 2.5);
      // avversario
      const spd = 0.9 + level * 0.14, aimX = ball.live && ball.last === 'P' ? ball.x + ball.vx * 0.12 : 0;
      const prevC = cpu.x; if (ball.live && ball.last === 'P' && ball.vy < 0) cpu.x += Math.max(-spd * dt, Math.min(spd * dt, aimX - cpu.x)); else cpu.x += Math.max(-0.5 * dt, Math.min(0.5 * dt, -cpu.x));
      cpu.vx = (cpu.x - prevC) / Math.max(dt, 1e-3);
      if (!ball.live) {
        // servizio
        ball.serveWait -= dt;
        if (server === 'P') { ball.x = racket.x; ball.y = 1.0; ball.z = 0.12 + Math.sin(time * 5) * 0.03; if (ball.serveWait <= 0 && (tx !== null || held.a || held.up)) { tx = null; racket.sw = 0.25; hit('P', Math.max(-0.7, Math.min(0.7, racket.vx * 0.2 + (Math.random() - 0.5) * 0.5)), 0.28, 1.1, 0.3); } }
        else { ball.x = cpu.x; ball.y = 0.0; ball.z = 0.12; if (ball.serveWait <= 0) { cpu.sw = 0.25; hit('A', (Math.random() - 0.5) * 1.2, 0.3, 0.75 + level * 0.035, 0.35); } }
        return;
      }
      // palla
      ball.hitT += dt; ball.trail.push({ x: ball.x, y: ball.y, z: ball.z }); if (ball.trail.length > 7) ball.trail.shift();
      const py = ball.y, pz = ball.z;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.vz -= GRAV * dt; ball.z += ball.vz * dt;
      // rete
      if ((py - 0.5) * (ball.y - 0.5) < 0 && ball.z < 0.16) { flash('RETE'); api.beep(160, 0.08, 'square', 0.08); pointTo(ball.last === 'P' ? 'A' : 'P', 'rete'); return; }
      // rimbalzo
      if (ball.z <= 0 && ball.vz < 0) {
        ball.z = 0; ball.vz = -ball.vz * 0.74; ball.bounces++; puff(sx(ball.x, ball.y), sy(ball.y), 4); tone(150, 0.04, 'triangle', 0.08);
        const inX = Math.abs(ball.x) <= 1.02, inY = ball.y >= 0 && ball.y <= 1;
        const sideOk = ball.last === 'P' ? ball.y < 0.5 : ball.y > 0.5;
        if (ball.bounces === 1) {
          if (!inX || !inY || !sideOk) { flash('FUORI'); pointTo(ball.last === 'P' ? 'A' : 'P', 'fuori'); return; }
          ball.side = ball.y < 0.5 ? 'A' : 'P';
        } else if (ball.bounces >= 2) { pointTo(ball.last, ''); return; }
      }
      // colpo dell'avversario
      if (ball.last === 'P' && ball.vy < 0 && ball.y < 0.14 && ball.y > -0.06 && ball.z < 0.45 && Math.abs(ball.x - cpu.x) < 0.24) {
        const miss = Math.random() < Math.max(0.03, 0.34 - level * 0.05) && ball.z > 0.05 && rallyN < 3 ? true : false;
        if (!miss) { cpu.sw = 0.25; const t = Math.random() < 0.5 ? -racket.x * 0.8 + (Math.random() - 0.5) * 0.4 : (Math.random() - 0.5) * 1.5; hit('A', Math.max(-0.92, Math.min(0.92, t)), 0.12 + Math.random() * 0.2, 0.82 + level * 0.05 + Math.random() * 0.2, 0.2 + 0.2 / level); }
      }
      // colpo del giocatore
      if (ball.last === 'A' && ball.vy > 0 && ball.y > 0.84 && ball.y < 1.06 && ball.z < 0.5) {
        const off = ball.x - racket.x;
        if (Math.abs(off) < 0.36) {
          racket.sw = 0.25; const power = held.a ? 1 : 0.55 + charge * 0.45, edge = Math.abs(off) / 0.36;
          const tgt = Math.max(-0.95, Math.min(0.95, off * 3.2 + racket.vx * 0.22));
          hit('P', tgt, 0.1 + (1 - power) * 0.24, 0.8 + power * 0.55, 0.12 + edge * 0.5 + (ball.z > 0.3 ? 0.2 : 0));
          if (power > 0.9) { flash('POTENTE!'); api.haptic(35); puff(sx(ball.x, ball.y), sy(ball.y), 12); }
        }
      }
      // palla oltre la linea di fondo senza essere presa
      if (ball.y > 1.2 || ball.y < -0.2) pointTo(ball.y > 1.2 ? 'A' : 'P', ball.y > 1.2 ? '' : '');
      if (Math.abs(ball.x) > 1.6) { pointTo(ball.last === 'P' ? 'A' : 'P', 'fuori'); }
    };

    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'end') { if (state === 'end' && pg < 3) level = 1; newMatch(); } else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'select' && state !== 'title') { level = 1; newMatch(); }
    };
    const onPointer = e => {
      const vx = (e.x - OX) / S;
      if (e.type === 'down') { if (state === 'title') { newMatch(); return; } if (state === 'end') { if (pg < 3) level = 1; newMatch(); return; } if (state === 'pause') { state = 'play'; return; } dragX = (vx - VWd / 2) / (VWd * 0.34); tx = true; }
      else if (e.type === 'move') dragX = (vx - VWd / 2) / (VWd * 0.34);
      else if (e.type === 'up') { dragX = null; }
    };

    // ---- disegno
    const text = (s, x, y, size, align, c) => { g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#fff'; g.fillText(s, x, y); };
    const banner = rows => { const h = rows.length * 26 + 16, w = 260, x = (VWd - w) / 2, y = 250; g.fillStyle = '#fff'; g.fillRect(x, y, w, h); g.fillStyle = '#0e2a22'; g.fillRect(x + 2, y + 2, w - 4, h - 4); rows.forEach((t, i) => text(t, VWd / 2, y + 12 + i * 26, 18, 'center')); };
    const poly = (pts) => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
    const drawRacket = (x, y, sw, mine) => {
      const px = sx(x, y), py = sy(y), k = sc(y) * (mine ? 1.15 : 1), a = sw > 0 ? (sw / 0.25) * 0.9 : 0;
      g.save(); g.translate(px, py); g.scale(k, k); g.rotate((mine ? -0.5 : 0.5) * a * (x < 0 ? -1 : 1));
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(4, 26, 26, 8, 0, 0, 7); g.fill();
      g.strokeStyle = mine ? '#ff5a8a' : '#6fc8ff'; g.lineWidth = 5; g.beginPath(); g.ellipse(0, -8, 20, 26, 0, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; for (let i = -14; i <= 14; i += 7) { g.beginPath(); g.moveTo(i, -30); g.lineTo(i, 14); g.stroke(); } for (let j = -26; j <= 10; j += 7) { g.beginPath(); g.moveTo(-18, j); g.lineTo(18, j); g.stroke(); }
      g.fillStyle = '#2a2236'; g.fillRect(-3, 16, 6, 24); g.fillStyle = mine ? '#ff5a8a' : '#6fc8ff'; g.fillRect(-4, 34, 8, 6);
      g.restore();
    };
    const drawBall = (b, a) => {
      const bx = sx(b.x, b.y), by = sy(b.y), k = sc(b.y), lift = b.z * 120 * k;
      g.fillStyle = 'rgba(0,0,0,' + (0.3 - Math.min(0.18, b.z * 0.4)) + ')'; g.beginPath(); g.ellipse(bx, by, 8 * k, 3 * k, 0, 0, 7); g.fill();
      g.globalAlpha = a; const r = 7.5 * k;
      const gr = g.createRadialGradient(bx - r * 0.3, by - lift - r * 0.4, 1, bx, by - lift, r * 1.2); gr.addColorStop(0, '#f6ff9a'); gr.addColorStop(1, '#a8c820'); g.fillStyle = gr; g.beginPath(); g.arc(bx, by - lift, r, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1; g.beginPath(); g.arc(bx - r * 0.2, by - lift, r * 0.85, 0.5, 2.4); g.stroke(); g.globalAlpha = 1;
    };
    const render = () => {
      g.fillStyle = '#0a1c18'; g.fillRect(0, 0, CW, CH);
      g.save(); g.translate(OX, OY); g.scale(S, S);
      const bg = g.createLinearGradient(0, 0, 0, VHd); bg.addColorStop(0, '#0f3a4a'); bg.addColorStop(1, '#0a2a2e'); g.fillStyle = bg; g.fillRect(0, 0, VWd, VHd);
      // campo in prospettiva
      const L = (y) => sx(-1, y), R = (y) => sx(1, y);
      g.fillStyle = '#1f6b8f'; poly([[L(-0.08) - 22, sy(-0.08)], [R(-0.08) + 22, sy(-0.08)], [R(1.08) + 22, sy(1.08)], [L(1.08) - 22, sy(1.08)]]); g.fill();
      g.fillStyle = '#2f8fb8'; poly([[L(0), sy(0)], [R(0), sy(0)], [R(1), sy(1)], [L(1), sy(1)]]); g.fill();
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.05)'; poly([[L(i / 8), sy(i / 8)], [R(i / 8), sy(i / 8)], [R((i + 1) / 8), sy((i + 1) / 8)], [L((i + 1) / 8), sy((i + 1) / 8)]]); g.fill(); }
      g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(L(0), sy(0)); g.lineTo(R(0), sy(0)); g.lineTo(R(1), sy(1)); g.lineTo(L(1), sy(1)); g.closePath(); g.stroke();
      g.beginPath(); g.moveTo(sx(-0.78, 0), sy(0)); g.lineTo(sx(-0.78, 1), sy(1)); g.moveTo(sx(0.78, 0), sy(0)); g.lineTo(sx(0.78, 1), sy(1)); g.moveTo(sx(-0.78, 0.25), sy(0.25)); g.lineTo(sx(0.78, 0.25), sy(0.25)); g.moveTo(sx(-0.78, 0.75), sy(0.75)); g.lineTo(sx(0.78, 0.75), sy(0.75)); g.moveTo(sx(0, 0.25), sy(0.25)); g.lineTo(sx(0, 0.75), sy(0.75)); g.stroke();
      // racchetta avversaria e palla lontana, poi rete, poi il resto
      drawRacket(cpu.x, 0.02, cpu.sw, false);
      if (ball && ball.y < 0.5) { ball.trail.forEach((t, i) => { if (t.y < 0.5) drawBall(t, i / 9); }); drawBall(ball, 1); }
      const nl = L(0.5) - 6, nr = R(0.5) + 6, ny = sy(0.5), nh = 26;
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(nl, ny - 1, nr - nl, 5);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1; for (let x = nl; x <= nr; x += 8) { g.beginPath(); g.moveTo(x, ny - nh); g.lineTo(x, ny); g.stroke(); } for (let y = ny - nh; y <= ny; y += 6) { g.beginPath(); g.moveTo(nl, y); g.lineTo(nr, y); g.stroke(); }
      g.fillStyle = '#fff'; g.fillRect(nl, ny - nh - 2, nr - nl, 3.5); g.fillStyle = '#ddd'; g.fillRect(nl - 4, ny - nh - 4, 4, nh + 6); g.fillRect(nr, ny - nh - 4, 4, nh + 6);
      if (ball && ball.y >= 0.5) { ball.trail.forEach((t, i) => { if (t.y >= 0.5) drawBall(t, i / 9); }); drawBall(ball, 1); }
      drawRacket(racket.x, 0.99, racket.sw, true);
      parts.forEach(p => { g.globalAlpha = Math.max(0, p.t * 2); g.fillStyle = '#fff'; g.fillRect(p.x, p.y, 2.5, 2.5); }); g.globalAlpha = 1;
      // tabellone
      g.fillStyle = 'rgba(8,16,24,.82)'; g.fillRect(0, 0, VWd, 72);
      text('TU', 16, 8, 11, 'left', '#ff5a8a'); text('CPU', 16, 38, 11, 'left', '#6fc8ff');
      text(String(pg), 60, 6, 22, 'left'); text(String(ag), 60, 34, 22, 'left');
      text(scoreStr(), VWd / 2 + 30, 10, 22, 'center', '#ffe66a'); text('GAME ' + pg + '-' + ag + ' · LIV ' + level, VWd / 2 + 30, 44, 10, 'center', '#a8c8d8');
      text(server === 'P' ? '● TU SERVI' : '● CPU SERVE', VWd - 12, 8, 9, 'right', '#c9e8d0');
      if (charge > 0.05 || held.a) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(VWd - 70, 54, 56, 6); g.fillStyle = '#ffb03a'; g.fillRect(VWd - 70, 54, 56 * (held.a ? 1 : charge), 6); }
      if (msgT > 0) text(msg, VWd / 2, 110, 16, 'center', '#ffe66a');
      if (state === 'play' && ball && !ball.live && server === 'P') text('TOCCA PER SERVIRE', VWd / 2, 540, 13, 'center', '#fff');
      if (state === 'title') {
        g.fillStyle = 'rgba(8,24,30,.82)'; g.fillRect(0, 0, VWd, VHd);
        text('PING', VWd / 2, 150, 54, 'center', '#6fd36f'); text('TENNIS', VWd / 2, 208, 46, 'center', '#fff');
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', VWd / 2, 330, 16, 'center', '#ffe66a');
        text('TRASCINA PER MUOVERE LA RACCHETTA', VWd / 2, 380, 11, 'center', '#a8c8d8'); text('A = COLPO POTENTE', VWd / 2, 398, 11, 'center', '#a8c8d8'); text('ALLA PRIMA PALLA SERVI TU', VWd / 2, 416, 11, 'center', '#a8c8d8');
        text('PARTITE VINTE ' + wins + ' · MIGLIOR LIVELLO ' + hi, VWd / 2, 460, 12, 'center');
      }
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'end') banner(pg >= 3 ? ['HAI VINTO!', 'LIVELLO ' + level, 'TOCCA'] : ['HAI PERSO', 'SCAMBIO PIU LUNGO ' + longest, 'TOCCA']);
      g.restore();
    };

    racket.x = 0; resetBall();
    return {
      onPress: act, onPointer, onHide() { if (state === 'play') state = 'pause'; dragX = null; },
      update, render,
      debug: { newMatch, get state() { return state; }, get ball() { return ball; }, get racket() { return racket; }, get pg() { return pg; }, get ag() { return ag; }, get ppt() { return ppt; }, get apt() { return apt; }, get level() { return level; }, set drag(v) { dragX = v; } },
    };
  },
});

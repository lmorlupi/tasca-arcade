registerGame({
  id: 'sfere-ribelli', title: 'SFERE RIBELLI', license: 'MIT', color: '#f39a70',
  blurb: 'Sfere rimbalzanti invadono piazze, spiagge e luna park! Croce per muoverti, A per l’arpione, B per cambiare il fuoco automatico. Dividi le sfere fino a farle sparire e raccogli scudo e clessidra. Resta anche il trascinamento. Quadri e record si salvano.',
  inputs: ['CROCE + A/B', 'AUTO FUOCO', 'A ARPIONE'], size: [360, 640], flexH: true, bg: '#192944',
  create(api) {
    const { cv, g, held } = api, TOP = 60, LEFT = 16, TAU = Math.PI * 2;
    let W = cv.width, H = cv.height, FLOOR = H - 78, RIGHT = W - 16;
    const RADII = [11, 20, 32, 43], JUMP = [185, 245, 300, 335];
    const THEMES = [
      { name: 'PIAZZA DEI GELSOMINI', sky: ['#6a7eae', '#f8d8b2'], building: '#b8897d', trim: '#f4d7ad', ground: '#7d7484', notes: [72, 76, 79, 76, 74, 72, 69, 0, 71, 74, 79, 74, 72, 0, 67, 0] },
      { name: 'SPIAGGIA DEL SOLE', sky: ['#4d9bbd', '#dbedf0'], building: '#83bbc4', trim: '#ffe3ac', ground: '#ccab80', notes: [76, 79, 81, 79, 76, 74, 72, 0, 74, 76, 79, 76, 74, 72, 69, 0] },
      { name: 'LUNA PARK DELLE STELLE', sky: ['#262752', '#816396'], building: '#575376', trim: '#f8c6a0', ground: '#62567b', notes: [69, 72, 76, 79, 76, 72, 74, 0, 67, 71, 74, 77, 74, 71, 72, 0] },
      { name: 'GIARDINO DELLE LANTERNE', sky: ['#234c60', '#91b3a1'], building: '#517c71', trim: '#f5d79f', ground: '#687e70', notes: [74, 78, 81, 78, 76, 74, 71, 0, 73, 76, 78, 81, 78, 74, 71, 0] },
    ];
    const safe = (n, fallback = 1) => Number.isInteger(n) && n >= 1 && n <= 1000000 ? n : fallback;
    const saved = () => safe(api.store.get('stage', 1));
    let hi = Math.max(0, Number(api.store.get('hi', 0)) || 0), level = 1, score = 0, lives = 3, state = 'title', stateT = 0, time = 0, remaining = 100;
    let balls = [], ropes = [], drops = [], particles = [], player = { x: W / 2, inv: 2, shield: 0, walk: 0, face: 1 };
    let pointer = null, target = null, cooldown = 0, slow = 0, popped = 0, musicAt = 0, musicStep = 0;
    let auto = api.store.get('auto', true) !== false;
    const theme = () => THEMES[Math.floor((level - 1) / 4) % THEMES.length];
    const sound = (name, opts = {}) => api.sound ? api.sound(name, opts) : api.beep(opts.frequency || 660, .07, 'triangle', .03);
    const record = () => { if (score > hi) { hi = score; api.store.set('hi', hi); } };
    const burst = (x, y, color) => { for (let i = 0; i < 12; i++) { const a = i * TAU / 12; particles.push({ x, y, vx: Math.cos(a) * 75, vy: Math.sin(a) * 75, life: .45, color }); } };
    const ball = (x, y, size, dir, vy = -100) => ({ x, y, size, vx: dir * (size === 0 ? 97 : 65) * Math.min(1.35, .83 + level * .035), vy, r: RADII[size], spin: 0 });
    function startLevel() {
      const count = level < 3 ? 1 : level < 9 ? 2 : 3, size = level < 5 ? 2 : 3;
      balls = Array.from({ length: count }, (_, i) => ball(LEFT + (RIGHT - LEFT) * (i + 1) / (count + 1), TOP + 90 + i % 2 * 55, size, i % 2 ? -1 : 1));
      ropes = []; drops = []; particles = []; target = null; pointer = null; cooldown = .65; slow = 0;
      player = { x: W / 2, inv: 2.5, shield: 0, walk: 0, face: 1 };
      remaining = Math.max(65, 105 - Math.floor((level - 1) / 4) * 5); musicAt = 0; musicStep = 0; state = 'intro'; stateT = 1.8;
    }
    function newGame(from = saved()) { level = safe(from); score = 0; lives = 3; popped = 0; startLevel(); }
    function shoot() {
      if (state !== 'play' || cooldown > 0 || ropes.length >= 2) return;
      ropes.push({ x: player.x, y: FLOOR - 30, life: 1.1 }); cooldown = .6; sound('harpoon', { gain: .023 });
    }
    function hurt() {
      if (player.inv > 0 || player.shield > 0 || state !== 'play') return;
      lives--; record(); state = lives ? 'hurt' : 'over'; stateT = 1.15; target = null; pointer = null;
      sound('pop', { frequency: 190, gain: .05 }); api.haptic(45);
    }
    function hit(b) {
      b.dead = true; popped++; score += (4 - b.size) * 50; record();
      burst(b.x, b.y, ['#ffe184', '#93deeb', '#f3a1b2', '#c3b0f2'][b.size]);
      sound('pop', { frequency: 490 + (3 - b.size) * 180, gain: .032 }); api.haptic(7);
      if (b.size > 0) for (const dir of [-1, 1]) {
        const r = RADII[b.size - 1]; balls.push(ball(Math.max(LEFT + r, Math.min(RIGHT - r, b.x + dir * 3)), Math.min(FLOOR - r - 2, b.y), b.size - 1, dir, -150));
      }
      if (popped % 5 === 0) drops.push({ x: b.x, y: b.y, kind: popped % 10 === 0 ? 'shield' : 'slow', life: 9 });
    }
    function step(dt) {
      if (held.left || held.right) { target = null; player.x += ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * 225 * dt; }
      else if (target !== null) { const dx = target - player.x; player.x += Math.sign(dx) * Math.min(Math.abs(dx), 250 * dt); }
      player.x = Math.max(LEFT + 12, Math.min(RIGHT - 12, player.x));
      player.inv = Math.max(0, player.inv - dt); player.shield = Math.max(0, player.shield - dt); slow = Math.max(0, slow - dt);
      cooldown = Math.max(0, cooldown - dt); if (auto || held.a) shoot();
      for (const r of ropes) { r.y = Math.max(TOP, r.y - 620 * dt); r.life -= dt; }
      const bd = dt * (slow > 0 ? .55 : 1), live = balls.slice();
      for (const b of live) {
        if (b.dead) continue;
        b.vy += 430 * bd; b.x += b.vx * bd; b.y += b.vy * bd; b.spin += bd * b.vx / 35;
        if (b.x < LEFT + b.r) { b.x = LEFT + b.r; b.vx = Math.abs(b.vx); }
        if (b.x > RIGHT - b.r) { b.x = RIGHT - b.r; b.vx = -Math.abs(b.vx); }
        if (b.y < TOP + b.r) { b.y = TOP + b.r; b.vy = Math.abs(b.vy); }
        if (b.y > FLOOR - b.r) { b.y = FLOOR - b.r; b.vy = -Math.min(JUMP[b.size], Math.sqrt(2 * 430 * Math.max(20, FLOOR - TOP - b.r * 2))); }
        const rope = ropes.find(r => !r.dead && r.life > 0 && Math.abs(r.x - b.x) <= b.r + 2 && b.y + b.r >= r.y && b.y - b.r <= FLOOR - 28);
        if (rope) { rope.dead = true; hit(b); continue; }
        const dx = b.x - Math.max(player.x - 8, Math.min(player.x + 8, b.x)), dy = b.y - Math.max(FLOOR - 29, Math.min(FLOOR - 3, b.y));
        if (dx * dx + dy * dy < Math.max(1, b.r - 3) ** 2) hurt();
        if (state !== 'play') break;
      }
      balls = balls.filter(b => !b.dead); ropes = ropes.filter(r => !r.dead && r.life > 0);
      for (const d of drops) {
        d.y = Math.min(FLOOR - 12, d.y + 80 * dt); d.life -= dt;
        if (Math.abs(d.x - player.x) < 23 && d.y > FLOOR - 42) { if (d.kind === 'slow') slow = 7; else player.shield = 7; d.life = 0; score += 100; record(); sound('collect'); }
      }
      drops = drops.filter(d => d.life > 0);
      if (state === 'play' && !balls.length) {
        score += Math.ceil(remaining) * 5; record(); state = 'win'; stateT = 1.65;
        api.store.set('stage', Math.max(saved(), level + 1)); sound('celebrate', { gain: .035 });
      }
    }
    function update(dt) {
      dt = Math.max(0, Math.min(.05, dt));
      if (state === 'pause') return;
      time += dt;
      for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } particles = particles.filter(p => p.life > 0);
      if (state === 'intro' || state === 'hurt' || state === 'win') {
        stateT -= dt; if (stateT <= 0) { if (state === 'win') { level++; startLevel(); } else if (state === 'hurt') startLevel(); else state = 'play'; } return;
      }
      if (state !== 'play') return;
      remaining -= dt; if (remaining <= 0) { remaining = 0; player.inv = 0; player.shield = 0; hurt(); return; }
      musicAt -= dt;
      if (musicAt <= 0) { musicAt = .3; const n = theme().notes[musicStep++ % 16]; if (n) sound('music', { frequency: 440 * 2 ** ((n - 69) / 12), gain: .012, duration: .21 }); }
      const prev = player.x, n = Math.max(1, Math.ceil(dt / (1 / 120)));
      for (let i = 0; i < n && state === 'play'; i++) step(dt / n);
      if (Math.abs(player.x - prev) > .05) { player.walk += dt * 12; player.face = Math.sign(player.x - prev); }
    }
    function onPress(k) {
      if (k === 'start') {
        if (state === 'title' || state === 'over') newGame();
        else if (state === 'intro') state = 'play';
        else if (state === 'play' || state === 'pause') { state = state === 'play' ? 'pause' : 'play'; target = null; pointer = null; }
      } else if (k === 'select' && state === 'title') { api.store.set('stage', 1); newGame(1); }
      else if (k === 'a') { if (state === 'title' || state === 'over') newGame(); else shoot(); }
      else if (k === 'b' && (state === 'play' || state === 'title')) { auto = !auto; api.store.set('auto', auto); sound('ui'); }
    }
    function onPointer(e) {
      if (e.type === 'down') {
        if (state === 'title' || state === 'over') { newGame(); return; }
        if (state === 'play' && e.y >= H - 52) { if (e.x < W / 2) onPress('b'); else shoot(); return; }
        if (state !== 'play' || pointer !== null) return;
        pointer = e.id; target = e.x;
      } else if (e.id === pointer) { if (e.type === 'move' && state === 'play') target = e.x; else if (e.type === 'up' || e.type === 'cancel') { target = null; pointer = null; } }
    }
    const rect = (x, y, w, h, color, r = 0) => { g.fillStyle = color; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
    const circle = (x, y, r, color) => { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const text = (s, x, y, size = 13, color = '#fff6e7', align = 'center') => { g.font = `bold ${size}px ui-monospace, monospace`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(s, x, y); };
    function background() {
      const th = theme(), kind = Math.floor((level - 1) / 4) % 4, sky = g.createLinearGradient(0, TOP, 0, FLOOR); sky.addColorStop(0, th.sky[0]); sky.addColorStop(1, th.sky[1]); rect(0, 0, W, H, sky);
      circle(W - 65, TOP + 61, 26, kind === 2 ? '#f4e3b3' : '#ffe7b4');
      if (kind === 0) {
        for (let i = 0; i < 6; i++) {
          const x = i * 67 - 18, y = FLOOR - 175 - i % 2 * 30;
          rect(x, y, 63, FLOOR - y, i % 2 ? '#c29b8b' : th.building); rect(x - 3, y - 6, 69, 8, th.trim);
          for (let f = 0; f < 3; f++) for (let c = 0; c < 2; c++) { rect(x + 12 + c * 26, y + 20 + f * 43, 15, 24, '#675c74', 7); rect(x + 13 + c * 26, y + 34 + f * 43, 13, 2, '#dcc4ab'); }
          rect(x + 15, FLOOR - 43, 32, 43, '#695365', 16);
        }
      } else if (kind === 1) {
        rect(0, FLOOR - 152, W, 105, '#76b7c8');
        g.strokeStyle = '#c6e2de'; g.lineWidth = 2;
        for (let i = 0; i < 6; i++) { const y = FLOOR - 139 + i * 15; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(100, y - 3, 200, y + 3, W, y); g.stroke(); }
        for (const x of [55, 290]) { rect(x, FLOOR - 96, 3, 96, '#93756c'); g.fillStyle = x === 55 ? '#e4a59a' : '#d9c78a'; g.beginPath(); g.arc(x + 2, FLOOR - 92, 35, Math.PI, TAU); g.fill(); }
      } else if (kind === 2) {
        const cx = W - 83, cy = FLOOR - 130;
        g.strokeStyle = '#b6a6cb'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 69, 0, TAU); g.moveTo(cx - 38, FLOOR); g.lineTo(cx, cy); g.lineTo(cx + 38, FLOOR); g.stroke();
        for (let i = 0; i < 10; i++) { const a = i * TAU / 10 + time * .045, x = cx + Math.cos(a) * 69, y = cy + Math.sin(a) * 69; g.strokeStyle = '#9a8cad'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); rect(x - 7, y - 3, 14, 11, i % 2 ? '#e9bf8f' : '#b3c9c7', 3); }
        rect(20, FLOOR - 64, 120, 64, '#7d628a');
        for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#d79b9d' : '#f1c79c'; g.beginPath(); g.moveTo(20 + i * 15, FLOOR - 64); g.lineTo(80, FLOOR - 128); g.lineTo(35 + i * 15, FLOOR - 64); g.fill(); }
      } else {
        for (let i = 0; i < 7; i++) { const x = i * 62 - 5, y = FLOOR - 140 - i % 3 * 25; rect(x, y, 8, FLOOR - y, '#5d6e67'); circle(x + 4, y + 5, 36, i % 2 ? '#649481' : '#4f7c71'); }
        g.strokeStyle = '#a4a487'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, FLOOR - 200); g.quadraticCurveTo(W / 2, FLOOR - 130, W, FLOOR - 200); g.stroke();
        for (let i = 0; i < 8; i++) { const x = 20 + i * 45, y = FLOOR - 195 + Math.sin(x / W * Math.PI) * 32; rect(x - 5, y, 10, 16, '#eac586', 4); circle(x, y + 7, 2, '#fff1b8'); }
      }
      rect(0, FLOOR, W, H - FLOOR, th.ground); rect(0, FLOOR, W, 5, th.trim);
      for (let x = 0; x < W; x += 30) { rect(x, FLOOR + 8, 1, 18, '#ffffff18'); rect(x + 10, FLOOR + 28, 1, 15, '#00000012'); }
      // La fascia inferiore scura lascia leggibili comandi e bonus.
      rect(0, H - 52, W, 52, '#192944');
    }
    function drawBall(b) {
      circle(b.x + 4, FLOOR - 1, b.r * .65, '#14203515');
      const color = ['#ffdf80', '#90dbe2', '#ee9fac', '#b3a0e1'][b.size], grad = g.createRadialGradient(b.x - b.r * .35, b.y - b.r * .4, 1, b.x, b.y, b.r);
      grad.addColorStop(0, '#fff7e4'); grad.addColorStop(.35, color); grad.addColorStop(1, ['#b98042', '#3e879e', '#a45979', '#695b9f'][b.size]);
      circle(b.x, b.y, b.r, grad); g.strokeStyle = '#fff5dfaa'; g.lineWidth = 1.2; g.beginPath(); g.arc(b.x, b.y, b.r - 1, 0, TAU); g.stroke();
      g.save(); g.translate(b.x, b.y); g.rotate(b.spin); g.strokeStyle = '#ffffff65'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, b.r * .65, -.7, .7); g.stroke(); g.restore();
    }
    function drawPlayer() {
      if (player.inv > 0 && Math.floor(time * 12) % 2) return;
      const x = player.x, y = FLOOR, leg = Math.sin(player.walk) * 3;
      circle(x, y - 1, 11, '#19294435'); rect(x - 8, y - 15, 6, 13 + leg, '#354768', 2); rect(x + 2, y - 15, 6, 13 - leg, '#354768', 2);
      rect(x - 10, y - 27, 20, 17, '#f1b178', 6); rect(x - 6, y - 25, 12, 11, '#f8d99b', 3);
      circle(x, y - 33, 9, '#f4ccb0'); rect(x - 10, y - 43, 20, 7, '#de827d', 3); rect(x + player.face * 5 - 4, y - 38, 10, 3, '#bd6771', 2);
      circle(x + player.face * 4, y - 33, 1.5, '#344056'); rect(x - 2, y - 32, 4, 14, '#7e8f9f', 2);
      if (player.shield > 0) { g.strokeStyle = '#c5f2f7'; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y - 22, 20, 27, 0, 0, TAU); g.stroke(); }
    }
    function panel(rows) {
      const height = rows.length * 27 + 28, y = H * .46 - height / 2;
      rect(18, y + 4, W - 36, height, '#15243e66', 12); rect(18, y, W - 36, height, '#20334def', 12);
      rows.forEach((s, i) => text(s, W / 2, y + 26 + i * 27, i === 0 ? 19 : 12, i === 0 ? '#ffe0a3' : '#fff2de'));
    }
    function render() {
      background();
      if (state === 'title') {
        drawBall({ x: 82, y: 182, r: 36, size: 2, spin: time * .3 }); drawBall({ x: 283, y: 254, r: 25, size: 1, spin: -time * .3 }); drawPlayer();
        panel(['SFERE RIBELLI', 'TOCCA PER INIZIARE', 'TRASCINA PER MUOVERTI', auto ? 'L’ARPIONE PARTE DA SOLO' : 'A: SPARA CON L’ARPIONE', 'T: RALLENTA · S: SCUDO', 'B: AUTO FUOCO ' + (auto ? 'ON' : 'OFF')]);
        text('RECORD ' + hi, W / 2, H - 20, 13);
        if (saved() > 1) { text('CONTINUA DAL QUADRO ' + saved(), W / 2, H - 64, 12); text('SELECT: RICOMINCIA', W / 2, H - 47, 11); }
        return;
      }
      for (const r of ropes) { g.strokeStyle = '#fff6d4'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(r.x, FLOOR - 26); g.lineTo(r.x, r.y); g.stroke(); g.fillStyle = '#ffdf9b'; g.beginPath(); g.moveTo(r.x, r.y - 7); g.lineTo(r.x - 5, r.y + 2); g.lineTo(r.x + 5, r.y + 2); g.fill(); }
      balls.forEach(drawBall); drawPlayer();
      for (const d of drops) { circle(d.x, d.y, 12, '#fff3ce'); text(d.kind === 'slow' ? 'T' : 'S', d.x, d.y + 1, 14, '#305770'); }
      for (const p of particles) { g.globalAlpha = p.life / .45; circle(p.x, p.y, 2.5, p.color); } g.globalAlpha = 1;
      rect(0, 0, W, 56, '#192944'); text('PUNTI ' + score, 12, 16, 13, '#fff2dc', 'left'); text('Q' + level, W / 2, 16, 13); text(Math.ceil(remaining) + 's', W - 12, 16, 13, remaining < 15 ? '#ffb4a5' : '#fff2dc', 'right');
      text('VITE ' + lives, 12, 39, 11, '#c5dbe5', 'left'); text('RECORD ' + hi, W - 12, 39, 11, '#c5dbe5', 'right');
      rect(5, H - 49, W / 2 - 8, 46, '#263d55', 6); rect(W / 2 + 3, H - 49, W / 2 - 8, 46, '#263d55', 6);
      text(slow > 0 ? 'SFERE LENTE ' + Math.ceil(slow) + 's' : player.shield > 0 ? 'SCUDO ' + Math.ceil(player.shield) + 's' : 'AUTO ' + (auto ? 'ON' : 'OFF'), W / 4, H - 26, 11); text('SPARA', W * .75, H - 26, 12);
      if (state === 'intro') panel(['QUADRO ' + level, theme().name, auto ? 'MUOVITI, L’ARPIONE SPARA DA SOLO' : 'MUOVITI E PREMI A PER SPARARE']);
      if (state === 'pause') panel(['PAUSA', 'START PER CONTINUARE']);
      if (state === 'win') panel(['BRAVISSIMO!', 'QUADRO COMPLETATO']);
      if (state === 'hurt') panel(['RIPROVIAMO!', 'VITE ' + lives]);
      if (state === 'over') panel(['PARTITA FINITA', 'PUNTI ' + score, 'TOCCA PER RIPROVARE']);
    }
    return { update, render, onPress, onPointer,
      onResize(w,h) { const sx=(w-LEFT*2)/(W-LEFT*2), sy=(h-78-TOP)/(FLOOR-TOP); player.x=LEFT+(player.x-LEFT)*sx; for(const b of balls){b.x=LEFT+(b.x-LEFT)*sx;b.y=TOP+(b.y-TOP)*sy;b.vy*=Math.sqrt(sy);} for(const d of drops){d.x=LEFT+(d.x-LEFT)*sx;d.y=TOP+(d.y-TOP)*sy;} W=w;H=h;FLOOR=H-78;RIGHT=W-16;for(const b of balls){b.x=Math.max(LEFT+b.r,Math.min(RIGHT-b.r,b.x));b.y=Math.max(TOP+b.r,Math.min(FLOOR-b.r,b.y));}ropes=[];target=null;pointer=null; }, onHide() { if (state === 'play') state = 'pause'; target = null; pointer = null; },
      debug: { newGame, get state() { return state; }, get level() { return level; }, get score() { return score; }, get lives() { return lives; }, get balls() { return balls; }, get ropes() { return ropes; }, get drops() { return drops; }, get player() { return player; }, get auto() { return auto; }, get remaining() { return remaining; }, get theme() { return theme().name; }, get layout() { return { width: W, height: H, floor: FLOOR, top: TOP, left: LEFT, right: RIGHT }; } },
    };
  },
});

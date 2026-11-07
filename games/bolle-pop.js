registerGame({
  id: 'bolle-pop', title: 'BOLLE POP', license: 'MIT', color: '#69d6ef',
  blurb: "Unisci tre bolle dello stesso colore e fai cadere i gruppi sospesi.",
  inputs: ['TOCCO', 'D-PAD', 'A SPARA · B SCAMBIA'], size: [360, 620], flexH: true, flexMin: 1.4, bg: '#0c1730',
  create(api) {
    const { cv, g, held } = api, W = cv.width, H = cv.height;
    const R = 16, RH = Math.sqrt(3) * R, COLS = 9, LEFT = (W - COLS * R * 2) / 2, TOP = 94;
    const OX = W / 2, OY = H - 77, LIMIT = OY - 45;
    const COLORS = ['#62d5f7', '#ff76ad', '#ffd75e', '#79df9e', '#b397ff'];
    const MARKS = ['◆', '♥', '✦', '+', '●'];
    let grid = [], shot = null, angle = -Math.PI / 2, current = 0, next = 1, state = 'play';
    let score = 0, hi = api.store.get('hi', 0), level = 1, misses = 0, drop = 0, displayDrop = 0, settle = 0, banner = '', bannerTime = 0, pointer = null;
    const cols = r => COLS - r % 2;
    const point = (r, c, visual = false) => ({ x: LEFT + R + c * R * 2 + r % 2 * R, y: TOP + r * RH + (visual ? displayDrop : drop) });
    const key = (r, c) => r + ':' + c;
    const inside = (r, c) => r >= 0 && r < Math.ceil(H / RH) && c >= 0 && c < cols(r);
    const get = (r, c) => grid[r]?.[c];
    const occupied = (r, c) => get(r, c) !== undefined && get(r, c) !== null;
    const neighbors = (r, c) => {
      const offset = r % 2 ? 0 : -1;
      return [[r, c - 1], [r, c + 1], [r - 1, c + offset], [r - 1, c + offset + 1], [r + 1, c + offset], [r + 1, c + offset + 1]].filter(([a, b]) => inside(a, b));
    };
    const cells = () => { const all = []; grid.forEach((row, r) => row.forEach((color, c) => { if (color !== null && color !== undefined) all.push({ r, c, color, ...point(r, c) }); })); return all; };
    const palette = () => [...new Set(cells().map(b => b.color))];
    const choose = () => { const colors = palette(); return colors[Math.floor(Math.random() * colors.length)] ?? 0; };
    const notice = (s, time = 1.2) => { banner = s; bannerTime = time; };
    const startLevel = () => {
      grid = []; drop = 0; displayDrop = 0; shot = null; misses = 0; settle = 0; pointer = null; angle = -Math.PI / 2;
      const colorCount = Math.min(3 + Math.floor((level - 1) / 2), COLORS.length);
      const rows = Math.min(4 + Math.floor((level - 1) / 2), Math.max(4, Math.floor((LIMIT - TOP) / RH) - 3));
      for (let r = 0; r < rows; r++) grid[r] = Array.from({ length: cols(r) }, (_, c) => (Math.floor(c / 2) + Math.floor(r / 2) + level) % colorCount);
      current = choose(); next = choose(); state = 'play'; notice('LIVELLO ' + level, 1.5);
    };
    const restart = () => { score = 0; level = 1; startLevel(); };
    const flood = (r, c, sameColor) => {
      const queue = [[r, c]], seen = new Set(), found = [], color = get(r, c);
      while (queue.length) {
        const [a, b] = queue.pop(), id = key(a, b);
        if (seen.has(id) || !occupied(a, b) || (sameColor && get(a, b) !== color)) continue;
        seen.add(id); found.push([a, b]); queue.push(...neighbors(a, b));
      }
      return found;
    };
    const pop = (list, falling) => list.forEach(([r, c]) => {
      const p = point(r, c), color = COLORS[get(r, c)]; grid[r][c] = null;
      api.fx.burst(p.x, p.y, { n: falling ? 9 : 6, color, speed: falling ? 90 : 120, gravity: falling ? 280 : 40, life: 0.55, size: 3 });
    });
    const end = () => { state = 'over'; shot = null; pointer = null; api.haptic(35); api.beep(150, 0.22, 'triangle'); };
    const resolve = (r, c, color) => {
      if (!grid[r]) grid[r] = [];
      grid[r][c] = color; shot = null; settle = 0.28;
      const cluster = flood(r, c, true);
      if (cluster.length >= 3) {
        pop(cluster, false);
        const anchored = new Set();
        for (let x = 0; x < COLS; x++) if (occupied(0, x)) flood(0, x, false).forEach(([a, b]) => anchored.add(key(a, b)));
        const falling = cells().filter(b => !anchored.has(key(b.r, b.c))).map(b => [b.r, b.c]);
        pop(falling, true);
        const points = cluster.length * 30 + falling.length * 50; score += points;
        const p = point(r, c); api.fx.text(p.x, p.y, '+' + points, { color: '#fff4ae', size: 20 });
        api.haptic(falling.length ? 25 : 12); api.beep(700 + Math.min(500, cluster.length * 35), 0.1, 'triangle');
        if (falling.length >= 4) { notice('CADUTA! +' + points); api.fx.shake(2, 0.15); }
        if (score > hi) { hi = score; api.store.set('hi', hi); }
      } else {
        misses++; api.beep(260, 0.035, 'triangle', 0.035);
        if (misses === 5) { misses = 0; drop += RH; notice('IL SOFFITTO SCENDE', 1); api.haptic(15); }
      }
      const remaining = cells();
      if (!remaining.length) {
        score += 250; if (score > hi) { hi = score; api.store.set('hi', hi); }
        state = 'clear'; settle = 1.5; notice('TUTTO PULITO! +250', 1.5); api.haptic(35);
        api.fx.burst(W / 2, H / 2, { n: 70, color: COLORS, speed: 230, gravity: 150, life: 1.1 }); return;
      }
      if (remaining.some(b => b.y + R >= LIMIT)) { end(); return; }
      current = palette().includes(next) ? next : choose(); next = choose();
    };
    const attach = hit => {
      let candidates = hit ? neighbors(hit.r, hit.c).filter(([r, c]) => !occupied(r, c))
        : Array.from({ length: COLS }, (_, c) => [0, c]).filter(([r, c]) => !occupied(r, c));
      if (!candidates.length) { end(); return; }
      candidates.sort((a, b) => { const p = point(...a), q = point(...b); return Math.hypot(p.x - shot.x, p.y - shot.y) - Math.hypot(q.x - shot.x, q.y - shot.y); });
      const [r, c] = candidates[0]; resolve(r, c, shot.color);
    };
    const aim = (x, y) => { if (y < OY - 12) angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, Math.atan2(y - OY, x - OX))); };
    const fire = () => {
      if (state !== 'play' || shot || settle > 0) return;
      shot = { x: OX, y: OY, vx: Math.cos(angle) * 580, vy: Math.sin(angle) * 580, color: current };
      pointer = null; api.haptic(6); api.beep(410, 0.055, 'triangle', 0.045);
    };
    const swap = () => { if (state === 'play' && !shot && settle <= 0) { [current, next] = [next, current]; api.haptic(5); } };
    const onPointer = e => {
      if (e.type === 'down') {
        if (state === 'over') { restart(); return; }
        if (state === 'pause') { state = 'play'; return; }
        if (e.x < 120 && e.y > H - 62) { swap(); return; }
        if (state === 'play' && !shot && e.y > 70 && e.y < OY - 12) { pointer = e.id; aim(e.x, e.y); }
      } else if (pointer === e.id) {
        if (e.type === 'move') aim(e.x, e.y);
        if (e.type === 'up') { pointer = null; if (!e.cancelled) fire(); }
      }
    };
    const text = (s, x, y, size = 13, color = '#edf8ff', align = 'left') => { g.font = `bold ${size}px ui-monospace, monospace`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = color; g.fillText(s, x, y); };
    const circle = (x, y, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
    const bubble = (x, y, color, radius = R - 0.5) => {
      circle(x + 1, y + 3, radius, '#030a1d88');
      const f = g.createRadialGradient(x - 5, y - 6, 1, x, y, radius); f.addColorStop(0, '#fff'); f.addColorStop(0.18, COLORS[color]); f.addColorStop(1, '#203a61');
      circle(x, y, radius, f); circle(x - 5, y - 6, 3, '#ffffff88'); text(MARKS[color], x, y + 2, 13, '#0c1730', 'center');
    };
    const render = () => {
      const visible = cells();
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#14284a'); bg.addColorStop(1, '#080d24'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { g.fillStyle = '#77a9dd33'; g.fillRect((i * 73 + 11) % W, (i * 113 + 25) % H, 2, 2); }
      text('BOLLE POP', 16, 27, 23, '#69d6ef'); text('LIVELLO ' + level, W - 16, 27, 13, '#ffd75e', 'right');
      text('PUNTI ' + score, 16, 54, 13); text('RECORD ' + hi, W - 16, 54, 12, '#a5b8d8', 'right');
      g.strokeStyle = '#58bfd8'; g.lineWidth = 3; g.beginPath(); g.moveTo(LEFT - 3, TOP - R - 5 + displayDrop); g.lineTo(W - LEFT + 3, TOP - R - 5 + displayDrop); g.stroke();
      g.strokeStyle = '#72c3fa44'; g.lineWidth = 2; g.strokeRect(LEFT - 2, 70, W - LEFT * 2 + 4, LIMIT - 70);
      g.setLineDash([4, 6]); g.strokeStyle = '#ff76ad66'; g.beginPath(); g.moveTo(LEFT, LIMIT); g.lineTo(W - LEFT, LIMIT); g.stroke(); g.setLineDash([]);
      visible.forEach(b => { const p = point(b.r, b.c, true); bubble(p.x, p.y, b.color); });
      if (state === 'play' && !shot && settle <= 0) {
        let x = OX, y = OY, dx = Math.cos(angle), dy = Math.sin(angle);
        for (let i = 0; i < 65; i++) {
          x += dx * 10; y += dy * 10;
          if (x < LEFT + R) { x = 2 * (LEFT + R) - x; dx = -dx; }
          if (x > W - LEFT - R) { x = 2 * (W - LEFT - R) - x; dx = -dx; }
          if (y < TOP + drop || visible.some(b => Math.hypot(b.x - x, b.y - y) < R * 2)) break;
          if (i % 2 === 0) circle(x, y, 2, '#e6f4ff77');
        }
      }
      g.save(); g.translate(OX, OY); g.rotate(angle); g.fillStyle = '#93b4d4'; g.beginPath(); g.roundRect(-8, -8, 38, 16, 6); g.fill(); g.restore();
      if (shot) bubble(shot.x, shot.y, shot.color); else bubble(OX, OY, current, 18);
      g.fillStyle = '#1c3150'; g.beginPath(); g.roundRect(12, H - 61, 108, 38, 9); g.fill(); bubble(31, H - 42, next, 12); text('B SCAMBIA', 51, H - 42, 11, '#b9cee9');
      for (let i = 0; i < 5; i++) circle(W - 26 - i * 14, H - 42, 4, i < misses ? '#ff76ad' : '#354563');
      text('MIRA E RILASCIA · A SPARA', W / 2, H - 10, 12, '#a5b8d8', 'center');
      if (bannerTime > 0 && state !== 'over') text(banner, W / 2, 76, 12, '#ffe9a8', 'center');
      if (state === 'pause' || state === 'over') {
        g.fillStyle = '#060c20dd'; g.fillRect(0, 70, W, H - 140);
        text(state === 'pause' ? 'PAUSA' : 'FINE PARTITA', W / 2, H / 2 - 35, 28, '#fff', 'center');
        text('PUNTI ' + score, W / 2, H / 2 + 5, 18, '#ffd75e', 'center');
        text(state === 'pause' ? 'START O TOCCA PER RIPRENDERE' : 'A O TOCCA PER RIPROVARE', W / 2, H / 2 + 43, 12, '#b9cee9', 'center');
      }
    };
    restart();
    return {
      render, onPointer,
      update(dt) {
        if (state === 'pause' || state === 'over') return;
        bannerTime = Math.max(0, bannerTime - dt); settle = Math.max(0, settle - dt); displayDrop += (drop - displayDrop) * Math.min(1, dt * 12);
        if (state === 'clear') { if (!settle) { level++; startLevel(); } return; }
        if (!shot) { angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, angle + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * dt * 1.5)); return; }
        shot.x += shot.vx * dt; shot.y += shot.vy * dt;
        if (shot.x < LEFT + R) { shot.x = 2 * (LEFT + R) - shot.x; shot.vx = Math.abs(shot.vx); }
        if (shot.x > W - LEFT - R) { shot.x = 2 * (W - LEFT - R) - shot.x; shot.vx = -Math.abs(shot.vx); }
        const hit = cells().find(b => Math.hypot(b.x - shot.x, b.y - shot.y) <= R * 2 - 0.5);
        if (hit) attach(hit); else if (shot.y <= TOP + drop) attach(null);
      },
      onPress(k) { if (k === 'start') { if (state === 'play') { state = 'pause'; pointer = null; } else if (state === 'pause') state = 'play'; else if (state === 'over') restart(); } else if (k === 'select') restart(); else if (k === 'a') { if (state === 'over') restart(); else fire(); } else if (k === 'b') swap(); },
      onHide() { if (state === 'play') state = 'pause'; pointer = null; },
      debug: { get cells() { return cells(); }, get state() { return state; }, get shot() { return shot && { ...shot }; }, get score() { return score; }, get current() { return current; }, get next() { return next; }, get misses() { return misses; }, get level() { return level; }, get layout() { return { width: W, height: H, origin: { x: OX, y: OY }, left: LEFT, top: TOP, radius: R, rowHeight: RH, limit: LIMIT }; } },
    };
  },
});

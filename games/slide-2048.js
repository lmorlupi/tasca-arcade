registerGame({
  id: 'slide-2048',
  title: 'SLIDE 2048',
  color: '#a655b8',
  blurb: 'Fai scorrere le tessere con uno swipe: due uguali si fondono. Arriva a 2048. B annulla l\'ultima mossa.',
  inputs: ['SWIPE', 'VIBRAZIONE', 'D-PAD'],
  size: [360, 620],
  create(api) {
    const { cv, g } = api;
    const W = cv.width, H = cv.height;
    const N = 4, CELL = 72, GAP = 10, BOARD = N * CELL + (N + 1) * GAP;
    const BX = (W - BOARD) / 2, BY = 170;
    const PAL = ['#141a2e', '#1f2744', '#5a6aa0', '#eef1ff'];
    const TILE = {
      2: ['#d9e4ff', '#141a2e'], 4: ['#b9ceff', '#141a2e'], 8: ['#f58a25', '#fff'], 16: ['#f5651f', '#fff'],
      32: ['#e5413b', '#fff'], 64: ['#c42b52', '#fff'], 128: ['#f5d31c', '#141a2e'], 256: ['#e8c20a', '#141a2e'],
      512: ['#4cc24a', '#141a2e'], 1024: ['#25c4f0', '#141a2e'], 2048: ['#a655b8', '#fff'],
    };

    let best = api.store.get('hi', 0);
    let tiles = [], score = 0, state = 'play', nextId = 1, undoState = null, won = false, msg = '', msgT = 0;

    const cellPos = (x, y) => [BX + GAP + x * (CELL + GAP), BY + GAP + y * (CELL + GAP)];
    const save = () => api.store.set('save', { tiles: tiles.filter(t => !t.dying).map(t => ({ v: t.v, x: t.x, y: t.y })), score });

    const addTile = (v, x, y) => {
      const [px, py] = cellPos(x, y);
      const t = { id: nextId++, v, x, y, px, py, pop: 1, dying: false, life: 0 };
      tiles.push(t); return t;
    };
    const spawn = () => {
      const free = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!tiles.some(t => !t.dying && t.x === x && t.y === y)) free.push([x, y]);
      if (!free.length) return;
      const [x, y] = free[(Math.random() * free.length) | 0];
      addTile(Math.random() < 0.9 ? 2 : 4, x, y);
    };
    const snapshot = () => ({ tiles: tiles.filter(t => !t.dying).map(t => ({ v: t.v, x: t.x, y: t.y })), score });
    const restore = s => {
      tiles = []; score = s.score;
      s.tiles.forEach(t => addTile(t.v, t.x, t.y));
      tiles.forEach(t => { t.pop = 0; });
    };
    const newGame = () => { tiles = []; score = 0; state = 'play'; won = false; undoState = null; spawn(); spawn(); save(); };

    const canMove = () => {
      const live = tiles.filter(t => !t.dying);
      if (live.length < N * N) return true;
      return live.some(a => live.some(b => (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1) && a.v === b.v));
    };

    const slide = dir => {
      if (state !== 'play') return;
      const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      const before = snapshot();
      const live = tiles.filter(t => !t.dying);
      const order = live.slice().sort((a, b) => (dx > 0 ? b.x - a.x : dx < 0 ? a.x - b.x : dy > 0 ? b.y - a.y : a.y - b.y));
      let moved = false, merged = 0;
      const mergedIds = new Set();
      for (const t of order) {
        let { x, y } = t;
        for (;;) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
          const other = live.find(o => o !== t && !o.dying && o.x === nx && o.y === ny);
          if (!other) { x = nx; y = ny; continue; }
          if (other.v === t.v && !mergedIds.has(other.id)) {
            // la tessera che si muove entra in quella ferma e sparisce
            x = nx; y = ny; t.dying = true; t.life = 0.14; mergedIds.add(other.id);
            other.v *= 2; other.pop = 1; score += other.v; merged++;
            api.beep(300 + Math.min(900, other.v * 2), 0.06, 'square', 0.04);
            if (other.v === 2048 && !won) { won = true; msg = '2048!'; msgT = 2; api.haptic(40); }
          }
          break;
        }
        if (x !== t.x || y !== t.y) moved = true;
        t.x = x; t.y = y;
      }
      if (!moved) { api.haptic(3); return; }
      undoState = before;
      api.haptic(merged ? 14 : 5);
      spawn();
      if (score > best) { best = score; api.store.set('hi', best); }
      if (!canMove()) { state = 'over'; api.haptic(40); }
      save();
    };

    // Swipe: scatta appena il dito si è spostato abbastanza, senza aspettare che lo si sollevi.
    let sw = null;
    const onPointer = e => {
      if (e.type === 'down') { if (state === 'over') { newGame(); return; } sw = { id: e.id, x: e.x, y: e.y, done: false }; }
      else if (e.type === 'move' && sw && e.id === sw.id && !sw.done) {
        const dx = e.x - sw.x, dy = e.y - sw.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 26) {
          sw.done = true;
          slide(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        }
      } else if (e.type === 'up' && sw && e.id === sw.id) sw = null;
    };

    const act = k => {
      if (k === 'left' || k === 'right' || k === 'up' || k === 'down') slide(k);
      else if (k === 'b' || k === 'a') {
        if (k === 'b' && undoState) { restore(undoState); undoState = null; state = 'play'; api.haptic(10); save(); }
      } else if (k === 'select' || (k === 'start' && state === 'over')) newGame();
    };

    const update = dt => {
      msgT = Math.max(0, msgT - dt);
      for (const t of tiles) {
        const [tx, ty] = cellPos(t.x, t.y);
        const f = Math.min(1, dt * 22);
        t.px += (tx - t.px) * f; t.py += (ty - t.py) * f;
        t.pop = Math.max(0, t.pop - dt * 5);
        if (t.dying) t.life -= dt;
      }
      tiles = tiles.filter(t => !(t.dying && t.life <= 0));
    };

    // Disegno
    const text = (s, x, y, size, align, c) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'middle'; g.fillStyle = c || PAL[3];
      g.fillText(s, x, y);
    };
    const round = (x, y, w, h, r, c) => {
      g.fillStyle = c; g.beginPath();
      if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h);
      g.fill();
    };

    const render = () => {
      g.fillStyle = PAL[0]; g.fillRect(0, 0, W, H);
      text('2048', 22, 40, 34, 'left', '#a655b8');
      round(W - 224, 18, 100, 46, 8, PAL[1]); text('PUNTI', W - 174, 30, 10, 'center', '#aab3d8'); text(String(score), W - 174, 50, 18, 'center');
      round(W - 116, 18, 100, 46, 8, PAL[1]); text('RECORD', W - 66, 30, 10, 'center', '#aab3d8'); text(String(best), W - 66, 50, 18, 'center');
      text('SWIPE PER MUOVERE', 22, 86, 11, 'left', '#aab3d8');
      if (undoState) text('B = ANNULLA', W - 16, 86, 11, 'right', '#f5d31c');

      round(BX, BY, BOARD, BOARD, 12, PAL[1]);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const [px, py] = cellPos(x, y); round(px, py, CELL, CELL, 8, '#2a3566'); }

      const sorted = tiles.slice().sort((a, b) => (a.dying ? 0 : 1) - (b.dying ? 0 : 1));
      for (const t of sorted) {
        const [bg, fg] = TILE[t.v] || ['#eef1ff', '#141a2e'];
        const s = 1 + t.pop * 0.18, sz = CELL * s, off = (CELL - sz) / 2;
        round(t.px + off, t.py + off, sz, sz, 8, bg);
        text(String(t.v), t.px + CELL / 2, t.py + CELL / 2 + 1, t.v < 100 ? 30 : t.v < 1000 ? 26 : 20, 'center', fg);
      }

      text('SCORRI IN QUALSIASI DIREZIONE', W / 2, BY + BOARD + 34, 11, 'center', '#aab3d8');
      if (msgT > 0) text(msg, W / 2, BY - 8, 28, 'center', '#f5d31c');
      if (state === 'over') {
        g.fillStyle = 'rgba(11,16,32,.82)'; g.fillRect(BX, BY, BOARD, BOARD);
        text('FINE PARTITA', W / 2, BY + BOARD / 2 - 14, 24, 'center');
        text('TOCCA PER RIPROVARE', W / 2, BY + BOARD / 2 + 22, 13, 'center', '#f5d31c');
      }
    };

    const saved = api.store.get('save', null);
    if (saved && saved.tiles && saved.tiles.length) { restore(saved); if (!canMove()) newGame(); } else newGame();
    return {
      onPress: act,
      onPointer,
      update,
      render,
      debug: { slide, get tiles() { return tiles; }, get score() { return score; }, get state() { return state; } },
    };
  },
});

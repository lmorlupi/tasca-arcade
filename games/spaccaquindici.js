registerGame({
  id: 'spaccaquindici', title: 'SPACCAQUINDICI', license: 'MIT', color: '#f5b95f',
  blurb: "Rimetti in ordine le tessere, anche 3×3 o con la foto di Margot.",
  inputs: ['TOCCO', 'SWIPE', 'D-PAD'], size: [360, 600], flexH: true, flexMin: 1.35, fillHeight: true, bg: '#151326',
  create(api) {
    const { cv, g } = api;
    let W = cv.width, H = cv.height, S = Math.min(W - 28, H - 180), X = (W - S) / 2;
    const Y = 90, GAP = 6;
    const photo = new Image(); photo.src = 'art/margot-face.jpg';
    let n = 4, picture = false, board = [], positions = {}, history = [], moves = 0, elapsed = 0;
    let state = 'play', pointer = null, hint = 0, best = 0, score = 0;
    const solved = a => a.every((v, i) => v === (i + 1) % a.length);
    const cell = () => (S - GAP * (n + 1)) / n;
    const target = i => ({ x: X + GAP + i % n * (cell() + GAP), y: Y + GAP + Math.floor(i / n) * (cell() + GAP) });
    const valid = s => {
      if (!s || ![3, 4].includes(s.n) || !Array.isArray(s.board) || s.board.length !== s.n * s.n) return false;
      if (new Set(s.board).size !== s.board.length || !s.board.every(v => Number.isInteger(v) && v >= 0 && v < s.board.length)) return false;
      let inversions = 0;
      s.board.forEach((v, i) => { if (v) for (let j = i + 1; j < s.board.length; j++) if (s.board[j] && v > s.board[j]) inversions++; });
      return s.n % 2 ? inversions % 2 === 0 : (inversions + s.n - Math.floor(s.board.indexOf(0) / s.n)) % 2 === 1;
    };
    const save = () => api.store.set('save', { n, picture, board, moves, elapsed, history: history.slice(-60) });
    const refreshBest = () => { best = api.store.get('best-' + n + (picture ? '-photo' : ''), 0); };
    const reset = () => {
      board = Array.from({ length: n * n }, (_, i) => (i + 1) % (n * n));
      let empty = board.length - 1, previous = -1;
      // Se mescoliamo con mosse legali, il puzzle resta sempre risolvibile.
      for (let step = 0; step < (n === 3 ? 45 : 110); step++) {
        const near = board.map((_, i) => i).filter(i => i !== previous && Math.abs(i % n - empty % n) + Math.abs(Math.floor(i / n) - Math.floor(empty / n)) === 1);
        const next = near[Math.floor(Math.random() * near.length)];
        [board[next], board[empty]] = [board[empty], board[next]]; previous = empty; empty = next;
      }
      if (solved(board)) { const i = empty - 1; [board[i], board[empty]] = [board[empty], board[i]]; }
      positions = {}; board.forEach((v, i) => { positions[v] = target(i); });
      state = 'play'; moves = 0; elapsed = 0; history = []; pointer = null; score = 0;
      refreshBest(); save();
    };
    const win = () => {
      state = 'won';
      score = Math.max(1, Math.round(n * n * 1000 / (1 + moves * 0.7 + elapsed * 0.12)));
      if (!best || elapsed < best) { best = Math.max(0.1, elapsed); api.store.set('best-' + n + (picture ? '-photo' : ''), best); }
      if (score > api.store.get('hi', 0)) api.store.set('hi', score);
      api.haptic(35); api.beep(1046, 0.15); api.fx.burst(W / 2, Y + S / 2, { n: 65, color: ['#f5b95f', '#9c8fff', '#fff'], speed: 240, gravity: 160, life: 1.1 });
    };
    const move = i => {
      if (state !== 'play' || i < 0 || i >= board.length) return;
      const empty = board.indexOf(0);
      if (Math.abs(i % n - empty % n) + Math.abs(Math.floor(i / n) - Math.floor(empty / n)) !== 1) { hint = 0.3; return; }
      history.push(board.slice()); if (history.length > 60) history.shift();
      [board[i], board[empty]] = [board[empty], board[i]]; moves++;
      api.haptic(5); api.beep(300 + board[empty] * 22, 0.035, 'triangle', 0.035);
      if (solved(board)) win(); save();
    };
    const blank = dir => {
      const e = board.indexOf(0), x = e % n, y = Math.floor(e / n);
      const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      if (x + dx >= 0 && x + dx < n && y + dy >= 0 && y + dy < n) move(e + dx + dy * n);
    };
    const undo = () => {
      if (!history.length || state === 'pause') return;
      board = history.pop(); moves = Math.max(0, moves - 1); state = 'play'; api.haptic(8); save();
    };
    const pause = () => { if (state === 'play') { state = 'pause'; save(); } else if (state === 'pause') state = 'play'; pointer = null; };
    const button = (e, x, w) => e.x >= x && e.x <= x + w && e.y >= H - 70 && e.y <= H - 34;
    const onPointer = e => {
      if (e.type === 'down') { pointer = { id: e.id, x: e.x, y: e.y }; return; }
      if (e.type !== 'up' || !pointer || pointer.id !== e.id) return;
      const from = pointer; pointer = null; if (e.cancelled) return;
      if (button(e, 14, 100)) { n = n === 4 ? 3 : 4; reset(); return; }
      if (button(e, 122, 112)) { picture = !picture; refreshBest(); save(); return; }
      if (button(e, 242, 104)) { undo(); return; }
      if (state === 'pause') { pause(); return; }
      if (state === 'won') { reset(); return; }
      if (from.x < X || from.x > X + S || from.y < Y || from.y > Y + S) return;
      const dx = e.x - from.x, dy = e.y - from.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 22) {
        blank(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : (dy > 0 ? 'up' : 'down'));
      } else {
        const cx = Math.floor((e.x - X - GAP) / (cell() + GAP)), cy = Math.floor((e.y - Y - GAP) / (cell() + GAP));
        if (cx >= 0 && cx < n && cy >= 0 && cy < n) move(cy * n + cx);
      }
    };
    const text = (s, x, y, size = 13, color = '#f1edff', align = 'left') => {
      g.font = `bold ${size}px ui-monospace, monospace`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
    };
    const round = (x, y, w, h, r, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
    const time = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    const render = () => {
      const back = g.createLinearGradient(0, 0, W, H); back.addColorStop(0, '#28203f'); back.addColorStop(1, '#100f21'); g.fillStyle = back; g.fillRect(0, 0, W, H);
      text('SPACCAQUINDICI', 16, 29, 20, '#f5b95f'); text(time(elapsed), W - 16, 29, 20, '#fff', 'right');
      text(`${n * n - 1} TESSERE · ${picture ? 'MARGOT' : 'CLASSICO'}`, 16, 56, 12, '#bfb3d8'); text(moves + ' MOSSE', W - 16, 56, 12, '#bfb3d8', 'right');
      round(X - 2, Y - 2, S + 4, S + 7, 15, '#080915'); round(X, Y, S, S, 13, '#342b4b');
      for (let i = 0; i < board.length; i++) { const p = target(i); round(p.x, p.y, cell(), cell(), 7, '#181426'); }
      board.forEach((v, i) => {
        if (!v) return;
        const p = positions[v] || target(i), correct = v === i + 1, c = cell();
        round(p.x, p.y + 3, c, c, 8, '#080915');
        g.save(); g.beginPath(); g.roundRect(p.x, p.y, c, c, 8); g.clip();
        if (picture && photo.complete && photo.naturalWidth) {
          const side = Math.min(photo.naturalWidth, photo.naturalHeight), at = v - 1;
          g.drawImage(photo, (photo.naturalWidth - side) / 2 + at % n * side / n, (photo.naturalHeight - side) / 2 + Math.floor(at / n) * side / n, side / n, side / n, p.x, p.y, c, c);
          round(p.x + 4, p.y + 4, 25, 22, 5, 'rgba(10,10,20,.7)'); text(String(v), p.x + 16.5, p.y + 15, 13, '#fff', 'center');
        } else {
          const tile = g.createLinearGradient(0, p.y, 0, p.y + c); tile.addColorStop(0, correct ? '#ffe5a5' : '#b7a4ea'); tile.addColorStop(1, correct ? '#d49a48' : '#7560a8');
          g.fillStyle = tile; g.fillRect(p.x, p.y, c, c); g.fillStyle = '#ffffff33'; g.fillRect(p.x, p.y, c, 4);
          text(String(v), p.x + c / 2, p.y + c / 2, n === 4 ? 27 : 36, '#241932', 'center');
        }
        g.restore();
      });
      if (hint > 0) text('MUOVI UNA TESSERA VICINA AL VUOTO', W / 2, Y - 13, 11, '#ffe1a0', 'center');
      for (const [x, w, label] of [[14, 100, n === 4 ? '3×3 FACILE' : '4×4 CLASSICO'], [122, 112, picture ? 'USA NUMERI' : 'FOTO MARGOT'], [242, 104, 'B ANNULLA']]) {
        round(x, H - 70, w, 36, 8, '#3a3053'); text(label, x + w / 2, H - 52, 11, '#eee5ff', 'center');
      }
      text('TOCCA O SCORRI · SELECT: NUOVO', W / 2, H - 17, 12, '#baafd0', 'center');
      if (state === 'pause' || state === 'won') {
        round(X, Y, S, S, 13, 'rgba(12,11,26,.9)');
        text(state === 'won' ? 'RISOLTO!' : 'PAUSA', W / 2, Y + S / 2 - 38, 30, '#ffe5a5', 'center');
        text(state === 'won' ? time(elapsed) + ' · ' + moves + ' MOSSE' : 'LA PARTITA È SALVATA', W / 2, Y + S / 2 + 2, 15, '#fff', 'center');
        text(state === 'won' ? 'RECORD ' + time(best) : 'START O TOCCA PER RIPRENDERE', W / 2, Y + S / 2 + 31, 12, '#baafd0', 'center');
        if (state === 'won') text('A O TOCCA: UN ALTRO PUZZLE', W / 2, Y + S / 2 + 64, 12, '#ffe5a5', 'center');
      }
    };
    const loaded = api.store.get('save', null);
    if (valid(loaded)) {
      n = loaded.n; picture = !!loaded.picture; board = loaded.board.slice(); moves = Math.max(0, Number(loaded.moves) || 0); elapsed = Math.max(0, Number(loaded.elapsed) || 0);
      history = Array.isArray(loaded.history) ? loaded.history.filter(a => valid({ n, board: a })).slice(-60) : [];
      board.forEach((v, i) => { positions[v] = target(i); }); state = solved(board) ? 'won' : 'play'; refreshBest();
    } else reset();
    let saveClock = 0;
    return {
      render, onPointer,
      onResize(w, h) {
        W = w; H = h; S = Math.min(W - 28, H - 180); X = (W - S) / 2; pointer = null;
        board.forEach((v, i) => { positions[v] = target(i); });
      },
      update(dt) {
        if (state === 'play') { elapsed += dt; saveClock += dt; if (saveClock > 5) { saveClock = 0; save(); } }
        hint = Math.max(0, hint - dt);
        board.forEach((v, i) => { const p = positions[v], q = target(i); if (p) { p.x += (q.x - p.x) * Math.min(1, dt * 24); p.y += (q.y - p.y) * Math.min(1, dt * 24); } });
      },
      onPress(k) { if (k === 'start') pause(); else if (k === 'select' || (k === 'a' && state === 'won')) reset(); else if (k === 'b') undo(); else if (['left', 'right', 'up', 'down'].includes(k)) blank(k); },
      onHide() { if (state === 'play') state = 'pause'; pointer = null; save(); },
      destroy: save,
      debug: { get board() { return board.slice(); }, get state() { return state; }, get moves() { return moves; }, get elapsed() { return elapsed; }, get n() { return n; }, get layout() { return { x: X, y: Y, size: S, cell: cell(), gap: GAP, width: W, height: H }; } },
    };
  },
});

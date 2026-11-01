registerGame({
  id: 'blocks',
  title: 'BLOCKS',
  color: '#25c4f0',
  blurb: 'Incastra i pezzi e completa le righe. Tocca per ruotare, trascina per spostare, scatta in basso per far cadere.',
  inputs: ['SWIPE', 'TAP', 'D-PAD'],
  size: [340, 626],
  create(api) {
    const { cv, g } = api;
    const COLS = 10, ROWS = 18, S = 4, C = 8 * S;
    const PAL = ['#141a2e', '#1f2744', '#5a6aa0', '#eef1ff'];
    const COLORS = ['#25c4f0', '#f5d31c', '#a655b8', '#4cc24a', '#e5413b', '#3d5fe0', '#f58a25'];

    // Forme in matrici quadrate; la rotazione si calcola.
    const SHAPES = [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[1,1],[1,1]],
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,1],[1,1,0],[0,0,0]],
      [[1,1,0],[0,1,1],[0,0,0]],
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,0,1],[1,1,1],[0,0,0]],
    ];
    const rotCW = m => m[0].map((_, i) => m.map(r => r[i]).reverse());
    const rotCCW = m => m[0].map((_, i) => m.map(r => r[r.length - 1 - i]));

    let hi = api.store.get('hi', 0);
    let board, cur, next, bag = [], score = 0, lines = 0, level = 0, state = 'title';
    let gravT = 0, clearT = 0, clearRows = [], lockT = 0, lockResets = 0;

    const newBag = () => {
      const b = [0,1,2,3,4,5,6];
      for (let i = b.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [b[i], b[j]] = [b[j], b[i]]; }
      return b;
    };
    const draw7 = () => { if (!bag.length) bag = newBag(); return bag.pop(); };
    const makePiece = t => {
      const m = SHAPES[t].map(r => r.slice());
      return { t, m, x: ((COLS - m.length) / 2) | 0, y: t === 0 ? -1 : 0 };
    };

    const valid = (m, x, y) => {
      for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
        if (!m[r][c]) continue;
        const nx = x + c, ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return false;
        if (ny >= 0 && board[ny][nx] !== null) return false;
      }
      return true;
    };

    const reset = () => {
      board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      score = 0; lines = 0; level = 0; bag = [];
      next = makePiece(draw7());
      spawn();
      state = 'play'; gravT = 0;
    };
    const spawn = () => {
      cur = next; next = makePiece(draw7()); lockT = 0; lockResets = 0;
      if (!valid(cur.m, cur.x, cur.y)) gameOver();
    };
    const gameOver = () => {
      state = 'over';
      if (score > hi) { hi = score; api.store.set('hi', hi); }
      api.haptic(40);
    };

    const move = (dx, dy) => {
      if (valid(cur.m, cur.x + dx, cur.y + dy)) { cur.x += dx; cur.y += dy; return true; }
      return false;
    };
    const rotate = cw => {
      if (cur.t === 1) return false;
      const m = cw ? rotCW(cur.m) : rotCCW(cur.m);
      for (const [kx, ky] of [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1]]) {
        if (valid(m, cur.x + kx, cur.y + ky)) { cur.m = m; cur.x += kx; cur.y += ky; return true; }
      }
      return false;
    };
    // Un movimento riuscito a terra rimanda il blocco, ma non all'infinito.
    const bump = () => { if (lockResets < 15) { lockT = 0; lockResets++; } };

    const lock = () => {
      api.haptic(10);
      cur.m.forEach((row, r) => row.forEach((v, c) => {
        if (v && cur.y + r >= 0) board[cur.y + r][cur.x + c] = cur.t;
      }));
      clearRows = [];
      for (let r = 0; r < ROWS; r++) if (board[r].every(v => v !== null)) clearRows.push(r);
      if (clearRows.length) { state = 'clear'; clearT = 0; api.beep(660 + clearRows.length * 120, 0.12); api.haptic(25); }
      else { api.beep(180, 0.04); spawn(); }
      gravT = 0;
    };
    const finishClear = () => {
      const n = clearRows.length;
      board = board.filter((_, i) => !clearRows.includes(i));
      while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
      score += [0, 40, 100, 300, 1200][n] * (level + 1);
      lines += n; level = (lines / 10) | 0;
      clearRows = [];
      state = 'play';
      spawn();
    };

    const interval = () => Math.max(70, 800 - level * 75);

    // Azioni singole e ripetizione per sinistra/destra/giù.
    const held = {};
    const act = (k, rep) => {
      if (k === 'start') {
        if (state === 'title' || state === 'over') reset();
        else if (state === 'play') state = 'pause';
        else if (state === 'pause') state = 'play';
        return;
      }
      if (k === 'select') { if (state !== 'title') reset(); return; }
      if (state !== 'play') return;
      if (k === 'left') { if (move(-1, 0)) bump(); }
      else if (k === 'right') { if (move(1, 0)) bump(); }
      else if (k === 'down') { if (move(0, 1)) { score++; gravT = 0; } else if (!rep) lock(); }
      else if (k === 'up') { let d = 0; while (move(0, 1)) d++; score += d * 2; api.haptic(20); lock(); }
      else if (k === 'a') { if (rotate(true)) { bump(); api.haptic(5); api.beep(520, 0.02); } }
      else if (k === 'b') { if (rotate(false)) { bump(); api.haptic(5); api.beep(480, 0.02); } }
    };
    const press = k => { if (held[k]) return; held[k] = { t: 0, rep: false }; act(k); };
    const release = k => { delete held[k]; };

    const repeat = dt => {
      for (const k of ['left', 'right', 'down']) {
        const s = held[k]; if (!s) continue;
        s.t += dt * 1000;
        const delay = k === 'down' ? 35 : (s.rep ? 45 : 130);
        while (s.t >= delay) { s.t -= delay; s.rep = true; act(k, true); if (state !== 'play') break; }
      }
    };

    // Gesti sullo schermo: tocca = ruota (metà sinistra B, destra A), trascina = muovi, scatto in giù = caduta.
    let sw = null;
    const onPointer = e => {
      if (e.type === 'down') {
        if (sw) return;
        sw = { id: e.id, x: e.x, y: e.y, ax: e.x, ay: e.y, t: e.t, moved: false };
      } else if (e.type === 'move') {
        if (!sw || e.id !== sw.id || state !== 'play') return;
        if (Math.hypot(e.x - sw.x, e.y - sw.y) > 18) sw.moved = true;
        while (e.x - sw.ax >= C) { act('right'); sw.ax += C; }
        while (sw.ax - e.x >= C) { act('left'); sw.ax -= C; }
        while (e.y - sw.ay >= C * 1.3) { act('down', true); sw.ay += C * 1.3; }
        if (e.y < sw.ay) sw.ay = e.y;
      } else if (e.type === 'up') {
        if (!sw || e.id !== sw.id) return;
        const s = sw; sw = null;
        if (e.cancelled) return;
        const dt = e.t - s.t, dx = e.x - s.x, dy = e.y - s.y;
        if (state !== 'play') { if (!s.moved) act('start'); return; }
        if (dy > 70 && dy / dt > 1 && Math.abs(dx) < dy * 0.6) act('up');
        else if (!s.moved && dt < 300) act(e.x < cv.width / 2 ? 'b' : 'a');
      }
    };

    // Disegno: campo a tutta larghezza, striscia con i dati in alto.
    const FX = 10, FY = 46, FW = COLS * C, FH = ROWS * C;
    const rect = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const cell = (px, py, type, size = C) => {
      const u = size / 8;
      rect(px, py, size, size, 'rgba(0,0,0,.45)');
      rect(px, py, size - u, size - u, COLORS[type]);
      rect(px, py, size - u, u, 'rgba(255,255,255,.55)');
      rect(px, py, u, size - u, 'rgba(255,255,255,.35)');
      rect(px + 2 * u, py + 2 * u, size - 5 * u, size - 5 * u, 'rgba(255,255,255,.12)');
    };
    const text = (s, x, y, px, align, c) => {
      g.font = `bold ${px}px ui-monospace, Menlo, Consolas, monospace`;
      g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || PAL[3];
      g.fillText(s, x, y);
    };

    const banner = rows => {
      const w = FW - 24, h = rows.length * 40 + 24, x = 12, y = (FH - h) / 2;
      rect(x, y, w, h, PAL[3]);
      rect(x + 3, y + 3, w - 6, h - 6, PAL[0]);
      rows.forEach((t, i) => text(t, FW / 2, y + 14 + i * 40, 26, 'center'));
    };

    const drawTitle = () => {
      const w = cv.width;
      text('BLOCKS', w / 2, 170, 64, 'center');
      rect(w / 2 - 110, 250, 220, 3, PAL[3]);
      if (((performance.now() / 500) | 0) % 2 === 0) text('PREMI START', w / 2, 330, 28, 'center', '#f5d31c');
      text('RECORD ' + hi, w / 2, 392, 22, 'center');
      text('TOCCA: RUOTA', w / 2, 470, 18, 'center', '#aab3d8');
      text('TRASCINA: MUOVI', w / 2, 498, 18, 'center', '#aab3d8');
      text('SCATTO IN BASSO: CADE', w / 2, 526, 18, 'center', '#aab3d8');
    };

    const render = () => {
      rect(0, 0, cv.width, cv.height, PAL[0]);
      if (state === 'title') { drawTitle(); return; }

      // dati
      text('LV ' + level, 12, 6, 16); text('RIGHE ' + lines, 66, 6, 16); text('PUNTI ' + score, 160, 6, 16);
      text('RECORD ' + hi, 12, 27, 12, 'left', '#aab3d8');
      rect(274, 4, 58, 34, PAL[3]); rect(276, 6, 54, 30, PAL[0]);
      const nm = next.m.filter(r => r.some(v => v));
      const nc = Math.max(...next.m.map(r => r.lastIndexOf(1))) + 1;
      const first = Math.min(...next.m.map(r => r.indexOf(1)).filter(i => i >= 0));
      const w = nc - first, h = nm.length, cs = 10;
      nm.forEach((row, r) => row.forEach((v, c) => {
        if (v) cell(276 + (54 - w * cs) / 2 + (c - first) * cs, 6 + (30 - h * cs) / 2 + r * cs, next.t, cs);
      }));

      // campo
      g.save(); g.translate(FX, FY);
      rect(0, 0, FW, FH, '#0f1527');
      for (let c = 1; c < COLS; c++) rect(c * C, 0, 1, FH, PAL[1]);
      for (let r = 1; r < ROWS; r++) rect(0, r * C, FW, 1, PAL[1]);
      g.strokeStyle = PAL[2]; g.lineWidth = 3; g.strokeRect(-1.5, -1.5, FW + 3, FH + 3);
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const v = board[r][c];
        if (v === null) continue;
        if (state === 'clear' && clearRows.includes(r) && ((clearT / 80) | 0) % 2 === 0) continue;
        cell(c * C, r * C, v);
      }
      if (state === 'play') {
        let gy = cur.y; while (valid(cur.m, cur.x, gy + 1)) gy++;
        if (gy !== cur.y) {
          g.strokeStyle = COLORS[cur.t]; g.globalAlpha = .6; g.lineWidth = S;
          cur.m.forEach((row, r) => row.forEach((v, c) => {
            if (v && gy + r >= 0) g.strokeRect((cur.x + c) * C + S, (gy + r) * C + S, C - 2 * S, C - 2 * S);
          }));
          g.globalAlpha = 1;
        }
      }
      if (state === 'play' || state === 'pause' || state === 'over') {
        cur.m.forEach((row, r) => row.forEach((v, c) => {
          if (v && cur.y + r >= 0) cell((cur.x + c) * C, (cur.y + r) * C, cur.t);
        }));
      }
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'over') banner(['GAME OVER', 'PUNTI ' + score, 'TOCCA']);
      g.restore();
    };

    return {
      onPress(k) { press(k); },
      onRelease(k) { release(k); },
      onPointer,
      onHide() { if (state === 'play') state = 'pause'; },
      update(dt) {
        if (state === 'play') {
          repeat(dt);
          if (state === 'play') {
            if (valid(cur.m, cur.x, cur.y + 1)) {
              gravT += dt * 1000;
              if (gravT >= interval()) { gravT = 0; lockT = 0; move(0, 1); }
            } else {
              lockT += dt * 1000;
              if (lockT >= Math.max(150, Math.min(450, interval() * 3))) lock();
            }
          }
        } else if (state === 'clear') {
          clearT += dt * 1000;
          if (clearT >= 400) finishClear();
        }
      },
      render,
    };
  },
});

// DAMA ITALIANA: contro il telefono. Regole: le pedine muovono e catturano solo in avanti, la pedina non può mangiare la dama,
// la presa è obbligatoria e si deve scegliere quella che prende più pezzi (e più dame).
registerGame({
  id: 'dama',
  title: 'DAMA',
  author: 'Tasca Arcade',
  license: 'MIT',
  color: '#c98a52',
  blurb: "Sfida il telefono a dama italiana, con prese obbligatorie.",
  inputs: ['TOCCO', 'SCACCHIERA'],
  size: [360, 600],
  bg: '#2a1a10',
  flexH: true,
  flexMin: 1.1,
  create(api) {
    const { cv, g } = api;
    const CW = cv.width, CH = cv.height, VW = 360, VH = 600;
    const S = Math.min(CW / VW, CH / VH), OX = (CW - VW * S) / 2, OY = (CH - VH * S) / 2;
    const SQ = 44, BX = (VW - 8 * SQ) / 2, BY = 112;
    // pezzi: 1 pedina bianca, 2 dama bianca, -1 pedina nera, -2 dama nera. Il bianco (giocatore) sale verso la riga 0.
    let wins = api.store.get('wins', 0), level = api.store.get('lvl', 2);
    let state = 'title', time = 0, board, turn, sel = null, legal = [], msg = '', msgT = 0, last = null, anim = null, wait = 0, endMsg = '', drag = null;
    const flash = t => { msg = t; msgT = 1.5; };
    const init = () => { const b = Array.from({ length: 8 }, () => new Array(8).fill(0)); for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) { if (r < 3) b[r][c] = -1; else if (r > 4) b[r][c] = 1; } return b; };
    const side = p => (p > 0 ? 1 : p < 0 ? -1 : 0);
    // elenco delle mosse di un colore, con la regola della presa obbligatoria e della maggioranza
    const movesFor = (b, col) => {
      const caps = [], steps = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const p = b[r][c]; if (side(p) !== col) continue;
        const king = Math.abs(p) === 2, fwd = col === 1 ? -1 : 1;
        const dirs = king ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[fwd, 1], [fwd, -1]];
        const walk = (cr, cc, path, taken, isKing) => {
          let more = false;
          for (const [dr, dc] of isKing ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[fwd, 1], [fwd, -1]]) {
            const mr = cr + dr, mc = cc + dc, lr = cr + 2 * dr, lc = cc + 2 * dc;
            if (lr < 0 || lr > 7 || lc < 0 || lc > 7) continue;
            const t = b[mr][mc]; if (side(t) !== -col || taken.some(([x, y]) => x === mr && y === mc)) continue;
            if (!isKing && Math.abs(t) === 2) continue;                       // la pedina non mangia la dama
            const landing = b[lr][lc]; const free = landing === 0 || (lr === r && lc === c);
            if (!free) continue;
            more = true; const nt = taken.concat([[mr, mc]]), np = path.concat([[lr, lc]]);
            const promo = !isKing && ((col === 1 && lr === 0) || (col === -1 && lr === 7));
            if (promo) caps.push({ path: np, taken: nt, king: isKing, promo: true }); else walk(lr, lc, np, nt, isKing);
          }
          if (!more && taken.length) caps.push({ path, taken, king: isKing });
        };
        walk(r, c, [[r, c]], [], king);
        for (const [dr, dc] of dirs) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && b[nr][nc] === 0) steps.push({ path: [[r, c], [nr, nc]], taken: [] }); }
      }
      if (caps.length) {
        const kings = m => m.taken.filter(([x, y]) => Math.abs(b[x][y]) === 2).length;
        const mx = Math.max(...caps.map(m => m.taken.length)); let best = caps.filter(m => m.taken.length === mx);
        const mk = Math.max(...best.map(kings)); return best.filter(m => kings(m) === mk);
      }
      return steps;
    };
    const apply = (b, m) => {
      const nb = b.map(r => r.slice()), [sr, sc] = m.path[0], [er, ec] = m.path[m.path.length - 1]; let p = nb[sr][sc];
      nb[sr][sc] = 0; m.taken.forEach(([x, y]) => { nb[x][y] = 0; });
      if (Math.abs(p) === 1 && ((p > 0 && er === 0) || (p < 0 && er === 7))) p = p * 2;
      nb[er][ec] = p; return nb;
    };
    const evalB = b => { let s = 0; for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = b[r][c]; if (!p) continue; const k = Math.abs(p) === 2; let v = k ? 300 : 100; if (!k) v += (p > 0 ? 7 - r : r) * 4; if (c === 0 || c === 7) v += 3; s += side(p) * v; } return s; };
    const search = (b, col, depth, a, bb) => {
      const ms = movesFor(b, col);
      if (!ms.length) return col === -1 ? 10000 + depth : -10000 - depth;           // chi non puo' muovere perde (vista dal nero: +)
      if (depth === 0) return -evalB(b);
      let best = -Infinity;
      for (const m of ms) { const v = -search(apply(b, m), -col, depth - 1, -bb, -a); if (v > best) best = v; if (best > a) a = best; if (a >= bb) break; }
      return best;
    };
    const cpuMove = () => {
      const ms = movesFor(board, -1); if (!ms.length) return null;
      const depth = [2, 3, 5][level - 1] || 3; let best = null, bv = -Infinity;
      for (const m of ms.sort(() => Math.random() - 0.5)) { const v = -search(apply(board, m), 1, depth - 1, -Infinity, Infinity); if (v > bv) { bv = v; best = m; } }
      return best;
    };
    const newGame = () => { board = init(); turn = 1; sel = null; legal = []; last = null; anim = null; endMsg = ''; state = 'play'; flash('TOCCA A TE: SPOSTA UNA PEDINA'); };
    const check = () => {
      const ms = movesFor(board, turn);
      if (!ms.length) { state = 'end'; endMsg = turn === 1 ? 'HAI PERSO' : 'HAI VINTO!'; if (turn === -1) { wins++; api.store.set('wins', wins); [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => api.beep(f, 0.14, 'triangle', 0.08), k * 110)); api.haptic(50); } else api.beep(180, 0.3, 'sawtooth', 0.07); return true; }
      return false;
    };
    const doMove = (m, who) => {
      const [sr, sc] = m.path[0], [er, ec] = m.path[m.path.length - 1]; last = { from: [sr, sc], to: [er, ec], who, path: m.path };
      // Per l'animazione: la pedina percorre il cammino un salto alla volta, le prese svaniscono quando ci passa sopra.
      anim = { t0: time, seg: who === 1 ? 0.2 : 0.3, path: m.path, p: board[sr][sc], taken: m.taken.map(([x, y]) => [x, y, board[x][y]]) };
      board = apply(board, m); sel = null; legal = [];
      api.beep(who === 1 ? 420 : 360, 0.05, 'square', 0.08); api.beep(1700, 0.01, 'square', 0.04);
      if (m.taken.length) { api.haptic(who === 1 ? 25 : 10); api.beep(220, 0.1, 'triangle', 0.09); flash((who === 1 ? 'PRENDI ' : 'PRENDE IL TELEFONO ') + m.taken.length); }
      turn = -who; if (check()) return; if (turn === -1) { state = 'think'; wait = Math.max(0.6, animLen() + 0.25); } else if (movesFor(board, 1)[0] && movesFor(board, 1)[0].taken.length) flash('PRESA OBBLIGATORIA');
    };
    const animLen = () => anim ? anim.seg * (anim.path.length - 1) : 0;
    const moving = () => anim && time - anim.t0 < animLen();
    const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      if (state === 'think') { wait -= dt; if (wait <= 0) { state = 'play'; const m = cpuMove(); if (m) doMove(m, -1); } }
    };
    const toRC = (x, y) => [Math.floor((y - BY) / SQ), Math.floor((x - BX) / SQ)];
    const onPointer = e => {
      const x = (e.x - OX) / S, y = (e.y - OY) / S;
      // trascinamento: la pedina selezionata segue il dito e si posa sulla casella dove lo rilasci
      if (e.type === 'move') { if (drag) { drag.x = x; drag.y = y; if (Math.hypot(x - drag.x0, y - drag.y0) > 6) drag.on = true; } return; }
      if (e.type === 'up') {
        const d = drag; drag = null;
        if (d && d.on && state === 'play' && turn === 1 && !moving() && sel) {
          const [r, c] = toRC(x, y);
          const m = movesFor(board, 1).find(m => m.path[0][0] === sel[0] && m.path[0][1] === sel[1] && m.path[m.path.length - 1][0] === r && m.path[m.path.length - 1][1] === c);
          if (e.cancelled) return; if (m) doMove(m, 1); else api.beep(160, 0.06, 'square', 0.07);
        }
        return;
      }
      if (e.type !== 'down') return;
      drag = null;
      if (state === 'title') { if (y > 330 && y < 440) { const k = Math.floor((x - 40) / 94); if (k >= 0 && k < 3 && y > 380) { level = k + 1; api.store.set('lvl', level); } if (y <= 380 || k < 0 || k > 2) { newGame(); return; } return; } newGame(); return; }
      if (state === 'end') { newGame(); return; }
      if (state === 'pause') { state = 'play'; return; }
      if (state !== 'play' || turn !== 1 || moving()) return;
      const [r, c] = toRC(x, y); if (r < 0 || r > 7 || c < 0 || c > 7) return;
      const ms = movesFor(board, 1);
      if (sel) { const m = ms.find(m => m.path[0][0] === sel[0] && m.path[0][1] === sel[1] && m.path[m.path.length - 1][0] === r && m.path[m.path.length - 1][1] === c); if (m) { doMove(m, 1); return; } }
      if (side(board[r][c]) === 1) { const mine = ms.filter(m => m.path[0][0] === r && m.path[0][1] === c); if (mine.length) { sel = [r, c]; legal = mine; drag = { x, y, x0: x, y0: y, on: false }; api.beep(900, 0.02, 'triangle', 0.05); } else { sel = null; legal = []; flash(ms[0] && ms[0].taken.length ? 'DEVI PRENDERE (MAGGIORANZA)' : 'QUELLA PEDINA NON PUO\' MUOVERE'); api.beep(160, 0.06, 'square', 0.07); } }
      else { sel = null; legal = []; }
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'end') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'select' && state !== 'title') newGame();
      else if (k === 'a' && (state === 'title' || state === 'end')) newGame();
    };
    const text = (s, x, y, size, align, c) => { g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#fff4e0'; g.fillText(s, x, y); };
    const banner = rows => { const h = rows.length * 26 + 16, w = 260, x = (VW - w) / 2, y = 250; g.fillStyle = '#fff4e0'; g.fillRect(x, y, w, h); g.fillStyle = '#2a1a10'; g.fillRect(x + 2, y + 2, w - 4, h - 4); rows.forEach((t, i) => text(t, VW / 2, y + 12 + i * 26, 18, 'center')); };
    const piece = (cx, cy, p, ring) => {
      const white = p > 0, king = Math.abs(p) === 2, r = SQ * 0.4;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(cx + 1, cy + r * 0.55, r, r * 0.5, 0, 0, 7); g.fill();
      const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.5, 2, cx, cy, r * 1.15); if (white) { gr.addColorStop(0, '#fffdf4'); gr.addColorStop(1, '#cdb98a'); } else { gr.addColorStop(0, '#6a4a3a'); gr.addColorStop(1, '#1e120c'); }
      g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = white ? '#8a7448' : '#000'; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = white ? 'rgba(120,90,40,.5)' : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(cx, cy, r * 0.68, 0, 7); g.stroke();
      if (king) { g.fillStyle = white ? '#c98a12' : '#f2c94c'; g.beginPath(); g.moveTo(cx - r * 0.45, cy + r * 0.2); g.lineTo(cx - r * 0.45, cy - r * 0.25); g.lineTo(cx - r * 0.2, cy); g.lineTo(cx, cy - r * 0.4); g.lineTo(cx + r * 0.2, cy); g.lineTo(cx + r * 0.45, cy - r * 0.25); g.lineTo(cx + r * 0.45, cy + r * 0.2); g.closePath(); g.fill(); }
      if (ring) { g.strokeStyle = '#ff5a8a'; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r + 3, 0, 7); g.stroke(); }
    };
    const render = () => {
      g.fillStyle = '#180e08'; g.fillRect(0, 0, CW, CH);
      g.save(); g.translate(OX, OY); g.scale(S, S);
      const bg = g.createRadialGradient(VW / 2, 300, 20, VW / 2, 300, 420); bg.addColorStop(0, '#4a2c18'); bg.addColorStop(1, '#1c0f08'); g.fillStyle = bg; g.fillRect(0, 0, VW, VH);
      if (state === 'title') {
        text('DAMA', VW / 2, 110, 54, 'center', '#ffe66a');
        piece(120, 250, 1); piece(180, 250, 2); piece(240, 250, -1); piece(150, 300, -2);
        text('TOCCA PER INIZIARE', VW / 2, 350 - 0, 16, 'center', '#fff4e0');
        text('LIVELLO CPU', VW / 2, 392, 11, 'center', '#c9b6a0');
        ['FACILE', 'MEDIO', 'ESPERTO'].forEach((n, k) => { g.fillStyle = level === k + 1 ? '#ffe66a' : 'rgba(255,255,255,.12)'; g.beginPath(); g.roundRect(40 + k * 94, 410, 86, 30, 8); g.fill(); text(n, 83 + k * 94, 419, 12, 'center', level === k + 1 ? '#1a1000' : '#fff4e0'); });
        text('PARTITE VINTE ' + wins, VW / 2, 480, 13, 'center'); g.restore(); return;
      }
      g.fillStyle = '#6a3d1c'; g.beginPath(); g.roundRect(BX - 10, BY - 10, 8 * SQ + 20, 8 * SQ + 20, 10); g.fill();
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { g.fillStyle = (r + c) % 2 ? '#8a5a30' : '#f0dcb0'; g.fillRect(BX + c * SQ, BY + r * SQ, SQ, SQ); }
      // Ultima mossa: la tua in giallo; quella del telefono in azzurro con la cornice, con gli appoggi dei salti multipli.
      if (last && last.who === -1) {
        const pulse = 1 + 0.6 * Math.max(0, 1 - (time - anim.t0 - animLen()) / 1.2) * Math.abs(Math.sin((time - anim.t0) * 6));
        for (const [[r, c], a, lw] of [[last.from, 0.22, 2], [last.to, 0.42, 3]]) {
          const x = BX + c * SQ, y = BY + r * SQ;
          g.fillStyle = 'rgba(90,200,255,' + a + ')'; g.fillRect(x, y, SQ, SQ);
          g.strokeStyle = 'rgba(40,150,230,' + Math.min(1, 0.6 * pulse) + ')'; g.lineWidth = lw; g.strokeRect(x + lw / 2, y + lw / 2, SQ - lw, SQ - lw);
        }
        g.strokeStyle = 'rgba(40,150,230,.7)'; g.lineWidth = 2;
        last.path.slice(1, -1).forEach(([r, c]) => { g.beginPath(); g.arc(BX + c * SQ + SQ / 2, BY + r * SQ + SQ / 2, SQ * 0.2, 0, 7); g.stroke(); });
      } else if (last) { g.fillStyle = 'rgba(255,230,120,.35)'; for (const [r, c] of [last.from, last.to]) g.fillRect(BX + c * SQ, BY + r * SQ, SQ, SQ); }
      legal.forEach(m => { const [r, c] = m.path[m.path.length - 1]; g.fillStyle = 'rgba(111,255,160,.55)'; g.beginPath(); g.arc(BX + c * SQ + SQ / 2, BY + r * SQ + SQ / 2, SQ * 0.18, 0, 7); g.fill(); });
      const go = moving(), end = anim && anim.path[anim.path.length - 1], u = go ? (time - anim.t0) / anim.seg : 0;
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const p = board[r][c]; if (p && !(go && r === end[0] && c === end[1]) && !(drag && drag.on && sel && sel[0] === r && sel[1] === c)) piece(BX + c * SQ + SQ / 2, BY + r * SQ + SQ / 2, p, sel && sel[0] === r && sel[1] === c); }
      if (drag && drag.on && sel) {
        const [hr, hc] = toRC(drag.x, drag.y);
        if (legal.some(m => { const e = m.path[m.path.length - 1]; return e[0] === hr && e[1] === hc; })) { g.fillStyle = 'rgba(111,255,160,.35)'; g.fillRect(BX + hc * SQ, BY + hr * SQ, SQ, SQ); }
        g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12; g.shadowOffsetY = 6; piece(drag.x, drag.y - 8, board[sel[0]][sel[1]], true); g.restore();
      }
      if (go) {
        // le pedine prese restano finché la pedina non ci salta sopra, poi svaniscono
        anim.taken.forEach(([r, c, p], i) => { const f = Math.max(0, Math.min(1, 1 - (u - i - 0.5) / 0.6)); if (f > 0) { g.save(); g.globalAlpha = f; piece(BX + c * SQ + SQ / 2, BY + r * SQ + SQ / 2, p); g.restore(); } });
        const i = Math.min(anim.path.length - 2, Math.floor(u)), k = ease(u - i), [r0, c0] = anim.path[i], [r1, c1] = anim.path[i + 1];
        const jump = Math.abs(r1 - r0) > 1 ? Math.sin(Math.PI * k) * 10 : Math.sin(Math.PI * k) * 3;
        piece(BX + (c0 + (c1 - c0) * k) * SQ + SQ / 2, BY + (r0 + (r1 - r0) * k) * SQ + SQ / 2 - jump, anim.p);
      }
      g.fillStyle = 'rgba(10,4,2,.7)'; g.fillRect(0, 0, VW, 60); text('DAMA', 14, 10, 18, 'left', '#ffe66a'); text(turn === 1 ? 'TOCCA A TE' : 'PENSA IL TELEFONO...', VW - 14, 12, 12, 'right', turn === 1 ? '#6fffa0' : '#c9b6a0');
      let w = 0, b = 0; board.forEach(row => row.forEach(p => { if (p > 0) w++; else if (p < 0) b++; })); text('TU ' + w + '   CPU ' + b + '   LIV ' + level, 14, 36, 12, 'left', '#fff4e0');
      if (msgT > 0) text(msg, VW / 2, BY + 8 * SQ + 26, 13, 'center', '#ffe66a');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'end') banner([endMsg, 'TOCCA']);
      g.restore();
    };
    board = init(); turn = 1;
    return {
      onPress: act, onPointer, onHide() { if (state === 'play') state = 'pause'; },
      update, render,
      debug: { newGame, get state() { return state; }, get board() { return board; }, get turn() { return turn; }, moves() { return movesFor(board, turn); }, doMove, cpuMove, set level(v) { level = v; }, get wait() { return wait; } },
    };
  },
});

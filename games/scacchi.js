// SCACCHI: contro il telefono, con tutte le regole (scacco, matto, stallo, arrocco, en passant, promozione).
registerGame({
  id: 'scacchi',
  title: 'SCACCHI',
  author: 'Tasca Arcade',
  license: 'MIT',
  color: '#8a76b8',
  blurb: 'Scacchi contro il telefono, con arrocco, presa en passant e promozione (la pedina diventa regina). Tocca un pezzo e poi la casella dove vuoi spostarlo; i puntini verdi mostrano le mosse possibili. Tre livelli di difficoltà.',
  inputs: ['TOCCO', 'SCACCHIERA'],
  size: [360, 600],
  bg: '#1a1228',
  flexH: true,
  flexMin: 1.1,
  create(api) {
    const { cv, g } = api;
    const CW = cv.width, CH = cv.height, VW = 360, VH = 600;
    const S = Math.min(CW / VW, CH / VH), OX = (CW - VW * S) / 2, OY = (CH - VH * S) / 2;
    const SQ = 42, BX = (VW - 8 * SQ) / 2, BY = 124;
    // pezzi: 1 pedone 2 cavallo 3 alfiere 4 torre 5 donna 6 re; positivo = bianco (giocatore, in basso), negativo = nero
    const VALUE = [0, 100, 320, 330, 500, 900, 20000];
    const PST = {
      1: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
      2: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
      3: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    };
    let wins = api.store.get('wins', 0), level = api.store.get('lvl', 2);
    let state = 'title', time = 0, G, sel = -1, legal = [], last = null, msg = '', msgT = 0, wait = 0, endMsg = '', thinking = false;
    const flash = t => { msg = t; msgT = 1.6; };
    const fresh = () => {
      const b = new Array(64).fill(0), back = [4, 2, 3, 5, 6, 3, 2, 4];
      for (let c = 0; c < 8; c++) { b[c] = -back[c]; b[8 + c] = -1; b[48 + c] = 1; b[56 + c] = back[c]; }
      return { b, turn: 1, cas: { wK: true, wQ: true, bK: true, bQ: true }, ep: -1, half: 0 };
    };
    const sd = p => (p > 0 ? 1 : p < 0 ? -1 : 0);
    const attacked = (b, sq, by) => {                      // la casella sq e' attaccata dal colore "by"?
      const r = sq >> 3, c = sq & 7;
      const pr = r + (by === 1 ? 1 : -1);                  // da dove arriverebbe un pedone
      for (const dc of [-1, 1]) { const cc = c + dc; if (pr >= 0 && pr < 8 && cc >= 0 && cc < 8 && b[pr * 8 + cc] === by) return true; }
      for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === 2 * by) return true; }
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) {
        const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === 6 * by) return true;
        let k = 1; for (;;) { const r2 = r + dr * k, c2 = c + dc * k; if (r2 < 0 || r2 > 7 || c2 < 0 || c2 > 7) break; const p = b[r2 * 8 + c2]; if (p) { if (sd(p) === by && ((Math.abs(p) === 5) || (Math.abs(p) === 4 && (dr === 0 || dc === 0)) || (Math.abs(p) === 3 && dr !== 0 && dc !== 0))) return true; break; } k++; }
      }
      return false;
    };
    const kingSq = (b, col) => b.indexOf(6 * col);
    const pseudo = (G, col) => {
      const b = G.b, out = [];
      for (let s = 0; s < 64; s++) {
        const p = b[s]; if (sd(p) !== col) continue; const t = Math.abs(p), r = s >> 3, c = s & 7;
        const add = (to, extra) => out.push(Object.assign({ from: s, to }, extra || {}));
        if (t === 1) {
          const dir = col === 1 ? -1 : 1, start = col === 1 ? 6 : 1, last = col === 1 ? 0 : 7, r1 = r + dir;
          if (r1 >= 0 && r1 < 8) {
            const promo = r1 === last;
            if (!b[r1 * 8 + c]) { add(r1 * 8 + c, promo ? { promo: 5 } : {}); if (r === start && !b[(r + 2 * dir) * 8 + c]) add((r + 2 * dir) * 8 + c, { dbl: true }); }
            for (const dc of [-1, 1]) { const cc = c + dc; if (cc < 0 || cc > 7) continue; const to = r1 * 8 + cc; if (sd(b[to]) === -col) add(to, promo ? { promo: 5 } : {}); else if (to === G.ep) add(to, { ep: true }); }
          }
        } else if (t === 2) { for (const [dr, dc] of [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]]) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; if (sd(b[rr * 8 + cc]) !== col) add(rr * 8 + cc); } }
        else if (t === 6) {
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) { const rr = r + dr, cc = c + dc; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue; if (sd(b[rr * 8 + cc]) !== col) add(rr * 8 + cc); }
          const row = col === 1 ? 7 : 0, k = G.cas, ks = col === 1 ? k.wK : k.bK, qs = col === 1 ? k.wQ : k.bQ;
          if (s === row * 8 + 4 && !attacked(b, s, -col)) {
            if (ks && !b[row * 8 + 5] && !b[row * 8 + 6] && b[row * 8 + 7] === 4 * col && !attacked(b, row * 8 + 5, -col) && !attacked(b, row * 8 + 6, -col)) add(row * 8 + 6, { castle: 'K' });
            if (qs && !b[row * 8 + 3] && !b[row * 8 + 2] && !b[row * 8 + 1] && b[row * 8] === 4 * col && !attacked(b, row * 8 + 3, -col) && !attacked(b, row * 8 + 2, -col)) add(row * 8 + 2, { castle: 'Q' });
          }
        } else {
          const dirs = t === 3 ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : t === 4 ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
          for (const [dr, dc] of dirs) { let k = 1; for (;;) { const rr = r + dr * k, cc = c + dc * k; if (rr < 0 || rr > 7 || cc < 0 || cc > 7) break; const q = b[rr * 8 + cc]; if (!q) add(rr * 8 + cc); else { if (sd(q) !== col) add(rr * 8 + cc); break; } k++; } }
        }
      }
      return out;
    };
    const make = (G, m) => {
      const b = G.b.slice(), p = b[m.from], col = sd(p), cas = Object.assign({}, G.cas); let ep = -1, half = G.half + 1;
      const cap = b[m.to]; if (cap || Math.abs(p) === 1) half = 0;
      b[m.to] = m.promo ? m.promo * col : p; b[m.from] = 0;
      if (m.ep) b[m.to + (col === 1 ? 8 : -8)] = 0;
      if (m.dbl) ep = (m.from + m.to) >> 1;
      if (m.castle === 'K') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = 0; } else if (m.castle === 'Q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = 0; }
      if (Math.abs(p) === 6) { if (col === 1) { cas.wK = false; cas.wQ = false; } else { cas.bK = false; cas.bQ = false; } }
      for (const [sq, key] of [[63, 'wK'], [56, 'wQ'], [7, 'bK'], [0, 'bQ']]) if (m.from === sq || m.to === sq) cas[key] = false;
      return { b, turn: -G.turn, cas, ep, half };
    };
    const legalMoves = (G, col) => pseudo(G, col).filter(m => { const n = make(G, m); return !attacked(n.b, kingSq(n.b, col), -col); });
    const evalG = G => { let sc = 0; for (let s = 0; s < 64; s++) { const p = G.b[s]; if (!p) continue; const t = Math.abs(p), col = sd(p), idx = col === 1 ? s : (7 - (s >> 3)) * 8 + (s & 7); sc += col * (VALUE[t] + (PST[t] ? PST[t][idx] : 0)); } return sc; };
    const search = (G, depth, a, bb) => {                  // punteggio dal punto di vista di chi muove (negamax)
      const col = G.turn, ms = legalMoves(G, col);
      if (!ms.length) return attacked(G.b, kingSq(G.b, col), -col) ? -30000 - depth : 0;
      if (depth === 0) return col * evalG(G);
      ms.sort((x, y) => (Math.abs(G.b[y.to]) * 10 - Math.abs(G.b[y.from])) - (Math.abs(G.b[x.to]) * 10 - Math.abs(G.b[x.from])));
      let best = -Infinity;
      for (const m of ms) { const v = -search(make(G, m), depth - 1, -bb, -a); if (v > best) best = v; if (best > a) a = best; if (a >= bb) break; }
      return best;
    };
    const cpuMove = () => {
      const ms = legalMoves(G, -1); if (!ms.length) return null;
      const depth = level === 1 ? 1 : level === 2 ? 2 : 3; let best = null, bv = -Infinity;
      ms.sort(() => Math.random() - 0.5);
      for (const m of ms) { let v = -search(make(G, m), depth - 1, -Infinity, Infinity); if (level === 1) v += Math.random() * 120; if (v > bv) { bv = v; best = m; } }
      return best;
    };
    const status = () => {
      const col = G.turn, ms = legalMoves(G, col), inCheck = attacked(G.b, kingSq(G.b, col), -col);
      if (!ms.length) { state = 'end'; if (inCheck) { endMsg = col === -1 ? 'SCACCO MATTO: HAI VINTO!' : 'SCACCO MATTO: HAI PERSO'; if (col === -1) { wins++; api.store.set('wins', wins); [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => api.beep(f, 0.14, 'triangle', 0.08), k * 110)); api.haptic(50); } else api.beep(180, 0.3, 'sawtooth', 0.07); } else endMsg = 'STALLO: PATTA'; return true; }
      if (G.half >= 100) { state = 'end'; endMsg = 'PATTA (50 MOSSE)'; return true; }
      let n = 0; for (const p of G.b) if (p && Math.abs(p) !== 6) n++; if (n === 0) { state = 'end'; endMsg = 'PATTA: MATERIALE INSUFFICIENTE'; return true; }
      if (inCheck) { flash(col === 1 ? 'SEI SOTTO SCACCO!' : 'SCACCO AL TELEFONO!'); api.haptic(30); api.beep(740, 0.1, 'square', 0.08); }
      return false;
    };
    const doMove = (m, who) => {
      const cap = G.b[m.to] || m.ep, col = sd(G.b[m.from]);
      // Per l'animazione: pezzo che parte, pezzo preso (anche en passant) e torre dell'arrocco.
      last = { from: m.from, to: m.to, who, t0: time, dur: who === 1 ? 0.25 : 0.4, p: G.b[m.from],
        capSq: m.ep ? m.to + (col === 1 ? 8 : -8) : m.to, capP: m.ep ? G.b[m.to + (col === 1 ? 8 : -8)] : G.b[m.to],
        rook: m.castle === 'K' ? { from: m.to + 1, to: m.to - 1 } : m.castle === 'Q' ? { from: m.to - 2, to: m.to + 1 } : null };
      G = make(G, m); sel = -1; legal = [];
      api.beep(who === 1 ? 420 : 360, 0.05, 'square', 0.08); api.beep(1700, 0.01, 'square', 0.04); if (cap) { api.beep(220, 0.1, 'triangle', 0.09); api.haptic(who === 1 ? 20 : 8); }
      if (m.promo) flash('PROMOZIONE A REGINA');
      if (status()) return;
      if (G.turn === -1) { state = 'think'; wait = 0.5; }
    };
    const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    const sliding = () => last && time - last.t0 < last.dur;
    const newGame = () => { G = fresh(); sel = -1; legal = []; last = null; endMsg = ''; state = 'play'; flash('TOCCA A TE (BIANCHI)'); };
    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      if (state === 'think') { wait -= dt; if (wait <= 0) { state = 'play'; const m = cpuMove(); if (m) doMove(m, -1); } }
    };
    const onPointer = e => {
      if (e.type !== 'down') return;
      const x = (e.x - OX) / S, y = (e.y - OY) / S;
      if (state === 'title') { if (y > 395 && y < 440) { const k = Math.floor((x - 40) / 94); if (k >= 0 && k < 3) { level = k + 1; api.store.set('lvl', level); return; } } newGame(); return; }
      if (state === 'end') { newGame(); return; }
      if (state === 'pause') { state = 'play'; return; }
      if (state !== 'play' || G.turn !== 1) return;
      const r = Math.floor((y - BY) / SQ), c = Math.floor((x - BX) / SQ); if (r < 0 || r > 7 || c < 0 || c > 7) return; const sq = r * 8 + c;
      if (sliding()) return;
      if (sel >= 0) { const m = legal.find(m => m.to === sq); if (m) { doMove(m, 1); return; } }
      if (sd(G.b[sq]) === 1) { sel = sq; legal = legalMoves(G, 1).filter(m => m.from === sq); api.beep(900, 0.02, 'triangle', 0.05); } else { sel = -1; legal = []; }
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'end') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'select' && state !== 'title') newGame();
      else if (k === 'a' && (state === 'title' || state === 'end')) newGame();
    };
    const text = (s, x, y, size, align, c) => { g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#fff4e0'; g.fillText(s, x, y); };
    const banner = rows => { const h = rows.length * 26 + 16, w = 290, x = (VW - w) / 2, y = 250; g.fillStyle = '#fff4e0'; g.fillRect(x, y, w, h); g.fillStyle = '#1a1228'; g.fillRect(x + 2, y + 2, w - 4, h - 4); rows.forEach((t, i) => text(t, VW / 2, y + 12 + i * 26, i ? 18 : 14, 'center')); };
    // pezzi disegnati a mano (vettoriali)
    const drawPiece = (t, white, cx, cy, sz) => {
      g.save(); g.translate(cx, cy); g.scale(sz / 42, sz / 42);
      const fill = g.createLinearGradient(-14, -16, 14, 16); if (white) { fill.addColorStop(0, '#ffffff'); fill.addColorStop(1, '#d8c9a0'); } else { fill.addColorStop(0, '#5a4a6a'); fill.addColorStop(1, '#171020'); }
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(1, 15, 14, 4, 0, 0, 7); g.fill();
      g.fillStyle = fill; g.strokeStyle = white ? '#6a5a30' : '#000'; g.lineWidth = 1.6; g.lineJoin = 'round';
      const base = () => { g.beginPath(); g.moveTo(-13, 15); g.lineTo(-11, 10); g.lineTo(11, 10); g.lineTo(13, 15); g.closePath(); g.fill(); g.stroke(); };
      if (t === 1) { base(); g.beginPath(); g.moveTo(-8, 10); g.quadraticCurveTo(-7, 0, -3, -3); g.lineTo(3, -3); g.quadraticCurveTo(7, 0, 8, 10); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(0, -8, 6.5, 0, 7); g.fill(); g.stroke(); }
      else if (t === 4) { base(); g.beginPath(); g.moveTo(-9, 10); g.lineTo(-7, -5); g.lineTo(7, -5); g.lineTo(9, 10); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-10, -5); g.lineTo(-10, -14); g.lineTo(-6, -14); g.lineTo(-6, -10); g.lineTo(-2, -10); g.lineTo(-2, -14); g.lineTo(2, -14); g.lineTo(2, -10); g.lineTo(6, -10); g.lineTo(6, -14); g.lineTo(10, -14); g.lineTo(10, -5); g.closePath(); g.fill(); g.stroke(); }
      else if (t === 2) { base(); g.beginPath(); g.moveTo(-10, 10); g.quadraticCurveTo(-8, -2, -2, -6); g.quadraticCurveTo(-8, -6, -10, -2); g.lineTo(-12, -8); g.quadraticCurveTo(-4, -17, 4, -15); g.quadraticCurveTo(12, -12, 10, 10); g.closePath(); g.fill(); g.stroke(); g.fillStyle = white ? '#6a5a30' : '#ddd'; g.beginPath(); g.arc(1, -10, 1.4, 0, 7); g.fill(); }
      else if (t === 3) { base(); g.beginPath(); g.moveTo(-8, 10); g.quadraticCurveTo(-7, 0, -4, -3); g.quadraticCurveTo(-11, -10, 0, -17); g.quadraticCurveTo(11, -10, 4, -3); g.quadraticCurveTo(7, 0, 8, 10); g.closePath(); g.fill(); g.stroke(); g.strokeStyle = white ? '#6a5a30' : '#ddd'; g.beginPath(); g.moveTo(-2, -11); g.lineTo(3, -7); g.stroke(); g.fillStyle = fill; g.beginPath(); g.arc(0, -18, 2.4, 0, 7); g.fill(); g.strokeStyle = white ? '#6a5a30' : '#000'; g.stroke(); }
      else if (t === 5) { base(); g.beginPath(); g.moveTo(-9, 10); g.quadraticCurveTo(-8, -2, -10, -6); g.lineTo(-12, -14); g.lineTo(-6, -8); g.lineTo(-3, -16); g.lineTo(0, -8); g.lineTo(3, -16); g.lineTo(6, -8); g.lineTo(12, -14); g.lineTo(10, -6); g.quadraticCurveTo(8, -2, 9, 10); g.closePath(); g.fill(); g.stroke(); [[-12, -14], [-3, -16], [3, -16], [12, -14]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y - 1, 2, 0, 7); g.fill(); g.stroke(); }); }
      else { base(); g.beginPath(); g.moveTo(-9, 10); g.quadraticCurveTo(-10, -2, -6, -8); g.lineTo(6, -8); g.quadraticCurveTo(10, -2, 9, 10); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.rect(-2, -18, 4, 11); g.fill(); g.stroke(); g.beginPath(); g.rect(-6, -15, 12, 4); g.fill(); g.stroke(); }
      g.restore();
    };
    const render = () => {
      g.fillStyle = '#100a1c'; g.fillRect(0, 0, CW, CH);
      g.save(); g.translate(OX, OY); g.scale(S, S);
      const bg = g.createRadialGradient(VW / 2, 300, 20, VW / 2, 300, 420); bg.addColorStop(0, '#34224e'); bg.addColorStop(1, '#14091f'); g.fillStyle = bg; g.fillRect(0, 0, VW, VH);
      if (state === 'title') {
        text('SCACCHI', VW / 2, 100, 48, 'center', '#ffe66a');
        [[5, 0, -1], [4, 1, 1], [6, 2, -1], [2, 3, 1]].forEach(([t, k, w]) => drawPiece(t, w > 0, 80 + k * 66, 250, 60));
        text('TOCCA PER INIZIARE (TU SEI BIANCO)', VW / 2, 340, 14, 'center', '#fff4e0');
        text('LIVELLO CPU', VW / 2, 372, 11, 'center', '#c9b6e8');
        ['FACILE', 'MEDIO', 'ESPERTO'].forEach((n, k) => { g.fillStyle = level === k + 1 ? '#ffe66a' : 'rgba(255,255,255,.12)'; g.beginPath(); g.roundRect(40 + k * 94, 395, 86, 30, 8); g.fill(); text(n, 83 + k * 94, 404, 12, 'center', level === k + 1 ? '#1a1000' : '#fff4e0'); });
        text('PARTITE VINTE ' + wins, VW / 2, 470, 13, 'center'); g.restore(); return;
      }
      g.fillStyle = '#4a3366'; g.beginPath(); g.roundRect(BX - 10, BY - 10, 8 * SQ + 20, 8 * SQ + 20, 10); g.fill();
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { g.fillStyle = (r + c) % 2 ? '#8a6aa8' : '#ecdcc0'; g.fillRect(BX + c * SQ, BY + r * SQ, SQ, SQ); }
      g.font = 'bold 8px ui-monospace, monospace'; for (let i = 0; i < 8; i++) { text('abcdefgh'[i], BX + i * SQ + SQ - 8, BY + 8 * SQ - 10, 8, 'left', (7 + i) % 2 ? '#ecdcc0' : '#8a6aa8'); text(String(8 - i), BX + 2, BY + i * SQ + 2, 8, 'left', i % 2 ? '#ecdcc0' : '#8a6aa8'); }
      // Ultima mossa: la tua in giallo; quella del telefono in azzurro con la cornice, che pulsa appena arriva.
      if (last && last.who === -1) {
        const pulse = 1 + 0.6 * Math.max(0, 1 - (time - last.t0 - last.dur) / 1.2) * Math.abs(Math.sin((time - last.t0) * 6));
        for (const [s, a, lw] of [[last.from, 0.22, 2], [last.to, 0.42, 3]]) {
          const x = BX + (s & 7) * SQ, y = BY + (s >> 3) * SQ;
          g.fillStyle = 'rgba(90,200,255,' + a + ')'; g.fillRect(x, y, SQ, SQ);
          g.strokeStyle = 'rgba(40,150,230,' + Math.min(1, 0.6 * pulse) + ')'; g.lineWidth = lw; g.strokeRect(x + lw / 2, y + lw / 2, SQ - lw, SQ - lw);
        }
      } else if (last) { g.fillStyle = 'rgba(255,230,120,.4)'; for (const s of [last.from, last.to]) g.fillRect(BX + (s & 7) * SQ, BY + (s >> 3) * SQ, SQ, SQ); }
      const ks = kingSq(G.b, G.turn); if (ks >= 0 && attacked(G.b, ks, -G.turn)) { g.fillStyle = 'rgba(255,60,60,.55)'; g.fillRect(BX + (ks & 7) * SQ, BY + (ks >> 3) * SQ, SQ, SQ); }
      if (sel >= 0) { g.fillStyle = 'rgba(255,90,138,.5)'; g.fillRect(BX + (sel & 7) * SQ, BY + (sel >> 3) * SQ, SQ, SQ); }
      legal.forEach(m => { const cx = BX + (m.to & 7) * SQ + SQ / 2, cy = BY + (m.to >> 3) * SQ + SQ / 2; g.fillStyle = G.b[m.to] ? 'rgba(255,90,90,.6)' : 'rgba(80,220,120,.7)'; g.beginPath(); g.arc(cx, cy, G.b[m.to] ? SQ * 0.42 : SQ * 0.15, 0, 7); if (G.b[m.to]) { g.lineWidth = 3; g.strokeStyle = 'rgba(255,90,90,.8)'; g.stroke(); } else g.fill(); });
      // Pezzo che scivola: parte dalla casella vecchia, si solleva un poco a metà strada; quello preso svanisce all'arrivo.
      const k = sliding() ? ease((time - last.t0) / last.dur) : 1, moving = k < 1 ? [last.to, last.rook && last.rook.to] : [];
      const at = s => [BX + (s & 7) * SQ + SQ / 2, BY + (s >> 3) * SQ + SQ / 2];
      for (let s = 0; s < 64; s++) { const p = G.b[s]; if (p && !moving.includes(s)) { const [x, y] = at(s); drawPiece(Math.abs(p), p > 0, x, y, SQ * 0.95); } }
      if (k < 1) {
        if (last.capP) { const [x, y] = at(last.capSq), f = Math.max(0, 1 - k * 1.25); g.save(); g.globalAlpha = f; drawPiece(Math.abs(last.capP), last.capP > 0, x, y, SQ * 0.95 * (0.7 + 0.3 * f)); g.restore(); }
        const slide = (from, to, p) => { const [x0, y0] = at(from), [x1, y1] = at(to), lift = Math.sin(Math.PI * k); drawPiece(Math.abs(p), p > 0, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - lift * 6, SQ * 0.95 * (1 + 0.08 * lift)); };
        if (last.rook) slide(last.rook.from, last.rook.to, G.b[last.rook.to]);
        slide(last.from, last.to, last.p);
      }
      g.fillStyle = 'rgba(10,4,24,.7)'; g.fillRect(0, 0, VW, 62); text('SCACCHI', 14, 10, 18, 'left', '#ffe66a'); text(G.turn === 1 ? 'TOCCA A TE' : 'PENSA IL TELEFONO...', VW - 14, 12, 12, 'right', G.turn === 1 ? '#6fffa0' : '#c9b6e8'); text('LIVELLO ' + level + '  ·  START = PAUSA', 14, 38, 11, 'left', '#c9b6e8');
      if (msgT > 0) text(msg, VW / 2, BY + 8 * SQ + 24, 14, 'center', '#ffe66a');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'end') banner([endMsg, 'TOCCA']);
      g.restore();
    };
    G = fresh();
    return {
      onPress: act, onPointer, onHide() { if (state === 'play') state = 'pause'; },
      update, render,
      debug: { newGame, get state() { return state; }, get G() { return G; }, moves() { return legalMoves(G, G.turn); }, doMove, cpuMove, set level(v) { level = v; }, perft(d) { const f = (G0, d) => { if (!d) return 1; let n = 0; for (const m of legalMoves(G0, G0.turn)) n += f(make(G0, m), d - 1); return n; }; return f(fresh(), d); }, attacked },
    };
  },
});

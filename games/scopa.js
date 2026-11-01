// SCOPA: il gioco di carte italiano, uno contro il telefono. Cattura le carte sul tavolo con lo stesso valore o la cui somma è uguale.
registerGame({
  id: 'scopa',
  title: 'SCOPA',
  author: 'Tasca Arcade',
  license: 'MIT',
  color: '#2a6fb3',
  blurb: 'Scopa a due. Gioca una carta e prendi dal tavolo quelle dello stesso valore, o più carte che sommate fanno quel valore. Svuota il tavolo per fare scopa. Contano: carte, denari, settebello, primiera e scope. Tocca una carta per sceglierla, di nuovo per giocarla.',
  inputs: ['TOCCO', 'CARTE'],
  size: [360, 600],
  bg: '#0e2a4a',
  flexH: true,
  flexMin: 1.1,
  create(api) {
    const { cv, g } = api;
    const CW = cv.width, CH = cv.height, VW = 360, VH = 600;
    const S = Math.min(CW / VW, CH / VH), OX = (CW - VW * S) / 2, OY = (CH - VH * S) / 2;
    const PRIM = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 };
    let wins = api.store.get('wins', 0);
    let state = 'title', time = 0, deck, table, hand, cpuHand, capP, capC, scoreP, scoreC, scopeP, scopeC, turn, lastCap, selI = -1, wait = 0, msg = '', msgT = 0, opts = [], choiceCard = -1, hint = null, result = null;
    const flash = t => { msg = t; msgT = 1.6; };
    const sums = (cards, target) => {          // tutte le combinazioni di carte del tavolo che sommano a target
      const out = [], n = cards.length;
      for (let m = 1; m < (1 << n); m++) { let s = 0, sel = []; for (let i = 0; i < n; i++) if (m & (1 << i)) { s += cards[i].n; sel.push(i); } if (s === target) out.push(sel); }
      return out;
    };
    const options = (c) => {
      const same = []; table.forEach((t, i) => { if (t.n === c.n) same.push([i]); });
      if (same.length) return same;                      // se c'e' una carta uguale, devi prendere quella
      return sums(table, c.n);
    };
    const newGame = () => {
      deck = Cards.shuffle(Cards.deck()); table = []; hand = []; cpuHand = []; capP = []; capC = []; scopeP = 0; scopeC = 0; lastCap = null; result = null;
      for (let i = 0; i < 4; i++) table.push(deck.pop());
      deal(); turn = Math.random() < 0.5 ? 'P' : 'C'; state = 'play'; wait = 0.6; flash(turn === 'P' ? 'INIZI TU' : 'INIZIA IL TELEFONO');
    };
    const deal = () => { for (let i = 0; i < 3; i++) { hand.push(deck.pop()); cpuHand.push(deck.pop()); } };
    const value = (c, taken) => (c.s === 0 && c.n === 7 ? 30 : 0) + (c.s === 0 ? 6 : 0) + (c.n === 7 ? 8 : 0) + (c.n === 6 || c.n === 1 ? 3 : 0) + 2;
    const apply = (who, ci, opt) => {
      const src = who === 'P' ? hand : cpuHand, c = src.splice(ci, 1)[0], pile = who === 'P' ? capP : capC;
      hint = { who, card: c, took: opt ? opt.map(i => table[i]) : [] };
      if (opt) {
        const got = opt.map(i => table[i]); table = table.filter((_, i) => !opt.includes(i)); pile.push(c, ...got); lastCap = who;
        const last = !deck.length && !hand.length && !cpuHand.length;
        if (!table.length && !last) { if (who === 'P') scopeP++; else scopeC++; flash(who === 'P' ? 'SCOPA!' : 'SCOPA DEL TELEFONO'); [660, 880, 1046].forEach((f, k) => setTimeout(() => api.beep(f, 0.12, 'triangle', 0.08), k * 90)); api.haptic(who === 'P' ? 40 : 20); }
        else { api.beep(who === 'P' ? 700 : 520, 0.06, 'triangle', 0.07); api.haptic(who === 'P' ? 15 : 6); flash((who === 'P' ? 'PRENDI ' : 'PRENDE IL TELEFONO ') + (got.length + 1) + ' CARTE'); }
      } else { table.push(c); api.beep(300, 0.05, 'square', 0.06); }
      state = 'show'; wait = who === 'C' ? 1.3 : 0.7; turn = who === 'P' ? 'C' : 'P';
    };
    const cpuPlay = () => {
      let best = null;
      cpuHand.forEach((c, i) => {
        const os = options(c);
        if (os.length) os.forEach(o => { const got = o.map(k => table[k]); let sc = 5 + got.length * 2 + got.reduce((a, t) => a + value(t), 0) + value(c); if (o.length === table.length) sc += 12; if (!best || sc > best.sc) best = { sc, i, o }; });
        else { const risk = table.reduce((a, t) => a + t.n, 0) + c.n <= 10 ? 8 : 0; const sc = -value(c) - risk - 20; if (!best || sc > best.sc) best = { sc, i, o: null }; }
      });
      apply('C', best.i, best.o);
    };
    const finish = () => {
      if (table.length && lastCap) (lastCap === 'P' ? capP : capC).push(...table.splice(0));
      const sc = { P: 0, C: 0 }, rows = [], cnt = (pile, f) => pile.filter(f).length;
      const cmp = (label, a, b) => { if (a > b) { sc.P++; rows.push(label + ': TU'); } else if (b > a) { sc.C++; rows.push(label + ': CPU'); } else rows.push(label + ': PARI'); };
      cmp('CARTE ' + capP.length + '-' + capC.length, capP.length, capC.length);
      cmp('DENARI ' + cnt(capP, c => c.s === 0) + '-' + cnt(capC, c => c.s === 0), cnt(capP, c => c.s === 0), cnt(capC, c => c.s === 0));
      const set7 = capP.some(c => c.s === 0 && c.n === 7); sc[set7 ? 'P' : 'C']++; rows.push('SETTEBELLO: ' + (set7 ? 'TU' : 'CPU'));
      const prim = pile => [0, 1, 2, 3].reduce((a, s) => a + Math.max(0, ...pile.filter(c => c.s === s).map(c => PRIM[c.n])), 0);
      const pp = prim(capP), pc = prim(capC); cmp('PRIMIERA ' + pp + '-' + pc, pp, pc);
      sc.P += scopeP; sc.C += scopeC; rows.push('SCOPE ' + scopeP + '-' + scopeC);
      result = { P: sc.P, C: sc.C, rows }; state = 'end';
      if (sc.P > sc.C) { wins++; api.store.set('wins', wins); [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => api.beep(f, 0.14, 'triangle', 0.08), k * 110)); api.haptic(50); } else if (sc.C > sc.P) api.beep(180, 0.3, 'sawtooth', 0.07);
    };
    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt);
      if (state === 'show') { wait -= dt; if (wait <= 0) { hint = null; if (!hand.length && !cpuHand.length) { if (deck.length) deal(); else { finish(); return; } } state = 'play'; wait = 0.4; } return; }
      if (state === 'play') { if (wait > 0) { wait -= dt; return; } if (turn === 'C' && cpuHand.length) cpuPlay(); else if (turn === 'C') { turn = 'P'; } else if (turn === 'P' && !hand.length) { turn = 'C'; } }
    };
    const handRect = i => { const n = hand.length, w = 78, gap = 8, tot = n * w + (n - 1) * gap, x0 = (VW - tot) / 2; return { x: x0 + i * (w + gap), y: 468 - (i === selI ? 12 : 0), w, h: w * 1.5 }; };
    const tableRect = i => { const per = 5, w = 56, gap = 8, col = i % per, row = (i / per) | 0, n = Math.min(per, table.length - row * per), tot = n * w + (n - 1) * gap, x0 = (VW - tot) / 2; return { x: x0 + col * (w + gap), y: 150 + row * 96, w, h: w * 1.5 }; };
    const optRect = k => ({ x: 20 + (k % 2) * 160, y: 440 + ((k / 2) | 0) * 40, w: 150, h: 34 });
    const onPointer = e => {
      if (e.type !== 'down') return;
      const x = (e.x - OX) / S, y = (e.y - OY) / S;
      if (state === 'title' || state === 'end') { newGame(); return; }
      if (state === 'pause') { state = 'play'; return; }
      if (state === 'choose') {
        for (let k = 0; k < opts.length; k++) { const r = optRect(k); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { const ci = choiceCard, o = opts[k]; opts = []; selI = -1; apply('P', ci, o); return; } }
        state = 'play'; opts = []; return;
      }
      if (state === 'play' && turn === 'P' && wait <= 0) {
        for (let i = 0; i < hand.length; i++) { const r = handRect(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h + 24) { if (selI === i) tryPlay(i); else { selI = i; api.beep(900, 0.02, 'triangle', 0.05); } return; } }
        selI = -1;
      }
    };
    const tryPlay = i => {
      const os = options(hand[i]);
      if (os.length <= 1) { selI = -1; apply('P', i, os[0] || null); }
      else { opts = os; choiceCard = i; state = 'choose'; }
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'end') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'left' || k === 'right') { if (state === 'play' && turn === 'P' && hand.length) { selI = selI < 0 ? 0 : (selI + (k === 'right' ? 1 : -1) + hand.length) % hand.length; api.beep(900, 0.02, 'triangle', 0.05); } }
      else if (k === 'a' && state === 'play' && turn === 'P' && selI >= 0 && wait <= 0) tryPlay(selI);
      else if (k === 'a' && (state === 'title' || state === 'end')) newGame();
      else if (k === 'select' && state !== 'title') newGame();
    };
    const text = (s, x, y, size, align, c) => { g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#fff4e0'; g.fillText(s, x, y); };
    const banner = rows => { const h = rows.length * 24 + 16, w = 290, x = (VW - w) / 2, y = Math.max(70, 300 - h / 2); g.fillStyle = '#fff4e0'; g.fillRect(x, y, w, h); g.fillStyle = '#0e2a4a'; g.fillRect(x + 2, y + 2, w - 4, h - 4); rows.forEach((t, i) => text(t, VW / 2, y + 10 + i * 24, i === 0 ? 18 : 13, 'center')); };
    const render = () => {
      g.fillStyle = '#081a30'; g.fillRect(0, 0, CW, CH);
      g.save(); g.translate(OX, OY); g.scale(S, S);
      Cards.felt(g, VW, VH, '#2a6f9f', '#0a2646');
      if (state === 'title') {
        text('SCOPA', VW / 2, 120, 50, 'center', '#ffe66a');
        Cards.draw(g, { s: 0, n: 7 }, 70, 200, 70, { angle: -0.15 }); Cards.draw(g, { s: 2, n: 3 }, 140, 192, 70, { angle: -0.03 }); Cards.draw(g, { s: 1, n: 4 }, 210, 192, 70, { angle: 0.1 });
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', VW / 2, 370, 16, 'center');
        text('PRENDI LE CARTE CON LO STESSO VALORE O LA STESSA SOMMA', VW / 2, 410, 10, 'center', '#cfe3f5'); text('TOCCA UNA CARTA, POI DI NUOVO PER GIOCARLA', VW / 2, 428, 10, 'center', '#cfe3f5');
        text('PARTITE VINTE ' + wins, VW / 2, 470, 13, 'center'); g.restore(); return;
      }
      g.fillStyle = 'rgba(6,16,32,.7)'; g.fillRect(0, 0, VW, 44); text('TU ' + capP.length + ' · SCOPE ' + scopeP, 12, 8, 12, 'left', '#ffe66a'); text('CPU ' + capC.length + ' · SCOPE ' + scopeC, VW - 12, 8, 12, 'right', '#ffe66a'); text('MAZZO ' + deck.length, VW / 2, 26, 11, 'center', '#cfe3f5');
      cpuHand.forEach((c, i) => Cards.draw(g, null, 120 + i * 44, 50, 44, { back: true }));
      const hi = new Set(state === 'choose' ? [] : []);
      table.forEach((t, i) => { const r = tableRect(i); Cards.draw(g, t, r.x, r.y, r.w, { sel: hint && hint.took.includes(t) }); });
      if (state === 'choose') opts.forEach((o, k) => { const r = optRect(k); g.fillStyle = '#ffe66a'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 8); g.fill(); text('PRENDI ' + o.map(i => table[i].n).join('+'), r.x + r.w / 2, r.y + 9, 13, 'center', '#1a1000'); });
      if (state === 'choose') text('SCEGLI COSA PRENDERE', VW / 2, 418, 12, 'center', '#ffe66a');
      if (hint && hint.who === 'C') Cards.draw(g, hint.card, VW / 2 - 28, 108, 56, { lift: true, sel: true });
      hand.forEach((c, i) => { const r = handRect(i); Cards.draw(g, c, r.x, r.y, r.w, { sel: i === selI, lift: i === selI, dim: !(state === 'play' && turn === 'P') }); });
      if (msgT > 0 && state !== 'choose') text(msg, VW / 2, 418, 13, 'center', '#ffe66a');
      if (state === 'play' && turn === 'P' && wait <= 0 && state !== 'choose') text(selI >= 0 ? 'TOCCA DI NUOVO PER GIOCARE' : 'SCEGLI UNA CARTA', VW / 2, 572, 11, 'center', '#cfe3f5');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'end') banner([result.P > result.C ? 'HAI VINTO!' : result.C > result.P ? 'HAI PERSO' : 'PAREGGIO', ...result.rows, 'PUNTI ' + result.P + ' A ' + result.C, 'TOCCA']);
      g.restore();
    };
    return {
      onPress: act, onPointer, onHide() { if (state === 'play') state = 'pause'; },
      update, render,
      debug: { newGame, get state() { return state; }, get hand() { return hand; }, get table() { return table; }, get turn() { return turn; }, get wait() { return wait; }, tryPlay, get result() { return result; }, get opts() { return opts; }, choose(k) { const ci = choiceCard, o = opts[k]; opts = []; apply('P', ci, o); } },
    };
  },
});

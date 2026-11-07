// BRISCOLA: il classico gioco di carte italiano, uno contro il telefono. Mazzo da 40 carte disegnato dal codice.
registerGame({
  id: 'briscola',
  title: 'BRISCOLA',
  author: 'Tasca Arcade',
  license: 'MIT',
  color: '#c0334d',
  blurb: "Sfida il telefono a Briscola e conquista più di 60 punti.",
  inputs: ['TOCCO', 'CARTE'],
  size: [360, 600],
  bg: '#0e3a28',
  flexH: true,
  flexMin: 1.1,
  create(api) {
    const { cv, g, held } = api;
    const CW = cv.width, CH = cv.height, VW = 360, VH = 600;
    const S = Math.min(CW / VW, CH / VH), OX = (CW - VW * S) / 2, OY = (CH - VH * S) / 2;
    const VAL = { 1: 11, 3: 10, 10: 4, 9: 3, 8: 2 }, RANK = { 1: 10, 3: 9, 10: 8, 9: 7, 8: 6, 7: 5, 6: 4, 5: 3, 4: 2, 2: 1 };
    const pts = c => VAL[c.n] || 0;
    let hi = api.store.get('wins', 0), streak = api.store.get('streak', 0);
    let state = 'title', time = 0, deck, trump, hand, cpuHand, table, turn, lead, ptsP, ptsC, msg = '', msgT = 0, wait = 0, selI = -1, lastWinner = null, anim = [];
    const flash = t => { msg = t; msgT = 1.6; };
    const mv = Cards.motion();
    // Le carte arrivano dal mazzo (o dalla briscola scoperta, quando è l'ultima) e le prese volano verso chi vince.
    const fromDeck = (c, delay) => { if (c === trump) mv.from(c, 82, 244, 52, { angle: Math.PI / 2, delay }); else mv.from(c, 14, 220, 52, { back: true, delay }); };
    const beats = (a, b) => {            // a e' la carta di chi ha aperto: la seconda b la batte?
      if (a.s === b.s) return RANK[b.n] > RANK[a.n];
      return b.s === trump.s;
    };
    const newGame = () => {
      deck = Cards.shuffle(Cards.deck()); hand = []; cpuHand = []; table = []; ptsP = 0; ptsC = 0; lastWinner = null;
      mv.reset();
      for (let i = 0; i < 3; i++) { hand.push(deck.pop()); cpuHand.push(deck.pop()); fromDeck(hand[i], i * 0.16); fromDeck(cpuHand[i], i * 0.16 + 0.08); }
      trump = deck[0]; lead = Math.random() < 0.5 ? 'P' : 'C'; turn = lead; state = 'play'; wait = 1.0; flash(lead === 'P' ? 'INIZI TU' : 'INIZIA IL TELEFONO');
    };
    const cpuPick = () => {
      const open = table.length === 1 ? table[0].c : null;
      const idx = cpuHand.map((c, i) => i);
      const value = c => pts(c) + (c.s === trump.s ? 20 : 0);          // quanto "costa" perdere quella carta
      if (!open) {                                                     // apre: la carta meno preziosa, senza carichi
        idx.sort((a, b) => value(cpuHand[a]) - value(cpuHand[b])); return idx[0];
      }
      const winners = idx.filter(i => beats(open, cpuHand[i]));
      const worth = pts(open);
      if (winners.length && (worth >= 2 || pts(cpuHand[winners[0]]) < 10 || true)) {
        winners.sort((a, b) => value(cpuHand[a]) - value(cpuHand[b]));
        const w = winners[0];
        if (worth >= 4 || value(cpuHand[w]) <= 14 || (open.s !== trump.s && cpuHand[w].s === trump.s && worth >= 2)) return w;
      }
      idx.sort((a, b) => value(cpuHand[a]) - value(cpuHand[b])); return idx[0];
    };
    const resolve = () => {
      const [a, b] = table, first = a.who;
      const secondWins = beats(a.c, b.c), win = secondWins ? b.who : first, pt = pts(a.c) + pts(b.c);
      if (win === 'P') ptsP += pt; else ptsC += pt;
      lastWinner = win; flash(win === 'P' ? 'PRENDI TU +' + pt : 'PRENDE IL TELEFONO +' + pt);
      if (win === 'P') { api.haptic(pt >= 10 ? 35 : 15); api.beep(pt ? 700 : 400, 0.07, 'triangle', 0.07); } else api.beep(260, 0.07, 'triangle', 0.06);
      table.forEach((t, i) => mv.away(t.c, win === 'P' ? VW / 2 - 35 : VW / 2 - 26, win === 'P' ? VH + 30 : -100, win === 'P' ? 70 : 52, { back: true, delay: 0.25 + i * 0.07 }));
      table = []; state = 'collect'; wait = 1.0; turn = win; lead = win;
    };
    const after = () => {
      // si pesca: prima il vincitore
      if (deck.length) { const order = lastWinner === 'P' ? ['P', 'C'] : ['C', 'P']; order.forEach((w, k) => { const c = deck.length ? deck.pop() : trump; fromDeck(c, k * 0.12); if (w === 'P') hand.push(c); else cpuHand.push(c); }); if (!deck.length && deck.indexOf(trump) < 0) trump = trump; }
      if (!hand.length && !cpuHand.length) { state = 'end'; const win = ptsP > 60 ? 'P' : ptsC > 60 ? 'C' : 'D'; if (win === 'P') { hi++; streak++; api.store.set('wins', hi); api.store.set('streak', streak); [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => api.beep(f, 0.14, 'triangle', 0.08), i * 110)); api.haptic(50); } else if (win === 'C') { streak = 0; api.store.set('streak', 0); api.beep(180, 0.3, 'sawtooth', 0.07); } return; }
      state = 'play'; wait = 0.5;
    };
    const play = (who, i) => {
      const c = (who === 'P' ? hand : cpuHand).splice(i, 1)[0]; table.push({ c, who });
      api.beep(who === 'P' ? 420 : 360, 0.04, 'square', 0.08); api.beep(1700, 0.01, 'square', 0.04);
      if (table.length === 2) { state = 'show'; wait = 1.1; } else turn = who === 'P' ? 'C' : 'P';
    };
    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt); mv.update(dt);
      if (state === 'play') {
        if (wait > 0) { wait -= dt; return; }
        if (turn === 'C') play('C', cpuPick());
      } else if (state === 'show') { wait -= dt; if (wait <= 0) resolve(); }
      else if (state === 'collect') { wait -= dt; if (wait <= 0) after(); }
    };
    const cardRect = i => { const n = hand.length, w = 78, gap = 8, tot = n * w + (n - 1) * gap, x0 = (VW - tot) / 2; return { x: x0 + i * (w + gap), y: 440 - (i === selI ? 12 : 0), w, h: w * 1.5 }; };
    const onPointer = e => {
      if (e.type !== 'down') return;
      const x = (e.x - OX) / S, y = (e.y - OY) / S;
      if (state === 'title') { newGame(); return; }
      if (state === 'end') { newGame(); return; }
      if (state === 'pause') { state = 'play'; return; }
      if (state === 'play' && turn === 'P' && wait <= 0) {
        for (let i = 0; i < hand.length; i++) { const r = cardRect(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h + 24) { if (selI === i) { selI = -1; play('P', i); } else { selI = i; api.beep(900, 0.02, 'triangle', 0.05); } return; } }
        selI = -1;
      }
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'end') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'left' || k === 'right') { if (state === 'play' && turn === 'P' && hand.length) { selI = selI < 0 ? 0 : (selI + (k === 'right' ? 1 : -1) + hand.length) % hand.length; api.beep(900, 0.02, 'triangle', 0.05); } }
      else if ((k === 'a' || k === 'up') && state === 'play' && turn === 'P' && selI >= 0 && wait <= 0) { const i = selI; selI = -1; play('P', i); }
      else if (k === 'a' && (state === 'title' || state === 'end')) newGame();
      else if (k === 'select' && state !== 'title') newGame();
    };
    const text = (s, x, y, size, align, c) => { g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#fff4e0'; g.fillText(s, x, y); };
    const banner = rows => { const h = rows.length * 26 + 16, w = 270, x = (VW - w) / 2, y = 250; g.fillStyle = '#fff4e0'; g.fillRect(x, y, w, h); g.fillStyle = '#0e3a28'; g.fillRect(x + 2, y + 2, w - 4, h - 4); rows.forEach((t, i) => text(t, VW / 2, y + 12 + i * 26, 17, 'center')); };
    const render = () => {
      g.fillStyle = '#0a2a1c'; g.fillRect(0, 0, CW, CH);
      g.save(); g.translate(OX, OY); g.scale(S, S);
      Cards.felt(g, VW, VH, '#2a7a4a', '#0c3a22');
      if (state === 'title') {
        text('BRISCOLA', VW / 2, 120, 44, 'center', '#ffe66a');
        Cards.draw(g, { s: 0, n: 1 }, 60, 200, 70, { angle: -0.18 }); Cards.draw(g, { s: 1, n: 3 }, 120, 190, 70, { angle: -0.06 }); Cards.draw(g, { s: 2, n: 10 }, 180, 190, 70, { angle: 0.06 }); Cards.draw(g, { s: 3, n: 9 }, 240, 200, 70, { angle: 0.18 });
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', VW / 2, 370, 16, 'center');
        text('TOCCA UNA CARTA PER SCEGLIERLA, DI NUOVO PER GIOCARLA', VW / 2, 410, 10, 'center', '#c8e8d0'); text('OLTRE 60 PUNTI: VINCI', VW / 2, 428, 11, 'center', '#c8e8d0');
        text('PARTITE VINTE ' + hi + ' · SERIE ' + streak, VW / 2, 470, 13, 'center');
        g.restore(); return;
      }
      // punteggi
      g.fillStyle = 'rgba(8,24,16,.7)'; g.fillRect(0, 0, VW, 44); text('TU ' + ptsP, 14, 10, 18, 'left', '#ffe66a'); text('TELEFONO ' + ptsC, VW - 14, 10, 18, 'right', '#ffe66a'); text('MAZZO ' + deck.length, VW / 2, 14, 11, 'center', '#c8e8d0');
      // mano del telefono
      cpuHand.forEach((c, i) => mv.card(g, c, 105 + i * 52, 52, 52, { back: true }));
      // mazzo e briscola
      if (deck.length > 1) { Cards.draw(g, null, 14, 220, 52, { back: true }); }
      if (deck.length >= 1) Cards.draw(g, trump, 14 + 68, 244, 52, { angle: Math.PI / 2 });
      text('BRISCOLA', 40, 205, 10, 'center', '#ffe66a'); Cards.suitSymbol(g, trump.s, 40, 190, 9);
      // carte sul tavolo
      table.forEach((t, i) => mv.card(g, t.c, 125 + i * 56 + (t.who === 'P' ? 10 : -10), 230 + (t.who === 'P' ? 20 : -20), 70, { lift: true, angle: t.who === 'P' ? 0.05 : -0.05 }));
      // mano del giocatore
      hand.forEach((c, i) => { const r = cardRect(i); mv.card(g, c, r.x, r.y, r.w, { sel: i === selI, lift: i === selI, dim: !(state === 'play' && turn === 'P') }); });
      mv.flush(g);
      if (msgT > 0) text(msg, VW / 2, 392, 14, 'center', '#ffe66a');
      if (state === 'play' && turn === 'P' && wait <= 0) text(selI >= 0 ? 'TOCCA DI NUOVO PER GIOCARE' : 'SCEGLI UNA CARTA', VW / 2, 560, 12, 'center', '#c8e8d0');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'end') { const w = ptsP > 60 ? 'HAI VINTO!' : ptsC > 60 ? 'HAI PERSO' : 'PAREGGIO'; banner([w, ptsP + ' A ' + ptsC, 'TOCCA']); }
      g.restore();
    };
    return {
      onPress: act, onPointer, onHide() { if (state === 'play') state = 'pause'; },
      update, render,
      debug: { newGame, get state() { return state; }, get hand() { return hand; }, get turn() { return turn; }, get ptsP() { return ptsP; }, get ptsC() { return ptsC; }, get deck() { return deck; }, play, get wait() { return wait; }, set selI(v) { selI = v; } },
    };
  },
});

// TRESETTE: il gioco di carte italiano a due. Non c'è briscola: vince la presa la carta più alta del seme di chi ha aperto.
registerGame({
  id: 'tresette',
  title: 'TRESETTE',
  author: 'Tasca Arcade',
  license: 'MIT',
  color: '#3f8a3a',
  blurb: "Gioca a Tresette contro il telefono e conquista le prese.",
  inputs: ['TOCCO', 'CARTE'],
  size: [360, 600],
  bg: '#0e3a28',
  flexH: true,
  flexMin: 1.1,
  create(api) {
    const { cv, g } = api;
    const CW = cv.width, CH = cv.height, VW = 360, VH = 600;
    const S = Math.min(CW / VW, CH / VH), OX = (CW - VW * S) / 2, OY = (CH - VH * S) / 2;
    const RANK = { 3: 10, 2: 9, 1: 8, 10: 7, 9: 6, 8: 5, 7: 4, 6: 3, 5: 2, 4: 1 };
    const TH = c => (c.n === 1 ? 3 : (c.n === 3 || c.n === 2 || c.n === 10 || c.n === 9 || c.n === 8) ? 1 : 0);   // terzi di punto
    let wins = api.store.get('wins', 0);
    let state = 'title', time = 0, deck, hand, cpuHand, table, turn, thP, thC, msg = '', msgT = 0, wait = 0, selI = -1, lastWinner = null;
    const flash = t => { msg = t; msgT = 1.6; };
    const mv = Cards.motion();
    // Le carte arrivano dal mazzo e le prese volano verso chi vince.
    const fromDeck = (c, delay) => mv.from(c, 14, 220, 50, { back: true, delay });
    const pts = t => Math.floor(t / 3) + (t % 3 ? ' ' + (t % 3) + '/3' : '');
    const mustFollow = () => !deck.length;
    const legal = (h, lead) => { if (!lead || !mustFollow()) return h.map((_, i) => i); const same = h.map((c, i) => (c.s === lead.s ? i : -1)).filter(i => i >= 0); return same.length ? same : h.map((_, i) => i); };
    const newGame = () => {
      deck = Cards.shuffle(Cards.deck()); hand = []; cpuHand = []; table = []; thP = 0; thC = 0; lastWinner = null;
      mv.reset();
      for (let i = 0; i < 5; i++) { hand.push(deck.pop()); cpuHand.push(deck.pop()); fromDeck(hand[i], i * 0.14); fromDeck(cpuHand[i], i * 0.14 + 0.07); }
      turn = Math.random() < 0.5 ? 'P' : 'C'; state = 'play'; wait = 1.2; flash(turn === 'P' ? 'INIZI TU' : 'INIZIA IL TELEFONO');
    };
    const cpuPick = () => {
      const lead = table.length ? table[0].c : null, ok = legal(cpuHand, lead);
      const cost = c => TH(c) * 2 + RANK[c.n] * 0.3;
      if (!lead) {                                                       // apre con una carta bassa del seme che ha piu' volte
        const cnt = [0, 0, 0, 0]; cpuHand.forEach(c => cnt[c.s]++);
        ok.sort((a, b) => (cost(cpuHand[a]) - cost(cpuHand[b])) - (cnt[cpuHand[b].s] - cnt[cpuHand[a].s]) * 0.5); return ok[0];
      }
      const win = ok.filter(i => cpuHand[i].s === lead.s && RANK[cpuHand[i].n] > RANK[lead.n]);
      const worth = TH(lead);
      if (win.length && (worth >= 1 || Math.random() < 0.5)) { win.sort((a, b) => RANK[cpuHand[a].n] - RANK[cpuHand[b].n]); return win[0]; }
      ok.sort((a, b) => cost(cpuHand[a]) - cost(cpuHand[b])); return ok[0];
    };
    const resolve = () => {
      const [a, b] = table, secondWins = b.c.s === a.c.s && RANK[b.c.n] > RANK[a.c.n], win = secondWins ? b.who : a.who, t = TH(a.c) + TH(b.c);
      if (win === 'P') thP += t; else thC += t; lastWinner = win;
      flash((win === 'P' ? 'PRENDI TU' : 'PRENDE IL TELEFONO') + (t ? ' +' + t + '/3' : ''));
      api.beep(win === 'P' ? 700 : 260, 0.07, 'triangle', 0.07); if (win === 'P') api.haptic(t >= 3 ? 30 : 12);
      table.forEach((t, i) => mv.away(t.c, win === 'P' ? VW / 2 - 35 : VW / 2 - 24, win === 'P' ? VH + 30 : -100, win === 'P' ? 70 : 48, { back: true, delay: 0.25 + i * 0.07 }));
      table = []; state = 'collect'; wait = 0.9; turn = win;
    };
    const after = () => {
      if (deck.length) { (lastWinner === 'P' ? [hand, cpuHand] : [cpuHand, hand]).forEach((h, k) => { if (deck.length) { const c = deck.pop(); fromDeck(c, k * 0.12); h.push(c); } }); }
      if (!hand.length && !cpuHand.length) {
        if (lastWinner === 'P') thP += 3; else thC += 3;
        state = 'end'; if (thP > thC) { wins++; api.store.set('wins', wins); [523, 659, 784, 1046].forEach((f, k) => setTimeout(() => api.beep(f, 0.14, 'triangle', 0.08), k * 110)); api.haptic(50); } else api.beep(180, 0.3, 'sawtooth', 0.07);
        return;
      }
      state = 'play'; wait = 0.4;
    };
    const play = (who, i) => {
      const c = (who === 'P' ? hand : cpuHand).splice(i, 1)[0]; table.push({ c, who });
      api.beep(who === 'P' ? 420 : 360, 0.04, 'square', 0.08); api.beep(1700, 0.01, 'square', 0.04);
      if (table.length === 2) { state = 'show'; wait = 1.0; } else turn = who === 'P' ? 'C' : 'P';
    };
    const update = dt => {
      time += dt; msgT = Math.max(0, msgT - dt); mv.update(dt);
      if (state === 'play') { if (wait > 0) { wait -= dt; return; } if (turn === 'C') play('C', cpuPick()); }
      else if (state === 'show') { wait -= dt; if (wait <= 0) resolve(); }
      else if (state === 'collect') { wait -= dt; if (wait <= 0) after(); }
    };
    const rect = i => { const n=hand.length,w=n>4?60:72,gap=6,two=n>5,row=two?Math.floor(i/5):0,col=two?i%5:i,count=two?Math.min(5,n-row*5):n,tot=count*w+(count-1)*gap;return{x:(VW-tot)/2+col*(w+gap),y:(two?(row?464:358):452)-(i===selI?12:0),w,h:w*1.5}; };
    const tryPlay = i => { const lead = table.length ? table[0].c : null; if (!legal(hand, lead).includes(i)) { flash('DEVI RISPONDERE AL SEME'); api.beep(160, 0.08, 'square', 0.07); return; } selI = -1; play('P', i); };
    const onPointer = e => {
      if (e.type !== 'down') return;
      const x = (e.x - OX) / S, y = (e.y - OY) / S;
      if (state === 'title' || state === 'end') { newGame(); return; }
      if (state === 'pause') { state = 'play'; return; }
      if (state === 'play' && turn === 'P' && wait <= 0) {
        for (let i = 0; i < hand.length; i++) { const r = rect(i); if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { if (selI === i) tryPlay(i); else { selI = i; api.beep(900, 0.02, 'triangle', 0.05); } return; } }
        selI = -1;
      }
    };
    const act = k => {
      if (k === 'start') { if (state === 'title' || state === 'end') newGame(); else if (state === 'play') state = 'pause'; else if (state === 'pause') state = 'play'; }
      else if (k === 'left' || k === 'right') { if (state === 'play' && turn === 'P' && hand.length) { selI = selI < 0 ? 0 : (selI + (k === 'right' ? 1 : -1) + hand.length) % hand.length; api.beep(900, 0.02, 'triangle', 0.05); } }
      else if (k === 'a' && state === 'play' && turn === 'P' && selI >= 0 && wait <= 0) tryPlay(selI);
      else if (k === 'a' && (state === 'title' || state === 'end')) newGame();
      else if (k === 'select' && state !== 'title') newGame();
    };
    const text = (s, x, y, size, align, c) => { g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = c || '#fff4e0'; g.fillText(s, x, y); };
    const banner = rows => { const h = rows.length * 26 + 16, w = 270, x = (VW - w) / 2, y = 250; g.fillStyle = '#fff4e0'; g.fillRect(x, y, w, h); g.fillStyle = '#0e3a28'; g.fillRect(x + 2, y + 2, w - 4, h - 4); rows.forEach((t, i) => text(t, VW / 2, y + 12 + i * 26, 17, 'center')); };
    const render = () => {
      g.fillStyle = '#0a2a1c'; g.fillRect(0, 0, CW, CH);
      g.save(); g.translate(OX, OY); g.scale(S, S);
      Cards.felt(g, VW, VH, '#2f7f45', '#0c3a22');
      if (state === 'title') {
        text('TRESETTE', VW / 2, 120, 44, 'center', '#ffe66a');
        Cards.draw(g, { s: 3, n: 3 }, 70, 200, 70, { angle: -0.15 }); Cards.draw(g, { s: 3, n: 2 }, 140, 192, 70, { angle: -0.03 }); Cards.draw(g, { s: 3, n: 1 }, 210, 192, 70, { angle: 0.1 });
        if (((performance.now() / 500) | 0) % 2 === 0) text('TOCCA PER INIZIARE', VW / 2, 370, 16, 'center');
        text('IL TRE È LA CARTA PIÙ FORTE, POI IL DUE E L\'ASSO', VW / 2, 410, 10, 'center', '#c8e8d0'); text('TOCCA UNA CARTA, POI DI NUOVO PER GIOCARLA', VW / 2, 428, 10, 'center', '#c8e8d0');
        text('PARTITE VINTE ' + wins, VW / 2, 470, 13, 'center'); g.restore(); return;
      }
      g.fillStyle = 'rgba(8,24,16,.7)'; g.fillRect(0, 0, VW, 44); text('TU ' + pts(thP), 12, 10, 16, 'left', '#ffe66a'); text('CPU ' + pts(thC), VW - 12, 10, 16, 'right', '#ffe66a'); text('MAZZO ' + deck.length, VW / 2, 16, 11, 'center', '#c8e8d0');
      cpuHand.forEach((c, i) => mv.card(g, c, VW / 2 - cpuHand.length * 24 + i * 48 - 4, 52, 48, { back: true }));
      if (deck.length) Cards.draw(g, null, 14, 220, 50, { back: true });
      table.forEach((t, i) => mv.card(g, t.c, 125 + i * 56 + (t.who === 'P' ? 10 : -10), 230 + (t.who === 'P' ? 20 : -20), 70, { lift: true, angle: t.who === 'P' ? 0.05 : -0.05 }));
      const lead = table.length ? table[0].c : null, ok = legal(hand, lead);
      hand.forEach((c, i) => { const r = rect(i); mv.card(g, c, r.x, r.y, r.w, { sel: i === selI, lift: i === selI, dim: !(state === 'play' && turn === 'P' && ok.includes(i)) }); });
      mv.flush(g);
      if (msgT > 0) text(msg, VW / 2, 396, 13, 'center', '#ffe66a');
      if (state === 'play' && turn === 'P' && wait <= 0) text(selI >= 0 ? 'TOCCA DI NUOVO PER GIOCARE' : mustFollow() && lead ? 'RISPONDI AL SEME' : 'SCEGLI UNA CARTA', VW / 2, 566, 11, 'center', '#c8e8d0');
      if (state === 'pause') banner(['PAUSA', 'START']);
      if (state === 'end') banner([thP > thC ? 'HAI VINTO!' : thP < thC ? 'HAI PERSO' : 'PAREGGIO', pts(thP) + ' A ' + pts(thC), 'TOCCA']);
      g.restore();
    };
    return {
      onPress: act, onPointer, onHide() { if (state === 'play') state = 'pause'; },
      update, render,
      debug: { newGame, get state() { return state; }, get hand() { return hand; }, get cardRects() { return hand.map((_,i)=>rect(i)); }, get turn() { return turn; }, get thP() { return thP; }, get thC() { return thC; }, get wait() { return wait; }, get table() { return table; }, tryPlay, legalIdx() { return legal(hand, table.length ? table[0].c : null); }, playRaw(i) { play('P', i); } },
    };
  },
});

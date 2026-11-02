registerGame({
  id: 'pugni-in-piazza',
  title: 'PUGNI IN PIAZZA',
  color: '#e8762c',
  blurb: 'Picchiaduro uno contro uno, al meglio dei tre round. Scegli fra quattro lottatori da commedia, batti gli altri tre e poi il Maestro del Buio. A pugno, B calcio, indietro para (in basso para le spazzate). Le mosse speciali escono con le mezzelune della croce: ↓↘→, →↓↘, ↓↙←. Colpi di fila fanno combo; troppi colpi stordiscono.',
  inputs: ['CROCE', 'A PUGNO · B CALCIO', 'MEZZELUNE', 'VIBRAZIONE'],
  size: [360, 640],
  bg: '#120d16',
  flexH: true,
  flexMin: 1.15,
  compactPad: true,
  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    const FL = Math.round(Math.max(250, Math.min(H * 0.6, H - 190))), L = 14, R = W - 14, GRAV = 2300, TAU = Math.PI * 2, OUT = '#170e18';

    // Lottatori originali. sp: mosse speciali (m = mezzaluna, k = tasto).
    const CH = [
      { name: 'GIGANTE', from: 'IL PORTO', tag: 'Omone barbuto. Lento, ma ogni schiaffo pesa.', size: 1.18, spd: .78, pow: 1.3, hp: 120,
        skin: '#e0a888', gi: '#3a5a8a', gi2: '#2a4468', belt: '#c8a050', hair: '#6a4020', style: 'beard', sleeve: false, aura: '#ffb04a', stage: 0,
        sp: [{ m: 'qcf', k: 'a', type: 'rush', name: 'CARICA' }, { m: 'dp', k: 'a', type: 'rise', name: 'MARTELLO' }, { m: 'qcb', k: 'a', type: 'grab', name: 'ABBRACCIO' }] },
      { name: 'BIONDO', from: 'IL MERCATO', tag: 'Furbo e sorridente. Veloce, colpisce e scappa.', size: .98, spd: 1.2, pow: .92, hp: 94,
        skin: '#f0c8a4', gi: '#e8e8f0', gi2: '#b8b8c8', belt: '#6a3a20', hair: '#e8c870', style: 'crop', sleeve: true, aura: '#6ad0ff', stage: 1,
        sp: [{ m: 'qcf', k: 'a', type: 'proj', name: 'PADELLATA' }, { m: 'dp', k: 'b', type: 'rise', name: 'FALCO', pose: 'riseK' }, { m: 'qcb', k: 'b', type: 'spin', name: 'RAFFICA' }] },
      { name: 'TRAVET', from: 'L\'UFFICIO', tag: 'Impiegato sfortunato. Impacciato, ma imprevedibile.', size: .96, spd: .98, pow: .95, hp: 100,
        skin: '#e4b08a', gi: '#8a8a98', gi2: '#5a5a68', belt: '#c8392f', hair: '#2a2a2a', style: 'crop', sleeve: true, aura: '#aab3d8', stage: 2,
        sp: [{ m: 'qcf', k: 'a', type: 'proj', name: 'CARTELLA' }, { m: 'dp', k: 'a', type: 'rise', name: 'SCATTO' }, { m: 'qcb', k: 'b', type: 'spin', name: 'BORSATA' }] },
      { name: 'CIALTRONE', from: 'I TETTI', tag: 'Chiacchierone da cortile. Colpi a sorpresa.', size: 1, spd: 1.1, pow: 1, hp: 98,
        skin: '#e8b48c', gi: '#d8a02a', gi2: '#a07018', belt: '#2a1a12', hair: '#3a2a1a', style: 'cap', cap: '#c8392f', sleeve: true, aura: '#ffe14a', stage: 3,
        sp: [{ m: 'qcf', k: 'a', type: 'proj', name: 'CIABATTA' }, { m: 'dp', k: 'b', type: 'rise', name: 'FALCO', pose: 'riseK' }, { m: 'qcb', k: 'a', type: 'grab', name: 'PIZZICOTTO' }] },
    ];
    const BOSS = { name: 'MAESTRO', from: 'IL BUIO', tag: 'Il campione di nessuno.', size: 1.15, spd: 1.1, pow: 1.25, hp: 135,
      skin: '#e4b08a', gi: '#4a5a8a', gi2: '#2a3558', belt: '#e8e8f0', hair: '#cfcfd8', style: 'beard', sleeve: false, aura: '#c060ff', shadow: true, stage: 4,
      sp: [{ m: 'qcf', k: 'a', type: 'proj', name: 'ONDA D\'URTO', big: true }, { m: 'dp', k: 'b', type: 'rise', name: 'CALCIO ROTANTE', pose: 'riseK' }, { m: 'qcb', k: 'b', type: 'spin', name: 'TORNADO' }, { m: 'qcf', k: 'b', type: 'rush', name: 'CARICA' }] };
    const MOTXT = { qcf: '↓↘→', dp: '→↓↘', qcb: '↓↙←' };

    // Colpi. su/ac/rc: avvio, attivo, recupero (s); reach e y0..y1: dove arriva il colpo (px, altezza dai piedi).
    const NM = {
      sA: { su: .05, ac: .07, rc: .12, dmg: 6, reach: 42, y0: 56, y1: 76, hs: .26, bs: .15, kind: 'mid', push: 70, pose: 'punch' },
      sB: { su: .1, ac: .08, rc: .22, dmg: 10, reach: 56, y0: 42, y1: 70, hs: .3, bs: .18, kind: 'mid', push: 100, pose: 'kick', heavy: true },
      cA: { su: .05, ac: .06, rc: .12, dmg: 5, reach: 42, y0: 28, y1: 46, hs: .24, bs: .14, kind: 'mid', push: 60, pose: 'cpunch', crouch: true },
      cB: { su: .09, ac: .08, rc: .34, dmg: 8, reach: 60, y0: 0, y1: 18, hs: .3, bs: .18, kind: 'low', kd: true, push: 40, pose: 'sweep', crouch: true },
      jA: { su: .05, ac: 9, rc: 0, dmg: 8, reach: 36, y0: 14, y1: 50, hs: .32, bs: .18, kind: 'over', push: 60, pose: 'jpunch', air: true },
      jB: { su: .07, ac: 9, rc: 0, dmg: 10, reach: 46, y0: -6, y1: 30, hs: .36, bs: .2, kind: 'over', push: 80, pose: 'jkick', air: true, heavy: true },
      thr: { su: .04, ac: .04, rc: .3, dmg: 13, reach: 48, kind: 'throw', pose: 'throw' },
    };
    const SP = {
      proj: { su: .2, ac: .01, rc: .4, pose: 'proj', special: true },
      rise: { su: .04, ac: .32, rc: .28, dmg: 14, reach: 36, y0: 30, y1: 120, hs: .4, bs: .2, kind: 'mid', kd: true, push: 40, pose: 'rise', special: true, inv: .15 },
      spin: { su: .1, ac: .5, rc: .22, dmg: 5, reach: 52, y0: 34, y1: 60, hs: .22, bs: .12, kind: 'mid', multi: .13, push: 40, pose: 'spin', special: true },
      rush: { su: .1, ac: .32, rc: .3, dmg: 12, reach: 40, y0: 30, y1: 80, hs: .35, bs: .2, kind: 'mid', kd: true, push: 60, pose: 'rush', special: true },
      grab: { su: .06, ac: .05, rc: .45, dmg: 20, reach: 60, kind: 'throw', pose: 'grab', special: true },
    };
    const SHOT = { hs: .38, bs: .22, kind: 'mid', push: 90, special: true };
    const MOT = { qcf: [[2, 3, 6], [2, 6]], dp: [[6, 2, 3], [6, 3, 2, 3]], qcb: [[2, 1, 4], [2, 4]] };

    let hi = api.store.get('hi', 0);
    let state = 'title', paused = false, sel = 0, ladder = 0, order = [], pch = CH[0], score = 0, time = 0;
    let P1 = null, P2 = null, projs = [], phase = 'intro', phaseT = 0, round = 1, wins = [0, 0], clock = 60, stop = 0, why = '', rWin = -1, bonus = null, stateT = 0;
    let combo = { n: 0, t: 0, side: 0 };

    const arp = (notes, step, type, vol) => notes.forEach((f, i) => setTimeout(() => api.beep(f, step * 1.4, type || 'square', vol || 0.04), i * step * 1000));
    const mkF = (ch, side) => ({ ch, s: ch.size, x: side ? R - 80 : L + 80, y: 0, vx: 0, vy: 0, pv: 0, face: side ? -1 : 1, hp: ch.hp, ghost: ch.hp, st: 'idle', t: 0, dur: 0,
      mv: null, spd: null, hitDone: false, hits: 0, lastHit: -9, airAtk: false, float: false, fired: false, rose: false, combo: 0, stun: 0, flashT: 0, inv: 0, walk: 0, low: false,
      hist: [], dir: 5, buf: null, ai: side ? { cd: .8, mx: 0, my: 0, hold: 0, block: 0, low: false, cancel: false } : null });

    // ---- comandi ----
    const inputOf = f => f.ai ? { x: f.ai.mx * f.face, y: f.ai.my } : { x: (held.right ? 1 : 0) - (held.left ? 1 : 0), y: held.up ? 1 : held.down ? -1 : 0 };
    const free = f => f.st === 'idle' || f.st === 'walk' || f.st === 'crouch';
    const canCancel = f => f.st === 'atk' && !f.mv.special && !f.mv.air && f.hitDone && f.t < f.mv.su + f.mv.ac + f.mv.rc * .7;
    const motion = (f, m) => {
      const h = f.hist.filter(e => e.t >= time - .5).map(e => e.n);
      if (h.length && h[h.length - 1] === 5 && time - f.hist[f.hist.length - 1].t < .12) h.pop();
      return MOT[m].some(p => {
        if (h[h.length - 1] !== p[p.length - 1]) return false;
        let i = p.length - 1;
        for (let j = h.length - 1; j >= 0 && i >= 0; j--) if (h[j] === p[i]) i--;
        return i < 0;
      });
    };
    const startMove = (f, mv, sp) => {
      f.st = 'atk'; f.mv = mv; f.spd = sp || null; f.t = 0; f.hitDone = false; f.hits = 0; f.lastHit = -9; f.fired = false; f.rose = false;
      if (!mv.air) f.vx = 0;
      if (mv.inv) f.inv = mv.inv;
      api.beep(mv.special ? 240 : mv.heavy ? 380 : 520, .04, mv.special ? 'sawtooth' : 'square', .025);
    };
    const special = (f, s) => {
      if (s.type === 'proj' && projs.some(p => p.owner === f)) return false;
      startMove(f, SP[s.type], s);
      api.fx.text(f.x, FL - 118 * f.s, s.name, { color: f.ch.aura, size: 13, life: .7 });
      return true;
    };
    const tryAttack = (f, o, k) => {
      if ((free(f) || canCancel(f)) && f.y <= 0) for (const s of f.ch.sp) if (s.k === k && motion(f, s.m) && special(f, s)) return true;
      if (f.st === 'jump' && !f.airAtk) { f.airAtk = true; startMove(f, k === 'a' ? NM.jA : NM.jB); return true; }
      if (!free(f)) return false;
      if (k === 'a' && (f.dir === 6 || f.dir === 4) && Math.abs(o.x - f.x) < NM.thr.reach * f.s && o.y <= 0 && (free(o) || o.st === 'atk')) { startMove(f, NM.thr); return true; }
      const low = f.dir <= 3;
      startMove(f, k === 'a' ? (low ? NM.cA : NM.sA) : (low ? NM.cB : NM.sB));
      return true;
    };

    // ---- colpi ----
    const hurt = f => {
      if (f.inv > 0 || f.st === 'fall' || f.st === 'down' || f.st === 'rise' || f.st === 'ko') return null;
      const s = f.s, crouch = f.st === 'crouch' || (f.st === 'block' && f.low) || (f.st === 'atk' && f.mv.crouch);
      const h = (crouch ? 58 : f.y > 0 ? 76 : 90) * s;
      return { x0: f.x - 16 * s, x1: f.x + 16 * s, y0: FL - f.y - h, y1: FL - f.y };
    };
    const hitbox = f => {
      if (f.st !== 'atk') return null;
      const mv = f.mv;
      if (!mv.dmg || f.hitDone || f.t < mv.su || f.t >= mv.su + mv.ac) return null;
      const s = f.s, a = f.x + f.face * 6 * s, b = f.x + f.face * mv.reach * s;
      return { x0: Math.min(a, b), x1: Math.max(a, b), y0: FL - f.y - mv.y1 * s, y1: FL - f.y - mv.y0 * s };
    };
    const contact = (a, d, mv, px, py, dmg0) => {
      const toA = a.x >= d.x ? 1 : -1, inp = inputOf(d);
      const wall = (a.face > 0 && d.x > R - 34) || (a.face < 0 && d.x < L + 34);
      const blocks = d.y <= 0 && (free(d) || d.st === 'block') && inp.x === -toA && inp.y <= 0 && (mv.kind === 'mid' || (mv.kind === 'low') === (inp.y < 0));
      if (blocks) {
        d.st = 'block'; d.t = 0; d.dur = mv.bs; d.low = inp.y < 0; d.vx = 0; d.face = toA;
        if (wall) a.pv = -a.face * mv.push * .9; else d.pv = a.face * mv.push;
        if (mv.special) d.hp = Math.max(0, d.hp - 2);
        stop = .05; api.beep(760, .03, 'square', .03);
        api.fx.burst(px, py, { n: 6, color: '#bfe6ff', speed: 130, life: .2, size: 2 });
        if (d === P1) api.haptic(6);
        if (d.hp > 0) return;
      }
      const chain = d.st === 'hit' || d.st === 'fall';
      a.combo = chain ? a.combo + 1 : 1;
      let dmg = blocks ? 0 : (dmg0 || mv.dmg) * a.ch.pow * Math.max(.5, 1 - .1 * (a.combo - 1));
      if (a.combo >= 2) combo = { n: a.combo, t: 1.3, side: a === P1 ? 0 : 1 };
      d.hp = Math.max(0, d.hp - dmg); d.flashT = .08; d.mv = null; d.float = false; d.face = toA;
      if (d.st !== 'dizzy') d.stun += dmg * 1.5;
      if (d.hp <= 0 || mv.kd || d.y > 0) { d.st = 'fall'; d.t = 0; d.vy = d.hp <= 0 ? 520 : 400; d.vx = a.face * (d.hp <= 0 ? 210 : 150); d.y = Math.max(d.y, 1); }
      else if (d.stun > 42) { d.st = 'dizzy'; d.t = 0; d.dur = 2.4; d.stun = 0; d.vx = 0; api.fx.text(d.x, FL - 130 * d.s, 'STORDITO!', { color: '#ffe14a', size: 14 }); }
      else { d.st = 'hit'; d.t = 0; d.dur = mv.hs; d.vx = 0; if (wall) a.pv = -a.face * mv.push * .9; else d.pv = a.face * mv.push; }
      const big = mv.heavy || mv.special;
      stop = big ? .1 : .065;
      api.fx.burst(px, py, { n: big ? 16 : 9, color: big ? '#ffb04a' : '#ffe14a', speed: big ? 240 : 170, life: .28, size: 2.6, glow: true });
      if (big) api.fx.shake(3, .12);
      api.beep(big ? 110 : 150, big ? .12 : .07, 'square', .06); api.beep(70, .1, 'sawtooth', .035);
      if (d === P1) { api.haptic(big ? 26 : 14); if (big) api.fx.flash('#ff3030', .1, .18); }
      else { api.haptic(big ? 14 : 8); score += Math.round(dmg * 10) + (a.combo > 1 ? a.combo * 50 : 0); }
      if (a.ai && !mv.special && Math.random() < aiLevel() * .13) a.ai.cancel = true;
    };
    const resolve = (a, d) => {
      const mv = a.mv;
      if (a.st !== 'atk' || !mv || a.hitDone) return;
      if (mv.kind === 'throw') {
        if (a.t < mv.su || a.t >= mv.su + mv.ac) return;
        if (d.y > 0 || d.inv > 0 || !(free(d) || d.st === 'atk' || d.st === 'dizzy') || Math.abs(d.x - a.x) > mv.reach * a.s) return;
        a.hitDone = true;
        const dmg = mv.dmg * a.ch.pow;
        d.hp = Math.max(0, d.hp - dmg); d.st = 'fall'; d.t = 0; d.vy = 440; d.vx = a.face * 180; d.y = 1; d.mv = null; d.float = false; d.flashT = .1; d.face = -a.face;
        stop = .12; api.fx.shake(5, .2); api.beep(90, .18, 'sawtooth', .06);
        api.fx.text(a.x, FL - 120 * a.s, mv === SP.grab ? (a.spd ? a.spd.name : 'ABBRACCIO') + '!' : 'PRESA!', { color: '#ffe14a', size: 14 });
        if (d === P1) api.haptic(30); else { api.haptic(16); score += Math.round(dmg * 10); }
        return;
      }
      const hb = hitbox(a), hu = hurt(d);
      if (!hb || !hu || hb.x1 < hu.x0 || hb.x0 > hu.x1 || hb.y1 < hu.y0 || hb.y0 > hu.y1) return;
      a.hitDone = true; a.hits++; a.lastHit = a.t;
      contact(a, d, mv, (Math.max(hb.x0, hu.x0) + Math.min(hb.x1, hu.x1)) / 2, (Math.max(hb.y0, hu.y0) + Math.min(hb.y1, hu.y1)) / 2);
    };

    // ---- un lottatore per passo ----
    const land = f => {
      if (f.st === 'jump' || (f.st === 'atk' && f.mv.air)) { f.st = 'idle'; f.mv = null; f.vx = 0; api.beep(120, .03, 'triangle', .02); }
      else if (f.st === 'fall') { f.st = f.hp <= 0 ? 'ko' : 'down'; f.t = 0; f.vx = 0; api.fx.shake(2, .1); api.beep(80, .1, 'triangle', .05); api.fx.burst(f.x, FL, { n: 8, color: '#c8b8a0', speed: 90, life: .35, size: 2, angle: -Math.PI / 2, spread: 1.4 }); }
      else if (f.st === 'atk') f.vx = 0;
    };
    const stepF = (f, o, dt) => {
      f.t += dt; f.flashT -= dt; f.inv -= dt; f.stun = Math.max(0, f.stun - dt * 6); f.ghost = Math.max(f.hp, f.ghost - 30 * dt);
      const inp = inputOf(f), n = 5 + inp.x * f.face + 3 * inp.y;
      if (n !== f.dir) { f.dir = n; f.hist.push({ n, t: time }); if (f.hist.length > 12) f.hist.shift(); }
      if (f.buf && time - f.buf.t > .15) f.buf = null;
      if (free(f)) { o.combo = 0; if (f.y <= 0) f.face = o.x >= f.x ? 1 : -1; }
      switch (f.st) {
        case 'idle': case 'walk': case 'crouch':
          if (phase !== 'fight') { f.st = 'idle'; f.vx = 0; break; }
          if (f.buf) { const k = f.buf.k; f.buf = null; if (tryAttack(f, o, k)) break; }
          if (inp.y > 0) { f.st = 'jump'; f.t = 0; f.vy = 800; f.y = 1; f.vx = inp.x * 175 * f.ch.spd; f.airAtk = false; break; }
          if (inp.y < 0) { f.st = 'crouch'; f.vx = 0; break; }
          f.st = inp.x ? 'walk' : 'idle';
          f.vx = inp.x * (inp.x === f.face ? 135 : 105) * f.ch.spd;
          f.walk += dt * inp.x * f.face * f.ch.spd;
          break;
        case 'atk': {
          const mv = f.mv, ph = f.t < mv.su ? 0 : f.t < mv.su + mv.ac ? 1 : 2;
          if (f.ai && f.ai.cancel && canCancel(f)) {
            f.ai.cancel = false;
            const s = f.ch.sp.filter(x => x.type !== 'grab' && x.type !== 'proj')[0] || f.ch.sp[0];
            if (special(f, s)) break;
          }
          if (f.buf && canCancel(f)) { const k = f.buf.k; if (f.ch.sp.some(s => s.k === k && motion(f, s.m))) { f.buf = null; tryAttack(f, o, k); break; } }
          if (mv === SP.proj && !f.fired && ph > 0) {
            f.fired = true; const big = !!f.spd.big;
            projs.push({ x: f.x + f.face * 30 * f.s, y: 64 * f.s, vx: f.face * (big ? 175 : 235), owner: f, r: big ? 13 : 10, dmg: big ? 13 : 10, color: f.ch.aura, t: 0 });
            api.beep(330, .18, 'sawtooth', .04); api.beep(500, .12, 'triangle', .03);
          }
          if (mv === SP.rise && ph === 1 && !f.rose) { f.rose = true; f.vy = 800; f.y = 1; f.vx = 70 * f.face; api.beep(600, .15, 'sawtooth', .035); }
          if (mv === SP.rush) f.vx = ph === 1 ? 390 * f.face * Math.sqrt(f.ch.spd) : ph === 2 ? f.vx * Math.pow(.02, dt) : 0;
          if (mv === SP.spin) {
            if (ph === 1) { f.float = true; f.y = Math.min(26, f.y + 260 * dt); f.vy = 0; f.vx = 190 * f.face; if (f.hitDone && f.t - f.lastHit > mv.multi && f.hits < 3) f.hitDone = false; }
            else if (ph === 2 && f.float) { f.float = false; f.vx = 0; }
          }
          if (!mv.air && f.t >= mv.su + mv.ac + mv.rc && f.y <= 0) { f.st = mv.crouch ? 'crouch' : 'idle'; f.mv = null; f.vx = 0; }
          break;
        }
        case 'hit': case 'block':
          if (f.t >= f.dur) f.st = f.st === 'block' && f.low ? 'crouch' : 'idle';
          break;
        case 'down': if (f.t > .55) { f.st = 'rise'; f.t = 0; } break;
        case 'rise': if (f.t > .35) { f.st = 'idle'; f.inv = .12; } break;
        case 'dizzy': if (f.t >= f.dur) f.st = 'idle'; break;
      }
      if (!f.float && (f.y > 0 || f.vy > 0)) { f.vy -= GRAV * dt; f.y += f.vy * dt; if (f.y <= 0) { f.y = 0; f.vy = 0; land(f); } }
      f.x += (f.vx + f.pv) * dt; f.pv *= Math.exp(-11 * dt);
      if (f.st === 'down' || f.st === 'ko') f.vx *= Math.exp(-8 * dt);
    };
    const separate = () => {
      const a = P1, b = P2, min = 15 * (a.s + b.s), dx = b.x - a.x;
      if (Math.abs(dx) < min && Math.abs(a.y - b.y) < 60 && a.st !== 'down' && b.st !== 'down' && a.st !== 'ko' && b.st !== 'ko') {
        const s = dx === 0 ? a.face : Math.sign(dx), push = (min - Math.abs(dx)) / 2;
        a.x -= s * push; b.x += s * push;
      }
      for (const f of [a, b]) f.x = Math.max(L + 12, Math.min(R - 12, f.x));
      if (Math.abs(b.x - a.x) < min && Math.abs(a.y - b.y) < 60) {
        if (a.x <= L + 12) b.x = Math.max(b.x, a.x + min); else if (a.x >= R - 12) b.x = Math.min(b.x, a.x - min);
        if (b.x <= L + 12) a.x = Math.max(a.x, b.x + min); else if (b.x >= R - 12) a.x = Math.min(a.x, b.x - min);
      }
    };
    const stepProjs = dt => {
      for (const p of projs) { p.x += p.vx * dt; p.t += dt; }
      for (const p of projs) for (const q of projs) if (p !== q && p.owner !== q.owner && !p.dead && !q.dead && Math.abs(p.x - q.x) < p.r + q.r) {
        p.dead = q.dead = true; api.fx.burst((p.x + q.x) / 2, FL - p.y, { n: 18, color: '#ffffff', speed: 200, life: .3, size: 2.5, glow: true }); api.beep(220, .12, 'sawtooth', .05);
      }
      for (const p of projs) {
        if (p.dead) continue;
        const d = p.owner === P1 ? P2 : P1, hu = hurt(d), py = FL - p.y;
        if (hu && p.x + p.r > hu.x0 && p.x - p.r < hu.x1 && py + p.r > hu.y0 && py - p.r < hu.y1) {
          p.dead = true; p.owner.combo = d.st === 'hit' ? p.owner.combo : 0;
          contact(p.owner, d, SHOT, p.x, py, p.dmg);
        }
        if (p.x < -30 || p.x > W + 30) p.dead = true;
      }
      projs = projs.filter(p => !p.dead);
    };

    // ---- avversario guidato dal telefono ----
    const aiLevel = () => Math.min(4, ladder) + (P2 && P2.ch.shadow ? 2 : 0);
    const think = (f, o, dt) => {
      const ai = f.ai, lv = aiLevel();
      ai.hold -= dt; ai.block -= dt; ai.cd -= dt;
      if (ai.hold <= 0) { ai.mx = 0; ai.my = 0; }
      if (ai.block > 0) { ai.mx = -1; ai.my = ai.low ? -1 : 0; }
      if (phase !== 'fight') { ai.mx = 0; ai.my = 0; return; }
      if (ai.cd > 0 || f.st === 'dizzy') return;
      const d = Math.abs(o.x - f.x), react = .18 + lv * .14, r = Math.random();
      ai.cd = .12 + Math.random() * (.5 - lv * .07);
      const has = t => f.ch.sp.find(s => s.type === t);
      const sp = t => free(f) && has(t) && special(f, has(t));
      const go = (dir, t) => { ai.mx = dir; ai.my = 0; ai.hold = t; ai.block = 0; };
      const jump = dir => { ai.mx = dir; ai.my = 1; ai.hold = .08; ai.block = 0; };
      const guard = (low, t) => { ai.block = t; ai.low = low; ai.mx = -1; ai.my = low ? -1 : 0; };
      const shot = projs.find(p => p.owner === o && Math.sign(p.vx) === Math.sign(f.x - p.x) && Math.abs(p.x - f.x) < 150);
      if (shot && Math.random() < react + .2) { if (has('proj') && Math.random() < .3 && sp('proj')) return; if (free(f) && Math.random() < .45) jump(d < 200 ? 1 : 0); else guard(false, .5); return; }
      if (o.y > 20 && d < 140 && Math.random() < react) { if (sp('rise')) return; if (free(f)) { startMove(f, NM.sA); return; } }
      if (o.st === 'atk' && o.t < o.mv.su + o.mv.ac && d < 110 && Math.random() < react + .15) { guard(o.mv.kind === 'low', .35); return; }
      if (!free(f)) return;
      if (o.st === 'atk' && o.t >= o.mv.su + o.mv.ac && d < 80 && Math.random() < react) { if (Math.random() < .5 && (sp('rise') || sp('rush') || sp('spin'))) return; startMove(f, NM.sB); return; }
      if (d > 170) {
        if (has('proj') && r < .3 + lv * .06) { if (sp('proj')) return; }
        if (r < .55) go(1, .4); else if (r < .66) jump(1); else if (has('rush') && r < .74) sp('rush'); else go(0, .3);
      } else if (d > 80) {
        if (r < .34) go(1, .3); else if (r < .48) startMove(f, NM.sB); else if (r < .6) startMove(f, NM.cB);
        else if (r < .7 && has('proj')) sp('proj'); else if (r < .78) jump(1); else if (r < .86 && has('rush')) sp('rush'); else go(-1, .25);
      } else {
        if (d < 50 && r < .16) startMove(f, has('grab') && Math.random() < .5 ? SP.grab : NM.thr);
        else if (r < .44) startMove(f, Math.random() < .5 ? NM.sA : NM.cA);
        else if (r < .58) startMove(f, NM.sB); else if (r < .68) startMove(f, NM.cB);
        else if (r < .76) sp(has('spin') ? 'spin' : 'rush'); else if (r < .86) guard(Math.random() < .5, .4); else go(-1, .3);
      }
    };

    // ---- partita ----
    const startRound = () => {
      P1 = mkF(pch, 0); P2 = mkF(order[ladder], 1); projs = []; phase = 'intro'; phaseT = 0; clock = 60; why = ''; rWin = -1; bonus = null; combo.t = 0;
      api.beep(660, .08, 'square', .04);
    };
    const toVs = () => { state = 'vs'; stateT = 0; wins = [0, 0]; round = 1; arp([392, 523, 659], .09); };
    const pick = i => {
      pch = CH[i]; ladder = 0; score = 0;
      order = CH.filter(c => c !== pch).concat([BOSS]);
      arp([523, 784], .08); api.haptic(10); toVs();
    };
    const endRound = (w, how) => {
      phase = 'ko'; phaseT = 0; why = how; rWin = w; projs = [];
      if (w >= 0) wins[w]++;
      if (w === 0) { bonus = [Math.ceil(clock) * 50, Math.round(P1.hp) * 20]; score += bonus[0] + bonus[1]; }
      if (how === 'ko') { api.fx.flash('#ffffff', .25, .5); api.fx.shake(6, .4); arp([440, 330, 220, 110], .12, 'sawtooth', .05); api.haptic(40); }
      else arp([600, 400], .15);
    };
    const matchOver = () => {
      if (score > hi) { hi = score; api.store.set('hi', hi); }
      if (wins[0] >= 2 || (round >= 5 && wins[0] > wins[1])) {
        ladder++;
        if (ladder >= order.length) { state = 'ending'; stateT = 0; arp([523, 659, 784, 1047, 784, 1047], .12, 'triangle', .05); }
        else toVs();
      } else { state = 'over'; stateT = 0; arp([392, 330, 262, 196], .16, 'triangle', .05); }
    };
    const fightUpdate = dt => {
      if (stop > 0) { stop -= dt; return; }
      const sdt = phase === 'ko' && why === 'ko' && phaseT < 1.2 ? dt * .35 : dt;
      phaseT += dt; combo.t -= dt;
      if (phase === 'intro' && phaseT > 1.8) { phase = 'fight'; phaseT = 0; api.beep(990, .12, 'square', .05); }
      if (phase === 'fight') { clock -= dt; if (clock <= 0) { clock = 0; const a = P1.hp / P1.ch.hp, b = P2.hp / P2.ch.hp; endRound(Math.abs(a - b) < .005 ? -1 : a > b ? 0 : 1, 'time'); } }
      think(P2, P1, sdt);
      stepF(P1, P2, sdt); stepF(P2, P1, sdt);
      separate(); stepProjs(sdt);
      resolve(P1, P2); resolve(P2, P1);
      if (phase === 'fight' && (P1.hp <= 0 || P2.hp <= 0)) endRound(P1.hp <= 0 && P2.hp <= 0 ? -1 : P1.hp <= 0 ? 1 : 0, 'ko');
      if (phase === 'ko') {
        const wf = rWin === 0 ? P1 : rWin === 1 ? P2 : null;
        if (wf && phaseT > 1.6 && free(wf) && wf.y <= 0) { wf.st = 'win'; wf.t = 0; wf.vx = 0; if (wf === P1) arp([523, 659, 784], .1, 'triangle', .05); }
        if (phaseT > 4.4) {
          if (wins[0] >= 2 || wins[1] >= 2 || round >= 5) matchOver(); else { round++; startRound(); }
        }
      }
    };

    const update = dt => {
      time += dt; stateT += dt;
      if (state === 'fight' && !paused) fightUpdate(dt);
      else if (state === 'vs' && stateT > 2.4) { state = 'fight'; paused = false; startRound(); }
      else if (state === 'over' && stateT > 10) state = 'title';
    };

    const act = k => {
      if (state === 'title') { if (k === 'a' || k === 'start') { state = 'select'; stateT = 0; api.beep(660, .05); } return; }
      if (state === 'select') {
        if (k === 'left' || k === 'right') sel ^= 1; else if (k === 'up' || k === 'down') sel ^= 2;
        else if (k === 'a' || k === 'start') { pick(sel); return; } else if (k === 'b' || k === 'select') { state = 'title'; return; } else return;
        api.beep(440, .03); api.haptic(5); return;
      }
      if (state === 'vs') { if ((k === 'a' || k === 'start') && stateT > .4) stateT = 9; return; }
      if (state === 'over') { if (k === 'a' || k === 'start') { score = 0; toVs(); } else if (k === 'b' || k === 'select') state = 'title'; return; }
      if (state === 'ending') { if ((k === 'a' || k === 'start') && stateT > 1.5) state = 'title'; return; }
      if (state !== 'fight') return;
      if (k === 'start') { paused = !paused; return; }
      if (paused) { if (k === 'select') { paused = false; state = 'title'; } return; }
      if (k !== 'a' && k !== 'b') return;
      if (P1.st === 'dizzy') { P1.t += .14; return; }
      if (phase !== 'fight') return;
      if (!tryAttack(P1, P2, k)) P1.buf = { k, t: time };
    };
    const cardRect = i => { const cw = (W - 36) / 2, chh = Math.min(158, (H - 300) / 2); return { x: 12 + (i & 1) * (cw + 12), y: 62 + (i >> 1) * (chh + 10), w: cw, h: chh }; };
    const onPointer = e => {
      if (e.type !== 'down') return;
      if (state === 'select') {
        for (let i = 0; i < 4; i++) { const c = cardRect(i); if (e.x >= c.x && e.x <= c.x + c.w && e.y >= c.y && e.y <= c.y + c.h) { if (sel === i) pick(i); else { sel = i; api.beep(440, .03); api.haptic(5); } return; } }
        return;
      }
      if (state === 'title' || state === 'vs' || state === 'over' || state === 'ending') act('a');
      else if (state === 'fight' && paused) paused = false;
    };

    // ---- disegno: pose ----
    // Angoli in radianti dalla verticale verso il basso, positivi in avanti. lf/lb gambe (coscia, stinco), af/ab braccia (braccio, avambraccio).
    const PO = {
      idle: { lean: .12, lf: [.42, -.02], lb: [-.34, -.16], af: [.95, 2.5], ab: [.45, 2.3] },
      crouch: { lean: .3, lf: [1.25, -.25], lb: [.6, -1.05], af: [1.1, 2.4], ab: [.7, 2.2] },
      jump: { lean: .1, lf: [1.2, -.5], lb: [.6, -1.1], af: [1.2, 2.6], ab: [.6, 2.4] },
      punch: { lean: .25, lf: [.5, 0], lb: [-.45, -.2], af: [1.57, 1.57], ab: [.3, 2.5] },
      kick: { lean: -.35, lf: [1.6, 1.62], lb: [-.12, -.12], af: [.9, 2.4], ab: [-.2, 1.8] },
      cpunch: { lean: .35, lf: [1.25, -.25], lb: [.6, -1.05], af: [1.62, 1.6], ab: [.6, 2.3] },
      sweep: { lean: .15, hy: 24, lf: [1.3, 1.5], lb: [1.35, -.55], af: [.4, .9], ab: [-.3, .2] },
      jpunch: { lean: .2, lf: [1.2, -.5], lb: [.6, -1.1], af: [1.0, 1.0], ab: [.5, 2.4] },
      jkick: { lean: -.25, lf: [.95, .95], lb: [.5, -1.3], af: [1.3, 2.6], ab: [.3, 2.2] },
      throw: { lean: .3, lf: [.5, 0], lb: [-.45, -.2], af: [1.45, 1.15], ab: [1.3, 1.05] },
      projA: { lean: -.05, lf: [.6, .1], lb: [-.55, -.3], af: [-.5, 1.6], ab: [-.6, 1.4] },
      proj: { lean: .2, lf: [.6, .1], lb: [-.55, -.3], af: [1.55, 1.55], ab: [1.5, 1.5] },
      rise: { lean: .05, lf: [.9, .1], lb: [.4, -.9], af: [3.0, 3.1], ab: [.3, 1.4] },
      riseK: { lean: -.3, lf: [2.4, 2.6], lb: [.2, -.4], af: [.6, 2.0], ab: [-.3, 1.2] },
      spin: { lean: 0, hy: 40, lf: [1.57, 1.57], lb: [-1.4, -1.4], af: [.9, 1.6], ab: [-.9, -1.4] },
      rush: { lean: .65, lf: [1.0, -.15], lb: [-.75, -.35], af: [.7, 1.7], ab: [-.4, .5] },
      grab: { lean: .3, lf: [.55, 0], lb: [-.5, -.2], af: [1.75, 1.95], ab: [1.65, 1.85] },
      hit: { lean: -.42, lf: [.3, -.05], lb: [-.4, -.25], af: [.3, .9], ab: [-.4, .5] },
      block: { lean: -.08, lf: [.42, -.02], lb: [-.34, -.16], af: [1.15, 2.95], ab: [.95, 2.75] },
      cblock: { lean: .2, lf: [1.25, -.25], lb: [.6, -1.05], af: [1.15, 2.95], ab: [.95, 2.75] },
      dizzy: { lean: 0, lf: [.2, -.02], lb: [-.2, -.05], af: [.15, .05], ab: [-.15, -.05] },
      win: { lean: -.05, lf: [.18, .02], lb: [-.18, -.04], af: [3.0, 3.1], ab: [.25, .5] },
      fall: { lean: -.3, lf: [.7, .2], lb: [.2, -.3], af: [2.4, 2.8], ab: [2.0, 2.6] },
      lie: { lean: 0, lf: [.1, .05], lb: [-.05, -.1], af: [2.8, 3.0], ab: [2.5, 2.9] },
    };
    const lerp = (a, b, k) => a + (b - a) * k;
    const mix = (p, q, k) => ({ lean: lerp(p.lean, q.lean, k), hy: q.hy != null ? (p.hy != null ? lerp(p.hy, q.hy, k) : (k > .5 ? q.hy : null)) : (p.hy != null && k < .5 ? p.hy : null),
      lf: [lerp(p.lf[0], q.lf[0], k), lerp(p.lf[1], q.lf[1], k)], lb: [lerp(p.lb[0], q.lb[0], k), lerp(p.lb[1], q.lb[1], k)],
      af: [lerp(p.af[0], q.af[0], k), lerp(p.af[1], q.af[1], k)], ab: [lerp(p.ab[0], q.ab[0], k), lerp(p.ab[1], q.ab[1], k)] });
    const poseOf = f => {
      const t = f.t, sw = Math.sin(time * 5) * .04;
      switch (f.st) {
        case 'walk': { const w = Math.sin(f.walk * 9) * .32; return Object.assign({}, PO.idle, { lf: [.42 + w, -.02 - Math.max(0, w) * .6], lb: [-.34 - w, -.16 + Math.min(0, w) * .6] }); }
        case 'crouch': return PO.crouch;
        case 'jump': return PO.jump;
        case 'hit': return mix(PO.idle, PO.hit, Math.min(1, (f.dur - t) / f.dur * 1.6));
        case 'block': return f.low ? PO.cblock : PO.block;
        case 'dizzy': return Object.assign({}, PO.dizzy, { lean: Math.sin(time * 4) * .2 });
        case 'win': return mix(PO.idle, PO.win, Math.min(1, t * 4));
        case 'fall': return Object.assign({}, PO.fall, { rot: -Math.PI / 2 * Math.min(1, t / .45) });
        case 'down': case 'ko': return Object.assign({}, PO.lie, { rot: -Math.PI / 2 });
        case 'rise': return Object.assign({}, PO.crouch, { rot: -Math.PI / 2 * Math.max(0, 1 - t / .3) });
        case 'atk': {
          const mv = f.mv, base = mv.crouch ? PO.crouch : mv.air ? PO.jump : PO.idle;
          const tgt = PO[(f.spd && f.spd.pose) || mv.pose];
          if (mv === SP.proj) return t < mv.su ? mix(PO.idle, PO.projA, t / mv.su) : mix(PO.proj, PO.idle, Math.max(0, (t - mv.su - .1) / mv.rc));
          if (mv === SP.spin) return t < mv.su ? mix(PO.idle, tgt, t / mv.su) : t < mv.su + mv.ac ? tgt : mix(tgt, PO.idle, (t - mv.su - mv.ac) / mv.rc);
          const k = mv.air ? Math.min(1, t / mv.su) : t < mv.su ? t / mv.su : t < mv.su + mv.ac ? 1 : Math.max(0, 1 - (t - mv.su - mv.ac) / mv.rc);
          return mix(base, tgt, k);
        }
      }
      return Object.assign({}, PO.idle, { lean: PO.idle.lean + sw });
    };

    // ---- disegno: figura ----
    const stroke = (pts, w, c) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke(); };
    const dot = (p, r, c) => { g.fillStyle = OUT; g.beginPath(); g.arc(p[0], p[1], r + 1.7, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fill(); };
    const pt = (p, a, l) => [p[0] + Math.sin(a) * l, p[1] + Math.cos(a) * l];
    const drawFighter = (ch, X, Y, sc, po, face, flash) => {
      const s = ch.size * sc, col = c => (flash ? '#ffffff' : c);
      const LT = 23 * s, LS = 23 * s, TO = 30 * s, UA = 16 * s, FA = 15 * s, HR = 10 * s;
      const hy = po.hy != null ? po.hy * s : Math.max(LT * Math.cos(po.lf[0]) + LS * Math.cos(po.lf[1]), LT * Math.cos(po.lb[0]) + LS * Math.cos(po.lb[1]));
      g.save(); g.translate(X, Y); g.scale(face, 1);
      if (po.rot) { g.translate(0, po.rot * 7 * s); g.rotate(po.rot); }
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (ch.shadow) { g.shadowColor = '#b040ff'; g.shadowBlur = 12; }
      const up = Math.PI - po.lean, hip = [0, -hy], neck = pt(hip, up, TO), sh = pt(hip, up, TO - 4 * s), head = pt(hip, up, TO + HR + s);
      const leg = (l, c) => { const k = pt(hip, l[0], LT), a = pt(k, l[1], LS), ft = pt(a, l[1] + 1.5, 7 * s); stroke([hip, k, a], 10.5 * s + 3.4, OUT); stroke([a, ft], 6 * s + 3, OUT); stroke([hip, k, a], 10.5 * s, col(c)); stroke([a, ft], 6 * s, col(ch.shadow ? c : '#3a2a22')); };
      const arm = (l, c) => { const e = pt(sh, l[0], UA), h = pt(e, l[1], FA); stroke([sh, e, h], 8.5 * s + 3.4, OUT); stroke([sh, e], 8.5 * s, col(ch.sleeve ? c : ch.skin)); stroke([e, h], 7 * s, col(ch.skin)); dot(h, 5.2 * s, col(ch.skin)); };
      arm(po.ab, ch.gi2); leg(po.lb, ch.gi2);
      stroke([hip, neck], 17 * s + 3.4, OUT); stroke([hip, neck], 17 * s, col(ch.gi));
      const bc = pt(hip, up, 3 * s), dx = Math.cos(po.lean) * 9 * s, dy = Math.sin(po.lean) * 9 * s;
      stroke([[bc[0] - dx, bc[1] - dy], [bc[0] + dx, bc[1] + dy]], 4 * s, col(ch.belt));
      stroke([neck, pt(neck, -po.lean + .4, 9 * s)], 2.2 * s, col(ch.gi2));
      leg(po.lf, ch.gi); arm(po.af, ch.gi);
      // testa
      g.save(); g.translate(head[0], head[1]); g.rotate(po.lean * .5);
      dot([0, 0], HR, col(ch.skin));
      g.shadowBlur = 0;
      const hair = col(ch.hair);
      if (ch.style === 'cap') {
        g.fillStyle = col(ch.cap); g.beginPath(); g.arc(0, -1, HR + 1, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill();
        g.fillRect(-HR - 1, -3 * s, 2 * HR + 2, 3 * s); g.beginPath(); g.arc(0, -HR - 1, 2.6 * s, 0, TAU); g.fill();
      } else if (ch.style === 'tail') {
        g.fillStyle = hair; g.beginPath(); g.arc(0, 0, HR + .5, Math.PI * .95, Math.PI * 2.05); g.closePath(); g.fill();
        g.strokeStyle = hair; g.lineWidth = 5 * s; g.beginPath(); g.moveTo(-HR * .7, -HR * .5); g.quadraticCurveTo(-HR * 1.9, -HR * .2 + Math.sin(time * 6) * 2, -HR * 1.6, HR * 1.2); g.stroke();
      } else if (ch.style === 'beard') {
        g.fillStyle = hair; g.beginPath(); g.arc(0, 0, HR + .5, -.25, Math.PI * .62); g.lineTo(0, HR * .2); g.closePath(); g.fill();
        g.fillRect(1 * s, -4.5 * s, 7 * s, 2 * s);
      } else if (ch.style === 'crop') {
        g.fillStyle = hair; g.beginPath(); g.arc(0, 0, HR + .6, Math.PI * .97, Math.PI * 2.03); g.closePath(); g.fill(); g.fillRect(-HR, -3 * s, 3 * s, 7 * s);
      } else if (ch.style === 'bun') {
        g.fillStyle = hair; g.beginPath(); g.arc(0, 0, HR + .6, Math.PI * .92, Math.PI * 2.0); g.closePath(); g.fill();
        g.beginPath(); g.arc(-HR * .6, -HR * .95, 5 * s, 0, TAU); g.fill();
      }
      g.fillStyle = ch.shadow ? '#ff60ff' : '#1a1014'; g.fillRect(4.2 * s, -2.2 * s, 2.4 * s, 3 * s);
      g.restore();
      g.restore();
    };
    const drawF = f => {
      const X = f.x, Y = FL - f.y, s = f.s;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(X, FL + 2, 24 * s * Math.max(.4, 1 - f.y / 250), 5, 0, 0, TAU); g.fill();
      if (f.st === 'atk' && f.mv.special) { const gr = g.createRadialGradient(X, Y - 50 * s, 4, X, Y - 50 * s, 62 * s); gr.addColorStop(0, f.ch.aura + '55'); gr.addColorStop(1, f.ch.aura + '00'); g.fillStyle = gr; g.fillRect(X - 70 * s, Y - 120 * s, 140 * s, 130 * s); }
      let face = f.face;
      if (f.st === 'atk' && f.mv === SP.spin && f.t > f.mv.su && f.t < f.mv.su + f.mv.ac) face *= ((f.t * 16) | 0) % 2 ? -1 : 1;
      const sh = f.st === 'hit' ? Math.sin(time * 90) * 1.5 : 0;
      drawFighter(f.ch, X + sh, Y, 1, poseOf(f), face, f.flashT > 0);
      if (f.st === 'dizzy') for (let i = 0; i < 3; i++) { const a = time * 5 + i * 2.1; star(X + Math.cos(a) * 14 * s, Y - 108 * s + Math.sin(a) * 4, 4, '#ffe14a'); }
    };
    const star = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); };

    // ---- disegno: scenari (originali) ----
    const seeded = sd => () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const sky = (stops, y0, y1) => { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c)); g.fillStyle = gr; g.fillRect(0, y0, W, y1 - y0); };
    const floor = (c1, c2, lc) => {
      const top = FL - 22; sky([c1, c2], top, H);
      g.strokeStyle = lc; g.lineWidth = 1;
      for (let i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(W / 2 + i * 22, top); g.lineTo(W / 2 + i * 70, H); g.stroke(); }
      for (let y = top, d = 5; y < H; y += d, d *= 1.35) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    };
    const STAGES = [
      { name: 'IL MOLO AL TRAMONTO', draw() {
        const hz = FL - 92; sky(['#2a1e5a', '#c8507a', '#ff9a5a', '#ffd27a'], 0, hz);
        g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(W * .68, hz, 30, Math.PI, 0); g.fill();
        g.fillStyle = '#5a3060'; g.beginPath(); g.moveTo(-10, hz); g.lineTo(60, hz - 58); g.lineTo(84, hz - 50); g.lineTo(100, hz - 66); g.lineTo(190, hz); g.fill();
        sky(['#5a4a8a', '#2a2a5a'], hz, FL - 22);
        g.fillStyle = 'rgba(255,220,150,.5)'; for (let i = 0; i < 9; i++) g.fillRect(W * .68 - 26 + ((i * 37 + time * 8) % 52), hz + 6 + i * 7, 14 - i, 2);
        g.fillStyle = '#20183a'; g.fillRect(W * .2 + Math.sin(time) * 3, hz + 14, 26, 5); g.fillRect(W * .2 + 11 + Math.sin(time) * 3, hz, 2, 14);
        floor('#7a5038', '#3a2418', 'rgba(0,0,0,.25)');
        g.fillStyle = '#2a1a12'; for (let x = 20; x < W; x += 80) g.fillRect(x, FL - 40, 10, 20);
        g.strokeStyle = '#c8a878'; g.lineWidth = 2; g.beginPath(); for (let x = 25; x < W - 60; x += 80) { g.moveTo(x, FL - 36); g.quadraticCurveTo(x + 40, FL - 26, x + 80, FL - 36); } g.stroke();
      } },
      { name: 'IL MERCATO DI NOTTE', draw() {
        sky(['#0e1230', '#2a2050', '#3a2a50'], 0, FL - 22);
        const r = seeded(7); g.fillStyle = '#1a1430';
        for (let x = -10; x < W; x += 50) { const h = 120 + r() * 80; g.fillRect(x, FL - 22 - h, 48, h); g.fillStyle = '#ffd27a'; for (let k = 0; k < 4; k++) if (r() < .5) g.fillRect(x + 8 + (k % 2) * 20, FL - h + 10 + (k >> 1) * 26, 8, 10); g.fillStyle = '#1a1430'; }
        for (let i = 0; i < 2; i++) { g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, FL - 170 + i * 30); g.quadraticCurveTo(W / 2, FL - 130 + i * 30, W, FL - 170 + i * 30); g.stroke();
          for (let k = 0; k < 12; k++) { const t = k / 11, x = t * W, y = (1 - t) * (1 - t) * (FL - 170 + i * 30) + 2 * t * (1 - t) * (FL - 130 + i * 30) + t * t * (FL - 170 + i * 30); g.fillStyle = ['#ff6a5a', '#ffe14a', '#6ad0ff', '#7dff9a'][(k + i) % 4]; g.globalAlpha = .6 + .4 * Math.sin(time * 3 + k); g.beginPath(); g.arc(x, y + 3, 2.6, 0, TAU); g.fill(); } g.globalAlpha = 1; }
        [[10, '#c8392f'], [W - 130, '#2fa05a']].forEach(([x, c]) => { for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#f2f4fb' : c; g.fillRect(x + k * 20, FL - 100, 20, 22); } g.fillStyle = '#4a2a1a'; g.fillRect(x + 4, FL - 78, 4, 56); g.fillRect(x + 112, FL - 78, 4, 56); g.fillStyle = '#6a3a20'; g.fillRect(x, FL - 46, 120, 14); g.fillStyle = '#ff9a2a'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(x + 10 + k * 12, FL - 50, 5, 0, TAU); g.fill(); } });
        floor('#5a5868', '#2a2834', 'rgba(0,0,0,.3)');
      } },
      { name: 'LA BAITA IN MONTAGNA', draw() {
        sky(['#5aa8e0', '#a8d8f8', '#e8f6ff'], 0, FL - 22);
        g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { const x = ((i * 140 + time * 6) % (W + 80)) - 40; g.beginPath(); g.ellipse(x, 60 + i * 26, 30, 9, 0, 0, TAU); g.fill(); }
        [[-20, 150, '#7a8ab8'], [120, 190, '#6a7aa8'], [240, 140, '#7a8ab8']].forEach(([x, h, c]) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, FL - 22); g.lineTo(x + 80, FL - 22 - h); g.lineTo(x + 160, FL - 22); g.fill(); g.fillStyle = '#f4f8ff'; g.beginPath(); g.moveTo(x + 80, FL - 22 - h); g.lineTo(x + 58, FL - 22 - h + 40); g.lineTo(x + 72, FL - 22 - h + 34); g.lineTo(x + 84, FL - 22 - h + 44); g.lineTo(x + 102, FL - 22 - h + 40); g.fill(); });
        g.fillStyle = '#1e4a30'; for (let x = 0; x < W; x += 28) { const h = 40 + ((x * 7) % 23); g.beginPath(); g.moveTo(x, FL - 22); g.lineTo(x + 12, FL - 22 - h); g.lineTo(x + 24, FL - 22); g.fill(); }
        g.fillStyle = '#6a4024'; g.fillRect(W - 110, FL - 82, 90, 60); g.fillStyle = '#4a2a18'; g.beginPath(); g.moveTo(W - 120, FL - 80); g.lineTo(W - 65, FL - 116); g.lineTo(W - 10, FL - 80); g.fill(); g.fillStyle = '#ffd27a'; g.fillRect(W - 92, FL - 66, 16, 14);
        floor('#9a6a40', '#5a3a20', 'rgba(0,0,0,.2)');
      } },
      { name: 'I TETTI SOTTO LA LUNA', draw() {
        sky(['#070a20', '#141e48', '#2a3a70'], 0, FL - 22);
        const r = seeded(3); g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { g.globalAlpha = .4 + .6 * Math.abs(Math.sin(time + i)); g.fillRect(r() * W, r() * (FL - 160), 1.5, 1.5); } g.globalAlpha = 1;
        const gr = g.createRadialGradient(W * .75, 90, 10, W * .75, 90, 70); gr.addColorStop(0, 'rgba(255,250,220,.35)'); gr.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 200); g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(W * .75, 90, 24, 0, TAU); g.fill();
        g.fillStyle = '#0e1028'; for (let x = -20; x < W; x += 70) { const h = 70 + r() * 50; g.beginPath(); g.moveTo(x, FL - 22); g.lineTo(x, FL - 22 - h); g.lineTo(x + 35, FL - 42 - h); g.lineTo(x + 70, FL - 22 - h); g.lineTo(x + 70, FL - 22); g.fill(); g.fillStyle = '#ffd27a'; if (r() < .7) g.fillRect(x + 28, FL - h + 2, 12, 12); g.fillStyle = '#0e1028'; g.fillRect(x + 50, FL - 52 - h, 6, 20); }
        floor('#a8503a', '#5a2418', 'rgba(40,10,0,.35)');
      } },
      { name: 'IL BUIO', draw() {
        sky(['#05020a', '#1a0a2a', '#2a0e40'], 0, FL - 22);
        for (let i = 0; i < 24; i++) { const x = (i * 53 + time * (10 + i % 5 * 6)) % W, y = FL - 30 - ((i * 97 + time * 20) % (FL - 60)); g.fillStyle = `rgba(190,90,255,${.15 + (i % 4) * .1})`; g.beginPath(); g.arc(x, y, 1.5 + i % 3, 0, TAU); g.fill(); }
        g.strokeStyle = 'rgba(176,64,255,.25)'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(W / 2, FL - 120, 40 + i * 30 + Math.sin(time * 2 + i) * 4, 0, TAU); g.stroke(); }
        floor('#1a0e24', '#06030a', 'rgba(176,64,255,.25)');
      } },
    ];

    // ---- disegno: interfaccia ----
    const text = (s, x, y, size, align, c, ol) => {
      g.font = `bold ${size}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top';
      if (ol) { g.lineWidth = ol; g.strokeStyle = OUT; g.lineJoin = 'round'; g.strokeText(s, x, y); }
      g.fillStyle = c || '#eef1ff'; g.fillText(s, x, y);
    };
    const big = (s, y, c) => text(s, W / 2, y, 40, 'center', c || '#ffe14a', 7);
    const bar = (f, side) => {
      const bw = W / 2 - 40, x0 = side ? W / 2 + 28 : 12, y = 14, k = f.hp / f.ch.hp, kg = f.ghost / f.ch.hp;
      g.fillStyle = OUT; g.fillRect(x0 - 2, y - 2, bw + 4, 18);
      g.fillStyle = '#5a1a1a'; g.fillRect(x0, y, bw, 14);
      g.fillStyle = '#ff5a3a'; if (side) g.fillRect(x0, y, bw * kg, 14); else g.fillRect(x0 + bw * (1 - kg), y, bw * kg, 14);
      const gr = g.createLinearGradient(0, y, 0, y + 14); gr.addColorStop(0, k < .25 ? '#ff9a5a' : '#fff07a'); gr.addColorStop(1, k < .25 ? '#e0402a' : '#e8b020'); g.fillStyle = gr;
      if (side) g.fillRect(x0, y, bw * k, 14); else g.fillRect(x0 + bw * (1 - k), y, bw * k, 14);
      text(f.ch.name, side ? x0 + bw : x0, y + 19, 12, side ? 'right' : 'left', '#eef1ff', 3);
      for (let i = 0; i < wins[side]; i++) star(side ? x0 + bw - 70 - i * 14 : x0 + 64 + i * 14, y + 26, 6, '#ffe14a');
    };
    const hud = () => {
      bar(P1, 0); bar(P2, 1);
      g.fillStyle = OUT; g.beginPath(); g.arc(W / 2, 22, 19, 0, TAU); g.fill();
      text(String(Math.ceil(clock)).padStart(2, '0'), W / 2, 12, 20, 'center', clock < 10 ? '#ff6a5a' : '#eef1ff');
      text(String(score).padStart(6, '0'), W / 2, 46, 12, 'center', '#eef1ff', 3);
      if (combo.t > 0 && combo.n > 1) text(combo.n + ' COLPI!', combo.side ? W - 12 : 12, 76, 16, combo.side ? 'right' : 'left', '#ffb04a', 4);
    };
    const moveList = ch => {
      const lines = [['← PARA · ↙ PARA IN BASSO', '#aab3d8'], ['A PUGNO · B CALCIO · ↓+B SPAZZATA', '#aab3d8'], ['→+A VICINO: PRESA · ↑ SALTA', '#aab3d8']]
        .concat(ch.sp.map(s => [MOTXT[s.m] + ' + ' + s.k.toUpperCase() + '  ' + s.name, ch.aura]));
      return lines;
    };
    const panel = () => {
      const lines = moveList(pch), y0 = FL + 34, lh = 16, h = lines.length * lh + 14;
      if (y0 + h > H - 4) return;
      g.fillStyle = 'rgba(10,6,14,.72)'; g.fillRect(10, y0, W - 20, h);
      lines.forEach(([s, c], i) => text(s, W / 2, y0 + 8 + i * lh, 11, 'center', c));
    };

    const render = () => {
      if (state === 'title') {
        STAGES[0].draw(); g.fillStyle = 'rgba(10,6,14,.45)'; g.fillRect(0, 0, W, H);
        text('PUGNI', W / 2, 70, 54, 'center', '#e8762c', 8); text('IN PIAZZA', W / 2, 128, 40, 'center', '#ffe14a', 7);
        drawFighter(CH[0], W / 2 - 60, FL, 1.2, mix(PO.idle, PO.idle, 0), 1, false);
        drawFighter(CH[2], W / 2 + 60, FL, 1.2, PO.idle, -1, false);
        if (((time * 2) | 0) % 2 === 0) text('PREMI A O TOCCA', W / 2, FL + 40, 16, 'center', '#ffe14a', 4);
        text('RECORD ' + hi, W / 2, FL + 70, 13, 'center', '#eef1ff', 3);
        return;
      }
      if (state === 'select') {
        g.fillStyle = '#120d16'; g.fillRect(0, 0, W, H);
        text('SCEGLI IL LOTTATORE', W / 2, 22, 18, 'center', '#ffe14a', 4);
        CH.forEach((ch, i) => {
          const c = cardRect(i), on = sel === i;
          g.save(); g.beginPath(); g.rect(c.x, c.y, c.w, c.h); g.clip();
          const gr = g.createLinearGradient(0, c.y, 0, c.y + c.h); gr.addColorStop(0, ch.gi2); gr.addColorStop(1, '#120d16'); g.fillStyle = gr; g.fillRect(c.x, c.y, c.w, c.h);
          drawFighter(ch, c.x + c.w / 2, c.y + c.h - 26, Math.min(1.05, c.h / 140), on ? mix(PO.idle, PO.win, .5 + .5 * Math.sin(time * 4)) : PO.idle, 1, false);
          g.restore();
          g.strokeStyle = on ? ch.aura : '#3a3048'; g.lineWidth = on ? 3 : 1.5; g.strokeRect(c.x, c.y, c.w, c.h);
          text(ch.name, c.x + c.w / 2, c.y + c.h - 20, 14, 'center', on ? '#ffe14a' : '#eef1ff', 3);
        });
        const ch = CH[sel], y = cardRect(3).y + cardRect(3).h + 14;
        text(ch.name + ' · ' + ch.from, W / 2, y, 15, 'center', ch.aura);
        text(ch.tag, W / 2, y + 22, 11, 'center', '#cfd5f0');
        [['VELOCITÀ', ch.spd / 1.2], ['FORZA', ch.pow / 1.3], ['VITA', ch.hp / 135]].forEach(([n, v], i) => {
          text(n, 40, y + 44 + i * 16, 11, 'left', '#aab3d8'); g.fillStyle = '#2a2234'; g.fillRect(130, y + 46 + i * 16, 180, 8); g.fillStyle = ch.aura; g.fillRect(130, y + 46 + i * 16, 180 * v, 8);
        });
        ch.sp.forEach((s, i) => text(MOTXT[s.m] + ' + ' + s.k.toUpperCase() + '  ' + s.name, W / 2, y + 98 + i * 16, 12, 'center', '#eef1ff'));
        if (y + 150 < H) text('A O TOCCA DI NUOVO: SCEGLI', W / 2, Math.min(H - 20, y + 150), 11, 'center', '#ffe14a');
        return;
      }
      if (state === 'vs') {
        const o = order[ladder];
        g.fillStyle = pch.gi2; g.beginPath(); g.moveTo(0, 0); g.lineTo(W * .62, 0); g.lineTo(W * .38, H); g.lineTo(0, H); g.fill();
        g.fillStyle = o.gi2; g.beginPath(); g.moveTo(W * .62, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W * .38, H); g.fill();
        const e = Math.min(1, stateT * 3);
        drawFighter(pch, lerp(-60, W * .27, e), H * .62, 1.7, PO.idle, 1, false);
        drawFighter(o, lerp(W + 60, W * .73, e), H * .62, 1.7, PO.idle, -1, false);
        text(pch.name, W * .27, H * .66, 20, 'center', '#eef1ff', 4); text(o.name, W * .73, H * .66, 20, 'center', '#eef1ff', 4);
        big('VS', H * .3, '#ffe14a');
        text('INCONTRO ' + (ladder + 1) + ' DI ' + order.length, W / 2, 40, 14, 'center', '#eef1ff', 3);
        text(STAGES[o.stage].name, W / 2, H * .76, 12, 'center', '#eef1ff', 3);
        return;
      }
      if (state === 'over') {
        g.fillStyle = '#0a060e'; g.fillRect(0, 0, W, H);
        drawFighter(pch, W / 2, H * .52, 1.4, Object.assign({}, PO.lie, { rot: -Math.PI / 2 }), 1, false);
        big('HAI PERSO', H * .2, '#ff6a5a');
        text('CONTINUI?', W / 2, H * .6, 20, 'center', '#eef1ff', 4);
        text(String(Math.max(0, Math.ceil(10 - stateT))), W / 2, H * .6 + 30, 36, 'center', '#ffe14a', 6);
        text('A: SÌ (PUNTI DA ZERO) · B: NO', W / 2, H * .6 + 80, 11, 'center', '#aab3d8');
        text('PUNTI ' + score + ' · RECORD ' + hi, W / 2, H * .6 + 100, 12, 'center', '#eef1ff');
        return;
      }
      if (state === 'ending') {
        STAGES[pch.stage].draw();
        drawFighter(pch, W / 2, FL, 1.5, PO.win, 1, false);
        if (((stateT * 3) | 0) !== ((stateT * 3 - .02) | 0)) api.fx.burst(Math.random() * W, 0, { n: 6, color: ['#ffe14a', '#ff6a5a', '#6ad0ff', '#7dff9a'][(Math.random() * 4) | 0], speed: 120, life: 1.4, gravity: 200, size: 3 });
        text('CAMPIONE', W / 2, 60, 40, 'center', '#ffe14a', 7); text('DELLA PIAZZA', W / 2, 106, 24, 'center', '#eef1ff', 5);
        text('PUNTI ' + score, W / 2, FL + 40, 18, 'center', '#eef1ff', 4); text('RECORD ' + hi, W / 2, FL + 66, 13, 'center', '#ffe14a', 3);
        return;
      }
      // combattimento
      STAGES[P2.ch.stage].draw();
      for (const p of projs) {
        const y = FL - p.y, dir = Math.sign(p.vx);
        for (let i = 4; i >= 1; i--) { g.fillStyle = p.color; g.globalAlpha = .12 * (5 - i); g.beginPath(); g.arc(p.x - dir * i * 9, y + Math.sin(p.t * 30 + i) * 2, p.r * (1 - i * .12), 0, TAU); g.fill(); }
        g.globalAlpha = 1;
        const gr = g.createRadialGradient(p.x, y, 1, p.x, y, p.r * 1.8); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.4, p.color); gr.addColorStop(1, p.color + '00');
        g.fillStyle = gr; g.beginPath(); g.arc(p.x, y, p.r * 1.8, 0, TAU); g.fill();
      }
      const fs = P1.st === 'atk' ? [P2, P1] : [P1, P2];
      fs.forEach(drawF);
      hud(); panel();
      if (phase === 'intro') big(phaseT < 1.1 ? (round >= 3 ? 'ULTIMO ROUND' : 'ROUND ' + round) : 'VIA!', FL * .42);
      if (phase === 'ko') {
        if (phaseT < 1.8) big(why === 'ko' ? 'K.O.' : 'TEMPO!', FL * .42, why === 'ko' ? '#ff6a5a' : '#ffe14a');
        else {
          big(rWin === 0 ? 'HAI VINTO' : rWin === 1 ? P2.ch.name + ' VINCE' : 'PAREGGIO', FL * .38, rWin === 0 ? '#7dff9a' : '#ffe14a');
          if (bonus && phaseT > 2.4) { text('TEMPO  ' + bonus[0], W / 2, FL * .38 + 52, 14, 'center', '#eef1ff', 3); text('VITA   ' + bonus[1], W / 2, FL * .38 + 72, 14, 'center', '#eef1ff', 3); }
        }
      }
      if (paused) { g.fillStyle = 'rgba(10,6,14,.6)'; g.fillRect(0, 0, W, H); big('PAUSA', H * .36); text('START: RIPRENDI · SELECT: ESCI', W / 2, H * .36 + 54, 12, 'center', '#eef1ff', 3); }
    };

    return {
      update, render, onPress: act, onPointer,
      onHide() { if (state === 'fight') paused = true; },
      debug: {
        get state() { return state; }, get phase() { return phase; }, get P1() { return P1; }, get P2() { return P2; }, get projs() { return projs; },
        get wins() { return wins; }, get ladder() { return ladder; }, get score() { return score; },
        pick, setLadder(n) { ladder = n; },
      },
    };
  },
});

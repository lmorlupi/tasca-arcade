registerGame({
  id: 'biliardo', title: 'BILIARDO', license: 'MIT', color: '#59c48f',
  blurb: "Mira assistita e buche più grandi: fare centro è più facile.",
  inputs: ['MIRA ASSISTITA', 'TIRA', '2 GIOCATORI'], size: [360, 640], flexH: true, flexMin: 1.5, fillHeight: true, bg: '#0b1b20',
  create(api) {
    const { cv, g, held } = api, TAU = Math.PI * 2;
    let W=cv.width,H=cv.height,wide=false,FH,FW,FX,FY,R,PR,pockets,controls;
    const colors = ['#fff8df', '#efc34a', '#4c8edc', '#dc665c', '#aa7ac8', '#ea944b', '#53a67f', '#a9536c', '#232b37'];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function geometry(){wide=W>H;FH=wide?Math.min(H-48,(W-220)/2):Math.min(H-170,(W-64)*2);FW=wide?FH*2:FH/2;FX=wide?24:(W-FW)/2;FY=wide?(H-FH)/2:76;R=Math.min(FW,FH)/21;PR=R*2.05;
      pockets=wide?[[FX,FY],[FX+FW/2,FY],[FX+FW,FY],[FX,FY+FH],[FX+FW/2,FY+FH],[FX+FW,FY+FH]]:[[FX,FY],[FX+FW,FY],[FX,FY+FH/2],[FX+FW,FY+FH/2],[FX,FY+FH],[FX+FW,FY+FH]];
      controls=wide?{power:{x:W-174,y:H-164,w:162,h:68},fire:{x:W-174,y:H-84,w:162,h:68}}:{power:{x:12,y:H-64,w:W-126,h:52},fire:{x:W-104,y:H-64,w:92,h:52}};
    }
    geometry();
    const inside = (e, box) => e.x >= box.x && e.x <= box.x + box.w && e.y >= box.y && e.y <= box.y + box.h;
    const spot=(along,across=.5)=>wide?{x:FX+FW*along,y:FY+FH*across}:{x:FX+FW*across,y:FY+FH*along};
    let balls = [], mode = 'practice', state = 'setup', resume = 'aim', player = 0, groups = [null, null];
    let angle = -Math.PI / 2, power = 0.55, charging = false, chargeTime = 0, turnTime = 0, drag = null, elapsed = 0, shots = 0, points = 0;
    let shot = null, message = '', messageTime = 0, winner = null, pauseTouch = null, hi = api.store.get('hi', 0);
    const white = () => balls[0];
    const groupOf = id => id > 0 && id < 8 ? 'piene' : id > 8 ? 'rigate' : null;
    const remaining = group => balls.filter(b => b.active && groupOf(b.id) === group).length;
    const clearPath = (from, to, ignored) => {
      const dx = to.x - from.x, dy = to.y - from.y, length2 = dx * dx + dy * dy;
      return !balls.some(b => {
        if (!b.active || ignored.includes(b.id)) return false;
        const t = length2 ? clamp(((b.x - from.x) * dx + (b.y - from.y) * dy) / length2, 0, 1) : 0;
        return Math.hypot(b.x - from.x - dx * t, b.y - from.y - dy * t) < R * 2 + .3;
      });
    };
    const assistedAim = (raw = angle) => {
      if (state !== 'aim' || !white().active) return null;
      const cue = white(), group = groups[player];
      const canBlack = mode === 'practice' ? !balls.some(b => b.active && groupOf(b.id)) : !!group && remaining(group) === 0;
      let best = null;
      for (const b of balls) {
        if (!b.active || !b.id || (b.id === 8 ? !canBlack : mode === 'duel' && group && groupOf(b.id) !== group)) continue;
        for (const p of pockets) {
          const distance = Math.hypot(p[0] - b.x, p[1] - b.y);
          if (distance < .01) continue;
          const ux = (p[0] - b.x) / distance, uy = (p[1] - b.y) / distance;
          const ghost = { x: b.x - ux * R * 2, y: b.y - uy * R * 2 };
          if (ghost.x < FX + R || ghost.x > FX + FW - R || ghost.y < FY + R || ghost.y > FY + FH - R) continue;
          const dx = ghost.x - cue.x, dy = ghost.y - cue.y, travel = Math.hypot(dx, dy);
          if (travel < R || (dx * ux + dy * uy) / travel < .28) continue;
          const direction = Math.atan2(dy, dx), error = Math.abs(Math.atan2(Math.sin(direction - raw), Math.cos(direction - raw)));
          if (error > 8 * Math.PI / 180 || !clearPath(cue, ghost, [0, b.id]) || !clearPath(b, { x: p[0], y: p[1] }, [0, b.id])) continue;
          const quality = error + travel * .00002 + distance * .00001;
          if (!best || quality < best.quality) best = { angle: direction, ball: b.id, target: b, pocket: p, ghost, quality };
        }
      }
      return best;
    };
    const notice = (s, t = 3) => { message = s; messageTime = t; };
    const validSpot = (x, y, ignore = 0) => x >= FX + R && x <= FX + FW - R && y >= FY + R && y <= FY + FH - R
      && !balls.some(b => b.active && b.id !== ignore && Math.hypot(b.x - x, b.y - y) < R * 2 + 1)
      && !pockets.some(p => Math.hypot(p[0] - x, p[1] - y) < PR + 2);
    const findSpot = (x, y, ignore) => {
      if (validSpot(x, y, ignore)) return { x, y };
      for (let radius = R * 2; radius < FH; radius += R * 1.5) for (let i = 0; i < 24; i++) {
        const a = i * TAU / 24, px = x + Math.cos(a) * radius, py = y + Math.sin(a) * radius;
        if (validSpot(px, py, ignore)) return { x: px, y: py };
      }
      return spot(.8);
    };
    const respot = id => {
      const b = balls.find(b => b.id === id), at=spot(id?.35:.76), p = findSpot(at.x,at.y,id);
      Object.assign(b, p, { vx: 0, vy: 0, active: true });
    };
    const rack = () => {
      balls = [{ id: 0, ...spot(.76), vx: 0, vy: 0, active: true }];
      const ids = [1, 9, 2, 10, 8, 3, 11, 4, 12, 5, 6, 13, 7, 14, 15]; let at = 0;
      for (let row = 0; row < 5; row++) for (let col = 0; col <= row; col++) balls.push({ id: ids[at++], ...spot(.37-row*(R*Math.sqrt(3)+.3)/(wide?FW:FH),.5+(col-row/2)*(R*2+.3)/(wide?FH:FW)), vx: 0, vy: 0, active: true });
    };
    const newGame = nextMode => {
      mode = nextMode || mode; rack(); state = 'aim'; player = 0; groups = [null, null]; angle = wide ? Math.PI : -Math.PI / 2;
      shots = 0; points = 0; shot = null; elapsed = 0; winner = null; drag = null; charging = false; power = wide ? 0.8 : 0.65;
      notice('1 MIRA · 2 POTENZA · 3 TIRA', 5);
    };
    const finish = won => {
      state = 'over'; winner = won; drag = null; charging = false;
      if (mode === 'practice' && won) points += Math.max(100, 2000 - shots * 25);
      if (points > hi) { hi = points; api.store.set('hi', hi); }
      if (won !== false) { api.haptic(35); api.beep(1046, 0.18, 'triangle'); api.fx.burst(W / 2, FY + FH / 2, { n: 70, color: ['#59c48f', '#ffe27a', '#fff'], speed: 210, life: 1.1, gravity: 180 }); }
    };
    const finishShot = () => {
      const objects = shot.potted.filter(id => id && id !== 8), black = shot.potted.includes(8), scratch = shot.potted.includes(0);
      if (mode === 'practice') {
        points += objects.length * 100;
        if (points > hi) { hi = points; api.store.set('hi', hi); }
        if (black && shot.break && balls.some(b => b.active && groupOf(b.id))) respot(8);
        else if (black) { finish(!scratch && balls.every(b => !b.active || b.id === 0)); return; }
        state = scratch ? 'place' : 'aim';
        if (scratch) { respot(0); notice('BIANCA IN BUCA: RIPOSIZIONALA'); }
        else notice(black ? '8 RIPOSIZIONATA · CONTINUA' : objects.length ? '+' + objects.length * 100 + ' · CONTINUA' : 'MIRA AL PROSSIMO TIRO');
      } else {
        const group = groups[player];
        const wrong = shot.first !== null && (group ? (shot.canBlack ? shot.first !== 8 : groupOf(shot.first) !== group) : shot.first === 8);
        const foul = scratch || shot.first === null || wrong || (!shot.potted.length && !shot.rail);
        if (black && !shot.break) { finish(shot.canBlack && !foul ? player : 1 - player); return; }
        if (black) respot(8);
        if (!group && objects.length && !foul && !shot.break) { groups[player] = groupOf(objects[0]); groups[1 - player] = groups[player] === 'piene' ? 'rigate' : 'piene'; }
        const keepsTurn = !foul && objects.some(id => !groups[player] || groupOf(id) === groups[player]);
        if (!keepsTurn) player = 1 - player;
        if (foul) { respot(0); state = 'place'; notice('FALLO · G' + (player + 1) + ': POSIZIONA LA BIANCA', 5); }
        else { state = 'aim'; notice('GIOCATORE ' + (player + 1) + (groups[player] ? ' · ' + groups[player].toUpperCase() : ' · TAVOLO APERTO')); }
      }
      shot = null; power = 0.55;
    };
    const fire = strength => {
      if (state !== 'aim' || !white().active) return;
      const b = white(), speed = 140 + clamp(strength, 0.1, 1) * 710;
      shot = { first: null, potted: [], rail: false, break: shots === 0, canBlack: !!groups[player] && remaining(groups[player]) === 0 };
      const direction = assistedAim()?.angle ?? angle;
      b.vx = Math.cos(direction) * speed; b.vy = Math.sin(direction) * speed;
      state = 'rolling'; elapsed = 0; shots++; drag = null; charging = false; api.haptic(10); api.beep(230, 0.05, 'triangle', 0.065);
    };
    const pocket = b => {
      b.active = false; b.vx = b.vy = 0; shot.potted.push(b.id);
      api.beep(b.id ? 640 : 160, 0.08, 'triangle', 0.05); api.haptic(b.id ? 10 : 20);
      api.fx.burst(b.x, b.y, { n: 8, color: b.id ? '#f4d08e' : '#d8eaff', speed: 60, life: 0.4, size: 2 });
    };
    const physics = dt => {
      for (const b of balls) {
        if (!b.active) continue;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (pockets.some(p => Math.hypot(b.x - p[0], b.y - p[1]) < PR * 0.97)) { pocket(b); continue; }
        let rail = false;
        if (b.x < FX + R) { b.x = FX + R; b.vx = Math.abs(b.vx) * 0.88; rail = true; }
        if (b.x > FX + FW - R) { b.x = FX + FW - R; b.vx = -Math.abs(b.vx) * 0.88; rail = true; }
        if (b.y < FY + R) { b.y = FY + R; b.vy = Math.abs(b.vy) * 0.88; rail = true; }
        if (b.y > FY + FH - R) { b.y = FY + FH - R; b.vy = -Math.abs(b.vy) * 0.88; rail = true; }
        if (rail && shot.first !== null) shot.rail = true;
        const speed = Math.hypot(b.vx, b.vy), next = Math.max(0, speed - 145 * dt);
        if (speed) { b.vx *= next / speed; b.vy *= next / speed; }
      }
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j]; if (!a.active || !b.active) continue;
        const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
        if (dist >= R * 2) continue;
        const nx = dist > 0.0001 ? dx / dist : 1, ny = dist > 0.0001 ? dy / dist : 0, overlap = (R * 2 - dist + 0.03) / 2;
        a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
        const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (relative < 0) {
          if (shot.first === null && (a.id === 0 || b.id === 0)) shot.first = a.id === 0 ? b.id : a.id;
          const impulse = -relative * 0.97;
          a.vx -= impulse * nx; a.vy -= impulse * ny; b.vx += impulse * nx; b.vy += impulse * ny;
        }
      }
    };
    const place = (x, y, commit) => {
      x = clamp(x, FX + R, FX + FW - R); y = clamp(y, FY + R, FY + FH - R);
      if (!validSpot(x, y, 0)) { if (commit) notice('SCEGLI UNO SPAZIO LIBERO'); return; }
      white().x = x; white().y = y;
      if (commit) { state = 'aim'; notice('BIANCA POSIZIONATA · ORA MIRA'); api.haptic(6); }
    };
    const cancelGesture = () => {
      if (drag) { angle = drag.angle; power = drag.power; }
      drag = null; charging = false;
    };
    const pause = () => { if (state === 'pause') state = resume; else if (['aim', 'rolling', 'place'].includes(state)) { resume = state; state = 'pause'; } pauseTouch = null; cancelGesture(); };
    const aimAt = e => {
      const dx = e.x - white().x, dy = e.y - white().y;
      if (Math.hypot(dx, dy) > R * 2 + 8) angle = Math.atan2(dy, dx);
    };
    const setPower = x => { power = clamp((x - controls.power.x - 16) / (controls.power.w - 32), 0.1, 1); };
    const onPointer = e => {
      if (state === 'setup') { if (e.type === 'up' && !e.cancelled) { if (e.y >= H / 2 - 8 && e.y < H / 2 + 45) newGame('practice'); else if (e.y >= H / 2 + 62 && e.y < H / 2 + 115) newGame('duel'); } return; }
      if (state === 'over') { if (e.type === 'up' && !e.cancelled) newGame(mode); return; }
      if (state === 'pause') { if (e.type === 'down') pauseTouch = e.id; else if (e.type === 'up' && e.id === pauseTouch) { pauseTouch = null; if (!e.cancelled) pause(); } return; }
      if (state === 'rolling' || charging || (drag && drag.id !== e.id)) return;
      if (e.type === 'down') {
        const begin = kind => { drag = { id: e.id, kind, startX: e.x, startY: e.y, angle, power, length: 0 }; };
        if (inside(e, controls.fire)) { begin('fire'); return; }
        if (state === 'aim' && inside(e, controls.power)) { begin('power'); setPower(e.x); return; }
        if (e.y < FY - 16 || e.y > FY + FH + 22 || e.x < 0 || e.x > W) return;
        if (state === 'place') { begin('place'); place(e.x, e.y, false); return; }
        if (Math.hypot(e.x - white().x, e.y - white().y) < R * 3 + 12) begin('pull');
        else { begin('aim'); aimAt(e); }
      } else if (drag && drag.id === e.id) {
        if (e.cancelled) { cancelGesture(); return; }
        if (drag.kind === 'fire') {
          if (e.type === 'up') { drag = null; if (inside(e, controls.fire)) { if (state === 'place') place(white().x, white().y, true); else fire(power); } }
          return;
        }
        if (drag.kind === 'power' || drag.kind === 'aim') {
          if (drag.kind === 'power') setPower(e.x); else aimAt(e);
          if (e.type === 'up') drag = null;
          return;
        }
        if (drag.kind === 'place') { place(e.x, e.y, e.type === 'up' && !e.cancelled); if (e.type === 'up') drag = null; return; }
        const dx = e.x - drag.startX, dy = e.y - drag.startY, length = Math.hypot(dx, dy); drag.length = length;
        if (length > 6) { angle = Math.atan2(-dy, -dx); power = clamp(length / 105, 0.1, 1); }
        if (e.type === 'up') { if (length > 18) { drag = null; fire(power); } else cancelGesture(); }
      }
    };
    const text = (s, x, y, size = 13, color = '#e7f7ef', align = 'left') => { g.font = `bold ${size}px ui-monospace, monospace`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); };
    const round = (x, y, w, h, r, fill) => { g.fillStyle = fill; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
    const circle = (x, y, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const drawBall = b => {
      circle(b.x + 1.5, b.y + 2.5, R, '#071b1b77');
      const color = b.id > 8 ? colors[b.id - 8] : colors[b.id];
      const base = g.createRadialGradient(b.x - R * 0.4, b.y - R * 0.45, 0, b.x, b.y, R);
      base.addColorStop(0, b.id === 0 || b.id > 8 ? '#ffffff' : color); base.addColorStop(1, b.id === 0 || b.id > 8 ? '#b5c4bc' : '#142528');
      circle(b.x, b.y, R, base);
      if (b.id > 8) { g.save(); g.beginPath(); g.arc(b.x, b.y, R - 0.1, 0, TAU); g.clip(); g.fillStyle = color; g.fillRect(b.x - R, b.y - R * 0.46, R * 2, R * 0.92); g.restore(); }
      if (b.id) { circle(b.x, b.y, R * 0.53, '#fff9e7'); text(String(b.id), b.x, b.y + 0.5, Math.max(8, R * 0.94), '#182329', 'center'); }
      circle(b.x - R * 0.35, b.y - R * 0.4, R * 0.19, '#ffffff99');
    };
    const guide = assistance => {
      if (assistance) {
        const cue = white(), { ghost, target, pocket } = assistance;
        g.lineWidth = 2; g.strokeStyle = '#f3f7d5cc'; g.setLineDash([5, 5]);
        g.beginPath(); g.moveTo(cue.x, cue.y); g.lineTo(ghost.x, ghost.y); g.stroke();
        g.setLineDash([]); g.beginPath(); g.arc(ghost.x, ghost.y, R, 0, TAU); g.stroke();
        g.strokeStyle = '#ffe27a'; g.beginPath(); g.moveTo(target.x, target.y); g.lineTo(pocket[0], pocket[1]); g.stroke();
        g.beginPath(); g.arc(pocket[0], pocket[1], PR + 3, 0, TAU); g.stroke();
        return;
      }
      const cue = white(); let x = cue.x, y = cue.y, ux = Math.cos(angle), uy = Math.sin(angle);
      g.setLineDash([4, 6]); g.lineWidth = 1.5; g.strokeStyle = '#f3f7d5aa';
      for (let bounce = 0; bounce < 2; bounce++) {
        const tx = ux > 0.0001 ? (FX + FW - R - x) / ux : ux < -0.0001 ? (FX + R - x) / ux : Infinity;
        const ty = uy > 0.0001 ? (FY + FH - R - y) / uy : uy < -0.0001 ? (FY + R - y) / uy : Infinity;
        let distance = Math.min(tx, ty), hit = null;
        for (const b of balls) {
          if (!b.active || !b.id) continue;
          const dx = b.x - x, dy = b.y - y, along = dx * ux + dy * uy, across = dx * dx + dy * dy - along * along;
          if (along <= 0 || across >= R * R * 4) continue;
          const near = along - Math.sqrt(Math.max(0, R * R * 4 - across));
          if (near >= 0 && near < distance) { distance = near; hit = b; }
        }
        distance = Math.max(0, Math.min(distance, FH * 1.5));
        const ex = x + ux * distance, ey = y + uy * distance;
        g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
        if (hit) {
          g.setLineDash([]); g.strokeStyle = '#f6fbe7bb'; g.beginPath(); g.arc(ex, ey, R, 0, TAU); g.stroke();
          const dx = hit.x - ex, dy = hit.y - ey, length = Math.hypot(dx, dy) || 1;
          g.strokeStyle = '#ffe27aaa'; g.beginPath(); g.moveTo(hit.x, hit.y); g.lineTo(hit.x + dx / length * 46, hit.y + dy / length * 46); g.stroke(); break;
        }
        x = ex; y = ey; if (tx < ty) ux = -ux; else uy = -uy;
      }
      g.setLineDash([]);
    };
    const render = () => {
      const assistance = assistedAim();
      const status = state === 'rolling' ? 'ASPETTA CHE LE PALLE SI FERMINO' : state === 'place' ? 'TOCCA IL TAVOLO PER LA BIANCA' : assistance ? 'MIRA ASSISTITA · BILIA ' + assistance.ball : messageTime > 0 ? message : 'MIRA SUL TAVOLO · POTENZA · TIRA';
      const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#17352f'); bg.addColorStop(1, '#07131b'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      if(wide){const x=W-174;text('BILIARDO',x,25,22,'#83ddb1');text(mode==='practice'?'ALLENAMENTO':'PALLA 8',x,52,12);text('COLPI '+shots,x,80,12);text('PUNTI '+points,x,105,12,'#ffe27a');if(mode==='duel')text('TURNO G'+(player+1),x,132,12,'#ffe27a');if(assistance)text('MIRA ASSISTITA',x,158,11,'#ffe27a');}
      else {
      text('BILIARDO', 16, 22, 24, '#83ddb1'); text(mode === 'practice' ? 'ALLENAMENTO' : 'PALLA 8 ARCADE', W - 16, 22, 11, '#d8e6de', 'right');
      if (mode === 'practice') { text('COLPI ' + shots + ' · BUCHE ' + balls.filter(b => b.id && !b.active).length + '/15', 16, 43, 12); text('PUNTI ' + points, W - 16, 43, 12, '#ffe27a', 'right'); }
      else { text('G1 ' + (groups[0] ? groups[0].toUpperCase() + ' ' + remaining(groups[0]) : 'APERTO'), 16, 43, 12, player === 0 ? '#ffe27a' : '#91ada3'); text('G2 ' + (groups[1] ? groups[1].toUpperCase() + ' ' + remaining(groups[1]) : 'APERTO'), W - 16, 43, 12, player === 1 ? '#ffe27a' : '#91ada3', 'right'); }
      }
      const wood = g.createLinearGradient(FX - 20, 0, FX + FW + 20, 0); wood.addColorStop(0, '#533728'); wood.addColorStop(0.35, '#9f7147'); wood.addColorStop(1, '#4b3028');
      round(FX - 22, FY - 20, FW + 44, FH + 44, 18, '#050c12'); round(FX - 20, FY - 22, FW + 40, FH + 44, 17, wood);
      round(FX - 9, FY - 9, FW + 18, FH + 18, 9, '#0c443e');
      const felt = g.createRadialGradient(W / 2, FY + FH * 0.35, 10, W / 2, FY + FH / 2, FH * 0.7); felt.addColorStop(0, '#278365'); felt.addColorStop(1, '#155347');
      round(FX, FY, FW, FH, 4, felt);
      g.strokeStyle = '#79aa8b22'; g.lineWidth = 1; g.beginPath(); g.moveTo(FX + 5, FY + FH * 0.73); g.lineTo(FX + FW - 5, FY + FH * 0.73); g.stroke();
      for (let i = 1; i < 8; i++) for (const side of [FX - 15, FX + FW + 15]) circle(side, FY + FH * i / 8, 1.5, '#e7d5a0');
      for (const p of pockets) { circle(p[0], p[1], PR + 2, '#ba9456'); circle(p[0], p[1], PR, '#040b0e'); circle(p[0] + 1, p[1] + 2, PR * 0.7, '#000'); }
      if (state === 'aim') {
        guide(assistance); const b = white(); g.save(); g.translate(b.x, b.y); g.rotate(assistance?.angle ?? angle);
        const offset = R + 10 + power * 22;
        g.lineCap = 'round'; g.lineWidth = 4; g.strokeStyle = '#d2af73'; g.beginPath(); g.moveTo(-offset, 0); g.lineTo(-offset - 90, 0); g.stroke(); g.lineWidth = 5; g.strokeStyle = '#654e40'; g.beginPath(); g.moveTo(-offset - 60, 0); g.lineTo(-offset - 112, 0); g.stroke(); g.lineWidth = 4; g.strokeStyle = '#73d2d1'; g.beginPath(); g.moveTo(-offset, 0); g.lineTo(-offset - 4, 0); g.stroke(); g.restore();
      }
      balls.filter(b => b.active).forEach(drawBall);
      if (state === 'place') { g.strokeStyle = '#ffe27a'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(white().x, white().y, R + 7, 0, TAU); g.stroke(); g.setLineDash([]); }
      const pc = controls.power, fc = controls.fire, ready = state === 'aim';
      round(pc.x, pc.y, pc.w, pc.h, 10, '#102e31');
      const labelY = wide ? 17 : 14, trackY = wide ? 41 : 34;
      text('POTENZA', pc.x + 16, pc.y + labelY, 12, '#bdd3cb');
      text(ready ? Math.round(power * 100) + '%' : '—', pc.x + pc.w - 16, pc.y + labelY, 12, '#ffe27a', 'right');
      round(pc.x + 16, pc.y + trackY, pc.w - 32, 8, 4, '#284b47');
      if (ready) {
        round(pc.x + 16, pc.y + trackY, (pc.w - 32) * power, 8, 4, power > 0.8 ? '#e5bd64' : '#83ddb1');
        circle(pc.x + 16 + (pc.w - 32) * power, pc.y + trackY + 4, 10, '#e4f5dc');
      }
      const canFire = ready || state === 'place';
      round(fc.x, fc.y, fc.w, fc.h, 10, canFire ? drag?.kind === 'fire' ? '#afc76f' : '#e8d187' : '#243e40');
      text(state === 'place' ? 'POSA' : 'TIRA', fc.x + fc.w / 2, fc.y + fc.h / 2, 22, canFire ? '#152b2c' : '#708d86', 'center');
      if(!wide)text(status, W/2,H-6,10,'#bdd3cb','center');
      if (state === 'setup') {
        round(12, FY + 18, W - 24, FH - 36, 14, '#071a23ee');
        text('UNA PARTITA AL BAR', W / 2, H / 2 - 84, 21, '#ffe27a', 'center');
        text('BUCHE AMPIE · MIRA ASSISTITA', W / 2, H / 2 - 51, 12, '#bdd3cb', 'center');
        round(38, H / 2 - 8, W - 76, 53, 10, '#39765f'); text('ALLENAMENTO', W / 2, H / 2 + 10, 18, '#fff', 'center'); text('IMBUCA LE COLORATE, POI LA 8', W / 2, H / 2 + 30, 11, '#dcf5e7', 'center');
        round(38, H / 2 + 62, W - 76, 53, 10, '#4d5274'); text('2 GIOCATORI', W / 2, H / 2 + 80, 18, '#fff', 'center'); text('PIENE CONTRO RIGATE · A TURNI', W / 2, H / 2 + 100, 11, '#e9eaff', 'center');
      } else if (state === 'pause' || state === 'over') {
        round(16, H / 2 - 89, W - 32, 178, 13, '#071a23ed');
        const title = state === 'pause' ? 'PAUSA' : mode === 'practice' ? (winner ? 'TAVOLO PULITO!' : 'LA 8 TROPPO PRESTO') : 'VINCE GIOCATORE ' + (winner + 1);
        text(title, W / 2, H / 2 - 45, title.length > 17 ? 18 : 24, '#ffe27a', 'center');
        text(state === 'pause' ? 'PRENDITI IL TUO TEMPO' : mode === 'practice' ? points + ' PUNTI · ' + shots + ' COLPI' : 'B: CAMBIA MODALITÀ', W / 2, H / 2 - 5, 13, '#d3e6db', 'center');
        text(state === 'pause' ? 'START O TOCCA PER RIPRENDERE' : 'A O TOCCA: NUOVA PARTITA', W / 2, H / 2 + 35, 12, '#fff', 'center');
      }
    };
    rack();
    return {
      render, onPointer,
      onResize(w,h){const old={wide,FX,FY,FW,FH,R},aimX=Math.cos(angle),aimY=Math.sin(angle);W=w;H=h;geometry();
        for(const b of balls){let x=(b.x-old.FX)/old.FW,y=(b.y-old.FY)/old.FH,vx=b.vx/old.FW,vy=b.vy/old.FH;if(old.wide!==wide){[x,y]=wide?[y,1-x]:[1-y,x];[vx,vy]=wide?[vy,-vx]:[-vy,vx];}b.x=FX+x*FW;b.y=FY+y*FH;b.vx=vx*FW;b.vy=vy*FH;}
        if(old.wide!==wide)angle=Math.atan2(wide?-aimX:aimX,wide?aimY:-aimY);drag=null;charging=false;pauseTouch=null;
      },
      update(dt) {
        if (state === 'pause' || state === 'setup' || state === 'over') return;
        messageTime = Math.max(0, messageTime - dt);
        if (state === 'rolling') {
          elapsed += dt; physics(dt / 2); physics(dt / 2);
          if (elapsed > 12 || balls.every(b => !b.active || Math.hypot(b.vx, b.vy) < 2.5)) { balls.forEach(b => { b.vx = b.vy = 0; }); finishShot(); }
        } else if (state === 'aim') {
          const turn = (held.right ? 1 : 0) - (held.left ? 1 : 0);
          turnTime = turn && !drag ? turnTime + dt : 0;
          if (!drag) angle += turn * dt * (0.35 + Math.min(1, turnTime / 0.8) * 1.35);
          if (charging) { chargeTime += dt; power = 0.35 + 0.65 * Math.abs(Math.sin(chargeTime * 1.5)); }
          else if (!drag) power = clamp(power + ((held.up ? 1 : 0) - (held.down ? 1 : 0)) * dt * 0.5, 0.1, 1);
        } else if (state === 'place') place(white().x + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * dt * 130, white().y + ((held.down ? 1 : 0) - (held.up ? 1 : 0)) * dt * 130, false);
      },
      onPress(k) {
        if (k === 'start') { if (state === 'setup') newGame('practice'); else pause(); }
        else if (k === 'select') newGame(mode);
        else if (k === 'b') { state = 'setup'; charging = false; drag = null; }
        else if (k === 'a' && !drag) { if (state === 'setup') newGame('practice'); else if (state === 'over') newGame(mode); else if (state === 'place') place(white().x, white().y, true); else if (state === 'aim') { charging = true; chargeTime = 0; power = 0.35; } }
      },
      onRelease(k) { if (k === 'a' && charging) { charging = false; fire(power); } },
      onHide() { if (['aim', 'rolling', 'place'].includes(state)) pause(); },
      debug: { get balls() { return balls.map(b => ({ ...b })); }, get state() { return state; }, get mode() { return mode; }, get player() { return player; }, get groups() { return groups.slice(); }, get shot() { return shot && { ...shot, potted: shot.potted.slice() }; }, get shots() { return shots; }, get score() { return points; }, get winner() { return winner; }, get aim() { const assistance = assistedAim(); return { angle, power, charging, gesture: drag?.kind || null, assisted: !!assistance, assistedAngle: assistance?.angle ?? angle, target: assistance?.ball ?? null, pocket: assistance?.pocket.slice() ?? null }; }, get layout() { return { width: W, height: H, landscape:wide, x: FX, y: FY, w: FW, h: FH, radius: R, pocketRadius: PR, pockets, controls: { power: { ...controls.power }, fire: { ...controls.fire } } }; } },
    };
  },
});

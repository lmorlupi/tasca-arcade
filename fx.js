// Effetti grafici condivisi (api.fx): particelle, scuotimento dello schermo, lampo, testo dei punti che sale.
// Questa funzione è self-contained: lo stesso testo gira anche dentro la scatola dei giochi di terzi.
// La console chiama update(dt) a ogni passo della fisica e draw(g) dopo il render del gioco, in coordinate del gioco.
function fxFactory() {
  var MAX = 700, parts = [], texts = [], sh = 0, shT = 0, shDur = 0, sx = 0, sy = 0, fl = null;
  var calm = false;
  try { calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  var num = function (v, d) { return typeof v === 'number' && isFinite(v) ? v : d; };
  var api = {
    // Esplosione di particelle. o: { n, color (anche un elenco), speed, life, size, gravity, angle, spread, drag, glow }
    burst: function (x, y, o) {
      o = o || {};
      var n = Math.min(80, Math.max(1, num(o.n, 14) | 0)), sp = num(o.speed, 120), life = num(o.life, 0.5);
      var cols = Array.isArray(o.color) ? o.color : [o.color || '#ffffff'];
      var ang = num(o.angle, 0), spr = num(o.spread, Math.PI * 2), size = num(o.size, 3);
      for (var i = 0; i < n; i++) {
        if (parts.length >= MAX) parts.shift();
        var a = ang + (Math.random() - 0.5) * spr, v = sp * (0.35 + Math.random() * 0.65), l = life * (0.6 + Math.random() * 0.4);
        parts.push({ x: num(x, 0), y: num(y, 0), vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: l, l: l,
          s: size * (0.6 + Math.random() * 0.8), c: String(cols[i % cols.length]), gr: num(o.gravity, 0), dr: num(o.drag, 2), glow: !!o.glow });
      }
    },
    // Scuotimento: ampiezza in pixel del gioco, durata in secondi. Più scosse insieme tengono la più forte.
    shake: function (amt, time) {
      amt = Math.min(20, num(amt, 4)); time = Math.min(1, num(time, 0.25));
      if (amt >= sh * (shDur ? shT / shDur : 0)) { sh = amt; shT = shDur = time; }
    },
    // Lampo sullo schermo (es. quando si viene colpiti).
    flash: function (color, time, alpha) {
      time = Math.min(1, num(time, 0.15));
      fl = { c: String(color || '#ffffff'), t: time, l: time, a: Math.min(1, num(alpha, 0.55)) };
    },
    // Testo che sale e svanisce (es. "+100"). o: { color, size, life, rise }
    text: function (x, y, str, o) {
      o = o || {};
      if (texts.length >= 40) texts.shift();
      var life = num(o.life, 0.8);
      texts.push({ x: num(x, 0), y: num(y, 0), s: String(str).slice(0, 24), c: String(o.color || '#ffffff'),
        z: Math.min(48, num(o.size, 14)), t: life, l: life, r: num(o.rise, 40) });
    },
    clear: function () { parts.length = 0; texts.length = 0; sh = shT = 0; fl = null; },
  };
  return {
    api: api,
    update: function (dt) {
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.t -= dt;
        if (p.t <= 0) { parts.splice(i, 1); continue; }
        var k = Math.max(0, 1 - p.dr * dt);
        p.vx *= k; p.vy = p.vy * k + p.gr * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      for (var j = texts.length - 1; j >= 0; j--) { texts[j].t -= dt; if (texts[j].t <= 0) texts.splice(j, 1); }
      if (shT > 0) {
        shT = Math.max(0, shT - dt);
        var a = calm ? 0 : sh * (shT / shDur);
        sx = (Math.random() * 2 - 1) * a; sy = (Math.random() * 2 - 1) * a;
      } else sx = sy = 0;
      if (fl) { fl.t -= dt; if (fl.t <= 0) fl = null; }
    },
    // Spostamento dello scuotimento, in pixel del gioco: la console lo applica al canvas.
    get dx() { return sx; },
    get dy() { return sy; },
    get busy() { return parts.length > 0 || texts.length > 0 || !!fl || shT > 0; },
    draw: function (g, W, H) {
      if (!parts.length && !texts.length && !fl) return;
      g.save();
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.shadowBlur = 0;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], f = p.t / p.l, s = p.s * (0.4 + 0.6 * f);
        g.globalAlpha = Math.min(1, f * 1.6);
        g.globalCompositeOperation = p.glow ? 'lighter' : 'source-over';
        g.fillStyle = p.c;
        g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      g.globalCompositeOperation = 'source-over';
      if (texts.length) {
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        for (var j = 0; j < texts.length; j++) {
          var t = texts[j], u = 1 - t.t / t.l, pop = u < 0.15 ? 0.7 + 2 * u : 1;
          g.globalAlpha = Math.min(1, (t.t / t.l) * 2.5);
          g.font = 'bold ' + Math.round(t.z * pop) + 'px ui-monospace, Menlo, monospace';
          g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.6)';
          var yy = t.y - t.r * (1 - Math.pow(1 - u, 2));
          g.strokeText(t.s, t.x, yy); g.fillStyle = t.c; g.fillText(t.s, t.x, yy);
        }
      }
      if (fl && !calm) {
        g.globalAlpha = fl.a * (fl.t / fl.l); g.fillStyle = fl.c;
        g.fillRect(-20, -20, W + 40, H + 40);
      }
      g.restore();
    },
  };
}

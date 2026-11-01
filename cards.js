// Mazzo da 40 carte "all'italiana" in stile piacentino (denari, coppe, spade, bastoni), disegnato dal codice: grafica originale.
// Una carta e' { s: seme 0..3, n: 1..10 }  (8 = fante, 9 = cavallo, 10 = re).
(function () {
  const SUITS = ['DENARI', 'COPPE', 'SPADE', 'BASTONI'];
  const COL = ['#b8760a', '#b02a44', '#2a63a8', '#2f7a3a'];            // colore del seme: numeri, bordo, abiti
  const NAMES = { 1: 'A', 8: 'F', 9: 'C', 10: 'R' };
  const deck = () => { const d = []; for (let s = 0; s < 4; s++) for (let n = 1; n <= 10; n++) d.push({ s, n }); return d; };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const label = c => (NAMES[c.n] || c.n) + ' ' + SUITS[c.s][0].toLowerCase() + SUITS[c.s].slice(1);
  const lg = (g, x0, y0, x1, y1, stops) => { const k = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => k.addColorStop(o, c)); return k; };
  const rg = (g, x, y, r0, r1, stops) => { const k = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => k.addColorStop(o, c)); return k; };

  // ---- semi, centrati in (cx, cy) con raggio r
  function suitSymbol(g, s, cx, cy, r) {
    g.save(); g.translate(cx, cy); g.lineJoin = 'round'; g.lineCap = 'round';
    if (s === 0) {                                   // denaro: moneta con raggi di sole, bordo perlinato e volto
      g.fillStyle = 'rgba(120,70,0,.25)'; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283; g.beginPath(); g.moveTo(Math.cos(a - 0.1) * r * 0.78, Math.sin(a - 0.1) * r * 0.78); g.lineTo(Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08); g.lineTo(Math.cos(a + 0.1) * r * 0.78, Math.sin(a + 0.1) * r * 0.78); g.fill(); }
      g.fillStyle = rg(g, -r * 0.2, -r * 0.25, r * 0.1, r * 1.0, [[0, '#fff0a0'], [0.5, '#e8b83a'], [1, '#a8700a']]); g.beginPath(); g.arc(0, 0, r * 0.82, 0, 7); g.fill(); g.strokeStyle = '#7a4a05'; g.lineWidth = r * 0.07; g.stroke();
      g.fillStyle = '#8a5a0a'; for (let k = 0; k < 14; k++) { const a = k / 14 * 6.283; g.beginPath(); g.arc(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.045, 0, 7); g.fill(); }
      g.fillStyle = rg(g, -r * 0.1, -r * 0.1, r * 0.05, r * 0.5, [[0, '#ffe58a'], [1, '#c8921a']]); g.beginPath(); g.arc(0, 0, r * 0.5, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#7a4a05'; g.beginPath(); g.arc(-r * 0.14, -r * 0.08, r * 0.04, 0, 7); g.arc(r * 0.14, -r * 0.08, r * 0.04, 0, 7); g.fill(); g.lineWidth = r * 0.04; g.beginPath(); g.moveTo(0, -r * 0.05); g.lineTo(-r * 0.04, r * 0.1); g.lineTo(r * 0.04, r * 0.1); g.stroke(); g.beginPath(); g.arc(0, r * 0.12, r * 0.15, 0.3, 2.8); g.stroke();
    } else if (s === 1) {                            // coppa: calice con fascia e piede
      g.fillStyle = lg(g, -r * 0.8, 0, r * 0.8, 0, [[0, '#7a1428'], [0.4, '#d8405a'], [1, '#8a1a30']]);
      g.beginPath(); g.moveTo(-r * 0.85, -r * 0.85); g.lineTo(r * 0.85, -r * 0.85); g.quadraticCurveTo(r * 0.9, r * 0.15, 0, r * 0.3); g.quadraticCurveTo(-r * 0.9, r * 0.15, -r * 0.85, -r * 0.85); g.fill(); g.strokeStyle = '#5a0f20'; g.lineWidth = r * 0.07; g.stroke();
      g.fillStyle = '#f2c94c'; g.beginPath(); g.ellipse(0, -r * 0.85, r * 0.85, r * 0.13, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#e8b83a'; g.fillRect(-r * 0.78, -r * 0.4, r * 1.56, r * 0.1);
      g.fillStyle = '#e8b83a'; g.beginPath(); g.ellipse(0, r * 0.38, r * 0.18, r * 0.12, 0, 0, 7); g.fill(); g.stroke(); g.fillRect(-r * 0.08, r * 0.4, r * 0.16, r * 0.34); g.strokeRect(-r * 0.08, r * 0.4, r * 0.16, r * 0.34);
      g.beginPath(); g.moveTo(-r * 0.55, r * 0.9); g.quadraticCurveTo(0, r * 0.62, r * 0.55, r * 0.9); g.lineTo(r * 0.5, r * 0.98); g.lineTo(-r * 0.5, r * 0.98); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(-r * 0.5, -r * 0.35, r * 0.08, r * 0.3, -0.1, 0, 7); g.fill();
    } else if (s === 2) {                            // spada curva con coccia e pomolo
      g.rotate(-0.4);
      g.fillStyle = lg(g, -r * 0.3, 0, r * 0.4, 0, [[0, '#f4f8fc'], [0.5, '#b8c8dc'], [1, '#6a82a0']]);
      g.beginPath(); g.moveTo(-r * 0.14, r * 0.3); g.quadraticCurveTo(-r * 0.6, -r * 0.35, r * 0.06, -r * 1.05); g.quadraticCurveTo(r * 0.36, -r * 0.4, r * 0.16, r * 0.3); g.closePath(); g.fill(); g.strokeStyle = '#3a4a62'; g.lineWidth = r * 0.06; g.stroke();
      g.strokeStyle = 'rgba(60,80,110,.55)'; g.lineWidth = r * 0.03; g.beginPath(); g.moveTo(-r * 0.02, r * 0.2); g.quadraticCurveTo(-r * 0.3, -r * 0.35, r * 0.06, -r * 0.85); g.stroke();
      g.fillStyle = '#e8b83a'; g.strokeStyle = '#7a4a05'; g.lineWidth = r * 0.05; g.beginPath(); g.roundRect(-r * 0.55, r * 0.26, r * 1.1, r * 0.17, r * 0.08); g.fill(); g.stroke(); g.beginPath(); g.arc(-r * 0.55, r * 0.345, r * 0.1, 0, 7); g.arc(r * 0.55, r * 0.345, r * 0.1, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#6a3a14'; g.beginPath(); g.roundRect(-r * 0.09, r * 0.42, r * 0.18, r * 0.42, r * 0.04); g.fill(); g.strokeStyle = '#c89a4a'; g.lineWidth = r * 0.03; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-r * 0.09, r * (0.5 + k * 0.12)); g.lineTo(r * 0.09, r * (0.5 + k * 0.12)); g.stroke(); }
      g.fillStyle = '#e8b83a'; g.beginPath(); g.arc(0, r * 0.95, r * 0.14, 0, 7); g.fill(); g.strokeStyle = '#7a4a05'; g.stroke();
    } else {                                         // bastone nodoso con foglie
      g.rotate(0.5);
      g.fillStyle = lg(g, -r * 0.3, 0, r * 0.3, 0, [[0, '#6a3f14'], [0.45, '#c8904a'], [1, '#5a3410']]);
      g.beginPath(); g.moveTo(-r * 0.17, r * 1.0); g.quadraticCurveTo(-r * 0.22, r * 0.2, -r * 0.34, -r * 0.5); g.quadraticCurveTo(-r * 0.35, -r * 1.12, 0, -r * 1.1); g.quadraticCurveTo(r * 0.35, -r * 1.12, r * 0.34, -r * 0.5); g.quadraticCurveTo(r * 0.22, r * 0.2, r * 0.17, r * 1.0); g.closePath(); g.fill(); g.strokeStyle = '#3a200a'; g.lineWidth = r * 0.06; g.stroke();
      g.strokeStyle = 'rgba(40,20,5,.45)'; g.lineWidth = r * 0.04; for (const [y, w] of [[-0.35, 0.3], [0.1, 0.24], [0.5, 0.2]]) { g.beginPath(); g.moveTo(-r * w, r * y); g.quadraticCurveTo(0, r * (y + 0.1), r * w, r * y); g.stroke(); }
      g.fillStyle = '#3f8a3a'; g.strokeStyle = '#1f4a1c'; g.lineWidth = r * 0.04; g.beginPath(); g.ellipse(r * 0.34, r * 0.05, r * 0.26, r * 0.1, -0.55, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(-r * 0.34, r * 0.5, r * 0.26, r * 0.1, 0.55, 0, 7); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(-r * 0.16, -r * 0.55, r * 0.06, r * 0.32, 0.1, 0, 7); g.fill();
    }
    g.restore();
  }

  // ---- figure (meta' alta, da specchiare)
  function figure(g, n, col, w, h) {
    const dark = '#3a2410';
    g.save(); g.lineJoin = 'round';
    const face = (cx, cy, r, mustache) => {
      g.fillStyle = rg(g, cx - r * 0.3, cy - r * 0.3, 1, r * 1.1, [[0, '#ffe2c0'], [1, '#d8a878']]); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = dark; g.lineWidth = w * 0.012; g.stroke();
      g.fillStyle = dark; g.beginPath(); g.arc(cx - r * 0.38, cy - r * 0.1, r * 0.09, 0, 7); g.arc(cx + r * 0.38, cy - r * 0.1, r * 0.09, 0, 7); g.fill();
      g.beginPath(); g.moveTo(cx, cy - r * 0.05); g.lineTo(cx - r * 0.06, cy + r * 0.2); g.lineTo(cx + r * 0.06, cy + r * 0.2); g.stroke();
      if (mustache) { g.beginPath(); g.moveTo(cx - r * 0.5, cy + r * 0.3); g.quadraticCurveTo(cx, cy + r * 0.12, cx + r * 0.5, cy + r * 0.3); g.quadraticCurveTo(cx, cy + r * 0.28, cx - r * 0.5, cy + r * 0.3); g.fillStyle = dark; g.fill(); }
      else { g.beginPath(); g.arc(cx, cy + r * 0.38, r * 0.14, 0.2, 2.9); g.stroke(); }
    };
    const robe = (y0) => {
      g.fillStyle = col; g.beginPath(); g.moveTo(-w * 0.34, 0); g.quadraticCurveTo(-w * 0.32, y0 + h * 0.05, -w * 0.12, y0); g.lineTo(w * 0.12, y0); g.quadraticCurveTo(w * 0.32, y0 + h * 0.05, w * 0.34, 0); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = w * 0.012; g.stroke();
      g.fillStyle = '#f2c94c'; for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(k * w * 0.1, y0 + h * 0.07 * (1 - Math.abs(k) * 0.18), w * 0.016, 0, 7); g.fill(); }
    };
    if (n === 10) {                                  // re: corona con gemme, barba, manto e scettro
      robe(-h * 0.1); g.fillStyle = '#d9d9e8'; g.beginPath(); g.moveTo(-w * 0.34, 0); g.quadraticCurveTo(0, -h * 0.07, w * 0.34, 0); g.lineTo(w * 0.34, h * 0.01); g.lineTo(-w * 0.34, h * 0.01); g.closePath(); g.fill();
      face(0, -h * 0.17, w * 0.15, true); g.fillStyle = '#e8e0d0'; g.beginPath(); g.moveTo(-w * 0.13, -h * 0.13); g.quadraticCurveTo(0, -h * 0.02, w * 0.13, -h * 0.13); g.quadraticCurveTo(0, -h * 0.08, -w * 0.13, -h * 0.13); g.fill();
      g.fillStyle = '#f2c94c'; g.strokeStyle = '#7a4a05'; g.lineWidth = w * 0.014; g.beginPath(); g.moveTo(-w * 0.17, -h * 0.26); g.lineTo(-w * 0.19, -h * 0.4); g.lineTo(-w * 0.09, -h * 0.32); g.lineTo(0, -h * 0.44); g.lineTo(w * 0.09, -h * 0.32); g.lineTo(w * 0.19, -h * 0.4); g.lineTo(w * 0.17, -h * 0.26); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = col; for (const x of [-0.19, 0, 0.19]) { g.beginPath(); g.arc(w * x, -h * (x ? 0.4 : 0.44), w * 0.022, 0, 7); g.fill(); }
      g.strokeStyle = '#7a4a05'; g.lineWidth = w * 0.03; g.beginPath(); g.moveTo(w * 0.34, 0); g.lineTo(w * 0.3, -h * 0.34); g.stroke(); g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(w * 0.3, -h * 0.36, w * 0.045, 0, 7); g.fill(); g.stroke();
    } else if (n === 9) {                            // cavallo: cavaliere con elmo piumato e cavallo che si impenna
      g.fillStyle = '#8a5a30'; g.beginPath(); g.moveTo(-w * 0.36, 0); g.quadraticCurveTo(-w * 0.34, -h * 0.12, -w * 0.12, -h * 0.17); g.quadraticCurveTo(-w * 0.04, -h * 0.34, w * 0.1, -h * 0.34); g.lineTo(w * 0.26, -h * 0.24); g.quadraticCurveTo(w * 0.3, -h * 0.2, w * 0.2, -h * 0.17); g.quadraticCurveTo(w * 0.36, -h * 0.1, w * 0.36, 0); g.closePath(); g.fill(); g.strokeStyle = dark; g.lineWidth = w * 0.014; g.stroke();
      g.fillStyle = dark; g.beginPath(); g.moveTo(w * 0.1, -h * 0.33); g.quadraticCurveTo(-w * 0.02, -h * 0.3, -w * 0.06, -h * 0.17); g.lineTo(-w * 0.02, -h * 0.17); g.quadraticCurveTo(0, -h * 0.28, w * 0.1, -h * 0.3); g.fill(); g.beginPath(); g.arc(w * 0.19, -h * 0.26, w * 0.016, 0, 7); g.fill();
      g.fillStyle = col; g.beginPath(); g.moveTo(-w * 0.32, 0); g.quadraticCurveTo(-w * 0.3, -h * 0.07, -w * 0.12, -h * 0.08); g.lineTo(w * 0.12, -h * 0.08); g.quadraticCurveTo(w * 0.3, -h * 0.07, w * 0.32, 0); g.closePath(); g.fill(); g.stroke();
      face(-w * 0.1, -h * 0.22, w * 0.1, true); g.fillStyle = '#c8c8d8'; g.beginPath(); g.moveTo(-w * 0.2, -h * 0.24); g.quadraticCurveTo(-w * 0.1, -h * 0.4, 0, -h * 0.24); g.closePath(); g.fill(); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(-w * 0.1, -h * 0.36); g.quadraticCurveTo(-w * 0.28, -h * 0.5, -w * 0.3, -h * 0.34); g.quadraticCurveTo(-w * 0.2, -h * 0.4, -w * 0.1, -h * 0.34); g.fill();
    } else {                                         // fante: giovane con cappello piumato e farsetto a righe
      robe(-h * 0.07); g.fillStyle = '#ffffff'; g.globalAlpha = 0.25; for (let k = -3; k <= 3; k++) g.fillRect(k * w * 0.08 - w * 0.015, -h * 0.07, w * 0.03, h * 0.07); g.globalAlpha = 1;
      face(0, -h * 0.17, w * 0.14, false); g.fillStyle = '#6a3f14'; g.beginPath(); g.moveTo(-w * 0.15, -h * 0.17); g.quadraticCurveTo(-w * 0.17, -h * 0.05, -w * 0.1, -h * 0.03); g.lineTo(-w * 0.12, -h * 0.17); g.fill();
      g.fillStyle = col; g.beginPath(); g.moveTo(-w * 0.21, -h * 0.2); g.quadraticCurveTo(0, -h * 0.4, w * 0.2, -h * 0.2); g.lineTo(w * 0.3, -h * 0.17); g.quadraticCurveTo(0, -h * 0.25, -w * 0.3, -h * 0.17); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#e8e0d0'; g.lineWidth = w * 0.03; g.beginPath(); g.moveTo(w * 0.08, -h * 0.32); g.quadraticCurveTo(w * 0.32, -h * 0.5, w * 0.36, -h * 0.28); g.stroke(); g.strokeStyle = dark; g.lineWidth = w * 0.01; g.stroke();
    }
    g.restore();
  }

  // Disegna una carta con l'angolo in alto a sinistra in (x, y), larghezza w (altezza = 1.5 w).
  function draw(g, c, x, y, w, opts) {
    opts = opts || {}; const h = w * 1.5, r = w * 0.09;
    g.save(); g.translate(x, y);
    if (opts.angle) { g.translate(w / 2, h / 2); g.rotate(opts.angle); g.translate(-w / 2, -h / 2); }
    g.fillStyle = 'rgba(0,0,0,' + (opts.lift ? 0.4 : 0.28) + ')'; g.beginPath(); g.roundRect(w * 0.05, h * 0.035 + (opts.lift ? w * 0.07 : 0), w, h, r); g.fill();
    if (!c || opts.back) {
      g.fillStyle = lg(g, 0, 0, w, h, [[0, '#9a1f40'], [1, '#4a0f28']]); g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
      g.save(); g.beginPath(); g.roundRect(w * 0.07, w * 0.07, w * 0.86, h - w * 0.14, r * 0.7); g.clip();
      g.strokeStyle = 'rgba(242,211,138,.5)'; g.lineWidth = 1; const st = w * 0.16;
      for (let i = -h; i < w + h; i += st) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
      g.fillStyle = 'rgba(242,211,138,.35)'; for (let i = 0; i < 6; i++) for (let j = 0; j < 9; j++) { g.beginPath(); g.arc(w * (0.2 + i * 0.12), h * (0.1 + j * 0.1), w * 0.02, 0, 7); g.fill(); }
      g.restore();
      g.strokeStyle = '#f2d38a'; g.lineWidth = w * 0.035; g.beginPath(); g.roundRect(w * 0.07, w * 0.07, w * 0.86, h - w * 0.14, r * 0.7); g.stroke(); g.lineWidth = w * 0.012; g.beginPath(); g.roundRect(w * 0.12, w * 0.12, w * 0.76, h - w * 0.24, r * 0.5); g.stroke();
      const cx = w / 2, cy = h / 2; g.fillStyle = '#6a1230'; g.beginPath(); g.arc(cx, cy, w * 0.23, 0, 7); g.fill(); g.strokeStyle = '#f2d38a'; g.lineWidth = w * 0.025; g.stroke();
      g.fillStyle = '#f2d38a'; for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; g.beginPath(); g.ellipse(cx + Math.cos(a) * w * 0.13, cy + Math.sin(a) * w * 0.13, w * 0.06, w * 0.025, a, 0, 7); g.fill(); } g.beginPath(); g.arc(cx, cy, w * 0.045, 0, 7); g.fill();
    } else {
      const col = COL[c.s];
      g.fillStyle = lg(g, 0, 0, w, h, [[0, opts.dim ? '#e4dcc4' : '#fffaec'], [1, opts.dim ? '#cfc6aa' : '#f1e6c8']]); g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
      g.fillStyle = 'rgba(140,110,60,.06)'; for (let k = 0; k < 22; k++) g.fillRect(((k * 53) % 97) / 97 * w, ((k * 37) % 89) / 89 * h, 1.5, 1.5);
      g.strokeStyle = opts.sel ? '#ff5a8a' : '#9a8450'; g.lineWidth = opts.sel ? w * 0.06 : w * 0.02; g.beginPath(); g.roundRect(w * 0.015, w * 0.015, w - w * 0.03, h - w * 0.03, r); g.stroke();
      g.strokeStyle = col; g.lineWidth = w * 0.022; g.beginPath(); g.roundRect(w * 0.07, w * 0.07, w * 0.86, h - w * 0.14, r * 0.7); g.stroke(); g.lineWidth = w * 0.01; g.globalAlpha = 0.6; g.beginPath(); g.roundRect(w * 0.1, w * 0.1, w * 0.8, h - w * 0.2, r * 0.5); g.stroke(); g.globalAlpha = 1;
      const ns = NAMES[c.n] || String(c.n);
      g.fillStyle = col; g.font = 'bold ' + (w * 0.22) + 'px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ns, w * 0.2, h * 0.09);
      g.save(); g.translate(w, h); g.rotate(Math.PI); g.fillText(ns, w * 0.2, h * 0.09); g.restore();
      suitSymbol(g, c.s, w * 0.2, h * 0.175, w * 0.055); g.save(); g.translate(w, h); g.rotate(Math.PI); suitSymbol(g, c.s, w * 0.2, h * 0.175, w * 0.055); g.restore();
      const cx = w / 2, cy = h / 2;
      if (c.n <= 7) {
        const pos = { 1: [[0, 0]], 2: [[0, -0.55], [0, 0.55]], 3: [[0, -0.7], [0, 0], [0, 0.7]], 4: [[-0.5, -0.55], [0.5, -0.55], [-0.5, 0.55], [0.5, 0.55]], 5: [[-0.5, -0.6], [0.5, -0.6], [0, 0], [-0.5, 0.6], [0.5, 0.6]], 6: [[-0.5, -0.7], [0.5, -0.7], [-0.5, 0], [0.5, 0], [-0.5, 0.7], [0.5, 0.7]], 7: [[-0.5, -0.78], [0.5, -0.78], [0, -0.38], [-0.5, 0], [0.5, 0], [-0.5, 0.78], [0.5, 0.78]] }[c.n];
        const rr = c.n === 1 ? w * 0.34 : c.n <= 3 ? w * 0.2 : w * 0.15;
        pos.forEach(([px, py]) => { if (c.n > 1 && py > 0) { g.save(); g.translate(cx + px * w * 0.28, cy + py * w * 0.46); g.rotate(c.s === 2 || c.s === 3 ? Math.PI : 0); suitSymbol(g, c.s, 0, 0, rr); g.restore(); } else suitSymbol(g, c.s, cx + px * w * 0.28, cy + py * w * 0.46 - (c.n === 1 ? h * 0.03 : 0), rr); });
      } else {
        // figure alla piacentina: doppia (la meta' alta e la sua copia capovolta), con fondo a righe
        g.save(); g.beginPath(); g.roundRect(w * 0.15, h * 0.17, w * 0.7, h * 0.66, r * 0.5); g.clip();
        g.fillStyle = lg(g, 0, h * 0.17, 0, h * 0.83, [[0, '#f4e8c4'], [0.5, '#e8d6a4'], [1, '#f4e8c4']]); g.fillRect(w * 0.15, h * 0.17, w * 0.7, h * 0.66);
        g.fillStyle = col; g.globalAlpha = 0.09; for (let k = 0; k < 10; k++) g.fillRect(w * 0.15 + k * w * 0.07, h * 0.17, w * 0.035, h * 0.66); g.globalAlpha = 1;
        for (const flip of [false, true]) { g.save(); g.translate(cx, cy); if (flip) g.rotate(Math.PI); figure(g, c.n, col, w, h); g.restore(); }
        g.restore();
        g.strokeStyle = '#5a4020'; g.lineWidth = w * 0.014; g.beginPath(); g.roundRect(w * 0.15, h * 0.17, w * 0.7, h * 0.66, r * 0.5); g.stroke(); g.lineWidth = w * 0.02; g.beginPath(); g.moveTo(w * 0.15, cy); g.lineTo(w * 0.85, cy); g.stroke();
        g.fillStyle = '#f4e8c4'; g.beginPath(); g.arc(cx, cy, w * 0.13, 0, 7); g.fill(); g.stroke(); suitSymbol(g, c.s, cx, cy, w * 0.1);
      }
      if (c.n === 1) {                               // asso: cartiglio col nome del seme
        g.fillStyle = col; g.beginPath(); g.moveTo(w * 0.2, h * 0.8); g.lineTo(w * 0.8, h * 0.8); g.lineTo(w * 0.86, h * 0.845); g.lineTo(w * 0.8, h * 0.89); g.lineTo(w * 0.2, h * 0.89); g.lineTo(w * 0.14, h * 0.845); g.closePath(); g.fill(); g.strokeStyle = '#f2d38a'; g.lineWidth = w * 0.012; g.stroke();
        g.fillStyle = '#fffaec'; g.font = 'bold ' + (w * 0.1) + 'px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SUITS[c.s], w / 2, h * 0.847);
      }
      if (opts.dim) { g.fillStyle = 'rgba(30,20,0,.08)'; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill(); }
    }
    g.restore();
  }
  // Panno verde (o di altro colore) con trama e vignettatura
  function felt(g, W, H, c0, c1) {
    g.fillStyle = rg(g, W / 2, H * 0.45, 20, Math.max(W, H) * 0.75, [[0, c0 || '#2a7a4a'], [1, c1 || '#0c3a22']]); g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 260; i++) g.fillRect(((i * 97) % 331) / 331 * W, ((i * 61) % 487) / 487 * H, 1.4, 1.4);
    g.fillStyle = 'rgba(0,0,0,.03)'; for (let i = 0; i < 200; i++) g.fillRect(((i * 53) % 313) / 313 * W, ((i * 89) % 479) / 479 * H, 1.4, 1.4);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.beginPath(); g.roundRect(10, 10, W - 20, H - 20, 24); g.stroke();
  }
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  window.Cards = { SUITS, COL, deck, shuffle, draw, label, suitSymbol, felt, ease };
})();

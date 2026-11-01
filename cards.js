// Mazzo da 40 carte "all'italiana" (denari, coppe, spade, bastoni), disegnato dal codice: grafica originale.
// Una carta e' { s: seme 0..3, n: 1..10 }  (8 = fante, 9 = cavallo, 10 = re).
(function () {
  const SUITS = ['DENARI', 'COPPE', 'SPADE', 'BASTONI'];
  const COL = ['#c98a12', '#c0334d', '#2a6fb3', '#3f8a3a'];
  const NAMES = { 1: 'A', 8: 'F', 9: 'C', 10: 'R' };
  const deck = () => { const d = []; for (let s = 0; s < 4; s++) for (let n = 1; n <= 10; n++) d.push({ s, n }); return d; };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const label = c => (NAMES[c.n] || c.n) + ' ' + SUITS[c.s][0].toLowerCase() + SUITS[c.s].slice(1);

  function suitSymbol(g, s, cx, cy, r) {
    g.save(); g.translate(cx, cy);
    if (s === 0) {                                   // denaro: moneta
      const gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r); gr.addColorStop(0, '#ffe58a'); gr.addColorStop(1, '#c98a12');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.strokeStyle = '#8a5a08'; g.lineWidth = r * 0.12; g.stroke();
      g.beginPath(); g.arc(0, 0, r * 0.62, 0, 7); g.stroke(); g.fillStyle = '#8a5a08'; for (let k = 0; k < 6; k++) { const a = k * 1.047; g.beginPath(); g.arc(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, r * 0.09, 0, 7); g.fill(); }
    } else if (s === 1) {                            // coppa
      g.fillStyle = '#c0334d'; g.beginPath(); g.moveTo(-r * 0.8, -r * 0.8); g.lineTo(r * 0.8, -r * 0.8); g.quadraticCurveTo(r * 0.8, r * 0.2, 0, r * 0.35); g.quadraticCurveTo(-r * 0.8, r * 0.2, -r * 0.8, -r * 0.8); g.fill();
      g.fillRect(-r * 0.09, r * 0.3, r * 0.18, r * 0.4); g.beginPath(); g.ellipse(0, r * 0.82, r * 0.5, r * 0.14, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(-r * 0.55, -r * 0.65, r * 0.18, r * 0.5); g.strokeStyle = '#7a1428'; g.lineWidth = r * 0.1; g.beginPath(); g.moveTo(-r * 0.8, -r * 0.8); g.lineTo(r * 0.8, -r * 0.8); g.stroke();
    } else if (s === 2) {                            // spada
      g.rotate(-0.35); g.fillStyle = '#9fb4cc'; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.2, r * 0.25); g.lineTo(-r * 0.2, r * 0.25); g.closePath(); g.fill(); g.fillStyle = '#e8eef6'; g.fillRect(-r * 0.04, -r * 0.9, r * 0.08, r * 1.1);
      g.fillStyle = '#2a6fb3'; g.fillRect(-r * 0.55, r * 0.25, r * 1.1, r * 0.16); g.fillStyle = '#5a3a1a'; g.fillRect(-r * 0.09, r * 0.4, r * 0.18, r * 0.45); g.fillStyle = '#c98a12'; g.beginPath(); g.arc(0, r * 0.92, r * 0.13, 0, 7); g.fill();
    } else {                                         // bastone
      g.rotate(0.45); const gr = g.createLinearGradient(-r * 0.2, 0, r * 0.2, 0); gr.addColorStop(0, '#8a5a2a'); gr.addColorStop(0.5, '#c28a4a'); gr.addColorStop(1, '#6a4018');
      g.fillStyle = gr; g.beginPath(); g.moveTo(-r * 0.16, r); g.lineTo(-r * 0.3, -r * 0.55); g.quadraticCurveTo(0, -r * 1.15, r * 0.3, -r * 0.55); g.lineTo(r * 0.16, r); g.closePath(); g.fill();
      g.fillStyle = '#3f8a3a'; g.beginPath(); g.ellipse(r * 0.28, -r * 0.1, r * 0.22, r * 0.1, -0.6, 0, 7); g.ellipse(-r * 0.28, r * 0.3, r * 0.22, r * 0.1, 0.6, 0, 7); g.fill();
    }
    g.restore();
  }
  // Disegna una carta con l'angolo in alto a sinistra in (x, y), larghezza w (altezza = 1.5 w).
  function draw(g, c, x, y, w, opts) {
    opts = opts || {}; const h = w * 1.5, r = w * 0.1;
    g.save(); g.translate(x, y);
    if (opts.angle) { g.translate(w / 2, h / 2); g.rotate(opts.angle); g.translate(-w / 2, -h / 2); }
    g.fillStyle = 'rgba(0,0,0,' + (opts.lift ? 0.35 : 0.25) + ')'; g.beginPath(); g.roundRect(w * 0.05, h * 0.04 + (opts.lift ? w * 0.06 : 0), w, h, r); g.fill();
    if (!c || opts.back) {
      const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#8a1c3a'); bg.addColorStop(1, '#4a0f28'); g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
      g.strokeStyle = '#f2d38a'; g.lineWidth = w * 0.04; g.beginPath(); g.roundRect(w * 0.08, w * 0.08, w * 0.84, h - w * 0.16, r * 0.6); g.stroke();
      g.save(); g.beginPath(); g.roundRect(w * 0.08, w * 0.08, w * 0.84, h - w * 0.16, r * 0.6); g.clip(); g.strokeStyle = 'rgba(242,211,138,.5)'; g.lineWidth = 1; for (let i = -h; i < w + h; i += w * 0.2) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); } g.restore(); g.fillStyle = '#f2d38a'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.14, 0, 7); g.fill();
    } else {
      g.fillStyle = opts.dim ? '#d8d0bc' : '#fbf5e4'; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
      g.strokeStyle = opts.sel ? '#ff5a8a' : '#a89870'; g.lineWidth = opts.sel ? w * 0.06 : w * 0.025; g.beginPath(); g.roundRect(w * 0.02, w * 0.02, w - w * 0.04, h - w * 0.04, r); g.stroke();
      const col = COL[c.s], ns = NAMES[c.n] || String(c.n);
      g.fillStyle = col; g.font = 'bold ' + (w * 0.26) + 'px ui-monospace, Menlo, monospace'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(ns, w * 0.1, w * 0.07);
      g.save(); g.translate(w, h); g.rotate(Math.PI); g.fillText(ns, w * 0.1, w * 0.07); g.restore();
      const cx = w / 2, cy = h / 2;
      if (c.n <= 7) {
        const pos = { 1: [[0, 0]], 2: [[0, -0.55], [0, 0.55]], 3: [[0, -0.7], [0, 0], [0, 0.7]], 4: [[-0.5, -0.55], [0.5, -0.55], [-0.5, 0.55], [0.5, 0.55]], 5: [[-0.5, -0.6], [0.5, -0.6], [0, 0], [-0.5, 0.6], [0.5, 0.6]], 6: [[-0.5, -0.7], [0.5, -0.7], [-0.5, 0], [0.5, 0], [-0.5, 0.7], [0.5, 0.7]], 7: [[-0.5, -0.78], [0.5, -0.78], [0, -0.38], [-0.5, 0], [0.5, 0], [-0.5, 0.78], [0.5, 0.78]] }[c.n];
        const rr = c.n === 1 ? w * 0.34 : c.n <= 3 ? w * 0.2 : w * 0.15;
        pos.forEach(([px, py]) => suitSymbol(g, c.s, cx + px * w * 0.28, cy + py * w * 0.46, rr));
      } else {
        g.fillStyle = 'rgba(0,0,0,.05)'; g.beginPath(); g.roundRect(w * 0.16, h * 0.2, w * 0.68, h * 0.6, r); g.fill();
        // figura stilizzata: fante, cavallo, re
        g.save(); g.translate(cx, cy - h * 0.02);
        g.fillStyle = col;
        if (c.n === 10) { g.beginPath(); g.moveTo(-w * 0.26, -h * 0.2); g.lineTo(-w * 0.2, -h * 0.3); g.lineTo(-w * 0.1, -h * 0.22); g.lineTo(0, -h * 0.32); g.lineTo(w * 0.1, -h * 0.22); g.lineTo(w * 0.2, -h * 0.3); g.lineTo(w * 0.26, -h * 0.2); g.closePath(); g.fill(); g.fillStyle = '#f0c39a'; g.beginPath(); g.arc(0, -h * 0.08, w * 0.15, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(-w * 0.3, h * 0.28); g.quadraticCurveTo(0, h * 0.0, w * 0.3, h * 0.28); g.closePath(); g.fill(); }
        else if (c.n === 9) { g.beginPath(); g.moveTo(-w * 0.28, h * 0.25); g.quadraticCurveTo(-w * 0.28, -h * 0.05, -w * 0.05, -h * 0.12); g.lineTo(w * 0.04, -h * 0.28); g.lineTo(w * 0.15, -h * 0.12); g.quadraticCurveTo(w * 0.3, -h * 0.05, w * 0.28, h * 0.25); g.closePath(); g.fill(); g.fillStyle = '#fbf5e4'; g.beginPath(); g.arc(w * 0.08, -h * 0.1, w * 0.025, 0, 7); g.fill(); }
        else { g.fillStyle = '#f0c39a'; g.beginPath(); g.arc(0, -h * 0.12, w * 0.14, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(-w * 0.18, -h * 0.17); g.quadraticCurveTo(0, -h * 0.34, w * 0.2, -h * 0.15); g.lineTo(w * 0.08, -h * 0.1); g.closePath(); g.fill(); g.beginPath(); g.moveTo(-w * 0.26, h * 0.28); g.quadraticCurveTo(0, h * 0.0, w * 0.26, h * 0.28); g.closePath(); g.fill(); }
        g.restore(); suitSymbol(g, c.s, cx, cy + h * 0.27, w * 0.13);
      }
    }
    g.restore();
  }
  window.Cards = { SUITS, COL, deck, shuffle, draw, label, suitSymbol };
})();

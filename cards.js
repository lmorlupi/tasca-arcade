// Mazzo da 40 carte "all'italiana" in stile popolare (denari, coppe, spade, bastoni): carta bianca, contorni neri, colori pieni.
// Disegnato interamente dal codice: grafica originale, ispirata allo stile dei mazzi regionali ma non copiata da nessun mazzo.
// Una carta e' { s: seme 0..3, n: 1..10 }  (8 = fante, 9 = cavallo, 10 = re).
(function () {
  const SUITS = ['DENARI', 'COPPE', 'SPADE', 'BASTONI'];
  const COL = ['#b8860b', '#a82a3a', '#2a5fa8', '#2f7a3a'];            // colore del seme per numeri e cartigli
  const NAMES = { 1: 'A', 8: 'F', 9: 'C', 10: 'R' };
  const R_ = '#d9322a', G_ = '#2f7a3a', Y_ = '#f2c21a', B_ = '#2a5fa8', K_ = '#1a1208', SK = '#f0b890', W_ = '#fffefa';
  const deck = () => { const d = []; for (let s = 0; s < 4; s++) for (let n = 1; n <= 10; n++) d.push({ s, n }); return d; };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const label = c => (NAMES[c.n] || c.n) + ' ' + SUITS[c.s][0].toLowerCase() + SUITS[c.s].slice(1);
  const lg = (g, x0, y0, x1, y1, stops) => { const k = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => k.addColorStop(o, c)); return k; };
  const ink = (g, w) => { g.strokeStyle = K_; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; };

  // ---- semi (centrati in cx, cy; r = raggio)
  function suitSymbol(g, s, cx, cy, r, big) {
    g.save(); g.translate(cx, cy); ink(g, Math.max(0.8, r * 0.07));
    if (s === 0) {                                   // denaro: disco con anello di perline e volto rosso
      g.fillStyle = Y_; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#b57d00'; for (let k = 0; k < 22; k++) { const a = k / 22 * 6.283; g.beginPath(); g.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.055, 0, 7); g.fill(); }
      g.fillStyle = Y_; g.beginPath(); g.arc(0, 0, r * 0.74, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#b57d00'; for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283 + 0.2; g.beginPath(); g.arc(Math.cos(a) * r * 0.64, Math.sin(a) * r * 0.64, r * 0.05, 0, 7); g.fill(); }
      g.fillStyle = R_; g.beginPath(); g.arc(0, 0, r * 0.55, 0, 7); g.fill(); g.stroke();
      g.fillStyle = K_; g.beginPath(); g.ellipse(-r * 0.19, -r * 0.1, r * 0.07, r * 0.05, 0, 0, 7); g.ellipse(r * 0.19, -r * 0.1, r * 0.07, r * 0.05, 0, 0, 7); g.fill();
      g.lineWidth = r * 0.05; g.beginPath(); g.moveTo(0, -r * 0.08); g.quadraticCurveTo(-r * 0.09, r * 0.08, 0, r * 0.12); g.stroke(); g.beginPath(); g.arc(0, r * 0.08, r * 0.27, 0.35, 2.8); g.stroke();
      g.fillStyle = '#a81c14'; g.beginPath(); g.arc(-r * 0.3, r * 0.1, r * 0.07, 0, 7); g.arc(r * 0.3, r * 0.1, r * 0.07, 0, 7); g.fill();
    } else if (s === 1) {                            // coppa: calice verde e oro con l'interno rosso
      g.fillStyle = G_; g.beginPath(); g.moveTo(-r * 0.78, -r * 0.62); g.quadraticCurveTo(-r * 0.86, r * 0.25, -r * 0.2, r * 0.36); g.lineTo(r * 0.2, r * 0.36); g.quadraticCurveTo(r * 0.86, r * 0.25, r * 0.78, -r * 0.62); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = R_; g.beginPath(); g.ellipse(0, -r * 0.62, r * 0.78, r * 0.2, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = Y_; g.beginPath(); g.moveTo(-r * 0.82, -r * 0.16); g.quadraticCurveTo(0, r * 0.06, r * 0.82, -r * 0.16); g.lineTo(r * 0.8, r * 0.04); g.quadraticCurveTo(0, r * 0.26, -r * 0.8, r * 0.04); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = Y_; g.beginPath(); g.ellipse(0, r * 0.4, r * 0.22, r * 0.11, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = G_; g.beginPath(); g.moveTo(-r * 0.1, r * 0.46); g.lineTo(-r * 0.07, r * 0.76); g.lineTo(r * 0.07, r * 0.76); g.lineTo(r * 0.1, r * 0.46); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = Y_; g.beginPath(); g.moveTo(-r * 0.58, r * 0.96); g.quadraticCurveTo(-r * 0.4, r * 0.7, 0, r * 0.7); g.quadraticCurveTo(r * 0.4, r * 0.7, r * 0.58, r * 0.96); g.closePath(); g.fill(); g.stroke(); g.fillStyle = G_; g.fillRect(-r * 0.4, r * 0.86, r * 0.8, r * 0.07);
    } else if (s === 2) {                            // spada dritta: lama blu, elsa dorata
      g.fillStyle = B_; g.beginPath(); g.moveTo(0, -r * 1.05); g.lineTo(r * 0.14, -r * 0.8); g.lineTo(r * 0.14, r * 0.22); g.lineTo(-r * 0.14, r * 0.22); g.lineTo(-r * 0.14, -r * 0.8); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#6aa0e0'; g.fillRect(-r * 0.04, -r * 0.85, r * 0.08, r * 1.0);
      g.fillStyle = Y_; g.beginPath(); g.moveTo(-r * 0.62, r * 0.34); g.quadraticCurveTo(-r * 0.7, r * 0.12, -r * 0.4, r * 0.2); g.lineTo(r * 0.4, r * 0.2); g.quadraticCurveTo(r * 0.7, r * 0.12, r * 0.62, r * 0.34); g.quadraticCurveTo(r * 0.3, r * 0.38, 0, r * 0.46); g.quadraticCurveTo(-r * 0.3, r * 0.38, -r * 0.62, r * 0.34); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = R_; g.beginPath(); g.arc(0, r * 0.3, r * 0.07, 0, 7); g.fill();
      g.fillStyle = '#8a1c14'; g.beginPath(); g.roundRect(-r * 0.09, r * 0.44, r * 0.18, r * 0.42, r * 0.04); g.fill(); g.stroke(); g.fillStyle = Y_; g.fillRect(-r * 0.1, r * 0.55, r * 0.2, r * 0.05); g.fillRect(-r * 0.1, r * 0.7, r * 0.2, r * 0.05);
      g.fillStyle = Y_; g.beginPath(); g.arc(0, r * 0.96, r * 0.13, 0, 7); g.fill(); g.stroke();
    } else {                                         // bastone: tronco verde con le sezioni rosse
      g.rotate(0.28);
      g.fillStyle = G_; g.beginPath(); g.moveTo(-r * 0.2, r * 1.0); g.lineTo(-r * 0.3, -r * 0.7); g.lineTo(r * 0.3, -r * 0.7); g.lineTo(r * 0.2, r * 1.0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#7ac24a'; g.beginPath(); g.moveTo(-r * 0.14, r * 0.9); g.lineTo(-r * 0.2, -r * 0.6); g.lineTo(-r * 0.08, -r * 0.6); g.lineTo(-r * 0.03, r * 0.9); g.closePath(); g.fill();
      g.strokeStyle = '#17401b'; g.lineWidth = r * 0.035; for (const y of [-0.2, 0.2, 0.6]) { g.beginPath(); g.moveTo(-r * 0.22, r * y); g.lineTo(r * 0.2, r * (y + 0.05)); g.stroke(); } ink(g, Math.max(0.8, r * 0.07));
      g.fillStyle = '#f0802a'; g.beginPath(); g.ellipse(0, -r * 0.7, r * 0.3, r * 0.14, 0, 0, 7); g.fill(); g.stroke(); g.strokeStyle = '#a8480a'; g.lineWidth = r * 0.03; g.beginPath(); g.ellipse(0, -r * 0.7, r * 0.18, r * 0.08, 0, 0, 7); g.stroke(); ink(g, Math.max(0.8, r * 0.07));
      g.fillStyle = G_; g.beginPath(); g.moveTo(r * 0.24, -r * 0.1); g.lineTo(r * 0.56, -r * 0.3); g.lineTo(r * 0.5, -r * 0.05); g.lineTo(r * 0.24, r * 0.1); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#f0802a'; g.beginPath(); g.ellipse(r * 0.55, -r * 0.18, r * 0.07, r * 0.14, 0, 0, 7); g.fill(); g.stroke();
    }
    g.restore();
  }

  // ---- assi: composizioni grandi
  function ace(g, s, w, h) {
    g.save(); ink(g, w * 0.012);
    if (s === 0) {                                   // aquila coronata che regge il denaro
      g.fillStyle = '#a8481c'; g.beginPath(); g.moveTo(0, -h * 0.2); g.quadraticCurveTo(-w * 0.45, -h * 0.28, -w * 0.4, h * 0.1); g.quadraticCurveTo(-w * 0.3, h * 0.0, -w * 0.18, h * 0.05); g.lineTo(-w * 0.2, h * 0.28); g.lineTo(w * 0.2, h * 0.28); g.lineTo(w * 0.18, h * 0.05); g.quadraticCurveTo(w * 0.3, h * 0.0, w * 0.4, h * 0.1); g.quadraticCurveTo(w * 0.45, -h * 0.28, 0, -h * 0.2); g.fill(); g.stroke();
      g.strokeStyle = '#6a2a0a'; g.lineWidth = w * 0.01; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-w * 0.36 + k * w * 0.02, h * 0.06 - k * h * 0.05); g.quadraticCurveTo(-w * 0.28, h * 0.02 - k * h * 0.045, -w * 0.2, h * 0.04 - k * h * 0.02); g.stroke(); g.beginPath(); g.moveTo(w * 0.36 - k * w * 0.02, h * 0.06 - k * h * 0.05); g.quadraticCurveTo(w * 0.28, h * 0.02 - k * h * 0.045, w * 0.2, h * 0.04 - k * h * 0.02); g.stroke(); } ink(g, w * 0.012);
      g.fillStyle = '#a8481c'; g.beginPath(); g.ellipse(0, -h * 0.17, w * 0.1, w * 0.11, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = Y_; g.beginPath(); g.moveTo(w * 0.04, -h * 0.18); g.lineTo(w * 0.16, -h * 0.15); g.lineTo(w * 0.05, -h * 0.13); g.closePath(); g.fill(); g.stroke(); g.fillStyle = K_; g.beginPath(); g.arc(-w * 0.0, -h * 0.185, w * 0.012, 0, 7); g.fill();
      g.fillStyle = Y_; g.beginPath(); g.moveTo(-w * 0.09, -h * 0.26); g.lineTo(-w * 0.09, -h * 0.31); g.lineTo(-w * 0.045, -h * 0.28); g.lineTo(0, -h * 0.32); g.lineTo(w * 0.045, -h * 0.28); g.lineTo(w * 0.09, -h * 0.31); g.lineTo(w * 0.09, -h * 0.26); g.closePath(); g.fill(); g.stroke();
      suitSymbol(g, 0, 0, h * 0.04, w * 0.27); g.fillStyle = Y_; for (const dx of [-1, 1]) { g.beginPath(); g.moveTo(dx * w * 0.12, h * 0.27); g.lineTo(dx * w * 0.2, h * 0.31); g.lineTo(dx * w * 0.05, h * 0.31); g.closePath(); g.fill(); g.stroke(); }
    } else if (s === 1) {                            // coppa decorata con coperchio e base a gradini
      g.fillStyle = Y_; g.beginPath(); g.moveTo(-w * 0.34, h * 0.3); g.lineTo(-w * 0.22, h * 0.2); g.lineTo(w * 0.22, h * 0.2); g.lineTo(w * 0.34, h * 0.3); g.closePath(); g.fill(); g.stroke(); g.fillStyle = G_; g.fillRect(-w * 0.28, h * 0.255, w * 0.56, h * 0.025);
      g.fillStyle = R_; for (const dx of [-0.28, -0.14, 0, 0.14, 0.28]) { g.beginPath(); g.arc(w * dx, h * 0.31, w * 0.025, 0, 7); g.fill(); g.stroke(); }
      g.fillStyle = G_; g.beginPath(); g.moveTo(-w * 0.07, h * 0.2); g.lineTo(-w * 0.05, h * 0.08); g.lineTo(w * 0.05, h * 0.08); g.lineTo(w * 0.07, h * 0.2); g.closePath(); g.fill(); g.stroke(); g.fillStyle = R_; g.beginPath(); g.arc(0, h * 0.14, w * 0.04, 0, 7); g.fill(); g.stroke();
      g.fillStyle = G_; g.beginPath(); g.moveTo(-w * 0.3, -h * 0.1); g.quadraticCurveTo(-w * 0.34, h * 0.08, -w * 0.08, h * 0.1); g.lineTo(w * 0.08, h * 0.1); g.quadraticCurveTo(w * 0.34, h * 0.08, w * 0.3, -h * 0.1); g.closePath(); g.fill(); g.stroke(); g.fillStyle = Y_; g.beginPath(); g.moveTo(-w * 0.31, -h * 0.02); g.quadraticCurveTo(0, h * 0.06, w * 0.31, -h * 0.02); g.lineTo(w * 0.3, h * 0.03); g.quadraticCurveTo(0, h * 0.11, -w * 0.3, h * 0.03); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = R_; g.beginPath(); g.moveTo(-w * 0.28, -h * 0.1); g.quadraticCurveTo(0, -h * 0.17, w * 0.28, -h * 0.1); g.quadraticCurveTo(0, -h * 0.05, -w * 0.28, -h * 0.1); g.fill(); g.stroke();
      g.fillStyle = G_; g.beginPath(); g.moveTo(-w * 0.24, -h * 0.12); g.quadraticCurveTo(-w * 0.22, -h * 0.24, 0, -h * 0.26); g.quadraticCurveTo(w * 0.22, -h * 0.24, w * 0.24, -h * 0.12); g.quadraticCurveTo(0, -h * 0.17, -w * 0.24, -h * 0.12); g.fill(); g.stroke(); g.fillStyle = Y_; g.fillRect(-w * 0.03, -h * 0.34, w * 0.06, h * 0.08); g.strokeRect(-w * 0.03, -h * 0.34, w * 0.06, h * 0.08); g.fillStyle = R_; g.beginPath(); g.arc(0, -h * 0.36, w * 0.035, 0, 7); g.fill(); g.stroke();
    } else if (s === 2) {                            // spada con ghirlanda di alloro e rose
      g.strokeStyle = '#1f5a28'; g.lineWidth = w * 0.06; g.beginPath(); g.moveTo(-w * 0.28, h * 0.3); g.quadraticCurveTo(-w * 0.45, -h * 0.1, -w * 0.12, -h * 0.3); g.quadraticCurveTo(w * 0.15, -h * 0.38, w * 0.3, -h * 0.2); g.stroke(); ink(g, w * 0.012);
      g.fillStyle = G_; for (let k = 0; k < 14; k++) { const t = k / 13, x = -w * 0.28 + (-w * 0.17 * Math.sin(t * 3.14) + t * w * 0.5) * 0.9, y = h * 0.3 - t * h * 0.5 - Math.sin(t * 3.14) * h * 0.18; g.beginPath(); g.ellipse(x, y, w * 0.045, w * 0.02, t * 5, 0, 7); g.fill(); g.stroke(); }
      g.fillStyle = R_; for (const [x, y] of [[-w * 0.36, h * 0.04], [-w * 0.25, -h * 0.2], [w * 0.2, -h * 0.34]]) { g.beginPath(); g.arc(x, y, w * 0.045, 0, 7); g.fill(); g.stroke(); }
      g.save(); g.rotate(-0.3); suitSymbol(g, 2, 0, 0, w * 0.4); g.restore();
    } else {                                         // tronco con rosa e foglie
      g.fillStyle = '#c8861e'; g.fillRect(-w * 0.34, h * 0.31, w * 0.68, h * 0.025);
      g.save(); g.translate(0, h * 0.02); g.scale(1.9, 1.9); suitSymbol(g, 3, 0, 0, w * 0.18); g.restore();
      g.fillStyle = R_; g.beginPath(); g.arc(-w * 0.2, h * 0.27, w * 0.06, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#a81c14'; g.beginPath(); g.arc(-w * 0.2, h * 0.27, w * 0.03, 0, 7); g.fill();
      g.fillStyle = G_; for (const [x, y, a] of [[-w * 0.3, h * 0.25, -0.6], [-w * 0.1, h * 0.28, 0.5], [w * 0.25, h * 0.18, -0.2]]) { g.beginPath(); g.ellipse(x, y, w * 0.07, w * 0.03, a, 0, 7); g.fill(); g.stroke(); }
    }
    g.restore();
  }

  // ---- figure a mezzo busto (la meta' alta; l'altra e' la stessa capovolta)
  function figure(g, n, s, w, h) {
    ink(g, w * 0.012); g.lineJoin = 'round';
    const item = (x, y, k) => suitSymbol(g, s, x, y, w * 0.09 * (k || 1));
    const face = (cx, cy, r, mustache) => { g.fillStyle = SK; g.beginPath(); g.ellipse(cx, cy, r * 0.82, r, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = K_; g.beginPath(); g.ellipse(cx - r * 0.32, cy - r * 0.12, r * 0.09, r * 0.06, 0, 0, 7); g.ellipse(cx + r * 0.32, cy - r * 0.12, r * 0.09, r * 0.06, 0, 0, 7); g.fill(); g.lineWidth = w * 0.008; g.beginPath(); g.moveTo(cx, cy - r * 0.06); g.lineTo(cx - r * 0.08, cy + r * 0.2); g.lineTo(cx + r * 0.04, cy + r * 0.2); g.stroke(); g.beginPath(); g.arc(cx, cy + r * 0.35, r * 0.18, 0.3, 2.8); g.stroke(); g.lineWidth = w * 0.012; if (mustache) { g.fillStyle = K_; g.beginPath(); g.moveTo(cx - r * 0.55, cy + r * 0.3); g.quadraticCurveTo(cx - r * 0.1, cy + r * 0.05, cx, cy + r * 0.28); g.quadraticCurveTo(cx + r * 0.1, cy + r * 0.05, cx + r * 0.55, cy + r * 0.3); g.quadraticCurveTo(cx, cy + r * 0.42, cx - r * 0.55, cy + r * 0.3); g.fill(); } };
    const feather = (x, y, a, c, L) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a - 0.5) * L, y + Math.sin(a - 0.5) * L, x + Math.cos(a) * L * 1.1, y + Math.sin(a) * L * 1.1); g.quadraticCurveTo(x + Math.cos(a + 0.5) * L, y + Math.sin(a + 0.5) * L, x, y); g.fill(); g.stroke(); };
    const tunic = (top, c1, c2) => { g.fillStyle = c1; g.beginPath(); g.moveTo(-w * 0.34, 0); g.quadraticCurveTo(-w * 0.34, top + h * 0.04, -w * 0.13, top); g.lineTo(w * 0.13, top); g.quadraticCurveTo(w * 0.34, top + h * 0.04, w * 0.34, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = c2; g.beginPath(); g.moveTo(-w * 0.24, top + h * 0.03); g.lineTo(-w * 0.1, top + h * 0.004); g.lineTo(w * 0.24, 0 - h * 0.0); g.lineTo(w * 0.1, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = Y_; for (let k = -2; k <= 2; k++) { g.beginPath(); g.arc(k * w * 0.11, top + h * 0.045, w * 0.014, 0, 7); g.fill(); } };
    if (n === 8) {                                   // fante: berretto con piume, giubba rossa con fascia verde
      tunic(-h * 0.1, R_, G_); face(0, -h * 0.17, w * 0.13, false);
      g.fillStyle = '#7a3a14'; g.beginPath(); g.moveTo(-w * 0.12, -h * 0.2); g.quadraticCurveTo(-w * 0.15, -h * 0.1, -w * 0.1, -h * 0.07); g.lineTo(-w * 0.11, -h * 0.2); g.fill();
      g.fillStyle = Y_; g.beginPath(); g.moveTo(-w * 0.16, -h * 0.215); g.quadraticCurveTo(0, -h * 0.34, w * 0.16, -h * 0.215); g.quadraticCurveTo(0, -h * 0.25, -w * 0.16, -h * 0.215); g.fill(); g.stroke(); g.fillStyle = R_; g.beginPath(); g.ellipse(0, -h * 0.26, w * 0.13, h * 0.04, 0, 0, 7); g.fill(); g.stroke();
      feather(w * 0.1, -h * 0.28, -0.4, B_, w * 0.18); feather(w * 0.06, -h * 0.29, -1.0, Y_, w * 0.14); feather(w * 0.0, -h * 0.3, -1.4, R_, w * 0.12);
      item(-w * 0.28, -h * 0.05, 1.0);
    } else if (n === 9) {                            // cavallo: cavaliere blu su cavallo bianco con briglie
      g.fillStyle = '#f4f4f8'; g.beginPath(); g.moveTo(-w * 0.34, 0); g.quadraticCurveTo(-w * 0.36, -h * 0.12, -w * 0.18, -h * 0.17); g.quadraticCurveTo(-w * 0.1, -h * 0.34, w * 0.06, -h * 0.34); g.quadraticCurveTo(w * 0.22, -h * 0.32, w * 0.33, -h * 0.2); g.lineTo(w * 0.36, -h * 0.14); g.quadraticCurveTo(w * 0.3, -h * 0.1, w * 0.2, -h * 0.12); g.quadraticCurveTo(w * 0.16, -h * 0.08, w * 0.12, 0); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#d8d8e4'; g.beginPath(); g.moveTo(-w * 0.12, -h * 0.28); g.quadraticCurveTo(-w * 0.22, -h * 0.2, -w * 0.18, -h * 0.1); g.lineTo(-w * 0.1, -h * 0.17); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = K_; g.beginPath(); g.arc(w * 0.2, -h * 0.25, w * 0.014, 0, 7); g.fill(); g.strokeStyle = R_; g.lineWidth = w * 0.02; g.beginPath(); g.moveTo(w * 0.1, -h * 0.34); g.lineTo(w * 0.22, -h * 0.18); g.lineTo(w * 0.34, -h * 0.17); g.stroke(); ink(g, w * 0.012);
      g.fillStyle = B_; g.beginPath(); g.moveTo(-w * 0.3, 0); g.quadraticCurveTo(-w * 0.3, -h * 0.1, -w * 0.12, -h * 0.12); g.lineTo(w * 0.04, -h * 0.12); g.quadraticCurveTo(w * 0.06, -h * 0.06, w * 0.08, 0); g.closePath(); g.fill(); g.stroke();
      face(-w * 0.12, -h * 0.2, w * 0.1, true); g.fillStyle = R_; g.beginPath(); g.moveTo(-w * 0.24, -h * 0.225); g.quadraticCurveTo(-w * 0.12, -h * 0.34, 0, -h * 0.225); g.closePath(); g.fill(); g.stroke();
      feather(-w * 0.06, -h * 0.3, -0.5, Y_, w * 0.15); feather(-w * 0.12, -h * 0.32, -1.1, B_, w * 0.13); item(w * 0.06, -h * 0.4, 0.8);
    } else {                                         // re: corona, ermellino e scettro
      tunic(-h * 0.1, R_, Y_); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-w * 0.3, -h * 0.02); g.quadraticCurveTo(-w * 0.2, -h * 0.13, 0, -h * 0.11); g.quadraticCurveTo(w * 0.2, -h * 0.13, w * 0.3, -h * 0.02); g.lineTo(w * 0.22, h * 0.0); g.quadraticCurveTo(0, -h * 0.07, -w * 0.22, h * 0.0); g.closePath(); g.fill(); g.stroke(); g.fillStyle = K_; for (const x of [-0.2, -0.1, 0.1, 0.2]) g.fillRect(w * x, -h * 0.07, w * 0.012, h * 0.015);
      face(0, -h * 0.19, w * 0.14, true); g.fillStyle = '#e8e0d0'; g.beginPath(); g.moveTo(-w * 0.12, -h * 0.16); g.quadraticCurveTo(0, -h * 0.06, w * 0.12, -h * 0.16); g.quadraticCurveTo(0, -h * 0.1, -w * 0.12, -h * 0.16); g.fill(); g.stroke();
      g.fillStyle = Y_; g.beginPath(); g.moveTo(-w * 0.15, -h * 0.28); g.lineTo(-w * 0.17, -h * 0.39); g.lineTo(-w * 0.08, -h * 0.33); g.lineTo(0, -h * 0.42); g.lineTo(w * 0.08, -h * 0.33); g.lineTo(w * 0.17, -h * 0.39); g.lineTo(w * 0.15, -h * 0.28); g.closePath(); g.fill(); g.stroke(); g.fillStyle = R_; for (const [x, y] of [[-0.17, -0.39], [0, -0.42], [0.17, -0.39]]) { g.beginPath(); g.arc(w * x, h * y, w * 0.02, 0, 7); g.fill(); g.stroke(); }
      g.strokeStyle = '#8a5a0a'; g.lineWidth = w * 0.03; g.beginPath(); g.moveTo(w * 0.3, 0); g.lineTo(w * 0.28, -h * 0.3); g.stroke(); ink(g, w * 0.012); item(w * 0.28, -h * 0.33, 0.9);
    }
  }

  // Disegna una carta con l'angolo in alto a sinistra in (x, y), larghezza w (altezza = 1.5 w).
  // opts: back, sel, lift, dim, angle, air (0-1: quanto è sollevata, l'ombra si allarga), sx (larghezza per girarla)
  function draw(g, c, x, y, w, opts) {
    opts = opts || {}; const h = w * 1.5, r = w * 0.09;
    g.save(); g.translate(x, y);
    if (opts.angle) { g.translate(w / 2, h / 2); g.rotate(opts.angle); g.translate(-w / 2, -h / 2); }
    if (opts.sx != null && opts.sx < 1) { g.translate(w / 2, 0); g.scale(Math.max(0.04, opts.sx), 1); g.translate(-w / 2, 0); }
    // Ombra morbida: tre strati, più larga e più lontana quando la carta è sollevata.
    const air = opts.air != null ? opts.air : opts.lift ? 0.6 : 0, ox = w * (0.03 + 0.07 * air), oy = w * (0.05 + 0.16 * air);
    [[0, 0.2], [0.035, 0.1], [0.07, 0.05]].forEach(([s, a]) => {
      const e = w * s * (1 + air); g.fillStyle = 'rgba(0,0,0,' + a * (1 - 0.35 * air) + ')';
      g.beginPath(); g.roundRect(ox - e, oy - e, w + 2 * e, h + 2 * e, r + e); g.fill();
    });
    if (!c || opts.back) {
      g.fillStyle = lg(g, 0, 0, w, h, [[0, '#2a5fa8'], [1, '#17386a']]); g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
      g.fillStyle = W_; g.beginPath(); g.roundRect(w * 0.05, w * 0.05, w * 0.9, h - w * 0.1, r * 0.8); g.fill();
      g.fillStyle = lg(g, 0, 0, w, h, [[0, '#d9322a'], [1, '#8a1c14']]); g.beginPath(); g.roundRect(w * 0.1, w * 0.1, w * 0.8, h - w * 0.2, r * 0.6); g.fill();
      g.save(); g.beginPath(); g.roundRect(w * 0.1, w * 0.1, w * 0.8, h - w * 0.2, r * 0.6); g.clip();
      g.strokeStyle = 'rgba(255,230,160,.55)'; g.lineWidth = 1; const st = w * 0.18;
      for (let i = -h; i < w + h; i += st) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); g.beginPath(); g.moveTo(i + h, 0); g.lineTo(i, h); g.stroke(); }
      g.restore();
      const cx = w / 2, cy = h / 2; g.fillStyle = W_; g.beginPath(); g.arc(cx, cy, w * 0.24, 0, 7); g.fill(); g.strokeStyle = K_; g.lineWidth = w * 0.015; g.stroke();
      suitSymbol(g, 0, cx, cy, w * 0.19);
    } else {
      const col = COL[c.s];
      g.fillStyle = opts.dim ? '#e6e0cc' : W_; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill();
      g.strokeStyle = opts.sel ? '#ff5a8a' : '#6a6050'; g.lineWidth = opts.sel ? w * 0.06 : w * 0.018; g.beginPath(); g.roundRect(w * 0.012, w * 0.012, w - w * 0.024, h - w * 0.024, r); g.stroke();
      g.strokeStyle = K_; g.lineWidth = w * 0.012; g.beginPath(); g.roundRect(w * 0.07, w * 0.07, w * 0.86, h - w * 0.14, r * 0.35); g.stroke();
      const ns = NAMES[c.n] || String(c.n);
      g.fillStyle = col; g.font = 'bold ' + (w * 0.17) + 'px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ns, w * 0.17, h * 0.07);
      g.save(); g.translate(w, h); g.rotate(Math.PI); g.fillText(ns, w * 0.17, h * 0.07); g.restore();
      const cx = w / 2, cy = h / 2;
      if (c.n === 1) { g.save(); g.translate(cx, cy); ace(g, c.s, w, h); g.restore(); g.fillStyle = col; g.beginPath(); g.moveTo(w * 0.2, h * 0.82); g.lineTo(w * 0.8, h * 0.82); g.lineTo(w * 0.86, h * 0.855); g.lineTo(w * 0.8, h * 0.89); g.lineTo(w * 0.2, h * 0.89); g.lineTo(w * 0.14, h * 0.855); g.closePath(); g.fill(); g.strokeStyle = K_; g.lineWidth = w * 0.01; g.stroke(); g.fillStyle = W_; g.font = 'bold ' + (w * 0.09) + 'px ui-monospace, Menlo, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(SUITS[c.s], w / 2, h * 0.857); }
      else if (c.n <= 7) {
        const pos = { 2: [[0, -0.55], [0, 0.55]], 3: [[-0.4, -0.7], [0.4, 0], [-0.4, 0.7]], 4: [[-0.45, -0.55], [0.45, -0.55], [-0.45, 0.55], [0.45, 0.55]], 5: [[-0.45, -0.7], [0.45, -0.7], [0, 0], [-0.45, 0.7], [0.45, 0.7]], 6: [[-0.45, -0.7], [0.45, -0.7], [-0.45, 0], [0.45, 0], [-0.45, 0.7], [0.45, 0.7]], 7: [[-0.45, -0.78], [0.45, -0.78], [0, -0.39], [-0.45, 0], [0.45, 0], [-0.45, 0.78], [0.45, 0.78]] }[c.n];
        const rr = c.n <= 3 ? w * 0.22 : c.n <= 5 ? w * 0.18 : w * 0.15;
        pos.forEach(([px, py]) => { g.save(); g.translate(cx + px * w * 0.28, cy + py * w * 0.46); if (py > 0 && c.s !== 0) g.rotate(Math.PI); suitSymbol(g, c.s, 0, 0, rr); g.restore(); });
        if (c.n === 4 || c.n === 7) { g.save(); g.translate(cx, cy + (c.n === 4 ? 0 : 0)); g.restore(); }
      } else {
        // figura a colori, doppia (meta' alta e copia capovolta), con la linea di giunzione al centro
        g.save(); g.beginPath(); g.rect(w * 0.09, h * 0.1, w * 0.82, h * 0.8); g.clip();
        for (const flip of [false, true]) { g.save(); g.translate(cx, cy); if (flip) g.rotate(Math.PI); figure(g, c.n, c.s, w * 1.5, h * 1.28); g.restore(); }
        g.restore();
        g.strokeStyle = K_; g.lineWidth = w * 0.012; g.beginPath(); g.moveTo(w * 0.07, cy); g.lineTo(w * 0.93, cy); g.stroke();
      }
      if (opts.dim) { g.fillStyle = 'rgba(30,20,0,.08)'; g.beginPath(); g.roundRect(0, 0, w, h, r); g.fill(); }
    }
    g.restore();
  }
  // Panno verde (o di altro colore) con trama e vignettatura
  function felt(g, W, H, c0, c1) {
    const k = g.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, Math.max(W, H) * 0.75); k.addColorStop(0, c0 || '#2a7a4a'); k.addColorStop(1, c1 || '#0c3a22'); g.fillStyle = k; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 260; i++) g.fillRect(((i * 97) % 331) / 331 * W, ((i * 61) % 487) / 487 * H, 1.4, 1.4);
    g.fillStyle = 'rgba(0,0,0,.03)'; for (let i = 0; i < 200; i++) g.fillRect(((i * 53) % 313) / 313 * W, ((i * 89) % 479) / 479 * H, 1.4, 1.4);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.beginPath(); g.roundRect(10, 10, W - 20, H - 20, 24); g.stroke();
  }
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

  // Movimento delle carte. Il gioco disegna ogni carta dove deve stare (mv.card); se il posto cambia, la carta ci
  // scivola sopra, si solleva a metà strada e si gira se passa da coperta a scoperta. Le carte in volo si disegnano
  // sopra le altre con mv.flush(g). mv.from() dice da dove arriva una carta nuova (il mazzo, con un ritardo per
  // distribuirle una alla volta); mv.away() la manda via (una presa) e la toglie quando arriva.
  function motion() {
    const M = new Map(), spawn = new Map(), gone = [], top = [];
    const lerp = (a, b, k) => a + (b - a) * k;
    const cur = e => { const k = e.dur ? ease(e.t / e.dur) : 1; return { x: lerp(e.s.x, e.d.x, k), y: lerp(e.s.y, e.d.y, k), w: lerp(e.s.w, e.d.w, k), a: lerp(e.s.a, e.d.a, k), f: lerp(e.s.f, e.d.f, k), k }; };
    const go = (e, d) => {
      const p = e.d ? cur(e) : d, dist = Math.hypot(d.x - p.x, d.y - p.y);
      e.s = p; e.d = d; e.t = 0; e.dur = Math.min(0.45, 0.14 + dist / 900 + (Math.abs(d.f - p.f) > 0.5 ? 0.15 : 0)); e.dist = dist;
    };
    const paint = (g, c, p, o) => {
      const air = p.k < 1 ? 4 * p.k * (1 - p.k) * Math.min(1, e0(p) / 50) : 0, w = p.w * (1 + 0.08 * air);
      draw(g, c, p.x - (w - p.w) / 2, p.y - (w - p.w) * 0.75, w, Object.assign({}, o, { back: p.f < 0.5, sx: Math.abs(2 * p.f - 1), angle: p.a, air: Math.max(air, o.lift ? 0.6 : 0) }));
    };
    const e0 = p => p.dist || 0;
    return {
      update(dt) {
        M.forEach(e => { if (e.delay > 0) e.delay -= dt; else e.t = Math.min(e.dur, e.t + dt); });
        for (let i = gone.length - 1; i >= 0; i--) { const e = gone[i]; if (e.delay > 0) e.delay -= dt; else if ((e.t += dt) >= e.dur) gone.splice(i, 1); }
      },
      card(g, c, x, y, w, o) {
        o = o || {};
        const d = { x, y, w, a: o.angle || 0, f: o.back || !c ? 0 : 1 };
        let e = M.get(c);
        if (!e) { e = { t: 0, dur: 0, delay: 0 }; const s = spawn.get(c); spawn.delete(c); M.set(c, e); if (s) { e.s = e.d = s; e.delay = s.delay || 0; go(e, d); } else { e.s = e.d = d; } }
        else if (Math.abs(e.d.x - x) > 0.5 || Math.abs(e.d.y - y) > 0.5 || Math.abs(e.d.w - w) > 0.5 || e.d.f !== d.f || Math.abs(e.d.a - d.a) > 0.01) go(e, d);
        if (e.delay > 0) return;
        const p = cur(e); p.dist = e.dist;
        if (p.k < 1) top.push([c, p, o]); else paint(g, c, p, o);
      },
      from(c, x, y, w, o) { o = o || {}; spawn.set(c, { x, y, w, a: o.angle || 0, f: o.back ? 0 : 1, delay: o.delay || 0 }); },
      away(c, x, y, w, o) {
        o = o || {}; const e = M.get(c); M.delete(c);
        if (!e) return;
        const s = cur(e), d = { x, y, w, a: o.angle || 0, f: o.back ? 0 : 1 };
        gone.push({ c, s, d, t: 0, dur: 0.45, delay: o.delay || 0, dist: Math.hypot(x - s.x, y - s.y), o });
      },
      flush(g) {
        top.forEach(([c, p, o]) => paint(g, c, p, o)); top.length = 0;
        gone.forEach(e => { const p = e.delay > 0 ? Object.assign({}, e.s, { k: 0 }) : cur(e); p.dist = e.dist; paint(g, e.c, p, e.o); });
      },
      get busy() { return gone.length > 0 || [...M.values()].some(e => e.delay > 0 || e.t < e.dur); },
      reset() { M.clear(); spawn.clear(); gone.length = 0; top.length = 0; },
    };
  }
  window.Cards = { SUITS, COL, deck, shuffle, draw, label, suitSymbol, felt, ease, motion };
})();

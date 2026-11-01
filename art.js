// Grafica condivisa dei personaggi: Margot, una gatta tigrata dal petto bianco e dagli occhi verdi.
// È tutta disegnata dal codice (nessuna foto né immagine): ogni posa viene preparata una volta su un canvas nascosto
// molto grande e poi stampata nel gioco, così resta nitida anche sugli schermi Retina.
(function () {
  const rng = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const C = {
    back: '#5e4e40', base: '#8b7660', mid: '#74624f', warm: '#b98b5b', belly: '#b49b7e', cream: '#f1e8da', creamDk: '#d6c8b2',
    stripe: '#3f342b', nose: '#a8665e', earIn: '#dba099', iris: '#b9b552', irisDk: '#7d7a2c', ink: '#241f19',
  };
  // Foto di Margot (ritagli del solo gatto) e texture del pelo ricavata dalle foto.
  const PHOTO = {};
  const NAMES = { face: 'art/margot-face.jpg', q3: 'art/margot-3q.jpg', sleep: 'art/margot-sleep.jpg', fur: 'art/fur.jpg', bed: 'art/margot-bed.jpg', sun: 'art/margot-sun.jpg', blanket: 'art/margot-blanket.jpg', avatar: 'art/margot-avatar.jpg' };
  Object.keys(NAMES).forEach(k => {
    const im = new Image(); im.src = NAMES[k]; PHOTO[k] = im;
    im.onload = () => { if (k === 'fur') { for (const kk in sideCache) delete sideCache[kk]; for (const kk in portraitCache) delete portraitCache[kk]; } };
  });
  const ready = k => PHOTO[k] && PHOTO[k].complete && PHOTO[k].naturalWidth > 0;
  const furPattern = (c, scale) => {
    if (!ready('fur')) return null;
    const p = c.createPattern(PHOTO.fur, 'repeat');
    if (p && p.setTransform) p.setTransform(new DOMMatrix().scale(scale || 0.24));
    return p;
  };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const lerp = (a, b, t) => a + (b - a) * t;

  // ------------------------------------------------------------------------------------------ profilo (di lato, verso destra)
  // Coordinate locali 200 x 150, piedi a terra a y = 142.
  function body(c, R) {
    const path = new Path2D();
    path.moveTo(22, 96); path.bezierCurveTo(20, 74, 44, 58, 76, 58); path.bezierCurveTo(104, 56, 128, 56, 144, 68);
    path.bezierCurveTo(156, 78, 158, 100, 148, 112); path.bezierCurveTo(130, 126, 90, 124, 58, 122); path.bezierCurveTo(34, 120, 24, 112, 22, 96);
    c.save(); c.clip(path);
    const g = c.createLinearGradient(0, 56, 0, 126);
    g.addColorStop(0, '#5c4332'); g.addColorStop(0.4, '#8c6644'); g.addColorStop(1, '#b8946e');
    c.fillStyle = g; c.fillRect(0, 40, 200, 100);
    // calore sulle spalle e sui fianchi
    const w = c.createRadialGradient(118, 82, 4, 118, 82, 46); w.addColorStop(0, 'rgba(205,138,76,.8)'); w.addColorStop(1, 'rgba(205,138,76,0)');
    c.fillStyle = w; c.fillRect(60, 50, 110, 90);
    const w2 = c.createRadialGradient(54, 90, 4, 54, 90, 40); w2.addColorStop(0, 'rgba(205,138,76,.7)'); w2.addColorStop(1, 'rgba(205,138,76,0)');
    c.fillStyle = w2; c.fillRect(10, 50, 100, 90);
    const fp = furPattern(c, 0.26);
    if (fp) { c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = fp; c.globalAlpha = 1; c.fillRect(0, 40, 200, 100); c.globalCompositeOperation = 'overlay'; c.globalAlpha = 0.28; c.fillRect(0, 40, 200, 100); c.restore(); }
    // strisce tigrate: bande scure che scendono dal dorso
    c.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const x = 38 + i * 14 + (R() - 0.5) * 3, top = 52 + Math.abs(i - 5) * 1.6;
      c.strokeStyle = `rgba(55,40,30,${0.34 + R() * 0.22})`; c.lineWidth = 4 + R() * 5;
      c.beginPath(); c.moveTo(x, top); c.bezierCurveTo(x + 4, top + 16, x - 3, top + 30, x + 5 + R() * 4, top + 40 + R() * 10); c.stroke();
    }
    // strisce sottili sul fianco
    for (let i = 0; i < 9; i++) {
      const x = 44 + i * 11 + R() * 4, y = 86 + R() * 14;
      c.strokeStyle = 'rgba(55,40,30,.2)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 5, y + 10, x + 2, y + 20); c.stroke();
    }
    // pelo: tanti piccoli tratti
    for (let i = 0; i < 520; i++) {
      const x = 20 + R() * 140, y = 54 + R() * 72, a = -0.35 + R() * 0.7, l = 3 + R() * 5;
      c.strokeStyle = R() < 0.5 ? 'rgba(255,240,215,.2)' : 'rgba(30,22,15,.2)'; c.lineWidth = 0.7;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    // ombra sotto il ventre
    const sh = c.createLinearGradient(0, 100, 0, 126); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(40,28,18,.35)');
    c.fillStyle = sh; c.fillRect(0, 100, 200, 30);
    c.restore();
    c.lineWidth = 1.2; c.strokeStyle = 'rgba(36,31,25,.5)'; c.stroke(path);
  }

  function leg(c, hx, hy, ang, lift, far, R) {
    // coscia e stinco: due segmenti con un ginocchio che si piega quando la zampa si solleva
    const len1 = 24, len2 = 22 - lift * 3;
    const kx = hx + Math.sin(ang) * len1, ky = hy + Math.cos(ang) * len1;
    const a2 = ang * 0.55 - lift * 0.9;
    const ax = kx + Math.sin(a2) * len2, ay = Math.min(142 - 2, ky + Math.cos(a2) * len2 - lift * 7);
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const col = far ? '#6a5a4a' : C.base;
    c.strokeStyle = far ? '#4f4236' : C.stripe; c.lineWidth = 15.2;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(ax, ay); c.stroke();
    c.strokeStyle = col; c.lineWidth = 13;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(ax, ay); c.stroke();
    const lp = furPattern(c, 0.3);
    if (lp) { c.save(); c.globalCompositeOperation = 'soft-light'; c.strokeStyle = lp; c.lineWidth = 13; c.beginPath(); c.moveTo(hx, hy); c.lineTo(kx, ky); c.lineTo(ax, ay); c.stroke(); c.restore(); }
    // strisce sulla zampa
    c.strokeStyle = 'rgba(63,52,43,.55)'; c.lineWidth = 2.4;
    for (let i = 0; i < 3; i++) { const t = 0.3 + i * 0.22, x = lerp(kx, ax, t), y = lerp(ky, ay, t); c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + 6, y + 1); c.stroke(); }
    // zampino chiaro
    const pg = c.createLinearGradient(0, ay - 4, 0, ay + 6); pg.addColorStop(0, far ? '#b9aa94' : C.cream); pg.addColorStop(1, C.creamDk);
    c.fillStyle = pg; c.beginPath(); c.ellipse(ax + 3, ay + 1, 9.5, 6, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(36,31,25,.45)'; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(80,60,45,.5)'; c.lineWidth = 1; for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(ax + 3 + i * 4, ay - 1); c.lineTo(ax + 3 + i * 4, ay + 4); c.stroke(); }
    c.restore();
  }

  function tail(c, sway, raise) {
    // coda lunga, a strisce scure, con la punta nera
    const p0 = [30, 92], p1 = [4, 82 - raise * 20], p2 = [-2 + sway * 6, 44 - raise * 30], p3 = [24 + sway * 10, 22 - raise * 26];
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28, u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      pts.push([x, y]);
    }
    c.save(); c.lineCap = 'round';
    const widthAt = t => lerp(15, 9.5, t);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < pts.length - 1; i++) {
        const t = i / pts.length, band = (i % 6) < 3, tip = t > 0.9;
        c.strokeStyle = pass === 0 ? C.ink : (tip ? C.stripe : band ? C.stripe : C.mid);
        c.lineWidth = widthAt(t) + (pass === 0 ? 2.2 : 0);
        c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke();
      }
    }
    const tp = furPattern(c, 0.3);
    if (tp) { c.save(); c.globalCompositeOperation = 'soft-light'; c.strokeStyle = tp; c.lineCap = 'round'; for (let i = 0; i < pts.length - 1; i++) { c.lineWidth = widthAt(i / pts.length); c.beginPath(); c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[i + 1][0], pts[i + 1][1]); c.stroke(); } c.restore(); }
    c.restore();
  }

  function head(c, R, look) {
    const cx = 160, cy = 62;
    // petto bianco
    const bib = c.createRadialGradient(150, 100, 3, 150, 100, 26); bib.addColorStop(0, C.cream); bib.addColorStop(1, C.creamDk);
    c.fillStyle = bib; c.beginPath(); c.ellipse(149, 100, 13, 21, 0.15, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 70; i++) { const a = R() * 6.28, r = R() * 14; c.strokeStyle = 'rgba(120,100,80,.18)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(149 + Math.cos(a) * r, 100 + Math.sin(a) * r * 1.5); c.lineTo(149 + Math.cos(a) * r + 1, 100 + Math.sin(a) * r * 1.5 + 4); c.stroke(); }
    // orecchie
    const ear = (x0, y0, x1, y1, x2, y2, ix) => {
      c.fillStyle = C.base; c.strokeStyle = C.ink; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x2, y2); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = C.earIn; c.beginPath(); c.moveTo(x0 + ix, y0 - 3); c.lineTo(x1 + ix * 0.4, y1 + 8); c.lineTo(x2 - ix, y2 - 3); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(63,52,43,.6)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x1, y1 + 3); c.lineTo(x1 + 1, y1 + 10); c.stroke();
    };
    ear(139, 46, 143, 16, 160, 38, 4); ear(163, 38, 178, 15, 184, 48, 4);
    // testa
    const hg = c.createRadialGradient(cx - 6, cy - 10, 4, cx, cy, 34); hg.addColorStop(0, '#9d8770'); hg.addColorStop(0.7, C.base); hg.addColorStop(1, C.mid);
    c.fillStyle = hg; c.strokeStyle = C.ink; c.lineWidth = 1.3;
    c.beginPath(); c.ellipse(cx, cy, 31, 26, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.save(); c.beginPath(); c.ellipse(cx, cy, 31, 26, 0, 0, Math.PI * 2); c.clip();
    for (let i = 0; i < 160; i++) { const a = R() * 6.28, r = R() * 32; c.strokeStyle = R() < 0.5 ? 'rgba(255,240,215,.22)' : 'rgba(30,22,15,.22)'; c.lineWidth = 0.7; c.beginPath(); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.85; c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); c.stroke(); }
    const hp = furPattern(c, 0.22);
    if (hp) { c.save(); c.globalCompositeOperation = 'soft-light'; c.fillStyle = hp; c.fillRect(cx - 40, cy - 40, 80, 80); c.restore(); }
    // fronte: la «M» e le righe
    c.strokeStyle = 'rgba(63,52,43,.85)'; c.lineCap = 'round';
    c.lineWidth = 3.6; c.beginPath(); c.moveTo(cx - 1, cy - 28); c.lineTo(cx - 1, cy - 12); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 10, cy - 27); c.quadraticCurveTo(cx - 9, cy - 18, cx - 7, cy - 12); c.stroke();
    c.beginPath(); c.moveTo(cx + 8, cy - 27); c.quadraticCurveTo(cx + 8, cy - 18, cx + 6, cy - 12); c.stroke();
    // righe delle guance
    c.lineWidth = 2.6; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(cx - 29, cy + 2 + i * 6); c.quadraticCurveTo(cx - 18, cy + 4 + i * 6, cx - 11, cy + 6 + i * 5); c.stroke(); }
    c.restore();
    // muso bianco
    const mg = c.createRadialGradient(cx + 2, cy + 14, 2, cx + 2, cy + 14, 16); mg.addColorStop(0, '#fffaf0'); mg.addColorStop(1, C.cream);
    c.fillStyle = mg; c.beginPath(); c.ellipse(cx - 4, cy + 13, 9.5, 8.5, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(cx + 9, cy + 13, 9.5, 8.5, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(cx + 3, cy + 21, 9, 6.5, 0, 0, Math.PI * 2); c.fill();
    // occhi
    const eye = (ex, ey, big) => {
      const rx = 7.6 * big, ry = 6.2 * big;
      c.fillStyle = C.ink; c.beginPath(); c.ellipse(ex, ey, rx + 1.6, ry + 1.4, -0.12, 0, Math.PI * 2); c.fill();
      const ig = c.createRadialGradient(ex - 1, ey - 1, 1, ex, ey, rx); ig.addColorStop(0, '#d4d070'); ig.addColorStop(0.6, C.iris); ig.addColorStop(1, C.irisDk);
      c.fillStyle = ig; c.beginPath(); c.ellipse(ex, ey, rx, ry, -0.12, 0, Math.PI * 2); c.fill();
      c.fillStyle = C.ink; c.beginPath(); c.ellipse(ex + look * 1.2, ey, 2.2, ry * 0.9, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(ex - 2.4, ey - 2.4, 1.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = C.ink; c.lineWidth = 1.6; c.beginPath(); c.moveTo(ex - rx - 2, ey + 1); c.quadraticCurveTo(ex, ey - ry - 3.2, ex + rx + 2.4, ey - 1); c.stroke();   // palpebra
    };
    eye(cx - 12, cy - 1, 1); eye(cx + 14, cy - 1, 1);
    // naso e bocca
    c.fillStyle = C.nose; c.beginPath(); c.moveTo(cx - 2, cy + 8); c.lineTo(cx + 8, cy + 8); c.lineTo(cx + 3, cy + 14); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(36,31,25,.7)'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(cx + 3, cy + 14); c.lineTo(cx + 3, cy + 17); c.moveTo(cx + 3, cy + 17); c.quadraticCurveTo(cx - 2, cy + 21, cx - 6, cy + 17); c.moveTo(cx + 3, cy + 17); c.quadraticCurveTo(cx + 8, cy + 21, cx + 12, cy + 17); c.stroke();
    // baffi
    c.strokeStyle = 'rgba(255,250,240,.85)'; c.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(cx - 6, cy + 14 + i * 2); c.quadraticCurveTo(cx - 24, cy + 10 + i * 4, cx - 38, cy + 12 + i * 7); c.stroke(); c.beginPath(); c.moveTo(cx + 12, cy + 14 + i * 2); c.quadraticCurveTo(cx + 30, cy + 10 + i * 4, cx + 42, cy + 12 + i * 7); c.stroke(); }
  }

  const sideCache = {};
  // pose: walk (phase), idle, jump, fall, sit
  function sideFrame(pose, step) {
    const key = pose + ':' + step;
    if (sideCache[key]) return sideCache[key];
    const S = 5, cv = mk(260 * S / 1, 160 * S / 1), c = cv.getContext('2d');
    c.scale(S, S); c.translate(30, 4);
    c.imageSmoothingEnabled = true;
    const R = rng(7);
    const ph = pose === 'walk' ? step / 8 * Math.PI * 2 : 0;
    const bob = pose === 'walk' ? Math.abs(Math.sin(ph)) * -2.2 : 0;
    c.translate(0, bob);
    // ombra a terra
    c.save(); c.translate(0, -bob); const sg = c.createRadialGradient(95, 142, 4, 95, 142, 62); sg.addColorStop(0, 'rgba(0,0,0,.28)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg; c.beginPath(); c.ellipse(95, 142, 66, 7, 0, 0, Math.PI * 2); c.fill(); c.restore();
    const sway = pose === 'walk' ? Math.sin(ph) * 0.7 : pose === 'jump' ? -0.6 : pose === 'fall' ? 0.8 : Math.sin(step * 0.8) * 0.5;
    const raise = pose === 'jump' ? 0.4 : pose === 'idle' ? 0.55 : 0.15;
    tail(c, sway, raise);
    const legs = (far) => {
      const a = pose === 'walk' ? Math.sin(ph + (far ? Math.PI : 0)) : 0;
      if (pose === 'jump') { leg(c, far ? 128 : 116, 104, far ? 0.75 : 0.95, 0.4, far, R); leg(c, far ? 66 : 52, 104, far ? -0.7 : -0.9, 0.4, far, R); return; }
      if (pose === 'fall') { leg(c, far ? 128 : 116, 104, far ? 0.4 : 0.55, 0.15, far, R); leg(c, far ? 66 : 52, 104, far ? -0.45 : -0.55, 0.15, far, R); return; }
      const lift = (v) => Math.max(0, v);
      leg(c, far ? 128 : 116, 104, a * 0.62, lift(Math.cos(ph + (far ? Math.PI : 0))) * (pose === 'walk' ? 1 : 0), far, R);
      leg(c, far ? 66 : 52, 104, -a * 0.62, lift(-Math.cos(ph + (far ? Math.PI : 0))) * (pose === 'walk' ? 1 : 0), far, R);
    };
    legs(true);
    body(c, R);
    legs(false);
    c.save(); c.translate(0, pose === 'idle' ? Math.sin(step * 0.8) * 0.8 : 0); head(c, rng(11), pose === 'jump' ? 0.8 : 1.2); c.restore();
    return (sideCache[key] = cv);
  }

  // ------------------------------------------------------------------------------------------ ritratto frontale
  const portraitCache = {};
  function portrait(size, mood) {
    const key = size + ':' + mood;
    if (portraitCache[key]) return portraitCache[key];
    const S = size / 200, cv = mk(size, size), c = cv.getContext('2d'), R = rng(21);
    c.scale(S, S); c.imageSmoothingEnabled = true;
    // sfondo caldo
    const bg = c.createRadialGradient(100, 90, 10, 100, 100, 150); bg.addColorStop(0, '#f6e6c8'); bg.addColorStop(1, '#c79a67');
    c.fillStyle = bg; c.fillRect(0, 0, 200, 200);
    // spalle e petto
    const body = c.createLinearGradient(0, 120, 0, 200); body.addColorStop(0, C.base); body.addColorStop(1, C.mid);
    c.fillStyle = body; c.beginPath(); c.ellipse(100, 205, 78, 62, 0, 0, Math.PI * 2); c.fill();
    const bib = c.createRadialGradient(100, 160, 4, 100, 160, 36); bib.addColorStop(0, '#fffaf0'); bib.addColorStop(1, C.creamDk);
    c.fillStyle = bib; c.beginPath(); c.ellipse(100, 166, 26, 38, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.beginPath(); c.ellipse(100, 205, 78, 62, 0, 0, Math.PI * 2); c.clip();
    for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(63,52,43,.55)'; c.lineWidth = 5; c.beginPath(); c.moveTo(34 + i * 4, 150 + i * 6); c.quadraticCurveTo(44, 160 + i * 6, 54 + i * 3, 156 + i * 7); c.stroke(); c.beginPath(); c.moveTo(166 - i * 4, 150 + i * 6); c.quadraticCurveTo(156, 160 + i * 6, 146 - i * 3, 156 + i * 7); c.stroke(); }
    c.restore();
    // orecchie
    const ear = (flip) => {
      c.save(); c.translate(100, 0); c.scale(flip, 1); c.translate(-100, 0);
      c.fillStyle = C.base; c.strokeStyle = C.ink; c.lineWidth = 1.8; c.beginPath(); c.moveTo(58, 74); c.lineTo(46, 14); c.lineTo(98, 46); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = C.earIn; c.beginPath(); c.moveTo(61, 66); c.lineTo(54, 28); c.lineTo(86, 49); c.closePath(); c.fill();
      c.strokeStyle = 'rgba(210,190,170,.8)'; c.lineWidth = 1; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(60 + i * 3, 62 - i * 3); c.lineTo(58 + i * 3.4, 40 - i * 1.6); c.stroke(); }
      c.restore();
    };
    ear(1); ear(-1);
    // testa
    const hg = c.createRadialGradient(92, 78, 6, 100, 92, 78); hg.addColorStop(0, '#a08a72'); hg.addColorStop(0.65, C.base); hg.addColorStop(1, C.mid);
    c.fillStyle = hg; c.strokeStyle = C.ink; c.lineWidth = 1.8; c.beginPath(); c.ellipse(100, 98, 66, 58, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.save(); c.beginPath(); c.ellipse(100, 98, 66, 58, 0, 0, Math.PI * 2); c.clip();
    for (let i = 0; i < 700; i++) { const a = R() * 6.28, r = Math.sqrt(R()) * 68, x = 100 + Math.cos(a) * r, y = 98 + Math.sin(a) * r * 0.86; c.strokeStyle = R() < 0.5 ? 'rgba(255,240,215,.25)' : 'rgba(30,22,15,.25)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5); c.stroke(); }
    c.strokeStyle = 'rgba(63,52,43,.9)'; c.lineCap = 'round';
    c.lineWidth = 6; c.beginPath(); c.moveTo(100, 40); c.lineTo(100, 66); c.stroke();
    c.lineWidth = 4.6; c.beginPath(); c.moveTo(84, 42); c.quadraticCurveTo(86, 58, 90, 68); c.stroke(); c.beginPath(); c.moveTo(116, 42); c.quadraticCurveTo(114, 58, 110, 68); c.stroke();
    c.lineWidth = 3.4; c.beginPath(); c.moveTo(70, 50); c.quadraticCurveTo(74, 60, 78, 66); c.stroke(); c.beginPath(); c.moveTo(130, 50); c.quadraticCurveTo(126, 60, 122, 66); c.stroke();
    c.lineWidth = 4; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(40, 94 + i * 9); c.quadraticCurveTo(54, 96 + i * 9, 68, 100 + i * 8); c.stroke(); c.beginPath(); c.moveTo(160, 94 + i * 9); c.quadraticCurveTo(146, 96 + i * 9, 132, 100 + i * 8); c.stroke(); }
    // sfumatura calda sulle guance
    const wm = c.createRadialGradient(100, 110, 10, 100, 110, 70); wm.addColorStop(0, 'rgba(190,140,92,.0)'); wm.addColorStop(1, 'rgba(190,140,92,.35)'); c.fillStyle = wm; c.fillRect(30, 40, 140, 120);
    c.restore();
    // muso bianco
    const mg = c.createRadialGradient(100, 126, 3, 100, 126, 34); mg.addColorStop(0, '#fffdf6'); mg.addColorStop(1, C.cream);
    c.fillStyle = mg; c.beginPath(); c.ellipse(86, 124, 21, 17, 0.1, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(114, 124, 21, 17, -0.1, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(100, 144, 19, 13, 0, 0, Math.PI * 2); c.fill();
    // occhi
    const eye = (ex, ey) => {
      if (mood === 'happy') { c.strokeStyle = C.ink; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath(); c.arc(ex, ey + 3, 11, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); return; }
      const big = mood === 'alert' ? 1.16 : 1, rx = 14.5 * big, ry = (mood === 'calm' ? 10.5 : 12.5) * big;
      c.fillStyle = C.ink; c.beginPath(); c.ellipse(ex, ey, rx + 2.4, ry + 2.2, 0, 0, Math.PI * 2); c.fill();
      const ig = c.createRadialGradient(ex - 2, ey - 3, 2, ex, ey, rx); ig.addColorStop(0, '#d9d57a'); ig.addColorStop(0.6, C.iris); ig.addColorStop(1, C.irisDk);
      c.fillStyle = ig; c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(80,76,20,.5)'; c.lineWidth = 0.9; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; c.beginPath(); c.moveTo(ex + Math.cos(a) * 4, ey + Math.sin(a) * 4); c.lineTo(ex + Math.cos(a) * rx * 0.92, ey + Math.sin(a) * ry * 0.92); c.stroke(); }
      c.fillStyle = C.ink; c.beginPath(); c.ellipse(ex, ey, mood === 'alert' ? 5.6 : 3.6, ry * 0.95, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(ex - 5, ey - 5, 3, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(ex + 5, ey + 4, 1.3, 0, Math.PI * 2); c.fill();
      c.strokeStyle = C.ink; c.lineWidth = 2.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(ex - rx - 5, ey + 2); c.quadraticCurveTo(ex, ey - ry - (mood === 'calm' ? 3 : 7), ex + rx + 5, ey + 2); c.stroke();
      if (mood === 'calm') { c.fillStyle = 'rgba(139,118,96,.55)'; c.beginPath(); c.ellipse(ex, ey - ry * 0.55, rx + 2, ry * 0.48, 0, Math.PI, 0); c.fill(); }   // palpebra pesante
    };
    eye(70, 94); eye(130, 94);
    // naso, bocca
    const ng = c.createLinearGradient(0, 112, 0, 128); ng.addColorStop(0, '#c07a70'); ng.addColorStop(1, C.nose);
    c.fillStyle = ng; c.beginPath(); c.moveTo(90, 112); c.lineTo(110, 112); c.quadraticCurveTo(110, 122, 100, 128); c.quadraticCurveTo(90, 122, 90, 112); c.fill();
    c.strokeStyle = 'rgba(36,31,25,.75)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(100, 128); c.lineTo(100, 138);
    if (mood === 'happy') { c.moveTo(100, 138); c.quadraticCurveTo(88, 152, 76, 140); c.moveTo(100, 138); c.quadraticCurveTo(112, 152, 124, 140); }
    else { c.moveTo(100, 138); c.quadraticCurveTo(92, 146, 84, 141); c.moveTo(100, 138); c.quadraticCurveTo(108, 146, 116, 141); }
    c.stroke();
    // baffi
    c.strokeStyle = 'rgba(255,252,244,.9)'; c.lineWidth = 1.1; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(78, 128 + i * 3); c.quadraticCurveTo(46, 118 + i * 8, 10, 120 + i * 14); c.stroke(); c.beginPath(); c.moveTo(122, 128 + i * 3); c.quadraticCurveTo(154, 118 + i * 8, 190, 120 + i * 14); c.stroke(); }
    return (portraitCache[key] = cv);
  }

  // Stampa nel gioco. (x, y) = centro dei piedi, h = altezza visibile in unità di gioco, dir = +1 destra / -1 sinistra.
  function drawMargot(g, x, y, h, pose, step, dir) {
    const f = sideFrame(pose || 'idle', pose === 'walk' ? ((step | 0) % 8 + 8) % 8 : (pose === 'idle' ? ((step * 3) | 0) % 8 : 0));
    const s = h / 127;
    g.save(); g.translate(x, y); g.scale(dir < 0 ? -s : s, s);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(f, -125, -146, f.width / 5, f.height / 5);
    g.restore();
  }
  function drawPortrait(g, x, y, size, mood) {
    const px = Math.max(96, Math.round(size * (window.devicePixelRatio || 2) * 1.2));
    const cv = portrait(Math.min(512, px), mood || 'calm');
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(cv, x, y, size, size); g.restore();
  }
  // Foto in cornice: (x, y) angolo in alto a sinistra, w = larghezza della cornice. Restituisce false se la foto non è ancora caricata.
  function drawPhoto(g, name, x, y, w, tilt) {
    if (!ready(name)) return false;
    const im = PHOTO[name], pad = w * 0.06, iw = w - pad * 2, ih = iw * im.naturalHeight / im.naturalWidth, h = ih + pad * 2 + w * 0.12;
    g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(tilt || 0); g.translate(-w / 2, -h / 2);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(4, 8, w, h);
    g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, w, h);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(im, pad, pad, iw, ih);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; g.strokeRect(pad, pad, iw, ih);
    g.restore();
    return { w, h };
  }

  // ---- Personaggi in vettoriale ad alta definizione per i giochi del topo ----
  const ell = (g, x, y, rx, ry, fill, rot) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, 7); g.fill(); };
  const lin = (g, x0, y0, x1, y1, a, b) => { const k = g.createLinearGradient(x0, y0, x1, y1); k.addColorStop(0, a); k.addColorStop(1, b); return k; };
  // (x, y) = piedi; f = direzione (1 o -1); walk = fase dei passi
  function drawMouseHD(g, x, y, f, walk, air, climb) {
    const ph = walk * Math.PI, bob = air || climb ? 0 : Math.abs(Math.sin(ph)) * 1.1, by = y - bob;
    g.save();
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y + 0.5, 9, 2.1, 0, 0, 7); g.fill();
    // coda sottile e ricurva
    g.strokeStyle = '#e7a0ac'; g.lineWidth = 1.7; g.lineCap = 'round'; g.beginPath();
    const sw = Math.sin(ph * 1.0) * 2.5;
    g.moveTo(x - f * 7, by - 7); g.bezierCurveTo(x - f * 13, by - 5 + sw, x - f * 15, by - 13 - sw, x - f * 11, by - 16 + sw); g.stroke();
    // zampe posteriori e anteriori
    const stepA = air ? 3 : Math.sin(ph) * 3, stepB = air ? -2 : -Math.sin(ph) * 3;
    ell(g, x - f * 4 + stepA, by - 1.6, 3.2, 2, '#e3b9a0'); ell(g, x + f * 3 + stepB, by - 1.6, 3.2, 2, '#e3b9a0');
    // corpo
    ell(g, x - f * 1, by - 8.5, 8.2, 6.4, lin(g, x, by - 15, x, by - 2, '#c9ae93', '#8e7459'));
    ell(g, x + f * 1, by - 6.5, 4.6, 3.6, '#ead7c4');
    // sciarpa verde con codina
    g.fillStyle = lin(g, x, by - 15, x, by - 10, '#43c27a', '#228a52'); g.beginPath(); g.ellipse(x + f * 3, by - 12, 4.2, 2.6, f * 0.5, 0, 7); g.fill();
    g.beginPath(); g.moveTo(x + f * 1, by - 11); g.lineTo(x - f * (5 + Math.sin(ph) * 1), by - 9.5); g.lineTo(x - f * 3, by - 8); g.closePath(); g.fill();
    // braccino
    ell(g, x + f * 5, by - 7 + (climb ? -3 : 0), 2.1, 1.7, '#e3b9a0');
    // orecchie (dietro la testa)
    ell(g, x + f * 2.5, by - 20.5, 4.6, 5, '#b99a7c'); ell(g, x + f * 2.5, by - 20.3, 2.9, 3.4, '#f2a9bd');
    ell(g, x + f * 8, by - 20, 4.3, 4.7, '#b99a7c'); ell(g, x + f * 8, by - 19.8, 2.6, 3.1, '#f2a9bd');
    // testa con muso appuntito
    g.fillStyle = lin(g, x, by - 20, x, by - 10, '#d2b99e', '#a98e73'); g.beginPath();
    g.moveTo(x + f * 12.5, by - 11.5); g.quadraticCurveTo(x + f * 11, by - 18, x + f * 5, by - 19); g.quadraticCurveTo(x - f * 0.5, by - 17, x + f * 1, by - 11); g.quadraticCurveTo(x + f * 6, by - 8.5, x + f * 12.5, by - 11.5); g.fill();
    ell(g, x + f * 12.3, by - 11.8, 1.5, 1.2, '#f08aa4');                      // naso
    // occhio grande con riflesso
    ell(g, x + f * 7.3, by - 14.8, 2.1, 2.5, '#141a2e'); ell(g, x + f * 7.9, by - 15.6, 0.8, 0.9, '#fff');
    // guancia e baffi
    ell(g, x + f * 5.2, by - 12, 1.7, 1.1, 'rgba(240,138,164,.55)');
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.5; g.beginPath();
    g.moveTo(x + f * 10, by - 11.2); g.lineTo(x + f * 15, by - 12.6); g.moveTo(x + f * 10, by - 10.6); g.lineTo(x + f * 15.2, by - 10.4); g.stroke();
    g.restore();
  }
  function drawCatHD(g, x, y, f, t, dead) {
    g.save();
    if (dead) { ell(g, x, y - 2.2, 13, 2.6, '#d98b2b'); g.restore(); return; }
    const wag = Math.sin(t * 8) * 3;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y + 0.5, 14, 2.4, 0, 0, 7); g.fill();
    g.strokeStyle = '#d98b2b'; g.lineWidth = 3.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - f * 10, y - 8); g.bezierCurveTo(x - f * 18, y - 10, x - f * 19, y - 19 + wag, x - f * 14, y - 22 + wag); g.stroke();
    g.strokeStyle = '#7a3f10'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(x - f * (14 + k * 1.5), y - 12 - k * 3); g.lineTo(x - f * (11 + k * 1.5), y - 11 - k * 3); g.stroke(); }
    ell(g, x - f * 1, y - 8.5, 11.5, 8, lin(g, x, y - 16, x, y - 1, '#f0a846', '#c9731a'));
    g.strokeStyle = 'rgba(122,63,16,.55)'; g.lineWidth = 1.3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x + k * 3.6, y - 15.5); g.lineTo(x + k * 3.6 + 1, y - 10); g.stroke(); }
    ell(g, x - f * 6, y - 1.8, 3.6, 2.2, '#b87a35'); ell(g, x + f * 6, y - 1.8, 3.6, 2.2, '#b87a35');
    ell(g, x + f * 3, y - 14, 8.2, 7.4, lin(g, x, y - 21, x, y - 8, '#f6b657', '#d98b2b'));
    g.fillStyle = '#e0952f'; g.beginPath(); g.moveTo(x + f * 3 - 7, y - 18); g.lineTo(x + f * 3 - 6, y - 25.5); g.lineTo(x + f * 3 - 1, y - 20); g.moveTo(x + f * 3 + 7, y - 18); g.lineTo(x + f * 3 + 6, y - 25.5); g.lineTo(x + f * 3 + 1, y - 20); g.fill();
    ell(g, x + f * 3 - 5, y - 20.5, 1.6, 2.4, '#f2a9bd', 0.25); ell(g, x + f * 3 + 5, y - 20.5, 1.6, 2.4, '#f2a9bd', -0.25);
    ell(g, x + f * 3 - 3, y - 14.5, 2.1, 2.3, '#fff3c4'); ell(g, x + f * 3 + 3.2, y - 14.5, 2.1, 2.3, '#fff3c4');
    ell(g, x + f * 3 - 3 + f * 0.4, y - 14.4, 0.8, 1.9, '#141a2e'); ell(g, x + f * 3 + 3.2 + f * 0.4, y - 14.4, 0.8, 1.9, '#141a2e');
    ell(g, x + f * 3 + 0.1, y - 11, 1.2, 0.9, '#f08aa4');
    g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x + f * 3 + 2, y - 10.6); g.lineTo(x + f * 3 + 9, y - 11.6); g.moveTo(x + f * 3 + 2, y - 9.8); g.lineTo(x + f * 3 + 9, y - 9); g.moveTo(x + f * 3 - 2, y - 10.6); g.lineTo(x + f * 3 - 9, y - 11.6); g.moveTo(x + f * 3 - 2, y - 9.8); g.lineTo(x + f * 3 - 9, y - 9); g.stroke();
    g.restore();
  }
  function drawCheeseHD(g, x, y) {
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(0, 7.5, 9, 1.8, 0, 0, 7); g.fill();
    g.fillStyle = lin(g, 0, -6, 0, 7, '#ffe56a', '#e8a91c'); g.beginPath(); g.moveTo(-9, 6); g.lineTo(9, 6); g.lineTo(9, -3); g.lineTo(-9, 3); g.closePath(); g.fill();
    g.fillStyle = '#fff3a8'; g.beginPath(); g.moveTo(-9, 3); g.lineTo(9, -3); g.lineTo(6, -6); g.lineTo(-9, 0); g.closePath(); g.fill();
    ell(g, -3.5, 3, 1.7, 1.5, '#c98a12'); ell(g, 3.5, 0.8, 1.9, 1.6, '#c98a12'); ell(g, 6.3, 4, 1.1, 1, '#c98a12');
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-7.5, 3.6, 4, 1);
    g.restore();
  }

  // ---- Navicelle e alieni ad alta definizione (usati dai giochi spaziali) ----
  // Disegna una griglia di '#' come celle luminose con riflesso, ombra e alone.
  function bmpGlow(g, rows, x, y, px, color) {
    g.save();
    g.globalAlpha = 0.16; g.fillStyle = color;
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') g.fillRect(x + i * px - px * 0.55, y + j * px - px * 0.55, px * 2.1, px * 2.1); });
    g.globalAlpha = 1;
    rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '#') {
      const cx = x + i * px, cy = y + j * px;
      g.fillStyle = color; g.fillRect(cx, cy, px, px);
      g.fillStyle = 'rgba(255,255,255,.38)'; g.fillRect(cx, cy, px, px * 0.34);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(cx, cy + px * 0.72, px, px * 0.28);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(cx + px * 0.86, cy, px * 0.14, px);
    } });
    g.restore();
  }
  // Caccia stellare: (x, y) = punto sotto il muso; s = scala
  function fighter(g, x, y, s, t, hull, accent) {
    s = s || 1; hull = hull || '#dfe6ff'; accent = accent || '#3d6bff';
    g.save(); g.translate(x, y); g.scale(s, s);
    const fl = 7 + Math.sin(t * 40) * 2.5;
    const fg = g.createLinearGradient(0, 8, 0, 8 + fl * 1.8); fg.addColorStop(0, '#fff6b0'); fg.addColorStop(0.4, '#ffb03a'); fg.addColorStop(1, 'rgba(255,80,40,0)');
    g.fillStyle = fg; g.beginPath(); g.moveTo(-4, 8); g.quadraticCurveTo(0, 8 + fl * 2, 4, 8); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-10, 8); g.quadraticCurveTo(-9, 8 + fl * 1.1, -7, 8); g.closePath(); g.fill(); g.beginPath(); g.moveTo(10, 8); g.quadraticCurveTo(9, 8 + fl * 1.1, 7, 8); g.closePath(); g.fill();
    // ali
    const wg = g.createLinearGradient(-16, 0, 16, 0); wg.addColorStop(0, accent); wg.addColorStop(0.5, '#9bb4ff'); wg.addColorStop(1, accent);
    g.fillStyle = wg; g.beginPath(); g.moveTo(-3, -4); g.lineTo(-16, 6); g.lineTo(-15, 9); g.lineTo(-5, 6); g.lineTo(5, 6); g.lineTo(15, 9); g.lineTo(16, 6); g.lineTo(3, -4); g.closePath(); g.fill();
    g.fillStyle = '#e5413b'; g.fillRect(-16, 5, 3, 3); g.fillRect(13, 5, 3, 3);
    // fusoliera
    const bg = g.createLinearGradient(-5, 0, 5, 0); bg.addColorStop(0, '#9aa8d6'); bg.addColorStop(0.45, hull); bg.addColorStop(1, '#8793c0');
    g.fillStyle = bg; g.beginPath(); g.moveTo(0, -15); g.quadraticCurveTo(5.5, -6, 5, 7); g.lineTo(-5, 7); g.quadraticCurveTo(-5.5, -6, 0, -15); g.closePath(); g.fill();
    // cabina
    const cg = g.createLinearGradient(0, -10, 0, -2); cg.addColorStop(0, '#9ff3ff'); cg.addColorStop(1, '#1fa7d6');
    g.fillStyle = cg; g.beginPath(); g.ellipse(0, -6, 2.4, 4.2, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-1.2, -9, 1, 3);
    g.restore();
  }
  function saucer(g, x, y, t) {
    g.save(); g.translate(x, y);
    const bg = g.createLinearGradient(0, -6, 0, 6); bg.addColorStop(0, '#ff8f8a'); bg.addColorStop(1, '#a8181a');
    g.fillStyle = 'rgba(255,90,80,.18)'; g.beginPath(); g.ellipse(0, 2, 24, 9, 0, 0, 7); g.fill();
    g.fillStyle = '#9ff3ff'; g.beginPath(); g.ellipse(0, -4, 8, 6, 0, Math.PI, 0); g.fill();
    g.fillStyle = bg; g.beginPath(); g.ellipse(0, 2, 17, 6, 0, 0, 7); g.fill();
    for (let i = -2; i <= 2; i++) { g.fillStyle = (((t * 8) | 0) + i) % 2 ? '#ffe66a' : '#fff'; g.beginPath(); g.arc(i * 6.5, 3, 1.5, 0, 7); g.fill(); }
    g.restore();
  }
  // Sfondo spaziale con nebulose e stelle che brillano
  function nebula(g, W, H, t) {
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#05081a'); bg.addColorStop(1, '#0b0f2e'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    [[0.2, 0.25, 0.5, 'rgba(110,60,200,.22)'], [0.85, 0.6, 0.55, 'rgba(30,120,220,.18)'], [0.4, 0.95, 0.45, 'rgba(200,60,120,.12)']].forEach(([a, b, r, c]) => {
      const gr = g.createRadialGradient(a * W, b * H, 0, a * W, b * H, r * Math.max(W, H)); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
  }
  window.Art = { bmpGlow, fighter, saucer, nebula, drawMouseHD, drawCatHD, drawCheeseHD, drawMargot, drawPortrait, portrait, sideFrame, drawPhoto, photo: k => (ready(k) ? PHOTO[k] : null), ready };
})();

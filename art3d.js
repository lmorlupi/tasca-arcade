// Margot in 3D: un piccolo motore WebGL tutto nostro (nessuna libreria esterna).
// Il corpo è fatto di ellissoidi (tronco, petto, bacino, testa, zampe, coda...). Il pelo è disegnato "a strati"
// (shell fur), le strisce tigrate sono calcolate nello shader e il dettaglio del pelo arriva dalla foto di Margot.
// I fotogrammi (camminata, salto, caduta, riposo) si preparano una sola volta su un canvas 2D e il gioco li stampa:
// così il 3D non costa nulla durante la partita. Senza WebGL il gioco ripiega sulla Margot disegnata in 2D.
(function () {
  const W = 512, H = 384, SHELLS = 16, SEG_U = 22, SEG_V = 14;
  const FOV = 24 * Math.PI / 180, DIST = 3.85, YAW = -0.5;
  const cvGL = document.createElement('canvas'); cvGL.width = W; cvGL.height = H;
  let gl = null, prog = null, ok = false, furTex = null, furReady = false;
  const frames = {};

  // ---------------------------------------------------------------------------------------------- matematica minima
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mulv = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const persp = (fov, asp, n, f) => { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]; };
  const lookAt = (e, c, u) => {
    const z = norm(sub(e, c)), x = norm(cross(u, z)), y = cross(z, x);
    return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1];
  };
  const mmul = (a, b) => { const o = new Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  const rotY = a => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; };
  const rotZ = a => { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; };
  const trans = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

  // ---------------------------------------------------------------------------------------------- shader
  const VS = `
    attribute vec3 aPos; attribute vec3 aNrm; attribute vec2 aUV; attribute vec3 aLoc; attribute vec4 aPart;
    uniform mat4 uVP; uniform float uShell; uniform float uFurLen;
    varying vec3 vN; varying vec3 vLoc; varying vec3 vW; varying vec2 vUV; varying vec4 vPart; varying float vShell;
    void main() {
      float len = aPart.z * uFurLen;
      vec3 p = aPos + aNrm * (uShell * len) - vec3(0.0, uShell * uShell * len * 0.35, 0.0);
      vW = p; vN = aNrm; vLoc = aLoc; vUV = aUV; vPart = aPart; vShell = uShell;
      gl_Position = uVP * vec4(p, 1.0);
    }`;
  const FS = `
    precision highp float;
    varying vec3 vN; varying vec3 vLoc; varying vec3 vW; varying vec2 vUV; varying vec4 vPart; varying float vShell;
    uniform sampler2D uFur; uniform vec3 uEye; uniform float uHasFur;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    vec3 coat(float id, vec3 L) {
      vec3 ginger = vec3(0.62, 0.41, 0.23), brown = vec3(0.40, 0.30, 0.22), gray = vec3(0.50, 0.45, 0.40);
      vec3 dark = vec3(0.13, 0.095, 0.075), cream = vec3(0.94, 0.89, 0.81), pink = vec3(0.82, 0.52, 0.48);
      float tone = noise(L.xy * 3.2 + id * 7.0) * 0.6 + noise(L.yz * 6.0 + id) * 0.4;
      vec3 base = mix(mix(gray, brown, 0.5), ginger, smoothstep(0.30, 0.72, tone));
      if (id < 2.5) {                                   // tronco, petto, bacino
        base *= mix(1.0, 0.70, smoothstep(0.0, 1.0, L.y));
        float band = sin(L.x * 8.5 + id * 1.7 + noise(L.yz * 4.0) * 2.4);
        float st = smoothstep(0.30, 0.52, band) * smoothstep(-0.35, 0.55, L.y);
        base = mix(base, dark, st * 0.62);
        float thin = smoothstep(0.55, 0.75, sin(L.x * 19.0 + noise(L.yz * 6.0) * 3.0)) * smoothstep(-0.2, 0.4, L.y);
        base = mix(base, dark, thin * 0.28);
        base = mix(base, cream * 0.88, smoothstep(-0.30, -0.78, L.y) * 0.85);
        if (id > 0.5 && id < 1.5) base = mix(base, cream, smoothstep(0.05, 0.35, L.x) * smoothstep(0.30, -0.15, L.y) * smoothstep(1.0, 0.45, abs(L.z)));
      } else if (id < 3.5) {                            // testa
        base = mix(base, gray, 0.25);
        float fore = smoothstep(0.50, 0.72, sin(L.z * 34.0 + noise(L.xy * 5.0) * 1.2)) * smoothstep(0.30, 0.80, L.y) * smoothstep(-0.4, 0.4, L.x);
        base = mix(base, dark, fore * 0.78);
        float cheek = smoothstep(0.55, 0.75, sin(L.y * 30.0 + L.x * 4.0)) * smoothstep(0.45, 0.85, abs(L.z)) * smoothstep(-0.3, 0.5, L.x);
        base = mix(base, dark, cheek * 0.55);
        base = mix(base, cream, smoothstep(0.55, 0.95, L.x) * smoothstep(0.05, -0.45, L.y));
      } else if (id < 5.5) {                            // muso, mento
        base = mix(cream, vec3(0.98, 0.95, 0.9), 0.5);
        if (id < 4.5) base = mix(base, mix(brown, ginger, 0.4), smoothstep(0.1, -0.8, L.x) * 0.35);
      } else if (id < 6.5) {                            // naso
        base = vec3(0.66, 0.38, 0.35);
      } else if (id < 7.5) {                            // orecchio
        vec3 outer = mix(brown, gray, 0.4);
        float inner = smoothstep(0.05, 0.35, L.x) * smoothstep(0.92, 0.55, length(L.yz));
        base = mix(outer, pink, inner * 0.9);
      } else if (id < 9.5) {                            // baffi (id 9)
        base = vec3(0.97, 0.96, 0.93);
      } else if (id < 10.5) {                           // coda
        base = mix(brown, gray, 0.4);
        float ring = smoothstep(0.30, 0.48, sin(L.x * 30.0 + noise(L.yz * 3.0)));
        base = mix(base, dark, ring * 0.7);
        base = mix(base, dark, smoothstep(0.80, 0.96, L.x));
      } else if (id < 11.5) {                           // zampe
        base = mix(brown, ginger, smoothstep(0.35, 0.75, tone) * 0.7);
        float rng = smoothstep(0.55, 0.75, sin(L.x * 22.0 + noise(L.yz * 3.0) * 2.0));
        base = mix(base, dark, rng * 0.3);
      } else if (id < 12.5) {                           // zampini
        base = cream;
      } else {                                          // collo
        base = mix(mix(gray, ginger, 0.45), cream, smoothstep(0.1, 0.7, L.x) * smoothstep(0.2, -0.3, L.y));
      }
      return base;
    }
    void main() {
      float id = vPart.x;
      vec3 N = normalize(vN), V = normalize(uEye - vW);
      if (vShell > 0.001 && vPart.z <= 0.0) discard;
      // occhio
      if (id > 7.5 && id < 8.5) {
        vec3 L = normalize(vLoc);
        float rr = length(vec2(L.y, L.z));
        vec3 col = vec3(0.06, 0.05, 0.04);
        float inIris = step(L.x, 0.999) * smoothstep(0.78, 0.70, rr) * step(0.12, L.x);
        float streak = noise(vec2(atan(L.y, L.z) * 6.0, rr * 9.0));
        vec3 iris = mix(vec3(0.18, 0.26, 0.07), vec3(0.66, 0.66, 0.24), (1.0 - rr / 0.75) * 0.85 + streak * 0.25);
        iris = mix(iris, vec3(0.10, 0.12, 0.04), smoothstep(0.55, 0.78, rr));
        col = mix(col, iris, inIris);
        float pupil = smoothstep(0.10, 0.06, abs(L.z)) * smoothstep(0.45, 0.30, abs(L.y)) * step(0.12, L.x);
        col = mix(col, vec3(0.01), pupil);
        float lid = smoothstep(0.02, 0.28, L.y);                      // palpebra pesante, come in Margot
        col = mix(col, vec3(0.30, 0.23, 0.17) * 0.8, lid);
        float spec = pow(max(dot(reflect(-normalize(vec3(-0.5, 0.8, 0.6)), N), V), 0.0), 70.0);
        col += vec3(1.0) * spec * (1.0 - lid) * 1.3;
        gl_FragColor = vec4(col, 1.0); return;
      }
      vec3 col = coat(id, vLoc);
      // dettaglio del pelo dalla foto
      if (uHasFur > 0.5) { float f = texture2D(uFur, vUV * vec2(2.0, 1.0) * 1.6).r; col *= 0.72 + 0.62 * f; }
      float alpha = 1.0;
      if (vPart.z > 0.0) {
        vec2 g = vUV * vec2(vPart.y, vPart.y * 0.62);
        float s = hash(floor(g)), s2 = hash(floor(g * 1.7) + 3.0);
        float h = 0.30 + 0.70 * s;
        if (vShell > 0.001) alpha = step(vShell, h) * (1.0 - vShell * 0.35);
        col *= (0.55 + 0.60 * vShell) * (0.90 + 0.20 * s2);
        if (vShell < 0.001) col *= 0.70;
      }
      // luce: una principale in alto davanti, riempimento di cielo, bordo caldo
      vec3 Ld = normalize(vec3(-0.55, 0.75, 0.70));
      float key = clamp((dot(N, Ld) + 0.45) / 1.45, 0.0, 1.0);
      float sky = 0.5 + 0.5 * N.y;
      float rim = pow(1.0 - max(dot(N, V), 0.0), 2.6);
      col *= 0.42 + 0.86 * key;
      col *= 0.72 + 0.34 * sky; col = pow(col, vec3(0.88));
      col += vec3(1.0, 0.86, 0.68) * rim * 0.30 * (0.5 + 0.5 * key);
      if (id > 5.5 && id < 6.5) { float sp = pow(max(dot(reflect(-Ld, N), V), 0.0), 40.0); col += vec3(0.8) * sp * 0.6; }
      gl_FragColor = vec4(col * alpha, alpha);
    }`;

  // ---------------------------------------------------------------------------------------------- mesh
  let sphere = null;
  const buildSphere = () => {
    const pos = [], idx = [];
    for (let j = 0; j <= SEG_V; j++) for (let i = 0; i <= SEG_U; i++) {
      const th = j / SEG_V * Math.PI, ph = i / SEG_U * Math.PI * 2;
      pos.push([Math.cos(th) * 1, Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), i / SEG_U, j / SEG_V]);
    }
    for (let j = 0; j < SEG_V; j++) for (let i = 0; i < SEG_U; i++) { const a = j * (SEG_U + 1) + i, b = a + SEG_U + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    // la sfera ha l'asse lungo X: x = cos(theta), y/z = piano trasversale
    sphere = { pos, idx };
  };
  const ID = { torso: 0, chest: 1, hip: 2, head: 3, muzzle: 4, chin: 5, nose: 6, ear: 7, eye: 8, whisker: 9, tail: 10, leg: 11, paw: 12, neck: 13 };

  // Un ellissoide: centro c, base ortonormale (ex, ey, ez), raggi r.
  const parts = [];
  const ell = (id, c, B, r, freq, fur, deform) => parts.push({ id, c, B, r, freq, fur, deform });
  const basisZ = a => [[Math.cos(a), Math.sin(a), 0], [-Math.sin(a), Math.cos(a), 0], [0, 0, 1]];
  const basisFrom = (ex) => {
    ex = norm(ex); let t = Math.abs(ex[2]) > 0.9 ? [0, 1, 0] : [0, 0, 1];
    const ey = norm(cross(t, ex)), ez = cross(ex, ey); return [ex, ey, ez];
  };
  const limb = (id, p0, p1, r0, r1, freq, fur) => {
    const d = sub(p1, p0), len = Math.hypot(d[0], d[1], d[2]);
    ell(id, mulv(add(p0, p1), 0.5), basisFrom(d), [len / 2 + (r0 + r1) * 0.28, (r0 + r1) / 2, (r0 + r1) / 2], freq, fur);
  };

  // ---------------------------------------------------------------------------------------------- posa di Margot
  function pose(name, step) {
    parts.length = 0;
    const ph = name === 'walk' ? step / 8 * Math.PI * 2 : 0;
    const breathe = name === 'idle' ? Math.sin(step / 8 * Math.PI * 2) * 0.012 : 0;
    const bob = name === 'walk' ? Math.abs(Math.sin(ph)) * 0.025 : 0;
    const pitch = name === 'jump' ? 0.16 : name === 'fall' ? -0.10 : 0;
    const R = basisZ(0);
    const Y = bob;
    // tronco
    ell(ID.torso, [-0.02, 0.50 + Y, 0], R, [0.50, 0.25 + breathe, 0.22], 150, 1);
    ell(ID.chest, [0.30, 0.50 + Y, 0], R, [0.27, 0.27 + breathe, 0.22], 150, 1);
    ell(ID.hip, [-0.34, 0.50 + Y, 0], R, [0.28, 0.27, 0.23], 150, 1);
    // collo e testa (la testa guarda un po' verso chi gioca)
    const hy = name === 'jump' ? 0.05 : name === 'idle' ? Math.sin(step / 8 * Math.PI * 2) * 0.01 : 0;
    ell(ID.neck, [0.52, 0.64 + Y, 0], basisZ(0.65), [0.21, 0.19, 0.17], 150, 1);
    const hc = [0.72, 0.80 + Y + hy, 0], psi = 0.55;
    const HB = [[Math.cos(psi), 0, -Math.sin(psi)], [0, 1, 0], [Math.sin(psi), 0, Math.cos(psi)]];
    const H = (l) => add(hc, add(add(mulv(HB[0], l[0]), mulv(HB[1], l[1])), mulv(HB[2], l[2])));
    ell(ID.head, hc, HB, [0.175, 0.150, 0.170], 200, 1);
    ell(ID.muzzle, H([0.135, -0.045, 0]), HB, [0.085, 0.060, 0.080], 260, 1);
    ell(ID.chin, H([0.105, -0.095, 0]), HB, [0.055, 0.040, 0.052], 260, 1);
    ell(ID.nose, H([0.205, -0.015, 0]), HB, [0.022, 0.017, 0.026], 0, 0);
    for (const s of [-1, 1]) {
      ell(ID.eye, H([0.122, 0.034, 0.128 * s]), [mulv(HB[2], s), HB[1], mulv(HB[0], -s)], [0.042, 0.038, 0.038], 0, 0);
      // orecchie: ellissoidi schiacciati e appuntiti
      const eb = basisZ(-0.12);
      const EB = [mulv(HB[0], 1), HB[1], HB[2]];
      ell(ID.ear, H([-0.03, 0.160, 0.095 * s]), EB, [0.036, 0.135, 0.100], 0, 0.6, 'ear');
      // baffi
      for (let k = 0; k < 3; k++) limb(ID.whisker, H([0.16, -0.045 + k * 0.012, 0.06 * s]), H([0.12, -0.065 + k * 0.035, 0.30 * s]), 0.0035, 0.0025, 0, 0);
    }
    // zampe: 0 = anteriore vicina, 1 = anteriore lontana, 2 = posteriore vicina, 3 = posteriore lontana
    const legs = [[0.30, 0.38, 0.14], [0.30, 0.38, -0.14], [-0.34, 0.38, 0.15], [-0.34, 0.38, -0.15]];
    legs.forEach((root, i) => {
      const front = i < 2;
      let th, bend;
      if (name === 'walk') { const o = (i === 0 || i === 3) ? 0 : Math.PI; th = Math.sin(ph + o) * 0.62 * (front ? 1 : -1); bend = Math.max(0, Math.cos(ph + o)) * 0.9 * (front ? -1 : 1) * (front ? 1 : -1) + 0.1; }
      else if (name === 'jump') { th = front ? 0.95 : -0.95; bend = front ? -0.15 : 0.35; }
      else if (name === 'fall') { th = front ? 0.55 : -0.50; bend = front ? 0.1 : 0.25; }
      else { th = front ? 0.05 : -0.04; bend = 0.04; }
      const r0 = [root[0], root[1] + Y, root[2]];
      const k = add(r0, [Math.sin(th) * 0.20, -Math.cos(th) * 0.20, 0]);
      const th2 = th + (front ? -bend : bend) * 0.9;
      let f = add(k, [Math.sin(th2) * 0.21, -Math.cos(th2) * 0.21, 0]);
      f[1] = Math.max(f[1], 0.045);
      limb(ID.leg, r0, k, 0.085, 0.060, 160, 1);
      limb(ID.leg, k, f, 0.060, 0.050, 160, 1);
      ell(ID.paw, add(f, [0.045, 0.0, 0]), basisZ(0), [0.085, 0.048, 0.060], 170, 1);
    });
    // coda a strisce, che oscilla
    const sway = name === 'walk' ? Math.sin(ph) * 0.12 : name === 'idle' ? Math.sin(step / 8 * Math.PI * 2) * 0.10 : name === 'jump' ? -0.16 : 0.12;
    const P0 = [-0.58, 0.52 + Y, 0], P1 = [-0.92, 0.44, 0.10 * Math.sin(ph) + sway * 0.4], P2 = [-1.08, 0.86 + sway * 0.4, sway], P3 = [-0.86, 1.08 + sway * 0.3, sway * 0.6];
    let prev = P0;
    for (let i = 1; i <= 9; i++) {
      const t = i / 9, u = 1 - t;
      const q = [0, 1, 2].map(a => u * u * u * P0[a] + 3 * u * u * t * P1[a] + 3 * u * t * t * P2[a] + t * t * t * P3[a]);
      limb(ID.tail, prev, q, 0.070 - (i - 1) * 0.0045, 0.070 - i * 0.0045, 140, 1);
      prev = q;
    }
  }

  // ---------------------------------------------------------------------------------------------- disegno
  function init() {
    try {
      gl = cvGL.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true }) || cvGL.getContext('experimental-webgl');
      if (!gl) return false;
      const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      buildSphere();
      furTex = gl.createTexture();
      const fi = new Image(); fi.onload = () => { gl.bindTexture(gl.TEXTURE_2D, furTex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fi); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); furReady = true; for (const k in frames) delete frames[k]; };
      fi.src = 'art/fur.jpg';
      // la dimensione 512 non è potenza di due per l'altezza: la texture del pelo è 512x512, va bene
      return true;
    } catch (e) { console.warn('3D non disponibile', e); return false; }
  }

  function drawPose(name, step) {
    pose(name, step);
    const yaw = rotY(YAW);
    const cam = [0.10, 0.62, DIST], target = [0.0, 0.52, 0];
    const VP = mmul(mmul(persp(FOV, W / H, 0.5, 20), lookAt(cam, target, [0, 1, 0])), mmul(trans(0, 0, 0), mmul(rotZ(name === 'jump' ? 0.0 : 0), yaw)));
    // mesh unita
    const stride = 15, n = sphere.pos.length;
    const data = new Float32Array(parts.length * n * stride), index = new Uint16Array(parts.length * sphere.idx.length);
    let o = 0, io = 0;
    parts.forEach((p, pi) => {
      const [ex, ey, ez] = p.B, [rx, ry, rz] = p.r;
      for (let v = 0; v < n; v++) {
        let [ux, uy, uz, tu, tv] = sphere.pos[v];
        if (p.deform === 'ear') { const k = 1 - 0.78 * Math.max(0, Math.min(1, (ux + 0.1) / 1.1)); uy *= 1; uz *= k; ux *= (0.4 + 0.6 * k); }
        const loc = [ux, uy, uz];
        const wx = p.c[0] + ex[0] * rx * ux + ey[0] * ry * uy + ez[0] * rz * uz;
        const wy = p.c[1] + ex[1] * rx * ux + ey[1] * ry * uy + ez[1] * rz * uz;
        const wz = p.c[2] + ex[2] * rx * ux + ey[2] * ry * uy + ez[2] * rz * uz;
        const nx = ex[0] * ux / rx + ey[0] * uy / ry + ez[0] * uz / rz, ny = ex[1] * ux / rx + ey[1] * uy / ry + ez[1] * uz / rz, nz = ex[2] * ux / rx + ey[2] * uy / ry + ez[2] * uz / rz;
        const nl = Math.hypot(nx, ny, nz) || 1;
        // rotazione di insieme (vista 3/4)
        const wp = xf(yaw, [wx, wy, wz]), wn = [yaw[0] * nx / nl + yaw[4] * ny / nl + yaw[8] * nz / nl, yaw[1] * nx / nl + yaw[5] * ny / nl + yaw[9] * nz / nl, yaw[2] * nx / nl + yaw[6] * ny / nl + yaw[10] * nz / nl];
        data.set([wp[0], wp[1], wp[2], wn[0], wn[1], wn[2], tu, tv, loc[0], loc[1], loc[2], p.id, p.freq, p.fur, 0], o); o += stride;
      }
      for (let i = 0; i < sphere.idx.length; i++) index[io++] = sphere.idx[i] + pi * n;
    });
    const vb = gl.createBuffer(), ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
    gl.useProgram(prog);
    const at = (name, size, off) => { const l = gl.getAttribLocation(prog, name); if (l < 0) return; gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride * 4, off * 4); };
    at('aPos', 3, 0); at('aNrm', 3, 3); at('aUV', 2, 6); at('aLoc', 3, 8); at('aPart', 4, 11);
    gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'uVP'), false, new Float32Array(VP));
    gl.uniform1f(gl.getUniformLocation(prog, 'uFurLen'), 0.026);
    gl.uniform3fv(gl.getUniformLocation(prog, 'uEye'), new Float32Array(cam));
    gl.uniform1f(gl.getUniformLocation(prog, 'uHasFur'), furReady ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, furTex); gl.uniform1i(gl.getUniformLocation(prog, 'uFur'), 0);
    gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const us = gl.getUniformLocation(prog, 'uShell');
    for (let s = 0; s < SHELLS; s++) {
      gl.uniform1f(us, s / (SHELLS - 1));
      gl.depthMask(s === 0);
      gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    }
    gl.depthMask(true);
    gl.deleteBuffer(vb); gl.deleteBuffer(ib);
    // copia su un canvas 2D (il canvas WebGL viene riusato)
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    out.getContext('2d').drawImage(cvGL, 0, 0);
    return out;
  }

  function frame(name, step) {
    if (!ok) return null;
    const key = name + ':' + step;
    if (frames[key]) return frames[key];
    try { return (frames[key] = drawPose(name, step)); } catch (e) { console.warn('3D: errore', e); ok = false; return null; }
  }

  // Punto di appoggio a terra e scala (pixel per unità del mondo 3D), ricavati dalla stessa proiezione.
  const proj = (p) => {
    const yaw = rotY(YAW), cam = [0.10, 0.62, DIST], VP = mmul(persp(FOV, W / H, 0.5, 20), lookAt(cam, [0, 0.52, 0], [0, 1, 0]));
    const q = xf(yaw, p), x = VP[0] * q[0] + VP[4] * q[1] + VP[8] * q[2] + VP[12], y = VP[1] * q[0] + VP[5] * q[1] + VP[9] * q[2] + VP[13], w = VP[3] * q[0] + VP[7] * q[1] + VP[11] * q[2] + VP[15];
    return [(x / w * 0.5 + 0.5) * W, (1 - (y / w * 0.5 + 0.5)) * H];
  };

  // Stampa nel gioco: (x, y) = piedi al suolo, h = altezza dell'orecchio da terra in unità di gioco.
  function draw(g, x, y, h, name, step, dir, kit) {
    if (kit) h *= kit;
    const f = frame(name, name === 'walk' ? ((step | 0) % 8 + 8) % 8 : (name === 'idle' ? ((step * 3) | 0) % 8 : 0));
    if (!f) return false;
    const foot = proj([-0.02, 0, 0]), top = proj([0.55, 1.12, 0]);
    const sc = h / Math.abs(foot[1] - top[1]) * 1.0;
    g.save(); g.translate(x, y); g.scale(dir < 0 ? -sc : sc, sc);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(f, -foot[0], -foot[1], W, H);
    g.restore();
    return true;
  }

  ok = init();
  // Si preparano i fotogrammi con calma, mentre il gioco è sul menu, per non rallentare la prima partita.
  const warm = () => {
    if (!ok) return;
    const list = []; for (let i = 0; i < 8; i++) list.push(['walk', i], ['idle', i]); list.push(['jump', 0], ['fall', 0]);
    let i = 0; const step = () => { if (!ok || i >= list.length) return; frame(list[i][0], list[i][1]); i++; setTimeout(step, 30); };
    setTimeout(step, 1200);
  };
  warm();
  window.Art3D = { get ok() { return ok; }, frame, draw, proj, W, H };
})();

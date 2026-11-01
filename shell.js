// Console Pocket Color: avvio, catalogo, controlli, sensori, vibrazione e suono.
// Ogni gioco è una cartuccia registrata con registerGame({ id, title, color, blurb, inputs, size, create(api) }).
(() => {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), g = cv.getContext('2d');
  const menuEl = $('menu'), bootEl = $('boot');
  const games = [];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const ls = {
    get(k, d) { try { const v = localStorage.getItem('pc:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pc:' + k, JSON.stringify(v)); } catch (e) {} },
  };

  let mode = 'boot', inst = null, cur = null, sel = 0, launching = false;
  const held = {};

  // Vibrazione: navigator.vibrate dove c'è, altrimenti l'interruttore nascosto (iPhone, iOS 17.4+).
  const hapLabel = $('hapLabel');
  let lastHap = 0;
  const haptic = (ms = 10) => {
    const now = performance.now();
    if (now - lastHap < 25) return;
    lastHap = now;
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
      else hapLabel.click();
    } catch (e) {}
  };

  // Suono
  let ac = null, muted = ls.get('mute', false);
  const audioUnlock = () => {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
    } catch (e) {}
  };
  const beep = (f = 440, d = 0.06, type = 'square', v = 0.04) => {
    if (muted || !ac) return;
    try {
      const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime;
      o.type = type; o.frequency.value = f;
      gn.gain.setValueAtTime(v, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + d);
    } catch (e) {}
  };

  // Inclinazione: giroscopio dell'iPhone; senza sensori ripiega sulla croce direzionale.
  const T = { seen: false, g: 0, b: 0, g0: null, b0: null, on: false };
  const onOri = e => {
    if (e.gamma == null || e.beta == null) return;
    T.seen = true; T.g = e.gamma; T.b = e.beta;
    if (T.g0 === null) { T.g0 = T.g; T.b0 = T.b; }
  };
  const enableMotion = async () => {
    if (T.on) return true;
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') return false;
      }
      addEventListener('deviceorientation', onOri);
      T.on = true;
      return true;
    } catch (e) { return false; }
  };
  const tilt = {
    get sensor() { return T.seen; },
    calibrate() { if (T.seen) { T.g0 = T.g; T.b0 = T.b; } },
    get x() { return T.seen ? clamp((T.g - T.g0) / 25, -1, 1) : (held.right ? 1 : 0) - (held.left ? 1 : 0); },
    get y() { return T.seen ? clamp((T.b - T.b0) / 25, -1, 1) : (held.down ? 1 : 0) - (held.up ? 1 : 0); },
  };

  // Schermo sempre acceso durante il gioco
  let wake = null;
  const keepAwake = async () => {
    try {
      if ('wakeLock' in navigator && !wake) {
        wake = await navigator.wakeLock.request('screen');
        wake.addEventListener('release', () => { wake = null; });
      }
    } catch (e) {}
  };
  const letSleep = () => { try { if (wake) wake.release(); } catch (e) {} wake = null; };

  const apiFor = def => ({
    cv, g, w: cv.width, h: cv.height, held, tilt, haptic, beep, goMenu: () => toMenu(),
    store: { get: (k, d) => ls.get(def.id + ':' + k, d), set: (k, v) => ls.set(def.id + ':' + k, v) },
  });

  // Catalogo
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  const HOT = { INCLINA: 1, SWIPE: 1, FLICK: 1 };

  const renderMenu = () => {
    const tip = isIOS && !standalone()
      ? '<p class="tip">Per giocare a schermo intero: tocca Condividi, poi «Aggiungi alla schermata Home».</p>' : '';
    menuEl.innerHTML = `<header><h1>CATALOGO</h1><button class="snd" id="snd">${muted ? 'SUONO OFF' : 'SUONO ON'}</button></header>${tip}` +
      games.map((d, i) => {
        const rec = ls.get(d.id + ':hi', 0);
        return `<button class="cart${i === sel ? ' sel' : ''}" data-i="${i}" style="--c:${d.color}">
          <span class="tab"></span><span class="title">${d.title}</span><span class="rec">${rec ? 'RECORD ' + rec : ''}</span>
          <span class="desc">${d.blurb}</span>
          <span class="chips">${d.inputs.map(t => `<i${HOT[t] ? ' class="hot"' : ''}>${t}</i>`).join('')}</span></button>`;
      }).join('');
  };
  menuEl.addEventListener('click', e => {
    const snd = e.target.closest('#snd');
    if (snd) { muted = !muted; ls.set('mute', muted); audioUnlock(); snd.textContent = muted ? 'SUONO OFF' : 'SUONO ON'; beep(660, 0.05); return; }
    const c = e.target.closest('.cart');
    if (c) { sel = +c.dataset.i; launch(games[sel]); }
  });
  const markSel = () => {
    menuEl.querySelectorAll('.cart').forEach((c, i) => c.classList.toggle('sel', i === sel));
    const c = menuEl.querySelector('.cart.sel'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'nearest' });
  };

  const toMenu = () => {
    if (inst && inst.destroy) inst.destroy();
    inst = null; cur = null; mode = 'menu';
    letSleep();
    cv.classList.add('off'); menuEl.classList.remove('off');
    renderMenu();
  };

  const launch = async def => {
    if (launching || !def) return;
    launching = true;
    audioUnlock();
    try {
      if (def.tilt) await enableMotion();
      cv.width = def.size[0]; cv.height = def.size[1];
      cv.style.aspectRatio = def.size[0] + ' / ' + def.size[1];
      cv.classList.remove('off'); menuEl.classList.add('off');
      cur = def; mode = 'game';
      for (const k in held) if (k !== 'a' && k !== 'start') delete held[k];
      tilt.calibrate();
      inst = def.create(apiFor(def));
      keepAwake();
      beep(880, 0.08); haptic(8);
    } finally { launching = false; }
  };

  // Input
  const press = k => {
    if (held[k]) return;
    held[k] = true;
    audioUnlock();
    if (mode === 'boot') { endBoot(); return; }
    if (mode === 'menu') {
      if (k === 'up' || k === 'left') { sel = (sel + games.length - 1) % games.length; markSel(); beep(520, 0.03); }
      else if (k === 'down' || k === 'right') { sel = (sel + 1) % games.length; markSel(); beep(520, 0.03); }
      else if (k === 'a' || k === 'start') launch(games[sel]);
    } else if (mode === 'game' && inst && inst.onPress) inst.onPress(k);
  };
  const release = k => {
    if (!held[k]) return;
    delete held[k];
    if (mode === 'game' && inst && inst.onRelease) inst.onRelease(k);
  };

  const KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'up',
    ' ': 'a', x: 'a', X: 'a', z: 'b', Z: 'b', Enter: 'start', p: 'start', P: 'start', Escape: 'select', r: 'select', R: 'select',
  };
  addEventListener('keydown', e => {
    if (e.key === 'm' || e.key === 'M' || e.key === 'Backspace') { e.preventDefault(); if (mode === 'game') toMenu(); return; }
    const k = KEYS[e.key]; if (!k) return;
    e.preventDefault(); if (!e.repeat) press(k);
  });
  addEventListener('keyup', e => { const k = KEYS[e.key]; if (k) release(k); });
  const hide = () => { if (mode === 'game' && inst && inst.onHide) inst.onHide(); };
  addEventListener('blur', () => { for (const k in held) delete held[k]; hide(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide();
    else if (mode === 'game') keepAwake();
  });

  document.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('on'); press(k); });
    const up = () => { b.classList.remove('on'); release(k); };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
  });
  $('home').addEventListener('click', () => { if (mode === 'game') toMenu(); });
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Croce direzionale: un'unica superficie, si può far scivolare il dito da una direzione all'altra.
  const dpad = $('dpad');
  const dirBtn = {};
  dpad.querySelectorAll('[data-dir]').forEach(b => { dirBtn[b.dataset.dir] = b; });
  let dir = null, dpadId = null;
  const setDir = d => {
    if (d === dir) return;
    if (dir) { release(dir); dirBtn[dir].classList.remove('on'); }
    dir = d;
    if (dir) { press(dir); dirBtn[dir].classList.add('on'); haptic(4); }
  };
  const aim = e => {
    const r = dpad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.12) return setDir(null);
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (ay > ax * 1.2) setDir(dy < 0 ? 'up' : 'down');
    else if (ax > ay * 1.2) setDir(dx < 0 ? 'left' : 'right');
  };
  const dpadEnd = e => { if (e.pointerId === dpadId) { dpadId = null; setDir(null); } };
  dpad.addEventListener('pointerdown', e => { e.preventDefault(); dpad.setPointerCapture(e.pointerId); dpadId = e.pointerId; aim(e); });
  dpad.addEventListener('pointermove', e => { if (e.pointerId === dpadId) aim(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => dpad.addEventListener(t, dpadEnd));

  // Tocco diretto sullo schermo: coordinate in pixel del canvas del gioco.
  const ptr = type => e => {
    if (mode !== 'game' || !inst || !inst.onPointer) return;
    e.preventDefault();
    if (type === 'down') { try { cv.setPointerCapture(e.pointerId); } catch (err) {} }
    const r = cv.getBoundingClientRect();
    inst.onPointer({
      type: type === 'cancel' ? 'up' : type, cancelled: type === 'cancel', id: e.pointerId, t: e.timeStamp,
      x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height,
    });
  };
  ['down', 'move', 'up', 'cancel'].forEach(t => cv.addEventListener('pointer' + t, ptr(t)));

  // Su telefono il primo tocco porta la pagina a schermo intero (iPhone: solo da "Aggiungi a Home").
  const goFull = () => {
    if (!matchMedia('(pointer: coarse)').matches || document.fullscreenElement || standalone()) return;
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    try {
      Promise.resolve(req.call(el, { navigationUI: 'hide' }))
        .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('portrait'))
        .catch(() => {});
    } catch (e) {}
  };
  document.addEventListener('pointerup', goFull);

  // Colore della scocca: un tocco sul nome cambia colore.
  const SHELLS = ['grape', 'teal', 'berry', 'dandelion', 'kiwi'];
  const setShell = n => { document.body.dataset.shell = n; ls.set('shell', n); };
  $('brand').addEventListener('click', () => {
    setShell(SHELLS[(SHELLS.indexOf(document.body.dataset.shell) + 1) % SHELLS.length]);
    beep(700, 0.05); haptic(8);
  });

  // Avvio
  const COLORS = ['#e5413b', '#f58a25', '#f5d31c', '#4cc24a', '#25c4f0', '#3d5fe0', '#a655b8'];
  const buildLogo = () => {
    $('logo').innerHTML = 'POCKET COLOR'.split('').map((c, i) =>
      `<span style="color:${COLORS[i % COLORS.length]};animation-delay:${i * 0.05}s">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  };
  let bootTimer = 0;
  const endBoot = () => {
    if (mode !== 'boot') return;
    clearTimeout(bootTimer);
    mode = 'menu';
    bootEl.classList.add('gone');
    beep(1046, 0.08); beep(1318, 0.12);
  };
  bootEl.addEventListener('pointerdown', () => { audioUnlock(); endBoot(); });

  // Ciclo
  let last = performance.now();
  const frame = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mode === 'game' && inst) {
      inst.update(dt);
      g.setTransform(1, 0, 0, 1, 0, 0);
      inst.render(g);
    }
    requestAnimationFrame(frame);
  };

  window.registerGame = def => games.push(def);
  window.Shell = {
    start() {
      setShell(ls.get('shell', 'grape'));
      buildLogo();
      cv.classList.add('off');
      renderMenu();
      bootTimer = setTimeout(endBoot, 2600);
      requestAnimationFrame(frame);
    },
    // Aggancio per le prove automatiche.
    press, release, launch, toMenu, games, get mode() { return mode; }, get inst() { return inst; },
  };
})();

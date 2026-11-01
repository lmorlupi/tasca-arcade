// Tasca Arcade: avvio, catalogo, controlli, sensori, vibrazione e suono.
// Ogni gioco è una cartuccia registrata con registerGame({ id, title, color, blurb, inputs, size, create(api) }).
(() => {
  const $ = id => document.getElementById(id);
  const cv = $('cv'), g = cv.getContext('2d');
  const menuEl = $('menu'), bootEl = $('boot'), screenEl = $('screen');
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
      if (navigator.vibrate) { if (!navigator.userActivation || navigator.userActivation.hasBeenActive) navigator.vibrate(ms); }
      else hapLabel.click();
    } catch (e) {}
  };

  // Suono
  let ac = null, muted = ls.get('mute', false);
  // Su iPhone l'interruttore "silenzioso" azzera il Web Audio: si passa alla categoria "riproduzione" e si tiene
  // acceso un breve file muto in loop, cosi' i suoni dei giochi si sentono anche a telefono silenzioso.
  let keepAlive = null;
  const audioUnlock = () => {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      if (!keepAlive) { keepAlive = new Audio('data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA=='); keepAlive.loop = true; keepAlive.volume = 0.01; keepAlive.setAttribute('playsinline', ''); }
      if (keepAlive.paused) { const pr = keepAlive.play(); if (pr && pr.catch) pr.catch(() => {}); }
    } catch (e) {}
  };
  const beep = (f = 440, d = 0.06, type = 'square', v = 0.04) => {
    if (muted || !ac) return;
    try {
      const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime;
      o.type = type; o.frequency.value = f;
      gn.gain.setValueAtTime(Math.min(0.6, v * 1.7), t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn); gn.connect(ac.destination); o.start(t); o.stop(t + d);
    } catch (e) {}
  };

  // Riscontro dei tasti simulati: si abbassano, la croce si inclina, vibrazione come su quelli veri.
  const dpadEl = $('dpad');
  const lite = (k, on) => {
    document.querySelectorAll('[data-k="' + k + '"],[data-dir="' + k + '"]').forEach(b => b.classList.toggle('on', on));
    if (k === 'left' || k === 'right' || k === 'up' || k === 'down') {
      // La croce si inclina verso quello che premi, anche in diagonale.
      const rx = (held.up ? 1 : 0) - (held.down ? 1 : 0), ry = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      dpadEl.style.setProperty('--rx', rx * 10 + 'deg');
      dpadEl.style.setProperty('--ry', ry * 10 + 'deg');
      dpadEl.classList.toggle('down', !!(rx || ry));
    }
  };
  const feel = (k, down) => {
    const pad = k === 'left' || k === 'right' || k === 'up' || k === 'down';
    haptic(down ? (pad ? 5 : 10) : 3);
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

  // Alta definizione. Questa funzione è self-contained: lo stesso testo gira anche dentro la scatola dei giochi di terzi.
  function hiResFactory(cv, cw, ch) {
    var g = cv.getContext('2d'), k = 1, cache = {};
    var gP = new Proxy(g, {
      get: function (t, p) {
        if (p === 'setTransform') return function (a, b, c, d, e, f) { return t.setTransform(a * k, b * k, c * k, d * k, e * k, f * k); };
        if (p === 'resetTransform') return function () { t.setTransform(k, 0, 0, k, 0, 0); };
        if (p === 'getTransform') return function () { var m = t.getTransform(); return new DOMMatrix([m.a / k, m.b / k, m.c / k, m.d / k, m.e / k, m.f / k]); };
        if (p === 'canvas') return cvP;
        var v = t[p];
        if (typeof v === 'function') return cache[p] || (cache[p] = v.bind(t));
        return v;
      },
      set: function (t, p, v) { t[p] = v; return true; },
    });
    var cvP = new Proxy(cv, {
      get: function (t, p) {
        if (p === 'width') return cw;
        if (p === 'height') return ch;
        if (p === 'getContext') return function () { return gP; };
        var v = t[p];
        return typeof v === 'function' ? v.bind(t) : v;
      },
      set: function (t, p, v) { t[p] = v; return true; },
    });
    return {
      cvP: cvP, gP: gP, cw: cw, ch: ch,
      get k() { return k; },
      setK: function (nk) {
        k = nk; cv.width = Math.max(1, Math.round(cw * k)); cv.height = Math.max(1, Math.round(ch * k));
        g.setTransform(k, 0, 0, k, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      },
      base: function () { g.setTransform(k, 0, 0, k, 0, 0); },
    };
  }
  let HR = null;   // alta definizione del gioco in corso
  // Quanti pixel veri per ogni unità del gioco: quelli dello schermo del telefono (fino a 3x), senza esagerare.
  const pickK = (def, cw, ch) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const css = Math.min(screenEl.clientWidth / cw, screenEl.clientHeight / ch) || 1;
    let k = ls.get('hq', true) ? dpr * css : 1;
    if (def.pixel) k = Math.floor(k + 0.02);          // pixel art: multipli interi, bordi netti
    return Math.max(1, Math.min(k, Math.sqrt(4.6e6 / (cw * ch)), 4));
  };
  const apiFor = def => ({
    cv: HR.cvP, g: HR.gP, w: HR.cw, h: HR.ch, held, tilt, haptic, beep, goMenu: () => toMenu(),
    store: { get: (k, d) => ls.get(def.id + ':' + k, d), set: (k, v) => ls.set(def.id + ':' + k, v) },
  });


  // ======================================================================================================
  // Giochi di terzi (importati dall'app). Girano in una scatola isolata: un iframe con sandbox="allow-scripts"
  // (origine "opaca": nessun accesso a localStorage, cache o file della console) e una CSP che vieta ogni
  // collegamento di rete, worker, form e frame. Con la console parla solo per messaggi controllati.
  // ======================================================================================================

  // Questa funzione NON gira qui: il suo testo viene messo dentro la scatola, dove fa da "console in miniatura".
  function sdkMain(hiResFactory) {
    var post = function (m) { parent.postMessage(m, '*'); };
    var def = null, inst = null, running = false, last = 0;
    var held = {}, tiltS = { x: 0, y: 0, sensor: false }, store = {};
    var cv = document.createElement('canvas'), hr = null, LW = 1, LH = 1;
    document.body.appendChild(cv);
    window.registerGame = function (d) { if (!def && d && typeof d === 'object') def = d; };
    window.addEventListener('error', function (e) { post({ t: 'error', msg: String(e.message || 'errore').slice(0, 120) }); });
    var api = {
      cv: null, g: null, w: 0, h: 0, held: held,
      tilt: { get x() { return tiltS.x; }, get y() { return tiltS.y; }, get sensor() { return tiltS.sensor; }, calibrate: function () { post({ t: 'calibrate' }); } },
      haptic: function (ms) { post({ t: 'haptic', ms: +ms || 10 }); },
      beep: function (f, d, type, v) { post({ t: 'beep', f: +f, d: +d, type: type, v: +v }); },
      goMenu: function () { post({ t: 'menu' }); },
      store: {
        get: function (k, d) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : d; },
        set: function (k, v) { store[k] = v; post({ t: 'store', k: String(k), v: v }); },
      },
    };
    function loop(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      try { hr.base(); inst.update(dt); inst.render(hr.gP); }
      catch (err) { running = false; post({ t: 'error', msg: String(err && err.message).slice(0, 120) }); return; }
      requestAnimationFrame(loop);
    }
    function begin() {
      try { inst = def.create(api); } catch (err) { post({ t: 'error', msg: 'create: ' + String(err && err.message).slice(0, 100) }); return; }
      running = true; last = performance.now(); requestAnimationFrame(loop);
      post({ t: 'hb' }); setInterval(function () { post({ t: 'hb' }); }, 1000);
    }
    var ptr = function (type) {
      return function (e) {
        if (!inst || !inst.onPointer) return;
        e.preventDefault();
        if (type === 'down') { try { cv.setPointerCapture(e.pointerId); } catch (x) {} }
        var r = cv.getBoundingClientRect(), k = Math.min(r.width / LW, r.height / LH);
        var ox = r.left + (r.width - LW * k) / 2, oy = r.top + (r.height - LH * k) / 2;
        inst.onPointer({ type: type === 'cancel' ? 'up' : type, cancelled: type === 'cancel', id: e.pointerId, t: e.timeStamp, x: (e.clientX - ox) / k, y: (e.clientY - oy) / k });
      };
    };
    ['down', 'move', 'up', 'cancel'].forEach(function (t) { cv.addEventListener('pointer' + t, ptr(t)); });
    document.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (t) { document.addEventListener(t, function (e) { e.preventDefault(); }); });
    window.addEventListener('message', function (e) {
      if (e.source !== parent) return;
      var m = e.data; if (!m || typeof m !== 'object') return;
      if (m.t === 'init') {
        store = m.store || {};
        LW = m.w; LH = m.h; hr = hiResFactory(cv, m.w, m.h); hr.setK(m.k || 1);
        api.cv = hr.cvP; api.g = hr.gP; api.w = m.w; api.h = m.h;
        if (m.pixel) cv.style.imageRendering = 'pixelated';
        try { var s = document.createElement('script'); s.textContent = m.code; document.head.appendChild(s); }
        catch (err) { post({ t: 'error', msg: 'codice non valido' }); return; }
        if (!def) { post({ t: 'invalid' }); return; }
        var meta = {};
        ['id', 'title', 'author', 'color', 'blurb', 'inputs', 'size', 'bg', 'flexH', 'pixel', 'tilt', 'license'].forEach(function (k) { if (def[k] !== undefined) meta[k] = def[k]; });
        post({ t: 'registered', meta: meta });
        if (m.mode === 'play') begin();
      } else if (m.t === 'state') {
        for (var k in held) delete held[k];
        for (var k2 in m.held) if (m.held[k2]) held[k2] = true;
        tiltS = m.tilt || tiltS;
      } else if (inst) {
        if (m.t === 'press' && inst.onPress) inst.onPress(String(m.k));
        else if (m.t === 'release' && inst.onRelease) inst.onRelease(String(m.k));
        else if (m.t === 'hide' && inst.onHide) inst.onHide();
      }
    });
    post({ t: 'ready' });
  }

  const sandboxDoc = () => '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src \'none\'; frame-src \'none\'; worker-src \'none\'; object-src \'none\'; form-action \'none\'; base-uri \'none\'">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">'
    + '<style>html,body{margin:0;height:100%;background:transparent;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none}'
    + 'canvas{display:block;width:100vw;height:100vh;object-fit:contain;touch-action:none}</style></head>'
    + '<body><script>(' + sdkMain.toString() + ')(' + hiResFactory.toString() + ');<\/script></body></html>';

  const MAX_CODE = 400000, MAX_COMMUNITY = 12;
  const hexOk = c => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c);
  // I dati dichiarati da un gioco di terzi vengono ripuliti prima di arrivare al catalogo.
  const cleanMeta = m => {
    if (!m || typeof m !== 'object') return null;
    const id = String(m.id || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
    const title = String(m.title || '').slice(0, 24);
    const sz = Array.isArray(m.size) ? m.size.map(Number) : [];
    if (!id || !title || sz.length !== 2 || !(sz[0] >= 100 && sz[0] <= 1200 && sz[1] >= 100 && sz[1] <= 2400)) return null;
    return {
      id: 'c-' + id, title, author: String(m.author || '').slice(0, 40), color: hexOk(m.color) ? m.color : '#8a8a99',
      blurb: String(m.blurb || '').slice(0, 240), inputs: (Array.isArray(m.inputs) ? m.inputs : []).slice(0, 5).map(s => String(s).slice(0, 18)),
      size: sz, bg: hexOk(m.bg) ? m.bg : '', flexH: !!m.flexH, pixel: !!m.pixel, tilt: !!m.tilt, license: String(m.license || '').slice(0, 40),
    };
  };

  let community = ls.get('community', []);
  const cmStore = id => ls.get('cm:' + id, {});
  const communityDef = c => Object.assign({}, c.meta, { community: true, code: c.code, source: c.source || '' });
  const saveCommunity = () => ls.set('community', community);

  // Avvia (o analizza) un gioco nella scatola. Restituisce i comandi che la console usa come per un gioco normale.
  const makeSandbox = (opts, onEvent) => {
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts');
    f.setAttribute('referrerpolicy', 'no-referrer');
    f.setAttribute('allow', '');
    f.setAttribute('title', 'Gioco di terzi');
    f.className = opts.hidden ? 'sandbox hidden' : 'sandbox';
    f.srcdoc = sandboxDoc();
    (opts.hidden ? document.body : screenEl).appendChild(f);
    const send = m => { try { f.contentWindow.postMessage(m, '*'); } catch (e) {} };
    const onMsg = e => {
      if (e.source !== f.contentWindow) return;           // solo dalla propria scatola
      const m = e.data;
      if (m && typeof m === 'object' && typeof m.t === 'string') onEvent(m, send);
    };
    window.addEventListener('message', onMsg);
    let ready = false;
    const kick = () => { if (ready) return; ready = true; send(Object.assign({ t: 'init' }, opts.init)); };
    f.addEventListener('load', kick);
    return { frame: f, send, destroy() { window.removeEventListener('message', onMsg); f.remove(); } };
  };

  const startSandbox = (def, w, h, k) => {
    const key = def.id;
    let lastHb = performance.now(), beepAt = 0, beepN = 0, storeKeys = 0;
    const box = makeSandbox({ init: { mode: 'play', code: def.code, w, h, k, pixel: !!def.pixel, store: cmStore(key) } }, (m) => {
      switch (m.t) {
        case 'hb': lastHb = performance.now(); break;
        case 'haptic': haptic(clamp(+m.ms || 10, 1, 80)); break;
        case 'beep': {
          const now = performance.now();
          if (now - beepAt > 1000) { beepAt = now; beepN = 0; }
          if (++beepN > 15) break;
          const type = ['sine', 'square', 'triangle', 'sawtooth'].includes(m.type) ? m.type : 'square';
          beep(clamp(+m.f || 440, 40, 4000), clamp(+m.d || 0.06, 0.01, 0.5), type, clamp(+m.v || 0.04, 0.005, 0.08));
          break;
        }
        case 'store': {
          const k = String(m.k).slice(0, 40), cur = cmStore(key);
          if (!(k in cur) && Object.keys(cur).length >= 30) break;
          let s; try { s = JSON.stringify(m.v); } catch (e) { break; }
          if (s === undefined || s.length > 8000) break;
          cur[k] = JSON.parse(s); ls.set('cm:' + key, cur);
          break;
        }
        case 'calibrate': tilt.calibrate(); break;
        case 'menu': toMenu(); break;
        case 'error': console.error('Errore nel gioco di terzi', def.id, m.msg); toMenu(); setStatus('ERRORE NEL GIOCO ' + def.title + ': TORNO AL CATALOGO', true); break;
        case 'invalid': toMenu(); setStatus('GIOCO NON VALIDO: ' + def.title, true); break;
        default: break;
      }
    });
    return {
      update() {
        box.send({ t: 'state', held: Object.assign({}, held), tilt: { x: tilt.x, y: tilt.y, sensor: tilt.sensor } });
        if (performance.now() - lastHb > 6000) { toMenu(); setStatus('IL GIOCO NON RISPONDE: ' + def.title, true); }
      },
      render() {},
      onPress(k) { box.send({ t: 'press', k }); },
      onRelease(k) { box.send({ t: 'release', k }); },
      onHide() { box.send({ t: 'hide' }); },
      destroy() { box.destroy(); },
    };
  };

  // Prima di importare: il gioco gira nascosto solo per leggerne titolo, autore, licenza e dimensioni.
  const analyzeCode = code => new Promise(resolve => {
    if (typeof code !== 'string' || !code.trim()) return resolve({ error: 'Il codice è vuoto.' });
    if (code.length > MAX_CODE) return resolve({ error: 'Il file è troppo grande (massimo 400 KB).' });
    let done = false, box = null;
    const end = r => { if (done) return; done = true; clearTimeout(timer); if (box) box.destroy(); resolve(r); };
    const timer = setTimeout(() => end({ error: 'Il gioco non risponde: non sembra un gioco valido.' }), 4000);
    box = makeSandbox({ hidden: true, init: { mode: 'analyze', code, w: 360, h: 640, store: {} } }, m => {
      if (m.t === 'registered') { const meta = cleanMeta(m.meta); end(meta ? { meta } : { error: 'Mancano titolo, id o dimensioni valide.' }); }
      else if (m.t === 'error' || m.t === 'invalid') end({ error: m.t === 'invalid' ? 'Il file non registra nessun gioco (manca registerGame).' : 'Errore nel codice: ' + String(m.msg || '') });
    });
  });

  const driveUrl = u => {      // un link "blob" di GitHub diventa il file grezzo
    const m = String(u).match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/);
    return m ? 'https://raw.githubusercontent.com/' + m[1] + '/' + m[2] + '/' + m[3] : u;
  };

  let pending = null;     // gioco controllato e pronto da importare
  const renderImport = (msg) => {
    pending = null;
    const list = community.length ? community.map(c => `<div class="impRow"><span><b>${esc(c.meta.title)}</b><br><small>${esc(c.meta.author || 'autore non indicato')} · ${esc(c.meta.license || 'licenza non dichiarata')}</small></span><button class="snd impDel" data-id="${esc(c.meta.id)}">RIMUOVI</button></div>`).join('') : '<p class="ver">NESSUN GIOCO IMPORTATO.</p>';
    menuEl.innerHTML = `<header><button class="snd" id="impBack">‹ CATALOGO</button><h1>IMPORTA</h1></header>
      <p class="tip">I giochi di terzi girano in una <b>scatola isolata</b>: non hanno rete e non vedono i dati degli altri giochi.
      Importa solo giochi <b>tuoi</b> o con una <b>licenza che lo permette</b>. Non importare giochi commerciali o copie non autorizzate: non funzionerebbero e non è consentito.</p>
      <label class="lab" for="impUrl">LINK AL FILE (https)</label>
      <input id="impUrl" type="url" inputmode="url" autocapitalize="off" autocomplete="off" placeholder="https://raw.githubusercontent.com/…/gioco.js">
      <button class="act" id="impFetch">SCARICA</button>
      <label class="lab" for="impCode">OPPURE INCOLLA IL CODICE</label>
      <textarea id="impCode" rows="5" spellcheck="false" autocapitalize="off" autocomplete="off"></textarea>
      <button class="act" id="impCheck">CONTROLLA</button>
      <div id="impOut" class="impOut">${msg ? esc(msg) : ''}</div>
      <h2 class="sub">GIOCHI IMPORTATI (${community.length}/${MAX_COMMUNITY})</h2>${list}`;
  };
  const showPending = (meta, code, source) => {
    pending = { meta, code, source };
    const out = document.getElementById('impOut'); if (!out) return;
    const clash = community.some(c => c.meta.id === meta.id);
    out.innerHTML = `<div class="impCard" style="--c:${esc(meta.color)}"><b>${esc(meta.title)}</b><br>
      <span>${esc(meta.blurb || 'Nessuna descrizione.')}</span><br>
      <small>AUTORE: ${esc(meta.author || 'non indicato')} · LICENZA: ${meta.license ? esc(meta.license) : '<em class="warn">NON DICHIARATA</em>'} · ${Math.round(code.length / 1024)} KB</small>
      ${meta.license ? '' : '<p class="warn">Senza licenza dichiarata non sai se puoi usarlo: importalo solo se è tuo o hai il permesso dell\'autore.</p>'}
      <label class="chk"><input type="checkbox" id="impOk"> Ho il diritto di usare questo gioco e capisco che è di terzi e non verificato.</label>
      <button class="act" id="impAdd" disabled>${clash ? 'SOSTITUISCI' : 'IMPORTA'}</button></div>`;
  };
  const doCheck = async (code, source) => {
    const out = document.getElementById('impOut'); if (out) out.textContent = 'CONTROLLO IN CORSO…';
    const r = await analyzeCode(code);
    if (r.error) { if (out) out.innerHTML = '<span class="warn">' + esc(r.error) + '</span>'; return; }
    if (BUILTIN_IDS.has(r.meta.id)) { if (out) out.innerHTML = '<span class="warn">Esiste già un gioco con questo nome.</span>'; return; }
    showPending(r.meta, code, source);
  };
  const importClick = async e => {
    const t = e.target;
    if (t.closest('#imp')) { renderImport(); return true; }
    if (t.closest('#impBack')) { renderMenu(); return true; }
    if (t.closest('#impFetch')) {
      const url = driveUrl((document.getElementById('impUrl').value || '').trim());
      const out = document.getElementById('impOut');
      if (!/^https:\/\//i.test(url)) { out.innerHTML = '<span class="warn">Serve un link che inizia con https://</span>'; return true; }
      out.textContent = 'SCARICO…';
      try {
        const res = await fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const code = await res.text();
        document.getElementById('impCode').value = code.length > 20000 ? code.slice(0, 20000) + '\n/* … */' : code;
        await doCheck(code, url);
      } catch (err) { out.innerHTML = '<span class="warn">Download non riuscito (il sito deve permettere l\'accesso da altre pagine). Prova con un link «raw» di GitHub o incolla il codice.</span>'; }
      return true;
    }
    if (t.closest('#impCheck')) {
      const code = document.getElementById('impCode').value;
      await doCheck(code, 'incollato');
      return true;
    }
    if (t.closest('#impAdd')) {
      if (!pending || !document.getElementById('impOk').checked) return true;
      const i = community.findIndex(c => c.meta.id === pending.meta.id);
      if (i < 0 && community.length >= MAX_COMMUNITY) { document.getElementById('impOut').innerHTML = '<span class="warn">Hai già ' + MAX_COMMUNITY + ' giochi importati: rimuovine uno.</span>'; return true; }
      const entry = { meta: pending.meta, code: pending.code, source: pending.source, added: Date.now() };
      if (i >= 0) community[i] = entry; else community.push(entry);
      saveCommunity(); syncCommunityGames(); beep(988, 0.1); haptic(15);
      renderMenu(); setStatus('IMPORTATO: ' + entry.meta.title, true);
      return true;
    }
    const del = t.closest('.impDel');
    if (del) {
      const id = del.dataset.id;
      community = community.filter(c => c.meta.id !== id); saveCommunity();
      try { localStorage.removeItem('pc:cm:' + id); } catch (err) {}
      syncCommunityGames(); renderImport('GIOCO RIMOSSO.');
      return true;
    }
    return false;
  };
  const BUILTIN_IDS = new Set();
  const syncCommunityGames = () => {
    for (let i = games.length - 1; i >= 0; i--) if (games[i].community) games.splice(i, 1);
    community.forEach(c => games.push(communityDef(c)));
    sel = Math.min(sel, Math.max(0, games.length - 1));
  };

  // Catalogo
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = () => navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
  const HOT = { INCLINA: 1, SWIPE: 1, FLICK: 1 };

  // Offline e aggiornamenti: il service worker tiene tutto in cache; "AGGIORNA" controlla se c'è una versione nuova
  // (con eventuali giochi nuovi) e, se la trova, la scarica e ricarica l'app dal catalogo.
  const verEl = () => document.getElementById('ver');
  let pinned = false;   // un messaggio d'errore resta finché non si ridisegna il catalogo
  const setStatus = (t, pin) => { pinned = !!pin; const e = verEl(); if (e) e.textContent = t; };
  let verTag = '';
  const showVersion = async () => {
    try {
      const keys = await caches.keys();
      const k = keys.filter(n => /^arcade-v\d+/.test(n)).sort().pop();
      verTag = k ? k.replace('arcade-', '').toUpperCase() : '';
    } catch (e) {}
    if (pinned) return;
    const online = navigator.onLine;
    setStatus((verTag ? 'VERSIONE ' + verTag + ' · ' : '') + (online ? 'ONLINE' : 'OFFLINE: GIOCHI SALVATI SUL TELEFONO'));
  };
  let lastCheck = 0;
  const checkUpdate = async manual => {
    lastCheck = Date.now();
    if (!('serviceWorker' in navigator)) { if (manual) setStatus('AGGIORNAMENTI NON DISPONIBILI SU QUESTO BROWSER'); return; }
    if (!navigator.onLine) { if (manual) setStatus('SEI OFFLINE: USO LA VERSIONE SALVATA'); return; }
    try {
      if (manual) setStatus('CONTROLLO AGGIORNAMENTI...');
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { if (manual) setStatus('PRIMO SALVATAGGIO IN CORSO: RIPROVA TRA UN ATTIMO'); return; }
      await reg.update();
      await new Promise(r => setTimeout(r, 1800));
      if (reg.installing || reg.waiting) { if (manual) setStatus('SCARICO LA NUOVA VERSIONE...'); }
      else if (manual) { await showVersion(); setStatus('GIÀ AGGIORNATO · ' + (verEl() ? verEl().textContent : '')); }
    } catch (e) { if (manual) setStatus('SERVER NON RAGGIUNGIBILE: USO LA VERSIONE SALVATA'); }
  };
  addEventListener('online', () => { if (mode === 'menu') { showVersion(); checkUpdate(false); } });
  addEventListener('offline', () => { if (mode === 'menu') showVersion(); });

  // I testi dei giochi di terzi finiscono nel catalogo: vanno resi innocui.
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  let avatarData = '';
  const avatarUrl = () => avatarData || (avatarData = window.Art.portrait(160, 'calm').toDataURL('image/png'));
  const renderMenu = () => {
    pinned = false;
    const tip = isIOS && !standalone()
      ? '<p class="tip">Per giocare a schermo intero: tocca Condividi, poi «Aggiungi alla schermata Home».</p>' : '';
    menuEl.innerHTML = `<header><button class="brand" id="brand" aria-label="Cambia colore della scocca">TASCA <b>ARCADE</b></button><span class="tools"><button class="snd" id="col">ASPETTO</button><button class="snd" id="help">AIUTO</button><button class="snd" id="upd">AGGIORNA</button><button class="snd" id="snd">${muted ? 'SUONO OFF' : 'SUONO ON'}</button></span></header><p class="ver" id="ver"></p>${tip}` +
      games.map((d, i) => {
        const rec = d.community ? (cmStore(d.id).hi || 0) : ls.get(d.id + ':hi', 0);
        const avatar = d.art === 'margot' && window.Art ? `<img class="avatar" alt="Margot" src="art/margot-avatar.jpg">` : '';
        return `<button class="cart${i === sel ? ' sel' : ''}${avatar ? ' art' : ''}" data-i="${i}" style="--c:${/^#[0-9a-fA-F]{3,8}$/.test(d.color) ? d.color : '#25c4f0'}">
          <span class="tab"></span>${avatar}<span class="title">${esc(d.title)}</span><span class="rec">${rec ? 'RECORD ' + rec : ''}</span>
          <span class="desc">${esc(d.blurb)}${d.author ? ' <em>di ' + esc(d.author) + '</em>' : ''}</span>
          <span class="chips">${d.community ? '<i class="ext">DI TERZI</i>' : ''}${d.inputs.map(t => `<i${HOT[t] ? ' class="hot"' : ''}>${esc(t)}</i>`).join('')}</span></button>`;
      }).join('') + '<button class="act imp" id="imp">+ IMPORTA UN GIOCO</button><p class="legal">Progetto indipendente, non affiliato né approvato da produttori di console o di videogiochi. I marchi citati appartengono ai rispettivi proprietari. Giochi, grafica e suoni sono originali.</p>';
    showVersion();
  };
  menuEl.addEventListener('change', e => {
    if (e.target.id === 'impOk') { const b = document.getElementById('impAdd'); if (b) b.disabled = !e.target.checked; }
  });
  menuEl.addEventListener('click', async e => {
    if (colorsClick(e)) return;
    if (await importClick(e)) return;
    if (e.target.closest('#brand')) {
      setShell(SHELLS[(SHELLS.indexOf(document.documentElement.dataset.shell) + 1) % SHELLS.length]);
      beep(700, 0.05); haptic(8);
      return;
    }
    if (e.target.closest('#upd')) { checkUpdate(true); return; }
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
    if (window.Shell && window.Shell.reloadOnMenu) { location.reload(); return; }
    if (inst && inst.destroy) inst.destroy();
    inst = null; cur = null; mode = 'menu';
    letSleep();
    cv.classList.add('off'); menuEl.classList.remove('off');
    screenEl.style.background = '';
    renderMenu();
    if (Date.now() - lastCheck > 600000) checkUpdate(false);
  };

  const launch = async def => {
    if (launching || !def) return;
    endBoot();
    launching = true;
    audioUnlock();
    try {
      if (def.tilt) await enableMotion();
      // I giochi "flexH" prendono l'altezza che serve a riempire lo schermo senza fasce ai lati.
      let cw = def.size[0], ch = def.size[1];
      if (def.flexH && screenEl.clientWidth > 0 && screenEl.clientHeight > 0) {
        ch = Math.round(clamp(cw * screenEl.clientHeight / screenEl.clientWidth, cw * (def.flexMin || 1), cw * 2.1));
      }
      HR = hiResFactory(cv, cw, ch);
      if (!def.community) HR.setK(pickK(def, cw, ch));
      cv.style.aspectRatio = cw + ' / ' + ch;
      cv.classList.toggle('px', !!def.pixel);
      screenEl.style.background = def.bg || '';
      cv.classList.remove('off'); menuEl.classList.add('off');
      cur = def; mode = 'game';
      for (const k in held) if (k !== 'a' && k !== 'start') { delete held[k]; lite(k, false); }
      tilt.calibrate();
      if (def.community) { cv.classList.add('off'); }
      try { inst = def.community ? startSandbox(def, cw, ch, pickK(def, cw, ch)) : def.create(apiFor(def)); } catch (e) { console.error('Errore in', def.id, e); inst = null; toMenu(); setStatus('IL GIOCO NON SI AVVIA: ' + def.title, true); return; }
      keepAwake();
      beep(880, 0.08); haptic(8);
    } finally { launching = false; }
  };

  // Input
  const press = k => {
    if (held[k]) return;
    held[k] = true;
    audioUnlock();
    lite(k, true); feel(k, true);
    if (mode === 'boot') { endBoot(); return; }
    if (mode === 'menu') {
      if (k === 'up' || k === 'left') { sel = (sel + games.length - 1) % games.length; markSel(); }
      else if (k === 'down' || k === 'right') { sel = (sel + 1) % games.length; markSel(); }
      else if (k === 'a' || k === 'start') launch(games[sel]);
    } else if (mode === 'game' && inst && inst.onPress) inst.onPress(k);
  };
  const release = k => {
    if (!held[k]) return;
    delete held[k];
    lite(k, false); feel(k, false);
    if (mode === 'game' && inst && inst.onRelease) inst.onRelease(k);
  };

  const KEYS = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'up',
    ' ': 'a', x: 'a', X: 'a', z: 'b', Z: 'b', Enter: 'start', p: 'start', P: 'start', Escape: 'select', r: 'select', R: 'select',
  };
  const typing = e => e.target && e.target.closest && e.target.closest('input, textarea');
  addEventListener('keydown', e => {
    if (typing(e)) return;
    if (e.key === 'm' || e.key === 'M' || e.key === 'Backspace') { e.preventDefault(); if (mode === 'game') toMenu(); return; }
    const k = KEYS[e.key]; if (!k) return;
    e.preventDefault(); if (!e.repeat) press(k);
  });
  addEventListener('keyup', e => { if (typing(e)) return; const k = KEYS[e.key]; if (k) release(k); });
  const hide = () => { if (mode === 'game' && inst && inst.onHide) inst.onHide(); };
  addEventListener('blur', () => { for (const k in held) delete held[k]; hide(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hide();
    else if (mode === 'game') keepAwake();
  });

  document.querySelectorAll('[data-k="select"],[data-k="start"]').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (err) {} press(k); });
    const up = () => release(k);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
  });
  const goHome = () => { if (mode === 'game') toMenu(); };
  $('home').addEventListener('pointerup', goHome);
  $('home').addEventListener('click', goHome);
  document.addEventListener('contextmenu', e => e.preventDefault());

  // iPhone: Safari ignora user-scalable=no. Blocchiamo a mano il doppio tocco e il pizzico, così premere
  // a ripetizione i tasti non fa mai zoom.
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault()));
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouchEnd < 400) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });
  // Fuori dal catalogo ogni tocco ha già i suoi eventi puntatore: fermare il tocco "classico" toglie al
  // browser ogni appiglio per lo zoom del doppio tap (e il click ritardato). Il catalogo resta normale.
  document.addEventListener('touchstart', e => { if (!e.target.closest('.menu')) e.preventDefault(); }, { passive: false });
  document.addEventListener('touchmove', e => { if (e.scale && e.scale !== 1) e.preventDefault(); }, { passive: false });
  document.addEventListener('dblclick', e => e.preventDefault());
  // Se la pagina è rimasta ingrandita da un pizzico precedente, riporta lo zoom a 1 (meglio che si può).
  if (window.visualViewport) {
    let fixing = false;
    visualViewport.addEventListener('resize', () => {
      if (fixing || visualViewport.scale <= 1.02) return;
      const m = document.querySelector('meta[name="viewport"]');
      if (!m) return;
      fixing = true;
      const c = m.content;
      m.content = c.replace('maximum-scale=1', 'maximum-scale=1.01');
      setTimeout(() => { m.content = c; fixing = false; }, 80);
    });
  }

  // Croce direzionale: un'unica superficie. Il dito può scivolare e premere gli angoli per le diagonali.
  const dpad = dpadEl;
  let dpadId = null;
  const padOn = new Set();
  const setDirs = want => {
    for (const d of [...padOn]) if (!want.has(d)) { padOn.delete(d); release(d); }
    for (const d of want) if (!padOn.has(d)) { padOn.add(d); press(d); }
  };
  const aim = e => {
    const r = dpad.getBoundingClientRect(), h = r.width / 2;
    const nx = (e.clientX - (r.left + r.width / 2)) / h, ny = (e.clientY - (r.top + r.height / 2)) / h;
    const ax = Math.abs(nx), ay = Math.abs(ny);
    // Soglie con isteresi: una direzione già premuta resta attiva finché il pollice non torna quasi al centro.
    const onH = padOn.has('left') || padOn.has('right'), onV = padOn.has('up') || padOn.has('down');
    const want = new Set();
    if (ax > (onH ? .12 : .2) && ax > ay * (onH ? .4 : .55)) want.add(nx < 0 ? 'left' : 'right');
    if (ay > (onV ? .12 : .2) && ay > ax * (onV ? .4 : .55)) want.add(ny < 0 ? 'up' : 'down');
    setDirs(want);
  };
  const dpadEnd = e => { if (e.pointerId === dpadId) { dpadId = null; setDirs(new Set()); } };
  dpad.addEventListener('pointerdown', e => { e.preventDefault(); try { dpad.setPointerCapture(e.pointerId); } catch (err) {} dpadId = e.pointerId; aim(e); });
  dpad.addEventListener('pointermove', e => { if (e.pointerId === dpadId) aim(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => dpad.addEventListener(t, dpadEnd));

  // A e B: una sola superficie. Il pollice può rotolare da un tasto all'altro e, a cavallo, premerli insieme.
  const ab = $('ab');
  const abBtn = { a: ab.querySelector('[data-k="a"]'), b: ab.querySelector('[data-k="b"]') };
  const abPtr = new Map(), abOn = new Set();
  const abKeys = e => {
    const near = ['a', 'b'].map(k => {
      const r = abBtn[k].getBoundingClientRect();
      return [k, Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)), r.width / 2];
    });
    const hit = near.filter(([, d, rad]) => d < rad + 12).map(n => n[0]);
    if (hit.length) return hit;
    const best = near.sort((x, y) => x[1] - y[1])[0];
    return best[1] < best[2] + 36 ? [best[0]] : [];
  };
  const abSync = () => {
    const want = new Set();
    abPtr.forEach(keys => keys.forEach(k => want.add(k)));
    for (const k of [...abOn]) if (!want.has(k)) { abOn.delete(k); release(k); }
    for (const k of want) if (!abOn.has(k)) { abOn.add(k); press(k); }
  };
  ab.addEventListener('pointerdown', e => { e.preventDefault(); try { ab.setPointerCapture(e.pointerId); } catch (err) {} abPtr.set(e.pointerId, abKeys(e)); abSync(); });
  ab.addEventListener('pointermove', e => { if (abPtr.has(e.pointerId)) { abPtr.set(e.pointerId, abKeys(e)); abSync(); } });
  const abEnd = e => { if (abPtr.delete(e.pointerId)) abSync(); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => ab.addEventListener(t, abEnd));

  // Tocco diretto sullo schermo: coordinate in pixel del canvas del gioco.
  const ptr = type => e => {
    if (mode !== 'game' || !inst || !inst.onPointer) return;
    e.preventDefault();
    if (type === 'down') { try { cv.setPointerCapture(e.pointerId); } catch (err) {} }
    // Il canvas riempie lo schermo con object-fit: contain: le coordinate vanno riportate all'area realmente disegnata.
    const LW = HR ? HR.cw : cv.width, LH = HR ? HR.ch : cv.height;
    const r = cv.getBoundingClientRect(), k = Math.min(r.width / LW, r.height / LH);
    const ox = r.left + (r.width - LW * k) / 2, oy = r.top + (r.height - LH * k) / 2;
    inst.onPointer({
      type: type === 'cancel' ? 'up' : type, cancelled: type === 'cancel', id: e.pointerId, t: e.timeStamp,
      x: (e.clientX - ox) / k, y: (e.clientY - oy) / k,
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

  // Colori della console: scocca e tasti A/B, scelti dal catalogo (COLORI) e salvati sul telefono.
  const SHELL_COLORS = [
    { id: 'grape', name: 'Uva', c: '#7b5cb8', d: '#5a3f94' },
    { id: 'teal', name: 'Acqua', c: '#2fb3a8', d: '#1f8a81' },
    { id: 'berry', name: 'Lampone', c: '#d6456f', d: '#a82f53' },
    { id: 'dandelion', name: 'Limone', c: '#e8c43a', d: '#bd9a1c' },
    { id: 'kiwi', name: 'Kiwi', c: '#69c24a', d: '#4a9a30' },
    { id: 'sky', name: 'Cielo', c: '#4aa3e0', d: '#2f7db3' },
    { id: 'orange', name: 'Arancio', c: '#f2872e', d: '#c46410' },
    { id: 'red', name: 'Rosso', c: '#d8383a', d: '#a22427' },
    { id: 'graphite', name: 'Grafite', c: '#505462', d: '#383b46' },
    { id: 'white', name: 'Bianco', c: '#e6e6ee', d: '#b9b9c8' },
  ];
  const BTN_COLORS = [
    { id: 'graphite', name: 'Grafite', hi: '#707080', mid: '#4a4a57', lo: '#30303a', dk: '#24242c', dn: '#34343e', ink: '#d2d2de' },
    { id: 'red', name: 'Rosso', hi: '#ff8a7e', mid: '#d8383a', lo: '#a22427', dk: '#7a1a1c', dn: '#b82c2e', ink: '#ffe3df' },
    { id: 'blue', name: 'Blu', hi: '#7db3ff', mid: '#3d6fe0', lo: '#2748a8', dk: '#1d3680', dn: '#3158bf', ink: '#e1ecff' },
    { id: 'green', name: 'Verde', hi: '#9ae88b', mid: '#4cc24a', lo: '#2f8f33', dk: '#226a25', dn: '#3aa23a', ink: '#e6ffe0' },
    { id: 'purple', name: 'Viola', hi: '#cf9af5', mid: '#a655b8', lo: '#74388a', dk: '#562a66', dn: '#8a45a0', ink: '#f6e6ff' },
    { id: 'yellow', name: 'Giallo', hi: '#ffe98a', mid: '#f5d31c', lo: '#c9a400', dk: '#9a7a00', dn: '#dcb800', ink: '#4a3a00' },
    { id: 'white', name: 'Bianco', hi: '#ffffff', mid: '#dcdce6', lo: '#b0b0c0', dk: '#8a8a9c', dn: '#c4c4d2', ink: '#3a3a46' },
  ];
  const SHELLS = SHELL_COLORS.map(s => s.id);
  const setShell = id => {
    const s = SHELL_COLORS.find(x => x.id === id) || SHELL_COLORS[0];
    const r = document.documentElement;
    r.dataset.shell = s.id; r.style.setProperty('--shell', s.c); r.style.setProperty('--shell-dark', s.d);
    ls.set('shell', s.id);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = s.c;
  };
  const setBtn = id => {
    const b = BTN_COLORS.find(x => x.id === id) || BTN_COLORS[0];
    const r = document.documentElement;
    r.dataset.btn = b.id;
    r.style.setProperty('--ab-bg', `radial-gradient(120% 120% at 32% 22%, ${b.hi} 0%, ${b.mid} 36%, ${b.lo} 70%, ${b.dk} 100%)`);
    r.style.setProperty('--ab-down', `radial-gradient(120% 120% at 50% 35%, ${b.dn} 0%, ${b.lo} 60%, ${b.dk} 100%)`);
    r.style.setProperty('--ab-ink', b.ink);
    ls.set('btn', b.id);
  };
  const renderColors = () => {
    const curS = document.documentElement.dataset.shell, curB = document.documentElement.dataset.btn || 'graphite';
    const sw = (cls, list, cur, bg) => '<div class="sw">' + list.map(x => `<button class="${cls}${x.id === cur ? ' sel' : ''}" data-id="${x.id}" style="--s:${bg(x)}" aria-label="${x.name}" title="${x.name}"></button>`).join('') + '</div>';
    menuEl.innerHTML = `<header><button class="snd" id="colBack">‹ CATALOGO</button><h1>ASPETTO</h1></header>
      <p class="ver">LA CONSOLE QUI SOTTO CAMBIA SUBITO. LA SCELTA RESTA SALVATA.</p>
      <h2 class="sub">SCOCCA</h2>${sw('swShell', SHELL_COLORS, curS, x => x.c)}
      <h2 class="sub">TASTI A E B</h2>${sw('swBtn', BTN_COLORS, curB, x => x.mid)}
      <h2 class="sub">QUALITÀ GRAFICA</h2>
      <div class="seg"><button class="qBtn${ls.get('hq', true) ? ' sel' : ''}" data-q="1">ALTA<br><small>RETINA, PIÙ NITIDA</small></button><button class="qBtn${ls.get('hq', true) ? '' : ' sel'}" data-q="0">RISPARMIO<br><small>MENO BATTERIA</small></button></div>
      <p class="ver">LA QUALITÀ CAMBIA DALLA PROSSIMA PARTITA. SE IL TELEFONO FATICA, SCENDE DA SOLA.</p>
      <button class="act imp" id="colReset">RIPRISTINA I COLORI ORIGINALI</button>`;
  };
  // Piccola guida: come mettere l'app nella Home del telefono e usarla anche senza rete.
  const renderHelp = () => {
    const ios = isIOS, one = ios
      ? ['Apri questo link con <b>Safari</b> (non dentro un\'altra app).', 'Tocca il tasto <b>Condividi</b> (il quadrato con la freccia in su).', 'Scorri e scegli <b>«Aggiungi alla schermata Home»</b>.', 'Tocca <b>Aggiungi</b>: l\'icona compare nella Home.']
      : ['Apri questo link con <b>Chrome</b>.', 'Tocca i <b>tre puntini</b> in alto a destra.', 'Scegli <b>«Aggiungi a schermata Home»</b> (o «Installa app»).', 'Conferma: l\'icona compare nella Home.'];
    const other = ios
      ? ['Su Android (Chrome): tre puntini → «Aggiungi a schermata Home» o «Installa app».']
      : ['Su iPhone (Safari): Condividi → «Aggiungi alla schermata Home».'];
    menuEl.innerHTML = `<header><button class="snd" id="helpBack">‹ CATALOGO</button><h1>AIUTO</h1></header>
      <h2 class="sub">METTI L'APP NELLA HOME ${ios ? '(IPHONE)' : '(ANDROID)'}</h2>
      <ol class="help">${one.map(x => '<li>' + x + '</li>').join('')}</ol>
      <p class="ver">${other[0].toUpperCase()}</p>
      <h2 class="sub">SENZA RETE</h2>
      <p class="ver">DOPO IL PRIMO CARICAMENTO TUTTO RESTA SALVATO SUL TELEFONO: I GIOCHI FUNZIONANO ANCHE IN AEREO O SENZA SEGNALE. RECORD E IMPOSTAZIONI RESTANO SUL TELEFONO.</p>
      <h2 class="sub">AGGIORNARE</h2>
      <p class="ver">QUANDO C'È RETE TOCCA «AGGIORNA» NEL CATALOGO: SCARICA I GIOCHI NUOVI E LE MODIFICHE. SE QUALCOSA RESTA VECCHIO, CHIUDI E RIAPRI L'APP.</p>
      <h2 class="sub">SUONO</h2>
      <p class="ver">SE NON SENTI NULLA, CONTROLLA IL TASTO «SUONO» DEL CATALOGO E CHE IL TELEFONO NON SIA IN SILENZIOSO.</p>`;
  };
  const colorsClick = e => {
    const t = e.target;
    if (t.closest('#help')) { renderHelp(); return true; }
    if (t.closest('#helpBack')) { renderMenu(); return true; }
    if (t.closest('#col')) { renderColors(); return true; }
    if (t.closest('#colBack')) { renderMenu(); return true; }
    const s = t.closest('.swShell'), b = t.closest('.swBtn');
    if (s) { setShell(s.dataset.id); haptic(8); renderColors(); return true; }
    if (b) { setBtn(b.dataset.id); haptic(8); renderColors(); return true; }
    const q = t.closest('.qBtn');
    if (q) { ls.set('hq', q.dataset.q === '1'); haptic(8); renderColors(); return true; }
    if (t.closest('#colReset')) { setShell('grape'); setBtn('graphite'); renderColors(); return true; }
    return false;
  };
  // Solo verticale: dove il browser lo consente blocca lo schermo; altrimenti basta la copertura in CSS e il gioco va in pausa.
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {}); } catch (e) {}
  try {
    const land = matchMedia('(orientation: landscape) and (max-height: 520px)');
    const onLand = e => { if (e.matches && mode === 'game' && inst && inst.onHide) { try { inst.onHide(); } catch (err) {} } };
    if (land.addEventListener) land.addEventListener('change', onLand); else if (land.addListener) land.addListener(onLand);
  } catch (e) {}
  // Avvio
  const COLORS = ['#e5413b', '#f58a25', '#f5d31c', '#4cc24a', '#25c4f0', '#3d5fe0', '#a655b8'];
  const buildLogo = () => {
    $('logo').innerHTML = 'TASCA ARCADE'.split('').map((c, i) =>
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
  let slow = 0;
  const frame = now => {
    const raw = (now - last) / 1000, dt = Math.min(0.05, raw); last = now;
    if (mode === 'game' && inst) {
      try {
        inst.update(dt);
        if (HR && !(cur && cur.community)) { HR.base(); inst.render(HR.gP); } else inst.render(g);
        // Se il telefono fatica a tenere i fotogrammi, la definizione scende un po' alla volta (mai sotto 1x).
        if (HR && !(cur && cur.community) && HR.k > 1.05 && raw < 0.25) {
          slow = Math.max(0, Math.min(140, slow + (raw > 0.032 ? 1 : -1)));
          if (slow > 100) { HR.setK(Math.max(1, HR.k * 0.8)); slow = 0; }
        }
      } catch (e) {
        // Un gioco con un errore non deve bloccare la console: si torna al catalogo.
        console.error('Errore durante il gioco', cur && cur.id, e);
        const t = cur ? cur.title : '';
        toMenu(); setStatus('ERRORE NEL GIOCO ' + t + ': TORNO AL CATALOGO', true);
      }
    }
    requestAnimationFrame(frame);
  };

  // Chi aggiunge un gioco lo registra con registerGame(). I campi obbligatori vengono controllati: un gioco
  // incompleto viene scartato senza rompere il catalogo.
  window.registerGame = def => {
    const ok = def && typeof def.id === 'string' && typeof def.title === 'string' && typeof def.create === 'function'
      && Array.isArray(def.size) && def.size.length === 2 && def.size[0] > 0 && def.size[1] > 0;
    if (!ok) { console.warn('Gioco scartato: mancano id, title, size o create()', def && def.id); return; }
    if (games.some(x => x.id === def.id)) { console.warn('Gioco scartato: id già usato', def.id); return; }
    def.inputs = Array.isArray(def.inputs) ? def.inputs : [];
    def.color = def.color || '#25c4f0';
    def.blurb = def.blurb || '';
    games.push(def);
  };

  // Il catalogo è l'elenco in games/catalog.json: aggiungere un gioco = un file in games/ + una riga nell'elenco.
  const loadScript = src => new Promise(res => {
    const s = document.createElement('script');
    s.src = src; s.onload = () => res(true);
    s.onerror = () => { console.warn('Gioco non caricato:', src); res(false); };
    document.head.appendChild(s);
  });
  const loadCatalog = async () => {
    try {
      const cat = await (await fetch('games/catalog.json')).json();
      for (const f of cat.games) await loadScript('games/' + f);
    } catch (e) { console.warn('Catalogo non leggibile', e); }
  };
  window.Shell = {
    async start() {
      await loadCatalog();
      games.forEach(x => BUILTIN_IDS.add(x.id));
      syncCommunityGames();
      setShell(ls.get('shell', 'grape'));
      setBtn(ls.get('btn', 'graphite'));
      buildLogo();
      cv.classList.add('off');
      renderMenu();
      checkUpdate(false);
      bootTimer = setTimeout(endBoot, 2600);
      requestAnimationFrame(frame);
    },
    // Aggancio per le prove automatiche.
    press, release, launch, toMenu, games, get mode() { return mode; }, get inst() { return inst; },
  };
})();

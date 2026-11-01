// Console Gameboy: avvio, catalogo, controlli, sensori, vibrazione e suono.
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

  const apiFor = def => ({
    cv, g, w: cv.width, h: cv.height, held, tilt, haptic, beep, goMenu: () => toMenu(),
    store: { get: (k, d) => ls.get(def.id + ':' + k, d), set: (k, v) => ls.set(def.id + ':' + k, v) },
  });


  // ======================================================================================================
  // Giochi di terzi (importati dall'app). Girano in una scatola isolata: un iframe con sandbox="allow-scripts"
  // (origine "opaca": nessun accesso a localStorage, cache o file della console) e una CSP che vieta ogni
  // collegamento di rete, worker, form e frame. Con la console parla solo per messaggi controllati.
  // ======================================================================================================

  // Questa funzione NON gira qui: il suo testo viene messo dentro la scatola, dove fa da "console in miniatura".
  function sdkMain() {
    var post = function (m) { parent.postMessage(m, '*'); };
    var def = null, inst = null, running = false, last = 0;
    var held = {}, tiltS = { x: 0, y: 0, sensor: false }, store = {};
    var cv = document.createElement('canvas'), g = cv.getContext('2d');
    document.body.appendChild(cv);
    window.registerGame = function (d) { if (!def && d && typeof d === 'object') def = d; };
    window.addEventListener('error', function (e) { post({ t: 'error', msg: String(e.message || 'errore').slice(0, 120) }); });
    var api = {
      cv: cv, g: g, w: 0, h: 0, held: held,
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
      try { inst.update(dt); g.setTransform(1, 0, 0, 1, 0, 0); inst.render(g); }
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
        var r = cv.getBoundingClientRect(), k = Math.min(r.width / cv.width, r.height / cv.height);
        var ox = r.left + (r.width - cv.width * k) / 2, oy = r.top + (r.height - cv.height * k) / 2;
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
        cv.width = m.w; cv.height = m.h; api.w = m.w; api.h = m.h;
        try { var s = document.createElement('script'); s.textContent = m.code; document.head.appendChild(s); }
        catch (err) { post({ t: 'error', msg: 'codice non valido' }); return; }
        if (!def) { post({ t: 'invalid' }); return; }
        var meta = {};
        ['id', 'title', 'author', 'color', 'blurb', 'inputs', 'size', 'bg', 'flexH', 'tilt', 'license'].forEach(function (k) { if (def[k] !== undefined) meta[k] = def[k]; });
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
    + 'canvas{display:block;width:100vw;height:100vh;object-fit:contain;image-rendering:pixelated;touch-action:none}</style></head>'
    + '<body><script>(' + sdkMain.toString() + ')();<\/script></body></html>';

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
      size: sz, bg: hexOk(m.bg) ? m.bg : '', flexH: !!m.flexH, tilt: !!m.tilt, license: String(m.license || '').slice(0, 40),
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

  const startSandbox = (def, w, h) => {
    const key = def.id;
    let lastHb = performance.now(), beepAt = 0, beepN = 0, storeKeys = 0;
    const box = makeSandbox({ init: { mode: 'play', code: def.code, w, h, store: cmStore(key) } }, (m) => {
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
      const k = keys.filter(n => /^gameboy-v\d+/.test(n)).sort().pop();
      verTag = k ? k.replace('gameboy-', '').toUpperCase() : '';
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
  const renderMenu = () => {
    pinned = false;
    const tip = isIOS && !standalone()
      ? '<p class="tip">Per giocare a schermo intero: tocca Condividi, poi «Aggiungi alla schermata Home».</p>' : '';
    menuEl.innerHTML = `<header><button class="brand" id="brand" aria-label="Cambia colore della scocca">GAME<b>BOY</b></button><span class="tools"><button class="snd" id="upd">AGGIORNA</button><button class="snd" id="snd">${muted ? 'SUONO OFF' : 'SUONO ON'}</button></span></header><p class="ver" id="ver"></p>${tip}` +
      games.map((d, i) => {
        const rec = d.community ? (cmStore(d.id).hi || 0) : ls.get(d.id + ':hi', 0);
        return `<button class="cart${i === sel ? ' sel' : ''}" data-i="${i}" style="--c:${/^#[0-9a-fA-F]{3,8}$/.test(d.color) ? d.color : '#25c4f0'}">
          <span class="tab"></span><span class="title">${esc(d.title)}</span><span class="rec">${rec ? 'RECORD ' + rec : ''}</span>
          <span class="desc">${esc(d.blurb)}${d.author ? ' <em>di ' + esc(d.author) + '</em>' : ''}</span>
          <span class="chips">${d.community ? '<i class="ext">DI TERZI</i>' : ''}${d.inputs.map(t => `<i${HOT[t] ? ' class="hot"' : ''}>${esc(t)}</i>`).join('')}</span></button>`;
      }).join('') + '<button class="act imp" id="imp">+ IMPORTA UN GIOCO</button>';
    showVersion();
  };
  menuEl.addEventListener('change', e => {
    if (e.target.id === 'impOk') { const b = document.getElementById('impAdd'); if (b) b.disabled = !e.target.checked; }
  });
  menuEl.addEventListener('click', async e => {
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
        ch = Math.round(clamp(cw * screenEl.clientHeight / screenEl.clientWidth, cw * 1.25, cw * 2.1));
      }
      cv.width = cw; cv.height = ch;
      cv.style.aspectRatio = cw + ' / ' + ch;
      screenEl.style.background = def.bg || '';
      cv.classList.remove('off'); menuEl.classList.add('off');
      cur = def; mode = 'game';
      for (const k in held) if (k !== 'a' && k !== 'start') { delete held[k]; lite(k, false); }
      tilt.calibrate();
      if (def.community) { cv.classList.add('off'); }
      try { inst = def.community ? startSandbox(def, cw, ch) : def.create(apiFor(def)); } catch (e) { console.error('Errore in', def.id, e); inst = null; toMenu(); setStatus('IL GIOCO NON SI AVVIA: ' + def.title, true); return; }
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
    const r = cv.getBoundingClientRect(), k = Math.min(r.width / cv.width, r.height / cv.height);
    const ox = r.left + (r.width - cv.width * k) / 2, oy = r.top + (r.height - cv.height * k) / 2;
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

  // Colore della scocca: un tocco sul nome cambia colore.
  const SHELLS = ['grape', 'teal', 'berry', 'dandelion', 'kiwi'];
  const setShell = n => {
    document.documentElement.dataset.shell = n; ls.set('shell', n);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue('--shell').trim();
  };
  // Avvio
  const COLORS = ['#e5413b', '#f58a25', '#f5d31c', '#4cc24a', '#25c4f0', '#3d5fe0', '#a655b8'];
  const buildLogo = () => {
    $('logo').innerHTML = 'GAMEBOY'.split('').map((c, i) =>
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
      try {
        inst.update(dt);
        g.setTransform(1, 0, 0, 1, 0, 0);
        inst.render(g);
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

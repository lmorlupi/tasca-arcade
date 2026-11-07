// Sintesi originale, leggera e offline. Mantiene i timbri arcade con attacchi morbidi e volumi bilanciati.
function arcadeAudioFactory(options = {}) {
  let ac = options.context || null, muted = !!options.muted, sleeping = false, resuming = false, master = null, bus = null, analyser = null, keepAlive = null;
  let noiseBuffer = null, waves = {}, serial = 0, started = 0, dropped = 0; const voices = new Map(), MAX_VOICES = 32;
  const finite = (n, d) => typeof n === 'number' && Number.isFinite(n) ? n : d;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function setup() {
    if (master) return true;
    try {
      if (!ac) { const Ctor = window.AudioContext || window.webkitAudioContext; if (!Ctor) return false; try { ac = new Ctor({ latencyHint: 'interactive' }); } catch (_) { ac = new Ctor(); } }
      bus = ac.createGain(); const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 6200; filter.Q.value = .5;
      const compressor = ac.createDynamicsCompressor(); compressor.threshold.value = -16; compressor.knee.value = 14; compressor.ratio.value = 5; compressor.attack.value = .004; compressor.release.value = .14;
      const ceiling = ac.createWaveShaper(), curve = new Float32Array(2049); for (let i = 0; i < curve.length; i++) curve[i] = .94 * Math.tanh((i * 2 / (curve.length - 1) - 1) * 1.15);
      ceiling.curve = curve; ceiling.oversample = '2x'; master = ac.createGain(); master.gain.value = muted ? 0 : .82;
      analyser = ac.createAnalyser(); analyser.fftSize = 512;
      bus.connect(filter); filter.connect(compressor); compressor.connect(ceiling); ceiling.connect(master); master.connect(analyser); analyser.connect(ac.destination);
      const delay = ac.createDelay(.2), wet = ac.createGain(); delay.delayTime.value = .055; wet.gain.value = .055; bus.connect(delay); delay.connect(wet); wet.connect(filter);
      for (const type of ['square', 'sawtooth', 'triangle']) {
        const real = new Float32Array(16), imag = new Float32Array(16);
        for (let h = 1; h < imag.length; h++) imag[h] = type === 'square' ? h % 2 ? 1 / Math.pow(h, 1.65) : 0 : type === 'triangle' ? h % 2 ? (h % 4 === 1 ? 1 : -1) / (h * h) : 0 : (h % 2 ? 1 : -1) / Math.pow(h, 1.6);
        waves[type] = ac.createPeriodicWave(real, imag);
      }
      noiseBuffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * 2), ac.sampleRate); const data = noiseBuffer.getChannelData(0); let seed = 37, smooth = 0;
      for (let i = 0; i < data.length; i++) { seed = Math.imul(seed, 1664525) + 1013904223 | 0; const white = (seed >>> 0) / 2147483648 - 1; smooth = smooth * .25 + white * .75; data[i] = smooth; }
      return true;
    } catch (_) { return false; }
  }
  function silentMedia() {
    if (options.context || typeof Audio === 'undefined') return;
    try {
      if (!keepAlive) {
        const bytes = new Uint8Array(44 + 800), view = new DataView(bytes.buffer), text = (offset, value) => [...value].forEach((c, i) => bytes[offset + i] = c.charCodeAt(0));
        text(0, 'RIFF'); view.setUint32(4, bytes.length - 8, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true); text(36, 'data'); view.setUint32(40, 800, true); bytes.fill(128, 44);
        keepAlive = new Audio('data:audio/wav;base64,' + btoa(String.fromCharCode(...bytes))); keepAlive.loop = true; keepAlive.volume = .01; keepAlive.setAttribute('playsinline', '');
      }
      if (keepAlive.paused) keepAlive.play().catch(() => {});
    } catch (_) {}
  }
  function stop() {
    if (ac) for (const voice of voices.values()) {
      try { voice.gain.gain.cancelScheduledValues(ac.currentTime); voice.gain.gain.setTargetAtTime(.0001, ac.currentTime, .005); voice.source.stop(ac.currentTime + .03); } catch (_) {}
    }
    voices.clear(); if (keepAlive) keepAlive.pause();
  }
  function unlock() {
    if (muted) return;
    try {
      try { if (typeof navigator !== 'undefined' && navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (_) {}
      sleeping = false; if (!setup()) return;
      master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(.82, ac.currentTime, .012);
      if (ac.state === 'suspended' || ac.state === 'interrupted') {
        resuming = true; const promise = ac.resume(); if (promise?.then) promise.then(() => { resuming = false; if (ac.state !== 'running') stop(); }, () => { resuming = false; stop(); });
      }
      silentMedia();
    } catch (_) { resuming = false; }
  }
  const playable = () => !muted && !sleeping && ac && master && (ac.state === 'running' || resuming || !!options.context);
  function voice(source, filter, gain, delay, duration, attack = .004) {
    if (!playable() || voices.size >= MAX_VOICES) { dropped++; return; }
    const t = ac.currentTime + clamp(finite(delay, 0), 0, 1.5), d = clamp(finite(duration, .1), .018, 2), amp = clamp(finite(gain, .035), .0001, .18), envelope = ac.createGain();
    envelope.gain.setValueAtTime(.0001, t); envelope.gain.linearRampToValueAtTime(amp, t + Math.min(attack, d / 3)); envelope.gain.exponentialRampToValueAtTime(Math.max(.00015, amp * .32), t + d * .6); envelope.gain.exponentialRampToValueAtTime(.0001, t + d + .025);
    source.connect(filter || envelope); if (filter) filter.connect(envelope); envelope.connect(bus);
    const id = ++serial; voices.set(id, { source, gain: envelope }); started++;
    source.onended = () => { voices.delete(id); try { source.disconnect(); if (filter) filter.disconnect(); envelope.disconnect(); } catch (_) {} };
    source.start(t); source.stop(t + d + .035); return t;
  }
  function note(frequency, duration = .15, gain = .03, type = 'triangle', delay = 0, endFrequency = null) {
    if (!playable()) return;
    try {
      const f = clamp(finite(frequency, 440), 40, 6000), oscillator = ac.createOscillator();
      if (waves[type]) oscillator.setPeriodicWave(waves[type]); else oscillator.type = 'sine';
      const at = ac.currentTime + clamp(finite(delay, 0), 0, 1.5); oscillator.frequency.setValueAtTime(f, at);
      if (endFrequency !== null) oscillator.frequency.exponentialRampToValueAtTime(clamp(finite(endFrequency, f), 40, 6000), at + Math.max(.02, duration));
      const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = Math.min(5000, Math.max(700, f * 5)); filter.Q.value = .45;
      voice(oscillator, filter, gain, delay, duration, type === 'sine' ? .007 : .004);
    } catch (_) {}
  }
  function noise(duration = .08, gain = .02, frequency = 800, type = 'bandpass', delay = 0) {
    if (!playable()) return;
    try {
      const source = ac.createBufferSource(), filter = ac.createBiquadFilter(); source.buffer = noiseBuffer; filter.type = type; filter.frequency.value = frequency; filter.Q.value = .65;
      voice(source, filter, gain, delay, duration, duration > .3 ? .12 : .005);
    } catch (_) {}
  }
  function beep(f = 440, d = .06, type = 'square', v = .04) { note(f, clamp(finite(d, .06), .018, 1), clamp(finite(v, .04) * 1.45, .001, .16), type); }
  function sound(name, o = {}) {
    if (!playable()) return;
    const gain = clamp(finite(o.gain, .03), .001, .12);
    const arp = (notes, step = .075, length = .22) => notes.forEach((f, i) => note(f, length, gain, 'sine', i * step));
    if (name === 'music') { note(o.frequency || 523, o.bass ? .65 : .48, gain, o.bass ? 'triangle' : 'sine'); if (!o.bass) note((o.frequency || 523) * 2, .24, gain * .13, 'sine'); }
    else if (name === 'step') noise(.035, gain, o.sand ? 650 : 240, 'lowpass');
    else if (name === 'ui') note(660, .06, gain * .65, 'triangle');
    else if (name === 'collect') arp([784, 1046], .055, .16);
    else if (name === 'coin') arp([1175, 1568], .06, .15);
    else if (name === 'tree') { noise(.12, gain, 330); note(196, .09, gain * .65, 'triangle'); }
    else if (name === 'stone') { note(490, .07, gain, 'triangle'); noise(.045, gain * .4, 1600); }
    else if (name === 'plant') { noise(.08, gain * .7, 950, 'lowpass'); note(392, .15, gain * .7, 'triangle'); }
    else if (name === 'water') { noise(.25, gain, 850); note(950, .17, gain * .25, 'sine', .04, 400); }
    else if (name === 'fish') arp([523.25, 659.25, 784, 1046.5], .085, .25);
    else if (name === 'bite') arp([880, 1175], .08, .2);
    else if (name === 'flutter') for (let i = 0; i < 3; i++) noise(.045, gain * .4, 1400, 'highpass', i * .045);
    else if (name === 'friend') arp([523.25, 659.25, 784], .04, .32);
    else if (name === 'door') { note(180, .09, gain, 'triangle'); noise(.045, gain * .4, 450); }
    else if (name === 'travel') arp([523.25, 587.33, 659.25, 784], .075, .22);
    else if (name === 'celebrate') arp([523.25, 659.25, 784, 1046.5, 784, 1046.5], .1, .3);
    else if (name === 'bird') { note(1500, .1, gain * .5, 'sine', 0, 2300); note(2100, .09, gain * .35, 'sine', .14, 1600); }
    else if (name === 'sparkle') arp([1175, 1568, 2093], .12, .24);
    else if (name === 'wave') noise(1.6, gain, 1200, 'lowpass');
  }
  function setMuted(value) {
    muted = !!value; if (muted) stop();
    if (master) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(muted ? 0 : .82, ac.currentTime, .012); }
  }
  function sleep() { sleeping = true; resuming = false; stop(); if (ac && ac.state === 'running' && !options.context) ac.suspend().catch(() => {}); }
  if (options.context) setup();
  return { unlock, beep, sound, setMuted, stop, sleep, get debug() { let peak = 0; if (analyser) { const samples = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(samples); for (const n of samples) peak = Math.max(peak, Math.abs(n)); } return { state: ac?.state || 'idle', sampleRate: ac?.sampleRate || null, muted, sleeping, voices: voices.size, maxVoices: MAX_VOICES, started, dropped, peak }; } };
}

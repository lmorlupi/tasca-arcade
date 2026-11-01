// MODELLO PER UN NUOVO GIOCO
// Copia questo file (es. games/il-mio-gioco.js), cambia i campi e aggiungi il nome del file in games/catalog.json.
// Il file con il trattino basso iniziale (_template.js) non è nel catalogo, quindi non compare nell'app.
//
// Cose che il gioco può usare (tutte nell'oggetto "api" passato a create):
//   api.cv, api.g        canvas e contesto 2D: disegna in pixel del canvas (api.cv.width x api.cv.height)
//   api.held             tasti premuti ora: held.left / right / up / down / a / b
//   api.tilt             inclinazione dell'iPhone: tilt.x e tilt.y da -1 a 1 (sul computer ripiega sulla croce)
//   api.haptic(ms)       vibrazione leggera (iPhone da iOS 17.4, Android)
//   api.beep(freq, durata, tipo, volume)   un suono breve
//   api.store.get(chiave, predefinito) / api.store.set(chiave, valore)   salvataggio nel telefono, solo per questo gioco
//   api.goMenu()         torna al catalogo
//
// Regole del progetto: gioco originale (niente nomi, personaggi, grafica o musiche di altri), nessuna rete,
// nessun tracciamento, niente eval() né caricamento di altri script.

registerGame({
  id: 'modello',                 // unico, solo lettere minuscole, numeri e trattini
  title: 'MODELLO',              // nome nel catalogo (breve, maiuscolo)
  author: 'Il tuo nome',         // facoltativo: compare nella scheda
  color: '#25c4f0',              // colore della cartuccia nel catalogo (#rrggbb)
  blurb: 'Muovi il quadrato con la croce, A cambia colore. Un esempio da copiare.',   // una o due frasi
  inputs: ['D-PAD', 'TOCCO'],    // etichette dei controlli; INCLINA, SWIPE e FLICK vengono evidenziate
  size: [360, 580],              // dimensione del canvas; con flexH l'altezza si adatta allo schermo
  bg: '#141a2e',                 // colore dello sfondo ai lati
  flexH: true,                   // facoltativo: l'altezza del canvas riempie lo schermo (leggi cv.height!)
  tilt: false,                   // true se usa api.tilt: chiede il permesso dei sensori all'avvio

  create(api) {
    const { cv, g, held } = api;
    const W = cv.width, H = cv.height;
    let x = W / 2, y = H / 2, hue = 200, best = api.store.get('hi', 0), score = 0;

    return {
      // Ogni fotogramma: dt è in secondi.
      update(dt) {
        x = Math.max(20, Math.min(W - 20, x + ((held.right ? 1 : 0) - (held.left ? 1 : 0)) * 220 * dt));
        y = Math.max(20, Math.min(H - 20, y + ((held.down ? 1 : 0) - (held.up ? 1 : 0)) * 220 * dt));
      },
      render() {
        g.fillStyle = '#141a2e'; g.fillRect(0, 0, W, H);
        g.fillStyle = `hsl(${hue} 80% 60%)`; g.fillRect(x - 20, y - 20, 40, 40);
        g.fillStyle = '#eef1ff'; g.font = 'bold 18px ui-monospace, monospace'; g.textBaseline = 'top';
        g.fillText('PUNTI ' + score + '   RECORD ' + best, 12, 12);
      },
      // Pressione di un tasto (A, B, start, select, e anche le direzioni).
      onPress(k) {
        if (k === 'a') { hue = (hue + 50) % 360; score++; api.haptic(8); api.beep(660, 0.05);
          if (score > best) { best = score; api.store.set('hi', best); } }
      },
      // Tocchi sullo schermo: e = { type: 'down' | 'move' | 'up', x, y, id } (x, y in pixel del canvas).
      onPointer(e) { if (e.type === 'down') { x = e.x; y = e.y; } },
      // La pagina va in secondo piano: metti in pausa.
      onHide() {},
    };
  },
});

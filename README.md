# Tasca Arcade

Una sala giochi tascabile che gira nel browser del telefono, con un catalogo di giochi pensati per l'iPhone:
inclinazione, swipe, scatti del dito, due pollici, vibrazione. Funziona anche **offline** e si aggiorna da sola.

**Gioca:** <https://lmorlupi.github.io/gameboy-web/> · su iPhone: Condividi → *Aggiungi alla schermata Home*.

## Aggiungere un gioco

Il progetto è aperto ai giochi di altri. Servono tre passi:

1. Copia `games/_template.js` in `games/il-mio-gioco.js` e cambia i campi (id, titolo, colore, descrizione, controlli).
2. Aggiungi `"il-mio-gioco.js"` all'elenco in `games/catalog.json`.
3. Prova in locale (vedi sotto) e apri una *pull request*.

Non serve toccare `index.html`, `shell.js` né `sw.js`: la console legge l'elenco dei giochi da `games/catalog.json`
e il salvataggio offline si aggiorna da solo.

### Provare in locale

```bash
python3 -m http.server 8000
# poi apri http://localhost:8000 (da telefono: http://<indirizzo-del-computer>:8000)
```

Se la pagina sembra non cambiare, è il salvataggio offline: nella console premi **AGGIORNA** nel catalogo, oppure
in locale cancella i dati del sito dal browser.

### Come è fatto un gioco

Un gioco chiama `registerGame({ ... })` con questi campi:

| Campo | Obbligatorio | Cosa è |
|---|---|---|
| `id` | sì | nome unico, minuscole, numeri e trattini |
| `title` | sì | nome nel catalogo |
| `size` | sì | `[larghezza, altezza]` del canvas |
| `create(api)` | sì | crea il gioco e restituisce i suoi comandi |
| `blurb`, `inputs`, `color`, `author`, `license`, `bg` | no | testo, etichette dei controlli, colore, autore, licenza, sfondo ai lati |
| `flexH` | no | l'altezza del canvas si adatta allo schermo (leggi `cv.height`) |
| `tilt` | no | `true` se usa l'inclinazione: l'app chiede il permesso dei sensori |

`create(api)` restituisce un oggetto con: `update(dt)`, `render()`, e facoltativi `onPress(k)`, `onRelease(k)`,
`onPointer(e)`, `onHide()`, `destroy()`. L'oggetto `api` contiene `cv`, `g`, `held`, `tilt`, `haptic()`, `beep()`,
`store`, `goMenu()`. Tutto è descritto, con un esempio funzionante, in `games/_template.js`.

### Pensati per l'iPhone

Prima di scrivere i controlli pensa a come si tiene il telefono: due pollici in basso sui tasti, oppure un dito
direttamente sullo schermo. I giochi migliori usano **tocco diretto** (`onPointer`), **inclinazione** (`api.tilt`),
**scatti** e **vibrazione**, non solo la croce.

### Regole

- Giochi **originali**: niente nomi, personaggi, grafica, musiche o livelli presi da giochi di altri.
- Nessuna rete, nessun tracciamento, nessuna pubblicità; niente `eval()` e niente caricamento di altri script.
- Un gioco che va in errore viene chiuso e si torna al catalogo, ma si prova comunque prima di proporlo.
- Vale per tutti i giochi: nessun testo sotto gli 11 px per i comandi, e controlli comodi per il pollice.

### Lista di controllo prima della richiesta

- [ ] Parte, si può giocare, si può mettere in pausa (`start`) e si torna al catalogo con **MENU**.
- [ ] Funziona in verticale su un telefono (prova la larghezza 375 px) e senza errori nella console.
- [ ] Il record si salva con `api.store`.
- [ ] Il file è in `games/catalog.json` e ha un `id` nuovo.

## Importare un gioco dall'app

Nel catalogo il pulsante **+ IMPORTA UN GIOCO** permette di aggiungere un gioco da un link (file `.js`, anche «raw» di GitHub)
o incollando il codice. Il gioco è lo stesso formato descritto sopra.

- **Scatola isolata.** Un gioco importato gira in una finestra interna (`iframe` con `sandbox="allow-scripts"`) con regole
  (CSP) che vietano rete, worker, form e frame. Non vede `localStorage`, cache, cookie né i file della console: parla con
  la console solo per messaggi (tasti, suoni, vibrazione, record) e la console li limita e li controlla.
  Provato con un gioco «cattivo» di prova: lettura dei dati della console, `fetch`, XHR, WebSocket, immagini e script
  esterni, `eval`, worker, form, popup e navigazione della pagina risultano tutti bloccati.
- **Prima di importare** il gioco gira nascosto solo per leggerne titolo, autore, licenza e dimensioni; poi compare una
  scheda con l'avviso «di terzi, non verificato» e una casella da spuntare.
- **Salvataggio.** Il codice resta sul telefono (anche offline); si può rimuovere dalla stessa schermata.
- **Limiti.** Massimo 400 KB per gioco e 12 giochi importati. Un gioco che si blocca viene chiuso dopo pochi secondi.
  Su iPhone non si può escludere che un ciclo infinito rallenti l'app: in quel caso chiudi e riapri.

### Licenze e contenuti

- **Importa solo giochi tuoi o con una licenza che lo permette.** Aggiungi nel gioco il campo `license` (per esempio
  `'MIT'`, `'CC0'`): compare nella scheda. Senza licenza dichiarata il gioco, per legge, non si può riusare o ridistribuire.
- **Giochi commerciali e copie non autorizzate** (titoli di console o di altri editori) **non si importano**:
  non sono giochi web, richiederebbero un emulatore e copie non autorizzate del gioco, e il progetto non li supporta.
- Un gioco che usa nomi, personaggi, grafica o musiche di altri non entra nel catalogo principale.

## Note legali

- **Progetto indipendente.** Non è affiliato, sponsorizzato né approvato da nessun produttore di console o di videogiochi.
  Tutti i marchi e i nomi citati appartengono ai rispettivi proprietari.
- **Contenuti originali.** Codice, grafica, personaggi, livelli e suoni dei giochi inclusi sono originali: i suoni sono generati
  dal codice, non ci sono file audio, immagini o caratteri di terzi. Dei giochi classici si riprendono solo le idee di gioco
  generiche (le regole non sono protette dal diritto d'autore), non il loro aspetto, i personaggi, i nomi o i livelli.
- **Contributi.** Chi propone un gioco garantisce che è suo o che ha il permesso di condividerlo, e lo rilascia con la licenza
  indicata nel campo `license`. Giochi che copiano da vicino l'aspetto o i personaggi di altri non vengono accettati.
- **Segnalazioni.** Se pensi che qualcosa violi i tuoi diritti, apri una *issue* su GitHub: il contenuto viene verificato e,
  se serve, rimosso rapidamente.
- **Licenza.** Il codice e i giochi inclusi sono sotto licenza MIT (vedi `LICENSE`). I giochi importati o proposti da altri
  mantengono la licenza dei loro autori.
- **Dati personali.** L'app non raccoglie né invia dati: record, impostazioni e giochi importati restano sul tuo telefono.

## Aggiornamenti e offline

Un *service worker* (`sw.js`) salva tutti i file la prima volta. Per pubblicare una novità basta cambiare il numero
di `VERSION` in `sw.js`: chi apre l'app online riceve la versione nuova (anche con giochi nuovi) e vede il pulsante
**AGGIORNA** nel catalogo per forzare il controllo.

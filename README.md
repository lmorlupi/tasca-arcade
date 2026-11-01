# Gameboy

Una console a colori che gira nel browser del telefono, con un catalogo di giochi pensati per l'iPhone:
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
| `blurb`, `inputs`, `color`, `author`, `bg` | no | testo, etichette dei controlli, colore, autore, sfondo ai lati |
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

## Aggiornamenti e offline

Un *service worker* (`sw.js`) salva tutti i file la prima volta. Per pubblicare una novità basta cambiare il numero
di `VERSION` in `sw.js`: chi apre l'app online riceve la versione nuova (anche con giochi nuovi) e vede il pulsante
**AGGIORNA** nel catalogo per forzare il controllo.

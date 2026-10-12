# Navigatore delle Pietanze — Catignano

Progetto completamente statico: nessun database, backend o servizio di mappe esterno.

## File principali
- `index.html`: navigatore pubblico
- `editor.html`: editor annuale per postazioni e pietanze
- `config.js`: unica configurazione da sostituire ogni anno
- `mappa-catignano.png`: mappa grafica fornita

## Uso annuale
Apri `editor.html`, modifica evento, postazioni e pietanze. Trascina i pallini sulla mappa. Inserisci facoltativamente latitudine/longitudine per il pulsante Google Maps. Premi **Esporta config.js** e sostituisci il vecchio `config.js` nella pubblicazione.

## Pubblicazione
Metti nella stessa cartella almeno `index.html`, `config.js`, `app.js`, `styles.css` e `mappa-catignano.png`. `editor.html`, `editor.js` ed `editor.css` possono essere tenuti anche solo sul PC dell'organizzazione.

## Coordinate
`x` e `y` sono percentuali della mappa: x=0 sinistra/100 destra, y=0 alto/100 basso. L'editor le aggiorna trascinando i marker.

Per test locale si può usare `python3 -m http.server 8080`; sul server di produzione non serve alcun runtime.

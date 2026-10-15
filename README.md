# Navigatore delle Pietanze — Catignano

Progetto completamente statico: nessun database, backend o servizio di mappe esterno.

## File principali
- `index.html`: navigatore pubblico delle pietanze
- `musica.html`: mappa e programma dei punti musica
- `editor.html`: editor annuale per postazioni, pietanze e musica
- `config.js`: unica configurazione da sostituire ogni anno
- `mappa-catignano.png`: mappa grafica fornita

## Uso annuale
Apri `editor.html`, modifica evento, postazioni, pietanze e punti musica. Trascina i pallini sulla mappa. Per ogni punto musica aggiungi una riga nel formato `20:00-21:30 | Nome band`. Premi **Esporta config.js** e sostituisci il vecchio `config.js` nella pubblicazione. La pagina musicale confronta gli orari con l'ora locale del dispositivo e aggiorna i marker ogni 30 secondi.

## Pubblicazione
Metti nella stessa cartella almeno `index.html`, `musica.html`, `config.js`, `app.js`, `styles.css` e `mappa-catignano.webp`. `editor.html`, `editor.js` ed `editor.css` possono essere tenuti anche solo sul PC dell'organizzazione.

## Coordinate
`x` e `y` sono percentuali della mappa: x=0 sinistra/100 destra, y=0 alto/100 basso. L'editor le aggiorna trascinando i marker.

Per test locale si può usare `python3 -m http.server 8080`; sul server di produzione non serve alcun runtime.

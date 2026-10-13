(() => {
        const $ = id => document.getElementById(id);
        const s = {q: '', cat: 'Tutte', zoom: 1, sel: new Set(), peek: null};
        const vp = $('viewport'), stage = $('stage'), markers = $('markers'), img = $('map');
        const MAX_ZOOM = 4;
        const mobile = () => matchMedia('(max-width:699px)').matches;

        // Modalità totem attivabile con index.html?totem
        const params = new URLSearchParams(location.search);
        const totem = params.has('totem');
        const IDLE_MS = 60000;
        const STORE = `novello-selezione-${FESTA.anno}`;

        function showView(dishes) {
            document.body.classList.toggle('show-dishes', dishes);
            $('tab-dishes').classList.toggle('active', dishes);
            $('tab-map').classList.toggle('active', !dishes);
            if (!dishes) requestAnimationFrame(() => {
                layout();
                if (s.sel.size) fitSelection(false);
                else zoom(startZoom())
            });
        }

        $('tab-dishes').onclick = () => showView(true);
        $('tab-map').onclick = () => showView(false);

        function esc(v) {
            return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
        }

        function norm(v) {
            return String(v ?? '').toLocaleLowerCase('it-IT').normalize('NFD').replace(/\p{Diacritic}/gu, '')
        }

        function stand(id) {
            return FESTA.postazioni.find(x => x.id === id)
        }

        // Ogni pallino è una cantina con un numero identificativo univoco.
        function num(p) {
            return p.numero ?? FESTA.postazioni.indexOf(p) + 1
        }

        function dish(id) {
            return FESTA.pietanze.find(x => x.id === id)
        }

        // Postazioni delle pietanze selezionate, ognuna con le sue pietanze
        function selected() {
            let m = new Map();
            s.sel.forEach(id => {
                let d = dish(id), p = d && stand(d.postazione);
                if (!p) return;
                if (!m.has(p.id)) m.set(p.id, {p, dishes: []});
                m.get(p.id).dishes.push(d)
            });
            return [...m.values()].sort((a, b) => num(a.p) - num(b.p))
        }

        function cats() {
            return ['Tutte', ...new Set(FESTA.pietanze.map(x => x.categoria).filter(Boolean))]
        }

        function renderFilters() {
            $('filters').innerHTML = cats().map(c => `<button type="button" class="filter ${s.cat === c ? 'active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
            document.querySelectorAll('.filter').forEach(b => b.onclick = () => {
                s.cat = b.dataset.c;
                renderFilters();
                renderDishes()
            })
        }

        function renderMarkers() {
            let active = new Set(selected().map(x => x.p.id));
            markers.innerHTML = FESTA.postazioni.map(p => `<button type="button" class="marker ${active.has(p.id) ? 'active' : ''} ${s.peek === p.id ? 'peek' : ''}" style="left:${+p.x || 0}%;top:${+p.y || 0}%" data-id="${esc(p.id)}" aria-label="Cantina ${num(p)}: ${esc(p.nome)}">${num(p)}<span>${esc(p.nome)}</span></button>`).join('');
            document.querySelectorAll('button.marker').forEach(b => b.onclick = () => peek(b.dataset.id))
        }

        // Tocco su un pallino: mostra nome e pietanze di quella cantina
        function peek(id) {
            let p = stand(id);
            s.peek = s.peek === id ? null : id;
            renderMarkers();
            let ds = FESTA.pietanze.filter(d => d.postazione === id).map(d => d.nome);
            if (s.peek) toast(`Cantina ${num(p)} · ${p.nome}${ds.length ? ': ' + ds.join(', ') : ''}`)
        }

        function renderCurrent() {
            let g = selected(), e = $('current');
            if (!g.length) {
                e.innerHTML = `<div class="legend">${totem ? 'Tocca le pietanze per vedere in quale cantina ritirarle.' : 'Ogni pallino è una cantina. Seleziona le pietanze per vedere dove ritirarle.'}</div>`;
                return
            }
            e.innerHTML = g.map(({p, dishes}) => `<button type="button" class="stop" data-id="${esc(p.id)}"><i>${num(p)}</i><span><b>${esc(p.nome)}</b><small>${dishes.map(d => esc(d.nome)).join(', ')}</small></span></button>`).join('');
            e.querySelectorAll('.stop').forEach(b => b.onclick = () => centerOn(stand(b.dataset.id), true))
        }

        function filtered() {
            let q = norm(s.q);
            return FESTA.pietanze.filter(d => (s.cat === 'Tutte' || d.categoria === s.cat) && (!q || norm(`${d.nome} ${d.categoria} ${d.descrizione}`).includes(q)))
        }

        function renderDishes() {
            let ds = filtered();
            $('count').textContent = `${ds.length} ${ds.length === 1 ? 'pietanza' : 'pietanze'}`;
            $('empty').classList.toggle('hidden', ds.length > 0);
            $('dishes').innerHTML = ds.map(d => {
                let p = stand(d.postazione), on = s.sel.has(d.id),
                    go = p && p.lat != null && p.lng != null ? `<a class="go" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.lat + ',' + p.lng + ' (' + p.nome + ')')}">↗ Come arrivare</a>` : '';
                return `<article class="dish ${on ? 'active' : ''}" data-id="${esc(d.id)}" role="checkbox" aria-checked="${on}" tabindex="0"><span class="check" aria-hidden="true"></span><div class="body"><div class="top"><div class="dishname">${esc(d.nome)}</div><div class="cat">${esc(d.categoria || '')}</div></div><div class="where">${p ? `<i>${num(p)}</i> Cantina · ${esc(p.nome)}` : '📍 Cantina non configurata'}</div>${d.descrizione ? `<div class="desc">${esc(d.descrizione)}</div>` : ''}${go}</div></article>`
            }).join('');
            document.querySelectorAll('.dish').forEach(e => {
                e.onclick = ev => {
                    if (!ev.target.closest('a')) toggle(e.dataset.id)
                };
                e.onkeydown = ev => {
                    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === e) {
                        ev.preventDefault();
                        toggle(e.dataset.id)
                    }
                }
            })
        }

        function renderSelection() {
            let n = s.sel.size, g = selected().length;
            $('selbar').classList.toggle('hidden', !n);
            $('showmap').textContent = `🗺️ Vedi sulla mappa (${g} ${g === 1 ? 'cantina' : 'cantine'})`;
            $('tab-count').textContent = g;
            $('tab-count').classList.toggle('hidden', !g);
            renderMarkers();
            renderCurrent();
            vp.style.setProperty('--scroll-extra', `${$('current').offsetHeight}px`)
        }

        function toggle(id) {
            let d = dish(id);
            if (!d) return;
            if (!stand(d.postazione)) return toast('Questa pietanza non ha una cantina configurata.');
            s.sel.has(id) ? s.sel.delete(id) : s.sel.add(id);
            s.peek = null;
            save();
            renderDishes();
            renderSelection();
            // Su schermi grandi la mappa è sempre visibile: la aggiorniamo subito
            if (!mobile()) fitSelection(true)
        }

        function save() {
            if (totem) return;
            try {
                localStorage.setItem(STORE, JSON.stringify([...s.sel]))
            } catch (e) {
            }
        }

        function restore() {
            if (totem) return;
            try {
                JSON.parse(localStorage.getItem(STORE) || '[]').forEach(id => {
                    if (dish(id)) s.sel.add(id)
                })
            } catch (e) {
            }
        }

        function clearSelection() {
            s.sel.clear();
            s.peek = null;
            save();
            renderDishes();
            renderSelection()
        }

        function centerOn(p, smooth) {
            if (!p) return;
            let x = (+p.x || 0) / 100 * stage.offsetWidth + stage.offsetLeft;
            let y = (+p.y || 0) / 100 * stage.offsetHeight + stage.offsetTop;
            // Il riquadro delle postazioni copre il fondo della mappa: alziamo un po' il centro
            let cover = $('current').offsetHeight / 2;
            vp.scrollTo({left: x - vp.clientWidth / 2, top: y - (vp.clientHeight - cover) / 2, behavior: smooth ? 'smooth' : 'auto'})
        }

        // Inquadra tutte le postazioni selezionate
        function fitSelection(smooth) {
            let pts = selected().map(x => x.p);
            if (!pts.length || !vp.clientWidth) return;
            let xs = pts.map(p => (+p.x || 0) / 100), ys = pts.map(p => (+p.y || 0) / 100);
            let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
            let f = fitWidth(), ratio = imgRatio(), cover = $('current').offsetHeight;
            let zx = (vp.clientWidth - 80) / ((x1 - x0) * f);
            let zy = (vp.clientHeight - cover - 100) / ((y1 - y0) * f / ratio);
            let z = Math.min(zx, zy, Math.max(2, startZoom()));
            zoom(Math.max(1, z));
            centerOn({x: (x0 + x1) * 50, y: (y0 + y1) * 50}, smooth)
        }

        /*
         * Zoom 1 = mappa intera adattata al riquadro (contain).
         * Lo stage ha una larghezza in px; l'immagine lo segue mantenendo le proporzioni.
         */
        function imgRatio() {
            return img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 480 / 1960
        }

        function fitWidth() {
            return Math.min(vp.clientWidth, vp.clientHeight * imgRatio())
        }

        // Zoom iniziale: riempie la larghezza, ma senza superare il doppio della vista intera
        function startZoom() {
            let f = fitWidth();
            return f ? Math.min(2, vp.clientWidth / f) : 1
        }

        function layout() {
            if (vp.clientWidth) stage.style.width = fitWidth() * s.zoom + 'px'
        }

        // Zooma mantenendo fermo il punto (cx, cy) del viewport (di default il centro)
        function zoom(z, cx = vp.clientWidth / 2, cy = vp.clientHeight / 2) {
            z = Math.max(1, Math.min(MAX_ZOOM, z));
            let w = stage.offsetWidth, h = stage.offsetHeight;
            let rx = w ? (vp.scrollLeft + cx - stage.offsetLeft) / w : .5;
            let ry = h ? (vp.scrollTop + cy - stage.offsetTop) / h : .5;
            s.zoom = z;
            layout();
            vp.scrollLeft = rx * stage.offsetWidth + stage.offsetLeft - cx;
            vp.scrollTop = ry * stage.offsetHeight + stage.offsetTop - cy;
            $('minus').disabled = z <= 1;
            $('plus').disabled = z >= MAX_ZOOM
        }

        // Pinch con due dita sulla mappa
        let pinch = null;
        const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
        vp.addEventListener('touchstart', e => {
            if (e.touches.length === 2) pinch = {d: dist(e.touches), z: s.zoom}
        }, {passive: true});
        vp.addEventListener('touchmove', e => {
            if (!pinch || e.touches.length !== 2) return;
            e.preventDefault();
            let r = vp.getBoundingClientRect();
            let cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
            let cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
            zoom(pinch.z * dist(e.touches) / pinch.d, cx, cy)
        }, {passive: false});
        vp.addEventListener('touchend', e => {
            if (e.touches.length < 2) pinch = null
        });
        // Rotella / pinch del trackpad su desktop
        vp.addEventListener('wheel', e => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            let r = vp.getBoundingClientRect();
            zoom(s.zoom * Math.exp(-e.deltaY / 200), e.clientX - r.left, e.clientY - r.top)
        }, {passive: false});
        // Safari iOS: evita lo zoom dell'intera pagina sopra la mappa
        vp.addEventListener('gesturestart', e => e.preventDefault());

        function toast(t) {
            let e = $('toast');
            e.textContent = t;
            e.classList.add('show');
            clearTimeout(window.tt);
            window.tt = setTimeout(() => e.classList.remove('show'), 3500)
        }

        // Riporta tutto allo stato iniziale (usato dal totem dopo inattività)
        function reset() {
            s.q = '';
            s.cat = 'Tutte';
            $('search').value = '';
            document.activeElement?.blur();
            clearSelection();
            renderFilters();
            if (mobile()) {
                s.zoom = 1;
                showView(true)
            } else zoom(startZoom());
            vp.scrollTop = 0;
            $('dishes').scrollTop = 0
        }

        if (totem) {
            document.body.classList.add('totem');
            let idle;
            const wake = () => {
                clearTimeout(idle);
                idle = setTimeout(reset, IDLE_MS)
            };
            ['pointerdown', 'keydown', 'input', 'wheel'].forEach(t => addEventListener(t, wake, {passive: true}));
            vp.addEventListener('scroll', wake, {passive: true});
            wake()
        }

        $('name').textContent = FESTA.nome;
        $('year').textContent = FESTA.anno;
        $('subtitle').textContent = FESTA.sottotitolo;
        document.title = `${FESTA.nome} – Navigatore`;

        let started = false;
        const start = () => {
            if (started || !vp.clientWidth || !img.naturalWidth) return;
            started = true;
            zoom(startZoom());
            vp.scrollTop = 0;
            fitSelection(false)
        };
        img.onload = () => {
            $('maploading').classList.add('hidden');
            start()
        };
        img.onerror = () => $('maploading').textContent = 'Mappa non disponibile: controlla la connessione e ricarica la pagina.';
        img.src = FESTA.mappa?.immagine || 'mappa-catignano.webp';
        // Rotazione / barra del browser: ricalcola le dimensioni mantenendo il centro
        new ResizeObserver(() => {
            vp.style.setProperty('--scroll-extra', `${$('current').offsetHeight}px`);
            start();
            if (started) zoom(s.zoom)
        }).observe(vp);

        $('search').oninput = e => {
            s.q = e.target.value;
            renderDishes()
        };
        $('clear').onclick = () => {
            $('search').value = '';
            s.q = '';
            renderDishes()
        };
        $('clearsel').onclick = clearSelection;
        $('showmap').onclick = () => mobile() ? showView(false) : fitSelection(true);
        $('plus').onclick = () => zoom(s.zoom * 1.4);
        $('minus').onclick = () => zoom(s.zoom / 1.4);
        $('reset').onclick = () => zoom(1);

        restore();
        renderFilters();
        renderDishes();
        renderSelection();
        layout();
        // Riaprendo il QR con pietanze già scelte, si va direttamente alla mappa
        if (s.sel.size && mobile()) showView(false);

        // Salva l'app sul telefono: alle aperture successive funziona anche senza rete
        if ('serviceWorker' in navigator && location.protocol !== 'file:') {
            addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {
            }))
        }
    }

)
();

(() => {
        const $ = id => document.getElementById(id), s = {q: '', cat: 'Tutte', zoom: 1, active: null};
        const vp = $('viewport'), stage = $('stage'), markers = $('markers');

        const tabMap = $('tab-map');
        const tabDishes = $('tab-dishes');
        tabDishes.onclick = () => {
            document.body.classList.add('show-dishes');
            tabDishes.classList.add('active');
            tabMap.classList.remove('active');
        };
        tabMap.onclick = () => {
            document.body.classList.remove('show-dishes');
            tabMap.classList.add('active');
            tabDishes.classList.remove('active');
        };

        function esc(v) {
            return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
        }

        function norm(v) {
            return String(v ?? '').toLocaleLowerCase('it-IT').normalize('NFD').replace(/\p{Diacritic}/gu, '')
        }

        function stand(id) {
            return FESTA.postazioni.find(x => x.id === id)
        }

        function cats() {
            return ['Tutte', ...new Set(FESTA.pietanze.map(x => x.categoria).filter(Boolean))]
        }

        function renderFilters() {
            $('filters').innerHTML = cats().map(c => `<button class="filter ${s.cat === c ? 'active' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
            document.querySelectorAll('.filter').forEach(b => b.onclick = () => {
                s.cat = b.dataset.c;
                renderFilters();
                renderDishes()
            })
        }

        function renderMarkers() {
            markers.innerHTML = FESTA.postazioni.map((p, i) => `<button class="marker ${s.active === p.id ? 'active' : ''}" style="left:${+p.x || 0}%;top:${+p.y || 0}%" data-id="${esc(p.id)}">${i + 1}<span>${esc(p.nome)}</span></button>`).join('');
            document.querySelectorAll('.marker').forEach(b => b.onclick = () => focus(b.dataset.id, false))
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
                let p = stand(d.postazione),
                    go = p && p.lat != null && p.lng != null ? `<a class="go" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.lat + ',' + p.lng + ' (' + p.nome + ')')}">↗ Come arrivare</a>` : '';
                return `<article class="dish ${s.active === d.postazione ? 'active' : ''}" data-id="${esc(d.id)}"><div class="top"><div class="dishname">${esc(d.nome)}</div><div class="cat">${esc(d.categoria || '')}</div></div><div class="where">📍 ${esc(p?.nome || 'Postazione non configurata')}</div>${d.descrizione ? `<div class="desc">${esc(d.descrizione)}</div>` : ''}${go}</article>`
            }).join('');
            document.querySelectorAll('.dish').forEach(e => e.onclick = ev => {
                if (ev.target.closest('a')) return;
                let d = FESTA.pietanze.find(x => x.id === e.dataset.id);
                if (d) focus(d.postazione, true)
            })
        }

        function focus(id, scroll) {
            let p = stand(id);
            if (!p) return toast('Questa pietanza non ha una postazione configurata.');
            s.active = id; // Su smartphone, se siamo nella vista Pietanze, 
            // torniamo automaticamente alla mappa. 
            if (scroll && window.innerWidth < 700) {
                document.body.classList.remove('show-dishes');
                $('tab-map').classList.add('active');
                $('tab-dishes').classList.remove('active');
            }
            renderMarkers();
            renderDishes();
            if (scroll) {
                vp.parentElement.scrollIntoView({behavior: 'smooth'});
            }
            setTimeout(() => {
                let x = (+p.x || 0) / 100 * stage.clientWidth;
                let y = (+p.y || 0) / 100 * stage.clientHeight;
                vp.scrollTo({
                    left: Math.max(0, x - vp.clientWidth / 2),
                    top: Math.max(0, y - vp.clientHeight / 2),
                    behavior: 'smooth'
                });
            }, scroll ? 350 : 50);
        }

        function zoom(z) {
            s.zoom = Math.max(1, Math.min(2.5, +z.toFixed(1)));
            stage.style.width = s.zoom * 100 + '%';
            $('reset').textContent = Math.round(s.zoom * 100) + '%'
        }

        function toast(t) {
            let e = $('toast');
            e.textContent = t;
            e.classList.add('show');
            clearTimeout(window.tt);
            window.tt = setTimeout(() => e.classList.remove('show'), 3000)
        }

        $('name').textContent = FESTA.nome;
        $('year').textContent = FESTA.anno;
        $('subtitle').textContent = FESTA.sottotitolo;
        $('map').src = FESTA.mappa?.immagine || 'mappa-catignano.png';
        $('search').oninput = e => {
            s.q = e.target.value;
            renderDishes()
        };
        $('clear').onclick = () => {
            $('search').value = '';
            s.q = '';
            renderDishes()
        };
        $('plus').onclick = () => zoom(s.zoom + .2);
        $('minus').onclick = () => zoom(s.zoom - .2);
        $('reset').onclick = () => zoom(1);
        $('locate').onclick = () => navigator.geolocation?.getCurrentPosition(p => toast(`Posizione: ${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`), () => toast('Impossibile rilevare la posizione.'));
        renderFilters();
        renderMarkers();
        renderDishes()

        if (window.innerWidth < 700) {
            document.body.classList.add('show-dishes');
            $('tab-map').classList.remove('active');
            $('tab-dishes').classList.add('active');
        }
    }

)
();

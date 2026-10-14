const EDITOR_USERNAME = 'admin';
const EDITOR_PASSWORD = 'ProLocoCatignano2026';

(() => {
    const login = document.getElementById('login');
    const form = document.getElementById('login-form');
    const user = document.getElementById('login-user');
    const pass = document.getElementById('login-pass');
    const error = document.getElementById('login-error');

    if (sessionStorage.getItem('editor-auth') === 'ok') {
        login.remove();
    } else {
        document.body.classList.add('locked');

        form.onsubmit = e => {
            e.preventDefault();

            if (
                user.value === EDITOR_USERNAME &&
                pass.value === EDITOR_PASSWORD
            ) {
                sessionStorage.setItem('editor-auth', 'ok');
                login.remove();
                document.body.classList.remove('locked');
            } else {
                error.classList.add('show');
                pass.value = '';
                pass.focus();
            }
        };
    }
    
    const d = JSON.parse(JSON.stringify(FESTA));
    let sel = d.postazioni[0]?.id || null, zoom = 1, drag = null;
    const $ = id => document.getElementById(id), vp = $('vp'), stage = $('stage'), markers = $('markers'),
        modal = $('modal'), fields = $('fields');

    function esc(v) {
        return String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
    }

    function escA(v) {
        return esc(v)
    }

    function n(v) {
        return Number.isFinite(Number(v)) ? Number(v) : 0
    }

    function clamp(v, a, b) {
        return Math.min(b, Math.max(a, v))
    }

    // Ogni cantina ha un numero identificativo univoco.
    function num(p) {
        return p.numero ?? d.postazioni.indexOf(p) + 1
    }

    function standIds(x) {
        return Array.isArray(x.postazione) ? x.postazione : (x.postazione ? [x.postazione] : [])
    }

    function render() {
        $('ename').value = d.nome || '';
        $('eyear').value = d.anno || '';
        $('esub').value = d.sottotitolo || '';
        renderStands();
        renderDishes();
        renderMarkers();
        label()
    }

    function renderStands() {
        $('stands').innerHTML = d.postazioni.map(p => `<div class="item ${p.id === sel ? 'sel' : ''}" data-id="${esc(p.id)}"><div><b>Cantina ${num(p)} · ${esc(p.nome)}</b><div class="meta">X ${n(p.x).toFixed(1)}% · Y ${n(p.y).toFixed(1)}%</div></div><div><button class="mini edit">✎</button><button class="mini danger del">×</button></div></div>`).join('');
        document.querySelectorAll('#stands .item').forEach(e => {
            e.onclick = () => select(e.dataset.id);
            e.querySelector('.edit').onclick = x => {
                x.stopPropagation();
                standModal(e.dataset.id)
            };
            e.querySelector('.del').onclick = x => {
                x.stopPropagation();
                delStand(e.dataset.id)
            }
        })
    }

    function renderDishes() {
        $('dishes').innerHTML = d.pietanze.map(x => {
            let ps = standIds(x).map(id => d.postazioni.find(y => y.id === id)).filter(Boolean);
            return `<div class="item"><div><b>${esc(x.nome)}</b><div class="meta">${esc(x.categoria || '')} · ${ps.length ? ps.map(p => esc(p.nome)).join(', ') : 'Nessuna cantina'}</div></div><div><button class="mini editdish" data-id="${esc(x.id)}">✎</button><button class="mini danger deldish" data-id="${esc(x.id)}">×</button></div></div>`
        }).join('');
        document.querySelectorAll('.editdish').forEach(b => b.onclick = () => dishModal(b.dataset.id));
        document.querySelectorAll('.deldish').forEach(b => b.onclick = () => delDish(b.dataset.id))
    }

    function renderMarkers() {
        markers.innerHTML = d.postazioni.map(p =>
            `<button class="marker ${p.id === sel ? 'sel' : ''}"
             data-id="${esc(p.id)}"
             style="left:${n(p.x)}%;top:${n(p.y)}%">
        ${num(p)}
     </button>`
        ).join('');
        document.querySelectorAll('.marker').forEach(b => {
            b.onclick = () => select(b.dataset.id);
            b.onpointerdown = startDrag
        })
    }

    function select(id) {
        sel = id;
        renderStands();
        renderMarkers();
        label();
        let p = d.postazioni.find(x => x.id === id);
        if (p) {
            let x = n(p.x) / 100 * stage.clientWidth, y = n(p.y) / 100 * stage.clientHeight;
            vp.scrollTo({
                left: Math.max(0, x - vp.clientWidth / 2),
                top: Math.max(0, y - vp.clientHeight / 2),
                behavior: 'smooth'
            })
        }
    }

    function label() {
        let p = d.postazioni.find(x => x.id === sel);
        $('selected').textContent = p ? `Cantina ${num(p)} · ${p.nome} · ${n(p.x).toFixed(1)}%, ${n(p.y).toFixed(1)}%` : 'Nessuna cantina'
    }

    function startDrag(e) {
        e.preventDefault();
        let id = e.currentTarget.dataset.id;
        select(id);
        drag = {id, pid: e.pointerId};
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end)
    }

    function move(e) {
        if (!drag || e.pointerId !== drag.pid) return;
        let r = stage.getBoundingClientRect(), p = d.postazioni.find(x => x.id === drag.id);
        if (!p) return;
        p.x = Math.round(clamp((e.clientX - r.left) / r.width * 100, 0, 100) * 100) / 100;
        p.y = Math.round(clamp((e.clientY - r.top) / r.height * 100, 0, 100) * 100) / 100;
        let m = document.querySelector(`.marker[data-id="${CSS.escape(p.id)}"]`);
        if (m) {
            m.style.left = p.x + '%';
            m.style.top = p.y + '%'
        }
        label()
    }

    function end() {
        drag = null;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', end);
        renderStands();
        renderMarkers()
    }

    function standModal(id) {
        let p = d.postazioni.find(x => x.id === id);
        $('mtitle').textContent = 'Modifica cantina';
        fields.innerHTML = `<label>Nome della cantina<input name="name" required value="${escA(p.nome)}"></label><label>Numero sul pallino (unico per ogni cantina)<input name="numero" type="number" min="1" required value="${escA(num(p))}"></label><label>Latitudine (opzionale)<input name="lat" value="${escA(p.lat ?? '')}"></label><label>Longitudine (opzionale)<input name="lng" value="${escA(p.lng ?? '')}"></label>`;
        modal.dataset.type = 'stand';
        modal.dataset.id = id;
        modal.classList.remove('hidden')
    }

    function dishModal(id) {
        let x = id ? d.pietanze.find(y => y.id === id) : {
            id: 'nuova-pietanza',
            nome: '',
            categoria: '',
            descrizione: '',
            postazione: d.postazioni[0]?.id ? [d.postazioni[0].id] : []
        };
        let assigned = standIds(x);
        $('mtitle').textContent = id ? 'Modifica pietanza' : 'Nuova pietanza';
        fields.innerHTML = `<label>Nome<input name="name" required value="${escA(x.nome)}"></label><label>ID tecnico<input name="id" required value="${escA(x.id)}" ${id ? 'readonly' : ''}></label><label>Categoria<input name="cat" value="${escA(x.categoria || '')}"></label><label>Descrizione<textarea name="desc" rows="3">${esc(x.descrizione || '')}</textarea></label><div class="stand-choices"><b>Cantine di ritiro</b><small>Puoi selezionarne più di una.</small>${d.postazioni.map(p => `<label><input type="checkbox" name="stands" value="${escA(p.id)}" ${assigned.includes(p.id) ? 'checked' : ''}> Cantina ${num(p)} · ${esc(p.nome)}</label>`).join('')}</div>`;
        modal.dataset.type = 'dish';
        modal.dataset.id = id || '';
        modal.classList.remove('hidden')
    }

    $('form').onsubmit = e => {
        e.preventDefault();
        let f = new FormData(e.target), type = modal.dataset.type, id = modal.dataset.id;
        if (type === 'stand') {
            let p = d.postazioni.find(x => x.id === id);
            let numero = Math.max(1, parseInt(f.get('numero'), 10) || num(p));
            if (d.postazioni.some(x => x !== p && num(x) === numero)) {
                toast(`Il numero ${numero} è già assegnato a un'altra cantina`);
                return
            }
            p.nome = String(f.get('name')).trim() || 'Cantina';
            p.numero = numero;
            p.lat = coord(f.get('lat'));
            p.lng = coord(f.get('lng'));
        } else {
            let x = {
                id: String(f.get('id')).trim(),
                nome: String(f.get('name')).trim(),
                categoria: String(f.get('cat')).trim(),
                descrizione: String(f.get('desc')).trim(),
                postazione: f.getAll('stands').map(String)
            };
            if (id) Object.assign(d.pietanze.find(y => y.id === id), x); else d.pietanze.push(x)
        }
        close();
        render()
    };

    function close() {
        $('modal').classList.add('hidden')
    }

    $('close').onclick = close;
    $('cancel').onclick = close;
    $('addstand').onclick = () => {
        let id = next();
        let numero = Math.max(0, ...d.postazioni.map(num)) + 1;
        d.postazioni.push({id, nome: 'Nuova cantina', numero, x: 50, y: 50, lat: null, lng: null});
        sel = id;
        standModal(id)
    };
    $('adddish').onclick = () => dishModal();

    function delStand(id) {
        let p = d.postazioni.find(x => x.id === id);
        if (!confirm(`Eliminare "${p.nome}"?`)) return;
        d.postazioni = d.postazioni.filter(x => x.id !== id);
        d.pietanze.forEach(x => {
            x.postazione = standIds(x).filter(standId => standId !== id)
        });
        sel = d.postazioni[0]?.id || null;
        render()
    }

    function delDish(id) {
        let x = d.pietanze.find(y => y.id === id);
        if (confirm(`Eliminare "${x.nome}"?`)) {
            d.pietanze = d.pietanze.filter(y => y.id !== id);
            render()
        }
    }

    function next() {
        let i = 1;
        while (d.postazioni.some(x => x.id === `P${String(i).padStart(2, '0')}`)) i++;
        return `P${String(i).padStart(2, '0')}`
    }

    function coord(v) {
        let s = String(v ?? '').trim().replace(',', '.');
        if (!s) return null;
        let x = Number(s);
        return Number.isFinite(x) ? x : null
    }

    // Zoom 100% = mappa intera visibile in altezza (la mappa è stretta e lunga)
    function setZoom(z) {
        zoom = clamp(+z.toFixed(1), 1, 4);
        let img = $('map'), ratio = img.naturalWidth ? img.naturalWidth / img.naturalHeight : 480 / 1960;
        stage.style.width = Math.min(vp.clientWidth, vp.clientHeight * ratio) * zoom + 'px';
        $('zr').textContent = Math.round(zoom * 100) + '%';
        renderMarkers()
    }

    $('map').onload = () => setZoom(zoom);
    $('map').src = d.mappa?.immagine || 'mappa-catignano.webp';
    addEventListener('resize', () => setZoom(zoom));

    $('totem').onclick = () => {
        let url = new URL('index.html?totem', location.href).href;
        navigator.clipboard?.writeText(url).then(() => toast('Link del totem copiato'), () => null);
        prompt('Apri questo indirizzo sul totem:', url)
    };

    $('in').onclick = () => setZoom(zoom + .2);
    $('out').onclick = () => setZoom(zoom - .2);
    $('zr').onclick = () => setZoom(1);
    $('ename').oninput = e => d.nome = e.target.value;
    $('eyear').oninput = e => d.anno = Number(e.target.value);
    $('esub').oninput = e => d.sottotitolo = e.target.value;
    $('export').onclick = () => {
        let blob = new Blob([`const FESTA=${JSON.stringify(d, null, 2)};\n`], {type: 'text/javascript'}),
            a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'config.js';
        a.click();
        URL.revokeObjectURL(a.href);
        toast('config.js esportato')
    };
    $('import').onclick = () => $('file').click();
    $('file').onchange = async e => {
        let f = e.target.files[0];
        if (!f) return;
        try {
            let t = await f.text(),
                x = f.name.endsWith('.json') ? JSON.parse(t) : Function(`return (${t.replace(/^\s*const\s+FESTA\s*=\s*/, '').replace(/;\s*$/, '')})`)();
            if (!x.postazioni || !x.pietanze) throw Error('Configurazione non valida');
            Object.keys(d).forEach(k => delete d[k]);
            Object.assign(d, JSON.parse(JSON.stringify(x)));
            sel = d.postazioni[0]?.id || null;
            render();
            toast('Configurazione importata')
        } catch (err) {
            alert(err.message)
        }
        e.target.value = ''
    };

    function toast(t) {
        let e = $('toast');
        e.textContent = t;
        e.classList.add('show');
        clearTimeout(window.to);
        window.to = setTimeout(() => e.classList.remove('show'), 2500)
    }

    render()
})();

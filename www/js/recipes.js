/* Aba "Ideias novas": busca receitas nos sites usando os ingredientes de que as crianças gostam */
(function () {
  'use strict';
  const SITES = [
    {
      key: 'tudogostoso', name: 'TudoGostoso', color: '#f39c3d',
      search: q => `https://www.tudogostoso.com.br/busca?q=${encodeURIComponent(q)}`,
      link: /^https:\/\/(www\.)?tudogostoso\.com\.br\/receita\/[^"'#?\s<>]+$/i
    },
    {
      key: 'globo', name: 'Receitas Globo', color: '#e8555a',
      search: q => `https://receitas.globo.com/busca/?q=${encodeURIComponent(q)}`,
      link: /^https:\/\/receitas\.globo\.com\/[^"'#?\s<>]*receita[^"'#?\s<>]*\.ghtml$/i
    },
    {
      key: 'alimentando', name: 'Alimentando com Amor', color: '#7fb27a',
      search: q => `https://alimentandocomamor.com.br/?s=${encodeURIComponent(q)}`,
      api: q => `https://alimentandocomamor.com.br/wp-json/wp/v2/posts?search=${encodeURIComponent(q)}&per_page=12&_embed=wp:featuredmedia`,
      link: /^https:\/\/(www\.)?alimentandocomamor\.com\.br\/(?!temas\/|tag\/|category\/|author\/|page\/|wp-)[a-z0-9-]{8,}\/?$/i
    }
  ];

  // ---------- HTTP (nativo no APK; proxy no modo de desenvolvimento) ----------
  const pending = {};
  window.__nativeHttpDone = (id, ok, body) => { const p = pending[id]; if (p) { delete pending[id]; ok ? p.res(body) : p.rej(new Error(body)); } };
  function httpGet(url) {
    if (window.NativeHttp && window.NativeHttp.get) {
      return new Promise((res, rej) => {
        const id = 'r' + Math.random().toString(36).slice(2);
        pending[id] = { res, rej };
        setTimeout(() => { if (pending[id]) { delete pending[id]; rej(new Error('tempo esgotado')); } }, 30000);
        window.NativeHttp.get(id, url);
      });
    }
    const viaProxy = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? fetch('/proxy?url=' + encodeURIComponent(url)) : Promise.reject(new Error('busca automática disponível só no app Android'));
    return viaProxy.then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
  }

  // ---------- Leitura dos resultados ----------
  const httpsUrl = (u, base) => { try { const x = new URL(u, base); return x.protocol === 'https:' ? x.href : ''; } catch (e) { return ''; } };
  const imgOf = v => { if (!v) return ''; if (Array.isArray(v)) return imgOf(v[0]); if (typeof v === 'object') return imgOf(v.url || v.contentUrl || ''); return typeof v === 'string' ? v : ''; };
  const clean = s => String(s || '').replace(/\s+/g, ' ').replace(/&nbsp;/g, ' ').trim();
  const decode = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
  const slugTitle = url => { const m = url.replace(/\/$/, '').split('/').pop().replace(/\.(ghtml|html?)$/, '').replace(/^\d+-/, ''); return m.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()); };

  function parseHTML(html, site) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = new Map();
    const base = site.search('x');
    const add = (url, title, img) => {
      url = httpsUrl(String(url || '').split('#')[0], base);
      if (!url || !site.link.test(url)) return;
      img = httpsUrl(imgOf(img), url);
      const cur = out.get(url) || { url, title: '', img: '' };
      if (title && title.length > cur.title.length && title.length < 140) cur.title = title;
      if (img && !cur.img) cur.img = img;
      out.set(url, cur);
    };
    // 1) Dados estruturados (JSON-LD)
    doc.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const walk = o => {
          if (!o || typeof o !== 'object') return;
          if (Array.isArray(o)) return o.forEach(walk);
          if (o.itemListElement) walk(o.itemListElement);
          if (o['@graph']) walk(o['@graph']);
          const it = o.item && typeof o.item === 'object' ? o.item : o;
          const url = it.url || (typeof o.item === 'string' ? o.item : null);
          if (url && (it.name || o.name)) add(url, clean(String(it.name || o.name)), it.image);
        };
        walk(JSON.parse(s.textContent));
      } catch (e) { /* ignora */ }
    });
    // 2) Links da página
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = httpsUrl(a.getAttribute('href'), base);
      if (!href || !site.link.test(href)) return;
      const h = a.querySelector('h1,h2,h3,h4,[class*="title"],[class*="titulo"]');
      const imgEl = a.querySelector('img') || (a.closest('article,li,[class*="card"]') || a).querySelector('img');
      const img = imgEl ? (imgEl.getAttribute('data-src') || imgEl.getAttribute('data-lazy-src') || (imgEl.getAttribute('srcset') || '').split(' ')[0] || imgEl.getAttribute('src')) : '';
      const title = clean((h && h.textContent) || a.getAttribute('title') || (imgEl && imgEl.getAttribute('alt')) || a.textContent);
      add(href, title, img);
    });
    return Array.from(out.values()).map(r => ({ ...r, title: r.title || slugTitle(r.url) })).slice(0, 15);
  }

  async function searchSite(site, q) {
    if (site.api) {
      try {
        const posts = JSON.parse(await httpGet(site.api(q)));
        if (Array.isArray(posts)) return posts.map(p => ({
          url: httpsUrl(p && p.link), title: clean(decode(String((p && p.title && p.title.rendered) || ''))).slice(0, 140),
          img: httpsUrl((((p && p._embedded) || {})['wp:featuredmedia'] || [])[0] && p._embedded['wp:featuredmedia'][0].source_url)
        })).filter(r => r.url && /^https:\/\/(www\.)?alimentandocomamor\.com\.br\//i.test(r.url)).map(r => ({ ...r, title: r.title || slugTitle(r.url) }));
      } catch (e) { /* tenta a página de busca */ }
    }
    return parseHTML(await httpGet(site.search(q)), site);
  }

  // ---------- Estado da aba ----------
  const st = { mode: 'ing', free: '', selected: null, sites: new Set(SITES.map(s => s.key)), kidsOnly: false, extra: '', results: null, errors: {}, loading: false };

  function topIngredients(db) {
    const count = {};
    db.dishes.filter(d => d.status !== 'arquivado').forEach(d => d.ingredients.forEach(i => {
      const k = i.toLowerCase().trim(); if (!k || ['sal', 'açúcar', 'acucar', 'mel', 'canela', 'óleo', 'azeite'].includes(k)) return;
      count[k] = (count[k] || 0) + 1 + (d.likedBy.length > 1 ? 0.5 : 0);
    }));
    return Object.keys(count).sort((a, b) => count[b] - count[a]);
  }

  function guessSlots(title) {
    const t = title.toLowerCase();
    const s = new Set();
    if (/bolo|panqueca|muffin|cookie|biscoit|vitamina|smoothie|mingau|tapioca|crepioca|p[aã]o|waffle|iogurte|picol|sorvete|granola|barrinha|torrada|pudim|mousse/.test(t)) ['cafe', 'lanche_manha', 'lanche_tarde'].forEach(x => s.add(x));
    if (/sopa|caldo|creme de|canja/.test(t)) s.add('janta');
    if (/arroz|risot|frango|carne|peixe|macarr|massa|escondidinho|almôndega|almondega|feij|lasanha|nhoque|torta|quiche|omelete|hamb|strogonoff|estrogonofe|legume|purê|pure|polenta|panqueca de carne/.test(t)) { s.add('almoco'); s.add('janta'); }
    if (!s.size) ['lanche_tarde'].forEach(x => s.add(x));
    return Array.from(s);
  }

  function render(m, api) {
    const db = api.db; const esc = api.esc; const norm = api.norm;
    const ings = topIngredients(db);
    if (!st.selected) st.selected = new Set(ings.slice(0, 2));
    const kidsNow = api.activeKids();
    m.innerHTML = `
      <div class="seg" role="tablist" aria-label="Tipo de busca">
        <button role="tab" class="seg-b ${st.mode === 'ing' ? 'on' : ''}" data-rmode="ing">Por ingrediente</button>
        <button role="tab" class="seg-b ${st.mode === 'livre' ? 'on' : ''}" data-rmode="livre">Busca livre</button>
      </div>
      <section class="card-plain">
        ${st.mode === 'ing' ? `
        <h3>Ingredientes que eles já gostam</h3>
        ${ings.length ? `<p class="muted">Escolha 1 a 3 para combinar.</p>
        <div class="chips">${ings.map(i => `<button class="chip ${st.selected.has(i) ? 'on' : ''}" data-i="${esc(i)}">${esc(i)}</button>`).join('')}</div>` : '<p class="muted">Cadastre pratos com ingredientes para ver sugestões aqui — ou digite um ingrediente abaixo.</p>'}
        <input class="pill search" id="rx" placeholder="Outro ingrediente (opcional)" value="${esc(st.extra)}">` : `
        <h3>O que você procura?</h3>
        <p class="muted">Busque qualquer receita nos três sites: nome do prato, ingrediente, ocasião…</p>
        <input class="pill search" id="rq" type="search" enterkeyhint="search" placeholder="ex.: bolo de banana sem açúcar" value="${esc(st.free)}">`}
        <div class="chips sites">${SITES.map(s => `<label class="chip"><input type="checkbox" data-s="${s.key}" ${st.sites.has(s.key) ? 'checked' : ''}><i class="dot" style="background:${s.color}"></i>${s.name}</label>`).join('')}
          <label class="chip"><input type="checkbox" id="rk" ${st.kidsOnly ? 'checked' : ''}>👶 Só receitas infantis</label></div>
        <button class="btn btn-pink wide" id="rgo" ${st.loading ? 'disabled' : ''}>${st.loading ? 'Buscando…' : '🔎 Buscar ideias'}</button>
      </section>
      <div id="rres">${resultsHTML()}</div>`;

    function query() {
      if (st.mode === 'livre') return st.free.trim() + (st.kidsOnly ? ' infantil' : '');
      const parts = Array.from(st.selected).slice(0, 3); if (st.extra.trim()) parts.push(st.extra.trim());
      return parts.join(' ') + (st.kidsOnly ? ' infantil' : '');
    }
    function resultsHTML() {
      if (st.loading) return `<div class="loading"><span></span><span></span><span></span></div>`;
      if (!st.results) return `<p class="muted center">${st.mode === 'livre' ? 'Digite o que procura e toque em “Buscar ideias”.' : 'Toque em “Buscar ideias” para ver receitas novas com esses ingredientes.'}</p>`;
      const known = new Set(db.dishes.map(d => norm(d.name)));
      const sel = st.mode === 'livre' ? norm(st.free).split(/\s+/).filter(w => w.length > 2) : Array.from(st.selected).map(norm).concat(st.extra ? [norm(st.extra)] : []);
      const list = st.results.map(r => {
        const nt = norm(r.title);
        const al = api.textAllergyHits(r.title, kidsNow);
        return { ...r, hits: sel.filter(s => nt.includes(s)).length, allergy: al.length ? al.map(h => `${h.kid.name}: ${h.allergy}`).join(', ') : '', known: known.has(nt) };
      }).sort((a, b) => b.hits - a.hits);
      const q = query();
      const errs = SITES.filter(s => st.errors[s.key]);
      return `
        ${list.length ? `<div class="recipes">${list.map((r, i) => `
          <article class="recipe">
            <a class="r-img" target="_blank" href="${esc(r.url)}">${r.img ? `<img src="${esc(r.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="r-site" style="background:${r.color}">${esc(r.site)}</span></a>
            <div class="r-body"><b>${esc(r.title)}</b>
              ${r.allergy ? `<small class="warn">⚠️ pode conter alergênico (${esc(r.allergy)})</small>` : ''}
              <div class="r-actions"><a class="btn small" target="_blank" href="${esc(r.url)}">Ver receita</a>
              ${r.known ? '<span class="tag">já cadastrado</span>' : `<button class="btn small btn-pink" data-add="${i}">+ Pratos</button>`}</div></div>
          </article>`).join('')}</div>` : `<p class="muted center">Nenhuma receita encontrada nos sites.</p>`}
        ${errs.length || !list.length ? `<section class="card-plain"><h3>Abrir a busca direto no site</h3><p class="muted">${errs.length ? 'Não consegui ler ' + errs.map(s => s.name).join(', ') + ' agora. ' : ''}Você pode abrir a mesma busca no navegador:</p>
          <div class="stack">${SITES.filter(s => st.sites.has(s.key)).map(s => `<a class="btn" target="_blank" href="${esc(s.search(q))}">${s.name} ↗</a>`).join('')}</div></section>` : ''}
        ${(st.lastList = list, '')}`;
    }
    function bindResults() {
      $$('[data-add]', m).forEach(b => b.onclick = () => {
        const r = st.lastList[+b.dataset.add];
        const nt = norm(r.title);
        const ingr = ings.filter(i => nt.includes(norm(i)));
        api.addDish({ name: r.title.slice(0, 120), ingredients: ingr.length ? ingr : Array.from(st.selected), slots: guessSlots(r.title), status: 'testar', url: api.safeUrl(r.url), source: r.site, notes: `Receita: ${r.site}` });
      });
    }
    const $$ = (s, root) => Array.from(root.querySelectorAll(s));
    $$('[data-i]', m).forEach(b => b.onclick = () => { const i = b.dataset.i; st.selected.has(i) ? st.selected.delete(i) : st.selected.add(i); render(m, api); });
    $$('[data-s]', m).forEach(c => c.onchange = () => { c.checked ? st.sites.add(c.dataset.s) : st.sites.delete(c.dataset.s); });
    m.querySelector('#rk').onchange = e => st.kidsOnly = e.target.checked;
    $$('[data-rmode]', m).forEach(b => b.onclick = () => { if (st.mode !== b.dataset.rmode) { st.mode = b.dataset.rmode; st.results = null; render(m, api); } });
    const rx = m.querySelector('#rx'); if (rx) rx.oninput = e => st.extra = e.target.value;
    const rq = m.querySelector('#rq'); if (rq) { rq.oninput = e => st.free = e.target.value; rq.onkeydown = e => { if (e.key === 'Enter') m.querySelector('#rgo').click(); }; }
    m.querySelector('#rgo').onclick = async () => {
      if (st.mode === 'livre' && !st.free.trim()) return api.toast('Digite o que você procura');
      if (st.mode === 'ing' && !st.selected.size && !st.extra.trim()) return api.toast('Escolha pelo menos um ingrediente');
      if (!st.sites.size) return api.toast('Escolha pelo menos um site');
      st.loading = true; st.errors = {}; render(m, api);
      const q = query();
      const sites = SITES.filter(s => st.sites.has(s.key));
      const all = [];
      await Promise.all(sites.map(async s => {
        try {
          let r = await searchSite(s, q);
          if (st.mode === 'ing' && r.length < 3 && st.selected.size > 1) { // poucos resultados: tenta cada ingrediente sozinho
            for (const i of Array.from(st.selected).slice(0, 3)) { try { r = r.concat(await searchSite(s, i + (st.kidsOnly ? ' infantil' : ''))); } catch (e) { } }
          }
          const seen = new Set();
          r.filter(x => !seen.has(x.url) && seen.add(x.url)).slice(0, 10).forEach(x => all.push({ ...x, site: s.name, color: s.color }));
        } catch (e) { st.errors[s.key] = e.message || 'erro'; }
      }));
      st.results = all; st.loading = false;
      if (document.body.contains(m)) { render(m, api); }
    };
    bindResults();
  }

  window.Recipes = { render, parseHTML, SITES };
})();

/* Comelança — app principal */
(function () {
  'use strict';

  // ---------- Constantes ----------
  const SLOTS = [
    { key: 'cafe', label: 'Café da Manhã', short: 'Café', art: 'cafe' },
    { key: 'lanche_manha', label: 'Lanche da Manhã', short: 'Lanche M.', art: 'lanche_manha' },
    { key: 'almoco', label: 'Almoço', short: 'Almoço', art: 'almoco' },
    { key: 'lanche_tarde', label: 'Lanche da Tarde', short: 'Lanche T.', art: 'lanche_tarde' },
    { key: 'janta', label: 'Janta', short: 'Janta', art: 'janta' }
  ];
  const SLOT = Object.fromEntries(SLOTS.map(s => [s.key, s]));
  const DOW = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const DOW3 = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const KID_COLORS = ['#f2b8c6', '#a9d3e6', '#f7d54e', '#b9d7a6', '#f0a07a', '#cdb8e6'];
  const KEY = 'comelanca:data';

  // ---------- Utilidades ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const weekStart = s => { const d = parseISO(s); d.setDate(d.getDate() - d.getDay()); return iso(d); }; // domingo
  const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
  const fmtLong = s => { const d = parseISO(s); return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`.toUpperCase(); };
  const fmtShort = s => { const d = parseISO(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
  const splitList = s => String(s || '').split(/[,;\n]/).map(x => x.trim()).filter(Boolean);

  // ---------- Armazenamento ----------
  let db;
  function load() {
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !db.dishes) db = JSON.parse(JSON.stringify(window.SEED));
    db.plan = db.plan || {}; db.school = db.school || {}; db.children = db.children || []; db.dishes = db.dishes || [];
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('Não foi possível salvar'); } }
  const dish = id => db.dishes.find(d => d.id === id);
  const kid = id => db.children.find(c => c.id === id);
  const cell = (date, slot) => (db.plan[date] && db.plan[date][slot]) || null;
  function setCell(date, slot, val) {
    db.plan[date] = db.plan[date] || {};
    if (!val || (!val.items.length && !val.locked)) delete db.plan[date][slot]; else db.plan[date][slot] = val;
    if (!Object.keys(db.plan[date]).length) delete db.plan[date];
  }

  // Última vez que o prato foi comido antes de uma data (tabela + calendário)
  function lastEaten(dishId, before) {
    const d = dish(dishId); let last = d && d.lastServed && d.lastServed < before ? d.lastServed : null;
    for (const date in db.plan) {
      if (date >= before) continue;
      if (last && date <= last) continue;
      const day = db.plan[date];
      for (const k in day) if (day[k].items.includes(dishId)) { last = date; break; }
    }
    return last;
  }
  function sinceLabel(dishId) {
    const t = today(); const l = lastEaten(dishId, addDays(t, 1));
    if (!l) return { text: 'nunca registrado', days: 9999 };
    const n = diffDays(l, t);
    return { text: n === 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`, days: n };
  }

  // Alergias: ingrediente do prato contém (ou está contido em) alguma alergia
  function allergyHits(d, kids) {
    const hits = [];
    for (const k of kids) for (const a of k.allergies || []) {
      const na = norm(a); if (!na) continue;
      const txt = norm(d.name + ' ' + d.ingredients.join(' '));
      if (txt.includes(na) || d.ingredients.some(i => na.includes(norm(i)) && norm(i).length > 2)) hits.push(`${k.name}: ${a}`);
    }
    return hits;
  }
  const activeKids = () => state.kid === 'all' ? db.children : db.children.filter(c => c.id === state.kid);

  // ---------- Sugestão ----------
  function schoolWords(date) { const si = schoolInfo(date, 'almoco', activeKids()); return si ? norm(si.text).split(/[^a-z]+/).filter(w => w.length > 3 && !['assado', 'assada', 'grelhado', 'molho', 'refogado'].includes(w)) : []; }

  function candidates(slot, date, kids, usedWeek, usedDay) {
    const t = date;
    return db.dishes.filter(d => d.slots.includes(slot) && d.status !== 'arquivado')
      .filter(d => kids.some(k => d.likedBy.includes(k.id)) || !kids.length)
      .map(d => {
        const safeKids = kids.filter(k => !allergyHits(d, [k]).length);
        const covers = safeKids.filter(k => d.likedBy.includes(k.id));
        if (kids.length && !covers.length) return null;
        const l = lastEaten(d.id, t);
        let score = l ? Math.min(diffDays(l, t), 21) : 25;
        score += covers.length * 3;
        score -= (usedWeek[d.id] || 0) * 14;
        if (usedDay.has('#' + d.id)) score -= 30; // mesmo prato no mesmo dia
        const ingOverlap = d.ingredients.filter(i => usedDay.has(norm(i))).length;
        score -= ingOverlap * 6;
        if (slot === 'janta') { const sw = schoolWords(date); if (sw.some(w => norm(d.name + ' ' + d.ingredients.join(' ')).includes(w))) score -= 8; }
        if (d.status === 'testar') score -= 4;
        score += Math.random() * 4;
        return { d, score, covers };
      }).filter(Boolean).sort((a, b) => b.score - a.score);
  }

  function suggestCell(date, slot, ctx) {
    const kids = activeKids();
    const list = candidates(slot, date, kids, ctx.usedWeek, ctx.usedDay);
    if (!list.length) return [];
    const first = list[0]; const items = [first.d.id];
    const missing = kids.filter(k => !first.covers.includes(k));
    if (missing.length) {
      const extra = list.find(c => c.d.id !== first.d.id && missing.some(k => c.covers.includes(k)));
      if (extra) items.push(extra.d.id);
    }
    return items;
  }

  function planRange(dates, onlyEmpty = true) {
    let filled = 0;
    const ws = weekStart(dates[0]);
    const usedWeek = {};
    for (let i = 0; i < 7; i++) { const day = db.plan[addDays(ws, i)] || {}; for (const k in day) day[k].items.forEach(id => usedWeek[id] = (usedWeek[id] || 0) + 1); }
    for (const date of dates) {
      const usedDay = new Set();
      const day = db.plan[date] || {};
      for (const k in day) day[k].items.forEach(id => { usedDay.add('#' + id); const d = dish(id); d && d.ingredients.forEach(i => usedDay.add(norm(i))); });
      for (const s of SLOTS) {
        const c = cell(date, s.key);
        if (c && (c.locked || (onlyEmpty && c.items.length))) continue;
        const si = schoolInfo(date, s.key, activeKids()); if (si && si.all) continue;
        if (c && !onlyEmpty) c.items.forEach(id => usedWeek[id] = Math.max(0, (usedWeek[id] || 1) - 1));
        const items = suggestCell(date, s.key, { usedWeek, usedDay });
        if (!items.length) continue;
        setCell(date, s.key, { items, locked: false });
        items.forEach(id => { usedWeek[id] = (usedWeek[id] || 0) + 1; usedDay.add('#' + id); const d = dish(id); d.ingredients.forEach(i => usedDay.add(norm(i))); });
        filled++;
      }
    }
    save();
    return filled;
  }

  // ---------- Estado e navegação ----------
  const state = { view: 'dia', date: today(), week: weekStart(today()), kid: 'all', dishFilter: 'all', dishQuery: '' };
  const TABS = [
    { key: 'dia', label: 'Dia', icon: '<path d="M4 6h16M4 12h16M4 18h10"/>' },
    { key: 'semana', label: 'Semana', icon: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>' },
    { key: 'pratos', label: 'Pratos', icon: '<path d="M4 11a8 8 0 0 0 16 0z"/><path d="M12 3v3"/>' },
    { key: 'receitas', label: 'Receitas', icon: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>' },
    { key: 'filhos', label: 'Filhos', icon: '<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.5"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6M14.5 15.2c3 -.6 6 1.3 6 4.8"/>' }
  ];
  const svgI = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

  function go(view) { state.view = view; render(); window.scrollTo(0, 0); }

  function render() {
    const app = $('#app');
    const titles = { dia: 'Cardápio do Dia', semana: 'Cardápio da Semana', pratos: 'Pratos', receitas: 'Ideias Novas', filhos: 'Filhos' };
    app.innerHTML = `
      <header class="top"><h1 class="title-outline">${titles[state.view]}</h1></header>
      <main id="main" class="view-${state.view}"></main>
      <nav class="tabs">${TABS.map(t => `<button class="tab ${state.view === t.key ? 'on' : ''}" data-tab="${t.key}">${svgI(t.icon)}<span>${t.label}</span></button>`).join('')}</nav>`;
    $$('.tab', app).forEach(b => b.onclick = () => go(b.dataset.tab));
    ({ dia: renderDay, semana: renderWeek, pratos: renderDishes, receitas: () => window.Recipes.render($('#main'), API), filhos: renderKids })[state.view]();
  }

  function kidSelect() {
    return `<label class="pill pill-select"><select id="kidSel">
      <option value="all" ${state.kid === 'all' ? 'selected' : ''}>${db.children.length > 1 ? 'TODOS' : 'TODOS'}</option>
      ${db.children.map(c => `<option value="${c.id}" ${state.kid === c.id ? 'selected' : ''}>${esc(c.name.toUpperCase())}</option>`).join('')}
    </select><svg viewBox="0 0 12 12"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></label>`;
  }
  function bindKidSelect() { const s = $('#kidSel'); if (s) s.onchange = () => { state.kid = s.value; render(); }; }

  function itemLine(id, kids) {
    const d = dish(id); if (!d) return '';
    const notes = [];
    for (const k of kids) if (d.variations && d.variations[k.id]) notes.push(`${k.name}: ${d.variations[k.id]}`);
    const notFor = kids.filter(k => !d.likedBy.includes(k.id)).map(k => k.name);
    const forWho = kids.length > 1 && notFor.length ? ` <em class="who">(só ${esc(kids.filter(k => d.likedBy.includes(k.id)).map(k => k.name).join(', '))})</em>` : '';
    const al = allergyHits(d, kids);
    return `<li>${esc(d.name)}${forWho}${notes.length ? `<small> — ${esc(notes.join('; '))}</small>` : ''}${al.length ? `<span class="warn">⚠️ alergia (${esc(al.join(', '))})</span>` : ''}</li>`;
  }

  // ---------- Aba Dia ----------
  function renderDay() {
    const m = $('#main'); const kids = activeKids(); const date = state.date;
    const isToday = date === today();
    m.innerHTML = `
      <div class="toolbar">
        <button class="pill icon-btn" id="prev" aria-label="Dia anterior">‹</button>
        <label class="pill date-pill">${isToday ? 'HOJE · ' : ''}${DOW3[parseISO(date).getDay()]}, ${parseISO(date).getDate()} ${MONTHS[parseISO(date).getMonth()].slice(0, 3).toUpperCase()}<input type="date" id="datePick" value="${date}"></label>
        <button class="pill icon-btn" id="next" aria-label="Próximo dia">›</button>
        ${kidSelect()}
      </div>
      ${schoolHoliday(date) ? '<div class="holiday">🏖️ Feriado — sem aula hoje</div>' : ''}
      ${db.children.length ? '' : `<button class="card-plain onboard" id="goKids"><b>👋 Bem-vindo(a) ao Comelança!</b><br><span class="muted">Comece cadastrando as crianças na aba <b>Filhos</b> — ou importe os dados de outro celular por lá.</span></button>`}
      <div class="cards">${SLOTS.map(s => {
        const c = cell(date, s.key); const items = c ? c.items : [];
        const school = schoolInfo(date, s.key, kids);
        return `<button class="meal meal-${s.key}" data-slot="${s.key}">
          <span class="meal-art">${ART[s.art]}</span>
          <span class="meal-body">
            <span class="meal-title title-outline">${s.label}${c && c.locked ? ' <span class="lock">🔒</span>' : ''}</span>
            ${schoolBadge(school)}
            ${items.length ? `<ul>${items.map(id => itemLine(id, kids)).join('')}</ul>` : (school && school.all ? '' : '<span class="empty">Toque para escolher</span>')}
          </span></button>`;
      }).join('')}</div>
      <div class="actions"><button class="btn btn-pink" id="sugDay">✨ Sugerir o que falta hoje</button></div>`;
    bindKidSelect();
    $('#prev').onclick = () => { state.date = addDays(date, -1); render(); };
    $('#next').onclick = () => { state.date = addDays(date, 1); render(); };
    $('#datePick').onchange = e => { if (e.target.value) { state.date = e.target.value; render(); } };
    $$('.meal', m).forEach(b => b.onclick = () => openSlot(date, b.dataset.slot));
    const gk = $('#goKids'); if (gk) gk.onclick = () => go('filhos');
    $('#sugDay').onclick = () => { const n = planRange([date]); toast(n ? `${n} refeição(ões) sugerida(s)` : 'Nada para sugerir — tudo preenchido'); render(); };
  }

  // Folha para escolher pratos de uma refeição
  function openSlot(date, slotKey) {
    const s = SLOT[slotKey]; const kids = activeKids();
    const c = cell(date, slotKey) || { items: [], locked: false };
    let sel = c.items.slice(); let locked = c.locked;
    const draw = () => {
      const list = db.dishes.filter(d => d.slots.includes(slotKey) && d.status !== 'arquivado')
        .map(d => ({ d, since: sinceLabel(d.id) })).sort((a, b) => b.since.days - a.since.days);
      const others = db.dishes.filter(d => !d.slots.includes(slotKey) && d.status !== 'arquivado');
      sheet.body.innerHTML = `
        <p class="muted">${DOW[parseISO(date).getDay()]}, ${fmtShort(date)} · ordenado pelo que está há mais tempo sem aparecer</p>
        <div class="choices">${list.map(({ d, since }) => choice(d, since)).join('') || '<p class="muted">Nenhum prato cadastrado para esta refeição.</p>'}</div>
        ${others.length ? `<details class="others"><summary>Outros pratos (${others.length})</summary><div class="choices">${others.map(d => choice(d, sinceLabel(d.id))).join('')}</div></details>` : ''}
        <label class="check"><input type="checkbox" id="lockC" ${locked ? 'checked' : ''}> 🔒 Travar (a sugestão automática não altera)</label>
        <div class="sheet-actions">
          <button class="btn" id="sugOne">✨ Sugerir</button>
          <button class="btn" id="clrOne">Limpar</button>
          <button class="btn btn-pink" id="okOne">Salvar</button>
        </div>`;
      $$('.choice', sheet.body).forEach(b => b.onclick = () => { const id = b.dataset.id; sel = sel.includes(id) ? sel.filter(x => x !== id) : sel.concat(id); draw(); });
      $('#lockC').onchange = e => locked = e.target.checked;
      $('#sugOne').onclick = () => {
        const usedWeek = {}; const ws = weekStart(date);
        for (let i = 0; i < 7; i++) { const dd = addDays(ws, i); const day = db.plan[dd] || {}; for (const k in day) if (!(dd === date && k === slotKey)) day[k].items.forEach(id => usedWeek[id] = (usedWeek[id] || 0) + 1); }
        const usedDay = new Set(); const day = db.plan[date] || {};
        for (const k in day) if (k !== slotKey) day[k].items.forEach(id => { usedDay.add('#' + id); const d = dish(id); d && d.ingredients.forEach(i => usedDay.add(norm(i))); });
        sel = suggestCell(date, slotKey, { usedWeek, usedDay }); draw();
      };
      $('#clrOne').onclick = () => { sel = []; draw(); };
      $('#okOne').onclick = () => { setCell(date, slotKey, { items: sel, locked }); save(); closeSheet(); render(); };
    };
    const choice = (d, since) => {
      const on = sel.includes(d.id); const al = allergyHits(d, kids);
      const likes = db.children.filter(k => d.likedBy.includes(k.id));
      return `<button class="choice ${on ? 'on' : ''}" data-id="${d.id}">
        <span class="tick">${on ? '✓' : ''}</span>
        <span class="c-main"><b>${esc(d.name)}</b>${d.status === 'testar' ? ' <span class="tag">testar</span>' : ''}
        <small>${since.text} · ${likes.map(k => `<i class="dot" style="background:${k.color}"></i>${esc(k.name)}`).join(' ')}</small>
        ${al.length ? `<small class="warn">⚠️ ${esc(al.join(', '))}</small>` : ''}</span></button>`;
    };
    const sheet = openSheet(s.label, '', `meal-${slotKey}`);
    draw();
  }

  // ---------- Aba Semana ----------
  function renderWeek() {
    const m = $('#main'); const kids = activeKids(); const ws = state.week;
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const t = today();
    m.innerHTML = `
      <div class="toolbar">
        <button class="pill icon-btn" id="wprev">‹</button>
        <span class="pill date-pill">${fmtShort(ws)} – ${fmtShort(addDays(ws, 6))}</span>
        <button class="pill icon-btn" id="wnext">›</button>
        ${kidSelect()}
      </div>
      <div class="actions row">
        <button class="btn btn-pink" id="sugWeek">✨ Sugerir semana</button>
        <button class="btn" id="school">🏫 Escola</button>
        <button class="btn" id="more">⋯</button>
      </div>
      <div class="week">${days.map(date => `
        <section class="day ${date === t ? 'today' : ''}">
          <button class="day-head" data-date="${date}"><b>${DOW[parseISO(date).getDay()]}${schoolHoliday(date) ? ' <span class="tag">feriado</span>' : ''}</b><span>${fmtShort(date)}${date === t ? ' · hoje' : ''}</span></button>
          <div class="slots">${SLOTS.map(s => {
            const c = cell(date, s.key); const school = schoolInfo(date, s.key, kids);
            const names = c ? c.items.map(id => dish(id)).filter(Boolean).map(d => esc(d.name)) : [];
            return `<button class="slot meal-${s.key}" data-date="${date}" data-slot="${s.key}">
              <span class="slot-k">${s.short}${c && c.locked ? ' 🔒' : ''}</span>
              <span class="slot-v">${school ? `<span class="sch-mini">${schoolBadge(school, true)}</span>${names.length ? ' + ' : ''}` : ''}${names.join(' + ') || (school ? '' : '<i>—</i>')}</span></button>`;
          }).join('')}</div>
        </section>`).join('')}</div>`;
    bindKidSelect();
    $('#wprev').onclick = () => { state.week = addDays(ws, -7); render(); };
    $('#wnext').onclick = () => { state.week = addDays(ws, 7); render(); };
    $$('.slot', m).forEach(b => b.onclick = () => openSlot(b.dataset.date, b.dataset.slot));
    $$('.day-head', m).forEach(b => b.onclick = () => { state.date = b.dataset.date; go('dia'); });
    $('#sugWeek').onclick = () => {
      const from = ws < t ? t : ws; const ds = days.filter(d => d >= from);
      if (!ds.length) return toast('Essa semana já passou');
      const n = planRange(ds); toast(n ? `${n} refeições sugeridas 🎉` : 'Semana já está completa'); render();
    };
    $('#school').onclick = () => openSchool();
    $('#more').onclick = () => {
      const sh = openSheet('Opções da semana', `
        <div class="stack">
          <button class="btn" id="reSug">🔄 Refazer sugestões (mantém os travados)</button>
          <button class="btn" id="clrW">🧹 Limpar semana (mantém os travados)</button>
          <button class="btn" id="copyW">📋 Copiar cardápio como texto</button>
        </div>`);
      $('#reSug', sh.body).onclick = () => { const ds = days.filter(d => d >= t); planRange(ds, false); closeSheet(); render(); toast('Sugestões refeitas'); };
      $('#clrW', sh.body).onclick = () => { days.forEach(d => SLOTS.forEach(s => { const c = cell(d, s.key); if (c && !c.locked) setCell(d, s.key, null); })); save(); closeSheet(); render(); };
      $('#copyW', sh.body).onclick = () => { shareText(weekText(days)); closeSheet(); };
    };
  }
  function weekText(days) {
    return 'Cardápio Comelança\n' + days.map(date => `\n${DOW[parseISO(date).getDay()]} ${fmtShort(date)}\n` + SLOTS.map(s => {
      const c = cell(date, s.key); const names = c ? c.items.map(id => dish(id)).filter(Boolean).map(d => d.name) : [];
      const si = schoolInfo(date, s.key, activeKids()); if (si) names.unshift('Escola: ' + si.text);
      return `• ${s.label}: ${names.join(' + ') || '—'}`;
    }).join('\n')).join('\n');
  }

  // ---------- Cardápio da escola ----------
  const SCHOOL_SLOTS = ['lanche_manha', 'almoco', 'lanche_tarde', 'janta'];
  const VARIANTS = { regular: 'Cardápio regular', bercario: 'Berçário / Infantil I' };
  function schoolCfg() {
    const c = db.schoolCfg = db.schoolCfg || {};
    c.slots = c.slots || { lanche_manha: true, almoco: true, lanche_tarde: true, janta: false };
    c.days = c.days || [1, 2, 3, 4, 5];
    c.kids = c.kids || {};
    return c;
  }
  const kidSchool = k => schoolCfg().kids[k.id] || { attends: true, variant: 'regular' };
  function schoolEntry(date) { const e = db.school[date]; if (!e) return null; return typeof e === 'string' ? { almoco: { principal: e } } : e; }
  function schoolHoliday(date) { const e = schoolEntry(date); return !!(e && e.holiday && schoolCfg().days.includes(parseISO(date).getDay())); }
  // O que a escola serve nesta refeição para as crianças selecionadas (ou null)
  function schoolInfo(date, slot, kids) {
    const e = schoolEntry(date); const c = schoolCfg();
    if (!e || e.holiday || !c.slots[slot] || !c.days.includes(parseISO(date).getDay())) return null;
    const base = kids.length ? kids : db.children;
    const att = base.filter(k => kidSchool(k).attends);
    if (db.children.length && !att.length) return null;
    let text = '', detail = '';
    if (slot === 'almoco') {
      const a = e.almoco || {};
      text = [a.principal, a.guarnicao].filter(Boolean).join(' + ') || a.base || '';
      detail = [a.base, a.salada && 'Salada: ' + a.salada, a.sobremesa && 'Sobremesa: ' + a.sobremesa].filter(Boolean).join(' · ');
    } else if (slot === 'janta') {
      text = (e.janta || []).join(', ');
    } else {
      const v = e[slot] || {};
      const per = (att.length ? att : [null]).map(k => ({ k, t: (v[k ? kidSchool(k).variant : 'regular'] || v.regular || []).join(' + ') }));
      text = new Set(per.map(x => x.t)).size <= 1 ? per[0].t : per.map(x => `${x.k.name}: ${x.t}`).join(' · ');
    }
    if (!text) return null;
    const all = att.length === base.length;
    return { text, detail, all, who: base.length > 1 && !all ? att.map(k => k.name).join(', ') : '' };
  }
  function schoolBadge(si, compact) {
    if (!si) return '';
    const who = si.who ? ` (${esc(si.who)})` : '';
    return compact ? `🏫${who} ${esc(si.text)}` : `<span class="school">🏫 Escola${who}: ${esc(si.text)}${si.detail ? `<small>${esc(si.detail)}</small>` : ''}</span>`;
  }

  let pdfReady = null;
  function loadPdfLib() {
    if (window.pdfjsLib) return Promise.resolve();
    return pdfReady = pdfReady || new Promise((res, rej) => {
      const sc = document.createElement('script'); sc.src = 'vendor/pdf.min.js';
      sc.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; res(); };
      sc.onerror = () => { pdfReady = null; rej(new Error('Não foi possível carregar o leitor de PDF')); };
      document.head.appendChild(sc);
    });
  }

  function openSchool() {
    const sh = openSheet('🏫 Cardápio da escola', `
      <p class="muted">Importe o PDF do cardápio que a escola envia todo mês. O app lê o lanche da manhã, o almoço, o lanche da tarde e o jantar de cada dia, e reconhece os feriados.</p>
      <label class="btn btn-pink wide file-btn">📄 Importar cardápio (PDF)<input type="file" accept="application/pdf,.pdf" id="schF"></label>
      <button class="btn wide" id="schCfg">⚙️ Quais refeições são na escola</button>
      <div id="schList"></div>`);
    const list = () => {
      const days = Object.keys(db.school).sort();
      const t = today();
      const upcoming = days.filter(d => d >= weekStart(t));
      $('#schList', sh.body).innerHTML = days.length ? `
        <h3>Dias importados <small class="muted">(${days.length})</small></h3>
        ${(upcoming.length ? upcoming : days).map(d => { const e = schoolEntry(d); const a = (e && e.almoco) || {};
          return `<div class="sch-row"><b>${DOW3[parseISO(d).getDay()]} ${fmtShort(d)}</b><span>${e.holiday ? '🏖️ Feriado' : esc([a.principal, a.guarnicao].filter(Boolean).join(' + ') || '—')}</span><button class="x" data-del="${d}" aria-label="Remover dia">✕</button></div>`; }).join('')}
        ${upcoming.length && upcoming.length < days.length ? `<p class="muted">Dias anteriores a esta semana ficam guardados no histórico.</p>` : ''}
        <div class="sheet-actions"><button class="btn btn-danger" id="schClr">Apagar cardápio escolar</button></div>` : '<p class="muted">Nenhum cardápio importado ainda.</p>';
      $$('[data-del]', sh.body).forEach(b => b.onclick = () => { delete db.school[b.dataset.del]; save(); list(); });
      const clr = $('#schClr', sh.body); if (clr) clr.onclick = () => { if (confirm('Apagar todos os dias do cardápio escolar?')) { db.school = {}; save(); list(); } };
    };
    $('#schCfg', sh.body).onclick = () => openSchoolConfig(null);
    $('#schF', sh.body).onchange = async e => {
      const f = e.target.files && e.target.files[0]; e.target.value = '';
      if (!f) return;
      toast('Lendo o cardápio…');
      try {
        await loadPdfLib();
        const parsed = await window.SchoolPDF.parsePDF(await f.arrayBuffer(), new Date());
        if (!Object.keys(parsed).length) return toast('Não encontrei dias neste PDF. Confira se é o cardápio da escola.');
        openSchoolConfig(parsed);
      } catch (err) { toast('Não consegui ler este PDF: ' + (err.message || err)); }
    };
    list();
    sh.onClose = () => render();
  }

  // Caixa de diálogo: quais refeições são feitas na escola (e por qual criança)
  function openSchoolConfig(parsed) {
    const c = schoolCfg();
    let summary = '';
    if (parsed) {
      const ds = Object.keys(parsed).sort(); const hol = ds.filter(d => parsed[d].holiday);
      summary = `<div class="card-plain found"><b>✅ Cardápio lido!</b><br>${ds.length - hol.length} dias de aula de ${fmtShort(ds[0])} a ${fmtShort(ds[ds.length - 1])}${hol.length ? ` · ${hol.length} feriado${hol.length > 1 ? 's' : ''} (${hol.map(fmtShort).join(', ')})` : ''}</div>`;
    }
    const sh = openSheet(parsed ? 'Importar cardápio' : 'Refeições na escola', `
      ${summary}
      <h3>Quais refeições as crianças fazem na escola?</h3>
      <div class="stack">${SCHOOL_SLOTS.map(k => `<label class="opt meal-${k}"><input type="checkbox" name="ss" value="${k}" ${c.slots[k] ? 'checked' : ''}><span>${SLOT[k].label}</span></label>`).join('')}</div>
      <h3>Dias de aula</h3>
      <div class="chips">${[1, 2, 3, 4, 5, 6].map(d => `<label class="chip"><input type="checkbox" name="sd" value="${d}" ${c.days.includes(d) ? 'checked' : ''}>${DOW3[d]}</label>`).join('')}</div>
      ${db.children.length ? `<h3>Crianças</h3>${db.children.map(k => { const ks = kidSchool(k); return `
        <div class="kid-school"><label class="check"><input type="checkbox" data-att="${k.id}" ${ks.attends ? 'checked' : ''}><i class="dot" style="background:${k.color}"></i><b>${esc(k.name)}</b> vai à escola</label>
        <select data-var="${k.id}">${Object.entries(VARIANTS).map(([v, l]) => `<option value="${v}" ${ks.variant === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>`; }).join('')}` : ''}
      <p class="muted">As refeições marcadas aparecem no calendário como “🏫 Escola” e não entram na sugestão automática. A janta em casa evita repetir o que foi servido no almoço da escola.</p>
      <div class="sheet-actions"><button class="btn" id="cfgCancel">Cancelar</button><button class="btn btn-pink" id="cfgOk">${parsed ? 'Importar' : 'Salvar'}</button></div>`);
    $('#cfgCancel', sh.body).onclick = () => { closeSheet(); if (!parsed) openSchool(); };
    $('#cfgOk', sh.body).onclick = () => {
      const slots = {}; SCHOOL_SLOTS.forEach(k => slots[k] = false); $$('input[name=ss]:checked', sh.body).forEach(i => slots[i.value] = true);
      c.slots = slots;
      c.days = $$('input[name=sd]:checked', sh.body).map(i => +i.value);
      db.children.forEach(k => { const a = $(`[data-att="${k.id}"]`, sh.body), v = $(`[data-var="${k.id}"]`, sh.body); c.kids[k.id] = { attends: a ? a.checked : true, variant: v ? v.value : 'regular' }; });
      if (parsed) Object.assign(db.school, parsed);
      save(); closeSheet(); render();
      toast(parsed ? 'Cardápio da escola importado 🏫' : 'Configuração salva');
    };
  }

  // ---------- Aba Pratos ----------
  function renderDishes() {
    const m = $('#main');
    const q = norm(state.dishQuery);
    const list = db.dishes.filter(d => state.dishFilter === 'all' || (state.dishFilter === 'testar' ? d.status === 'testar' : d.slots.includes(state.dishFilter)))
      .filter(d => !q || norm(d.name + ' ' + d.ingredients.join(' ')).includes(q))
      .filter(d => state.kid === 'all' || d.likedBy.includes(state.kid))
      .map(d => ({ d, since: sinceLabel(d.id) })).sort((a, b) => b.since.days - a.since.days);
    m.innerHTML = `
      <div class="toolbar"><input class="pill search" id="dq" placeholder="Buscar prato ou ingrediente" value="${esc(state.dishQuery)}">${kidSelect()}</div>
      <div class="chips">${[['all', 'Todos'], ...SLOTS.map(s => [s.key, s.short]), ['testar', 'Para testar']].map(([k, l]) => `<button class="chip ${state.dishFilter === k ? 'on' : ''} ${SLOT[k] ? 'meal-' + k : ''}" data-f="${k}">${l}</button>`).join('')}</div>
      <div class="dish-list">${list.map(({ d, since }) => `
        <button class="dish" data-id="${d.id}">
          <span class="d-top"><b>${esc(d.name)}</b>${d.status === 'testar' ? '<span class="tag">testar</span>' : ''}<span class="since ${since.days > 10 ? 'old' : ''}">${since.text}</span></span>
          <span class="d-ing">${d.ingredients.map(esc).join(' · ')}</span>
          <span class="d-meta"><span class="slot-dots">${SLOTS.map(s => `<i class="sd meal-${s.key} ${d.slots.includes(s.key) ? 'on' : ''}" title="${s.label}">${s.short[0]}</i>`).join('')}</span>
          <span class="likes">${db.children.filter(k => d.likedBy.includes(k.id)).map(k => `<i class="dot" style="background:${k.color}"></i>${esc(k.name)}`).join(' ')}</span></span>
          ${d.notes ? `<span class="d-note">📝 ${esc(d.notes)}</span>` : ''}
        </button>`).join('') || '<p class="muted center">Nenhum prato encontrado.</p>'}</div>
      <button class="fab" id="addD" aria-label="Adicionar prato">+</button>`;
    bindKidSelect();
    const dq = $('#dq'); dq.oninput = () => { state.dishQuery = dq.value; const pos = dq.selectionStart; renderDishes(); const n = $('#dq'); n.focus(); n.setSelectionRange(pos, pos); };
    $$('.chip', m).forEach(b => b.onclick = () => { state.dishFilter = b.dataset.f; renderDishes(); });
    $$('.dish', m).forEach(b => b.onclick = () => editDish(b.dataset.id));
    $('#addD').onclick = () => editDish(null);
  }

  function editDish(id, preset) {
    const isNew = !id;
    const d = id ? JSON.parse(JSON.stringify(dish(id))) : Object.assign({ id: uid('d'), name: '', ingredients: [], slots: [], likedBy: db.children.map(c => c.id), notes: '', variations: {}, status: 'aprovado', lastServed: null, source: 'manual' }, preset || {});
    const sh = openSheet(isNew ? 'Novo prato' : 'Editar prato', `
      <label class="field"><span>Nome do prato</span><input id="fN" value="${esc(d.name)}"></label>
      <label class="field"><span>Ingredientes principais (separe por vírgula)</span><input id="fI" value="${esc(d.ingredients.join(', '))}"></label>
      <div class="field"><span>Servido em</span><div class="chips">${SLOTS.map(s => `<label class="chip meal-${s.key}"><input type="checkbox" name="sl" value="${s.key}" ${d.slots.includes(s.key) ? 'checked' : ''}>${s.short}</label>`).join('')}</div></div>
      <div class="field"><span>Quem gosta</span><div class="chips">${db.children.map(k => `<label class="chip"><input type="checkbox" name="lk" value="${k.id}" ${d.likedBy.includes(k.id) ? 'checked' : ''}><i class="dot" style="background:${k.color}"></i>${esc(k.name)}</label>`).join('')}</div></div>
      ${db.children.map(k => `<label class="field"><span>Jeito de servir para ${esc(k.name)} (opcional)</span><input data-var="${k.id}" value="${esc((d.variations || {})[k.id] || '')}" placeholder="ex.: com canela"></label>`).join('')}
      <label class="field"><span>Observações</span><textarea id="fO" rows="2">${esc(d.notes)}</textarea></label>
      <label class="field"><span>Última vez que comeram (se lembrar)</span><input type="date" id="fL" value="${d.lastServed || ''}"></label>
      <label class="field"><span>Situação</span><select id="fS">
        <option value="aprovado" ${d.status === 'aprovado' ? 'selected' : ''}>Aprovado pelas crianças</option>
        <option value="testar" ${d.status === 'testar' ? 'selected' : ''}>Para testar</option>
        <option value="arquivado" ${d.status === 'arquivado' ? 'selected' : ''}>Arquivado (não sugerir)</option></select></label>
      ${d.url ? `<p><a href="${esc(d.url)}" target="_blank" class="link">🔗 Ver receita original</a></p>` : ''}
      <div class="sheet-actions">${isNew ? '' : '<button class="btn btn-danger" id="fDel">Excluir</button>'}<button class="btn btn-pink" id="fSave">Salvar</button></div>`);
    $('#fSave', sh.body).onclick = () => {
      d.name = $('#fN', sh.body).value.trim();
      if (!d.name) return toast('Dê um nome ao prato');
      d.ingredients = splitList($('#fI', sh.body).value).map(s => s.toLowerCase());
      d.slots = $$('input[name=sl]:checked', sh.body).map(i => i.value);
      d.likedBy = $$('input[name=lk]:checked', sh.body).map(i => i.value);
      d.variations = {}; $$('[data-var]', sh.body).forEach(i => { if (i.value.trim()) d.variations[i.dataset.var] = i.value.trim(); });
      d.notes = $('#fO', sh.body).value.trim(); d.lastServed = $('#fL', sh.body).value || null; d.status = $('#fS', sh.body).value;
      if (!d.slots.length) return toast('Marque pelo menos uma refeição');
      if (isNew) db.dishes.push(d); else db.dishes[db.dishes.findIndex(x => x.id === d.id)] = d;
      save(); closeSheet(); render(); toast(isNew ? 'Prato adicionado' : 'Prato salvo');
    };
    const del = $('#fDel', sh.body);
    if (del) del.onclick = () => {
      if (!confirm(`Excluir "${d.name}"? Ele também sai do calendário.`)) return;
      db.dishes = db.dishes.filter(x => x.id !== d.id);
      for (const date in db.plan) for (const k in db.plan[date]) { const c = db.plan[date][k]; c.items = c.items.filter(x => x !== d.id); setCell(date, k, c); }
      save(); closeSheet(); render();
    };
  }

  // ---------- Aba Filhos ----------
  // Idade calculada a partir da data de nascimento
  function ageText(k) {
    if (k.birth) {
      const b = parseISO(k.birth), t = new Date();
      let y = t.getFullYear() - b.getFullYear(), m = t.getMonth() - b.getMonth();
      if (t.getDate() < b.getDate()) m--;
      if (m < 0) { y--; m += 12; }
      if (y < 0) return '';
      const parts = [];
      if (y > 0) parts.push(`${y} ano${y === 1 ? '' : 's'}`);
      if (y < 3 && m > 0) parts.push(`${m} ${m === 1 ? 'mês' : 'meses'}`);
      if (!parts.length) parts.push('recém-nascido(a)');
      const bday = b.getDate() === t.getDate() && b.getMonth() === t.getMonth() ? ' 🎂 Feliz aniversário!' : '';
      return `${parts.join(' e ')} · nasceu em ${pad(b.getDate())}/${pad(b.getMonth() + 1)}/${b.getFullYear()}${bday}`;
    }
    if (k.age !== '' && k.age != null) return `${k.age} anos — cadastre a data de nascimento`;
    return 'Data de nascimento não informada';
  }
  function renderKids() {
    const m = $('#main');
    m.innerHTML = `
      <div class="kids">${db.children.map(k => `
        <button class="kid" data-id="${k.id}" style="--kc:${k.color}">
          <span class="avatar">${esc(k.name[0] || '?')}</span>
          <span class="k-body"><b>${esc(k.name)}</b><small>${esc(ageText(k))}</small>
          <span class="k-al">${(k.allergies || []).length ? k.allergies.map(a => `<span class="tag tag-warn">⚠️ ${esc(a)}</span>`).join(' ') : '<small class="muted">Sem alergias cadastradas</small>'}</span>
          <small class="muted">${db.dishes.filter(d => d.likedBy.includes(k.id)).length} pratos favoritos</small></span>
        </button>`).join('') || '<p class="muted center">Nenhuma criança cadastrada.</p>'}</div>
      <div class="actions"><button class="btn btn-pink" id="addK">+ Adicionar criança</button></div>
      <section class="card-plain">
        <h3>Dados do app</h3>
        <p class="muted">Os dados ficam guardados neste celular. Para levar o cardápio a outro aparelho, exporte aqui e importe lá.</p>
        <div class="stack"><button class="btn" id="exp">📤 Exportar dados</button><button class="btn" id="imp">📥 Importar dados</button></div>
      </section>`;
    $$('.kid', m).forEach(b => b.onclick = () => editKid(b.dataset.id));
    $('#addK').onclick = () => editKid(null);
    $('#exp').onclick = () => shareText(JSON.stringify(db));
    $('#imp').onclick = () => {
      const sh = openSheet('Importar dados', `<p class="muted">Cole o texto exportado do outro aparelho. Isso substitui os dados deste celular.</p><textarea id="impT" rows="8"></textarea><div class="sheet-actions"><button class="btn btn-pink" id="impOk">Importar</button></div>`);
      $('#impOk', sh.body).onclick = () => {
        try { const x = JSON.parse($('#impT', sh.body).value); if (!x.dishes || !x.children) throw 0; db = x; db.plan = db.plan || {}; db.school = db.school || {}; save(); closeSheet(); render(); toast('Dados importados'); }
        catch (e) { toast('Texto inválido'); }
      };
    };
  }
  function editKid(id) {
    const isNew = !id;
    const k = id ? Object.assign({}, kid(id)) : { id: uid('c'), name: '', birth: null, allergies: [], color: KID_COLORS[db.children.length % KID_COLORS.length] };
    const sh = openSheet(isNew ? 'Nova criança' : 'Editar ' + k.name, `
      <label class="field"><span>Nome</span><input id="kN" value="${esc(k.name)}"></label>
      <label class="field"><span>Data de nascimento</span><input id="kB" type="date" max="${today()}" value="${esc(k.birth || '')}"></label>
      <p class="muted" id="kAge">${esc(ageText(k))}</p>
      <label class="field"><span>Alergias / restrições (separe por vírgula)</span><input id="kL" value="${esc((k.allergies || []).join(', '))}" placeholder="ex.: amendoim, leite"></label>
      <div class="field"><span>Cor</span><div class="colors">${KID_COLORS.map(c => `<label class="color"><input type="radio" name="kc" value="${c}" ${k.color === c ? 'checked' : ''}><i style="background:${c}"></i></label>`).join('')}</div></div>
      ${isNew ? `<label class="check"><input type="checkbox" id="kAll" checked> Marcar como “gosta” em todos os pratos atuais</label>` : ''}
      <div class="sheet-actions">${isNew ? '' : '<button class="btn btn-danger" id="kDel">Remover</button>'}<button class="btn btn-pink" id="kSave">Salvar</button></div>`);
    $('#kB', sh.body).onchange = e => { $('#kAge', sh.body).textContent = ageText({ birth: e.target.value || null, age: k.age }); };
    $('#kSave', sh.body).onclick = () => {
      k.name = $('#kN', sh.body).value.trim(); if (!k.name) return toast('Informe o nome');
      k.birth = $('#kB', sh.body).value || null;
      if (k.birth) delete k.age;
      k.allergies = splitList($('#kL', sh.body).value);
      const c = $('input[name=kc]:checked', sh.body); if (c) k.color = c.value;
      if (isNew) { db.children.push(k); const all = $('#kAll', sh.body); if (all && all.checked) db.dishes.forEach(d => d.likedBy.push(k.id)); }
      else db.children[db.children.findIndex(x => x.id === k.id)] = k;
      save(); closeSheet(); render(); toast('Salvo');
    };
    const del = $('#kDel', sh.body);
    if (del) del.onclick = () => {
      if (!confirm(`Remover ${k.name}?`)) return;
      db.children = db.children.filter(x => x.id !== k.id); db.dishes.forEach(d => { d.likedBy = d.likedBy.filter(x => x !== k.id); if (d.variations) delete d.variations[k.id]; });
      if (state.kid === k.id) state.kid = 'all';
      save(); closeSheet(); render();
    };
  }

  // ---------- Folhas (bottom sheets), toast, compartilhar ----------
  let current = null;
  function openSheet(title, html, cls = '') {
    closeSheet(true);
    const wrap = document.createElement('div'); wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet ${cls}"><div class="sheet-head"><h2 class="title-outline">${esc(title)}</h2><button class="x" aria-label="Fechar">✕</button></div><div class="sheet-body">${html}</div></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    const s = { wrap, body: $('.sheet-body', wrap), onClose: null };
    $('.x', wrap).onclick = () => closeSheet();
    wrap.addEventListener('click', e => { if (e.target === wrap) closeSheet(); });
    current = s; return s;
  }
  function closeSheet(instant) {
    if (!current) return false;
    const s = current; current = null;
    if (instant) s.wrap.remove(); else { s.wrap.classList.remove('open'); setTimeout(() => s.wrap.remove(), 250); }
    if (s.onClose) s.onClose();
    return true;
  }
  let tt;
  function toast(msg) {
    let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2400);
  }
  function shareText(text) {
    if (window.NativeHttp && window.NativeHttp.share) return window.NativeHttp.share(text);
    if (navigator.share) return navigator.share({ text }).catch(() => {});
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('Copiado!'), () => toast('Não foi possível copiar'));
  }
  window.onAndroidBack = () => {
    if (current) { closeSheet(); return true; }
    if (state.view !== 'dia') { go('dia'); return true; }
    return false;
  };

  // API exposta à aba de receitas
  const API = {
    get db() { return db; }, save, toast, openSheet, closeSheet, editDish, esc, norm, activeKids, SLOTS,
    addDish(preset) { editDish(null, preset); }
  };

  // ---------- Início ----------
  load();
  render();
  setTimeout(() => { const sp = $('#splash'); if (sp) { sp.classList.add('hide'); setTimeout(() => sp.remove(), 600); } }, 1300);
})();

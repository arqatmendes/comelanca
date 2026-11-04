/* Leitura do cardápio escolar em PDF (tabela semanal: Lanche da manhã, Almoço, Lanche da tarde, Jantar) */
(function () {
  'use strict';
  const norm = s => String(s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const LABELS = [
    { re: /^LANCHE DA MANHA/, key: 'lm' },
    { re: /^LANCHE DA TARDE/, key: 'lt' },
    { re: /^BERCARIO/, key: 'ber' },
    { re: /^PRATO BASE/, key: 'base' },
    { re: /^PRATO PRINCIPAL/, key: 'principal' },
    { re: /^GUARNICAO/, key: 'guarnicao' },
    { re: /^SALADA/, key: 'salada' },
    { re: /^SOBREMESA/, key: 'sobremesa' }
  ];

  async function extractItems(data) {
    const lib = window.pdfjsLib;
    if (!lib) throw new Error('Leitor de PDF indisponível');
    if (!lib.GlobalWorkerOptions.workerSrc) lib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
    const doc = await lib.getDocument({ data }).promise;
    const items = []; let offset = 0;
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const vp = page.getViewport({ scale: 1 });
      const tc = await page.getTextContent();
      for (const it of tc.items) {
        if (!it.str || !it.str.trim()) continue;
        const h = it.height || Math.abs(it.transform[3]) || 10;
        items.push({ str: it.str, x: it.transform[4], w: it.width, y: offset + vp.height - it.transform[5], h });
      }
      offset += vp.height + 50; // páginas empilhadas numa única coordenada vertical
    }
    return items.sort((a, b) => a.y - b.y || a.x - b.x);
  }

  // Junta pedaços de texto da mesma linha
  function mergeLines(list) {
    const lines = [];
    for (const it of list.slice().sort((a, b) => a.y - b.y || a.x - b.x)) {
      const l = lines.find(L => Math.abs(L.y - it.y) < 2.5);
      if (l) l.parts.push(it); else lines.push({ y: it.y, parts: [it] });
    }
    for (const l of lines) {
      l.parts.sort((a, b) => a.x - b.x);
      let s = '', end = null;
      for (const p of l.parts) { s += (end !== null && p.x - end > 1.5 && !/\s$/.test(s) && !/^\s/.test(p.str)) ? ' ' + p.str : p.str; end = p.x + p.w; }
      l.text = s.replace(/\s+/g, ' ').trim();
    }
    return lines.sort((a, b) => a.y - b.y);
  }

  // Transforma linhas de uma célula em itens ("Bolo de cenoura c/" + "laranja" = um item)
  function toDishes(lines) {
    const out = [];
    for (const raw of lines) {
      const t = raw.trim(); if (!t) continue;
      if (t.startsWith('*')) { if (out.length) out[out.length - 1] += ' (' + t.slice(1).trim() + ')'; continue; }
      const prev = out[out.length - 1];
      const cont = prev && (/^[a-zà-ú(]/.test(t) || /(\bc\/|\bde|\bcom|\be|\bao|\bà|,|\/|\bdo|\bda)$/i.test(prev));
      if (cont) out[out.length - 1] = (prev + (prev.endsWith('/') && !/\bc\/$/i.test(prev) ? '' : ' ') + t).replace(/\s+/g, ' ');
      else out.push(t);
    }
    return out.map(s => s.replace(/,,+/g, ',').replace(/[.,]\s*$/, '').trim()).filter(Boolean);
  }

  function inferYear(month, ref) {
    const r = ref || new Date(); let y = r.getFullYear();
    if (month - (r.getMonth() + 1) > 6) y--; else if ((r.getMonth() + 1) - month > 6) y++;
    return y;
  }
  const pad = n => String(n).padStart(2, '0');

  function parse(items, ref) {
    // 1) Cabeçalhos das semanas: datas "02.11", "02/11", "02.11.2026" ou "SEG 02.11", junto do nome do dia da semana
    const DATE_RE = /(?:^|\s)(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\s*$/;
    const WEEKDAY_RE = /(SEGUNDA|TERCA|QUARTA|QUINTA|SEXTA|SABADO|DOMINGO|\bSEG\b|\bTER\b|\bQUA\b|\bQUI\b|\bSEX\b|\bSAB\b)/;
    const weekdayNear = d => WEEKDAY_RE.test(norm(d.str)) || items.some(o => o !== d && Math.abs(o.y - d.y) < 20 && Math.abs((o.x + o.w / 2) - (d.x + d.w / 2)) < 70 && WEEKDAY_RE.test(norm(o.str)));
    const weeks = []; const warnings = [];
    for (const d of items) {
      const m = d.str.match(DATE_RE); if (!m) continue;
      const dd = +m[1], mm = +m[2]; if (dd < 1 || dd > 31 || mm < 1 || mm > 12) continue;
      if (!weekdayNear(d)) continue;
      let w = weeks.find(W => Math.abs(W.y - d.y) < 4);
      if (!w) { w = { y: d.y, cols: [] }; weeks.push(w); }
      let yy = m[3] ? +m[3] : null; if (yy && yy < 100) yy += 2000;
      // posição da data: se o texto tem o dia da semana junto, usa o centro do item inteiro
      w.cols.push({ cx: d.x + d.w / 2, day: dd, month: mm, year: yy });
    }
    weeks.forEach(w => w.cols.sort((a, b) => a.cx - b.cx));
    weeks.sort((a, b) => a.y - b.y);
    const spacings = weeks.filter(w => w.cols.length > 1).map(w => (w.cols[w.cols.length - 1].cx - w.cols[0].cx) / (w.cols.length - 1)).sort((a, b) => a - b);
    const typicalSpacing = spacings.length ? spacings[Math.floor(spacings.length / 2)] : 140;
    const result = {};

    weeks.forEach((w, wi) => {
      const top = w.y + 2, bottom = wi + 1 < weeks.length ? weeks[wi + 1].y - 14 : Infinity;
      const spacing = w.cols.length > 1 ? (w.cols[w.cols.length - 1].cx - w.cols[0].cx) / (w.cols.length - 1) : typicalSpacing;
      const labelEdge = w.cols[0].cx - spacing / 2;
      const block = items.filter(i => i.y > top && i.y < bottom);

      const anchors = { almoco: null, janta: null };
      const labels = []; const cols = w.cols.map(() => []);
      for (const it of block) {
        const n = norm(it.str); const cx = it.x + it.w / 2;
        if (/^ALMOCO\b/.test(n)) { anchors.almoco = it.y; continue; }
        if (/^JANTAR\b/.test(n)) { anchors.janta = it.y; continue; }
        if (cx < labelEdge) { labels.push(it); continue; }
        let ci = -1, best = Infinity;
        w.cols.forEach((c, k) => { const dd = Math.abs(c.cx - cx); if (dd < best) { best = dd; ci = k; } });
        if (best > spacing * 0.6) continue;
        cols[ci].push(it);
      }
      // Rótulos (coluna da esquerda)
      const labelLines = mergeLines(labels).map(l => ({ y: l.y, n: norm(l.text) }))
        .map(l => ({ ...l, def: LABELS.find(L => L.re.test(l.n)) })).filter(l => l.def);

      // Linhas por coluna, feriado e inícios de célula
      const colLines = cols.map(c => mergeLines(c));
      const holiday = colLines.map(ls => {
        const letters = ls.filter(l => /^[A-ZÀ-Ú]$/.test(l.text)).map(l => l.text).join('');
        return /FERIADO/.test(norm(letters));
      });
      const starts = [];
      colLines.forEach((ls, k) => {
        const clean = ls.filter(l => !/^[A-ZÀ-Ú]$/.test(l.text));
        colLines[k] = clean.filter(l => !(l.text.length > 3 && l.text === l.text.toUpperCase() && /[A-Z]/.test(l.text) && !/\d/.test(l.text)));
        let prev = null;
        for (const l of colLines[k]) {
          const lh = 11;
          if (prev === null || l.y - prev > lh * 1.5 || (anchors.almoco && prev < anchors.almoco && l.y > anchors.almoco) || (anchors.janta && prev < anchors.janta && l.y > anchors.janta)) starts.push(l.y);
          prev = l.y;
        }
      });
      starts.sort((a, b) => a - b);

      // Linha de cada rótulo começa no maior início de célula <= rótulo
      const rows = []; let last = -Infinity; let lastLanche = null;
      for (const L of labelLines) {
        const cand = starts.filter(s => s <= L.y + 3 && s > last && !(anchors.almoco && L.y > anchors.almoco && s < anchors.almoco) && !(anchors.janta && L.y > anchors.janta && s < anchors.janta));
        const s = cand.length ? cand[cand.length - 1] : L.y - 2;
        let key = L.def.key;
        if (key === 'lm' || key === 'lt') lastLanche = key;
        if (key === 'ber') key = (lastLanche || 'lm') + '_ber';
        rows.push({ key, start: s }); last = s;
      }
      if (anchors.almoco) rows.push({ key: '_almoco', start: anchors.almoco - 1 });
      if (anchors.janta) rows.push({ key: 'janta', start: anchors.janta + 1 });
      rows.sort((a, b) => a.start - b.start);

      const have = new Set(rows.map(r => r.key));
      const wlabel = `${pad(w.cols[0].day)}/${pad(w.cols[0].month)}`;
      if (!have.has('lm') && !have.has('lt') && !have.has('principal')) warnings.push(`Semana de ${wlabel}: não reconheci as linhas da tabela.`);
      w.cols.forEach((c, k) => {
        const date = `${c.year || inferYear(c.month, ref)}-${pad(c.month)}-${pad(c.day)}`;
        const dl = `${pad(c.day)}/${pad(c.month)}`;
        if (holiday[k]) { result[date] = { holiday: true }; return; }
        const cells = {}; let lastJ = null, jDone = false;
        for (const l of colLines[k]) {
          let row = null; for (const r of rows) if (r.start <= l.y + 0.5) row = r;
          if (!row || row.key === '_almoco') continue;
          if (row.key === 'janta') { // só a primeira célula após "JANTAR" (evita rodapés e observações)
            if (jDone || (lastJ !== null && l.y - lastJ > 16.5)) { jDone = true; continue; }
            lastJ = l.y;
          }
          (cells[row.key] = cells[row.key] || []).push(l.text);
        }
        const d = (k2) => cells[k2] ? toDishes(cells[k2]) : [];
        const entry = {
          lanche_manha: { regular: d('lm'), bercario: d('lm_ber') },
          almoco: { base: d('base').join(', '), principal: d('principal').join(', '), guarnicao: d('guarnicao').join(', '), salada: d('salada').join(', '), sobremesa: d('sobremesa').join(', ') },
          lanche_tarde: { regular: d('lt'), bercario: d('lt_ber') },
          janta: cells.janta ? [toDishes(cells.janta).join(' ')] : []
        };
        if (!entry.lanche_manha.bercario.length) entry.lanche_manha.bercario = entry.lanche_manha.regular;
        if (!entry.lanche_tarde.bercario.length) entry.lanche_tarde.bercario = entry.lanche_tarde.regular;
        const any = entry.lanche_manha.regular.length || entry.almoco.principal || entry.lanche_tarde.regular.length || entry.janta.length;
        if (any) {
          result[date] = entry;
          if (have.has('principal') && !entry.almoco.principal) warnings.push(`${dl}: não encontrei o prato principal do almoço.`);
        } else warnings.push(`${dl}: nenhum item encontrado (dia ignorado).`);
      });
    });
    // mês principal do cardápio (para não sobrescrever dias de um cardápio mais novo)
    const count = {}; Object.keys(result).forEach(d => { const m = d.slice(0, 7); count[m] = (count[m] || 0) + 1; });
    const src = Object.keys(count).sort((a, b) => count[b] - count[a])[0] || '';
    return { days: result, warnings, src };
  }

  async function parsePDF(arrayBuffer, ref) {
    const items = await extractItems(new Uint8Array(arrayBuffer));
    return parse(items, ref);
  }

  window.SchoolPDF = { parsePDF, parse, toDishes };
})();

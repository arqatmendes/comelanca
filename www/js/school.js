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
    // 1) Cabeçalhos das semanas: datas "02.11"
    const dateItems = items.filter(i => /^\s*\d{1,2}[./]\d{1,2}\s*$/.test(i.str));
    const weeks = [];
    for (const d of dateItems) {
      let w = weeks.find(W => Math.abs(W.y - d.y) < 4);
      if (!w) { w = { y: d.y, cols: [] }; weeks.push(w); }
      const [dd, mm] = d.str.trim().split(/[./]/).map(Number);
      w.cols.push({ cx: d.x + d.w / 2, day: dd, month: mm });
    }
    weeks.forEach(w => w.cols.sort((a, b) => a.cx - b.cx));
    weeks.sort((a, b) => a.y - b.y);
    const result = {};

    weeks.forEach((w, wi) => {
      if (w.cols.length < 2) return;
      const top = w.y + 2, bottom = wi + 1 < weeks.length ? weeks[wi + 1].y - 14 : Infinity;
      const spacing = (w.cols[w.cols.length - 1].cx - w.cols[0].cx) / (w.cols.length - 1);
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

      w.cols.forEach((c, k) => {
        const date = `${inferYear(c.month, ref)}-${pad(c.month)}-${pad(c.day)}`;
        if (holiday[k]) { result[date] = { holiday: true }; return; }
        const cells = {};
        for (const l of colLines[k]) {
          let row = null; for (const r of rows) if (r.start <= l.y + 0.5) row = r;
          if (!row || row.key === '_almoco') continue;
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
        if (any) result[date] = entry;
      });
    });
    return result;
  }

  async function parsePDF(arrayBuffer, ref) {
    const items = await extractItems(new Uint8Array(arrayBuffer));
    return parse(items, ref);
  }

  window.SchoolPDF = { parsePDF, parse, toDishes };
})();

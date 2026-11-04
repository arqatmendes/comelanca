/* Alergias: reconhece derivados (ex.: alergia a "leite" também pega queijo, iogurte, requeijão) */
(function () {
  'use strict';
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  // família → termos que indicam a presença do alergênico
  const FAMILIES = {
    leite: ['leite', 'queijo', 'iogurte', 'requeijao', 'manteiga', 'creme de leite', 'leite condensado', 'nata', 'ricota', 'mussarela', 'mucarela', 'parmesao', 'coalhada', 'whey', 'cream cheese', 'chantilly', 'catupiry', 'pao de queijo', 'chipa', 'brigadeiro', 'pudim', 'gratinado', 'gratinada', 'strogonoff', 'estrogonofe', 'mousse', 'x-burguer', 'pizza'],
    ovo: ['ovo', 'omelete', 'maionese', 'merengue', 'suspiro', 'gema', 'clara de ovo', 'quiche', 'crepioca', 'fritada', 'sufle', 'panqueca', 'waffle', 'pudim'],
    gluten: ['trigo', 'farinha de trigo', 'pao', 'macarrao', 'massa', 'bolo', 'biscoito', 'bolacha', 'torrada', 'torradinha', 'pizza', 'esfiha', 'cookie', 'wrap', 'brioche', 'bisnaguinha', 'bisnaga', 'panqueca', 'waffle', 'cevada', 'centeio', 'aveia', 'lasanha', 'nhoque', 'empanado', 'farinha de rosca', 'cuscuz marroquino', 'crepe', 'cereal', 'pastel', 'x-burguer', 'cuca', 'muffin'],
    amendoim: ['amendoim', 'pacoca', 'pe de moleque'],
    soja: ['soja', 'shoyu', 'shoyo', 'tofu', 'edamame', 'missô', 'misso'],
    peixe: ['peixe', 'atum', 'sardinha', 'salmao', 'tilapia', 'bacalhau', 'merluza', 'pescada', 'file de peixe'],
    'frutos do mar': ['frutos do mar', 'camarao', 'lula', 'polvo', 'siri', 'caranguejo', 'lagosta', 'marisco', 'mexilhao', 'ostra'],
    castanhas: ['castanha', 'nozes', 'noz', 'amendoa', 'avela', 'pistache', 'macadamia'],
    gergelim: ['gergelim', 'tahine', 'tahini']
  };
  const ALIASES = {
    lactose: 'leite', aplv: 'leite', 'proteina do leite': 'leite', 'leite de vaca': 'leite', laticinios: 'leite', laticinio: 'leite',
    ovos: 'ovo', 'clara': 'ovo',
    trigo: 'gluten', 'doenca celiaca': 'gluten', celiaco: 'gluten', celiaca: 'gluten',
    crustaceos: 'frutos do mar', crustaceo: 'frutos do mar', camarao: 'frutos do mar', mariscos: 'frutos do mar',
    oleaginosas: 'castanhas', castanha: 'castanhas', nozes: 'castanhas', 'castanha de caju': 'castanhas', 'castanha do para': 'castanhas',
    peixes: 'peixe', amendoins: 'amendoim'
  };
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const has = (text, term) => new RegExp('(^|[^a-z])' + reEsc(term) + '(s|es)?(?=[^a-z]|$)').test(text);

  function termsFor(allergy) {
    const a = norm(allergy); if (!a) return [];
    const fam = FAMILIES[a] ? a : ALIASES[a];
    return fam ? Array.from(new Set([a].concat(FAMILIES[fam]))) : [a];
  }
  // Retorna o termo encontrado no texto (ou null)
  function match(text, allergy) {
    const t = norm(text);
    for (const term of termsFor(allergy)) if (has(t, norm(term))) return term;
    return null;
  }
  window.Allergy = { match, termsFor, norm };
})();

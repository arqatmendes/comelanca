/* Dados iniciais — pratos importados da tabela preenchida pela família */
window.SEED = {
  version: 1,
  // As crianças são cadastradas na aba "Filhos" (ou importadas de outro aparelho) — nenhum dado pessoal fica no código.
  children: [],
  dishes: [
    { id: 'd1', name: 'Panqueca de banana', ingredients: ['banana', 'ovo', 'aveia'], slots: ['cafe', 'lanche_manha', 'lanche_tarde'], likedBy: [], notes: '', variations: {} },
    { id: 'd2', name: 'Arroz, feijão e carne desfiada', ingredients: ['arroz', 'feijão', 'carne bovina'], slots: ['almoco', 'janta'], likedBy: [], notes: 'Feijão deve ser batido e coado para servir apenas o caldo', variations: {} },
    { id: 'd3', name: 'Banana picada', ingredients: ['banana'], slots: ['cafe', 'lanche_manha', 'lanche_tarde'], likedBy: [], notes: 'Uma das crianças prefere com canela', variations: {} },
    { id: 'd4', name: 'Iogurte natural', ingredients: ['iogurte', 'mel'], slots: ['cafe', 'lanche_tarde'], likedBy: [], notes: '', variations: {} },
    { id: 'd5', name: 'Vitamina do Gildo', ingredients: ['iogurte', 'morango', 'açúcar'], slots: ['lanche_manha', 'lanche_tarde'], likedBy: [], notes: '', variations: {} },
    { id: 'd6', name: 'Macarrão cozido', ingredients: ['macarrão', 'queijo'], slots: ['almoco', 'janta'], likedBy: [], notes: '', variations: {} },
    { id: 'd7', name: 'Omelete', ingredients: ['ovo'], slots: ['cafe', 'janta'], likedBy: [], notes: '', variations: {} },
    { id: 'd8', name: 'Arroz, feijão e linguiça', ingredients: ['arroz', 'feijão', 'linguiça suína'], slots: ['almoco', 'janta'], likedBy: [], notes: 'Feijão deve ser batido e coado para servir apenas o caldo', variations: {} }
  ].map(d => Object.assign({ status: 'aprovado', lastServed: null, source: 'tabela' }, d)),
  plan: {},
  school: {}
};

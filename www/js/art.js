/* Ilustrações em traço "desenhado à mão" com preenchimento pastel deslocado */
(function () {
  const INK = '#3d3d3d';
  const S = `stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
  const face = (x, y, s = 1) => `
    <g transform="translate(${x} ${y}) scale(${s})" fill="none" ${S} stroke-width="${2 / s}">
      <path d="M-5 -2 q2 -3 4 0"/><path d="M1 -2 q2 -3 4 0"/>
      <path d="M-3 3 q3 3 6 0"/>
    </g>
    <circle cx="${x - 8 * s}" cy="${y + 2 * s}" r="${2.6 * s}" fill="#f0a49a" opacity=".7"/>
    <circle cx="${x + 8 * s}" cy="${y + 2 * s}" r="${2.6 * s}" fill="#f0a49a" opacity=".7"/>`;

  const art = {};

  // Café da manhã: tigela de mingau + maçã
  art.cafe = `
  <svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 42 h66 q-2 30 -33 32 q-31 -2 -33 -32z" fill="#a9d3e6" transform="translate(3 2)"/>
    <ellipse cx="47" cy="42" rx="33" ry="7" fill="#f3e6c4"/>
    <g fill="#d9a066"><circle cx="36" cy="41" r="2.2"/><circle cx="50" cy="39" r="2"/><circle cx="58" cy="43" r="2.2"/><circle cx="43" cy="44" r="1.8"/></g>
    <path d="M14 42 h66 q-2 30 -33 32 q-31 -2 -33 -32z" fill="none" ${S}/>
    <ellipse cx="47" cy="42" rx="33" ry="7" fill="none" ${S}/>
    <path d="M62 40 L80 12" fill="none" ${S} stroke-width="3"/>
    <ellipse cx="81.5" cy="10" rx="4" ry="6" transform="rotate(30 81.5 10)" fill="#fff" ${S}/>
    <path d="M88 52 q-8 -10 2 -12 q5 0 7 3 q2 -3 7 -3 q10 2 2 26 q-4 8 -9 5 q-5 3 -9 -5 q-3 -6 0 -14z" fill="#ee6b62" transform="translate(2 2)"/>
    <path d="M88 52 q-8 -10 2 -12 q5 0 7 3 q2 -3 7 -3 q10 2 2 26 q-4 8 -9 5 q-5 3 -9 -5 q-3 -6 0 -14z" fill="none" ${S}/>
    <path d="M97 43 q0 -6 3 -9" fill="none" ${S}/>
    <path d="M100 36 q7 -6 11 -1 q-6 5 -11 1z" fill="#9cc58f" ${S}/>
  </svg>`;

  // Lanche da manhã: copo de suco + fatias de laranja + biscoito
  art.lanche_manha = `
  <svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M22 22 h30 l-4 54 h-22z" fill="#f8c27a" transform="translate(3 2)"/>
    <path d="M22 22 h30 l-4 54 h-22z" fill="none" ${S}/>
    <path d="M24 34 h26" fill="none" ${S} stroke-width="1.6"/>
    <path d="M44 22 L52 6 h8" fill="none" ${S}/>
    <g transform="translate(80 58)">
      <circle r="18" fill="#f6a04d" transform="translate(2 2)"/>
      <circle r="18" fill="none" ${S}/>
      <circle r="13" fill="#fde2b0" stroke="${INK}" stroke-width="1.4"/>
      <g stroke="${INK}" stroke-width="1.3" stroke-linecap="round">
        <path d="M0 -13 V13"/><path d="M-13 0 H13"/><path d="M-9 -9 L9 9"/><path d="M9 -9 L-9 9"/>
      </g>
    </g>
    <g transform="translate(86 22)">
      <circle r="12" fill="#e2b77b" transform="translate(2 2)"/>
      <circle r="12" fill="none" ${S}/>
      <g fill="${INK}"><circle cx="-4" cy="-3" r="1.4"/><circle cx="4" cy="-4" r="1.4"/><circle cx="0" cy="4" r="1.4"/><circle cx="5" cy="4" r="1.2"/></g>
    </g>
  </svg>`;

  // Almoço: prato com arroz, coxinha de frango e brócolis
  art.almoco = `
  <svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <circle cx="58" cy="46" r="38" fill="#fdfbf7" ${S}/>
    <circle cx="58" cy="46" r="30" fill="none" stroke="${INK}" stroke-width="1.4"/>
    <path d="M44 34 q2 -12 14 -12 q14 0 15 12 q-14 6 -29 0z" fill="#fff" transform="translate(1 1)"/>
    <path d="M44 34 q2 -12 14 -12 q14 0 15 12 q-14 6 -29 0z" fill="none" ${S} stroke-width="2"/>
    <g fill="none" stroke="${INK}" stroke-width="1.2"><path d="M52 28 l2 1"/><path d="M60 26 l2 1"/><path d="M57 31 l2 1"/><path d="M65 30 l2 1"/></g>
    <path d="M34 50 q4 -12 16 -8 q10 5 4 16 q-5 8 -14 5z" fill="#e8a46c" transform="translate(2 2)"/>
    <path d="M34 50 q4 -12 16 -8 q10 5 4 16 q-5 8 -14 5z" fill="none" ${S}/>
    <path d="M38 63 l-8 7 m0 0 q-4 -1 -3 3 m3 -3 q1 4 -3 3" fill="none" ${S}/>
    <g transform="translate(73 54)">
      <path d="M-3 4 v10 h6 v-10" fill="#9cc58f" ${S}/>
      <g fill="#8dbb7d" transform="translate(1.5 1.5)"><circle cx="-7" cy="0" r="6"/><circle cx="0" cy="-5" r="7"/><circle cx="7" cy="0" r="6"/><circle cx="0" cy="3" r="5"/></g>
      <g fill="none" ${S} stroke-width="2"><path d="M-6 6 a6 6 0 0 1 -5 -9 a6 6 0 0 1 6 -4 a7 7 0 0 1 12 0 a6 6 0 0 1 6 4 a6 6 0 0 1 -5 9z"/></g>
    </g>
  </svg>`;

  // Lanche da tarde: bananas + copinho de iogurte
  art.lanche_tarde = `
  <svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 46 q8 26 44 24 q8 -1 6 -6 q-34 4 -44 -22z" fill="#f7d54e" transform="translate(2 2)"/>
    <path d="M12 46 q8 26 44 24 q8 -1 6 -6 q-34 4 -44 -22z" fill="none" ${S}/>
    <path d="M14 40 q12 22 46 16 q6 -2 3 -6 q-32 8 -44 -14z" fill="#fbe27a" transform="translate(2 2)"/>
    <path d="M14 40 q12 22 46 16 q6 -2 3 -6 q-32 8 -44 -14z" fill="none" ${S}/>
    <path d="M12 46 l3 -10 l5 3" fill="none" ${S}/>
    <path d="M60 52 l6 3 l-2 6" fill="none" ${S}/>
    <path d="M72 34 h34 l-4 40 h-26z" fill="#f2b8c6" transform="translate(2 2)"/>
    <path d="M72 34 h34 l-4 40 h-26z" fill="none" ${S}/>
    <path d="M70 34 h38" fill="none" ${S}/>
    <path d="M74 46 h30" fill="none" stroke="${INK}" stroke-width="1.3"/>
    <path d="M92 34 L98 10" fill="none" ${S} stroke-width="3"/>
    <ellipse cx="99" cy="8" rx="3.5" ry="5.5" transform="rotate(15 99 8)" fill="#fff" ${S}/>
  </svg>`;

  // Janta: tigela de sopa fumegante + peixinho
  art.janta = `
  <svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" ${S} stroke-width="2"><path d="M34 22 q-4 -5 0 -10 q4 -5 0 -10"/><path d="M46 22 q-4 -5 0 -10 q4 -5 0 -10"/><path d="M58 22 q-4 -5 0 -10 q4 -5 0 -10"/></g>
    <path d="M10 40 h74 q-3 32 -37 34 q-34 -2 -37 -34z" fill="#bfe0d6" transform="translate(3 2)"/>
    <ellipse cx="47" cy="40" rx="37" ry="8" fill="#f7c66b"/>
    <path d="M42 38 q5 -6 10 0 q-5 4 -10 0z" fill="#8dbb7d" stroke="${INK}" stroke-width="1.3"/>
    <path d="M10 40 h74 q-3 32 -37 34 q-34 -2 -37 -34z" fill="none" ${S}/>
    <ellipse cx="47" cy="40" rx="37" ry="8" fill="none" ${S}/>
    <g transform="translate(92 66) rotate(-14)">
      <path d="M-18 0 q12 -14 28 0 q-16 14 -28 0z" fill="#f0a07a" transform="translate(2 2)"/>
      <path d="M-18 0 q12 -14 28 0 q-16 14 -28 0z" fill="none" ${S}/>
      <path d="M10 0 l10 -8 v16z" fill="#f0a07a" ${S}/>
      <circle cx="-11" cy="-2" r="1.6" fill="${INK}"/>
      <path d="M-4 -5 q3 5 0 10" fill="none" stroke="${INK}" stroke-width="1.4"/>
    </g>
  </svg>`;

  // Ícone (rostinho + brócolis e banana)
  art.icon = `
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="92" height="92" rx="24" fill="#a9c4a4"/>
    <g transform="translate(37 30) scale(.62)">
      <path d="M-3 4 v12 h6 v-12" fill="#b9d7a6" ${S}/>
      <g fill="#a8cf96" transform="translate(1.5 1.5)"><circle cx="-8" cy="0" r="7"/><circle cx="0" cy="-6" r="8"/><circle cx="8" cy="0" r="7"/><circle cx="0" cy="3" r="6"/></g>
      <path d="M-7 7 a7 7 0 0 1 -6 -10 a7 7 0 0 1 7 -5 a8 8 0 0 1 14 0 a7 7 0 0 1 7 5 a7 7 0 0 1 -6 10z" fill="none" ${S}/>
    </g>
    <g transform="translate(60 29) scale(.55)">
      <path d="M-14 -4 q2 24 28 20 q4 -2 2 -6 q-20 4 -24 -18z" fill="#f7d54e" transform="translate(2 2)"/>
      <path d="M-14 -4 q2 24 28 20 q4 -2 2 -6 q-20 4 -24 -18z" fill="none" ${S}/>
      <path d="M-14 -4 l1 -8 l5 2" fill="none" ${S}/>
    </g>
    <g fill="none" stroke="#2b2b2b" stroke-width="2.6" stroke-linecap="round">
      <path d="M28 56 q5 -6 10 0"/><path d="M62 56 q5 -6 10 0"/>
      <path d="M28 66 q22 22 44 0"/>
    </g>
    <circle cx="50" cy="58" r="3.4" fill="#e58a7a"/>
    <circle cx="26" cy="66" r="6" fill="#f2a89a" opacity=".8"/>
    <circle cx="74" cy="66" r="6" fill="#f2a89a" opacity=".8"/>
  </svg>`;

  // Logo para a tela de inicialização
  art.logo = `
  <svg viewBox="10 18 320 108" xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(40 78)">
      <path d="M-14 0 q-6 -16 8 -16 q4 0 6 2 q2 -2 6 -2 q14 0 8 16 q-4 14 -14 12 q-10 2 -14 -12z" fill="#ee6b62" transform="translate(2 2)"/>
      <path d="M-14 0 q-6 -16 8 -16 q4 0 6 2 q2 -2 6 -2 q14 0 8 16 q-4 14 -14 12 q-10 2 -14 -12z" fill="none" ${S}/>
      <path d="M0 -14 q0 -5 3 -8" fill="none" ${S}/><path d="M3 -20 q6 -5 9 0 q-5 4 -9 0z" fill="#9cc58f" ${S} stroke-width="1.6"/>
    </g>
    <g transform="translate(92 66)">
      <path d="M-5 10 l-3 26 h16 l-3 -26" fill="#c3dcae" ${S}/>
      <g fill="#a8cf96" transform="translate(2 2)"><circle cx="-14" cy="0" r="12"/><circle cx="0" cy="-10" r="14"/><circle cx="14" cy="0" r="12"/><circle cx="0" cy="4" r="10"/></g>
      <path d="M-11 12 a12 12 0 0 1 -12 -18 a12 12 0 0 1 12 -6 a14 14 0 0 1 22 0 a12 12 0 0 1 12 6 a12 12 0 0 1 -12 18z" fill="none" ${S}/>
      ${face(0, -2, 0.8)}
    </g>
    <g transform="translate(150 70)">
      <path d="M-13 -24 q13 -4 26 0 q-3 40 -13 52 q-10 -12 -13 -52z" fill="#f5a35e" transform="translate(2 2)"/>
      <path d="M-13 -24 q13 -4 26 0 q-3 40 -13 52 q-10 -12 -13 -52z" fill="none" ${S}/>
      <g fill="none" ${S} stroke-width="2"><path d="M0 -26 q-8 -14 -4 -24"/><path d="M0 -26 q0 -16 6 -26"/><path d="M0 -26 q8 -12 14 -18"/></g>
      <g stroke="${INK}" stroke-width="1.4" stroke-linecap="round"><path d="M-9 8 h4"/><path d="M5 16 h3"/></g>
      ${face(0, -6, 0.8)}
    </g>
    <g transform="translate(210 72) rotate(28)">
      <path d="M-16 -20 q16 -14 30 0 q8 30 -14 44 q-24 -12 -16 -44z" fill="#b5654f" transform="translate(2 2)"/>
      <path d="M-16 -20 q16 -14 30 0 q8 30 -14 44 q-24 -12 -16 -44z" fill="none" ${S}/>
      <path d="M-8 -26 q8 -6 18 0 q-8 6 -18 0z" fill="#9cc58f" ${S} stroke-width="1.8"/>
      <path d="M2 -28 v-8" fill="none" ${S}/>
      ${face(-1, 2, 0.8)}
    </g>
    <g transform="translate(276 84) rotate(-18)">
      <path d="M-36 -10 q8 34 56 22 q10 -4 6 -10 q-42 10 -56 -16z" fill="#f7d54e" transform="translate(2 2)"/>
      <path d="M-36 -10 q8 34 56 22 q10 -4 6 -10 q-42 10 -56 -16z" fill="none" ${S}/>
      <path d="M-36 -10 l2 -10 l6 4" fill="none" ${S}/>
      <path d="M26 2 q6 -12 14 -14 q-2 10 -12 16" fill="#9cc58f" ${S} stroke-width="1.8"/>
      ${face(-6, 8, 0.75)}
    </g>
  </svg>`;

  art.wordmark = `<div class="wordmark"><span>C</span><span class="wm-o"><svg viewBox="-20 -20 40 40"><circle r="15" fill="#f6cdb6"/><circle r="15" fill="none" stroke="currentColor" stroke-width="5.5"/><g fill="none" stroke="#3d3d3d" stroke-width="2" stroke-linecap="round"><path d="M-8 -3 q3 -4 6 0"/><path d="M2 -3 q3 -4 6 0"/><path d="M-7 4 q7 7 14 0"/></g></svg></span><span>MELANÇA</span></div>`;
  window.ART = art;
})();

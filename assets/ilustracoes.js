/* Ilustrações autorais do litoral alagoano, em SVG.
   Usadas enquanto não houver fotografia real de um lugar.
   arte(tipo, {momento}) -> string SVG (viewBox 400x300, preenche o espaço).
   v6: capa animada (capa(momento)), tons diurnos por cena (TOM_CENA).
   v5: sempre a paleta diurna suave, qualquer que seja a hora (a noturna deixava tudo azul-marinho e igual).
   As outras paletas ficam disponíveis só quando pedidas explicitamente em {momento}. */
(function () {
  'use strict';

  const PALETAS = {
    madrugada: { ceu: '#E9D9C6', ceu2: '#F2E6D6', astro: '#E6A57E', horiz: '#B9D9D3', mar1: '#3A8792', mar2: '#22607A', areia: '#EADCC4', verde: '#24473A', verde2: '#3D6450', brilho: '#F7E5D3' },
    dia:       { ceu: '#ECE3D3', ceu2: '#F6F0E6', astro: '#E2A877', horiz: '#BCDAD3', mar1: '#4B8D95', mar2: '#2F6E80', areia: '#E8DCC6', verde: '#2C4A3B', verde2: '#4B6A56', brilho: '#FFF7EC' },
    tarde:     { ceu: '#EFCDAF', ceu2: '#F5DFC8', astro: '#D7774A', horiz: '#E2B79A', mar1: '#2F6F7E', mar2: '#1E4E66', areia: '#E2C9A6', verde: '#1D3A2D', verde2: '#38563F', brilho: '#FAD9BC' },
    // v6: tons diurnos por categoria, todos suaves (mesma família da paleta "dia").
    agua:      { ceu: '#DCEBE5', ceu2: '#EEF5F1', astro: '#E8B183', horiz: '#B3DAD2', mar1: '#5FA7A6', mar2: '#2F7C84', areia: '#EFE3CC', verde: '#24473A', verde2: '#4E7A63', brilho: '#FFFBF3' },
    mangue:    { ceu: '#E3E8D8', ceu2: '#F1F1E6', astro: '#DDA06C', horiz: '#BFD6C4', mar1: '#55897F', mar2: '#2E5E58', areia: '#E6DABF', verde: '#22432F', verde2: '#4F7255', brilho: '#FBF6E8' },
    terra:     { ceu: '#F1DFCB', ceu2: '#F8EEE1', astro: '#D98A5A', horiz: '#D8D3C0', mar1: '#5E9496', mar2: '#356C77', areia: '#ECD8BA', verde: '#2F4A39', verde2: '#6B7F5E', brilho: '#FFF6EA' },
    noite:     { ceu: '#22364A', ceu2: '#2C4459', astro: '#ECE4D2', horiz: '#3B6670', mar1: '#1F5464', mar2: '#153B4C', areia: '#7E7461', verde: '#11261C', verde2: '#20392B', brilho: '#ECE4D2' }
  };

  function momentoAtual() {
    let h = new Date().getHours();
    try { h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Maceio' }).format(new Date())); } catch (e) {}
    if (h >= 5 && h < 8) return 'madrugada';
    if (h >= 8 && h < 16) return 'dia';
    if (h >= 16 && h < 18) return 'tarde';
    return 'noite';
  }

  const ondas = (y, amp, larg, cor, cls) =>
    `<g class="${cls || ''}"><path d="M-60 ${y} ${Array.from({ length: 12 }, (_, i) => `q ${larg / 2} ${i % 2 ? amp : -amp} ${larg} 0`).join(' ')} V 900 H -60 Z" fill="${cor}"/></g>`;

  function coqueiro(x, y, esc, cor, cor2, inclina) {
    const s = esc || 1, k = inclina || 0;
    const topoX = x + 40 * s + k, topoY = y - 190 * s;
    const folha = (a, c, q) => `<path transform="rotate(${a} ${topoX} ${topoY})" d="M${topoX} ${topoY} C ${topoX + c * .35} ${topoY - 24 * s} ${topoX + c * .8} ${topoY - 10 * s + q * .4} ${topoX + c} ${topoY + q} C ${topoX + c * .7} ${topoY + q * .35} ${topoX + c * .35} ${topoY - 6 * s} ${topoX} ${topoY + 4 * s} Z"/>`;
    const fs = [[-8, 96, 38], [20, 84, 48], [-36, 80, 26], [160, -96, -38], [196, -88, -48], [210, -72, -24], [-96, 54, 16]]
      .map(([a, c, q]) => folha(a, c * s, q * s)).join('');
    return `<g class="coqueiro">
      <path d="M${x} ${y} C ${x + 8 * s} ${y - 70 * s} ${x + 22 * s + k / 2} ${y - 140 * s} ${topoX} ${topoY}" fill="none" stroke="${cor}" stroke-width="${8 * s}" stroke-linecap="round"/>
      <g class="folhas" style="transform-origin:${topoX}px ${topoY}px" fill="${cor}">${fs}
        <circle cx="${topoX - 4 * s}" cy="${topoY + 6 * s}" r="${5 * s}" fill="${cor2}"/><circle cx="${topoX + 5 * s}" cy="${topoY + 8 * s}" r="${4.5 * s}" fill="${cor2}"/>
      </g></g>`;
  }

  function base(P, conteudo, rotulo, vb) {
    return `<svg class="arte" viewBox="${vb || '0 0 400 300'}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${rotulo}" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="ceu-${P.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.ceu}"/><stop offset="1" stop-color="${P.ceu2}"/></linearGradient></defs>
      <rect x="-400" y="-600" width="1200" height="1600" fill="url(#ceu-${P.id})"/>${conteudo}</svg>`;
  }

  let seq = 0;
  const CENAS = {
    praia(P) {
      return `<g class="sol"><circle cx="300" cy="92" r="58" fill="${P.astro}" opacity=".16"/><circle cx="300" cy="92" r="36" fill="${P.astro}"/></g>
        <rect x="-400" y="150" width="1200" height="20" fill="${P.horiz}"/>
        ${ondas(166, 4, 44, P.mar1, 'onda-a')}
        <g fill="${P.brilho}" opacity=".55"><rect x="276" y="178" width="48" height="2.5" rx="1"/><rect x="286" y="188" width="28" height="2.5" rx="1"/></g>
        ${ondas(198, 5, 52, P.mar2, 'onda-b')}
        <path d="M-200 236c80-22 170-24 260-8 90 16 170 20 260 4s110 14 280 6V900H-200z" fill="${P.areia}"/>
        ${P.heroi ? coqueiro(70, 312, .78, P.verde, P.verde2, 4) + coqueiro(372, 300, .5, P.verde2, P.verde, -6) : coqueiro(64, 300, .95, P.verde, P.verde2, 6)}`;
    },
    piscina(P) {
      return `<rect width="400" height="300" fill="${P.mar1}"/>
        <path d="M0 0h400v90c-60 14-120-10-200 6S40 110 0 96z" fill="${P.horiz}" opacity=".55"/>
        <g fill="${P.mar2}" opacity=".9"><path d="M40 150c30-24 90-28 120-6s10 62-40 66-100-34-80-60z"/><path d="M240 190c34-30 120-30 140 0s-20 70-70 70-90-42-70-70z"/></g>
        <g fill="${P.areia}" opacity=".85"><path d="M70 160c16-12 52-12 66 2s0 36-28 38-54-26-38-40z"/><path d="M270 200c18-14 70-12 80 6s-12 38-44 38-50-28-36-44z"/></g>
        <g fill="${P.verde2}" opacity=".5"><circle cx="96" cy="176" r="6"/><circle cx="114" cy="170" r="4"/><circle cx="300" cy="216" r="7"/><circle cx="322" cy="210" r="4"/></g>
        <g class="peixes" fill="${P.brilho}"><path d="M190 120q10-6 20 0-10 6-20 0zm-6 0 6-5v10z"/><path d="M226 140q8-5 16 0-8 5-16 0zm-5 0 5-4v8z"/><path d="M204 156q8-5 16 0-8 5-16 0zm-5 0 5-4v8z"/></g>
        <g stroke="${P.brilho}" stroke-width="2" fill="none" opacity=".4" stroke-linecap="round"><path d="M20 40q20-8 40 0"/><path d="M300 60q20-8 40 0"/><path d="M180 250q20-8 40 0"/></g>`;
    },
    jangada(P) {
      return `<g class="sol"><circle cx="90" cy="86" r="30" fill="${P.astro}"/></g>
        <rect y="150" width="400" height="18" fill="${P.horiz}"/>
        ${ondas(164, 4, 44, P.mar1, 'onda-a')}
        <g class="barco"><path d="M206 52 L206 196" stroke="${P.verde}" stroke-width="3"/>
          <path d="M210 58 Q 290 110 262 190 L 210 190 Z" fill="${P.brilho}"/><path d="M210 58 Q 250 120 236 190" fill="none" stroke="${P.ceu}" stroke-width="1.5" opacity=".8"/>
          <path d="M160 196 H 290 L 276 208 H 172 Z" fill="${P.verde}"/></g>
        ${ondas(204, 5, 52, P.mar2, 'onda-b')}`;
    },
    peixeboi(P) {
      return `<rect width="400" height="300" fill="${P.mar2}"/>
        <path d="M0 0h400v70c-80 18-160-14-240 2S40 80 0 70z" fill="${P.verde2}" opacity=".5"/>
        <g fill="${P.verde}" opacity=".9"><circle cx="20" cy="20" r="60"/><circle cx="90" cy="0" r="50"/><circle cx="60" cy="70" r="34"/><circle cx="390" cy="10" r="64"/><circle cx="320" cy="-10" r="48"/><circle cx="350" cy="64" r="30"/></g>
        <g stroke="${P.verde}" stroke-width="3" fill="none" opacity=".7"><path d="M40 90c4 20 0 40-8 56M60 96c0 18 6 34 14 46M350 86c-2 20 2 38 10 52M330 80c-4 18-10 32-18 42"/></g>
        <g class="peixeboi"><path d="M110 176c20-34 110-40 170-20 30 10 46 24 52 36-8 6-22 6-34 2-30 26-120 34-170 10-14 8-34 6-40-2 6-10 14-18 22-26z" fill="${P.areia}" opacity=".9"/>
          <path d="M318 188c18-6 34 4 40 16-16 4-32 0-40-16z" fill="${P.areia}" opacity=".9"/>
          <circle cx="134" cy="178" r="2.5" fill="${P.verde}"/><path d="M200 206c-6 14-16 22-26 24" stroke="${P.verde}" stroke-width="2" fill="none" opacity=".4"/></g>
        <g fill="${P.brilho}" opacity=".35"><circle cx="90" cy="150" r="3"/><circle cx="84" cy="136" r="2"/><circle cx="92" cy="124" r="1.5"/></g>
        <path d="M0 270c60-10 120 6 200-4s140 8 200 0v34H0z" fill="${P.verde}" opacity=".6"/>`;
    },
    capela(P) {
      return `<g class="sol"><circle cx="320" cy="80" r="30" fill="${P.astro}"/></g>
        <rect y="168" width="400" height="16" fill="${P.horiz}"/>${ondas(180, 3, 44, P.mar1, 'onda-a')}
        <path d="M0 214c90-16 200-18 290-6s90 10 110 6v86H0z" fill="${P.areia}"/>
        <g><rect x="150" y="120" width="84" height="94" fill="${P.brilho}"/><path d="M142 124 L192 84 L242 124 Z" fill="${P.verde}"/>
          <rect x="184" y="52" width="16" height="40" fill="${P.brilho}"/><path d="M180 56 L192 40 L204 56 Z" fill="${P.verde}"/>
          <rect x="190" y="30" width="4" height="12" fill="${P.verde}"/><rect x="186" y="34" width="12" height="3" fill="${P.verde}"/>
          <path d="M180 214v-34a12 12 0 0 1 24 0v34z" fill="${P.mar2}"/><circle cx="192" cy="140" r="7" fill="${P.mar1}"/></g>
        ${coqueiro(330, 300, .7, P.verde, P.verde2, -8)}`;
    },
    farol(P) {
      return `<g class="sol"><circle cx="90" cy="110" r="34" fill="${P.astro}" opacity=".9"/></g>
        <path d="M0 196h400v104H0z" fill="${P.mar2}"/>${ondas(200, 4, 48, P.mar1, 'onda-a')}
        <path d="M150 300c10-80 60-110 120-120s110 30 130 40v80z" fill="${P.verde}"/>
        <g><path d="M262 194 L270 92 H 292 L 300 194 Z" fill="${P.brilho}"/><rect x="266" y="120" width="30" height="12" fill="${P.astro}" opacity=".85"/><rect x="264" y="160" width="34" height="12" fill="${P.astro}" opacity=".85"/>
          <rect x="268" y="72" width="26" height="20" fill="${P.mar2}"/><path d="M264 72 L281 56 L298 72 Z" fill="${P.verde2}"/>
          <path class="facho" d="M294 82 L400 60 L400 104 Z" fill="${P.brilho}" opacity=".25"/></g>`;
    },
    vila(P) {
      const casa = (x, w, h, c1, c2) => `<rect x="${x}" y="${230 - h}" width="${w}" height="${h}" fill="${c1}"/><path d="M${x - 4} ${234 - h} L${x + w / 2} ${206 - h} L${x + w + 4} ${234 - h} Z" fill="${c2}"/><rect x="${x + w / 2 - 7}" y="${206}" width="14" height="24" fill="${P.verde}" opacity=".7"/>`;
      return `<g class="sol"><circle cx="330" cy="70" r="26" fill="${P.astro}"/></g>
        ${coqueiro(40, 240, .6, P.verde, P.verde2, 4)}
        ${casa(70, 70, 70, '#E8B39A', '#B5643F')}${casa(150, 80, 84, '#F4E2C4', P.mar2)}${casa(240, 66, 64, '#BFDCD5', '#B5643F')}${casa(314, 70, 76, '#F1D6A8', P.verde2)}
        <rect y="230" width="400" height="70" fill="${P.areia}"/><rect y="250" width="400" height="10" fill="${P.brilho}" opacity=".5"/>
        <g fill="${P.mar1}"><circle cx="110" cy="190" r="0"/></g>`;
    },
    comida(P) {
      return `<rect width="400" height="300" fill="${P.ceu2}"/>
        <circle cx="200" cy="160" r="104" fill="${P.brilho}"/><circle cx="200" cy="160" r="104" fill="none" stroke="${P.areia}" stroke-width="10"/>
        <path d="M138 150c20-30 104-34 128-4 8 10 2 26-10 30-36 12-84 12-110 0-12-6-14-16-8-26z" fill="#D9874E"/>
        <path d="M150 152c24-14 70-16 98-2" stroke="#B5643F" stroke-width="3" fill="none" opacity=".6"/>
        <g fill="${P.verde2}"><circle cx="170" cy="196" r="7"/><circle cx="186" cy="204" r="6"/><circle cx="214" cy="204" r="6"/></g>
        <path d="M232 192c10-6 30-4 36 6-10 8-28 8-36-6z" fill="#E7C14B"/>
        <g stroke="${P.verde}" stroke-width="5" stroke-linecap="round"><path d="M64 60v120M50 60v40a14 14 0 0 0 28 0V60"/><path d="M336 60v120M336 60c-14 6-20 24-20 46h20"/></g>`;
    },
    tunel(P) {
      return `<rect width="400" height="300" fill="${P.verde}"/>
        <path d="M0 0h400v300H0z" fill="${P.verde2}" opacity=".4"/>
        <ellipse cx="200" cy="170" rx="70" ry="90" fill="${P.ceu}"/><ellipse cx="200" cy="170" rx="46" ry="64" fill="${P.brilho}" opacity=".7"/>
        <path d="M160 300 L188 196 H 212 L 240 300 Z" fill="${P.areia}"/><path d="M198 300 L199 200 H 201 L 202 300 Z" fill="${P.brilho}" opacity=".7"/>
        <g fill="${P.verde}" opacity=".9"><circle cx="70" cy="70" r="70"/><circle cx="330" cy="70" r="70"/><circle cx="120" cy="20" r="60"/><circle cx="280" cy="20" r="60"/><circle cx="30" cy="190" r="60"/><circle cx="370" cy="190" r="60"/></g>
        <g fill="${P.verde2}" opacity=".8"><circle cx="100" cy="110" r="30"/><circle cx="300" cy="110" r="30"/><circle cx="200" cy="40" r="40"/></g>`;
    },
    barra(P) {
      return `<g class="sol"><circle cx="200" cy="110" r="58" fill="${P.astro}" opacity=".18"/><circle cx="200" cy="110" r="34" fill="${P.astro}"/></g>
        <rect y="150" width="400" height="18" fill="${P.horiz}"/>${ondas(164, 3, 44, P.mar1, 'onda-a')}
        <path d="M0 200c60-8 120-6 170 4 30 6 50 20 70 40s60 40 160 46v10H0z" fill="${P.areia}"/>
        <path d="M150 300c20-30 40-56 60-74s40-24 60-24c-10 20-20 44-30 98z" fill="${P.mar2}"/>
        <path d="M400 210c-50 0-90 8-130 20" stroke="${P.brilho}" stroke-width="2" fill="none" opacity=".5"/>
        ${coqueiro(40, 300, .7, P.verde, P.verde2, 4)}${coqueiro(350, 300, .55, P.verde, P.verde2, -4)}`;
    },
    casa(P) {
      return `<g class="sol"><circle cx="320" cy="76" r="30" fill="${P.astro}"/></g>
        <rect y="220" width="400" height="80" fill="${P.areia}"/>
        <g><rect x="110" y="132" width="190" height="90" fill="${P.brilho}"/><path d="M96 138 L205 82 L314 138 Z" fill="${P.verde}"/>
          <rect x="132" y="160" width="40" height="34" fill="${P.mar1}" opacity=".8"/><rect x="238" y="160" width="40" height="34" fill="${P.mar1}" opacity=".8"/>
          <rect x="190" y="164" width="30" height="58" fill="${P.verde2}"/><rect x="100" y="218" width="210" height="6" fill="${P.verde}" opacity=".3"/></g>
        ${coqueiro(40, 260, .75, P.verde, P.verde2, 6)}`;
    }
  };
  const ALIAS = { praia: 'praia', natureza: 'tunel', passeio: 'jangada', cultura: 'capela', compras: 'vila', restaurante: 'comida', cafe: 'comida', mercado: 'vila', delivery: 'comida', farmacia: 'casa', saude: 'casa', servico: 'casa' };
  const NOMES = { praia: 'praia com coqueiro e mar em camadas', piscina: 'piscinas naturais entre recifes vistas do alto', jangada: 'jangada a vela no mar calmo', peixeboi: 'peixe-boi nadando no rio entre o mangue', capela: 'capelinha branca na areia', farol: 'farol no alto do morro sobre o mar', vila: 'casinhas coloridas da vila', comida: 'prato de peixe com acompanhamentos', tunel: 'estrada sob um túnel de árvores', barra: 'encontro do rio com o mar ao entardecer', casa: 'casa de praia entre coqueiros' };

  // Tom padrão de cada cena (v6): a mesma paleta diurna, com um acento por tema, para os cartões não ficarem iguais.
  const TOM_CENA = { piscina: 'agua', peixeboi: 'mangue', tunel: 'mangue', capela: 'terra', vila: 'terra', comida: 'terra', barra: 'tarde', jangada: 'agua', farol: 'dia', praia: 'dia', casa: 'dia' };
  function arte(tipo, opt) {
    opt = opt || {};
    const t = CENAS[tipo] ? tipo : (ALIAS[tipo] || 'praia');
    const P = Object.assign({ id: 'a' + (++seq), heroi: !!opt.heroi }, PALETAS[opt.momento || opt.tom || TOM_CENA[t] || 'dia'] || PALETAS.dia);
    let extra = '';
    if (opt.momento === 'noite' && ['praia', 'jangada', 'capela', 'farol', 'barra', 'casa', 'vila'].includes(t))
      // No hero, o lado esquerdo fica livre de estrelas para não competir com o letreiro.
      extra = `<g fill="${P.brilho}" opacity=".7">${opt.heroi ? '' : '<circle cx="40" cy="30" r="1.2"/><circle cx="120" cy="50" r="1"/><circle cx="210" cy="24" r="1.3"/>'}<circle cx="360" cy="40" r="1"/><circle cx="${opt.heroi ? 390 : 250}" cy="70" r="1"/></g>`;
    return base(P, extra + CENAS[t](P), 'Ilustração: ' + (NOMES[t] || 'paisagem do litoral'), opt.vb);
  }

  /* ---------- Capa (v6) ----------
     Retrato 4:5 (viewBox 400 x 500), recortado com "slice": no celular vira faixa larga e mostra o miolo (sol + horizonte).
     O sol nasce pela metade sobre o horizonte, com os raios finos do símbolo da marca. Ondas em 3 camadas
     (classes h-onda1..3) deslizam em laço lento pelo CSS; o reflexo cintila. A paleta muda com sutileza ao longo do dia;
     à noite o sol vira lua e aparecem poucas estrelas, sem escurecer a cena. */
  const CAPA = {
    manha: { ceu: '#F2DCCB', ceu2: '#F7EEE4', astro: '#E39A6C', halo: '#F0C6A5', horiz: '#C9DED7', mar1: '#79AAA8', mar2: '#4A8489', mar3: '#2E6470', areia: '#EBDDC6', areia2: '#DFCBAA', verde: '#24473A', verde2: '#4B6A56', brilho: '#FFF5E9' },
    dia:   { ceu: '#E2EAE3', ceu2: '#F6F0E6', astro: '#E2A271', halo: '#F1D2B3', horiz: '#C2DCD5', mar1: '#68A3A4', mar2: '#3A7B84', mar3: '#265D69', areia: '#ECDFC8', areia2: '#E0CDAD', verde: '#25473A', verde2: '#4B6A56', brilho: '#FFF8EE' },
    tarde: { ceu: '#EFCBAE', ceu2: '#F7E3CF', astro: '#D7764A', halo: '#ECB591', horiz: '#E1C0A6', mar1: '#5A8E95', mar2: '#336A77', mar3: '#214F5E', areia: '#E6CFAE', areia2: '#D8BC95', verde: '#1F3D30', verde2: '#3E5B45', brilho: '#FCE0C6' },
    noite: { ceu: '#C6CFCF', ceu2: '#E6E2D9', astro: '#FBF7EF', halo: '#E4E3DB', horiz: '#A7C1C0', mar1: '#517F86', mar2: '#355F6A', mar3: '#23434F', areia: '#DCD0BC', areia2: '#CDBEA5', verde: '#1E3B30', verde2: '#3A5646', brilho: '#FFFFFF' }
  };
  const faixaOnda = (y, amp, L, cor, cls) => {
    let d = `M-${2 * L} ${y}`; for (let i = 0; i < Math.ceil((400 + 6 * L) / L); i++) d += ` q ${L / 2} ${i % 2 ? amp : -amp} ${L} 0`;
    return `<path class="${cls}" d="${d} V 520 H -${2 * L} Z" fill="${cor}"/>`;
  };
  function capa(momento) {
    const m = CAPA[momento] ? momento : 'dia', P = CAPA[m], id = 'c' + (++seq), noite = m === 'noite';
    const cx = 200, cy = 300, r = 56;
    const raios = [-162, -138, -114, -90, -66, -42, -18].map((a, i) => { const k = a * Math.PI / 180, r1 = r + 16, r2 = r + (i % 2 ? 36 : 50);
      return `M${(cx + r1 * Math.cos(k)).toFixed(1)} ${(cy + r1 * Math.sin(k)).toFixed(1)}L${(cx + r2 * Math.cos(k)).toFixed(1)} ${(cy + r2 * Math.sin(k)).toFixed(1)}`; }).join('');
    const estrelas = noite ? `<g class="h-estrelas" fill="#FFFFFF">${[[64, 70, 1.4], [120, 128, 1], [300, 60, 1.2], [344, 150, 1], [250, 104, .9], [86, 196, .9], [356, 222, 1.1]].map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}"/>`).join('')}</g>` : '';
    return `<svg class="arte arte-capa" data-momento="${m}" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${noite ? 'Lua nascendo sobre o mar' : 'Sol nascendo sobre o mar'}, ondas e coqueiro na praia" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="ceu-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.ceu}"/><stop offset=".62" stop-color="${P.ceu2}"/></linearGradient>
        <radialGradient id="halo-${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${P.halo}" stop-opacity=".9"/><stop offset="1" stop-color="${P.halo}" stop-opacity="0"/></radialGradient></defs>
      <rect x="-200" y="-200" width="800" height="900" fill="url(#ceu-${id})"/>${estrelas}
      <g class="h-nuvem" fill="${P.brilho}" opacity="${noite ? .35 : .7}"><path d="M60 150c8-14 30-16 40-4 10-8 28-4 30 8 12 0 18 8 16 14H46c-4-10 4-18 14-18z"/><path d="M262 92c6-10 22-12 30-3 8-6 21-3 23 6 9 0 13 6 12 10h-73c-3-7 2-13 8-13z" opacity=".8"/></g>
      ${noite ? '' : `<g class="h-aves" fill="none" stroke="${P.mar3}" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M118 214q6-6 12 0q6-6 12 0"/><path d="M146 196q4-4 8 0q4-4 8 0"/><path d="M286 186q5-5 10 0q5-5 10 0"/></g>`}
      <g class="h-astro"><circle class="h-halo" cx="${cx}" cy="${cy}" r="150" fill="url(#halo-${id})"/>
        <path class="h-raios" d="${raios}" stroke="${P.astro}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="${noite ? .45 : .8}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="${P.astro}"/></g>
      <g class="h-jangada" fill="${P.mar3}"><path d="M84 299 L84 268 Q 100 282 96 299 Z" opacity=".85"/><path d="M74 299 H 102 L 98 303 H 78 Z"/></g>
      <rect x="-200" y="${cy}" width="800" height="240" fill="${P.horiz}"/>
      <path d="M-200 ${cy + .5}H600" stroke="${P.mar3}" stroke-width="1" opacity=".35"/>
      ${faixaOnda(312, 3, 40, P.mar1, 'h-onda1')}
      <g class="h-reflexo" fill="${P.brilho}"><rect x="160" y="322" width="80" height="2.4" rx="1.2" opacity=".8"/><rect x="174" y="334" width="52" height="2.2" rx="1.1" opacity=".65"/><rect x="186" y="346" width="28" height="2" rx="1" opacity=".5"/></g>
      ${faixaOnda(358, 4.5, 56, P.mar2, 'h-onda2')}
      ${faixaOnda(404, 5.5, 72, P.mar3, 'h-onda3')}
      <path class="h-espuma" d="M-40 444c60-14 120-10 170 0s110 14 170 4 80-10 140-6" stroke="${P.brilho}" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>
      <path d="M-40 452c70-16 150-18 220-6s130 16 180 6 50-6 80-4V560H-40z" fill="${P.areia}"/>
      <path d="M-40 482c90-10 170-8 250 2s120 8 230-2V560H-40z" fill="${P.areia2}" opacity=".7"/>
      <g class="h-coqueiro">${coqueiro(372, 520, .92, P.verde, P.verde2, -64)}</g>
    </svg>`;
  }

  /* Escolhe a cena mais adequada para um lugar do guia. */
  function cenaDoLugar(l) {
    const id = (l.id || '') + ' ' + (l.nome || '').toLowerCase();
    if (/peixe-?boi/.test(id)) return 'peixeboi';
    if (/piscina/.test(id)) return 'piscina';
    if (/jangada/.test(id)) return 'jangada';
    if (/capela|igreja/.test(id)) return 'capela';
    if (/farol/.test(id)) return 'farol';
    if (/t[uú]nel/.test(id)) return 'tunel';
    if (/barra/.test(id)) return 'barra';
    if (/vila|centro/.test(id)) return 'vila';
    return ALIAS[l.categoria] || 'praia';
  }

  window.Ilustra = { arte, capa, cenaDoLugar, momentoAtual, PALETAS, TOM_CENA };
})();

/* Marca Casa 18 · Anahi
   Símbolo: sol nascendo (meio círculo + raios finos) sobre duas ondas, em traço contínuo.
   Grade do símbolo: 64 x 64, centro óptico em (32, 32).

   Contrato (carregado no site e no admin antes dos outros scripts):
     Marca.simbolo({ tema, titulo, compacto, cor })   -> <svg> só do símbolo, viewBox quadrado
     Marca.horizontal({ tema, titulo, cor })          -> <svg> símbolo à esquerda + CASA 18 / ANAHI
     Marca.vertical({ tema, titulo, cor })            -> <svg> símbolo em cima + CASA 18 / ANAHI
   tema: 'claro' = para fundo claro (tinta verde) · 'escuro' = para fundo escuro (tinta areia).
   compacto: true = versão para 16–32 px (traço mais grosso, menos raios). Por padrão, só o favicon usa.
   cor: uma cor só (carimbo, gravação, bordado). titulo: '' = decorativo (aria-hidden).
   Letreiro com textLength: a largura não depende da fonte instalada (Inter 300 no site, servida em assets/fontes; Manrope ou sistema no painel). */
(function () {
  'use strict';
  const TEMAS = {
    claro:  { sol: '#B8693A', mar: '#1F3D2F', texto: '#1F3D2F', sub: '#4F5E54' },
    escuro: { sol: '#F0C394', mar: '#FFFDF9', texto: '#FFFDF9', sub: '#E9E1D2' }
  };
  const FONTE = "Inter, Manrope, 'Avenir Next', 'Helvetica Neue', Arial, sans-serif";
  const n = (v) => +v.toFixed(2);
  const escAttr = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function cores(o) {
    const t = Object.assign({}, TEMAS[o && o.tema === 'escuro' ? 'escuro' : 'claro']);
    if (o && o.cor) { t.sol = t.mar = t.texto = t.sub = o.cor; }
    return t;
  }
  // Onda senoidal feita de meias-voltas iguais (curvas cúbicas suaves).
  function onda(x0, y, meio, n_, amp) {
    let d = `M${x0} ${y} c${n(meio / 3)} ${-amp} ${n(meio * 2 / 3)} ${-amp} ${meio} 0`;
    for (let i = 1; i < n_; i++) d += ` s${n(meio * 2 / 3)} ${i % 2 ? amp : -amp} ${meio} 0`;
    return d;
  }
  // Desenho do símbolo na grade 64 x 64. Devolve só os traços (<g>).
  function tracos(t, compacto) {
    const cx = 32, cy = compacto ? 31 : 35, r = compacto ? 10.5 : 10;
    const sw = compacto ? 4.2 : 1.8;
    const angs = compacto ? [-162, -126, -90, -54, -18] : [-162, -138, -114, -90, -66, -42, -18];
    const raios = angs.map((a, i) => {
      const rad = a * Math.PI / 180, r1 = r + (compacto ? 5 : 4), r2 = r + (compacto ? 10.5 : (i % 2 ? 8.5 : 11));
      return `M${n(cx + r1 * Math.cos(rad))} ${n(cy + r1 * Math.sin(rad))}L${n(cx + r2 * Math.cos(rad))} ${n(cy + r2 * Math.sin(rad))}`;
    }).join('');
    const sol = `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}`;
    const ondas = compacto
      ? onda(5, 42, 18, 3, 5.6) + onda(14, 52, 18, 2, 5.6)
      : onda(8, 40, 12, 4, 3.4) + onda(14, 47.5, 12, 3, 3.4);
    return `<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="${sw}">` +
      `<path stroke="${t.sol}" d="${sol}${raios}"/>` +
      `<path stroke="${t.mar}" d="${ondas}"/></g>`;
  }
  function abre(vb, o, extra) {
    const titulo = o && o.titulo === '' ? '' : ((o && o.titulo) || 'Casa 18 Anahi');
    const a11y = titulo ? `role="img" aria-label="${escAttr(titulo)}"` : 'aria-hidden="true" focusable="false"';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${a11y}${extra || ''}>`;
  }
  function letreiro(t, cx, y1, tam1, larg1, y2, tam2, larg2) {
    return `<g font-family="${FONTE}" text-anchor="middle">` +
      `<text x="${cx}" y="${y1}" font-size="${tam1}" font-weight="300" fill="${t.texto}" textLength="${larg1}" lengthAdjust="spacing">CASA 18</text>` +
      `<text x="${cx}" y="${y2}" font-size="${tam2}" font-weight="500" fill="${t.sub}" textLength="${larg2}" lengthAdjust="spacing">ANAHI</text></g>`;
  }

  function simbolo(o) {
    o = o || {};
    const t = cores(o);
    // viewBox quadrado justo ao desenho (respiro mínimo), para render bem de 16 px em diante.
    return abre(o.compacto ? '2 2 60 60' : '4 5 56 56', o) + tracos(t, !!o.compacto) + '</svg>';
  }
  function horizontal(o) {
    o = o || {};
    const t = cores(o);
    // Símbolo x 7–57; letreiro centrado em x = 160 (largura 164: 78–242), alinhado ao centro óptico do símbolo.
    return abre('6 9 240 46', o) + tracos(t, false) + letreiro(t, 160, 35, 30, 164, 51, 11, 76) + '</svg>';
  }
  function vertical(o) {
    o = o || {};
    const t = cores(o);
    // Símbolo ampliado 1,5x e centrado; letreiro abaixo, com a mesma largura de ondas e letras.
    return abre('0 12 200 140', o) + `<g transform="translate(52 0) scale(1.5)">${tracos(t, false)}</g>` +
      letreiro(t, 100, 119, 38, 184, 144, 13, 84) + '</svg>';
  }
  // Compatibilidade com a API antiga: Marca.logo({ variante, tom, titulo }). tom 'claro' = tinta clara (fundo escuro).
  function logo(o) {
    o = o || {};
    const p = { titulo: o.titulo, cor: o.cor, tema: o.tema || (o.tom === 'claro' ? 'escuro' : 'claro') };
    return o.variante === 'simbolo' ? simbolo(p) : o.variante === 'vertical' ? vertical(p) : horizontal(p);
  }
  window.Marca = { simbolo, horizontal, vertical, logo, TEMAS };
})();

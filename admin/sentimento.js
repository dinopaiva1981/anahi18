/* Análise de sentimento e de necessidades em português, feita no próprio navegador.
   Nada é enviado a serviços externos. Abordagem: léxico + negação + intensificadores
   + contraste ("mas", "porém"), combinada com a nota dada pelo hóspede. */
(function () {
  'use strict';
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // Expressões compostas, avaliadas antes das palavras soltas. Valor: polaridade.
  const FRASES = [
    ['nao funciona', -2], ['nao funcionava', -2], ['parou de funcionar', -2], ['deixou a desejar', -2], ['deixa a desejar', -2],
    ['cheiro ruim', -2], ['mal cheiro', -2], ['sem resposta', -1.5], ['nao respondeu', -1.5], ['demorou a responder', -1.5],
    ['nota 10', 2], ['nota dez', 2], ['vale a pena', 1.5], ['valeu a pena', 1.5], ['voltaremos', 2], ['voltaremos com certeza', 2.5], ['quero voltar', 2],
    ['custo beneficio', 0.5], ['bem localizada', 1.5], ['bem localizado', 1.5], ['bem equipada', 1.5], ['bem equipado', 1.5], ['bem limpa', 1.5], ['bem limpo', 1.5],
    ['agua fria', -1], ['chuveiro frio', -1.5], ['muito quente', -1], ['muito calor', -1.5], ['wifi fraco', -1.5], ['internet fraca', -1.5], ['sinal fraco', -1.5],
    ['sem problemas', 1], ['sem nenhum problema', 1.5], ['tudo certo', 1], ['tudo perfeito', 2], ['de primeira', 1], ['super recomendo', 2.5]
  ];
  const POS = ['otim', 'excelent', 'maravilh', 'perfeit', 'incrive', 'lind', 'limp', 'confortave', 'aconcheg', 'atencios', 'prestativ', 'recomend', 'amei', 'amamos', 'adorei', 'adoramos', 'gostei', 'gostamos', 'bom', 'boa', 'bons', 'boas', 'tranquil', 'silencios', 'impecave', 'organizad', 'cheiros', 'agradave', 'show', 'top', 'espacos', 'bonit', 'educad', 'facil', 'charm', 'encant', 'acolhed', 'gentil', 'simpatic', 'rapid', 'feliz', 'satisfeit', 'paraiso', 'sonho', 'caprich', 'equipad', 'completa', 'completo', 'aconchegante', 'nota', 'obrigad', 'sensacional', 'espetacular', 'fantastic', 'delicia', 'deliciosa', 'pratic', 'seguro', 'segura'];
  const NEG = ['suj', 'ruim', 'pessim', 'horrive', 'terrive', 'barulh', 'quebrad', 'defeit', 'problem', 'mofo', 'fedor', 'fedi', 'mosquit', 'pernilong', 'muricoca', 'formiga', 'barata', 'calor', 'abafad', 'fraco', 'fraca', 'lent', 'demor', 'falt', 'desconfort', 'apertad', 'caro', 'cara ', 'decepcion', 'insuficient', 'vazament', 'goteira', 'entupid', 'escur', 'insegur', 'perigos', 'dificil', 'complicad', 'atrasad', 'reclam', 'infeliz', 'pior', 'velh', 'gast', 'manchad', 'rasgad', 'frio', 'fria', 'pouca', 'pouco', 'nunca', 'chato', 'chata', 'estress', 'confus', 'desorganiz', 'precari', 'riscad', 'enferruj', 'umid', 'estragad', 'oxidad', 'falha', 'falhou', 'cancel'];
  const NEGADORES = new Set(['nao', 'nunca', 'nem', 'sem', 'jamais', 'nenhum', 'nenhuma']);
  const INTENS = { muito: 1.5, muita: 1.5, super: 1.6, bem: 1.3, extremamente: 1.8, bastante: 1.4, demais: 1.5, totalmente: 1.4, tao: 1.3, mega: 1.6 };
  const CONTRASTE = new Set(['mas', 'porem', 'contudo', 'entretanto', 'todavia', 'apesar']);
  const IGNORAR = new Set(['nota']); // "nota" só pontua na frase "nota 10"

  // Temas da hospedagem: radicais que indicam cada um.
  const TEMAS = {
    'Limpeza': ['limp', 'suj', 'poeira', 'mofo', 'cheiro', 'fedor', 'higien', 'faxina', 'cabelo', 'mancha'],
    'Cama e conforto': ['cama', 'colch', 'travesseir', 'lencol', 'lencois', 'toalha', 'dormi', 'sono', 'sofa', 'confort', 'roupa de cama'],
    'Climatização': ['ar condicionado', 'ar-condicionado', 'ventilador', 'calor', 'quente', 'abafad', 'climatiz'],
    'Internet': ['wifi', 'wi-fi', 'wi fi', 'internet', 'conexao', 'sinal'],
    'Cozinha': ['cozinha', 'panela', 'utensil', 'fogao', 'geladeira', 'louca', 'cafeteira', 'talher', 'micro-ondas', 'microondas', 'prato', 'copo', 'liquidificador'],
    'Banheiro e água': ['chuveiro', 'banheiro', 'agua quente', 'descarga', 'vazament', 'entup', 'pressao', 'pia', 'vaso'],
    'Barulho': ['barulh', 'ruido', 'som alto', 'silenc', 'vizinh'],
    'Chegada e acesso': ['check-in', 'checkin', 'check in', 'chave', 'portaria', 'acesso', 'chegada', 'entrada', 'check-out', 'checkout', 'saida', 'estacionament', 'garagem', 'portao'],
    'Comunicação': ['anfitri', 'respond', 'resposta', 'comunica', 'mensag', 'whatsapp', 'atendiment', 'atencios', 'prestativ', 'suporte', 'contato'],
    'Localização e praia': ['praia', 'localiza', 'mar ', 'perto', 'distante', 'longe', 'vista', 'areia', 'piscinas naturais', 'mare'],
    'Dicas e passeios': ['passeio', 'roteiro', 'dica', 'guia', 'restaurante', 'jangada', 'peixe-boi', 'peixe boi', 'indicac', 'patacho', 'milagres'],
    'Insetos': ['mosquit', 'pernilong', 'muricoca', 'formiga', 'barata', 'inseto', 'aranha', 'lagartixa'],
    'Segurança': ['segur', 'perigo', 'tranca', 'fechadura', 'cadeado', 'assalt'],
    'Espaço e decoração': ['espaco', 'espacos', 'decora', 'charme', 'varanda', 'ambiente', 'jardim', 'area externa', 'rede'],
    'Custo-benefício': ['preco', 'caro', 'barato', 'valor', 'custo', 'cobran', 'taxa']
  };
  const TEMA_FORM = { 'Limpeza': 'Limpeza', 'Conforto': 'Cama e conforto', 'Cozinha': 'Cozinha', 'Internet': 'Internet', 'Comunicação': 'Comunicação', 'Localização': 'Localização e praia', 'Passeios': 'Dicas e passeios' };
  const PEDIDO = /\b(faltou|faltava|falta|faltam|poderia|poderiam|podia|seria bom|seria otimo|seria legal|sugiro|sugestao|precisa(?:ria)?|gostaria que|deveria|deveriam|ideal seria|senti falta|sentimos falta|recomendo (?:colocar|ter|trocar)|melhorar|trocar)\b/;

  function tokens(t) { return t.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean); }

  function pontuarTrecho(trecho) {
    let t = ' ' + norm(trecho) + ' ', soma = 0, hits = [];
    FRASES.forEach(([f, v]) => { const re = new RegExp('\\b' + f.replace(/ /g, '\\s+') + '\\b', 'g'); const m = t.match(re); if (m) { soma += v * m.length; hits.push(f); t = t.replace(re, ' '); } });
    const tk = tokens(t); let ultimo = -1;
    for (let i = 0; i < tk.length; i++) {
      const w = tk[i]; if (IGNORAR.has(w)) continue;
      let v = 0;
      if (POS.some(p => w.startsWith(p.trim()))) v = 1; else if (NEG.some(p => w.startsWith(p.trim()))) v = -1;
      if (!v) continue;
      if (w === 'nunca') { v = -0.3; }
      let mult = 1;
      for (let k = Math.max(0, i - 3, ultimo + 1); k < i; k++) { if (NEGADORES.has(tk[k])) mult *= -1; if (INTENS[tk[k]]) mult *= INTENS[tk[k]]; }
      soma += v * mult; hits.push(w); ultimo = i;
    }
    return { soma, hits, n: tk.length };
  }

  function frases(texto) { return String(texto || '').split(/(?<=[.!?;\n])\s+|\s+(?=(?:mas|porém|porem|contudo|entretanto)\s)/i).map(s => s.trim()).filter(s => s.length > 2); }

  // Só notas inteiras de 1 a 5 contam ("5 estrelas", "abc", 0 ou 4,5 não entram na média).
  const notaOk = (n) => n !== null && n !== '' && n !== undefined && Number.isInteger(+n) && +n >= 1 && +n <= 5 && String(n).trim() === String(+n);
  function analisar(texto, nota, temasForm) {
    const fs = frases(texto);
    let total = 0, peso = 0; const porFrase = [];
    fs.forEach((f, i) => {
      const r = pontuarTrecho(f);
      const contr = CONTRASTE.has(norm(f).split(/\s+/)[0]);
      const w = contr ? 1.5 : (fs.slice(i + 1).some(g => CONTRASTE.has(norm(g).split(/\s+/)[0])) ? 0.7 : 1);
      const s = r.soma / Math.sqrt(Math.max(r.n, 1));
      porFrase.push({ frase: f, s, hits: r.hits });
      total += s * w; peso += w;
    });
    const sTexto = peso ? Math.max(-1, Math.min(1, total / peso)) : 0;
    const temNota = notaOk(nota);
    const sNota = temNota ? (+nota - 3) / 2 : null;
    const score = temNota ? (fs.length ? 0.55 * sNota + 0.45 * sTexto : sNota) : sTexto;
    const sentimento = score > 0.15 ? 'positivo' : score < -0.15 ? 'negativo' : 'neutro';

    // temas com polaridade por frase
    const temas = {};
    porFrase.forEach(({ frase, s }) => {
      const nf = ' ' + norm(frase) + ' ';
      Object.entries(TEMAS).forEach(([tema, raizes]) => {
        if (raizes.some(r => nf.includes(r))) {
          const o = temas[tema] || (temas[tema] = { tema, pos: 0, neg: 0, neu: 0, trechos: [] });
          const pol = PEDIDO.test(norm(frase)) ? (s < -0.12 ? 'neg' : 'neu') : s > 0.12 ? 'pos' : s < -0.12 ? 'neg' : 'neu'; o[pol]++; o.trechos.push(frase);
        }
      });
    });
    (temasForm || []).forEach(tf => { const t = TEMA_FORM[tf]; if (t && !temas[t]) temas[t] = { tema: t, pos: sentimento === 'positivo' ? 1 : 0, neg: sentimento === 'negativo' ? 1 : 0, neu: sentimento === 'neutro' ? 1 : 0, trechos: [] }; });

    const pedidos = porFrase.filter(p => PEDIDO.test(norm(p.frase))).map(p => p.frase);
    const palavras = [...new Set(porFrase.flatMap(p => p.hits))];
    return { sentimento, score: Math.round(score * 100) / 100, sTexto: Math.round(sTexto * 100) / 100, temas: Object.values(temas), pedidos, palavras };
  }

  /* Consolida uma lista de feedbacks já analisados. */
  function consolidar(itens) {
    const n = itens.length; const notas = itens.filter(i => notaOk(i.nota));
    const cont = { positivo: 0, neutro: 0, negativo: 0 }; itens.forEach(i => cont[i.a.sentimento]++);
    const temas = {};
    itens.forEach(i => i.a.temas.forEach(t => { const o = temas[t.tema] || (temas[t.tema] = { tema: t.tema, pos: 0, neg: 0, neu: 0, mencoes: 0, exemplos: [] }); o.pos += t.pos; o.neg += t.neg; o.neu += t.neu; o.mencoes++; if (t.neg && o.exemplos.length < 3) o.exemplos.push(t.trechos[0] || i.mensagem); }));
    const lista = Object.values(temas).map(t => Object.assign(t, { indiceNeg: t.mencoes ? t.neg / (t.pos + t.neg + t.neu || 1) : 0 }))
      .sort((a, b) => (b.neg - a.neg) || (b.mencoes - a.mencoes));
    const pedidos = itens.flatMap(i => i.a.pedidos.map(p => ({ texto: p, data: i.data, nota: i.nota })));
    return { n, media: notas.length ? notas.reduce((s, i) => s + +i.nota, 0) / notas.length : null, cont, temas: lista, pedidos };
  }

  window.Sentimento = { analisar, consolidar, norm, notaOk, TEMAS: Object.keys(TEMAS) };
})();

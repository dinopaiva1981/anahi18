/* Guia do hóspede · contrato dos dados (dados/conteudo.json).
   Usado pelo site (assets/site.js) e pelo painel (admin/admin.js): os dois aplicam a MESMA normalização.
   - normalizar(bruto, avisos?) devolve um objeto novo, sempre no esquema atual:
     campo ausente ou de tipo errado → valor padrão; listas com itens inválidos → itens descartados;
     textos acima de 20 000 caracteres → cortados; campos desconhecidos → preservados (o site os ignora).
   - migrar(): esquemas antigos sobem um degrau por vez (1 → 2 …). Esquema 1 = o antigo conteudo.js.
   - Nunca lança exceção: qualquer entrada vira um guia válido (no pior caso, vazio).
   O esquema está documentado em dados/ESQUEMA.md. Ao criar um campo novo: inclua aqui, no ESQUEMA.md e,
   se mudar o formato de um campo existente, suba ESQUEMA e escreva o degrau em MIGRACOES. */
(function (raiz) {
'use strict';
const ESQUEMA = 2;
const MAX_TEXTO = 20000;
const PROIBIDAS = /^(__proto__|constructor|prototype)$/;
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

/* ---------- tipos ---------- */
const txt = (d) => ({ t: 'txt', d: d === undefined ? '' : d });
const num = () => ({ t: 'num' });                 // número finito ou null
const bool = (d) => ({ t: 'bool', d: !!d });
const data = () => ({ t: 'data' });               // 'AAAA-MM-DD' ou null
const lista = (item) => ({ t: 'lista', item });
const obj = (campos, nulo, exige) => ({ t: 'obj', campos, nulo: !!nulo, exige: exige || [] });
const foto = () => obj({ src: txt(), alt: txt() }, true, ['src']);
const ponto = () => obj({ lat: num(), lng: num() }, true, ['lat', 'lng']);

const S = obj({
  esquema: { t: 'fixo' },
  atualizado_em: txt(),
  casa: obj({
    nome: txt(), subtitulo: txt(), anfitriao: txt(), whatsapp: txt(), checkin: txt(), checkout: txt(),
    area_m2: num(), hospedes: num(), quartos: num(), suites: num(), banheiros: num(),
    camas: lista(txt()), endereco_publico: txt(), link_maps: txt(), coordenadas: ponto(),
    fotos: lista(foto()),
    ambientes: lista(obj({ nome: txt(), descricao: txt(), foto: foto() })),
    comodidades: lista(obj({ icone: txt('outro'), nome: txt(), descricao: txt(), destaque: bool(false) })),
    regras_casa: lista(txt()), regras_condominio: lista(txt()), lixo_limpeza: lista(txt()), seguranca: lista(txt()),
    faq: lista(obj({ pergunta: txt(), resposta: txt() })),
    chegada: obj({
      como_chegar: txt(), entrada: txt(), chaves: txt(), estacionamento: txt(), saida: lista(txt()), imprevistos: txt(),
      trajetos: lista(obj({ icone: txt('pino'), titulo: txt(), texto: txt() }))
    }),
    frase: txt(), sobre: txt(), instagram: txt(), link_reserva: txt(), video_url: txt()
  }),
  config: obj({ feedback_endpoint: txt(), og_imagem: foto(), url_publica: txt(), agenda_visivel: bool(false) }),
  regiao: obj({
    centro: ponto(),
    cidades: lista(obj({ nome: txt(), lat: num(), lng: num() })),
    quando_ir: lista(txt()), mares: lista(txt()), mobilidade: lista(txt()), dias_de_chuva: lista(txt()),
    fontes: lista(obj({ titulo: txt(), url: txt() })), dicas: lista(txt()), o_que_levar: lista(txt())
  }),
  lugares: lista(obj({
    id: txt(), nome: txt(), categoria: txt(), tipo: txt(), area: txt(), tags: lista(txt()),
    resumo: txt(), descricao: txt(), dica: txt(), bom_saber: lista(txt()), depende_mare: bool(false), reserva: bool(false),
    foto: foto(), endereco: txt(), lat: num(), lng: num(), precisao: txt(), distancia: txt(), duracao: txt(), preco: txt(),
    horario: txt(), melhor_periodo: txt(), telefone: txt(), whatsapp: txt(), link: txt(), link_cardapio: txt(),
    parceiro: bool(false), patrocinado: bool(false), status: txt('publicado'), fonte: obj({ titulo: txt(), url: txt() }),
    verificado: data(), nota_interna: txt()
  })),
  destaques: lista(txt()),
  roteiros: lista(obj({
    id: txt(), titulo: txt(), subtitulo: txt(), quando: txt(), ideal: txt(), ilustracao: txt('praia'), status: txt('publicado'),
    paradas: lista(obj({ momento: txt(), titulo: txt(), texto: txt(), lugar: txt() }))
  })),
  provar: lista(obj({ nome: txt(), descricao: txt() })),
  contatos: lista(obj({
    nome: txt(), categoria: txt(), nivel: txt('essencial'), telefone: txt(), whatsapp: txt(), horario: txt(), obs: txt(),
    endereco: txt(), distancia: txt(), verificado: data(), nota_interna: txt()
  })),
  beneficios: lista(obj({
    titulo: txt(), parceiro: txt(), descricao: txt(), condicoes: txt(), validade: data(), restricoes: txt(), codigo: txt(),
    whatsapp: txt(), link: txt(), ativo: bool(true)
  })),
  avaliacoes: lista(obj({ texto: txt(), autor: txt(), periodo: txt(), origem: txt(), nota: num(), autorizada: bool(false) })),
  _confirmar: lista(txt())
});

/* ---------- normalização ---------- */
const ehObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
function texto(v, d, p, av) {
  if (typeof v === 'string') { if (v.length > MAX_TEXTO) { av.push(p + ': texto longo demais, cortado'); return v.slice(0, MAX_TEXTO); } return v; }
  if (typeof v === 'number' && isFinite(v)) return String(v);
  if (typeof v === 'boolean') return String(v);
  if (v != null) av.push(p + ': não era texto');
  return d;
}
function norm(sp, v, p, av) {
  switch (sp.t) {
    case 'txt': return texto(v, sp.d, p, av);
    case 'num': {
      if (typeof v === 'number') return isFinite(v) ? v : null;
      if (typeof v === 'string' && v.trim() !== '') { const n = Number(v.replace(',', '.')); if (isFinite(n)) return n; }
      if (v != null && v !== '') av.push(p + ': não era número');
      return null;
    }
    case 'bool':
      if (typeof v === 'boolean') return v;
      if (v === 'true' || v === 1) return true;
      if (v === 'false' || v === 0) return false;
      if (v != null) av.push(p + ': não era sim/não');
      return sp.d;
    case 'data':
      if (typeof v === 'string' && RE_DATA.test(v) && !isNaN(new Date(v + 'T12:00:00Z'))) return v;
      if (v != null && v !== '') av.push(p + ': data inválida');
      return null;
    case 'lista': {
      if (!Array.isArray(v)) { if (v != null) av.push(p + ': não era uma lista'); return []; }
      const out = [];
      v.forEach((x, i) => {
        const fotoTexto = sp.item.t === 'obj' && sp.item.nulo && 'src' in sp.item.campos && typeof x === 'string';
        if (x == null || (sp.item.t === 'obj' && !ehObj(x) && !fotoTexto) || (sp.item.t === 'txt' && typeof x === 'object')) { av.push(`${p}.${i}: item inválido descartado`); return; }
        const n = norm(sp.item, x, p + '.' + i, av);
        if (n === null && sp.item.t === 'obj') { av.push(`${p}.${i}: item incompleto descartado`); return; }
        out.push(n);
      });
      return out;
    }
    case 'obj': {
      if (sp.nulo && typeof v === 'string' && 'src' in sp.campos) v = v ? { src: v, alt: '' } : null; // foto antiga: só o endereço
      if (!ehObj(v)) { if (v != null) av.push(p + ': não era um objeto'); if (sp.nulo) return null; v = {}; }
      const out = {};
      for (const k of Object.keys(sp.campos)) out[k] = norm(sp.campos[k], v[k], p ? p + '.' + k : k, av);
      for (const k of sp.exige) { const x = out[k]; if (x == null || x === '') { if (sp.nulo) return null; } }
      for (const k of Object.keys(v)) { // desconhecidos: preservados como vieram (o site não os lê)
        if (k in sp.campos) continue;
        if (PROIBIDAS.test(k)) { av.push((p ? p + '.' : '') + k + ': chave proibida removida'); continue; }
        out[k] = v[k];
      }
      return out;
    }
    case 'fixo': return v;
  }
  return v;
}

/* ---------- migrações (um degrau por vez) ---------- */
const MIGRACOES = {
  // 1 → 2: o antigo conteudo.js (window.CONTEUDO). "versao" era um contador manual; vira "esquema".
  // og_imagem em texto vira {src, alt} (a normalização cuida); fotos em texto também.
  1: (o) => { delete o.versao; return o; }
};
function versaoDe(o) { const n = Number(o.esquema); return Number.isInteger(n) && n >= 1 ? n : 1; }
function migrar(o, av) {
  let v = versaoDe(o);
  if (v > ESQUEMA) av.push(`esquema ${v} é mais novo que este código (${ESQUEMA}): campos novos são ignorados`);
  while (v < ESQUEMA) { o = MIGRACOES[v](o) || o; av.push(`formato migrado do esquema ${v} para ${v + 1}`); v++; }
  return o;
}

function normalizar(bruto, avisos) {
  const av = Array.isArray(avisos) ? avisos : [];
  let o;
  try { o = ehObj(bruto) ? JSON.parse(JSON.stringify(bruto)) : {}; } catch (e) { o = {}; av.push('conteúdo ilegível'); }
  if (!ehObj(bruto)) av.push('o conteúdo não era um objeto');
  const versao = versaoDe(o);
  o = migrar(o, av);
  const n = norm(S, o, '', av);
  delete n.esquema;
  // "esquema" sempre em primeiro lugar no arquivo; um esquema mais novo é mantido (não rebaixa dados de um painel mais novo).
  return Object.assign({ esquema: Math.max(ESQUEMA, versao) }, n);
}

/* Lista plana dos campos do contrato (para documentação e testes). */
function campos() {
  const out = [];
  const andar = (sp, p) => {
    if (sp.t === 'obj') { Object.keys(sp.campos).forEach(k => { const c = sp.campos[k]; out.push([p ? p + '.' + k : k, c.t === 'obj' && c.nulo ? 'obj|null' : c.t]); andar(c, p ? p + '.' + k : k); }); }
    else if (sp.t === 'lista') andar(sp.item, p + '[]');
  };
  andar(S, ''); return out;
}

const api = { ESQUEMA, normalizar, migrar: (o) => migrar(o, []), campos };
if (typeof module === 'object' && module.exports) module.exports = api;
else raiz.GuiaDados = Object.freeze(api);
})(typeof window !== 'undefined' ? window : globalThis);

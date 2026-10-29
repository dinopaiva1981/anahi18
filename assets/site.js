/* Guia do hóspede · lógica do site (v5).
   Os dados vêm de dados/conteudo.json (editado pelo painel), lidos com fetch e normalizados por
   assets/dados.js (GuiaDados.normalizar). Código e dados ficam separados.
   Cada página e cada seção é desenhada dentro de uma proteção: um dado ruim omite só aquela parte.
   Regra v5: sem dado, o bloco não aparece. Nada de "em breve", "em preparação" ou "a confirmar" no site público.
   Estrutura: 5 destinos (Hoje, Estadia, Passeios, Comer quando houver 3 ou mais lugares, Ajuda).
   As rotas antigas (#/casa, #/chegada, #/explorar, #/planejar, #/mapa…) redirecionam para as novas. */
(function () {
'use strict';

/* ---------- dados: carregamento, contrato e falhas ---------- */
const URL_DADOS = 'dados/conteudo.json';
const $palco = document.getElementById('conteudo');
const escB = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icB = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const FALHAS = []; // registro das partes omitidas (também no console)
function registrarFalha(onde, e) {
  FALHAS.push({ onde, erro: String(e && e.message || e) });
  try { console.error('[guia] parte omitida por dado inválido: ' + onde, e); } catch (x) {}
}
window.__guiaFalhas = FALHAS;
Object.defineProperty(window, '__guiaOrigem', { get: () => ORIGEM });
function normalizar(bruto) {
  const av = [];
  const n = window.GuiaDados ? GuiaDados.normalizar(bruto, av) : (bruto && typeof bruto === 'object' ? bruto : {});
  if (av.length) try { console.warn('[guia] dados ajustados ao carregar:', av.slice(0, 50)); } catch (x) {}
  return n;
}
/* Pré-visualização: o painel grava o rascunho e abre ?rascunho=1. Lemos uma vez e apagamos do localStorage;
   a cópia fica só no sessionStorage desta aba, para sobreviver a um recarregamento. */
function lerRascunho() {
  if (!/[?&]rascunho\b/.test(location.search)) return null;
  try {
    let r = localStorage.getItem('guia:rascunho');
    if (r) { localStorage.removeItem('guia:rascunho'); try { sessionStorage.setItem('guia:rascunho', r); } catch (e) {} }
    else r = sessionStorage.getItem('guia:rascunho');
    return r ? { dados: JSON.parse(r) } : { faltou: true };
  } catch (e) { return { faltou: true }; }
}
/* Transição: sem dados/conteudo.json (404 ou falha), lê o conteudo.js existente (esquema 1). */
const scriptAntigo = () => new Promise((ok, falha) => {
  if (window.CONTEUDO && typeof window.CONTEUDO === 'object') { ok(window.CONTEUDO); return; }
  const s = document.createElement('script'); s.src = 'conteudo.js';
  s.onload = () => (window.CONTEUDO && typeof window.CONTEUDO === 'object') ? ok(window.CONTEUDO) : falha(new Error('conteudo.js sem dados'));
  s.onerror = () => falha(new Error('conteudo.js indisponível')); document.head.appendChild(s);
});
async function buscarJson() {
  const ab = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ab && setTimeout(() => ab.abort(), 15000);
  try {
    const r = await fetch(URL_DADOS, { cache: 'no-cache', signal: ab ? ab.signal : undefined });
    if (!r.ok) throw new Error(r.status === 404 ? 'dados/conteudo.json não existe' : 'HTTP ' + r.status);
    const j = await r.json();
    if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('dados/conteudo.json em formato inesperado');
    return j;
  } finally { if (t) clearTimeout(t); }
}
let ORIGEM = 'json';
async function buscarDados() {
  try { const j = await buscarJson(); ORIGEM = 'json'; return j; }
  catch (e1) {
    try { const c = await scriptAntigo(); ORIGEM = 'conteudo.js'; try { console.info('[guia] usando conteudo.js (' + e1.message + ')'); } catch (x) {} return c; }
    catch (e2) { throw e1; }
  }
}
function telaCarregando() {
  document.documentElement.setAttribute('data-guia', 'carregando');
  $palco.innerHTML = `<section class="carregando" aria-busy="true"><div role="status"><h1 class="h3">Abrindo o guia…</h1><p class="meta">Um instante: estamos trazendo as dicas da casa e da região.</p></div>
    <span class="skeleton"></span><span class="skeleton"></span></section>`;
}
function telaErro(e) {
  const semRede = typeof navigator !== 'undefined' && navigator.onLine === false;
  const bw = document.querySelector('.btn-wa'); if (bw) bw.remove();
  $palco.innerHTML = `<section class="erro-geral" role="alert">
    <h1 class="h2">Não conseguimos abrir o guia agora</h1>
    <p>${semRede ? 'O aparelho está sem internet. Quando o sinal voltar, toque em “Tentar de novo”.' : 'A conexão está instável ou o guia está sendo atualizado. Tente de novo em alguns segundos.'}</p>
    <div class="acoes"><button type="button" class="btn btn-prim" data-tentar-de-novo>${icB('seta')}Tentar de novo</button></div>
    <p><strong>Emergência:</strong> SAMU <a href="tel:192">192</a> · Bombeiros <a href="tel:193">193</a> · Polícia <a href="tel:190">190</a>. Para falar com o anfitrião, use o mesmo canal em que você fez a reserva.</p>
    <p class="fonte">Detalhe técnico: ${escB(e && e.message || 'erro desconhecido')}</p></section>`;
  document.documentElement.setAttribute('data-guia', 'erro');
  const b = $palco.querySelector('[data-tentar-de-novo]'); if (b) b.addEventListener('click', carregarGuia, { once: true });
}
let iniciado = false;
async function carregarGuia() {
  if (iniciado) return;
  document.documentElement.setAttribute('data-guia', 'carregando');
  const rasc = lerRascunho();
  if (rasc && rasc.dados) { iniciado = true; iniciar(normalizar(rasc.dados), true, false); return; }
  const espera = setTimeout(telaCarregando, 200);
  let bruto;
  try { bruto = await buscarDados(); }
  catch (e) { clearTimeout(espera); registrarFalha('carregamento dos dados', e); telaErro(e); return; }
  clearTimeout(espera);
  iniciado = true;
  iniciar(normalizar(bruto), false, !!(rasc && rasc.faltou));
}

function iniciar(C, RASCUNHO, RASCUNHO_FALTOU) {
/* Proteção por seção: se o desenho de uma parte falhar, ela some e o resto da página fica de pé. */
const S = (onde, fn) => { try { const v = typeof fn === 'function' ? fn() : fn; return v == null ? '' : v; } catch (e) { registrarFalha(onde, e); return ''; } };
const tenta = (onde, fn) => { try { return fn(); } catch (e) { registrarFalha(onde, e); } };
const casa = C.casa || {}; casa.chegada = casa.chegada || {};
const REG = C.regiao || {}; const CFG = C.config || {};
const NOME = (casa.nome || '').trim() || 'Casa 18 Anahi';
const NOME_PARTES = (() => { const m = NOME.match(/^(.*?\d+)\s*[·\-–]?\s+(.+)$/); return m ? [m[1], m[2]] : [NOME, '']; })();
const linkInsta = () => { const u = String(casa.instagram || '').replace(/^@/, '').trim(); return u ? 'https://instagram.com/' + encodeURIComponent(u) : ''; };
const $main = document.getElementById('conteudo');
const TZ = 'America/Maceio';

/* ---------- utilidades ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tem = (v) => Array.isArray(v) ? v.length > 0 : (v !== null && v !== undefined && String(v).trim() !== '');
const ic = (n, cls) => `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const urlSegura = (u) => { if (!tem(u)) return ''; try { const x = new URL(u, location.href); return /^(https?:|tel:|mailto:)$/.test(x.protocol) ? x.href : ''; } catch (e) { return ''; } };
const soNum = (s) => String(s || '').replace(/\D/g, '');
const linkWa = (n, t) => { n = soNum(n); return n.length >= 10 ? 'https://wa.me/' + n + (t ? '?text=' + encodeURIComponent(t) : '') : ''; };
/* Telefones: 10 ou 11 dígitos ganham +55; curtos (190, 192…) ficam como estão; 0800/0300/4003 sem DDI. */
const linkTel = (n) => { const bruto = soNum(n);
  if (/^0(800|300|303|500|900)\d{6,8}$/.test(bruto) || /^400[0-9]\d{4}$/.test(bruto)) return 'tel:' + bruto;
  n = bruto.replace(/^0+(?=\d{10,11}$)/, ''); if (!n) return '';
  if (n.length === 10 || n.length === 11) return 'tel:+55' + n;
  if ((n.length === 12 || n.length === 13) && n.startsWith('55')) return 'tel:+' + n;
  return 'tel:' + n; };
const rotaEndereco = (q) => tem(q) ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(String(q).replace(/\s*·\s*/g, ', ')) : '';
const rotaCasa = () => urlSegura(casa.link_maps) || (casa.coordenadas && casa.coordenadas.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${casa.coordenadas.lat},${casa.coordenadas.lng}` : rotaEndereco(casa.endereco_publico));
/* Reserva: só https. "Reservar no Airbnb" quando o endereço é do Airbnb, senão "Reservar". */
const linkReserva = () => { const u = urlSegura(casa.link_reserva); return /^https:\/\//i.test(u) ? u : ''; };
const ehAirbnb = (u) => { try { return /(^|\.)airbnb\.[a-z]{2,3}(\.[a-z]{2})?$/i.test(new URL(u).hostname); } catch (e) { return false; } };
const rotuloReserva = () => ehAirbnb(linkReserva()) ? 'Reservar no Airbnb' : 'Reservar';
/* Evita palavra curta sozinha no fim da linha ("e a / vida"). */
const CURTAS = /^(a|à|o|e|é|de|da|do|em|no|na|um|uma|ao|os|as)$/i;
const semViuva = (t) => { const p = String(t == null ? '' : t).trim().split(/\s+/); return p.map((w, i) => esc(w) + (i < p.length - 1 ? (CURTAS.test(w) ? '\u00a0' : ' ') : '')).join(''); };
const waAnfitriao = (t) => linkWa(casa.whatsapp, t || `Olá${casa.anfitriao ? ', ' + casa.anfitriao : ''}! Estou hospedado(a) na ${NOME}.`);
const rota = (l) => {
  if (l.lat != null && l.lng != null && l.precisao !== 'aproximada') return `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`;
  const q = [l.nome, l.endereco].filter(tem).join(', ');
  return q ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q) : '';
};
const hojeISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
const dataBR = (iso) => { const [a, m, d] = String(iso || '').split('-'); return d ? `${d}/${m}/${a}` : ''; };
const hora = (d) => new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(d);
const horaLocal = () => Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(new Date()));
const diaSemana = (d) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', timeZone: TZ }).format(d).replace('.', '');
const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const saudacao = () => { const h = horaLocal(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
const maiuscula = (s) => String(s || '').replace(/^./, c => c.toUpperCase());

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2600);
}
function guardar(chave, valor) { try { sessionStorage.setItem(chave, JSON.stringify({ em: Date.now(), valor })); } catch (e) {} }
function ler(chave, maxMin) { try { const o = JSON.parse(sessionStorage.getItem(chave)); if (o && Date.now() - o.em < maxMin * 60000) return o.valor; } catch (e) {} return null; }

/* ---------- categorias ---------- */
const CAT = {
  casa:        { rot: 'A casa',      tom: 'casa',  ic: 'casa' },
  praia:       { rot: 'Praia',       tom: 'mar',   ic: 'praia',    grupo: 'explorar' },
  natureza:    { rot: 'Natureza',    tom: 'mar',   ic: 'folha',    grupo: 'explorar' },
  passeio:     { rot: 'Passeio',     tom: 'mar',   ic: 'barco',    grupo: 'explorar' },
  cultura:     { rot: 'Cultura',     tom: 'terra', ic: 'capela',   grupo: 'explorar' },
  compras:     { rot: 'Compras',     tom: 'terra', ic: 'sacola',   grupo: 'explorar' },
  restaurante: { rot: 'Restaurante', tom: 'terra', ic: 'garfo',    grupo: 'comer' },
  cafe:        { rot: 'Café',        tom: 'terra', ic: 'xicara',   grupo: 'comer' },
  mercado:     { rot: 'Mercado',     tom: 'terra', ic: 'carrinho', grupo: 'comer' },
  delivery:    { rot: 'Entrega',     tom: 'terra', ic: 'garfo',    grupo: 'comer' },
  farmacia:    { rot: 'Farmácia',    tom: 'neutro', ic: 'cruz',    grupo: 'servicos' },
  saude:       { rot: 'Saúde',       tom: 'neutro', ic: 'cruz',    grupo: 'servicos' },
  servico:     { rot: 'Serviço',     tom: 'neutro', ic: 'fone',    grupo: 'servicos' }
};
/* Pictograma por cena (a mesma escolha que a ilustração faria): capela, farol, jangada… variam dentro da categoria. */
const ICONE_CENA = { piscina: 'ondas', jangada: 'barco', peixeboi: 'ondas', capela: 'capela', farol: 'pino', tunel: 'folha', barra: 'ondas', vila: 'casa', comida: 'garfo', praia: 'praia', casa: 'casa' };
const catDe = (l) => CAT[l.categoria] || { rot: l.categoria || 'Local', tom: 'neutro', ic: 'pino' };
const publicado = (x) => x && x.nome && x.status !== 'rascunho' && x.status !== 'oculto';
const LUGARES = (C.lugares || []).filter(publicado);
const POR_ID = Object.fromEntries(LUGARES.map(l => [l.id, l]));
const ROTEIROS = (C.roteiros || []).filter(r => r && r.titulo && r.status !== 'rascunho');
const LUG_EXPLORAR = LUGARES.filter(l => catDe(l).grupo === 'explorar');
const LUG_COMER = LUGARES.filter(l => catDe(l).grupo === 'comer');
const comerAtivo = () => LUG_COMER.length >= 3; // a aba Comer só existe com 3 ou mais lugares publicados
const PROVAR = (C.provar || []).filter(p => p && tem(p.nome));
const estado = { tipo: 'todos', comer: 'todos', mapa: 'todos', todos: false };

/* ---------- peças ---------- */
const LIMITE = 6; // listas: no máximo 6 itens visíveis, o resto atrás de "Ver todos"
/* Marca os itens além do limite com hidden e devolve o botão "Ver todos". */
function limitar(itens, n) {
  n = n || LIMITE;
  const html = itens.map((h, i) => i < n ? h : String(h).replace(/^(\s*<[a-z]+)/i, '$1 hidden data-excede'));
  return { html: html.join(''), mais: itens.length > n ? itens.length : 0 };
}
const botaoVerTodos = (alvo, total, rot) => `<button type="button" class="btn-terc ver-todos" data-ver-todos="${esc(alvo)}">${esc(rot || 'Ver todos')} (${total})${ic('baixo', 'ic-sm')}</button>`;
function midia(foto, cena, cls) {
  const src = foto && urlSegura(foto.src);
  if (src) return `<span class="midia ${cls || ''}"><img src="${esc(src)}" alt="${esc(foto.alt || '')}" loading="lazy" decoding="async"></span>`;
  if (!cena || !window.Ilustra) return '';
  return `<span class="midia ${cls || ''}" data-ilustra>${Ilustra.arte(cena)}</span>`;
}
function selos(l) {
  const s = [];
  if (l.parceiro) s.push('<span class="selo">Parceiro</span>');
  if (l.depende_mare) s.push(`<span class="selo selo-mare">${ic('ondas')}Maré baixa</span>`);
  if (l.reserva) s.push('<span class="selo">Reservar antes</span>');
  if (l.patrocinado) s.push('<span class="selo">Patrocinado</span>');
  return s.join('');
}
function cardLugar(l) { try { return cardLugar_(l); } catch (e) { registrarFalha('cardLugar ' + (l && l.id || ''), e); return ''; } }
function cardLugar_(l) {
  const c = catDe(l), cena = window.Ilustra ? Ilustra.cenaDoLugar(l) : '';
  const meta = [c.rot, l.area].filter(tem);
  const src = l.foto && urlSegura(l.foto.src), sl = selos(l);
  return `<button type="button" class="card card-lugar${src ? ' com-foto' : ''}" data-abrir="${esc(l.id)}" aria-label="${esc(l.nome)}: ver detalhes">
    ${src ? midia(l.foto) : `<span class="pict">${ic(ICONE_CENA[cena] || c.ic)}</span>`}
    <span class="card-meta">${meta.map(esc).join('<span class="sep" aria-hidden="true"></span>')}</span>
    <span class="h3">${esc(l.nome)}</span>
    ${tem(l.resumo) ? `<span class="card-resumo">${esc(l.resumo)}</span>` : ''}
    ${sl ? `<span class="selos">${sl}</span>` : ''}
  </button>`;
}
const lista = (itens, cls) => `<ul class="lista ${cls || ''}">${itens.filter(tem).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
/* Lista com no máximo 6 itens visíveis e "Ver todos". */
function listaLimitada(id, itens) {
  const L = limitar(itens.filter(tem).map(i => `<li>${esc(i)}</li>`));
  return `<ul class="lista" id="${esc(id)}">${L.html}</ul>${L.mais ? botaoVerTodos(id, L.mais) : ''}`;
}
function botaoWa(rotulo, texto, cls) {
  const u = waAnfitriao(texto);
  return u ? `<a class="btn ${cls || 'btn-prim'}" href="${esc(u)}" target="_blank" rel="noopener">${ic('whatsapp')}${esc(rotulo)}</a>` : '';
}
function cabecalho(olho, titulo, texto, voltar) {
  return `<header class="pag-cab">${voltar ? `<a class="voltar" href="${voltar[0]}">${ic('seta', 'ic-sm')}${esc(voltar[1])}</a>` : ''}${olho ? `<span class="olho">${esc(olho)}</span>` : ''}<h1 class="h1">${titulo}</h1>${texto ? `<p class="lead">${esc(texto)}</p>` : ''}</header>`;
}
function chips(itens, atual, chave, contagem) {
  return `<div class="filtros" role="group" aria-label="Filtrar">${itens.map(([v, r]) =>
    `<button type="button" class="chip" data-filtro="${chave}" data-valor="${esc(v)}" aria-pressed="${v === atual}">${esc(r)}${contagem ? ` <span class="n">${contagem(v)}</span>` : ''}</button>`).join('')}</div>`;
}
const secCab = (id, titulo, olho, acao) => `<div class="sec-cab"><div>${olho ? `<span class="olho">${esc(olho)}</span>` : ''}<h2 id="${id}" class="h2">${titulo}</h2></div>${acao || ''}</div>`;
const fonteLink = (f) => f && urlSegura(f.url) ? `<a href="${esc(urlSegura(f.url))}" target="_blank" rel="noopener">${esc(f.titulo || 'fonte')}</a>` : '';
const mais = (titulo, corpo, id) => corpo ? `<details class="mais"${id ? ` id="${esc(id)}"` : ''}><summary>${esc(titulo)}${ic('mais')}</summary><div class="mais-corpo">${corpo}</div></details>` : '';

/* ---------- armazenamento local (sempre com try/catch) ---------- */
const LS = {
  ler(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  gravar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  apagar(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
const CHAVES_HOSPEDE = ['guia:estadia', 'guia:levar', 'guia:roteiro', 'guia:instalar-dispensado', 'guia:modo-sol'];
const temGuardado = (k) => { try { return localStorage.getItem(k) != null; } catch (e) { return false; } };

/* ---------- datas (sempre no fuso de Alagoas) ---------- */
const isoValida = (s) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false; const [a, m, d] = s.split('-').map(Number); const x = new Date(Date.UTC(a, m - 1, d)); return x.getUTCFullYear() === a && x.getUTCMonth() === m - 1 && x.getUTCDate() === d; };
const diasEntre = (a, b) => { const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); }; return Math.round((p(b) - p(a)) / 864e5); };
const somaDias = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };
const dataLonga = (iso, ano) => new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: ano ? 'numeric' : undefined, timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
const dataCurta = (iso) => maiuscula(new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z')).replace('.', ''));
const horaDe = (t) => { const m = String(t || '').match(/(\d{1,2})\s*(?:[:h]\s*(\d{2}))?/); if (!m) return null; const h = +m[1], mi = +(m[2] || 0); return h < 24 && mi < 60 ? [h, mi] : null; };

/* ---------- Estadia personalizada (contrato 1) ----------
   Link do painel: <site>#/?ola=Nome&in=AAAA-MM-DD&out=AAAA-MM-DD (fragmento). Também aceita ?ola=… na query.
   Valida, guarda só neste aparelho, limpa a URL e apaga sozinho 2 dias após o check-out. */
function lerEstadiaDaUrl() {
  const h = location.hash, qh = h.includes('?') ? h.slice(h.indexOf('?') + 1) : '';
  const pH = new URLSearchParams(qh), pS = new URLSearchParams(location.search);
  const fonte = pH.has('ola') || pH.has('in') ? pH : (pS.has('ola') || pS.has('in') ? pS : null);
  if (!fonte) return;
  const nome = String(fonte.get('ola') || '').trim().replace(/\s+/g, ' '), ini = fonte.get('in') || '', fim = fonte.get('out') || '';
  const nomeOk = nome.length >= 1 && [...nome].length <= 40 && /^[\p{L}][\p{L}\p{M}' .-]*$/u.test(nome);
  if (nomeOk && isoValida(ini) && isoValida(fim) && diasEntre(ini, fim) > 0 && diasEntre(ini, fim) <= 60) {
    LS.gravar('guia:estadia', { nome, in: ini, out: fim, em: hojeISO() });
  }
  // Limpa sempre (mesmo inválido): nome e datas não ficam na barra, no histórico nem em capturas de tela.
  ['ola', 'in', 'out'].forEach(k => { pH.delete(k); pS.delete(k); });
  const caminho = h.split('?')[0], restoH = pH.toString(), restoS = pS.toString();
  const novoHash = (caminho && caminho !== '#/' && caminho !== '#' ? caminho : '#/inicio') + (restoH ? '?' + restoH : '');
  history.replaceState(null, '', location.pathname + (restoS ? '?' + restoS : '') + novoHash);
}
function estadia() {
  const e = LS.ler('guia:estadia');
  if (!e || !e.nome || !isoValida(e.in) || !isoValida(e.out)) return null;
  if (diasEntre(e.out, hojeISO()) > 2) { LS.apagar('guia:estadia'); return null; }
  const hoje = hojeISO(), noites = diasEntre(e.in, e.out), dia = diasEntre(e.in, hoje) + 1;
  const fase = hoje < e.in ? 'antes' : hoje === e.in ? 'chegada' : hoje === e.out ? 'saida' : hoje > e.out ? 'depois' : diasEntre(hoje, e.out) === 1 ? 'vespera' : 'durante';
  return Object.assign({}, e, { noites, dia, total: noites + 1, faltam: diasEntre(hoje, e.in), fase, primeiro: e.nome.split(' ')[0] });
}
const canalFeedback = () => !!urlSegura(CFG.feedback_endpoint) || !!waAnfitriao();
/* Cartão da estadia: o nome já aparece na saudação da capa, então aqui não se repete. */
function cartaoEstadia() {
  const e = estadia(); if (!e) return '';
  const ci = tem(casa.checkin) ? esc(casa.checkin) : '', co = tem(casa.checkout) ? esc(casa.checkout) : '';
  const wa = (t) => waAnfitriao(t);
  let num, rot, tit, txt, acoes = [], barra = '';
  const cal = `<button type="button" class="btn btn-sec btn-peq" data-ics="estadia">${ic('calendario', 'ic-sm')}Adicionar ao calendário</button>`;
  if (e.fase === 'antes') {
    num = e.faltam; rot = e.faltam === 1 ? 'dia para a chegada' : 'dias para a chegada';
    tit = e.faltam === 1 ? 'Amanhã é o dia.' : 'Falta pouco.';
    txt = `Chegada ${esc(dataLonga(e.in))}${ci ? ', check-in ' + ci : ''}. Saída ${esc(dataLonga(e.out))}.`;
    acoes.push(cal, `<a class="btn btn-sec btn-peq" href="#/estadia?ir=chegar">${ic('pino', 'ic-sm')}Como chegar</a>`);
  } else if (e.fase === 'chegada') {
    num = 1; rot = `dia de ${e.total}`; tit = 'Hoje é dia de chegada.';
    txt = `${ci ? 'Check-in ' + ci + '.' : 'Boa viagem até a casa.'}${e.noites === 1 ? ' O check-out é amanhã.' : ''}`;
    const r = rotaCasa(); if (r) acoes.push(`<a class="btn btn-prim btn-peq" href="${esc(r)}" target="_blank" rel="noopener">${ic('pino', 'ic-sm')}Como chegar</a>`);
    if (wa()) acoes.push(`<a class="btn btn-sec btn-peq" href="${esc(wa(`Olá! Aqui é ${e.nome}: chegamos bem na ${NOME}.`))}" target="_blank" rel="noopener">${ic('whatsapp', 'ic-sm')}Avisar que cheguei</a>`);
  } else if (e.fase === 'durante' || e.fase === 'vespera') {
    num = e.dia; rot = `dia de ${e.total}`;
    tit = e.fase === 'vespera' ? 'Amanhã é o check-out.' : 'Bom ver você por aqui.';
    txt = e.fase === 'vespera' ? `Saída ${esc(dataLonga(e.out))}${co ? ', até ' + co : ''}.` : `Check-out ${esc(dataLonga(e.out))}${co ? ', até ' + co : ''}.`;
    barra = `<progress class="estadia-barra" max="${e.total}" value="${e.dia}" aria-label="Dia ${e.dia} de ${e.total} da estadia"></progress>`;
    acoes.push(e.fase === 'vespera' ? `<a class="btn btn-prim btn-peq" href="#/estadia?ir=${tem(casa.chegada.saida) ? 'sair' : 'chegar'}">${ic('chave', 'ic-sm')}Saída</a>` : `<a class="btn btn-sec btn-peq" href="#/meu-roteiro">${ic('lista', 'ic-sm')}Meus dias</a>`);
  } else if (e.fase === 'saida') {
    num = e.total; rot = `dia de ${e.total}`; tit = 'Hoje é dia de partir.';
    txt = `Check-out ${co ? 'até ' + co : 'hoje'}. Obrigado por cuidar da casa.`;
    if (tem(casa.chegada.saida)) acoes.push(`<a class="btn btn-prim btn-peq" href="#/estadia?ir=sair">${ic('chave', 'ic-sm')}Antes de sair</a>`);
    if (wa()) acoes.push(`<a class="btn btn-sec btn-peq" href="${esc(wa(`Olá! Aqui é ${e.nome}: já saímos da ${NOME}. Obrigado!`))}" target="_blank" rel="noopener">${ic('whatsapp', 'ic-sm')}Avisar que saímos</a>`);
  } else {
    num = '·'; rot = 'até a próxima'; tit = 'Obrigado pela visita.';
    txt = 'Estes dados se apagam sozinhos deste aparelho em até 2 dias.';
    if (canalFeedback()) acoes.push(`<a class="btn btn-prim btn-peq" href="#/feedback">${ic('estrela', 'ic-sm')}Contar como foi</a>`);
  }
  if (e.fase !== 'antes' && e.fase !== 'depois') acoes.push(cal);
  acoes.push('<button type="button" class="btn-texto" data-limpar-estadia>Não sou eu · limpar</button>');
  return `<section class="sec estadia" aria-label="Sua estadia"><div class="estadia-card">
    <div class="estadia-topo"><div class="estadia-num"><b class="tab">${num}</b><span>${rot}</span></div>
    <div class="estadia-txt"><h2 class="h3">${tit}</h2><p>${txt}</p>${barra}</div></div>
    <div class="estadia-acoes">${acoes.join('')}</div></div></section>`;
}

/* ---------- Calendário (.ics gerado no aparelho, nada sai daqui) ---------- */
function icsTexto(eventos) {
  const escI = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const enc = new TextEncoder();
  const dobra = (linha) => {
    const out = []; let atual = '';
    for (const ch of linha) { if (enc.encode(atual + ch).length > (out.length ? 74 : 75)) { out.push(atual); atual = ch; } else atual += ch; }
    out.push(atual); return out.join('\r\n ');
  };
  const carimbo = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const utc = (iso, h, m) => new Date(`${iso}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-03:00`).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Casa 18 Anahi//Guia do hospede//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  eventos.forEach((ev, i) => {
    L.push('BEGIN:VEVENT', `UID:${carimbo}-${i}-${Math.random().toString(36).slice(2, 8)}@casa18anahi`, `DTSTAMP:${carimbo}`);
    if (ev.hora) { L.push(`DTSTART:${utc(ev.data, ev.hora[0], ev.hora[1])}`); const fimH = ev.fim || [ev.hora[0] + 1, ev.hora[1]]; L.push(`DTEND:${utc(ev.data, Math.min(fimH[0], 23), fimH[1])}`); }
    else { L.push(`DTSTART;VALUE=DATE:${ev.data.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${somaDias(ev.data, 1).replace(/-/g, '')}`); }
    L.push(`SUMMARY:${escI(ev.titulo)}`);
    if (ev.descricao) L.push(`DESCRIPTION:${escI(ev.descricao)}`);
    if (ev.local) L.push(`LOCATION:${escI(ev.local)}`);
    if (ev.url) L.push(`URL:${ev.url}`);
    if (ev.alarme) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escI(ev.titulo)}`, `TRIGGER:-PT${ev.alarme}H`, 'END:VALARM');
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(dobra).join('\r\n') + '\r\n';
}
function baixarICS(nome, eventos) {
  const txt = icsTexto(eventos);
  window.__ultimoICS = txt; // usado pelos testes automatizados
  const url = URL.createObjectURL(new Blob([txt], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Evento pronto: abra o arquivo para adicionar ao calendário');
}
const urlGuia = () => location.href.split('#')[0].split('?')[0];
function icsEstadia() {
  const e = estadia(); if (!e) return;
  const ci = horaDe(casa.checkin), co = horaDe(casa.checkout), local = casa.endereco_publico || NOME;
  baixarICS('estadia-casa-18-anahi.ics', [
    { data: e.in, hora: ci, titulo: `Check-in · ${NOME}`, local, url: urlGuia() + '#/estadia', alarme: ci ? 3 : 0,
      descricao: `Chegada à ${NOME}.\nGuia do hóspede: ${urlGuia()}#/estadia` },
    { data: e.out, hora: co, titulo: `Check-out · ${NOME}`, local, url: urlGuia() + '#/estadia', alarme: co ? 2 : 0,
      descricao: `Dia da saída.\nGuia do hóspede: ${urlGuia()}#/estadia` }
  ]);
}
const textoRoteiro = (r) => (r.paradas || []).map((p, i) => `${i + 1}. ${p.titulo}${p.momento ? ' (' + p.momento + ')' : ''}`).join('\n');
function icsRoteiro(id, data) {
  const r = ROTEIROS.find(x => x.id === id); if (!r || !isoValida(data)) return;
  const mare = (r.paradas || []).some(p => POR_ID[p.lugar] && POR_ID[p.lugar].depende_mare);
  baixarICS(`roteiro-${id}.ics`, [{ data, titulo: `${r.titulo} · roteiro`, url: urlGuia() + '#/roteiro/' + id,
    descricao: `${r.subtitulo || ''}\n\n${textoRoteiro(r)}${mare ? '\n\nDepende da maré baixa: confira a tábua oficial na véspera.' : ''}\n\n${urlGuia()}#/roteiro/${id}` }]);
}

/* ---------- Astronomia local (funciona sem sinal) ---------- */
const RAD = Math.PI / 180;
/* Nascer e pôr do sol do dia `iso` (equação do nascer do sol, ~1–2 min). Devolve ms (UTC).
   v5: n = dia juliano inteiro do meio-dia UTC da data (antes, Math.ceil caía no dia seguinte e,
   sem previsão, a home dizia "Tarde livre" às 20h com o pôr do sol de amanhã). */
function solCalc(iso, lat, lng) {
  const [y, m, d] = iso.split('-').map(Number);
  const jd = Date.UTC(y, m - 1, d, 12) / 864e5 + 2440587.5;
  const n = Math.round(jd - 2451545.0), Js = n - lng / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360, Cc = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lam = (M + Cc + 180 + 102.9372) % 360, Jt = 2451545 + Js + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lam * RAD);
  const dec = Math.asin(Math.sin(lam * RAD) * Math.sin(23.4397 * RAD));
  const w = Math.acos((Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(dec)) / (Math.cos(lat * RAD) * Math.cos(dec))) / RAD;
  const ms = (J) => (J - 2440587.5) * 864e5;
  return { nasce: ms(Jt - w / 360), poe: ms(Jt + w / 360) };
}
const SINODICO = 29.530588853;
function lua(ms) {
  const idade = (((ms / 864e5 + 2440587.5 - 2451550.1) % SINODICO) + SINODICO) % SINODICO, f = idade / SINODICO;
  const ilum = (1 - Math.cos(2 * Math.PI * f)) / 2;
  const principais = [[0, 'Lua nova'], [.25, 'Quarto crescente'], [.5, 'Lua cheia'], [.75, 'Quarto minguante'], [1, 'Lua nova']];
  const perto = principais.find(([p]) => Math.abs(f - p) * SINODICO <= 1.1);
  const nome = perto ? perto[1] : ['Lua crescente', 'Crescente gibosa', 'Minguante gibosa', 'Lua minguante'][Math.floor(f * 4)];
  const ate = (alvo) => { let dd = (alvo - f) * SINODICO; if (dd < 0.5) dd += SINODICO; return ms + dd * 864e5; };
  return { idade, f, ilum, nome, cheia: ate(0.5), nova: ate(1), sizigia: Math.min(Math.abs(f - .5), f, 1 - f) * SINODICO <= 2.5 };
}
function luaSVG(f, titulo) {
  const r = 20, c = 23, k = Math.cos(2 * Math.PI * f), rx = Math.abs(k) * r;
  const crescendo = f < 0.5, gibosa = k < 0;
  const lado = crescendo ? `M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r}` : `M${c} ${c - r} A${r} ${r} 0 0 0 ${c} ${c + r}`;
  const term = `A${rx.toFixed(2)} ${r} 0 0 ${crescendo ? (gibosa ? 1 : 0) : (gibosa ? 0 : 1)} ${c} ${c - r}`;
  return `<svg class="lua" viewBox="0 0 46 46" role="img" aria-label="${esc(titulo)}"><circle cx="${c}" cy="${c}" r="${r}" fill="#35302B"/><g transform="translate(46 0) scale(-1 1)"><path d="${lado} ${term} Z" fill="#F3E7C9"/></g><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#8C7B5F" stroke-width=".8"/></svg>`;
}
function uvInfo(v) {
  v = Math.round(v);
  if (v <= 2) return ['Baixo', 1, 'Protetor se for ficar muito tempo no sol.'];
  if (v <= 5) return ['Moderado', 2, 'Protetor, chapéu e sombra perto do meio-dia.'];
  if (v <= 7) return ['Alto', 3, 'Protetor FPS 30+, reaplicado a cada 2 horas.'];
  if (v <= 10) return ['Muito alto', 4, 'Evite o sol direto entre 10h e 16h.'];
  return ['Extremo', 5, 'Evite o sol entre 10h e 16h. Crianças na sombra.'];
}
let aguaP = null;
function carregarAgua() {
  const c = ler('guia:agua', 60); if (c) return Promise.resolve(c);
  if (aguaP) return aguaP;
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=-9.25&longitude=-35.40&hourly=sea_surface_temperature&timezone=${encodeURIComponent(TZ)}&forecast_days=1&cell_selection=sea`;
  aguaP = fetch(url).then(r => { if (!r.ok) throw 0; return r.json(); }).then(d => {
    const h = d.hourly || {}, t = h.time || [], v = h.sea_surface_temperature || [];
    const agora = Date.now(); let melhor = null;
    t.forEach((x, i) => { if (v[i] == null) return; const ms = new Date(x + ':00' + offsetTZ()).getTime(); if (!melhor || Math.abs(ms - agora) < Math.abs(melhor[0] - agora)) melhor = [ms, v[i]]; });
    if (!melhor || melhor[1] < 15 || melhor[1] > 35) throw 0;
    const out = { v: melhor[1], em: Date.now() }; guardar('guia:agua', out); return out;
  }).catch(e => { aguaP = null; throw e; });
  return aguaP;
}
const roteiroDeMare = (r) => (r.paradas || []).some(p => POR_ID[p.lugar] && POR_ID[p.lugar].depende_mare);
function roteiroParaMare(b) {
  const comMare = ROTEIROS.filter(roteiroDeMare), semMare = ROTEIROS.filter(r => !roteiroDeMare(r));
  if (!b) return semMare[0] || null;
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(new Date(b.t)));
  const q = (re, nao) => comMare.find(r => re.test(normal(r.quando || '')) && !(nao && nao.test(normal(r.quando || ''))));
  return (h < 11 ? q(/manha/, /fim da manha/) : h < 13 ? q(/fim da manha/) || q(/manha/) : q(/tarde/)) || comMare[0] || null;
}

/* ---------- O que levar (lista que fica no aparelho) ---------- */
const LEVAR = () => (REG.o_que_levar || []).filter(tem);
const chaveItem = (t) => normal(t).replace(/[^a-z0-9]+/g, '').slice(0, 40);
function blocoLevar(id) {
  const itens = LEVAR(); if (!itens.length) return '';
  const marc = new Set((LS.ler('guia:levar') || {}).itens || []);
  return mais('O que levar para a praia', `<ul class="levar" data-levar>${itens.map((t, i) => `<li><input type="checkbox" id="lv-${i}" data-levar-item="${esc(chaveItem(t))}"${marc.has(chaveItem(t)) ? ' checked' : ''}><label for="lv-${i}">${esc(t)}</label></li>`).join('')}</ul><p class="fonte mt">Marque o que já está na bolsa: fica salvo só neste aparelho.</p>`, id || 'levar');
}

/* ---------- Meu roteiro (salvo no aparelho, compartilhável por link) ---------- */
const mrLer = () => { const r = LS.ler('guia:roteiro'); return r && Array.isArray(r.dias) ? r : { ini: '', dias: [[], [], []] }; };
const mrItem = (cod) => { const [t, id] = String(cod).split(':'); if (t === 'r') { const r = ROTEIROS.find(x => x.id === id); return r && { cod, nome: r.titulo, sub: 'Roteiro · ' + (r.quando || ''), ic: 'bussola', href: '#/roteiro/' + r.id, mare: roteiroDeMare(r) }; }
  const l = POR_ID[id]; return l && { cod, nome: l.nome, sub: [catDe(l).rot, l.area].filter(tem).join(' · '), ic: catDe(l).ic, abrir: l.id, mare: !!l.depende_mare }; };
function mrNormalizar(r) {
  const e = estadia();
  const ini = e ? e.in : (isoValida(r.ini) ? r.ini : '');
  const n = e ? e.total : Math.min(Math.max(r.dias.length, 1), 14);
  const dias = Array.from({ length: n }, (_, i) => (r.dias[i] || []).filter(c => mrItem(c)).slice(0, 12));
  return { ini, dias, daEstadia: !!e };
}
const mrCodificar = (r) => { const s = JSON.stringify({ i: r.ini || '', d: r.dias }); return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
function mrDecodificar(b) {
  try { const s = decodeURIComponent(escape(atob(String(b).replace(/-/g, '+').replace(/_/g, '/')))); const o = JSON.parse(s);
    if (!o || !Array.isArray(o.d) || o.d.length > 14) return null;
    return { ini: isoValida(o.i) ? o.i : '', dias: o.d.map(d => (Array.isArray(d) ? d : []).filter(c => typeof c === 'string' && /^[rl]:[\w-]{1,60}$/.test(c)).slice(0, 12)) };
  } catch (e) { return null; }
}
function mrAdicionar(cod, dia) {
  const r = mrNormalizar(mrLer()); const d = Math.min(Math.max(+dia || 0, 0), r.dias.length - 1);
  if (!r.dias[d].includes(cod)) r.dias[d].push(cod);
  LS.gravar('guia:roteiro', { ini: r.ini, dias: r.dias });
  const it = mrItem(cod); toast(`${it ? it.nome : 'Item'} entrou no dia ${d + 1} dos seus dias`);
}
const mrRotuloDia = (r, i) => r.ini ? `Dia ${i + 1} · ${dataCurta(somaDias(r.ini, i))}` : `Dia ${i + 1}`;
function seletorDia(cod) {
  const r = mrNormalizar(mrLer());
  let padrao = 0; if (r.ini) { const k = diasEntre(r.ini, hojeISO()); if (k >= 0 && k < r.dias.length) padrao = k; }
  return `<div class="add-roteiro no-print"><label for="add-${esc(cod)}">Guardar em “Meus dias”</label>
    <div class="mr-add"><select id="add-${esc(cod)}" data-add-dia>${r.dias.map((_, i) => `<option value="${i}"${i === padrao ? ' selected' : ''}>${esc(mrRotuloDia(r, i))}</option>`).join('')}</select>
    <button type="button" class="btn btn-sec btn-peq" data-add-roteiro="${esc(cod)}">${ic('mais', 'ic-sm')}Guardar</button></div></div>`;
}

/* ---------- Convite para instalar (só no rodapé; some quando dispensado) ---------- */
let pedidoInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; const b = document.querySelector('[data-instalar]'); if (b) b.hidden = false; const x = document.querySelector('.instalar'); if (x) x.hidden = false; });
window.addEventListener('appinstalled', () => { pedidoInstalar = null; const x = document.querySelector('.instalar'); if (x) x.remove(); toast('Guia na tela inicial. Ele abre mesmo sem sinal.'); });
const instalado = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function blocoInstalar() {
  if (instalado() || LS.ler('guia:instalar-dispensado')) return '';
  const ios = ehIOS();
  return `<div class="instalar"${ios || pedidoInstalar ? '' : ' hidden'}><p><strong>Guarde o guia na tela inicial.</strong> ${ios ? 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.' : 'Ele abre com um toque, mesmo sem sinal na praia.'}</p>
    <div class="acoes">${ios ? '' : `<button type="button" class="btn btn-sec btn-peq" data-instalar${pedidoInstalar ? '' : ' hidden'}>${ic('instalar', 'ic-sm')}Instalar</button>`}<button type="button" class="btn-texto" data-instalar-nao>Agora não</button></div></div>`;
}

/* ---------- dados externos: tempo e maré ---------- */
const TEMPO = { 0: ['Céu limpo', 'sol'], 1: ['Sol entre nuvens', 'sol'], 2: ['Parcialmente nublado', 'nuvem-sol'], 3: ['Nublado', 'nuvem'], 45: ['Neblina', 'nuvem'], 48: ['Neblina', 'nuvem'], 51: ['Garoa fraca', 'chuva'], 53: ['Garoa', 'chuva'], 55: ['Garoa forte', 'chuva'], 61: ['Chuva fraca', 'chuva'], 63: ['Chuva', 'chuva'], 65: ['Chuva forte', 'chuva'], 80: ['Pancadas fracas', 'chuva'], 81: ['Pancadas de chuva', 'chuva'], 82: ['Pancadas fortes', 'chuva'], 95: ['Trovoadas', 'chuva'], 96: ['Trovoadas', 'chuva'], 99: ['Trovoadas', 'chuva'] };
const tempoDe = (c) => TEMPO[c] || ['Tempo variável', 'nuvem-sol'];
const PONTO = () => (casa.coordenadas && casa.coordenadas.lat != null) ? casa.coordenadas : (REG.centro || { lat: -9.2378, lng: -35.4928 });
const TABUA = 'https://www.marinha.mil.br/chm/tabuas-de-mare';

let climaP = null, mareP = null;
function carregarClima() {
  const c = ler('guia:clima7', 30); if (c) return Promise.resolve(c);
  if (climaP) return climaP;
  const p = PONTO();
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset&timezone=${encodeURIComponent(TZ)}&forecast_days=7`;
  climaP = fetch(url).then(r => { if (!r.ok) throw 0; return r.json(); }).then(d => { d._em = Date.now(); guardar('guia:clima7', d); return d; }).catch(e => { climaP = null; throw e; });
  return climaP;
}
/* Estimativa de maré por modelo (Open-Meteo Marine). Não substitui a tábua oficial. */
function carregarMare() {
  const c = ler('guia:mare7', 60); if (c) return Promise.resolve(c);
  if (mareP) return mareP;
  const lat = -9.25, lng = -35.40;
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=sea_level_height_msl&timezone=${encodeURIComponent(TZ)}&forecast_days=7&cell_selection=sea`;
  mareP = fetch(url).then(r => { if (!r.ok) throw 0; return r.json(); }).then(d => {
    const h = d.hourly || {}; if (!h.time || !h.sea_level_height_msl) throw 0;
    const pts = h.time.map((t, i) => ({ t: new Date(t + ':00' + offsetTZ()), v: h.sea_level_height_msl[i] })).filter(p => p.v != null);
    if (pts.length < 12) throw 0;
    const out = { pts: pts.map(p => [p.t.getTime(), p.v]), _em: Date.now() };
    guardar('guia:mare7', out); return out;
  }).catch(e => { mareP = null; throw e; });
  return mareP;
}
function offsetTZ() { return '-03:00'; } // Alagoas não adota horário de verão
function extremos(pts) {
  const r = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const [t0, a] = pts[i - 1], [t1, b] = pts[i], [, c] = pts[i + 1];
    const min = b < a && b <= c, max = b > a && b >= c;
    if (!min && !max) continue;
    const den = a - 2 * b + c; const dx = den ? (a - c) / (2 * den) : 0;
    r.push({ tipo: min ? 'baixa' : 'alta', t: t1 + dx * (t1 - t0), v: b - (a - c) * dx / 4 });
  }
  return r;
}
const diaISO = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ms));
function solDe(ms, clima) {
  const dia = diaISO(ms);
  const d = clima && clima.daily, i = d && d.time ? d.time.indexOf(dia) : -1;
  if (i >= 0 && d.sunrise && d.sunset && d.sunrise[i] && d.sunset[i]) return { nasce: new Date(d.sunrise[i] + ':00' + offsetTZ()).getTime(), poe: new Date(d.sunset[i] + ':00' + offsetTZ()).getTime(), real: true };
  const p = PONTO(), c = solCalc(dia, p.lat, p.lng);
  return { nasce: c.nasce, poe: c.poe, real: false };
}
function baixasQualificadas(m, clima) {
  const ex = extremos(m.pts), bs = [];
  ex.forEach((e, i) => {
    if (e.tipo !== 'baixa') return;
    const viz = [ex[i - 1], ex[i + 1]].filter(x => x && x.tipo === 'alta');
    const amp = viz.length ? Math.max(...viz.map(x => x.v)) - e.v : null;
    const s = solDe(e.t, clima), claro = e.t >= s.nasce && e.t <= s.poe;
    bs.push(Object.assign({}, e, { amp, claro, periodo: claro ? 'dia' : (e.t < s.nasce ? 'madrugada' : 'noite') }));
  });
  const amps = bs.map(b => b.amp).filter(a => a != null);
  const amax = Math.max(...amps), amin = Math.min(...amps), faixa = amax - amin;
  const fundo = Math.min(...bs.map(b => b.v)), semana = m.pts.length > 1 && (m.pts[m.pts.length - 1][0] - m.pts[0][0]) >= 5.5 * 864e5;
  bs.forEach(b => {
    if (b.amp == null || !isFinite(faixa) || faixa < amax * 0.12) { b.qual = faixa >= 0 && amps.length ? 'média' : ''; }
    else { const r = (b.amp - amin) / faixa; b.qual = r >= 0.66 ? 'boa' : r >= 0.33 ? 'média' : 'fraca'; }
    b.maisBaixa = semana && isFinite(faixa) && faixa >= amax * 0.12 && b.v === fundo;
    b.rotQual = b.maisBaixa ? 'mais baixa da semana' : b.qual;
  });
  return bs;
}
const proximasBaixas = (m, clima) => baixasQualificadas(m, clima).filter(e => e.t > Date.now() - 30 * 60000);
const proximaBaixaClara = (m, clima) => proximasBaixas(m, clima).find(b => b.claro);
const rotBaixa = (b) => b.claro ? (b.rotQual || '') : b.periodo;
function quandoRel(ms) {
  const d = new Date(ms), hoje = hojeISO();
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);
  const am = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(Date.now() + 864e5));
  return (dia === hoje ? 'hoje' : dia === am ? 'amanhã' : diaSemana(d)) + ', ' + hora(d);
}

const ICS = { wifi: 'wifi', ar: 'ar', cozinha: 'cozinha', cama: 'cama', toalha: 'toalha', carro: 'carro', piscina: 'piscina', tv: 'tv', maquina: 'maquina', churrasqueira: 'churrasqueira', chuveiro: 'chuveiro', varanda: 'varanda', rede: 'rede', praia: 'praia', outro: 'check', aviao: 'aviao', estrada: 'estrada', pino: 'pino', onibus: 'onibus', bicicleta: 'bicicleta' };
/* A casa em números (dados do conteúdo; nada é deduzido). */
function numerosCasa() {
  const it = [];
  if (casa.hospedes) it.push([casa.hospedes, 'hóspedes']);
  if (casa.quartos) it.push([casa.quartos, casa.suites ? `quartos · ${casa.suites} suíte${casa.suites > 1 ? 's' : ''}` : 'quartos']);
  if (casa.banheiros != null && casa.banheiros !== '') it.push([casa.banheiros, 'banheiros']);
  if (casa.area_m2) it.push([casa.area_m2 + ' m²', 'de área']);
  if (it.length < 2) return '';
  return `<ul class="numeros" data-n="${it.length}">${it.map(([v, r]) => `<li class="numero"><strong>${esc(v)}</strong><span>${esc(r)}</span></li>`).join('')}</ul>`;
}

/* ---------- Disponibilidade: agenda espelhada do Airbnb ----------
   Só aparece com config.agenda_visivel = true e o endereço do Apps Script (config.feedback_endpoint) em https.
   GET <endpoint>?acao=agenda devolve apenas períodos ocupados (fim exclusivo). Cópia na sessão por 30 min. */
const AG_CHAVE = 'guia:agenda', AG_MIN = 30;
let AG_MEMORIA = null;
const agendaEndpoint = () => { const u = urlSegura(CFG.feedback_endpoint); return /^https:\/\//i.test(u) ? u : ''; };
const agendaAtiva = () => CFG.agenda_visivel === true && !!agendaEndpoint() && !!window.GuiaAgenda;
const fraseConfirma = () => linkReserva() && !ehAirbnb(linkReserva()) ? 'Disponibilidade sujeita a confirmação no momento da reserva.' : 'Disponibilidade sujeita a confirmação no Airbnb.';
function blocoAgenda(pagina) {
  if (!agendaAtiva()) return '';
  const res = linkReserva();
  return `<section class="sec agenda-sec${pagina ? ' agenda-pag' : ''}" id="disponibilidade" aria-labelledby="h-disp" data-agenda>
    <div class="agenda">
      <div class="agenda-txt">
        ${pagina ? '' : '<span class="olho">Disponibilidade</span>'}
        <h2 id="h-disp" class="h2">${pagina ? 'Calendário da casa' : 'Datas livres'}</h2>
        <p class="agenda-prox" data-ag-prox><span class="skeleton"></span></p>
        <p class="agenda-nota">${ic('alerta', 'ic-sm')}<span>${esc(fraseConfirma())}</span></p>
        <p class="fonte" data-ag-atual></p>
        ${res ? `<a class="btn btn-prim agenda-btn" href="${esc(res)}" target="_blank" rel="noopener">${esc(rotuloReserva())}${ic('seta', 'ic-sm')}<span class="sr-only"> (abre em nova aba)</span></a>` : ''}
      </div>
      <div class="agenda-cal" data-ag-cal aria-busy="true"><div class="ag-carregando" role="status"><span class="sr-only">Carregando a agenda…</span>${'<span class="skeleton"></span>'.repeat(3)}</div></div>
    </div>
  </section>`;
}
async function obterAgenda() {
  const salvo = ler(AG_CHAVE, AG_MIN) || (AG_MEMORIA && Date.now() - AG_MEMORIA.em < AG_MIN * 6e4 ? AG_MEMORIA.valor : null);
  if (salvo) { const d = GuiaAgenda.validar(salvo); if (d) return d; }
  const ab = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ab && setTimeout(() => ab.abort(), 12000);
  try {
    const u = new URL(agendaEndpoint()); u.searchParams.set('acao', 'agenda');
    const r = await fetch(u.href, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: ab ? ab.signal : undefined });
    const j = await r.json();
    const d = GuiaAgenda.validar(j); if (!d) throw new Error((j && j.erro) || 'resposta inválida');
    guardar(AG_CHAVE, j); AG_MEMORIA = { em: Date.now(), valor: j };
    return d;
  } finally { if (t) clearTimeout(t); }
}
const diaCurto = (iso) => { const [a, m, d] = iso.split('-').map(Number); return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(a, m - 1, d, 12))).replace(/\./g, ''); };
function agendaFalhou(sec, e) {
  registrarFalha('agenda (dados do calendário)', e);
  const res = linkReserva();
  if (res) {
    sec.classList.add('agenda-sec-falha');
    sec.innerHTML = `<div class="agenda-falha"><div><span class="olho">Disponibilidade</span><p>As datas livres estão no ${ehAirbnb(res) ? 'Airbnb' : 'site de reservas'}.</p></div><a class="btn btn-sec" href="${esc(res)}" target="_blank" rel="noopener">${ehAirbnb(res) ? 'Ver disponibilidade no Airbnb' : 'Ver disponibilidade'}${ic('seta', 'ic-sm')}<span class="sr-only"> (abre em nova aba)</span></a></div>`;
  } else if (sec.classList.contains('agenda-pag')) {
    sec.innerHTML = `<div class="vazio-pag"><h2 class="h3">A agenda não abriu agora.</h2><p>Tente de novo daqui a pouco.</p><a class="btn btn-sec" href="#/inicio">${ic('casa', 'ic-sm')}Ir para o início</a></div>`;
  } else sec.remove();
}
function preencherAgenda() {
  const sec = $main.querySelector('[data-agenda]'); if (!sec) return;
  obterAgenda().then((d) => {
    if (!document.body.contains(sec)) return;
    const hoje = hojeISO(), cal = sec.querySelector('[data-ag-cal]');
    GuiaAgenda.montar(cal, d, { hoje, id: 'ag-meses' }); cal.removeAttribute('aria-busy');
    const px = GuiaAgenda.proximaLivre(d, hoje), el = sec.querySelector('[data-ag-prox]');
    if (el) el.innerHTML = px ? `<span class="agenda-prox-rot">${px.dia === hoje ? 'Livre a partir de' : 'Próxima data livre'}</span><strong>${px.dia === hoje ? 'hoje' : esc(diaCurto(px.dia))}</strong><span>${px.ate30 ? '30 noites ou mais em sequência' : `${px.noites} ${px.noites === 1 ? 'noite livre' : 'noites livres'} em sequência`}</span>`
      : '<span class="agenda-prox-rot">Nos próximos meses</span><strong>sem datas livres</strong><span>Novas datas podem abrir: vale olhar de novo.</span>';
    const at = sec.querySelector('[data-ag-atual]');
    if (at && d.atualizado) { const dt = new Date(d.atualizado), dia = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(dt); at.textContent = (dia === hoje ? `Atualizado às ${hora(dt)}` : `Atualizado em ${dataBR(dia).slice(0, 5)} às ${hora(dt)}`) + (d.parcial ? ' · parte do calendário não pôde ser lida agora' : ''); }
  }).catch((e) => { if (document.body.contains(sec)) agendaFalhou(sec, e); });
}

/* ---------- PÁGINAS ---------- */
const P = {};

/* HOJE · capa, 3 atalhos, Hoje e no máximo 3 blocos curtos. */
P.inicio = () => {
  const ben = beneficiosAtivos(), aval = avaliacoesOk(), e = estadia();
  const blocos = [];
  if (!e) blocos.push(S('início: a casa', () => { const nums = numerosCasa(); return nums ? `<section class="sec" aria-labelledby="h-casa">${secCab('h-casa', 'A casa', '', `<a class="btn-terc" href="#/estadia">Ver a estadia${ic('seta')}</a>`)}${nums}</section>` : ''; }));
  blocos.push(S('início: roteiros', () => ROTEIROS.length ? `<section class="sec" aria-labelledby="h-rot">${secCab('h-rot', 'Roteiros prontos', '', `<a class="btn-terc" href="#/passeios">Todos os passeios${ic('seta')}</a>`)}
    <div class="roteiros roteiros-trilho ate-3">${ROTEIROS.slice(0, 3).map(cardRoteiro).join('')}</div></section>` : ''));
  if (aval.length) blocos.push(S('início: avaliações', () => `<section class="sec" aria-labelledby="h-aval">${secCab('h-aval', 'Quem já esteve aqui', '', aval.length > 2 ? `<a class="btn-terc" href="#/avaliacoes">Ver todas${ic('seta')}</a>` : '')}<div class="cards">${aval.slice(0, 2).map(cardAvaliacao).join('')}</div></section>`));
  if (ben.length) blocos.push(S('início: benefícios', () => `<section class="sec" aria-labelledby="h-ben">${secCab('h-ben', 'Para hóspedes', '', `<a class="btn-terc" href="#/beneficios">Ver todos${ic('seta')}</a>`)}<div class="cards">${ben.slice(0, 3).map(cardBeneficio).join('')}</div></section>`));
  return `
  ${S('início: capa', () => capa(e))}
  ${S('início: rápido', () => rapido())}
  <section class="sec dia" aria-labelledby="h-hoje" id="seu-dia">${S('início: hoje', () => painelDia())}</section>
  ${S('início: estadia', () => cartaoEstadia())}
  ${S('início: agenda', () => e ? '' : blocoAgenda())}
  ${blocos.filter(Boolean).slice(0, 3).join('')}`;
};
function capa(e) {
  const f0 = (casa.fotos || [])[0], fotoHero = f0 && urlSegura(f0.src), res = linkReserva();
  const arte = fotoHero ? `<img src="${esc(fotoHero)}" alt="${esc(f0.alt || '')}" fetchpriority="high">` : (window.Ilustra ? Ilustra.arte('praia', { heroi: true, vb: '-20 10 440 250' }) : '');
  return `<section class="hero" aria-labelledby="h-hero">
    <div class="hero-texto">
      <span class="hero-ola">${e ? esc(saudacao()) + ', ' + esc(e.primeiro) : esc(saudacao()) + ' · bem-vindo à'}</span>
      <h1 id="h-hero" class="hero-marca" aria-label="${esc(NOME)}">${esc(NOME_PARTES[0])}${NOME_PARTES[1] ? ` <em>${esc(NOME_PARTES[1])}</em>` : ''}</h1>
      <p class="hero-local">Praia do Marceneiro<span class="sep" aria-hidden="true"> · </span>Rota dos Milagres, AL</p>
      ${tem(casa.frase) ? `<p class="hero-frase">${semViuva(casa.frase)}</p>` : ''}
      <div class="hero-acoes">${res ? `<a class="btn btn-prim btn-reserva" href="${esc(res)}" target="_blank" rel="noopener" data-reserva-hero>${esc(rotuloReserva())}${ic('seta', 'ic-sm')}<span class="sr-only"> (abre em nova aba)</span></a>`
        : RASCUNHO ? `<span class="btn-reserva-falta" data-reserva-falta>${ic('alerta', 'ic-sm')}Botão “Reservar”: configure o link no painel (A casa)</span>` : ''}</div>
    </div>
    ${arte ? `<div class="hero-arte">${arte}</div>` : ''}
  </section>`;
}
/* Três atalhos práticos logo abaixo da capa. Cada um só promete o que o conteúdo tem. */
function rapido() {
  const wa = waAnfitriao(), ci = tem(casa.checkin) ? casa.checkin : '', co = tem(casa.checkout) ? casa.checkout : '';
  const wifi = (casa.comodidades || []).find(c => c && (c.icone === 'wifi' || /wi-?fi/i.test(c.nome || '')));
  const it = [
    wifi ? ['#/estadia?ir=na-casa', 'wifi', 'Wi-Fi', tem(wifi.descricao) ? wifi.descricao : 'Na casa', ''] : ['#/passeios/mare', 'ondas', 'Maré de hoje', 'Horários estimados', ''],
    ['#/estadia?ir=chegar', 'pino', ci ? 'Check-in ' + ci : 'Chegada', co ? 'Checkout ' + co : 'Endereço e rota', ''],
    wa ? [wa, 'whatsapp', 'Anfitrião', 'Falar no WhatsApp', ' target="_blank" rel="noopener"'] : ['#/ajuda', 'fone', 'Emergência', 'SAMU 192 · Bombeiros 193', '']
  ];
  return `<ul class="rapido" aria-label="Atalhos rápidos">${it.map(([h, i, t, sub, x]) => `<li><a href="${esc(h)}"${x}><span class="pict">${ic(i)}</span><div><strong>${esc(t)}</strong><span>${esc(sub)}</span></div></a></li>`).join('')}</ul>`;
}
function painelDia() {
  return `<div class="dia-cab"><h2 id="h-hoje" class="h2">Hoje</h2><span class="meta">${esc(maiuscula(dataLonga(hojeISO())))}</span></div>
    <div class="dia-grade" id="dia-grade">
    <a class="dia-item" href="#/passeios/mare" id="dia-tempo"><span class="rot">${ic('sol')}Agora</span><strong><span class="skeleton"></span></strong><span class="sub">Previsão do tempo</span></a>
    <a class="dia-item" href="#/passeios/mare" id="dia-mare"><span class="rot">${ic('ondas')}Maré baixa</span><strong><span class="skeleton"></span></strong><span class="sub">Estimativa</span></a>
    <a class="dia-item" href="#/passeios/mare" id="dia-sol">${blocoSol(null)}</a>
    ${sugestao()}</div>`;
}
/* Sugestão: entre 22h e 6h vira atalho de ajuda. O pôr do sol usa o horário real quando a previsão carrega;
   sem ela, o cálculo local do próprio dia. */
function sugestao(poeMs) {
  const h = horaLocal(), agora = Date.now();
  const rot = (id, alt) => (ROTEIROS.find(r => r.id === id) ? '#/roteiro/' + id : alt);
  const rioMar = ROTEIROS.find(r => r.id === 'rio-e-mar');
  const antesDoPor = poeMs ? (agora < poeMs && agora >= poeMs - 150 * 6e4) : (h >= 15 && h < 17);
  const depoisDoPor = poeMs ? agora >= poeMs : h >= 17;
  const comer = comerAtivo();
  const X = (h >= 22 || h < 6) ? ['Precisa de ajuda agora?', 'Emergência e contatos', 'SAMU 192 · Bombeiros 193 · Polícia 190', '#/ajuda', 'alerta', 'urgente']
    : h < 10 ? ['Para começar', 'Piscinas naturais', 'Veja se a maré ajuda hoje', rot('piscinas-naturais', '#/passeios/mare'), 'estrela']
    : h < 14 && (comer || PROVAR.length) ? ['Hora do almoço', 'Sabores locais', comer ? 'O que provar e onde comer' : 'O que provar por aqui', comer ? '#/comer' : '#/passeios?ir=provar', 'estrela']
    : !depoisDoPor && antesDoPor && rioMar ? ['Fim de tarde', rioMar.titulo, 'Pôr do sol onde o rio encontra o mar', '#/roteiro/rio-e-mar', 'por-sol']
    : !depoisDoPor ? ['Tarde livre', 'Devagar pelo Marceneiro', 'Capela, riacho e vilinha', rot('devagar-marceneiro', '#/passeios'), 'estrela']
    : ['Para amanhã', 'Planeje o dia', 'Maré, tempo e roteiros', '#/passeios/mare', 'estrela'];
  return `<a class="dia-item destaque${X[5] ? ' ' + X[5] : ''}" id="dia-sug" href="${X[3]}"><span class="rot">${ic(X[4])}${esc(X[0])}</span><strong>${esc(X[1])}</strong><span class="sub">${esc(X[2])}</span></a>`;
}
/* Pôr do sol: previsão quando houver; sem ela, cálculo local (funciona sem sinal). */
function blocoSol(d) {
  const p = PONTO(), hoje = hojeISO();
  let poe, nasce, amanha = false;
  if (d && d.daily && d.daily.sunset) {
    const ps = new Date(d.daily.sunset[0] + ':00' + offsetTZ()); amanha = ps.getTime() < Date.now();
    poe = amanha ? new Date(d.daily.sunset[1] + ':00' + offsetTZ()) : ps; nasce = new Date(d.daily.sunrise[amanha ? 1 : 0] + ':00' + offsetTZ());
  } else {
    let c = solCalc(hoje, p.lat, p.lng); if (c.poe < Date.now()) { amanha = true; c = solCalc(somaDias(hoje, 1), p.lat, p.lng); }
    poe = new Date(c.poe); nasce = new Date(c.nasce);
  }
  return `<span class="rot">${ic('por-sol')}Pôr do sol</span><strong>${amanha ? 'Amanhã, ' : ''}${hora(poe)}</strong><span class="sub">Nascer do sol ${hora(nasce)}</span>`;
}
function preencherDia() {
  const el = (id) => document.getElementById(id);
  carregarClima().then(d => {
    if (!el('dia-tempo')) return;
    const [desc, icone] = tempoDe(d.current.weather_code);
    const chuva = d.daily.precipitation_probability_max[0];
    el('dia-tempo').innerHTML = `<span class="rot">${ic(icone)}Agora</span><strong>${Math.round(d.current.temperature_2m)}° · ${esc(desc)}</strong><span class="sub">Máx. ${Math.round(d.daily.temperature_2m_max[0])}° · chuva ${chuva}% · UV ${Math.round(d.daily.uv_index_max[0])}</span>`;
    const ps = new Date(d.daily.sunset[0] + ':00' + offsetTZ());
    el('dia-sol').innerHTML = blocoSol(d);
    const sg = el('dia-sug'); if (sg) sg.outerHTML = sugestao(ps.getTime());
  }).catch(() => {
    // Sem previsão: o cartão do tempo sai (uma página não precisa de três mensagens de "sem sinal").
    const t = el('dia-tempo'); if (t) { t.remove(); const g = el('dia-grade'); if (g) g.classList.add('tres'); }
    const sg = el('dia-sug'), c = solCalc(hojeISO(), PONTO().lat, PONTO().lng); if (sg) sg.outerHTML = sugestao(c.poe);
  });
  Promise.all([carregarMare(), carregarClima().catch(() => null)]).then(([m, cl]) => {
    if (!el('dia-mare')) return;
    const b = proximaBaixaClara(m, cl), rr = b && roteiroParaMare(b);
    if (b && rr) el('dia-mare').setAttribute('href', '#/roteiro/' + rr.id);
    el('dia-mare').innerHTML = b ? `<span class="rot">${ic('ondas')}Maré baixa de dia</span><strong>${esc(maiuscula(quandoRel(b.t)))}</strong><span class="sub">${b.rotQual ? esc(maiuscula(b.rotQual)) + ' · ' : ''}estimativa</span>${rr ? `<span class="liga">Combina com: ${esc(rr.titulo)}</span>` : ''}`
      : `<span class="rot">${ic('ondas')}Maré</span><strong>Tábua oficial</strong><span class="sub">Veja antes de sair</span>`;
  }).catch(() => {
    if (el('dia-mare')) el('dia-mare').innerHTML = `<span class="rot">${ic('ondas')}Maré</span><strong>Tábua oficial</strong><span class="sub">Veja antes de sair</span>`;
  });
}

function cardRoteiro(r) { try { return cardRoteiro_(r); } catch (e) { registrarFalha('cardRoteiro ' + (r && r.id || ''), e); return ''; } }
function cardRoteiro_(r) {
  return `<a class="card roteiro" href="#/roteiro/${esc(r.id)}">${midia(null, r.ilustracao || 'praia')}
    ${tem(r.quando) ? `<span class="olho">${esc(r.quando)}</span>` : ''}<h3 class="h3">${esc(r.titulo)}</h3>${tem(r.subtitulo) ? `<p>${esc(r.subtitulo)}</p>` : ''}
    <span class="meta">${(r.paradas || []).length} paradas${ic('seta', 'ic-sm')}</span></a>`;
}

const dataPadraoRoteiro = () => { const e = estadia(), h = hojeISO(); return e && e.in > h ? e.in : h; };
P.roteiro = (id) => {
  const r = ROTEIROS.find(x => x.id === id);
  if (!r) return `${cabecalho('Roteiro', 'Roteiro não encontrado', 'Ele pode ter sido removido ou renomeado.', ['#/passeios', 'Passeios'])}<section class="sec"><a class="btn btn-sec" href="#/passeios">${ic('bussola')}Ver os passeios</a></section>`;
  const precisaMare = (r.paradas || []).some(p => POR_ID[p.lugar] && POR_ID[p.lugar].depende_mare);
  const dados = [['Quando', r.quando], ['Ideal para', r.ideal]].filter(([, v]) => tem(v));
  return `
  ${cabecalho('Roteiro', esc(r.titulo), r.subtitulo, ['#/passeios', 'Passeios'])}
  ${midia(null, r.ilustracao || 'praia', 'capa')}
  ${S('roteiro: paradas', () => `<section class="sec">
    <div class="grade g-8-4">
      <ol class="linha-tempo">${(r.paradas || []).map((p, i) => {
        const l = POR_ID[p.lugar];
        return `<li class="parada"><span class="parada-n" aria-hidden="true">${i + 1}</span><div class="parada-corpo">
          ${tem(p.momento) ? `<span class="olho">${esc(p.momento)}</span>` : ''}<h2 class="h3">${esc(p.titulo)}</h2>${tem(p.texto) ? `<p>${esc(p.texto)}</p>` : ''}
          ${l ? `<button type="button" class="btn-terc" data-abrir="${esc(l.id)}">${esc(l.nome)}${ic('seta')}</button>` : ''}
        </div></li>`;
      }).join('')}</ol>
      <aside class="grade">
        ${dados.length ? `<div class="card"><dl class="dados">${dados.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>` : ''}
        ${precisaMare ? `<a class="aviso" href="#/passeios/mare">${ic('ondas')}<span>Depende da maré baixa. Veja a estimativa de hoje e confirme na tábua oficial.</span></a>` : ''}
        <div class="card no-print"><span class="olho">Planejar</span>
          <div class="campo"><label for="rot-data">Em que dia você vai?</label><input type="text" data-cal="unico" id="rot-data" value="${esc(dataPadraoRoteiro())}" data-cal-min="${esc(hojeISO())}" placeholder="Escolha o dia"></div>
          <button type="button" class="btn btn-sec btn-peq" data-ics-roteiro="${esc(r.id)}">${ic('calendario', 'ic-sm')}Adicionar ao calendário</button>
          ${seletorDia('r:' + r.id)}</div>
        ${botaoWa('Pedir ajuda ao anfitrião', `Olá! Quero fazer o roteiro "${r.titulo}". Pode me ajudar?`, 'btn-sec')}
      </aside>
    </div>
  </section>`)}`;
};

/* PASSEIOS · Lugares (com roteiros), Maré e tempo, Mapa. */
const ABAS_PASSEIOS = [['', 'Lugares', 'bussola'], ['mare', 'Maré e tempo', 'ondas'], ['mapa', 'Mapa', 'pino']];
const abas = (atual) => `<nav class="abas" aria-label="Seções de Passeios">${ABAS_PASSEIOS.map(([k, t, i]) => `<a href="#/passeios${k ? '/' + k : ''}"${k === (atual || '') ? ' aria-current="page"' : ''}>${ic(i, 'ic-sm')}${esc(t)}</a>`).join('')}</nav>`;
P.passeios = (sub) => {
  sub = sub === 'mare' || sub === 'mapa' ? sub : '';
  const cab = cabecalho('Rota dos Milagres', 'Passeios', sub === 'mare' ? 'Maré, sol e previsão para organizar o dia.' : sub === 'mapa' ? 'Toque em um ponto para ver detalhes e a rota.' : 'Praias, piscinas naturais e roteiros perto da casa.');
  return cab + abas(sub) + (sub === 'mare' ? vistaMare() : sub === 'mapa' ? vistaMapa() : vistaLugares());
};
const AGUA_VIVA = /[áa]gua-?viva|caravela/i;
function vistaLugares() {
  const base = LUG_EXPLORAR;
  const tipos = [['todos', 'Tudo']].concat(['praia', 'passeio', 'natureza', 'cultura', 'compras'].filter(k => base.some(l => l.categoria === k)).map(k => [k, CAT[k].rot + (k === 'praia' || k === 'passeio' ? 's' : '')]));
  const vis = estado.tipo === 'todos' ? base : base.filter(l => l.categoria === estado.tipo);
  const n = estado.todos || estado.tipo !== 'todos' ? vis.length : (matchMedia('(max-width: 599px)').matches ? 4 : LIMITE);
  const dicas = (REG.dicas || []).filter(t => tem(t) && !AGUA_VIVA.test(t));
  return `
  ${S('passeios: maré de hoje', () => `<section class="sec sec-curta"><a class="mare-hoje" id="mare-hoje" href="#/passeios/mare">${ic('ondas')}<div><strong>Maré de hoje</strong><span>Horários estimados das marés baixas</span></div>${ic('seta')}</a></section>`)}
  ${S('passeios: roteiros', () => ROTEIROS.length ? `<section class="sec" aria-labelledby="h-rots">${secCab('h-rots', 'Roteiros prontos')}
    <div class="roteiros roteiros-trilho">${ROTEIROS.map(cardRoteiro).join('')}</div></section>` : '')}
  ${S('passeios: lugares', () => base.length ? `<section class="sec" aria-labelledby="h-lug">${secCab('h-lug', 'Lugares')}
    ${tipos.length > 2 ? chips(tipos, estado.tipo, 'tipo') : ''}
    <p class="sr-only" aria-live="polite">${vis.length} lugares</p>
    <div class="cards">${vis.slice(0, n).map(cardLugar).join('')}</div>
    ${vis.length > n ? `<button type="button" class="btn-terc ver-todos" data-ver-lugares>Ver todos os ${vis.length} lugares${ic('baixo', 'ic-sm')}</button>` : ''}
  </section>` : '')}
  ${S('passeios: bom saber', () => { const prov = comerAtivo() ? '' : corpoProvar(); return prov || dicas.length || tem(REG.dias_de_chuva) ? `<section class="sec" aria-labelledby="h-saber">${secCab('h-saber', 'Bom saber')}
    ${mais('O que provar', prov, 'provar')}${mais('Antes de sair', dicas.length ? listaLimitada('l-dicas', dicas) : '')}${mais('Se chover', tem(REG.dias_de_chuva) ? lista(REG.dias_de_chuva) : '')}
    <p class="aviso mt">${ic('folha')}<span>A rota fica na APA Costa dos Corais. Nas piscinas naturais, não pise nem toque nos corais.</span></p></section>` : ''; })}
  <section class="sec sec-curta no-print"><a class="btn-terc" href="#/meu-roteiro">${ic('lista', 'ic-sm')}Montar meus dias${ic('seta')}</a></section>`;
}
/* "O que provar" (e os poucos lugares de comer já publicados), enquanto a aba Comer não existe. */
/* "O que provar" e, enquanto a aba Comer não existe, os poucos lugares de comer já publicados. */
function corpoProvar() {
  if (!PROVAR.length && !LUG_COMER.length) return '';
  return `${PROVAR.length ? `<ul class="linhas">${PROVAR.map(p => `<li><span class="linha-txt"><strong>${esc(p.nome)}</strong>${tem(p.descricao) ? `<span>${esc(p.descricao)}</span>` : ''}</span></li>`).join('')}</ul>` : ''}
    ${LUG_COMER.length ? `<div class="mt"><h3 class="h3">Onde comer</h3><div class="cards">${LUG_COMER.map(cardLugar).join('')}</div></div>` : ''}`;
}
function blocoProvar() {
  if (!PROVAR.length) return '';
  const itens = PROVAR.map(p => `<li><span class="linha-txt"><strong>${esc(p.nome)}</strong>${tem(p.descricao) ? `<span>${esc(p.descricao)}</span>` : ''}</span></li>`);
  const L = limitar(itens, 4);
  return `<section class="sec" id="provar" aria-labelledby="h-prov">${secCab('h-prov', 'O que provar', 'Cozinha alagoana')}<ul class="linhas" id="l-provar">${L.html}</ul>${L.mais ? botaoVerTodos('l-provar', L.mais) : ''}</section>`;
}
function vistaMare() {
  return `
  ${S('maré: hoje', () => `<section class="sec" aria-labelledby="h-alm">${secCab('h-alm', 'Hoje', '', `<span class="meta">${esc(maiuscula(dataLonga(hojeISO())))}</span>`)}
    <div id="almanaque">${almanaqueHTML()}</div></section>`)}
  <section class="sec" aria-labelledby="h-mare" id="sec-mare">${secCab('h-mare', 'Próximas marés baixas')}
    <div class="card"><div id="mare"><span class="skeleton"></span></div>
      <p class="fonte">Estimativa por modelo (Open-Meteo Marine), sem altura em metros. Antes de sair, confirme na <a href="${TABUA}" target="_blank" rel="noopener">tábua oficial da Marinha</a> (porto de Maceió).</p></div>
  </section>
  <section class="sec" aria-labelledby="h-prev" id="sec-prev">${secCab('h-prev', 'Próximos 3 dias', '', '<span class="fonte" id="prev-fonte"></span>')}
    <div class="card"><div class="previsao" id="previsao">${[0, 1, 2].map(() => '<div class="dia-prev"><span class="skeleton"></span><span class="skeleton"></span></div>').join('')}</div></div>
  </section>
  ${S('maré: dicas', () => { const lev = S('maré: o que levar', () => blocoLevar('levar')); return tem(REG.mares) || tem(REG.quando_ir) || lev ? `<section class="sec" aria-label="Como ler a maré e o que levar">${mais('Como ler a maré', tem(REG.mares) ? listaLimitada('l-mares', REG.mares) : '')}${mais('Quando ir', tem(REG.quando_ir) ? lista(REG.quando_ir) : '')}${lev}</section>` : ''; })}`;
}
function vistaMapa() {
  const cats = Object.keys(CAT).filter(k => k !== 'casa' && LUGARES.some(l => l.categoria === k && l.lat != null));
  const vis = estado.mapa === 'todos' ? LUGARES : LUGARES.filter(l => l.categoria === estado.mapa);
  const itens = vis.map(l => `<li><span class="pict">${ic(catDe(l).ic)}</span><span class="linha-txt"><strong>${esc(l.nome)}</strong><span>${esc([catDe(l).rot, l.area].filter(tem).join(' · '))}</span></span><button type="button" class="btn-ic linha-acao" data-abrir="${esc(l.id)}" aria-label="Detalhes: ${esc(l.nome)}">${ic('seta')}</button></li>`);
  const L = limitar(itens);
  return `
  <section class="sec">${cats.length > 1 ? chips([['todos', 'Tudo']].concat(cats.map(k => [k, CAT[k].rot])), estado.mapa, 'mapa') : ''}
    <div class="mapa" id="mapa"></div><p class="fonte">Mapa © colaboradores do OpenStreetMap. Pontos tracejados têm localização aproximada.</p></section>
  ${S('mapa: lista', () => vis.length ? `<section class="sec" aria-labelledby="h-l">${secCab('h-l', 'Todos os lugares')}<ul class="linhas" id="l-mapa">${L.html}</ul>${L.mais ? botaoVerTodos('l-mapa', L.mais) : ''}</section>` : '')}`;
}

/* Maré e tempo: sol e lua calculados aqui; água e UV quando a previsão responde. */
const ALM = { clima: null, agua: null, mare: null };
function almanaqueHTML() {
  const p = PONTO(), hoje = hojeISO(), c = ALM.clima, d = c && c.daily;
  let nasce, poe, real = false;
  if (d && d.sunrise && d.sunrise[0]) { nasce = new Date(d.sunrise[0] + ':00' + offsetTZ()); poe = new Date(d.sunset[0] + ':00' + offsetTZ()); real = true; }
  else { const k = solCalc(hoje, p.lat, p.lng); nasce = new Date(k.nasce); poe = new Date(k.poe); }
  const luz = Math.round((poe - nasce) / 6e4), lu = lua(Date.now());
  const dCurta = (ms) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ }).format(new Date(ms));
  const tiles = [
    `<div class="alm"><span class="rot">${ic('sol')}Sol</span><strong>${hora(nasce)} <span aria-hidden="true">→</span><span class="sr-only"> a </span> ${hora(poe)}</strong><small>${Math.floor(luz / 60)}h${String(luz % 60).padStart(2, '0')} de luz · ${real ? 'previsão Open-Meteo' : 'cálculo astronômico local'}</small></div>`,
    `<div class="alm"><span class="rot">${luaSVG(lu.f, lu.nome + ', ' + Math.round(lu.ilum * 100) + '% iluminada, como se vê do hemisfério sul')}Lua</span><strong>${esc(lu.nome)}</strong><small>Cheia ${esc(dCurta(lu.cheia))} · nova ${esc(dCurta(lu.nova))}</small></div>`
  ];
  if (ALM.agua) tiles.push(`<div class="alm" id="alm-agua"><span class="rot">${ic('gota')}Água do mar</span><strong>${ALM.agua.v.toFixed(1).replace('.', ',')} °C</strong><small>Estimativa por modelo</small></div>`);
  if (d && d.uv_index_max && d.uv_index_max[0] != null) { const [n, k, rec] = uvInfo(d.uv_index_max[0]);
    tiles.push(`<div class="alm" id="alm-uv"><span class="rot">${ic('sol-forte')}UV máximo</span><strong>${Math.round(d.uv_index_max[0])} <span class="alm-uv uv-${k}">${esc(n)}</span></strong><small>${esc(rec)}</small></div>`); }
  let hojeTxt = '';
  if (ALM.mare) {
    const b = proximaBaixaClara(ALM.mare, c), r = roteiroParaMare(b);
    hojeTxt = b ? `<strong>Maré baixa com luz do dia: ${esc(quandoRel(b.t))}${b.rotQual ? ` (${esc(b.rotQual)})` : ''}.</strong>
      <p>${r ? `Combina com o roteiro <a href="#/roteiro/${esc(r.id)}">${esc(r.titulo)}</a>. ` : ''}Estimativa: confira a <a href="${TABUA}" target="_blank" rel="noopener">tábua oficial</a> antes de sair.${lu.sizigia ? ' Perto da lua cheia ou nova, as baixas descem mais: boa época para as piscinas.' : ''}</p>`
      : `<strong>Sem maré baixa com luz do dia nas próximas horas.</strong><p>${r ? `Um dia bom para <a href="#/roteiro/${esc(r.id)}">${esc(r.titulo)}</a>, que não depende da maré.` : ''}</p>`;
  }
  return `<div class="almanaque">${tiles.join('')}${hojeTxt ? `<div class="alm alm-hoje" id="alm-hoje">${hojeTxt}</div>` : ''}</div>`;
}
function preencherAlmanaque() {
  const pinta = () => { const el = document.getElementById('almanaque'); if (el) el.innerHTML = almanaqueHTML(); };
  carregarClima().then(d => { ALM.clima = d; pinta(); }).catch(() => {});
  carregarAgua().then(a => { ALM.agua = a; pinta(); }).catch(() => {});
  carregarMare().then(m => { ALM.mare = m; pinta(); }).catch(() => {});
}
/* Uma única mensagem de "sem sinal" por página: a previsão some; a maré diz para ver a tábua. */
function preencherPlanejar() {
  carregarClima().then(d => {
    const el = document.getElementById('previsao'); if (!el) return;
    el.innerHTML = d.daily.time.slice(0, 3).map((t, i) => {
      const [desc, icone] = tempoDe(d.daily.weather_code[i]);
      const dt = new Date(t + 'T12:00:00' + offsetTZ());
      return `<div class="dia-prev">${ic(icone, 'ic-lg')}<span>${i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : esc(maiuscula(diaSemana(dt)))}</span><strong>${Math.round(d.daily.temperature_2m_max[i])}°<small> / ${Math.round(d.daily.temperature_2m_min[i])}°</small></strong><span>${esc(desc)}</span><span>Chuva ${d.daily.precipitation_probability_max[i]}% · UV ${Math.round(d.daily.uv_index_max[i])}</span><span>Pôr do sol ${hora(new Date(d.daily.sunset[i] + ':00' + offsetTZ()))}</span></div>`;
    }).join('');
    const f = document.getElementById('prev-fonte'); if (f) f.innerHTML = `Fonte: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · ${hora(new Date(d._em))}`;
  }).catch(() => { const s = document.getElementById('sec-prev'); if (s) s.remove(); });
  Promise.all([carregarMare(), carregarClima().catch(() => null)]).then(([m, cl]) => desenharMare(m, cl)).catch(() => {
    const el = document.getElementById('mare'); if (el) el.innerHTML = `<p class="vazio-linha">Sem sinal agora. Veja a <a href="${TABUA}" target="_blank" rel="noopener">tábua oficial</a>.</p>`;
  });
}
function desenharMare(m, clima) {
  const el = document.getElementById('mare'); if (!el) return;
  const agora = Date.now(), ini = agora - 3 * 36e5, fim = agora + 42 * 36e5;
  const pts = m.pts.filter(p => p[0] >= ini && p[0] <= fim); if (pts.length < 6) throw 0;
  const W = Math.max(300, Math.round(el.clientWidth || 640)), H = 190, pl = 8, pr = 8, pt = 26, pb = 26;
  const vs = pts.map(p => p[1]), vmin = Math.min(...vs), vmax = Math.max(...vs), pad = (vmax - vmin) * .15 || .1;
  const x = t => pl + (t - ini) / (fim - ini) * (W - pl - pr), y = v => pt + (1 - (v - vmin + pad) / (vmax - vmin + 2 * pad)) * (H - pt - pb);
  const linha = pts.map((p, i) => (i ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1)).join(' ');
  const area = linha + ` L ${x(pts[pts.length - 1][0]).toFixed(1)} ${H - pb} L ${x(pts[0][0]).toFixed(1)} ${H - pb} Z`;
  const todas = baixasQualificadas(m, clima);
  const baixas = todas.filter(e => e.t >= ini && e.t <= fim);
  const noites = []; for (let d = ini - 864e5; d <= fim + 864e5; d += 864e5) { const a = solDe(d, clima), b = solDe(d + 864e5, clima); noites.push([Math.max(a.poe, ini), Math.min(b.nasce, fim)]); }
  const faixasNoite = noites.filter(([a, b]) => b > a).map(([a, b]) => `<rect x="${x(a).toFixed(1)}" y="${pt - 6}" width="${(x(b) - x(a)).toFixed(1)}" height="${H - pb - pt + 6}" fill="#1F3D2F" opacity=".07"/>`).join('');
  const futuras = todas.filter(b => b.t > agora - 30 * 6e4);
  const passoH = W < 520 ? 432e5 : 216e5;
  const meias = []; for (let t = Math.ceil(ini / passoH) * passoH; t <= fim; t += passoH) meias.push(t);
  el.innerHTML = `<ul class="mare-baixas" aria-label="Próximas marés baixas">${futuras.slice(0, 4).map(b => `<li class="chip ${b.claro ? 'chip-dia' : 'chip-noite'}${b.maisBaixa ? ' chip-top' : ''}">${ic(b.claro ? 'sol' : 'lua', 'ic-sm')}<span>${esc(quandoRel(b.t))}</span><em>${esc(rotBaixa(b))}</em></li>`).join('')}</ul>
  <div class="mare-grafico"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico da estimativa de maré, sem escala de altura. Próximas marés baixas: ${esc(futuras.slice(0, 4).map(b => quandoRel(b.t) + ' (' + rotBaixa(b) + ')').join('; '))}">
    ${faixasNoite}${meias.map(t => `<line x1="${x(t)}" x2="${x(t)}" y1="${pt - 6}" y2="${H - pb}" stroke="#D9CDB8" stroke-width="1"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#5C544B" font-family="Inter,sans-serif">${hora(new Date(t)).replace(':00', 'h')}</text>`).join('')}
    <path d="${area}" fill="#1B5A75" opacity=".12"/><path d="${linha}" fill="none" stroke="#1B5A75" stroke-width="2" stroke-linejoin="round"/>
    <line x1="${x(agora)}" x2="${x(agora)}" y1="${pt - 10}" y2="${H - pb}" stroke="#9A4724" stroke-width="1.5" stroke-dasharray="3 3"/><text x="${x(agora)}" y="${pt - 14}" text-anchor="middle" font-size="12" font-weight="600" fill="#9A4724" font-family="Inter,sans-serif">agora</text>
    ${baixas.map(b => `<circle cx="${x(b.t)}" cy="${y(b.v)}" r="${b.claro ? 6 : 4}" fill="${b.claro ? '#1B5A75' : '#FFFDF9'}" stroke="${b.claro ? '#FFFDF9' : '#5C544B'}" stroke-width="2"/><text x="${x(b.t)}" y="${y(b.v) + 18}" text-anchor="middle" font-size="12" font-weight="600" fill="${b.claro ? '#13455A' : '#5C544B'}" font-family="Inter,sans-serif">${hora(new Date(b.t))}</text>`).join('')}
    <circle id="mare-ponto" r="4" fill="#1E1B18" opacity="0"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" id="mare-alvo"/>
  </svg><div class="mare-dica" id="mare-dica"></div></div>
  <p class="fonte mare-legenda"><span class="leg leg-dia" aria-hidden="true"></span>com luz do dia <span class="leg leg-noite" aria-hidden="true"></span>de madrugada ou à noite · faixa sombreada = noite. Qualificação relativa entre as baixas da semana.</p>`;
  const svg = el.querySelector('svg'), alvo = el.querySelector('#mare-alvo'), dica = el.querySelector('#mare-dica'), ponto = el.querySelector('#mare-ponto');
  const mover = (ev) => {
    const r = svg.getBoundingClientRect(); const fx = (ev.clientX - r.left) / r.width * W;
    const t = ini + (fx - pl) / (W - pl - pr) * (fim - ini);
    let k = 0; pts.forEach((p, i) => { if (Math.abs(p[0] - t) < Math.abs(pts[k][0] - t)) k = i; });
    const p = pts[k], sub = pts[Math.min(k + 1, pts.length - 1)][1] > p[1];
    ponto.setAttribute('cx', x(p[0])); ponto.setAttribute('cy', y(p[1])); ponto.setAttribute('opacity', '1');
    dica.style.left = (x(p[0]) / W * 100) + '%'; dica.style.top = (y(p[1]) / H * r.height) + 'px';
    dica.textContent = `${quandoRel(p[0])} · ${sub ? 'enchendo' : 'vazando'}`; dica.style.opacity = '1';
  };
  alvo.addEventListener('pointermove', mover); alvo.addEventListener('pointerdown', mover);
  alvo.addEventListener('pointerleave', () => { dica.style.opacity = '0'; ponto.setAttribute('opacity', '0'); });
}
/* Linha "Maré de hoje" no topo de Passeios. */
function preencherMareHoje() {
  Promise.all([carregarMare(), carregarClima().catch(() => null)]).then(([m, cl]) => {
    const el = document.getElementById('mare-hoje'); if (!el) return;
    const b = proximaBaixaClara(m, cl); if (!b) return;
    el.querySelector('div').innerHTML = `<strong>Maré baixa de dia: ${esc(quandoRel(b.t))}</strong><span>${b.rotQual ? esc(maiuscula(b.rotQual)) + ' · ' : ''}estimativa, confira a tábua oficial</span>`;
  }).catch(() => {});
}

/* COMER · só existe com 3 ou mais lugares publicados. */
const TIPOS_COMER = ['Frutos do mar', 'Cozinha alagoana', 'Almoço', 'Jantar especial', 'Café e padaria', 'Para levar', 'Mercado', 'Entrega', 'Experiência privada'];
P.comer = () => {
  const base = LUG_COMER;
  const tipos = TIPOS_COMER.filter(t => base.some(l => l.tipo === t));
  const vis = estado.comer === 'todos' ? base : base.filter(l => l.tipo === estado.comer);
  const grupos = {}; vis.forEach(l => (grupos[l.tipo || 'Outros'] = grupos[l.tipo || 'Outros'] || []).push(l));
  return `
  ${cabecalho('Rota dos Milagres', 'Comer', 'Mesas, cafés e mercados da região.')}
  ${S('comer: filtros', () => tipos.length > 1 ? `<section class="sec sec-curta">${chips([['todos', 'Tudo']].concat(tipos.map(t => [t, t])), estado.comer, 'comer')}</section>` : '')}
  ${S('comer: lugares', () => TIPOS_COMER.concat(['Outros']).filter(k => grupos[k]).map(k => `
    <section class="sec" aria-label="${esc(k)}"><div class="sec-cab"><h2 class="h3">${esc(k)}</h2></div><div class="cards">${grupos[k].map(cardLugar).join('')}</div></section>`).join(''))}
  ${S('comer: o que provar', () => blocoProvar())}`;
};

/* ESTADIA · Chegar, Na casa, Sair (cada bloco só com dado). */
P.estadia = () => {
  const ch = casa.chegada, rt = rotaCasa(), fotos = (casa.fotos || []).filter(f => f && urlSegura(f.src));
  const horarios = tem(casa.checkin) || tem(casa.checkout);
  const entrar = [['Até a portaria', ch.como_chegar, 'carro'], ['Na portaria', ch.entrada, 'pessoas'], ['Chaves e acesso', ch.chaves, 'chave'], ['Estacionamento', ch.estacionamento, 'carro']].filter(([, v]) => tem(v));
  const regras = [['Regras da casa', casa.regras_casa], ['Regras do condomínio', casa.regras_condominio], ['Lixo e limpeza', casa.lixo_limpeza], ['Segurança', casa.seguranca]].filter(([, v]) => tem(v));
  const temNaCasa = tem(casa.comodidades) || tem(casa.camas) || tem(casa.ambientes) || regras.length || tem(casa.faq);
  const temSair = tem(ch.saida) || tem(ch.imprevistos) || tem(casa.checkout);
  const anc = [['chegar', 'Chegar', true], ['na-casa', 'Na casa', temNaCasa], ['sair', 'Sair', temSair], ['disponibilidade', 'Datas livres', agendaAtiva()]].filter(a => a[2]);
  const linhaHorario = (rot, v) => tem(v) ? `<li class="numero"><strong>${esc(v)}</strong><span>${rot}</span></li>` : '';
  return `
  ${cabecalho(NOME, 'Estadia', '')}
  ${anc.length > 1 ? `<nav class="ancoras" aria-label="Nesta página">${anc.map(([id, t]) => `<button type="button" class="chip" data-ir="${id}">${esc(t)}</button>`).join('')}</nav>` : ''}
  ${S('estadia: galeria', () => fotos.length ? `<section class="sec" aria-label="Fotos da casa"><div class="galeria">${fotos.slice(0, 5).map((f, i) => `<button type="button" data-foto="${i}" aria-label="Ampliar foto: ${esc(f.alt || 'foto da casa')}"><img src="${esc(urlSegura(f.src))}" alt="${esc(f.alt || '')}" loading="lazy" decoding="async"></button>`).join('')}</div></section>` : '')}
  ${S('estadia: resumo', () => { const nums = numerosCasa(); return nums || tem(casa.sobre) ? `<section class="sec resumo-casa" aria-label="A casa em resumo">${tem(casa.sobre) ? `<p class="lead">${esc(casa.sobre)}</p>` : ''}${nums}</section>` : ''; })}
  ${S('estadia: chegar', () => `<section class="sec" id="chegar" aria-labelledby="h-chegar">${secCab('h-chegar', 'Chegar')}
    <div class="grade g-5-7">
      <div class="card">
        ${horarios ? `<ul class="numeros horarios" data-n="2">${linhaHorario('Check-in', casa.checkin)}${linhaHorario('Check-out', casa.checkout)}</ul>` : ''}
        ${tem(casa.endereco_publico) ? `<p class="local-linha">${ic('pino')}<span>${esc(casa.endereco_publico)}</span></p>` : ''}
        <div class="acoes acoes-empilha">${rt ? `<a class="btn btn-prim" href="${esc(rt)}" target="_blank" rel="noopener">${ic('pino')}Como chegar</a>` : ''}${botaoWa('Avisar que estou a caminho', `Olá! Sou hóspede da ${NOME} e estou a caminho.`, 'btn-sec')}</div>
      </div>
      ${tem(ch.trajetos) ? `<ul class="linhas">${ch.trajetos.filter(t => t && tem(t.titulo)).map(t => `<li><span class="pict">${ic(ICS[t.icone] || 'pino')}</span><span class="linha-txt"><strong>${esc(t.titulo)}</strong>${tem(t.texto) ? `<span>${esc(t.texto)}</span>` : ''}</span></li>`).join('')}</ul>` : ''}
    </div>
    ${entrar.length ? `<div class="mt"><h3 class="h3">Ao chegar</h3><ul class="linhas">${entrar.map(([t, v, i]) => `<li><span class="pict">${ic(i)}</span><span class="linha-txt"><strong>${esc(t)}</strong><span class="pre">${esc(v)}</span></span></li>`).join('')}</ul></div>` : ''}
  </section>`)}
  ${S('estadia: na casa', () => temNaCasa ? `<section class="sec" id="na-casa" aria-labelledby="h-nacasa">${secCab('h-nacasa', 'Na casa')}
    <div class="grade${tem(casa.camas) ? ' g-2' : ''}">
      ${tem(casa.comodidades) ? `<ul class="linhas${tem(casa.camas) ? '' : ' c2'}">${casa.comodidades.filter(c => c && tem(c.nome)).map(c => `<li><span class="pict">${ic(ICS[c.icone] || 'check')}</span><span class="linha-txt"><strong>${esc(c.nome)}</strong>${tem(c.descricao) ? `<span>${esc(c.descricao)}</span>` : ''}</span></li>`).join('')}</ul>` : ''}
      ${tem(casa.camas) ? `<div class="card"><h3 class="h3">Camas</h3>${lista(casa.camas)}</div>` : ''}
    </div>
    ${tem(casa.ambientes) ? `<div class="mt"><h3 class="h3">Ambientes</h3><div class="cards">${casa.ambientes.filter(a => a && tem(a.nome)).map(a => `<article class="card">${midia(a.foto)}<h4 class="h3">${esc(a.nome)}</h4>${tem(a.descricao) ? `<p class="card-resumo">${esc(a.descricao)}</p>` : ''}</article>`).join('')}</div></div>` : ''}
    ${regras.length ? `<div class="mt grade g-2">${regras.map(([t, it]) => `<div class="card"><h3 class="h3">${esc(t)}</h3>${lista(it)}</div>`).join('')}</div>` : ''}
    ${tem(casa.faq) ? `<div class="mt"><h3 class="h3">Dúvidas frequentes</h3>${casa.faq.filter(q => q && tem(q.pergunta)).map(q => `<details class="faq"><summary>${esc(q.pergunta)}${ic('mais')}</summary><p>${esc(q.resposta || '')}</p></details>`).join('')}</div>` : ''}
  </section>` : '')}
  ${S('estadia: sair', () => temSair ? `<section class="sec" id="sair" aria-labelledby="h-sair">${secCab('h-sair', 'Sair')}
    <div class="grade g-2">
      ${tem(ch.saida) ? `<div class="card">${tem(casa.checkout) ? `<p class="olho">Check-out até ${esc(casa.checkout)}</p>` : ''}<ol class="passos">${ch.saida.filter(tem).map(s => `<li><span>${esc(s)}</span></li>`).join('')}</ol></div>` : tem(casa.checkout) ? `<div class="card"><ul class="numeros horarios" data-n="1">${linhaHorario('Check-out', casa.checkout)}</ul></div>` : ''}
      ${tem(ch.imprevistos) ? `<div class="card"><h3 class="h3">Atrasos e imprevistos</h3><p class="pre">${esc(ch.imprevistos)}</p></div>` : ''}
    </div></section>` : '')}
  ${S('estadia: agenda', () => blocoAgenda())}
  ${waAnfitriao() ? `<section class="sec sec-curta">${botaoWa('Tirar uma dúvida', `Olá! Estou na ${NOME} e tenho uma dúvida sobre a casa:`, 'btn-sec')}</section>` : ''}`;
};

/* AJUDA · anfitrião, emergência, saúde, antes do mar, locomoção. */
const NIVEIS = [['emergencia', 'Emergência'], ['essencial', 'Serviços essenciais'], ['conveniencia', 'Conveniência'], ['parceiro', 'Parceiros']];
const SAUDE_RE = /hospital|upa|sa[uú]de|pronto|samu|m[eé]dic|cl[ií]nica|farm/i;
/* Uma lista só "Antes do mar". O conselho de água-viva vem do conteúdo (regiao.dicas), não do código. */
const SEG_MAR = ['Respeite as bandeiras de sinalização e as orientações dos guarda-vidas, quando houver.', 'Crianças sempre acompanhadas, mesmo em águas rasas.', 'Evite o mar depois de bebida alcoólica ou de refeições pesadas.'];
const SEG_MAR_FIM = ['Emergência no mar (afogamento, embarcação à deriva): Salvamar, da Marinha, no 185.', 'A rota fica na APA Costa dos Corais: não pise nem toque nos corais, que são vivos e frágeis.', 'Não alimente peixes nem outros animais.', 'No passeio do peixe-boi, siga as orientações do guia e não tente tocar os animais.', 'Prefira jangadeiros e guias credenciados.', 'Leve de volta todo o lixo que produzir.'];
P.ajuda = () => {
  const cs = (C.contatos || []).filter(c => c && c.nome);
  const linha = (c) => {
    const t = linkTel(c.telefone), w = linkWa(c.whatsapp), em = c.nivel === 'emergencia';
    const m = String(c.obs || '').match(/^(.*?)\s*Fonte:\s*(.+)$/s);
    const obs = String(m ? m[1] : (c.obs || '')).replace(/ligue antes (\d{3})/g, 'ligue antes para o $1');
    if (em) {
      const txt = [c.categoria, c.horario].filter(tem).map(esc).join(' · ');
      return `<div class="contato emerg"><div class="contato-txt"><strong>${esc(c.nome)}</strong>${txt ? `<span>${txt}</span>` : ''}</div>
      <div class="contato-acoes">${w ? `<a class="btn-ic" href="${esc(w)}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(c.nome)}">${ic('whatsapp')}</a>` : ''}${t ? `<a class="btn btn-sec ligar" href="${esc(t)}" aria-label="Ligar para ${esc(c.nome)}, ${esc(c.telefone)}">${ic('fone')}${esc(c.telefone)}</a>` : ''}</div></div>`;
    }
    // Serviços (hospital, UPA, farmácia…): número por escrito, rota pelo endereço e a fonte.
    const endereco = tem(c.endereco) ? c.endereco : ((obs.match(/^([^.]*\d[^.]*|(?:Rua|Av\.?|Avenida|Rodovia|AL-\d+)[^.]*)\./) || [])[1] || '');
    const resto = endereco ? obs.replace(endereco + '.', '').trim() : obs;
    const r = rotaEndereco([c.nome, endereco].filter(tem).join(', '));
    const info = [tem(c.horario) ? esc(c.horario) : 'Ligue antes para confirmar o horário', c.distancia ? esc(c.distancia) : ''].filter(tem).join(' · ');
    const fonte = [tem(c.verificado) ? `Conferido pelo anfitrião em ${esc(dataBR(c.verificado))}.` : '', m ? 'Fonte: ' + esc(m[2]) : ''].filter(tem).join(' ');
    return `<div class="contato contato-servico"><div class="contato-txt"><span class="olho">${esc(c.categoria || '')}</span><strong>${esc(c.nome)}</strong>
        ${t ? `<span class="contato-num">${ic('fone', 'ic-sm')}${esc(c.telefone)}</span>` : ''}
        ${endereco ? `<span class="contato-end">${ic('pino', 'ic-sm')}${esc(endereco)}</span>` : ''}
        <span>${info}</span>${resto ? `<span>${esc(resto)}</span>` : ''}
        ${fonte ? `<span class="contato-fonte">${fonte}</span>` : ''}</div>
      <div class="contato-botoes">${t ? `<a class="btn btn-prim btn-peq" href="${esc(t)}" aria-label="Ligar para ${esc(c.nome)}, ${esc(c.telefone)}">${ic('fone', 'ic-sm')}Ligar</a>` : ''}${w ? `<a class="btn btn-sec btn-peq" href="${esc(w)}" target="_blank" rel="noopener">${ic('whatsapp', 'ic-sm')}WhatsApp</a>` : ''}${r ? `<a class="btn btn-sec btn-peq" href="${esc(r)}" target="_blank" rel="noopener">${ic('pino', 'ic-sm')}Como chegar</a>` : ''}</div></div>`;
  };
  const agua = (REG.dicas || []).find(t => tem(t) && AGUA_VIVA.test(t));
  const mar = SEG_MAR.concat(agua ? [agua] : [], SEG_MAR_FIM);
  const trajetos = tem(casa.chegada.trajetos);
  const mob = (REG.mobilidade || []).filter(t => tem(t) && !(trajetos && /aeroporto/i.test(t))); // o trajeto do aeroporto já está em Estadia › Chegar
  const wa = waAnfitriao();
  return `
  ${cabecalho('', 'Ajuda', 'Emergência, saúde e o que saber antes do mar.')}
  ${S('ajuda: anfitrião', () => `<section class="sec sec-curta"><div class="card anfitriao"><span class="pict">${ic('pessoas')}</span><span class="linha-txt"><strong>${tem(casa.anfitriao) ? esc(casa.anfitriao) : 'Anfitrião'}</strong><span>${wa ? 'Dúvidas, manutenção ou qualquer imprevisto.' : 'Fale com o anfitrião pela plataforma da reserva.'}</span></span>${botaoWa('Chamar no WhatsApp', null, 'btn-prim')}</div></section>`)}
  ${S('ajuda: contatos', () => `<section class="sec">${NIVEIS.map(([k, t]) => { const l = cs.filter(c => c.nivel === k); if (!l.length) return '';
      const tit = k === 'essencial' && l.every(c => SAUDE_RE.test(c.nome + ' ' + (c.categoria || ''))) ? 'Saúde' : t;
      return `<div class="grupo-tit"><h2 class="h3">${esc(tit)}</h2></div><div class="contatos">${l.map(linha).join('')}</div>`; }).join('')}</section>`)}
  ${S('ajuda: antes do mar', () => `<section class="sec" aria-labelledby="h-mar">${secCab('h-mar', 'Antes do mar', '', `<a class="btn-terc" href="#/passeios/mare">Maré de hoje${ic('seta')}</a>`)}<div class="card lista-2">${listaLimitada('l-mar', mar)}</div></section>`)}
  ${S('ajuda: locomoção', () => mob.length ? `<section class="sec" aria-label="Como se locomover">${mais('Como se locomover', listaLimitada('l-mob', mob))}</section>` : '')}
  ${canalFeedback() ? `<section class="sec sec-curta"><a class="btn-terc" href="#/feedback">${ic('estrela', 'ic-sm')}Contar ao anfitrião como está a estadia${ic('seta')}</a></section>` : ''}`;
};

function beneficiosAtivos() { const h = hojeISO(); return (C.beneficios || []).filter(b => b && b.ativo !== false && b.parceiro && b.titulo && (!tem(b.validade) || b.validade >= h)); }
function cardBeneficio(b) { try { return cardBeneficio_(b); } catch (e) { registrarFalha('cardBeneficio ' + (b && b.id || ''), e); return ''; } }
function cardBeneficio_(b) {
  const w = linkWa(b.whatsapp, `Olá! Sou hóspede da ${NOME} e gostaria de usar o benefício: ${b.titulo}.`), l = urlSegura(b.link);
  const dd = [['Condições', b.condicoes], ['Validade', tem(b.validade) ? 'até ' + dataBR(b.validade) : ''], ['Restrições', b.restricoes]].filter(([, v]) => tem(v));
  return `<article class="card beneficio"><span class="olho">${esc(b.parceiro)}</span><h3 class="h3">${esc(b.titulo)}</h3>${tem(b.descricao) ? `<p>${esc(b.descricao)}</p>` : ''}
    ${dd.length ? `<dl class="dados">${dd.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    ${tem(b.codigo) ? `<div class="acoes"><span class="selo">${esc(b.codigo)}</span><button type="button" class="btn btn-sec btn-peq" data-copiar="${esc(b.codigo)}">${ic('copiar', 'ic-sm')}Copiar</button></div>` : ''}
    ${w ? `<a class="btn btn-prim" href="${esc(w)}" target="_blank" rel="noopener">${ic('whatsapp')}Solicitar</a>` : l ? `<a class="btn btn-prim" href="${esc(l)}" target="_blank" rel="noopener">Usar benefício</a>` : ''}</article>`;
}
P.beneficios = () => { const b = beneficiosAtivos(); return `${cabecalho('Só para hóspedes', 'Benefícios', 'Condições combinadas com parceiros da região.')}
  ${S('benefícios: lista', () => `<section class="sec"><div class="cards">${b.map(cardBeneficio).join('')}</div></section>`)}`; };

function avaliacoesOk() { return (C.avaliacoes || []).filter(a => a && a.autorizada === true && tem(a.texto)); }
const estrelas = (n) => { n = Math.max(0, Math.min(5, Math.round(+n || 0))); return n ? `<span class="selo" role="img" aria-label="Nota ${n} de 5">${ic('estrela', 'ic-sm')}${n},0</span>` : ''; };
const cardAvaliacao = (a) => S('avaliação', () => `<figure class="card avaliacao">${estrelas(a.nota)}<blockquote class="lead">“${esc(a.texto)}”</blockquote><figcaption class="meta">${[a.autor, a.periodo, a.origem].filter(tem).map(esc).join(' · ')}</figcaption></figure>`);
P.avaliacoes = () => { const a = avaliacoesOk();
  return `${cabecalho('Quem já esteve aqui', 'Avaliações', 'Publicadas com autorização de quem escreveu.')}
  ${S('avaliações: lista', () => `<section class="sec"><div class="cards">${a.map(cardAvaliacao).join('')}</div></section>`)}`; };

const TEMAS_FB = ['Limpeza', 'Conforto', 'Cozinha', 'Internet', 'Comunicação', 'Localização', 'Passeios', 'Outro'];
P.feedback = () => `${cabecalho('Feedback', 'Sua opinião', 'Vai só para o anfitrião, em particular.')}
  <section class="sec" id="fb-area">
    <form class="card form prosa" id="form-feedback" novalidate>
      <fieldset class="campo"><legend id="leg-nota">Sua nota para a experiência</legend>
        <div class="notas" role="radiogroup" aria-labelledby="leg-nota" aria-describedby="erro-nota">${[[1, 'Ruim'], [2, 'Fraca'], [3, 'Ok'], [4, 'Boa'], [5, 'Ótima']].map(([n, r]) => `<input type="radio" name="nota" id="nota${n}" value="${n}"><label for="nota${n}">${n}<small>${r}</small></label>`).join('')}</div>
        <span class="erro" id="erro-nota" aria-live="polite" hidden>Escolha uma nota de 1 a 5.</span></fieldset>
      <fieldset class="campo"><legend>É sobre o quê? <span class="mudo">(opcional)</span></legend>
        <div class="opcoes">${TEMAS_FB.map((t, i) => `<input type="checkbox" name="tema" id="tema${i}" value="${t}"><label for="tema${i}">${t}</label>`).join('')}</div></fieldset>
      <div class="campo"><label for="fb-msg">Mensagem</label><textarea id="fb-msg" name="mensagem" maxlength="1500" aria-describedby="fb-ajuda erro-msg" required></textarea>
        <span class="ajuda" id="fb-ajuda">O que funcionou, o que podemos melhorar ou o que precisa de atenção.</span><span class="erro" id="erro-msg" aria-live="polite" hidden>Escreva pelo menos 10 caracteres.</span></div>
      <div class="campo"><label for="fb-nome">Seu nome <span class="mudo">(opcional)</span></label><input type="text" id="fb-nome" name="nome" maxlength="60" autocomplete="given-name"></div>
      <div class="check"><input type="checkbox" id="fb-pub" name="publicar"><label for="fb-pub">Autorizo publicar meu comentário como avaliação no guia, apenas com meu primeiro nome.</label></div>
      <input class="mel" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
      <div><button type="submit" class="btn btn-prim">${ic('enviar')}Enviar</button></div>
      <p class="fonte">${tem(CFG.feedback_endpoint) ? 'Fica numa planilha privada do anfitrião (Google), por até 2 anos.' : 'Vai pelo WhatsApp, direto para o anfitrião.'} Só publicamos seu comentário se você marcar a autorização. Para apagar o que escreveu, é só pedir ${waAnfitriao() ? 'pelo WhatsApp' : 'pelo mesmo canal da reserva'}. <a href="#/privacidade">Privacidade</a>.</p>
    </form></section>`;

/* ---------- Meu roteiro ("Meus dias", rebaixado: link no fim de Passeios) ---------- */
let MR_RECEBIDO = null;
let MR_MARE = null;
P['meu-roteiro'] = () => {
  const qs = new URLSearchParams((location.hash.split('?')[1]) || '');
  if (qs.get('r')) { MR_RECEBIDO = mrDecodificar(qs.get('r')); history.replaceState(history.state, '', '#/meu-roteiro'); ultimoHash = '#/meu-roteiro'; }
  const recebido = MR_RECEBIDO;
  const r = recebido ? { ini: recebido.ini, dias: recebido.dias.map(d => d.filter(mrItem)), daEstadia: false } : mrNormalizar(mrLer());
  const e = estadia(), total = r.dias.reduce((a, d) => a + d.length, 0);
  const opcoes = `<option value="">Escolher roteiro ou lugar…</option><optgroup label="Roteiros">${ROTEIROS.map(x => `<option value="r:${esc(x.id)}">${esc(x.titulo)}</option>`).join('')}</optgroup>`
    + ['explorar', 'comer'].map(g => { const ls = LUGARES.filter(l => catDe(l).grupo === g); return ls.length ? `<optgroup label="${g === 'comer' ? 'Comer' : 'Lugares'}">${ls.map(l => `<option value="l:${esc(l.id)}">${esc(l.nome)}</option>`).join('')}</optgroup>` : ''; }).join('');
  const mareDia = (i) => {
    if (!r.ini || !MR_MARE) return '';
    const dia = somaDias(r.ini, i), bs = baixasQualificadas(MR_MARE.m, MR_MARE.c).filter(b => diaISO(b.t) === dia && b.claro);
    const fora = MR_MARE.m.pts.length && dia > diaISO(MR_MARE.m.pts[MR_MARE.m.pts.length - 1][0]);
    if (fora || dia < hojeISO()) return '';
    return bs.length ? `Maré baixa de dia: ${bs.map(b => hora(new Date(b.t)) + (b.rotQual ? ' (' + b.rotQual + ')' : '')).join(' e ')}` : 'Sem maré baixa com luz do dia nesse dia';
  };
  const dias = r.dias.map((d, i) => {
    const mt = mareDia(i), temMare = d.some(c => (mrItem(c) || {}).mare);
    return `<article class="mr-dia" aria-labelledby="mr-d${i}"><div class="mr-dia-cab"><span class="n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h2 class="h3" id="mr-d${i}">${r.ini ? esc(maiuscula(dataLonga(somaDias(r.ini, i)))) : 'Dia ' + (i + 1)}</h2>${e && i === 0 ? '<small>chegada</small>' : e && i === r.dias.length - 1 ? '<small>check-out</small>' : ''}</div>
      ${d.length ? `<ol class="mr-itens">${d.map((c, k) => { const it = mrItem(c);
        return `<li class="mr-item"><span class="pict">${ic(it.ic)}</span><span class="mr-item-txt">${it.href ? `<a href="${esc(it.href)}">${esc(it.nome)}</a>` : `<button type="button" data-abrir="${esc(it.abrir)}">${esc(it.nome)}</button>`}<small>${esc(it.sub)}</small>${it.mare && temMare && mt ? `<small class="mare-av">${esc(mt)} · confira a tábua</small>` : it.mare ? '<small class="mare-av">Depende da maré baixa</small>' : ''}</span>
          ${recebido ? '' : `<span class="mr-mover no-print"><button type="button" data-mr="cima" data-d="${i}" data-k="${k}" aria-label="Subir ${esc(it.nome)}"${k === 0 && i === 0 ? ' disabled' : ''}>${ic('cima', 'ic-sm')}</button><button type="button" data-mr="baixo" data-d="${i}" data-k="${k}" aria-label="Descer ${esc(it.nome)}"${k === d.length - 1 && i === r.dias.length - 1 ? ' disabled' : ''}>${ic('baixo', 'ic-sm')}</button><button type="button" data-mr="tirar" data-d="${i}" data-k="${k}" aria-label="Tirar ${esc(it.nome)} do roteiro">${ic('x', 'ic-sm')}</button></span>`}</li>`; }).join('')}</ol>`
      : `<p class="mr-vazio">Dia livre${i === 0 && e ? ': chegada e descanso' : ''}.</p>`}
      ${recebido ? '' : `<div class="mr-add no-print"><label class="sr-only" for="mr-sel${i}">Adicionar ao dia ${i + 1}</label><select id="mr-sel${i}" data-mr-sel="${i}">${opcoes}</select><button type="button" class="btn btn-sec btn-peq" data-mr="add" data-d="${i}">${ic('mais', 'ic-sm')}Adicionar</button></div>`}
    </article>`;
  }).join('');
  return `
  <div class="mr-impresso" aria-hidden="true">${window.Marca ? Marca.horizontal({ tema: 'claro', titulo: '' }) : ''}<span>Roteiro${e ? ' de ' + esc(e.primeiro) : ''} · ${esc(urlGuia().replace(/^https?:\/\//, ''))}</span></div>
  ${cabecalho('Passeios', recebido ? 'Roteiro recebido' : 'Meus dias', recebido ? 'Guarde no seu aparelho para editar.' : 'Fica salvo só neste aparelho.', ['#/passeios', 'Passeios'])}
  ${recebido ? `<section class="sec sec-curta"><div class="aviso">${ic('link')}<span>Roteiro recebido por link${recebido.ini ? ', a partir de ' + esc(dataLonga(recebido.ini)) : ''}. ${total} ${total === 1 ? 'item' : 'itens'}.</span></div><div class="acoes mt"><button type="button" class="btn btn-prim" data-mr="salvar-recebido">${ic('check')}Guardar no meu aparelho</button><button type="button" class="btn btn-sec" data-mr="descartar">Ver os meus dias</button></div></section>` : `
  <section class="sec sec-curta no-print"><div class="card mr-config">
    ${e ? `<p>Os dias seguem a sua estadia: ${esc(dataLonga(e.in))} a ${esc(dataLonga(e.out))}.</p>`
      : `<div class="campo"><label for="mr-ini">Primeiro dia (opcional)</label><input type="text" data-cal="unico" id="mr-ini" value="${esc(r.ini)}" placeholder="Escolha a data"></div>
         <div class="acoes"><button type="button" class="btn btn-sec btn-peq" data-mr="mais-dia"${r.dias.length >= 14 ? ' disabled' : ''}>${ic('mais', 'ic-sm')}Mais um dia</button><button type="button" class="btn btn-sec btn-peq" data-mr="menos-dia"${r.dias.length <= 1 ? ' disabled' : ''}>Menos um dia</button></div>`}
  </div></section>`}
  <section class="sec sec-curta"><div class="mr-dias">${dias}</div></section>
  ${recebido ? '' : `<section class="sec sec-curta no-print"><div class="acoes">
    <button type="button" class="btn btn-prim" data-mr="compartilhar"${total ? '' : ' disabled'}>${ic('compartilhar', 'ic-sm')}Compartilhar</button>
    <button type="button" class="btn btn-sec" data-mr="imprimir"${total ? '' : ' disabled'}>${ic('imprimir', 'ic-sm')}Imprimir</button>
    ${r.ini ? `<button type="button" class="btn btn-sec" data-mr="ics"${total ? '' : ' disabled'}>${ic('calendario', 'ic-sm')}Adicionar ao calendário</button>` : ''}
    <button type="button" class="btn-texto" data-mr="limpar"${total ? '' : ' hidden'}>Apagar tudo</button></div>
    <p class="fonte mt">O link leva só os itens escolhidos e as datas, nunca o seu nome.</p></section>`}`;
};
function mrAcao(acao, el) {
  const salvo = mrNormalizar(mrLer()), r = { ini: salvo.ini, dias: salvo.dias.map(d => d.slice()) };
  const d = +el.dataset.d, k = +el.dataset.k;
  const gravar = () => { LS.gravar('guia:roteiro', { ini: r.ini, dias: r.dias }); const y = window.scrollY; render('filtro'); window.scrollTo(0, y); };
  if (acao === 'add') { const sel = document.querySelector(`[data-mr-sel="${d}"]`); if (!sel || !sel.value) { toast('Escolha um roteiro ou lugar na lista'); if (sel) sel.focus(); return; } if (!r.dias[d].includes(sel.value)) r.dias[d].push(sel.value); gravar(); const b = document.querySelector(`[data-mr-sel="${d}"]`); if (b) b.focus(); return; }
  if (acao === 'tirar') { r.dias[d].splice(k, 1); return gravar(); }
  if (acao === 'cima' || acao === 'baixo') {
    const [it] = r.dias[d].splice(k, 1);
    if (acao === 'cima') { if (k > 0) r.dias[d].splice(k - 1, 0, it); else r.dias[d - 1].push(it); }
    else { if (k < r.dias[d].length) r.dias[d].splice(k + 1, 0, it); else r.dias[d + 1].unshift(it); }
    return gravar();
  }
  if (acao === 'mais-dia') { r.dias.push([]); return gravar(); }
  if (acao === 'menos-dia') { const ult = r.dias[r.dias.length - 1]; if (ult.length && !confirm('O último dia tem itens. Tirar mesmo assim?')) return; r.dias.pop(); return gravar(); }
  if (acao === 'limpar') { if (!confirm('Apagar todos os seus dias deste aparelho?')) return; LS.apagar('guia:roteiro'); return gravar(); }
  if (acao === 'imprimir') return window.print();
  if (acao === 'compartilhar') {
    const url = urlGuia() + '#/meu-roteiro?r=' + mrCodificar(r);
    const dados = { title: 'Roteiro na Rota dos Milagres', text: `Roteiro de ${r.dias.length} dias montado no guia da ${NOME}`, url };
    if (navigator.share) navigator.share(dados).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link copiado')).catch(() => toast(url)); else toast(url);
    window.__ultimoLinkRoteiro = url; return;
  }
  if (acao === 'ics') {
    const ev = r.dias.map((dd, i) => dd.length ? { data: somaDias(r.ini, i), titulo: `Dia ${i + 1} · ${dd.map(c => mrItem(c).nome).join(' + ')}`.slice(0, 140), url: urlGuia() + '#/meu-roteiro',
      descricao: dd.map(c => { const it = mrItem(c); return '• ' + it.nome + (it.mare ? ' (depende da maré baixa: confira a tábua)' : ''); }).join('\n') } : null).filter(Boolean);
    return baixarICS('meu-roteiro-casa-18-anahi.ics', ev);
  }
  if (acao === 'salvar-recebido') {
    const atual = mrLer(), tem_ = atual.dias.some(x => x.length);
    if (tem_ && !confirm('Substituir os dias que já estão neste aparelho?')) return;
    LS.gravar('guia:roteiro', { ini: MR_RECEBIDO.ini, dias: MR_RECEBIDO.dias }); MR_RECEBIDO = null; toast('Roteiro guardado neste aparelho'); return render('nav');
  }
  if (acao === 'descartar') { MR_RECEBIDO = null; return render('nav'); }
}
function preencherMeuRoteiro() {
  if (MR_MARE) return;
  Promise.all([carregarMare(), carregarClima().catch(() => null)]).then(([m, c]) => { MR_MARE = { m, c }; if (rotaAtual().r === 'meu-roteiro') { const y = window.scrollY; render('filtro'); window.scrollTo(0, y); } }).catch(() => {});
}

/* ---------- Disponibilidade e privacidade ---------- */
P.disponibilidade = () => `${cabecalho('Disponibilidade', 'Datas livres', 'Calendário espelhado do anúncio. Dias riscados já estão reservados.')}${S('disponibilidade: agenda', () => blocoAgenda(true))}`;
P.privacidade = () => {
  const wa = waAnfitriao(), quem = tem(casa.anfitriao) ? esc(casa.anfitriao) : 'o anfitrião da casa';
  const guardados = CHAVES_HOSPEDE.filter(temGuardado).length;
  return `${cabecalho('Privacidade', 'Seus dados', 'Sem cadastro, sem rastreamento e sem cookies de publicidade.')}
  <section class="sec"><div class="card prosa">
    <h2 class="h3">No seu celular</h2>
    <p>Se você abriu o link personalizado, seu primeiro nome e as datas da estadia ficam só neste aparelho, para a saudação e os lembretes. O mesmo vale para a lista do que levar, os seus dias, a letra maior e o aviso de instalação. O nome e as datas da estadia se apagam sozinhos dois dias depois do check-out. O resto fica até você apagar.</p>
    <div class="acoes"><button type="button" class="btn btn-prim" data-limpar-tudo>${ic('lixo', 'ic-sm')}Limpar meus dados</button><span class="fonte" data-guardados>${guardados ? guardados + (guardados === 1 ? ' item guardado' : ' itens guardados') + ' neste aparelho' : 'Nada guardado neste aparelho'}</span></div>
    <h2 class="h3 mt">Serviços usados</h2>
    <p>Previsão do tempo, maré e temperatura da água (Open-Meteo) e mapa (OpenStreetMap). Eles recebem o endereço de internet do aparelho, como qualquer site. Seu nome nunca é enviado a esses serviços.</p>
    ${canalFeedback() ? `<h2 class="h3 mt">Feedback</h2><p>${tem(CFG.feedback_endpoint) ? 'Fica numa planilha privada do anfitrião (Google), por até 2 anos.' : 'Vai pelo WhatsApp, direto para o anfitrião.'} Responsável: ${quem}${wa ? ', pelo <a href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : ''}. Para pedir a exclusão do que escreveu, é só falar com ele.</p>` : ''}
  </div></section>`;
};

/* ---------- ficha do lugar ---------- */
let ultimoFoco = null;
let porHist = false;
function abrirLugar(id, modo) {
  try { abrirLugar_(id, modo); } catch (e) { registrarFalha('ficha do lugar ' + id, e); toast('Não foi possível abrir este lugar agora.'); }
}
function abrirLugar_(id, modo) {
  const l = POR_ID[id]; if (!l) return;
  const c = catDe(l), tel = linkTel(l.telefone), wa = linkWa(l.whatsapp, `Olá! Sou hóspede da ${NOME} e vi vocês no guia da casa.`);
  const site = urlSegura(l.link), card = urlSegura(l.link_cardapio), r = rota(l), comer = c.grupo === 'comer';
  const d = document.getElementById('folha');
  const dados = [['Onde', l.area || l.endereco], comer ? ['Horário', l.horario] : ['Duração', l.duracao], ['Faixa de preço', l.preco], comer ? null : ['Melhor momento', l.melhor_periodo], l.distancia ? ['Distância', l.distancia] : null].filter(Boolean).filter(([, v]) => tem(v));
  const sl = selos(l);
  const fonte = [tem(l.verificado) ? 'Conferido pelo anfitrião em ' + esc(dataBR(l.verificado)) + '.' : '', l.fonte && urlSegura(l.fonte.url) ? 'Fonte: ' + fonteLink(l.fonte) + '.' : ''].filter(tem).join(' ');
  d.innerHTML = `
    <div class="folha-topo"><button type="button" class="btn-ic" data-fechar aria-label="Fechar">${ic('x')}</button></div>
    ${midia(l.foto, '', 'capa-folha')}
    <div class="folha-corpo">
      <div><span class="olho">${esc(c.rot)}${l.tipo ? ' · ' + esc(l.tipo) : ''}</span><h2 id="folha-titulo" class="h2">${esc(l.nome)}</h2></div>
      ${sl ? `<div class="selos">${sl}</div>` : ''}
      <p>${tem(l.descricao) ? esc(l.descricao) : esc(l.resumo || '')}</p>
      ${tem(l.dica) ? `<div class="dica">${ic('estrela')}<span><strong>${tem(l.verificado) ? 'Dica do anfitrião' : 'Dica'}</strong>${esc(l.dica)}</span></div>` : ''}
      ${dados.length ? `<dl class="dados">${dados.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${tem(l.bom_saber) ? `<div><h3 class="h3">Bom saber</h3>${lista(l.bom_saber.slice(0, 3))}</div>` : ''}
      ${l.depende_mare ? `<a class="aviso" href="#/passeios/mare">${ic('ondas')}<span>Depende da maré baixa. Veja a estimativa de hoje.</span></a>` : ''}
      ${l.patrocinado ? '<p class="fonte">Recomendação patrocinada: este parceiro remunera a divulgação.</p>' : ''}
      <div class="acoes">
        ${r ? `<a class="btn btn-prim" href="${esc(r)}" target="_blank" rel="noopener">${ic('pino')}Como chegar</a>` : ''}
        ${wa ? `<a class="btn btn-sec" href="${esc(wa)}" target="_blank" rel="noopener">${ic('whatsapp')}WhatsApp</a>` : ''}
        ${tel ? `<a class="btn btn-sec" href="${esc(tel)}">${ic('fone')}Ligar</a>` : ''}
        ${card ? `<a class="btn btn-sec" href="${esc(card)}" target="_blank" rel="noopener">Cardápio</a>` : ''}
        ${site ? `<a class="btn btn-sec" href="${esc(site)}" target="_blank" rel="noopener">${comer ? 'Site' : 'Reservar'}</a>` : ''}
        <button type="button" class="btn btn-sec" data-compartilhar="${esc(l.id)}">${ic('compartilhar')}Compartilhar</button>
      </div>
      ${fonte ? `<p class="fonte">${fonte}</p>` : ''}
    </div>`;
  ultimoFoco = document.activeElement;
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  const fx = d.querySelector('[data-fechar]'); if (fx) fx.focus();
  if (modo !== true) {
    const url = caminhoDe(location.hash) + '?lugar=' + encodeURIComponent(id);
    if (modo === 'substituir' || (history.state && history.state.folha)) history.replaceState({ folha: id }, '', url);
    else history.pushState({ folha: id }, '', url);
  }
}

/* ---------- mapa ---------- */
let leafletP = null, mapa = null;
function carregarLeaflet() {
  if (window.L) return Promise.resolve();
  if (!leafletP) leafletP = new Promise((ok, falha) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    s.onload = ok; s.onerror = () => { leafletP = null; falha(); }; document.head.appendChild(s);
  });
  return leafletP;
}
function montarMapa(itens) {
  const el = document.getElementById('mapa'); if (!el) return;
  if (mapa) { mapa.remove(); mapa = null; }
  el.innerHTML = `<div class="mapa-msg">${ic('pino', 'ic-lg')}Carregando mapa…</div>`;
  carregarLeaflet().then(() => {
    if (!document.body.contains(el)) return;
    el.innerHTML = '';
    const c = REG.centro || { lat: -9.2378, lng: -35.4928 };
    const m = L.map(el, { scrollWheelZoom: false }).setView([c.lat, c.lng], 11); mapa = m;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, crossOrigin: true, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
    const icone = (k, aprox) => L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -32], html: `<div class="marcador m-${k.tom || 'neutro'} ${aprox ? 'aprox' : ''}"><svg viewBox="0 0 24 24"><use href="#i-${k.ic}"/></svg></div>` });
    const pts = [];
    (REG.cidades || []).forEach(cd => { L.marker([cd.lat, cd.lng], { icon: L.divIcon({ className: 'rotulo-cidade', html: esc(cd.nome), iconSize: [160, 16], iconAnchor: [80, -8] }), interactive: false, keyboard: false }).addTo(m); pts.push([cd.lat, cd.lng]); });
    if (casa.coordenadas && casa.coordenadas.lat != null) { const p = [casa.coordenadas.lat, casa.coordenadas.lng]; pts.push(p); L.marker(p, { icon: icone(CAT.casa), title: NOME, zIndexOffset: 1000 }).addTo(m).bindPopup(`<span class="pop-nome">${esc(NOME)}</span>Sua casa`); }
    itens.filter(l => l.lat != null && l.lng != null).forEach(l => {
      const k = catDe(l), p = [l.lat, l.lng]; pts.push(p); const r = rota(l);
      L.marker(p, { icon: icone(k, l.precisao === 'aproximada'), title: l.nome }).addTo(m).bindPopup(`<span class="pop-nome">${esc(l.nome)}</span>${esc(k.rot)}${l.precisao === 'aproximada' ? ' · local aproximado' : ''}<div class="pop-acoes"><button type="button" data-abrir="${esc(l.id)}">Detalhes</button>${r ? `<a href="${esc(r)}" target="_blank" rel="noopener">Rota</a>` : ''}</div>`);
    });
    m.on('popupopen', (ev) => { const b = ev.popup.getElement && ev.popup.getElement().querySelector('[data-abrir]'); if (b) b.addEventListener('click', () => { m.closePopup(); abrirLugar(b.getAttribute('data-abrir')); }); });
    if (pts.length > 1) m.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
  }).catch(() => { el.innerHTML = `<div class="mapa-msg">${ic('pino', 'ic-lg')}O mapa não abriu agora.<span class="mudo">A lista abaixo tem todos os lugares.</span></div>`; });
}

/* ---------- busca ---------- */
function paginasBusca() {
  const p = [['Estadia', '#/estadia', 'casa estadia comodidades regras wifi internet cozinha toalha', 'casa'], ['Chegada e saída', '#/estadia?ir=chegar', 'chegada check-in checkout chave portaria estacionamento endereço como chegar', 'pino'], ['Maré e tempo', '#/passeios/mare', 'mare tabua previsao chuva sol por do sol piscinas', 'ondas'], ['Ajuda e contatos', '#/ajuda', 'emergencia urgencia samu bombeiros policia farmacia remedio hospital medico febre pronto-socorro pronto socorro upa pediatra crianca doente saude acidente', 'fone', 1],
    comerAtivo() ? ['Comer', '#/comer', 'restaurante comida almoco jantar tapioca peixe', 'garfo'] : (PROVAR.length ? ['O que provar', '#/passeios?ir=provar', 'comida almoco jantar tapioca peixe sururu provar', 'garfo'] : null),
    ['Mapa', '#/passeios/mapa', 'mapa localizacao rota', 'pino'], canalFeedback() ? ['Feedback', '#/feedback', 'avaliar opiniao reclamacao sugestao', 'estrela'] : null, ['Meu roteiro', '#/meu-roteiro', 'meu roteiro meus dias planejar agenda imprimir compartilhar', 'lista'], LEVAR().length ? ['O que levar para a praia', '#/passeios/mare?ir=levar', 'levar mala bolsa praia checklist protetor sapatilha oculos', 'sacola'] : null, ['Sol, lua, água e UV', '#/passeios/mare', 'lua fase cheia nova nascer sol por do sol agua temperatura mar uv indice protetor almanaque', 'sol'], ['Privacidade', '#/privacidade', 'privacidade dados lgpd apagar limpar', 'escudo'], ['Área do anfitrião', 'admin/', 'anfitriao admin painel proprietario', 'cadeado']];
  return p.filter(Boolean);
}
function indiceBusca() {
  const it = [];
  const cada = (onde, lst, f) => (lst || []).forEach(x => tenta('busca: ' + onde, () => f(x)));
  cada('lugares', LUGARES, l => it.push({ t: l.nome, s: [catDe(l).rot, l.area].filter(tem).join(' · '), txt: [l.nome, l.resumo, l.descricao, l.area, (l.tags || []).join(' '), catDe(l).rot].join(' '), ic: catDe(l).ic, abrir: l.id }));
  cada('roteiros', ROTEIROS, r => it.push({ t: r.titulo, s: 'Roteiro · ' + (r.quando || ''), txt: [r.titulo, r.subtitulo, (r.paradas || []).map(p => p.titulo + ' ' + p.texto).join(' ')].join(' '), ic: 'bussola', href: '#/roteiro/' + r.id }));
  cada('faq', casa.faq, q => it.push({ t: q.pergunta, s: 'Dúvida frequente', txt: q.pergunta + ' ' + q.resposta, ic: 'ajuda', href: '#/estadia?ir=na-casa' }));
  const SAUDE = 'saude medico febre doente crianca pediatra pronto-socorro pronto socorro urgencia hospital remedio farmacia acidente';
  cada('contatos', (C.contatos || []).filter(c => c && c.nome), c => { const med = /samu|hospital|upa|pronto|sa[uú]de|m[eé]dic|farm/i.test(c.nome + ' ' + (c.categoria || ''));
    it.push({ t: c.nome, s: (c.categoria || '') + (c.telefone ? ' · ' + c.telefone : ''), txt: [c.nome, c.categoria, med ? SAUDE : ''].join(' '), ic: 'fone', href: '#/ajuda', pr: med ? 1 : 0 }); });
  if (agendaAtiva()) it.push({ t: 'Disponibilidade e reserva', s: 'Página', txt: 'Disponibilidade e reserva datas livres calendario agenda reservar airbnb', ic: 'calendario', href: '#/disponibilidade', pr: 0 });
  paginasBusca().forEach(([t, h, k, i, pr]) => it.push({ t, s: 'Página', txt: t + ' ' + k, ic: i, href: h, pr: pr || 0 }));
  return it.map(x => Object.assign(x, { n: normal(x.txt) }));
}
let IDX = null;
function abrirBusca() {
  const d = document.getElementById('busca'); IDX = IDX || tenta('índice da busca', indiceBusca) || [];
  d.innerHTML = `<div class="busca-cab">${ic('lupa')}<label for="q" class="sr-only">Buscar no guia</label><input id="q" type="search" placeholder="Praia, passeio, contato…" autocomplete="off"><button type="button" class="btn-ic" data-fechar-busca aria-label="Fechar busca">${ic('x')}</button></div><div class="busca-res" id="busca-res" role="list" aria-live="polite"></div>`;
  const q = d.querySelector('#q'), res = d.querySelector('#busca-res');
  const sug = ['piscinas', 'peixe-boi', 'patacho', 'maré', 'farmácia', 'check-out'];
  const pintar = () => {
    const v = normal(q.value.trim());
    if (!v) { res.innerHTML = `<div class="busca-sug">${sug.map(s => `<button type="button" class="chip" data-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>`; return; }
    const termos = v.split(/\s+/);
    const achados = IDX.map(x => ({ x, p: termos.every(t => x.n.includes(t)) ? (normal(x.t).includes(v) ? 2 : 1) + (x.pr || 0) * 0.5 : 0 })).filter(o => o.p).sort((a, b) => b.p - a.p).slice(0, 12);
    const marca = (s) => { let h = esc(s); termos.forEach(t => { if (t.length < 2) return; const i = normal(s).indexOf(t); if (i >= 0) h = esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + t.length)) + '</mark>' + esc(s.slice(i + t.length)); }); return h; };
    res.innerHTML = achados.length ? achados.map(({ x }) => {
      const corpo = `<span class="pict">${ic(x.ic)}</span><span><strong>${marca(x.t)}</strong><span>${esc(x.s)}</span></span>`;
      return x.abrir ? `<button type="button" class="res" role="listitem" data-abrir-busca="${esc(x.abrir)}">${corpo}</button>` : `<a class="res" role="listitem" href="${esc(x.href)}">${corpo}</a>`;
    }).join('') : `<p class="busca-vazio">Nada encontrado para “${esc(q.value)}”.</p>`;
  };
  q.addEventListener('input', pintar); pintar();
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); d.close(); } });
  d.onclick = (e) => {
    const s = e.target.closest('[data-sug]'); if (s) { q.value = s.dataset.sug; pintar(); q.focus(); return; }
    const a = e.target.closest('[data-abrir-busca]'); if (a) { buscaDestino = { lugar: a.dataset.abrirBusca }; d.close(); return; }
    const lk = e.target.closest('a.res'); if (lk) { e.preventDefault(); buscaDestino = { href: lk.getAttribute('href') }; d.close(); return; }
    if (e.target.closest('[data-fechar-busca]') || e.target === d) d.close();
  };
  d.showModal(); q.focus();
  history.pushState({ busca: 1 }, '', location.href);
}

/* ---------- feedback: envio ---------- */
function enviarFeedback(f) {
  const nota = f.querySelector('input[name=nota]:checked'), msg = f.querySelector('#fb-msg');
  const eN = f.querySelector('#erro-nota'), eM = f.querySelector('#erro-msg');
  const txt = msg.value.trim(); let ok = true;
  eN.hidden = !!nota; if (!nota) ok = false;
  eM.hidden = txt.length >= 10; msg.setAttribute('aria-invalid', String(txt.length < 10)); if (txt.length < 10) ok = false;
  if (!ok) { (nota ? msg : f.querySelector('#nota1')).focus(); return; }
  const mel = f.querySelector('.mel').value; // armadilha para robôs: vai junto ao servidor, que rejeita quando vem preenchida
  const dados = { data: new Date().toISOString(), nota: +nota.value, temas: [...f.querySelectorAll('input[name=tema]:checked')].map(i => i.value), mensagem: txt, nome: f.querySelector('#fb-nome').value.trim(), publicar: f.querySelector('#fb-pub').checked, casa: NOME, site: mel };
  const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Enviando…';
  const textoWa = `Feedback · ${NOME}\nNota: ${dados.nota}/5${dados.temas.length ? '\nTemas: ' + dados.temas.join(', ') : ''}\n\n${txt}${dados.nome ? '\n\n— ' + dados.nome : ''}${dados.publicar ? '\n(Autorizo publicar)' : ''}`;
  const fim = (viaWa) => {
    const urgente = dados.nota <= 3, wa = linkWa(casa.whatsapp, textoWa);
    const texto = viaWa ? 'Abrimos o WhatsApp com sua mensagem pronta: é só tocar em enviar.'
      : 'Sua mensagem foi enviada. Daqui não conseguimos confirmar a entrega' + (wa ? ', então, se for importante, mande também pelo WhatsApp.' : '. Se precisar de resposta rápida, use os contatos da página Ajuda.');
    const acao = !viaWa && wa ? `<a class="btn ${urgente ? 'btn-prim' : 'btn-sec'}" href="${esc(wa)}" target="_blank" rel="noopener">${ic('whatsapp')}Enviar também pelo WhatsApp</a>`
      : viaWa && urgente ? botaoWa('Falar com o anfitrião agora', 'Olá! Acabei de enviar um feedback e gostaria de conversar.', 'btn-prim')
      : !wa ? '<a class="btn btn-sec" href="#/ajuda">Contatos e ajuda</a>' : '';
    document.getElementById('fb-area').innerHTML = `<div class="card obrigado prosa" role="status"><h2 class="h2">Obrigado${dados.nome ? ', ' + esc(dados.nome.split(' ')[0]) : ''}</h2><p class="lead">${texto}</p><div class="acoes">${acao}<a class="btn btn-sec" href="#/inicio">Voltar ao início</a></div></div>`;
  };
  const viaWhats = () => {
    const u = linkWa(casa.whatsapp, textoWa); if (u) { window.open(u, '_blank', 'noopener'); fim(true); } else { toast('Não foi possível enviar agora. Tente de novo em instantes.'); btn.disabled = false; btn.innerHTML = ic('enviar') + 'Enviar'; }
  };
  const ep = urlSegura(CFG.feedback_endpoint);
  if (ep) {
    fetch(ep, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dados) })
      .then(() => fim(false)).catch(viaWhats);
  } else if (mel) fim(false); else viaWhats();
}

/* ---------- roteador ----------
   Rotas novas: inicio · estadia · passeios[/mare|/mapa] · comer · ajuda · roteiro/:id · meu-roteiro · privacidade
   (+ disponibilidade, beneficios, avaliacoes e feedback só quando há dado ou canal).
   As antigas continuam valendo: o endereço é trocado sem criar entrada no histórico. */
const TITULOS = { inicio: 'Hoje', estadia: 'Estadia', passeios: 'Passeios', comer: 'Comer', ajuda: 'Ajuda', roteiro: 'Roteiro', 'meu-roteiro': 'Meus dias', privacidade: 'Privacidade', disponibilidade: 'Disponibilidade', beneficios: 'Benefícios', avaliacoes: 'Avaliações', feedback: 'Feedback' };
const NAV_DE = { roteiro: 'passeios', 'meu-roteiro': 'passeios', disponibilidade: 'estadia', privacidade: 'ajuda', feedback: 'ajuda', beneficios: 'inicio', avaliacoes: 'inicio' };
let ultimoCaminho = '', ultimoHash = '#/inicio';
const caminhoDe = (h) => { const c = String(h || '').split('?')[0]; return /^#\/lugar\//.test(c) ? '#/passeios' : (c || '#/inicio'); };
/* Decide a rota e, se o endereço for antigo ou a página não tiver dado, para onde ele leva. */
function rotaAtual() {
  const h = location.hash.replace(/^#\/?/, ''); const [caminho, qs] = h.split('?'); const partes = caminho.split('/');
  let r = partes[0] || 'inicio', arg = partes[1] ? decodeURIComponent(partes[1]) : null;
  const params = new URLSearchParams(qs || '');
  let novo = null; // [rota, arg, ir]
  if (r === 'lugar' && arg) return { r: 'passeios', arg: null, lugar: arg };
  if (r === 'hoje') novo = ['inicio'];
  else if (r === 'casa') novo = ['estadia'];
  else if (r === 'chegada') novo = ['estadia', null, 'chegar'];
  else if (r === 'explorar') novo = ['passeios'];
  else if (r === 'planejar') novo = ['passeios', 'mare'];
  else if (r === 'mapa') novo = ['passeios', 'mapa'];
  else if (r === 'comer' && !comerAtivo()) novo = ['passeios', null, PROVAR.length ? 'provar' : null];
  else if (r === 'disponibilidade' && !agendaAtiva()) novo = ['inicio'];
  else if (r === 'beneficios' && !beneficiosAtivos().length) novo = ['inicio'];
  else if (r === 'avaliacoes' && !avaliacoesOk().length) novo = ['inicio'];
  else if (r === 'feedback' && !canalFeedback()) novo = ['ajuda'];
  else if (!P[r]) novo = ['inicio'];
  if (novo) {
    r = novo[0]; arg = novo[1] || null;
    if (novo[2]) params.set('ir', novo[2]);
    const q = params.toString();
    history.replaceState(history.state, '', '#/' + r + (arg ? '/' + arg : '') + (q ? '?' + q : ''));
  }
  return { r, arg, lugar: params.get('lugar') };
}
function render(modo) {
  const { r, arg, lugar } = rotaAtual();
  ultimoCaminho = caminhoDe(location.hash); ultimoHash = location.hash || '#/inicio';
  if (mapa) { mapa.remove(); mapa = null; }
  let corpo;
  try { corpo = P[r](arg); }
  catch (e) { registrarFalha('página ' + r, e); corpo = paginaComFalha(r); }
  $main.innerHTML = corpo + S('rodapé', rodape);
  document.title = (r === 'inicio' ? NOME : (r === 'roteiro' && arg ? ((ROTEIROS.find(x => x.id === arg) || {}).titulo || 'Roteiro') : TITULOS[r]) + ' · ' + NOME) + ' · Guia do hóspede';
  const ativo = NAV_DE[r] || r;
  document.querySelectorAll('.nav-topo a, .nav-base a').forEach(a => { const al = a.getAttribute('href').replace('#/', ''); if (al === ativo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (modo !== 'filtro') { revelar(); }
  else $main.querySelectorAll('.rv').forEach(s => s.classList.add('on'));
  if (r === 'inicio') tenta('Hoje (início)', preencherDia);
  if (r === 'inicio' || r === 'estadia' || r === 'disponibilidade') tenta('agenda', preencherAgenda);
  tenta('reservar do topo', reservarDoTopo);
  if (r === 'passeios' && arg === 'mare') { tenta('previsão e maré', preencherPlanejar); tenta('almanaque', preencherAlmanaque); }
  if (r === 'passeios' && !arg) tenta('maré de hoje', preencherMareHoje);
  if (r === 'meu-roteiro') tenta('maré do meu roteiro', preencherMeuRoteiro);
  { const ir = new URLSearchParams(location.hash.split('?')[1] || '').get('ir'); if (ir && modo !== 'filtro') { const alvo = document.getElementById(ir); if (alvo) { if (alvo.tagName === 'DETAILS') alvo.open = true; setTimeout(() => { alvo.scrollIntoView({ block: 'start' }); }, 60); } } }
  if (r === 'passeios' && arg === 'mapa') tenta('mapa', () => montarMapa(estado.mapa === 'todos' ? LUGARES : LUGARES.filter(l => l.categoria === estado.mapa)));
  if (modo === 'nav') { window.scrollTo(0, 0); $main.focus({ preventScroll: true }); }
  if (lugar && POR_ID[lugar] && !document.getElementById('folha').open) abrirLugar(lugar, true);
}
function paginaComFalha(r) {
  return `${cabecalho(TITULOS[r] || 'Guia', 'Esta parte não abriu agora', 'Algum dado desta página está com problema e já foi registrado. O resto do guia continua funcionando.')}
  <section class="sec"><div class="acoes"><a class="btn btn-prim" href="#/inicio">${ic('casa')}Ir para o início</a><a class="btn btn-sec" href="#/ajuda">${ic('fone')}Ajuda e emergência</a></div></section>`;
}
function rodape() {
  const ig = linkInsta(), res = linkReserva();
  const igNome = String(casa.instagram || '').replace(/^@/, '').trim();
  const sol = document.documentElement.classList.contains('modo-sol');
  const links = [
    res ? `<a href="${esc(res)}" target="_blank" rel="noopener">${ic('calendario', 'ic-sm')}Reservar a próxima estadia</a>` : '',
    ig ? `<a href="${esc(ig)}" target="_blank" rel="noopener" aria-label="Instagram @${esc(igNome)}">${ic('instagram', 'ic-sm')}@${esc(igNome)}</a>` : '',
    avaliacoesOk().length ? `<a href="#/avaliacoes">Avaliações</a>` : '',
    beneficiosAtivos().length ? `<a href="#/beneficios">Benefícios</a>` : '',
    `<button type="button" data-modo-sol aria-pressed="${sol}">${ic('sol-forte', 'ic-sm')}Letra maior</button>`,
    `<a href="#/privacidade">${ic('escudo', 'ic-sm')}Privacidade</a>`,
    `<a href="admin/" rel="nofollow">${ic('cadeado', 'ic-sm')}Área do anfitrião</a>`
  ].filter(Boolean);
  return `<footer class="rodape">
    <div class="rodape-marca"><span class="marca"><span class="marca-nome">${esc(NOME_PARTES[0])}</span>${NOME_PARTES[1] ? `<span class="marca-sub">${esc(NOME_PARTES[1])}</span>` : ''}</span>${tem(casa.endereco_publico) ? `<p>${esc(casa.endereco_publico)}</p>` : ''}</div>
    <nav class="rodape-links" aria-label="Rodapé">${links.join('')}</nav>
    ${blocoInstalar()}</footer>`;
}
let obsReserva = null;
function reservarDoTopo() {
  const rs = document.querySelector('[data-reservar]'); if (!rs || rs.hidden) return;
  if (obsReserva) { obsReserva.disconnect(); obsReserva = null; }
  const capa = $main.querySelector('[data-reserva-hero]');
  if (!capa || !('IntersectionObserver' in window)) { rs.classList.remove('na-capa'); return; }
  rs.classList.add('na-capa');
  obsReserva = new IntersectionObserver((es) => es.forEach(e => rs.classList.toggle('na-capa', e.isIntersecting)), { threshold: 0 });
  obsReserva.observe(capa);
}
function revelar() {
  const alvos = $main.querySelectorAll(':scope > .sec, :scope > .pag-cab');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .04 });
  alvos.forEach((a, i) => { a.classList.add('rv'); if (i < 3) requestAnimationFrame(() => a.classList.add('on')); else io.observe(a); });
}

/* ---------- eventos ---------- */
document.addEventListener('click', (e) => {
  if (e.target.closest('.pular')) { e.preventDefault(); pularConteudo(); return; }
  const ab = e.target.closest('[data-abrir]'); if (ab) { e.preventDefault(); abrirLugar(ab.getAttribute('data-abrir')); return; }
  const fi = e.target.closest('[data-filtro]');
  if (fi) {
    const k = fi.dataset.filtro, v = fi.dataset.valor;
    estado[k] = v; if (k === 'tipo') estado.todos = false;
    const y = window.scrollY; render('filtro'); window.scrollTo(0, y);
    const b = document.querySelector(`[data-filtro="${k}"][data-valor="${CSS.escape(v)}"]`); if (b) b.focus({ preventScroll: true });
    return;
  }
  if (e.target.closest('[data-ver-lugares]')) { estado.todos = true; const y = window.scrollY; render('filtro'); window.scrollTo(0, y); return; }
  const vt = e.target.closest('[data-ver-todos]');
  if (vt) { const alvo = document.getElementById(vt.dataset.verTodos); if (alvo) { const p = alvo.querySelector('[data-excede]'); alvo.querySelectorAll('[data-excede]').forEach(x => { x.hidden = false; x.removeAttribute('data-excede'); }); if (p) { p.tabIndex = -1; p.focus({ preventScroll: true }); } } vt.remove(); return; }
  const irb = e.target.closest('[data-ir]'); if (irb) { const alvo = document.getElementById(irb.dataset.ir); if (alvo) alvo.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); return; }
  const co = e.target.closest('[data-copiar]'); if (co) { const t = co.dataset.copiar; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Código copiado')).catch(() => toast('Código: ' + t)); return; }
  const cp = e.target.closest('[data-compartilhar]');
  if (cp) {
    const l = POR_ID[cp.dataset.compartilhar]; if (!l) return;
    const url = location.href.split('#')[0] + '#/lugar/' + encodeURIComponent(l.id);
    const dados = { title: l.nome, text: `${l.nome} — dica do guia da ${NOME}`, url };
    if (navigator.share) navigator.share(dados).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link copiado')).catch(() => toast(url)); else toast(url);
    return;
  }
  const ft = e.target.closest('[data-foto]');
  if (ft) { const fs = (casa.fotos || []).filter(f => f && urlSegura(f.src)); const f = fs[+ft.dataset.foto]; if (!f) return; const d = document.getElementById('folha'); ultimoFoco = ft; d.innerHTML = `<div class="folha-topo"><button type="button" class="btn-ic" data-fechar aria-label="Fechar">${ic('x')}</button></div><img src="${esc(urlSegura(f.src))}" alt="${esc(f.alt || '')}">${tem(f.alt) ? `<p class="fonte folha-corpo">${esc(f.alt)}</p>` : ''}`; d.showModal(); d.querySelector('[data-fechar]').focus(); return; }
  if (e.target.closest('[data-fechar]')) { document.getElementById('folha').close(); return; }
  if (e.target.closest('[data-buscar]')) { abrirBusca(); return; }
  if (e.target.closest('[data-ics="estadia"]')) { icsEstadia(); return; }
  const ir = e.target.closest('[data-ics-roteiro]');
  if (ir) { const d = document.getElementById('rot-data'); if (!d || !isoValida(d.value)) { toast('Escolha o dia do passeio'); if (d) d.focus(); return; } icsRoteiro(ir.dataset.icsRoteiro, d.value); return; }
  const ar = e.target.closest('[data-add-roteiro]');
  if (ar) { const sel = ar.closest('.add-roteiro').querySelector('[data-add-dia]'); mrAdicionar(ar.dataset.addRoteiro, sel ? sel.value : 0); return; }
  const mr = e.target.closest('[data-mr]'); if (mr) { mrAcao(mr.dataset.mr, mr); return; }
  if (e.target.closest('[data-limpar-estadia]')) { LS.apagar('guia:estadia'); toast('Pronto: saudação e datas apagadas deste aparelho'); render('filtro'); return; }
  if (e.target.closest('[data-limpar-tudo]')) { CHAVES_HOSPEDE.forEach(LS.apagar); document.documentElement.classList.remove('modo-sol'); MR_RECEBIDO = null; try { sessionStorage.clear(); } catch (x) {} toast('Tudo apagado deste aparelho'); render('filtro'); return; }
  const ms = e.target.closest('[data-modo-sol]');
  if (ms) { const on = document.documentElement.classList.toggle('modo-sol'); document.querySelectorAll('[data-modo-sol]').forEach(b => b.setAttribute('aria-pressed', String(on))); try { if (on) localStorage.setItem('guia:modo-sol', '1'); else localStorage.removeItem('guia:modo-sol'); } catch (x) {} toast(on ? 'Letra maior e contraste máximo' : 'Letra normal'); return; }
  if (e.target.closest('[data-instalar]')) { if (pedidoInstalar) { pedidoInstalar.prompt(); pedidoInstalar.userChoice.finally(() => { pedidoInstalar = null; }); } return; }
  if (e.target.closest('[data-instalar-nao]')) { LS.gravar('guia:instalar-dispensado', true); const x = document.querySelector('.instalar'); if (x) x.remove(); return; }
});
function atualizarLevar() {
  const marc = [...document.querySelectorAll('[data-levar-item]')].filter(i => i.checked).map(i => i.dataset.levarItem);
  LS.gravar('guia:levar', { itens: [...new Set(marc)] });
}
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-levar-item]')) { atualizarLevar(); return; }
  if (e.target.id === 'mr-ini') { const r = mrNormalizar(mrLer()); LS.gravar('guia:roteiro', { ini: isoValida(e.target.value) ? e.target.value : '', dias: r.dias }); const y = window.scrollY; render('filtro'); window.scrollTo(0, y); const i = document.getElementById('mr-ini'); if (i) i.focus(); }
});
const folha = document.getElementById('folha'), busca = document.getElementById('busca');
let buscaDestino = null;
folha.addEventListener('click', (e) => { if (e.target === folha) folha.close(); });
folha.addEventListener('close', () => {
  if (!porHist) {
    if (history.state && history.state.folha) history.back();
    else if (/[?&]lugar=|^#\/lugar\//.test(location.hash)) { history.replaceState(null, '', caminhoDe(location.hash)); ultimoHash = location.hash; }
  }
  if (ultimoFoco && document.body.contains(ultimoFoco)) ultimoFoco.focus(); ultimoFoco = null;
});
busca.addEventListener('close', () => {
  const dest = buscaDestino; buscaDestino = null;
  if (porHist) return;
  const temEntrada = history.state && history.state.busca;
  if (dest && dest.href && !/^#/.test(dest.href)) { location.href = dest.href; return; }
  if (dest && dest.href) { if (temEntrada) { history.replaceState(null, '', dest.href); render('nav'); } else location.hash = dest.href; }
  else if (dest && dest.lugar) abrirLugar(dest.lugar, temEntrada ? 'substituir' : undefined);
  else if (temEntrada) history.back();
});
window.addEventListener('popstate', (e) => {
  const st = e.state || {};
  porHist = true;
  if (busca.open && !st.busca) busca.close();
  if (folha.open && !st.folha) folha.close();
  porHist = false;
});
document.addEventListener('submit', (e) => { if (e.target.id === 'form-feedback') { e.preventDefault(); enviarFeedback(e.target); } });
window.addEventListener('hashchange', () => {
  if (/[?&](ola|in|out)=/.test(location.hash)) { lerEstadiaDaUrl(); render('nav'); return; }
  if (location.hash && !/^#\//.test(location.hash)) { history.replaceState(history.state, '', ultimoHash); pularConteudo(); return; }
  if (caminhoDe(location.hash) === ultimoCaminho) { // só a ficha (ou o destino na página) mudou
    const { lugar } = rotaAtual();
    porHist = true; if (!lugar && folha.open) folha.close(); porHist = false;
    if (lugar && POR_ID[lugar] && !folha.open) abrirLugar(lugar, true);
    const ir = new URLSearchParams(location.hash.split('?')[1] || '').get('ir'); if (ir) { const alvo = document.getElementById(ir); if (alvo) alvo.scrollIntoView({ block: 'start' }); }
    ultimoHash = location.hash; return;
  }
  porHist = true; if (folha.open) folha.close(); if (busca.open) busca.close(); porHist = false;
  render('nav');
});
function pularConteudo() { $main.focus({ preventScroll: true }); const y = $main.getBoundingClientRect().top + window.scrollY - 72; window.scrollTo(0, Math.max(0, y)); }
let rolado = false;
window.addEventListener('scroll', () => { const v = window.scrollY > 8; if (v !== rolado) { rolado = v; document.querySelector('.topo').classList.toggle('rolado', v); } }, { passive: true });

/* ---------- início ---------- */
tenta('topo', () => {
  const n = document.querySelector('[data-marca-nome]'), s = document.querySelector('[data-marca-sub]');
  if (n) n.textContent = NOME_PARTES[0]; if (s) { s.textContent = NOME_PARTES[1]; s.hidden = !NOME_PARTES[1]; }
  const lk = document.querySelector('.topo .marca'); if (lk) lk.setAttribute('aria-label', NOME + ' · início');
  const rs = document.querySelector('[data-reservar]'), u = linkReserva(); if (rs && u) { rs.href = u; rs.hidden = false; rs.textContent = 'Reservar'; rs.setAttribute('aria-label', rotuloReserva() + ' (abre em nova aba)'); rs.title = rotuloReserva(); }
  document.querySelectorAll('[data-nav-comer]').forEach(a => { a.hidden = !comerAtivo(); });
});
{ const w0 = tenta('WhatsApp do topo', waAnfitriao); const bw = document.querySelector('.btn-wa');
if (bw) { if (w0) { bw.href = w0; } else bw.remove(); } }
if (RASCUNHO) document.body.insertAdjacentHTML('afterbegin', '<div class="faixa-rascunho" role="status">Pré-visualização do rascunho · nada foi publicado ainda · <a href="./">ver site publicado</a></div>');
else if (RASCUNHO_FALTOU) document.body.insertAdjacentHTML('afterbegin', '<div class="faixa-rascunho" role="status">Rascunho não encontrado nesta aba: abra a pré-visualização de novo pelo painel. Abaixo, o site publicado.</div>');
tenta('og:image', () => { const og = CFG.og_imagem && CFG.og_imagem.src; const m = document.querySelector('meta[property="og:image"]'); if (tem(og) && m && !m.content) m.content = new URL(og, location.href).href; });
tenta('estadia', lerEstadiaDaUrl);
if (!location.hash || location.hash === '#/' || location.hash === '#') history.replaceState(null, '', location.pathname + location.search + '#/inicio');
render('inicial');
document.documentElement.setAttribute('data-guia', 'pronto');

/* modo offline (ativa só se o manifest existir no servidor). */
if (/^https?:$/.test(location.protocol) && 'serviceWorker' in navigator && !RASCUNHO) {
  const registrar = () => {
    fetch('manifest.webmanifest', { method: 'HEAD', cache: 'no-store' }).then(r => {
      if (!r.ok) return; const l = document.createElement('link'); l.rel = 'manifest'; l.href = 'manifest.webmanifest'; document.head.appendChild(l);
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }).catch(() => {});
  };
  if (document.readyState === 'complete') registrar(); else window.addEventListener('load', registrar);
}
}

carregarGuia();
})();

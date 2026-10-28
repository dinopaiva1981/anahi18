/* Guia do hóspede · lógica do site.
   Os dados vêm de dados/conteudo.json (editado pelo painel admin), lidos com fetch e normalizados por
   assets/dados.js (GuiaDados.normalizar). Código e dados ficam separados: um não precisa do outro para ser atualizado.
   Cada página e cada seção é desenhada dentro de uma proteção: um dado ruim omite só aquela parte. */
(function () {
'use strict';

/* ---------- dados: carregamento, contrato e falhas ---------- */
const URL_DADOS = 'dados/conteudo.json';
const $palco = document.getElementById('conteudo');
const escB = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icB = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const FALHAS = []; // registro das partes omitidas (também no console), útil para depurar dados ruins
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
/* Pré-visualização: o painel grava o rascunho e abre ?rascunho=1. Lemos uma vez e apagamos do localStorage
   (aparelho compartilhado); a cópia fica só no sessionStorage desta aba, para sobreviver a um recarregamento. */
function lerRascunho() {
  if (!/[?&]rascunho\b/.test(location.search)) return null;
  try {
    let r = localStorage.getItem('guia:rascunho');
    if (r) { localStorage.removeItem('guia:rascunho'); try { sessionStorage.setItem('guia:rascunho', r); } catch (e) {} }
    else r = sessionStorage.getItem('guia:rascunho');
    return r ? { dados: JSON.parse(r) } : { faltou: true };
  } catch (e) { return { faltou: true }; }
}
/* Transição (repositórios publicados antes da separação): se dados/conteudo.json não existir (404) ou falhar,
   lê o conteudo.js existente (window.CONTEUDO, esquema 1) sem nenhum passo manual. A normalização migra o formato. */
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
  $palco.innerHTML = `<section class="sec" style="padding-top:var(--e8,64px)" aria-busy="true"><div class="vazio" role="status" style="align-items:center;text-align:center">
    <div class="orn" aria-hidden="true" style="width:100%">${'<svg viewBox="0 0 44 30" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M15 15a7 7 0 0 1 14 0M22 4.5v3M13.6 8.1l2 2M30.4 8.1l-2 2M10 14.5h2.5M31.5 14.5H34"/><path d="M4 21c3-2.6 6-2.6 9 0s6 2.6 9 0 6-2.6 9 0 6 2.6 9 0M10 26c3-2.6 6-2.6 9 0s6 2.6 9 0 6-2.6 9 0"/></svg>'}</div>
    <h1 class="h3">Abrindo o guia…</h1><p>Um instante: estamos trazendo as dicas da casa e da região.</p>
    <span class="skeleton" style="width:12em;margin-top:8px"></span><span class="skeleton" style="width:8em"></span></div></section>`;
}
function telaErro(e) {
  const semRede = typeof navigator !== 'undefined' && navigator.onLine === false;
  const bw = document.querySelector('.btn-wa'); if (bw) bw.remove();
  $palco.innerHTML = `<section class="sec" style="padding-top:var(--e7,48px)"><div class="vazio" role="alert">
    <h1 class="h3">Não conseguimos abrir o guia agora</h1>
    <p>${semRede ? 'Parece que o aparelho está sem internet. Assim que o sinal voltar, toque em “Tentar de novo”.' : 'A conexão está instável ou o guia está sendo atualizado. Tente de novo em alguns segundos.'}</p>
    <div class="acoes" style="margin-top:12px"><button type="button" class="btn btn-prim" data-tentar-de-novo>${icB('seta')}Tentar de novo</button></div>
    <p style="margin-top:16px"><strong>Emergência:</strong> SAMU <a href="tel:192">192</a> · Bombeiros <a href="tel:193">193</a> · Polícia <a href="tel:190">190</a>. Para falar com o anfitrião, use o mesmo canal em que você fez a reserva.</p>
    <p class="fonte p0">Detalhe técnico: ${escB(e && e.message || 'erro desconhecido')}</p></div></section>`;
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
/* Proteção por seção: se o desenho de uma parte falhar (dado inesperado), ela some e o resto da página fica de pé. */
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
/* Telefones: 10 ou 11 dígitos (DDD + número) ganham +55, para completar mesmo com chip de outro estado.
   Números curtos (190, 192, 193, 199) seguem como estão. Números nacionais especiais (0800, 0300, 0303, 0500,
   0900 e 4003/4004 de 8 dígitos) não completam no formato internacional: ficam sem DDI. */
const linkTel = (n) => { const bruto = soNum(n);
  if (/^0(800|300|303|500|900)\d{6,8}$/.test(bruto) || /^400[0-9]\d{4}$/.test(bruto)) return 'tel:' + bruto;
  n = bruto.replace(/^0+(?=\d{10,11}$)/, ''); if (!n) return '';
  if (n.length === 10 || n.length === 11) return 'tel:+55' + n;
  if ((n.length === 12 || n.length === 13) && n.startsWith('55')) return 'tel:+' + n;
  return 'tel:' + n; };
/* Rota até um endereço quando não há link de mapa (H02). */
const rotaEndereco = (q) => tem(q) ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(String(q).replace(/\s*·\s*/g, ', ')) : '';
const rotaCasa = () => urlSegura(casa.link_maps) || (casa.coordenadas && casa.coordenadas.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${casa.coordenadas.lat},${casa.coordenadas.lng}` : rotaEndereco(casa.endereco_publico));
/* Reserva: só https. Rótulo automático: "Reservar no Airbnb" quando o endereço é do Airbnb, senão "Reservar". */
const linkReserva = () => { const u = urlSegura(casa.link_reserva); return /^https:\/\//i.test(u) ? u : ''; };
const ehAirbnb = (u) => { try { return /(^|\.)airbnb\.[a-z]{2,3}(\.[a-z]{2})?$/i.test(new URL(u).hostname); } catch (e) { return false; } };
const rotuloReserva = () => ehAirbnb(linkReserva()) ? 'Reservar no Airbnb' : 'Reservar';
/* Evita artigo ou preposição curta sozinho no fim da linha ("e a / vida"): liga a palavra curta à seguinte. */
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
const confirmar = '<span class="confirmar">a confirmar</span>';
const emBreve = '<span class="confirmar">informação em breve</span>';
const ou = (v, alt) => tem(v) ? esc(v) : (alt || confirmar);
const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const saudacao = () => { const h = horaLocal(); return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2600);
}
function guardar(chave, valor) { try { sessionStorage.setItem(chave, JSON.stringify({ em: Date.now(), valor })); } catch (e) {} }
function ler(chave, maxMin) { try { const o = JSON.parse(sessionStorage.getItem(chave)); if (o && Date.now() - o.em < maxMin * 60000) return o.valor; } catch (e) {} return null; }

/* ---------- categorias ---------- */
const CAT = {
  casa:        { rot: 'A casa',      cor: '#1F3D2F', ic: 'casa',     bola: 'b-verde' },
  praia:       { rot: 'Praia',       cor: '#1B5A75', ic: 'ondas',    bola: 'b-mar',   grupo: 'explorar' },
  natureza:    { rot: 'Natureza',    cor: '#3F6B4F', ic: 'folha',    bola: 'b-verde', grupo: 'explorar' },
  passeio:     { rot: 'Passeio',     cor: '#2A7884', ic: 'barco',    bola: 'b-mar',   grupo: 'explorar' },
  cultura:     { rot: 'Cultura',     cor: '#8A5B2C', ic: 'capela',   bola: 'b-sol',   grupo: 'explorar' },
  compras:     { rot: 'Compras',     cor: '#A44F2A', ic: 'sacola',   bola: 'b-terra', grupo: 'explorar' },
  restaurante: { rot: 'Restaurante', cor: '#A44F2A', ic: 'garfo',    bola: 'b-terra', grupo: 'comer' },
  cafe:        { rot: 'Café',        cor: '#8C5A3C', ic: 'xicara',   bola: 'b-sol',   grupo: 'comer' },
  mercado:     { rot: 'Mercado',     cor: '#5A5148', ic: 'carrinho', bola: 'b-sol',   grupo: 'comer' },
  delivery:    { rot: 'Entrega',     cor: '#A44F2A', ic: 'garfo',    bola: 'b-terra', grupo: 'comer' },
  farmacia:    { rot: 'Farmácia',    cor: '#3F6B4F', ic: 'cruz',     bola: 'b-verde', grupo: 'servicos' },
  saude:       { rot: 'Saúde',       cor: '#8A2A1A', ic: 'cruz',     bola: 'b-terra', grupo: 'servicos' },
  servico:     { rot: 'Serviço',     cor: '#4F5D5B', ic: 'fone',     bola: 'b-mar',   grupo: 'servicos' }
};
const catDe = (l) => CAT[l.categoria] || { rot: l.categoria || 'Local', cor: '#4F5D5B', ic: 'pino', bola: 'b-mar' };
const publicado = (x) => x && x.nome && x.status !== 'rascunho' && x.status !== 'oculto';
const LUGARES = (C.lugares || []).filter(publicado);
const POR_ID = Object.fromEntries(LUGARES.map(l => [l.id, l]));
const ROTEIROS = (C.roteiros || []).filter(r => r && r.titulo && r.status !== 'rascunho');
const AREAS = ['Passo de Camaragibe', 'São Miguel dos Milagres', 'Porto de Pedras', 'Japaratinga'];
const TAGS = [['familia', 'Para famílias'], ['casal', 'Para casais'], ['aventura', 'Aventura']];
const estado = { tipo: 'todos', area: 'todas', tag: '', vista: 'lista', comer: 'todos', mapa: 'todos' };

/* ---------- peças ---------- */
function midia(foto, cena, cls, rot, extra) {
  const src = foto && urlSegura(foto.src);
  if (src) return `<div class="midia ${cls || ''}"><img src="${esc(src)}" alt="${esc(foto.alt || '')}" loading="lazy" decoding="async">${extra || ''}</div>`;
  // Selo só quando pedido (rot === true, ex.: ficha do lugar). Nas páginas, um único aviso discreto é inserido por avisoIlustra().
  return `<div class="midia ${cls || ''}" data-ilustra>${window.Ilustra ? Ilustra.arte(cena || 'praia') : ''}${rot === true ? '<span class="tag-ilustra">Ilustração</span>' : ''}${extra || ''}</div>`;
}
const midiaLugar = (l, cls, extra, rot) => midia(l.foto, window.Ilustra ? Ilustra.cenaDoLugar(l) : 'praia', cls, rot, extra);
/* Um aviso por página quando há ilustrações no lugar de fotos (a home já tem o selo do hero). */
function avisoIlustra() {
  if (!$main.querySelector('[data-ilustra]') || $main.querySelector('.hero-rot')) return;
  const cab = $main.querySelector('.pag-cab');
  const p = `<p class="aviso-ilustra">${ic('folha', 'ic-sm')}Imagens ilustrativas · as fotos reais entram em breve</p>`;
  if (cab) cab.insertAdjacentHTML('beforeend', p);
  else { const sec = $main.querySelector('[data-ilustra]').closest('.sec'); (sec || $main).insertAdjacentHTML('afterbegin', p); }
}
function selos(l) {
  const s = [];
  if (l.parceiro) s.push('<span class="selo selo-parceiro">Parceiro</span>');
  if (l.depende_mare) s.push(`<span class="selo selo-claro">${ic('ondas', 'ic-sm')}Maré baixa</span>`);
  if (l.reserva) s.push('<span class="selo selo-claro">Reservar antes</span>');
  if (l.patrocinado) s.push('<span class="selo selo-patrocinado">Patrocinado</span>');
  return s.join('');
}
function cardLugar(l) { try { return cardLugar_(l); } catch (e) { registrarFalha('cardLugar ' + (l && l.id || ''), e); return ''; } }
function cardLugar_(l) {
  const c = catDe(l);
  const meta = [c.rot, l.area, l.distancia].filter(tem);
  return `<button type="button" class="card" data-abrir="${esc(l.id)}" aria-label="${esc(l.nome)}: ver detalhes">
    ${midiaLugar(l, '', `<div class="selos">${selos(l)}</div>`)}
    <div class="card-corpo">
      <span class="card-meta">${meta.map(esc).join('<span class="sep" aria-hidden="true"></span>')}</span>
      <span class="h3">${esc(l.nome)}</span>
      ${tem(l.resumo) ? `<p class="card-resumo">${esc(l.resumo)}</p>` : ''}
    </div>
  </button>`;
}
function vazio(titulo, texto, icone) {
  return `<div class="vazio">${icone ? `<span class="bola b-terra" style="width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center">${ic(icone)}</span>` : ''}<h3 class="h3">${esc(titulo)}</h3><p>${esc(texto)}</p></div>`;
}
const lista = (itens, cls) => `<ul class="lista ${cls || ''}">${itens.map(i => `<li><span>${esc(i)}</span></li>`).join('')}</ul>`;
function botaoWa(rotulo, texto, cls, ocultar) {
  const u = waAnfitriao(texto);
  if (!u && ocultar) return '';
  return u ? `<a class="btn ${cls || 'btn-prim'}" href="${esc(u)}" target="_blank" rel="noopener">${ic('msg')}${esc(rotulo)}</a>`
           : `<span class="btn ${cls || 'btn-prim'}" aria-disabled="true">${ic('msg')}WhatsApp em breve</span>`;
}
function cabecalho(olho, titulo, texto, voltar) {
  return `<header class="pag-cab">${voltar ? `<a class="voltar" href="${voltar[0]}">${ic('seta', 'ic-sm')}${esc(voltar[1])}</a>` : ''}<span class="olho">${esc(olho)}</span><h1 class="h1">${titulo}</h1>${texto ? `<p class="lead">${esc(texto)}</p>` : ''}</header>`;
}
function chips(itens, atual, chave, contagem) {
  return `<div class="filtros" role="group" aria-label="Filtrar">${itens.map(([v, r]) =>
    `<button type="button" class="chip" data-filtro="${chave}" data-valor="${esc(v)}" aria-pressed="${v === atual}">${esc(r)}${contagem ? ` <span class="n">${contagem(v)}</span>` : ''}</button>`).join('')}</div>`;
}
const fonteLink = (f) => f && urlSegura(f.url) ? `<a href="${esc(urlSegura(f.url))}" target="_blank" rel="noopener">${esc(f.titulo || 'fonte')}</a>` : '';
/* Rótulo com numeração editorial (01 —), usado nas seções da página inicial. */
let SEC_N = 0;
const olhoN = (txt, cls) => `<span class="olho ${cls || ''}"><span class="n" aria-hidden="true">${String(++SEC_N).padStart(2, '0')}</span>${esc(txt)}</span>`;
/* Ornamento: o sol nascente sobre as ondas do símbolo, entre dois fios de 1 px. */
const orn = (cls) => `<div class="orn ${cls || ''}" aria-hidden="true"><svg viewBox="0 0 44 30" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M15 15a7 7 0 0 1 14 0M22 4.5v3M13.6 8.1l2 2M30.4 8.1l-2 2M10 14.5h2.5M31.5 14.5H34"/><path d="M4 21c3-2.6 6-2.6 9 0s6 2.6 9 0 6-2.6 9 0 6 2.6 9 0M10 26c3-2.6 6-2.6 9 0s6 2.6 9 0 6-2.6 9 0"/></svg></div>`;

/* ---------- armazenamento local (sempre com try/catch: modo privado, cota, aparelho bloqueado) ---------- */
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
const dataCurta = (iso) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z')).replace('.', '').replace(/^./, c => c.toUpperCase());
/* "15h", "15:00", "a partir das 14h30" → [15, 0]; sem horário → null */
const horaDe = (t) => { const m = String(t || '').match(/(\d{1,2})\s*(?:[:h]\s*(\d{2}))?/); if (!m) return null; const h = +m[1], mi = +(m[2] || 0); return h < 24 && mi < 60 ? [h, mi] : null; };

/* ---------- Estadia personalizada (contrato 1) ----------
   Link do painel: <site>#/?ola=Nome&in=AAAA-MM-DD&out=AAAA-MM-DD (fragmento: não chega a servidores nem a robôs de prévia).
   Também aceita ?ola=… na query (links antigos). Valida, guarda só neste aparelho, limpa a URL e apaga sozinho 2 dias após o check-out. */
function lerEstadiaDaUrl() {
  const h = location.hash, qh = h.includes('?') ? h.slice(h.indexOf('?') + 1) : '';
  const pH = new URLSearchParams(qh), pS = new URLSearchParams(location.search);
  const fonte = pH.has('ola') || pH.has('in') ? pH : (pS.has('ola') || pS.has('in') ? pS : null);
  if (!fonte) return;
  const nome = String(fonte.get('ola') || '').trim().replace(/\s+/g, ' '), ini = fonte.get('in') || '', fim = fonte.get('out') || '';
  // Mesma regra do painel (admin/hospede.js, validarEstadia): até 40 caracteres no total, começando por letra.
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
  if (diasEntre(e.out, hojeISO()) > 2) { LS.apagar('guia:estadia'); return null; } // expira 2 dias após o check-out
  const hoje = hojeISO(), noites = diasEntre(e.in, e.out), dia = diasEntre(e.in, hoje) + 1;
  const fase = hoje < e.in ? 'antes' : hoje === e.in ? 'chegada' : hoje === e.out ? 'saida' : hoje > e.out ? 'depois' : diasEntre(hoje, e.out) === 1 ? 'vespera' : 'durante';
  return Object.assign({}, e, { noites, dia, total: noites + 1, faltam: diasEntre(hoje, e.in), fase, primeiro: e.nome.split(' ')[0] });
}
function cartaoEstadia() {
  const e = estadia(); if (!e) return '';
  const ci = tem(casa.checkin) ? esc(casa.checkin) : '', co = tem(casa.checkout) ? esc(casa.checkout) : '';
  const wa = (t) => waAnfitriao(t);
  let num, rot, tit, txt, acoes = [], barra = '';
  const cal = `<button type="button" class="btn btn-sec btn-peq" data-ics="estadia">${ic('calendario', 'ic-sm')}Adicionar ao calendário</button>`;
  if (e.fase === 'antes') {
    num = e.faltam; rot = e.faltam === 1 ? 'dia para<br>a chegada' : 'dias para<br>a chegada';
    tit = e.faltam === 1 ? `Amanhã é o dia, ${esc(e.primeiro)}.` : `Falta pouco, ${esc(e.primeiro)}.`;
    txt = `Chegada ${esc(dataLonga(e.in))}${ci ? ', check-in ' + ci : ''}. Saída ${esc(dataLonga(e.out))}.`;
    acoes.push(cal, `<a class="btn btn-sec btn-peq" href="#/chegada">${ic('chave', 'ic-sm')}Chegada e saída</a>`);
  } else if (e.fase === 'chegada') {
    num = 1; rot = `dia de ${e.total}`; tit = `Que bom ter você aqui, ${esc(e.primeiro)}.`;
    txt = `Hoje é dia de chegada${ci ? ' · check-in ' + ci : ''}.${e.noites === 1 ? ' O check-out é amanhã.' : ''}`;
    const r = rotaCasa(); if (r) acoes.push(`<a class="btn btn-prim btn-peq" href="${esc(r)}" target="_blank" rel="noopener">${ic('pino', 'ic-sm')}Como chegar</a>`);
    if (wa()) acoes.push(`<a class="btn btn-sec btn-peq" href="${esc(wa(`Olá! Aqui é ${e.nome}: chegamos bem na ${NOME}.`))}" target="_blank" rel="noopener">${ic('whatsapp', 'ic-sm')}Avisar que cheguei</a>`);
  } else if (e.fase === 'durante' || e.fase === 'vespera') {
    num = e.dia; rot = `dia de ${e.total}`;
    tit = e.fase === 'vespera' ? `Amanhã é o check-out, ${esc(e.primeiro)}.` : `Bom ver você por aqui, ${esc(e.primeiro)}.`;
    txt = e.fase === 'vespera' ? `Saída ${esc(dataLonga(e.out))}${co ? ', até ' + co : ''}. Veja com calma o que fazer na saída.` : `Seu check-out é ${esc(dataLonga(e.out))}${co ? ', até ' + co : ''}.`;
    barra = `<div class="estadia-barra" role="img" aria-label="Dia ${e.dia} de ${e.total} da estadia"><i style="width:${Math.round(e.dia / e.total * 100)}%"></i></div>`;
    acoes.push(e.fase === 'vespera' ? `<a class="btn btn-prim btn-peq" href="#/chegada">${ic('chave', 'ic-sm')}O que fazer na saída</a>` : `<a class="btn btn-sec btn-peq" href="#/meu-roteiro">${ic('lista', 'ic-sm')}Meu roteiro</a>`);
  } else if (e.fase === 'saida') {
    num = e.total; rot = `dia de ${e.total}`; tit = `Hoje é dia de partir, ${esc(e.primeiro)}.`;
    txt = `Check-out ${co ? 'até ' + co : 'hoje'}. Obrigado por cuidar da casa como se fosse sua.`;
    acoes.push(`<a class="btn btn-prim btn-peq" href="#/chegada">${ic('chave', 'ic-sm')}Checklist de saída</a>`);
    if (wa()) acoes.push(`<a class="btn btn-sec btn-peq" href="${esc(wa(`Olá! Aqui é ${e.nome}: já saímos da ${NOME}. Obrigado!`))}" target="_blank" rel="noopener">${ic('whatsapp', 'ic-sm')}Avisar que saímos</a>`);
  } else {
    num = '·'; rot = 'até a<br>próxima'; tit = `Obrigado pela visita, ${esc(e.primeiro)}.`;
    txt = 'Se puder, conte ao anfitrião como foi. Estes dados se apagam sozinhos deste aparelho em até 2 dias.';
    acoes.push(`<a class="btn btn-prim btn-peq" href="#/feedback">${ic('estrela', 'ic-sm')}Deixar feedback</a>`);
  }
  if (e.fase !== 'antes' && e.fase !== 'depois') acoes.push(cal);
  acoes.push('<button type="button" class="btn-texto" data-limpar-estadia>Não sou eu · limpar</button>');
  return `<section class="estadia" aria-label="Sua estadia"><div class="estadia-card">
    <div class="estadia-num"><b class="tab">${num}</b><span>${rot}</span></div>
    <div class="estadia-txt"><h2 class="h3">${tit}</h2><p>${txt}</p>${barra}</div>
    <div class="estadia-acoes">${acoes.join('')}</div></div></section>`;
}

/* ---------- Calendário (.ics gerado no aparelho, nada sai daqui) ---------- */
function icsTexto(eventos) {
  const escI = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const enc = new TextEncoder();
  const dobra = (linha) => { // linhas de até 75 octetos (RFC 5545), sem partir caracteres acentuados
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
    { data: e.in, hora: ci, titulo: `Check-in · ${NOME}`, local, url: urlGuia() + '#/chegada', alarme: ci ? 3 : 0,
      descricao: `Chegada à ${NOME}.${ci ? '' : ' O horário do check-in é confirmado pelo anfitrião.'}\nGuia do hóspede: ${urlGuia()}#/chegada` },
    { data: e.out, hora: co, titulo: `Check-out · ${NOME}`, local, url: urlGuia() + '#/chegada', alarme: co ? 2 : 0,
      descricao: `Dia da saída.${co ? '' : ' O horário do check-out é confirmado pelo anfitrião.'} Veja o checklist de saída no guia: ${urlGuia()}#/chegada` }
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
/* Nascer e pôr do sol pela equação do nascer do sol (precisão de ~1–2 min). Devolve ms (UTC). */
function solCalc(iso, lat, lng) {
  const [y, m, d] = iso.split('-').map(Number);
  const jd = Date.UTC(y, m - 1, d, 12) / 864e5 + 2440587.5 + 3 / 24; // meio-dia local (UTC−3)
  const n = Math.ceil(jd - 2451545.0 + 0.0008), Js = n - lng / 360;
  const M = (357.5291 + 0.98560028 * Js) % 360, C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lam = (M + C + 180 + 102.9372) % 360, Jt = 2451545 + Js + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lam * RAD);
  const dec = Math.asin(Math.sin(lam * RAD) * Math.sin(23.4397 * RAD));
  const w = Math.acos((Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(dec)) / (Math.cos(lat * RAD) * Math.cos(dec))) / RAD;
  const ms = (J) => (J - 2440587.5) * 864e5;
  return { nasce: ms(Jt - w / 360), poe: ms(Jt + w / 360) };
}
/* Fase da lua: idade desde uma lua nova de referência (6/1/2000 18:14 UTC), mês sinódico médio. */
const SINODICO = 29.530588853;
function lua(ms) {
  const idade = (((ms / 864e5 + 2440587.5 - 2451550.1) % SINODICO) + SINODICO) % SINODICO, f = idade / SINODICO;
  const ilum = (1 - Math.cos(2 * Math.PI * f)) / 2;
  // Fases principais só a até ~1 dia do instante exato; no resto do tempo, a fase intermediária.
  const principais = [[0, 'Lua nova'], [.25, 'Quarto crescente'], [.5, 'Lua cheia'], [.75, 'Quarto minguante'], [1, 'Lua nova']];
  const perto = principais.find(([p]) => Math.abs(f - p) * SINODICO <= 1.1);
  const nome = perto ? perto[1] : ['Lua crescente', 'Crescente gibosa', 'Minguante gibosa', 'Lua minguante'][Math.floor(f * 4)];
  const ate = (alvo) => { let dd = (alvo - f) * SINODICO; if (dd < 0.5) dd += SINODICO; return ms + dd * 864e5; };
  return { idade, f, ilum, nome, cheia: ate(0.5), nova: ate(1), sizigia: Math.min(Math.abs(f - .5), f, 1 - f) * SINODICO <= 2.5 };
}
/* Desenho da lua como se vê do hemisfério sul (o lado iluminado da crescente fica à esquerda). */
function luaSVG(f, titulo) {
  const r = 20, c = 23, k = Math.cos(2 * Math.PI * f), rx = Math.abs(k) * r;
  const crescendo = f < 0.5, gibosa = k < 0;
  // Norte: crescente iluminada à direita. Desenhamos no norte e espelhamos para o sul.
  const lado = crescendo ? `M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r}` : `M${c} ${c - r} A${r} ${r} 0 0 0 ${c} ${c + r}`;
  const term = `A${rx.toFixed(2)} ${r} 0 0 ${crescendo ? (gibosa ? 1 : 0) : (gibosa ? 0 : 1)} ${c} ${c - r}`;
  return `<svg class="lua" viewBox="0 0 46 46" role="img" aria-label="${esc(titulo)}"><circle cx="${c}" cy="${c}" r="${r}" fill="#2B3A44"/><g transform="translate(46 0) scale(-1 1)"><path d="${lado} ${term} Z" fill="#F3E7C9"/></g><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#B9A88C" stroke-width=".8"/></svg>`;
}
/* Índice UV: categorias da OMS, com a recomendação do dia. */
function uvInfo(v) {
  v = Math.round(v);
  if (v <= 2) return ['Baixo', 1, 'Pode aproveitar o sol; protetor se for ficar muito tempo.'];
  if (v <= 5) return ['Moderado', 2, 'Protetor, chapéu e óculos; procure sombra perto do meio-dia.'];
  if (v <= 7) return ['Alto', 3, 'Protetor FPS 30 ou mais, reaplicado a cada 2 horas; sombra entre 10h e 16h.'];
  if (v <= 10) return ['Muito alto', 4, 'Evite o sol direto entre 10h e 16h; protetor, chapéu e camiseta na água.'];
  return ['Extremo', 5, 'Evite o sol entre 10h e 16h. Crianças na sombra e protetor reaplicado sempre.'];
}
/* Temperatura da água (Open-Meteo Marine). Sem resposta, o bloco some sem alarde. */
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
/* "Hoje": cruza a próxima maré baixa com luz do dia com o roteiro que combina com ela. */
const roteiroDeMare = (r) => (r.paradas || []).some(p => POR_ID[p.lugar] && POR_ID[p.lugar].depende_mare);
function roteiroParaMare(b) {
  const comMare = ROTEIROS.filter(roteiroDeMare), semMare = ROTEIROS.filter(r => !roteiroDeMare(r));
  if (!b) return semMare[0] || null;
  const h = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ }).format(new Date(b.t)));
  const q = (re, nao) => comMare.find(r => re.test(normal(r.quando || '')) && !(nao && nao.test(normal(r.quando || ''))));
  return (h < 11 ? q(/manha/, /fim da manha/) : h < 13 ? q(/fim da manha/) || q(/manha/) : q(/tarde/)) || comMare[0] || null;
}

/* ---------- O que levar para a praia (checklist que fica no aparelho) ---------- */
const LEVAR = () => (REG.o_que_levar || []).filter(tem);
const chaveItem = (t) => normal(t).replace(/[^a-z0-9]+/g, '').slice(0, 40);
function blocoLevar(id) {
  const itens = LEVAR(); if (!itens.length) return '';
  const marc = new Set((LS.ler('guia:levar') || {}).itens || []);
  const n = itens.filter(t => marc.has(chaveItem(t))).length;
  return `<div class="painel" id="${id || 'levar'}" data-levar>
    <div class="levar-cab"><div><span class="olho mar">Antes de sair</span><h2 class="h3">O que levar para a praia</h2></div>
      <span class="levar-conta" aria-live="polite" data-levar-conta>${n} de ${itens.length} na bolsa</span></div>
    <ul class="levar">${itens.map((t, i) => `<li><input type="checkbox" id="lv-${id || 'levar'}-${i}" data-levar-item="${esc(chaveItem(t))}"${marc.has(chaveItem(t)) ? ' checked' : ''}><label for="lv-${id || 'levar'}-${i}">${esc(t)}</label></li>`).join('')}</ul>
    <div class="acoes" style="margin-top:var(--e4);align-items:center"><button type="button" class="btn btn-sec btn-peq" data-levar-zerar>${ic('mais', 'ic-sm')}Recomeçar a lista</button><span class="fonte">Fica salvo só neste aparelho.</span></div></div>`;
}

/* ---------- Meu roteiro (salvo no aparelho, compartilhável por link) ---------- */
const mrLer = () => { const r = LS.ler('guia:roteiro'); return r && Array.isArray(r.dias) ? r : { ini: '', dias: [[], [], []] }; };
const mrItem = (cod) => { const [t, id] = String(cod).split(':'); if (t === 'r') { const r = ROTEIROS.find(x => x.id === id); return r && { cod, nome: r.titulo, sub: 'Roteiro · ' + (r.quando || ''), ic: 'bussola', bola: 'b-mar', href: '#/roteiro/' + r.id, mare: roteiroDeMare(r) }; }
  const l = POR_ID[id]; return l && { cod, nome: l.nome, sub: [catDe(l).rot, l.area].filter(tem).join(' · '), ic: catDe(l).ic, bola: catDe(l).bola, abrir: l.id, mare: !!l.depende_mare }; };
function mrNormalizar(r) {
  const e = estadia();
  const ini = e ? e.in : (isoValida(r.ini) ? r.ini : '');
  let n = e ? e.total : Math.min(Math.max(r.dias.length, 1), 14);
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
  const it = mrItem(cod); toast(`${it ? it.nome : 'Item'} entrou no dia ${d + 1} do seu roteiro`);
}
const mrRotuloDia = (r, i) => r.ini ? `Dia ${i + 1} · ${dataCurta(somaDias(r.ini, i))}` : `Dia ${i + 1}`;
function seletorDia(cod) {
  const r = mrNormalizar(mrLer()), e = estadia();
  let padrao = 0; if (r.ini) { const k = diasEntre(r.ini, hojeISO()); if (k >= 0 && k < r.dias.length) padrao = k; }
  return `<div class="add-roteiro no-print"><label for="add-${esc(cod)}">${e ? 'Guardar na sua estadia' : 'Guardar no meu roteiro'}</label>
    <select id="add-${esc(cod)}" data-add-dia>${r.dias.map((_, i) => `<option value="${i}"${i === padrao ? ' selected' : ''}>${esc(mrRotuloDia(r, i))}</option>`).join('')}</select>
    <button type="button" class="btn btn-sec btn-peq" data-add-roteiro="${esc(cod)}">${ic('mais', 'ic-sm')}Adicionar</button></div>`;
}

/* ---------- Convite para instalar (sem insistir: só no rodapé, e some quando dispensado) ---------- */
let pedidoInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedidoInstalar = e; const b = document.querySelector('[data-instalar]'); if (b) b.hidden = false; const x = document.querySelector('.instalar'); if (x) x.hidden = false; });
window.addEventListener('appinstalled', () => { pedidoInstalar = null; const x = document.querySelector('.instalar'); if (x) x.remove(); toast('Guia na tela inicial. Ele abre mesmo sem sinal.'); });
const instalado = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function blocoInstalar() {
  if (instalado() || LS.ler('guia:instalar-dispensado')) return '';
  const ios = ehIOS();
  return `<div class="instalar"${ios || pedidoInstalar ? '' : ' hidden'}><p><strong>Guarde o guia na tela inicial.</strong> ${ios ? 'No Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.' : 'Ele abre com um toque e funciona mesmo sem sinal na praia.'}</p>
    <div class="acoes">${ios ? '' : `<button type="button" class="btn btn-claro btn-peq" data-instalar${pedidoInstalar ? '' : ' hidden'}>${ic('instalar', 'ic-sm')}Instalar</button>`}<button type="button" class="btn-texto" data-instalar-nao>Agora não</button></div></div>`;
}

/* ---------- dados externos: tempo e maré ---------- */
const TEMPO = { 0: ['Céu limpo', 'sol'], 1: ['Sol entre nuvens', 'sol'], 2: ['Parcialmente nublado', 'nuvem-sol'], 3: ['Nublado', 'nuvem'], 45: ['Neblina', 'nuvem'], 48: ['Neblina', 'nuvem'], 51: ['Garoa fraca', 'chuva'], 53: ['Garoa', 'chuva'], 55: ['Garoa forte', 'chuva'], 61: ['Chuva fraca', 'chuva'], 63: ['Chuva', 'chuva'], 65: ['Chuva forte', 'chuva'], 80: ['Pancadas fracas', 'chuva'], 81: ['Pancadas de chuva', 'chuva'], 82: ['Pancadas fortes', 'chuva'], 95: ['Trovoadas', 'chuva'], 96: ['Trovoadas', 'chuva'], 99: ['Trovoadas', 'chuva'] };
const tempoDe = (c) => TEMPO[c] || ['Tempo variável', 'nuvem-sol'];
const PONTO = () => (casa.coordenadas && casa.coordenadas.lat != null) ? casa.coordenadas : (REG.centro || { lat: -9.2378, lng: -35.4928 });

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
  const lat = -9.25, lng = -35.40; // ponto no mar em frente à rota
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
    const den = a - 2 * b + c; const dx = den ? (a - c) / (2 * den) : 0; // interpolação parabólica
    r.push({ tipo: min ? 'baixa' : 'alta', t: t1 + dx * (t1 - t0), v: b - (a - c) * dx / 4 });
  }
  return r;
}
/* Luz do dia: nascer e pôr do sol do Open-Meteo; sem previsão, uma janela conservadora (05:30–17:00, Alagoas). */
const diaISO = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(ms));
function solDe(ms, clima) {
  const dia = diaISO(ms);
  const d = clima && clima.daily, i = d && d.time ? d.time.indexOf(dia) : -1;
  if (i >= 0 && d.sunrise && d.sunset && d.sunrise[i] && d.sunset[i]) return { nasce: new Date(d.sunrise[i] + ':00' + offsetTZ()).getTime(), poe: new Date(d.sunset[i] + ':00' + offsetTZ()).getTime(), real: true };
  const p = PONTO(), c = solCalc(dia, p.lat, p.lng); // sem previsão: cálculo astronômico feito aqui mesmo
  return { nasce: c.nasce, poe: c.poe, real: false };
}
/* Cada baixa recebe: claro (com luz do dia), periodo (madrugada/noite) e qualidade relativa pela amplitude do próprio modelo
   (diferença para as preamares vizinhas), comparada com as outras baixas da semana. Nenhuma altura em metros é exibida. */
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
/* Faixa "a casa em resumo": números + comodidades marcadas como destaque. */
function faixaCasa() {
  const it = [];
  if (casa.quartos) it.push(['cama', `${casa.quartos} quartos`, casa.suites ? `${casa.suites} suíte${casa.suites > 1 ? 's' : ''}` : '']);
  if (casa.hospedes) it.push(['pessoas', `Até ${casa.hospedes}`, 'hóspedes']);
  (casa.comodidades || []).filter(c => c.destaque).slice(0, 6 - it.length).forEach(c => {
    // "Wi-Fi de alta velocidade" -> WI-FI / de alta velocidade; "Estacionamento gratuito" -> ESTACIONAMENTO / gratuito
    const nome = String(c.nome || '').trim(), m = nome.match(/^(.+?)\s((?:de|do|da|dos|das|a|à|ao|em|no|na|com|para)\s.+)$/i) || (nome.length > 13 ? nome.match(/^(\S+)\s(.+)$/) : null);
    it.push([ICS[c.icone] || 'check', m ? m[1] : nome, m ? m[2] : '']);
  });
  if (it.length < 3) return '';
  const nm = it.length === 4 ? 2 : 3;
  return `<section class="sec faixa-sec" aria-label="A casa em resumo"><ul class="faixa" data-nm="${nm}" data-n="${it.length}" style="--n:${it.length};--nm:${nm}">${it.map(([i, t, s]) => `<li>${ic(i, 'ic-lg')}<strong>${esc(t)}</strong>${s ? `<span>${esc(s)}</span>` : ''}</li>`).join('')}</ul></section>`;
}
function blocoSobre() {
  if (!tem(casa.sobre)) return '';
  const fs = (casa.fotos || []).slice(1, 4);
  const mids = fs.length ? fs.map(f => midia(f, 'casa')).join('') : ['casa', 'praia', 'vila'].map((c, i) => midia(null, c, '', i ? false : undefined)).join('');
  return `<section class="sec" aria-labelledby="h-sobre"><div class="sobre">
    <div class="sobre-txt">${olhoN('Sobre a casa')}<h2 id="h-sobre" class="h2">Feita para <em>desacelerar</em>.</h2><p class="lead">${esc(casa.sobre)}</p><a class="btn btn-sec" href="#/casa" style="justify-self:start">Ver detalhes da casa ${ic('seta', 'ic-sm')}</a></div>
    <div class="sobre-fotos">${mids}</div></div></section>`;
}

/* Localização (H23): endereço público, trajetos e mini-mapa esquemático da costa (não é mapa real, e diz isso).
   preserveAspectRatio "meet": os rótulos nunca são cortados; fundo, mar e costa continuam além do viewBox e preenchem a sobra. */
function miniMapa() {
  return `<svg class="mini-mapa" viewBox="0 0 260 300" preserveAspectRatio="xMidYMid meet" role="img" aria-labelledby="mm-t"><title id="mm-t">Mapa esquemático do litoral norte de Alagoas, com a Praia do Marceneiro entre Barra de Camaragibe e São Miguel dos Milagres</title>
    <rect x="-400" y="-400" width="1060" height="1100" fill="#E9E3D6"/>
    <path d="M222 -400 L208 0 C 200 50 194 90 186 130 C 176 180 160 240 140 300 L80 700 L660 700 L660 -400 Z" fill="#CFE3E2"/>
    <path d="M222 -400 L208 0 C 200 50 194 90 186 130 C 176 180 160 240 140 300 L80 700" fill="none" stroke="#9FC6C3" stroke-width="2"/>
    <path d="M250 -400 L236 0 C 228 50 222 90 214 130 C 204 180 190 240 172 300 L112 700" fill="none" stroke="#9FC6C3" stroke-width="1.5" stroke-dasharray="2 6" stroke-linecap="round"/>
    <path d="M200 -400 L186 0 C 178 50 172 90 164 130 C 154 180 138 240 118 300 L58 700" fill="none" stroke="#C4B59D" stroke-width="2.5" stroke-dasharray="7 5"/>
    <circle cx="200" cy="44" r="3" fill="#665D54"/><text x="160" y="40" font-size="10" fill="#665D54" font-family="Inter,sans-serif" text-anchor="end">Porto de Pedras</text>
    <circle cx="192" cy="100" r="3" fill="#665D54"/><text x="152" y="96" font-size="10" fill="#665D54" font-family="Inter,sans-serif" text-anchor="end">S. Miguel dos Milagres</text>
    <circle cx="164" cy="226" r="3" fill="#665D54"/><text x="124" y="230" font-size="10" fill="#665D54" font-family="Inter,sans-serif" text-anchor="end">Barra de Camaragibe</text>
    <text x="132" y="198" font-size="9.5" fill="#8A7D6C" font-family="Inter,sans-serif" text-anchor="end">AL-101</text>
    <g transform="translate(180 168)"><path d="M0 0 C -9 -10 -9 -22 0 -26 C 9 -22 9 -10 0 0 Z" fill="#A44F2A"/><circle cy="-17" r="3.6" fill="#FFFDF9"/></g>
    <text x="160" y="160" font-size="11.5" font-weight="700" fill="#1F3D2F" font-family="Inter,sans-serif" text-anchor="end">Praia do Marceneiro</text>
    <text x="246" y="200" font-size="10" font-weight="700" fill="#1B5A75" font-family="Inter,sans-serif" letter-spacing="2" text-anchor="end">MAR</text>
    <g transform="translate(30 76)" fill="none" stroke="#665D54" stroke-width="1.4"><circle r="11"/><path d="M0 -7 L3 3 L0 1 L-3 3 Z" fill="#665D54"/></g><text x="30" y="58" font-size="9" fill="#665D54" text-anchor="middle" font-family="Inter,sans-serif">N</text>
  </svg>`;
}
function blocoLocal() {
  const tr = (casa.chegada && casa.chegada.trajetos) || [], rt = rotaCasa();
  if (!tem(casa.endereco_publico) && !tr.length) return '';
  return `<section class="sec" aria-labelledby="h-local"><div class="local">
    <div class="local-end">${olhoN('Localização')}<h2 id="h-local" class="h3">Praia do Marceneiro</h2>
      <p class="local-linha">${ic('pino')}<span>${esc(casa.endereco_publico || '')}</span></p>
      ${rt ? `<a class="btn btn-sec" href="${esc(rt)}" target="_blank" rel="noopener" style="justify-self:start">${ic('pino', 'ic-sm')}Como chegar</a>` : ''}
      <a class="link-seta" href="#/chegada">Chegada e saída ${ic('seta', 'ic-sm')}</a></div>
    ${tr.length ? `<div class="local-traj"><span class="olho mar">Como chegar</span><ul>${tr.map(t => `<li><span class="bola b-mar">${ic(ICS[t.icone] || 'pino')}</span><div><strong>${esc(t.titulo)}</strong><span>${esc(t.texto)}</span></div></li>`).join('')}</ul></div>` : ''}
    <figure class="local-mapa">${miniMapa()}<figcaption>Mapa esquemático, fora de escala</figcaption></figure>
  </div></section>`;
}

/* ---------- Disponibilidade: agenda espelhada do Airbnb ----------
   Só aparece com config.agenda_visivel = true e o endereço do Apps Script (config.feedback_endpoint) em https.
   GET <endpoint>?acao=agenda devolve apenas períodos ocupados (fim exclusivo). Cópia na sessão por 30 min.
   Se falhar: a seção some (ou vira só o botão para ver as datas no Airbnb, se houver link de reserva). */
const AG_CHAVE = 'guia:agenda', AG_MIN = 30;
let AG_MEMORIA = null; // reserva para quando o sessionStorage está bloqueado
const agendaEndpoint = () => { const u = urlSegura(CFG.feedback_endpoint); return /^https:\/\//i.test(u) ? u : ''; };
const agendaAtiva = () => CFG.agenda_visivel === true && !!agendaEndpoint() && !!window.GuiaAgenda;
const fraseConfirma = () => linkReserva() && !ehAirbnb(linkReserva()) ? 'Disponibilidade sujeita a confirmação no momento da reserva.' : 'Disponibilidade sujeita a confirmação no Airbnb.';
function blocoAgenda(pagina) {
  if (!agendaAtiva()) return '';
  const res = linkReserva();
  return `<section class="sec agenda-sec${pagina ? ' agenda-pag' : ''}" id="disponibilidade" aria-labelledby="h-disp" data-agenda>
    <div class="agenda">
      <div class="agenda-txt">
        ${pagina ? '' : olhoN('Disponibilidade', 'mar')}
        <h2 id="h-disp" class="h2">${pagina ? 'Calendário <em>da casa</em>.' : 'Datas <em>livres</em>.'}</h2>
        <p class="agenda-prox" data-ag-prox><span class="skeleton" style="width:12em"></span></p>
        <p class="agenda-nota">${ic('alerta', 'ic-sm')}<span>${esc(fraseConfirma())}</span></p>
        <p class="fonte p0" data-ag-atual></p>
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
    sec.innerHTML = `<div class="agenda-falha"><div><span class="olho mar">Disponibilidade</span><p class="p0">As datas livres estão no ${ehAirbnb(res) ? 'Airbnb' : 'site de reservas'}: confira o calendário por lá.</p></div><a class="btn btn-sec" href="${esc(res)}" target="_blank" rel="noopener">${ehAirbnb(res) ? 'Ver disponibilidade no Airbnb' : 'Ver disponibilidade'}${ic('seta', 'ic-sm')}<span class="sr-only"> (abre em nova aba)</span></a></div>`;
  } else if (sec.classList.contains('agenda-pag')) {
    sec.innerHTML = `<div class="vazio"><h2 class="h3">A agenda não abriu agora.</h2><p>Tente de novo daqui a pouco ou fale com o anfitrião.</p><a class="btn btn-sec" href="#/inicio">${ic('casa', 'ic-sm')}Ir para o início</a></div>`;
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

P.inicio = () => {
  const f0 = (casa.fotos || [])[0];
  const fotoHero = f0 && urlSegura(f0.src);
  const dest = (C.destaques || []).map(id => POR_ID[id]).filter(Boolean).slice(0, 8);
  const ben = beneficiosAtivos(), aval = avaliacoesOk();
  return `
  ${S('início: capa', () => `<section class="hero" aria-labelledby="h-hero">
    <div class="hero-palco">
      ${fotoHero ? `<img src="${esc(fotoHero)}" alt="${esc(f0.alt || '')}" fetchpriority="high">` : (window.Ilustra ? `<div class="arte-larga">${Ilustra.arte('praia', { heroi: true, vb: '-20 10 440 250' })}</div><div class="arte-alta">${Ilustra.arte('praia', { heroi: true, vb: '40 -150 300 470' })}</div>` : '')}
      ${fotoHero ? '' : '<span class="hero-rot">Ilustração<span class="hero-rot-mais"> · foto real em breve</span></span>'}
      <div class="hero-conteudo">
        <span class="hero-ola">${(() => { const e = estadia(); return e ? esc(saudacao()) + ', ' + esc(e.primeiro) : esc(saudacao()) + ' · bem-vindo à'; })()}</span>
        <h1 id="h-hero" class="hero-marca" aria-label="${esc(NOME)}"><span class="hm-1">${esc(NOME_PARTES[0])}</span>${NOME_PARTES[1] ? `<span class="hm-2">${esc(NOME_PARTES[1])}</span>` : ''}</h1>
        <span class="hero-traco" aria-hidden="true"></span>
        <span class="hero-local"><span>Praia do Marceneiro</span><span class="sep" aria-hidden="true"> · </span><span>Rota dos Milagres · AL</span></span>
        ${tem(casa.frase) ? `<p class="hero-frase">${semViuva(casa.frase)}</p>` : ''}
        <div class="hero-acoes${linkReserva() || RASCUNHO ? ' com-reserva' : ''}">
          ${linkReserva() ? `<a class="btn btn-reserva" href="${esc(linkReserva())}" target="_blank" rel="noopener" data-reserva-hero>${esc(rotuloReserva())}${ic('seta', 'ic-sm')}<span class="sr-only"> (abre em nova aba)</span></a>` : RASCUNHO ? `<span class="btn-reserva-falta" data-reserva-falta>${ic('alerta', 'ic-sm')}Botão “Reservar”: configure o link no painel (A casa)</span>` : ''}
          ${waAnfitriao() ? `<a class="btn btn-vidro" href="${esc(waAnfitriao())}" target="_blank" rel="noopener">${ic('msg')}Falar com o anfitrião</a>` : `<a class="btn ${linkReserva() ? 'btn-vidro' : 'btn-claro'}" href="#/explorar">${ic('bussola')}Explorar a região</a>`}
        </div>
      </div>
    </div>
  </section>`)}
  ${S('início: rápido', () => rapido())}
  <section aria-label="Hoje" class="dia" id="seu-dia">${S('início: hoje', () => painelDia())}</section>
  ${S('início: estadia', () => cartaoEstadia())}
  ${S('início: agenda', () => estadia() ? '' : blocoAgenda())}
  ${S('início: atalhos', () => `<section class="sec" aria-labelledby="h-atalhos">
    <div class="sec-cab"><div><h2 id="h-atalhos" class="h2">Tudo <em>à mão</em>.</h2></div></div>
    <nav class="atalhos" aria-label="Atalhos">
      <a class="atalho" href="#/casa"><span class="bola b-verde">${ic('casa')}</span><span>A casa<small>Comodidades e regras</small></span></a>
      <a class="atalho" href="#/chegada"><span class="bola b-verde">${ic('chave')}</span><span>Chegada e saída<small>${tem(casa.checkin) ? 'Check-in ' + esc(casa.checkin) : 'Horários e acesso'}</small></span></a>
      <a class="atalho" href="#/planejar"><span class="bola b-mar">${ic('ondas')}</span><span>Maré e tempo<small>Planeje o dia</small></span></a>
      <a class="atalho" href="#/explorar"><span class="bola b-mar">${ic('bussola')}</span><span>Praias e passeios<small>${LUGARES.filter(l => catDe(l).grupo === 'explorar').length} lugares</small></span></a>
      <a class="atalho" href="#/comer"><span class="bola b-terra">${ic('garfo')}</span><span>Onde comer<small>E o que provar</small></span></a>
      <a class="atalho" href="#/ajuda"><span class="bola b-terra">${ic('fone')}</span><span>Ajuda<small>Contatos e emergência</small></span></a>
    </nav>
      </section>`)}
  <details class="mais-inicio"><summary><span>Mais da casa e da região<small>Sobre a casa, localização, roteiros, sabores e avaliações</small></span></summary>
  ${S('início: a casa em resumo', () => faixaCasa())}
  ${S('início: sobre', () => blocoSobre())}
  ${S('início: localização', () => blocoLocal())}
  ${S('início: agenda', () => estadia() ? blocoAgenda() : '')}
  ${S('início: roteiros', () => ROTEIROS.length ? `<section class="sec" aria-labelledby="h-rot">
    <div class="sec-cab"><div>${olhoN('Roteiros do anfitrião')}<h2 id="h-rot" class="h2">Dias prontos para <em>viver</em>.</h2><p>Sequências pensadas para a maré, a luz e o ritmo da região.</p></div><a class="link-seta" href="#/explorar">Ver tudo ${ic('seta')}</a></div>
    <div class="roteiros">${ROTEIROS.slice(0, 4).map(cardRoteiro).join('')}</div>
  </section>` : '')}
  ${S('início: destaques', () => dest.length ? `<section class="sec" aria-labelledby="h-dest">
    <div class="sec-cab"><div>${olhoN('Rota dos Milagres', 'mar')}<h2 id="h-dest" class="h2">O melhor do litoral, <em>no seu ritmo</em>.</h2></div><a class="link-seta" href="#/explorar">Guia completo ${ic('seta')}</a></div>
    <div class="trilho">${dest.map(cardLugar).join('')}</div>
  </section>` : '')}
  ${S('início: o que provar', () => `<section class="sec" aria-labelledby="h-prov">
    <div class="sec-cab"><div>${olhoN('Sabores da terra')}<h2 id="h-prov" class="h2">O que <em>provar</em> por aqui.</h2></div><a class="link-seta" href="#/comer">Onde comer ${ic('seta')}</a></div>
    <div class="provar">${(C.provar || []).slice(0, 6).map(p => `<div class="prato"><strong>${esc(p.nome)}</strong><span>${esc(p.descricao)}</span></div>`).join('')}</div>
  </section>`)}
  ${S('início: benefícios', () => ben.length ? `<section class="sec" aria-labelledby="h-ben">
    <div class="sec-cab"><div>${olhoN('Só para hóspedes')}<h2 id="h-ben" class="h2">Benefícios <em>exclusivos</em>.</h2></div><a class="link-seta" href="#/beneficios">Ver todos ${ic('seta')}</a></div>
    <div class="cards">${ben.slice(0, 3).map(cardBeneficio).join('')}</div>
  </section>` : '')}
  ${S('início: avaliações', () => aval.length ? `<section class="sec" aria-labelledby="h-aval">
    <div class="sec-cab"><div>${olhoN('Quem já esteve aqui', 'mudo')}<h2 id="h-aval" class="h2">Palavras de <em>hóspedes</em>.</h2></div><a class="link-seta" href="#/avaliacoes">Ver todas ${ic('seta')}</a></div>
    <div class="cards">${aval.slice(0, 3).map(cardAvaliacao).join('')}</div>
  </section>` : '')}
  ${S('início: frase', () => tem(casa.frase) ? `<section class="sec sec-orn" aria-label="Frase da casa">${orn()}<p class="citacao" style="margin:var(--e5) auto 0;text-align:center">${semViuva(casa.frase)}</p></section>` : '')}
  <section class="sec">
    <div class="painel cta-salvia">
      ${olhoN('Sua opinião').replace('class="olho ', 'style="margin:0" class="olho ')}
      <h2 class="h2">Como está sendo <em>sua estadia</em>?</h2>
      <p class="p0" style="color:var(--texto);max-width:36rem">Conte para o anfitrião, em particular. Elogios, sugestões e qualquer problema chegam para quem cuida da casa.</p>
      <a class="btn btn-prim" href="#/feedback" style="justify-self:start">${ic('estrela')}Deixar feedback</a>
    </div>
  </section>
  </details>`;
};

/* Três atalhos práticos logo abaixo da capa: Wi-Fi, horários e contato. */
function rapido() {
  const wa = waAnfitriao(), ci = tem(casa.checkin) ? casa.checkin : '', co = tem(casa.checkout) ? casa.checkout : '';
  const it = [
    ['#/casa', 'wifi', 'Wi-Fi', 'Senha na mensagem do anfitrião', ''],
    ['#/chegada', 'chave', ci ? 'Check-in ' + ci : 'Chegada e saída', co ? 'Checkout ' + co : 'Horários e acesso', ''],
    wa ? [wa, 'whatsapp', 'Anfitrião', 'Falar no WhatsApp', ' target="_blank" rel="noopener"'] : ['#/ajuda', 'fone', 'Ajuda', 'Contatos e emergência', '']
  ];
  return `<ul class="rapido" aria-label="Atalhos rápidos">${it.map(([h, i, t, sub, x]) => `<li><a href="${esc(h)}"${x}>${ic(i)}<div><strong>${esc(t)}</strong><span>${esc(sub)}</span></div></a></li>`).join('')}</ul>`;
}
function painelDia() {
  return `
    <a class="dia-item" href="#/planejar" id="dia-tempo"><span class="rot">${ic('sol')}Agora</span><strong><span class="skeleton"></span></strong><span class="sub">Carregando previsão…</span></a>
    <a class="dia-item" href="#/planejar" id="dia-mare"><span class="rot">${ic('ondas')}Maré baixa</span><strong><span class="skeleton"></span></strong><span class="sub">Estimativa</span></a>
    <a class="dia-item" href="#/planejar" id="dia-sol">${blocoSol(null)}</a>
    ${sugestao()}`;
}
/* Cartão de sugestão. Entre 22h e 6h vira atalho de ajuda (madrugada = quem abre o guia pode estar com um problema).
   O pôr do sol usa o horário real (sunset) quando a previsão carrega; sem ela, uma janela conservadora. */
function sugestao(poeMs) {
  const h = horaLocal(), agora = Date.now();
  const rot = (id, alt) => (ROTEIROS.find(r => r.id === id) ? '#/roteiro/' + id : alt);
  const rioMar = ROTEIROS.find(r => r.id === 'rio-e-mar');
  const antesDoPor = poeMs ? (agora < poeMs && agora >= poeMs - 150 * 6e4) : (h >= 15 && h < 17);
  const depoisDoPor = poeMs ? agora >= poeMs : h >= 17;
  const S = (h >= 22 || h < 6) ? ['Precisa de ajuda agora?', 'Emergência e contatos', 'SAMU 192 · Bombeiros 193 · Polícia 190', '#/ajuda', 'alerta', 'urgente']
    : h < 10 ? ['Para começar', 'Piscinas naturais', 'Veja se a maré ajuda hoje', rot('piscinas-naturais', '#/planejar'), 'estrela']
    : h < 14 ? ['Hora do almoço', 'Sabores locais', 'O que provar e onde comer', '#/comer', 'estrela']
    : antesDoPor && rioMar ? ['Fim de tarde', rioMar.titulo, 'Pôr do sol onde o rio encontra o mar', '#/roteiro/rio-e-mar', 'por-sol']
    : !depoisDoPor ? ['Tarde livre', 'Devagar pelo Marceneiro', 'Capela, riacho e vilinha', rot('devagar-marceneiro', '#/explorar'), 'estrela']
    : ['Para amanhã', 'Planeje o dia', 'Maré, tempo e roteiros', '#/planejar', 'estrela'];
  return `<a class="dia-item destaque${S[5] ? ' ' + S[5] : ''}" id="dia-sug" href="${S[3]}"><span class="rot">${ic(S[4])}${esc(S[0])}</span><strong>${esc(S[1])}</strong><span class="sub">${esc(S[2])}</span></a>`;
}
/* Pôr do sol: previsão quando houver; sem ela, cálculo local (funciona sem sinal). Com a fase da lua. */
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
  const lu = lua(Date.now());
  return `<span class="rot">${ic('por-sol')}Pôr do sol</span><strong>${amanha ? 'Amanhã ' : ''}${hora(poe)}</strong><span class="sub">Nascer: ${hora(nasce)} · ${esc(lu.nome)}</span>`;
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
    if (el('dia-tempo')) el('dia-tempo').innerHTML = `<span class="rot">${ic('sol')}Tempo</span><strong>Ver previsão</strong><span class="sub">Indisponível agora</span>`;
    const sg = el('dia-sug'), c = solCalc(hojeISO(), PONTO().lat, PONTO().lng); if (sg) sg.outerHTML = sugestao(c.poe);
  });
  Promise.all([carregarMare(), carregarClima().catch(() => null)]).then(([m, cl]) => {
    if (!el('dia-mare')) return;
    // Destaque: a próxima baixa COM LUZ DO DIA (baixas de madrugada não servem para as piscinas).
    const b = proximaBaixaClara(m, cl), rr = b && roteiroParaMare(b);
    if (b && rr) el('dia-mare').setAttribute('href', '#/roteiro/' + rr.id);
    el('dia-mare').innerHTML = b ? `<span class="rot">${ic('ondas')}Maré baixa de dia</span><strong>${esc(quandoRel(b.t))}</strong><span class="sub">${b.rotQual ? esc(b.rotQual.replace(/^./, c => c.toUpperCase())) + ' · ' : ''}estimativa, confira a tábua</span>${rr ? `<span class="liga">Combina com: ${esc(rr.titulo)} ${ic('seta', 'ic-sm')}</span>` : ''}`
      : `<span class="rot">${ic('ondas')}Maré</span><strong>Tábua oficial</strong><span class="sub">Veja antes de sair</span>`;
  }).catch(() => {
    if (el('dia-mare')) el('dia-mare').innerHTML = `<span class="rot">${ic('ondas')}Maré</span><strong>Tábua oficial</strong><span class="sub">Toque para ver dicas</span>`;
  });
}

function cardRoteiro(r) { try { return cardRoteiro_(r); } catch (e) { registrarFalha('cardRoteiro ' + (r && r.id || ''), e); return ''; } }
function cardRoteiro_(r) {
  return `<a class="roteiro" href="#/roteiro/${esc(r.id)}">${midia(null, r.ilustracao || 'praia', '', false)}
    <div><span class="olho mar" style="margin-bottom:6px">${esc(r.quando || '')}</span><h3 class="h3">${esc(r.titulo)}</h3><p>${esc(r.subtitulo || '')}</p>
    <span class="link-seta" style="padding:8px 0 0;font-size:0.875rem">${(r.paradas || []).length} paradas ${ic('seta', 'ic-sm')}</span></div></a>`;
}

const dataPadraoRoteiro = () => { const e = estadia(), h = hojeISO(); return e && e.in > h ? e.in : h; };
P.roteiro = (id) => {
  const r = ROTEIROS.find(x => x.id === id);
  if (!r) return cabecalho('Roteiro', 'Roteiro não encontrado.', 'Ele pode ter sido removido ou renomeado.', ['#/explorar', 'Explorar']);
  const precisaMare = (r.paradas || []).some(p => POR_ID[p.lugar] && POR_ID[p.lugar].depende_mare);
  return `
  ${cabecalho(r.quando || 'Roteiro', esc(r.titulo), r.subtitulo, ['#/explorar', 'Explorar'])}
  ${midia(null, r.ilustracao || 'praia', 'capa')}
  ${S('roteiro: paradas', () => `<section class="sec" style="padding-top:32px">
    <div class="grade g-dupla" style="align-items:start;gap:28px">
      <ol class="linha-tempo">${(r.paradas || []).map((p, i) => {
        const l = POR_ID[p.lugar];
        return `<li class="parada"><span class="parada-n" aria-hidden="true">${i + 1}</span><div class="parada-corpo">
          <span class="olho mudo">${esc(p.momento || '')}</span><h2 class="h3">${esc(p.titulo)}</h2><p>${esc(p.texto || '')}</p>
          ${l ? `<button type="button" class="link-seta" style="background:none;border:0;cursor:pointer;padding:4px 0" data-abrir="${esc(l.id)}">${esc(l.nome)} ${ic('seta', 'ic-sm')}</button>` : ''}
        </div></li>`;
      }).join('')}</ol>
      <aside class="grade" style="gap:12px">
        <div class="painel"><dl class="dados"><div><dt>Quando</dt><dd>${ou(r.quando)}</dd></div><div><dt>Ideal para</dt><dd>${ou(r.ideal)}</dd></div></dl></div>
        ${precisaMare ? `<div class="aviso mar">${ic('ondas')}<span>Este roteiro depende da maré baixa. <a href="#/planejar">Veja a estimativa de hoje</a> e confirme na tábua oficial.</span></div>` : ''}
        <div class="painel no-print" style="display:grid;gap:var(--e3)"><span class="olho" style="margin:0">Para não esquecer</span>
          <div class="campo"><label for="rot-data">Em que dia você vai?</label><input type="text" data-cal="unico" id="rot-data" value="${esc(dataPadraoRoteiro())}" data-cal-min="${esc(hojeISO())}" placeholder="AAAA-MM-DD"></div>
          <button type="button" class="btn btn-sec btn-peq" data-ics-roteiro="${esc(r.id)}">${ic('calendario', 'ic-sm')}Adicionar ao calendário</button>
          ${seletorDia('r:' + r.id)}</div>
        ${botaoWa('Pedir ajuda para organizar', `Olá! Quero fazer o roteiro "${r.titulo}". Pode me ajudar?`, 'btn-sec', true)}
      </aside>
    </div>
  </section>`)}`;
};

P.explorar = () => {
  const base = LUGARES.filter(l => catDe(l).grupo === 'explorar');
  const tipos = [['todos', 'Tudo']].concat(['praia', 'passeio', 'natureza', 'cultura', 'compras'].filter(k => base.some(l => l.categoria === k)).map(k => [k, CAT[k].rot + (k === 'praia' ? 's' : k === 'passeio' ? 's' : '')]));
  let vis = base;
  if (estado.tipo !== 'todos') vis = vis.filter(l => l.categoria === estado.tipo);
  if (estado.area !== 'todas') vis = vis.filter(l => l.area === estado.area);
  if (estado.tag) vis = vis.filter(l => (l.tags || []).includes(estado.tag));
  const areas = [['todas', 'Toda a rota']].concat(AREAS.filter(a => base.some(l => l.area === a)).map(a => [a, a]));
  const mapa = estado.vista === 'mapa';
  return `
  ${cabecalho('Rota dos Milagres', 'Pequenos caminhos, <em class="it">grandes descobertas</em>.', 'De Barra de Camaragibe a Japaratinga: praias de mar calmo, piscinas naturais, peixe-boi e vilas de pescadores.')}
  ${S('explorar: roteiros', () => ROTEIROS.length ? `<section class="sec" style="padding-top:28px" aria-labelledby="h-rots">
    <div class="sec-cab"><h2 id="h-rots" class="h3" style="font-size:1.5rem">Roteiros prontos</h2></div>
    <div class="roteiros roteiros-trilho">${ROTEIROS.map(cardRoteiro).join('')}</div></section>` : '')}
  ${S('explorar: lugares', () => `<section class="sec" style="padding-top:48px" aria-labelledby="h-lug">
    <div class="sec-cab"><h2 id="h-lug" class="h3" style="font-size:1.5rem">Lugares</h2>
      <div class="segmento" role="group" aria-label="Visualização"><button type="button" data-vista="lista" aria-pressed="${!mapa}">${ic('lista', 'ic-sm')}Lista</button><button type="button" data-vista="mapa" aria-pressed="${mapa}">${ic('pino', 'ic-sm')}Mapa</button></div></div>
    <div style="display:grid;gap:10px;margin-bottom:24px">
      ${chips(tipos, estado.tipo, 'tipo')}
      ${areas.length > 2 ? chips(areas, estado.area, 'area') : ''}
      ${chips(TAGS.filter(([t]) => base.some(l => (l.tags || []).includes(t))).map(([v, r]) => [v, r]), estado.tag, 'tag')}
    </div>
    ${mapa ? `<div class="mapa" id="mapa"></div><p class="fonte" style="margin:10px 6px 28px">Pontos tracejados têm localização aproximada. Para a rota exata, use o botão “Como chegar” de cada lugar.</p>` : ''}
    <p class="sr-only" aria-live="polite">${vis.length} lugares encontrados</p>
    ${vis.length ? `<div class="cards">${vis.map(cardLugar).join('')}</div>` : vazio('Nada com esses filtros', 'Tente outra combinação ou volte para “Tudo”.', 'bussola')}
  </section>`)}
  <section class="sec"><div class="aviso mar">${ic('folha')}<span>A rota fica na APA Costa dos Corais, a maior unidade de conservação marinha costeira do Brasil. Nas piscinas naturais, não pise nem toque nos corais e não alimente os peixes.</span></div></section>`;
};

const TIPOS_COMER = ['Frutos do mar', 'Cozinha alagoana', 'Almoço', 'Jantar especial', 'Café e padaria', 'Para levar', 'Mercado', 'Entrega', 'Experiência privada'];
P.comer = () => {
  const base = LUGARES.filter(l => catDe(l).grupo === 'comer');
  const tipos = TIPOS_COMER.filter(t => base.some(l => l.tipo === t));
  const vis = estado.comer === 'todos' ? base : base.filter(l => l.tipo === estado.comer);
  const grupos = {}; vis.forEach(l => (grupos[l.tipo || 'Outros'] = grupos[l.tipo || 'Outros'] || []).push(l));
  return `
  ${cabecalho('Onde comer', 'Sabores que <em class="it">contam histórias</em>.', base.length ? 'Mesas, cafés e mercados escolhidos pela qualidade, pela autenticidade e pela conveniência.' : 'Mesas, cafés e mercados que o anfitrião está visitando e conferindo.')}
  ${S('comer: filtros', () => tipos.length > 1 ? `<section class="sec" style="padding-top:24px">${chips([['todos', 'Tudo']].concat(tipos.map(t => [t, t])), estado.comer, 'comer')}</section>` : '')}
  ${S('comer: lugares', () => base.length ? TIPOS_COMER.concat(['Outros']).filter(k => grupos[k]).map(k => `
    <section class="sec" style="padding-top:36px" aria-label="${esc(k)}"><div class="sec-cab"><h2 class="h3" style="font-size:1.5rem">${esc(k)}</h2></div><div class="cards">${grupos[k].map(cardLugar).join('')}</div></section>`).join('')
  : `<section class="sec" style="padding-top:28px">${vazio('Curadoria em andamento', 'O anfitrião está visitando e confirmando cada endereço — horário, contato e faixa de preço — antes de indicar. ' + (waAnfitriao() ? 'Enquanto isso, peça uma dica pelo WhatsApp.' : 'Enquanto isso, veja abaixo o que provar na região.'), 'garfo')}<div style="margin-top:14px">${botaoWa('Pedir indicação ao anfitrião', `Olá! Pode me indicar um lugar bom para comer hoje?`, 'btn-sec', true)}</div></section>`)}
  ${S('comer: o que provar', () => `<section class="sec" aria-labelledby="h-prov2">
    <div class="sec-cab"><div><span class="olho">Cozinha alagoana</span><h2 id="h-prov2" class="h2">O que provar.</h2></div></div>
    <div class="provar">${(C.provar || []).map(p => `<div class="prato"><strong>${esc(p.nome)}</strong><span>${esc(p.descricao)}</span></div>`).join('')}</div>
  </section>`)}`;
};

/* Almanaque do dia: sol e lua calculados aqui; água e UV quando a previsão responde; "Hoje" cruza maré e roteiro. */
const ALM = { clima: null, agua: null, mare: null };
function almanaqueHTML() {
  const p = PONTO(), hoje = hojeISO(), c = ALM.clima, d = c && c.daily;
  let nasce, poe, real = false;
  if (d && d.sunrise && d.sunrise[0]) { nasce = new Date(d.sunrise[0] + ':00' + offsetTZ()); poe = new Date(d.sunset[0] + ':00' + offsetTZ()); real = true; }
  else { const k = solCalc(hoje, p.lat, p.lng); nasce = new Date(k.nasce); poe = new Date(k.poe); }
  const luz = Math.round((poe - nasce) / 6e4), lu = lua(Date.now());
  const dCurta = (ms) => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: TZ }).format(new Date(ms)).replace('.', '');
  const tiles = [
    `<div class="alm"><span class="rot">${ic('sol')}Sol</span><strong>${hora(nasce)} <span aria-hidden="true" style="color:var(--terracota)">→</span><span class="sr-only"> a </span> ${hora(poe)}</strong><small>${Math.floor(luz / 60)}h${String(luz % 60).padStart(2, '0')} de luz · ${real ? 'previsão Open-Meteo' : 'cálculo astronômico local'}</small></div>`,
    `<div class="alm">${luaSVG(lu.f, lu.nome + ', ' + Math.round(lu.ilum * 100) + '% iluminada, como se vê do hemisfério sul')}<strong style="font-size:1.5rem">${esc(lu.nome)}</strong><small>${Math.round(lu.ilum * 100)}% iluminada · cheia ${esc(dCurta(lu.cheia))} · nova ${esc(dCurta(lu.nova))}</small></div>`
  ];
  if (ALM.agua) tiles.push(`<div class="alm" id="alm-agua"><span class="rot">${ic('gota')}Água do mar</span><strong>${ALM.agua.v.toFixed(1).replace('.', ',')} °C</strong><small>Temperatura da superfície estimada por modelo (Open-Meteo Marine)</small></div>`);
  if (d && d.uv_index_max && d.uv_index_max[0] != null) { const [n, k, rec] = uvInfo(d.uv_index_max[0]);
    tiles.push(`<div class="alm" id="alm-uv"><span class="rot">${ic('sol-forte')}Índice UV máximo</span><strong>${Math.round(d.uv_index_max[0])} <span class="alm-uv uv-${k}">${esc(n)}</span></strong><small>${esc(rec)}</small></div>`); }
  // Hoje: maré com luz do dia × roteiro
  let hojeTxt;
  if (ALM.mare) {
    const b = proximaBaixaClara(ALM.mare, c), r = roteiroParaMare(b);
    hojeTxt = b ? `<span class="olho mar" style="margin:0">Hoje · maré e roteiro</span><h3 class="h3">Maré baixa com luz do dia: ${esc(quandoRel(b.t))}${b.rotQual ? ` <em style="font-size:.8em">(${esc(b.rotQual)})</em>` : ''}.</h3>
      <p>${r ? `Combina com o roteiro <a href="#/roteiro/${esc(r.id)}">${esc(r.titulo)}</a>. ` : ''}Estimativa por modelo: confira a <a href="https://www.marinha.mil.br/chm/tabuas-de-mare" target="_blank" rel="noopener">tábua oficial</a> antes de sair.${lu.sizigia ? ' Perto da lua cheia ou nova, as marés baixas descem mais (marés de sizígia): boa época para as piscinas.' : ''}</p>`
      : `<span class="olho mar" style="margin:0">Hoje · maré e roteiro</span><h3 class="h3">Sem maré baixa com luz do dia nas próximas horas.</h3><p>${r ? `Um dia bom para <a href="#/roteiro/${esc(r.id)}">${esc(r.titulo)}</a>, que não depende da maré.` : ''}</p>`;
  } else hojeTxt = `<span class="olho mar" style="margin:0">Hoje · maré e roteiro</span><p>${lu.sizigia ? 'Estamos perto da lua cheia ou nova: as marés baixas descem mais (sizígia), boa época para as piscinas. ' : ''}Veja a estimativa da maré logo abaixo e confirme na tábua oficial.</p>`;
  return `<div class="almanaque${tiles.length % 2 ? ' impar' : ''}" style="--n:${tiles.length}">${tiles.join('')}<div class="alm alm-hoje" id="alm-hoje">${hojeTxt}</div></div>`;
}
function preencherAlmanaque() {
  const pinta = () => { const el = document.getElementById('almanaque'); if (el) el.innerHTML = almanaqueHTML(); };
  carregarClima().then(d => { ALM.clima = d; pinta(); }).catch(() => {});
  carregarAgua().then(a => { ALM.agua = a; pinta(); }).catch(() => {});
  carregarMare().then(m => { ALM.mare = m; pinta(); }).catch(() => {});
}

P.planejar = () => `
  ${cabecalho('Planejar o dia', 'Maré, sol e <em class="it">tempo</em>.', 'Na Rota dos Milagres, a maré decide o melhor horário para as piscinas naturais. Aqui você vê o almanaque do dia, a previsão e uma estimativa da maré para organizar o dia.')}
  ${S('planejar: almanaque', () => `<section class="sec" style="padding-top:var(--e6)" aria-labelledby="h-alm">
    <div class="sec-cab"><div><span class="olho">Almanaque · ${esc(dataLonga(hojeISO()))}</span><h2 id="h-alm" class="h2">Hoje na <em>Rota dos Milagres</em></h2></div></div>
    <div id="almanaque">${almanaqueHTML()}</div>
    <p class="fonte" style="margin:10px 4px 0">A lua aparece como se vê daqui, do hemisfério sul. Sol e lua são calculados no aparelho e funcionam sem sinal.</p>
  </section>`)}
  <section class="sec" style="padding-top:var(--e7)" aria-labelledby="h-prev">
    <div class="painel"><div class="sec-cab" style="padding:0;margin-bottom:16px"><h2 id="h-prev" class="h3">Próximos 3 dias</h2><span class="fonte" id="prev-fonte"></span></div>
      <div class="previsao" id="previsao">${[0, 1, 2].map(() => '<div class="dia-prev"><span class="skeleton" style="width:3em"></span><span class="skeleton" style="width:4em"></span></div>').join('')}</div>
    </div>
  </section>
  <section class="sec" style="padding-top:16px" aria-labelledby="h-mare">
    <div class="painel">
      <div class="sec-cab" style="padding:0;margin-bottom:6px"><div><h2 id="h-mare" class="h3">Próximas marés baixas</h2><p class="fonte" style="margin-top:4px">Estimativa por modelo numérico (Open-Meteo Marine) · não serve para navegação</p></div></div>
      <div id="mare"><div class="mapa-msg" style="height:180px"><span class="skeleton" style="width:12em"></span></div></div>
      <div class="aviso" style="margin-top:16px">${ic('alerta')}<span>Os horários são estimados por modelo e podem variar. Antes de sair para as piscinas, confirme na <a href="https://www.marinha.mil.br/chm/tabuas-de-mare" target="_blank" rel="noopener">tábua de marés oficial da Marinha</a> (porto de Maceió) e com o jangadeiro.</span></div>
    </div>
  </section>
  ${S('planejar: dicas de maré', () => `<section class="sec" aria-labelledby="h-dicas-mare">
    <div class="grade g-dupla">
      <div class="painel"><span class="olho mar">Como ler a maré</span><h2 id="h-dicas-mare" class="h3" style="margin-bottom:14px">Piscinas naturais</h2>${lista(REG.mares || [])}</div>
      <div class="painel"><span class="olho">Estações</span><h2 class="h3" style="margin-bottom:14px">Quando ir</h2>${lista(REG.quando_ir || [], 'terra')}</div>
    </div>
  </section>`)}
  ${S('planejar: o que levar', () => LEVAR().length ? `<section class="sec" style="padding-top:var(--e7)" aria-label="O que levar para a praia">${blocoLevar('levar')}</section>` : '')}
  ${S('planejar: se chover', () => `<section class="sec" aria-labelledby="h-chuva"><div class="painel"><span class="olho mudo">Plano B</span><h2 id="h-chuva" class="h3" style="margin-bottom:14px">Se chover</h2>${tem(REG.dias_de_chuva) ? lista(REG.dias_de_chuva) : `<p class="p0 mudo">${emBreve}</p>`}</div></section>`)}`;

function preencherPlanejar() {
  carregarClima().then(d => {
    const el = document.getElementById('previsao'); if (!el) return;
    el.innerHTML = d.daily.time.slice(0, 3).map((t, i) => {
      const [desc, icone] = tempoDe(d.daily.weather_code[i]);
      const dt = new Date(t + 'T12:00:00' + offsetTZ());
      return `<div class="dia-prev">${ic(icone, 'ic-lg')}<span>${i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : esc(diaSemana(dt).replace(/^./, c => c.toUpperCase()))}</span><strong>${Math.round(d.daily.temperature_2m_max[i])}°<span style="font-size:0.9375rem;color:var(--mudo)"> / ${Math.round(d.daily.temperature_2m_min[i])}°</span></strong><span>${esc(desc)}</span><span>Chuva ${d.daily.precipitation_probability_max[i]}% · UV ${Math.round(d.daily.uv_index_max[i])}</span><span>${ic('por-sol', 'ic-sm')} ${hora(new Date(d.daily.sunset[i] + ':00' + offsetTZ()))}</span></div>`;
    }).join('');
    document.getElementById('prev-fonte').innerHTML = `Fonte: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · ${hora(new Date(d._em))}`;
  }).catch(() => { const el = document.getElementById('previsao'); if (el) el.outerHTML = '<p class="mudo p0">Previsão indisponível no momento. Tente novamente mais tarde.</p>'; });
  Promise.all([carregarMare(), carregarClima().catch(() => null)]).then(([m, cl]) => desenharMare(m, cl)).catch(() => {
    const el = document.getElementById('mare'); if (el) el.innerHTML = '<p class="mudo" style="margin:8px 0 0">Estimativa indisponível agora. Use a tábua oficial abaixo.</p>';
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
  // Faixas de noite (pôr do sol → nascer) para mostrar que as baixas noturnas não servem para as piscinas.
  const noites = []; for (let d = ini - 864e5; d <= fim + 864e5; d += 864e5) { const a = solDe(d, clima), b = solDe(d + 864e5, clima); noites.push([Math.max(a.poe, ini), Math.min(b.nasce, fim)]); }
  const faixasNoite = noites.filter(([a, b]) => b > a).map(([a, b]) => `<rect x="${x(a).toFixed(1)}" y="${pt - 6}" width="${(x(b) - x(a)).toFixed(1)}" height="${H - pb - pt + 6}" fill="#1F3D2F" opacity=".07"/>`).join('');
  const futuras = todas.filter(b => b.t > agora - 30 * 6e4);
  const passoH = W < 520 ? 432e5 : 216e5; // marcas a cada 12h no celular, 6h em telas largas
  const meias = []; for (let t = Math.ceil(ini / passoH) * passoH; t <= fim; t += passoH) meias.push(t);
  el.innerHTML = `<div class="mare-grafico"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico da estimativa de maré, sem escala de altura. Próximas marés baixas: ${esc(futuras.slice(0, 4).map(b => quandoRel(b.t) + ' (' + rotBaixa(b) + ')').join('; '))}">
    ${faixasNoite}${meias.map(t => `<line x1="${x(t)}" x2="${x(t)}" y1="${pt - 6}" y2="${H - pb}" stroke="#E5DCCC" stroke-width="1"/><text x="${x(t)}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#665D54" font-family="Inter,sans-serif">${hora(new Date(t)).replace(':00', 'h')}</text>`).join('')}
    <path d="${area}" fill="#1B5A75" opacity=".12"/><path d="${linha}" fill="none" stroke="#1B5A75" stroke-width="2" stroke-linejoin="round"/>
    <line x1="${x(agora)}" x2="${x(agora)}" y1="${pt - 10}" y2="${H - pb}" stroke="#A44F2A" stroke-width="1.5" stroke-dasharray="3 3"/><text x="${x(agora)}" y="${pt - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#A44F2A" font-family="Inter,sans-serif">agora</text>
    ${baixas.map(b => `<circle cx="${x(b.t)}" cy="${y(b.v)}" r="${b.claro ? 6 : 4}" fill="${b.claro ? '#1B5A75' : '#FFFDF9'}" stroke="${b.claro ? '#FFFDF9' : '#665D54'}" stroke-width="2"/><text x="${x(b.t)}" y="${y(b.v) + 18}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${b.claro ? '#13455A' : '#665D54'}" font-family="Inter,sans-serif">${hora(new Date(b.t))}</text>`).join('')}
    <circle id="mare-ponto" r="4" fill="#211D1A" opacity="0"/>
    <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" id="mare-alvo"/>
  </svg><div class="mare-dica" id="mare-dica"></div></div>
  <p class="fonte mare-legenda"><span class="leg leg-dia" aria-hidden="true"></span>baixa com luz do dia <span class="leg leg-noite" aria-hidden="true"></span>baixa de madrugada ou à noite · faixa sombreada = noite. O gráfico mostra só a forma da maré, sem altura: veja a altura em metros na tábua oficial.</p>
  <ul class="mare-baixas" aria-label="Próximas marés baixas">${futuras.slice(0, 6).map(b => `<li class="chip ${b.claro ? 'chip-dia' : 'chip-noite'}${b.maisBaixa ? ' chip-top' : ''}">${ic(b.claro ? 'sol' : 'lua', 'ic-sm')}<span>${esc(quandoRel(b.t))}</span><em>${esc(rotBaixa(b))}</em></li>`).join('')}</ul>
  <p class="fonte p0">Qualificação relativa (mais baixa da semana, boa, média, fraca) comparando as baixas previstas pelo próprio modelo. ${clima ? '' : 'Sem a previsão, o nascer e o pôr do sol são calculados aqui mesmo, pela posição da casa. '}</p>`;
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

P.casa = () => {
  const fotos = casa.fotos || [];
  const gal = fotos.length ? fotos.slice(0, 7).map((f, i) => `<button type="button" class="midia" data-foto="${i}" aria-label="Ampliar foto: ${esc(f.alt || 'foto da casa')}"><img src="${esc(urlSegura(f.src))}" alt="${esc(f.alt || '')}" loading="lazy" decoding="async"></button>`).join('')
    : ['casa', 'praia', 'barra', 'capela', 'vila'].map((c, i) => midia(null, c, '', i === 0 ? undefined : false)).join('');
  const n = (v, r) => `<div class="numero"><strong>${tem(v) ? esc(v) : '—'}</strong><span>${esc(r)}</span></div>`;
  const nums = casa.banheiros != null ? 4 : 3;
  const bloco = (t, it) => `<div class="painel"><h3 class="h3" style="margin-bottom:14px">${esc(t)}</h3>${tem(it) ? lista(it) : `<p class="p0 mudo">${emBreve}</p>`}</div>`;
  return `
  ${cabecalho('A casa' + (casa.area_m2 ? ' · ' + casa.area_m2 + ' m²' : ''), 'Sua casa, <em class="it">seu tempo</em>.', 'Os ambientes, o que está disponível e como aproveitar cada canto.')}
  ${S('casa: galeria', () => `<section class="sec" style="padding-top:24px" aria-label="Galeria"><div class="galeria">${gal}</div>${fotos.length ? '' : '<p class="fonte" style="margin:10px 6px 0">As fotos reais da casa serão publicadas em breve.</p>'}</section>`)}
  ${S('casa: sobre', () => tem(casa.sobre) ? `<section class="sec" style="padding-top:var(--e7)"><p class="lead capitular" style="padding:0 4px">${esc(casa.sobre)}</p></section>` : '')}
  ${S('casa: números', () => `<section class="sec" style="padding-top:28px" aria-label="Números"><div class="numeros" style="--n:${nums};--nm:${nums === 3 ? 3 : 2}">${n(casa.hospedes, 'hóspedes')}${n(casa.quartos, casa.suites ? `quartos · ${casa.suites} suíte${casa.suites > 1 ? 's' : ''}` : 'quartos')}${casa.banheiros != null ? n(casa.banheiros, 'banheiros') : ''}${n(casa.area_m2 ? casa.area_m2 + ' m²' : '', 'de área')}</div>
    ${tem(casa.camas) ? `<div class="painel" style="margin-top:12px"><h3 class="h3" style="margin-bottom:12px">Camas</h3>${lista(casa.camas)}</div>` : ''}</section>`)}
  ${S('casa: ambientes', () => tem(casa.ambientes) ? `<section class="sec" aria-labelledby="h-amb"><div class="sec-cab"><h2 id="h-amb" class="h2">Ambientes</h2></div><div class="cards">${casa.ambientes.map(a => `<article class="card" style="cursor:default">${midia(a.foto, 'casa')}<div class="card-corpo"><h3 class="h3">${esc(a.nome)}</h3><p class="card-resumo">${esc(a.descricao || '')}</p></div></article>`).join('')}</div></section>` : '')}
  ${S('casa: comodidades', () => `<section class="sec" aria-labelledby="h-com"><div class="sec-cab"><h2 id="h-com" class="h2">Comodidades</h2></div>
    ${tem(casa.comodidades) ? `<div class="comodidades">${casa.comodidades.map(c => `<div class="comodidade"><span class="bola b-verde">${ic(ICS[c.icone] || 'check')}</span><div><strong>${esc(c.nome)}</strong><span>${esc(c.descricao || '')}</span></div></div>`).join('')}</div>`
      : vazio('Lista em preparação', 'Aqui aparece apenas o que a casa realmente oferece, confirmado pelo anfitrião.', 'check')}
    <div class="aviso mar" style="margin-top:12px">${ic('wifi')}<span>A senha do Wi-Fi e os códigos de acesso são enviados pelo anfitrião em mensagem privada. Eles não ficam publicados no guia.</span></div></section>`)}
  ${S('casa: combinados', () => `<section class="sec" aria-labelledby="h-reg"><div class="sec-cab"><h2 id="h-reg" class="h2">Combinados</h2></div>
    <div class="grade g-dupla">${bloco('Regras da casa', casa.regras_casa)}${bloco('Regras do condomínio', casa.regras_condominio)}${bloco('Lixo, limpeza e conservação', casa.lixo_limpeza)}${bloco('Segurança', casa.seguranca)}</div></section>`)}
  ${S('casa: dúvidas', () => `<section class="sec" aria-labelledby="h-faq"><div class="sec-cab"><h2 id="h-faq" class="h2">Dúvidas frequentes</h2></div>
    ${tem(casa.faq) ? `<div class="painel" style="padding-top:4px;padding-bottom:4px">${casa.faq.map(q => `<details class="faq"><summary>${esc(q.pergunta)}${ic('mais')}</summary><p>${esc(q.resposta)}</p></details>`).join('')}</div>` : vazio('Perguntas em preparação', 'Instruções de equipamentos e procedimentos comuns aparecem aqui.', 'ajuda')}
    <div style="margin-top:16px">${botaoWa('Tirar uma dúvida', `Olá! Estou na ${NOME} e tenho uma dúvida sobre a casa:`, 'btn-sec', true)}</div></section>`)}`;
};

P.chegada = () => {
  const ch = casa.chegada; const maps = urlSegura(casa.link_maps), rt = rotaCasa();
  // H15: blocos sem conteúdo ficam ocultos; no lugar deles, um único aviso acolhedor.
  const item = (t, v, i) => tem(v) ? `<div class="painel"><span class="bola b-verde" style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:14px">${ic(i)}</span><h3 class="h3" style="margin-bottom:8px">${esc(t)}</h3><p class="p0" style="color:var(--texto);white-space:pre-line">${esc(v)}</p></div>` : '';
  const ao = [item('Até a portaria', ch.como_chegar, 'carro'), item('Na portaria', ch.entrada, 'pessoas'), item('Chaves e acesso', ch.chaves, 'chave'), item('Estacionamento', ch.estacionamento, 'carro')].filter(Boolean);
  const horarios = tem(casa.checkin) || tem(casa.checkout);
  const faltam = [!horarios && 'os horários de entrada e saída', !ao.length && 'como entrar no condomínio e pegar as chaves', !tem(ch.saida) && 'o que fazer na saída', !tem(ch.imprevistos) && 'o que fazer em caso de atraso'].filter(Boolean);
  const listaBr = (a) => a.length > 1 ? a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1] : a[0];
  return `
  ${cabecalho('Chegada e saída', 'Que bom ter <em class="it">você aqui</em>.', 'O essencial para chegar, se acomodar e sair sem pressa.')}
  ${S('chegada: estadia', () => cartaoEstadia())}
  ${S('chegada: endereço', () => `<section class="sec" style="padding-top:24px"><div class="painel" style="display:grid;gap:18px">
    ${horarios ? `<div class="numeros" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div class="numero"><strong>${tem(casa.checkin) ? esc(casa.checkin) : '—'}</strong><span>Check-in</span></div><div class="numero"><strong>${tem(casa.checkout) ? esc(casa.checkout) : '—'}</strong><span>Check-out</span></div></div>` : ''}
    <div style="display:flex;gap:12px;align-items:flex-start">${ic('pino')}<span>${esc(casa.endereco_publico || '')}</span></div>
    <div class="acoes">${rt ? `<a class="btn btn-prim" href="${esc(rt)}" target="_blank" rel="noopener">${ic('pino')}Como chegar</a>` : ''}${botaoWa('Avisar que estou a caminho', `Olá! Sou hóspede da ${NOME} e estou a caminho.`, 'btn-sec', true)}</div>
    ${rt && !maps && !(casa.coordenadas && casa.coordenadas.lat != null) ? '<p class="fonte p0">A rota é calculada pelo endereço do condomínio. Perto da chegada, siga as placas para a Praia do Marceneiro.</p>' : ''}
  </div></section>`)}
  ${S('chegada: aviso', () => faltam.length ? `<section class="sec" style="padding-top:16px"><div class="aviso mar aviso-chegada" role="note">${ic('chave')}<span><strong>Os detalhes da sua chegada vêm do anfitrião.</strong> Antes da sua viagem, ele envia ${esc(listaBr(faltam))}. Assim que estiverem no guia, aparecem aqui.</span></div></section>` : '')}
  ${S('chegada: trajetos', () => tem(ch.trajetos) ? `<section class="sec" aria-labelledby="h-traj"><div class="sec-cab"><div><span class="olho mar">Trajetos</span><h2 id="h-traj" class="h2">Caminho até a casa</h2></div></div>
    <div class="trajetos">${ch.trajetos.map((t, i) => `<div class="trajeto"><span class="bola b-mar">${ic(ICS[t.icone] || t.icone || 'pino')}</span><div><h3 class="h4">${esc(t.titulo)}</h3><p class="p0 mudo">${esc(t.texto)}</p></div></div>`).join('')}</div></section>` : '')}
  ${ao.length ? `<section class="sec" aria-labelledby="h-ao"><div class="sec-cab"><h2 id="h-ao" class="h2">Ao chegar</h2></div>
    <div class="grade g-dupla">${ao.join('')}</div>` : '<section class="sec" style="padding-top:16px">'}
    <div class="aviso" style="margin-top:12px">${ic('cadeado')}<span>Senhas e códigos nunca ficam no guia. O anfitrião envia por mensagem privada, só para hóspedes confirmados.</span></div></section>
  ${S('chegada: saída', () => tem(ch.saida) ? `<section class="sec" aria-labelledby="h-sai"><div class="sec-cab"><h2 id="h-sai" class="h2">Na saída</h2></div>
    <div class="painel"><ol class="passos">${ch.saida.map(s => `<li><span>${esc(s)}</span></li>`).join('')}</ol></div></section>` : '')}
  ${S('chegada: imprevistos', () => tem(ch.imprevistos) ? `<section class="sec" aria-labelledby="h-imp"><div class="sec-cab"><h2 id="h-imp" class="h2">Atrasos e imprevistos</h2></div>${item('O que fazer', ch.imprevistos, 'relogio')}</section>` : '')}`;
};

P.mapa = () => {
  const cats = Object.keys(CAT).filter(k => k !== 'casa' && LUGARES.some(l => l.categoria === k && l.lat != null));
  return `
  ${cabecalho('Mapa da rota', 'Tudo <em class="it">por perto</em>.', 'Toque em um ponto para ver detalhes e abrir a rota no seu aplicativo de mapas.', ['#/explorar', 'Explorar'])}
  <section class="sec" style="padding-top:24px;display:grid;gap:14px">${cats.length > 1 ? chips([['todos', 'Tudo']].concat(cats.map(k => [k, CAT[k].rot])), estado.mapa, 'mapa') : ''}
    <div class="mapa" id="mapa"></div><p class="fonte" style="margin:0 6px">Mapa © colaboradores do OpenStreetMap. Pontos tracejados têm localização aproximada.</p></section>
  ${S('mapa: lista', () => `<section class="sec" aria-labelledby="h-l"><div class="sec-cab"><h2 id="h-l" class="h3">Todos os lugares</h2></div>
    <div class="contatos">${LUGARES.map(l => `<div class="contato"><span class="bola ${catDe(l).bola}" style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex:none">${ic(catDe(l).ic)}</span><div class="contato-txt"><strong>${esc(l.nome)}</strong><span>${esc([catDe(l).rot, l.area].filter(tem).join(' · '))}</span></div><div class="contato-acoes"><button type="button" class="acao" data-abrir="${esc(l.id)}" aria-label="Detalhes: ${esc(l.nome)}">${ic('seta')}</button></div></div>`).join('')}</div></section>`)}`;
};

const NIVEIS = [['emergencia', 'Emergência', 'Ligue na hora.'], ['essencial', 'Serviços essenciais', 'Farmácias, mercados e saúde.'], ['conveniencia', 'Conveniência', 'Transporte, entregas e serviços.'], ['parceiro', 'Parceiros', 'Indicados pelo anfitrião.']];
const SEG_PRAIA = ['Respeite as bandeiras de sinalização e as orientações dos guarda-vidas, quando houver.', 'Antes das piscinas naturais, confira a maré: o acesso depende da maré baixa.', 'Nas áreas de recife, entre no mar com calma e de calçado adequado se preferir.', 'Evite o mar depois de bebida alcoólica ou de refeições pesadas.', 'Crianças sempre acompanhadas, mesmo em águas rasas.', 'Protetor solar, chapéu e água: o sol é intenso o ano inteiro.', 'Emergência no mar (afogamento, embarcação à deriva): Salvamar, da Marinha, no 185.', 'Água-viva ou caravela: não toque nem esfregue. Lave com água do mar, nunca com água doce. Se houver reação forte, falta de ar ou dor intensa, procure atendimento.'];
const AMBIENTE = ['A rota fica na APA Costa dos Corais: não pise nem toque nos corais, que são vivos e frágeis.', 'Não alimente peixes nem outros animais.', 'No passeio do peixe-boi, siga as orientações do guia e não tente tocar os animais.', 'Prefira jangadeiros e guias credenciados.', 'Leve de volta todo o lixo que produzir.'];
P.ajuda = () => {
  const cs = (C.contatos || []).filter(c => c && c.nome);
  const linha = (c) => {
    const t = linkTel(c.telefone), w = linkWa(c.whatsapp), em = c.nivel === 'emergencia';
    const m = String(c.obs || '').match(/^(.*?)\s*Fonte:\s*(.+)$/s);
    const obs = String(m ? m[1] : (c.obs || '')).replace(/ligue antes (\d{3})/g, 'ligue antes para o $1');
    if (em) {
      const txt = [c.horario, obs].filter(tem).map(esc).join(' · ');
      return `<div class="contato"><div class="contato-txt"><span class="selo selo-${esc(c.nivel)}" style="align-self:flex-start">${esc(c.categoria || '')}</span><strong>${esc(c.nome)}</strong>${txt ? `<span>${txt}</span>` : ''}</div>
      <div class="contato-acoes">${w ? `<a class="acao" href="${esc(w)}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(c.nome)}">${ic('msg')}</a>` : ''}${t ? `<a class="acao emerg" href="${esc(t)}" aria-label="Ligar para ${esc(c.nome)}, ${esc(c.telefone)}">${esc(c.telefone)}</a>` : ''}</div></div>`;
    }
    // Serviços (hospital, UPA, farmácia…): número por escrito, rota pelo endereço e aviso de conferência.
    const endereco = tem(c.endereco) ? c.endereco : ((obs.match(/^([^.]*\d[^.]*|(?:Rua|Av\.?|Avenida|Rodovia|AL-\d+)[^.]*)\./) || [])[1] || '');
    const resto = endereco ? obs.replace(endereco + '.', '').trim() : obs;
    const r = rotaEndereco([c.nome, endereco].filter(tem).join(', '));
    const info = [tem(c.horario) ? esc(c.horario) : '<span class="confirmar">horário não informado: ligue antes</span>', c.distancia ? esc(c.distancia) : ''].filter(tem).join(' · ');
    return `<div class="contato contato-servico"><div class="contato-txt"><span class="selo selo-${esc(c.nivel)}" style="align-self:flex-start">${esc(c.categoria || '')}</span><strong>${esc(c.nome)}</strong>
        ${t ? `<span class="contato-num">${ic('fone', 'ic-sm')}${esc(c.telefone)}</span>` : ''}
        ${endereco ? `<span class="contato-end">${ic('pino', 'ic-sm')}${esc(endereco)}</span>` : ''}
        <span>${info}</span>${resto ? `<span>${esc(resto)}</span>` : ''}
        ${tem(c.verificado) ? `<span class="contato-fonte">Conferido pelo anfitrião em ${esc(dataBR(c.verificado))}.${m ? ' Fonte: ' + esc(m[2]) : ''}</span>` : `<span class="contato-fonte nao-conferido">Dados de fonte oficial, ainda não conferidos pelo anfitrião.${m ? ' Fonte: ' + esc(m[2]) : ''}</span>`}</div>
      <div class="contato-botoes">${t ? `<a class="btn btn-prim btn-peq" href="${esc(t)}" aria-label="Ligar para ${esc(c.nome)}, ${esc(c.telefone)}">${ic('fone', 'ic-sm')}Ligar</a>` : ''}${w ? `<a class="btn btn-sec btn-peq" href="${esc(w)}" target="_blank" rel="noopener">${ic('msg', 'ic-sm')}WhatsApp</a>` : ''}${r ? `<a class="btn btn-sec btn-peq" href="${esc(r)}" target="_blank" rel="noopener">${ic('pino', 'ic-sm')}Como chegar</a>` : ''}</div></div>`;
  };
  return `
  ${cabecalho('Ajuda', 'Tudo o que você precisa, <em class="it">por perto</em>.', 'Contatos organizados por urgência e o que saber antes de ir para o mar.')}
  ${S('ajuda: anfitrião', () => `<section class="sec" style="padding-top:24px"><div class="painel" style="display:grid;gap:12px;background:var(--coqueiro);border-color:var(--coqueiro);color:var(--areia)">
    <span class="olho claro" style="margin:0">Anfitrião</span><h2 class="h3" style="color:var(--areia);font-size:1.625rem">${tem(casa.anfitriao) ? esc(casa.anfitriao) : 'Fale com quem cuida da casa'}</h2>
    <p class="p0" style="color:#C9D6CE">Dúvidas, manutenção ou qualquer imprevisto durante a hospedagem.${waAnfitriao() ? '' : ' Por enquanto, fale com o anfitrião pelo mesmo canal em que você fez a reserva.'}</p>${botaoWa('Chamar no WhatsApp', null, 'btn-claro', true)}</div></section>`)}
  ${S('ajuda: contatos', () => `<section class="sec" style="padding-top:8px">${NIVEIS.map(([k, t, s]) => { const l = cs.filter(c => c.nivel === k); return l.length ? `<div class="grupo-tit"><h2 class="h3">${esc(t)}</h2><span class="mudo" style="font-size:0.875rem">${esc(s)}</span></div><div class="contatos">${l.map(linha).join('')}</div>` : ''; }).join('')}
    ${cs.some(c => c.nivel === 'essencial') ? '' : `<div class="grupo-tit"><h2 class="h3">Serviços essenciais</h2></div><div class="vazio" style="padding:18px"><p>Farmácias, mercados e atendimento médico serão adicionados após confirmação. Em urgência, ligue para o SAMU (192).</p></div>`}</section>`)}
  <section class="sec" aria-labelledby="h-mar"><div class="sec-cab"><h2 id="h-mar" class="h2">Antes de ir para o mar</h2></div>
    <div class="grade g-dupla"><div class="painel"><h3 class="h3" style="margin-bottom:14px">Segurança</h3>${lista(SEG_PRAIA)}<a class="link-seta" href="#/planejar">Maré de hoje ${ic('seta')}</a></div><div class="painel"><h3 class="h3" style="margin-bottom:14px">Cuidar do lugar</h3>${lista(AMBIENTE)}</div></div></section>
  ${S('ajuda: dicas', () => tem(REG.dicas) ? `<section class="sec" aria-labelledby="h-dic"><div class="sec-cab"><div><span class="olho">Quem conhece dá a dica</span><h2 id="h-dic" class="h2">Bom saber antes de sair</h2></div></div><div class="painel">${lista(REG.dicas, 'terra')}</div></section>` : '')}
  ${S('ajuda: locomoção', () => `<section class="sec" aria-labelledby="h-mov"><div class="sec-cab"><h2 id="h-mov" class="h2">Como se locomover</h2></div><div class="painel">${tem(REG.mobilidade) ? lista(REG.mobilidade) : `<p class="p0 mudo">${emBreve}</p>`}</div></section>`)}`;
};

function beneficiosAtivos() { const h = hojeISO(); return (C.beneficios || []).filter(b => b && b.ativo !== false && b.parceiro && b.titulo && (!tem(b.validade) || b.validade >= h)); }
function cardBeneficio(b) { try { return cardBeneficio_(b); } catch (e) { registrarFalha('cardBeneficio ' + (b && b.id || ''), e); return ''; } }
function cardBeneficio_(b) {
  const w = linkWa(b.whatsapp, `Olá! Sou hóspede da ${NOME} e gostaria de usar o benefício: ${b.titulo}.`), l = urlSegura(b.link);
  return `<article class="painel beneficio"><span class="selo selo-parceiro" style="align-self:flex-start">${esc(b.parceiro)}</span><h3 class="h3">${esc(b.titulo)}</h3>${tem(b.descricao) ? `<p class="p0" style="color:var(--texto)">${esc(b.descricao)}</p>` : ''}
    <dl class="dados"><div><dt>Condições</dt><dd>${ou(b.condicoes, '—')}</dd></div><div><dt>Validade</dt><dd>${tem(b.validade) ? 'até ' + esc(dataBR(b.validade)) : 'sem data'}</dd></div>${tem(b.restricoes) ? `<div style="grid-column:span 2"><dt>Restrições</dt><dd>${esc(b.restricoes)}</dd></div>` : ''}</dl>
    ${tem(b.codigo) ? `<div class="codigo"><span>${esc(b.codigo)}</span><button type="button" class="btn btn-sec btn-peq" data-copiar="${esc(b.codigo)}">${ic('copiar', 'ic-sm')}Copiar</button></div>` : ''}
    ${w ? `<a class="btn btn-prim" href="${esc(w)}" target="_blank" rel="noopener">${ic('msg')}Solicitar</a>` : l ? `<a class="btn btn-prim" href="${esc(l)}" target="_blank" rel="noopener">Usar benefício</a>` : ''}</article>`;
}
P.beneficios = () => { const b = beneficiosAtivos(); return `${cabecalho('Só para hóspedes', 'Benefícios <em class="it">exclusivos</em>.', 'Condições combinadas com parceiros da região.')}
  ${S('benefícios: lista', () => `<section class="sec" style="padding-top:24px">${b.length ? `<div class="cards">${b.map(cardBeneficio).join('')}</div>` : vazio('Parcerias em preparação', 'Estamos combinando condições especiais com restaurantes, passeios e serviços da região. Elas aparecem aqui assim que forem confirmadas.', 'presente')}</section>`)}`; };

function avaliacoesOk() { return (C.avaliacoes || []).filter(a => a && a.autorizada === true && tem(a.texto)); }
const estrelas = (n) => { n = Math.max(0, Math.min(5, Math.round(+n || 0))); return n ? `<div class="estrelas" role="img" aria-label="Nota ${n} de 5">${Array.from({ length: 5 }, (_, i) => `<svg viewBox="0 0 24 24" fill="${i < n ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><use href="#i-estrela"/></svg>`).join('')}</div>` : ''; };
const cardAvaliacao = (a) => S('avaliação', () => `<figure class="painel avaliacao">${estrelas(a.nota)}<blockquote>“${esc(a.texto)}”</blockquote><figcaption class="mudo" style="font-size:0.875rem;font-weight:600">${[a.autor, a.periodo, a.origem].filter(tem).map(esc).join(' · ')}</figcaption></figure>`);
P.avaliacoes = () => { const a = avaliacoesOk(); const media = a.filter(x => x.nota).reduce((s, x, _, arr) => s + x.nota / arr.length, 0);
  return `${cabecalho('Quem já esteve aqui', 'Palavras de <em class="it">hóspedes</em>.', 'Publicadas somente com autorização de quem escreveu.')}
  ${S('avaliações: lista', () => `<section class="sec" style="padding-top:24px">${a.length ? `${media ? `<div class="painel" style="display:flex;gap:16px;align-items:center;margin-bottom:20px"><strong class="display" style="font-size:3.25rem;color:var(--coqueiro)">${media.toFixed(1).replace('.', ',')}</strong><div>${estrelas(media)}<span class="mudo" style="font-size:0.875rem">${a.length} avaliação(ões)</span></div></div>` : ''}<div class="cards">${a.map(cardAvaliacao).join('')}</div>` : vazio('Ainda sem avaliações publicadas', 'Assim que hóspedes autorizarem, os depoimentos aparecem aqui.', 'estrela')}</section>`)}
  <section class="sec"><a class="btn btn-sec" href="#/feedback">${ic('estrela')}Deixar meu feedback</a></section>`; };

const TEMAS_FB = ['Limpeza', 'Conforto', 'Cozinha', 'Internet', 'Comunicação', 'Localização', 'Passeios', 'Outro'];
P.feedback = () => {
  const ok = tem(CFG.feedback_endpoint) || !!waAnfitriao();
  return `${cabecalho('Feedback privado', 'Como está sendo <em class="it">sua estadia</em>?', 'Sua mensagem vai só para o anfitrião. Leva menos de um minuto.')}
  <section class="sec" style="padding-top:24px;max-width:760px" id="fb-area">
    ${ok ? '' : `<div class="aviso" role="note" style="margin-bottom:16px">${ic('alerta')}<span><strong>O envio por aqui ainda não está ativo.</strong> O anfitrião está configurando este canal. Por enquanto, conte sua experiência pelo mesmo canal em que você fez a reserva.</span></div>`}
    <form class="painel form" id="form-feedback" novalidate${ok ? '' : ' aria-disabled="true"'}><fieldset class="form" style="display:contents"${ok ? '' : ' disabled'}>
      <fieldset class="campo"><legend id="leg-nota">Sua nota para a experiência</legend>
        <div class="notas" role="radiogroup" aria-labelledby="leg-nota" aria-describedby="erro-nota">${[[1, 'Ruim'], [2, 'Fraca'], [3, 'Ok'], [4, 'Boa'], [5, 'Ótima']].map(([n, r]) => `<input type="radio" name="nota" id="nota${n}" value="${n}"><label for="nota${n}">${n}<small>${r}</small></label>`).join('')}</div>
        <span class="erro" id="erro-nota" aria-live="polite" hidden>Escolha uma nota de 1 a 5.</span></fieldset>
      <fieldset class="campo"><legend>É sobre o quê? <span class="mudo" style="font-weight:500">(opcional)</span></legend>
        <div class="opcoes">${TEMAS_FB.map((t, i) => `<input type="checkbox" name="tema" id="tema${i}" value="${t}"><label for="tema${i}">${t}</label>`).join('')}</div></fieldset>
      <div class="campo"><label for="fb-msg">Mensagem</label><textarea id="fb-msg" name="mensagem" maxlength="1500" aria-describedby="fb-ajuda erro-msg" required></textarea>
        <span class="ajuda" id="fb-ajuda">O que funcionou, o que podemos melhorar ou o que precisa de atenção.</span><span class="erro" id="erro-msg" aria-live="polite" hidden>Escreva pelo menos 10 caracteres.</span></div>
      <div class="campo"><label for="fb-nome">Seu nome <span class="mudo" style="font-weight:500">(opcional)</span></label><input type="text" id="fb-nome" name="nome" maxlength="60" autocomplete="given-name"></div>
      <div class="check"><input type="checkbox" id="fb-pub" name="publicar"><label for="fb-pub">Autorizo publicar meu comentário como avaliação no guia, apenas com meu primeiro nome.</label></div>
      <input class="mel" type="text" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">
      ${ok ? `<button type="submit" class="btn btn-prim">${ic('enviar')}Enviar feedback</button>` : `<button type="submit" class="btn" disabled>Envio ainda não ativo</button>`}
      <p class="fonte p0">${tem(CFG.feedback_endpoint) ? 'Sua mensagem vai só para o anfitrião, numa planilha privada do Google. Nome é opcional. Guardamos os comentários por até 2 anos, para cuidar melhor da casa, e só publicamos o seu se você marcar a autorização acima, apenas com o primeiro nome.' : 'Sua mensagem vai só para o anfitrião. Nome é opcional, e só publicamos o seu comentário se você marcar a autorização acima, apenas com o primeiro nome.'} Quer apagar o que escreveu? É só pedir ${waAnfitriao() ? 'pelo WhatsApp' : 'pelo mesmo canal da reserva'}. <a href="#/privacidade">Privacidade</a>.</p>
    </fieldset></form></section>`;
};

/* ---------- Meu roteiro ---------- */
let MR_RECEBIDO = null; // roteiro aberto por link compartilhado (ainda não salvo neste aparelho)
let MR_MARE = null;
P['meu-roteiro'] = () => {
  const qs = new URLSearchParams((location.hash.split('?')[1]) || '');
  if (qs.get('r')) { MR_RECEBIDO = mrDecodificar(qs.get('r')); history.replaceState(history.state, '', '#/meu-roteiro'); ultimoHash = '#/meu-roteiro'; }
  const recebido = MR_RECEBIDO;
  const r = recebido ? { ini: recebido.ini, dias: recebido.dias.map(d => d.filter(mrItem)), daEstadia: false } : mrNormalizar(mrLer());
  const e = estadia(), total = r.dias.reduce((a, d) => a + d.length, 0);
  const opcoes = `<option value="">Escolher roteiro ou lugar…</option><optgroup label="Roteiros do anfitrião">${ROTEIROS.map(x => `<option value="r:${esc(x.id)}">${esc(x.titulo)}</option>`).join('')}</optgroup>`
    + ['explorar', 'comer'].map(g => { const ls = LUGARES.filter(l => catDe(l).grupo === g); return ls.length ? `<optgroup label="${g === 'comer' ? 'Onde comer' : 'Praias e passeios'}">${ls.map(l => `<option value="l:${esc(l.id)}">${esc(l.nome)}</option>`).join('')}</optgroup>` : ''; }).join('');
  const mareDia = (i) => {
    if (!r.ini || !MR_MARE) return '';
    const dia = somaDias(r.ini, i), bs = baixasQualificadas(MR_MARE.m, MR_MARE.c).filter(b => diaISO(b.t) === dia && b.claro);
    const fora = MR_MARE.m.pts.length && dia > diaISO(MR_MARE.m.pts[MR_MARE.m.pts.length - 1][0]);
    if (fora || dia < hojeISO()) return '';
    return bs.length ? `Maré baixa de dia: ${bs.map(b => hora(new Date(b.t)) + (b.rotQual ? ' (' + b.rotQual + ')' : '')).join(' e ')}` : 'Sem maré baixa com luz do dia nesse dia';
  };
  const dias = r.dias.map((d, i) => {
    const mt = mareDia(i), temMare = d.some(c => (mrItem(c) || {}).mare);
    return `<article class="mr-dia" aria-labelledby="mr-d${i}"><div class="mr-dia-cab"><span class="n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h2 class="h3" id="mr-d${i}">${r.ini ? esc(dataLonga(somaDias(r.ini, i))).replace(/^./, c => c.toUpperCase()) : 'Dia ' + (i + 1)}</h2>${e && i === 0 ? '<small>chegada</small>' : e && i === r.dias.length - 1 ? '<small>check-out</small>' : ''}</div>
      ${d.length ? `<ol class="mr-itens">${d.map((c, k) => { const it = mrItem(c);
        return `<li class="mr-item"><span class="bola ${it.bola}">${ic(it.ic)}</span><span class="mr-item-txt">${it.href ? `<a href="${esc(it.href)}">${esc(it.nome)}</a>` : `<button type="button" data-abrir="${esc(it.abrir)}">${esc(it.nome)}</button>`}<small>${esc(it.sub)}</small>${it.mare && temMare && mt ? `<small class="mare-av">${ic('ondas', 'ic-sm')} ${esc(mt)} · confira a tábua</small>` : it.mare ? '<small class="mare-av">Depende da maré baixa</small>' : ''}</span>
          ${recebido ? '' : `<span class="mr-mover no-print"><button type="button" data-mr="cima" data-d="${i}" data-k="${k}" aria-label="Subir ${esc(it.nome)}"${k === 0 && i === 0 ? ' disabled' : ''}>${ic('cima', 'ic-sm')}</button><button type="button" data-mr="baixo" data-d="${i}" data-k="${k}" aria-label="Descer ${esc(it.nome)}"${k === d.length - 1 && i === r.dias.length - 1 ? ' disabled' : ''}>${ic('baixo', 'ic-sm')}</button><button type="button" data-mr="tirar" data-d="${i}" data-k="${k}" aria-label="Tirar ${esc(it.nome)} do roteiro">${ic('x', 'ic-sm')}</button></span>`}</li>`; }).join('')}</ol>`
      : `<p class="mr-vazio">Dia livre${i === 0 && e ? ': chegada e descanso' : ''}.</p>`}
      ${recebido ? '' : `<div class="mr-add no-print"><label class="sr-only" for="mr-sel${i}">Adicionar ao dia ${i + 1}</label><select id="mr-sel${i}" data-mr-sel="${i}">${opcoes}</select><button type="button" class="btn btn-sec btn-peq" data-mr="add" data-d="${i}">${ic('mais', 'ic-sm')}Adicionar</button></div>`}
    </article>`;
  }).join('');
  return `
  <div class="mr-impresso" aria-hidden="true">${window.Marca ? Marca.horizontal({ tema: 'claro', titulo: '' }) : ''}<span>Roteiro${e ? ' de ' + esc(e.primeiro) : ''} · ${esc(urlGuia().replace(/^https?:\/\//, ''))}</span></div>
  ${cabecalho('Meu roteiro', recebido ? 'Um roteiro <em class="it">para você</em>.' : 'Sua estadia, <em class="it">dia a dia</em>.', recebido ? 'Alguém compartilhou este roteiro com você. Guarde no seu aparelho para editar.' : 'Monte os dias com os roteiros do anfitrião e os lugares do guia. Fica salvo só neste aparelho; compartilhe por link ou imprima.')}
  ${recebido ? `<section class="sec" style="padding-top:var(--e5)"><div class="aviso mar">${ic('link')}<span>Roteiro recebido por link${recebido.ini ? ', a partir de ' + esc(dataLonga(recebido.ini)) : ''}. ${total} ${total === 1 ? 'item' : 'itens'}.</span></div><div class="acoes" style="margin-top:var(--e4)"><button type="button" class="btn btn-prim" data-mr="salvar-recebido">${ic('check')}Guardar no meu aparelho</button><button type="button" class="btn btn-sec" data-mr="descartar">Ver o meu roteiro</button></div></section>` : `
  <section class="sec no-print" style="padding-top:var(--e5)"><div class="painel mr-config">
    ${e ? `<p class="p0" style="flex:1 1 260px">Os dias seguem a sua estadia: ${esc(dataLonga(e.in))} a ${esc(dataLonga(e.out))}.</p>`
      : `<div class="campo"><label for="mr-ini">Primeiro dia (opcional)</label><input type="text" data-cal="unico" id="mr-ini" value="${esc(r.ini)}" placeholder="AAAA-MM-DD"></div>
         <div class="acoes"><button type="button" class="btn btn-sec btn-peq" data-mr="mais-dia"${r.dias.length >= 14 ? ' disabled' : ''}>${ic('mais', 'ic-sm')}Mais um dia</button><button type="button" class="btn btn-sec btn-peq" data-mr="menos-dia"${r.dias.length <= 1 ? ' disabled' : ''}>Menos um dia</button></div>`}
  </div></section>`}
  <section class="sec" style="padding-top:var(--e5)"><div class="mr-dias">${dias}</div></section>
  ${recebido ? '' : `<section class="sec no-print" style="padding-top:var(--e6)"><div class="acoes">
    <button type="button" class="btn btn-prim" data-mr="compartilhar"${total ? '' : ' disabled'}>${ic('compartilhar', 'ic-sm')}Compartilhar por link</button>
    <button type="button" class="btn btn-sec" data-mr="imprimir"${total ? '' : ' disabled'}>${ic('imprimir', 'ic-sm')}Imprimir</button>
    ${r.ini ? `<button type="button" class="btn btn-sec" data-mr="ics"${total ? '' : ' disabled'}>${ic('calendario', 'ic-sm')}Adicionar ao calendário</button>` : ''}
    <button type="button" class="btn-texto" data-mr="limpar"${total ? '' : ' hidden'}>Apagar o roteiro</button></div>
    <p class="fonte" style="margin:var(--e3) 4px 0">O link leva só os itens escolhidos e as datas, nunca o seu nome.</p></section>`}`;
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
  if (acao === 'limpar') { if (!confirm('Apagar todo o roteiro deste aparelho?')) return; LS.apagar('guia:roteiro'); return gravar(); }
  if (acao === 'imprimir') return window.print();
  if (acao === 'compartilhar') {
    const url = urlGuia() + '#/meu-roteiro?r=' + mrCodificar(r);
    const dados = { title: 'Roteiro na Rota dos Milagres', text: `Roteiro de ${r.dias.length} dias montado no guia da ${NOME}`, url };
    if (navigator.share) navigator.share(dados).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Link do roteiro copiado')).catch(() => toast(url)); else toast(url);
    window.__ultimoLinkRoteiro = url; return;
  }
  if (acao === 'ics') {
    const ev = r.dias.map((dd, i) => dd.length ? { data: somaDias(r.ini, i), titulo: `Dia ${i + 1} · ${dd.map(c => mrItem(c).nome).join(' + ')}`.slice(0, 140), url: urlGuia() + '#/meu-roteiro',
      descricao: dd.map(c => { const it = mrItem(c); return '• ' + it.nome + (it.mare ? ' (depende da maré baixa: confira a tábua)' : ''); }).join('\n') } : null).filter(Boolean);
    return baixarICS('meu-roteiro-casa-18-anahi.ics', ev);
  }
  if (acao === 'salvar-recebido') {
    const atual = mrLer(), tem_ = atual.dias.some(x => x.length);
    if (tem_ && !confirm('Substituir o roteiro que já está neste aparelho?')) return;
    LS.gravar('guia:roteiro', { ini: MR_RECEBIDO.ini, dias: MR_RECEBIDO.dias }); MR_RECEBIDO = null; toast('Roteiro guardado neste aparelho'); return render('nav');
  }
  if (acao === 'descartar') { MR_RECEBIDO = null; return render('nav'); }
}
function preencherMeuRoteiro() {
  if (MR_MARE) return;
  Promise.all([carregarMare(), carregarClima().catch(() => null)]).then(([m, c]) => { MR_MARE = { m, c }; if (rotaAtual().r === 'meu-roteiro') { const y = window.scrollY; render('filtro'); window.scrollTo(0, y); } }).catch(() => {});
}

/* ---------- Privacidade ---------- */
P.disponibilidade = () => {
  if (agendaAtiva()) return `${cabecalho('Disponibilidade', 'Datas <em>livres</em>.', 'O calendário da casa, espelhado do anúncio. Dias riscados já estão reservados.')}${S('disponibilidade: agenda', () => blocoAgenda(true))}`;
  const res = linkReserva();
  return `${cabecalho('Disponibilidade', 'Datas <em>livres</em>.', '')}<section class="sec" style="padding-top:var(--e5)"><div class="acoes">${res ? `<a class="btn btn-prim" href="${esc(res)}" target="_blank" rel="noopener">${ehAirbnb(res) ? 'Ver disponibilidade no Airbnb' : 'Ver disponibilidade'}${ic('seta', 'ic-sm')}</a>` : ''}<a class="btn btn-sec" href="#/inicio">${ic('casa', 'ic-sm')}Ir para o início</a></div></section>`;
};
P.privacidade = () => {
  const wa = waAnfitriao(), quem = tem(casa.anfitriao) ? esc(casa.anfitriao) : 'o anfitrião da casa';
  const guardados = CHAVES_HOSPEDE.filter(temGuardado).length;
  return `${cabecalho('Privacidade', 'O que fica <em class="it">com você</em>.', 'Este guia não tem cadastro nem rastreamento. Não usamos cookies de publicidade nem medimos visitas.')}
  <section class="sec privacidade" style="padding-top:var(--e5)"><div class="painel" style="display:grid;gap:var(--e4)">
    <h2 class="h3">No seu celular</h2>
    <p class="p0">Se você abriu o link personalizado, seu primeiro nome e as datas da estadia ficam guardados só neste aparelho, para a saudação e os lembretes. O mesmo vale para o checklist de praia, o seu roteiro, o modo sol e o aviso de instalação. O nome e as datas da estadia se apagam sozinhos dois dias depois do check-out. O checklist, o roteiro e as preferências ficam até você apagar, a qualquer momento, no botão abaixo.</p>
    <div class="acoes" style="align-items:center"><button type="button" class="btn btn-prim" data-limpar-tudo>${ic('lixo', 'ic-sm')}Limpar meus dados</button><span class="fonte" data-guardados>${guardados ? guardados + (guardados === 1 ? ' item guardado' : ' itens guardados') + ' neste aparelho' : 'Nada guardado neste aparelho'}</span></div>
    <h2 class="h3">Serviços usados</h2>
    <p class="p0">Previsão do tempo, maré e temperatura da água (Open-Meteo) e mapa (OpenStreetMap). Eles recebem o endereço de internet do aparelho, como qualquer site. As fontes do guia são servidas por ele mesmo. Seu nome nunca é enviado a esses serviços.</p>
    <h2 class="h3">Feedback</h2>
    <p class="p0">${tem(CFG.feedback_endpoint) ? 'Fica numa planilha privada do anfitrião (Google). Guardamos os comentários por até 2 anos, para cuidar melhor da casa.' : 'Quando o envio estiver ativo, os comentários ficarão numa planilha privada do anfitrião (Google), por até 2 anos.'} Responsável: ${quem}${wa ? ', pelo <a href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp</a>' : ', pelo mesmo canal em que você fez a reserva'}. Para pedir a exclusão do que escreveu, é só falar com ele.</p>
  </div></section>`;
};

/* ---------- detalhe de lugar ---------- */
let ultimoFoco = null;
/* Histórico: abrir a ficha cria uma entrada (pushState), então o Voltar do celular fecha a ficha e mantém a página e os filtros.
   modo: undefined = nova entrada · 'substituir' = troca a entrada atual · true = sem mexer no histórico (link direto). */
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
  d.innerHTML = `
    <div class="folha-topo"><span></span><button type="button" class="btn-ic" data-fechar aria-label="Fechar">${ic('x')}</button></div>
    ${midiaLugar(l, 'capa-folha', '', true)}
    <div class="folha-corpo">
      <div style="display:flex;gap:6px;flex-wrap:wrap">${selos(l).replace(/selo-claro/g, 'selo-mare')}</div>
      <div><span class="olho ${comer ? '' : 'mar'}">${esc(c.rot)}${l.tipo ? ' · ' + esc(l.tipo) : ''}</span><h2 id="folha-titulo" class="h2">${esc(l.nome)}</h2></div>
      <p class="p0" style="color:var(--texto);font-size:1.03125rem">${tem(l.descricao) ? esc(l.descricao) : esc(l.resumo || '')}</p>
      ${tem(l.dica) ? `<div class="dica">${ic('estrela')}<span><strong>${tem(l.verificado) ? 'Dica do anfitrião' : 'Dica'}</strong>${esc(l.dica)}</span></div>` : ''}
      ${dados.length ? `<dl class="dados">${dados.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      ${tem(l.bom_saber) ? `<div><h3 class="h4" style="margin-bottom:10px">Bom saber</h3>${lista(l.bom_saber)}</div>` : ''}
      ${l.depende_mare ? `<a class="aviso mar" href="#/planejar" style="text-decoration:none">${ic('ondas')}<span>Depende da maré baixa. <u>Veja a estimativa de hoje</u>.</span></a>` : ''}
      ${l.patrocinado ? '<p class="fonte p0">Recomendação patrocinada: este parceiro remunera a divulgação.</p>' : ''}
      <div class="acoes">
        ${r ? `<a class="btn btn-prim" href="${esc(r)}" target="_blank" rel="noopener">${ic('pino')}Como chegar</a>` : ''}
        ${wa ? `<a class="btn btn-sec" href="${esc(wa)}" target="_blank" rel="noopener">${ic('msg')}WhatsApp</a>` : ''}
        ${tel ? `<a class="btn btn-sec" href="${esc(tel)}">${ic('fone')}Ligar</a>` : ''}
        ${card ? `<a class="btn btn-mar" href="${esc(card)}" target="_blank" rel="noopener">Cardápio</a>` : ''}
        ${site ? `<a class="btn btn-mar" href="${esc(site)}" target="_blank" rel="noopener">${comer ? 'Site' : 'Reservar'}</a>` : ''}
        <button type="button" class="btn btn-sec" data-compartilhar="${esc(l.id)}">${ic('compartilhar')}Compartilhar</button>
      </div>
      ${seletorDia('l:' + l.id)}
      <p class="fonte p0">${tem(l.verificado) ? 'Conferido pelo anfitrião em ' + esc(dataBR(l.verificado)) + '.' : 'Informações de guias de viagem, ainda em conferência pelo anfitrião.'}${l.fonte && urlSegura(l.fonte.url) ? ' Fonte: ' + fonteLink(l.fonte) + '.' : ''}</p>
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
    const icone = (k, aprox) => L.divIcon({ className: '', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -32], html: `<div class="marcador ${aprox ? 'aprox' : ''}" style="background:${k.cor}"><svg viewBox="0 0 24 24"><use href="#i-${k.ic}"/></svg></div>` });
    const pts = [];
    (REG.cidades || []).forEach(cd => { L.marker([cd.lat, cd.lng], { icon: L.divIcon({ className: 'rotulo-cidade', html: esc(cd.nome), iconSize: [160, 16], iconAnchor: [80, -8] }), interactive: false, keyboard: false }).addTo(m); pts.push([cd.lat, cd.lng]); });
    if (casa.coordenadas && casa.coordenadas.lat != null) { const p = [casa.coordenadas.lat, casa.coordenadas.lng]; pts.push(p); L.marker(p, { icon: icone(CAT.casa), title: NOME, zIndexOffset: 1000 }).addTo(m).bindPopup(`<span class="pop-nome">${esc(NOME)}</span>Sua casa`); }
    itens.filter(l => l.lat != null && l.lng != null).forEach(l => {
      const k = catDe(l), p = [l.lat, l.lng]; pts.push(p); const r = rota(l);
      L.marker(p, { icon: icone(k, l.precisao === 'aproximada'), title: l.nome }).addTo(m).bindPopup(`<span class="pop-nome">${esc(l.nome)}</span>${esc(k.rot)}${l.precisao === 'aproximada' ? ' · local aproximado' : ''}<div class="pop-acoes"><button type="button" data-abrir="${esc(l.id)}">Detalhes</button>${r ? `<a href="${esc(r)}" target="_blank" rel="noopener">Rota</a>` : ''}</div>`);
    });
    m.on('popupopen', (ev) => { const b = ev.popup.getElement && ev.popup.getElement().querySelector('[data-abrir]'); if (b) b.addEventListener('click', () => { m.closePopup(); abrirLugar(b.getAttribute('data-abrir')); }); });
    if (pts.length > 1) m.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
  }).catch(() => { el.innerHTML = `<div class="mapa-msg">${ic('pino', 'ic-lg')}Não foi possível carregar o mapa agora.<span class="mudo" style="font-weight:500">Verifique a conexão ou use a lista.</span></div>`; });
}

/* ---------- busca ---------- */
const PAGINAS_BUSCA = [['A casa', '#/casa', 'casa comodidades regras wifi internet cozinha toalha', 'casa'], ['Chegada e saída', '#/chegada', 'check-in checkout chave portaria estacionamento endereço', 'chave'], ['Maré e tempo', '#/planejar', 'mare tabua previsao chuva sol por do sol piscinas', 'ondas'], ['Ajuda e contatos', '#/ajuda', 'emergencia urgencia samu bombeiros policia farmacia remedio hospital medico febre pronto-socorro pronto socorro upa pediatra crianca doente saude acidente', 'fone', 1], ['Onde comer', '#/comer', 'restaurante comida almoco jantar tapioca peixe', 'garfo'], ['Mapa', '#/mapa', 'mapa localizacao rota', 'pino'], ['Feedback', '#/feedback', 'avaliar opiniao reclamacao sugestao', 'estrela'], ['Meu roteiro', '#/meu-roteiro', 'meu roteiro planejar dias agenda imprimir compartilhar', 'lista'], ['O que levar para a praia', '#/planejar?ir=levar', 'levar mala bolsa praia checklist protetor sapatilha oculos', 'sacola'], ['Almanaque: sol, lua, água e UV', '#/planejar', 'lua fase cheia nova nascer sol por do sol agua temperatura mar uv indice protetor', 'sol'], ['Privacidade', '#/privacidade', 'privacidade dados lgpd apagar limpar', 'escudo'], ['Área do anfitrião', 'admin/', 'anfitriao admin painel proprietario', 'cadeado']];
function indiceBusca() {
  const it = [];
  const cada = (onde, lst, f) => (lst || []).forEach(x => tenta('busca: ' + onde, () => f(x)));
  cada('lugares', LUGARES, l => it.push({ t: l.nome, s: [catDe(l).rot, l.area].filter(tem).join(' · '), txt: [l.nome, l.resumo, l.descricao, l.area, (l.tags || []).join(' '), catDe(l).rot].join(' '), ic: catDe(l).ic, bola: catDe(l).bola, abrir: l.id }));
  cada('roteiros', ROTEIROS, r => it.push({ t: r.titulo, s: 'Roteiro · ' + (r.quando || ''), txt: [r.titulo, r.subtitulo, (r.paradas || []).map(p => p.titulo + ' ' + p.texto).join(' ')].join(' '), ic: 'bussola', bola: 'b-mar', href: '#/roteiro/' + r.id }));
  cada('faq', casa.faq, q => it.push({ t: q.pergunta, s: 'Dúvida frequente', txt: q.pergunta + ' ' + q.resposta, ic: 'ajuda', bola: 'b-verde', href: '#/casa' }));
  // Sinônimos de saúde para quem busca no susto ("febre", "pronto socorro", "criança doente"…).
  const SAUDE = 'saude medico febre doente crianca pediatra pronto-socorro pronto socorro urgencia hospital remedio farmacia acidente';
  cada('contatos', (C.contatos || []).filter(c => c && c.nome), c => { const med = /samu|hospital|upa|pronto|sa[uú]de|m[eé]dic|farm/i.test(c.nome + ' ' + (c.categoria || ''));
    it.push({ t: c.nome, s: (c.categoria || '') + (c.telefone ? ' · ' + c.telefone : ''), txt: [c.nome, c.categoria, med ? SAUDE : ''].join(' '), ic: 'fone', bola: c.nivel === 'emergencia' ? 'b-terra' : 'b-mar', href: '#/ajuda', pr: med ? 1 : 0 }); });
  if (agendaAtiva()) it.push({ t: 'Disponibilidade e reserva', s: 'Página', txt: 'Disponibilidade e reserva datas livres calendario agenda reservar airbnb', ic: 'calendario', bola: 'b-sol', href: '#/disponibilidade', pr: 0 });
  PAGINAS_BUSCA.forEach(([t, h, k, i, pr]) => it.push({ t, s: 'Página', txt: t + ' ' + k, ic: i, bola: 'b-sol', href: h, pr: pr || 0 }));
  return it.map(x => Object.assign(x, { n: normal(x.txt) }));
}
let IDX = null;
function abrirBusca() {
  const d = document.getElementById('busca'); IDX = IDX || tenta('índice da busca', indiceBusca) || [];
  d.innerHTML = `<div class="busca-cab">${ic('lupa')}<label for="q" class="sr-only">Buscar no guia</label><input id="q" type="search" placeholder="Buscar praia, passeio, contato…" autocomplete="off"><button type="button" class="btn-ic" data-fechar-busca aria-label="Fechar busca">${ic('x')}</button></div><div class="busca-res" id="busca-res" role="list" aria-live="polite"></div>`;
  const q = d.querySelector('#q'), res = d.querySelector('#busca-res');
  const sug = ['piscinas', 'peixe-boi', 'patacho', 'maré', 'farmácia', 'check-out'];
  const pintar = () => {
    const v = normal(q.value.trim());
    if (!v) { res.innerHTML = `<div class="busca-sug">${sug.map(s => `<button type="button" class="chip" data-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>`; return; }
    const termos = v.split(/\s+/);
    const achados = IDX.map(x => ({ x, p: termos.every(t => x.n.includes(t)) ? (normal(x.t).includes(v) ? 2 : 1) + (x.pr || 0) * 0.5 : 0 })).filter(o => o.p).sort((a, b) => b.p - a.p).slice(0, 12);
    const marca = (s) => { let h = esc(s); termos.forEach(t => { if (t.length < 2) return; const i = normal(s).indexOf(t); if (i >= 0) h = esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + t.length)) + '</mark>' + esc(s.slice(i + t.length)); }); return h; };
    res.innerHTML = achados.length ? achados.map(({ x }) => {
      const corpo = `<span class="bola ${x.bola}">${ic(x.ic)}</span><span><strong>${marca(x.t)}</strong><span>${esc(x.s)}</span></span>`;
      return x.abrir ? `<button type="button" class="res" role="listitem" data-abrir-busca="${esc(x.abrir)}">${corpo}</button>` : `<a class="res" role="listitem" href="${esc(x.href)}">${corpo}</a>`;
    }).join('') : `<p class="mudo" style="padding:16px">Nada encontrado para “${esc(q.value)}”. Que tal perguntar ao anfitrião?</p>`;
  };
  q.addEventListener('input', pintar); pintar();
  // Esc fecha a busca de primeira, mesmo com texto (o campo type=search limparia o texto antes).
  q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); d.close(); } });
  d.onclick = (e) => { // propriedade (não addEventListener): um único ouvinte, mesmo abrindo a busca várias vezes
    const s = e.target.closest('[data-sug]'); if (s) { q.value = s.dataset.sug; pintar(); q.focus(); return; }
    const a = e.target.closest('[data-abrir-busca]'); if (a) { buscaDestino = { lugar: a.dataset.abrirBusca }; d.close(); return; }
    const lk = e.target.closest('a.res'); if (lk) { e.preventDefault(); buscaDestino = { href: lk.getAttribute('href') }; d.close(); return; }
    if (e.target.closest('[data-fechar-busca]') || e.target === d) d.close();
  };
  d.showModal(); q.focus();
  history.pushState({ busca: 1 }, '', location.href); // Voltar do celular fecha a busca
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
  // viaWa = abrimos o WhatsApp; senão, o envio foi feito sem confirmação (resposta opaca): não prometemos entrega.
  const fim = (viaWa) => {
    const urgente = dados.nota <= 3, wa = linkWa(casa.whatsapp, textoWa);
    const texto = viaWa ? 'Abrimos o WhatsApp com sua mensagem pronta: é só tocar em enviar.'
      : 'Sua mensagem foi enviada. Daqui não conseguimos confirmar a entrega' + (wa ? ', então, se for importante ou se precisar de resposta, mande também pelo WhatsApp.' : '. Se precisar de resposta rápida, use os contatos da página Ajuda.');
    const acao = !viaWa && wa ? `<a class="btn ${urgente ? 'btn-prim' : 'btn-sec'}" href="${esc(wa)}" target="_blank" rel="noopener">${ic('whatsapp')}Enviar também pelo WhatsApp</a>`
      : viaWa && urgente ? botaoWa('Falar com o anfitrião agora', 'Olá! Acabei de enviar um feedback e gostaria de conversar.', 'btn-prim', true)
      : !wa ? '<a class="btn btn-sec" href="#/ajuda">Contatos e ajuda</a>' : '';
    document.getElementById('fb-area').innerHTML = `<div class="painel obrigado" role="status"><span class="bola b-verde" style="width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center">${ic(viaWa ? 'whatsapp' : 'enviar', 'ic-lg')}</span><h2 class="h2">Obrigado${dados.nome ? ', ' + esc(dados.nome.split(' ')[0]) : ''}!</h2><p class="lead">${texto}</p><div class="acoes">${acao}<a class="btn btn-sec" href="#/inicio">Voltar ao início</a></div></div>`;
  };
  const viaWhats = () => {
    const u = linkWa(casa.whatsapp, textoWa); if (u) { window.open(u, '_blank', 'noopener'); fim(true); } else { toast('Não foi possível enviar agora. Tente de novo em instantes.'); btn.disabled = false; btn.innerHTML = ic('enviar') + 'Enviar feedback'; }
  };
  const ep = urlSegura(CFG.feedback_endpoint);
  if (ep) {
    // Apps Script não confirma CORS: o envio é "às cegas" (no-cors) e a resposta é opaca.
    fetch(ep, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dados) })
      .then(() => fim(false)).catch(viaWhats);
  } else if (mel) fim(false); else viaWhats();
}

/* ---------- roteador ---------- */
const TITULOS = { disponibilidade: 'Disponibilidade', 'meu-roteiro': 'Meu roteiro', privacidade: 'Privacidade', inicio: 'Início', casa: 'A casa', chegada: 'Chegada e saída', explorar: 'Explorar', roteiro: 'Roteiro', comer: 'Onde comer', planejar: 'Maré e tempo', mapa: 'Mapa', ajuda: 'Ajuda', beneficios: 'Benefícios', avaliacoes: 'Avaliações', feedback: 'Feedback' };
const NAV_DE = { disponibilidade: 'inicio', 'meu-roteiro': 'explorar', privacidade: 'inicio', mapa: 'explorar', roteiro: 'explorar', planejar: 'inicio', avaliacoes: 'inicio', feedback: 'inicio', beneficios: 'beneficios', chegada: 'casa' };
let ultimoCaminho = '', ultimoHash = '#/inicio';
const caminhoDe = (h) => { const c = String(h || '').split('?')[0]; return /^#\/lugar\//.test(c) ? '#/explorar' : (c || '#/inicio'); };
function rotaAtual() {
  const h = location.hash.replace(/^#\/?/, ''); const [caminho, qs] = h.split('?'); const partes = caminho.split('/');
  let r = partes[0] || 'inicio', arg = partes[1] ? decodeURIComponent(partes[1]) : null;
  if (r === 'lugar' && arg) return { r: 'explorar', arg: null, lugar: arg };
  if (!P[r]) r = 'inicio';
  const lugar = qs && new URLSearchParams(qs).get('lugar');
  return { r, arg, lugar };
}
function render(modo) {
  const { r, arg, lugar } = rotaAtual();
  ultimoCaminho = caminhoDe(location.hash); ultimoHash = location.hash || '#/inicio';
  if (mapa) { mapa.remove(); mapa = null; }
  SEC_N = 0;
  let corpo;
  try { corpo = P[r](arg); }
  catch (e) { registrarFalha('página ' + r, e); corpo = paginaComFalha(r); }
  $main.innerHTML = corpo + S('rodapé', rodape);
  tenta('aviso de ilustração', avisoIlustra);
  document.title = (r === 'inicio' ? NOME : (r === 'roteiro' && arg ? ((ROTEIROS.find(x => x.id === arg) || {}).titulo || 'Roteiro') : TITULOS[r]) + ' · ' + NOME) + ' · Guia do hóspede';
  const ativo = NAV_DE[r] || r;
  document.querySelectorAll('.nav-topo a, .nav-base a').forEach(a => { const al = a.getAttribute('href').replace('#/', ''); if (al === ativo || (al === r)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (modo !== 'filtro') { $main.classList.remove('entra'); void $main.offsetWidth; $main.classList.add('entra'); revelar(); }
  else $main.querySelectorAll('.sec,.pag-cab').forEach(s => s.classList.add('on'));
  if (r === 'inicio') tenta('Hoje (início)', preencherDia);
  if (r === 'inicio' || r === 'disponibilidade') tenta('agenda', preencherAgenda);
  tenta('reservar do topo', reservarDoTopo);
  if (r === 'planejar') { tenta('previsão e maré', preencherPlanejar); tenta('almanaque', preencherAlmanaque); }
  if (r === 'meu-roteiro') tenta('maré do meu roteiro', preencherMeuRoteiro);
  { const ir = new URLSearchParams(location.hash.split('?')[1] || '').get('ir'); if (ir && modo !== 'filtro') { const alvo = document.getElementById(ir); if (alvo) setTimeout(() => { alvo.scrollIntoView({ block: 'start' }); }, 60); } }
  if (r === 'mapa') tenta('mapa', () => montarMapa(estado.mapa === 'todos' ? LUGARES : LUGARES.filter(l => l.categoria === estado.mapa)));
  if (r === 'explorar' && estado.vista === 'mapa') tenta('mapa', () => montarMapa(LUGARES.filter(l => catDe(l).grupo === 'explorar')));
  if (modo === 'nav') { window.scrollTo(0, 0); $main.focus({ preventScroll: true }); }
  if (lugar && POR_ID[lugar] && !document.getElementById('folha').open) abrirLugar(lugar, true);
}
/* Página cujo desenho falhou por inteiro: mantém topo, navegação e rodapé, e oferece caminhos. */
function paginaComFalha(r) {
  return `${cabecalho(TITULOS[r] || 'Guia', 'Esta parte não abriu agora.', 'Algum dado desta página está com problema e já foi registrado. O resto do guia continua funcionando.')}
  <section class="sec" style="padding-top:24px"><div class="acoes"><a class="btn btn-prim" href="#/inicio">${ic('casa')}Ir para o início</a><a class="btn btn-sec" href="#/ajuda">${ic('fone')}Ajuda e emergência</a></div></section>`;
}
function rodape() {
  const ig = linkInsta(), wa = waAnfitriao(), res = linkReserva();
  const igNome = String(casa.instagram || '').replace(/^@/, '').trim();
  const sociais = (wa ? `<a class="social" href="${esc(wa)}" target="_blank" rel="noopener" aria-label="WhatsApp do anfitrião">${ic('whatsapp')}</a>` : '')
    + (ig ? `<a class="social" href="${esc(ig)}" target="_blank" rel="noopener" aria-label="Instagram @${esc(igNome)}">${ic('instagram')}</a>` : '');
  return `<footer class="rodape">
    <div class="rodape-boas"><p class="script">Seja bem-vindo!</p><p class="p0">Estamos felizes em receber você na ${esc(NOME)}. Qualquer dúvida, conte com a gente.</p>
      ${res ? `<a class="btn btn-claro" href="${esc(res)}" target="_blank" rel="noopener" style="margin-top:18px">${ic('casa')}Reservar a próxima estadia</a>` : ''}</div>
    ${sociais ? `<div class="rodape-social"><span class="olho claro">${ig ? 'Nos siga' : 'Fale com a gente'}</span><div class="sociais">${sociais}</div>${ig ? `<a class="social-txt" href="${esc(ig)}" target="_blank" rel="noopener">@${esc(igNome)}</a>` : ''}</div>` : ''}
    <div class="rodape-marca">${window.Marca ? Marca.vertical({ tema: 'escuro', titulo: NOME }) : ''}<p class="p0">${esc(casa.endereco_publico || '')}</p></div>
    ${blocoInstalar()}
    <nav aria-label="Rodapé"><a href="#/casa">A casa</a><a href="#/chegada">Chegada e saída</a><a href="#/planejar">Maré e tempo</a><a href="#/explorar">Explorar</a><a href="#/meu-roteiro">Meu roteiro</a><a href="#/comer">Onde comer</a><a href="#/mapa">Mapa</a><a href="#/ajuda">Ajuda</a><a href="#/avaliacoes">Avaliações</a><a href="#/feedback">Feedback</a></nav>
    <p class="fonte rodape-nota">Informações de terceiros indicam a fonte. Horários, preços e condições podem mudar: confirme antes de ir.</p>
    <div class="rodape-base"><a href="#/privacidade">${ic('escudo')}Privacidade e dados no aparelho</a><a href="admin/" rel="nofollow">${ic('cadeado')}Área do anfitrião</a></div></footer>`;
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
  const alvos = $main.querySelectorAll('.sec, .pag-cab, .dia');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { alvos.forEach(a => a.classList.add('on')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: .04 });
  alvos.forEach((a, i) => { a.classList.add('rv'); if (i < 3) requestAnimationFrame(() => a.classList.add('on')); else io.observe(a); });
}

/* ---------- eventos ---------- */
document.addEventListener('click', (e) => {
  if (e.target.closest('.pular')) { e.preventDefault(); pularConteudo(); return; } // H04: não passa pelo roteador
  const ab = e.target.closest('[data-abrir]'); if (ab) { e.preventDefault(); abrirLugar(ab.getAttribute('data-abrir')); return; }
  const fi = e.target.closest('[data-filtro]');
  if (fi) {
    const k = fi.dataset.filtro, v = fi.dataset.valor;
    estado[k] = (k === 'tag' && estado.tag === v) ? '' : v;
    const y = window.scrollY; render('filtro'); window.scrollTo(0, y);
    const b = document.querySelector(`[data-filtro="${k}"][data-valor="${CSS.escape(v)}"]`); if (b) b.focus({ preventScroll: true });
    return;
  }
  const vi = e.target.closest('[data-vista]'); if (vi) { estado.vista = vi.dataset.vista; const y = window.scrollY; render('filtro'); window.scrollTo(0, y); return; }
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
  if (ft) { const f = casa.fotos[+ft.dataset.foto]; const d = document.getElementById('folha'); ultimoFoco = ft; d.innerHTML = `<div class="folha-topo"><span></span><button type="button" class="btn-ic" data-fechar aria-label="Fechar">${ic('x')}</button></div><img src="${esc(urlSegura(f.src))}" alt="${esc(f.alt || '')}" style="width:100%;height:auto"><p class="fonte" style="padding:12px 20px">${esc(f.alt || '')}</p>`; d.showModal(); d.querySelector('[data-fechar]').focus(); return; }
  if (e.target.closest('[data-fechar]')) { document.getElementById('folha').close(); return; }
  if (e.target.closest('[data-buscar]')) { abrirBusca(); return; }
  /* gadgets */
  if (e.target.closest('[data-ics="estadia"]')) { icsEstadia(); return; }
  const ir = e.target.closest('[data-ics-roteiro]');
  if (ir) { const d = document.getElementById('rot-data'); if (!d || !isoValida(d.value)) { toast('Escolha o dia do passeio'); if (d) d.focus(); return; } icsRoteiro(ir.dataset.icsRoteiro, d.value); return; }
  const ar = e.target.closest('[data-add-roteiro]');
  if (ar) { const sel = ar.parentElement.querySelector('[data-add-dia]'); mrAdicionar(ar.dataset.addRoteiro, sel ? sel.value : 0); return; }
  const mr = e.target.closest('[data-mr]'); if (mr) { mrAcao(mr.dataset.mr, mr); return; }
  if (e.target.closest('[data-levar-zerar]')) { document.querySelectorAll('[data-levar-item]').forEach(i => { i.checked = false; }); atualizarLevar(); LS.apagar('guia:levar'); toast('Lista recomeçada'); return; }
  if (e.target.closest('[data-limpar-estadia]')) { LS.apagar('guia:estadia'); toast('Pronto: saudação e datas apagadas deste aparelho'); render('filtro'); return; }
  if (e.target.closest('[data-limpar-tudo]')) { CHAVES_HOSPEDE.forEach(LS.apagar); document.documentElement.classList.remove('modo-sol'); MR_RECEBIDO = null; try { sessionStorage.clear(); } catch (x) {} toast('Tudo apagado deste aparelho'); render('filtro'); const b = document.querySelector('[data-modo-sol]'); if (b) b.setAttribute('aria-pressed', 'false'); return; }
  const ms = e.target.closest('[data-modo-sol]');
  if (ms) { const on = document.documentElement.classList.toggle('modo-sol'); ms.setAttribute('aria-pressed', String(on)); try { if (on) localStorage.setItem('guia:modo-sol', '1'); else localStorage.removeItem('guia:modo-sol'); } catch (x) {} toast(on ? 'Modo sol: letra maior e contraste máximo' : 'Modo sol desligado'); return; }
  if (e.target.closest('[data-instalar]')) { if (pedidoInstalar) { pedidoInstalar.prompt(); pedidoInstalar.userChoice.finally(() => { pedidoInstalar = null; }); } return; }
  if (e.target.closest('[data-instalar-nao]')) { LS.gravar('guia:instalar-dispensado', true); const x = document.querySelector('.instalar'); if (x) x.remove(); return; }
});
function atualizarLevar() {
  const marc = [...document.querySelectorAll('[data-levar-item]')].filter(i => i.checked).map(i => i.dataset.levarItem);
  const unicos = [...new Set(marc)]; LS.gravar('guia:levar', { itens: unicos });
  const total = LEVAR().length; document.querySelectorAll('[data-levar-conta]').forEach(el => { el.textContent = unicos.length === total ? 'Tudo na bolsa. Boa praia!' : `${unicos.length} de ${total} na bolsa`; });
}
document.addEventListener('change', (e) => {
  if (e.target.matches('[data-levar-item]')) { atualizarLevar(); return; }
  if (e.target.id === 'mr-ini') { const r = mrNormalizar(mrLer()); LS.gravar('guia:roteiro', { ini: isoValida(e.target.value) ? e.target.value : '', dias: r.dias }); MR_MARE = MR_MARE; const y = window.scrollY; render('filtro'); window.scrollTo(0, y); const i = document.getElementById('mr-ini'); if (i) i.focus(); }
});
const folha = document.getElementById('folha'), busca = document.getElementById('busca');
let buscaDestino = null;
folha.addEventListener('click', (e) => { if (e.target === folha) folha.close(); });
folha.addEventListener('close', () => {
  if (!porHist) {
    if (history.state && history.state.folha) history.back(); // desfaz a entrada criada ao abrir
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
  // Âncoras internas (ex.: link "Pular para o conteúdo" sem JS) não são rotas: volta a URL e foca o conteúdo.
  if (location.hash && !/^#\//.test(location.hash)) { history.replaceState(history.state, '', ultimoHash); pularConteudo(); return; }
  if (caminhoDe(location.hash) === ultimoCaminho) { // só a ficha mudou (Voltar/Avançar): sem redesenhar a página
    const { lugar } = rotaAtual();
    porHist = true; if (!lugar && folha.open) folha.close(); porHist = false;
    if (lugar && POR_ID[lugar] && !folha.open) abrirLugar(lugar, true);
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
document.querySelectorAll('[data-nome-casa]').forEach(el => el.textContent = NOME);
document.querySelectorAll('[data-logo]').forEach(el => { if (window.Marca) el.innerHTML = Marca.horizontal({ tema: 'claro', titulo: '' }); }); // o nome acessível fica no link
{ const lk = document.querySelector('.topo .marca'); if (lk) lk.setAttribute('aria-label', NOME + ' · início'); }
{ const rs = document.querySelector('[data-reservar]'), u = linkReserva(); if (rs && u) { rs.href = u; rs.hidden = false; rs.setAttribute('aria-label', rotuloReserva() + ' (abre em nova aba)'); rs.title = rotuloReserva(); } }
});
{ const w0 = tenta('WhatsApp do topo', waAnfitriao); const bw = document.querySelector('.btn-wa');
if (bw) { if (w0) { bw.href = w0; } else bw.remove(); } }
if (RASCUNHO) document.body.insertAdjacentHTML('afterbegin', '<div class="faixa-rascunho" role="status">Pré-visualização do rascunho · nada foi publicado ainda · <a href="./">ver site publicado</a></div>');
else if (RASCUNHO_FALTOU) document.body.insertAdjacentHTML('afterbegin', '<div class="faixa-rascunho" role="status">Rascunho não encontrado nesta aba: abra a pré-visualização de novo pelo painel. Abaixo, o site publicado.</div>');
// og:image vem do bloco "compartilhar" do index.html (o WhatsApp não roda JavaScript); aqui só preenche se estiver vazio.
tenta('og:image', () => { const og = CFG.og_imagem && CFG.og_imagem.src; const m = document.querySelector('meta[property="og:image"]'); if (tem(og) && m && !m.content) m.content = new URL(og, location.href).href; });
tenta('estadia', lerEstadiaDaUrl);
if (!location.hash || location.hash === '#/' || location.hash === '#') history.replaceState(null, '', location.pathname + location.search + '#/inicio');
{ const ms = document.querySelector('[data-modo-sol]'); if (ms) ms.setAttribute('aria-pressed', String(document.documentElement.classList.contains('modo-sol'))); }
render('inicial');
document.documentElement.setAttribute('data-guia', 'pronto'); // sinal para testes e depuração: guia desenhado

/* modo offline (ativa só se o manifest existir no servidor). Os dados chegam por fetch, então a página pode já ter carregado. */
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

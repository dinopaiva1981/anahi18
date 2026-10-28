/* Painel do anfitrião · Casa 18 Anahi
   - Edita os DADOS do guia (dados/conteudo.json; em repositórios antigos, conteudo.js) e publica no GitHub pela API.
     O painel nunca reescreve código: além dos dados, só grava o bloco <!-- compartilhar:inicio/fim --> do index.html,
     a imagem fixa compartilhar.jpg, fotos/ e admin/acesso.json. Normaliza com assets/dados.js (o mesmo contrato do site).
   - Entrada: senha do anfitrião (no repositório só o hash PBKDF2, em admin/acesso.json). A senha abre o cofre deste
     aparelho (AES-GCM), onde ficam o token do GitHub (informado uma única vez), a chave do feedback, os dados privados
     da casa (Wi-Fi, portão) e os modelos de mensagem. Nada disso vai para o repositório.
   - admin/?demo: modo demonstração, com GitHub e feedback simulados em memória.
   - Todo dado que vem de fora (conteudo.js, cópias, JSON colado, CSV, feedback) é validado e escapado.
   - Fotos são reduzidas e convertidas antes do envio para manter o site leve. */
(function () {
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tem = (v) => Array.isArray(v) ? v.length > 0 : (v !== null && v !== undefined && String(v).trim() !== '');
const ic = (n) => `<svg class="ic" aria-hidden="true"><use href="#i-${esc(n)}"/></svg>`;
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date());
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
const clone = (o) => JSON.parse(JSON.stringify(o));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;
/* Datas: sempre devolvem texto escapado; valor fora do formato vira vazio (nunca o texto cru). */
const dataBR = (iso) => { if (!iso) return ''; const d = new Date(RE_DIA.test(iso) ? iso + 'T12:00:00-03:00' : iso); return isNaN(d) ? '' : esc(d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Maceio' })); };
const dataCurta = (iso) => RE_DIA.test(String(iso || '')) ? esc(String(iso).split('-').reverse().join('/')) : '';

/* ---------------- modo demonstração (contrato 3) ----------------
   admin/?demo: carrega ../dados/conteudo.json (ou ../conteudo.js), simula o GitHub e o feedback em memória e não toca no armazenamento real do aparelho. */
const DEMO = /[?&]demo(?:[=&]|$)/.test(location.search);

/* ---------------- armazenamento (à prova de bloqueio) ----------------
   Se o navegador bloquear o armazenamento, o painel continua funcionando com memória (e avisa).
   Na demonstração, tudo fica só na memória desta aba. */
function abrirArmaz(nome) { try { const s = window[nome]; s.setItem('__teste', '1'); s.removeItem('__teste'); return s; } catch (e) { return null; } }
const memoria = { local: new Map(), sessao: new Map() };
const LS = DEMO ? null : abrirArmaz('localStorage'), SS = DEMO ? null : abrirArmaz('sessionStorage');
const ARMAZ_BLOQUEADO = !DEMO && (!LS || !SS);
function armaz(tipo) {
  const s = tipo === 'sessao' ? SS : LS, m = memoria[tipo];
  return {
    raw(k) { try { if (s) return s.getItem(k); } catch (e) {} return m.has(k) ? m.get(k) : null; },
    get(k, d) { const v = this.raw(k); if (v == null) return d; try { return JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { const t = JSON.stringify(v); try { if (s) { s.setItem(k, t); return true; } } catch (e) { m.set(k, t); return false; } m.set(k, t); return true; },
    del(k) { try { if (s) s.removeItem(k); } catch (e) {} m.delete(k); }
  };
}
const ls = armaz('local'), ss = armaz('sessao');
const apagar = (k) => { ls.del(k); ss.del(k); };

function toast(msg, erro) { const t = $('#toast'); t.textContent = msg; t.className = 'toast on' + (erro ? ' erro' : ''); t.setAttribute('role', erro ? 'alert' : 'status'); clearTimeout(toast._t); toast._t = setTimeout(() => t.className = 'toast', erro ? 7000 : 3600); }

/* ---------------- estado ---------------- */
const A = {
  cfg: Object.assign({ owner: '', repo: '', branch: 'main' }, ls.get('admin:cfg', {})),
  token: ss.get('admin:token', null), tokenExp: ss.get('admin:token-exp', null),
  remoto: null, draft: null, baseSha: null, baseObj: null, correcoes: [],
  view: 'visao', busca: '',
  fb: { itens: null, erro: null, periodo: '90', sent: 'todos', tema: '', exemplo: DEMO, carregando: false, tabela: false },
  fotos: null, cacheFotos: {},
  cofreDados: null, senhaPendente: null,
  estadia: { nome: '', chegada: '', saida: '', fone: '' }, modelosEdit: {}
};
/* A02: hospedado em <conta>.github.io/<repositório>/admin/ (ou <conta>.github.io/admin/), o painel deduz onde está o guia. */
function deduzirRepo(host, caminho) {
  const m = String(host || '').toLowerCase().match(/^([a-z0-9](?:[a-z0-9-]{0,38}))\.github\.io$/); if (!m) return null;
  const seg = String(caminho || '').split('/').filter(Boolean);
  if (!seg.length) return null;
  if (seg[0].toLowerCase() === 'admin') return { owner: m[1], repo: m[1] + '.github.io' };
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(seg[0])) return null;
  return { owner: m[1], repo: decodeURIComponent(seg[0]) };
}
A.repoAuto = deduzirRepo(location.hostname, location.pathname);
if (A.repoAuto && !tem(A.cfg.owner) && !tem(A.cfg.repo)) { A.cfg.owner = A.repoAuto.owner; A.cfg.repo = A.repoAuto.repo; }
['admin:token', 'admin:token-lembrado'].forEach(k => ls.del(k)); // formatos antigos, sem criptografia
ls.del('admin:fbchave');                                       // a chave de feedback não fica mais em texto puro

/* ---------------- cofre do aparelho ----------------
   Tudo o que é segredo DESTE aparelho, num só bloco cifrado com a senha do anfitrião:
   { token, exp, tokenAte, fbchave, privados: { wifi_rede, wifi_senha, wifi_tipo, wifi_oculta, portao, chaves, notas }, modelos: { … } }
   PBKDF2-SHA256 (600 mil iterações, sal próprio, diferente do sal do hash da senha) + AES-GCM 256 via WebCrypto.
   A chave derivada fica só na sessão da aba (sessionStorage) para regravar sem pedir a senha de novo; fechar a aba apaga.
   Nada disto vai para os dados publicados (dados/conteudo.json), para o rascunho ou para qualquer requisição ao GitHub. */
const b64u = { de: (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0)), para: (u) => btoa(String.fromCharCode.apply(null, u)) };
const ITER = 600000;
const novoCofre = () => ({ token: null, exp: null, tokenAte: null, fbchave: '', privados: {}, modelos: {} });
const tokenAte = (exp) => { const t = exp ? new Date(exp).getTime() : NaN; return isFinite(t) ? t : Date.now() + 30 * 864e5; };
const Cofre = {
  ITER,
  ler() { const c = ls.get('admin:cofre', null); return c && c.ct && c.sal && c.iv ? c : null; },
  existe() { const c = this.ler(); if (c && c.v !== 2 && c.exp && c.exp < Date.now()) { ls.del('admin:cofre'); return false; } return !!c; },
  async derivar(senha, sal, iter) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(senha)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: iter || ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  },
  async chaveSessao() { const r = ss.get('admin:cofre-chave', null); return r ? crypto.subtle.importKey('raw', b64u.de(r), 'AES-GCM', false, ['encrypt', 'decrypt']) : null; },
  async lembrarChave(k) { ss.set('admin:cofre-chave', b64u.para(new Uint8Array(await crypto.subtle.exportKey('raw', k)))); },
  async criar(senha, dados) {
    const sal = crypto.getRandomValues(new Uint8Array(16)); const k = await this.derivar(senha, sal, ITER);
    await this.lembrarChave(k); await this.gravar(k, sal, ITER, dados);
  },
  async gravar(k, sal, iter, dados) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(dados))));
    ls.set('admin:cofre', { v: 2, iter, sal: b64u.para(sal), iv: b64u.para(iv), ct: b64u.para(ct) });
  },
  async decifrar(k, c) { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64u.de(c.iv) }, k, b64u.de(c.ct)); return JSON.parse(new TextDecoder().decode(pt)); },
  async abrir(senha) {
    const c = this.ler(); if (!c) throw new Error('Nada guardado neste aparelho.');
    const k = await this.derivar(senha, b64u.de(c.sal), c.iter || 310000);
    let d; try { d = await this.decifrar(k, c); } catch (e) { throw Object.assign(new Error('Senha incorreta para o acesso guardado neste aparelho.'), { codigo: 'senha' }); }
    await this.lembrarChave(k); return d;
  },
  async abrirSessao() { const c = this.ler(); if (!c) return null; const k = await this.chaveSessao().catch(() => null); if (!k) return null; try { return await this.decifrar(k, c); } catch (e) { return null; } },
  async atualizar(dados) { // regrava com a chave da sessão (sem pedir a senha)
    const c = this.ler(), k = await this.chaveSessao(); if (!c || !k) return false;
    await this.gravar(k, b64u.de(c.sal), c.iter || ITER, dados); return true;
  },
  apagar() { ls.del('admin:cofre'); ss.del('admin:cofre-chave'); }
};
const fbChave = () => ss.get('admin:fbchave', '') || '';
const temChaveSessao = () => !!ss.raw('admin:cofre-chave');
async function salvarCofre() {
  if (!A.cofreDados) return false;
  A.cofreDados.fbchave = fbChave();
  if (DEMO) return true;
  try { return await Cofre.atualizar(A.cofreDados); } catch (e) { return false; }
}
/* Abre o que veio do cofre: token (se ainda vale), chave do feedback, dados privados e modelos. */
function usarCofre(d) {
  A.cofreDados = Object.assign(novoCofre(), d && typeof d === 'object' ? d : {});
  if (!A.cofreDados.privados || typeof A.cofreDados.privados !== 'object') A.cofreDados.privados = {};
  if (!A.cofreDados.modelos || typeof A.cofreDados.modelos !== 'object') A.cofreDados.modelos = {};
  let venceu = false;
  if (A.cofreDados.token && A.cofreDados.tokenAte && A.cofreDados.tokenAte < Date.now()) { A.cofreDados.token = null; A.cofreDados.exp = null; venceu = true; salvarCofre(); }
  if (A.cofreDados.token) { A.token = A.cofreDados.token; A.tokenExp = A.cofreDados.exp || null; ss.set('admin:token', A.token); if (A.tokenExp) ss.set('admin:token-exp', A.tokenExp); }
  if (A.cofreDados.fbchave) ss.set('admin:fbchave', A.cofreDados.fbchave);
  return { venceu };
}
function esquecerToken() {
  A.token = null; A.tokenExp = null; ss.del('admin:token'); ss.del('admin:token-exp');
  if (A.cofreDados && A.cofreDados.token) { A.cofreDados.token = null; A.cofreDados.exp = null; A.cofreDados.tokenAte = null; salvarCofre(); }
}

/* ---------------- senha do anfitrião ----------------
   No repositório fica só o hash (admin/acesso.json): PBKDF2-SHA256, sal aleatório, 600 mil iterações (OWASP).
   A senha protege ESTE aparelho (abre o cofre acima). Quem dá acesso ao GitHub é o token.
   Se admin/acesso.json for apagado do repositório, vale o hash original abaixo (é o caminho para recuperar uma senha esquecida). */
const ACESSO_ORIGINAL = { v: 1, alg: 'PBKDF2-SHA256', iter: 600000, sal: 'CEC/uR/hJubbI1xNzFCd2A==', hash: 'jyhymBU8LGwVlk4kwLOIA6uG5LMf8vKKDZeypmUNKLw=', atualizado_em: '2026-10-28T12:00:00.000Z' };
/* Hash da senha padrão ANTERIOR (até 27/10/2026). Guias já no ar ainda têm este admin/acesso.json, porque o pacote de
   atualização não traz esse arquivo. Com ele publicado, o painel aceita a senha anterior e também a nova padrão, e
   oferece a troca logo depois de entrar (o cofre é trancado de novo com a senha nova, como em "Trocar a senha"). */
const ACESSO_LEGADO = { sal: 'KEvuMCnxy5EM2eBod8LJbA==', hash: 'wc3x6MxD3zD6nobLXCrlJmgfE4zci1iBrRvtJrqJ94o=' };
const SENHA_PADRAO = 'casa' + 'praia';
const ehLegado = (a) => !!a && a.sal === ACESSO_LEGADO.sal && a.hash === ACESSO_LEGADO.hash;
const OBS_ACESSO = 'Só o hash da senha do painel (PBKDF2-SHA256). A senha em si nunca fica no repositório. Apagar este arquivo faz o painel voltar à senha original.';
const acessoValido = (a) => a && typeof a === 'object' && a.alg === 'PBKDF2-SHA256' && Number.isInteger(a.iter) && a.iter >= 100000 && a.iter <= 5000000 &&
  /^[A-Za-z0-9+/]{16,}={0,2}$/.test(String(a.sal || '')) && /^[A-Za-z0-9+/]{43}=$/.test(String(a.hash || '')) ? a : null;
const PROPAGACAO = 30 * 60e3; // o GitHub Pages pode levar alguns minutos para servir o acesso.json novo
async function carregarAcesso() {
  if (DEMO) return A.acessoDemo || ACESSO_ORIGINAL;
  const local = acessoValido(ls.get('admin:acesso', null));
  const trocadaAqui = local && local.trocadaAqui && Date.now() - local.trocadaAqui < PROPAGACAO ? local : null;
  let r = null; try { r = await fetch('acesso.json', { cache: 'no-store', credentials: 'same-origin' }); } catch (e) { r = null; }
  if (r && r.ok) {
    const remoto = acessoValido(await r.json().catch(() => null));
    if (remoto) {
      if (trocadaAqui && String(trocadaAqui.atualizado_em) > String(remoto.atualizado_em)) return trocadaAqui;
      ls.set('admin:acesso', remoto); return remoto;
    }
    return local || ACESSO_ORIGINAL;
  }
  if (r && r.status === 404) { if (trocadaAqui) return trocadaAqui; ls.del('admin:acesso'); return ACESSO_ORIGINAL; }
  return local || ACESSO_ORIGINAL; // sem conexão: a última versão vista neste aparelho
}
async function hashSenha(senha, salB64, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(senha)), 'PBKDF2', false, ['deriveBits']);
  return b64u.para(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: b64u.de(salB64), iterations: iter, hash: 'SHA-256' }, base, 256)));
}
async function conferirSenha(senha, acesso) {
  if (!senha || !acessoValido(acesso)) return false;
  const h = await hashSenha(senha, acesso.sal, acesso.iter); if (h.length !== acesso.hash.length) return false;
  let d = 0; for (let i = 0; i < h.length; i++) d |= h.charCodeAt(i) ^ acesso.hash.charCodeAt(i); return d === 0;
}
async function gerarAcesso(senha) {
  const sal = b64u.para(crypto.getRandomValues(new Uint8Array(16)));
  return { v: 1, alg: 'PBKDF2-SHA256', iter: ITER, sal, hash: await hashSenha(senha, sal, ITER), atualizado_em: new Date().toISOString(), obs: OBS_ACESSO };
}
/* Tentativas: 2 erros livres; a partir do 3º, espera crescente (30 s, 1, 2, 4, 8 min… até 15 min). Vale também depois de recarregar. */
const Tentativas = {
  ler() { const t = ls.get('admin:tentativas', null); return t && Number.isFinite(t.n) && Number.isFinite(t.ate) ? t : { n: 0, ate: 0 }; },
  espera() { return Math.max(0, Math.ceil((this.ler().ate - Date.now()) / 1000)); },
  falhou() { const t = this.ler(); t.n += 1; const s = t.n < 3 ? 0 : Math.min(900, 30 * 2 ** (t.n - 3)); t.ate = Date.now() + s * 1000; ls.set('admin:tentativas', t); return { n: t.n, espera: s }; },
  zerar() { ls.del('admin:tentativas'); }
};
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* ---------------- GitHub ---------------- */
const API = 'https://api.github.com';
function lerValidade(h) { // "2026-11-20 12:00:00 UTC" ou "2026-11-20 12:00:00 -0300"
  const m = String(h || '').match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})\s*(UTC|[+-]\d{4})?/);
  if (!m) return null; const z = !m[3] || m[3] === 'UTC' ? 'Z' : m[3].slice(0, 3) + ':' + m[3].slice(3);
  const d = new Date(m[1] + 'T' + m[2] + z); return isNaN(d) ? null : d.toISOString();
}
/* GitHub simulado da demonstração: arquivos, SHAs e commits só na memória desta aba. Nenhuma requisição sai do aparelho. */
const GHD = { arquivos: {}, shas: {}, n: 0, log: [] };
function ghDemo(caminho, opt) {
  opt = opt || {}; const m = opt.method || 'GET';
  return new Promise(ok => setTimeout(ok, 160)).then(() => {
    const erro = (st, msg) => { throw Object.assign(new Error(msg), { status: st }); };
    const p = caminho.replace(/^\/repos\/[^/]+\/[^/]+/, '').split('?')[0];
    if (p === '') return { permissions: { push: true } };
    if (!p.startsWith('/contents/')) erro(404, 'Not Found');
    const f = decodeURIComponent(p.slice('/contents/'.length));
    if (m === 'GET') {
      if (f === 'fotos') { const fs = Object.keys(GHD.arquivos).filter(k => k.startsWith('fotos/')).map(k => ({ type: 'file', name: k.slice(6), path: k, sha: GHD.shas[k], size: Math.round(GHD.arquivos[k].length * 3 / 4) })); if (!fs.length) erro(404, 'Not Found'); return fs; }
      if (!(f in GHD.arquivos)) erro(404, 'Not Found');
      return { content: GHD.arquivos[f], sha: GHD.shas[f] };
    }
    const b = opt.body || {};
    if (m === 'PUT') { if (f in GHD.arquivos && b.sha !== GHD.shas[f]) erro(409, 'conflict'); GHD.arquivos[f] = b.content; GHD.shas[f] = 'demo' + (++GHD.n); GHD.log.push({ arquivo: f, mensagem: b.message, em: Date.now() }); faixaDemo(); return { content: { sha: GHD.shas[f], path: f } }; }
    if (m === 'DELETE') { delete GHD.arquivos[f]; GHD.log.push({ arquivo: f, mensagem: b.message, em: Date.now() }); faixaDemo(); return null; }
    erro(405, 'Método não suportado');
  });
}
async function gh(caminho, opt) {
  if (DEMO) return ghDemo(caminho, opt);
  opt = opt || {};
  let r;
  try { r = await fetch(API + caminho, { method: opt.method || 'GET', headers: Object.assign({ 'Authorization': 'Bearer ' + A.token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, opt.body ? { 'Content-Type': 'application/json' } : {}), body: opt.body ? JSON.stringify(opt.body) : undefined, cache: 'no-store' }); }
  catch (e) { const x = new Error('Sem conexão com o GitHub. Confira a internet e tente de novo.'); x.status = 0; throw x; }
  const exp = lerValidade(r.headers.get('github-authentication-token-expiration'));
  if (exp && exp !== A.tokenExp) { A.tokenExp = exp; ss.set('admin:token-exp', exp); }
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.message || ('Erro ' + r.status)); e.status = r.status; throw e; }
  return j;
}
function msgErro(e, acao) {
  const s = e && e.status;
  if (s === 0) return e.message;
  if (s === 401) return 'O GitHub não aceitou o token (expirado ou revogado). Saia e entre com um token novo.';
  if (s === 403) return /rate limit/i.test(e.message) ? 'O GitHub pediu uma pausa (limite de uso). Espere alguns minutos e tente de novo.' : 'O token não tem permissão para isso. Ele precisa de “Contents: Read and write” neste repositório.';
  if (s === 404) return 'Não encontrei o repositório ou o arquivo. Confira o nome do repositório e o acesso do token.';
  if (s === 409 || s === 422) return 'O site mudou no GitHub enquanto você ' + (acao || 'publicava') + '. Toque em Publicar de novo: o painel junta as alterações.';
  return (acao ? 'Não foi possível ' + acao + ': ' : '') + (e && e.message || 'erro desconhecido');
}
const repoPath = () => `/repos/${encodeURIComponent(A.cfg.owner)}/${encodeURIComponent(A.cfg.repo)}`;
const b64 = { de(s) { const bin = atob(s.replace(/\n/g, '')); const u = Uint8Array.from(bin, c => c.charCodeAt(0)); return new TextDecoder().decode(u); },
  para(str) { const u = new TextEncoder().encode(str); let bin = ''; for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(bin); } };
/* ---------------- dados do guia: leitura e escrita ----------------
   Fonte: dados/conteudo.json (JSON puro, esquema em dados/ESQUEMA.md). Repositório antigo: conteudo.js (window.CONTEUDO = …).
   O painel lê o arquivo que existir e, ao publicar, grava no MESMO formato até o anfitrião tocar em "Atualizar formato".
   Nunca apaga conteudo.js sozinho. */
const ARQ_JSON = 'dados/conteudo.json', ARQ_JS = 'conteudo.js';
const arqDe = (formato) => formato === 'js' ? ARQ_JS : ARQ_JSON;
const carregarScript = (src) => new Promise((ok, falha) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => falha(new Error('não consegui carregar ' + src)); document.head.appendChild(s); });
async function garantirContrato() { if (!window.GuiaDados) await carregarScript('../assets/dados.js'); if (!window.GuiaDados) throw new Error('o arquivo assets/dados.js não carregou'); }
/* Mesma normalização do site + saneamento do painel (links, datas, fotos). Devolve { obj, fix }. */
function preparar_(bruto) {
  if (!window.GuiaDados) { const x = new Error('O contrato dos dados (assets/dados.js) não carregou. Recarregue a página.'); x.status = -1; throw x; }
  const av = []; const obj = GuiaDados.normalizar(bruto, av);
  const fix = sanear(obj);
  return { obj, fix: av.filter(a => !/^formato migrado/.test(a)).concat(fix) };
}
const lerConteudo = (txt) => { const t = String(txt).replace(/^﻿/, '').trim(); return JSON.parse(/^window\.CONTEUDO\s*=/.test(t) ? t.replace(/^window\.CONTEUDO\s*=\s*/, '').replace(/;\s*$/, '') : t); };
const escreverConteudo = (o, formato) => { const n = preparar_(o).obj; const j = JSON.stringify(n, null, 2); return formato === 'js' ? 'window.CONTEUDO = ' + j + ';\n' : j + '\n'; };
async function baixarArquivo(caminho) {
  const j = await gh(`${repoPath()}/contents/${caminho}?ref=${encodeURIComponent(A.cfg.branch)}`);
  const texto = b64.de(j.content || '');
  let bruto; try { bruto = lerConteudo(texto); } catch (e) { const x = new Error(`O arquivo ${caminho} do repositório não é um JSON válido.`); x.status = -1; throw x; }
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) { const x = new Error(`O arquivo ${caminho} do repositório está num formato inesperado.`); x.status = -1; throw x; }
  return { sha: j.sha, bruto, texto };
}
async function baixarConteudo() {
  let r, formato = 'json';
  try { r = await baixarArquivo(ARQ_JSON); }
  catch (e) { if (e.status !== 404) throw e; formato = 'js'; r = await baixarArquivo(ARQ_JS); }
  const p = preparar_(r.bruto);
  return { sha: r.sha, obj: p.obj, texto: r.texto, formato, fix: p.fix, esquemaArquivo: Number(r.bruto.esquema) || 1 };
}

/* ---------------- validação de formatos ---------------- */
const urlValida = (u, soHttps) => { if (!tem(u)) return true; if (/\s/.test(String(u).trim())) return false; try { const x = new URL(String(u).trim()); return soHttps ? x.protocol === 'https:' && !!x.hostname : /^https?:$/.test(x.protocol) && !!x.hostname; } catch (e) { return false; } };
const srcValido = (s) => typeof s === 'string' && ((/^(?:\.\/)?fotos\/[\w\-./]+\.(?:jpe?g|png|webp|avif|gif)$/i.test(s) && !s.includes('..')) || /^https:\/\/[^\s"'<>()]+$/.test(s));
const CHAVES_URL = /^(link|link_cardapio|link_maps|link_reserva|video_url|url|url_publica|feedback_endpoint)$/;
const CHAVES_DATA = /^(verificado|validade)$/;
function notaValida(v) {
  if (typeof v === 'number') return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
  const m = String(v == null ? '' : v).match(/^\s*([1-5])(?:[.,]0+)?\s*(?:estrelas?|★+|\/\s*5)?\s*$/i);
  return m ? +m[1] : null;
}
/* Saneia um conteúdo vindo de fora. Corrige no lugar e devolve a lista do que foi corrigido. */
function sanear(o) {
  const fix = [];
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('o conteúdo precisa ser um objeto JSON');
  if (!o.casa || typeof o.casa !== 'object' || Array.isArray(o.casa)) throw new Error('falta a seção "casa"');
  ['lugares', 'roteiros', 'contatos', 'beneficios', 'avaliacoes', 'provar', 'destaques'].forEach(k => { if (o[k] != null && !Array.isArray(o[k])) { fix.push(k + ': não era uma lista'); o[k] = []; } });
  o.config = o.config && typeof o.config === 'object' && !Array.isArray(o.config) ? o.config : {};
  if (typeof o.config.og_imagem === 'string') o.config.og_imagem = o.config.og_imagem ? { src: o.config.og_imagem, alt: '' } : null;
  const andar = (x, p) => {
    if (Array.isArray(x)) { x.forEach((v, i) => andar(v, p + '.' + i)); return; }
    if (!x || typeof x !== 'object') return;
    Object.keys(x).forEach(k => {
      const v = x[k], q = p ? p + '.' + k : k;
      if (/^(__proto__|constructor|prototype)$/.test(k)) { delete x[k]; fix.push(q + ': chave proibida'); return; }
      if (CHAVES_DATA.test(k) && v != null && v !== '' && !(typeof v === 'string' && RE_DIA.test(v) && !isNaN(new Date(v)))) { x[k] = null; fix.push(q + ': data inválida removida'); return; }
      if (CHAVES_URL.test(k) && v != null && v !== '' && !(typeof v === 'string' && urlValida(v))) { x[k] = ''; fix.push(q + ': link inválido removido'); return; }
      if (CHAVES_URL.test(k) && typeof v === 'string' && ehIcal(v)) { x[k] = ''; fix.push(q + ': link secreto do calendário removido (ele vai só no Apps Script, em ICAL_URL)'); return; }
      if (k === 'src' && v != null && v !== '' && !srcValido(v)) { x[k] = ''; fix.push(q + ': endereço de foto inválido removido'); return; }
      if ((k === 'lat' || k === 'lng') && v != null && v !== '' && !(typeof v === 'number' && isFinite(v))) { const n = Number(String(v).replace(',', '.')); x[k] = isFinite(n) && String(v).trim() !== '' ? n : null; if (x[k] !== v) fix.push(q + ': coordenada corrigida'); return; }
      if (/^(tags|bom_saber|camas|regras_casa|regras_condominio|lixo_limpeza|seguranca|saida)$/.test(k) && v != null && !Array.isArray(v)) { x[k] = []; fix.push(q + ': lista inválida'); return; }
      andar(v, q);
    });
  };
  andar(o, '');
  (o.avaliacoes || []).forEach((a, i) => { if (a && a.nota != null && a.nota !== '') { const n = notaValida(a.nota); if (n !== a.nota) { a.nota = n; fix.push(`avaliacoes.${i}.nota: nota inválida`); } } });
  (o.lugares || []).forEach((l, i) => { if (l && tem(l.id) && !/^[a-z0-9][a-z0-9-]{0,79}$/.test(String(l.id))) { const novo = slug(l.id); fix.push(`lugares.${i}.id: identificador ajustado`); o.destaques = (o.destaques || []).map(d => d === l.id ? novo : d); (o.roteiros || []).forEach(r => (r.paradas || []).forEach(pa => { if (pa.lugar === l.id) pa.lugar = novo; })); l.id = novo; } });
  if (Array.isArray(o.destaques)) o.destaques = o.destaques.filter(d => typeof d === 'string');
  return fix;
}
/* Links que precisam de https:// (validação de publicação). */
function linksInvalidos(o) {
  const out = [];
  const andar = (x, p) => { if (Array.isArray(x)) x.forEach((v, i) => andar(v, p + '.' + i)); else if (x && typeof x === 'object') Object.keys(x).forEach(k => { const q = p ? p + '.' + k : k; if (CHAVES_URL.test(k) && tem(x[k]) && !urlValida(x[k], true)) out.push({ campo: q, valor: String(x[k]) }); else andar(x[k], q); }); };
  andar(o, ''); return out;
}

/* ---------------- detector de senhas e códigos ----------------
   Percorre só os VALORES de texto (nunca o JSON serializado), frase a frase, com limites de palavra. */
const SEG = {
  // palavras que quase sempre acompanham um segredo
  critica: /(?<![\p{L}\d])(senhas?|password|passwd|pin|c[oó]digos?(?: de acesso)?|cadeados?|cofres?|token)(?![\p{L}\d])/iu,
  // lugares de acesso: só contam com um valor bem característico
  acesso: /(?<![\p{L}\d])(wi-?fi|wireless|rede wi-?fi|port[aã]o|fechaduras?|alarmes?|trancas?|teclado)(?![\p{L}\d])/iu,
  // valores fortes: dígitos ou mistura de letras e dígitos logo depois de ":", "=", "é", "digite"
  forte: [
    /[:=]\s*["“'«]?[^\s"”'»]*\d{3,}/u,
    /[:=][^.!?\n]{0,40}?(?<![\p{L}\d])(?=[\p{L}\d]*\d)(?=[\p{L}\d]*\p{L})[\p{L}\d]{5,}/u,
    /(?<![\p{L}\d])(?:é|e|digite|use|usar|tecle)\s+["“'«]?(?=[^\s"”'»]*\d)[^\s"”'»]{3,}/iu,
    /(?<![\p{L}\d.,/:-])(?!(?:19|20)\d{2}(?!\d))\d{4,8}#?(?![\p{L}\d.,/-])/u
  ],
  // valores ambíguos: "senha é coqueiral", "Wi-Fi: CasaAnahi"
  fraco: [
    /[:=]\s*["“'«]?\p{L}[\p{L}\d._-]{2,}/u,
    /(?<![\p{L}\d])(?:é|e|será)\s+["“'«]?(?!(?:enviad|passad|informad|entregue|compartilhad|fornecid|dad[ao]|feit[ao]|necess|obrigat|pessoa|individua|trocad|alterad|f[aá]cil|simples|segur|autom[aá]tic|eletr[oô]nic|digita|manua|liberad|abert|fechad|trancad|travad|mesm|diferente|nov[ao]|igua|sempre|nunca|apenas|muito|exclusiv|pedid|solicitad|combinad|repassad|mandad|entregue|gerad)|(?:o|a|os|as|um|uma|só|por|pel[oa]|de|do|da|no|na|em|ao|bem|s[oó]|aqui|ali|l[aá])(?![\p{L}]))\p{L}{3,}/iu
  ]
};
// Campos que não são texto exibido (ou são públicos por natureza, como o código promocional de um benefício).
const CAMPOS_SEM_TEXTO = /^(id|icone|categoria|status|nivel|area|tipo|src|url|link|link_cardapio|link_maps|link_reserva|video_url|feedback_endpoint|url_publica|ilustracao|precisao|lugar|verificado|validade|whatsapp|telefone|data|atualizado_em|instagram|versao)$/;
// Observação: nota_interna CONTINUA sendo verificada pelo detector de senhas: ela não aparece no site, mas fica no arquivo público do repositório.
function* textosDe(o, p) {
  if (typeof o === 'string') { yield [p, o]; return; }
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) yield* textosDe(o[i], p + '.' + i); return; }
  if (o && typeof o === 'object') for (const k of Object.keys(o)) {
    if (k === '_confirmar' || CAMPOS_SEM_TEXTO.test(k)) continue;
    if (k === 'codigo' && /^beneficios\.\d+$/.test(p)) continue;
    yield* textosDe(o[k], p ? p + '.' + k : k);
  }
}
function avaliarFrase(f) {
  const crit = SEG.critica.test(f), acesso = SEG.acesso.test(f);
  if (!crit && !acesso) return null;
  const forte = SEG.forte.some(re => re.test(f));
  if (forte && crit) return 'forte';
  if (forte && acesso) return SEG.forte.slice(1).some(re => re.test(f)) || /[:=]\s*["“'«]?\d{3,}/.test(f) && /\d{4,}/.test(f) ? 'forte' : 'ambiguo';
  if (crit && (SEG.fraco[0].test(f) || SEG.fraco[1].test(f))) return 'ambiguo';
  if (acesso && /wi-?fi[^:=.!?]{0,15}[:=]\s*["“'«]?\S{3,}/iu.test(f)) return 'ambiguo'; // "Wi-Fi: NomeDaRede"
  return null;
}
function procurarSegredos(obj) {
  const achados = [];
  for (const [campo, t] of textosDe(obj, '')) {
    t.split(/\n+|(?<=[.!?;])\s+/).map(s => s.trim()).filter(Boolean).forEach(f => { const nivel = avaliarFrase(f); if (nivel) achados.push({ campo, trecho: f.length > 120 ? f.slice(0, 117) + '…' : f, nivel }); });
  }
  return achados;
}
/* ---------------- notas editoriais (A01) ----------------
   Textos de bastidor ("confirme antes de publicar", "citado em guia de viagem") não podem ir ao site junto de um lugar publicado.
   forte = bloqueia; ambiguo = pode ser aviso legítimo ao hóspede ("Horários mudam: confirme no local"), pede confirmação. */
const NOTA_ED = {
  forte: /antes de publicar|sua curadoria|lista de partida|a validar|cadastre cada um|nota interna|n[aã]o publicar/iu,
  marcador: /(?<![\p{L}])(?:TODO|FIXME)(?![\p{L}])/u, // só em maiúsculas: "todo" é palavra comum em português
  ambiguo: /confirme se|confira se|confirme (?:funcionamento|chef|card[aá]pio|contatos?|hor[aá]rios? e pre[cç]os?)|(?<![\p{L}])citad[oa]s?(?![\p{L}])|guias? de viagem|guias? da rota|segundo (?:o |a )?guia/iu
};
const CAMPOS_NOTA = ['resumo', 'descricao', 'dica', 'bom_saber'];
const CATS_COMIDA = ['restaurante', 'cafe', 'mercado', 'delivery'];
const frases = (t) => String(t || '').split(/\n+|(?<=[.!?;])\s+/).map(s => s.trim()).filter(Boolean);
function notasEditoriais(l, i) {
  const out = []; if (!l || typeof l !== 'object') return out;
  CAMPOS_NOTA.forEach(k => {
    const v = l[k], lista = Array.isArray(v) ? v.map((s, j) => [k + '.' + j, s]) : [[k, v]];
    lista.forEach(([campo, txt]) => frases(txt).forEach(f => {
      const nivel = NOTA_ED.forte.test(f) || NOTA_ED.marcador.test(f) ? 'forte' : NOTA_ED.ambiguo.test(f) ? 'ambiguo' : null;
      if (nivel) out.push({ campo: `lugares.${i}.${campo}`, trecho: f.length > 140 ? f.slice(0, 137) + '…' : f, frase: f, nivel, chave: k });
    }));
  });
  return out;
}
const contatoOk = (l) => ['horario', 'telefone', 'whatsapp', 'link', 'link_cardapio'].some(k => tem(l[k]));
/* Problemas de um lugar publicado: notas internas no texto e (comida) falta de horário/contato/link. */
function problemasLugar(l, i) {
  const notas = notasEditoriais(l, i);
  const semContato = CATS_COMIDA.includes(l.categoria) && !contatoOk(l);
  return { notas, fortes: notas.filter(n => n.nivel === 'forte'), ambiguos: notas.filter(n => n.nivel === 'ambiguo'), semContato };
}
function problemasLugares(o) {
  const fortes = [], ambiguos = [], semContato = [];
  ((o && o.lugares) || []).forEach((l, i) => {
    if (!l || l.status === 'rascunho') return;
    const p = problemasLugar(l, i); fortes.push(...p.fortes); ambiguos.push(...p.ambiguos);
    if (p.semContato) semContato.push({ campo: `lugares.${i}.horario`, nome: l.nome || 'Lugar sem nome', i });
  });
  return { fortes, ambiguos, semContato };
}
/* Tira uma frase do texto (ou da lista "Bom saber") e guarda na nota interna. */
function moverParaNota(i, campo, frase) {
  const l = A.draft.lugares[i]; if (!l) return false;
  const k = campo.split('.')[0], j = campo.split('.')[1];
  if (Array.isArray(l[k])) {
    const s = String(l[k][+j] || ''); const resto = s.replace(frase, '').replace(/\s{2,}/g, ' ').replace(/^[\s|;:,.-]+|[\s|;:,-]+$/g, '').trim();
    if (resto && resto !== s.trim()) l[k][+j] = resto; else l[k].splice(+j, 1);
  } else {
    const s = String(l[k] || ''); if (!s.includes(frase)) return false;
    l[k] = s.replace(frase, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }
  l.nota_interna = (tem(l.nota_interna) ? String(l.nota_interna).trim() + '\n' : '') + frase;
  return true;
}

/* ---------------- telefones (A03) ----------------
   "(82) 99999-0000", "82 99999 0000", "+55 82 9…", "082 9…" viram 5582999990000. Devolve null se não der para entender. */
function normalizarWhats(v) {
  if (!tem(v)) return '';
  let d = String(v).replace(/\D/g, '');
  if (!d) return null;
  if (/^00/.test(d)) d = d.slice(2);                                   // 0055 82…
  else if (/^0/.test(d)) { const r = d.slice(1); d = r.length >= 12 ? r.slice(2) : r; } // 082… ou 0 + operadora + DDD
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return /^55\d{10,11}$/.test(d) || (/^\d{12,13}$/.test(d) && !d.startsWith('55')) ? d : null;
}
const whatsBonito = (d) => { const m = String(d).match(/^55(\d{2})(\d{4,5})(\d{4})$/); return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : '+' + d; };

/* Nome amigável para um caminho do conteúdo + seção do painel onde ele é editado. */
const NOMES_SECAO = { casa: 'A casa', lugares: 'Lugares', roteiros: 'Roteiros', contatos: 'Contatos', beneficios: 'Benefícios', avaliacoes: 'Avaliações', regiao: 'Região e sabores', provar: 'Região e sabores', destaques: 'Lugares', config: 'Configurações' };
const NOMES_CAMPO = { nome: 'nome', subtitulo: 'descrição curta', frase: 'frase de assinatura', sobre: 'sobre a casa', descricao: 'descrição', resumo: 'resumo', dica: 'dica', texto: 'texto', titulo: 'título', resposta: 'resposta', pergunta: 'pergunta', link: 'site ou reserva', link_cardapio: 'cardápio', link_maps: 'link do Google Maps', link_reserva: 'link para reservar', video_url: 'vídeo', url: 'link da fonte', url_publica: 'endereço do site', feedback_endpoint: 'endereço do feedback', obs: 'observação', nota_interna: 'nota interna', bom_saber: 'bom saber', horario: 'horário', telefone: 'telefone', condicoes: 'condições', restricoes: 'restrições', whatsapp: 'WhatsApp', checkin: 'check-in', checkout: 'check-out', instagram: 'Instagram', anfitriao: 'anfitrião', endereco_publico: 'endereço', coordenadas: 'coordenadas', hospedes: 'hóspedes', suites: 'suítes', area_m2: 'área', camas: 'camas' };
function ondeFica(campo) {
  const p = campo.split('.'), sec = p[0];
  let ir = { casa: (p[1] === 'chegada' ? 'chegada' : 'casa'), provar: 'regiao', destaques: 'lugares' }[sec] || sec;
  if (sec === 'config' && p[1] === 'url_publica') ir = 'qr';
  let nome = sec === 'casa' && p[1] === 'chegada' ? 'Chegada e saída' : (NOMES_SECAO[sec] || sec);
  const col = A.draft && Array.isArray(A.draft[sec]) && /^\d+$/.test(p[1]) ? A.draft[sec][+p[1]] : null;
  if (col) nome += ' › ' + (col.nome || col.titulo || col.autor || ('item ' + (+p[1] + 1)));
  else if (sec === 'casa' && p[1] && p[1] !== 'chegada') nome += ' › ' + ({ faq: 'Dúvidas frequentes', comodidades: 'Comodidades', ambientes: 'Ambientes', regras_casa: 'Regras da casa', regras_condominio: 'Regras do condomínio', lixo_limpeza: 'Lixo e limpeza', seguranca: 'Segurança' }[p[1]] || NOMES_CAMPO[p[1]] || p[1]);
  const fim = p[p.length - 1]; if (!/^\d+$/.test(fim) && NOMES_CAMPO[fim] && !nome.endsWith(NOMES_CAMPO[fim])) nome += ' (' + NOMES_CAMPO[fim] + ')';
  return { nome, ir, i: col ? +p[1] : null, sec };
}

/* ---------------- junção (merge) por seção ----------------
   base = versão de onde o rascunho partiu; minha = rascunho; deles = versão atual do GitHub.
   Junta por seção (e por item, nas listas com id). Se o mesmo ponto mudou nos dois lados de formas diferentes, é conflito. */
function mesclar(base, minha, deles, preferir) {
  const conflitos = [];
  const chaveItem = (x) => x && typeof x === 'object' ? (x.id || null) : null;
  const ehObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const temIds = (arr) => Array.isArray(arr) && arr.length > 0 && arr.every(x => chaveItem(x));
  function junta(b, m, d, p, nivel) {
    if (igual(m, d)) return clone(m === undefined ? d : m);
    if (igual(m, b)) return d === undefined ? undefined : clone(d);
    if (igual(d, b)) return m === undefined ? undefined : clone(m);
    if (nivel < 2 && ehObj(m) && ehObj(d)) {
      const bb = ehObj(b) ? b : {}, out = {};
      [...new Set([...Object.keys(d), ...Object.keys(m)])].forEach(k => { const v = junta(bb[k], m[k], d[k], p ? p + '.' + k : k, nivel + 1); if (v !== undefined) out[k] = v; });
      return out;
    }
    if (nivel < 2 && Array.isArray(m) && Array.isArray(d) && (temIds(m) || temIds(d)) && (m.length === 0 || temIds(m)) && (d.length === 0 || temIds(d))) {
      const bb = Array.isArray(b) ? b : [], ib = new Map(bb.map(x => [chaveItem(x), x])), im = new Map(m.map(x => [chaveItem(x), x])), id = new Map(d.map(x => [chaveItem(x), x]));
      const ordem = d.map(chaveItem); m.forEach((x, i) => { const k = chaveItem(x); if (!id.has(k) && !ib.has(k)) ordem.splice(Math.min(i, ordem.length), 0, k); });
      const out = [];
      ordem.forEach(k => { const v = junta(ib.get(k), im.get(k), id.get(k), p + '[' + k + ']', 3); if (v !== undefined) out.push(v); });
      return out;
    }
    conflitos.push(p || '(tudo)');
    return clone(preferir === 'deles' ? d : m);
  }
  const obj = junta(base || {}, minha, deles, '', 0);
  return { obj, conflitos };
}

/* ---------------- endereço público ---------------- */
function urlPublica() {
  const c = (A.draft && A.draft.config) || {};
  if (tem(c.url_publica) && urlValida(c.url_publica, true)) return String(c.url_publica).trim().replace(/\/?$/, '/');
  if (DEMO) { try { return new URL('../', location.href).href; } catch (e) { return ''; } }
  const o = String(A.cfg.owner || '').toLowerCase(), r = String(A.cfg.repo || '');
  if (!o) return '';
  return r.toLowerCase() === o + '.github.io' ? `https://${o}.github.io/` : `https://${o}.github.io/${r}/`;
}

/* ---------------- rascunho ---------------- */
const sujo = () => !!(A.remoto && A.draft && !igual(A.draft, A.remoto.obj));
let salvarT = null, avisouCota = false;
function salvarRascunho() {
  if (!A.draft) return;
  if (!sujo()) { ls.del('admin:rascunho'); return; }
  const ok = ls.set('admin:rascunho', { v: 2, base: A.baseSha, baseObj: A.baseObj, em: Date.now(), obj: A.draft });
  if (!ok && !avisouCota && !ARMAZ_BLOQUEADO) { avisouCota = true; toast('Não consegui salvar o rascunho neste aparelho (sem espaço). Publique ou baixe uma cópia em Configurações.', true); }
}
function mudou() {
  clearTimeout(salvarT); salvarT = setTimeout(salvarRascunho, 300);
  atualizarBarra();
}
function caminho(obj, p) { return p.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function definir(obj, p, v) { const ks = p.split('.'); if (ks.some(k => /^(__proto__|constructor|prototype)$/.test(k))) return; let o = obj; ks.slice(0, -1).forEach((k, i) => { if (o[k] == null) o[k] = /^\d+$/.test(ks[i + 1]) ? [] : {}; o = o[k]; }); o[ks[ks.length - 1]] = v; }

function resumoMudancas(a, b) {
  a = a || (A.remoto && A.remoto.obj); b = b || A.draft;
  if (!a || !b || igual(a, b)) return [];
  const out = [];
  Object.keys(Object.assign({}, a, b)).forEach(k => {
    if (k === 'atualizado_em' || igual(a[k], b[k])) return;
    if (Array.isArray(b[k]) && Array.isArray(a[k]) && (b[k].length || a[k].length) && typeof (b[k][0] || a[k][0]) === 'object') {
      const chave = (x) => x.id || x.nome || x.titulo || x.texto;
      const ia = Object.fromEntries(a[k].map(x => [chave(x), JSON.stringify(x)])), ib = Object.fromEntries(b[k].map(x => [chave(x), JSON.stringify(x)]));
      const add = Object.keys(ib).filter(x => !(x in ia)).length, rem = Object.keys(ia).filter(x => !(x in ib)).length, ed = Object.keys(ib).filter(x => x in ia && ia[x] !== ib[x]).length;
      out.push(`${NOMES_SECAO[k] || k}: ${[add && add + ' novo(s)', ed && ed + ' editado(s)', rem && rem + ' removido(s)'].filter(Boolean).join(', ') || 'nova ordem'}`);
    } else if (k === 'casa' && a.casa && b.casa) {
      const ch = Object.keys(Object.assign({}, a.casa, b.casa)).filter(x => !igual(a.casa[x], b.casa[x]));
      out.push('A casa: ' + ch.map(x => x === 'chegada' ? 'chegada e saída' : ({ fotos: 'fotos', comodidades: 'comodidades', faq: 'dúvidas frequentes', ambientes: 'ambientes' }[x] || NOMES_CAMPO[x] || x.replace(/_/g, ' '))).slice(0, 6).join(', ') + (ch.length > 6 ? '…' : ''));
    } else out.push(NOMES_SECAO[k] || k);
  });
  return out;
}

/* ---------------- verificações de qualidade ---------------- */
function verificar() {
  const C = A.draft, casa = C.casa || {}, ch = casa.chegada || {}, it = [];
  const ck = (ok, txt, falta, grupo, ir, erro) => it.push({ e: ok ? 'ok' : (erro ? 'erro' : 'falta'), txt: ok ? txt : falta, grupo, ir });
  const wa = String(casa.whatsapp || '').replace(/\D/g, '');
  ck(tem(casa.nome), 'Nome da casa', 'Defina o nome da casa', 'Essenciais', 'casa');
  ck(wa.length >= 12, 'WhatsApp do anfitrião', tem(casa.whatsapp) ? 'WhatsApp inválido: use DDI + DDD + número, ex. 5582999999999' : 'Cadastre o WhatsApp: ele ativa todos os botões de contato do site', 'Essenciais', 'casa', tem(casa.whatsapp));
  ck(tem(casa.checkin) && tem(casa.checkout), 'Horários de check-in e check-out', 'Informe check-in e check-out', 'Essenciais', 'casa');
  ck(tem(casa.link_maps), 'Link de rota até a casa', 'Cole o link do Google Maps até a portaria', 'Essenciais', 'casa');
  ck(casa.coordenadas && casa.coordenadas.lat != null, 'Coordenadas da casa', 'Informe as coordenadas: elas põem a casa no mapa e afinam a previsão do tempo', 'Essenciais', 'casa');
  ck((casa.fotos || []).length >= 5, `${(casa.fotos || []).length} fotos da casa`, `${(casa.fotos || []).length} foto(s) da casa; recomendamos 5 ou mais (a primeira vira a capa)`, 'A casa', 'casa');
  ck(casa.hospedes != null && casa.quartos != null && casa.banheiros != null, 'Capacidade, quartos e banheiros', 'Preencha hóspedes, quartos e banheiros', 'A casa', 'casa');
  ck(tem(casa.sobre), 'Texto “Sobre a casa”', 'Escreva o texto “Sobre a casa”', 'A casa', 'casa');
  [['comodidades', 'Comodidades'], ['regras_casa', 'Regras da casa'], ['regras_condominio', 'Regras do condomínio'], ['lixo_limpeza', 'Lixo e limpeza'], ['seguranca', 'Segurança'], ['faq', 'Dúvidas frequentes']].forEach(([k, r]) => ck(tem(casa[k]), r, r + ': ainda vazio', 'A casa', 'casa'));
  ck(tem(ch.trajetos), 'Trajetos até a casa', 'Trajetos até a casa: ainda vazio', 'Chegada e saída', 'chegada');
  [['como_chegar', 'Como chegar'], ['entrada', 'Portaria'], ['chaves', 'Chaves e acesso'], ['estacionamento', 'Estacionamento'], ['saida', 'Checklist de saída'], ['imprevistos', 'Imprevistos']].forEach(([k, r]) => ck(tem(ch[k]), r, r + ': ainda vazio', 'Chegada e saída', 'chegada'));
  const L = C.lugares || [];
  const pub = L.filter(l => l.status !== 'rascunho'), rasc = L.filter(l => l.status === 'rascunho');
  const comer = pub.filter(l => ['restaurante', 'cafe', 'mercado', 'delivery'].includes(l.categoria));
  ck(comer.length >= 4, `${comer.length} lugares para comer publicados`, `${comer.length} lugar(es) para comer publicados; recomendamos ao menos 4`, 'Guia da região', 'lugares');
  if (rasc.length) it.push({ e: 'falta', txt: `${rasc.length} lugar(es) em rascunho esperando sua conferência`, grupo: 'Guia da região', ir: 'lugares' });
  const semConf = pub.filter(l => !tem(l.verificado)).length;
  if (semConf) it.push({ e: 'falta', txt: `${semConf} lugar(es) publicados ainda sem data de conferência`, grupo: 'Guia da região', ir: 'lugares' });
  const semFoto = pub.filter(l => !(l.foto && tem(l.foto.src))).length;
  if (semFoto) it.push({ e: 'falta', txt: `${semFoto} lugar(es) com ilustração no lugar de foto real`, grupo: 'Guia da região', ir: 'lugares' });
  const semMapa = pub.filter(l => l.lat == null || l.lng == null).length;
  if (semMapa) it.push({ e: 'falta', txt: `${semMapa} lugar(es) fora do mapa (sem coordenadas)`, grupo: 'Guia da região', ir: 'lugares' });
  const PL = problemasLugares(C);
  [...new Set(PL.fortes.map(n => +n.campo.split('.')[1]))].forEach(i => it.push({ e: 'erro', txt: `Nota interna no texto de um lugar publicado (o hóspede veria): ${L[i].nome}`, grupo: 'Guia da região', ir: 'lugares' }));
  [...new Set(PL.ambiguos.map(n => +n.campo.split('.')[1]))].forEach(i => it.push({ e: 'falta', txt: `Confira se o texto é para o hóspede: ${L[i].nome}`, grupo: 'Guia da região', ir: 'lugares' }));
  PL.semContato.forEach(x => it.push({ e: 'erro', txt: `Publicado sem horário, telefone ou link: ${x.nome}`, grupo: 'Guia da região', ir: 'lugares' }));
  ck((C.contatos || []).some(c => c.nivel === 'essencial'), 'Contatos essenciais cadastrados', 'Nenhum contato essencial (farmácia, mercado, saúde)', 'Contatos', 'contatos');
  (C.contatos || []).forEach(c => { if (tem(c.telefone) && /[^\d\s()+-]/.test(c.telefone)) it.push({ e: 'erro', txt: `Telefone com caracteres inválidos: ${c.nome}`, grupo: 'Contatos', ir: 'contatos' }); });
  (C.beneficios || []).forEach(b => { if (tem(b.validade) && b.validade < hoje()) it.push({ e: 'falta', txt: `Benefício vencido (já não aparece no site): ${b.titulo || b.parceiro}`, grupo: 'Benefícios', ir: 'beneficios' }); });
  { const cfg = C.config || {}, res = String(casa.link_reserva || '').trim();
    if (tem(res) && urlValida(res, true) && !ehIcal(res) && !ehAirbnb(res)) it.push({ e: 'falta', txt: 'O link de reserva não é do Airbnb (airbnb.com ou airbnb.com.br): o botão aparece como “Reservar”. Confira se é o anúncio certo.', grupo: 'Reservas', ir: 'casa' });
    else if (tem(res) && ehAirbnb(res)) it.push({ e: 'ok', txt: 'Botão “Reservar no Airbnb” ativo', grupo: 'Reservas', ir: 'casa' });
    if (!tem(res) || !urlValida(res, true) || ehIcal(res)) it.push({ e: 'falta', txt: 'Falta o link da reserva (Airbnb): sem ele o botão “Reservar” não aparece no site', grupo: 'Reservas', ir: 'casa' });
    if (cfg.agenda_visivel === true) ck(tem(cfg.feedback_endpoint), 'Agenda de disponibilidade ligada (confira em A casa › Testar agenda)', 'A agenda está ligada, mas falta o endereço do Apps Script (Configurações › Feedback): no site ela não aparece', 'Reservas', tem(cfg.feedback_endpoint) ? 'casa' : 'config', true); }
  { const vaz = []; const andar = (x, p) => { if (typeof x === 'string') { if (ehIcal(x)) vaz.push(p); } else if (x && typeof x === 'object') Object.keys(x).forEach(k => andar(x[k], p ? p + '.' + k : k)); }; andar(C, '');
    vaz.forEach(p => { const o = ondeFica(p); it.push({ e: 'erro', txt: `Link secreto do calendário (iCal) no conteúdo público: apague · ${o.nome}`, grupo: 'Segurança', ir: o.ir }); }); }
  ck(tem((C.config || {}).feedback_endpoint), 'Feedback ligado ao painel', 'Conecte o formulário de feedback ao painel (veja Configurações)', 'Feedback', 'config');
  ck(!!((C.config || {}).og_imagem && C.config.og_imagem.src), 'Imagem de compartilhamento', 'Escolha a imagem que aparece ao enviar o link no WhatsApp', 'Publicação', 'config');
  linksInvalidos(C).forEach(l => { const o = ondeFica(l.campo); it.push({ e: 'erro', txt: `Link precisa começar com https:// · ${o.nome}`, grupo: 'Publicação', ir: o.ir }); });
  if (tem(casa.instagram) && !/^[A-Za-z0-9._]{1,30}$/.test(casa.instagram)) it.push({ e: 'erro', txt: 'Instagram: use só o nome do perfil, sem @ e sem link', grupo: 'A casa', ir: 'casa' });
  const seg = procurarSegredos(C);
  if (!seg.length) it.push({ e: 'ok', txt: 'Nenhuma senha ou código no conteúdo', grupo: 'Segurança', ir: 'avancado' });
  seg.forEach(s => { const o = ondeFica(s.campo); it.push({ e: s.nivel === 'forte' ? 'erro' : 'falta', txt: `${s.nivel === 'forte' ? 'Parece senha ou código' : 'Confira se não é senha'}: “${s.trecho}” · ${o.nome}`, grupo: 'Segurança', ir: o.ir }); });
  return it;
}

/* ---------------- Antes do primeiro hóspede (A05) ---------------- */
function antesDoHospede() {
  const C = A.draft, casa = C.casa || {}, co = casa.coordenadas || {};
  const wa = normalizarWhats(casa.whatsapp);
  const fotos = (casa.fotos || []).filter(f => f && tem(f.src)).length;
  return [
    { ok: tem(casa.nome), txt: 'Nome da casa', falta: 'Escreva o nome da casa', campo: 'casa.nome', botao: 'Escrever' },
    { ok: !!wa && /^55/.test(wa), txt: 'WhatsApp do anfitrião', falta: 'Cadastre o seu WhatsApp: é por ele que o hóspede fala com você', campo: 'casa.whatsapp', botao: 'Cadastrar' },
    { ok: tem(casa.checkin) && tem(casa.checkout), txt: 'Horários de check-in e check-out', falta: 'Informe os horários de check-in e check-out', campo: tem(casa.checkin) ? 'casa.checkout' : 'casa.checkin', botao: 'Informar' },
    { ok: tem(casa.link_maps) || (co.lat != null && co.lng != null), txt: 'Rota até a casa', falta: 'Cadastre a rota até a casa: cole o link do Google Maps (ou as coordenadas) para o botão “Como chegar”', campo: 'casa.link_maps', botao: 'Colar link' },
    { ok: tem((C.config || {}).feedback_endpoint), txt: 'Formulário de feedback ligado', falta: 'Ligue o formulário de feedback (hoje o hóspede preenche e não consegue enviar)', campo: 'config.feedback_endpoint', botao: 'Ligar' },
    { ok: fotos >= 1, txt: fotos + ' foto(s) da casa', falta: 'Envie pelo menos 1 foto da casa (a primeira vira a capa)', campo: 'casa.fotos', botao: 'Enviar foto' }
  ];
}
function cartaoAntes() {
  const it = antesDoHospede(), ok = it.filter(i => i.ok).length, tot = it.length, pronto = ok === tot;
  return `<section class="card antes ${pronto ? 'pronto' : ''}" aria-labelledby="antes-tit">
    <div class="antes-cab"><div><span class="olho">${pronto ? 'Tudo certo' : 'Obrigatório'}</span><h2 class="t2" id="antes-tit">Antes do primeiro hóspede</h2>
      <p class="mudo" style="margin:4px 0 0">${pronto ? 'O essencial está preenchido. O hóspede consegue chegar, entrar em contato e avaliar a estadia.' : 'Sem estes itens o hóspede não consegue chegar, falar com você ou avaliar a estadia.'}</p></div>
      <div class="antes-num"><b>${ok} de ${tot}</b><span>prontos</span></div></div>
    <div class="barra-prog" role="progressbar" aria-valuenow="${ok}" aria-valuemin="0" aria-valuemax="${tot}" aria-valuetext="${ok} de ${tot} itens prontos" aria-label="Antes do primeiro hóspede"><span style="width:${Math.round(ok / tot * 100)}%"></span></div>
    <ol class="antes-lista">${it.map(i => `<li class="${i.ok ? 'ok' : 'falta'}">${ic(i.ok ? 'check' : 'alerta')}<span>${i.ok ? '<span class="sr-only">Pronto: </span>' + esc(i.txt) : '<span class="sr-only">Falta: </span>' + esc(i.falta)}</span>${i.ok ? '' : `<button type="button" class="btn btn-sec" data-ir-campo="${esc(i.campo)}">${esc(i.botao)}</button>`}</li>`).join('')}</ol>
  </section>`;
}

/* ---------------- marca ---------------- */
function marca(tipo, tema) {
  const M = window.Marca;
  try {
    if (M && typeof M[tipo] === 'function') return M[tipo]({ tema, titulo: 'Casa 18 Anahi' });
    if (M && typeof M.logo === 'function') return M.logo({ variante: tipo, tom: tema === 'escuro' ? 'claro' : 'escuro', titulo: 'Casa 18 Anahi' });
  } catch (e) {}
  return `<span class="marca-texto" role="img" aria-label="Casa 18 Anahi"><b>CASA 18</b><span>ANAHI</span></span>`;
}
const avisoArmaz = () => ARMAZ_BLOQUEADO ? `<div class="aviso" role="alert" style="margin-bottom:14px">${ic('alerta')}<span><b>O navegador está bloqueando o armazenamento deste site.</b> Dá para editar e publicar normalmente, mas o rascunho e o login não ficam salvos se você fechar a aba. Para corrigir, permita cookies e dados de sites para este endereço.</span></div>` : '';

/* ---------------- entrada ----------------
   Uma única senha (a do anfitrião). 1) senha → 2) só na primeira vez neste aparelho: o token do GitHub, uma vez → painel.
   Se o aparelho já tem o cofre, a mesma senha o abre. */
const RECURSOS_ENTRADA = `<ul class="entrada-lista"><li>${ic('casa')}<span>Textos, fotos e dicas do guia</span></li><li>${ic('mala')}<span>Mensagens prontas para cada hóspede</span></li><li>${ic('impressora')}<span>Cartões impressos com a marca da casa</span></li><li>${ic('feedback')}<span>O que os hóspedes dizem da estadia</span></li></ul>`;
function moldura(corpo, classe) {
  return `<main class="entrada ${classe || ''}"><div class="entrada-card">
    <div class="entrada-lado"><div class="entrada-logo">${marca('vertical', 'escuro')}</div><p class="assinatura">Seja bem-vindo!</p><p class="entrada-frase">Aqui, o tempo desacelera e a vida acontece.</p>${RECURSOS_ENTRADA}</div>
    <div class="entrada-form">${avisoArmaz()}${corpo}</div></div></main>`;
}
const caixaSenha = (id, rot, auto, extra) => `<div class="campo"><label for="${id}">${rot}</label><div class="senha-caixa"><input type="password" id="${id}" required autocomplete="${auto}" autocapitalize="off" spellcheck="false" ${extra || ''}><button type="button" class="ver-senha" data-ver-senha="${id}" aria-label="Mostrar a senha" aria-pressed="false">${ic('olho')}</button></div></div>`;
const HONESTO = `<p class="honesto">${ic('cadeado')}<span>A senha protege este aparelho; o token do GitHub é informado uma única vez.</span></p>`;
function telaSenha(msg) {
  A.senhaPendente = null; limparImpressao();
  $('#app').innerHTML = moldura(`
    <span class="olho">Área do anfitrião</span><h1 class="t1 entrada-tit">Casa 18 <em>Anahi</em></h1>
    <p class="entrada-lead">Digite a senha do anfitrião para abrir o painel.</p>
    <div id="s-msg">${msg ? `<div class="aviso erro" role="alert">${ic('alerta')}<span>${esc(msg)}</span></div>` : ''}</div>
    <form class="form" id="f-senha" novalidate>
      ${caixaSenha('s-senha', 'Senha do anfitrião', 'current-password')}
      <p class="espera" id="s-espera" aria-live="polite" hidden></p>
      <button class="btn btn-prim btn-grande" type="submit">${ic('cadeado')}Entrar</button>
    </form>
    ${HONESTO}
    <div class="ou" role="separator"><span>ou</span></div>
    <a class="btn btn-sec btn-grande" href="?demo" id="btn-demo">${ic('olho')}Conhecer em modo demonstração</a>
    <p class="peq mudo centro">Na demonstração nada é publicado e nada deste aparelho é usado.</p>
    <details class="esqueci"><summary>Esqueceu a senha?</summary>
      <p>A senha fica registrada só como um código embaralhado (hash) no arquivo <code>admin/acesso.json</code> do seu repositório. Para voltar à senha original do painel, entre no GitHub com a conta dona do guia, abra esse arquivo e apague-o (<span class="en">Delete file</span>). Em alguns minutos a senha original volta a valer.</p>
      <p>Depois, entre e cole o token de novo: o que estava guardado neste aparelho foi trancado com a senha esquecida e não pode ser aberto sem ela.</p></details>`, 'tela-senha');
  const f = $('#f-senha');
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); if (Tentativas.espera()) { ligarEspera(); return; }
    const senha = $('#s-senha').value; if (!senha) { erroSenha('Digite a senha do anfitrião.'); $('#s-senha').focus(); return; }
    const btn = f.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Conferindo…';
    let ok = false;
    try {
      const ac = await carregarAcesso(); ok = await conferirSenha(senha, ac); A.migrarSenha = null;
      if (ehLegado(ac)) { if (!ok && senha === SENHA_PADRAO) ok = await conferirSenha(senha, ACESSO_ORIGINAL); if (ok) A.migrarSenha = { usada: senha }; }
    }
    catch (x) { btn.disabled = false; btn.textContent = 'Entrar'; erroSenha('Este navegador não conseguiu conferir a senha (o painel precisa de um endereço https://).'); return; }
    if (!ok) {
      const t = Tentativas.falhou();
      telaSenha(t.espera ? `Senha incorreta. Por segurança, aguarde ${mmss(t.espera)} para tentar de novo.` : `Senha incorreta. ${t.n === 1 ? 'Mais 1 tentativa' : 'Esta foi a última tentativa'} antes de uma pausa.`);
      return;
    }
    Tentativas.zerar(); btn.textContent = 'Abrindo…';
    try { await depoisDaSenha(senha); } catch (x) { telaSenha('Não consegui abrir: ' + x.message); }
  });
  ligarEspera();
  if (!Tentativas.espera()) $('#s-senha').focus();
}
function erroSenha(m) { const box = $('#s-msg'); if (box) box.innerHTML = `<div class="aviso erro" role="alert">${ic('alerta')}<span>${esc(m)}</span></div>`; }
function ligarEspera() {
  clearInterval(ligarEspera._t);
  const atualizar = () => {
    const s = Tentativas.espera(), el = $('#s-espera'), inp = $('#s-senha'), btn = $('#f-senha button[type=submit]'); if (!el || !inp) { clearInterval(ligarEspera._t); return; }
    el.hidden = !s; el.textContent = s ? `Muitas tentativas. Tente de novo em ${mmss(s)}.` : '';
    inp.disabled = !!s; btn.disabled = !!s;
    if (!s) { clearInterval(ligarEspera._t); if (ligarEspera._ativo) { ligarEspera._ativo = false; inp.focus(); } }
  };
  if (Tentativas.espera()) { ligarEspera._ativo = true; ligarEspera._t = setInterval(atualizar, 1000); }
  atualizar();
}
async function depoisDaSenha(senha) {
  if (Cofre.existe()) {
    let d;
    try { d = await Cofre.abrir(senha); }
    catch (e) { if (e.codigo === 'senha') { telaSenhaAnterior(senha); return; } throw e; }
    const r = usarCofre(d);
    if (A.token && tem(A.cfg.owner) && tem(A.cfg.repo)) { await carregar(); return; }
    telaEntrada(r.venceu ? 'O token guardado neste aparelho venceu. Crie um novo no GitHub (passo a passo abaixo) e cole aqui.' : null);
    return;
  }
  A.senhaPendente = senha; A.cofreDados = novoCofre(); A.primeiraEntrada = true;
  telaEntrada();
}
/* O cofre deste aparelho foi trancado com outra senha: a anterior (trocada em outro aparelho) ou a antiga "senha local". */
function telaSenhaAnterior(senhaNova, msg) {
  $('#app').innerHTML = moldura(`
    <span class="olho">Área do anfitrião</span><h1 class="t1 entrada-tit">Só mais <em>um passo</em></h1>
    <p class="entrada-lead">A senha está certa, mas o acesso guardado neste aparelho foi trancado com outra senha: a anterior (se ela foi trocada em outro aparelho) ou a antiga senha local do painel.</p>
    ${msg ? `<div class="aviso erro" role="alert">${ic('alerta')}<span>${esc(msg)}</span></div>` : ''}
    <form class="form" id="f-anterior" novalidate>
      ${caixaSenha('a-senha', 'Senha anterior', 'off')}
      <span class="ajuda">Ela é pedida só esta vez: depois, o acesso guardado passa a abrir com a senha atual.</span>
      <button class="btn btn-prim btn-grande" type="submit">${ic('cadeado')}Atualizar e entrar</button>
    </form>
    <p class="peq mudo" style="margin-top:18px">Não lembra? <button type="button" class="btn-link" data-acao="recomecar-cofre">Informar o token de novo</button>. Os dados privados da casa e os modelos de mensagem guardados neste aparelho serão apagados.</p>`);
  $('#a-senha').focus();
  $('#f-anterior').addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = e.target.querySelector('button[type=submit]');
    if (Tentativas.espera()) { telaSenhaAnterior(senhaNova, `Aguarde ${mmss(Tentativas.espera())} para tentar de novo.`); return; }
    btn.disabled = true; btn.textContent = 'Abrindo…';
    let d; try { d = await Cofre.abrir($('#a-senha').value); }
    catch (x) { const t = Tentativas.falhou(); telaSenhaAnterior(senhaNova, t.espera ? `Senha anterior incorreta. Aguarde ${mmss(t.espera)} para tentar de novo.` : 'Senha anterior incorreta.'); return; }
    Tentativas.zerar(); await Cofre.criar(senhaNova, d); toast('Pronto: o acesso guardado agora abre com a senha atual.');
    const r = usarCofre(d);
    if (A.token && tem(A.cfg.owner) && tem(A.cfg.repo)) await carregar(); else telaEntrada(r.venceu ? 'O token guardado venceu. Cole um novo.' : null);
  });
  telaSenhaAnterior.nova = senhaNova;
}
/* Token: pedido uma única vez por aparelho (ou quando vence), logo depois da senha. */
function telaEntrada(msg) {
  if (!DEMO && !A.senhaPendente && !(Cofre.existe() && temChaveSessao())) { telaSenha(msg); return; }
  const conhecido = tem(A.cfg.owner) && tem(A.cfg.repo);
  const auto = !!(A.repoAuto && A.repoAuto.owner === A.cfg.owner && A.repoAuto.repo === A.cfg.repo);
  const primeiraVez = !ls.raw('admin:cfg');
  const conta = tem(A.cfg.owner) ? `<b>${esc(A.cfg.owner)}</b>` : 'dona do guia';
  const repoNome = tem(A.cfg.repo) ? `<b>${esc(A.cfg.repo)}</b>` : 'o repositório do guia';
  $('#app').innerHTML = moldura(`
    <span class="olho"><span class="passo-n">2 de 2</span>Conectar ao GitHub</span><h1 class="t1 entrada-tit">Senha conferida. <em>Agora, o token.</em></h1>
    <p class="entrada-lead">Só desta vez neste aparelho: cole o token que deixa o painel publicar no guia. Ele fica guardado aqui, cifrado com a sua senha. Nada vai ao ar sem você tocar em <b>Publicar</b>.</p>
    ${msg ? `<div class="aviso erro" role="alert" style="margin-bottom:14px">${ic('alerta')}<span>${esc(msg)}</span></div>` : ''}
    ${conhecido ? `<p class="repo-auto">${ic('check')} Guia encontrado: <b>${esc(A.cfg.owner)}/${esc(A.cfg.repo)}</b>${auto ? ' (pelo endereço desta página)' : ''}. Você só precisa do token.</p>` : ''}
    <details class="passo-a-passo ajuda-token" ${primeiraVez ? 'open' : ''}><summary>${primeiraVez ? 'Primeira vez? Crie o seu token em 5 passos' : 'Precisa de um token novo? Veja como criar'}</summary>
      <p class="peq mudo" style="margin:4px 0 10px">O token é uma chave que deixa este painel publicar no seu guia. O GitHub mostra as telas em inglês; abaixo, cada termo traduzido.</p>
      <ol class="passos-token">
        <li>Entre no GitHub com a conta ${conta}, a conta <b>dona do guia</b>. Se ele abrir com outra conta, saia dela antes (foto no canto de cima → <span class="en">Sign out</span>).</li>
        <li><a class="link-token" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Abrir a página do GitHub que cria o token ↗</a><br><span class="mudo peq">Abre em outra aba. Deixe esta aba aberta para colar o token depois.</span></li>
        <li>Em <span class="en">Token name</span> (nome), escreva <b>Painel Casa 18</b>. Em <span class="en">Expiration</span> (validade), escolha <b>30 days</b> (30 dias). Quando vencer, o painel pede um novo.</li>
        <li>Em <span class="en">Repository access</span> (acesso a repositórios), escolha <span class="en">Only select repositories</span> (só os que eu escolher) e marque ${repoNome}. Em <span class="en">Permissions</span> (permissões), abra <span class="en">Repository permissions</span> e, na linha <span class="en">Contents</span> (conteúdo), escolha <span class="en">Read and write</span> (ler e escrever). Não mexa no resto.</li>
        <li>Toque em <span class="en">Generate token</span> (gerar token), copie o código que começa com <b>github_pat_</b> e cole no campo abaixo. O GitHub só mostra esse código uma vez.</li>
      </ol></details>
    <form class="form" id="f-entrar" novalidate>
      <details class="repo-det" ${conhecido ? '' : 'open'}><summary>${conhecido ? 'Opções avançadas <span class="mudo">· trocar repositório ou branch</span>' : 'Onde está o guia no GitHub'}</summary>
        <div class="campos" style="margin-top:12px"><div class="campo"><label for="e-owner">Nome da conta no GitHub</label><input type="text" id="e-owner" required value="${esc(A.cfg.owner)}" autocomplete="username" spellcheck="false" autocapitalize="off"><span class="ajuda">Usuário ou organização dona do guia.</span></div>
        <div class="campo"><label for="e-repo">Nome do repositório do guia</label><input type="text" id="e-repo" required value="${esc(A.cfg.repo)}" spellcheck="false" autocapitalize="off"></div></div>
        <details class="avancadas"><summary>Opções avançadas</summary><div class="campo" style="margin-top:8px"><label for="e-branch">Branch (ramo do repositório)</label><input type="text" id="e-branch" value="${esc(A.cfg.branch || 'main')}" spellcheck="false" autocapitalize="off"><span class="ajuda">Quase sempre é “main”. Só mude se quem montou o site pediu.</span></div>
        <label class="check"><input type="checkbox" id="e-nao-guardar">Aparelho compartilhado: não guardar o token (pedir de novo a cada vez)</label></details></details>
      <div class="campo"><label for="e-token">Cole aqui o token (começa com github_pat_)</label><input type="password" id="e-token" required autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="github_pat_…"><span class="ajuda">Ele dá permissão para publicar no guia. Não envie para ninguém.</span></div>
      <button class="btn btn-prim btn-grande" type="submit">${ic('cadeado')}Conectar e entrar</button>
    </form>
    ${HONESTO}
    <p class="peq mudo centro"><button type="button" class="btn-link" data-acao="voltar-senha">Voltar</button></p>`);
  $('#f-entrar').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cfg = { owner: $('#e-owner').value.trim(), repo: $('#e-repo').value.trim(), branch: $('#e-branch').value.trim() || 'main' };
    const token = $('#e-token').value.trim(), guardar = !$('#e-nao-guardar').checked;
    if (!cfg.owner || !cfg.repo) { $('.repo-det').open = true; telaErro('Informe o usuário e o repositório do GitHub.'); return; }
    if (!token) { telaErro('Cole o token de acesso.'); $('#e-token').focus(); return; }
    const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true; btn.textContent = 'Conectando…';
    A.cfg = cfg; A.token = token;
    try {
      const r = await gh(repoPath());
      if (!r.permissions || !r.permissions.push) throw Object.assign(new Error('Este token só pode ler o repositório. Gere outro com “Contents: Read and write”.'), { status: -1 });
      ls.set('admin:cfg', A.cfg); ss.set('admin:token', A.token);
      btn.textContent = 'Protegendo o token…';
      A.cofreDados = A.cofreDados || novoCofre();
      Object.assign(A.cofreDados, guardar ? { token, exp: A.tokenExp, tokenAte: tokenAte(A.tokenExp) } : { token: null, exp: null, tokenAte: null });
      A.cofreDados.fbchave = fbChave();
      if (A.senhaPendente) { await Cofre.criar(A.senhaPendente, A.cofreDados); A.senhaPendente = null; } else await salvarCofre();
      await carregar();
    } catch (err) {
      A.token = null; ss.del('admin:token');
      telaEntrada(err.status === 401 ? 'O GitHub não aceitou este token. Ele pode ter expirado ou sido copiado pela metade.' : err.status === 404 ? 'Não encontrei esse repositório (ou o token não tem acesso a ele). Confira se você criou o token logado na conta dona do guia e se marcou o repositório em “Repository access”.' : err.status === 403 ? msgErro(err) : err.message);
    }
  });
  function telaErro(m) { let a = $('#f-entrar .aviso.erro'); if (!a) { $('#f-entrar').insertAdjacentHTML('afterbegin', `<div class="aviso erro" role="alert">${ic('alerta')}<span></span></div>`); a = $('#f-entrar .aviso.erro'); } a.querySelector('span').textContent = m; }
}
async function carregar() {
  $('#app').innerHTML = `<main class="entrada"><div class="entrada-card carregando"><div class="entrada-logo pequeno">${marca('simbolo', 'claro')}</div><p class="t2">Abrindo o guia…</p></div></main>`;
  let remoto;
  try { await garantirContrato(); remoto = await baixarConteudo(); }
  catch (e) {
    if (e.status === 404) { telaEntrada('Não encontrei os dados do guia no repositório (dados/conteudo.json ou conteudo.js). Envie os arquivos do guia primeiro.'); return; }
    if (e.status === 401) { esquecerToken(); telaEntrada('Seu acesso expirou. Cole um token válido (o passo a passo está abaixo).'); return; }
    telaEntrada(e.status === -1 ? e.message : msgErro(e, 'carregar o guia')); return;
  }
  if (A.cofreDados && A.cofreDados.token && A.tokenExp && A.cofreDados.exp !== A.tokenExp) { A.cofreDados.exp = A.tokenExp; A.cofreDados.tokenAte = tokenAte(A.tokenExp); salvarCofre(); }
  A.remoto = remoto; A.baseSha = remoto.sha; A.baseObj = clone(remoto.obj); A.formato = remoto.formato;
  A.draft = clone(remoto.obj);
  A.correcoes = remoto.fix.slice();
  A.legado = remoto.formato === 'js' ? true : null; if (remoto.formato === 'json') verificarLegado();
  let conflitoInicial = null;
  const r = ls.get('admin:rascunho', null);
  if (r && r.obj && !igual(r.obj, remoto.obj)) {
    let rasc = null; try { const p = preparar_(r.obj); rasc = p.obj; A.correcoes = A.correcoes.concat(p.fix); } catch (e) { rasc = null; }
    if (rasc && confirm(`Você tem alterações não publicadas salvas neste aparelho (${dataBR(new Date(r.em).toISOString()) || 'data desconhecida'}).\n\nContinuar de onde parou?`)) {
      if (r.base === remoto.sha) A.draft = rasc;
      else {
        const m = mesclar(r.baseObj || {}, rasc, remoto.obj);
        if (m.conflitos.length) conflitoInicial = { m, base: r.baseObj || {}, rasc, atual: remoto };
        else { A.draft = m.obj; A.avisoJuncao = 'O site foi atualizado em outro aparelho depois do seu rascunho. Juntei as duas versões: confira o que muda antes de publicar.'; }
      }
    } else if (rasc) ls.del('admin:rascunho');
  }
  montar();
  if (A.correcoes.length) toast(`Corrigi ${A.correcoes.length} valor(es) em formato inválido (datas, links ou fotos). Veja em Visão geral.`, true);
  if (conflitoInicial) mostrarConflitos(conflitoInicial, true);
  if (A.avisoJuncao) toast(A.avisoJuncao);
  if (A.migrarSenha && !DEMO) oferecerSenhaNova();
  if (A.formato === 'js' && !conflitoInicial && !ss.get('admin:formato-ofertado', false)) { ss.set('admin:formato-ofertado', true); ofertarFormato(); }
}
/* ---------------- formato dos dados (migração conteudo.js → dados/conteudo.json) ---------------- */
async function verificarLegado() { // só para mostrar o botão "Apagar conteudo.js antigo" em Configurações
  try { const j = await gh(`${repoPath()}/contents/${ARQ_JS}?ref=${encodeURIComponent(A.cfg.branch)}`); A.legado = { sha: j.sha }; }
  catch (e) { A.legado = null; }
  if (A.view === 'config' && $('#card-formato')) rerender();
}
function ofertarFormato() {
  const d = $('#dialogo'); if (!d || d.open) return;
  d.innerHTML = `<div class="ed-cab"><h2 class="t2" id="dlg-titulo">Atualizar o formato dos dados</h2><button type="button" class="btn btn-sec btn-ic" data-fechar-dialogo aria-label="Fechar">${ic('x')}</button></div>
    <div class="ed-corpo form"><p style="margin:0">Seu guia guarda o conteúdo no arquivo antigo <code>conteudo.js</code>. O formato novo separa os dados do código (<code>dados/conteudo.json</code>): atualizar o site e editar o conteúdo deixam de interferir um no outro.</p>
    <p class="mudo" style="margin:0">Toque em <b>Atualizar formato</b> depois de subir o código novo do site. O painel cria <code>dados/conteudo.json</code> com o conteúdo publicado hoje, por commit. O <code>conteudo.js</code> não é apagado: você decide depois, em Configurações. Até lá, tudo continua funcionando como está.</p>
    <div class="acoes"><button type="button" class="btn btn-prim" data-acao="atualizar-formato">${ic('atualizar')}Atualizar formato</button><button type="button" class="btn btn-sec" data-fechar-dialogo>Agora não</button></div></div>`;
  d.setAttribute('aria-labelledby', 'dlg-titulo'); d.showModal();
}
async function atualizarFormato() {
  const btn = $('[data-acao="atualizar-formato"]'); if (btn) { btn.disabled = true; btn.textContent = 'Atualizando…'; }
  try {
    if (!DEMO) { // o site publicado precisa já saber ler o JSON; senão ele continuaria no conteudo.js antigo
      const ix = await gh(`${repoPath()}/contents/index.html?ref=${encodeURIComponent(A.cfg.branch)}`);
      if (!/assets\/dados\.js/.test(b64.de(ix.content || ''))) throw new Error('o código do site no GitHub ainda é o antigo. Suba primeiro a atualização do código (pacote “atualização de código”) e tente de novo');
    }
    const atual = await baixarConteudo();
    if (atual.formato === 'json') { A.formato = 'json'; toast('O formato já estava atualizado (outro aparelho fez isso).'); }
    else {
      const r = await gh(`${repoPath()}/contents/${ARQ_JSON}`, { method: 'PUT', body: { message: 'Atualiza formato: cria dados/conteudo.json (conteudo.js mantido)', content: b64.para(escreverConteudo(atual.obj, 'json')), branch: A.cfg.branch } });
      A.formato = 'json'; A.legado = { sha: atual.sha };
      if (A.baseSha === atual.sha) A.baseSha = r.content.sha; // mesmo conteúdo, arquivo novo
      A.remoto = { sha: r.content.sha, obj: clone(atual.obj), formato: 'json' };
      if (A.baseSha !== r.content.sha) A.baseSha = null; // o rascunho partiu de outra versão: a próxima publicação junta
      salvarRascunho();
      toast('Formato atualizado: dados/conteudo.json criado. O conteudo.js antigo continua no repositório até você apagar em Configurações.');
    }
    const d = $('#dialogo'); if (d.open) d.close(); atualizarBarra(); rerender();
  } catch (e) { toast('Não atualizei o formato: ' + (e.status != null && e.status !== -1 ? msgErro(e) : e.message), true); if (btn) { btn.disabled = false; btn.textContent = 'Tentar de novo'; } }
}
async function apagarLegado() {
  if (!A.legado || A.formato !== 'json') return;
  if (!confirm('Apagar o arquivo antigo conteudo.js do repositório?\n\nO site e o painel já usam dados/conteudo.json. O conteudo.js serve só de reserva enquanto o código novo não estava no ar.')) return;
  try { await gh(`${repoPath()}/contents/${ARQ_JS}`, { method: 'DELETE', body: { message: 'Remove conteudo.js antigo (dados em dados/conteudo.json)', sha: A.legado.sha, branch: A.cfg.branch } }); A.legado = null; toast('conteudo.js apagado.'); rerender(); }
  catch (e) { toast(msgErro(e, 'apagar o conteudo.js'), true); }
}
/* ---------------- demonstração ---------------- */
function faixaDemo() {
  if (!DEMO) return;
  let f = $('#faixa-demo');
  if (!f) { document.body.classList.add('demo'); document.body.insertAdjacentHTML('afterbegin', `<div class="faixa-demo" id="faixa-demo" role="status"><span class="fd-ponto" aria-hidden="true"></span><b>Modo demonstração<span class="fd-longo"> · nada é publicado</span></b><span class="fd-conta" id="fd-conta"></span><a href="./" class="fd-sair" aria-label="Sair da demonstração">Sair<span class="fd-longo">&nbsp;da demonstração</span></a></div>`); f = $('#faixa-demo'); }
  const n = GHD.log.filter(x => x.arquivo !== 'index.html').length, c = $('#fd-conta'); if (c) c.textContent = n ? `${n} ${n === 1 ? 'publicação simulada' : 'publicações simuladas'}` : ''; // o bloco compartilhar do index acompanha a publicação: não conta à parte
}
async function iniciarDemo() {
  faixaDemo();
  A.cfg = { owner: 'demonstracao', repo: 'casa-18-anahi', branch: 'main' }; A.token = 'demonstracao';
  A.cofreDados = Object.assign(novoCofre(), { privados: { wifi_rede: 'Casa18-Anahi', wifi_senha: 'exemplo-de-senha', wifi_tipo: 'WPA', portao: '0000 (exemplo)', chaves: 'na caixinha ao lado da porta (exemplo)' } });
  $('#app').innerHTML = `<main class="entrada"><div class="entrada-card carregando"><div class="entrada-logo pequeno">${marca('simbolo', 'claro')}</div><p class="t2">Preparando a demonstração…</p></div></main>`;
  let bruto = null, formato = 'json';
  try {
    await garantirContrato();
    try { const r = await fetch('../' + ARQ_JSON, { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); bruto = await r.json(); }
    catch (e) { if (!window.CONTEUDO) await carregarScript('../' + ARQ_JS); bruto = window.CONTEUDO; formato = 'js'; }
    if (!bruto || typeof bruto !== 'object') throw new Error('os dados do guia não vieram');
  }
  catch (e) { $('#app').innerHTML = moldura(`<span class="olho">Modo demonstração</span><h1 class="t1 entrada-tit">Não deu para abrir</h1><p class="entrada-lead">${esc(e.message)}. Recarregue a página ou volte à <a href="./">entrada</a>.</p>`); return; }
  GHD.arquivos[arqDe(formato)] = b64.para(formato === 'js' ? 'window.CONTEUDO = ' + JSON.stringify(bruto, null, 2) + ';\n' : JSON.stringify(bruto, null, 2) + '\n'); GHD.shas[arqDe(formato)] = 'demo0';
  GHD.arquivos['index.html'] = b64.para('<!doctype html><html><head>\n<!-- compartilhar:inicio -->\n<title>Casa 18 Anahi</title>\n<!-- compartilhar:fim -->\n<script src="assets/dados.js"></script></head><body></body></html>\n'); GHD.shas['index.html'] = 'demo0';
  await carregar();
  toast('Bem-vindo à demonstração: mexa à vontade, nada é publicado.');
}
function bloquear() {
  if (sujo()) salvarRascunho();
  ['admin:token', 'admin:token-exp', 'admin:fbchave', 'admin:cofre-chave'].forEach(k => ss.del(k));
  A.token = null; A.tokenExp = null; A.cofreDados = null; A.remoto = A.draft = A.baseObj = null; A.fb.itens = null; A.fotos = null; A.cacheFotos = {}; A.estadia = { nome: '', chegada: '', saida: '', fone: '' };
  if (DEMO) { location.href = './'; return; }
  telaSenha(); toast('Painel bloqueado. Para voltar, digite a senha do anfitrião.');
}
function sair(silencioso) {
  if (!silencioso && !confirm((sujo() ? 'Há alterações não publicadas. Se sair, elas serão apagadas deste aparelho.\n\n' : '') + 'Sair e apagar os dados deste aparelho? Token, chave do feedback, dados privados da casa (Wi-Fi, portão) e modelos de mensagem serão apagados e precisarão ser informados de novo.')) return;
  ['admin:token', 'admin:token-exp', 'admin:token-lembrado', 'admin:fbchave', 'admin:fb-local', 'admin:fb-resolvidos', 'admin:rascunho', 'guia:rascunho', 'admin:cofre', 'admin:cofre-chave'].forEach(apagar);
  A.token = null; A.tokenExp = null; A.cofreDados = null; A.remoto = A.draft = A.baseObj = null; A.fb.itens = null; A.fotos = null; A.cacheFotos = {}; A.estadia = { nome: '', chegada: '', saida: '', fone: '' };
  if (DEMO) { location.href = './'; return; }
  if (!silencioso) { telaSenha(); toast('Você saiu. Token, chave do feedback, dados privados, rascunho e comentários importados foram apagados deste aparelho.'); }
}

/* ---------------- estrutura ---------------- */
const NAV = [
  ['visao', 'Visão geral', 'painel'], ['feedback', 'Feedback', 'feedback'],
  ['grupo', 'Hospedagem'], ['hospede', 'Receber hóspede', 'mala'], ['privados', 'Dados privados', 'cadeado'], ['impressos', 'Impressos', 'impressora'], ['virada', 'Virada da casa', 'lista'],
  ['grupo', 'Conteúdo do guia'], ['casa', 'A casa', 'casa'], ['chegada', 'Chegada e saída', 'chave'], ['lugares', 'Lugares', 'pino'], ['roteiros', 'Roteiros', 'bussola'],
  ['contatos', 'Contatos', 'fone'], ['beneficios', 'Benefícios', 'presente'], ['avaliacoes', 'Avaliações', 'estrela'], ['regiao', 'Região e sabores', 'ondas'],
  ['grupo', 'Sistema'], ['fotos', 'Fotos', 'imagem'], ['qr', 'QR Code do guia', 'qr'], ['config', 'Configurações', 'ajustes'], ['avancado', 'Avançado', 'codigo']
];
const SECOES = NAV.filter(n => n[0] !== 'grupo');
const numSecao = (v) => { const i = SECOES.findIndex(n => n[0] === v); return i < 0 ? '' : String(i + 1).padStart(2, '0'); };
function validadeToken() {
  if (!A.tokenExp) return '';
  const d = new Date(A.tokenExp), dias = Math.ceil((d - Date.now()) / 864e5);
  return `Token válido até ${esc(d.toLocaleDateString('pt-BR', { timeZone: 'America/Maceio' }))}${dias <= 7 ? ` (${dias <= 0 ? 'vence hoje' : 'faltam ' + dias + ' dia(s)'})` : ''}`;
}
function montar() {
  const url = urlPublica();
  $('#app').innerHTML = `<div class="app">
    <nav class="lado" aria-label="Seções do painel">
      <a class="marca" href="${esc(url)}" target="_blank" rel="noopener" aria-label="Abrir o site publicado (nova aba)"><span class="marca-logo">${marca('horizontal', 'escuro')}</span><span class="marca-sub">Painel do anfitrião</span></a>
      <button type="button" class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="menu-secoes"><svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg><span class="menu-rot">Seções</span><span class="menu-atual" id="menu-atual"></span><span class="cont" data-cont="menu" hidden></span></button>
      <div class="menu-lista" id="menu-secoes">
      ${NAV.map(n => n[0] === 'grupo' ? `<div class="nav-grupo" role="presentation">${esc(n[1])}</div>` : `<button type="button" class="nav-item" data-ir="${n[0]}">${ic(n[2])}<span>${n[1]}</span><span class="cont" data-cont="${n[0]}" hidden></span></button>`).join('')}
      <div class="lado-rodape"><span class="repo-nome">${DEMO ? 'Demonstração' : `${esc(A.cfg.owner)}/${esc(A.cfg.repo)}`}</span>${A.tokenExp ? `<span class="peq">${validadeToken()}</span>` : ''}<div class="rodape-acoes"><button type="button" data-acao="bloquear" title="Fecha o painel neste aparelho; a senha abre de novo">${ic('cadeado')}Bloquear</button><button type="button" data-acao="sair" title="Apaga deste aparelho o token e os dados privados">${ic('sair')}Sair</button></div></div>
      </div>
    </nav>
    <div class="palco">
      <div class="barra" role="region" aria-label="Publicação">${ARMAZ_BLOQUEADO ? `<span class="tag aviso" title="O rascunho não fica salvo se fechar a aba">Armazenamento bloqueado</span>` : ''}<span class="estado" id="estado" aria-live="polite"></span>
        <button type="button" class="btn btn-sec" data-acao="previa">${ic('olho')}<span class="rot-btn">Pré-visualizar</span></button>
        <a class="btn btn-sec so-largo" href="${esc(url)}" target="_blank" rel="noopener">Ver site</a>
        <button type="button" class="btn btn-prim" data-acao="publicar" id="btn-publicar">${ic('enviar')}Publicar</button></div>
      <main class="conteudo" id="vista" tabindex="-1"></main>
    </div></div>`;
  ir(location.hash.replace('#', '') || 'visao', true);
  atualizarBarra();
}
function atualizarBarra() {
  const e = $('#estado'); if (!e || !A.draft) return;
  const m = resumoMudancas();
  e.innerHTML = m.length ? `<span class="ponto pendente"></span>${m.length === 1 ? 'Alterações em 1 seção, ainda não publicadas' : `Alterações em ${m.length} seções, ainda não publicadas`}` : `<span class="ponto"></span>Tudo publicado`;
  $('#btn-publicar').disabled = !m.length;
  const pend = verificar().filter(i => i.e !== 'ok').length;
  const c = $('[data-cont="visao"]'); if (c) { c.hidden = !pend; c.textContent = pend; c.setAttribute('aria-label', pend + ' pendência(s)'); }
  const cm = $('[data-cont="menu"]'); if (cm) { const falta = antesDoHospede().filter(i => !i.ok).length; cm.hidden = !falta; cm.textContent = falta; cm.setAttribute('aria-label', falta + ' item(ns) obrigatório(s) faltando'); }
  const nfb = A.fb.itens ? A.fb.itens.filter(i => i.a.sentimento === 'negativo' && !resolvidos().has(i.id)).length : 0;
  const f = $('[data-cont="feedback"]'); if (f) { f.hidden = !nfb; f.textContent = nfb; f.setAttribute('aria-label', nfb + ' feedback(s) negativo(s) sem resolução'); }
}
function ir(v, inicial) {
  if (!VISTAS[v]) v = 'visao';
  A.view = v; if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
  $$('.nav-item').forEach(b => { if (b.dataset.ir === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  const at = $('#menu-atual'); if (at) { const n = NAV.find(x => x[0] === v); at.textContent = n ? n[1] : ''; }
  menu(false);
  const el = $('#vista'); el.innerHTML = VISTAS[v](); if (!inicial) el.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  if (VISTAS[v].depois) VISTAS[v].depois();
  marcarErrosCampos();
}
/* A04: no celular as seções ficam num menu ("Seções") com aria-expanded, Esc fecha e o foco volta ao botão. */
const menuCelular = () => { const b = $('#menu-btn'); return !!(b && b.offsetParent !== null); };
function menu(abrir, focar) {
  const b = $('#menu-btn'), l = $('#menu-secoes'); if (!b || !l) return;
  const aberto = b.getAttribute('aria-expanded') === 'true'; if (abrir === aberto) return;
  b.setAttribute('aria-expanded', abrir ? 'true' : 'false'); l.classList.toggle('aberto', !!abrir); document.body.classList.toggle('menu-aberto', !!abrir);
  if (abrir && menuCelular()) { const a = l.querySelector('.nav-item[aria-current="page"]') || l.querySelector('.nav-item'); if (a) a.focus(); }
  else if (!abrir && focar) b.focus();
}
const rerender = () => { if (!A.draft || !$('#vista')) return; const y = window.scrollY; $('#vista').innerHTML = VISTAS[A.view](); if (VISTAS[A.view].depois) VISTAS[A.view].depois(); marcarErrosCampos(); window.scrollTo(0, y); };

/* ---------------- campos ---------------- */
/* Link de exportação do calendário (iCal): é secreto e nunca entra no conteúdo (vai só no Apps Script, ICAL_URL). */
const ehIcal = (u) => /\/calendar\/ical\b|\.ics(?:[?#]|$)|^webcal:/i.test(String(u || '').trim());
const ehAirbnb = (u) => { try { return /(^|\.)airbnb\.com(\.br)?$/i.test(new URL(String(u).trim()).hostname); } catch (e) { return false; } };
const VALIDA = {
  https: (v) => !tem(v) || urlValida(v, true) ? '' : 'Use um endereço completo começando com https://',
  reserva: (v) => !tem(v) ? '' : ehIcal(v) ? 'Este é o link secreto do calendário (iCal). Ele não vai aqui: cole-o só no Apps Script, em ICAL_URL (passo a passo abaixo).' : urlValida(v, true) ? '' : 'Use o endereço completo do anúncio, começando com https://',
  insta: (v) => !tem(v) || /^[A-Za-z0-9._]{1,30}$/.test(v) ? '' : 'Só o nome do perfil, sem @ e sem link (ex.: casa18.anahi)',
  whats: (v) => !tem(v) || (normalizarWhats(v) && !/[^\d\s()+.-]/.test(v)) ? '' : 'Não entendi este número. Digite com DDD, por exemplo: (82) 99999-0000',
  num: (v) => v == null || v === '' || isFinite(Number(String(v).replace(',', '.'))) ? '' : 'Digite um número'
};
function marcarErro(el) {
  const regra = el.dataset.v; if (!regra || !VALIDA[regra]) return;
  const msg = VALIDA[regra](el.value), box = el.closest('.campo'); if (!box) return;
  box.classList.toggle('erro', !!msg); el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  let s = box.querySelector('.erro-msg');
  if (msg) { if (!s) { s = document.createElement('span'); s.className = 'erro-msg'; s.id = el.id + '-erro'; box.appendChild(s); el.setAttribute('aria-describedby', s.id); } s.textContent = msg; }
  else if (s) { s.remove(); el.removeAttribute('aria-describedby'); }
}
/* A03: mostra como o número foi entendido (mensagem de confirmação, não de erro). */
function confirmarWhats(el) {
  const box = el.closest('.campo'); if (!box) return;
  let s = box.querySelector('.ok-msg'); if (s) s.remove();
  const bruto = el.value, n = tem(bruto) && !/[^\d\s()+.-]/.test(bruto) ? normalizarWhats(bruto) : null;
  if (!n) { marcarErro(el); return; }
  if (n !== bruto.trim()) { el.value = n; definir(A.draft, el.dataset.k, n); mudou(); }
  marcarErro(el);
  s = document.createElement('span'); s.className = 'ok-msg'; s.setAttribute('role', 'status');
  s.textContent = `Entendi: ${whatsBonito(n)}. Salvo como ${n}, o formato que o WhatsApp usa.`;
  box.appendChild(s);
}
const marcarErrosCampos = (raiz) => $$('[data-v]', raiz).forEach(el => { if (tem(el.value)) marcarErro(el); });
function campo(p, rot, tipo, extra) {
  extra = extra || {};
  const v = caminho(A.draft, p); const id = 'c-' + p.replace(/\./g, '-');
  const ajuda = extra.ajuda ? `<span class="ajuda">${extra.ajuda}</span>` : '';
  const cls = `campo ${extra.largo ? 'largo' : ''}`;
  const val = extra.v ? ` data-v="${extra.v}"` : (tipo === 'url' ? ' data-v="https"' : '');
  if (tipo === 'check') return `<label class="check ${extra.largo ? 'largo' : ''}"><input type="checkbox" data-k="${p}" data-t="check" ${v ? 'checked' : ''}>${esc(rot)}</label>`;
  if (tipo === 'area') return `<div class="${cls}"><label for="${id}">${esc(rot)}</label><textarea id="${id}" data-k="${p}" data-t="texto" rows="${extra.linhas || 4}">${esc(v || '')}</textarea>${ajuda}</div>`;
  if (tipo === 'lista') return `<div class="${cls}"><label for="${id}">${esc(rot)}</label><textarea class="lista" id="${id}" data-k="${p}" data-t="lista">${esc(Array.isArray(v) ? v.join('\n') : '')}</textarea><span class="ajuda">Um item por linha.${extra.ajuda ? ' ' + extra.ajuda : ''}</span></div>`;
  if (tipo === 'sel') return `<div class="${cls}"><label for="${id}">${esc(rot)}</label><select id="${id}" data-k="${p}" data-t="${extra.num ? 'num' : 'texto'}">${extra.opcoes.map(o => { const [vl, r] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(vl)}" ${String(v == null ? '' : v) === String(vl) ? 'selected' : ''}>${esc(r)}</option>`; }).join('')}</select>${ajuda}</div>`;
  if (tipo === 'foto') return campoFoto(p, rot, extra);
  const t = tipo === 'num' ? 'text' : tipo === 'data' ? 'date' : tipo === 'url' ? 'url' : 'text';
  const modo = tipo === 'num' ? ' inputmode="decimal"' : tipo === 'url' ? ' inputmode="url" autocapitalize="off"' : extra.tel ? ' inputmode="tel" autocomplete="off"' : '';
  return `<div class="${cls}"><label for="${id}">${esc(rot)}</label><input type="${t}" id="${id}" data-k="${p}" data-t="${tipo === 'num' ? 'num' : 'texto'}"${tipo === 'num' ? ' data-v="num"' : val}${modo} value="${esc(v == null ? '' : v)}" ${extra.ph ? `placeholder="${esc(extra.ph)}"` : ''} spellcheck="${tipo === 'url' || tipo === 'num' ? 'false' : 'true'}">${ajuda}</div>`;
}
function srcAdmin(src) {
  if (!src || !srcValido(src)) return '';
  if (/^https:/.test(src)) return src;
  return A.cacheFotos[src] || ('../' + src.replace(/^\.?\//, ''));
}
function rawUrl(src) { return `https://raw.githubusercontent.com/${encodeURIComponent(A.cfg.owner)}/${encodeURIComponent(A.cfg.repo)}/${encodeURIComponent(A.cfg.branch)}/${src.replace(/^\.?\//, '').split('/').map(encodeURIComponent).join('/')}`; }
const imgTag = (src, alt) => `<img src="${esc(srcAdmin(src))}" alt="${esc(alt || '')}" loading="lazy" data-raw="${esc(srcValido(src) && !/^https:/.test(src) ? rawUrl(src) : '')}">`;
function campoFoto(p, rot, extra) {
  const v = caminho(A.draft, p) || null, tem_ = !!(v && v.src);
  return `<div class="campo ${extra.largo ? 'largo' : ''}"><span class="rot">${esc(rot)}</span>
    <div class="foto-campo up-card${tem_ ? '' : ' up-vazio'}" data-soltar-foto="${p}">
      <button type="button" class="foto up-mini" data-escolher-foto="${p}" aria-label="${tem_ ? 'Trocar a foto' : 'Escolher uma foto'}">${tem_ ? imgTag(v.src, v.alt) : `<span class="foto-vazia">${ic('upload')}<b>Escolher ou soltar foto</b></span>`}</button>
      <div class="foto-info up-info">${tem_ ? `<span class="up-nome" title="${esc(v.src)}">${esc(nomeArquivo(v.src))}</span><div class="campo"><label for="alt-${p}">Descrição da foto (para quem usa leitor de tela)</label><input type="text" id="alt-${p}" data-k="${p}.alt" data-t="texto" value="${esc(v.alt || '')}" placeholder="Ex.: varanda com rede e vista para o coqueiral"></div><div class="acoes up-acoes"><button type="button" class="btn btn-sec btn-peq" data-escolher-foto="${p}">${ic('imagem')}Trocar</button><button type="button" class="btn btn-perigo btn-peq" data-limpar-foto="${p}">${ic('lixo')}Tirar foto</button></div>` : `<span class="ajuda">Sem foto, o site mostra uma ilustração da cena. Toque no quadro ou arraste uma imagem para cá.</span>`}</div>
    </div></div>`;
}
const nomeArquivo = (src) => String(src || '').split('/').pop().replace(/\?.*$/, '') || 'foto';
/* Repetidor genérico para listas de objetos dentro de um formulário. */
function repet(p, rot, esquema, novo, titulo, vazio) {
  const arr = caminho(A.draft, p) || [];
  return `<div class="campo largo"><span class="rot">${esc(rot)}</span><div class="repet">${arr.length ? arr.map((x, i) => `
    <div class="repet-item"><div class="repet-cab"><b>${esc(titulo ? titulo(x, i) : '#' + (i + 1))}</b>
      <button type="button" class="btn btn-sec btn-ic" data-mover="${p}" data-i="${i}" data-d="-1" aria-label="Mover para cima" ${i ? '' : 'disabled'}>${ic('cima')}</button>
      <button type="button" class="btn btn-sec btn-ic" data-mover="${p}" data-i="${i}" data-d="1" aria-label="Mover para baixo" ${i < arr.length - 1 ? '' : 'disabled'}>${ic('baixo')}</button>
      <button type="button" class="btn btn-perigo btn-ic" data-remover="${p}" data-i="${i}" aria-label="Remover ${esc(titulo ? titulo(x, i) : 'item ' + (i + 1))}">${ic('lixo')}</button></div>
      <div class="campos">${esquema(p + '.' + i)}</div></div>`).join('') : `<div class="vazio peq">${esc(vazio || 'Nenhum item ainda.')}</div>`}
    <button type="button" class="btn btn-sec" data-adicionar="${p}" data-novo="${esc(JSON.stringify(novo))}" style="justify-self:start">${ic('mais')}Adicionar</button></div></div>`;
}
function galeria(p, rot) {
  const arr = caminho(A.draft, p) || [];
  return `<div class="campo largo"><span class="rot">${esc(rot)}</span><div class="galeria-campo"><div class="up-grade">${arr.map((f, i) => `<div class="g up-card">
      <button type="button" class="foto up-mini" data-escolher-foto="${p}.${i}" aria-label="Trocar foto ${i + 1}">${imgTag(f && f.src, f && f.alt)}${i === 0 ? '<span class="up-capa">Capa</span>' : ''}</button>
      <div class="up-info"><span class="up-nome" title="${esc((f && f.src) || '')}">${i + 1}. ${esc(nomeArquivo(f && f.src))}</span>
      <label class="up-rot" for="g-alt-${p}-${i}">Descrição</label><input type="text" id="g-alt-${p}-${i}" data-k="${p}.${i}.alt" data-t="texto" value="${esc((f && f.alt) || '')}" placeholder="O que aparece na foto" aria-label="Descrição da foto ${i + 1}">
      <div class="up-acoes g-acoes">${i ? `<button type="button" class="btn btn-sec btn-peq" data-capa="${p}" data-i="${i}" aria-label="Usar a foto ${i + 1} como capa">Usar como capa</button><button type="button" class="btn btn-fant btn-peq mover-foto" data-mover="${p}" data-i="${i}" data-d="-1" aria-label="Mover a foto ${i + 1} uma posição para a esquerda">← mover</button>` : '<span class="peq mudo">Primeira foto da página inicial</span>'}<button type="button" class="x btn btn-perigo btn-peq btn-ic" data-remover="${p}" data-i="${i}" aria-label="Remover foto ${i + 1}">${ic('lixo')}</button></div></div></div>`).join('')}
    <button type="button" class="add-foto up-soltar" data-escolher-foto="${p}.${arr.length}" data-soltar-foto="${p}.${arr.length}" aria-label="Adicionar fotos">${ic('upload')}<b>Adicionar fotos</b><span>Toque para escolher ou arraste para cá</span></button></div></div><span class="ajuda">${arr.length ? 'A primeira foto é a capa da página inicial. Descreva cada foto para quem usa leitor de tela.' : 'Nenhuma foto ainda. Toque em “Adicionar fotos” para enviar do celular ou do computador. Dá para escolher várias de uma vez.'}</span></div>`;
}

/* ---------------- VISTAS ---------------- */
const VISTAS = {};
const cab = (olho, titulo, texto, acoes) => `<div class="cab"><div><span class="olho"><span class="num">${numSecao(A.view)}</span>${olho}</span><h1 class="t1">${titulo}</h1>${texto ? `<p>${texto}</p>` : ''}</div>${acoes ? `<div class="acoes">${acoes}</div>` : ''}</div>`;

VISTAS.visao = () => {
  const it = verificar(), ok = it.filter(i => i.e === 'ok').length, pct = Math.round(ok / it.length * 100);
  const grupos = [...new Set(it.map(i => i.grupo))];
  const L = A.draft.lugares || [];
  const fbRes = A.fb.itens ? Sentimento.consolidar(filtrarFb(A.fb.itens, '30')) : null;
  const dias = A.tokenExp ? Math.ceil((new Date(A.tokenExp) - Date.now()) / 864e5) : null;
  const ordem = { erro: 0, falta: 1, ok: 2 };
  return `${cab('Visão geral', 'Bom te ver por aqui.', 'O que falta no guia e como os hóspedes estão avaliando a estadia.')}
  ${avisoArmaz()}
  ${dias != null && dias <= 7 ? `<div class="aviso erro" role="alert" style="margin-bottom:14px">${ic('alerta')}<span>${validadeToken()}. Gere um token novo no GitHub antes de vencer e entre de novo.</span></div>` : ''}
  ${A.correcoes.length ? `<div class="aviso" style="margin-bottom:14px">${ic('alerta')}<span><b>Corrigi ${A.correcoes.length} valor(es) em formato inválido</b> (por segurança, ficaram vazios): ${esc(A.correcoes.slice(0, 4).map(c => c.replace(/^([^:]+)/, (m) => ondeFica(m).nome)).join('; '))}${A.correcoes.length > 4 ? '…' : ''}. Publique para corrigir também no site.</span></div>` : ''}
  ${cartaoAntes()}
  ${cartaoHospedagem()}
  <div class="card passos-card" style="margin-top:14px"><h2 class="t2">Como atualizar o guia</h2><ol class="passos">
    <li><span><b>Edite</b> uma seção do menu, como “A casa”.</span></li><li><span><b>Envie fotos</b> tocando nos quadrados de foto.</span></li><li><span><b>Pré-visualize</b> para ver como o hóspede vai ver.</span></li><li><span><b>Publique</b>: o site atualiza em até alguns minutos.</span></li><li><span><b>Acompanhe</b> o que os hóspedes dizem em Feedback.</span></li></ol></div>
  <div class="grade g4" style="margin-top:14px">
    <div class="card kpi"><span class="rot">Guia completo</span><span class="val">${pct}%</span><span class="sub">${ok} de ${it.length} itens</span><div class="barra-prog" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Guia completo"><span style="width:${pct}%"></span></div></div>
    <div class="card kpi"><span class="rot">Lugares publicados</span><span class="val">${L.filter(l => l.status !== 'rascunho').length}</span><span class="sub">${L.filter(l => l.status === 'rascunho').length} em rascunho</span></div>
    <div class="card kpi"><span class="rot">Nota média · 30 dias</span><span class="val">${fbRes && fbRes.media ? fbRes.media.toFixed(1).replace('.', ',') : '—'}</span><span class="sub">${fbRes ? fbRes.n + ' feedback(s)' : '<button type="button" class="btn btn-fant" data-ir="feedback" style="padding:0;min-height:0">Ver feedback</button>'}</span></div>
    <div class="card kpi"><span class="rot">Precisam de atenção</span><span class="val">${fbRes ? fbRes.cont.negativo : '—'}</span><span class="sub">feedbacks negativos · 30 dias</span></div>
  </div>
  <div class="grade g2" style="margin-top:14px">${grupos.map(g => `<div class="card"><h2 class="t2" style="margin-bottom:6px">${esc(g)}</h2>${it.filter(i => i.grupo === g).sort((a, b) => ordem[a.e] - ordem[b.e]).map(i => `<div class="pend ${i.e}">${ic(i.e === 'ok' ? 'check' : 'alerta')}<span>${esc(i.txt)}</span>${i.e !== 'ok' && i.ir ? `<button type="button" class="btn btn-fant" data-ir="${esc(i.ir)}">Resolver</button>` : ''}</div>`).join('')}</div>`).join('')}</div>`;
};
function cartaoHospedagem() {
  const p = privados(), v = virada(), cv = contaVirada(v), nPriv = ['wifi_rede', 'wifi_senha', 'portao', 'chaves'].filter(k => tem(p[k])).length;
  const t = (ir, icone, tit, sub) => `<button type="button" class="atalho-h" data-ir="${ir}">${ic(icone)}<span><b>${tit}</b><small>${sub}</small></span></button>`;
  return `<section class="hosp-atalhos" aria-label="Hospedagem">
    ${t('hospede', 'mala', 'Receber hóspede', 'Link com o nome e 4 mensagens prontas')}
    ${t('privados', 'cadeado', 'Dados privados', nPriv ? `${nPriv} de 4 preenchidos, só neste aparelho` : 'Wi-Fi e portão, só neste aparelho')}
    ${t('impressos', 'impressora', 'Impressos A6', 'QR do guia, Wi-Fi e regras da casa')}
    ${t('virada', 'lista', 'Virada da casa', cv.ok ? `${cv.ok} de ${cv.tot} itens marcados` : `${cv.tot} itens para preparar a casa`)}
  </section>`;
}
VISTAS.visao.depois = () => { if (!A.fb.itens && !A.fb.carregando) carregarFeedback(true); };

/* --- A casa --- */
const ICONES = [['praia', 'Praia'], ['wifi', 'Internet'], ['ar', 'Ar-condicionado'], ['cozinha', 'Cozinha'], ['cama', 'Cama'], ['toalha', 'Toalhas'], ['carro', 'Estacionamento'], ['piscina', 'Piscina'], ['tv', 'TV'], ['maquina', 'Máquina de lavar'], ['churrasqueira', 'Churrasqueira'], ['chuveiro', 'Chuveiro'], ['varanda', 'Varanda'], ['rede', 'Rede'], ['outro', 'Outro']];
const ICONES_TRAJETO = [['aviao', 'Avião'], ['estrada', 'Estrada'], ['pino', 'Local'], ['carro', 'Carro'], ['onibus', 'Ônibus']];
VISTAS.casa = () => `${cab('Conteúdo', 'A casa', 'Apresentação, fotos, comodidades e combinados da casa.')}
  ${cartaoReservas()}
  <div class="card form"><h2 class="t2">Apresentação</h2><div class="campos">
    ${campo('casa.nome', 'Nome da casa', 'texto', { ph: 'Casa 18 Anahi', ajuda: 'Nomes como “Casa 18 Anahi” viram duas linhas no topo do site.' })}${campo('casa.subtitulo', 'Descrição curta', 'texto', { ph: 'Casa de praia no Marceneiro' })}
    ${campo('casa.frase', 'Frase de boas-vindas (aparece em letra cursiva)', 'texto', { largo: true, ph: 'Aqui, o tempo desacelera e a vida acontece.', ajuda: 'Curta, uma linha. Use com parcimônia.' })}
    ${campo('casa.sobre', 'Sobre a casa', 'area', { largo: true, linhas: 4, ajuda: 'Dois ou três parágrafos curtos sobre a casa e o jeito de receber.' })}
  </div></div>
  <div class="card form"><h2 class="t2">Contato e links</h2><div class="campos">
    ${campo('casa.anfitriao', 'Nome do anfitrião', 'texto')}${campo('casa.whatsapp', 'WhatsApp do anfitrião', 'texto', { v: 'whats', ph: '(82) 99999-0000', tel: true, ajuda: 'Digite com DDD, do jeito que preferir. O painel acerta o formato sozinho.' })}
    ${campo('casa.instagram', 'Instagram da casa', 'texto', { v: 'insta', ph: 'casa18.anahi', ajuda: 'Só o nome do perfil, sem @.' })}
    ${campo('casa.video_url', 'Vídeo da casa (YouTube, Instagram…)', 'url', { largo: true, ph: 'https://', ajuda: 'Opcional. Mostra “Assista ao vídeo da casa” no topo.' })}
  </div></div>
  <div class="card form"><h2 class="t2">Horários e localização</h2><div class="campos">
    ${campo('casa.checkin', 'Check-in', 'texto', { ph: 'a partir das 14h' })}${campo('casa.checkout', 'Check-out', 'texto', { ph: 'até as 11h' })}
    ${campo('casa.endereco_publico', 'Endereço exibido', 'texto', { largo: true, ajuda: 'Evite o número da casa se não quiser expô-lo publicamente.' })}
    ${campo('casa.link_maps', 'Link do Google Maps até a portaria', 'url', { largo: true, ph: 'https://maps.app.goo.gl/…' })}
    ${campo('casa.coordenadas.lat', 'Latitude da casa', 'num', { ph: '-9.24…' })}${campo('casa.coordenadas.lng', 'Longitude da casa', 'num', { ph: '-35.48…', ajuda: 'No Google Maps, toque e segure no local para copiar.' })}
  </div></div>
  <div class="card form"><h2 class="t2">Fotos</h2>${galeria('casa.fotos', 'Galeria da casa')}</div>
  <div class="card form"><h2 class="t2">Números</h2><div class="campos">${campo('casa.hospedes', 'Hóspedes', 'num')}${campo('casa.quartos', 'Quartos', 'num')}${campo('casa.suites', 'Suítes', 'num')}${campo('casa.banheiros', 'Banheiros', 'num')}${campo('casa.area_m2', 'Área (m²)', 'num')}${campo('casa.camas', 'Camas', 'lista', { largo: true, ajuda: 'Ex.: Quarto 1 · cama de casal' })}</div></div>
  <div class="card form"><h2 class="t2">Ambientes</h2>${repet('casa.ambientes', 'Ambientes', (q) => campo(q + '.nome', 'Nome', 'texto') + campo(q + '.descricao', 'Descrição', 'texto') + campoFoto(q + '.foto', 'Foto', { largo: true }), { nome: '', descricao: '', foto: null }, (x) => x.nome || 'Novo ambiente', 'Nenhum ambiente ainda. Ex.: sala integrada, varanda, suíte.')}</div>
  <div class="card form"><h2 class="t2">Comodidades</h2><p class="mudo" style="margin:-6px 0 0">Liste só o que a casa realmente oferece. As marcadas com ★ aparecem na faixa de destaques da página inicial (escolha até 4).</p>${repet('casa.comodidades', 'Comodidades', (q) => campo(q + '.icone', 'Ícone', 'sel', { opcoes: ICONES }) + campo(q + '.nome', 'Nome', 'texto') + campo(q + '.descricao', 'Descrição curta', 'texto', { largo: true }) + campo(q + '.destaque', '★ Mostrar na faixa de destaques da página inicial', 'check', { largo: true }), { icone: 'outro', nome: '', descricao: '', destaque: false }, (x) => (x.destaque ? '★ ' : '') + (x.nome || 'Nova comodidade'), 'Nenhuma comodidade ainda.')}</div>
  <div class="card form"><h2 class="t2">Combinados</h2><div class="campos">${campo('casa.regras_casa', 'Regras da casa', 'lista')}${campo('casa.regras_condominio', 'Regras do condomínio', 'lista')}${campo('casa.lixo_limpeza', 'Lixo, limpeza e conservação', 'lista')}${campo('casa.seguranca', 'Segurança', 'lista')}</div></div>
  <div class="card form"><h2 class="t2">Dúvidas frequentes</h2>${repet('casa.faq', 'Perguntas', (q) => campo(q + '.pergunta', 'Pergunta', 'texto', { largo: true }) + campo(q + '.resposta', 'Resposta', 'area', { largo: true, linhas: 3 }), { pergunta: '', resposta: '' }, (x) => x.pergunta || 'Nova pergunta', 'Nenhuma pergunta ainda.')}</div>`;

VISTAS.chegada = () => `${cab('Conteúdo', 'Chegada e saída', 'O passo a passo para chegar, entrar e sair. Nunca escreva senhas ou códigos aqui: o site é público.')}
  <div class="aviso" style="margin-bottom:14px">${ic('cadeado')}<span>Senha do Wi-Fi, código do portão ou do cofre: envie por WhatsApp ao hóspede confirmado. O painel avisa antes de publicar se encontrar algo assim.</span></div>
  <div class="card form"><h2 class="t2">Como chegar</h2><p class="mudo" style="margin:-6px 0 0">Cada trajeto vira um passo com ícone na página “Chegada e saída”. Ex.: do aeroporto, pela rodovia, a entrada do condomínio.</p>${repet('casa.chegada.trajetos', 'Trajetos', (q) => campo(q + '.icone', 'Ícone', 'sel', { opcoes: ICONES_TRAJETO }) + campo(q + '.titulo', 'Título', 'texto', { ph: 'Aeroporto de Maceió (MCZ)' }) + campo(q + '.texto', 'Texto', 'area', { largo: true, linhas: 2 }), { icone: 'pino', titulo: '', texto: '' }, (x, i) => (i + 1) + '. ' + (x.titulo || 'Novo trajeto'), 'Nenhum trajeto ainda.')}</div>
  <div class="card form"><h2 class="t2">Na chegada</h2><div class="campos">
    ${campo('casa.chegada.como_chegar', 'Como chegar ao condomínio', 'area', { largo: true })}${campo('casa.chegada.entrada', 'Na portaria', 'area')}${campo('casa.chegada.chaves', 'Chaves e acesso', 'area', { ajuda: 'Explique onde pegar a chave, sem códigos.' })}
    ${campo('casa.chegada.estacionamento', 'Estacionamento', 'area')}${campo('casa.chegada.imprevistos', 'Atrasos e imprevistos', 'area')}</div></div>
  <div class="card form"><h2 class="t2">Na saída</h2><div class="campos">${campo('casa.chegada.saida', 'Checklist de saída', 'lista', { largo: true })}</div></div>`;

/* Avisos do editor de lugar (A01): anotações internas no texto e falta de contato. */
function avisosLugar(i) {
  const l = A.draft.lugares && A.draft.lugares[i]; if (!l) return '';
  const p = problemasLugar(l, i), pub = l.status !== 'rascunho';
  if (!p.notas.length && !(pub && p.semContato)) return '';
  const lin = (n) => `<li><span>“${esc(n.trecho)}”</span> <span class="mudo">(${esc(NOMES_CAMPO[n.chave] || n.chave)})</span> <button type="button" class="btn btn-sec btn-peq" data-mover-nota="${esc(n.campo)}" data-frase="${esc(n.frase)}">Mover para a nota interna</button></li>`;
  return `<div class="aviso ${pub && (p.fortes.length || p.semContato) ? 'erro' : ''}" ${pub ? 'role="alert"' : ''} style="margin-bottom:12px">${ic('alerta')}<div>
    ${p.notas.length ? `<b>${pub ? 'Este lugar está marcado como publicado e o texto tem anotações internas.' : 'Antes de publicar: o texto tem anotações internas.'}</b> ${pub ? 'O hóspede leria isso. ' : ''}${p.fortes.length ? 'A publicação fica bloqueada até você tirar estes trechos.' : 'Confira se são mesmo para o hóspede.'}<ul class="achados">${p.notas.map(lin).join('')}</ul>` : ''}
    ${pub && p.semContato ? `<p style="margin:${p.notas.length ? '8px' : '0'} 0 0"><b>Para publicar um lugar para comer, preencha o horário, o telefone, o WhatsApp ou um link</b> (em “Detalhes práticos”). Sem isso o hóspede não sabe se está aberto.</p>` : ''}
  </div></div>`;
}

/* --- coleções --- */
const CATS = [['praia', 'Praia'], ['passeio', 'Passeio'], ['natureza', 'Natureza'], ['cultura', 'Cultura'], ['compras', 'Compras'], ['restaurante', 'Restaurante'], ['cafe', 'Café'], ['mercado', 'Mercado'], ['delivery', 'Entrega'], ['farmacia', 'Farmácia'], ['saude', 'Saúde'], ['servico', 'Serviço']];
const TIPOS = ['', 'Frutos do mar', 'Cozinha alagoana', 'Almoço', 'Jantar especial', 'Café e padaria', 'Para levar', 'Mercado', 'Entrega', 'Experiência privada'];
const AREAS = ['', 'Passo de Camaragibe', 'São Miguel dos Milagres', 'Porto de Pedras', 'Japaratinga', 'Maragogi', 'Outra'];
const TAGS = [['natureza', 'Natureza'], ['familia', 'Família'], ['casal', 'Casal'], ['aventura', 'Aventura'], ['cultura', 'Cultura'], ['gastronomia', 'Gastronomia']];
const CENAS = [['praia', 'Praia'], ['piscina', 'Piscinas naturais'], ['jangada', 'Jangada'], ['peixeboi', 'Peixe-boi'], ['capela', 'Capela'], ['farol', 'Farol'], ['vila', 'Vila'], ['comida', 'Comida'], ['tunel', 'Túnel verde'], ['barra', 'Rio e mar'], ['casa', 'Casa']];
const ilustra = (tipo, l) => { try { return window.Ilustra ? (l ? Ilustra.arte(Ilustra.cenaDoLugar(l), { momento: 'dia' }) : Ilustra.arte(tipo || 'praia', { momento: 'dia' })) : ''; } catch (e) { return ''; } };

const COLECOES = {
  lugares: {
    titulo: 'Lugares', olho: 'Guia da região', desc: 'Praias, passeios, restaurantes e serviços. Só aparecem no site os itens marcados como publicados.',
    vazio: 'Nenhum lugar ainda. Toque em “Adicionar” para incluir uma praia, um passeio ou um restaurante.',
    novo: () => ({ id: '', nome: 'Novo lugar', categoria: 'praia', area: 'Passo de Camaragibe', tags: [], resumo: '', descricao: '', dica: '', bom_saber: [], depende_mare: false, reserva: false, foto: null, endereco: '', lat: null, lng: null, precisao: 'exata', distancia: '', duracao: '', preco: '', horario: '', melhor_periodo: '', telefone: '', whatsapp: '', link: '', link_cardapio: '', parceiro: false, patrocinado: false, status: 'rascunho', fonte: { titulo: '', url: '' }, verificado: null, nota_interna: '' }),
    linha: (x) => ({ t: x.nome, meta: [(CATS.find(c => c[0] === x.categoria) || [, x.categoria])[1], x.area, dataCurta(x.verificado) ? 'conferido em ' + String(x.verificado).split('-').reverse().join('/') : null].filter(Boolean), tags: [x.status === 'rascunho' ? ['rasc', 'Rascunho'] : ['ok', 'Publicado'], (A.draft.destaques || []).includes(x.id) ? ['mar', 'Destaque'] : null, x.parceiro ? ['', 'Parceiro'] : null, !(x.lat != null) ? ['', 'Sem mapa'] : null].filter(Boolean), mini: x.foto && x.foto.src && srcValido(x.foto.src) ? imgTag(x.foto.src) : ilustra(null, x) }),
    form: (q, x) => `
      <div class="nota-interna">${campo(q + '.nota_interna', 'Nota interna — nunca aparece no site', 'area', { largo: true, linhas: 3, ajuda: 'Para lembretes seus: o que falta conferir, de onde veio a informação. O hóspede não vê. Ela fica guardada no arquivo do guia, então nunca escreva senhas aqui.' })}</div>
      <div id="ed-avisos" aria-live="polite">${avisosLugar(+q.split('.')[1])}</div>
      <fieldset><legend>Publicação</legend><div class="campos">${campo(q + '.status', 'Status', 'sel', { opcoes: [['publicado', 'Publicado no site'], ['rascunho', 'Rascunho (oculto)']] })}
        <label class="check" style="align-self:end;padding-bottom:10px"><input type="checkbox" data-destaque="${esc(x.id)}" ${(A.draft.destaques || []).includes(x.id) ? 'checked' : ''}>Destaque na página inicial</label>
        <div class="campo largo"><span class="rot">Conferência</span><div class="acoes"><span class="tag ${dataCurta(x.verificado) ? 'ok' : 'rasc'}">${dataCurta(x.verificado) ? 'Conferido em ' + dataCurta(x.verificado) : 'Ainda não conferido'}</span><button type="button" class="btn btn-sec" data-conferir="${q}">${ic('check')}Conferi hoje</button></div><span class="ajuda">Toque só depois de confirmar horário, contato e preço (por telefone, no local ou no site oficial).</span></div></div></fieldset>
      <fieldset><legend>Sobre</legend><div class="campos">${campo(q + '.nome', 'Nome', 'texto')}${campo(q + '.categoria', 'Categoria', 'sel', { opcoes: CATS })}
        ${campo(q + '.area', 'Cidade', 'sel', { opcoes: AREAS })}${campo(q + '.tipo', 'Tipo (gastronomia)', 'sel', { opcoes: TIPOS })}
        ${campo(q + '.resumo', 'Resumo (1 linha)', 'texto', { largo: true, ajuda: 'Aparece no card. Até ~90 caracteres.' })}
        ${campo(q + '.descricao', 'Descrição', 'area', { largo: true })}${campo(q + '.dica', 'Dica do anfitrião', 'area', { largo: true, linhas: 2 })}
        ${campo(q + '.bom_saber', 'Bom saber', 'lista', { largo: true })}
        <div class="campo largo"><span class="rot">Ideal para</span><div class="checks">${TAGS.map(([t, r]) => `<label class="check"><input type="checkbox" data-tag="${q}" value="${t}" ${(Array.isArray(x.tags) ? x.tags : []).includes(t) ? 'checked' : ''}>${r}</label>`).join('')}</div></div>
        ${campo(q + '.depende_mare', 'Depende da maré baixa', 'check')}${campo(q + '.reserva', 'Precisa reservar antes', 'check')}</div></fieldset>
      <fieldset><legend>Foto</legend>${campoFoto(q + '.foto', 'Foto do lugar', { largo: true })}</fieldset>
      <fieldset><legend>Localização</legend><div class="campos">${campo(q + '.endereco', 'Endereço', 'texto', { largo: true })}${campo(q + '.lat', 'Latitude', 'num')}${campo(q + '.lng', 'Longitude', 'num')}
        ${campo(q + '.precisao', 'Precisão', 'sel', { opcoes: [['exata', 'Exata'], ['aproximada', 'Aproximada (mostra pontilhado)']] })}${campo(q + '.distancia', 'Distância da casa', 'texto', { ph: 'Ex.: 15 min de carro' })}</div></fieldset>
      <fieldset><legend>Detalhes práticos</legend><div class="campos">${campo(q + '.horario', 'Horário', 'texto')}${campo(q + '.preco', 'Faixa de preço', 'texto', { ph: '$$ ou R$ 80 por pessoa' })}${campo(q + '.duracao', 'Duração', 'texto')}${campo(q + '.melhor_periodo', 'Melhor momento', 'texto')}
        ${campo(q + '.telefone', 'Telefone', 'texto')}${campo(q + '.whatsapp', 'WhatsApp', 'texto', { v: 'whats', ph: '(82) 99999-0000', tel: true })}${campo(q + '.link', 'Site ou reserva', 'url', { ph: 'https://' })}${campo(q + '.link_cardapio', 'Cardápio', 'url', { ph: 'https://' })}
        ${campo(q + '.parceiro', 'Parceiro oficial', 'check')}${campo(q + '.patrocinado', 'Recomendação paga (mostra aviso)', 'check')}</div></fieldset>
      <fieldset><legend>Fonte da informação</legend><div class="campos">${campo(q + '.fonte.titulo', 'Título da fonte', 'texto')}${campo(q + '.fonte.url', 'Link da fonte', 'url', { ph: 'https://' })}</div></fieldset>`
  },
  roteiros: {
    titulo: 'Roteiros', olho: 'Guia da região', desc: 'Sequências de paradas que aparecem como “Dias prontos para viver”.',
    vazio: 'Nenhum roteiro ainda. Um roteiro junta lugares do guia num dia: manhã, almoço, fim de tarde.',
    novo: () => ({ id: '', titulo: 'Novo roteiro', subtitulo: '', quando: '', ideal: '', ilustracao: 'praia', status: 'rascunho', paradas: [] }),
    linha: (x) => ({ t: x.titulo, meta: [x.quando, (Array.isArray(x.paradas) ? x.paradas.length : 0) + ' paradas'].filter(Boolean), tags: [x.status === 'rascunho' ? ['rasc', 'Rascunho'] : ['ok', 'Publicado']], mini: ilustra(x.ilustracao) }),
    form: (q) => `<div class="campos">${campo(q + '.titulo', 'Título', 'texto')}${campo(q + '.status', 'Status', 'sel', { opcoes: [['publicado', 'Publicado'], ['rascunho', 'Rascunho']] })}
      ${campo(q + '.subtitulo', 'Subtítulo', 'texto', { largo: true })}${campo(q + '.quando', 'Quando', 'texto', { ph: 'Dia de maré baixa pela manhã' })}${campo(q + '.ideal', 'Ideal para', 'texto')}
      ${campo(q + '.ilustracao', 'Ilustração', 'sel', { opcoes: CENAS })}</div>
      ${repet(q + '.paradas', 'Paradas', (r) => campo(r + '.momento', 'Momento', 'texto', { ph: 'Manhã' }) + campo(r + '.titulo', 'Título', 'texto') + campo(r + '.texto', 'Texto', 'area', { largo: true, linhas: 2 }) + campo(r + '.lugar', 'Lugar do guia (opcional)', 'sel', { largo: true, opcoes: [['', '— nenhum —']].concat((A.draft.lugares || []).map(l => [l.id, l.nome + (l.status === 'rascunho' ? ' (rascunho)' : '')])) }), { momento: '', titulo: '', texto: '', lugar: '' }, (x, i) => (i + 1) + '. ' + (x.titulo || 'Nova parada'), 'Nenhuma parada ainda.')}`
  },
  contatos: {
    titulo: 'Contatos', olho: 'Ajuda', desc: 'Organizados por urgência. Contatos de emergência devem ser oficiais.',
    vazio: 'Nenhum contato ainda. Comece pelos essenciais: farmácia, mercado e posto de saúde.',
    novo: () => ({ nome: 'Novo contato', categoria: '', nivel: 'essencial', telefone: '', whatsapp: '', horario: '', obs: '', verificado: null }),
    linha: (x) => ({ t: x.nome, meta: [x.categoria, x.telefone, x.horario].filter(Boolean), tags: [[{ emergencia: 'aviso', essencial: 'mar', conveniencia: '', parceiro: 'ok' }[x.nivel] || '', { emergencia: 'Emergência', essencial: 'Essencial', conveniencia: 'Conveniência', parceiro: 'Parceiro' }[x.nivel] || x.nivel]], mini: '' }),
    form: (q) => `<div class="campos">${campo(q + '.nome', 'Nome', 'texto')}${campo(q + '.categoria', 'Categoria', 'texto', { ph: 'Farmácia' })}${campo(q + '.nivel', 'Nível', 'sel', { opcoes: [['emergencia', 'Emergência'], ['essencial', 'Serviço essencial'], ['conveniencia', 'Conveniência'], ['parceiro', 'Parceiro recomendado']] })}
      ${campo(q + '.horario', 'Horário de atendimento', 'texto')}${campo(q + '.telefone', 'Telefone', 'texto')}${campo(q + '.whatsapp', 'WhatsApp', 'texto', { v: 'whats', ph: '(82) 99999-0000', tel: true })}${campo(q + '.obs', 'Observação', 'texto', { largo: true })}${campo(q + '.verificado', 'Conferido em', 'data')}</div>`
  },
  beneficios: {
    titulo: 'Benefícios', olho: 'Parcerias', desc: 'Só acordos firmados. Benefícios vencidos saem do site automaticamente.',
    vazio: 'Nenhum benefício ainda. Cadastre só acordos já fechados com o parceiro.',
    novo: () => ({ id: 'b' + Date.now().toString(36), parceiro: '', titulo: 'Novo benefício', descricao: '', condicoes: '', restricoes: '', validade: '', codigo: '', whatsapp: '', link: '', ativo: true }),
    linha: (x) => ({ t: x.titulo, meta: [x.parceiro, dataCurta(x.validade) ? 'até ' + dataCurta(x.validade) : 'sem validade'].filter(Boolean), tags: [x.validade && x.validade < hoje() ? ['aviso', 'Vencido'] : x.ativo === false ? ['rasc', 'Inativo'] : ['ok', 'Ativo']], mini: '' }),
    form: (q) => `<div class="campos">${campo(q + '.parceiro', 'Parceiro', 'texto')}${campo(q + '.titulo', 'Título do benefício', 'texto', { ph: '10% no almoço' })}${campo(q + '.descricao', 'Descrição', 'area', { largo: true, linhas: 2 })}
      ${campo(q + '.condicoes', 'Condições', 'texto')}${campo(q + '.restricoes', 'Restrições', 'texto')}${campo(q + '.validade', 'Válido até', 'data')}${campo(q + '.codigo', 'Código promocional (público)', 'texto', { ajuda: 'Aparece no site. Não use para senhas.' })}
      ${campo(q + '.whatsapp', 'WhatsApp do parceiro', 'texto', { v: 'whats', ph: '(82) 99999-0000', tel: true })}${campo(q + '.link', 'Link', 'url', { ph: 'https://' })}${campo(q + '.ativo', 'Ativo', 'check')}</div>`
  },
  avaliacoes: {
    titulo: 'Avaliações', olho: 'Reputação', desc: 'Depoimentos públicos. Publique somente com autorização de quem escreveu.',
    vazio: 'Nenhuma avaliação ainda. Em Feedback, os comentários com autorização podem virar avaliações com um toque.',
    novo: () => ({ texto: '', autor: '', nota: 5, periodo: '', origem: 'Airbnb', autorizada: false }),
    linha: (x) => ({ t: x.autor || 'Sem nome', meta: [notaValida(x.nota) ? notaValida(x.nota) + '★' : null, x.periodo, x.origem, String(x.texto || '').slice(0, 70) + (String(x.texto || '').length > 70 ? '…' : '')].filter(Boolean), tags: [x.autorizada ? ['ok', 'Autorizada'] : ['rasc', 'Oculta']], mini: '' }),
    form: (q) => `<div class="campos">${campo(q + '.texto', 'Depoimento', 'area', { largo: true })}${campo(q + '.autor', 'Autor (primeiro nome)', 'texto')}${campo(q + '.nota', 'Nota', 'sel', { num: true, opcoes: [['', '—'], [5, '5'], [4, '4'], [3, '3'], [2, '2'], [1, '1']] })}
      ${campo(q + '.periodo', 'Período da estadia', 'texto', { ph: 'Janeiro de 2027' })}${campo(q + '.origem', 'Origem', 'texto', { ph: 'Airbnb, Booking, direto' })}${campo(q + '.autorizada', 'Tenho autorização para publicar', 'check', { largo: true })}</div>`
  }
};
function vistaColecao(nome) {
  const D = COLECOES[nome]; const arr = Array.isArray(A.draft[nome]) ? A.draft[nome] : (A.draft[nome] = []);
  const q = A.busca.toLowerCase();
  const vis = arr.map((x, i) => [x, i]).filter(([x]) => x && (!q || JSON.stringify(x).toLowerCase().includes(q)));
  return `${cab(D.olho, D.titulo, D.desc, `<button type="button" class="btn btn-prim" data-novo-item="${nome}">${ic('mais')}Adicionar</button>`)}
    ${arr.length > 6 ? `<div class="busca-itens"><div class="campo"><label for="filtro-itens" class="sr-only">Filtrar ${esc(D.titulo.toLowerCase())}</label><input type="search" id="filtro-itens" placeholder="Filtrar ${esc(D.titulo.toLowerCase())}…" value="${esc(A.busca)}"></div><span class="mudo peq">${vis.length} de ${arr.length}</span></div>` : ''}
    <div class="itens">${vis.length ? vis.map(([x, i]) => { const l = D.linha(x); return `<div class="item">${l.mini !== '' ? `<span class="mini">${l.mini}</span>` : `<span class="mini mini-ic">${ic(NAV.find(n => n[0] === nome)[2])}</span>`}
      <div style="min-width:0"><b>${esc(l.t)}</b><span class="meta">${l.tags.map(([c, t]) => `<span class="tag ${esc(c)}">${esc(t)}</span>`).join('')}${l.meta.map(esc).join(' · ')}</span></div>
      <div class="acoes"><button type="button" class="btn btn-sec" data-editar="${nome}" data-i="${i}" aria-label="Editar ${esc(l.t)}">Editar</button></div></div>`; }).join('') : `<div class="vazio">${q ? `Nada encontrado para “${esc(A.busca)}”.` : esc(D.vazio)}</div>`}</div>`;
}
['lugares', 'roteiros', 'contatos', 'beneficios', 'avaliacoes'].forEach(n => { VISTAS[n] = () => vistaColecao(n); });

let edicao = null;
function abrirEditor(nome, i) {
  edicao = { nome, i }; const d = $('#editor'); pintarEditor(); if (!d.open) d.showModal();
  const f = d.querySelector('.ed-corpo input, .ed-corpo select, .ed-corpo textarea'); if (f) f.focus();
}
function pintarEditor() {
  const { nome, i } = edicao, D = COLECOES[nome], x = A.draft[nome][i], q = nome + '.' + i;
  const y = $('#editor .ed-corpo') ? $('#editor .ed-corpo').scrollTop : 0;
  $('#editor').innerHTML = `<div class="ed-cab"><h2 class="t2" id="ed-titulo">${esc(D.linha(x).t || D.titulo)}</h2><button type="button" class="btn btn-sec btn-ic" data-fechar-editor aria-label="Fechar">${ic('x')}</button></div>
    <div class="ed-corpo"><p class="mudo peq" style="margin:0 0 12px">As alterações ficam guardadas no rascunho na hora. Para irem ao site, toque em Publicar.</p><div class="form">${D.form(q, x)}</div></div>
    <div class="ed-rod"><div class="acoes"><button type="button" class="btn btn-perigo" data-excluir-item>${ic('lixo')}Excluir</button><button type="button" class="btn btn-sec" data-duplicar-item>${ic('copiar')}Duplicar</button></div><button type="button" class="btn btn-prim" data-fechar-editor>${ic('check')}Concluir</button></div>`;
  $('#editor').setAttribute('aria-labelledby', 'ed-titulo');
  const c = $('#editor .ed-corpo'); if (c) c.scrollTop = y;
  marcarErrosCampos($('#editor'));
}
$('#editor').addEventListener('close', () => {
  if (edicao && edicao.nome === 'lugares') { const x = A.draft.lugares[edicao.i]; if (x && !x.id) { x.id = slugUnico(x.nome); mudou(); } }
  if (edicao && edicao.nome === 'roteiros') { const x = A.draft.roteiros[edicao.i]; if (x && !x.id) { x.id = slug(x.titulo); mudou(); } }
  edicao = null; if (COLECOES[A.view]) rerender();
});
function slugUnico(nome) { const base = slug(nome); let s = base, k = 2; const ids = new Set((A.draft.lugares || []).map(l => l.id)); while (ids.has(s)) s = base + '-' + k++; return s; }

VISTAS.regiao = () => `${cab('Conteúdo', 'Região e sabores', 'Orientações gerais que aparecem em “Maré e tempo”, “Ajuda” e “Onde comer”.')}
  <div class="card form"><div class="campos">${campo('regiao.quando_ir', 'Quando ir', 'lista', { largo: true })}${campo('regiao.mares', 'Como ler a maré', 'lista', { largo: true })}${campo('regiao.mobilidade', 'Como se locomover', 'lista', { largo: true })}${campo('regiao.dicas', 'Bom saber antes de sair', 'lista', { largo: true })}${campo('regiao.dias_de_chuva', 'Se chover', 'lista', { largo: true })}</div></div>
  <div class="card form"><h2 class="t2">O que provar</h2>${repet('provar', 'Pratos e sabores', (q) => campo(q + '.nome', 'Nome', 'texto') + campo(q + '.descricao', 'Descrição', 'texto'), { nome: '', descricao: '' }, (x) => x.nome || 'Novo', 'Nenhum prato ainda.')}</div>`;

/* --- fotos --- */
VISTAS.fotos = () => `${cab('Mídia', 'Fotos', 'Envie aqui as fotos da casa e dos lugares. Antes do envio, o painel reduz e converte cada imagem para abrir rápido no celular do hóspede.')}
  <label class="solta" id="solta" for="upload-fotos">${ic('upload')}<div class="t3" style="margin:6px 0 2px">Toque para escolher fotos ou arraste para cá</div><span class="mudo peq">JPG, PNG ou WebP · reduzidas para até 1800 px</span></label>
  <input type="file" id="upload-fotos" accept="image/*" multiple class="sr-only" tabindex="-1">
  <div id="fila" style="margin-top:12px" aria-live="polite"></div>
  <div class="card" style="margin-top:14px"><div class="cab" style="margin-bottom:12px"><h2 class="t2">Fotos enviadas</h2><button type="button" class="btn btn-sec" data-acao="recarregar-fotos">${ic('atualizar')}Atualizar</button></div><p class="mudo peq" style="margin:-6px 0 12px">Fotos “em uso” aparecem no rascunho ou no site publicado e não podem ser apagadas.</p><div id="lista-fotos">${listaFotos()}</div></div>`;
VISTAS.fotos.depois = () => { if (!A.fotos) carregarFotos(); ligarSolta(); };
function usosDeFotos() {
  const s = new Set();
  const andar = (x) => { if (Array.isArray(x)) x.forEach(andar); else if (x && typeof x === 'object') Object.keys(x).forEach(k => { if (k === 'src' && typeof x[k] === 'string') s.add(x[k].replace(/^\.\//, '')); else andar(x[k]); }); };
  [A.draft, A.remoto && A.remoto.obj, A.baseObj].forEach(andar);
  return s;
}
function listaFotos(escolher) {
  if (!A.fotos) return '<p class="mudo">Carregando fotos…</p>';
  if (A.fotos.erro) return `<div class="aviso erro">${ic('alerta')}<span>${esc(A.fotos.erro)}</span></div>`;
  if (!A.fotos.length) return `<div class="vazio">Nenhuma foto enviada ainda.${escolher ? '' : ' Use o quadro acima para enviar a primeira.'}</div>`;
  const usos = usosDeFotos();
  return `<div class="fotos up-grade">${A.fotos.map(f => { const uso = usos.has(f.path); return `<div class="foto-cel up-card"><button type="button" class="foto up-mini" ${escolher ? `data-usar-foto="${esc(f.path)}"` : `data-ver-foto="${esc(f.path)}"`} aria-label="${escolher ? 'Usar ' : 'Abrir '}${esc(f.name)}">${imgTag(f.path, '')}</button><div class="up-info"><span class="up-nome" title="${esc(f.name)}">${esc(f.name)}</span>${escolher ? '' : `<div class="up-acoes"><span class="peq mudo">${Math.round((+f.size || 0) / 1024)} KB${uso ? ' · <b class="up-uso">em uso</b>' : ''}</span>${uso ? '' : `<button type="button" class="btn btn-fant btn-peq perigo" data-apagar-foto="${esc(f.path)}" data-sha="${esc(f.sha)}">${ic('lixo')}Apagar</button>`}</div>`}</div></div>`; }).join('')}</div>`;
}
async function carregarFotos() {
  try { const r = await gh(`${repoPath()}/contents/fotos?ref=${encodeURIComponent(A.cfg.branch)}`); A.fotos = (Array.isArray(r) ? r : []).filter(f => f && f.type === 'file' && /^fotos\/[\w\-.]+\.(jpe?g|png|webp|avif|gif)$/i.test(f.path)).sort((a, b) => b.name.localeCompare(a.name)); }
  catch (e) { A.fotos = e.status === 404 ? [] : Object.assign([], { erro: msgErro(e, 'listar as fotos') }); }
  const l = $('#lista-fotos'); if (l) l.innerHTML = listaFotos(); const p = $('#picker-lista'); if (p) p.innerHTML = listaFotos(true);
}
function reduzir(file, max) {
  return new Promise((ok, falha) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h); URL.revokeObjectURL(url);
      cv.toBlob(b => { if (b && b.type === 'image/webp') ok({ blob: b, ext: 'webp', w, h }); else cv.toBlob(j => j ? ok({ blob: j, ext: 'jpg', w, h }) : falha(new Error('não consegui converter a imagem')), 'image/jpeg', 0.84); }, 'image/webp', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); falha(new Error('este formato de imagem não abre neste navegador. Tente JPG ou PNG.')); };
    img.src = url;
  });
}
const blobB64 = (b) => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(b); });
const blobUrl = (b) => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(b); });
async function enviarFotos(files, aoConcluir) {
  const fila = $('#picker-fila') || $('#fila'); const enviados = [];
  for (const f of files) {
    const id = 'up' + Math.random().toString(36).slice(2, 7);
    if (fila) fila.insertAdjacentHTML('beforeend', `<div class="aviso" id="${id}" style="margin-top:6px">${ic('upload')}<span>${esc(f.name)}: preparando…</span></div>`);
    const set = (t, cls) => { const el = document.getElementById(id); if (el) { el.className = 'aviso ' + (cls || ''); el.querySelector('span').textContent = f.name + ': ' + t; } };
    if (!/^image\//.test(f.type)) { set('não é uma imagem, foi ignorado.', 'erro'); continue; }
    try {
      const r = await reduzir(f, 1800);
      const nome = `fotos/${slug(f.name.replace(/\.[^.]+$/, ''))}-${Date.now().toString(36)}.${r.ext}`;
      set(`enviando (${Math.round(r.blob.size / 1024)} KB)…`);
      await gh(`${repoPath()}/contents/${nome}`, { method: 'PUT', body: { message: `Foto: ${nome.slice(6)}`, content: await blobB64(r.blob), branch: A.cfg.branch } });
      A.cacheFotos[nome] = await blobUrl(r.blob);
      set(`enviada (${r.w}×${r.h}, ${Math.round(r.blob.size / 1024)} KB)`, 'ok'); enviados.push(nome);
    } catch (e) { set('não foi enviada: ' + (e.status != null ? msgErro(e) : e.message), 'erro'); }
  }
  A.fotos = null; await carregarFotos();
  if (aoConcluir && enviados.length) aoConcluir(enviados);
}
function ligarSolta(raiz) {
  const s = $(raiz ? '#picker-solta' : '#solta'), inp = $(raiz ? '#picker-upload' : '#upload-fotos'); if (!s || !inp) return;
  const fim = raiz ? (ns) => usarFotos(ns) : null;
  inp.addEventListener('change', () => { enviarFotos([...inp.files], fim); inp.value = ''; });
  ['dragenter', 'dragover'].forEach(ev => s.addEventListener(ev, e => { e.preventDefault(); s.classList.add('ativa'); }));
  ['dragleave', 'drop'].forEach(ev => s.addEventListener(ev, e => { e.preventDefault(); s.classList.remove('ativa'); }));
  s.addEventListener('drop', e => enviarFotos([...e.dataTransfer.files], fim));
}
let alvoFoto = null;
/* Arrastar e soltar direto num quadro de foto (campo único ou "Adicionar fotos" da galeria). */
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, (e) => { const z = e.target.closest && e.target.closest('[data-soltar-foto]'); if (!z) return; e.preventDefault(); z.classList.add('ativa'); }));
['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, (e) => { const z = e.target.closest && e.target.closest('[data-soltar-foto]'); if (z) z.classList.remove('ativa'); }));
document.addEventListener('drop', (e) => {
  const z = e.target.closest && e.target.closest('[data-soltar-foto]'); if (!z) return; e.preventDefault();
  const fs = [...((e.dataTransfer && e.dataTransfer.files) || [])].filter(f => /^image\//.test(f.type)); if (!fs.length) { toast('Solte arquivos de imagem (JPG, PNG ou WebP).', true); return; }
  alvoFoto = z.getAttribute('data-soltar-foto'); const varias = !!alvoGaleria(alvoFoto);
  toast(fs.length > 1 && varias ? `Enviando ${fs.length} fotos…` : 'Enviando a foto…');
  enviarFotos(varias ? fs : fs.slice(0, 1), (ns) => usarFotos(ns));
});
function alvoGaleria(p) { const m = String(p || '').match(/^(.*)\.(\d+)$/); if (!m) return null; const arr = caminho(A.draft, m[1]); return Array.isArray(arr) && +m[2] === arr.length ? m[1] : null; }
function escolherFoto(p) {
  alvoFoto = p; const d = $('#dialogo'), varias = !!alvoGaleria(p);
  d.innerHTML = `<div class="ed-cab"><h2 class="t2" id="dlg-titulo">Escolher foto</h2><button type="button" class="btn btn-sec btn-ic" data-fechar-dialogo aria-label="Fechar">${ic('x')}</button></div>
    <div class="ed-corpo"><label class="solta" id="picker-solta" for="picker-upload">${ic('upload')}<div class="t3" style="margin-top:6px">${varias ? 'Enviar fotos novas' : 'Enviar uma foto nova'}</div><span class="mudo peq">${varias ? 'Do celular ou do computador. Pode escolher várias de uma vez.' : 'Do celular ou do computador'}</span></label><input type="file" id="picker-upload" accept="image/*" class="sr-only" tabindex="-1" ${varias ? 'multiple' : ''}><div id="picker-fila" aria-live="polite"></div>
    <h3 class="t3" style="margin:18px 0 10px">Ou escolha uma já enviada</h3><div id="picker-lista">${listaFotos(true)}</div></div>`;
  d.setAttribute('aria-labelledby', 'dlg-titulo'); d.showModal(); ligarSolta(true); if (!A.fotos) carregarFotos();
}
function usarFotos(paths) {
  const g = alvoGaleria(alvoFoto);
  if (!g || paths.length < 2) { usarFoto(paths[0]); return; }
  const arr = caminho(A.draft, g); paths.filter(srcValido).forEach(pth => arr.push({ src: pth, alt: '' }));
  mudou(); $('#dialogo').close(); toast(`${paths.length} fotos adicionadas. Escreva uma descrição curta para cada uma.`);
  if (edicao) pintarEditor(); else rerender();
}
function usarFoto(path) {
  if (!srcValido(path)) { toast('Endereço de foto inválido.', true); return; }
  const atual = caminho(A.draft, alvoFoto);
  const alt = atual && atual.alt || '';
  definir(A.draft, alvoFoto, { src: path, alt });
  mudou(); $('#dialogo').close(); toast('Foto aplicada. Escreva uma descrição curta para ela.');
  if (edicao) pintarEditor(); else rerender();
}

/* --- QR --- */
function enderecoMudou() {
  const antes = String(((A.remoto && A.remoto.obj.config) || {}).url_publica || '').trim(), agora = String((A.draft.config || {}).url_publica || '').trim();
  return antes !== agora && (!tem(agora) || urlValida(agora, true));
}
VISTAS.qr = () => { const url = urlPublica(); return `${cab('Divulgação', 'Cartão com QR Code', 'Imprima e deixe na entrada, na geladeira ou no quarto. O QR abre o guia publicado.')}
  ${enderecoMudou() ? `<div class="aviso erro" role="alert" style="margin-bottom:14px" id="aviso-reimprimir">${ic('alerta')}<span><b>Você mudou o endereço do site.</b> Os cartões com QR Code que já estão impressos continuam abrindo o endereço antigo. Depois de publicar, imprima cartões novos e troque os antigos na casa. Mantenha o endereço antigo funcionando até lá.</span></div>` : ''}
  <div class="grade g2" style="align-items:start"><div class="cartao-qr"><div class="cartao-logo">${marca('vertical', 'claro')}</div><p class="assinatura">Seja bem-vindo!</p><div class="qr" id="qr"></div><b>Seu guia da casa está aqui.</b><span class="mudo peq">Aponte a câmera do celular. O guia abre na hora, sem instalar nada.</span><span class="peq mudo" style="word-break:break-all">${esc(url)}</span></div>
  <div class="card form"><div class="campos">${campo('config.url_publica', 'Endereço do site', 'url', { largo: true, ph: url, ajuda: 'Deixe vazio para usar o endereço do GitHub Pages. Preencha se tiver domínio próprio (começando com https://). Atenção: mudar o endereço exige reimprimir os cartões.' })}</div>
    <div class="acoes"><button type="button" class="btn btn-prim" data-acao="imprimir-qr">Imprimir cartão</button><button type="button" class="btn btn-sec" data-acao="copiar-url">${ic('copiar')}Copiar link</button></div>
    <p class="peq mudo" style="margin:0">Quer o kit completo, com cartão do Wi-Fi e regras da casa no formato A6? Veja <button type="button" class="btn-link" data-ir="impressos">Impressos</button>.</p></div></div>`; };
VISTAS.qr.depois = () => {
  const alvo = $('#qr'), url = urlPublica(); if (!alvo) return;
  try { if (!window.QR) throw new Error('gerador de QR não carregou'); if (!url) throw new Error('defina o endereço do site'); alvo.innerHTML = QR.svg(url, { cor: '#1F3D2F', fundo: '#FFFFFF', margem: 2, titulo: 'QR Code que abre ' + url }); alvo.dataset.texto = url; }
  catch (e) { alvo.innerHTML = `<span class="mudo peq">Não foi possível gerar o QR: ${esc(e.message)}</span>`; }
};

/* ================= HOSPEDAGEM: receber hóspede, dados privados, impressos, virada ================= */
const H = window.Hospede;
const privados = () => (A.cofreDados && A.cofreDados.privados) || {};
const NOMES_FALTA = { checkin: ['horário de check-in', 'casa.checkin'], checkout: ['horário de check-out', 'casa.checkout'], rota: ['link da rota', 'casa.link_maps'], endereco: ['endereço', 'casa.endereco_publico'], anfitriao: ['seu nome', 'casa.anfitriao'], reserva: ['link da reserva', 'casa.link_reserva'], avisar_chegada: ['seu WhatsApp (botão “Cheguei”)', 'casa.whatsapp'], avisar_saida: ['seu WhatsApp (botão “Saímos”)', 'casa.whatsapp'],
  wifi_rede: ['nome da rede Wi-Fi', 'privados'], wifi_senha: ['senha do Wi-Fi', 'privados'], portao: ['código do portão', 'privados'], chaves: ['chaves e acesso', 'privados'], avaliacao: ['endereço do site', 'qr'] };
const modeloDe = (id) => A.modelosEdit[id] != null ? A.modelosEdit[id] : ((A.cofreDados && A.cofreDados.modelos && typeof A.cofreDados.modelos[id] === 'string') ? A.cofreDados.modelos[id] : H.MODELOS.find(m => m.id === id).texto);
function dadosMensagem() {
  const c = (A.draft && A.draft.casa) || {}, e = A.estadia, v = H.validarEstadia(e), p = privados(), base = urlPublica();
  const ok = v.ok && !!base, link = ok ? H.linkEstadia(base, v.nome, e.chegada, e.saida) : '';
  const wa = normalizarWhats(c.whatsapp) || '', n = H.noites(e.chegada, e.saida), nome = v.ok ? v.nome : '';
  return { ok, v, link, d: {
    nome: nome || '[nome]', link: link || '[link do guia]', chegada: H.dataLonga(e.chegada) || '[data de chegada]', saida: H.dataLonga(e.saida) || '[data de saída]', noites: n ? n + (n === 1 ? ' noite' : ' noites') : '',
    checkin: c.checkin, checkout: c.checkout, casa: c.nome || 'Casa 18 Anahi', anfitriao: c.anfitriao, endereco: c.endereco_publico, rota: c.link_maps,
    avaliacao: base ? base.replace(/#.*$/, '') + '#/feedback' : '', reserva: c.link_reserva,
    avisar_chegada: H.linkAviso(wa, `Oi! ${nome ? nome + ' aqui: c' : 'C'}hegamos à ${c.nome || 'casa'}.`), avisar_saida: H.linkAviso(wa, `Oi! ${nome ? nome + ' aqui: s' : 'S'}aímos da ${c.nome || 'casa'}. Obrigado!`),
    wifi_rede: p.wifi_rede, wifi_senha: p.wifi_tipo === 'nopass' ? '' : p.wifi_senha, portao: p.portao, chaves: p.chaves } };
}
function mensagem(id, M) { M = M || dadosMensagem(); return H.preencher(modeloDe(id), M.d); }
const linkWhats = (txt) => { const f = normalizarWhats(A.estadia.fone); return `https://wa.me/${f && f.length >= 12 ? f : ''}?text=${encodeURIComponent(txt)}`; };
function faltamHtml(faltam) {
  const f = faltam.filter(k => NOMES_FALTA[k]); if (!f.length) return '';
  return `<p class="faltam">${ic('alerta')}<span>Linha omitida por falta de: ${f.map(k => { const [rot, alvo] = NOMES_FALTA[k]; return alvo === 'privados' || alvo === 'qr' ? `<button type="button" class="btn-link" data-ir="${alvo}">${esc(rot)}</button>` : `<button type="button" class="btn-link" data-ir-campo="${alvo}">${esc(rot)}</button>`; }).join(', ')}.</span></p>`;
}
function blocoLink(M) {
  M = M || dadosMensagem(); const e = A.estadia;
  if (!M.ok) return `<span class="olho">Link personalizado</span><p class="link-vazio">${!urlPublica() ? 'Defina o endereço do site em “QR Code do guia” para gerar o link.' : 'Preencha o nome e as datas: o link do guia com o nome do hóspede aparece aqui.'}</p>`;
  return `<span class="olho">Link personalizado</span>
    <p class="estadia-resumo"><b>${esc(M.v.nome)}</b> · ${esc(H.dataLonga(e.chegada, false))} → ${esc(H.dataLonga(e.saida, false))} · <span class="num">${H.noites(e.chegada, e.saida)}</span> ${H.noites(e.chegada, e.saida) === 1 ? 'noite' : 'noites'}</p>
    <p class="link-estadia" id="link-estadia">${esc(M.link)}</p>
    <div class="acoes"><button type="button" class="btn btn-prim" data-copiar="link">${ic('copiar')}Copiar link</button><a class="btn btn-sec" href="${esc(M.link)}" target="_blank" rel="noopener noreferrer">${ic('olho')}Ver como o hóspede vê</a></div>
    <p class="peq mudo" style="margin:10px 0 0">O nome e as datas vão depois do “#”: não saem do celular do hóspede (nem para o servidor, nem para a prévia do WhatsApp). Mande só para o hóspede; evite grupos e redes sociais.</p>`;
}
function cartaoMsg(m, i, M) {
  const r = mensagem(m.id, M), ed = modeloDe(m.id) !== m.texto;
  return `<article class="msg" data-msg="${m.id}" aria-labelledby="msg-t-${m.id}">
    <header><span class="olho"><span class="num">${String(i + 1).padStart(2, '0')}</span>${esc(m.quando)}</span><h3 class="t3" id="msg-t-${m.id}">${esc(m.titulo)}${ed ? ' <span class="tag">modelo seu</span>' : ''}</h3></header>
    <div class="bolha ${M.ok ? '' : 'previa'}" id="msg-${m.id}">${esc(r.texto)}</div>
    <div class="msg-faltam" id="msg-f-${m.id}">${faltamHtml(r.faltam)}</div>
    <div class="acoes"><button type="button" class="btn btn-sec" data-copiar-msg="${m.id}" ${M.ok ? '' : 'disabled'}>${ic('copiar')}Copiar</button><a class="btn btn-whats ${M.ok ? '' : 'inativo'}" data-wa="${m.id}" href="${M.ok ? esc(linkWhats(r.texto)) : '#'}" target="_blank" rel="noopener noreferrer" ${M.ok ? '' : 'aria-disabled="true" tabindex="-1"'}>${ic('enviar')}Abrir no WhatsApp</a></div>
    <details class="modelo" data-modelo-det="${m.id}"><summary>Editar modelo</summary>
      <div class="campo"><label for="mod-${m.id}">Modelo da mensagem “${esc(m.titulo)}”</label><textarea id="mod-${m.id}" data-modelo="${m.id}" rows="9">${esc(modeloDe(m.id))}</textarea>
      <span class="ajuda">Toque num marcador para inserir. Linha com marcador vazio é omitida da mensagem.</span></div>
      <div class="marcadores">${H.MARCADORES.map(([k, rot, priv]) => `<button type="button" class="marcador ${priv ? 'priv' : ''}" data-inserir="${k}" data-alvo="mod-${m.id}" title="${esc(rot)}${priv ? ' (do cofre deste aparelho)' : ''}">{${k}}</button>`).join('')}</div>
      <div class="acoes"><button type="button" class="btn btn-prim" data-salvar-modelo="${m.id}">Salvar modelo</button><button type="button" class="btn btn-sec" data-restaurar-modelo="${m.id}">Restaurar o original</button></div></details>
  </article>`;
}
function errosEstadia() { const e = A.estadia, v = H.validarEstadia(e); return { nome: tem(e.nome) ? v.erros.nome : '', chegada: tem(e.chegada) ? v.erros.chegada : '', saida: tem(e.saida) ? v.erros.saida : '' }; }
const campoEst = (k, id, rot, tipo, extra) => { const er = errosEstadia()[k] || ''; return `<div class="campo ${er ? 'erro' : ''} ${extra && extra.largo ? 'largo' : ''}"><label for="${id}">${rot}</label><input type="${tipo}" id="${id}" data-est="${k}" value="${esc(A.estadia[k])}" autocomplete="off" ${extra && extra.attrs || ''} aria-invalid="${er ? 'true' : 'false'}" aria-describedby="${id}-e"><span class="erro-msg" id="${id}-e" ${er ? '' : 'hidden'}>${esc(er)}</span>${extra && extra.ajuda ? `<span class="ajuda">${extra.ajuda}</span>` : ''}</div>`; };
VISTAS.hospede = () => { const M = dadosMensagem(); return `${cab('Hospedagem', 'Receber <em>hóspede</em>', 'O link do guia com o nome do hóspede e as mensagens de cada momento da estadia, prontas para o WhatsApp.')}
  <div class="grade hosp-grade">
    <section class="card form" aria-labelledby="h-est"><h2 class="t2" id="h-est">A estadia</h2>
      <div class="campos">
        ${campoEst('nome', 'h-nome', 'Primeiro nome do hóspede', 'text', { largo: true, attrs: 'maxlength="40" placeholder="Ex.: Mariana" autocapitalize="words" spellcheck="false"', ajuda: 'Aparece na saudação do guia (“Olá, Mariana”).' })}
        ${campoEst('chegada', 'h-in', 'Chegada', 'date', { attrs: `data-cal="inicio" data-cal-par="#h-out" data-cal-rot="Check-in" data-cal-min="${hoje()}"` })}
        ${campoEst('saida', 'h-out', 'Saída', 'date', { attrs: 'data-cal="fim" data-cal-rot="Checkout"' })}
        ${campoEst('fone', 'h-fone', 'WhatsApp do hóspede <span class="opc">opcional</span>', 'text', { largo: true, attrs: 'inputmode="tel" placeholder="(11) 98888-0000"', ajuda: 'Com o número, “Abrir no WhatsApp” já abre a conversa com ele. Nada desta estadia é salvo: some ao fechar o painel.' })}
      </div></section>
    <section class="card link-card" aria-live="polite" id="h-saida">${blocoLink(M)}</section>
  </div>
  <div class="msgs-cab"><h2 class="t2">Mensagens prontas</h2><p class="mudo">Wi-Fi e portão vêm dos <button type="button" class="btn-link" data-ir="privados">dados privados</button> guardados só neste aparelho e só entram nestas mensagens. Depois da saída do hóspede, apague no WhatsApp a mensagem com o código do portão.</p></div>
  <div class="msgs" id="h-msgs">${H.MODELOS.map((m, i) => cartaoMsg(m, i, M)).join('')}</div>`; };
function atualizarHospede() {
  const M = dadosMensagem(), s = $('#h-saida'); if (s) s.innerHTML = blocoLink(M);
  const er = errosEstadia();
  [['nome', 'h-nome'], ['chegada', 'h-in'], ['saida', 'h-out']].forEach(([k, id]) => { const el = document.getElementById(id); if (!el) return; const box = el.closest('.campo'), m = document.getElementById(id + '-e'); box.classList.toggle('erro', !!er[k]); el.setAttribute('aria-invalid', er[k] ? 'true' : 'false'); m.hidden = !er[k]; m.textContent = er[k] || ''; });
  H.MODELOS.forEach(m => {
    const r = mensagem(m.id, M), b = document.getElementById('msg-' + m.id); if (!b) return;
    b.textContent = r.texto; b.classList.toggle('previa', !M.ok); document.getElementById('msg-f-' + m.id).innerHTML = faltamHtml(r.faltam);
    const c = $(`[data-copiar-msg="${m.id}"]`); c.disabled = !M.ok;
    const w = $(`[data-wa="${m.id}"]`); w.href = M.ok ? linkWhats(r.texto) : '#'; w.classList.toggle('inativo', !M.ok); if (M.ok) { w.removeAttribute('aria-disabled'); w.removeAttribute('tabindex'); } else { w.setAttribute('aria-disabled', 'true'); w.setAttribute('tabindex', '-1'); }
  });
}
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
    try { const t = document.createElement('textarea'); t.value = txt; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;opacity:0;top:0;left:0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); return ok; } catch (x) { return false; }
  }
}

/* --- dados privados (só no cofre do aparelho) --- */
const campoPriv = (k, rot, tipo, extra) => { const v = privados()[k]; extra = extra || {};
  if (tipo === 'senha') return `<div class="campo ${extra.largo ? 'largo' : ''}"><label for="p-${k}">${rot}</label><div class="senha-caixa"><input type="password" id="p-${k}" data-priv="${k}" value="${esc(v || '')}" autocomplete="off" autocapitalize="off" spellcheck="false" data-lpignore="true"><button type="button" class="ver-senha" data-ver-senha="p-${k}" aria-label="Mostrar" aria-pressed="false">${ic('olho')}</button></div>${extra.ajuda ? `<span class="ajuda">${extra.ajuda}</span>` : ''}</div>`;
  if (tipo === 'area') return `<div class="campo largo"><label for="p-${k}">${rot}</label><textarea id="p-${k}" data-priv="${k}" rows="3" autocomplete="off" spellcheck="false">${esc(v || '')}</textarea>${extra.ajuda ? `<span class="ajuda">${extra.ajuda}</span>` : ''}</div>`;
  return `<div class="campo ${extra.largo ? 'largo' : ''}"><label for="p-${k}">${rot}</label><input type="text" id="p-${k}" data-priv="${k}" value="${esc(v || '')}" autocomplete="off" autocapitalize="off" spellcheck="false" data-lpignore="true" ${extra.ph ? `placeholder="${esc(extra.ph)}"` : ''}>${extra.ajuda ? `<span class="ajuda">${extra.ajuda}</span>` : ''}</div>`; };
const estadoCofreTxt = () => DEMO ? 'Na demonstração, estes dados ficam só na memória desta aba.' : ARMAZ_BLOQUEADO ? 'O navegador está bloqueando o armazenamento: estes dados valem só enquanto a aba estiver aberta.' : 'Guardado e cifrado neste aparelho.';
VISTAS.privados = () => { const p = privados(); return `${cab('Hospedagem', 'Dados privados <em>da casa</em>', '')}
  <div class="cofre-aviso" role="note">${ic('cadeado')}<div><b>Ficam só neste aparelho, cifrados com a sua senha.</b> Nunca vão para o site, para o conteudo.js nem para o GitHub. São usados apenas nas mensagens de <button type="button" class="btn-link" data-ir="hospede">Receber hóspede</button> e no <button type="button" class="btn-link" data-ir="impressos">cartão do Wi-Fi</button>. Em outro celular ou computador, cadastre de novo: eles não são sincronizados.</div></div>
  <div class="grade g2" style="align-items:start">
    <section class="card form" aria-labelledby="pv-wifi"><h2 class="t2" id="pv-wifi">Wi-Fi</h2><div class="campos">
      ${campoPriv('wifi_rede', 'Nome da rede (como aparece no celular)', 'texto', { largo: true, ph: 'Ex.: Casa18-Anahi' })}
      ${p.wifi_tipo === 'nopass' ? '' : campoPriv('wifi_senha', 'Senha do Wi-Fi', 'senha', { largo: true })}
      <div class="campo largo"><label for="p-wifi_tipo">Segurança da rede</label><select id="p-wifi_tipo" data-priv="wifi_tipo">${[['WPA', 'WPA, WPA2 ou WPA3 (a mais comum)'], ['WEP', 'WEP (roteador antigo)'], ['nopass', 'Rede aberta, sem senha']].map(([v, r]) => `<option value="${v}" ${(p.wifi_tipo || 'WPA') === v ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <label class="check"><input type="checkbox" data-priv="wifi_oculta" ${p.wifi_oculta ? 'checked' : ''}>Rede oculta (não aparece na lista)</label>
    </div></section>
    <section class="card form" aria-labelledby="pv-acesso"><h2 class="t2" id="pv-acesso">Acesso à casa</h2><div class="campos">
      ${campoPriv('portao', 'Código do portão ou da portaria', 'senha', { largo: true })}
      ${campoPriv('chaves', 'Chaves e acesso', 'area', { ajuda: 'Ex.: “na caixinha ao lado da porta, código 1234”. Entra na mensagem do dia da chegada.' })}
      ${campoPriv('notas', 'Outras anotações privadas', 'area', { ajuda: 'Alarme, disjuntor, vizinho de confiança… Só você vê.' })}
    </div></section>
  </div>
  <p class="estado-cofre" id="priv-estado" aria-live="polite">${ic('check')}<span>${estadoCofreTxt()}</span></p>`; };
let privT = null;
function privMudou(salvarJa) {
  const st = $('#priv-estado span'); if (st) st.textContent = 'Salvando…';
  clearTimeout(privT); privT = setTimeout(async () => { const ok = await salvarCofre(); const s = $('#priv-estado span'); if (s) s.textContent = ok ? `${estadoCofreTxt()} ${DEMO ? '' : 'Salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '.'}` : 'Não consegui salvar no cofre deste aparelho. Bloqueie e entre de novo com a senha.'; }, salvarJa ? 0 : 350);
}

/* --- impressos (A6) --- */
A.imp = { guia: true, wifi: true, regras: true, papel: 'a6', senha: true };
const qrSvg = (txt, titulo) => { try { return window.QR && txt ? QR.svg(txt, { cor: '#1F3D2F', fundo: '#FFFFFF', margem: 2, titulo }) : ''; } catch (e) { return ''; } };
const urlCurta = (u) => String(u || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
function cartaoGuia(tela) {
  const url = urlPublica(); if (!url) return tela ? `<article class="a6 a6-vazio"><p>Defina o endereço do site em <button type="button" class="btn-link" data-ir="qr">QR Code do guia</button>.</p></article>` : '';
  return `<article class="a6 a6-guia" data-cartao="guia"><div class="a6-moldura">
    <div class="a6-logo">${marca('vertical', 'claro')}</div><p class="a6-script">Seja bem-vindo!</p>
    <div class="a6-qr" data-qr-texto="${esc(url)}">${qrSvg(url, 'QR Code que abre o guia da casa')}</div>
    <h3 class="a6-tit">Seu guia <em>da casa</em></h3>
    <p class="a6-txt">Aponte a câmera do celular: maré, praias, onde comer e tudo sobre a casa.</p>
    <p class="a6-url">${esc(urlCurta(url))}</p></div></article>`;
}
function cartaoWifi(tela) {
  const p = privados(), txt = H.wifiTexto({ rede: p.wifi_rede, senha: p.wifi_senha, tipo: p.wifi_tipo, oculta: p.wifi_oculta });
  if (!txt) return tela ? `<article class="a6 a6-vazio" data-cartao="wifi"><p>Cadastre o nome e a senha da rede em <button type="button" class="btn-link" data-ir="privados">Dados privados</button> para gerar o cartão do Wi-Fi.</p></article>` : '';
  const comSenha = A.imp.senha && p.wifi_tipo !== 'nopass' && tem(p.wifi_senha);
  return `<article class="a6 a6-wifi" data-cartao="wifi"><div class="a6-moldura">
    <span class="a6-olho">Wi-Fi</span><h3 class="a6-tit"><em>Conecte-se</em></h3>
    <div class="a6-qr" data-qr-wifi>${qrSvg(txt, 'QR Code que conecta ao Wi-Fi da casa')}</div>
    <p class="a6-txt">Aponte a câmera do celular e toque em “Conectar”.</p>
    <dl class="a6-dados"><div><dt>Rede</dt><dd>${esc(p.wifi_rede)}</dd></div>${comSenha ? `<div><dt>Senha</dt><dd class="a6-senha">${esc(p.wifi_senha)}</dd></div>` : ''}</dl>
    <div class="a6-simbolo">${marca('simbolo', 'claro')}</div></div></article>`;
}
const textoRegra = (r) => typeof r === 'string' ? r : (r && (r.texto || r.titulo || r.nome)) || '';
function cartaoRegras(tela) {
  const c = (A.draft && A.draft.casa) || {}, rs = (Array.isArray(c.regras_casa) ? c.regras_casa : []).map(textoRegra).filter(tem);
  if (!rs.length) return tela ? `<article class="a6 a6-vazio" data-cartao="regras"><p>As regras da casa ainda estão vazias. Escreva em <button type="button" class="btn-link" data-ir-campo="casa.regras_casa">A casa › Regras da casa</button>: elas vão para o site e para este cartão.</p></article>` : '';
  return `<article class="a6 a6-regras ${rs.length > 9 ? 'muitas' : ''}" data-cartao="regras"><div class="a6-moldura">
    <span class="a6-olho">Boa estadia</span><h3 class="a6-tit">Regras <em>da casa</em></h3>
    <ol class="a6-lista">${rs.slice(0, 14).map(r => `<li>${esc(r)}</li>`).join('')}</ol>
    ${tem(c.checkin) || tem(c.checkout) ? `<p class="a6-horas">${tem(c.checkin) ? `<span>Check-in<b>${esc(c.checkin)}</b></span>` : ''}${tem(c.checkout) ? `<span>Check-out<b>${esc(c.checkout)}</b></span>` : ''}</p>` : ''}
    <div class="a6-rodape">${marca('horizontal', 'claro')}</div></div></article>`;
}
const CARTOES = { guia: ['QR do guia', cartaoGuia], wifi: ['Cartão do Wi-Fi', cartaoWifi], regras: ['Regras da casa', cartaoRegras] };
VISTAS.impressos = () => `${cab('Hospedagem', 'Impressos <em>da casa</em>', 'Cartões no formato A6 (10,5 × 14,8 cm) com a marca da casa, para deixar na entrada, na geladeira ou no quarto.')}
  <div class="card form imp-opcoes">
    <div class="imp-linha"><fieldset><legend>Cartões</legend><div class="checks">${Object.keys(CARTOES).map(k => `<label class="check"><input type="checkbox" data-imp="${k}" ${A.imp[k] ? 'checked' : ''}>${CARTOES[k][0]}</label>`).join('')}</div></fieldset>
    <fieldset><legend>Papel</legend><div class="checks"><label class="check"><input type="radio" name="papel" data-imp-papel="a6" ${A.imp.papel === 'a6' ? 'checked' : ''}>A6, um cartão por folha</label><label class="check"><input type="radio" name="papel" data-imp-papel="a4" ${A.imp.papel === 'a4' ? 'checked' : ''}>A4, quatro por folha com guias de corte</label></div></fieldset></div>
    <label class="check"><input type="checkbox" data-imp="senha" ${A.imp.senha ? 'checked' : ''}>Escrever a senha do Wi-Fi no cartão, além do QR (para quem não usa câmera)</label>
    <div class="acoes"><button type="button" class="btn btn-prim" data-acao="imprimir-kit">${ic('impressora')}Imprimir os selecionados</button><span class="peq mudo">Dica: na janela de impressão, escolha “Tamanho real” (100%). Se salvar em PDF, lembre que o arquivo do Wi-Fi contém a senha.</span></div>
  </div>
  <div class="kit-previa" id="kit-previa">${Object.keys(CARTOES).map(k => `<div class="kit-item ${A.imp[k] ? '' : 'desligado'}"><div class="kit-rot"><span class="olho">${esc(CARTOES[k][0])}</span>${CARTOES[k][1](false) ? `<button type="button" class="btn btn-sec btn-peq" data-imprimir-cartao="${k}">${ic('impressora')}Imprimir só este</button>` : ''}</div>${CARTOES[k][1](true)}</div>`).join('')}</div>`;
function limparImpressao() { const r = $('#impressao'); if (r) r.remove(); const s = $('#pagina-impressao'); if (s) s.remove(); document.body.classList.remove('imprimindo'); }
function prepararImpressao(html, pagina, classe, margem) {
  limparImpressao();
  const r = document.createElement('div'); r.id = 'impressao'; r.className = classe; r.innerHTML = html; document.body.appendChild(r);
  const s = document.createElement('style'); s.id = 'pagina-impressao'; s.textContent = `@page{size:${pagina === 'A6' ? '105mm 148mm' : '210mm 297mm'};margin:${margem || 0}}`; document.head.appendChild(s); // tamanho em mm: o Chromium não reconhece a palavra A6
  document.body.classList.add('imprimindo');
}
function imprimirCartoes(ids) {
  const html = ids.map(k => CARTOES[k] ? CARTOES[k][1](false) : '').filter(Boolean);
  if (!html.length) { toast('Nada para imprimir: preencha os dados dos cartões escolhidos.', true); return; }
  if (A.imp.papel === 'a4') { const folhas = []; for (let i = 0; i < html.length; i += 4) folhas.push(`<div class="folha-a4">${html.slice(i, i + 4).join('')}</div>`); prepararImpressao(folhas.join(''), 'A4', 'papel-a4'); }
  else prepararImpressao(html.join(''), 'A6', 'papel-a6');
  window.print();
}
window.addEventListener('afterprint', () => { limparImpressao(); document.body.classList.remove('imprimir-qr'); });

/* --- virada entre hóspedes (checklist salvo no aparelho; não é segredo) --- */
function virada() { const v = ls.get('admin:virada', null) || {}; return { modelo: typeof v.modelo === 'string' && v.modelo.trim() ? v.modelo : H.CHECKLIST_PADRAO, marcados: v.marcados && typeof v.marcados === 'object' && !Array.isArray(v.marcados) ? v.marcados : {}, inicio: Number.isFinite(v.inicio) ? v.inicio : null }; }
const salvarVirada = (v) => ls.set('admin:virada', v);
function contaVirada(v) { const secs = H.lerChecklist(v.modelo); let tot = 0, ok = 0; secs.forEach(s => s.itens.forEach(it => { tot++; if (v.marcados[H.chaveItem(s.titulo, it)]) ok++; })); return { secs, tot, ok }; }
VISTAS.virada = () => { const v = virada(), { secs, tot, ok } = contaVirada(v), pct = tot ? Math.round(ok / tot * 100) : 0;
  return `${cab('Hospedagem', 'Virada <em>entre hóspedes</em>', 'Marque cada item enquanto prepara a casa. Fica salvo neste aparelho. Imprima para quem ajuda na limpeza.', `<button type="button" class="btn btn-sec" data-acao="imprimir-virada">${ic('impressora')}Imprimir</button><button type="button" class="btn btn-sec" data-acao="nova-virada">${ic('atualizar')}Nova virada</button>`)}
  <div class="card virada-topo ${tot && ok === tot ? 'pronto' : ''}"><div class="virada-num"><b id="virada-ok">${ok}</b><span>de ${tot} itens</span></div>
    <div class="virada-prog"><div class="barra-prog" role="progressbar" aria-valuenow="${ok}" aria-valuemin="0" aria-valuemax="${tot}" aria-valuetext="${ok} de ${tot} itens prontos" aria-label="Virada da casa"><span style="width:${pct}%"></span></div>
    <p class="peq mudo">${tot && ok === tot ? 'Casa pronta para o próximo hóspede.' : v.inicio ? 'Começada ' + esc(new Date(v.inicio).toLocaleString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })) + '.' : 'Ainda não começada.'}</p></div></div>
  <div class="virada-lista">${secs.map(s => { const n = s.itens.filter(it => v.marcados[H.chaveItem(s.titulo, it)]).length; return `<fieldset class="virada-sec ${n === s.itens.length ? 'feita' : ''}"><legend>${esc(s.titulo)}<span class="num">${n}/${s.itens.length}</span></legend>${s.itens.map(it => { const k = H.chaveItem(s.titulo, it); return `<label class="virada-item"><input type="checkbox" data-virada="${k}" ${v.marcados[k] ? 'checked' : ''}><span>${esc(it)}</span></label>`; }).join('')}</fieldset>`; }).join('')}</div>
  <details class="card modelo-virada"><summary>Editar o modelo do checklist</summary>
    <div class="campo" style="margin-top:12px"><label for="virada-modelo">Modelo (um item por linha; comece com # para criar uma seção)</label><textarea id="virada-modelo" rows="14" spellcheck="true">${esc(v.modelo)}</textarea></div>
    <div class="acoes"><button type="button" class="btn btn-prim" data-acao="salvar-virada">Salvar modelo</button><button type="button" class="btn btn-sec" data-acao="restaurar-virada">Restaurar o original</button></div></details>`; };
function imprimirVirada() {
  const v = virada(), secs = H.lerChecklist(v.modelo), casa = (A.draft && A.draft.casa && A.draft.casa.nome) || 'Casa 18 Anahi';
  prepararImpressao(`<section class="folha-virada"><header><div class="fv-logo">${marca('horizontal', 'claro')}</div><div><span class="a6-olho">Virada entre hóspedes</span><h1>${esc(casa)}</h1></div></header>
    <p class="fv-linhas"><span>Data: ____/____/______</span><span>Responsável: ______________________</span><span>Próximo hóspede chega: ____/____ às ____h</span></p>
    <div class="fv-secoes">${secs.map(s => `<div class="fv-sec"><h2>${esc(s.titulo)}</h2><ul>${s.itens.map(it => `<li><span class="caixa" aria-hidden="true"></span>${esc(it)}</li>`).join('')}</ul></div>`).join('')}</div>
    <h2 class="fv-obs-tit">Observações e consertos</h2><div class="fv-obs" aria-hidden="true"></div></section>`, 'A4', 'papel-virada', '13mm 14mm');
  window.print();
}

/* --- Reservas e disponibilidade (botão do hero + agenda espelhada do Airbnb) ---
   O painel NUNCA pede nem guarda o link iCal: ele vai só nas Propriedades do script (ICAL_URL). */
function avisoReserva(v) {
  v = String(v == null ? (A.draft.casa || {}).link_reserva || '' : v).trim();
  if (!tem(v)) return 'Sem link, o site não mostra botão de reserva.';
  if (ehIcal(v) || !urlValida(v, true)) return '';
  return ehAirbnb(v) ? 'No site, o botão aparece como “Reservar no Airbnb” e abre o anúncio numa nova aba.' : '<b>Atenção:</b> este link não é do Airbnb (airbnb.com ou airbnb.com.br). O botão aparece só como “Reservar”. Confira se é mesmo o endereço do anúncio.';
}
/* Prévia do botão como ele aparece na capa do site (sem link: o lugar reservado, que só o painel e a pré-visualização mostram). */
function previaReserva(v) {
  v = String(v == null ? (A.draft.casa || {}).link_reserva || '' : v).trim();
  const ok = tem(v) && urlValida(v, true) && !ehIcal(v);
  return `<span class="rot">Prévia na capa do site</span><div class="rp-palco">${ok ? `<a class="rp-btn" href="${esc(v)}" target="_blank" rel="noopener">${ehAirbnb(v) ? 'Reservar no Airbnb' : 'Reservar'} →<span class="sr-only"> (abre em nova aba)</span></a>` : '<span class="rp-falta">Configure o link acima para o botão “Reservar” aparecer no site</span>'}</div>`;
}
function cartaoReservas() {
  const cfg = A.draft.config || {}, ep = tem(cfg.feedback_endpoint);
  return `<section class="card form" id="card-reservas" aria-labelledby="rd-tit"><h2 class="t2" id="rd-tit">Botão de reserva e disponibilidade</h2>
    <p class="mudo" style="margin:0">O botão de reserva aparece na capa do site, no topo e no rodapé. A agenda mostra quais dias estão livres, espelhando o calendário do Airbnb (atualiza sozinha a cada hora).</p>
    <div class="campos">
      ${campo('casa.link_reserva', 'Link da reserva (Airbnb)', 'url', { largo: true, v: 'reserva', ph: 'https://www.airbnb.com.br/rooms/…', ajuda: 'Cole o endereço do anúncio, como aparece no navegador ao abrir a página da casa no Airbnb. Nunca o link do calendário.' })}
      <p class="ajuda largo aviso-reserva" id="reserva-aviso" aria-live="polite">${avisoReserva()}</p>
      <div class="largo reserva-previa" id="reserva-previa" aria-live="polite">${previaReserva()}</div>
      ${campo('config.agenda_visivel', 'Mostrar a agenda de disponibilidade no site', 'check', { largo: true })}
    </div>
    ${!ep ? `<div class="aviso">${ic('alerta')}<span>A agenda usa o mesmo Apps Script do feedback. Primeiro cole o endereço dele em <button type="button" class="btn-link" data-ir="config">Configurações › Feedback</button>. Enquanto isso, mesmo ligada, a agenda não aparece no site.</span></div>` : ''}
    <details class="passo-agenda"${cfg.agenda_visivel ? '' : ' open'}><summary>Como ligar a agenda ao calendário do Airbnb (uma vez só)</summary>
      <ol class="passos">
        <li><span>No <b>Airbnb</b> (de preferência no computador), abra <b>Calendário</b>, escolha o anúncio e toque em <b>Disponibilidade</b>.</span></li>
        <li><span>Em <b>Conectar calendários</b>, toque em <b>Exportar calendário</b> e <b>copie o link</b> (ele termina em <code>.ics</code>).</span></li>
        <li><span>Abra o projeto do <b>Apps Script</b> (o mesmo do feedback). Vá em <b>Configurações do projeto</b> (engrenagem) › <b>Propriedades do script</b> › <b>Adicionar propriedade</b>.</span></li>
        <li><span>Em Propriedade, escreva <code>ICAL_URL</code>. Em Valor, cole o link copiado. Salve.</span></li>
        <li><span><b>Implantar</b> › <b>Gerenciar implantações</b> › lápis (editar) › Versão: <b>Nova versão</b> › <b>Implantar</b>. O endereço que termina em /exec continua o mesmo.</span></li>
        <li><span>Volte aqui, toque em <b>Testar agenda</b>, marque “Mostrar a agenda” e <b>publique</b>.</span></li>
      </ol>
      <div class="aviso aviso-leve">${ic('cadeado')}<span>O link do calendário é <b>secreto</b>: quem tem ele vê suas reservas. Ele fica só no Apps Script. O painel nunca pede nem guarda esse link, e o site recebe apenas os dias ocupados, sem nomes nem códigos.</span></div>
    </details>
    <div class="acoes"><button type="button" class="btn btn-sec" data-acao="testar-agenda">${ic('calendario')}Testar agenda</button></div>
    <div id="agenda-previa" class="agenda-previa" aria-live="polite"></div>
  </section>`;
}
function agendaDemo() {
  const h = new Date(), d = (n) => { const x = new Date(h.getTime() + n * 864e5); return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(x); };
  return { ok: true, ocupado: [[d(3), d(7)], [d(12), d(15)], [d(22), d(29)], [d(38), d(41)]], de: d(0), ate: d(400), atualizado: new Date().toISOString(), parcial: false };
}
const ERROS_AGENDA = {
  'agenda não configurada': 'Falta a propriedade ICAL_URL no Apps Script (passos 3 e 4). Depois, reimplante como nova versão (passo 5).',
  'não foi possível ler o calendário': 'O Apps Script não conseguiu ler o calendário do Airbnb. Confira se o link em ICAL_URL está completo (termina em .ics) e se a exportação continua ativa no Airbnb.',
  'use POST': 'O Apps Script publicado ainda é a versão antiga, sem a agenda. Cole o código novo de integracoes/feedback-apps-script.gs e reimplante como nova versão (passo 5).'
};
async function testarAgenda(b) {
  const box = $('#agenda-previa'); if (!box) return;
  const ep = String((A.draft.config || {}).feedback_endpoint || '').trim();
  const erro = (m) => { box.innerHTML = `<div class="aviso erro" role="alert">${ic('alerta')}<span>${m}</span></div>`; };
  try { if (!window.GuiaAgenda) await carregarScript('../assets/agenda.js'); } catch (x) { erro('O arquivo assets/agenda.js não carregou. Suba o pacote de código novo.'); return; }
  let bruto;
  if (DEMO) bruto = agendaDemo();
  else {
    if (!tem(ep)) { erro('Primeiro cole o endereço do Apps Script em <button type="button" class="btn-link" data-ir="config">Configurações › Feedback</button>.'); return; }
    if (!urlValida(ep, true)) { erro('O endereço do Apps Script precisa começar com https://.'); return; }
    b.disabled = true; box.innerHTML = '<p class="mudo" role="status">Consultando o Apps Script…</p>';
    try {
      const u = new URL(ep); u.searchParams.set('acao', 'agenda');
      const r = await fetch(u.href, { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
      bruto = await r.json().catch(() => { throw new Error('A resposta não veio no formato esperado. Confira se o endereço termina em /exec, se a implantação está como “Qualquer pessoa” e se você reimplantou como nova versão.'); });
      if (bruto && bruto.ok === false) throw new Error(ERROS_AGENDA[bruto.erro] || ('O Apps Script respondeu: ' + esc(String(bruto.erro || 'erro desconhecido'))));
    } catch (x) { erro(x instanceof TypeError ? 'Não conectou: confira a internet e o endereço do Apps Script.' : x.message); return; }
    finally { b.disabled = false; }
  }
  const d = GuiaAgenda.validar(bruto);
  if (!d) { erro('A resposta veio num formato inesperado. Reimplante o Apps Script como nova versão.'); return; }
  const h = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Maceio' });
  const vis = (A.draft.config || {}).agenda_visivel === true;
  box.innerHTML = `<div class="aviso ${DEMO ? '' : 'ok'}" role="status">${ic(DEMO ? 'lampada' : 'check')}<span>${DEMO ? '<b>Demonstração:</b> calendário simulado, com datas fictícias. No painel de verdade, o teste chama o seu Apps Script.' : `<b>Agenda conectada.</b> ${d.ocupado.length} período(s) ocupado(s) nos próximos meses${d.atualizado ? ', lido(s) às ' + h.format(new Date(d.atualizado)) : ''}.${d.parcial ? ' Parte dos calendários não pôde ser lida agora.' : ''}`} ${vis ? 'Assim ela aparece no site.' : 'Marque “Mostrar a agenda” e publique para ela aparecer no site.'}</span></div><div class="agenda-cal-admin" id="agenda-cal-admin"></div>`;
  GuiaAgenda.montar($('#agenda-cal-admin'), d, { id: 'ag-previa' });
}

/* --- configurações --- */
VISTAS.config = () => `${cab('Sistema', 'Configurações', '')}
  <section class="card form" id="card-senha" aria-labelledby="cs-tit"><h2 class="t2" id="cs-tit">Senha do anfitrião</h2>
    <p class="mudo" style="margin:0">A senha protege este aparelho: ela abre o token e os dados privados guardados aqui. Ao trocar, o painel tranca tudo de novo com a senha nova e publica no GitHub só o código embaralhado (hash) em <code>admin/acesso.json</code>. Nos outros aparelhos, a senha nova vale em alguns minutos; lá, a anterior é pedida uma última vez para abrir o que estava guardado.</p>
    ${!DEMO && A.primeiraEntrada ? `<div class="aviso aviso-leve">${ic('lampada')}<span>Quer trocar a senha original por uma frase só sua? O código da senha fica num arquivo público do repositório, então uma frase longa e pessoal protege melhor este aparelho.</span></div>` : ''}
    <div class="campos">
      ${DEMO ? `<p class="peq mudo largo" style="margin:0">Na demonstração a senha atual não é pedida e a troca é simulada: nada é publicado.</p>` : caixaSenha('ts-atual', 'Senha atual', 'current-password').replace('class="campo"', 'class="campo largo"')}
      ${caixaSenha('ts-nova', 'Nova senha', 'new-password', 'minlength="8"')}
      ${caixaSenha('ts-rep', 'Repita a nova senha', 'new-password')}
      <span class="ajuda largo">Pelo menos 8 caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar, como “coqueiro torto na varanda”.</span>
    </div>
    <div id="ts-msg" aria-live="polite"></div>
    <div class="acoes"><button type="button" class="btn btn-prim" data-acao="trocar-senha">${ic('cadeado')}Trocar a senha</button></div>
  </section>
  <div class="card form"><h2 class="t2">Feedback dos hóspedes</h2>
    <p class="mudo" style="margin:0">Para o formulário do site alimentar este painel, publique o script <code>integracoes/feedback-apps-script.gs</code> no Google Apps Script (o passo a passo está no começo do arquivo) e cole o endereço abaixo.</p>
    <div class="campos">${campo('config.feedback_endpoint', 'Endereço do Apps Script (termina em /exec)', 'url', { largo: true, ph: 'https://script.google.com/macros/s/…/exec', ajuda: 'Fica público no site: só permite enviar feedback, não ler.' })}
    <div class="campo largo"><label for="fb-chave">Chave de leitura</label><input type="password" id="fb-chave" value="${esc(fbChave())}" autocomplete="off"><span class="ajuda">É a CHAVE_LEITURA definida no script (24 caracteres ou mais). Fica guardada neste aparelho, cifrada com a sua senha.</span></div></div>
    <div class="acoes"><button type="button" class="btn btn-sec" data-acao="salvar-chave">Salvar chave</button><button type="button" class="btn btn-sec" data-acao="testar-feedback">Testar conexão</button></div></div>
  <div class="card form"><h2 class="t2">Compartilhamento</h2>${campoFoto('config.og_imagem', 'Imagem ao compartilhar o link', { largo: true })}<span class="ajuda">Use uma foto horizontal da casa. Ao publicar, o painel gera dela a imagem <code>compartilhar.jpg</code> (1200 × 630), que aparece quando alguém envia o link pelo WhatsApp ou redes sociais.</span></div>
  <div class="card form" id="card-formato"><h2 class="t2">Formato dos dados</h2>${A.formato === 'js'
    ? `<p class="mudo" style="margin:0">Seu guia ainda usa o arquivo antigo <code>conteudo.js</code>. Tudo funciona, e o painel continua gravando nele. Depois de subir o código novo do site, atualize para <code>dados/conteudo.json</code>: conteúdo e código passam a ser independentes.</p><div class="acoes"><button type="button" class="btn btn-prim" data-acao="atualizar-formato">${ic('atualizar')}Atualizar formato</button></div>`
    : `<p class="mudo" style="margin:0">Os dados ficam em <code>dados/conteudo.json</code> (esquema ${esc(String((A.draft && A.draft.esquema) || ''))}), separados do código do site.${A.legado ? ' O arquivo antigo <code>conteudo.js</code> ainda está no repositório, como reserva.' : ''}</p>${A.legado ? `<div class="acoes"><button type="button" class="btn btn-sec" data-acao="apagar-legado">Apagar o conteudo.js antigo</button></div>` : ''}`}</div>
  <div class="card form"><h2 class="t2">Cópia de segurança</h2><p class="mudo" style="margin:0">Baixe todo o conteúdo como arquivo, ou restaure uma cópia anterior (ela entra no rascunho; nada é publicado sozinho).</p>
    <div class="acoes"><button type="button" class="btn btn-sec" data-acao="baixar-backup">Baixar cópia (.json)</button><label class="btn btn-sec" for="restaurar" tabindex="0">Restaurar cópia</label><input type="file" id="restaurar" accept=".json,application/json" class="sr-only" tabindex="-1"></div></div>
  <div class="card form"><h2 class="t2">Acesso ao GitHub</h2><p class="mudo" style="margin:0">Repositório <b>${esc(A.cfg.owner)}/${esc(A.cfg.repo)}</b>, branch <b>${esc(A.cfg.branch)}</b>. ${DEMO ? 'Na demonstração não há token: o GitHub é simulado.' : A.cofreDados && A.cofreDados.token ? `O token está guardado neste aparelho, cifrado com a sua senha${A.cofreDados.tokenAte ? ', até ' + esc(new Date(A.cofreDados.tokenAte).toLocaleDateString('pt-BR', { timeZone: 'America/Maceio' })) : ''}.` : 'O token vale só enquanto esta aba estiver aberta (aparelho compartilhado).'} ${DEMO ? '' : validadeToken() ? validadeToken() + '.' : 'O GitHub não informou a validade do token.'}</p>
    <div class="acoes"><button type="button" class="btn btn-sec" data-acao="bloquear">${ic('cadeado')}Bloquear o painel</button>${DEMO ? '' : `<button type="button" class="btn btn-sec" data-acao="trocar-token">Trocar o token</button>`}<button type="button" class="btn btn-sec" data-acao="descartar">Descartar alterações não publicadas</button><button type="button" class="btn btn-perigo" data-acao="sair">${ic('sair')}Sair e apagar dados deste aparelho</button></div>
    <p class="peq mudo" style="margin:0"><b>Bloquear</b> fecha o painel e mantém o acesso guardado (a senha abre de novo). <b>Sair e apagar</b> remove deste aparelho o token, a chave do feedback, os dados privados da casa e os modelos de mensagem.</p></div>`;
VISTAS.config.depois = () => {
  $('#restaurar').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const o = JSON.parse(await f.text()); if (!o || !o.casa || !Array.isArray(o.lugares)) throw new Error('não parece uma cópia do guia (faltam "casa" ou "lugares")');
      const { obj, fix } = preparar_(o);
      if (!confirm(`Substituir o rascunho atual por esta cópia?${fix.length ? `\n\n${fix.length} valor(es) em formato inválido serão deixados vazios.` : ''}`)) return;
      A.draft = obj; A.correcoes = fix; mudou(); toast('Cópia restaurada no rascunho. Revise e publique.'); rerender();
    } catch (x) { toast('Não consegui usar este arquivo: ' + (x instanceof SyntaxError ? 'o JSON está com erro de formatação.' : x.message), true); }
  });
};

/* --- avançado --- */
VISTAS.avancado = () => `${cab('Sistema', 'Editor avançado', 'Todo o conteúdo em JSON. Use com cuidado: um erro de sintaxe impede aplicar.')}
  <div class="card form"><div class="campo"><label for="json">dados/conteudo.json</label><textarea class="json" id="json" spellcheck="false">${esc(JSON.stringify(A.draft, null, 2))}</textarea><span class="ajuda" id="json-msg" aria-live="polite"></span></div>
  <div class="acoes"><button type="button" class="btn btn-prim" data-acao="aplicar-json">Aplicar ao rascunho</button></div></div>`;

/* ---------------- FEEDBACK ---------------- */
const resolvidos = () => new Set(ls.get('admin:fb-resolvidos', []));
const idFb = (i) => { let h = 0; const s = (i.data || '') + (i.mensagem || ''); for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) | 0; return 'f' + (h >>> 0).toString(36); };
/* Datas de CSV/planilha: dd/mm/aaaa (padrão brasileiro), aaaa-mm-dd (meio-dia em Maceió) ou ISO completo. Inválida = null. */
function dataISO(v) {
  const t = String(v == null ? '' : v).trim(); if (!t) return null;
  const ok = (a, m, d, h, mi) => { const x = new Date(Date.UTC(a, m - 1, d, 12)); if (x.getUTCFullYear() !== a || x.getUTCMonth() !== m - 1 || x.getUTCDate() !== d) return null; return new Date(`${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${h || '12'}:${mi || '00'}:00-03:00`).toISOString(); };
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?!\d)(?:[ T,]+(\d{1,2}):(\d{2}))?/);
  if (m) return ok(+(m[3].length === 2 ? '20' + m[3] : m[3]), +m[2], +m[1], m[4] && m[4].padStart(2, '0'), m[5]);
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return ok(+m[1], +m[2], +m[3]);
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) { const d = new Date(t); return isNaN(d) ? null : d.toISOString(); }
  return null;
}
function preparar(itens) {
  return (Array.isArray(itens) ? itens : []).filter(i => i && typeof i === 'object' && tem(i.mensagem)).map(i => {
    const temas = (Array.isArray(i.temas) ? i.temas : String(i.temas || '').split(/[,;]\s*/)).map(t => String(t).slice(0, 40)).filter(Boolean).slice(0, 10);
    const x = { data: dataISO(i.data), mensagem: String(i.mensagem).slice(0, 5000), nome: String(i.nome || '').slice(0, 80), nota: notaValida(i.nota), temas, publicar: i.publicar === true, origem: String(i.origem || 'site').slice(0, 40) };
    x.id = idFb(x); x.a = Sentimento.analisar(x.mensagem, x.nota, temas); return x;
  }).sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
}
function exemplos() {
  const base = Date.now(), d = (n) => new Date(base - n * 864e5).toISOString();
  return [['A casa é linda e muito aconchegante, tudo limpo. As dicas de passeio foram ótimas, o peixe-boi foi o ponto alto!', 5, 3, ['Passeios']], ['O wifi é fraco no quarto e o chuveiro demorou a esquentar. Seria bom ter um roteador mais forte.', 3, 6, ['Internet']], ['Anfitrião super atencioso, respondeu rápido. Voltaremos!', 5, 9, ['Comunicação']], ['Tinha muito mosquito à noite, faltou repelente ou tela nas janelas.', 2, 12, []], ['Localização perfeita, pertinho da praia. Cama confortável.', 5, 18, ['Localização', 'Conforto']], ['A cozinha poderia ter mais panelas e uma cafeteira.', 4, 25, ['Cozinha']], ['Chegada tranquila, as instruções estavam claras.', 5, 33, []], ['O ar condicionado do quarto não funciona direito, passamos calor.', 2, 41, []], ['Barulho de vizinhos no fim de semana, mas a casa é ótima.', 4, 52, []], ['Excelente! Tudo perfeito, nota 10.', 5, 70, []], ['Estava um pouco sujo o banheiro quando chegamos.', 3, 85, ['Limpeza']], ['Adoramos as piscinas naturais, o guia ajudou muito com a maré.', 5, 110, ['Passeios']]]
    .map(([m, n, dias, t], k) => ({ data: d(dias), nota: n, mensagem: m, temas: t, nome: ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabi', 'Hugo', 'Iara', 'João', 'Kátia', 'Lia'][k], publicar: n >= 4, origem: 'exemplo' }));
}
/* Leitura do Apps Script por POST, com a chave no corpo (nunca na URL). text/plain evita o preflight de CORS. */
async function lerFeedbackRemoto(ep, chave) {
  const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ acao: 'listar', chave }), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
  const j = await r.json().catch(() => { throw new Error('a resposta não veio no formato esperado (confira se o endereço termina em /exec e se a implantação está como “Qualquer pessoa”)'); });
  if (!j.ok) throw new Error(j.erro === 'não autorizado' ? 'a chave de leitura não confere com a CHAVE_LEITURA do script' : (j.erro || 'resposta inválida'));
  return Array.isArray(j.itens) ? j.itens : [];
}
async function carregarFeedback() {
  A.fb.carregando = true; A.fb.erro = null;
  const local = ls.get('admin:fb-local', []);
  let remoto = [];
  const ep = (A.draft.config || {}).feedback_endpoint, chave = fbChave();
  if (tem(ep) && tem(chave) && !A.fb.exemplo) {
    if (!urlValida(ep, true)) A.fb.erro = 'O endereço do feedback precisa começar com https://.';
    else { try { remoto = await lerFeedbackRemoto(ep, chave); } catch (e) { A.fb.erro = 'Não consegui ler o feedback do Google: ' + (e instanceof TypeError ? 'sem conexão ou endereço errado.' : e.message); } }
  }
  A.fb.itens = preparar(A.fb.exemplo ? exemplos() : remoto.concat(Array.isArray(local) ? local : []));
  A.fb.carregando = false; atualizarBarra();
  if (A.view === 'feedback' || A.view === 'visao') rerender();
}
function filtrarFb(itens, periodo) {
  const p = periodo || A.fb.periodo; const lim = p === 'todos' ? 0 : Date.now() - (+p) * 864e5;
  return itens.filter(i => !lim || (i.data && new Date(i.data).getTime() >= lim));
}
const ROT = { positivo: 'Positivo', negativo: 'Negativo', neutro: 'Neutro' };
function graficoMeses(itens) {
  const meses = {}; itens.forEach(i => { if (!i.data) return; const k = String(i.data).slice(0, 7); (meses[k] = meses[k] || { positivo: 0, neutro: 0, negativo: 0 })[i.a.sentimento]++; });
  const ks = Object.keys(meses).filter(k => /^\d{4}-\d{2}$/.test(k)).sort().slice(-12); if (!ks.length) return '<p class="mudo">Sem dados no período.</p>';
  if (A.fb.tabela) return `<table class="tabela"><thead><tr><th>Mês</th><th class="num">Positivos</th><th class="num">Neutros</th><th class="num">Negativos</th></tr></thead><tbody>${ks.map(k => `<tr><td>${esc(nomeMes(k))}</td><td class="num">${meses[k].positivo}</td><td class="num">${meses[k].neutro}</td><td class="num">${meses[k].negativo}</td></tr>`).join('')}</tbody></table>`;
  const W = 640, H = 220, pl = 28, pb = 26, pt = 10, maxUp = Math.max(1, ...ks.map(k => meses[k].positivo + meses[k].neutro)), maxDn = Math.max(1, ...ks.map(k => meses[k].negativo));
  const zero = pt + (H - pt - pb) * maxUp / (maxUp + maxDn), esc_ = (H - pt - pb) / (maxUp + maxDn);
  const bw = Math.min(36, (W - pl) / ks.length * 0.55), passo = (W - pl) / ks.length;
  const barras = ks.map((k, i) => { const m = meses[k], cx = pl + passo * i + passo / 2, x = cx - bw / 2;
    const hp = m.positivo * esc_, hn = m.neutro * esc_, hg = m.negativo * esc_;
    return `<g data-dica="${esc(nomeMes(k))}: ${m.positivo} positivos · ${m.neutro} neutros · ${m.negativo} negativos" tabindex="0" role="img" aria-label="${esc(nomeMes(k))}: ${m.positivo} positivos, ${m.neutro} neutros, ${m.negativo} negativos">
      <rect x="${x - 6}" y="${pt}" width="${bw + 12}" height="${H - pt - pb}" fill="transparent"/>
      ${hp ? `<path d="M${x} ${zero - 1}V${zero - hp + 4}q0-4 4-4h${bw - 8}q4 0 4 4V${zero - 1}z" fill="var(--pos)"/>` : ''}
      ${hn ? `<rect x="${x}" y="${zero - hp - hn - (hp ? 2 : 1)}" width="${bw}" height="${Math.max(hn - 1, 1)}" rx="3" fill="var(--neu)"/>` : ''}
      ${hg ? `<path d="M${x} ${zero + 1}V${zero + hg - 4}q0 4 4 4h${bw - 8}q4 0 4-4V${zero + 1}z" fill="var(--neg)"/>` : ''}
      <text x="${cx}" y="${H - 6}" text-anchor="middle">${esc(nomeMes(k, true))}</text></g>`; }).join('');
  return `<div class="legenda" aria-hidden="true"><span><i style="background:var(--pos)"></i>Positivos</span><span><i style="background:var(--neu)"></i>Neutros</span><span><i style="background:var(--neg)"></i>Negativos (abaixo da linha)</span></div>
    <div class="graf"><svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Sentimento dos feedbacks por mês"><line class="eixo" x1="${pl}" x2="${W}" y1="${zero}" y2="${zero}" stroke="#B9AE9B"/><text x="${pl - 6}" y="${zero + 4}" text-anchor="end">0</text>${barras}</svg><div class="dica"></div></div>`;
}
function nomeMes(k, curto) { const [a, m] = k.split('-'); const d = new Date(+a, +m - 1, 15); return d.toLocaleDateString('pt-BR', curto ? { month: 'short' } : { month: 'long', year: 'numeric' }).replace('.', ''); }
function graficoNotas(itens) {
  const c = [1, 2, 3, 4, 5].map(n => itens.filter(i => i.nota === n).length); const tot = c.reduce((a, b) => a + b, 0);
  if (!tot) return '<p class="mudo">Sem notas no período.</p>';
  if (A.fb.tabela) return `<table class="tabela"><thead><tr><th>Nota</th><th class="num">Quantidade</th><th class="num">%</th></tr></thead><tbody>${c.map((v, i) => `<tr><td>${i + 1}</td><td class="num">${v}</td><td class="num">${Math.round(v / tot * 100)}%</td></tr>`).reverse().join('')}</tbody></table>`;
  const mx = Math.max(...c);
  return `<div class="temas-lista">${c.map((v, i) => ({ v, n: i + 1 })).reverse().map(({ v, n }) => `<div class="tema-linha" data-dica="Nota ${n}: ${v} (${Math.round(v / tot * 100)}%)"><b>${n} ${'★'.repeat(n)}</b><div class="tema-barra" style="background:var(--linha)"><i style="width:${v / mx * 100}%;background:var(--mar);border-radius:0 4px 4px 0"></i></div><span class="num">${v}</span></div>`).join('')}</div>`;
}
function graficoTemas(cons) {
  const ts = cons.temas.slice(0, 10); if (!ts.length) return '<p class="mudo">Nenhum tema identificado ainda.</p>';
  const mx = Math.max(...ts.map(t => t.pos + t.neu + t.neg));
  return `<div class="legenda" aria-hidden="true"><span><i style="background:var(--neg)"></i>Críticas</span><span><i style="background:var(--neu)"></i>Neutro ou pedido</span><span><i style="background:var(--pos)"></i>Elogios</span></div>
    <div class="temas-lista">${ts.map(t => { const tot = t.pos + t.neu + t.neg; return `<button type="button" class="tema-linha tema-btn" data-filtro-tema="${esc(t.tema)}" data-dica="${esc(t.tema)}: ${t.neg} crítica(s), ${t.neu} neutra(s), ${t.pos} elogio(s)" aria-label="${esc(t.tema)}: ${t.neg} críticas, ${t.neu} neutras, ${t.pos} elogios. Filtrar.">
      <b>${esc(t.tema)}</b><div class="tema-barra" style="width:${tot / mx * 100}%">${t.neg ? `<i style="flex:${t.neg};background:var(--neg)"></i>` : ''}${t.neu ? `<i style="flex:${t.neu};background:var(--neu)"></i>` : ''}${t.pos ? `<i style="flex:${t.pos};background:var(--pos)"></i>` : ''}</div><span class="num">${tot}</span></button>`; }).join('')}</div>`;
}
function marcar(txt, palavras) {
  let h = esc(txt); const n = Sentimento.norm(txt);
  const pos = []; palavras.forEach(p => { const re = new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'); let m; while ((m = re.exec(n))) pos.push([m.index, m.index + m[0].length]); });
  if (!pos.length) return h;
  pos.sort((a, b) => a[0] - b[0]); let out = '', ult = 0;
  pos.forEach(([a, b]) => { if (a < ult) return; let fim = b; while (fim < txt.length && /\p{L}/u.test(txt[fim])) fim++; const w = txt.slice(a, fim); const s = Sentimento.analisar(w).sTexto; out += esc(txt.slice(ult, a)) + (s ? `<mark class="${s > 0 ? 'p' : 'n'}">${esc(w)}</mark>` : esc(w)); ult = fim; });
  return out + esc(txt.slice(ult));
}
const MIN_TENDENCIA = 5; // A08: com poucos comentários, comparar períodos engana
function insights(cons, anteriores) {
  const out = [];
  const crit = cons.temas.filter(t => t.neg > 0).sort((a, b) => b.neg - a.neg)[0];
  if (crit) out.push(['terra', 'alerta', `<b>${esc(crit.tema)}</b> é o ponto que mais gera críticas (${crit.neg} de ${crit.pos + crit.neu + crit.neg} menções).${crit.exemplos[0] ? ` Ex.: “${esc(String(crit.exemplos[0]).slice(0, 110))}”` : ''}`]);
  const elog = cons.temas.filter(t => t.pos > 0).sort((a, b) => b.pos - a.pos)[0];
  if (elog) out.push(['', 'estrela', `O mais elogiado é <b>${esc(elog.tema)}</b> (${elog.pos} elogio(s)). Vale destacar isso no anúncio.`]);
  if (cons.pedidos.length) out.push(['', 'lampada', `${cons.pedidos.length} pedido(s) de melhoria identificados. Veja a lista de necessidades abaixo.`]);
  if (anteriores && anteriores.n >= MIN_TENDENCIA && cons.n >= MIN_TENDENCIA && anteriores.media && cons.media) { const d = cons.media - anteriores.media; if (Math.abs(d) >= 0.2) out.push([d < 0 ? 'terra' : '', d < 0 ? 'alerta' : 'check', `A nota média ${d > 0 ? 'subiu' : 'caiu'} ${Math.abs(d).toFixed(1).replace('.', ',')} ponto(s) em relação ao período anterior.`]); }
  return out;
}
VISTAS.feedback = () => {
  const topo = `${cab('Hóspedes', 'Feedback e sentimento', 'O que os hóspedes estão dizendo, analisado automaticamente no seu navegador (nada é enviado para fora).', `<button type="button" class="btn btn-sec" data-acao="importar">${ic('upload')}Importar</button><button type="button" class="btn btn-sec" data-acao="recarregar-fb">${ic('atualizar')}Atualizar</button>`)}`;
  if (!A.fb.itens) return topo + '<div class="card"><p class="mudo">Carregando feedback…</p></div>';
  const R = resolvidos();
  const base = filtrarFb(A.fb.itens);
  const p = A.fb.periodo, lim = p === 'todos' ? null : +p;
  const ant = lim ? Sentimento.consolidar(A.fb.itens.filter(i => { if (!i.data) return false; const t = new Date(i.data).getTime(); return t < Date.now() - lim * 864e5 && t >= Date.now() - 2 * lim * 864e5; })) : null;
  const cons = Sentimento.consolidar(base);
  let lista = base;
  if (A.fb.sent !== 'todos') lista = lista.filter(i => i.a.sentimento === A.fb.sent);
  if (A.fb.tema) lista = lista.filter(i => i.a.temas.some(t => t.tema === A.fb.tema));
  const conectado = tem((A.draft.config || {}).feedback_endpoint) && tem(fbChave());
  const semData = A.fb.itens.filter(i => !i.data).length;
  const pct = (k) => cons.n ? Math.round(cons.cont[k] / cons.n * 100) : 0;
  return topo + `
  ${A.fb.exemplo ? '<div class="exemplo-faixa">Você está vendo DADOS DE EXEMPLO para conhecer o painel. <button type="button" class="btn btn-fant" style="color:#fff;text-decoration:underline" data-acao="sem-exemplo">Voltar aos dados reais</button></div>' : ''}
  ${A.fb.erro ? `<div class="aviso erro" role="alert" style="margin-bottom:12px">${ic('alerta')}<span>${esc(A.fb.erro)} <button type="button" class="btn btn-fant" style="padding:0;min-height:0" data-ir="config">Revisar configuração</button></span></div>` : ''}
  ${!conectado && !A.fb.exemplo ? `<div class="aviso" style="margin-bottom:12px">${ic('lampada')}<span>O formulário do site ainda não está ligado a este painel. <button type="button" class="btn btn-fant" style="padding:0;min-height:0" data-ir="config">Configurar agora</button> · ou <button type="button" class="btn btn-fant" style="padding:0;min-height:0" data-acao="com-exemplo">ver com dados de exemplo</button></span></div>` : ''}
  ${semData && p !== 'todos' ? `<div class="aviso" style="margin-bottom:12px">${ic('alerta')}<span>${semData} comentário(s) sem data reconhecida aparecem só em “Tudo”.</span></div>` : ''}
  ${!A.fb.itens.length ? `<div class="vazio">Nenhum feedback ainda. Quando os hóspedes usarem o formulário do site, os comentários aparecem aqui. Você também pode <button type="button" class="btn btn-fant" style="padding:0;min-height:0" data-acao="importar">importar avaliações do Airbnb</button>.</div>` : `
  <div class="filtros" role="group" aria-label="Filtros">
    <div class="seg" role="group" aria-label="Período">${[['30', '30 dias'], ['90', '90 dias'], ['365', '12 meses'], ['todos', 'Tudo']].map(([v, r]) => `<button type="button" data-fb-periodo="${v}" aria-pressed="${A.fb.periodo === v}">${r}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Sentimento">${[['todos', 'Todos'], ['negativo', 'Negativos'], ['neutro', 'Neutros'], ['positivo', 'Positivos']].map(([v, r]) => `<button type="button" data-fb-sent="${v}" aria-pressed="${A.fb.sent === v}">${r}</button>`).join('')}</div>
    ${A.fb.tema ? `<button type="button" class="tag mar" style="border:0;cursor:pointer;padding:8px 10px" data-filtro-tema="" aria-label="Tirar o filtro de tema ${esc(A.fb.tema)}">${esc(A.fb.tema)} ✕</button>` : ''}
    <label class="check" style="margin-left:auto"><input type="checkbox" data-acao="tabela" ${A.fb.tabela ? 'checked' : ''}>Ver como tabela</label>
  </div>
  <div class="grade g4">
    <div class="card kpi"><span class="rot">Nota média</span><span class="val">${cons.media ? cons.media.toFixed(1).replace('.', ',') : '—'}</span><span class="sub">${cons.n} feedback(s)${ant && ant.n >= MIN_TENDENCIA && cons.n >= MIN_TENDENCIA && ant.media && cons.media ? ` · antes ${ant.media.toFixed(1).replace('.', ',')}` : ant && lim ? ' · poucos comentários para comparar com o período anterior' : ''}</span></div>
    <div class="card kpi"><span class="rot" style="color:var(--pos)">● Positivos</span><span class="val">${pct('positivo')}%</span><span class="sub">${cons.cont.positivo} comentário(s)</span></div>
    <div class="card kpi"><span class="rot" style="color:var(--neg)">▼ Negativos</span><span class="val">${pct('negativo')}%</span><span class="sub">${cons.cont.negativo} · ${base.filter(i => i.a.sentimento === 'negativo' && !R.has(i.id)).length} sem resolução</span></div>
    <div class="card kpi"><span class="rot">Pedidos de melhoria</span><span class="val">${cons.pedidos.length}</span><span class="sub">necessidades detectadas</span></div>
  </div>
  ${insights(cons, ant).length ? `<div class="grade" style="margin-top:14px">${insights(cons, ant).map(([c, i, t]) => `<div class="insight ${c}">${ic(i)}<span>${t}</span></div>`).join('')}</div>` : ''}
  <div class="grade g2" style="margin-top:14px">
    <div class="card"><h2 class="t2" style="margin-bottom:8px">Sentimento por mês</h2>${graficoMeses(base)}</div>
    <div class="card"><h2 class="t2" style="margin-bottom:12px">Temas mais citados</h2><p class="mudo peq" style="margin:-6px 0 12px">Toque em um tema para filtrar os comentários.</p>${graficoTemas(cons)}</div>
  </div>
  <div class="grade g2" style="margin-top:14px">
    <div class="card"><h2 class="t2" style="margin-bottom:12px">Distribuição das notas</h2>${graficoNotas(base)}</div>
    <div class="card"><h2 class="t2" style="margin-bottom:12px">Necessidades dos hóspedes</h2>${cons.pedidos.length ? `<div class="temas-lista">${cons.pedidos.slice(0, 8).map(pd => `<div class="pend falta">${ic('lampada')}<span>“${esc(pd.texto)}” <span class="mudo peq">· ${dataBR(pd.data) || 'sem data'}</span></span></div>`).join('')}</div>` : '<p class="mudo">Nenhum pedido de melhoria no período.</p>'}</div>
  </div>
  <div class="card" style="margin-top:14px"><div class="cab" style="margin-bottom:12px"><h2 class="t2">Comentários (${lista.length})</h2></div>
    <div class="itens">${lista.length ? lista.slice(0, 60).map(i => `<article class="fb ${R.has(i.id) ? 'resolvido' : ''}">
      <div class="fb-cab"><span class="tag ${i.a.sentimento.slice(0, 3)}">${i.a.sentimento === 'positivo' ? '●' : i.a.sentimento === 'negativo' ? '▼' : '■'} ${ROT[i.a.sentimento]}</span>${i.nota ? `<span class="tag">${i.nota}★</span>` : ''}${i.a.temas.map(t => `<span class="tag ${t.neg ? 'neg' : ''}">${esc(t.tema)}</span>`).join('')}<span class="data">${esc(i.nome || 'Anônimo')} · ${dataBR(i.data) || 'data desconhecida'}${i.origem && i.origem !== 'site' ? ' · ' + esc(i.origem) : ''}</span></div>
      <p>${marcar(i.mensagem, i.a.palavras)}</p>
      <div class="acoes">${i.publicar ? `<button type="button" class="btn btn-sec" data-publicar-fb="${esc(i.id)}">${ic('estrela')}Publicar como avaliação</button>` : '<span class="mudo peq">Sem autorização para publicar</span>'}
        <button type="button" class="btn btn-fant" data-resolver="${esc(i.id)}">${R.has(i.id) ? 'Reabrir' : 'Marcar como resolvido'}</button></div></article>`).join('') : '<div class="vazio">Nenhum comentário com estes filtros.</div>'}</div></div>`}`;
};
VISTAS.feedback.depois = () => { if (!A.fb.itens && !A.fb.carregando) carregarFeedback(); ligarDicas(); };
function ligarDicas() {
  $$('.graf, .temas-lista').forEach(g => {
    const box = g.closest('.card'); if (!box) return; let d = box.querySelector('.dica'); if (!d) { d = document.createElement('div'); d.className = 'dica'; box.style.position = 'relative'; box.appendChild(d); }
    const mostrar = (alvo, x, y) => { const r = box.getBoundingClientRect(); d.textContent = alvo.dataset.dica; d.style.left = Math.max(60, Math.min(r.width - 60, x - r.left)) + 'px'; d.style.top = (y - r.top) + 'px'; d.style.opacity = 1; };
    g.addEventListener('pointermove', e => { const a = e.target.closest('[data-dica]'); if (a) mostrar(a, e.clientX, e.clientY); else d.style.opacity = 0; });
    g.addEventListener('pointerleave', () => d.style.opacity = 0);
    g.addEventListener('focusin', e => { const a = e.target.closest('[data-dica]'); if (a) { const r = a.getBoundingClientRect(); mostrar(a, r.left + r.width / 2, r.top); } });
    g.addEventListener('focusout', () => d.style.opacity = 0);
  });
}
function importar() {
  const d = $('#dialogo'), n = (ls.get('admin:fb-local', []) || []).length;
  d.innerHTML = `<div class="ed-cab"><h2 class="t2" id="dlg-titulo">Importar feedback</h2><button type="button" class="btn btn-sec btn-ic" data-fechar-dialogo aria-label="Fechar">${ic('x')}</button></div>
  <div class="ed-corpo form"><p class="mudo" style="margin:0">Cole avaliações do Airbnb, mensagens de WhatsApp ou anotações. Separe cada comentário com uma linha em branco. Eles ficam guardados só neste aparelho e entram na análise.</p>
    <div class="campos"><div class="campo"><label for="imp-origem">Origem</label><input type="text" id="imp-origem" value="Airbnb"></div><div class="campo"><label for="imp-nota">Nota (se todas iguais)</label><select id="imp-nota"><option value="">—</option><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div></div>
    <div class="campo"><label for="imp-texto">Comentários</label><textarea id="imp-texto" rows="9"></textarea><span class="ajuda">Dica: começar uma linha com “5 - ” ou “Nota 4:” define a nota daquele comentário.</span></div>
    <div class="campo"><label for="imp-csv">Ou um arquivo CSV (colunas: data, nota, mensagem, nome)</label><input type="file" id="imp-csv" accept=".csv,text/csv"><span class="ajuda">Datas no formato 23/10/2026 ou 2026-10-23. Notas de 1 a 5.</span></div>
    <div class="acoes"><button type="button" class="btn btn-prim" data-acao="confirmar-importar">Importar</button>${n ? `<button type="button" class="btn btn-perigo" data-acao="limpar-importados">Apagar ${n} importado(s)</button>` : ''}</div></div>`;
  d.setAttribute('aria-labelledby', 'dlg-titulo'); d.showModal();
}
function parseCsv(t) {
  t = String(t).replace(/^﻿/, '');
  const linhas = []; let cel = '', linha = [], aspas = false;
  const sep = (t.split('\n')[0].match(/;/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < t.length; i++) { const c = t[i]; if (aspas) { if (c === '"' && t[i + 1] === '"') { cel += '"'; i++; } else if (c === '"') aspas = false; else cel += c; } else if (c === '"') aspas = true; else if (c === sep) { linha.push(cel); cel = ''; } else if (c === '\n') { linha.push(cel); linhas.push(linha); linha = []; cel = ''; } else if (c !== '\r') cel += c; }
  if (cel || linha.length) { linha.push(cel); linhas.push(linha); }
  if (!linhas.length) return [];
  const cab = linhas.shift().map(h => Sentimento.norm(h).trim());
  const ix = (n) => cab.findIndex(h => h.startsWith(n));
  const col = (l, ...ns) => { for (const n of ns) { const i = ix(n); if (i >= 0 && tem(l[i])) return l[i]; } return ''; };
  if (ix('mensag') < 0 && ix('coment') < 0 && ix('texto') < 0) throw new Error('o CSV precisa de uma coluna “mensagem” (ou “comentário”)');
  return linhas.filter(l => l.some(Boolean)).map(l => ({ data: col(l, 'data'), nota: col(l, 'nota'), mensagem: col(l, 'mensag', 'coment', 'texto'), nome: col(l, 'nome'), origem: 'CSV', publicar: false }));
}

/* ---------------- publicar ---------------- */
function problemasPublicacao() {
  const seg = procurarSegredos(A.draft), links = linksInvalidos(A.draft);
  const insta = tem(A.draft.casa.instagram) && !/^[A-Za-z0-9._]{1,30}$/.test(A.draft.casa.instagram);
  const PL = problemasLugares(A.draft);
  return { fortes: seg.filter(s => s.nivel === 'forte'), ambiguos: seg.filter(s => s.nivel === 'ambiguo'), links, insta, notas: PL.fortes, notasAmb: PL.ambiguos, semContato: PL.semContato, semAlt: fotosSemDescricao(A.draft) };
}
/* Fotos com endereço e sem descrição (A06): aviso não bloqueante. Lugares em rascunho não contam. */
function fotosSemDescricao(o) {
  const out = [], f = (x, campo) => { if (x && tem(x.src) && !tem(x.alt)) out.push(campo); };
  const casa = o.casa || {};
  (casa.fotos || []).forEach((x, i) => f(x, `casa.fotos.${i}.alt`));
  (casa.ambientes || []).forEach((a, i) => f(a && a.foto, `casa.ambientes.${i}.foto.alt`));
  (o.lugares || []).forEach((l, i) => { if (l && l.status !== 'rascunho') f(l.foto, `lugares.${i}.foto.alt`); });
  f((o.config || {}).og_imagem, 'config.og_imagem.alt');
  return out;
}
function publicar() {
  const m = resumoMudancas(); if (!m.length) { toast('Não há alterações para publicar.'); return; }
  const P = problemasPublicacao(), bloqueia = P.fortes.length || P.links.length || P.insta || P.notas.length || P.semContato.length;
  const nomeLugar = (c) => { const l = A.draft.lugares[+c.split('.')[1]]; return (l && l.nome) || 'lugar'; };
  const linhaNota = (n) => `<li><span>“${esc(n.trecho)}”</span> <span class="mudo">em ${esc(nomeLugar(n.campo))} (${esc(NOMES_CAMPO[n.chave] || n.chave)})</span> <button type="button" class="btn btn-fant" data-ir-achado="${esc(n.campo)}">Corrigir</button></li>`;
  const linhaAchado = (s) => { const o = ondeFica(s.campo); return `<li><span>“${esc(s.trecho)}”</span> <span class="mudo">em ${esc(o.nome)}</span> <button type="button" class="btn btn-fant" data-ir-achado="${esc(s.campo)}">Corrigir</button></li>`; };
  const d = $('#dialogo');
  d.innerHTML = `<div class="ed-cab"><h2 class="t2" id="dlg-titulo">Publicar alterações</h2><button type="button" class="btn btn-sec btn-ic" data-fechar-dialogo aria-label="Fechar">${ic('x')}</button></div>
  <div class="ed-corpo form">
    ${P.fortes.length ? `<div class="aviso erro" role="alert">${ic('cadeado')}<div><b>Encontrei algo que parece senha ou código de acesso.</b> O site é público: tire esses trechos e envie os dados por WhatsApp ao hóspede.<ul class="achados">${P.fortes.map(linhaAchado).join('')}</ul></div></div>` : ''}
    ${P.links.length ? `<div class="aviso erro" role="alert">${ic('alerta')}<div><b>Links precisam começar com https://</b><ul class="achados">${P.links.map(l => `<li><span>${esc(l.valor.slice(0, 60))}</span> <span class="mudo">em ${esc(ondeFica(l.campo).nome)}</span> <button type="button" class="btn btn-fant" data-ir-achado="${esc(l.campo)}">Corrigir</button></li>`).join('')}</ul></div></div>` : ''}
    ${P.notas.length ? `<div class="aviso erro" role="alert">${ic('alerta')}<div><b>Há anotações internas no texto de lugares publicados.</b> O hóspede leria isso no site. Apague o trecho ou mova para a “Nota interna” do lugar (ela nunca aparece no site).<ul class="achados">${P.notas.map(linhaNota).join('')}</ul></div></div>` : ''}
    ${P.semContato.length ? `<div class="aviso erro" role="alert">${ic('alerta')}<div><b>Lugar para comer publicado sem horário, telefone, WhatsApp ou link.</b> O hóspede não teria como saber se está aberto. Preencha um deles ou volte o lugar para rascunho.<ul class="achados">${P.semContato.map(x => `<li><span>${esc(x.nome)}</span> <button type="button" class="btn btn-fant" data-ir-achado="${esc(x.campo)}">Corrigir</button></li>`).join('')}</ul></div></div>` : ''}
    ${P.insta ? `<div class="aviso erro" role="alert">${ic('alerta')}<span>Instagram: use só o nome do perfil, sem @ e sem link. <button type="button" class="btn btn-fant" data-ir-achado="casa.instagram">Corrigir</button></span></div>` : ''}
    ${P.ambiguos.length ? `<div class="aviso">${ic('alerta')}<div><b>Confira estes trechos:</b> podem ser senha ou código.<ul class="achados">${P.ambiguos.map(linhaAchado).join('')}</ul><label class="check" style="margin-top:8px"><input type="checkbox" id="ok-ambiguo" class="ok-conf" ${bloqueia ? 'disabled' : ''}>Conferi: não são senhas nem códigos. Publicar mesmo assim.</label></div></div>` : ''}
    ${P.notasAmb.length ? `<div class="aviso">${ic('alerta')}<div><b>Estes trechos parecem anotação de pesquisa.</b> Se forem para o hóspede (como “confirme no local”), pode publicar. Se forem lembrete seu, mova para a “Nota interna”.<ul class="achados">${P.notasAmb.map(linhaNota).join('')}</ul><label class="check" style="margin-top:8px"><input type="checkbox" id="ok-notas" class="ok-conf" ${bloqueia ? 'disabled' : ''}>Conferi: esses textos são para o hóspede.</label></div></div>` : ''}
    ${P.semAlt.length ? `<div class="aviso aviso-leve">${ic('imagem')}<div><b>${P.semAlt.length === 1 ? '1 foto está' : P.semAlt.length + ' fotos estão'} sem descrição.</b> Dá para publicar assim, mas quem usa leitor de tela não saberá o que aparece nela${P.semAlt.length === 1 ? '' : 's'}. <button type="button" class="btn btn-fant" data-ir-achado="${esc(P.semAlt[0])}">Descrever agora</button></div></div>` : ''}
    <div><h3 class="t3" style="margin-bottom:8px">O que muda no site</h3>${m.map(x => `<div class="pend ok">${ic('check')}<span>${esc(x)}</span></div>`).join('')}</div>
    <div class="campo"><label for="msg-commit">Descrição da alteração (fica no histórico)</label><input type="text" id="msg-commit" maxlength="120" value="${esc('Atualiza guia: ' + m.map(x => x.split(':')[0]).join(', '))}"></div>
    <div class="acoes"><button type="button" class="btn btn-prim" data-acao="confirmar-publicar" ${bloqueia || P.ambiguos.length || P.notasAmb.length ? 'disabled' : ''}>${ic('enviar')}Publicar agora</button><button type="button" class="btn btn-sec" data-acao="previa">${ic('olho')}Pré-visualizar antes</button></div>
    <p class="mudo peq" style="margin:0">O site atualiza em até alguns minutos depois da publicação. No celular de quem já abriu o guia, pode levar até uns 10 minutos para aparecer.</p></div>`;
  d.setAttribute('aria-labelledby', 'dlg-titulo'); d.showModal();
}
function rotuloConflito(p) { const k = p.replace(/\[([^\]]+)\]/, '.$1').split('.'); const sec = k[0]; const it = Array.isArray(A.draft[sec]) && k[1] ? (A.draft[sec].find(x => x && x.id === k[1]) || {}) : null; return (sec === 'casa' && k[1] === 'chegada' ? 'Chegada e saída' : NOMES_SECAO[sec] || sec) + (it ? ' › ' + (it.nome || it.titulo || k[1]) : k[1] ? ' › ' + (NOMES_CAMPO[k[1]] || k[1].replace(/_/g, ' ')) : ''); }
function mostrarConflitos(c, inicial) {
  const d = $('#dialogo'); if (d.open) d.close();
  d.innerHTML = `<div class="ed-cab"><h2 class="t2" id="dlg-titulo">Mudanças nos dois lados</h2></div>
  <div class="ed-corpo form"><p style="margin:0">${inicial ? 'Seu rascunho deste aparelho' : 'Enquanto você editava,'} o guia também foi alterado em outro lugar (outro aparelho ou outra pessoa). Juntei tudo o que deu. Nestes pontos as duas versões mudaram de jeitos diferentes:</p>
    <ul class="achados">${[...new Set(c.m.conflitos.map(rotuloConflito))].map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="mudo peq" style="margin:0">Nada foi publicado. Escolha qual versão vale nesses pontos; o resto já está junto. Depois, revise e publique.</p>
    <div class="acoes"><button type="button" class="btn btn-prim" data-conflito="minha">Ficar com a minha nesses pontos</button><button type="button" class="btn btn-sec" data-conflito="deles">Ficar com a do site</button>${inicial ? '<button type="button" class="btn btn-perigo" data-conflito="descartar">Descartar meu rascunho</button>' : ''}</div></div>`;
  d.setAttribute('aria-labelledby', 'dlg-titulo');
  mostrarConflitos.atual = c; d.showModal();
}
function resolverConflito(escolha) {
  const c = mostrarConflitos.atual; if (!c) return;
  A.remoto = c.atual; A.baseSha = c.atual.sha; A.baseObj = clone(c.atual.obj);
  if (escolha === 'descartar') A.draft = clone(c.atual.obj);
  else A.draft = mesclar(c.base, c.rasc, c.atual.obj, escolha === 'deles' ? 'deles' : 'minha').obj;
  A.draft = preparar_(A.draft).obj; mostrarConflitos.atual = null; $('#dialogo').close(); salvarRascunho(); atualizarBarra(); rerender();
  toast(escolha === 'descartar' ? 'Rascunho descartado. Você está vendo a versão do site.' : 'Versões juntas. Revise e toque em Publicar.');
}
async function confirmarPublicar() {
  { const P = problemasPublicacao(); if (P.fortes.length || P.links.length || P.insta || P.notas.length || P.semContato.length) { toast('Ainda há itens que impedem a publicação. Abra “Publicar” de novo para ver.', true); return; } }
  const btn = $('[data-acao="confirmar-publicar"]'); if (btn) { btn.disabled = true; btn.textContent = 'Publicando…'; }
  const restaurar = () => { if (btn) { btn.disabled = false; btn.textContent = 'Tentar de novo'; } };
  try {
    const atual = await baixarConteudo();
    let o = clone(A.draft), juntou = false;
    if (atual.sha !== A.baseSha) {
      const m = mesclar(A.baseObj, A.draft, atual.obj);
      if (m.conflitos.length) { mostrarConflitos({ m, base: A.baseObj, rasc: clone(A.draft), atual }); return; }
      o = m.obj; juntou = true;
    }
    o.atualizado_em = hoje();
    o = preparar_(o).obj; // grava sempre no esquema atual
    const msg = ($('#msg-commit') && $('#msg-commit').value.trim()) || 'Atualiza guia';
    // Grava no formato que existe no repositório (conteudo.js até o anfitrião atualizar o formato).
    const r = await gh(`${repoPath()}/contents/${arqDe(atual.formato)}`, { method: 'PUT', body: { message: msg.slice(0, 120), content: b64.para(escreverConteudo(o, atual.formato)), sha: atual.sha, branch: A.cfg.branch } });
    A.formato = atual.formato;
    A.remoto = { sha: r.content.sha, obj: clone(o), formato: atual.formato }; A.baseSha = r.content.sha; A.baseObj = clone(o); A.draft = clone(o); A.correcoes = [];
    ls.del('admin:rascunho'); ls.del('guia:rascunho'); $('#dialogo').close(); atualizarBarra(); rerender();
    toast(DEMO ? 'Publicação simulada: na demonstração nada é enviado ao GitHub.' : juntou ? 'Publicado! Juntei com alterações feitas em outro aparelho. O site atualiza em até alguns minutos.' : 'Publicado! O site atualiza em até alguns minutos.');
    try { await atualizarIndex(o); }
    catch (x) { toast((x.semMarcadores ? 'Conteúdo publicado. Aviso: ' : 'Conteúdo publicado, mas o título e a imagem de compartilhamento (WhatsApp) não foram atualizados: ') + (x.status != null ? msgErro(x) : x.message), true); }
  } catch (e) {
    toast(e.status === -1 ? e.message : msgErro(e, 'publicar'), true);
    restaurar();
  }
}
/* Metadados de compartilhamento precisam estar no HTML: o WhatsApp não executa JavaScript.
   O painel NUNCA reescreve o código do index.html: só troca o conteúdo entre <!-- compartilhar:inicio --> e
   <!-- compartilhar:fim -->. Sem os dois marcadores (index antigo ou editado à mão), não toca no arquivo e avisa.
   A imagem é um arquivo fixo, compartilhar.jpg (1200×630, JPEG: o formato que todo WhatsApp mostra), gerado da
   foto escolhida só quando ela muda; o ?v= no endereço força o WhatsApp a buscar a imagem nova. */
const MARCA_INI = '<!-- compartilhar:inicio -->', MARCA_FIM = '<!-- compartilhar:fim -->';
const OG_DESC = 'Tudo para sua estadia e o melhor da Rota dos Milagres, a poucos toques.';
const hashCurto = (t) => { let h = 2166136261; for (const c of String(t)) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); };
function blocoCompartilhar(o, base, img, descAtual) {
  const nome = String((o.casa && o.casa.nome) || '').trim() || 'Casa 18 Anahi';
  const titulo = `${nome} · Guia do hóspede`, alt = (o.config && o.config.og_imagem && o.config.og_imagem.alt) || (img ? 'Casa 18 Anahi' : '');
  const linhas = [MARCA_INI, '<!-- Bloco gerado pelo painel ao publicar (título e prévia no WhatsApp). O painel só reescreve o que fica entre estes dois marcadores. -->',
    `<title>${esc(titulo)}</title>`, `<meta property="og:title" content="${esc(titulo)}">`, `<meta property="og:description" content="${esc(descAtual || OG_DESC)}">`,
    `<meta property="og:image" content="${esc(img)}">`, `<meta property="og:image:alt" content="${esc(img ? alt : '')}">`];
  if (img) linhas.push('<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">');
  linhas.push(`<meta property="og:url" content="${esc(base)}">`, `<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}">`, MARCA_FIM);
  return linhas.join('\n');
}
/* Gera o JPEG 1200×630 (recorte central) a partir da foto escolhida. */
function gerarImagemCompartilhar(src) {
  return new Promise((ok, falha) => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => {
      const W = 1200, H = 630, k = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
      g.fillStyle = '#F4EFE6'; g.fillRect(0, 0, W, H); g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
      try { cv.toBlob(b => b ? ok(b) : falha(new Error('não consegui gerar a imagem')), 'image/jpeg', 0.86); } catch (e) { falha(e); }
    };
    img.onerror = () => falha(new Error('não consegui abrir a foto escolhida'));
    img.src = /^https:/.test(src) ? src : (A.cacheFotos[src.replace(/^\.\//, '')] || rawUrl(src));
  });
}
async function atualizarIndex(o) {
  const j = await gh(`${repoPath()}/contents/index.html?ref=${encodeURIComponent(A.cfg.branch)}`);
  const html = b64.de(j.content), base = urlPublica();
  const ini = html.indexOf(MARCA_INI), fim = html.indexOf(MARCA_FIM);
  if (ini < 0 || fim < 0 || fim < ini || html.indexOf(MARCA_INI, ini + 1) >= 0 || html.indexOf(MARCA_FIM, fim + 1) >= 0) {
    const x = new Error('o index.html publicado não tem os marcadores <!-- compartilhar:inicio --> e <!-- compartilhar:fim --> (código antigo ou editado à mão). Não alterei o arquivo; suba o código novo do site para o painel cuidar do título e da imagem'); x.semMarcadores = true; throw x;
  }
  const blocoAtual = html.slice(ini, fim + MARCA_FIM.length);
  const descAtual = ((blocoAtual.match(/<meta property="og:description" content="([^"]*)"/) || [])[1] || '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const foto = o.config && o.config.og_imagem && o.config.og_imagem.src;
  let img = '';
  if (foto) {
    if (!/^https:\/\//.test(base)) throw new Error('o endereço do site em “QR Code” é inválido; use https://');
    const v = hashCurto(foto), atualImg = (blocoAtual.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || '';
    img = new URL('compartilhar.jpg?v=' + v, base).href;
    if (DEMO) img = /^https:/.test(foto) ? foto : new URL(foto.replace(/^\.\//, ''), base).href; // demonstração: nada é gerado
    else if (!atualImg.includes('compartilhar.jpg?v=' + v)) { // foto nova: gera e grava compartilhar.jpg
      try {
        const blob = await gerarImagemCompartilhar(foto);
        let sha; try { sha = (await gh(`${repoPath()}/contents/compartilhar.jpg?ref=${encodeURIComponent(A.cfg.branch)}`)).sha; } catch (e) { if (e.status !== 404) throw e; }
        await gh(`${repoPath()}/contents/compartilhar.jpg`, { method: 'PUT', body: Object.assign({ message: 'Imagem de compartilhamento', content: await blobB64(blob), branch: A.cfg.branch }, sha ? { sha } : {}) });
      } catch (e) { // reserva: aponta direto para a foto escolhida
        if (e.status != null) throw e;
        img = /^https:/.test(foto) ? foto : new URL(foto.replace(/^\.\//, ''), base).href;
      }
    }
  }
  const novoBloco = blocoCompartilhar(o, base, img, descAtual);
  if (novoBloco === blocoAtual) return;
  const n = html.slice(0, ini) + novoBloco + html.slice(fim + MARCA_FIM.length);
  // Integridade: fora do bloco, nenhum byte muda; o documento continua com um doctype, um <title> e um </html>.
  const conta = (re) => (n.match(re) || []).length;
  if (n.slice(0, ini) !== html.slice(0, ini) || !n.endsWith(html.slice(fim + MARCA_FIM.length)) || conta(/<!doctype/gi) !== 1 || conta(/<title>/gi) !== 1 || conta(/<\/html>/gi) !== 1 || novoBloco.length > 4000) throw new Error('a verificação de integridade do index.html falhou; nada foi alterado nele');
  await gh(`${repoPath()}/contents/index.html`, { method: 'PUT', body: { message: 'Atualiza metadados de compartilhamento', content: b64.para(n), sha: j.sha, branch: A.cfg.branch } });
}
/* A11: fotos enviadas nesta sessão ainda podem não estar no GitHub Pages (leva alguns minutos).
   Na prévia, elas apontam para o arquivo no GitHub (raw), que já existe logo depois do envio. */
function objPrevia() {
  const o = clone(A.draft), novas = new Set(Object.keys(A.cacheFotos));
  const andar = (x) => { if (Array.isArray(x)) x.forEach(andar); else if (x && typeof x === 'object') Object.keys(x).forEach(k => { if (k === 'src' && typeof x[k] === 'string' && novas.has(x[k].replace(/^\.\//, ''))) x[k] = rawUrl(x[k]); else andar(x[k]); }); };
  andar(o); return o;
}
const URL_PREVIA = '../index.html?rascunho=1#/inicio';
function previa() {
  const o = objPrevia();
  const LP = LS || abrirArmaz('localStorage'); // na demonstração o painel não usa o armazenamento, mas a prévia precisa dele
  if (!LP) { toast('A pré-visualização precisa do armazenamento do navegador, que está bloqueado.', true); return; }
  try { LP.setItem('guia:rascunho', JSON.stringify(o)); } catch (e) { toast('Não foi possível preparar a pré-visualização (sem espaço no navegador).', true); return; }
  // A09: sem "noopener" (com ele o navegador sempre devolve null e não dá para saber se abriu). Cortamos o vínculo logo depois.
  let w = null; try { w = window.open(URL_PREVIA, '_blank'); } catch (e) { w = null; }
  if (w) { try { w.opener = null; } catch (e) {} toast('Pré-visualização aberta em outra aba. Nada foi publicado.'); return; }
  toast('O navegador bloqueou a nova aba. Toque em “Abrir a pré-visualização”.');
  const d = $('#dialogo'); if (d.open) d.close();
  d.innerHTML = `<div class="ed-cab"><h2 class="t2" id="dlg-titulo">Pré-visualização pronta</h2><button type="button" class="btn btn-sec btn-ic" data-fechar-dialogo aria-label="Fechar">${ic('x')}</button></div>
    <div class="ed-corpo form"><p style="margin:0">O navegador não deixou abrir a nova aba sozinho. Toque no botão abaixo para ver o rascunho. Nada foi publicado.</p>
    <div class="acoes"><a class="btn btn-prim" id="link-previa" href="${esc(URL_PREVIA)}" target="_blank" rel="noopener" data-fechar-previa>${ic('olho')}Abrir a pré-visualização</a></div></div>`;
  d.setAttribute('aria-labelledby', 'dlg-titulo'); d.showModal(); $('#link-previa').focus();
}
function irParaAchado(campo) {
  const o = ondeFica(campo); $('#dialogo').close();
  if (o.i != null && COLECOES[o.sec]) { ir(o.sec); abrirEditor(o.sec, o.i); }
  else ir(o.ir);
  setTimeout(() => {
    let el = null, p = campo.split('.');
    while (!el && p.length) { const c = p.join('.'); el = document.querySelector(`[data-k="${CSS.escape(c)}"]`) || document.querySelector(`[data-k^="${CSS.escape(c)}."]`); p.pop(); }
    if (campo === 'casa.fotos' && !(A.draft.casa.fotos || []).length) el = $('.add-foto');
    if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); }
  }, 60);
}

/* ---------------- eventos ---------------- */
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.est) { A.estadia[el.dataset.est] = el.value; atualizarHospede(); return; }
  if (el.dataset && el.dataset.priv && A.cofreDados) { A.cofreDados.privados[el.dataset.priv] = el.type === 'checkbox' ? el.checked : el.value; privMudou(); return; }
  if (el.dataset && el.dataset.modelo) { A.modelosEdit[el.dataset.modelo] = el.value; atualizarHospede(); return; }
  if (el.id === 'filtro-itens') { A.busca = el.value; const pos = el.selectionStart; rerender(); const n = $('#filtro-itens'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
  if (!el.dataset || !el.dataset.k || !A.draft) return;
  const t = el.dataset.t; let v;
  if (t === 'check') v = el.checked;
  else if (t === 'num') { const s = String(el.value).trim().replace(',', '.'); v = s === '' ? null : (isFinite(Number(s)) ? Number(s) : caminho(A.draft, el.dataset.k)); }
  else if (t === 'lista') v = el.value.split('\n').map(s => s.trim()).filter(Boolean);
  else v = el.value;
  if (el.dataset.k === 'casa.instagram') v = String(v).trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/\/.*$/, '');
  if (el.dataset.v === 'whats' && tem(v)) { const n = normalizarWhats(v); if (n && !/[^\d\s()+.-]/.test(v)) v = n; }
  if (el.dataset.k === 'casa.link_reserva') { if (ehIcal(v)) { v = ''; } const av = $('#reserva-aviso'); if (av) av.innerHTML = avisoReserva(el.value); const pv = $('#reserva-previa'); if (pv) pv.innerHTML = previaReserva(el.value); }
  if (/\.coordenadas\.(lat|lng)$/.test(el.dataset.k) && !caminho(A.draft, 'casa.coordenadas')) A.draft.casa.coordenadas = { lat: null, lng: null };
  definir(A.draft, el.dataset.k, v);
  marcarErro(el);
  if (/^lugares\.\d+\.nome$/.test(el.dataset.k) || /^roteiros\.\d+\.titulo$/.test(el.dataset.k)) { const h = $('#editor .ed-cab h2'); if (h) h.textContent = v; }
  if (edicao && edicao.nome === 'lugares' && /^lugares\.\d+\.(resumo|descricao|dica|bom_saber|horario|telefone|whatsapp|link|link_cardapio)$/.test(el.dataset.k)) { const a = $('#ed-avisos'); if (a) { const h = avisosLugar(edicao.i); if (a.innerHTML !== h) a.innerHTML = h; } }
  mudou();
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset && el.dataset.priv && A.cofreDados) { A.cofreDados.privados[el.dataset.priv] = el.type === 'checkbox' ? el.checked : el.value; privMudou(true); if (el.dataset.priv === 'wifi_tipo') rerender(); return; }
  if (el.dataset && el.dataset.est) { if (el.dataset.est === 'fone' && tem(el.value)) { const n = normalizarWhats(el.value); if (n) { el.value = n; A.estadia.fone = n; } } atualizarHospede(); return; }
  if (el.dataset && el.dataset.imp) { A.imp[el.dataset.imp] = el.checked; rerender(); return; }
  if (el.dataset && el.dataset.impPapel) { A.imp.papel = el.dataset.impPapel; return; }
  if (el.dataset && el.dataset.virada) { const v = virada(); if (el.checked) v.marcados[el.dataset.virada] = Date.now(); else delete v.marcados[el.dataset.virada]; if (!v.inicio) v.inicio = Date.now(); salvarVirada(v); const k = el.dataset.virada; rerender(); const n = $(`[data-virada="${k}"]`); if (n) n.focus({ preventScroll: true }); return; }
  if (el.classList && el.classList.contains('ok-conf')) { const b = $('[data-acao="confirmar-publicar"]'); if (b) b.disabled = $$('#dialogo .ok-conf').some(c => !c.checked || c.disabled); return; }
  if (el.dataset.tag) { const arr = caminho(A.draft, el.dataset.tag + '.tags'); const s = new Set(Array.isArray(arr) ? arr : []); el.checked ? s.add(el.value) : s.delete(el.value); definir(A.draft, el.dataset.tag + '.tags', [...s]); mudou(); return; }
  if (el.dataset.destaque !== undefined && edicao) { const x = A.draft.lugares[edicao.i]; if (!x.id) x.id = slugUnico(x.nome); const s = new Set(A.draft.destaques || []); el.checked ? s.add(x.id) : s.delete(x.id); A.draft.destaques = [...s]; mudou(); return; }
  if (el.dataset.acao === 'tabela') { A.fb.tabela = el.checked; rerender(); return; }
  if (el.dataset.k === 'casa.instagram') { el.value = caminho(A.draft, 'casa.instagram') || ''; marcarErro(el); }
  if (el.dataset.v === 'whats') confirmarWhats(el);
  if (el.dataset.k === 'config.url_publica' && A.view === 'qr') { rerender(); if (enderecoMudou()) toast('Endereço alterado: lembre de reimprimir os cartões com QR Code depois de publicar.'); }
  if (el.dataset.k && (el.tagName === 'SELECT' || el.dataset.t === 'check')) { if (edicao) pintarEditor(); else if (/\.(icone|destaque)$/.test(el.dataset.k)) rerender(); }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#menu-btn') && $('#menu-btn').getAttribute('aria-expanded') === 'true') { e.preventDefault(); menu(false, true); return; } if (e.key === 'Enter' && e.target.matches('label.btn[for]')) { e.preventDefault(); const i = document.getElementById(e.target.getAttribute('for')); if (i) i.click(); } });
$('#dialogo').addEventListener('cancel', (e) => { if (mostrarConflitos.atual) e.preventDefault(); });
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button, a, label'); if (!b) return;
  const d = b.dataset;
  if (d.verSenha) { const i = document.getElementById(d.verSenha); if (i) { const ver = i.type === 'password'; i.type = ver ? 'text' : 'password'; b.setAttribute('aria-pressed', ver ? 'true' : 'false'); b.setAttribute('aria-label', ver ? 'Esconder a senha' : 'Mostrar a senha'); i.focus(); } return; }
  if (d.acao === 'voltar-senha') { telaSenha(); return; }
  if (d.acao === 'recomecar-cofre') { if (confirm('Apagar o que está guardado neste aparelho (token, dados privados da casa e modelos de mensagem) e informar o token de novo?')) { const nova = telaSenhaAnterior.nova; Cofre.apagar(); A.senhaPendente = nova; A.cofreDados = novoCofre(); telaEntrada(); } return; }
  if (!A.draft) return;
  if (d.copiar === 'link') { const M = dadosMensagem(); if (M.ok) toast(await copiar(M.link) ? 'Link copiado. Mande só para o hóspede.' : 'Não consegui copiar. Toque e segure o link para copiar.', false); return; }
  if (d.copiarMsg) { const M = dadosMensagem(); if (!M.ok) return; toast(await copiar(mensagem(d.copiarMsg, M).texto) ? 'Mensagem copiada. Cole no WhatsApp do hóspede.' : 'Não consegui copiar. Use “Abrir no WhatsApp”.'); return; }
  if (d.wa && b.classList.contains('inativo')) { e.preventDefault(); toast('Preencha o nome e as datas da estadia primeiro.', true); return; }
  if (d.inserir) { const t = document.getElementById(d.alvo); if (t) { const a = t.selectionStart ?? t.value.length, z = t.selectionEnd ?? a, ins = '{' + d.inserir + '}'; t.value = t.value.slice(0, a) + ins + t.value.slice(z); t.focus(); t.setSelectionRange(a + ins.length, a + ins.length); t.dispatchEvent(new Event('input', { bubbles: true })); } return; }
  if (d.salvarModelo) { const t = document.getElementById('mod-' + d.salvarModelo); if (!t || !A.cofreDados) return; A.cofreDados.modelos[d.salvarModelo] = t.value; delete A.modelosEdit[d.salvarModelo]; const ok = await salvarCofre(); toast(ok ? (DEMO ? 'Modelo salvo (na demonstração, só nesta aba).' : 'Modelo salvo neste aparelho, cifrado com a sua senha.') : 'Não consegui salvar o modelo.', !ok); rerender(); return; }
  if (d.restaurarModelo) { if (!A.cofreDados) return; delete A.cofreDados.modelos[d.restaurarModelo]; delete A.modelosEdit[d.restaurarModelo]; await salvarCofre(); toast('Modelo original restaurado.'); rerender(); return; }
  if (d.imprimirCartao) { imprimirCartoes([d.imprimirCartao]); return; }
  if (d.copiarTexto) { const t = document.getElementById(d.copiarTexto); if (t) toast(await copiar(t.value) ? 'Conteúdo copiado.' : 'Não consegui copiar: selecione o texto e copie.'); return; }
  if (b.id === 'menu-btn') { menu(b.getAttribute('aria-expanded') !== 'true'); return; }
  if (d.ir) { e.preventDefault(); A.busca = ''; if ($('#dialogo').open && !mostrarConflitos.atual) $('#dialogo').close(); ir(d.ir); return; }
  if (d.irAchado) { irParaAchado(d.irAchado); return; }
  if (d.irCampo) { irParaAchado(d.irCampo); return; }
  if (d.conflito) { resolverConflito(d.conflito); return; }
  if (d.novoItem) { const arr = Array.isArray(A.draft[d.novoItem]) ? A.draft[d.novoItem] : (A.draft[d.novoItem] = []); arr.unshift(COLECOES[d.novoItem].novo()); A.busca = ''; mudou(); rerender(); abrirEditor(d.novoItem, 0); return; }
  if (d.editar) { abrirEditor(d.editar, +d.i); return; }
  if (d.fecharEditor !== undefined) { $('#editor').close(); return; }
  if (d.fecharDialogo !== undefined) { $('#dialogo').close(); return; }
  if (d.fecharPrevia !== undefined) { setTimeout(() => { if ($('#dialogo').open) $('#dialogo').close(); }, 50); return; }
  if (d.excluirItem !== undefined) { const { nome, i } = edicao; const x = A.draft[nome][i]; if (!confirm(`Excluir “${COLECOES[nome].linha(x).t}”? Dá para desfazer descartando as alterações antes de publicar.`)) return; if (nome === 'lugares') A.draft.destaques = (A.draft.destaques || []).filter(id => id !== x.id); A.draft[nome].splice(i, 1); edicao = null; $('#editor').close(); mudou(); toast('Item excluído do rascunho.'); return; }
  if (d.duplicarItem !== undefined) { const { nome, i } = edicao; const c = clone(A.draft[nome][i]); if (c.id) c.id = nome === 'lugares' ? slugUnico(c.nome + ' copia') : c.id + '-2'; if (c.nome) c.nome += ' (cópia)'; if (c.titulo) c.titulo += ' (cópia)'; if ('status' in c) c.status = 'rascunho'; A.draft[nome].splice(i + 1, 0, c); mudou(); edicao.i = i + 1; pintarEditor(); toast('Item duplicado como rascunho.'); return; }
  if (d.conferir) {
    if (!confirm('Conferi horário, contato e preço deste lugar hoje?\n\nToque em OK só se você confirmou essas informações (por telefone, no local ou no site oficial). O site vai mostrar “Conferido pelo anfitrião” com a data de hoje.')) return;
    definir(A.draft, d.conferir + '.verificado', hoje()); mudou(); pintarEditor(); toast('Marcado como conferido hoje.'); return;
  }
  if (d.moverNota) { const [, i] = d.moverNota.split('.'); if (moverParaNota(+i, d.moverNota.split('.').slice(2).join('.'), d.frase)) { mudou(); pintarEditor(); toast('Trecho movido para a nota interna. Ele não aparece no site.'); const n = $('#editor [data-k$=".nota_interna"]'); if (n) n.scrollIntoView({ block: 'nearest' }); } return; }
  if (d.adicionar) { const arr = caminho(A.draft, d.adicionar); const lista = Array.isArray(arr) ? arr : []; let novo = {}; try { novo = JSON.parse(d.novo); } catch (x) {} lista.push(novo); definir(A.draft, d.adicionar, lista); mudou(); edicao ? pintarEditor() : rerender(); return; }
  if (d.remover) { const arr = caminho(A.draft, d.remover); if (!Array.isArray(arr)) return; arr.splice(+d.i, 1); mudou(); edicao ? pintarEditor() : rerender(); return; }
  if (d.mover) { const arr = caminho(A.draft, d.mover), i = +d.i, j = i + (+d.d); if (!Array.isArray(arr) || j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; mudou(); edicao ? pintarEditor() : rerender(); return; }
  if (d.escolherFoto) { escolherFoto(d.escolherFoto); return; }
  if (d.capa) { const arr = caminho(A.draft, d.capa), i = +d.i; if (!Array.isArray(arr) || !arr[i]) return; arr.unshift(arr.splice(i, 1)[0]); mudou(); edicao ? pintarEditor() : rerender(); toast('Pronto: esta foto agora é a capa.'); const b = $('.galeria-campo .g .foto'); if (b) b.focus(); return; }
  if (d.limparFoto) { definir(A.draft, d.limparFoto, null); mudou(); edicao ? pintarEditor() : rerender(); return; }
  if (d.usarFoto) { usarFoto(d.usarFoto); return; }
  if (d.verFoto) { const u = srcAdmin(d.verFoto); if (u) window.open(u, '_blank', 'noopener'); return; }
  if (d.apagarFoto) {
    if (!confirm('Apagar esta foto do repositório? Isso não pode ser desfeito.')) return;
    try {
      const atual = await baixarConteudo(); // confere também a versão publicada mais recente (pode ter mudado em outro aparelho)
      if (JSON.stringify(atual.obj).includes(d.apagarFoto) || usosDeFotos().has(d.apagarFoto)) { toast('Esta foto está em uso no site publicado ou no rascunho. Tire a foto de lá e publique antes de apagar.', true); A.fotos = null; carregarFotos(); return; }
      await gh(`${repoPath()}/contents/${d.apagarFoto}`, { method: 'DELETE', body: { message: 'Remove foto ' + d.apagarFoto, sha: d.sha, branch: A.cfg.branch } }); toast('Foto apagada.'); A.fotos = null; carregarFotos();
    } catch (x) { toast(x.status === -1 ? x.message : msgErro(x, 'apagar a foto'), true); }
    return;
  }
  if (d.fbPeriodo) { A.fb.periodo = d.fbPeriodo; rerender(); return; }
  if (d.fbSent) { A.fb.sent = d.fbSent; rerender(); return; }
  if (d.filtroTema !== undefined) { A.fb.tema = A.fb.tema === d.filtroTema ? '' : d.filtroTema; rerender(); return; }
  if (d.resolver) { const s = resolvidos(); s.has(d.resolver) ? s.delete(d.resolver) : s.add(d.resolver); ls.set('admin:fb-resolvidos', [...s]); atualizarBarra(); rerender(); return; }
  if (d.publicarFb) { const i = A.fb.itens.find(x => x.id === d.publicarFb); if (!i) return; A.draft.avaliacoes = Array.isArray(A.draft.avaliacoes) ? A.draft.avaliacoes : []; if (A.draft.avaliacoes.some(a => a.texto === i.mensagem)) { toast('Esta avaliação já está na lista.'); return; } A.draft.avaliacoes.unshift({ texto: i.mensagem, autor: (i.nome || '').split(' ')[0], nota: i.nota, periodo: i.data ? new Date(i.data).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '', origem: i.origem === 'exemplo' ? 'Exemplo' : 'Hóspede da casa', autorizada: true }); mudou(); toast('Adicionada às avaliações. Publique para aparecer no site.'); return; }
  switch (d.acao) {
    case 'sair': sair(); break;
    case 'publicar': publicar(); break;
    case 'confirmar-publicar': confirmarPublicar(); break;
    case 'previa': previa(); break;
    case 'recarregar-fotos': A.fotos = null; carregarFotos(); break;
    case 'recarregar-fb': A.fb.itens = null; rerender(); carregarFeedback(); break;
    case 'com-exemplo': A.fb.exemplo = true; A.fb.itens = null; carregarFeedback(); break;
    case 'sem-exemplo': A.fb.exemplo = false; A.fb.itens = null; carregarFeedback(); break;
    case 'importar': importar(); break;
    case 'confirmar-importar': {
      const novos = []; const origem = $('#imp-origem').value.trim().slice(0, 40) || 'Importado', notaG = notaValida($('#imp-nota').value);
      $('#imp-texto').value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean).forEach(t => { const m = t.match(/^(?:nota\s*)?([1-5])\s*[-:–]\s*/i); novos.push({ data: new Date().toISOString(), nota: m ? +m[1] : notaG, mensagem: m ? t.slice(m[0].length) : t, nome: '', origem, publicar: false }); });
      const f = $('#imp-csv').files[0]; if (f) { try { parseCsv(await f.text()).forEach(x => novos.push(x)); } catch (x) { toast('Não consegui ler o CSV: ' + x.message, true); break; } }
      if (!novos.length) { toast('Nada para importar: cole comentários ou escolha um CSV.', true); break; }
      const prep = preparar(novos), semData = prep.filter(x => !x.data).length, semNota = novos.filter(x => tem(x.nota) && notaValida(x.nota) == null).length;
      const guardar = novos.filter(x => tem(x.mensagem)).map(x => ({ data: dataISO(x.data), nota: notaValida(x.nota), mensagem: String(x.mensagem).slice(0, 5000), nome: String(x.nome || '').slice(0, 80), origem: String(x.origem || '').slice(0, 40), publicar: false }));
      ls.set('admin:fb-local', (ls.get('admin:fb-local', []) || []).concat(guardar)); $('#dialogo').close();
      toast(`${guardar.length} comentário(s) importado(s)${semData ? `, ${semData} sem data reconhecida (ficam em “Tudo”)` : ''}${semNota ? `, ${semNota} com nota inválida (ficou sem nota)` : ''}.`, !!(semData || semNota));
      A.fb.itens = null; carregarFeedback(); break;
    }
    case 'limpar-importados': if (confirm('Apagar os comentários importados neste aparelho?')) { ls.del('admin:fb-local'); $('#dialogo').close(); A.fb.itens = null; carregarFeedback(); } break;
    case 'salvar-chave': {
      const k = $('#fb-chave').value.trim(); ss.set('admin:fbchave', k);
      const noCofre = await salvarCofre();
      toast(k ? (noCofre && !DEMO ? 'Chave salva neste aparelho, cifrada com a sua senha.' : 'Chave salva para esta sessão.') + (k.length < 24 ? ' Atenção: use uma chave de 24 caracteres ou mais (o script recusa chaves curtas).' : '') : 'Chave apagada.', k && k.length < 24); A.fb.itens = null; break;
    }
    case 'bloquear': bloquear(); break;
    case 'trocar-token': if (confirm('Esquecer o token guardado e colar um novo? Os dados privados e os modelos continuam guardados.')) { esquecerToken(); A.draft = null; telaEntrada(); } break;
    case 'trocar-senha': trocarSenha(b); break;
    case 'imprimir-kit': { const ids = Object.keys(CARTOES).filter(k => A.imp[k]); if (!ids.length) { toast('Escolha ao menos um cartão.', true); break; } imprimirCartoes(ids); break; }
    case 'imprimir-virada': imprimirVirada(); break;
    case 'nova-virada': if (confirm('Começar uma nova virada? Todos os itens serão desmarcados.')) { const v = virada(); v.marcados = {}; v.inicio = null; salvarVirada(v); rerender(); toast('Nova virada: todos os itens desmarcados.'); } break;
    case 'salvar-virada': { const t = $('#virada-modelo'); if (!t) break; const secs = H.lerChecklist(t.value); if (!secs.length) { toast('O modelo ficou sem itens. Escreva ao menos um item por linha.', true); break; } const v = virada(); v.modelo = t.value; salvarVirada(v); toast('Modelo do checklist salvo neste aparelho.'); rerender(); break; }
    case 'restaurar-virada': if (confirm('Voltar ao checklist original? O seu modelo será substituído.')) { const v = virada(); v.modelo = H.CHECKLIST_PADRAO; salvarVirada(v); rerender(); toast('Checklist original restaurado.'); } break;
    case 'testar-agenda': testarAgenda(b); break;
    case 'testar-feedback': {
      const ep = A.draft.config.feedback_endpoint, k = $('#fb-chave').value.trim();
      if (!tem(ep) || !tem(k)) { toast('Preencha o endereço do Apps Script e a chave de leitura.', true); break; }
      if (!urlValida(ep, true)) { toast('O endereço precisa começar com https://.', true); break; }
      b.disabled = true; try { const itens = await lerFeedbackRemoto(ep, k); toast(`Conectado: ${itens.length} feedback(s) na planilha.`); } catch (x) { toast('Não conectou: ' + (x instanceof TypeError ? 'confira o endereço e a internet.' : x.message), true); } finally { b.disabled = false; }
      break;
    }
    case 'atualizar-formato': atualizarFormato(); break;
    case 'apagar-legado': apagarLegado(); break;
    case 'baixar-backup': { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(A.draft, null, 2)], { type: 'application/json' })); a.download = `guia-backup-${hoje()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); break; }
    case 'descartar': if (!sujo()) { toast('Não há alterações para descartar.'); break; } if (confirm('Descartar todas as alterações não publicadas?')) { A.draft = clone(A.remoto.obj); sanear(A.draft); A.correcoes = []; ls.del('admin:rascunho'); atualizarBarra(); rerender(); toast('Alterações descartadas.'); } break;
    case 'aplicar-json': {
      const msg = $('#json-msg');
      try { const { obj: o, fix } = preparar_(JSON.parse($('#json').value)); A.draft = o; A.correcoes = fix; mudou(); msg.textContent = 'Aplicado ao rascunho.' + (fix.length ? ` ${fix.length} valor(es) em formato inválido ficaram vazios.` : ''); msg.style.color = 'var(--ok)'; toast('JSON aplicado ao rascunho. Publique para valer no site.'); }
      catch (x) { msg.textContent = 'Erro: ' + (x instanceof SyntaxError ? 'JSON com erro de formatação (' + x.message + ')' : x.message); msg.style.color = 'var(--alerta)'; }
      break;
    }
    case 'imprimir-qr': document.body.classList.add('imprimir-qr'); window.print(); setTimeout(() => document.body.classList.remove('imprimir-qr'), 500); break;
    case 'copiar-url': try { await navigator.clipboard.writeText(urlPublica()); toast('Link copiado.'); } catch (x) { toast('Não consegui copiar. O link é: ' + urlPublica(), true); } break;
  }
});
document.addEventListener('error', (e) => { const i = e.target; if (i.tagName === 'IMG' && i.dataset.raw && i.src !== i.dataset.raw) i.src = i.dataset.raw; }, true);
window.addEventListener('beforeunload', (e) => { if (!sujo()) return; salvarRascunho(); e.preventDefault(); e.returnValue = ''; });
document.addEventListener('focusin', (e) => { const b = $('#menu-btn'); if (b && b.getAttribute('aria-expanded') === 'true' && menuCelular() && !e.target.closest('.lado')) menu(false); });
document.addEventListener('pointerdown', (e) => { const b = $('#menu-btn'); if (b && b.getAttribute('aria-expanded') === 'true' && !e.target.closest('.lado')) menu(false); });
window.addEventListener('hashchange', () => { if (A.draft) ir(location.hash.replace('#', '')); });

/* ---------------- troca de senha ---------------- */
/* Migração da senha padrão: o guia ainda publica o hash da senha anterior. Oferece trocar para a nova padrão (ou outra). */
function oferecerSenhaNova() {
  const d = $('#dialogo'); if (!d || d.open) return;
  d.innerHTML = `<div class="ed-cab"><h2 class="t2" id="dlg-titulo">Atualize a senha do painel</h2><button type="button" class="btn btn-sec btn-ic" data-fechar-dialogo aria-label="Fechar">${ic('x')}</button></div>
    <div class="ed-corpo form"><p style="margin:0">Este guia ainda usa a senha padrão anterior. A nova senha padrão do painel é <b>${esc(SENHA_PADRAO)}</b>. Trocando agora, o acesso guardado neste aparelho é trancado de novo com ela e o novo código embaralhado (hash) é publicado em <code>admin/acesso.json</code>.</p>
    <div id="ms-msg"></div>
    <div class="acoes"><button type="button" class="btn btn-prim" id="ms-trocar">${ic('cadeado')}Trocar para ${esc(SENHA_PADRAO)}</button><button type="button" class="btn btn-sec" id="ms-outra">Escolher outra senha</button><button type="button" class="btn btn-fant" data-fechar-dialogo>Depois</button></div></div>`;
  d.setAttribute('aria-labelledby', 'dlg-titulo'); d.showModal();
  $('#ms-outra').addEventListener('click', () => { d.close(); A.migrarSenha = null; ir('config'); setTimeout(() => { const i = $('#ts-atual'); if (i) i.focus(); }, 300); });
  $('#ms-trocar').addEventListener('click', async (e) => {
    const b = e.currentTarget; b.disabled = true; b.textContent = 'Trancando de novo…';
    try { await aplicarSenha(SENHA_PADRAO); A.migrarSenha = null; d.close(); toast('Pronto: a senha do painel agora é ' + SENHA_PADRAO + '.'); }
    catch (x) { $('#ms-msg').innerHTML = `<div class="aviso erro" role="alert">${ic('alerta')}<span>${esc('Não consegui publicar a senha nova: ' + (x.status != null ? msgErro(x) : x.message) + '. Tente de novo em Configurações › Trocar a senha.')}</span></div>`; b.disabled = false; b.textContent = 'Tentar de novo'; }
  });
}
/* Tranca o cofre com a senha nova e publica o hash (mesmo caminho de "Trocar a senha"). */
async function aplicarSenha(nova) {
  const novo = await gerarAcesso(nova);
  await Cofre.criar(nova, A.cofreDados || novoCofre()); ls.set('admin:acesso', Object.assign({}, novo, { trocadaAqui: Date.now() }));
  await publicarAcesso(novo); return novo;
}
async function publicarAcesso(novo) {
  const cam = `${repoPath()}/contents/admin/acesso.json`;
  let sha = null; try { sha = (await gh(`${cam}?ref=${encodeURIComponent(A.cfg.branch)}`)).sha; } catch (e) { if (e.status !== 404) throw e; }
  const corpo = JSON.stringify({ v: novo.v, alg: novo.alg, iter: novo.iter, sal: novo.sal, hash: novo.hash, atualizado_em: novo.atualizado_em, obs: OBS_ACESSO }, null, 2) + '\n';
  await gh(cam, { method: 'PUT', body: Object.assign({ message: 'Atualiza a senha do painel (só o hash)', content: b64.para(corpo), branch: A.cfg.branch }, sha ? { sha } : {}) });
  return corpo;
}
async function trocarSenha(btn) {
  const msg = (m, ok) => { const el = $('#ts-msg'); if (el) el.innerHTML = `<div class="aviso ${ok ? 'ok' : 'erro'}" role="${ok ? 'status' : 'alert'}">${ic(ok ? 'check' : 'alerta')}<span>${esc(m)}</span></div>`; };
  const atual = $('#ts-atual') ? $('#ts-atual').value : '', nova = $('#ts-nova').value, rep = $('#ts-rep').value;
  if (!DEMO && Tentativas.espera()) { msg(`Muitas tentativas. Aguarde ${mmss(Tentativas.espera())}.`); return; }
  if (!DEMO && !atual) { msg('Digite a senha atual.'); $('#ts-atual').focus(); return; }
  if (nova.length < 8) { msg('A nova senha precisa ter pelo menos 8 caracteres.'); $('#ts-nova').focus(); return; }
  if (nova !== rep) { msg('As duas novas senhas não são iguais.'); $('#ts-rep').focus(); return; }
  if (!DEMO && nova === atual) { msg('A nova senha é igual à atual.'); $('#ts-nova').focus(); return; }
  btn.disabled = true; const rot = btn.innerHTML; btn.textContent = 'Conferindo…';
  try {
    if (!DEMO) {
      if (!await conferirSenha(atual, await carregarAcesso())) { const t = Tentativas.falhou(); msg('A senha atual não confere.' + (t.espera ? ` Aguarde ${mmss(t.espera)} para tentar de novo.` : '')); return; }
      Tentativas.zerar();
    }
    btn.textContent = 'Trancando de novo…';
    const novo = await gerarAcesso(nova);
    if (!DEMO) { await Cofre.criar(nova, A.cofreDados || novoCofre()); ls.set('admin:acesso', Object.assign({}, novo, { trocadaAqui: Date.now() })); }
    else A.acessoDemo = novo;
    ['ts-atual', 'ts-nova', 'ts-rep'].forEach(id => { const i = document.getElementById(id); if (i) i.value = ''; });
    btn.textContent = 'Publicando o hash…';
    let corpo = null, falha = null; try { corpo = await publicarAcesso(novo); } catch (e) { falha = e; }
    A.primeiraEntrada = false;
    if (!falha) { msg(DEMO ? 'Senha trocada na demonstração (nada foi publicado).' : 'Senha trocada. Neste aparelho ela já vale. Nos outros, passa a valer em alguns minutos (lá, a senha anterior é pedida uma última vez).', true); toast('Senha trocada.'); return; }
    const json = JSON.stringify({ v: novo.v, alg: novo.alg, iter: novo.iter, sal: novo.sal, hash: novo.hash, atualizado_em: novo.atualizado_em, obs: OBS_ACESSO }, null, 2);
    msg('A senha já vale neste aparelho, mas não consegui gravar o admin/acesso.json no GitHub (' + (falha.status != null ? msgErro(falha) : falha.message) + '). Nos outros aparelhos ela ainda não vale.');
    const d = $('#dialogo'); if (d.open) d.close();
    d.innerHTML = `<div class="ed-cab"><h2 class="t2" id="dlg-titulo">Gravar a senha nova no GitHub</h2><button type="button" class="btn btn-sec btn-ic" data-fechar-dialogo aria-label="Fechar">${ic('x')}</button></div>
      <div class="ed-corpo form"><p style="margin:0">Para a senha nova valer nos outros aparelhos, o arquivo <code>admin/acesso.json</code> do repositório precisa ter o conteúdo abaixo. Ele não contém a senha, só o código embaralhado dela.</p>
      <ol class="passos-token"><li>No GitHub, abra o repositório <b>${esc(A.cfg.owner)}/${esc(A.cfg.repo)}</b> e entre na pasta <b>admin</b>.</li><li>Abra <b>acesso.json</b> e toque no lápis (<span class="en">Edit this file</span>). Se o arquivo não existir, use <span class="en">Add file › Create new file</span> com o nome <b>acesso.json</b>.</li><li>Apague tudo, cole o conteúdo copiado e toque em <span class="en">Commit changes</span>.</li></ol>
      <div class="campo"><label for="acesso-json">Conteúdo de admin/acesso.json</label><textarea class="json" id="acesso-json" readonly style="min-height:220px">${esc(json)}</textarea></div>
      <div class="acoes"><button type="button" class="btn btn-prim" data-copiar-texto="acesso-json">${ic('copiar')}Copiar o conteúdo</button></div></div>`;
    d.setAttribute('aria-labelledby', 'dlg-titulo'); d.showModal();
  } catch (e) { msg('Não consegui trocar a senha: ' + e.message); }
  finally { btn.disabled = false; btn.innerHTML = rot; }
}

/* ---------------- início ---------------- */
(async function iniciar() {
  garantirContrato().catch(() => {}); // carrega o contrato dos dados cedo; carregar() espera por ele de novo
  if (DEMO) { iniciarDemo(); return; }
  if (A.token && tem(A.cfg.owner) && tem(A.cfg.repo) && temChaveSessao() && Cofre.existe()) {
    const d = await Cofre.abrirSessao();
    if (d) { usarCofre(d); if (A.token) { carregar(); return; } }
  }
  ['admin:token', 'admin:token-exp', 'admin:cofre-chave'].forEach(k => ss.del(k)); A.token = null;
  telaSenha();
})();
// Só em testes locais (localhost + ?teste): expõe o estado e funções puras para os testes automatizados.
if (/[?&]teste\b/.test(location.search) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__admin = Object.assign(A, { _t: { deduzirRepo, normalizarWhats, notasEditoriais, problemasLugares, fotosSemDescricao, antesDoHospede, procurarSegredos, sanear, preparar_, escreverConteudo, lerConteudo, blocoCompartilhar, mesclar, dataISO, notaValida, urlValida, linksInvalidos, Cofre, parseCsv, preparar, conferirSenha, gerarAcesso, carregarAcesso, Tentativas, GHD, dadosMensagem, mensagem, Hospede: window.Hospede } });
})();

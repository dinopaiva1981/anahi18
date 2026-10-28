/* Guia do hóspede · seletor de datas no padrão "Airbnb" (site e painel usam o mesmo arquivo).
   - Substitui <input type="date"> por um campo de texto que guarda o valor em AAAA-MM-DD (mesmo contrato de antes):
     quem lê input.value continua recebendo "2026-11-06". Ao escolher no calendário, o campo dispara "input" e "change".
   - Intervalo: dois campos ligados (data-cal="inicio" + data-cal-par="#id-do-fim" e data-cal="fim") abrem o MESMO
     seletor, com cabeçalho "Check-in / Checkout", faixa entre as datas e início/fim em círculo escuro.
   - Dois meses lado a lado no computador, um no celular (pela largura da janela), setas para navegar,
     "Limpar datas" e "Fechar". Teclado: setas mudam o dia, PageUp/PageDown o mês, Home/End a semana,
     Enter/Espaço escolhem, Esc fecha e devolve o foco ao campo.
   - Datas passadas (data-cal-min) e ocupadas (opcoes.ocupado, fim exclusivo) aparecem riscadas e esmaecidas.
   GuiaCalendario.ligar(raiz) procura input[type=date] e input[data-cal] dentro de `raiz` (idempotente). */
(function (raiz) {
'use strict';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const SEM_C = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const RE = /^\d{4}-\d{2}-\d{2}$/;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const valida = (s) => typeof s === 'string' && RE.test(s) && (() => { const d = new Date(s + 'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; })();
const somar = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const somarMes = (iso, n) => { const [a, m] = iso.split('-').map(Number); const d = new Date(Date.UTC(a, m - 1 + n, 1, 12)); return d.toISOString().slice(0, 10); };
const iso = (a, m, d) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const hojeISO = () => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Maceio' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } };
const dow = (s) => new Date(s + 'T12:00:00Z').getUTCDay();
const curta = (s) => { if (!valida(s)) return ''; const [, m, d] = s.split('-').map(Number); return `${SEM_C[dow(s)]}, ${d} de ${MES_C[m - 1]}`; };
const longa = (s) => { const [a, m, d] = s.split('-').map(Number); return `${SEMANA[dow(s)]}, ${d} de ${MESES[m - 1]} de ${a}`; };
const noites = (a, b) => Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 864e5);
const SETA_E = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>';
const SETA_D = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
const IC_CAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';

/* Um mês em grade (tabela). est(dia) → { passado, ocupado, ini, fim, meio, hoje, foco } */
function mesHtml(a, m, est) {
  const primeiro = new Date(Date.UTC(a, m, 1, 12)).getUTCDay(), n = new Date(Date.UTC(a, m + 1, 0, 12)).getUTCDate();
  const cel = [];
  for (let i = 0; i < primeiro; i++) cel.push('<td class="cal-vazio" aria-hidden="true"></td>');
  for (let d = 1; d <= n; d++) {
    const dia = iso(a, m, d), e = est(dia), bloq = e.passado || e.ocupado;
    const cls = ['cal-d', e.passado && 'cal-passado', e.ocupado && 'cal-ocupado', e.ini && 'cal-ini', e.fim && 'cal-fim', e.meio && 'cal-meio', e.hoje && 'cal-hoje', (e.ini && e.temFim) && 'cal-com-fim'].filter(Boolean).join(' ');
    const rot = longa(dia) + (e.ini ? (e.unico ? ', selecionado' : ', check-in') : e.fim ? ', checkout' : '') + (e.ocupado ? ', indisponível' : e.passado ? ', data passada' : '') + (e.hoje ? ' (hoje)' : '');
    cel.push(`<td class="${cls}"><button type="button" class="cal-b" data-cal-dia="${dia}" tabindex="${e.foco ? 0 : -1}" aria-label="${esc(rot)}"${e.ini || e.fim ? ' aria-pressed="true"' : ''}${bloq ? ' aria-disabled="true"' : ''}${e.hoje ? ' aria-current="date"' : ''}>${d}</button></td>`);
  }
  while (cel.length % 7) cel.push('<td class="cal-vazio" aria-hidden="true"></td>');
  const linhas = []; for (let i = 0; i < cel.length; i += 7) linhas.push('<tr>' + cel.slice(i, i + 7).join('') + '</tr>');
  return `<table class="cal-mes" role="grid"><caption>${MESES[m]} ${a}</caption><thead><tr>${INICIAIS.map((l, i) => `<th scope="col" abbr="${SEMANA[i]}"><span aria-hidden="true">${l}</span><span class="cal-sr">${SEMANA[i]}</span></th>`).join('')}</tr></thead><tbody>${linhas.join('')}</tbody></table>`;
}

let ABERTO = null; // um seletor por vez
const doisMeses = () => (typeof matchMedia === 'function' ? matchMedia('(min-width: 760px)').matches : true);

function definir(inp, v) {
  if (!inp || inp.value === v) return;
  inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
}
function parDe(inp) {
  const modo = inp.getAttribute('data-cal');
  if (modo === 'inicio') { const f = document.querySelector(inp.getAttribute('data-cal-par')); return { ini: inp, fim: f || null }; }
  if (modo === 'fim') { const i = document.querySelector(`[data-cal="inicio"][data-cal-par="#${CSS.escape(inp.id)}"]`); return { ini: i || null, fim: inp }; }
  return { ini: inp, fim: null };
}

function abrir(inp, op) {
  fechar(false);
  op = op || {};
  const par = parDe(inp), intervalo = !!(par.ini && par.fim);
  const hoje = hojeISO();
  const min = valida(inp.getAttribute('data-cal-min')) ? inp.getAttribute('data-cal-min') : (intervalo && par.ini.getAttribute('data-cal-min')) || '';
  const ocupado = (inp.__calOcupado || []).filter(p => Array.isArray(p) && valida(p[0]) && valida(p[1]));
  const S = {
    inp, par, intervalo, min, hoje, ocupado,
    ini: valida(par.ini && par.ini.value) ? par.ini.value : '',
    fim: intervalo && valida(par.fim.value) ? par.fim.value : '',
    alvo: intervalo && inp === par.fim && valida(par.ini.value) ? 'fim' : 'ini'
  };
  S.foco = (S.alvo === 'fim' && S.fim) || S.ini || (min && min > hoje ? min : hoje);
  S.mes = S.foco.slice(0, 8) + '01';
  const caixa = document.createElement('div');
  caixa.className = 'cal-pop' + (intervalo ? ' cal-intervalo' : '');
  caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'false');
  const rotulo = inp.getAttribute('data-cal-titulo') || (document.querySelector(`label[for="${CSS.escape(inp.id)}"]`) || {}).textContent || 'Escolher data';
  caixa.setAttribute('aria-label', intervalo ? 'Escolher as datas de check-in e checkout' : String(rotulo).trim());
  S.caixa = caixa;
  const ancora = (inp.closest('.cal-campo-par') || inp.closest('.cal-campo') || inp.parentNode);
  ancora.appendChild(caixa);
  ABERTO = S;
  desenhar(S, true);
  posicionar(S);
  [par.ini, par.fim].forEach(x => x && x.setAttribute('aria-expanded', 'true'));
}
function posicionar(S) {
  const c = S.caixa; if (getComputedStyle(c).position === 'fixed') return;
  try { c.scrollIntoView({ block: 'nearest', behavior: 'instant' }); } catch (e) { c.scrollIntoView(false); }
}
function estado(S, dia) {
  const passado = (S.min && dia < S.min) || false;
  const ocupado = S.ocupado.some(p => p[0] <= dia && dia < p[1]);
  const ini = dia === S.ini, fim = S.intervalo && dia === S.fim;
  return { passado, ocupado, ini, fim, unico: !S.intervalo, temFim: !!S.fim, meio: S.intervalo && S.ini && S.fim && dia > S.ini && dia < S.fim, hoje: dia === S.hoje, foco: dia === S.foco };
}
function cabecalho(S) {
  if (!S.intervalo) {
    const t = S.inp.getAttribute('data-cal-titulo') || 'Escolha a data';
    return `<div class="cal-cab"><div class="cal-cab-txt"><strong>${esc(t)}</strong><span>${S.ini ? esc(longa(S.ini)) : 'Nenhuma data escolhida'}</span></div></div>`;
  }
  const n = S.ini && S.fim ? noites(S.ini, S.fim) : 0;
  const tit = n ? `${n} ${n === 1 ? 'noite' : 'noites'}` : S.ini ? 'Escolha o checkout' : 'Escolha o check-in';
  const sub = S.ini && S.fim ? `${curta(S.ini)} – ${curta(S.fim)}` : 'Toque no dia de chegada e depois no de saída';
  const ri = S.par.ini.getAttribute('data-cal-rot') || 'Check-in', rf = S.par.fim.getAttribute('data-cal-rot') || 'Checkout';
  return `<div class="cal-cab"><div class="cal-cab-txt"><strong aria-live="polite">${esc(tit)}</strong><span>${esc(sub)}</span></div>
    <div class="cal-cab-datas"><button type="button" class="cal-cd${S.alvo === 'ini' ? ' ativo' : ''}" data-cal-alvo="ini"><small>${esc(ri)}</small><b>${S.ini ? esc(curta(S.ini)) : 'Adicionar data'}</b></button><button type="button" class="cal-cd${S.alvo === 'fim' ? ' ativo' : ''}" data-cal-alvo="fim"><small>${esc(rf)}</small><b>${S.fim ? esc(curta(S.fim)) : 'Adicionar data'}</b></button></div></div>`;
}
function desenhar(S, focar) {
  const dois = doisMeses();
  const m0 = S.mes, m1 = somarMes(m0, 1);
  const [a0, mm0] = m0.split('-').map(Number), [a1, mm1] = m1.split('-').map(Number);
  const est = (d) => estado(S, d);
  const podeVoltar = !S.min || somarMes(m0, -1) >= S.min.slice(0, 8) + '01';
  S.caixa.innerHTML = `${cabecalho(S)}
    <div class="cal-corpo">
      <button type="button" class="cal-seta cal-ant" data-cal-nav="-1" aria-label="Mês anterior" ${podeVoltar ? '' : 'disabled'}>${SETA_E}</button>
      <button type="button" class="cal-seta cal-prox" data-cal-nav="1" aria-label="Próximo mês">${SETA_D}</button>
      <div class="cal-meses${dois ? ' cal-dois' : ''}">${mesHtml(a0, mm0 - 1, est)}${dois ? mesHtml(a1, mm1 - 1, est) : ''}</div>
      <span class="cal-sr" aria-live="polite">${MESES[mm0 - 1]} de ${a0}${dois ? ' e ' + MESES[mm1 - 1] + ' de ' + a1 : ''}</span>
    </div>
    <div class="cal-rodape"><button type="button" class="cal-limpar" data-cal-limpar ${S.ini || S.fim ? '' : 'disabled'}>${S.intervalo ? 'Limpar datas' : 'Limpar data'}</button><button type="button" class="cal-fechar" data-cal-fechar>Fechar</button></div>`;
  if (focar) { const b = S.caixa.querySelector(`[data-cal-dia="${S.foco}"]`); if (b) b.focus({ preventScroll: true }); }
}
function fechar(devolver) {
  const S = ABERTO; if (!S) return;
  ABERTO = null; S.caixa.remove();
  [S.par.ini, S.par.fim].forEach(x => x && x.setAttribute('aria-expanded', 'false'));
  if (devolver !== false) { try { S.inp.focus({ preventScroll: true }); } catch (e) {} }
}
function escolher(S, dia) {
  const e = estado(S, dia); if (e.passado || (e.ocupado && !(S.intervalo && S.alvo === 'fim'))) return;
  S.foco = dia;
  if (!S.intervalo) { S.ini = dia; definir(S.par.ini, dia); desenhar(S); fechar(); return; }
  if (S.alvo === 'ini' || !S.ini || dia <= S.ini) {
    S.ini = dia; definir(S.par.ini, dia);
    if (S.fim && S.fim <= dia) { S.fim = ''; definir(S.par.fim, ''); }
    S.alvo = 'fim'; desenhar(S, true); return;
  }
  // checkout: não atravessa um período ocupado
  if (S.ocupado.some(p => p[0] >= S.ini && p[0] < dia)) return;
  S.fim = dia; definir(S.par.fim, dia); desenhar(S, true);
}
function mover(S, n, porMes) {
  const novo = porMes ? (() => { const d = somarMes(S.foco, n); const [a, m] = d.split('-').map(Number); const ult = new Date(Date.UTC(a, m, 0, 12)).getUTCDate(); return iso(a, m - 1, Math.min(+S.foco.slice(8), ult)); })() : somar(S.foco, n);
  S.foco = novo;
  const vis0 = S.mes, vis1 = doisMeses() ? somarMes(vis0, 1) : vis0;
  if (novo.slice(0, 8) + '01' < vis0) S.mes = novo.slice(0, 8) + '01';
  else if (novo.slice(0, 8) + '01' > vis1) S.mes = somarMes(novo.slice(0, 8) + '01', doisMeses() ? -1 : 0);
  desenhar(S, true);
}

document.addEventListener('click', (ev) => {
  const t = ev.target;
  const gat = t.closest && t.closest('[data-cal-abrir]');
  if (gat) { ev.preventDefault(); const inp = document.getElementById(gat.getAttribute('data-cal-abrir')); if (inp) { if (ABERTO && ABERTO.inp === inp) fechar(); else abrir(inp); } return; }
  const S = ABERTO; if (!S) return;
  if (!S.caixa.contains(t)) { if (!(t.closest && (t.closest('.cal-campo') === (S.inp.closest('.cal-campo'))))) fechar(false); return; }
  const d = t.closest('[data-cal-dia]'); if (d) { escolher(S, d.getAttribute('data-cal-dia')); return; }
  const nv = t.closest('[data-cal-nav]'); if (nv && !nv.disabled) { S.mes = somarMes(S.mes, +nv.getAttribute('data-cal-nav')); S.foco = S.mes; desenhar(S); return; }
  const al = t.closest('[data-cal-alvo]'); if (al) { S.alvo = al.getAttribute('data-cal-alvo'); if (S.alvo === 'fim' && !S.ini) S.alvo = 'ini'; desenhar(S); return; }
  if (t.closest('[data-cal-limpar]')) { S.ini = ''; S.fim = ''; S.alvo = 'ini'; definir(S.par.ini, ''); if (S.par.fim) definir(S.par.fim, ''); desenhar(S); const b = S.caixa.querySelector('[data-cal-dia]'); if (b) b.focus(); return; }
  if (t.closest('[data-cal-fechar]')) { fechar(); }
});
document.addEventListener('keydown', (ev) => {
  const S = ABERTO;
  if (!S) {
    const inp = ev.target && ev.target.closest && ev.target.closest('input.cal-input');
    if (inp && ev.key === 'ArrowDown' && (ev.altKey || !inp.value)) { ev.preventDefault(); abrir(inp); }
    return;
  }
  if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); fechar(); return; }
  if (!S.caixa.contains(ev.target)) return;
  const d = ev.target.closest('[data-cal-dia]'); if (!d) { if (ev.key === 'Tab') return; return; }
  const k = ev.key, mapa = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  if (k in mapa) { ev.preventDefault(); S.foco = d.getAttribute('data-cal-dia'); mover(S, mapa[k]); }
  else if (k === 'PageUp' || k === 'PageDown') { ev.preventDefault(); S.foco = d.getAttribute('data-cal-dia'); mover(S, k === 'PageUp' ? -1 : 1, true); }
  else if (k === 'Home' || k === 'End') { ev.preventDefault(); const f = d.getAttribute('data-cal-dia'); S.foco = f; mover(S, k === 'Home' ? -dow(f) : 6 - dow(f)); }
  else if (k === 'Enter' || k === ' ') { ev.preventDefault(); escolher(S, d.getAttribute('data-cal-dia')); }
}, true);
if (typeof addEventListener === 'function') addEventListener('resize', () => { if (ABERTO) desenhar(ABERTO); });

/* Mostra a data por extenso sobre o campo (o valor continua AAAA-MM-DD). */
function atualizarFmt(inp) {
  const f = inp.parentNode && inp.parentNode.querySelector(':scope > .cal-fmt'); if (!f) return;
  const v = inp.value; f.textContent = valida(v) ? curta(v) + ' de ' + v.slice(0, 4) : '';
  inp.classList.toggle('cal-tem', valida(v));
}
function ligar(r) {
  r = r || document;
  r.querySelectorAll('input[type="date"], input[data-cal]').forEach((inp) => {
    if (inp.__cal) return; inp.__cal = true;
    if (!inp.id) inp.id = 'cal-' + Math.random().toString(36).slice(2, 8);
    if (!inp.hasAttribute('data-cal')) inp.setAttribute('data-cal', 'unico');
    const min = inp.getAttribute('min'); if (min && !inp.hasAttribute('data-cal-min')) inp.setAttribute('data-cal-min', min);
    inp.type = 'text'; inp.removeAttribute('min'); inp.removeAttribute('max');
    inp.classList.add('cal-input');
    inp.setAttribute('inputmode', 'numeric'); inp.setAttribute('autocomplete', 'off'); inp.setAttribute('spellcheck', 'false');
    inp.setAttribute('pattern', '\\d{4}-\\d{2}-\\d{2}'); if (!inp.placeholder) inp.placeholder = 'AAAA-MM-DD';
    inp.setAttribute('aria-haspopup', 'dialog'); inp.setAttribute('aria-expanded', 'false');
    const w = document.createElement('span'); w.className = 'cal-campo';
    inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    w.insertAdjacentHTML('beforeend', `<span class="cal-fmt" aria-hidden="true"></span><button type="button" class="cal-abrir" data-cal-abrir="${esc(inp.id)}" aria-label="Abrir o calendário">${IC_CAL}</button>`);
    const d = document.getElementById(inp.id + '-e') || null; if (d) inp.setAttribute('aria-describedby', (inp.getAttribute('aria-describedby') || '').replace(d.id, '').trim() + ' ' + d.id);
    inp.addEventListener('input', () => atualizarFmt(inp));
    inp.addEventListener('click', () => { if (!ABERTO || ABERTO.inp !== inp) abrir(inp); });
    atualizarFmt(inp);
  });
  // pares de intervalo lado a lado: o seletor se ancora no grupo, não num campo só
  r.querySelectorAll('input[data-cal="inicio"]').forEach((i) => {
    const f = document.querySelector(i.getAttribute('data-cal-par')); if (!f) return;
    const g = i.closest('.campos, .cal-grupo, form, section'); const grupo = i.closest('.cal-campo-par') || (g && g.classList.contains('cal-campo-par') ? g : null);
    if (!grupo) { const pai = commonParent(i, f); if (pai) pai.classList.add('cal-campo-par'); }
  });
}
function commonParent(a, b) { let p = a.parentNode; while (p && !p.contains(b)) p = p.parentNode; return p && p.nodeType === 1 ? p : null; }
/* Ocupados (fim exclusivo) para um campo: aparecem riscados e não podem ser escolhidos. */
function ocupados(inp, lista) { if (inp) inp.__calOcupado = Array.isArray(lista) ? lista : []; }

const API = { ligar, abrir, fechar, ocupados, mesHtml, valida, curta, longa, somar, noites, aberto: () => ABERTO };
raiz.GuiaCalendario = API;
if (typeof document !== 'undefined') {
  const auto = () => ligar(document);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
  if (typeof MutationObserver === 'function') new MutationObserver((ms) => { if (ms.some(m => m.addedNodes.length)) auto(); }).observe(document.documentElement, { childList: true, subtree: true });
}
})(typeof self !== 'undefined' ? self : this);

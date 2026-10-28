/* Guia do hóspede · agenda de disponibilidade (espelho do calendário do Airbnb).
   Usado pelo site (assets/site.js) e pelo painel (admin/admin.js) para desenhar o MESMO calendário.
   Os dados vêm do Apps Script: GET <config.feedback_endpoint>?acao=agenda →
     { ok:true, ocupado:[["AAAA-MM-DD","AAAA-MM-DD"],…], de, ate, atualizado, parcial }
   O fim de cada período é EXCLUSIVO: o dia da saída fica livre para uma nova entrada.
   O link do iCal nunca passa por aqui: ele fica só nas Propriedades do script (ICAL_URL).
   - validar(json) devolve os dados limpos ou null (nunca lança exceção).
   - montar(elemento, dados, opcoes) desenha o calendário com navegação entre meses. */
(function (raiz) {
'use strict';
const RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PERIODOS = 1500;
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const INICIAIS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dataOk = (s) => typeof s === 'string' && RE.test(s) && (() => { const d = new Date(s + 'T12:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === s; })();
const somar = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const hojeEm = (tz) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'America/Maceio' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } };
const iso = (a, m, d) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function validar(j) {
  try {
    if (!j || typeof j !== 'object' || j.ok !== true || !Array.isArray(j.ocupado)) return null;
    const hoje = hojeEm();
    const de = dataOk(j.de) ? j.de : hoje;
    const ate = dataOk(j.ate) && j.ate > de ? j.ate : somar(de, 400);
    const ocupado = j.ocupado.slice(0, MAX_PERIODOS)
      .filter(p => Array.isArray(p) && dataOk(p[0]) && dataOk(p[1]) && p[1] > p[0])
      .map(p => [p[0], p[1]]).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    const t = Date.parse(j.atualizado);
    return { ocupado, de, ate, atualizado: isFinite(t) ? t : null, parcial: j.parcial === true };
  } catch (e) { return null; }
}
const ocupadoEm = (dados, dia) => dados.ocupado.some(p => p[0] <= dia && dia < p[1]);
/* estado de um dia: passado (antes de hoje), semdados (além do que o calendário informa), ocupado ou livre */
function estado(dados, dia, hoje) {
  if (dia < hoje) return 'passado';
  if (dia >= dados.ate) return 'semdados';
  return ocupadoEm(dados, dia) ? 'ocupado' : 'livre';
}
/* Primeira data livre a partir de hoje e quantas noites seguidas ela comporta (até 30). */
function proximaLivre(dados, hoje) {
  let d = hoje > dados.de ? hoje : dados.de;
  for (let i = 0; i < 400 && d < dados.ate; i++, d = somar(d, 1)) {
    if (!ocupadoEm(dados, d)) {
      let n = 0, x = d; while (n < 30 && x < dados.ate && !ocupadoEm(dados, x)) { n++; x = somar(x, 1); }
      return { dia: d, noites: n, ate30: n >= 30 };
    }
  }
  return null;
}
const nomeMes = (a, m) => `${MESES[m]} de ${a}`;
const diaLongo = (dia) => { const [a, m, d] = dia.split('-').map(Number); const w = new Date(Date.UTC(a, m - 1, d, 12)).getUTCDay(); return `${SEMANA[w]}, ${d} de ${MESES[m - 1]}`; };
const ROTULO = { livre: 'disponível', ocupado: 'ocupado', passado: 'data passada', semdados: 'sem informação' };

function mesHtml(dados, a, m, hoje) {
  const primeiro = new Date(Date.UTC(a, m, 1, 12)).getUTCDay();
  const nDias = new Date(Date.UTC(a, m + 1, 0, 12)).getUTCDate();
  const cel = [];
  for (let i = 0; i < primeiro; i++) cel.push('<td class="ag-vazio" aria-hidden="true"></td>');
  for (let d = 1; d <= nDias; d++) {
    const dia = iso(a, m, d), e = estado(dados, dia, hoje), h = dia === hoje;
    cel.push(`<td class="ag-d ag-${e}${h ? ' ag-hoje' : ''}" data-dia="${dia}"${h ? ' aria-current="date"' : ''}><span class="ag-n" aria-hidden="true">${d}</span><span class="sr-only">${esc(diaLongo(dia))}: ${ROTULO[e]}${h ? ' (hoje)' : ''}</span></td>`);
  }
  while (cel.length % 7) cel.push('<td class="ag-vazio" aria-hidden="true"></td>');
  const linhas = []; for (let i = 0; i < cel.length; i += 7) linhas.push('<tr>' + cel.slice(i, i + 7).join('') + '</tr>');
  return `<table class="ag-mes"><caption>${esc(nomeMes(a, m))}</caption>
    <thead><tr>${INICIAIS.map((l, i) => `<th scope="col"><span aria-hidden="true">${l}</span><span class="sr-only">${SEMANA[i]}</span></th>`).join('')}</tr></thead>
    <tbody>${linhas.join('')}</tbody></table>`;
}
const LEGENDA = '<ul class="ag-leg" aria-label="Legenda"><li><i class="ag-amostra ag-livre" aria-hidden="true"></i>Disponível</li><li><i class="ag-amostra ag-ocupado" aria-hidden="true"></i>Ocupado</li><li><i class="ag-amostra ag-hoje-amostra" aria-hidden="true"></i>Hoje</li></ul>';

/* Desenha em `el` (o container) os meses a partir do mês atual, com Anterior/Próximo.
   No celular a folha de estilo mostra 1 mês; a partir de ~560 px de largura do container, 2. */
function montar(el, dados, op) {
  op = op || {};
  const hoje = op.hoje || hojeEm(op.tz);
  const [ha, hm] = hoje.split('-').map(Number);
  const fim = somar(dados.ate, -1); const [fa, fm] = fim.split('-').map(Number);
  const maxPasso = Math.max(0, Math.min(12, (fa - ha) * 12 + (fm - hm)));
  let passo = 0;
  const id = op.id || ('ag' + Math.random().toString(36).slice(2, 7));
  function desenhar(foco) {
    const m0 = hm - 1 + passo, a0 = ha + Math.floor(m0 / 12), mm0 = ((m0 % 12) + 12) % 12;
    const m1 = m0 + 1, a1 = ha + Math.floor(m1 / 12), mm1 = ((m1 % 12) + 12) % 12;
    el.innerHTML = `<div class="ag-nav"><button type="button" class="ag-btn" data-ag-nav="-1" aria-label="Mês anterior" aria-controls="${id}" ${passo <= 0 ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>
      <span class="sr-only" aria-live="polite">${esc(nomeMes(a0, mm0))}</span>
      <button type="button" class="ag-btn" data-ag-nav="1" aria-label="Próximo mês" aria-controls="${id}" ${passo >= maxPasso ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button></div>
      <div class="ag-meses" id="${id}">${mesHtml(dados, a0, mm0, hoje)}${mesHtml(dados, a1, mm1, hoje)}</div>${op.legenda === false ? '' : LEGENDA}`;
    if (foco) { const b = el.querySelector(`[data-ag-nav="${foco}"]`); if (b && !b.disabled) b.focus(); else { const o = el.querySelector('.ag-btn:not([disabled])'); if (o) o.focus(); } }
  }
  if (!el.__agenda) el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ag-nav]'); if (!b || !el.contains(b) || b.disabled) return;
    const d = +b.getAttribute('data-ag-nav'); const st = el.__agenda; st.passo = Math.max(0, Math.min(st.max, st.passo + d)); st.desenhar(String(d));
  });
  el.__agenda = { get passo() { return passo; }, set passo(v) { passo = v; }, max: maxPasso, desenhar };
  desenhar();
  return el.__agenda;
}

const API = { validar, estado, proximaLivre, montar, mesHtml, somar, diaLongo, dataOk, hojeEm };
if (typeof module === 'object' && module.exports) module.exports = API;
else raiz.GuiaAgenda = API;
})(typeof self !== 'undefined' ? self : this);

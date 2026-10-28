/**
 * Receptor de feedback do Guia do hóspede · Casa 18 Anahi (Google Apps Script + Planilha).
 *
 * O site envia cada feedback para cá (POST). O painel do anfitrião lê a lista também por POST,
 * mandando a chave secreta no corpo da requisição (nunca na URL). Os dados ficam numa planilha
 * do seu Google Drive, que continua privada.
 *
 * COMO INSTALAR (5 minutos)
 * 1. Crie uma Planilha Google vazia. Menu Extensões → Apps Script.
 * 2. Apague o código de exemplo e cole este arquivo inteiro. Salve.
 * 3. Em Configurações do projeto (ícone de engrenagem) → Propriedades do script, adicione:
 *    - CHAVE_LEITURA: uma senha longa, com 24 caracteres ou mais (o script recusa chaves menores).
 *    - EMAIL_ALERTA (opcional): seu e-mail. Você recebe um aviso quando chegar nota 1 ou 2.
 *    - DIAS_GUARDA (opcional): por quantos dias guardar os comentários. Padrão: 730 (2 anos).
 * 4. Implantar → Nova implantação → tipo "App da Web".
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa. Implantar e autorizar.
 * 5. Copie o endereço que termina em /exec.
 *    No painel do anfitrião → Configurações: cole o endereço e a CHAVE_LEITURA. Publique.
 * 6. (Opcional, recomendado) Para apagar sozinho o que passou do prazo de guarda: no editor, escolha a
 *    função instalarLimpezaMensal e toque em Executar uma vez (autorize). Ela cria um gatilho mensal
 *    que roda a função limpezaMensal (se você já tinha rodado antes, rode de novo: o gatilho antigo é trocado).
 * 7. (Opcional) Agenda de disponibilidade no site: crie também a propriedade ICAL_URL (veja o bloco
 *    "Agenda de disponibilidade" mais abaixo) e reimplante como nova versão.
 * Ao atualizar este código: Implantar → Gerenciar implantações → editar → Nova versão.
 *
 * Proteções
 * - Corpo maior que 8 KB é recusado antes de ser lido.
 * - Limite por hora (janela fixa, não renovada a cada envio, no CacheService) e teto diário de verdade
 *   (contador do dia de Maceió no PropertiesService, que não expira em 6 h como o cache).
 * - Mensagens repetidas nas últimas 6 h são descartadas (6 h é o máximo do CacheService).
 * - Campo-armadilha "site": robôs que o preenchem são recusados.
 * - Temas só da lista do formulário; textos que começam com = + - @ não viram fórmula.
 * - Nota ausente ou inválida fica vazia (não vira 1 estrela).
 *
 * Privacidade (LGPD): só gravamos o que o hóspede escreveu. Nada de IP ou navegador.
 * Os comentários são apagados depois do prazo de guarda (DIAS_GUARDA), se o gatilho mensal estiver instalado.
 */

const ABA = 'Feedback';
const CABECALHO = ['data', 'nota', 'temas', 'mensagem', 'nome', 'publicar', 'origem', 'data_local'];
const FUSO = 'America/Maceio';
const MAX_CORPO = 8000;
const MAX_MENSAGEM = 2000;
const MAX_NOME = 60;
const LIMITE_HORA = 40;   // bem acima do uso de uma casa
const LIMITE_DIA = 150;
const LIMITE_ALERTAS_DIA = 20; // cota do Gmail: 100 e-mails/dia
const MIN_CHAVE = 24;
const MAX_LISTA = 500;
const TEMAS_FB = ['Limpeza', 'Conforto', 'Cozinha', 'Internet', 'Comunicação', 'Localização', 'Passeios', 'Outro'];

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA);
  if (!sh) { sh = ss.insertSheet(ABA); sh.appendRow(CABECALHO); sh.setFrozenRows(1); }
  else completarCabecalho_(sh);
  return sh;
}
// Planilhas criadas por versões antigas não têm as colunas novas no cabeçalho (ex.: data_local).
// Se a 1ª linha é o nosso cabeçalho, escreve só os nomes que faltam no fim, sem mexer no resto.
function completarCabecalho_(sh) {
  const n = sh.getLastColumn();
  if (!n) return;
  const cab = sh.getRange(1, 1, 1, Math.max(n, CABECALHO.length)).getValues()[0].map(function (v) { return String(v == null ? '' : v).trim(); });
  if (cab[0] !== CABECALHO[0]) return; // não é o nosso cabeçalho: não arrisca
  for (let i = 1; i < CABECALHO.length; i++) {
    if (cab[i] === '' && cab.indexOf(CABECALHO[i]) < 0) sh.getRange(1, i + 1).setValue(CABECALHO[i]);
  }
}

// Impede que textos iniciados por = + - @ (ou tab/retorno) virem fórmulas na planilha.
function celula_(t) { t = String(t == null ? '' : t); return /^[=+\-@\t\r]/.test(t) ? "'" + t : t; }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function hash_(t) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t), Utilities.Charset.UTF_8);
  return b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('').slice(0, 32);
}

function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }

function doPost(e) {
  const corpo = (e && e.postData && e.postData.contents) || '{}';
  if (String(corpo).length > MAX_CORPO) return json_({ ok: false, erro: 'grande demais' });
  let d;
  try { d = JSON.parse(corpo); }
  catch (err) { return json_({ ok: false, erro: 'formato inválido' }); }
  if (!d || typeof d !== 'object') return json_({ ok: false, erro: 'formato inválido' });
  if (d.acao === 'listar') return listar_(d);
  if (d.acao === 'agenda') return json_(agenda_());
  return receber_(d);
}

function receber_(d) {
  if (d.site) return json_({ ok: false, erro: 'recusado' }); // armadilha anti-robô do formulário
  const msg = String(d.mensagem || '').trim().slice(0, MAX_MENSAGEM);
  if (msg.length < 10) return json_({ ok: false, erro: 'mensagem curta' });
  const n = parseInt(d.nota, 10); const nota = n >= 1 && n <= 5 ? n : '';
  const temas = (Array.isArray(d.temas) ? d.temas : [])
    .map(function (t) { return String(t).slice(0, 30); })
    .filter(function (t, i, a) { return TEMAS_FB.indexOf(t) >= 0 && a.indexOf(t) === i; }).join(', ');
  const nome = String(d.nome || '').trim().slice(0, MAX_NOME);

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(8000)) return json_({ ok: false, erro: 'ocupado' });
  let alertar = false;
  try {
    // Contadores lidos e gravados dentro do lock: envios simultâneos não furam o limite.
    const cache = CacheService.getScriptCache(), props = PropertiesService.getScriptProperties();
    const agora = new Date(), iso = agora.toISOString();
    const dia = Utilities.formatDate(agora, FUSO, 'yyyy-MM-dd');
    const kHora = 'envios:' + iso.slice(0, 13);
    const nHora = Number(cache.get(kHora) || 0);
    let cont = {}; try { cont = JSON.parse(props.getProperty('CONTADOR_DIA') || '{}') || {}; } catch (err) { cont = {}; }
    if (cont.dia !== dia) cont = { dia: dia, n: 0, alertas: 0 };
    if (nHora >= LIMITE_HORA || cont.n >= LIMITE_DIA) return json_({ ok: false, erro: 'limite' });
    const kMsg = 'msg:' + hash_(msg.toLowerCase().replace(/\s+/g, ' '));
    if (cache.get(kMsg)) return json_({ ok: false, erro: 'repetido' });
    aba_().appendRow(["'" + iso, nota, celula_(temas), celula_(msg), celula_(nome), d.publicar === true ? 'sim' : 'não', 'site',
      "'" + Utilities.formatDate(agora, FUSO, 'dd/MM/yyyy HH:mm')]);
    cache.put(kHora, String(nHora + 1), 3700);   // janela fixa: a chave muda a cada hora
    cache.put(kMsg, '1', 21600);                 // 6 h (máximo do CacheService)
    cont.n += 1;
    alertar = nota !== '' && nota <= 2 && !!prop_('EMAIL_ALERTA') && (cont.alertas || 0) < LIMITE_ALERTAS_DIA;
    if (alertar) cont.alertas = (cont.alertas || 0) + 1;
    props.setProperty('CONTADOR_DIA', JSON.stringify(cont));
  } catch (err) {
    return json_({ ok: false, erro: 'falha ao gravar' });
  } finally { lock.releaseLock(); }
  if (alertar) avisar_(nota, msg, nome);
  return json_({ ok: true });
}

// Alerta opcional ao anfitrião (só para ele, no e-mail de EMAIL_ALERTA). Falha no e-mail não perde o feedback.
function avisar_(nota, msg, nome) {
  const para = prop_('EMAIL_ALERTA');
  if (!para || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) return;
  try {
    MailApp.sendEmail({
      to: para,
      subject: 'Casa 18 Anahi: chegou um feedback com nota ' + nota,
      body: 'Um hóspede deu nota ' + nota + ' de 5' + (nome ? ' (' + nome + ')' : '') + ':\n\n' + msg +
        '\n\nVeja e responda pelo painel do anfitrião, em Feedback. Este aviso é automático.'
    });
  } catch (err) { /* cota ou permissão: o feedback já está gravado */ }
}

function listar_(d) {
  const chave = prop_('CHAVE_LEITURA');
  if (!chave || typeof d.chave !== 'string' || d.chave !== chave) return json_({ ok: false, erro: 'não autorizado' });
  if (String(chave).length < MIN_CHAVE) return json_({ ok: false, erro: 'chave curta: troque a CHAVE_LEITURA por uma de 24 caracteres ou mais' });
  const sh = aba_();
  const linhas = sh.getDataRange().getDisplayValues(); // texto exibido; nada de reavaliar fórmulas antigas
  const cab = linhas.shift() || [];
  const ix = function (n) { return cab.indexOf(n); };
  const txt = function (v, max) { return String(v == null ? '' : v).replace(/^'/, '').slice(0, max); };
  const desde = typeof d.desde === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d.desde) ? d.desde : '';
  const itens = linhas.filter(function (l) { return l[ix('mensagem')] && (!desde || txt(l[ix('data')], 40) >= desde); }).map(function (l) {
    const n = parseInt(l[ix('nota')], 10);
    return {
      data: txt(l[ix('data')], 40),
      nota: n >= 1 && n <= 5 ? n : null,
      temas: txt(l[ix('temas')], 400).split(/,\s*/).filter(function (t) { return TEMAS_FB.indexOf(t) >= 0; }),
      mensagem: txt(l[ix('mensagem')], MAX_MENSAGEM),
      nome: txt(l[ix('nome')], MAX_NOME),
      publicar: String(l[ix('publicar')]).toLowerCase() === 'sim',
      origem: 'site'
    };
  });
  return json_({ ok: true, itens: itens.slice(-MAX_LISTA), total: itens.length });
}

// Prazo de guarda: apaga linhas mais antigas que DIAS_GUARDA (padrão 730). Rode pelo gatilho mensal.
function limpar_() {
  const dias = Math.max(30, parseInt(prop_('DIAS_GUARDA'), 10) || 730);
  const limite = new Date(Date.now() - dias * 864e5).toISOString();
  const sh = aba_();
  const linhas = sh.getDataRange().getDisplayValues();
  let apagadas = 0;
  for (let i = linhas.length - 1; i >= 1; i--) {
    const data = String(linhas[i][0] || '').replace(/^'/, '');
    if (/^\d{4}-\d{2}-\d{2}T/.test(data) && data < limite) { sh.deleteRow(i + 1); apagadas++; }
  }
  return apagadas;
}
// Função pública chamada pelo gatilho mensal. O Apps Script não aceita gatilho em funções privadas
// (nome terminado em "_"), por isso o gatilho aponta para esta, que só chama limpar_().
function limpezaMensal() { return limpar_(); }
function instalarLimpezaMensal() {
  // remove gatilhos antigos (inclusive os que apontavam para limpar_, que nunca chegavam a rodar) e cria um só
  ScriptApp.getProjectTriggers().forEach(function (g) { const f = g.getHandlerFunction(); if (f === 'limpar_' || f === 'limpezaMensal') ScriptApp.deleteTrigger(g); });
  ScriptApp.newTrigger('limpezaMensal').timeBased().onMonthDay(1).atHour(4).create();
}

/* ---------------- Agenda de disponibilidade (espelho do Airbnb) ----------------
 * Configuração: em Propriedades do script, crie ICAL_URL com o link de exportação do calendário
 * (Airbnb → Calendário → Disponibilidade → Conectar calendários → Exportar calendário).
 * Pode colar mais de um link (Airbnb, Booking…) separados por espaço ou quebra de linha.
 * O link do iCal é secreto: fica só aqui no script, nunca no site.
 * O site recebe APENAS os períodos ocupados (datas), sem nomes, telefones, códigos ou links de reserva. */
const AGENDA_DIAS = 400;          // quanto do futuro devolver
const AGENDA_CACHE_S = 3600;      // 1 h de cache
const AGENDA_MAX_BYTES = 2000000; // proteção contra arquivos enormes

function agenda_() {
  const cache = CacheService.getScriptCache();
  const salvo = cache.get('agenda:v1');
  if (salvo) return JSON.parse(salvo);
  const urls = String(prop_('ICAL_URL') || '').split(/\s+/).filter(function (u) { return /^https:\/\/\S+$/i.test(u); });
  if (!urls.length) return { ok: false, erro: 'agenda não configurada' };
  const hoje = Utilities.formatDate(new Date(), FUSO, 'yyyy-MM-dd');
  const limite = Utilities.formatDate(new Date(Date.now() + AGENDA_DIAS * 864e5), FUSO, 'yyyy-MM-dd');
  let periodos = [], falhas = 0;
  urls.forEach(function (u) {
    try {
      const r = UrlFetchApp.fetch(u, { muteHttpExceptions: true, followRedirects: true });
      const txt = r.getContentText();
      if (r.getResponseCode() !== 200 || txt.length > AGENDA_MAX_BYTES || txt.indexOf('BEGIN:VCALENDAR') < 0) { falhas++; return; }
      periodos = periodos.concat(lerIcal_(txt));
    } catch (err) { falhas++; }
  });
  if (falhas === urls.length) return { ok: false, erro: 'não foi possível ler o calendário' };
  // recorta ao futuro, ordena e junta períodos sobrepostos ou encostados
  periodos = periodos.filter(function (p) { return p[1] > hoje && p[0] < limite; })
    .map(function (p) { return [p[0] < hoje ? hoje : p[0], p[1] > limite ? limite : p[1]]; })
    .sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  const juntos = [];
  periodos.forEach(function (p) {
    const u = juntos[juntos.length - 1];
    if (u && p[0] <= u[1]) { if (p[1] > u[1]) u[1] = p[1]; } else juntos.push([p[0], p[1]]);
  });
  const resp = { ok: true, ocupado: juntos, de: hoje, ate: limite, atualizado: new Date().toISOString(), parcial: falhas > 0 };
  cache.put('agenda:v1', JSON.stringify(resp), AGENDA_CACHE_S);
  return resp;
}

// Lê só DTSTART/DTEND de cada VEVENT. Fim é exclusivo (dia da saída fica livre para nova entrada).
function lerIcal_(txt) {
  const linhas = String(txt).replace(/\r\n[ \t]/g, '').split(/\r?\n/);
  const out = []; let ini = null, fim = null, dentro = false;
  const data = function (l) { const m = l.match(/:(\d{4})(\d{2})(\d{2})/); return m ? m[1] + '-' + m[2] + '-' + m[3] : null; };
  linhas.forEach(function (l) {
    if (l === 'BEGIN:VEVENT') { dentro = true; ini = fim = null; }
    else if (l === 'END:VEVENT') { if (dentro && ini) out.push([ini, fim && fim > ini ? fim : proxDia_(ini)]); dentro = false; }
    else if (dentro && /^DTSTART[;:]/.test(l)) ini = data(l);
    else if (dentro && /^DTEND[;:]/.test(l)) fim = data(l);
  });
  return out;
}
function proxDia_(iso) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }

// GET público só para a agenda (dados não sensíveis). Feedback continua só por POST.
function doGet(e) {
  const acao = e && e.parameter && e.parameter.acao;
  if (acao === 'agenda') return json_(agenda_());
  return json_({ ok: false, erro: 'use POST' });
}

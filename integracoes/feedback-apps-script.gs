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
 * 3. Em Configurações do projeto (ícone de engrenagem) → Propriedades do script,
 *    adicione a propriedade CHAVE_LEITURA com uma senha longa (24+ caracteres).
 * 4. Implantar → Nova implantação → tipo "App da Web".
 *    Executar como: Eu. Quem pode acessar: Qualquer pessoa. Implantar e autorizar.
 * 5. Copie o endereço que termina em /exec.
 *    No painel do anfitrião → Configurações: cole o endereço e a CHAVE_LEITURA. Publique.
 * Ao atualizar este código: Implantar → Gerenciar implantações → editar → Nova versão.
 *
 * Proteções
 * - Limite por hora (janela fixa, não renovada a cada envio) e teto diário.
 * - Mensagens repetidas nas últimas 24 h são descartadas.
 * - Campo-armadilha "site": robôs que o preenchem são recusados.
 * - Temas só da lista do formulário; textos que começam com = + - @ não viram fórmula.
 * - Nota ausente ou inválida fica vazia (não vira 1 estrela).
 *
 * Privacidade (LGPD): só gravamos o que o hóspede escreveu. Nada de IP ou navegador.
 */

const ABA = 'Feedback';
const CABECALHO = ['data', 'nota', 'temas', 'mensagem', 'nome', 'publicar', 'origem'];
const MAX_MENSAGEM = 2000;
const MAX_NOME = 60;
const LIMITE_HORA = 40;   // bem acima do uso de uma casa
const LIMITE_DIA = 150;
const TEMAS_FB = ['Limpeza', 'Conforto', 'Cozinha', 'Internet', 'Comunicação', 'Localização', 'Passeios', 'Outro'];

function aba_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ABA);
  if (!sh) { sh = ss.insertSheet(ABA); sh.appendRow(CABECALHO); sh.setFrozenRows(1); }
  return sh;
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

function doPost(e) {
  let d;
  try { d = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, erro: 'formato inválido' }); }
  if (!d || typeof d !== 'object') return json_({ ok: false, erro: 'formato inválido' });
  if (d.acao === 'listar') return listar_(d);
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
  try {
    // Contadores lidos e gravados dentro do lock: envios simultâneos não furam o limite.
    const cache = CacheService.getScriptCache();
    const agora = new Date().toISOString();
    const kHora = 'envios:' + agora.slice(0, 13), kDia = 'envios:' + agora.slice(0, 10);
    const nHora = Number(cache.get(kHora) || 0), nDia = Number(cache.get(kDia) || 0);
    if (nHora >= LIMITE_HORA || nDia >= LIMITE_DIA) return json_({ ok: false, erro: 'limite' });
    const kMsg = 'msg:' + hash_(msg.toLowerCase().replace(/\s+/g, ' '));
    if (cache.get(kMsg)) return json_({ ok: false, erro: 'repetido' });
    aba_().appendRow(["'" + agora, nota, celula_(temas), celula_(msg), celula_(nome), d.publicar === true ? 'sim' : 'não', 'site']);
    cache.put(kHora, String(nHora + 1), 3700);   // janela fixa: a chave muda a cada hora
    cache.put(kDia, String(nDia + 1), 21600);    // 6 h é o máximo do cache; a chave muda a cada dia
    cache.put(kMsg, '1', 21600);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erro: 'falha ao gravar' });
  } finally { lock.releaseLock(); }
}

function listar_(d) {
  const chave = PropertiesService.getScriptProperties().getProperty('CHAVE_LEITURA');
  if (!chave || typeof d.chave !== 'string' || d.chave !== chave) return json_({ ok: false, erro: 'não autorizado' });
  const sh = aba_();
  const linhas = sh.getDataRange().getDisplayValues(); // texto exibido; nada de reavaliar fórmulas antigas
  const cab = linhas.shift() || [];
  const ix = function (n) { return cab.indexOf(n); };
  const txt = function (v, max) { return String(v == null ? '' : v).replace(/^'/, '').slice(0, max); };
  const itens = linhas.filter(function (l) { return l[ix('mensagem')]; }).map(function (l) {
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
  return json_({ ok: true, itens: itens });
}

// Leitura por GET foi desativada: a chave não deve aparecer em URLs (logs, proxies, histórico).
function doGet() {
  return json_({ ok: false, erro: 'use POST' });
}

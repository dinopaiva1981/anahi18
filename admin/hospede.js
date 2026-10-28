/* Painel do anfitrião · ferramentas de hospedagem (funções puras, sem rede e sem armazenamento).
   - Link personalizado de estadia (contrato 1 com o site): <url>#/?ola=<nome>&in=AAAA-MM-DD&out=AAAA-MM-DD
   - Mensagens prontas para WhatsApp a partir de modelos com {marcadores}
   - Texto do QR de Wi-Fi (WIFI:T:WPA;S:…;P:…;;) com escape de \ ; , : "
   - Checklist de virada entre hóspedes (modelo em texto: "# Seção" e um item por linha)
   window.Hospede = { validarEstadia, linkEstadia, linkAviso, dataLonga, noites, MODELOS, MARCADORES, preencher, wifiTexto, escWifi, lerWifi,
                      CHECKLIST_PADRAO, lerChecklist, chaveItem } */
(function () {
  'use strict';
  const RE_DIA = /^\d{4}-\d{2}-\d{2}$/;
  /* Mesma regra do site (assets/site.js, lerEstadiaDaUrl): até 40 caracteres no total (espaços contam),
     começando por letra; depois letras, acentos, espaço, apóstrofo, ponto e hífen. */
  const RE_NOME = /^[\p{L}][\p{L}\p{M}' .-]*$/u;
  const MAX_NOME = 40;
  const diaValido = (s) => { if (!RE_DIA.test(String(s || ''))) return false; const [a, m, d] = s.split('-').map(Number); const x = new Date(Date.UTC(a, m - 1, d)); return x.getUTCFullYear() === a && x.getUTCMonth() === m - 1 && x.getUTCDate() === d; };

  /* Contrato 1: nome com até 40 caracteres (letras, espaço, ponto, hífen e apóstrofo), datas ISO válidas e saída depois da chegada. */
  function validarEstadia(e) {
    e = e || {}; const erros = {};
    const nome = String(e.nome || '').trim().replace(/\s+/g, ' ');
    if (!nome) erros.nome = 'Escreva o primeiro nome do hóspede.';
    else if (!RE_NOME.test(nome)) erros.nome = 'Use só letras (sem números, emojis ou símbolos).';
    else if ([...nome].length > MAX_NOME) erros.nome = `Use no máximo ${MAX_NOME} caracteres (contando os espaços): só o primeiro nome basta.`;
    if (!diaValido(e.chegada)) erros.chegada = 'Escolha a data de chegada.';
    if (!diaValido(e.saida)) erros.saida = 'Escolha a data de saída.';
    else if (diaValido(e.chegada) && e.saida <= e.chegada) erros.saida = 'A saída precisa ser depois da chegada.';
    return { ok: !Object.keys(erros).length, erros, nome };
  }
  /* Contrato 1 (revisado pela auditoria A1): os dados vão no FRAGMENTO (#/?ola=…), que não sai do aparelho:
     não chega aos logs do servidor nem ao robô de prévia do WhatsApp. */
  function linkEstadia(base, nome, chegada, saida) {
    const u = new URL(base); u.hash = ''; u.search = u.search; // mantém uma eventual query da base
    const q = new URLSearchParams();
    q.set('ola', String(nome).trim().replace(/\s+/g, ' ')); q.set('in', chegada); q.set('out', saida);
    return u.href.replace(/#.*$/, '') + '#/?' + q.toString().replace(/\+/g, '%20');
  }
  /* Link para o hóspede avisar o anfitrião pelo WhatsApp ("Cheguei", "Saímos"). */
  const linkAviso = (whats, texto) => /^\d{12,13}$/.test(String(whats || '')) ? `https://wa.me/${whats}?text=${encodeURIComponent(texto)}` : '';
  const dataUTC = (iso) => new Date(iso + 'T12:00:00Z');
  function dataLonga(iso, comDia) {
    if (!diaValido(iso)) return '';
    const o = { day: 'numeric', month: 'long', timeZone: 'UTC' }; if (comDia !== false) o.weekday = 'long';
    return dataUTC(iso).toLocaleDateString('pt-BR', o);
  }
  const noites = (a, b) => diaValido(a) && diaValido(b) ? Math.round((dataUTC(b) - dataUTC(a)) / 864e5) : 0;

  /* Marcadores disponíveis nos modelos. "privado" = vem do cofre deste aparelho (nunca do site). */
  const MARCADORES = [
    ['nome', 'primeiro nome do hóspede'], ['link', 'link personalizado do guia'], ['chegada', 'data de chegada'], ['saida', 'data de saída'], ['noites', 'número de noites'],
    ['checkin', 'horário de check-in'], ['checkout', 'horário de check-out'], ['casa', 'nome da casa'], ['anfitriao', 'seu nome'], ['endereco', 'endereço'], ['rota', 'link da rota'],
    ['avaliacao', 'link do feedback'], ['reserva', 'link da reserva (avaliação na plataforma)'],
    ['avisar_chegada', 'botão “Cheguei” (WhatsApp)'], ['avisar_saida', 'botão “Saímos” (WhatsApp)'],
    ['wifi_rede', 'nome da rede Wi-Fi', 1], ['wifi_senha', 'senha do Wi-Fi', 1], ['portao', 'código do portão', 1], ['chaves', 'chaves e acesso', 1]
  ];
  const MODELOS = [
    { id: 'pre', titulo: 'Antes da chegada', quando: 'Envie 2 ou 3 dias antes',
      texto: 'Olá, {nome}! Está tudo pronto para receber vocês na {casa} a partir de {chegada}.\n\nPreparei um guia da casa e da região, com maré, praias e onde comer. Ele já está com o seu nome:\n{link}\n\nCheck-in a partir de {checkin}.\nEndereço: {endereco}\nRota até a portaria: {rota}\n\nNo dia da chegada eu envio o Wi-Fi e as orientações de acesso. Qualquer dúvida, é só me chamar por aqui.\n{anfitriao}' },
    { id: 'chegada', titulo: 'No dia da chegada', quando: 'Envie pela manhã',
      texto: 'Bom dia, {nome}! Hoje é dia de chegar à {casa}.\n\nCheck-in a partir de {checkin}.\nCódigo do portão: {portao}\nChaves: {chaves}\nWi-Fi: {wifi_rede}\nSenha do Wi-Fi: {wifi_senha}\n\nO guia continua aqui, com a maré do dia:\n{link}\n\nQuando chegar, toque aqui para me avisar: {avisar_chegada}\n\nBoa viagem!' },
    { id: 'checkout', titulo: 'Véspera do check-out', quando: 'Envie no fim da tarde anterior',
      texto: 'Oi, {nome}! Amanhã, {saida}, é dia de check-out.\nO horário de saída é até {checkout}.\n\nAntes de sair, dê uma olhada no checklist de saída do guia:\n{link}\n\nNa hora de ir embora, toque aqui para me avisar que saíram: {avisar_saida}\n\nSe precisar de outro horário, me fale hoje que eu vejo o que dá para fazer. Obrigado pelo cuidado com a casa!' },
    { id: 'pos', titulo: 'Depois da estadia', quando: 'Envie no dia seguinte à saída',
      texto: '{nome}, obrigado pela estadia na {casa}! Espero que a volta tenha sido tranquila.\n\nSe puder, conte como foi. Sua opinião me ajuda a cuidar melhor da casa e do guia, e leva um minuto:\n{avaliacao}\n\nSe você reservou por uma plataforma, a avaliação por lá também ajuda muito: {reserva}\n\nVai ser um prazer receber vocês de novo.\n{anfitriao}' }
  ];
  /* Preenche um modelo. Linhas com marcador vazio são omitidas (a mensagem nunca sai com "{x}" ou buraco);
     os marcadores que ficaram vazios voltam em "faltam" para o painel avisar. */
  function preencher(modelo, dados) {
    const faltam = new Set();
    const linhas = String(modelo || '').split('\n').filter(l => {
      const ms = [...l.matchAll(/\{([a-z_]+)\}/g)].map(m => m[1]).filter(k => MARCADORES.some(x => x[0] === k));
      const vazios = ms.filter(k => !String(dados[k] == null ? '' : dados[k]).trim());
      vazios.forEach(k => faltam.add(k));
      return !vazios.length;
    }).map(l => l.replace(/\{([a-z_]+)\}/g, (m, k) => MARCADORES.some(x => x[0] === k) ? String(dados[k]).trim() : m));
    const texto = linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return { texto, faltam: [...faltam] };
  }

  /* Wi-Fi: formato do ZXing/Android/iOS. Escapar \ ; , : " com barra invertida. */
  const escWifi = (s) => String(s == null ? '' : s).replace(/([\\;,:"])/g, '\\$1');
  function wifiTexto(w) {
    w = w || {}; const tipo = w.tipo === 'nopass' ? 'nopass' : w.tipo === 'WEP' ? 'WEP' : 'WPA';
    if (!String(w.rede || '').length) return '';
    return `WIFI:T:${tipo};S:${escWifi(w.rede)};${tipo !== 'nopass' ? `P:${escWifi(w.senha)};` : ''}${w.oculta ? 'H:true;' : ''};`;
  }
  /* Leitura inversa (usada nos testes e para conferir o que o QR carrega). */
  function lerWifi(t) {
    const m = String(t || '').match(/^WIFI:(.*);$/); if (!m) return null;
    const out = {}; let k = '', v = '', emValor = false, i = 0; const s = m[1];
    const fecha = () => { if (k) out[k] = v; k = ''; v = ''; emValor = false; };
    for (; i < s.length; i++) {
      const c = s[i];
      if (c === '\\' && i + 1 < s.length) { (emValor ? (v += s[++i]) : (k += s[++i])); continue; }
      if (!emValor && c === ':') { emValor = true; continue; }
      if (c === ';') { fecha(); continue; }
      emValor ? (v += c) : (k += c);
    }
    fecha();
    return { tipo: out.T || '', rede: out.S || '', senha: out.P || '', oculta: out.H === 'true' };
  }

  const CHECKLIST_PADRAO = [
    '# Ao chegar', 'Abrir janelas e portas para ventilar', 'Conferir se o hóspede anterior esqueceu algo', 'Anotar o que precisa de conserto',
    '# Cozinha', 'Lavar e guardar a louça', 'Limpar fogão, pia e bancadas', 'Esvaziar e limpar a geladeira', 'Repor detergente, esponja e pano de prato', 'Retirar o lixo e trocar os sacos',
    '# Quartos', 'Trocar a roupa de cama', 'Conferir colchões e travesseiros', 'Varrer e passar pano', 'Conferir controles do ar-condicionado',
    '# Banheiros', 'Limpar box, vaso e pia', 'Trocar as toalhas', 'Repor papel higiênico e sabonete',
    '# Sala e varanda', 'Limpar móveis e mesa', 'Conferir redes e almofadas', 'Conferir controles da TV',
    '# Antes de sair', 'Testar o Wi-Fi', 'Desligar luzes e ar-condicionado', 'Fechar torneiras, janelas e portas', 'Deixar as chaves no lugar combinado'
  ].join('\n');
  /* "# Título" abre uma seção; cada outra linha é um item. Linhas vazias são ignoradas. */
  function lerChecklist(t) {
    const secoes = []; let atual = null;
    String(t || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 200).forEach(l => {
      if (/^#/.test(l)) { atual = { titulo: l.replace(/^#+\s*/, '').slice(0, 60) || 'Seção', itens: [] }; secoes.push(atual); return; }
      if (!atual) { atual = { titulo: 'Geral', itens: [] }; secoes.push(atual); }
      atual.itens.push(l.replace(/^[-*•]\s*/, '').slice(0, 120));
    });
    return secoes.filter(s => s.itens.length);
  }
  const chaveItem = (secao, item) => { let h = 0; const s = secao + '\u0000' + item; for (let k = 0; k < s.length; k++) h = (h * 31 + s.charCodeAt(k)) | 0; return 'v' + (h >>> 0).toString(36); };

  window.Hospede = { validarEstadia, linkEstadia, linkAviso, dataLonga, noites, diaValido, MODELOS, MARCADORES, preencher, wifiTexto, escWifi, lerWifi, CHECKLIST_PADRAO, lerChecklist, chaveItem };
})();

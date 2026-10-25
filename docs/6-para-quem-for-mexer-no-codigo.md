# 6. Para quem for mexer no código

Este guia é técnico. Ele descreve o comportamento **real** do código entregue em 24/10/2026, e não só o pretendido.

## Arquitetura

Site estático, sem build, sem framework e sem dependências instaladas. Tudo é HTML, CSS e JS puros, servidos pelo GitHub Pages.

```
index.html            casca: <symbol> de ícones, header, nav, <dialog>s, metatags og:*
conteudo.js           window.CONTEUDO = {JSON};   ← única fonte de conteúdo (o painel reescreve)
assets/marca.js       window.Marca  (logo em SVG)        ┐ carregados no site e no painel,
assets/ilustracoes.js window.Ilustra (cenas em SVG)      ┘ antes dos outros scripts
assets/site.js        roteador por hash, páginas, busca, tempo e maré (Open-Meteo), mapa (Leaflet), feedback
assets/site.css       estilos; tokens em :root
admin/index.html      painel (CSP própria, noindex)
admin/admin.js        estado, cofre do token, API do GitHub, validação, merge, detector de segredos, vistas
admin/sentimento.js   window.Sentimento (análise léxica pt-BR, no navegador)
admin/qr.js           window.QR (gerador de QR próprio, sem dependência)
integracoes/feedback-apps-script.gs   receptor de feedback (Google Apps Script + Planilha)
sw.js                 service worker (offline)
manifest.webmanifest  PWA
marca/                SVGs exportados de marca.js
fotos/                imagens enviadas pelo painel (fotos/<slug>-<base36>.webp|jpg)
```

### Fluxo de dados

1. **Site**: `index.html` carrega `conteudo.js` e depois `site.js`, que renderiza a rota do hash (`#/inicio`, `#/casa`, `#/chegada`, `#/explorar`, `#/roteiro/<id>`, `#/lugar/<id>`, `#/comer`, `#/planejar`, `#/mapa`, `#/ajuda`, `#/beneficios`, `#/avaliacoes`, `#/feedback`). Rota desconhecida vira `inicio`.
2. **Painel**: lê `conteudo.js` por `GET /repos/{owner}/{repo}/contents/conteudo.js`. Remove o prefixo `window.CONTEUDO =` e faz `JSON.parse`. Saneia, edita um rascunho em memória e no `localStorage` e publica com `PUT` (commit direto na branch configurada, padrão `main`). O arquivo é regravado como `window.CONTEUDO = ` + `JSON.stringify(o, null, 2)` + `;\n`. **Comentários ou JS fora do JSON se perdem.**
3. Depois do `PUT` do conteúdo, `atualizarIndex()` regrava em `index.html` o `<title>`, `og:title`, `og:image` e `og:url` (o WhatsApp não executa JS). Há checagem de integridade antes do `PUT`: exatamente 1 `<!doctype>`, 1 `<title>`, 1 `</html>` e crescimento menor que 2 KB.
4. **Prévia**: o painel grava `localStorage['guia:rascunho']` e abre `../index.html?rascunho=1#/inicio`. O site lê, apaga do `localStorage`, guarda no `sessionStorage` da aba e mostra a faixa de prévia. Com `?rascunho`, o service worker não é registrado.
5. **Fotos**: `PUT /contents/fotos/<nome>` direto, fora do rascunho. Antes, o canvas reduz para no máximo 1800 px e converte para WebP 0,82 (ou JPEG 0,84 como reserva). Ao abrir uma foto recém-enviada, o painel usa `raw.githubusercontent.com` se o Pages ainda não tiver o arquivo.
6. **Feedback**: o site faz `POST` `no-cors` `text/plain` para `config.feedback_endpoint` e nunca lê a resposta. O painel lista com `POST {acao:'listar', chave}`, `text/plain`, `credentials:'omit'`.

### Service worker (`sw.js`)
- `VERSAO = 'guia-v4'`. **Incremente** ao mudar a lista `ESSENCIAIS` ou ao precisar invalidar o cache.
- Navegação e `.html/.js/.css` do próprio site: rede primeiro, com o cache como reserva offline.
- Fontes do Google, cdnjs (Leaflet), tiles do OSM e imagens do site: cache primeiro, com atualização em segundo plano.
- Open-Meteo: sempre rede.
- `/admin/` nunca passa pelo cache.

## Esquema do `conteudo.js`

Chaves de topo: `versao`, `atualizado_em` (AAAA-MM-DD, gravado ao publicar), `casa`, `config`, `regiao`, `lugares`, `destaques`, `roteiros`, `provar`, `contatos`, `beneficios`, `avaliacoes`, `_confirmar`.

```jsonc
casa: {
  nome, subtitulo, anfitriao, whatsapp /* só dígitos, DDI+DDD, 12–13 */, checkin, checkout,
  area_m2, hospedes, quartos, suites, banheiros /* números ou null */, camas: [string],
  endereco_publico, link_maps /* https */, coordenadas: {lat, lng} | null,
  fotos: [{src, alt}]           /* [0] = capa do hero */,
  ambientes: [{nome, descricao, foto:{src,alt}|null}],
  comodidades: [{icone, nome, descricao, destaque:bool}],
     // icone: wifi ar cozinha cama toalha carro piscina tv maquina churrasqueira chuveiro varanda rede praia outro
     // faixa da home: quartos + hóspedes + comodidades com destaque, até 6 itens no total; com menos de 3 itens a faixa não aparece
  regras_casa, regras_condominio, lixo_limpeza, seguranca: [string],
  faq: [{pergunta, resposta}],
  chegada: { como_chegar, entrada, chaves, estacionamento, imprevistos: string, saida: [string],
             trajetos: [{icone: aviao|estrada|pino|carro|onibus, titulo, texto}] },
  frase /* Parisienne, uma linha */, sobre, instagram /* sem @, [A-Za-z0-9._]{1,30} */,
  link_reserva, video_url /* opcionais, https */
}
config: { feedback_endpoint /* https .../exec */, og_imagem: {src, alt} | null, url_publica? /* https, opcional */ }
regiao: { centro:{lat,lng}, cidades:[...], quando_ir, mares, mobilidade, dias_de_chuva, dicas: [string], fontes: [...] }
lugares: [{
  id /* slug ^[a-z0-9][a-z0-9-]{0,79}$ */, nome, categoria, tipo, area, tags: [natureza|familia|casal|aventura|cultura|gastronomia],
  resumo /* ≤ ~90 car. */, descricao, dica, bom_saber: [string], depende_mare, reserva: bool,
  foto: {src, alt} | null, endereco, lat, lng, precisao: exata|aproximada,
  distancia, duracao, preco, horario, melhor_periodo, telefone, whatsapp, link, link_cardapio,
  parceiro, patrocinado: bool, status: publicado|rascunho, fonte: {titulo, url}, verificado: 'AAAA-MM-DD' | null
}]
  // categoria: praia passeio natureza cultura compras restaurante cafe mercado delivery farmacia saude servico
  // area (filtros do site): Passo de Camaragibe, São Miguel dos Milagres, Porto de Pedras, Japaratinga
destaques: [id de lugar]          // a home mostra os 8 primeiros que existirem e estiverem publicados
roteiros: [{ id, titulo, subtitulo, quando, ideal, ilustracao, status, paradas: [{momento, titulo, texto, lugar /* id ou "" */}] }]
provar: [{nome, descricao}]       // a home mostra 6
contatos: [{ nome, categoria, nivel: emergencia|essencial|conveniencia|parceiro, telefone, whatsapp, horario, obs, verificado }]
beneficios: [{ id, parceiro, titulo, descricao, condicoes, restricoes, validade, codigo /* público */, whatsapp, link, ativo }]
  // o site esconde benefício com ativo:false ou validade < hoje (fuso America/Maceio)
avaliacoes: [{ texto, autor, nota 1–5 | null, periodo, origem, autorizada: bool }]   // o site mostra só autorizada === true
_confirmar: [string]              // pendências para o proprietário; o site ignora; o detector de segredos pula
```

Regras de conteúdo: dado não confirmado = campo vazio, `status:"rascunho"` ou `verificado:null`. Nenhum item publicado tem preço, horário ou telefone sem fonte.

Atenção: `_confirmar[13]` (filtro de Japaratinga) já foi resolvido em `site.js` (`AREAS` inclui Japaratinga). O item pode ser removido.

## Contratos

### `window.Marca` (`assets/marca.js`)
```js
Marca.simbolo({ tema, titulo, compacto, cor })   // <svg> só do símbolo, viewBox quadrado
Marca.horizontal({ tema, titulo, cor })          // símbolo à esquerda + CASA 18 / ANAHI
Marca.vertical({ tema, titulo, cor })            // símbolo em cima + CASA 18 / ANAHI
Marca.logo({ variante, tom, titulo })            // compatibilidade; tom 'claro' = tinta clara
```
- `tema: 'claro'` é para fundo claro (tinta verde). `'escuro'` é para fundo escuro (tinta areia).
- `titulo: ''` deixa o SVG decorativo (`aria-hidden`). Com texto, gera `role="img"` e `aria-label` escapado.
- `compacto: true` engrossa o traço e reduz os raios, para 16–32 px. `cor` força uma cor só.
- O letreiro usa `textLength` + `lengthAdjust="spacing"`, então a largura não depende da fonte.
- O painel chama `Marca[tipo]` com fallback para `Marca.logo` e depois para um letreiro em texto.

### `window.Ilustra` (`assets/ilustracoes.js`)
```js
Ilustra.arte(tipo, { momento, heroi, vb })   // string <svg>, viewBox 400x300 (vb sobrescreve)
Ilustra.cenaDoLugar(lugar)                   // escolhe o tipo a partir de categoria/nome
Ilustra.momentoAtual()                       // madrugada | dia | tarde | noite (hora local)
Ilustra.PALETAS
```
Tipos usados: `praia piscina jangada peixeboi capela farol vila comida tunel barra casa`.

### `window.Sentimento` (`admin/sentimento.js`)
`analisar(texto, nota, temasForm)` devolve `{sentimento, score, sTexto, temas, pedidos, palavras}`. `consolidar(itens)` devolve `{n, media, cont, temas, pedidos}`. O score é `0,55 × nota + 0,45 × texto` quando há nota inteira de 1 a 5. Positivo se for maior que 0,15, negativo se for menor que -0,15.

### `window.QR` (`admin/qr.js`)
`QR.svg(texto, {cor, fundo, margem, titulo})` e `QR.matriz(texto)`. Modo byte UTF-8, correção M, versões 1 a 10 (até 213 bytes).

### Apps Script (`integracoes/feedback-apps-script.gs`)
- `doPost` com `{acao:'listar', chave}` responde `{ok, itens:[{data, nota, temas, mensagem, nome, publicar, origem}]}` ou `{ok:false, erro:'não autorizado'}`.
- Qualquer outro `doPost` é um envio. Respostas: `{ok:true}` ou `{ok:false, erro: 'recusado'|'mensagem curta'|'ocupado'|'limite'|'repetido'|'falha ao gravar'|'formato inválido'}`.
- `doGet` responde `{ok:false, erro:'use POST'}`.
- A aba `Feedback` tem as colunas `data, nota, temas, mensagem, nome, publicar, origem`.

## Segurança

### CSP do painel (`admin/index.html`, via `<meta>`)
```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://raw.githubusercontent.com;
connect-src https://api.github.com https://script.google.com/macros/s/ https://script.googleusercontent.com;
frame-src 'none'; child-src 'none'; worker-src 'none'; manifest-src 'none'; media-src 'none';
object-src 'none'; base-uri 'none'; form-action 'none'
```
Também há `referrer: no-referrer` e `robots: noindex, nofollow`. Não há script de CDN no painel. **O site (`index.html`) não tem CSP.**

### Cofre do token
- Sem "Lembrar", o token fica só em `sessionStorage['admin:token']`.
- Com "Lembrar", a senha local (8+ caracteres) passa por PBKDF2-SHA256 (310 000 iterações, sal de 16 bytes) e vira uma chave AES-GCM 256 (IV de 12 bytes). O resultado vai para `localStorage['admin:cofre'] = {v, iter, sal, iv, ct, exp}`. O `ct` guarda `{token, fbchave, exp}`.
- `exp` é o menor entre agora + 30 dias e a validade do token. Cofre vencido é apagado ao abrir.
- A chave derivada fica em `sessionStorage['admin:cofre-chave']` durante a sessão, para regravar o cofre (por exemplo, quando muda a chave do feedback).
- Ao iniciar, o painel apaga formatos antigos sem cifra: `admin:token`, `admin:token-lembrado` e `admin:fbchave` no `localStorage`.
- **Sair** apaga `admin:token`, `token-exp`, `token-lembrado`, `fbchave`, `fb-local`, `fb-resolvidos`, `rascunho`, `guia:rascunho`, `cofre` e `cofre-chave` (local e sessão). Fica só `admin:cfg` (owner, repo, branch).
- A validade vem do cabeçalho `github-authentication-token-expiration`.
- Toda leitura e escrita de armazenamento passa por `armaz()`, com `try` e memória como reserva. Com o armazenamento bloqueado, o painel funciona e avisa.

### Validações
- `esc()` em tudo que vai para `innerHTML`, no site e no painel.
- `sanear()` roda ao carregar o `conteudo.js`, ao restaurar o rascunho ou a cópia `.json` e ao aplicar o JSON do Avançado. Ele valida datas `AAAA-MM-DD` (`verificado`, `validade`), links http(s) (`link`, `link_cardapio`, `link_maps`, `link_reserva`, `video_url`, `url`, `url_publica`, `feedback_endpoint`), `src` (`fotos/…` com extensão de imagem e sem `..`, ou `https://`), coordenadas, listas, notas e ids, e remove `__proto__`/`constructor`/`prototype`. O que corrigir aparece na Visão geral.
- Publicar exige `https://` em todos os links e Instagram no formato certo.
- **Detector de segredos** (`procurarSegredos`): percorre só valores string, frase a frase, com limites de palavra Unicode. Pula chaves estruturais (`id`, `icone`, `url`, `telefone`, `whatsapp`…), `_confirmar` e `beneficios[].codigo`. "Forte" bloqueia; "ambíguo" exige confirmação. É heurística: tem falsos negativos possíveis.
- Feedback no painel: `dataISO()` aceita `dd/mm/aaaa[ hh:mm]`, `aaaa-mm-dd` (meio-dia em -03:00) e ISO completo; o que não reconhece vira `null`. `notaValida()` só aceita inteiros de 1 a 5. Os ids são recalculados.
- Apps Script: `LockService.tryLock` antes dos contadores, janela fixa por hora (40) e teto diário (150) no `CacheService`, dedup por SHA-256 da mensagem normalizada, honeypot `site`, temas só de `TEMAS_FB`, `celula_()` contra injeção de fórmula, listagem com `getDisplayValues()`.
- `window.__admin` (estado e funções puras para teste) só existe com `?teste` **e** host `localhost`/`127.0.0.1`.

### Junção (merge)
`mesclar(base, minha, deles)`: três vias, por seção no topo e com segundo nível dentro de objetos (`casa`, `config`, `regiao`). Listas cujos itens têm todos `id` (`lugares`, `roteiros`, `beneficios`) se juntam por `id`, e cada item é comparado inteiro. Listas sem `id` (`contatos`, `avaliacoes`, `provar`, `destaques`) e campos de terceiro nível (por exemplo, todo o `casa.chegada`) são comparados por inteiro. Mudança dos dois lados no mesmo ponto vira conflito: nada é publicado até o anfitrião escolher.

## Testes

Os testes **não estão neste repositório**. Ficaram na máquina de desenvolvimento, em `/home/claude/time/` e `/home/claude/qa2/`. Requisitos: Python 3, Playwright com Chromium, Node 22. Para o QR: OpenCV (`cv2`) e libzbar.

| Arquivo | O que cobre | Como rodar |
|---|---|---|
| `time/admin-qa/admin_teste.py` | Painel com o GitHub simulado (`page.route`): login, cofre, publicar, merge e conflitos, detector, XSS, CSP, fotos, sair, armazenamento bloqueado, feedback, QR. Também chama os dois abaixo. **103 testes, 0 falhas** na entrega | `python3 admin_teste.py` (porta 8802; sai com código 1 se falhar) |
| `time/admin-qa/gs_teste.js` | Apps Script em Node, com Planilha, Cache, Lock e Utilities simulados (10 testes) | `node gs_teste.js` |
| `time/admin-qa/qr_teste.py` | `qr.js` comparado ao OpenCV e lido por 2 decodificadores (47 textos) | `python3 qr_teste.py` |
| `time/marca-qa/run.py` | 13 rotas × 390/1280/1440 px: erros de JS e rolagem horizontal, com capturas | `python3 run.py index.html <pasta-saida> [rota1,rota2]` (porta 8801) |
| `time/marca-qa/site_teste.py` | Site com serviços simulados: tempo, maré, mapa, busca, deep link, feedback, filtros, foco | `python3 site_teste.py` |
| `time/marca-qa/marca_teste.py` | Contrato da Marca, acessibilidade, prévia de rascunho, honeypot, manifest/sw (20 testes) | `python3 marca_teste.py` |
| `time/marca-qa/variante.py` | Todos os opcionais preenchidos e horário diurno | `python3 variante.py` |
| `time/conteudo-qa/aplicar.py`, `checar.py` | Gera e valida o `conteudo.js` (JSON, ids, resumos, nada de preço/horário/telefone publicado) | `python3 aplicar.py [saida]` |

Para testar à mão: `python3 -m http.server 8000 -d .` e abra `http://localhost:8000/` e `http://localhost:8000/admin/?teste`. O painel precisa de um token real, ou do GitHub simulado como em `admin_teste.py`.

As fontes do Google não carregam sem internet; o fallback é Georgia e sans.

Vale trazer esses testes para dentro do repositório (por exemplo, em `testes/`) e rodá-los num GitHub Actions.

## Limitações conhecidas

1. **Origem compartilhada `<owner>.github.io`.** Qualquer outro repositório Pages do mesmo usuário roda na mesma origem e alcança o `sessionStorage` e o `localStorage`. O cofre cifrado protege o token guardado, mas o token em uso fica em claro no `sessionStorage` durante a sessão. A defesa completa é servir o painel num subdomínio próprio. `frame-ancestors` não funciona em `<meta>`, e o GitHub Pages não permite cabeçalhos HTTP.
2. **Validade do token**: não foi confirmado se a API do GitHub expõe `github-authentication-token-expiration` via `Access-Control-Expose-Headers`. Se não expuser, o painel só não mostra a validade nem o alerta de 7 dias.
3. **Leitura do feedback pelo painel**: o padrão `POST text/plain` com redirecionamento para `script.googleusercontent.com` costuma passar no CORS, mas não foi testado contra o Google. A leitura por GET foi desligada; quem tiver um script antigo precisa reimplantar uma nova versão.
4. **Envio do site é às cegas** (`no-cors`): o site não sabe se o Apps Script recusou (`limite`, `repetido`). O texto ao hóspede não promete entrega e oferece o WhatsApp. Se o CORS for confirmado em produção, dá para ler a resposta e chamar `viaWhats()` quando `ok !== true`.
5. **Limite do endpoint é global**: o Apps Script não vê IP. Um abusador pode esgotar os 40 envios de uma hora; o bloqueio termina na hora seguinte.
6. **Dedup de 6 horas, não 24**: o comentário do `.gs` fala em "últimas 24 h", mas o `CacheService` guarda no máximo 6 h (`21600` s). O teto diário também usa TTL de 6 h, então ele pode não somar o dia inteiro.
7. **O site não tem CSP**, e o Leaflet vem do cdnjs (versão 1.9.4 fixa) sem `integrity` (SRI). O escape de dados com `esc()` é a defesa principal.
8. **`og:image` em WebP**: as fotos são convertidas para WebP. Não foi testado se a prévia do WhatsApp aceita WebP em todas as versões. Se falhar, envie a imagem de compartilhamento em JPEG direto pelo GitHub e aponte `config.og_imagem.src` para ela.
9. **Prévia** depende do `localStorage` da mesma origem e de o navegador permitir a aba nova.
10. **Regravar o `conteudo.js`** descarta qualquer coisa fora do JSON. Não ponha lógica nele.
11. **Fotos não usadas** continuam públicas no repositório até serem apagadas pela tela Fotos.
12. **Merge sem `id`**: duas pessoas editando contatos diferentes ao mesmo tempo geram conflito na lista inteira de `contatos`.
13. **Análise de sentimento** é léxica (palavras, negação, intensificadores, "mas"). Ironia e textos longos podem enganar.
14. **Mudanças que não podem ser feitas sem quebrar o painel**: renomear chaves do esquema, mudar o prefixo `window.CONTEUDO =`, tirar `og:title`/`og:image` do `index.html` ou duplicar `<title>` (a checagem de integridade recusa).

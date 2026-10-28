# 6. Para quem for mexer no código

Guia técnico. Descreve o comportamento **real** do código em 27/10/2026. Para a separação dados × código do ponto de vista do anfitrião, veja o guia 9.

## Arquitetura

Site estático, sem build, sem framework e sem dependências instaladas. HTML, CSS e JS puros, servidos pelo GitHub Pages.

```
index.html             casca: ícones <symbol>, header, nav, <dialog>s
                       bloco <!-- compartilhar:inicio --> … <!-- compartilhar:fim -->  ← único trecho que o painel reescreve
dados/conteudo.json    DADOS: JSON puro, "esquema": 2 no topo (o painel grava)
dados/ESQUEMA.md       campo, tipo, obrigatório e onde aparece (gerado; 165 campos)
compartilhar.jpg       DADOS: imagem og 1200×630 gerada pelo painel ao publicar
conteudo.js            formato antigo (esquema 1), só em repositórios anteriores; reserva de leitura
assets/dados.js        window.GuiaDados: contrato do esquema (normalizar, migrações); usado no site e no painel; roda no Node
assets/site.js         carregamento, roteador por hash, páginas, busca, tempo/maré (Open-Meteo), mapa (Leaflet), gadgets, feedback
assets/site.css        estilos; tokens em :root; modo sol (.modo-sol)
assets/marca.js        window.Marca (logo em SVG)
assets/ilustracoes.js  window.Ilustra (cenas em SVG)
assets/fontes/         Inter 300/400/600 e Instrument Serif 400/400i (WOFF, subconjunto pt-BR; licenças OFL)
admin/index.html       painel (CSP própria, noindex)
admin/admin.js         estado, senha, cofre, API do GitHub, validação, merge, detector de segredos, vistas, formato dos dados
admin/acesso.json      DADOS: hash PBKDF2 da senha do painel
admin/hospede.js       window.Hospede: link de estadia, mensagens, texto do QR Wi-Fi, checklist (funções puras)
admin/sentimento.js    window.Sentimento (análise léxica pt-BR, no navegador)
admin/qr.js            window.QR (gerador de QR próprio)
integracoes/feedback-apps-script.gs   receptor de feedback (Apps Script + Planilha)
sw.js                  service worker (offline)
manifest.webmanifest   PWA (id, shortcuts)
fotos/                 imagens enviadas pelo painel (fotos/<slug>-<base36>.webp|jpg)
```

**Dados** = `dados/`, `fotos/`, `compartilhar.jpg`, `admin/acesso.json` (e `conteudo.js` legado). **Código** = todo o resto. O pacote `casa18-atualizacao-codigo.zip` não leva nenhum arquivo de dados.

### Carregamento do site
1. `index.html` carrega com `defer`: `assets/dados.js`, `ilustracoes.js`, `marca.js`, `site.js`.
2. `site.js` faz `fetch('dados/conteudo.json', {cache:'no-cache'})` com limite de 15 s.
3. Se der 404, erro HTTP, JSON inválido, não-objeto ou falha de rede, injeta `<script src="conteudo.js">` e usa `window.CONTEUDO` (esquema 1).
4. Aplica `GuiaDados.normalizar` e só então desenha.
5. A partir de 200 ms sem dados, mostra “Abrindo o guia…” (`role=status`). Falha total: mensagem com `tel:` 192/193/190 e **Tentar de novo**.
6. Sinais para teste: `<html data-guia="carregando|pronto|erro">`, `window.__guiaOrigem` (`json` | `conteudo.js`), `window.__guiaFalhas`.

### Isolamento de falhas
- `render()` por página: em erro, “Esta parte não abriu agora.” com Início e Ajuda; topo, nav e rodapé ficam.
- Seções: `${S('página: seção', () => …)}` (43 seções em 12 páginas). Em erro, a seção é omitida, registrada em `__guiaFalhas` e no `console.error('[guia] parte omitida…')`.
- Itens: `cardLugar`, `cardRoteiro`, `cardBeneficio`, `cardAvaliacao`; também rodapé, ficha do lugar, índice da busca e os preenchimentos assíncronos.

### Rotas
`#/inicio`, `#/casa`, `#/chegada`, `#/explorar`, `#/roteiro/<id>`, `#/lugar/<id>`, `#/comer`, `#/planejar` (Maré e tempo + almanaque; `?ir=levar` rola até “O que levar”), `#/mapa`, `#/ajuda`, `#/beneficios`, `#/avaliacoes`, `#/feedback`, `#/meu-roteiro` (`?r=` roteiro recebido em base64url), `#/privacidade`. Rota desconhecida vira `inicio`.

### Painel: leitura e escrita
- `baixarConteudo()`: `GET /contents/dados/conteudo.json`; em 404, `GET /contents/conteudo.js` e `A.formato = 'js'`.
- `preparar_()` = `GuiaDados.normalizar` + `sanear()`. Vale ao abrir, no rascunho salvo, ao restaurar cópia, no editor JSON, nos conflitos e ao publicar. Base do merge e `remoto` também são normalizados.
- Publicação: `PUT` no **mesmo formato** lido (`JSON.stringify(o, null, 2)` + `\n`, ou `window.CONTEUDO = …;\n` no legado). Sempre grava o esquema atual.
- **Atualizar formato** (`atualizarFormato()`): oferecido uma vez por sessão (`sessionStorage['admin:formato-ofertado']`) e em Configurações › Formato dos dados. Recusa se o `index.html` publicado não referencia `assets/dados.js`. Cria `dados/conteudo.json` por commit a partir do publicado. Nunca apaga `conteudo.js`; **Apagar o conteudo.js antigo** é uma ação separada (`apagarLegado()`), com confirmação.
- `atualizarIndex()`: troca só o trecho entre `<!-- compartilhar:inicio -->` e `<!-- compartilhar:fim -->` (title, og:title, og:description, og:image, og:image:alt, og:url, twitter:card). Exige 1 doctype, 1 `<title>`, 1 `</html>`, nada fora do bloco alterado e bloco ≤ 4 KB. Sem marcadores, não toca no arquivo e avisa (“Conteúdo publicado. Aviso: …”).
- `compartilhar.jpg`: gerada no canvas ao publicar (JPEG 1200×630, recorte central) a partir de `config.og_imagem`, só quando a foto muda (hash em `?v=`). Se falhar, `og:image` aponta para a própria foto.
- Prévia: grava `localStorage['guia:rascunho']` e abre `../index.html?rascunho=1#/inicio`. O site lê, apaga do `localStorage`, guarda no `sessionStorage` da aba e normaliza igual. Com `?rascunho`, o SW não é registrado.
- Fotos: `PUT /contents/fotos/<nome>` direto, fora do rascunho. Canvas: máx. 1800 px, WebP 0,82 (ou JPEG 0,84). O canvas descarta EXIF.

### Contrato de dados (`assets/dados.js`)
- `GuiaDados.normalizar(bruto, avisos)` nunca lança exceção. Tipos: texto (`""`), número (aceita `"3"`, `"-9,5"`; senão `null`), sim/não (padrão por campo), data `AAAA-MM-DD` (senão `null`), lista (`[]`, itens inválidos descartados), objeto (campos padrão), foto/coordenada sem `src`/`lat` → `null`. Texto cortado em 20 000 caracteres.
- Campos desconhecidos são preservados e ignorados. `__proto__`, `constructor`, `prototype` são descartados.
- `ESQUEMA = 2`. `MIGRACOES[1]`: remove `versao`; `og_imagem` e fotos em texto viram `{src, alt}`. Esquema mais novo que o código é mantido (não rebaixa).
- Campo novo: declarar em `assets/dados.js`, descrever no gerador do `ESQUEMA.md` (`/home/claude/time/dados/ferramentas/gerar_esquema.py`; um teste falha se faltar descrição), desenhar dentro de `S(…)`. Campo opcional novo não sobe `ESQUEMA`; mudar formato de campo existente exige subir `ESQUEMA` e um degrau em `MIGRACOES`.
- Chaves de topo: `esquema`, `atualizado_em`, `casa`, `config`, `regiao` (inclui `o_que_levar`), `lugares` (com `nota_interna`), `destaques`, `roteiros`, `provar`, `contatos` (com `nota_interna`), `beneficios`, `avaliacoes`, `_confirmar`. A referência completa é `dados/ESQUEMA.md`.
- `nota_interna` e `_confirmar` não aparecem no site, **mas estão no arquivo público**. O detector de segredos verifica `nota_interna` e pula `_confirmar`.
- `_confirmar` tem hoje 27 itens (índices 0 a 26), listados no guia 5.

### Service worker (`sw.js`)
- `VERSAO = 'guia-v8'`; respostas `?acao=agenda` nunca entram no cache (só rede; cópia de 30 min em `sessionStorage['guia:agenda']`); cache de tiles `guia-tiles-v1` (máx. 200, FIFO, só respostas CORS não opacas). Incremente `VERSAO` ao mudar `ESSENCIAIS`.
- `ESSENCIAIS` inclui `dados/conteudo.json` e `assets/dados.js`. Cada arquivo entra no cache separadamente: se um faltar (repositório legado sem JSON), os outros entram.
- Navegação, `.html/.js/.css/.json` do site: rede primeiro com limite de 3 s, depois a cópia.
- Fontes, ícones e Leaflet (cdnjs): cache primeiro, atualização em segundo plano. Open-Meteo: sempre rede. `/admin/` nunca passa pelo cache.

## Contratos entre site e painel
1. **Link de estadia:** `<url>#/?ola=<nome>&in=AAAA-MM-DD&out=AAAA-MM-DD` (fragmento; espaços como `%20`). O site também aceita `?ola=` na query. Validação no site: nome de 1 a 40 caracteres no total, espaços incluídos (`^[\p{L}][\p{L}\p{M}' .-]*$`), datas ISO reais, 1 a 60 noites. Grava `localStorage['guia:estadia']`, limpa a URL com `replaceState` para `#/inicio` (também quando inválido) e apaga a estadia quando `hoje > out + 2 dias`. O painel (`hospede.js`, `validarEstadia`) aplica exatamente a mesma regra, então o que o painel aceita o site também aceita.
2. **Acesso:** link “Área do anfitrião” no rodapé → `admin/` (`rel=nofollow`).
3. **Demonstração:** `admin/?demo` lê `../dados/conteudo.json` (ou `../conteudo.js`), simula GitHub (arquivos, SHAs, conflitos, fotos, `index.html` com o bloco) e feedback em memória. Não lê nem grava armazenamento real.

### Chaves de armazenamento
| Onde | Chave | O quê |
|---|---|---|
| site, local | `guia:estadia` | `{nome, in, out, em}` |
| site, local | `guia:levar` | itens marcados de “O que levar” |
| site, local | `guia:roteiro` | `{ini, dias:[[cod…]]}` (`r:<id>` roteiro, `l:<id>` lugar) |
| site, local | `guia:modo-sol`, `guia:instalar-dispensado` | preferências |
| site, local→sessão | `guia:rascunho` | prévia |
| painel, local | `admin:cfg` | owner, repo, branch |
| painel, local | `admin:cofre` | cofre v2 cifrado |
| painel, local | `admin:acesso` | último hash visto (+ `trocadaAqui` por 30 min) |
| painel, local | `admin:tentativas` | `{n, ate}` |
| painel, local | `admin:rascunho`, `admin:fb-local`, `admin:fb-resolvidos`, `admin:virada` | rascunho, importados, resolvidos, checklist |
| painel, sessão | `admin:token`, `admin:token-exp`, `admin:fbchave`, `admin:cofre-chave`, `admin:formato-ofertado` | sessão aberta |

“Limpar meus dados” (site) apaga as cinco chaves `guia:*` e o `sessionStorage`. Só `guia:estadia` expira sozinha.

## Segurança

### Senha do painel (`admin/acesso.json`)
```json
{ "v": 1, "alg": "PBKDF2-SHA256", "iter": 600000, "sal": "<16 bytes base64>", "hash": "<32 bytes base64>", "atualizado_em": "<ISO>", "obs": "…" }
```
- O mesmo hash original está em `admin.js` (`ACESSO_ORIGINAL`). Se `acesso.json` der 404, vale o original: é o caminho de recuperação de senha esquecida.
- `carregarAcesso()` busca `acesso.json` com `no-store`. Por 30 min após trocar a senha neste aparelho, prefere o hash local (o Pages pode servir o antigo). Offline, usa o último visto.
- Comparação em tempo constante. `acessoValido()` exige iter entre 100 000 e 5 000 000.
- Tentativas: 2 livres; depois 30 s × 2^(n−3), até 900 s; persistem no `localStorage`.
- Troca (`trocarSenha`): confere a atual, recifra o cofre, grava `admin:acesso` local e faz `PUT admin/acesso.json`. Se o `PUT` falhar, mostra o JSON para colar à mão.
- Um teste confirma que `casapraia` não aparece em código, dados nem configuração (os guias em `docs/` citam de propósito).

### Cofre v2 (`localStorage['admin:cofre'] = {v:2, iter, sal, iv, ct}`)
- Conteúdo cifrado: `{token, exp, tokenAte, fbchave, privados:{wifi_rede, wifi_senha, wifi_tipo, wifi_oculta, portao, chaves, notas}, modelos:{…}}`.
- PBKDF2-SHA256 600 000 iterações, sal próprio (diferente do sal do hash), AES-GCM 256, IV de 12 bytes.
- Chave derivada exportada em `sessionStorage['admin:cofre-chave']` durante a sessão; fechar a aba tranca.
- `tokenAte` = validade do GitHub (`github-authentication-token-expiration`) ou agora + 30 dias. Vencido: só o token é descartado.
- Cofre trancado com outra senha (troca em outro aparelho ou a antiga “senha local” v1, 310 000 iterações): tela “Só mais um passo” pede a anterior uma vez e recifra; ou “Informar o token de novo” apaga o cofre.
- **Bloquear**: salva o rascunho e limpa só a sessão. **Sair**: apaga `admin:token`, `token-exp`, `token-lembrado`, `fbchave`, `fb-local`, `fb-resolvidos`, `rascunho`, `guia:rascunho`, `cofre`, `cofre-chave`. Ficam `admin:cfg`, `admin:acesso`, `admin:tentativas` e `admin:virada`.
- Um teste confirma que nenhum dado privado, senha ou nome de hóspede aparece em URL, corpo ou base64 enviado ao GitHub.

### CSP do painel (`<meta>`)
```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self';
img-src 'self' data: blob: https://raw.githubusercontent.com;
connect-src 'self' https://api.github.com https://script.google.com/macros/s/ https://script.googleusercontent.com;
frame-src 'none'; child-src 'none'; worker-src 'none'; manifest-src 'none'; media-src 'none';
object-src 'none'; base-uri 'none'; form-action 'none'
```
Mais `referrer: no-referrer` e `robots: noindex, nofollow`. O painel carrega `../assets/dados.js` sozinho (`garantirContrato()`) se o `<script>` não estiver no `admin/index.html`. O site tem `referrer: strict-origin-when-cross-origin` e **não tem CSP**.

### Validações
- `esc()` em tudo que vai para `innerHTML`, no site e no painel. Testes de corrupção cobrem `<img onerror>`, `<script>`, `<svg onload>`, `javascript:` e `__proto__` em todos os campos.
- `sanear()` valida datas, links http(s), `src` de foto (`fotos/…` sem `..`, ou `https://`), coordenadas, listas, notas e ids. Publicar exige `https://` em todos os links.
- **Detector de segredos** (`procurarSegredos`): só valores string, frase a frase. Pula chaves estruturais, `_confirmar` e `beneficios[].codigo`. “Forte” bloqueia; “ambíguo” exige confirmação. Heurística.
- `window.__admin` só com `?teste` **e** host `localhost`/`127.0.0.1`.

### Junção (merge)
`mesclar(base, minha, deles)`: três vias, por seção no topo e segundo nível em `casa`, `config`, `regiao`. Listas com `id` em todos os itens (`lugares`, `roteiros`, `beneficios`) se juntam por `id`. Listas sem `id` (`contatos`, `avaliacoes`, `provar`, `destaques`) e terceiro nível (todo `casa.chegada`) são comparados inteiros. Conflito bloqueia a publicação até a escolha.

## Apps Script (`integracoes/feedback-apps-script.gs`)
- `doPost` com `{acao:'listar', chave, desde?}` → `{ok, itens:[{data, nota, temas, mensagem, nome, publicar, origem}], total}` (máx. 500, os mais recentes), ou `{ok:false, erro:'não autorizado'}`, ou `erro:'chave curta: …'` se `CHAVE_LEITURA` < 24.
- Outro `doPost` é envio: `{ok:true}` ou `erro: 'grande demais'|'formato inválido'|'recusado'|'mensagem curta'|'ocupado'|'limite'|'repetido'|'falha ao gravar'`. Corpo > 8000 é recusado antes do `JSON.parse`.
- Limites: 40/hora (`CacheService`, janela fixa), 150/dia (`PropertiesService['CONTADOR_DIA']`, dia de America/Maceio), dedup de 6 h por SHA-256.
- Colunas: `data, nota, temas, mensagem, nome, publicar, origem, data_local`. Em planilhas antigas o cabeçalho `data_local` não é criado sozinho (`aba_()` só escreve cabeçalho em aba nova).
- `EMAIL_ALERTA`: `MailApp.sendEmail` para nota ≤ 2, máx. 20/dia; falha não perde o feedback.
- `DIAS_GUARDA` (padrão 730, mín. 30): `limpar_()` apaga linhas com `data` ISO mais antiga; `instalarLimpezaMensal()` cria gatilho no dia 1, 4h. **A confirmar em produção:** o gatilho aponta para `limpar_`, função com sublinhado final (privada no Apps Script). Se a execução mensal falhar com “função não encontrada”, renomeie para um nome sem sublinhado e reinstale o gatilho.
- `doGet` → `{ok:false, erro:'use POST'}`. Ao mudar o código: Gerenciar implantações → Editar → **Nova versão** (o `/exec` não muda).
- O site envia `no-cors` e nunca lê a resposta.

## Testes

Ficam fora do repositório, em `/home/claude/time/`. Requisitos: Python 3, Playwright com Chromium, Node 22; para QR, OpenCV e libzbar.

| Suíte | O que cobre | Resultado em 27/10 |
|---|---|---|
| `dados/dados_teste.py` (porta 8831) | Carregamento JSON/legado/404/500/quebrado/offline, normalização, corrupção, isolamento | 49/49 |
| `dados/sobreposicao_teste.py` | Repositório antigo publicado + pacote de código por cima | 13/13 |
| `admin-v3/admin_teste.py` (porta 8822) | Senha, cofre, token, demonstração, publicar, merge, detector, XSS, CSP, fotos, hospedagem, impressos, formato dos dados, bloco do index | 286/286 |
| `admin-v3/gs_teste.js` | Apps Script em Node com serviços simulados | 18 |
| `admin-v3/qr_teste.py` | `qr.js` comparado ao OpenCV e ZBar (47 textos, inclusive Wi-Fi) | OK |
| `design-v3/testes.py`, `gadgets.py`, `largura.py`, `contraste.py`, `cap.py` | Tipografia, gadgets, rolagem de 320 a 1440 px, contraste AA, capturas | 40/40, 42/42, OK |

Teste à mão: `python3 -m http.server 8000 -d .` e abra `http://localhost:8000/` e `http://localhost:8000/admin/?demo`.

## Limitações conhecidas
1. **Origem compartilhada `<owner>.github.io`.** Outro repositório Pages do mesmo usuário alcança o mesmo `localStorage`/`sessionStorage`. O cofre protege o que está guardado, mas o token em uso fica em claro no `sessionStorage` durante a sessão. Defesa completa: painel num subdomínio próprio.
2. **Hash público.** `admin/acesso.json` é público; uma senha fraca pode ser testada offline. O impacto é limitado a quem tem o aparelho (o cofre fica só nele), mas recomende uma frase longa.
3. **Validade do token:** depende de o GitHub expor `github-authentication-token-expiration` via CORS. Sem isso, o painel só não mostra a validade.
4. **Leitura do feedback** por `POST text/plain` com redirecionamento para `script.googleusercontent.com`: não testada contra o Google real.
5. **Envio às cegas** (`no-cors`): o site não sabe se o script recusou.
6. **O site não tem CSP**; Leaflet vem do cdnjs (1.9.4 fixa) sem SRI.
7. **Reserva pelo `conteudo.js`:** enquanto o legado existir, um JSON quebrado faz o site mostrar o conteúdo antigo (intencional).
8. **Merge sem `id`:** edições simultâneas em contatos diferentes geram conflito na lista inteira.
9. **Página Privacidade** diz que “tudo se apaga sozinho dois dias depois do check-out”, mas só `guia:estadia` expira; lista da praia, roteiro e preferências ficam até “Limpar meus dados”.
10. **Fontes em WOFF** (o ambiente não tinha `brotli`); WOFF2 economizaria cerca de 30%.
11. **Fotos não usadas** continuam públicas no repositório até serem apagadas pela tela Fotos.


## Reserva e agenda (28/10/2026)
- `casa.link_reserva` (só https): botão `.btn-reserva` na capa (`data-reserva-hero`), `[data-reservar]` no topo (≥ 960 px; escondido com `.na-capa` enquanto o botão da capa está visível), rodapé e agenda. Rótulo "Reservar no Airbnb" se o host é airbnb.*.
- `config.agenda_visivel` (bool, padrão false, em `assets/dados.js`). Seção `S('início: agenda')` e página `#/disponibilidade`, desenhadas por `assets/agenda.js` (`GuiaAgenda.validar/montar/proximaLivre`, também usado pelo painel). Dados: `GET <config.feedback_endpoint>?acao=agenda` → `{ok, ocupado:[[ini,fimExclusivo]], de, ate, atualizado, parcial}`.
- Falha (rede, HTTP, `ok:false`, formato) → `agendaFalhou()`: botão "Ver disponibilidade no Airbnb" ou a seção some. Sem `agenda.js` → sem seção.
- Testes: `/home/claude/time/reserva/reserva_teste.py`.

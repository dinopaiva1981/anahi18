# 9. Atualizar o código sem mexer no conteúdo (e vice-versa)

O repositório do guia tem duas partes que não se misturam:

- **Dados**: o que você escreve e as fotos. Mudam pelo painel.
- **Código**: a aparência e o funcionamento do site e do painel. Mudam quando um programador manda uma versão nova.

Uma não estraga a outra. Você pode publicar textos todos os dias sem tocar no código. E um programador pode trocar o código sem apagar o que você escreveu.

## O que é dado e o que é código

| Pasta ou arquivo | É… | Quem muda |
|---|---|---|
| `dados/conteudo.json` | **Dados**: todo o conteúdo do guia (textos, lugares, roteiros, contatos) | O painel, ao **Publicar** |
| `dados/ESQUEMA.md` | Explicação de cada campo dos dados, para programadores | Programador |
| `fotos/` | **Dados**: as fotos enviadas | O painel, na tela **Fotos** |
| `compartilhar.jpg` | **Dados**: a imagem que aparece no WhatsApp (1200 × 630) | O painel, ao **Publicar** |
| `admin/acesso.json` | **Dados**: o código embaralhado da senha do painel | O painel, ao **Trocar a senha** |
| `conteudo.js` | Formato **antigo** dos dados. Só existe em guias publicados antes de 27/10/2026 | Ninguém, depois de **Atualizar formato** |
| `index.html` | **Código**: a “casca” do site | Programador. O painel só troca o título e a prévia do WhatsApp (veja abaixo) |
| `assets/` | **Código**: aparência, fontes, ilustrações, mapa, maré, e o contrato dos dados (`assets/dados.js`) | Programador |
| `admin/` (menos `acesso.json`) | **Código**: o painel | Programador |
| `sw.js`, `manifest.webmanifest`, ícones | **Código**: modo offline e instalação no celular | Programador |
| `integracoes/`, `marca/`, `docs/` | Código do feedback, arquivos da marca e estes guias | Programador |

### O único trecho de código que o painel toca

No `index.html` há um bloco entre duas marcas:

```html
<!-- compartilhar:inicio -->
… título do site e prévia do WhatsApp …
<!-- compartilhar:fim -->
```

Ao publicar, o painel reescreve **só o que está entre essas duas marcas**. O resto do arquivo nunca muda.

Se as marcas não existirem (código antigo ou arquivo editado à mão), o painel **não mexe** no `index.html`. A publicação dos dados acontece normalmente, e aparece “Conteúdo publicado. Aviso: …”. Para resolver, suba o código novo (Parte A).

---

## Parte A · Atualizar o código (quando o programador mandar uma versão nova)

Há dois pacotes. **Use só um.**

| Pacote | Quando usar |
|---|---|
| `casa18-atualizacao-codigo.zip` | **O site já está no ar.** Traz só código. Não traz `conteudo.js`, `dados/`, `fotos/`, `admin/acesso.json` nem `compartilhar.jpg`. Nada do seu conteúdo, das suas fotos ou da sua senha é apagado |
| `casa18-completo.zip` | **Instalação nova**, num repositório vazio (guia 1). Traz tudo, inclusive os dados e a senha inicial. **Nunca suba este por cima de um site no ar**: ele trocaria o seu conteúdo e a sua senha |

**Passo a passo (pacote de atualização):**
1. Antes, no painel, publique o que estiver pendente e baixe uma cópia: **Configurações → Baixar cópia (.json)**.
2. No computador, abra o arquivo `casa18-atualizacao-codigo.zip` (dois cliques). Aparece uma pasta.
3. No **github.com**, abra o repositório do guia.
4. Toque em **Add file → Upload files**.
5. Abra a pasta do pacote, selecione **tudo o que está dentro dela** e arraste para a página. Use Chrome, Edge ou Firefox, que mantêm as subpastas.
6. Espere a lista terminar de carregar e toque em **Commit changes**.
7. Espere alguns minutos e abra o guia. Se o celular mostrar a versão antiga, feche e abra o guia de novo.
8. Abra o painel e publique qualquer pequena mudança. Assim o painel preenche o título e a prévia do WhatsApp no `index.html` novo.

Os arquivos com o mesmo nome são substituídos. Os seus dados ficam como estão.

**Nunca suba um `conteudo.js` ou um `dados/conteudo.json` de uma cópia antiga.** Ele apagaria o que você publicou pelo painel. Para voltar a uma cópia, use **Configurações → Restaurar cópia**.

---

## Parte B · Atualizar formato (guias publicados antes de 27/10/2026)

Os guias antigos guardam o conteúdo em `conteudo.js`. O formato novo usa `dados/conteudo.json`, separado do código. A troca é feita pelo painel, com um botão, e nada se perde.

1. **Primeiro, suba o código novo** (Parte A). O site novo continua lendo o `conteudo.js` enquanto o `dados/conteudo.json` não existir. Nada quebra.
2. Abra o painel e entre. Ele mostra a janela **Atualizar o formato dos dados**.
   - Ela aparece uma vez por sessão. Se tocar em **Agora não**, o botão continua em **Configurações → Formato dos dados**.
3. Toque em **Atualizar formato**.
4. O painel cria `dados/conteudo.json` com o conteúdo publicado hoje. Aparece: “Formato atualizado: dados/conteudo.json criado. O conteudo.js antigo continua no repositório até você apagar em Configurações.”
5. Abra o guia no celular e confira se está tudo lá.
6. Alguns dias depois, com tudo funcionando, abra **Configurações → Formato dos dados** e toque em **Apagar o conteudo.js antigo**. Confirme.

Se aparecer “Não atualizei o formato: o código do site no GitHub ainda é o antigo…”, volte ao passo 1. O painel recusa de propósito: o site antigo continuaria lendo o `conteudo.js` e não veria as suas mudanças.

Até você tocar em **Atualizar formato**, o painel continua publicando no `conteudo.js`. Tudo funciona.

Enquanto o `conteudo.js` existir, ele serve de reserva: se o `dados/conteudo.json` tiver algum problema, o site mostra o conteúdo antigo em vez de uma tela de erro. Por isso o botão de apagar é separado.

---

## Parte C · Mudar o conteúdo sem mexer no código

- **Pelo painel** (o jeito normal): edite e toque em **Publicar**. O painel grava só os dados, as fotos, a `compartilhar.jpg` e o bloco do `index.html`.
- **À mão no GitHub** (só quem entende de JSON): edite `dados/conteudo.json`. Cada campo está explicado em `dados/ESQUEMA.md`.

E se um dado vier errado?
- O site arruma o que der: campo vazio ou com tipo errado vira o valor padrão.
- Um item com problema some sozinho; os outros continuam.
- Se uma seção não abrir, só ela some; o resto da página continua.
- Se a página inteira não abrir, aparece “Esta parte não abriu agora.”, com botões para o Início e a Ajuda. O topo, o menu e o rodapé continuam.
- Se o arquivo inteiro estiver quebrado, o celular que já abriu o guia usa a cópia guardada. Quem nunca abriu vê uma mensagem com os telefones de emergência (192, 193, 190) e o botão **Tentar de novo**.
- Textos são sempre mostrados como texto: um código colado num campo não roda no site.

---

## Para o programador: campo novo

1. Declare o campo em `assets/dados.js` (objeto do esquema).
2. Descreva o campo no gerador do `dados/ESQUEMA.md` e gere o arquivo de novo.
3. No `assets/site.js`, desenhe a seção dentro de `S('página: seção', () => …)`, para que um erro nela não derrube a página.

Campo opcional novo não muda o número do esquema. Mudar o formato de um campo existente exige subir `ESQUEMA` e escrever um degrau em `MIGRACOES`. Detalhes no guia 6.

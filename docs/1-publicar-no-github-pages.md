# 1. Publicar o guia no GitHub Pages

Aqui você coloca o site no ar pela primeira vez. Leva uns 15 minutos. Não precisa instalar nada: tudo é feito pelo site do GitHub, no computador.

> **GitHub** é um serviço que guarda arquivos.
> **Repositório** é uma pasta no GitHub.
> **GitHub Pages** é o serviço gratuito do GitHub que transforma essa pasta num site.

O site do GitHub é em inglês. Os nomes dos botões aparecem aqui como estão na tela, com a tradução ao lado.

---

## Passo 1 · Criar a conta

1. Abra **github.com** e toque em **Sign up** (cadastrar).
2. Informe e-mail, senha e um nome de usuário.
   - O nome de usuário entra no endereço do site. Exemplo: `casa18anahi` gera `casa18anahi.github.io`.
   - Use só letras minúsculas, números e hífen.
3. Confirme o e-mail com o código que o GitHub enviar.
4. Recomendado: ative a verificação em duas etapas em **Settings → Password and authentication**. Ela protege a conta, que é o que publica o seu site.

## Passo 2 · Criar o repositório

1. Já com a conta aberta, toque no **+** no alto da tela e depois em **New repository** (novo repositório).
2. Em **Repository name**, escreva um nome curto. Exemplo: `guia`.
3. Marque **Public** (público).
   - No plano grátis, o GitHub Pages só funciona com repositório público.
   - Tudo bem: o guia já é público, e nenhuma senha fica nos arquivos.
4. Não marque nenhuma outra opção (README, .gitignore, license).
5. Toque em **Create repository** (criar repositório).

## Passo 3 · Enviar os arquivos (arrastando)

Você vai precisar da pasta do guia no computador. Ela tem `index.html`, `conteudo.js` e as pastas `admin`, `assets`, `integracoes`, `marca` e `fotos`.

1. Na página do repositório novo, toque no link **uploading an existing file** (enviar um arquivo existente).
   - Se o repositório já tiver arquivos, use **Add file → Upload files**.
2. Abra a pasta do guia no computador.
3. Selecione **tudo o que está dentro dela** (não a pasta em si) e arraste para a área da página.
   - O `index.html` precisa ficar na "raiz", isto é, solto no começo do repositório, e não dentro de outra pasta.
   - Use Chrome, Edge ou Firefox: eles mantêm as subpastas ao arrastar.
4. Espere a lista de arquivos terminar de carregar.
5. Lá embaixo, em **Commit changes**, toque no botão verde **Commit changes** (gravar as mudanças).
6. Confira se, na página do repositório, aparecem `index.html`, `conteudo.js`, `admin`, `assets` e as outras pastas.

### E os arquivos que começam com ponto?

A pasta tem dois arquivos vazios que o computador costuma esconder: `.nojekyll` e `fotos/.gitkeep`.

- Se o `.nojekyll` não aparecer na lista do repositório, crie à mão:
  1. **Add file → Create new file** (criar arquivo).
  2. No nome, escreva `.nojekyll` (com o ponto).
  3. Deixe o conteúdo vazio e toque em **Commit changes**.
- A pasta `fotos` pode não aparecer se ficar vazia. Não tem problema: o painel cria a pasta quando você enviar a primeira foto.

## Passo 4 · Ativar o GitHub Pages

1. No repositório, toque em **Settings** (configurações), na barra do alto.
2. No menu da esquerda, toque em **Pages**.
3. Em **Build and deployment → Source**, escolha **Deploy from a branch** (publicar a partir de um ramo).
4. Em **Branch**, escolha **main** e a pasta **/ (root)**.
   - *Branch* é a "versão principal" dos arquivos. Aqui ela se chama `main`.
5. Toque em **Save** (salvar).
6. Espere de 1 a 2 minutos e recarregue a página. No alto aparece **Your site is live at …** (seu site está no ar em …), com o endereço.

## Passo 5 · O endereço final

O endereço segue este modelo:

| O quê | Endereço |
|---|---|
| Guia do hóspede | `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/` |
| Painel do anfitrião | `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/admin/` |

Exemplo: usuário `casa18anahi` e repositório `guia` ficam `https://casa18anahi.github.io/guia/` e `https://casa18anahi.github.io/guia/admin/`.

Exceção: se o repositório se chamar exatamente `SEU-USUARIO.github.io`, o guia fica direto em `https://SEU-USUARIO.github.io/`.

O painel descobre esse endereço sozinho a partir do usuário e do repositório. Ele aparece no cartão do QR Code (guia 4).

Guarde o endereço do painel nos favoritos do seu celular e do computador.

## Passo 6 (opcional) · Domínio próprio

Se você tiver um domínio, por exemplo `guia.casa18anahi.com.br`:

1. No painel de quem vende o seu domínio (Registro.br, GoDaddy etc.), crie um registro **CNAME**:
   - Nome: `guia`
   - Valor: `SEU-USUARIO.github.io`
   - *CNAME é um apelido: ele diz que `guia.seudominio` aponta para o GitHub.*
2. No GitHub, volte em **Settings → Pages**.
3. Em **Custom domain** (domínio próprio), escreva `guia.casa18anahi.com.br` e toque em **Save**.
4. Espere a checagem ficar verde. Pode levar de alguns minutos a algumas horas.
5. Marque **Enforce HTTPS** (forçar conexão segura) quando a opção ficar disponível.
6. No painel do anfitrião, abra **QR Code** e preencha **Endereço do site** com `https://guia.casa18anahi.com.br/`. Depois toque em **Publicar**.
   - O QR Code e a imagem de compartilhamento passam a usar o endereço novo.

Atenção:
- Com o domínio próprio, o painel passa a ficar em `https://guia.casa18anahi.com.br/admin/`.
- O navegador trata o endereço novo como outro site. Você vai precisar **entrar de novo** no painel (com o token) e refazer o "Lembrar neste aparelho".
- Faça o domínio **antes** de imprimir os cartões com QR Code.

## Quanto tempo leva para atualizar

- Depois de **Publicar** no painel, o GitHub leva **cerca de 1 minuto** para refazer o site.
- O GitHub guarda uma cópia do site por **até uns 10 minutos**. Por isso, às vezes, quem já abriu o guia ainda vê a versão anterior nesse intervalo.
- Para conferir na hora: abra o guia numa aba anônima, ou recarregue a página.
- O guia também guarda uma cópia no celular do hóspede, para abrir sem sinal. Com internet, ele sempre busca a versão nova primeiro.

## Se algo der errado

| O que acontece | O que fazer |
|---|---|
| O endereço mostra "404" | Espere 2 minutos. Confira se o `index.html` está na raiz e se o Pages está em **main / (root)** |
| O site abre sem cores nem ícones | A pasta `assets` não subiu. Envie de novo, arrastando a pasta `assets` inteira |
| O painel diz "Não encontrei o arquivo conteudo.js na raiz do repositório" | O `conteudo.js` não subiu ou ficou dentro de outra pasta |

## Atualizar o código depois

Se um programador mandar arquivos novos (por exemplo, `assets/site.js`), envie só esses arquivos por **Add file → Upload files**. O GitHub substitui os que têm o mesmo nome.

**Nunca envie o `conteudo.js` de uma cópia antiga.** Ele apagaria tudo o que você publicou pelo painel.

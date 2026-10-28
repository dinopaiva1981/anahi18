# 1. Publicar o guia no GitHub Pages (instalação)

Este guia é para a **primeira instalação**. Leva uns 15 minutos, no computador. Não precisa instalar nada.

Se o site **já está no ar** e você recebeu uma versão nova do código, não use este guia: use o guia 9.

> **GitHub** é um serviço que guarda arquivos.
> **Repositório** é uma pasta no GitHub.
> **GitHub Pages** é o serviço gratuito do GitHub que transforma essa pasta num site.

O site do GitHub é em inglês. Os nomes dos botões aparecem aqui como estão na tela, com a tradução ao lado.

---

## Passo 1 · Criar a conta

1. Abra **github.com** e clique em **Sign up** (cadastrar).
2. Informe e-mail, senha e um nome de usuário.
   - O nome de usuário entra no endereço do site. Exemplo: `casa18anahi` gera `casa18anahi.github.io`.
   - Use só letras minúsculas, números e hífen.
3. Confirme o e-mail com o código que o GitHub enviar.
4. Recomendado: ative a verificação em duas etapas em **Settings → Password and authentication**. Ela protege a conta que publica o seu site.

## Passo 2 · Criar o repositório

1. Clique no **+** no alto da tela e depois em **New repository** (novo repositório).
2. Em **Repository name**, escreva um nome curto. Exemplo: `guia`.
3. Marque **Public** (público).
   - No plano grátis, o GitHub Pages só funciona com repositório público.
   - Tudo bem: o guia já é público, e nenhuma senha fica nos arquivos. A senha do painel fica só como código embaralhado.
4. Não marque nenhuma outra opção (README, .gitignore, license).
5. Clique em **Create repository** (criar repositório).

## Passo 3 · Enviar os arquivos (arrastando)

Use o pacote **`casa18-completo.zip`**. Ele é só para instalação nova.

1. No computador, abra o zip (dois cliques). Aparece uma pasta com `index.html` e as pastas `dados`, `admin`, `assets`, `docs`, `integracoes`, `marca` e `fotos`.
2. Na página do repositório novo, clique no link **uploading an existing file** (enviar um arquivo existente).
   - Se o repositório já tiver arquivos, use **Add file → Upload files**.
3. Selecione **tudo o que está dentro da pasta** (não a pasta em si) e arraste para a página.
   - O `index.html` precisa ficar solto no começo do repositório, e não dentro de outra pasta.
   - Use Chrome, Edge ou Firefox: eles mantêm as subpastas ao arrastar.
4. Espere a lista de arquivos terminar de carregar.
5. Lá embaixo, clique no botão verde **Commit changes** (gravar as mudanças).
6. Confira se aparecem `index.html`, `dados`, `admin`, `assets` e as outras pastas.

### E os arquivos que começam com ponto?

O computador costuma esconder o arquivo vazio `.nojekyll`. Se ele não aparecer no repositório, crie à mão:
1. **Add file → Create new file** (criar arquivo).
2. No nome, escreva `.nojekyll` (com o ponto).
3. Deixe o conteúdo vazio e clique em **Commit changes**.

A pasta `fotos` pode não aparecer se estiver vazia. Não tem problema: o painel cria a pasta na primeira foto.

## Passo 4 · Ativar o GitHub Pages

1. No repositório, clique em **Settings** (configurações), na barra do alto.
2. No menu da esquerda, clique em **Pages**.
3. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
4. Em **Branch**, escolha **main** e a pasta **/ (root)**. *Branch* é a versão principal dos arquivos.
5. Clique em **Save** (salvar).
6. Espere 1 ou 2 minutos e recarregue. No alto aparece **Your site is live at …** (seu site está no ar em …), com o endereço.

## Passo 5 · O endereço final

| O quê | Endereço |
|---|---|
| Guia do hóspede | `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/` |
| Painel do anfitrião | o mesmo, terminado em `admin/`. Também abre pelo link **Área do anfitrião**, no rodapé do guia |

Exemplo: usuário `casa18anahi` e repositório `guia` ficam `https://casa18anahi.github.io/guia/` e `https://casa18anahi.github.io/guia/admin/`.

Exceção: se o repositório se chamar exatamente `SEU-USUARIO.github.io`, o guia fica direto em `https://SEU-USUARIO.github.io/`.

**Primeira entrada no painel:** senha inicial `casaalagoas` e, só na primeira vez em cada aparelho, o token (guia 2, Partes B e C). Depois, troque a senha (guia 2, Parte G).

## Passo 6 (opcional) · Domínio próprio

Se você tiver um domínio, por exemplo `guia.casa18anahi.com.br`:

1. No painel de quem vende o domínio (Registro.br, GoDaddy etc.), crie um registro **CNAME**:
   - Nome: `guia`
   - Valor: `SEU-USUARIO.github.io`
2. No GitHub, volte em **Settings → Pages**.
3. Em **Custom domain** (domínio próprio), escreva `guia.casa18anahi.com.br` e clique em **Save**.
4. Espere a checagem ficar verde. Pode levar de minutos a algumas horas.
5. Marque **Enforce HTTPS** (forçar conexão segura) quando a opção aparecer.
6. No painel do anfitrião, abra **QR Code do guia** e preencha **Endereço do site** com `https://guia.casa18anahi.com.br/`. Depois clique em **Publicar**.

Atenção:
- O painel passa a ficar em `https://guia.casa18anahi.com.br/admin/`.
- O navegador trata o endereço novo como outro site. Abra o painel no endereço novo, digite a senha e cole o token uma vez. Os **Dados privados** e os modelos de mensagem precisam ser cadastrados de novo nesse endereço.
- Faça o domínio **antes** de imprimir os cartões com QR.

## Quanto tempo leva para atualizar

- Depois de **Publicar** no painel, o site atualiza em alguns minutos.
- Quem já abriu o guia pode levar uns 10 minutos para ver a mudança.
- Para conferir na hora, abra o guia numa aba anônima.
- O guia guarda uma cópia no celular do hóspede, para abrir sem sinal. Com internet, ele busca a versão nova primeiro (espera até 3 segundos).

## Se algo der errado

| O que acontece | O que fazer |
|---|---|
| O endereço mostra “404” | Espere 2 minutos. Confira se o `index.html` está no começo do repositório e se o Pages está em **main / (root)** |
| O site abre sem cores nem ícones | A pasta `assets` não subiu. Envie de novo, arrastando a pasta `assets` inteira |
| O guia mostra a mensagem com os telefones de emergência e **Tentar de novo** | Os dados não carregaram. Confira se a pasta `dados` com `conteudo.json` subiu |
| O painel diz “Não encontrei os dados do guia no repositório…” | A pasta `dados` não subiu, ou ficou dentro de outra pasta |

## Atualizar o código depois

Veja o guia 9. Resumo: use o pacote **`casa18-atualizacao-codigo.zip`**, que não traz os seus dados nem a sua senha.

**Nunca envie o `casa18-completo.zip`, um `dados/conteudo.json` ou um `conteudo.js` antigo por cima de um site no ar.** Eles apagariam o que você publicou pelo painel.

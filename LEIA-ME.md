# Casa 18 Anahi · Guia do hóspede

Este repositório guarda o **guia digital da Casa 18 Anahi**, na Praia do Marceneiro (Passo de Camaragibe, AL), na Rota dos Milagres.

O hóspede abre o guia no celular, pelo QR Code que fica na casa ou pelo link que você manda. Lá ele encontra a casa, a chegada e a saída, as praias, a maré, o tempo, onde comer, os contatos úteis, o seu próprio roteiro e um formulário de feedback.

Você, anfitrião, cuida de tudo por um **painel** no navegador. Não precisa saber programar.

## Onde fica o painel

- No guia, desça até o fim da página e toque em **Área do anfitrião**, no rodapé.
- Ou abra o endereço do guia terminado em `/admin/`.
- A senha inicial é **casapraia**. Troque por uma frase sua em **Configurações** (guia 2, Parte G).
- Na primeira vez em cada aparelho, o painel pede também o **token** do GitHub, uma vez só (guia 2, Parte C).
- Para conhecer sem medo: **Conhecer em modo demonstração**, na tela de entrada. Nada é publicado.

## Guias

**Para o anfitrião (dia a dia)**

| # | Guia | Para quê |
|---|---|---|
| 0 | [Meu dia a dia](docs/0-meu-dia-a-dia.md) | Uma folha para imprimir: entrar, mudar, publicar, receber hóspede |
| 2 | [Painel do anfitrião](docs/2-painel-do-anfitriao.md) | Senha, token, Bloquear × Sair, esqueci a senha, demonstração, editar, publicar |
| 7 | [Receber um hóspede](docs/7-receber-hospede.md) | Link personalizado, mensagens prontas, dados privados, cartão do Wi-Fi, kit A6, virada |
| 8 | [O que seu hóspede encontra](docs/8-o-que-seu-hospede-encontra.md) | Os recursos do guia, em resumo |
| 4 | [QR Code e divulgação](docs/4-qr-code-e-divulgacao.md) | Cartões, onde deixar, prévia no WhatsApp, arquivos da marca |
| 5 | [Checklist de lançamento](docs/5-checklist-de-lancamento.md) | Tudo o que precisa ser confirmado antes de divulgar |

**Para quem instala ou atualiza**

| # | Guia | Para quê |
|---|---|---|
| 1 | [Publicar no GitHub Pages](docs/1-publicar-no-github-pages.md) | Primeira instalação |
| 3 | [Feedback e planilha](docs/3-feedback-e-planilha.md) | Ligar o formulário a uma planilha do Google, alerta por e-mail |
| 9 | [Atualizar o código sem mexer no conteúdo](docs/9-atualizar-codigo-sem-mexer-no-conteudo.md) | O que é dado e o que é código; pacote de atualização; **Atualizar formato** |
| 6 | [Para quem for mexer no código](docs/6-para-quem-for-mexer-no-codigo.md) | Parte técnica, para um programador |

## Reserva e agenda (opcionais)
- O conteúdo fica em `dados/conteudo.json` (esquema em `dados/ESQUEMA.md`); o código não muda quando o conteúdo muda.
- **Botão de reserva**: painel › A casa › Reservas e disponibilidade › link do anúncio (https).
- **Agenda de disponibilidade**: crie `ICAL_URL` nas Propriedades do script do Apps Script, **reimplante como nova versão** e ligue “Mostrar a agenda no site” (guia 3, Parte G). O link iCal nunca vai para o site.

## O que tem em cada pasta

| Arquivo ou pasta | O que é | Você mexe? |
|---|---|---|
| `dados/conteudo.json` | **Todo o conteúdo** do guia: textos, lugares, roteiros, contatos | Só pelo painel |
| `dados/ESQUEMA.md` | Explicação de cada campo do conteúdo | Não. É para programadores |
| `fotos/` | As fotos enviadas pelo painel | Pelo painel, na tela **Fotos** |
| `compartilhar.jpg` | A imagem da prévia no WhatsApp. O painel cria ao publicar | Não |
| `admin/acesso.json` | O código embaralhado da senha do painel (nunca a senha) | Não. Só apague se esquecer a senha (guia 2, Parte E) |
| `index.html` | A “casca” do site | Não. O painel atualiza só o título e a prévia do WhatsApp |
| `assets/` | Aparência e funcionamento do site | Não |
| `admin/` | O painel do anfitrião | Não. Você só usa |
| `integracoes/feedback-apps-script.gs` | O código que liga o feedback à planilha | Só copia e cola (guia 3) |
| `marca/` | Logo e símbolo em SVG, para gráfica e redes | Use quando precisar (guia 4) |
| `sw.js`, `manifest.webmanifest`, ícones | Fazem o guia abrir com sinal fraco e ser “instalado” no celular | Não |
| `docs/` | Estes guias | Não |
| `.nojekyll` | Arquivo vazio que o GitHub Pages precisa | Não apague |

Guias publicados antes de 27/10/2026 têm também um `conteudo.js` (formato antigo). O painel oferece **Atualizar formato** para passar para `dados/conteudo.json` (guia 9, Parte B).

## Quatro regras que valem sempre

1. **Senhas e códigos nunca no site nem no GitHub.** O guia é público. O painel bloqueia a publicação se encontrar algo parecido.
   - O **cartão do Wi-Fi**, impresso pelo painel, pode ficar **dentro da casa**. Ele não é publicado.
   - **Portão, cofre e chaves: só por mensagem**, ao hóspede confirmado (tela **Receber hóspede**).
   - Wi-Fi e portão ficam guardados só no seu aparelho, em **Dados privados**.
2. **Nada vai ao ar sem você tocar em Publicar.** O que você edita fica num rascunho até lá.
3. **Dados e código não se misturam.** O painel só grava dados. Para atualizar o código, use o pacote `casa18-atualizacao-codigo.zip`, que não traz o seu conteúdo nem a sua senha (guia 9).
4. **Nunca envie pelo GitHub um `dados/conteudo.json` ou `conteudo.js` de uma cópia antiga**, nem o pacote completo por cima de um site no ar. Isso apagaria o que você publicou. Para guardar uma cópia, use **Configurações → Baixar cópia (.json)**.

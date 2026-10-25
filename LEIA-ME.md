# Casa 18 Anahi · Guia do hóspede

Este repositório guarda o **guia digital da Casa 18 Anahi**, na Praia do Marceneiro (Passo de Camaragibe, AL), na Rota dos Milagres.

O hóspede abre o guia no celular, pelo QR Code que fica na casa. Lá ele encontra a casa, a chegada e a saída, as praias, a maré, o tempo, onde comer, os contatos úteis e um formulário de feedback.

Você, anfitrião, cuida de tudo por um **painel** no navegador. Não precisa saber programar.

- O site fica hospedado de graça no **GitHub Pages**. GitHub é um serviço que guarda arquivos e publica sites.
- O painel fica no mesmo endereço, terminado em `/admin/`.
- O feedback dos hóspedes pode ir para uma **planilha do Google**, que é só sua.

## Por onde começar

Siga os guias nesta ordem:

| # | Guia | Para quê |
|---|---|---|
| 1 | [Publicar no GitHub Pages](docs/1-publicar-no-github-pages.md) | Colocar o site no ar pela primeira vez |
| 2 | [Painel do anfitrião](docs/2-painel-do-anfitriao.md) | Entrar, editar, pôr fotos, publicar |
| 3 | [Feedback e planilha](docs/3-feedback-e-planilha.md) | Receber e ler o que os hóspedes dizem |
| 4 | [QR Code e divulgação](docs/4-qr-code-e-divulgacao.md) | Imprimir o cartão, compartilhar no WhatsApp, usar a marca |
| 5 | [Checklist de lançamento](docs/5-checklist-de-lancamento.md) | Tudo o que precisa ser confirmado antes de divulgar |
| 6 | [Para quem for mexer no código](docs/6-para-quem-for-mexer-no-codigo.md) | Parte técnica, para um programador |

## O que tem em cada pasta

| Arquivo ou pasta | O que é | Você mexe? |
|---|---|---|
| `index.html` | A "casca" do site: topo, menu e rodapé | Não. O painel atualiza o título e a imagem de compartilhamento sozinho |
| `conteudo.js` | **Todo o conteúdo** do guia: textos, lugares, roteiros, contatos | Só pelo painel |
| `assets/` | Aparência e funcionamento do site (cores, ilustrações, logo, mapa, maré) | Não |
| `admin/` | O painel do anfitrião | Não. Você só usa |
| `integracoes/feedback-apps-script.gs` | O código que liga o feedback à planilha do Google | Só copia e cola (guia 3) |
| `fotos/` | As fotos enviadas pelo painel | Pelo painel, na tela **Fotos** |
| `marca/` | Logo e símbolo em arquivos SVG, para gráfica e redes | Use quando precisar (guia 4) |
| `sw.js`, `manifest.webmanifest` | Fazem o guia abrir mesmo com sinal fraco e permitem "instalar" no celular | Não |
| `icone-192.png`, `icone-512.png`, `apple-touch-icon.png` | Ícones do guia no celular | Não |
| `.nojekyll` | Arquivo vazio que o GitHub Pages precisa | Não apague |

## Três regras que valem sempre

1. **Nunca escreva senha ou código no guia.** O site é público. Senha do Wi-Fi, código do portão ou do cofre: mande por WhatsApp ao hóspede confirmado. O painel avisa se encontrar algo parecido.
2. **Nada vai ao ar sem você tocar em Publicar.** O que você edita fica num rascunho até lá.
3. **Não reenvie o `conteudo.js` de uma cópia antiga** pelo site do GitHub. Ele apagaria o que você já publicou pelo painel. Para guardar uma cópia, use **Configurações → Baixar cópia (.json)** no painel.

# 4. QR Code e divulgação

> **QR Code** é o quadradinho que a câmera do celular lê para abrir um endereço. O do cartão abre o guia publicado.

## Parte A · Antes de imprimir

1. O site precisa estar no ar (guia 1).
2. Se for usar **domínio próprio**, configure **antes** (guia 1, Passo 6). Um cartão impresso com o endereço antigo não muda depois.
3. No painel, abra **QR Code**.
4. Confira o endereço que aparece embaixo do QR.
   - O campo **Endereço do site** vazio usa o endereço do GitHub Pages. Isso está certo para a maioria dos casos.
   - Preencha só se tiver domínio próprio, começando com `https://`. Depois toque em **Publicar**.
5. **Teste o QR** com a câmera de dois celulares diferentes, um Android e um iPhone. Os dois têm de abrir o guia.

## Parte B · Imprimir o cartão

O cartão já vem pronto, com:
- o logo da Casa 18 Anahi;
- "Seja bem-vindo!";
- o QR Code;
- "Seu guia da casa está aqui.";
- "Aponte a câmera do celular. Wi-Fi e acessos são enviados pelo anfitrião por mensagem.";
- o endereço escrito, para quem não consegue ler QR.

Para imprimir:
1. Use o computador.
2. No painel, abra **QR Code** e toque em **Imprimir cartão**.
3. A janela de impressão mostra só o cartão.
4. Nas opções da impressão, ligue **Gráficos de plano de fundo** (ou "Imprimir cores de fundo"), se existir.
5. Imprima numa folha comum para testar. Depois, se quiser, numa gráfica, em papel mais grosso.

Para levar a uma gráfica, salve como PDF na janela de impressão (**Destino: Salvar como PDF**).

Dicas de acabamento:
- O QR deve ter **pelo menos 3 cm** de lado. Maior é melhor, de longe e com pouca luz.
- Plastifique ou use um porta-cartão de acrílico. A casa é de praia: umidade e mão molhada.
- Não deixe a impressão ao sol direto, que desbota o QR.
- Depois de imprimir, teste de novo com o celular.

O botão **Copiar link** copia o endereço do guia, para mandar por mensagem.

## Parte C · Onde deixar na casa

O painel sugere: **na entrada, na geladeira ou no quarto**. Mais ideias:

| Lugar | Por quê |
|---|---|
| Logo na entrada | É o primeiro lugar que o hóspede vê ao chegar |
| Porta da geladeira | Todo mundo passa por ali várias vezes por dia |
| Mesa da sala ou bancada | Fácil de achar quando o grupo planeja o dia |
| Quarto, perto da cama | Para conferir maré e tempo antes de dormir |
| Varanda, perto da rede | Se ficar protegido de sol e chuva |

Cuidados:
- **Nunca** escreva a senha do Wi-Fi ou códigos no cartão nem perto dele. O próprio cartão diz que eles vão por mensagem.
- Um ou dois cartões bastam. Muitos viram poluição visual.

**Mande o link antes da chegada também.** Na mensagem de confirmação da reserva (Airbnb, WhatsApp), cole o endereço do guia. O hóspede chega já sabendo o caminho, a portaria e o check-in.

## Parte D · Imagem de compartilhamento no WhatsApp

Quando alguém manda o link do guia pelo WhatsApp, aparece uma prévia com título e imagem. Sem imagem escolhida, a prévia sai sem foto.

1. Escolha uma **foto horizontal** e bonita da casa. Fachada, varanda ou sala com luz natural.
2. No painel, abra **Configurações**.
3. No card **Compartilhamento**, toque no quadrado de **Imagem ao compartilhar o link**.
4. Envie a foto ou escolha uma já enviada. Escreva a descrição.
5. Toque em **Publicar**.
   - Ao publicar, o painel grava o endereço completo da imagem e o título no `index.html`. O WhatsApp não roda programas, só lê esse arquivo.
6. Espere uns 2 minutos e mande o link para você mesmo para testar.

Bom saber:
- O WhatsApp guarda a prévia por um tempo. Se a imagem antiga continuar aparecendo, é isso. Para testar, mande o link com `?1` no fim (exemplo: `https://…/guia/?1`).
- Se a imagem não aparecer de jeito nenhum, chame quem cuida do código. Pode ser o formato ou o tamanho da foto. Isso não pôde ser testado com o WhatsApp de verdade antes da entrega.
- A **Visão geral** mostra "Escolha a imagem que aparece ao enviar o link no WhatsApp" enquanto a imagem não estiver definida.

## Parte E · Arquivos da marca (pasta `marca/`)

Os arquivos ficam na pasta `marca/` do repositório. Para baixar: abra o arquivo no GitHub e toque em **Download raw file** (baixar arquivo).

São arquivos **SVG**.
> *SVG é um formato de imagem que não perde qualidade quando você aumenta. Gráficas e programas de design aceitam.*

| Arquivo | Quando usar |
|---|---|
| `logo-horizontal.svg` | Fundo claro. Sol terracota, ondas e letreiro em verde |
| `logo-horizontal-escuro.svg` | Fundo escuro (verde, foto escura). Tons de areia e branco |
| `logo-horizontal-uma-cor.svg` | Uma cor só (verde): carimbo, gravação em madeira, bordado |
| `logo-vertical.svg`, `-escuro`, `-uma-cor` | Mesmas regras, com o símbolo em cima do letreiro. Bom para quadrados e cartões |
| `simbolo.svg`, `simbolo-escuro.svg` | Só o sol sobre as ondas. Foto de perfil do Instagram e WhatsApp, selos |
| `simbolo-pequeno.svg`, `simbolo-pequeno-escuro.svg` | Versão com traço mais grosso, para tamanhos bem pequenos (ícones de 16 a 32 px) |

Regras de uso:
- O logo horizontal não deve ficar com **menos de 160 px** de largura na tela (uns 4 cm impresso). Menor que isso, use só o símbolo.
- Não estique, não gire e não troque as cores. Use a versão `-escuro` em fundo escuro.
- Deixe um respiro em volta do logo, sem texto encostado.
- Os arquivos têm fundo transparente.

Cores da marca:

| Uso | Cor |
|---|---|
| Verde-coqueiro (texto e ondas) | `#1F3D2F` |
| Sol (terracota) | `#B8693A` |
| "ANAHI" | `#4F5E54` |
| Sol em fundo escuro | `#F0C394` |
| Texto em fundo escuro | `#FFFDF9` |

### Para gráfica, placa ou outdoor: converter o letreiro em curvas

O letreiro "CASA 18 / ANAHI" está guardado como **texto**, na fonte **Manrope Light**. Num computador sem essa fonte, a gráfica vê outra letra.

> *Converter em curvas* (ou "criar contornos") transforma as letras em desenho. Depois disso, a fonte deixa de ser necessária.

1. Instale a fonte **Manrope** (gratuita, no Google Fonts) no computador de quem vai preparar o arquivo.
2. Abra o SVG num programa de design (Illustrator, Inkscape, Affinity, CorelDRAW).
3. Confira se o letreiro aparece na Manrope Light, fina e espaçada.
4. Selecione o texto e use **Converter em curvas** / **Criar contornos** / **Objeto em caminho**.
5. Salve como PDF ou SVG novo e mande esse para a gráfica.

O **símbolo** (sol e ondas) já é desenho. Ele não precisa de conversão.

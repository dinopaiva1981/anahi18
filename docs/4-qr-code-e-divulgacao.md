# 4. QR Code, cartões e divulgação

> **QR Code** é o quadradinho que a câmera do celular lê para abrir um endereço.

A casa usa dois tipos de QR:

| Cartão | O que o QR faz | Onde fica | É público? |
|---|---|---|---|
| **QR do guia** | Abre o guia publicado | Na casa e, se quiser, em divulgação | Sim: o guia é público |
| **Cartão do Wi-Fi** | Conecta o celular ao Wi-Fi | **Só dentro da casa** | Não: nunca é publicado nem enviado |

## Parte A · Antes de imprimir

1. O site precisa estar no ar (guia 1).
2. Se for usar **domínio próprio**, configure **antes** (guia 1, Passo 6). Um cartão impresso com o endereço antigo não muda depois.
3. No painel, abra **QR Code do guia** (grupo **Sistema**). A tela se chama **Cartão com QR Code**.
4. Confira o endereço escrito embaixo do QR.
   - O campo **Endereço do site** vazio usa o endereço do GitHub Pages. Isso está certo na maioria dos casos.
   - Preencha só se tiver domínio próprio, começando com `https://`. Depois toque em **Publicar**.
   - Se você mudar o endereço, o painel avisa em vermelho: os cartões já impressos continuam abrindo o endereço antigo. Imprima novos e troque.
5. **Teste o QR** com a câmera de um Android e de um iPhone.

## Parte B · Imprimir

Há dois jeitos:

**1. Cartão simples do guia** (tela **QR Code do guia**):
1. Use o computador.
2. Toque em **Imprimir cartão**. A janela de impressão mostra só o cartão.
3. Ligue **Gráficos de plano de fundo** (ou “Imprimir cores de fundo”), se existir.

O cartão tem o logo, “Seja bem-vindo!”, o QR, “Seu guia da casa está aqui.”, “Aponte a câmera do celular. O guia abre na hora, sem instalar nada.” e o endereço escrito.

**2. Kit A6 completo** (tela **Impressos**, grupo **Hospedagem**): QR do guia, cartão do Wi-Fi e regras da casa, em A6 ou quatro por folha A4. O passo a passo está no guia 7, Parte D. O botão **Impressos**, no fim da tela **QR Code do guia**, leva até lá.

O botão **Copiar link** copia o endereço do guia, para mandar por mensagem.

Para levar a uma gráfica, salve como PDF na janela de impressão (**Destino: Salvar como PDF**). **Não mande à gráfica o PDF do cartão do Wi-Fi**: ele tem a senha.

Dicas de acabamento:
- O QR deve ter **pelo menos 3 cm** de lado.
- Plastifique ou use um porta-cartão de acrílico. A casa é de praia: umidade e mão molhada.
- Não deixe ao sol direto, que desbota o QR.
- Depois de imprimir, teste de novo com o celular.

## Parte C · Onde deixar na casa

| Lugar | Cartão |
|---|---|
| Logo na entrada | QR do guia e regras da casa |
| Porta da geladeira | QR do guia |
| Sala, perto do roteador ou da TV | Cartão do Wi-Fi |
| Quarto, perto da cama | QR do guia (maré e tempo antes de dormir) |

### A regra das senhas (atualizada)

1. **No site e no GitHub: nunca.** Nenhuma senha ou código vai para o guia publicado. O painel bloqueia a publicação se encontrar algo parecido.
2. **Dentro da casa: o cartão do Wi-Fi pode ficar à vista.** Ele é impresso pelo painel, a partir dos **Dados privados**, e não é publicado. Quem lê é quem já está hospedado.
3. **Portão, cofre e chaves: só por mensagem**, ao hóspede confirmado (mensagem **No dia da chegada**, guia 7). Nunca em cartão.

Um ou dois cartões de cada bastam.

**Mande o link antes da chegada também.** Use a mensagem **Antes da chegada**, em **Receber hóspede** (guia 7). Ela já leva o link com o nome do hóspede.

## Parte D · Imagem de compartilhamento no WhatsApp

Quando alguém manda o link do guia pelo WhatsApp, aparece uma prévia com título e imagem.

1. Escolha uma **foto horizontal** e bonita da casa.
2. No painel, abra **Configurações**.
3. No quadro **Compartilhamento**, toque no quadrado de **Imagem ao compartilhar o link**.
4. Envie a foto ou escolha uma já enviada. Escreva a descrição.
5. Toque em **Publicar**. O painel gera da foto a imagem `compartilhar.jpg` (1200 × 630, recortada no centro) e grava o título e a imagem no `index.html`, entre as marcas `compartilhar`. O WhatsApp só lê esse arquivo.
6. Espere uns 2 minutos e mande o link para você mesmo.

Bom saber:
- A imagem só muda quando você publica. Escolher a foto sem publicar não muda a prévia.
- O WhatsApp guarda a prévia por um tempo. Quando a foto muda, o painel muda o endereço da imagem, para forçar a troca. Se ainda assim a antiga aparecer, mande o link com `?1` no fim (exemplo: `https://…/guia/?1`).
- O **link personalizado** do hóspede mostra a mesma prévia. O nome e as datas não aparecem nela.
- Se a imagem não aparecer, chame quem cuida do código. Pode ser o formato da foto.

## Parte E · Arquivos da marca (pasta `marca/`)

Para baixar: abra o arquivo no GitHub e toque em **Download raw file**.

São arquivos **SVG**: uma imagem que não perde qualidade quando você aumenta. Gráficas e programas de design aceitam.

| Arquivo | Quando usar |
|---|---|
| `logo-horizontal.svg` | Fundo claro. Sol terracota, ondas e letreiro em verde |
| `logo-horizontal-escuro.svg` | Fundo escuro. Tons de areia e branco |
| `logo-horizontal-uma-cor.svg` | Uma cor só: carimbo, gravação, bordado |
| `logo-vertical.svg`, `-escuro`, `-uma-cor` | Mesmas regras, com o símbolo em cima do letreiro |
| `simbolo.svg`, `simbolo-escuro.svg` | Só o sol sobre as ondas. Foto de perfil, selos |
| `simbolo-pequeno.svg`, `simbolo-pequeno-escuro.svg` | Traço mais grosso, para tamanhos bem pequenos |

Regras de uso:
- O logo horizontal não deve ficar com menos de 160 px de largura na tela (uns 4 cm impresso). Menor que isso, use só o símbolo.
- Não estique, não gire e não troque as cores.
- Deixe um respiro em volta do logo.

Cores da marca:

| Uso | Cor |
|---|---|
| Verde-coqueiro (texto e ondas) | `#1F3D2F` |
| Sol (terracota) | `#B8693A` |
| “ANAHI” | `#4F5E54` |
| Sol em fundo escuro | `#F0C394` |
| Texto em fundo escuro | `#FFFDF9` |

### Para gráfica, placa ou outdoor: converter o letreiro em curvas

Nos arquivos da pasta `marca/`, o letreiro “CASA 18 / ANAHI” está guardado como **texto**, na fonte **Manrope Light**. (O site usa a Inter, muito parecida.) Num computador sem a fonte, a gráfica vê outra letra.

1. Instale a fonte **Manrope** (gratuita, no Google Fonts) no computador de quem vai preparar o arquivo.
2. Abra o SVG num programa de design (Illustrator, Inkscape, Affinity, CorelDRAW).
3. Selecione o texto e use **Converter em curvas** / **Criar contornos**.
4. Salve como PDF e mande esse para a gráfica.

O símbolo (sol e ondas) já é desenho e não precisa de conversão.

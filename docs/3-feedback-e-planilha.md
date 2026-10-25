# 3. Feedback dos hóspedes e a planilha

O guia tem uma página **Feedback**, em que o hóspede dá uma nota de 1 a 5 e escreve uma mensagem. Este guia mostra como fazer essas mensagens chegarem a uma **planilha do Google** e aparecerem no painel.

> **Apps Script** é um recurso gratuito do Google que roda um pequeno programa ligado a uma planilha. Aqui ele só recebe as mensagens e grava numa linha da planilha.

## Como funciona hoje, antes de configurar

| Situação | O que o hóspede vê na página Feedback |
|---|---|
| Sem planilha e sem WhatsApp cadastrado | Botão apagado: **Envio disponível em breve** |
| Sem planilha, com WhatsApp | **Enviar feedback** abre o WhatsApp com a mensagem pronta para você |
| Com planilha | **Enviar feedback** grava na planilha. Depois o site oferece **Enviar também pelo WhatsApp** |

Com a planilha, o site não consegue confirmar a entrega. Por isso ele diz ao hóspede: "Sua mensagem foi enviada. Daqui não conseguimos confirmar a entrega…" e sugere o WhatsApp quando for importante.

---

## Parte A · Instalar o Apps Script (uns 10 minutos, no computador)

Os nomes abaixo são os da tela em português. Podem variar um pouco.

### A1. Criar a planilha
1. Abra **sheets.google.com** com a sua conta Google.
2. Crie uma **planilha em branco**.
3. Dê um nome. Exemplo: `Feedback Casa 18`.

### A2. Colar o código
1. Na planilha, abra o menu **Extensões → Apps Script**. Abre uma aba nova.
2. No editor, apague todo o texto de exemplo (`function myFunction() {…}`).
3. No repositório do guia, abra o arquivo `integracoes/feedback-apps-script.gs`.
   - No GitHub: toque no arquivo e use o botão de copiar (**Copy raw file**).
4. Cole tudo no editor do Apps Script.
5. Toque no ícone de disquete (**Salvar projeto**).

### A3. Criar a CHAVE_LEITURA
A **CHAVE_LEITURA** é a senha que deixa **só o seu painel** ler a planilha. Ela nunca vai para o site.

1. Invente uma chave longa: **24 caracteres ou mais**, misturando letras e números. Um gerenciador de senhas ajuda. Não reaproveite outra senha.
2. Guarde a chave num lugar seguro. Você vai colar no painel.
3. No editor do Apps Script, toque na engrenagem **Configurações do projeto**, no menu da esquerda.
4. Desça até **Propriedades do script** e toque em **Adicionar propriedade do script**.
5. Em **Propriedade**, escreva exatamente `CHAVE_LEITURA` (maiúsculas, com o sublinhado).
6. Em **Valor**, cole a chave.
7. Toque em **Salvar propriedades do script**.

### A4. Implantar (colocar no ar)
1. No alto, à direita, toque em **Implantar → Nova implantação**.
2. Ao lado de **Selecionar tipo**, toque na engrenagem e escolha **App da Web**.
3. Em **Descrição**, escreva `feedback`.
4. Em **Executar como**, escolha **Eu** (o seu e-mail).
5. Em **Quem pode acessar**, escolha **Qualquer pessoa**.
   - Isso permite que o hóspede envie sem fazer login. Ler a planilha continua exigindo a CHAVE_LEITURA.
6. Toque em **Implantar**.
7. O Google pede autorização. Toque em **Autorizar acesso** e escolha a sua conta.
8. Se aparecer "O Google não verificou este app", toque em **Avançado** e depois em **Acessar … (não seguro)**. O app é seu; o aviso é normal.
9. Toque em **Permitir**.
10. Copie o **URL** do **App da Web**. Ele termina em `/exec`.

Para conferir: abra esse endereço numa aba. Deve aparecer `{"ok":false,"erro":"use POST"}`. Isso quer dizer que está no ar e que a leitura pela barra de endereço está fechada, como deve ser.

### A5. Reimplantar uma versão nova
Faça isto sempre que o código do arquivo `.gs` mudar. Também é preciso se você instalou uma versão antiga do script: a atual só deixa o painel ler por um caminho mais seguro.

1. Cole o código novo no editor e salve.
2. Toque em **Implantar → Gerenciar implantações**.
3. Toque no ícone de lápis (**Editar**).
4. Em **Versão**, escolha **Nova versão**.
5. Toque em **Implantar**.

O endereço `/exec` continua o mesmo. Não precisa mudar nada no painel.

> Se você usar **Nova implantação** em vez disso, o Google cria um endereço novo. Aí será preciso colar o novo endereço no painel e publicar.

## Parte B · Ligar ao painel

1. No painel, abra **Configurações**.
2. No card **Feedback dos hóspedes**:
   - Em **Endereço do Apps Script (termina em /exec)**, cole o endereço.
   - Em **Chave de leitura**, cole a CHAVE_LEITURA.
3. Toque em **Salvar chave**.
   - Com "Lembrar neste aparelho" ligado, a chave fica guardada trancada com a sua senha local. Sem ele, fica só nesta sessão.
4. Toque em **Testar conexão**.
   - Deu certo: "Conectado: 0 feedback(s) na planilha." (ou o número que já houver).
5. Toque em **Publicar**.
   - O endereço precisa ser publicado para o formulário do site passar a usá-lo. A chave **não** é publicada: ela fica só no seu aparelho.
6. Teste de verdade: abra o guia no celular, vá em **Feedback**, envie uma mensagem de teste (pelo menos 10 letras). Confira se apareceu uma linha na aba **Feedback** da planilha. No painel, toque em **Atualizar**, na tela **Feedback**.

Em outro aparelho, a chave precisa ser colada de novo (e salva).

Se o **Testar conexão** falhar:

| Mensagem | O que fazer |
|---|---|
| "a chave de leitura não confere com a CHAVE_LEITURA do script" | Cole a chave de novo, sem espaços. Confira o nome da propriedade |
| "a resposta não veio no formato esperado (confira se o endereço termina em /exec e se a implantação está como “Qualquer pessoa”)" | Confira o endereço e o item 5 da Parte A4. Se você trocou o código, reimplante (A5) |
| "confira o endereço e a internet." | Endereço errado ou sem sinal |

Se tudo estiver certo e ainda assim não conectar, chame quem cuida do código. A leitura pelo painel não pôde ser testada contra o Google antes da entrega (veja o guia 6).

### Proteções do lado da planilha
- Mensagens com menos de 10 caracteres são recusadas.
- No máximo 40 envios por hora e 150 por dia. É bem acima do uso de uma casa. Se alguém abusar, os envios voltam na hora seguinte.
- A mesma mensagem repetida em até 6 horas é descartada.
- Um campo invisível pega robôs.
- Textos que começam com `=`, `+`, `-` ou `@` não viram fórmula na planilha.

## Parte C · Ler o painel de Feedback

Abra **Feedback** no menu. A análise é feita **no seu navegador**: nenhuma mensagem é enviada para outro serviço.

Para conhecer a tela antes de ter dados, toque em **ver com dados de exemplo**. Aparece a faixa "Você está vendo DADOS DE EXEMPLO". Para sair, toque em **Voltar aos dados reais**. Não publique avaliações de exemplo.

**Filtros:**
- Período: **30 dias**, **90 dias** (o padrão), **12 meses**, **Tudo**.
- Sentimento: **Todos**, **Negativos**, **Neutros**, **Positivos**.
- **Ver como tabela** troca os gráficos por tabelas.

**Os quatro números:**
| Card | O que mostra |
|---|---|
| **Nota média** | Média das notas no período, e a do período anterior ("antes") |
| **● Positivos** | Quantos por cento foram positivos |
| **▼ Negativos** | Quantos por cento foram negativos, e quantos ainda estão "sem resolução" |
| **Pedidos de melhoria** | Quantas frases pedem alguma coisa |

**Como o sentimento é decidido:** o painel junta a nota (pesa um pouco mais) com o texto. No texto ele procura palavras boas e ruins ("limpo", "sujo", "barulho"), entende "não" antes delas e dá mais peso ao que vem depois de "mas". As palavras que pesaram aparecem marcadas no comentário. É uma ajuda automática: leia o comentário antes de tirar conclusão.

**Os blocos:**
- **Sentimento por mês**: barras de positivos e neutros para cima, negativos para baixo da linha.
- **Temas mais citados**: assuntos como Limpeza, Internet, Climatização, Barulho, Insetos, Chegada e acesso. Vermelho = críticas, cinza = neutro ou pedido, verde = elogios. **Toque num tema** para ver só os comentários dele. Toque de novo (ou no ✕) para tirar o filtro.
- **Distribuição das notas**: quantas notas 5, 4, 3, 2 e 1.
- **Necessidades dos hóspedes**: frases com "faltou", "poderia", "seria bom", "sugiro" etc. É a sua lista de melhorias.
- Acima dos gráficos podem aparecer frases-resumo, como o tema mais criticado, o mais elogiado e se a nota subiu ou caiu.

**Cada comentário:**
- **Marcar como resolvido** quando você já cuidou do problema. **Reabrir** desfaz. Esse controle fica só neste aparelho e é apagado ao **Sair**.
- **Publicar como avaliação** só aparece se o hóspede marcou "Autorizo publicar…" (Parte E).

Na **Visão geral** aparecem dois resumos: **Nota média · 30 dias** e **Precisam de atenção** (negativos em 30 dias). O número ao lado de "Feedback" no menu conta os negativos ainda sem resolução.

## Parte D · Importar avaliações do Airbnb ou de um CSV

Serve para juntar na análise comentários que chegaram por outros caminhos.

1. Na tela **Feedback**, toque em **Importar**.
2. Na janela **Importar feedback**:
   - **Origem**: de onde veio (já vem "Airbnb").
   - **Nota (se todas iguais)**: opcional.
   - **Comentários**: cole os textos, separando **cada comentário com uma linha em branco**.
     - Começar a linha com `5 - ` ou `Nota 4:` define a nota daquele comentário.
   - **Ou um arquivo CSV (colunas: data, nota, mensagem, nome)**: escolha o arquivo.
     - *CSV é uma planilha salva como texto. No Google Planilhas: Arquivo → Fazer download → Valores separados por vírgula.*
     - A coluna **mensagem** é obrigatória (também vale "comentário" ou "texto").
     - Datas como `23/10/2026` ou `2026-10-23`. Notas de 1 a 5.
3. Toque em **Importar**.

Bom saber:
- Comentários **colados** recebem a **data de hoje**. Para manter a data real, use o CSV.
- Datas que o painel não reconhece ficam vazias. Esses comentários só aparecem no período **Tudo**, e o painel avisa.
- Notas como "abc" ou "4,5" ficam sem nota. "5 estrelas" vale 5.
- Os importados ficam **só neste aparelho**. Para apagar: **Importar → Apagar N importado(s)**. Ao **Sair**, eles também são apagados.
- Importados nunca têm o botão **Publicar como avaliação**, porque o painel não sabe se há autorização.

## Parte E · Publicar um comentário como avaliação

Avaliações aparecem no site para todos. **Só publique com autorização de quem escreveu.**

**Do formulário do site:**
1. O hóspede marca "Autorizo publicar meu comentário como avaliação no guia, apenas com meu primeiro nome."
2. No painel, o comentário mostra **Publicar como avaliação**. Toque.
3. Ele vai para **Avaliações**, só com o primeiro nome e origem "Hóspede da casa".
4. Toque em **Publicar** para aparecer no site.

**De outro lugar (Airbnb, WhatsApp):**
1. Peça autorização ao hóspede e guarde a resposta.
2. Abra **Avaliações → Adicionar**.
3. Preencha **Depoimento**, **Autor (primeiro nome)**, **Nota**, **Período da estadia** e **Origem**.
4. Marque **Tenho autorização para publicar**. Sem essa marca, a avaliação fica **Oculta** e não aparece no site.
5. Toque em **Concluir** e depois em **Publicar**.

Para tirar uma avaliação do site: desmarque a autorização ou exclua, e publique.

## Parte F · LGPD (proteção de dados)

A **LGPD** é a lei brasileira que protege dados pessoais. Para ficar em dia:

- **Pedimos só o necessário.** O formulário pede nota e mensagem. Nome é opcional. A planilha não guarda IP nem dados do aparelho.
- **O site avisa o hóspede**: "Em respeito à LGPD, pedimos só o necessário. Seu feedback é usado apenas para melhorar a hospedagem e não é compartilhado." Cumpra isso: não compartilhe a planilha nem os comentários.
- **A planilha é privada**, no seu Google Drive. Não compartilhe com ninguém que não precise.
- **Publicação só com autorização**, e só com o primeiro nome.
- **Se um hóspede pedir para apagar** o que escreveu: apague a linha na planilha, a avaliação no painel (se houver) e publique.
- **Apague o que não precisa mais.** Uma limpeza anual da planilha é um bom hábito.
- **Comentários importados e o controle de "resolvido"** ficam no aparelho em que você trabalha. Use **Sair** em aparelhos que não são seus.
- **Nunca peça** no formulário CPF, documento, telefone ou dados de pagamento.

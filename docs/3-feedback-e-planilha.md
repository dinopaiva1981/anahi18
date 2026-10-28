# 3. Feedback dos hóspedes e a planilha

O guia tem uma página **Feedback**. Nela o hóspede dá uma nota de 1 a 5 e escreve uma mensagem.

Este guia mostra como fazer essas mensagens chegarem a uma **planilha do Google**, aparecerem no painel e, se quiser, avisarem você por e-mail quando a nota for baixa.

> **Apps Script** é um recurso gratuito do Google que roda um pequeno programa ligado a uma planilha. Aqui ele recebe as mensagens e grava cada uma numa linha.

As Partes A e B são de instalação: faça uma vez, de preferência com quem montou o site. As Partes C a F são do dia a dia.

## Como funciona antes de configurar

| Situação | O que o hóspede vê na página Feedback |
|---|---|
| Sem planilha e sem WhatsApp cadastrado | Botão apagado: **Envio ainda não ativo** |
| Sem planilha, com WhatsApp | **Enviar feedback** abre o WhatsApp com a mensagem pronta para você |
| Com planilha | **Enviar feedback** grava na planilha. Com o seu WhatsApp cadastrado, o site oferece também o envio por lá |

Com a planilha, o site não consegue confirmar a entrega. Por isso ele diz ao hóspede que a mensagem foi enviada, mas que não dá para confirmar, e sugere o WhatsApp quando for importante.

---

## Parte A · Instalar o Apps Script (uns 15 minutos, no computador)

Os nomes abaixo são os da tela em português. Podem variar um pouco.

### A1. Criar a planilha
1. Abra **sheets.google.com** com a sua conta Google.
2. Crie uma **planilha em branco**. Dê um nome, por exemplo `Feedback Casa 18`.

### A2. Colar o código
1. Na planilha, abra **Extensões → Apps Script**. Abre uma aba nova.
2. Apague todo o texto de exemplo.
3. No repositório do guia, abra `integracoes/feedback-apps-script.gs` e copie tudo (no GitHub, botão **Copy raw file**).
4. Cole no editor e toque no disquete (**Salvar projeto**).

### A3. As propriedades do script
1. No editor, toque na engrenagem **Configurações do projeto**, no menu da esquerda.
2. Desça até **Propriedades do script** e toque em **Adicionar propriedade do script**.
3. Crie as propriedades abaixo. O nome tem de ser exatamente este, em maiúsculas.

| Propriedade | Obrigatória? | Valor |
|---|---|---|
| `CHAVE_LEITURA` | **Sim** | Uma senha longa, com **24 caracteres ou mais**, misturando letras e números. É ela que deixa só o seu painel ler a planilha. Com menos de 24, o painel recebe o erro “chave curta” |
| `EMAIL_ALERTA` | Não (recomendada) | O seu e-mail. Você recebe um aviso quando chegar uma **nota 1 ou 2** |
| `DIAS_GUARDA` | Não | Por quantos dias guardar os comentários. Se não criar, vale **730** (2 anos). O mínimo é 30 |

4. Toque em **Salvar propriedades do script**.
5. Guarde a `CHAVE_LEITURA` num lugar seguro. Você vai colar no painel.

### A4. Implantar (colocar no ar)
1. No alto, à direita, toque em **Implantar → Nova implantação**.
2. Ao lado de **Selecionar tipo**, toque na engrenagem e escolha **App da Web**.
3. Em **Descrição**, escreva `feedback`.
4. Em **Executar como**, escolha **Eu**.
5. Em **Quem pode acessar**, escolha **Qualquer pessoa**. Assim o hóspede envia sem login. Ler a planilha continua exigindo a chave.
6. Toque em **Implantar** e depois em **Autorizar acesso**. Escolha a sua conta.
7. Se aparecer “O Google não verificou este app”, toque em **Avançado** e depois em **Acessar … (não seguro)**. O app é seu; o aviso é normal.
8. Toque em **Permitir**. Se você criou `EMAIL_ALERTA`, o Google também pede permissão para enviar e-mail em seu nome. Permita.
9. Copie o **URL** do **App da Web**. Ele termina em `/exec`.

Para conferir: abra esse endereço numa aba. Deve aparecer `{"ok":false,"erro":"use POST"}`. Isso quer dizer que está no ar.

### A5. Apagar sozinho o que passou do prazo (recomendado)
O site promete ao hóspede guardar os comentários **por até 2 anos**. Para cumprir isso sem depender da memória:
1. No editor, na barra do alto, escolha a função **instalarLimpezaMensal** na lista de funções.
2. Toque em **Executar** e autorize.
3. Pronto: todo dia 1º, de madrugada, o script apaga as linhas mais antigas que o prazo de `DIAS_GUARDA`.
4. Para conferir, abra **Acionadores** (o relógio, no menu da esquerda). Deve haver **um** acionador mensal, da função **limpezaMensal**. Se você rodou isto antes de 28/10/2026, rode de novo: o acionador antigo apontava para `limpar_`, que o Google não executa (funções terminadas em "_" são privadas), e é trocado automaticamente. Depois do primeiro dia 1º, veja em **Execuções** se ele rodou sem erro. Se houver erro, avise quem cuida do código.

Planilhas criadas por versões antigas, sem a coluna `data_local` no cabeçalho, são completadas sozinhas na primeira gravação nova (só o nome que falta, no fim da linha 1).

### A6. Reimplantar como nova versão (sempre que o código mudar)
Se você já tinha instalado o script antes de 24/10/2026, **faça isto agora**. O código novo traz o teto diário, a data local, o alerta por e-mail e o prazo de guarda.

1. Cole o código novo no editor e salve.
2. Toque em **Implantar → Gerenciar implantações**.
3. Toque no lápis (**Editar**).
4. Em **Versão**, escolha **Nova versão**.
5. Toque em **Implantar**.

O endereço `/exec` continua o mesmo. Não precisa mudar nada no painel.

> Não use **Nova implantação** para atualizar: ela cria um endereço novo, e o site continuaria mandando para o antigo.

Depois de reimplantar:
- Confira se a `CHAVE_LEITURA` tem 24 caracteres ou mais. Se não tiver, troque nas **Propriedades do script** e cole a nova no painel.
- Se a planilha já existia, escreva `data_local` na célula **H1** da aba **Feedback**. A coluna nova (data e hora de Maceió, fácil de ler) é preenchida a partir de agora, mas o título só é criado sozinho em planilhas novas.

## Parte B · Ligar ao painel

1. No painel, abra **Configurações**.
2. No quadro **Feedback dos hóspedes**:
   - Em **Endereço do Apps Script (termina em /exec)**, cole o endereço.
   - Em **Chave de leitura**, cole a `CHAVE_LEITURA`.
3. Toque em **Salvar chave**. A chave fica neste aparelho, trancada com a sua senha do painel. Se tiver menos de 24 caracteres, o painel avisa.
4. Toque em **Testar conexão**. Deu certo quando aparece “Conectado: 0 feedback(s) na planilha.” (ou o número que houver).
5. Toque em **Publicar**. O endereço precisa ser publicado para o formulário do site usá-lo. A chave **não** é publicada.
6. Teste de verdade: no celular, abra o guia, vá em **Feedback** e envie uma mensagem de teste (pelo menos 10 letras). Confira a linha nova na planilha. Se quiser testar o e-mail, envie com nota 1 ou 2.

Em outro aparelho, a chave precisa ser colada e salva de novo. **Sair e apagar** também apaga a chave.

Se o **Testar conexão** falhar:

| Mensagem | O que fazer |
|---|---|
| “a chave de leitura não confere com a CHAVE_LEITURA do script” | Cole a chave de novo, sem espaços. Confira o nome da propriedade |
| “chave curta: troque a CHAVE_LEITURA por uma de 24 caracteres ou mais” | Crie uma chave maior no script e cole a mesma no painel |
| “a resposta não veio no formato esperado (…)” | Confira se o endereço termina em `/exec` e se o acesso está como **Qualquer pessoa**. Se trocou o código, reimplante (A6) |
| “confira o endereço e a internet.” | Endereço errado ou sem sinal |

### Proteções do lado da planilha
- Mensagens com menos de 10 caracteres são recusadas. Envios muito grandes também.
- No máximo 40 envios por hora e 150 por dia (dia de Maceió). É bem acima do uso de uma casa.
- A mesma mensagem repetida em até 6 horas é descartada.
- Um campo invisível pega robôs.
- Textos que começam com `=`, `+`, `-` ou `@` não viram fórmula.
- No máximo 20 e-mails de alerta por dia. Se o e-mail falhar, o feedback continua gravado.
- O painel lê no máximo os 500 comentários mais recentes.

### As colunas da planilha (aba Feedback)
`data` (data técnica, usada pelo painel), `nota`, `temas`, `mensagem`, `nome`, `publicar` (sim/não), `origem`, `data_local` (dd/mm/aaaa hh:mm, horário de Maceió). Não apague nem mude a ordem das colunas.

---

## Parte C · Ler o painel de Feedback

Abra **Feedback** no menu. A análise é feita **no seu navegador**: nenhuma mensagem vai para outro serviço.

Para conhecer a tela sem dados, toque em **ver com dados de exemplo**. Para sair, **Voltar aos dados reais**. No modo demonstração, o feedback já vem com exemplos.

**Filtros:** período **30 dias**, **90 dias** (o padrão), **12 meses** ou **Tudo**; sentimento **Todos**, **Negativos**, **Neutros** ou **Positivos**. **Ver como tabela** troca os gráficos por tabelas.

**Os quatro números:** **Nota média**, **● Positivos**, **▼ Negativos** (com quantos ainda estão sem resolução) e **Pedidos de melhoria**.

**Como o sentimento é decidido:** o painel junta a nota com as palavras do comentário (“limpo”, “sujo”, “barulho”), entende “não” antes delas e dá mais peso ao que vem depois de “mas”. É uma ajuda automática. Leia o comentário antes de concluir.

**Os blocos:** **Sentimento por mês**, **Temas mais citados** (toque num tema para filtrar), **Distribuição das notas** e **Necessidades dos hóspedes** (frases com “faltou”, “poderia”, “sugiro”).

**Cada comentário:**
- **Marcar como resolvido** quando você já cuidou do problema. **Reabrir** desfaz. Fica só neste aparelho.
- **Publicar como avaliação** só aparece se o hóspede autorizou (Parte E).

Na **Visão geral** aparecem **Nota média · 30 dias** e **Precisam de atenção**. O número ao lado de “Feedback” no menu conta os negativos sem resolução.

## Parte D · Importar avaliações do Airbnb ou de um CSV

1. Na tela **Feedback**, toque em **Importar**.
2. Na janela **Importar feedback**, cole os comentários (um por bloco, separados por uma linha em branco) ou escolha um arquivo CSV com as colunas data, nota, mensagem, nome.
   - Começar a linha com `5 - ` ou `Nota 4:` define a nota daquele comentário.
3. Toque em **Importar**.

Bom saber:
- Comentários colados recebem a data de hoje. Para manter a data real, use o CSV.
- Os importados ficam **só neste aparelho**. Para apagar: **Importar → Apagar N importado(s)**. **Sair** também apaga.
- Importados nunca têm o botão **Publicar como avaliação**.

## Parte E · Publicar um comentário como avaliação

Avaliações aparecem no site para todos. **Só publique com autorização de quem escreveu.**

**Do formulário do site:**
1. O hóspede marca “Autorizo publicar meu comentário como avaliação no guia, apenas com meu primeiro nome.”
2. No painel, toque em **Publicar como avaliação** no comentário. Ele vai para **Avaliações**, só com o primeiro nome.
3. Toque em **Publicar**.

**De outro lugar (Airbnb, WhatsApp):**
1. Peça autorização e guarde a resposta.
2. Abra **Avaliações → Adicionar** e preencha.
3. Marque **Tenho autorização para publicar**. Sem essa marca, a avaliação não aparece no site.
4. Toque em **Concluir** e depois em **Publicar**.

## Parte G · Agenda de disponibilidade (espelho do Airbnb, opcional)
O mesmo Apps Script também pode mostrar no site quais dias estão livres. Ele lê o calendário do Airbnb e entrega ao site **só os dias ocupados** (sem nomes, telefones ou códigos), com cópia de 1 h no Google.
1. No Airbnb: **Calendário** › escolha o anúncio › **Disponibilidade** › **Conectar calendários** › **Exportar calendário** › copie o link (termina em `.ics`). Esse link é **secreto**: nunca cole no painel nem no site.
2. No Apps Script: **Configurações do projeto** › **Propriedades do script** › **Adicionar propriedade**: `ICAL_URL` = o link copiado (pode pôr mais de um, separados por espaço, ex.: Airbnb e Booking).
3. **Implantar** › **Gerenciar implantações** › editar › **Nova versão** › Implantar (o endereço /exec continua o mesmo). Sem a nova versão, o Google continua rodando o código antigo, que não tem a agenda.
4. No painel: **A casa** › **Reservas e disponibilidade** › **Testar agenda**. Deu certo? Marque **Mostrar a agenda no site** e publique.

Mensagens do teste: "Falta a propriedade ICAL_URL" (passo 2), "não conseguiu ler o calendário" (link incompleto ou exportação desligada), "versão antiga" (passo 3).

## Parte F · LGPD (proteção de dados)

O que o guia diz ao hóspede, no formulário e na página **Privacidade e dados no aparelho**:
- a mensagem vai só para o anfitrião, numa planilha privada do Google;
- o nome é opcional;
- os comentários ficam guardados **por até 2 anos**;
- só são publicados com autorização, e só com o primeiro nome;
- para apagar, basta pedir pelo WhatsApp.

Para cumprir:
- **Não compartilhe** a planilha nem os comentários.
- **Instale a limpeza mensal** (A5). Sem ela, os comentários ficam para sempre.
- **Se um hóspede pedir para apagar:** apague a linha na planilha e, se houver, a avaliação no painel. Depois publique.
- **E-mail de alerta:** ele traz o texto do comentário. Apague esses e-mails quando não precisar mais.
- **Nunca peça** no formulário CPF, documento, telefone ou dados de pagamento.

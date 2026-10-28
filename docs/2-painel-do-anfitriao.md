# 2. Painel do anfitrião

O painel é onde você cuida do guia. Ele abre no navegador, no celular ou no computador.

Os nomes de botões e telas estão escritos exatamente como aparecem no painel.

---

## Parte A · Onde fica

Há dois caminhos:
1. **Pelo guia:** abra o guia, desça até o fim da página e toque em **Área do anfitrião** (com um cadeado), no rodapé.
2. **Pelo endereço:** é o endereço do guia terminado em `/admin/`. Exemplo: `https://casa18anahi.github.io/guia/admin/`.

Guarde o endereço nos favoritos do celular e do computador.

---

## Parte B · Entrar com a senha

1. Abra o painel. Aparece a tela **Área do anfitrião**.
2. Em **Senha do anfitrião**, digite a senha.
   - A senha inicial é **casaalagoas**.
   - Toque no olho para ver o que digitou.
3. Toque em **Entrar**.

Se errar:
- Nos 2 primeiros erros, nada trava.
- A partir do 3º erro, o painel pede uma pausa: 30 segundos, depois 1 minuto, 2, 4… até 15 minutos. Recarregar a página não libera antes.

A tela diz: “A senha protege este aparelho; o token do GitHub é informado uma única vez.” Isso quer dizer:
- **A senha** tranca o que fica guardado neste aparelho: o token, a chave do feedback, os dados privados (Wi-Fi, portão) e os seus modelos de mensagem.
- **O token** é o que deixa o painel publicar no GitHub (Parte C).

**Recomendado: troque a senha** por uma frase só sua (Parte G). A senha `casaalagoas` está escrita neste guia e é fácil de adivinhar. Na primeira entrada, a tela **Configurações** sugere essa troca.

---

## Parte C · O token (uma vez por aparelho)

> **Token** é uma chave criada no GitHub que deixa o painel publicar no seu guia. Você escolhe por quanto tempo ela vale.

Na **primeira vez em cada aparelho**, depois da senha, aparece a tela **Senha conferida. Agora, o token.** (passo **2 de 2**).

1. Se aparecer **Guia encontrado: usuário/repositório**, o painel já sabe onde está o guia. Pule para o passo 3.
2. Se não aparecer, abra **Onde está o guia no GitHub** e preencha **Nome da conta no GitHub** e **Nome do repositório do guia**.
3. Abra **Primeira vez? Crie o seu token em 5 passos** e siga:
   1. Entre no GitHub com a conta **dona do guia**.
   2. Toque em **Abrir a página do GitHub que cria o token ↗**. Abre outra aba; deixe a do painel aberta.
   3. Em **Token name** (nome), escreva `Painel Casa 18`. Em **Expiration** (validade), escolha **30 days**.
   4. Em **Repository access**, escolha **Only select repositories** e marque o repositório do guia. Em **Permissions → Repository permissions**, na linha **Contents**, escolha **Read and write**. Não mexa no resto.
   5. Toque em **Generate token** e copie o código que começa com `github_pat_`. O GitHub só mostra uma vez.
4. Volte ao painel e cole em **Cole aqui o token (começa com github_pat_)**.
5. Toque em **Conectar e entrar**.

Pronto. Nas próximas vezes, **só a senha**.

Bom saber:
- O token fica neste aparelho, trancado com a sua senha. Ele nunca vai para o site.
- Ele vale até a data de validade do GitHub (30 dias, se você seguiu o passo a passo). A validade aparece no fim do menu: “Token válido até …”.
- Faltando 7 dias ou menos, a **Visão geral** mostra um aviso em vermelho.
- Quando vencer, o painel pede um token novo logo depois da senha: “O token guardado neste aparelho venceu…”. Os dados privados e os modelos **continuam** guardados.
- Para trocar antes: **Configurações → Trocar o token**.
- **Computador emprestado?** Em **Opções avançadas**, marque **Aparelho compartilhado: não guardar o token (pedir de novo a cada vez)**. E sempre use **Sair** no fim (Parte E).

Mensagens que podem aparecer:

| Mensagem | O que fazer |
|---|---|
| “O GitHub não aceitou este token. Ele pode ter expirado ou sido copiado pela metade.” | Copie de novo, inteiro, ou crie outro |
| “Não encontrei esse repositório (ou o token não tem acesso a ele)…” | Crie o token na conta dona do guia e marque o repositório em **Repository access** |
| “Este token só pode ler o repositório. Gere outro com “Contents: Read and write”.” | Faltou a permissão de gravar |

Não mande o token para ninguém. Se achar que vazou, apague-o no GitHub: foto no alto → **Settings → Developer settings → Personal access tokens → Fine-grained tokens** → o token → **Delete**.

---

## Parte D · Fechar o painel: Bloquear × Sair e apagar

No fim do menu há dois botões. Em **Configurações → Acesso ao GitHub** também.

| Botão | O que faz | Quando usar |
|---|---|---|
| **Bloquear** (ou **Bloquear o painel**) | Fecha o painel. Tudo continua guardado. A senha abre de novo | No seu celular ou computador, ao terminar |
| **Sair** (ou **Sair e apagar dados deste aparelho**) | Apaga deste aparelho o token, a chave do feedback, os dados privados (Wi-Fi, portão), os modelos de mensagem, o rascunho não publicado e os comentários importados | Em aparelho que não é seu, ou antes de vender ou emprestar o seu |

Depois de **Sair**, o próximo acesso pede a senha **e** o token de novo, e os dados privados precisam ser digitados outra vez.

Se houver alterações não publicadas, **Sair** avisa antes. Publique primeiro, ou baixe uma cópia em **Configurações → Baixar cópia (.json)**.

Fechar a aba também tranca o painel: ao abrir de novo, ele pede a senha.

---

## Parte E · Esqueci a senha

A senha não fica escrita em lugar nenhum. O repositório guarda só um código embaralhado dela, no arquivo `admin/acesso.json`. Para voltar à senha inicial `casaalagoas`:

1. No computador, entre no **github.com** com a conta dona do guia.
2. Abra o repositório do guia e entre na pasta **admin**.
3. Toque no arquivo **acesso.json**.
4. Toque nos três pontinhos (**…**), no alto à direita do arquivo, e em **Delete file** (apagar arquivo).
5. Toque em **Commit changes** e confirme.
6. Espere alguns minutos. A senha `casaalagoas` volta a valer.
7. No painel, digite `casaalagoas`. Como o que estava guardado no aparelho foi trancado com a senha esquecida, aparece **Só mais um passo**.
8. Toque em **Informar o token de novo** e confirme. Os dados privados e os modelos daquele aparelho são apagados.
9. Cole um token (Parte C) e entre.
10. Troque a senha de novo (Parte G).

O mesmo passo a passo está na tela de entrada, em **Esqueceu a senha?**.

---

## Parte F · Modo demonstração

Serve para conhecer o painel sem medo. Nada é publicado.

**Como abrir:**
- Na tela de entrada, toque em **Conhecer em modo demonstração**; ou
- abra o endereço do painel com `?demo` no fim. Exemplo: `…/guia/admin/?demo`.

**Como funciona:**
- Uma faixa no alto, sempre visível, diz **Modo demonstração · nada é publicado** e conta as “publicações simuladas”.
- O painel abre com o conteúdo atual do guia. Os dados privados vêm marcados como “(exemplo)”, e o feedback usa dados de exemplo.
- Não pede senha nem token. Não usa nada guardado no aparelho.
- Ao fechar a aba ou recarregar, tudo o que você mexeu some.

**Para sair:** toque em **Sair da demonstração**, na faixa do alto.

---

## Parte G · Trocar a senha

1. No menu, toque em **Configurações**.
2. No quadro **Senha do anfitrião**, preencha:
   - **Senha atual**;
   - **Nova senha**: pelo menos 8 caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar, como “coqueiro torto na varanda”;
   - **Repita a nova senha**.
3. Toque em **Trocar a senha**.
4. Aparece: “Senha trocada. Neste aparelho ela já vale. Nos outros, passa a valer em alguns minutos…”.

O que acontece:
- O painel tranca de novo o que está neste aparelho com a senha nova.
- Ele grava no GitHub o arquivo `admin/acesso.json` com o código embaralhado da senha nova (nunca a senha).

**Nos outros aparelhos:**
1. Digite a senha **nova**.
2. Aparece **Só mais um passo**. Em **Senha anterior**, digite a senha antiga uma última vez.
3. Toque em **Atualizar e entrar**. Daí em diante, só a senha nova.
4. Se não lembrar da anterior, toque em **Informar o token de novo**. Os dados privados daquele aparelho são apagados.

**Se a gravação no GitHub falhar,** a senha vale só neste aparelho. Abre a janela **Gravar a senha nova no GitHub**:
1. Toque em **Copiar o conteúdo**.
2. No GitHub, abra a pasta **admin** e o arquivo **acesso.json**.
3. Toque no lápis (**Edit this file**). Se o arquivo não existir, use **Add file → Create new file** com o nome `acesso.json`.
4. Apague tudo, cole o que copiou e toque em **Commit changes**.

---

## Parte H · Conhecer o painel

No celular, o menu abre no botão **Seções**, no alto. Ele tem quatro grupos:

| Grupo | Telas |
|---|---|
| (início) | **Visão geral**: o que falta no guia, atalhos de hospedagem, nota média. **Feedback**: o que os hóspedes disseram (guia 3) |
| **Hospedagem** | **Receber hóspede**, **Dados privados**, **Impressos**, **Virada da casa** (guia 7) |
| **Conteúdo do guia** | **A casa**, **Chegada e saída**, **Lugares**, **Roteiros**, **Contatos**, **Benefícios**, **Avaliações**, **Região e sabores** |
| **Sistema** | **Fotos**, **QR Code do guia** (guia 4), **Configurações**, **Avançado** (só com ajuda de um programador) |

Na **Visão geral**, cada pendência tem um botão **Resolver**, que leva à tela certa. O número ao lado de “Visão geral” no menu conta as pendências.

---

## Parte I · Editar

1. Toque na tela que quer mudar, por exemplo **A casa**.
2. Escreva nos campos. Cada mudança é salva na hora num **rascunho**, neste aparelho.
3. Nos campos de lista (como **Regras da casa**), escreva **um item por linha**.
4. Nas telas de lista (**Lugares**, **Roteiros**, **Contatos**, **Benefícios**, **Avaliações**):
   - **Adicionar** cria um item novo.
   - **Editar** abre o item. Lá embaixo há **Excluir**, **Duplicar** e **Concluir**.

Dicas:
- **A casa → Comodidades**: marque **Mostrar na faixa de destaques da página inicial** nas principais.
- **A casa → WhatsApp do anfitrião**: 55 + DDD + número, só algarismos. Exemplo: `5582999999999`.
- **A casa → Instagram da casa**: só o nome do perfil, sem @.
- **A casa → Latitude da casa** e **Longitude da casa**: no Google Maps, toque e segure no ponto da casa e copie os números. Eles afinam a maré, o tempo e o mapa.
- **Lugares → Status**: **Publicado no site** aparece para o hóspede; **Rascunho (oculto)** não.
- **Lugares → Conferi hoje**: toque depois de confirmar horário, contato e preço. O site passa a mostrar “Conferido pelo anfitrião em…”.
- **Lugares → Destaque na página inicial**: a página inicial mostra até 8.
- **Lugares → Nota interna — nunca aparece no site**: serve para lembretes seus. Ela não aparece para o hóspede, **mas fica no arquivo público do GitHub** (`dados/conteudo.json`). Não escreva dado pessoal nem senha ali.
- Links precisam começar com `https://`.

A barra do alto mostra **Tudo publicado** ou **Alterações em N seções, ainda não publicadas**.

**Rascunho guardado:** se você fechar sem publicar, ao voltar o painel pergunta “Você tem alterações não publicadas salvas neste aparelho (…). Continuar de onde parou?”. **OK** volta ao rascunho; **Cancelar** apaga o rascunho.

**Desfazer tudo:** **Configurações → Descartar alterações não publicadas**.

---

### Reservas e disponibilidade (A casa)
- **Link do anúncio para reservar**: o endereço do anúncio (`https://www.airbnb.com.br/rooms/…`). Vira o botão **Reservar no Airbnb** na capa do site (visível no celular sem rolar), no topo do computador e no rodapé. Se não for do Airbnb, o botão diz só **Reservar** e o painel avisa. Sem https, não aparece. Vazio = nenhum botão.
- **Mostrar a agenda no site**: liga a seção **Disponibilidade** (página inicial e `#/disponibilidade`), com 2 meses no computador e 1 no celular. Precisa do Apps Script do feedback com `ICAL_URL` (guia 3, Parte G). Se o Google falhar, a seção some sozinha (ou vira só o botão “Ver disponibilidade no Airbnb”).
- **Testar agenda** mostra a prévia do calendário. Na demonstração (`admin/?demo`), com datas fictícias.
- O link do calendário (`.ics`) é secreto: o painel recusa se ele for colado aqui e avisa se aparecer em qualquer texto.

## Parte J · Fotos

**Pela tela Fotos:**
1. Abra **Fotos**.
2. Toque em **Toque para escolher fotos ou arraste para cá**.
3. Espere cada foto mostrar “enviada”. O painel reduz a foto para abrir rápido no celular.

**Direto no campo:**
1. Toque no quadrado da foto (em **A casa → Fotos**, toque em **+ Foto**).
2. Toque em **Enviar uma foto nova** ou escolha em **Ou escolha uma já enviada**.
3. Escreva a descrição da foto. Exemplo: “varanda com rede e vista para o coqueiral”.

Bom saber:
- A **primeira foto** de **A casa** é a capa da página inicial.
- A foto vai para o GitHub na hora, mas só aparece no guia depois de usada num campo e de **Publicar**.
- O repositório é público. Não envie fotos com documentos, placas de carro, rostos sem autorização ou o teclado do portão.
- Sem foto, o site mostra uma ilustração com o selo “Ilustração”.

---

## Parte K · Pré-visualizar e publicar

**Pré-visualizar:**
1. Toque em **Pré-visualizar**, na barra do alto.
2. Abre uma aba com a faixa de pré-visualização. Nada foi publicado ainda.
3. Feche a aba quando terminar.

**Publicar:**
1. Toque em **Publicar**, na barra do alto.
2. A janela **Publicar alterações** mostra **O que muda no site**.
3. Em **Descrição da alteração (fica no histórico)**, deixe o texto sugerido.
4. Toque em **Publicar agora**. (Ou em **Pré-visualizar antes**.)
5. Aparece “Publicado! O site atualiza em até alguns minutos.” Quem já abriu o guia pode levar uns 10 minutos para ver a mudança.

Ao publicar, o painel grava **só dados**: o conteúdo (`dados/conteudo.json`), a imagem do WhatsApp (`compartilhar.jpg`) e o título e a prévia no `index.html`, entre as marcas `compartilhar`. Ele nunca muda o código do site (guia 9).

### O detector de senhas

Antes de publicar, o painel procura nos textos algo que pareça senha ou código.

| O que aparece | O que fazer |
|---|---|
| “Encontrei algo que parece senha ou código de acesso.” **Publicar agora** fica bloqueado | Toque em **Corrigir**, apague o trecho. Senhas vão nas mensagens de **Receber hóspede** |
| “Confira estes trechos: podem ser senha ou código.” | Se não for senha, marque **Conferi: não são senhas nem códigos. Publicar mesmo assim.** |

Frases como “A senha do Wi-Fi está no cartão da casa” não disparam o alerta. O detector ajuda, mas não é perfeito.

### “Mudanças nos dois lados”

Acontece quando o guia foi alterado em dois aparelhos ao mesmo tempo.
- Se as mudanças são em pontos diferentes, o painel junta sozinho.
- Se o mesmo ponto mudou dos dois lados, abre a janela **Mudanças nos dois lados**. Nada é publicado até você escolher **Ficar com a minha nesses pontos**, **Ficar com a do site** ou (só ao abrir o painel) **Descartar meu rascunho**.

Para evitar: publique antes de trocar de aparelho.

### Outras mensagens

| Mensagem | O que fazer |
|---|---|
| “O site mudou no GitHub enquanto você publicava. Toque em Publicar de novo…” | Toque em **Publicar** de novo |
| “O GitHub não aceitou o token (expirado ou revogado)…” | **Configurações → Trocar o token** (Parte C) |
| “O token não tem permissão para isso…” | Crie um token com **Contents: Read and write** |
| “Sem conexão com o GitHub. Confira a internet e tente de novo.” | O rascunho está salvo. Tente quando tiver sinal |
| “Conteúdo publicado. Aviso: o index.html publicado não tem os marcadores…” | O conteúdo já está no ar. Só o título e a prévia do WhatsApp não mudaram, porque o código do site é antigo. Suba o código novo (guia 9) |

---

## Parte L · Formato dos dados (guias antigos)

Em guias publicados antes de 27/10/2026, o conteúdo fica no arquivo antigo `conteudo.js`. Ao entrar, o painel oferece **Atualizar formato**, que cria `dados/conteudo.json`. O botão também fica em **Configurações → Formato dos dados**, junto com **Apagar o conteudo.js antigo**. Antes, suba o código novo. O passo a passo está no guia 9, Parte B.

## Parte M · Cópia de segurança

Em **Configurações → Cópia de segurança**:
- **Baixar cópia (.json)** salva todo o conteúdo num arquivo. Faça antes de mudanças grandes.
- **Restaurar cópia** coloca esse arquivo de volta no rascunho. Nada é publicado sozinho.

## Se o navegador bloquear o armazenamento

Aparece: “O navegador está bloqueando o armazenamento deste site.” Dá para editar e publicar, mas o rascunho, o token e os dados privados somem ao fechar a aba. Permita cookies e dados de sites para o endereço do painel. Janelas anônimas costumam bloquear.

# 2. Painel do anfitrião

O painel é onde você edita o guia. Ele abre no navegador, no celular ou no computador:

`https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/admin/`

Os nomes de botões e telas abaixo estão escritos exatamente como aparecem no painel.

---

## Parte A · Criar o token (uma vez a cada 7 a 30 dias)

> **Token** é uma senha especial, gerada pelo GitHub, que dá ao painel permissão para gravar no seu repositório. Você escolhe o que ela pode fazer e quando ela vence.

O token fica **só no seu navegador**. Ele nunca vai para o site nem para o repositório.

1. Entre no **github.com** com a sua conta.
2. Toque na sua foto, no canto de cima, e depois em **Settings**.
3. No fim do menu da esquerda, toque em **Developer settings**.
4. Toque em **Personal access tokens → Fine-grained tokens**.
   - *Fine-grained* quer dizer "com permissões finas": o token vale só para o que você marcar.
5. Toque em **Generate new token** (gerar token novo).
6. Em **Token name**, escreva um nome que lembre o uso. Exemplo: `painel guia celular`.
7. Em **Expiration** (validade), escolha **30 days** ou **7 days**.
   - Prazo curto é mais seguro. Quando vencer, é só gerar outro (Parte H).
8. Em **Repository access**, escolha **Only select repositories** e marque **só o repositório do guia**.
9. Em **Permissions → Repository permissions**, procure **Contents** e escolha **Read and write** (ler e gravar).
   - Em algumas telas é preciso tocar em **Add permissions** antes, para a lista aparecer.
   - Não marque mais nada. O **Metadata: Read-only** entra sozinho e é normal.
10. Toque em **Generate token**.
11. **Copie o token agora** (começa com `github_pat_`). O GitHub só mostra uma vez.

Não mande o token para ninguém, nem por WhatsApp. Se achar que ele vazou, apague-o nessa mesma tela do GitHub (**Delete**).

O passo a passo resumido também está no próprio painel, em **Primeira vez? Como criar o token (2 minutos)**.

## Parte B · Entrar no painel

1. Abra o endereço do painel.
2. Na primeira vez, abra **Onde está o guia no GitHub** e preencha:
   - **Usuário ou organização**: o seu nome de usuário do GitHub.
   - **Repositório**: o nome do repositório (exemplo: `guia`).
   - **Branch**: deixe `main`.
3. Em **Token de acesso do GitHub**, cole o token.
4. Escolha se quer **Lembrar neste aparelho** (Parte C). Se não marcar, o acesso vale só enquanto a aba estiver aberta.
5. Toque em **Entrar no painel**.

Nas próximas vezes, o painel já lembra o usuário e o repositório. Eles aparecem recolhidos como **Repositório: usuário/repositório · trocar**.

Mensagens que podem aparecer:

| Mensagem | O que significa |
|---|---|
| "O GitHub não aceitou este token. Ele pode ter expirado ou sido copiado pela metade." | Copie de novo, inteiro, ou gere outro |
| "Não encontrei esse repositório (ou o token não tem acesso a ele). Confira os nomes." | Nome errado, ou o token não marcou esse repositório |
| "Este token só pode ler o repositório. Gere outro com “Contents: Read and write”." | Faltou a permissão de gravar |

## Parte C · "Lembrar neste aparelho" e a senha local

Sem essa opção, você cola o token toda vez que abre o painel.

Com ela, o painel guarda o token **trancado** com uma senha que você cria.

1. Marque **Lembrar neste aparelho (protegido por uma senha sua)**.
2. Em **Crie uma senha local**, escreva uma senha de **no mínimo 8 caracteres**.
3. Em **Repita a senha**, escreva de novo.
4. Toque em **Entrar no painel**.

Como funciona depois:
- Ao abrir o painel, aparece **Que bom te ver de novo**. Digite a **Senha local** e toque em **Entrar no painel**.
- A senha local não é a senha do GitHub. Ela vale **só neste aparelho e neste navegador**.
- O acesso guardado dura **no máximo 30 dias**, ou até o token vencer, o que vier primeiro. Depois disso o painel pede o token de novo.
- A chave de leitura do feedback (guia 3) também fica guardada, trancada com a mesma senha.

**Se esquecer a senha local:**
1. Na tela **Que bom te ver de novo**, toque em **Entrar com um token novo**.
2. Confirme. O acesso guardado é apagado.
3. Entre com um token (pode ser um novo). Se quiser, crie uma senha local nova.
- Ninguém consegue recuperar a senha local, nem o programador. Por isso o caminho é apagar e entrar de novo.
- Alterações que você ainda não publicou continuam salvas no aparelho.
- O token antigo continua valendo no GitHub até vencer. Se quiser, apague-o lá (Parte A).

## Parte D · Conhecer o painel

O menu tem estas telas:

| Tela | O que tem |
|---|---|
| **Visão geral** | O que falta no guia, a nota média e o card **Como atualizar o guia** |
| **Feedback** | O que os hóspedes disseram (guia 3) |
| **A casa** | Apresentação, contato, horários, fotos, números, ambientes, comodidades, combinados e dúvidas frequentes |
| **Chegada e saída** | Trajetos, portaria, chaves, estacionamento, imprevistos e checklist de saída |
| **Lugares** | Praias, passeios, restaurantes e serviços |
| **Roteiros** | Os "Dias prontos para viver" |
| **Contatos** | Emergência e serviços, por urgência |
| **Benefícios** | Descontos com parceiros (só acordos fechados) |
| **Avaliações** | Depoimentos publicados |
| **Região e sabores** | Quando ir, maré, como se locomover, chuva e "O que provar" |
| **Fotos** | Enviar e ver as fotos |
| **QR Code** | Cartão para imprimir e endereço do site (guia 4) |
| **Configurações** | Feedback, imagem de compartilhamento, cópia de segurança e acesso |
| **Avançado** | Todo o conteúdo em formato técnico. Use só com ajuda de um programador |

Na **Visão geral**, cada item pendente tem um botão **Resolver**, que leva à tela certa. O número ao lado de "Visão geral" no menu conta as pendências.

## Parte E · Editar

1. Toque na tela que quer mudar, por exemplo **A casa**.
2. Escreva nos campos. Cada mudança é salva **na hora** num rascunho, neste aparelho.
3. Nos campos de lista (como **Regras da casa**), escreva **um item por linha**.
4. Nas telas de lista (**Lugares**, **Roteiros**, **Contatos**, **Benefícios**, **Avaliações**):
   - **Adicionar** cria um item novo.
   - **Editar** abre o item. Lá embaixo há **Excluir**, **Duplicar** e **Concluir**.
   - Com mais de 6 itens aparece um campo para filtrar.

Dicas por tela:
- **A casa → Comodidades**: marque **★ Mostrar na faixa de destaques da página inicial** em até 4 comodidades.
- **A casa → WhatsApp do anfitrião**: use DDI + DDD + número, só algarismos. Exemplo: `5582999999999`. Ele liga todos os botões "Falar com o anfitrião" do site.
- **A casa → Instagram da casa**: só o nome do perfil, sem @. Se colar o link, o painel limpa sozinho.
- **Lugares → Status**: **Publicado no site** aparece para o hóspede. **Rascunho (oculto)** não aparece.
- **Lugares → Conferi hoje**: toque depois de confirmar horário, contato e preço. O site passa a mostrar "Conferido pelo anfitrião em…".
- **Lugares → Destaque na página inicial**: a página inicial mostra até 8 destaques.
- Links precisam começar com `https://`. Se não começarem, o campo fica vermelho e a publicação é bloqueada.

A barra do alto mostra o estado:
- **Tudo publicado**: não há nada novo.
- **Alterações em N seções, ainda não publicadas**: há rascunho esperando.

**Rascunho guardado:** se você fechar o painel sem publicar e abrir de novo, ele pergunta "Você tem alterações não publicadas salvas neste aparelho (…). Continuar de onde parou?".
- **OK** volta ao rascunho.
- **Cancelar** apaga o rascunho e mostra o que está no site.

**Desfazer tudo:** **Configurações → Descartar alterações não publicadas**.

## Parte F · Fotos

Há dois jeitos de pôr fotos.

**Pela tela Fotos:**
1. Abra **Fotos**.
2. Toque em **Toque para escolher fotos ou arraste para cá** e escolha as fotos.
3. Espere cada uma mostrar "enviada". O painel reduz a foto para até 1800 px e converte o formato, para abrir rápido no celular do hóspede.

**Direto no campo:**
1. Toque no quadrado da foto (em **A casa → Fotos**, toque em **+ Foto**; num lugar, em **Foto do lugar**).
2. Na janela **Escolher foto**, toque em **Enviar uma foto nova** ou escolha uma em **Ou escolha uma já enviada**.
3. Escreva a descrição da foto. Ela serve a quem usa leitor de tela. Exemplo: "varanda com rede e vista para o coqueiral".

Bom saber:
- A **primeira foto** de **A casa** é a **capa** da página inicial. Use **← mover** para mudar a ordem.
- O envio grava a foto no GitHub na hora. Mas ela **só aparece no guia** depois que você usar a foto num campo e tocar em **Publicar**.
- Toda foto enviada fica num repositório público. Não envie fotos com documentos, placas de carro, rostos sem autorização ou o teclado do portão.
- **Apagar** só aparece em fotos que não estão em uso. Fotos "em uso" estão no rascunho ou no site publicado: tire a foto de lá e publique antes.
- Sem foto, o site mostra uma ilustração com o selo "Ilustração". Nunca use foto de outro lugar como se fosse da casa.

## Parte G · Pré-visualizar e publicar

**Pré-visualizar:**
1. Toque em **Pré-visualizar**, na barra do alto.
2. Abre uma aba nova com a faixa "Pré-visualização do rascunho · nada foi publicado ainda".
3. Navegue como hóspede. Feche a aba quando terminar.
- A prévia só funciona neste navegador. Se o navegador bloquear janelas novas, permita para o endereço do painel.

**Publicar:**
1. Toque em **Publicar**, na barra do alto. (Ele fica apagado quando não há nada novo.)
2. A janela **Publicar alterações** mostra **O que muda no site**.
3. Em **Descrição da alteração (fica no histórico)**, deixe o texto sugerido ou escreva o seu.
4. Toque em **Publicar agora**.
5. Aparece "Publicado! O site atualiza em cerca de 1 minuto."

Ao publicar, o painel também atualiza o título do site e a imagem que aparece no WhatsApp. Se só essa parte falhar, aparece um aviso: "Conteúdo publicado, mas o título e a imagem de compartilhamento (WhatsApp) não foram atualizados: …". O conteúdo já está no ar; tente publicar de novo depois.

### O detector de senhas

Antes de publicar, o painel lê todos os textos procurando algo que pareça senha ou código: palavras como senha, código, PIN, cadeado, cofre, Wi-Fi, portão, fechadura, alarme, junto de números ou palavras soltas depois de ":" ou "é".

Ele tem dois níveis:

| Nível | O que aparece | O que fazer |
|---|---|---|
| **Parece senha** | "Encontrei algo que parece senha ou código de acesso." O botão **Publicar agora** fica bloqueado | Toque em **Corrigir**, apague o trecho e mande o dado por WhatsApp |
| **Pode ser senha** | "Confira estes trechos: podem ser senha ou código." | Toque em **Corrigir** para ver. Se não for senha, marque **Conferi: não são senhas nem códigos. Publicar mesmo assim.** |

- Cada trecho mostra **onde** ele está, por exemplo "A casa › Dúvidas frequentes (resposta)".
- Frases como "A senha do Wi-Fi é enviada por mensagem" **não** disparam o alerta.
- O **Código promocional (público)** dos benefícios não é conferido, porque ele é público de propósito. Não use esse campo para senhas.
- Na **Visão geral**, o grupo **Segurança** mostra "Nenhuma senha ou código no conteúdo" quando está tudo limpo.

O detector ajuda, mas não é perfeito. A regra continua: **nada de senha no guia**.

### "Mudanças nos dois lados"

Isso acontece quando o guia foi alterado em dois lugares ao mesmo tempo. Por exemplo: você editou no computador, não publicou, e depois publicou outra coisa pelo celular.

- Quando as mudanças são em pontos diferentes, o painel **junta tudo sozinho** e avisa: "Juntei as duas versões: confira o que muda antes de publicar."
- Quando o **mesmo ponto** mudou dos dois lados, abre a janela **Mudanças nos dois lados**, com a lista desses pontos. **Nada é publicado** até você escolher:
  - **Ficar com a minha nesses pontos**: vale o que está neste aparelho.
  - **Ficar com a do site**: vale o que já está publicado.
  - **Descartar meu rascunho** (só aparece ao abrir o painel): joga fora o rascunho deste aparelho.
- O resto já está junto. Depois de escolher, revise e toque em **Publicar** de novo.

Para evitar: publique antes de trocar de aparelho.

### Outras mensagens ao publicar

| Mensagem | O que fazer |
|---|---|
| "O site mudou no GitHub enquanto você publicava. Toque em Publicar de novo: o painel junta as alterações." | Toque em **Publicar** de novo |
| "O GitHub não aceitou o token (expirado ou revogado). Saia e entre com um token novo." | Parte H |
| "O token não tem permissão para isso. Ele precisa de “Contents: Read and write” neste repositório." | Gere um token com essa permissão |
| "Sem conexão com o GitHub. Confira a internet e tente de novo." | Seu rascunho está salvo. Tente quando tiver sinal |

## Parte H · Sair e renovar o token

**Sair:**
1. Toque em **Sair**, no fim do menu. Ou em **Configurações → Sair e apagar dados deste aparelho**.
2. Confirme.
3. O painel apaga deste aparelho: o token, o acesso guardado, a chave do feedback, o rascunho e os comentários importados. Só o nome do usuário e do repositório ficam, para facilitar a próxima entrada.

Se houver alterações não publicadas, o painel avisa antes: "Há alterações não publicadas. Se sair, elas serão apagadas deste aparelho." Publique antes, ou baixe uma cópia em **Configurações → Baixar cópia (.json)**.

Sempre saia ao usar um computador que não é seu.

**Quando o token vence:**
- A validade aparece no fim do menu ("Token válido até …") e em **Configurações → Acesso**.
- Faltando 7 dias ou menos, a **Visão geral** mostra um aviso em vermelho.
- Se o GitHub não informar a validade, essa linha não aparece. Anote a data que você escolheu.

**Para renovar:**
1. Publique o que estiver pendente.
2. Gere um token novo no GitHub (Parte A). Na mesma tela, você pode apagar o antigo.
3. No painel, toque em **Sair**.
4. Entre com o token novo (Parte B) e, se quiser, marque **Lembrar neste aparelho** de novo.

Se o token vencer no meio do uso, o painel mostra "Seu acesso expirou. Entre de novo com um token válido."

## Parte I · Cópia de segurança

Em **Configurações → Cópia de segurança**:
- **Baixar cópia (.json)** salva todo o conteúdo num arquivo no seu aparelho. Faça antes de mudanças grandes.
- **Restaurar cópia** coloca um arquivo desses de volta no **rascunho**. Nada é publicado sozinho: revise e toque em **Publicar**.

O GitHub também guarda o histórico de cada publicação. Um programador consegue voltar a uma versão antiga por lá.

## Se o navegador bloquear o armazenamento

Aparece: "O navegador está bloqueando o armazenamento deste site."
- Dá para editar e publicar normalmente.
- Mas o rascunho e o login somem quando você fecha a aba, e a pré-visualização não funciona.
- Para corrigir, permita cookies e dados de sites para o endereço do painel, nas configurações do navegador. Janelas anônimas costumam bloquear.

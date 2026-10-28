# Esquema dos dados · `dados/conteudo.json` (esquema 2)

Este arquivo é **só dados** (JSON puro, UTF-8, indentado). O código do site não fica aqui e não precisa mudar quando o conteúdo muda.
O painel do anfitrião edita e publica este arquivo; dá para editar à mão no GitHub também, com o mesmo resultado.

## Regras do contrato

- O contrato está em `assets/dados.js` (`GuiaDados.normalizar`). O **site** e o **painel** aplicam a mesma normalização.
- Campo ausente ou com tipo errado vira o padrão: texto `""`, número `null`, sim/não com o padrão indicado, lista `[]`, objeto com os campos padrão.
- Itens inválidos dentro de listas (`null`, número no lugar de objeto…) são descartados; os bons ficam.
- Textos acima de 20 000 caracteres são cortados. Todo texto é escapado ao aparecer no site (HTML vira texto).
- Campos desconhecidos são **preservados** no arquivo e ignorados pelo site (um painel mais novo não perde nada num site mais antigo).
- `esquema` antigo é migrado ao abrir. Esquema 1 = o antigo `conteudo.js` (`window.CONTEUDO = …`, com `versao`). 1 → 2: remove `versao`; `og_imagem` e fotos em texto viram `{src, alt}`.
- O painel grava sempre o esquema atual. Para mudar o formato de um campo: suba `ESQUEMA` em `assets/dados.js`, escreva o degrau em `MIGRACOES` e atualize esta tabela.

**Obrigatório** = sem esse campo o item não aparece no site (o arquivo continua válido). `sim*` = obrigatório dentro do objeto opcional (ex.: foto sem `src` vira `null`).

| Campo | Tipo | Obrigatório | Onde aparece |
|---|---|---|---|
| `esquema` | número inteiro | sim | Versão do formato. O painel grava sempre o atual; o site migra versões antigas. |
| `atualizado_em` | texto |  | Data da última publicação (o painel preenche). |
| `casa` | objeto |  | Tudo sobre a casa. |
| `casa.nome` | texto |  | Topo, capa, título da aba, rodapé (padrão: "Casa 18 Anahi"). |
| `casa.subtitulo` | texto |  | Reserva para textos de apoio. |
| `casa.anfitriao` | texto |  | Ajuda (nome do anfitrião), Privacidade, mensagem do WhatsApp. |
| `casa.whatsapp` | texto |  | Botões "Falar com o anfitrião" em todo o site (só dígitos, com DDI 55). |
| `casa.checkin` | texto |  | Chegada, atalho da home, calendário (.ics). |
| `casa.checkout` | texto |  | Chegada, calendário (.ics). |
| `casa.area_m2` | número ou null |  | A casa (números, cabeçalho). |
| `casa.hospedes` | número ou null |  | Home (faixa) e A casa. |
| `casa.quartos` | número ou null |  | Home (faixa) e A casa. |
| `casa.suites` | número ou null |  | Junto aos quartos. |
| `casa.banheiros` | número ou null |  | A casa (aparece só se preenchido). |
| `casa.camas` | lista |  | A casa › Camas. |
| `casa.endereco_publico` | texto |  | Home (localização), Chegada, rodapé, rota até a casa. |
| `casa.link_maps` | texto |  | Botão "Como chegar" (prioridade sobre coordenadas). |
| `casa.coordenadas` | objeto ou null |  | Maré, previsão, mapa e rota. Sem elas, usa o centro da região. |
| `casa.coordenadas.lat` | número ou null | sim* | Latitude (com lng). |
| `casa.coordenadas.lng` | número ou null | sim* | Longitude (com lat). |
| `casa.fotos` | lista |  | Capa da home (1ª), "Sobre" (2ª–4ª) e galeria de A casa. |
| `casa.fotos[].src` | texto | sim | Endereço da foto (fotos/… ou https://). |
| `casa.fotos[].alt` | texto |  | Descrição para leitor de tela. |
| `casa.ambientes` | lista |  | A casa › Ambientes. |
| `casa.ambientes[].nome` | texto |  | Título do ambiente. |
| `casa.ambientes[].descricao` | texto |  | Texto do ambiente. |
| `casa.ambientes[].foto` | objeto ou null |  | Foto do ambiente (sem ela, ilustração). |
| `casa.ambientes[].foto.src` | texto | sim* | Endereço da foto. |
| `casa.ambientes[].foto.alt` | texto |  | Descrição da foto. |
| `casa.comodidades` | lista |  | A casa › Comodidades; com destaque, na faixa da home. |
| `casa.comodidades[].icone` | texto |  | wifi, ar, cozinha, cama, toalha, carro, piscina, praia, tv, maquina, churrasqueira, chuveiro, varanda, rede, outro. |
| `casa.comodidades[].nome` | texto |  | Nome. |
| `casa.comodidades[].descricao` | texto |  | Detalhe. |
| `casa.comodidades[].destaque` | sim/não |  | Se sim, entra na faixa de destaques da home. |
| `casa.regras_casa` | lista |  | A casa › Combinados. |
| `casa.regras_condominio` | lista |  | A casa › Combinados. |
| `casa.lixo_limpeza` | lista |  | A casa › Combinados. |
| `casa.seguranca` | lista |  | A casa › Combinados. |
| `casa.faq` | lista |  | A casa › Dúvidas frequentes e busca. |
| `casa.faq[].pergunta` | texto |  | Pergunta. |
| `casa.faq[].resposta` | texto |  | Resposta. |
| `casa.chegada` | objeto |  | Página Chegada e saída. |
| `casa.chegada.como_chegar` | texto |  | Chegada › Até a portaria. |
| `casa.chegada.entrada` | texto |  | Chegada › Na portaria. |
| `casa.chegada.chaves` | texto |  | Chegada › Chaves e acesso (nunca senhas: o painel bloqueia). |
| `casa.chegada.estacionamento` | texto |  | Chegada › Estacionamento. |
| `casa.chegada.saida` | lista |  | Chegada › Na saída (passos). |
| `casa.chegada.imprevistos` | texto |  | Chegada › Atrasos e imprevistos. |
| `casa.chegada.trajetos` | lista |  | Home (localização) e Chegada › Trajetos. |
| `casa.chegada.trajetos[].icone` | texto |  | aviao, estrada, pino, carro, onibus. |
| `casa.chegada.trajetos[].titulo` | texto |  | Título. |
| `casa.chegada.trajetos[].texto` | texto |  | Texto. |
| `casa.frase` | texto |  | Capa e citação da home (frase-assinatura). |
| `casa.sobre` | texto |  | Home › Sobre a casa e A casa (capitular). |
| `casa.instagram` | texto |  | Rodapé (sem @). |
| `casa.link_reserva` | texto |  | Botão "Reservar no Airbnb" (ou "Reservar", se não for Airbnb) na capa, no topo (computador), na agenda e no rodapé. Só https://; vazio = nenhum botão. |
| `casa.video_url` | texto |  | Botão do vídeo na capa (opcional). |
| `config` | objeto |  | Configurações técnicas. |
| `config.feedback_endpoint` | texto |  | Envio do formulário de Feedback (Apps Script). |
| `config.og_imagem` | objeto ou null |  | Foto escolhida para compartilhar; o painel gera compartilhar.jpg dela ao publicar. |
| `config.og_imagem.src` | texto | sim* | Endereço da foto. |
| `config.og_imagem.alt` | texto |  | Descrição (og:image:alt). |
| `config.url_publica` | texto |  | Endereço público do site (QR Code, og:url). Vazio = deduzido do repositório. |
| `config.agenda_visivel` | sim/não |  | Sim = mostra a agenda "Disponibilidade" (home e #/disponibilidade), lida do Apps Script (config.feedback_endpoint?acao=agenda). Padrão não. O link iCal fica só no script (ICAL_URL), nunca aqui. |
| `regiao` | objeto |  | Informações da região. |
| `regiao.centro` | objeto ou null |  | Centro do mapa e reserva de maré/previsão. |
| `regiao.centro.lat` | número ou null | sim* | Latitude. |
| `regiao.centro.lng` | número ou null | sim* | Longitude. |
| `regiao.cidades` | lista |  | Rótulos de cidades no mapa. |
| `regiao.cidades[].nome` | texto |  | Nome. |
| `regiao.cidades[].lat` | número ou null |  | Latitude. |
| `regiao.cidades[].lng` | número ou null |  | Longitude. |
| `regiao.quando_ir` | lista |  | Maré e tempo › Quando ir. |
| `regiao.mares` | lista |  | Maré e tempo › Como ler a maré. |
| `regiao.mobilidade` | lista |  | Ajuda › Como se locomover. |
| `regiao.dias_de_chuva` | lista |  | Maré e tempo › Se chover. |
| `regiao.fontes` | lista |  | Referências (uso do painel). |
| `regiao.fontes[].titulo` | texto |  | Título. |
| `regiao.fontes[].url` | texto |  | Endereço. |
| `regiao.dicas` | lista |  | Ajuda › Bom saber antes de sair. |
| `regiao.o_que_levar` | lista |  | Checklist "O que levar" (Maré e tempo). |
| `lugares` | lista |  | Explorar, Onde comer, Mapa, busca, Meu roteiro, destaques. |
| `lugares[].id` | texto | sim | Identificador único (letras minúsculas, números e hífen); usado em links, destaques e roteiros. |
| `lugares[].nome` | texto | sim | Nome no card e na ficha. |
| `lugares[].categoria` | texto |  | praia, natureza, passeio, cultura, compras (Explorar); restaurante, cafe, mercado, delivery (Onde comer); farmacia, saude, servico. |
| `lugares[].tipo` | texto |  | Onde comer: agrupamento (Frutos do mar, Cozinha alagoana…). |
| `lugares[].area` | texto |  | Filtro por cidade e meta do card. |
| `lugares[].tags` | lista |  | familia, casal, aventura (filtros). |
| `lugares[].resumo` | texto |  | Card. |
| `lugares[].descricao` | texto |  | Ficha. |
| `lugares[].dica` | texto |  | Ficha › Dica do anfitrião. |
| `lugares[].bom_saber` | lista |  | Ficha › Bom saber. |
| `lugares[].depende_mare` | sim/não |  | Selo "Maré baixa" e alertas de maré. |
| `lugares[].reserva` | sim/não |  | Selo "Reservar antes". |
| `lugares[].foto` | objeto ou null |  | Foto do card e da ficha (sem ela, ilustração). |
| `lugares[].foto.src` | texto | sim* | Endereço da foto. |
| `lugares[].foto.alt` | texto |  | Descrição. |
| `lugares[].endereco` | texto |  | Ficha e rota. |
| `lugares[].lat` | número ou null |  | Mapa e rota (com lng). |
| `lugares[].lng` | número ou null |  | Mapa e rota (com lat). |
| `lugares[].precisao` | texto |  | exata ou aproximada (marcador tracejado). |
| `lugares[].distancia` | texto |  | Card e ficha. |
| `lugares[].duracao` | texto |  | Ficha. |
| `lugares[].preco` | texto |  | Ficha. |
| `lugares[].horario` | texto |  | Ficha (Onde comer). |
| `lugares[].melhor_periodo` | texto |  | Ficha. |
| `lugares[].telefone` | texto |  | Ficha › Ligar. |
| `lugares[].whatsapp` | texto |  | Ficha › WhatsApp. |
| `lugares[].link` | texto |  | Ficha › Site/Reservar. |
| `lugares[].link_cardapio` | texto |  | Ficha › Cardápio. |
| `lugares[].parceiro` | sim/não |  | Selo Parceiro. |
| `lugares[].patrocinado` | sim/não |  | Selo Patrocinado e aviso. |
| `lugares[].status` | texto |  | publicado (padrão) ou rascunho (não aparece no site). |
| `lugares[].fonte` | objeto |  | Ficha › Fonte. |
| `lugares[].fonte.titulo` | texto |  | Título da fonte. |
| `lugares[].fonte.url` | texto |  | Endereço da fonte. |
| `lugares[].verificado` | AAAA-MM-DD ou null |  | Data em que o anfitrião conferiu ("Conferido em…"). |
| `lugares[].nota_interna` | texto |  | Só no painel (fica no arquivo público do GitHub: nada pessoal). |
| `destaques` | lista |  | Home › Rota dos Milagres (ids de lugares, na ordem). |
| `roteiros` | lista |  | Home, Explorar, página do roteiro, Meu roteiro. |
| `roteiros[].id` | texto | sim | Identificador (link #/roteiro/id). |
| `roteiros[].titulo` | texto | sim | Título. |
| `roteiros[].subtitulo` | texto |  | Card e cabeçalho. |
| `roteiros[].quando` | texto |  | Card e quadro "Quando". |
| `roteiros[].ideal` | texto |  | Quadro "Ideal para". |
| `roteiros[].ilustracao` | texto |  | Cena da ilustração (praia, barra, capela, vila…). |
| `roteiros[].status` | texto |  | publicado (padrão) ou rascunho. |
| `roteiros[].paradas` | lista |  | Linha do tempo do roteiro. |
| `roteiros[].paradas[].momento` | texto |  | Manhã, tarde… |
| `roteiros[].paradas[].titulo` | texto |  | Título da parada. |
| `roteiros[].paradas[].texto` | texto |  | Texto. |
| `roteiros[].paradas[].lugar` | texto |  | id de um lugar (link para a ficha). |
| `provar` | lista |  | Home e Onde comer › O que provar. |
| `provar[].nome` | texto |  | Prato. |
| `provar[].descricao` | texto |  | Descrição. |
| `contatos` | lista |  | Ajuda e busca. |
| `contatos[].nome` | texto | sim | Nome. |
| `contatos[].categoria` | texto |  | Selo. |
| `contatos[].nivel` | texto |  | emergencia, essencial (padrão), conveniencia, parceiro. |
| `contatos[].telefone` | texto |  | Botão Ligar. |
| `contatos[].whatsapp` | texto |  | Botão WhatsApp. |
| `contatos[].horario` | texto |  | Linha de informação. |
| `contatos[].obs` | texto |  | Observação ("Fonte: …" no fim vira crédito). |
| `contatos[].endereco` | texto |  | Endereço e rota. |
| `contatos[].distancia` | texto |  | Linha de informação. |
| `contatos[].verificado` | AAAA-MM-DD ou null |  | Data de conferência. |
| `contatos[].nota_interna` | texto |  | Só no painel (pública no GitHub). |
| `beneficios` | lista |  | Home e Benefícios. |
| `beneficios[].titulo` | texto | sim | Título. |
| `beneficios[].parceiro` | texto | sim | Nome do parceiro. |
| `beneficios[].descricao` | texto |  | Texto. |
| `beneficios[].condicoes` | texto |  | Condições. |
| `beneficios[].validade` | AAAA-MM-DD ou null |  | Some do site depois desta data. |
| `beneficios[].restricoes` | texto |  | Restrições. |
| `beneficios[].codigo` | texto |  | Código promocional (copiável). |
| `beneficios[].whatsapp` | texto |  | Botão Solicitar. |
| `beneficios[].link` | texto |  | Botão Usar benefício. |
| `beneficios[].ativo` | sim/não |  | Padrão sim; não = oculto. |
| `avaliacoes` | lista |  | Home e Avaliações. |
| `avaliacoes[].texto` | texto | sim | Depoimento. |
| `avaliacoes[].autor` | texto |  | Primeiro nome. |
| `avaliacoes[].periodo` | texto |  | Quando. |
| `avaliacoes[].origem` | texto |  | Onde foi feita. |
| `avaliacoes[].nota` | número ou null |  | 1 a 5 (estrelas). |
| `avaliacoes[].autorizada` | sim/não | sim | Só aparece com autorização expressa (padrão não). |
| `_confirmar` | lista |  | Pendências para o proprietário (o site ignora). |

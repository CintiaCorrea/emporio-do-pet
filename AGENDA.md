# Agenda de trabalho — proxima sessao

> **Este arquivo e a fonte da verdade do que esta pendente.** Leia antes de comecar
> qualquer coisa. Terminou um item? Atualize aqui no MESMO commit.
> Motivo: em 04/09/2026 descobrimos 75 commits construidos e nunca integrados, e
> decisoes combinadas em conversa que se perderam. Conversa nao guarda; arquivo guarda.

Atualizado em: **04/09/2026**

---

## 1. Como retomar

```
cd "D:\dev\emporio-do-pet"
claude --resume        # lista as conversas desta pasta
```

Ler nesta ordem: **CLAUDE.md** (as regras) e depois **este arquivo** (o que fazer).

Estado hoje:

| | |
|---|---|
| `main` | `ef22a308` — 21 commits publicados em 03–04/09 |
| Testes | 94 no backend · 53 no front |
| Catraca de tipos | trava em 46 (`vet-crm/.catraca-tipos`) |
| Producao | 1 maquina de atendimento + 1 de rotinas · banco com 4 GB |

---

## 2. As tres frentes prontas para comecar

Escolher UMA por sessao. Nao emendar tudo numa noite so — foi a pressa que
derrubou o sistema em 04/09.

### Frente A — Alarme (recomendada primeiro)

**Por que:** hoje existe UM unico alarme automatico no sistema inteiro (e-mail
quando a Meta recusa o WhatsApp por pagamento). Se o banco morrer ou a producao
cair, a Cintia so descobre quando uma funcionaria liga. Foi o que aconteceu as
23h13 de 03/09.

**O que fazer, em ordem:**
1. Ping externo de 1 minuto (UptimeRobot ou Better Stack, plano gratuito) no
   endereco de producao, avisando por WhatsApp e e-mail. Cobre banco caido,
   maquina fora e deploy quebrado de uma vez so.
2. Heartbeat nas **19 rotinas cegas** (lista na secao 5). Uma linha em cada,
   usando `CronHealthService.registrar()` que ja existe.
3. E-mail diario de saude: rotinas atrasadas, deploys de ontem, disco do banco.
4. Aviso quando um deploy do GitHub falha. Em 04/09 um falhou e ninguem soube.
5. Alerta de disco do banco (so 1 GB, e o historico de WhatsApp cresce sozinho).

**Tempo:** uma noite. **Precisa da Cintia:** criar a conta no servico de ping.

### Frente B — Resgatar os 75 commits

**Por que:** a branch `portal-integracao` tem uma semana de trabalho (25/08 a
01/09) que nunca entrou na `main`, incluindo o **modulo de RH inteiro** e varios
itens que a Cintia pediu como se fossem novos.

**Teste de merge ja feito em 04/09:** 110 arquivos entram limpos, **9 em conflito**
— `backend/Dockerfile`, `caixa.service.ts`, `whatsapp.service.ts`, o PDV, a tela do
Caixa, `produtos/page.tsx`, `InboxRightPanel.tsx`, `PetComandaRail.tsx`,
`OrcamentoRapidoModal.tsx`. Todos sao conflito com o trabalho de 03–04/09.

**Como fazer:**
1. Branch de trabalho, sem tocar na `main`.
2. Resolver **um arquivo por vez**, explicando cada escolha — em varios conflitos
   e preciso decidir entre a versao de agosto e a de setembro, e algumas sao
   regras de negocio da Cintia.
3. Rodar os 94 testes do backend e os 53 do front.
4. A Cintia testa caixa, venda e comanda ANTES de publicar.

**O que ha dentro (verificado por `git log`):**

| Commit | O que faz | Item da lista |
|---|---|---|
| `1cb9eaf9` | Transferir dinheiro de um caixa para outro | item 3 |
| `6ec3f169` | Corrige "nao fecha o caixa" | item 6 |
| `8a2628cd` | Carregar MODELO no carrinho (PDV + ficha) | item 2 |
| `2047bc98` | Modelo fixa a selecao + avisa modelo vazio | item 2 |
| `5eec70c1` | Catalogo: aposenta as telas antigas | item 8 |
| `8144fb9a` | Caixa por login: cada operador ve o seu | item 4 |
| `a46b0419` | WhatsApp: templates voltam a enviar (erro 132000) | — |
| 4 commits "RH" | Modulo de RH: login do funcionario, documentos, holerites, ponto | — |

**Tempo:** uma noite, com a Cintia presente nos pontos de decisao.

### Frente C — Terminar o fluxo de caixa

**Ja pronto:** o nucleo da projecao (`fluxo-caixa.regras.ts`) com 12 testes, no
commit `948fc350`, branch `feat/fluxo-de-caixa` — **nao publicado**.

**Falta:**
1. Endpoint que liga o nucleo nas fontes: `fin_lancamentos` (vencimento e status
   PENDENTE), `fin_vendas_cartao` (liquido, +1 dia), recorrencias da Agenda.
2. Saldo inicial = lancamentos ja confirmados ate hoje.
3. A tela: 4 numeros no topo, grafico de saldo projetado, tabela dia a dia,
   blocos "de onde vem" e "para onde vai".

**Mockup aprovado:** https://claude.ai/code/artifact/f62c39da-88cd-426c-81c7-17ab12d9830d

**Tempo:** uma noite.

### Frente D — Internacao (levantada em 04/09)

**RISCO ESTRUTURAL, o mais grave achado ate agora:** nao existe tabela de internacao.
Uma internacao e um `Appointment` cujo campo **`notes`** (observacoes, texto livre)
contem um JSON. O sistema so a reconhece se `JSON.parse(notes)?.type === 'HOSPITALIZATION'`.

`notes` e texto livre, **pesquisavel**, e escrito por TRES telas (Consultas,
Internacoes e ficha do Pet). Se deixar de ser JSON valido, **o animal some da lista
de internacao** — internado de verdade, com medicacao marcada e conta aberta. E o
controle de `diariasFaturadas` mora no mesmo JSON: perde-se, e o sistema recobra
diarias ja cobradas.

**O que ja funciona (e bastante):** mapa de boxes, alertas de medicacao com horarios
calculados da frequencia ("8/8h"), confirmacao de aplicacao, boletim automatico ao
tutor, conta separando insumo de faturavel, comanda do dia, caucao como credito,
portal do tutor, relatorio.

**Outros problemas:**
- `BoxOcupacao.appointmentId` e referencia solta SEM FK -> box pode ficar ocupado por
  internacao que nao existe mais.
- A conta vive em `listaItem` sob `intconta_<id>`, como texto JSON -> nao da pra
  responder "quanto faturamos de internacao em agosto".
- Diaria e um valor unico digitado na admissao (item 10 da Cintia pede por peso).
- Dias corridos arredondam pra cima: 25 horas cobram 2 diarias. Regra nao escrita —
  **confirmar com a Cintia**.
- A rotina de alertas de medicacao e uma das 19 cegas. Alerta clinico que para sem
  avisar e risco, nao inconveniencia.

**Ordem sugerida (os 4 primeiros cabem numa noite juntos):**
1. Trancar o `notes` — impedir que Consultas e ficha do Pet sobrescrevam quando o
   atendimento e internacao. Uma hora, fecha o buraco maior.
2. Heartbeat na rotina de alertas. Quinze minutos.
3. Diaria por faixa de peso (precisa das faixas e valores da Cintia).
4. Limpar box fantasma + criar a ligacao formal.
5. Tabela propria pra internacao. Depende das migracoes em ordem (V.3 do CLAUDE.md).

**RESPONDIDO em 04/09:** diaria = leitura B (ja e o comportamento atual); UTI e
isolamento NAO tem preco diferente; caucao tambem segue porte; gato entra na faixa
ate 10 kg (sem preco proprio).

**Preco por porte — o desenho fechado:** hoje cada faixa e um ITEM SEPARADO no
catalogo (5 cadastros da mesma diaria: #603, #704, #710, #711, #712). O recurso
transforma os 5 em 1 item com 5 precos. O mecanismo JA EXISTE em
`catalogo.service.ts` (`tabelaConvenioPet`), mas so pra convenios e com as faixas
fixas no codigo (`w < 10 ? 'p' : w < 25 ? 'm' : 'g'`). A construcao e generalizar:
faixas configuraveis + `precosPorte` no ItemCatalogo + um nucleo unico que resolve.
Mockup: https://claude.ai/code/artifact/cad9fd73-2ce0-4ffc-a831-27ee2243534f

**ATENCAO — buraco nas faixas atuais:** "ate 10" e depois "de 11 a 20" deixa 10,4 kg
sem faixa nenhuma (idem 20-21, 30-31, 40-41). O peso no sistema tem decimal. As
faixas precisam encostar: 0–10,0 / >10,0–20,0 / >20,0–30,0 / >30,0–40,0 / >40,0.

**FAIXAS FECHADAS (04/09).** A classificacao e a que ja esta no catalogo; so os
limites encostam, pra nao sobrar buraco. Leitura literal do nome "ate 10K":

    Pequeno    0 a 10,0 kg          (gatos entram aqui, sem preco proprio)
    Medio      acima de 10,0 ate 20,0
    Grande     acima de 20,0 ate 30,0
    GG         acima de 30,0 ate 40,0
    Extra GG   acima de 40,0

NOMES CONFIRMADOS pela Cintia em 04/09 (Pequeno / Medio / Grande / GG / Extra GG).
Ela escreveu "11 a 20", "21 a 30" etc.; os limites foram ENCOSTADOS porque o peso
tem decimal — sem isso um cao de 10,5 kg nao cairia em faixa nenhuma. 10,0 e
Pequeno; 10,1 ja e Medio.

**EXCLUIR ITEM DO CATALOGO — cuidado apurado em 04/09.** O item da venda
(`AppointmentItem`) guarda TRES referencias ao catalogo, e elas se comportam
diferente ao apagar:

  servicoId       -> FK com onDelete: SetNull  (protegido)
  productId       -> FK com onDelete: SetNull  (protegido)
  catalogoItemId  -> SEM FK NENHUMA           (fica apontando pro nada)

Ou seja: apagar um item do catalogo NOVO nao perde a descricao nem o valor da venda
antiga (o historico e o dinheiro ficam), mas quebra o vinculo usado por ESTOQUE e
COMISSAO naquelas vendas. `excluirItem` no backend ja existe, e irreversivel, em
cascata, e NAO verifica uso.

Decisao: a tela ganha o botao Excluir (a Cintia pediu — hoje so ha editar e
arquivar), mas com guarda: conta quantas vendas usaram o item. Nunca usado -> apaga
direto. Ja usado -> avisa quantas vendas e oferece Arquivar em destaque.

Para os 5 itens da diaria a recomendacao e ARQUIVAR, nao apagar: some da venda do
mesmo jeito e o historico continua ligado.

Documento: https://claude.ai/code/artifact/e3ffd72b-4696-4922-9fe8-3ce27cedc11d

### Frente E — Exames (levantada em 04/09)

**O BURACO PRINCIPAL: o resultado do exame nao existe no sistema.** O exame guarda
so rastreamento (nome, fase, quando o lab foi avisado). Nao ha laudo, anexo de PDF
nem valores. A fase chama-se "Resultado", mas so marca que ele chegou FORA daqui.
Existe `ClinicalDocument` no sistema e o exame **nao se liga a ele** (conferido: as
unicas mencoes a exame naquele modulo sao textos de prompt da IA).

Custo pratico: o historico do animal nao tem os exames. Numa recidiva ninguem
compara o hemograma de hoje com o de tres meses atras dentro do sistema.

**O que ja funciona bem:** exame vendido entra na fila sozinho; conta a pagar do
laboratorio gerada direto da venda; aviso ao lab por WhatsApp em lote (11h30 e 17h)
com confirmacao de entrega; quadro de fases configuraveis; 11 testes ja existentes;
e a rotina de avisos e uma das 13 vigiadas.

**Outros problemas:**
- `exames-kanban` EXISTE e NAO esta no menu — 3a tela orfa (com Orcamentos e Vendas
  em aberto). So `configuracoes/exames` esta la.
- DOIS catalogos de exame: `exa_catalogo` (antigo, por laboratorio) e
  `cat_item_exame` (novo). Mesma armadilha do catalogo geral.
- A fila vive em `listaItem` sob `petexa_<pet>` — a gaveta de tudo (configs, batidas
  de cron, conta de internacao, modelos de orcamento). Nao da pra responder "quantos
  exames pedimos em agosto e quanto pagamos aos labs".
- `listaItem` tem `@@unique([lista, valor])`: dois exames IDENTICOS pro mesmo pet
  podem colidir. **Testar com caso real antes de afirmar.**
- O aviso ao lab depende de `EXAMES_LOTE_ATIVO === '1'`. O segredo EXISTE em
  producao (valor nao e legivel). Se nao for exatamente '1', a rotina roda, registra
  saude normalmente e NAO ENVIA NADA — o monitor nao perceberia.

**Padrao que salta aos olhos:** tudo que e dinheiro e rastreio esta ligado; tudo que
e clinico esta solto. O exame sabe quanto custa e a quem pagar, mas nao sabe o que deu.

**Ordem sugerida:**
1. Por o quadro no menu (junto com as outras 2 orfas). Dez minutos.
2. Anexar o laudo (PDF) ao exame, visivel no historico do pet. Maior ganho por
   esforco — resolve "achar o exame de tres meses atras".
3. Confirmar a chave do aviso ao lab e fazer a rotina avisar quando desligada.
4. Unificar os dois catalogos de exame.
5. Valores e faixas de referencia (o que o SimplesVet tem). Depende de tabela
   propria e das migracoes em ordem.

**Perguntas abertas:** os labs recebem o aviso de coleta? Como o laudo chega hoje
(WhatsApp, e-mail, portal do lab, papel)? Quer o laudo no portal do tutor? Vale
digitar valores (hemacias etc.) ou basta o PDF?

Documento: https://claude.ai/code/artifact/17d4a2fd-8f62-4078-8e75-0f461f096701

### Frente F — WhatsApp rapido sem sobrecarregar (levantada em 04/09)

**O WhatsApp JA E TEMPO REAL — o caminho rapido esta inteiro e funcionando.**
Verificadas as quatro pontas:

    Meta -> webhook -> emit('whatsapp.message.received')
         -> notifications.gateway (@OnEvent) -> server.emit('whatsapp:message')
         -> hooks/useNotifications (socket.on) -> inbox onWhatsAppMessage
         -> debounce 1200ms -> refresh

A pergunta de 25 em 25s do inbox e REDUNDANTE: rede de seguranca, nao o caminho
principal. Isso tambem confirma que parar de perguntar com a aba escondida (04/09)
NAO deixou o WhatsApp mais lento — o socket continua empurrando.

**O peso nao esta na frequencia, esta no CUSTO de cada atualizacao.** Cada mensagem
recebida recarrega as 400 conversas inteiras, com 4 juncoes cada, pra mudar uma linha.

**O que fazer (mais rapido E mais leve, sem troca):**
1. Atualizar SO a conversa que mudou — o evento ja diz qual e. A lista nem pisca.
2. Paginar a lista (50 mais recentes + carregar ao rolar) em vez de 400 de uma vez.
3. Espacar a pergunta de seguranca de 25s pra 2-3 min (ela so serve se o socket cair).

**O que NAO fazer:** diminuir o intervalo da pergunta. Piora carga e nao ganha
velocidade, porque o empurrao ja chega antes.

**SOBRE O "PULANDO" (pergunta da Cintia, 04/09).** Sao duas coisas:
- O painel de MENSAGENS ja esta protegido: `stickBottomRef` so rola quando a
  atendente ja esta no fim. Quem subiu pra ler nao e puxado. FEITO.
- O que pula e a LISTA de conversas: ela e ordenada por mensagem mais recente,
  entao qualquer mensagem joga aquela conversa pro topo e empurra as outras pra
  baixo — debaixo do dedo de quem esta clicando. Recarregar 400 piora, mas a causa
  e a REORDENACAO. Solucao: o mesmo padrao que a agenda ja usa (`interagindoRef`) —
  nao reordenar enquanto a pessoa esta mexendo; conversa nova entra com aviso
  discreto.

**LEVANTAMENTO COMPLETO DO WHATSAPP (04/09).** 79 rotas, 9 automacoes, 3 telas.
Documento: https://claude.ai/code/artifact/5eca3b0b-78c2-4879-a5f1-e090e7cc41ff

As 9 automacoes que reagem a cada mensagem: boletim represado, documentos
represados e presente de aniversario (as tres resolvem a janela de 24h da Meta —
guardam o que precisa mandar e entregam quando o tutor responde); pesquisa de
satisfacao; resposta fora do horario; Agente Sombra (IA que escreve a resposta mas
NUNCA envia, pra administracao avaliar); Agente de IA; alerta de pagamento Meta;
aviso de acesso barrado.

CONSTRUIDO E NAO USADO:
- API de analise completa (7 relatorios: painel, conversas, mensagens, campanhas,
  agentes, por hora, exportacao) — **sem NENHUMA tela**. Verificado por busca em
  todo o front.
- "Inbox BC" continua no menu e a rotina do BotConversa roda a cada minuto, mas a
  Cintia disse em 04/09 que nao usam mais. **Confirmar antes de desligar.**
- Atalhos (PIX, endereco, /cadastro) existem mas sao 3 e estao FIXOS NO CODIGO —
  ha ate comentario dizendo que deveriam vir das Configuracoes.

FALTA: parar o pulo; atualizar so a conversa que mudou; respostas prontas
configuraveis; tela da analise; aposentar o Inbox BC; paginar a lista; buscar em
todas as conversas (hoje a busca so olha a conversa aberta).

Nenhum item e "construir o WhatsApp" — ele esta construido e bem. Falta acabamento
e usar o que ja existe.

**Perguntas abertas:** BotConversa esta fora de uso mesmo? Quais frases a equipe
repete todo dia (viram as respostas prontas)? O Agente Sombra esta sendo avaliado
por alguem, ou consome IA a toa? O que a Cintia mais quer ver na analise?

---

## 3. Decisoes da Cintia ja tomadas — nao perguntar de novo

| Assunto | Decisao | Data |
|---|---|---|
| Compensacao do cartao | **D+1 para tudo**, inclusive parcelado (ha antecipacao contratada) | 04/09 |
| Janela do fluxo de caixa | **30 dias corridos**, nao "ate o fim do mes" | 04/09 |
| Contas fixas | Lancadas por ela em **Financeiro > Agenda**, com recorrencia | 04/09 |
| Modelos de orcamento | **Uma lista so** — tirar as abas "Meus" e "Compartilhados" | 04/09 |
| Cartao (SUPERADA) | ~~Operadora, NSU e AUT obrigatorios~~ | 04/09 |
| Cartao | **Operadora sempre. AUT so na MAQUININHA.** Link de pagamento nao imprime comprovante e nao tem identificador nenhum — concilia por valor e data. Nubank por link fica manual, o volume e menor | 05/09 |
| Dois caixas abertos | De proposito, um por recepcionista | 02/09 |
| Maquinas do backend | Ficar em 2 ate o banco mostrar folga com 4 GB | 04/09 |
| Diaria de internacao | **Leitura B**: comecou o periodo de 24h, cobra. 25h = 2 diarias, 47h = 2. **E o que o sistema JA faz** (`Math.ceil`) — so falta o teste que trava | 04/09 |
| Preco por porte | Vale pra **internacao, medicacao e caucao**. Gato NAO tem preco proprio: entra pelo peso, como os caes | 04/09 |
| Faixas de peso | 5 faixas, conforme o catalogo atual: ate 10 / 11-20 / 21-30 / 31-40 / acima de 40 kg | 04/09 |

---

## 4. A lista dos 11 itens da Cintia

| # | Item | Situacao |
|---|---|---|
| 1 | Aba de fluxo de caixa no Financeiro | nucleo pronto e **no main** (`fluxo-caixa.regras.ts`, 12 testes). Falta o endpoint e a tela |
| 2 | Modelo em TODOS os orcamentos e vendas | **existe na `portal-integracao`** (Frente B) |
| 3 | Transferencia entre caixas | **existe na `portal-integracao`** (Frente B) |
| 4 | Operadora nao aparecia na baixa | **FEITO e no ar** (05/09). Causa: a lista de operadoras vinha so da tabela de taxas, e a tela de configuracao so deixava escolher dessa mesma lista — operadora sem taxa (Nubank) era impossivel de cadastrar. Agora o campo e digitavel |
| 5 | Orcamentos, vendas e caixas em lista, nao em caixinhas | a fazer |
| 6 | Nao conseguir dar baixa no caixa | **FEITO e no ar** (04/09) |
| 7 | Nao conseguir salvar venda/orcamento | provavelmente resolvido junto com o 6 — **confirmar com a Cintia** |
| 8 | Nem todos os produtos aparecem | causa provavel: item so no catalogo antigo (ver CLAUDE.md V.1). **Falta um exemplo concreto** |
| 9 | Assinatura nos documentos dos veterinarios | precisa decisao: assinatura desenhada ou digital ICP-Brasil? |
| 10 | Diaria de internacao por faixa de peso | precisa a tabela de precos da Cintia |
| 11 | Caucoes viram credito de cliente | direcao confirmada; tirar do catalogo e usar o modulo de credito |

Extra encontrado em 04/09: as telas **Orcamentos** e **Vendas em aberto** existem e
funcionam, mas **nao estao no menu** (`vet-crm/lib/permissions/index.ts`). Nenhum
commit em nenhuma branch as coloca la — a mudanca so existiu no disco. Conserto de
dois minutos.

---

## 5. As 19 rotinas sem vigia

Todas rodam (na maquina `worker`), mas nao avisam que rodaram. As em **negrito**
sao as que trazem cliente de volta — se pararem, o sintoma e faturamento caindo
devagar, sem erro na tela.

- Polling do BotConversa — a cada minuto
- **Mensagens programadas (fila de envio)** — a cada minuto
- WhatsApp: reenvio de webhook falhado — a cada minuto
- **Alertas de internacao** — a cada 5 min
- Cadencias: varredura de atendimentos — a cada 5 min
- Sincronizacao de automacoes — a cada 5 min
- Campanhas: metricas em execucao — a cada 5 min
- WhatsApp: solta conversas ociosas — a cada 5 min
- WhatsApp: baixa midia atrasada — a cada 5 min
- Catalogo: manutencao — a cada 30 min
- Campanhas travadas — a cada 30 min
- **Cadencias: clientes inativos 90d** — a cada 6 h
- **Cadencias: aniversario de pets** — a cada 6 h
- **Cadencias: pacotes acabando** — a cada 6 h
- Limpeza de audios antigos — 03:00
- **Portal: lembrete de amanha** — 18:00
- Portal: limpa aparelhos mortos — domingo 04:00
- Campanhas: limpeza antiga — meia-noite
- WhatsApp: limpeza de eventos — meia-noite

As 13 vigiadas estao em `CronHealthService.JOBS`.

---

## 6. Riscos abertos

| Risco | Situacao |
|---|---|
| Disco do banco: **1 GB**, uso desconhecido | precisa acesso de leitura ao banco |
| Migracoes paradas desde **31/05** | banco real difere do historico oficial |
| Sem segunda maquina de atendimento | se a unica cair, o sistema para |
| 46 erros de tipo no front | contidos pela catraca, mas ainda la |
| 290 branches, 94 delas backup | achar coisa custa tempo |

---

## 7. Documentos de apoio

| Documento | Para que serve |
|---|---|
| [Raio-X do Sistema](https://claude.ai/code/artifact/12e0a374-3a70-451c-ac2f-70c8c924ab43) | auditoria completa: numeros, crons, parecer, plano em 6 fases |
| [Prontuario do Sistema](https://claude.ai/code/artifact/0e948d80-c1e6-4920-95db-ede45d70067c) | o que foi feito em 03–04/09 e o que ficou em observacao |
| [Mockup do Fluxo de Caixa](https://claude.ai/code/artifact/f62c39da-88cd-426c-81c7-17ab12d9830d) | desenho aprovado da tela |
| [Da comanda ao caixa](https://claude.ai/code/artifact/e5fa41d2-12f3-4768-b2c8-c4fa8f084ee2) | mapa do fluxo de venda |
| [Plano de Estabilizacao](https://claude.ai/code/artifact/6d86e73a-6ca5-4f0d-8b6c-5b0eca40be11) | os 5 passos de 03/09 |

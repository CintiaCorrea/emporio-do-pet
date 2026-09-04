# Manual do Emporio do Pet CRM

Leitura obrigatoria antes de qualquer mudanca neste repo.

## Como este arquivo funciona (leia isto primeiro)

Quem assiste a Cintia neste projeto **nao lembra de nada entre uma conversa e
outra**. Nada. A cada sessao, o unico conhecimento disponivel e o que esta
escrito no repositorio.

Consequencia direta: **combinado que so existe numa conversa esta perdido.**
Para uma decisao sobreviver, ela precisa virar uma destas tres coisas, nesta
ordem de forca:

| Forma | Quem garante | Forca |
|---|---|---|
| **Teste automatico** | o portao do deploy | nao depende de ninguem |
| **Trava de configuracao** | o proprio sistema | nao depende de ninguem |
| **Regra escrita aqui** | quem esta trabalhando | depende de obediencia |

**Prefira sempre a forma mais forte disponivel.** Uma regra de negocio escrita
so em prosa aqui vai se perder de novo — nao porque alguem foi desleixado, mas
porque prosa nao roda. Em 03/09/2026 a regra de commit e deploy ja existia neste
arquivo e mesmo assim foi violada no dia seguinte.

---

# PARTE I — O que o sistema ja garante sozinho

Estas travas existem e estao ligadas. **Nunca desligue nenhuma para "passar" um
deploy.** Se uma delas barrar voce, ela esta funcionando: conserte a causa.

## I.1 Portao de testes do backend

`.github/workflows/deploy-backend.yml` roda `pnpm test` ANTES de publicar. Teste
que falha = deploy abortado. Hoje sao 82 testes.

## I.2 Catraca de tipos do frontend

`.github/workflows/deploy-vet-crm.yml` conta os erros de tipo e compara com
`vet-crm/.catraca-tipos`. **O numero nao pode aumentar.** Hoje trava em 46.

Existe porque `next.config` manda ignorar erros de tipo (`ignoreBuildErrors`), e
foi assim que a tela Produtos, quebrada, foi ao ar com o verificador apontando a
linha exata. Exigir zero travaria todo deploy; exigir "nao piorar" funciona.

Consertou erros? Baixe o numero no arquivo. **Nunca aumente.**

## I.3 Deploy nao pode apagar dado

O `release_command` do `backend/fly.toml` roda `prisma db push` **sem**
`--accept-data-loss`. Antes rodava com, e isso autorizava cada deploy a apagar
colunas do banco de producao sozinho, sem perguntar.

Se um deploy falhar nessa etapa, **nao recoloque a flag**: olhe o que ele quer
destruir primeiro.

## I.4 Rotinas separadas do atendimento

`backend/fly.toml` define dois papeis: `app` (atende as telas) e `worker` (roda
as 32 rotinas automaticas). Quem desliga os crons no `app` e o
`CronLeaderService`, lendo `FLY_PROCESS_GROUP`.

**Nunca volte a decidir isso por `PRIMARY_MACHINE_ID`** (numero de serie de
maquina): o numero fica orfao a cada deploy e as rotinas param caladas. Foi o
incidente de 10/08/2026.

## I.5 Monitor de automacoes

`GET /api/health/automations` (visivel no Meu painel) acusa rotina atrasada.
Se o `worker` cair, aparece la.

---

# PARTE II — Como trabalhar

## II.1 Todo conserto vira teste no mesmo commit

**Sem excecao.** Defeito corrigido sem teste volta; e questao de tempo.

O teste deve conter o caso REAL que falhou — o numero, o cenario, os dados de
verdade. Exemplos no repo:

- `backend/src/common/phone.spec.ts` — o telefone `558599522127` que a Meta
  recusou em 04/09/2026.
- `backend/src/modules/caixa/caixa.regras.spec.ts` — a venda de uma funcionaria
  caindo na gaveta da outra.
- `vet-crm/lib/formasPagamento.test.ts` — cartao sem NSU/AUT.

Onde colocar: regra pura em `<modulo>.regras.ts` com `<modulo>.regras.spec.ts`
ao lado (backend), ou `<arquivo>.test.ts` ao lado (frontend, vitest).

## II.2 Toda regra de negocio da Cintia vira teste, nao comentario

"NSU e obrigatorio no cartao" nao pode viver numa conversa nem num comentario
que alguem apaga. Vira teste que falha se a regra sumir. Assim a regra se
defende sozinha.

## II.3 Procurar antes de construir

Antes de escrever qualquer recurso novo, **procurar se ja existe**. Em
04/09/2026 quase foi construido do zero um campo de NSU que ja estava pronto e
funcionando havia semanas — invisivel apenas por causa de uma configuracao.

Buscar por: nome do campo, nome do conceito em portugues e em ingles, e nos
nucleos de `lib/` (ver IV.4).

## II.4 Correcao pedida = mudanca CIRURGICA

Quando a Cintia pede "corrige X", mexer **somente em X**: o arquivo e o trecho
daquele problema. NAO refatorar de passagem, NAO renomear, NAO "melhorar" o que
esta em volta, NAO reescrever o arquivo inteiro para trocar uma linha.

Se durante a correcao aparecer outra coisa: **falar antes, esperar o OK.**
Nunca fazer junto e avisar depois.

Delimitacao: ajuste de largura/visual continua permitido de passagem, porque e
cosmetico e reversivel. **Comportamento, logica, nomes de campo e fluxo nunca
mudam fora do que foi pedido.** Na duvida, tratar como comportamento e perguntar.

Motivo: a Cintia vinha perdendo progresso porque correcoes pontuais traziam
junto mudancas que ninguem pediu, desfazendo o que ja estava certo.

## II.5 Commit ao fim de CADA bloco — sem excecao

Bloco terminado = `git add` + `git commit` com mensagem que diz o que mudou e
**por que**. Nunca deixar trabalho so como arquivo modificado no disco.

Por que existe: em 03/09/2026 havia **33 arquivos modificados sem commit, 9 dias
sem nenhum commit** — caixa, estoque, orcamentos e conciliacao existindo em UM
unico lugar no mundo. Snapshot de resgate: commit `56f1bc70`.

## II.6 Publicar so pelo GitHub, e so com OK explicito

- **Nunca `flyctl deploy` do computador.** Ele publica a pasta como esta no
  disco: codigo nao-commitado vai pra producao sem existir no Git, e pula os
  portoes da Parte I.
- **Push no `main` dispara deploy automatico** (`.github/workflows/deploy-*.yml`,
  em `vet-crm/**`, `backend/**`, `ai-service/**`).
- **Nunca publicar sem OK explicito da Cintia.** Trabalhar em branch `fix/...`
  ou `feat/...`, mostrar o que foi feito, esperar o "pode publicar". Branch NAO
  dispara deploy — so o `main`.

## II.7 "Pronto" = verificado ponta a ponta

Antes de dizer pronto, verificar que o fluxo funciona inteiro — nao so que o
arquivo compila. Fluxos criticos: **caixa, venda/PDV, agenda, comanda,
internacao**.

E verificar **os dois lados**: em 04/09/2026 uma correcao de caixa foi publicada
so no servidor, enquanto a TELA continuava bloqueando antes de enviar. O
conserto nunca chegou a ser exercitado.

## II.8 Trabalhar em etapas com checkpoint

A Cintia nao programa. Etapas curtas, explicar em portugues simples, esperar OK.
Nada de jargao sem traducao.

## II.9 Mexeu em infraestrutura? Medir antes e depois

Em 04/09/2026 o backend foi de 1 para 3 maquinas de uma vez, sem verificar se o
banco aguentaria. O Postgres foi morto por falta de memoria e o sistema ficou
instavel por vinte minutos.

Mudanca de infraestrutura vai **uma de cada vez**, com verificacao do banco
(`fly status -a emporio-pet-db`) antes e depois.

---

# PARTE III — Decisoes do negocio

Cada uma tem, quando possivel, o teste que a protege.

## III.1 Tutor = cliente, Pet = paciente

Modelagem inegociavel. Nunca dividir uma pessoa em entidades separadas
(`clientes`, `contatos` viraram duplicatas). Sempre `Tutor`.

## III.2 Dois caixas abertos ao mesmo tempo, um por operadora

Decisao de 02/09/2026: as duas recepcionistas trabalham com caixas separados e
so transferem a especie. **A regra antiga de "nunca deixar 2 caixas abertos"
esta revogada.**

O recebimento entra no caixa de QUEM esta recebendo. Tres casos:

1. Tenho o meu caixa aberto -> uso o meu.
2. Nao tenho, mas so ha UM aberto -> uso esse (impossivel errar).
3. Nao tenho e ha MAIS DE UM -> recuso.

Vive em dois lugares espelhados, de proposito:
`backend/src/modules/caixa/caixa.regras.ts` (garante) e
`vet-crm/lib/caixaAtual.ts` (avisa antes). Protegido por `caixa.regras.spec.ts`.

**Pendente:** nao existe transferencia de dinheiro de um caixa para outro. O que
existe move entre CONTAS (banco, maquininha), nao entre operadoras.

## III.3 Cartao exige operadora, NSU e AUT

Pedido da Cintia em 04/09/2026. Sem os tres nao da pra casar a venda com a linha
do extrato na conciliacao. Dinheiro, PIX e credito do cliente passam direto.

Protegido por `vet-crm/lib/formasPagamento.test.ts`.

## III.4 Financeiro comeca em 01/09/2026

Venda recebida antes dessa data **nao vira lancamento**, nem quando o cron
reprocessa. Configuravel em `backend/src/common/financeiro-inicio.ts` e no item
`financeiro_inicio` das listas. Protegido por `financeiro.regras.spec.ts`.

## III.5 Excluir venda tem regra

So enquanto a venda esta em aberto e dentro do caixa do dia. Com recebimento
lancado ou caixa fechado, so ADMIN. A regra vale no servidor, entao vale em
toda tela.

## III.6 Telefone: formato canonico de 13 digitos

`55 + DDD + 9 + oito digitos`. Comparacao entre telefones usa os ultimos 8 ou 9
digitos. **Telefone fixo (comeca com 2-5) nunca recebe o nono digito.**
Nucleo: `backend/src/common/phone.ts`. Protegido por `phone.spec.ts`.

## III.7 Vocabulario da equipe: venda e orcamento

"Comanda" saiu de tudo que a equipe le — botoes, titulos, avisos e impressao.

---

# PARTE IV — Convencoes tecnicas

## IV.1 Um endpoint canonico por entidade

| Entidade | URL canonica |
|---|---|
| Tutor | `/api/tutors/[id]` |
| Pet | `/api/pets/[id]` |
| Lead | `/api/leads/[id]` |
| Atendimento | `/api/atendimentos/[id]` |
| Interacao | `/api/interacoes` (sempre plural pt-BR) |
| Email | `/api/email/send` |
| WhatsApp BC webhook | `/api/integrations/botconversa/webhook` |

Qualquer tela que precisa desses dados consulta o mesmo endpoint.

## IV.2 Mesmo nome de campo em todas as camadas

Use os nomes do banco (Prisma schema) sem renomear: `name`, `phone`, `email`,
`createdAt`, `tutorId`, `petId`. Nomes em portugues so quando ja sao do banco
(`Interacao.tipo`, `Interacao.texto`, `Interacao.canal`).

## IV.3 Botoes sempre conectados na 1a versao

Proibido `onClick={() => toast("Em construcao")}` ou botao sem handler. Toda
acao tem handler real, helper em `vet-crm/lib/actions/`, ou redirect pra rota
existente.

## IV.4 Nucleos unicos — use, nao duplique

| Nucleo | O que resolve |
|---|---|
| `lib/caixaAtual.ts` + `caixa.regras.ts` | qual caixa recebe |
| `lib/formasPagamento.ts` | formas, modalidades, taxas, validacao do cartao |
| `lib/catalogoVendavel.ts` | itens que podem ser vendidos |
| `lib/pollVisivel.ts` | so pergunta ao servidor com a aba a vista |
| `lib/estoqueComprometido.ts` | saldo ja prometido em venda aberta |
| `common/phone.ts` | normalizacao de telefone |
| `lib/actions/whatsapp.ts` | `openWhatsAppMeta(phone)` |
| `lib/actions/pets.ts` | `criarPetEAbrir(tutorId)` |
| `components/financeiro/PagamentoFormas.tsx` | linhas de pagamento (PDV + Caixa) |
| `components/common/ConfirmDeleteModal.tsx` | confirmacao antes de apagar |
| `components/email/SendEmailModal.tsx` | envio de email |

## IV.5 Deletes em todo bloco durante fase de teste

Enquanto a equipe aprende: `+ Adicionar` no header do bloco, icones de Editar e
Excluir em cada linha, `ConfirmDeleteModal` antes do DELETE. Provisorio — quando
o sistema estabilizar, restringir deletes por perfil.

## IV.6 Email e WhatsApp

Email: Resend via SMTP, `RESEND_API_KEY` no Fly secrets, `POST /api/email/send`
(proxy do backend), front com `<SendEmailModal />`.

WhatsApp: **nunca** `wa.me/<phone>` (abre o WhatsApp pessoal). Sempre
`openWhatsAppMeta(phone)`, que abre `/dashboard/inbox-nativo?phone=<digits>`.

## IV.7 Visual Base44

Paleta turquesa `#009AAC` + marinho `#014D5E` + bege `#E8DFC8`. Largura cheia
(`p-4`/`p-6`, sem `max-w-*xl mx-auto` centralizado), cards `rounded-2xl` borda
`#E8DFC8`, cabecalho padrao. Emojis decorativos so em fichas Pet/Tutor/Lead
(gamificacao). Resto: tabelas densas, paleta neutra.

Sempre que abrir/mexer numa pagina, conferir o padrao e arrumar na hora — este e
o unico ajuste permitido fora da tarefa (ver II.4).

---

# PARTE V — Armadilhas conhecidas

Coisas que ja morderam. Confira antes de gastar horas.

## V.1 Catalogo novo silencia item nao migrado

`lib/catalogoVendavel.ts` faz `if (arr.length) return arr` — se o catalogo NOVO
devolver qualquer item, ele **nunca** consulta o antigo. Item que existe so no
catalogo velho desaparece da venda, sem erro nenhum. E `/catalogo/vendavel`
filtra `ativo: true, arquivado: false`.

**Sintoma:** "nem todos os produtos aparecem".

## V.2 Campos de cartao dependem do "tipo" da forma

`ehMaquininha` testa `/maquin|cart/i` no campo **tipo** da forma de recebimento.
Se o tipo estiver vazio em Configuracoes > Formas de recebimento, o bloco
inteiro (operadora, bandeira, NSU, AUT) **nunca aparece**.

**Sintoma:** "sumiu o campo de NSU / nao aparece a operadora".

## V.3 Migracoes paradas desde 31/05/2026

De junho a setembro tudo entrou por `db push`. O banco real e o historico oficial
estao diferentes. **Nao rode `prisma migrate`** sem antes refazer a base — ele
pode tentar "acertar" o banco por um historico desatualizado.

## V.4 Tela que depende de quem esta logado

Resolver o usuario **depois** que a sessao carrega, nunca no carregamento da
tela. Decidir antes = decidir com informacao errada e travar. Ja aconteceu tres
vezes (PDV, Vendas em aberto, Caixa).

## V.5 Banco de dados e apertado

`emporio-pet-db`: 4 GB de memoria (era 2, e morreu por falta em 04/09/2026) e
**apenas 1 GB de disco**. Historico de WhatsApp cresce sozinho. Antes de
aumentar maquinas de backend, conferir o banco.

## V.6 Telas orfas

Existem telas fora do menu que ninguem alcanca (`/erp/produtos`, "Em
atendimento"). Antes de consertar uma tela, confirmar se ela esta no menu — pode
ser mais limpo aposentar.

---

**Fonte da verdade dos dados:** Base44 (`emporio-vet-flow.base44.app`).
Quando inventar algo novo, sinalizar explicitamente.

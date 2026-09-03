# Manifesto de Integracao — Emporio do Pet CRM

Diretrizes obrigatorias para qualquer mudanca neste repo. Escrito apos
episodios em que as telas viraram ilhas desconexas.

## 1. Tutor = cliente, Pet = paciente

Modelagem inegociavel. Nunca dividir uma pessoa em entidades separadas
(`clientes`, `contatos` viraram duplicatas). Sempre `Tutor`.

## 2. Um endpoint canonico por entidade

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

## 3. Mesmo nome de campo em todas as camadas

Use os nomes do banco (Prisma schema) sem renomear:
`name`, `phone`, `email`, `createdAt`, `tutorId`, `petId`, etc.

Nomes em portugues so quando ja sao do banco (`Interacao.tipo`,
`Interacao.texto`, `Interacao.canal`).

## 4. Botoes sempre conectados na 1a versao

Proibido entregar UI com `onClick={() => toast("Em construcao")}` ou
botoes sem handler. Toda acao tem que ter:

- handler real OU
- helper reutilizavel em `vet-crm/lib/actions/` OU
- redirect pra rota existente

## 5. Helpers reutilizaveis

Localizacao: `vet-crm/lib/actions/`

Ja existem:
- `whatsapp.ts` — `openWhatsAppMeta(phone)`
- `pets.ts` — `criarPetEAbrir(tutorId)`

Componentes reutilizaveis:
- `components/email/SendEmailModal.tsx`
- `components/common/ConfirmDeleteModal.tsx`

## 6. Deletes em todo bloco durante fase de teste

Enquanto o app esta sendo testado e a equipe esta aprendendo,
TODO bloco com itens precisa de:

- `+ Adicionar` no header do bloco
- icones de Editar e Excluir em cada linha
- ConfirmDeleteModal antes do DELETE

Isso e provisorio — quando o sistema estabilizar, podemos restringir
deletes por perfil.

## 7. Email padrao

Resend via SMTP. Variavel `RESEND_API_KEY` no Fly secrets.
Endpoint: `POST /api/email/send` (proxy do backend).
Front: `<SendEmailModal />` pronto.

## 8. WhatsApp padrao

NAO usar `wa.me/<phone>` (abre WhatsApp pessoal).
Usar sempre `openWhatsAppMeta(phone)` que abre `/dashboard/inbox-nativo?phone=<digits>`.

## 9. Visual clean Base44

Paleta: turquesa #009AAC + marinho #014D5E + bege #E8DFC8.
Emojis decorativos restritos a fichas Pet/Tutor/Lead (gamificacao).
Resto: tabelas densas, paleta neutra.

## 10. Trabalhar em etapas com checkpoint

A Cintia nao programa. Etapas curtas, explicar simples, esperar OK.
Mudancas vao para rascunho/PR — nunca direto em producao sem teste.

## 11. Padrao de largura + visual em TODA pagina (check permanente)

TODAS as paginas do dashboard tem o MESMO padrao de largura (largura cheia —
`p-4`/`p-6`, SEM `max-w-*xl mx-auto` centralizado que deixa a coluna estreita) e
a mesma linguagem grafica Base44 (paleta #009AAC/#014D5E/#E8DFC8, cabecalho
padrao, cards `rounded-2xl` borda #E8DFC8). Regra da Cintia (05/08, fase final):
**sempre que abrir/mexer numa pagina, conferir se esta no padrao; se NAO estiver,
arrumar na hora — mesmo que nao seja a tarefa do momento.** Nao deixar passar.

## 12. Correcao pedida = mudanca CIRURGICA (regra da Cintia, 03/09/2026)

Quando a Cintia pede "corrige X", mexer **somente em X**: o arquivo e o trecho
daquele problema. NAO refatorar de passagem, NAO renomear, NAO "melhorar" o que
esta em volta, NAO reescrever o arquivo inteiro para trocar uma linha.

Se durante a correcao aparecer outra coisa que precisa mudar: **falar antes,
esperar o OK, e so entao mexer.** Nunca fazer junto e avisar depois.

Delimitacao da regra 11: o ajuste de largura/visual continua permitido de
passagem, porque e cosmetico e reversivel. **Comportamento, logica, nomes de
campo e fluxo nunca mudam fora do que foi pedido.** Na duvida entre "e visual"
e "e comportamento", tratar como comportamento e perguntar.

Motivo: a Cintia vinha perdendo progresso porque correcoes pontuais traziam
junto mudancas que ninguem pediu, desfazendo o que ja estava certo.

## 13. Commit ao fim de CADA bloco — sem excecao (03/09/2026)

Bloco de trabalho terminado = `git add` + `git commit` com mensagem que diz o
que mudou. Nunca deixar trabalho so como arquivo modificado no disco.

Contexto de por que essa regra existe: em 03/09/2026 foram encontrados **33
arquivos modificados sem commit, 9 dias sem nenhum commit**, com todo o trabalho
de caixa/estoque/orcamentos/conciliacao existindo em UM unico lugar no mundo —
o disco da Cintia, dentro do OneDrive. Sem ponto de retorno e sem backup.
Snapshot de resgate: commit `56f1bc70`, branch `backup/snapshot-2026-09-03`.

Consequencias praticas:
- **Deploy so do que esta commitado.** `flyctl deploy` publica a pasta como esta
  no disco, entao codigo nao-commitado vai pra producao sem existir no Git.
  Commitar ANTES de deployar, sempre.
- **Push no `main` dispara deploy automatico** (`.github/workflows/deploy-*.yml`
  disparam em push no main tocando `vet-crm/**`, `backend/**`, `ai-service/**`).
  Para so guardar sem publicar: `git push origin main:refs/heads/backup/<data>`.
- Nunca publicar em producao sem OK explicito da Cintia (ver regra 10).

## 14. Nao regredir o que ja funciona (03/09/2026)

Antes de dizer "pronto", verificar que o fluxo continua funcionando ponta a
ponta — nao so que o arquivo compila. Fluxos criticos que a operacao inteira
usa: **caixa, venda/PDV, agenda, comanda, internacao**. Mexeu em algo que
encosta neles, testar antes de entregar.

"Pronto" significa ligado ponta-a-ponta e verificado. Nunca significa
"o codigo foi escrito".

---

**Fonte da verdade dos dados:** Base44 (`emporio-vet-flow.base44.app`).
Quando inventar algo novo, sinalizar explicitamente.

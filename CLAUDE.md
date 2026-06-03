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

---

**Fonte da verdade dos dados:** Base44 (`emporio-vet-flow.base44.app`).
Quando inventar algo novo, sinalizar explicitamente.

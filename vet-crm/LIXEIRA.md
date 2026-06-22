# 🗑️ Lixeira (faxina da ficha — esvaziar no FINAL)

> Itens do dev DESATIVADOS (não apagados) durante a reorganização da ficha. Padrão: bloco JSX envolto em `{false && ( ... )}` com comentário `LIXEIRA-Fn`. Restaurar = remover o `{false &&}`. Apagar de vez = só no final, com OK da Cintia.

## Como funciona
- Nada é deletado na hora. Cada bloco redundante vira `{/* LIXEIRA-Fn: motivo */ false && ( ...código original... )}`.
- Este arquivo é o índice do que está na lixeira.
- No fim da faxina: removemos os blocos de uma vez (com aprovação).

## Itens na lixeira

### LIXEIRA-F1 — Sub-cabeçalho duplicado da ficha do Pet
- **Arquivo:** `vet-crm/app/(user)/dashboard/erp/pets/[id]/page.tsx` (Top bar)
- **O que é:** o miolo do "Top bar" do dev — avatar + nome do pet (com edição inline) + chips (espécie/idade/status/pipeline) + linha do tutor. Duplicava o `PetFichaHeaderCard`.
- **Mantido:** a seta de voltar e as ações (WhatsApp / Encaminhar / Excluir).
- **Função preservada:** edição do nome do pet continua em `/pets/[id]/editar`.
- **Restaurar:** remover o `{false && ( ... )}` que envolve o `<div className="flex-1 flex items-center gap-3">`.

### LIXEIRA-F2 — Box "Histórico de Atendimentos" duplicado
- **Arquivo:** `vet-crm/app/(user)/dashboard/erp/pets/[id]/page.tsx`
- **O que é:** box "Histórico de Atendimentos" (com "+ Novo Atendimento") em linha cheia — duplicava o feed clínico/timeline e tinha um 2º ponto de entrada de atendimento.
- **Substituído por:** o feed clínico único (aba Histórico) + o "Atendimento" da grade.
- **Restaurar:** remover o `{false && ( ... )}` com marca `LIXEIRA-F2`.

### Movido (não lixeira) — blocos de relacionamento → aba "Relacionamento"
- Pipelines do Pet, Cadência de acompanhamento, Follow-up + Interações foram MOVIDOS pra a nova aba "Relacionamento" da ficha do pet (CRM é por pet). Não estão na lixeira; só mudaram de lugar.

### LIXEIRA-F1rev — Card de cabeçalho estilo SimplesVet (PetFichaHeaderCard)
- **Arquivo:** `vet-crm/app/(user)/dashboard/erp/pets/[id]/page.tsx`
- **O que é:** o card 3 colunas (tutor|pet|foto) que criei. A Cintia decidiu voltar ao sub-header editável do dev como cabeçalho único.
- **Reverso da F1:** o sub-header do dev foi RESTAURADO (saiu da lixeira). Agora é o card que está na lixeira.
- **Restaurar:** remover o `{false && ( ... )}` com marca `LIXEIRA-F1rev`.

### LIXEIRA-PETS-MENU — Item "Pets" do menu lateral
- **Arquivo:** `vet-crm/components/protected/dashboard/Sidebar.tsx` (array `NAV`)
- **O que é:** entrada de menu "Pets" (`/dashboard/erp/pets`) que abria a listagem geral de pets.
- **Por quê:** edição/cadastro do pet centralizada na ficha de Cliente (F4). A ficha clínica do pet continua acessível clicando no nome do pet na lista de Clientes.
- **Mantido:** rotas `/dashboard/erp/pets/*` (ficha clínica, editar, atendimentos) intactas; só saiu do menu.
- **Restaurar:** descomentar a linha do item na array `NAV` (marca `LIXEIRA-PETS-MENU`).

### LIXEIRA-PETS-FICHA — Coluna de resumo + barra "Ficha do Tutor" (ficha do pet)
- **Arquivo:** `vet-crm/app/(user)/dashboard/erp/pets/[id]/page.tsx`
- **O que é:** (1) `<PetProfilePanel>` da coluna esquerda — 4 cards (Consultas realizadas / Última visita / Próxima consulta / Idade) + gráfico "Frequência de consultas" + box "Financeiro"; (2) barra "Ficha do Tutor" no rodapé.
- **Por quê (Cintia 22/06):** cards/financeiro poluíam a ficha; o acesso ao tutor já é feito clicando no nome do tutor.
- **Mantido:** boxes "Venda · Orçamentos", "Pacote ativo" e "Crédito do pet" (continuam na coluna); o componente `PetProfilePanel` e o endpoint `profile-stats` permanecem no código.
- **Restaurar:** remover os `{false && ...}` com marca `LIXEIRA-PETS-FICHA`.

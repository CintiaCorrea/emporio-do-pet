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

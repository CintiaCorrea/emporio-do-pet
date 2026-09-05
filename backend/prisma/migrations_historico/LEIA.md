# Migrações antigas — histórico, não executável

Estas 16 migrações são de **janeiro a maio de 2026**. Elas **não podem mais rodar**:
tentariam criar tabelas que já existem.

## Por que saíram de `migrations/`

Em 05/09/2026 o histórico de migrações foi **rebaseado**. O estado do banco naquele dia
virou o ponto de partida (`20260905200000_baseline_estado_atual`).

O motivo estava na tabela de controle do banco, que tinha **uma linha só**, falhada:

```
20260111130000_user_columns_backfill   finished_at = NULL
logs: "A migration failed to apply. New migrations cannot be applied..."
```

Uma migração travada em janeiro impedia todas as seguintes. De junho a setembro tudo
entrou por `prisma db push`, que altera o banco mas não deixa registro — e por isso o
histórico oficial ficou três meses atrás do banco real.

## O que se conferiu antes de rebasear

Comparação nos dois sentidos entre `schema.prisma` e o banco de produção
(`prisma migrate diff`): a **única** diferença era o índice
`idx_document_chunks_embedding`, de busca por similaridade, que o Prisma não sabe
descrever no schema. Ele foi escrito à mão no fim do baseline.

Ou seja: o `db push` manteve tudo em sincronia. Não havia divergência estrutural.

## São úteis para quê

Para ler. Elas contam como o banco chegou até aqui — quando cada tabela nasceu e por
quê. Não apague.

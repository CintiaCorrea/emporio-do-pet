# Pendências / Backlog — Empório do Pet CRM

> Lista de melhorias e itens combinados a executar depois. Cada item tem contexto + viabilidade.
> Regra de trabalho: 1 item por vez, com aprovação (ver memória `forma-de-trabalho-aprovacao`).

---

## 1. 🔎 Filtros nas listagens (relatórios mais detalhados) — PENDENTE
**Contexto (Cintia 06/07):** estamos deixando de colocar filtros nas listagens, o que limita os relatórios. Referência: tela "Filtrar" do SimplesVet em Produtos e serviços (Situação, Grupo, Marca, Fornecedor, Período de validade, Controla validade, + "Mais opções de filtro").

**Viabilidade: ALTA, baixo risco.** É frontend (painel de filtros); **não precisa mexer no banco** — os dados já existem.

### Tela "Produtos e Serviços" (`erp/catalogo`) — filtros possíveis com dados que JÁ temos:
- **Situação:** Ativo / Inativo / Todos (`Product.ativo`)
- **Tipo:** Produto / Serviço / Exame (já tem chips — manter)
- **Grupo:** `Product.category` (já vem na listagem)
- **Marca:** `Product.marca`
- **Fornecedor:** `Product.fornecedor` (já é coluna)
- **Controla validade:** `Product.controlaValidade`
- **Período de validade:** `Product.validadeMaisAntiga` (date range)
- "Mais opções": propósito, comissionado, faixa de preço/custo, estoque baixo, etc.
- Implementar: painel "Filtrar" (client-side por enquanto; server-side com query params se a lista crescer muito).

### Reaproveitar em OUTRAS telas (mesma prática):
- **Clientes** (`erp/tutores`) — já tem filtro por classificação; add: cidade, etiqueta, período, ranking ABC, etc.
- **Consulta de vendas / Recebimentos / Comissões** — período, forma, marca, usuário (parte já existe).
- **Estoque** — grupo, fornecedor, estoque baixo, controla validade.
- **Leads / Comercial** — origem, status, período, responsável.
- **Padrão recomendado:** criar 1 componente reutilizável de "Painel de filtros" (bege delicado) e ir aplicando tela a tela.

---

## 2. 🧾 Fiscal de produtos — PENDENTE
Ver `docs/fiscal-produtos.md`. Estrutura (campos NCM/CEST/etc.) **já está no banco**; falta a UI da etapa Fiscal no cadastro + a integração de emissão de nota (NFC-e/NF-e). Só necessário quando for emitir nota pelo sistema.

## 3. 📦 Pacote e Kit — PENDENTE
Estrutura no banco pronta (tipos PACOTE/KIT + `ProdutoComposicao` + validade/termos). Falta o cadastro (etapa "Itens do pacote/kit" no wizard) + o consumo na venda. Pacote = só serviços + validade + termos; Kit = produtos+serviços, imediato.

## 4. 📥 Importador do catálogo SimplesVet — PENDENTE
Estruturas do catálogo prontas pra importar (código, grupo, marca, unidade, custo, preço, estoque, fornecedor, código de barras…). Falta o parser/mapeamento do export do SimplesVet → `Product`. (Análogo ao importador de vendas já existente.)

## 5. ⚠️ Drift do `schema.prisma` vs. banco — PENDENTE (descoberto 18/07, ao iniciar o módulo financeiro)

**O que é:** o `backend/prisma/schema.prisma` está **fora de sincronia com o banco**. Existem mudanças
do CRM paradas no arquivo que nunca foram aplicadas:

- `Appointment.numeroVenda` — coluna nova **com constraint UNIQUE**
- `Product` — colunas fiscais novas (`cest`, entre outras) + FK `fornecedorId`
- tabelas `historico_clinico` e `produto_composicao` — existem no schema, **não** existem no banco

**Por que importa (o risco real):** `prisma db push` aplica o schema **inteiro**. Quem rodar o comando
para uma mudança pequena arrasta todas essas alterações do CRM junto, sem perceber. O Prisma chegou a
**bloquear** com aviso de perda de dados por causa do UNIQUE em `numeroVenda` — se houver
`numeroVenda` duplicado em produção, o push **falha no meio**.

**Também explica** por que as migrations pararam em 31/05/2026: os modelos recentes (caixa, boxes,
audit log, pacotes) foram para o banco via `db push`, sem migration. A pasta `prisma/migrations` está
desatualizada e não representa mais o estado real.

**Regra provisória até resolver:** ⚠️ **não rodar `prisma db push` neste repo.** Para aplicar mudanças,
gerar o SQL com `prisma migrate diff --from-url <db> --to-schema-datamodel prisma/schema.prisma --script`,
extrair **só** os statements do que se quer aplicar, conferir que não há `DROP`/`TRUNCATE`, e rodar
dentro de `BEGIN; ... COMMIT;`. Foi assim que as tabelas `fin_` do financeiro entraram, sem tocar no CRM.

**Como resolver (quando for a vez):** conferir em produção se há `numeroVenda` duplicado; decidir item a
item se cada mudança pendente deve mesmo ir para o banco; aplicar em passo dedicado, com backup; e
**voltar a usar migrations** para o histórico deixar de mentir. Não fazer de carona em outra tarefa.

---

## 6. Apoios menores — PENDENTE
- **Cadastro de Marcas** (hoje marca é texto livre no item; virar cadastro com dedup se quiser).
- **Áreas de venda** (Clínica/Petshop/Banho e Tosa) — adiado por decisão da Cintia (06/07).
- **Limite de desconto** (empresa/usuário) — amarra com o "permite alterar preço" e o desconto do caixa.

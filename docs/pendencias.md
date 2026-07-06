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

## 5. Apoios menores — PENDENTE
- **Cadastro de Marcas** (hoje marca é texto livre no item; virar cadastro com dedup se quiser).
- **Áreas de venda** (Clínica/Petshop/Banho e Tosa) — adiado por decisão da Cintia (06/07).
- **Limite de desconto** (empresa/usuário) — amarra com o "permite alterar preço" e o desconto do caixa.

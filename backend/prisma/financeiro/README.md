# Módulo Financeiro — scripts de banco

⚠️ **NÃO rodar `prisma db push` neste repositório.** O `schema.prisma` está fora de sincronia com o
banco (há mudanças do CRM paradas nele — ver `docs/pendencias.md`, item 5). Um `db push` arrastaria
essas mudanças do CRM junto. Por isso o módulo financeiro é aplicado por SQL cirúrgico.

## Arquivos

| Arquivo | O que é |
|---|---|
| `01-tabelas.sql` | Cria as 8 tabelas `fin_` + os enums do módulo. Só adição, zero `DROP`. |
| `gerar-seed.js` | Gera o `seed.sql` a partir de `plano_de_contas.csv` + as contas extras. |
| `seed.sql` | Dados iniciais: 3 marcas, 2 unidades, 11 linhas de serviço, 11 grupos, 67 contas. |

## Como aplicar (banco local)

```bash
# 1. tabelas
docker exec -i emporio-postgres psql -U emporio -d emporio_db -v ON_ERROR_STOP=1 < 01-tabelas.sql

# 2. dados (idempotente — pode rodar de novo sem duplicar)
docker exec -i emporio-postgres psql -U emporio -d emporio_db -v ON_ERROR_STOP=1 < seed.sql
```

## Como regerar o seed

O `seed.sql` é gerado, não editado à mão. Para mudar o plano de contas, edite o CSV de origem
(`Projects/Financeiro/plano_de_contas.csv`) ou a lista `EXTRAS` dentro do `gerar-seed.js`, e rode:

```bash
node gerar-seed.js seed.sql
```

## Procedimento para QUALQUER mudança futura no schema

1. Editar `prisma/schema.prisma`
2. `npx prisma validate`
3. Gerar o SQL: `npx prisma migrate diff --from-url <DATABASE_URL> --to-schema-datamodel prisma/schema.prisma --script > diff.sql`
4. **Extrair só os statements do financeiro** (que citam `fin_` ou os enums do módulo)
5. Conferir: nenhuma tabela não-`fin_` mencionada, zero `DROP`/`TRUNCATE`
6. Aplicar dentro de `BEGIN; ... COMMIT;`
7. Verificar que o CRM não mudou

## A construir na Fase 1 (decidido, ainda não no schema)

- **`fin_regras`** — regra de classificação automática por termo. Quando a descrição de um lançamento
  contém um termo, preenche categoria + dimensões automaticamente. Vale p/ receita e despesa.
  Campos: `termo`, `escopo` (RECEITA/DESPESA/AMBOS), alvos opcionais (`categoriaId`, `unidadeId`,
  `marcaId`, `linhaServicoId`, `contaId`), `prioridade` (ordem), `ativo`. Aplica no import, no manual
  e retroativo (botão "aplicar aos pendentes"). Preenche mas NUNCA trava (usuário pode corrigir).
- **`fin_lancamentos.numeroDocumento`** — campo próprio p/ nº da nota/boleto, SEPARADO da `descricao`.
  Motivo (Cintia 20/07): as regras trabalham em cima da `descricao`; o nº do documento tem que ficar
  fora do alcance delas p/ não ser atropelado.
- **Conta a pagar/receber + conciliação (Cintia 20/07):** um boleto tem DOIS momentos (lançado =
  PENDENTE com vencimento; pago = caixa). Novos campos em `fin_lancamentos`: `vencimento DateTime?`,
  `dataPagamento DateTime?`. Ao importar o extrato, cada linha do banco procura um PENDENTE que combine
  (valor + janela de data + fornecedor/nº doc) → marca como pago/conciliado, **sem criar duplicata**.
  Sem match = novo lançamento (regras classificam). Tela de Conciliação = duas colunas (extrato ×
  pendentes) com sugestão de pares.
- **Juros/multa/desconto na baixa (Cintia 20/07):** campos `jurosCentavos`, `multaCentavos`,
  `descontoCentavos` (Int, default 0). O valor pago = principal + juros + multa − desconto. No DRE o
  **principal fica na categoria original**; **juros e multa vão p/ Despesas Financeiras** e o desconto
  p/ "Descontos Financeiros Obtidos" — separação automática, senão a categoria original infla.

## Integração InfinitePay (pesquisado 20/07 — só o Checkout tem API)

A InfinitePay expõe API só para **Checkout Integrado** (links de pagamento) e **InfiniteTap**
(celular como maquineta) — cobranças **iniciadas pelo nosso sistema** disparam webhook em tempo real
(baixa automática viável). **NÃO há** API/webhook público que reporte as vendas passadas na
**maquineta física** para um ERP externo. Ou seja: baixa automática exige gerar a cobrança pelo nosso
sistema (mudança de fluxo no caixa), OU seguir por conciliação (extrato/CSV). Item de pendência —
não construir agora.

## Ideias no estacionamento (não construir ainda)

- **"Projetos" como 4ª dimensão** — o Meu Dinheiro tem Projetos (metas com início/fim, ex.:
  "Meta R$150k/mês", "Lançamento Medicina Integrativa"). Seria uma 4ª dimensão além de
  unidade/marca/linha. NÃO construir antes de decidir se isso não é a mesma coisa que o modelo
  `Meta` que o CRM já tem — senão vira duplicação. Provavelmente desnecessário: "quanto rendeu a
  Medicina Integrativa?" já é `linha de serviço = Medicina Integrativa` + filtro de período.
  (Nota mantida aqui, no escopo do Financeiro, em vez de no `docs/pendencias.md` compartilhado.)

## Auditoria de taxas InfinitePay — aprendizados (Cintia 23/07)

- As taxas variam por **faixa de faturamento mensal** (até 20 mil / +20 / +40 / +80). A clínica está
  em **"acima de 40 mil"** — é essa faixa que está semeada (`06-seed-taxas.sql`, do CSV). Se o
  faturamento mudar de faixa, recadastrar a tabela (nova vigência).
- **Plano de recebimento** = 3 modalidades: **"Em 1 dia útil"** (padrão da clínica; no OFX aparece
  como "1 Dia Útil"), **"Na hora"** (= Nitro, taxa bem maior) e **"Sem antecipação"** (D+30, taxa
  menor — não temos essa coluna ainda). A taxa já vem **com a antecipação embutida** — NÃO dá para
  separar MDR de antecipação (é taxa única sobre a venda). Nosso `plano`: "1 Dia Útil"→`Padrao`,
  "Na hora"→`Nitro`. ⬜ refinamento: auto-mapear `planoExtrato`→`plano` na auditoria e expor seletor
  de plano por venda (hoje default `Padrao`).

## Decisões de modelagem (por quê)

- **Prefixo `fin_`** — isola o módulo entre as ~90 tabelas do CRM.
- **Sem FK para o CRM** — `tutorId` e `appointmentId` são referências soltas (mesmo padrão de
  `BoxOcupacao`). O financeiro não quebra se o CRM mudar.
- **Dinheiro em centavos (`Int`)** — nunca `Float`. As tabelas de caixa antigas usam `Float`, que
  acumula erro de centavo; o módulo financeiro não repete isso.
- **Unidade obrigatória** no lançamento; marca e linha de serviço opcionais. Sem unidade obrigatória
  o DRE por unidade nasce furado.
- **Receita é UMA categoria** ("Receita de Serviços e Vendas"). A quebra por Consultas/Cirurgias/
  Exames/etc. vem da **dimensão linha de serviço**, não de categorias separadas. Criar
  "Receita de Cirurgias" repetiria o erro do sistema antigo (`MO MAP`, `CSV - MAP`), que era embutir
  a dimensão dentro do nome da categoria. O detalhe fino de serviço vem do ERP.
- **`TipoConta`** — ideia aproveitada do Meu Dinheiro: o tipo da conta (Dinheiro, Conta Corrente,
  Aplicação, Empréstimo Contratado, Imobilizado, Capital Social…) é o que separa caixa de
  investimento e de financiamento no DFC.

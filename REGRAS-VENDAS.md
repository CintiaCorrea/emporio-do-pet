# Regras do módulo de vendas

> **Leia antes de mexer em qualquer coisa de venda, orçamento, caixa ou internação.**
> Cada regra abaixo tem um teste que a guarda: se você mudar o comportamento, o teste falha.
> Falhar não quer dizer "está errado" — quer dizer "isto foi uma decisão da Cintia e precisa ser
> conversado antes de ir ao ar".
>
> Escrito em 17/09/2026, ao final da reforma das vendas.

## 1. O que é venda

É venda o que **tem número de venda**, menos orçamento e menos o registro de internação.
Venda cancelada sai das listas e dos gráficos. Não existe venda de R$ 0: toda venda tem valor do
cadastro e, quando é de graça, é zerada com desconto.

- Regra: `backend/src/modules/crm/consulta-vendas.regras.ts` (`ehVenda`, `ondeEVenda`)
- Guardada por: `consulta-vendas.regras.spec.ts`, `cobranca.regras.spec.ts`

## 2. O que entra na cobrança

Entra na cobrança a venda **posterior a 31/08/2026 23:59**, não cancelada. Agosto foi mês de
teste: aparece para consulta, com o selo **Histórico**, e fica fora do "Deve R$", da janela de
receber e de todo total a receber. O aberto é sempre **valor menos o que foi recebido**.

- Regra: `backend/src/common/cobranca.regras.ts`
- Guardada por: `cobranca.regras.spec.ts`, `cobranca-regra-unica.spec.ts`

## 3. Item e preço

Item de venda e de orçamento sai **só do cadastro**. Preço **nunca se digita**: vem do cadastro e,
quando o item é cobrado por peso, da faixa do peso registrado do animal. Sem peso, o item não
entra — o peso se registra ali mesmo, e vai para o prontuário.

- Regras: `vet-crm/lib/catalogoVendavel.ts` (`lancarDoCadastro`), `lib/porte.ts`, `common/porte.ts`
- Guardadas por: `lancarDoCadastro.test.ts`, `venda-le-o-peso.test.ts`, `caucao-e-o-peso.test.ts`,
  `preco-na-busca-do-cadastro.spec.ts`

## 4. As portas que criam venda

São quatro, e só quatro: o **carrinho da ficha** (venda e orçamento, e onde se edita), o **ponto de
venda**, a **internação** (a venda de cada dia) e **transformar orçamento em venda**.

- Guardada por: `portas-de-venda.spec.ts`, `um-carrinho-so.spec.ts`,
  `atendimento-nao-vira-venda.spec.ts`

## 5. Receber dinheiro

Uma gaveta só, usada por todas as telas. Ela pergunta em qual caixa o dinheiro entra, mostra o dia
do caixa, aceita desconto em R$ ou %, exige a forma de pagamento e, no cartão, a AUT. O troco só
existe em dinheiro: o que passar em cartão ou PIX vira **crédito do cliente**.

Desconto: o administrativo não tem limite; os demais até o % da forma (5% no PIX e em dinheiro,
0% no cartão). O desconto vai dividido nos itens.

- Regras: `backend/src/modules/caixa/desconto.regras.ts`, `recebimento-lote.regras.ts`,
  `vet-crm/lib/escolhaDoCaixa.ts`
- Guardadas por: `desconto.regras.spec.ts`, `desconto-em-toda-porta.spec.ts`,
  `baixa-pergunta-o-caixa.test.ts`, `recebimento-lote.regras.spec.ts`,
  `receber-em-lote-um-componente.spec.ts`

## 6. Apagar e estornar

Venda se apaga **pela tela de vendas**, por um caminho só. Com dinheiro recebido, só o
administrativo, e com aviso antes. O estorno devolve o desconto aos itens, o crédito usado ao
cliente e o estoque. **Caixa fechado recusa**: reabre o caixa, apaga e fecha de novo.
Agenda, tela do atendimento e documentos da ficha nunca apagam venda.

- Regras: `vet-crm/lib/vendas/excluirVenda.ts`, `backend/src/common/estornar-recebimento.ts`,
  `common/estoque-da-venda.ts`
- Guardadas por: `apagar-pelo-caminho-unico.spec.ts`, `estornar-recebimento.spec.ts`,
  `estoque-da-venda.spec.ts`, `apagar-recebimento-caixa-fechado.spec.ts`

## 7. Internação

A conta tem **uma porta só** no servidor: lançar, editar e apagar item passam por ela, que carimba
a data, recusa o lançamento repetido (mesma aplicação ou mesmo item no mesmo minuto) e **atualiza a
venda do dia na hora**. Item lançado depois de o dia ser fechado ou pago entra numa **venda
complementar** do mesmo dia. A diária sai do cadastro, pela faixa de peso. Não existe mais "Gerar
comanda do dia".

- Regras: `backend/src/modules/hospitalizations/conta-da-internacao.regras.ts`,
  `fechamento.regras.ts`
- Guardadas por: `conta-da-internacao.regras.spec.ts`, `conta-porta-unica.spec.ts`,
  `internacao-lanca-na-hora.spec.ts`, `diaria-do-cadastro.spec.ts`

## 8. Documentos

Comprovante de venda, orçamento e recibo saem no **timbrado da casa**. O recibo é do pagamento
(valor por extenso, forma, parcelamento e o descritivo dos serviços); antes de pagar, o que se
manda é o **relatório da compra**. Os dois imprimem e vão em PDF pelo WhatsApp.

- Regras: `vet-crm/lib/documentos/recibo.ts`, `recibo-pdf.ts`, `venda-pdf.ts`, `pdfDaCasa.ts`
- Guardadas por: `recibo-no-timbrado.spec.ts`, `valorPorExtenso.test.ts`,
  `acoes-na-linha-da-venda.spec.ts`

## 9. SimplesVet

É **só consulta**. O importador traz cliente e pet; a venda antiga não é gravada e não entra no
caixa nem no faturamento.

- Guardada por: `simplesvet-so-consulta.spec.ts`, `consulta-vendas.regras.spec.ts`

## 10. Datas combinadas

- **31/08/2026 23:59** — corte da cobrança (`common/cobranca.regras.CORTE_DA_COBRANCA`).
- **19/09/2026** — fim da janela de ajuste: até lá o administrativo lança em caixa de outra pessoa
  (`common/janela-de-ajuste.ts` e `lib/janelaDeAjuste.ts`, a mesma data nos dois lados).
- **30/09/2026** — remover do DTO de recebimento os campos antigos `liberacaoEmail`/`liberacaoSenha`.

## Como trabalhar aqui

1. Rode os testes dos dois lados antes de publicar: `npx jest` no backend e `npx vitest run` no
   vet-crm.
2. A catraca de tipos (`vet-crm/.catraca-tipos`) não pode subir.
3. Mudou uma regra desta página? Atualize a página **no mesmo commit**.

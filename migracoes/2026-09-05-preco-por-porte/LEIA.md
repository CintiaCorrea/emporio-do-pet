# Preço por porte — migração do catálogo (05/09/2026)

O catálogo tinha **um cadastro por faixa de peso**: "ACEPRAN ATE 10KG", "ACEPRAN - 11 A
20 KG", e assim por diante. A recepção escolhia pelo NOME em vez de pelo peso do animal
— a forma mais silenciosa de cobrar errado que existe, porque não dá erro nenhum.

Esta migração juntou cada família num item só, com preço por faixa (`cat_itens.precosPorte`).

## O que rodou

| | |
|---|---|
| Grupos migrados | 58 (mais 3 feitos à mão antes: Artrosan, Caução, Diária de internação) |
| Cadastros arquivados | 182 |
| Itens ativos | 679 → 497 |
| Faixa "acima de" criada em branco | 23 itens |
| Grupos deixados como estavam | 4 |

**Preço nenhum mudou.** Cada valor virou o valor da sua faixa.

## As regras que o script seguiu

1. **Só migra o que o sistema diz.** Entra o cadastro com o PESO ESCRITO no nome. Item
   que só diz "P"/"M"/"G" ficou de fora — deduzir que "G" é 20-30 kg seria inventar
   faixa de preço. Foram os 4 grupos que ficaram como estavam (Hospedagem, Anestesia
   Dissociativa, Anestesia Inalatória, Sedação para banho).

2. **As faixas encostam.** O "de" de cada faixa é o "até" da anterior, não o que estava
   escrito no nome. Sem isso a Tartarectomia teria "0 a 5 kg" e "0 a 10 kg" — duas
   faixas dizendo cobrir o mesmo cão de 3 kg.

3. **A última faixa é sempre aberta.** Onde não havia "acima de", foi criada uma SEM
   PREÇO. Assim a tela diz "não vendemos para esse porte" (verdade) em vez de "peso não
   cadastrado" (mentira — o peso está lá; o que falta é o preço). São os 23 itens.

4. **Item que não cobre os leves ganha uma faixa em branco na frente.** A Fluidoterapia
   começa em 10 kg; esticar o primeiro preço pra baixo cobraria de quem hoje não paga.

5. **Arquivar, nunca apagar.** `catalogoItemId` não tem FK: apagar quebraria estoque e
   comissão de vendas antigas. Os 182 estão com `arquivado=true, ativo=false`.

## Como desfazer

`antes-da-migracao.tsv` tem o estado anterior das 240 linhas tocadas: código, nome,
preço, ativo, arquivado, precosPorte. Um UPDATE por linha restaura tudo.

## Arquivos

- `migrar.mjs` — gerou o SQL a partir da consulta de agrupamento
- `migrar.sql` — o que foi executado (em 12 lotes, cada um numa transação)
- `antes-da-migracao.tsv` — o estado anterior, para desfazer

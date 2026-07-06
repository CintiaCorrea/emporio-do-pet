# Fiscal de Produtos — PREVISTO (executar em etapa futura)

> Estrutura registrada a partir do levantamento do SimplesVet (Comercial › Produtos e serviços › Adicionar › etapa "Fiscal").
> Os CAMPOS entram no schema agora (estrutura pronta p/ importação), mas a LÓGICA/UI de emissão fiscal fica para uma etapa dedicada.
> Só é necessário quando a clínica for **emitir nota fiscal (NFC-e/NF-e)** pelo sistema.

## Etapa "Fiscal" (opcional no cadastro do Produto)
A etapa toda é opcional, com aviso recomendando preencher se pretende emitir notas (e dica de pedir ajuda ao contador).

| Campo | Descrição |
|---|---|
| **Código NCM** | Nomenclatura Comum Mercosul. Obrigatório para emitir NFC-e. |
| **EX TIPI** | Exceção da regra fiscal aplicada ao NCM. |
| **Perfil tributário** | Combobox. Opções observadas: "Produtos COM Substituição Tributária", "Produtos SEM Substituição Tributária" (com/sem Monofásico). Serve p/ facilitar a config da tributação. |
| **Origem** | Origem da mercadoria. |
| **Forma de aquisição** | Produzida/Importada **ou** Adquirida de Terceiros. |
| **CEST** | Código Especificador da Substituição Tributária. Obrigatório p/ emissão de NFC-e de produtos com ST. |
| **NVE** | Nomenclatura de Valor Aduaneiro e Estatística. Identifica mercadorias importadas em detalhe. |

## Campos no schema (Product) — a adicionar como estrutura (todos opcionais)
`ncm`, `exTipi`, `perfilTributario`, `origem`, `formaAquisicao`, `cest`, `nve` — todos `String?`.

## Observações
- Serviço NÃO tem etapa Fiscal (sem NCM/estoque) — no SimplesVet o wizard de Serviço pula essa etapa.
- Pacote e Kit também não têm etapa Fiscal.
- Detalhe pendente de confirmar quando formos executar: opções completas do combobox "Perfil tributário" e regras de habilitação.

## Status
- [ ] Campos no schema (estrutura)
- [ ] UI da etapa Fiscal no cadastro
- [ ] Integração de emissão fiscal (NFC-e/NF-e)

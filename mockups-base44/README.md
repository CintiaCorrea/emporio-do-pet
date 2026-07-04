# Mockups Base44 — referência de design (fonte da verdade das telas)

Estes mockups são a **referência visual** de cada tela do app. Regra:
**onde existe mockup, a tela deve ficar IGUAL a ele; onde não existe, aplicar o
sistema "delicada" (ver abaixo) usando a ficha do cliente como gabarito.**

## Design-fonte (o sistema — vale para TODA tela)
- **`mockup-nova-versao-delicada.html`** ← tokens + componentes oficiais (fundo, cards, KPIs, cores, fonte). **Padrão-mãe.**
- **`GUIA-nova-versao-delicada.md`** ← guia escrito do padrão.
- **`mockup-sidebar-header-base44.html`** ← sidebar + header.

## Mapa mockup → tela (Vendas / ERP)
| Tela (rota) | Mockup |
|---|---|
| `erp/ranking-clientes` | `ranking-abc-mockup.html` |
| `erp/recebimentos` | `recebimentos-mockup.html` |
| `erp/vendas-graficos` | `vendas-graficos-mockup.html` |
| `erp/comandas` (Em atendimento) | `vendas-f1a-mockup.html` |
| `erp/formas-recebimento` | `formas-mockup.html` |
| `erp/configuracoes-vendas` | `config-vendas-mockup.html` |
| `erp/modelos-orcamento` | `modelo-orcamento-mockup.html` |
| `erp/modelo-demonstrativo` | `demonstrativo-mockup.html` |
| `erp/caixa` | `caixa_do_dia_mockup.html` |
| `erp/ponto-de-venda` (recebimento) | `registrar_recebimento_mockup.html` |
| Internação (ficha/boletim) | `Mockup-Internacao-Pet-v1.html`, `Mockup-Internacao-Boletim-v1.html`, `f3/f4/f5-mockup.html` |
| Ficha do pet | `mockup-ficha-pet.html` |
| Ficha de atendimento | `mockup-ficha-atendimento-REAL.html` |
| Agenda (config/escala) | `agenda_configuracoes_mockup.html`, `agenda_escala_mockup.html` |
| Inbox | `mockup-inbox-final-v2.html` (versão final) |
| Cadastro unificado cliente/pet | `f4_cadastro_unificado_v2_simplesvet.html` |

## Gabarito aprovado no app (referência viva, sem mockup próprio)
- **Ficha do cliente:** `vet-crm/app/(user)/dashboard/erp/tutores/[id]/page.tsx`
- **Internação:** `vet-crm/app/(user)/dashboard/erp/internacoes/[id]/page.tsx`
- **Hoje:** `vet-crm/app/(user)/dashboard/hoje/page.tsx`

> Telas sem mockup (Marketing, Pacotes, Consulta de vendas, etc.) seguem o
> sistema delicada + o gabarito acima.

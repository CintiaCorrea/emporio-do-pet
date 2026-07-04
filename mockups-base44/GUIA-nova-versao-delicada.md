# Guia de referência — versão minimalista e delicada

Empório do Pet · CRM do dev (`vet-crm/`, Next.js). Guia para migrar **todo o app** para um visual mais leve e delicado, **mantendo a identidade** já fixada no doc mestre (23/06): turquesa `#009AAC` + marinho `#014D5E` só nos acentos, superfícies brancas, bordas finas, sentence case, 2 pesos de fonte.

Arquivos relacionados:
- `mockup-nova-versao-delicada.html` — protótipo navegável (abre no navegador).
- `MESTRE-retomar-aqui.md` — estado do projeto e fluxo técnico (Codespace/PR).
- Mockups antigos: `mockup-sidebar-header-base44.html`, `mockup-ficha-pet.html`, série `mockup-inbox-*`.

---

## 1. Princípio (o que muda e o que NÃO muda)

**Não muda:** as cores da marca. Turquesa `#009AAC` e marinho `#014D5E` continuam sendo os acentos. Sem verde/teal como acento. Superfícies brancas.

**Muda o tratamento** — é daqui que vem a sensação "delicada":
- Mais respiro (padding e espaçamento maiores).
- Bordas mais finas e claras.
- Cantos mais arredondados (8px → 14–18px).
- Cor de marca usada com parcimônia (acento, não preenchimento).
- Sombra quase imperceptível no lugar de borda dura.
- **Emojis fofos permitidos** na interface (avatares de pet, toques de seção) — exceção combinada ao "só ícones outline". Dados densos seguem com ícones outline para não poluir.

> Como a paleta praticamente não muda, a migração é de baixo risco: troca-se sobretudo espaçamento, raio e espessura de borda.

---

## 2. Cores — referência (quase tudo permanece)

| Papel | Valor | Mudança |
|---|---|---|
| Turquesa marca (acento) | `#009AAC` | mantém |
| Marinho (acento forte / texto ativo) | `#014D5E` | mantém |
| Coral (alerta quente) | `#D85A30` | mantém |
| Dourado | `#B8860B` | mantém |
| Fundo da página | `#F5F2EC` → `#F8F6F1` | um tom mais claro |
| Superfície (cards) | `#FFFFFF` | mantém |
| Área suave (chips) | `#F0EBE0` → `#F1EFE8` | leve |
| Tint de item ativo | `#E0F4F6` | mantém |
| Borda | `#E8DFC8` → `#ECE7DD` | mais clara/fina |
| Texto principal | `#2C2C2A` | mantém |
| Texto secundário | `#5F5E5A` | mantém |
| Texto dica/placeholder | `#888780` → `#9A9388` | um pouco mais leve |

Regra mantida do doc mestre: **não** usar verde/teal `#1D9E75` como acento.

---

## 3. Tipografia

| Item | Atual | Versão delicada |
|---|---|---|
| Fonte | system-ui / Segoe UI | mantém |
| Pesos | 400/500/600 | **só 400 e 500** |
| Título de página | 19–22px / 500 | 20px / 500 |
| Título de seção | 14px | 13px / 500, cinza secundário |
| Corpo | 13–14px | 14px, `line-height: 1.6` |
| Overline/rótulo | caixa alta 11px | 11px, `letter-spacing .5px`, cor dica |
| Números (KPIs) | 19px | 24–26px / 500 |

Sentence case sempre.

---

## 4. Espaçamento, bordas e cantos (o coração da mudança)

| Token | Atual | Versão delicada |
|---|---|---|
| Raio pequeno (chips, botões) | 6–8px | **10px** |
| Raio médio (inputs, KPIs) | 8px | **14px** |
| Raio grande (cards) | 12px | **18px** |
| Raio extra (avatar quadrado/logo) | — | **20–26px** |
| Borda | 1px `#E8DFC8` | 1px `#ECE7DD` (parece 0.5px) |
| Sombra | nenhuma/forte | `0 1px 2px rgba(44,44,42,.04)` |
| Padding de card | 16px | **20–22px** |
| Gap entre cards | 16–24px | **20px** |

---

## 5. Componentes — antes → depois

**Sidebar.** Item ativo deixa de ser turquesa cheio e vira fundo `tint #E0F4F6` com texto marinho e ícone turquesa. Largura ~236px, item raio 10px, grupos com overline ("Operação", "Gestão"). Avatar do usuário em marinho.

**Header/topbar.** Título 20px + seta voltar. Busca vira "pílula" suave em vez de campo retangular.

**Cards.** Branco, borda `#ECE7DD`, raio 18px, sombra mínima. Sem cabeçalho colorido.

**KPIs.** Rótulo 12px cinza em cima, número 24–26px embaixo, delta em turquesa. Sem cards coloridos.

**Listas.** Avatar suave (42px, fundo tint/soft, pode ter emoji do pet) + título + subtítulo + pílula de status à direita. Divisórias finas.

**Pílulas.** `ok` = tint turquesa + texto marinho; `warn` = coral suave; neutro = soft. Texto na cor escura da própria família.

**Botões.** Primário = turquesa sólido, raio 10px. Secundário = transparente, borda `#E0DACE`, texto marinho. Sem gradiente.

**Timeline clínica.** Linha fina contínua + bolinhas por tipo (marinho/turquesa/dourado/coral), com borda branca ao redor para "respirar".

**Tabelas.** Cabeçalho em overline cinza, linhas com divisória fina, sem bordas verticais, sem zebra.

---

## 6. Bloco de tokens (para o tema do `vet-crm/`)

```css
:root{
  --bg-page:#F8F6F1; --bg-surface:#FFFFFF; --bg-soft:#F1EFE8; --bg-tint:#E0F4F6;
  --primary:#009AAC; --primary-deep:#014D5E; --coral:#D85A30; --gold:#B8860B;
  --text-1:#2C2C2A; --text-2:#5F5E5A; --text-3:#9A9388;
  --line:#ECE7DD; --line-2:#E0DACE;
  --r-sm:10px; --r-md:14px; --r-lg:18px; --r-xl:26px;
  --shadow:0 1px 2px rgba(44,44,42,.04);
}
```

Se o `vet-crm/` usa Tailwind, mapear no `tailwind.config` (`primary`, `marinho`, `coral`, `surface`, `line`) e `borderRadius` (`lg: 18px`). O conjunto de cores praticamente não muda — o ganho está em raio, borda e espaçamento.

---

## 7. Ordem de migração (em etapas, com preview — como combinado)

1. **Tema/tokens** — variáveis centrais; sem mudar telas ainda.
2. **Sidebar + Header** — primeiro impacto, baixo risco.
3. **Componentes base** — botão, card, pílula, KPI, item de lista, tabela.
4. **Telas operacionais** — Hoje, Clientes, Ficha do pet, Agenda, Inbox.
5. **Gestão** — Financeiro, Marketing, RH, Treinamento.
6. **Revisão** — varrer turquesa cheio, bordas grossas e cantos de 8px que escaparam.

Cada etapa: branch → PR → preview → seu merge → conferir deploy verde. Nada direto na produção.

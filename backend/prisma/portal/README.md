# Módulo Portal do Tutor (PTL) — scripts de banco

⚠️ **NÃO rodar `prisma db push` neste repositório.** Mesmo motivo do financeiro: o `schema.prisma`
tem mudanças do CRM paradas nele, e um `db push` arrastaria essas mudanças junto. O portal é
aplicado por SQL cirúrgico. Ver também `../financeiro/README.md`.

## Arquivos

| Arquivo | O que é |
|---|---|
| `01-fundacao.sql` | Cria as 3 tabelas `ptl_` da Fatia 1 (acesso). Só adição, zero `DROP`. |

## Como aplicar (banco local)

```bash
docker exec -i emporio-postgres psql -U emporio -d emporio_db -v ON_ERROR_STOP=1 < 01-fundacao.sql
```

## As 3 tabelas

| Tabela | Guarda | Observação |
|---|---|---|
| `ptl_codigos` | códigos de acesso (OTP) e tickets de desempate | só o **hash**, nunca o código |
| `ptl_sessoes` | sessões dos tutores (30 dias) | só o **hash** do token; `tutor_id` sem FK |
| `ptl_acessos` | rastro de quem pediu código, entrou, errou | exigência de dado de saúde (LGPD) |

## Decisões de modelagem (por quê)

- **Prefixo `ptl_`** — isola o módulo entre as ~90 tabelas do CRM (regra de parede nº 1).
- **Sem FK para o CRM** — `tutor_id` é referência solta, igual `box_ocupacoes` e o `fin_`. O portal
  não quebra se o CRM mudar, e o CRM não passa a depender do portal.
- **O portal não cria coluna nenhuma em `tutors`/`pets`/`contacts`.** Ele lê o CRM e escreve só no
  que é dele (regra de parede nº 4).
- **Hash com pepper (`PORTAL_OTP_PEPPER`)** — com o banco na mão e sem o segredo do servidor, não dá
  para montar a tabela de 1 milhão de hashes e descobrir o código de alguém.
- **`tipo` em `ptl_codigos`** (`ACESSO` | `DESEMPATE`) — o ticket de "qual desses pets é seu?" tem a
  mesma natureza de um código de uso único e curta validade, então mora na mesma tabela em vez de
  criar uma quarta.

## Regras de acesso implementadas (`src/modules/portal/`)

| Regra | Onde | Valor |
|---|---|---|
| Validade do código | `codigo.util.ts` | 5 minutos |
| Erros até bloquear | idem | 3 |
| Duração do bloqueio | idem | 15 minutos |
| Espera entre reenvios | idem | 60 segundos |
| Teto de códigos por número | idem | 3 por hora |
| Duração da sessão | idem | 30 dias |

**Nunca revelar se o telefone tem cadastro antes do código ser conferido.** `solicitarCodigo`
responde exatamente a mesma coisa para número conhecido, desconhecido ou bloqueado — senão qualquer
pessoa poderia testar números para descobrir quem é cliente da clínica.

## Variáveis de ambiente

| Variável | Para quê | Padrão |
|---|---|---|
| `PORTAL_OTP_PEPPER` | segredo somado ao código antes do hash | cai no `JWT_SECRET` |
| `PORTAL_OTP_TEMPLATE` | nome do modelo aprovado na Meta | `portal_tutor_codigo` |
| `PORTAL_OTP_IDIOMA` | idioma preferido | `pt_BR` |
| `PORTAL_OTP_IDIOMA_RESERVA` | idioma usado se o preferido não existir | `en_US` |
| `NEXT_PUBLIC_WHATSAPP_CLINICA` | número que os botões "falar com a recepção" abrem | — |

**Situação do modelo na Meta (29/07/2026):** `portal_tutor_codigo` está **Ativo**, categoria
Autenticação, **mas só em English (US)** — o corpo sai como *"123456 is your verification code"* com
botão *Copy code*. ⬜ **Pendente: adicionar a tradução Português (BR)** no Gerenciador do WhatsApp
(Gerenciar modelos › o modelo › Adicionar idioma). Quando existir, o portal passa a usar português
sozinho, sem mexer em nada aqui.

⚠️ **Criar template sempre direto na Meta.** Pelo painel de um parceiro/BSP a submissão foi enviada e
o status nunca voltou — o modelo até foi aprovado, mas o painel não mostrava.

**O envio se adapta ao que existe** (`portal-whatsapp.service.ts`), nesta ordem:
1. português + botão "copiar código";
2. se a Meta reclamar de número de parâmetros → mesmo idioma, **só o corpo** (modelo sem botão);
3. se a Meta disser que não há tradução → repete no **idioma reserva**;
4. se ainda falhar, registra no log **qual modelo e idioma** foram tentados (nunca o código).

## Testes (rodar sempre antes e depois de mexer)

```bash
cd backend && npm run build && npm run test:portal
```

Ver `scripts/portal/README.md`. São 110 verificações cobrindo acesso, ficha, saúde/peso/fisio e o
envio do código.

### Colunas/tabelas do CRM que faltam no espelho local

O banco local é um espelho **parcial** de produção. O portal precisa de duas coisas que podem faltar:

```sql
-- coluna da agenda de sala (MAP/parceiro) — existe em producao
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "agendaAvulsa" TEXT;
```

### Tabela do CRM que falta no espelho local

Se o bloco de Saúde falhar dizendo que `historico_clinico` não existe, é o banco local que está
incompleto (em produção ela existe — é o import do SimplesVet). Para criar só no local:

```sql
CREATE TABLE IF NOT EXISTS historico_clinico (
  id TEXT PRIMARY KEY,
  "petId" TEXT NOT NULL,
  "tutorCodigo" INTEGER,
  tipo TEXT NOT NULL,
  data TIMESTAMP(3) NOT NULL,
  titulo TEXT, texto TEXT, resumo TEXT, autor TEXT,
  "valorNum" DOUBLE PRECISION,
  "arquivoKey" TEXT, "arquivoNome" TEXT,
  origem TEXT NOT NULL DEFAULT 'SIMPLESVET',
  "codigoExterno" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT historico_clinico_pet_fk FOREIGN KEY ("petId") REFERENCES pets(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS historico_clinico_tipo_codigo_key ON historico_clinico (tipo, "codigoExterno");
CREATE INDEX IF NOT EXISTS historico_clinico_pet_data_idx ON historico_clinico ("petId", data);
```

## Próximas fatias

2. Início + Minha ficha · 3. Saúde/Peso/Fisio · 4. Internação + Agendar · 5. Alimentação
(precisa de modelo novo + tela de prescrição no app da equipe) · 6. PWA + push.

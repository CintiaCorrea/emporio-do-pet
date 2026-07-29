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
| `PORTAL_OTP_TEMPLATE` | nome do modelo aprovado na Meta | `verify_code_1` |
| `PORTAL_OTP_IDIOMA` | idioma do modelo na Meta | `pt_BR` |
| `NEXT_PUBLIC_WHATSAPP_CLINICA` | número que os botões "falar com a recepção" abrem | — |

**Modelo na Meta (29/07):** criado pelo assistente da própria Meta em
*Autenticação › Verificação de identidade › Verificar usuário*, e nasceu com o nome **`verify_code_1`**
— por isso é esse o padrão. Criar pelo painel de um parceiro/BSP deu problema: o modelo era enviado
mas o status nunca voltava. **Fazer sempre direto na Meta.**

O envio se adapta ao modelo: manda o código no corpo **e** no botão "copiar código"; se o modelo
aprovado não tiver botão, a Meta recusa por número de parâmetros e o serviço reenvia só com o corpo.
Se o nome ou o idioma não baterem com o cadastrado, o log diz exatamente qual modelo tentou.

## Próximas fatias

2. Início + Minha ficha · 3. Saúde/Peso/Fisio · 4. Internação + Agendar · 5. Alimentação
(precisa de modelo novo + tela de prescrição no app da equipe) · 6. PWA + push.

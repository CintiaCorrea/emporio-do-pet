# Testes do Portal do Tutor

Estes testes existem para **travar o que já funciona**: rode antes e depois de mexer em qualquer
coisa do portal, e você sabe na hora se alguma coisa quebrou — em vez de descobrir com o cliente.

## Como rodar

```bash
cd backend
npm run build          # os testes usam o backend compilado (dist/)
npm run test:portal
```

Sai um placar por bloco e um resumo no fim. Qualquer linha `FALHOU` aponta o que quebrou.

| Arquivo | O que garante |
|---|---|
| `1-acesso.js` | login por telefone + código, desempate de telefone repetido, bloqueio por tentativa, o cofre (um tutor nunca vê o pet do outro), rastro de acesso |
| `2-ficha.js` | Início (alerta de internação aparece e some na alta) e Minha ficha: edição real, **histórico do que o tutor apagou**, campos fora da lista ignorados, pet de outro tutor barrado |
| `3-saude.js` | carteirinha de vacinas (em dia / atrasada / importada), receitas, exames, gráfico de peso (uma pesagem por dia, variação) e pacote de fisioterapia |
| `4-whatsapp.js` | envio do código: modelo com e sem botão, idioma faltando, modelo trocado por variável, sem credencial. **Não gasta mensagem** — as respostas da Meta são simuladas |

## O que eles fazem no banco

Criam cadastros marcados (`[TESTE-...]`), exercitam o código de verdade e **apagam tudo no fim**,
inclusive se derem erro no meio. Rodam no banco **local** — nunca aponte para produção.

## Espelho local incompleto

O banco local é um espelho parcial do de produção. Duas coisas que os testes contornam:

- **`Appointment` não tem todas as colunas** (falta `numeroVenda`, por exemplo) — por isso os
  atendimentos de teste são inseridos por SQL direto, e não pelo Prisma.
- **`historico_clinico` pode não existir.** Ela existe em produção (é a tabela do import do
  SimplesVet). Se o bloco 3 falhar dizendo que a tabela não existe, crie-a no banco local com o SQL
  que está no `README` do módulo (`prisma/portal/README.md`).

Se `localhost` não conectar, é o Node resolvendo IPv6 enquanto o Postgres do Docker só escuta IPv4 —
os testes já trocam por `127.0.0.1` sozinhos.

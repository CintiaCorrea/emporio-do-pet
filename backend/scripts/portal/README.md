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
| `5-internacao.js` | boletins **enviados** aparecem; boletim **programado** (interno) NÃO vaza; automático não expõe "robô"; tudo some depois da alta |
| `6-agenda-regras.js` | regras do agendamento online: padrão fechado, serviço novo nasce desligado, salvar/recarregar, e as travas contra regra impossível |
| `7-horarios.js` | **o motor**: escala e férias, horário ocupado, cancelado liberando, atendimento longo, antecedência/janela, restrição de pacote, teto do dia e a **trava do pet bravo nos dois sentidos** |
| `8-agendar.js` | marcar (com a marquinha `PORTAL`), **a corrida de dois clientes pelo mesmo horário**, remarcar sem contar como desmarcação, travar pela taxa, liberar, comparecer zerando e o prazo |
| `9-pet-novo.js` | cadastro de pet pelo tutor: campos, selo de origem, histórico e a **anti-duplicidade** (ignora acento e maiúscula) |
| `10-dieta.js` | a equipe prescreve e o portal lê; dieta nova **não apaga** a anterior; ajuste de gramagem; trava de mexer em dieta encerrada |
| `11-push.js` | notificações: inscrever aparelho, não duplicar, **nunca enviar o mesmo assunto duas vezes**, aparelho morto sai da lista, falha temporária não apaga, desligar, e a **rotina do lembrete de amanhã** (com o texto sem dado clínico e sem repetir) . **Não envia notificação de verdade** |

Hoje são **289 verificações** em 11 blocos.

## Se falhar sem motivo aparente

O resumo no fim **nomeia o bloco** que falhou. Antes de suspeitar do código, confira se o
**backend local não está rodando** contra o mesmo banco: os blocos 6 a 8 apagam e devolvem a linha
única de configuração do agendamento, e um servidor no ar pode disputá-la. Derrube o servidor e rode
de novo — aconteceu uma vez em 29/07 e não reproduziu em nenhuma das rodadas seguintes.

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

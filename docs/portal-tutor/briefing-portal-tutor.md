# Portal do Tutor — Empório do Pet · Briefing para o Code

Este documento acompanha o arquivo `portal-tutor-emporio.html`. O HTML é um **protótipo de front-end com dados fictícios** (o pet "Thor"). Ele define layout, marca e navegação. O que falta é ligá-lo aos dados reais e à autenticação. Use este briefing como referência ao portar as telas para o app.

## Contexto

- O app próprio (Fly.io, `app.emporiodopet.com.br`) é o **sistema de registro**. O portal apenas **lê** o que a equipe clínica preenche — sem digitação dupla, sem integração externa.
- Público: os tutores que já são clientes. Não depende de descoberta em loja → distribuir primeiro como **PWA** (instalável na tela inicial), lojas ficam para depois se desejado.

## Telas

| Tela | O que mostra | Lê de |
|---|---|---|
| Início | Avatar do pet (com troca de foto), alerta de internação, menu, contato rápido | Pet, status de internação |
| Saúde | Carteirinha de vacinas, receitas ativas, exames (PDF) | Vacina, Receita, Exame |
| Alimentação | Dieta prescrita, variações permitidas (verde), o que evitar (vermelho), anexo PDF, dúvida | Dieta |
| Peso | Gráfico de evolução + meta + insight | Registro de peso |
| Fisioterapia | Progresso do pacote (sessão X de Y), histórico | Pacote de fisioterapia, Sessão |
| Internação | Boletim de hoje + boletins anteriores + falar com plantão | Boletim de internação |
| Agendar | Tipo de atendimento, horários prioritários, confirmar | Agenda / cria solicitação |
| Minha ficha | Dados do tutor e do pet (editáveis) | Tutor, Pet |

## Entidades (campos sugeridos)

- **Pet** (entidade central): nome, espécie, raça, nascimento, foto, alergias, tutor (telefone), status_internacao.
- **Tutor**: telefone (chave, login), nome, e-mail, endereço. Relação 1:N com Pet.
- **Vacina**: pet, nome, data_aplicacao, data_reforço, status.
- **Receita**: pet, descrição, posologia, validade, arquivo.
- **Exame**: pet, tipo, data, arquivo (PDF/imagem).
- **RegistroPeso**: pet, data, valor, meta.
- **Dieta**: pet, prescritor, data, itens[], variacoes_permitidas[], evitar[], anexo.
- **BoletimInternacao**: pet, data, turno (manhã/noite), texto, prescritor, proxima_medicacao, ativo.
- **PacoteFisio / Sessao**: pet, total_sessoes, sessao_atual, validade; sessões com data, tipo, observação.

## Fluxos de escrita (o resto é só leitura)

1. **Atualizar ficha** — tutor edita os próprios dados (telefone é bloqueado, é o login).
2. **Solicitar agendamento** — cria uma solicitação prioritária numa das pipelines; a recepção confirma no WhatsApp.
3. **Enviar foto do pet** — upload da foto para o avatar.

Além destes, os botões **"Contato rápido"** (home), **"Falar com a equipe de plantão"** (internação) e **"Tirar dúvida sobre a dieta"** (alimentação) abrem conversa no WhatsApp — não gravam dado, só disparam link.

## Autenticação

- Login por **telefone + código (OTP) via WhatsApp** — sem senha.
- O telefone identifica o Tutor; o filtro por telefone garante que cada tutor vê **somente os pets dele**.

## Estados vazios (importante)

Como tudo depende do que a equipe preenche, cada tela precisa de comportamento quando não há dado:
- Sem exame/receita/vacina → "nenhum registro ainda" em vez de espaço vazio.
- Pet não internado → **esconder** o alerta rosa da home e mostrar estado vazio na aba Internação.

## Armazenamento de arquivos

Fotos dos pets e PDFs de exame/receita/dieta vão para **object storage** (ex.: Tigris/S3 no Fly.io), não no banco. Guardar só a URL no registro.

## PWA e lojas

- O HTML já traz as metas de PWA. Para ficar instalável, adicionar `manifest.json` (nome, ícones, `theme-color` #0D2048, `display: standalone`) e um service worker mínimo.
- Notificações push funcionam em PWA (Android e iOS 16.4+ com "adicionar à tela inicial").
- Lojas (App Store 99 USD/ano, Google Play 25 USD única vez) são opcionais e podem empacotar o mesmo web app depois, sem refazer.

## Marca

- Paleta no `:root` do HTML: Marinho `#0D2048`, Turquesa `#00A1AE`, Céu `#D5F1F4`, Camurça `#DECBB2`, Chiclete `#F9B8C0`.
- O logo é **placeholder** (símbolo + nome em texto). Substituir pelo arquivo real da identidade.
- Ícones: Tabler. Fonte: Nunito. No app, considerar servir localmente.

---

## Notas do Code (prontidão de dados — jul/2026)

Cruzamento com `backend/prisma/schema.prisma`:
- ✅ Já existe: Peso (`Appointment.petWeight` = histórico + `Pet.weight`), Fisio (`Pacote`/`PacoteSessao`), Vacinas (`ProtocoloAplicado`/`ProtocoloDose`), Agenda (`Appointment`), Ficha (`Tutor`/`Pet`), internação (`Box`/`BoxOcupacao`), foto (`MediaFile` + `CloudStorageService`), WhatsApp (envio pronto).
- ⚠️ Estruturar: Receitas/Exames (hoje texto em `Appointment` + `ClinicalDocument`/`Document`) → precisa lista de "ativas" + PDFs no storage. Boletim de internação pode precisar de modelo próprio.
- ❌ Modelo novo: **Dieta/Alimentação**.

Fundações a construir: (1) login OTP do tutor (reusa nosso WhatsApp), (2) API do portal escopada por tutor (segurança/LGPD), (3) PWA (manifest + service worker) + web push (VAPID).

Estratégia acordada com a Cintia: finalizar **WhatsApp + ERP** (lado equipe) primeiro, para o portal (que só lê) já encontrar tudo funcionando. Confirmação de agendamento = motor channel-agnostic (WhatsApp agora, push do portal depois).

/**
 * Seed: Create the default WhatsApp AI Agent for Empório do Pet.
 *
 * Usage:
 *   npx ts-node prisma/seed-whatsapp-agent.ts
 *
 * This script:
 *   1. Finds (or creates) the admin user
 *   2. Upserts the default AI agent with a complete veterinary-clinic system prompt
 *   3. Prints the agent ID so you can set WHATSAPP_DEFAULT_AGENT_ID in .env
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AGENT_NAME = 'Atendente Virtual - Empório do Pet';

const SYSTEM_PROMPT = `Você é a atendente virtual do **Empório do Pet**, uma clínica veterinária e pet shop localizada em Brasília-DF.

## Sua Personalidade
- Simpática, acolhedora e profissional
- Usa linguagem clara e acessível, sem jargões médicos desnecessários
- Demonstra carinho genuíno pelos pets
- Chama o tutor pelo nome quando disponível ({tutor_name})
- Refere-se ao pet pelo nome quando disponível ({pet_name})

## Informações da Clínica
- **Nome:** Empório do Pet
- **Horário de Funcionamento:** Segunda a Sexta: 8h às 18h | Sábado: 8h às 13h | Domingo: Fechado
- **Serviços oferecidos:**
  - Consultas veterinárias (clínica geral, dermatologia, ortopedia, cardiologia)
  - Vacinação e vermifugação
  - Cirurgias (castração, ortopédicas, tecidos moles)
  - Exames laboratoriais e de imagem (raio-X, ultrassom, hemograma)
  - Banho e tosa
  - Pet shop (rações, medicamentos, acessórios)
  - Internação e acompanhamento
  - Emergências durante horário de funcionamento

## Suas Responsabilidades
1. **Agendar consultas** — Pergunte: nome do tutor, nome e espécie do pet, motivo da consulta e preferência de horário. Confirme que será encaixado na agenda assim que possível.
2. **Tirar dúvidas gerais** — Sobre serviços, horários, localização, formas de pagamento e preparação para consultas/cirurgias.
3. **Orientação básica de saúde** — Você pode dar orientações gerais (ex.: "é importante manter a vacinação em dia"), mas **NUNCA faça diagnósticos ou prescreva medicamentos**. Sempre recomende uma consulta presencial para avaliação clínica.
4. **Encaminhar para humano** — Quando o assunto for urgência médica, reclamação, ou algo que foge do seu escopo, diga que vai transferir para um atendente humano.
5. **Captar informações de lead** — Se o cliente é novo, colete de forma natural: nome completo, telefone (já temos pelo WhatsApp), e-mail (se oferecido), nome do pet, espécie e raça.

## Regras Importantes
- **NUNCA** invente informações sobre preços específicos, resultados de exames ou diagnósticos.
- Se não souber a resposta, diga: "Vou verificar com a equipe e retorno em breve!" ou sugira que o tutor entre em contato diretamente.
- Mantenha respostas concisas (máximo 3 parágrafos) — lembre-se que é WhatsApp.
- Use emojis com moderação (1-2 por mensagem, no máximo) para manter o tom profissional.
- Sempre finalize oferecendo ajuda adicional: "Posso ajudar com mais alguma coisa?"

## Data Atual
{current_date}`;

const GREETING_MESSAGE = `Olá! 🐾 Bem-vindo(a) ao Empório do Pet!

Sou a atendente virtual e estou aqui para ajudar com agendamentos, dúvidas sobre nossos serviços ou informações gerais.

Como posso ajudar você e seu pet hoje?`;

const OFFLINE_MESSAGE = `Olá! Obrigada por entrar em contato com o Empório do Pet! 🐾

No momento estamos fora do horário de atendimento.
📅 Nosso horário: Seg-Sex 8h às 18h | Sáb 8h às 13h

Sua mensagem foi registrada e responderemos assim que possível. Se for uma emergência, procure o hospital veterinário mais próximo.`;

async function main() {
  console.log('🐾 Seed: Creating default WhatsApp AI Agent...\n');

  // Find admin user (first user in the system)
  let user = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
  });

  if (!user) {
    user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
  }

  if (!user) {
    console.error('❌ No user found in database. Create a user first by logging in to the CRM.');
    process.exit(1);
  }

  console.log(`👤 Using user: ${user.name || user.email} (${user.id})`);

  // Upsert the agent (update if name matches, create otherwise)
  const existing = await prisma.aIAgent.findFirst({
    where: { name: AGENT_NAME, userId: user.id },
  });

  const agent = existing
    ? await prisma.aIAgent.update({
        where: { id: existing.id },
        data: {
          systemPrompt: SYSTEM_PROMPT,
          status: 'ACTIVE',
          whatsappEnabled: true,
          whatsappAutoReply: true,
          whatsappGreeting: GREETING_MESSAGE,
          whatsappOfflineMessage: OFFLINE_MESSAGE,
          whatsappBusinessHoursOnly: false,
          crmEnabled: true,
          crmAutoCreateLead: true,
          crmAutoUpdateLead: true,
          crmLeadScoring: true,
          temperature: 0.7,
          maxTokens: 1024,
          provider: 'OPENAI',
          model: 'gpt-4o-mini',
        },
      })
    : await prisma.aIAgent.create({
        data: {
          userId: user.id,
          name: AGENT_NAME,
          description:
            'Atendente virtual para WhatsApp do Empório do Pet. Agenda consultas, tira dúvidas e capta leads automaticamente.',
          type: 'CHATBOT',
          status: 'ACTIVE',
          provider: 'OPENAI',
          model: 'gpt-4o-mini',
          systemPrompt: SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: 1024,
          whatsappEnabled: true,
          whatsappAutoReply: true,
          whatsappGreeting: GREETING_MESSAGE,
          whatsappOfflineMessage: OFFLINE_MESSAGE,
          whatsappBusinessHoursOnly: false,
          crmEnabled: true,
          crmAutoCreateLead: true,
          crmAutoUpdateLead: true,
          crmLeadScoring: true,
          crmNotifyOnHighScore: true,
          voiceEnabled: false,
        },
      });

  console.log(`\n✅ Agent ${existing ? 'updated' : 'created'} successfully!`);
  console.log(`   Name:   ${agent.name}`);
  console.log(`   ID:     ${agent.id}`);
  console.log(`   Status: ${agent.status}`);
  console.log(`\n📋 Next step — add this to your backend/.env:`);
  console.log(`   WHATSAPP_DEFAULT_AGENT_ID=${agent.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

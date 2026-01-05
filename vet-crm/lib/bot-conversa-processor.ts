// lib/bot-conversa-processor.ts
import { BotConversaWebhookPayload } from '@/types/bot-conversa';
import { conversationFlowService } from '@/lib/conversation-flow';
import { createAppointmentFromConversation } from '@/lib/appointment-service';
import { processMessageStep } from '@/lib/conversation-steps';

export async function processBotConversaMessage(payload: BotConversaWebhookPayload) {
  const { contact, message } = payload;
  
  try {
    // Obter ou iniciar o fluxo de conversa
    let flow = conversationFlowService.getFlow(contact.id);
    if (!flow) {
      flow = conversationFlowService.startFlow(contact.id);
    }

    // Processar o passo atual da conversa
    const result = await processMessageStep(flow, message, contact);
    
    if (result.completed) {
      // Criar o agendamento e cards no kanban
      await createAppointmentFromConversation(result.appointmentData, contact);
      
      // Limpar o fluxo
      conversationFlowService.completeFlow(contact.id);
    } else {
      // Atualizar o fluxo para o próximo passo
      conversationFlowService.updateFlow(contact.id, {
        step: result.nextStep,
        appointmentData: result.appointmentData
      });
    }

  } catch (error) {
    console.error('Error processing BotConversa message:', error);
  }
}

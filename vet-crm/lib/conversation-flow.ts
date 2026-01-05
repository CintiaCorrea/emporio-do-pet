import { AppointmentData, ConversationFlow } from '@/types/bot-conversa';

export class ConversationFlowService {
  private flows: Map<string, ConversationFlow> = new Map();

  startFlow(contactId: string): ConversationFlow {
    const flow: ConversationFlow = {
      step: 'welcome',
      data: {},
      appointmentData: {}
    };
    this.flows.set(contactId, flow);
    return flow;
  }

  getFlow(contactId: string): ConversationFlow | undefined {
    return this.flows.get(contactId);
  }

  updateFlow(contactId: string, updates: Partial<ConversationFlow>): ConversationFlow {
    const currentFlow = this.flows.get(contactId) || this.startFlow(contactId);
    const updatedFlow = { ...currentFlow, ...updates };
    this.flows.set(contactId, updatedFlow);
    return updatedFlow;
  }

  nextStep(contactId: string, step: string, data?: Record<string, any>): ConversationFlow {
    const currentFlow = this.flows.get(contactId);
    if (!currentFlow) {
      return this.startFlow(contactId);
    }

    const updatedFlow: ConversationFlow = {
      ...currentFlow,
      step,
      data: { ...currentFlow.data, ...data }
    };

    this.flows.set(contactId, updatedFlow);
    return updatedFlow;
  }

  completeFlow(contactId: string): void {
    this.flows.delete(contactId);
  }
}

export const conversationFlowService = new ConversationFlowService();

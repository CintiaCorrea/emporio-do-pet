import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AutomationTrigger } from '@prisma/client';

@Injectable()
export class CrmAutomationListener {
  private readonly logger = new Logger(CrmAutomationListener.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('automations') private automationsQueue: Queue,
  ) {}

  /**
   * Trigger automations for a specific CRM event
   */
  private async triggerAutomations(
    trigger: AutomationTrigger,
    context: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Find active automations with this trigger
      const automations = await this.prisma.automation.findMany({
        where: {
          trigger,
          status: 'ACTIVE',
        },
        include: {
          steps: { orderBy: { position: 'asc' } },
        },
      });

      for (const automation of automations) {
        // Check trigger conditions if any
        const triggerConfig = automation.triggerConfig as Record<string, unknown> | null;
        
        if (triggerConfig?.conditions) {
          const conditions = triggerConfig.conditions as Record<string, unknown>;
          if (!this.matchesConditions(conditions, context)) {
            continue;
          }
        }

        // Queue automation execution
        await this.automationsQueue.add('execute', {
          automationId: automation.id,
          context,
          trigger,
        });

        this.logger.log(`Queued automation ${automation.name} for trigger ${trigger}`);
      }
    } catch (error) {
      this.logger.error(`Error triggering automations for ${trigger}: ${error}`);
    }
  }

  /**
   * Check if context matches conditions
   */
  private matchesConditions(
    conditions: Record<string, unknown>,
    context: Record<string, unknown>,
  ): boolean {
    for (const [key, expectedValue] of Object.entries(conditions)) {
      const actualValue = context[key];

      if (typeof expectedValue === 'object' && expectedValue !== null) {
        const condition = expectedValue as Record<string, unknown>;
        
        // Handle operators
        if ('gte' in condition && typeof actualValue === 'number') {
          if (actualValue < (condition.gte as number)) return false;
        }
        if ('lte' in condition && typeof actualValue === 'number') {
          if (actualValue > (condition.lte as number)) return false;
        }
        if ('eq' in condition) {
          if (actualValue !== condition.eq) return false;
        }
        if ('in' in condition && Array.isArray(condition.in)) {
          if (!condition.in.includes(actualValue)) return false;
        }
      } else {
        if (actualValue !== expectedValue) return false;
      }
    }
    return true;
  }

  // ============================================
  // Lead Events
  // ============================================

  @OnEvent('crm.lead.created')
  async onLeadCreated(data: {
    leadId: string;
    source?: string;
    conversationId?: string;
  }): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: data.leadId },
    });

    if (!lead) return;

    await this.triggerAutomations(AutomationTrigger.LEAD_CREATED, {
      ...data,
      leadId: lead.id,
      leadEmail: lead.email,
      leadName: lead.name,
      leadPhone: lead.phone,
      leadSource: lead.source,
      leadStatus: lead.status,
    });
  }

  @OnEvent('crm.lead.score_changed')
  async onLeadScoreChanged(data: {
    leadId: string;
    previousScore: number;
    newScore: number;
    scoreDelta: number;
  }): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: data.leadId },
    });

    if (!lead) return;

    await this.triggerAutomations(AutomationTrigger.LEAD_SCORE_CHANGED, {
      leadId: lead.id,
      leadEmail: lead.email,
      leadName: lead.name,
      leadStatus: lead.status,
      previousScore: data.previousScore,
      newScore: data.newScore,
      scoreDelta: data.scoreDelta,
      currentScore: lead.currentScore,
    });
  }

  @OnEvent('crm.lead.status_changed')
  async onLeadStatusChanged(data: {
    leadId: string;
    previousStatus: string;
    newStatus: string;
  }): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: data.leadId },
    });

    if (!lead) return;

    await this.triggerAutomations(AutomationTrigger.LEAD_STATUS_CHANGED, {
      leadId: lead.id,
      leadEmail: lead.email,
      leadName: lead.name,
      leadPhone: lead.phone,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      currentScore: lead.currentScore,
    });
  }

  @OnEvent('crm.lead.qualified')
  async onLeadQualified(data: {
    leadId: string;
    score: number;
  }): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: data.leadId },
    });

    if (!lead) return;

    await this.triggerAutomations(AutomationTrigger.LEAD_QUALIFIED, {
      leadId: lead.id,
      leadEmail: lead.email,
      leadName: lead.name,
      leadPhone: lead.phone,
      score: data.score,
    });
  }

  @OnEvent('crm.lead.converted')
  async onLeadConverted(data: {
    leadId: string;
    clientId: string;
  }): Promise<void> {
    const [lead, client] = await Promise.all([
      this.prisma.lead.findUnique({ where: { id: data.leadId } }),
      this.prisma.client.findUnique({ where: { id: data.clientId } }),
    ]);

    if (!lead || !client) return;

    await this.triggerAutomations(AutomationTrigger.LEAD_CONVERTED, {
      leadId: lead.id,
      leadEmail: lead.email,
      leadName: lead.name,
      clientId: client.id,
      clientEmail: client.email,
      clientName: client.name,
    });
  }

  // ============================================
  // Client Events
  // ============================================

  @OnEvent('crm.client.created')
  async onClientCreated(data: {
    clientId: string;
    convertedFromLeadId?: string;
  }): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: data.clientId },
    });

    if (!client) return;

    await this.triggerAutomations(AutomationTrigger.CLIENT_CREATED, {
      clientId: client.id,
      clientEmail: client.email,
      clientName: client.name,
      clientPhone: client.phone,
      convertedFromLeadId: data.convertedFromLeadId,
      clientType: client.type,
    });
  }

  @OnEvent('crm.client.status_changed')
  async onClientStatusChanged(data: {
    clientId: string;
    previousStatus: string;
    newStatus: string;
  }): Promise<void> {
    const client = await this.prisma.client.findUnique({
      where: { id: data.clientId },
    });

    if (!client) return;

    await this.triggerAutomations(AutomationTrigger.CLIENT_STATUS_CHANGED, {
      clientId: client.id,
      clientEmail: client.email,
      clientName: client.name,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
    });
  }

  // ============================================
  // WhatsApp Events
  // ============================================

  @OnEvent('whatsapp.message.received')
  async onWhatsAppMessageReceived(data: {
    userId: string;
    conversationId: string;
    contactPhone: string;
    contactName?: string;
    content: string;
    messageType: string;
  }): Promise<void> {
    await this.triggerAutomations(AutomationTrigger.WHATSAPP_MESSAGE_RECEIVED, {
      userId: data.userId,
      conversationId: data.conversationId,
      contactPhone: data.contactPhone,
      contactName: data.contactName,
      messageContent: data.content,
      messageType: data.messageType,
    });
  }

  @OnEvent('whatsapp.conversation.new')
  async onWhatsAppConversationStarted(data: {
    conversationId: string;
    userId: string;
    contactPhone: string;
    contactName?: string;
  }): Promise<void> {
    await this.triggerAutomations(AutomationTrigger.WHATSAPP_CONVERSATION_STARTED, {
      conversationId: data.conversationId,
      userId: data.userId,
      contactPhone: data.contactPhone,
      contactName: data.contactName,
    });
  }
}

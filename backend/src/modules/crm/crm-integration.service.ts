import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus, LeadSource } from '@prisma/client';

export interface WhatsAppLeadData {
  conversationId: string;
  userId: string;
  contactPhone: string;
  contactName?: string;
  firstMessage?: string;
}

export interface LeadConversionData {
  leadId: string;
  userId?: string;
  clientData?: {
    name?: string;
    companyName?: string;
    taxId?: string;
    address?: string;
    notes?: string;
    tags?: string[];
  };
}

export interface LeadScoreChangeEvent {
  leadId: string;
  previousScore: number;
  newScore: number;
  reason?: string;
}

export interface LeadStatusChangeEvent {
  leadId: string;
  previousStatus: LeadStatus;
  newStatus: LeadStatus;
  reason?: string;
}

@Injectable()
export class CrmIntegrationService {
  private readonly logger = new Logger(CrmIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a Lead from a WhatsApp conversation
   */
  async createLeadFromWhatsApp(data: WhatsAppLeadData): Promise<string | null> {
    try {
      // Check if lead already exists by phone
      const existingLead = await this.prisma.lead.findFirst({
        where: {
          OR: [
            { phone: data.contactPhone },
            { phone: { contains: data.contactPhone.slice(-8) } },
          ],
        },
      });

      if (existingLead) {
        // Update existing lead with conversation reference
        await this.prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            whatsappConversationId: data.conversationId,
            lastSeenAt: new Date(),
            lastActivityAt: new Date(),
          },
        });

        // Track event
        await this.prisma.leadEvent.create({
          data: {
            leadId: existingLead.id,
            eventType: 'whatsapp_conversation',
            eventData: {
              name: 'Nova conversa WhatsApp',
              conversationId: data.conversationId,
              firstMessage: data.firstMessage,
            },
          },
        });

        this.logger.log(`Lead ${existingLead.id} linked to WhatsApp conversation ${data.conversationId}`);
        return existingLead.id;
      }

      // Create new lead
      const lead = await this.prisma.lead.create({
        data: {
          name: data.contactName,
          phone: data.contactPhone,
          email: `${data.contactPhone}@whatsapp.lead`, // Placeholder until real email is collected
          source: LeadSource.WHATSAPP,
          sourceDetail: 'whatsapp_conversation',
          status: LeadStatus.NEW,
          whatsappConversationId: data.conversationId,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        },
      });

      // Create initial event
      await this.prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          eventType: 'lead_created',
          eventData: {
            name: 'Lead criado via WhatsApp',
            conversationId: data.conversationId,
            firstMessage: data.firstMessage,
          },
        },
      });

      // Record history
      await this.prisma.leadHistory.create({
        data: {
          leadId: lead.id,
          action: 'created',
          newValue: 'WhatsApp',
          triggeredBy: 'system',
          metadata: { source: 'whatsapp_conversation' },
        },
      });

      // Emit event for automations
      this.eventEmitter.emit('crm.lead.created', {
        leadId: lead.id,
        source: 'whatsapp',
        conversationId: data.conversationId,
      });

      this.logger.log(`New lead ${lead.id} created from WhatsApp conversation ${data.conversationId}`);
      return lead.id;
    } catch (error) {
      this.logger.error(`Error creating lead from WhatsApp: ${error}`);
      return null;
    }
  }

  /**
   * Convert a Lead to a Client
   */
  async convertLeadToTutor(data: LeadConversionData): Promise<string | null> {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: data.leadId },
        include: { enrichment: true },
      });

      if (!lead) {
        this.logger.warn(`Lead ${data.leadId} not found for conversion`);
        return null;
      }

      // Check if already converted
      if (lead.convertedToTutorId) {
        this.logger.warn(`Lead ${data.leadId} already converted to tutor ${lead.convertedToTutorId}`);
        return lead.convertedToTutorId;
      }

      // Check if tutor with same email exists (tutor = cliente unificado)
      const existingTutor = lead.email
        ? await this.prisma.tutor.findUnique({ where: { email: lead.email } })
        : null;

      if (existingTutor) {
        // Link to existing tutor and ensure classificacao=Cliente
        await this.prisma.tutor.update({
          where: { id: existingTutor.id },
          data: { classificacao: 'Cliente' },
        });
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: LeadStatus.CONVERTED,
            convertedAt: new Date(),
            convertedToTutorId: existingTutor.id,
          },
        });

        this.logger.log(`Lead ${lead.id} linked to existing tutor ${existingTutor.id}`);
        return existingTutor.id;
      }

      // Create new tutor (cliente unificado)
      const tutor = await this.prisma.tutor.create({
        data: {
          name: data.clientData?.name || lead.name || 'Cliente sem nome',
          email: lead.email,
          companyName: data.clientData?.companyName,
          cnpj: data.clientData?.taxId,
          observations: data.clientData?.notes,
          tags: data.clientData?.tags || lead.tags,
          classificacao: 'Cliente',
          status: 'ACTIVE',
          convertedFromLeadId: lead.id,
        },
      });

      // Update lead
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAt: new Date(),
          convertedToTutorId: tutor.id,
        },
      });

      // Record history
      await this.prisma.leadHistory.create({
        data: {
          leadId: lead.id,
          action: 'converted',
          field: 'status',
          oldValue: lead.status,
          newValue: LeadStatus.CONVERTED,
          triggeredBy: data.userId || 'system',
          metadata: { tutorId: tutor.id },
        },
      });

      // Emit events
      this.eventEmitter.emit('crm.lead.converted', {
        leadId: lead.id,
        tutorId: tutor.id,
      });

      this.eventEmitter.emit('crm.tutor.created', {
        tutorId: tutor.id,
        convertedFromLeadId: lead.id,
      });

      this.logger.log(`Lead ${lead.id} converted to tutor ${tutor.id}`);
      return tutor.id;
    } catch (error) {
      this.logger.error(`Error converting lead to tutor: ${error}`);
      return null;
    }
  }

  /**
   * Handle lead score change
   */
  async handleScoreChange(event: LeadScoreChangeEvent): Promise<void> {
    const { leadId, previousScore, newScore } = event;

    // Record history
    await this.prisma.leadHistory.create({
      data: {
        leadId,
        action: 'score_update',
        field: 'currentScore',
        oldValue: previousScore.toString(),
        newValue: newScore.toString(),
        triggeredBy: 'system',
        metadata: { reason: event.reason },
      },
    });

    // Emit event for automations
    this.eventEmitter.emit('crm.lead.score_changed', {
      leadId,
      previousScore,
      newScore,
      scoreDelta: newScore - previousScore,
    });

    // Check for qualification threshold
    if (previousScore < 70 && newScore >= 70) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (lead && lead.status === LeadStatus.ENRICHED) {
        await this.prisma.lead.update({
          where: { id: leadId },
          data: { status: LeadStatus.QUALIFIED },
        });

        this.eventEmitter.emit('crm.lead.qualified', {
          leadId,
          score: newScore,
        });
      }
    }
  }

  /**
   * Handle lead status change
   */
  async handleStatusChange(event: LeadStatusChangeEvent): Promise<void> {
    const { leadId, previousStatus, newStatus } = event;

    // Record history
    await this.prisma.leadHistory.create({
      data: {
        leadId,
        action: 'status_change',
        field: 'status',
        oldValue: previousStatus,
        newValue: newStatus,
        triggeredBy: 'system',
        metadata: { reason: event.reason },
      },
    });

    // Emit event for automations
    this.eventEmitter.emit('crm.lead.status_changed', {
      leadId,
      previousStatus,
      newStatus,
    });
  }

  /**
   * Get CRM statistics
   */
  async getStats(userId?: string): Promise<{
    leads: {
      total: number;
      new: number;
      qualified: number;
      converted: number;
      averageScore: number;
    };
    clients: {
      total: number;
      active: number;
      fromLeads: number;
      totalRevenue: number;
    };
    conversions: {
      rate: number;
      thisMonth: number;
      lastMonth: number;
    };
  }> {
    const now = new Date();
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      avgScore,
      totalClients,
      activeClients,
      clientsFromLeads,
      totalRevenue,
      conversionsThisMonth,
      conversionsLastMonth,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { status: LeadStatus.NEW } }),
      this.prisma.lead.count({ where: { status: LeadStatus.QUALIFIED } }),
      this.prisma.lead.count({ where: { status: LeadStatus.CONVERTED } }),
      this.prisma.lead.aggregate({ _avg: { currentScore: true } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente' } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', status: 'ACTIVE' } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', convertedFromLeadId: { not: null } } }),
      // TODO: totalRevenue agora calculado dinamicamente via Appointments (sum por tutorId quando status=PAID)
      { _sum: { totalRevenue: 0 } },
      this.prisma.lead.count({
        where: {
          status: LeadStatus.CONVERTED,
          convertedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
      }),
      this.prisma.lead.count({
        where: {
          status: LeadStatus.CONVERTED,
          convertedAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),
    ]);

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      leads: {
        total: totalLeads,
        new: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        averageScore: Math.round(avgScore._avg.currentScore || 0),
      },
      clients: {
        total: totalClients,
        active: activeClients,
        fromLeads: clientsFromLeads,
        totalRevenue: totalRevenue._sum.totalRevenue || 0,
      },
      conversions: {
        rate: Math.round(conversionRate * 10) / 10,
        thisMonth: conversionsThisMonth,
        lastMonth: conversionsLastMonth,
      },
    };
  }

  /**
   * Event listener: Create lead from WhatsApp conversation
   */
  @OnEvent('whatsapp.conversation.new')
  async onWhatsAppConversationNew(data: {
    conversationId: string;
    userId: string;
    contactPhone: string;
    contactName?: string;
    firstMessage?: string;
  }): Promise<void> {
    // Check if auto-lead creation is enabled for this user
    const settings = await this.prisma.integrationSettings.findFirst({
      where: { userId: data.userId },
    });

    // Default to enabled if not explicitly disabled
    const autoCreateLeads = settings?.metadata 
      ? (settings.metadata as Record<string, unknown>).autoCreateLeadsFromWhatsApp !== false
      : true;

    if (autoCreateLeads) {
      await this.createLeadFromWhatsApp(data);
    }
  }
}

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import {
  WhatsAppCampaignStatus,
  WhatsAppMessageStatus,
  Prisma,
} from '@prisma/client';
import { CreateCampaignDto, UpdateCampaignDto } from './dto';

export interface CampaignFilters {
  status?: WhatsAppCampaignStatus;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

@Injectable()
export class WhatsAppCampaignsService {
  private readonly logger = new Logger(WhatsAppCampaignsService.name);

  constructor(
    private prisma: PrismaService,
    private whatsAppService: WhatsAppService,
    @InjectQueue('whatsapp-campaigns') private campaignsQueue: Queue,
  ) {}

  // Create a new campaign
  async create(userId: string, dto: CreateCampaignDto) {
    return this.prisma.whatsAppCampaign.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        messageContent: dto.messageContent,
        messageType: dto.messageType || 'TEXT',
        mediaUrl: dto.mediaUrl,
        templateName: dto.templateName,
        templateLanguage: dto.templateLanguage || 'pt_BR',
        audienceType: dto.audienceType || 'all',
        audienceFilter: dto.audienceFilter ? (dto.audienceFilter as Prisma.JsonObject) : undefined,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        status: dto.scheduledFor ? 'SCHEDULED' : 'DRAFT',
      },
    });
  }

  // Update a campaign
  async update(userId: string, campaignId: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(userId, campaignId);

    if (campaign.status === 'RUNNING' || campaign.status === 'COMPLETED') {
      throw new BadRequestException('Cannot update a running or completed campaign');
    }

    return this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        name: dto.name,
        description: dto.description,
        messageContent: dto.messageContent,
        messageType: dto.messageType,
        mediaUrl: dto.mediaUrl,
        templateName: dto.templateName,
        templateLanguage: dto.templateLanguage,
        audienceType: dto.audienceType,
        audienceFilter: dto.audienceFilter ? (dto.audienceFilter as Prisma.JsonObject) : undefined,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
        status: dto.scheduledFor ? 'SCHEDULED' : campaign.status,
      },
    });
  }

  // Delete a campaign
  async delete(userId: string, campaignId: string) {
    const campaign = await this.findOne(userId, campaignId);

    if (campaign.status === 'RUNNING') {
      throw new BadRequestException('Cannot delete a running campaign');
    }

    return this.prisma.whatsAppCampaign.delete({
      where: { id: campaignId },
    });
  }

  // Get a single campaign
  async findOne(userId: string, campaignId: string) {
    const campaign = await this.prisma.whatsAppCampaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { recipients: true },
        },
      },
    });

    if (!campaign || campaign.userId !== userId) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  // List campaigns
  async findAll(userId: string, filters?: CampaignFilters, pagination?: PaginationParams) {
    const where: Prisma.WhatsAppCampaignWhereInput = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      this.prisma.whatsAppCampaign.findMany({
        where,
        include: {
          _count: {
            select: { recipients: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsAppCampaign.count({ where }),
    ]);

    return {
      data: campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Add recipients to campaign
  async addRecipients(
    userId: string,
    campaignId: string,
    recipients: Array<{
      phone: string;
      name?: string;
      tutorId?: string;
      variables?: Record<string, string>;
    }>,
  ) {
    const campaign = await this.findOne(userId, campaignId);

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new BadRequestException('Can only add recipients to draft or scheduled campaigns');
    }

    const recipientsData = recipients.map(r => ({
      campaignId,
      phone: this.formatPhoneNumber(r.phone),
      name: r.name,
      tutorId: r.tutorId,
      variables: r.variables ? (r.variables as Prisma.JsonObject) : undefined,
    }));

    // Use createMany with skipDuplicates to avoid errors on duplicate phones
    const result = await this.prisma.whatsAppCampaignRecipient.createMany({
      data: recipientsData,
      skipDuplicates: true,
    });

    // Update total recipients count
    const totalRecipients = await this.prisma.whatsAppCampaignRecipient.count({
      where: { campaignId },
    });

    await this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: { totalRecipients },
    });

    return { added: result.count, total: totalRecipients };
  }

  // Remove recipients from campaign
  async removeRecipients(userId: string, campaignId: string, recipientIds: string[]) {
    await this.findOne(userId, campaignId);

    await this.prisma.whatsAppCampaignRecipient.deleteMany({
      where: {
        campaignId,
        id: { in: recipientIds },
      },
    });

    // Update total recipients count
    const totalRecipients = await this.prisma.whatsAppCampaignRecipient.count({
      where: { campaignId },
    });

    await this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: { totalRecipients },
    });

    return { remaining: totalRecipients };
  }

  // Build audience from filter
  async buildAudience(userId: string, campaignId: string) {
    const campaign = await this.findOne(userId, campaignId);

    let recipients: Array<{ phone: string; name?: string; tutorId?: string }> = [];

    const filter = campaign.audienceFilter as Record<string, unknown> | null;

    switch (campaign.audienceType) {
      case 'tutors':
        const tutors = await this.prisma.tutor.findMany({
          where: {
            isActive: true,
            acceptsWhatsApp: true,
          },
          include: {
            contacts: {
              where: { isWhatsApp: true },
              take: 1,
            },
          },
        });

        recipients = tutors
          .filter(t => t.contacts.length > 0)
          .map(t => ({
            phone: t.contacts[0].number,
            name: t.name,
            tutorId: t.id,
          }));
        break;

      case 'leads':
        const leadWhere: Record<string, unknown> = {};
        if (filter?.status) leadWhere.status = filter.status;
        if (filter?.source) leadWhere.source = filter.source;
        if (filter?.minScore) leadWhere.currentScore = { gte: Number(filter.minScore) };

        const leads = await this.prisma.lead.findMany({
          where: { phone: { not: null }, ...leadWhere },
        });

        recipients = leads
          .filter(l => l.phone)
          .map(l => ({
            phone: l.phone!,
            name: l.name || undefined,
          }));
        break;

      case 'clients':
        const clientWhere: Record<string, unknown> = { status: 'ACTIVE' };
        if (filter?.tags && Array.isArray(filter.tags)) {
          clientWhere.tags = { hasSome: filter.tags };
        }

        const clients = await this.prisma.client.findMany({
          where: clientWhere as any,
        });

        recipients = clients
          .filter(c => c.phone)
          .map(c => ({
            phone: c.phone!,
            name: c.name,
          }));
        break;

      case 'all':
      default:
        const allTutors = await this.prisma.tutor.findMany({
          where: {
            isActive: true,
            acceptsWhatsApp: true,
          },
          include: {
            contacts: {
              where: { isWhatsApp: true },
              take: 1,
            },
          },
        });

        recipients = allTutors
          .filter(t => t.contacts.length > 0)
          .map(t => ({
            phone: t.contacts[0].number,
            name: t.name,
            tutorId: t.id,
          }));
        break;
    }

    // Add recipients to campaign
    if (recipients.length > 0) {
      return this.addRecipients(userId, campaignId, recipients);
    }

    return { added: 0, total: 0 };
  }

  // Start campaign
  async start(userId: string, campaignId: string) {
    const campaign = await this.findOne(userId, campaignId);

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED' && campaign.status !== 'PAUSED') {
      throw new BadRequestException('Campaign cannot be started in current status');
    }

    if (campaign.totalRecipients === 0) {
      throw new BadRequestException('Campaign has no recipients');
    }

    // Update campaign status
    await this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // Add to processing queue
    await this.campaignsQueue.add(
      'process-campaign',
      {
        campaignId,
        userId,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(`Campaign ${campaignId} started for user ${userId}`);

    return { status: 'RUNNING', message: 'Campaign started' };
  }

  // Pause campaign
  async pause(userId: string, campaignId: string) {
    const campaign = await this.findOne(userId, campaignId);

    if (campaign.status !== 'RUNNING') {
      throw new BadRequestException('Can only pause running campaigns');
    }

    await this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });

    return { status: 'PAUSED', message: 'Campaign paused' };
  }

  // Get campaign stats
  async getStats(userId: string, campaignId: string) {
    const campaign = await this.findOne(userId, campaignId);

    const stats = await this.prisma.whatsAppCampaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { status: true },
    });

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      SENT: 0,
      DELIVERED: 0,
      READ: 0,
      FAILED: 0,
    };

    for (const stat of stats) {
      statusCounts[stat.status] = stat._count.status;
    }

    return {
      campaignId,
      name: campaign.name,
      status: campaign.status,
      totalRecipients: campaign.totalRecipients,
      sentCount: campaign.sentCount,
      deliveredCount: campaign.deliveredCount,
      readCount: campaign.readCount,
      failedCount: campaign.failedCount,
      pending: statusCounts.PENDING,
      deliveryRate: campaign.sentCount > 0 
        ? ((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1) 
        : '0',
      readRate: campaign.deliveredCount > 0 
        ? ((campaign.readCount / campaign.deliveredCount) * 100).toFixed(1) 
        : '0',
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
    };
  }

  // Get recipients for a campaign
  async getRecipients(
    userId: string,
    campaignId: string,
    status?: WhatsAppMessageStatus,
    pagination?: PaginationParams,
  ) {
    await this.findOne(userId, campaignId);

    const where: Prisma.WhatsAppCampaignRecipientWhereInput = { campaignId };
    if (status) {
      where.status = status;
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const skip = (page - 1) * limit;

    const [recipients, total] = await Promise.all([
      this.prisma.whatsAppCampaignRecipient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.whatsAppCampaignRecipient.count({ where }),
    ]);

    return {
      data: recipients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Update recipient status (called by processor)
  async updateRecipientStatus(
    recipientId: string,
    status: WhatsAppMessageStatus,
    waMessageId?: string,
    failedReason?: string,
  ) {
    const updateData: Prisma.WhatsAppCampaignRecipientUpdateInput = {
      status,
      waMessageId,
    };

    if (status === 'SENT') {
      updateData.sentAt = new Date();
    } else if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    } else if (status === 'READ') {
      updateData.readAt = new Date();
    } else if (status === 'FAILED') {
      updateData.failedReason = failedReason;
    }

    return this.prisma.whatsAppCampaignRecipient.update({
      where: { id: recipientId },
      data: updateData,
    });
  }

  // Update campaign metrics (called by processor)
  async updateCampaignMetrics(campaignId: string) {
    const stats = await this.prisma.whatsAppCampaignRecipient.groupBy({
      by: ['status'],
      where: { campaignId },
      _count: { status: true },
    });

    let sentCount = 0;
    let deliveredCount = 0;
    let readCount = 0;
    let failedCount = 0;

    for (const stat of stats) {
      switch (stat.status) {
        case 'SENT':
          sentCount = stat._count.status;
          break;
        case 'DELIVERED':
          deliveredCount = stat._count.status;
          break;
        case 'READ':
          readCount = stat._count.status;
          break;
        case 'FAILED':
          failedCount = stat._count.status;
          break;
      }
    }

    return this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount,
        deliveredCount,
        readCount,
        failedCount,
      },
    });
  }

  // Mark campaign as completed
  async completeCampaign(campaignId: string) {
    return this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  // Mark campaign as failed
  async failCampaign(campaignId: string) {
    return this.prisma.whatsAppCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });
  }

  // Format phone number
  private formatPhoneNumber(phone: string): string {
    let digits = phone.replace(/\D/g, '');
    digits = digits.replace(/^0+/, '');

    if (!digits.startsWith('55') && digits.length >= 10 && digits.length <= 11) {
      digits = '55' + digits;
    }

    return digits;
  }
}

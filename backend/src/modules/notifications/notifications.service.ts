import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel, NotificationType, Prisma } from '@prisma/client';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  channel?: NotificationChannel;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface ListNotificationsQuery {
  userId: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  read?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        channel: dto.channel || NotificationChannel.IN_APP,
        link: dto.link,
        metadata: dto.metadata as Prisma.InputJsonValue,
      },
    });

    // Emit event for WebSocket
    this.eventEmitter.emit('notification.created', {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    });

    this.logger.log(`Created notification ${notification.id} for user ${dto.userId}`);

    return notification;
  }

  async findAll(query: ListNotificationsQuery) {
    const where: Prisma.NotificationWhereInput = {
      userId: query.userId,
    };

    if (query.type) where.type = query.type;
    if (query.channel) where.channel = query.channel;
    if (query.read !== undefined) where.isRead = query.read;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit || 20,
        skip: query.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total };
  }

  async findOne(id: string, userId: string) {
    return this.prisma.notification.findFirst({
      where: { id, userId },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async delete(id: string, userId: string) {
    return this.prisma.notification.deleteMany({
      where: { id, userId },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  // Quick notification helpers
  async notifyWhatsAppMessage(userId: string, contactName: string, preview: string) {
    return this.create({
      userId,
      type: NotificationType.WHATSAPP_MESSAGE,
      title: `Nova mensagem de ${contactName}`,
      message: preview.substring(0, 100),
      channel: NotificationChannel.IN_APP,
    });
  }

  async notifyAppointmentReminder(userId: string, petName: string, date: Date) {
    return this.create({
      userId,
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Lembrete de Consulta',
      message: `Consulta de ${petName} amanhã às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      channel: NotificationChannel.IN_APP,
    });
  }

  async notifyAutomationComplete(userId: string, automationName: string, success: boolean) {
    return this.create({
      userId,
      type: NotificationType.AUTOMATION_COMPLETE,
      title: success ? 'Automação Concluída' : 'Automação Falhou',
      message: `A automação "${automationName}" ${success ? 'foi executada com sucesso' : 'encontrou um erro'}`,
      channel: NotificationChannel.IN_APP,
    });
  }

  async notifyCampaignComplete(userId: string, campaignName: string, sent: number, total: number) {
    return this.create({
      userId,
      type: NotificationType.CAMPAIGN_COMPLETE,
      title: 'Campanha Concluída',
      message: `A campanha "${campaignName}" enviou ${sent}/${total} mensagens`,
      channel: NotificationChannel.IN_APP,
    });
  }
}

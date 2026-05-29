import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class ScheduledMessagesService {
  private readonly logger = new Logger(ScheduledMessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async schedule(userId: string, dto: { to: string; content: string; scheduledFor: string }) {
    const phone = (dto.to || '').replace(/\D/g, '');
    if (!phone || !dto.content?.trim()) {
      throw new Error('phone and content required');
    }
    return this.prisma.whatsAppScheduledMessage.create({
      data: {
        userId,
        phone,
        content: dto.content.trim(),
        scheduledFor: new Date(dto.scheduledFor),
        status: 'PENDING',
      },
    });
  }

  async listPending(userId: string) {
    return this.prisma.whatsAppScheduledMessage.findMany({
      where: { userId, status: 'PENDING' },
      orderBy: { scheduledFor: 'asc' },
    });
  }

  async cancel(id: string) {
    return this.prisma.whatsAppScheduledMessage.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // Cron a cada 1 min: processar agendamentos vencidos
  @Cron(CronExpression.EVERY_MINUTE)
  async processQueue() {
    const due = await this.prisma.whatsAppScheduledMessage.findMany({
      where: { status: 'PENDING', scheduledFor: { lte: new Date() } },
      take: 20,
    });
    for (const msg of due) {
      try {
        await this.whatsapp.sendMessage(msg.userId, {
          to: msg.phone,
          content: msg.content,
          type: 'text' as any,
        } as any);
        await this.prisma.whatsAppScheduledMessage.update({
          where: { id: msg.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } catch (e: any) {
        this.logger.warn(`Falha ao enviar msg agendada ${msg.id}: ${e.message}`);
        await this.prisma.whatsAppScheduledMessage.update({
          where: { id: msg.id },
          data: { status: 'FAILED', failedReason: e.message?.substring(0, 200) },
        });
      }
    }
    if (due.length > 0) {
      this.logger.log(`Processados ${due.length} agendamentos`);
    }
  }
}

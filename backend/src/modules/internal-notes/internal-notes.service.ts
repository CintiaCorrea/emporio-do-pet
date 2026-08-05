import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InternalNotesService {
  private readonly logger = new Logger(InternalNotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(fromUserId: string, dto: { toUserId: string; content: string; conversationId?: string | null; attachmentUrl?: string | null; attachmentName?: string | null }) {
    const nota = await this.prisma.internalNote.create({
      data: {
        fromUserId,
        toUserId: dto.toUserId,
        content: dto.content,
        conversationId: dto.conversationId || null,
        attachmentUrl: dto.attachmentUrl || null,
        attachmentName: dto.attachmentName || null,
      } as any,
    });

    // Popup em tempo real p/ quem RECEBE (nunca p/ si mesmo). Best-effort: falhar aqui
    // não pode impedir a nota de ser criada.
    if (dto.toUserId && dto.toUserId !== fromUserId) {
      try {
        const de = await this.prisma.user.findUnique({ where: { id: fromUserId }, select: { name: true } });
        const nome = de?.name || 'Um colega';
        const previa = (dto.content || '').replace(/\s+/g, ' ').trim().slice(0, 90);
        await this.notifications.create({
          userId: dto.toUserId,
          type: NotificationType.INFO,
          title: `💬 Mensagem interna de ${nome}`,
          message: previa || 'Você recebeu uma mensagem interna.',
          link: dto.conversationId ? `/dashboard/inbox-nativo?conversa=${dto.conversationId}` : '/dashboard/inbox-nativo',
          metadata: { kind: 'internal_note', noteId: nota.id, fromUserId },
        });
      } catch (e: any) { this.logger.warn(`Falha ao notificar nota interna: ${e?.message || e}`); }
    }

    return nota;
  }

  async listForUser(userId: string) {
    // [EMP-COWORK] retorna recebidas E enviadas pelo usuário (chat interno 2-way)
    return this.prisma.internalNote.findMany({
      where: { OR: [{ toUserId: userId }, { fromUserId: userId }] },
      orderBy: { createdAt: 'desc' },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
      take: 200,
    });
  }

  async markRead(id: string) {
    return this.prisma.internalNote.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async remove(id: string) {
    return this.prisma.internalNote.delete({ where: { id } });
  }
}

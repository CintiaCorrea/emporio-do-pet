import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InternalNotesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(fromUserId: string, dto: { toUserId: string; content: string; conversationId?: string | null }) {
    return this.prisma.internalNote.create({
      data: {
        fromUserId,
        toUserId: dto.toUserId,
        content: dto.content,
        conversationId: dto.conversationId || null,
      },
    });
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

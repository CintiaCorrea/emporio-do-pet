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
    return this.prisma.internalNote.findMany({
      where: { toUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { fromUser: { select: { id: true, name: true } } },
      take: 100,
    });
  }

  async markRead(id: string) {
    return this.prisma.internalNote.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }
}

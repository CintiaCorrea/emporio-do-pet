import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInteracaoDto } from './dto/create-interacao.dto';
import { UpdateInteracaoDto } from './dto/update-interacao.dto';

@Injectable()
export class InteracoesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInteracaoDto & { autorUserId?: string }) {
    const data: any = {
      leadId: dto.leadId ?? null,
      tutorId: dto.tutorId ?? null,
      petId: dto.petId ?? null,
      autorUserId: dto.autorUserId ?? null,
      tipo: dto.tipo || 'NOTA',
      texto: dto.texto,
      proximaAcao: dto.proximaAcao ?? null,
      proximoFollowupAt: dto.proximoFollowupAt ? new Date(dto.proximoFollowupAt) : null,
      canal: dto.canal ?? null,
      threadId: dto.threadId ?? null,
    };
    const created = await (this.prisma as any).interacao.create({ data, include: { autor: { select: { id: true, name: true } } } });
    // Atualiza proximoFollowupAt na entidade vinculada se foi informado
    if (data.proximoFollowupAt) {
      if (data.leadId) await this.prisma.lead.update({ where: { id: data.leadId }, data: { proximoFollowupAt: data.proximoFollowupAt } as any });
      if (data.tutorId) await this.prisma.tutor.update({ where: { id: data.tutorId }, data: { proximoFollowupAt: data.proximoFollowupAt } as any });
      if (data.petId) await this.prisma.pet.update({ where: { id: data.petId }, data: { proximoFollowupAt: data.proximoFollowupAt } as any });
    }
    return created;
  }

  async findAll(params: { leadId?: string; tutorId?: string; petId?: string; limit?: number }) {
    const { leadId, tutorId, petId, limit = 50 } = params;
    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (tutorId) where.tutorId = tutorId;
    if (petId) where.petId = petId;
    return (this.prisma as any).interacao.findMany({
      where,
      include: { autor: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, Number(limit))),
    });
  }

  async findById(id: string) {
    const it = await (this.prisma as any).interacao.findUnique({
      where: { id },
      include: { autor: { select: { id: true, name: true } } },
    });
    if (!it) throw new NotFoundException('Interação não encontrada');
    return it;
  }

  async update(id: string, dto: UpdateInteracaoDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.proximoFollowupAt) data.proximoFollowupAt = new Date(dto.proximoFollowupAt);
    return (this.prisma as any).interacao.update({ where: { id }, data, include: { autor: { select: { id: true, name: true } } } });
  }

  async remove(id: string) {
    await this.findById(id);
    await (this.prisma as any).interacao.delete({ where: { id } });
    return { ok: true };
  }
}

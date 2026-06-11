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

  async findAll(params: { leadId?: string; tutorId?: string; petId?: string; canal?: string; tipo?: string; limit?: number }) {
    const { leadId, tutorId, petId, canal, tipo, limit = 50 } = params;

    // Filtros AND aplicados por cima do escopo da pessoa
    const and: any[] = [];
    if (canal) and.push({ canal });
    if (tipo) and.push({ tipo });

    // Histórico unificado por "pessoa": tutor <-> seus pets <-> lead de origem.
    // A ficha do cliente passa a enxergar o que foi registrado nos pets dele
    // (e no lead que originou o cliente); a ficha do lead enxerga o que veio do
    // cliente convertido e dos pets dele. Sem alterar a gravação.
    let or: any[] | null = null;

    if (tutorId) {
      const tutor = await (this.prisma as any).tutor.findUnique({
        where: { id: tutorId },
        select: { convertedFromLeadId: true, pets: { select: { id: true } } },
      });
      or = [{ tutorId }];
      const petIds = (tutor?.pets ?? []).map((p: any) => p.id);
      if (petIds.length) or.push({ petId: { in: petIds } });
      if (tutor?.convertedFromLeadId) or.push({ leadId: tutor.convertedFromLeadId });
    } else if (leadId) {
      const tutor = await (this.prisma as any).tutor.findFirst({
        where: { convertedFromLeadId: leadId },
        select: { id: true, pets: { select: { id: true } } },
      });
      or = [{ leadId }];
      if (tutor?.id) {
        or.push({ tutorId: tutor.id });
        const petIds = (tutor.pets ?? []).map((p: any) => p.id);
        if (petIds.length) or.push({ petId: { in: petIds } });
      }
    } else if (petId) {
      or = [{ petId }];
    }

    const where: any = {};
    if (or) and.push({ OR: or });
    if (and.length) where.AND = and;

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

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PacotesService {
  constructor(private readonly prisma: PrismaService) {}

  // Anexa nomes de pet/tutor (FKs sao String simples, sem relation).
  private async enrich(pacotes: any[]) {
    const petIds = Array.from(new Set(pacotes.map((p) => p.petId).filter(Boolean)));
    const tutorIds = Array.from(new Set(pacotes.map((p) => p.tutorId).filter(Boolean)));
    const pets = petIds.length
      ? await this.prisma.pet.findMany({ where: { id: { in: petIds } }, select: { id: true, name: true } })
      : [];
    const tutors = tutorIds.length
      ? await this.prisma.tutor.findMany({ where: { id: { in: tutorIds } }, select: { id: true, name: true } })
      : [];
    const petMap = new Map(pets.map((p) => [p.id, p]));
    const tutorMap = new Map(tutors.map((t) => [t.id, t]));
    return pacotes.map((p) => ({
      ...p,
      pet: petMap.get(p.petId) || null,
      tutor: p.tutorId ? tutorMap.get(p.tutorId) || null : null,
    }));
  }

  async findAll(query: any = {}) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.petId) where.petId = query.petId;
    if (query.tutorId) where.tutorId = query.tutorId;
    const pacotes = await this.prisma.pacote.findMany({
      where,
      include: { sessoes: { orderBy: { numero: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return this.enrich(pacotes);
  }

  async findByPet(petId: string) {
    const pacotes = await this.prisma.pacote.findMany({
      where: { petId },
      include: { sessoes: { orderBy: { numero: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return this.enrich(pacotes);
  }

  async findByTutor(tutorId: string) {
    const pacotes = await this.prisma.pacote.findMany({
      where: { tutorId },
      include: { sessoes: { orderBy: { numero: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return this.enrich(pacotes);
  }

  async findOne(id: string) {
    const p = await this.prisma.pacote.findUnique({
      where: { id },
      include: { sessoes: { orderBy: { numero: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Pacote nao encontrado');
    const [enriched] = await this.enrich([p]);
    return enriched;
  }

  async create(dto: any, userId?: string) {
    let petId = dto.petId ?? null;
    let tutorId = dto.tutorId ?? null;

    if (!petId && dto.appointmentId) {
      const ap = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
        select: { petId: true, tutorId: true },
      });
      if (ap) {
        petId = ap.petId;
        tutorId = tutorId ?? ap.tutorId;
      }
    }
    if (!petId) throw new BadRequestException('petId (ou appointmentId) obrigatorio');
    if (!dto.totalSessoes || Number(dto.totalSessoes) <= 0) {
      throw new BadRequestException('totalSessoes deve ser maior que zero');
    }
    if (!tutorId) {
      const pet = await this.prisma.pet.findUnique({ where: { id: petId }, select: { tutorId: true } });
      tutorId = pet?.tutorId ?? null;
    }

    const novo = await this.prisma.pacote.create({
      data: {
        petId,
        tutorId,
        orcamentoId: dto.orcamentoId ?? null,
        servico: dto.servico || 'Fisioterapia',
        descricao: dto.descricao ?? null,
        totalSessoes: Number(dto.totalSessoes),
        valor: Number(dto.valor || 0),
        validade: dto.validade ? new Date(dto.validade) : null,
        observacao: dto.observacao ?? null,
        createdById: userId ?? null,
      },
      include: { sessoes: true },
    });
    return this.findOne(novo.id);
  }

  private async aplicarBaixa(pacote: any, opts: { appointmentId?: string; profissional?: string; observacao?: string; userId?: string }) {
    if (pacote.status !== 'ATIVO') throw new BadRequestException('Pacote nao esta ativo');
    if (pacote.sessoesUsadas >= pacote.totalSessoes) throw new BadRequestException('Pacote sem sessoes restantes');
    const numero = pacote.sessoesUsadas + 1;
    await this.prisma.pacoteSessao.create({
      data: {
        pacoteId: pacote.id,
        numero,
        appointmentId: opts.appointmentId ?? null,
        profissional: opts.profissional ?? null,
        observacao: opts.observacao ?? null,
        createdById: opts.userId ?? null,
      },
    });
    const novoStatus = numero >= pacote.totalSessoes ? 'CONCLUIDO' : 'ATIVO';
    await this.prisma.pacote.update({
      where: { id: pacote.id },
      data: { sessoesUsadas: numero, status: novoStatus },
    });
    return this.findOne(pacote.id);
  }

  async registrarSessao(id: string, dto: any, userId?: string) {
    const pacote = await this.findOne(id);
    return this.aplicarBaixa(pacote, {
      appointmentId: dto?.appointmentId,
      profissional: dto?.profissional,
      observacao: dto?.observacao,
      userId,
    });
  }

  // PONTO CENTRAL DE DISPARO — "confirmar comparecimento".
  async registrarComparecimento(dto: any, userId?: string) {
    const appointmentId = dto?.appointmentId;
    if (!appointmentId) throw new BadRequestException('appointmentId obrigatorio');

    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, petId: true },
    });
    if (!appt) throw new NotFoundException('Agendamento nao encontrado');

    const jaBaixado = await this.prisma.pacoteSessao.findFirst({ where: { appointmentId } });
    if (jaBaixado) {
      return { ok: true, jaRegistrado: true, pacote: await this.findOne(jaBaixado.pacoteId) };
    }

    const pacote = await this.prisma.pacote.findFirst({
      where: { petId: appt.petId, status: 'ATIVO' },
      orderBy: { createdAt: 'asc' },
    });
    if (!pacote) return { ok: false, motivo: 'Nenhum pacote ativo para este pet' };

    const atualizado = await this.aplicarBaixa(pacote, { appointmentId, userId });
    // TODO (conexao futura): disparar para pipeline da fisioterapia e demais areas.
    return { ok: true, pacote: atualizado };
  }

  async cancelar(id: string) {
    await this.findOne(id);
    await this.prisma.pacote.update({ where: { id }, data: { status: 'CANCELADO' } });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.pacote.delete({ where: { id } });
    return { ok: true };
  }
}

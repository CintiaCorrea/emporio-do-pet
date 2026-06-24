import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PacotesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any = {}) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.petId) where.petId = query.petId;
    if (query.tutorId) where.tutorId = query.tutorId;
    return this.prisma.pacote.findMany({
      where,
      include: { sessoes: { orderBy: { numero: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByPet(petId: string) {
    return this.prisma.pacote.findMany({
      where: { petId },
      include: { sessoes: { orderBy: { numero: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByTutor(tutorId: string) {
    return this.prisma.pacote.findMany({
      where: { tutorId },
      include: { sessoes: { orderBy: { numero: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.pacote.findUnique({
      where: { id },
      include: { sessoes: { orderBy: { numero: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Pacote nao encontrado');
    return p;
  }

  async create(dto: any, userId?: string) {
    if (!dto.petId) throw new BadRequestException('petId obrigatorio');
    if (!dto.totalSessoes || Number(dto.totalSessoes) <= 0) {
      throw new BadRequestException('totalSessoes deve ser maior que zero');
    }
    let tutorId = dto.tutorId ?? null;
    if (!tutorId) {
      const pet = await this.prisma.pet.findUnique({ where: { id: dto.petId }, select: { tutorId: true } });
      tutorId = pet?.tutorId ?? null;
    }
    return this.prisma.pacote.create({
      data: {
        petId: dto.petId,
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

  // ============================================================
  // PONTO CENTRAL DE DISPARO — "confirmar comparecimento".
  // Ao confirmar o comparecimento de um agendamento, baixamos a
  // sessao do(s) pacote(s) ativo(s) do pet. Este é o unico lugar
  // a partir do qual as demais areas conectadas (pipeline da
  // fisioterapia, financeiro, notificacoes) devem ser acionadas.
  // A fiacao dessas areas sera feita posteriormente.
  // ============================================================
  async registrarComparecimento(dto: any, userId?: string) {
    const appointmentId = dto?.appointmentId;
    if (!appointmentId) throw new BadRequestException('appointmentId obrigatorio');

    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, petId: true },
    });
    if (!appt) throw new NotFoundException('Agendamento nao encontrado');

    // Evita baixa duplicada para o mesmo agendamento.
    const jaBaixado = await this.prisma.pacoteSessao.findFirst({ where: { appointmentId } });
    if (jaBaixado) {
      return { ok: true, jaRegistrado: true, pacote: await this.findOne(jaBaixado.pacoteId) };
    }

    // Pacote ativo mais antigo do pet, com sessoes restantes.
    const pacote = await this.prisma.pacote.findFirst({
      where: { petId: appt.petId, status: 'ATIVO' },
      orderBy: { createdAt: 'asc' },
    });
    if (!pacote) return { ok: false, motivo: 'Nenhum pacote ativo para este pet' };

    const atualizado = await this.aplicarBaixa(pacote, { appointmentId, userId });

    // TODO (conexao futura): a partir daqui, disparar para pipeline
    // da fisioterapia e demais areas conectadas.

    return { ok: true, pacote: atualizado };
  }

  async cancelar(id: string) {
    await this.findOne(id);
    return this.prisma.pacote.update({ where: { id }, data: { status: 'CANCELADO' } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.pacote.delete({ where: { id } });
    return { ok: true };
  }
}

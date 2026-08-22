import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateHospitalizationDto } from './dto/create-hospitalization.dto';
import { UpdateHospitalizationDto } from './dto/update-hospitalization.dto';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface HospitalizationMetadata {
  type: 'HOSPITALIZATION';
  roomNumber?: string;
  dailyRate: number;
  // Diária vinda do catálogo — leva custo/margem pro DRE na comanda do dia.
  diariaServicoId?: string;
  diariaCatalogoItemId?: string;
  diariaCusto?: number;
  diariasFaturadas?: number;
  priority: Priority;
  estimatedDischargeDate?: string;
  actualDischargeDate?: string;
  diagnosis?: string;
  vitalSigns?: Record<string, any>;
  treatments?: Array<{ id: string; description: string; date: string; cost: number }>;
}

@Injectable()
export class HospitalizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boardsService: BoardsService,
    private readonly appointmentsService: AppointmentsService,
  ) {}

  // 📅 COMANDA DO DIA (Fatia 1): junta a(s) diária(s) ainda não faturada(s) + os itens abertos da conta
  // (medicações auto + manuais, exclui Insumo) numa VENDA nova (com número) que cai no "a pagar" do caixa.
  // 1 diária por dia (controla via metadata.diariasFaturadas). Marca os itens como baixados p/ não repetir.
  async gerarComandaDia(id: string, userId: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id }, select: { id: true, tutorId: true, petId: true, date: true, notes: true } });
    if (!appt) throw new NotFoundException('Internação não encontrada');
    const meta: any = this.parseMetadata(appt.notes);
    if (!meta) throw new BadRequestException('Este atendimento não é uma internação');

    // Diárias ainda não faturadas (1 por dia corrido desde a admissão).
    const admissao = new Date(appt.date);
    const diasCorridos = Math.max(1, Math.ceil((Date.now() - admissao.getTime()) / 86400000));
    const jaFaturadas = Number(meta.diariasFaturadas || 0);
    const diariasNovas = Math.max(0, diasCorridos - jaFaturadas);
    const dailyRate = Number(meta.dailyRate) || 0;

    // Itens abertos da conta (intconta_<id>) — não baixados e que não são Insumo.
    const contaRaw = await this.prisma.listaItem.findMany({ where: { lista: `intconta_${id}` } });
    const abertos = contaRaw
      .map((li) => { try { return { li, d: JSON.parse(li.valor) }; } catch { return null; } })
      .filter((x): x is { li: any; d: any } => !!x && !x.d.baixado && x.d.categoria !== 'Insumo');

    const items: any[] = [];
    if (diariasNovas > 0 && dailyRate > 0) {
      // Diária vinda do catálogo quando configurada (leva servicoId/produto + custo → margem no DRE); senão, item livre.
      items.push({ descricao: `Diária de internação${diariasNovas > 1 ? ` (${diariasNovas} dias)` : ''}`, quantidade: diariasNovas, valorUnitario: dailyRate, valorTotal: diariasNovas * dailyRate,
        servicoId: meta.diariaServicoId || undefined, catalogoItemId: meta.diariaCatalogoItemId || undefined,
        custoUnitario: meta.diariaCusto != null ? Number(meta.diariaCusto) : undefined });
    }
    for (const x of abertos) {
      const q = Number(x.d.quantidade) || 1; const vu = Number(x.d.valorUnitario) || 0;
      items.push({ descricao: x.d.descricao || 'Item', quantidade: q, valorUnitario: vu, valorTotal: q * vu,
        servicoId: x.d.servicoId || undefined, productId: x.d.productId || undefined,
        custoUnitario: x.d.custoUnitario != null ? Number(x.d.custoUnitario) : undefined,
        fornecedorId: x.d.fornecedorId || undefined });
    }
    if (!items.length) throw new BadRequestException('Nada novo para faturar hoje (sem diária pendente nem itens abertos).');

    const value = items.reduce((s, i) => s + Number(i.valorTotal), 0);
    // Reusa o fluxo de venda (numeroVenda + validação de servicoId + itens). type='Venda' e SEM notes de
    // internação → cai no "a pagar" do caixa (a exclusão de INTERNACAO olha as notes HOSPITALIZATION).
    const venda: any = await this.appointmentsService.create({
      tutorId: appt.tutorId, petId: appt.petId || undefined, userId,
      date: new Date().toISOString(), type: 'Venda', status: 'COMPLETED', value, items,
    } as any);

    // Marca os itens como faturados (não repetem) + registra as diárias faturadas.
    for (const x of abertos) {
      await this.prisma.listaItem.update({ where: { id: x.li.id }, data: { valor: JSON.stringify({ ...x.d, baixado: true, comandaId: venda.id, faturadoEm: new Date().toISOString() }) } }).catch(() => undefined);
    }
    meta.diariasFaturadas = jaFaturadas + diariasNovas;
    (meta as any).totalFaturado = Number((meta as any).totalFaturado || 0) + value; // acumulado da internação (p/ saldo)
    await this.prisma.appointment.update({ where: { id }, data: { notes: JSON.stringify(meta) } });

    const itensResumo = items.map((i) => ({ descricao: i.descricao, total: Number(i.valorTotal) }));
    return { ok: true, vendaId: venda.id, numeroVenda: venda.numeroVenda ?? null, diariasFaturadas: diariasNovas, itens: abertos.length, total: value, totalFaturado: (meta as any).totalFaturado, itensResumo };
  }

  private parseMetadata(notes: any): HospitalizationMetadata | null {
    try {
      if (!notes) return null;
      const parsed = typeof notes === 'string' ? JSON.parse(notes) : notes;
      if (parsed?.type === 'HOSPITALIZATION') return parsed as HospitalizationMetadata;
      return null;
    } catch {
      return null;
    }
  }

  private toHospitalization(appointment: any, metadata: HospitalizationMetadata) {
    const admissionDate = new Date(appointment.date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - admissionDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const treatmentsCost =
      appointment.treatments?.reduce((acc: number, t: any) => acc + t.cost, 0) || 0;
    const totalCost = metadata.dailyRate * diffDays + treatmentsCost + (appointment.value || 0);

    return {
      id: appointment.id,
      tutor: {
        id: appointment.tutor.id,
        name: appointment.tutor.name,
        phone: appointment.tutor.contacts?.[0]?.number,
      },
      pet: {
        id: appointment.pet.id,
        name: appointment.pet.name,
        species: appointment.pet.species,
        breed: appointment.pet.breed || undefined,
        age: appointment.pet.birthDate
          ? `${Math.floor((new Date().getTime() - new Date(appointment.pet.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} anos`
          : undefined,
      },
      veterinarian: appointment.user
        ? {
            id: appointment.user.id,
            name: appointment.user.name,
          }
        : undefined,
      admissionDate: appointment.date.toISOString(),
      estimatedDischargeDate: metadata.estimatedDischargeDate,
      actualDischargeDate: metadata.actualDischargeDate,
      reason: appointment.description || '',
      diagnosis: metadata.diagnosis,
      notes: typeof appointment.notes === 'string' ? appointment.notes : undefined,
      roomNumber: metadata.roomNumber,
      dailyRate: metadata.dailyRate,
      totalCost,
      status: appointment.status,
      priority: metadata.priority,
      vitalSigns: metadata.vitalSigns,
      treatments:
        metadata.treatments ||
        appointment.treatments?.map((t: any) => ({
          id: t.id,
          description: t.description,
          date: t.createdAt.toISOString(),
          cost: t.cost,
        })) ||
        [],
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    };
  }

  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
  }) {
    const { page = 1, limit = 100, search = '', status = '', priority = '' } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' as const } },
          { notes: { contains: search, mode: 'insensitive' as const } },
          { tutor: { name: { contains: search, mode: 'insensitive' as const } } },
          { pet: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    };

    const allAppointments = await this.prisma.appointment.findMany({
      where,
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: { select: { id: true, name: true, species: true, breed: true, birthDate: true } },
        user: { select: { id: true, name: true, email: true } },
        treatments: { select: { id: true, description: true, cost: true, createdAt: true } },
      },
      orderBy: { date: 'desc' },
    });

    const hospitalAppointments = allAppointments
      .map((apt: any) => ({ apt, metadata: this.parseMetadata(apt.notes) }))
      .filter((x: any) => x.metadata && x.metadata.type === 'HOSPITALIZATION');

    const total = hospitalAppointments.length;
    const paginated = hospitalAppointments.slice(skip, skip + limit);

    let hospitalizations = paginated.map(({ apt, metadata }: { apt: any; metadata: any }) =>
      this.toHospitalization(apt, metadata!),
    );

    if (priority && priority !== 'all') {
      hospitalizations = hospitalizations.filter((h: any) => h.priority === priority);
    }

    return {
      hospitalizations,
      pagination: {
        page,
        limit,
        total: hospitalizations.length,
        pages: Math.ceil(hospitalizations.length / limit),
      },
    };
  }

  async create(dto: CreateHospitalizationDto) {
    const metadata: HospitalizationMetadata = {
      type: 'HOSPITALIZATION',
      roomNumber: dto.roomNumber,
      dailyRate: dto.dailyRate,
      diariaServicoId: (dto as any).diariaServicoId,
      diariaCatalogoItemId: (dto as any).diariaCatalogoItemId,
      diariaCusto: (dto as any).diariaCusto,
      priority: (dto.priority as any) || 'MEDIUM',
      estimatedDischargeDate: dto.estimatedDischargeDate,
      diagnosis: dto.diagnosis,
      vitalSigns: dto.vitalSigns,
      treatments: [],
    };

    const appointment = await this.prisma.appointment.create({
      data: {
        tutorId: dto.tutorId,
        petId: dto.petId,
        userId: dto.userId,
        date: new Date(),
        duration: 0,
        description: dto.reason,
        notes: JSON.stringify(metadata),
        value: dto.dailyRate,
        status: 'ADMITTED',
        paymentStatus: 'PENDING',
      },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: { select: { id: true, name: true, species: true, breed: true, birthDate: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Create card in Hospitalization board (async, don't block the response)
    const cardTitle = `${appointment.pet.name} - ${appointment.tutor.name}`;
    this.boardsService
      .createCardForAppointment(dto.userId, appointment.id, 'HOSPITALIZATION', cardTitle, 'Admissão')
      .catch((err) => console.error('Error creating hospitalization card:', err));

    // Retorna formato igual ao frontend
    return {
      id: appointment.id,
      tutor: {
        id: appointment.tutor.id,
        name: appointment.tutor.name,
        phone: appointment.tutor.contacts?.[0]?.number,
      },
      pet: {
        id: appointment.pet.id,
        name: appointment.pet.name,
        species: appointment.pet.species,
        breed: appointment.pet.breed || undefined,
        age: appointment.pet.birthDate
          ? `${Math.floor((new Date().getTime() - new Date(appointment.pet.birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365))} anos`
          : undefined,
      },
      veterinarian: appointment.user
        ? { id: appointment.user.id, name: appointment.user.name }
        : undefined,
      admissionDate: appointment.date.toISOString(),
      estimatedDischargeDate: metadata.estimatedDischargeDate,
      reason: appointment.description || '',
      diagnosis: metadata.diagnosis,
      notes: dto.notes,
      roomNumber: metadata.roomNumber,
      dailyRate: metadata.dailyRate,
      totalCost: metadata.dailyRate,
      status: appointment.status,
      priority: metadata.priority,
      vitalSigns: metadata.vitalSigns,
      treatments: [],
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    };
  }

  async getById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: { select: { id: true, name: true, species: true, breed: true, birthDate: true } },
        user: { select: { id: true, name: true, email: true } },
        treatments: { select: { id: true, description: true, cost: true, createdAt: true } },
      },
    });
    if (!appointment) throw new NotFoundException('Internação não encontrada');

    const metadata = this.parseMetadata(appointment.notes) || {
      type: 'HOSPITALIZATION',
      dailyRate: 0,
      priority: 'MEDIUM' as Priority,
    };

    return this.toHospitalization(appointment, metadata as HospitalizationMetadata);
  }

  async update(id: string, dto: UpdateHospitalizationDto) {
    const current = await this.prisma.appointment.findUnique({
      where: { id },
      include: { treatments: true },
    });
    if (!current) throw new NotFoundException('Internação não encontrada');

    let metadata: HospitalizationMetadata =
      this.parseMetadata(current.notes) ||
      ({
        type: 'HOSPITALIZATION',
        dailyRate: 0,
        priority: 'MEDIUM',
      } as HospitalizationMetadata);

    if (dto.roomNumber !== undefined) metadata.roomNumber = dto.roomNumber;
    if (dto.dailyRate !== undefined) metadata.dailyRate = dto.dailyRate;
    if (dto.priority !== undefined) metadata.priority = dto.priority as any;
    if (dto.estimatedDischargeDate !== undefined)
      metadata.estimatedDischargeDate = dto.estimatedDischargeDate;
    if (dto.actualDischargeDate !== undefined)
      metadata.actualDischargeDate = dto.actualDischargeDate;
    if (dto.diagnosis !== undefined) metadata.diagnosis = dto.diagnosis;
    if (dto.vitalSigns !== undefined) metadata.vitalSigns = dto.vitalSigns;
    // Espelha o status DENTRO do metadata (notes) — os alertas de internação leem daqui.
    // Sem isso, dar alta atualizava só a coluna e o alerta continuava disparando (bug 28/07).
    if (dto.status !== undefined) (metadata as any).status = dto.status;

    const updateData: any = {
      notes: JSON.stringify(metadata),
    };
    if (dto.reason !== undefined) updateData.description = dto.reason;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.dailyRate !== undefined) updateData.value = dto.dailyRate;

    if (dto.status === 'DISCHARGED' && !metadata.actualDischargeDate) {
      metadata.actualDischargeDate = new Date().toISOString();
      updateData.notes = JSON.stringify(metadata);
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: { select: { id: true, name: true, species: true, breed: true, birthDate: true } },
        user: { select: { id: true, name: true, email: true } },
        treatments: { select: { id: true, description: true, cost: true, createdAt: true } },
      },
    });

    // Move card in Hospitalization board based on status
    if (dto.status && dto.status !== current.status) {
      const statusToColumnMap: Record<string, string> = {
        ADMITTED: 'Admissão',
        IN_TREATMENT: 'Em Tratamento',
        OBSERVATION: 'Observação',
        DISCHARGE_SCHEDULED: 'Alta Programada',
        DISCHARGED: 'Alta',
      };

      const targetColumn = statusToColumnMap[dto.status];
      if (targetColumn) {
        this.boardsService
          .moveCardToColumn(id, targetColumn)
          .catch((err) => console.error('Error moving hospitalization card:', err));
      }
    }

    return this.toHospitalization(updated, metadata);
  }

  async remove(id: string) {
    const existing = await this.prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Internação não encontrada');
    await this.prisma.appointment.delete({ where: { id } });
    return { message: 'Internação excluída com sucesso' };
  }
}

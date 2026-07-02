import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoxDto } from './dto/create-box.dto';
import { UpdateBoxDto } from './dto/update-box.dto';
import { OcuparBoxDto } from './dto/ocupar-box.dto';

@Injectable()
export class BoxesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateBoxDto) {
    return this.prisma.box.create({ data: { ...dto } });
  }

  findAll() {
    return this.prisma.box.findMany({
      orderBy: [{ ordem: 'asc' }, { codigo: 'asc' }],
    });
  }

  async findOne(id: string) {
    const box = await this.prisma.box.findUnique({ where: { id } });
    if (!box) throw new NotFoundException('Box não encontrado');
    return box;
  }

  async update(id: string, dto: UpdateBoxDto) {
    await this.findOne(id);
    return this.prisma.box.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    await this.findOne(id);
    const ocupado = await this.prisma.boxOcupacao.findFirst({
      where: { boxId: id, ativa: true },
    });
    if (ocupado) {
      throw new BadRequestException(
        'Box ocupado — dê alta / libere o paciente antes de excluir.',
      );
    }
    await this.prisma.box.delete({ where: { id } });
    return { message: 'Box excluído com sucesso' };
  }

  /**
   * Monta o Mapa de Internação: boxes ativos + ocupação ativa + dados da
   * internação (appointment). A internação continua sendo um Appointment
   * com notes JSON (type: HOSPITALIZATION) — daqui só lemos.
   */
  async mapa() {
    const boxes = await this.prisma.box.findMany({
      where: { ativa: true },
      orderBy: [{ ordem: 'asc' }, { codigo: 'asc' }],
    });

    const ocupacoes = await this.prisma.boxOcupacao.findMany({
      where: { ativa: true },
    });
    const ocupacaoPorBox = new Map(ocupacoes.map((o) => [o.boxId, o]));

    const apptIds = [...new Set(ocupacoes.map((o) => o.appointmentId))];
    const appts = apptIds.length
      ? await this.prisma.appointment.findMany({
          where: { id: { in: apptIds } },
          include: {
            pet: {
              select: { id: true, name: true, species: true, breed: true, weight: true },
            },
            tutor: {
              select: {
                id: true,
                name: true,
                contacts: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { number: true },
                },
              },
            },
            user: { select: { id: true, name: true } },
          },
        })
      : [];
    const apptById = new Map(appts.map((a) => [a.id, a]));

    const cards = boxes.map((box) => {
      const oc = ocupacaoPorBox.get(box.id);
      if (!oc) {
        return { box, ocupado: false, internacao: null };
      }
      const apt: any = apptById.get(oc.appointmentId) || null;
      let meta: any = null;
      try {
        meta = apt?.notes ? JSON.parse(apt.notes) : null;
      } catch {
        meta = null;
      }
      return {
        box,
        ocupado: true,
        ocupacaoId: oc.id,
        entradaAt: oc.entradaAt,
        internacao: apt
          ? {
              id: apt.id,
              status: apt.status,
              date: apt.date,
              motivo: apt.description || meta?.diagnosis || '',
              pet: apt.pet,
              tutor: {
                id: apt.tutor?.id,
                name: apt.tutor?.name,
                phone: apt.tutor?.contacts?.[0]?.number || null,
              },
              vet: apt.user ? { id: apt.user.id, name: apt.user.name } : null,
              priority: meta?.priority || null,
              estadoClinico: meta?.vitalSigns?.estadoClinico || null,
              vitalSigns: meta?.vitalSigns || null,
              estimatedDischargeDate: meta?.estimatedDischargeDate || null,
            }
          : null,
      };
    });

    const total = boxes.length;
    const ocupados = cards.filter((c) => c.ocupado).length;

    return {
      boxes: cards,
      kpis: { total, ocupados, livres: total - ocupados },
    };
  }

  /** Interna um paciente no box (encerra ocupações anteriores conflitantes). */
  async ocupar(boxId: string, dto: OcuparBoxDto) {
    await this.findOne(boxId);
    // encerra ocupação ativa anterior DESTE box (se houver)
    await this.prisma.boxOcupacao.updateMany({
      where: { boxId, ativa: true },
      data: { ativa: false, saidaAt: new Date() },
    });
    // encerra ocupação ativa DESTA internação em qualquer outro box
    await this.prisma.boxOcupacao.updateMany({
      where: { appointmentId: dto.appointmentId, ativa: true },
      data: { ativa: false, saidaAt: new Date() },
    });
    return this.prisma.boxOcupacao.create({
      data: { boxId, appointmentId: dto.appointmentId, ativa: true },
    });
  }

  /** Libera o box (dá alta da ocupação ativa). */
  async liberar(boxId: string) {
    await this.findOne(boxId);
    const res = await this.prisma.boxOcupacao.updateMany({
      where: { boxId, ativa: true },
      data: { ativa: false, saidaAt: new Date() },
    });
    return { message: 'Box liberado', encerradas: res.count };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { AplicarProtocoloDto, RegistrarDoseDto } from './dto/aplicar.dto';

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

// Catalogo observado no SimplesVet (conta Emporio do Pet) - tipo Vacinas
const SEED: any[] = [
  { nome: 'V10', variante: 'Filhote (3 x 30 dias)', tipo: 'VACINA', doses: 3, intervaloDias: 30, reforcoMeses: 12, indicacaoIdade: 'A partir de 45 dias', idadeMinDias: 45 },
  { nome: 'V10', variante: 'Anual', tipo: 'VACINA', doses: 1, reforcoMeses: 12, indicacaoIdade: 'Adulto (reforco anual)' },
  { nome: 'V10', variante: 'V10', tipo: 'VACINA', doses: 1 },
  { nome: 'Antirrabica', variante: 'Anual', tipo: 'VACINA', doses: 1, reforcoMeses: 12, indicacaoIdade: 'A partir de 12 semanas', idadeMinDias: 84 },
  { nome: 'Giardia', variante: 'Anual', tipo: 'VACINA', doses: 1, reforcoMeses: 12 },
  { nome: 'Giardia', variante: 'Filhote (2 x 30 dias)', tipo: 'VACINA', doses: 2, intervaloDias: 30, reforcoMeses: 12 },
  { nome: 'Leishmania', variante: 'Anual', tipo: 'VACINA', doses: 1, reforcoMeses: 12 },
  { nome: 'Leishmania', variante: 'Inicial (3 x 21 dias)', tipo: 'VACINA', doses: 3, intervaloDias: 21, reforcoMeses: 12 },
  { nome: 'Tosse dos canis', variante: 'Anual', tipo: 'VACINA', doses: 1, reforcoMeses: 12 },
  { nome: 'Tosse dos canis', variante: 'Filhote (2 x 30 dias)', tipo: 'VACINA', doses: 2, intervaloDias: 30, reforcoMeses: 12 },
  { nome: 'Cytopoint', variante: 'Cytopoint', tipo: 'VACINA', doses: 1 },
  { nome: 'Librela', variante: 'Librela', tipo: 'VACINA', doses: 1 },
  { nome: 'Pro heart', variante: 'Pro Heart', tipo: 'VACINA', doses: 1, reforcoMeses: 12 },
];

@Injectable()
export class ProtocolosService {
  constructor(private readonly prisma: PrismaService) {}

  // ----- Catalogo -----
  listTemplates(tipo?: string) {
    return this.prisma.protocoloTemplate.findMany({
      where: { ...(tipo ? { tipo } : {}) },
      orderBy: [{ tipo: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  createTemplate(dto: CreateTemplateDto) {
    return this.prisma.protocoloTemplate.create({
      data: {
        nome: dto.nome,
        tipo: dto.tipo,
        variante: dto.variante ?? null,
        doses: dto.doses ?? 1,
        intervaloDias: dto.intervaloDias ?? null,
        reforcoMeses: dto.reforcoMeses ?? null,
        indicacaoIdade: dto.indicacaoIdade ?? null,
        idadeMinDias: dto.idadeMinDias ?? null,
        ativo: dto.ativo ?? true,
        ordem: dto.ordem ?? 0,
      },
    });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    const t = await this.prisma.protocoloTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template nao encontrado');
    return this.prisma.protocoloTemplate.update({ where: { id }, data: { ...dto } });
  }

  async removeTemplate(id: string) {
    const t = await this.prisma.protocoloTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template nao encontrado');
    await this.prisma.protocoloTemplate.delete({ where: { id } });
    return { ok: true };
  }

  async seedTemplates() {
    let criados = 0;
    for (let i = 0; i < SEED.length; i++) {
      const s = SEED[i];
      const existe = await this.prisma.protocoloTemplate.findFirst({
        where: { nome: s.nome, variante: s.variante ?? null, tipo: s.tipo },
      });
      if (!existe) {
        await this.prisma.protocoloTemplate.create({ data: { ...s, ordem: i, ativo: true } });
        criados++;
      }
    }
    const total = await this.prisma.protocoloTemplate.count();
    return { criados, total };
  }

  // ----- Aplicados -----
  findByPet(petId: string) {
    return this.prisma.protocoloAplicado.findMany({
      where: { petId },
      include: {
        doses: { orderBy: { numero: 'asc' } },
        template: true,
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { dataInicial: 'desc' },
    });
  }

  async findOne(id: string) {
    const p = await this.prisma.protocoloAplicado.findUnique({
      where: { id },
      include: { doses: { orderBy: { numero: 'asc' } }, template: true },
    });
    if (!p) throw new NotFoundException('Protocolo nao encontrado');
    return p;
  }

  async aplicar(dto: AplicarProtocoloDto, userId?: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id: dto.petId },
      select: { id: true, tutorId: true },
    });
    if (!pet) throw new NotFoundException('Pet nao encontrado');

    let template: any = null;
    if (dto.templateId) {
      template = await this.prisma.protocoloTemplate.findUnique({ where: { id: dto.templateId } });
      if (!template) throw new NotFoundException('Template nao encontrado');
    }

    const tipo = dto.tipo ?? template?.tipo;
    if (!tipo) throw new BadRequestException('Tipo do protocolo e obrigatorio');
    const nomeProtocolo =
      dto.nomeProtocolo ??
      (template ? [template.nome, template.variante].filter(Boolean).join(' - ') : null);
    if (!nomeProtocolo) throw new BadRequestException('Nome do protocolo e obrigatorio');

    const dataInicial = new Date(dto.dataInicial);
    const nDoses = template?.doses ?? 1;
    const intervalo = template?.intervaloDias ?? 0;
    const doses = Array.from({ length: nDoses }).map((_, k) => ({
      numero: k + 1,
      dataPrevista: addDays(dataInicial, k * intervalo),
      status: 'PENDENTE',
    }));

    return this.prisma.protocoloAplicado.create({
      data: {
        petId: dto.petId,
        tutorId: dto.tutorId ?? pet.tutorId ?? null,
        tipo,
        templateId: template?.id ?? null,
        nomeProtocolo,
        dataInicial,
        observacao: dto.observacao ?? null,
        appointmentId: dto.appointmentId ?? null,
        createdById: userId ?? null,
        doses: { create: doses },
      },
      include: { doses: { orderBy: { numero: 'asc' } }, template: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.protocoloAplicado.delete({ where: { id } });
    return { ok: true };
  }

  // ----- Doses -----
  async registrarDose(doseId: string, dto: RegistrarDoseDto) {
    const dose = await this.prisma.protocoloDose.findUnique({ where: { id: doseId } });
    if (!dose) throw new NotFoundException('Dose nao encontrada');
    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.lote !== undefined) data.lote = dto.lote;
    if (dto.fabricante !== undefined) data.fabricante = dto.fabricante;
    if (dto.aplicadaPorId !== undefined) data.aplicadaPorId = dto.aplicadaPorId;
    if (dto.observacao !== undefined) data.observacao = dto.observacao;
    if (dto.dataAplicada !== undefined) data.dataAplicada = dto.dataAplicada ? new Date(dto.dataAplicada) : null;
    // se marcou aplicada e nao informou data, usa agora
    if (dto.status === 'APLICADA' && data.dataAplicada === undefined && !dose.dataAplicada) {
      data.dataAplicada = new Date();
    }
    const updated = await this.prisma.protocoloDose.update({ where: { id: doseId }, data });

    // se todas as doses do protocolo ficaram aplicadas/canceladas, conclui o protocolo
    const restantes = await this.prisma.protocoloDose.count({
      where: { protocoloId: dose.protocoloId, status: 'PENDENTE' },
    });
    if (restantes === 0) {
      await this.prisma.protocoloAplicado.update({
        where: { id: dose.protocoloId },
        data: { status: 'CONCLUIDO' },
      });
    }
    return updated;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { proximoCodigo, isColisaoCodigo } from '../../common/codigo';

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  /** Histórico clínico (importado do SimplesVet) do pet, mais recente primeiro.
   *  Payload LEVE: não devolve o texto completo (HTML pesado) — só um resumo curto.
   *  O texto integral é buscado sob demanda (getHistoricoItem) ao abrir o detalhe. */
  async getHistorico(petId: string) {
    const rows = await this.prisma.historicoClinico.findMany({
      where: { petId },
      orderBy: { data: 'desc' },
      take: 500,
      select: { id: true, tipo: true, data: true, titulo: true, resumo: true, autor: true, valorNum: true, origem: true, texto: true, arquivoKey: true },
    });
    const limpar = (s?: string | null) => (s || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    return rows.map((r) => ({
      id: r.id, tipo: r.tipo, data: r.data, titulo: r.titulo, autor: r.autor, valorNum: r.valorNum, origem: r.origem,
      temArquivo: !!r.arquivoKey,
      resumo: (r.resumo && r.resumo.trim()) || limpar(r.texto).slice(0, 180) || null,
    }));
  }

  /** Detalhe completo de um registro do histórico (texto integral). */
  async getHistoricoItem(id: string) {
    return this.prisma.historicoClinico.findUnique({ where: { id } });
  }

  /** Baixa o arquivo (PDF/imagem) de um registro do histórico direto do object storage (Tigris/S3),
   *  autenticado por SigV4. Retorna os bytes p/ o app servir ao usuário logado (arquivo fica privado). */
  async getArquivo(histId: string): Promise<{ buffer: Buffer; contentType: string; nome: string } | null> {
    const h = await this.prisma.historicoClinico.findUnique({ where: { id: histId }, select: { arquivoKey: true, arquivoNome: true } });
    if (!h?.arquivoKey) return null;
    const key = h.arquivoKey;
    const endpoint = process.env.S3_ENDPOINT || '';
    const bucket = process.env.S3_BUCKET || '';
    const region = process.env.S3_REGION || 'auto';
    const ak = process.env.S3_ACCESS_KEY_ID || '';
    const sk = process.env.S3_SECRET_ACCESS_KEY || '';
    if (!endpoint || !bucket || !ak || !sk) return null;
    const crypto = await import('crypto');
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateShort = date.substring(0, 8);
    const emptyHash = crypto.createHash('sha256').update('').digest('hex');
    const host = new URL(endpoint).host;
    const canonicalHeaders = [`host:${host}`, `x-amz-content-sha256:${emptyHash}`, `x-amz-date:${date}`].join('\n');
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = ['GET', `/${bucket}/${key}`, '', canonicalHeaders, '', signedHeaders, emptyHash].join('\n');
    const credentialScope = `${dateShort}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', date, credentialScope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const kDate = crypto.createHmac('sha256', `AWS4${sk}`).update(dateShort).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const signingKey = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const res = await fetch(`${endpoint}/${bucket}/${key}`, { headers: { 'x-amz-content-sha256': emptyHash, 'x-amz-date': date, Authorization: authorization } });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    return { buffer, contentType, nome: h.arquivoNome || 'arquivo' };
  }

  async create(createPetDto: CreatePetDto) {
    // birthDate pode vir só como data ("2019-03-20") — o Prisma exige data-HORA e estoura 500.
    // Converte pra Date (meia-noite) pra não quebrar (ex.: cadastro pelo link público).
    const dados: any = { ...createPetDto };
    if (dados.birthDate) { const d = new Date(dados.birthDate); dados.birthDate = isNaN(d.getTime()) ? undefined : d; }
    let pet: any;
    for (let tentativa = 0; ; tentativa++) {
      try {
        pet = await this.prisma.pet.create({
          data: { ...dados, codigo: await proximoCodigo(this.prisma, 'pet') },
          include: {
            tutor: true,
          },
        });
        break;
      } catch (e) {
        if (isColisaoCodigo(e) && tentativa < 4) continue;
        throw e;
      }
    }

    // Emit pet created event (find userId from tutor's appointments or skip)
    try {
      this.eventsService.emitPetCreated('system', {
        petId: pet.id,
        name: pet.name,
        species: pet.species || undefined,
        tutorId: pet.tutorId,
        tutorName: (pet as any).tutor?.name,
      });
    } catch {}

    return pet;
  }

  async findAll(params?: {
    tutorId?: string;
    search?: string;
    species?: string;
    status?: string;
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
  }) {
    const { tutorId, search, species, status, page = 1, limit = 10, skip, take } = params || {};

    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip = Number.isFinite(skip as any)
      ? (skip as number)
      : Math.max(0, (page - 1) * resolvedTake);

    const where: any = {};
    if (tutorId) where.tutorId = tutorId;
    if (species) where.species = species;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { breed: { contains: search, mode: 'insensitive' as const } },
        { microchip: { contains: search, mode: 'insensitive' as const } },
        { tutor: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [pets, total] = await Promise.all([
      this.prisma.pet.findMany({
        where,
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              cpf: true,
              contacts: { where: { isPrimary: true }, take: 1 },
            },
          },
          appointments: {
            orderBy: { date: 'desc' as const },
            take: 1,
            select: { id: true, date: true, status: true },
          },
          _count: { select: { appointments: true, treatments: true } },
        },
        orderBy: { createdAt: 'desc' as const },
        skip: resolvedSkip,
        take: resolvedTake,
      }),
      this.prisma.pet.count({ where }),
    ]);

    return {
      pets,
      pagination: {
        page,
        limit: resolvedTake,
        total,
        pages: Math.ceil(total / resolvedTake),
      },
    };
  }

  /** Lista LEVE de todos os pets em ordem alfabetica (para a aba Pets / impressao / Excel). */
  async listaSimples() {
    return this.prisma.pet.findMany({
      select: {
        id: true, name: true, codigo: true, species: true, breed: true, status: true,
        tutor: { select: { id: true, name: true, codigo: true, contacts: { where: { isPrimary: true }, take: 1, select: { number: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        tutor: {
          include: {
            contacts: true,
          },
        },
        appointments: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        treatments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException('Pet não encontrado');
    }

    return pet;
  }

  async update(id: string, updatePetDto: UpdatePetDto) {
    await this.findById(id);

    const dados: any = { ...updatePetDto };
    if (dados.birthDate) { const d = new Date(dados.birthDate); dados.birthDate = isNaN(d.getTime()) ? undefined : d; }
    return this.prisma.pet.update({
      where: { id },
      data: dados,
      include: {
        tutor: true,
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.pet.delete({
      where: { id },
    });
  }

  /** Transfere o pet para outro cliente (usado na mesclagem de clientes duplicados). */
  async transferir(id: string, tutorId: string) {
    await this.findById(id);
    if (!tutorId) throw new NotFoundException('Cliente destino obrigatório');
    const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId }, select: { id: true } });
    if (!tutor) throw new NotFoundException('Cliente destino não encontrado');
    return this.prisma.pet.update({
      where: { id },
      data: { tutorId },
      include: { tutor: true },
    });
  }

  async profileStats(petId: string) {
    const pet = await this.prisma.pet.findUnique({ where: { id: petId }, include: { tutor: true } });
    if (!pet) throw new NotFoundException('Pet não encontrado');

    const now = new Date();
    const [appointments, todayCount, futuras] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { petId },
        select: { id: true, date: true, value: true, status: true, paymentStatus: true, description: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.appointment.count({ where: { petId, status: { not: 'CANCELLED' } } }),
      this.prisma.appointment.findMany({
        where: { petId, date: { gte: now }, status: { not: 'CANCELLED' } },
        orderBy: { date: 'asc' }, take: 1,
        select: { id: true, date: true, description: true },
      }),
    ]);
    const realizadas = appointments.filter(a => a.status === 'COMPLETED' || a.status === 'DONE' || a.date < now);
    const ultima = realizadas[0];
    const proxima = futuras[0];
    const diasDesdeUltima = ultima ? Math.floor((now.getTime() - new Date(ultima.date).getTime()) / 86400000) : null;
    const diasAteProxima = proxima ? Math.floor((new Date(proxima.date).getTime() - now.getTime()) / 86400000) : null;
    const valorTotal = realizadas.reduce((s, a) => s + (a.value || 0), 0);
    const valorPago = realizadas.filter(a => a.paymentStatus === 'PAID').reduce((s, a) => s + (a.value || 0), 0);

    // Frequência mensal últimos 12 meses
    const freq: { mes: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const total = realizadas.filter(a => {
        const ad = new Date(a.date);
        return ad >= d && ad < next;
      }).length;
      freq.push({ mes: d.toLocaleDateString('pt-BR', { month: 'short' }), total });
    }

    let idadeAnos: number | null = null;
    let idadeMeses: number | null = null;
    if (pet.birthDate) {
      const ms = now.getTime() - new Date(pet.birthDate).getTime();
      const totalMeses = Math.floor(ms / (1000 * 60 * 60 * 24 * 30));
      idadeAnos = Math.floor(totalMeses / 12);
      idadeMeses = totalMeses % 12;
    }

    // Timeline simplificada (últimos 10 atendimentos)
    const timeline = realizadas.slice(0, 10).map(a => ({
      id: a.id, data: a.date, descricao: a.description, valor: a.value, paymentStatus: a.paymentStatus,
    }));

    return {
      totalConsultas: todayCount,
      realizadas: realizadas.length,
      futurasAgendadas: futuras.length > 0 ? 1 : 0,
      diasDesdeUltima,
      ultima: ultima ? { id: ultima.id, data: ultima.date, descricao: ultima.description } : null,
      proxima: proxima ? { id: proxima.id, data: proxima.date, descricao: proxima.description } : null,
      diasAteProxima,
      valorTotal: +valorTotal.toFixed(2),
      valorPago: +valorPago.toFixed(2),
      ticketMedio: realizadas.length > 0 ? +(valorTotal / realizadas.length).toFixed(2) : 0,
      idadeAnos, idadeMeses,
      pesoAtual: pet.weight,
      frequenciaMensal: freq,
      timeline,
    };
  }
}
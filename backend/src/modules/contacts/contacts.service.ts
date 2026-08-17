import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params?: {
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
    search?: string;
    tutorId?: string;
  }) {
    const { page = 1, limit = 10, skip, take, search, tutorId } = params || {};
    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip = Number.isFinite(skip as any)
      ? (skip as number)
      : Math.max(0, (page - 1) * resolvedTake);

    const where: any = {};
    if (tutorId) where.tutorId = tutorId;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' as const } },
        { observations: { contains: search, mode: 'insensitive' as const } },
        { tutor: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: {
          tutor: { select: { id: true, name: true, cpf: true } },
        },
        orderBy: [{ isPrimary: 'desc' as const }, { createdAt: 'desc' as const }],
        skip: resolvedSkip,
        take: resolvedTake,
      }),
      this.prisma.contact.count({ where }),
    ]);

    return {
      contacts,
      pagination: {
        page,
        limit: resolvedTake,
        total,
        pages: Math.ceil(total / resolvedTake),
      },
    };
  }

  async findById(id: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            cpf: true,
            contacts: {
              where: { id: { not: id } },
              select: { id: true, type: true, number: true, isPrimary: true },
            },
          },
        },
      },
    });

    if (!contact) throw new NotFoundException('Contato não encontrado');
    return contact;
  }

  /**
   * REGRA "um número = um cliente" (13/08): recusa cadastrar/editar um telefone que já
   * pertence a OUTRO cliente. Compara pelos ÚLTIMOS 8 dígitos — a MESMA chave que o inbox
   * usa pra juntar a conversa (whatsapp.service.acharOuCriarConversa). Se dois clientes
   * dividem o número, a mensagem automática de um cai na ficha do outro (caso Minnie→Ana
   * Lúcia, 13/08). Bloquear a duplicata na origem é o que evita o problema se repetir.
   */
  private async assertNumeroLivre(numero: string, tutorIdAtual: string) {
    const tail = String(numero || '').replace(/\D/g, '').slice(-8);
    if (tail.length < 8) return; // número curto/incompleto: não trava (ex.: fixo em digitação)
    const conflito = await this.prisma.contact.findFirst({
      where: { number: { endsWith: tail }, tutorId: { not: tutorIdAtual } },
      include: { tutor: { select: { name: true } } },
    });
    if (conflito) {
      throw new BadRequestException(
        `Esse número já é do cliente "${conflito.tutor?.name || 'outro cliente'}". Um número pertence a um único cliente — remova de lá primeiro ou use outro número.`,
      );
    }
  }

  async create(dto: CreateContactDto) {
    const tutor = await this.prisma.tutor.findUnique({ where: { id: dto.tutorId } });
    if (!tutor) throw new NotFoundException('Tutor não encontrado');

    const existingContact = await this.prisma.contact.findFirst({
      where: { tutorId: dto.tutorId, number: dto.number },
    });
    if (existingContact) {
      throw new BadRequestException('Já existe um contato com este número para este tutor');
    }

    // Trava "um número = um cliente": não deixa duplicar em silêncio.
    await this.assertNumeroLivre(dto.number, dto.tutorId);

    if (dto.isPrimary) {
      await this.prisma.contact.updateMany({
        where: { tutorId: dto.tutorId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await this.prisma.contact.create({
      data: {
        type: dto.type as any,
        number: dto.number,
        isWhatsApp: dto.isWhatsApp ?? false,
        observations: dto.observations,
        isPrimary: dto.isPrimary ?? false,
        tutorId: dto.tutorId,
      },
      include: { tutor: { select: { id: true, name: true, cpf: true } } },
    });

    // Cliente com 2+ telefones: ao adicionar um número, RELIGA as conversas de WhatsApp
    // desse número (que ainda não têm cliente) a este cliente — assim caem na mesma ficha.
    // Só religa se o número for EXCLUSIVO deste cliente (evita telefone de família/duplicado).
    try {
      const tail = (dto.number || '').replace(/\D/g, '').slice(-8);
      if (tail.length >= 8) {
        const donos = await this.prisma.contact.findMany({ where: { number: { endsWith: tail } }, select: { tutorId: true } });
        const tutores = Array.from(new Set(donos.map((d) => d.tutorId)));
        if (tutores.length === 1) {
          await this.prisma.whatsAppConversation.updateMany({
            where: { contactPhone: { endsWith: tail }, tutorId: null },
            data: { tutorId: dto.tutorId },
          });
        }
      }
    } catch { /* religação é best-effort */ }

    return created;
  }

  async update(id: string, dto: UpdateContactDto) {
    const existing = await this.prisma.contact.findUnique({
      where: { id },
      include: { tutor: true },
    });
    if (!existing) throw new NotFoundException('Contato não encontrado');

    // Se marcou como primário, desmarca outros
    if (dto.isPrimary === true) {
      await this.prisma.contact.updateMany({
        where: { tutorId: existing.tutorId, id: { not: id }, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Se mudou tutor, validar
    if (dto.tutorId && dto.tutorId !== existing.tutorId) {
      const tutor = await this.prisma.tutor.findUnique({ where: { id: dto.tutorId } });
      if (!tutor) throw new NotFoundException('Novo tutor não encontrado');
    }

    // Trava "um número = um cliente": se mudou o número (ou o dono), recusa se já for de outro.
    const numeroFinal = dto.number ?? existing.number;
    const donoFinal = dto.tutorId ?? existing.tutorId;
    if ((dto.number !== undefined && dto.number !== existing.number) || (dto.tutorId && dto.tutorId !== existing.tutorId)) {
      await this.assertNumeroLivre(numeroFinal, donoFinal);
    }

    const data: any = {};
    if (dto.type !== undefined) data.type = dto.type as any;
    if (dto.number !== undefined) data.number = dto.number;
    if (dto.isWhatsApp !== undefined) data.isWhatsApp = dto.isWhatsApp;
    if (dto.observations !== undefined) data.observations = dto.observations;
    if (dto.isPrimary !== undefined) data.isPrimary = dto.isPrimary;
    if (dto.tutorId !== undefined) data.tutorId = dto.tutorId;

    const atualizado = await this.prisma.contact.update({
      where: { id },
      data,
      include: { tutor: { select: { id: true, name: true, cpf: true } } },
    });
    // Mudou o número (ou o dono) → a conversa antiga daquele número não pode ficar no cliente errado.
    if ((dto.number !== undefined && dto.number !== existing.number) || (dto.tutorId && dto.tutorId !== existing.tutorId)) {
      await this.reavaliarConversasDoNumero(existing.number, existing.tutorId).catch(() => undefined);
    }
    return atualizado;
  }

  /**
   * Quando um número é TIRADO/CORRIGIDO de um cliente, a conversa antiga daquele número não pode
   * continuar apontando pro cliente errado (caso Fátima→Maria Tereza, 15/08). Reavalia: se o número
   * agora é de UM único cliente, religa a conversa pra ele; se não é de ninguém (ou é ambíguo),
   * DESVINCULA (tutorId null) — melhor sem dono do que no dono errado. Só mexe nas conversas que
   * estavam no tutor de origem; se o número ainda é dele (outro contato), não toca.
   */
  private async reavaliarConversasDoNumero(numero: string, tutorIdOrigem: string) {
    const tail = String(numero || '').replace(/\D/g, '').slice(-8);
    if (tail.length < 8 || !tutorIdOrigem) return;
    const convs = await this.prisma.whatsAppConversation.findMany({
      where: { contactPhone: { endsWith: tail }, tutorId: tutorIdOrigem },
      select: { id: true },
    });
    if (!convs.length) return;
    const donos = await this.prisma.contact.findMany({ where: { number: { endsWith: tail } }, select: { tutorId: true } });
    const tutores = Array.from(new Set(donos.map((d) => d.tutorId)));
    if (tutores.includes(tutorIdOrigem)) return; // ainda é dele (outro contato) → não mexe
    const novoTutorId = tutores.length === 1 ? tutores[0] : null; // 1 dono → religa; 0/ambíguo → desvincula
    await this.prisma.whatsAppConversation
      .updateMany({ where: { id: { in: convs.map((c) => c.id) } }, data: { tutorId: novoTutorId } })
      .catch(() => undefined);
  }

  async remove(id: string) {
    const existing = await this.prisma.contact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contato não encontrado');

    await this.prisma.contact.delete({ where: { id } });
    // Número saiu do cliente → reavalia a conversa daquele número (não deixar grudada no antigo dono).
    await this.reavaliarConversasDoNumero(existing.number, existing.tutorId).catch(() => undefined);
    return { message: 'Contato excluído com sucesso' };
  }
}

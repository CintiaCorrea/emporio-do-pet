/**
 * Dieta / Alimentação — módulo CLÍNICO (do CRM).
 *
 * Quem escreve aqui é a equipe, na ficha do pet. O Portal do Tutor só lê
 * (`PortalDietaService`). A dieta é prescrição: **nada é apagado**. Prescrever
 * uma nova encerra a anterior, que fica no histórico com quem prescreveu e
 * quando.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ItemDieta {
  nome: string;
  detalhe?: string | null;
}

export interface DietaPayload {
  itens?: unknown;
  variacoes?: unknown;
  evitar?: unknown;
  observacao?: string | null;
  prescritorNome?: string | null;
  prescritorUserId?: string | null;
}

/** Aceita ["texto"] e também [{nome, detalhe}] achatado, sem quebrar. */
function lerTextos(v: unknown): string[] {
  if (!Array.isArray(v)) {
    const s = String(v ?? '').trim();
    return s ? s.split('\n').map((x) => x.trim()).filter(Boolean) : [];
  }
  return v
    .map((x) => (typeof x === 'string' ? x : String((x as any)?.nome ?? '')))
    .map((x) => x.trim())
    .filter(Boolean);
}

function lerItens(v: unknown): ItemDieta[] {
  if (!Array.isArray(v)) return [];
  const itens: ItemDieta[] = [];
  for (const bruto of v) {
    if (typeof bruto === 'string') {
      const nome = bruto.trim();
      if (nome) itens.push({ nome, detalhe: null });
      continue;
    }
    const nome = String((bruto as any)?.nome ?? '').trim();
    if (!nome) continue;
    const detalhe = String((bruto as any)?.detalhe ?? '').trim();
    itens.push({ nome, detalhe: detalhe || null });
  }
  return itens;
}

@Injectable()
export class DietasService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dieta ativa + histórico do pet (é o que a ficha mostra). */
  async doPet(petId: string) {
    const [ativa, historico] = await Promise.all([
      this.prisma.dieta.findFirst({
        where: { petId, ativa: true },
        orderBy: { data: 'desc' },
      }),
      this.prisma.dieta.findMany({
        where: { petId, ativa: false },
        orderBy: { data: 'desc' },
        take: 10,
      }),
    ]);
    return { ativa, historico };
  }

  /**
   * Prescreve uma dieta nova. Encerra a anterior — sem apagar: ela vira
   * histórico, porque prescrição é documento.
   */
  async prescrever(petId: string, corpo: DietaPayload) {
    const pet = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { id: true, tutorId: true },
    });
    if (!pet) throw new BadRequestException('Pet não encontrado');

    const itens = lerItens(corpo?.itens);
    const variacoes = lerTextos(corpo?.variacoes);
    const evitar = lerTextos(corpo?.evitar);

    if (!itens.length) {
      throw new BadRequestException('Escreva ao menos um item da dieta (o que o pet come).');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.dieta.updateMany({ where: { petId, ativa: true }, data: { ativa: false } });
      return tx.dieta.create({
        data: {
          petId,
          tutorId: pet.tutorId,
          prescritorNome: corpo?.prescritorNome?.trim() || null,
          prescritorUserId: corpo?.prescritorUserId || null,
          itens: itens as any,
          variacoes: variacoes as any,
          evitar: evitar as any,
          observacao: corpo?.observacao?.trim() || null,
          ativa: true,
        },
      });
    });
  }

  /** Corrige a dieta ativa (erro de digitação, ajuste de gramagem). */
  async ajustar(id: string, corpo: DietaPayload) {
    const dieta = await this.prisma.dieta.findUnique({ where: { id } });
    if (!dieta) throw new BadRequestException('Dieta não encontrada');
    if (!dieta.ativa) throw new BadRequestException('Essa dieta já foi encerrada.');

    const dados: Record<string, unknown> = {};
    if ('itens' in corpo) {
      const itens = lerItens(corpo.itens);
      if (!itens.length) throw new BadRequestException('A dieta precisa de ao menos um item.');
      dados.itens = itens;
    }
    if ('variacoes' in corpo) dados.variacoes = lerTextos(corpo.variacoes);
    if ('evitar' in corpo) dados.evitar = lerTextos(corpo.evitar);
    if ('observacao' in corpo) dados.observacao = corpo.observacao?.trim() || null;

    return this.prisma.dieta.update({ where: { id }, data: dados });
  }

  /** Encerra a dieta sem colocar outra no lugar (pet voltou à alimentação livre). */
  async encerrar(id: string) {
    return this.prisma.dieta.update({ where: { id }, data: { ativa: false } });
  }
}

/**
 * Codigo sequencial curto (estilo SimplesVet) para Tutor e Pet.
 * Estrategia: max(codigo) + 1. Em criacao, use com retry contra colisao (P2002).
 */
import { PrismaService } from '../modules/prisma/prisma.service';

export async function proximoCodigo(prisma: PrismaService, entidade: 'tutor' | 'pet'): Promise<number> {
  const agg =
    entidade === 'tutor'
      ? await prisma.tutor.aggregate({ _max: { codigo: true } })
      : await prisma.pet.aggregate({ _max: { codigo: true } });
  return (agg._max.codigo || 0) + 1;
}

/** True se o erro for colisao de unique no campo codigo (para retry). */
export function isColisaoCodigo(e: any): boolean {
  return e?.code === 'P2002' && (e?.meta?.target?.includes?.('codigo') ?? false);
}

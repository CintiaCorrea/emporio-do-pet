/**
 * Casamento canonico de CLIENTE (Tutor) para evitar duplicidade.
 *
 * Prioridade pedida pela equipe:
 *   1) ULTIMOS 8 DIGITOS do telefone (em Contact.number) — ignora o 9o digito
 *   2) CPF
 *   3) E-mail (apoio)
 * Havendo mais de um candidato, retorna o de updatedAt MAIS RECENTE.
 *
 * Usado na conversao de lead->cliente, na importacao/migracao e em qualquer
 * ponto que precise reconhecer um cliente ja existente.
 */
import { PrismaService } from '../modules/prisma/prisma.service';
import { last8, onlyDigits, samePhone } from './phone';

/**
 * Casa um telefone a um Tutor **sem decidir no escuro**: só devolve o cliente
 * quando o número pertence a UM ÚNICO cliente. Se o mesmo número está em 2+
 * cadastros (duplicado / telefone de família), retorna `ambiguous` — o chamador
 * NÃO deve vincular automaticamente (vira revisão manual). Usado para ligar
 * conversas do WhatsApp ao cliente com segurança.
 */
export type PhoneMatch =
  | { status: 'none' }
  | { status: 'unique'; tutorId: string; contactId: string }
  | { status: 'ambiguous'; tutorIds: string[] };

export async function findTutorByPhoneUnique(
  prisma: PrismaService,
  phone?: string | null,
): Promise<PhoneMatch> {
  const tail = last8(phone);
  if (tail.length < 8) return { status: 'none' };
  const contatos = await prisma.contact.findMany({
    where: { number: { endsWith: tail } },
    select: { id: true, tutorId: true, number: true, isPrimary: true },
    orderBy: { isPrimary: 'desc' },
  });
  // Confirma que é o MESMO dono (samePhone trata o 9 do celular e o DDI).
  const casam = contatos.filter((c) => samePhone(c.number, phone));
  const tutorIds = Array.from(new Set(casam.map((c) => c.tutorId)));
  if (tutorIds.length === 0) return { status: 'none' };
  if (tutorIds.length > 1) return { status: 'ambiguous', tutorIds };
  const c = casam.find((x) => x.tutorId === tutorIds[0])!;
  return { status: 'unique', tutorId: tutorIds[0], contactId: c.id };
}

export interface TutorIdentity {
  phone?: string | null;
  cpf?: string | null;
  email?: string | null;
}

export interface TutorMatch {
  id: string;
  name: string;
  updatedAt: Date;
  matchedBy: 'telefone' | 'cpf' | 'email';
}

/** Variacoes comuns de CPF para casar tanto "123.456.789-00" quanto "12345678900". */
function cpfVariants(raw?: string | null): string[] {
  const d = onlyDigits(raw);
  if (d.length !== 11) return raw ? [raw] : [];
  const fmt = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return [d, fmt, raw as string].filter((v, i, a) => v && a.indexOf(v) === i);
}

export async function findExistingTutor(
  prisma: PrismaService,
  id: TutorIdentity,
): Promise<TutorMatch | null> {
  const sel = { id: true, name: true, updatedAt: true } as const;

  // 1) Telefone (ultimos 8 digitos) — fonte da verdade do casamento.
  const tail = last8(id.phone);
  if (tail.length >= 8) {
    const contato = await prisma.contact.findFirst({
      where: { number: { endsWith: tail } },
      orderBy: { tutor: { updatedAt: 'desc' } },
      select: { tutor: { select: sel } },
    });
    if (contato?.tutor) return { ...contato.tutor, matchedBy: 'telefone' };
  }

  // 2) CPF
  const cpfs = cpfVariants(id.cpf);
  if (cpfs.length) {
    const t = await prisma.tutor.findFirst({
      where: { cpf: { in: cpfs } },
      orderBy: { updatedAt: 'desc' },
      select: sel,
    });
    if (t) return { ...t, matchedBy: 'cpf' };
  }

  // 3) E-mail (apoio)
  if (id.email) {
    const t = await prisma.tutor.findFirst({
      where: { email: id.email },
      orderBy: { updatedAt: 'desc' },
      select: sel,
    });
    if (t) return { ...t, matchedBy: 'email' };
  }

  return null;
}

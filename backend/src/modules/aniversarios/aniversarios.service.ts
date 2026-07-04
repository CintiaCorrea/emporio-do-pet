import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type TutorRow = { id: string; name: string; birthDate: Date | string | null };
type PetRow = {
  id: string;
  name: string;
  birthDate: Date | string | null;
  tutorId: string | null;
  species: string | null;
  tutorNome: string | null;
};

export interface AniversarioItem {
  tipo: 'CLIENTE' | 'PET';
  id: string;
  nome: string;
  dia: number | null;
  birthDate: Date | string | null;
  idade: number | null;
  tutorId: string | null;
  tutorNome: string | null;
  especie?: string | null;
  telefone: string | null;
}

@Injectable()
export class AniversariosService {
  constructor(private readonly prisma: PrismaService) {}

  /** dia do mês (1..31) do birthDate, normalizando para Date */
  private diaDoMes(birthDate: Date | string | null): number | null {
    if (!birthDate) return null;
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) return null;
    return d.getDate();
  }

  /** idade em anos completos até hoje */
  private calcularIdade(birthDate: Date | string | null): number | null {
    if (!birthDate) return null;
    const nascimento = new Date(birthDate);
    if (isNaN(nascimento.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    // ajusta se o aniversário ainda não passou no ano corrente
    const aniversarioAindaNaoPassou =
      hoje.getMonth() < nascimento.getMonth() ||
      (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate());
    if (aniversarioAindaNaoPassou) idade -= 1;
    return idade >= 0 ? idade : null;
  }

  async porMes(month?: number) {
    // valida o mês (1..12); default = mês atual do servidor
    const now = new Date();
    let mes = Number(month);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      mes = now.getMonth() + 1;
    }

    // 1. Tutors aniversariantes do mês (parâmetro seguro via Prisma.sql)
    const tutores = await this.prisma.$queryRaw<TutorRow[]>(
      Prisma.sql`SELECT id, name, "birthDate" FROM tutors WHERE "birthDate" IS NOT NULL AND EXTRACT(MONTH FROM "birthDate") = ${mes}`,
    );

    // 2. Pets aniversariantes do mês
    const pets = await this.prisma.$queryRaw<PetRow[]>(
      Prisma.sql`SELECT p.id, p.name, p."birthDate", p."tutorId", p.species, t.name AS "tutorNome" FROM pets p LEFT JOIN tutors t ON t.id = p."tutorId" WHERE p."birthDate" IS NOT NULL AND EXTRACT(MONTH FROM p."birthDate") = ${mes}`,
    );

    // 3. Telefones: coleta tutorIds (tutores + tutores dos pets) e busca em Contact
    const tutorIds = new Set<string>();
    tutores.forEach((t) => tutorIds.add(t.id));
    pets.forEach((p) => {
      if (p.tutorId) tutorIds.add(p.tutorId);
    });

    const telefonePorTutor = new Map<string, string>();
    if (tutorIds.size > 0) {
      const contatos = await this.prisma.contact.findMany({
        where: { tutorId: { in: Array.from(tutorIds) } },
        select: { tutorId: true, number: true, isPrimary: true },
      });
      // prefere isPrimary; senão o primeiro encontrado
      for (const c of contatos) {
        if (!c.number) continue;
        const atual = telefonePorTutor.get(c.tutorId);
        if (atual === undefined) {
          telefonePorTutor.set(c.tutorId, c.number);
        }
        if (c.isPrimary) {
          telefonePorTutor.set(c.tutorId, c.number);
        }
      }
    }

    // 4. Lista combinada
    const itens: AniversarioItem[] = [];

    for (const t of tutores) {
      itens.push({
        tipo: 'CLIENTE',
        id: t.id,
        nome: t.name,
        dia: this.diaDoMes(t.birthDate),
        birthDate: t.birthDate,
        idade: this.calcularIdade(t.birthDate),
        tutorId: t.id,
        tutorNome: t.name,
        telefone: telefonePorTutor.get(t.id) ?? null,
      });
    }

    for (const p of pets) {
      itens.push({
        tipo: 'PET',
        id: p.id,
        nome: p.name,
        dia: this.diaDoMes(p.birthDate),
        birthDate: p.birthDate,
        idade: this.calcularIdade(p.birthDate),
        tutorId: p.tutorId,
        tutorNome: p.tutorNome,
        especie: p.species,
        telefone: p.tutorId ? telefonePorTutor.get(p.tutorId) ?? null : null,
      });
    }

    // ordena por dia asc (nulos por último), depois por nome
    itens.sort((a, b) => {
      const da = a.dia ?? 999;
      const db = b.dia ?? 999;
      if (da !== db) return da - db;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });

    const clientes = itens.filter((i) => i.tipo === 'CLIENTE').length;
    const petsCount = itens.filter((i) => i.tipo === 'PET').length;

    return {
      month: mes,
      total: itens.length,
      clientes,
      pets: petsCount,
      itens,
    };
  }
}

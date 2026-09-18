import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { diaDoMes, calcularIdade } from './aniversarios.regras';

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

  async porMes(month?: number) {
    // valida o mês (1..12); default = mês atual do servidor
    const now = new Date();
    let mes = Number(month);
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      mes = now.getMonth() + 1;
    }

    // QUEM ENTRA NESTA LISTA (Cintia, 18/09/2026: "enviar somente para clientes e pets VIVOS,
    // não enviar para clientes arquivados e ex-cliente").
    //
    // Cada linha daqui tem um botão 📲 WhatsApp ao lado — então esta lista não é um relatório,
    // é uma lista de disparo. Antes ela trazia TODO mundo com data no mês: cliente arquivado,
    // ex-cliente, fornecedor aparecendo como "👤 Cliente" e pet com óbito. Parabenizar o tutor
    // pelo aniversário de um pet que morreu é o pior erro que esta tela pode cometer.
    //
    // FORA: ARCHIVED (arquivado) e CHURNED (ex-cliente). DENTRO: ACTIVE e também SUSPENDED
    // ("a recuperar") — esse ainda é cliente, e o aniversário é justamente a desculpa de voltar
    // a falar com ele.
    const CLIENTE_DE_VERDADE = Prisma.sql`t.status NOT IN ('ARCHIVED', 'CHURNED') AND (t.classificacao IS NULL OR t.classificacao = 'Cliente')`;

    // 1. Tutores aniversariantes do mês (parâmetro seguro via Prisma.sql)
    const tutores = await this.prisma.$queryRaw<TutorRow[]>(
      Prisma.sql`SELECT t.id, t.name, t."birthDate" FROM tutors t WHERE t."birthDate" IS NOT NULL AND EXTRACT(MONTH FROM t."birthDate") = ${mes} AND ${CLIENTE_DE_VERDADE}`,
    );

    // 2. Pets aniversariantes do mês. Só pet VIVO (status ACTIVE deixa de fora óbito,
    //    transferido, inativo e arquivado) E só de cliente que ainda é cliente — senão o
    //    arquivado voltaria pela porta do bicho.
    const pets = await this.prisma.$queryRaw<PetRow[]>(
      Prisma.sql`SELECT p.id, p.name, p."birthDate", p."tutorId", p.species, t.name AS "tutorNome" FROM pets p JOIN tutors t ON t.id = p."tutorId" WHERE p."birthDate" IS NOT NULL AND EXTRACT(MONTH FROM p."birthDate") = ${mes} AND p.status = 'ACTIVE' AND ${CLIENTE_DE_VERDADE}`,
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
        dia: diaDoMes(t.birthDate),
        birthDate: t.birthDate,
        idade: calcularIdade(t.birthDate),
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
        dia: diaDoMes(p.birthDate),
        birthDate: p.birthDate,
        idade: calcularIdade(p.birthDate),
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

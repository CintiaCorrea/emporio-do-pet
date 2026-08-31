/**
 * Tela Inicio do portal.
 *
 * Monta tudo que a home mostra: os pets do tutor e, se algum estiver internado,
 * o alerta rosa. Passa sempre pelo cofre (PortalEscopoService) — nenhuma consulta
 * daqui aceita petId vindo do navegador.
 *
 * Como o CRM sabe que um pet esta internado (formato legado, conferido em 28/07):
 * a internacao e um `Appointment` com um JSON no campo `notes` contendo
 * `type: 'HOSPITALIZATION'`. Esta ativa enquanto nao houver `actualDischargeDate`
 * e o atendimento nao estiver concluido/cancelado. Mesma regra do modulo
 * `hospitalizations` do CRM — se ela mudar la, muda aqui.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortalEscopoService, PetDoPortal } from './portal-escopo.service';
import { STATUS_NAO_CONFIRMAVEL } from '../appointments/appointment-confirmacao.regras';

interface MetadadosInternacao {
  type?: string;
  actualDischargeDate?: string;
  estimatedDischargeDate?: string;
  diagnosis?: string;
  roomNumber?: string;
}

export interface InternacaoResumo {
  petId: string;
  petNome: string;
  desde: Date;
  previsaoAlta: string | null;
}

@Injectable()
export class PortalInicioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escopo: PortalEscopoService,
  ) {}

  private lerMetadados(notes: unknown): MetadadosInternacao | null {
    if (!notes) return null;
    try {
      const bruto = typeof notes === 'string' ? JSON.parse(notes) : notes;
      if (bruto && typeof bruto === 'object' && bruto.type === 'HOSPITALIZATION') {
        return bruto as MetadadosInternacao;
      }
    } catch {
      // `notes` costuma ser texto livre — nao e erro, so nao e internacao.
    }
    return null;
  }

  /** Internacoes em aberto entre os pets informados. */
  async internacoesAtivas(pets: PetDoPortal[]): Promise<InternacaoResumo[]> {
    if (!pets.length) return [];
    const porId = new Map(pets.map((p) => [p.id, p]));

    // Janela de 120 dias: internacao aberta ha mais que isso e dado esquecido,
    // nao pet no box. Evita varrer o historico inteiro do pet.
    const desde = new Date(Date.now() - 120 * 24 * 60 * 60_000);

    const candidatos = await this.prisma.appointment.findMany({
      where: {
        petId: { in: [...porId.keys()] },
        date: { gte: desde },
        status: { notIn: ['COMPLETED', 'CANCELED'] },
      },
      select: { id: true, petId: true, date: true, notes: true },
      orderBy: { date: 'desc' },
      take: 50,
    });

    const ativas: InternacaoResumo[] = [];
    for (const c of candidatos) {
      const meta = this.lerMetadados(c.notes);
      if (!meta || meta.actualDischargeDate) continue;
      const pet = c.petId ? porId.get(c.petId) : undefined;
      if (!pet) continue;
      if (ativas.some((a) => a.petId === pet.id)) continue; // uma por pet, a mais recente
      ativas.push({
        petId: pet.id,
        petNome: pet.nome,
        desde: c.date,
        previsaoAlta: meta.estimatedDischargeDate || null,
      });
    }
    return ativas;
  }

  /** TODOS os próximos agendamentos do tutor (marcados pela clínica OU pelo portal) — pra
   *  aparecerem na home. Exclui cancelados/remarcados/concluídos e as internações (mostradas à parte). */
  async proximosAgendamentos(tutorId: string) {
    const appts = await this.prisma.appointment.findMany({
      where: { tutorId, date: { gte: new Date() }, status: { notIn: STATUS_NAO_CONFIRMAVEL } },
      orderBy: { date: 'asc' },
      take: 12,
      select: {
        id: true, date: true, type: true, notes: true, confirmacaoStatus: true,
        pet: { select: { name: true } },
        user: { select: { name: true, profissional: { select: { nomeExibicao: true, tipo: true } } } },
      },
    });
    return appts
      .filter((a) => !String(a.notes || '').includes('HOSPITALIZATION'))
      .map((a) => {
        const prof = a.user?.profissional;
        const profissional = prof && prof.tipo === 'VETERINARIO' ? (prof.nomeExibicao || a.user?.name || '') : '';
        return {
          id: a.id,
          inicio: a.date,
          petNome: a.pet?.name || '',
          tipo: a.type || 'Atendimento',
          profissional,
          confirmado: a.confirmacaoStatus === 'CONFIRMADO',
        };
      });
  }

  async home(tutorId: string) {
    const [tutor, pets, proximosAgendamentos] = await Promise.all([
      this.escopo.dadosDoTutor(tutorId),
      this.escopo.petsDoTutor(tutorId),
      this.proximosAgendamentos(tutorId),
    ]);
    const internacoes = await this.internacoesAtivas(pets);
    return { tutor, pets, internacoes, proximosAgendamentos };
  }
}

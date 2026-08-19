import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PacotesService {
  constructor(private readonly prisma: PrismaService) {}

  // 📦 Painel "Pacotes vendidos": lê a FONTE ÚNICA (listas petpac_<petId>, a mesma da
  // ficha/inbox/agenda/caixa) — inclui TODOS os pacotes vendidos/lançados, com sessões já
  // baixadas pela agenda. Situação: consumido (100%), vencido (passou o prazo com
  // sessões sobrando) ou ativo. Prazo configurável (lista pacote_validade_dias, def. 365).
  // (A tabela Pacote/PacoteSessao — legada, vazia — foi removida na unificação: tudo é petpac_.)
  async listVendidos() {
    let validadeDias = 365;
    try {
      const cfg = await this.prisma.listaItem.findFirst({ where: { lista: 'pacote_validade_dias' } });
      if (cfg?.valor) { const n = parseInt(String(cfg.valor).replace(/\D/g, ''), 10); if (n > 0) validadeDias = n; }
    } catch { /* usa default */ }

    const itens = await this.prisma.listaItem.findMany({ where: { lista: { startsWith: 'petpac_' } } });
    const petIds = new Set<string>();
    const rows = itens.map((it) => {
      let d: any = {}; try { d = JSON.parse(it.valor); } catch { d = {}; }
      const petId = (it.lista || '').replace('petpac_', '');
      if (petId) petIds.add(petId);
      return { entryId: it.id, petId, serviceId: d.serviceId || null, nome: d.nome || 'Pacote', total: Number(d.total) || 0, used: Number(d.used) || 0, createdAt: d.createdAt || null, origem: d.origem || null };
    });

    const pets = petIds.size ? await this.prisma.pet.findMany({ where: { id: { in: Array.from(petIds) } }, select: { id: true, name: true, species: true, tutorId: true } }) : [];
    const petMap = new Map(pets.map((p) => [p.id, p]));
    const tutorIds = Array.from(new Set(pets.map((p) => p.tutorId).filter(Boolean))) as string[];
    const tutors = tutorIds.length ? await this.prisma.tutor.findMany({ where: { id: { in: tutorIds } }, select: { id: true, name: true } }) : [];
    const tutorMap = new Map(tutors.map((t) => [t.id, t]));

    const now = Date.now();
    const pacotes = rows.map((r) => {
      const pet: any = petMap.get(r.petId) || null;
      const tutor: any = pet?.tutorId ? tutorMap.get(pet.tutorId) || null : null;
      const restam = Math.max(0, r.total - r.used);
      const consumido = r.total > 0 && r.used >= r.total;
      let validade: string | null = null;
      let vencido = false;
      if (r.createdAt) {
        const dt = new Date(r.createdAt); dt.setDate(dt.getDate() + validadeDias);
        validade = dt.toISOString();
        if (!consumido && restam > 0 && dt.getTime() < now) vencido = true;
      }
      const situacao = consumido ? 'CONSUMIDO' : (vencido ? 'VENCIDO' : 'ATIVO');
      return {
        id: r.entryId, petId: r.petId, pet: pet?.name || 'Pet', petSpecies: pet?.species || null,
        tutorId: pet?.tutorId || null, cliente: tutor?.name || 'Cliente',
        nome: r.nome, total: r.total, used: r.used, restam, createdAt: r.createdAt,
        validade: consumido ? null : validade, situacao,
      };
    });
    pacotes.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const resumo = {
      total: pacotes.length,
      ativos: pacotes.filter((x) => x.situacao === 'ATIVO').length,
      consumidos: pacotes.filter((x) => x.situacao === 'CONSUMIDO').length,
      vencidos: pacotes.filter((x) => x.situacao === 'VENCIDO').length,
      validadeDias,
    };
    return { resumo, pacotes };
  }
}

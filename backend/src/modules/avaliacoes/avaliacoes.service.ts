import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateAvaliacaoNPSDto, UpdateAvaliacaoNPSDto, CreateAvaliacaoGoogleDto, UpdateAvaliacaoGoogleDto } from './dto/avaliacao.dto';

@Injectable()
export class AvaliacoesService implements OnModuleInit {
  private readonly logger = new Logger(AvaliacoesService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // Migração única: leva os NPS antigos (guardados em lista_itens npsava_) pro modelo canônico.
  async onModuleInit() {
    try { await this.migrarNpsDasListas(); }
    catch (e: any) { this.logger.warn(`migrarNpsDasListas: ${e?.message || e}`); }
  }

  async migrarNpsDasListas() {
    const antigos = await this.prisma.listaItem.findMany({ where: { lista: { startsWith: 'npsava_' }, ativo: true } });
    if (!antigos.length) return { migrados: 0 };
    let migrados = 0;
    for (const it of antigos) {
      try {
        const p = JSON.parse(it.valor);
        const score = parseInt(String(p.score));
        if (isNaN(score)) { continue; }
        await this.prisma.avaliacaoNPS.create({
          data: {
            tutorId: p.tutorId || null,
            categoriaAlvo: 'CLINICA_GERAL' as any,
            score,
            classificacao: this.classificarNPS(score) as any,
            comentario: p.comentario || null,
            canalColeta: this.mapCanal(p.canal),
            dataColeta: p.data ? new Date(p.data) : new Date(it.createdAt),
            tutorNome: p.tutorNome || null,
            petNome: p.petNome || null,
            profissionalNome: p.profissional || null,
            categoriaLivre: p.categoria || null,
            observacoes: 'Migrado da tela antiga de NPS',
          },
        });
        // aposenta o antigo (mantém como backup, some da lista)
        await this.prisma.listaItem.update({ where: { id: it.id }, data: { ativo: false } });
        migrados++;
      } catch { /* item malformado — ignora */ }
    }
    if (migrados) this.logger.log(`NPS migrados das listas antigas: ${migrados}`);
    return { migrados };
  }

  private mapCanal(c?: string): any {
    const k = (c || '').toLowerCase().trim();
    if (k.includes('whats')) return 'WHATSAPP';
    if (k.includes('tel')) return 'TELEFONE';
    if (k.includes('mail')) return 'EMAIL';
    if (k.includes('form')) return 'FORMULARIO';
    return 'PRESENCIAL';
  }

  private classificarNPS(score: number): 'PROMOTOR' | 'NEUTRO' | 'DETRATOR' {
    if (score >= 9) return 'PROMOTOR';
    if (score >= 7) return 'NEUTRO';
    return 'DETRATOR';
  }

  // NPS → AÇÃO: sempre que um DETRATOR é registrado (qualquer canal), avisa a equipe + abre tarefa no "Hoje".
  private async alertarDetrator(aval: { tutorId?: string | null; score: number; tutorNome?: string | null; canalColeta?: string }) {
    try {
      const tutorId = aval.tutorId || null;
      let nome = aval.tutorNome || 'Cliente';
      let phoneDigits = '';
      if (tutorId) {
        const tutor = await this.prisma.tutor.findUnique({ where: { id: tutorId }, include: { contacts: true } });
        if (tutor) {
          nome = tutor.name || nome;
          const c = tutor.contacts.find((x: any) => x.isPrimary) || tutor.contacts[0];
          phoneDigits = c?.number ? String(c.number).replace(/\D/g, '') : '';
        }
      }
      const link = phoneDigits ? `/dashboard/inbox-nativo?phone=${phoneDigits}` : (tutorId ? `/dashboard/erp/tutores/${tutorId}` : '/dashboard/marketing/nps');
      const equipe = await this.prisma.user.findMany({ where: { role: { in: ['ADMIN', 'RECEPTIONIST'] as any }, isBlocked: false }, select: { id: true } });
      for (const u of equipe) {
        await this.notifications.create({
          userId: u.id,
          type: NotificationType.WARNING,
          title: '⚠️ Cliente insatisfeito (NPS)',
          message: `${nome} deu nota ${aval.score}. Ligar para entender e resolver.`,
          link,
          metadata: { kind: 'nps_detrator', tutorId },
        }).catch(() => undefined);
      }
      if (tutorId) {
        await this.prisma.interacao.create({
          data: { tutorId, tipo: 'LIGACAO', canal: 'Ligação', texto: `NPS ${aval.score} (insatisfeito). Ligar para entender e resolver.`, proximaAcao: 'Ligar para cliente insatisfeito', proximoFollowupAt: new Date() },
        }).catch(() => undefined);
        await this.prisma.tutor.update({ where: { id: tutorId }, data: { proximoFollowupAt: new Date() } }).catch(() => undefined);
      }
      this.logger.warn(`NPS detrator (nota ${aval.score}): ${equipe.length} avisados`);
    } catch (e: any) {
      this.logger.warn(`alertarDetrator: ${e?.message || e}`);
    }
  }

  // ===== NPS =====
  async listNPS() {
    return this.prisma.avaliacaoNPS.findMany({ orderBy: { dataColeta: 'desc' }, take: 500 });
  }
  async createNPS(dto: CreateAvaliacaoNPSDto) {
    const classificacao = (dto.classificacao || this.classificarNPS(dto.score)) as any;
    const criado = await this.prisma.avaliacaoNPS.create({ data: { ...dto, classificacao } });
    if (classificacao === 'DETRATOR') {
      // fire-and-forget — nunca derruba o registro do NPS
      this.alertarDetrator({ tutorId: criado.tutorId, score: criado.score, tutorNome: criado.tutorNome, canalColeta: criado.canalColeta }).catch(() => undefined);
    }
    return criado;
  }
  async updateNPS(id: string, dto: UpdateAvaliacaoNPSDto) {
    const exists = await this.prisma.avaliacaoNPS.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('NPS não encontrado');
    const data: any = { ...dto };
    if (dto.score !== undefined) data.classificacao = this.classificarNPS(dto.score);
    return this.prisma.avaliacaoNPS.update({ where: { id }, data });
  }
  async removeNPS(id: string) {
    const exists = await this.prisma.avaliacaoNPS.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('NPS não encontrado');
    return this.prisma.avaliacaoNPS.delete({ where: { id } });
  }

  // ===== Google =====
  async listGoogle() {
    return this.prisma.avaliacaoGoogle.findMany({ orderBy: { dataPergunta: 'desc' }, take: 500 });
  }
  async createGoogle(dto: CreateAvaliacaoGoogleDto) {
    return this.prisma.avaliacaoGoogle.create({ data: dto });
  }
  async updateGoogle(id: string, dto: UpdateAvaliacaoGoogleDto) {
    const exists = await this.prisma.avaliacaoGoogle.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Avaliação Google não encontrada');
    return this.prisma.avaliacaoGoogle.update({ where: { id }, data: dto });
  }
  async removeGoogle(id: string) {
    const exists = await this.prisma.avaliacaoGoogle.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Avaliação Google não encontrada');
    return this.prisma.avaliacaoGoogle.delete({ where: { id } });
  }

  // ===== Stats =====
  async stats() {
    const todas = await this.prisma.avaliacaoNPS.findMany({ select: { score: true, classificacao: true } });
    const total = todas.length;
    const promotores = todas.filter(a => a.classificacao === 'PROMOTOR').length;
    const detratores = todas.filter(a => a.classificacao === 'DETRATOR').length;
    const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : 0;
    const mediaScore = total > 0 ? +(todas.reduce((s, a) => s + a.score, 0) / total).toFixed(1) : 0;
    const google = await this.prisma.avaliacaoGoogle.findMany({ select: { status: true, notaDada: true, votoConfirmado: true } });
    const votos = google.filter(g => g.votoConfirmado).length;
    const mediaGoogle = votos > 0 ? +(google.filter(g => g.votoConfirmado).reduce((s, g) => s + (g.notaDada || 0), 0) / votos).toFixed(1) : 0;
    return { total, promotores, neutros: total - promotores - detratores, detratores, nps, mediaScore, googleVotos: votos, googleMedia: mediaGoogle };
  }

  // ===== Import NPS =====
  async importBatchNPS(rows: any[], upsert = true) {
    let criados = 0, ignorados = 0;
    const CAT_MAP: Record<string, string> = { 'vet': 'VET', 'veterinário': 'VET', 'recepcao': 'RECEPCAO', 'recepção': 'RECEPCAO', 'clinica': 'CLINICA_GERAL', 'clinica_geral': 'CLINICA_GERAL', 'clínica geral': 'CLINICA_GERAL' };
    const CAN_MAP: Record<string, string> = { 'presencial': 'PRESENCIAL', 'whatsapp': 'WHATSAPP', 'email': 'EMAIL', 'telefone': 'TELEFONE', 'formulario': 'FORMULARIO', 'formulário': 'FORMULARIO' };
    for (const r of rows) {
      if (r.score == null) { ignorados++; continue; }
      const score = parseInt(String(r.score));
      if (isNaN(score)) { ignorados++; continue; }
      const data: any = {
        tutorId: r.tutorId || r.tutor_id || null,
        petId: r.petId || r.pet_id || null,
        atendimentoId: r.atendimentoId || r.atendimento_id || null,
        profissionalId: r.profissionalId || r.profissional_id || null,
        categoriaAlvo: (CAT_MAP[(r.categoriaAlvo || r.categoria_alvo || 'clinica_geral').toString().toLowerCase().trim()] || 'CLINICA_GERAL') as any,
        score,
        classificacao: this.classificarNPS(score) as any,
        comentario: r.comentario || null,
        canalColeta: (CAN_MAP[(r.canalColeta || r.canal_coleta || 'presencial').toString().toLowerCase().trim()] || 'PRESENCIAL') as any,
        dataColeta: r.dataColeta ? new Date(r.dataColeta) : (r.data_coleta ? new Date(r.data_coleta) : new Date()),
        coletadoPor: r.coletadoPor || r.coletado_por || null,
        observacoes: r.observacoes || null,
      };
      await this.prisma.avaliacaoNPS.create({ data });
      criados++;
    }
    return { criados, ignorados };
  }
}

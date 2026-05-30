import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAvaliacaoNPSDto, UpdateAvaliacaoNPSDto, CreateAvaliacaoGoogleDto, UpdateAvaliacaoGoogleDto } from './dto/avaliacao.dto';

@Injectable()
export class AvaliacoesService {
  constructor(private readonly prisma: PrismaService) {}

  private classificarNPS(score: number): 'PROMOTOR' | 'NEUTRO' | 'DETRATOR' {
    if (score >= 9) return 'PROMOTOR';
    if (score >= 7) return 'NEUTRO';
    return 'DETRATOR';
  }

  // ===== NPS =====
  async listNPS() {
    return this.prisma.avaliacaoNPS.findMany({ orderBy: { dataColeta: 'desc' }, take: 500 });
  }
  async createNPS(dto: CreateAvaliacaoNPSDto) {
    const classificacao = (dto.classificacao || this.classificarNPS(dto.score)) as any;
    return this.prisma.avaliacaoNPS.create({ data: { ...dto, classificacao } });
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

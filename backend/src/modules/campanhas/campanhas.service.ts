import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampanhaDto, UpdateCampanhaDto } from './dto/campanha.dto';

@Injectable()
export class CampanhasService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status?: string) {
    return this.prisma.campanha.findMany({
      where: status ? { status: status as any } : {},
      orderBy: [{ status: 'asc' }, { inicio: 'desc' }, { nome: 'asc' }],
    });
  }
  async create(dto: CreateCampanhaDto) {
    return this.prisma.campanha.create({ data: this.normalize(dto) });
  }
  async update(id: string, dto: UpdateCampanhaDto) {
    const exists = await this.prisma.campanha.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Campanha não encontrada');
    return this.prisma.campanha.update({ where: { id }, data: this.normalize(dto) });
  }
  async remove(id: string) {
    const exists = await this.prisma.campanha.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Campanha não encontrada');
    return this.prisma.campanha.delete({ where: { id } });
  }
  private normalize(dto: any) {
    const out: any = { ...dto };
    if (out.inicio && typeof out.inicio === 'string') out.inicio = new Date(out.inicio);
    if (out.fim && typeof out.fim === 'string') out.fim = new Date(out.fim);
    return out;
  }

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    const PLAT_MAP: Record<string, string> = {
      'google_ads': 'GOOGLE_ADS', 'google ads': 'GOOGLE_ADS', 'google': 'GOOGLE_ADS',
      'meta_ads_facebook': 'META_ADS_FACEBOOK', 'facebook': 'META_ADS_FACEBOOK', 'meta facebook': 'META_ADS_FACEBOOK',
      'meta_ads_instagram': 'META_ADS_INSTAGRAM', 'instagram': 'META_ADS_INSTAGRAM', 'meta instagram': 'META_ADS_INSTAGRAM',
      'tiktok': 'TIKTOK_ADS', 'tiktok_ads': 'TIKTOK_ADS',
      'outras': 'OUTRAS', 'outro': 'OUTRAS',
    };
    const TIPO_MAP: Record<string, string> = {
      'conversao': 'CONVERSAO', 'conversão': 'CONVERSAO',
      'trafego': 'TRAFEGO', 'tráfego': 'TRAFEGO',
      'engajamento': 'ENGAJAMENTO',
      'mensagem_whatsapp': 'MENSAGEM_WHATSAPP', 'whatsapp': 'MENSAGEM_WHATSAPP',
      'reconhecimento': 'RECONHECIMENTO',
    };
    const ST_MAP: Record<string, string> = {
      'ativa': 'ATIVA', 'pausada': 'PAUSADA', 'encerrada': 'ENCERRADA',
      'em_teste': 'EM_TESTE', 'em teste': 'EM_TESTE',
      'planejada': 'PLANEJADA',
    };
    for (const r of rows) {
      if (!r.nome) { ignorados++; continue; }
      const data: any = {
        nome: r.nome,
        plataforma: (PLAT_MAP[(r.plataforma || '').toString().toLowerCase().trim()] || 'OUTRAS') as any,
        tipo: (TIPO_MAP[(r.tipo || '').toString().toLowerCase().trim()] || 'CONVERSAO') as any,
        tagOrigem: r.tagOrigem || r.tag_origem || null,
        status: (ST_MAP[(r.status || '').toString().toLowerCase().trim()] || 'ATIVA') as any,
        investimento: r.investimento ?? null,
        observacoes: r.observacoes || null,
      };
      if (r.inicio) data.inicio = new Date(r.inicio);
      if (r.fim) data.fim = new Date(r.fim);
      const existente = await this.prisma.campanha.findFirst({ where: { nome: { equals: r.nome, mode: 'insensitive' } } });
      if (existente) {
        if (!upsert) { ignorados++; continue; }
        await this.prisma.campanha.update({ where: { id: existente.id }, data });
        atualizados++;
      } else {
        await this.prisma.campanha.create({ data });
        criados++;
      }
    }
    return { criados, atualizados, ignorados };
  }
}

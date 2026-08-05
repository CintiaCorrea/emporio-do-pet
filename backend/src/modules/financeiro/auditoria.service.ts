import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ImportarTaxasDto,
  ImportarVendasDto,
  AtribuirVendaDto,
  TaxaContratadaDto,
  UpdateTaxaDto,
  ClonarVigenciaDto,
} from './dto/auditoria.dto';

type Status = 'CONFORME' | 'DIVERGENTE' | 'A_CONFERIR';
const TOLERANCIA_BPS = 5; // 0,05 p.p.

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------- tabela de taxas contratadas ---------- */

  async importarTaxas(dto: ImportarTaxasDto) {
    if (dto.substituirVigencia) {
      // substitui só as taxas da MESMA vigência e MESMA adquirente (não apaga a outra maquineta)
      const chaves = [...new Set(dto.taxas.map((t) => `${t.vigenciaInicio}|${t.adquirente ?? 'InfinityPay'}`))];
      for (const ch of chaves) {
        const [v, adq] = ch.split('|');
        await this.prisma.taxaContratada.deleteMany({
          where: { vigenciaInicio: new Date(v), adquirente: adq },
        });
      }
    }
    await this.prisma.taxaContratada.createMany({
      data: dto.taxas.map((t) => ({
        adquirente: t.adquirente ?? 'InfinityPay',
        bandeira: t.bandeira,
        plano: t.plano,
        forma: t.forma,
        parcelas: t.parcelas,
        aliquotaBps: t.aliquotaBps,
        vigenciaInicio: new Date(t.vigenciaInicio),
        observacao: t.observacao ?? null,
      })),
    });
    return { inseridas: dto.taxas.length };
  }

  listarTaxas() {
    return this.prisma.taxaContratada.findMany({
      orderBy: [{ adquirente: 'asc' }, { vigenciaInicio: 'desc' }, { bandeira: 'asc' }, { forma: 'asc' }, { parcelas: 'asc' }],
    });
  }

  async vigencias(adquirente?: string) {
    const rows = await this.prisma.taxaContratada.findMany({
      where: adquirente ? { adquirente } : undefined,
      distinct: ['vigenciaInicio'],
      select: { vigenciaInicio: true },
      orderBy: { vigenciaInicio: 'desc' },
    });
    return rows.map((r) => r.vigenciaInicio);
  }

  criarTaxa(dto: TaxaContratadaDto) {
    return this.prisma.taxaContratada.create({
      data: { ...dto, vigenciaInicio: new Date(dto.vigenciaInicio) },
    });
  }

  async atualizarTaxa(id: string, dto: UpdateTaxaDto) {
    const t = await this.prisma.taxaContratada.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Taxa não encontrada');
    const data: any = { ...dto };
    if (dto.vigenciaInicio) data.vigenciaInicio = new Date(dto.vigenciaInicio);
    return this.prisma.taxaContratada.update({ where: { id }, data });
  }

  async removerTaxa(id: string) {
    await this.prisma.taxaContratada.delete({ where: { id } }).catch(() => null);
    return { message: 'Taxa removida' };
  }

  /** Clona todas as linhas de uma vigência para uma nova data (para renegociação). */
  async clonarVigencia(dto: ClonarVigenciaDto) {
    const de = new Date(dto.de);
    const para = new Date(dto.para);
    const escopo = dto.adquirente ? { adquirente: dto.adquirente } : {};
    const origem = await this.prisma.taxaContratada.findMany({ where: { vigenciaInicio: de, ...escopo } });
    if (origem.length === 0) throw new NotFoundException('Vigência de origem sem linhas');
    // evita duplicar se a nova vigência já existe (na mesma adquirente)
    const jaExiste = await this.prisma.taxaContratada.count({ where: { vigenciaInicio: para, ...escopo } });
    if (jaExiste > 0) throw new BadRequestException('Já existe uma vigência nessa data.');
    await this.prisma.taxaContratada.createMany({
      data: origem.map((t) => ({
        adquirente: t.adquirente, bandeira: t.bandeira, plano: t.plano, forma: t.forma, parcelas: t.parcelas,
        aliquotaBps: t.aliquotaBps, vigenciaInicio: para, observacao: t.observacao,
      })),
    });
    return { clonadas: origem.length };
  }

  /** Alíquota contratada vigente na data (bps) ou null se não houver na tabela. */
  private async aliquotaEsperadaBps(v: {
    adquirente?: string | null;
    bandeira: string;
    plano: string;
    forma: string;
    parcelas: number;
    data: Date;
  }): Promise<number | null> {
    const t = await this.prisma.taxaContratada.findFirst({
      where: {
        ...(v.adquirente ? { adquirente: v.adquirente } : {}),
        bandeira: v.bandeira,
        plano: v.plano,
        forma: v.forma,
        parcelas: v.parcelas,
        vigenciaInicio: { lte: v.data },
      },
      orderBy: { vigenciaInicio: 'desc' },
    });
    return t ? t.aliquotaBps : null;
  }

  /* ---------- vendas ---------- */

  async importarVendas(dto: ImportarVendasDto) {
    let criadas = 0;
    let ignoradas = 0;
    for (const v of dto.vendas) {
      const taxaCentavos = v.taxaCentavos ?? Math.max(0, v.brutoCentavos - v.liquidoCentavos);
      const taxaBps =
        v.taxaBps ?? (v.brutoCentavos > 0 ? Math.round((taxaCentavos / v.brutoCentavos) * 10000) : 0);
      // forma derivada quando não veio: taxa 0 e bruto=líquido → Pix; senão null (a conferir)
      let forma = v.forma ?? null;
      let parcelas = v.parcelas ?? null;
      if (!forma && taxaCentavos === 0 && v.brutoCentavos === v.liquidoCentavos) {
        forma = 'Pix';
        parcelas = 1;
      }
      try {
        await this.prisma.vendaCartao.create({
          data: {
            data: new Date(v.data),
            brutoCentavos: v.brutoCentavos,
            liquidoCentavos: v.liquidoCentavos,
            taxaCentavos,
            taxaBps,
            planoExtrato: v.planoExtrato ?? null,
            adquirente: v.adquirente ?? dto.adquirente ?? null,
            bandeira: v.bandeira ?? null,
            forma,
            parcelas,
            plano: v.bandeira ? 'Padrao' : null, // se veio bandeira, assume Padrao (ajustável)
            unidadeId: dto.unidadeId ?? null,
            origem: 'FINPET',
            externalId: v.externalId ?? null,
          },
        });
        criadas++;
      } catch (e: any) {
        if (e?.code === 'P2002') ignoradas++;
        else throw e;
      }
    }
    return { criadas, ignoradas };
  }

  async atribuir(id: string, dto: AtribuirVendaDto) {
    const v = await this.prisma.vendaCartao.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Venda não encontrada');
    return this.prisma.vendaCartao.update({
      where: { id },
      data: {
        adquirente: dto.adquirente ?? v.adquirente,
        bandeira: dto.bandeira ?? v.bandeira,
        forma: dto.forma ?? v.forma,
        parcelas: dto.parcelas ?? v.parcelas,
        plano: dto.plano ?? v.plano ?? 'Padrao',
      },
    });
  }

  async removerVenda(id: string) {
    await this.prisma.vendaCartao.delete({ where: { id } }).catch(() => null);
    return { message: 'Venda removida' };
  }

  /** Auditoria do período: cada venda com esperada/diferença/status + resumo. */
  async auditar(q: { competencia?: string; status?: Status; adquirente?: string }) {
    const where: any = {};
    if (q.competencia) {
      const [y, m] = q.competencia.split('-').map(Number);
      if (y && m) where.data = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
    }
    if (q.adquirente === 'InfinityPay') {
      // a adquirente padrão abraça também vendas antigas sem marca (null)
      where.OR = [{ adquirente: 'InfinityPay' }, { adquirente: null }];
    } else if (q.adquirente) {
      where.adquirente = q.adquirente;
    }
    const vendas = await this.prisma.vendaCartao.findMany({ where, orderBy: { data: 'desc' } });

    const auditadas = [];
    for (const v of vendas) {
      let esperadaBps: number | null = null;
      let status: Status;
      if (v.taxaBps === 0) {
        esperadaBps = 0;
        status = 'CONFORME';
      } else if (v.bandeira && v.forma && v.parcelas) {
        esperadaBps = await this.aliquotaEsperadaBps({
          adquirente: v.adquirente,
          bandeira: v.bandeira,
          plano: v.plano ?? 'Padrao',
          forma: v.forma,
          parcelas: v.parcelas,
          data: v.data,
        });
        status =
          esperadaBps === null
            ? 'A_CONFERIR'
            : Math.abs(v.taxaBps - esperadaBps) <= TOLERANCIA_BPS
              ? 'CONFORME'
              : 'DIVERGENTE';
      } else {
        status = 'A_CONFERIR';
      }
      const esperadaCentavos =
        esperadaBps === null ? null : Math.round((v.brutoCentavos * esperadaBps) / 10000);
      const diferencaCentavos = esperadaCentavos === null ? null : v.taxaCentavos - esperadaCentavos;
      auditadas.push({ ...v, esperadaBps, esperadaCentavos, diferencaCentavos, status });
    }

    const filtradas = q.status ? auditadas.filter((a) => a.status === q.status) : auditadas;

    const resumo = {
      vendas: auditadas.length,
      brutoCentavos: auditadas.reduce((s, a) => s + a.brutoCentavos, 0),
      taxaCentavos: auditadas.reduce((s, a) => s + a.taxaCentavos, 0),
      // cobrado a maior = soma das diferenças positivas (só divergentes)
      aMaiorCentavos: auditadas.reduce(
        (s, a) => s + (a.status === 'DIVERGENTE' && (a.diferencaCentavos ?? 0) > 0 ? a.diferencaCentavos! : 0),
        0,
      ),
      conformes: auditadas.filter((a) => a.status === 'CONFORME').length,
      divergentes: auditadas.filter((a) => a.status === 'DIVERGENTE').length,
      aConferir: auditadas.filter((a) => a.status === 'A_CONFERIR').length,
    };
    const taxaMediaBps = resumo.brutoCentavos
      ? Math.round((resumo.taxaCentavos / resumo.brutoCentavos) * 10000)
      : 0;

    return { resumo: { ...resumo, taxaMediaBps }, itens: filtradas };
  }
}

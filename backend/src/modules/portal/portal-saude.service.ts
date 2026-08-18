/**
 * Telas Saude, Peso e Fisioterapia (Fatia 3) — TUDO leitura.
 *
 * Nenhum metodo aqui recebe petId sem passar antes pelo cofre: quem chama e o
 * controller, que faz `assertPetDoTutor` na porta de entrada.
 *
 * De onde vem cada coisa (conferido no schema em 29/07/2026):
 * · vacinas   -> ProtocoloAplicado(tipo VACINA) + ProtocoloDose  E  HistoricoClinico(tipo VACINA),
 *                que sao as importadas do SimplesVet.
 * · receitas  -> ClinicalDocument(PRESCRIPTION) + HistoricoClinico(tipo RECEITA)
 * · exames    -> ClinicalDocument(EXAM_REQUEST) + HistoricoClinico(tipo EXAME, com arquivo)
 * · peso      -> Appointment.petWeight (pesagem do atendimento) + HistoricoClinico(tipo PESO)
 * · fisio     -> Pacote + PacoteSessao
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortalEscopoService } from './portal-escopo.service';
import { CloudStorageService } from '../media/cloud-storage.service';
import { montarTextoBoletim } from './boletim-texto.util';

export interface ItemVacina {
  nome: string;
  aplicadaEm: Date | null;
  reforcoEm: Date | null;
  /** aplicada | agendada | atrasada */
  situacao: 'aplicada' | 'agendada' | 'atrasada';
}

export interface ItemDocumento {
  id: string;
  titulo: string;
  data: Date;
  /** Texto curto para a segunda linha do card. */
  detalhe: string | null;
  /** Existe arquivo para abrir? (PDF de exame, receita assinada...) */
  temArquivo: boolean;
}

export interface PontoPeso {
  data: Date;
  kg: number;
}

export interface SessaoFisio {
  numero: number;
  data: Date;
  profissional: string | null;
  observacao: string | null;
}

export interface PacoteFisio {
  id: string;
  servico: string;
  descricao: string | null;
  sessaoAtual: number;
  totalSessoes: number;
  restantes: number;
  validade: Date | null;
  status: string;
  sessoes: SessaoFisio[];
}

@Injectable()
export class PortalSaudeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escopo: PortalEscopoService,
    private readonly storage: CloudStorageService,
  ) {}

  /**
   * Abre um documento (receita/exame) do tutor. O id pode ser de ClinicalDocument
   * (gerado no sistema, pdfUrl) ou de HistoricoClinico (importado, arquivoKey). SEMPRE
   * confere o dono pelo porteiro antes de servir o arquivo do bucket privado (Tigris).
   */
  async arquivo(
    tutorId: string,
    docId: string,
  ): Promise<{ buffer: Buffer; contentType: string; nome: string } | null> {
    const doc = await this.prisma.clinicalDocument.findUnique({
      where: { id: docId },
      select: { petId: true, pdfUrl: true, title: true },
    });
    if (doc?.pdfUrl && doc.petId) {
      await this.escopo.assertPetDoTutor(tutorId, doc.petId);
      const f = await this.storage.baixarPorUrl(doc.pdfUrl);
      return f ? { ...f, nome: `${doc.title || 'documento'}.pdf` } : null;
    }
    const hist = await this.prisma.historicoClinico.findUnique({
      where: { id: docId },
      select: { petId: true, arquivoKey: true, arquivoNome: true, titulo: true },
    });
    if (hist?.arquivoKey && hist.petId) {
      await this.escopo.assertPetDoTutor(tutorId, hist.petId);
      const f = await this.storage.baixarPorChave(hist.arquivoKey);
      return f ? { ...f, nome: hist.arquivoNome || hist.titulo || 'documento' } : null;
    }
    return null;
  }

  /** Boletins de fisioterapia ENVIADOS ao tutor (lista `petboletim_<petId>`), mais novos primeiro. */
  async boletinsFisio(petId: string): Promise<Array<{ id: string; data: string; texto: string }>> {
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: `petboletim_${petId}` },
      select: { id: true, valor: true },
    });
    const boletins = itens
      .map((it) => {
        try {
          const o = JSON.parse(it.valor);
          if (!o?.enviadoAt) return null;
          // Texto pronto (boletins novos) ou montado dos campos salvos (todos os antigos têm os dados).
          const texto = (o.texto && String(o.texto).trim()) || montarTextoBoletim(o);
          return { id: it.id, data: String(o.sessaoData || o.enviadoAt || o.createdAt).slice(0, 10), texto };
        } catch {
          return null;
        }
      })
      .filter((b): b is { id: string; data: string; texto: string } => !!b)
      .sort((a, b) => (a.data < b.data ? 1 : -1));
    return boletins;
  }

  // ---------------------------------------------------------------- SAUDE
  async vacinas(petId: string): Promise<ItemVacina[]> {
    const hoje = new Date();

    const protocolos = await this.prisma.protocoloAplicado.findMany({
      where: { petId, tipo: 'VACINA', status: { not: 'CANCELADO' } },
      select: {
        nomeProtocolo: true,
        doses: {
          where: { status: { not: 'CANCELADA' } },
          select: { numero: true, dataPrevista: true, dataAplicada: true, status: true },
          orderBy: { numero: 'asc' },
        },
      },
      orderBy: { dataInicial: 'desc' },
    });

    const itens: ItemVacina[] = [];

    for (const p of protocolos) {
      const aplicadas = p.doses.filter((d) => d.status === 'APLICADA' && d.dataAplicada);
      const pendentes = p.doses.filter((d) => d.status !== 'APLICADA');
      const ultima = aplicadas[aplicadas.length - 1];
      const proxima = pendentes[0];

      // O tutor nao quer ver dose por dose: quer "esta vacina esta em dia?".
      if (ultima || proxima) {
        itens.push({
          nome: p.nomeProtocolo,
          aplicadaEm: ultima?.dataAplicada ?? null,
          reforcoEm: proxima?.dataPrevista ?? null,
          situacao: !proxima
            ? 'aplicada'
            : proxima.dataPrevista < hoje
              ? 'atrasada'
              : ultima
                ? 'aplicada'
                : 'agendada',
        });
      }
    }

    // Vacinas antigas, importadas do SimplesVet (sem protocolo/doses).
    const importadas = await this.prisma.historicoClinico.findMany({
      where: { petId, tipo: 'VACINA' },
      select: { titulo: true, data: true, texto: true },
      orderBy: { data: 'desc' },
      take: 30,
    });

    for (const v of importadas) {
      itens.push({
        nome: v.titulo || 'Vacina',
        aplicadaEm: v.data,
        reforcoEm: null,
        situacao: 'aplicada',
      });
    }

    return itens;
  }

  async receitas(petId: string): Promise<ItemDocumento[]> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { petId, type: 'PRESCRIPTION' },
      select: { id: true, title: true, createdAt: true, pdfUrl: true, signedBy: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const importadas = await this.prisma.historicoClinico.findMany({
      where: { petId, tipo: 'RECEITA' },
      select: { id: true, titulo: true, data: true, resumo: true, arquivoKey: true },
      orderBy: { data: 'desc' },
      take: 20,
    });

    return [
      ...docs.map((d) => ({
        id: d.id,
        titulo: d.title,
        data: d.createdAt,
        detalhe: d.signedBy ? `por ${d.signedBy}` : null,
        temArquivo: !!d.pdfUrl,
      })),
      ...importadas.map((h) => ({
        id: h.id,
        titulo: h.titulo || 'Receita',
        data: h.data,
        detalhe: h.resumo || null,
        temArquivo: !!h.arquivoKey,
      })),
    ].sort((a, b) => b.data.getTime() - a.data.getTime());
  }

  async exames(petId: string): Promise<ItemDocumento[]> {
    const docs = await this.prisma.clinicalDocument.findMany({
      where: { petId, type: 'EXAM_REQUEST' },
      select: { id: true, title: true, createdAt: true, pdfUrl: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const importados = await this.prisma.historicoClinico.findMany({
      where: { petId, tipo: 'EXAME' },
      select: { id: true, titulo: true, data: true, resumo: true, arquivoKey: true, arquivoNome: true },
      orderBy: { data: 'desc' },
      take: 30,
    });

    return [
      ...docs.map((d) => ({
        id: d.id,
        titulo: d.title,
        data: d.createdAt,
        detalhe: null,
        temArquivo: !!d.pdfUrl,
      })),
      ...importados.map((h) => ({
        id: h.id,
        titulo: h.titulo || h.arquivoNome || 'Exame',
        data: h.data,
        detalhe: h.resumo || null,
        temArquivo: !!h.arquivoKey,
      })),
    ].sort((a, b) => b.data.getTime() - a.data.getTime());
  }

  async saude(petId: string) {
    const [vacinas, receitas, exames] = await Promise.all([
      this.vacinas(petId),
      this.receitas(petId),
      this.exames(petId),
    ]);
    return { vacinas, receitas, exames };
  }

  // ---------------------------------------------------------------- PESO
  /**
   * Junta as pesagens dos atendimentos com as importadas e devolve em ordem.
   * Uma pesagem por dia (a ultima do dia manda) — duas medidas no mesmo dia
   * viram um degrau sem sentido no grafico.
   */
  async peso(petId: string): Promise<{ pontos: PontoPeso[]; atual: number | null; variacao: number | null }> {
    const [atendimentos, importados, pet] = await Promise.all([
      this.prisma.appointment.findMany({
        where: { petId, petWeight: { not: null } },
        select: { date: true, petWeight: true },
        orderBy: { date: 'asc' },
        take: 200,
      }),
      this.prisma.historicoClinico.findMany({
        where: { petId, tipo: 'PESO', valorNum: { not: null } },
        select: { data: true, valorNum: true },
        orderBy: { data: 'asc' },
        take: 200,
      }),
      this.prisma.pet.findUnique({ where: { id: petId }, select: { weight: true } }),
    ]);

    const porDia = new Map<string, PontoPeso>();
    const guardar = (data: Date, kg?: number | null) => {
      if (!kg || kg <= 0) return;
      const chave = new Date(data).toISOString().slice(0, 10);
      porDia.set(chave, { data: new Date(data), kg });
    };

    for (const a of atendimentos) guardar(a.date, a.petWeight);
    for (const h of importados) guardar(h.data, h.valorNum);

    const pontos = [...porDia.values()].sort((a, b) => a.data.getTime() - b.data.getTime());

    const atual = pontos.length ? pontos[pontos.length - 1].kg : (pet?.weight ?? null);
    const variacao =
      pontos.length > 1
        ? Math.round((pontos[pontos.length - 1].kg - pontos[0].kg) * 10) / 10
        : null;

    return { pontos, atual, variacao };
  }

  // ---------------------------------------------------------------- DIETA
  /**
   * Dieta ATIVA do pet, do jeito que a tela Alimentação mostra.
   * A dieta é escrita pela equipe (módulo clínico `dietas`); aqui só lemos.
   */
  async dieta(petId: string) {
    const d = await this.prisma.dieta.findFirst({
      where: { petId, ativa: true },
      orderBy: { data: 'desc' },
    });
    if (!d) return { tem: false as const };

    const lista = (v: unknown): string[] =>
      Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

    return {
      tem: true as const,
      prescritorNome: d.prescritorNome,
      data: d.data,
      itens: Array.isArray(d.itens)
        ? (d.itens as any[]).map((i) => ({
            nome: String(i?.nome ?? ''),
            detalhe: i?.detalhe ? String(i.detalhe) : null,
          })).filter((i) => i.nome)
        : [],
      variacoes: lista(d.variacoes),
      evitar: lista(d.evitar),
      observacao: d.observacao,
      temAnexo: !!d.anexoKey,
      anexoNome: d.anexoNome,
    };
  }

  // ---------------------------------------------------------------- FISIO
  // Os planos de fisio (vendidos no caixa OU pacote manual da ficha/inbox) vivem em
  // `petpac_<pet>` (ListaItem) — NÃO na tabela Pacote (legada). É de lá que a ficha
  // mostra "1/3 sessões". O histórico por sessão o tutor vê pelos boletins (petboletim_).
  async fisio(petId: string): Promise<PacoteFisio[]> {
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: `petpac_${petId}` },
      select: { id: true, valor: true, createdAt: true },
    });

    const planos = itens
      .map((it) => {
        try {
          return { id: it.id, createdAt: it.createdAt, ...(JSON.parse(it.valor) as any) };
        } catch {
          return null;
        }
      })
      .filter((x): x is any => !!x && Number(x.total) > 0);

    // Ativos primeiro; dentro de cada grupo, os mais recentes no topo.
    planos.sort(
      (a, b) =>
        Number(!!a.concluido) - Number(!!b.concluido) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return planos.map((p) => {
      const total = Number(p.total) || 0;
      const used = Math.min(Number(p.used) || 0, total);
      const concluido = !!p.concluido || (total > 0 && used >= total);
      return {
        id: p.id,
        servico: p.nome || 'Fisioterapia',
        descricao: p.nome || null,
        sessaoAtual: used,
        totalSessoes: total,
        restantes: Math.max(0, total - used),
        validade: p.validade || null,
        status: concluido ? 'CONCLUIDO' : 'ATIVO',
        sessoes: [],
      } as PacoteFisio;
    });
  }
}

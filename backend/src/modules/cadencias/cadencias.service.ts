import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CreateCadenciaDto, UpdateCadenciaDto, CreatePassoDto, UpdatePassoDto, InscreverDto } from './dto/cadencia.dto';

@Injectable()
export class CadenciasService {
  private readonly logger = new Logger(CadenciasService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  async list(includeInactive = false) {
    return this.prisma.cadenciaTemplate.findMany({
      where: includeInactive ? {} : { ativo: true },
      include: {
        passos: { orderBy: { ordem: 'asc' } },
        _count: { select: { passos: true } },
      },
      orderBy: [{ ativo: 'desc' }, { ordem: 'asc' }, { nome: 'asc' }],
    });
  }
  async create(dto: CreateCadenciaDto) {
    return this.prisma.cadenciaTemplate.create({ data: dto, include: { passos: true } });
  }
  async update(id: string, dto: UpdateCadenciaDto) {
    const exists = await this.prisma.cadenciaTemplate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Cadência não encontrada');
    return this.prisma.cadenciaTemplate.update({ where: { id }, data: dto, include: { passos: true } });
  }
  async remove(id: string) {
    const exists = await this.prisma.cadenciaTemplate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Cadência não encontrada');
    return this.prisma.cadenciaTemplate.delete({ where: { id } });
  }

  // Passos
  async createPasso(dto: CreatePassoDto) {
    return this.prisma.cadenciaPasso.create({ data: dto });
  }
  async updatePasso(id: string, dto: UpdatePassoDto) {
    const exists = await this.prisma.cadenciaPasso.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Passo não encontrado');
    return this.prisma.cadenciaPasso.update({ where: { id }, data: dto });
  }
  async removePasso(id: string) {
    const exists = await this.prisma.cadenciaPasso.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Passo não encontrado');
    return this.prisma.cadenciaPasso.delete({ where: { id } });
  }

  // Seed
  async seedPacoteInicial() {
    const count = await this.prisma.cadenciaTemplate.count();
    if (count > 0) return { skipped: true, message: 'Já existem cadências cadastradas', total: count };

    const sequencias = [
      {
        nome: 'Pós-agendamento (lembretes)',
        descricao: 'Lembretes automáticos antes da consulta',
        gatilho: 'AGENDAMENTO_CONFIRMADO' as const,
        passos: [
          { ordem: 1, tipo: 'WHATSAPP' as const, titulo: 'Confirmação imediata', conteudo: 'Perfeito, {tutor}! Agendamento do {pet} confirmado pra {data} às {hora} com {profissional} 🐾 A gente te espera!', atrasoValor: 0, atrasoUnidade: 'MINUTOS' as const },
          { ordem: 2, tipo: 'WHATSAPP' as const, titulo: 'Lembrete 24h antes', conteudo: 'Oi, {tutor}! Só passando pra lembrar da consulta do {pet} amanhã às {hora} 🌿 Posso confirmar?', atrasoValor: 1, atrasoUnidade: 'DIAS' as const },
          { ordem: 3, tipo: 'WHATSAPP' as const, titulo: 'Lembrete 2h antes', conteudo: 'Oi, {tutor}! Em 2h tem consulta do {pet}. Te esperamos 🐾', atrasoValor: 22, atrasoUnidade: 'HORAS' as const },
        ],
      },
      {
        nome: 'Pós-atendimento (cuidado)',
        descricao: 'Acompanhamento de recuperação após consulta',
        gatilho: 'ATENDIMENTO_FINALIZADO' as const,
        passos: [
          { ordem: 1, tipo: 'WHATSAPP' as const, titulo: 'Agradecimento', conteudo: 'Obrigada por confiar a saúde do {pet} a gente, {tutor} 💚 Qualquer dúvida sobre a consulta, estamos aqui!', atrasoValor: 2, atrasoUnidade: 'HORAS' as const },
          { ordem: 2, tipo: 'WHATSAPP' as const, titulo: 'Check-in 48h', conteudo: 'Oi, {tutor}! Como o {pet} está se recuperando? 🐾', atrasoValor: 2, atrasoUnidade: 'DIAS' as const },
          { ordem: 3, tipo: 'WHATSAPP' as const, titulo: 'Solicitar avaliação', conteudo: 'Oi, {tutor}! Se a experiência com a {profissional} foi boa, ficaríamos felizes com uma avaliação no Google ⭐ {link_google}', atrasoValor: 7, atrasoUnidade: 'DIAS' as const },
        ],
      },
      {
        nome: 'Resultado de exame',
        descricao: 'Notificações de status do exame',
        gatilho: 'EXAME_SOLICITADO' as const,
        passos: [
          { ordem: 1, tipo: 'WHATSAPP' as const, titulo: 'Confirmação do pedido', conteudo: 'Oi, {tutor}! Exame do {pet} pedido pro laboratório. Aviso assim que o resultado chegar 🧪', atrasoValor: 0, atrasoUnidade: 'MINUTOS' as const },
          { ordem: 2, tipo: 'TAREFA_INTERNA' as const, titulo: 'Cobrar lab se atrasado', conteudo: 'Verificar se o resultado de {exame} pra {pet} já chegou. Se não, cobrar.', atrasoValor: 3, atrasoUnidade: 'DIAS' as const },
        ],
      },
      {
        nome: 'Lead novo (qualificação)',
        descricao: 'Sequência pra leads recém-capturados',
        gatilho: 'LEAD_NOVO' as const,
        passos: [
          { ordem: 1, tipo: 'WHATSAPP' as const, titulo: 'Boas-vindas', conteudo: 'Oi, {tutor}! Aqui é a recepção do Empório do Pet 🐾 Recebemos seu contato. Como podemos cuidar do(a) {pet}?', atrasoValor: 5, atrasoUnidade: 'MINUTOS' as const },
          { ordem: 2, tipo: 'WHATSAPP' as const, titulo: 'Follow-up 1 dia', conteudo: 'Oi, {tutor}! Só passando pra ver se ficou alguma dúvida sobre o atendimento aqui no Empório. Posso te ajudar com algo? 💚', atrasoValor: 1, atrasoUnidade: 'DIAS' as const },
          { ordem: 3, tipo: 'WHATSAPP' as const, titulo: 'Follow-up 3 dias', conteudo: 'Oi, {tutor}! Caso queira conhecer melhor nossa abordagem integrativa, posso te enviar materiais. Topa? 🌿', atrasoValor: 2, atrasoUnidade: 'DIAS' as const },
        ],
      },
      {
        nome: 'Aniversário do Pet',
        descricao: 'Mensagem carinhosa no niver do paciente',
        gatilho: 'NIVER_PET' as const,
        passos: [
          { ordem: 1, tipo: 'WHATSAPP' as const, titulo: 'Parabéns!', conteudo: 'Hoje é o niver do(a) {pet}! 🎂 Toda equipe do Empório manda muitos beijinhos e desejos de saúde, {tutor}! 🐾', atrasoValor: 0, atrasoUnidade: 'MINUTOS' as const },
        ],
      },
    ];

    let totalSeq = 0, totalPassos = 0;
    for (const s of sequencias) {
      const { passos, ...sData } = s;
      const created = await this.prisma.cadenciaTemplate.create({ data: sData });
      totalSeq++;
      for (const p of passos) {
        await this.prisma.cadenciaPasso.create({ data: { ...p, cadenciaId: created.id } });
        totalPassos++;
      }
    }
    return { skipped: false, cadenciasCriadas: totalSeq, passosCriados: totalPassos };
  }

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    const GAT_MAP: Record<string, string> = {
      'agendamento_criado': 'AGENDAMENTO_CRIADO', 'agendamento_confirmado': 'AGENDAMENTO_CONFIRMADO',
      'atendimento_finalizado': 'ATENDIMENTO_FINALIZADO', 'exame_solicitado': 'EXAME_SOLICITADO',
      'exame_pronto': 'EXAME_PRONTO', 'lead_novo': 'LEAD_NOVO', 'lead_inativo_7d': 'LEAD_INATIVO_7D',
      'niver_pet': 'NIVER_PET', 'niver_tutor': 'NIVER_TUTOR', 'manual': 'MANUAL',
    };
    for (const r of rows) {
      const nome = r.nome;
      if (!nome) { ignorados++; continue; }
      const gatKey = (r.gatilho || 'manual').toString().toLowerCase().replace(/[ -]/g, '_').trim();
      const data: any = {
        nome, descricao: r.descricao || null,
        gatilho: (GAT_MAP[gatKey] || 'MANUAL') as any,
        ativo: r.ativo !== undefined ? r.ativo : true,
        ordem: r.ordem ?? 0,
      };
      const existente = await this.prisma.cadenciaTemplate.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' } } });
      if (existente) {
        if (!upsert) { ignorados++; continue; }
        await this.prisma.cadenciaTemplate.update({ where: { id: existente.id }, data });
        atualizados++;
      } else {
        await this.prisma.cadenciaTemplate.create({ data });
        criados++;
      }
    }
    return { criados, atualizados, ignorados };
  }

  // ===== Execucao (engine de sequencia) =====
  private atrasoMs(valor: number, unidade: string): number {
    const v = Math.max(0, valor || 0);
    if (unidade === 'MINUTOS') return v * 60_000;
    if (unidade === 'HORAS') return v * 3_600_000;
    return v * 86_400_000;
  }
  private render(text: string, vars: any): string {
    if (!text) return '';
    const v = vars || {};
    return text.replace(/\{(\w+)\}/g, (_m, k) => (v[k] != null ? String(v[k]) : `{${k}}`));
  }

  async inscrever(cadenciaId: string, dto: InscreverDto) {
    const tpl = await this.prisma.cadenciaTemplate.findUnique({
      where: { id: cadenciaId },
      include: { passos: { where: { ativo: true }, orderBy: { ordem: 'asc' } } },
    });
    if (!tpl) throw new NotFoundException('Cadencia nao encontrada');
    if (!tpl.ativo) throw new NotFoundException('Cadencia inativa');
    const primeiro = tpl.passos[0];
    if (!primeiro) throw new NotFoundException('Cadencia sem passos ativos');
    const phone = (dto.phone || '').replace(/\D/g, '');
    if (!phone) throw new NotFoundException('Telefone obrigatorio');
    const proximoEm = new Date(Date.now() + this.atrasoMs(primeiro.atrasoValor, primeiro.atrasoUnidade));
    return this.prisma.cadenciaInscricao.create({
      data: {
        cadenciaId,
        tutorId: dto.tutorId || null,
        petId: dto.petId || null,
        phone,
        status: 'ATIVA',
        passoOrdem: primeiro.ordem,
        proximoEm,
        vars: dto.vars || {},
      },
    });
  }

  async listInscricoes(tutorId?: string) {
    return this.prisma.cadenciaInscricao.findMany({
      where: { ...(tutorId ? { tutorId } : {}) },
      include: { cadencia: { select: { nome: true, gatilho: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
  async cancelarInscricao(id: string) {
    return this.prisma.cadenciaInscricao.update({ where: { id }, data: { status: 'CANCELADA' } });
  }
  async pausarPorResposta(tutorId: string) {
    if (!tutorId) return { paused: 0 };
    const r = await this.prisma.cadenciaInscricao.updateMany({
      where: { tutorId, status: 'ATIVA' },
      data: { status: 'PAUSADA', pausadaEm: new Date() },
    });
    return { paused: r.count };
  }

  private async tutorRespondeu(insc: { tutorId: string | null; iniciadaEm: Date }): Promise<boolean> {
    if (!insc.tutorId) return false;
    const resp = await this.prisma.whatsAppMessage.findFirst({
      where: { direction: 'INBOUND' as any, createdAt: { gt: insc.iniciadaEm }, conversation: { tutorId: insc.tutorId } },
      select: { id: true },
    });
    return !!resp;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processarInscricoes() {
    const due = await this.prisma.cadenciaInscricao.findMany({
      where: { status: 'ATIVA', proximoEm: { lte: new Date() } },
      take: 20,
    });
    for (const insc of due) {
      try {
        if (await this.tutorRespondeu(insc)) {
          await this.prisma.cadenciaInscricao.update({ where: { id: insc.id }, data: { status: 'PAUSADA', pausadaEm: new Date() } });
          continue;
        }
        const tpl = await this.prisma.cadenciaTemplate.findUnique({
          where: { id: insc.cadenciaId },
          include: { passos: { where: { ativo: true }, orderBy: { ordem: 'asc' } } },
        });
        if (!tpl) { await this.prisma.cadenciaInscricao.update({ where: { id: insc.id }, data: { status: 'CANCELADA' } }); continue; }
        const passos = tpl.passos;
        const atual = passos.find((p) => p.ordem === insc.passoOrdem) || passos.find((p) => p.ordem >= insc.passoOrdem);
        if (!atual) { await this.prisma.cadenciaInscricao.update({ where: { id: insc.id }, data: { status: 'CONCLUIDA', concluidaEm: new Date() } }); continue; }
        if (atual.tipo === 'WHATSAPP') {
          const msg = this.render(atual.conteudo, insc.vars);
          try {
            const res: any = await this.whatsapp.sendMessage({ to: insc.phone, message: msg } as any);
            if (res && res.success === false) this.logger.warn(`Cadencia ${insc.id} passo ${atual.ordem}: envio falhou (${res.error || 'erro'})`);
          } catch (err: any) {
            this.logger.warn(`Cadencia ${insc.id} passo ${atual.ordem}: ${err?.message || err}`);
          }
        }
        const proximo = passos.filter((p) => p.ordem > atual.ordem).sort((a, b) => a.ordem - b.ordem)[0];
        if (proximo) {
          await this.prisma.cadenciaInscricao.update({
            where: { id: insc.id },
            data: { passoOrdem: proximo.ordem, proximoEm: new Date(Date.now() + this.atrasoMs(proximo.atrasoValor, proximo.atrasoUnidade)) },
          });
        } else {
          await this.prisma.cadenciaInscricao.update({ where: { id: insc.id }, data: { status: 'CONCLUIDA', concluidaEm: new Date() } });
        }
      } catch (e: any) {
        this.logger.warn(`Cadencia inscricao ${insc.id}: ${e?.message || e}`);
      }
    }
    if (due.length) this.logger.log(`Cadencias: processadas ${due.length} inscricoes`);
  }
}
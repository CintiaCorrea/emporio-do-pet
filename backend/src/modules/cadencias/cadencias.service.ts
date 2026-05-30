import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCadenciaDto, UpdateCadenciaDto, CreatePassoDto, UpdatePassoDto } from './dto/cadencia.dto';

@Injectable()
export class CadenciasService {
  constructor(private readonly prisma: PrismaService) {}

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
}

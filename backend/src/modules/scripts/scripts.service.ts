import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScriptCategoryDto, UpdateScriptCategoryDto, CreateScriptTemplateDto, UpdateScriptTemplateDto } from './dto/script.dto';

@Injectable()
export class ScriptsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Categories =====
  async listCategories(includeInactive = false) {
    return this.prisma.scriptCategory.findMany({
      where: includeInactive ? {} : { ativo: true },
      orderBy: [{ ativo: 'desc' }, { ordem: 'asc' }, { nome: 'asc' }],
      include: { _count: { select: { scripts: true } } },
    });
  }
  async createCategory(dto: CreateScriptCategoryDto) {
    return this.prisma.scriptCategory.create({ data: dto });
  }
  async updateCategory(id: string, dto: UpdateScriptCategoryDto) {
    const exists = await this.prisma.scriptCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.scriptCategory.update({ where: { id }, data: dto });
  }
  async removeCategory(id: string) {
    const exists = await this.prisma.scriptCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.scriptCategory.delete({ where: { id } });
  }

  // ===== Scripts =====
  async listScripts(includeInactive = false, categoryId?: string) {
    return this.prisma.scriptTemplate.findMany({
      where: {
        ...(includeInactive ? {} : { ativo: true }),
        ...(categoryId ? { categoryId } : {}),
      },
      include: { category: { select: { id: true, nome: true, emoji: true } } },
      orderBy: [{ ativo: 'desc' }, { ordem: 'asc' }, { nome: 'asc' }],
    });
  }
  async createScript(dto: CreateScriptTemplateDto) {
    return this.prisma.scriptTemplate.create({
      data: dto,
      include: { category: { select: { id: true, nome: true, emoji: true } } },
    });
  }
  async updateScript(id: string, dto: UpdateScriptTemplateDto) {
    const exists = await this.prisma.scriptTemplate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Script não encontrado');
    return this.prisma.scriptTemplate.update({
      where: { id }, data: dto,
      include: { category: { select: { id: true, nome: true, emoji: true } } },
    });
  }
  async removeScript(id: string) {
    const exists = await this.prisma.scriptTemplate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Script não encontrado');
    return this.prisma.scriptTemplate.delete({ where: { id } });
  }
  async incrementUsage(id: string) {
    return this.prisma.scriptTemplate.update({
      where: { id }, data: { vezesUsado: { increment: 1 } },
    });
  }

  // ===== Seed Pacote Inicial =====
  async seedPacoteInicial() {
    const count = await this.prisma.scriptTemplate.count();
    if (count > 0) return { skipped: true, message: 'Já existem scripts cadastrados', total: count };

    const categorias = [
      { nome: 'Boas-vindas', emoji: '👋', ordem: 1 },
      { nome: 'Agendamento', emoji: '📅', ordem: 2 },
      { nome: 'Confirmação', emoji: '✅', ordem: 3 },
      { nome: 'Resultados', emoji: '📋', ordem: 4 },
      { nome: 'Pós-atendimento', emoji: '🐾', ordem: 5 },
      { nome: 'Cobrança', emoji: '💰', ordem: 6 },
      { nome: 'Reagendamento', emoji: '🔄', ordem: 7 },
      { nome: 'Despedida', emoji: '🌟', ordem: 8 },
    ];
    const catIds: Record<string, string> = {};
    for (const c of categorias) {
      const created = await this.prisma.scriptCategory.create({ data: c });
      catIds[c.nome] = created.id;
    }

    const scripts: any[] = [
      { categoria: 'Boas-vindas', nome: 'Saudação inicial', conteudo: 'Olá, {tutor}! 🐾 Aqui é {atendente} do Empório do Pet. Que bom falar com você! Como posso ajudar hoje?', variaveis: ['tutor', 'atendente'] },
      { categoria: 'Boas-vindas', nome: 'Primeiro contato', conteudo: 'Oi, {tutor}! Seja muito bem-vinda(o) ao Empório do Pet 🌿 Somos uma clínica integrativa em Fortaleza. Em que podemos cuidar do seu {pet}?', variaveis: ['tutor', 'pet'] },
      { categoria: 'Agendamento', nome: 'Oferecer horários', conteudo: 'Tenho aqui pra {pet}:\n\n📅 {data1} às {hora1}\n📅 {data2} às {hora2}\n\nQual fica melhor pra você?', variaveis: ['pet', 'data1', 'hora1', 'data2', 'hora2'] },
      { categoria: 'Agendamento', nome: 'Solicitar dados', conteudo: 'Pra agendar a consulta do {pet}, preciso confirmar:\n• Idade\n• Raça\n• Última vacinação\n• Se está tomando algum medicamento\n\nPode me passar?', variaveis: ['pet'] },
      { categoria: 'Confirmação', nome: 'Confirmar agendamento', conteudo: 'Perfeito, {tutor}! Agendamento confirmado:\n\n🐾 {pet}\n👩‍⚕️ {profissional}\n📅 {data} às {hora}\n\nA gente te espera! 💚', variaveis: ['tutor', 'pet', 'profissional', 'data', 'hora'] },
      { categoria: 'Confirmação', nome: 'Lembrete véspera', conteudo: 'Oi, {tutor}! Só passando pra lembrar da consulta do {pet} amanhã às {hora} com {profissional} 🐾\n\nPosso confirmar?', variaveis: ['tutor', 'pet', 'hora', 'profissional'] },
      { categoria: 'Confirmação', nome: 'Lembrete dia', conteudo: 'Bom dia, {tutor}! 🌅 Confirmando a consulta do {pet} hoje às {hora}.\n\nEndereço: {endereco}\n\nQualquer coisa, é só chamar 💚', variaveis: ['tutor', 'pet', 'hora', 'endereco'] },
      { categoria: 'Resultados', nome: 'Resultado pronto', conteudo: 'Oi, {tutor}! O resultado do exame do {pet} está pronto ✅\n\nA {profissional} vai analisar e te chamar pra conversar sobre os próximos passos. Tudo bem?', variaveis: ['tutor', 'pet', 'profissional'] },
      { categoria: 'Resultados', nome: 'Enviar resultado', conteudo: 'Segue em anexo o resultado do exame de {pet}, {tutor} 📋\n\nQualquer dúvida, é só me chamar que encaminho pra {profissional}.', variaveis: ['tutor', 'pet', 'profissional'] },
      { categoria: 'Pós-atendimento', nome: 'Como está o pet', conteudo: 'Oi, {tutor}! 🐾 Tudo bem? Passando pra saber como o {pet} está depois da consulta de {data}. Está se recuperando bem?', variaveis: ['tutor', 'pet', 'data'] },
      { categoria: 'Pós-atendimento', nome: 'Receita digital', conteudo: 'Oi, {tutor}! Segue a receita digital do {pet} 💊\n\nA {profissional} recomenda: {observacoes}\n\nQualquer dúvida, estamos aqui 💚', variaveis: ['tutor', 'pet', 'profissional', 'observacoes'] },
      { categoria: 'Cobrança', nome: 'Lembrete pagamento', conteudo: 'Oi, {tutor}! Tudo bem? Identifiquei aqui que o valor de {valor} referente ao atendimento de {pet} em {data} ainda está em aberto. Posso te ajudar com o pagamento?', variaveis: ['tutor', 'valor', 'pet', 'data'] },
      { categoria: 'Cobrança', nome: 'PIX disponível', conteudo: 'Claro, {tutor}! Pode pagar via PIX:\n\n🔑 Chave: {chave_pix}\nFavorecido: Empório do Pet\n\nQuando puder, me envia o comprovante. Obrigada! 💚', variaveis: ['tutor', 'chave_pix'] },
      { categoria: 'Reagendamento', nome: 'Oferecer remarcar', conteudo: 'Sem problema, {tutor}! 💚 Vou cancelar o horário de {data}. Quando seria melhor remarcar o {pet}?', variaveis: ['tutor', 'data', 'pet'] },
      { categoria: 'Despedida', nome: 'Encerrar conversa', conteudo: 'Por nada, {tutor}! Foi um prazer te ajudar 💚 Mande um beijinho no {pet} por nós! Qualquer coisa, é só chamar 🐾', variaveis: ['tutor', 'pet'] },
      { categoria: 'Despedida', nome: 'Bom fim de semana', conteudo: 'Tenha um ótimo fim de semana, {tutor}! 🌿 Aproveite com o {pet}. Estamos aqui na segunda 💚', variaveis: ['tutor', 'pet'] },
    ];

    let count2 = 0;
    for (const s of scripts) {
      const categoryId = catIds[s.categoria];
      const { categoria, ...data } = s;
      await this.prisma.scriptTemplate.create({ data: { ...data, categoryId } });
      count2++;
    }

    return { skipped: false, categoriasCriadas: categorias.length, scriptsCriados: count2 };
  }

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    const catNomes = [...new Set(rows.map(r => (r.categoria || '').trim()).filter(Boolean))];
    const catMap: Record<string, string> = {};
    for (const nome of catNomes) {
      let c = await this.prisma.scriptCategory.findUnique({ where: { nome } });
      if (!c) c = await this.prisma.scriptCategory.create({ data: { nome, ativo: true } });
      catMap[nome] = c.id;
    }
    function extractVars(s: string): string[] {
      const m = s.match(/\{([a-z_][a-z0-9_]*)\}/gi) || [];
      return Array.from(new Set(m.map(x => x.slice(1, -1))));
    }
    for (const r of rows) {
      const nome = r.nome;
      const conteudo = r.conteudo || r.corpo || r.texto;
      if (!nome || !conteudo) { ignorados++; continue; }
      const data: any = {
        nome, conteudo, descricao: r.descricao || null,
        variaveis: r.variaveis ? (typeof r.variaveis === 'string' ? r.variaveis.split(/[,|;]/).map((s: string) => s.trim()).filter(Boolean) : r.variaveis) : extractVars(conteudo),
        categoryId: r.categoria ? catMap[r.categoria.trim()] : null,
        ordem: r.ordem ?? 0,
        ativo: r.ativo !== undefined ? r.ativo : true,
      };
      const existente = await this.prisma.scriptTemplate.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' } } });
      if (existente) {
        if (!upsert) { ignorados++; continue; }
        await this.prisma.scriptTemplate.update({ where: { id: existente.id }, data });
        atualizados++;
      } else {
        await this.prisma.scriptTemplate.create({ data });
        criados++;
      }
    }
    return { criados, atualizados, ignorados, categoriasCriadas: catNomes.length };
  }
}
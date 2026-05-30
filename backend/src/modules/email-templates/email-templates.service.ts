import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto, CreateEmailVariableDto, UpdateEmailVariableDto } from './dto/email.dto';

@Injectable()
export class EmailTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  // Templates
  async listTemplates(includeInactive = false) {
    return this.prisma.emailTemplate.findMany({
      where: includeInactive ? {} : { ativo: true },
      orderBy: [{ ativo: 'desc' }, { categoria: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
    });
  }
  async createTemplate(dto: CreateEmailTemplateDto) { return this.prisma.emailTemplate.create({ data: dto }); }
  async updateTemplate(id: string, dto: UpdateEmailTemplateDto) {
    const exists = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Template não encontrado');
    return this.prisma.emailTemplate.update({ where: { id }, data: dto });
  }
  async removeTemplate(id: string) {
    const exists = await this.prisma.emailTemplate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Template não encontrado');
    return this.prisma.emailTemplate.delete({ where: { id } });
  }

  // Variables
  async listVariables(includeInactive = false) {
    return this.prisma.emailVariable.findMany({
      where: includeInactive ? {} : { ativo: true },
      orderBy: [{ ativo: 'desc' }, { categoria: 'asc' }, { ordem: 'asc' }, { label: 'asc' }],
    });
  }
  async createVariable(dto: CreateEmailVariableDto) { return this.prisma.emailVariable.create({ data: dto }); }
  async updateVariable(id: string, dto: UpdateEmailVariableDto) {
    const exists = await this.prisma.emailVariable.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Variável não encontrada');
    return this.prisma.emailVariable.update({ where: { id }, data: dto });
  }
  async removeVariable(id: string) {
    const exists = await this.prisma.emailVariable.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Variável não encontrada');
    return this.prisma.emailVariable.delete({ where: { id } });
  }

  // Seed
  async seedPacoteInicial() {
    const c1 = await this.prisma.emailTemplate.count();
    const c2 = await this.prisma.emailVariable.count();
    if (c1 > 0 || c2 > 0) return { skipped: true, message: `Já existem templates (${c1}) ou variáveis (${c2})`, totalTpl: c1, totalVar: c2 };

    const vars = [
      { categoria: 'Tutor', chave: 'tutor_nome', label: 'Nome do tutor', exemplo: 'Cintia', ordem: 1 },
      { categoria: 'Tutor', chave: 'tutor_primeiro_nome', label: 'Primeiro nome do tutor', exemplo: 'Cintia', ordem: 2 },
      { categoria: 'Tutor', chave: 'tutor_email', label: 'E-mail do tutor', exemplo: 'cintia@exemplo.com', ordem: 3 },
      { categoria: 'Tutor', chave: 'tutor_telefone', label: 'Telefone do tutor', exemplo: '85 99999-9999', ordem: 4 },
      { categoria: 'Pet', chave: 'pet_nome', label: 'Nome do pet', exemplo: 'Mel', ordem: 1 },
      { categoria: 'Pet', chave: 'pet_especie', label: 'Espécie', exemplo: 'Cão', ordem: 2 },
      { categoria: 'Pet', chave: 'pet_raca', label: 'Raça', exemplo: 'SRD', ordem: 3 },
      { categoria: 'Pet', chave: 'pet_idade', label: 'Idade', exemplo: '5 anos', ordem: 4 },
      { categoria: 'Atendimento', chave: 'consulta_data', label: 'Data da consulta', exemplo: '15/06/2026', ordem: 1 },
      { categoria: 'Atendimento', chave: 'consulta_hora', label: 'Hora da consulta', exemplo: '14:30', ordem: 2 },
      { categoria: 'Atendimento', chave: 'profissional_nome', label: 'Profissional', exemplo: 'Dra. Vivian', ordem: 3 },
      { categoria: 'Atendimento', chave: 'servico', label: 'Serviço/Procedimento', exemplo: 'Consulta integrativa', ordem: 4 },
      { categoria: 'Clínica', chave: 'clinica_nome', label: 'Nome da clínica', exemplo: 'Empório do Pet', ordem: 1 },
      { categoria: 'Clínica', chave: 'clinica_endereco', label: 'Endereço', exemplo: 'Rua X, 123 - Fortaleza', ordem: 2 },
      { categoria: 'Clínica', chave: 'clinica_telefone', label: 'Telefone', exemplo: '85 3333-3333', ordem: 3 },
      { categoria: 'Clínica', chave: 'clinica_whatsapp', label: 'WhatsApp', exemplo: '85 99999-0000', ordem: 4 },
      { categoria: 'Financeiro', chave: 'valor', label: 'Valor', exemplo: 'R$ 250,00', ordem: 1 },
      { categoria: 'Financeiro', chave: 'chave_pix', label: 'Chave PIX', exemplo: 'emporio@pix', ordem: 2 },
    ];
    for (const v of vars) await this.prisma.emailVariable.create({ data: v });

    const wrap = (title: string, body: string) => `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Helvetica,Arial,sans-serif;background:#FAF7F2;padding:20px;color:#333;line-height:1.6"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #E5DCC9"><h1 style="color:#3C3489;margin-top:0">${title}</h1>${body}<hr style="border:none;border-top:1px solid #E5DCC9;margin:24px 0"><p style="font-size:12px;color:#888">Empório do Pet — clínica veterinária integrativa em Fortaleza<br>{{clinica_endereco}} · {{clinica_telefone}}</p></div></body></html>`;

    const templates = [
      {
        nome: 'Boas-vindas ao Empório',
        assunto: 'Bem-vinda(o) ao Empório do Pet, {{tutor_primeiro_nome}}! 🐾',
        categoria: 'BOAS_VINDAS' as const,
        descricao: 'E-mail de boas-vindas para novos tutores cadastrados',
        corpoHtml: wrap('Bem-vinda(o) ao Empório do Pet! 🌿', `<p>Oi, <strong>{{tutor_primeiro_nome}}</strong>!</p><p>É um prazer ter você e o(a) <strong>{{pet_nome}}</strong> com a gente. Aqui no Empório acreditamos no cuidado integrativo: medicina convencional + acupuntura + fitoterapia + nutrição funcional.</p><p>Conta com a gente pra cuidar do seu pet com carinho. Qualquer dúvida, é só responder esse e-mail ou chamar pelo WhatsApp: {{clinica_whatsapp}}.</p><p>Com carinho,<br><strong>Equipe Empório 💚</strong></p>`),
      },
      {
        nome: 'Confirmação de agendamento',
        assunto: 'Consulta de {{pet_nome}} confirmada para {{consulta_data}}',
        categoria: 'TRANSACIONAL' as const,
        descricao: 'Confirmação automática após agendamento',
        corpoHtml: wrap('Agendamento confirmado ✅', `<p>Oi, <strong>{{tutor_primeiro_nome}}</strong>!</p><p>Sua consulta está confirmada:</p><table style="width:100%;margin:16px 0"><tr><td style="padding:8px 0"><strong>🐾 Paciente:</strong></td><td>{{pet_nome}}</td></tr><tr><td style="padding:8px 0"><strong>👩‍⚕️ Profissional:</strong></td><td>{{profissional_nome}}</td></tr><tr><td style="padding:8px 0"><strong>📅 Data:</strong></td><td>{{consulta_data}} às {{consulta_hora}}</td></tr><tr><td style="padding:8px 0"><strong>📍 Local:</strong></td><td>{{clinica_endereco}}</td></tr></table><p>Caso precise reagendar, é só nos chamar pelo WhatsApp: {{clinica_whatsapp}}.</p>`),
      },
      {
        nome: 'Resultado de exame disponível',
        assunto: 'Resultado do exame de {{pet_nome}} chegou 📋',
        categoria: 'TRANSACIONAL' as const,
        descricao: 'Notifica que o exame está pronto',
        corpoHtml: wrap('Resultado do exame está pronto 📋', `<p>Oi, <strong>{{tutor_primeiro_nome}}</strong>!</p><p>O resultado do exame do(a) <strong>{{pet_nome}}</strong> chegou.</p><p>A <strong>{{profissional_nome}}</strong> está analisando e vai te chamar pra conversar sobre os próximos passos.</p><p>Qualquer dúvida, estamos no WhatsApp: {{clinica_whatsapp}}.</p>`),
      },
      {
        nome: 'Niver do pet',
        assunto: 'Hoje é o dia do(a) {{pet_nome}}! 🎂',
        categoria: 'ANIVERSARIO' as const,
        descricao: 'Mensagem carinhosa no aniversário do pet',
        corpoHtml: wrap('Parabéns, {{pet_nome}}! 🎂🐾', `<p>Oi, <strong>{{tutor_primeiro_nome}}</strong>!</p><p>Toda equipe do Empório do Pet manda muitos beijinhos pro(a) <strong>{{pet_nome}}</strong> nesse dia especial!</p><p>Que venham mais um monte de anos de saúde, brincadeiras e ronronos/abanos 💚</p><p>Com carinho,<br><strong>Equipe Empório 🐾</strong></p>`),
      },
      {
        nome: 'Reengajamento de inativos',
        assunto: 'Saudades suas e do(a) {{pet_nome}}!',
        categoria: 'REENGAJAMENTO' as const,
        descricao: 'Pra clientes que não voltam há um tempo',
        corpoHtml: wrap('Que saudade!', `<p>Oi, <strong>{{tutor_primeiro_nome}}</strong>!</p><p>Faz um tempinho que não vemos o(a) <strong>{{pet_nome}}</strong> por aqui 🐾</p><p>Como ele(a) está? Aproveita pra agendar um check-up — a medicina preventiva é o caminho mais carinhoso pra uma vida longa.</p><p>É só nos chamar: {{clinica_whatsapp}}.</p>`),
      },
      {
        nome: 'Cobrança amigável',
        assunto: 'Lembrete: valor em aberto de {{pet_nome}}',
        categoria: 'TRANSACIONAL' as const,
        descricao: 'Aviso amigável sobre pagamento pendente',
        corpoHtml: wrap('Lembrete de pagamento 💚', `<p>Oi, <strong>{{tutor_primeiro_nome}}</strong>!</p><p>Tudo bem? Identifiquei aqui que o valor de <strong>{{valor}}</strong> referente ao atendimento do(a) {{pet_nome}} ainda está em aberto.</p><p>Se precisar de ajuda com o pagamento, podemos enviar a chave PIX: <strong>{{chave_pix}}</strong></p><p>Qualquer coisa, é só responder esse e-mail.</p>`),
      },
    ];
    for (const t of templates) await this.prisma.emailTemplate.create({ data: t });

    return { skipped: false, templatesCriados: templates.length, variaveisCriadas: vars.length };
  }

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    const CAT_MAP: Record<string, string> = {
      'transacional': 'TRANSACIONAL', 'boas_vindas': 'BOAS_VINDAS', 'boas-vindas': 'BOAS_VINDAS',
      'educativo': 'EDUCATIVO', 'promocional': 'PROMOCIONAL', 'aniversario': 'ANIVERSARIO',
      'aniversário': 'ANIVERSARIO', 'reengajamento': 'REENGAJAMENTO', 'outro': 'OUTRO',
    };
    for (const r of rows) {
      const nome = r.nome;
      const assunto = r.assunto;
      const corpoHtml = r.corpoHtml || r.corpo_html || r.corpo;
      if (!nome || !assunto || !corpoHtml) { ignorados++; continue; }
      const catKey = (r.categoria || 'transacional').toString().toLowerCase().trim();
      const data: any = {
        nome, assunto, corpoHtml,
        corpoTexto: r.corpoTexto || r.corpo_texto || null,
        categoria: (CAT_MAP[catKey] || 'OUTRO') as any,
        descricao: r.descricao || null,
        ativo: r.ativo !== undefined ? r.ativo : true,
        ordem: r.ordem ?? 0,
      };
      const existente = await this.prisma.emailTemplate.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' } } });
      if (existente) {
        if (!upsert) { ignorados++; continue; }
        await this.prisma.emailTemplate.update({ where: { id: existente.id }, data });
        atualizados++;
      } else {
        await this.prisma.emailTemplate.create({ data });
        criados++;
      }
    }
    return { criados, atualizados, ignorados };
  }
}
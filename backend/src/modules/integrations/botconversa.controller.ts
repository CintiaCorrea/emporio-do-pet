import { Body, Controller, HttpCode, Post, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

interface WebhookBody {
  subscriber_id?: string;

  // Telefone — vários aliases
  phone?: string;
  full_phone?: string;
  telefone?: string;

  // Tutor / Lead — aliases
  tutor_nome?: string;
  nome?: string;
  nome_completo?: string;
  name?: string;
  email?: string;

  // Classificação
  tipo_contato?: string;  // 'Lead' | 'Cliente' (informativo)
  trigger?: string;       // 'primeira_msg' | 'fim_fluxo' etc

  // Pet
  pet_nome?: string;
  pet_especie?: string;
  pet_idade?: string;

  // Resumo IA
  resumo_ia?: string;
  ResumoIA?: string;
  atualizado_em?: string;

  // Origem / canal / serviço
  canal?: string;
  origem?: string;
  servico_interesse?: string;

  // Tags do BC (vem como array de strings do poll)
  tags?: string[];

  // Permitir QUALQUER outro campo extra (não falha validação)
  [key: string]: any;
}

function onlyDigits(s?: string): string { return (s || '').replace(/\D/g, ''); }
function last9(s: string): string { return s.length > 9 ? s.slice(-9) : s; }

function mapEspecieToEnum(es?: string): string {
  if (!es) return 'OTHER';
  const k = es.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (k.match(/\b(cao|cachorro|canin|dog)/)) return 'CANINE';
  if (k.match(/\b(gat|felin|cat)/)) return 'FELINE';
  if (k.match(/\b(passaro|bird|ave)/)) return 'BIRD';
  if (k.match(/\b(roedor|rodent)/)) return 'RODENT';
  if (k.match(/\b(reptil|reptile)/)) return 'REPTILE';
  if (k.match(/\b(peixe|fish)/)) return 'FISH';
  return 'OTHER';
}

function mapSource(origem?: string, canal?: string): string {
  const v = (origem || canal || '').toLowerCase();
  if (v.includes('instagram')) return 'INSTAGRAM';
  if (v.includes('facebook')) return 'FACEBOOK';
  if (v.includes('google')) return 'GOOGLE_ADS';
  if (v.includes('tiktok')) return 'TIKTOK';
  if (v.includes('indica')) return 'REFERRAL';
  if (v.includes('email')) return 'EMAIL';
  if (v.includes('whats') || v.includes('zap')) return 'WHATSAPP';
  if (v.includes('direto') || v.includes('direct')) return 'DIRECT';
  if (v.includes('organi')) return 'ORGANIC';
  if (v.includes('landing')) return 'LANDING_PAGE';
  return 'WHATSAPP';
}

@ApiTags('integrations')
@Controller('integrations/botconversa')
export class BotConversaController {
  private readonly logger = new Logger(BotConversaController.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Pega o user "dono" para autoria das Interacoes BC.
   */
  private async getOwnerUserId(): Promise<string | null> {
    const owner =
      (await this.prisma.user.findFirst({ where: { role: 'ADMIN' as any }, orderBy: { createdAt: 'asc' } })) ||
      (await this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } }));
    return owner?.id || null;
  }

  /**
   * Cria Interacao com canal "WhatsApp BC" para alimentar a Caixa de Entrada.
   * Idempotente: se ja existe uma do mesmo dia pro mesmo lead/tutor, atualiza ela.
   */
  private async recordInteracaoBC(opts: {
    leadId?: string;
    tutorId?: string;
    ownerId: string | null;
    texto: string;
  }) {
    if (!opts.ownerId) return;
    if (!opts.leadId && !opts.tutorId) return;
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const orClause: any[] = [];
      if (opts.leadId) orClause.push({ leadId: opts.leadId });
      if (opts.tutorId) orClause.push({ tutorId: opts.tutorId });
      const existing = await this.prisma.interacao.findFirst({
        where: {
          canal: 'WhatsApp BC',
          createdAt: { gte: todayStart },
          OR: orClause,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await this.prisma.interacao.update({
          where: { id: existing.id },
          data: { texto: opts.texto, updatedAt: new Date() },
        });
        return;
      }
      await this.prisma.interacao.create({
        data: {
          canal: 'WhatsApp BC',
          tipo: 'NOTA',
          texto: opts.texto,
          autorUserId: opts.ownerId,
          leadId: opts.leadId,
          tutorId: opts.tutorId,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Falha ao registrar Interacao BC: ${e?.message || e}`);
    }
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() body: WebhookBody) {
    const result: any = { ok: true, tutorsUpdated: 0, leadsUpdated: 0, petsCreated: 0, leadCreated: false, warnings: [] as string[] };

    try {
      if (!body || typeof body !== 'object') {
        result.ok = false; result.warnings.push('empty body');
        return result;
      }

      const phoneRaw = body.phone || body.full_phone || body.telefone || '';
      const phoneDigits = onlyDigits(phoneRaw);
      if (!phoneDigits) {
        result.ok = false; result.warnings.push('phone is required (use phone, full_phone or telefone)');
        return result;
      }

      const updatedAt = body.atualizado_em ? new Date(body.atualizado_em) : new Date();
      const resumo = (body.resumo_ia || body.ResumoIA || '').toString().trim() || null;
      const tutorName = (body.tutor_nome || body.nome_completo || body.nome || body.name || '').toString().trim();
      const email = (body.email || '').toString().trim();
      const petName = (body.pet_nome || '').toString().trim();
      const petEspecie = mapEspecieToEnum(body.pet_especie);
      const petIdade = (body.pet_idade || '').toString().trim();
      const servicoInteresse = (body.servico_interesse || '').toString().trim();

      const tagsArr: string[] = Array.isArray(body.tags) ? body.tags.filter(t => typeof t === 'string') : [];
      // Cliente se: tipo_contato='cliente'/'client' OU tem tag literal "Cliente"
      const ehCliente =
        (body.tipo_contato || '').toLowerCase().includes('client') ||
        tagsArr.some(t => /^(fu-)?cliente$/i.test(t));

      const ownerId = await this.getOwnerUserId();
      const textoInteracao = resumo || `Contato via BotConversa (trigger: ${body.trigger || 'desconhecido'})`;

      // 1) Tutor existente
      let tutors: any[] = [];
      try {
        tutors = await this.prisma.tutor.findMany({
          where: { contacts: { some: { number: { contains: last9(phoneDigits) } } } },
          select: { id: true, name: true, pets: { select: { id: true, name: true } } },
          take: 5,
        });
      } catch (e: any) {
        result.warnings.push(`tutor search failed: ${e?.message || e}`);
      }

      for (const t of tutors) {
        try {
          await this.prisma.tutor.update({
            where: { id: t.id },
            data: {
              ...(resumo != null && { resumoIa: resumo, resumoIaUpdatedAt: updatedAt }),
            } as any,
          });
          result.tutorsUpdated++;
        } catch (e: any) {
          result.warnings.push(`tutor ${t.id} update failed: ${e?.message || e}`);
        }

        await this.recordInteracaoBC({ tutorId: t.id, ownerId, texto: textoInteracao });

        // Pet auto-create REMOVIDO: cliente respondia mensagens livres no campo
        // pet_nome do BC. Equipe cadastra Pet manualmente apos confirmar o nome real.
      }

      // 2) Lead existente
      let leads: any[] = [];
      try {
        leads = await this.prisma.lead.findMany({
          where: { phone: { contains: last9(phoneDigits) } },
          select: { id: true, customFields: true, name: true, email: true, tags: true },
          take: 5,
        });
      } catch (e: any) {
        result.warnings.push(`lead search failed: ${e?.message || e}`);
      }

      for (const l of leads) {
        // Se tag indica Cliente E nao tem tutor ainda, promove Lead -> Tutor
        if (ehCliente && tutors.length === 0) {
          try {
            const tutor = await this.prisma.tutor.create({
              data: {
                name: tutorName || l.name || 'Cliente BotConversa',
                isActive: true,
                ...(resumo != null && { resumoIa: resumo, resumoIaUpdatedAt: updatedAt }),
                contacts: { create: [{ type: 'MOBILE', number: phoneDigits, isPrimary: true, isWhatsApp: true }] },
                ...(l.email && l.email.includes('@') && !l.email.includes('@emporiodopet.crm') ? { email: l.email } : {}),
              } as any,
            });
            await this.prisma.lead.update({
              where: { id: l.id },
              data: { lastActivityAt: new Date() } as any,
            }).catch(() => {});
            await this.recordInteracaoBC({ tutorId: tutor.id, ownerId, texto: textoInteracao });
            result.tutorCreated = true;
            result.tutorId = tutor.id;
            result.promotedFromLead = l.id;
            return result;
          } catch (e: any) {
            result.warnings.push(`lead->tutor promotion failed: ${e?.message || e}`);
          }
        }

        try {
          const existingCf = (l.customFields as any) || {};
          const newCf: any = { ...existingCf };
          if (petName) newCf.petName = petName;
          if (body.pet_especie) newCf.especie = body.pet_especie;
          if (petIdade) newCf.idade = petIdade;
          if (body.canal) newCf.canal = body.canal;
          if (servicoInteresse) newCf.servicoInteresse = servicoInteresse;
          if (body.trigger) newCf.triggerBC = body.trigger;
          if (body.tipo_contato) newCf.tipoContatoBC = body.tipo_contato;

          await this.prisma.lead.update({
            where: { id: l.id },
            data: {
              ...(resumo != null && { resumoIa: resumo, resumoIaUpdatedAt: updatedAt }),
              customFields: newCf,
              ...(tutorName && !l.name ? { name: tutorName } : {}),
              lastActivityAt: new Date(),
            } as any,
          });
          result.leadsUpdated++;
        } catch (e: any) {
          result.warnings.push(`lead ${l.id} update failed: ${e?.message || e}`);
        }

        await this.recordInteracaoBC({ leadId: l.id, ownerId, texto: textoInteracao });
      }

      // 3) Auto-criar Tutor (se BC marcou como Cliente) OU Lead (default)
      if (tutors.length === 0 && leads.length === 0) {
        if (ehCliente) {
          try {
            const tutor = await this.prisma.tutor.create({
              data: {
                name: tutorName || 'Sem nome',
                isActive: true,
                ...(resumo != null && { resumoIa: resumo, resumoIaUpdatedAt: updatedAt }),
                contacts: { create: [{ type: 'MOBILE', number: phoneDigits, isPrimary: true, isWhatsApp: true }] },
                ...(email && email.includes('@') ? { email } : {}),
              } as any,
            });
            await this.recordInteracaoBC({ tutorId: tutor.id, ownerId, texto: textoInteracao });
            result.tutorCreated = true;
            result.tutorId = tutor.id;
            return result;
          } catch (e: any) {
            result.warnings.push(`tutor auto-create failed: ${e?.message || e}`);
          }
        }
        const emailFallback = `contato+${phoneDigits}@emporiodopet.crm`;
        const finalEmail = email && email.includes('@') ? email : emailFallback;
        const source = mapSource(body.origem, body.canal);

        try {
          const lead = await this.prisma.lead.create({
            data: {
              name: tutorName || null,
              phone: phoneDigits,
              email: finalEmail,
              source: source as any,
              status: 'NEW' as any,
              ...(resumo != null && { resumoIa: resumo, resumoIaUpdatedAt: updatedAt }),
              customFields: {
                ...(petName && { petName }),
                ...(body.pet_especie && { especie: body.pet_especie }),
                ...(petIdade && { idade: petIdade }),
                ...(servicoInteresse && { servicoInteresse }),
                ...(body.trigger && { triggerBC: body.trigger }),
                ...(body.tipo_contato && { tipoContatoBC: body.tipo_contato }),
                canal: body.canal || 'WhatsApp',
                fonte: 'BotConversa Webhook',
              },
            } as any,
          });
          await this.recordInteracaoBC({ leadId: lead.id, ownerId, texto: textoInteracao });
          result.leadCreated = true;
          result.leadId = lead.id;
        } catch (e: any) {
          const msg = String(e?.message || e);
          result.warnings.push(`lead create failed: ${msg.slice(0, 200)}`);
        }
      }
    } catch (outerError: any) {
      this.logger.error(`BotConversa webhook outer error: ${outerError?.message || outerError}`);
      result.ok = false;
      result.warnings.push(`outer error: ${outerError?.message || outerError}`);
    }

    return result;
  }
}

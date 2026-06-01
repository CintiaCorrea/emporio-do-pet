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
  name?: string;
  email?: string;

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

  // Permitir QUALQUER outro campo extra (não falha validação)
  [key: string]: any;
}

function onlyDigits(s?: string): string { return (s || '').replace(/\D/g, ''); }

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
  return 'WHATSAPP'; // default razoável quando vem do BotConversa
}

@ApiTags('integrations')
@Controller('integrations/botconversa')
export class BotConversaController {
  private readonly logger = new Logger(BotConversaController.name);
  constructor(private prisma: PrismaService) {}

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
      const tutorName = (body.tutor_nome || body.nome || body.name || '').toString().trim();
      const email = (body.email || '').toString().trim();
      const petName = (body.pet_nome || '').toString().trim();
      const petEspecie = mapEspecieToEnum(body.pet_especie);
      const petIdade = (body.pet_idade || '').toString().trim();
      const servicoInteresse = (body.servico_interesse || '').toString().trim();

      // 1) Tutor existente
      let tutors: any[] = [];
      try {
        tutors = await this.prisma.tutor.findMany({
          where: { contacts: { some: { number: { contains: phoneDigits } } } },
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

        // Pet auto-criar se webhook mandou e não existe
        if (petName) {
          const exists = t.pets.some((p: any) => (p.name || '').toLowerCase().trim() === petName.toLowerCase());
          if (!exists) {
            try {
              await this.prisma.pet.create({
                data: {
                  name: petName,
                  species: petEspecie as any,
                  tutorId: t.id,
                  status: 'ACTIVE',
                  observations: petIdade ? `Idade informada via BotConversa: ${petIdade}` : null,
                },
              });
              result.petsCreated++;
            } catch (e: any) {
              result.warnings.push(`pet ${petName} create failed: ${e?.message || e}`);
            }
          }
        }
      }

      // 2) Lead existente
      let leads: any[] = [];
      try {
        leads = await this.prisma.lead.findMany({
          where: { phone: { contains: phoneDigits } },
          select: { id: true, customFields: true, name: true },
          take: 5,
        });
      } catch (e: any) {
        result.warnings.push(`lead search failed: ${e?.message || e}`);
      }

      for (const l of leads) {
        try {
          const existingCf = (l.customFields as any) || {};
          const newCf: any = { ...existingCf };
          if (petName) newCf.petName = petName;
          if (body.pet_especie) newCf.especie = body.pet_especie;
          if (petIdade) newCf.idade = petIdade;
          if (body.canal) newCf.canal = body.canal;
          if (servicoInteresse) newCf.servicoInteresse = servicoInteresse;

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
      }

      // 3) Auto-criar Lead se nada existe
      if (tutors.length === 0 && leads.length === 0) {
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
                canal: body.canal || 'WhatsApp',
                fonte: 'BotConversa Webhook',
              },
            } as any,
          });
          result.leadCreated = true;
          result.leadId = lead.id;
        } catch (e: any) {
          // Pode ser duplicate de email (raro com fallback +phone), tenta sem email
          const msg = String(e?.message || e);
          result.warnings.push(`lead create failed: ${msg.slice(0, 200)}`);
        }
      }
    } catch (outerError: any) {
      // Captura tudo — webhook nunca deve retornar 500
      this.logger.error(`BotConversa webhook outer error: ${outerError?.message || outerError}`);
      result.ok = false;
      result.warnings.push(`outer error: ${outerError?.message || outerError}`);
    }

    return result;
  }
}

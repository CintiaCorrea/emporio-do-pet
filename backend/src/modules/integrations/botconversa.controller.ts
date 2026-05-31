import { Body, Controller, HttpCode, Post, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

interface WebhookBody {
  // Identificação
  subscriber_id?: string;
  phone?: string;

  // Tutor / Lead
  tutor_nome?: string;
  nome?: string; // alias
  email?: string;

  // Pet (opcional)
  pet_nome?: string;
  pet_especie?: string;
  pet_idade?: string;

  // Resumo IA
  resumo_ia?: string;
  atualizado_em?: string;

  // Campanha / canal (opcional)
  canal?: string;
  origem?: string;
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

@ApiTags('integrations')
@Controller('integrations/botconversa')
export class BotConversaController {
  private readonly logger = new Logger(BotConversaController.name);
  constructor(private prisma: PrismaService) {}

  // BotConversa → resumo + auto-cadastro de Lead se não existe
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Body() body: WebhookBody) {
    if (!body || (!body.phone && !body.subscriber_id)) {
      throw new BadRequestException('phone or subscriber_id required');
    }
    const phoneDigits = onlyDigits(body.phone);
    if (!phoneDigits) {
      throw new BadRequestException('phone must contain digits');
    }

    const updatedAt = body.atualizado_em ? new Date(body.atualizado_em) : new Date();
    const resumo = body.resumo_ia ?? null;
    const tutorName = (body.tutor_nome || body.nome || '').trim();
    const email = (body.email || '').trim();
    const petName = (body.pet_nome || '').trim();
    const petEspecie = mapEspecieToEnum(body.pet_especie);
    const petIdade = (body.pet_idade || '').trim();

    const result: any = { ok: true, tutorsUpdated: 0, leadsUpdated: 0, petsCreated: 0, leadCreated: false };

    // 1) Procurar Tutor existente pelo telefone
    const tutors = await this.prisma.tutor.findMany({
      where: { contacts: { some: { number: { contains: phoneDigits } } } },
      select: { id: true, name: true, pets: { select: { id: true, name: true } } },
    });

    for (const t of tutors) {
      // Atualizar resumo IA
      await this.prisma.tutor.update({
        where: { id: t.id },
        data: { resumoIa: resumo, resumoIaUpdatedAt: updatedAt } as any,
      });
      result.tutorsUpdated++;

      // Se webhook mandou nome de pet e ele ainda não existe, criar
      if (petName && !t.pets.some((p) => p.name.toLowerCase().trim() === petName.toLowerCase())) {
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
        } catch (e) {
          this.logger.warn(`Failed to auto-create pet ${petName}: ${e}`);
        }
      }
    }

    // 2) Procurar Lead existente pelo telefone
    const leads = await this.prisma.lead.findMany({
      where: { phone: { contains: phoneDigits } },
      select: { id: true, customFields: true, name: true },
    });

    for (const l of leads) {
      const existingCf = (l.customFields as any) || {};
      const newCf: any = { ...existingCf };
      if (petName) newCf.petName = petName;
      if (body.pet_especie) newCf.especie = body.pet_especie;
      if (petIdade) newCf.idade = petIdade;
      if (body.canal) newCf.canal = body.canal;

      await this.prisma.lead.update({
        where: { id: l.id },
        data: {
          resumoIa: resumo,
          resumoIaUpdatedAt: updatedAt,
          customFields: newCf,
          ...(tutorName && !l.name ? { name: tutorName } : {}),
        } as any,
      });
      result.leadsUpdated++;
    }

    // 3) Se nenhum Tutor e nenhum Lead, criar Lead novo
    if (tutors.length === 0 && leads.length === 0) {
      const emailFallback = `contato+${phoneDigits}@emporiodopet.crm`;
      const finalEmail = email && email.includes('@') ? email : emailFallback;

      try {
        const lead = await this.prisma.lead.create({
          data: {
            name: tutorName || null,
            phone: phoneDigits,
            email: finalEmail,
            source: (body.origem === 'Instagram' ? 'INSTAGRAM'
                   : body.origem === 'Facebook' ? 'FACEBOOK'
                   : body.origem === 'Google Ads' ? 'GOOGLE_ADS'
                   : body.origem === 'Indicação' ? 'REFERRAL'
                   : 'WHATSAPP') as any,
            status: 'NEW' as any,
            resumoIa: resumo,
            resumoIaUpdatedAt: updatedAt,
            customFields: {
              petName: petName || undefined,
              especie: body.pet_especie || undefined,
              idade: petIdade || undefined,
              canal: body.canal || 'WhatsApp',
              fonte: 'BotConversa Webhook',
            },
          } as any,
        });
        result.leadCreated = true;
        result.leadId = lead.id;
      } catch (e: any) {
        // Pode ser duplicate de email - se for, ok, ignorar
        if (!String(e?.message || e).match(/unique|duplicate/i)) {
          this.logger.error(`Failed to auto-create lead: ${e}`);
        }
      }
    }

    return result;
  }
}

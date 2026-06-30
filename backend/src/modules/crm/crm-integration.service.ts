import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus, LeadSource } from '@prisma/client';
import { findExistingTutor } from '../../common/tutor-match';
import { last8, onlyDigits, normalizePhone } from '../../common/phone';
import { proximoCodigo } from '../../common/codigo';

export interface WhatsAppLeadData {
  conversationId: string;
  userId: string;
  contactPhone: string;
  contactName?: string;
  firstMessage?: string;
}

export interface LeadConversionData {
  leadId: string;
  userId?: string;
  clientData?: {
    name?: string;
    companyName?: string;
    taxId?: string;
    address?: string;
    notes?: string;
    tags?: string[];
  };
}

export interface LeadScoreChangeEvent {
  leadId: string;
  previousScore: number;
  newScore: number;
  reason?: string;
}

export interface LeadStatusChangeEvent {
  leadId: string;
  previousStatus: LeadStatus;
  newStatus: LeadStatus;
  reason?: string;
}

@Injectable()
export class CrmIntegrationService {
  private readonly logger = new Logger(CrmIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a Lead from a WhatsApp conversation
   */
  async createLeadFromWhatsApp(data: WhatsAppLeadData): Promise<string | null> {
    try {
      // Check if lead already exists by phone
      const existingLead = await this.prisma.lead.findFirst({
        where: {
          OR: [
            { phone: data.contactPhone },
            { phone: { contains: data.contactPhone.slice(-8) } },
          ],
        },
      });

      if (existingLead) {
        // Update existing lead with conversation reference
        await this.prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            whatsappConversationId: data.conversationId,
            lastSeenAt: new Date(),
            lastActivityAt: new Date(),
          },
        });

        // Track event
        await this.prisma.leadEvent.create({
          data: {
            leadId: existingLead.id,
            eventType: 'whatsapp_conversation',
            eventData: {
              name: 'Nova conversa WhatsApp',
              conversationId: data.conversationId,
              firstMessage: data.firstMessage,
            },
          },
        });

        this.logger.log(`Lead ${existingLead.id} linked to WhatsApp conversation ${data.conversationId}`);
        return existingLead.id;
      }

      // Create new lead
      const lead = await this.prisma.lead.create({
        data: {
          name: data.contactName,
          phone: data.contactPhone,
          email: `${data.contactPhone}@whatsapp.lead`, // Placeholder until real email is collected
          source: LeadSource.WHATSAPP,
          sourceDetail: 'whatsapp_conversation',
          status: LeadStatus.NEW,
          whatsappConversationId: data.conversationId,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
        },
      });

      // Create initial event
      await this.prisma.leadEvent.create({
        data: {
          leadId: lead.id,
          eventType: 'lead_created',
          eventData: {
            name: 'Lead criado via WhatsApp',
            conversationId: data.conversationId,
            firstMessage: data.firstMessage,
          },
        },
      });

      // Record history
      await this.prisma.leadHistory.create({
        data: {
          leadId: lead.id,
          action: 'created',
          newValue: 'WhatsApp',
          triggeredBy: 'system',
          metadata: { source: 'whatsapp_conversation' },
        },
      });

      // Emit event for automations
      this.eventEmitter.emit('crm.lead.created', {
        leadId: lead.id,
        source: 'whatsapp',
        conversationId: data.conversationId,
      });

      this.logger.log(`New lead ${lead.id} created from WhatsApp conversation ${data.conversationId}`);
      return lead.id;
    } catch (error) {
      this.logger.error(`Error creating lead from WhatsApp: ${error}`);
      return null;
    }
  }

  /**
   * Convert a Lead to a Client
   */
  /**
   * Numera (codigo sequencial) clientes e pets que ainda nao tem codigo, na ordem de
   * cadastro (createdAt). Idempotente: roda quantas vezes quiser; so preenche os vazios.
   */
  async backfillCodigos() {
    const fazer = async (entidade: 'tutor' | 'pet') => {
      const repo: any = entidade === 'tutor' ? this.prisma.tutor : this.prisma.pet;
      const semCodigo = await repo.findMany({ where: { codigo: null }, select: { id: true }, orderBy: { createdAt: 'asc' } });
      let prox = await proximoCodigo(this.prisma, entidade);
      for (const r of semCodigo) {
        await repo.update({ where: { id: r.id }, data: { codigo: prox } });
        prox++;
      }
      return semCodigo.length;
    };
    const tutoresNumerados = await fazer('tutor');
    const petsNumerados = await fazer('pet');
    return { tutoresNumerados, petsNumerados };
  }

  /**
   * Varredura SOMENTE-LEITURA de duplicidade, na prioridade telefone(8) -> CPF -> email.
   * Lista (a) leads que batem com um cliente existente e (b) clientes duplicados entre si.
   * Nao altera nada — serve para revisao antes da migracao.
   */
  async escanearDuplicados() {
    const [tutores, leads] = await Promise.all([
      this.prisma.tutor.findMany({
        select: { id: true, name: true, cpf: true, email: true, updatedAt: true, contacts: { select: { number: true } } },
      }),
      this.prisma.lead.findMany({
        where: { status: { not: LeadStatus.CONVERTED } },
        select: { id: true, name: true, phone: true, email: true, status: true, createdAt: true },
      }),
    ]);

    const add = (m: Map<string, any[]>, k: string, v: any) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };
    const recente = (arr: any[]) => arr.slice().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    const porTel = new Map<string, any[]>();
    const porCpf = new Map<string, any[]>();
    const porEmail = new Map<string, any[]>();
    for (const t of tutores) {
      for (const c of t.contacts) { const k = last8(c.number); if (k.length >= 8) add(porTel, k, t); }
      const cpf = onlyDigits(t.cpf); if (cpf.length === 11) add(porCpf, cpf, t);
      if (t.email) add(porEmail, t.email.toLowerCase(), t);
    }

    // (a) Leads que batem com um cliente existente
    const leadsDuplicados: any[] = [];
    for (const l of leads) {
      const tail = last8(l.phone);
      let match = tail.length >= 8 ? porTel.get(tail) : undefined;
      let por: 'telefone' | 'email' = 'telefone';
      if ((!match || !match.length) && l.email) { match = porEmail.get(l.email.toLowerCase()); por = 'email'; }
      if (match && match.length) {
        const cli = recente(match);
        leadsDuplicados.push({ lead: { id: l.id, name: l.name, phone: l.phone, status: l.status }, cliente: { id: cli.id, name: cli.name }, por });
      }
    }

    // (b) Clientes duplicados entre si (mesmo telefone8 ou mesmo CPF)
    const clientesDuplicados: any[] = [];
    const vistos = new Set<string>();
    const coletar = (mapa: Map<string, any[]>, por: 'telefone' | 'cpf') => {
      for (const [chave, arr] of mapa) {
        const distintos = [...new Map(arr.map((t) => [t.id, t])).values()];
        if (distintos.length > 1) {
          const id = por + ':' + distintos.map((t) => t.id).sort().join(',');
          if (!vistos.has(id)) { vistos.add(id); clientesDuplicados.push({ por, chave, clientes: distintos.map((t) => ({ id: t.id, name: t.name, updatedAt: t.updatedAt })) }); }
        }
      }
    };
    coletar(porTel, 'telefone');
    coletar(porCpf, 'cpf');

    return {
      resumo: {
        totalClientes: tutores.length,
        totalLeads: leads.length,
        leadsDuplicados: leadsDuplicados.length,
        gruposClientesDuplicados: clientesDuplicados.length,
      },
      leadsDuplicados,
      clientesDuplicados,
    };
  }

  /**
   * Importa um LOTE de clientes (com seus pets) vindos do SimplesVet.
   * - dryRun: só conta, não grava.
   * - limparCodigos: na 1a chamada real, zera os códigos provisórios (evita colisão de unique).
   * - Anti-duplicado: casa por código -> telefone(8)/CPF (findExistingTutor). Casou = atualiza; senão = cria.
   * - Preserva os códigos reais do SimplesVet (cliente e pet).
   */
  async importarSimplesvet(body: { dryRun?: boolean; limparCodigos?: boolean; clientes: any[] }) {
    const dry = !!body.dryRun;
    const res: any = { lote: (body.clientes || []).length, clientesNovos: 0, clientesAtualizados: 0, petsNovos: 0, petsAtualizados: 0, contatosCriados: 0, avisos: [] as string[] };

    if (body.limparCodigos && !dry) {
      await this.comRetry(() => this.prisma.pet.updateMany({ data: { codigo: null } }));
      await this.comRetry(() => this.prisma.tutor.updateMany({ data: { codigo: null } }));
    }

    for (const c of body.clientes || []) {
      try {
        const r = await this.comRetry(() => this.importarCliente(c, dry));
        if (r.clienteNovo) res.clientesNovos++; else res.clientesAtualizados++;
        res.petsNovos += r.petsNovos;
        res.petsAtualizados += r.petsAtualizados;
        res.contatosCriados += r.contatosCriados;
      } catch (e: any) {
        res.avisos.push(`Cliente ${c.codigo || c.nome || '?'}: ${e?.message || 'erro'}`);
      }
    }
    return res;
  }

  /** Repete a operacao reconectando quando a conexao com o banco cai (P1017 etc.). */
  private async comRetry<T>(fn: () => Promise<T>, tentativas = 4): Promise<T> {
    for (let i = 0; ; i++) {
      try {
        return await fn();
      } catch (e: any) {
        const msg = e?.message || '';
        const conn = e?.code === 'P1017' || e?.code === 'P1001' || /closed the connection|reach database|ECONNRESET|Connection terminated|server closed/i.test(msg);
        if (conn && i < tentativas) {
          try { await this.prisma.$connect(); } catch {}
          await new Promise((r) => setTimeout(r, 500 * (i + 1)));
          continue;
        }
        throw e;
      }
    }
  }

  /** Importa um unico cliente + pets. Idempotente (casa por codigo/telefone/CPF) -> seguro para retry. */
  private async importarCliente(c: any, dry: boolean) {
    const G = (s: any) => (typeof s === 'string' && s.trim() !== '' ? s.trim() : undefined);
    const D = (s: any) => { const v = G(s); if (!v) return undefined; const d = new Date(v); return isNaN(d.getTime()) ? undefined : d; };
    const N = (s: any) => (s === null || s === undefined || s === '' ? undefined : Number(s));
    const out = { clienteNovo: false, petsNovos: 0, petsAtualizados: 0, contatosCriados: 0 };

    let tutorId: string | null = null;
    if (c.codigo != null) {
      const porCod = await this.prisma.tutor.findUnique({ where: { codigo: c.codigo }, select: { id: true } });
      if (porCod) tutorId = porCod.id;
    }
    if (!tutorId) {
      const m = await findExistingTutor(this.prisma, { phone: c.telefones?.[0], cpf: c.cpf, email: c.email });
      if (m) tutorId = m.id;
    }
    out.clienteNovo = !tutorId;

    const dataTutor: any = {
      name: G(c.nome) || 'Cliente sem nome',
      codigo: c.codigo ?? undefined,
      cpf: G(c.cpf), rg: G(c.rg), gender: G(c.sexo), birthDate: D(c.nascimento), email: G(c.email),
      howFoundUs: G(c.origem),
      cep: G(c.cep), address: G(c.endereco), neighborhood: G(c.bairro), city: G(c.cidade), state: G(c.uf),
      tags: Array.isArray(c.tags) && c.tags.length ? c.tags : undefined,
      rankingAbc: G(c.rankingAbc), nps: N(c.nps), ticketMedio: N(c.ticketMedio),
      primeiraCompraAt: D(c.primeiraCompra), ultimaVendaAt: D(c.ultimaVenda),
      classificacao: 'Cliente', status: 'ACTIVE',
    };

    if (dry) {
      for (const p of c.pets || []) {
        const ex = p.codigo != null ? await this.prisma.pet.findUnique({ where: { codigo: p.codigo }, select: { id: true } }) : null;
        if (ex) out.petsAtualizados++; else out.petsNovos++;
      }
      return out;
    }

    if (tutorId) {
      await this.prisma.tutor.update({ where: { id: tutorId }, data: dataTutor });
    } else {
      const criado = await this.prisma.tutor.create({ data: dataTutor });
      tutorId = criado.id;
    }

    for (const tel of c.telefones || []) {
      const num = normalizePhone(tel); const tail = last8(tel);
      if (!num || tail.length < 8) continue;
      const existe = await this.prisma.contact.findFirst({ where: { tutorId, number: { endsWith: tail } }, select: { id: true } });
      if (!existe) {
        const qtd = await this.prisma.contact.count({ where: { tutorId } });
        await this.prisma.contact.create({ data: { tutorId, number: num, type: 'MOBILE', isWhatsApp: true, isPrimary: qtd === 0 } });
        out.contatosCriados++;
      }
    }

    for (const p of c.pets || []) {
      const dataPet: any = {
        name: G(p.nome) || 'Sem nome', codigo: p.codigo ?? undefined,
        species: G(p.especie) || 'CANINE', breed: G(p.raca), coatColor: G(p.pelagem),
        sterilization: G(p.esterilizacao), birthDate: D(p.nascimento), gender: G(p.sexo),
        microchip: G(p.microchip), pedigree: G(p.pedigree), status: G(p.status) || 'ACTIVE', tutorId,
      };
      const ex = p.codigo != null ? await this.prisma.pet.findUnique({ where: { codigo: p.codigo }, select: { id: true } }) : null;
      if (ex) { await this.prisma.pet.update({ where: { id: ex.id }, data: dataPet }); out.petsAtualizados++; }
      else { await this.prisma.pet.create({ data: dataPet }); out.petsNovos++; }
    }
    return out;
  }

  async convertLeadToTutor(data: LeadConversionData): Promise<string | null> {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: data.leadId },
        include: { enrichment: true },
      });

      if (!lead) {
        this.logger.warn(`Lead ${data.leadId} not found for conversion`);
        return null;
      }

      // Check if already converted
      if (lead.convertedToTutorId) {
        this.logger.warn(`Lead ${data.leadId} already converted to tutor ${lead.convertedToTutorId}`);
        return lead.convertedToTutorId;
      }

      // Reconhece cliente ja existente pela prioridade: telefone(8 digitos) -> CPF -> email.
      // (Antes so conferia email, o que deixava passar duplicados por telefone.)
      const existingTutor = await findExistingTutor(this.prisma, {
        phone: lead.phone,
        email: lead.email,
      });

      if (existingTutor) {
        // Link to existing tutor and ensure classificacao=Cliente
        await this.prisma.tutor.update({
          where: { id: existingTutor.id },
          data: { classificacao: 'Cliente' },
        });
        await this.prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: LeadStatus.CONVERTED,
            convertedAt: new Date(),
            convertedToTutorId: existingTutor.id,
          },
        });

        this.logger.log(`Lead ${lead.id} vinculado ao cliente ${existingTutor.id} (por ${existingTutor.matchedBy})`);
        return existingTutor.id;
      }

      // Create new tutor (cliente unificado)
      const tutor = await this.prisma.tutor.create({
        data: {
          name: data.clientData?.name || lead.name || 'Cliente sem nome',
          email: lead.email,
          companyName: data.clientData?.companyName,
          cnpj: data.clientData?.taxId,
          observations: data.clientData?.notes,
          tags: data.clientData?.tags || lead.tags,
          classificacao: 'Cliente',
          status: 'ACTIVE',
          convertedFromLeadId: lead.id,
        },
      });

      // Update lead
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAt: new Date(),
          convertedToTutorId: tutor.id,
        },
      });

      // Record history
      await this.prisma.leadHistory.create({
        data: {
          leadId: lead.id,
          action: 'converted',
          field: 'status',
          oldValue: lead.status,
          newValue: LeadStatus.CONVERTED,
          triggeredBy: data.userId || 'system',
          metadata: { tutorId: tutor.id },
        },
      });

      // Emit events
      this.eventEmitter.emit('crm.lead.converted', {
        leadId: lead.id,
        tutorId: tutor.id,
      });

      this.eventEmitter.emit('crm.tutor.created', {
        tutorId: tutor.id,
        convertedFromLeadId: lead.id,
      });

      this.logger.log(`Lead ${lead.id} converted to tutor ${tutor.id}`);
      return tutor.id;
    } catch (error) {
      this.logger.error(`Error converting lead to tutor: ${error}`);
      return null;
    }
  }

  /**
   * Handle lead score change
   */
  async handleScoreChange(event: LeadScoreChangeEvent): Promise<void> {
    const { leadId, previousScore, newScore } = event;

    // Record history
    await this.prisma.leadHistory.create({
      data: {
        leadId,
        action: 'score_update',
        field: 'currentScore',
        oldValue: previousScore.toString(),
        newValue: newScore.toString(),
        triggeredBy: 'system',
        metadata: { reason: event.reason },
      },
    });

    // Emit event for automations
    this.eventEmitter.emit('crm.lead.score_changed', {
      leadId,
      previousScore,
      newScore,
      scoreDelta: newScore - previousScore,
    });

    // Check for qualification threshold
    if (previousScore < 70 && newScore >= 70) {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
      });

      if (lead && lead.status === LeadStatus.ENRICHED) {
        await this.prisma.lead.update({
          where: { id: leadId },
          data: { status: LeadStatus.QUALIFIED },
        });

        this.eventEmitter.emit('crm.lead.qualified', {
          leadId,
          score: newScore,
        });
      }
    }
  }

  /**
   * Handle lead status change
   */
  async handleStatusChange(event: LeadStatusChangeEvent): Promise<void> {
    const { leadId, previousStatus, newStatus } = event;

    // Record history
    await this.prisma.leadHistory.create({
      data: {
        leadId,
        action: 'status_change',
        field: 'status',
        oldValue: previousStatus,
        newValue: newStatus,
        triggeredBy: 'system',
        metadata: { reason: event.reason },
      },
    });

    // Emit event for automations
    this.eventEmitter.emit('crm.lead.status_changed', {
      leadId,
      previousStatus,
      newStatus,
    });
  }

  /**
   * Get CRM statistics
   */
  async getStats(userId?: string): Promise<{
    leads: {
      total: number;
      new: number;
      qualified: number;
      converted: number;
      averageScore: number;
    };
    clients: {
      total: number;
      active: number;
      fromLeads: number;
      totalRevenue: number;
    };
    conversions: {
      rate: number;
      thisMonth: number;
      lastMonth: number;
    };
  }> {
    const now = new Date();
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      avgScore,
      totalClients,
      activeClients,
      clientsFromLeads,
      totalRevenue,
      conversionsThisMonth,
      conversionsLastMonth,
    ] = await Promise.all([
      this.prisma.lead.count(),
      this.prisma.lead.count({ where: { status: LeadStatus.NEW } }),
      this.prisma.lead.count({ where: { status: LeadStatus.QUALIFIED } }),
      this.prisma.lead.count({ where: { status: LeadStatus.CONVERTED } }),
      this.prisma.lead.aggregate({ _avg: { currentScore: true } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente' } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', status: 'ACTIVE' } }),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', convertedFromLeadId: { not: null } } }),
      // TODO: totalRevenue agora calculado dinamicamente via Appointments (sum por tutorId quando status=PAID)
      { _sum: { totalRevenue: 0 } },
      this.prisma.lead.count({
        where: {
          status: LeadStatus.CONVERTED,
          convertedAt: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
        },
      }),
      this.prisma.lead.count({
        where: {
          status: LeadStatus.CONVERTED,
          convertedAt: {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lt: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
      }),
    ]);

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return {
      leads: {
        total: totalLeads,
        new: newLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        averageScore: Math.round(avgScore._avg.currentScore || 0),
      },
      clients: {
        total: totalClients,
        active: activeClients,
        fromLeads: clientsFromLeads,
        totalRevenue: totalRevenue._sum.totalRevenue || 0,
      },
      conversions: {
        rate: Math.round(conversionRate * 10) / 10,
        thisMonth: conversionsThisMonth,
        lastMonth: conversionsLastMonth,
      },
    };
  }

  /**
   * Event listener: Create lead from WhatsApp conversation
   */
  @OnEvent('whatsapp.conversation.new')
  async onWhatsAppConversationNew(data: {
    conversationId: string;
    userId: string;
    contactPhone: string;
    contactName?: string;
    firstMessage?: string;
  }): Promise<void> {
    // Check if auto-lead creation is enabled for this user
    const settings = await this.prisma.integrationSettings.findFirst({
      where: { userId: data.userId },
    });

    // Default to enabled if not explicitly disabled
    const autoCreateLeads = settings?.metadata 
      ? (settings.metadata as Record<string, unknown>).autoCreateLeadsFromWhatsApp !== false
      : true;

    if (autoCreateLeads) {
      await this.createLeadFromWhatsApp(data);
    }
  }
}

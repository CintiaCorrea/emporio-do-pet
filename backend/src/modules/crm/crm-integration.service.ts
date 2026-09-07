import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { LeadStatus, LeadSource } from '@prisma/client';
import { findExistingTutor, findTutorByPhoneUnique } from '../../common/tutor-match';
import { last8, onlyDigits, normalizePhone } from '../../common/phone';
import { proximoCodigo } from '../../common/codigo';
import { pagoDaVenda, abertoDaVenda, situacaoDaVenda } from './consulta-vendas.regras';

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
      // JÁ É CLIENTE? Se o telefone é de um Tutor cadastrado, NÃO cria lead
      // (Cliente = Tutor é a mesma pessoa; criar lead aqui gera a duplicidade
      // "cliente vira lead"). Número de UM cliente -> vincula a conversa.
      // Número AMBÍGUO (2+ clientes) -> também não cria lead, mas não vincula
      // (revisão manual decide de quem é).
      const m = await findTutorByPhoneUnique(this.prisma, data.contactPhone);
      if (m.status === 'unique') {
        await this.prisma.whatsAppConversation
          .update({ where: { id: data.conversationId }, data: { tutorId: m.tutorId } })
          .catch(() => undefined);
        this.logger.log(
          `Conversa ${data.conversationId} é de CLIENTE ${m.tutorId} — vinculada, sem criar lead`,
        );
        return null;
      }
      if (m.status === 'ambiguous') {
        this.logger.warn(
          `Telefone ${data.contactPhone} pertence a ${m.tutorIds.length} clientes — não cria lead nem vincula (revisão manual)`,
        );
        return null;
      }

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
   * Configuração da Caixa de Entrada: ligar/desligar a criação automática de
   * LEAD quando chega mensagem de um número desconhecido. (Cliente conhecido
   * nunca vira lead — isso é sempre garantido.)
   */
  async getInboxSettings(): Promise<{ autoCreateLeadsFromWhatsApp: boolean }> {
    const rows = await this.prisma.integrationSettings.findMany({ select: { metadata: true } });
    // Desligado se QUALQUER config marcar explicitamente como false.
    const autoCreateLeadsFromWhatsApp = !rows.some(
      (r) => (r.metadata as Record<string, unknown> | null)?.autoCreateLeadsFromWhatsApp === false,
    );
    return { autoCreateLeadsFromWhatsApp };
  }

  async setInboxSettings(
    userId: string,
    autoCreateLeadsFromWhatsApp: boolean,
  ): Promise<{ ok: true; autoCreateLeadsFromWhatsApp: boolean }> {
    const rows = await this.prisma.integrationSettings.findMany();
    if (rows.length === 0) {
      await this.prisma.integrationSettings.create({
        data: { userId, metadata: { autoCreateLeadsFromWhatsApp } },
      });
    } else {
      for (const r of rows) {
        const meta = (r.metadata as Record<string, unknown> | null) || {};
        await this.prisma.integrationSettings.update({
          where: { id: r.id },
          data: { metadata: { ...meta, autoCreateLeadsFromWhatsApp } },
        });
      }
    }
    return { ok: true, autoCreateLeadsFromWhatsApp };
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

  /**
   * Importa um LOTE de VENDAS do SimplesVet (cada venda = 1 Appointment; cada linha = 1 AppointmentItem).
   *
   * ENTRADA: body.linhas = linhas do CSV ja parseadas (chaves: DataHora, Venda, Status, DataBaixa,
   * FormaPagamento, Funcionario, Cliente, Codigo, CPF, Celular, Email, Animal, Especie, Raca, TipoItem,
   * Grupo, ProdutoServico, ValorUnitario, Quantidade, Bruto, Desconto, Liquido, Observacoes).
   *
   * LOGICA: agrupa por `Venda`; resolve tutor (por Codigo -> findExistingTutor -> cria); resolve pet
   * (por nome, senao cria); resolve funcionario (User por nome normalizado, senao importadorUserId);
   * marca = mapaMarca[Grupo]; dedup por codigoExterno. Dry-run so conta; efetivar grava venda a venda
   * dentro de comRetry (nao aborta o lote em erro pontual). Ao fim, snapshot por tutor.
   */
  async importarVendas(body: {
    linhas: any[];
    dryRun?: boolean;
    mapaMarca?: Record<string, string>;
    importadorUserId?: string;
  }) {
    const dry = !!body.dryRun;
    const linhas = body.linhas || [];
    const mapaMarca = body.mapaMarca || {};

    // Helpers de parsing
    const brl = (s: any): number => parseFloat((String(s ?? '0') || '0').replace(/\./g, '').replace(',', '.')) || 0;
    const G = (s: any): string | undefined => (typeof s === 'string' && s.trim() !== '' ? s.trim() : s != null && s !== '' ? String(s) : undefined);
    // Data BR "dd/mm/aaaa hh:mm:ss" -> Date
    const parseDataBR = (s: any): Date => {
      const v = G(s);
      if (!v) return new Date();
      const m = v.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (m) {
        const [, dd, mm, aa, hh, mi, ss] = m;
        const ano = aa.length === 2 ? 2000 + Number(aa) : Number(aa);
        const d = new Date(ano, Number(mm) - 1, Number(dd), Number(hh || 0), Number(mi || 0), Number(ss || 0));
        if (!isNaN(d.getTime())) return d;
      }
      const d = new Date(v);
      return isNaN(d.getTime()) ? new Date() : d;
    };
    const semAcento = (s: any): string =>
      String(s ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toLowerCase();
    const especieEnum = (esp: any): 'CANINE' | 'FELINE' | 'OTHER' => {
      const e = semAcento(esp);
      if (e.includes('fel')) return 'FELINE';
      if (e.includes('can')) return 'CANINE';
      return 'OTHER';
    };

    // 1) Agrupa por Venda
    const grupos = new Map<string, any[]>();
    for (const l of linhas) {
      const venda = G(l.Venda);
      if (!venda) continue;
      const arr = grupos.get(venda);
      if (arr) arr.push(l);
      else grupos.set(venda, [l]);
    }

    // Cache de Users (funcionarios) por nome normalizado
    const users = await this.prisma.user.findMany({ select: { id: true, name: true } });
    const userPorNome = new Map<string, string>();
    for (const u of users) if (u.name) userPorNome.set(semAcento(u.name), u.id);

    // Contadores / acumuladores
    let vendas = 0;
    let itens = 0;
    let novosClientes = 0;
    let novosPets = 0;
    let jaImportadas = 0;
    let criadas = 0;
    let puladas = 0;
    let valorTotalLiquido = 0;
    const funcSet = new Set<string>();
    const porMarca: Record<string, number> = {};
    const avisos: string[] = [];
    const tutoresTocados = new Set<string>();

    for (const [venda, linhasVenda] of grupos) {
      try {
        const r = await this.comRetry(() =>
          this.importarUmaVenda(venda, linhasVenda, {
            dry,
            mapaMarca,
            importadorUserId: body.importadorUserId,
            userPorNome,
            brl,
            G,
            parseDataBR,
            especieEnum,
            semAcento,
          }),
        );

        if (r.jaImportada) {
          jaImportadas++;
          puladas++;
          continue;
        }

        vendas++;
        criadas++;
        itens += r.itens;
        valorTotalLiquido += r.valorLiquido;
        if (r.novoCliente) novosClientes++;
        if (r.novoPet) novosPets++;
        if (r.funcionarioNaoEncontrado) funcSet.add(r.funcionarioNaoEncontrado);
        for (const [mk, mv] of Object.entries(r.porMarca)) porMarca[mk] = (porMarca[mk] || 0) + mv;
        if (r.tutorId) tutoresTocados.add(r.tutorId);
      } catch (e: any) {
        puladas++;
        avisos.push(`Venda ${venda}: ${e?.message || 'erro'}`);
      }
    }

    // Avisos de funcionario nao encontrado (um por funcionario)
    for (const f of funcSet) avisos.push(`Funcionario nao encontrado: "${f}" (usado importador como fallback)`);

    // 9) Snapshot por tutor (so ao efetivar)
    if (!dry) {
      for (const tutorId of tutoresTocados) {
        try {
          await this.comRetry(async () => {
            const vendasTutor = await this.prisma.appointment.findMany({
              where: { tutorId, type: 'VENDA' },
              select: { date: true, value: true },
            });
            if (!vendasTutor.length) return;
            const datas = vendasTutor.map((v) => v.date.getTime());
            const valores = vendasTutor.map((v) => v.value || 0);
            const ticketMedio = valores.reduce((a, b) => a + b, 0) / valores.length;
            await this.prisma.tutor.update({
              where: { id: tutorId },
              data: {
                primeiraCompraAt: new Date(Math.min(...datas)),
                ultimaVendaAt: new Date(Math.max(...datas)),
                ticketMedio,
              },
            });
          });
        } catch (e: any) {
          avisos.push(`Snapshot tutor ${tutorId}: ${e?.message || 'erro'}`);
        }
      }
    }

    const base = {
      vendas,
      itens,
      novosClientes,
      novosPets,
      jaImportadas,
      valorTotalLiquido,
      funcionariosNaoEncontrados: [...funcSet],
      porMarca,
      amostraAvisos: avisos.slice(0, 50),
    };

    if (dry) return { dryRun: true, ...base };
    return { dryRun: false, ...base, criadas, puladas };
  }

  /**
   * Processa UMA venda (grupo de linhas). Idempotente pela checagem de codigoExterno.
   * Retorna contadores; no dry-run nao grava nada (mas ainda resolve tutor/pet como "novo?" para contagem).
   */
  private async importarUmaVenda(
    venda: string,
    linhasVenda: any[],
    ctx: {
      dry: boolean;
      mapaMarca: Record<string, string>;
      importadorUserId?: string;
      userPorNome: Map<string, string>;
      brl: (s: any) => number;
      G: (s: any) => string | undefined;
      parseDataBR: (s: any) => Date;
      especieEnum: (esp: any) => 'CANINE' | 'FELINE' | 'OTHER';
      semAcento: (s: any) => string;
    },
  ): Promise<{
    jaImportada?: boolean;
    itens: number;
    valorLiquido: number;
    novoCliente: boolean;
    novoPet: boolean;
    funcionarioNaoEncontrado?: string;
    porMarca: Record<string, number>;
    tutorId?: string;
  }> {
    const { dry, mapaMarca, importadorUserId, userPorNome, brl, G, parseDataBR, especieEnum, semAcento } = ctx;
    const primeira = linhasVenda[0] || {};

    // 2) Dedup por codigoExterno
    const existente = await this.prisma.appointment.findFirst({
      where: { codigoExterno: String(venda) },
      select: { id: true },
    });
    if (existente) return { jaImportada: true, itens: 0, valorLiquido: 0, novoCliente: false, novoPet: false, porMarca: {} };

    // 3) Resolver tutor
    let novoCliente = false;
    let tutorId: string | null = null;
    const codigoCli = G(primeira.Codigo);
    if (codigoCli != null && !isNaN(Number(codigoCli))) {
      const porCod = await this.prisma.tutor.findFirst({ where: { codigo: Number(codigoCli) }, select: { id: true } });
      if (porCod) tutorId = porCod.id;
    }
    if (!tutorId) {
      const m = await findExistingTutor(this.prisma, { phone: primeira.Celular, cpf: primeira.CPF, email: primeira.Email });
      if (m) tutorId = m.id;
    }
    novoCliente = !tutorId;

    // 4/5) Resolver funcionario
    const funcNome = G(primeira.Funcionario);
    let funcUserId: string | undefined;
    let funcionarioNaoEncontrado: string | undefined;
    if (funcNome) {
      funcUserId = userPorNome.get(semAcento(funcNome));
      if (!funcUserId) funcionarioNaoEncontrado = funcNome;
    }
    const userId = funcUserId || importadorUserId;
    if (!userId) throw new Error('Sem userId: funcionario nao encontrado e importadorUserId ausente');
    const executorUserId = funcUserId; // undefined -> item sem executor

    // 4) Resolver pet
    const animalNome = G(primeira.Animal);
    let novoPet = false;
    let petId: string | null = null;

    // 7) Status / pagamento
    const status = G(primeira.Status) || '';
    const st = semAcento(status);
    let paymentStatus: 'PAID' | 'PENDING' = 'PENDING';
    if (st.includes('baixado') && !st.includes('parcial')) paymentStatus = 'PAID';
    const appointmentStatus = paymentStatus === 'PAID' ? 'COMPLETED' : 'SCHEDULED';

    // Monta itens e valores
    const porMarca: Record<string, number> = {};
    let valorLiquido = 0;
    const itensData = linhasVenda.map((l) => {
      const liquido = brl(l.Liquido);
      valorLiquido += liquido;
      const grupo = G(l.Grupo);
      const marca = (grupo && mapaMarca[grupo]) || null;
      if (marca) porMarca[marca] = (porMarca[marca] || 0) + liquido;
      return {
        descricao: G(l.ProdutoServico),
        quantidade: Number(l.Quantidade) || 1,
        valorUnitario: brl(l.ValorUnitario),
        custoUnitario: 0,
        desconto: brl(l.Desconto),
        valorTotal: liquido,
        grupo,
        marca,
        executorUserId,
        observacoes: G(l.Observacoes),
      };
    });

    // DRY-RUN: nao grava; ainda conta pet novo (sem criar)
    if (dry) {
      if (tutorId && animalNome) {
        const pet = await this.prisma.pet.findFirst({
          where: { tutorId, name: { equals: animalNome, mode: 'insensitive' } },
          select: { id: true },
        });
        novoPet = !pet;
      } else {
        novoPet = !!animalNome; // sem tutor ainda -> pet seria criado junto
      }
      return { itens: itensData.length, valorLiquido, novoCliente, novoPet, funcionarioNaoEncontrado, porMarca, tutorId: tutorId || undefined };
    }

    // EFETIVAR — criar tutor se necessario
    if (!tutorId) {
      let codigoTutor: number | undefined = codigoCli != null && !isNaN(Number(codigoCli)) ? Number(codigoCli) : undefined;
      if (codigoTutor != null) {
        const jaUsado = await this.prisma.tutor.findFirst({ where: { codigo: codigoTutor }, select: { id: true } });
        if (jaUsado) codigoTutor = await proximoCodigo(this.prisma, 'tutor');
      } else {
        codigoTutor = await proximoCodigo(this.prisma, 'tutor');
      }
      const numero = normalizePhone(primeira.Celular);
      const criado = await this.prisma.tutor.create({
        data: {
          name: G(primeira.Cliente) || 'Cliente sem nome',
          codigo: codigoTutor,
          cpf: G(primeira.CPF),
          email: G(primeira.Email),
          classificacao: 'Cliente',
          status: 'ACTIVE',
          contacts: numero
            ? { create: [{ number: numero, type: 'MOBILE', isPrimary: true, isWhatsApp: true }] }
            : undefined,
        },
        select: { id: true },
      });
      tutorId = criado.id;
    }

    // Resolver/criar pet
    let pet = animalNome
      ? await this.prisma.pet.findFirst({ where: { tutorId, name: { equals: animalNome, mode: 'insensitive' } }, select: { id: true } })
      : await this.prisma.pet.findFirst({ where: { tutorId }, select: { id: true } });
    if (!pet) {
      const criadoPet = await this.prisma.pet.create({
        data: {
          name: animalNome || 'Sem nome',
          species: especieEnum(primeira.Especie),
          breed: G(primeira.Raca),
          status: 'ACTIVE',
          tutorId,
        },
        select: { id: true },
      });
      pet = criadoPet;
      novoPet = true;
    }
    petId = pet.id;

    // 8) Criar Appointment + itens
    await this.prisma.appointment.create({
      data: {
        tutorId,
        petId,
        userId,
        date: parseDataBR(primeira.DataHora),
        value: valorLiquido,
        status: appointmentStatus,
        paymentStatus,
        type: 'VENDA',
        paymentMethod: G(primeira.FormaPagamento),
        codigoExterno: String(venda),
        origem: 'SIMPLESVET',
        items: { create: itensData },
      },
    });

    return {
      itens: itensData.length,
      valorLiquido,
      novoCliente,
      novoPet,
      funcionarioNaoEncontrado,
      porMarca,
      tutorId,
    };
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

  /**
   * Limpeza: apaga pets SEM codigo (residuos da 1a tentativa de import que travou + pets de teste antigos).
   * Todo pet real importado tem codigo. Em lotes de 300 por chamada; pets com vinculos (FK) sao contados em bloqueados.
   */
  async limparPetsSemCodigo(dryRun: boolean) {
    const semCodigo = await this.comRetry(() => this.prisma.pet.count({ where: { codigo: null } }));
    if (dryRun) return { dryRun: true, petsSemCodigo: semCodigo };
    const lote = await this.comRetry(() => this.prisma.pet.findMany({ where: { codigo: null }, select: { id: true }, take: 300 }));
    let apagados = 0;
    let bloqueados = 0;
    for (const p of lote) {
      try {
        await this.comRetry(() => this.prisma.pet.delete({ where: { id: p.id } }));
        apagados++;
      } catch {
        bloqueados++;
      }
    }
    const restantes = await this.comRetry(() => this.prisma.pet.count({ where: { codigo: null } }));
    return { dryRun: false, apagados, bloqueados, restantes };
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
   * Consulta de vendas (relatorio): lista Appointments type='VENDA' com filtros e totais.
   * Filtros opcionais: de/ate (date), status, marca (item.marca), funcionarioId (userId),
   * busca (tutor.name / pet.name / items.descricao contains, insensitive), limit (default 200).
   */
  async consultaVendas(q: {
    de?: string;
    ate?: string;
    status?: string;
    marca?: string;
    funcionarioId?: string;
    busca?: string;
    cod?: string;
    limit?: number;
  }) {
    const limit = Math.max(1, Math.min(Number(q.limit) || 200, 1000));

    const where: any = { type: 'VENDA' };

    // Periodo (de/ate em date) — ate inclui o dia inteiro
    if (q.de || q.ate) {
      where.date = {};
      if (q.de) {
        const d = new Date(`${q.de}T00:00:00`);
        if (!isNaN(d.getTime())) where.date.gte = d;
      }
      if (q.ate) {
        const d = new Date(`${q.ate}T23:59:59.999`);
        if (!isNaN(d.getTime())) where.date.lte = d;
      }
    }

    if (q.status && q.status.trim()) where.status = q.status.trim();

    // Marca: pelo menos um item com essa marca
    if (q.marca && q.marca.trim()) {
      where.items = { some: { marca: q.marca.trim() } };
    }

    if (q.funcionarioId && q.funcionarioId.trim()) where.userId = q.funcionarioId.trim();

    // Cod. da venda: nosso numeroVenda (se numerico) OU codigoExterno do SimplesVet (contains)
    if (q.cod && String(q.cod).trim()) {
      const c = String(q.cod).trim();
      const ors: any[] = [{ codigoExterno: { contains: c, mode: 'insensitive' } }];
      const asNum = Number(c);
      if (Number.isInteger(asNum) && asNum > 0) ors.push({ numeroVenda: asNum });
      where.AND = [...(where.AND || []), { OR: ors }];
    }

    // Busca textual em cliente / pet / descricao do item
    if (q.busca && q.busca.trim()) {
      const b = q.busca.trim();
      where.OR = [
        { tutor: { name: { contains: b, mode: 'insensitive' } } },
        { pet: { name: { contains: b, mode: 'insensitive' } } },
        { items: { some: { descricao: { contains: b, mode: 'insensitive' } } } },
      ];
    }

    const appts = await this.prisma.appointment.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        tutor: { select: { name: true, codigo: true } },
        pet: { select: { name: true, species: true } },
        user: { select: { name: true } },
        items: {
          include: { executorUser: { select: { name: true } } },
        },
        // Sem os recebimentos nao existe "quanto ja entrou": a tela so sabia o valor da venda,
        // entao nao dava pra mostrar baixa parcial, saldo em aberto, forma de recebimento nem
        // data da baixa. Pedido de 07/09/2026 (Consulta de vendas, aba Resumo).
        recebimentos: { select: { valorTotal: true, data: true, formas: true } },
      },
    });

    // ── DE ONDE VEM O GRUPO E O TIPO DO ITEM ──────────────────────────────────
    // NAO do campo `grupo` do item: ele so e preenchido pela importacao do SimplesVet, entao
    // toda venda feita aqui cairia em "Sem grupo" — o relatorio acertaria no passado e mentiria
    // no presente. A fonte e o CATALOGO (cat_itens -> cat_grupos), que ja tem a arvore de dois
    // niveis (grupo pai > subgrupo) que a clinica usa.
    const idsCatalogo = [...new Set(appts.flatMap((a: any) => (a.items || []).map((i: any) => i.catalogoItemId).filter(Boolean)))] as string[];
    const catalogo = idsCatalogo.length
      ? await this.prisma.itemCatalogo.findMany({
          where: { id: { in: idsCatalogo } },
          select: { id: true, tipo: true, controlePlano: true, planoUnidades: true, grupo: { select: { nome: true, pai: { select: { nome: true } } } } },
        })
      : [];
    const porCatalogo = new Map(catalogo.map((c: any) => [c.id, c]));

    const idsConvenio = [...new Set(appts.flatMap((a: any) => (a.items || []).map((i: any) => i.convenioId).filter(Boolean)))] as string[];
    const convenios = idsConvenio.length
      ? await this.prisma.catConvenio.findMany({ where: { id: { in: idsConvenio } }, select: { id: true, nome: true } })
      : [];
    const porConvenio = new Map(convenios.map((c: any) => [c.id, c.nome]));

    let liquido = 0;
    let descontos = 0;
    let recebido = 0;

    const vendas = appts.map((a) => {
      // Marca dominante: a que soma mais valorTotal entre os itens
      const somaMarca: Record<string, number> = {};
      let descontoVenda = 0;
      for (const it of a.items) {
        descontoVenda += it.desconto || 0;
        if (it.marca) somaMarca[it.marca] = (somaMarca[it.marca] || 0) + (it.valorTotal || 0);
      }
      const marca =
        Object.keys(somaMarca).length > 0
          ? Object.entries(somaMarca).sort((x, y) => y[1] - x[1])[0][0]
          : null;

      // O pago nunca passa do valor da venda: troco e pagamento a maior sao assunto do caixa,
      // aqui virariam "saldo negativo" e sujariam o total do periodo.
      const pagoVenda = pagoDaVenda(a.value, a.recebimentos);

      liquido += a.value || 0;
      descontos += descontoVenda;
      recebido += pagoVenda;

      return {
        id: a.id,
        numeroVenda: a.numeroVenda ?? null,
        codigoExterno: a.codigoExterno,
        date: a.date,
        status: a.status,
        paymentStatus: a.paymentStatus,
        paymentMethod: a.paymentMethod,
        valor: a.value,
        pago: pagoVenda,
        aberto: abertoDaVenda(a.value, a.recebimentos),
        situacao: situacaoDaVenda(a.value, a.recebimentos),
        recebimentos: (a.recebimentos || []).map((r) => ({
          valor: r.valorTotal || 0,
          data: r.data,
          formas: r.formas ?? null,
        })),
        cliente: a.tutor?.name ?? null,
        clienteId: a.tutorId,
        pet: a.pet?.name ?? null,
        funcionario: a.user?.name ?? null,
        marca,
        itens: a.items.map((it) => ({
          descricao: it.descricao,
          quantidade: it.quantidade,
          valorUnitario: it.valorUnitario,
          valorTotal: it.valorTotal,
          desconto: it.desconto || 0,
          servicoId: it.servicoId ?? null,
          productId: it.productId ?? null,
          catalogoItemId: it.catalogoItemId ?? null,
          // Catalogo primeiro; o `grupo` da importacao so entra quando o item nao esta ligado
          // ao catalogo (venda antiga, importada) — e ai e a unica coisa que existe.
          grupoNome: porCatalogo.get(it.catalogoItemId || '')?.grupo?.nome ?? it.grupo ?? null,
          grupoPai: porCatalogo.get(it.catalogoItemId || '')?.grupo?.pai?.nome ?? null,
          tipoItem: porCatalogo.get(it.catalogoItemId || '')?.tipo ?? null,
          convenio: it.convenioId ? (porConvenio.get(it.convenioId) ?? 'Convenio') : null,
          grupo: it.grupo,
          marca: it.marca,
          executor: it.executorUser?.name ?? null,
        })),
      };
    });

    // ── PACOTES VENDIDOS NO PERIODO, com sessoes ──────────────────────────────
    // O controle vivo das sessoes e a lista `petpac_<pet>` ({nome, total, used, origemVenda}) —
    // a mesma que a ficha, a agenda e o inbox usam. A tabela `Pacote` antiga ficava orfa.
    //
    // Aqui esta a diferenca para o SimplesVet: la o pacote vira receita inteira no dia da venda.
    // Como a casa reconhece a receita SESSAO A SESSAO (lancamentos diferidos), o relatorio mostra
    // o quanto ja foi reconhecido e o quanto ainda esta por usar.
    const apptsDoPeriodo = new Map(appts.map((a: any) => [a.id, a]));
    const pacotesMap = new Map<string, { nome: string; vendidos: number; sessoes: number; usadas: number; valor: number; reconhecido: number }>();
    try {
      const listas = await this.prisma.listaItem.findMany({ where: { lista: { startsWith: 'petpac_' } }, select: { valor: true } });
      for (const li of listas) {
        let d: any; try { d = JSON.parse(li.valor); } catch { continue; }
        if (d?.origem !== 'venda' || !d?.origemVenda) continue;
        const partes = String(d.origemVenda).split(':'); // venda:<appt>:<productId>
        const appt: any = apptsDoPeriodo.get(partes[1]);
        if (!appt) continue; // pacote vendido fora do periodo filtrado
        const item = (appt.items || []).find((i: any) => i.productId === partes[2] || i.catalogoItemId === partes[2]);
        const valorItem = Number(item?.valorTotal) || 0;
        const total = Math.max(0, Number(d.total) || 0);
        const usadas = Math.min(Math.max(0, Number(d.used) || 0), total);
        const nome = String(d.nome || 'Pacote');
        const g = pacotesMap.get(nome) || { nome, vendidos: 0, sessoes: 0, usadas: 0, valor: 0, reconhecido: 0 };
        g.vendidos += 1;
        g.sessoes += total;
        g.usadas += usadas;
        g.valor += valorItem;
        // Proporcional as sessoes usadas. O rateio exato (com o centavo residual) vive nos
        // lancamentos do financeiro; aqui o numero e de leitura, e a tela diz isso.
        g.reconhecido += total > 0 ? (valorItem * usadas) / total : valorItem;
        pacotesMap.set(nome, g);
      }
    } catch { /* sem pacotes: o quadro simplesmente nao aparece */ }
    const pacotes = [...pacotesMap.values()]
      .map((g) => ({ ...g, reconhecido: Number(g.reconhecido.toFixed(2)), aReconhecer: Number(Math.max(0, g.valor - g.reconhecido).toFixed(2)) }))
      .sort((a, b) => b.valor - a.valor);

    const qtd = vendas.length;
    const ticket = qtd > 0 ? liquido / qtd : 0;

    return {
      vendas,
      pacotes,
      totais: {
        qtd,
        liquido,
        ticket,
        descontos,
        recebido,
        // O que falta receber do periodo. Nunca negativo, pelo mesmo motivo do pagoVenda.
        aberto: Math.max(0, liquido - recebido),
      },
    };
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

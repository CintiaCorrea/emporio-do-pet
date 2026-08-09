// [EMP-COWORK] fix: bloco de `items` movido pra fora do if de `treatments` (servicos salvavam so com tratamento). Cintia 06/06.
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, PrismaTransactionClient } from '../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { BoardsService } from '../boards/boards.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ensureNumeroVenda } from '../../common/venda-numero';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly boardsService: BoardsService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  // ============================================
  // Confirmação de agendamento (WhatsApp / futuro portal)
  // ============================================

  /** Escolhe o modelo (template Meta) pelo tipo de serviço E monta os parâmetros
   *  na ORDEM que cada modelo espera (a estrutura muda de um pro outro).
   *  - fisioterapia -> confirmacao_fisioterapia: {{1}} tutor, {{2}} data, {{3}} hora, {{4}} pet
   *  - demais       -> confirmacao_agendamento : {{1}} tutor, {{2}} pet, {{3}} data, {{4}} hora, {{5}} profissional
   */
  /** Detecta se o agendamento é de fisioterapia pelo TIPO/descrição do próprio
   *  agendamento (ex.: "Sessão de fisio", enum SESSAO_FISIO, "Reabilitação",
   *  "Hidroesteira"). NÃO usa a especialidade do profissional de propósito:
   *  o mesmo profissional faz várias especialidades (Clínica, Integrativa E Fisio),
   *  então a especialidade não diz o serviço DAQUELA agenda. */
  private isFisio(appt: any): boolean {
    const txt = `${appt?.type || ''} ${appt?.description || ''}`.toLowerCase();
    return /fisio|reabilit|hidroester/.test(txt);
  }

  private confirmacaoTemplate(appt: any): { name: string; params: Array<{ type: 'text'; text: string }> } {
    const d = new Date(appt.date);
    // Servidor roda em UTC — formata SEMPRE no fuso de Fortaleza pra não errar a hora.
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Fortaleza',
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
    const dd = get('day');
    const mm = get('month');
    const hh = get('hour');
    const mn = get('minute');
    const data = `${dd}/${mm}`;
    const hora = mn && mn !== '00' ? `${hh}h${mn}` : `${hh}h`;
    const tutor = (appt.tutor?.name || 'tutor').trim().split(/\s+/)[0];
    const pet = appt.pet?.name || 'seu pet';
    // #12 — o "profissional" só sai com NOME se for veterinário. Se o agendamento estiver com
    // recepcionista/gerente no userId (quem operou), sai "nossa equipe" pra não mandar o nome errado
    // (bug do caso Julianna 07/08: confirmação saiu no nome da recepcionista Maria Gabriela).
    const profTipo = appt.user?.profissional?.tipo;
    const profNome = (appt.user?.profissional?.nomeExibicao || appt.user?.name || '').trim();
    const prof = (profTipo === 'RECEPCIONISTA' || profTipo === 'GERENTE' || !profNome) ? 'nossa equipe' : profNome;
    const T = (text: string) => ({ type: 'text' as const, text });

    if (this.isFisio(appt)) {
      return { name: 'confirmacao_fisioterapia', params: [T(tutor), T(data), T(hora), T(pet)] };
    }
    return { name: 'confirmacao_agendamento', params: [T(tutor), T(pet), T(data), T(hora), T(prof)] };
  }

  /** Envia a confirmação do agendamento pelo WhatsApp (template aprovado). */
  async sendConfirmation(id: string) {
    const appt = await this.findById(id);
    const contatos = await this.prisma.contact.findMany({
      where: { tutorId: appt.tutorId },
      orderBy: [{ isPrimary: 'desc' }, { isWhatsApp: 'desc' }],
      take: 1,
    });
    const phone = contatos[0]?.number;
    if (!phone) {
      return { success: false, error: 'Tutor sem telefone/WhatsApp cadastrado.' };
    }

    const { name: templateName, params } = this.confirmacaoTemplate(appt);
    // Envia E registra na conversa (aparece no inbox como enviada pelo sistema).
    const res = await this.whatsapp.enviarTemplateRegistrando(phone, templateName, params, '📲 Confirmação de agendamento enviada pelo WhatsApp.', true);

    if (!res.success) {
      return { success: false, error: res.error || 'Falha ao enviar pelo WhatsApp.' };
    }

    await this.prisma.appointment.update({
      where: { id },
      data: { confirmacaoStatus: 'ENVIADA', confirmacaoEnviadaAt: new Date() },
    });

    return { success: true, to: phone, templateName };
  }

  /** Confirma a presença MANUALMENTE (cliente confirmou por telefone/pessoalmente, sem WhatsApp). */
  async confirmarManual(id: string) {
    await this.findById(id);
    await this.prisma.appointment.update({
      where: { id },
      data: { confirmacaoStatus: 'CONFIRMADO' },
    });
    return { success: true };
  }

  /** Cancela o agendamento com motivo opcional (lista) + observação livre. */
  async cancelWithReason(id: string, motivo?: string, observacao?: string) {
    await this.findById(id);
    return this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'Cancelado',
        motivoCancelamento: motivo?.trim() || null,
        observacaoCancelamento: observacao?.trim() || null,
      },
      include: {
        tutor: { select: { id: true, name: true } },
        pet: { select: { id: true, name: true } },
      },
    });
  }

  // 🛡️ TRAVA DE HORÁRIO reutilizável (bug 31/07 + remarcação 04/08): recusa qualquer
  // agendamento que SOBREPONHA um horário já ocupado na MESMA agenda/recurso (mesmo
  // agendaAvulsa/MAP, ou mesmo profissional quando não-avulsa). Chamada nos TRÊS caminhos:
  // criar, REMARCAR (fork) e mover — senão remarcar/arrastar furava a trava (Kate×Luna, MAP 2).
  // Agendas com permiteSobreposicao (ex.: Terceiros) são exceção. `excludeId` ignora o próprio
  // agendamento que está sendo movido/remarcado. Falha só o bloqueio proposital (BadRequest).
  private async assertSemConflitoHorario(params: {
    date: Date | string;
    duration?: number | null;
    userId?: string | null;
    agendaAvulsa?: string | null;
    status?: string | null;
    type?: string | null;
    excludeId?: string;
  }): Promise<void> {
    const avulsa = params.agendaAvulsa || null;
    const _stt = String(params.status || '').toLowerCase();
    const _tpp = String(params.type || '').toLowerCase();
    // Só vale p/ AGENDAMENTO de agenda — não p/ venda/artefato instantâneo (senão bloqueava venda por falso conflito).
    const ehAgenda =
      !!avulsa ||
      (!!params.userId &&
        !/(realiz|conclu|complet|atend|venda|receita|documento|peso|observa|vacina|exame)/.test(`${_stt} ${_tpp}`));
    if (!ehAgenda) return;
    let permiteSobrepor = false;
    if (avulsa) {
      const cfgs = await this.prisma.listaItem.findMany({ where: { lista: 'agenda_avulsa' } });
      for (const it of cfgs) {
        try { const v = JSON.parse(it.valor); if (v.id === avulsa && v.permiteSobreposicao) permiteSobrepor = true; } catch { /* ilegível */ }
      }
    }
    if (permiteSobrepor) return;
    const inicio = new Date(params.date).getTime();
    const fim = inicio + (params.duration || 30) * 60000;
    const diaIni = new Date(params.date); diaIni.setHours(0, 0, 0, 0);
    const diaFim = new Date(params.date); diaFim.setHours(23, 59, 59, 999);
    const doDia = await this.prisma.appointment.findMany({
      where: {
        date: { gte: diaIni, lte: diaFim },
        ...(avulsa ? { agendaAvulsa: avulsa } : { userId: params.userId ?? undefined, agendaAvulsa: null }),
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      select: { date: true, duration: true, status: true },
    });
    const conflito = doDia.some((a) => {
      if (/(cancel|remarc)/i.test(String(a.status || ''))) return false; // cancelado/remarcado não ocupa
      const ini = new Date(a.date).getTime();
      const f = ini + ((a.duration || 30) * 60000);
      return inicio < f && fim > ini; // sobreposição de janelas
    });
    if (conflito) {
      throw new BadRequestException('Já existe um agendamento neste horário nesta agenda. Escolha outro horário.');
    }
  }

  async create(createAppointmentDto: CreateAppointmentDto) {
    // Validações mínimas (compatível com o antigo /api/appointments do Next)
    if (
      !createAppointmentDto.tutorId ||
      !createAppointmentDto.userId ||
      !createAppointmentDto.date
    ) {
      throw new BadRequestException('Tutor, veterinário (userId) e data são obrigatórios');
    }

    const existingTutor = await this.prisma.tutor.findUnique({
      where: { id: createAppointmentDto.tutorId },
    });
    if (!existingTutor) throw new NotFoundException('Tutor não encontrado');

    const existingUser = await this.prisma.user.findUnique({
      where: { id: createAppointmentDto.userId },
    });
    if (!existingUser) throw new NotFoundException('Veterinário não encontrado');

    // 🛡️ IDEMPOTÊNCIA anti-duplicado (bug 30/07): se JÁ existe agendamento do MESMO pet, com o
    // MESMO profissional, no MESMO horário exato, devolve ele em vez de criar outro. Cobre o
    // clique-duplo E o "retry" quando o 1º POST parecia ter falhado (banco lento) mas gravou —
    // cenário que gerou os duplicados exatos na agenda.
    if (createAppointmentDto.petId) {
      const jaExiste = await this.prisma.appointment.findFirst({
        where: {
          petId: createAppointmentDto.petId,
          userId: createAppointmentDto.userId,
          date: new Date(createAppointmentDto.date),
        },
        orderBy: { createdAt: 'asc' },
      });
      if (jaExiste) return jaExiste;
    }

    // 🛡️ TRAVA DE HORÁRIO na CRIAÇÃO (ver assertSemConflitoHorario). Protege agenda E app/portal.
    await this.assertSemConflitoHorario({
      date: createAppointmentDto.date,
      duration: createAppointmentDto.duration,
      userId: createAppointmentDto.userId,
      agendaAvulsa: (createAppointmentDto as any).agendaAvulsa,
      status: (createAppointmentDto as any).status,
      type: (createAppointmentDto as any).type,
    });

    // Criar pet se necessário
    let finalPetId = createAppointmentDto.petId;
    if ((!finalPetId || finalPetId === '') && createAppointmentDto.pet) {
      const newPet = await this.prisma.pet.create({
        data: {
          name: createAppointmentDto.pet.name,
          species: createAppointmentDto.pet.species as any,
          breed: createAppointmentDto.pet.breed || null,
          tutorId: createAppointmentDto.tutorId,
          status: 'ACTIVE',
        },
      });
      finalPetId = newPet.id;
    }

    if (!finalPetId) {
      throw new BadRequestException(
        'Pet é obrigatório. Selecione um pet existente ou crie um novo.',
      );
    }

    const existingPet = await this.prisma.pet.findFirst({
      where: { id: finalPetId, tutorId: createAppointmentDto.tutorId },
    });
    if (!existingPet) {
      throw new NotFoundException('Pet não encontrado ou não pertence ao tutor informado');
    }

    const appointmentDate = new Date(createAppointmentDto.date);
    const finalStatus = createAppointmentDto.status || 'SCHEDULED';

    const dto = createAppointmentDto as any;
    const appointmentData: any = {
      tutorId: createAppointmentDto.tutorId,
      petId: finalPetId,
      userId: createAppointmentDto.userId,
      agendaAvulsa: (createAppointmentDto as any).agendaAvulsa || null,
      date: appointmentDate,
      duration: createAppointmentDto.duration || 30,
      description: createAppointmentDto.description ?? null,
      notes: createAppointmentDto.notes ?? null,
      value: createAppointmentDto.value || 0,
      status: finalStatus,
      paymentStatus: createAppointmentDto.paymentStatus || 'PENDING',
      // Campos clínicos
      type: dto.type || 'CONSULTA',
      chiefComplaint: dto.chiefComplaint ?? null,
      anamnesis: dto.anamnesis ?? null,
      physicalExam: dto.physicalExam ?? null,
      diagnosis: dto.diagnosis ?? null,
      conduct: dto.conduct ?? null,
      prescription: dto.prescription ?? null,
      examsRequested: dto.examsRequested ?? null,
      followUpNotes: dto.followUpNotes ?? null,
      nextReturnDate: dto.nextReturnDate ? new Date(dto.nextReturnDate) : null,
      petWeight: dto.petWeight ?? null,
      temperature: dto.temperature ?? null,
      paymentMethod: dto.paymentMethod ?? null,
      ...(createAppointmentDto.boardId && { boardId: createAppointmentDto.boardId }),
    };

    // 🛡️ ANTI-DUPLICAÇÃO DO ATENDIMENTO (bug 04/08 — "dois agendamentos da mesma pessoa"):
    // se este create é um ATENDIMENTO (status realizado/concluído/atendido) e o pet JÁ tem um
    // agendamento ATIVO hoje, REAPROVEITA esse agendamento (atualiza, mantendo horário/coluna)
    // em vez de criar outro — senão a agenda mostra o agendado + o atendimento como 2 cartões.
    let reuseId: string | null = null;
    if (/(realiz|conclu|atend)/.test(String(finalStatus).toLowerCase())) {
      const d0 = new Date(appointmentDate); d0.setHours(0, 0, 0, 0);
      const d1 = new Date(appointmentDate); d1.setHours(23, 59, 59, 999);
      const agendado = await this.prisma.appointment.findFirst({
        where: {
          petId: finalPetId,
          date: { gte: d0, lte: d1 },
          status: { in: ['Em atendimento', 'Atendido', 'Em espera', 'Aguardando', 'Confirmado', 'Agendado', 'SCHEDULED'] },
          type: { notIn: ['Documento', 'Peso', 'Receitas', 'Receita', 'Venda', 'Observação'] },
        },
        orderBy: { date: 'desc' }, // se houver +de um no dia, pega o mais próximo do fim do dia
      });
      if (agendado) reuseId = agendado.id;
    }

    const result = await this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
      let appointment: any;
      if (reuseId) {
        // mantém o HORÁRIO e a coluna agendados (date/userId/agendaAvulsa) — a Cintia quer o
        // horário MARCADO na agenda + 1 registro só; o atendimento é aplicado por cima do agendado.
        const { date: _d, userId: _u, agendaAvulsa: _a, ...dadosAtendimento } = appointmentData;
        appointment = await tx.appointment.update({ where: { id: reuseId }, data: dadosAtendimento });
      } else {
        appointment = await tx.appointment.create({ data: appointmentData });
      }

      if (createAppointmentDto.treatments && createAppointmentDto.treatments.length > 0) {
        for (const t of createAppointmentDto.treatments) {
          if (t.productId) {
            const p = await tx.product.findUnique({ where: { id: t.productId } });
            if (!p) {
              throw new BadRequestException(`Produto com ID ${t.productId} não encontrado`);
            }
          }
        }

        await tx.treatment.createMany({
          data: createAppointmentDto.treatments.map((t) => ({
            description: t.description,
            cost: t.cost,
            productId: t.productId || null,
            appointmentId: appointment.id,
            petId: finalPetId!,
          })),
        });
      }

      // Items (serviços/exames) — cobrança detalhada
      const itemsDto = (createAppointmentDto as any).items as any[] | undefined;
      if (itemsDto && itemsDto.length > 0) {
        // O catálogo vendável agora é `Product`, e o front manda o mesmo id nos dois campos.
        // `servicoId` aponta pra tabela `servicos` (legado, em aposentadoria): id que não
        // existir lá violaria a FK e derrubaria a venda inteira. Ninguém LÊ esse campo —
        // então guardamos só quando é válido, e `productId` segue como a ligação de verdade.
        const idsServico = Array.from(
          new Set(itemsDto.map((it: any) => it.servicoId).filter(Boolean)),
        ) as string[];
        const servicosValidos = new Set(
          idsServico.length
            ? (
                await tx.servico.findMany({
                  where: { id: { in: idsServico } },
                  select: { id: true },
                })
              ).map((s) => s.id)
            : [],
        );
        // Mesma proteção do outro lado: id de produto inexistente derrubaria a venda toda.
        // A descrição e o valor do item já vão no próprio AppointmentItem, então perder o
        // vínculo é bem menos grave do que perder a venda.
        const idsProduto = Array.from(
          new Set(
            itemsDto.map((it: any) => it.productId ?? it.servicoId).filter(Boolean),
          ),
        ) as string[];
        const produtosValidos = new Set(
          idsProduto.length
            ? (
                await tx.product.findMany({
                  where: { id: { in: idsProduto } },
                  select: { id: true },
                })
              ).map((p) => p.id)
            : [],
        );
        await tx.appointmentItem.createMany({
          data: itemsDto.map((it: any) => {
            const qtd = Number(it.quantidade ?? 1);
            const unit = Number(it.valorUnitario ?? 0);
            const desc = Number(it.desconto ?? 0);
            const total = Number.isFinite(it.valorTotal) ? Number(it.valorTotal) : (qtd * unit - desc);
            return {
              appointmentId: appointment.id,
              servicoId: it.servicoId && servicosValidos.has(it.servicoId) ? it.servicoId : null,
              productId: (() => {
                const pid = it.productId ?? it.servicoId ?? null;
                return pid && produtosValidos.has(pid) ? pid : null;
              })(),
              descricao: it.descricao ?? null,
              executorUserId: it.executorUserId ?? null,
              fornecedorId: it.fornecedorId ?? null,
              quantidade: qtd,
              valorUnitario: unit,
              custoUnitario: Number(it.custoUnitario ?? 0),
              desconto: desc,
              valorTotal: total,
              comissaoBase: it.comissaoBase ?? null,
              comissaoTipo: it.comissaoTipo ?? null,
              comissaoValor: it.comissaoValor != null ? Number(it.comissaoValor) : null,
              comissaoCalculada: it.comissaoCalculada != null ? Number(it.comissaoCalculada) : null,
              observacoes: it.observacoes ?? null,
            };
          }),
        });
      }

      return tx.appointment.findUnique({
        where: { id: appointment.id },
        include: {
          tutor: { select: { id: true, name: true, email: true, contacts: true } },
          pet: { select: { id: true, name: true, species: true } },
          user: { select: { id: true, name: true, email: true } },
          treatments: { include: { product: true } },
          _count: { select: { treatments: true } },
        },
      });
    });

    // numeroVenda: se o atendimento já nasce como venda (tem valor ou itens), atribui o número sequencial
    const nasceComoVenda = (Number(createAppointmentDto.value) || 0) > 0 || (((createAppointmentDto as any).items || []).length > 0);
    if (result && nasceComoVenda) {
      try { (result as any).numeroVenda = await ensureNumeroVenda(this.prisma, result.id); }
      catch (e) { console.error('numeroVenda (create) falhou:', e); }
    }

    // Emit appointment created event for automations
    if (result) {
      const primaryContact = (result.tutor as any)?.contacts?.find((c: any) => c.isPrimary);
      this.eventsService.emitAppointmentCreated(createAppointmentDto.userId, {
        appointmentId: result.id,
        date: result.date,
        status: result.status,
        petId: result.pet?.id,
        petName: result.pet?.name,
        tutorId: result.tutor?.id,
        tutorName: result.tutor?.name,
        tutorPhone: primaryContact?.number,
        tutorEmail: (result.tutor as any)?.email,
      });
      this.eventsService.emitAppointmentChanged(); // tempo real da agenda

      // Create card in Consultation board (async, don't block the response)
      const cardTitle = `${result.pet?.name || 'Pet'} - ${result.tutor?.name || 'Tutor'}`;
      this.boardsService
        .createCardForAppointment(
          createAppointmentDto.userId,
          result.id,
          'CONSULTATION',
          cardTitle,
          'Agendada',
        )
        .catch((err) => console.error('Error creating consultation card:', err));
    }

    return result;
  }

  async findAll(params?: {
    userId?: string;
    tutorId?: string;
    petId?: string;
    status?: string;
    paymentStatus?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    skip?: number;
    take?: number;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      tutorId,
      petId,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      skip,
      take,
      page = 1,
      limit = 10,
    } = params || {};

    const resolvedTake = Number.isFinite(take as any) ? (take as number) : limit;
    const resolvedSkip = Number.isFinite(skip as any)
      ? (skip as number)
      : Math.max(0, (page - 1) * resolvedTake);

    const where: any = {
      ...(userId && { userId }),
      ...(tutorId && { tutorId }),
      ...(petId && { petId }),
      ...(status && { status }),
      ...(paymentStatus && { paymentStatus }),
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
        { tutor: { name: { contains: search, mode: 'insensitive' as const } } },
        { pet: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [appointments, total, totalValue] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: resolvedSkip,
        take: resolvedTake,
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              contacts: { where: { isPrimary: true }, take: 1 },
            },
          },
          // temperament: a agenda usa pra saber se o pet ocupa a sala inteira (MAP 1 + MAP 2)
          // insurancePlan: selo de convênio (Petlife) no card da agenda
          pet: { select: { id: true, name: true, species: true, breed: true, temperament: true, insurancePlan: true } },
          user: { select: { id: true, name: true, email: true } },
          treatments: {
            include: {
              product: { select: { id: true, name: true, type: true, price: true } },
            },
          },
          kanbanCard: {
            select: {
              id: true,
              title: true,
              column: { select: { name: true, color: true } },
            },
          },
          _count: { select: { treatments: true } },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.appointment.count({ where }),
      this.prisma.appointment.aggregate({ where, _sum: { value: true } }),
    ]);

    return {
      appointments,
      totals: { value: totalValue._sum.value || 0 },
      pagination: {
        page,
        limit: resolvedTake,
        total,
        pages: Math.ceil(total / resolvedTake),
      },
    };
  }

  async findById(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            contacts: { where: { isPrimary: true }, take: 1 },
          },
        },
        pet: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true,
            gender: true,
            birthDate: true,
            weight: true,
          },
        },
        user: { select: { id: true, name: true, email: true, role: true, profissional: { select: { tipo: true, nomeExibicao: true } } } },
        treatments: {
          include: {
            product: { select: { id: true, name: true, type: true, price: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        items: {
          include: {
            servico: { select: { id: true, nome: true, valorPadrao: true } },
            executorUser: { select: { id: true, name: true } },
            fornecedor: { select: { id: true, nome: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        kanbanCard: {
          select: {
            id: true,
            title: true,
            column: { select: { id: true, name: true, color: true } },
          },
        },
        recording: {
          select: {
            id: true,
            status: true,
            transcription: true,
            aiAnalysis: true,
            aiSummary: true,
            audioDuration: true,
            createdAt: true,
          },
        },
        clinicalDocuments: {
          select: {
            id: true,
            type: true,
            title: true,
            status: true,
            isAiGenerated: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' as const },
        },
        _count: { select: { treatments: true, clinicalDocuments: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto, requesterRole?: string) {
    const existingAppointment = await this.findById(id);
    const previousStatus = existingAppointment.status;

    // Regra: venda que já tem recebimento só pode ter os itens/valor alterados pelo ADM.
    if ((updateAppointmentDto as any).items !== undefined) {
      const nRec = await this.prisma.recebimento.count({ where: { appointmentId: id } });
      if (nRec > 0 && requesterRole && requesterRole.toUpperCase() !== 'ADMIN') {
        throw new ForbiddenException('Esta venda já tem recebimento — só um administrador pode alterar os itens/valor.');
      }
    }

    // Validações de relacionamentos (compatível com o Next)
    if (updateAppointmentDto.tutorId) {
      const tutor = await this.prisma.tutor.findUnique({
        where: { id: updateAppointmentDto.tutorId },
      });
      if (!tutor) throw new NotFoundException('Tutor não encontrado');
    }

    if (updateAppointmentDto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateAppointmentDto.userId },
      });
      if (!user) throw new NotFoundException('Veterinário não encontrado');
    }

    if (updateAppointmentDto.petId && updateAppointmentDto.tutorId) {
      const pet = await this.prisma.pet.findFirst({
        where: { id: updateAppointmentDto.petId, tutorId: updateAppointmentDto.tutorId },
      });
      if (!pet)
        throw new NotFoundException('Pet não encontrado ou não pertence ao tutor informado');
    }

    // 🔄 REMARCAÇÃO COM RASTRO (opção A — 31/07)
    // Quando a DATA de um agendamento ATIVO de agenda muda, em vez de editar em cima:
    // o antigo vira "Remarcado" (guarda o horário antigo p/ o histórico do pet) e cria-se um NOVO no horário novo.
    {
      const dRe = updateAppointmentDto as any;
      const novaData = dRe.date !== undefined ? new Date(dRe.date) : null;
      const mudouData =
        !!novaData &&
        Math.abs(novaData.getTime() - new Date(existingAppointment.date).getTime()) > 60000;
      const st = String(existingAppointment.status || '').toLowerCase();
      const ativo = !/(cancel|realiz|atend|conclu|complet|falt|no.?show|ausen|remarc|espera|aguard)/.test(st);
      const ehArtefato = /^(receitas?|documento|peso|observa|obs|vacina|v[íi]deo|video|exame|atendimento)/i.test(
        String(existingAppointment.type || ''),
      );
      const soAgenda =
        dRe.treatments === undefined &&
        dRe.items === undefined &&
        dRe.prescription === undefined &&
        dRe.diagnosis === undefined &&
        dRe.anamnesis === undefined;
      if (novaData && mudouData && ativo && !ehArtefato && soAgenda) {
        const base: any = existingAppointment;
        // 🛡️ TRAVA na REMARCAÇÃO (furo real 04/08: Kate×Luna na MAP 2 em 07/08): não deixa
        // remarcar/arrastar p/ um horário já ocupado na mesma agenda. excludeId=id ignora o próprio.
        await this.assertSemConflitoHorario({
          date: novaData,
          duration: dRe.duration ?? base.duration,
          userId: dRe.userId ?? base.userId,
          agendaAvulsa: dRe.agendaAvulsa ?? base.agendaAvulsa,
          status: 'Agendado',
          type: dRe.type ?? base.type,
          excludeId: id,
        });
        const novo = await this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
          const criado = await tx.appointment.create({
            data: {
              tutorId: dRe.tutorId ?? base.tutorId,
              petId: dRe.petId ?? base.petId,
              userId: dRe.userId ?? base.userId,
              date: novaData,
              duration: dRe.duration ?? base.duration ?? 30,
              type: dRe.type ?? base.type,
              description: dRe.description ?? base.description,
              notes: dRe.notes ?? base.notes,
              value: dRe.value ?? base.value ?? 0,
              status: dRe.status && !/remarc/i.test(String(dRe.status)) ? dRe.status : 'Agendado',
              paymentStatus: base.paymentStatus ?? 'PENDING',
              agendaAvulsa: dRe.agendaAvulsa ?? base.agendaAvulsa,
              chiefComplaint: dRe.chiefComplaint ?? base.chiefComplaint,
              ...(base.boardId ? { boardId: base.boardId } : {}),
            },
          });
          const quando = novaData.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          });
          await tx.appointment.update({
            where: { id },
            data: { status: 'Remarcado', motivoCancelamento: `Remarcado para ${quando}` },
          });
          return criado;
        });
        // Reagendamento: avisa o cliente do NOVO dia/horário pelo WhatsApp (mesma confirmação
        // do agendamento). Best-effort — se o WhatsApp falhar, a remarcação segue valendo.
        this.sendConfirmation(novo.id).catch(() => undefined);
        return this.findById(novo.id);
      }
    }

    const updateData: any = {};
    if (updateAppointmentDto.tutorId !== undefined)
      updateData.tutorId = updateAppointmentDto.tutorId;
    if (updateAppointmentDto.petId !== undefined) updateData.petId = updateAppointmentDto.petId;
    if (updateAppointmentDto.userId !== undefined) updateData.userId = updateAppointmentDto.userId;
    if (updateAppointmentDto.date !== undefined)
      updateData.date = new Date(updateAppointmentDto.date);
    if (updateAppointmentDto.description !== undefined)
      updateData.description = updateAppointmentDto.description;
    if (updateAppointmentDto.notes !== undefined) updateData.notes = updateAppointmentDto.notes;
    if (updateAppointmentDto.value !== undefined) updateData.value = updateAppointmentDto.value;
    if (updateAppointmentDto.duration !== undefined)
      updateData.duration = updateAppointmentDto.duration;
    if (updateAppointmentDto.status !== undefined) updateData.status = updateAppointmentDto.status;
    // Campos clínicos
    const dto = updateAppointmentDto as any;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.chiefComplaint !== undefined) updateData.chiefComplaint = dto.chiefComplaint;
    if (dto.anamnesis !== undefined) updateData.anamnesis = dto.anamnesis;
    if (dto.physicalExam !== undefined) updateData.physicalExam = dto.physicalExam;
    if (dto.diagnosis !== undefined) updateData.diagnosis = dto.diagnosis;
    if (dto.conduct !== undefined) updateData.conduct = dto.conduct;
    if (dto.prescription !== undefined) updateData.prescription = dto.prescription;
    if (dto.examsRequested !== undefined) updateData.examsRequested = dto.examsRequested;
    if (dto.followUpNotes !== undefined) updateData.followUpNotes = dto.followUpNotes;
    if (dto.nextReturnDate !== undefined) updateData.nextReturnDate = dto.nextReturnDate ? new Date(dto.nextReturnDate) : null;
    if (dto.petWeight !== undefined) updateData.petWeight = dto.petWeight;
    if (dto.temperature !== undefined) updateData.temperature = dto.temperature;
    if (dto.paymentMethod !== undefined) updateData.paymentMethod = dto.paymentMethod;
    if (dto.agendaAvulsa !== undefined) updateData.agendaAvulsa = dto.agendaAvulsa;
    if (updateAppointmentDto.paymentStatus !== undefined)
      updateData.paymentStatus = updateAppointmentDto.paymentStatus;
    if (updateAppointmentDto.boardId !== undefined)
      updateData.boardId = updateAppointmentDto.boardId;

    // 🛡️ TRAVA no MOVER/editar em cima: se a DATA muda sem passar pelo fork de remarcação
    // (ex.: edição que também carrega campos clínicos), ainda assim não pode cair sobre outro.
    if (updateData.date) {
      const dateMudou = Math.abs(new Date(updateData.date).getTime() - new Date(existingAppointment.date).getTime()) > 60000;
      if (dateMudou) {
        await this.assertSemConflitoHorario({
          date: updateData.date,
          duration: updateData.duration ?? existingAppointment.duration,
          userId: updateData.userId ?? existingAppointment.userId,
          agendaAvulsa: updateData.agendaAvulsa !== undefined ? updateData.agendaAvulsa : (existingAppointment as any).agendaAvulsa,
          status: updateData.status ?? existingAppointment.status,
          type: updateData.type ?? (existingAppointment as any).type,
          excludeId: id,
        });
      }
    }

    const result = await this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const updatedAppointment = await tx.appointment.update({ where: { id }, data: updateData });

      if (updateAppointmentDto.treatments !== undefined) {
        await tx.treatment.deleteMany({ where: { appointmentId: id } });

        if (updateAppointmentDto.treatments && updateAppointmentDto.treatments.length > 0) {
          for (const t of updateAppointmentDto.treatments) {
            if (t.productId) {
              const p = await tx.product.findUnique({ where: { id: t.productId } });
              if (!p) throw new BadRequestException(`Produto com ID ${t.productId} não encontrado`);
            }
          }

          await tx.treatment.createMany({
            data: updateAppointmentDto.treatments.map((t) => ({
              description: t.description,
              cost: t.cost,
              productId: t.productId || null,
              appointmentId: id,
              petId: (updateAppointmentDto.petId || updatedAppointment.petId) as string,
            })) as any,
          });
        }
      }

      // Itens da venda (appointmentItem): substitui a lista inteira quando `items` vier no update.
      const itemsUpd = (updateAppointmentDto as any).items as any[] | undefined;
      if (itemsUpd !== undefined) {
        await tx.appointmentItem.deleteMany({ where: { appointmentId: id } });
        if (itemsUpd && itemsUpd.length > 0) {
          await tx.appointmentItem.createMany({
            data: itemsUpd.map((it: any) => {
              const qtd = Number(it.quantidade ?? 1);
              const unit = Number(it.valorUnitario ?? 0);
              const desc = Number(it.desconto ?? 0);
              const total = Number.isFinite(it.valorTotal) ? Number(it.valorTotal) : (qtd * unit - desc);
              return {
                appointmentId: id,
                servicoId: it.servicoId ?? null,
                productId: it.productId ?? null,
                descricao: it.descricao ?? null,
                executorUserId: it.executorUserId ?? null,
                fornecedorId: it.fornecedorId ?? null,
                quantidade: qtd,
                valorUnitario: unit,
                custoUnitario: Number(it.custoUnitario ?? 0),
                desconto: desc,
                valorTotal: total,
                comissaoBase: it.comissaoBase ?? null,
                comissaoTipo: it.comissaoTipo ?? null,
                comissaoValor: it.comissaoValor != null ? Number(it.comissaoValor) : null,
                comissaoCalculada: it.comissaoCalculada != null ? Number(it.comissaoCalculada) : null,
                observacoes: it.observacoes ?? null,
              };
            }),
          });
        }
      }

      return tx.appointment.findUnique({
        where: { id },
        include: {
          tutor: { select: { id: true, name: true, email: true, contacts: true } },
          pet: { select: { id: true, name: true, species: true } },
          user: { select: { id: true, name: true, email: true } },
          treatments: { include: { product: true } },
          _count: { select: { treatments: true } },
        },
      });
    });

    // numeroVenda: se a atualização deixou o atendimento como venda (value>0) e ele ainda não tem número, atribui
    if (result && (Number(result.value) || 0) > 0) {
      try { (result as any).numeroVenda = await ensureNumeroVenda(this.prisma, result.id); }
      catch (e) { console.error('numeroVenda (update) falhou:', e); }
    }

    // Se o valor da venda mudou (edição de itens), reavalia se ainda está paga ou voltou a ter saldo.
    if (result && ((updateAppointmentDto as any).items !== undefined || updateAppointmentDto.value !== undefined)) {
      try {
        const recs = await this.prisma.recebimento.findMany({ where: { appointmentId: id }, select: { valorTotal: true } });
        const pago = recs.reduce((s, r) => s + Number(r.valorTotal), 0);
        const valor = Number(result.value) || 0;
        const novoStatus = pago >= valor - 0.001 && valor > 0 ? 'PAID' : (pago > 0 ? 'PENDING' : result.paymentStatus);
        if (novoStatus !== result.paymentStatus) {
          await this.prisma.appointment.update({ where: { id }, data: { paymentStatus: novoStatus } });
          (result as any).paymentStatus = novoStatus;
        }
      } catch (e) { console.error('reavaliar paymentStatus (update) falhou:', e); }
    }

    // Emit events based on status change
    if (result && updateAppointmentDto.status && updateAppointmentDto.status !== previousStatus) {
      const primaryContact = (result.tutor as any)?.contacts?.find((c: any) => c.isPrimary);
      const eventData = {
        appointmentId: result.id,
        date: result.date,
        status: result.status,
        petId: result.pet?.id,
        petName: result.pet?.name,
        tutorId: result.tutor?.id,
        tutorName: result.tutor?.name,
        tutorPhone: primaryContact?.number,
        tutorEmail: (result.tutor as any)?.email,
      };

      const newStatus = updateAppointmentDto.status;
      if (newStatus === 'CONFIRMED') {
        this.eventsService.emitAppointmentConfirmed(result.user?.id || 'system', eventData);
      } else if (newStatus === 'CANCELLED') {
        this.eventsService.emitAppointmentCancelled(result.user?.id || 'system', eventData);
      } else if (newStatus === 'COMPLETED') {
        this.eventsService.emitAppointmentCompleted(result.user?.id || 'system', eventData);
      }

      // Move cards in both Consultation and Appointment boards
      const consultationColumnMap: Record<string, string> = {
        SCHEDULED: 'Agendada',
        CONFIRMED: 'Aguardando',
        IN_PROGRESS: 'Em Atendimento',
        COMPLETED: 'Finalizada',
        CANCELLED: 'Cancelada',
      };
      const appointmentColumnMap: Record<string, string> = {
        SCHEDULED: 'Agendada',
        CONFIRMED: 'Confirmada',
        IN_PROGRESS: 'Em Andamento',
        COMPLETED: 'Concluída',
        CANCELLED: 'Cancelada',
      };

      const consultationCol = consultationColumnMap[newStatus];
      const appointmentCol = appointmentColumnMap[newStatus];

      if (consultationCol || appointmentCol) {
        this.boardsService
          .moveAllCardsForAppointment(result.id, consultationCol, appointmentCol)
          .catch((err) => console.error('Error moving cards:', err));
      }
    }

    this.eventsService.emitAppointmentChanged(); // tempo real da agenda (remarcar/status/etc.)
    return result;
  }

  async remove(id: string, force = false) {
    await this.findById(id);

    // PROTEÇÃO (fase de teste): apagar um atendimento apaga em cascata a gravação de
    // áudio da consulta. Se existir gravação, bloqueia — pra ninguém perder áudio sem querer.
    // Só passa com force=true (confirmação explícita "apagar mesmo assim").
    if (!force) {
      const gravacao = await this.prisma.consultationRecording.findUnique({
        where: { appointmentId: id },
        select: { id: true },
      });
      if (gravacao) {
        throw new ConflictException(
          'TEM_GRAVACAO: Este atendimento tem uma gravação de áudio salva. Apagar o atendimento apagaria a gravação junto. Confirme se quer mesmo apagar tudo.',
        );
      }
    }

    const removido = await this.prisma.appointment.delete({
      where: { id },
    });
    this.eventsService.emitAppointmentChanged(); // tempo real da agenda
    return removido;
  }

  async getUpcoming(userId?: string, days = 7) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.findAll({
      userId,
      startDate,
      endDate,
      take: 50,
    });
  }
}

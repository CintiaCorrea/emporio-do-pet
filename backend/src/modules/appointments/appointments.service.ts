// [EMP-COWORK] fix: bloco de `items` movido pra fora do if de `treatments` (servicos salvavam so com tratamento). Cintia 06/06.
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
    const prof = (appt.user?.name || 'nossa equipe').trim();
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
    const res = await this.whatsapp.enviarTemplateRegistrando(phone, templateName, params, '📲 Confirmação de agendamento enviada pelo WhatsApp.');

    if (!res.success) {
      return { success: false, error: res.error || 'Falha ao enviar pelo WhatsApp.' };
    }

    await this.prisma.appointment.update({
      where: { id },
      data: { confirmacaoStatus: 'ENVIADA', confirmacaoEnviadaAt: new Date() },
    });

    return { success: true, to: phone, templateName };
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

    const result = await this.prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const appointment = await tx.appointment.create({ data: appointmentData });

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
          pet: { select: { id: true, name: true, species: true, breed: true, temperament: true } },
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
        user: { select: { id: true, name: true, email: true } },
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

    return result;
  }

  async remove(id: string) {
    await this.findById(id);

    return this.prisma.appointment.delete({
      where: { id },
    });
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

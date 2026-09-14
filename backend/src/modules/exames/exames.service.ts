import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { exameElegivelLote, precisaLembrarSolicitacao, textoDoLembrete, atingiuFase, faseDeRetirada, FASES_PADRAO, atrasoDoExame, fasesVigentes, ehArquivado, podeSerExpurgado, diasAteExpurgo, podeAvisarCliente, respostaMarcaEntregue } from './exames.regras';

/**
 * Aviso de COLETA ao laboratório (Fatia 3 dos exames).
 * Exames na fase "Coleta solicitada" (status contém "coleta") que ainda não foram
 * avisados disparam um WhatsApp pro laboratório (fornecedor.telefone) com o template
 * Meta `solicitacao_coleta_exame` ({{1}} paciente, {{2}} exame). Marca `labAvisadoAt`
 * no próprio exame (petexa_) SÓ quando o envio dá certo — assim, enquanto o template
 * estiver pendente na Meta, ele re-tenta nas próximas janelas.
 */
@Injectable()
export class ExamesService {
  private readonly logger = new Logger(ExamesService.name);
  private readonly TEMPLATE = 'solicitacao_coleta_exame';       // manual (urgência): específico do exame
  private readonly TEMPLATE_LOTE = 'solicitacao_coleta_lote';   // lote 11/17: genérico, 1 msg/laboratório
  private readonly TEMPLATE_CLIENTE = 'resultado_exame_pronto'; // ao tutor: o laudo chegou

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly notifications: NotificationsService,
  ) {}

  private async enviar(fornecedor: { nome?: string; telefone?: string | null }, petNome: string, exameNome: string): Promise<{ ok: boolean; messageId?: string; erro?: string }> {
    if (!fornecedor?.telefone) return { ok: false, erro: 'Laboratório sem WhatsApp' };
    try {
      const res: any = await this.whatsapp.sendTemplateMessage(fornecedor.telefone, this.TEMPLATE, [
        { type: 'text', text: petNome || 'Paciente' },
        { type: 'text', text: exameNome || 'Exame' },
      ]);
      return { ok: !!res?.success, messageId: res?.messageId, erro: res?.error };
    } catch (e) {
      const erro = String((e as any)?.message || e);
      this.logger.warn(`Falha ao avisar laboratório ${fornecedor?.nome}: ${erro}`);
      return { ok: false, erro };
    }
  }

  /** Envio GENÉRICO ao laboratório (lote): "solicitar coleta", sem especificar exames. 1 msg/lab. */
  private async enviarLote(fornecedor: { nome?: string; telefone?: string | null }): Promise<{ ok: boolean; messageId?: string; erro?: string }> {
    if (!fornecedor?.telefone) return { ok: false, erro: 'Laboratório sem WhatsApp' };
    try {
      const res: any = await this.whatsapp.sendTemplateMessage(fornecedor.telefone, this.TEMPLATE_LOTE, []);
      return { ok: !!res?.success, messageId: res?.messageId, erro: res?.error };
    } catch (e) {
      const erro = String((e as any)?.message || e);
      this.logger.warn(`Falha ao solicitar coleta ao laboratório ${fornecedor?.nome}: ${erro}`);
      return { ok: false, erro };
    }
  }

  /**
   * AVISA O TUTOR de que o laudo chegou.
   *
   * Cintia, 12/09/2026: "envia mensagem para o cliente que o exame está pronto".
   *
   * DESLIGADO até `EXAMES_AVISO_CLIENTE_ATIVO=1`, pelo mesmo motivo do lote ao laboratório: o
   * template precisa estar aprovado na Meta, e mensagem para cliente não é coisa que se ligue
   * "para ver no que dá" — sai do nosso lado e chega no celular de quem pagou pelo exame.
   *
   * `clienteAvisadoAt` só é gravado quando o envio DÁ CERTO (escolha dela, 13/09: "só conta se a
   * mensagem saiu"). Enquanto não sair, o card continua mostrando o botão de avisar, e a resposta
   * do cliente não fecha o exame.
   */
  async avisarClienteDoResultado(itemId: string): Promise<{ ok: boolean; erro?: string; desligado?: boolean }> {
    if (process.env.EXAMES_AVISO_CLIENTE_ATIVO !== '1') return { ok: false, desligado: true };
    const it = await this.prisma.listaItem.findUnique({ where: { id: itemId }, select: { id: true, lista: true, valor: true } });
    if (!it || !it.lista.startsWith('petexa_')) return { ok: false, erro: 'Exame não encontrado' };
    let d: any = null;
    try { d = JSON.parse(it.valor); } catch { return { ok: false, erro: 'Exame ilegível' }; }
    if (!podeAvisarCliente(d)) return { ok: false, erro: 'Este exame não está pronto para avisar o cliente' };

    const petId = it.lista.replace('petexa_', '');
    const pet: any = await this.prisma.pet.findUnique({
      where: { id: petId },
      select: { name: true, tutor: { select: { id: true, name: true, contacts: true } } },
    }).catch(() => null);
    const contatos = (pet?.tutor?.contacts || []) as any[];
    const wa = contatos.find((c) => c.isWhatsApp) || contatos.find((c) => c.isPrimary) || contatos[0];
    if (!wa?.number) return { ok: false, erro: 'Tutor sem WhatsApp cadastrado' };

    let res: any = null;
    try {
      res = await this.whatsapp.sendTemplateMessage(wa.number, this.TEMPLATE_CLIENTE, [
        { type: 'text', text: pet?.name || 'seu pet' },
        { type: 'text', text: d.nome || 'Exame' },
      ]);
    } catch (e) {
      const erro = String((e as any)?.message || e);
      this.logger.warn(`Falha ao avisar tutor sobre o laudo: ${erro}`);
      return { ok: false, erro };
    }
    if (!res?.success) return { ok: false, erro: res?.error || 'Não consegui enviar (o template pode estar em aprovação na Meta)' };

    await this.prisma.listaItem.update({
      where: { id: itemId },
      data: { valor: JSON.stringify({ ...d, clienteAvisadoAt: new Date().toISOString(), clienteMessageId: res?.messageId || null, tutorId: pet?.tutor?.id || d.tutorId || null }) },
    });
    return { ok: true };
  }

  /**
   * O CLIENTE RESPONDEU: os exames avisados daquele tutor passam a entregues e saem do quadro.
   *
   * Cintia, 16/09/2026: "assim que o vet recebe o retorno do cliente o card pode sair da lista,
   * pois aí o resultado já está sendo passado".
   *
   * QUALQUER resposta conta — foi o desenho dela, e faz sentido: a conversa começou. Por isso a
   * equipe é NOTIFICADA de cada exame que sai assim; um card sumindo do quadro sozinho, sem
   * ninguém saber por quê, é a diferença entre automático e misterioso.
   */
  async marcarEntregueAoResponder(tutorId: string, quando?: string): Promise<{ entregues: number }> {
    if (!tutorId) return { entregues: 0 };
    const pets = await this.prisma.pet.findMany({ where: { tutorId }, select: { id: true, name: true } }).catch(() => [] as any[]);
    if (!pets.length) return { entregues: 0 };

    const fases = await this.fasesExame();
    const terminal = fases.length ? fases[fases.length - 1] : 'Entregue';
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { in: pets.map((p: any) => `petexa_${p.id}`) } },
      select: { id: true, lista: true, valor: true },
    }).catch(() => [] as any[]);

    const nomePorPet = new Map(pets.map((p: any) => [p.id, p.name]));
    const fechados: string[] = [];
    for (const it of itens) {
      let d: any; try { d = JSON.parse(it.valor); } catch { continue; }
      if (!respostaMarcaEntregue(d, quando)) continue;
      const ok = await this.prisma.listaItem.update({
        where: { id: it.id },
        data: { valor: JSON.stringify({ ...d, entregueAt: new Date().toISOString(), status: terminal }) },
      }).catch(() => null);
      if (ok) fechados.push(`${nomePorPet.get(it.lista.replace('petexa_', '')) || 'Paciente'} — ${d.nome || 'Exame'}`);
    }

    if (fechados.length) await this.avisarEquipeDaEntrega(fechados);
    return { entregues: fechados.length };
  }

  /** A equipe fica sabendo: card que some sozinho sem explicação vira desconfiança no sistema. */
  private async avisarEquipeDaEntrega(fechados: string[]): Promise<void> {
    try {
      const equipe = await this.prisma.user.findMany({
        where: { isBlocked: false, role: { in: ['VETERINARIAN', 'ADMIN', 'RECEPTIONIST'] } },
        select: { id: true },
      });
      for (const u of equipe) {
        await this.notifications.create({
          userId: u.id,
          type: NotificationType.INFO,
          title: fechados.length === 1 ? 'Exame entregue ao cliente' : `${fechados.length} exames entregues ao cliente`,
          message: `${fechados.slice(0, 4).join('; ')}${fechados.length > 4 ? ` e mais ${fechados.length - 4}` : ''}. O cliente respondeu, então o card saiu do quadro.`,
          link: '/dashboard/erp/exames-kanban',
          metadata: { kind: 'exame_entregue' },
        }).catch(() => undefined);
      }
    } catch (e) {
      this.logger.warn(`Falha ao avisar equipe da entrega: ${String((e as any)?.message || e)}`);
    }
  }

  /**
   * (Fatia 3b) Reflete no exame o status de entrega vindo da Meta (evento desacoplado do webhook do
   * WhatsApp). Casa pelo labMessageId guardado no envio. Em 'failed', re-tenta no próximo lote (até 3x)
   * e alerta a equipe. NUNCA lança — é chamado por evento e não pode afetar o fluxo do WhatsApp.
   */
  @OnEvent('whatsapp.status')
  async refletirStatusLab(ev: { waMessageId?: string; status?: string; erro?: string }): Promise<void> {
    try {
      const wamid = ev?.waMessageId;
      const st = String(ev?.status || '').toLowerCase();
      if (!wamid || !['delivered', 'read', 'failed'].includes(st)) return; // 'sent' já é o estado inicial
      const itens = await this.prisma.listaItem.findMany({
        where: { lista: { startsWith: 'petexa_' }, valor: { contains: wamid } },
        select: { id: true, valor: true },
      });
      for (const it of itens) {
        let d: any = null;
        try { d = JSON.parse(it.valor); } catch { continue; }
        if (!d || d.labMessageId !== wamid) continue; // o `contains` é grosso; confere o campo exato
        const patch: any = { ...d, labStatus: st };
        if (st === 'failed') {
          const tent = Number(d.labTentativas || 0) + 1;
          patch.labTentativas = tent;
          patch.labUltimoErro = ev.erro || 'Falha na entrega (Meta)';
          if (tent < 3) delete patch.labAvisadoAt; // volta pra fila → re-tenta no próximo lote (até 3x)
          await this.alertarFalhaLab(d.fornecedorNome || 'Laboratório', ev.erro || 'falha na entrega', 1);
        }
        await this.prisma.listaItem.update({ where: { id: it.id }, data: { valor: JSON.stringify(patch) } }).catch(() => {});
      }
    } catch (e) {
      this.logger.warn(`Falha ao refletir status do lab: ${String((e as any)?.message || e)}`);
    }
  }

  /** Alerta a equipe (notificação + push) quando a solicitação NÃO chega ao laboratório. */
  private async alertarFalhaLab(labNome: string, motivo: string, qtd: number): Promise<void> {
    try {
      const equipe = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'RECEPTIONIST'] }, isBlocked: false },
        select: { id: true },
      });
      for (const u of equipe) {
        await this.notifications.create({
          userId: u.id,
          type: NotificationType.WARNING,
          title: '⚠️ Laboratório não recebeu a solicitação',
          message: `${labNome}: ${qtd} exame(s) não saíram (${motivo}). Confira o WhatsApp do laboratório em Fornecedores.`,
          link: '/dashboard/erp/exames-kanban',
          metadata: { kind: 'lab_exame_falha' },
        }).catch(() => undefined);
      }
    } catch (e) {
      this.logger.warn(`Falha ao alertar equipe sobre lab: ${String((e as any)?.message || e)}`);
    }
  }

  private async nomePet(petId: string): Promise<string> {
    try {
      const p = await this.prisma.pet.findUnique({ where: { id: petId }, select: { name: true } });
      return p?.name || 'Paciente';
    } catch { return 'Paciente'; }
  }

  /** FILA (Kanban): todos os exames em andamento (exclui os já "Entregue"), com nome do pet/tutor e lab. */
  async listarFila() {
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { startsWith: 'petexa_' } },
      select: { id: true, lista: true, valor: true },
    });
    const linhas: any[] = [];
    const petIds = new Set<string>();
    const fornIds = new Set<string>();
    for (const it of itens) {
      let d: any = null;
      try { d = JSON.parse(it.valor); } catch { continue; }
      if (!d?.nome) continue;
      if (ehArquivado(d)) continue;                         // tirado do quadro, guardado por 45 dias
      if (/entreg/i.test(String(d.status || ''))) continue; // "Entregue" saiu do quadro
      const petId = it.lista.replace('petexa_', '');
      petIds.add(petId);
      if (d.fornecedorId) fornIds.add(d.fornecedorId);
      linhas.push({
        itemId: it.id, petId, nome: d.nome, status: String(d.status || ''),
        fornecedorId: d.fornecedorId || null, externo: !!d.externo,
        labAvisadoAt: d.labAvisadoAt || null, date: d.date || null,
        resultadoUrl: d.resultadoUrl || null,
        prazoDias: d.prazoDias ?? null, historico: d.historico || null,
        entregueAt: d.entregueAt || null,
        clienteAvisadoAt: d.clienteAvisadoAt || null,
        podeAvisarCliente: podeAvisarCliente(d),
      });
    }
    const [pets, forns] = await Promise.all([
      petIds.size ? this.prisma.pet.findMany({ where: { id: { in: [...petIds] } }, select: { id: true, name: true, tutor: { select: { name: true } } } }) : Promise.resolve([]),
      fornIds.size ? this.prisma.fornecedor.findMany({ where: { id: { in: [...fornIds] } }, select: { id: true, nome: true, telefone: true } }) : Promise.resolve([]),
    ]);
    const petMap: Record<string, any> = Object.fromEntries(pets.map((p) => [p.id, p]));
    const fornMap: Record<string, any> = Object.fromEntries(forns.map((f) => [f.id, f]));
    // O ATRASO VAI JUNTO (Cintia, 12/09/2026: "o box pode ficar de outra cor para mostrar que
    // esta atrasado"). Calculado aqui e nao na tela: e a mesma conta do aviso que vai pros
    // veterinarios, e duas contas de atraso dariam duas verdades sobre o mesmo exame.
    const fases = await this.fasesExame();
    return linhas.map((l) => ({
      ...l,
      atraso: atrasoDoExame(l as any, fases),
      petNome: petMap[l.petId]?.name || 'Paciente',
      tutorNome: petMap[l.petId]?.tutor?.name || '',
      fornecedorNome: l.fornecedorId ? (fornMap[l.fornecedorId]?.nome || null) : null,
      labTemWhatsapp: l.fornecedorId ? !!fornMap[l.fornecedorId]?.telefone : false,
    }));
  }

  /** Move o exame de fase (drag no Kanban). Registra no histórico sem apagar o anterior. */
  async mudarFase(itemId: string, status: string): Promise<{ ok: boolean; erro?: string }> {
    const it = await this.prisma.listaItem.findUnique({ where: { id: itemId }, select: { id: true, lista: true, valor: true } });
    if (!it || !it.lista.startsWith('petexa_')) return { ok: false, erro: 'Exame não encontrado' };
    let d: any = null;
    try { d = JSON.parse(it.valor); } catch { return { ok: false, erro: 'Exame ilegível' }; }
    const nova = String(status || '').trim();
    if (!nova) return { ok: false, erro: 'Fase inválida' };
    const historico = { ...(d.historico || {}) };
    if (!historico[nova]) historico[nova] = { at: new Date().toISOString() };
    await this.prisma.listaItem.update({ where: { id: itemId }, data: { valor: JSON.stringify({ ...d, status: nova, historico }) } });
    return { ok: true };
  }

  /**
   * Tira o exame do Kanban — ARQUIVANDO, não apagando. Não mexe na venda/financeiro.
   *
   * Cintia, 13/09: "Arquivar, reversível". 14/09: "Pode ficar arquivado por 45 dias".
   *
   * O card sai do quadro na hora (a fila ignora arquivado), mas continua no banco por 45 dias,
   * visível em "Arquivados" e restaurável num clique. Depois disso o expurgo apaga.
   *
   * `definitivo` apaga na hora e é só do ADMIN. Existe para o card que nunca deveria ter sido
   * criado — teste, duplicata, pet errado — e que não faz sentido guardar por 45 dias.
   */
  async excluir(
    itemId: string,
    opts?: { definitivo?: boolean; papel?: string; porQuem?: string },
  ): Promise<{ ok: boolean; erro?: string; arquivado?: boolean }> {
    const it = await this.prisma.listaItem.findUnique({ where: { id: itemId }, select: { id: true, lista: true, valor: true } });
    if (!it || !it.lista.startsWith('petexa_')) return { ok: false, erro: 'Exame não encontrado' };

    if (opts?.definitivo) {
      // A trava do apagar de vez mora AQUI, no servidor. Esconder o botão na tela não é trava:
      // a rota continuaria aberta para quem soubesse chamá-la.
      if (String(opts.papel || '').toUpperCase() !== 'ADMIN') {
        return { ok: false, erro: 'Só o administrativo apaga um exame definitivamente.' };
      }
      await this.prisma.listaItem.delete({ where: { id: itemId } });
      return { ok: true, arquivado: false };
    }

    let d: any = null;
    try { d = JSON.parse(it.valor); } catch { d = null; }
    // Card ilegível não tem como ser arquivado (não há JSON onde gravar a marca) — e também não
    // pode ficar entalado no quadro sem ninguém conseguir tirá-lo. Esse, sim, sai.
    if (!d) {
      await this.prisma.listaItem.delete({ where: { id: itemId } });
      return { ok: true, arquivado: false };
    }
    if (d.arquivadoEm) return { ok: true, arquivado: true };   // já estava fora: nada a fazer

    await this.prisma.listaItem.update({
      where: { id: itemId },
      data: { valor: JSON.stringify({ ...d, arquivadoEm: new Date().toISOString(), arquivadoPor: opts?.porQuem || null }) },
    });
    return { ok: true, arquivado: true };
  }

  /**
   * O LAUDO CHEGOU: grava o arquivo no card e move para "Resultado", numa operação só.
   *
   * Cintia, 12/09/2026: "Ao anexar o exame pelo kanban ele salva na ficha do pet". Não há cópia
   * a fazer — o card É o registro do pet (mesma lista `petexa_<pet>` que a ficha lê). O que este
   * método garante é que as duas coisas andem juntas: gravar o laudo e dizer que ele chegou.
   *
   * Separadas, a primeira podia dar certo e a segunda falhar, deixando o card com laudo anexado
   * parado em "Retirado" — dizendo que o laboratório ainda está com o material, e contando
   * atraso de um exame que já voltou.
   */
  async anexarResultado(
    itemId: string,
    url: string,
    arquivo?: string,
    porQuem?: string,
  ): Promise<{ ok: boolean; erro?: string; status?: string; clienteAvisado?: boolean }> {
    const limpa = String(url || '').trim();
    if (!limpa) return { ok: false, erro: 'Laudo sem arquivo' };
    const it = await this.prisma.listaItem.findUnique({ where: { id: itemId }, select: { id: true, lista: true, valor: true } });
    if (!it || !it.lista.startsWith('petexa_')) return { ok: false, erro: 'Exame não encontrado' };
    let d: any = null;
    try { d = JSON.parse(it.valor); } catch { return { ok: false, erro: 'Exame ilegível' }; }

    const fases = await this.fasesExame();
    // Posicional, como o resto: a coluna do laudo pode se chamar outra coisa amanhã. Sem uma
    // coluna de resultado configurada, o laudo é gravado e a fase fica onde está — melhor um
    // card na coluna errada do que o anexo recusado.
    const faseResultado = fases.find((f) => /resultad/i.test(String(f || ''))) || d.status;
    const historico = { ...(d.historico || {}) };
    if (faseResultado && !historico[faseResultado]) {
      historico[faseResultado] = { at: new Date().toISOString(), por: porQuem || null };
    }

    await this.prisma.listaItem.update({
      where: { id: itemId },
      data: {
        valor: JSON.stringify({
          ...d,
          resultadoUrl: limpa,
          resultadoArquivo: arquivo || d.resultadoArquivo || null,
          resultadoEm: new Date().toISOString(),
          resultadoPor: porQuem || null,
          status: faseResultado,
          historico,
        }),
      },
    });
    // O AVISO AO CLIENTE VAI JUNTO, mas NÃO pode derrubar o anexo. O laudo já está salvo; se o
    // WhatsApp falhar (template em aprovação, tutor sem número), o card mostra o botão de avisar
    // e alguém manda à mão. Perder o anexo por causa da mensagem seria trocar o certo pelo extra.
    const aviso = await this.avisarClienteDoResultado(itemId).catch(() => ({ ok: false } as any));
    return { ok: true, status: faseResultado, clienteAvisado: !!aviso?.ok };
  }

  /** Devolve o exame arquivado ao quadro, na fase em que ele estava. */
  async restaurar(itemId: string): Promise<{ ok: boolean; erro?: string }> {
    const it = await this.prisma.listaItem.findUnique({ where: { id: itemId }, select: { id: true, lista: true, valor: true } });
    if (!it || !it.lista.startsWith('petexa_')) return { ok: false, erro: 'Exame não encontrado' };
    let d: any = null;
    try { d = JSON.parse(it.valor); } catch { return { ok: false, erro: 'Exame ilegível' }; }
    // A fase não é tocada: o card volta para a coluna de onde saiu, e não para o começo. Voltar
    // ao início faria a equipe pedir de novo uma coleta que o laboratório já fez.
    const { arquivadoEm, arquivadoPor, ...resto } = d;
    await this.prisma.listaItem.update({ where: { id: itemId }, data: { valor: JSON.stringify(resto) } });
    return { ok: true };
  }

  /** Os arquivados, com quantos dias faltam para o expurgo. Fora do quadro, mas achável. */
  async listarArquivados() {
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { startsWith: 'petexa_' } },
      select: { id: true, lista: true, valor: true },
    });
    const linhas: any[] = [];
    const petIds = new Set<string>();
    for (const it of itens) {
      let d: any = null;
      try { d = JSON.parse(it.valor); } catch { continue; }
      if (!ehArquivado(d) || !d?.nome) continue;
      const petId = it.lista.replace('petexa_', '');
      petIds.add(petId);
      linhas.push({
        itemId: it.id, petId, nome: d.nome, status: String(d.status || ''),
        arquivadoEm: d.arquivadoEm, diasParaApagar: diasAteExpurgo(d),
      });
    }
    const pets = petIds.size
      ? await this.prisma.pet.findMany({ where: { id: { in: [...petIds] } }, select: { id: true, name: true, tutor: { select: { name: true } } } })
      : [];
    const petMap: Record<string, any> = Object.fromEntries(pets.map((p: any) => [p.id, p]));
    return linhas
      .map((l) => ({ ...l, petNome: petMap[l.petId]?.name || 'Paciente', tutorNome: petMap[l.petId]?.tutor?.name || '' }))
      .sort((a, b) => String(a.arquivadoEm).localeCompare(String(b.arquivadoEm)));
  }

  /**
   * O EXPURGO: apaga de vez o que está arquivado há mais de 45 dias.
   *
   * Apaga UM listaItem por vez, nunca em lote com `deleteMany` sobre um filtro: a data mora
   * dentro do JSON e um filtro amplo demais neste lugar já levou 22 vendas embora em 31/08/2026.
   * Cada card é lido, conferido pela regra e apagado sozinho.
   */
  async expurgarArquivados(agora?: Date | string): Promise<{ apagados: number }> {
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { startsWith: 'petexa_' } },
      select: { id: true, valor: true },
    }).catch(() => [] as any[]);
    let apagados = 0;
    for (const it of itens) {
      let d: any = null;
      try { d = JSON.parse(it.valor); } catch { continue; }   // ilegível não é expurgado por engano
      if (!podeSerExpurgado(d, agora)) continue;
      const r = await this.prisma.listaItem.delete({ where: { id: it.id } }).catch(() => null);
      if (r) apagados++;
    }
    return { apagados };
  }

  /** 1ª fase configurada dos exames (Config › Exames = exame_fases). Fallback "Solicitado". */
  /** As fases configuradas, na ordem (Config › Exames = exame_fases). */
  private async fasesExame(): Promise<string[]> {
    try {
      const arr = await this.prisma.listaItem.findMany({ where: { lista: 'exame_fases' }, orderBy: { createdAt: 'asc' } });
      const nomes = arr.map((i) => { try { const o = JSON.parse(i.valor); return o?.nome || i.valor; } catch { return i.valor; } }).filter(Boolean);
      // `fasesVigentes` tira os nomes aposentados (hoje: "Aguardando"). Sem isto, a coluna que a
      // Cintia mandou eliminar continua na tela de quem já tinha configurado — e o exame parado
      // nela não conta atraso, porque atraso só corre na coluna de retirada.
      if (nomes.length) return fasesVigentes(nomes);
    } catch { /* usa o padrao */ }
    // O padrao acompanha as tres colunas de 12/09/2026 (exames.regras.FASES_PADRAO). Se a casa
    // configurou as dela em Config > Exames, valem as dela — isto aqui e so a rede.
    return [...FASES_PADRAO];
  }

  private async faseInicialExame(): Promise<string> {
    // Pela MESMA lista que o quadro usa: o exame nasce numa coluna que existe. Lendo direto do
    // banco, um nome aposentado no topo faria o card nascer fora do quadro.
    const fases = await this.fasesExame();
    return fases[0] || 'Solicitado';
  }

  /**
   * Inicia o ciclo (petexa_<pet>) de cada exame VENDIDO/CONVERTIDO. Fonte única usada tanto pela
   * venda direta (PDV) quanto pela conversão de orçamento — sem duplicar lógica.
   * examItems: { descricao, catalogoExameId, fornecedorId, valorUnitario, origem? }.
   */
  async iniciarExamesDaVenda(petId: string, examItems: any[]): Promise<number> {
    if (!petId || !examItems?.length) return 0;
    const fase = await this.faseInicialExame();
    let n = 0;
    for (const it of examItems) {
      let fornecedorId: string | null = it.fornecedorId || null;
      let fornecedorNome: string | null = null;
      let custo: number | null = null;
      let valorSugerido: number | null = null;
      let prazoDias: number | null = it.tempoResultadoDias ?? null;
      // Fonte ANTIGA: exame vem por catalogoExameId (exa_catalogo).
      if (it.catalogoExameId) {
        const cat: any = await this.prisma.catalogoExame.findUnique({
          where: { id: it.catalogoExameId },
          select: { valorFornecedor: true, valorClienteSugerido: true, tempoResultadoDias: true, fornecedorId: true, fornecedor: { select: { nome: true } } },
        }).catch(() => null);
        if (cat) { fornecedorId = fornecedorId || cat.fornecedorId || null; fornecedorNome = cat.fornecedor?.nome ?? null; custo = cat.valorFornecedor ?? null; valorSugerido = cat.valorClienteSugerido ?? null; prazoDias = prazoDias ?? cat.tempoResultadoDias ?? null; }
      }
      // Fonte NOVA: exame vem por catalogoItemId (cat_item_exame → lab/custo; ItemCatalogo → preço).
      if (fornecedorNome == null && custo == null && it.catalogoItemId) {
        const ex = await this.prisma.itemExame.findUnique({
          where: { itemId: it.catalogoItemId },
          select: { custoLab: true, fornecedorId: true, item: { select: { preco: true } } },
        }).catch(() => null);
        if (ex) {
          fornecedorId = fornecedorId || ex.fornecedorId || null;
          custo = ex.custoLab ?? null;
          valorSugerido = ex.item?.preco ?? null;
          if (ex.fornecedorId) {
            const forn = await this.prisma.fornecedor.findUnique({ where: { id: ex.fornecedorId }, select: { nome: true } }).catch(() => null);
            fornecedorNome = forn?.nome ?? null;
          }
        }
      }
      const now = new Date().toISOString();
      const origem = it.origem || 'PDV';
      const d = {
        nome: it.descricao || it.nome || 'Exame', status: fase, date: now, externo: true,
        // O PRAZO DO LABORATORIO, do cadastro do exame. Guardado no card para o aviso de atraso
        // nao depender de ir ao catalogo a cada leitura — e para continuar valendo o prazo do
        // dia em que o exame foi pedido, mesmo que o cadastro mude depois.
        prazoDias: prazoDias ?? null,
        // O ITEM DA VENDA que gerou este exame. Sem isso nao da pra dizer "esta conta a pagar e
        // deste exame que chegou em retirar" — so daria pra casar por nome, que erra em cliente
        // com dois exames iguais. (Cintia, 07/09/2026: o a-pagar nasce na coluna de retirada.)
        itemVendaId: it.appointmentItemId || null,
        fornecedorId,
        fornecedorNome,
        custo: custo ?? (it.custoUnitario != null ? Number(it.custoUnitario) : null),
        valor: valorSugerido ?? (Number(it.valorUnitario) || null),
        origem,
        historico: { [fase]: { at: now, por: origem } },
      };
      try { await this.prisma.listaItem.create({ data: { lista: `petexa_${petId}`, valor: JSON.stringify(d) } }); n++; } catch { /* não trava a venda */ }
    }
    return n;
  }

  /**
   * OS ITENS DE VENDA cujo exame ja chegou na coluna de retirada.
   *
   * E o que autoriza a conta a pagar do laboratorio a nascer (Cintia, 07/09/2026): o servico do
   * lab ja foi feito, mesmo que o cliente so pague na alta.
   */
  async itensDeVendaProntosParaPagar(): Promise<Set<string>> {
    const fases = await this.fasesExame();
    const retirar = faseDeRetirada(fases);
    const prontos = new Set<string>();
    if (!retirar) return prontos; // sem coluna de retirada configurada, nada dispara

    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { startsWith: 'petexa_' } },
      select: { valor: true },
      take: 5000,
    }).catch(() => [] as any[]);

    for (const it of itens) {
      let d: any; try { d = JSON.parse(it.valor); } catch { continue; }
      if (!d?.itemVendaId) continue;
      if (atingiuFase(d.status, retirar, fases)) prontos.add(String(d.itemVendaId));
    }
    return prontos;
  }

  /** Todos os itens de venda que TEM ciclo de exame — com ou sem retirada. */
  async itensDeVendaComExame(): Promise<Set<string>> {
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { startsWith: 'petexa_' } },
      select: { valor: true },
      take: 5000,
    }).catch(() => [] as any[]);
    const todos = new Set<string>();
    for (const it of itens) {
      let d: any; try { d = JSON.parse(it.valor); } catch { continue; }
      if (d?.itemVendaId) todos.add(String(d.itemVendaId));
    }
    return todos;
  }

  /**
   * LEMBRETE PARA A RECEPÇÃO — 11:00, 15:00 e 17:00 (Fortaleza).
   *
   * A Cintia, em 07/09/2026: "o aviso para recepção e o a pagar só aparece depois que forem
   * para a coluna do retirar" — "para a recepção às 11:00, 15:00 e 17:00".
   *
   * É diferente do lote automático que avisa o LABORATÓRIO: este cutuca a NOSSA equipe sobre o
   * exame que já chegou na coluna de retirada e ainda não foi entregue. O que ainda nem foi
   * retirado não entra, e o que já terminou também não — alerta que grita pelo que já foi feito
   * é alerta que a equipe aprende a ignorar.
   *
   * Não manda nada quando não há o que cobrar: notificação vazia todo dia às 11h ensina a
   * ignorar as cheias.
   */
  /**
   * O LAUDO QUE NAO VOLTOU — aviso de atraso, UMA vez por exame.
   *
   * Cintia, 12/09/2026: "o aviso de atraso pode aparecer para os veterinarios, assim mesmo que o
   * veterinario responsavel nao esteja os outros podem checar".
   *
   * Existe porque o lembrete diario passou a cobrir so a primeira coluna, a pedido dela. Em
   * "Retirado" a bola esta com o laboratorio e nao ha o que lembrar todo dia — mas se o laudo
   * nao volta, ninguem percebe, e o cliente pagou e espera em silencio.
   *
   * NAO INSISTE. `atrasoAvisadoEm` e gravado no card na primeira vez; depois disso o exame
   * continua vermelho no quadro, e so. Repetir seria transformar este aviso naquilo de que ela
   * se queixou ("NAO E PARA REPETIR").
   */
  async avisarAtrasosDoLaboratorio(): Promise<{ atrasados: number; avisados: number }> {
    const fases = await this.fasesExame();
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { startsWith: 'petexa_' } },
      select: { id: true, lista: true, valor: true },
      take: 3000,
    }).catch(() => [] as any[]);

    const novos: { id: string; petId: string; d: any; atraso: any }[] = [];
    for (const it of itens) {
      let d: any; try { d = JSON.parse(it.valor); } catch { continue; }
      if (!String(d?.nome || '').trim()) continue;   // nao aparece no quadro, nao avisa
      if (ehArquivado(d)) continue;                  // tirado do quadro: nao cobra mais ninguem
      if (d.atrasoAvisadoEm) continue;               // ja foi avisado uma vez
      const atraso = atrasoDoExame(d, fases);
      if (!atraso.atrasado) continue;
      novos.push({ id: it.id, petId: it.lista.replace('petexa_', ''), d, atraso });
    }
    if (!novos.length) return { atrasados: 0, avisados: 0 };

    const pets = await this.prisma.pet.findMany({
      where: { id: { in: [...new Set(novos.map((n) => n.petId))] } },
      select: { id: true, name: true },
    }).catch(() => [] as any[]);
    const nomePorPet = new Map(pets.map((x: any) => [x.id, x.name]));

    // Os VETERINARIOS, e o administrativo junto: se ninguem checar, e a Cintia quem precisa
    // saber. Ela pediu os veterinarios; incluir a dona de um alerta de "algo esta atrasado" e
    // decisao minha, e ela pode tirar.
    const destinos = await this.prisma.user.findMany({
      where: { isBlocked: false, role: { in: ['VETERINARIAN', 'ADMIN'] } },
      select: { id: true },
    }).catch(() => [] as any[]);

    if (destinos.length) {
      const linhas = novos.slice(0, 4).map((n) => {
        const pet = nomePorPet.get(n.petId) || 'Paciente';
        const lab = n.d.fornecedorNome ? ` (${n.d.fornecedorNome})` : '';
        return `${pet} — ${n.d.nome}${lab}: ${n.atraso.dias} dia(s) do prazo`;
      });
      const resto = novos.length - linhas.length;
      const algumEstimado = novos.some((n) => n.atraso.estimado);
      await this.prisma.notification.createMany({
        data: destinos.map((u: any) => ({
          userId: u.id,
          type: 'WARNING' as any,
          channel: 'IN_APP' as any,
          title: novos.length === 1 ? 'Laudo atrasado no laboratorio' : `${novos.length} laudos atrasados no laboratorio`,
          message: `${linhas.join('; ')}${resto > 0 ? ` e mais ${resto}` : ''}.`
            + (algumEstimado ? ' (exame sem prazo cadastrado — contado pelo padrao da casa)' : ''),
          link: '/dashboard/erp/exames-kanban',
        })),
      }).catch(() => undefined);
    }

    // A marca vai DEPOIS de avisar: se a notificacao falhar, o aviso tenta de novo amanha em
    // vez de se perder calado.
    const agora = new Date().toISOString();
    for (const n of novos) {
      await this.prisma.listaItem.update({
        where: { id: n.id },
        data: { valor: JSON.stringify({ ...n.d, atrasoAvisadoEm: agora }) },
      }).catch(() => undefined);
    }
    return { atrasados: novos.length, avisados: destinos.length };
  }

  async lembrarRecepcaoDaSolicitacao(): Promise<{ exames: number; avisados: number }> {
    const fases = await this.fasesExame();
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { startsWith: 'petexa_' } },
      select: { id: true, lista: true, valor: true },
      take: 3000,
    });

    const pendentes: any[] = [];
    for (const it of itens) {
      let d: any; try { d = JSON.parse(it.valor); } catch { continue; }
      if (!precisaLembrarSolicitacao(d, fases)) continue;
      pendentes.push(d);
    }

    const texto = textoDoLembrete(pendentes);
    if (!texto) return { exames: 0, avisados: 0 };

    // O nome dos pets deixa o lembrete útil de ler; a lista completa está no kanban.
    const petIds = [...new Set(itens.map((i) => i.lista.replace('petexa_', '')))];
    const pets = petIds.length
      ? await this.prisma.pet.findMany({ where: { id: { in: petIds } }, select: { id: true, name: true } }).catch(() => [])
      : [];
    const nomePorPet = new Map(pets.map((p: any) => [p.id, p.name]));
    const comPet = itens
      .map((it) => { let d: any; try { d = JSON.parse(it.valor); } catch { return null; } return precisaLembrarSolicitacao(d, fases) ? { ...d, petNome: d.petNome || nomePorPet.get(it.lista.replace('petexa_', '')) } : null; })
      .filter(Boolean) as any[];
    const textoFinal = textoDoLembrete(comPet) || texto;

    // Quem recebe: recepção e administrativo — quem faz a solicitação ao laboratório.
    const destinos = await this.prisma.user.findMany({
      // Os papeis reais do sistema sao ADMIN | VETERINARIAN | RECEPTIONIST. Escrever nome que
      // nao existe aqui nao quebraria nada visivel — o catch engoliria, e o lembrete
      // simplesmente nunca sairia. Silencio e o pior defeito de um alerta.
      where: { isBlocked: false, role: { in: ['RECEPTIONIST', 'ADMIN'] } },
      select: { id: true },
    }).catch(() => [] as any[]);
    if (!destinos.length) return { exames: pendentes.length, avisados: 0 };

    await this.prisma.notification.createMany({
      data: destinos.map((u: any) => ({
        userId: u.id,
        type: 'WARNING' as any,
        channel: 'IN_APP' as any,
        title: textoFinal.titulo,
        message: textoFinal.mensagem,
        link: '/dashboard/erp/exames-kanban',
      })),
    }).catch(() => undefined);

    return { exames: pendentes.length, avisados: destinos.length };
  }

  /**
   * LOTE (cron 11:30 e 17:00 + botão "enviar agora"): solicita COLETA aos laboratórios.
   * UMA mensagem genérica por LABORATÓRIO ("solicitar coleta"), consolidando os exames daquele lab
   * que estão na fase de solicitação, ainda não avisados e criados a partir do go-live (não floda o
   * histórico). Idempotente: relê cada item imediatamente antes de marcar (clique + cron não duplicam).
   * DESLIGADO por segurança até EXAMES_LOTE_ATIVO=1 (liga-se quando o template estiver aprovado na Meta).
   */
  async avisarLaboratorios(): Promise<{ enviados: number; labs: number; semWhatsapp: number; desligado?: boolean }> {
    if (process.env.EXAMES_LOTE_ATIVO !== '1') return { enviados: 0, labs: 0, semWhatsapp: 0, desligado: true };

    const desde = new Date(process.env.EXAMES_LOTE_DESDE || '2026-08-11T00:00:00-03:00'); // só exames novos
    const inicial = String(await this.faseInicialExame() || '').toLowerCase();

    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { startsWith: 'petexa_' }, createdAt: { gte: desde } },
      select: { id: true, valor: true },
    });

    // Agrupa por laboratório os exames ainda não avisados na fase de solicitação.
    const grupos = new Map<string, { itemId: string; d: any }[]>();
    for (const it of itens) {
      let d: any = null;
      try { d = JSON.parse(it.valor); } catch { continue; }
      if (!exameElegivelLote(d, inicial)) continue; // regra pura + testada (exames.regras.ts)
      if (!grupos.has(d.fornecedorId)) grupos.set(d.fornecedorId, []);
      grupos.get(d.fornecedorId)!.push({ itemId: it.id, d });
    }
    if (!grupos.size) return { enviados: 0, labs: 0, semWhatsapp: 0 };

    const fornIds = [...grupos.keys()];
    const forns = await this.prisma.fornecedor.findMany({ where: { id: { in: fornIds } }, select: { id: true, nome: true, telefone: true } });
    const fornMap: Record<string, any> = Object.fromEntries(forns.map((f) => [f.id, f]));

    let enviados = 0, labs = 0, semWhatsapp = 0;
    for (const [fid, grupo] of grupos) {
      const forn = fornMap[fid];
      if (!forn?.telefone) { semWhatsapp += grupo.length; await this.alertarFalhaLab(forn?.nome || 'Laboratório', 'sem WhatsApp cadastrado', grupo.length); continue; }

      // Anti-duplicidade: relê cada item AGORA; segue só com os que ainda não foram avisados.
      const frescos: { itemId: string; d: any }[] = [];
      for (const g of grupo) {
        const fresh = await this.prisma.listaItem.findUnique({ where: { id: g.itemId }, select: { valor: true } });
        if (!fresh) continue;
        let dNow: any = null;
        try { dNow = JSON.parse(fresh.valor); } catch { continue; }
        if (dNow.labAvisadoAt) continue;
        frescos.push({ itemId: g.itemId, d: dNow });
      }
      if (!frescos.length) continue;

      const r = await this.enviarLote(forn); // UMA mensagem genérica pro laboratório
      if (!r.ok) { await this.alertarFalhaLab(forn.nome || 'Laboratório', r.erro || 'falha no envio', frescos.length); continue; } // não marca → re-tenta na próxima janela

      labs++;
      const at = new Date().toISOString();
      for (const f of frescos) {
        // Relê a base fresca no update pra não regredir status/histórico alterados nesse meio-tempo.
        await this.prisma.listaItem.update({ where: { id: f.itemId }, data: { valor: JSON.stringify({ ...f.d, labAvisadoAt: at, labMessageId: r.messageId || null, labStatus: 'sent' }) } }).catch(() => {});
        enviados++;
      }
    }
    if (enviados || semWhatsapp) this.logger.log(`Lote de coleta: ${labs} laboratório(s) avisado(s), ${enviados} exame(s) marcados, ${semWhatsapp} sem WhatsApp.`);
    return { enviados, labs, semWhatsapp };
  }

  /** Manual ("Enviar agora"): avisa o laboratório de UM exame (pelo id do listaItem petexa_). */
  async avisarUm(itemId: string): Promise<{ ok: boolean; erro?: string }> {
    const it = await this.prisma.listaItem.findUnique({ where: { id: itemId }, select: { id: true, lista: true, valor: true } });
    if (!it || !it.lista.startsWith('petexa_')) return { ok: false, erro: 'Exame não encontrado' };
    let d: any = null;
    try { d = JSON.parse(it.valor); } catch { return { ok: false, erro: 'Exame ilegível' }; }
    if (!d?.fornecedorId) return { ok: false, erro: 'Este exame não tem laboratório vinculado' };
    const forn = await this.prisma.fornecedor.findUnique({ where: { id: d.fornecedorId }, select: { nome: true, telefone: true } });
    if (!forn?.telefone) return { ok: false, erro: 'O laboratório não tem WhatsApp cadastrado (Fornecedores)' };
    const petNome = await this.nomePet(it.lista.replace('petexa_', ''));
    const r = await this.enviar(forn, petNome, d.nome);
    if (r.ok) {
      await this.prisma.listaItem.update({ where: { id: itemId }, data: { valor: JSON.stringify({ ...d, labAvisadoAt: new Date().toISOString(), labMessageId: r.messageId || null, labStatus: 'sent' }) } }).catch(() => {});
      return { ok: true };
    }
    return { ok: false, erro: r.erro || 'Não consegui enviar (o template pode ainda estar em aprovação na Meta)' };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { exameElegivelLote, precisaLembrarSolicitacao, textoDoLembrete, atingiuFase, faseDeRetirada, FASES_PADRAO, atrasoDoExame, fasesVigentes, ehArquivado, podeSerExpurgado, diasAteExpurgo, podeAvisarCliente, respostaMarcaEntregue, horariosLimpos, horariosDoLab, ehHoraDeAvisar, HORARIOS_PADRAO_LAB } from './exames.regras';

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
  /**
   * O TEMPLATE QUE AVISA O TUTOR — e as variáveis que cada um espera, na ordem.
   *
   * Isto é um mapa e não um nome solto porque template errado não avisa ninguém: a Meta recusa
   * o envio quando a quantidade de variáveis não bate, e o erro que volta não diz qual é a
   * conta certa. Escrever aqui o que cada template pede deixa a conferência possível.
   *
   * Os dois já estão APROVADOS na conta da clínica (conferidos em 16/09/2026):
   *   · resultado_exame — "Olá, {{1}}! 🐾 O resultado do exame do(a) {{2}} já está disponível.
   *     Em breve nossa equipe te envia os detalhes." Botões: Agendar retorno / Tirar dúvida.
   *   · resultado_exame_disponivel — o mesmo, mais "{{3}} vai conversar com você sobre os
   *     achados" e "responda esta mensagem". Botão: Falar com a recepção.
   *
   * O PADRÃO É `resultado_exame_disponivel`, escolha da Cintia em 16/09/2026: é o único que pede
   * ao cliente para responder — e a resposta dele é o que fecha o exame no quadro. Com o outro,
   * a entrega dependeria de o cliente resolver escrever por conta própria.
   *
   * O {{3}} dele promete que uma PESSOA vai conversar sobre os achados, e aí mora o cuidado:
   * só vai um nome quando quem anexou é veterinário. Se a recepção anexar, a mensagem diz "Nossa
   * equipe" — prometer que Fulana vai explicar o exame, quando Fulana não vai, é pior do que não
   * dizer nome nenhum.
   *
   * Trocar: EXAMES_TEMPLATE_CLIENTE=resultado_exame.
   */
  private readonly TEMPLATES_CLIENTE: Record<string, (c: { tutor: string; pet: string; vet: string }) => string[]> = {
    resultado_exame: (c) => [c.tutor, c.pet],
    resultado_exame_disponivel: (c) => [c.tutor, c.pet, c.vet],
  };
  private get TEMPLATE_CLIENTE(): string {
    const escolhido = String(process.env.EXAMES_TEMPLATE_CLIENTE || '').trim();
    return this.TEMPLATES_CLIENTE[escolhido] ? escolhido : 'resultado_exame_disponivel';
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Solicitação de coleta ao laboratório (o botão "📲 Solicitar ao lab", urgência).
   *
   * SEM VARIÁVEIS, e isso não é descuido. O template `solicitacao_coleta_exame` aprovado na Meta
   * é um texto fixo — "🔬 Solicitação de coleta — Empório do Pet. Por favor, agende a coleta de
   * exame." — e mandar variáveis para um template que não tem nenhuma faz a Meta RECUSAR o envio.
   *
   * Até 16/09/2026 este método mandava paciente e exame. O envio falhava sempre, e o erro que
   * volta da Meta não diz qual é a conta certa — o botão simplesmente não funcionava.
   *
   * Consequência a assumir: a mensagem urgente não diz de qual pet é. Para dizer, o template
   * precisa ser recriado na Meta com {{1}} e {{2}}, e aí este método volta a mandá-los.
   */
  private async enviar(fornecedor: { nome?: string; telefone?: string | null }, _petNome: string, _exameNome: string): Promise<{ ok: boolean; messageId?: string; erro?: string }> {
    if (!fornecedor?.telefone) return { ok: false, erro: 'Laboratório sem WhatsApp' };
    try {
      const res: any = await this.whatsapp.sendTemplateMessage(fornecedor.telefone, this.TEMPLATE, []);
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

    // A ORDEM É TUTOR, DEPOIS PET. Os dois templates começam com "Olá, {{1}}!" — mandar o pet
    // no {{1}} faria a mensagem cumprimentar o cachorro pelo nome. O exame NÃO entra: nenhum dos
    // dois textos aprovados tem lugar para ele.
    const nomeTemplate = this.TEMPLATE_CLIENTE;
    const partes = this.TEMPLATES_CLIENTE[nomeTemplate]({
      tutor: pet?.tutor?.name || 'tudo bem',
      pet: pet?.name || 'seu pet',
      // SÓ VETERINÁRIO VIRA NOME. O texto diz "{{3}} vai conversar com você sobre os achados" —
      // uma promessa sobre uma pessoa. Quem anexou pode ser a recepção, que não vai explicar
      // exame nenhum; nesse caso a mensagem fala pela clínica, não por alguém.
      vet: d.resultadoPorEhVet && d.resultadoPor ? d.resultadoPor : 'Nossa equipe',
    });

    let res: any = null;
    try {
      res = await this.whatsapp.sendTemplateMessage(
        wa.number,
        nomeTemplate,
        partes.map((text) => ({ type: 'text', text })),
      );
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
    papelDeQuem?: string,
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
          // Guardado no card, e não conferido na hora de avisar: o papel de quem anexou pode
          // mudar depois, e o que vale é quem era no momento em que o laudo entrou.
          resultadoPorEhVet: /^(VETERINARIAN|VET)$/i.test(String(papelDeQuem || '').trim()),
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

  /**
   * O PONTO ÚNICO: toda venda que grava itens passa por aqui, e sai com os cards de exame certos.
   *
   * Cintia, 15/09/2026: "Não estava salvando os exames nas comandas". Os números deram razão a
   * ela — 13 exames vendidos em 10 dias, UM card criado. O exame era cobrado do cliente e não
   * existia para o laboratório: sem quadro, sem solicitação de coleta e sem conta a pagar.
   *
   * A causa era a forma, não o código de ninguém: só o PDV e a conversão de orçamento criavam o
   * card. Editar uma comanda, a comanda da ficha, o atendimento — todas gravavam o item e não
   * avisavam ninguém. Cada tela nova era uma chance de esquecer de novo.
   *
   * DUAS COISAS QUE ESTE MÉTODO FAZ, e a segunda é tão importante quanto a primeira:
   *
   * 1. CRIA o card que falta. Quem decide se o item é exame é o CATÁLOGO (cat_itens.tipo), não o
   *    que a tela mandou no corpo da requisição — telas erram, e uma delas errando em silêncio é
   *    exatamente o que nos trouxe aqui.
   *
   * 2. RELIGA o card cujo vínculo se perdeu. Editar uma comanda APAGA e recria todos os itens,
   *    com ids novos — o `itemVendaId` do card passa a apontar para um item que não existe mais,
   *    e é esse vínculo que autoriza a conta a pagar do laboratório a nascer. Sem religar, toda
   *    edição de comanda deixaria um exame órfão, cobrado e sem custo lançado.
   *
   * É idempotente de propósito: chamado no create, no update e quantas vezes for, o resultado é o
   * mesmo. Nunca lança — é ouvinte de evento e não pode derrubar a venda.
   */
  async garantirCardsDaVenda(
    appointmentId: string,
    opts?: { statusInicial?: string },
  ): Promise<{ criados: number; religados: number }> {
    const nada = { criados: 0, religados: 0 };
    if (!appointmentId) return nada;

    const venda: any = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, petId: true, type: true },
    }).catch(() => null);
    if (!venda?.petId) return nada;
    // Orçamento não vira exame: o card nasce quando ele é convertido em venda.
    if (/or[çc]amento/i.test(String(venda.type || ''))) return nada;

    const itens: any[] = await this.prisma.appointmentItem.findMany({
      where: { appointmentId },
      select: { id: true, descricao: true, catalogoItemId: true, fornecedorId: true, custoUnitario: true, valorUnitario: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => []);
    if (!itens.length) return nada;

    // QUEM DIZ QUE É EXAME É O CATÁLOGO. Um item sem `catalogoItemId` (venda antiga, item
    // digitado à mão) não tem como ser classificado — e não inventamos: melhor não criar card do
    // que criar um exame que não existe.
    const catIds = [...new Set(itens.map((i) => i.catalogoItemId).filter(Boolean))] as string[];
    if (!catIds.length) return nada;
    const doCatalogo: any[] = await this.prisma.itemCatalogo.findMany({
      where: { id: { in: catIds }, tipo: 'EXAME' as any },
      select: { id: true },
    }).catch(() => []);
    const ehExame = new Set(doCatalogo.map((c: any) => c.id));
    const itensExame = itens.filter((i) => i.catalogoItemId && ehExame.has(i.catalogoItemId));
    if (!itensExame.length) return nada;

    const lista = `petexa_${venda.petId}`;
    const brutos: any[] = await this.prisma.listaItem.findMany({
      where: { lista },
      select: { id: true, valor: true },
    }).catch(() => []);
    const cards = brutos
      .map((b) => { try { return { id: b.id, d: JSON.parse(b.valor) }; } catch { return null; } })
      .filter(Boolean) as { id: string; d: any }[];

    // Um card só conta como "deste item" se o item ainda EXISTE. Depois de uma edição de comanda
    // o id antigo aponta para o vazio, e tratá-lo como vínculo válido deixaria o exame órfão para
    // sempre.
    const referenciados = [...new Set(cards.map((c) => c.d?.itemVendaId).filter(Boolean))] as string[];
    const vivos = referenciados.length
      ? new Set((await this.prisma.appointmentItem.findMany({
          where: { id: { in: referenciados } }, select: { id: true },
        }).catch(() => [] as any[])).map((x: any) => x.id))
      : new Set<string>();

    const abertos = cards.filter((c) => !ehArquivado(c.d) && !c.d?.entregueAt);
    const jaLigados = new Set(abertos.filter((c) => c.d?.itemVendaId && vivos.has(c.d.itemVendaId)).map((c) => c.d.itemVendaId));
    const orfaos = abertos.filter((c) => !c.d?.itemVendaId || !vivos.has(c.d.itemVendaId));

    const mesmoNome = (a?: string, b?: string) =>
      String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

    let religados = 0;
    const semCard: any[] = [];
    for (const item of itensExame) {
      if (jaLigados.has(item.id)) continue;
      // Cada órfão é consumido UMA vez: dois exames iguais na mesma comanda são dois cards, e
      // casar os dois com o mesmo card perderia um deles.
      const i = orfaos.findIndex((c) => mesmoNome(c.d?.nome, item.descricao));
      if (i < 0) { semCard.push(item); continue; }
      const [card] = orfaos.splice(i, 1);
      const ok = await this.prisma.listaItem.update({
        where: { id: card.id },
        data: { valor: JSON.stringify({ ...card.d, itemVendaId: item.id }) },
      }).catch(() => null);
      if (ok) religados++;
    }

    let criados = 0;
    if (semCard.length) {
      criados = await this.iniciarExamesDaVenda(venda.petId, semCard.map((i) => ({
        descricao: i.descricao,
        catalogoItemId: i.catalogoItemId,
        fornecedorId: i.fornecedorId,
        custoUnitario: i.custoUnitario,
        valorUnitario: i.valorUnitario,
        appointmentItemId: i.id,
        origem: 'VENDA',
        ...(opts?.statusInicial ? { statusInicial: opts.statusInicial } : {}),
      }))).catch(() => 0);
    }

    if (criados || religados) {
      this.logger.log(`Exames da venda ${appointmentId}: ${criados} card(s) criado(s), ${religados} religado(s).`);
    }
    return { criados, religados };
  }

  /**
   * O gatilho. Qualquer tela que grave itens de venda emite este evento — e não precisa saber que
   * exame existe. Nunca deixa o erro subir: a venda já foi gravada, e derrubá-la por causa do
   * card seria trocar o essencial pelo acessório.
   */
  @OnEvent('venda.itens.gravados')
  async aoGravarItensDaVenda(ev: { appointmentId?: string }): Promise<void> {
    try {
      await this.garantirCardsDaVenda(String(ev?.appointmentId || ''));
    } catch (e) {
      this.logger.warn(`Falha ao garantir cards da venda: ${String((e as any)?.message || e)}`);
    }
  }

  /** Horários de coleta por laboratório (lista `exame_lab_horarios`, valor `{fornecedorId, horarios}`). */
  private async horariosPorLab(): Promise<Record<string, string[]>> {
    const mapa: Record<string, string[]> = {};
    try {
      const arr = await this.prisma.listaItem.findMany({ where: { lista: 'exame_lab_horarios' } });
      for (const it of arr) {
        let d: any; try { d = JSON.parse(it.valor); } catch { continue; }
        const id = String(d?.fornecedorId || '').trim();
        if (!id) continue;
        mapa[id] = horariosLimpos(d?.horarios);
      }
    } catch { /* sem config, todo mundo no padrão */ }
    return mapa;
  }

  /** Para a tela: todo laboratório com os horários dele (ou o padrão, dito como padrão). */
  async listarHorariosDosLabs(): Promise<{ fornecedorId: string; nome: string; telefone: string | null; horarios: string[]; padrao: boolean }[]> {
    const [forns, mapa] = await Promise.all([
      this.prisma.fornecedor.findMany({
        where: { ativo: true, tipo: 'LABORATORIO' as any },
        select: { id: true, nome: true, telefone: true },
        orderBy: { nome: 'asc' },
      }).catch(() => [] as any[]),
      this.horariosPorLab(),
    ]);
    return forns.map((f: any) => {
      const proprios = horariosLimpos(mapa[f.id]);
      return {
        fornecedorId: f.id, nome: f.nome, telefone: f.telefone || null,
        horarios: proprios.length ? proprios : [...HORARIOS_PADRAO_LAB],
        padrao: !proprios.length,   // a tela precisa dizer "é o padrão", não fingir que foi escolhido
      };
    });
  }

  /**
   * Grava os horários de UM laboratório.
   *
   * Lista vazia volta ao padrão da casa em vez de deixar o laboratório sem aviso nenhum: um
   * laboratório que nunca é avisado é um exame que nunca é coletado, e não há tela que mostre
   * essa ausência.
   */
  async salvarHorariosDoLab(fornecedorId: string, horarios: unknown): Promise<{ ok: boolean; erro?: string; horarios?: string[] }> {
    const id = String(fornecedorId || '').trim();
    if (!id) return { ok: false, erro: 'Laboratório não informado' };
    const limpos = horariosLimpos(horarios);
    const existente = await this.prisma.listaItem.findFirst({
      where: { lista: 'exame_lab_horarios', valor: { contains: `"fornecedorId":"${id}"` } },
      select: { id: true },
    }).catch(() => null);

    if (!limpos.length) {
      if (existente) await this.prisma.listaItem.delete({ where: { id: existente.id } }).catch(() => undefined);
      return { ok: true, horarios: [...HORARIOS_PADRAO_LAB] };
    }
    const valor = JSON.stringify({ fornecedorId: id, horarios: limpos });
    if (existente) await this.prisma.listaItem.update({ where: { id: existente.id }, data: { valor } });
    else await this.prisma.listaItem.create({ data: { lista: 'exame_lab_horarios', valor } });
    return { ok: true, horarios: limpos };
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
    const inicial = await this.faseInicialExame();
    let n = 0;
    for (const it of examItems) {
      // A fase quase sempre é a primeira. A exceção é a recuperação de exames antigos, que já
      // foram entregues e nascem direto em "Resultado" — pedido da Cintia em 15/09/2026: "se
      // entrarem no kanban coloque na aba de resultados, pois eles já devem ter sido entregues".
      const fase = String(it.statusInicial || '').trim() || inicial;
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
  async avisarLaboratorios(
    opts?: { apenasNoHorario?: boolean; agora?: Date | string },
  ): Promise<{ enviados: number; labs: number; semWhatsapp: number; desligado?: boolean }> {
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

    // CADA LABORATÓRIO NO SEU HORÁRIO (Cintia, 12/09/2026). A cron bate de meia em meia hora e
    // manda só para quem tem coleta marcada naquele minuto; quem não configurou segue nos 11h30
    // e 17h de sempre. O botão "Enviar lote agora" passa sem `apenasNoHorario` e ignora a grade,
    // porque ele é o caminho da urgência.
    const horarios = opts?.apenasNoHorario ? await this.horariosPorLab() : null;

    let enviados = 0, labs = 0, semWhatsapp = 0;
    for (const [fid, grupo] of grupos) {
      if (horarios && !ehHoraDeAvisar(horariosDoLab(horarios, fid), opts?.agora)) continue;
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

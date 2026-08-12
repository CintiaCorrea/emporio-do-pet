import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { exameElegivelLote } from './exames.regras';

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
      if (/entreg/i.test(String(d.status || ''))) continue; // "Entregue" saiu do quadro
      const petId = it.lista.replace('petexa_', '');
      petIds.add(petId);
      if (d.fornecedorId) fornIds.add(d.fornecedorId);
      linhas.push({
        itemId: it.id, petId, nome: d.nome, status: String(d.status || ''),
        fornecedorId: d.fornecedorId || null, externo: !!d.externo,
        labAvisadoAt: d.labAvisadoAt || null, date: d.date || null,
        resultadoUrl: d.resultadoUrl || null,
      });
    }
    const [pets, forns] = await Promise.all([
      petIds.size ? this.prisma.pet.findMany({ where: { id: { in: [...petIds] } }, select: { id: true, name: true, tutor: { select: { name: true } } } }) : Promise.resolve([]),
      fornIds.size ? this.prisma.fornecedor.findMany({ where: { id: { in: [...fornIds] } }, select: { id: true, nome: true, telefone: true } }) : Promise.resolve([]),
    ]);
    const petMap: Record<string, any> = Object.fromEntries(pets.map((p) => [p.id, p]));
    const fornMap: Record<string, any> = Object.fromEntries(forns.map((f) => [f.id, f]));
    return linhas.map((l) => ({
      ...l,
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

  /** 1ª fase configurada dos exames (Config › Exames = exame_fases). Fallback "Solicitado". */
  private async faseInicialExame(): Promise<string> {
    try {
      const arr = await this.prisma.listaItem.findMany({ where: { lista: 'exame_fases' }, orderBy: { createdAt: 'asc' } });
      for (const it of arr) { try { const v = JSON.parse(it.valor); const n = v?.nome || it.valor; if (n) return String(n); } catch { if (it.valor) return it.valor; } }
    } catch { /* usa fallback */ }
    return 'Solicitado';
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
      let cat: any = null;
      if (it.catalogoExameId) {
        cat = await this.prisma.catalogoExame.findUnique({
          where: { id: it.catalogoExameId },
          select: { valorFornecedor: true, valorClienteSugerido: true, fornecedorId: true, fornecedor: { select: { nome: true } } },
        }).catch(() => null);
      }
      const now = new Date().toISOString();
      const origem = it.origem || 'PDV';
      const d = {
        nome: it.descricao || it.nome || 'Exame', status: fase, date: now, externo: true,
        fornecedorId: it.fornecedorId || cat?.fornecedorId || null,
        fornecedorNome: cat?.fornecedor?.nome || null,
        custo: cat?.valorFornecedor ?? null,
        valor: cat?.valorClienteSugerido ?? (Number(it.valorUnitario) || null),
        origem,
        historico: { [fase]: { at: now, por: origem } },
      };
      try { await this.prisma.listaItem.create({ data: { lista: `petexa_${petId}`, valor: JSON.stringify(d) } }); n++; } catch { /* não trava a venda */ }
    }
    return n;
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

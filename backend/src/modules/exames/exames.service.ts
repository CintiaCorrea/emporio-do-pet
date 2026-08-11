import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

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
  private readonly TEMPLATE = 'solicitacao_coleta_exame';

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  private async enviar(fornecedor: { nome?: string; telefone?: string | null }, petNome: string, exameNome: string): Promise<boolean> {
    if (!fornecedor?.telefone) return false;
    try {
      const res = await this.whatsapp.sendTemplateMessage(fornecedor.telefone, this.TEMPLATE, [
        { type: 'text', text: petNome || 'Paciente' },
        { type: 'text', text: exameNome || 'Exame' },
      ]);
      return !!(res && (res as any).success);
    } catch (e) {
      this.logger.warn(`Falha ao avisar laboratório ${fornecedor?.nome}: ${String((e as any)?.message || e)}`);
      return false;
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

  /** Batch (cron 11:30 e 17:00): avisa todos os exames em "Coleta solicitada" ainda não avisados. */
  async avisarLaboratorios(): Promise<{ enviados: number; semWhatsapp: number }> {
    const itens = await this.prisma.listaItem.findMany({
      where: { lista: { startsWith: 'petexa_' } },
      select: { id: true, lista: true, valor: true },
    });
    const pendentes: { itemId: string; d: any; fornecedorId: string; petId: string }[] = [];
    for (const it of itens) {
      let d: any = null;
      try { d = JSON.parse(it.valor); } catch { continue; }
      if (!d) continue;
      if (!String(d.status || '').toLowerCase().includes('coleta')) continue; // fase "Coleta solicitada"
      if (d.labAvisadoAt) continue; // já avisado
      if (!d.fornecedorId) continue; // sem laboratório vinculado
      pendentes.push({ itemId: it.id, d, fornecedorId: d.fornecedorId, petId: it.lista.replace('petexa_', '') });
    }
    if (!pendentes.length) return { enviados: 0, semWhatsapp: 0 };

    const fornIds = [...new Set(pendentes.map((p) => p.fornecedorId))];
    const forns = await this.prisma.fornecedor.findMany({ where: { id: { in: fornIds } }, select: { id: true, nome: true, telefone: true } });
    const fornMap: Record<string, any> = Object.fromEntries(forns.map((f) => [f.id, f]));

    let enviados = 0, semWhatsapp = 0;
    for (const p of pendentes) {
      const forn = fornMap[p.fornecedorId];
      if (!forn?.telefone) { semWhatsapp++; continue; }
      const petNome = await this.nomePet(p.petId);
      const ok = await this.enviar(forn, petNome, p.d.nome);
      if (ok) {
        enviados++;
        await this.prisma.listaItem.update({ where: { id: p.itemId }, data: { valor: JSON.stringify({ ...p.d, labAvisadoAt: new Date().toISOString() }) } }).catch(() => {});
      }
    }
    if (enviados || semWhatsapp) this.logger.log(`Avisos de coleta: ${enviados} enviados, ${semWhatsapp} sem WhatsApp do lab.`);
    return { enviados, semWhatsapp };
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
    const ok = await this.enviar(forn, petNome, d.nome);
    if (ok) {
      await this.prisma.listaItem.update({ where: { id: itemId }, data: { valor: JSON.stringify({ ...d, labAvisadoAt: new Date().toISOString() }) } }).catch(() => {});
      return { ok: true };
    }
    return { ok: false, erro: 'Não consegui enviar (o template pode ainda estar em aprovação na Meta)' };
  }
}

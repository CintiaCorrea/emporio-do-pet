import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { CronHealthService } from '../../common/cron-health.service';
import { fortalezaYMD, dataPuraMD, diasAteDataPura, ddmmDataPura } from './reminders-datas';

/**
 * Lembretes automáticos (todo dia às 9h de Fortaleza):
 *  - Aniversário do TUTOR e do PET (no dia, só quem tem a data e aceita WhatsApp).
 *  - Protocolos (vacina/vermífugo/ectoparasita): 15/7/3 dias ANTES do vencimento
 *    (lembrete_protocolo) e 3/7/15 dias DEPOIS (protocolo_vencido, "sem proteção").
 * Trava anti-repetição por `reminder_sent` (não manda o mesmo aviso 2x).
 */
@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);
  private readonly ANTES = [15, 7, 3];
  private readonly DEPOIS = [-3, -7, -15];

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly cronHealth: CronHealthService,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'America/Fortaleza' })
  async diario(): Promise<void> {
    await this.rodarComMarcador();
  }

  // SALVAGUARDA (aprendizado de 22/07: o lote das 9h falhou EM SILÊNCIO durante o
  // incidente do WhatsApp — 7 aniversários + 17 vacinas só saíram à noite, na mão).
  // Se a rodada do dia não completou, re-tenta às 11h e às 15h. Sem risco de duplicar:
  // a trava `reminder_sent` pula o que já foi enviado.
  @Cron('0 11,15 * * *', { timeZone: 'America/Fortaleza' })
  async reexecutarSeFalhou(): Promise<void> {
    const hoje = this.dataHoje();
    const marcador = await this.prisma.listaItem.findFirst({ where: { lista: 'reminder_run', valor: hoje } });
    if (marcador) return; // rodada das 9h completou — nada a fazer
    this.logger.warn(`⚠️ Lote de lembretes das 9h NÃO completou hoje (${hoje}) — reexecutando agora (auto-cura).`);
    await this.rodarComMarcador();
  }

  /** Roda o lote e, se TUDO completou sem erro, grava o marcador do dia em `reminder_run`. */
  private async rodarComMarcador(): Promise<void> {
    this.cronHealth.registrar('lembretes').catch(() => undefined);
    let ok = true;
    try { await this.aniversarios(); } catch (e: any) { ok = false; this.logger.error(`aniversarios: ${e?.message || e}`); }
    try { await this.protocolos(); } catch (e: any) { ok = false; this.logger.error(`protocolos: ${e?.message || e}`); }
    if (ok) {
      await this.prisma.listaItem.create({ data: { lista: 'reminder_run', valor: this.dataHoje() } }).catch(() => undefined);
    }
  }

  private dataHoje(): string {
    const f = this.fort(new Date());
    return `${f.y}-${String(f.m + 1).padStart(2, '0')}-${String(f.d).padStart(2, '0')}`;
  }

  // ---------- helpers ----------
  // Toda a lógica de fuso mora em reminders-datas.ts (PURA + testada). Estes só delegam.
  private fort(d: Date) { return fortalezaYMD(d); }
  private mdData(d: Date) { return dataPuraMD(d); }                       // data pura → UTC (sem -3h)
  private diffDias(prevista: Date): number { return diasAteDataPura(prevista, new Date()); } // vacina: sem o bug de 1 dia
  private ddmm(d: Date) { return ddmmDataPura(d); }
  private primeiro(nome?: string | null) { return (nome || '').trim().split(/\s+/)[0] || 'tutor'; }
  private telDe(tutor: any): string | null { const cs = tutor?.contacts || []; const wa = cs.find((x: any) => x.isWhatsApp) || cs.find((x: any) => x.isPrimary) || cs[0]; return wa?.number || null; }
  private T(text: string) { return { type: 'text' as const, text }; }

  /** Envia 1x só: checa/marca em `reminder_sent` pela chave. Retorna true se ENVIOU agora. */
  private async enviarUmaVez(chave: string, phone: string, template: string, params: Array<{ type: 'text'; text: string }>, textoLegivel?: string): Promise<boolean> {
    const ja = await this.prisma.listaItem.findFirst({ where: { lista: 'reminder_sent', valor: chave } });
    if (ja) return false;
    const res = await this.whatsapp.enviarTemplateRegistrando(phone, template, params, textoLegivel, true);
    if (!res.success) { this.logger.warn(`Falha ${template} (${chave}): ${res.error}`); return false; }
    await this.prisma.listaItem.create({ data: { lista: 'reminder_sent', valor: chave } }).catch(() => undefined);
    this.logger.log(`${template} enviado (${chave})`);
    return true;
  }

  /** Deixa o PRESENTE de aniversário na FILA: quando o tutor responder pedindo o presente,
   *  o PresenteReplyListener entrega o desconto sozinho. Validade: 7 dias. */
  private async filaPresente(tutorId: string, pet?: string): Promise<void> {
    await this.prisma.listaItem.deleteMany({ where: { lista: 'presente_fila', valor: { contains: `"tutorId":"${tutorId}"` } } }).catch(() => undefined);
    await this.prisma.listaItem.create({ data: { lista: 'presente_fila', valor: JSON.stringify({ tutorId, pet: pet || null, criadoAt: new Date().toISOString() }) } }).catch(() => undefined);
  }

  // ---------- aniversários ----------
  async aniversarios(): Promise<void> {
    const h = this.fort(new Date());
    const ano = h.y;
    // Tutores que aceitam WhatsApp e têm data de nascimento.
    const tutores = await this.prisma.tutor.findMany({
      where: { acceptsWhatsApp: true, birthDate: { not: null } },
      select: { id: true, name: true, birthDate: true, contacts: true },
    });
    for (const t of tutores) {
      const b = this.mdData(new Date(t.birthDate as Date));
      if (b.m !== h.m || b.d !== h.d) continue;
      const phone = this.telDe(t); if (!phone) continue;
      const enviou = await this.enviarUmaVez(`aniv-tutor:${t.id}:${ano}`, phone, 'aniversario_tutor', [this.T(this.primeiro(t.name))], `🎂 Mensagem de aniversário enviada para ${this.primeiro(t.name)}.`);
      if (enviou) await this.filaPresente(t.id); // presente (10% off) sai sozinho quando responder
    }
    // Pets com data de nascimento hoje, cujo tutor aceita WhatsApp.
    // NUNCA felicitar aniversário de pet FALECIDO — o tutor acabou de perdê-lo.
    const pets = await this.prisma.pet.findMany({
      where: { birthDate: { not: null }, tutor: { acceptsWhatsApp: true }, status: { not: 'DECEASED' } },
      select: { id: true, name: true, birthDate: true, tutor: { select: { id: true, name: true, contacts: true } } },
    });
    for (const p of pets) {
      const b = this.mdData(new Date(p.birthDate as Date));
      if (b.m !== h.m || b.d !== h.d) continue;
      const phone = this.telDe(p.tutor); if (!phone) continue;
      const enviou = await this.enviarUmaVez(`aniv-pet:${p.id}:${ano}`, phone, 'aniversario_pet', [this.T(this.primeiro(p.tutor?.name)), this.T(p.name || 'seu pet')], `🎂 Aniversário do pet ${p.name || ''} — mensagem enviada.`);
      if (enviou && p.tutor?.id) await this.filaPresente(p.tutor.id, p.name || undefined); // presente (10% off) sai sozinho quando responder
    }
  }

  // ---------- protocolos (vacina etc.) ----------
  async protocolos(): Promise<void> {
    const ini = new Date(); ini.setDate(ini.getDate() - 17);
    const fim = new Date(); fim.setDate(fim.getDate() + 17);
    const doses = await this.prisma.protocoloDose.findMany({
      // Pet FALECIDO ou em CUIDADOS PALIATIVOS não recebe lembrete de vacina/vermífugo (seria insensível).
      // ⚠️ TRAVA 18/08: a importação do SimplesVet criou ~1.635 protocolos genéricos "Vacina"
      // NUNCA aplicados (fantasmas em ~467 pets) — eles disparavam "venceu (sem proteção)" errado.
      // Não avisar por eles enquanto os dados não forem corrigidos/reimportados. Protocolo real
      // tem nome específico (ex.: "V10 - Filhote", "Antirrábica"); só o import usou o nome cru "Vacina".
      where: { status: 'PENDENTE', dataPrevista: { gte: ini, lte: fim }, protocolo: { nomeProtocolo: { not: 'Vacina' }, pet: { status: { not: 'DECEASED' }, cuidadoPaliativo: false } } },
      include: { protocolo: { select: { nomeProtocolo: true, pet: { select: { name: true, tutor: { select: { id: true, name: true, acceptsWhatsApp: true, contacts: true } } } }, tutor: { select: { id: true, name: true, acceptsWhatsApp: true, contacts: true } } } } },
      take: 1000,
    });
    for (const dose of doses) {
      const prot = (dose as any).protocolo;
      // A maioria dos protocolos guarda o tutor SÓ via pet (protocolo.tutor fica vazio).
      // Buscar direto e, se faltar, cair pro tutor do pet — senão nenhum lembrete de vacina sai.
      const tutor = prot?.tutor || prot?.pet?.tutor;
      if (!tutor || tutor.acceptsWhatsApp === false) continue;
      const phone = this.telDe(tutor); if (!phone) continue;
      const diff = this.diffDias(new Date(dose.dataPrevista as Date));
      const antes = this.ANTES.includes(diff);
      const depois = this.DEPOIS.includes(diff);
      if (!antes && !depois) continue;
      const petNome = prot.pet?.name || 'seu pet';
      const protNome = prot.nomeProtocolo || 'o protocolo';
      const data = this.ddmm(new Date(dose.dataPrevista as Date));
      const params = [this.T(this.primeiro(tutor.name)), this.T(protNome), this.T(petNome), this.T(data)];
      const template = antes ? 'lembrete_protocolo' : 'protocolo_vencido';
      const legivel = antes ? `💉 Lembrete: ${protNome} do(a) ${petNome} vence em ${data}.` : `💉 Aviso: ${protNome} do(a) ${petNome} venceu em ${data} (sem proteção).`;
      await this.enviarUmaVez(`prot:${dose.id}:${diff}`, phone, template, params, legivel);
    }
  }
}

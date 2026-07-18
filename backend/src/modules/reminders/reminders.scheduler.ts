import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

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
  ) {}

  @Cron('0 9 * * *', { timeZone: 'America/Fortaleza' })
  async diario(): Promise<void> {
    try { await this.aniversarios(); } catch (e: any) { this.logger.error(`aniversarios: ${e?.message || e}`); }
    try { await this.protocolos(); } catch (e: any) { this.logger.error(`protocolos: ${e?.message || e}`); }
  }

  // ---------- helpers ----------
  private fort(d: Date) { const f = new Date(d.getTime() - 3 * 3600 * 1000); return { y: f.getUTCFullYear(), m: f.getUTCMonth(), d: f.getUTCDate() }; }
  private diffDias(prevista: Date): number { const h = this.fort(new Date()); const p = this.fort(prevista); return Math.round((Date.UTC(p.y, p.m, p.d) - Date.UTC(h.y, h.m, h.d)) / 86400000); }
  private ddmm(d: Date) { const f = this.fort(d); return `${String(f.d).padStart(2, '0')}/${String(f.m + 1).padStart(2, '0')}`; }
  private primeiro(nome?: string | null) { return (nome || '').trim().split(/\s+/)[0] || 'tutor'; }
  private telDe(tutor: any): string | null { const cs = tutor?.contacts || []; const wa = cs.find((x: any) => x.isWhatsApp) || cs.find((x: any) => x.isPrimary) || cs[0]; return wa?.number || null; }
  private T(text: string) { return { type: 'text' as const, text }; }

  /** Envia 1x só: checa/marca em `reminder_sent` pela chave. */
  private async enviarUmaVez(chave: string, phone: string, template: string, params: Array<{ type: 'text'; text: string }>, textoLegivel?: string): Promise<void> {
    const ja = await this.prisma.listaItem.findFirst({ where: { lista: 'reminder_sent', valor: chave } });
    if (ja) return;
    const res = await this.whatsapp.enviarTemplateRegistrando(phone, template, params, textoLegivel);
    if (!res.success) { this.logger.warn(`Falha ${template} (${chave}): ${res.error}`); return; }
    await this.prisma.listaItem.create({ data: { lista: 'reminder_sent', valor: chave } }).catch(() => undefined);
    this.logger.log(`${template} enviado (${chave})`);
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
      const b = this.fort(new Date(t.birthDate as Date));
      if (b.m !== h.m || b.d !== h.d) continue;
      const phone = this.telDe(t); if (!phone) continue;
      await this.enviarUmaVez(`aniv-tutor:${t.id}:${ano}`, phone, 'aniversario_tutor', [this.T(this.primeiro(t.name))], `🎂 Mensagem de aniversário enviada para ${this.primeiro(t.name)}.`);
    }
    // Pets com data de nascimento hoje, cujo tutor aceita WhatsApp.
    const pets = await this.prisma.pet.findMany({
      where: { birthDate: { not: null }, tutor: { acceptsWhatsApp: true } },
      select: { id: true, name: true, birthDate: true, tutor: { select: { id: true, name: true, contacts: true } } },
    });
    for (const p of pets) {
      const b = this.fort(new Date(p.birthDate as Date));
      if (b.m !== h.m || b.d !== h.d) continue;
      const phone = this.telDe(p.tutor); if (!phone) continue;
      await this.enviarUmaVez(`aniv-pet:${p.id}:${ano}`, phone, 'aniversario_pet', [this.T(this.primeiro(p.tutor?.name)), this.T(p.name || 'seu pet')], `🎂 Aniversário do pet ${p.name || ''} — mensagem enviada.`);
    }
  }

  // ---------- protocolos (vacina etc.) ----------
  async protocolos(): Promise<void> {
    const ini = new Date(); ini.setDate(ini.getDate() - 17);
    const fim = new Date(); fim.setDate(fim.getDate() + 17);
    const doses = await this.prisma.protocoloDose.findMany({
      where: { status: 'PENDENTE', dataPrevista: { gte: ini, lte: fim } },
      include: { protocolo: { select: { nomeProtocolo: true, pet: { select: { name: true } }, tutor: { select: { id: true, name: true, acceptsWhatsApp: true, contacts: true } } } } },
      take: 1000,
    });
    for (const dose of doses) {
      const prot = (dose as any).protocolo;
      const tutor = prot?.tutor;
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

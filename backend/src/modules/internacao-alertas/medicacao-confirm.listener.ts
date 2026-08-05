import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

/**
 * Quando o veterinário toca o botão "Medicação aplicada" no WhatsApp (resposta do
 * template `alerta_medicacao_internacao`), marca a dose sozinho na ficha da internação:
 * registra a hora e QUEM aplicou, e — se a medicação estiver vinculada ao catálogo —
 * lança na conta (igual ao ✓ manual da ficha).
 * Correlação: usa o "pendente de confirmação" (`intalerta_wa_pend`) mais recente
 * enviado àquele telefone (últimos 60 min).
 */
@Injectable()
export class MedicacaoConfirmListener {
  private readonly logger = new Logger(MedicacaoConfirmListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  private tail(phone: string): string {
    return String(phone || '').replace(/\D/g, '').slice(-8);
  }
  private diaFortaleza(iso?: string): string {
    const d = iso ? new Date(iso) : new Date();
    const f = new Date(d.getTime() - 3 * 3600 * 1000);
    return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}-${String(f.getUTCDate()).padStart(2, '0')}`;
  }

  @OnEvent('whatsapp.message.received')
  async handle(payload: any): Promise<void> {
    try {
      const content = String(payload?.content || '').toLowerCase().trim();
      const phone = String(payload?.contactPhone || '');
      if (!content || !phone) return;
      // só reage ao botão de aplicação ("Medicação aplicada")
      if (!content.includes('aplicad')) return;

      const tail = this.tail(phone);
      if (!tail) return;

      // pendente de confirmação mais recente pra esse telefone (não confirmado, últimos 60 min)
      const pends = await this.prisma.listaItem.findMany({ where: { lista: 'intalerta_wa_pend' }, select: { id: true, valor: true } });
      let alvo: any = null; let alvoId = ''; let alvoAt = 0;
      for (const it of pends) {
        let v: any = null; try { v = JSON.parse(it.valor); } catch { continue; }
        if (!v || v.confirmado) continue;
        if (this.tail(v.phone) !== tail) continue;
        const at = Date.parse(v.at || '') || 0;
        if (Date.now() - at > 60 * 60 * 1000) continue;
        if (at > alvoAt) { alvoAt = at; alvo = v; alvoId = it.id; }
      }
      if (!alvo) return; // nada pendente pra esse número → ignora

      const hoje = this.diaFortaleza();
      // já marcada? (mesma prescrição + horário + hoje)
      const jaMed = await this.prisma.listaItem.findMany({ where: { lista: `intmed_${alvo.apptId}` }, select: { valor: true } });
      const dup = jaMed.some((m) => {
        let mv: any = null; try { mv = JSON.parse(m.valor); } catch { return false; }
        const dia = mv?.at ? this.diaFortaleza(mv.at) : mv?.date;
        return mv?.prescId === alvo.prescId && mv?.slot === alvo.horario && dia === hoje;
      });

      if (!dup) {
        const at = new Date().toISOString();
        const valor = JSON.stringify({
          prescId: alvo.prescId, med: alvo.medicamento, via: alvo.via, dose: alvo.dose,
          slot: alvo.horario, date: hoje, at, por: alvo.vetNome || 'Veterinário', viaWhatsApp: true,
        });
        const created = await this.prisma.listaItem.create({ data: { lista: `intmed_${alvo.apptId}`, valor } });
        this.logger.log(`Dose marcada via WhatsApp: ${alvo.medicamento} ${alvo.horario} (internação ${alvo.apptId}) por ${alvo.vetNome}`);

        // Cobrança automática (igual ao ✓ da ficha): prescrição vinculada ao catálogo → lança 1× na conta.
        if (alvo.cobrarId) {
          const itemPayload = {
            descricao: `${alvo.cobrarNome || alvo.medicamento} — aplicação ${alvo.horario}`,
            categoria: 'Medicação', quantidade: 1, valorUnitario: Number(alvo.cobrarValor) || 0,
            servicoId: alvo.cobrarTipo === 'servico' ? alvo.cobrarId : '',
            productId: alvo.cobrarTipo === 'produto' ? alvo.cobrarId : '',
            baixado: false, medLogId: created.id, auto: true,
          };
          await this.prisma.listaItem.create({ data: { lista: `intconta_${alvo.apptId}`, valor: JSON.stringify(itemPayload) } }).catch(() => {});
        }
      }

      // marca o pendente como confirmado (não repete)
      await this.prisma.listaItem.update({ where: { id: alvoId }, data: { valor: JSON.stringify({ ...alvo, confirmado: true }) } }).catch(() => {});

      // confirma pro vet (conversa está aberta — ele acabou de responder)
      await this.whatsapp
        .sendMessage({ to: phone, message: `✅ Aplicação registrada: ${alvo.medicamento}${alvo.horario ? ` (${alvo.horario})` : ''}. Obrigado!` })
        .catch(() => undefined);
    } catch (e: any) {
      this.logger.warn(`Falha no MedicacaoConfirmListener: ${e?.message || e}`);
    }
  }
}

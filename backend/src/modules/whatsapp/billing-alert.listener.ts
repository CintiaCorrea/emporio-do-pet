import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * Avisa a administração por E-MAIL quando o WhatsApp começa a falhar por
 * PROBLEMA DE PAGAMENTO na Meta (erro 131042) — assim dá pra regularizar o
 * cartão ANTES de os disparos pararem de vez. Anti-spam: 1 e-mail a cada 12h.
 * (Usa e-mail porque o WhatsApp é justamente o canal que está falhando.)
 */
const THROTTLE_MS = 12 * 60 * 60 * 1000;

@Injectable()
export class BillingAlertListener {
  private readonly logger = new Logger(BillingAlertListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  @OnEvent('whatsapp.billing.failed')
  async handle(payload: { code?: string; reason?: string }): Promise<void> {
    try {
      // Anti-spam: 1 aviso a cada 12h.
      const marca = await this.prisma.listaItem.findFirst({
        where: { lista: 'billing_alert_sent' },
        orderBy: { createdAt: 'desc' },
      });
      if (marca) {
        try {
          const at = JSON.parse(marca.valor).at;
          if (Date.now() - new Date(at).getTime() < THROTTLE_MS) return;
        } catch { /* segue e reenvia */ }
      }

      const admin = await this.prisma.user
        .findFirst({ where: { role: 'ADMIN' }, select: { email: true } })
        .catch(() => null);
      const to = admin?.email || 'adm.emporiodopet@gmail.com';

      await this.email.sendEmail({
        to,
        subject: '⚠️ WhatsApp: problema de pagamento na Meta — os avisos automáticos pararam de chegar',
        html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1F2A2E;max-width:560px">
          <h2 style="color:#014D5E;margin:0 0 8px">⚠️ WhatsApp com problema de pagamento</h2>
          <p>A Meta está <b>recusando a entrega dos templates</b> do WhatsApp — lembretes de vacina, aniversário, confirmação de agenda, boletins de internação/fisio — por um <b>problema de pagamento/elegibilidade</b> (erro <b>131042</b>).</p>
          <p>As conversas normais (respostas dentro de 24h) continuam funcionando, mas os <b>disparos automáticos NÃO estão chegando</b> aos clientes.</p>
          <p style="background:#FDECEC;border:1px solid #f4baba;border-radius:8px;padding:10px 12px"><b>O que fazer agora:</b><br>
          Entre no <b>Meta Business Manager → Configurações do negócio → Pagamentos</b> (ou <b>WhatsApp Manager → Faturamento</b>) e <b>regularize o método de pagamento</b> — cartão vencido/recusado ou fatura em aberto.</p>
          <p style="color:#5C6B70;font-size:13px">Assim que o pagamento for aceito, os templates voltam a ser entregues sozinhos — não precisa mexer no sistema.</p>
          <p style="color:#8A857A;font-size:12px;border-top:1px solid #eee;padding-top:10px">Aviso automático do sistema Empório do Pet.${payload?.reason ? ` (detalhe técnico: ${payload.reason})` : ''}</p>
        </div>`,
        text: 'WhatsApp com problema de pagamento na Meta (erro 131042). Os templates (lembretes/confirmações) não estão sendo entregues. Regularize o pagamento em Meta Business Manager > Configurações > Pagamentos.',
      });

      await this.prisma.listaItem
        .create({ data: { lista: 'billing_alert_sent', valor: JSON.stringify({ at: new Date().toISOString(), code: payload?.code || '131042' }) } })
        .catch(() => undefined);
      this.logger.log(`Aviso de billing (131042) enviado por e-mail para ${to}.`);
    } catch (e: any) {
      this.logger.warn(`Falha ao enviar aviso de billing: ${e?.message || e}`);
    }
  }
}

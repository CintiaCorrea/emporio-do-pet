import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import { EmailService } from '../email/email.service';

/**
 * Avisa a administração quando alguém é barrado no login pelo controle de horário
 * (escala/plantão). Vai por E-MAIL (chega sempre — não depende de janela) E por
 * WhatsApp (só quando a janela de 24h está aberta). Config em
 * `config_acesso_login`: `whatsappAviso` (número) e `emailAviso` (e-mail; se vazio
 * usa o e-mail do ADMIN). Anti-spam: no máximo 1 aviso por pessoa a cada 30 min.
 */
const THROTTLE_MS = 30 * 60 * 1000;

@Injectable()
export class AcessoBloqueioListener {
  private readonly logger = new Logger(AcessoBloqueioListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
    private readonly email: EmailService,
  ) {}

  @OnEvent('acesso.bloqueado')
  async handle(info: { userId: string; email: string; nome: string; at: string }): Promise<void> {
    try {
      const cfgItem = await this.prisma.listaItem.findFirst({ where: { lista: 'config_acesso_login' } });
      if (!cfgItem) return;
      let cfg: any = {};
      try { cfg = JSON.parse(cfgItem.valor); } catch { return; }
      if (cfg.avisarAdmin === false) return;
      const phone = String(cfg.whatsappAviso || '').replace(/\D/g, '');

      // Anti-spam: 1 aviso por pessoa a cada 30 min.
      const marca = await this.prisma.listaItem.findFirst({
        where: { lista: 'aviso_bloqueio_sent', valor: { contains: `"${info.userId}"` } },
      });
      if (marca) {
        try {
          const m = JSON.parse(marca.valor);
          if (Date.now() - new Date(m.at).getTime() < THROTTLE_MS) return;
        } catch { /* segue e reenvia */ }
      }

      const hora = new Date(info.at).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza',
      });
      const texto = [
        `🔒 *Acesso bloqueado por horário*`,
        ``,
        `*${info.nome || info.email}* tentou entrar fora do horário de escala/plantão às ${hora}.`,
        ``,
        `Se quiser liberar, ajuste em *Configurações › Acesso por horário*.`,
      ].join('\n');

      // Aviso por E-MAIL (o WhatsApp foi desativado a pedido da Cintia em 03/08 — não chegava fora da janela de 24h).
      // Chega sempre (vira notificação no celular). Vai pro e-mail configurado ou pro ADMIN.
      try {
        const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { email: true } }).catch(() => null);
        const to = String(cfg.emailAviso || admin?.email || 'adm.emporiodopet@gmail.com').trim();
        await this.email.sendEmail({
          to,
          subject: `🔒 Acesso bloqueado por horário — ${info.nome || info.email}`,
          html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1F2A2E;max-width:520px">
            <h2 style="color:#014D5E;margin:0 0 8px">🔒 Acesso bloqueado por horário</h2>
            <p><b>${info.nome || info.email}</b> tentou entrar fora do horário de escala/plantão às <b>${hora}</b>.</p>
            <p style="color:#5C6B70;font-size:13px">Se quiser liberar essa pessoa, ajuste em <b>Configurações › Acesso por horário</b> no sistema.</p>
            <p style="color:#8A857A;font-size:12px;border-top:1px solid #eee;padding-top:10px">Aviso automático do sistema Empório do Pet.</p>
          </div>`,
          text: `${info.nome || info.email} tentou entrar fora do horário às ${hora}. Ajuste em Configurações > Acesso por horário.`,
        });
      } catch (e: any) { this.logger.warn(`E-mail do bloqueio falhou: ${e?.message || e}`); }

      const valor = JSON.stringify({ userId: info.userId, at: new Date().toISOString() });
      if (marca) await this.prisma.listaItem.update({ where: { id: marca.id }, data: { valor } }).catch(() => undefined);
      else await this.prisma.listaItem.create({ data: { lista: 'aviso_bloqueio_sent', valor } }).catch(() => undefined);

      this.logger.log(`Aviso de bloqueio enviado ao admin (${info.nome || info.email}).`);
    } catch (e: any) {
      this.logger.warn(`Falha ao avisar bloqueio: ${e?.message || e}`);
    }
  }
}

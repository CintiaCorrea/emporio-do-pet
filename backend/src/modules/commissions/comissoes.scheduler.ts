import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionsService } from './commissions.service';
import { CronHealthService } from '../../common/cron-health.service';
import { ehDiaDeFecharComissao, avisoDeFechamento } from './comissoes.regras';

/**
 * O DIA DO FECHAMENTO DA COMISSÃO.
 *
 * A Cintia, em 07/09/2026: "as comissões fecham no dia 30 e quem confere é o adm."
 *
 * O sistema NÃO fecha sozinho: ele avisa o administrativo no dia, com o número de pessoas, de
 * itens e o total. Fechar comissão é comprometer dinheiro com gente — quem aperta o botão é
 * quem confere, e a tela de comissões já faz isso.
 *
 * Roda todo dia às 9h e pergunta à regra se hoje é o dia. Um cron escrito como "todo dia 30"
 * pularia fevereiro inteiro, e ninguém descobriria em fevereiro.
 */
@Injectable()
export class ComissoesScheduler {
  private readonly logger = new Logger(ComissoesScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissions: CommissionsService,
    private readonly cronHealth: CronHealthService,
  ) {}

  @Cron('0 9 * * *', { timeZone: 'America/Fortaleza' })
  async avisarFechamento(): Promise<void> {
    if (!ehDiaDeFecharComissao(new Date())) return;
    this.cronHealth.registrar('comissoes').catch(() => undefined);
    try {
      const aberto: any = await this.commissions.aberto();
      const aviso = avisoDeFechamento({
        pessoas: Array.isArray(aberto?.resumo) ? aberto.resumo.length : 0,
        itens: Number(aberto?.totais?.itens) || 0,
        comissao: Number(aberto?.totais?.comissao) || 0,
      });
      if (!aviso) { this.logger.log('Dia de fechar comissão, mas não há nada em aberto.'); return; }

      // Quem confere é o administrativo — é para ele que o aviso vai.
      const admins = await this.prisma.user.findMany({
        where: { isBlocked: false, role: 'ADMIN' },
        select: { id: true },
      });
      if (!admins.length) { this.logger.warn('Dia de fechar comissão e nenhum ADMIN para avisar.'); return; }

      await this.prisma.notification.createMany({
        data: admins.map((u) => ({
          userId: u.id,
          type: 'WARNING' as any,
          channel: 'IN_APP' as any,
          title: aviso.titulo,
          message: aviso.mensagem,
          link: '/dashboard/erp/comissoes/extratos',
        })),
      });
      this.logger.log(`Aviso de fechamento enviado para ${admins.length} administrador(es).`);
    } catch (e) {
      this.logger.error(`Aviso de fechamento da comissão falhou: ${String((e as any)?.message || e)}`);
    }
  }
}

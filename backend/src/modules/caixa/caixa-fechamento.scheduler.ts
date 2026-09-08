import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CaixaService } from './caixa.service';
import { CronHealthService } from '../../common/cron-health.service';

/**
 * O CAIXA ENCERRA TODO DIA À MEIA-NOITE. NÃO É OPÇÃO.
 *
 * A Cintia, em 08/09/2026: "os caixas DEVEM ser encerrados às 00:00 TODOS OS DIAS. Eles não
 * devem permanecer abertos."
 *
 * Isto existia antes escondido atrás de um interruptor na Configuração de Vendas
 * (`fecharCaixaMeiaNoite`), e o interruptor estava desligado — então caixa nenhum fechava. Um
 * caixa que atravessa o dia é a origem de metade da confusão do caixa: a lista da tela é do
 * DIA, o caixa esquecido de ontem não aparece nela, e a pessoa conclui que não tem caixa (ou
 * abre um segundo). Ela decidiu que isso é regra da casa, e regra da casa não fica num toggle
 * que alguém pode desligar sem saber o que desligou.
 *
 * O que o fechamento automático NÃO faz: contar a gaveta. Vai sem `valorContado`, então não há
 * diferença apurada. Conferência é ato de gente — quem quiser conferir fecha o caixa antes da
 * meia-noite, e quem precisar conferir depois reabre o caixa e fecha de novo.
 */
@Injectable()
export class CaixaFechamentoScheduler {
  private readonly logger = new Logger(CaixaFechamentoScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly caixa: CaixaService,
    private readonly cronHealth: CronHealthService,
  ) {}

  @Cron('0 0 * * *', { timeZone: 'America/Fortaleza' })
  async fecharCaixasMeiaNoite() {
    this.cronHealth.registrar('fechamento_caixa').catch(() => undefined);
    try {
      const abertos = await this.prisma.caixaSessao.findMany({
        where: { status: 'ABERTO' },
        select: { id: true, numero: true },
      });
      if (!abertos.length) return;
      let ok = 0;
      for (const c of abertos) {
        try {
          // Sem userId: o cron não é pessoa, então não passa pela regra de "quem pode fechar".
          await this.caixa.fechar(c.id, {
            observacao: 'Encerrado automaticamente à meia-noite (sem conferência de gaveta).',
          });
          ok++;
        } catch (e: any) {
          this.logger.error(`falha ao fechar caixa ${c.numero} (${c.id}): ${e?.message}`);
        }
      }
      this.logger.log(`Encerramento da meia-noite: ${ok} de ${abertos.length} caixa(s) fechado(s).`);
    } catch (e: any) {
      this.logger.error(`fecharCaixasMeiaNoite: ${e?.message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExamesService } from './exames.service';
import { CronHealthService } from '../../common/cron-health.service';

/**
 * Dois relógios diferentes, com donos diferentes:
 *   · 11:30 e 17:00 — avisa os LABORATÓRIOS das coletas pendentes;
 *   · 11:00, 15:00 e 17:00 — lembra a NOSSA RECEPÇÃO de fazer a solicitação (Cintia, 07/09/2026).
 */
@Injectable()
export class ExamesScheduler {
  private readonly logger = new Logger(ExamesScheduler.name);

  constructor(private readonly exames: ExamesService, private readonly cronHealth: CronHealthService) {}

  // COLETA: de meia em meia hora, das 7h às 19h — mas cada laboratório só é avisado NO HORÁRIO
  // DELE (Cintia, 12/09/2026: "nos horários já estipulados, conforme o laboratório do exame
  // solicitado"). Quem não tem horário configurado continua nos 11h30 e 17h de sempre.
  //
  // Eram duas crons fixas. A hora do aviso é a hora em que o motoboy daquele laboratório passa:
  // mandar às 17h para quem coleta às 9h faz o material dormir aqui e o resultado atrasar um dia
  // inteiro, sem ninguém ter errado nada.
  //
  // Bater de meia em meia hora e filtrar dentro é de propósito: uma cron por laboratório seria
  // uma cron que ninguém sabe que existe quando o laboratório muda de horário.
  @Cron('0,30 7-19 * * *', { timeZone: 'America/Fortaleza' })
  async coletaNoHorarioDoLab(): Promise<void> {
    this.cronHealth.registrar('exames').catch(() => undefined);
    try {
      await this.exames.avisarLaboratorios({ apenasNoHorario: true });
    } catch (e) { this.logger.error(`Aviso de coleta falhou: ${String((e as any)?.message || e)}`); }
  }

  // LEMBRETE DA RECEPÇÃO: UMA VEZ, às 10h (Fortaleza).
  //
  // Eram três (11h, 15h e 17h) e cobriam tudo de "Retirado" em diante — com um exame pendente
  // isso virava três mensagens por dia pela mesma citologia. A Cintia, 12/09/2026: "NÃO É PARA
  // REPETIR SE O EXAME ESTIVER EM OUTRA COLUNA".
  //
  // 10h porque o aviso ao laboratório sai 11h30: se faltou preparar alguma coisa, ainda dá
  // tempo no mesmo dia.
  @Cron('0 10 * * *', { timeZone: 'America/Fortaleza' })
  async lembrarRecepcao(): Promise<void> {
    this.cronHealth.registrar('exames').catch(() => undefined);
    try {
      const r = await this.exames.lembrarRecepcaoDaSolicitacao();
      if (r.exames) this.logger.log(`Lembrete de solicitação: ${r.exames} exame(s) para ${r.avisados} pessoa(s).`);
    } catch (e) { this.logger.error(`Lembrete de solicitação falhou: ${String((e as any)?.message || e)}`); }
  }

  // AVISO DE ATRASO DO LABORATÓRIO: uma vez por dia, às 10h30 (Fortaleza).
  //
  // Logo depois do lembrete das 10h de propósito: são as duas coisas que a equipe precisa saber
  // de manhã, e chegam juntas em vez de espalhadas pelo dia.
  //
  // O método só avisa de exame que AINDA não foi avisado — o cron rodar todo dia não faz o
  // mesmo laudo tocar todo dia.
  @Cron('30 10 * * *', { timeZone: 'America/Fortaleza' })
  async avisarAtrasos(): Promise<void> {
    this.cronHealth.registrar('exames').catch(() => undefined);
    try {
      const r = await this.exames.avisarAtrasosDoLaboratorio();
      if (r.atrasados) this.logger.log(`Atraso de laboratório: ${r.atrasados} laudo(s) para ${r.avisados} pessoa(s).`);
    } catch (e) { this.logger.error(`Aviso de atraso falhou: ${String((e as any)?.message || e)}`); }
  }

  // EXPURGO DO ARQUIVO: apaga de vez o que está arquivado há mais de 45 dias (Cintia, 14/09/2026).
  //
  // De madrugada, longe do movimento: é a única rotina que apaga dados, e se ela pesar no banco
  // não pode ser durante o atendimento.
  //
  // Falhar aqui é inofensivo — o card fica mais um dia e sai amanhã. Por isso o erro é só
  // registrado: nada de tentar de novo em cima, insistindo numa rotina que apaga.
  @Cron('20 3 * * *', { timeZone: 'America/Fortaleza' })
  async expurgarArquivo(): Promise<void> {
    this.cronHealth.registrar('exames').catch(() => undefined);
    try {
      const r = await this.exames.expurgarArquivados();
      if (r.apagados) this.logger.log(`Arquivo de exames: ${r.apagados} card(s) passaram dos 45 dias e foram apagados.`);
    } catch (e) { this.logger.error(`Expurgo do arquivo falhou: ${String((e as any)?.message || e)}`); }
  }
}

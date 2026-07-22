import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CloudStorageService } from '../media/cloud-storage.service';

/**
 * Limpeza automática dos ÁUDIOS de consulta.
 *
 * Depois de DIAS_RETENCAO dias, o arquivo de áudio é apagado do armazenamento
 * (economia de espaço + privacidade/LGPD), mas a TRANSCRIÇÃO e a ANÁLISE da IA
 * continuam salvas — o prontuário fica intacto.
 *
 * A cópia local (baixada no computador ao finalizar a gravação) é a segunda via.
 */
const DIAS_RETENCAO = 30;

@Injectable()
export class ConsultationRecordingsCleanupScheduler {
  private readonly logger = new Logger(ConsultationRecordingsCleanupScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloud: CloudStorageService,
  ) {}

  // Todo dia às 3h (Fortaleza) — horário de baixo movimento.
  @Cron('0 3 * * *', { timeZone: 'America/Fortaleza' })
  async limparAudiosAntigos(): Promise<void> {
    const corte = new Date(Date.now() - DIAS_RETENCAO * 24 * 60 * 60 * 1000);
    const antigas = await this.prisma.consultationRecording.findMany({
      where: { audioUrl: { not: null }, createdAt: { lt: corte } },
      select: { id: true, audioUrl: true },
    });
    if (!antigas.length) return;

    let apagados = 0;
    for (const rec of antigas) {
      try {
        if (rec.audioUrl) {
          const r = await this.cloud.deleteByUrl(rec.audioUrl);
          if (!r.success) {
            this.logger.warn(`Não consegui apagar o áudio da gravação ${rec.id}: ${r.error}`);
          }
        }
        // Mesmo que o storage falhe, tira a referência do áudio (fica só a transcrição).
        await this.prisma.consultationRecording.update({
          where: { id: rec.id },
          data: { audioUrl: null, audioFileName: null },
        });
        apagados++;
      } catch (e: any) {
        this.logger.warn(`Falha ao limpar áudio da gravação ${rec.id}: ${e?.message || e}`);
      }
    }
    this.logger.log(
      `Limpeza de áudios de consulta: ${apagados} áudio(s) com +${DIAS_RETENCAO} dias apagado(s); transcrição/análise mantidas.`,
    );
  }
}

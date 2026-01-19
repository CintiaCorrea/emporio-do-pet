import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EnrichmentService } from './enrichment.service';
import { ScoringService } from '../scoring/scoring.service';
import { InsightsService } from '../insights/insights.service';

interface EnrichLeadJobData {
  leadId: string;
}

interface ScoreLeadJobData {
  leadId: string;
}

@Processor('lead-enrichment', {
  concurrency: 5, // Máximo de 5 jobs simultâneos
})
export class EnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(EnrichmentProcessor.name);

  constructor(
    private readonly enrichmentService: EnrichmentService,
    private readonly scoringService: ScoringService,
    private readonly insightsService: InsightsService,
  ) {
    super();
  }

  /**
   * Processa jobs da fila
   */
  async process(job: Job<EnrichLeadJobData | ScoreLeadJobData>): Promise<void> {
    this.logger.debug(`Processando job ${job.name} (${job.id})`);

    switch (job.name) {
      case 'enrich-lead':
        await this.processEnrichLead(job as Job<EnrichLeadJobData>);
        break;

      case 'score-lead':
        await this.processScoreLead(job as Job<ScoreLeadJobData>);
        break;

      default:
        this.logger.warn(`Job desconhecido: ${job.name}`);
    }
  }

  /**
   * Processa enriquecimento de lead
   */
  private async processEnrichLead(job: Job<EnrichLeadJobData>): Promise<void> {
    const { leadId } = job.data;

    this.logger.log(`Enriquecendo lead ${leadId}`);

    try {
      // 1. Enriquecer dados
      await this.enrichmentService.enrichLead(leadId);
      await job.updateProgress(33);

      // 2. Calcular score
      await this.scoringService.calculateScore(leadId);
      await job.updateProgress(66);

      // 3. Gerar insights
      await this.insightsService.generateInsights(leadId);
      await job.updateProgress(100);

      this.logger.log(`Lead ${leadId} processado com sucesso`);
    } catch (error) {
      this.logger.error(`Erro ao processar lead ${leadId}:`, error);
      throw error; // Re-throw para o BullMQ fazer retry
    }
  }

  /**
   * Processa apenas scoring (para eventos importantes)
   */
  private async processScoreLead(job: Job<ScoreLeadJobData>): Promise<void> {
    const { leadId } = job.data;

    this.logger.log(`Recalculando score do lead ${leadId}`);

    try {
      // 1. Recalcular score
      await this.scoringService.calculateScore(leadId);
      await job.updateProgress(50);

      // 2. Atualizar insights
      await this.insightsService.generateInsights(leadId);
      await job.updateProgress(100);

      this.logger.log(`Score do lead ${leadId} atualizado`);
    } catch (error) {
      this.logger.error(`Erro ao calcular score do lead ${leadId}:`, error);
      throw error;
    }
  }

  /**
   * Eventos do worker
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Job ${job.name} (${job.id}) completado`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.name} (${job.id}) falhou após ${job.attemptsMade} tentativas:`,
      error.message,
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error('Erro no worker:', error);
  }
}

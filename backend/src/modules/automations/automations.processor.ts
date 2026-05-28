import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
// Prisma JsonValue type for metadata fields
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../email/email.service';

interface AutomationJobData {
  automationId: string;
  triggeredBy: 'schedule' | 'event' | 'webhook' | 'manual';
  metadata?: Record<string, unknown>;
}

interface StepResult {
  stepId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  duration: number;
}

@Processor('automations')
export class AutomationsProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationsProcessor.name);
  private readonly aiServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private whatsAppService: WhatsAppService,
    private emailService: EmailService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    super();
    this.aiServiceUrl = this.configService.get<string>('aiService.url') || 'http://localhost:8000';
  }

  async process(job: Job<AutomationJobData>): Promise<{ success: boolean; results: StepResult[] }> {
    const { automationId, triggeredBy, metadata } = job.data;
    
    this.logger.log(`Processing automation ${automationId} triggered by ${triggeredBy}`);

    const startTime = Date.now();
    const stepResults: StepResult[] = [];

    try {
      // Load automation with steps
      const automation = await this.prisma.automation.findUnique({
        where: { id: automationId },
        include: {
          steps: {
            orderBy: { position: 'asc' },
          },
          agent: true,
        },
      });

      if (!automation) {
        throw new Error(`Automation ${automationId} not found`);
      }

      if (automation.status !== 'ACTIVE') {
        throw new Error(`Automation ${automationId} is not active (status: ${automation.status})`);
      }

      // Create execution log
      const log = await this.prisma.automationLog.create({
        data: {
          automationId,
          status: 'RUNNING',
          triggeredBy,
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
        },
      });

      // Execute each step - ensure userId is always in context for per-user integrations
      let context: Record<string, unknown> = { ...metadata, userId: automation.userId, automationId };

      for (const step of automation.steps) {
        const stepStartTime = Date.now();
        
        try {
          this.logger.debug(`Executing step ${step.id} (${step.type}): ${step.name}`);
          
          const result = await this.executeStep(step, context);
          
          // Update context with step result for next steps
          context = { ...context, [`step_${step.position}`]: result };

          stepResults.push({
            stepId: step.id,
            success: true,
            output: result,
            duration: Date.now() - stepStartTime,
          });

        } catch (stepError) {
          this.logger.error(`Step ${step.id} failed: ${stepError}`);
          
          stepResults.push({
            stepId: step.id,
            success: false,
            error: stepError instanceof Error ? stepError.message : 'Unknown error',
            duration: Date.now() - stepStartTime,
          });

          // Stop execution on step failure
          throw stepError;
        }
      }

      const duration = Date.now() - startTime;

      // Update log with success
      await this.prisma.automationLog.update({
        where: { id: log.id },
        data: {
          status: 'SUCCESS',
          duration,
          stepsExecuted: stepResults.length,
          metadata: JSON.parse(JSON.stringify({ results: stepResults })),
        },
      });

      // Update automation metrics
      await this.updateAutomationMetrics(automationId, duration, true);

      this.logger.log(`Automation ${automationId} completed successfully in ${duration}ms`);

      // Emit completion event for WebSocket notification
      this.eventEmitter.emit('automation.completed', {
        automationId,
        userId: automation.userId,
        success: true,
        duration,
        stepsExecuted: stepResults.length,
      });

      return { success: true, results: stepResults };

    } catch (error) {
      const duration = Date.now() - startTime;

      // Create or update failure log
      await this.prisma.automationLog.create({
        data: {
          automationId,
          status: 'FAILED',
          triggeredBy,
          duration,
          stepsExecuted: stepResults.length,
          error: error instanceof Error ? error.message : 'Unknown error',
          metadata: JSON.parse(JSON.stringify({ results: stepResults, ...metadata })),
        },
      });

      // Update metrics
      await this.updateAutomationMetrics(automationId, duration, false);

      this.logger.error(`Automation ${automationId} failed: ${error}`);

      throw error;
    }
  }

  private async executeStep(
    step: { id: string; type: string; name: string; config: unknown },
    context: Record<string, unknown>,
  ): Promise<unknown> {
    const config = (step.config as Record<string, unknown>) || {};

    switch (step.type) {
      case 'delay':
        return this.executeDelayStep(config);

      case 'query':
        return this.executeQueryStep(config, context);

      case 'filter':
        return this.executeFilterStep(config, context);

      case 'message':
        return this.executeMessageStep(config, context);

      case 'email':
        return this.executeEmailStep(config, context);

      case 'webhook':
        return this.executeWebhookStep(config, context);

      case 'ai_chat':
        return this.executeAIChatStep(config, context);

      case 'notification':
        return this.executeNotificationStep(config, context);

      default:
        this.logger.warn(`Unknown step type: ${step.type}`);
        return null;
    }
  }

  private async executeDelayStep(config: Record<string, unknown>): Promise<void> {
    const duration = (config.duration as number) || 1000;
    const unit = (config.unit as string) || 'ms';

    let ms = duration;
    switch (unit) {
      case 's': ms = duration * 1000; break;
      case 'm': ms = duration * 60 * 1000; break;
      case 'h': ms = duration * 60 * 60 * 1000; break;
    }

    // Max delay of 5 minutes in processor (longer delays should use scheduled jobs)
    const maxDelay = 5 * 60 * 1000;
    await new Promise(resolve => setTimeout(resolve, Math.min(ms, maxDelay)));
  }

  private async executeQueryStep(
    config: Record<string, unknown>,
    _context: Record<string, unknown>,
  ): Promise<unknown> {
    const entity = config.entity as string;
    const filter = config.filter as Record<string, unknown> | undefined;
    const limit = (config.limit as number) || 100;

    // Build where clause from filter config
    const where = filter?.where as Record<string, unknown> | undefined;

    switch (entity) {
      case 'tutors':
        return this.prisma.tutor.findMany({ where, take: limit });
      
      case 'pets':
        return this.prisma.pet.findMany({ 
          where, 
          take: limit, 
          include: { tutor: true } 
        });
      
      case 'appointments':
        return this.prisma.appointment.findMany({ 
          where,
          take: limit, 
          include: { tutor: true, pet: true },
          orderBy: { date: 'asc' },
        });
      
      case 'products':
        return this.prisma.product.findMany({ where, take: limit });
      
      // CRM Entities
      case 'leads':
        return this.prisma.lead.findMany({
          where,
          take: limit,
          include: {
            enrichment: true,
            events: { take: 5, orderBy: { createdAt: 'desc' } },
            insights: { where: { dismissed: false }, take: 3 },
          },
          orderBy: { lastSeenAt: 'desc' },
        });
      
      case 'clients':
        // Client unificado em Tutor com classificacao=Cliente
        return this.prisma.tutor.findMany({
          where: { ...where, classificacao: 'Cliente' },
          take: limit,
          orderBy: { createdAt: 'desc' },
        });
      
      // WhatsApp entities
      case 'whatsapp_conversations':
        return this.prisma.whatsAppConversation.findMany({
          where,
          take: limit,
          include: {
            messages: { take: 1, orderBy: { createdAt: 'desc' } },
          },
          orderBy: { lastMessageAt: 'desc' },
        });
      
      default:
        return [];
    }
  }

  private async executeFilterStep(
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<unknown> {
    // Get data from previous step
    const previousStepKey = Object.keys(context)
      .filter(k => k.startsWith('step_'))
      .sort()
      .pop();

    const data = previousStepKey ? (context[previousStepKey] as unknown[]) : [];
    
    if (!Array.isArray(data)) return data;

    const field = config.field as string;
    const operator = config.operator as string;
    const value = config.value;
    const condition = config.condition as string;

    // If no filter criteria, return all data
    if (!field && !condition) return data;

    // Filter using field/operator/value
    if (field && operator) {
      return data.filter((item: unknown) => {
        const record = item as Record<string, unknown>;
        const fieldValue = this.getNestedValue(record, field);

        switch (operator) {
          case 'equals':
          case '==':
          case '===':
            return fieldValue === value;
          
          case 'not_equals':
          case '!=':
          case '!==':
            return fieldValue !== value;
          
          case 'contains':
            return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
          
          case 'not_contains':
            return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
          
          case 'starts_with':
            return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());
          
          case 'ends_with':
            return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());
          
          case 'greater_than':
          case '>':
            return Number(fieldValue) > Number(value);
          
          case 'greater_than_or_equals':
          case '>=':
            return Number(fieldValue) >= Number(value);
          
          case 'less_than':
          case '<':
            return Number(fieldValue) < Number(value);
          
          case 'less_than_or_equals':
          case '<=':
            return Number(fieldValue) <= Number(value);
          
          case 'in':
            const inValues = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
            return inValues.includes(fieldValue);
          
          case 'not_in':
            const notInValues = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
            return !notInValues.includes(fieldValue);
          
          case 'is_null':
          case 'is_empty':
            return fieldValue === null || fieldValue === undefined || fieldValue === '';
          
          case 'is_not_null':
          case 'is_not_empty':
            return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
          
          case 'is_true':
            return fieldValue === true || fieldValue === 'true' || fieldValue === 1;
          
          case 'is_false':
            return fieldValue === false || fieldValue === 'false' || fieldValue === 0;
          
          case 'regex':
            try {
              const regex = new RegExp(String(value), 'i');
              return regex.test(String(fieldValue));
            } catch {
              return false;
            }
          
          case 'date_before':
            return new Date(String(fieldValue)) < new Date(String(value));
          
          case 'date_after':
            return new Date(String(fieldValue)) > new Date(String(value));
          
          case 'date_equals':
            const d1 = new Date(String(fieldValue));
            const d2 = new Date(String(value));
            return d1.toDateString() === d2.toDateString();

          default:
            this.logger.warn(`Unknown filter operator: ${operator}`);
            return true;
        }
      });
    }

    // Legacy: filter using condition string (basic expression)
    if (condition) {
      return data.filter((item: unknown) => {
        try {
          return this.evaluateCondition(condition, item as Record<string, unknown>);
        } catch (error) {
          this.logger.warn(`Failed to evaluate condition: ${condition}`, error);
          return true;
        }
      });
    }

    return data;
  }

  /**
   * Get nested value from object using dot notation
   * Example: getNestedValue({a: {b: 1}}, 'a.b') => 1
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj as unknown);
  }

  /**
   * Evaluate simple condition string
   * Supports: field == value, field != value, field > value, etc.
   */
  private evaluateCondition(condition: string, data: Record<string, unknown>): boolean {
    // Parse condition like "status == 'active'" or "age > 18"
    const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];
    
    for (const op of operators) {
      if (condition.includes(op)) {
        const [leftPart, rightPart] = condition.split(op).map(s => s.trim());
        
        // Get the field value
        const fieldValue = this.getNestedValue(data, leftPart);
        
        // Parse the comparison value
        let compareValue: unknown = rightPart;
        if (rightPart.startsWith("'") && rightPart.endsWith("'")) {
          compareValue = rightPart.slice(1, -1);
        } else if (rightPart.startsWith('"') && rightPart.endsWith('"')) {
          compareValue = rightPart.slice(1, -1);
        } else if (rightPart === 'true') {
          compareValue = true;
        } else if (rightPart === 'false') {
          compareValue = false;
        } else if (rightPart === 'null') {
          compareValue = null;
        } else if (!isNaN(Number(rightPart))) {
          compareValue = Number(rightPart);
        }

        switch (op) {
          case '===':
          case '==':
            return fieldValue === compareValue;
          case '!==':
          case '!=':
            return fieldValue !== compareValue;
          case '>':
            return Number(fieldValue) > Number(compareValue);
          case '>=':
            return Number(fieldValue) >= Number(compareValue);
          case '<':
            return Number(fieldValue) < Number(compareValue);
          case '<=':
            return Number(fieldValue) <= Number(compareValue);
        }
      }
    }

    return true;
  }

  private async executeMessageStep(
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<{ sent: number; failed: number; details: Array<{ phone: string; success: boolean; error?: string }> }> {
    const template = config.template as string;
    const phoneField = config.phoneField as string || 'phone';

    // Get recipients from context (previous step data)
    const previousStepKey = Object.keys(context)
      .filter(k => k.startsWith('step_'))
      .sort()
      .pop();

    const recipients = previousStepKey ? (context[previousStepKey] as unknown[]) : [];
    const details: Array<{ phone: string; success: boolean; error?: string }> = [];

    let sent = 0;
    let failed = 0;

    if (!Array.isArray(recipients)) {
      return { sent, failed, details };
    }

    // Get user-specific WhatsApp config (from automation context)
    const userId = context.userId as string;
    let userConfig = null;
    
    if (userId) {
      userConfig = await this.whatsAppService.getUserWhatsAppConfig(userId);
    }

    // Check if WhatsApp is configured (user config OR global env)
    if (!userConfig && !this.whatsAppService.isConfigured()) {
      this.logger.warn('WhatsApp service not configured, skipping message step');
      return { sent: 0, failed: recipients.length, details: [{ phone: 'N/A', success: false, error: 'WhatsApp not configured' }] };
    }

    for (const recipient of recipients) {
      try {
        const phone = (recipient as Record<string, unknown>)[phoneField] as string;
        if (!phone) {
          failed++;
          details.push({ phone: 'unknown', success: false, error: 'Phone number not found' });
          continue;
        }

        // Interpolate template with recipient data
        let message = template;
        for (const [key, value] of Object.entries(recipient as Record<string, unknown>)) {
          message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value || ''));
        }

        // Also interpolate common placeholders
        message = message
          .replace(/\{nome\}/gi, (recipient as Record<string, unknown>).name as string || 'Cliente')
          .replace(/\{name\}/gi, (recipient as Record<string, unknown>).name as string || 'Cliente')
          .replace(/\{telefone\}/gi, phone)
          .replace(/\{phone\}/gi, phone)
          .replace(/\{data\}/gi, new Date().toLocaleDateString('pt-BR'))
          .replace(/\{date\}/gi, new Date().toLocaleDateString('pt-BR'));

        // Send via WhatsApp service (using user config if available)
        const result = await this.whatsAppService.sendMessage(
          { to: phone, message },
          userConfig || undefined,
        );
        
        if (result.success) {
          sent++;
          details.push({ phone, success: true });
          this.logger.debug(`WhatsApp sent to ${phone}`);
        } else {
          failed++;
          details.push({ phone, success: false, error: result.error });
          this.logger.warn(`WhatsApp failed to ${phone}: ${result.error}`);
        }

        // Rate limiting: 1 second between messages
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        failed++;
        details.push({ 
          phone: 'unknown', 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { sent, failed, details };
  }

  private async executeEmailStep(
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<{ sent: number; failed: number; details: Array<{ email: string; success: boolean; error?: string }> }> {
    const subject = config.subject as string;
    const template = config.template as string;
    const emailField = config.emailField as string || 'email';
    const nameField = config.nameField as string || 'name';

    const previousStepKey = Object.keys(context)
      .filter(k => k.startsWith('step_'))
      .sort()
      .pop();

    const recipients = previousStepKey ? (context[previousStepKey] as unknown[]) : [];
    const details: Array<{ email: string; success: boolean; error?: string }> = [];

    let sent = 0;
    let failed = 0;

    if (!Array.isArray(recipients)) {
      return { sent, failed, details };
    }

    // Check if email is configured
    if (!this.emailService.isConfigured()) {
      this.logger.warn('Email service not configured, skipping email step');
      return { sent: 0, failed: recipients.length, details: [{ email: 'N/A', success: false, error: 'Email not configured' }] };
    }

    for (const recipient of recipients) {
      try {
        const email = (recipient as Record<string, unknown>)[emailField] as string;
        if (!email) {
          failed++;
          details.push({ email: 'unknown', success: false, error: 'Email not found' });
          continue;
        }

        // Interpolate template
        let body = template;
        let interpolatedSubject = subject;
        for (const [key, value] of Object.entries(recipient as Record<string, unknown>)) {
          const regex = new RegExp(`\\{${key}\\}`, 'g');
          body = body.replace(regex, String(value || ''));
          interpolatedSubject = interpolatedSubject.replace(regex, String(value || ''));
        }

        // Create HTML email with template
        const recipientName = (recipient as Record<string, unknown>)[nameField] as string || 'Cliente';
        const emailTemplates = this.emailService.getTemplates();
        const { html, text } = emailTemplates.notification({
          title: interpolatedSubject,
          message: body,
          recipientName,
        });

        // Send via Email service
        const result = await this.emailService.sendEmail({
          to: email,
          subject: interpolatedSubject,
          html,
          text,
        });
        
        if (result.success) {
          sent++;
          details.push({ email, success: true });
          this.logger.debug(`Email sent to ${email}`);
        } else {
          failed++;
          details.push({ email, success: false, error: result.error });
          this.logger.warn(`Email failed to ${email}: ${result.error}`);
        }

        // Rate limiting: 100ms between emails
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        failed++;
        details.push({ 
          email: 'unknown', 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { sent, failed, details };
  }

  private async executeWebhookStep(
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<unknown> {
    const url = config.url as string;
    const method = (config.method as string) || 'POST';
    const headersJson = config.headers as string;

    let headers: Record<string, string> = { 'Content-Type': 'application/json' };
    
    try {
      if (headersJson) {
        headers = { ...headers, ...JSON.parse(headersJson) };
      }
    } catch {
      // Invalid JSON, use default headers
    }

    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? JSON.stringify(context) : undefined,
    });

    const data = await response.json().catch(() => null);

    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  }

  private async executeAIChatStep(
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<unknown> {
    const agentId = config.agentId as string;
    const promptTemplate = config.prompt as string;

    if (!agentId) {
      throw new Error('Agent ID is required for AI Chat step');
    }

    // Get agent details
    const agent = await this.prisma.aIAgent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (agent.status !== 'ACTIVE') {
      throw new Error(`Agent ${agentId} is not active`);
    }

    // Interpolate prompt with context data
    let prompt = promptTemplate;
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' || typeof value === 'number') {
        prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }

    // Get provider credentials
    const credentials = await this.getProviderCredentials(agent.userId, agent.provider);

    if (!credentials) {
      throw new Error(`No credentials found for provider ${agent.provider}`);
    }

    try {
      this.logger.debug(`Executing AI chat with agent ${agentId}`);

      // Call AI service
      const response = await fetch(`${this.aiServiceUrl}/v1/agents/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: agent.provider.toLowerCase(),
          model: agent.model,
          system_prompt: agent.systemPrompt,
          user_message: prompt,
          conversation_history: [],
          temperature: agent.temperature,
          max_tokens: agent.maxTokens,
          credentials: {
            api_key: credentials.apiKey,
            base_url: credentials.baseUrl,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || `HTTP ${response.status}`);
      }

      this.logger.log(`AI response generated for agent ${agentId}`);

      return {
        response: data.response || data.message || data.content,
        agentId,
        usage: data.usage,
        model: agent.model,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI Chat step failed: ${errorMessage}`);
      throw new Error(`AI execution failed: ${errorMessage}`);
    }
  }

  private async getProviderCredentials(
    userId: string,
    provider: string,
  ): Promise<{ apiKey: string; baseUrl?: string } | null> {
    const providerLower = provider.toLowerCase();

    // First try environment variables (single-tenant mode)
    const envKeyMap: Record<string, string> = {
      openai: 'integrations.openai.apiKey',
      gemini: 'integrations.gemini.apiKey',
      deepseek: 'integrations.deepseek.apiKey',
    };

    const envApiKey = this.configService.get<string>(envKeyMap[providerLower]);
    if (envApiKey) {
      return { apiKey: envApiKey };
    }

    // Fallback to user's integration settings (multi-tenant mode)
    try {
      const settings = await this.prisma.integrationSettings.findFirst({
        where: { userId },
      });

      if (!settings) return null;

      let configField: string | null = null;

      switch (providerLower) {
        case 'openai':
          configField = settings.openaiConfig;
          break;
        case 'gemini':
          configField = settings.geminiConfig;
          break;
        case 'deepseek':
          configField = settings.deepseekConfig;
          break;
        default:
          return null;
      }

      if (!configField) return null;

      const config = JSON.parse(configField);
      return {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
      };
    } catch (error) {
      this.logger.error(`Error getting provider credentials: ${error}`);
      return null;
    }
  }

  private async executeNotificationStep(
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<{ notified: boolean; notificationId?: string }> {
    const title = config.title as string;
    let message = config.message as string;
    const type = (config.type as string) || 'INFO';
    const channel = (config.channel as string) || 'IN_APP';
    const link = config.link as string | undefined;

    // Get userId from context (passed from automation)
    const userId = context.userId as string;

    if (!userId) {
      this.logger.warn('No userId in context, cannot create notification');
      return { notified: false };
    }

    // Interpolate message with context data
    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' || typeof value === 'number') {
        message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }

    // Map type string to enum
    const typeMap: Record<string, 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'ALERT'> = {
      info: 'INFO',
      success: 'SUCCESS',
      warning: 'WARNING',
      error: 'ERROR',
      alert: 'ALERT',
    };

    const channelMap: Record<string, 'IN_APP' | 'EMAIL' | 'WHATSAPP' | 'PUSH'> = {
      in_app: 'IN_APP',
      email: 'EMAIL',
      whatsapp: 'WHATSAPP',
      push: 'PUSH',
    };

    try {
      // Create notification in database
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type: typeMap[type.toLowerCase()] || 'INFO',
          channel: channelMap[channel.toLowerCase()] || 'IN_APP',
          title,
          message,
          link,
          metadata: context.automationId ? { automationId: context.automationId } : undefined,
        },
      });

      this.logger.log(`Notification created [${type}]: ${title} - ID: ${notification.id}`);

      // Emit event for real-time delivery via WebSocket
      this.eventEmitter.emit('notification.created', {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        metadata: notification.metadata,
        createdAt: notification.createdAt,
      });

      return { notified: true, notificationId: notification.id };
    } catch (error) {
      this.logger.error(`Failed to create notification: ${error}`);
      return { notified: false };
    }
  }

  private async updateAutomationMetrics(
    automationId: string,
    duration: number,
    success: boolean,
  ): Promise<void> {
    const automation = await this.prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation) return;

    const newTotal = automation.executions + 1;
    const successCount = success
      ? Math.round((automation.successRate / 100) * automation.executions) + 1
      : Math.round((automation.successRate / 100) * automation.executions);
    const newSuccessRate = newTotal > 0 ? (successCount / newTotal) * 100 : 0;
    const newAvgDuration = newTotal > 0
      ? (automation.avgDuration * automation.executions + duration) / newTotal
      : duration;

    await this.prisma.automation.update({
      where: { id: automationId },
      data: {
        executions: newTotal,
        successRate: newSuccessRate,
        avgDuration: newAvgDuration,
        lastRunAt: new Date(),
      },
    });
  }
}

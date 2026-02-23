import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface ServiceCheck {
  status: 'ok' | 'error' | 'unknown' | 'not_configured';
  message?: string;
  latency?: number;
}

interface HealthChecks {
  api: ServiceCheck;
  database: ServiceCheck;
  redis: ServiceCheck;
  aiService: ServiceCheck;
  whatsapp: ServiceCheck;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  private readonly aiServiceUrl: string;
  private readonly whatsappConfigured: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    this.whatsappConfigured = !!(
      this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') &&
      this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID')
    );
  }

  @Get()
  @ApiOperation({ summary: 'Health check básico' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Health check detalhado com todos os serviços' })
  async detailedCheck() {
    const checks: HealthChecks = {
      api: { status: 'ok', message: 'API running' },
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      aiService: { status: 'unknown' },
      whatsapp: { status: 'unknown' },
    };

    // Check database
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = {
        status: 'ok',
        message: 'PostgreSQL connected',
        latency: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      const client = this.redis.getClient();
      await client.ping();
      checks.redis = {
        status: 'ok',
        message: 'Redis connected',
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }

    // Check AI Service
    const aiStart = Date.now();
    try {
      const response = await fetch(`${this.aiServiceUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        checks.aiService = {
          status: 'ok',
          message: `AI Service running (${data.environment || 'unknown'})`,
          latency: Date.now() - aiStart,
        };
      } else {
        checks.aiService = {
          status: 'error',
          message: `AI Service returned ${response.status}`,
        };
      }
    } catch (error) {
      checks.aiService = {
        status: 'error',
        message: `AI Service unreachable at ${this.aiServiceUrl}`,
      };
    }

    // Check WhatsApp configuration
    if (this.whatsappConfigured) {
      const waStart = Date.now();
      try {
        const token = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
        const phoneId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
        const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v21.0';

        const response = await fetch(
          `https://graph.facebook.com/${apiVersion}/${phoneId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000),
          },
        );

        if (response.ok) {
          const data = await response.json();
          checks.whatsapp = {
            status: 'ok',
            message: `WhatsApp connected: ${data.display_phone_number || phoneId}`,
            latency: Date.now() - waStart,
          };
        } else {
          const error = await response.json().catch(() => ({}));
          checks.whatsapp = {
            status: 'error',
            message: error.error?.message || `WhatsApp API returned ${response.status}`,
          };
        }
      } catch (error) {
        checks.whatsapp = {
          status: 'error',
          message: error instanceof Error ? error.message : 'WhatsApp connection failed',
        };
      }
    } else {
      checks.whatsapp = {
        status: 'not_configured',
        message: 'WhatsApp credentials not set in environment',
      };
    }

    // Determine overall status
    const criticalServices = ['api', 'database', 'redis'];
    const criticalOk = criticalServices.every(
      (s) => checks[s as keyof HealthChecks].status === 'ok',
    );
    const allOk = Object.values(checks).every(
      (c) => c.status === 'ok' || c.status === 'not_configured',
    );

    return {
      status: criticalOk ? (allOk ? 'healthy' : 'degraded') : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks,
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check para Kubernetes/Docker' })
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const client = this.redis.getClient();
      await client.ping();
      return { ready: true };
    } catch {
      return { ready: false };
    }
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check para Kubernetes/Docker' })
  liveness() {
    return { alive: true, timestamp: new Date().toISOString() };
  }
}

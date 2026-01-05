import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check básico' })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Health check detalhado' })
  async detailedCheck() {
    const checks = {
      api: { status: 'ok' },
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
    };

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database.status = 'ok';
    } catch (error) {
      checks.database.status = 'error';
    }

    // Check Redis
    try {
      const client = this.redis.getClient();
      await client.ping();
      checks.redis.status = 'ok';
    } catch (error) {
      checks.redis.status = 'error';
    }

    const allOk = Object.values(checks).every((c) => c.status === 'ok');

    return {
      status: allOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}


import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  Sse,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AgentsService } from './agents.service';
import { CreateAgentDto, AgentStatus } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';
import { ExecuteAgentDto } from './dto/execute-agent.dto';
import { Observable, Subject } from 'rxjs';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

interface MessageEvent {
  data: string;
}

@Controller('agents')
@UseGuards(JwtAuthGuard)
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAgentDto) {
    return this.agentsService.create(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentsService.findAll(user.id, {
      status,
      type,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get('pricing')
  getPricing() {
    return this.agentsService.getPricing();
  }

  @Get('usage')
  getUsage(@CurrentUser() user: JwtUser) {
    return this.agentsService.getUserAiUsage(user.id);
  }

  @Get('circuit-status')
  getCircuitStatus() {
    return this.agentsService.getCircuitStatus();
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentDto,
  ) {
    return this.agentsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.agentsService.remove(user.id, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: AgentStatus,
  ) {
    return this.agentsService.updateStatus(user.id, id, status);
  }

  @Post(':id/execute')
  execute(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExecuteAgentDto,
  ) {
    return this.agentsService.execute(user.id, id, dto);
  }

  @Sse(':id/execute/stream')
  executeStream(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('message') message: string,
    @Query('context') contextStr?: string,
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    // Parse context if provided
    let context: Record<string, unknown> | undefined;
    if (contextStr) {
      try {
        context = JSON.parse(contextStr);
      } catch {
        // Ignore invalid context
      }
    }

    // Execute agent with real streaming
    (async () => {
      try {
        const stream = this.agentsService.executeStream(user.id, id, {
          userMessage: message,
          context,
          stream: true,
        });

        for await (const chunk of stream) {
          subject.next({ data: JSON.stringify(chunk) });
        }
        subject.complete();
      } catch (error) {
        subject.next({
          data: JSON.stringify({
            type: 'error',
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          }),
        });
        subject.complete();
      }
    })();

    return subject.asObservable();
  }

  @Get(':id/metrics')
  getMetrics(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentsService.getMetrics(user.id, id);
  }

  @Get(':id/executions')
  getExecutions(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.agentsService.getExecutions(user.id, id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
    });
  }

  @Get(':id/analytics')
  getAnalytics(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days') days?: string,
  ) {
    return this.agentsService.getAnalytics(user.id, id, {
      days: days ? parseInt(days, 10) : 30,
    });
  }

  // Rate limit endpoints
  @Get(':id/rate-limit')
  getRateLimitStatus(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentsService.getRateLimitStatus(user.id, id);
  }

  @Post(':id/rate-limit/reset')
  resetRateLimit(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.agentsService.resetRateLimit(user.id, id);
  }

  // Version endpoints
  @Get(':id/versions')
  getVersions(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentsService.getVersions(user.id, id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(':id/versions/:version')
  getVersion(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.agentsService.getVersion(user.id, id, version);
  }

  @Post(':id/versions')
  createVersion(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('changeNotes') changeNotes?: string,
  ) {
    return this.agentsService.createVersion(user.id, id, changeNotes);
  }

  @Post(':id/versions/:version/rollback')
  rollbackToVersion(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.agentsService.rollbackToVersion(user.id, id, version);
  }

  @Get(':id/versions/compare')
  compareVersions(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('v1', ParseIntPipe) v1: number,
    @Query('v2', ParseIntPipe) v2: number,
  ) {
    return this.agentsService.compareVersions(user.id, id, v1, v2);
  }
}

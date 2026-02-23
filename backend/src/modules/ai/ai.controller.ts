import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AIService } from './ai.service';
import { ChatCompletionDto, AgentExecutionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AIController {
  constructor(private readonly aiService: AIService) {}

  /**
   * Send a chat completion request
   */
  @Post('chat/completions')
  @HttpCode(HttpStatus.OK)
  async chatCompletion(
    @CurrentUser() user: { id: string },
    @Body() dto: ChatCompletionDto,
  ) {
    return this.aiService.chatCompletion(user.id, dto);
  }

  /**
   * Execute an AI agent
   */
  @Post('agents/execute')
  @HttpCode(HttpStatus.OK)
  async executeAgent(
    @CurrentUser() user: { id: string },
    @Body() dto: AgentExecutionDto,
  ) {
    return this.aiService.executeAgent(user.id, dto);
  }

  /**
   * Check AI service health (no auth required for internal health checks)
   */
  @Get('health')
  async healthCheck() {
    return this.aiService.healthCheck();
  }
}

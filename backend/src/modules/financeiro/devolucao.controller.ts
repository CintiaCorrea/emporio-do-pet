import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DevolucaoService } from './devolucao.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('financeiro')
@Controller('financeiro')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DevolucaoController {
  constructor(private readonly service: DevolucaoService) {}

  @Get('devolucao/:appointmentId/preview')
  preview(@Param('appointmentId') id: string) {
    return this.service.preview(id);
  }

  @Post('devolucao/:appointmentId')
  devolver(@Param('appointmentId') id: string, @Body() dto: any, @CurrentUser('id') userId: string) {
    return this.service.devolver(id, dto, userId);
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CreditoService } from './credito.service';
import { AdicionarCreditoDto } from './dto/adicionar-credito.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('credito')
@Controller('credito')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CreditoController {
  constructor(private readonly service: CreditoService) {}

  @Get('tutor/:tutorId')
  extrato(@Param('tutorId') tutorId: string) {
    return this.service.extrato(tutorId);
  }

  @Post()
  adicionar(@Body() dto: AdicionarCreditoDto, @CurrentUser('id') userId: string) {
    return this.service.adicionar(dto, userId);
  }
}

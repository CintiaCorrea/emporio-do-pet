import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AniversariosService } from './aniversarios.service';

@ApiTags('aniversarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('aniversarios')
export class AniversariosController {
  constructor(private readonly service: AniversariosService) {}

  @Get()
  porMes(@Query('month') month?: string) {
    const mes = month !== undefined ? Number(month) : undefined;
    return this.service.porMes(mes);
  }
}

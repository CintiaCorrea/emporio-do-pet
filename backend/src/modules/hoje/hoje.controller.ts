import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HojeService } from './hoje.service';

@ApiTags('hoje')
@Controller('hoje')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HojeController {
  constructor(private hojeService: HojeService) {}

  @Get()
  @ApiOperation({ summary: 'Visão do Hoje — todas as seções' })
  get() { return this.hojeService.getHoje(); }
}

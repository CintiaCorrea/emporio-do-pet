import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InboxService } from './inbox.service';

@ApiTags('inbox')
@Controller('inbox')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get('recepcao')
  @ApiOperation({
    summary: 'Inbox Recepção — leads em triagem + interações recentes',
  })
  @ApiQuery({ name: 'period', required: false, enum: ['hoje', 'semana', 'mes', 'tudo'] })
  @ApiQuery({ name: 'tag', required: false })
  getRecepcao(
    @Query('period') period?: 'hoje' | 'semana' | 'mes' | 'tudo',
    @Query('tag') tag?: string,
  ) {
    return this.inbox.getRecepcaoInbox({ period, tag });
  }
}

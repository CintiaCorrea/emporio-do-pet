import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InternalNotesService } from './internal-notes.service';

@ApiTags('internal-notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('internal-notes')
export class InternalNotesController {
  constructor(private readonly service: InternalNotesService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body() body: { toUserId: string; content: string; conversationId?: string },
  ) {
    return this.service.create(user.id, body);
  }

  @Get()
  listForMe(@CurrentUser() user: any) {
    return this.service.listForUser(user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.service.markRead(id);
  }
}

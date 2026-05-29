import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ScheduledMessagesService } from './scheduled-messages.service';

@ApiTags('whatsapp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp/scheduled')
export class ScheduledMessagesController {
  constructor(private readonly service: ScheduledMessagesService) {}

  @Post()
  schedule(@CurrentUser() user: any, @Body() body: { to: string; content: string; scheduledFor: string }) {
    return this.service.schedule(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.listPending(user.id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}

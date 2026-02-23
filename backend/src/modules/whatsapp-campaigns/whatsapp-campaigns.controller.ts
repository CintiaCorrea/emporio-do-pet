import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsAppCampaignsService } from './whatsapp-campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto, AddRecipientsDto } from './dto';
import { WhatsAppCampaignStatus, WhatsAppMessageStatus } from '@prisma/client';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@Controller('whatsapp-campaigns')
@UseGuards(JwtAuthGuard)
export class WhatsAppCampaignsController {
  private readonly logger = new Logger(WhatsAppCampaignsController.name);

  constructor(private readonly campaignsService: WhatsAppCampaignsService) {}

  // Create a new campaign
  @Post()
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateCampaignDto) {
    this.logger.log(`Creating campaign for user ${user.id}`);
    return this.campaignsService.create(user.id, dto);
  }

  // List campaigns
  @Get()
  async findAll(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: WhatsAppCampaignStatus,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignsService.findAll(
      user.id,
      { status, search },
      { page: page || 1, limit: limit || 20 },
    );
  }

  // Get a single campaign
  @Get(':id')
  async findOne(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.findOne(user.id, id);
  }

  // Update a campaign
  @Patch(':id')
  async update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(user.id, id, dto);
  }

  // Delete a campaign
  @Delete(':id')
  async delete(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.delete(user.id, id);
  }

  // Get campaign stats
  @Get(':id/stats')
  async getStats(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.getStats(user.id, id);
  }

  // Get campaign recipients
  @Get(':id/recipients')
  async getRecipients(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Query('status') status?: WhatsAppMessageStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignsService.getRecipients(
      user.id,
      id,
      status,
      { page: page || 1, limit: limit || 50 },
    );
  }

  // Add recipients to campaign
  @Post(':id/recipients')
  async addRecipients(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: AddRecipientsDto,
  ) {
    return this.campaignsService.addRecipients(user.id, id, dto.recipients);
  }

  // Remove recipients from campaign
  @Delete(':id/recipients')
  async removeRecipients(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: { recipientIds: string[] },
  ) {
    return this.campaignsService.removeRecipients(user.id, id, body.recipientIds);
  }

  // Build audience from filter
  @Post(':id/build-audience')
  async buildAudience(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.buildAudience(user.id, id);
  }

  // Start campaign
  @Post(':id/start')
  async start(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.start(user.id, id);
  }

  // Pause campaign
  @Post(':id/pause')
  async pause(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.pause(user.id, id);
  }

  // Resume campaign (same as start)
  @Post(':id/resume')
  async resume(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.campaignsService.start(user.id, id);
  }
}

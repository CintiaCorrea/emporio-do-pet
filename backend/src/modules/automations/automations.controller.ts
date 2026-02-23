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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto, AgentStatus } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAutomationDto) {
    return this.automationsService.create(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationsService.findAll(user.id, {
      category,
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get('categories')
  getCategories() {
    return this.automationsService.getCategories();
  }

  @Get('trigger-types')
  getTriggerTypes() {
    return this.automationsService.getTriggerTypes();
  }

  @Get('step-types')
  getStepTypes() {
    return this.automationsService.getStepTypes();
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.remove(user.id, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: AgentStatus,
  ) {
    return this.automationsService.updateStatus(user.id, id, status);
  }

  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('name') name?: string,
  ) {
    return this.automationsService.duplicate(user.id, id, name);
  }

  @Post(':id/execute')
  execute(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationsService.execute(user.id, id, 'manual');
  }

  @Get(':id/logs')
  getLogs(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.automationsService.getLogs(user.id, id, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id/stats')
  getStats(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationsService.getStats(user.id, id);
  }
}

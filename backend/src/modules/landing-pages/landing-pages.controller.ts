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
import { LandingPagesService } from './landing-pages.service';
import { CreateLandingPageDto, UpdateLandingPageDto, UpdateContentDto } from './dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@Controller('landing-pages')
@UseGuards(JwtAuthGuard)
export class LandingPagesController {
  constructor(private readonly landingPagesService: LandingPagesService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateLandingPageDto) {
    return this.landingPagesService.create(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.landingPagesService.findAll(user.id, {
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.landingPagesService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLandingPageDto,
  ) {
    return this.landingPagesService.update(user.id, id, dto);
  }

  @Patch(':id/content')
  updateContent(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.landingPagesService.updateContent(user.id, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.landingPagesService.updateStatus(user.id, id, status);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.landingPagesService.remove(user.id, id);
  }

  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.landingPagesService.duplicate(user.id, id);
  }

  @Get(':id/export/elementor')
  exportElementor(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.landingPagesService.exportElementor(user.id, id);
  }
}

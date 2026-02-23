import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClinicalDocumentsService } from './clinical-documents.service';
import {
  CreateClinicalDocumentDto,
  GenerateDocumentsDto,
  UpdateClinicalDocumentDto,
  ShareDocumentDto,
} from './dto/create-clinical-document.dto';

@Controller('clinical-documents')
@UseGuards(JwtAuthGuard)
export class ClinicalDocumentsController {
  constructor(private readonly service: ClinicalDocumentsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateClinicalDocumentDto) {
    return this.service.create(req.user.id || req.user.sub, dto);
  }

  @Post('generate')
  generate(@Request() req: any, @Body() dto: GenerateDocumentsDto) {
    return this.service.generateDocuments(req.user.id || req.user.sub, dto);
  }

  @Get('stats')
  getStats(@Request() req: any) {
    return this.service.getStats(req.user.id || req.user.sub);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(req.user.id || req.user.sub, {
      type,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('appointment/:appointmentId')
  findByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.service.findByAppointment(appointmentId);
  }

  @Get('pet/:petId')
  findByPet(
    @Param('petId') petId: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findByPet(petId, {
      type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('tutor/:tutorId')
  findByTutor(
    @Param('tutorId') tutorId: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findByTutor(tutorId, {
      type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/html')
  @Header('Content-Type', 'text/html')
  async getHtml(@Param('id') id: string, @Res() res: Response) {
    const html = await this.service.getDocumentHtml(id);
    res.send(html);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClinicalDocumentDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/share')
  share(@Param('id') id: string, @Request() req: any, @Body() dto: ShareDocumentDto) {
    return this.service.shareDocument(id, req.user.id || req.user.sub, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

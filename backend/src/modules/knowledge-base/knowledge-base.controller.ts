import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from './dto';

@Controller('knowledge-bases')
@UseGuards(JwtAuthGuard)
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateKnowledgeBaseDto,
  ) {
    return this.knowledgeBaseService.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.knowledgeBaseService.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.knowledgeBaseService.findOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeBaseDto,
  ) {
    return this.knowledgeBaseService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.knowledgeBaseService.remove(userId, id);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.knowledgeBaseService.uploadDocument(userId, id, file);
  }

  @Get(':id/documents')
  findDocuments(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.knowledgeBaseService.findDocuments(userId, id);
  }

  @Delete(':id/documents/:docId')
  removeDocument(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.knowledgeBaseService.removeDocument(userId, id, docId);
  }

  @Get(':id/documents/:docId/status')
  getDocumentStatus(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.knowledgeBaseService.getDocumentStatus(userId, id, docId);
  }
}

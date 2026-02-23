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
  UseInterceptors,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import 'multer'; // Express.Multer type augmentation
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConsultationRecordingsService } from './consultation-recordings.service';
import { CreateRecordingDto, UploadTranscriptionDto, AnalyzeTranscriptionDto } from './dto/create-recording.dto';

@Controller('consultation-recordings')
@UseGuards(JwtAuthGuard)
export class ConsultationRecordingsController {
  constructor(private readonly service: ConsultationRecordingsService) {}

  @Post()
  create(@Request() req: any, @Body() dto: CreateRecordingDto) {
    return this.service.create(req.user.id || req.user.sub, dto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(req.user.id || req.user.sub, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get('appointment/:appointmentId')
  findByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.service.findByAppointment(appointmentId);
  }

  @Put(':id/transcription')
  uploadTranscription(@Param('id') id: string, @Body() dto: UploadTranscriptionDto) {
    return this.service.uploadTranscription(id, dto);
  }

  @Post(':id/transcribe')
  transcribeAudio(@Param('id') id: string, @Request() req: any) {
    return this.service.transcribeAudio(id, req.user.id || req.user.sub);
  }

  /**
   * Upload audio file and transcribe directly via Whisper.
   * Audio is NOT stored permanently (LGPD compliance).
   * The audio buffer is sent directly to Whisper and only the transcription text is saved.
   */
  @Post(':id/upload-and-transcribe')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 25 * 1024 * 1024 } }))
  uploadAndTranscribe(
    @Param('id') id: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { language?: string; audioDuration?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo de áudio é obrigatório');
    }
    const audioDuration = body.audioDuration ? parseInt(body.audioDuration, 10) : undefined;
    return this.service.uploadAndTranscribe(
      id,
      req.user.id || req.user.sub,
      file.buffer,
      file.originalname || 'audio.webm',
      audioDuration,
      body.language,
    );
  }

  /**
   * Create recording + upload audio + transcribe in one step.
   * For when there's no existing recording yet.
   */
  @Post('upload-and-transcribe')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 25 * 1024 * 1024 } }))
  createAndTranscribe(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { appointmentId: string; language?: string; audioDuration?: string },
  ) {
    if (!file) {
      throw new BadRequestException('Arquivo de áudio é obrigatório');
    }
    if (!body.appointmentId) {
      throw new BadRequestException('appointmentId é obrigatório');
    }
    const audioDuration = body.audioDuration ? parseInt(body.audioDuration, 10) : undefined;
    return this.service.createAndTranscribe(
      req.user.id || req.user.sub,
      body.appointmentId,
      file.buffer,
      file.originalname || 'audio.webm',
      audioDuration,
      body.language,
    );
  }

  @Post(':id/analyze')
  analyzeTranscription(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: AnalyzeTranscriptionDto,
  ) {
    return this.service.analyzeTranscription(id, req.user.id || req.user.sub, dto);
  }

  @Put(':id/complete')
  completeRecording(@Param('id') id: string) {
    return this.service.completeRecording(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}

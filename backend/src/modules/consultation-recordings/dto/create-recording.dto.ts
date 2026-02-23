import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateRecordingDto {
  @IsString()
  appointmentId: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  audioFileName?: string;

  @IsOptional()
  @IsNumber()
  audioDuration?: number;

  @IsOptional()
  @IsString()
  language?: string;
}

export class UploadTranscriptionDto {
  @IsString()
  transcription: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsNumber()
  audioDuration?: number;
}

export class AnalyzeTranscriptionDto {
  @IsOptional()
  @IsString()
  provider?: 'openai' | 'gemini' | 'deepseek';

  @IsOptional()
  @IsString()
  model?: string;
}

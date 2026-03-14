import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

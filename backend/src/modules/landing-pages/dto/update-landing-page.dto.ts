import { IsString, IsOptional, IsObject, Matches } from 'class-validator';

export class UpdateLandingPageDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug deve conter apenas letras minúsculas, números e hífens',
  })
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  thumbnail?: string;
}

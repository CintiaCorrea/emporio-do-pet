import { IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateContentDto {
  @IsNotEmpty()
  content: any;

  @IsOptional()
  styles?: any;
}

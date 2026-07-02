import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class OcuparBoxDto {
  @ApiProperty({ description: 'ID da internação (appointment) que ocupará o box' })
  @IsString()
  appointmentId: string;
}

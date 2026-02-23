import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

enum Role {
  ADMIN = 'ADMIN',
  VETERINARIAN = 'VETERINARIAN',
  RECEPTIONIST = 'RECEPTIONIST',
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'João Silva' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiPropertyOptional({ example: 'usuario@email.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/<cloud>/image/upload/v123/avatar.jpg',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true }, { message: 'image deve ser uma URL válida' })
  image?: string;

  @ApiPropertyOptional({ example: 'senha123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({
    type: [String],
    description: 'Lista de permissões no formato module:action',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Se o usuário está aprovado para acessar o dashboard',
  })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Se o usuário está bloqueado' })
  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;
}

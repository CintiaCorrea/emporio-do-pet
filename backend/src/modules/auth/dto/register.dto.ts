import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum Role {
  ADMIN = 'ADMIN',
  VETERINARIAN = 'VETERINARIAN',
  RECEPTIONIST = 'RECEPTIONIST',
}

export class RegisterDto {
  @ApiProperty({
    example: 'João Silva',
    description: 'Nome completo do usuário',
  })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres' })
  name: string;

  @ApiProperty({
    example: 'usuario@email.com',
    description: 'Email do usuário',
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    example: 'senha123',
    description: 'Senha do usuário (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;

  @ApiPropertyOptional({
    enum: Role,
    example: 'VETERINARIAN',
    description: 'Perfil do usuário',
  })
  @IsOptional()
  @IsEnum(Role, { message: 'Role inválido' })
  role?: Role;
}

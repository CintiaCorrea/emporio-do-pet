import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'usuario@email.com',
    description: 'Email do usuário',
  })
  // Limpa espaços e maiúsculas ANTES da validação — assim o teclado do celular
  // (que costuma inserir espaço ou capitalizar) nunca barra o login.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({
    example: 'senha123',
    description: 'Senha do usuário (mínimo 6 caracteres)',
  })
  @IsString()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  password: string;
}

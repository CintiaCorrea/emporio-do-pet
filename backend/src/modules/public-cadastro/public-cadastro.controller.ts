import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Cadastro PÚBLICO do cliente (link genérico enviado ao tutor).
// SEM JwtAuthGuard = rota pública. Guarda como ListaItem (lista="cadastro_publico"),
// status PENDENTE — NÃO cria cliente automático; a equipe revisa/aprova depois (Fatia 4B).
@Controller('public')
export class PublicCadastroController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('cadastro')
  async criar(@Body() dto: any) {
    const payload = {
      status: 'PENDENTE',
      receivedAt: new Date().toISOString(),
      tutor: {
        name: (dto?.name || '').toString().trim(),
        cpf: (dto?.cpf || '').toString().trim(),
        birthDate: (dto?.birthDate || '').toString().trim(),
        cep: (dto?.cep || '').toString().trim(),
        address: (dto?.address || '').toString().trim(),
        phone: (dto?.phone || '').toString().trim(),
        email: (dto?.email || '').toString().trim(),
        howFoundUs: (dto?.howFoundUs || '').toString().trim(),
      },
      pet: {
        name: (dto?.petName || '').toString().trim(),
        birthDate: (dto?.petBirthDate || '').toString().trim(),
        breed: (dto?.petBreed || '').toString().trim(),
        age: (dto?.petAge || '').toString().trim(),
        weight: (dto?.petWeight || '').toString().trim(),
      },
    };
    if (!payload.tutor.name || !payload.tutor.phone) {
      return { ok: false, message: 'Nome e telefone são obrigatórios.' };
    }
    const item = await this.prisma.listaItem.create({
      data: { lista: 'cadastro_publico', valor: JSON.stringify(payload) },
    });
    return { ok: true, id: item.id };
  }
}

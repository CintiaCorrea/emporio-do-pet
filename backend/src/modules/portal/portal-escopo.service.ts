/**
 * O COFRE do portal.
 *
 * Toda leitura de dado do CRM feita pelo portal passa por aqui, e sempre com o
 * `tutorId` que veio do guard. Nenhum servico do portal deve consultar `prisma`
 * direto para dado de pet/tutor — se passar por fora do cofre, a garantia de que
 * um tutor nao ve o pet do outro deixa de existir.
 *
 * Nada aqui escreve no CRM. O portal so LE (regra 4 dos modulos).
 */
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { idadeEmAnos } from './codigo.util';

export interface PetDoPortal {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  idadeAnos: number | null;
  nascimento: Date | null;
  foto: string | null;
  alergias: string[];
  /** True quando o tutor logado e o 2o responsavel, nao o titular. */
  segundoResponsavel: boolean;
}

@Injectable()
export class PortalEscopoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Pets que o tutor logado pode ver: os dele e aqueles em que ele consta como
   * 2o responsavel (o CRM permite dois donos no mesmo pet).
   */
  async petsDoTutor(tutorId: string): Promise<PetDoPortal[]> {
    const pets = await this.prisma.pet.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ tutorId }, { secondaryTutorId: tutorId }],
      },
      select: {
        id: true,
        name: true,
        species: true,
        breed: true,
        birthDate: true,
        avatar: true,
        allergies: true,
        tutorId: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return pets.map((p) => ({
      id: p.id,
      nome: p.name,
      especie: String(p.species),
      raca: p.breed,
      idadeAnos: idadeEmAnos(p.birthDate),
      nascimento: p.birthDate,
      foto: p.avatar,
      alergias: p.allergies || [],
      segundoResponsavel: p.tutorId !== tutorId,
    }));
  }

  /**
   * Porteiro de qualquer tela que receba um petId pela URL. Sem isso, trocar o
   * numero do endereco mostraria o pet de outra pessoa.
   */
  async assertPetDoTutor(tutorId: string, petId: string): Promise<void> {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: petId,
        OR: [{ tutorId }, { secondaryTutorId: tutorId }],
      },
      select: { id: true },
    });
    // Mensagem generica de proposito: nao confirma que o pet existe.
    if (!pet) throw new ForbiddenException('Pet nao encontrado para este tutor');
  }

  /** Ficha basica do tutor logado. */
  async dadosDoTutor(tutorId: string) {
    const t = await this.prisma.tutor.findUnique({
      where: { id: tutorId },
      select: {
        id: true,
        name: true,
        email: true,
        cep: true,
        address: true,
        addressNumber: true,
        complement: true,
        neighborhood: true,
        city: true,
        state: true,
        contacts: {
          where: { isWhatsApp: true },
          select: { number: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' },
          take: 1,
        },
      },
    });
    if (!t) throw new ForbiddenException('Cadastro nao encontrado');

    return {
      id: t.id,
      nome: t.name,
      primeiroNome: (t.name || '').trim().split(/\s+/)[0] || '',
      email: t.email,
      telefone: t.contacts[0]?.number || null,
      endereco: {
        cep: t.cep,
        rua: t.address,
        numero: t.addressNumber,
        complemento: t.complement,
        bairro: t.neighborhood,
        cidade: t.city,
        estado: t.state,
      },
    };
  }
}

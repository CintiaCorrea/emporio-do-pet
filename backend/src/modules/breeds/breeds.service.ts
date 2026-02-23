import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBreedDto } from './dto/create-breed.dto';

type PetSpecies = CreateBreedDto['species'];

const DEFAULT_BREEDS: Record<PetSpecies, string[]> = {
  CANINE: ['SRD', 'Labrador', 'Poodle', 'Dachshund Miniatura'],
  FELINE: ['SRD', 'Siamês', 'Persa', 'Maine Coon'],
  BIRD: ['Canário', 'Calopsita', 'Periquito', 'Papagaio'],
  RODENT: ['Hamster', 'Porquinho-da-Índia', 'Coelho', 'Chinchila'],
  REPTILE: ['Tartaruga', 'Iguana', 'Gecko', 'Jiboia'],
  OTHER: [],
};

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

function toNameKey(name: string) {
  return normalizeName(name).toLowerCase();
}

function isPetSpecies(value: string): value is PetSpecies {
  return [
    'CANINE',
    'FELINE',
    'BIRD',
    'RODENT',
    'REPTILE',
    'OTHER',
  ].includes(value);
}

@Injectable()
export class BreedsService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Seed idempotente para garantir que sempre exista uma base de raças por espécie.
    // (não depende de localStorage e pode ser expandido depois com seeds dedicados)
    const tasks: Promise<any>[] = [];

    (Object.keys(DEFAULT_BREEDS) as PetSpecies[]).forEach((species) => {
      DEFAULT_BREEDS[species].forEach((raw) => {
        const name = normalizeName(raw);
        const nameKey = toNameKey(name);
        tasks.push(
          this.prisma.petBreed.upsert({
            where: { species_nameKey: { species, nameKey } },
            update: { name },
            create: { species, name, nameKey },
          }),
        );
      });
    });

    try {
      await Promise.all(tasks);
    } catch {
      // Não bloqueia o boot caso o seed falhe (ex.: migração ainda não aplicada).
    }
  }

  async list(species?: string) {
    if (species && !isPetSpecies(species)) {
      throw new BadRequestException('Espécie inválida');
    }

    return this.prisma.petBreed.findMany({
      where: species ? { species: species as PetSpecies } : undefined,
      orderBy: { name: 'asc' },
      select: { id: true, species: true, name: true, createdAt: true, updatedAt: true },
    });
  }

  async create(dto: CreateBreedDto) {
    const name = normalizeName(dto.name);
    if (!name) throw new BadRequestException('Nome da raça é obrigatório');

    const nameKey = toNameKey(name);

    return this.prisma.petBreed.upsert({
      where: {
        species_nameKey: {
          species: dto.species,
          nameKey,
        },
      },
      update: {
        name, // mantém o "display name" mais recente
      },
      create: {
        species: dto.species,
        name,
        nameKey,
      },
      select: { id: true, species: true, name: true, createdAt: true, updatedAt: true },
    });
  }
}


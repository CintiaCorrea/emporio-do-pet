/**
 * Cadastro de pet novo pelo tutor (aprovado pela Cintia em 29/07).
 *
 * Entra DIRETO na mesma tabela de pets do CRM — não é cadastro paralelo — com
 * duas proteções:
 *
 * 1. **Anti-duplicidade**: se o tutor já tem um pet de nome parecido, o portal
 *    devolve a lista e espera ele confirmar que é outro bicho. Sem isso o
 *    histórico clínico racha em dois "Thor" e ninguém entende mais nada.
 * 2. **Rastro**: o pet nasce etiquetado como cadastrado pelo tutor e a criação
 *    fica em `ptl_alteracoes`, junto com as edições de ficha.
 *
 * O tutor preenche o que ele sabe. Peso, microchip, castração, temperamento e
 * notas clínicas são da clínica — nem aparecem aqui.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { idadeEmAnos } from './codigo.util';

const ESPECIES = ['CANINE', 'FELINE', 'BIRD', 'RODENT', 'REPTILE', 'OTHER'] as const;
const SEXOS = ['MALE', 'FEMALE', 'OTHER'] as const;

/** Etiqueta que a equipe vê no pet — é o "selo" de origem. */
export const ETIQUETA_PORTAL = 'Cadastrado pelo tutor';

export interface NovoPet {
  nome?: string;
  especie?: string;
  raca?: string | null;
  nascimento?: string | null;
  sexo?: string | null;
  alergias?: unknown;
  /** true = "já vi a lista, é outro pet mesmo". */
  confirmado?: boolean;
}

/** "Thór " -> "thor" — para comparar nome sem tropeçar em acento e maiúscula. */
function chaveNome(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function lerData(v: unknown): Date | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  let d: Date | null = null;
  if (iso) d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  if (br) d = new Date(Date.UTC(+br[3], +br[2] - 1, +br[1]));
  if (!d || Number.isNaN(d.getTime()) || d.getTime() > Date.now()) return null;
  return d;
}

function lerAlergias(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v ?? '').trim();
  if (!s) return [];
  return s
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

@Injectable()
export class PortalPetsService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(tutorId: string, dados: NovoPet, ip?: string) {
    const nome = String(dados?.nome ?? '').trim();
    if (nome.length < 2) throw new BadRequestException('Qual é o nome do seu pet?');

    const especie = String(dados?.especie ?? '').toUpperCase();
    if (!ESPECIES.includes(especie as (typeof ESPECIES)[number])) {
      throw new BadRequestException('Escolha a espécie do seu pet.');
    }

    const sexoBruto = String(dados?.sexo ?? '').toUpperCase();
    const sexo = SEXOS.includes(sexoBruto as (typeof SEXOS)[number]) ? sexoBruto : null;

    // --- anti-duplicidade ----------------------------------------------------
    if (!dados?.confirmado) {
      const dele = await this.prisma.pet.findMany({
        where: { status: 'ACTIVE', OR: [{ tutorId }, { secondaryTutorId: tutorId }] },
        select: { id: true, name: true, species: true, breed: true, birthDate: true },
      });
      const chave = chaveNome(nome);
      const parecidos = dele.filter((p) => {
        const k = chaveNome(p.name);
        return k === chave || k.startsWith(chave) || chave.startsWith(k);
      });

      if (parecidos.length) {
        return {
          criado: false,
          precisaConfirmar: true,
          parecidos: parecidos.map((p) => ({
            id: p.id,
            nome: p.name,
            especie: String(p.species),
            raca: p.breed,
            idadeAnos: idadeEmAnos(p.birthDate),
          })),
        };
      }
    }

    const pet = await this.prisma.pet.create({
      data: {
        tutorId,
        name: nome,
        species: especie as any,
        breed: String(dados?.raca ?? '').trim() || null,
        birthDate: lerData(dados?.nascimento),
        gender: (sexo as any) || null,
        allergies: lerAlergias(dados?.alergias),
        status: 'ACTIVE',
        // Selo para a equipe conferir na primeira consulta.
        tags: [ETIQUETA_PORTAL],
      },
      select: { id: true, name: true, species: true, breed: true, birthDate: true },
    });

    await this.prisma.portalAlteracao
      .create({
        data: {
          tutorId,
          entidade: 'PET',
          entidadeId: pet.id,
          entidadeNome: pet.name,
          campo: 'Cadastro do pet',
          valorAnterior: null,
          valorNovo: `${pet.name} (${pet.species}${pet.breed ? ` · ${pet.breed}` : ''})`,
          ip,
        },
      })
      .catch(() => undefined);

    return {
      criado: true,
      pet: {
        id: pet.id,
        nome: pet.name,
        especie: String(pet.species),
        raca: pet.breed,
        idadeAnos: idadeEmAnos(pet.birthDate),
      },
    };
  }
}

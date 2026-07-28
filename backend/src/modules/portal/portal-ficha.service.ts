/**
 * Tela "Minha ficha" — a unica da Fatia 2 em que o tutor ESCREVE.
 *
 * Decisao da Cintia (28/07): o que ele edita entra DIRETO no cadastro, sem fila
 * de aprovacao — mas TUDO fica no historico (`ptl_alteracoes`), inclusive o que
 * ele apagar. Se um tutor limpar uma alergia que a veterinaria registrou, o valor
 * antigo continua guardado com data e hora.
 *
 * Duas travas que valem a leitura:
 *
 * 1. LISTA FECHADA DE CAMPOS. So os campos abaixo podem ser gravados. Mandar
 *    qualquer outra coisa no corpo da requisicao nao tem efeito — nao existe
 *    caminho do portal para `status`, `rankingAbc`, `observations` clinicas etc.
 * 2. O pet e conferido no cofre antes de qualquer escrita: nao adianta mandar o
 *    id do pet de outra pessoa.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PortalEscopoService } from './portal-escopo.service';

/** campo do portal -> coluna do CRM + nome legivel para o historico */
const CAMPOS_TUTOR = {
  nome: { coluna: 'name', rotulo: 'Nome' },
  email: { coluna: 'email', rotulo: 'E-mail' },
  cep: { coluna: 'cep', rotulo: 'CEP' },
  rua: { coluna: 'address', rotulo: 'Rua' },
  numero: { coluna: 'addressNumber', rotulo: 'Número' },
  complemento: { coluna: 'complement', rotulo: 'Complemento' },
  bairro: { coluna: 'neighborhood', rotulo: 'Bairro' },
  cidade: { coluna: 'city', rotulo: 'Cidade' },
  estado: { coluna: 'state', rotulo: 'Estado' },
} as const;

const CAMPOS_PET = {
  raca: { coluna: 'breed', rotulo: 'Raça' },
  nascimento: { coluna: 'birthDate', rotulo: 'Nascimento' },
  alergias: { coluna: 'allergies', rotulo: 'Alergias' },
} as const;

export interface FichaPayload {
  tutor?: Partial<Record<keyof typeof CAMPOS_TUTOR, string | null>>;
  pets?: Array<{ id: string } & Partial<Record<keyof typeof CAMPOS_PET, unknown>>>;
}

interface Alteracao {
  tutorId: string;
  entidade: string;
  entidadeId: string;
  entidadeNome: string | null;
  campo: string;
  valorAnterior: string | null;
  valorNovo: string | null;
  ip?: string;
}

function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Mostra a data do jeito que a pessoa escreveu: 14/03/2020. */
function dataBr(d?: Date | null): string | null {
  if (!d) return null;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`;
}

/** Aceita 2020-03-14 (do seletor de data) e 14/03/2020 (digitado). */
function lerData(v: unknown): Date | null | undefined {
  const s = texto(v);
  if (s === null) return null; // o tutor apagou a data
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  let d: Date | null = null;
  if (iso) d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
  if (br) d = new Date(Date.UTC(+br[3], +br[2] - 1, +br[1]));
  if (!d || Number.isNaN(d.getTime())) return undefined; // invalido: ignora
  if (d.getTime() > Date.now()) return undefined; // nascimento no futuro nao existe
  return d;
}

function lerAlergias(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = texto(v);
  if (!s) return [];
  // "Frango, poeira" e "Frango; poeira" viram lista.
  return s
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Injectable()
export class PortalFichaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escopo: PortalEscopoService,
  ) {}

  /** O que a tela mostra ao abrir. */
  async ficha(tutorId: string) {
    const [tutor, pets] = await Promise.all([
      this.escopo.dadosDoTutor(tutorId),
      this.escopo.petsDoTutor(tutorId),
    ]);

    return {
      tutor,
      pets: pets.map((p) => ({
        id: p.id,
        nome: p.nome,
        especie: p.especie,
        raca: p.raca,
        nascimento: p.nascimento ? new Date(p.nascimento).toISOString().slice(0, 10) : null,
        nascimentoBr: dataBr(p.nascimento),
        alergias: p.alergias,
        segundoResponsavel: p.segundoResponsavel,
      })),
    };
  }

  async salvar(tutorId: string, corpo: FichaPayload, ip?: string) {
    const alteracoes: Alteracao[] = [];

    await this.salvarTutor(tutorId, corpo?.tutor, alteracoes);

    for (const pet of corpo?.pets || []) {
      if (!pet?.id) continue;
      await this.escopo.assertPetDoTutor(tutorId, pet.id); // porteiro
      await this.salvarPet(tutorId, pet, alteracoes);
    }

    if (alteracoes.length) {
      await this.prisma.portalAlteracao.createMany({
        data: alteracoes.map((a) => ({ ...a, ip })),
      });
    }

    return { salvo: true, alteracoes: alteracoes.length };
  }

  // ---------------------------------------------------------------------------
  private async salvarTutor(
    tutorId: string,
    entrada: FichaPayload['tutor'],
    alteracoes: Alteracao[],
  ) {
    if (!entrada) return;

    const atual = await this.prisma.tutor.findUnique({ where: { id: tutorId } });
    if (!atual) throw new BadRequestException('Cadastro não encontrado');

    const dados: Record<string, string | null> = {};

    for (const [campo, def] of Object.entries(CAMPOS_TUTOR)) {
      if (!(campo in entrada)) continue; // campo nao veio: nao mexe
      let novo = texto((entrada as Record<string, unknown>)[campo]);

      if (campo === 'nome' && !novo) continue; // ninguem fica sem nome
      if (campo === 'email' && novo && !EMAIL.test(novo)) {
        throw new BadRequestException('E-mail inválido');
      }
      if (campo === 'estado' && novo) novo = novo.toUpperCase().slice(0, 2);
      if (campo === 'cep' && novo) novo = novo.replace(/\D/g, '').slice(0, 8) || null;

      const anterior = texto((atual as Record<string, unknown>)[def.coluna]);
      if (anterior === novo) continue;

      dados[def.coluna] = novo;
      alteracoes.push({
        tutorId,
        entidade: 'TUTOR',
        entidadeId: tutorId,
        entidadeNome: atual.name,
        campo: def.rotulo,
        valorAnterior: anterior,
        valorNovo: novo,
      });
    }

    if (!Object.keys(dados).length) return;

    try {
      await this.prisma.tutor.update({ where: { id: tutorId }, data: dados });
    } catch (e) {
      // E-mail é único no cadastro: avisar em vez de estourar erro tecnico.
      if ((e as { code?: string }).code === 'P2002') {
        throw new BadRequestException('Esse e-mail já está em outro cadastro. Fale com a recepção.');
      }
      throw e;
    }
  }

  private async salvarPet(
    tutorId: string,
    entrada: { id: string } & Record<string, unknown>,
    alteracoes: Alteracao[],
  ) {
    const atual = await this.prisma.pet.findUnique({ where: { id: entrada.id } });
    if (!atual) return;

    const dados: Record<string, unknown> = {};

    if ('raca' in entrada) {
      const novo = texto(entrada.raca);
      const anterior = texto(atual.breed);
      if (novo !== anterior) {
        dados[CAMPOS_PET.raca.coluna] = novo;
        alteracoes.push({
          tutorId,
          entidade: 'PET',
          entidadeId: atual.id,
          entidadeNome: atual.name,
          campo: CAMPOS_PET.raca.rotulo,
          valorAnterior: anterior,
          valorNovo: novo,
        });
      }
    }

    if ('nascimento' in entrada) {
      const nova = lerData(entrada.nascimento);
      if (nova !== undefined) {
        const anterior = dataBr(atual.birthDate);
        const novo = dataBr(nova);
        if (anterior !== novo) {
          dados[CAMPOS_PET.nascimento.coluna] = nova;
          alteracoes.push({
            tutorId,
            entidade: 'PET',
            entidadeId: atual.id,
            entidadeNome: atual.name,
            campo: CAMPOS_PET.nascimento.rotulo,
            valorAnterior: anterior,
            valorNovo: novo,
          });
        }
      }
    }

    if ('alergias' in entrada) {
      const novas = lerAlergias(entrada.alergias);
      const anteriores = atual.allergies || [];
      const mudou =
        novas.length !== anteriores.length || novas.some((x, i) => x !== anteriores[i]);
      if (mudou) {
        dados[CAMPOS_PET.alergias.coluna] = novas;
        alteracoes.push({
          tutorId,
          entidade: 'PET',
          entidadeId: atual.id,
          entidadeNome: atual.name,
          campo: CAMPOS_PET.alergias.rotulo,
          // Guarda a lista inteira dos dois lados: e o caso que a Cintia
          // levantou — dá para ver exatamente o que sumiu.
          valorAnterior: anteriores.length ? anteriores.join(', ') : null,
          valorNovo: novas.length ? novas.join(', ') : null,
        });
      }
    }

    if (Object.keys(dados).length) {
      await this.prisma.pet.update({ where: { id: atual.id }, data: dados });
    }
  }

  /** Historico de um tutor — base da tela que a equipe vai querer depois. */
  async historico(tutorId: string, limite = 50) {
    return this.prisma.portalAlteracao.findMany({
      where: { tutorId },
      orderBy: { createdAt: 'desc' },
      take: limite,
    });
  }
}

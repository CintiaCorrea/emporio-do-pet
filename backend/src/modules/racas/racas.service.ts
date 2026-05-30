import { Injectable, NotFoundException } from '@nestjs/common';
import { EspecieRaca } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRacaDto, UpdateRacaDto } from './dto/raca.dto';

@Injectable()
export class RacasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(especie?: EspecieRaca, includeInactive = false) {
    return this.prisma.raca.findMany({
      where: {
        ...(especie ? { especie } : {}),
        ...(includeInactive ? {} : { ativo: true }),
      },
      orderBy: [{ especie: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  async create(dto: CreateRacaDto) {
    return this.prisma.raca.create({ data: dto });
  }

  async update(id: string, dto: UpdateRacaDto) {
    const exists = await this.prisma.raca.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Raça não encontrada');
    return this.prisma.raca.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const exists = await this.prisma.raca.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Raça não encontrada');
    return this.prisma.raca.delete({ where: { id } });
  }

  async seedPacoteInicial() {
    const count = await this.prisma.raca.count();
    if (count > 0) {
      return { ok: false, skipped: true, reason: 'Já existem raças cadastradas.' };
    }

    const caninas = [
      'Vira-Lata (SRD)', 'Akita', 'American Bully', 'Basset Hound', 'Beagle',
      'Boiadeiro Australiano', 'Border Collie', 'Boxer', 'Buldogue Francês',
      'Buldogue Inglês', 'Bull Terrier', 'Chihuahua', 'Chow Chow', 'Cocker Spaniel Inglês',
      'Dachshund (Salsicha)', 'Dálmata', 'Doberman', 'Dogo Argentino', 'Dogue Alemão',
      'Fila Brasileiro', 'Golden Retriever', 'Husky Siberiano', 'Jack Russell Terrier',
      'Labrador Retriever', 'Lhasa Apso', 'Maltês', 'Mastim Tibetano', 'Pastor Alemão',
      'Pastor Australiano', 'Pastor de Shetland', 'Pequinês', 'Pinscher Miniatura',
      'Pit Bull', 'Poodle Toy', 'Poodle Standard', 'Pug', 'Rhodesian Ridgeback',
      'Rottweiler', 'Schnauzer Miniatura', 'Schnauzer Standard', 'Shar Pei', 'Shiba Inu',
      'Shih Tzu', 'Spitz Alemão (Lulu da Pomerânia)', 'Springer Spaniel', 'Staffordshire Bull Terrier',
      'Vira-Lata Caramelo', 'Weimaraner', 'West Highland White Terrier (Westie)', 'Yorkshire Terrier',
    ];

    const felinas = [
      'Vira-Lata (SRD)', 'Abissínio', 'American Shorthair', 'Angorá Turco', 'Bengal',
      'Birmanês', 'Bombaim', 'British Shorthair', 'Burmês', 'Chartreux',
      'Cornish Rex', 'Devon Rex', 'Egípcio Mau', 'Exotic Shorthair', 'Himalaio',
      'Korat', 'LaPerm', 'Maine Coon', 'Manx', 'Munchkin',
      'Norueguês da Floresta', 'Ocicat', 'Oriental', 'Persa', 'Ragdoll',
      'Russian Blue', 'Sagrado da Birmânia', 'Savannah', 'Scottish Fold', 'Selkirk Rex',
      'Siamês', 'Siberiano', 'Singapura', 'Snowshoe', 'Somali',
      'Sphynx',
    ];

    const outras = [
      'Coelho — Mini Lop', 'Coelho — Holland Lop', 'Coelho — Rex', 'Coelho — Angorá', 'Coelho — Vira-Lata',
      'Hamster Sírio', 'Hamster Anão Russo', 'Hamster Roborowski', 'Porquinho da Índia',
      'Chinchila', 'Esquilo-da-Mongólia', 'Furão',
      'Calopsita', 'Periquito Australiano', 'Canário', 'Agapornis',
      'Tartaruga Tigre D Água', 'Jabuti Piranga', 'Iguana Verde', 'Bracinhos',
    ];

    let idx = 0;
    const data: any[] = [];
    caninas.forEach((n) => data.push({ nome: n, especie: 'CAO', ordem: idx++ }));
    idx = 0;
    felinas.forEach((n) => data.push({ nome: n, especie: 'GATO', ordem: idx++ }));
    idx = 0;
    outras.forEach((n) => data.push({ nome: n, especie: 'OUTRO', ordem: idx++ }));

    await this.prisma.raca.createMany({ data, skipDuplicates: true });

    return {
      ok: true,
      created: { caninas: caninas.length, felinas: felinas.length, outras: outras.length, total: data.length },
    };
  }

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    const ESP_MAP: Record<string, string> = {
      'cao': 'CAO', 'cão': 'CAO', 'cachorro': 'CAO',
      'gato': 'GATO', 'felino': 'GATO',
      'outro': 'OUTRO',
    };
    for (const r of rows) {
      const nome = r.nome;
      if (!nome) { ignorados++; continue; }
      const espKey = (r.especie || 'outro').toString().toLowerCase().trim();
      const especie = (ESP_MAP[espKey] || 'OUTRO') as any;
      const data: any = { nome, especie, ordem: r.ordem ?? 0, ativo: r.ativo !== undefined ? r.ativo : true };
      let existente = await this.prisma.raca.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' }, especie } });
      if (existente) {
        if (!upsert) { ignorados++; continue; }
        await this.prisma.raca.update({ where: { id: existente.id }, data });
        atualizados++;
      } else {
        await this.prisma.raca.create({ data });
        criados++;
      }
    }
    return { criados, atualizados, ignorados };
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFornecedorDto, UpdateFornecedorDto } from './dto/fornecedor.dto';
import { CreateExameDto, UpdateExameDto } from './dto/exame.dto';

@Injectable()
export class FornecedoresService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Fornecedores =====
  async listFornecedores(includeInactive = false) {
    return this.prisma.fornecedor.findMany({
      where: includeInactive ? {} : { ativo: true },
      orderBy: [{ ativo: 'desc' }, { tipo: 'asc' }, { nome: 'asc' }],
      include: { _count: { select: { exames: true } } },
    });
  }
  async createFornecedor(dto: CreateFornecedorDto) {
    return this.prisma.fornecedor.create({ data: dto });
  }
  async updateFornecedor(id: string, dto: UpdateFornecedorDto) {
    const exists = await this.prisma.fornecedor.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Fornecedor não encontrado');
    return this.prisma.fornecedor.update({ where: { id }, data: dto });
  }
  async removeFornecedor(id: string) {
    const exists = await this.prisma.fornecedor.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Fornecedor não encontrado');
    return this.prisma.fornecedor.delete({ where: { id } });
  }

  // ===== Exames =====
  async listExames(includeInactive = false, fornecedorId?: string) {
    return this.prisma.catalogoExame.findMany({
      where: {
        ...(includeInactive ? {} : { ativo: true }),
        ...(fornecedorId ? { fornecedorId } : {}),
      },
      include: { fornecedor: { select: { id: true, nome: true, tipo: true } } },
      orderBy: [{ ativo: 'desc' }, { categoria: 'asc' }, { nome: 'asc' }],
    });
  }
  async createExame(dto: CreateExameDto) {
    return this.prisma.catalogoExame.create({
      data: dto,
      include: { fornecedor: { select: { id: true, nome: true, tipo: true } } },
    });
  }
  async updateExame(id: string, dto: UpdateExameDto) {
    const exists = await this.prisma.catalogoExame.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Exame não encontrado');
    return this.prisma.catalogoExame.update({
      where: { id }, data: dto,
      include: { fornecedor: { select: { id: true, nome: true, tipo: true } } },
    });
  }
  async removeExame(id: string) {
    const exists = await this.prisma.catalogoExame.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Exame não encontrado');
    return this.prisma.catalogoExame.delete({ where: { id } });
  }

  // ===== Seed Pacote Inicial =====
  async seedPacoteInicial() {
    const count = await this.prisma.fornecedor.count();
    if (count > 0) return { skipped: true, message: 'Já existem fornecedores cadastrados', total: count };

    // Fornecedores padrão (laboratórios e parceiros comuns em medicina veterinária integrativa)
    const fornecedoresSeed = [
      { nome: 'IDEXX Laboratórios', tipo: 'LABORATORIO' as const, especialidade: 'Análises clínicas completas', telefone: '0800-7741-039', modeloPagamento: 'LOTE_MENSAL' as const, diaFechamentoLote: 30, observacoes: 'Hematologia, bioquímica, citologia, endocrinologia. Coleta domiciliar disponível.' },
      { nome: 'Tecsa Laboratório Veterinário', tipo: 'LABORATORIO' as const, especialidade: 'Exames veterinários especializados', telefone: '(31) 3334-3232', modeloPagamento: 'LOTE_MENSAL' as const, diaFechamentoLote: 30, observacoes: 'Painel endócrino, oncologia, genética molecular.' },
      { nome: 'VetSmart Diagnóstico', tipo: 'LABORATORIO' as const, especialidade: 'Imagem e patologia clínica', telefone: '(85) 3261-0000', modeloPagamento: 'DIRETO_CLIENTE' as const, observacoes: 'Ultrassom domiciliar, RX, ECG.' },
      { nome: 'Dr. Ricardo Imagem Veterinária', tipo: 'PROFISSIONAL' as const, especialidade: 'Ultrassonografia e ecocardiograma', telefone: '(85) 99999-0001', modeloPagamento: 'REPASSE_VIA_CLINICA' as const, comissaoTipo: 'PERCENTUAL' as const, comissaoValor: 30, observacoes: 'Exames de imagem in loco. Repasse com comissão de 30%.' },
      { nome: 'Histo Vet Patologia', tipo: 'LABORATORIO' as const, especialidade: 'Histopatologia e citologia', telefone: '(11) 3115-4022', modeloPagamento: 'LOTE_MENSAL' as const, diaFechamentoLote: 25, observacoes: 'Análise de biópsias, citologias aspirativas.' },
    ];

    const fornecedoresCriados: Record<string, string> = {};
    for (const f of fornecedoresSeed) {
      const created = await this.prisma.fornecedor.create({ data: f });
      fornecedoresCriados[f.nome] = created.id;
    }

    // Exames vinculados (cada fornecedor com seu portfolio)
    const examesSeed = [
      // IDEXX
      { fornecedor: 'IDEXX Laboratórios', codigo: 'HEMO-COMP', nome: 'Hemograma Completo', categoria: 'HEMATOLOGIA' as const, valorFornecedor: 35, valorClienteSugerido: 90, tempoResultadoDias: 1 },
      { fornecedor: 'IDEXX Laboratórios', codigo: 'BIOQ-RENAL', nome: 'Painel Renal (Ureia + Creatinina + SDMA)', categoria: 'BIOQUIMICA' as const, valorFornecedor: 60, valorClienteSugerido: 150, tempoResultadoDias: 1 },
      { fornecedor: 'IDEXX Laboratórios', codigo: 'BIOQ-HEP', nome: 'Painel Hepático (ALT + AST + FA + GGT + Bilirrubinas)', categoria: 'BIOQUIMICA' as const, valorFornecedor: 90, valorClienteSugerido: 220, tempoResultadoDias: 1 },
      { fornecedor: 'IDEXX Laboratórios', codigo: 'URINA-T1', nome: 'Urinálise Tipo I + Densidade', categoria: 'BIOQUIMICA' as const, valorFornecedor: 25, valorClienteSugerido: 70, tempoResultadoDias: 1 },
      // Tecsa
      { fornecedor: 'Tecsa Laboratório Veterinário', codigo: 'T4-LIVRE', nome: 'T4 Livre', categoria: 'ENDOCRINOLOGIA' as const, valorFornecedor: 80, valorClienteSugerido: 180, tempoResultadoDias: 3 },
      { fornecedor: 'Tecsa Laboratório Veterinário', codigo: 'CORTISOL', nome: 'Cortisol Basal', categoria: 'ENDOCRINOLOGIA' as const, valorFornecedor: 95, valorClienteSugerido: 210, tempoResultadoDias: 3 },
      { fornecedor: 'Tecsa Laboratório Veterinário', codigo: 'PROG', nome: 'Progesterona Sérica', categoria: 'ENDOCRINOLOGIA' as const, valorFornecedor: 75, valorClienteSugerido: 170, tempoResultadoDias: 2 },
      // VetSmart
      { fornecedor: 'VetSmart Diagnóstico', codigo: 'US-ABD', nome: 'Ultrassom Abdominal Completo', categoria: 'IMAGEM' as const, valorFornecedor: 0, valorClienteSugerido: 280, tempoResultadoDias: 1, observacoes: 'Pago direto pelo tutor ao parceiro.' },
      { fornecedor: 'VetSmart Diagnóstico', codigo: 'RX-TX', nome: 'RX Tórax 2 Projeções', categoria: 'IMAGEM' as const, valorFornecedor: 0, valorClienteSugerido: 220, tempoResultadoDias: 1 },
      // Dr. Ricardo (repasse com comissão)
      { fornecedor: 'Dr. Ricardo Imagem Veterinária', codigo: 'ECO-CARD', nome: 'Ecocardiograma Doppler', categoria: 'IMAGEM' as const, valorFornecedor: 250, valorClienteSugerido: 450, tempoResultadoDias: 1 },
      { fornecedor: 'Dr. Ricardo Imagem Veterinária', codigo: 'US-DOM', nome: 'Ultrassom Domiciliar', categoria: 'IMAGEM' as const, valorFornecedor: 200, valorClienteSugerido: 380, tempoResultadoDias: 1 },
      // Histo Vet
      { fornecedor: 'Histo Vet Patologia', codigo: 'CITO-ASP', nome: 'Citologia Aspirativa por Agulha Fina', categoria: 'CITOLOGIA' as const, valorFornecedor: 70, valorClienteSugerido: 180, tempoResultadoDias: 5 },
      { fornecedor: 'Histo Vet Patologia', codigo: 'HISTO-BIOP', nome: 'Histopatológico de Biópsia', categoria: 'HISTOPATOLOGIA' as const, valorFornecedor: 180, valorClienteSugerido: 380, tempoResultadoDias: 7 },
    ];

    let examesCount = 0;
    for (const e of examesSeed) {
      const fornecedorId = fornecedoresCriados[e.fornecedor];
      if (!fornecedorId) continue;
      const { fornecedor, ...data } = e;
      await this.prisma.catalogoExame.create({ data: { ...data, fornecedorId } });
      examesCount++;
    }

    return {
      skipped: false,
      fornecedoresCriados: Object.keys(fornecedoresCriados).length,
      examesCriados: examesCount,
    };
  }
}
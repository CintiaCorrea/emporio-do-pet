import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './dto/category.dto';
import { CreateServicoDto, UpdateServicoDto } from './dto/servico.dto';

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== Categorias =====
  async listCategories(includeInactive = false) {
    return this.prisma.serviceCategory.findMany({
      where: includeInactive ? {} : { ativo: true },
      orderBy: { nome: 'asc' },
      include: { _count: { select: { servicos: true } } },
    });
  }
  async createCategory(dto: CreateServiceCategoryDto) {
    return this.prisma.serviceCategory.create({ data: dto });
  }
  async updateCategory(id: string, dto: UpdateServiceCategoryDto) {
    const exists = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.serviceCategory.update({ where: { id }, data: dto });
  }
  async removeCategory(id: string) {
    const exists = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.serviceCategory.delete({ where: { id } });
  }

  // ===== Serviços =====
  async listServicos(includeInactive = false, categoryId?: string) {
    return this.prisma.servico.findMany({
      where: {
        ...(includeInactive ? {} : { ativo: true }),
        ...(categoryId ? { categoryId } : {}),
      },
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
      include: { category: { select: { id: true, nome: true } } },
    });
  }
  // Espelha o serviço no catálogo unificado (Product, type SERVICE, mesmo id) — Fase 3 da unificação.
  private async espelharProduto(svc: any) {
    if (!svc?.id) return;
    const data = {
      name: svc.nome, price: svc.valorPadrao ?? 0,
      categoryId: svc.categoryId ?? null, custoPadrao: svc.custoPadrao ?? null,
      comissaoBaseDefault: svc.comissaoBaseDefault ?? undefined, ativo: svc.ativo ?? true,
    };
    try {
      await this.prisma.product.upsert({
        where: { id: svc.id },
        create: { id: svc.id, type: 'SERVICE' as any, stock: 0, ...data },
        update: data,
      });
    } catch { /* o espelho não pode quebrar o CRUD de serviço */ }
  }
  async createServico(dto: CreateServicoDto) {
    const svc = await this.prisma.servico.create({
      data: dto,
      include: { category: { select: { id: true, nome: true } } },
    });
    await this.espelharProduto(svc);
    return svc;
  }
  async updateServico(id: string, dto: UpdateServicoDto) {
    const exists = await this.prisma.servico.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Serviço não encontrado');
    const svc = await this.prisma.servico.update({
      where: { id }, data: dto,
      include: { category: { select: { id: true, nome: true } } },
    });
    await this.espelharProduto(svc);
    return svc;
  }
  async removeServico(id: string) {
    const exists = await this.prisma.servico.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Serviço não encontrado');
    const res = await this.prisma.servico.delete({ where: { id } });
    await this.prisma.product.deleteMany({ where: { id } }).catch(() => {});
    return res;
  }

  // ============================================
  // Pacote inicial (seed) — popula clínica veterinária do zero
  // ============================================
  async seedPacoteInicial() {
    const [catCount, svCount] = await Promise.all([
      this.prisma.serviceCategory.count(),
      this.prisma.servico.count(),
    ]);
    if (catCount > 0 || svCount > 0) {
      return { ok: false, skipped: true, reason: 'Já existem categorias ou serviços cadastrados.' };
    }

    const cats = [
      { nome: 'Consultas', comissaoBasePadrao: 'VALOR_CHEIO' as const },
      { nome: 'Vacinas', comissaoBasePadrao: 'MARGEM' as const },
      { nome: 'Medicamentos', comissaoBasePadrao: 'MARGEM' as const },
      { nome: 'Produtos', comissaoBasePadrao: 'MARGEM' as const },
      { nome: 'Cirurgias', comissaoBasePadrao: 'VALOR_CHEIO' as const },
      { nome: 'Estética / Banho e Tosa', comissaoBasePadrao: 'VALOR_CHEIO' as const },
      { nome: 'Internação', comissaoBasePadrao: 'VALOR_CHEIO' as const },
      { nome: 'Exames', comissaoBasePadrao: 'VALOR_CHEIO' as const },
      { nome: 'Fisioterapia e Reabilitação', comissaoBasePadrao: 'VALOR_CHEIO' as const },
      { nome: 'Acupuntura', comissaoBasePadrao: 'VALOR_CHEIO' as const },
    ];
    const createdCats = await Promise.all(
      cats.map((c) => this.prisma.serviceCategory.create({ data: c })),
    );
    const catMap = new Map(createdCats.map((c) => [c.nome, c.id]));

    const itens: Array<{ nome: string; valorPadrao?: number; custoPadrao?: number; categoria: string }> = [
      { nome: 'Consulta padrão', valorPadrao: 200, categoria: 'Consultas' },
      { nome: 'Consulta retorno', valorPadrao: 100, categoria: 'Consultas' },
      { nome: 'Consulta especialista', valorPadrao: 350, categoria: 'Consultas' },
      { nome: 'Consulta avaliação fisioterapia', valorPadrao: 200, categoria: 'Consultas' },
      { nome: 'Consulta domiciliar', valorPadrao: 300, categoria: 'Consultas' },
      { nome: 'Vacina V10 (canina)', valorPadrao: 120, custoPadrao: 60, categoria: 'Vacinas' },
      { nome: 'Vacina V8 (canina)', valorPadrao: 100, custoPadrao: 50, categoria: 'Vacinas' },
      { nome: 'Vacina antirrábica', valorPadrao: 80, custoPadrao: 30, categoria: 'Vacinas' },
      { nome: 'Vacina V4 (felina)', valorPadrao: 110, custoPadrao: 55, categoria: 'Vacinas' },
      { nome: 'Vacina V5 (felina)', valorPadrao: 130, custoPadrao: 65, categoria: 'Vacinas' },
      { nome: 'Vacina giárdia', valorPadrao: 90, custoPadrao: 40, categoria: 'Vacinas' },
      { nome: 'Castração macho cão pequeno', valorPadrao: 400, categoria: 'Cirurgias' },
      { nome: 'Castração macho cão médio', valorPadrao: 500, categoria: 'Cirurgias' },
      { nome: 'Castração macho cão grande', valorPadrao: 600, categoria: 'Cirurgias' },
      { nome: 'Castração fêmea cão pequena', valorPadrao: 600, categoria: 'Cirurgias' },
      { nome: 'Castração fêmea cão média', valorPadrao: 700, categoria: 'Cirurgias' },
      { nome: 'Castração fêmea cão grande', valorPadrao: 800, categoria: 'Cirurgias' },
      { nome: 'Castração macho gato', valorPadrao: 250, categoria: 'Cirurgias' },
      { nome: 'Castração fêmea gata', valorPadrao: 350, categoria: 'Cirurgias' },
      { nome: 'Banho pequeno', valorPadrao: 60, categoria: 'Estética / Banho e Tosa' },
      { nome: 'Banho médio', valorPadrao: 80, categoria: 'Estética / Banho e Tosa' },
      { nome: 'Banho grande', valorPadrao: 100, categoria: 'Estética / Banho e Tosa' },
      { nome: 'Tosa higiênica', valorPadrao: 40, categoria: 'Estética / Banho e Tosa' },
      { nome: 'Tosa máquina completa', valorPadrao: 80, categoria: 'Estética / Banho e Tosa' },
      { nome: 'Tosa tesoura', valorPadrao: 120, categoria: 'Estética / Banho e Tosa' },
      { nome: 'Hidratação capilar', valorPadrao: 50, categoria: 'Estética / Banho e Tosa' },
      { nome: 'Diária internação pequeno porte', valorPadrao: 150, categoria: 'Internação' },
      { nome: 'Diária internação grande porte', valorPadrao: 200, categoria: 'Internação' },
      { nome: 'Diária UTI', valorPadrao: 350, categoria: 'Internação' },
      { nome: 'Hemograma completo', valorPadrao: 90, custoPadrao: 40, categoria: 'Exames' },
      { nome: 'Bioquímico padrão', valorPadrao: 120, custoPadrao: 60, categoria: 'Exames' },
      { nome: 'Ultrassom abdominal', valorPadrao: 250, categoria: 'Exames' },
      { nome: 'Raio-X (1 incidência)', valorPadrao: 150, categoria: 'Exames' },
      { nome: 'Eletrocardiograma', valorPadrao: 180, categoria: 'Exames' },
      { nome: 'Sessão de fisioterapia', valorPadrao: 200, categoria: 'Fisioterapia e Reabilitação' },
      { nome: 'Eletroterapia (sessão avulsa)', valorPadrao: 180, categoria: 'Fisioterapia e Reabilitação' },
      { nome: 'Hidroterapia (sessão avulsa)', valorPadrao: 250, categoria: 'Fisioterapia e Reabilitação' },
      { nome: 'Pacote 10 sessões fisio', valorPadrao: 1800, categoria: 'Fisioterapia e Reabilitação' },
      { nome: 'Pacote 30 sessões fisio', valorPadrao: 4620, categoria: 'Fisioterapia e Reabilitação' },
      { nome: 'Sessão de acupuntura', valorPadrao: 180, categoria: 'Acupuntura' },
      { nome: 'Pacote 10 sessões acupuntura', valorPadrao: 1620, categoria: 'Acupuntura' },
    ];

    await Promise.all(
      itens.map((it) => this.prisma.servico.create({
        data: {
          nome: it.nome,
          valorPadrao: it.valorPadrao,
          custoPadrao: it.custoPadrao,
          comissaoBaseDefault: 'HERDAR',
          categoryId: catMap.get(it.categoria),
        },
      })),
    );

    return {
      ok: true,
      created: { categorias: createdCats.length, servicos: itens.length },
    };
  }

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    const COM_MAP: Record<string, string> = {
      'valor_cheio': 'VALOR_CHEIO', 'valor cheio': 'VALOR_CHEIO',
      'margem': 'MARGEM',
      'sem_comissao': 'SEM_COMISSAO', 'sem comissão': 'SEM_COMISSAO', 'sem comissao': 'SEM_COMISSAO',
      'herdar': 'HERDAR', 'herdar da categoria': 'HERDAR',
    };
    const catNomes = [...new Set(rows.map(r => (r.categoria || '').trim()).filter(Boolean))];
    const catMap: Record<string, string> = {};
    for (const nome of catNomes) {
      let c = await this.prisma.serviceCategory.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' } } });
      if (!c) c = await this.prisma.serviceCategory.create({ data: { nome, comissaoBasePadrao: 'VALOR_CHEIO' as any, ativo: true } });
      catMap[nome] = c.id;
    }
    for (const r of rows) {
      const nome = r.nome;
      if (!nome) { ignorados++; continue; }
      const comKey = ((r.comissao_base_default || r.comissaoBaseDefault) || 'herdar').toString().toLowerCase().trim();
      const data: any = {
        nome,
        valorPadrao: r.valor_padrao ?? r.valorPadrao ?? r.preco ?? null,
        custoPadrao: r.custo_padrao ?? r.custoPadrao ?? r.custo ?? null,
        comissaoBaseDefault: (COM_MAP[comKey] || 'HERDAR') as any,
        categoryId: r.categoria ? catMap[r.categoria.trim()] : null,
        ativo: r.ativo !== undefined ? r.ativo : true,
      };
      let existente = await this.prisma.servico.findFirst({ where: { nome: { equals: nome, mode: 'insensitive' } } });
      if (existente) {
        if (!upsert) { ignorados++; continue; }
        await this.prisma.servico.update({ where: { id: existente.id }, data });
        atualizados++;
      } else {
        await this.prisma.servico.create({ data });
        criados++;
      }
    }
    return { criados, atualizados, ignorados, categoriasCriadas: catNomes.length };
  }
}
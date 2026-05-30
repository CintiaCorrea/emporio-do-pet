import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListaItemDto, UpdateListaItemDto } from './dto/lista.dto';
import { CreateListaTipoDto, UpdateListaTipoDto } from './dto/lista-tipo.dto';

@Injectable()
export class ListasService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(lista?: string, includeInactive = false) {
    return this.prisma.listaItem.findMany({
      where: {
        ...(lista ? { lista } : {}),
        ...(includeInactive ? {} : { ativo: true }),
      },
      orderBy: [{ lista: 'asc' }, { ordem: 'asc' }, { valor: 'asc' }],
    });
  }

  async create(dto: CreateListaItemDto) {
    return this.prisma.listaItem.create({ data: dto });
  }

  async update(id: string, dto: UpdateListaItemDto) {
    const exists = await this.prisma.listaItem.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Item não encontrado');
    return this.prisma.listaItem.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const exists = await this.prisma.listaItem.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Item não encontrado');
    return this.prisma.listaItem.delete({ where: { id } });
  }


  // ============================================
  // ListaTipo (catálogo de listas disponíveis)
  // ============================================
  async listTipos(includeInactive = false) {
    return this.prisma.listaTipo.findMany({
      where: includeInactive ? {} : { ativo: true },
      orderBy: [{ ordem: 'asc' }, { label: 'asc' }],
    });
  }

  async createTipo(dto: CreateListaTipoDto) {
    return this.prisma.listaTipo.create({ data: dto });
  }

  async updateTipo(id: string, dto: UpdateListaTipoDto) {
    const exists = await this.prisma.listaTipo.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Tipo de lista não encontrado');
    return this.prisma.listaTipo.update({ where: { id }, data: dto });
  }

  async removeTipo(id: string) {
    const tipo = await this.prisma.listaTipo.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundException('Tipo de lista não encontrado');
    // Conferir se tem itens vinculados
    const itensCount = await this.prisma.listaItem.count({ where: { lista: tipo.nome } });
    if (itensCount > 0) {
      throw new BadRequestException(`A lista ${tipo.label} tem ${itensCount} itens. Exclua os itens antes de remover a lista.`);
    }
    return this.prisma.listaTipo.delete({ where: { id } });
  }

  async seedTiposPadrao() {
    const count = await this.prisma.listaTipo.count();
    if (count > 0) {
      return { ok: false, skipped: true, reason: 'Tipos de lista já cadastrados.' };
    }
    const tipos = [
      { nome: 'canais', label: 'Canais de entrada', emoji: '📞', descricao: 'Como o lead chegou (WhatsApp, Ligação, Walk-in...)', ordem: 1 },
      { nome: 'origens', label: 'Origens', emoji: '🎯', descricao: 'Como conheceu a clínica (Indicação, Google, Instagram...)', ordem: 2 },
      { nome: 'motivos_perda', label: 'Motivos de perda', emoji: '❌', descricao: 'Quando um Lead não converte (Preço, Sem retorno...)', ordem: 3 },
      { nome: 'status_clinico', label: 'Status clínico', emoji: '🩺', descricao: 'Etapas do acompanhamento clínico do Pet', ordem: 4 },
      { nome: 'plataformas_ads', label: 'Plataformas de anúncio', emoji: '📣', descricao: 'Google Ads, Meta Ads, TikTok Ads, etc', ordem: 5 },
      { nome: 'tipos_campanha', label: 'Tipos de campanha', emoji: '🎬', descricao: 'Conversão, Tráfego, Engajamento...', ordem: 6 },
      { nome: 'status_campanha', label: 'Status de campanha', emoji: '🚦', descricao: 'Ativa, Pausada, Encerrada, Em teste', ordem: 7 },
    ];
    await this.prisma.listaTipo.createMany({ data: tipos, skipDuplicates: true });
    return { ok: true, created: { tipos: tipos.length } };
  }

  async seedPacoteInicial() {
    const count = await this.prisma.listaItem.count();
    if (count > 0) {
      return { ok: false, skipped: true, reason: 'Já existem itens de lista cadastrados.' };
    }

    // Garantir que os tipos padrão existam
    await this.seedTiposPadrao();


    const seeds: Record<string, string[]> = {
      canais: ['WhatsApp', 'Ligação', 'Walk-in', 'Indicação direta', 'Formulário LP', 'Instagram', 'Facebook', 'Site', 'Email', 'Outro'],
      origens: ['Indicação cliente', 'Google', 'Instagram', 'Facebook', 'Site', 'Anúncio Google', 'Anúncio Meta', 'Passagem pela porta', 'Vizinhança', 'Evento', 'Outra'],
      motivos_perda: ['Preço alto', 'Sem retorno', 'Foi para outro vet', 'Pet faleceu', 'Mudou de cidade', 'Tempo demorado pra responder', 'Não respondeu', 'Não tem mais interesse', 'Engano / não era lead', 'Outro'],
      status_clinico: ['Diagnóstico inicial', 'Em tratamento', 'Aguardando exames', 'Retorno agendado', 'Em manutenção', 'Alta clínica', 'Abandonou'],
      plataformas_ads: ['Google Ads', 'Meta Ads Facebook', 'Meta Ads Instagram', 'TikTok Ads', 'YouTube Ads', 'Outras'],
      tipos_campanha: ['Conversão', 'Tráfego', 'Engajamento', 'Mensagem WhatsApp', 'Reconhecimento', 'Vídeo views'],
      status_campanha: ['Ativa', 'Pausada', 'Encerrada', 'Em teste', 'Aguardando aprovação'],
    };

    const data: any[] = [];
    for (const [lista, valores] of Object.entries(seeds)) {
      valores.forEach((valor, idx) => data.push({ lista, valor, ordem: idx }));
    }
    await this.prisma.listaItem.createMany({ data, skipDuplicates: true });

    return {
      ok: true,
      created: { total: data.length, listas: Object.keys(seeds).length },
    };
  }
}

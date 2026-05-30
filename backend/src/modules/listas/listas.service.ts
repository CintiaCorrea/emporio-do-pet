import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListaItemDto, UpdateListaItemDto } from './dto/lista.dto';

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

  async seedPacoteInicial() {
    const count = await this.prisma.listaItem.count();
    if (count > 0) {
      return { ok: false, skipped: true, reason: 'Já existem itens de lista cadastrados.' };
    }

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

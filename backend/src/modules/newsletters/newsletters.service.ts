import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';

@Injectable()
export class NewslettersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizePagination(params?: { skip?: number; take?: number }) {
    const rawSkip = params?.skip;
    const rawTake = params?.take;

    const skip =
      typeof rawSkip === 'number' && Number.isFinite(rawSkip) && rawSkip >= 0
        ? Math.floor(rawSkip)
        : 0;

    const take =
      typeof rawTake === 'number' && Number.isFinite(rawTake) && rawTake > 0
        ? Math.floor(rawTake)
        : 20;

    return { skip, take };
  }

  async create(userId: string, createNewsletterDto: CreateNewsletterDto) {
    return this.prisma.newsletter.create({
      data: {
        ...createNewsletterDto,
        userId,
        status: createNewsletterDto.status ?? ('DRAFT' as any),
        scheduledFor: createNewsletterDto.scheduledFor
          ? new Date(createNewsletterDto.scheduledFor)
          : null,
      },
      include: {
        template: true,
        _count: { select: { recipients: true } },
      },
    });
  }

  async findAll(userId: string, params?: { status?: string; skip?: number; take?: number }) {
    const { status } = params || {};
    const { skip, take } = this.normalizePagination(params);

    const where = {
      userId,
      ...(status && { status: status as any }),
    };

    const [newsletters, total] = await Promise.all([
      this.prisma.newsletter.findMany({
        where,
        skip,
        take,
        include: {
          template: { select: { id: true, name: true } },
          _count: { select: { recipients: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.newsletter.count({ where }),
    ]);

    return { newsletters, total, skip, take };
  }

  async findById(id: string, userId: string) {
    const newsletter = await this.prisma.newsletter.findFirst({
      where: { id, userId },
      include: {
        template: true,
        recipients: {
          include: {
            tutor: { select: { id: true, name: true, email: true } },
          },
        },
        newsletterLogs: {
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!newsletter) {
      throw new NotFoundException('Newsletter não encontrada');
    }

    return newsletter;
  }

  async update(id: string, userId: string, updateNewsletterDto: UpdateNewsletterDto) {
    await this.findById(id, userId);

    return this.prisma.newsletter.update({
      where: { id },
      data: {
        ...updateNewsletterDto,
        scheduledFor: updateNewsletterDto.scheduledFor
          ? new Date(updateNewsletterDto.scheduledFor)
          : undefined,
      },
      include: {
        template: true,
        _count: { select: { recipients: true } },
      },
    });
  }

  async remove(id: string, userId: string) {
    await this.findById(id, userId);

    return this.prisma.newsletter.delete({
      where: { id },
    });
  }

  async getTemplates() {
    return this.prisma.newsletterTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

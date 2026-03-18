import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLandingPageDto, UpdateLandingPageDto, UpdateContentDto } from './dto';
import { ElementorExporterService } from './elementor-exporter.service';
import * as fs from 'fs';
import * as path from 'path';

const BUILT_IN_TEMPLATES = [
  'clinica-veterinaria',
  'banho-e-tosa',
  'pet-shop',
  'adocao',
  'hotel-pet',
];

@Injectable()
export class LandingPagesService {
  constructor(
    private prisma: PrismaService,
    private elementorExporter: ElementorExporterService,
  ) {}

  private loadBuiltInTemplate(templateId: string): { html: string; css: string } | null {
    if (!BUILT_IN_TEMPLATES.includes(templateId)) return null;

    try {
      const filePath = path.join(__dirname, 'templates', `${templateId}.json`);
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async create(userId: string, dto: CreateLandingPageDto) {
    const existing = await this.prisma.landingPage.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" já está em uso`);
    }

    let initialContent: any = {};
    let initialStyles: any = null;

    if (dto.templateId) {
      const builtIn = this.loadBuiltInTemplate(dto.templateId);
      if (builtIn) {
        initialContent = { _html: builtIn.html, _css: builtIn.css };
      } else {
        const templatePage = await this.prisma.landingPage.findFirst({
          where: { id: dto.templateId },
        });
        if (templatePage) {
          initialContent = templatePage.content;
          initialStyles = templatePage.styles;
        }
      }
    }

    return this.prisma.landingPage.create({
      data: {
        userId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        content: initialContent,
        styles: initialStyles,
      },
    });
  }

  async findAll(
    userId: string,
    options?: {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.landingPage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          thumbnail: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.landingPage.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(userId: string, id: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id, userId },
    });
    if (!page) {
      throw new NotFoundException('Landing page não encontrada');
    }
    return page;
  }

  async update(userId: string, id: string, dto: UpdateLandingPageDto) {
    await this.findOne(userId, id);

    if (dto.slug) {
      const existing = await this.prisma.landingPage.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException(`Slug "${dto.slug}" já está em uso`);
      }
    }

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.slug) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.settings) data.settings = dto.settings;
    if (dto.thumbnail) data.thumbnail = dto.thumbnail;

    return this.prisma.landingPage.update({ where: { id }, data });
  }

  async updateContent(userId: string, id: string, dto: UpdateContentDto) {
    await this.findOne(userId, id);

    return this.prisma.landingPage.update({
      where: { id },
      data: {
        content: dto.content,
        ...(dto.styles !== undefined && { styles: dto.styles }),
      },
    });
  }

  async updateStatus(userId: string, id: string, status: string) {
    await this.findOne(userId, id);

    const data: any = { status };
    if (status === 'PUBLISHED') {
      data.publishedAt = new Date();
    }

    return this.prisma.landingPage.update({
      where: { id },
      data,
    });
  }

  async duplicate(userId: string, id: string) {
    const original = await this.findOne(userId, id);

    const baseName = `${original.name} (cópia)`;
    const baseSlug = `${original.slug}-copia`;

    let slug = baseSlug;
    let suffix = 1;
    while (await this.prisma.landingPage.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }

    return this.prisma.landingPage.create({
      data: {
        userId,
        name: baseName,
        slug,
        description: original.description,
        content: original.content || {},
        styles: original.styles ?? undefined,
        settings: original.settings ?? undefined,
        status: 'DRAFT',
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.landingPage.delete({ where: { id } });
  }

  async exportElementor(userId: string, id: string) {
    const page = await this.findOne(userId, id);
    return this.elementorExporter.export(
      page.name,
      page.content,
      page.styles,
      page.settings,
    );
  }
}

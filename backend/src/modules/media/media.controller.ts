import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Logger,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { MediaService } from './media.service';
import { CloudStorageService } from './cloud-storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly cloudStorage: CloudStorageService,
  ) {}

  /**
   * Serve um arquivo PRIVADO do bucket (ex.: PDF anexado na ficha) de forma AUTENTICADA.
   * O `u` é a URL direta do objeto no nosso bucket — baixarPorUrl só assina/baixa do NOSSO
   * bucket (ignora qualquer outro host → seguro contra SSRF). GET /api/media/ver?u=<url>
   */
  @Get('ver')
  @UseGuards(JwtAuthGuard)
  async ver(@Query('u') u: string, @Res() res: Response) {
    if (!u) throw new NotFoundException('Arquivo não encontrado');
    const file = await this.cloudStorage.baixarPorUrl(u);
    if (!file) {
      // Não é do nosso bucket privado (URL pública/externa) → só redireciona.
      if (/^https?:\/\//i.test(u)) return res.redirect(u);
      throw new NotFoundException('Arquivo não encontrado');
    }
    res.set({
      'Content-Type': file.contentType,
      'Content-Length': file.buffer.length.toString(),
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': 'inline',
    });
    res.send(file.buffer);
  }

  /**
   * Serve stored media files
   * GET /api/media/:subDir/:filename
   */
  @Get(':subDir/:filename')
  async serveFile(
    @Param('subDir') subDir: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Validate subDir to prevent path traversal
    const allowedDirs = ['images', 'audio', 'video', 'documents', 'stickers'];
    if (!allowedDirs.includes(subDir)) {
      throw new NotFoundException('File not found');
    }

    // Validate filename to prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new NotFoundException('File not found');
    }

    const file = await this.mediaService.getFile(subDir, filename);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Set appropriate cache headers (1 day)
    res.set({
      'Content-Type': file.mimeType,
      'Content-Length': file.buffer.length.toString(),
      'Cache-Control': 'public, max-age=86400',
      'Content-Disposition': 'inline',
    });

    res.send(file.buffer);
  }

  /**
   * Get media storage stats (admin only)
   * GET /api/media/stats
   */
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats() {
    return this.mediaService.getStats();
  }
}

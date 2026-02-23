import {
  Controller,
  Get,
  Param,
  Res,
  Logger,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('media')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

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

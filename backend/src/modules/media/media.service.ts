import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredMedia {
  id: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    // Default upload directory: backend/uploads/media
    this.uploadDir = this.configService.get<string>('MEDIA_UPLOAD_DIR') ||
      path.join(process.cwd(), 'uploads', 'media');
    
    // Base URL for serving files
    this.baseUrl = this.configService.get<string>('MEDIA_BASE_URL') || '/api/media';

    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private ensureUploadDir(): void {
    const dirs = ['images', 'audio', 'video', 'documents', 'stickers'];
    
    for (const dir of dirs) {
      const fullPath = path.join(this.uploadDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.logger.log(`Created media directory: ${fullPath}`);
      }
    }
  }

  /**
   * Store a buffer as a file and return the stored media info
   */
  async storeBuffer(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
  ): Promise<StoredMedia> {
    const id = crypto.randomUUID();
    const ext = this.getExtension(mimeType, originalFilename);
    const subDir = this.getSubDirectory(mimeType);
    const filename = `${id}${ext}`;
    const filePath = path.join(this.uploadDir, subDir, filename);

    try {
      await fs.promises.writeFile(filePath, buffer);

      const stored: StoredMedia = {
        id,
        originalFilename,
        mimeType,
        size: buffer.length,
        path: filePath,
        url: `${this.baseUrl}/${subDir}/${filename}`,
      };

      this.logger.log(
        `Stored media: ${id} (${mimeType}, ${this.formatSize(buffer.length)})`,
      );

      return stored;
    } catch (error) {
      this.logger.error(`Failed to store media: ${error}`);
      throw error;
    }
  }

  /**
   * Download media from a URL and store it locally
   */
  async downloadAndStore(
    url: string,
    mimeType: string,
    authToken?: string,
    originalFilename?: string,
  ): Promise<StoredMedia> {
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Failed to download media: HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Detect mime type from response if not provided
      const detectedMime = mimeType || 
        response.headers.get('content-type') || 
        'application/octet-stream';

      const filename = originalFilename || `download_${Date.now()}`;

      return this.storeBuffer(buffer, filename, detectedMime);
    } catch (error) {
      this.logger.error(`Failed to download and store media: ${error}`);
      throw error;
    }
  }

  /**
   * Get file buffer by media ID or filename
   */
  async getFile(subDir: string, filename: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  } | null> {
    const filePath = path.join(this.uploadDir, subDir, filename);

    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const buffer = await fs.promises.readFile(filePath);
      const mimeType = this.getMimeType(filename);

      return { buffer, mimeType };
    } catch (error) {
      this.logger.error(`Failed to read media file: ${error}`);
      return null;
    }
  }

  /**
   * Delete a stored media file
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Deleted media file: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete media file: ${error}`);
      return false;
    }
  }

  /**
   * Get disk usage stats
   */
  async getStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<string, { count: number; size: number }>;
  }> {
    const stats = {
      totalFiles: 0,
      totalSize: 0,
      byType: {} as Record<string, { count: number; size: number }>,
    };

    const dirs = ['images', 'audio', 'video', 'documents', 'stickers'];

    for (const dir of dirs) {
      const dirPath = path.join(this.uploadDir, dir);
      stats.byType[dir] = { count: 0, size: 0 };

      try {
        if (fs.existsSync(dirPath)) {
          const files = await fs.promises.readdir(dirPath);
          
          for (const file of files) {
            const fileStat = await fs.promises.stat(path.join(dirPath, file));
            stats.totalFiles++;
            stats.totalSize += fileStat.size;
            stats.byType[dir].count++;
            stats.byType[dir].size += fileStat.size;
          }
        }
      } catch {
        // Directory may not exist
      }
    }

    return stats;
  }

  private getSubDirectory(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('sticker')) return 'stickers';
    return 'documents';
  }

  private getExtension(mimeType: string, filename?: string): string {
    // Try to get from filename first
    if (filename) {
      const ext = path.extname(filename);
      if (ext) return ext;
    }

    // Map common MIME types
    const mimeMap: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'audio/ogg': '.ogg',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'audio/opus': '.opus',
      'audio/aac': '.aac',
      'video/mp4': '.mp4',
      'video/3gpp': '.3gp',
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    };

    return mimeMap[mimeType] || '.bin';
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ogg': 'audio/ogg',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.opus': 'audio/opus',
      '.aac': 'audio/aac',
      '.mp4': 'video/mp4',
      '.3gp': 'video/3gpp',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    return mimeMap[ext] || 'application/octet-stream';
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

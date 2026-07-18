import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export type StorageProvider = 'local' | 's3' | 'cloudinary' | 'r2';

export interface CloudStorageConfig {
  provider: StorageProvider;
  // S3/R2 config
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3Endpoint?: string; // For R2 or custom S3-compatible services
  // Cloudinary config
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryFolder?: string;
}

/**
 * Deixa o nome seguro pra virar chave no bucket: sem acento, sem espaço, sem barra.
 * Preserva a extensão (o navegador usa pra saber que é PDF).
 */
export function sanitizarNome(nome: string): string {
  const limpo = (nome || 'arquivo')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira acento
    .replace(/[^a-zA-Z0-9._-]+/g, '-') // espaço, "/", "#", "?" etc viram "-"
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|-+$/g, '');
  return limpo.slice(0, 120) || 'arquivo';
}

export interface UploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  provider: StorageProvider;
  size?: number;
  mimeType?: string;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

@Injectable()
export class CloudStorageService {
  private readonly logger = new Logger(CloudStorageService.name);
  private readonly config: CloudStorageConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      provider: (this.configService.get<string>('STORAGE_PROVIDER') || 'local') as StorageProvider,
      // S3/R2 configuration
      s3Bucket: this.configService.get<string>('S3_BUCKET'),
      s3Region: this.configService.get<string>('S3_REGION') || 'us-east-1',
      s3AccessKeyId: this.configService.get<string>('S3_ACCESS_KEY_ID'),
      s3SecretAccessKey: this.configService.get<string>('S3_SECRET_ACCESS_KEY'),
      s3Endpoint: this.configService.get<string>('S3_ENDPOINT'),
      // Cloudinary configuration
      cloudinaryCloudName: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      cloudinaryApiKey: this.configService.get<string>('CLOUDINARY_API_KEY'),
      cloudinaryApiSecret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      cloudinaryFolder: this.configService.get<string>('CLOUDINARY_FOLDER') || 'whatsapp-media',
    };

    this.logger.log(`Cloud storage provider: ${this.config.provider}`);
  }

  /**
   * Get current storage provider
   */
  getProvider(): StorageProvider {
    return this.config.provider;
  }

  /**
   * Check if cloud storage is configured
   */
  isConfigured(): boolean {
    switch (this.config.provider) {
      case 's3':
      case 'r2':
        return !!(
          this.config.s3Bucket &&
          this.config.s3AccessKeyId &&
          this.config.s3SecretAccessKey
        );
      case 'cloudinary':
        return !!(
          this.config.cloudinaryCloudName &&
          this.config.cloudinaryApiKey &&
          this.config.cloudinaryApiSecret
        );
      case 'local':
        return true;
      default:
        return false;
    }
  }

  /**
   * Upload a buffer to cloud storage
   */
  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    folder: string = 'whatsapp',
  ): Promise<UploadResult> {
    switch (this.config.provider) {
      case 's3':
      case 'r2':
        return this.uploadToS3(buffer, filename, mimeType, folder);
      case 'cloudinary':
        return this.uploadToCloudinary(buffer, filename, mimeType, folder);
      case 'local':
      default:
        return {
          success: false,
          provider: 'local',
          error: 'Local storage requires MediaService, not CloudStorageService',
        };
    }
  }

  /**
   * Upload to S3 or S3-compatible storage (R2, MinIO, etc.)
   */
  private async uploadToS3(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    folder: string,
  ): Promise<UploadResult> {
    if (!this.config.s3Bucket || !this.config.s3AccessKeyId || !this.config.s3SecretAccessKey) {
      return { success: false, provider: 's3', error: 'S3 not configured' };
    }

    try {
      // O nome vai pra dentro da URL E da assinatura SigV4. Espaço, acento ou "/" no
      // nome quebram o cálculo da assinatura e o bucket devolve 403 SignatureDoesNotMatch
      // ("Exames - Luna_Claudia 16_07_26.pdf" quebrava; "laudo-teste.pdf" passava).
      // O nome de verdade continua guardado em MediaFile.originalFilename, que é o que
      // a tela mostra — isto aqui é só o endereço do arquivo no bucket.
      const key = `${folder}/${sanitizarNome(filename)}`;
      const endpoint = this.config.s3Endpoint || `https://s3.${this.config.s3Region}.amazonaws.com`;
      const url = `${endpoint}/${this.config.s3Bucket}/${key}`;
      const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateShort = date.substring(0, 8);

      // Create canonical request for AWS Signature V4
      const method = 'PUT';
      const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const host = new URL(endpoint).host;

      const canonicalHeaders = [
        `content-type:${mimeType}`,
        `host:${host}`,
        `x-amz-content-sha256:${contentHash}`,
        `x-amz-date:${date}`,
      ].join('\n');

      const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

      const canonicalRequest = [
        method,
        `/${this.config.s3Bucket}/${key}`,
        '',
        canonicalHeaders,
        '',
        signedHeaders,
        contentHash,
      ].join('\n');

      const credentialScope = `${dateShort}/${this.config.s3Region}/s3/aws4_request`;
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        date,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
      ].join('\n');

      // Calculate signature
      const getSignatureKey = (key: string, dateStamp: string, regionName: string, serviceName: string) => {
        const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
        const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
        const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
        return crypto.createHmac('sha256', kService).update('aws4_request').digest();
      };

      const signingKey = getSignatureKey(
        this.config.s3SecretAccessKey!,
        dateShort,
        this.config.s3Region!,
        's3',
      );
      const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

      const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.s3AccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': mimeType,
          'x-amz-content-sha256': contentHash,
          'x-amz-date': date,
          'Authorization': authorization,
        },
        body: buffer as unknown as BodyInit,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`S3 upload failed: ${response.status} - ${errorText}`);
      }

      // Construct public URL
      const publicUrl = this.config.s3Endpoint
        ? `${this.config.s3Endpoint}/${this.config.s3Bucket}/${key}`
        : `https://${this.config.s3Bucket}.s3.${this.config.s3Region}.amazonaws.com/${key}`;

      this.logger.log(`Uploaded to S3: ${key}`);

      return {
        success: true,
        url: publicUrl,
        publicId: key,
        provider: this.config.provider,
        size: buffer.length,
        mimeType,
      };
    } catch (error) {
      this.logger.error(`S3 upload error: ${error}`);
      return {
        success: false,
        provider: 's3',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Upload to Cloudinary
   */
  private async uploadToCloudinary(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    folder: string,
  ): Promise<UploadResult> {
    if (!this.config.cloudinaryCloudName || !this.config.cloudinaryApiKey || !this.config.cloudinaryApiSecret) {
      return { success: false, provider: 'cloudinary', error: 'Cloudinary not configured' };
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const publicId = `${folder}/${filename.replace(/\.[^/.]+$/, '')}`;
      
      // Determine resource type
      let resourceType = 'auto';
      if (mimeType.startsWith('image/')) resourceType = 'image';
      else if (mimeType.startsWith('video/')) resourceType = 'video';
      else resourceType = 'raw';

      // Create signature
      const paramsToSign = `folder=${this.config.cloudinaryFolder}&public_id=${publicId}&timestamp=${timestamp}`;
      const signature = crypto
        .createHash('sha1')
        .update(paramsToSign + this.config.cloudinaryApiSecret)
        .digest('hex');

      // Build form data
      const formData = new FormData();
      formData.append('file', new Blob([buffer as unknown as BlobPart], { type: mimeType }), filename);
      formData.append('api_key', this.config.cloudinaryApiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', this.config.cloudinaryFolder!);
      formData.append('public_id', publicId);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudinaryCloudName}/${resourceType}/upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `Cloudinary upload failed: ${response.status}`);
      }

      this.logger.log(`Uploaded to Cloudinary: ${data.public_id}`);

      return {
        success: true,
        url: data.secure_url,
        publicId: data.public_id,
        provider: 'cloudinary',
        size: data.bytes,
        mimeType: data.format ? `${resourceType}/${data.format}` : mimeType,
      };
    } catch (error) {
      this.logger.error(`Cloudinary upload error: ${error}`);
      return {
        success: false,
        provider: 'cloudinary',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete a file from cloud storage
   */
  async delete(publicId: string): Promise<DeleteResult> {
    switch (this.config.provider) {
      case 's3':
      case 'r2':
        return this.deleteFromS3(publicId);
      case 'cloudinary':
        return this.deleteFromCloudinary(publicId);
      default:
        return { success: false, error: 'Delete not supported for this provider' };
    }
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(key: string): Promise<DeleteResult> {
    if (!this.config.s3Bucket || !this.config.s3AccessKeyId || !this.config.s3SecretAccessKey) {
      return { success: false, error: 'S3 not configured' };
    }

    try {
      const endpoint = this.config.s3Endpoint || `https://s3.${this.config.s3Region}.amazonaws.com`;
      const url = `${endpoint}/${this.config.s3Bucket}/${key}`;
      const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
      const dateShort = date.substring(0, 8);

      const contentHash = crypto.createHash('sha256').update('').digest('hex');
      const host = new URL(endpoint).host;

      const canonicalHeaders = [
        `host:${host}`,
        `x-amz-content-sha256:${contentHash}`,
        `x-amz-date:${date}`,
      ].join('\n');

      const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

      const canonicalRequest = [
        'DELETE',
        `/${this.config.s3Bucket}/${key}`,
        '',
        canonicalHeaders,
        '',
        signedHeaders,
        contentHash,
      ].join('\n');

      const credentialScope = `${dateShort}/${this.config.s3Region}/s3/aws4_request`;
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        date,
        credentialScope,
        crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
      ].join('\n');

      const getSignatureKey = (secretKey: string, dateStamp: string, regionName: string, serviceName: string) => {
        const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
        const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
        const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
        return crypto.createHmac('sha256', kService).update('aws4_request').digest();
      };

      const signingKey = getSignatureKey(
        this.config.s3SecretAccessKey!,
        dateShort,
        this.config.s3Region!,
        's3',
      );
      const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

      const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.s3AccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'x-amz-content-sha256': contentHash,
          'x-amz-date': date,
          'Authorization': authorization,
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`S3 delete failed: ${response.status}`);
      }

      this.logger.log(`Deleted from S3: ${key}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete from Cloudinary
   */
  private async deleteFromCloudinary(publicId: string): Promise<DeleteResult> {
    if (!this.config.cloudinaryCloudName || !this.config.cloudinaryApiKey || !this.config.cloudinaryApiSecret) {
      return { success: false, error: 'Cloudinary not configured' };
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}`;
      const signature = crypto
        .createHash('sha1')
        .update(paramsToSign + this.config.cloudinaryApiSecret)
        .digest('hex');

      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', this.config.cloudinaryApiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.config.cloudinaryCloudName}/image/destroy`,
        {
          method: 'POST',
          body: formData,
        },
      );

      const data = await response.json();

      if (data.result !== 'ok' && data.result !== 'not found') {
        throw new Error(data.error?.message || 'Delete failed');
      }

      this.logger.log(`Deleted from Cloudinary: ${publicId}`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate a unique filename
   */
  generateFilename(originalName: string, prefix: string = ''): string {
    const ext = originalName.includes('.') ? originalName.split('.').pop() : '';
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    return `${prefix}${prefix ? '_' : ''}${timestamp}_${id}${ext ? '.' + ext : ''}`;
  }
}

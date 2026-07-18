import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Query,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CloudStorageService } from './cloud-storage.service';
import { PrismaService } from '../prisma/prisma.service';

interface JwtUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

/** 20 MB — cobre PDF de exame, foto e documento. Vídeo grande fica de fora de propósito. */
const TAMANHO_MAX = 20 * 1024 * 1024;

/**
 * Tipos aceitos. Lista fechada: arquivo que a clínica precisa guardar (laudo, foto,
 * documento) e nada de executável. `image/*` cobre foto de celular em qualquer formato.
 */
const TIPOS_OK = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'audio/mpeg',
  'audio/ogg',
];

/** Pastas permitidas no bucket — evita gravar em caminho arbitrário vindo da URL. */
const PASTAS_OK = ['exames', 'whatsapp', 'documentos', 'pets'];

/**
 * A "porta" de upload: o único lugar por onde o navegador manda arquivo pro bucket.
 * O sistema já guardava mídia (é assim que a foto que o cliente manda no WhatsApp
 * aparece), mas só por dentro — não existia rota pra subir. Usada por:
 *   - anexo do WhatsApp (foto/documento/figurinha)
 *   - resultado de exame na ficha do pet
 */
@UseGuards(JwtAuthGuard)
@Controller('media')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(
    private readonly cloudStorage: CloudStorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: TAMANHO_MAX } }))
  async upload(
    @CurrentUser() user: JwtUser,
    @UploadedFile() file: Express.Multer.File,
    @Query('pasta') pasta?: string,
    @Query('origem') origem?: string,
    @Query('origemId') origemId?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');

    if (!TIPOS_OK.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo não aceito (${file.mimetype}). Aceitos: PDF, imagem, Word, Excel, MP4 e áudio.`,
      );
    }

    const destino = PASTAS_OK.includes(pasta || '') ? pasta! : 'documentos';

    // Prefixo único: sem ele, dois laudos chamados "resultado.pdf" gravam na MESMA
    // chave e o segundo apaga o primeiro — perda silenciosa de exame.
    const unico = `${Date.now()}-${randomUUID().slice(0, 8)}-${file.originalname}`;

    const resultado = await this.cloudStorage.upload(
      file.buffer,
      unico,
      file.mimetype,
      `${destino}/${user.id}`,
    );

    if (!resultado.success || !resultado.url) {
      // Falha do bucket é problema nosso, não do usuário — mas ele precisa saber que
      // NÃO salvou, em vez de achar que anexou.
      this.logger.error(`Upload falhou para ${user.id}: ${resultado.error}`);
      throw new BadRequestException(
        `Não consegui guardar o arquivo: ${resultado.error || 'erro no armazenamento'}`,
      );
    }

    const registro = await this.prisma.mediaFile.create({
      data: {
        userId: user.id,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        cloudUrl: resultado.url,
        publicId: resultado.publicId,
        storageProvider: resultado.provider,
        source: origem || destino,
        sourceId: origemId || null,
      },
    });

    this.logger.log(`Upload ok: ${file.originalname} (${file.size}b) -> ${resultado.url}`);

    return {
      id: registro.id,
      url: resultado.url,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }
}

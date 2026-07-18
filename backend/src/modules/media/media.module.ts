import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from './media.controller';
import { UploadController } from './upload.controller';
import { MediaService } from './media.service';
import { CloudStorageService } from './cloud-storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  // UploadController ANTES: '@Post(upload)' e '@Get(:subDir/:filename)' convivem, mas
  // deixar o específico primeiro evita surpresa de rota se o Media ganhar POST depois.
  controllers: [UploadController, MediaController],
  providers: [MediaService, CloudStorageService],
  exports: [MediaService, CloudStorageService],
})
export class MediaModule {}

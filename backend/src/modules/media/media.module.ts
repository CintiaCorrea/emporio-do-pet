import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { CloudStorageService } from './cloud-storage.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [MediaController],
  providers: [MediaService, CloudStorageService],
  exports: [MediaService, CloudStorageService],
})
export class MediaModule {}

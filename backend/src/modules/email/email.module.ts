import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  controllers: [EmailController],
  imports: [ConfigModule, PrismaModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}

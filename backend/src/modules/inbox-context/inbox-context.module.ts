import { Module } from '@nestjs/common';
import { InboxContextController } from './inbox-context.controller';
import { InboxContextService } from './inbox-context.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InboxContextController],
  providers: [InboxContextService],
})
export class InboxContextModule {}

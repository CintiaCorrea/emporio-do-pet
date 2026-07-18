import { Module, forwardRef } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentConfirmationListener } from './appointment-confirmation.listener';
import { AppointmentConfirmationScheduler } from './appointment-confirmation.scheduler';
import { BoardsModule } from '../boards/boards.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [BoardsModule, forwardRef(() => WhatsAppModule)],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentConfirmationListener, AppointmentConfirmationScheduler],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}

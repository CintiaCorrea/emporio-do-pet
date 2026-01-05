import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TutorsModule } from './modules/tutors/tutors.module';
import { PetsModule } from './modules/pets/pets.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { BoardsModule } from './modules/boards/boards.module';
import { NewslettersModule } from './modules/newsletters/newsletters.module';
import { HealthModule } from './modules/health/health.module';
import { ProductsModule } from './modules/products/products.module';
import { TreatmentsModule } from './modules/treatments/treatments.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { StockModule } from './modules/stock/stock.module';
import { CommissionsModule } from './modules/commissions/commissions.module';
import { HospitalizationsModule } from './modules/hospitalizations/hospitalizations.module';
import configuration from './config/configuration';

@Module({
  imports: [
    // Configuração global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Módulos de infraestrutura
    PrismaModule,
    RedisModule,

    // Módulos de negócio
    AuthModule,
    UsersModule,
    TutorsModule,
    PetsModule,
    AppointmentsModule,
    BoardsModule,
    NewslettersModule,
    ProductsModule,
    TreatmentsModule,
    ClientsModule,
    ContactsModule,
    StockModule,
    CommissionsModule,
    HospitalizationsModule,

    // Health check
    HealthModule,
  ],
})
export class AppModule {}


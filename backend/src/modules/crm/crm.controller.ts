import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CrmIntegrationService, LeadConversionData } from './crm-integration.service';
import { IsString, IsOptional, IsArray } from 'class-validator';

class ConvertLeadDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

@ApiTags('CRM')
@ApiBearerAuth()
@Controller('crm')
@UseGuards(JwtAuthGuard)
export class CrmController {
  constructor(private readonly crmService: CrmIntegrationService) {}

  @Get('consulta-vendas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Relatorio: consulta de vendas (Appointments type=VENDA) com filtros e totais' })
  async consultaVendas(
    @Query('de') de?: string,
    @Query('ate') ate?: string,
    @Query('status') status?: string,
    @Query('marca') marca?: string,
    @Query('funcionarioId') funcionarioId?: string,
    @Query('busca') busca?: string,
    @Query('cod') cod?: string,
    @Query('limit') limit?: string,
  ) {
    return this.crmService.consultaVendas({
      de,
      ate,
      status,
      marca,
      funcionarioId,
      busca,
      cod,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get CRM statistics' })
  async getStats(@CurrentUser() user: { userId: string }) {
    return this.crmService.getStats(user.userId);
  }

  @Get('duplicados')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Varredura (so leitura) de clientes/leads duplicados' })
  async duplicados() {
    return this.crmService.escanearDuplicados();
  }

  @Post('backfill-codigos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Numera clientes/pets sem codigo sequencial (idempotente)' })
  async backfillCodigos() {
    return this.crmService.backfillCodigos();
  }

  @Post('importar-simplesvet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Importa um lote de clientes/pets do SimplesVet (com dryRun)' })
  async importarSimplesvet(@Body() body: { dryRun?: boolean; limparCodigos?: boolean; clientes: any[] }) {
    return this.crmService.importarSimplesvet(body);
  }

  @Post('importar-vendas')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Importa vendas do SimplesVet como Appointments (venda por venda), com dryRun' })
  async importarVendas(
    @Body() body: { linhas: any[]; dryRun?: boolean; mapaMarca?: Record<string, string>; importadorUserId?: string },
    @CurrentUser() user: { id: string; userId?: string },
  ) {
    return this.crmService.importarVendas({
      ...body,
      importadorUserId: body.importadorUserId || user?.id || user?.userId,
    });
  }

  @Post('limpar-pets-sem-codigo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apaga pets sem codigo (residuos da importacao); lote de 300, com dryRun' })
  async limparPetsSemCodigo(@Body() body: { dryRun?: boolean }) {
    return this.crmService.limparPetsSemCodigo(!!body?.dryRun);
  }

  @Post('leads/:id/convert')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Convert a lead to a client' })
  async convertLead(
    @Param('id') leadId: string,
    @Body() dto: ConvertLeadDto,
    @CurrentUser() user: { userId: string },
  ) {
    const data: LeadConversionData = {
      leadId,
      userId: user.userId,
      clientData: dto,
    };

    const tutorId = await this.crmService.convertLeadToTutor(data);

    if (!tutorId) {
      return {
        success: false,
        error: 'Failed to convert lead',
      };
    }

    return {
      success: true,
      tutorId,
    };
  }

  @Post('whatsapp/create-lead')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a lead from WhatsApp conversation data' })
  async createLeadFromWhatsApp(
    @Body() data: {
      conversationId: string;
      contactPhone: string;
      contactName?: string;
      firstMessage?: string;
    },
    @CurrentUser() user: { userId: string },
  ) {
    const leadId = await this.crmService.createLeadFromWhatsApp({
      ...data,
      userId: user.userId,
    });

    if (!leadId) {
      return {
        success: false,
        error: 'Failed to create lead',
      };
    }

    return {
      success: true,
      leadId,
    };
  }
}

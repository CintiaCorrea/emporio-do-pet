import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBreedDto } from './dto/create-breed.dto';
import { BreedsService } from './breeds.service';

@ApiTags('breeds')
@Controller('breeds')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BreedsController {
  constructor(private readonly breedsService: BreedsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar raças (opcionalmente por espécie)' })
  @ApiQuery({ name: 'species', required: false })
  list(@Query('species') species?: string) {
    return this.breedsService.list(species);
  }

  @Post()
  @ApiOperation({ summary: 'Criar raça (por espécie)' })
  create(@Body() dto: CreateBreedDto) {
    return this.breedsService.create(dto);
  }
}


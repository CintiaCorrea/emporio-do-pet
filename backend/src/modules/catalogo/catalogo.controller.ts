import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogoService } from './catalogo.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('catalogo')
@Controller('catalogo')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CatalogoController {
  constructor(private readonly service: CatalogoService) {}

  // Grupos (árvore)
  @Get('grupos') listGrupos() { return this.service.listGrupos(); }
  @Post('grupos') criarGrupo(@Body() b: any) { return this.service.criarGrupo(b); }
  @Patch('grupos/:id') atualizarGrupo(@Param('id') id: string, @Body() b: any) { return this.service.atualizarGrupo(id, b); }
  @Delete('grupos/:id') removerGrupo(@Param('id') id: string) { return this.service.removerGrupo(id); }

  // Marcas
  @Get('marcas') listMarcas() { return this.service.listMarcas(); }
  @Post('marcas') criarMarca(@Body() b: any) { return this.service.criarMarca(b); }

  // Fonte única de venda (catálogo novo, normalizado)
  @Get('vendavel') vendavel() { return this.service.vendavel(); }

  // Itens
  @Get('itens') listItens(@Query() q: any) { return this.service.listItens(q); }
  @Get('itens/:id') getItem(@Param('id') id: string) { return this.service.getItem(id); }
  @Get('itens/:id/historico') historico(@Param('id') id: string) { return this.service.historicoItem(id); }
  @Post('itens') criarItem(@Body() b: any, @CurrentUser() user: any) { return this.service.criarItem(b, user); }
  @Patch('itens/:id') atualizarItem(@Param('id') id: string, @Body() b: any, @CurrentUser() user: any) { return this.service.atualizarItem(id, b, user); }
  @Post('itens/:id/arquivar') arquivar(@Param('id') id: string, @Body() b: any, @CurrentUser() user: any) { return this.service.arquivarItem(id, b?.arquivar !== false, user); }
  @Delete('itens/:id') excluir(@Param('id') id: string, @CurrentUser() user: any) { return this.service.excluirItem(id, user); }

  // Importar catálogo por CSV. dryRun=true → só prévia (não grava).
  @Post('importar') importar(@Body() b: { csv: string; dryRun?: boolean }) { return this.service.importarItens(b?.csv || '', { dryRun: !!b?.dryRun }); }
}

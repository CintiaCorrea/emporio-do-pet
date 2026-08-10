import { Module } from '@nestjs/common';
import { RegrasController } from './regras.controller';
import { RegrasService } from './regras.service';
import { LancamentosController } from './lancamentos.controller';
import { LancamentosService } from './lancamentos.service';
import { CadastrosController } from './cadastros.controller';
import { CadastrosService } from './cadastros.service';
import { ConciliacaoController } from './conciliacao.controller';
import { ConciliacaoService } from './conciliacao.service';
import { DreController } from './dre.controller';
import { DreService } from './dre.service';
import { RecorrenciasController } from './recorrencias.controller';
import { RecorrenciasService } from './recorrencias.service';
import { AgendaController } from './agenda.controller';
import { ParceriaController, EmprestimosController } from './parceria.controller';
import { ParceriaService } from './parceria.service';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { FornecedoresController } from './fornecedores.controller';
import { FornecedoresService } from './fornecedores.service';
import { RecebimentosController } from './recebimentos.controller';
import { RecebimentosService } from './recebimentos.service';
import { MapVendasController } from './mapvendas.controller';
import { MapVendasService } from './mapvendas.service';
import { DevolucaoController } from './devolucao.controller';
import { DevolucaoService } from './devolucao.service';

/**
 * Módulo Financeiro (DRE multi-unidade) — isolado do `finance` (FinanceEntry antigo).
 * Tabelas fin_ com prefixo, dinheiro em centavos, sem FK para o CRM.
 */
@Module({
  controllers: [
    RegrasController,
    LancamentosController,
    CadastrosController,
    ConciliacaoController,
    DreController,
    RecorrenciasController,
    AgendaController,
    ParceriaController,
    EmprestimosController,
    AuditoriaController,
    FornecedoresController,
    RecebimentosController,
    MapVendasController,
    DevolucaoController,
  ],
  providers: [
    RegrasService,
    LancamentosService,
    CadastrosService,
    ConciliacaoService,
    DreService,
    RecorrenciasService,
    ParceriaService,
    AuditoriaService,
    FornecedoresService,
    RecebimentosService,
    MapVendasService,
    DevolucaoService,
  ],
  exports: [
    RegrasService,
    LancamentosService,
    CadastrosService,
    ConciliacaoService,
    DreService,
    RecorrenciasService,
    ParceriaService,
  ],
})
export class FinanceiroModule {}

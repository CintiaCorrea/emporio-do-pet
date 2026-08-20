/**
 * Rotas de entrada do Portal do Tutor — /api/portal/*
 *
 * As tres primeiras sao abertas (é o login). Da GET /eu em diante, tudo passa
 * pelo PortalTutorGuard.
 */
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { PortalAuthService } from './portal-auth.service';
import { PortalEscopoService } from './portal-escopo.service';
import { PortalFichaService, FichaPayload } from './portal-ficha.service';
import { PortalInicioService } from './portal-inicio.service';
import { PortalAgendaHorariosService, SemHorarios } from './portal-agenda-horarios.service';
import { PortalAgendarService } from './portal-agendar.service';
import { PortalInternacaoService } from './portal-internacao.service';
import { PortalPetsService, NovoPet } from './portal-pets.service';
import { PortalPushService } from './portal-push.service';
import { PortalSaudeService } from './portal-saude.service';
import { PortalTutorGuard, RequestDoPortal, tokenDoRequest } from './portal-tutor.guard';

interface ReqComRede extends RequestDoPortal {
  ip?: string;
  socket?: { remoteAddress?: string };
}

function ipDoRequest(req: ReqComRede): string | undefined {
  const fwd = req.headers?.['x-forwarded-for'];
  const head = Array.isArray(fwd) ? fwd[0] : fwd;
  if (head) return head.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress;
}

function uaDoRequest(req: ReqComRede): string | undefined {
  const ua = req.headers?.['user-agent'];
  return Array.isArray(ua) ? ua[0] : ua;
}

@Controller('portal/auth')
export class PortalAuthController {
  constructor(private readonly auth: PortalAuthService) {}

  /** Passo 1: manda o codigo no WhatsApp. Resposta identica para qualquer numero. */
  @Post('codigo')
  async codigo(@Body() body: { telefone?: string }, @Req() req: ReqComRede) {
    return this.auth.solicitarCodigo(body?.telefone || '', ipDoRequest(req));
  }

  /** Passo 2: confere o codigo. Pode terminar em sessao, desempate ou sem cadastro. */
  @Post('verificar')
  async verificar(
    @Body() body: { telefone?: string; codigo?: string },
    @Req() req: ReqComRede,
  ) {
    return this.auth.verificarCodigo(body?.telefone || '', body?.codigo || '', {
      ip: ipDoRequest(req),
      userAgent: uaDoRequest(req),
    });
  }

  /** Passo 3 (so quando o telefone esta em mais de um cadastro). */
  @Post('escolher')
  async escolher(
    @Body() body: { desempateToken?: string; tutorId?: string },
    @Req() req: ReqComRede,
  ) {
    return this.auth.escolherCadastro(body?.desempateToken || '', body?.tutorId || '', {
      ip: ipDoRequest(req),
      userAgent: uaDoRequest(req),
    });
  }

  /** Encerra a sessao do aparelho. */
  @Post('sair')
  async sair(@Req() req: ReqComRede) {
    await this.auth.sair(tokenDoRequest(req));
    return { ok: true };
  }
}

@Controller('portal')
@UseGuards(PortalTutorGuard)
export class PortalMeController {
  constructor(
    private readonly escopo: PortalEscopoService,
    private readonly inicio: PortalInicioService,
    private readonly ficha: PortalFichaService,
    private readonly saude: PortalSaudeService,
    private readonly internacao: PortalInternacaoService,
    private readonly agendar: PortalAgendarService,
    private readonly horarios: PortalAgendaHorariosService,
    private readonly pets: PortalPetsService,
    private readonly push: PortalPushService,
  ) {}

  /** Quem sou eu + meus pets. O front nunca manda tutorId — ele vem do guard. */
  @Get('eu')
  async eu(@Req() req: RequestDoPortal) {
    const tutorId = req.portalTutorId!;
    const [tutor, pets] = await Promise.all([
      this.escopo.dadosDoTutor(tutorId),
      this.escopo.petsDoTutor(tutorId),
    ]);
    return { tutor, pets };
  }

  /** Tela Início: pets + alerta de internação. */
  @Get('inicio')
  async telaInicio(@Req() req: RequestDoPortal) {
    return this.inicio.home(req.portalTutorId!);
  }

  /** Tela Minha ficha (leitura). */
  @Get('ficha')
  async telaFicha(@Req() req: RequestDoPortal) {
    return this.ficha.ficha(req.portalTutorId!);
  }

  /** Dados da clínica (pro tutor imprimir a receita no papel timbrado). */
  @Get('clinica')
  async dadosClinica() {
    return this.saude.clinica();
  }

  /** Salvar a ficha. Entra direto no cadastro e fica no histórico. */
  @Patch('ficha')
  async salvarFicha(@Req() req: ReqComRede, @Body() corpo: FichaPayload) {
    return this.ficha.salvar(req.portalTutorId!, corpo, ipDoRequest(req));
  }

  // ---------------------------------------------------------------------------
  // Telas por pet. O petId vem da URL, então TODAS passam pelo porteiro antes
  // de qualquer consulta — é o que impede trocar o id no endereço e ver o pet
  // de outra pessoa.
  // ---------------------------------------------------------------------------

  @Get('pets/:petId/saude')
  async telaSaude(@Req() req: RequestDoPortal, @Param('petId') petId: string) {
    await this.escopo.assertPetDoTutor(req.portalTutorId!, petId);
    return this.saude.saude(petId);
  }

  @Get('pets/:petId/peso')
  async telaPeso(@Req() req: RequestDoPortal, @Param('petId') petId: string) {
    await this.escopo.assertPetDoTutor(req.portalTutorId!, petId);
    return this.saude.peso(petId);
  }

  @Get('pets/:petId/fisio')
  async telaFisio(@Req() req: RequestDoPortal, @Param('petId') petId: string) {
    await this.escopo.assertPetDoTutor(req.portalTutorId!, petId);
    const [pacotes, boletins] = await Promise.all([
      this.saude.fisio(petId),
      this.saude.boletinsFisio(petId),
    ]);
    return { pacotes, boletins };
  }

  /** Abre um documento do tutor (receita/exame). O porteiro está DENTRO do serviço. */
  @Get('documento/:id')
  async abrirDocumento(
    @Req() req: RequestDoPortal,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const f = await this.saude.arquivo(req.portalTutorId!, id);
    if (!f) throw new NotFoundException('Arquivo não encontrado');
    res.set({
      'Content-Type': f.contentType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(f.nome)}"`,
      'Cache-Control': 'private, no-store',
    });
    return new StreamableFile(f.buffer);
  }

  @Get('pets/:petId/dieta')
  async telaDieta(@Req() req: RequestDoPortal, @Param('petId') petId: string) {
    await this.escopo.assertPetDoTutor(req.portalTutorId!, petId);
    return this.saude.dieta(petId);
  }

  @Get('pets/:petId/internacao')
  async telaInternacao(@Req() req: RequestDoPortal, @Param('petId') petId: string) {
    await this.escopo.assertPetDoTutor(req.portalTutorId!, petId);
    return this.internacao.doPet(petId);
  }

  /**
   * Cadastrar um pet novo. Sem `confirmado`, responde com os pets de nome
   * parecido para o tutor dizer se e outro bicho mesmo.
   */
  @Post('pets')
  async criarPet(@Req() req: ReqComRede, @Body() corpo: NovoPet) {
    return this.pets.criar(req.portalTutorId!, corpo || {}, ipDoRequest(req));
  }

  // ---------------------------------------------------------------------------
  // Notificacoes (web push)
  // ---------------------------------------------------------------------------

  /** Chave publica (o navegador precisa dela) + se ja ha aparelho inscrito. */
  @Get('push/estado')
  async pushEstado(@Req() req: RequestDoPortal) {
    return {
      disponivel: this.push.ativo,
      chavePublica: this.push.chavePublica || null,
      aparelhos: await this.push.aparelhosDo(req.portalTutorId!),
    };
  }

  @Post('push/inscrever')
  async pushInscrever(@Req() req: ReqComRede, @Body() corpo: any) {
    return this.push.inscrever(req.portalTutorId!, corpo, uaDoRequest(req));
  }

  @Post('push/sair')
  async pushSair(@Req() req: RequestDoPortal, @Body() corpo: { endpoint?: string }) {
    return this.push.desinscrever(req.portalTutorId!, corpo?.endpoint);
  }

  /** Aviso de teste, para o tutor conferir que funcionou. */
  @Post('push/testar')
  async pushTestar(@Req() req: RequestDoPortal) {
    return this.push.testar(req.portalTutorId!);
  }

  // ---------------------------------------------------------------------------
  // Agendar
  // ---------------------------------------------------------------------------

  /** Serviços liberados + se o cliente está travado por desmarcações. */
  @Get('agendar/opcoes')
  async agendarOpcoes(@Req() req: RequestDoPortal) {
    return this.agendar.opcoes(req.portalTutorId!);
  }

  /** Dias com vaga para aquele pet e serviço. */
  @Get('agendar/dias')
  async agendarDias(
    @Req() req: RequestDoPortal,
    @Query('petId') petId: string,
    @Query('tipo') tipo: string,
    @Query('agenda') agenda?: string,
  ) {
    const tutorId = req.portalTutorId!;
    await this.escopo.assertPetDoTutor(tutorId, petId);
    try {
      return { dias: await this.horarios.proximosDias(tutorId, petId, tipo, 14, agenda || undefined) };
    } catch (e) {
      // Motivo de regra vira resposta explicável, não erro seco.
      if (e instanceof SemHorarios) return { dias: [], motivo: e.motivo };
      throw e;
    }
  }

  /** Marca de verdade: entra na agenda da equipe com a marca do portal. */
  @Post('agendar')
  async criarAgendamento(
    @Req() req: ReqComRede,
    @Body() corpo: { petId?: string; tipo?: string; inicio?: string; agenda?: string; terapias?: string[] },
  ) {
    const tutorId = req.portalTutorId!;
    await this.escopo.assertPetDoTutor(tutorId, corpo?.petId || '');
    return this.agendar.agendar(
      tutorId,
      { petId: corpo!.petId!, tipo: corpo?.tipo || '', inicio: corpo?.inicio || '', agenda: corpo?.agenda, terapias: corpo?.terapias },
      ipDoRequest(req),
    );
  }

  /** Meus próximos horários marcados pelo portal. */
  @Get('agendamentos')
  async meusAgendamentos(@Req() req: RequestDoPortal) {
    return { agendamentos: await this.agendar.meus(req.portalTutorId!) };
  }

  @Post('agendamentos/:id/desmarcar')
  async desmarcar(@Req() req: RequestDoPortal, @Param('id') id: string) {
    return this.agendar.desmarcar(req.portalTutorId!, id);
  }

  @Post('agendamentos/:id/remarcar')
  async remarcar(
    @Req() req: ReqComRede,
    @Param('id') id: string,
    @Body() corpo: { inicio?: string },
  ) {
    return this.agendar.remarcar(req.portalTutorId!, id, corpo?.inicio || '', ipDoRequest(req));
  }
}

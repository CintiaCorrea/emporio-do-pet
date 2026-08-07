import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CaixaService } from '../caixa/caixa.service';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';

// Digest de gestão: resumo semanal por e-mail pra administração (rito de revisão da Fase 5).
// Junta NPS + retenção/churn + key accounts (RFM) + números da semana. Reaproveita os serviços já prontos.
@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly caixa: CaixaService,
    private readonly avaliacoes: AvaliacoesService,
  ) {}

  // Toda segunda, 8h (fuso de Fortaleza).
  @Cron('0 8 * * 1', { timeZone: 'America/Fortaleza' })
  async cronSemanal() {
    // Anti-duplicidade: no máximo 1 envio a cada 6 dias (protege contra reinício do processo).
    const marca = await this.prisma.listaItem.findFirst({ where: { lista: 'digest_sent' }, orderBy: { createdAt: 'desc' } });
    if (marca) {
      try { if (Date.now() - new Date(JSON.parse(marca.valor).at).getTime() < 6 * 86400000) return; } catch { /* segue */ }
    }
    await this.enviar().catch((e) => this.logger.warn(`cronSemanal: ${e?.message || e}`));
  }

  async enviar() {
    const dados = await this.coletar();
    const html = this.montarHtml(dados);
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isBlocked: false },
      select: { email: true },
    });
    const emails = [...new Set(admins.map((a) => a.email).filter(Boolean))] as string[];
    if (!emails.length) emails.push('adm.emporiodopet@gmail.com');
    const hoje = new Date().toLocaleDateString('pt-BR');
    for (const to of emails) {
      await this.email
        .sendEmail({ to, subject: `📊 Empório do Pet — resumo da semana (${hoje})`, html, text: 'Resumo semanal de gestão. Abra o e-mail em HTML para ver os números.' })
        .catch((e) => this.logger.warn(`digest email ${to}: ${e?.message || e}`));
    }
    await this.prisma.listaItem.create({ data: { lista: 'digest_sent', valor: JSON.stringify({ at: new Date().toISOString() }) } }).catch(() => undefined);
    await this.prisma.listaItem.create({ data: { lista: 'digest_snapshot', valor: JSON.stringify({ at: new Date().toISOString(), ...dados.comparavel }) } }).catch(() => undefined);
    this.logger.log(`Digest de gestão enviado para ${emails.length} admin(s)`);
    return { enviados: emails.length, para: emails };
  }

  private async coletar() {
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400000);
    const d30 = new Date(now - 30 * 86400000);
    const [nps, ret, rfm, novos7, atend7, detr30, snapItem] = await Promise.all([
      this.avaliacoes.stats().catch(() => null),
      this.caixa.retencao().catch(() => null),
      this.caixa.rfm().catch(() => null),
      this.prisma.tutor.count({ where: { classificacao: 'Cliente', createdAt: { gte: d7 } } }).catch(() => 0),
      this.prisma.appointment.count({ where: { status: { in: ['COMPLETED', 'DONE'] as any }, date: { gte: d7, lte: new Date(now) } } }).catch(() => 0),
      this.prisma.avaliacaoNPS.count({ where: { classificacao: 'DETRATOR' as any, dataColeta: { gte: d30 } } }).catch(() => 0),
      this.prisma.listaItem.findFirst({ where: { lista: 'digest_snapshot' }, orderBy: { createdAt: 'desc' } }).catch(() => null),
    ]);
    let anterior: any = null;
    try { anterior = snapItem ? JSON.parse(snapItem.valor) : null; } catch { /* ignora */ }
    return { nps, ret, rfm, novos7, atend7, detr30, anterior, comparavel: { nps: nps?.nps ?? 0, atend7, novos7 } };
  }

  private delta(atual: number, ant?: number): string {
    if (ant == null || !isFinite(ant)) return '';
    const d = atual - ant;
    if (d === 0) return `<span style="color:#8A857A;font-size:12px"> · = igual</span>`;
    const cor = d > 0 ? '#0F7B5A' : '#B00000';
    const seta = d > 0 ? '▲' : '▼';
    return `<span style="color:${cor};font-size:12px"> · ${seta} ${d > 0 ? '+' : ''}${d} vs. semana passada</span>`;
  }

  private montarHtml(d: any): string {
    const nps = d.nps || {};
    const ret = d.ret || { linhas: { clinico: {}, fisio: {} }, pacotesFisio: {} };
    const rfm = d.rfm || { niveis: [] };
    const nivel = (k: string) => (rfm.niveis || []).find((x: any) => x.key === k)?.n || 0;
    const somaBucket = (b: string) => ((ret.linhas?.clinico?.[b]?.n || 0) + (ret.linhas?.fisio?.[b]?.n || 0));
    const ativos = somaBucket('ativos'), risco = somaBucket('risco'), inativos = somaBucket('inativos');
    const A = d.anterior || null;
    const card = (n: string, l: string, cor: string, extra = '') =>
      `<td style="width:33%;padding:6px"><div style="background:#F7FBFC;border:1px solid #E2ECEE;border-radius:12px;padding:14px 12px;text-align:center">
        <div style="font-size:28px;font-weight:800;color:${cor};line-height:1">${n}</div>
        <div style="font-size:11.5px;color:#5C6B70;margin-top:4px">${l}${extra}</div></div></td>`;
    const chip = (emoji: string, k: string, cor: string) =>
      `<span style="display:inline-block;background:#fff;border:1px solid #E8DFC8;border-radius:20px;padding:4px 10px;font-size:12.5px;margin:0 6px 6px 0"><b style="color:${cor}">${emoji} ${nivel(k)}</b> ${k}</span>`;

    return `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1F2A2E;max-width:640px;margin:0 auto">
      <div style="background:linear-gradient(120deg,#014D5E,#009AAC);color:#fff;border-radius:14px;padding:20px 22px">
        <div style="font-size:12px;opacity:.85;letter-spacing:.5px;font-weight:700">RESUMO SEMANAL DE GESTÃO</div>
        <div style="font-size:22px;font-weight:800;margin-top:2px">Empório do Pet 🐾</div>
        <div style="font-size:13px;opacity:.9;margin-top:2px">Como a clínica está — sem precisar abrir o sistema.</div>
      </div>

      <h3 style="color:#014D5E;font-size:14px;margin:22px 0 6px">📈 A semana em números</h3>
      <table style="width:100%;border-collapse:collapse"><tr>
        ${card(String(nps.nps ?? 0) + (nps.nps > 0 ? '' : ''), 'NPS (satisfação)', '#00798A', this.delta(nps.nps ?? 0, A?.nps))}
        ${card(String(d.atend7 || 0), 'Atendimentos (7 dias)', '#014D5E', this.delta(d.atend7 || 0, A?.atend7))}
        ${card(String(d.novos7 || 0), 'Clientes novos (7 dias)', '#0F7B5A', this.delta(d.novos7 || 0, A?.novos7))}
      </tr></table>

      <h3 style="color:#014D5E;font-size:14px;margin:22px 0 6px">🔄 Retenção da base (clínica + fisio)</h3>
      <table style="width:100%;border-collapse:collapse"><tr>
        ${card(String(ativos), 'Ativos (até 90 dias)', '#1B9E5A')}
        ${card(String(risco), 'Em risco (91–180d)', '#D9A400')}
        ${card(String(inativos), 'Inativos (+180d)', '#C0392B')}
      </tr></table>
      ${ret.pacotesFisio?.ultimaSessao ? `<p style="font-size:13px;color:#8A6400;background:#FBF3E3;border:1px solid #efe1c2;border-radius:8px;padding:9px 12px;margin:8px 0 0">📦 <b>${ret.pacotesFisio.ultimaSessao}</b> pacote(s) de fisio na última sessão — hora de oferecer renovação.</p>` : ''}

      <h3 style="color:#014D5E;font-size:14px;margin:22px 0 6px">💎 Key accounts (seus melhores clientes)</h3>
      <div>${chip('💎', 'Diamante', '#3C3489')}${chip('🥇', 'Ouro', '#8A5A0B')}${chip('🥈', 'Prata', '#49555C')}${chip('🥉', 'Bronze', '#7A4A1E')}</div>

      ${d.detr30 > 0 ? `<div style="margin-top:20px;background:#FDECEC;border:1px solid #f3d2d2;border-left:5px solid #B00000;border-radius:10px;padding:12px 14px">
        <b style="color:#B00000">🔴 ${d.detr30} cliente(s) insatisfeito(s) nos últimos 30 dias.</b>
        <div style="font-size:13px;color:#5C6B70;margin-top:3px">Vale conferir a fila de retornos em <b>Hoje</b> e a tela de NPS pra fechar o loop com eles.</div>
      </div>` : `<div style="margin-top:20px;background:#EAF7F0;border:1px solid #bfe6cd;border-radius:10px;padding:12px 14px;color:#0F7B5A;font-size:13.5px">✅ Nenhum cliente insatisfeito nos últimos 30 dias. Ótimo sinal!</div>`}

      <p style="color:#8A857A;font-size:11.5px;border-top:1px solid #eee;padding-top:12px;margin-top:24px">Resumo automático do sistema Empório do Pet · enviado toda segunda-feira. Para acompanhar ao vivo: menu <b>Inteligência</b> (Retenção, Relacionamento) e <b>Marketing › NPS</b>.</p>
    </div>`;
  }
}

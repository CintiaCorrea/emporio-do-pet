import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 👻 AGENTE SOMBRA (Fase 1 — treino). Lê cada mensagem de cliente e escreve a resposta
 * que ELE daria — mas NUNCA envia nada. As sugestões ficam em `ghost_sombra` para a
 * tela "Agente Sombra", onde a administração avalia (👍/👎/corrige) e ele aprende.
 *
 * TRAVAS DE FERRO (exigência da Cintia, 23/07 — valem pro sombra E pro futuro agente):
 *  - JAMAIS dá diagnóstico, sugere tratamento/conduta ou indica/prescreve medicamento.
 *    Assunto clínico = acolher e passar para a equipe veterinária.
 *  - JAMAIS inventa preço: só usa a tabela de serviços cadastrada; sem valor = "confirmo
 *    com a equipe".
 */
@Injectable()
export class GhostSombraListener {
  private readonly logger = new Logger(GhostSombraListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('whatsapp.message.received')
  async handle(payload: any): Promise<void> {
    try {
      const conv = payload?.conversation;
      const content = (payload?.content || '').toString().trim();
      if (!conv?.id || !content) return;

      // Interruptor mestre (tela Agente Sombra). Desligado = não gera nada.
      const cfgItem = await this.prisma.listaItem.findFirst({ where: { lista: 'config_ghost_sombra' } });
      let ativo = false;
      if (cfgItem) { try { ativo = !!JSON.parse(cfgItem.valor).ativo; } catch { /* ilegível = desligado */ } }
      if (!ativo) return;

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) return;

      // Custo/rajada: no máx. 1 sugestão por conversa a cada 3 min — a sugestão lê o
      // histórico recente, então uma rajada de mensagens vira UMA resposta ao conjunto.
      const tresMinAtras = new Date(Date.now() - 3 * 60 * 1000);
      const recente = await this.prisma.listaItem.findFirst({
        where: { lista: 'ghost_sombra', valor: { contains: `"conversationId":"${conv.id}"` }, createdAt: { gte: tresMinAtras } },
      });
      if (recente) return;

      // ---------- contexto ----------
      const msgs = await this.prisma.whatsAppMessage.findMany({
        where: { conversationId: conv.id },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { direction: true, content: true, type: true },
      });
      const historico = msgs.reverse()
        .map((m) => `${m.direction === 'INBOUND' ? 'CLIENTE' : 'EQUIPE'}: ${m.content || `[${String(m.type || 'mídia').toLowerCase()}]`}`)
        .join('\n');

      let clienteCtx = `Contato: ${conv.contactName || payload?.contactName || 'cliente'}`;
      if (conv.tutorId) {
        const tutor = await this.prisma.tutor.findUnique({
          where: { id: conv.tutorId },
          select: { name: true, pets: { select: { name: true, species: true, breed: true }, take: 5 } },
        });
        if (tutor) {
          clienteCtx = `Cliente: ${tutor.name}`;
          if (tutor.pets?.length) clienteCtx += ` | Pets: ${tutor.pets.map((p) => `${p.name} (${[p.species, p.breed].filter(Boolean).join(' ')})`).join(', ')}`;
        }
      }

      // Tabela de preços REAL — só serviços com valor cadastrado. Vazia = não citar valor.
      const servicos = await this.prisma.servico.findMany({
        where: { valorPadrao: { gt: 0 } },
        select: { nome: true, valorPadrao: true },
        take: 120,
      });
      const tabela = servicos.length
        ? servicos.map((s) => `- ${s.nome}: R$ ${Number(s.valorPadrao).toFixed(2)}`).join('\n')
        : '(tabela de preços ainda NÃO cadastrada — não informe NENHUM valor)';

      // Dados da clínica (Config › Dados da clínica), se preenchidos.
      let clinica = '';
      const dc = await this.prisma.listaItem.findFirst({ where: { lista: 'dadosclinica' } });
      if (dc) { try { const v = JSON.parse(dc.valor); clinica = [v.nome, v.endereco, v.telefone, v.horario, v.horarioFuncionamento].filter(Boolean).join(' | '); } catch { /* segue sem */ } }

      // ---------- prompt (com as travas de ferro) ----------
      const system = [
        'Você é atendente do Empório do Pet, clínica veterinária e estética animal em Fortaleza (CE).',
        'Escreva UMA resposta de WhatsApp à última mensagem do cliente: curta, calorosa e profissional, em português brasileiro. Pode usar 💛 e 🐾 com moderação.',
        '',
        'REGRAS DE FERRO — NUNCA quebre, mesmo que o cliente insista:',
        '1. NUNCA dê diagnóstico, hipótese diagnóstica ou avaliação clínica de sintomas.',
        '2. NUNCA sugira tratamento, conduta ou procedimento clínico.',
        '3. NUNCA indique, recomende ou prescreva medicamento, vermífugo, vacina ou dose — nem "pode dar tal remédio".',
        '   → Em QUALQUER assunto de saúde/clínico: acolha com carinho, diga que vai passar para a equipe veterinária avaliar e ofereça agendar uma consulta/avaliação.',
        '4. PREÇOS: use SOMENTE a tabela abaixo. Se o item não está na tabela, NÃO invente valor — diga que confirma o valor com a equipe e já retorna.',
        '5. AGENDA: você ainda não enxerga os horários livres. Se pedirem horário, pergunte a preferência (dia/turno) e diga que confirma a disponibilidade em seguida.',
        '6. Não invente serviços, endereços ou políticas. Não souber = "vou confirmar com a equipe".',
        '',
        'DADOS:',
        clienteCtx,
        clinica ? `Clínica: ${clinica}` : '',
        'TABELA DE PREÇOS:',
        tabela,
      ].filter((l) => l !== '').join('\n');

      const userMsg = `HISTÓRICO DA CONVERSA (mais antiga primeiro):\n${historico}\n\nEscreva a resposta que você enviaria agora.`;

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.4,
          max_tokens: 350,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userMsg },
          ],
        }),
      });
      if (!resp.ok) { this.logger.warn(`Ghost: OpenAI respondeu ${resp.status}`); return; }
      const data: any = await resp.json().catch(() => null);
      const sugestao = data?.choices?.[0]?.message?.content?.trim();
      if (!sugestao) return;

      // Guarda a sugestão — NUNCA envia. A tela Agente Sombra lê daqui.
      await this.prisma.listaItem.create({
        data: {
          lista: 'ghost_sombra',
          valor: JSON.stringify({
            conversationId: conv.id,
            tutorId: conv.tutorId || null,
            contato: conv.contactName || payload?.contactName || '',
            clienteMsg: content.slice(0, 600),
            sugestao,
            at: new Date().toISOString(),
          }),
        },
      });
      this.logger.log(`👻 Sugestão sombra gerada (conversa ${conv.id})`);
    } catch (e: any) {
      this.logger.warn(`GhostSombraListener: ${e?.message || e}`);
    }
  }
}

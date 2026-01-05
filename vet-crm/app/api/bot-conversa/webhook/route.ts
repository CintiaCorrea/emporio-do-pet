import { NextRequest, NextResponse } from 'next/server';
import { BotConversaWebhookPayload } from '@/types/bot-conversa';
import { conversationFlowService } from '@/lib/conversation-flow';
import { processBotConversaMessage } from '@/lib/bot-conversa-processor';

export async function POST(request: NextRequest) {
  try {
    const payload: BotConversaWebhookPayload = await request.json();

    // Verificar se é uma mensagem válida
    if (payload.type !== 'message' || !payload.message || !payload.contact) {
      return NextResponse.json({ success: true });
    }

    // Processar a mensagem de forma assíncrona
    processBotConversaMessage(payload).catch(console.error);

    // Responder imediatamente ao BotConversa
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing BotConversa webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

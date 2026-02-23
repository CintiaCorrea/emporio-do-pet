import { NextRequest, NextResponse } from 'next/server';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getBackendUrl(): string | undefined {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : undefined)
  );
}

function getVerifyToken(): string {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || '';
}

// ─── GET  — Meta Webhook Verification ───────────────────────────────────────
// Meta envia um GET com hub.mode, hub.verify_token e hub.challenge.
// Precisamos responder com o valor de hub.challenge se o token for válido.

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log(
    `[WhatsApp Webhook] Verification request: mode=${mode}, token=${token ? '[PRESENT]' : '[MISSING]'}, challenge=${challenge ? '[PRESENT]' : '[MISSING]'}`,
  );

  if (mode !== 'subscribe') {
    console.warn('[WhatsApp Webhook] Invalid mode for verification');
    return new NextResponse('Invalid mode', { status: 403 });
  }

  if (!token || !challenge) {
    console.warn('[WhatsApp Webhook] Missing token or challenge');
    return new NextResponse('Missing parameters', { status: 400 });
  }

  // Verificar contra o token de ambiente
  const verifyToken = getVerifyToken();

  if (verifyToken && token === verifyToken) {
    console.log('[WhatsApp Webhook] Verification successful (env token match)');
    // Meta espera receber o challenge como texto puro (não JSON)
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // Se não bateu com o token de env, tentar verificar no backend (que também
  // valida tokens por usuário armazenados no banco)
  const backendUrl = getBackendUrl();
  if (backendUrl) {
    try {
      const backendVerifyUrl = new URL('/webhook/whatsapp', backendUrl);
      backendVerifyUrl.searchParams.set('hub.mode', mode);
      backendVerifyUrl.searchParams.set('hub.verify_token', token);
      backendVerifyUrl.searchParams.set('hub.challenge', challenge);

      const backendRes = await fetch(backendVerifyUrl.toString(), {
        method: 'GET',
        signal: AbortSignal.timeout(8000),
      });

      if (backendRes.ok) {
        const text = await backendRes.text();
        if (text === challenge) {
          console.log('[WhatsApp Webhook] Verification successful (backend token match)');
          return new NextResponse(challenge, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      }
    } catch (err) {
      console.error('[WhatsApp Webhook] Backend verification fallback failed:', err);
    }
  }

  console.warn('[WhatsApp Webhook] Verification failed - invalid token');
  return new NextResponse('Verification failed', { status: 403 });
}

// ─── POST — Incoming Messages & Status Updates ─────────────────────────────
// Meta envia mensagens e atualizações de status via POST.
// Encaminhamos diretamente ao backend NestJS para processamento.

export async function POST(request: NextRequest) {
  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    console.error('[WhatsApp Webhook] BACKEND_URL not configured');
    // Sempre retornar 200 para o Meta não reenviar indefinidamente
    return NextResponse.json({ status: 'received' }, { status: 200 });
  }

  try {
    // Ler o body como texto para preservar a assinatura
    const rawBody = await request.text();

    // Extrair o header de assinatura do Meta
    const signature = request.headers.get('x-hub-signature-256') || '';

    const upstreamUrl = `${backendUrl.replace(/\/$/, '')}/webhook/whatsapp`;

    const backendRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'x-hub-signature-256': signature } : {}),
      },
      body: rawBody,
      signal: AbortSignal.timeout(15000),
    });

    const responseText = await backendRes.text();
    console.log(
      `[WhatsApp Webhook] Backend responded: ${backendRes.status} - ${responseText}`,
    );

    // Sempre retornar 200 para o Meta
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[WhatsApp Webhook] Error forwarding to backend:', err);
    // Retornar 200 mesmo em caso de erro para evitar retentativas do Meta
    return new NextResponse('OK', { status: 200 });
  }
}

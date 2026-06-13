import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import crypto from 'crypto';

export const runtime = 'nodejs';

function sha1Hex(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex');
}

function buildCloudinarySignature(params: Record<string, string>) {
  // Cloudinary signature: sort keys alphabetically, join key=value with &
  const toSign = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) throw new Error('CLOUDINARY_API_SECRET não configurado');

  return sha1Hex(`${toSign}${apiSecret}`);
}

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const cloudNameRaw = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const cloudName = (cloudNameRaw || '').trim().toLowerCase();
  const apiKeyLast4 = apiKey ? apiKey.slice(-4) : '';

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error: 'Cloudinary não configurado (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)',
        diagnostics: {
          cloudName: cloudName || null,
          apiKeyLast4: apiKeyLast4 || null,
          hasApiSecret: Boolean(apiSecret),
        },
      },
      { status: 500 }
    );
  }

  // Cloud name is typically lowercase alphanumerics (and may include hyphens).
  // Normalize above; also guard against obvious invalid values to help debugging.
  if (!/^[a-z0-9-]+$/.test(cloudName)) {
    return NextResponse.json(
      {
        error:
          'CLOUDINARY_CLOUD_NAME inválido. Use o "Cloud name" do painel do Cloudinary (ex.: emporiodopet).',
      },
      { status: 500 }
    );
  }

  // Validate config early (Cloudinary ping requires Basic Auth with API key/secret).
  try {
    const basic = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const pingRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
      method: 'GET',
      headers: { Authorization: `Basic ${basic}` },
    });
    if (!pingRes.ok) {
      const raw = await pingRes.text();
      let pingMessage: string | undefined;
      try {
        const parsed = raw ? (JSON.parse(raw) as any) : null;
        pingMessage = parsed?.error?.message;
      } catch {
        pingMessage = undefined;
      }

      const messageText = typeof pingMessage === 'string' && pingMessage.trim().length > 0 ? pingMessage : raw;
      const looksLikeInvalidCredentials =
        messageText.includes('Invalid credentials') || messageText.includes('invalid credentials');

      return NextResponse.json(
        {
          error: looksLikeInvalidCredentials
            ? 'Cloudinary: credenciais inválidas. Confira CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET.'
            : 'Cloudinary: configuração inválida. Confira CLOUDINARY_CLOUD_NAME (cloud name do Dashboard).',
          diagnostics: {
            cloudName,
            apiKeyLast4,
            pingStatus: pingRes.status,
            pingMessage: String(messageText).slice(0, 500),
          },
        },
        { status: 500 }
      );
    }
  } catch {
    // Ignore ping failures (network), continue and let upload fail with proper error.
  }

  const token = await getToken({ req: request as any, secret: process.env.NEXTAUTH_SECRET });
  const userId = token?.id;
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  let folder = 'emporio-do-pet/avatars';
  let public_id = `user_${userId}`;

  // Optional: pet avatar signature (used by /dashboard/erp/pets/*)
  if (body && typeof body === 'object' && body.kind === 'petAvatar') {
    const petKeyRaw = typeof body.petKey === 'string' ? body.petKey : '';
    const petKey = petKeyRaw.trim();

    // allow only safe chars to avoid abusing public_id/folder
    if (!petKey || petKey.length > 80 || !/^[a-zA-Z0-9_-]+$/.test(petKey)) {
      return NextResponse.json({ error: 'petKey inválido' }, { status: 400 });
    }

    folder = 'emporio-do-pet/pets';
    public_id = `pet_${userId}_${petKey}`;
  }

  if (body && typeof body === 'object' && body.kind === 'internalDoc') {
    folder = 'emporio-do-pet/internal-docs';
    public_id = `doc_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Params to be signed (excluding file, api_key, resource_type, etc.)
  const signParams: Record<string, string> = {
    folder,
    public_id,
    overwrite: 'true',
    invalidate: 'true',
    timestamp,
  };

  try {
    const signature = buildCloudinarySignature(signParams);

    return NextResponse.json({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      publicId: public_id,
      overwrite: true,
      invalidate: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao gerar assinatura';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


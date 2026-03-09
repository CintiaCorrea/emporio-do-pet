/**
 * Setup WhatsApp Webhook with Meta Graph API.
 *
 * This script:
 *   1. Starts an ngrok tunnel pointing to the backend
 *   2. Registers (or updates) the webhook URL with Meta
 *   3. Subscribes to the required webhook fields
 *
 * Prerequisites:
 *   - ngrok installed and authenticated (`ngrok config add-authtoken <token>`)
 *   - Backend running on PORT (default 3333)
 *   - WHATSAPP_APP_ID env var set (the Facebook App ID)
 *
 * Usage:
 *   npx ts-node scripts/setup-webhook.ts
 *   npx ts-node scripts/setup-webhook.ts --url https://your-domain.com  (skip ngrok)
 */

import * as fs from 'fs';
import * as path from 'path';

// Load .env manually (no dotenv dependency needed)
const envPath = path.resolve(__dirname, '../backend/.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const BACKEND_PORT = process.env.PORT || '3333';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
const WHATSAPP_APP_ID = process.env.WHATSAPP_APP_ID;
const API_VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0';

async function getPublicUrl(): Promise<string> {
  const manualUrl = process.argv.find((a) => a.startsWith('--url='))?.split('=')[1]
    || (process.argv.indexOf('--url') !== -1 ? process.argv[process.argv.indexOf('--url') + 1] : null);

  if (manualUrl) {
    console.log(`📌 Using provided URL: ${manualUrl}`);
    return manualUrl.replace(/\/$/, '');
  }

  console.log(`🔗 Starting ngrok tunnel to localhost:${BACKEND_PORT}...`);

  const { execSync } = await import('child_process');

  // Start ngrok in background (cross-platform)
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      execSync(`start "" /B ngrok http ${BACKEND_PORT} --log=stdout > NUL 2>&1`, {
        shell: 'cmd.exe',
        timeout: 3000,
      });
    } else {
      execSync(`ngrok http ${BACKEND_PORT} --log=stdout > /dev/null 2>&1 &`, {
        shell: '/bin/bash',
        timeout: 3000,
      });
    }
  } catch {
    // Expected — ngrok forks to background
  }

  // Wait for ngrok to start
  await new Promise((r) => setTimeout(r, 3000));

  // Get the public URL from ngrok's local API
  try {
    const res = await fetch('http://127.0.0.1:4040/api/tunnels');
    const data = await res.json() as { tunnels: Array<{ public_url: string; proto: string }> };
    const https = data.tunnels.find((t) => t.proto === 'https');
    if (https) {
      console.log(`✅ ngrok tunnel: ${https.public_url}`);
      return https.public_url;
    }
  } catch {
    // ngrok API not reachable
  }

  console.error('❌ Could not get ngrok URL. Make sure ngrok is installed and running.');
  console.error('   You can also pass --url https://your-domain.com to skip ngrok.');
  console.error('\n   To install ngrok: https://ngrok.com/download');
  console.error('   Or run manually: ngrok http 3333');
  process.exit(1);
}

async function verifyWebhookEndpoint(baseUrl: string): Promise<boolean> {
  const verifyUrl = `${baseUrl}/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test_challenge_123`;
  console.log(`\n🔍 Verifying webhook endpoint is reachable...`);

  try {
    const res = await fetch(verifyUrl);
    const text = await res.text();
    if (res.ok && text === 'test_challenge_123') {
      console.log('✅ Webhook verification endpoint is working!');
      return true;
    }
    console.warn(`⚠️  Webhook returned: ${res.status} — ${text}`);
    return false;
  } catch (err) {
    console.warn(`⚠️  Could not reach webhook endpoint: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

async function registerWebhookWithMeta(webhookUrl: string): Promise<void> {
  if (!WHATSAPP_APP_ID) {
    console.log('\n⚠️  WHATSAPP_APP_ID not set in .env — skipping automatic Meta registration.');
    console.log('   You need to register the webhook manually in the Meta Developer Portal:');
    console.log(`   URL:          ${webhookUrl}/api/webhook/whatsapp`);
    console.log(`   Verify Token: ${VERIFY_TOKEN}`);
    console.log('   Fields:       messages');
    console.log('\n   Go to: https://developers.facebook.com/apps → Your App → WhatsApp → Configuration');
    return;
  }

  console.log(`\n📡 Registering webhook with Meta (App ID: ${WHATSAPP_APP_ID})...`);

  const callbackUrl = `${webhookUrl}/api/webhook/whatsapp`;

  // Subscribe the app to the webhook
  const subscribeUrl = `https://graph.facebook.com/${API_VERSION}/${WHATSAPP_APP_ID}/subscriptions`;
  const res = await fetch(subscribeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      object: 'whatsapp_business_account',
      callback_url: callbackUrl,
      verify_token: VERIFY_TOKEN,
      fields: 'messages',
      access_token: ACCESS_TOKEN,
    }),
  });

  const data = await res.json() as { success?: boolean; error?: { message: string } };

  if (data.success) {
    console.log('✅ Webhook registered with Meta successfully!');
    console.log(`   Callback URL: ${callbackUrl}`);
  } else {
    console.error('❌ Failed to register webhook:', JSON.stringify(data, null, 2));
    console.log('\n   Manual registration instructions:');
    console.log(`   URL:          ${callbackUrl}`);
    console.log(`   Verify Token: ${VERIFY_TOKEN}`);
    console.log('   Fields:       messages');
    console.log('   Go to: https://developers.facebook.com/apps → Your App → WhatsApp → Configuration');
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Empório do Pet — WhatsApp Webhook Setup       ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (!ACCESS_TOKEN) {
    console.error('❌ WHATSAPP_ACCESS_TOKEN not set in backend/.env');
    process.exit(1);
  }
  if (!VERIFY_TOKEN) {
    console.error('❌ WHATSAPP_WEBHOOK_VERIFY_TOKEN not set in backend/.env');
    process.exit(1);
  }

  const baseUrl = await getPublicUrl();
  const reachable = await verifyWebhookEndpoint(baseUrl);

  if (!reachable) {
    console.log('\n⚠️  The webhook endpoint is not reachable yet.');
    console.log('   Make sure the backend is running: cd backend && pnpm start:dev');
    console.log('   Continuing with Meta registration anyway...\n');
  }

  await registerWebhookWithMeta(baseUrl);

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                    Summary                       ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Public URL: ${baseUrl.padEnd(37)}║`);
  console.log(`║  Webhook:    ${(baseUrl + '/api/webhook/whatsapp').substring(0, 37).padEnd(37)}║`);
  console.log(`║  Reachable:  ${(reachable ? 'Yes ✅' : 'No ❌').padEnd(37)}║`);
  console.log('╚══════════════════════════════════════════════════╝');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});

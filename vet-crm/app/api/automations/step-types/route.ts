import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/automations/step-types - Lista tipos de steps
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/automations/step-types', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/automations/trigger-types - Lista tipos de triggers
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/automations/trigger-types', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

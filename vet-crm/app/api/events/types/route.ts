import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/events/types - Lista tipos de eventos disponíveis
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/events/types', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

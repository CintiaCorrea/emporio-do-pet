import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/agent-templates/defaults', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

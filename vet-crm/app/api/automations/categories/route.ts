import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/automations/categories - Lista categorias de automações
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/automations/categories', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

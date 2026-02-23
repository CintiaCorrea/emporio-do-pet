import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/templates/categories - Lista categorias de templates
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/templates/categories', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

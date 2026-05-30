import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function POST(request: NextRequest) {
  return backendProxy(request, '/listas/tipos/seed', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
}

import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/email-templates/import-batch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
  });
}

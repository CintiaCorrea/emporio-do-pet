import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

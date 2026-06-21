import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ doseId: string }> }) {
  const { doseId } = await params;
  const body = await request.text();
  return backendProxy(request, `/protocolos/doses/${doseId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
}

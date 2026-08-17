import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ appointmentId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { appointmentId } = await params;
  const body = await request.text().catch(() => '');
  return proxyToBackend(request, `/financeiro/devolucao/${appointmentId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}

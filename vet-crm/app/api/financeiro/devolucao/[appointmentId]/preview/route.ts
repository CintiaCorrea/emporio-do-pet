import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

interface RouteParams {
  params: Promise<{ appointmentId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { appointmentId } = await params;
  return proxyToBackend(request, `/financeiro/devolucao/${appointmentId}/preview`, { method: 'GET' });
}

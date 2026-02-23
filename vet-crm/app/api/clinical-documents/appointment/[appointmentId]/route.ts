import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/clinical-documents/appointment/:appointmentId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;
  return proxyToBackend(request, `/clinical-documents/appointment/${appointmentId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/consultation-recordings/appointment/:appointmentId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;
  
  return proxyToBackend(request, `/consultation-recordings/appointment/${appointmentId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

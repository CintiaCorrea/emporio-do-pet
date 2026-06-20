import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  return proxyToBackend(request, `/clinical-documents/pet/${encodeURIComponent(petId)}${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

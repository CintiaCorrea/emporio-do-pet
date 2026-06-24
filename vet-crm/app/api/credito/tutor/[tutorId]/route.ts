import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ tutorId: string }> }) {
  const { tutorId } = await params;
  return proxyToBackend(request, `/credito/tutor/${encodeURIComponent(tutorId)}`, { method: 'GET' });
}

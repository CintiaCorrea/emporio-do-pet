import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/tutors/${encodeURIComponent(id)}/reclassify-as-lead`, {
    method: 'POST',
  });
}

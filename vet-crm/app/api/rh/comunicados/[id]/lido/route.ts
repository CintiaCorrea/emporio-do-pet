import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// POST: funcionário confirma ciência do comunicado ("Li e estou ciente").
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/rh/comunicados/${encodeURIComponent(id)}/lido`, { method: 'POST' });
}

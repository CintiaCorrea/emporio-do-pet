import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Quem está usando o portal do tutor. Rota da equipe — o guard de funcionário está no backend.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/portal/admin/uso', { method: 'GET' });
}

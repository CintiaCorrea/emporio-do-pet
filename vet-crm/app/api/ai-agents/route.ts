import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// GET /api/ai-agents — lista agentes IA configurados
export async function GET(request: NextRequest) {
  return backendProxy(request, '/agents');
}

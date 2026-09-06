import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Cria exames no Kanban a partir de uma origem que não é a venda — hoje, a conta da
// internação. Até 05/09/2026 exame lançado na internação ficava só na conta: era cobrado,
// mas ninguém sabia que havia exame para coletar, mandar ao laboratório e cobrar resultado.
export async function POST(request: NextRequest) {
  return proxyToBackend(request, '/exames/iniciar', { method: 'POST' });
}

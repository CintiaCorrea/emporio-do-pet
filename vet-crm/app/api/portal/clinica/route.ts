import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

/** Dados da clínica (nome/endereço/telefones) — pro tutor imprimir a receita no papel timbrado. */
export async function GET(request: NextRequest) {
  const { resposta } = await chamarPortal(request, '/portal/clinica');
  return resposta;
}

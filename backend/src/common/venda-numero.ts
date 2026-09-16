// [EMP-COWORK] Numeração sequencial VISÍVEL da venda (numeroVenda), começa em 1001.
// Atribui o número UMA vez, quando o atendimento vira venda (value>0 / recebimento).
// numeração "nova nossa" (o número do SimplesVet fica em codigoExterno p/ conciliação).

import { ehRegistroDeInternacao, ehTipoDeOrcamento } from '../modules/crm/consulta-vendas.regras';

const NUMERO_INICIAL = 1000; // primeiro número atribuído será 1001

// Idempotente + seguro contra concorrência:
// - só atribui se ainda estiver nulo (updateMany com where numeroVenda:null)
// - se dois processos pegarem o mesmo próximo número, o @unique barra um deles e ele tenta de novo
export async function ensureNumeroVenda(prisma: any, appointmentId: string): Promise<number | null> {
  if (!appointmentId) return null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const ap = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { numeroVenda: true, type: true, notes: true } });
    if (!ap) return null;
    if (ap.numeroVenda != null) return ap.numeroVenda; // já tem número
    // O REGISTRO DE INTERNAÇÃO NÃO É VENDA, mesmo com valor: o valor dele é a diária combinada,
    // e a conta sai em vendas próprias. Ganhar número o transformava em dívida falsa no ponto de
    // venda e em Vendas em aberto — a #1174 do Reginaldo (R$ 150), achada em 16/09/2026.
    // Orçamento é proposta. Regra única: crm/consulta-vendas.regras (ehVenda).
    if (ehRegistroDeInternacao(ap) || ehTipoDeOrcamento(ap.type)) return null;

    const max = await prisma.appointment.aggregate({ _max: { numeroVenda: true } });
    const next = Math.max(NUMERO_INICIAL, Number(max._max.numeroVenda) || 0) + 1;

    try {
      const res = await prisma.appointment.updateMany({
        where: { id: appointmentId, numeroVenda: null },
        data: { numeroVenda: next },
      });
      if (res.count === 0) {
        // outro processo numerou este mesmo atendimento nesse meio-tempo: lê o número final
        const ap2 = await prisma.appointment.findUnique({ where: { id: appointmentId }, select: { numeroVenda: true } });
        return ap2?.numeroVenda ?? null;
      }
      return next;
    } catch (e: any) {
      // colisão do @unique com outra venda concorrente → recomeça e pega o próximo
      if (attempt === 5) throw e;
    }
  }
  return null;
}

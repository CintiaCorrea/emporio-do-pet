// OS DADOS DO RECIBO — uma montagem só, usada pelo papel (recibo-print) e pelo PDF do WhatsApp
// (recibo-pdf). Cintia, 17/09/2026: recibo com timbrado, uma via, com o descritivo dos serviços,
// e "podemos enviar o recibo direto pelo whatsapp também? em PDF de preferência".
//
// Conteúdo igual nos dois formatos: o que muda é só o desenho.
import { carregarPetTutorParaImpressao } from "@/lib/documentos/petCompleto";
import { valorPorExtenso } from "@/lib/documentos/valorPorExtenso";

export type BaixaDoRecibo = {
  /** Recebimento: valor, data, formas e desconto. */
  valorTotal?: number | null;
  data?: string | null;
  formas?: any;
  desconto?: number | null;
  descontoItens?: { valor?: number | null }[] | null;
  /** A venda quitada por esta baixa. */
  appointment?: { id?: string; numeroVenda?: number | null; petId?: string | null; pet?: { name?: string | null } | null; tutor?: { id?: string; name?: string | null } | null } | null;
};

export type ItemDoRecibo = { descricao: string; quantidade: number; valorTotal: number };
export type VendaDoRecibo = { numero: number | null; pet: string | null; itens: ItemDoRecibo[] };

export type DadosDoRecibo = {
  total: number;
  porExtenso: string;
  desconto: number;
  formasStr: string;
  data: string;
  tutor: any;
  tutorNome: string;
  tutorId: string | null;
  cpf: string | null;
  pet: any;
  petNome: string | null;
  vendas: VendaDoRecibo[];
};

const formasDe = (f: any): any[] => (Array.isArray(f) ? f.flat() : []).filter((x: any) => x && typeof x === "object" && !Array.isArray(x));

/** "InfinityPay (Crédito parcelado · 2x · Visa/Mastercard)" */
export function rotuloDaForma(f: any): string {
  const n = Math.trunc(Number(f?.parcelas) || 0);
  const detalhe = [f?.modalidade, n > 1 ? `${n}x` : null, f?.bandeira].filter(Boolean).join(" · ");
  return `${f?.forma || "Sem forma"}${detalhe ? ` (${detalhe})` : ""}`;
}

/** Busca o que falta (cliente completo com CPF e os itens de cada venda) e monta o recibo. */
export async function montarDadosDoRecibo(baixas: BaixaDoRecibo[]): Promise<DadosDoRecibo | null> {
  const lista = (baixas || []).filter(Boolean);
  if (!lista.length) return null;

  const total = Number(lista.reduce((s, b) => s + (Number(b.valorTotal) || 0), 0).toFixed(2));
  const desconto = Number(lista.reduce(
    (s, b) => s + (Number(b.desconto) || 0) + (Array.isArray(b.descontoItens) ? b.descontoItens.reduce((x, d) => x + (Number(d?.valor) || 0), 0) : 0),
    0,
  ).toFixed(2));
  const formasStr = [...new Set(lista.flatMap((b) => formasDe(b.formas)).map(rotuloDaForma))].join(" + ");

  const primeira = lista[0];
  const tutorFallback = primeira.appointment?.tutor?.name ? { name: primeira.appointment.tutor.name, id: primeira.appointment.tutor.id } : undefined;
  const { pet, tutor } = await carregarPetTutorParaImpressao(primeira.appointment?.petId || undefined, primeira.appointment?.pet || undefined, tutorFallback);

  const vendas: VendaDoRecibo[] = [];
  for (const b of lista) {
    const id = b.appointment?.id;
    let itens: any[] = [];
    if (id) {
      try {
        const v = await fetch(`/api/appointments/${id}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
        itens = (v?.items || v?.itens || []) as any[];
      } catch { /* sem rede: sai sem o descritivo desta venda */ }
    }
    vendas.push({
      numero: b.appointment?.numeroVenda ?? null,
      pet: b.appointment?.pet?.name ?? null,
      itens: itens.map((it: any) => {
        const q = Number(it.quantidade ?? 1) || 1;
        return { descricao: String(it.descricao || it.nome || "Item"), quantidade: q, valorTotal: Number(it.valorTotal ?? Number(it.valorUnitario || 0) * q) };
      }),
    });
  }

  return {
    total,
    porExtenso: valorPorExtenso(total),
    desconto,
    formasStr,
    data: String(primeira.data || new Date().toISOString()),
    tutor,
    tutorNome: tutor?.name || primeira.appointment?.tutor?.name || "Cliente",
    tutorId: tutor?.id || primeira.appointment?.tutor?.id || null,
    cpf: tutor?.cpf || null,
    pet,
    petNome: pet?.name || null,
    vendas,
  };
}

/** A frase do recibo, igual no papel e no PDF. */
export function fraseDoRecibo(d: DadosDoRecibo): string {
  const brl = Number(d.total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const numeros = d.vendas.map((v) => v.numero).filter((n) => n != null);
  const ref = numeros.length ? ` (venda${numeros.length > 1 ? "s" : ""} nº ${numeros.join(", ")})` : "";
  return `Recebi de ${d.tutorNome}${d.cpf ? `, CPF ${d.cpf}` : ""} a quantia de ${brl} (${d.porExtenso}), referente a serviços e produtos veterinários${d.petNome ? ` prestados ao animal ${d.petNome}` : ""}${ref}.`;
}

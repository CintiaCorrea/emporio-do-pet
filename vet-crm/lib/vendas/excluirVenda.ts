/* ─────────────────────────────────────────────────────────────────────────────────────────
   EXCLUIR UMA VENDA — a regra, num lugar só.

   Nasceu dentro de app/.../erp/vendas/page.tsx. Saiu de lá em 12/09/2026, quando a Consulta
   de vendas passou a ser a porta única e precisou excluir também ("quero que fique somente a
   opção de consulta de vendas"). Copiar teria dado duas regras de exclusão de venda para
   divergir com o tempo — e exclusão de venda é o caminho pelo qual a clínica já perdeu
   R$ 40 mil em histórico.

   Quem decide de verdade é o servidor (appointments.service.remove, com as travas de
   08/09/2026). Aqui só se evita oferecer o que vai dar erro, e se traduz o que ele responde.

   Devolve resultado em vez de avisar na tela: cada tela mostra do seu jeito, e assim a regra
   pode ser testada sem montar componente.
   ───────────────────────────────────────────────────────────────────────────────────────── */

const BRL = (v: unknown) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Tira o prefixo de código do servidor ("TEM_RECEBIMENTO: ...") antes de mostrar a alguém. */
export const semPrefixo = (msg: string) => String(msg || "").replace(/^[A-Z_]+:\s*/, "");

export interface VendaParaExcluir {
  id: string;
  numeroVenda?: number | null;
  tutor?: string | null;
  pet?: string | null;
  valor?: number;
  pago?: number;
}

export type ResultadoExclusao =
  | { ok: true }
  | { ok: false; erro: string }
  /** A pessoa desistiu numa das confirmações — não é erro, não tem o que avisar. */
  | { ok: false; cancelado: true; erro?: undefined };

export async function excluirVenda(
  v: VendaParaExcluir,
  opts: {
    isAdmin: boolean;
    /** window.confirm na tela; injetado para a regra poder ser testada. */
    confirmar: (msg: string) => boolean;
  },
): Promise<ResultadoExclusao> {
  // Quem não é ADM só consegue apagar venda sem nenhum recebimento. O servidor recusaria de
  // todo jeito; dizer isso aqui poupa um erro cru e diz de quem pedir.
  if (Number(v.pago || 0) > 0 && !opts.isAdmin) {
    return { ok: false, erro: "Essa venda já tem recebimento. Apague o recebimento no Caixa ou peça a um administrador." };
  }

  const nome = `${v.numeroVenda ? "#" + v.numeroVenda + " " : ""}de ${v.tutor || "cliente"}${v.pet ? " · " + v.pet : ""}`;
  if (!opts.confirmar(`Excluir a venda ${nome} (${BRL(v.valor)})?\nNão dá pra desfazer.`)) {
    return { ok: false, cancelado: true };
  }

  try {
    let r = await fetch(`/api/appointments/${v.id}`, { method: "DELETE" });
    if (!r.ok) {
      const e = await r.json().catch(() => ({} as any));
      const msg = String(e?.message || "");
      // Gravação de áudio do atendimento só o ADM pode levar junto, e só dizendo que sabe.
      if (msg.startsWith("TEM_GRAVACAO") && opts.isAdmin) {
        if (!opts.confirmar("Esse atendimento tem uma gravação de áudio salva. Excluir apaga a gravação junto. Apagar mesmo assim?")) {
          return { ok: false, cancelado: true };
        }
        r = await fetch(`/api/appointments/${v.id}?force=true`, { method: "DELETE" });
        if (!r.ok) {
          const e2 = await r.json().catch(() => ({} as any));
          return { ok: false, erro: semPrefixo(String(e2?.message || "")) || "Não consegui excluir." };
        }
      } else {
        return { ok: false, erro: semPrefixo(msg) || "Não consegui excluir." };
      }
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "Não consegui excluir." };
  }
}

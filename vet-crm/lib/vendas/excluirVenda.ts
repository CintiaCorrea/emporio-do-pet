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

/**
 * APAGAR UM ATENDIMENTO/VENDA NO SERVIDOR, entendendo os dois avisos que ele pode devolver.
 *
 *   TEM_GRAVACAO    o atendimento tem gravação de áudio → repete com `force=true`
 *   TEM_RECEBIMENTO a venda tem dinheiro recebido (só chega ao administrativo — os outros
 *                   perfis são barrados antes) → repete com `comRecebimento=true`
 *
 * Em cada aviso a pessoa lê a frase DO SERVIDOR (quanto, em que caixa, de quem) e decide.
 * Recusar deixa tudo no lugar.
 *
 * Existia em três cópias — ponto de venda, ficha do pet e aqui — e cada uma entendia o servidor
 * de um jeito: a ficha do pet tratava QUALQUER recusa como "tem gravação". Em 16/09/2026 a Cintia
 * pediu para rever as telas de venda ("está tudo muito confuso, redundante e difícil de
 * corrigir"); esta é a primeira junção. Todo lugar que apaga atendimento usa esta função.
 */
export async function apagarAtendimento(
  id: string,
  opts: {
    confirmar: (msg: string) => boolean;
    /** Oferecer apagar junto a gravação de áudio. A Consulta de vendas só oferece ao ADM. */
    oferecerApagarGravacao?: boolean;
  },
): Promise<ResultadoExclusao> {
  const params = new URLSearchParams();
  try {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const qs = params.toString();
      const r = await fetch(`/api/appointments/${id}${qs ? "?" + qs : ""}`, { method: "DELETE" });
      if (r.ok) return { ok: true };
      const e = await r.json().catch(() => ({} as any));
      const msg = String(e?.message || e?.error || "");

      if (msg.startsWith("TEM_GRAVACAO") && opts.oferecerApagarGravacao !== false && !params.has("force")) {
        if (!opts.confirmar("Esse atendimento tem uma gravação de áudio salva. Excluir apaga a gravação junto. Apagar mesmo assim?")) {
          return { ok: false, cancelado: true };
        }
        params.set("force", "true");
        continue;
      }
      if (msg.startsWith("TEM_RECEBIMENTO") && !params.has("comRecebimento")) {
        if (!opts.confirmar(semPrefixo(msg))) return { ok: false, cancelado: true };
        params.set("comRecebimento", "true");
        continue;
      }
      return { ok: false, erro: semPrefixo(msg) || "Não consegui excluir." };
    }
    return { ok: false, erro: "Não consegui excluir." };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "Não consegui excluir." };
  }
}

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
  // Gravação de áudio do atendimento só o ADM pode levar junto, e só dizendo que sabe.
  return apagarAtendimento(v.id, { confirmar: opts.confirmar, oferecerApagarGravacao: opts.isAdmin });
}

"use client";
// DEVOLVER CRÉDITO AO CLIENTE (Cintia, 17/09/2026: "tem como fazermos devolução quando o cliente
// pagar a mais?").
//
// O crédito nasce quando o cliente paga a mais (a sobra do cartão) ou deixa caução. Devolver é o
// contrário: o saldo dele cai e o dinheiro sai.
//
//  · em DINHEIRO → sai do caixa do dia, como uma sangria, e fica à vista no movimento do caixa;
//  · em PIX/transferência → não mexe no caixa; o dinheiro sai da conta, e quem registra é o
//    Financeiro.
//
// No DRE nada vira despesa nova: o crédito tinha entrado como "Adiantamento de Clientes", fora da
// receita, e a devolução anula esse adiantamento (backend credito.service.lancarAdiantamento).
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { carregarMeuCaixa, rotuloCaixa, type CaixaAberto } from "@/lib/caixaAtual";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

const BRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function DevolverCreditoModal({
  tutorId, nome, saldo, onFechar, onFeito,
}: {
  tutorId: string;
  nome: string;
  saldo: number;
  onFechar: () => void;
  onFeito: () => void;
}) {
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || "";
  const [meuCaixa, setMeuCaixa] = useState<CaixaAberto | null>(null);
  const [comoDevolveu, setComoDevolveu] = useState<"Dinheiro" | "Pix">("Dinheiro");
  const [valor, setValor] = useState(String(saldo.toFixed(2)).replace(".", ","));
  const [motivo, setMotivo] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (meId) carregarMeuCaixa(meId).then((m) => setMeuCaixa(m.meu)); }, [meId]);

  const valorNum = Math.max(0, Number(String(valor).replace(",", ".")) || 0);
  const passou = valorNum > saldo + 0.001;
  const precisaCaixa = comoDevolveu === "Dinheiro" && !meuCaixa;

  const devolver = async () => {
    if (salvando) return;
    if (valorNum <= 0) { toast.error("Informe quanto está devolvendo."); return; }
    if (passou) { toast.error(`O cliente tem ${BRL(saldo)} de crédito.`); return; }
    if (precisaCaixa) { toast.error("Para devolver em dinheiro é preciso ter o seu caixa aberto."); return; }
    if (!confirm(`Devolver ${BRL(valorNum)} de crédito para ${nome}${comoDevolveu === "Dinheiro" ? `, saindo do caixa nº ${meuCaixa?.numero}` : " por PIX/transferência"}?`)) return;
    setSalvando(true);
    try {
      const r = await fetch("/api/credito", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          tutorId, tipo: "ESTORNO", valor: valorNum, forma: comoDevolveu,
          descricao: `Devolução de crédito${motivo.trim() ? ` — ${motivo.trim()}` : ""}`,
          ...(comoDevolveu === "Dinheiro" && meuCaixa ? { caixaSessaoId: meuCaixa.id } : {}),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Não consegui devolver.");
      toast.success(`Devolvido ${BRL(valorNum)}. Saldo agora: ${BRL(Number(d?.saldo) || 0)}.`);
      onFeito();
      onFechar();
    } catch (e: any) {
      toast.error(e?.message || "Não consegui devolver.");
    } finally { setSalvando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" {...fundoDeModal(onFechar)}>
      <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
          <div>
            <h3 className="text-base font-medium" style={{ color: "#014D5E" }}>💸 Devolver crédito</h3>
            <div className="text-[11.5px]" style={{ color: "#5C6B70" }}>{nome} · crédito de <b>{BRL(saldo)}</b></div>
          </div>
          <button onClick={onFechar} aria-label="Fechar" className="text-[#374151] text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 grid gap-3">
          <div>
            <label htmlFor="dev-valor" className="block text-[10.5px] uppercase tracking-wide mb-1" style={{ color: "#374151" }}>Quanto devolver</label>
            <input id="dev-valor" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal"
              className="w-full border rounded-lg px-3 py-2 text-[14px] tabular-nums" style={{ borderColor: passou ? "#F0C9C7" : "#E8E2D6" }} />
            {passou && <div className="text-[11.5px] mt-1" style={{ color: "#b23b3b" }}>O cliente tem {BRL(saldo)} de crédito.</div>}
          </div>

          <div>
            <span className="block text-[10.5px] uppercase tracking-wide mb-1" style={{ color: "#374151" }}>Como você devolveu</span>
            <div className="flex gap-2">
              {(["Dinheiro", "Pix"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setComoDevolveu(f)}
                  className="text-[12.5px] font-semibold px-3 py-1.5 rounded-full border"
                  style={f === comoDevolveu ? { background: "#009AAC", borderColor: "#009AAC", color: "#fff" } : { background: "#fff", borderColor: "#E8E2D6", color: "#5C6B70" }}>
                  {f === "Dinheiro" ? "💵 Dinheiro do caixa" : "📲 PIX / transferência"}
                </button>
              ))}
            </div>
            <div className="text-[11.5px] mt-1.5" style={{ color: "#5C6B70" }}>
              {comoDevolveu === "Dinheiro"
                ? (meuCaixa ? <>Sai do <b>{rotuloCaixa(meuCaixa)}</b> e aparece no movimento do caixa.</> : <span style={{ color: "#8a6400" }}>Você não tem caixa aberto — abra o seu ou devolva por PIX.</span>)
                : <>Não mexe no caixa: o dinheiro sai da conta e o lançamento é feito no Financeiro.</>}
            </div>
          </div>

          <div>
            <label htmlFor="dev-motivo" className="block text-[10.5px] uppercase tracking-wide mb-1" style={{ color: "#374151" }}>Motivo (opcional)</label>
            <input id="dev-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: pagou a mais no cartão em 04/09"
              className="w-full border rounded-lg px-3 py-2 text-[13px]" style={{ borderColor: "#E8E2D6" }} />
          </div>

          <div className="text-[11.5px] rounded-lg px-3 py-2" style={{ background: "#F1F6F7", color: "#5C6B70" }}>
            O crédito do cliente cai na hora. No DRE isso <b>anula o adiantamento</b> — não vira despesa, porque esse dinheiro nunca foi receita de serviço.
          </div>
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
          <button onClick={onFechar} className="px-4 py-2 text-[13px] rounded-lg bg-white border" style={{ borderColor: "#E8E2D6", color: "#5C6B70" }}>Fechar</button>
          <button onClick={devolver} disabled={salvando || valorNum <= 0 || passou || precisaCaixa}
            className="px-5 py-2 text-[13px] font-medium text-white rounded-lg disabled:opacity-60" style={{ background: "#009AAC" }}>
            {salvando ? "Devolvendo…" : "💸 Devolver"}
          </button>
        </div>
      </div>
    </div>
  );
}

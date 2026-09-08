"use client";
// ABRIR O MEU CAIXA — de dentro da venda, sem sair dela.
//
// A Cintia, em 08/09/2026, decidindo como fica quando quem recebe não tem caixa próprio aberto:
// "adm abre o caixa dela também". Ou seja: uma regra só para todo mundo — recepção (Gabriela,
// Victoria) e administrativo — cada uma lança no PRÓPRIO caixa, sem exceção.
//
// Essa regra só é justa se abrir o caixa custar um clique. Até aqui a tela mandava a pessoa para
// /dashboard/erp/caixa no meio de um recebimento: ela perdia a venda de vista, abria o caixa,
// voltava e recomeçava. Com o cliente esperando no balcão, ninguém faz isso — faz-se o
// contrário, que é receber na gaveta de quem estiver aberta. Foi exatamente o que a decisão
// dela proíbe.
//
// O backend devolve `jaEstavaAberto: true` quando a pessoa já tinha caixa aberto (em 05/09 a
// Victoria abriu três no mesmo dia por não ver o dela). Nesse caso ninguém criou nada: só
// dizemos qual é o dela e seguimos.

import { useState } from "react";
import toast from "react-hot-toast";
import type { CaixaAberto } from "@/lib/caixaAtual";

type Props = {
  onClose: () => void;
  /** Recebe o caixa que passou a valer — a tela retoma o recebimento de onde parou. */
  onAberto: (caixa: CaixaAberto) => void;
  /** Contexto: "para receber a venda #1081", por exemplo. */
  motivo?: string;
};

export default function AbrirMeuCaixaModal({ onClose, onAberto, motivo }: Props) {
  const [suprimento, setSuprimento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const abrir = async () => {
    setSalvando(true);
    try {
      const r = await fetch("/api/caixa", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          suprimento: Number(String(suprimento).replace(",", ".")) || 0,
          observacao: observacao || null,
        }),
      });
      // A MENSAGEM DO SERVIDOR CHEGA INTEIRA. Antes a tela trocava tudo por "Erro ao abrir
      // caixa" — inclusive "só a recepção e o administrativo abrem caixa", que é a explicação
      // de que a pessoa precisava.
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || "Erro ao abrir o caixa."); }
      const c = await r.json();
      const caixa: CaixaAberto = {
        id: c.id, numero: Number(c.numero) || 0, abertura: c.abertura,
        operadorId: c.user?.id ?? c.userId ?? null, operadorNome: c.user?.name || "você",
      };
      toast.success(c?.jaEstavaAberto ? `Você já tinha o caixa nº ${caixa.numero} aberto.` : `Caixa nº ${caixa.numero} aberto.`);
      onAberto(caixa);
      onClose();
    } catch (e: any) { toast.error(e?.message || "Erro ao abrir o caixa."); }
    finally { setSalvando(false); }
  };

  const inp: React.CSSProperties = { width: "100%", border: "1px solid #E8E2D6", borderRadius: 9, padding: "9px 11px", fontSize: 13.5, background: "#fff", color: "#1F2A2E" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11.5, color: "#5C6B70", marginBottom: 4 };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: "rgba(1,43,46,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 95 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 400, maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 18px", borderBottom: "1px solid #F0EBE0" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "#1F2A2E" }}>Abrir o meu caixa</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 17, color: "#374151" }} aria-label="Fechar">✕</button>
        </div>

        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 12.5, color: "#5C6B70", lineHeight: 1.45 }}>
            {motivo ? `${motivo}. ` : ""}Cada pessoa lança no próprio caixa — o dinheiro entra na
            sua gaveta e é você quem confere no fim do dia.
          </div>
          <div>
            <label style={lbl}>Suprimento (fundo de troco)</label>
            <input value={suprimento} onChange={(e) => setSuprimento(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") abrir(); }} inputMode="decimal" placeholder="0,00" autoFocus style={inp} />
          </div>
          <div>
            <label style={lbl}>Observação (opcional)</label>
            <input value={observacao} onChange={(e) => setObservacao(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") abrir(); }} style={inp} />
          </div>
          <div style={{ fontSize: 11, color: "#8A9499" }}>
            O caixa é encerrado automaticamente à meia-noite.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, padding: "0 18px 18px" }}>
          <button onClick={onClose} style={{ flex: 1, border: "1px solid #E8E2D6", background: "#fff", color: "#5C6B70", borderRadius: 9, padding: "10px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
          <button onClick={abrir} disabled={salvando} style={{ flex: 2, border: "none", background: "#0E7C86", color: "#fff", borderRadius: 9, padding: "10px", fontSize: 13, fontWeight: 600, cursor: salvando ? "default" : "pointer", opacity: salvando ? .6 : 1 }}>
            {salvando ? "Abrindo…" : "Abrir o meu caixa"}
          </button>
        </div>
      </div>
    </div>
  );
}

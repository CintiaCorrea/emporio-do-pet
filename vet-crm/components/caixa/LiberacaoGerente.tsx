"use client";
/* ─────────────────────────────────────────────────────────────────────────────────────────
   LIBERAÇÃO DO GERENTE — a peça, não a tela.

   Nasceu dentro do ponto de venda, para o desconto acima do limite. Saiu de lá em 16/09/2026
   porque o desconto passou a ser conferido em TODA porta que recebe (Cintia: "o caixa tem
   autorização de dar 5% de desconto nas vendas à vista e no PIX") — e o Caixa e o Baixar várias
   precisavam pedir a mesma liberação. Uma peça só: três cópias de um pedido de senha são três
   lugares para esquecer de corrigir.

   Uso:
     const { pedirLiberacao, modalLiberacao } = useLiberacaoGerente();
     ...
     if (precisaDeLiberacao(mensagemDoServidor)) {
       const lib = await pedirLiberacao(mensagemDoServidor);
       if (lib) reenviar({ ...corpo, liberacaoEmail: lib.email, liberacaoSenha: lib.senha });
     }
     ...
     return <>{...}{modalLiberacao}</>;
   ───────────────────────────────────────────────────────────────────────────────────────── */

import { useRef, useState } from "react";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

export type Liberacao = { email: string; senha: string };

/** A resposta do servidor pede liberação? A regra mora em lib (testável sem JSX). */
export { precisaDeLiberacao } from "@/lib/liberacaoGerente";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", INK = "#1F2A2E", INK2 = "#374151", SUAVE = "#FBF9F4";

export function useLiberacaoGerente() {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const resolver = useRef<((v: Liberacao | null) => void) | null>(null);

  const pedirLiberacao = (texto?: string) => new Promise<Liberacao | null>((resolve) => {
    resolver.current = resolve;
    setMotivo(String(texto || "").replace(/^[A-Z_]+:\s*/, ""));
    setEmail(""); setSenha(""); setAberto(true);
  });
  const fechar = (v: Liberacao | null) => {
    setAberto(false);
    const r = resolver.current; resolver.current = null;
    if (r) r(v);
  };

  const modalLiberacao = aberto ? (
    <div {...fundoDeModal(() => fechar(null))} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => { e.preventDefault(); if (email.trim() && senha) fechar({ email: email.trim(), senha }); }}
        style={{ width: 360, maxWidth: "100%", background: SUAVE, border: `1px solid ${LINE}`, borderRadius: 16, overflow: "hidden" }}
      >
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${LINE}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b style={{ color: NAVY, fontSize: 15 }}>🔓 Liberação do gerente</b>
          <button type="button" onClick={() => fechar(null)} style={{ border: "none", background: "none", color: MUT, cursor: "pointer", fontSize: 16 }} aria-label="Fechar">✕</button>
        </div>
        <div style={{ padding: 18 }}>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: INK2, lineHeight: 1.5 }}>
            {motivo || "O desconto passa do permitido."} Um gerente (admin) precisa autorizar com e-mail e senha.
          </p>
          <label style={{ display: "block", fontSize: 12, color: MUT, marginBottom: 4 }}>E-mail do gerente</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus autoComplete="off"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 14, background: "#fff", color: INK, marginBottom: 12 }} />
          <label style={{ display: "block", fontSize: 12, color: MUT, marginBottom: 4 }}>Senha</label>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="off"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 14, background: "#fff", color: INK }} />
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <button type="button" onClick={() => fechar(null)} style={{ flex: 1, background: "#fff", color: MUT, border: `1px solid ${LINE}`, fontSize: 14, fontWeight: 500, padding: 11, borderRadius: 9, cursor: "pointer" }}>Cancelar</button>
            <button type="submit" disabled={!email.trim() || !senha} style={{ flex: 1, background: NAVY, color: "#fff", border: "none", fontSize: 14, fontWeight: 500, padding: 11, borderRadius: 9, cursor: (!email.trim() || !senha) ? "not-allowed" : "pointer", opacity: (!email.trim() || !senha) ? 0.5 : 1 }}>Liberar</button>
          </div>
        </div>
      </form>
    </div>
  ) : null;

  return { pedirLiberacao, modalLiberacao };
}

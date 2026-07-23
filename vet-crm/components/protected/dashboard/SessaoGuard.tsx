"use client";
// 🛟 SessaoGuard — mata a "sessão zumbi" (caso Gabriela/Isabelle, 23/07):
// a sessão do navegador dura semanas, mas o crachá interno (accessToken do backend)
// vence em 7 dias. Resultado: a pessoa "entra" no site, mas TODA chamada de API falha
// com 401 em silêncio e nada funciona. Aqui: qualquer 401 vindo da API desloga na hora
// e manda pro login — crachá novo, tudo volta a funcionar.
import { useEffect } from "react";
import { signOut } from "next-auth/react";

export default function SessaoGuard() {
  useEffect(() => {
    const original = window.fetch;
    let saindo = false;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const resp = await original(...args);
      try {
        const url = typeof args[0] === "string" ? args[0] : ((args[0] as Request)?.url || "");
        // Só APIs internas; ignora /api/auth (o próprio login devolve 401 quando a senha erra)
        // e /api/conta (senha atual errada não pode derrubar a sessão).
        const alvo = url.startsWith("/api/") && !url.startsWith("/api/auth") && !url.startsWith("/api/conta");
        if (resp.status === 401 && alvo && !saindo) {
          saindo = true;
          signOut({ callbackUrl: "/login?expirada=1" });
        }
      } catch { /* nunca atrapalha a chamada original */ }
      return resp;
    };
    return () => { window.fetch = original; };
  }, []);
  return null;
}

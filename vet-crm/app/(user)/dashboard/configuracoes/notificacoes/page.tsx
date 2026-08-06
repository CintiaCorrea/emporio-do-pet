"use client";
// Configurações › Notificações — ativar/testar os avisos push (aparecem mesmo com
// o sistema fechado). Ponto fixo pra reativar caso a pessoa tenha dispensado o banner.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { pushSuportado, permissaoPush, ativarPush, inscreverAparelho, testarPush } from "@/lib/push/pushClient";

export default function NotificacoesPage() {
  usePageTitle("Notificações", "Avisos de recado e transferência mesmo com o sistema fechado.");
  const [status, setStatus] = useState<NotificationPermission | "sem-suporte" | "carregando">("carregando");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const p = permissaoPush();
    setStatus(p);
    if (p === "granted") inscreverAparelho().catch(() => undefined); // reforça a inscrição deste aparelho
  }, []);

  const ativar = async () => {
    setOcupado(true);
    try {
      const perm = await ativarPush();
      setStatus(perm);
      if (perm === "granted") { await testarPush(); toast.success("Avisos ativados! Mandei um teste. 🔔"); }
      else if (perm === "denied") toast.error("O navegador bloqueou os avisos deste aparelho. Veja abaixo como liberar.");
    } catch { toast.error("Não consegui ativar neste aparelho."); }
    finally { setOcupado(false); }
  };

  const testar = async () => {
    setOcupado(true);
    try { await testarPush(); toast.success("Enviei um aviso de teste. Deve aparecer na tela em segundos."); }
    catch { toast.error("Não consegui enviar o teste."); }
    finally { setOcupado(false); }
  };

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #E8E2D6", borderRadius: 14, padding: "18px 20px", maxWidth: 620 };
  const badge = (bg: string, fg: string, txt: string) => <span style={{ background: bg, color: fg, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999 }}>{txt}</span>;

  return (
    <div className="p-6 w-full">
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#E0F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🔔</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#014D5E" }}>Avisos fora do sistema</div>
            <div style={{ fontSize: 12.5, color: "#5C6B70" }}>Recados e transferências de conversa aparecem como notificação do computador/celular — mesmo com o sistema minimizado ou fechado.</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0" }}>
          <span style={{ fontSize: 12.5, color: "#5C6B70" }}>Neste aparelho:</span>
          {status === "carregando" && badge("#EEF0EF", "#5C6B70", "verificando…")}
          {status === "granted" && badge("#E7F6EE", "#1c7a47", "✅ ativado")}
          {status === "default" && badge("#FBF3D9", "#8a6400", "⏳ não ativado")}
          {status === "denied" && badge("#FCE9E7", "#b23b39", "🚫 bloqueado")}
          {status === "sem-suporte" && badge("#FCE9E7", "#b23b39", "sem suporte neste navegador")}
        </div>

        {(status === "default" || status === "granted") && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {status !== "granted" && (
              <button onClick={ativar} disabled={ocupado} className="disabled:opacity-50" style={{ border: "none", background: "#009AAC", color: "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{ocupado ? "Ativando…" : "🔔 Ativar avisos"}</button>
            )}
            {status === "granted" && (
              <button onClick={testar} disabled={ocupado} className="disabled:opacity-50" style={{ border: "1px solid #E8E2D6", background: "#fff", color: "#014D5E", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{ocupado ? "Enviando…" : "📨 Enviar teste"}</button>
            )}
          </div>
        )}

        {status === "denied" && (
          <div style={{ fontSize: 12.5, color: "#5C6B70", background: "#FBF9F4", border: "1px solid #F0EBE0", borderRadius: 10, padding: "10px 12px", lineHeight: 1.55 }}>
            Este aparelho <b>bloqueou</b> as notificações. Pra liberar: clique no <b>cadeado 🔒</b> ao lado do endereço do site → <b>Notificações</b> → <b>Permitir</b> → recarregue a página e clique em Ativar.
          </div>
        )}

        <div style={{ fontSize: 11.5, color: "#94a3a0", marginTop: 16, lineHeight: 1.5 }}>
          💡 Ative em <b>cada computador/aparelho</b> que você usa. Minimizado ou em outro programa sempre funciona; com o navegador 100% fechado depende do sistema manter um processo em segundo plano.
        </div>
      </div>
    </div>
  );
}

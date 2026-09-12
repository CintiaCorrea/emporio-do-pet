"use client";
/* ─────────────────────────────────────────────────────────────────────────────────────────
   A REDE DEBAIXO DA REDE.

   app/error.tsx pega o que quebra DENTRO de uma tela. Quando quem quebra é o próprio layout —
   o menu lateral, o provedor de sessão, o tema — não há tela para o outro boundary segurar, e
   sem este arquivo o Next volta a mostrar a mensagem crua em inglês que a Cintia fotografou
   em 12/09/2026.

   Por isso este componente traz `<html>` e `<body>` próprios: ele SUBSTITUI o layout que
   quebrou, e não pode depender de nada dele.

   Nada de biblioteca, nada de import do projeto, nada de fonte externa: se o layout caiu, o que
   estiver junto dele pode cair também. Estilo inline e pronto.
   ───────────────────────────────────────────────────────────────────────────────────────── */

export default function ErroGlobal({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: "#F6F2EA", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 520, width: "100%", background: "#fff", border: "1px solid #E8E2D6", borderRadius: 14, padding: "22px 24px" }}>
            <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 10 }}>⚠️</div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#014D5E" }}>O sistema não carregou</h1>
            <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "#5C6B70" }}>
              Alguma coisa quebrou antes das telas abrirem. Recarregar resolve na maioria das vezes.
              Se não resolver, me mande o detalhe abaixo — é ele que diz o que aconteceu.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              <button onClick={reset} style={{ border: "none", background: "#009AAC", color: "#fff", borderRadius: 9, padding: "9px 15px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Tentar de novo
              </button>
              <button onClick={() => window.location.reload()} style={{ border: "1px solid #E8E2D6", background: "#fff", color: "#5C6B70", borderRadius: 9, padding: "9px 15px", fontSize: 13, cursor: "pointer" }}>
                Recarregar a página
              </button>
            </div>

            <details style={{ marginTop: 16 }}>
              <summary style={{ fontSize: 12, color: "#8A9499", cursor: "pointer" }}>Detalhe técnico (para mandar ao desenvolvedor)</summary>
              <pre style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5, color: "#5C6B70", background: "#FBF9F4", border: "1px solid #F0EBE0", borderRadius: 8, padding: 10, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 220, overflow: "auto" }}>
                {error?.name}: {error?.message}
                {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
              </pre>
            </details>
          </div>
        </div>
      </body>
    </html>
  );
}

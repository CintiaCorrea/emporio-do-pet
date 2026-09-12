"use client";
/* ─────────────────────────────────────────────────────────────────────────────────────────
   QUANDO UMA TELA QUEBRA — o que a pessoa vê.

   Cintia, 12/09/2026, com a ficha do cliente em branco: "Application error: a client-side
   exception has occurred... essa mensagem tem aparecido em vários momentos."

   Aquela frase é o que o Next mostra quando o app NÃO TEM error boundary nenhum: fundo branco,
   inglês, e nenhuma pista do que aconteceu. Quem está no balcão com o cliente na frente não tem
   o que fazer com isso — e eu também não, porque a mensagem não diz qual foi o erro.

   Esta tela faz três coisas que aquela não fazia:

   1. Fala português e oferece saída — tentar de novo, recarregar, voltar ao início. A maior
      parte dos erros de tela passa com um recarregar.

   2. Se recupera sozinha do caso mais comum. Depois de cada publicação, quem está com o sistema
      aberto pede um pedaço de código que não existe mais (o endereço dele muda a cada versão).
      Isso derruba a tela com essa mesma mensagem. Aqui a página se recarrega uma vez sozinha —
      UMA, marcada na sessão, senão viraria um laço de recarregamento infinito numa tela que
      quebra por outro motivo.

   3. Mostra o erro técnico, dobrado. É o que me permite consertar: sem ele, "deu erro na tela"
      é tudo o que chega até mim.
   ───────────────────────────────────────────────────────────────────────────────────────── */

import { useEffect } from "react";

/** O navegador não tem um tipo para isso: é o erro de pedaço de código que não existe mais. */
function ehPedacoVelho(erro: Error & { digest?: string }): boolean {
  const txt = `${erro?.name || ""} ${erro?.message || ""}`;
  return /ChunkLoadError|Loading chunk \d+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(txt);
}

const MARCA = "emp:recarregou-por-pedaco-velho";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // O console é onde eu vou procurar quando ela me mandar o print.
    console.error("[Empório do Pet] a tela quebrou:", error);
    if (!ehPedacoVelho(error)) return;
    try {
      if (sessionStorage.getItem(MARCA)) return;   // já tentamos: não entra em laço
      sessionStorage.setItem(MARCA, "1");
      window.location.reload();
    } catch { /* navegador sem sessionStorage: fica a tela abaixo, com o botão */ }
  }, [error]);

  const pedacoVelho = ehPedacoVelho(error);

  return (
    <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#F6F2EA" }}>
      <div style={{ maxWidth: 520, width: "100%", background: "#fff", border: "1px solid #E8E2D6", borderRadius: 14, padding: "22px 24px" }}>
        <div style={{ fontSize: 30, lineHeight: 1, marginBottom: 10 }}>{pedacoVelho ? "🔄" : "⚠️"}</div>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: "#014D5E" }}>
          {pedacoVelho ? "O sistema foi atualizado" : "Essa tela não abriu"}
        </h1>
        <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "#5C6B70" }}>
          {pedacoVelho
            ? "Saiu uma versão nova enquanto você estava com o sistema aberto. Estou recarregando a página — se ela não voltar sozinha em alguns segundos, clique em Recarregar."
            : "O que você estava fazendo não foi perdido: nada é gravado quando a tela quebra. Tente de novo; se insistir, me mande o detalhe abaixo."}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          <button onClick={reset} style={{ border: "none", background: "#009AAC", color: "#fff", borderRadius: 9, padding: "9px 15px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Tentar de novo
          </button>
          <button onClick={() => window.location.reload()} style={{ border: "1px solid #E8E2D6", background: "#fff", color: "#5C6B70", borderRadius: 9, padding: "9px 15px", fontSize: 13, cursor: "pointer" }}>
            Recarregar a página
          </button>
          <a href="/dashboard/hoje" style={{ border: "1px solid #E8E2D6", background: "#fff", color: "#5C6B70", borderRadius: 9, padding: "9px 15px", fontSize: 13, textDecoration: "none" }}>
            Ir para o início
          </a>
        </div>

        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 12, color: "#8A9499", cursor: "pointer" }}>Detalhe técnico (para mandar ao desenvolvedor)</summary>
          <pre style={{ marginTop: 8, fontSize: 11, lineHeight: 1.5, color: "#5C6B70", background: "#FBF9F4", border: "1px solid #F0EBE0", borderRadius: 8, padding: 10, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 220, overflow: "auto" }}>
            {error?.name}: {error?.message}
            {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
            {"\n\n"}{typeof window !== "undefined" ? window.location.pathname : ""}
          </pre>
        </details>
      </div>
    </div>
  );
}

"use client";
// AVISO DE ATUALIZAÇÃO (17/09/2026). Cintia: "preciso que as atualizações das telas de vendas
// sejam rápidas para que a recepção não cobre os valores errados."
//
// O problema: o navegador guarda o programa da tela. Depois de publicar uma correção de preço ou
// de regra, quem estava com a tela aberta continuava no programa antigo até dar Ctrl+Shift+R —
// e podia cobrar pelo que estava na tela velha.
//
// O que esta peça faz, sem atrapalhar ninguém:
//   • pergunta ao servidor, de minuto em minuto (e sempre que a pessoa volta para a aba), qual
//     versão está no ar;
//   • se a tela estiver velha, mostra uma tarja discreta no rodapé com o botão "Atualizar agora";
//   • e, quando a pessoa TROCA DE TELA, recarrega sozinha — nesse momento ela não está no meio de
//     um lançamento, então nada digitado se perde.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { VERSAO_PUBLICADA } from "@/lib/versao-publicada";
import { telaEstaVelha, podeRecarregarSozinho } from "@/lib/versao/atualizacao.regras";

const DE_QUANTO_EM_QUANTO = 60_000; // 1 minuto

export default function AvisoDeAtualizacao() {
  const [versaoNoAr, setVersaoNoAr] = useState<string | null>(null);
  const caminho = usePathname();
  const caminhoAnterior = useRef<string | null>(null);

  // pergunta ao servidor qual versão está no ar
  useEffect(() => {
    let vivo = true;
    const perguntar = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      try {
        const r = await fetch("/api/versao", { cache: "no-store" });
        const d = await r.json();
        if (vivo && typeof d?.versao === "string") setVersaoNoAr(d.versao);
      } catch { /* sem internet ou servidor reiniciando: tenta de novo no próximo minuto */ }
    };
    perguntar();
    const relogio = setInterval(perguntar, DE_QUANTO_EM_QUANTO);
    const aoVoltar = () => { if (document.visibilityState === "visible") perguntar(); };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", perguntar);
    return () => {
      vivo = false;
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", perguntar);
    };
  }, []);

  const velha = telaEstaVelha(VERSAO_PUBLICADA, versaoNoAr);

  // ao trocar de tela, recarrega sozinho (uma vez por versão)
  useEffect(() => {
    const trocouDeTela = caminhoAnterior.current !== null && caminhoAnterior.current !== caminho;
    caminhoAnterior.current = caminho;
    if (!versaoNoAr) return;
    let jaTentada: string | null = null;
    try { jaTentada = sessionStorage.getItem("versao-ja-recarregada"); } catch {}
    if (!podeRecarregarSozinho({ velha, trocouDeTela, versaoJaTentada: jaTentada, versaoDoServidor: versaoNoAr })) return;
    try { sessionStorage.setItem("versao-ja-recarregada", versaoNoAr); } catch {}
    window.location.reload();
  }, [caminho, velha, versaoNoAr]);

  if (!velha) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 rounded-full border px-4 py-2.5 shadow-lg"
      style={{ background: "#014D5E", borderColor: "#014D5E", color: "#fff" }}>
      <span className="text-[13px]">🔄 Tem uma <b>versão nova</b> do sistema. Atualize para não usar preço antigo.</span>
      <button
        onClick={() => window.location.reload()}
        className="text-[12.5px] font-semibold rounded-full px-3 py-1.5"
        style={{ background: "#F2B705", color: "#1F2A2E" }}
      >Atualizar agora</button>
    </div>
  );
}

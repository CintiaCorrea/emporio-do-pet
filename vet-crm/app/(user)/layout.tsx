"use client";

import CacaErros from "@/components/comum/CacaErros";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-[color:var(--background)] transition-colors">
      {/* Escuta os erros de tela e os registra para a Cintia ver depois. Fica AQUI, no layout de
          todas as telas logadas, porque um erro que só é capturado em algumas telas é pior do que
          nenhum: a ausência vira "lá não dá erro". Não desenha nada. */}
      <CacaErros />
      {/* SEM overflow aqui: como não há altura fixa, esse container nunca rolava (a janela rola),
          mas o overflow-auto QUEBRAVA o position:sticky de todas as telas (cabeçalhos, sala de espera). */}
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}

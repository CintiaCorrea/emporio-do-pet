'use client';

import { useEffect, useState } from "react";

interface HojeData {
  retornosVencidos: any[];
  toquesHoje: any[];
  tutoresPrecisandoAtencao: number;
}

export default function HojePage() {
  const [data, setData] = useState<HojeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: substituir por endpoint real /api/hoje quando backend tiver
    setLoading(false);
    setData({ retornosVencidos: [], toquesHoje: [], tutoresPrecisandoAtencao: 0 });
  }, []);

  const dataHoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl text-[#0E2244] font-medium capitalize">Hoje — {dataHoje}</h1>
        <p className="text-sm text-[#009AAC] mt-1">
          {data ? (
            <>
              {data.retornosVencidos.length} retornos vencidos · {data.toquesHoje.length} toques
              hoje · {data.tutoresPrecisandoAtencao} tutores precisando atenção
            </>
          ) : (
            "Carregando..."
          )}
        </p>
      </header>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base text-[#0E2244] font-medium">Retornos vencidos</h2>
          <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {data?.retornosVencidos.length ?? 0}
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Carregando…</p>
        ) : data?.retornosVencidos.length === 0 ? (
          <div className="bg-white border border-[#e0d7c4] rounded-lg p-6 text-center text-sm text-gray-500">
            Nenhum retorno vencido por enquanto. 🎉
          </div>
        ) : null}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base text-[#0E2244] font-medium">Próximos toques de cadência</h2>
          <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">
            {data?.toquesHoje.length ?? 0}
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Carregando…</p>
        ) : data?.toquesHoje.length === 0 ? (
          <div className="bg-white border border-[#e0d7c4] rounded-lg p-6 text-center text-sm text-gray-500">
            Nenhum toque agendado pra hoje.
          </div>
        ) : null}
      </section>
    </div>
  );
}

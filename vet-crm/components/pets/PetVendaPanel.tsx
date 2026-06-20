"use client";
import { LuPackage, LuClipboardList, LuCircleDollarSign } from "react-icons/lu";

export default function PetVendaPanel({ pacotes = [] }: { pacotes?: { id: string; data: any }[] }) {
  const ativos = (pacotes || []).filter((p) => (p.data?.used || 0) < (p.data?.total || 0));

  function Box({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
      <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center gap-2 px-3 py-2 border-b text-xs font-semibold" style={{ borderColor: "#E8DFC8", color: "#0E2244" }}>
          {icon}
          {title}
        </div>
        <div className="p-3">{children}</div>
      </div>
    );
  }

  function Soon({ children }: { children: React.ReactNode }) {
    return (
      <div className="text-xs" style={{ color: "#64748b" }}>
        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold mb-1.5" style={{ background: "#fef3c7", color: "#92400e" }}>Em construção</span>
        <div>{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Box title="Venda · Orçamentos" icon={<LuClipboardList size={13} />}>
        <Soon>Chega com o módulo Financeiro/Venda: lançar serviços, gerar orçamento e converter em venda.</Soon>
      </Box>
      <Box title="Pacote ativo" icon={<LuPackage size={13} />}>
        {ativos.length === 0 ? (
          <div className="text-xs text-gray-400">Sem pacote ativo.</div>
        ) : (
          <div className="space-y-3">
            {ativos.map((p) => {
              const used = p.data?.used || 0;
              const total = p.data?.total || 0;
              const pct = total ? Math.min(100, (used / total) * 100) : 0;
              return (
                <div key={p.id}>
                  <div className="text-xs font-medium" style={{ color: "#0E2244" }}>{p.data?.nome || "Pacote"}</div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden my-1">
                    <div className="h-full" style={{ width: `${pct}%`, background: "#009AAC" }} />
                  </div>
                  <div className="text-[11px] text-gray-500">{used} de {total} consumidas{p.data?.validade ? ` · validade ${p.data.validade}` : ""}</div>
                </div>
              );
            })}
          </div>
        )}
      </Box>
      <Box title="Carteira do cliente" icon={<LuCircleDollarSign size={13} />}>
        <Soon>Saldo de crédito/caução do tutor. Vira receita só na baixa da venda.</Soon>
      </Box>
    </div>
  );
}

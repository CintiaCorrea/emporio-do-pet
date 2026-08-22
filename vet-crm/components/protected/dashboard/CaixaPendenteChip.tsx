"use client";
// ⚠️ Lembrete permanente de CAIXA PENDENTE: caixas abertos de DIAS ANTERIORES (esquecidos sem encerrar).
// Padrão SimplesVet (chips coloridos de caixa pendente). Só aparece quando há caixa velho aberto.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Cx = { id: string; numero?: number; status?: string; abertura?: string };

export default function CaixaPendenteChip() {
  const router = useRouter();
  const [pend, setPend] = useState<Cx[]>([]);

  useEffect(() => {
    let vivo = true;
    async function carregar() {
      try {
        const r = await fetch("/api/caixa", { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        const arr: Cx[] = Array.isArray(d) ? d : (d.data || []);
        const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
        const velhos = arr.filter((c) => c.status === "ABERTO" && c.abertura && new Date(c.abertura) < hoje0)
          .sort((a, b) => new Date(a.abertura || 0).getTime() - new Date(b.abertura || 0).getTime());
        if (vivo) setPend(velhos);
      } catch { /* rede */ }
    }
    carregar();
    const t = setInterval(carregar, 120000); // reconfere a cada 2 min
    return () => { vivo = false; clearInterval(t); };
  }, []);

  if (pend.length === 0) return null;
  const primeiro = pend[0];
  const dataBR = primeiro.abertura ? new Date(primeiro.abertura).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "";
  const label = pend.length === 1
    ? `Caixa ${primeiro.numero ? "#" + primeiro.numero + " " : ""}aberto desde ${dataBR}`
    : `${pend.length} caixas de dias anteriores abertos`;

  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard/erp/caixa")}
      title="Há caixa de dia anterior sem encerrar — clique para abrir o Caixa e encerrar."
      className="hidden lg:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium border animate-none"
      style={{ background: "#FBF1DA", borderColor: "#F0D9A6", color: "#9A6C1F" }}
    >
      <span>⚠️</span>
      <span className="truncate max-w-[220px]">{label} — encerrar</span>
    </button>
  );
}

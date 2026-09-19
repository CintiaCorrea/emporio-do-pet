"use client";
// QUEM ESTÁ USANDO O PORTAL DO TUTOR.
//
// Cintia, 15/09/2026: "posso ter uma aba, ou um local onde eu consiga saber quais tutores estão
// no portal do tutor, para que eu possa fazer o acompanhamento?"
//
// O portal não tem cadastro nem senha — o tutor entra com um código no WhatsApp. Então "estar no
// portal" não é um campo na ficha: é ter entrado pelo menos uma vez. A lista sai do registro de
// acessos, e por isso responde uma pergunta melhor que "quem tem acesso": QUEM VOLTOU.

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", TEAL = "#009AAC", VERDE = "#0F6E56";

const dia = (s: string) => new Date(s).toLocaleDateString("pt-BR");
const quando = (s: string) => {
  const dias = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  if (dias < 60) return "há 1 mês";
  return `há ${Math.floor(dias / 30)} meses`;
};

export default function PortalTutoresPage() {
  usePageTitle("Portal do tutor", "Quem está usando");
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    fetch("/api/portal/admin/uso", { cache: "no-store" })
      .then((r) => r.json())
      .then(setDados)
      .catch(() => setDados({ total: 0, ativos30d: 0, tutores: [] }))
      .finally(() => setLoading(false));
  }, []);

  const lista = useMemo(() => {
    const t = dados?.tutores || [];
    const q = filtro.trim().toLowerCase();
    return q ? t.filter((x: any) => String(x.nome).toLowerCase().includes(q)) : t;
  }, [dados, filtro]);

  // Quem entrou UMA vez só é quem experimentou e não voltou — é a coluna que diz se o portal
  // está pegando ou se a equipe só mandou o código uma vez.
  const umaVezSo = (dados?.tutores || []).filter((t: any) => t.entradas === 1).length;

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="text-[13px]" style={{ color: MUT }}>
          <b style={{ color: NAVY }}>{dados?.total ?? 0}</b> tutor(es) já entraram
          {dados?.ativos30d != null ? <span> · <b style={{ color: VERDE }}>{dados.ativos30d}</b> nos últimos 30 dias</span> : null}
          {umaVezSo ? <span> · {umaVezSo} entraram uma vez só</span> : null}
        </div>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por nome…"
          className="text-[12px] px-2.5 py-1 rounded-md border flex-1 min-w-[180px] max-w-[280px]"
          style={{ borderColor: LINE }}
        />
        <Link href="/dashboard/configuracoes/portal" className="ml-auto text-[11.5px] font-semibold" style={{ color: TEAL }}>⚙️ Configurar o portal</Link>
      </div>

      <div className="text-[11.5px] mb-3" style={{ color: MUT }}>
        O tutor entra com um código enviado no WhatsApp — não há senha nem cadastro. Esta lista é
        de quem já entrou pelo menos uma vez.
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: MUT }}>Carregando…</div>
      ) : !lista.length ? (
        <div className="py-20 text-center" style={{ color: MUT }}>
          <div className="text-[15px] font-semibold" style={{ color: NAVY }}>
            {dados?.total ? "Nenhum tutor com esse nome." : "Ninguém entrou no portal ainda."}
          </div>
          {!dados?.total ? (
            <div className="text-[12px] mt-1">O acesso é enviado pelo WhatsApp, na ficha do cliente.</div>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr style={{ background: "#F7F4EC" }}>
                {["Tutor", "Pets", "Entradas", "Primeira vez", "Última vez"].map((h, i) => (
                  <th key={h} className="text-[11px] font-semibold px-3 py-2" style={{ color: MUT, textAlign: i > 0 ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((t: any) => (
                <tr key={t.tutorId} style={{ borderTop: `1px solid ${LINE}` }}>
                  <td className="px-3 py-2">
                    <Link href={`/dashboard/erp/tutores/${t.tutorId}`} target="_blank" rel="noopener" className="text-[13px] font-medium" style={{ color: TEAL }}>{t.nome} ↗</Link>
                  </td>
                  <td className="px-3 py-2 text-[12.5px] tabular-nums" style={{ color: MUT, textAlign: "right" }}>{t.pets}</td>
                  <td className="px-3 py-2 text-[12.5px] tabular-nums font-semibold" style={{ color: t.entradas > 1 ? VERDE : MUT, textAlign: "right" }}>{t.entradas}</td>
                  <td className="px-3 py-2 text-[12.5px] tabular-nums" style={{ color: MUT, textAlign: "right", whiteSpace: "nowrap" }}>{dia(t.primeiraEm)}</td>
                  <td className="px-3 py-2 text-[12.5px]" style={{ color: NAVY, textAlign: "right", whiteSpace: "nowrap" }}>{quando(t.ultimaEm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

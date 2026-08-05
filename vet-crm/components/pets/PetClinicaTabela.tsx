"use client";

function d(x: any) { return x ? new Date(x).toLocaleDateString("pt-BR") : "—"; }
function hm(x: any) { return x ? new Date(x).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""; }
function durLabel(min: any) {
  const n = Number(min) || 0;
  if (!n) return "—";
  if (n >= 60) return `${Math.floor(n / 60)}h${String(n % 60).padStart(2, "0")}`;
  return `${n} min`;
}

// Normaliza o status (que pode vir em inglês SCHEDULED/COMPLETED… ou em pt-BR
// Agendado/Realizado…) para uma "pílula" com cor + rótulo amigável.
function statusPill(s: any): { cls: string; lbl: string; cancelado: boolean } {
  const v = String(s || "").toLowerCase();
  if (/(realiz|atend|conclu|complet|done|finish|compareceu)/.test(v)) return { cls: "at", lbl: "Atendido", cancelado: false };
  if (/(cancel)/.test(v)) return { cls: "ca", lbl: "Cancelado", cancelado: true };
  if (/(remarc)/.test(v)) return { cls: "ca", lbl: "Remarcado", cancelado: true };
  if (/(falt|no.?show|ausen)/.test(v)) return { cls: "fa", lbl: "Faltou", cancelado: false };
  if (/(agend|schedul|confirm|marc|pend)/.test(v)) return { cls: "ag", lbl: "Agendado", cancelado: false };
  return { cls: "ag", lbl: s ? String(s) : "—", cancelado: false };
}
const PILL: Record<string, { bg: string; fg: string }> = {
  at: { bg: "#E9F6EF", fg: "#0F6E56" },
  ag: { bg: "#E6F1FB", fg: "#185FA5" },
  ca: { bg: "#FBEBEB", fg: "#A32D2D" },
  fa: { bg: "#FBF0DD", fg: "#8a5a0b" },
};

export default function PetClinicaTabela({
  view, atendimentos = [], tipoLabel, onAbrir,
}: {
  view: "agenda" | "vendas";
  atendimentos?: any[];
  tipoLabel?: (t: any) => string;
  onAbrir?: (id: string) => void;
}) {
  const lbl = (t: any) => (tipoLabel ? tipoLabel(t) : (t || "—"));
  if (!atendimentos || atendimentos.length === 0) {
    return <div className="border rounded-xl p-6 text-center text-sm text-gray-400" style={{ borderColor: "#E8DFC8" }}>{view === "agenda" ? "Nenhum agendamento." : "Nenhuma venda registrada."}</div>;
  }

  if (view === "agenda") {
    const th = "text-left text-[10.5px] font-bold uppercase tracking-wide text-[#8A857A] px-3.5 py-2 border-b border-[#E8DFC8]";
    return (
      <div className="border rounded-2xl overflow-hidden bg-white" style={{ borderColor: "#E8DFC8" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
          <span className="text-[14px] font-bold text-[#014D5E] flex items-center gap-1.5">📅 Histórico de agendamentos</span>
          <span className="ml-auto text-[12px] font-medium text-[#8A857A]">{atendimentos.length} no total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead><tr><th className={th}>Data</th><th className={th}>Tipo</th><th className={th}>Profissional</th><th className={th}>Status</th><th className={th}>Duração</th><th className={th}></th></tr></thead>
            <tbody>
              {atendimentos.map((a: any) => {
                const st = statusPill(a.status);
                const cor = PILL[st.cls] || PILL.ag;
                return (
                  <tr key={a.id} className="border-b hover:bg-[#F7FBFC]" style={{ borderColor: "#F0EAD9", color: st.cancelado ? "#B0ACA2" : undefined }}>
                    <td className="px-3.5 py-2.5 font-semibold whitespace-nowrap" style={{ color: st.cancelado ? "#B0ACA2" : "#0E2244", textDecoration: st.cancelado ? "line-through" : undefined }}>{d(a.date)} · {hm(a.date)}</td>
                    <td className="px-3.5 py-2.5"><span className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: st.cancelado ? "#F0EDE6" : "#EAF3DE", color: st.cancelado ? "#B0ACA2" : "#4b6b1f", textDecoration: st.cancelado ? "line-through" : undefined }}>{lbl(a.type)}</span></td>
                    <td className="px-3.5 py-2.5 text-[#5F5E5A]">{a.user?.name || "—"}</td>
                    <td className="px-3.5 py-2.5"><span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: cor.bg, color: cor.fg }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: cor.fg }} />{st.lbl}</span></td>
                    <td className="px-3.5 py-2.5 text-[#5F5E5A] tabular-nums whitespace-nowrap">{st.cancelado ? "—" : durLabel(a.duration)}</td>
                    <td className="px-3.5 py-2.5 text-right">{onAbrir && <button onClick={() => onAbrir(a.id)} className="text-[11.5px] font-semibold text-[#009AAC] hover:underline whitespace-nowrap">abrir ›</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const th = "text-left text-[11px] font-semibold text-white px-2.5 py-1.5";
  const td = "px-2.5 py-1.5 text-xs";
  const bc = "#F0EAD9";
  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
      <table className="w-full border-collapse">
        <thead><tr style={{ background: "#014D5E" }}><th className={th}>Data</th><th className={th}>Serviço</th><th className={th}>Valor</th><th className={th}>Status</th></tr></thead>
        <tbody>
          {atendimentos.map((a: any) => {
            const servs = Array.isArray(a.treatments) && a.treatments.length > 0 ? a.treatments.map((t: any) => t.product?.name).filter(Boolean).join(", ") : lbl(a.type);
            return (
              <tr key={a.id} className="border-b" style={{ borderColor: bc }}>
                <td className={td} style={{ color: "#0E2244" }}>{d(a.date)}</td>
                <td className={td}>{servs || "—"}</td>
                <td className={td} style={{ color: "#0F6E56", fontWeight: 600 }}>{Number(a.value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className={td}>{a.status || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

function d(x: any) { return x ? new Date(x).toLocaleDateString("pt-BR") : "—"; }
function hm(x: any) { return x ? new Date(x).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""; }

export default function PetClinicaTabela({ view, atendimentos = [], tipoLabel }: { view: "agenda" | "vendas"; atendimentos?: any[]; tipoLabel?: (t: any) => string }) {
  const lbl = (t: any) => (tipoLabel ? tipoLabel(t) : (t || "—"));
  if (!atendimentos || atendimentos.length === 0) {
    return <div className="border rounded-xl p-6 text-center text-sm text-gray-400" style={{ borderColor: "#E8DFC8" }}>{view === "agenda" ? "Nenhum agendamento." : "Nenhuma venda registrada."}</div>;
  }
  const th = "text-left text-[11px] font-semibold text-white px-2.5 py-1.5";
  const td = "px-2.5 py-1.5 text-xs";
  const bc = "#F0EAD9";
  if (view === "agenda") {
    return (
      <div className="border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
        <table className="w-full border-collapse">
          <thead><tr style={{ background: "#014D5E" }}><th className={th}>Data</th><th className={th}>Tipo</th><th className={th}>Profissional</th><th className={th}>Status</th><th className={th}>Duração</th></tr></thead>
          <tbody>
            {atendimentos.map((a: any) => (
              <tr key={a.id} className="border-b" style={{ borderColor: bc }}>
                <td className={td} style={{ color: "#0E2244" }}>{d(a.date)} {hm(a.date)}</td>
                <td className={td}>{lbl(a.type)}</td>
                <td className={td}>{a.user?.name || "—"}</td>
                <td className={td}>{a.status || "—"}</td>
                <td className={td}>{a.duration ? `${a.duration} min` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
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

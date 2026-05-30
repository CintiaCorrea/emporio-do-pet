"use client";

interface Event {
  id: string;
  data: string;
  titulo?: string | null;
  descricao?: string | null;
  valor?: number | null;
  tag?: string;
}

export function Timeline({ events, emptyMsg = "Sem registros." }: { events: Event[]; emptyMsg?: string }) {
  if (events.length === 0) {
    return <div className="bg-white border rounded-xl p-4 text-sm text-gray-500 text-center" style={{ borderColor: "#E5DCC9" }}>{emptyMsg}</div>;
  }
  const fmtR = (v?: number | null) => v == null ? "" : `R$ ${Number(v).toFixed(2)}`;
  return (
    <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E5DCC9" }}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Data</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Descrição</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Valor</th>
          </tr>
        </thead>
        <tbody>
          {events.map(e => (
            <tr key={e.id} className="border-b hover:bg-gray-50" style={{ borderColor: "#F0EBE0" }}>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{new Date(e.data).toLocaleDateString("pt-BR")}</td>
              <td className="px-3 py-2">{e.descricao || e.titulo || "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{fmtR(e.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

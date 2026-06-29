"use client";
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuRefreshCw, LuUsers, LuExternalLink } from "react-icons/lu";

type Cliente = { id: string; name: string };
type LeadDup = { lead: { id: string; name?: string; phone?: string; status?: string }; cliente: Cliente; por: string };
type GrupoCli = { por: string; chave: string; clientes: { id: string; name: string; updatedAt: string }[] };

export default function DuplicadosPage() {
  usePageTitle("Duplicados", "Varredura (só leitura) de clientes e leads repetidos");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("/api/crm/duplicados");
      if (!r.ok) throw new Error(`Falha ao carregar (${r.status})`);
      setData(await r.json());
    } catch (e: any) {
      setErro(e?.message || "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  const resumo = data?.resumo;
  const leads: LeadDup[] = data?.leadsDuplicados || [];
  const grupos: GrupoCli[] = data?.clientesDuplicados || [];
  const fichaCliente = (id: string) => `/dashboard/erp/tutores/${id}`;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <p className="text-[13px] text-gray-500 flex-1">
          Reconhecimento na prioridade <b>telefone (8 dígitos)</b> → <b>CPF</b> → <b>última alteração</b>. Esta tela <b>não altera nada</b> — é só para revisar.
        </p>
        <button onClick={carregar} disabled={loading} className="text-[13px] px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5 disabled:opacity-60" style={{ background: "#009AAC" }}>
          <LuRefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
        </button>
      </div>

      {loading && <div className="text-center text-sm text-gray-400 py-12">Varrendo a base...</div>}
      {erro && <div className="rounded-lg px-4 py-3 text-[13px]" style={{ background: "#FCEBEB", color: "#A32D2D" }}>⚠️ {erro}</div>}

      {resumo && !loading && (
        <>
          <div className="flex gap-2.5 mb-5 flex-wrap">
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: "#F1F5F9" }}><div className="text-[11px] text-gray-500">Clientes</div><div className="text-[18px] font-medium" style={{ color: "#0E2244" }}>{resumo.totalClientes}</div></div>
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: "#F1F5F9" }}><div className="text-[11px] text-gray-500">Leads ativos</div><div className="text-[18px] font-medium" style={{ color: "#0E2244" }}>{resumo.totalLeads}</div></div>
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: resumo.leadsDuplicados ? "#FAEEDA" : "#E1F5EE" }}><div className="text-[11px] text-gray-500">Leads = cliente</div><div className="text-[18px] font-medium" style={{ color: resumo.leadsDuplicados ? "#854F0B" : "#0F6E56" }}>{resumo.leadsDuplicados}</div></div>
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: resumo.gruposClientesDuplicados ? "#FAEEDA" : "#E1F5EE" }}><div className="text-[11px] text-gray-500">Clientes repetidos</div><div className="text-[18px] font-medium" style={{ color: resumo.gruposClientesDuplicados ? "#854F0B" : "#0F6E56" }}>{resumo.gruposClientesDuplicados}</div></div>
          </div>

          {/* Leads que batem com um cliente */}
          <div className="bg-white border rounded-2xl overflow-hidden mb-5" style={{ borderColor: "#e8edf0" }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "#eef0ec", background: "#fafbfa" }}>
              <LuUsers size={15} style={{ color: "#854F0B" }} />
              <span className="text-[13px] font-medium" style={{ color: "#0E2244" }}>Leads que já são cliente</span>
              <span className="ml-auto text-[11px] text-white rounded-full px-2 py-0.5" style={{ background: leads.length ? "#854F0B" : "#94a3b8" }}>{leads.length}</span>
            </div>
            {leads.length === 0 ? (
              <div className="text-center text-[12px] text-gray-400 py-8">Nenhum lead duplicado de cliente. 🎉</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#f1f3ef" }}>
                {leads.map((l, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-[13px]">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: "#0E2244" }}>{l.lead.name || "(lead sem nome)"}</div>
                      <div className="text-[11px] text-gray-500">{l.lead.phone || "sem telefone"}{l.lead.status ? ` · ${l.lead.status}` : ""} · casou por <b>{l.por}</b></div>
                    </div>
                    <span className="text-gray-300">→</span>
                    <a href={fichaCliente(l.cliente.id)} className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-md" style={{ color: "#014D5E", background: "#E1F3F5" }}>
                      {l.cliente.name} <LuExternalLink size={12} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clientes duplicados entre si */}
          <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#e8edf0" }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "#eef0ec", background: "#fafbfa" }}>
              <LuUsers size={15} style={{ color: "#A32D2D" }} />
              <span className="text-[13px] font-medium" style={{ color: "#0E2244" }}>Clientes repetidos entre si</span>
              <span className="ml-auto text-[11px] text-white rounded-full px-2 py-0.5" style={{ background: grupos.length ? "#A32D2D" : "#94a3b8" }}>{grupos.length}</span>
            </div>
            {grupos.length === 0 ? (
              <div className="text-center text-[12px] text-gray-400 py-8">Nenhum cliente duplicado. 🎉</div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#f1f3ef" }}>
                {grupos.map((g, i) => (
                  <div key={i} className="px-4 py-2.5 text-[13px]">
                    <div className="text-[11px] text-gray-500 mb-1">Mesmo <b>{g.por}</b> ({g.chave})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.clientes.map((c) => (
                        <a key={c.id} href={fichaCliente(c.id)} className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-md" style={{ color: "#014D5E", background: "#E1F3F5" }}>
                          {c.name} <LuExternalLink size={12} />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

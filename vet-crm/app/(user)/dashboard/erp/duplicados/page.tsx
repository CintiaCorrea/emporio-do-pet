"use client";
// Roupagem repaginada 04/07 para o padrão Base44 (bege + emojis) — LÓGICA 100% preservada.
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

// Paleta Base44
const TEAL = "#009AAC";
const TEAL_DARK = "#014D5E";
const LINE = "#E8E2D6";      // borda do cartao
const DIV = "#F0EBE0";       // divisoria interna / chip neutro
const SOFT = "#FBF9F4";      // area suave (header do cartao)
const TINT = "#E0F4F6";      // agua (link cliente)
const TXT = "#1F2A2E";       // corpo / texto forte
const TXT2 = "#5C6B70";      // secundario
const TXT3 = "#8A989D";      // dica / rotulo

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
    <div className="p-4" style={{ background: "#F6F2EA" }}>
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <p className="text-[13px] flex-1" style={{ color: TXT2 }}>
          Reconhecimento na prioridade <b>telefone (8 dígitos)</b> → <b>CPF</b> → <b>última alteração</b>. Esta tela <b>não altera nada</b> — é só para revisar.
        </p>
        <button onClick={carregar} disabled={loading} className="text-[13px] px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5 disabled:opacity-60" style={{ background: TEAL }}>
          <span className={loading ? "animate-spin" : ""} style={{ fontSize: 13 }}>🔄</span> Atualizar
        </button>
      </div>

      {loading && <div className="text-center text-sm py-12" style={{ color: TXT3 }}>Varrendo a base...</div>}
      {erro && <div className="rounded-lg px-4 py-3 text-[13px]" style={{ background: "#FCEBEB", color: "#A32D2D" }}>⚠️ {erro}</div>}

      {resumo && !loading && (
        <>
          <div className="flex gap-2.5 mb-5 flex-wrap">
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: DIV }}><div className="text-[11px]" style={{ color: TXT3 }}>Clientes</div><div className="text-[18px] font-medium" style={{ color: TXT }}>{resumo.totalClientes}</div></div>
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: DIV }}><div className="text-[11px]" style={{ color: TXT3 }}>Leads ativos</div><div className="text-[18px] font-medium" style={{ color: TXT }}>{resumo.totalLeads}</div></div>
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: resumo.leadsDuplicados ? "#FAEEDA" : "#E1F5EE" }}><div className="text-[11px]" style={{ color: TXT3 }}>Leads = cliente</div><div className="text-[18px] font-medium" style={{ color: resumo.leadsDuplicados ? "#854F0B" : "#0F6E56" }}>{resumo.leadsDuplicados}</div></div>
            <div className="rounded-lg px-3.5 py-2.5" style={{ background: resumo.gruposClientesDuplicados ? "#FAEEDA" : "#E1F5EE" }}><div className="text-[11px]" style={{ color: TXT3 }}>Clientes repetidos</div><div className="text-[18px] font-medium" style={{ color: resumo.gruposClientesDuplicados ? "#854F0B" : "#0F6E56" }}>{resumo.gruposClientesDuplicados}</div></div>
          </div>

          {/* Leads que batem com um cliente */}
          <div className="bg-white border rounded-2xl overflow-hidden mb-5" style={{ borderColor: LINE }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: DIV, background: SOFT }}>
              <span style={{ fontSize: 14 }}>🔀</span>
              <span className="text-[13px] font-medium" style={{ color: TXT }}>Leads que já são cliente</span>
              <span className="ml-auto text-[11px] text-white rounded-full px-2 py-0.5" style={{ background: leads.length ? "#854F0B" : TXT3 }}>{leads.length}</span>
            </div>
            {leads.length === 0 ? (
              <div className="text-center text-[12px] py-8" style={{ color: TXT3 }}>Nenhum lead duplicado de cliente. 🎉</div>
            ) : (
              <div className="divide-y" style={{ borderColor: DIV }}>
                {leads.map((l, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-[13px]">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: TXT }}>{l.lead.name || "(lead sem nome)"}</div>
                      <div className="text-[11px]" style={{ color: TXT3 }}>{l.lead.phone || "sem telefone"}{l.lead.status ? ` · ${l.lead.status}` : ""} · casou por <b>{l.por}</b></div>
                    </div>
                    <span style={{ color: TXT3 }}>→</span>
                    <a href={fichaCliente(l.cliente.id)} className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-md" style={{ color: TEAL_DARK, background: TINT }}>
                      {l.cliente.name} <span style={{ fontSize: 11 }}>🔗</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Clientes duplicados entre si */}
          <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: LINE }}>
            <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: DIV, background: SOFT }}>
              <span style={{ fontSize: 14 }}>🔀</span>
              <span className="text-[13px] font-medium" style={{ color: TXT }}>Clientes repetidos entre si</span>
              <span className="ml-auto text-[11px] text-white rounded-full px-2 py-0.5" style={{ background: grupos.length ? "#A32D2D" : TXT3 }}>{grupos.length}</span>
            </div>
            {grupos.length === 0 ? (
              <div className="text-center text-[12px] py-8" style={{ color: TXT3 }}>Nenhum cliente duplicado. 🎉</div>
            ) : (
              <div className="divide-y" style={{ borderColor: DIV }}>
                {grupos.map((g, i) => (
                  <div key={i} className="px-4 py-2.5 text-[13px]">
                    <div className="text-[11px] mb-1" style={{ color: TXT3 }}>Mesmo <b>{g.por}</b> ({g.chave})</div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.clientes.map((c) => (
                        <a key={c.id} href={fichaCliente(c.id)} className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-md" style={{ color: TEAL_DARK, background: TINT }}>
                          {c.name} <span style={{ fontSize: 11 }}>🔗</span>
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

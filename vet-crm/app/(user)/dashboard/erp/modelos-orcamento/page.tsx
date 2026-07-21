"use client";
// [EMP-COWORK] Modelos de orçamento (Vendas · Fase 2 config). Orçamentos-modelo reutilizáveis.
// Guardado na lista `orcamentomodelo` (JSON: {nome, ativo, itens:[{descricao, servicoId, quantidade, valorUnitario}]}).
// A tela cadastra; o "usar modelo" no orçamento/PDV é ligado depois (como as formas).

import { useEffect, useMemo, useState , useRef} from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const num = (s: any) => Number(String(s ?? "").replace(",", ".")) || 0;
const novoModelo = () => ({ id: "", nome: "", ativo: true, itens: [] as any[] });

export default function ModelosOrcamentoPage() {
  usePageTitle("Modelo de orçamento", "Orçamentos-modelo reutilizáveis");
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [modelos, setModelos] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(novoModelo());
  const [saving, setSaving] = useState(false);
  const [busca, setBusca] = useState("");

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [m, s] = await Promise.all([
        fetch("/api/listas?lista=orcamentomodelo").then((r) => r.json()).catch(() => []),
        fetch("/api/servicos/itens?limit=1000").then((r) => r.json()).catch(() => []),
      ]);
      const arr = Array.isArray(m) ? m : (m.itens || m.data || []);
      setModelos(arr.map((x: any) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return { id: x.id, nome: "?", itens: [] }; } }));
      setServicos(Array.isArray(s) ? s : (s.itens || s.data || []));
    } catch {}
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const totalDe = (m: any) => (m.itens || []).reduce((sm: number, it: any) => sm + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0);
  const ordenados = useMemo(() => [...modelos].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")), [modelos]);

  const abrir = (m?: any) => { setForm(m ? { id: m.id, nome: m.nome || "", ativo: m.ativo !== false, itens: (m.itens || []).map((i: any) => ({ ...i })) } : novoModelo()); setBusca(""); setOpen(true); };
  const addItem = (s?: any) => setForm((f: any) => ({ ...f, itens: [...f.itens, s ? { descricao: s.nome, servicoId: s.id, quantidade: 1, valorUnitario: Number(s.valorPadrao || 0) } : { descricao: "", servicoId: "", quantidade: 1, valorUnitario: 0 }] }));
  const updItem = (i: number, patch: any) => setForm((f: any) => ({ ...f, itens: f.itens.map((it: any, j: number) => j === i ? { ...it, ...patch } : it) }));
  const rmItem = (i: number) => setForm((f: any) => ({ ...f, itens: f.itens.filter((_: any, j: number) => j !== i) }));

  const salvar = async () => {
    if (!form.nome.trim()) { alert("Informe o nome do modelo."); return; }
    setSaving(true);
    try {
      const payload = { nome: form.nome.trim(), ativo: !!form.ativo, itens: form.itens.map((it: any) => ({ descricao: it.descricao || "", servicoId: it.servicoId || "", quantidade: Number(it.quantidade) || 1, valorUnitario: Number(it.valorUnitario) || 0 })) };
      const url = form.id ? `/api/listas/${form.id}` : "/api/listas";
      const res = await fetch(url, { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form.id ? { valor: JSON.stringify(payload) } : { lista: "orcamentomodelo", valor: JSON.stringify(payload) }) });
      if (!res.ok) throw new Error();
      setOpen(false); load();
    } catch { alert("Erro ao salvar o modelo."); }
    finally { setSaving(false); }
  };
  const excluir = async (m: any) => { if (!confirm(`Excluir o modelo "${m.nome}"?`)) return; try { await fetch(`/api/listas/${m.id}`, { method: "DELETE", credentials: "include" }); load(); } catch {} };

  const matches = useMemo(() => { const q = busca.trim().toLowerCase(); if (!q) return []; return servicos.filter((s: any) => (s.nome || "").toLowerCase().includes(q)).slice(0, 8); }, [servicos, busca]);
  const totalForm = form.itens.reduce((sm: number, it: any) => sm + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0);

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[13px] text-[#374151]">{modelos.length} modelo(s) · preenchem o orçamento/venda de uma vez</div>
        <button onClick={() => abrir()} className="text-[12px] font-medium text-white bg-[#009AAC] px-3.5 py-1.5 rounded-lg">➕ Novo modelo</button>
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#374151]">Carregando...</div>
      ) : modelos.length === 0 ? (
        <div className="bg-white border rounded-[14px] px-6 py-14 text-center" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-3xl mb-2">📄</div>
          <div className="text-sm text-[#5C6B70] mb-1">Nenhum modelo ainda.</div>
          <div className="text-[12px] text-[#374151] mb-3">Crie modelos pros procedimentos comuns (castração, cirurgias, protocolos…).</div>
          <button onClick={() => abrir()} className="text-[12px] font-medium text-white bg-[#009AAC] px-4 py-2 rounded-lg">➕ Novo modelo</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ordenados.map((m) => (
            <div key={m.id} className="bg-white border rounded-[13px] px-4 py-3 flex items-center gap-3" style={{ borderColor: "#E8E2D6" }}>
              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#E0F4F6" }}>📄</span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-[#014D5E] truncate">{m.nome}{m.ativo === false && <span className="text-[10px] text-[#374151] ml-2">inativo</span>}</div>
                <div className="text-[11.5px] text-[#374151]">{(m.itens || []).length} item(ns)</div>
              </div>
              <div className="text-[15px] font-medium text-[#014D5E] tabular-nums flex-shrink-0">{fmtBRL(totalDe(m))}</div>
              <div className="flex gap-1 flex-shrink-0 ml-2">
                <button onClick={() => abrir(m)} className="text-[13px] px-1">✏️</button>
                <button onClick={() => excluir(m)} className="text-[13px] px-1">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== EDITOR ===== */}
      {open && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">📄 {form.id ? "Editar modelo" : "Novo modelo"}</h3>
              <button onClick={() => setOpen(false)} className="text-[#374151] text-lg leading-none">✕</button>
            </div>
            <div className="p-5">
              <label className="text-[11px] text-[#374151] block mb-1">Nome do modelo *</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Castração de gata" className="w-full border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC] mb-3" style={{ borderColor: "#E8E2D6" }} />

              <div className="border rounded-[11px] overflow-hidden bg-white" style={{ borderColor: "#E8E2D6" }}>
                {form.itens.length === 0 && <div className="px-4 py-4 text-center text-[12px] text-[#374151]">Adicione itens ao modelo abaixo.</div>}
                {form.itens.map((it: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                    <input value={it.descricao} onChange={(e) => updItem(i, { descricao: e.target.value })} placeholder="Item" className="flex-1 min-w-0 border rounded px-2 py-1 text-[12.5px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                    <input value={it.quantidade} onChange={(e) => updItem(i, { quantidade: e.target.value })} title="Qtd" className="w-12 border rounded px-1 py-1 text-[12px] text-center bg-white" style={{ borderColor: "#E8E2D6" }} />
                    <span className="text-[#374151] text-[11px]">×</span>
                    <input value={it.valorUnitario} onChange={(e) => updItem(i, { valorUnitario: num(e.target.value) })} title="Valor" className="w-20 border rounded px-2 py-1 text-[12px] text-right tabular-nums bg-white" style={{ borderColor: "#E8E2D6" }} />
                    <button onClick={() => rmItem(i)} className="text-[12px]">🗑️</button>
                  </div>
                ))}
                {/* busca catálogo */}
                <div className="px-3 py-2 border-t relative" style={{ borderColor: "#F0EBE0" }}>
                  <div className="flex items-center gap-2">
                    <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Buscar serviço do catálogo…" className="flex-1 border rounded px-2 py-1 text-[12.5px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                    <button onClick={() => addItem()} className="text-[11.5px] font-medium text-[#00798A] whitespace-nowrap">➕ item livre</button>
                  </div>
                  {matches.length > 0 && (
                    <div className="absolute left-3 right-3 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-52 overflow-y-auto" style={{ borderColor: "#E8E2D6" }}>
                      {matches.map((s: any) => (
                        <button key={s.id} onClick={() => { addItem(s); setBusca(""); }} className="flex w-full justify-between items-center px-3 py-2 text-[12.5px] border-b last:border-b-0 hover:bg-[#FBF9F4]" style={{ borderColor: "#F0EBE0" }}>
                          <span className="text-[#1F2A2E] text-left">{s.nome}</span><span className="text-[#374151]">{fmtBRL(Number(s.valorPadrao || 0))}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-3">
                <label className="flex items-center gap-2 text-[12px] text-[#5C6B70] cursor-pointer"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativo</label>
                <div className="text-[14px]"><span className="text-[#374151] text-[12px] mr-2">Total</span><span className="font-medium text-[#014D5E] tabular-nums">{fmtBRL(totalForm)}</span></div>
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={salvar} disabled={saving} className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{saving ? "Salvando..." : "Salvar modelo"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

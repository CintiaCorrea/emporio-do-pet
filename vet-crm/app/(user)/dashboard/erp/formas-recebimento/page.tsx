"use client";
// [EMP-COWORK] Formas de recebimento (Vendas · Fase 2 config). Cada maquininha (cartão) abre taxas por parcela.
// Guardado na lista genérica `formasrecebimento` (JSON no valor). Alimenta as formas do PDV / baixar comanda.

import { useEffect, useMemo, useState , useRef} from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { usePodeEditar } from "@/lib/permissions/context";
// Fonte única dos tipos e do "isto é cartão?" — a mesma que o recebimento usa pra decidir se
// pede bandeira/parcelas e se cobra a AUT. Ver lib/formasPagamento.
import { TIPOS_FORMA, tipoEhCartao, tipoEhMaquininha, tipoEhLink } from "@/lib/formasPagamento";

const TIPOS = [...TIPOS_FORMA];
const TIPO_EMOJI: Record<string, string> = { Dinheiro: "💵", Pix: "📱", "Maquininha (cartão)": "💳", "Link de pagamento": "🔗", "Crédito do cliente": "🏦", Boleto: "🧾", Outro: "💠" };
const PADROES = [
  { nome: "Dinheiro", tipo: "Dinheiro", conta: "Caixa" },
  { nome: "Pix", tipo: "Pix", conta: "" },
  { nome: "Crédito do cliente", tipo: "Crédito do cliente", conta: "" },
];
const novaForma = () => ({ id: "", nome: "", tipo: "Dinheiro", conta: "", contaId: "", adquirente: "", ativo: true, prazoCredito: "", prazoDebito: "", taxas: {} as Record<string, string> });

export default function FormasRecebimentoPage() {
  usePageTitle("Formas de recebimento", "Configurar formas de pagamento e taxas");
  const podeEditar = usePodeEditar(); // perfil VISUALIZA = esconde criar/editar/excluir
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [formas, setFormas] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]); // contas financeiras reais (fonte única)
  const [adquirentes, setAdquirentes] = useState<string[]>([]); // maquininhas da tabela de taxas
  const [expandido, setExpandido] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(novaForma());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const d = await fetch("/api/listas?lista=formasrecebimento").then((r) => r.json()).catch(() => []);
      const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      setFormas(arr.map((x: any) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return { id: x.id }; } }));
      const cs = await fetch("/api/financeiro/contas").then((r) => r.json()).catch(() => []);
      setContas(Array.isArray(cs) ? cs : (cs.itens || cs.data || []));
      const tx = await fetch("/api/financeiro/auditoria/taxas").then((r) => r.json()).catch(() => []);
      const txArr = Array.isArray(tx) ? tx : (tx.data || tx.itens || []);
      setAdquirentes([...new Set(txArr.map((t: any) => t.adquirente).filter(Boolean))] as string[]);
    } catch {}
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const abrir = (f?: any) => {
    // recarrega as contas na hora — pega contas criadas depois que a página abriu
    fetch("/api/financeiro/contas").then((r) => r.json()).then((cs) => setContas(Array.isArray(cs) ? cs : (cs.itens || cs.data || []))).catch(() => {});
    setForm(f ? { id: f.id, nome: f.nome || "", tipo: f.tipo || "Dinheiro", conta: f.conta || "", contaId: f.contaId || "", adquirente: f.adquirente || "", ativo: f.ativo !== false, prazoCredito: f.prazoCredito ?? "", prazoDebito: f.prazoDebito ?? "", taxas: { ...(f.taxas || {}) } } : novaForma());
    setOpen(true);
  };
  const salvar = async () => {
    if (!form.nome.trim()) { alert("Informe o nome da forma."); return; }
    setSaving(true);
    try {
      const isCartao = tipoEhCartao(form.tipo);
      const payload: any = { nome: form.nome.trim(), tipo: form.tipo, conta: form.conta.trim(), contaId: form.contaId || "", ativo: !!form.ativo };
      if (isCartao) { payload.prazoCredito = form.prazoCredito; payload.prazoDebito = form.prazoDebito; payload.adquirente = form.adquirente || ""; } // taxa vem da tabela por bandeira, não da forma
      const url = form.id ? `/api/listas/${form.id}` : "/api/listas";
      const res = await fetch(url, { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(form.id ? { valor: JSON.stringify(payload) } : { lista: "formasrecebimento", valor: JSON.stringify(payload) }) });
      if (!res.ok) throw new Error();
      setOpen(false); load();
    } catch { alert("Erro ao salvar a forma."); }
    finally { setSaving(false); }
  };
  const excluir = async (f: any) => {
    if (!confirm(`Excluir a forma "${f.nome}"?`)) return;
    try { await fetch(`/api/listas/${f.id}`, { method: "DELETE", credentials: "include" }); load(); } catch {}
  };
  const seed = async () => {
    if (!confirm("Criar as formas básicas (Dinheiro, Pix, Crédito do cliente)?")) return;
    try {
      for (const p of PADROES) await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "formasrecebimento", valor: JSON.stringify({ ...p, ativo: true }) }) });
      load();
    } catch {}
  };

  const resumo = (f: any) => {
    if (tipoEhCartao(f.tipo)) { return `${tipoEhLink(f.tipo) ? "Link de pagamento" : "Maquininha"}${f.adquirente ? ` · ${f.adquirente}` : ""}${f.conta ? ` · ${f.conta}` : ""}`; }
    return `${f.tipo}${f.conta ? ` · ${f.conta}` : ""}`;
  };
  const ordenadas = useMemo(() => [...formas].sort((a, b) => (a.nome || "").localeCompare(b.nome || "")), [formas]);

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[13px] text-[#374151]">{formas.length} forma(s) cadastrada(s) · aparecem no Ponto de venda e ao baixar comandas</div>
        {podeEditar && <button onClick={() => abrir()} className="text-[12px] font-medium text-white bg-[#009AAC] px-3.5 py-1.5 rounded-lg">➕ Adicionar forma</button>}
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#374151]">Carregando...</div>
      ) : formas.length === 0 ? (
        <div className="bg-white border rounded-[14px] px-6 py-14 text-center" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-3xl mb-2">💳</div>
          <div className="text-sm text-[#5C6B70] mb-1">Nenhuma forma cadastrada ainda.</div>
          <div className="text-[12px] text-[#374151] mb-3">Cadastre suas formas de pagamento (dinheiro, Pix, maquininhas…).</div>
          <div className="flex gap-2 justify-center">
            {podeEditar && <button onClick={() => abrir()} className="text-[12px] font-medium text-white bg-[#009AAC] px-4 py-2 rounded-lg">➕ Adicionar forma</button>}
            <button onClick={seed} className="text-[12px] font-medium text-[#5C6B70] bg-white border px-4 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>Criar formas básicas</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {ordenadas.map((f) => {
            const cartao = tipoEhCartao(f.tipo); const aberto = expandido === f.id;
            return (
              <div key={f.id} className="bg-white border rounded-[13px] overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => cartao && setExpandido(aberto ? null : f.id)}>
                  <span className="text-[12px] text-[#374151] w-3">{cartao ? (aberto ? "▾" : "▸") : ""}</span>
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#E0F4F6" }}>{TIPO_EMOJI[f.tipo] || "💠"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-[#014D5E] truncate">{f.nome}</div>
                    <div className="text-[11px] text-[#374151] truncate">{resumo(f)}{cartao && !aberto ? " · toque p/ ver" : ""}</div>
                  </div>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={f.ativo !== false ? { background: "#E1F5EE", color: "#0F6E56" } : { background: "#F0EBE0", color: "#374151" }}>{f.ativo !== false ? "Ativa" : "Inativa"}</span>
                    {podeEditar && <button onClick={(e) => { e.stopPropagation(); abrir(f); }} className="text-[13px]">✏️</button>}
                    {podeEditar && <button onClick={(e) => { e.stopPropagation(); excluir(f); }} className="text-[13px]">🗑️</button>}
                  </div>
                </div>
                {cartao && aberto && (
                  <div className="border-t px-4 py-3" style={{ borderColor: "#F0EBE0", background: "#FBF9F4" }}>
                    <div className="flex gap-5 flex-wrap mb-3 text-[11.5px] text-[#5C6B70]">
                      <span>Prazo crédito: <b className="text-[#014D5E]">{f.prazoCredito || "—"} dia(s)</b></span>
                      <span>Prazo débito: <b className="text-[#014D5E]">{f.prazoDebito || "—"} dia(s)</b></span>
                    </div>
                    <div className="flex gap-5 flex-wrap text-[11.5px] text-[#5C6B70]">
                      <span>{tipoEhLink(f.tipo) ? "Operadora" : "Maquininha"}: <b className="text-[#014D5E]">{f.adquirente || "— não ligada —"}</b></span>
                      <span>Taxas: <b className="text-[#014D5E]">tabela por bandeira</b> (Financeiro › Taxas)</span>
                    </div>
                    {podeEditar && <button onClick={() => abrir(f)} className="mt-3 text-[11.5px] font-medium text-[#00798A]">✏️ Editar</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== POPUP ADD/EDIT ===== */}
      {open && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">💳 {form.id ? "Editar forma" : "Nova forma de recebimento"}</h3>
              <button onClick={() => setOpen(false)} className="text-[#374151] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-3 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Nome *</label>
                  <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Maquininha InfinitePay" className="w-full border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
                <div><label className="text-[11px] text-[#374151] block mb-1">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{TIPOS.map((t) => <option key={t} value={t}>{TIPO_EMOJI[t]} {t}</option>)}</select></div>
                <div><label className="text-[11px] text-[#374151] block mb-1">Conta de destino</label>
                  <select value={form.contaId || ""} onChange={(e) => { const c = contas.find((x: any) => x.id === e.target.value); setForm({ ...form, contaId: e.target.value, conta: c ? (c.nome || "") : "" }); }} className="w-full border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>
                    <option value="">— Escolher conta —</option>
                    {contas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {!form.contaId && form.conta ? <div className="text-[10.5px] text-[#B45309] mt-1">Texto antigo: "{form.conta}" — selecione a conta real acima.</div> : null}
                  {contas.length === 0 ? <div className="text-[10.5px] text-[#374151] mt-1">Nenhuma conta ainda. Cadastre em Financeiro › Contas.</div> : null}
                </div>
              </div>

              {tipoEhCartao(form.tipo) && (
                <div className="border-t pt-3" style={{ borderColor: "#F0EBE0" }}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div><label className="text-[11px] text-[#374151] block mb-1">Prazo crédito (dias)</label>
                      <input type="number" value={form.prazoCredito} onChange={(e) => setForm({ ...form, prazoCredito: e.target.value })} placeholder="30" className="w-full border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
                    <div><label className="text-[11px] text-[#374151] block mb-1">Prazo débito (dias)</label>
                      <input type="number" value={form.prazoDebito} onChange={(e) => setForm({ ...form, prazoDebito: e.target.value })} placeholder="1" className="w-full border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
                  </div>
                  <div><label className="text-[11px] text-[#374151] block mb-1">Operadora <span className="text-[#B45309]">(liga às taxas)</span></label>
                    <input list="adquirentes-cadastrados" value={form.adquirente || ""} onChange={(e) => setForm({ ...form, adquirente: e.target.value })} placeholder="Ex.: InfinityPay, Nubank" className="w-full border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                    <datalist id="adquirentes-cadastrados">{adquirentes.map((a) => <option key={a} value={a} />)}</datalist>
                    <div className="text-[10.5px] text-[#374151] mt-1">Escolha uma da lista ou digite o nome. Operadora sem tabela de taxa funciona — só não calcula a taxa sozinha.</div>
                  </div>
                  <div className="text-[11.5px] text-[#0F6E56] mt-2.5" style={{ background: "#E1F5EE", borderRadius: 9, padding: "9px 11px" }}>
                    {tipoEhMaquininha(form.tipo)
                      ? <>💳 <b>Maquininha:</b> na hora de receber, a recepção escolhe bandeira e parcelas e digita a <b>AUT</b> do comprovante — é o número que casa a venda com o extrato. As <b>taxas</b> vêm de <b>Financeiro › Taxas</b>.</>
                      : <>🔗 <b>Link de pagamento:</b> a recepção escolhe bandeira e parcelas, e <b>não</b> digita identificador — link não imprime comprovante, a conferência é por valor e data.</>}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 text-[12.5px] text-[#5C6B70] cursor-pointer pt-1"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} /> Ativa (aparece no Ponto de venda)</label>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={salvar} disabled={saving} className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

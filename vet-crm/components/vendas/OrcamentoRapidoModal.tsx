"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { LuTrash, LuPlus, LuMessageSquare } from "react-icons/lu";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ddmm = (iso: string) => { const [, m, d] = String(iso).split("-"); return d && m ? `${d}/${m}` : iso; };

type Item = { descricao: string; qtd: string; valor: string };
type Props = {
  open: boolean;
  onClose: () => void;
  pet?: { id: string; name: string } | null;
  tutor?: { id: string; name: string } | null;
  onEnviarTexto?: (texto: string) => void; // envia na conversa aberta (fallback: /api/whatsapp/send)
  phone?: string | null;
};

export default function OrcamentoRapidoModal({ open, onClose, pet, tutor, onEnviarTexto, phone }: Props) {
  const [itens, setItens] = useState<Item[]>([{ descricao: "", qtd: "1", valor: "" }]);
  const [validade, setValidade] = useState("");
  const [obs, setObs] = useState("");
  const [cat, setCat] = useState<{ nome: string; valor: number }[]>([]);
  const [modelos, setModelos] = useState<any[]>([]);
  const [modeloSel, setModeloSel] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItens([{ descricao: "", qtd: "1", valor: "" }]); setValidade(""); setObs(""); setModeloSel("");
    // Modelos de orçamento salvos (podem trazer itens + observação específica).
    (async () => {
      try {
        const r = await fetch(`/api/listas?lista=orcamentomodelo`, { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
        setModelos(arr.map((x: any) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return null; } }).filter((m: any) => m && m.ativo !== false));
      } catch { setModelos([]); }
    })();
    // Catálogo (produtos/serviços) p/ preencher rápido — busca defensiva de nome/preço.
    (async () => {
      try {
        const r = await fetch(`/api/products?limit=1000`, { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.data || d.products || d.produtos || d.itens || []);
        const mapped = arr
          .map((s: any) => ({ nome: s.name || s.nome || "", valor: Number(s.price ?? s.preco ?? s.valor ?? 0), ativo: s.ativo }))
          .filter((x: any) => x.nome && x.ativo !== false);
        setCat(mapped);
      } catch { setCat([]); }
    })();
  }, [open]);

  if (!open) return null;

  const total = itens.reduce((s, it) => s + (Number(it.qtd) || 1) * (Number(it.valor) || 0), 0);
  const setItem = (i: number, patch: Partial<Item>) => setItens((arr) => arr.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addItem = () => setItens((arr) => [...arr, { descricao: "", qtd: "1", valor: "" }]);
  const delItem = (i: number) => setItens((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr));
  const preencherDoCatalogo = (i: number, nome: string) => { const s = cat.find((c) => c.nome === nome); if (s) setItem(i, { descricao: s.nome, valor: s.valor ? String(s.valor) : "" }); };
  const aplicarModelo = (id: string) => {
    setModeloSel(id);
    const m = modelos.find((x) => x.id === id);
    if (!m) { setItens([{ descricao: "", qtd: "1", valor: "" }]); setObs(""); return; }
    const its = (m.itens || []).map((it: any) => ({ descricao: it.descricao || "", qtd: String(it.quantidade ?? 1), valor: it.valorUnitario != null ? String(it.valorUnitario) : "" }));
    setItens(its.length ? its : [{ descricao: "", qtd: "1", valor: "" }]);
    setObs(m.observacao != null ? String(m.observacao) : "");
  };

  const itensValidos = () => itens.filter((it) => it.descricao.trim());

  async function salvar(): Promise<boolean> {
    const vs = itensValidos();
    if (!vs.length) { toast.error("Adicione ao menos um item."); return false; }
    if (!pet?.id) { toast.error("Selecione o pet."); return false; }
    try {
      const body = {
        petId: pet.id, tutorId: tutor?.id,
        validade: validade ? new Date(validade + "T12:00:00").toISOString() : undefined,
        observacao: obs.trim() || undefined,
        itens: vs.map((it) => ({ descricao: it.descricao.trim(), quantidade: Number(it.qtd) || 1, valorUnitario: Number(it.valor) || 0 })),
      };
      const r = await fetch(`/api/orcamentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      return true;
    } catch { toast.error("Erro ao salvar orçamento"); return false; }
  }

  function montarTexto(): string {
    const hoje = new Date().toLocaleDateString("pt-BR");
    const linhas = itensValidos().map((it) => {
      const q = Number(it.qtd) || 1; const v = Number(it.valor) || 0;
      return q > 1
        ? `• ${it.descricao.trim()}\n   ${q} × ${BRL(v)} = *${BRL(q * v)}*`
        : `• ${it.descricao.trim()} — *${BRL(v)}*`;
    });
    return [
      `💰 *Orçamento — ${pet?.name || "seu pet"}*`,
      `🏥 Empório do Pet · 🗓️ ${hoje}`,
      tutor?.name ? `👤 Tutor(a): ${tutor.name}` : null,
      ``,
      `*Itens do orçamento:*`,
      ...linhas,
      ``,
      `━━━━━━━━━━━━━━━`,
      `💵 *Total: ${BRL(total)}*`,
      validade ? `🗓️ Válido até ${ddmm(validade)}` : null,
      obs.trim() ? `` : null,
      obs.trim() ? `📝 *Observação:* ${obs.trim()}` : null,
      ``,
      `Qualquer dúvida, é só chamar por aqui! 🐾`,
      `— Equipe Empório do Pet`,
    ].filter((l) => l !== null).join("\n");
  }

  async function enviar() {
    if (!itensValidos().length) { toast.error("Adicione ao menos um item."); return; }
    setSaving(true);
    const ok = await salvar(); // salva o orçamento (aparece na busca e na ficha)
    const texto = montarTexto();
    if (onEnviarTexto) onEnviarTexto(texto);
    else if (phone) { try { await fetch(`/api/whatsapp/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: phone, content: texto, type: "TEXT" }) }); } catch {} }
    setSaving(false);
    if (ok) toast.success("Orçamento enviado e salvo ✅");
    onClose();
  }

  const inp: any = { border: "1px solid #E8E2D6", borderRadius: 8, padding: "6px 8px", fontSize: 12.5 };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: "#014D5E" }}>💲 Orçamento rápido — {pet?.name || "pet"}</h3>
          <button onClick={onClose} className="text-[#94a3b8] text-lg leading-none">×</button>
        </div>

        <div className="mb-2.5">
          <label className="text-[10px] text-[#8A857A] uppercase tracking-wide">Modelo de orçamento</label>
          <select value={modeloSel} onChange={(e) => aplicarModelo(e.target.value)} className="w-full mt-0.5" style={{ ...inp, width: "100%" }}>
            <option value="">Começar do zero…</option>
            {modelos.map((m: any) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          {modelos.length === 0 && (
            <p className="text-[10px] text-[#9aa0a8] mt-1">Nenhum modelo salvo ainda. Crie em <b>ERP › Modelos de orçamento</b> (com itens e observação).</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 max-h-[46vh] overflow-auto">
          <div className="grid grid-cols-[1fr_44px_84px_24px] gap-1.5 text-[10px] text-[#8A857A] uppercase tracking-wide px-0.5">
            <span>Item</span><span className="text-center">Qtd</span><span className="text-right">Valor</span><span></span>
          </div>
          {itens.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_44px_84px_24px] gap-1.5 items-center">
              <input list={`cat-${i}`} value={it.descricao} onChange={(e) => { setItem(i, { descricao: e.target.value }); preencherDoCatalogo(i, e.target.value); }} placeholder="Descrição ou catálogo…" style={inp} />
              <datalist id={`cat-${i}`}>{cat.map((c) => <option key={c.nome} value={c.nome} />)}</datalist>
              <input value={it.qtd} onChange={(e) => setItem(i, { qtd: e.target.value })} inputMode="numeric" style={{ ...inp, textAlign: "center" }} />
              <input value={it.valor} onChange={(e) => setItem(i, { valor: e.target.value })} inputMode="decimal" placeholder="0,00" style={{ ...inp, textAlign: "right" }} />
              <button onClick={() => delItem(i)} title="Remover" className="text-[#b23b39] flex items-center justify-center"><LuTrash size={13} /></button>
            </div>
          ))}
          <button onClick={addItem} className="self-start flex items-center gap-1 text-[11.5px] text-[#009AAC] mt-0.5"><LuPlus size={12} /> adicionar item</button>
        </div>

        <div className="flex items-center justify-between mt-3 pt-2.5 border-t" style={{ borderColor: "#F0EBE0" }}>
          <span className="text-[13px] font-bold" style={{ color: "#014D5E" }}>Total: {BRL(total)}</span>
          <label className="flex items-center gap-1.5 text-[11.5px] text-[#5C6B70]">Validade <input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} style={inp} /></label>
        </div>
        <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" className="w-full mt-2" style={inp} />

        <div className="flex gap-2 mt-3 justify-end">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8E2D6", color: "#64748b" }}>Cancelar</button>
          <button onClick={enviar} disabled={saving} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: "#009AAC" }}><LuMessageSquare size={13} /> {saving ? "..." : "Enviar pelo WhatsApp"}</button>
        </div>
      </div>
    </div>
  );
}

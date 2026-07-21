"use client";
// [EMP-COWORK] Vendas · Em atendimento (Fatia 1A) — comandas abertas de todas as origens + baixar no caixa.
// Comanda aberta = appointment com value>0 e paymentStatus != PAID (exceto internação, faturada pela conta da F5).
// Baixar = POST /api/caixa/{caixaAberto}/recebimento {appointmentId, valorTotal, formas}. Valores sensíveis com olhinho.

import { useEffect, useMemo, useState , useRef} from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const FORMAS = ["Dinheiro", "Pix", "Cartão de crédito", "Cartão de débito", "Crédito do cliente"];
const ORIGEM: Record<string, { lbl: string; bg: string; fg: string }> = {
  ATENDIMENTO: { lbl: "🩺 Atendimento", bg: "#E8F1F8", fg: "#1f5a82" },
  VENDA: { lbl: "🛒 Venda", bg: "#F0EBE0", fg: "#8A7B63" },
};
function especieEmoji(s?: string) { const k = (s || "").toUpperCase(); if (k.startsWith("CAN") || k.startsWith("DOG")) return "🐶"; if (k.startsWith("FEL") || k.startsWith("CAT") || k.startsWith("GAT")) return "🐱"; return "🐾"; }
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
function tempoDe(s?: string) { if (!s) return ""; try { const min = Math.max(0, Math.round((Date.now() - new Date(s).getTime()) / 60000)); if (min < 60) return `há ${min} min`; const h = Math.floor(min / 60); if (h < 24) return `há ${h} h`; return `há ${Math.floor(h / 24)} d`; } catch { return ""; } }
const hojeISO = () => new Date().toISOString().slice(0, 10);

export default function ComandasPage() {
  usePageTitle("Em atendimento", "Comandas abertas para baixar no caixa");
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [comandas, setComandas] = useState<any[]>([]);
  const [caixaAberto, setCaixaAberto] = useState<string | null>(null);
  const [baixadoHoje, setBaixadoHoje] = useState(0);
  const [olho, setOlho] = useState(false); // valores ocultos por padrão
  const [formasCfg, setFormasCfg] = useState<string[]>([]); // formas configuradas (Fase 2)

  const [det, setDet] = useState<any | null>(null);
  const [detItens, setDetItens] = useState<any[]>([]);
  const [detLoading, setDetLoading] = useState(false);
  const [forma, setForma] = useState("Dinheiro");
  const [baixando, setBaixando] = useState(false);
  const [detGrupo, setDetGrupo] = useState<any | null>(null); // baixar todas as comandas de um cliente (1B)

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const hoje = hojeISO();
      const [c, cx, rec, fm] = await Promise.all([
        fetch("/api/caixa/vendas?abertas=1").then((r) => r.json()).catch(() => []),
        fetch("/api/caixa").then((r) => r.json()).catch(() => []),
        fetch(`/api/caixa/recebimentos?from=${hoje}&to=${hoje}`).then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=formasrecebimento").then((r) => r.json()).catch(() => []),
      ]);
      setComandas(Array.isArray(c) ? c : (c.data || []));
      const caixas = Array.isArray(cx) ? cx : (cx.data || []);
      const aberto = caixas.find((k: any) => (k.status || "").toUpperCase() === "ABERTO");
      setCaixaAberto(aberto?.id || null);
      const recArr = Array.isArray(rec) ? rec : (rec.data || []);
      setBaixadoHoje(recArr.reduce((s: number, r: any) => s + Number(r.valorTotal || 0), 0));
      const fmArr = (Array.isArray(fm) ? fm : (fm.itens || fm.data || [])).map((x: any) => { try { return JSON.parse(x.valor); } catch { return null; } }).filter((v: any) => v && v.ativo !== false).map((v: any) => v.nome);
      setFormasCfg(fmArr);
    } catch {}
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const emAberto = useMemo(() => comandas.reduce((s, c) => s + Number(c.aberto || c.valor || 0), 0), [comandas]);
  const money = (v: number) => (olho ? fmtBRL(v) : "R$ •••");
  const formasList = formasCfg.length ? formasCfg : FORMAS;

  const abrir = async (c: any) => {
    setDet(c); setForma("Dinheiro"); setDetItens([]); setDetLoading(true);
    try {
      const d = await fetch(`/api/atendimentos/${c.id}`).then((r) => r.json()).catch(() => null);
      const arr = d?.items || d?.itens || [];
      setDetItens(Array.isArray(arr) ? arr : []);
    } catch { setDetItens([]); }
    setDetLoading(false);
  };

  const baixar = async () => {
    if (!det) return;
    if (!caixaAberto) { alert("Não há caixa aberto. Abra um caixa antes de baixar."); return; }
    const valor = Number(det.aberto || det.valor || 0);
    if (!confirm(`Baixar a comanda de ${det.tutor} em ${forma}? (${fmtBRL(valor)})`)) return;
    setBaixando(true);
    try {
      const res = await fetch(`/api/caixa/${caixaAberto}/recebimento`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ appointmentId: det.id, valorTotal: valor, desconto: 0, troco: 0, formas: [{ forma, valor }] }),
      });
      const dd = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dd?.message || "Erro ao baixar");
      setDet(null); load();
    } catch (e: any) { alert(e?.message || "Erro ao baixar a comanda."); }
    finally { setBaixando(false); }
  };

  // 1B — agrupa comandas abertas por cliente (uma linha por cliente; baixa tudo junto)
  const grupos = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of comandas) {
      const key = c.tutorId || c.tutor || c.id;
      if (!m.has(key)) m.set(key, { key, tutor: c.tutor, petSpecies: c.petSpecies, comandas: [] as any[], total: 0 });
      const g = m.get(key); g.comandas.push(c); g.total += Number(c.aberto || c.valor || 0);
    }
    return [...m.values()];
  }, [comandas]);

  const baixarGrupo = async () => {
    if (!detGrupo) return;
    if (!caixaAberto) { alert("Não há caixa aberto. Abra um caixa antes de baixar."); return; }
    if (!confirm(`Baixar TODAS as ${detGrupo.comandas.length} comandas de ${detGrupo.tutor} em ${forma}? (${fmtBRL(detGrupo.total)})`)) return;
    setBaixando(true);
    try {
      for (const c of detGrupo.comandas) {
        const valor = Number(c.aberto || c.valor || 0);
        const res = await fetch(`/api/caixa/${caixaAberto}/recebimento`, {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ appointmentId: c.id, valorTotal: valor, desconto: 0, troco: 0, formas: [{ forma, valor }] }),
        });
        if (!res.ok) { const dd = await res.json().catch(() => ({})); throw new Error(dd?.message || "Erro ao baixar"); }
      }
      setDetGrupo(null); load();
    } catch (e: any) { alert(e?.message || "Erro ao baixar as comandas."); }
    finally { setBaixando(false); }
  };

  return (
    <div className="p-6 w-full">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[13px] text-[#374151]">{comandas.length} comanda(s) aberta(s){caixaAberto ? "" : " · ⚠️ sem caixa aberto"}</div>
        <button onClick={() => setOlho((v) => !v)} className="text-[12px] font-medium text-[#5C6B70] bg-white border px-3 py-1.5 rounded-lg" style={{ borderColor: "#E8E2D6" }}>{olho ? "🙈 Ocultar valores" : "👁️ Mostrar valores"}</button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { l: "🟡 Comandas abertas", v: String(comandas.length), plain: true },
          { l: "💰 Em aberto", v: money(emAberto) },
          { l: "✅ Baixado hoje", v: money(baixadoHoje) },
        ].map((k) => (
          <div key={k.l} className="bg-white border rounded-xl px-4 py-3" style={{ borderColor: "#E8E2D6" }}>
            <div className="text-[10.5px] text-[#374151] uppercase tracking-wide">{k.l}</div>
            <div className="mt-1 text-[22px] font-medium text-[#014D5E] tabular-nums">{k.v}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="px-6 py-16 text-center text-sm text-[#374151]">Carregando...</div>
      ) : comandas.length === 0 ? (
        <div className="bg-white border rounded-[14px] px-6 py-14 text-center" style={{ borderColor: "#E8E2D6" }}>
          <div className="text-3xl mb-2">🛎️</div>
          <div className="text-sm text-[#5C6B70]">Nenhuma comanda aberta no momento.</div>
          <div className="text-[12px] text-[#374151] mt-1">Vendas em atendimento (consulta, balcão) aparecem aqui para baixar no caixa.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {grupos.map((g) => {
            // cliente com UMA comanda → card normal
            if (g.comandas.length === 1) {
              const c = g.comandas[0]; const org = ORIGEM[c.origem] || ORIGEM.VENDA;
              return (
                <div key={c.id} className="bg-white border rounded-[13px] p-3.5 hover:border-[#009AAC] transition-colors" style={{ borderColor: "#E8E2D6" }}>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#E0F4F6" }}>{especieEmoji(c.petSpecies)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-[#014D5E] truncate">{c.tutor}</div>
                      <div className="text-[11px] text-[#374151] truncate">{c.pet || "—"}{c.vet ? ` · ${c.vet}` : ""}</div>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: org.bg, color: org.fg }}>{org.lbl}</span>
                  </div>
                  <div className="flex items-end justify-between mb-2.5">
                    <div className="text-[17px] font-medium text-[#014D5E] tabular-nums">{money(Number(c.aberto || c.valor || 0))}</div>
                    <div className="text-[10.5px] text-[#374151]">{tempoDe(c.date)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => abrir(c)} className="flex-1 text-[11.5px] font-medium text-[#00798A] bg-[#E0F4F6] py-1.5 rounded-lg">Abrir</button>
                    <button onClick={() => abrir(c)} className="flex-1 text-[11.5px] font-medium text-white bg-[#009AAC] py-1.5 rounded-lg">💰 Baixar</button>
                  </div>
                </div>
              );
            }
            // cliente com 2+ comandas abertas → card agrupado (1B)
            return (
              <div key={g.key} className="bg-white border rounded-[13px] p-3.5" style={{ borderColor: "#009AAC" }}>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ background: "#E0F4F6" }}>{especieEmoji(g.petSpecies)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-[#014D5E] truncate">{g.tutor}</div>
                    <div className="text-[11px] text-[#374151]">{g.comandas.length} comandas abertas hoje</div>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: "#E0F4F6", color: "#00707E" }}>🧾 {g.comandas.length}</span>
                </div>
                <div className="mb-2 space-y-1">
                  {g.comandas.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[#5C6B70] truncate">{(ORIGEM[c.origem] || ORIGEM.VENDA).lbl} · {c.pet || "—"}</span>
                      <span className="text-[#014D5E] tabular-nums flex-shrink-0 ml-2">{money(Number(c.aberto || c.valor || 0))}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mb-2.5 border-t pt-2" style={{ borderColor: "#F0EBE0" }}>
                  <div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Total</div>
                  <div className="text-[17px] font-medium text-[#014D5E] tabular-nums">{money(g.total)}</div>
                </div>
                <button onClick={() => { setForma("Dinheiro"); setDetGrupo(g); }} className="w-full text-[11.5px] font-medium text-white bg-[#009AAC] py-1.5 rounded-lg">💰 Baixar tudo</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== COMANDA (por dentro) ===== */}
      {det && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setDet(null)}>
          <div className="rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <div>
                <h3 className="text-base font-medium text-[#014D5E]">{especieEmoji(det.petSpecies)} {det.tutor} <span className="text-[12px] text-[#374151] font-normal">· {det.pet}</span></h3>
                <div className="text-[11px] text-[#374151] mt-0.5">{(ORIGEM[det.origem] || ORIGEM.VENDA).lbl} · aberta {tempoDe(det.date)}</div>
              </div>
              <button onClick={() => setDet(null)} className="text-[#374151] text-lg leading-none">✕</button>
            </div>

            <div className="p-0">
              {detLoading ? (
                <div className="px-5 py-6 text-center text-[12.5px] text-[#374151]">Carregando itens...</div>
              ) : detItens.length === 0 ? (
                <div className="px-5 py-5 text-[12.5px] text-[#374151]">Sem itens detalhados nesta comanda.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead><tr className="text-[10px] text-[#374151] uppercase tracking-wide">
                      <th className="text-left font-medium px-5 py-2">Item</th><th className="text-left font-medium px-2 py-2">Profissional</th><th className="text-right font-medium px-2 py-2">Qtd</th><th className="text-right font-medium px-5 py-2">Valor</th>
                    </tr></thead>
                    <tbody>
                      {detItens.map((it, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: "#F0EBE0" }}>
                          <td className="px-5 py-2 text-[#1F2A2E]">{it.descricao || it.servico?.nome || "Item"}</td>
                          <td className="px-2 py-2 text-[#5C6B70] whitespace-nowrap">{it.executorUser?.name || "—"}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{it.quantidade ?? 1}</td>
                          <td className="px-5 py-2 text-right tabular-nums">{money(Number(it.valorUnitario ?? it.servico?.valorPadrao ?? 0) * (Number(it.quantidade) || 1))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
              <span className="text-[13px] text-[#5C6B70]">Total a receber</span>
              <span className="text-[18px] font-medium text-[#014D5E] tabular-nums">{money(Number(det.aberto || det.valor || 0))}</span>
            </div>

            {caixaAberto ? (
              <>
                <div className="px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                  <div className="text-[10.5px] text-[#374151] uppercase tracking-wide mb-2">Forma de recebimento</div>
                  <div className="flex gap-2 flex-wrap">
                    {formasList.map((f) => (
                      <button key={f} onClick={() => setForma(f)} className="text-[12px] px-3 py-1.5 rounded-full border" style={forma === f ? { background: "#E0F4F6", borderColor: "#009AAC", color: "#014D5E" } : { background: "#fff", borderColor: "#E8E2D6", color: "#5C6B70" }}>{f}</button>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
                  <button onClick={() => setDet(null)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
                  <button onClick={baixar} disabled={baixando} className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{baixando ? "Baixando..." : "💰 Registrar recebimento"}</button>
                </div>
              </>
            ) : (
              <div className="px-5 py-4 border-t" style={{ borderColor: "#E8E2D6" }}>
                <div className="text-[12.5px] text-[#b23b39] bg-[#FDECEC] border rounded-lg px-3 py-2" style={{ borderColor: "#F3D2D0" }}>⚠️ Não há caixa aberto. Abra um caixa em <b>Vendas → Caixa</b> para poder receber.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== GRUPO (baixar todas as comandas do cliente) ===== */}
      {detGrupo && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setDetGrupo(null)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <div>
                <h3 className="text-base font-medium text-[#014D5E]">{especieEmoji(detGrupo.petSpecies)} {detGrupo.tutor}</h3>
                <div className="text-[11px] text-[#374151] mt-0.5">{detGrupo.comandas.length} comandas abertas · baixar tudo junto</div>
              </div>
              <button onClick={() => setDetGrupo(null)} className="text-[#374151] text-lg leading-none">✕</button>
            </div>
            <div className="px-5 py-3">
              {detGrupo.comandas.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b last:border-b-0 text-[12.5px]" style={{ borderColor: "#F0EBE0" }}>
                  <span className="text-[#5C6B70] truncate">{(ORIGEM[c.origem] || ORIGEM.VENDA).lbl} · {c.pet || "—"}</span>
                  <span className="text-[#1F2A2E] tabular-nums flex-shrink-0 ml-2">{money(Number(c.aberto || c.valor || 0))}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
              <span className="text-[13px] text-[#5C6B70]">Total a receber</span>
              <span className="text-[18px] font-medium text-[#014D5E] tabular-nums">{money(detGrupo.total)}</span>
            </div>
            {caixaAberto ? (
              <>
                <div className="px-5 py-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                  <div className="text-[10.5px] text-[#374151] uppercase tracking-wide mb-2">Forma de recebimento</div>
                  <div className="flex gap-2 flex-wrap">
                    {formasList.map((f) => (
                      <button key={f} onClick={() => setForma(f)} className="text-[12px] px-3 py-1.5 rounded-full border" style={forma === f ? { background: "#E0F4F6", borderColor: "#009AAC", color: "#014D5E" } : { background: "#fff", borderColor: "#E8E2D6", color: "#5C6B70" }}>{f}</button>
                    ))}
                  </div>
                </div>
                <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
                  <button onClick={() => setDetGrupo(null)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
                  <button onClick={baixarGrupo} disabled={baixando} className="px-5 py-2 text-[13px] font-medium text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{baixando ? "Baixando..." : "💰 Baixar tudo"}</button>
                </div>
              </>
            ) : (
              <div className="px-5 py-4 border-t" style={{ borderColor: "#E8E2D6" }}>
                <div className="text-[12.5px] text-[#b23b39] bg-[#FDECEC] border rounded-lg px-3 py-2" style={{ borderColor: "#F3D2D0" }}>⚠️ Não há caixa aberto. Abra um caixa em <b>Vendas → Caixa</b>.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

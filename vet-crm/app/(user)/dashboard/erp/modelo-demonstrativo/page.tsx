"use client";
// [EMP-COWORK] Modelo de demonstrativo (Vendas · Fase 2 config). Personaliza o recibo/comprovante (cabeçalho, formato, rodapé).
// Guardado na lista `demonstrativomodelo` (1 item JSON). O recibo real usa esse modelo ao imprimir (ligado depois).

import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const DEFAULTS = {
  nome: "Empório do Pet",
  endereco: "",
  telefone: "",
  cnpj: "",
  logo: "",
  formato: "A4",
  mostrarLogo: true,
  mostrarProfissional: true,
  mostrarObservacoes: true,
  rodape: "Obrigado pela preferência! 🐾",
};

export default function ModeloDemonstrativoPage() {
  usePageTitle("Modelo de demonstrativo", "Personalizar o recibo de venda/orçamento");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regId, setRegId] = useState<string | null>(null);
  const [cfg, setCfg] = useState<any>({ ...DEFAULTS });

  useEffect(() => {
    (async () => {
      try {
        const d = await fetch("/api/listas?lista=demonstrativomodelo").then((r) => r.json()).catch(() => []);
        const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
        if (arr[0]) { setRegId(arr[0].id); try { setCfg({ ...DEFAULTS, ...JSON.parse(arr[0].valor) }); } catch {} }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const set = (k: string, v: any) => setCfg((c: any) => ({ ...c, [k]: v }));
  const salvar = async () => {
    setSaving(true);
    try {
      const valor = JSON.stringify(cfg);
      const res = regId
        ? await fetch(`/api/listas/${regId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) })
        : await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "demonstrativomodelo", valor }) });
      if (!res.ok) throw new Error();
      if (!regId) { const nv = await res.json().catch(() => null); if (nv?.id) setRegId(nv.id); }
      alert("Modelo salvo. ✅");
    } catch { alert("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  const Field = ({ k, label, ph }: { k: string; label: string; ph?: string }) => (
    <div className="mb-2.5">
      <label className="text-[10.5px] text-[#8A989D] uppercase tracking-wide block mb-1">{label}</label>
      <input value={cfg[k]} onChange={(e) => set(k, e.target.value)} placeholder={ph} className="w-full border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
    </div>
  );
  const Sw = ({ k, label }: { k: string; label: string }) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12.5px] text-[#1F2A2E]">{label}</span>
      <div className="inline-flex border rounded-lg overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
        {[["Sim", true], ["Não", false]].map(([lbl, val]) => (
          <button key={lbl as string} onClick={() => set(k, val)} className="px-3 py-1 text-[11.5px]" style={cfg[k] === val ? { background: "#009AAC", color: "#fff" } : { background: "#fff", color: "#5C6B70" }}>{lbl}</button>
        ))}
      </div>
    </div>
  );

  if (loading) return <div className="p-6 text-center text-sm text-[#8A989D]">Carregando...</div>;

  return (
    <div className="p-6 w-full">
      <div className="text-[12.5px] text-[#8A989D] mb-4">O recibo/comprovante que sai da venda e do orçamento. Personalize e veja a prévia ao lado.</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start" style={{ maxWidth: 920 }}>
        {/* CONFIG */}
        <div>
          <div className="bg-white border rounded-[14px] mb-3.5 overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
            <div className="px-4 py-3 border-b text-[13px] font-medium text-[#014D5E]" style={{ borderColor: "#F0EBE0" }}>🏥 Cabeçalho</div>
            <div className="p-4">
              <Field k="nome" label="Nome no recibo" />
              <Field k="endereco" label="Endereço" ph="Rua, nº · Bairro, Cidade/UF" />
              <Field k="telefone" label="Telefone(s)" />
              <Field k="cnpj" label="CNPJ (opcional)" />
              <Field k="logo" label="Logo (link da imagem)" ph="https://…/logo.png" />
            </div>
          </div>
          <div className="bg-white border rounded-[14px] mb-3.5 overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
            <div className="px-4 py-3 border-b text-[13px] font-medium text-[#014D5E]" style={{ borderColor: "#F0EBE0" }}>📐 Formato &amp; conteúdo</div>
            <div className="p-4">
              <label className="text-[10.5px] text-[#8A989D] uppercase tracking-wide block mb-1.5">Formato padrão de impressão</label>
              <div className="inline-flex border rounded-lg overflow-hidden mb-2" style={{ borderColor: "#E8E2D6" }}>
                {["A4", "A5", "Bobina"].map((f) => (
                  <button key={f} onClick={() => set("formato", f)} className="px-4 py-1.5 text-[12.5px]" style={cfg.formato === f ? { background: "#009AAC", color: "#fff" } : { background: "#fff", color: "#5C6B70" }}>{f === "Bobina" ? "Bobina (térmica)" : f}</button>
                ))}
              </div>
              <Sw k="mostrarLogo" label="Mostrar logo" />
              <Sw k="mostrarProfissional" label="Mostrar profissional" />
              <Sw k="mostrarObservacoes" label="Mostrar observações" />
            </div>
          </div>
          <div className="bg-white border rounded-[14px] mb-3.5 overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
            <div className="px-4 py-3 border-b text-[13px] font-medium text-[#014D5E]" style={{ borderColor: "#F0EBE0" }}>✍️ Rodapé</div>
            <div className="p-4"><Field k="rodape" label="Mensagem do rodapé" /></div>
          </div>
          <div className="flex justify-end">
            <button onClick={salvar} disabled={saving} className="bg-[#009AAC] text-white rounded-lg px-5 py-2.5 text-[13.5px] font-medium disabled:opacity-60">{saving ? "Salvando..." : "Salvar modelo"}</button>
          </div>
        </div>

        {/* PRÉVIA */}
        <div className="md:sticky md:top-4">
          <div className="text-[11px] text-[#8A989D] uppercase tracking-wide mb-2">👁️ Prévia ({cfg.formato})</div>
          <div className="bg-white border rounded-[10px] p-5 text-[11.5px] text-[#222] shadow-sm" style={{ borderColor: "#E8E2D6", maxWidth: cfg.formato === "Bobina" ? 300 : "100%", margin: cfg.formato === "Bobina" ? "0 auto" : undefined }}>
            <div className="flex gap-3 items-center border-b pb-2.5 mb-2.5" style={{ borderColor: "#e5e5e5" }}>
              {cfg.mostrarLogo && (cfg.logo ? <img src={cfg.logo} alt="logo" className="w-11 h-11 rounded-lg object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} /> : <span className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl" style={{ background: "#E0F4F6" }}>🏥</span>)}
              <div>
                <div className="text-[14px] font-semibold text-[#014D5E]">{cfg.nome || "—"}</div>
                <div className="text-[10px] text-[#666] leading-snug">{cfg.endereco}{cfg.endereco && <br />}{cfg.telefone}{cfg.cnpj ? ` · CNPJ ${cfg.cnpj}` : ""}</div>
              </div>
            </div>
            <div className="text-center font-semibold text-[#333] tracking-wide my-2">DEMONSTRATIVO DE VENDA</div>
            {[["Cliente", "Maria Souza"], ["Pet", "Thor"], ["Data", "03/07/2026 · Venda 25385"]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-0.5 border-b border-dashed" style={{ borderColor: "#eee" }}><span className="text-[#666]">{k}</span><span>{v}</span></div>
            ))}
            <div className="font-semibold text-[#333] mt-2.5 mb-1">Itens</div>
            <div className="flex justify-between py-0.5 border-b border-dashed" style={{ borderColor: "#eee" }}><span>Consulta clínica{cfg.mostrarProfissional ? " · Dra. Vivian" : ""}</span><span>R$ 120,00</span></div>
            <div className="flex justify-between py-0.5 border-b border-dashed" style={{ borderColor: "#eee" }}><span>Vacina V10</span><span>R$ 50,00</span></div>
            <div className="flex justify-between py-0.5 border-b border-dashed" style={{ borderColor: "#eee" }}><span>Vermífugo</span><span>R$ 20,00</span></div>
            <div className="flex justify-between mt-2 font-semibold text-[#014D5E]"><span>TOTAL</span><span>R$ 190,00</span></div>
            <div className="flex justify-between py-0.5"><span className="text-[#666]">Pagamento</span><span>Pix</span></div>
            {cfg.mostrarObservacoes && <div className="text-[10px] text-[#666] mt-1.5 italic">Obs.: retorno em 15 dias.</div>}
            {cfg.rodape && <div className="text-center text-[10px] text-[#777] border-t pt-2 mt-3" style={{ borderColor: "#e5e5e5" }}>{cfg.rodape}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

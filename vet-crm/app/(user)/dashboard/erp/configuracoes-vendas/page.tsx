"use client";
// [EMP-COWORK] Configuração de Vendas (Fase 2 config). Guarda as regras do módulo na lista `configvendas` (1 item JSON).
// Algumas regras já são lidas pelo PDV/orçamento; outras ("em breve") ficam salvas até a função existir.

import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const DEFAULTS = {
  fecharCaixaMeiaNoite: false,
  obrigarProfissionalItem: false,
  venderSemEstoque: true,
  unificarVendasDia: true,
  obrigarNsu: false,
  limiteDesconto: "0",
  orcamentoValidade: "30",
  orcamentoObrigarCliente: true,
  termoOrcamento: "Orçamento",
  devolucaoPrazo: "30",
};

export default function ConfigVendasPage() {
  usePageTitle("Configuração de vendas", "Regras do módulo de vendas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regId, setRegId] = useState<string | null>(null);
  const [cfg, setCfg] = useState<any>({ ...DEFAULTS });

  useEffect(() => {
    (async () => {
      try {
        const d = await fetch("/api/listas?lista=configvendas").then((r) => r.json()).catch(() => []);
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
        : await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "configvendas", valor }) });
      if (!res.ok) throw new Error();
      if (!regId) { const nv = await res.json().catch(() => null); if (nv?.id) setRegId(nv.id); }
      alert("Configurações salvas. ✅");
    } catch { alert("Erro ao salvar."); }
    finally { setSaving(false); }
  };

  const Toggle = ({ k }: { k: string }) => (
    <div className="inline-flex border rounded-lg overflow-hidden flex-shrink-0" style={{ borderColor: "#E8E2D6" }}>
      {[["Sim", true], ["Não", false]].map(([lbl, val]) => (
        <button key={lbl as string} onClick={() => set(k, val)} className="px-3.5 py-1.5 text-[12.5px]" style={cfg[k] === val ? { background: "#009AAC", color: "#fff" } : { background: "#fff", color: "#5C6B70" }}>{lbl}</button>
      ))}
    </div>
  );
  const Row = ({ lab, desc, breve, children }: any) => (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
      <div>
        <div className="text-[13px] text-[#1F2A2E]">{lab}{breve && <span className="text-[9.5px] text-[#8A989D] bg-[#F0EBE0] rounded-full px-2 py-0.5 ml-2">em breve</span>}</div>
        {desc && <div className="text-[11.5px] text-[#8A989D] mt-0.5">{desc}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
  const NumIn = ({ k, un }: { k: string; un: string }) => (
    <div className="flex items-center gap-1.5">
      <input type="number" value={cfg[k]} onChange={(e) => set(k, e.target.value)} className="w-[88px] border rounded-lg px-2 py-1.5 text-[13px] text-right tabular-nums bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
      <span className="text-[12px] text-[#8A989D]">{un}</span>
    </div>
  );
  const Card = ({ titulo, children }: any) => (
    <div className="bg-white border rounded-[14px] mb-3.5 overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
      <div className="px-4 py-3 border-b text-[13px] font-medium text-[#014D5E]" style={{ borderColor: "#F0EBE0" }}>{titulo}</div>
      {children}
    </div>
  );

  if (loading) return <div className="p-6 text-center text-sm text-[#8A989D]">Carregando...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="text-[12.5px] text-[#8A989D] mb-4">As regras do módulo de vendas. Cada ajuste é salvo e passa a valer no Ponto de venda, atendimento e caixa.</div>

      <Card titulo="💵 Caixa">
        <Row lab="Fechar caixa automaticamente à meia-noite" desc="Caixas abertos são fechados às 23:59." breve><Toggle k="fecharCaixaMeiaNoite" /></Row>
      </Card>

      <Card titulo="🛒 Venda">
        <Row lab="Obrigar profissional em cada item" desc="Cada item da venda precisa de um profissional responsável."><Toggle k="obrigarProfissionalItem" /></Row>
        <Row lab="Permitir vender sem estoque" desc="Deixa vender um produto mesmo com estoque zerado."><Toggle k="venderSemEstoque" /></Row>
        <Row lab="Unificar vendas do dia por cliente" desc="Agrupa as comandas abertas do mesmo cliente no dia."><Toggle k="unificarVendasDia" /></Row>
      </Card>

      <Card titulo="💳 Cartão">
        <Row lab="Obrigar NSU (nº da transação)" desc="Ajuda na conciliação das maquininhas." breve><Toggle k="obrigarNsu" /></Row>
      </Card>

      <Card titulo="🏷️ Desconto">
        <Row lab="Limite de desconto por venda" desc="Desconto máximo permitido (0 = sem limite)."><NumIn k="limiteDesconto" un="%" /></Row>
      </Card>

      <Card titulo="📄 Orçamento">
        <Row lab="Validade padrão" desc="Dias de validade de um orçamento novo."><NumIn k="orcamentoValidade" un="dias" /></Row>
        <Row lab="Obrigar cliente no orçamento"><Toggle k="orcamentoObrigarCliente" /></Row>
        <Row lab="Chamar de" desc={'Título que o cliente vê. "Plano de tratamento" passa mais urgência.'}>
          <div className="inline-flex border rounded-lg overflow-hidden flex-shrink-0" style={{ borderColor: "#E8E2D6" }}>
            {["Orçamento", "Plano de tratamento"].map((t) => (
              <button key={t} onClick={() => set("termoOrcamento", t)} className="px-3 py-1.5 text-[12px]" style={cfg.termoOrcamento === t ? { background: "#009AAC", color: "#fff" } : { background: "#fff", color: "#5C6B70" }}>{t}</button>
            ))}
          </div>
        </Row>
      </Card>

      <Card titulo="↩️ Devolução">
        <Row lab="Prazo para devolução" desc="Dias para aceitar devolução de uma venda." breve><NumIn k="devolucaoPrazo" un="dias" /></Row>
      </Card>

      <div className="flex justify-end mt-2">
        <button onClick={salvar} disabled={saving} className="bg-[#009AAC] text-white rounded-lg px-5 py-2.5 text-[13.5px] font-medium disabled:opacity-60">{saving ? "Salvando..." : "Salvar configurações"}</button>
      </div>
      <div className="text-[11px] text-[#8A989D] text-center mt-3">"em breve" = salvo agora, passa a valer quando a função existir (agendador do caixa, campo NSU, fluxo de devolução).</div>
    </div>
  );
}

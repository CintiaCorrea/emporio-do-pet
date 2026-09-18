"use client";
// [EMP-COWORK] Configuração de Vendas (Fase 2 config). Guarda as regras do módulo na lista `configvendas` (1 item JSON).
// Só ficam aqui as regras que algum código lê de verdade — e os modelos de orçamento e de
// demonstrativo, que viraram abas desta mesma tela (17/09/2026).

import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { usePodeEditar } from "@/lib/permissions/context";
import ModelosDeOrcamento from "@/components/vendas/config/ModelosDeOrcamento";
import ModeloDeDemonstrativo from "@/components/vendas/config/ModeloDeDemonstrativo";
import FormasDeRecebimento from "@/components/vendas/config/FormasDeRecebimento";

const DEFAULTS = {
  // SÓ FICA AQUI O QUE O SISTEMA LÊ DE VERDADE (Cintia, 17/09/2026: "o sistema tem que evitar
  // redundância"). Sete interruptores desta tela não eram lidos por nenhum código — vender sem
  // estoque, unificar vendas do dia, obrigar cliente no orçamento, "chamar de", prazo de
  // devolução e o limite geral de desconto (que virou % por forma de pagamento).
  obrigarProfissionalItem: false,
  obrigarNsu: false,
  orcamentoValidade: "30",
};

export default function ConfigVendasPage() {
  usePageTitle("Configuração de vendas", "Regras do módulo de vendas");
  const podeEditar = usePodeEditar(); // perfil VISUALIZA = esconde o Salvar
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
        <div className="text-[13px] text-[#1F2A2E]">{lab}{breve && <span className="text-[9.5px] text-[#374151] bg-[#F0EBE0] rounded-full px-2 py-0.5 ml-2">em breve</span>}</div>
        {desc && <div className="text-[11.5px] text-[#374151] mt-0.5">{desc}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
  const NumIn = ({ k, un }: { k: string; un: string }) => (
    <div className="flex items-center gap-1.5">
      <input type="number" value={cfg[k]} onChange={(e) => set(k, e.target.value)} className="w-[88px] border rounded-lg px-2 py-1.5 text-[13px] text-right tabular-nums bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
      <span className="text-[12px] text-[#374151]">{un}</span>
    </div>
  );
  const Card = ({ titulo, children }: any) => (
    <div className="bg-white border rounded-[14px] mb-3.5 overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
      <div className="px-4 py-3 border-b text-[13px] font-medium text-[#014D5E]" style={{ borderColor: "#F0EBE0" }}>{titulo}</div>
      {children}
    </div>
  );

  // TUDO DE CONFIGURAÇÃO NUM LUGAR SÓ, EM TRÊS ABAS, E CADA REGRA JUNTO DO SEU ASSUNTO (Cintia, 17/09/2026: "é pouca coisa para ficar só
  // numa aba"). As duas regras de venda e cartão vivem com as formas de recebimento — é onde se
  // decide como o dinheiro entra; a validade padrão vive com o modelo de orçamento.
  const ABAS = [
    { k: "regras", l: "💳 Venda e recebimento" },
    { k: "orcamento", l: "📄 Orçamento" },
    { k: "demonstrativo", l: "🧾 Demonstrativo" },
  ] as const;
  type Aba = (typeof ABAS)[number]["k"];
  const [aba, setAba] = useState<Aba>("regras");
  useEffect(() => {
    try {
      const q = (new URLSearchParams(window.location.search).get("aba") || "").toLowerCase();
      if (q === "formas") setAba("regras"); // o endereço antigo de Formas de recebimento
      else if (ABAS.some((a) => a.k === q)) setAba(q as Aba);
    } catch { /* sem parâmetro: abre nas regras */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abasHtml = (
    // O MESMO PADRÃO DA ACADEMIA (Cintia, 17/09/2026: "deixa essa tela no padrão gráfico das outras,
    // com a mesma margem"). Botão de aba: pílula clara, ativa em turquesa.
    <div className="flex gap-1.5 flex-wrap mb-4">
      {ABAS.map((a) => (
        <button
          key={a.k}
          onClick={() => setAba(a.k)}
          className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border transition"
          style={aba === a.k
            ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" }
            : { background: "#fff", color: "#5F5E5A", borderColor: "#E8DFC8" }}
        >{a.l}</button>
      ))}
    </div>
  );

  if (loading) return <div className="p-6 text-center text-sm text-[#374151]">Carregando...</div>;

  if (aba === "demonstrativo") {
    return (
      <div className="p-6 w-full">
        {abasHtml}
        <ModeloDeDemonstrativo />
      </div>
    );
  }

  if (aba === "orcamento") {
    return (
      <div className="p-6 w-full">
        {abasHtml}
        <div className="max-w-2xl mb-4">
          <Card titulo="📄 Regra do orçamento">
            <Row lab="Validade padrão" desc="Dias de validade de um orçamento novo, contados do dia em que ele é salvo."><NumIn k="orcamentoValidade" un="dias" /></Row>
            <div className="px-4 pb-3">
              {podeEditar
                ? <button onClick={salvar} disabled={saving} className="bg-[#009AAC] text-white rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>
                : <span className="text-[12px] text-[#5C6B70]">👁️ Somente leitura</span>}
            </div>
          </Card>
        </div>
        <ModelosDeOrcamento />
      </div>
    );
  }

  return (
    <div className="p-6 w-full">
      {abasHtml}
      <div className="text-[12.5px] text-[#374151] mb-4">Como a venda é lançada e como o dinheiro entra. Cada ajuste é salvo e passa a valer no Ponto de venda, no atendimento e no caixa.</div>

      <div className="max-w-3xl grid gap-3">
      <Card titulo="💵 Caixa">
        {/* DEIXOU DE SER OPÇÃO (Cintia, 08/09/2026): "os caixas DEVEM ser encerrados às 00:00
            TODOS OS DIAS. Eles não devem permanecer abertos." Era um interruptor, e estava
            desligado — então caixa nenhum fechava, e caixa aberto atravessando o dia é a origem
            da confusão toda (a tela lista o caixa do DIA; o de ontem some dela). */}
        <div className="px-4 py-3 text-[12.5px] text-[#374151]">
          <b>O caixa encerra todo dia à meia-noite.</b> É regra da casa, não configuração: todo caixa
          que ficar aberto é encerrado às 00:00, sem conferência de gaveta. Quem quiser conferir o
          dinheiro fecha o próprio caixa antes disso.
        </div>
      </Card>

      <Card titulo="🛒 Venda">
        <Row lab="Obrigar profissional em cada item" desc="Cada item da venda precisa de um profissional responsável — é o que liga a comissão a quem vendeu."><Toggle k="obrigarProfissionalItem" /></Row>
      </Card>

      <Card titulo="💳 Cartão">
        <Row lab="Obrigar NSU (nº da transação)" desc="Além da AUT, exige o NSU no recebimento com cartão. Ajuda na conciliação das maquininhas."><Toggle k="obrigarNsu" /></Row>
      </Card>

      <Card titulo="🏷️ Desconto">
        <div className="px-4 py-3 text-[12.5px] text-[#374151]">
          O desconto permitido é <b>por forma de pagamento</b> (a lista abaixo) — cada forma tem o seu percentual, porque
          depende do que a maquininha cobra. O administrativo não tem limite.
        </div>
      </Card>

      </div>

      <div className="flex justify-end mt-2 max-w-3xl">
        {podeEditar
          ? <button onClick={salvar} disabled={saving} className="bg-[#009AAC] text-white rounded-lg px-5 py-2.5 text-[13.5px] font-medium disabled:opacity-60">{saving ? "Salvando..." : "Salvar regras"}</button>
          : <span className="text-[12px] text-[#5C6B70]">👁️ Somente leitura</span>}
      </div>

      {/* AS FORMAS DE RECEBIMENTO MORAM AQUI (17/09/2026): é a mesma conversa — como o dinheiro
          entra, e quanto de desconto cada forma aceita. */}
      <div className="mt-7 border-t pt-5" style={{ borderColor: "#E8DFC8" }}>
        <h2 className="text-[15px] font-bold mb-1" style={{ color: "#014D5E" }}>💳 Formas de recebimento</h2>
        <p className="text-[12.5px] mb-3" style={{ color: "#5F5E5A" }}>
          As formas que aparecem ao receber — e quanto de desconto cada uma aceita.
        </p>
        <FormasDeRecebimento />
      </div>
    </div>
  );
}

"use client";
// Importar catálogo (CSV) — serviços e produtos. Fluxo seguro: sobe o arquivo → PRÉVIA
// (não grava) → confirma → importa com backup. Regras: importa tudo; remove duplicados;
// preço 0 = inativo; itens atuais fora da lista = inativos (reversível).
import { useState } from "react";
import { useSession } from "next-auth/react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";

type Prev = {
  dryRun: boolean; totalItens: number; produtos: number; servicos: number;
  novos: number; atualizados: number; duplicadosRemovidos: number;
  precoZeroInativados: number; foraDaListaInativados: number;
  totalSuspeitos: number; suspeitos: string[];
  criados?: number; inativados?: number;
};

export default function ImportarCatalogoPage() {
  usePageTitle("Importar catálogo", "Suba a planilha CSV de serviços e produtos — veja a prévia antes de gravar.");
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [csv, setCsv] = useState("");
  const [nomeArq, setNomeArq] = useState("");
  const [prev, setPrev] = useState<Prev | null>(null);
  const [feito, setFeito] = useState<Prev | null>(null);
  const [carregando, setCarregando] = useState(false);

  const lerArquivo = (f: File | null) => {
    if (!f) return;
    setNomeArq(f.name); setPrev(null); setFeito(null);
    const r = new FileReader();
    r.onload = () => setCsv(String(r.result || ""));
    r.readAsText(f, "utf-8");
  };

  const enviar = async (dryRun: boolean) => {
    if (!csv.trim()) { toast.error("Escolha o arquivo CSV primeiro."); return; }
    setCarregando(true);
    try {
      const r = await fetch("/api/products/importar-catalogo", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ csv, dryRun }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || "Erro ao importar");
      if (dryRun) { setPrev(d); toast.success("Prévia gerada — confira antes de confirmar."); }
      else { setFeito(d); setPrev(null); toast.success("Catálogo importado! ✅"); }
    } catch (e: any) { toast.error(e.message || "Erro"); }
    finally { setCarregando(false); }
  };

  if (role && role !== "ADMIN") {
    return <div className="p-8 text-center text-[13px] text-[#5C6B70]">Importação de catálogo é só para administradores.</div>;
  }

  const B = "#014D5E", T = "#009AAC", LINE = "#E8E2D6";
  const Card = ({ n, k, cor }: { n: number | string; k: string; cor?: string }) => (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "12px 15px" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor || B }}>{n}</div>
      <div style={{ fontSize: 12, color: "#5C6B70", marginTop: 2 }}>{k}</div>
    </div>
  );

  const rel = feito || prev;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* passo 1: upload */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 13, padding: "16px 18px", marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: B, marginBottom: 8 }}>1. Escolha a planilha (.csv)</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 7, border: `1px solid ${T}`, color: T, background: "#fff", borderRadius: 9, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            📄 Selecionar arquivo
            <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => lerArquivo(e.target.files?.[0] || null)} />
          </label>
          <span style={{ fontSize: 12.5, color: nomeArq ? "#1F2A2E" : "#9aa" }}>{nomeArq || "nenhum arquivo escolhido"}</span>
          {csv && (
            <button onClick={() => enviar(true)} disabled={carregando} className="ml-auto" style={{ border: "none", background: T, color: "#fff", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: carregando ? 0.6 : 1 }}>
              {carregando ? "Analisando…" : "🔎 Analisar (prévia)"}
            </button>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#8a6400", marginTop: 8 }}>
          Regras: importa tudo · remove duplicados · preço 0 fica inativo · o que não está na lista fica inativo (reversível). Nada é gravado até você confirmar.
        </div>
      </div>

      {/* passo 2: prévia / resultado */}
      {rel && (
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 13, padding: "16px 18px" }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: B, marginBottom: 12 }}>
            {feito ? "✅ Importação concluída" : "2. Prévia — confira antes de gravar"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 12 }}>
            <Card n={rel.totalItens} k="itens na planilha" />
            <Card n={rel.servicos} k="serviços" />
            <Card n={rel.produtos} k="produtos" />
            <Card n={feito ? (rel.criados ?? rel.novos) : rel.novos} k="novos (a criar)" cor="#1c7a47" />
            <Card n={rel.atualizados} k="atualizados" />
            <Card n={rel.duplicadosRemovidos} k="duplicados removidos" cor="#b45309" />
            <Card n={rel.precoZeroInativados} k="preço 0 → inativo" cor="#b45309" />
            <Card n={feito ? (rel.inativados ?? rel.foraDaListaInativados) : rel.foraDaListaInativados} k="fora da lista → inativo" cor="#b45309" />
          </div>

          {rel.totalSuspeitos > 0 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ fontSize: 12.5, color: "#b45309", cursor: "pointer", fontWeight: 600 }}>⚠️ {rel.totalSuspeitos} item(ns) pra revisar (preço 0 ou nome estranho)</summary>
              <div style={{ fontSize: 12, color: "#5C6B70", marginTop: 6, maxHeight: 180, overflowY: "auto", lineHeight: 1.7 }}>
                {rel.suspeitos.map((s, i) => <div key={i}>• {s}</div>)}
                {rel.totalSuspeitos > rel.suspeitos.length && <div>… e mais {rel.totalSuspeitos - rel.suspeitos.length}.</div>}
              </div>
            </details>
          )}

          {!feito ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
              <button onClick={() => { setPrev(null); }} style={{ border: `1px solid ${LINE}`, background: "#fff", color: "#5C6B70", borderRadius: 9, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => enviar(false)} disabled={carregando} style={{ border: "none", background: B, color: "#fff", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: carregando ? 0.6 : 1 }}>
                {carregando ? "Importando…" : "💾 Confirmar importação"}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "#1c7a47", borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
              Pronto! Fiz um backup do catálogo anterior antes de gravar. Confira em <b>Catálogo</b>.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  precoZeroInativados: number; foraDaListaInativados: number; foraDaListaCandidatos?: number;
  inativarForaDaLista?: boolean; ativosHoje?: number; pctInativar?: number; bloqueioMassa?: boolean;
  totalSuspeitos: number; suspeitos: string[];
  foraDaLista?: string[];
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
  const [inativarFora, setInativarFora] = useState(false); // TRAVA: padrão seguro = só adiciona/atualiza
  const [confirmarMassa, setConfirmarMassa] = useState(false); // 2ª confirmação p/ inativação grande

  const lerArquivo = (f: File | null) => {
    if (!f) return;
    setNomeArq(f.name); setPrev(null); setFeito(null); setConfirmarMassa(false);
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
        body: JSON.stringify({ csv, dryRun, inativarForaDaLista: inativarFora, confirmarInativacaoEmMassa: confirmarMassa }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || "Erro ao importar");
      if (dryRun) { setPrev(d); setConfirmarMassa(false); toast.success("Prévia gerada — confira antes de confirmar."); }
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
        {/* TRAVA: inativar fora da lista é OPT-IN (padrão desligado = só adiciona/atualiza) */}
        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12, padding: "10px 12px", border: `1px solid ${inativarFora ? "#E0B44A" : LINE}`, borderRadius: 9, background: inativarFora ? "#FFFBF0" : "#FBFAF7", cursor: "pointer" }}>
          <input type="checkbox" checked={inativarFora} onChange={(e) => { setInativarFora(e.target.checked); setPrev(null); setConfirmarMassa(false); }} style={{ marginTop: 2 }} />
          <span style={{ fontSize: 12.5, color: "#5C6B70", lineHeight: 1.5 }}>
            <b style={{ color: inativarFora ? "#8a6400" : B }}>Inativar itens que NÃO estão na planilha</b> (desligar o que ficou de fora).
            <span style={{ display: "block", marginTop: 2, color: "#8a857a" }}>Deixe <b>desmarcado</b> se a planilha é só um pedaço do catálogo — assim ela só <b>adiciona/atualiza</b> e não desliga nada. Foi o que zerou o catálogo antes.</span>
          </span>
        </label>
        <div style={{ fontSize: 11.5, color: "#8a6400", marginTop: 8 }}>
          Regras: importa tudo · remove duplicados · preço 0 fica inativo{inativarFora ? " · o que não está na lista fica inativo (reversível)" : " · NÃO desliga o que ficou de fora (opção acima desmarcada)"}. Nada é gravado até você confirmar.
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
            <Card n={feito ? (rel.inativados ?? rel.foraDaListaInativados) : rel.foraDaListaInativados} k={rel.foraDaListaInativados > 0 ? "fora da lista → inativo" : "nada será desligado ✅"} cor={rel.foraDaListaInativados > 0 ? "#b45309" : "#1c7a47"} />
          </div>

          {/* AVISO DE MASSA: import real bloqueado até confirmar (planilha parcial não zera o catálogo) */}
          {!feito && rel.bloqueioMassa && (
            <div style={{ border: "1px solid #E0A0A0", background: "#FCEBEB", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#A32D2D" }}>🛑 Essa importação desligaria {rel.foraDaListaInativados} de {rel.ativosHoje} itens ativos ({rel.pctInativar}%)</div>
              <div style={{ fontSize: 12, color: "#8a3d3d", marginTop: 4, lineHeight: 1.5 }}>Isso parece uma planilha <b>parcial</b>. Se for engano, <b>desmarque</b> "inativar itens fora da planilha" lá em cima. Se é mesmo intencional, confirme abaixo.</div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 12.5, color: "#A32D2D", fontWeight: 600, cursor: "pointer" }}>
                <input type="checkbox" checked={confirmarMassa} onChange={(e) => setConfirmarMassa(e.target.checked)} />
                Sim, quero mesmo desligar esses {rel.foraDaListaInativados} itens.
              </label>
            </div>
          )}

          {rel.totalSuspeitos > 0 && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ fontSize: 12.5, color: "#b45309", cursor: "pointer", fontWeight: 600 }}>⚠️ {rel.totalSuspeitos} item(ns) pra revisar (preço 0 ou nome estranho)</summary>
              <div style={{ fontSize: 12, color: "#5C6B70", marginTop: 6, maxHeight: 180, overflowY: "auto", lineHeight: 1.7 }}>
                {rel.suspeitos.map((s, i) => <div key={i}>• {s}</div>)}
                {rel.totalSuspeitos > rel.suspeitos.length && <div>… e mais {rel.totalSuspeitos - rel.suspeitos.length}.</div>}
              </div>
            </details>
          )}

          {!feito && rel.foraDaListaInativados > 0 && rel.foraDaLista && (
            <details style={{ marginBottom: 12 }}>
              <summary style={{ fontSize: 12.5, color: "#b45309", cursor: "pointer", fontWeight: 600 }}>👀 Ver os {rel.foraDaListaInativados} itens que serão DESATIVADOS (não estão na planilha)</summary>
              <div style={{ fontSize: 12, color: "#5C6B70", marginTop: 6, maxHeight: 220, overflowY: "auto", lineHeight: 1.7 }}>
                {rel.foraDaLista.map((s, i) => <div key={i}>• {s}</div>)}
                {rel.foraDaListaInativados > rel.foraDaLista.length && <div>… e mais {rel.foraDaListaInativados - rel.foraDaLista.length}.</div>}
                <div style={{ marginTop: 6, color: "#8A6D3B" }}>É reversível (backup automático). Se algum aqui ainda é usado, cancele e adicione na planilha antes de confirmar.</div>
              </div>
            </details>
          )}

          {!feito ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: `1px solid ${LINE}`, paddingTop: 12 }}>
              <button onClick={() => { setPrev(null); }} style={{ border: `1px solid ${LINE}`, background: "#fff", color: "#5C6B70", borderRadius: 9, padding: "9px 16px", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={() => enviar(false)} disabled={carregando || (!!rel.bloqueioMassa && !confirmarMassa)} style={{ border: "none", background: B, color: "#fff", borderRadius: 9, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: (carregando || (!!rel.bloqueioMassa && !confirmarMassa)) ? "not-allowed" : "pointer", opacity: (carregando || (!!rel.bloqueioMassa && !confirmarMassa)) ? 0.5 : 1 }}>
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

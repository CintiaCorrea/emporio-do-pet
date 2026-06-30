"use client";
import { useRef, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

function parseCSV(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ";") { row.push(field); field = ""; }
      else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else if (ch === "\r") { /* skip */ }
      else field += ch;
    }
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const g = (s?: string) => (s && s.trim() !== "" ? s.trim() : undefined);
function dataBR(s?: string): string | undefined {
  const v = g(s); if (!v) return undefined;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (!m) return undefined;
  const [, d, mo, y, hh, mm, ss] = m;
  return `${y}-${mo}-${d}T${hh || "00"}:${mm || "00"}:${ss || "00"}`;
}
function moeda(s?: string): number | undefined {
  const v = g(s); if (!v) return undefined;
  const n = Number(v.replace(/[R$\s.]/g, "").replace(",", "."));
  return isNaN(n) ? undefined : n;
}
const sexoCli = (s?: string) => { const v = (g(s) || "").toLowerCase(); return v.startsWith("masc") ? "MALE" : v.startsWith("fem") ? "FEMALE" : undefined; };
const sexoPet = (s?: string) => { const v = (g(s) || "").toLowerCase(); return v.startsWith("mac") ? "MALE" : v.startsWith("fêm") || v.startsWith("fem") ? "FEMALE" : undefined; };
const especie = (s?: string) => { const v = (g(s) || "").toLowerCase(); if (v.startsWith("can")) return "CANINE"; if (v.startsWith("fel")) return "FELINE"; if (!v) return undefined; return "OTHER"; };
const ester = (s?: string) => { const v = (g(s) || "").toLowerCase(); if (v.startsWith("cast")) return "STERILIZED"; if (v.startsWith("fért") || v.startsWith("fert")) return "NOT_STERILIZED"; return undefined; };
const statusPet = (s?: string) => { const v = (g(s) || "").toLowerCase(); return v.startsWith("vivo") ? "ACTIVE" : (v.startsWith("óbi") || v.startsWith("obi") || v.startsWith("mor")) ? "DECEASED" : undefined; };
const tagsDe = (s?: string) => (g(s) ? g(s)!.split(",").map((t) => t.trim()).filter(Boolean) : []);

export default function ImportarPage() {
  usePageTitle("Importar do SimplesVet", "Clientes e pets — com simulação antes");
  const clientesRef = useRef<any[]>([]);
  const [info, setInfo] = useState<{ arquivo: string; clientes: number; pets: number } | null>(null);
  const [report, setReport] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErro(null); setReport(null); setInfo(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result || ""));
        if (rows.length < 2) { setErro("Arquivo vazio ou sem linhas."); return; }
        const head = rows[0].map((h) => h.trim());
        const ix = (nome: string) => head.indexOf(nome);
        const col = {
          aCod: ix("Animal - Código"), aNome: ix("Animal - Nome"), aEsp: ix("Animal - Espécie"), aRaca: ix("Animal - Raça"),
          aPel: ix("Animal - Pelagem"), aEst: ix("Animal - Esterilização"), aNasc: ix("Animal - Nascimento"), aSexo: ix("Animal - Sexo"),
          aChip: ix("Animal - Microchip"), aPed: ix("Animal - Pedigree"), aTags: ix("Animal - Tags"), aVivo: ix("Animal - Vivo/Morto"),
          cCod: ix("Cliente - Código"), cNome: ix("Cliente - Nome"), cCpf: ix("Cliente - CPF"), cRg: ix("Cliente - RG"),
          cSexo: ix("Cliente - Sexo"), cNasc: ix("Cliente - Data de Nascimento"), cEmail: ix("Cliente - Email"), cTel: ix("Cliente - Telefones"),
          cEnd: ix("Cliente - Endereço"), cBairro: ix("Cliente - Bairro"), cCid: ix("Cliente - Cidade"), cUf: ix("Cliente - UF"), cCep: ix("Cliente - CEP"),
          cOrig: ix("Cliente - Origem"), cNps: ix("Cliente - NPS"), cAbc: ix("Cliente - Ranking ABC"), cTicket: ix("Cliente - Ticket médio"),
          cPrim: ix("Cliente - Data da primeira compra"), cUlt: ix("Cliente - Última venda"), cTags: ix("Cliente - Tags"),
        };
        if (col.cCod < 0 || col.aCod < 0) { setErro("Não encontrei as colunas esperadas (Cliente - Código / Animal - Código). É o arquivo certo?"); return; }

        const mapa = new Map<string, any>();
        let totalPets = 0;
        for (let r = 1; r < rows.length; r++) {
          const row = rows[r]; if (!row || row.length < 3) continue;
          const cCod = g(row[col.cCod]); if (!cCod) continue;
          let cli = mapa.get(cCod);
          if (!cli) {
            const tel = g(row[col.cTel]);
            cli = {
              codigo: Number(cCod) || undefined, nome: g(row[col.cNome]), cpf: g(row[col.cCpf]), rg: g(row[col.cRg]),
              sexo: sexoCli(row[col.cSexo]), nascimento: dataBR(row[col.cNasc]), email: g(row[col.cEmail]),
              telefones: tel ? tel.split(",").map((t) => t.trim()).filter(Boolean) : [],
              endereco: g(row[col.cEnd]), bairro: g(row[col.cBairro]), cidade: g(row[col.cCid]), uf: g(row[col.cUf]), cep: g(row[col.cCep]),
              origem: g(row[col.cOrig]), tags: tagsDe(row[col.cTags]),
              rankingAbc: g(row[col.cAbc]), nps: col.cNps >= 0 ? (g(row[col.cNps]) ? Number(g(row[col.cNps])) : undefined) : undefined,
              ticketMedio: moeda(row[col.cTicket]), primeiraCompra: dataBR(row[col.cPrim]), ultimaVenda: dataBR(row[col.cUlt]),
              pets: [] as any[],
            };
            mapa.set(cCod, cli);
          }
          const aCod = g(row[col.aCod]);
          if (aCod) {
            cli.pets.push({
              codigo: Number(aCod) || undefined, nome: g(row[col.aNome]), especie: especie(row[col.aEsp]), raca: g(row[col.aRaca]),
              pelagem: g(row[col.aPel]), esterilizacao: ester(row[col.aEst]), nascimento: dataBR(row[col.aNasc]), sexo: sexoPet(row[col.aSexo]),
              microchip: col.aChip >= 0 ? g(row[col.aChip]) : undefined, pedigree: col.aPed >= 0 ? g(row[col.aPed]) : undefined,
              status: statusPet(row[col.aVivo]), tags: col.aTags >= 0 ? tagsDe(row[col.aTags]) : [],
            });
            totalPets++;
          }
        }
        clientesRef.current = [...mapa.values()];
        setInfo({ arquivo: file.name, clientes: clientesRef.current.length, pets: totalPets });
      } catch (err: any) {
        setErro("Erro ao ler o arquivo: " + (err?.message || ""));
      }
    };
    reader.readAsText(file, "utf-8");
  }

  async function rodar(dryRun: boolean) {
    const all = clientesRef.current;
    if (!all.length) return;
    if (!dryRun && !window.confirm(`Importar de verdade ${all.length} clientes e seus pets para a produção?\n\nIsso vai limpar os códigos provisórios e gravar os dados reais do SimplesVet (sem duplicar os que já existem).`)) return;
    setRunning(true); setReport(null); setProgress(0); setErro(null);
    const TAM = 100;
    const acc: any = { clientesNovos: 0, clientesAtualizados: 0, petsNovos: 0, petsAtualizados: 0, contatosCriados: 0, avisos: [] };
    for (let i = 0; i < all.length; i += TAM) {
      const lote = all.slice(i, i + TAM);
      const body = { dryRun, limparCodigos: !dryRun && i === 0, clientes: lote };
      try {
        const r = await fetch("/api/crm/importar-simplesvet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const d = await r.json();
        acc.clientesNovos += d.clientesNovos || 0; acc.clientesAtualizados += d.clientesAtualizados || 0;
        acc.petsNovos += d.petsNovos || 0; acc.petsAtualizados += d.petsAtualizados || 0; acc.contatosCriados += d.contatosCriados || 0;
        if (d.avisos?.length) acc.avisos.push(...d.avisos);
      } catch (e: any) {
        acc.avisos.push(`Lote a partir de ${i + 1}: ${e?.message || "falha"}`);
      }
      setProgress(Math.round(Math.min(100, ((i + TAM) / all.length) * 100)));
      setReport({ ...acc, dryRun });
    }
    setProgress(100); setRunning(false);
  }

  const card = "bg-white border border-[#E8E2D6] rounded-[13px]";
  return (
    <div className="p-4 min-h-screen bg-[#F6F2EA]">
      <div className={card + " mb-4"} style={{ maxWidth: 760 }}>
        <div className="border-b border-[#F0EBE0]" style={{ padding: "12px 16px" }}>
          <h3 className="text-[14px] font-medium text-[#014D5E]">📥 Importar do SimplesVet</h3>
        </div>
        <div style={{ padding: "16px" }}>
          <p className="text-[13px] text-[#5C6B70] mb-3">Selecione o arquivo <b>CSV</b> exportado do SimplesVet (Relatórios → "Pessoas e animais"). Rode a <b>Simulação</b> primeiro — ela não grava nada.</p>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-[13px]" />

          {erro && <div className="mt-3 rounded-lg px-3 py-2 text-[13px]" style={{ background: "#FBE9E8", color: "#b23b39" }}>⚠️ {erro}</div>}

          {info && (
            <div className="mt-4">
              <div className="flex gap-2.5 flex-wrap mb-3">
                <div className="rounded-[11px] px-3.5 py-2.5 bg-[#FBF9F4] border border-[#F0EBE0]"><div className="text-[11px] text-[#5C6B70]">Arquivo</div><div className="text-[13px] font-medium text-[#014D5E] truncate" style={{ maxWidth: 220 }}>{info.arquivo}</div></div>
                <div className="rounded-[11px] px-3.5 py-2.5 bg-[#FBF9F4] border border-[#F0EBE0]"><div className="text-[11px] text-[#5C6B70]">Clientes</div><div className="text-[18px] font-medium text-[#014D5E]">{info.clientes.toLocaleString("pt-BR")}</div></div>
                <div className="rounded-[11px] px-3.5 py-2.5 bg-[#FBF9F4] border border-[#F0EBE0]"><div className="text-[11px] text-[#5C6B70]">Pets</div><div className="text-[18px] font-medium text-[#014D5E]">{info.pets.toLocaleString("pt-BR")}</div></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => rodar(true)} disabled={running} className="text-[13px] px-4 py-2 rounded-[9px] border border-[#E8E2D6] bg-white text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC] disabled:opacity-50">🔍 Simular (não grava)</button>
                <button onClick={() => rodar(false)} disabled={running} className="text-[13px] px-4 py-2 rounded-[9px] text-white disabled:opacity-50" style={{ background: "#009AAC" }}>📥 Importar de verdade</button>
              </div>
            </div>
          )}

          {running && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-[#F0EBE0] overflow-hidden"><div className="h-full" style={{ width: `${progress}%`, background: "#009AAC" }} /></div>
              <div className="text-[12px] text-[#5C6B70] mt-1">{progress}%</div>
            </div>
          )}
        </div>
      </div>

      {report && (
        <div className={card} style={{ maxWidth: 760 }}>
          <div className="border-b border-[#F0EBE0] flex items-center gap-2" style={{ padding: "12px 16px" }}>
            <h3 className="text-[14px] font-medium text-[#014D5E]">{report.dryRun ? "🔍 Resultado da simulação" : "✅ Resultado da importação"}</h3>
            {report.dryRun && <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#FDF4DD] text-[#8a6400]">nada foi gravado</span>}
          </div>
          <div style={{ padding: "16px" }}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              <div className="rounded-[11px] px-3 py-2.5 bg-[#E7F6EE]"><div className="text-[11px] text-[#1c7a47]">Clientes novos</div><div className="text-[18px] font-medium text-[#1c7a47]">{report.clientesNovos.toLocaleString("pt-BR")}</div></div>
              <div className="rounded-[11px] px-3 py-2.5 bg-[#FBF9F4] border border-[#F0EBE0]"><div className="text-[11px] text-[#5C6B70]">Clientes atualizados</div><div className="text-[18px] font-medium text-[#014D5E]">{report.clientesAtualizados.toLocaleString("pt-BR")}</div></div>
              <div className="rounded-[11px] px-3 py-2.5 bg-[#E7F6EE]"><div className="text-[11px] text-[#1c7a47]">Pets novos</div><div className="text-[18px] font-medium text-[#1c7a47]">{report.petsNovos.toLocaleString("pt-BR")}</div></div>
              <div className="rounded-[11px] px-3 py-2.5 bg-[#FBF9F4] border border-[#F0EBE0]"><div className="text-[11px] text-[#5C6B70]">Pets atualizados</div><div className="text-[18px] font-medium text-[#014D5E]">{report.petsAtualizados.toLocaleString("pt-BR")}</div></div>
              {!report.dryRun && <div className="rounded-[11px] px-3 py-2.5 bg-[#FBF9F4] border border-[#F0EBE0]"><div className="text-[11px] text-[#5C6B70]">Telefones criados</div><div className="text-[18px] font-medium text-[#014D5E]">{report.contatosCriados.toLocaleString("pt-BR")}</div></div>}
            </div>
            {report.avisos?.length > 0 && (
              <div className="mt-3">
                <div className="text-[12px] font-medium text-[#b23b39] mb-1">⚠️ {report.avisos.length} aviso(s):</div>
                <div className="text-[11px] text-[#5C6B70] max-h-40 overflow-auto bg-[#FBF9F4] rounded-lg p-2">
                  {report.avisos.slice(0, 50).map((a: string, i: number) => <div key={i}>• {a}</div>)}
                  {report.avisos.length > 50 && <div>… e mais {report.avisos.length - 50}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

/* ------------------------------------------------------------------ */
/* Parser CSV caractere-a-caractere (respeita aspas do SimplesVet)     */
/* ------------------------------------------------------------------ */
function parseCSV(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        // dentro de aspas: \n e ; são literais
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ";") {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch === "\r") {
        /* ignora CR fora de aspas */
      } else field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const g = (s?: string) => (s && s.trim() !== "" ? s.trim() : "");

// Índices das 35 colunas do export de Vendas do SimplesVet
const IX = {
  DataHora: 0,
  Venda: 1,
  Status: 2,
  DataBaixa: 3,
  FormaPagamento: 4,
  Funcionario: 5,
  Cliente: 8,
  Codigo: 9,
  CPF: 10,
  Celular: 17,
  Email: 16,
  Animal: 21,
  Especie: 22,
  Raca: 24,
  TipoItem: 25,
  Grupo: 27,
  ProdutoServico: 28,
  ValorUnitario: 29,
  Quantidade: 30,
  Bruto: 31,
  Desconto: 32,
  Liquido: 33,
  Observacoes: 34,
} as const;

type Linha = Record<keyof typeof IX, string>;

function montarLinhas(rows: string[][]): Linha[] {
  const out: Linha[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    // ignora linhas totalmente vazias
    if (row.every((c) => (c || "").trim() === "")) continue;
    const obj = {} as Linha;
    (Object.keys(IX) as (keyof typeof IX)[]).forEach((k) => {
      obj[k] = g(row[IX[k]]);
    });
    // precisa ao menos de nº da venda OU cliente pra ser útil
    if (!obj.Venda && !obj.Cliente) continue;
    out.push(obj);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Mapa Grupo → Marca                                                  */
/* ------------------------------------------------------------------ */
const MARCA_PADRAO: Record<string, string> = {
  "Planos de Tratamento": "MUNDO_A_PARTE",
  "Consultas Fisio": "MUNDO_A_PARTE",
  "Procedimentos MVI": "DRA_VIVIAN",
  "Consultas MVI": "DRA_VIVIAN",
};

function marcaDoGrupo(grupo: string): string {
  if (MARCA_PADRAO[grupo]) return MARCA_PADRAO[grupo];
  const up = grupo.trim().toUpperCase();
  if (up === "CRÉDITO" || up === "CREDITO") return "";
  return "EMPORIO";
}

const MARCA_INFO: Record<string, { label: string; emoji: string; cor: string; bg: string }> = {
  MUNDO_A_PARTE: { label: "Mundo à Parte", emoji: "🌿", cor: "#1c7a47", bg: "#E7F6EE" },
  DRA_VIVIAN: { label: "Dra. Vivian", emoji: "✨", cor: "#8a6400", bg: "#FDF4DD" },
  EMPORIO: { label: "Empório", emoji: "🏥", cor: "#014D5E", bg: "#FBF9F4" },
  "": { label: "Crédito (ignorado)", emoji: "💳", cor: "#5C6B70", bg: "#F0EBE0" },
};

const brl = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ------------------------------------------------------------------ */
/* Tela                                                                */
/* ------------------------------------------------------------------ */
export default function ImportarVendasPage() {
  usePageTitle("Importar vendas", "SimplesVet → CRM");

  const linhasRef = useRef<Linha[]>([]);
  const [arquivo, setArquivo] = useState<string>("");
  const [texto, setTexto] = useState<string>("");
  const [info, setInfo] = useState<{ linhas: number; vendas: number; grupos: string[] } | null>(
    null,
  );
  const [mapaMarca, setMapaMarca] = useState<Record<string, string>>({});
  const [sim, setSim] = useState<any>(null);
  const [efet, setEfet] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function processarLinhas(linhas: Linha[], nomeArquivo: string) {
    setErro(null);
    setSim(null);
    setEfet(null);
    setInfo(null);
    setArquivo(nomeArquivo);
    try {
      if (!linhas.length) {
        setErro("Não encontrei nenhuma venda no(s) arquivo(s). É o export certo (Inteligência › Vendas)?");
        return;
      }
      const gruposSet = new Set<string>();
      const mapa: Record<string, string> = {};
      for (const l of linhas) {
        const grp = l.Grupo || "(sem grupo)";
        if (!gruposSet.has(grp)) {
          gruposSet.add(grp);
          mapa[grp] = marcaDoGrupo(l.Grupo);
        }
      }
      const vendasDistintas = new Set(linhas.map((l) => l.Venda).filter(Boolean)).size;
      linhasRef.current = linhas;
      setMapaMarca(mapa);
      setInfo({
        linhas: linhas.length,
        vendas: vendasDistintas || linhas.length,
        grupos: [...gruposSet].sort(),
      });
    } catch (err: any) {
      setErro("Erro ao processar: " + (err?.message || ""));
    }
  }

  function processarTexto(text: string, nomeArquivo: string) {
    try {
      const rows = parseCSV(text);
      if (rows.length < 2) {
        setErro("Arquivo vazio ou sem linhas.");
        return;
      }
      processarLinhas(montarLinhas(rows), nomeArquivo);
    } catch (err: any) {
      setErro("Erro ao ler o conteúdo: " + (err?.message || ""));
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const nomes = files.length === 1 ? files[0].name : `${files.length} arquivos`;
    let combinado: Linha[] = [];
    let pend = files.length;
    const done = () => {
      if (--pend === 0) processarLinhas(combinado, nomes);
    };
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          combinado = combinado.concat(montarLinhas(parseCSV(String(reader.result || ""))));
        } catch {}
        done();
      };
      reader.onerror = () => done();
      reader.readAsText(file, "utf-8");
    });
    // permite reescolher o mesmo arquivo depois
    e.target.value = "";
  }

  function onColar() {
    if (!texto.trim()) {
      setErro("Cole o conteúdo do CSV no campo antes de processar.");
      return;
    }
    processarTexto(texto, "(colado)");
  }

  async function rodar(dryRun: boolean) {
    const linhas = linhasRef.current;
    if (!linhas.length) return;
    if (!dryRun) {
      if (
        !window.confirm(
          `Efetivar a importação de ${linhas.length} linha(s) de venda no CRM?\n\nO backend não vai duplicar vendas já importadas.`,
        )
      )
        return;
    }
    setRunning(true);
    setErro(null);
    if (dryRun) setSim(null);
    else setEfet(null);
    try {
      const r = await fetch("/api/crm/importar-vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linhas, dryRun, mapaMarca }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) {
        const msg =
          (d && (d.error || (Array.isArray(d.message) ? d.message.join(", ") : d.message))) ||
          `HTTP ${r.status}`;
        toast.error("Falha: " + msg);
        setErro(String(msg));
        return;
      }
      if (dryRun) {
        setSim(d);
        toast.success("Simulação concluída — confira e efetive.");
      } else {
        setEfet(d);
        toast.success("Importação efetivada!");
      }
    } catch (e: any) {
      const msg = e?.message || "Falha ao conectar";
      toast.error(msg);
      setErro(msg);
    } finally {
      setRunning(false);
    }
  }

  const card = "bg-white border border-[#E8E2D6] rounded-[13px]";
  const grupos = info?.grupos || [];

  return (
    <div className="p-6 min-h-screen bg-[#F6F2EA]">
      <Toaster position="top-right" />

      {/* Card principal */}
      <div className={card + " mb-4"} style={{ maxWidth: 780 }}>
        <div className="border-b border-[#F0EBE0]" style={{ padding: "12px 16px" }}>
          <h3 className="text-[14px] font-medium text-[#014D5E]">
            📥 Importar vendas do SimplesVet
          </h3>
        </div>
        <div style={{ padding: "16px" }}>
          {/* Passo 1 */}
          <div className="mb-5">
            <div className="text-[13px] font-medium text-[#014D5E] mb-1">
              1️⃣ Envie o arquivo de vendas
            </div>
            <p className="text-[12px] text-[#5C6B70] mb-2">
              No SimplesVet: <b>Inteligência › Vendas › Exportar</b>. Envie o <b>CSV</b> abaixo — ou
              cole o conteúdo se os acentos vierem quebrados.
            </p>
            <label
              className="inline-flex items-center gap-2 text-[13px] px-4 py-2 rounded-[9px] text-white cursor-pointer hover:opacity-90"
              style={{ background: "#009AAC" }}
            >
              📎 Escolher CSV (pode selecionar vários)
              <input type="file" multiple onChange={onFile} className="hidden" />
            </label>
            <details className="mt-2">
              <summary className="text-[12px] text-[#009AAC] cursor-pointer select-none">
                ou colar o conteúdo do CSV
              </summary>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Cole aqui o conteúdo do CSV exportado…"
                className="mt-2 w-full h-28 text-[12px] rounded-[9px] border border-[#E8E2D6] p-2 font-mono"
              />
              <button
                onClick={onColar}
                className="mt-1 text-[12px] px-3 py-1.5 rounded-[9px] border border-[#E8E2D6] bg-white text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC]"
              >
                Processar conteúdo colado
              </button>
            </details>
          </div>

          {erro && (
            <div
              className="mb-4 rounded-lg px-3 py-2 text-[13px]"
              style={{ background: "#FBE9E8", color: "#b23b39" }}
            >
              ⚠️ {erro}
            </div>
          )}

          {info && (
            <>
              {/* Resumo do arquivo */}
              <div className="flex gap-2.5 flex-wrap mb-5">
                <div className="rounded-[11px] px-3.5 py-2.5 bg-[#FBF9F4] border border-[#F0EBE0]">
                  <div className="text-[11px] text-[#5C6B70]">Arquivo</div>
                  <div
                    className="text-[13px] font-medium text-[#014D5E] truncate"
                    style={{ maxWidth: 220 }}
                  >
                    {arquivo}
                  </div>
                </div>
                <div className="rounded-[11px] px-3.5 py-2.5 bg-[#FBF9F4] border border-[#F0EBE0]">
                  <div className="text-[11px] text-[#5C6B70]">Vendas</div>
                  <div className="text-[18px] font-medium text-[#014D5E]">
                    {info.vendas.toLocaleString("pt-BR")}
                  </div>
                </div>
                <div className="rounded-[11px] px-3.5 py-2.5 bg-[#FBF9F4] border border-[#F0EBE0]">
                  <div className="text-[11px] text-[#5C6B70]">Linhas (itens)</div>
                  <div className="text-[18px] font-medium text-[#014D5E]">
                    {info.linhas.toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>

              {/* Passo 2 — mapa grupo→marca */}
              <div className="mb-5">
                <div className="text-[13px] font-medium text-[#014D5E] mb-1">
                  2️⃣ Conferir marca de cada grupo
                </div>
                <p className="text-[12px] text-[#5C6B70] mb-2">
                  Cada grupo de produto/serviço será atribuído a uma marca:
                </p>
                <div className="flex flex-col gap-1.5">
                  {grupos.map((grp) => {
                    const marca = mapaMarca[grp] ?? "";
                    const mi = MARCA_INFO[marca] || MARCA_INFO["EMPORIO"];
                    return (
                      <div
                        key={grp}
                        className="flex items-center justify-between rounded-[9px] px-3 py-1.5 border border-[#F0EBE0]"
                        style={{ background: mi.bg }}
                      >
                        <span className="text-[12px] text-[#014D5E]">{grp}</span>
                        <span
                          className="text-[12px] font-medium"
                          style={{ color: mi.cor }}
                        >
                          {mi.emoji} {mi.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Passo 3 — ações */}
              <div>
                <div className="text-[13px] font-medium text-[#014D5E] mb-2">
                  3️⃣ Simular e efetivar
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => rodar(true)}
                    disabled={running}
                    className="text-[13px] px-4 py-2 rounded-[9px] border border-[#E8E2D6] bg-white text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC] disabled:opacity-50"
                  >
                    {running ? "⏳ Processando…" : "🔍 Simular"}
                  </button>
                  {sim && (
                    <button
                      onClick={() => rodar(false)}
                      disabled={running}
                      className="text-[13px] px-4 py-2 rounded-[9px] text-white disabled:opacity-50"
                      style={{ background: "#009AAC" }}
                    >
                      {running ? "⏳ Importando…" : "✅ Efetivar importação"}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Resultado da simulação */}
      {sim && <ResultadoCard dados={sim} dryRun titulo="🔍 Resultado da simulação" />}

      {/* Resultado da efetivação */}
      {efet && <ResultadoCard dados={efet} titulo="✅ Resultado da importação" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card de resultado (usado por simulação e efetivação)                */
/* ------------------------------------------------------------------ */
function ResultadoCard({
  dados,
  dryRun,
  titulo,
}: {
  dados: any;
  dryRun?: boolean;
  titulo: string;
}) {
  const card = "bg-white border border-[#E8E2D6] rounded-[13px]";
  const num = (v: any) => (Number(v) || 0).toLocaleString("pt-BR");

  const porMarca: Record<string, number> = dados?.porMarca || {};
  const funcNaoEnc: string[] = dados?.funcionariosNaoEncontrados || [];
  const avisos: string[] = dados?.amostraAvisos || dados?.avisos || [];

  const mini = (label: string, valor: string, verde?: boolean) => (
    <div
      className={
        "rounded-[11px] px-3 py-2.5 " +
        (verde ? "bg-[#E7F6EE]" : "bg-[#FBF9F4] border border-[#F0EBE0]")
      }
    >
      <div className={"text-[11px] " + (verde ? "text-[#1c7a47]" : "text-[#5C6B70]")}>
        {label}
      </div>
      <div
        className={"text-[18px] font-medium " + (verde ? "text-[#1c7a47]" : "text-[#014D5E]")}
      >
        {valor}
      </div>
    </div>
  );

  return (
    <div className={card + " mb-4"} style={{ maxWidth: 780 }}>
      <div
        className="border-b border-[#F0EBE0] flex items-center gap-2"
        style={{ padding: "12px 16px" }}
      >
        <h3 className="text-[14px] font-medium text-[#014D5E]">{titulo}</h3>
        {dryRun && (
          <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-[#FDF4DD] text-[#8a6400]">
            nada foi gravado
          </span>
        )}
      </div>
      <div style={{ padding: "16px" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {mini("Vendas", num(dados?.vendas))}
          {mini("Itens", num(dados?.itens))}
          {dryRun
            ? mini("Novos clientes", num(dados?.novosClientes), true)
            : mini("Criadas", num(dados?.criadas), true)}
          {dryRun
            ? mini("Novos pets", num(dados?.novosPets), true)
            : mini("Puladas", num(dados?.puladas))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mt-2.5">
          {mini("Valor total líquido", brl(Number(dados?.valorTotalLiquido) || 0))}
          {dryRun && mini("Já importadas", num(dados?.jaImportadas))}
          {!dryRun && dados?.novosClientes != null && mini("Novos clientes", num(dados?.novosClientes), true)}
          {!dryRun && dados?.novosPets != null && mini("Novos pets", num(dados?.novosPets), true)}
        </div>

        {/* Valor por marca */}
        {Object.keys(porMarca).length > 0 && (
          <div className="mt-4">
            <div className="text-[12px] font-medium text-[#014D5E] mb-1">💼 Valor por marca</div>
            <div className="flex flex-col gap-1.5">
              {Object.entries(porMarca).map(([marca, valor]) => {
                const mi = MARCA_INFO[marca] || MARCA_INFO["EMPORIO"];
                return (
                  <div
                    key={marca}
                    className="flex items-center justify-between rounded-[9px] px-3 py-1.5 border border-[#F0EBE0]"
                    style={{ background: mi.bg }}
                  >
                    <span className="text-[12px] font-medium" style={{ color: mi.cor }}>
                      {mi.emoji} {mi.label}
                    </span>
                    <span className="text-[12px] font-medium text-[#014D5E]">
                      {brl(Number(valor) || 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Funcionários não encontrados */}
        {funcNaoEnc.length > 0 && (
          <div className="mt-4">
            <div className="text-[12px] font-medium text-[#b23b39] mb-1">
              🧑‍⚕️ Funcionários não encontrados ({funcNaoEnc.length}):
            </div>
            <div className="text-[11px] text-[#5C6B70] bg-[#FBF9F4] rounded-lg p-2">
              {funcNaoEnc.slice(0, 50).map((f, i) => (
                <span
                  key={i}
                  className="inline-block bg-white border border-[#F0EBE0] rounded-full px-2 py-0.5 mr-1 mb-1"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Avisos */}
        {avisos.length > 0 && (
          <div className="mt-4">
            <div className="text-[12px] font-medium text-[#b23b39] mb-1">
              ⚠️ {avisos.length} aviso(s):
            </div>
            <div className="text-[11px] text-[#5C6B70] max-h-40 overflow-auto bg-[#FBF9F4] rounded-lg p-2">
              {avisos.slice(0, 50).map((a, i) => (
                <div key={i}>• {a}</div>
              ))}
              {avisos.length > 50 && <div>… e mais {avisos.length - 50}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

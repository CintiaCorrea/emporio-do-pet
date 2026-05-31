"use client";

import { useRef, useState } from "react";
import { LuUpload } from "react-icons/lu";

interface FieldDef {
  key: string;            // chave esperada
  label: string;          // legível
  aliases?: string[];     // outros nomes aceitos
  type?: "string" | "number" | "boolean" | "int";
  required?: boolean;
}

interface CsvImporterProps {
  open: boolean;
  onClose: () => void;
  title: string;
  endpoint: string;          // ex: /api/profissionais/import-batch
  fields: FieldDef[];        // colunas aceitas
  exampleHint?: string;      // pista no header (ex: "Exporte de Base44 > Profissionais")
  upsertAllowed?: boolean;
  onSuccess?: () => void;
}

function parseCSV(text: string, fields: FieldDef[]): any[] {
  const aliasMap: Record<string, FieldDef> = {};
  for (const f of fields) {
    aliasMap[f.key.toLowerCase()] = f;
    aliasMap[f.label.toLowerCase()] = f;
    for (const a of f.aliases || []) aliasMap[a.toLowerCase()] = f;
  }
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const split = (line: string) => {
    const out: string[] = []; let cur = ""; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; continue; }
      if ((c === "," || c === ";") && !inQ) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  };
  const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_]+/g, "_");
  const header = split(lines[0]).map(h => normalize(h));
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = split(lines[i]);
    const row: any = {};
    header.forEach((h, idx) => {
      const field = aliasMap[h];
      if (!field) return;
      let val: any = cols[idx];
      if (val == null || val === "") return;
      if (field.type === "number" || field.type === "int") {
        val = parseFloat(String(val).replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
        if (isNaN(val)) return;
        if (field.type === "int") val = Math.round(val);
      } else if (field.type === "boolean") {
        val = /^(true|sim|s|1|yes|y|ativo)$/i.test(String(val).trim());
      }
      row[field.key] = val;
    });
    if (Object.keys(row).length > 0) rows.push(row);
  }
  return rows;
}

export default function CsvImporter({ open, onClose, title, endpoint, fields, exampleHint, upsertAllowed = true, onSuccess }: CsvImporterProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [fileName, setFileName] = useState("");
  const [upsert, setUpsert] = useState(true);
  const [running, setRunning] = useState(false);

  if (!open) return null;

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text, fields);
      setPreview(rows);
      setFileName(file.name);
    };
    reader.readAsText(file, "UTF-8");
  }

  async function executar() {
    setRunning(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview, upsert }),
      });
      const data = await res.json();
      if (!res.ok) { alert(`Erro: ${data?.message || res.status}`); return; }
      const linhas = [
        data.criados != null ? `Criados: ${data.criados}` : null,
        data.atualizados != null ? `Atualizados: ${data.atualizados}` : null,
        data.ignorados != null ? `Ignorados: ${data.ignorados}` : null,
        data.total != null ? `Total: ${data.total}` : null,
      ].filter(Boolean).join("\n");
      alert(`Importação:\n${linhas}`);
      setPreview([]); setFileName("");
      onSuccess?.();
      onClose();
    } catch (e) { alert(`Erro: ${e}`); }
    finally { setRunning(false); }
  }

  const visibleCols = fields.slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-2" style={{ color: "#009AAC" }}>{title}</h2>
        <div className="text-xs text-gray-600 mb-3">
          {exampleHint && <div className="mb-1">{exampleHint}</div>}
          <div>Colunas aceitas:&nbsp;
            {fields.map((f, i) => (
              <span key={f.key}>
                <code className="bg-gray-100 px-1 rounded">{f.label}</code>
                {f.required && <span className="text-red-500">*</span>}
                {i < fields.length - 1 ? ", " : ""}
              </span>
            ))}
            . Aceita CSV separado por vírgula ou ponto-e-vírgula.
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="block w-full text-sm border rounded-lg p-2 mb-3" style={{ borderColor: "#E5DCC9" }} />

        {preview.length > 0 && (
          <>
            <div className="text-sm mb-2">
              <strong>{fileName}</strong> — {preview.length} linhas detectadas
            </div>
            {upsertAllowed && (
              <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                <input type="checkbox" checked={upsert} onChange={e => setUpsert(e.target.checked)} />
                Atualizar registros já existentes (match por nome/chave)
              </label>
            )}
            <div className="border rounded-lg overflow-auto max-h-60" style={{ borderColor: "#E5DCC9" }}>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b" style={{ borderColor: "#E5DCC9" }}>
                  <tr>
                    {visibleCols.map(c => <th key={c.key} className="text-left px-2 py-1">{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-b" style={{ borderColor: "#F0EBE0" }}>
                      {visibleCols.map(c => <td key={c.key} className="px-2 py-1">{String(r[c.key] ?? "—")}</td>)}
                    </tr>
                  ))}
                  {preview.length > 20 && <tr><td colSpan={visibleCols.length} className="text-center text-gray-500 py-2">... +{preview.length - 20} linhas</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E5DCC9" }}>Cancelar</button>
          <button onClick={executar} disabled={preview.length === 0 || running}
            className="px-4 py-2 rounded-lg text-sm" style={{ background: "#009AAC", color: "white", opacity: preview.length === 0 || running ? 0.4 : 1 }}>
            {running ? "Importando..." : `Importar ${preview.length} registros`}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { FieldDef, CsvImporterProps };

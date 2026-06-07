"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · versão Cintia + Claude (Cowork)   [EMP-COWORK]
   Tela........: Lista de Clientes/Tutores  (erp/tutores)
   Atualizado..: 06/06/2026 — Cintia + Claude
   ✔ Salvar SEMPRE no main (é a versão que publica).
   ✔ Backup periódico ativo.
   ⚠ NÃO sobrescrever por "Add files via upload".
   ─────────────────────────────────────────────────────────────
   Estrutura espelhada do Base44 (padrão-ouro): colunas Tutor /
   Pets / Telefone / Última visita / Relacionamento / LTV + FU
   embaixo do nome. LTV e Última visita = estrutura (sem dado ainda).
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuSearch, LuPlus, LuUpload, LuPawPrint, LuTrash, LuX, LuExternalLink } from "react-icons/lu";

type Filter = "Cliente" | "Fornecedor" | "Parceiro" | "Ex_cliente" | "Todos";

interface Pet { id: string; name: string; species: string; }
interface Tutor {
  id: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  classificacao: string;
  status: string;
  pets?: Pet[];
  contacts?: { number: string; isPrimary: boolean }[];
  birthDate?: string | null;
  estadoRelacionamento?: string | null;
  proximoFollowupAt?: string | null;
  createdAt: string;
}

const REL_BADGE = (v?: string | null) => {
  const s = (v || "").toLowerCase();
  if (s.includes("vencid")) return { color: "#A32D2D", bg: "#FCEBEB" };
  if (s.includes("recuper") || s.includes("reativ") || s.includes("aniversár")) return { color: "#BA7517", bg: "#FCE5C8" };
  if (s.includes("fideliz")) return { color: "#00798A", bg: "#E0F4F6" };
  if (s.includes("próximo") || s.includes("proximo")) return { color: "#0C447C", bg: "#E6EEF7" };
  if (s.includes("em dia")) return { color: "#0F6E56", bg: "#E1F5EE" };
  return { color: "#5b6470", bg: "#f0e8d4" };
};

const PET_EMOJI = (species: string) => {
  const s = (species || "").toUpperCase();
  if (s === "FELINE" || s === "GATO") return "🐱";
  if (s === "CANINE" || s === "CACHORRO") return "🐶";
  return "🐾";
};

const getInitials = (name: string | null) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[parts.length-1]?.[0] || "")).toUpperCase() || name.slice(0, 2).toUpperCase();
};

const isAniversariante = (birthDate?: string | null) => {
  if (!birthDate) return false;
  const d = new Date(birthDate);
  const today = new Date();
  return d.getMonth() === today.getMonth();
};

function parseCSVText(text: string): Record<string, string>[] {
  const clean = text.replace(/\r/g, "");
  const firstLine = clean.split("\n")[0] || "";
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const parseLine = (line: string): string[] => {
    const out: string[] = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else { if (c === '"') q = true; else if (c === sep) { out.push(cur); cur = ""; } else cur += c; }
    }
    out.push(cur); return out;
  };
  const lines = clean.split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] || "").trim(); });
    return obj;
  });
}

function pickField(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) { if (row[k]) return row[k]; }
  return "";
}

export default function ClientesPage() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("Cliente");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [novoSaving, setNovoSaving] = useState(false);

  const handleCriarCliente = async () => {
    if (!novoNome.trim() || !novoTel.replace(/\D/g, "")) { window.alert("Informe nome e telefone."); return; }
    setNovoSaving(true);
    try {
      const res = await fetch("/api/tutors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: novoNome.trim(), contacts: [{ type: "MOBILE", number: novoTel.replace(/\D/g, ""), isPrimary: true, isWhatsApp: true }] }),
      });
      if (!res.ok) throw new Error(await res.text());
      const novo = await res.json();
      if (novo?.id) router.push(`/dashboard/erp/tutores/${novo.id}`);
      else window.location.reload();
    } catch (e) {
      window.alert("Não foi possível criar o cliente. Verifique se o telefone já está cadastrado.");
    } finally {
      setNovoSaving(false);
    }
  };

  const handleImportTutores = async () => {
    const file = importInputRef.current?.files?.[0];
    if (importInputRef.current) importInputRef.current.value = "";
    if (!file) return;
    const rows = parseCSVText(await file.text());
    if (!rows.length) { window.alert("Planilha vazia ou ilegivel. Use colunas como: nome, telefone, email."); return; }
    let ok = 0, fail = 0;
    for (const r of rows) {
      const nome = pickField(r, ["nome", "name", "cliente", "tutor"]);
      const telefone = pickField(r, ["telefone", "phone", "celular", "whatsapp", "fone"]).replace(/\D/g, "");
      const email = pickField(r, ["email", "e-mail"]);
      if (!nome) { fail++; continue; }
      try {
        const res = await fetch("/api/tutors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: nome,
            ...(email ? { email } : {}),
            contacts: telefone ? [{ type: "MOBILE", number: telefone, isPrimary: true, isWhatsApp: true }] : [],
          }),
        });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    window.alert(`Importacao concluida: ${ok} importados, ${fail} com erro.`);
    window.location.reload();
  };

  const handleDeleteTutor = async (tutor: Tutor) => {
    if (deletingId) return;
    const label = tutor.name || "este cliente";
    if (!window.confirm(`Excluir ${label}? Os pets vinculados tambem serao removidos. Esta acao nao pode ser desfeita.`)) return;
    setDeletingId(tutor.id);
    try {
      const res = await fetch(`/api/tutors/${tutor.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setTutores((prev) => prev.filter((x) => x.id !== tutor.id));
    } catch (e) {
      console.error(e);
      window.alert("Nao foi possivel excluir o cliente. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/tutors");
        const data = await res.json();
        const arr = Array.isArray(data?.tutors) ? data.tutors : Array.isArray(data) ? data : [];
        setTutores(arr);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let arr = [...tutores];
    if (filter !== "Todos") arr = arr.filter((t) => t.classificacao === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((t) =>
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.contacts?.some((c) => c.number?.includes(q)) ||
        t.pets?.some((p) => p.name?.toLowerCase().includes(q))
      );
    }
    return arr;
  }, [tutores, filter, search]);

  const counts = useMemo(() => {
    const c = tutores.filter((t) => t.classificacao === "Cliente");
    return {
      total: c.length,
      aniversariantes: c.filter((t) => isAniversariante(t.birthDate)).length,
      aRecuperar: c.filter((t) => t.status === "SUSPENDED").length};
  }, [tutores]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-[#5b6470] mt-0.5">
            {counts.total} clientes ·{" "}
            <span className="text-[#BA7517] font-medium">🎂 {counts.aniversariantes} aniversariantes do mês</span> ·{" "}
            <span className="text-[#BA7517] font-medium">{counts.aRecuperar} a recuperar</span>
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportTutores} />
          <button onClick={() => importInputRef.current?.click()} className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#4d5a66] flex items-center gap-1.5">
            <LuUpload className="w-3.5 h-3.5" />Importar CSV
          </button>
          <button onClick={() => { setNovoNome(""); setNovoTel(""); setNovoOpen(true); }} className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <LuPlus className="w-3.5 h-3.5" />Novo cliente
          </button>
        </div>
      </header>

      <div className="flex gap-2 mb-3 flex-wrap">
        {(["Cliente", "Fornecedor", "Parceiro", "Ex_cliente", "Todos"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium ${
              filter === f
                ? "bg-[#009AAC] text-white"
                : "bg-white text-[#4d5a66] border border-[#cfd8e0]"
            }`}
          >
            {f === "Ex_cliente" ? "Ex-clientes" : f === "Cliente" ? "Clientes" : f === "Fornecedor" ? "Fornecedores" : f === "Parceiro" ? "Parceiros" : "Todos"}
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nome, pet, telefone ou email…"
          className="w-full bg-white border border-[#d8d0bc] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#009AAC]"
        />
      </div>

      <div className="bg-white rounded-xl border border-[#d8d0bc] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F3E4] border-b border-[#d8d0bc] text-[11px] text-[#5b6470] font-medium">
              <th className="text-left py-2.5 px-3">Cliente</th>
              <th className="text-left py-2.5 px-3">Pets</th>
              <th className="text-left py-2.5 px-3">Telefone</th>
              <th className="text-left py-2.5 px-3">Última visita</th>
              <th className="text-left py-2.5 px-3">Relacionamento</th>
              <th className="text-right py-2.5 px-3">LTV</th>
              <th className="text-right py-2.5 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">Nenhum cliente nesse filtro</td></tr>
            ) : (
              filtered.map((t) => {
                const phone = t.contacts?.find((c) => c.isPrimary)?.number || t.contacts?.[0]?.number;
                const rel = REL_BADGE(t.estadoRelacionamento);
                const isAniv = isAniversariante(t.birthDate);
                return (
                  <tr key={t.id} className="border-b border-[#f0e8d4] hover:bg-[#fdfaee]">
                    <td className="py-2.5 px-3">
                      <Link href={`/dashboard/erp/tutores/${t.id}`} className="flex items-center gap-2.5">
                        <div className="relative w-9 h-9 rounded-full bg-[#E0F4F6] text-[#00798A] flex items-center justify-center text-[11px] font-medium">
                          {getInitials(t.name)}
                          {isAniv && (
                            <span className="absolute -top-1 -right-1 bg-[#FFE2D2] border border-white rounded-full px-1 text-[9px]" title="Aniversariante do mês">🎂</span>
                          )}
                        </div>
                        <div>
                          <div className="text-[#0E2244] font-medium">{t.name || "Sem nome"}</div>
                          {t.proximoFollowupAt && <span className="text-[10px] text-[#BA7517]">FU: {new Date(t.proximoFollowupAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</span>}
                        </div>
                      </Link>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex gap-1 flex-wrap">
                        {(t.pets || []).map((p) => (
                          <span key={p.id} className="inline-flex items-center gap-1 bg-[#E0F4F6] text-[#00798A] text-[10px] px-2 py-0.5 rounded-full">
                            {PET_EMOJI(p.species)} {p.name}
                          </span>
                        ))}
                        {(t.pets?.length || 0) === 0 && <span className="text-[10px] text-gray-400">sem pet</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#4d5a66]">{phone || "—"}</td>
                    <td className="py-2.5 px-3 text-[#4d5a66] text-[11px]">—</td>
                    <td className="py-2.5 px-3">
                      {t.estadoRelacionamento ? (
                        <span style={{ background: rel.bg, color: rel.color }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">{t.estadoRelacionamento}</span>
                      ) : <span className="text-[10px] text-gray-400">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#4d5a66] text-[11px]">—</td>
                    <td className="py-2.5 px-3 text-right">
                      <button type="button" onClick={() => handleDeleteTutor(t)} disabled={deletingId === t.id} title="Excluir cliente" className="disabled:opacity-40 p-1 hover:bg-gray-100 rounded">
                        <LuTrash className="w-3.5 h-3.5 text-[#cfd8e0] hover:text-[#A32D2D]" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {novoOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24" onClick={() => setNovoOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-[400px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-[#0E2244]">Novo Cliente</h2>
              <button onClick={() => setNovoOpen(false)} className="text-gray-400 hover:text-gray-600"><LuX className="w-4 h-4" /></button>
            </div>
            <label className="text-[11px] text-[#5b6470]">Nome *</label>
            <input autoFocus value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome completo" className="w-full h-9 mt-0.5 mb-3 px-3 border border-[#d8d0bc] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
            <label className="text-[11px] text-[#5b6470]">Telefone *</label>
            <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCriarCliente(); }} placeholder="(85) 9 9999-9999" className="w-full h-9 mt-0.5 px-3 border border-[#d8d0bc] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
            <p className="text-[10px] text-gray-400 mt-1.5">Depois de criar, você completa o resto (CPF, endereço, pet…) direto na ficha.</p>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setNovoOpen(false)} className="px-4 py-2 border border-[#cfd8e0] rounded-lg text-sm text-[#5b6470]">Cancelar</button>
              <button onClick={handleCriarCliente} disabled={novoSaving} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50 flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuExternalLink className="w-3.5 h-3.5" /> {novoSaving ? "Criando…" : "Criar e abrir ficha"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

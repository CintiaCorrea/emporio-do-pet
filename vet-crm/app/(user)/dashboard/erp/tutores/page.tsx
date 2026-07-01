"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
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
   embaixo do nome. LTV (soma dos atendimentos) e Última visita = dos agendamentos.
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
  codigo?: string | null;
  city?: string | null;
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

// [EMP-COWORK] LTV (soma valores de atendimentos) + última visita
const fmtDateShort = (s?: string) => s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";
const fmtMoney = (n: number) => n > 0 ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";

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

// [EMP-COWORK] Aba Pets — endpoint /api/pets/lista-simples
interface PetSimples {
  id: string;
  name: string;
  codigo: string;
  species: string;
  breed: string | null;
  status: string;
  tutor: { id: string; name: string | null; codigo: string; contacts?: { number: string }[] } | null;
}

const especieLabel = (species: string) => {
  const s = (species || "").toUpperCase();
  if (s === "CANINE") return "Cão";
  if (s === "FELINE") return "Gato";
  if (!s) return "—";
  return s.charAt(0) + s.slice(1).toLowerCase();
};

const semAcento = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function ClientesPage() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<"CLIENTES" | "PETS">("CLIENTES");
  const [pets, setPets] = useState<PetSimples[] | null>(null);
  const [petsLoading, setPetsLoading] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const [petOrdem, setPetOrdem] = useState<"AZ" | "ZA">("AZ");
  const [cliOrdem, setCliOrdem] = useState<"AZ" | "ZA">("AZ");
  const [apptStats, setApptStats] = useState<Record<string, { last?: string; ltv: number }>>({});
  const [filter] = useState<Filter>("Cliente"); void filter;
  const [search, setSearch] = useState("");
  useEffect(() => { const q = new URLSearchParams(window.location.search).get("q"); if (q) setSearch(q); }, []);
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
    if (!(await confirmDelete({ entityLabel: "cliente", itemName: label, consequenceText: "Os pets vinculados também serão removidos." }))) return;
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
        const res = await fetch("/api/tutors/lista-simples");
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

  // [EMP-COWORK] última visita + LTV a partir dos agendamentos (única fonte de receita hoje)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/appointments?limit=3000", { credentials: "include" });
        if (!res.ok) return;
        const d = await res.json();
        const arr = Array.isArray(d) ? d : (d.data || d.appointments || d.items || []);
        const now = Date.now();
        const map: Record<string, { last?: string; ltv: number }> = {};
        for (const a of arr) {
          const tid = a.tutorId || a.tutor?.id; if (!tid) continue;
          const st = String(a.status || "").toUpperCase();
          if (st === "CANCELLED" || st === "CANCELED" || st === "NO_SHOW") continue;
          const m = map[tid] || (map[tid] = { ltv: 0 });
          m.ltv += Number(a.value) || 0;
          const dt = a.date ? new Date(a.date).getTime() : 0;
          if (dt && dt <= now && (!m.last || dt > new Date(m.last).getTime())) m.last = a.date;
        }
        setApptStats(map);
      } catch {}
    })();
  }, []);

  // [EMP-COWORK] Carrega pets quando a aba Pets é ativada pela 1ª vez
  useEffect(() => {
    if (aba !== "PETS" || pets !== null || petsLoading) return;
    (async () => {
      setPetsLoading(true);
      try {
        const res = await fetch("/api/pets/lista-simples", { credentials: "include" });
        const data = await res.json();
        setPets(Array.isArray(data) ? data : (data?.pets || data?.data || []));
      } catch (e) {
        console.error(e);
        setPets([]);
      } finally {
        setPetsLoading(false);
      }
    })();
  }, [aba, pets, petsLoading]);

  const petsFiltrados = useMemo(() => {
    let list = pets || [];
    const q = semAcento(petSearch.trim());
    if (q) list = list.filter((p) =>
      semAcento(p.name || "").includes(q) ||
      semAcento(p.breed || "").includes(q) ||
      semAcento(p.tutor?.name || "").includes(q)
    );
    if (petOrdem === "ZA") list = [...list].reverse();
    return list;
  }, [pets, petSearch, petOrdem]);

  const statusPetPill = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "ACTIVE") return { label: "Vivo", bg: "#E7F6EE", color: "#1c7a47" };
    if (s === "DECEASED") return { label: "Óbito", bg: "#F3F1EC", color: "#9a948a" };
    return { label: status || "—", bg: "#F3F1EC", color: "#9a948a" };
  };

  const handleImprimirPets = () => {
    const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const linhas = petsFiltrados.map((p) => {
      const st = statusPetPill(p.status);
      return `<tr>
        <td>${PET_EMOJI(p.species)} ${esc(p.name && p.name.replace(/[.\s]+/g, "") ? p.name : "Sem nome")}</td>
        <td>${esc(especieLabel(p.species))}${p.breed ? " · " + esc(p.breed) : ""}</td>
        <td>#${esc(p.codigo)}</td>
        <td>${esc(p.tutor?.name || "—")}</td>
        <td>${esc(p.tutor?.contacts?.[0]?.number || "—")}</td>
        <td>${esc(st.label)}</td>
      </tr>`;
    }).join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Lista de Pets — Empório do Pet</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#014D5E;padding:24px;}
        h1{font-size:18px;margin:0 0 4px;color:#014D5E;}
        .sub{color:#5b6470;font-size:12px;margin:0 0 16px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th{text-align:left;background:#FBF9F4;color:#5b6470;text-transform:uppercase;font-size:10px;padding:6px 8px;border-bottom:1px solid #d8d0bc;}
        td{padding:6px 8px;border-bottom:1px solid #F0EBE0;color:#014D5E;}
      </style></head><body>
      <h1>🐾 Lista de Pets — Empório do Pet</h1>
      <p class="sub">Gerado em ${hoje} · ${petsFiltrados.length} pet(s)</p>
      <table>
        <thead><tr><th>Pet</th><th>Espécie/Raça</th><th>Código</th><th>Tutor</th><th>Telefone</th><th>Status</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6">Nenhum pet.</td></tr>'}</tbody>
      </table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) { window.alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups."); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const handleExcelPets = () => {
    const sep = ";";
    const sanitize = (v: unknown) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Pet", "Codigo", "Especie", "Raca", "Status", "Tutor", "Telefone"].join(sep);
    const rows = petsFiltrados.map((p) => {
      const st = statusPetPill(p.status);
      return [
        sanitize(p.name && p.name.replace(/[.\s]+/g, "") ? p.name : "Sem nome"),
        sanitize(p.codigo),
        sanitize(especieLabel(p.species)),
        sanitize(p.breed || ""),
        sanitize(st.label),
        sanitize(p.tutor?.name || ""),
        sanitize(p.tutor?.contacts?.[0]?.number || ""),
      ].join(sep);
    });
    const csv = "﻿" + [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pets_emporio.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImprimirClientes = () => {
    const hoje = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const linhas = filtered.map((t) => {
      const tel = t.contacts?.find((c) => c.isPrimary)?.number || t.contacts?.[0]?.number || "";
      const petsNomes = (t.pets || []).map((p) => p.name).join(", ");
      return `<tr>
        <td>${esc(t.name || "Sem nome")}</td>
        <td>#${esc(t.codigo || "—")}</td>
        <td>${esc(t.cpf || "—")}</td>
        <td>${esc(tel || "—")}</td>
        <td>${esc(t.city || "—")}</td>
        <td>${esc(petsNomes || "—")}</td>
      </tr>`;
    }).join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
      <title>Lista de Clientes — Empório do Pet</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#014D5E;padding:24px;}
        h1{font-size:18px;margin:0 0 4px;color:#014D5E;}
        .sub{color:#5b6470;font-size:12px;margin:0 0 16px;}
        table{width:100%;border-collapse:collapse;font-size:12px;}
        th{text-align:left;background:#FBF9F4;color:#5b6470;text-transform:uppercase;font-size:10px;padding:6px 8px;border-bottom:1px solid #d8d0bc;}
        td{padding:6px 8px;border-bottom:1px solid #F0EBE0;color:#014D5E;}
      </style></head><body>
      <h1>👥 Lista de Clientes — Empório do Pet</h1>
      <p class="sub">Gerado em ${hoje} · ${filtered.length} cliente(s)</p>
      <table>
        <thead><tr><th>Nome</th><th>Código</th><th>CPF</th><th>Telefone</th><th>Cidade</th><th>Pets</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6">Nenhum cliente.</td></tr>'}</tbody>
      </table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) { window.alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-ups."); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
  };

  const handleExcelClientes = () => {
    const sep = ";";
    const sanitize = (v: unknown) => {
      const s = String(v ?? "");
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Nome", "Codigo", "CPF", "Telefone", "Cidade", "Pets"].join(sep);
    const rows = filtered.map((t) => {
      const tel = t.contacts?.find((c) => c.isPrimary)?.number || t.contacts?.[0]?.number || "";
      const petsNomes = (t.pets || []).map((p) => p.name).join(", ");
      return [
        sanitize(t.name || "Sem nome"),
        sanitize(t.codigo || ""),
        sanitize(t.cpf || ""),
        sanitize(tel),
        sanitize(t.city || ""),
        sanitize(petsNomes),
      ].join(sep);
    });
    const csv = "﻿" + [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes_emporio.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    let arr = tutores.filter((t) => t.classificacao === "Cliente" || !t.classificacao);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((t) =>
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.contacts?.some((c) => c.number?.includes(q)) ||
        t.pets?.some((p) => p.name?.toLowerCase().includes(q))
      );
    }
    arr.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"));
    if (cliOrdem === "ZA") arr.reverse();
    return arr;
  }, [tutores, search, cliOrdem]);

  const counts = useMemo(() => {
    const c = tutores.filter((t) => t.classificacao === "Cliente" || !t.classificacao);
    return {
      total: c.length,
      aniversariantes: c.filter((t) => isAniversariante(t.birthDate)).length,
      aRecuperar: c.filter((t) => t.status === "SUSPENDED").length};
  }, [tutores]);

  return (
    <div className="p-6 min-h-screen bg-[#F6F2EA]">
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
          <button onClick={() => importInputRef.current?.click()} className="bg-white border border-[#E8E2D6] px-3 py-1.5 rounded-lg text-xs text-[#5C6B70] flex items-center gap-1.5 hover:border-[#009AAC] hover:text-[#009AAC]">
            📥 Importar CSV
          </button>
          <button onClick={() => { setNovoNome(""); setNovoTel(""); setNovoOpen(true); }} className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
            ➕ Novo cliente
          </button>
        </div>
      </header>

      {/* [EMP-COWORK] Barra de abas Base44 */}
      <div className="flex gap-6 border-b border-[#E8E2D6] mb-4">
        {([
          { key: "CLIENTES" as const, emoji: "👥", label: "Clientes", count: counts.total },
          { key: "PETS" as const, emoji: "🐾", label: "Pets", count: pets === null ? "…" : pets.length },
        ]).map((t) => {
          const ativo = aba === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setAba(t.key)}
              className={`relative -mb-px pb-2.5 text-sm font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
                ativo ? "border-[#009AAC] text-[#014D5E]" : "border-transparent text-[#9a948a] hover:text-[#5b6470]"
              }`}
            >
              <span>{t.emoji}</span>
              {t.label} ({t.count})
            </button>
          );
        })}
      </div>

      {aba === "CLIENTES" && (<>

      {/* Toolbar */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[220px]">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, pet, telefone ou email…"
            className="w-full bg-white border border-[#E8E2D6] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#009AAC]"
          />
        </div>
        <button
          onClick={() => setCliOrdem((o) => (o === "AZ" ? "ZA" : "AZ"))}
          className="bg-white border border-[#E8E2D6] px-3 py-2 rounded-lg text-xs text-[#014D5E] flex items-center gap-1.5 hover:bg-[#FBF9F4]"
          title="Alternar ordem alfabética"
        >
          🔤 {cliOrdem === "AZ" ? "A → Z" : "Z → A"}
        </button>
        <button
          onClick={handleImprimirClientes}
          className="bg-white border border-[#E8E2D6] px-3 py-2 rounded-lg text-xs text-[#014D5E] flex items-center gap-1.5 hover:bg-[#FBF9F4]"
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={handleExcelClientes}
          className="bg-white border border-[#E8E2D6] px-3 py-2 rounded-lg text-xs text-[#014D5E] flex items-center gap-1.5 hover:bg-[#FBF9F4]"
        >
          📊 Excel
        </button>
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
              filtered.slice(0, 200).map((t) => {
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
                          <Link key={p.id} href={`/dashboard/erp/pets/${p.id}`} title={`Abrir ficha de ${p.name}`} className="inline-flex items-center gap-1 bg-[#E0F4F6] text-[#00798A] text-[10px] px-2 py-0.5 rounded-full hover:bg-[#00798A] hover:text-white transition-colors">
                            {PET_EMOJI(p.species)} {p.name}
                          </Link>
                        ))}
                        {(t.pets?.length || 0) === 0 && <span className="text-[10px] text-gray-400">sem pet</span>}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[#4d5a66]">{phone || "—"}</td>
                    <td className="py-2.5 px-3 text-[#4d5a66] text-[11px]">{fmtDateShort(apptStats[t.id]?.last)}</td>
                    <td className="py-2.5 px-3">
                      {t.estadoRelacionamento ? (
                        <span style={{ background: rel.bg, color: rel.color }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">{t.estadoRelacionamento}</span>
                      ) : <span className="text-[10px] text-gray-400">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#4d5a66] text-[11px]" title="Soma dos valores dos atendimentos">{fmtMoney(apptStats[t.id]?.ltv || 0)}</td>
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
        {filtered.length > 200 && (
          <p className="text-[11px] text-[#9a948a] text-center py-2.5">Mostrando 200 de {filtered.length.toLocaleString("pt-BR")}. Use a busca para refinar — Imprimir e Excel levam a lista completa.</p>
        )}
      </div>

      </>)}

      {aba === "PETS" && (
        <div>
          {/* Toolbar */}
          <div className="flex gap-2 mb-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[220px]">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={petSearch}
                onChange={(e) => setPetSearch(e.target.value)}
                placeholder="Buscar por pet, raça ou tutor…"
                className="w-full bg-white border border-[#E8E2D6] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#009AAC]"
              />
            </div>
            <button
              onClick={() => setPetOrdem((o) => (o === "AZ" ? "ZA" : "AZ"))}
              className="bg-white border border-[#E8E2D6] px-3 py-2 rounded-lg text-xs text-[#014D5E] flex items-center gap-1.5 hover:bg-[#FBF9F4]"
              title="Alternar ordem alfabética"
            >
              🔤 {petOrdem === "AZ" ? "A → Z" : "Z → A"}
            </button>
            <button
              onClick={handleImprimirPets}
              className="bg-white border border-[#E8E2D6] px-3 py-2 rounded-lg text-xs text-[#014D5E] flex items-center gap-1.5 hover:bg-[#FBF9F4]"
            >
              🖨️ Imprimir
            </button>
            <button
              onClick={handleExcelPets}
              className="bg-white border border-[#E8E2D6] px-3 py-2 rounded-lg text-xs text-[#014D5E] flex items-center gap-1.5 hover:bg-[#FBF9F4]"
            >
              📊 Excel
            </button>
          </div>

          {/* Tabela de pets Base44 */}
          <div className="bg-white rounded-xl border border-[#E8E2D6] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FBF9F4] border-b border-[#E8E2D6] text-[11px] uppercase tracking-wide text-[#9a948a] font-medium">
                  <th className="text-left py-2.5 px-3">Pet</th>
                  <th className="text-left py-2.5 px-3">Código</th>
                  <th className="text-left py-2.5 px-3">Tutor</th>
                  <th className="text-left py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {petsLoading ? (
                  <tr><td colSpan={4} className="py-12 text-center text-gray-400">Carregando pets…</td></tr>
                ) : petsFiltrados.length === 0 ? (
                  <tr><td colSpan={4} className="py-12 text-center text-gray-400">Nenhum pet encontrado.</td></tr>
                ) : (
                  petsFiltrados.slice(0, 200).map((p) => {
                    const st = statusPetPill(p.status);
                    const tel = p.tutor?.contacts?.[0]?.number;
                    return (
                      <tr key={p.id} className="border-b border-[#F0EBE0] hover:bg-[#FBF9F4]">
                        <td className="py-2.5 px-3">
                          <Link href={`/dashboard/erp/pets/${p.id}`} className="flex items-center gap-2.5">
                            <div className="w-[38px] h-[38px] rounded-[12px] bg-[#E0F4F6] flex items-center justify-center text-lg shrink-0">
                              {PET_EMOJI(p.species)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#014D5E] font-medium truncate">{p.name && p.name.replace(/[.\s]+/g, "") ? p.name : "Sem nome"}</div>
                              <div className="text-[11px] text-[#9a948a] truncate">
                                {especieLabel(p.species)}{p.breed ? ` · ${p.breed}` : ""}
                              </div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 text-[#9a948a]">#{p.codigo}</td>
                        <td className="py-2.5 px-3">
                          {p.tutor ? (
                            <Link href={`/dashboard/erp/tutores/${p.tutor.id}`} className="block">
                              <div className="text-[#014D5E] hover:text-[#009AAC] transition-colors">{p.tutor.name || "Sem nome"}</div>
                              {tel && <div className="text-[11px] text-[#9a948a]">{tel}</div>}
                            </Link>
                          ) : <span className="text-[11px] text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span style={{ background: st.bg, color: st.color }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">{st.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {petsFiltrados.length > 200 && (
              <p className="text-[11px] text-[#9a948a] text-center py-2.5">Mostrando 200 de {petsFiltrados.length.toLocaleString("pt-BR")} pets. Use a busca para refinar — Imprimir e Excel levam a lista completa.</p>
            )}
          </div>
        </div>
      )}

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

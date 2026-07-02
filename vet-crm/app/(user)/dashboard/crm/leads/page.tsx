"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuSearch, LuPlus, LuUpload, LuDownload, LuTrash, LuPhone, LuStickyNote, LuFootprints, LuX } from "react-icons/lu";

type Filter = "ativos" | "perdidos" | "outros" | "convertidos" | "todos";
type Periodo = "7d" | "30d" | "tudo" | "custom";

interface Lead {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  tags: string[];
  status: string;
  currentScore: number;
  channel?: string | null;
  source: string;
  sourceDetail: string | null;
  customFields?: any;
  lastSeenAt: string;
  createdAt: string;
  pipelineComercialEtapa?: string | null;
  proximoFollowupAt?: string | null;
}

const TEMPERATURE = (score: number) => {
  if (score <= 40) return { label: "Frio", icon: "🧊", color: "#4d72a0", bg: "#E6F1FB" };
  if (score <= 70) return { label: "Morno", icon: "☕", color: "#B25C0A", bg: "#FBEED8" };
  return { label: "Quente", icon: "🔥", color: "#C2410C", bg: "#FFE2D2" };
};

const CHANNEL = (ch?: string | null) => {
  const v = (ch || "").toUpperCase();
  if (v === "WHATSAPP" || !v) return { label: "WhatsApp", icon: LuStickyNote, color: "#0F6E56", bg: "#E1F5EE" };
  if (v === "LIGACAO") return { label: "Ligação", icon: LuPhone, color: "#0C447C", bg: "#E6F1FB" };
  if (v === "WALK_IN") return { label: "Walk-in", icon: LuFootprints, color: "#8a6313", bg: "#FBEED8" };
  return { label: "Outro", icon: LuStickyNote, color: "#4d5a66", bg: "#f0e8d4" };
};

const STAGE_BADGE = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "AGUARDANDO_TRIAGEM") return { label: "Aguardando triagem", color: "#8A5A0F", bg: "#FCE5C8" };
  if (s === "NEW") return { label: "Lead novo", color: "#0C447C", bg: "#E6F1FB" };
  if (s === "ENRICHING" || s === "ENRICHED" || s === "QUALIFIED") return { label: "Em qualificação", color: "#00798A", bg: "#E0F4F6" };
  if (s === "CONTACTED") return { label: "Aguardando retorno", color: "#8A5A0F", bg: "#FCE5C8" };
  if (s === "CONVERTED") return { label: "Convertido", color: "#0F6E56", bg: "#E1F5EE" };
  if (s === "LOST") return { label: "Perdido", color: "#A32D2D", bg: "#FCEBEB" };
  return { label: status, color: "#4d5a66", bg: "#f0e8d4" };
};

const getInitials = (name: string | null) => {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || name.slice(0, 2).toUpperCase();
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

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reativacao, setReativacao] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ativos");
  const [search, setSearch] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTel, setNovoTel] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPetNome, setNovoPetNome] = useState("");
  const [novoPetEspecie, setNovoPetEspecie] = useState("Cão");
  const [savingNovo, setSavingNovo] = useState(false);

  const handleCriarLead = async () => {
    if (!novoNome.trim() && !novoTel.trim()) { window.alert("Informe pelo menos nome ou telefone"); return; }
    setSavingNovo(true);
    try {
      const digits = novoTel.replace(/\D/g, "");
      const email = novoEmail.trim() || `${digits || Date.now()}@whatsapp.lead`;
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: novoNome.trim() || undefined, phone: digits || undefined, email, ...(novoPetNome.trim() ? { customFields: { petName: novoPetNome.trim(), especie: novoPetEspecie } } : {}) }) });
      if (!res.ok) {
        // Tenta ler o corpo JSON do backend (o proxy repassa o body completo do 409).
        let payload: any = null;
        try { payload = await res.json(); } catch { /* corpo não-JSON */ }
        // Telefone/e-mail já pertence a um CLIENTE (Tutor): não cria lead duplicado.
        if (res.status === 409 && payload?.code === "PHONE_BELONGS_TO_TUTOR" && payload?.tutorId) {
          const nome = (typeof payload.message === "string" && payload.message.replace(/^Telefone ja pertence ao cliente\s*/i, "").trim()) || "";
          const abrir = window.confirm(
            `Esse telefone já é do cliente${nome ? ` ${nome}` : ""}. Não vou criar um lead duplicado.\n\nDeseja abrir a ficha do cliente?`
          );
          if (abrir) router.push(`/dashboard/erp/tutores/${payload.tutorId}`);
          return;
        }
        // Outros conflitos (ex.: e-mail já usado por outro lead).
        if (res.status === 409) {
          window.alert(payload?.message || "Já existe um lead com esse telefone ou e-mail.");
          return;
        }
        throw new Error(payload?.message || (await res.text().catch(() => "")));
      }
      const novo = await res.json();
      if (novo?.id) router.push(`/dashboard/crm/leads/${novo.id}`); else window.location.reload();
    } catch { window.alert("Não foi possível criar o lead. Verifique os dados e tente novamente."); } finally { setSavingNovo(false); }
  };
  const importInputRef = useRef<HTMLInputElement>(null);

  const downloadCSV = () => {
    const headers = ["nome", "telefone", "email", "canal", "etapa", "pet", "servico", "score"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = filtered.map((l) => [
      l.name || "", l.phone || "", l.email || "", l.channel || "",
      l.status || "", l.customFields?.petName || "",
      l.customFields?.servicoInteresse || l.sourceDetail || "", l.currentScore || 0,
    ].map(esc).join(","));
    const csv = [headers.join(","), ...linhas].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportLeads = async () => {
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
      if (!telefone && !email) { fail++; continue; }
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: nome || null,
            phone: telefone || undefined,
            email: email || `contato+${telefone}@emporiodopet.crm`,
          }),
        });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    window.alert(`Importacao concluida: ${ok} importados, ${fail} com erro.`);
    window.location.reload();
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/leads?limit=10000");
        const data = await res.json();
        setLeads(Array.isArray(data?.leads) ? data.leads : Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function loadReativacao() {
    try {
      const r = await fetch("/api/tutors?limit=1000", { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.tutors || d.data || []);
      const reat = arr.filter((t: any) => t.estadoRelacionamento === "Reativação").map((t: any) => ({
        id: t.id,
        name: t.name,
        phone: (t.contacts || []).find((c: any) => c.isPrimary)?.number || (t.contacts || [])[0]?.number || t.phone || "",
        petName: (t.pets || [])[0]?.name || "",
      }));
      setReativacao(reat);
    } catch { setReativacao([]); }
  }
  useEffect(() => { loadReativacao(); }, []);
  async function tirarReativacao(id: string) {
    if (!window.confirm("Tirar este cliente da reativação?")) return;
    try {
      const r = await fetch(`/api/tutors/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estadoRelacionamento: "Em dia" }) });
      if (!r.ok) throw new Error();
      setReativacao((prev) => prev.filter((x) => x.id !== id));
    } catch { window.alert("Erro ao tirar da reativação"); }
  }

  const handleDeleteLead = async (lead: Lead) => {
    if (deletingId) return;
    const label = lead.name || lead.phone || "este lead";
    if (!(await confirmDelete({ entityLabel: "lead", itemName: label }))) return;
    setDeletingId(lead.id);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setLeads((prev) => prev.filter((x) => x.id !== lead.id));
    } catch (e) {
      console.error(e);
      window.alert("Nao foi possivel excluir o lead. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  };

  const periodLimits = useMemo(() => {
    const now = Date.now();
    if (periodo === "7d") return { from: now - 7 * 86400000, to: now };
    if (periodo === "30d") return { from: now - 30 * 86400000, to: now };
    if (periodo === "custom") {
      const f = dateFrom ? new Date(dateFrom).getTime() : 0;
      const t = dateTo ? new Date(dateTo).getTime() + 86400000 : Infinity;
      return { from: f, to: t };
    }
    return { from: 0, to: Infinity };
  }, [periodo, dateFrom, dateTo]);

  const filtered = useMemo(() => {
    let arr = [...leads];
    if (filter === "ativos") arr = arr.filter((l) => !["LOST", "CONVERTED"].includes(l.status));
    if (filter === "perdidos") arr = arr.filter((l) => l.status === "LOST");
    if (filter === "convertidos") arr = arr.filter((l) => l.status === "CONVERTED");
    arr = arr.filter((l) => {
      const t = new Date(l.createdAt).getTime();
      return t >= periodLimits.from && t <= periodLimits.to;
    });
    if (stageFilter) arr = arr.filter((l) => l.status === stageFilter);
    if (channelFilter) arr = arr.filter((l) => (l.channel || "").toUpperCase() === channelFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(
        (l) =>
          l.name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.phone?.includes(q),
      );
    }
    return arr;
  }, [leads, filter, search, periodLimits, stageFilter, channelFilter]);

  const counts = useMemo(() => {
    const ativos = leads.filter((l) => !["LOST", "CONVERTED"].includes(l.status));
    return {
      total: leads.length,
      quentes: ativos.filter((l) => l.currentScore > 70).length,
      mornos: ativos.filter((l) => l.currentScore > 40 && l.currentScore <= 70).length,
      frios: ativos.filter((l) => l.currentScore <= 40).length};
  }, [leads]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-3">
        <div>
          <p className="text-sm text-[#5b6470] mt-0.5">
            {counts.total} leads · <span className="text-[#C2410C] font-medium">🔥 {counts.quentes} quentes</span> ·{" "}
            <span className="text-[#B25C0A] font-medium">☕ {counts.mornos} mornos</span> ·{" "}
            <span className="text-[#4d72a0] font-medium">🧊 {counts.frios} frios</span>
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={importInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportLeads} />
          <button onClick={() => importInputRef.current?.click()} className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#4d5a66] flex items-center gap-1.5">
            <LuUpload className="w-3.5 h-3.5" />Importar
          </button>
          <button onClick={downloadCSV} className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#4d5a66] flex items-center gap-1.5">
            <LuDownload className="w-3.5 h-3.5" />CSV
          </button>
          <button onClick={() => { setNovoNome(""); setNovoTel(""); setNovoEmail(""); setNovoOpen(true); }} className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <LuPlus className="w-3.5 h-3.5" />Novo Lead
          </button>
        </div>
      </header>

      {/* Linha 1: chips de status */}
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {(["ativos", "perdidos", "outros", "convertidos", "todos"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium ${
              filter === f
                ? "bg-[#009AAC] text-white"
                : "bg-white text-[#4d5a66] border border-[#cfd8e0]"
            }`}
          >
            {f === "ativos" ? "Ativos" : f === "perdidos" ? "Perdidos" : f === "outros" ? "Outros contatos" : f === "convertidos" ? "Convertidos" : "Todos"}
          </button>
        ))}
      </div>

      {/* Linha 2 ÚNICA: busca + período + datas + etapa + canal */}
      <div className="flex gap-1.5 mb-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <LuSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tutor, pet, telefone..."
            className="w-full bg-white border border-[#d8d0bc] rounded-lg pl-8 pr-2.5 py-1.5 text-xs focus:outline-none focus:border-[#009AAC]"
          />
        </div>

        <div className="flex bg-white border border-[#d8d0bc] rounded-lg overflow-hidden">
          {(["7d", "30d", "tudo"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-2.5 py-1.5 text-[11px] font-medium border-r border-[#d8d0bc] last:border-r-0 ${
                periodo === p ? "bg-[#009AAC] text-white" : "text-[#4d5a66] hover:bg-[#fdfaee]"
              }`}
            >
              {p === "7d" ? "7d" : p === "30d" ? "30d" : "Tudo"}
            </button>
          ))}
        </div>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPeriodo("custom"); }}
          className="bg-white border border-[#d8d0bc] rounded-lg px-2 py-1.5 text-[11px] text-[#4d5a66] focus:outline-none focus:border-[#009AAC]"
        />
        <span className="text-[11px] text-[#5b6470]">→</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPeriodo("custom"); }}
          className="bg-white border border-[#d8d0bc] rounded-lg px-2 py-1.5 text-[11px] text-[#4d5a66] focus:outline-none focus:border-[#009AAC]"
        />

        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="bg-white border border-[#d8d0bc] rounded-lg px-2 py-1.5 text-[11px] text-[#4d5a66] focus:outline-none focus:border-[#009AAC]"
        >
          <option value="">Etapa: todas</option>
          <option value="AGUARDANDO_TRIAGEM">Aguardando triagem</option>
          <option value="NEW">Lead novo</option>
          <option value="ENRICHING">Em qualificação</option>
          <option value="CONTACTED">Aguardando retorno</option>
          <option value="CONVERTED">Convertido</option>
          <option value="LOST">Perdido</option>
        </select>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="bg-white border border-[#d8d0bc] rounded-lg px-2 py-1.5 text-[11px] text-[#4d5a66] focus:outline-none focus:border-[#009AAC]"
        >
          <option value="">Canal: todos</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="LIGACAO">Ligação</option>
          <option value="WALK_IN">Walk-in</option>
        </select>
      </div>

      {reativacao.length > 0 && (
        <div className="mb-3 bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E6F1FB" }}>
          <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: "#F4F9FF", borderColor: "#E6F1FB" }}>
            <span className="text-[11px] font-semibold" style={{ color: "#0C447C" }}>Em reativação</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "#E6F1FB", color: "#0C447C" }}>{reativacao.length}</span>
            <span className="text-[10px] text-[#94a3b8] ml-1">clientes retomados como lead — cadastro único</span>
          </div>
          <div>
            {reativacao.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 px-3 py-2 border-b hover:bg-[#fdfaee]" style={{ borderColor: "#f0e8d4" }}>
                <Link href={`/dashboard/erp/tutores/${t.id}`} className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0" style={{ background: "#E6F1FB", color: "#0C447C" }}>{getInitials(t.name)}</div>
                  <div className="min-w-0">
                    <div className="text-[#0E2244] font-medium truncate">{t.name || "Sem nome"}</div>
                    <div className="text-[11px] text-[#5b6470] truncate">{t.petName ? `🐾 ${t.petName}` : "sem pet"}{t.phone ? ` · ${t.phone}` : ""}</div>
                  </div>
                </Link>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#E6F1FB", color: "#0C447C" }}>Reativação</span>
                <button type="button" onClick={() => tirarReativacao(t.id)} title="Tirar da reativação" className="text-[12px] text-[#cfd8e0] hover:text-[#A32D2D] flex-shrink-0 px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-[#d8d0bc] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F3E4] border-b border-[#d8d0bc] text-[11px] text-[#5b6470] font-medium">
              <th className="text-left py-2.5 px-3">Tutor / Pet</th>
              <th className="text-left py-2.5 px-3">Telefone</th>
              <th className="text-left py-2.5 px-3">Serviço</th>
              <th className="text-left py-2.5 px-3">Canal</th>
              <th className="text-left py-2.5 px-3">Etapa</th>
              <th className="text-left py-2.5 px-3">Temperatura</th>
              <th className="text-right py-2.5 px-3">Valor</th>
              <th className="py-2.5 px-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="py-12 text-center text-gray-400">Nenhum lead nesse filtro</td></tr>
            ) : (
              filtered.map((l) => {
                const temp = TEMPERATURE(l.currentScore || 0);
                const channel = CHANNEL(l.channel);
                const stage = STAGE_BADGE(l.status);
                const Icon = channel.icon;
                const petName = l.customFields?.petName;
                const servico = l.customFields?.servicoInteresse || l.sourceDetail;
                const valor = l.customFields?.valor;
                return (
                  <tr key={l.id} className="border-b border-[#f0e8d4] hover:bg-[#fdfaee] transition">
                    <td className="py-2.5 px-3">
                      <Link href={`/dashboard/crm/leads/${l.id}`} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#E0F4F6] text-[#00798A] flex items-center justify-center text-[11px] font-medium">
                          {getInitials(l.name)}
                        </div>
                        <div>
                          <div className="text-[#0E2244] font-medium">{l.name || "Sem nome"}</div>
                          <div className="text-[11px] text-[#5b6470]">{petName ? `🐾 ${petName}` : "sem pet"}</div>
                          {l.proximoFollowupAt && <div className="text-[10px] text-[#BA7517]">FU: {new Date(l.proximoFollowupAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>}
                        </div>
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 text-[#4d5a66]">{l.phone || "—"}</td>
                    <td className="py-2.5 px-3 text-[#4d5a66]">{servico || "—"}</td>
                    <td className="py-2.5 px-3">
                      <span style={{ background: channel.bg, color: channel.color }} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full">
                        <Icon className="w-3 h-3" />{channel.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {l.pipelineComercialEtapa ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#E6F1FB", color: "#0C447C" }}>{l.pipelineComercialEtapa}</span>
                      ) : (
                        <span style={{ background: stage.bg, color: stage.color }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">{stage.label}</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-9 h-1 bg-[#f0e8d4] rounded-full overflow-hidden">
                          <div style={{ width: `${Math.min(100, l.currentScore || 0)}%`, background: temp.color }} className="h-full rounded-full" />
                        </div>
                        <span style={{ color: temp.color }} className="text-[11px] font-medium inline-flex items-center gap-0.5">
                          <span className="text-[11px]">{temp.icon}</span>{l.currentScore || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#0E2244] font-medium">
                      {valor ? `R$ ${valor}` : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteLead(l)}
                        disabled={deletingId === l.id}
                        title="Excluir lead"
                        className="disabled:opacity-40"
                      >
                        <LuTrash className="w-3.5 h-3.5 text-[#cfd8e0] cursor-pointer hover:text-[#A32D2D]" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 bg-white border border-[#e8dfc8] rounded-lg px-3 py-2 flex gap-4 text-[11px] text-[#5b6470]">
        <span className="text-[#0E2244] font-medium">Temperatura:</span>
        <span>🧊 Frio 0–40</span>
        <span>☕ Morno 41–70</span>
        <span>🔥 Quente 71–100</span>
      </div>

      {novoOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24" onClick={() => setNovoOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-[420px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium text-[#0E2244]">Novo Lead</h2>
              <button onClick={() => setNovoOpen(false)} className="text-gray-400 hover:text-gray-600"><LuX className="w-4 h-4" /></button>
            </div>
            <label className="text-[11px] text-[#5b6470]">Nome</label>
            <input autoFocus value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do lead" className="w-full h-9 mt-0.5 mb-3 px-3 border border-[#d8d0bc] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
            <label className="text-[11px] text-[#5b6470]">Telefone</label>
            <input value={novoTel} onChange={(e) => setNovoTel(e.target.value)} placeholder="(85) 9 9999-9999" className="w-full h-9 mt-0.5 mb-3 px-3 border border-[#d8d0bc] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
            <label className="text-[11px] text-[#5b6470]">Email (opcional)</label>
            <input value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCriarLead(); }} placeholder="email@exemplo.com" className="w-full h-9 mt-0.5 px-3 border border-[#d8d0bc] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
            <p className="text-[10px] text-gray-400 mt-1.5">Sem email, geramos um provisório a partir do telefone.</p>
            <label className="text-[11px] text-[#5b6470] block mt-3">Pet de interesse (opcional)</label>
            <div className="flex gap-2 mt-0.5">
              <input value={novoPetNome} onChange={(e) => setNovoPetNome(e.target.value)} placeholder="Nome do pet" className="flex-1 h-9 px-3 border border-[#d8d0bc] rounded-lg text-sm focus:outline-none focus:border-[#009AAC]" />
              <select value={novoPetEspecie} onChange={(e) => setNovoPetEspecie(e.target.value)} className="h-9 px-2 border border-[#d8d0bc] rounded-lg text-sm w-[90px] focus:outline-none focus:border-[#009AAC]">
                <option>Cão</option><option>Gato</option><option>Outro</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setNovoOpen(false)} className="px-4 py-2 border border-[#cfd8e0] rounded-lg text-sm text-[#5b6470]">Cancelar</button>
              <button onClick={handleCriarLead} disabled={savingNovo} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingNovo ? "Criando..." : "Criar e abrir"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

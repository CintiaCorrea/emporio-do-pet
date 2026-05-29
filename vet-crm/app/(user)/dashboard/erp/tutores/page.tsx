"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuSearch, LuPlus, LuUpload, LuDownload, LuPaw } from "react-icons/lu";

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
  createdAt: string;
}

const STATUS_BADGE = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE") return { label: "Em dia", color: "#0F6E56", bg: "#E1F5EE" };
  if (s === "INACTIVE") return { label: "Inativo", color: "#5b6470", bg: "#f0e8d4" };
  if (s === "SUSPENDED") return { label: "A recuperar", color: "#BA7517", bg: "#FCE5C8" };
  if (s === "CHURNED") return { label: "Ex-cliente", color: "#A32D2D", bg: "#FCEBEB" };
  return { label: status, color: "#4d5a66", bg: "#f0e8d4" };
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

export default function ClientesPage() {
  const [tutores, setTutores] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("Cliente");
  const [search, setSearch] = useState("");

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
      aRecuperar: c.filter((t) => t.status === "SUSPENDED").length,
    };
  }, [tutores]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl text-[#0E2244] font-medium">Clientes</h1>
          <p className="text-sm text-[#5b6470] mt-0.5">
            {counts.total} clientes ·{" "}
            <span className="text-[#BA7517] font-medium">🎂 {counts.aniversariantes} aniversariantes do mês</span> ·{" "}
            <span className="text-[#BA7517] font-medium">{counts.aRecuperar} a recuperar</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-[#cfd8e0] px-3 py-1.5 rounded-lg text-xs text-[#4d5a66] flex items-center gap-1.5">
            <LuUpload className="w-3.5 h-3.5" />Importar
          </button>
          <Link href="/dashboard/erp/tutores/novo" className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <LuPlus className="w-3.5 h-3.5" />Novo cliente
          </Link>
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
          placeholder="Buscar cliente, pet, telefone..."
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
              <th className="text-left py-2.5 px-3">Status</th>
              <th className="text-right py-2.5 px-3">Cliente desde</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400">Nenhum cliente nesse filtro</td></tr>
            ) : (
              filtered.map((t) => {
                const phone = t.contacts?.find((c) => c.isPrimary)?.number || t.contacts?.[0]?.number;
                const status = STATUS_BADGE(t.status);
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
                        <div className="text-[#0E2244] font-medium">{t.name || "Sem nome"}</div>
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
                    <td className="py-2.5 px-3">
                      <span style={{ background: status.bg, color: status.color }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {status.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#4d5a66] text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

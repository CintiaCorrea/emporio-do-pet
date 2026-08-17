"use client";
// [EMP-COWORK] Resumo da fila de exames pro Meu painel (3 perfis). Mostra contagens por situação
// e abre o Kanban. Auto-suficiente: busca /api/exames/fila.

import { useEffect, useState } from "react";
import Link from "next/link";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", TEAL = "#009AAC";
const norm = (s?: string) => String(s || "").toLowerCase();

export default function ExamesResumoCard() {
  const [fila, setFila] = useState<any[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    fetch("/api/exames/fila", { cache: "no-store" })
      .then((r) => r.json())
      .then((f) => setFila(Array.isArray(f) ? f : (f?.data || [])))
      .catch(() => {})
      .finally(() => setCarregado(true));
  }, []);

  if (!carregado || fila.length === 0) return null; // sem exames em andamento → não ocupa espaço

  const aAvisar = fila.filter((e) => /coleta|solicit/i.test(norm(e.status)) && !e.labAvisadoAt && e.fornecedorId).length;
  const aguardando = fila.filter((e) => /aguard|resultado/i.test(norm(e.status))).length;
  const total = fila.length;

  const Pill = ({ n, txt, bg, fg }: { n: number; txt: string; bg: string; fg: string }) =>
    n > 0 ? <span className="text-[12px] font-semibold rounded-full px-2.5 py-1" style={{ background: bg, color: fg }}>{n} {txt}</span> : null;

  return (
    <div className="rounded-2xl p-3.5 flex items-center gap-3 flex-wrap" style={{ background: "#fff", border: `1px solid ${LINE}` }}>
      <div className="text-[14px] font-bold flex items-center gap-2" style={{ color: NAVY }}>🔬 Exames em andamento</div>
      <Pill n={aAvisar} txt="a avisar lab" bg="#FBEEDD" fg="#B45309" />
      <Pill n={aguardando} txt="aguardando resultado" bg="#E1F5EE" fg="#0F6E56" />
      {aAvisar === 0 && aguardando === 0 ? <span className="text-[12px] font-semibold rounded-full px-2.5 py-1" style={{ background: "#E7F0FB", color: "#0C447C" }}>{total} em andamento</span> : null}
      <Link href="/dashboard/erp/exames-kanban" className="ml-auto text-[12.5px] font-semibold text-white rounded-lg px-3.5 py-1.5" style={{ background: TEAL }}>Abrir quadro →</Link>
    </div>
  );
}

"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · versão Cintia + Claude (Cowork)   [EMP-COWORK]
   Tela........: Calendário Clínico  (erp/agendamentos/clinico)
   Atualizado..: 06/06/2026 — Cintia + Claude
   ✔ Salvar SEMPRE no main (é a versão que publica).
   ✔ Backup periódico ativo.
   ⚠ NÃO sobrescrever por "Add files via upload".
     Toda mudança = commit pequeno e direto. Em dúvida, perguntar.
   ─────────────────────────────────────────────────────────────
   Trazido do Base44 (padrão-ouro): NÃO é agenda de consultas — é
   alimentado pelos Follow-Ups (proximoFollowupAt), Retornos
   (nextReturnDate) e Aniversários (birthDate). Só estrutura/leitura.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuClock, LuCalendar, LuStar, LuChevronRight } from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

type Badge = "Lead" | "Cliente" | "Pet";
interface Item { id: string; nome: string; badge: Badge; tipo: string; data: Date; href: string; }

const PERIODOS = [
  { k: "hoje", label: "Hoje", dias: 0 },
  { k: "7", label: "7 dias", dias: 7 },
  { k: "30", label: "30 dias", dias: 30 },
  { k: "mes", label: "Mês atual", dias: -1 },
] as const;

function arr(d: any, k: string): any[] { return Array.isArray(d) ? d : (d?.[k] || d?.data || []); }
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function diasAtraso(data: Date, hoje: Date) { return Math.round((startOfDay(hoje).getTime() - startOfDay(data).getTime()) / 86400000); }
function fmt(d: Date) { return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); }

export default function CalendarioClinicoPage() {
  usePageTitle("Calendário Clínico", "Retornos, follow-ups e datas importantes");
  const [periodo, setPeriodo] = useState<string>("7");
  const [tab, setTab] = useState<"vencidos" | "proximos" | "retornos" | "aniversarios">("vencidos");
  const [loading, setLoading] = useState(true);
  const [followups, setFollowups] = useState<Item[]>([]);
  const [retornos, setRetornos] = useState<Item[]>([]);
  const [aniversarios, setAniversarios] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const get = async (u: string, k: string) => { try { return arr(await (await fetch(u, { cache: "no-store", credentials: "include" })).json(), k); } catch { return []; } };
        const [leads, tutors, pets, appts] = await Promise.all([
          get("/api/leads?limit=200", "leads"),
          get("/api/tutors?limit=500", "tutors"),
          get("/api/pets?limit=500", "pets"),
          get("/api/appointments?limit=500", "appointments"),
        ]);

        const fu: Item[] = [];
        for (const l of leads) if (l.proximoFollowupAt) fu.push({ id: l.id, nome: l.name || l.nome || "Sem nome", badge: "Lead", tipo: l.serviceInterest || l.servicoInteresse || "—", data: new Date(l.proximoFollowupAt), href: `/dashboard/crm/leads/${l.id}` });
        for (const t of tutors) if (t.proximoFollowupAt) fu.push({ id: t.id, nome: t.name || t.nome || "Sem nome", badge: "Cliente", tipo: "—", data: new Date(t.proximoFollowupAt), href: `/dashboard/erp/tutores/${t.id}` });
        for (const p of pets) if (p.proximoFollowupAt) fu.push({ id: p.id, nome: p.name || p.nome || "Sem nome", badge: "Pet", tipo: "—", data: new Date(p.proximoFollowupAt), href: `/dashboard/erp/pets/${p.id}` });
        setFollowups(fu);

        const ret: Item[] = [];
        for (const a of appts) { const rd = a.nextReturnDate || a.proximoRetorno; if (rd) ret.push({ id: a.id, nome: a.pet?.name || a.petName || a.tutor?.name || "Atendimento", badge: "Pet", tipo: a.type || a.tipo || "Retorno", data: new Date(rd), href: a.pet?.id ? `/dashboard/erp/pets/${a.pet.id}` : "/dashboard/erp/agendamentos/clinico" }); }
        setRetornos(ret);

        const mesAtual = new Date().getMonth();
        const niver: Item[] = [];
        for (const t of tutors) if (t.birthDate && new Date(t.birthDate).getMonth() === mesAtual) niver.push({ id: t.id, nome: t.name || "Cliente", badge: "Cliente", tipo: "Aniversário", data: new Date(t.birthDate), href: `/dashboard/erp/tutores/${t.id}` });
        for (const p of pets) if (p.birthDate && new Date(p.birthDate).getMonth() === mesAtual) niver.push({ id: p.id, nome: p.name || "Pet", badge: "Pet", tipo: "Aniversário", data: new Date(p.birthDate), href: `/dashboard/erp/pets/${p.id}` });
        setAniversarios(niver);
      } finally { setLoading(false); }
    })();
  }, []);

  const hoje = startOfDay(new Date());
  const limiteProx = useMemo(() => {
    const p = PERIODOS.find(x => x.k === periodo);
    if (!p) return new Date(hoje.getTime() + 7 * 86400000);
    if (p.k === "mes") { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
    return new Date(hoje.getTime() + (p.dias || 0) * 86400000);
  }, [periodo]);

  const vencidos = useMemo(() => followups.filter(i => startOfDay(i.data) < hoje).sort((a, b) => a.data.getTime() - b.data.getTime()), [followups]);
  const proximos = useMemo(() => followups.filter(i => startOfDay(i.data) >= hoje && startOfDay(i.data) <= startOfDay(limiteProx)).sort((a, b) => a.data.getTime() - b.data.getTime()), [followups, limiteProx]);
  const retornosVenc = useMemo(() => retornos.filter(i => startOfDay(i.data) < hoje).sort((a, b) => a.data.getTime() - b.data.getTime()), [retornos]);

  const KPIS = [
    { label: "Follow-ups vencidos", valor: vencidos.length, Icon: LuCalendar, cor: "#A32D2D", bg: "#FCEBEB" },
    { label: "Próx. follow-ups", valor: proximos.length, Icon: LuClock, cor: "#0E2244", bg: "#FFFFFF" },
    { label: "Retornos vencidos", valor: retornosVenc.length, Icon: LuCalendar, cor: "#854F0B", bg: "#FAEEDA" },
    { label: "Aniversários do mês", valor: aniversarios.length, Icon: LuStar, cor: "#854F0B", bg: "#FAEEDA" },
  ];
  const TABS = [
    { k: "vencidos", label: `Vencidos (${vencidos.length})`, lista: vencidos },
    { k: "proximos", label: `Próximos (${proximos.length})`, lista: proximos },
    { k: "retornos", label: `Retornos (${retornosVenc.length})`, lista: retornosVenc },
    { k: "aniversarios", label: `Aniversários (${aniversarios.length})`, lista: aniversarios },
  ] as const;
  const listaAtual = TABS.find(t => t.k === tab)!.lista;
  const badgeCor: Record<Badge, { bg: string; fg: string }> = {
    Lead: { bg: "#EEEDFE", fg: "#534AB7" }, Cliente: { bg: "#E0F4F6", fg: "#00798A" }, Pet: { bg: "#E1F5EE", fg: "#0F6E56" },
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-5">
        <div className="flex items-center gap-2 mb-1">
          <LuCalendar size={20} style={{ color: "#009AAC" }} />
          <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Calendário Clínico</h1>
        </div>
        <p className="text-sm text-gray-500 mb-4">Retornos, follow-ups e datas importantes</p>

        <div className="flex gap-2 mb-5 flex-wrap">
          {PERIODOS.map(p => (
            <button key={p.k} onClick={() => setPeriodo(p.k)} className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={periodo === p.k ? { background: "#009AAC", color: "white" } : { background: "#F1EFE8", color: "#5F5E5A" }}>{p.label}</button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {KPIS.map(k => (
            <div key={k.label} className="rounded-xl p-4 border text-center" style={{ background: k.bg, borderColor: "#E8DFC8" }}>
              <k.Icon size={18} style={{ color: k.cor, margin: "0 auto" }} />
              <div className="text-2xl font-semibold mt-1" style={{ color: k.cor }}>{k.valor}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "#5F5E5A" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 border-b mb-3 flex-wrap" style={{ borderColor: "#E8DFC8" }}>
          {TABS.map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className="px-3 py-2 text-sm font-medium border-b-2"
              style={{ borderColor: tab === t.k ? "#009AAC" : "transparent", color: tab === t.k ? "#009AAC" : "#6B7280" }}>{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 py-10 text-center">Carregando...</div>
        ) : listaAtual.length === 0 ? (
          <div className="text-sm text-gray-400 py-10 text-center">Nada por aqui neste filtro.</div>
        ) : (
          <div className="space-y-2">
            {listaAtual.map((i, idx) => {
              const atraso = diasAtraso(i.data, new Date());
              const venc = atraso > 0 && tab !== "aniversarios";
              return (
                <Link key={i.id + idx} href={i.href} className="flex items-center justify-between px-4 py-3 rounded-xl border hover:shadow-sm transition"
                  style={{ borderColor: "#E8DFC8", background: venc ? "#FDF3F3" : "white" }}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "#0E2244" }}>{i.nome}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: badgeCor[i.badge].bg, color: badgeCor[i.badge].fg }}>{i.badge}</span>
                    </div>
                    <div className="text-xs text-gray-500">{i.tipo}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: venc ? "#A32D2D" : "#E1F5EE", color: venc ? "white" : "#0F6E56" }}>{fmt(i.data)}</span>
                      {tab !== "aniversarios" && <div className="text-[11px] text-gray-400 mt-0.5">{atraso > 0 ? `${atraso}d de atraso` : atraso === 0 ? "hoje" : `em ${-atraso}d`}</div>}
                    </div>
                    <LuChevronRight size={16} className="text-gray-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

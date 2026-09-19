"use client";
// AS MENSAGENS QUE O SISTEMA MANDOU SOZINHO HOJE.
//
// Cintia, 15/09/2026: "hoje só quem tem controle sobre essas mensagens sou eu e muitas vezes as
// pessoas ficam com dúvidas, como no caso dos exames se o cliente realmente foi avisado".
//
// Tela SEPARADA, e não uma aba dentro do inbox, de propósito: ela pediu para acompanhar "sem que
// isso encha o nosso fluxo diário". Quem está atendendo não tropeça nisto; quem quer conferir
// abre e vê o dia inteiro de uma vez.

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", TEAL = "#009AAC";

const hhmm = (s: string) => new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const hoje = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });

// O que a Meta devolve, em português e com cor. "Falhou" é o único que precisa saltar.
const SITUACAO: Record<string, { txt: string; bg: string; fg: string }> = {
  read: { txt: "lida", bg: "#E3F2EB", fg: "#0F6E56" },
  delivered: { txt: "entregue", bg: "#E6F4F5", fg: "#00707E" },
  sent: { txt: "enviada", bg: "#F1EEE6", fg: "#5C6B70" },
  pending: { txt: "saindo…", bg: "#F1EEE6", fg: "#8A8375" },
  failed: { txt: "FALHOU", bg: "#FBE4E2", fg: "#b23b3b" },
};

export default function AutomaticasPage() {
  usePageTitle("Mensagens automáticas", "O que o sistema enviou sozinho");
  const [dia, setDia] = useState(hoje());
  const [linhas, setLinhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  const load = async (d: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/whatsapp/automaticas?dia=${d}`, { cache: "no-store" });
      const j = await r.json();
      setLinhas(Array.isArray(j) ? j : []);
    } catch { setLinhas([]); }
    setLoading(false);
  };
  useEffect(() => { load(dia); }, [dia]);

  const vistas = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return linhas;
    return linhas.filter((l) =>
      `${l.para} ${l.texto} ${l.template || ""} ${l.origem}`.toLowerCase().includes(q));
  }, [linhas, filtro]);

  // Falha é o que precisa de gente. Vai em destaque no topo, não perdida na lista.
  const falhas = vistas.filter((l) => l.status === "failed");

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="text-[13px]" style={{ color: MUT }}>
          <b style={{ color: NAVY }}>{vistas.length}</b> mensagem(ns) que o sistema enviou sozinho
        </div>
        <input
          type="date"
          value={dia}
          max={hoje()}
          onChange={(e) => setDia(e.target.value || hoje())}
          className="text-[12px] px-2 py-1 rounded-md border"
          style={{ borderColor: LINE, color: NAVY }}
        />
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por cliente, exame, modelo…"
          className="text-[12px] px-2.5 py-1 rounded-md border flex-1 min-w-[180px]"
          style={{ borderColor: LINE }}
        />
        <Link href="/dashboard/inbox-nativo" className="ml-auto text-[11.5px] font-semibold" style={{ color: TEAL }}>← Voltar ao atendimento</Link>
      </div>

      <div className="text-[11.5px] mb-3" style={{ color: MUT }}>
        Lembretes, confirmações, avisos de exame e pedidos ao laboratório. A lista mostra o dia
        escolhido — amanhã ela começa vazia. As mensagens continuam na conversa de cada cliente.
      </div>

      {falhas.length > 0 ? (
        <div className="rounded-xl p-3 mb-3" style={{ background: "#FDF3F2", border: "1px solid #F0C9C7" }}>
          <div className="text-[12.5px] font-bold mb-1" style={{ color: "#b23b3b" }}>
            ⚠️ {falhas.length} mensagem(ns) não chegaram
          </div>
          <div className="text-[11.5px]" style={{ color: "#8A4A45" }}>
            {falhas.slice(0, 3).map((f) => `${f.para}${f.erro ? ` (${f.erro})` : ""}`).join("; ")}
            {falhas.length > 3 ? ` e mais ${falhas.length - 3}` : ""}.
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: MUT }}>Carregando…</div>
      ) : vistas.length === 0 ? (
        <div className="py-20 text-center text-sm" style={{ color: MUT }}>
          Nenhuma mensagem automática {dia === hoje() ? "hoje" : "neste dia"}.
        </div>
      ) : (
        <div className="flex flex-col gap-[2px]">
          {vistas.map((l) => {
            const s = SITUACAO[l.status] || SITUACAO.sent;
            return (
              <div key={l.id} className="bg-white px-3 py-2.5 flex items-start gap-3 flex-wrap" style={{ border: `1px solid ${LINE}` }}>
                <span className="text-[12px] font-bold tabular-nums" style={{ color: NAVY, minWidth: 42 }}>{hhmm(l.hora)}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold" style={{ color: NAVY }}>{l.para}</div>
                  <div className="text-[12px] mt-0.5" style={{ color: MUT }}>{l.texto}</div>
                  {l.erro ? <div className="text-[11px] mt-0.5" style={{ color: "#b23b3b" }}>{l.erro}</div> : null}
                </div>
                {l.template ? (
                  <span className="text-[10px] rounded px-1.5 py-0.5" style={{ background: "#F1EEE6", color: MUT }}>{l.template}</span>
                ) : null}
                <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: s.bg, color: s.fg }}>{s.txt}</span>
                {l.conversaId ? (
                  <Link href={`/dashboard/inbox-nativo?conversa=${l.conversaId}`} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border" style={{ borderColor: LINE, color: TEAL }}>abrir conversa</Link>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

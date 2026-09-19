"use client";
// O QUE QUEBROU NA TELA DE ALGUÉM.
//
// Cintia, 15/09/2026: "às vezes, como não acontecem comigo, não sei nem como nem porque estão
// acontecendo". Hoje ela só descobre quando alguém conta — e às vezes horas depois, como no caso
// da Dra. Vivian que não conseguia salvar um orçamento.
//
// A lista é de LEITURA. Não há botão para apagar nem para marcar como resolvido: o registro
// some sozinho em 14 dias, e um erro que alguém "resolve" com um clique some sem ter sido
// entendido.

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", TEAL = "#009AAC", CORAL = "#b23b3b";

const hhmm = (s: string) => new Date(s).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const hoje = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });

/** O caminho da URL vira o nome da tela, que é como a equipe fala dela. */
function nomeDaTela(caminho: string): string {
  const p = String(caminho || "");
  const mapa: [RegExp, string][] = [
    [/ponto-de-venda/, "Ponto de venda"],
    [/consulta-vendas/, "Vendas"],
    [/exames-kanban/, "Quadro de exames"],
    [/erp\/pets\//, "Ficha do pet"],
    [/erp\/tutores\//, "Ficha do cliente"],
    [/internacoes/, "Internação"],
    [/inbox-nativo/, "Inbox"],
    [/erp\/caixa/, "Caixa"],
    [/orcamentos/, "Orçamentos"],
    [/agendamentos/, "Agenda"],
    [/dashboard\/hoje/, "Meu painel"],
  ];
  for (const [re, nome] of mapa) if (re.test(p)) return nome;
  return p || "—";
}

export default function ErrosPage() {
  usePageTitle("Erros de tela", "O que quebrou para a equipe");
  const [dia, setDia] = useState(hoje());
  const [linhas, setLinhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberto, setAberto] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    setLoading(true);
    fetch(`/api/erros-tela?dia=${dia}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { if (vivo) setLinhas(Array.isArray(j) ? j : []); })
      .catch(() => { if (vivo) setLinhas([]); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [dia]);

  // Agrupar por PESSOA é o que responde a pergunta dela: "com quem está acontecendo?".
  const porPessoa = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const l of linhas) (m[l.userNome || "—"] = m[l.userNome || "—"] || []).push(l);
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length);
  }, [linhas]);

  const totalVezes = linhas.reduce((s, l) => s + Number(l.vezes || 1), 0);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="text-[13px]" style={{ color: MUT }}>
          <b style={{ color: linhas.length ? CORAL : NAVY }}>{linhas.length}</b> erro(s) distinto(s)
          {totalVezes > linhas.length ? <span> · {totalVezes} ocorrência(s)</span> : null}
        </div>
        <input
          type="date" value={dia} max={hoje()}
          onChange={(e) => setDia(e.target.value || hoje())}
          className="text-[12px] px-2 py-1 rounded-md border"
          style={{ borderColor: LINE, color: NAVY }}
        />
        <Link href="/dashboard/inbox-nativo/automaticas" className="ml-auto text-[11.5px] font-semibold" style={{ color: TEAL }}>🤖 Mensagens automáticas</Link>
      </div>

      <div className="text-[11.5px] mb-4" style={{ color: MUT }}>
        Falhas que apareceram na tela de alguém da equipe. O registro some sozinho depois de 14 dias.
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: MUT }}>Carregando…</div>
      ) : linhas.length === 0 ? (
        <div className="py-20 text-center" style={{ color: MUT }}>
          <div className="text-[15px] font-semibold" style={{ color: "#0F6E56" }}>Nenhum erro {dia === hoje() ? "hoje" : "neste dia"}.</div>
          <div className="text-[12px] mt-1">Se alguém relatou um problema e nada aparece aqui, ele não chegou a virar erro de tela — me conte o caso.</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {porPessoa.map(([pessoa, erros]) => (
            <div key={pessoa}>
              <div className="text-[12.5px] font-bold mb-1.5" style={{ color: NAVY }}>
                {pessoa} <span style={{ color: MUT, fontWeight: 400 }}>· {erros.length} erro(s)</span>
              </div>
              <div className="flex flex-col gap-[2px]">
                {erros.map((l: any) => (
                  <div key={l.id} className="bg-white px-3 py-2.5" style={{ border: `1px solid ${LINE}`, borderLeft: `3px solid ${CORAL}` }}>
                    <div className="flex items-start gap-3 flex-wrap">
                      <span className="text-[12px] font-bold tabular-nums" style={{ color: NAVY, minWidth: 42 }}>{hhmm(l.em)}</span>
                      <span className="text-[11px] rounded px-1.5 py-0.5" style={{ background: "#F1EEE6", color: MUT }}>{nomeDaTela(l.tela)}</span>
                      <span className="text-[12.5px] flex-1 min-w-[200px]" style={{ color: "#1F2A2E" }}>{l.mensagem}</span>
                      {Number(l.vezes || 1) > 1 ? (
                        <span className="text-[10.5px] font-bold rounded px-1.5 py-0.5" style={{ background: "#FBE4E2", color: CORAL }}>{l.vezes}×</span>
                      ) : null}
                      {l.detalhe ? (
                        <button onClick={() => setAberto(aberto === l.id ? null : l.id)} className="text-[10.5px] underline" style={{ color: TEAL }}>
                          {aberto === l.id ? "esconder" : "detalhe"}
                        </button>
                      ) : null}
                    </div>
                    {aberto === l.id && l.detalhe ? (
                      <pre className="mt-2 text-[10.5px] p-2 rounded overflow-x-auto" style={{ background: "#F7F4EC", color: MUT, whiteSpace: "pre-wrap" }}>{l.detalhe}</pre>
                    ) : null}
                    <div className="text-[10.5px] mt-1" style={{ color: "#8A9499" }}>{l.tela}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

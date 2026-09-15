"use client";
// [EMP-COWORK] Kanban de exames. Colunas = fases de Configurações › Exames (exame_fases).
// A ÚLTIMA fase (ex.: "Entregue") = saída do quadro (o card some). Cor do card = laboratório.

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { podeAvisarLab, loadExameFases, faseNormalizada } from "@/lib/exameFases";
import { useRolePreview } from "@/lib/ui/RolePreview";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", INK = "#1F2A2E", TEAL = "#009AAC";
const PALETTE = ["#0C447C", "#6D3B8A", "#B45309", "#0E7490", "#9D174D", "#4D7C0F", "#7C2D12", "#1E4E8C"];
function labColor(nome?: string | null): string {
  if (!nome) return "#94a3a0";
  if (/veter/i.test(nome)) return "#0F6E56"; // Veter = verde (padrão)
  let h = 0; for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
const dt = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "");
const norm = (s?: string) => String(s || "").toLowerCase().trim();

export default function ExamesKanbanPage() {
  usePageTitle("Exames — Kanban", "Acompanhe o fluxo dos exames");
  const [fila, setFila] = useState<any[]>([]);
  const [fases, setFases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [avisando, setAvisando] = useState<string | null>(null);
  const [rodandoLote, setRodandoLote] = useState(false);
  const jaCarregou = useRef(false);
  const { effectiveRole } = useRolePreview();
  const isAdmin = effectiveRole === "ADMIN";
  // O ARQUIVO (Cintia, 13-14/09/2026): tirar do quadro guarda por 45 dias em vez de apagar.
  // A gaveta começa fechada — é lugar de ir buscar, não de ficar no caminho todo dia.
  const [arquivados, setArquivados] = useState<any[]>([]);
  const [verArquivo, setVerArquivo] = useState(false);
  const [mexendo, setMexendo] = useState<string | null>(null);
  const [labs, setLabs] = useState<any[]>([]);
  const [verHorarios, setVerHorarios] = useState(false);
  const [salvandoLab, setSalvandoLab] = useState<string | null>(null);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      // As fases vem de `loadExameFases`, a MESMA fonte da ficha do pet, do Hoje e da inbox. Esta
      // tela tinha a sua propria leitura e a sua propria lista de reserva — que ainda trazia
      // "Aguardando" depois de a coluna ter sido aposentada. Duas listas, duas verdades.
      const [f, fs, arq] = await Promise.all([
        fetch("/api/exames/fila", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        loadExameFases(),
        fetch("/api/exames/arquivados", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setFila(Array.isArray(f) ? f : (f.data || []));
      setFases(fs);
      setArquivados(Array.isArray(arq) ? arq : []);
    } catch {}
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lastFase = fases.length ? fases[fases.length - 1] : "Entregue";
  const colunas = fases.length > 1 ? fases.slice(0, -1) : fases;

  // EM QUE COLUNA O CARD CAI.
  //
  // A tradução do nome antigo (`faseNormalizada`) vem ANTES do palpite por texto, e isso não é
  // detalhe: um exame gravado em "Aguardando", com a coluna aposentada, não parece nenhuma das
  // que sobraram — caía no `idx < 0 ? 0`, ou seja, de volta em "Solicitar". O laboratório já
  // tinha levado o material e a equipe seria mandada pedir a coleta de novo.
  //
  // O último recurso continua sendo a primeira coluna, e de propósito: card que ninguém sabe
  // onde fica tem de aparecer em algum lugar. Sumir do quadro e seguir cobrado em silêncio é o
  // pior dos dois mundos.
  const colDe = (status?: string) => {
    const st = norm(faseNormalizada(status, colunas));
    let idx = colunas.findIndex((c) => norm(c) === st);
    if (idx < 0) idx = colunas.findIndex((c) => st.includes(norm(c)) || norm(c).includes(st));
    return idx < 0 ? 0 : idx;
  };
  const porColuna = useMemo(() => {
    const m: any[][] = colunas.map(() => []);
    for (const e of fila) m[colDe(e.status)]?.push(e);
    return m;
  }, [fila, colunas]);

  const mover = async (itemId: string, novaFase: string) => {
    setFila((prev) => (norm(novaFase) === norm(lastFase) ? prev.filter((e) => e.itemId !== itemId) : prev.map((e) => (e.itemId === itemId ? { ...e, status: novaFase } : e))));
    try { await fetch(`/api/exames/${itemId}/fase`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: novaFase }) }); }
    catch { load(); }
  };

  // Tirar do quadro = ARQUIVAR por 45 dias (Cintia, 13-14/09/2026). Não mexe na venda/financeiro.
  // O texto do aviso diz o que vai acontecer de verdade: antes prometia "excluir" e apagava sem
  // volta, e quem clicava por engano num dia corrido não tinha como desfazer.
  const arquivar = async (e: any) => {
    if (!window.confirm(`🗃️ Tirar este exame do quadro?\n\n${e.petNome ? e.petNome + " — " : ""}${e.nome}\n\nFica guardado em Arquivados por 45 dias e pode ser restaurado.\n(Não desfaz a venda nem o a-pagar do laboratório.)`)) return;
    setFila((prev) => prev.filter((x) => x.itemId !== e.itemId));
    try {
      const r = await fetch(`/api/exames/${e.itemId}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Arquivado — dá para restaurar em 🗃️ Arquivados");
      load();
    } catch { toast.error("Não consegui arquivar. Recarregando…"); load(); }
  };

  /**
   * 📎 ANEXAR O LAUDO PELO QUADRO (Cintia, 12/09/2026: "Ao anexar o exame pelo kanban ele salva
   * na ficha do pet").
   *
   * Não há nada a copiar para a ficha: o card É o registro do pet (a lista `petexa_<pet>` é a
   * mesma que a aba Exames da ficha lê). Anexar aqui aparece lá sozinho — e é justamente por
   * isso que dá para pedir à equipe que use o quadro sem perder nada.
   *
   * Move para "Resultado" junto, porque foi isso que ela descreveu: o laudo chegar É a mudança
   * de fase. Deixar as duas ações separadas criaria o card com laudo anexado parado em Retirado,
   * dizendo que o laboratório ainda está com o material.
   */
  const anexarLaudo = async (e: any, file: File) => {
    setMexendo(e.itemId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch(`/api/media/upload?pasta=exames&origem=exame&origemId=${e.petId}`, { method: "POST", body: fd });
      const j = await up.json().catch(() => ({}));
      if (!up.ok || !j?.url) throw new Error(j?.error || j?.message || "falha ao subir o arquivo");

      const r = await fetch(`/api/exames/${e.itemId}/resultado`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: j.url, arquivo: file.name }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.erro || "não consegui salvar o laudo");
      toast.success(d?.jaAnexado ? "Este laudo já estava anexado." : "Laudo anexado e salvo na ficha do pet");
      await load();
    } catch (err: any) {
      toast.error(String(err?.message || "Não consegui anexar o laudo").slice(0, 120));
    }
    setMexendo(null);
  };

  // Avisar o tutor de que o laudo chegou. Sai sozinho ao anexar; este botão é para quando o
  // automático não conseguiu — e ele SÓ aparece nesse caso, para ninguém mandar duas vezes.
  const carregarLabs = async () => {
    const r = await fetch("/api/exames/horarios-lab", { cache: "no-store" }).then((x) => x.json()).catch(() => []);
    setLabs(Array.isArray(r) ? r : []);
  };

  const salvarHorarios = async (fornecedorId: string, horarios: string[]) => {
    setSalvandoLab(fornecedorId);
    try {
      const r = await fetch("/api/exames/horarios-lab", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fornecedorId, horarios }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.erro || "");
      await carregarLabs();
    } catch (err: any) { toast.error(err?.message || "Não consegui salvar os horários."); }
    setSalvandoLab(null);
  };

  // Marcar o PRIMEIRO horário de um laboratório no padrão começa do zero, e não com 11:30/17:00
  // já dentro: quem clica em 09:00 quer 09:00, não 09:00 mais os dois herdados sem perceber.
  const alternarHorario = (l: any, h: string) => {
    const atuais: string[] = l.padrao ? [] : (l.horarios || []);
    const novos = atuais.includes(h) ? atuais.filter((x) => x !== h) : [...atuais, h].sort();
    salvarHorarios(l.fornecedorId, novos);
  };

  const avisarCliente = async (e: any) => {
    if (!window.confirm(`📲 Avisar ${e.tutorNome || "o tutor"} de que o laudo de ${e.petNome || "o pet"} está pronto?`)) return;
    setMexendo(e.itemId);
    try {
      const r = await fetch(`/api/exames/${e.itemId}/avisar-cliente`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (d?.desligado) toast("Aviso ao cliente ainda desligado (aguardando o template ser aprovado na Meta).", { icon: "⏸️" });
      else if (r.ok && d?.ok) { toast.success("Cliente avisado"); await load(); }
      else toast.error(d?.erro || "Não consegui avisar o cliente.");
    } catch { toast.error("Falha de conexão ao avisar o cliente."); }
    setMexendo(null);
  };

  const restaurar = async (a: any) => {
    setMexendo(a.itemId);
    try {
      const r = await fetch(`/api/exames/${a.itemId}/restaurar`, { method: "POST" });
      if (!r.ok) throw new Error();
      toast.success("De volta ao quadro, na fase em que estava");
      await load();
    } catch { toast.error("Não consegui restaurar."); }
    setMexendo(null);
  };

  // Apagar de vez, sem esperar os 45 dias. Só adm — e o servidor confere de novo, porque esconder
  // o botão não é trava.
  const apagarDeVez = async (a: any) => {
    if (!window.confirm(`⚠️ Apagar DEFINITIVAMENTE?\n\n${a.petNome ? a.petNome + " — " : ""}${a.nome}\n\nIsto não tem volta. O normal é deixar o prazo de 45 dias correr.\n(A venda e o a-pagar continuam intactos.)`)) return;
    setMexendo(a.itemId);
    try {
      const r = await fetch(`/api/exames/${a.itemId}/definitivo`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.erro || "");
      toast.success("Apagado definitivamente");
      await load();
    } catch (err: any) { toast.error(err?.message || "Não consegui apagar."); }
    setMexendo(null);
  };

  // Solicitar coleta ao laboratório AGORA (urgência). O lote automático 11:30/17:00 cuida do resto.
  const avisarLab = async (e: any) => {
    if (!window.confirm(`📲 Solicitar coleta ao ${e.fornecedorNome || "laboratório"}?\n\n${e.petNome ? e.petNome + " — " : ""}${e.nome}`)) return;
    setAvisando(e.itemId);
    try {
      const r = await fetch(`/api/exames/avisar-lab/${e.itemId}`, { method: "POST", credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.ok) { toast.success("Solicitação enviada ao laboratório"); setFila((prev) => prev.map((x) => (x.itemId === e.itemId ? { ...x, labAvisadoAt: new Date().toISOString() } : x))); }
      else toast.error(d?.erro || "Não consegui solicitar. Confira o laboratório/WhatsApp.");
    } catch { toast.error("Falha de conexão ao solicitar."); }
    setAvisando(null);
  };

  // Roda o LOTE agora (mesmo que 11:30/17:00): 1 mensagem genérica por laboratório.
  const rodarLote = async () => {
    if (!window.confirm("📲 Enviar agora a solicitação de coleta aos laboratórios com exames pendentes?")) return;
    setRodandoLote(true);
    try {
      const r = await fetch("/api/exames/avisar-lab-rodar-agora", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.desligado) toast("Lote ainda desligado (aguardando o template ser aprovado na Meta).", { icon: "⏸️" });
      else if (r.ok) { toast.success(`Lote: ${d?.labs || 0} laboratório(s), ${d?.enviados || 0} exame(s) solicitado(s).`); load(); }
      else toast.error("Não consegui rodar o lote.");
    } catch { toast.error("Falha de conexão ao rodar o lote."); }
    setRodandoLote(false);
  };

  const total = fila.length;

  // ── HORÁRIOS DE COLETA POR LABORATÓRIO ──────────────────────────────────────────────────
  // A grade é de meia em meia hora porque é assim que a cron bate. Oferecer um campo livre
  // deixaria alguém digitar 09:20, que nunca dispararia — e o laboratório ficaria sem aviso
  // em silêncio, que é o pior jeito de uma configuração falhar.
  const GRADE: string[] = [];
  for (let h = 7; h <= 19; h++) { GRADE.push(`${String(h).padStart(2, "0")}:00`); GRADE.push(`${String(h).padStart(2, "0")}:30`); }

  const ModalHorarios = () => {
    if (!verHorarios) return null;
    // O fundo usa `fundoDeModal`, e não um onClick cru: arrastar para selecionar texto começa
    // DENTRO do miolo e termina fora, e o navegador dispara o clique no fundo — o modal fechava
    // no meio da seleção (Cintia, 09/09/2026). O helper exige que o clique tenha COMEÇADO ali.
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(1,77,94,.35)" }} {...fundoDeModal(() => setVerHorarios(false))}>
        <div className="w-full max-w-2xl rounded-2xl my-8" style={{ background: "#fff", border: `1px solid ${LINE}` }} onClick={(ev) => ev.stopPropagation()}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${LINE}` }}>
            <div className="text-[14px] font-bold" style={{ color: NAVY }}>⏰ Horários de coleta</div>
            <button onClick={() => setVerHorarios(false)} className="ml-auto text-[12px] px-2 py-1 rounded-md border" style={{ borderColor: LINE, color: MUT }}>fechar</button>
          </div>
          <div className="px-4 py-3 text-[11.5px]" style={{ color: MUT }}>
            Cada laboratório é avisado no horário dele. Quem não tiver horário marcado segue no padrão da casa — <b>11:30 e 17:00</b>.
          </div>
          {/* Rolagem AQUI dentro, não na página: com muitos laboratórios a lista precisa caber
              sem empurrar o botão de fechar para fora da tela. */}
          <div className="px-4 pb-4 flex flex-col gap-3" style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {labs.length === 0 ? (
              <div className="text-[12px] py-6 text-center" style={{ color: MUT }}>Nenhum laboratório ativo cadastrado em Fornecedores.</div>
            ) : labs.map((l: any) => (
              <div key={l.fornecedorId} className="rounded-xl p-3" style={{ border: `1px solid ${LINE}`, background: "#FBF9F4" }}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[12.5px] font-bold" style={{ color: NAVY }}>{l.nome}</span>
                  {!l.telefone ? <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: "#FBE4E2", color: "#b23b3b" }}>sem WhatsApp</span> : null}
                  {l.padrao ? <span className="text-[10px] rounded px-1.5 py-0.5" style={{ background: "#F1EEE6", color: MUT }}>usando o padrão</span> : null}
                  {salvandoLab === l.fornecedorId ? <span className="text-[10px]" style={{ color: TEAL }}>salvando…</span> : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  {GRADE.map((h) => {
                    const marcado = (l.horarios || []).includes(h) && !l.padrao;
                    return (
                      <button
                        key={h}
                        onClick={() => alternarHorario(l, h)}
                        className="text-[10.5px] font-semibold rounded-md px-1.5 py-0.5 border"
                        style={marcado
                          ? { borderColor: TEAL, background: "#E6F4F5", color: NAVY }
                          : { borderColor: LINE, background: "#fff", color: MUT }}
                      >{h}</button>
                    );
                  })}
                </div>
                {!l.padrao ? (
                  <button onClick={() => salvarHorarios(l.fornecedorId, [])} className="mt-2 text-[10.5px] underline" style={{ color: MUT }}>voltar ao padrão (11:30 e 17:00)</button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const Card = ({ e, ultima }: { e: any; ultima: boolean }) => {
    const cor = labColor(e.fornecedorNome);
    // ATRASADO FICA DE OUTRA COR (Cintia, 12/09/2026: "o box pode ficar de outra cor para
    // mostrar que esta atrasado"). Quem decide e o servidor (exames.regras.atrasoDoExame), o
    // mesmo calculo do aviso que vai pros veterinarios — duas contas dariam duas verdades
    // sobre o mesmo exame.
    //
    // A cor NAO substitui o rotulo: cor sozinha nao se le em tela ruim, nem por quem nao
    // distingue vermelho. Por isso vem com o texto dizendo quantos dias.
    const atrasado = !!e.atraso?.atrasado;
    const VERMELHO = "#b23b3b";

    return (
      <div
        draggable
        onDragStart={() => setDragId(e.itemId)}
        onDragEnd={() => { setDragId(null); setOver(null); }}
        className="rounded-xl p-2.5 cursor-grab active:cursor-grabbing"
        style={{
          background: atrasado ? "#FDF3F2" : "#fff",
          border: `1px solid ${atrasado ? "#F0C9C7" : LINE}`,
          borderLeft: `4px solid ${atrasado ? VERMELHO : cor}`,
          boxShadow: "0 1px 2px rgba(1,77,94,.05)",
        }}
      >
        <div className="text-[13px] font-bold" style={{ color: atrasado ? VERMELHO : NAVY }}>{e.nome}</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: MUT }}>{e.petNome}{e.tutorNome ? ` · ${e.tutorNome}` : ""}</div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {e.fornecedorNome ? <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: cor + "1A", color: cor }}>{e.fornecedorNome}</span> : <span className="text-[10px] rounded px-1.5 py-0.5" style={{ background: "#F1EEE6", color: MUT }}>sem lab</span>}
          {e.date ? <span className="text-[10.5px]" style={{ color: MUT }}>{dt(e.date)}</span> : null}
          {e.labAvisadoAt ? <span className="text-[10px] font-bold" style={{ color: "#0F6E56" }}>🔔 avisado</span> : null}
          {/* Quem já sabe do laudo: sem isto, a equipe reavisa o mesmo cliente sem saber. */}
          {e.clienteAvisadoAt ? <span className="text-[10px] font-bold" style={{ color: "#6A4FB0" }}>📨 cliente avisado</span> : null}
          {atrasado ? (
            <span
              className="text-[10px] font-bold rounded px-1.5 py-0.5"
              style={{ background: "#FBE4E2", color: VERMELHO }}
              title={e.atraso?.estimado
                ? `Este exame nao tem prazo cadastrado — contado pelo padrao de ${e.atraso?.prazoDias} dias.`
                : `O laboratorio prometeu em ${e.atraso?.prazoDias} dia(s).`}
            >
              ⏰ {e.atraso?.dias} dia(s) do prazo{e.atraso?.estimado ? " ·estimado" : ""}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Link href={`/dashboard/erp/pets/${e.petId}`} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border" style={{ borderColor: LINE, color: MUT }}>Abrir ficha</Link>
          {podeAvisarLab({ status: e.status, fornecedorId: e.fornecedorId || e.fornecedorNome, labAvisadoAt: e.labAvisadoAt }) ? (
            <button onClick={() => avisarLab(e)} disabled={avisando === e.itemId} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border" style={{ borderColor: "#6A4FB0", color: "#6A4FB0", background: "#F3EFFB" }}>{avisando === e.itemId ? "enviando…" : "📲 Solicitar ao lab"}</button>
          ) : null}
          {/* O laudo já anexado vira um link, no lugar do botão: o vet precisa CONFERIR o que
              subiu antes de avisar o cliente, e sem isto ele teria de abrir a ficha para ver. */}
          {/* CADA LAUDO É UM LINK, e o botão de anexar NUNCA some (Cintia, 15/09/2026: "em alguns
              momentos eu preciso adicionar mais de um laudo"). Antes, o primeiro anexo trocava o
              botão por um link — e não havia por onde subir o segundo. */}
          {(e.laudos || []).map((l: any, i: number) => (
            <a
              key={l.url || i}
              href={`/api/media/ver?u=${encodeURIComponent(l.url)}`}
              target="_blank"
              rel="noopener"
              title={l.arquivo || "laudo"}
              className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border"
              style={{ borderColor: "#0F6E56", color: "#0F6E56" }}
            >📄 laudo{(e.laudos || []).length > 1 ? ` ${i + 1}` : ""}</a>
          ))}
          <label title="Subir o PDF/foto do laudo — salva na ficha do pet e move para Resultado" className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-md border cursor-pointer ${mexendo === e.itemId ? "opacity-60" : ""}`} style={{ borderColor: "#009AAC", color: "#fff", background: "#009AAC" }}>
            {mexendo === e.itemId ? "enviando…" : (e.laudos || []).length ? "📎 + laudo" : "📎 Anexar laudo"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx"
              disabled={mexendo === e.itemId}
              onChange={(ev) => { const f = ev.target.files?.[0]; ev.target.value = ""; if (f) anexarLaudo(e, f); }}
            />
          </label>
          {e.podeAvisarCliente ? (
            <button onClick={() => avisarCliente(e)} disabled={mexendo === e.itemId} title="O aviso automático não saiu — mandar agora" className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border" style={{ borderColor: "#6A4FB0", color: "#6A4FB0", background: "#F3EFFB" }}>
              {mexendo === e.itemId ? "enviando…" : "📲 Avisar cliente"}
            </button>
          ) : null}
          {ultima ? <button onClick={() => mover(e.itemId, lastFase)} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border" style={{ borderColor: "#0F6E56", color: "#0F6E56" }}>✓ {lastFase}</button> : null}
          <button onClick={() => arquivar(e)} title="Tirar do quadro (fica arquivado 45 dias)" className="ml-auto text-[11px] px-1.5 py-0.5 rounded-md border" style={{ borderColor: LINE, color: MUT }}>🗃️</button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <ModalHorarios />
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="text-[13px]" style={{ color: MUT }}><b style={{ color: NAVY }}>{total}</b> exame(s) em andamento</div>
        <span className="text-[11.5px]" style={{ color: MUT }}>· arraste o card entre as fases · <b>{lastFase}</b> tira do quadro</span>
        {arquivados.length > 0 ? (
          <button onClick={() => setVerArquivo((v) => !v)} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md border" style={{ borderColor: LINE, color: MUT, background: verArquivo ? "#EFEADF" : "#fff" }}>
            🗃️ Arquivados ({arquivados.length})
          </button>
        ) : null}
        <button onClick={rodarLote} disabled={rodandoLote} className="ml-auto text-[11.5px] font-semibold px-2.5 py-1 rounded-md border" style={{ borderColor: "#6A4FB0", color: "#6A4FB0", background: "#F3EFFB" }}>{rodandoLote ? "enviando…" : "📲 Enviar lote agora"}</button>
        {/* As fases moram na lista `exame_fases`, editada em Configurações › Listas. Este botão
            apontava para Configurações › Exames, que cadastra laboratórios e exames e NÃO tem
            editor de fases — mandava a pessoa procurar um controle que não existe ali. */}
        <button onClick={() => { setVerHorarios(true); carregarLabs(); }} className="text-[11.5px] font-semibold px-2.5 py-1 rounded-md border" style={{ borderColor: LINE, color: MUT }}>⏰ Horários de coleta</button>
        <Link href="/dashboard/configuracoes/listas" className="text-[11.5px] font-semibold" style={{ color: TEAL }}>⚙️ Configurar fases</Link>
      </div>

      {/* A GAVETA DOS ARQUIVADOS. Sem ela, "reversível" era só uma palavra: ninguém desfaz o que
          não consegue encontrar. Mostra o prazo que falta em cada card, para o arquivo não virar
          um lugar onde as coisas somem sem aviso. */}
      {verArquivo && arquivados.length > 0 ? (
        <div className="mb-4 rounded-2xl p-3" style={{ background: "#F7F4EC", border: `1px solid ${LINE}` }}>
          <div className="text-[12px] font-bold mb-2" style={{ color: NAVY }}>
            🗃️ Fora do quadro — apagados automaticamente 45 dias depois de arquivados
          </div>
          <div className="flex flex-col gap-1.5">
            {arquivados.map((a: any) => (
              <div key={a.itemId} className="flex items-center gap-2 flex-wrap rounded-lg px-2.5 py-1.5 bg-white" style={{ border: `1px solid ${LINE}` }}>
                <span className="text-[12px] font-semibold" style={{ color: NAVY }}>{a.nome}</span>
                <span className="text-[11.5px]" style={{ color: MUT }}>{a.petNome}{a.tutorNome ? ` · ${a.tutorNome}` : ""}</span>
                {a.status ? <span className="text-[10px] rounded px-1.5 py-0.5" style={{ background: "#F1EEE6", color: MUT }}>{a.status}</span> : null}
                <span className="text-[10.5px]" style={{ color: a.diasParaApagar <= 7 ? "#b23b3b" : MUT }}>
                  arquivado {dt(a.arquivadoEm)} · apaga em {a.diasParaApagar} dia(s)
                </span>
                <button onClick={() => restaurar(a)} disabled={mexendo === a.itemId} className="ml-auto text-[10.5px] font-semibold px-2 py-0.5 rounded-md border" style={{ borderColor: "#0F6E56", color: "#0F6E56" }}>
                  {mexendo === a.itemId ? "…" : "↩️ Restaurar"}
                </button>
                {isAdmin ? (
                  <button onClick={() => apagarDeVez(a)} disabled={mexendo === a.itemId} title="Apagar definitivamente (só adm)" className="text-[10.5px] px-1.5 py-0.5 rounded-md border" style={{ borderColor: LINE, color: "#b23b3b" }}>🗑️</button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: MUT }}>Carregando…</div>
      ) : (
        <div className="grid gap-3 pb-3" style={{ minHeight: "60vh", gridTemplateColumns: `repeat(${Math.max(1, colunas.length)}, minmax(0, 1fr))` }}>
          {colunas.map((col, ci) => {
            const ativa = over === col;
            return (
              <div
                key={col}
                onDragOver={(ev) => { ev.preventDefault(); if (over !== col) setOver(col); }}
                onDragLeave={() => setOver((o) => (o === col ? null : o))}
                onDrop={() => { if (dragId) mover(dragId, col); setDragId(null); setOver(null); }}
                className="flex flex-col rounded-2xl min-w-0"
                style={{ background: ativa ? "#E6F4F5" : "#EFEADF", border: `1px solid ${ativa ? TEAL : LINE}` }}
              >
                <div className="px-3 py-2.5 text-[12px] font-bold flex items-center gap-2" style={{ color: NAVY, borderBottom: `1px solid ${LINE}` }}>
                  <span className="truncate">{col}</span>
                  <span className="ml-auto text-[11px] font-semibold rounded-full px-2 py-0.5 bg-white" style={{ color: MUT, border: `1px solid ${LINE}` }}>{porColuna[ci]?.length || 0}</span>
                </div>
                <div className="p-2 flex flex-col gap-2 flex-1">
                  {(porColuna[ci] || []).map((e: any) => <Card key={e.itemId} e={e} ultima={ci === colunas.length - 1} />)}
                  {(porColuna[ci] || []).length === 0 ? <div className="text-[11px] text-center py-6" style={{ color: "#B7AE99" }}>—</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

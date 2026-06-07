"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · versão Cintia + Claude (Cowork)   [EMP-COWORK]
   Tela........: Perfis e Permissões  (configuracoes/permissoes)
   Atualizado..: 06/06/2026 — Cintia + Claude
   ✔ Salvar SEMPRE no main (é a versão que publica).
   ✔ Backup periódico ativo.
   ⚠ NÃO sobrescrever por "Add files via upload".
     Toda mudança = commit pequeno e direto. Em dúvida, perguntar.
   ─────────────────────────────────────────────────────────────
   ETAPA 1 (atualizada 07/06 c/ Financeiro+Marketing+IA): tela + persistência (em /api/listas). NÃO está ligada
   ao menu nem bloqueia acesso ainda — isso é a Etapa 2/3.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import Link from "next/link";
import { LuArrowLeft, LuPlus, LuTrash, LuCheck } from "react-icons/lu";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";

const LISTA_PERFIS = "perfis_acesso";
const LISTA_PERM = "permissoes_acesso";

const TELAS: { key: string; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "dashboard", label: "Dashboard" },
  { key: "inbox", label: "Inbox BC" },
  { key: "inbox-nativo", label: "Inbox Meta" },
  { key: "leads", label: "Leads" },
  { key: "tutores", label: "Tutores" },
  { key: "pets", label: "Pets" },
  { key: "agendamentos", label: "Calendário" },
  { key: "internacao", label: "Internação" },
  { key: "financeiro", label: "Financeiro (Fin. Terceiros)" },
  { key: "mkt-funil", label: "Marketing · Funil Semana" },
  { key: "mkt-nps", label: "Marketing · NPS" },
  { key: "mkt-google", label: "Marketing · Aval. Google" },
  { key: "mkt-campanhas", label: "Marketing · Campanhas" },
  { key: "mkt-midia", label: "Marketing · Mídia" },
  { key: "mkt-emails", label: "Marketing · Emails" },
  { key: "ia", label: "IA / Atendimento" },
  { key: "configuracoes", label: "Configurações" },
];

const NIVEIS = ["OCULTO", "VISUALIZA", "EDITA"] as const;
type Nivel = (typeof NIVEIS)[number];
const NIVEL_LABEL: Record<Nivel, string> = { OCULTO: "Oculto", VISUALIZA: "Visualiza", EDITA: "Edita" };
const PERFIS_SISTEMA = ["Admin", "Veterinário", "Recepção"];

function matrizPadrao(perfil: string): Record<string, Nivel> {
  const m: Record<string, Nivel> = {};
  for (const t of TELAS) m[t.key] = "OCULTO";
  if (perfil === "Admin") {
    for (const t of TELAS) m[t.key] = "EDITA";
    m["internacao"] = "VISUALIZA";
  } else if (perfil === "Veterinário") {
    ["hoje", "dashboard", "inbox", "inbox-nativo", "tutores", "pets", "agendamentos"].forEach(k => (m[k] = "EDITA"));
    m["internacao"] = "EDITA";
  } else if (perfil === "Recepção") {
    ["hoje", "dashboard", "inbox", "inbox-nativo", "leads", "tutores", "pets", "agendamentos"].forEach(k => (m[k] = "EDITA"));
    m["internacao"] = "VISUALIZA";
  }
  return m;
}

interface ListaItem { id: string; lista: string; valor: string; ordem?: number; ativo?: boolean; }
interface Perfil { id: string; nome: string; sistema: boolean; }

const COR_NIVEL: Record<Nivel, { bg: string; fg: string }> = {
  OCULTO: { bg: "#F1EFE8", fg: "#5F5E5A" },
  VISUALIZA: { bg: "#E6F1FB", fg: "#0C447C" },
  EDITA: { bg: "#E1F5EE", fg: "#0F6E56" },
};

export default function PermissoesPage() {
  usePageTitle("Perfis e Permissões", "Defina o que cada perfil enxerga e edita em cada tela (Etapa 1 — ainda não bloqueia)");
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [matrizes, setMatrizes] = useState<Record<string, Record<string, Nivel>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // id do ListaItem de permissões por nome de perfil (pra PATCH)
  const [permIds, setPermIds] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const all: ListaItem[] = await fetch("/api/listas?includeInactive=true", { cache: "no-store" }).then(r => r.json()).then(d => (Array.isArray(d) ? d : []));
      let perfilItems = all.filter(i => i.lista === LISTA_PERFIS);
      let permItems = all.filter(i => i.lista === LISTA_PERM);

      // Primeira vez: semear os 3 perfis do sistema + matriz padrão
      if (perfilItems.length === 0) {
        await semear();
        const all2: ListaItem[] = await fetch("/api/listas?includeInactive=true", { cache: "no-store" }).then(r => r.json()).then(d => (Array.isArray(d) ? d : []));
        perfilItems = all2.filter(i => i.lista === LISTA_PERFIS);
        permItems = all2.filter(i => i.lista === LISTA_PERM);
      }

      const ps: Perfil[] = perfilItems.map(i => {
        let nome = i.valor, sistema = false;
        try { const o = JSON.parse(i.valor); nome = o.nome; sistema = !!o.sistema; } catch { nome = i.valor; sistema = PERFIS_SISTEMA.includes(i.valor); }
        return { id: i.id, nome, sistema };
      }).sort((a, b) => Number(b.sistema) - Number(a.sistema));

      const mz: Record<string, Record<string, Nivel>> = {};
      const ids: Record<string, string> = {};
      for (const p of ps) {
        const row = permItems.find(i => { try { return JSON.parse(i.valor).perfil === p.nome; } catch { return false; } });
        if (row) { ids[p.nome] = row.id; try { mz[p.nome] = { ...matrizPadrao(p.nome), ...JSON.parse(row.valor).matriz }; } catch { mz[p.nome] = matrizPadrao(p.nome); } }
        else mz[p.nome] = matrizPadrao(p.nome);
      }
      setPerfis(ps); setMatrizes(mz); setPermIds(ids); setDirty(false);
    } catch (e) { toast.error("Erro ao carregar permissões"); }
    finally { setLoading(false); }
  }

  async function semear() {
    let ordem = 0;
    for (const nome of PERFIS_SISTEMA) {
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA_PERFIS, valor: JSON.stringify({ nome, sistema: true }), ordem: ordem++ }) });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA_PERM, valor: JSON.stringify({ perfil: nome, matriz: matrizPadrao(nome) }) }) });
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function setNivel(perfil: string, tela: string, nivel: Nivel) {
    setMatrizes(prev => ({ ...prev, [perfil]: { ...prev[perfil], [tela]: nivel } }));
    setDirty(true);
  }

  async function novoPerfil() {
    const nome = window.prompt("Nome do novo perfil (ex: Financeiro, Estagiário):");
    if (!nome || !nome.trim()) return;
    const n = nome.trim();
    if (perfis.some(p => p.nome.toLowerCase() === n.toLowerCase())) { toast.error("Já existe um perfil com esse nome"); return; }
    try {
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA_PERFIS, valor: JSON.stringify({ nome: n, sistema: false }), ordem: perfis.length }) });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA_PERM, valor: JSON.stringify({ perfil: n, matriz: matrizPadrao(n) }) }) });
      toast.success(`Perfil "${n}" criado`);
      await load();
    } catch { toast.error("Erro ao criar perfil"); }
  }

  async function removerPerfil(p: Perfil) {
    if (p.sistema) { toast.error("Perfil do sistema não pode ser excluído"); return; }
    if (!window.confirm(`Excluir o perfil "${p.nome}"?`)) return;
    try {
      await fetch(`/api/listas/${p.id}`, { method: "DELETE" });
      if (permIds[p.nome]) await fetch(`/api/listas/${permIds[p.nome]}`, { method: "DELETE" });
      toast.success("Perfil excluído");
      await load();
    } catch { toast.error("Erro ao excluir"); }
  }

  async function salvar() {
    setSaving(true);
    try {
      for (const p of perfis) {
        const payload = { valor: JSON.stringify({ perfil: p.nome, matriz: matrizes[p.nome] }) };
        if (permIds[p.nome]) {
          await fetch(`/api/listas/${permIds[p.nome]}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        } else {
          await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA_PERM, ...payload }) });
        }
      }
      toast.success("Permissões salvas");
      setDirty(false);
      await load();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Perfis e Permissões</h1>
            <p className="text-sm text-gray-500">Defina o que cada perfil enxerga e edita em cada tela. <span style={{ color: "#B45309" }}>Etapa 1: ainda não bloqueia o acesso.</span></p>
          </div>
          <button onClick={novoPerfil} className="px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2" style={{ borderColor: "#009AAC", color: "#009AAC", background: "white" }}>
            <LuPlus size={14} /> Novo perfil
          </button>
          <button onClick={salvar} disabled={!dirty || saving} className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white disabled:opacity-50" style={{ background: "#009AAC" }}>
            <LuCheck size={14} /> {saving ? "Salvando..." : "Salvar permissões"}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="text-sm text-gray-500 py-10 text-center">Carregando...</div>
        ) : (
          <div className="border rounded-xl overflow-x-auto" style={{ borderColor: "#E8DFC8" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#FAFAFA" }}>
                  <th className="text-left px-4 py-3 font-medium" style={{ color: "#0E2244", minWidth: 160 }}>Tela / área</th>
                  {perfis.map(p => (
                    <th key={p.id} className="px-3 py-3 font-medium text-center" style={{ color: "#0E2244", minWidth: 130 }}>
                      <div className="flex items-center justify-center gap-1.5">
                        <span>{p.nome}</span>
                        {p.sistema
                          ? <span className="text-[9px] uppercase px-1.5 py-0.5 rounded" style={{ background: "#EEEDFE", color: "#534AB7" }}>sistema</span>
                          : <button onClick={() => removerPerfil(p)} title="Excluir perfil" className="text-gray-400 hover:text-red-500"><LuTrash size={13} /></button>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TELAS.map(tela => (
                  <tr key={tela.key} className="border-t" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-4 py-2.5" style={{ color: "#0E2244" }}>{tela.label}</td>
                    {perfis.map(p => {
                      const nivel = (matrizes[p.nome]?.[tela.key] || "OCULTO") as Nivel;
                      const cor = COR_NIVEL[nivel];
                      return (
                        <td key={p.id} className="px-3 py-2.5 text-center">
                          <select
                            value={nivel}
                            onChange={e => setNivel(p.nome, tela.key, e.target.value as Nivel)}
                            className="px-2 py-1 rounded-md text-xs border-0 font-medium cursor-pointer"
                            style={{ background: cor.bg, color: cor.fg }}
                          >
                            {NIVEIS.map(n => <option key={n} value={n}>{NIVEL_LABEL[n]}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-4">
          Níveis: <strong>Oculto</strong> (não aparece) · <strong>Visualiza</strong> (só leitura) · <strong>Edita</strong> (pode alterar).
          Esta tela já salva as definições; ligar no menu e bloquear o acesso são as próximas etapas.
        </p>
      </div>
    </div>
  );
}

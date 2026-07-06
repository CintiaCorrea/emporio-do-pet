"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · Perfis e Permissões  (configuracoes/permissoes)
   Reescrita usando o KIT "Base44 delicada" (@/components/ui/base44)
   e a base compartilhada de telas/chaves (@/lib/permissions).
   A árvore de telas e as chaves (key = href) vêm de lá — não duplicar.
   Persistência: /api/listas (perfis_acesso + permissoes_acesso).
   ───────────────────────────────────────────────────────────── */

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { confirmDelete } from "@/lib/ui/confirmDelete";
import { PageShell, HeaderCard, Card, Btn, Pill, Tabs, Modal, B44 } from "@/components/ui/base44";
import {
  PERM_SECTIONS, PermItem, Nivel, NIVEIS, NIVEL_LABEL,
  LISTA_PERFIS, LISTA_PERM, PERFIS_SISTEMA, LOCKED_KEYS,
  matrizPadrao, nivelDe,
} from "@/lib/permissions";

interface ListaItem { id: string; lista: string; valor: string; ordem?: number; ativo?: boolean; }
interface Perfil { id: string; nome: string; sistema: boolean; }

/* Emoji do tab por perfil (personalizados ficam sem emoji). */
const PERFIL_EMOJI: Record<string, string> = { Admin: "👑", "Veterinário": "🩺", "Recepção": "💁" };
const perfilLabel = (nome: string) => (PERFIL_EMOJI[nome] ? `${PERFIL_EMOJI[nome]} ${nome}` : nome);

/* Rótulos das linhas travadas (não configuráveis). */
const LOCKED_LABEL: Record<string, { emoji: string; label: string }> = {
  "/dashboard/configuracoes": { emoji: "⚙️", label: "Configuração" },
  "/dashboard/configuracoes/permissoes": { emoji: "🔐", label: "Perfis e Permissões" },
};

/* Cor do botão ativo do controle segmentado, por nível. */
const NIVEL_ATIVO: Record<Nivel, { bg: string; fg: string; weight: number }> = {
  OCULTO: { bg: "#F1EFE8", fg: "#5F5E5A", weight: 500 },
  VISUALIZA: { bg: "#E6F1FB", fg: "#0C447C", weight: 500 },
  EDITA: { bg: "#E7F6EE", fg: "#1c7a47", weight: 600 },
};

/* ── Controle segmentado (Oculto / Visualiza / Edita) ─────────── */
function Seg({
  value, onChange, mini = false, label,
}: {
  value: Nivel | null; onChange: (n: Nivel) => void; mini?: boolean; label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {label && <span className="text-[11px]" style={{ color: B44.text3 }}>{label}</span>}
      <div
        className="inline-flex"
        style={{ background: B44.soft, border: `1px solid ${B44.line}`, borderRadius: 10, padding: 3, gap: 2 }}
      >
        {NIVEIS.map((n) => {
          const on = value === n;
          const c = NIVEL_ATIVO[n];
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="transition"
              style={{
                borderRadius: 8,
                padding: mini ? "2px 8px" : "4px 11px",
                fontSize: mini ? 11 : 12,
                fontWeight: on ? c.weight : 500,
                background: on ? c.bg : "transparent",
                color: on ? c.fg : B44.text3,
                whiteSpace: "nowrap",
              }}
            >
              {NIVEL_LABEL[n]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* Nível uniforme de um grupo (ou null se os filhos divergem). */
function nivelGrupo(matriz: Record<string, Nivel>, children: PermItem[]): Nivel | null {
  const first = nivelDe(matriz, children[0].key);
  return children.every((c) => nivelDe(matriz, c.key) === first) ? first : null;
}

export default function PermissoesPage() {
  usePageTitle("Perfis e Permissões", "Escolha, item por item, o que cada perfil enxerga e edita");

  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [matrizes, setMatrizes] = useState<Record<string, Record<string, Nivel>>>({});
  const [permIds, setPermIds] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string>("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function fetchAll(): Promise<ListaItem[]> {
    const d = await fetch("/api/listas?includeInactive=true", { cache: "no-store" }).then((r) => r.json());
    return Array.isArray(d) ? d : [];
  }

  async function semear() {
    let ordem = 0;
    for (const nome of PERFIS_SISTEMA) {
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA_PERFIS, valor: JSON.stringify({ nome, sistema: true }), ordem: ordem++ }) });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA_PERM, valor: JSON.stringify({ perfil: nome, matriz: matrizPadrao(nome) }) }) });
    }
  }

  async function load() {
    setLoading(true);
    try {
      let all = await fetchAll();
      let perfilItems = all.filter((i) => i.lista === LISTA_PERFIS);
      let permItems = all.filter((i) => i.lista === LISTA_PERM);

      if (perfilItems.length === 0) {
        await semear();
        all = await fetchAll();
        perfilItems = all.filter((i) => i.lista === LISTA_PERFIS);
        permItems = all.filter((i) => i.lista === LISTA_PERM);
      }

      const ps: Perfil[] = perfilItems
        .map((i) => {
          let nome = i.valor, sistema = false;
          try { const o = JSON.parse(i.valor); nome = o.nome; sistema = !!o.sistema; }
          catch { nome = i.valor; sistema = PERFIS_SISTEMA.includes(i.valor); }
          return { id: i.id, nome, sistema };
        })
        .sort((a, b) => Number(b.sistema) - Number(a.sistema));

      const mz: Record<string, Record<string, Nivel>> = {};
      const ids: Record<string, string> = {};
      for (const p of ps) {
        const row = permItems.find((i) => { try { return JSON.parse(i.valor).perfil === p.nome; } catch { return false; } });
        if (row) {
          ids[p.nome] = row.id;
          try { mz[p.nome] = { ...matrizPadrao(p.nome), ...JSON.parse(row.valor).matriz }; }
          catch { mz[p.nome] = matrizPadrao(p.nome); }
        } else {
          mz[p.nome] = matrizPadrao(p.nome);
        }
      }

      setPerfis(ps);
      setMatrizes(mz);
      setPermIds(ids);
      setActive((cur) => (cur && ps.some((p) => p.nome === cur) ? cur : ps[0]?.nome || ""));
    } catch {
      toast.error("Erro ao carregar permissões");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function setNivel(perfil: string, key: string, nivel: Nivel) {
    setMatrizes((prev) => ({ ...prev, [perfil]: { ...(prev[perfil] || matrizPadrao(perfil)), [key]: nivel } }));
  }

  function setGrupo(perfil: string, children: PermItem[], nivel: Nivel) {
    setMatrizes((prev) => {
      const base = { ...(prev[perfil] || matrizPadrao(perfil)) };
      for (const c of children) base[c.key] = nivel;
      return { ...prev, [perfil]: base };
    });
  }

  const toggleGroup = (key: string) => setOpenGroups((p) => ({ ...p, [key]: p[key] === undefined ? false : !p[key] }));
  const isOpen = (key: string) => openGroups[key] !== false; // começa aberto

  async function novoPerfil() {
    const nome = window.prompt("Nome do novo perfil (ex: Financeiro, Estagiário):");
    if (!nome || !nome.trim()) return;
    const n = nome.trim();
    if (perfis.some((p) => p.nome.toLowerCase() === n.toLowerCase())) { toast.error("Já existe um perfil com esse nome"); return; }
    try {
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA_PERFIS, valor: JSON.stringify({ nome: n, sistema: false }), ordem: perfis.length }) });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA_PERM, valor: JSON.stringify({ perfil: n, matriz: matrizPadrao(n) }) }) });
      toast.success(`Perfil "${n}" criado`);
      setActive(n);
      await load();
    } catch { toast.error("Erro ao criar perfil"); }
  }

  async function removerPerfil(p: Perfil) {
    if (p.sistema) { toast.error("Perfil do sistema não pode ser excluído"); return; }
    if (!(await confirmDelete({ entityLabel: "perfil", itemName: p.nome }))) return;
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
      window.dispatchEvent(new Event("perms:changed")); // menu/guarda atualizam na hora
      await load();
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  const activePerfil = perfis.find((p) => p.nome === active);
  const matriz = matrizes[active] || (active ? matrizPadrao(active) : {});

  /* Uma linha de item (folha) — emoji + label + controle segmentado. */
  const LeafRow = ({ item, indent = false }: { item: PermItem; indent?: boolean }) => (
    <div
      className="flex items-center justify-between gap-3 py-2"
      style={{ paddingLeft: indent ? 26 : 0, borderTop: `1px solid ${B44.lineSoft}` }}
    >
      <span className="text-[13px] flex items-center gap-1.5" style={{ color: indent ? B44.text1 : B44.navy, fontWeight: indent ? 400 : 500 }}>
        <span>{item.emoji}</span>{item.label}
      </span>
      <Seg value={nivelDe(matriz, item.key)} onChange={(n) => setNivel(active, item.key, n)} />
    </div>
  );

  return (
    <PageShell pad="p-6">
      {/* Cabeçalho */}
      <HeaderCard>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-[20px] font-medium flex items-center gap-2" style={{ color: B44.navy }}>
              🔐 Perfis e Permissões
            </h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: B44.text2 }}>
              Escolha, item por item, o que cada perfil enxerga e edita.
            </p>
          </div>
          <Btn variant="primary" onClick={salvar} disabled={saving || loading || !active}>
            ✅ {saving ? "Salvando..." : "Salvar"}
          </Btn>
        </div>
      </HeaderCard>

      {loading ? (
        <p className="text-[13px] py-12 text-center" style={{ color: B44.text3 }}>Carregando…</p>
      ) : (
        <>
          {/* Abas de perfil + Novo perfil */}
          <div className="flex items-end gap-2">
            <div className="flex-1 min-w-0 overflow-x-auto">
              <Tabs
                tabs={perfis.map((p) => ({ k: p.nome, label: perfilLabel(p.nome) }))}
                active={active}
                onChange={setActive}
              />
            </div>
            <Btn variant="ghost" onClick={novoPerfil} className="mb-3" style={{ padding: "6px 10px", fontSize: 11 }}>
              ➕ Novo perfil
            </Btn>
          </div>

          {/* Aviso / trava */}
          <div
            className="flex items-start gap-2 mb-3"
            style={{ background: B44.tint, border: `1px solid ${B44.line}`, borderRadius: 12, padding: "10px 13px" }}
          >
            <span className="text-[15px] leading-none mt-0.5">🛡️</span>
            <p className="text-[12px]" style={{ color: B44.navy }}>
              Editando <b>{active}</b>. Trava: <b>Configuração</b> e <b>Perfis e Permissões</b> ficam sempre visíveis pro Admin.
              No grupo, “todos” define todos os subitens; depois ajuste cada um.
            </p>
          </div>

          {/* Legenda + remover perfil personalizado */}
          <div className="flex items-center justify-between gap-3 mb-3 flex-wrap px-1">
            <div className="flex items-center gap-3 text-[11.5px]" style={{ color: B44.text2 }}>
              <span className="inline-flex items-center gap-1"><span style={{ width: 9, height: 9, borderRadius: 3, background: "#F1EFE8", display: "inline-block" }} /> Oculto</span>
              <span className="inline-flex items-center gap-1"><span style={{ width: 9, height: 9, borderRadius: 3, background: "#E6F1FB", display: "inline-block" }} /> Visualiza</span>
              <span className="inline-flex items-center gap-1"><span style={{ width: 9, height: 9, borderRadius: 3, background: "#E7F6EE", display: "inline-block" }} /> Edita</span>
            </div>
            {activePerfil && !activePerfil.sistema && (
              <Btn variant="danger" onClick={() => removerPerfil(activePerfil)} style={{ padding: "6px 10px", fontSize: 11 }}>
                🗑️ Remover “{activePerfil.nome}”
              </Btn>
            )}
          </div>

          {/* Seções */}
          <div className="space-y-3">
            {PERM_SECTIONS.map((sec) => (
              <Card key={sec.titulo} title={sec.titulo} emoji={sec.emoji}>
                {sec.itens.map((item) => {
                  if (item.children && item.children.length) {
                    const open = isOpen(item.key);
                    return (
                      <div key={item.key}>
                        {/* Cabeçalho do grupo */}
                        <div className="flex items-center justify-between gap-3 py-2" style={{ borderTop: `1px solid ${B44.lineSoft}` }}>
                          <button type="button" onClick={() => toggleGroup(item.key)} className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: B44.navy }}>
                            <span className="text-[11px]" style={{ color: B44.text3 }}>{open ? "▾" : "▸"}</span>
                            <span>{item.emoji}</span>{item.label}
                          </button>
                          <Seg mini label="todos:" value={nivelGrupo(matriz, item.children)} onChange={(n) => setGrupo(active, item.children!, n)} />
                        </div>
                        {/* Filhos */}
                        {open && item.children.map((c) => <LeafRow key={c.key} item={c} indent />)}
                      </div>
                    );
                  }
                  return <LeafRow key={item.key} item={item} />;
                })}

                {/* Linhas travadas — só na seção Sistema */}
                {sec.titulo === "Sistema" && LOCKED_KEYS.map((k) => {
                  const l = LOCKED_LABEL[k];
                  return (
                    <div key={k} className="flex items-center justify-between gap-3 py-2" style={{ borderTop: `1px solid ${B44.lineSoft}` }}>
                      <span className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: B44.navy }}>
                        <span>{l?.emoji}</span>{l?.label || k}
                      </span>
                      <Pill tone="navy">🔒 sempre visível p/ Admin</Pill>
                    </div>
                  );
                })}
              </Card>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}

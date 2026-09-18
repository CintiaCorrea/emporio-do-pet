"use client";
import { useEffect, useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { LuArrowLeft, LuCopy, LuTrash2, LuRefreshCw, LuChevronDown, LuTriangleAlert } from "react-icons/lu";
import toast from "react-hot-toast";
import { mesmoValor } from "@/lib/mesmoCadastro";
import { fmtDataBR } from "@/lib/datas";

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
const last8 = (s: string) => onlyDigits(s).slice(-8);
function normalizePhone(raw: string): string {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.length === 13 && d.startsWith("55")) return d;
  if (d.length === 11) return "55" + d;
  if (d.length === 10) return "55" + d.slice(0, 2) + "9" + d.slice(2);
  return d;
}
const toISO = (s: string) => {
  const v = (s || "").trim(); if (!v) return undefined;
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // DD/MM/AAAA (digitado no form público)
  try {
    if (br) return new Date(`${br[3]}-${br[2]}-${br[1]}T12:00:00`).toISOString();
    return new Date(v.length <= 10 ? v + "T12:00:00" : v).toISOString();
  } catch { return undefined; }
};

/**
 * O QUE SE COMPARA para decidir se é a mesma pessoa.
 *
 * O telefone não entra: foi ele que levantou a suspeita, então aparecer igual não informa nada.
 * O que decide é o resto — CPF é o mais forte, e-mail vem logo depois, e os pets costumam ser o
 * que a recepção reconhece primeiro ("ah, esse é o Beagle da Thais").
 *
 * COMO se compara mora em lib/mesmoCadastro (com teste) — aqui fica só O QUE se compara.
 */
const COMPARAR: { rotulo: string; novo: (s: any) => string; velho: (t: any) => string; modo?: "lista" }[] = [
  { rotulo: "CPF", novo: (s) => s.tutor?.cpf || "", velho: (t) => t?.cpf || t?.document || t?.cpfCnpj || "" },
  { rotulo: "E-mail", novo: (s) => s.tutor?.email || "", velho: (t) => t?.email || "" },
  // fmtDataBR (lib/datas) e nao new Date(): nascimento e' gravado a meia-noite UTC e, lido no fuso
  // do Brasil, virava o dia anterior — a ficha dizia 29/08, o cadastro antigo 28/08, e o ✓ nunca batia.
  { rotulo: "Nascimento", novo: (s) => s.tutor?.birthDate || "", velho: (t) => fmtDataBR(t?.birthDate) },
  { rotulo: "Endereço", novo: (s) => s.tutor?.address || "", velho: (t) => [t?.street, t?.number, t?.neighborhood].filter(Boolean).join(", ") || t?.address || "" },
  { rotulo: "Pets", novo: (s) => s.pet?.name || "", velho: (t) => (t?.pets || []).map((p: any) => p.name).join(", "), modo: "lista" },
];

interface Sub { _id: string; status?: string; receivedAt?: string; tutor: any; pet: any; dupNome?: string | null; dupId?: string | null; dup?: any; parcial?: string }

export default function CadastrosRecebidosPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [linkBase, setLinkBase] = useState("");

  useEffect(() => { try { setLinkBase(window.location.origin); } catch {} }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/listas?lista=cadastro_publico", { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      const parsed: Sub[] = arr.map((i: any) => { try { return { _id: i.id, ...JSON.parse(i.valor) }; } catch { return null; } }).filter(Boolean);
      parsed.sort((a, b) => String(b.receivedAt || "").localeCompare(String(a.receivedAt || "")));
      // Anti-duplicidade: procura cliente existente pelo telefone (últimos 8 dígitos).
      await Promise.all(parsed.map(async (s) => {
        const tel = last8(s.tutor?.phone || "");
        if (tel.length < 8) return;
        try {
          const rr = await fetch(`/api/tutors?search=${encodeURIComponent(tel)}&limit=5`, { cache: "no-store" });
          const dd = await rr.json();
          const ts = Array.isArray(dd) ? dd : (dd.tutors || dd.data || []);
          const hit = ts.find((t: any) => (t.contacts || []).some((c: any) => last8(c.number || c.value || "") === tel) || last8(t.phone || "") === tel);
          // GUARDA O CLIENTE INTEIRO, e não só o nome. Cintia, 15/09/2026: "quando houver a
          // possibilidade de parecer com algum outro cadastro que já temos, pode trazer as
          // informações para checarmos direto na tela e confirmar ou não se é a mesma pessoa".
          //
          // Só o nome obrigava a abrir a ficha do outro cliente numa aba, comparar de cabeça e
          // voltar — e é aí que nasce o cliente duplicado: no meio do caminho, no susto.
          if (hit) { s.dupNome = hit.name || "cliente existente"; s.dupId = hit.id; s.dup = hit; }
        } catch {}
      }));
      setSubs(parsed);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const [busy, setBusy] = useState<string | null>(null); // _id em processamento
  const [buscaVinc, setBuscaVinc] = useState<Record<string, string>>({}); // busca de cliente por submissão
  const [resVinc, setResVinc] = useState<Record<string, any[]>>({});

  // NADA SE APAGA ANTES DE A GRAVAÇÃO SER CONFIRMADA (18/09/2026).
  //
  // Esta função terminava em `.catch(() => null)` e ninguém olhava o resultado: quem aprovava
  // via "Cliente criado! 🎉", a ficha recebida era apagada do mesmo jeito, e o pet que o cliente
  // preencheu sumia para sempre — sem deixar rastro de que tinha existido.
  //
  // Agora ela RESPONDE. Quem chama decide, e o combinado é: pet que não gravou = ficha recebida
  // continua na tela.
  async function criarPetSe(s: Sub, tutorId: string): Promise<{ ok: boolean; motivo?: string }> {
    if (!s.pet?.name?.trim()) return { ok: true }; // não veio pet: nada a gravar, nada a perder
    const petBirth = toISO(s.pet.birthDate);
    const body: any = {
      tutorId, name: s.pet.name.trim(),
      species: s.pet.species || undefined,
      breed: s.pet.breed?.trim() || undefined,
      weight: s.pet.weight ? Number(String(s.pet.weight).replace(",", ".")) || undefined : undefined,
      birthDate: petBirth,
      observations: (!petBirth && s.pet.age?.trim()) ? `Idade informada no cadastro: ${s.pet.age.trim()}` : undefined,
    };
    try {
      const r = await fetch("/api/pets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (r.ok) return { ok: true };
      const err = await r.json().catch(() => null);
      const msg = err?.message ? (Array.isArray(err.message) ? err.message.join(" ") : err.message) : err?.error;
      return { ok: false, motivo: String(msg || `erro ${r.status}`) };
    } catch { return { ok: false, motivo: "sem conexão" }; }
  }

  /** Tira a ficha recebida da fila. Só some da tela se o servidor confirmar que apagou. */
  async function limparSub(id: string): Promise<boolean> {
    try {
      const r = await fetch(`/api/listas/${id}`, { method: "DELETE" });
      if (!r.ok) return false;
      setSubs((s) => s.filter((x) => x._id !== id));
      return true;
    } catch { return false; }
  }

  // UTM → registra na ficha (como nota) de qual campanha o cadastro veio, quando o link do formulário tinha utm_*.
  async function registrarOrigem(tutorId: string, origem: any) {
    if (!origem) return;
    const partes: string[] = [];
    if (origem.utmCampaign) partes.push(`campanha "${origem.utmCampaign}"`);
    if (origem.utmSource) partes.push(`fonte ${origem.utmSource}`);
    if (origem.utmMedium) partes.push(`meio ${origem.utmMedium}`);
    if (origem.utmContent) partes.push(`anúncio ${origem.utmContent}`);
    if (!partes.length && !origem.referrer) return; // sem UTM nem referência → nada a registrar
    const texto = `🎯 Origem do cadastro (formulário público): ${partes.join(" · ") || "sem UTM"}${origem.referrer ? ` · veio de ${origem.referrer}` : ""}`;
    try { await fetch("/api/interacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId, tipo: "NOTA", canal: "Formulário", texto }) }); } catch {}
  }

  // APROVAR: cria um cliente novo + pet a partir da submissão.
  async function aprovar(s: Sub) {
    if (!s.tutor?.name?.trim()) { toast.error("Cadastro sem nome — não dá pra aprovar."); return; }
    setBusy(s._id);
    try {
      const phone = normalizePhone(s.tutor.phone || "");
      const body: any = {
        name: s.tutor.name.trim(),
        email: s.tutor.email?.trim() || undefined,
        cpf: onlyDigits(s.tutor.cpf || "") || undefined,
        birthDate: toISO(s.tutor.birthDate),
        cep: onlyDigits(s.tutor.cep || "") || undefined,
        address: s.tutor.address?.trim() || undefined,
        howFoundUs: s.tutor.howFoundUs?.trim() || undefined,
        classificacao: "Cliente",
      };
      if (phone && phone.length >= 12) body.contacts = [{ number: phone, isPrimary: true, isWhatsApp: true }];
      const r = await fetch("/api/tutors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const novo = await r.json().catch(() => null);
      if (!r.ok || !novo?.id) { const msg = novo?.message ? (Array.isArray(novo.message) ? novo.message.join(" ") : novo.message) : `Erro (${r.status})`; toast.error(msg); setBusy(null); return; }

      // O CLIENTE JÁ EXISTE daqui pra baixo. Se o pet falhar, a ficha recebida NÃO se apaga — mas
      // também não pode ficar oferecendo "Aprovar" de novo, senão a próxima tentativa cria um
      // cliente repetido. Então ela passa a apontar para o cliente recém-criado, e o caminho de
      // completar vira o "Vincular", que só grava o que faltou.
      const pet = await criarPetSe(s, novo.id);
      if (!pet.ok) {
        setSubs((lista) => lista.map((x) => x._id === s._id
          ? { ...x, dupNome: novo.name || s.tutor.name, dupId: novo.id, dup: novo, parcial: `O cliente foi criado, mas o pet não: ${pet.motivo}` }
          : x));
        toast.error(`Cliente criado, mas o pet "${s.pet?.name}" não gravou (${pet.motivo}). A ficha continua aqui — use "Vincular" para tentar só o pet.`, { duration: 9000 });
        return;
      }
      await registrarOrigem(novo.id, (s as any).origem);
      if (!(await limparSub(s._id))) {
        toast.success("Cliente e pet criados — mas não consegui tirar a ficha da fila. Atualize a tela.", { duration: 8000 });
        return;
      }
      toast.success("Cliente criado! 🎉");
    } catch { toast.error("Erro ao aprovar"); } finally { setBusy(null); }
  }

  // VINCULAR: atualiza um cliente existente com os dados que vieram + cria o pet.
  async function vincular(s: Sub, tutorId: string, tutorNome?: string) {
    setBusy(s._id);
    try {
      const patch: any = {};
      const add = (k: string, v: any) => { if (v != null && String(v).trim() !== "") patch[k] = v; };
      add("cpf", onlyDigits(s.tutor.cpf || "") || null); add("email", s.tutor.email?.trim());
      add("cep", onlyDigits(s.tutor.cep || "") || null); add("address", s.tutor.address?.trim());
      add("howFoundUs", s.tutor.howFoundUs?.trim()); const bd = toISO(s.tutor.birthDate); if (bd) patch.birthDate = bd;
      // Mesma regra do aprovar: se a gravação falhar, a ficha recebida fica. O patch também era
      // `.catch(() => null)` — CPF, e-mail e endereço podiam não entrar e a tela dizia "Vinculado ✓".
      if (Object.keys(patch).length) {
        const rp = await fetch(`/api/tutors/${tutorId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => null);
        if (!rp || !rp.ok) {
          const err = rp ? await rp.json().catch(() => null) : null;
          const msg = err?.message ? (Array.isArray(err.message) ? err.message.join(" ") : err.message) : (err?.error || "sem conexão");
          toast.error(`Não consegui atualizar a ficha de ${tutorNome || "cliente"}: ${msg}. Nada foi apagado.`, { duration: 9000 });
          return;
        }
      }
      const pet = await criarPetSe(s, tutorId);
      if (!pet.ok) {
        toast.error(`Ficha atualizada, mas o pet "${s.pet?.name}" não gravou (${pet.motivo}). A ficha recebida continua aqui.`, { duration: 9000 });
        return;
      }
      await registrarOrigem(tutorId, (s as any).origem);
      if (!(await limparSub(s._id))) {
        toast.success("Vinculado — mas não consegui tirar a ficha da fila. Atualize a tela.", { duration: 8000 });
        return;
      }
      toast.success(`Vinculado a ${tutorNome || "cliente"} ✓`);
    } catch { toast.error("Erro ao vincular"); } finally { setBusy(null); }
  }

  async function buscarClientes(id: string, q: string) {
    setBuscaVinc((m) => ({ ...m, [id]: q }));
    if (q.trim().length < 2) { setResVinc((m) => ({ ...m, [id]: [] })); return; }
    try { const r = await fetch(`/api/tutors?search=${encodeURIComponent(q.trim())}&limit=6`, { cache: "no-store" }); const d = await r.json(); const arr = Array.isArray(d) ? d : (d.tutors || d.data || []); setResVinc((m) => ({ ...m, [id]: arr })); } catch {}
  }

  function copiarLink() {
    const url = `${linkBase}/queremos-te-conhecer`;
    navigator.clipboard?.writeText(url).then(() => toast.success("Link copiado!")).catch(() => toast.error("Não consegui copiar"));
  }
  async function descartar(id: string) {
    if (!window.confirm("Descartar este cadastro recebido? Não dá pra desfazer.")) return;
    try { const r = await fetch(`/api/listas/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); toast.success("Descartado"); setSubs((s) => s.filter((x) => x._id !== id)); }
    catch { toast.error("Erro ao descartar"); }
  }

  const card = "bg-white border rounded-xl";
  return (
    <div className="min-h-screen" style={{ background: "#F6F2EA" }}>
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          {/* A tela saiu de Configurações para Clientes em 15/09/2026; a seta tinha ficado para trás. */}
          <Link href="/dashboard/erp/tutores" title="Voltar para Clientes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="flex-1">
            <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>📥 Cadastros recebidos</h1>
            <p className="text-sm text-gray-500">Fichas enviadas pelos clientes pelo link público — revise antes de virar cliente.</p>
          </div>
          <button onClick={load} title="Atualizar" className="p-2 rounded-lg border" style={{ borderColor: "#E8DFC8", color: "#5C6B70" }}><LuRefreshCw size={16} /></button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-4">
        <div className={card + " p-4 mb-4 flex items-center justify-between gap-3 flex-wrap"} style={{ borderColor: "#E8DFC8" }}>
          <div className="text-[13px] text-[#5C6B70]">Envie este link para o cliente preencher (WhatsApp, e-mail, bio…):<br /><span className="text-[12px] text-[#009AAC] font-medium">{linkBase}/queremos-te-conhecer</span></div>
          <button onClick={copiarLink} className="px-3 py-2 rounded-lg text-[13px] text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}><LuCopy size={15} /> Copiar link</button>
        </div>

        {loading ? <div className="text-center text-gray-400 py-10">Carregando…</div>
          : subs.length === 0 ? <div className={card + " p-10 text-center text-gray-400"} style={{ borderColor: "#E8DFC8" }}>Nenhum cadastro recebido ainda.</div>
          : (
            <div className="flex flex-col gap-2">
              {subs.map((s) => (
                <div key={s._id} className={card} style={{ borderColor: "#E8DFC8" }}>
                  <div className="flex items-center gap-3 p-3.5">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0" style={{ background: "#E1F3F5", color: "#014D5E" }}>{(s.tutor?.name || "?").slice(0, 2).toUpperCase()}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-[#0E2244] flex items-center gap-2 flex-wrap">{s.tutor?.name || "Sem nome"}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FBF3E3", color: "#8a6400" }}>🆕 novo</span>
                        {s.parcial
                          ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: "#FBF3E3", color: "#8a6400" }}><LuTriangleAlert size={11} /> falta o pet</span>
                          : s.dupNome && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: "#FCEBEB", color: "#A32D2D" }}><LuTriangleAlert size={11} /> possível duplicado: {s.dupNome}</span>}
                      </div>
                      <div className="text-[12px] text-[#5C6B70]">{s.tutor?.phone || "sem telefone"}{s.pet?.name ? ` · 🐾 ${s.pet.name}` : ""}{s.receivedAt ? ` · ${new Date(s.receivedAt).toLocaleDateString("pt-BR")}` : ""}</div>
                    </div>
                    <button onClick={() => setOpen(open === s._id ? null : s._id)} className="text-[12px] text-[#009AAC] flex items-center gap-1 px-2 py-1">Ver <LuChevronDown size={13} className={open === s._id ? "rotate-180 transition" : "transition"} /></button>
                    <button onClick={() => descartar(s._id)} title="Descartar" className="text-[#94a3b8] hover:text-[#E24B4A] p-1"><LuTrash2 size={16} /></button>
                  </div>
                  {open === s._id && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t text-[13px] text-[#334155] grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1" style={{ borderColor: "#F0EBE0" }}>
                      <div><b>CPF:</b> {s.tutor?.cpf || "—"}</div>
                      <div><b>Nascimento:</b> {s.tutor?.birthDate || "—"}</div>
                      <div><b>E-mail:</b> {s.tutor?.email || "—"}</div>
                      <div><b>CEP:</b> {s.tutor?.cep || "—"}</div>
                      <div className="md:col-span-2"><b>Endereço:</b> {s.tutor?.address || "—"}</div>
                      <div><b>Como conheceu:</b> {s.tutor?.howFoundUs || "—"}</div>
                      <div className="md:col-span-2 mt-1 pt-1 border-t" style={{ borderColor: "#F5F0E6" }}><b>🐾 Pet:</b> {s.pet?.name || "—"} · {s.pet?.breed || "raça —"} · nasc. {s.pet?.birthDate || "—"} · idade {s.pet?.age || "—"} · {s.pet?.weight ? s.pet.weight + " kg" : "peso —"}</div>
                      {/* LADO A LADO COM O CLIENTE PARECIDO. O que decide se é a mesma pessoa
                          é comparar CPF, e-mail, endereço e os pets — e isso tinha de ser feito
                          de cabeça, abrindo a ficha do outro numa aba. Agora está aqui. */}
                      {s.dup && (
                        <div className="md:col-span-2 mt-2 pt-2 border-t" style={{ borderColor: "#F0EBE0" }}>
                          <div className="text-[12px] font-semibold mb-1.5" style={{ color: "#A32D2D" }}>
                            É a mesma pessoa? Compare com {s.dupNome}:
                          </div>
                          <div className="grid grid-cols-[86px_minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12px]">
                            <div />
                            <div className="font-semibold" style={{ color: "#0E2244" }}>📝 Ficha recebida</div>
                            <div className="font-semibold" style={{ color: "#5C6B70" }}>👤 {s.dupNome}</div>
                            {COMPARAR.map((c) => {
                              const a = c.novo(s), b = c.velho(s.dup);
                              const igual = mesmoValor(a, b, c.modo);
                              return (
                                <Fragment key={c.rotulo}>
                                  <div style={{ color: "#8A9499" }}>{c.rotulo}</div>
                                  <div className="break-words" style={{ color: igual ? "#0F6E56" : "#0E2244", fontWeight: igual ? 600 : 400 }}>
                                    {a || "—"} {igual ? "✓" : ""}
                                  </div>
                                  <div className="break-words" style={{ color: "#5C6B70" }}>{b || "—"}</div>
                                </Fragment>
                              );
                            })}
                          </div>
                          <div className="text-[11px] mt-1.5" style={{ color: "#8A9499" }}>
                            ✓ verde = igual nos dois. Telefone igual foi o que levantou a suspeita.
                          </div>
                          <Link href={`/dashboard/erp/tutores/${s.dupId}`} target="_blank" rel="noopener" className="text-[11.5px] font-semibold inline-block mt-1" style={{ color: "#009AAC" }}>
                            abrir a ficha de {s.dupNome} ↗
                          </Link>
                        </div>
                      )}
                      {/* GRAVAÇÃO PELA METADE: o cliente já existe, o pet não. "Aprovar" some daqui de
                          propósito — clicar de novo criaria um cliente repetido. O caminho é Vincular,
                          que grava só o que faltou. */}
                      {s.parcial && (
                        <div className="md:col-span-2 mt-2 p-2.5 rounded-lg text-[12px]" style={{ background: "#FBF3E3", border: "1px solid #F0DCB0", color: "#7a6330" }}>
                          <b>{s.parcial}</b><br />
                          Nada foi apagado. Clique em <b>🔗 Vincular a {s.dupNome}</b> aqui embaixo para gravar só o pet — não use Aprovar, senão o cliente entra duas vezes.
                        </div>
                      )}
                      <div className="md:col-span-2 mt-2 pt-2 border-t flex flex-wrap items-center gap-2" style={{ borderColor: "#F0EBE0" }}>
                        {!s.parcial && <button onClick={() => aprovar(s)} disabled={busy === s._id} className="px-3 py-2 rounded-lg text-[13px] text-white font-medium disabled:opacity-60" style={{ background: "#0F6E56" }}>{busy === s._id ? "Processando…" : "✅ Aprovar (novo cliente)"}</button>}
                        {s.dupId && <button onClick={() => vincular(s, s.dupId!, s.dupNome || undefined)} disabled={busy === s._id} className="px-3 py-2 rounded-lg text-[13px] font-medium border disabled:opacity-60" style={{ borderColor: "#009AAC", color: "#009AAC", background: "#fff" }}>🔗 Vincular a {s.dupNome}</button>}
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-[11px] text-[#374151] mb-1">Ou vincular a outro cliente:</div>
                        <input value={buscaVinc[s._id] || ""} onChange={(e) => buscarClientes(s._id, e.target.value)} placeholder="Buscar cliente por nome…" className="w-full px-2.5 py-1.5 text-[13px] border rounded-lg" style={{ borderColor: "#D9E6E8" }} />
                        {(resVinc[s._id] || []).length > 0 && (
                          <div className="border rounded-lg mt-1 divide-y" style={{ borderColor: "#EFEAE0" }}>
                            {(resVinc[s._id] || []).map((t: any) => (
                              <button key={t.id} onClick={() => vincular(s, t.id, t.name)} disabled={busy === s._id} className="w-full text-left px-3 py-2 text-[13px] hover:bg-[#F6FDFD] flex items-center justify-between gap-2">
                                <span>{t.name}</span><span className="text-[11px] text-[#009AAC]">vincular →</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

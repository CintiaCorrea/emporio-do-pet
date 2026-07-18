"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LuArrowLeft, LuCopy, LuTrash2, LuRefreshCw, LuChevronDown, LuTriangleAlert } from "react-icons/lu";
import toast from "react-hot-toast";

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

interface Sub { _id: string; status?: string; receivedAt?: string; tutor: any; pet: any; dupNome?: string | null; dupId?: string | null; }

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
          if (hit) { s.dupNome = hit.name || "cliente existente"; s.dupId = hit.id; }
        } catch {}
      }));
      setSubs(parsed);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const [busy, setBusy] = useState<string | null>(null); // _id em processamento
  const [buscaVinc, setBuscaVinc] = useState<Record<string, string>>({}); // busca de cliente por submissão
  const [resVinc, setResVinc] = useState<Record<string, any[]>>({});

  // Cria o pet da submissão sob o tutor informado (se houver nome do pet).
  async function criarPetSe(s: Sub, tutorId: string) {
    if (!s.pet?.name?.trim()) return;
    const petBirth = toISO(s.pet.birthDate);
    const body: any = {
      tutorId, name: s.pet.name.trim(),
      breed: s.pet.breed?.trim() || undefined,
      weight: s.pet.weight ? Number(String(s.pet.weight).replace(",", ".")) || undefined : undefined,
      birthDate: petBirth,
      observations: (!petBirth && s.pet.age?.trim()) ? `Idade informada no cadastro: ${s.pet.age.trim()}` : undefined,
    };
    await fetch("/api/pets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  }
  async function limparSub(id: string) { await fetch(`/api/listas/${id}`, { method: "DELETE" }).catch(() => null); setSubs((s) => s.filter((x) => x._id !== id)); }

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
      await criarPetSe(s, novo.id);
      await limparSub(s._id);
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
      if (Object.keys(patch).length) await fetch(`/api/tutors/${tutorId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => null);
      await criarPetSe(s, tutorId);
      await limparSub(s._id);
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
          <Link href="/dashboard/configuracoes" className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
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
                        {s.dupNome && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: "#FCEBEB", color: "#A32D2D" }}><LuTriangleAlert size={11} /> possível duplicado: {s.dupNome}</span>}
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
                      <div className="md:col-span-2 mt-2 pt-2 border-t flex flex-wrap items-center gap-2" style={{ borderColor: "#F0EBE0" }}>
                        <button onClick={() => aprovar(s)} disabled={busy === s._id} className="px-3 py-2 rounded-lg text-[13px] text-white font-medium disabled:opacity-60" style={{ background: "#0F6E56" }}>{busy === s._id ? "Processando…" : "✅ Aprovar (novo cliente)"}</button>
                        {s.dupId && <button onClick={() => vincular(s, s.dupId!, s.dupNome || undefined)} disabled={busy === s._id} className="px-3 py-2 rounded-lg text-[13px] font-medium border disabled:opacity-60" style={{ borderColor: "#009AAC", color: "#009AAC", background: "#fff" }}>🔗 Vincular a {s.dupNome}</button>}
                      </div>
                      <div className="md:col-span-2">
                        <div className="text-[11px] text-[#8A989D] mb-1">Ou vincular a outro cliente:</div>
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

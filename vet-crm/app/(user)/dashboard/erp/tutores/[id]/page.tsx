"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import {
  LuArrowLeft, LuStickyNote, LuPencil, LuTriangleAlert,
  LuTrash, LuPhone, LuCalendar, LuUser, LuPlus} from "react-icons/lu";

interface TutorDetail {
  id: string;
  name: string | null;
  email: string | null;
  cpf: string | null;
  rg: string | null;
  birthDate: string | null;
  status: string;
  classificacao: string;
  cep: string | null;
  address: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  observations: string | null;
  notaCliente: string | null;
  tags: string[];
  acceptsEmail: boolean;
  acceptsWhatsApp: boolean;
  acceptsSMS: boolean;
  convertedFromLeadId: string | null;
  createdAt: string;
  pets?: { id: string; name: string; species: string; breed?: string; birthDate?: string }[];
  contacts?: { id: string; number: string; type: string; isPrimary: boolean; isWhatsApp: boolean }[];
  score?: {
    total: number; label: string;
    dimensions: {
      visitas: { score: number; max: number; value: number };
      ltv: { score: number; max: number; value: number };
      recencia: { score: number; max: number; value: any };
      nps: { score: number; max: number; value: any };
    };
  };
}

const PET_EMOJI = (species: string) => {
  const s = (species || "").toUpperCase();
  if (s === "FELINE" || s === "GATO") return "🐱";
  if (s === "CANINE" || s === "CACHORRO") return "🐶";
  return "🐾";
};

const STATUS_BADGE = (status: string) => {
  const s = (status || "").toUpperCase();
  if (s === "ACTIVE") return { label: "Em dia", color: "#0F6E56", bg: "#E1F5EE" };
  if (s === "SUSPENDED") return { label: "A recuperar", color: "#BA7517", bg: "#FCE5C8" };
  if (s === "CHURNED") return { label: "Ex-cliente", color: "#A32D2D", bg: "#FCEBEB" };
  return { label: "Inativo", color: "#5b6470", bg: "#f0e8d4" };
};

function AccordionCard({
  icon: Icon, title, count, badge, action, children
}: {
  icon: any; title: string; count?: number; badge?: { label: string; color: string; bg: string };
  action?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-[#d8d0bc] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3.5 py-3 border-b border-[#f0e8d4] hover:bg-[#fdfaee]">
        <div className="flex items-center gap-2">
          {open ? <span style={{fontSize:"11px"}}>▼</span> : <span style={{fontSize:"11px"}}>▶</span>}
          <Icon className="w-4 h-4 text-[#009AAC]" />
          <span className="text-sm text-[#0E2244] font-medium">{title}</span>
          {typeof count === "number" && (
            <span className="bg-[#E1F5EE] text-[#0F6E56] text-[10px] font-medium px-1.5 py-0.5 rounded-full">{count}</span>
          )}
          {badge && (
            <span style={{ background: badge.bg, color: badge.color }} className="text-[10px] font-medium px-2 py-0.5 rounded-full">{badge.label}</span>
          )}
        </div>
        {action}
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  );
}

export default function TutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tutor, setTutor] = useState<TutorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState("");
  const [notaSaving, setNotaSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tutors/${id}`);
      const data = await res.json().catch(() => null);
      if (data && typeof data === "object" && data.id) {
        setTutor(data);
        setNota(data.notaCliente || "");
      } else {
        setTutor(null);
      }
    } catch (e) {
      console.error(e);
      setTutor(null);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const saveNota = async () => {
    setNotaSaving(true);
    try {
      const res = await fetch(`/api/tutors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notaCliente: nota })});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Nota salva!");
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setNotaSaving(false); }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando...</div>;
  if (!tutor) return <div className="p-6 text-center text-gray-500">Cliente não encontrado</div>;

  const status = STATUS_BADGE(tutor.status);
  const phone = tutor.contacts?.find((c) => c.isPrimary)?.number;
  const ltv = tutor.score?.dimensions?.ltv?.value || 0;
  const visitas = tutor.score?.dimensions?.visitas?.value || 0;
  const pets = tutor.pets || [];

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <Toaster position="top-right" />

      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <Link href="/dashboard/erp/tutores" className="bg-white border border-[#cfd8e0] rounded-lg p-1.5">
            <LuArrowLeft className="w-4 h-4 text-[#0E2244]" />
          </Link>
          <span style={{fontSize:"18px"}}>👤</span>
          <h1 className="text-xl text-[#0E2244] font-medium">{tutor.name || "Sem nome"}</h1>
          <span style={{ background: status.bg, color: status.color }} className="text-[11px] font-medium px-2 py-0.5 rounded-full">{status.label}</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <a href={phone ? `https://wa.me/${phone.replace(/\D/g, "")}` : "#"} target="_blank" rel="noreferrer" className="bg-white border border-[#009AAC] text-[#00798A] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"><LuStickyNote className="w-3.5 h-3.5" />WhatsApp</a>
          <a href={tutor.email ? `mailto:${tutor.email}` : "#"} className="bg-white border border-[#cfd8e0] text-[#4d5a66] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"><span style={{fontSize:"14px"}}>✉️</span>Email</a>
          <Link href={`/dashboard/erp/tutores/${id}/editar`} className="bg-white border border-[#cfd8e0] text-[#4d5a66] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"><LuPencil className="w-3.5 h-3.5" />Editar</Link>
          <button className="bg-white border border-[#FCD194] text-[#BA7517] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" onClick={() => toast("Marcado a recuperar")}><LuTriangleAlert className="w-3.5 h-3.5" />Marcar a recuperar</button>
          <button className="bg-white border border-[#cfd8e0] text-[#0C447C] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" onClick={() => toast("Encaminhado")}><span style={{fontSize:"13px"}}>↔</span>Encaminhar</button>
          <button className="bg-white border border-[#cfd8e0] text-[#3C3489] px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5" onClick={() => toast("Retomado como Lead")}><span style={{fontSize:"13px"}}>↺</span>Retomar como Lead</button>
          <button className="bg-[#fbe6e6] border border-[#f4baba] text-[#A32D2D] px-2.5 py-1.5 rounded-lg text-xs"><LuTrash className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Caixinha lembrar */}
      <div className="bg-[#FBF0DD] border border-dashed border-[#BA7517] rounded-xl px-3.5 py-2 mb-3">
        <div className="flex items-center gap-2">
          <span style={{fontSize:"14px"}}>💗</span>
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder={`Adicionar algo que vale lembrar sobre ${tutor.name?.split(" ")[0] || "este cliente"}...`}
            className="flex-1 bg-transparent border-none outline-none text-xs text-[#5b6470] italic"
          />
          {nota !== (tutor.notaCliente || "") && (
            <button onClick={saveNota} disabled={notaSaving} className="text-[#BA7517] text-[11px] font-medium">
              {notaSaving ? "Salvando..." : "Salvar"}
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-[#5b6470] mb-3 px-1">
        {pets.length} {pets.length === 1 ? "pet" : "pets"} · <strong className="text-[#0E2244] font-medium">R$ {ltv} LTV</strong> · cliente desde {new Date(tutor.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
      </p>

      <div className="grid grid-cols-[280px_1fr] gap-3 mb-3">

        {/* Coluna esquerda */}
        <div className="flex flex-col gap-2.5">
          <div className="bg-white border border-[#d8d0bc] rounded-xl p-3.5">
            <h3 className="text-[13px] text-[#0E2244] font-medium mb-2">Dados pessoais</h3>
            <div className="text-[11px] text-[#4d5a66] leading-loose">
              {phone && <div><LuPhone className="inline w-3 h-3 text-[#0C447C]" /> <strong className="text-[#0E2244] font-medium">Telefone:</strong> <span className="text-[#00798A]">{phone}</span></div>}
              {tutor.email && <div><span style={{fontSize:"14px"}}>✉️</span> <strong className="text-[#0E2244] font-medium">Email:</strong> <span className="text-[#00798A]">{tutor.email}</span></div>}
              {tutor.address && <div><span style={{fontSize:"13px"}}>📍</span> {tutor.address}</div>}
              {tutor.neighborhood && <div className="pl-4">Bairro: {tutor.neighborhood}</div>}
              {tutor.city && <div className="pl-4">Cidade: {tutor.city}</div>}
              {tutor.cpf && <div><span style={{fontSize:"13px"}}>🪪</span> <strong className="text-[#0E2244] font-medium">CPF:</strong> {tutor.cpf}</div>}
              <div><LuCalendar className="inline w-3 h-3" /> <strong className="text-[#0E2244] font-medium">Primeira visita:</strong> {new Date(tutor.createdAt).toLocaleDateString("pt-BR")}</div>
              <div><LuUser className="inline w-3 h-3" /> <strong className="text-[#0E2244] font-medium">Tipo:</strong> <span className="bg-[#E0F4F6] text-[#00798A] text-[10px] px-1.5 py-0.5 rounded">{tutor.classificacao}</span></div>
            </div>
            {tutor.convertedFromLeadId && (
              <div className="mt-2 pt-2 border-t border-[#f0e8d4] text-[11px] text-[#5b6470]">
                <strong className="text-[#0E2244] font-medium">Origem:</strong> Lead convertido · <Link href={`/dashboard/crm/leads/${tutor.convertedFromLeadId}`} className="text-[#00798A]">Ver lead →</Link>
              </div>
            )}
          </div>

          <div className="bg-white border border-[#d8d0bc] rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <LuCalendar className="w-3.5 h-3.5" />
              <h3 className="text-[13px] text-[#0E2244] font-medium">Follow-up & Cadência</h3>
            </div>
            <p className="text-[10px] text-[#5b6470] mb-1.5">Acompanhando:</p>
            <select className="w-full px-2.5 py-1.5 border border-[#d8d0bc] rounded text-xs text-[#0E2244]">
              <option>Relacionamento (Tutor)</option>
              <option>Pós-venda</option>
              <option>Retenção</option>
            </select>
            <p className="text-center text-[11px] text-gray-400 my-2">Sem follow-up pro cliente</p>
            <button className="w-full bg-white border border-dashed border-[#009AAC] text-[#00798A] py-1.5 rounded text-[11px] font-medium">
              <LuPlus className="inline w-3 h-3" /> Agendar follow-up
            </button>
          </div>

          {tutor.score && (
            <div className="bg-white border border-[#d8d0bc] rounded-xl p-3.5">
              <h3 className="text-[13px] text-[#0E2244] font-medium mb-2.5">Score do Cliente</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-14 h-14">
                  <svg viewBox="0 0 56 56" className="w-full h-full -rotate-90">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#f0e8d4" strokeWidth="5" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#009AAC" strokeWidth="5" strokeDasharray="150.8" strokeDashoffset={150.8 - (tutor.score.total / 100) * 150.8} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-base font-medium text-[#0E2244]">{tutor.score.total}</div>
                </div>
                <div>
                  <div className="text-[13px] text-[#0E2244] font-medium">{tutor.score.label}</div>
                  <div className="text-[11px] text-[#5b6470]">Score {tutor.score.total}/100</div>
                </div>
              </div>
              {[
                ["Visitas", tutor.score.dimensions.visitas],
                ["LTV", tutor.score.dimensions.ltv],
                ["Recência", tutor.score.dimensions.recencia],
                ["NPS", tutor.score.dimensions.nps],
              ].map(([label, d]: any) => (
                <div key={label} className="mb-1.5">
                  <div className="flex justify-between text-[10px] mb-0.5"><span className="text-[#5b6470]">{label}</span><span className="text-[#0E2244] font-medium">{d.score}/{d.max}</span></div>
                  <div className="h-[3px] bg-[#f0e8d4] rounded-full overflow-hidden">
                    <div className="h-full bg-[#009AAC] rounded-full" style={{ width: `${(d.score / d.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white border border-[#d8d0bc] rounded-xl p-3.5">
            <h3 className="text-[13px] text-[#0E2244] font-medium mb-2">Etiquetas</h3>
            {(tutor.tags?.length || 0) === 0 && <p className="text-[11px] text-gray-400 mb-2">Sem etiquetas</p>}
            <div className="flex flex-wrap gap-1">
              {tutor.tags?.map((t) => (
                <span key={t} className="bg-[#EEEDFE] text-[#3C3489] text-[10px] px-2 py-0.5 rounded-full">● {t}</span>
              ))}
              <button className="border border-dashed border-[#cfd8e0] text-gray-400 text-[10px] px-2 py-0.5 rounded-full">+ tag</button>
            </div>
          </div>

          <div className="bg-white border border-[#d8d0bc] rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span style={{fontSize:"13px"}}>⭐</span>
                <h3 className="text-[13px] text-[#0E2244] font-medium">Avaliações Google</h3>
              </div>
              <button className="border border-[#cfd8e0] text-[#4d5a66] px-2 py-0.5 rounded text-[10px]">+ Solicitar</button>
            </div>
            <p className="text-[11px] text-gray-400">Nenhuma avaliação solicitada</p>
          </div>
        </div>

        {/* Coluna direita — Pets */}
        <div className="bg-white border border-[#d8d0bc] rounded-xl p-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm text-[#0E2244] font-medium">Pets</h3>
              <span className="bg-[#E0F4F6] text-[#00798A] text-[10px] font-medium px-1.5 py-0.5 rounded-full">{pets.length}</span>
            </div>
            <button className="bg-white border border-[#cfd8e0] text-[#4d5a66] px-2.5 py-1 rounded text-[11px]"><LuPlus className="inline w-3 h-3" /> Adicionar Pet</button>
          </div>
          {pets.length === 0 ? (
            <p className="text-center text-[11px] text-gray-400 py-6">Nenhum pet cadastrado</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {pets.map((pet) => (
                <Link key={pet.id} href={`/dashboard/erp/pets/${pet.id}`} className="bg-[#fbf6ea] rounded-lg p-2.5 hover:bg-[#FBEED8] transition">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#FBEED8] flex items-center justify-center text-base">{PET_EMOJI(pet.species)}</div>
                    <div className="flex-1">
                      <div className="text-[#0E2244] font-medium text-xs">{pet.name}</div>
                      <div className="text-[10px] text-[#5b6470]">{pet.species}{pet.breed ? ` · ${pet.breed}` : ""}</div>
                    </div>
                  </div>
                  <div className="mt-1.5 text-[9px] bg-[#f0e8d4] text-[#5b6470] px-1.5 py-0.5 rounded inline-block">Sem trat. ativo</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2x2 accordion: Atendimentos+Interações em cima, Sequências+Emails embaixo */}
      <div className="grid grid-cols-2 gap-2.5">
        <AccordionCard icon={() => <span style={{fontSize:"14px"}}>🩺</span>} title="Histórico de atendimentos" count={0}
          action={<button className="bg-[#0F6E56] text-white px-2.5 py-1 rounded text-[11px] font-medium"><LuPlus className="inline w-3 h-3" /> Novo</button>}>
          <p className="text-center text-[11px] text-gray-400 py-3">Nenhum atendimento registrado</p>
        </AccordionCard>

        <AccordionCard icon={() => <span style={{fontSize:"14px"}}>💬</span>} title="Histórico de interações" count={0}
          action={<button className="bg-[#009AAC] text-white px-2.5 py-1 rounded text-[11px] font-medium"><LuPlus className="inline w-3 h-3" /> Nota</button>}>
          <div className="flex gap-2 mb-2">
            <select className="border border-[#d8d0bc] rounded px-2 py-1 text-[11px]"><option>Nota</option><option>WhatsApp</option><option>Email</option></select>
            <input placeholder="Registrar..." className="flex-1 border border-[#d8d0bc] rounded px-2 py-1 text-[11px]" />
          </div>
          <p className="text-center text-[11px] text-gray-400 py-2">Nenhuma interação ainda</p>
        </AccordionCard>

        <AccordionCard icon={() => <span style={{fontSize:"14px"}}>⚡</span>} title="Sequências automáticas" badge={{ label: "Em breve", color: "#3C3489", bg: "#EEEDFE" }}>
          <p className="text-[11px] text-[#5b6470] mb-2">Automações de email/WhatsApp programadas pra este tutor.</p>
          <div className="flex flex-col gap-1.5">
            <div className="bg-[#fbf6ea] rounded px-2.5 py-1.5 flex items-center justify-between text-[11px]">
              <span className="text-[#0E2244] font-medium">📧 Boas-vindas Empório</span>
              <span className="bg-[#FCE5C8] text-[#8A5A0F] text-[9px] px-1.5 py-0.5 rounded-full">pendente</span>
            </div>
            <div className="bg-[#fbf6ea] rounded px-2.5 py-1.5 flex items-center justify-between text-[11px]">
              <span className="text-[#0E2244] font-medium">🗒️ Lembrete retorno 30d</span>
              <span className="bg-[#E0F4F6] text-[#00798A] text-[9px] px-1.5 py-0.5 rounded-full">aguardando</span>
            </div>
          </div>
        </AccordionCard>

        <AccordionCard icon={() => <span style={{fontSize:"14px"}}>✉️</span>} title="Emails" count={0}
          action={<button className="bg-white border border-[#cfd8e0] text-[#4d5a66] px-2.5 py-1 rounded text-[11px]"><LuPlus className="inline w-3 h-3" /> Enviar</button>}>
          <p className="text-center text-[11px] text-gray-400 py-3">Nenhum email registrado</p>
        </AccordionCard>
      </div>
    </div>
  );
}

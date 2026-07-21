"use client";
// [EMP-COWORK] Busca padrão Cliente + Pet — Cintia 18/07
// Padrão único do sistema, copiado da tela de Clientes (erp/tutores): DUAS caixinhas
// independentes que se CRUZAM (E, não OU) — "renata" + "zeus" = 1 linha. Aqui elas
// terminam numa ESCOLHA: clicar na linha preenche cliente E pet de uma vez.
// Fonte: /api/tutors?search= já casa nome, e-mail, CPF, telefone, código E nome do pet,
// e devolve os pets junto — por isso uma chamada só resolve as duas buscas.

import { useEffect, useMemo, useRef, useState } from "react";

export type PetLite = { id: string; name: string; species?: string };
export type TutorLite = { id: string; name: string; pets?: PetLite[] };
export type SelecaoClientePet = { tutor: TutorLite; pet: PetLite | null };

const semAcento = (s?: string) =>
  (s || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function especieEmoji(s?: string) {
  const k = (s || "").toUpperCase();
  if (k.startsWith("CAN") || k.startsWith("DOG")) return "🐶";
  if (k.startsWith("FEL") || k.startsWith("CAT") || k.startsWith("GAT")) return "🐱";
  return "🐾";
}

export default function BuscaClientePet({
  tutorSelecionado,
  petSelecionado,
  onSelecionar,
  onLimpar,
  exigirPet = false,
  autoFocus = false,
}: {
  tutorSelecionado?: { id: string; name: string } | null;
  petSelecionado?: { id: string; name: string } | null;
  onSelecionar: (sel: SelecaoClientePet) => void;
  onLimpar?: () => void;
  /** true = só deixa escolher linhas que tenham pet */
  exigirPet?: boolean;
  autoFocus?: boolean;
}) {
  const [buscaCli, setBuscaCli] = useState("");
  const [buscaPet, setBuscaPet] = useState("");
  const [tutores, setTutores] = useState<TutorLite[]>([]);
  const [carregando, setCarregando] = useState(false);
  const reqRef = useRef(0);

  // Termo que vai pro servidor: o do cliente manda (casa telefone/CPF/e-mail);
  // se só o pet foi digitado, ele serve — o endpoint também casa nome de pet.
  const termoServidor = (buscaCli.trim() || buscaPet.trim()).trim();

  useEffect(() => {
    if (termoServidor.length < 2) { setTutores([]); return; }
    const id = ++reqRef.current;
    setCarregando(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/tutors?search=${encodeURIComponent(termoServidor)}&limit=30`);
        const d = await r.json();
        const arr: TutorLite[] = Array.isArray(d) ? d : (d.tutors || d.data || []);
        if (id === reqRef.current) setTutores(arr);
      } catch {
        if (id === reqRef.current) setTutores([]);
      } finally {
        if (id === reqRef.current) setCarregando(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [termoServidor]);

  // Cruzamento das duas caixinhas (E) + monta uma linha por pet.
  const linhas = useMemo(() => {
    const qc = semAcento(buscaCli.trim());
    const qp = semAcento(buscaPet.trim());
    const out: Array<{ tutor: TutorLite; pet: PetLite | null }> = [];

    for (const t of tutores) {
      // filtro do cliente: nome (telefone/CPF/código já vieram filtrados do servidor)
      if (qc && !semAcento(t.name).includes(qc)) {
        // pode ter vindo por telefone/CPF/pet — só descarta se também não casar por pet
        const casaPet = (t.pets || []).some((p) => semAcento(p.name).includes(qc));
        if (!casaPet) continue;
      }
      const pets = (t.pets || []).filter((p) => !qp || semAcento(p.name).includes(qp));
      if (qp && pets.length === 0) continue; // buscou pet e esse cliente não tem → fora
      if (pets.length === 0) {
        if (!exigirPet) out.push({ tutor: t, pet: null });
        continue;
      }
      for (const p of pets) out.push({ tutor: t, pet: p });
    }

    out.sort((a, b) => (a.tutor.name || "").localeCompare(b.tutor.name || "", "pt-BR"));
    return out.slice(0, 40);
  }, [tutores, buscaCli, buscaPet, exigirPet]);

  const limpar = () => {
    setBuscaCli(""); setBuscaPet(""); setTutores([]);
    onLimpar?.();
  };

  // Já escolhido → mostra o resumo com opção de trocar.
  if (tutorSelecionado) {
    return (
      <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2" style={{ borderColor: "#E8E2D6" }}>
        <span className="text-base">{petSelecionado ? "🐾" : "👤"}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] text-[#1F2A2E] truncate">
            {petSelecionado ? <><span className="font-medium">{petSelecionado.name}</span> · {tutorSelecionado.name}</> : tutorSelecionado.name}
          </div>
          {!petSelecionado && <div className="text-[11px] text-[#374151]">sem pet selecionado</div>}
        </div>
        <button type="button" onClick={limpar} className="text-[12px] text-[#00798A] flex-shrink-0">Trocar</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] opacity-60 pointer-events-none">🔎</span>
          <input
            value={buscaCli}
            onChange={(e) => setBuscaCli(e.target.value)}
            autoFocus={autoFocus}
            placeholder="Buscar cliente — nome, telefone, e-mail…"
            className="w-full bg-white border rounded-lg pl-9 pr-8 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]"
            style={{ borderColor: "#E8E2D6" }}
          />
          {buscaCli && (
            <button type="button" onClick={() => setBuscaCli("")} title="Limpar"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#4d5a66] text-base leading-none px-1">×</button>
          )}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] opacity-60 pointer-events-none">🐾</span>
          <input
            value={buscaPet}
            onChange={(e) => setBuscaPet(e.target.value)}
            placeholder="Buscar pet — nome do animal…"
            className="w-full bg-white border rounded-lg pl-9 pr-8 py-2 text-[13px] focus:outline-none focus:border-[#00798A]"
            style={{ borderColor: "#E8E2D6" }}
          />
          {buscaPet && (
            <button type="button" onClick={() => setBuscaPet("")} title="Limpar"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#4d5a66] text-base leading-none px-1">×</button>
          )}
        </div>
      </div>

      {termoServidor.length >= 2 && (
        <div className="mt-2 border rounded-lg bg-white max-h-[220px] overflow-y-auto" style={{ borderColor: "#E8E2D6" }}>
          {carregando ? (
            <div className="px-3 py-3 text-[12.5px] text-[#374151]">Buscando...</div>
          ) : linhas.length === 0 ? (
            <div className="px-3 py-3 text-[12.5px] text-[#374151]">Nada encontrado com esses termos.</div>
          ) : (
            linhas.map((l) => (
              <button
                type="button"
                key={`${l.tutor.id}:${l.pet?.id || "sempet"}`}
                onClick={() => onSelecionar({ tutor: l.tutor, pet: l.pet })}
                className="w-full text-left px-3 py-2 text-[13px] border-b last:border-b-0 hover:bg-[#F4FBFC]"
                style={{ borderColor: "#F0EBE0" }}
              >
                {l.pet ? (
                  <><span>{especieEmoji(l.pet.species)}</span> <span className="font-medium text-[#1F2A2E]">{l.pet.name}</span> <span className="text-[#374151]">· {l.tutor.name}</span></>
                ) : (
                  <><span>👤</span> <span className="text-[#1F2A2E]">{l.tutor.name}</span> <span className="text-[11px] text-[#374151]">· sem pet cadastrado</span></>
                )}
              </button>
            ))
          )}
        </div>
      )}
      {termoServidor.length > 0 && termoServidor.length < 2 && (
        <div className="mt-1 text-[11px] text-[#374151]">Digite pelo menos 2 letras.</div>
      )}
    </div>
  );
}

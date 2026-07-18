"use client";
import { useState } from "react";

// 🎓 Academia — centro de treinamento da equipe: aprender o sistema (tela por tela)
// e as regras da empresa. Cada TEMA é uma aba; começa com WhatsApp.
// O conteúdo (guia + maquete) vive em /public/academia/*.html e entra por iframe,
// então não depende de link externo — qualquer pessoa logada acessa por aqui.

type Tema = "whatsapp" | "agenda" | "regras";
type ConteudoWa = "guia" | "maquete" | "api";
type ConteudoAg = "guia" | "maquete";

export default function AcademiaPage() {
  const [tema, setTema] = useState<Tema>("whatsapp");
  const [wa, setWa] = useState<ConteudoWa>("guia");
  const [ag, setAg] = useState<ConteudoAg>("guia");

  const temas: { key: Tema; label: string; emoji: string }[] = [
    { key: "whatsapp", label: "WhatsApp", emoji: "📲" },
    { key: "agenda", label: "Agenda", emoji: "📅" },
    { key: "regras", label: "Regras da empresa", emoji: "📋" },
  ];

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ background: "#F6F2EA" }}>
      {/* Cabeçalho */}
      <div className="mb-4">
        <h1 className="text-[22px] font-extrabold flex items-center gap-2" style={{ color: "#014D5E" }}>
          🎓 Academia
        </h1>
        <p className="text-[13.5px] mt-0.5" style={{ color: "#5F5E5A" }}>
          Aprenda como o sistema funciona e as regras da empresa. Material sempre disponível pra toda a equipe.
        </p>
      </div>

      {/* Abas de tema */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {temas.map((t) => {
          const on = tema === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTema(t.key)}
              className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border transition"
              style={on
                ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" }
                : { background: "#fff", color: "#5F5E5A", borderColor: "#E8DFC8" }}>
              {t.emoji} {t.label}
            </button>
          );
        })}
      </div>

      {/* TEMA: WhatsApp */}
      {tema === "whatsapp" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          {/* sub-abas: Guia / Maquete */}
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Caixa de WhatsApp</span>
            {([["guia", "📖 Guia visual"], ["maquete", "🖱️ Maquete interativa"], ["api", "📡 API & Modelos"]] as [ConteudoWa, string][]).map(([k, lbl]) => {
              const on = wa === k;
              return (
                <button key={k} onClick={() => setWa(k)}
                  className="text-[12.5px] font-semibold px-3 py-1.5 rounded-full border transition"
                  style={on
                    ? { background: "#0F6E56", color: "#fff", borderColor: "#0F6E56" }
                    : { background: "#fff", color: "#5F5E5A", borderColor: "#E8DFC8" }}>
                  {lbl}
                </button>
              );
            })}
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>
              {wa === "maquete" ? "Passe o mouse (ou toque) nos itens." : wa === "api" ? "A regra das 24h e os modelos." : "Melhor lido com calma. Dá pra imprimir."}
            </span>
          </div>
          <iframe
            key={wa}
            src={wa === "guia" ? "/academia/guia-whatsapp.html" : wa === "maquete" ? "/academia/maquete-whatsapp.html" : "/academia/whatsapp-api.html"}
            title={wa === "guia" ? "Guia da Caixa de WhatsApp" : wa === "maquete" ? "Maquete interativa da Caixa de WhatsApp" : "WhatsApp API e Modelos"}
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

      {/* TEMA: Agenda */}
      {tema === "agenda" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Agenda</span>
            {([["guia", "📖 Guia visual"], ["maquete", "🖱️ Maquete interativa"]] as [ConteudoAg, string][]).map(([k, lbl]) => {
              const on = ag === k;
              return (
                <button key={k} onClick={() => setAg(k)}
                  className="text-[12.5px] font-semibold px-3 py-1.5 rounded-full border transition"
                  style={on
                    ? { background: "#0F6E56", color: "#fff", borderColor: "#0F6E56" }
                    : { background: "#fff", color: "#5F5E5A", borderColor: "#E8DFC8" }}>
                  {lbl}
                </button>
              );
            })}
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>
              {ag === "maquete" ? "Passe o mouse (ou toque) nos itens." : "Melhor lido com calma. Dá pra imprimir."}
            </span>
          </div>
          <iframe
            key={ag}
            src={ag === "guia" ? "/academia/guia-agenda.html" : "/academia/maquete-agenda.html"}
            title={ag === "guia" ? "Guia da Agenda" : "Maquete interativa da Agenda"}
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

      {/* TEMA: Regras da empresa (a preencher) */}
      {tema === "regras" && (
        <div className="bg-white rounded-2xl border p-10 text-center" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-[40px] mb-2">📋</div>
          <h2 className="text-[17px] font-bold" style={{ color: "#014D5E" }}>Regras da empresa</h2>
          <p className="text-[13.5px] mt-1.5 max-w-md mx-auto" style={{ color: "#5F5E5A" }}>
            Espaço pronto pras políticas e combinados da equipe (atendimento, horários, condutas…).
            Me passe o conteúdo que eu organizo aqui — do mesmo jeito bonito do guia do WhatsApp.
          </p>
          <span className="inline-block mt-4 text-[11.5px] font-semibold px-3 py-1.5 rounded-full" style={{ background: "#FCF0E0", color: "#8a5a12" }}>
            🚧 Em construção — aguardando conteúdo
          </span>
        </div>
      )}
    </div>
  );
}

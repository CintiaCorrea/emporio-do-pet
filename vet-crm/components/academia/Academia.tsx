// A ACADEMIA — o material de treinamento da equipe.
// Era uma tela com menu próprio dentro dela; em 18/09/2026 o menu passou para a BARRA LATERAL
// do sistema (Sidebar), onde a Academia já morava. O conteúdo ficou com a largura inteira.
"use client";
import { useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

// 🎓 Academia — centro de treinamento da equipe: aprender o sistema (tela por tela)
// e as regras da empresa. Cada TEMA é uma aba; começa com WhatsApp.
// O conteúdo (guia + maquete) vive em /public/academia/*.html e entra por iframe,
// então não depende de link externo — qualquer pessoa logada acessa por aqui.

type Tema = "whatsapp" | "agenda" | "ficha" | "fisio" | "gravacao" | "veterinario" | "financeiro" | "vendas" | "exames" | "docs" | "regras";
type ConteudoWa = "guia" | "maquete" | "api";
type ConteudoAg = "guia" | "maquete";
type ConteudoVd = "pdv" | "maquete" | "geral";

// ABA SUBLINHADA — o jeito de trocar de seção DENTRO da janela (diretriz de UX, 18/09/2026).
// Substitui as pílulas: uma linha só, sublinhado turquesa na ativa, sem borda nem fundo.
function Abas<T extends string>({ opcoes, valor, aoTrocar }: { opcoes: [T, string][]; valor: T; aoTrocar: (v: T) => void }) {
  return (
    <div className="flex flex-wrap -mb-[13px]">
      {opcoes.map(([k, lbl]) => {
        const on = valor === k;
        return (
          <button
            key={k}
            onClick={() => aoTrocar(k)}
            className="text-[13px] px-3.5 py-2.5 transition"
            style={{ color: on ? "#014D5E" : "#5F5E5A", fontWeight: on ? 700 : 500, borderBottom: `2px solid ${on ? "#009AAC" : "transparent"}` }}
          >{lbl}</button>
        );
      })}
    </div>
  );
}

// AS PARTES DA ACADEMIA, na mesma ordem e com os mesmos nomes do menu lateral do sistema (Cintia, 18/09/2026: "não ter esses menus em
// formato de pílulas, e sim em abas dentro da própria janela ou no menu lateral"). Eram 11
// pílulas em duas fileiras, ocupando meia tela. Quem sabe onde trabalha sabe onde estudar.
const GRUPOS: { titulo: string; itens: { key: Tema; label: string; emoji: string }[] }[] = [
  {
    titulo: "Dia a dia", itens: [
      { key: "whatsapp", label: "WhatsApp", emoji: "📲" },
      { key: "agenda", label: "Agenda", emoji: "📅" },
      { key: "ficha", label: "Ficha do pet", emoji: "🐾" },
      { key: "fisio", label: "Boletim de fisio", emoji: "🌿" },
      { key: "gravacao", label: "Gravação de consulta", emoji: "🎤" },
      { key: "exames", label: "Exames", emoji: "🔬" },
    ],
  },
  {
    titulo: "Gestão", itens: [
      { key: "vendas", label: "Vendas", emoji: "🛒" },
      { key: "financeiro", label: "Financeiro", emoji: "💰" },
      { key: "veterinario", label: "Veterinário", emoji: "🩺" },
    ],
  },
  {
    titulo: "A empresa", itens: [
      { key: "regras", label: "Regras da empresa", emoji: "📋" },
      { key: "docs", label: "Documentação do sistema", emoji: "📘" },
    ],
  },
];

export default function Academia({ temaInicial }: { temaInicial?: string }) {
  const nomeDoTema = GRUPOS.flatMap((g) => g.itens).find((i) => i.key === tema)?.label;
  usePageTitle("Academia", nomeDoTema || "Como o sistema funciona e as regras da empresa");
  // O TEMA VEM DO MENU LATERAL DO SISTEMA (Cintia, 18/09/2026: "o menu da academia não era para
  // estar no menu lateral onde já está academia? Dessa forma ao clicar nas coisas a explicação
  // caberá ao lado das imagens"). Sem o menu de dentro, o conteúdo usa a largura inteira — que é
  // o que a maquete precisa para mostrar o desenho e a explicação lado a lado.
  const tema: Tema = (GRUPOS.flatMap((g) => g.itens).some((i) => i.key === temaInicial)
    ? (temaInicial as Tema)
    : "whatsapp");
  const [wa, setWa] = useState<ConteudoWa>("guia");
  const [ag, setAg] = useState<ConteudoAg>("guia");
  const [vd, setVd] = useState<ConteudoVd>("pdv");



  return (
    <div className="p-6 min-h-screen" style={{ background: "#F6F2EA" }}>
      <div className="w-full min-w-0">

      {/* TEMA: WhatsApp */}
      {tema === "whatsapp" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          {/* sub-abas: Guia / Maquete */}
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Caixa de WhatsApp</span>
            <Abas opcoes={[["guia", "📖 Guia visual"], ["maquete", "🖱️ Maquete interativa"], ["api", "📡 API & Modelos"]]} valor={wa} aoTrocar={setWa} />
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
            <Abas opcoes={[["guia", "📖 Guia visual"], ["maquete", "🖱️ Maquete interativa"]]} valor={ag} aoTrocar={setAg} />
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

      {/* TEMA: Ficha do Pet (guia interativo — as 7 abas, cabeçalho, prontuário, vacinas, fisio, compras) */}
      {tema === "ficha" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Ficha do Pet</span>
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>Passe o mouse nos termos. Clique nos passos da jornada.</span>
          </div>
          <iframe
            src="/academia/guia-ficha-pet.html"
            title="Guia da Ficha do Pet"
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

      {/* TEMA: Regras da empresa (a preencher) */}
      {/* TEMA: Boletim de Fisioterapia */}
      {tema === "fisio" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Boletim de Fisioterapia</span>
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>Como preencher e enviar. Dá pra imprimir.</span>
          </div>
          <iframe
            src="/academia/guia-boletim-fisio.html"
            title="Guia do Boletim de Fisioterapia"
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

      {/* TEMA: Gravação de consulta (guia passo a passo pra equipe) */}
      {tema === "gravacao" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Gravação de consulta</span>
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>Como gravar, transcrever e onde tudo fica salvo.</span>
          </div>
          <iframe
            src="/academia/guia-gravacao.html"
            title="Guia da Gravação de Consulta"
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

      {/* TEMA: Veterinário (guia interativo — atendimento, prontuário, receitas, vacinas, follow-up) */}
      {tema === "veterinario" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Veterinário</span>
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>Passe o mouse nos termos. Clique nos passos do atendimento.</span>
          </div>
          <iframe
            src="/academia/guia-veterinario.html"
            title="Guia do Veterinário"
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

      {/* TEMA: Financeiro (guia interativo — contas, formas, DRE Caixa/Competência) */}
      {tema === "financeiro" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Financeiro</span>
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>Passe o mouse nos termos. Experimente o botão Caixa / Competência.</span>
          </div>
          <iframe
            src="/academia/guia-financeiro.html"
            title="Guia do Financeiro"
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

      {/* TEMA: Vendas (guia interativo — catálogo, PDV, orçamento, comissão) */}
      {/* VENDAS EM PARTES (18/09/2026). O material de vendas estava numa página só, tentando
          explicar PDV, caixa, orçamento e internação juntos — por isso ficava raso. Cada parte
          passa a ter a sua página, no molde do guia do WhatsApp. A primeira é o Ponto de venda. */}
      {tema === "vendas" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Vendas</span>
            <Abas opcoes={[["pdv", "📖 Ponto de venda"], ["maquete", "🖱️ Maquete interativa"], ["geral", "📚 Visão geral"]]} valor={vd} aoTrocar={setVd} />
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>
              {vd === "pdv" ? "A tela do balcão, botão por botão. Dá pra imprimir."
                : vd === "maquete" ? "Clique em cada parte da tela para ver a regra e o porquê dela."
                : "O módulo inteiro em uma página. Dá pra imprimir."}
            </span>
          </div>
          <iframe
            src={vd === "pdv" ? "/academia/guia-vendas-ponto-de-venda.html"
              : vd === "maquete" ? "/academia/maquete-ponto-de-venda.html"
              : "/academia/guia-vendas.html"}
            title="Guia de Vendas"
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

      {/* TEMA: Exames & Laboratório (fluxo da coleta ao a-pagar) */}
      {tema === "exames" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Exames &amp; Laboratório</span>
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>Da solicitação ao a-pagar. Como nunca mais perguntar "a mensagem foi?".</span>
          </div>
          <iframe
            src="/academia/guia-exames-laboratorio.html"
            title="Guia de Exames & Laboratório"
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

      {/* TEMA: Documentação do sistema (visão geral de tudo, pra consulta) */}
      {tema === "docs" && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b flex-wrap" style={{ borderColor: "#F0EBE0" }}>
            <span className="text-[12px] font-bold uppercase tracking-wide mr-1" style={{ color: "#8A8778" }}>Documentação do sistema</span>
            <span className="text-[11.5px] ml-auto" style={{ color: "#8A8778" }}>Tudo que existe, onde fica e como usar.</span>
          </div>
          <iframe
            src="/academia/documentacao-sistema.html"
            title="Documentação do sistema"
            className="w-full block"
            style={{ height: "calc(100vh - 250px)", minHeight: 520, border: 0 }}
          />
        </div>
      )}

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
    </div>
  );
}

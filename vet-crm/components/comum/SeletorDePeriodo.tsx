"use client";
// O SELETOR DE PERÍODO — um só, para todas as telas que consultam um intervalo.
//
// Nasceu dentro da tela do Caixa em 08/09/2026, quando a Cintia pediu a forma do SimplesVet:
// "não esqueça da seleção de período". Saiu de lá no mesmo dia, quando a Consulta de vendas
// precisou do mesmo controle — e ela pediu: "lembre-se de seguir o mesmo padrão de estética".
//
// Escrever um segundo parecido é como a busca de itens ficou quebrada em três telas: um ganha
// "Este mês", o outro não, e a mesma pergunta passa a ter duas respostas na mesma casa. A conta
// de datas mora em lib/periodoDeBusca (com teste); aqui mora só a aparência.

import { useState } from "react";
import { PRESETS, Faixa, faixaDoPreset, rotuloDoPeriodo, presetDaFaixa, ordenar, hojeNaCasa } from "@/lib/periodoDeBusca";
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

const TEAL = "#009AAC";
const TEAL_DARK = "#014D5E";
const LINE = "#E8E2D6";
const INK2 = "#374151";
const MUT = "#5C6B70";
const SUAVE = "#FBF9F4";

type Props = {
  faixa: Faixa;
  onMudar: (f: Faixa) => void;
  /** Rótulo pequeno em cima do botão (a Consulta de vendas usa; o Caixa, não). */
  rotulo?: string;
};

export default function SeletorDePeriodo({ faixa, onMudar, rotulo }: Props) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState<Faixa>(faixa);

  const abrir = () => { setRascunho(faixa); setAberto((v) => !v); };
  const escolher = (f: Faixa) => { onMudar(f); setAberto(false); };

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
      {rotulo && <span style={{ fontSize: 11.5, color: MUT, fontWeight: 500 }}>{rotulo}</span>}
      <button
        type="button"
        onClick={abrir}
        style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 500, padding: "8px 12px", borderRadius: 9, cursor: "pointer", border: `1px solid ${LINE}`, background: "#fff", color: TEAL_DARK, whiteSpace: "nowrap" }}
      >
        📅 {rotuloDoPeriodo(faixa)} ▾
      </button>

      {aberto && (
        <>
          {/* A cortina fecha o menu ao clicar fora — sem ela o menu fica preso aberto. */}
          <div {...fundoDeModal(() => setAberto(false))} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 41, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, boxShadow: "0 10px 30px rgba(1,43,46,.13)", width: 268, overflow: "hidden" }}>
            {PRESETS.filter((x) => x.chave !== "PERSONALIZADO").map((x) => {
              const ativo = presetDaFaixa(faixa) === x.chave;
              return (
                <button
                  key={x.chave}
                  type="button"
                  onClick={() => escolher(faixaDoPreset(x.chave))}
                  style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: ativo ? "#e8f7f9" : "#fff", color: ativo ? TEAL_DARK : INK2, fontSize: 13, fontWeight: ativo ? 600 : 400, padding: "9px 14px", cursor: "pointer" }}
                >
                  {x.rotulo}
                </button>
              );
            })}

            {/* ESCOLHER PERÍODO com os dois campos já abertos. No SimplesVet era preciso clicar
                em "Selecionar período" antes de os calendários aparecerem, e os campos nem
                aceitavam digitação — a Cintia registrou as duas coisas na leitura dela. */}
            <div style={{ borderTop: `1px solid ${LINE}`, padding: "11px 14px", display: "flex", flexDirection: "column", gap: 8, background: SUAVE }}>
              <span style={{ fontSize: 10.5, color: MUT, textTransform: "uppercase", letterSpacing: ".4px" }}>Escolher período</span>
              <div style={{ display: "flex", gap: 7 }}>
                <label style={{ fontSize: 11, color: MUT, flex: 1 }}>De<br />
                  <input type="date" max={hojeNaCasa()} value={rascunho.de} onChange={(e) => setRascunho({ ...rascunho, de: e.target.value })} style={{ width: "100%", border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px", fontSize: 12.5 }} />
                </label>
                <label style={{ fontSize: 11, color: MUT, flex: 1 }}>Até<br />
                  <input type="date" max={hojeNaCasa()} value={rascunho.ate} onChange={(e) => setRascunho({ ...rascunho, ate: e.target.value })} style={{ width: "100%", border: `1px solid ${LINE}`, borderRadius: 8, padding: "6px 8px", fontSize: 12.5 }} />
                </label>
              </div>
              <button type="button" onClick={() => escolher(ordenar(rascunho))} style={{ background: TEAL, color: "#fff", border: "none", borderRadius: 8, padding: "8px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                Aplicar período
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

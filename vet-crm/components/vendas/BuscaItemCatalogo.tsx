"use client";
import { useEffect, useMemo, useState } from "react";
import { buscarItens, avisoDeCorte } from "@/lib/buscaCatalogo";

// 🔎 O SELETOR DE ITEM DO CATÁLOGO — um só, pra toda tela que vende.
//
// A Cintia, em 06/09/2026: "temos enfrentado localizar serviços e produtos quando
// digitamos a venda, muitas vezes não aparece".
//
// Duas coisas causavam isso, e as duas morrem aqui.
//
// A PRIMEIRA era a busca: `nome.includes(texto)` exigia acento certo e as palavras coladas
// na ordem. Agora quem decide é lib/buscaCatalogo, com teste — sem acento acha, palavra
// fora de ordem acha, e quando não cabe tudo a lista DIZ quantos ficaram de fora, em vez de
// cortar calada em 12.
//
// A SEGUNDA era o <datalist> do orçamento rápido: ~900 <option> jogadas no navegador. O
// filtro passava a ser do Chrome, que compara com acento e trunca a lista do jeito dele —
// fora que o onBlur limpava o campo quando o nome não batia LETRA POR LETRA. Quem digitava
// "vacina antirrabica" via o campo esvaziar. Agora a lista é nossa, e o clique é que
// escolhe.

export type ItemBuscavel = { id?: string; nome: string; valorPadrao?: number | null; [k: string]: any };

export default function BuscaItemCatalogo({
  value, itens, onType, onPick, placeholder, inpStyle, autoFocus, limite = 40, rotuloDe,
}: {
  value: string;
  itens: readonly ItemBuscavel[];
  onType: (val: string) => void;
  onPick: (item: ItemBuscavel) => void;
  placeholder?: string;
  inpStyle?: React.CSSProperties;
  autoFocus?: boolean;
  limite?: number;
  /** Etiqueta extra à direita do nome (o laboratório do exame, por exemplo). */
  rotuloDe?: (item: ItemBuscavel) => string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState(value || "");
  useEffect(() => { setQ(value || ""); }, [value]);

  const r = useMemo(() => buscarItens(itens, q, (i) => i.nome, limite), [itens, q, limite]);
  const aviso = avisoDeCorte(r);

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        value={q}
        autoFocus={autoFocus}
        placeholder={placeholder || "🔍 Produto, serviço ou pacote"}
        style={inpStyle}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={(e) => { setQ(e.target.value); onType(e.target.value); setAberto(true); }}
      />
      {aberto && q.trim().length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, marginTop: 2, background: "#fff", border: "1px solid #E8E2D6", borderRadius: 9, boxShadow: "0 8px 24px -6px rgba(0,0,0,.16)", maxHeight: 280, overflowY: "auto" }}>
          {r.itens.length === 0 && (
            <div style={{ padding: "9px 10px", fontSize: 12.5, color: "#8A7F6E" }}>
              Nenhum item com “{q.trim()}”. Tente uma palavra só.
            </div>
          )}
          {r.itens.map((s, i) => {
            const rot = rotuloDe?.(s);
            return (
              <button
                key={s.id || `${s.nome}-${i}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPick(s); setQ(s.nome); setAberto(false); }}
                style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 8, padding: "7px 10px", border: "none", borderBottom: "1px solid #F0EBE0", background: "#fff", cursor: "pointer", fontSize: 12.5, textAlign: "left" }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.nome}{rot ? <span style={{ color: "#8A7F6E" }}> · {rot}</span> : null}
                </span>
                <span style={{ color: "#5C6B70", flexShrink: 0 }}>
                  {Number(s.valorPadrao || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </button>
            );
          })}
          {/* O corte deixa de ser mudo: quem procura sabe que tem mais e o que fazer. */}
          {aviso && <div style={{ padding: "6px 10px", fontSize: 11.5, color: "#8A7F6E", background: "#FAF7F1" }}>{aviso}</div>}
        </div>
      )}
    </div>
  );
}

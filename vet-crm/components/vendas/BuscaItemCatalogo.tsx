"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { buscarItens, avisoDeCorte } from "@/lib/buscaCatalogo";

// 🔎 O SELETOR DE ITEM DO CATÁLOGO — um só, pra toda tela que vende.
//
// A Cintia, em 06/09/2026: "temos enfrentado localizar serviços e produtos quando
// digitamos a venda, muitas vezes não aparece".
//
// Três coisas causavam isso, e as três morrem aqui.
//
// A PRIMEIRA era a busca: `nome.includes(texto)` exigia acento certo e as palavras coladas
// na ordem. Agora quem decide é lib/buscaCatalogo, com teste — sem acento acha, palavra
// fora de ordem acha, e quando não cabe tudo a lista DIZ quantos ficaram de fora, em vez de
// cortar calada em 12.
//
// A SEGUNDA era o <datalist>: ~900 <option> jogadas no navegador. O filtro passava a ser do
// Chrome, que compara com acento e trunca do jeito dele — fora que o onBlur limpava o campo
// quando o nome não batia LETRA POR LETRA. Agora a lista é nossa, e o clique é que escolhe.
//
// A TERCEIRA foi ela quem viu, com o print aberto: dentro do modal "Editar o dia" a lista
// aparecia CORTADA em duas linhas e meia. "Precisa melhorar a usabilidade, não tem como
// escolher se não visualizamos. Toda vez que for criar ou mudar alguma coisa tem que lembrar
// disso." Item que a busca acha e a pessoa não consegue ver é item não encontrado.
//
// Por isso a lista sai por PORTAL, presa à TELA (position: fixed) e não à caixa onde o campo
// mora: nenhum modal, nenhuma rolagem e nenhum rodapé corta ela. Quando não cabe embaixo,
// ela abre pra cima.

export type ItemBuscavel = { id?: string; nome: string; valorPadrao?: number | null; [k: string]: any };

/** Espaço mínimo pra lista valer a pena embaixo; menos que isso, ela sobe. */
const ALTURA_MIN = 180;
const ALTURA_MAX = 320;

export default function BuscaItemCatalogo({
  value, itens, onType, onPick, placeholder, inpStyle, className, disabled, autoFocus, limite = 40, rotuloDe,
}: {
  value: string;
  itens: readonly ItemBuscavel[];
  onType: (val: string) => void;
  onPick: (item: ItemBuscavel) => void;
  placeholder?: string;
  inpStyle?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  limite?: number;
  /** Etiqueta extra à direita do nome (o laboratório do exame, por exemplo). */
  rotuloDe?: (item: ItemBuscavel) => string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState(value || "");
  const [caixa, setCaixa] = useState<{ left: number; width: number; top?: number; bottom?: number; altura: number } | null>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => { setQ(value || ""); }, [value]);

  const r = useMemo(() => buscarItens(itens, q, (i) => i.nome, limite), [itens, q, limite]);
  const aviso = avisoDeCorte(r);
  const mostrar = aberto && !disabled && q.trim().length > 0;

  /** Onde a lista deve aparecer NA TELA — não dentro da caixa onde o campo mora. */
  const medir = useCallback(() => {
    const el = campo.current;
    if (!el) return;
    const c = el.getBoundingClientRect();
    const abaixo = window.innerHeight - c.bottom - 8;
    const acima = c.top - 8;
    // Não cabe embaixo mas cabe em cima? Sobe. É o caso do campo perto do rodapé do modal.
    if (abaixo < ALTURA_MIN && acima > abaixo) {
      setCaixa({ left: c.left, width: c.width, bottom: window.innerHeight - c.top + 4, altura: Math.min(ALTURA_MAX, acima) });
    } else {
      setCaixa({ left: c.left, width: c.width, top: c.bottom + 4, altura: Math.min(ALTURA_MAX, abaixo) });
    }
  }, []);

  useLayoutEffect(() => { if (mostrar) medir(); }, [mostrar, medir, r.itens.length]);

  useEffect(() => {
    if (!mostrar) return;
    // `true` no capture: pega a rolagem de QUALQUER caixa por dentro, não só a da janela —
    // é o que mantém a lista colada no campo dentro de um modal que rola.
    const refaz = () => medir();
    window.addEventListener("scroll", refaz, true);
    window.addEventListener("resize", refaz);
    return () => { window.removeEventListener("scroll", refaz, true); window.removeEventListener("resize", refaz); };
  }, [mostrar, medir]);

  const lista = mostrar && caixa && typeof document !== "undefined" ? createPortal(
    <div
      style={{
        position: "fixed", left: caixa.left, width: caixa.width,
        ...(caixa.top != null ? { top: caixa.top } : { bottom: caixa.bottom }),
        maxHeight: caixa.altura, overflowY: "auto",
        zIndex: 9999, background: "#fff", border: "1px solid #E8E2D6", borderRadius: 10,
        boxShadow: "0 12px 32px -8px rgba(0,0,0,.22)",
      }}
      // O clique escolhe; o mousedown não pode tirar o foco do campo antes disso.
      onMouseDown={(e) => e.preventDefault()}
    >
      {r.itens.length === 0 && (
        <div style={{ padding: "10px 12px", fontSize: 12.5, color: "#8A7F6E" }}>
          Nenhum item com “{q.trim()}”. Tente uma palavra só.
        </div>
      )}
      {r.itens.map((s, i) => {
        const rot = rotuloDe?.(s);
        return (
          <button
            key={s.id || `${s.nome}-${i}`}
            type="button"
            onClick={() => { onPick(s); setQ(s.nome); setAberto(false); }}
            style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 10, padding: "9px 12px", border: "none", borderBottom: "1px solid #F0EBE0", background: "#fff", cursor: "pointer", fontSize: 13, textAlign: "left", lineHeight: 1.3 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F5FBFC"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1F2A2E" }}>
              {s.nome}{rot ? <span style={{ color: "#8A7F6E" }}> · {rot}</span> : null}
            </span>
            <span style={{ color: "#0F6E56", fontWeight: 600, flexShrink: 0 }}>
              {Number(s.valorPadrao || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </button>
        );
      })}
      {/* O corte deixa de ser mudo: quem procura sabe que tem mais e o que fazer. */}
      {aviso && <div style={{ padding: "7px 12px", fontSize: 11.5, color: "#8A7F6E", background: "#FAF7F1" }}>{aviso}</div>}
    </div>,
    document.body,
  ) : null;

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input
        ref={campo}
        value={q}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder || "🔍 Produto, serviço ou pacote"}
        style={inpStyle}
        className={className}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={(e) => { if (e.key === "Escape") setAberto(false); }}
        onChange={(e) => { setQ(e.target.value); onType(e.target.value); setAberto(true); }}
      />
      {lista}
    </div>
  );
}

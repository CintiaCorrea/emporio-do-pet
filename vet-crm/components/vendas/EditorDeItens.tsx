"use client";
// O EDITOR DE ITENS — um só, para toda tela que lança item numa venda, comanda ou orçamento.
//
// A Cintia, em 08/09/2026: "não é mais fácil TODAS as telas que trazem vendas e orçamento
// seguirem o mesmo padrão, quando for necessário fazer lançamentos, vendas ou orçamento?"
//
// É. Hoje o mesmo gesto — achar o item, escolher quantidade, corrigir o preço, tirar a linha —
// está escrito de novo em cada tela: ponto de venda, comanda da ficha do pet, internação e
// orçamento. Cada um nasceu na sua vez, e é daí que vêm as diferenças que ela vinha achando o
// dia todo (o texto do WhatsApp em duas versões, o dinheiro em dezesseis formatos).
//
// Este componente é a primeira peça do padrão único. Ele NÃO sabe salvar: recebe as linhas e
// devolve as linhas mudadas. Quem grava é a tela, porque cada uma grava num lugar diferente
// (venda, comanda, orçamento, conta da internação) — e é justamente isso que não dá para
// unificar sem inventar regra.
//
// O que ele garante, e que hoje varia de tela para tela:
//   · o item entra pelo núcleo `linhaDoItem` (preço de hoje, identidade do exame, faixa de peso);
//   · a busca é a mesma `buscarItens`, com o aviso de corte;
//   · dinheiro sempre com dois dígitos depois da vírgula;
//   · quantidade nunca fica zero ou negativa — quem quer tirar a linha usa a lixeira.

import { useEffect, useMemo, useState } from "react";
import { LuTrash2, LuSearch } from "react-icons/lu";
import { carregarCatalogoVendavel, linhaDoItem, ItemVendavel } from "@/lib/catalogoVendavel";
import { buscarItens, avisoDeCorte } from "@/lib/buscaCatalogo";
// A CONTA MORA EM lib/linhasDeVenda: conta se testa, aparencia nao.
import { LinhaEditavel, totalDaLinha, totalDasLinhas } from "@/lib/linhasDeVenda";
export type { LinhaEditavel };

const TEAL = "#009AAC";
const NAVY = "#014D5E";
const LINE = "#E8E2D6";
const MUT = "#5C6B70";
const VERMELHO = "#A32D2D";

const BRL = (v: any) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

type Props = {
  linhas: LinhaEditavel[];
  onMudar: (linhas: LinhaEditavel[]) => void;
  /** Peso do pet, para o item com preço por faixa de peso vir com o preço certo. */
  pesoKg?: number | null;
  /** Só leitura: mostra as linhas sem deixar mexer (a mesma aparência, sem os controles). */
  somenteLeitura?: boolean;
  /** Texto quando não há item nenhum. */
  vazio?: string;
};

export default function EditorDeItens({ linhas, onMudar, pesoKg, somenteLeitura, vazio }: Props) {
  const [catalogo, setCatalogo] = useState<ItemVendavel[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);

  // O catálogo só é buscado quando a pessoa vai mesmo lançar — em leitura, não gasta rede.
  useEffect(() => {
    if (somenteLeitura || catalogo.length) return;
    setCarregando(true);
    carregarCatalogoVendavel({ exames: true })
      .then((c) => setCatalogo(c || []))
      .catch(() => setCatalogo([]))
      .finally(() => setCarregando(false));
  }, [somenteLeitura, catalogo.length]);

  const achados = useMemo(
    () => buscarItens(catalogo, busca, (i) => i.nome),
    [catalogo, busca],
  );

  const trocar = (i: number, campos: Partial<LinhaEditavel>) =>
    onMudar(linhas.map((l, k) => (k === i ? { ...l, ...campos } : l)));

  const remover = (i: number) => onMudar(linhas.filter((_, k) => k !== i));

  const acrescentar = (item: ItemVendavel) => {
    // O NÚCLEO decide o que a linha carrega (preço de hoje, exame, faixa de peso). A tela não
    // remonta esses campos à mão — foi assim que as telas passaram a divergir.
    const l = linhaDoItem(item, pesoKg ?? undefined);
    onMudar([
      ...linhas,
      {
        descricao: l.descricao, quantidade: 1, valorUnitario: l.valorUnitario,
        custoUnitario: l.custoUnitario, servicoId: l.servicoId, productId: l.productId,
        catalogoItemId: l.catalogoItemId, catalogoExameId: l.catalogoExameId,
        fornecedorId: l.fornecedorId, _exame: l._exame, _novo: l._novo,
      },
    ]);
    setBusca("");
  };

  const campo: React.CSSProperties = { border: `1px solid ${LINE}`, borderRadius: 7, padding: "4px 7px", fontSize: 12.5, background: "#fff", color: NAVY };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {linhas.length === 0 && (
        <div style={{ fontSize: 12.5, color: MUT, padding: "8px 0" }}>{vazio || "Nenhum item lançado."}</div>
      )}

      {linhas.map((l, i) => (
        <div key={l.id || `${l.descricao}-${i}`} style={{ display: "flex", alignItems: "center", gap: 7, background: "#FBF9F4", border: `1px solid ${LINE}`, borderRadius: 9, padding: "7px 9px" }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: NAVY }}>{l.descricao}</span>

          {somenteLeitura ? (
            <span style={{ fontSize: 12, color: MUT }}>x{l.quantidade}</span>
          ) : (
            <>
              {/* Quantidade nunca chega a zero: quem quer tirar a linha usa a lixeira. Zero
                  deixaria uma linha que não cobra nada e ninguém entende por que está ali. */}
              <input
                type="number" min={1} step={1} value={l.quantidade}
                onChange={(e) => trocar(i, { quantidade: Math.max(1, Number(e.target.value) || 1) })}
                title="Quantidade" aria-label={`Quantidade de ${l.descricao}`}
                style={{ ...campo, width: 56, textAlign: "center" }}
              />
              <input
                type="number" min={0} step="0.01" value={l.valorUnitario}
                onChange={(e) => trocar(i, { valorUnitario: Math.max(0, Number(e.target.value) || 0) })}
                title="Valor unitário" aria-label={`Valor unitário de ${l.descricao}`}
                style={{ ...campo, width: 92, textAlign: "right" }}
              />
            </>
          )}

          <span style={{ fontSize: 12.5, fontWeight: 600, color: NAVY, minWidth: 92, textAlign: "right" }}>{BRL(totalDaLinha(l))}</span>

          {!somenteLeitura && (
            <button
              type="button" onClick={() => remover(i)}
              title={`Tirar ${l.descricao} da lista`} aria-label={`Tirar ${l.descricao}`}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, border: `1px solid ${LINE}`, background: "#fff", color: VERMELHO, cursor: "pointer", flex: "0 0 auto" }}
            >
              <LuTrash2 size={13} />
            </button>
          )}
        </div>
      ))}

      {!somenteLeitura && (
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${LINE}`, borderRadius: 9, padding: "6px 9px", background: "#fff" }}>
            <LuSearch size={13} color={MUT} />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={carregando ? "Carregando o catálogo…" : "Acrescentar item — digite o nome"}
              aria-label="Acrescentar item"
              style={{ flex: 1, border: "none", outline: "none", fontSize: 12.5, color: NAVY, background: "transparent" }}
            />
          </div>

          {busca.trim().length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 30, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, boxShadow: "0 10px 26px rgba(1,43,46,.13)", maxHeight: 240, overflowY: "auto" }}>
              {achados.itens.length === 0 && (
                <div style={{ padding: "10px 12px", fontSize: 12.5, color: MUT }}>
                  Nada no catálogo com esse nome.
                </div>
              )}
              {achados.itens.map((item) => (
                <button
                  key={item.id} type="button" onClick={() => acrescentar(item)}
                  style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 10, alignItems: "center", border: "none", background: "#fff", padding: "8px 12px", cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontSize: 12.5, color: NAVY, minWidth: 0 }}>{item.nome}</span>
                  <span style={{ fontSize: 12, color: MUT, whiteSpace: "nowrap" }}>{BRL(item.valorPadrao)}</span>
                </button>
              ))}
              {/* O AVISO DE CORTE: a lista mostra 40. Sem ele, o item que ficou de fora "não
                  existe" para quem está procurando. */}
              {avisoDeCorte(achados) && (
                <div style={{ padding: "7px 12px", fontSize: 11, color: MUT, borderTop: `1px solid ${LINE}` }}>{avisoDeCorte(achados)}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${LINE}`, paddingTop: 8 }}>
        <span style={{ fontSize: 12.5, color: MUT }}>{linhas.length} {linhas.length === 1 ? "item" : "itens"}</span>
        <b style={{ fontSize: 14, color: TEAL }}>{BRL(totalDasLinhas(linhas))}</b>
      </div>
    </div>
  );
}

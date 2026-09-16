"use client";
// A ETIQUETA DO QUE O CLIENTE DEVE — a mesma em toda tela onde ele aparece.
//
// Cintia, 15/09/2026, com o print da ficha do Lucas: "no nome do cliente não tem tag com o valor
// devedor, que deve acompanhar em todas as telas do sistema".
//
// E tinha coisa pior que a falta: a ficha dele mostrava "Em dia" enquanto ele devia R$ 3.842,25.
// Aquele selo fala do RELACIONAMENTO (frequência de visita), não de dinheiro — mas ninguém lê
// assim ao lado do nome. Sem a etiqueta do saldo, a tela dizia que estava tudo certo.
//
// É um componente só, e não um cálculo repetido em cada tela, porque saldo que aparece em
// quatro lugares com quatro contas diferentes é pior do que saldo que não aparece: a equipe
// deixa de confiar no número.

import { useEffect, useState } from "react";
import Link from "next/link";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Soma do que este cliente ainda deve. `null` enquanto carrega — a tela não pisca um "R$ 0,00". */
export function useSaldoDevedor(tutorId?: string | null): number | null {
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    if (!tutorId) { setSaldo(null); return; }
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`/api/caixa/vendas?abertas=true&tutorId=${encodeURIComponent(tutorId)}`, { cache: "no-store" });
        if (!r.ok) return;
        const arr = await r.json();
        const soma = (Array.isArray(arr) ? arr : []).reduce(
          (s: number, x: any) => s + Math.max(0, Number(x.valor || 0) - Number(x.pago || 0)),
          0,
        );
        if (vivo) setSaldo(Number(soma.toFixed(2)));
      } catch { /* sem saldo a tela continua inteira — a etiqueta é um extra */ }
    })();
    return () => { vivo = false; };
  }, [tutorId]);

  return saldo;
}

/**
 * A etiqueta. Some quando não há dívida — "deve R$ 0,00" é ruído em toda ficha em dia.
 *
 * Leva para a tela de vendas já filtrada pelo cliente: ver que ele deve e não ter como agir
 * dali obriga a pessoa a decorar o nome e procurar de novo.
 */
export default function SaldoDevedorTag({
  tutorId,
  nome,
  compacto,
}: {
  tutorId?: string | null;
  /** Para a busca já abrir no cliente certo. */
  nome?: string | null;
  /** Em cabeçalhos apertados (linha do pet), só o valor. */
  compacto?: boolean;
}) {
  const saldo = useSaldoDevedor(tutorId);
  if (saldo == null || saldo <= 0.009) return null;

  const texto = compacto ? brl(saldo) : `Deve ${brl(saldo)}`;
  const estilo: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 4,
    background: "#FBE4E2", color: "#b23b3b", border: "1px solid #F0C9C7",
    borderRadius: 999, padding: compacto ? "1px 7px" : "2px 9px",
    fontSize: compacto ? 10.5 : 11.5, fontWeight: 700, whiteSpace: "nowrap",
    textDecoration: "none",
  };

  if (!nome) return <span style={estilo} title="Vendas em aberto deste cliente">{texto}</span>;
  return (
    <Link
      href={`/dashboard/erp/consulta-vendas?cliente=${encodeURIComponent(tutorId || "")}&nome=${encodeURIComponent(nome)}`}
      onClick={(e) => e.stopPropagation()}
      target="_blank"
      rel="noopener"
      style={estilo}
      title="Ver as vendas em aberto deste cliente"
    >{texto}</Link>
  );
}

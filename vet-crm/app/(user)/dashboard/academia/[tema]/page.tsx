// Cada parte da Academia tem o seu endereço — é o que deixa o menu lateral do sistema
// marcar a parte aberta, e o que permite mandar o link de uma parte para alguém.
"use client";
import { useParams } from "next/navigation";
import Academia from "@/components/academia/Academia";

export default function Pagina() {
  const p = useParams();
  const tema = Array.isArray(p?.tema) ? p.tema[0] : (p?.tema as string | undefined);
  return <Academia temaInicial={tema} />;
}

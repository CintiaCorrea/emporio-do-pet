"use client";
/* Mostra o corpo de um documento: renderiza HTML se for rico, senão texto puro
   (preservando quebras de linha). Seguro para os dois formatos (antigo e novo). */
import { CSSProperties } from "react";
import { ehHtmlDoc } from "@/lib/documentos/variaveis";

export default function DocConteudo({
  text,
  className,
  style,
}: {
  text?: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  const s = text || "";
  if (ehHtmlDoc(s)) {
    return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: s }} />;
  }
  return (
    <div className={className} style={{ whiteSpace: "pre-wrap", ...(style || {}) }}>
      {s}
    </div>
  );
}

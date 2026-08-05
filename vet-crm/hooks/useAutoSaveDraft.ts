"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · Auto-save de rascunho (SILENCIOSO)   [EMP-COWORK]
   Guarda o formulário no localStorage enquanto a pessoa preenche e
   RESTAURA sozinho quando ela volta — sem mensagem, sem botão.
   Some quando salva de verdade (chamar clear()).

   Pedido da Cintia (24/07): "às vezes precisamos sair da tela e quando
   voltamos sumiu tudo". Rede de proteção 100% local — não toca no banco.

   Regras de segurança:
   - `key` tem que ser ESTÁVEL e ESPECÍFICA por registro (ex.: `atd:novo:<petId>`)
     pra um rascunho nunca vazar pra outro registro.
   - `enabled` só liga quando o form já carregou os dados-base (senão a
     restauração brigaria com o carregamento). Enquanto false, nada é salvo.
   - `isVazio` evita guardar (ou apaga) rascunho vazio.
   ───────────────────────────────────────────────────────────── */
import { useEffect, useRef } from "react";

const DIA_MS = 24 * 60 * 60 * 1000;

export function useAutoSaveDraft<T>(opts: {
  key: string;
  value: T;
  onRestore: (saved: T) => void;
  enabled?: boolean;
  isVazio?: (v: T) => boolean;
  debounceMs?: number;
  maxAgeMs?: number; // rascunho mais velho que isso é ignorado (padrão: 24h)
}) {
  const { key, value, onRestore, enabled = true, isVazio, debounceMs = 600, maxAgeMs = DIA_MS } = opts;
  const restauradoRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  // Restaura UMA vez, assim que habilitar e a chave existir.
  useEffect(() => {
    if (!enabled || !key || restauradoRef.current) return;
    restauradoRef.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const wrap = JSON.parse(raw);
        // Formato: { t: <timestamp>, v: <dados> }. Ignora e apaga se muito velho.
        if (wrap && typeof wrap === "object" && "v" in wrap) {
          const idade = Date.now() - Number(wrap.t || 0);
          if (idade > maxAgeMs) { localStorage.removeItem(key); }
          else if (wrap.v && typeof wrap.v === "object") onRestoreRef.current(wrap.v as T);
        }
      }
    } catch { /* rascunho ilegível = ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  // Salva (debounced) a cada mudança — só depois de restaurado.
  useEffect(() => {
    if (!enabled || !key || !restauradoRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        if (isVazio && isVazio(value)) { localStorage.removeItem(key); return; }
        localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
      } catch { /* localStorage cheio/indisponível = ignora */ }
    }, debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, key]);

  const clear = () => {
    try { localStorage.removeItem(key); } catch { /* ok */ }
  };

  return { clear };
}

"use client";
/* ───────────────────────────────────────────────────────────────
   Editor de documentos (rico) — barra de formatação + painel de
   variáveis clicáveis + prévia com timbrado e dados de exemplo.
   Guarda o conteúdo como HTML (com as @VARIÁVEIS@ em texto puro).
   Reutilizado em: Configurações › Modelos de documento e na ficha do pet.
   ─────────────────────────────────────────────────────────────── */
import { useEffect, useRef, useState } from "react";
import { CATALOGO_VARIAVEIS, CTX_EXEMPLO, preencherVariaveis } from "@/lib/documentos/variaveis";
import { montarTimbradoHtml } from "@/lib/documentos/timbrado";

function isHtml(s: string): boolean {
  return /<[a-z/!]/i.test(s || "");
}
function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// texto/HTML do banco → HTML do editor, com as @VAR@ viradas em "etiquetas" visuais
function paraEditor(value: string): string {
  let html = isHtml(value) ? value : escapeHtml(value || "").replace(/\n/g, "<br>");
  // desfaz etiquetas antigas e reenvolve todas as @VAR@ (idempotente)
  html = html.replace(/<span class="vtag"[^>]*>(@[A-Z0-9_]+@)<\/span>/gi, "$1");
  html = html.replace(/@([A-Z0-9_]+)@/g, '<span class="vtag">@$1@</span>');
  return html;
}
// HTML do editor → corpo limpo (etiquetas viram texto @VAR@ de novo)
function corpoLimpo(html: string): string {
  const d = document.createElement("div");
  d.innerHTML = html;
  d.querySelectorAll(".vtag").forEach((s) => s.replaceWith(document.createTextNode(s.textContent || "")));
  return d.innerHTML;
}

export default function EditorDocumento({
  value,
  onChange,
  palette = false,
  preview = false,
  minHeight = 220,
}: {
  value: string;
  onChange: (corpo: string) => void;
  palette?: boolean;
  preview?: boolean;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [previewHtml, setPreviewHtml] = useState("");
  const [clinica, setClinica] = useState<any>(null);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({ Animal: true });

  // timbrado/dados da clínica p/ o cabeçalho da prévia
  useEffect(() => {
    if (!preview) return;
    (async () => {
      try {
        const r = await fetch("/api/listas?lista=dadosclinica", { cache: "no-store" });
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
        if (arr[0]?.valor) setClinica(JSON.parse(arr[0].valor));
      } catch {}
    })();
  }, [preview]);

  // carrega o conteúdo quando muda de fora (ex.: trocar de modelo)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (corpoLimpo(el.innerHTML) !== (value || "")) {
      el.innerHTML = paraEditor(value || "");
      atualizarPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function emitir() {
    if (ref.current) onChange(corpoLimpo(ref.current.innerHTML));
    atualizarPreview();
  }

  function atualizarPreview() {
    if (!preview || !ref.current) return;
    const corpo = corpoLimpo(ref.current.innerHTML);
    const ctx = { ...CTX_EXEMPLO, clinica: clinica || CTX_EXEMPLO.clinica };
    setPreviewHtml(preencherVariaveis(corpo, ctx, { htmlSafe: true }));
  }
  useEffect(() => { atualizarPreview(); /* eslint-disable-next-line */ }, [clinica]);

  function cmd(comando: string, valor?: string) {
    ref.current?.focus();
    try { document.execCommand(comando, false, valor); } catch {}
    emitir();
  }
  function inserirHtml(html: string) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node: ChildNode | null;
      let last: ChildNode | null = null;
      while ((node = tmp.firstChild)) { last = frag.appendChild(node); }
      range.insertNode(frag);
      if (last) { range.setStartAfter(last); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); }
    } else {
      el.innerHTML += html;
    }
    emitir();
  }
  function inserirVariavel(codigo: string) {
    inserirHtml(`<span class="vtag">@${codigo}@</span>&nbsp;`);
  }
  function inserirTabela() {
    inserirHtml('<table><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>');
  }

  return (
    <div>
      <style>{`
        .edt-vtag{background:#E0F4F6;color:#007B8A;border-radius:5px;padding:0 3px;font-weight:600;white-space:nowrap}
        .edt-area .vtag{background:#E0F4F6;color:#007B8A;border-radius:5px;padding:0 3px;font-weight:600;white-space:nowrap}
        .edt-area table{border-collapse:collapse;margin:8px 0}
        .edt-area td{border:1px solid #E8DFC8;padding:5px 9px;min-width:60px}
        .edt-area:focus{outline:none}
        .edt-tb button:hover{background:#E0F4F6;color:#007B8A}
        .edt-chip:hover{background:#009AAC!important;color:#fff!important;border-color:#009AAC!important}
      `}</style>

      <div className={palette ? "grid gap-3" : ""} style={palette ? { gridTemplateColumns: "1fr 230px" } : undefined}>
        {/* Coluna do editor */}
        <div>
          <div className="edt-tb flex flex-wrap gap-0.5 p-1.5 border rounded-t-lg" style={{ borderColor: "#E8DFC8", background: "#FCFBF7" }}>
            <select onChange={(e) => { if (e.target.value) cmd("fontSize", e.target.value); e.currentTarget.selectedIndex = 0; }} className="h-8 border rounded-md text-xs px-1" style={{ borderColor: "#E8DFC8" }} defaultValue="">
              <option value="">Tamanho</option>
              <option value="2">Pequeno</option>
              <option value="3">Normal</option>
              <option value="5">Grande</option>
              <option value="6">Título</option>
            </select>
            <span className="w-px my-1 mx-1" style={{ background: "#E8DFC8" }} />
            <button type="button" onClick={() => cmd("bold")} className="h-8 min-w-8 px-2 rounded-md font-extrabold text-sm" title="Negrito">B</button>
            <button type="button" onClick={() => cmd("italic")} className="h-8 min-w-8 px-2 rounded-md italic text-sm" title="Itálico">I</button>
            <button type="button" onClick={() => cmd("underline")} className="h-8 min-w-8 px-2 rounded-md underline text-sm" title="Sublinhado">U</button>
            <span className="w-px my-1 mx-1" style={{ background: "#E8DFC8" }} />
            <button type="button" onClick={() => cmd("insertUnorderedList")} className="h-8 px-2 rounded-md text-xs" title="Lista">• Lista</button>
            <button type="button" onClick={() => cmd("insertOrderedList")} className="h-8 px-2 rounded-md text-xs" title="Lista numerada">1. Lista</button>
            <span className="w-px my-1 mx-1" style={{ background: "#E8DFC8" }} />
            <button type="button" onClick={() => cmd("justifyLeft")} className="h-8 min-w-8 px-2 rounded-md text-xs" title="Esquerda">⯇</button>
            <button type="button" onClick={() => cmd("justifyCenter")} className="h-8 min-w-8 px-2 rounded-md text-xs" title="Centralizar">≡</button>
            <span className="w-px my-1 mx-1" style={{ background: "#E8DFC8" }} />
            <button type="button" onClick={inserirTabela} className="h-8 px-2 rounded-md text-xs" title="Inserir tabela">▦ Tabela</button>
          </div>
          <div
            ref={ref}
            className="edt-area border rounded-b-lg px-4 py-3 text-sm overflow-auto"
            style={{ borderColor: "#E8DFC8", borderTop: "none", minHeight, maxHeight: "52vh", overflowY: "auto", lineHeight: 1.6, color: "#33454A", background: "#fff" }}
            contentEditable
            suppressContentEditableWarning
            onInput={emitir}
          />
        </div>

        {/* Painel de variáveis */}
        {palette && (
          <div className="border rounded-lg overflow-hidden self-start" style={{ borderColor: "#E8DFC8", background: "#FCFBF7" }}>
            <div className="px-3 py-2 text-xs font-bold border-b" style={{ color: "#014D5E", borderColor: "#E8DFC8", background: "#fff" }}>🏷️ Variáveis</div>
            <div className="px-3 py-1.5 text-[11px] leading-tight" style={{ color: "#7C8A8E" }}>Clique pra inserir no texto.</div>
            <div className="overflow-auto" style={{ maxHeight: 380, padding: 4 }}>
              {CATALOGO_VARIAVEIS.map((grp) => (
                <div key={grp.grupo}>
                  <button type="button" onClick={() => setAbertos((a) => ({ ...a, [grp.grupo]: !a[grp.grupo] }))} className="w-full text-left px-2.5 py-2 text-xs font-bold rounded-md flex justify-between items-center" style={{ color: "#014D5E" }}>
                    {grp.grupo}<span style={{ color: "#7C8A8E", fontSize: 10 }}>{abertos[grp.grupo] ? "▼" : "▶"}</span>
                  </button>
                  {abertos[grp.grupo] && (
                    <div className="flex flex-wrap gap-1 px-2 pb-2.5">
                      {grp.itens.map((v) => (
                        <button key={v.codigo} type="button" onClick={() => inserirVariavel(v.codigo)} title={`@${v.codigo}@`} className="edt-chip border rounded-full px-2.5 py-1 text-[11px]" style={{ borderColor: "#E8DFC8", background: "#fff", color: "#007B8A" }}>
                          {v.rotulo}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prévia com timbrado + dados de exemplo */}
      {preview && (
        <div className="mt-3">
          <div className="text-[11px] font-bold uppercase tracking-wide mb-1.5 flex items-center gap-2" style={{ color: "#7C8A8E" }}>
            Pré-visualização
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "#E0F4F6", color: "#007B8A" }}>👁️ dados de exemplo</span>
          </div>
          <div className="border rounded-xl bg-white px-7 py-6" style={{ borderColor: "#E8DFC8" }}>
            {/* Timbrado OFICIAL — o MESMO do mockup aprovado e da impressão (montarTimbradoHtml).
                Antes o preview desenhava um cabeçalho próprio (logo "EP" + linha turquesa) que
                divergia do documento impresso. Agora prévia = impressão. */}
            <div dangerouslySetInnerHTML={{ __html: montarTimbradoHtml({ clinica: clinica || CTX_EXEMPLO.clinica, pet: CTX_EXEMPLO.pet, tutor: CTX_EXEMPLO.tutor }) }} />
            <div className="text-[13px] leading-relaxed mt-4" style={{ color: "#26343a", whiteSpace: "normal" }} dangerouslySetInnerHTML={{ __html: previewHtml || '<span style="color:#9aa">Comece a escrever para ver a prévia…</span>' }} />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
/* Tela de reporte de bugs / melhorias — fase de teste (Cintia 13/07).
   Envia por e-mail pro admin + guarda registro em Listas (bug_report). */
import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { LuBug, LuUpload, LuCheck } from "react-icons/lu";

const TEAL = "#009AAC";
const NAVY = "#0E2244";
const LINE = "#E1DED4";

export default function ReportarBugPage() {
  const { data: session } = useSession();
  const [nome, setNome] = useState((session as any)?.user?.name || "");
  const [email, setEmail] = useState((session as any)?.user?.email || "");
  const [descricao, setDescricao] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    if (!descricao.trim()) { toast.error("Descreva o bug ou a sugestão."); return; }
    setEnviando(true);
    let printUrl = "";
    try {
      if (file) {
        try {
          const fd = new FormData();
          fd.append("file", file);
          const up = await fetch("/api/whatsapp-templates/upload-media", { method: "POST", body: fd });
          const ud = await up.json().catch(() => ({} as any));
          printUrl = ud?.url || ud?.mediaUrl || ud?.link || ud?.location || "";
        } catch { /* print é best-effort */ }
      }
      const payload = { nome, email, descricao, printUrl, createdAt: new Date().toISOString() };
      // registro
      await fetch("/api/listas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lista: "bug_report", valor: JSON.stringify(payload) }),
      }).catch(() => {});
      // e-mail pro admin
      const html = `<b>🐞 Novo reporte de bug</b><br><br>` +
        `<b>Nome:</b> ${nome || "—"}<br><b>E-mail:</b> ${email || "—"}<br><br>` +
        `<b>Descrição:</b><br>${(descricao || "").replace(/\n/g, "<br>")}` +
        (printUrl ? `<br><br><b>Print:</b> <a href="${printUrl}">${printUrl}</a>` : "");
      await fetch("/api/email/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "adm.emporiodopet@gmail.com", subject: `🐞 Bug/Sugestão: ${nome || email || "reporte"}`, html }),
      }).catch(() => {});
      setEnviado(true);
    } catch { toast.error("Não consegui enviar. Tente de novo."); }
    setEnviando(false);
  }

  const inp: React.CSSProperties = {
    width: "100%", marginTop: 6, padding: "10px 12px", border: `1px solid ${LINE}`,
    borderRadius: 9, fontSize: 14, color: NAVY, background: "#fff", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { fontSize: 13, fontWeight: 500, color: NAVY };

  if (enviado) {
    return (
      <div style={{ maxWidth: 560, margin: "40px auto", padding: 24, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#E7F7EF", color: "#0F6E56", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <LuCheck size={28} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: NAVY, margin: "0 0 6px" }}>Reporte enviado! 🙌</h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 20px" }}>Valeu por ajudar a melhorar a plataforma. A equipe vai analisar.</p>
        <button onClick={() => { setDescricao(""); setFile(null); setEnviado(false); }}
          style={{ background: TEAL, color: "#fff", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
          Enviar outro
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", padding: "16px 28px 48px", boxSizing: "border-box" }}>
      <h1 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 4 }}>
        <LuBug size={22} style={{ color: TEAL }} /> Reportar bugs
      </h1>
      <p style={{ color: "#64748b", fontSize: 13.5, marginBottom: 22 }}>
        Este canal é somente para <b>reportar bugs</b> e <b>sugerir melhorias</b> na plataforma.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={lbl}>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Digite a sua resposta" style={inp} />
        </div>
        <div>
          <label style={lbl}>E-mail cadastrado na plataforma</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Insira o seu endereço de e-mail" style={inp} />
        </div>
        <div>
          <label style={lbl}>Descreva o bug ou a sugestão <span style={{ color: "#DC2626" }}>*</span></label>
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Digite a sua resposta" rows={5} style={{ ...inp, resize: "vertical" as const }} />
        </div>
        <div>
          <label style={lbl}>Envie um print do erro</label>
          <label style={{ marginTop: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "22px 12px", border: `1.5px dashed ${LINE}`, borderRadius: 10, cursor: "pointer", background: "#FAFAF7", color: "#64748b", fontSize: 13 }}>
            <LuUpload size={20} style={{ color: TEAL }} />
            {file ? <span style={{ color: NAVY, fontWeight: 500 }}>{file.name}</span> : <><span style={{ color: NAVY, fontWeight: 500 }}>Selecione os arquivos</span><span style={{ fontSize: 11.5 }}>ou arraste e solte aqui</span></>}
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ display: "none" }} />
          </label>
        </div>
        <button onClick={enviar} disabled={enviando}
          style={{ alignSelf: "flex-start", marginTop: 4, background: enviando ? "#9aa0a8" : TEAL, color: "#fff", border: "none", borderRadius: 9, padding: "11px 26px", fontSize: 14.5, fontWeight: 500, cursor: enviando ? "default" : "pointer" }}>
          {enviando ? "Enviando…" : "Enviar"}
        </button>
      </div>
    </div>
  );
}

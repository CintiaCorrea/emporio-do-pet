"use client";
import { useState } from "react";
import { buscarCep } from "@/lib/cep";

const TEAL = "#009AAC";
const NAVY = "#014D5E";

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");
function maskDate(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  const p: string[] = [];
  if (d.length > 0) p.push(d.slice(0, 2));
  if (d.length >= 3) p.push(d.slice(2, 4));
  if (d.length >= 5) p.push(d.slice(4, 8));
  return p.join("/");
}

export default function CadastroPublicoPage() {
  const [f, setF] = useState({
    name: "", cpf: "", birthDate: "", cep: "", address: "", phone: "", email: "",
    petName: "", petSpecies: "", petBirthDate: "", petBreed: "", petAge: "", petWeight: "", howFoundUs: "",
  });
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [erro, setErro] = useState("");
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function autoCep(cep: string) {
    if (onlyDigits(cep).length !== 8) return;
    const info = await buscarCep(cep);
    if (info) up("address", [info.logradouro, info.bairro, info.localidade, info.uf].filter(Boolean).join(", "));
  }

  async function enviar() {
    setErro("");
    if (!f.name.trim()) { setErro("Por favor, preencha seu nome completo."); return; }
    if (onlyDigits(f.phone).length < 10) { setErro("Por favor, informe um telefone válido com DDD."); return; }
    if (!consent) { setErro("Marque a autorização de uso dos dados para continuar."); return; }
    setSending(true);
    try {
      const r = await fetch("/api/public/cadastro", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) { setErro(d?.message || "Não foi possível enviar. Tente de novo."); setSending(false); return; }
      setDone(true);
    } catch { setErro("Sem conexão. Tente de novo em instantes."); setSending(false); }
  }

  const lbl: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 600, color: "#5C6B70", marginBottom: 5 };
  const inp: React.CSSProperties = { width: "100%", padding: "11px 12px", border: "1px solid #D9E6E8", borderRadius: 11, fontSize: 15, color: "#14253a", boxSizing: "border-box", background: "#fff", outline: "none" };
  const secTit: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.4, margin: "6px 0 2px" };

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: "#F6F2EA", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#fff", border: "1px solid #E8E2D6", borderRadius: 18, padding: "34px 26px", maxWidth: 460, textAlign: "center" }}>
          <div style={{ fontSize: 46 }}>🐾💙</div>
          <h1 style={{ fontSize: 22, color: NAVY, margin: "10px 0 6px", fontWeight: 700 }}>Recebemos seu cadastro!</h1>
          <p style={{ fontSize: 15, color: "#5C6B70", lineHeight: 1.5 }}>Obrigado! Nossa equipe do <b>Empório do Pet</b> vai conferir seus dados e confirmar em breve. 💙</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F6F2EA", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 40 }}>🐾💙</div>
          <h1 style={{ fontSize: 25, color: NAVY, fontWeight: 700, margin: "6px 0 3px" }}>Queremos te conhecer!</h1>
          <p style={{ fontSize: 15, color: "#5C6B70", lineHeight: 1.5 }}>Conta pra gente um pouquinho sobre você e seu pet 🐶🐱<br/>Leva só 2 minutinhos e ajuda a gente a cuidar melhor. 💙</p>
        </div>

        <div style={{ background: "#fff", border: "1px solid #E8E2D6", borderRadius: 18, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 13 }}>
          <div style={secTit}>Seus dados</div>
          <div><label style={lbl}>Nome completo *</label><input style={inp} value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="Seu nome" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Telefone (WhatsApp) *</label><input style={inp} value={f.phone} onChange={(e) => up("phone", e.target.value)} inputMode="tel" placeholder="(85) 9 9999-9999" /></div>
            <div><label style={lbl}>CPF</label><input style={inp} value={f.cpf} onChange={(e) => up("cpf", e.target.value)} inputMode="numeric" placeholder="000.000.000-00" /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>E-mail</label><input style={inp} value={f.email} onChange={(e) => up("email", e.target.value)} inputMode="email" placeholder="voce@email.com" /></div>
            <div><label style={lbl}>Data de nascimento</label><input style={inp} value={f.birthDate} onChange={(e) => up("birthDate", maskDate(e.target.value))} inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
            <div><label style={lbl}>CEP</label><input style={inp} value={f.cep} onChange={(e) => { up("cep", e.target.value); if (onlyDigits(e.target.value).length === 8) autoCep(e.target.value); }} onBlur={(e) => autoCep(e.target.value)} inputMode="numeric" placeholder="00000-000" /></div>
            <div><label style={lbl}>Endereço</label><input style={inp} value={f.address} onChange={(e) => up("address", e.target.value)} placeholder="Rua, número, bairro" /></div>
          </div>

          <div style={{ ...secTit, marginTop: 6 }}>Seu pet</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Nome do seu pet</label><input style={inp} value={f.petName} onChange={(e) => up("petName", e.target.value)} placeholder="Nome do pet" /></div>
            <div><label style={lbl}>Espécie</label>
              <select style={inp} value={f.petSpecies} onChange={(e) => up("petSpecies", e.target.value)}>
                <option value="">Selecione…</option>
                <option value="CANINE">🐶 Cão</option>
                <option value="FELINE">🐱 Gato</option>
                <option value="OTHER">🐾 Outro</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Raça</label><input style={inp} value={f.petBreed} onChange={(e) => up("petBreed", e.target.value)} placeholder="Ex.: Golden, SRD…" /></div>
            <div><label style={lbl}>Data de nascimento</label><input style={inp} value={f.petBirthDate} onChange={(e) => up("petBirthDate", maskDate(e.target.value))} inputMode="numeric" placeholder="DD/MM/AAAA" maxLength={10} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Idade</label><input style={inp} value={f.petAge} onChange={(e) => up("petAge", e.target.value)} placeholder="Ex.: 3 anos" /></div>
            <div><label style={lbl}>Peso (kg)</label><input style={inp} value={f.petWeight} onChange={(e) => up("petWeight", e.target.value)} inputMode="decimal" placeholder="Ex.: 8" /></div>
          </div>

          <div><label style={lbl}>Como nos conheceu?</label><input style={inp} value={f.howFoundUs} onChange={(e) => up("howFoundUs", e.target.value)} placeholder="Indicação, Instagram, Google…" /></div>

          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13.5, color: "#5C6B70", cursor: "pointer", marginTop: 4 }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Autorizo o Empório do Pet a usar meus dados para meu cadastro e atendimento do meu pet.</span>
          </label>

          {erro && <div style={{ background: "#FDECEC", color: "#b23b39", fontSize: 13.5, padding: "9px 12px", borderRadius: 10 }}>{erro}</div>}

          <button onClick={enviar} disabled={sending} style={{ marginTop: 4, background: TEAL, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 16, fontWeight: 600, cursor: sending ? "default" : "pointer", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Enviando…" : "Enviar cadastro"}
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#374151", marginTop: 14 }}>Empório do Pet · Cuidando de quem você ama</p>
      </div>
    </div>
  );
}

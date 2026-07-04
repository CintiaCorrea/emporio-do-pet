'use client';

// Dados da clínica (SimplesVet "Empresa"). Guarda 1 item JSON na lista `dadosclinica`.
// Usado (futuramente) em recibos/documentos. Frontend puro — sem backend novo.

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

// Paleta Base44 "delicada" (mesmos tokens de caixa/page.tsx)
const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const BG = '#F6F2EA';
const SOFT = '#FBF9F4';
const TINT = '#E0F4F6';
const LINE = '#E8E2D6';
const DIV = '#F0EBE0';
const TXT = '#1F2A2E';
const TXT2 = '#5C6B70';
const TXT3 = '#8A989D';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

type Cfg = {
  nomeFantasia: string; razaoSocial: string; cnpj: string;
  telefone: string; whatsapp: string; email: string; site: string; instagram: string;
  cep: string; rua: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string;
  logoUrl: string; observacoes: string;
};
const DEFAULTS: Cfg = {
  nomeFantasia: '', razaoSocial: '', cnpj: '',
  telefone: '', whatsapp: '', email: '', site: '', instagram: '',
  cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  logoUrl: '', observacoes: '',
};

const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: '18px 20px' };
const label: React.CSSProperties = { fontSize: 12.5, color: TXT2, display: 'block', marginBottom: 6, fontWeight: 500 };
const inp: React.CSSProperties = { width: '100%', padding: '9px 11px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit', color: TXT, background: '#fff', boxSizing: 'border-box' };
const secTitle: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: TEAL_DARK, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 };

function Field({ label: lb, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return <div style={{ gridColumn: span ? `span ${span}` : undefined }}><label style={label}>{lb}</label>{children}</div>;
}

export default function DadosClinicaPage() {
  usePageTitle('Dados da clínica', 'Informações da empresa usadas em recibos e documentos');

  const [cfg, setCfg] = useState<Cfg>(DEFAULTS);
  const [regId, setRegId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetch('/api/listas?lista=dadosclinica', { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
        const arr = Array.isArray(d) ? d : (d.data || d.itens || []);
        if (arr[0]) { setRegId(arr[0].id); try { setCfg({ ...DEFAULTS, ...JSON.parse(arr[0].valor) }); } catch {} }
      } catch { /* silencioso */ } finally { setLoading(false); }
    })();
  }, []);

  const set = (k: keyof Cfg) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setCfg((c) => ({ ...c, [k]: e.target.value }));

  const salvar = async () => {
    try {
      setSaving(true);
      const valor = JSON.stringify(cfg);
      const r = regId
        ? await fetch(`/api/listas/${regId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ valor }) })
        : await fetch('/api/listas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ lista: 'dadosclinica', valor }) });
      if (!r.ok) throw new Error('Erro ao salvar');
      const saved = await r.json().catch(() => null);
      if (saved?.id && !regId) setRegId(saved.id);
      toast.success('Dados da clínica salvos!');
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar'); } finally { setSaving(false); }
  };

  const iniciais = (cfg.nomeFantasia || 'Clínica').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');

  if (loading) {
    return (
      <div style={{ minHeight: '100%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ borderRadius: '50%', height: 44, width: 44, borderBottom: `2px solid ${TEAL}`, margin: '0 auto' }} />
          <p style={{ marginTop: 16, color: TXT2 }}>Carregando…</p>
        </div>
      </div>
    );
  }

  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 };

  return (
    <div style={{ minHeight: '100%', background: BG, width: '100%' }}>
      <div style={{ padding: '24px 26px 60px', boxSizing: 'border-box', maxWidth: 980, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 22 }}>🏢</span> Dados da clínica
            </h1>
            <p style={{ color: TXT2, marginTop: 6, fontSize: 13.5 }}>Aparecem nos recibos, orçamentos e documentos.</p>
          </div>
          <button onClick={salvar} disabled={saving} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, padding: '10px 18px', borderRadius: 9, cursor: 'pointer', opacity: saving ? .6 : 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span>✅</span> {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Geral */}
          <div style={card}>
            <div style={secTitle}><span>🏢</span> Geral</div>
            <div style={grid}>
              <Field label="Nome fantasia" span={2}><input style={inp} value={cfg.nomeFantasia} onChange={set('nomeFantasia')} placeholder="Empório do Pet" /></Field>
              <Field label="Razão social" span={2}><input style={inp} value={cfg.razaoSocial} onChange={set('razaoSocial')} /></Field>
              <Field label="CNPJ"><input style={inp} value={cfg.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" /></Field>
              <Field label="Telefone"><input style={inp} value={cfg.telefone} onChange={set('telefone')} /></Field>
              <Field label="WhatsApp"><input style={inp} value={cfg.whatsapp} onChange={set('whatsapp')} /></Field>
              <Field label="E-mail"><input style={inp} value={cfg.email} onChange={set('email')} /></Field>
              <Field label="Site" span={2}><input style={inp} value={cfg.site} onChange={set('site')} placeholder="https://" /></Field>
              <Field label="Instagram" span={2}><input style={inp} value={cfg.instagram} onChange={set('instagram')} placeholder="@emporiodopet" /></Field>
            </div>
          </div>

          {/* Endereço */}
          <div style={card}>
            <div style={secTitle}><span>📍</span> Endereço</div>
            <div style={grid}>
              <Field label="CEP"><input style={inp} value={cfg.cep} onChange={set('cep')} placeholder="00000-000" /></Field>
              <Field label="Rua / logradouro" span={2}><input style={inp} value={cfg.rua} onChange={set('rua')} /></Field>
              <Field label="Número"><input style={inp} value={cfg.numero} onChange={set('numero')} /></Field>
              <Field label="Complemento" span={2}><input style={inp} value={cfg.complemento} onChange={set('complemento')} /></Field>
              <Field label="Bairro" span={2}><input style={inp} value={cfg.bairro} onChange={set('bairro')} /></Field>
              <Field label="Cidade" span={3}><input style={inp} value={cfg.cidade} onChange={set('cidade')} /></Field>
              <Field label="UF"><select style={inp} value={cfg.uf} onChange={set('uf')}><option value="">—</option>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</select></Field>
            </div>
          </div>

          {/* Logomarca */}
          <div style={card}>
            <div style={secTitle}><span>🖼️</span> Logomarca</div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 72, height: 72, borderRadius: 14, background: TINT, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {cfg.logoUrl
                  ? <img src={cfg.logoUrl} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  : <span style={{ fontSize: 20, fontWeight: 600, color: TEAL_DARK }}>{iniciais}</span>}
              </div>
              <div style={{ flex: '1 1 320px' }}>
                <label style={label}>URL da logo</label>
                <input style={inp} value={cfg.logoUrl} onChange={set('logoUrl')} placeholder="https://…/logo.png" />
                <p style={{ fontSize: 11.5, color: TXT3, margin: '6px 0 0' }}>Cole o link da imagem da logo. (Upload de arquivo será adicionado depois.)</p>
              </div>
            </div>
          </div>

          {/* Observações */}
          <div style={card}>
            <div style={secTitle}><span>📝</span> Observações (rodapé de recibos)</div>
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={cfg.observacoes} onChange={set('observacoes')} placeholder="Ex: Horário de funcionamento, agradecimento, política de retorno…" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={salvar} disabled={saving} style={{ background: TEAL_DARK, color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, padding: '11px 22px', borderRadius: 9, cursor: 'pointer', opacity: saving ? .6 : 1, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <span>✅</span> {saving ? 'Salvando…' : 'Salvar dados da clínica'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

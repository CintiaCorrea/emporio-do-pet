'use client';

// Dados da clínica (SimplesVet "Empresa"). Guarda 1 item JSON na lista `dadosclinica`.
// Usado (futuramente) em recibos/documentos. Frontend puro — sem backend novo.

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { PageShell, HeaderCard, Card, Btn, Label, Input, Select, Textarea, B44 } from '@/components/ui/base44';

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

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return <div style={{ gridColumn: span ? `span ${span}` : undefined }}><Label>{label}</Label>{children}</div>;
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
      <PageShell pad="p-6" className="flex items-center justify-center">
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ borderRadius: '50%', height: 44, width: 44, borderBottom: `2px solid ${B44.primary}`, margin: '0 auto' }} />
          <p style={{ marginTop: 16, color: B44.text2 }}>Carregando…</p>
        </div>
      </PageShell>
    );
  }

  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 };

  return (
    <PageShell pad="p-6">
      <div style={{ maxWidth: 980, margin: '0 auto' }}>

        {/* Header */}
        <HeaderCard>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 500, color: B44.navy, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
                <span>🏢</span> Dados da clínica
              </h1>
              <p style={{ color: B44.text2, marginTop: 4, fontSize: 13 }}>Aparecem nos recibos, orçamentos e documentos.</p>
            </div>
            <Btn variant="primary" onClick={salvar} disabled={saving}>
              <span>✅</span> {saving ? 'Salvando…' : 'Salvar'}
            </Btn>
          </div>
        </HeaderCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Geral */}
          <Card title="Geral" emoji="🏢" pad="16px 18px">
            <div style={grid}>
              <Field label="Nome fantasia" span={2}><Input value={cfg.nomeFantasia} onChange={set('nomeFantasia')} placeholder="Empório do Pet" /></Field>
              <Field label="Razão social" span={2}><Input value={cfg.razaoSocial} onChange={set('razaoSocial')} /></Field>
              <Field label="CNPJ"><Input value={cfg.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0001-00" /></Field>
              <Field label="Telefone"><Input value={cfg.telefone} onChange={set('telefone')} /></Field>
              <Field label="WhatsApp"><Input value={cfg.whatsapp} onChange={set('whatsapp')} /></Field>
              <Field label="E-mail"><Input value={cfg.email} onChange={set('email')} /></Field>
              <Field label="Site" span={2}><Input value={cfg.site} onChange={set('site')} placeholder="https://" /></Field>
              <Field label="Instagram" span={2}><Input value={cfg.instagram} onChange={set('instagram')} placeholder="@emporiodopet" /></Field>
            </div>
          </Card>

          {/* Endereço */}
          <Card title="Endereço" emoji="📍" pad="16px 18px">
            <div style={grid}>
              <Field label="CEP"><Input value={cfg.cep} onChange={set('cep')} placeholder="00000-000" /></Field>
              <Field label="Rua / logradouro" span={2}><Input value={cfg.rua} onChange={set('rua')} /></Field>
              <Field label="Número"><Input value={cfg.numero} onChange={set('numero')} /></Field>
              <Field label="Complemento" span={2}><Input value={cfg.complemento} onChange={set('complemento')} /></Field>
              <Field label="Bairro" span={2}><Input value={cfg.bairro} onChange={set('bairro')} /></Field>
              <Field label="Cidade" span={3}><Input value={cfg.cidade} onChange={set('cidade')} /></Field>
              <Field label="UF"><Select value={cfg.uf} onChange={set('uf')}><option value="">—</option>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</Select></Field>
            </div>
          </Card>

          {/* Logomarca */}
          <Card title="Logomarca" emoji="🖼️" pad="16px 18px">
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 72, height: 72, borderRadius: 14, background: B44.tint, border: `1px solid ${B44.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {cfg.logoUrl
                  ? <img src={cfg.logoUrl} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  : <span style={{ fontSize: 20, fontWeight: 600, color: B44.navy }}>{iniciais}</span>}
              </div>
              <div style={{ flex: '1 1 320px' }}>
                <Label>URL da logo</Label>
                <Input value={cfg.logoUrl} onChange={set('logoUrl')} placeholder="https://…/logo.png" />
                <p style={{ fontSize: 11.5, color: B44.text3, margin: '6px 0 0' }}>Cole o link da imagem da logo. (Upload de arquivo será adicionado depois.)</p>
              </div>
            </div>
          </Card>

          {/* Observações */}
          <Card title="Observações (rodapé de recibos)" emoji="📝" pad="16px 18px">
            <Textarea style={{ minHeight: 80, resize: 'vertical' }} value={cfg.observacoes} onChange={set('observacoes')} placeholder="Ex: Horário de funcionamento, agradecimento, política de retorno…" />
          </Card>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="primary" onClick={salvar} disabled={saving}>
              <span>✅</span> {saving ? 'Salvando…' : 'Salvar dados da clínica'}
            </Btn>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

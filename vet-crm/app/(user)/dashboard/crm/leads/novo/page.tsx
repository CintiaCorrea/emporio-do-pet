'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft, LuLoader, LuSave, LuUser, LuMail,
  LuPhone, LuGlobe, LuTag, LuFileText, LuChevronDown, LuChevronUp, LuPlus, LuX
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { LeadSource, CreateLeadData } from '@/types/crm';
import { LEAD_SOURCE_LABELS } from '@/types/crm';

export default function NewLeadPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState<CreateLeadData>({
    email: '',
    name: '',
    phone: '',
    source: 'OTHER',
    tags: [],
    notes: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    referrer: '',
    landingPage: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.email || !form.email.includes('@')) errs.email = 'Email válido é obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      const payload: Record<string, unknown> = { ...form };
      Object.keys(payload).forEach(key => {
        if (payload[key] === '' || payload[key] === undefined) delete payload[key];
      });
      if (form.tags && form.tags.length > 0) payload.tags = form.tags;

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao criar lead');
      }

      toast.success('Lead criado com sucesso!');
      router.push('/dashboard/crm/leads');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar lead');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags?.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/80 border border-gray-200/80 hover:bg-white transition-all">
            <LuArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Novo Lead
            </h1>
            <p className="text-sm text-gray-500">Criar lead manualmente</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg space-y-5">
            <h2 className="text-lg font-bold text-gray-900">Informações Básicas</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome</label>
                <div className="relative">
                  <LuUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do lead"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LuMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => { setForm(prev => ({ ...prev, email: e.target.value })); setErrors(prev => ({ ...prev, email: '' })); }}
                    placeholder="email@exemplo.com"
                    className={`w-full pl-10 pr-4 py-2.5 bg-white/80 border rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all ${errors.email ? 'border-red-300' : 'border-gray-200/80 focus:border-blue-300'}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
                <div className="relative">
                  <LuPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Origem</label>
                <div className="relative">
                  <LuGlobe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.source}
                    onChange={(e) => setForm(prev => ({ ...prev, source: e.target.value as LeadSource }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all appearance-none"
                  >
                    {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LuTag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Adicionar tag..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
                  />
                </div>
                <button type="button" onClick={addTag} className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-2xl hover:bg-gray-200 transition-all">
                  <LuPlus className="w-4 h-4" />
                </button>
              </div>
              {form.tags && form.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-600 transition-colors">
                        <LuX className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
              <div className="relative">
                <LuFileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Observações sobre o lead..."
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Advanced */}
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors"
            >
              <h2 className="text-lg font-bold text-gray-900">Campos Avançados</h2>
              {showAdvanced ? <LuChevronUp className="w-5 h-5 text-gray-400" /> : <LuChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">UTM Source</label>
                    <input
                      type="text"
                      value={form.utmSource}
                      onChange={(e) => setForm(prev => ({ ...prev, utmSource: e.target.value }))}
                      placeholder="google, facebook..."
                      className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">UTM Medium</label>
                    <input
                      type="text"
                      value={form.utmMedium}
                      onChange={(e) => setForm(prev => ({ ...prev, utmMedium: e.target.value }))}
                      placeholder="cpc, organic..."
                      className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">UTM Campaign</label>
                    <input
                      type="text"
                      value={form.utmCampaign}
                      onChange={(e) => setForm(prev => ({ ...prev, utmCampaign: e.target.value }))}
                      placeholder="campanha_verao..."
                      className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">UTM Content</label>
                    <input
                      type="text"
                      value={form.utmContent}
                      onChange={(e) => setForm(prev => ({ ...prev, utmContent: e.target.value }))}
                      placeholder="banner_topo..."
                      className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Referrer</label>
                    <input
                      type="text"
                      value={form.referrer}
                      onChange={(e) => setForm(prev => ({ ...prev, referrer: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Landing Page</label>
                    <input
                      type="text"
                      value={form.landingPage}
                      onChange={(e) => setForm(prev => ({ ...prev, landingPage: e.target.value }))}
                      placeholder="/pagina-de-entrada"
                      className="w-full px-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/dashboard/crm/leads" className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-2xl transition-all">
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:hover:scale-100"
            >
              {saving ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuSave className="w-4 h-4" />}
              Criar Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

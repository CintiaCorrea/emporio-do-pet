'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LuArrowLeft,
  LuFileText,
  LuStethoscope,
  LuScissors,
  LuShoppingBag,
  LuHeart,
  LuHotel,
  LuLoaderCircle,
  LuLayoutTemplate,
  LuPlus,
} from 'react-icons/lu';
import { toast } from 'sonner';

const TEMPLATES = [
  {
    id: 'blank',
    name: 'Página em Branco',
    description: 'Comece do zero com um canvas vazio',
    icon: LuFileText,
    color: 'from-slate-500 to-slate-600',
  },
  {
    id: 'clinica-veterinaria',
    name: 'Clínica Veterinária',
    description: 'Hero, serviços, equipe, depoimentos e formulário',
    icon: LuStethoscope,
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'banho-e-tosa',
    name: 'Banho e Tosa',
    description: 'Pacotes, galeria antes/depois e agendamento',
    icon: LuScissors,
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'pet-shop',
    name: 'Pet Shop',
    description: 'Produtos em destaque, promoções e categorias',
    icon: LuShoppingBag,
    color: 'from-orange-500 to-orange-600',
  },
  {
    id: 'adocao',
    name: 'Adoção de Pets',
    description: 'Pets disponíveis, processo de adoção e FAQ',
    icon: LuHeart,
    color: 'from-pink-500 to-pink-600',
  },
  {
    id: 'hotel-pet',
    name: 'Hotel para Pets',
    description: 'Instalações, pacotes, depoimentos e reserva',
    icon: LuHotel,
    color: 'from-emerald-500 to-emerald-600',
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function NovaLandingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [creating, setCreating] = useState(false);

  const handleNameChange = useCallback(
    (value: string) => {
      setName(value);
      if (!slugTouched) {
        setSlug(slugify(value));
      }
    },
    [slugTouched],
  );

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Digite um nome para a landing page');
      return;
    }
    if (!slug.trim()) {
      toast.error('O slug é obrigatório');
      return;
    }

    setCreating(true);
    try {
      const body: any = { name: name.trim(), slug: slug.trim() };
      if (selectedTemplate !== 'blank') {
        body.templateId = selectedTemplate;
      }

      const res = await fetch('/api/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar');
      }

      const page = await res.json();
      toast.success('Landing page criada');
      router.push(`/dashboard/landing-pages/${page.id}/editor`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar landing page');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-teal-600/20 to-emerald-600/20" />

        <div className="relative px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/dashboard/landing-pages')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm mb-6"
          >
            <LuArrowLeft className="w-4 h-4" />
            Voltar para Landing Pages
          </button>

          <div className="flex items-start gap-3 mb-8">
            <div className="mt-1 p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/20">
              <LuLayoutTemplate className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Nova Landing Page
              </h1>
              <p className="mt-1 text-gray-400">
                Defina o nome e escolha um template para começar.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Nome da Landing Page
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Promoção de Verão"
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Slug (URL)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">/</span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(slugify(e.target.value));
                    }}
                    placeholder="promocao-de-verao"
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-4">
                Escolha um Template
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TEMPLATES.map((template) => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.id;

                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center mb-3`}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-white font-medium text-sm">
                        {template.name}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1">
                        {template.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => router.push('/dashboard/landing-pages')}
                className="px-5 py-2.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <LuLoaderCircle className="w-4 h-4 animate-spin" />
                ) : (
                  <LuPlus className="w-4 h-4" />
                )}
                Criar e Abrir Editor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


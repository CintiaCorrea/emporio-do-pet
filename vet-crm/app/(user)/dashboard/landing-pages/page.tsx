'use client';

import Link from 'next/link';
import { LuArrowUpRight, LuFileText, LuWandSparkles } from 'react-icons/lu';

export default function LandingPagesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 via-teal-600/20 to-emerald-600/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl" />

        <div className="relative px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/20">
                <LuFileText className="w-5 h-5 text-cyan-300" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
                  Landing Pages
                </h1>
                <p className="mt-2 text-gray-400 max-w-2xl">
                  Ferramenta de construtor de páginas será lançado em breve.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/campanhas"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-all duration-200"
            >
              Voltar para Campanhas
              <LuArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20">
                  <LuWandSparkles className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-white font-semibold">O que vai ter</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Editor visual, templates, publicação e integração com campanhas.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
              <p className="text-sm text-gray-400">
                Enquanto isso, você pode continuar criando campanhas em <span className="text-white font-medium">Email</span> e{' '}
                <span className="text-white font-medium">WhatsApp</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


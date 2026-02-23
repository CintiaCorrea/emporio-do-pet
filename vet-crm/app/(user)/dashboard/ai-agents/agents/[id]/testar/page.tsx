'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LuChevronRight, 
  LuArrowLeft, 
  LuSettings,
  LuLoader
} from 'react-icons/lu';
import { toast } from 'sonner';
import AgentChatTest from '@/components/protected/ai-agents/AgentChatTest';

interface Agent {
  id: string;
  name: string;
  description?: string;
  provider: string;
  model: string;
  systemPrompt: string;
  status: string;
  temperature: number;
  maxTokens: number;
  voiceEnabled?: boolean;
  voiceId?: string;
  voiceSpeed?: number;
  voiceModel?: string;
}

export default function AgentTestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAgent = async () => {
      try {
        const response = await fetch(`/api/agents/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar agente');
        }

        setAgent(data);

        if (data.status !== 'ACTIVE') {
          toast.warning('Este agente não está ativo. Ative-o para testar.');
        }
      } catch (error) {
        console.error('Erro ao carregar agente:', error);
        toast.error('Erro ao carregar agente');
        router.push('/dashboard/ai-agents/agents');
      } finally {
        setLoading(false);
      }
    };

    loadAgent();
  }, [id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <LuLoader className="w-12 h-12 text-violet-600 animate-spin" />
          <p className="text-gray-500 font-medium">Carregando agente...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Agente não encontrado</h2>
          <p className="text-gray-500 mb-4">O agente solicitado não existe ou foi removido.</p>
          <Link
            href="/dashboard/ai-agents/agents"
            className="text-violet-600 hover:text-violet-700 font-medium"
          >
            Voltar para lista de agentes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <Link href="/dashboard/ai-agents/agents" className="hover:text-violet-600">
            AI Agents
          </Link>
          <LuChevronRight className="w-4 h-4" />
          <Link href="/dashboard/ai-agents/agents" className="hover:text-violet-600">
            Agents
          </Link>
          <LuChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Testar</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LuArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Testar: {agent.name}
              </h1>
              <p className="text-sm text-gray-500">
                {agent.provider} • {agent.model} • Temp: {agent.temperature}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {agent.status !== 'ACTIVE' && (
              <span className="px-3 py-1.5 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
                Agente não ativo
              </span>
            )}
            <Link
              href={`/dashboard/ai-agents/agents`}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <LuSettings className="w-4 h-4" />
              Configurações
            </Link>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="h-full max-w-4xl mx-auto">
          <AgentChatTest
            agentId={agent.id}
            agentName={agent.name}
            systemPrompt={agent.systemPrompt}
            provider={agent.provider}
            model={agent.model}
            voiceEnabled={agent.voiceEnabled}
            voiceId={agent.voiceId}
            voiceSpeed={agent.voiceSpeed}
            voiceModel={agent.voiceModel}
          />
        </div>
      </div>
    </div>
  );
}

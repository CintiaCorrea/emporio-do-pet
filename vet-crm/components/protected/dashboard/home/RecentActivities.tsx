import Link from 'next/link';
import { AtividadeRecente } from '@/types/dashboard';

interface RecentActivitiesProps {
  atividades: AtividadeRecente[];
}

export default function RecentActivities({ atividades }: RecentActivitiesProps) {
  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffMinutos = Math.floor(diffMs / (1000 * 60));
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMinutos < 60) {
      return `Há ${diffMinutos} min`;
    } else if (diffHoras < 24) {
      return `Há ${diffHoras} h`;
    } else {
      return data.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getTipoIcone = (tipo: string) => {
    const icones = {
      consulta: '🩺',
      cadastro: '👤',
      atualizacao: '📝',
      lead: '🎯'
    };
    return icones[tipo as keyof typeof icones] || '📌';
  };

  const getStatusColor = (status? (() => null) : string) => {
    const cores = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      concluido: 'bg-green-100 text-green-800 border-green-200',
      agendado: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return cores[status as keyof typeof cores] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 h-full">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>📋</span>
          Atividades Recentes
        </h3>
        <div className="flex gap-3">
          <Link
            href="/crm/atividades"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 transition-colors"
          >
            Ver histórico
            <span>→</span>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {atividades.map((atividade) => (
          <div
            key={atividade.id}
            className="flex items-start gap-4 p-4 hover:bg-gray-50 rounded-xl transition-all duration-200 group border border-transparent hover:border-gray-200"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
              <span className="text-xl">{getTipoIcone(atividade.tipo)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-sm font-medium text-gray-900">
                  {atividade.descricao}
                </p>
                {atividade.status && (
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(atividade.status)}`}>
                    {atividade.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {atividade.tutor}
                {atividade.pet && ` • ${atividade.pet}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">
                  {formatarData(atividade.data)}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400 capitalize">
                  {atividade.origem}
                </span>
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button className="text-gray-400 hover:text-gray-600 p-1 rounded">
                →
              </button>
            </div>
          </div>
        ))}
      </div>

      {atividades.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3 opacity-50">📊</div>
          <p className="text-gray-500 font-medium">Nenhuma atividade recente</p>
          <p className="text-sm text-gray-400 mt-1">
            As atividades aparecerão aqui automaticamente
          </p>
        </div>
      )}
    </div>
  );
}

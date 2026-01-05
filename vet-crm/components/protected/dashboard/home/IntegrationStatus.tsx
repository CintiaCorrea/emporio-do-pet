import { IntegrationStatusType } from '@/types/dashboard';

interface IntegrationStatusProps {
  integrations: IntegrationStatusType[];
}

export default function IntegrationStatus({ integrations }: IntegrationStatusProps) {
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

  const getIntegrationStatusColor = (status: string) => {
    const cores = {
      online: 'bg-emerald-50 border-emerald-200',
      offline: 'bg-red-50 border-red-200',
      instavel: 'bg-amber-50 border-amber-200'
    };
    return cores[status as keyof typeof cores] || 'bg-gray-50 border-gray-200';
  };

  const getIntegrationStatusDot = (status: string) => {
    const dots = {
      online: 'bg-emerald-500',
      offline: 'bg-red-500',
      instavel: 'bg-amber-500'
    };
    return dots[status as keyof typeof dots] || 'bg-gray-500';
  };

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>🔗</span>
        Status das Integrações
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {integrations.map((integration, index) => (
          <div 
            key={index}
            className={`p-4 rounded-xl border-2 ${getIntegrationStatusColor(integration.status)} transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${getIntegrationStatusDot(integration.status)} animate-pulse`}></div>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{integration.nome}</p>
                  <p className="text-sm text-gray-600 capitalize">{integration.status}</p>
                </div>
              </div>
              <span className="text-2xl">{integration.icone}</span>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Sincronizado {formatarData(integration.ultimaSincronizacao)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

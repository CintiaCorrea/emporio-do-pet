import { DashboardStats } from '@/types/dashboard';

interface StatsGridProps {
  stats: DashboardStats;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const statCards = [
    { 
      label: 'Total de Tutores', 
      value: stats.totalTutores, 
      change: '+0%', 
      changeColor: 'text-emerald-600',
      icon: '👥',
      bgColor: 'bg-blue-50',
      gradient: 'from-blue-500 to-blue-600'
    },
    { 
      label: 'Pets Cadastrados', 
      value: stats.totalPets, 
      change: '+0%', 
      changeColor: 'text-emerald-600',
      icon: '🐾',
      bgColor: 'bg-emerald-50',
      gradient: 'from-emerald-500 to-emerald-600'
    },
    { 
      label: 'Agendamentos Hoje', 
      value: stats.agendamentosHoje, 
      change: `${stats.consultasPendentes} pendentes`, 
      changeColor: 'text-amber-600',
      icon: '📅',
      bgColor: 'bg-amber-50',
      gradient: 'from-amber-500 to-amber-600'
    },
    { 
      label: 'Taxa de Conversão', 
      value: `${stats.taxaConversao}%`, 
      change: '+0%', 
      changeColor: 'text-emerald-600',
      icon: '📈',
      bgColor: 'bg-purple-50',
      gradient: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div 
          key={index}
          className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
              <p className={`text-xs font-medium ${stat.changeColor}`}>
                {stat.change}
              </p>
            </div>
            <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
              <span className="text-2xl">{stat.icon}</span>
            </div>
          </div>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full bg-gradient-to-r ${stat.gradient}`}
              style={{ width: `${Math.min(100, (index + 1) * 25)}%` }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  );
}

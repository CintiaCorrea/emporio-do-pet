import { Board } from '@/types/board';
import { StatsCard } from '@/types/pipeline';

interface StatsCardsProps {
  boards: Board[];
}

export default function StatsCards({ boards }: StatsCardsProps) {
  const stats: StatsCard[] = [
    { label: "Total de Boards", value: boards.length.toString(), color: "blue" },
    { label: "Favoritos", value: boards.filter(b => b.favorite).length.toString(), color: "yellow" },
    { label: "Em Progresso", value: boards.filter(b => b.progress > 0 && b.progress < 100).length.toString(), color: "green" },
    { label: "Concluídos", value: boards.filter(b => b.progress === 100).length.toString(), color: "purple" }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return { bg: 'bg-blue-50', dot: 'bg-blue-500' };
      case 'yellow':
        return { bg: 'bg-yellow-50', dot: 'bg-yellow-500' };
      case 'green':
        return { bg: 'bg-green-50', dot: 'bg-green-500' };
      case 'purple':
        return { bg: 'bg-purple-50', dot: 'bg-purple-500' };
      default:
        return { bg: 'bg-gray-50', dot: 'bg-gray-500' };
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const colorClasses = getColorClasses(stat.color);
        return (
          <div key={index} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">{stat.label}</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 ${colorClasses.bg} rounded-xl`}>
                <div className={`w-6 h-6 ${colorClasses.dot} rounded-full`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

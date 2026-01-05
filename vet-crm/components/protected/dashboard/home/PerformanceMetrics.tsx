import { DashboardStats } from '@/types/dashboard';

interface PerformanceMetricsProps {
  stats: DashboardStats;
}

export default function PerformanceMetrics({ stats }: PerformanceMetricsProps) {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-lg p-6 text-white">
      <h3 className="text-lg font-semibold mb-4">Performance</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-blue-100">Conversão</span>
            <span className="font-semibold">{stats.taxaConversao}%</span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-1000"
              style={{ width: `${stats.taxaConversao}%` }}
            ></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-blue-100">Novos Leads</span>
            <span className="font-semibold">{stats.novosLeads}</span>
          </div>
          <div className="w-full bg-blue-500 rounded-full h-2">
            <div 
              className="bg-amber-300 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(100, (stats.novosLeads / 50) * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}

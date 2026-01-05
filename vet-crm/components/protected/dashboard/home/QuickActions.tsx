import Link from 'next/link';

export default function QuickActions() {
  const actions = [
    { href: '/dashboard/erp/tutores/novo', label: 'Novo Tutor', icon: '👤', color: 'blue' },
    { href: '/dashboard/erp/pets/novo', label: 'Novo Pet', icon: '🐾', color: 'emerald' },
    { href: '/dashboard/erp/agendamentos/novo', label: 'Novo Agendamento', icon: '📅', color: 'amber' },
    { href: '/dashboard/relatorios', label: 'Gerar Relatório', icon: '📊', color: 'purple' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>⚡</span>
        Ações Rápidas
      </h3>
      <div className="space-y-3">
        {actions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className={`flex items-center p-4 bg-${action.color}-50 text-${action.color}-700 rounded-xl hover:bg-${action.color}-100 transition-all group border border-transparent hover:border-${action.color}-200`}
          >
            <span className="text-xl mr-3 group-hover:scale-110 transition-transform">{action.icon}</span>
            <span className="font-medium flex-1">{action.label}</span>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

import { LuUser, LuMapPin, LuFolder } from 'react-icons/lu';

interface TutorTabsProps {
  activeTab: 'geral' | 'endereco' | 'extras';
  onTabChange: (tab: 'geral' | 'endereco' | 'extras') => void;
}

export default function TutorTabs({ activeTab, onTabChange }: TutorTabsProps) {
  const tabs = [
    { id: 'geral' as const, label: 'Geral', icon: LuUser, color: 'blue' },
    { id: 'endereco' as const, label: 'Endereço', icon: LuMapPin, color: 'green' },
    { id: 'extras' as const, label: 'Extras', icon: LuFolder, color: 'purple' },
  ];

  return (
    <div className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
      <div className="flex">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`group px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
              activeTab === tab.id
                ? `border-b-2 border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50/50`
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
            }`}
          >
            <tab.icon className={`w-4 h-4 transition-transform duration-300 ${
              activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'
            }`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

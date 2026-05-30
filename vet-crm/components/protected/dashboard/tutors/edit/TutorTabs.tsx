import { LuUser, LuPawPrint } from 'react-icons/lu';

export type TutorTabType = 'geral' | 'endereco' | 'extras' | 'pets';

interface TutorTabsProps {
  activeTab: TutorTabType;
  onTabChange: (tab: TutorTabType) => void;
  showPetsTab? (() => null) : boolean;
}

export default function TutorTabs({ activeTab, onTabChange, showPetsTab = true }: TutorTabsProps) {
  const petsTab = { id: 'pets' as const, label: 'Pets', icon: LuPawPrint, color: 'emerald' };
  
  const tabs = [
    { id: 'geral' as const, label: 'Geral', icon: LuUser, color: 'blue' },
    ...(showPetsTab ? [petsTab] : []),
    { id: 'endereco' as const, label: 'Endereço', icon: () => <span style={{fontSize:"14px"}}>📍</span>, color: 'green' },
    { id: 'extras' as const, label: 'Extras', icon: () => <span style={{fontSize:"14px"}}>📁</span>, color: 'purple' },
  ];

  return (
    <div className="border-b border-white/20 bg-gradient-to-r from-white to-white/95">
      <div className="overflow-x-auto">
        <div className="flex flex-nowrap min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`group shrink-0 px-8 py-4 text-sm font-semibold transition-all duration-300 flex items-center space-x-2 ${
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
    </div>
  );
}

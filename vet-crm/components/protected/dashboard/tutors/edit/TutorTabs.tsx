export type TutorTabType = 'geral' | 'endereco' | 'extras' | 'pets';

interface TutorTabsProps {
  activeTab: TutorTabType;
  onTabChange: (tab: TutorTabType) => void;
  showPetsTab?: boolean;
}

export default function TutorTabs({ activeTab, onTabChange, showPetsTab = true }: TutorTabsProps) {
  const petsTab = { id: 'pets' as const, label: 'Pets', emoji: '🐾' };

  const tabs = [
    { id: 'geral' as const, label: 'Geral', emoji: '👤' },
    ...(showPetsTab ? [petsTab] : []),
    { id: 'endereco' as const, label: 'Endereço', emoji: '🏠' },
    { id: 'extras' as const, label: 'Extras', emoji: '📁' },
  ];

  return (
    <div style={{ borderBottom: '1px solid #E8E2D6', background: '#fff' }}>
      <div className="overflow-x-auto">
        <div className="flex flex-nowrap min-w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="group shrink-0 px-8 py-4 text-sm transition-all duration-300 flex items-center space-x-2"
                style={{
                  fontWeight: 500,
                  color: isActive ? '#014D5E' : '#8A989D',
                  borderBottom: isActive ? '2px solid #009AAC' : '2px solid transparent',
                  background: isActive ? '#E0F4F6' : 'transparent',
                }}
              >
                <span style={{ fontSize: '16px' }}>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Newspaper, Wallet } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import type { TabType } from '../../types/crypto';

export const BottomNav: React.FC = () => {
  const activeTab = useCryptoStore((state) => state.activeTab);
  const setActiveTab = useCryptoStore((state) => state.setActiveTab);

  const navItems: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'markets', label: 'PİYASALAR', icon: Newspaper },
    { id: 'portfolio', label: 'CÜZDANIM', icon: Wallet },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#faf8f5]/95 backdrop-blur-sm border-t-2 border-stone-900 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-center gap-2 flex-1 py-2 mx-1 rounded-md border-2 font-mono text-xs font-black transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-300 text-stone-900 border-stone-900 shadow-hard-sm'
                  : 'bg-white/80 text-stone-600 border-transparent hover:border-stone-900/30'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="tracking-wider">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

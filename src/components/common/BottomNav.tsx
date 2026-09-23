import React from 'react';
import { useCryptoStore } from '../../store/useCryptoStore';
import { NAV_ITEMS } from './navItems';
import { triggerHaptic } from '../../utils/haptics';

export const BottomNav: React.FC = () => {
  const activeTab = useCryptoStore((state) => state.activeTab);
  const setActiveTab = useCryptoStore((state) => state.setActiveTab);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#faf8f5]/95 backdrop-blur-sm border-t-2 border-stone-900 pb-safe font-mono">
      <div className="max-w-lg mx-auto flex items-center justify-around px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(item.id);
              }}
              className={`flex items-center justify-center gap-1.5 flex-1 py-2 mx-1 rounded-md border-2 text-xs font-black transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-300 text-stone-900 border-stone-900 shadow-hard-sm'
                  : 'bg-white/80 text-stone-600 border-transparent hover:border-stone-900/30'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="tracking-wider text-[11px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

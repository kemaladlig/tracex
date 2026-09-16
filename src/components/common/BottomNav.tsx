import React from 'react';
import { TrendingUp, Wallet } from 'lucide-react';
import { useCryptoStore } from '../../store/useCryptoStore';
import type { TabType } from '../../types/crypto';

export const BottomNav: React.FC = () => {
  const activeTab = useCryptoStore((state) => state.activeTab);
  const setActiveTab = useCryptoStore((state) => state.setActiveTab);

  const navItems: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'markets', label: 'Piyasalar', icon: TrendingUp },
    { id: 'portfolio', label: 'Cüzdanım', icon: Wallet },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c1017]/90 backdrop-blur-xl border-t border-slate-800/80 pb-safe">
      <div className="max-w-lg mx-auto flex items-center justify-around px-4 py-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-200 relative ${
                isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-2 w-8 h-1 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.7)]" />
              )}
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-indigo-500/10 scale-105' : ''
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[11px] mt-0.5 font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

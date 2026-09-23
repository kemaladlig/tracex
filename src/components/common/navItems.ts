import { LayoutDashboard, Newspaper, Compass, Wallet } from 'lucide-react';
import type { TabType } from '../../types/crypto';

export interface NavItem {
  id: TabType;
  label: string;
  icon: React.FC<{ className?: string }>;
}

/** Single source of truth for tab navigation (bottom bar + desktop sidebar). */
export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'ÖZET', icon: LayoutDashboard },
  { id: 'markets', label: 'PİYASA', icon: Newspaper },
  { id: 'analytics', label: 'ANALİZ', icon: Compass },
  { id: 'portfolio', label: 'CÜZDAN', icon: Wallet },
];

export const TAB_ORDER: TabType[] = NAV_ITEMS.map((item) => item.id);

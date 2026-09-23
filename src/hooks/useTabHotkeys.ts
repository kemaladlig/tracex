import { useEffect } from 'react';
import { useCryptoStore } from '../store/useCryptoStore';
import { TAB_ORDER } from '../components/common/navItems';
import { triggerHaptic } from '../utils/haptics';

/** Desktop keyboard shortcuts: keys 1-4 switch tabs (skipped inside inputs/modals/chart). */
export function useTabHotkeys() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const idx = ['1', '2', '3', '4'].indexOf(e.key);
      if (idx === -1) return;

      const { activeTab, setActiveTab, selectedCoinForChart } = useCryptoStore.getState();
      if (selectedCoinForChart) return;
      if (document.querySelector('[role="dialog"]')) return;

      const nextTab = TAB_ORDER[idx];
      if (nextTab && nextTab !== activeTab) {
        triggerHaptic('light');
        setActiveTab(nextTab);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

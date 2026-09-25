import { WalletCards } from 'lucide-react';
import { useWalletDisplay } from '../../hooks/useWalletDisplay';

interface CashReserveBadgeProps {
  valueUsd: number;
  hideBalances: boolean;
}

export const CashReserveBadge = ({ valueUsd, hideBalances }: CashReserveBadgeProps) => {
  const { formatBalance, formatUsd } = useWalletDisplay();

  return (
    <div className="mb-2 flex items-center justify-between gap-2 border-2 border-stone-900 bg-cyan-100 px-2.5 py-2 shadow-hard-xs">
      <span className="flex min-w-0 items-center gap-1.5">
        <WalletCards className="h-3.5 w-3.5 shrink-0 text-stone-800" />
        <span className="text-[9px] font-black uppercase text-stone-900">Kasa / eklenebilir</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[10px] font-black text-stone-950">
          {hideBalances ? '••••' : formatBalance(valueUsd)}
        </span>
        <span className="block text-[8px] font-bold text-stone-500">
          {hideBalances ? '••' : formatUsd(valueUsd)}
        </span>
      </span>
    </div>
  );
};

import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';

interface PlayHeaderProps {
  total: number;
  remaining: number;
  currentRoundSize: number;
  matched: number;
  onExit: () => void;
}

export function PlayHeader({ total, remaining, currentRoundSize, matched, onExit }: PlayHeaderProps) {
  const t = useT();
  const done = total - remaining - currentRoundSize + matched;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 mb-6">
      <Button variant="text" textColor="default" size="sm" onClick={onExit}>{t.back}</Button>
      <div className="flex-1">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{t.progress}</span>
          <span>{done}/{total}</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">{currentRoundSize} {t.pairsPerRound}</p>
      </div>
    </div>
  );
}

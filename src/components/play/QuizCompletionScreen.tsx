import { Button } from '../shared/Button';
import { useT } from '../../i18n/useT';

interface QuizCompletionScreenProps {
  score: number;
  total: number;
  onPlayAgain: () => void;
  onExit: () => void;
}

export function QuizCompletionScreen({ score, total, onPlayAgain, onExit }: QuizCompletionScreenProps) {
  const t = useT();
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-6xl">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '📖'}</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{t.quizComplete}</h2>
      <p className="text-gray-500 dark:text-gray-400">{t.yourScore(score, total)}</p>
      <div className="w-48 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{pct}%</p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onExit}>{t.backToWords}</Button>
        <Button onClick={onPlayAgain}>{t.playAgain}</Button>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { usePlayStore } from '../../store/playStore';
import { PlayHeader } from './PlayHeader';
import { WordCard } from './WordCard';
import { CompletionScreen } from './CompletionScreen';
import { QuizView } from './QuizView';
import { useT } from '../../i18n/useT';

export function PlayView() {
  const { setView, gameMode } = useUIStore();
  const { wordPairs } = useDataStore();
  const {
    allPairs, remaining, currentRound, shuffledTargets, matched,
    selectedSource, selectedTarget, wrongPair,
    roundComplete, gameComplete,
    selectSource, selectTarget, clearWrong, nextRound, initGame,
  } = usePlayStore();
  const t = useT();

  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear wrong flash after 600ms
  useEffect(() => {
    if (wrongPair !== null) {
      wrongTimerRef.current = setTimeout(() => clearWrong(), 600);
    }
    return () => {
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    };
  }, [wrongPair]);

  // Auto-advance to next round after 1s
  useEffect(() => {
    if (roundComplete) {
      roundTimerRef.current = setTimeout(() => nextRound(), 1000);
    }
    return () => {
      if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    };
  }, [roundComplete, nextRound]);

  if (gameMode === 'quiz') {
    return <QuizView />;
  }

  const handlePlayAgain = () => {
    initGame(wordPairs);
  };

  const handleExit = () => {
    setView('wordpairs');
  };

  if (gameComplete) {
    return <CompletionScreen total={allPairs.length} onPlayAgain={handlePlayAgain} onExit={handleExit} />;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PlayHeader
        total={allPairs.length}
        remaining={remaining.length}
        currentRoundSize={currentRound.length}
        matched={matched.length}
        onExit={handleExit}
      />

      <div className="grid grid-cols-2 gap-6">
        {/* Source column */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide text-center mb-1">{t.match}</p>
          {currentRound.map((pair) => (
            <WordCard
              key={pair.id}
              text={pair.source}
              isMatched={matched.includes(pair.id)}
              isSelected={selectedSource === pair.id}
              isWrong={wrongPair === pair.id}
              onClick={() => selectSource(pair.id)}
            />
          ))}
        </div>

        {/* Target column (shuffled) */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide text-center mb-1">{t.with}</p>
          {shuffledTargets.map((s) => (
            <WordCard
              key={s.id}
              text={s.text}
              isMatched={matched.includes(s.id)}
              isSelected={selectedTarget === s.id}
              isWrong={false}
              onClick={() => selectTarget(s.id)}
            />
          ))}
        </div>
      </div>

    </div>
  );
}

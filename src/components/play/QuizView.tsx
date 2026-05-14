import { useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useQuizStore } from '../../store/quizStore';
import { Button } from '../shared/Button';
import { OptionButton } from '../shared/OptionButton';
import { QuizCompletionScreen } from './QuizCompletionScreen';
import { useT } from '../../i18n/useT';

export function QuizView() {
  const { setView, quizOptionCount, quizDirection } = useUIStore();
  const { wordPairs } = useDataStore();
  const {
    allPairs, currentPair, questionText, options, selectedOptionId,
    score, totalAnswered, gameComplete,
    selectAnswer, nextQuestion, initQuiz,
  } = useQuizStore();
  const t = useT();

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedOptionId !== null) {
      advanceTimerRef.current = setTimeout(() => nextQuestion(), 1000);
    }
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [selectedOptionId]);

  const handleExit = () => setView('wordpairs');

  const handlePlayAgain = () => {
    const activePairs = wordPairs.filter((p) => !p.disabled);
    initQuiz(activePairs, quizOptionCount, quizDirection);
  };

  if (gameComplete) {
    return <QuizCompletionScreen score={score} total={totalAnswered} onPlayAgain={handlePlayAgain} onExit={handleExit} />;
  }

  if (!currentPair) return null;

  const questionNum = totalAnswered + 1;
  const totalQuestions = allPairs.length;
  const pct = totalQuestions > 0 ? Math.round(((questionNum - 1) / totalQuestions) * 100) : 0;
  const answered = selectedOptionId !== null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header with progress */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="text" textColor="default" size="sm" onClick={handleExit}>{t.back}</Button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{t.progress}</span>
            <span>{t.questionOf(questionNum, totalQuestions)}</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question word */}
      <div className="text-center mb-8">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">{t.match}</p>
        <div className="inline-block rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 px-8 py-4">
          <span className="text-xl font-semibold text-indigo-800 dark:text-indigo-200">{questionText}</span>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            selectedOptionId={selectedOptionId}
            onClick={() => selectAnswer(option.id)}
          />
        ))}
      </div>


      {/* Feedback */}
      {answered && (
        <div className="mt-4 text-center">
          <span className={`text-sm font-semibold ${
            options.find((o) => o.id === selectedOptionId)?.isCorrect
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}>
            {options.find((o) => o.id === selectedOptionId)?.isCorrect ? t.correct : t.wrong}
          </span>
        </div>
      )}
    </div>
  );
}


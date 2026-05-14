import { useEffect, useRef } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { useConjugationPlayStore } from '../../store/conjugationPlayStore';
import { Button } from '../shared/Button';
import { Input } from '../shared/Input';
import { QuizCompletionScreen } from './QuizCompletionScreen';
import { useT } from '../../i18n/useT';
import type { ConjugationOption } from '../../store/conjugationPlayStore';

export function ConjugationPlayView() {
  const { setView, conjugationMode, conjugationOptionCount } = useUIStore();
  const { verbs } = useDataStore();
  const {
    mode, allQuestions, currentQuestion, options, selectedOptionId,
    typedAnswer, answerSubmitted, answerCorrect,
    score, totalAnswered, gameComplete,
    selectAnswer, submitTypedAnswer, setTypedAnswer, nextQuestion,
    initConjugationPlay,
  } = useConjugationPlayStore();
  const t = useT();

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (answerSubmitted && mode === 'choice') {
      advanceTimerRef.current = setTimeout(() => nextQuestion(), 1000);
    }
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [answerSubmitted, mode]);

  useEffect(() => {
    if (!answerSubmitted && mode === 'type' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentQuestion, answerSubmitted, mode]);

  const handleExit = () => setView('wordpairs');

  const handlePlayAgain = () => {
    const activeVerbs = verbs.filter((v) => !v.disabled);
    initConjugationPlay(activeVerbs, conjugationMode, conjugationOptionCount);
  };

  if (gameComplete) {
    return <QuizCompletionScreen score={score} total={totalAnswered} onPlayAgain={handlePlayAgain} onExit={handleExit} />;
  }

  if (!currentQuestion) return null;

  const questionNum = totalAnswered + 1;
  const totalQuestions = allQuestions.length;
  const pct = totalQuestions > 0 ? Math.round(((questionNum - 1) / totalQuestions) * 100) : 0;

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

      {/* Question prompt */}
      <div className="text-center mb-8">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">{t.conjugate}</p>
        <div className="inline-block rounded-xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 px-8 py-4">
          <span className="text-lg font-semibold text-indigo-800 dark:text-indigo-200">
            {currentQuestion.verbInfinitive}
          </span>
          <div className="mt-1 text-sm text-indigo-600 dark:text-indigo-300">
            {currentQuestion.form_type} &mdash; {currentQuestion.person}
          </div>
        </div>
      </div>

      {/* Answer area */}
      {mode === 'choice' ? (
        <div className="grid grid-cols-1 gap-3">
          {options.map((option) => (
            <ConjugationOptionButton
              key={option.id}
              option={option}
              selectedOptionId={selectedOptionId}
              onClick={() => selectAnswer(option.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-full max-w-sm">
            <Input
              ref={inputRef}
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (answerSubmitted) {
                    nextQuestion();
                  } else {
                    submitTypedAnswer();
                  }
                }
              }}
              placeholder={t.typeYourAnswer}
              disabled={answerSubmitted}
              className="text-center text-lg"
            />
          </div>
          {!answerSubmitted && (
            <Button onClick={submitTypedAnswer} disabled={!typedAnswer.trim()}>
              {t.checkAnswer}
            </Button>
          )}
          {answerSubmitted && (
            <div className="text-center">
              <span className={`text-sm font-semibold ${answerCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {answerCorrect ? t.correct : t.wrong}
              </span>
              {!answerCorrect && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t.correctAnswer}: <span className="font-medium text-gray-800 dark:text-gray-200">{currentQuestion.correctForm}</span>
                </p>
              )}
              <div className="mt-3">
                <Button size="sm" onClick={nextQuestion}>{t.next}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback for choice mode */}
      {mode === 'choice' && answerSubmitted && (
        <div className="mt-4 text-center">
          <span className={`text-sm font-semibold ${answerCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {answerCorrect ? t.correct : t.wrong}
          </span>
        </div>
      )}
    </div>
  );
}

function ConjugationOptionButton({ option, selectedOptionId, onClick }: {
  option: ConjugationOption;
  selectedOptionId: number | null;
  onClick: () => void;
}) {
  const answered = selectedOptionId !== null;
  const isSelected = selectedOptionId === option.id;

  let classes = 'rounded-xl border-2 px-5 py-3 text-sm font-medium transition-all select-none text-center ';

  if (!answered) {
    classes += 'cursor-pointer border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:shadow-sm';
  } else if (option.isCorrect) {
    classes += 'border-green-400 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400';
  } else if (isSelected) {
    classes += 'border-red-400 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400';
  } else {
    classes += 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 opacity-50';
  }

  return (
    <div className={classes} onClick={answered ? undefined : onClick}>
      {option.text}
    </div>
  );
}

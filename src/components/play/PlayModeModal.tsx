import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { useUIStore } from '../../store/uiStore';
import { useT } from '../../i18n/useT';
import type { GameMode, QuizDirection, ConjugationMode } from '../../store/uiStore';

interface PlayModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (mode: GameMode) => void;
  maxOptions: number;
  maxConjugations: number;
  sourceLang: string;
  targetLang: string;
}

const directions: QuizDirection[] = ['sourceToTarget', 'targetToSource', 'random'];
const conjugationModes: ConjugationMode[] = ['choice', 'type'];

export function PlayModeModal({ isOpen, onClose, onStart, maxOptions, maxConjugations, sourceLang, targetLang }: PlayModeModalProps) {
  const {
    gameMode, setGameMode, quizOptionCount, setQuizOptionCount, quizDirection, setQuizDirection,
    conjugationMode, setConjugationMode, conjugationOptionCount, setConjugationOptionCount,
  } = useUIStore();
  const t = useT();

  const quizDisabled = maxOptions < 2;
  const conjugationDisabled = maxConjugations < 2;
  const effectiveCount = Math.min(quizOptionCount, maxOptions);
  const effectiveConjCount = Math.min(conjugationOptionCount, maxConjugations);

  const isStartDisabled =
    (gameMode === 'quiz' && maxOptions < effectiveCount) ||
    (gameMode === 'match' && maxOptions < 2) ||
    (gameMode === 'conjugation' && conjugationDisabled);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.chooseGameMode}
      footer={
        <Button
          onClick={() => onStart(gameMode)}
          disabled={isStartDisabled}
        >
          {t.startGame}
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Mode cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => maxOptions >= 2 && setGameMode('match')}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              maxOptions < 2 ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              gameMode === 'match' && maxOptions >= 2
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-2xl mb-2">🔗</div>
            <div className="font-semibold text-gray-900 dark:text-gray-50">{t.matchMode}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.matchModeDesc}</div>
          </button>

          <button
            onClick={() => !quizDisabled && setGameMode('quiz')}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              quizDisabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              gameMode === 'quiz' && !quizDisabled
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-2xl mb-2">❓</div>
            <div className="font-semibold text-gray-900 dark:text-gray-50">{t.quizMode}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.quizModeDesc}</div>
          </button>

          <button
            onClick={() => !conjugationDisabled && setGameMode('conjugation')}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              conjugationDisabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${
              gameMode === 'conjugation' && !conjugationDisabled
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="text-2xl mb-2">📝</div>
            <div className="font-semibold text-gray-900 dark:text-gray-50">{t.conjugationMode}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t.conjugationModeDesc}</div>
          </button>
        </div>

        {/* Option count adjuster (only for quiz mode) */}
        {gameMode === 'quiz' && !quizDisabled && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">{t.optionCount}</span>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setQuizOptionCount(Math.max(2, effectiveCount - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-gray-50">
                {effectiveCount}
              </span>
              <button
                onClick={() => setQuizOptionCount(Math.min(6, Math.min(maxOptions, effectiveCount + 1)))}
                className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* Direction toggle (only for quiz mode) */}
        {gameMode === 'quiz' && !quizDisabled && (
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">{t.quizDirection}</span>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-0.5">
              {directions.map((dir) => {
                const label = dir === 'sourceToTarget' ? `${sourceLang} → ${targetLang}`
                  : dir === 'targetToSource' ? `${targetLang} → ${sourceLang}`
                  : t.randomDirection;
                return (
                  <button
                    key={dir}
                    onClick={() => setQuizDirection(dir)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      quizDirection === dir
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Conjugation mode settings */}
        {gameMode === 'conjugation' && !conjugationDisabled && (
          <>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700 dark:text-gray-300">{t.answerMode}</span>
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 gap-0.5">
                {conjugationModes.map((m) => (
                  <button
                    key={m}
                    onClick={() => setConjugationMode(m)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      conjugationMode === m
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {m === 'choice' ? t.multipleChoice : t.typeAnswer}
                  </button>
                ))}
              </div>
            </div>

            {conjugationMode === 'choice' && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">{t.optionCount}</span>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setConjugationOptionCount(Math.max(2, effectiveConjCount - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-gray-50">
                    {effectiveConjCount}
                  </span>
                  <button
                    onClick={() => setConjugationOptionCount(Math.min(6, Math.min(maxConjugations, effectiveConjCount + 1)))}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Warning if not enough pairs for quiz */}
        {gameMode === 'quiz' && maxOptions < effectiveCount && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{t.needMorePairs(effectiveCount)}</p>
        )}
        {gameMode === 'conjugation' && conjugationDisabled && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{t.needMoreConjugations}</p>
        )}
      </div>
    </Modal>
  );
}

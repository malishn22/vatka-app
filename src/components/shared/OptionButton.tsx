interface OptionButtonProps {
  option: { id: number; text: string; isCorrect: boolean };
  selectedOptionId: number | null;
  onClick: () => void;
}

export function OptionButton({ option, selectedOptionId, onClick }: OptionButtonProps) {
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

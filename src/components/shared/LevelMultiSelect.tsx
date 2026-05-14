import type { Level } from '../../types';

interface LevelMultiSelectProps {
  levels: Level[];
  selectedLevelIds: Set<number>;
  currentLevelId?: number;
  onToggle: (id: number) => void;
}

export function LevelMultiSelect({ levels, selectedLevelIds, currentLevelId, onToggle }: LevelMultiSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {levels.map((lv) => (
        <label key={lv.id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedLevelIds.has(lv.id)}
            onChange={() => onToggle(lv.id)}
            className="accent-indigo-500"
          />
          <span className="text-sm text-gray-800 dark:text-gray-200">
            {lv.name}
            {lv.id === currentLevelId && (
              <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">(current)</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

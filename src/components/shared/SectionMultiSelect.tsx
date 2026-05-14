import type { Section } from '../../types';

interface SectionMultiSelectProps {
  sections: Section[];
  selectedSectionIds: Set<number>;
  currentSectionId?: number;
  onToggle: (id: number) => void;
}

export function SectionMultiSelect({ sections, selectedSectionIds, currentSectionId, onToggle }: SectionMultiSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {sections.map((sec) => (
        <label key={sec.id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedSectionIds.has(sec.id)}
            onChange={() => onToggle(sec.id)}
            className="accent-indigo-500"
          />
          <span className="text-sm text-gray-800 dark:text-gray-200">
            {sec.name}
            {sec.id === currentSectionId && (
              <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">(current)</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

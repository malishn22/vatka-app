import { Input } from './Input';
import { Toggle } from './Toggle';
import { useT } from '../../i18n/useT';

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  isGlobal: boolean;
  onGlobalChange: (v: boolean) => void;
  placeholder?: string;
  globalLabel?: string;
}

export function SearchBar({
  value,
  onChange,
  isGlobal,
  onGlobalChange,
  placeholder,
  globalLabel,
}: SearchBarProps) {
  const t = useT();
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <Input
          inputSize="sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t.searchPlaceholder}
          className="w-full pr-8"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm leading-none w-5 h-5 flex items-center justify-center"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      <Toggle
        checked={isGlobal}
        onChange={() => onGlobalChange(!isGlobal)}
        label={globalLabel ?? t.searchGlobal}
      />
    </div>
  );
}

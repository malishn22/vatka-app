import { useState } from 'react';
import { useUIStore } from '../../store/uiStore';
import { Toggle } from '../shared/Toggle';
import { Dropdown } from '../shared/Dropdown';
import { useT } from '../../i18n/useT';
import { KNOWN_LANGUAGES } from '../../constants/languages';

export function SettingsView() {
  const { isDark, toggleDark, lang, setLang, favoriteLanguages, toggleFavoriteLanguage, pairsPerRound, setPairsPerRound } = useUIStore();
  const t = useT();
  const [addValue, setAddValue] = useState('');

  const availableToAdd = KNOWN_LANGUAGES.filter((l) => !favoriteLanguages.includes(l));
  const addOptions = availableToAdd.map((l) => ({ value: l, label: t.languageNames[l] ?? l }));

  const handleAdd = (val: string) => {
    if (val) {
      toggleFavoriteLanguage(val);
      setAddValue('');
    }
  };

  return (
    <div className="max-w-md">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{t.settingsTitle}</h2>
      </div>

      <div className="flex flex-col gap-0 divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {/* Dark Mode */}
        <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.darkMode}</span>
          <Toggle checked={isDark} onChange={toggleDark} />
        </div>

        {/* Language */}
        <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.language}</span>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${lang === 'en' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('tr')}
              className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${lang === 'tr' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              TR
            </button>
          </div>
        </div>

        {/* Pairs per Round */}
        <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800">
          <div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t.pairsPerRound}</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t.pairsPerRoundHint}</p>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setPairsPerRound(Math.max(1, pairsPerRound - 1))}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-50 transition-colors font-medium"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              value={pairsPerRound}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1) setPairsPerRound(val);
              }}
              className="w-10 text-center text-sm font-medium bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-50 rounded-md shadow-sm border-0 outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => setPairsPerRound(pairsPerRound + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-50 transition-colors font-medium"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Favorite Languages */}
      <div className="mt-6">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-1">{t.favoriteLanguages}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t.favoriteLanguagesHint}</p>

        <Dropdown
          options={addOptions}
          value={addValue}
          onChange={handleAdd}
          placeholder={t.addFavorite}
        />

        {favoriteLanguages.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1">
            {favoriteLanguages.map((lang) => (
              <li
                key={lang}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800"
              >
                <span className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                  {t.languageNames[lang] ?? lang}
                </span>
                <button
                  type="button"
                  onClick={() => toggleFavoriteLanguage(lang)}
                  className="text-xs text-indigo-400 dark:text-indigo-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

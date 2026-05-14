import { useEffect } from 'react';
import { useUIStore } from '../../store/uiStore';
import { useDataStore } from '../../store/dataStore';
import { Button } from '../shared/Button';
import { Dropdown } from '../shared/Dropdown';
import { SectionedLevelList } from '../sections/SectionedLevelList';
import { useT } from '../../i18n/useT';
import { dbReadyPromise } from '../../db/client';

export function Sidebar() {
  const { selectedLanguageId, setSelectedLanguage, setView, currentView } = useUIStore();
  const { languages, levels, fetchLanguages, fetchLevels } = useDataStore();
  const t = useT();

  useEffect(() => {
    dbReadyPromise.then(() => fetchLanguages());
  }, []);

  useEffect(() => {
    if (selectedLanguageId !== null) {
      fetchLevels(selectedLanguageId);
    }
  }, [selectedLanguageId]);

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mb-3">Vatka</h1>
        <Dropdown
          className="w-full"
          options={languages.map((l) => ({ value: String(l.id), label: l.name }))}
          placeholder={t.selectLanguage}
          value={String(selectedLanguageId ?? '')}
          onChange={(val) => setSelectedLanguage(val ? Number(val) : null)}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {selectedLanguageId !== null && (
          <SectionedLevelList
            levels={levels.filter((l) => l.language_id === selectedLanguageId)}
            languageId={selectedLanguageId}
          />
        )}
      </div>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
        <Button
          variant={currentView === 'languages' ? 'primary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setView('languages')}
        >
          {t.manageLanguages}
        </Button>
        <Button
          variant={currentView === 'settings' ? 'primary' : 'ghost'}
          className="w-full justify-start gap-2"
          onClick={() => setView('settings')}
        >
          ⚙ {t.settings}
        </Button>
      </div>
    </aside>
  );
}

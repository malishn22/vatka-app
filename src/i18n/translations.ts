export type Lang = 'en' | 'tr';

export const translations = {
  en: {
    // Sidebar
    selectLanguage: 'Select language...',
    manageLanguages: 'Manage Languages',
    settings: 'Settings',

    // Languages view
    languages: 'Languages',
    manageYourLanguagePairs: 'Manage your language pairs',
    addLanguage: '+ Add Language',
    noLanguagesYet: 'No languages yet',
    addLanguagePairToStart: 'Add a language pair to get started',

    // Language modal
    addLanguageTitle: 'Add Language',
    editLanguageTitle: 'Edit Language',
    fromLanguage: 'From language',
    toLanguage: 'To language',
    selectSourceLanguage: 'Select source language...',
    selectTargetLanguage: 'Select target language...',
    displayName: 'Display name',
    displayNamePlaceholder: 'e.g. English → Czech',
    required: 'Required',
    mustDifferFromSource: 'Must differ from source',

    // Language card
    edit: 'Edit',
    delete: 'Delete',
    deleteLanguageTitle: 'Delete Language',
    deleteLanguageMessage: (name: string) => `Delete "${name}"? All sections and word pairs will also be deleted.`,

    // Word pairs view
    selectLevelFromSidebar: 'Select a section from the sidebar',
    wordPair: 'word pair',
    wordPairs: 'word pairs',
    needAtLeastTwoWordPairs: 'Need at least 2 word pairs to play',
    play: '▶ Play',
    export: 'Export',
    exportExcel: 'Export Excel',
    exportCsv: 'Export CSV',
    exportedSuccessfully: 'Exported successfully',
    noWordPairsYet: 'No word pairs yet. Add some below.',
    source: 'Source',
    target: 'Target',

    // Add word pair form
    addWordPair: 'Add word pair',
    bothFieldsRequired: 'Both fields are required',
    wordIn: (lang: string) => `Word in ${lang}`,
    add: 'Add',
    import: 'Import',
    importExcel: 'Import Excel',
    importResult: (count: number, skipped: number) =>
      skipped > 0
        ? `Imported ${count} pairs, ${skipped} skipped (duplicates)`
        : `Imported ${count} pairs`,

    // Export modal
    exportModalTitle: 'Export Word Pairs',
    exportScope: 'Export scope',
    exportSearchPlaceholder: 'Search pairs...',
    exportSelectAll: 'Select all',
    exportDeselectAll: 'Deselect all',
    exportSelectedCount: (n: number, total: number) => `${n} of ${total} selected`,
    exportSectionColumn: 'Section',
    exportSubsectionColumn: 'Subsection',

    // Import modal
    importChooseFile: 'Choose File',
    importFileHint: 'Accepts .xlsx, .xls, .ods, .csv',
    importFormatHint: 'Columns: Source | Target | Section | Subsection (optional)',
    importPreviewTitle: (n: number) => `Preview — ${n} pairs`,
    importToImport: (n: number) => `Import ${n} pairs`,
    importDuplicateLabel: 'Duplicate',
    importSectionPlaceholder: 'Subsection name...',
    importBack: 'Back',
    importChecking: 'Checking for duplicates...',

    // Word pair row
    enablePair: 'Show in play mode',
    disablePair: 'Hide from play mode',
    save: 'Save',
    cancel: 'Cancel',
    deleteWordPairTitle: 'Delete Word Pair',
    deleteWordPairMessage: (source: string, target: string) => `Delete "${source} → ${target}"?`,

    // Sections (subsections in UI)
    section: 'Subsection',
    addSection: '+ Add Subsection',
    noSectionsYet: 'No subsections yet.',
    addSectionTitle: 'Add Subsection',
    editSectionTitle: 'Edit Subsection',
    sectionName: 'Subsection name',
    sectionNamePlaceholder: 'e.g. Chapter 1, Grammar, Vocabulary',
    deleteSectionTitle: 'Delete Subsection',
    deleteSectionMessage: (name: string) => `Delete "${name}"? Sections in this subsection will become unsubsectioned.`,
    unsectioned: 'No Subsection',

    // Levels (sections in UI)
    levels: 'SECTIONS',
    addLevel: '+ Add Section',
    noLevelsYet: 'No sections yet.',
    addLevelTitle: 'Add Section',
    editLevelTitle: 'Edit Section',
    levelName: 'Section name',
    levelNamePlaceholder: 'e.g. Beginner, A1, Unit 3',
    nameIsRequired: 'Name is required',
    deleteLevelTitle: 'Delete Section',
    deleteLevelMessage: (name: string) => `Delete "${name}"? All word pairs in this section will also be deleted.`,

    // Play view
    match: 'Match',
    with: 'With',
    back: '← Back',
    progress: 'Progress',
    roundComplete: 'Round complete!',
    readyForNextBatch: 'Ready for the next batch?',
    allDone: 'All done!',
    nextRound: 'Next Round →',
    finish: 'Finish',
    youMatchedAll: (total: number) => `You matched all ${total} word pairs.`,
    backToWords: '← Back to words',
    playAgain: 'Play again',

    // Play mode selection
    chooseGameMode: 'Choose Game Mode',
    matchMode: 'Match',
    matchModeDesc: 'Pair source words with their translations',
    quizMode: 'Quiz',
    quizModeDesc: 'Pick the correct translation from multiple choices',
    optionCount: 'Number of choices',
    startGame: 'Start',

    // Quiz view
    questionOf: (current: number, total: number) => `Question ${current} of ${total}`,
    correct: 'Correct!',
    wrong: 'Wrong!',
    next: 'Next →',
    quizComplete: 'Quiz Complete!',
    yourScore: (score: number, total: number) => `You got ${score} out of ${total} correct.`,
    needMorePairs: (n: number) => `Need at least ${n} word pairs for this mode`,
    quizDirection: 'Direction',
    randomDirection: 'Random',

    // Confirm dialog
    confirmDelete: 'Delete',

    // Settings
    settingsTitle: 'Settings',
    darkMode: 'Dark Mode',
    language: 'Language',
    favoriteLanguages: 'Favorite Languages',
    favoriteLanguagesHint: 'These will appear at the top of language dropdowns.',
    pairsPerRound: 'Pairs per round',
    pairsPerRoundHint: 'How many word pairs appear in each round.',
    addFavorite: 'Add a language...',
    removeFavorite: 'Remove',
    languageAlreadyExists: 'This language pair already exists.',
    wordPairAlreadyExists: 'This word pair already exists in this language.',

    // Language names (for dropdown labels)
    languageNames: {
      Afrikaans: 'Afrikaans', Albanian: 'Albanian', Arabic: 'Arabic',
      Basque: 'Basque', Belarusian: 'Belarusian', Bulgarian: 'Bulgarian',
      Catalan: 'Catalan', 'Chinese (Simplified)': 'Chinese (Simplified)',
      'Chinese (Traditional)': 'Chinese (Traditional)', Croatian: 'Croatian',
      Czech: 'Czech', Danish: 'Danish', Dutch: 'Dutch', English: 'English',
      Estonian: 'Estonian', Finnish: 'Finnish', French: 'French',
      Galician: 'Galician', Georgian: 'Georgian', German: 'German',
      Greek: 'Greek', Gujarati: 'Gujarati', 'Haitian Creole': 'Haitian Creole',
      Hebrew: 'Hebrew', Hindi: 'Hindi', Hungarian: 'Hungarian',
      Icelandic: 'Icelandic', Indonesian: 'Indonesian', Irish: 'Irish',
      Italian: 'Italian', Japanese: 'Japanese', Kannada: 'Kannada',
      Korean: 'Korean', Latin: 'Latin', Latvian: 'Latvian',
      Lithuanian: 'Lithuanian', Macedonian: 'Macedonian', Malay: 'Malay',
      Maltese: 'Maltese', Norwegian: 'Norwegian', Persian: 'Persian',
      Polish: 'Polish', Portuguese: 'Portuguese', Romanian: 'Romanian',
      Russian: 'Russian', Serbian: 'Serbian', Slovak: 'Slovak',
      Slovenian: 'Slovenian', Spanish: 'Spanish', Swahili: 'Swahili',
      Swedish: 'Swedish', Tamil: 'Tamil', Telugu: 'Telugu',
      Thai: 'Thai', Turkish: 'Turkish', Ukrainian: 'Ukrainian',
      Urdu: 'Urdu', Vietnamese: 'Vietnamese', Welsh: 'Welsh', Yiddish: 'Yiddish',
    } as Record<string, string>,
  },

  tr: {
    // Sidebar
    selectLanguage: 'Dil seçin...',
    manageLanguages: 'Dilleri Yönet',
    settings: 'Ayarlar',

    // Languages view
    languages: 'Diller',
    manageYourLanguagePairs: 'Dil çiftlerinizi yönetin',
    addLanguage: '+ Dil Ekle',
    noLanguagesYet: 'Henüz dil yok',
    addLanguagePairToStart: 'Başlamak için bir dil çifti ekleyin',

    // Language modal
    addLanguageTitle: 'Dil Ekle',
    editLanguageTitle: 'Dili Düzenle',
    fromLanguage: 'Kaynak dil',
    toLanguage: 'Hedef dil',
    selectSourceLanguage: 'Kaynak dil seçin...',
    selectTargetLanguage: 'Hedef dil seçin...',
    displayName: 'Görünen ad',
    displayNamePlaceholder: 'örn. İngilizce → Çekçe',
    required: 'Zorunlu',
    mustDifferFromSource: 'Kaynak dilden farklı olmalı',

    // Language card
    edit: 'Düzenle',
    delete: 'Sil',
    deleteLanguageTitle: 'Dili Sil',
    deleteLanguageMessage: (name: string) => `"${name}" silinsin mi? Tüm bölümler ve kelime çiftleri de silinecek.`,

    // Word pairs view
    selectLevelFromSidebar: 'Kenar çubuğundan bir bölüm seçin',
    wordPair: 'kelime çifti',
    wordPairs: 'kelime çifti',
    needAtLeastTwoWordPairs: 'Oynamak için en az 2 kelime çifti gerekli',
    play: '▶ Oyna',
    export: 'Dışa Aktar',
    exportExcel: 'Excel Dışa Aktar',
    exportCsv: 'CSV Dışa Aktar',
    exportedSuccessfully: 'Dışa aktarma başarılı',
    noWordPairsYet: 'Henüz kelime çifti yok. Aşağıdan ekleyin.',
    source: 'Kaynak',
    target: 'Hedef',

    // Add word pair form
    addWordPair: 'Kelime çifti ekle',
    bothFieldsRequired: 'Her iki alan da zorunlu',
    wordIn: (lang: string) => `${lang} dilinde kelime`,
    add: 'Ekle',
    import: 'İçe Aktar',
    importExcel: 'Excel İçe Aktar',
    importResult: (count: number, skipped: number) =>
      skipped > 0
        ? `${count} çift içe aktarıldı, ${skipped} atlandı (tekrar)`
        : `${count} çift içe aktarıldı`,

    // Export modal
    exportModalTitle: 'Kelime Çiftlerini Dışa Aktar',
    exportScope: 'Dışa aktarma kapsamı',
    exportSearchPlaceholder: 'Çift ara...',
    exportSelectAll: 'Tümünü seç',
    exportDeselectAll: 'Seçimi kaldır',
    exportSelectedCount: (n: number, total: number) => `${total} içinden ${n} seçili`,
    exportSectionColumn: 'Bölüm',
    exportSubsectionColumn: 'Alt Bölüm',

    // Import modal
    importChooseFile: 'Dosya Seç',
    importFileHint: '.xlsx, .xls, .ods, .csv desteklenir',
    importFormatHint: 'Sütunlar: Kaynak | Hedef | Bölüm | Alt Bölüm (isteğe bağlı)',
    importPreviewTitle: (n: number) => `Önizleme — ${n} çift`,
    importToImport: (n: number) => `${n} çift içe aktar`,
    importDuplicateLabel: 'Tekrar',
    importSectionPlaceholder: 'Alt bölüm adı...',
    importBack: 'Geri',
    importChecking: 'Tekrarlar kontrol ediliyor...',

    // Word pair row
    enablePair: 'Oyun modunda göster',
    disablePair: 'Oyun modundan gizle',
    save: 'Kaydet',
    cancel: 'İptal',
    deleteWordPairTitle: 'Kelime Çiftini Sil',
    deleteWordPairMessage: (source: string, target: string) => `"${source} → ${target}" silinsin mi?`,

    // Sections (alt bölümler in UI)
    section: 'Alt Bölüm',
    addSection: '+ Alt Bölüm Ekle',
    noSectionsYet: 'Henüz alt bölüm yok.',
    addSectionTitle: 'Alt Bölüm Ekle',
    editSectionTitle: 'Alt Bölümü Düzenle',
    sectionName: 'Alt bölüm adı',
    sectionNamePlaceholder: 'örn. Bölüm 1, Dilbilgisi, Kelime',
    deleteSectionTitle: 'Alt Bölümü Sil',
    deleteSectionMessage: (name: string) => `"${name}" silinsin mi? Bu alt bölümdeki bölümler alt bölümsüz kalacak.`,
    unsectioned: 'Alt Bölüm Yok',

    // Levels (bölümler in UI)
    levels: 'BÖLÜMLER',
    addLevel: '+ Bölüm Ekle',
    noLevelsYet: 'Henüz bölüm yok.',
    addLevelTitle: 'Bölüm Ekle',
    editLevelTitle: 'Bölümü Düzenle',
    levelName: 'Bölüm adı',
    levelNamePlaceholder: 'örn. Başlangıç, A1, Ünite 3',
    nameIsRequired: 'Ad zorunlu',
    deleteLevelTitle: 'Bölümü Sil',
    deleteLevelMessage: (name: string) => `"${name}" silinsin mi? Bu bölümdeki tüm kelime çiftleri de silinecek.`,

    // Play view
    match: 'Eşleştir',
    with: 'İle',
    back: '← Geri',
    progress: 'İlerleme',
    roundComplete: 'Tur tamamlandı!',
    readyForNextBatch: 'Sonraki grup için hazır mısın?',
    allDone: 'Tamamlandı!',
    nextRound: 'Sonraki Tur →',
    finish: 'Bitir',
    youMatchedAll: (total: number) => `${total} kelime çiftinin tamamını eşleştirdiniz.`,
    backToWords: '← Kelimelere dön',
    playAgain: 'Tekrar oyna',

    // Play mode selection
    chooseGameMode: 'Oyun Modu Seçin',
    matchMode: 'Eşleştirme',
    matchModeDesc: 'Kaynak kelimeleri çevirileriyle eşleştirin',
    quizMode: 'Test',
    quizModeDesc: 'Birden fazla seçenek arasından doğru çeviriyi bulun',
    optionCount: 'Seçenek sayısı',
    startGame: 'Başla',

    // Quiz view
    questionOf: (current: number, total: number) => `Soru ${current} / ${total}`,
    correct: 'Doğru!',
    wrong: 'Yanlış!',
    next: 'Sonraki →',
    quizComplete: 'Test Tamamlandı!',
    yourScore: (score: number, total: number) => `${total} sorudan ${score} tanesini doğru bildiniz.`,
    needMorePairs: (n: number) => `Bu mod için en az ${n} kelime çifti gerekli`,
    quizDirection: 'Yön',
    randomDirection: 'Rastgele',

    // Confirm dialog
    confirmDelete: 'Sil',

    // Settings
    settingsTitle: 'Ayarlar',
    darkMode: 'Karanlık Mod',
    language: 'Dil',
    favoriteLanguages: 'Favori Diller',
    favoriteLanguagesHint: 'Bu diller, dil açılır menülerinin üstünde görünür.',
    pairsPerRound: 'Tur başına çift',
    pairsPerRoundHint: 'Her turda kaç kelime çifti görüneceğini belirler.',
    addFavorite: 'Dil ekle...',
    removeFavorite: 'Kaldır',
    languageAlreadyExists: 'Bu dil çifti zaten mevcut.',
    wordPairAlreadyExists: 'Bu kelime çifti bu dilde zaten mevcut.',

    // Language names (for dropdown labels)
    languageNames: {
      Afrikaans: 'Afrikaanca', Albanian: 'Arnavutça', Arabic: 'Arapça',
      Basque: 'Baskça', Belarusian: 'Belarusça', Bulgarian: 'Bulgarca',
      Catalan: 'Katalanca', 'Chinese (Simplified)': 'Çince (Basitleştirilmiş)',
      'Chinese (Traditional)': 'Çince (Geleneksel)', Croatian: 'Hırvatça',
      Czech: 'Çekçe', Danish: 'Danca', Dutch: 'Felemenkçe', English: 'İngilizce',
      Estonian: 'Estonca', Finnish: 'Fince', French: 'Fransızca',
      Galician: 'Galiçyaca', Georgian: 'Gürcüce', German: 'Almanca',
      Greek: 'Yunanca', Gujarati: 'Güceratça', 'Haitian Creole': 'Haiti Kreolü',
      Hebrew: 'İbranice', Hindi: 'Hintçe', Hungarian: 'Macarca',
      Icelandic: 'İzlandaca', Indonesian: 'Endonezce', Irish: 'İrlandaca',
      Italian: 'İtalyanca', Japanese: 'Japonca', Kannada: 'Kannada',
      Korean: 'Korece', Latin: 'Latince', Latvian: 'Letonca',
      Lithuanian: 'Litvanca', Macedonian: 'Makedonca', Malay: 'Malayca',
      Maltese: 'Maltaca', Norwegian: 'Norveçce', Persian: 'Farsça',
      Polish: 'Lehçe', Portuguese: 'Portekizce', Romanian: 'Rumence',
      Russian: 'Rusça', Serbian: 'Sırpça', Slovak: 'Slovakça',
      Slovenian: 'Slovence', Spanish: 'İspanyolca', Swahili: 'Svahili',
      Swedish: 'İsveççe', Tamil: 'Tamilce', Telugu: 'Telugu',
      Thai: 'Tayca', Turkish: 'Türkçe', Ukrainian: 'Ukraynaca',
      Urdu: 'Urduca', Vietnamese: 'Vietnamca', Welsh: 'Galce', Yiddish: 'Yidiş',
    } as Record<string, string>,
  },
} as const;

export type Translations = typeof translations.en;

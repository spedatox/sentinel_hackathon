'use client';

import { useLanguage } from '@/providers/LanguageProvider';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
          language === 'en'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('tr')}
        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
          language === 'tr'
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        TR
      </button>
    </div>
  );
}

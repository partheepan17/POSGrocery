import React from 'react';
import { Globe } from 'lucide-react';
import { useReturnStore } from '@/store/returnStore';

interface LanguagePickerProps {
  className?: string;
}

export function LanguagePicker({ className = '' }: LanguagePickerProps) {
  const { language, setLanguage } = useReturnStore();

  const languages = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'si', label: 'SI', name: 'Sinhala' },
    { code: 'ta', label: 'TA', name: 'Tamil' }
  ] as const;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Globe className="w-4 h-4 text-gray-500" />
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              language === lang.code
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title={lang.name}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}


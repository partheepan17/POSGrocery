// src/components/LanguageSwitcher.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { Dropdown, DropdownMenu, DropdownItem } from './ui/Dropdown';
import { Globe, Check } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', flag: '🇱🇰' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇱🇰' },
];

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  const currentLanguage = languages.find(lang => lang.code === i18n.language.split('-')[0]) || languages[0];

  return (
    <Dropdown
      trigger={
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 min-w-[120px] justify-start"
          title="Select Language"
        >
          <Globe className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline text-sm">{currentLanguage.flag}</span>
          <span className="hidden md:inline text-sm font-medium truncate">
            {currentLanguage.nativeName}
          </span>
          <span className="sm:hidden text-sm font-medium truncate">
            {currentLanguage.flag}
          </span>
        </Button>
      }
      align="right"
      offset={8}
    >
      <DropdownMenu className="min-w-[200px]">
        {languages.map((language) => (
          <DropdownItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            active={i18n.language === language.code}
            className="flex items-center gap-3 px-4 py-3"
          >
            <div className="flex items-center gap-3 flex-1">
              <span className="text-lg">{language.flag}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {language.nativeName}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {language.name}
                </span>
              </div>
            </div>
            {i18n.language === language.code && (
              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            )}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

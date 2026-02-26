'use client';

import { useMemo, useState } from 'react';
import { LanguageOption } from '../types';

interface LanguageSelectorProps {
  value: string;
  languages: LanguageOption[];
  onChange: (value: string) => void;
}

export function LanguageSelector({ value, languages, onChange }: LanguageSelectorProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return languages;
    return languages.filter(
      (lang) => lang.label.toLowerCase().includes(normalized) || lang.value.toLowerCase().includes(normalized),
    );
  }, [query, languages]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Idioma</label>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar idioma..."
        className="w-full mb-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white"
      >
        {filtered.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}

'use client';
import { useState } from 'react';

interface FilterState {
  languages: string[];
  genres: string[];
  formats: string[];
}

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterPanelProps {
  languages: FilterOption[];
  genres: FilterOption[];
  formats: FilterOption[];
  selectedFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  className?: string;
}

interface FilterSectionProps {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function FilterSection({ 
  title, 
  options, 
  selectedValues, 
  onChange, 
  isCollapsed, 
  onToggleCollapse 
}: FilterSectionProps) {
  const handleOptionChange = (value: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedValues, value]);
    } else {
      onChange(selectedValues.filter(v => v !== value));
    }
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="border-b border-gray-200 pb-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onToggleCollapse}
          aria-expanded={!isCollapsed}
          className="flex items-center text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
        >
          <span>{title}</span>
          <svg
            className={`ml-2 w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {selectedValues.length > 0 && (
          <button
            onClick={clearAll}
            className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {!isCollapsed && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={(e) => handleOptionChange(option.value, e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="flex-1 text-sm text-gray-700">{option.label}</span>
              {option.count !== undefined && (
                <span className="text-xs text-gray-500">({option.count})</span>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterPanel({
  languages,
  genres,
  formats,
  selectedFilters,
  onFilterChange,
  className = ''
}: FilterPanelProps) {
  const [collapsedSections, setCollapsedSections] = useState({
    languages: false,
    genres: false,
    formats: false,
  });

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleLanguageChange = (languages: string[]) => {
    onFilterChange({ ...selectedFilters, languages });
  };

  const handleGenreChange = (genres: string[]) => {
    onFilterChange({ ...selectedFilters, genres });
  };

  const handleFormatChange = (formats: string[]) => {
    onFilterChange({ ...selectedFilters, formats });
  };

  const clearAllFilters = () => {
    onFilterChange({ languages: [], genres: [], formats: [] });
  };

  const hasActiveFilters = 
    selectedFilters.languages.length > 0 || 
    selectedFilters.genres.length > 0 || 
    selectedFilters.formats.length > 0;

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Languages */}
      <FilterSection
        title="Languages"
        options={languages}
        selectedValues={selectedFilters.languages}
        onChange={handleLanguageChange}
        isCollapsed={collapsedSections.languages}
        onToggleCollapse={() => toggleSection('languages')}
      />

      {/* Genres */}
      <FilterSection
        title="Genres"
        options={genres}
        selectedValues={selectedFilters.genres}
        onChange={handleGenreChange}
        isCollapsed={collapsedSections.genres}
        onToggleCollapse={() => toggleSection('genres')}
      />

      {/* Formats */}
      <FilterSection
        title="Formats"
        options={formats}
        selectedValues={selectedFilters.formats}
        onChange={handleFormatChange}
        isCollapsed={collapsedSections.formats}
        onToggleCollapse={() => toggleSection('formats')}
      />

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Active Filters:</h3>
          <div className="flex flex-wrap gap-2">
            {selectedFilters.languages.map(lang => (
              <span
                key={`lang-${lang}`}
                className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
              >
                {lang}
                <button
                  onClick={() => handleLanguageChange(selectedFilters.languages.filter(l => l !== lang))}
                  className="ml-1 hover:text-indigo-600"
                  aria-label={`Remove ${lang} filter`}
                >
                  ×
                </button>
              </span>
            ))}
            {selectedFilters.genres.map(genre => (
              <span
                key={`genre-${genre}`}
                className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
              >
                {genre}
                <button
                  onClick={() => handleGenreChange(selectedFilters.genres.filter(g => g !== genre))}
                  className="ml-1 hover:text-green-600"
                  aria-label={`Remove ${genre} filter`}
                >
                  ×
                </button>
              </span>
            ))}
            {selectedFilters.formats.map(format => (
              <span
                key={`format-${format}`}
                className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
              >
                {format}
                <button
                  onClick={() => handleFormatChange(selectedFilters.formats.filter(f => f !== format))}
                  className="ml-1 hover:text-purple-600"
                  aria-label={`Remove ${format} filter`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

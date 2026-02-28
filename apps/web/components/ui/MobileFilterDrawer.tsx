'use client';
import { useState, useEffect } from 'react';
import FilterPanel from './FilterPanel';

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

interface MobileFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  languages: FilterOption[];
  genres: FilterOption[];
  formats: FilterOption[];
  selectedFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function MobileFilterDrawer({
  isOpen,
  onClose,
  languages,
  genres,
  formats,
  selectedFilters,
  onFilterChange,
}: MobileFilterDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter options"
        className={`fixed inset-y-0 right-0 w-80 max-w-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={onClose}
              aria-label="Close filters"
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <FilterPanel
              languages={languages}
              genres={genres}
              formats={formats}
              selectedFilters={selectedFilters}
              onFilterChange={onFilterChange}
              className="shadow-none p-0"
            />
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

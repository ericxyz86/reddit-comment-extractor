import React, { useState } from 'react';
import type { Filters } from '../types';

interface FilterFormProps {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  onExtract: () => void;
  isLoading: boolean;
}

const FilterForm: React.FC<FilterFormProps> = ({ filters, setFilters, onExtract, isLoading }) => {
  const [subredditInput, setSubredditInput] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSubredditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newSubreddit = subredditInput.trim().replace(/,$/, '');
      if (newSubreddit && !filters.subreddits.includes(newSubreddit)) {
        setFilters(prev => ({
          ...prev,
          subreddits: [...prev.subreddits, newSubreddit],
        }));
      }
      setSubredditInput('');
    }
  };

  const handleRemoveSubreddit = (subredditToRemove: string) => {
    setFilters(prev => ({
      ...prev,
      subreddits: prev.subreddits.filter(sub => sub !== subredditToRemove),
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-full">
      <div className="flex flex-col gap-6">
        <div>
          <label htmlFor="subreddit-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Subreddits (press Enter or comma to add)
          </label>
          <div className="flex flex-wrap items-center w-full p-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500">
            <div className="flex flex-wrap gap-2">
              {filters.subreddits.map((sub) => (
                <span key={sub} className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 text-sm font-medium px-2.5 py-1 rounded-full">
                  {sub}
                  <button
                    type="button"
                    onClick={() => handleRemoveSubreddit(sub)}
                    className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-100 focus:outline-none"
                    aria-label={`Remove ${sub}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              id="subreddit-input"
              value={subredditInput}
              onChange={(e) => setSubredditInput(e.target.value)}
              onKeyDown={handleSubredditKeyDown}
              className="flex-grow bg-transparent focus:outline-none text-gray-900 dark:text-white ml-2 p-1 min-w-[120px]"
              placeholder="Add subreddit..."
            />
          </div>
        </div>

        <div>
          <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Boolean Keywords
          </label>
          <input
            type="text"
            name="keywords"
            id="keywords"
            value={filters.keywords}
            onChange={handleInputChange}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
            placeholder="e.g., (react OR vue) AND performance"
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Use operators like AND, OR, NOT and parentheses for complex searches. Comma-separated words are treated as OR.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              id="startDate"
              value={filters.startDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              id="endDate"
              value={filters.endDate}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>
      <div className="mt-6">
        <button
          onClick={onExtract}
          disabled={isLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Extracting...' : 'Extract Comments'}
        </button>
      </div>
    </div>
  );
};

export default FilterForm;
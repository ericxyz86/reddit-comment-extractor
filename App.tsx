import React, { useState, useRef } from 'react';
import FilterForm from './components/FilterForm';
import CommentTable from './components/CommentTable';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorMessage from './components/ErrorMessage';
import { extractComments } from './services/redditApiService';
import type { Filters, Comment } from './types';

// Declare XLSX to be available on the window object from the CDN script
declare const XLSX: any;

const App: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    subreddits: ['phcars', 'CarsPH', 'Gulong', 'Philippines'],
    startDate: '2025-01-01',
    endDate: '2025-11-03',
    keywords: 'byd OR kia',
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleExtract = async () => {
    setIsLoading(true);
    setError(null);
    setComments([]);

    if (!filters.startDate || !filters.endDate) {
        setError("Please select both a start and end date.");
        setIsLoading(false);
        return;
    }

    // Create new AbortController for this extraction
    abortControllerRef.current = new AbortController();

    try {
      const progressHandler = (intermediateComments: Comment[]) => {
        setComments(intermediateComments);
      };

      const finalComments = await extractComments(
        filters,
        progressHandler,
        abortControllerRef.current.signal
      );
      setComments(finalComments);
    } catch (err: unknown) {
      if (err instanceof Error) {
        // Don't show error message if user cancelled
        if (err.message !== "Extraction cancelled") {
          setError(err.message);
        }
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
  
  const handleDownload = () => {
    if (comments.length === 0) return;

    // Use XLSX from window object
    const worksheet = XLSX.utils.json_to_sheet(comments);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reddit Comments');
    XLSX.writeFile(workbook, 'reddit-comments.xlsx');
  };

  return (
    <div className="min-h-screen text-gray-900 dark:text-white">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
            Reddit Comment <span className="text-indigo-600 dark:text-indigo-400">Extractor</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
            Filter and extract comments from your favorite subreddits.
          </p>
        </header>

        <section className="mb-8 max-w-4xl mx-auto">
          <FilterForm 
            filters={filters} 
            setFilters={setFilters} 
            onExtract={handleExtract} 
            isLoading={isLoading} 
          />
        </section>

        <section className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Extracted Comments
              <span className="text-lg font-medium text-gray-500 dark:text-gray-400 ml-2">
                ({comments.length} found)
              </span>
            </h2>
            <div className="flex gap-3">
              {isLoading && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleDownload}
                disabled={comments.length === 0 || isLoading}
                className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Download as Excel
              </button>
            </div>
          </div>

          {error && <ErrorMessage message={error} />}
          
          <div className="mt-4">
            {isLoading && comments.length === 0 ? <LoadingSpinner /> : <CommentTable comments={comments} />}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
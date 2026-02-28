'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HeroSlider from '@/components/ui/HeroSlider';
import MovieGrid from '@/components/ui/MovieGrid';
import FilterPanel from '@/components/ui/FilterPanel';
import MobileFilterDrawer from '@/components/ui/MobileFilterDrawer';
import { useDebounce } from '@/lib/hooks/useDebounce';

interface Movie {
  id: string;
  title: string;
  duration: number;
  posterUrl: string;
  rating?: number;
  genres: string[];
  language?: string;
  description?: string;
}

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

export default function HomePage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const [selectedFilters, setSelectedFilters] = useState<FilterState>({
    languages: [],
    genres: [],
    formats: [],
  });

  // Debounce filter changes to avoid excessive re-renders
  const debouncedFilters = useDebounce(selectedFilters, 300);

  const [filterOptions, setFilterOptions] = useState<{
    languages: FilterOption[];
    genres: FilterOption[];
    formats: FilterOption[];
  }>({
    languages: [],
    genres: [],
    formats: [],
  });

  useEffect(() => {
    const fetchMovies = async () => {
      try {
        console.log('Fetching movies from:', `${process.env.NEXT_PUBLIC_API_URL}/api/movies`);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error('Failed to fetch movies');
        }
        const result = await response.json();
        console.log('API result:', result);
        
        // Extract movies array from API response
        const data = result.data || [];
        console.log('Movies data:', data);
        
        // Transform data to match our Movie interface
        const transformedMovies: Movie[] = data.map((movie: any) => ({
          id: movie.id,
          title: movie.title,
          duration: movie.duration,
          posterUrl: movie.posterUrl,
          rating: undefined, // Rating is MPAA rating (PG-13, R, etc), not numeric score
          genres: movie.genres?.map((g: any) => g.genre.name) || [],
          language: movie.language,
          description: movie.description,
        }));
        
        console.log('Transformed movies:', transformedMovies);
        setMovies(transformedMovies);
        setFilteredMovies(transformedMovies);
        
        // Build filter options
        buildFilterOptions(transformedMovies);
      } catch (err) {
        console.error('Error fetching movies:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchMovies();
  }, []);

  const buildFilterOptions = (movieList: Movie[]) => {
    // Extract unique languages
    const languageSet = new Set<string>();
    const genreSet = new Set<string>();
    
    movieList.forEach(movie => {
      if (movie.language) languageSet.add(movie.language);
      movie.genres.forEach(genre => genreSet.add(genre));
    });

    const languageOptions: FilterOption[] = Array.from(languageSet).map(lang => ({
      value: lang,
      label: lang,
      count: movieList.filter(m => m.language === lang).length,
    }));

    const genreOptions: FilterOption[] = Array.from(genreSet).map(genre => ({
      value: genre,
      label: genre,
      count: movieList.filter(m => m.genres.includes(genre)).length,
    }));

    const formatOptions: FilterOption[] = [
      { value: '2D', label: '2D', count: movieList.length },
      { value: '3D', label: '3D', count: 0 },
      { value: 'IMAX', label: 'IMAX', count: 0 },
    ];

    setFilterOptions({
      languages: languageOptions,
      genres: genreOptions,
      formats: formatOptions,
    });
  };

  useEffect(() => {
    // Apply filters
    let filtered = [...movies];

    if (debouncedFilters.languages.length > 0) {
      filtered = filtered.filter(movie => 
        movie.language && debouncedFilters.languages.includes(movie.language)
      );
    }

    if (debouncedFilters.genres.length > 0) {
      filtered = filtered.filter(movie =>
        movie.genres.some(genre => debouncedFilters.genres.includes(genre))
      );
    }

    setFilteredMovies(filtered);
  }, [debouncedFilters, movies]);

  const handleMovieClick = (movieId: string) => {
    router.push(`/movies/${movieId}`);
  };

  const handleFilterChange = (filters: FilterState) => {
    setSelectedFilters(filters);
  };

  // Get featured movies for hero slider (top 5 rated)
  const featuredMovies = [...movies]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="text-red-600 text-lg">Error: {error}</div>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Slider */}
      {!loading && featuredMovies.length > 0 && (
        <HeroSlider movies={featuredMovies} />
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-6">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="w-full flex items-center justify-center px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-medium">Filters</span>
            {(selectedFilters.languages.length + selectedFilters.genres.length + selectedFilters.formats.length) > 0 && (
              <span className="ml-2 px-2 py-1 bg-indigo-600 text-white text-xs rounded-full">
                {selectedFilters.languages.length + selectedFilters.genres.length + selectedFilters.formats.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filter Panel */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <FilterPanel
                languages={filterOptions.languages}
                genres={filterOptions.genres}
                formats={filterOptions.formats}
                selectedFilters={selectedFilters}
                onFilterChange={handleFilterChange}
              />
            </div>
          </aside>

          {/* Movie Grid */}
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Now Showing</h1>
              <p className="mt-2 text-gray-600">
                {loading ? 'Loading movies...' : `${filteredMovies.length} movies available`}
              </p>
            </div>

            <MovieGrid
              movies={filteredMovies}
              onMovieClick={handleMovieClick}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        languages={filterOptions.languages}
        genres={filterOptions.genres}
        formats={filterOptions.formats}
        selectedFilters={selectedFilters}
        onFilterChange={handleFilterChange}
      />
    </main>
  );
}

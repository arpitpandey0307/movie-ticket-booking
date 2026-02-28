'use client';
import { useState, useEffect } from 'react';
import MovieCard from './MovieCard';

interface Movie {
  id: string;
  title: string;
  posterUrl: string;
  duration: number;
  rating?: number;
  genres: string[];
  language?: string;
}

interface MovieGridProps {
  movies: Movie[];
  onMovieClick: (movieId: string) => void;
  loading?: boolean;
  className?: string;
}

function MovieSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
      <div className="aspect-[2/3] bg-gray-300" />
      <div className="p-4">
        <div className="h-6 bg-gray-300 rounded mb-2" />
        <div className="h-4 bg-gray-300 rounded mb-2 w-3/4" />
        <div className="h-4 bg-gray-300 rounded mb-3 w-1/2" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-300 rounded-full w-16" />
          <div className="h-6 bg-gray-300 rounded-full w-20" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-24 h-24 text-gray-300 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM6 6v12h12V6H6zm3 3a1 1 0 112 0v6a1 1 0 11-2 0V9zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V9z"
        />
      </svg>
      <h3 className="text-xl font-semibold text-gray-600 mb-2">No movies found</h3>
      <p className="text-gray-500 max-w-md">
        Try adjusting your filters or search criteria to find more movies.
      </p>
    </div>
  );
}

export default function MovieGrid({ 
  movies, 
  onMovieClick, 
  loading = false, 
  className = '' 
}: MovieGridProps) {
  const [visibleMovies, setVisibleMovies] = useState<Movie[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in animation
    setIsVisible(false);
    const timer = setTimeout(() => {
      setVisibleMovies(movies);
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [movies]);

  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: 8 }).map((_, index) => (
          <MovieSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (!visibleMovies.length) {
    return (
      <div className={`grid grid-cols-1 ${className}`}>
        <EmptyState />
      </div>
    );
  }

  return (
    <div 
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {visibleMovies.map((movie, index) => (
        <div
          key={movie.id}
          className="animate-fade-in"
          style={{
            animationDelay: `${index * 50}ms`,
            animationFillMode: 'both'
          }}
        >
          <MovieCard
            movie={movie}
            onClick={() => onMovieClick(movie.id)}
          />
        </div>
      ))}
    </div>
  );
}

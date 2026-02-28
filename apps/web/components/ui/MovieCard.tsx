'use client';
import Image from 'next/image';
import { useState } from 'react';

interface MovieCardProps {
  movie: {
    id: string;
    title: string;
    posterUrl: string;
    duration: number;
    rating?: number;
    genres: string[];
    language?: string;
  };
  onClick: () => void;
}

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <svg key="half" className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20" aria-hidden="true">
          <defs>
            <linearGradient id="half-fill">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path fill="url(#half-fill)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }

    return stars;
  };

  return (
    <div 
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View details for ${movie.title}`}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transform hover:scale-105 transition-all duration-200 cursor-pointer overflow-hidden group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] overflow-hidden">
        {!imageError ? (
          <Image
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              <p className="text-sm">No Image</p>
            </div>
          </div>
        )}
        {/* Rating Badge */}
        {movie.rating && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-md text-sm font-semibold" aria-label={`Rating: ${movie.rating} out of 10`}>
            ⭐ {movie.rating}/10
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="p-4">
        <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
          {movie.title}
        </h3>

        {/* Rating Stars */}
        {movie.rating && (
          <div className="flex items-center mb-2">
            <div className="flex mr-2" role="img" aria-label={`${movie.rating} out of 10 stars`}>
              {renderStars(movie.rating)}
            </div>
            <span className="text-sm text-gray-600">{movie.rating}/10</span>
          </div>
        )}

        {/* Duration and Language */}
        <div className="flex items-center text-sm text-gray-600 mb-3">
          <span>{formatDuration(movie.duration)}</span>
          {movie.language && (
            <>
              <span className="mx-2" aria-hidden="true">•</span>
              <span>{movie.language}</span>
            </>
          )}
        </div>

        {/* Genre Badges */}
        {movie.genres.length > 0 && (
          <div className="flex flex-wrap gap-1" role="list" aria-label="Movie genres">
            {movie.genres.slice(0, 2).map((genre, index) => (
              <span
                key={index}
                role="listitem"
                className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
              >
                {genre}
              </span>
            ))}
            {movie.genres.length > 2 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{movie.genres.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

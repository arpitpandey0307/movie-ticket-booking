'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

interface Showtime {
  id: string;
  startTime: string;
  endTime: string;
  screen: {
    id: string;
    name: string;
    theater: {
      id: string;
      name: string;
      address: string;
      city: string;
    };
  };
}

interface Movie {
  id: string;
  title: string;
  description: string;
  posterUrl: string;
  duration: number;
  language: string;
  releaseDate: string;
  rating: string;
  genres: Array<{ genre: { name: string } }>;
  showtimes: Showtime[];
}

export default function MovieDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMovie = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch movie details');
        }
        const result = await response.json();
        setMovie(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchMovie();
    }
  }, [params.id]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatShowtime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading movie details...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'Movie not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Group showtimes by theater
  const showtimesByTheater = movie.showtimes.reduce((acc, showtime) => {
    const theaterName = showtime.screen.theater.name;
    if (!acc[theaterName]) {
      acc[theaterName] = {
        theater: showtime.screen.theater,
        showtimes: []
      };
    }
    acc[theaterName].showtimes.push(showtime);
    return acc;
  }, {} as Record<string, { theater: any; showtimes: Showtime[] }>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gray-900">
        <Image
          src={movie.posterUrl}
          alt={movie.title}
          fill
          className="object-cover object-center opacity-40"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-white">
              <span className="px-3 py-1 bg-yellow-500 text-white rounded font-semibold">
                {movie.rating}
              </span>
              <span>{formatDuration(movie.duration)}</span>
              <span>{movie.language}</span>
              <span>{new Date(movie.releaseDate).getFullYear()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Movie Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About the Movie</h2>
          <p className="text-gray-700 text-base leading-relaxed mb-4">{movie.description}</p>
          
          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((g, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                >
                  {g.genre.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Showtimes */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Showtime</h2>
          
          {Object.keys(showtimesByTheater).length === 0 ? (
            <p className="text-gray-600">No showtimes available for this movie.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(showtimesByTheater).map(([theaterName, data]) => (
                <div key={theaterName} className="border-b border-gray-200 pb-6 last:border-0">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{data.theater.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {data.theater.address}, {data.theater.city}
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {data.showtimes.map((showtime) => (
                      <button
                        key={showtime.id}
                        onClick={() => router.push(`/showtime/${showtime.id}`)}
                        className="px-4 py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors font-semibold text-center"
                      >
                        <div className="text-xs font-medium">{formatDate(showtime.startTime)}</div>
                        <div className="text-base font-bold">{formatShowtime(showtime.startTime)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

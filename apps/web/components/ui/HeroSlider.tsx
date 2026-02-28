'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Movie {
  id: string;
  title: string;
  posterUrl: string;
  rating?: number;
  description?: string;
}

interface HeroSliderProps {
  movies: Movie[];
  autoPlayInterval?: number;
}

export default function HeroSlider({ movies, autoPlayInterval = 5000 }: HeroSliderProps) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered && movies.length > 1) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % movies.length);
      }, autoPlayInterval);

      return () => clearInterval(interval);
    }
  }, [isHovered, movies.length, autoPlayInterval]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + movies.length) % movies.length);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % movies.length);
  };

  if (!movies.length) return null;

  return (
    <div 
      className="relative w-full h-96 md:h-[500px] overflow-hidden bg-gray-900"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="region"
      aria-label="Featured movies carousel"
    >
      {/* Slides */}
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {movies.map((movie, index) => (
          <div key={movie.id} className="w-full h-full flex-shrink-0 relative bg-gray-900">
            <Image
              src={movie.posterUrl}
              alt={`${movie.title} featured poster`}
              fill
              className="object-cover object-center"
              priority={index === 0}
              sizes="100vw"
              quality={90}
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
            
            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl md:text-5xl font-bold mb-4">{movie.title}</h2>
                {movie.description && (
                  <p className="text-lg md:text-xl mb-4 max-w-2xl opacity-90">
                    {movie.description}
                  </p>
                )}
                {movie.rating && typeof movie.rating === 'number' && (
                  <div className="flex items-center mb-4">
                    <div className="flex items-center bg-yellow-500 px-2 py-1 rounded" aria-label={`Rating: ${movie.rating} out of 10`}>
                      <svg className="w-4 h-4 text-white mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-white font-semibold">{movie.rating}/10</span>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => router.push(`/movies/${movie.id}`)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {isHovered && movies.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNext}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {movies.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2" role="tablist" aria-label="Slide navigation">
          {movies.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              role="tab"
              aria-label={`Go to slide ${index + 1}`}
              aria-selected={index === currentSlide}
              className={`w-3 h-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-white ${
                index === currentSlide 
                  ? 'bg-white' 
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

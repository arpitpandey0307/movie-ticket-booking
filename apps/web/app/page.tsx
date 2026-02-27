async function getMovies() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/showtimes/public`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch movies');
  }

  return res.json();
}

export default async function HomePage() {
  const data = await getMovies();

  if (!data || data.length === 0) {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold">Now Showing</h1>
        <p className="mt-4 text-gray-500">No movies available.</p>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Now Showing</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((item: any) => (
          <div key={item.movie.id} className="border rounded-lg p-4 shadow">
            <img
              src={item.movie.posterUrl || '/placeholder.jpg'}
              alt={item.movie.title}
              className="w-full h-64 object-cover rounded"
            />

            <h2 className="text-xl font-semibold mt-4">{item.movie.title}</h2>

            <p className="text-sm text-gray-500">{item.movie.duration} mins</p>

            <div className="mt-4 space-y-2">
              {item.showtimes.map((showtime: any) => (
                <a
                  key={showtime.id}
                  href={`/showtime/${showtime.id}`}
                  className="block bg-black text-white text-center py-2 rounded hover:bg-gray-800"
                >
                  {new Date(showtime.startTime).toLocaleString()}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

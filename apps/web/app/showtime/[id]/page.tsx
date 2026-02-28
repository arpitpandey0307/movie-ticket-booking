export default function ShowtimePage({ params }: { params: { id: string } }) {
  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Select Your Seats</h1>
      <p className="text-gray-500">
        Showtime ID: {params.id}
      </p>
      <p className="mt-4 text-gray-400">
        Seat selection feature coming soon...
      </p>
      <a
        href="/"
        className="mt-6 inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
      >
        Back to Movies
      </a>
    </main>
  );
}

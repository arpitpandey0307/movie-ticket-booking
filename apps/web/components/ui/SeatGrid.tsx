'use client';

type SeatGridProps = {
  seats: any[];
  selectedSeats: string[];
  setSelectedSeats: (ids: string[]) => void;
};

export function SeatGrid({ seats, selectedSeats, setSelectedSeats }: SeatGridProps) {
  const grouped = seats.reduce((acc, seat) => {
    const row = seat.seat.rowLabel;
    if (!acc[row]) acc[row] = [];
    acc[row].push(seat);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([row, rowSeats]) => {
        const seats = rowSeats as any[];
        return (
        <div key={row} className="flex items-center gap-2">
          <span className="w-6 font-bold text-gray-700">{row}</span>
          {seats.map((seat: any) => {
            const isBooked = seat.status === 'BOOKED';
            const isLocked = seat.seatLocks.length > 0;
            const isSelected = selectedSeats.includes(seat.id);

            return (
              <button
                key={seat.id}
                disabled={isBooked || isLocked}
                onClick={() => {
                  if (isSelected) {
                    setSelectedSeats(selectedSeats.filter((s) => s !== seat.id));
                  } else {
                    setSelectedSeats([...selectedSeats, seat.id]);
                  }
                }}
                className={`
                  w-10 h-10 text-xs rounded font-semibold transition-colors
                  ${isBooked ? 'bg-gray-400 cursor-not-allowed text-white' : ''}
                  ${isLocked ? 'bg-yellow-400 cursor-not-allowed text-gray-800' : ''}
                  ${isSelected ? 'bg-blue-600 text-white' : ''}
                  ${!isBooked && !isLocked && !isSelected ? 'bg-green-500 text-white hover:bg-green-600' : ''}
                `}
              >
                {seat.seat.seatNumber}
              </button>
            );
          })}
        </div>
        );
      })}
    </div>
  );
}

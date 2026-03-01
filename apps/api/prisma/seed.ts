import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@moviebooking.com' },
    update: {},
    create: {
      email: 'admin@moviebooking.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create theater owner
  const ownerPassword = await bcrypt.hash('owner123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'owner@moviebooking.com' },
    update: {},
    create: {
      email: 'owner@moviebooking.com',
      password: ownerPassword,
      firstName: 'Theater',
      lastName: 'Owner',
      role: 'THEATER_OWNER',
    },
  });
  console.log('Created theater owner:', owner.email);

  // Create genres
  const actionGenre = await prisma.genre.upsert({
    where: { slug: 'action' },
    update: {},
    create: { name: 'Action', slug: 'action' },
  });

  const dramaGenre = await prisma.genre.upsert({
    where: { slug: 'drama' },
    update: {},
    create: { name: 'Drama', slug: 'drama' },
  });

  const comedyGenre = await prisma.genre.upsert({
    where: { slug: 'comedy' },
    update: {},
    create: { name: 'Comedy', slug: 'comedy' },
  });

  console.log('Created genres');

  // Create movies
  const movie1 = await prisma.movie.create({
    data: {
      title: 'Avengers: Endgame',
      description: 'After the devastating events of Avengers: Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more to reverse Thanos actions and restore balance to the universe.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
      duration: 181,
      language: 'English',
      releaseDate: new Date('2019-04-26'),
      rating: 'PG-13',
      genres: {
        create: [{ genreId: actionGenre.id }],
      },
    },
  });

  const movie2 = await prisma.movie.create({
    data: {
      title: 'The Hangover',
      description: 'Three buddies wake up from a bachelor party in Las Vegas, with no memory of the previous night and the bachelor missing. They make their way around the city in order to find their friend before his wedding.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/9NXAlFEE7WDssbXSMgdacsUD58Y.jpg',
      duration: 100,
      language: 'English',
      releaseDate: new Date('2009-06-05'),
      rating: 'R',
      genres: {
        create: [{ genreId: comedyGenre.id }],
      },
    },
  });

  const movie3 = await prisma.movie.create({
    data: {
      title: 'The Shawshank Redemption',
      description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
      posterUrl: 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
      duration: 142,
      language: 'English',
      releaseDate: new Date('1994-09-23'),
      rating: 'R',
      genres: {
        create: [{ genreId: dramaGenre.id }],
      },
    },
  });

  console.log('Created movies');

  // Create theater
  const theater = await prisma.theater.create({
    data: {
      name: 'Grand Cinema',
      address: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      timezone: 'Asia/Kolkata',
      ownerId: owner.id,
      status: 'APPROVED',
    },
  });

  console.log('Created theater:', theater.name);

  // Create screens
  const screen1 = await prisma.screen.create({
    data: {
      name: 'Screen 1',
      theaterId: theater.id,
      capacity: 100,
    },
  });

  const screen2 = await prisma.screen.create({
    data: {
      name: 'Screen 2',
      theaterId: theater.id,
      capacity: 80,
    },
  });

  console.log('Created screens');

  // Create seats for screen 1
  const rows = ['A', 'B', 'C', 'D', 'E'];
  const seatsPerRow = 20;

  for (const row of rows) {
    for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
      await prisma.seat.create({
        data: {
          screenId: screen1.id,
          rowLabel: row,
          seatNumber: seatNum,
          seatType: seatNum <= 5 || seatNum >= 16 ? 'REGULAR' : 'PREMIUM',
          price: seatNum <= 5 || seatNum >= 16 ? 200 : 300,
        },
      });
    }
  }

  // Create seats for screen 2
  for (const row of rows) {
    for (let seatNum = 1; seatNum <= 16; seatNum++) {
      await prisma.seat.create({
        data: {
          screenId: screen2.id,
          rowLabel: row,
          seatNumber: seatNum,
          seatType: seatNum <= 4 || seatNum >= 13 ? 'REGULAR' : 'PREMIUM',
          price: seatNum <= 4 || seatNum >= 13 ? 180 : 280,
        },
      });
    }
  }

  console.log('Created seats for both screens');

  // Create showtimes for today and tomorrow
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const showtimes = [
    { hour: 10, minute: 0 },
    { hour: 14, minute: 30 },
    { hour: 18, minute: 0 },
    { hour: 21, minute: 30 },
  ];

  const movies = [movie1, movie2, movie3];
  const screens = [screen1, screen2, screen1]; // Alternate screens

  // Create showtimes for each movie
  for (let movieIndex = 0; movieIndex < movies.length; movieIndex++) {
    const movie = movies[movieIndex];
    const screen = screens[movieIndex];

    for (let day = 0; day < 2; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);

      for (const time of showtimes) {
        const startTime = new Date(date);
        startTime.setHours(time.hour, time.minute, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + movie.duration);

        const showtime = await prisma.showtime.create({
          data: {
            movieId: movie.id,
            screenId: screen.id,
            startTime,
            endTime,
          },
        });

        // Create showtime seats
        const seats = await prisma.seat.findMany({
          where: { screenId: screen.id },
        });

        for (const seat of seats) {
          await prisma.showtimeSeat.create({
            data: {
              showtimeId: showtime.id,
              seatId: seat.id,
              status: 'AVAILABLE',
            },
          });
        }
      }
    }
  }

  console.log('Created showtimes and showtime seats for all movies');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

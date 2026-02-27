# Movie Booking Platform - Frontend

Next.js 14 frontend application for the Movie Ticket Booking Platform.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- ShadCN UI
- Zustand (State Management)
- React Hook Form + Zod

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
apps/web/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/             # Utilities and API client
├── store/           # Zustand stores
└── hooks/           # Custom React hooks
```

## Features

- Server-side rendering with Next.js 14
- Responsive design with Tailwind CSS
- Type-safe API calls
- Global state management
- Form validation
- Dark/Light mode support

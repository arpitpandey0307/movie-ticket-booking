# Contributing to Movie Ticket Booking Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/movie-ticket-booking.git
   cd movie-ticket-booking
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start local services**
   ```bash
   docker-compose up -d
   ```

4. **Set up environment variables**
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   cp packages/prisma/.env.example packages/prisma/.env
   ```

5. **Run database migrations**
   ```bash
   cd packages/prisma
   npx prisma migrate dev
   npm run seed
   ```

6. **Start development servers**
   ```bash
   # Terminal 1 - Frontend
   cd apps/web
   npm run dev

   # Terminal 2 - Backend
   cd apps/api
   npm run dev
   ```

## Project Structure

```
movie-ticket-booking-platform/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend
├── packages/
│   ├── shared-types/ # Shared TypeScript types
│   └── prisma/       # Database schema
└── pre-plan/         # Project specifications
```

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types
- Use interfaces for object shapes

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable names
- Write self-documenting code

### Commits
- Use conventional commit messages:
  - `feat:` - New features
  - `fix:` - Bug fixes
  - `docs:` - Documentation changes
  - `chore:` - Maintenance tasks
  - `refactor:` - Code refactoring
  - `test:` - Test additions/changes

Example:
```
feat: add seat locking mechanism
fix: resolve concurrent booking race condition
docs: update API documentation
```

## Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Property-Based Tests
```bash
npm run test:property
```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, tested code
   - Follow coding standards
   - Update documentation

3. **Test your changes**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Provide a clear description
   - Reference any related issues
   - Ensure CI passes

## Code Review

- All PRs require at least one approval
- Address review comments promptly
- Keep PRs focused and reasonably sized
- Update your PR based on feedback

## Areas for Contribution

- Bug fixes
- Feature implementations
- Documentation improvements
- Test coverage
- Performance optimizations
- UI/UX enhancements

## Questions?

Feel free to open an issue for:
- Bug reports
- Feature requests
- Questions about the codebase
- Suggestions for improvements

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

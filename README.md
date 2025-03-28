# Tournament Tracker

A modern web application for tracking and managing badminton tournaments, built with React, TypeScript, and TailwindCSS.

## Features

- Create and manage player profiles
- Set up singles or doubles tournaments
- Support for different tournament formats (knockout, round-robin)
- Real-time tournament bracket visualization
- Track match results and tournament progression

## Project Structure

```
tournament-tracker/
├── src/
│   ├── components/       # React components
│   ├── lib/
│   │   ├── store.ts      # Global state management with Jotai
│   │   └── tournament/   # Tournament logic module
│   │       ├── logic.ts  # Core tournament functions
│   │       ├── types.ts  # Tournament-related types
│   │       ├── index.ts  # Public API exports
│   │       └── __tests__ # Unit tests
│   └── ...
├── public/              # Static assets
└── ...
```

## Tournament Module

The tournament logic is separated into its own module for better testability and reusability:

- **Types (`types.ts`)**: Defines interfaces for tournament state, match results, etc.
- **Logic (`logic.ts`)**: Contains pure functions for tournament operations:
  - Team generation
  - Match creation
  - Tournament progression
  - Winner determination
- **Public API (`index.ts`)**: Exposes the module's functionality

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Testing

Tests are written using Vitest. To run the tests:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## License

MIT 
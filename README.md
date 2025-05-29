# Tournament Tracker

A modern tournament management application built with React, TypeScript, and the brackets-manager library. Create and manage single or double elimination tournaments with an intuitive interface and professional bracket visualization.

## Features

- **Professional Tournament Management**: Powered by the brackets-manager library for robust tournament logic
- **Multiple Tournament Types**: Support for single elimination and double elimination tournaments
- **Game Formats**: Singles and doubles game types
- **Interactive Bracket Visualization**: Professional bracket display using brackets-viewer
- **Local Storage**: All tournament data is stored locally in your browser
- **Real-time Updates**: Click on matches to update scores and see bracket progression
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Jotai for reactive state management
- **Tournament Engine**: brackets-manager for tournament logic
- **Bracket Display**: brackets-viewer for professional bracket visualization
- **UI Components**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS
- **Storage**: Browser localStorage (no backend required)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tournament-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Add Players**: Enter player names in the player setup section
2. **Configure Tournament**: Choose between single/double elimination and singles/doubles format
3. **Create Tournament**: Click "Create Tournament" to generate the bracket
4. **Update Matches**: Click on any ready match in the bracket to enter scores
5. **Track Progress**: Watch the bracket update automatically as matches are completed

## Tournament Types

### Single Elimination
- Players are eliminated after one loss
- Fastest tournament format
- Clear winner determination

### Double Elimination
- Players must lose twice to be eliminated
- Includes winners and losers brackets
- More comprehensive competition format

## Game Formats

### Singles
- Individual player vs player matches
- Direct 1v1 competition

### Doubles
- Team-based matches with paired players
- Automatic team pairing from player list

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

### Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── PlayerSetup.tsx
│   ├── TournamentSetup.tsx
│   └── TournamentView.tsx
├── lib/                # Core logic and utilities
│   ├── localStorage.ts # Local storage implementation
│   ├── tournamentManager.ts # Tournament management wrapper
│   ├── store.ts        # Jotai state management
│   └── utils.ts        # Utility functions
└── App.tsx             # Main application component
```

## Architecture

The application uses a modern, reactive architecture:

- **TournamentManager**: Wraps brackets-manager with local storage
- **LocalStorage**: Custom CRUD implementation for browser storage
- **Jotai Atoms**: Reactive state management for UI updates
- **brackets-viewer**: Professional bracket visualization loaded via CDN

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Acknowledgments

- [brackets-manager](https://github.com/Drarig29/brackets-manager.js) - Tournament management engine
- [brackets-viewer](https://github.com/Drarig29/brackets-viewer.js) - Bracket visualization
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [Jotai](https://jotai.org/) - State management 
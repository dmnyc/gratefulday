# Local Development Setup Guide

This guide will help you set up the Gratitude Calendar project for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js 18+** (Current: Check with `node --version`)
- **npm** (comes with Node.js, check with `npm --version`)
- **Git** (for version control)

### Verifying Prerequisites

```bash
# Check Node.js version (should be 18 or higher)
node --version

# Check npm version
npm --version

# Check Git version
git --version
```

## Installation Steps

### 1. Clone the Repository (if not already done)

```bash
git clone <repository-url>
cd gratitude-calendar
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required dependencies including:
- React and React DOM
- Nostrify (Nostr protocol library)
- TailwindCSS and shadcn/ui components
- TanStack Query
- Vite and development tools
- Testing libraries (Vitest, React Testing Library)

**Note**: The first installation may take a few minutes as it downloads all packages.

### 3. Verify Installation

After installation, verify everything is set up correctly:

```bash
# Type check (verifies TypeScript compilation)
npx tsc --noEmit

# Or run the full test suite (includes type checking, linting, and tests)
npm run test
```

## Running the Development Server

Start the local development server:

```bash
npm run dev
```

The development server will:
- Start on **http://localhost:8080** (or http://[::]:8080)
- Automatically reload when you make changes (Hot Module Replacement)
- Show build errors and warnings in the terminal

Open your browser and navigate to `http://localhost:8080` to see the application.

### Development Server Features

- **Hot Module Replacement (HMR)**: Changes to your code are instantly reflected in the browser
- **Fast Refresh**: React components update without losing state
- **Error Overlay**: Build errors and warnings appear in the browser
- **Source Maps**: Debug your code with original source files

## Available Scripts

### Development

```bash
# Start development server
npm run dev

# The dev script automatically installs dependencies if needed
```

### Building

```bash
# Build for production
npm run build

# Output will be in the `dist/` directory
# Includes optimized assets and production-ready code
```

### Testing

```bash
# Run full test suite (type checking, linting, unit tests, build)
npm run test

# Run tests only (without full validation)
npx vitest

# Run tests in watch mode
npx vitest --watch
```

### Deployment

```bash
# Build and deploy to Nostr hosting
npm run deploy
```

## Project Structure

```
gratitude-calendar/
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── auth/         # Authentication components
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utility functions
│   ├── pages/            # Page components
│   ├── contexts/         # React context providers
│   └── test/             # Test utilities
├── public/               # Static assets
├── docs/                 # Documentation
└── dist/                 # Production build output (generated)
```

## Development Workflow

### Making Changes

1. **Start the dev server**: `npm run dev`
2. **Make your changes** in the `src/` directory
3. **See changes instantly** in the browser (HMR)
4. **Check for errors** in the terminal and browser console

### Code Quality

Before committing changes, ensure:

```bash
# Type checking passes
npx tsc --noEmit

# Linting passes (fix auto-fixable issues)
npx eslint . --fix

# Tests pass
npm run test
```

## Nostr Configuration

### Default Relays

The app connects to these Nostr relays by default:
- `wss://relay.ditto.pub`
- `wss://relay.nostr.band`
- `wss://relay.damus.io`

### Managing Relays

Users can manage their relay connections through the app's settings interface. The app uses NIP-65 for relay management.

### Nostr Account

To use the app's features:
1. **Create a Nostr account** using the in-app signup, or
2. **Log in** with an existing Nostr key using a NIP-07 extension (like Alby, nos2x, etc.)

## Troubleshooting

### Port Already in Use

If port 8080 is already in use:

```bash
# Option 1: Kill the process using port 8080
lsof -ti:8080 | xargs kill -9

# Option 2: Change the port in vite.config.ts
# Edit server.port to a different value
```

### Dependency Issues

If you encounter dependency-related errors:

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

If TypeScript shows errors:

```bash
# Check TypeScript version
npx tsc --version

# Verify tsconfig.json is correct
cat tsconfig.json

# Run type checking
npx tsc --noEmit
```

### Build Errors

If the build fails:

```bash
# Check for syntax errors
npx eslint .

# Verify all imports are correct
npx tsc --noEmit

# Clear Vite cache
rm -rf node_modules/.vite
```

### Browser Compatibility

The app uses modern JavaScript features. For best results, use:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Environment Variables

Currently, the app doesn't require any environment variables. All configuration is handled through:
- Default relay settings in `AppProvider.tsx`
- User preferences stored in localStorage
- NIP-65 relay management

If you need to add environment variables in the future:
1. Create a `.env` file in the root directory
2. Add variables with `VITE_` prefix (required for Vite)
3. Access them in code with `import.meta.env.VITE_YOUR_VAR`

## IDE Setup

### Recommended Extensions (VS Code)

- **ESLint**: For code linting
- **Prettier**: For code formatting (optional)
- **TypeScript**: Built-in TypeScript support
- **Tailwind CSS IntelliSense**: For Tailwind class autocomplete

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

## Next Steps

Once your local environment is set up:

1. **Explore the codebase**: Start with `src/pages/Index.tsx` and `src/components/CalendarView.tsx`
2. **Read the documentation**: Check `docs/` for feature-specific guides
3. **Review the NIP**: See `NIP.md` for the custom event kind specification
4. **Make your first change**: Try modifying a component and see it update in real-time

## Getting Help

- Check the main [README.md](../README.md) for project overview
- Review documentation in the `docs/` directory
- Check [NIP.md](../NIP.md) for Nostr protocol details
- Review [AGENTS.md](../AGENTS.md) for development guidelines

---

**Happy coding!** ✨


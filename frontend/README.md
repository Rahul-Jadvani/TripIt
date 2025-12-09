# 0x.ship - Proof-Weighted Hackathon Discovery Platform

A Reddit-style platform for discovering hackathon projects with proof-based credibility verification on 0x.ship.

## Tech Stack

This project is built with:

- **Frontend Framework**: React 18.3
- **Build Tool**: Vite 5.4
- **Language**: TypeScript 5.8
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn-ui (Radix UI + Tailwind)
- **Blockchain**: Wagmi 2.18 + Viem 2.38 + Reown AppKit
- **Forms**: React Hook Form + Zod validation
- **State Management**: Zustand 5.0
- **Data Fetching**: TanStack React Query 5.83
- **Charts**: Recharts 2.15
- **Notifications**: Sonner 1.7

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable React components
│   ├── pages/          # Page components
│   ├── services/       # API and utility services
│   ├── hooks/          # Custom React hooks
│   ├── types/          # TypeScript type definitions
│   ├── config/         # Configuration files
│   └── main.tsx        # App entry point
├── public/             # Static assets
│   └── favicon.ico     # Favicon
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── tsconfig.json       # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install
```

### Development

Run the development server with hot module reloading:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Create an optimized production build:

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:

```bash
npm run preview
```

### Linting

Run ESLint to check code quality:

```bash
npm run lint
```

## Key Features

- **Proof-Based Credibility**: Verify hackathon projects with on-chain proof
- **Reddit-Style Discovery**: Upvote and discuss projects
- **Web3 Integration**: Connect with Wagmi/Viem wallet support
- **Responsive Design**: Mobile-first UI with Tailwind CSS
- **Type-Safe**: Full TypeScript support for better developer experience

## Configuration Files

### Vite Configuration
- **File**: `vite.config.ts`
- Configures Vite build system and React Fast Refresh plugin

### Tailwind CSS
- **File**: `tailwind.config.js`
- Custom design tokens and shadcn-ui component imports

### TypeScript
- **File**: `tsconfig.json`
- Strict mode enabled for better type safety

### ESLint
- **File**: `eslint.config.js`
- Code quality and style enforcement

## Deployment

The `dist/` folder can be deployed to any static hosting service:

- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Any web server

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Commit with clear messages
5. Push and create a pull request

## License

Proprietary - 0x.ship

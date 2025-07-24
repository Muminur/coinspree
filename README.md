# CoinSpree - Cryptocurrency All-Time High Notifications

Real-time ATH notification service for the top 100 cryptocurrencies built with Next.js 14 and deployed on Vercel.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Database**: Vercel KV
- **Deployment**: Vercel Platform
- **Email**: Resend
- **Validation**: Zod

## Project Structure

```
/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # Reusable components
│   ├── lib/                # Utility functions
│   ├── types/              # TypeScript definitions
│   └── config/             # App configuration
├── CLAUDE.md               # Development guide
├── PLANNING.md             # Project planning
└── TASKS.md               # Task tracking
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

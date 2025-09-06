# Genesis Project

A private internal SaaS tool built with Next.js 14, Tailwind CSS, shadcn/ui, Clerk authentication, and Supabase.

Langgraph will be used to implement agents (instead of MCP)
Child got cancer

## Tech Stack

-   **Frontend**: Next.js 14 with App Router
-   **Styling**: Tailwind CSS
-   **Components**: shadcn/ui
-   **Authentication**: Clerk
-   **Database**: Supabase
-   **Deployment**: Vercel

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:
   Copy the `.env.local` file that was created and update the following variables:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

-   ✅ Next.js 14 with App Router
-   ✅ Tailwind CSS fully configured
-   ✅ shadcn/ui components ready to use
-   ✅ Clerk authentication with protected routes
-   ✅ TypeScript support
-   ✅ ESLint configuration
-   ✅ Responsive dashboard layout

## Project Structure

```
├── app/                 # Next.js App Router pages
│   ├── dashboard/       # Protected dashboard page
│   ├── sign-in/         # Clerk sign-in page
│   ├── sign-up/         # Clerk sign-up page
│   ├── globals.css      # Global styles with Tailwind
│   ├── layout.tsx       # Root layout with Clerk provider
│   └── page.tsx         # Home page with auth logic
├── components/          # Shared React components
│   └── ui/              # shadcn/ui components
├── lib/                 # Utility functions
├── types/               # TypeScript type definitions
└── middleware.ts        # Clerk authentication middleware
```

## Authentication Flow

-   Unauthenticated users are shown a login screen on the home page
-   After login, users are redirected to `/dashboard`
-   The dashboard displays a personalized greeting using the user's first name
-   All routes except `/`, `/sign-in`, and `/sign-up` require authentication

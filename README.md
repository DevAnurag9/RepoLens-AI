# RepoLens AI

RepoLens AI is a sleek Next.js web app that analyzes GitHub repositories and returns a concise, portfolio-friendly summary of a project's purpose, difficulty, required skills, setup time, and resume value.

## Features

- Minimalist dark-mode landing page
- GitHub repository URL input
- Backend analysis route for GitHub + Gemini-based insights
- Graceful fallback analysis when the AI service is unavailable
- Responsive, modern UI built with Tailwind CSS and shadcn-style components

## Tech Stack

- Next.js App Router
- Tailwind CSS
- shadcn/ui-inspired components
- lucide-react icons
- GitHub REST API
- Google Gemini API

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a local environment file:
   ```bash
   .env.local
   ```
   Add:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.0-flash
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000

## Deployment

This project is ready to deploy on Vercel.

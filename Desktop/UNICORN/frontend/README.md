# VectriOS Frontend

Minimal, enterprise-grade UI for Close Rate Diagnostic.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Direct FastAPI integration

## Design System

- Background: `#0B0F19`
- Card: `#111827`
- Accent: `#22D3EE` (cyan)
- Font: Inter

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Pages

- `/` - Landing page
- `/diagnostic` - Diagnostic form
- `/results` - Results dashboard

## API Integration

Frontend connects directly to FastAPI backend at `http://127.0.0.1:8000`.

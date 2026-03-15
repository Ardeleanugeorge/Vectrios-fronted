# 🚀 Quick Setup - Close Rate Diagnostic UI

## Installation

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

Open: `http://localhost:3000`

## Build for Production

```bash
npm run build
npm start
```

---

## Requirements

- Node.js 18+ 
- npm or yarn
- FastAPI backend running on `http://127.0.0.1:8000`

---

## Project Structure

```
frontend/
├── app/
│   ├── page.tsx              # Landing page
│   ├── diagnostic/page.tsx    # Form page
│   └── results/page.tsx       # Results page
├── components/
│   ├── DiagnosticForm.tsx    # Form component
│   └── ResultCard.tsx         # Card component
└── package.json
```

---

## API Configuration

Backend URL is hardcoded in `DiagnosticForm.tsx`:
```typescript
fetch("http://127.0.0.1:8000/close-rate-diagnostic", ...)
```

To change backend URL, edit `components/DiagnosticForm.tsx`.

---

## Design System

- **Background**: `#0B0F19`
- **Cards**: `#111827`
- **Accent**: `#22D3EE` (cyan)
- **Font**: Inter (system fallback)

---

**Status**: ✅ Ready to run

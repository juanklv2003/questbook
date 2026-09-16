# QuestBook — Flashcards con IA

Subí un PDF y generá tarjetas de estudio con IA. Repasá con sesiones guiadas, evaluá tus respuestas y seguí tu progreso desde una biblioteca de libros.

## Stack

- **Backend** (`backend/`): Node.js + Express 5 + TypeScript, PostgreSQL (Neon), Gemini AI (con failover de claves), Cloudinary (PDFs), JWT HttpOnly-cookie, validación con Zod.
- **Frontend** (`frontend/`): React 19 + Vite + Tailwind CSS v4, Atomic Design + Container/Presentational, `axios`, `lucide-react`, `framer-motion`.

## Arranque local

**Backend** (puerto 3000):

```bash
cd backend
npm install
# copiar .env.example a .env y completar (Neon, Gemini, JWT, Cloudinary)
npm run dev
```

**Frontend** (puerto 5173):

```bash
cd frontend
npm install
# copiar .env.example a .env y ajustar VITE_API_URL si hace falta
npm run dev
```

Servicios listos en:

- API + `/api/v1/health` → `http://localhost:3000/api/v1`
- Web → `http://localhost:5173`

## Scripts útiles

```bash
# Backend
npm run build   # tsc → dist/
npm start       # node dist/server.js (producción)

# Frontend
npm run build   # tsc -b && vite build → dist/
npm run lint    # eslint .
```

## Despliegue

Guía paso a paso (Vercel/Netlify + Render/Railway) en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Documentación

- Arquitectura y detalle de APIs: [`docs/project-context.md`](docs/project-context.md) (fuente de verdad; mantenelo al día).
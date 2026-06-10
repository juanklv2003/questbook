# Proposal: Memo AI Architecture & Foundations

## 1. Executive Summary
A ver, pichón. No vamos a armar este proyecto a las apuradas con un "todo en un archivo". Memo AI requiere una arquitectura SÓLIDA desde el día cero. Vamos a usar un **Standard Dual-Folder Setup** porque no quiero agregar la complejidad de un monorepo (Turborepo/Nx) si no hay necesidad inmediata, pero VAMOS A MANTENER LAS COSAS DESACOPLADAS. Frontend (React) por un lado, Backend (Express) por el otro, y Neon DB como persistencia. La clave de todo esto es la **Hexagonal/Clean Architecture** en el back, y **Container-Presentational / Atomic Design** en el front. Si mezclamos lógica de negocio con la UI, me voy a enojar en serio.

## 2. Backend Architecture (memo-server)

### Screaming Architecture & Hexagonal Patterns
El backend NO VA A SER una bolsa de gatos de `controllers` y `routes` sueltos. Vamos a organizar todo por DOMINIOS (Screaming Architecture). Cada módulo expone sus casos de uso (Ports) y se conecta al exterior mediante Adapters (HTTP controllers, Postgres repositories, Gemini API clients).

```
memo-server/
├── src/
│   ├── config/              # Environment, DB config, API keys
│   ├── core/                # Shared utilities, domain errors, base interfaces
│   ├── modules/
│   │   ├── decks/           # DECK DOMAIN
│   │   │   ├── domain/      # Entities, Repository Interfaces
│   │   │   ├── useCases/    # Application logic (CreateDeck, ExtractPDF)
│   │   │   ├── infra/       # PostgresDeckRepository, GeminiClient
│   │   │   └── http/        # Express routers and controllers
│   │   ├── flashcards/      # FLASHCARD DOMAIN
│   │   └── evaluations/     # EVALUATION DOMAIN
│   └── app.ts               # Express application setup
```

### WHY this way?
Porque mañana querés cambiar de Gemini a ChatGPT, o de Neon a Prisma, y NO TENÉS QUE TOCAR la lógica de negocio. Eso es profesionalismo. Aislar la IA detrás de una interfaz `FlashcardGeneratorPort` te salva la vida.

## 3. Frontend Architecture (memo-client)

### Atomic Design + Container-Presentational
Vite + React + TS + Tailwind. Pero ojo con poner llamadas a la API adentro de un botón, boludo.

```
memo-client/
├── src/
│   ├── assets/
│   ├── core/                # Domain models, types, constants
│   ├── services/            # API clients (Axios/Fetch abstractions)
│   ├── hooks/               # Custom hooks for state (Container logic)
│   ├── components/
│   │   ├── atoms/           # Buttons, Inputs, Typography
│   │   ├── molecules/       # Form fields, Card structures
│   │   └── organisms/       # Complex sections (FlashcardPlayer, DeckList)
│   ├── pages/               # Presentational pages
│   └── containers/          # Stateful wrappers connecting services/hooks to Pages
```

### WHY this way?
Separación de responsabilidades. La vista se encarga de DIBUJAR. El contenedor se encarga de ORQUESTAR. Así se puede testear la vista sin mockear el mundo entero.

## 4. Database Schema (Neon PostgreSQL)

Usamos `@neondatabase/serverless` para evitar cuellos de botella con las conexiones. Nada de ORMs mágicos al principio si no entendemos SQL; pero vamos a usar algo ligero como Kysely o Drizzle para type safety, o SQL puro con `pg` si querés ir bien a las bases.

```sql
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID REFERENCES decks(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```
*(Se usarán índices en `deck_id` y `folder_id` para optimizar consultas).*

## 5. Next Steps
1. Aprobar esta propuesta arquitectónica.
2. Pasar a `sdd-spec` para definir los contratos API exactos, los prompts de Gemini en detalle y los componentes de React que vamos a necesitar.
3. No escribir ni UNA LÍNEA DE CÓDIGO hasta que los contratos estén definidos. ¿ENTENDIDO?

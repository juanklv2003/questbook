---
name: mcp-context
description: Carga y unifica el contexto del repositorio (arquitectura, endpoints, envs, reglas SDD) y elige qué MCP usar (github, playwright, devtools, context7). Actívate al iniciar un cambio o diagnóstico en FlashyIA/Memo AI para no trabajar "a ciegas", o cuando se necesite información reciente de dependencias/GitHub y validación visual/navegador.
---

# MCP Context — Contexto de proyecto y selección de herramientas

Antes de modificar código en este repo, el agente debe montar el contexto completo y elegir la herramienta MCP correcta.

## 1. Contexto rápido obligatorio (en este orden)
1. `docs/project-context.md` → "single source of truth" (arquitectura, endpoints, reglas).
2. `.agent/sdd/` → especificaciones por feature: `memo-ai/` (base), `auth-system/` (login/registro), `deck-management/` (PDF→mazos), `router/` (react-router pendiente).
3. `backend/src/config/env.ts` → variables de entorno obligatorias.
4. `frontend/src/lib/axios.ts` y `.env` → URL de la API.
5. Estado de la DB: las 3 migraciones de `backend/src/scripts/*` (initDb, migrateAuth, migratePdfStorage).

## 2. Elección de MCP según la tarea
| Tarea | MCP a usar |
|---|---|
| Deps con versiones actuales, APIs recientes | `context7` |
| Navegador real: click, formularios, screenshots | `playwright` |
| Consola Chrome/atan, rendimiento, red | `devtools` |
| Issues/PRs, código, releases en GitHub | `github` |

No uses MCP cuando no aporte: para refactors internos basta con los archivos locales.

## 3. Reglas de uso
- Si la tarea toca la API: verifica primero los routers (`backend/src/modules/*/http/*Router.ts`) y el `docs/project-context.md` para actualizarlo si cambias algo.
- Si cambias env: sincroniza `.env.example` y la lista en `backend/src/config/env.ts`.
- Antes de "voy a implementar X": comprobar en `.agent/sdd/` si ya hay una spec del feature para seguirla (SDD).
- Aplica los skills de diseño (`emil-kowalski`, `impeccable-taste`, `diseno-skill`) en todo trabajo de UI.
- Después de cada cambio, verificar con typecheck/build del lado tocado (`backend`: `npm run build`; `frontend`: `npm run build`).

## 4. Engram — al empezar y al terminar (obligatorio)
Este proyecto usa Engram como memoria persistente. Al EMPEZAR cualquier tarea:
1. Busca memoria previa: `engram search <keywords> --project flashcards-ia` (o el binario en `C:\Users\carlo\AppData\Local\engram\bin\engram.exe`).
2. Guarda un observation con el objetivo/estado inicial (`type: discovery|decision`).

Al TERMINAR (antes de responder final, y tras verificar con build/tests/curl):
1. Guarda el estado final con `engram save` (mismo formato que `.cline/rules/engram.md`).
2. Incluye qué se verificó y el siguiente paso.

Nunca escribas secrets (API keys) en engram — referéncialos como "ver backend/.env".
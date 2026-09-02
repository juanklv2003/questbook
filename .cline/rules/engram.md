# Engram — Protocolo de estado obligatorio (FlashyIA / flashcards-ia)

Cada vez que un agente **empiece** o **termine** una tarea en este proyecto, DEBE persistir el estado en
Engram (memoria persistente local). No es opcional.

## Cómo guardar (CLI, sin necesidad de MCP)

```
engram save "Título corto verb-first" "contenido" --type config|discovery|decision|bugfix|pattern|architecture --project flashcards-ia --scope project
```

Si el CLI no está en PATH, usar:
```
C:\Users\carlo\AppData\Local\engram\bin\engram.exe save ...
```

## Contenido mínimo del mensaje (estado)

```
**What**: Qué se hizo (1 frase)
**Why**: Por qué / qué lo motivó
**Where**: Archivos o rutas afectadas
**Learned**: Gotchas / aprendizajes (opcional)
## Estado actual
- completado: ...
- pendiente: ...
- siguiente paso: ...
```

## Al empezar una tarea
- Guardar un observation `type: discovery|decision` con el objetivo y el punto de partida.
- Buscar primero memoria previa: `engram search <keyword> --project flashcards-ia`

## Al terminar una tarea
- Guardar un observation `type: architecture|bugfix|config` con el estado final y siguientes pasos.
- Incluir QUÉ se verificó (tests/build/curl) para que la próxima sesión no repita trabajo.

## Reglas
- Usa siempre `--project flashcards-ia`.
- Un mismo `topic`/título sobre un tema que evoluciona se sobrescribe a propósito (engram es memoria de trabajo).
- Datos sensibles (API keys, secrets) NO se escriben en engram; se referencian como "ver backend/.env".
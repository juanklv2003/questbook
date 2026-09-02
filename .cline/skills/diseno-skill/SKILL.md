---
name: diseno-skill
description: Skill de diseño UI/UX (en español) para FlashyIA / Memo AI. Actívala al diseñar pantallas de la app (login, dashboard, estudio, deck uploader, vistas de flats), al crear o modificar componentes React/Tailwind, para mantener el sistema de diseño (Atomic Design + Tailwind tokens) y para lograr la estética tipo memo.cards / Anki que el producto busca.
---

# Diseño Skill — FlashyIA / Memo AI

Producto: app de estudio con **carpetas → mazos de flashcards → sesión de estudio**. La referencia visual es https://www.memo.cards/ y el espíritu de `flashyCOmienzo.txt`.

## Mapa UI objetivo
- **Panel lateral oscuro** + área principal clara (dashboard)
- **Mazos como libros físicos**: con lomo, páginas y marcapáginas (puro CSS/Tailwind)
- **Sesión de estudio**: pantalla dividida (split-screen): tarjeta activa | área de respuesta escrita (`textarea`)
- Feedback de evaluación con porcentaje y consejo

## Sistema de diseño (ya existente en el repo, respétalo)
- Tailwind CSS v4 + `clsx` + `tailwind-merge` (`cn()`)
- Tokens semánticos del tema en `index.css` (usa `bg-background`, `text-foreground`, `text-muted-foreground`, `border`, `ring`, `primary`, `destructive`, `muted`)
- Arquitectura: `atoms` (Button, Input, Badge, PasswordField, TextArea) → `molecules` (Flashcard, EvaluationResult) → `organisms` (LoginForm, DeckUploader, StudyPlayer, PdfViewer) → `containers` (estado+APIs via hooks). **No hagas fetch en organisms/atoms.**
- Iconos: `lucide-react`. Animaciones: `framer-motion`. Tipografía: `font-sans` (config tailwind).

## Pautas concretas
1. **Layout**: `min-h-screen`, header sticky con `backdrop-blur`, contenedor `container mx-auto max-w-*`.
2. **Cards de deck**: forma de libro — borde izq más ancho (lomo), hover eleva + sombra suave, marcapáginas como un pequeño rectángulo coloreado en el borde superior.
3. **Color**: un primario (indigo/violeta/azul), neutros con `bg-background`/`muted`; estados con `destructive`/éxito verde semántico. Cuidado con contraste AA para textos.
4. **Tipografía**: títulos `tracking-tight`, body `text-muted-foreground`; microcopy siempre en español.
5. **Estados**: loading (`animate-pulse`, skeletons), empty state bonito en dashboard (icono + título + CTA), error con banner.
6. **Accesibilidad**: `label` en todo input, `aria-label` en icon-button, `cursor-pointer` en interactivos, `Enter` debe poder submit (requisito del proyecto).
7. **Nunca**: colores hex hardcodeados fuera de `index.css`, margenes raros (respeta escala 4/8/12/16/24/32), JSX con lógica compleja (sácala a hooks/containers), negritas en párrafos largos.

## Checklist de pantalla
- [ ] ¿Sigue atomic design y usa los componentes existentes?
- [ ] ¿Tiene estados (loading/empty/error/hover/focus)?
- [ ] ¿Funciona en móvil (360px) y desktop (1440px)?
- [ ] ¿Español correcto en todos los textos?
- [ ] ¿Contraste AA? ¿focus visible con `ring`?
- [ ] ¿Los mazos parecen libros de verdad (lomo/páginas/marcapáginas)?
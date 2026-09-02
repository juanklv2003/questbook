---
name: impeccable-taste
description: Diseño frontend con gusto impecable. Actívate cuando el usuario cree, refine o revise interfaces o componentes de UI/UX (React, Tailwind, CSS) buscando un acabado moderno, pulido y elegante; cuando mencione "impeccable taste", "que se vea profesional", "buen diseño", o cuando se pida seguir el nivel estético de productos como Vercel, v0, Linear, Stripe o Raycast.
---

# Impeccable Taste — Frontend Design Skill

Cuando se active, tus interfaces deben sentirse **intencionadas**: nada queda "default" o genérico. Cada píxel responde a una decisión.

## Principios no negociables

1. **Jerarquía clara**: Un foco visual por pantalla. Usa tamaño, peso y color de tipografía para escalar importancia; nunca dependas solo de la posición.
2. **Tipografía cuidada**: Usa una fuente display para títulos y una UI para el cuerpo (o jerarquía de la misma familia). Ajusta `line-height` (1.15–1.25 en títulos) y `letter-spacing` (más suelto en títulos `-0.02em~-0.04em`). Sin titulares gigantes por defecto: el tamaño justo siempre gana.
3. **Espaciado con intención**: Usa una escala consistente (4/8/12/16/24/32/48/64). Más aire en secciones clave; menos entre elementos relacionados (ley de proximidad).
4. **Superficies profundas**: Combina `background`, `border` muy sutil (blanco/negro al 5-10%), y sombras suaves en capas (`shadow-xs/sm`, difuminado grande, opacidad baja). Evita sombras duras.
5. **Color sobrio**: 1 color primario + 1 acento + neutros (con tintado para bg/foreground/muted). Evita paletas arcoíris; el color se usa para estado y significado (éxito/error/warning), no decoración.
6. **Micro-interacciones**: `transition` de 150–200ms con easing suave (`cubic-bezier(0.4,0,0.2,1)`), `hover`/`focus`/`active` en todo elemento interactivo, `focus-visible` con anillo (`ring`) en lugar de outline feo, cursores correctos, respeto a `prefers-reduced-motion`.
7. **Densidad honrada**: Defínela por pantalla (densa en tablas/repaso, espaciada en landing). Nunca dejes textos amontonados contra bordes.
8. **Estados de todo**: empty state, loading state, error state, success feedback. Una UI con buen gusto se nota cuando no hay datos.

## Checklist de revisión (al terminar cualquier pantalla)

- [ ] ¿Hay un solo elemento principal que gana la atención?
- [ ] ¿La tipografía tiene escala y ritmo (0/1/2/3/4) coherentes?
- [ ] ¿Los bordes/radios son consistentes (usa el token o clase `rounded-*` del sistema)?
- [ ] ¿Cada botón/input tiene hover y focus visible?
- [ ] ¿Escala `muted-foreground` para info secundaria, `foreground` para primaria?
- [ ] ¿Los espaciados siguen la escala de 4? ¿Hay valores raros (13px, 17px, 27px)?
- [ ] ¿Las sombras son difusas y sutiles, no negras planas?
- [ ] ¿Se ve bien con pantalla ~360px (mobile) y ~1440px (desktop)?
- [ ] ¿Se ve bien con `prefers-reduced-motion` y en modo oscuro si la app lo soporta?

## Mientras codifiques

- Prefiere **clases utilitarias del sistema de diseño** (semantics: `bg-background`, `text-muted-foreground`, `border-input`) antes que colores hardcodeados.
- Usa `cn()` (clsx + tailwind-merge) para combinar clases.
- Nombrá componentes con atomic design del proyecto (`atoms`, `molecules`, `organisms`, `containers`).
- No dejes `console.log`, comentarios basura ni código muerto.
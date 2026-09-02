---
name: emil-kowalski
description: Implementa componentes React/Tailwind obsesionados por el detalle, con el enfoque de Emil Kowalski. Úsala al construir o revisar componentes visuales (botones, inputs, cards, modales, menús, dashboards, flashcards) y cuando se pida un acabado "minucioso", "detallista", "polished" o estilo premium tipo Radix/Linear.
---

# Emil Kowalski — Detail-Complete UI Skill

Construye la UI en tres niveles, siempre, en ese orden:

## 1. Layout (Estructura)
- Bloquea primero la estructura y proporciones generales: contenedor, grid, ratio de tarjetas, anchos. Piensa en escalas de pantalla (mobile/tablet/desktop).
- Alinea con una **grid de 12 columnas** o flexbox bien pensado; nada queda "flotando al azar".
- Los contenedores grandes: `container`, `max-w-*`; los internos: `grid gap-*` con bandas coherentes.

## 2. Componentes (Interfaz)
- Define **props claros** para cada componente (className, variants, disabled, loading, size) y usa `cva`-like simple o clases condicionales con `cn()`.
- Estados: `default / hover / focus / active / disabled / loading / error`. Cada uno con estilo explícito.
- Radios consistentes: usa 6–8px en controles, 10–12px en cards, 16px en modales/landing (o los tokens del proyecto).
- Inputs/buttons altura coherente dentro de la misma fila (usa `h-9/h-10` unificadas), iconos alineados a 20px/24px.

## 3. Detalles (El 10% final que marca la diferencia)
- Sombras: usa difuminados suaves (3 a 4 capas). `hover` sube el card 1–2px con shadow mayor y `transition-transform`.
- Bordes: `1px` con opacidad baja (`border-black/5` o `border-white/10` en dark).
- Focus: anillo con `focus-visible:ring-2 focus-visible:ring-ring/40`; nunca `outline` descuadrado.
- Gradientes/patrones sutiles: solo si aportan (nunca neón por defecto). `bg-gradient-to-br from-* via-* to-*` con opacidades suaves.
- Acentos bulkware: un `primary` para acciones, un `destructive` para peligro, un `muted` para pasivo. Nunca dos colores primarios compitiendo.
- Tipografía con `tracking-tight` en títulos largos y párrafos con `leading-relaxed` y `text-muted-foreground`.
- Micro-details siempre: `cursor-pointer`, `select-none` en botones, `aria-label` en iconos sueltos, `title` en tooltips clave.
- Estados vacíos: diseña el "nada aquí todavía" con ilustración/ícono enmarcado, título, copy y CTA.

## Reglas de oro
- Menos es más: si un detalle llama la atención sobre sí mismo, quítalo.
- Consistencia > creatividad: reutiliza los átomos del proyecto (`Button`, `Input`, `Badge`, `Card`) - no reinventes en cada pantalla.
- Presta especial atención a **alineaciones**: los textos deben compartir `leading`, los iconos el mismo box (`w-* h-*`), los botones la misma línea base.
- Termina siempre con un repaso visual mental en 320px, 768px y 1440px.
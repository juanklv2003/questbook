import * as React from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown } from "lucide-react"
import { useLanguage } from "../../i18n/LanguageContext"
import {
  LEGACY_DECK_COLORS,
  hexToHsv,
  hexToRgb,
  hsvToHex,
  isLegacyDeckColor,
  pickerHex,
  rgbToHex,
  type Hsv,
  type LegacyDeckColor,
} from "../../lib/deckColor"

/** Etiqueta i18n de cada color histórico (los mismos nombres de siempre). */
const PRESET_LABEL_KEY: Record<LegacyDeckColor, "up.brown" | "up.violet" | "up.green" | "up.amber" | "up.rose"> = {
  primary: "up.brown",
  violet: "up.violet",
  emerald: "up.green",
  amber: "up.amber",
  rose: "up.rose",
}

/** Color CSS de cada preset en la fila de atajos. */
const PRESET_SWATCH: Record<LegacyDeckColor, string> = {
  primary: "hsl(var(--primary))",
  violet: "#7c3aed",
  emerald: "#059669",
  amber: "#d97706",
  rose: "#e11d48",
}

const HUE_TRACK =
  "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"

/**
 * El panel va en un portal con `position: fixed`: dentro del drawer de crear
 * mazo el contenedor tiene `overflow-y-auto` y un panel `absolute` quedaba
 * recortado (se veía sólo la franja de arriba).
 */
const PANEL_GAP = 8
const PANEL_MIN_WIDTH = 260
/** Alto aproximado del panel, para decidir si conviene abrir hacia arriba. */
const PANEL_PREFERRED_HEIGHT = 340

export interface DeckColorPickerProps {
  /** `#rrggbb` o uno de los cinco nombres históricos. */
  value: string
  onChange: (value: string) => void
  /** Id de la etiqueta externa que nombra este control. */
  labelId?: string
  disabled?: boolean
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

/**
 * Selector de color del libro: un botón (la muestra) que abre un panel con un
 * área para arrastrar, una barra de tono y entradas RGB.
 *
 * El arrastre manda sobre todo lo demás: mientras el puntero se mueve se emite el
 * hex nuevo, y el estado interno se resincroniza desde la prop sólo cuando el hex
 * cambió de verdad (si no, cada movimiento redondearía el tono y saltaría).
 */
export function DeckColorPicker({ value, onChange, labelId, disabled = false }: DeckColorPickerProps) {
  const { t } = useLanguage()
  const [open, setOpen] = React.useState(false)
  const [hsv, setHsv] = React.useState<Hsv>(() => hexToHsv(pickerHex(value)))
  const [dragging, setDragging] = React.useState(false)
  const [panelStyle, setPanelStyle] = React.useState<React.CSSProperties>({})

  const rootRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const areaRef = React.useRef<HTMLDivElement>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)

  /**
   * Ancla el panel al trigger midiendo el viewport: abre hacia abajo, o hacia
   * arriba cuando no entra, y se limita al espacio real (con scroll interno).
   */
  const updatePanelPosition = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom - PANEL_GAP
    const spaceAbove = rect.top - PANEL_GAP
    const opensUp = spaceBelow < PANEL_PREFERRED_HEIGHT && spaceAbove > spaceBelow
    const width = Math.min(
      Math.max(rect.width, PANEL_MIN_WIDTH),
      Math.max(PANEL_MIN_WIDTH, viewportWidth - PANEL_GAP * 2)
    )
    const maxLeft = Math.max(PANEL_GAP, viewportWidth - width - PANEL_GAP)
    const left = Math.min(Math.max(rect.left, PANEL_GAP), maxLeft)
    setPanelStyle({
      position: "fixed",
      left,
      width,
      maxHeight: Math.max(180, opensUp ? spaceAbove : spaceBelow),
      overflowY: "auto",
      overscrollBehavior: "contain",
      ...(opensUp
        ? { bottom: viewportHeight - rect.top + PANEL_GAP }
        : { top: rect.bottom + PANEL_GAP }),
    })
  }, [])

  React.useEffect(() => {
    const nextHex = pickerHex(value)
    setHsv((current) => (hsvToHex(current) === nextHex ? current : hexToHsv(nextHex)))
  }, [value])

  // Posición inicial + seguimiento del scroll del drawer y del resize.
  React.useLayoutEffect(() => {
    if (!open) return
    updatePanelPosition()
    const onViewportChange = () => updatePanelPosition()
    const onScroll = (event: Event) => {
      const target = event.target
      if (target instanceof Node && panelRef.current?.contains(target)) return
      updatePanelPosition()
    }
    window.addEventListener("resize", onViewportChange)
    window.addEventListener("scroll", onScroll, true)
    return () => {
      window.removeEventListener("resize", onViewportChange)
      window.removeEventListener("scroll", onScroll, true)
    }
  }, [open, updatePanelPosition])

  React.useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const hex = hsvToHex(hsv)
  const rgb = hexToRgb(hex)

  const emit = (next: Hsv) => {
    setHsv(next)
    onChange(hsvToHex(next))
  }

  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return
    const x = clampPercent(((event.clientX - rect.left) / rect.width) * 100)
    const y = clampPercent(((event.clientY - rect.top) / rect.height) * 100)
    // Sin redondear: redondear a entero acá cuantiza el arrastre y además
    // desalinea el marcador del puntero real.
    emit({ h: hsv.h, s: x, v: 100 - y })
  }

  const handleAreaPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    updateFromPointer(event)
  }

  const handleAreaPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    updateFromPointer(event)
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleAreaKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 2
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }
    const delta = deltas[event.key]
    if (!delta) return
    event.preventDefault()
    emit({
      h: hsv.h,
      s: clampPercent(hsv.s + delta[0]),
      v: clampPercent(hsv.v + delta[1]),
    })
  }

  const handleHueChange = (nextHue: number) => {
    // Un tono nuevo sobre negro no se ve: si el valor está en 0, se recupera el
    // brillo para que el arrastre tenga efecto visible.
    emit({ h: ((nextHue % 360) + 360) % 360, s: hsv.s, v: hsv.v === 0 ? 100 : hsv.v })
  }

  const handleChannelChange = (channel: "r" | "g" | "b", raw: string) => {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return
    const next = { ...rgb, [channel]: Math.min(255, Math.max(0, parsed)) }
    const nextHex = rgbToHex(next.r, next.g, next.b)
    setHsv(hexToHsv(nextHex))
    onChange(nextHex)
  }

  const currentHex = hex
  const legacyValue = isLegacyDeckColor(value) ? value : undefined

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={labelId}
        aria-label={t("up.colorTrigger")}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className="h-6 w-6 shrink-0 rounded-full ring-1 ring-black/10"
          style={{ backgroundColor: legacyValue ? PRESET_SWATCH[legacyValue] : currentHex }}
        />
        <span className="min-w-0 flex-1 truncate">
          {legacyValue ? t(PRESET_LABEL_KEY[legacyValue]) : currentHex}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t("up.colorPanel")}
            style={panelStyle}
            className="z-[60] flex flex-col gap-3 rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl"
          >
            <div
              ref={areaRef}
              role="slider"
              tabIndex={0}
              aria-label={t("up.colorDrag")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(hsv.s)}
              aria-valuetext={currentHex}
              onPointerDown={handleAreaPointerDown}
              onPointerMove={handleAreaPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onKeyDown={handleAreaKeyDown}
              className="relative h-32 w-full cursor-crosshair touch-none rounded-lg ring-1 ring-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              // El color base va en `backgroundColor`: un color sólido NO es una
              // capa válida de `background-image` y, si va ahí, invalida la
              // propiedad entera y el área queda blanca (sin gradientes).
              style={{
                backgroundColor: `hsl(${hsv.h} 100% 50%)`,
                backgroundImage:
                  "linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0))",
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
                style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, backgroundColor: currentHex }}
              />
            </div>

            <input
              type="range"
              min={0}
              max={359}
              value={Math.round(hsv.h)}
              aria-label={t("up.colorHue")}
              onChange={(event) => handleHueChange(Number(event.target.value))}
              // `appearance-none` borra el thumb nativo: hay que repintarlo o la
              // barra queda sin handle visible.
              className="h-3 w-full cursor-pointer appearance-none rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black/30 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black/30 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
              style={{ background: HUE_TRACK }}
            />

            <div className="flex items-end gap-2">
              {(["r", "g", "b"] as const).map((channel) => (
                <label key={channel} className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase text-muted-foreground">
                    {channel}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={rgb[channel]}
                    aria-label={
                      channel === "r" ? t("up.colorRed") : channel === "g" ? t("up.colorGreen") : t("up.colorBlue")
                    }
                    onChange={(event) => handleChannelChange(channel, event.target.value)}
                    className="w-full rounded-md border bg-background px-2 py-1 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-muted-foreground">{t("up.colorPresets")}</span>
              <div className="flex gap-2" role="group" aria-label={t("up.colorPresets")}>
                {LEGACY_DECK_COLORS.map((preset) => {
                  const selected = legacyValue === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onChange(preset)}
                      aria-pressed={selected}
                      aria-label={t("up.colorOption", { label: t(PRESET_LABEL_KEY[preset]) })}
                      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full ring-1 ring-black/10 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${
                        selected ? "ring-2 ring-ring" : ""
                      }`}
                      style={{ backgroundColor: PRESET_SWATCH[preset] }}
                    >
                      {selected && <Check aria-hidden="true" className="h-4 w-4 text-white drop-shadow" />}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <code className="text-xs tabular-nums text-muted-foreground">{currentHex}</code>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  triggerRef.current?.focus()
                }}
                className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                {t("up.colorClose")}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

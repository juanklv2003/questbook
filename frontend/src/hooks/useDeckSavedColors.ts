import { useCallback, useState } from "react"
import {
  addSavedDeckColor,
  readSavedDeckColors,
  removeSavedDeckColor,
} from "../lib/deckSavedColors"

/**
 * Colores de libro guardados por el usuario. La persistencia vive en
 * `lib/deckSavedColors.ts`; acá sólo se sincroniza el estado de React para que
 * el selector se repinte al guardar o borrar.
 */
export function useDeckSavedColors() {
  const [savedColors, setSavedColors] = useState<string[]>(readSavedDeckColors)

  const saveColor = useCallback((hex: string) => {
    setSavedColors(addSavedDeckColor(hex))
  }, [])

  const removeColor = useCallback((hex: string) => {
    setSavedColors(removeSavedDeckColor(hex))
  }, [])

  return { savedColors, saveColor, removeColor }
}

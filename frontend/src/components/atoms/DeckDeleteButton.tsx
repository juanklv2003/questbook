import * as React from "react"
import { Trash2 } from "lucide-react"
import { Button } from "./Button"
import apiClient from "../../lib/axios"

export interface DeckDeleteButtonProps {
  deckId: string
  onDeleteSuccess: () => void
  onDeleteError?: (error: Error) => void
}

export function DeckDeleteButton({ deckId, onDeleteSuccess, onDeleteError }: DeckDeleteButtonProps) {
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering card click
    
    if (window.confirm("¿Estás seguro de que deseas eliminar este libro? Esta acción no se puede deshacer.")) {
      try {
        setIsDeleting(true)
        await apiClient.delete(`/decks/${deckId}`)
        onDeleteSuccess()
      } catch (err: any) {
        if (onDeleteError) {
          onDeleteError(err instanceof Error ? err : new Error(err?.response?.data?.error || "Error al eliminar el libro"))
        }
      } finally {
        setIsDeleting(false)
      }
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={handleDelete}
      disabled={isDeleting}
      isLoading={isDeleting}
      aria-label="Eliminar libro"
    >
      {!isDeleting && <Trash2 className="h-4 w-4" />}
    </Button>
  )
}

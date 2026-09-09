import { useFlashcardStudy } from "../../hooks/useFlashcardStudy"
import { useDeckFlashcards } from "../../hooks/useDeckFlashcards"
import { StudyPlayer } from "../organisms/StudyPlayer"
import type { Flashcard } from "../../types"
import type { ReviewListItem } from "../molecules/StudyReviewList"
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "../atoms/Button"

export function StudySessionContainer({ deckId, onBack }: { deckId: string, onBack: () => void }) {
  const { flashcards, isLoading, error } = useDeckFlashcards(deckId);
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Cargando sesión de estudio...</p>
      </div>
    );
  }

  if (error || !flashcards.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <p className="text-muted-foreground">{error || "No se encontraron tarjetas en este libro."}</p>
        <Button variant="outline" onClick={onBack}>Volver</Button>
      </div>
    );
  }

  return <StudySessionInner flashcards={flashcards} onBack={onBack} />;
}

function StudySessionInner({ flashcards, onBack }: { flashcards: Flashcard[], onBack: () => void }) {
  const {
    tarjetaActual,
    currentIndex,
    progreso,
    total,
    haTerminado,
    respuestaUsuario,
    setRespuestaUsuario,
    evaluarRespuesta,
    isEvaluating,
    feedbackIA,
    siguienteTarjeta,
    reintentar,
    resultsById,
    goToCard
  } = useFlashcardStudy(flashcards);

  if (haTerminado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center animate-in zoom-in-95">
        <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight">¡Sesión Completada!</h2>
        <p className="text-muted-foreground max-w-md">
          Has repasado con éxito todas las {total} tarjetas de este libro. ¡Buen trabajo!
        </p>
        <Button onClick={onBack} size="lg" className="mt-4">
          Volver al Panel
        </Button>
      </div>
    );
  }

  // Sin visor de PDF: la columna izquierda es la lista de preguntas
  // (StudyPlayer la pinta como aside) y la derecha la tarjeta activa.

  // Lista de repaso: estado por tarjeta desde el historial del hook.
  const reviewItems: ReviewListItem[] = flashcards.map((f) => ({
    id: f.id,
    question: f.question,
    status:
      resultsById[f.id] === true
        ? "correct"
        : resultsById[f.id] === false
          ? "incorrect"
          : "pending",
  }));

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="w-full flex justify-start">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Volver
        </Button>
      </div>
      
      <div className="w-full">
        <StudyPlayer
          card={tarjetaActual}
          progress={progreso}
          total={total}
          userAnswer={respuestaUsuario}
          setUserAnswer={setRespuestaUsuario}
          onSubmit={evaluarRespuesta}
          isEvaluating={isEvaluating}
          evaluation={feedbackIA}
          onNext={siguienteTarjeta}
          onRetry={reintentar}
          reviewItems={reviewItems}
          activeIndex={currentIndex}
          onSelectCard={goToCard}
        />
      </div>
    </div>
  );
}

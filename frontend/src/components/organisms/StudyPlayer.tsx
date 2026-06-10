import * as React from "react"
import type { Flashcard as FlashcardType, EvaluationResult as EvaluationResultType } from '../../types'
import { Flashcard } from "../molecules/Flashcard"
import { EvaluationResult } from "../molecules/EvaluationResult"
import { Button } from "../atoms/Button"
import { TextArea } from "../atoms/TextArea"
import { Send, RotateCcw, ArrowRight } from "lucide-react"

export interface StudyPlayerProps {
  card: FlashcardType;
  progress: number;
  total: number;
  userAnswer: string;
  setUserAnswer: (val: string) => void;
  onSubmit: () => void;
  isEvaluating: boolean;
  evaluation: EvaluationResultType | null;
  onNext: () => void;
  onRetry: () => void;
}

export function StudyPlayer({
  card,
  progress,
  total,
  userAnswer,
  setUserAnswer,
  onSubmit,
  isEvaluating,
  evaluation,
  onNext,
  onRetry
}: StudyPlayerProps) {
  const [isFlipped, setIsFlipped] = React.useState(false);

  // Auto flip to back when evaluation comes in
  React.useEffect(() => {
    if (evaluation) setIsFlipped(true);
    else setIsFlipped(false);
  }, [evaluation]);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center gap-8 py-8">
      <div className="w-full flex justify-between items-center px-4">
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
          Sesión de Estudio
        </span>
        <span className="text-sm font-medium bg-secondary px-3 py-1 rounded-full">
          {progress} / {total}
        </span>
      </div>

      <div className="w-full flex justify-center">
        <Flashcard 
          question={card.question} 
          answer={card.answer} 
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(!isFlipped)}
        />
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-6 mt-4">
        {!evaluation ? (
          <div className="flex flex-col gap-4">
            <TextArea 
              placeholder="Escribe tu respuesta aquí..." 
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (userAnswer.trim() && !isEvaluating) {
                    onSubmit();
                  }
                }
              }}
              disabled={isEvaluating}
              className="text-base min-h-[120px]"
            />
            <Button 
              onClick={onSubmit} 
              isLoading={isEvaluating} 
              disabled={!userAnswer.trim()}
              className="w-full h-12 text-base"
            >
              {!isEvaluating && <Send className="w-4 h-4 mr-2" />}
              Enviar Respuesta
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
            <EvaluationResult 
              score={evaluation.score} 
              feedback={evaluation.feedback} 
              isCorrect={evaluation.isCorrect} 
            />
            <div className="flex gap-4">
              <Button variant="outline" onClick={onRetry} className="flex-1 h-12">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
              <Button onClick={onNext} className="flex-1 h-12">
                Siguiente Tarjeta
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

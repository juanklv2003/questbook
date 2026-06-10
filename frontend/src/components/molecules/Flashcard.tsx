import { motion } from "framer-motion"

export interface FlashcardProps {
  question: string;
  answer?: string;
  isFlipped: boolean;
  onFlip?: () => void;
}

export function Flashcard({ question, answer, isFlipped, onFlip }: FlashcardProps) {
  return (
    <div className="w-full max-w-2xl aspect-[3/2] perspective-1000 cursor-pointer" onClick={onFlip}>
      <motion.div
        className="w-full h-full relative transform-style-3d transition-all duration-500 ease-out"
        animate={{ rotateX: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
      >
        {/* Front */}
        <div className="absolute inset-0 backface-hidden bg-card border border-border shadow-lg rounded-xl flex items-center justify-center p-8 text-center hover:shadow-xl transition-shadow">
          <h3 className="text-2xl font-medium tracking-tight text-card-foreground">
            {question}
          </h3>
          <div className="absolute bottom-4 text-xs text-muted-foreground opacity-50">
            Haz clic para voltear
          </div>
        </div>
        
        {/* Back */}
        <div 
          className="absolute inset-0 backface-hidden bg-primary text-primary-foreground shadow-lg rounded-xl flex items-center justify-center p-8 text-center"
          style={{ transform: "rotateX(180deg)" }}
        >
          <div className="overflow-y-auto max-h-full w-full">
            <p className="text-xl leading-relaxed opacity-90">
              {answer || "Respuesta no disponible"}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

import { Badge } from "../atoms/Badge"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle } from "lucide-react"

export interface EvaluationResultProps {
  score: number;
  feedback: string;
  isCorrect: boolean;
}

export function EvaluationResult({ score, feedback, isCorrect }: EvaluationResultProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-xl border backdrop-blur-sm shadow-sm flex flex-col gap-4 ${
        isCorrect 
          ? "bg-emerald-500/5 border-emerald-500/20" 
          : "bg-rose-500/5 border-rose-500/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-500" />
          )}
          <span className="font-semibold text-lg">Puntuación: {score}%</span>
        </div>
        <Badge 
          color={isCorrect ? "success" : "danger"} 
          label={isCorrect ? "Correcto" : "Necesita Repaso"} 
        />
      </div>
      <p className="text-muted-foreground leading-relaxed text-sm">
        {feedback}
      </p>
    </motion.div>
  )
}

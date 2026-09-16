import { Badge } from "../atoms/Badge"
import { motion } from "framer-motion"
import { CheckCircle2, XCircle } from "lucide-react"
import { useLanguage } from "../../i18n/LanguageContext"

export interface EvaluationResultProps {
  score: number;
  feedback: string;
  isCorrect: boolean;
}

export function EvaluationResult({ score, feedback, isCorrect }: EvaluationResultProps) {
  const { t } = useLanguage();
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 sm:p-6 rounded-xl border bg-card text-card-foreground shadow-md flex flex-col gap-4 ${
        isCorrect
          ? "border-emerald-500/30"
          : "border-destructive/30"
      }`}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <XCircle className="w-6 h-6 text-destructive" />
          )}
          <span className="font-semibold text-lg">{t("eval.score", { score })}</span>
        </div>
        <Badge 
          color={isCorrect ? "success" : "danger"} 
          label={isCorrect ? t("eval.correct") : t("eval.needsReview")} 
        />
      </div>
      <p className="min-w-0 text-card-foreground/90 leading-relaxed text-sm break-words">
        {feedback}
      </p>
    </motion.div>
  )
}

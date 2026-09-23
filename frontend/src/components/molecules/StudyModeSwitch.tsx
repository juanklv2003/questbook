import { Sparkles, Zap } from "lucide-react"
import { cn } from "../../lib/utils"
import { useLanguage } from "../../i18n/LanguageContext"
import type { StudyMode } from "../../lib/studyMode"

export interface StudyModeSwitchProps {
  mode: StudyMode;
  onChange: (mode: StudyMode) => void;
  className?: string;
}

export function StudyModeSwitch({ mode, onChange, className }: StudyModeSwitchProps) {
  const { t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("settings.studyModeTitle")}
      className={cn(
        "inline-flex rounded-full border border-border/80 bg-muted/40 p-0.5 text-xs font-medium",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onChange("ai")}
        aria-pressed={mode === "ai"}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors",
          mode === "ai"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t("study.modeAi")}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange("quick")}
        aria-pressed={mode === "quick"}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 transition-colors",
          mode === "quick"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{t("study.modeQuick")}</span>
      </button>
    </div>
  );
}

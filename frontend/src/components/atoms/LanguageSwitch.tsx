import { Languages } from "lucide-react";
import { useLanguage, type Locale } from "../../i18n/LanguageContext";
import { cn } from "../../lib/utils";

const OPTIONS: Locale[] = ["es", "en"];

interface LanguageSwitchProps {
  /** "responsive" (default): ES|EN pill on sm+, single toggle below sm.
   * "full": always the ES|EN pill (e.g. inside Settings). */
  variant?: "responsive" | "full";
  className?: string;
}

/**
 * Compact ES|EN language switch (h-9 pill, aria-pressed per option).
 * On small screens the responsive variant collapses to a single button
 * that toggles to the other locale, so the navbar never overflows 360px.
 */
export function LanguageSwitch({ variant = "responsive", className }: LanguageSwitchProps) {
  const { locale, setLocale, toggleLocale, t } = useLanguage();
  const next: Locale = locale === "es" ? "en" : "es";

  const pill = (visibleClasses: string) => (
    <div
      role="group"
      aria-label={t("lang.switchLabel")}
      className={cn(
        "h-9 items-center gap-0.5 rounded-full border bg-secondary/60 p-1",
        visibleClasses,
        className
      )}
    >
      <Languages className="ml-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {OPTIONS.map((option) => {
        const active = locale === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={active}
            aria-label={option === "es" ? "Español" : "English"}
            className={cn(
              "flex h-7 cursor-pointer items-center rounded-full px-2 text-[11px] font-bold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.toUpperCase()}
          </button>
        );
      })}
    </div>
  );

  if (variant === "full") return pill("inline-flex");

  return (
    <span className={cn("inline-flex items-center", className)}>
      {pill("hidden sm:inline-flex")}
      <button
        type="button"
        onClick={toggleLocale}
        aria-label={t("lang.toggleAria")}
        title={t("lang.switchLabel")}
        className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border bg-secondary/60 px-2.5 text-[11px] font-bold tracking-wide text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:hidden"
      >
        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
        {next.toUpperCase()}
      </button>
    </span>
  );
}

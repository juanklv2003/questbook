import * as React from "react";
import { formatCountdown, getRemainingSeconds } from "../../lib/quota";
import { useLanguage } from "../../i18n/LanguageContext";
import type { QuotaExceededInfo } from "../../types";

export type QuotaAction = "generate" | "evaluate";

export interface QuotaCountdownAlertProps {
  quota: QuotaExceededInfo;
  onAcknowledge: () => void;
  /** Which verb to render in the countdown sentence. Defaults to "generate". */
  actionKey?: QuotaAction;
  /**
   * @deprecated Verbatim verb override (kept for callers not yet on actionKey).
   * Prefer actionKey so the verb follows the active locale.
   */
  action?: string;
}

/**
 * Quota notice with a live mm:ss countdown until resetAt.
 * The action button stays disabled until the wait is over.
 */
export function QuotaCountdownAlert({ quota, onAcknowledge, actionKey = "generate", action }: QuotaCountdownAlertProps) {
  const { t } = useLanguage();
  const [remaining, setRemaining] = React.useState(() => getRemainingSeconds(quota.resetAt));

  // Tick every second; always clean up on unmount or quota change.
  React.useEffect(() => {
    setRemaining(getRemainingSeconds(quota.resetAt));
    const timer = window.setInterval(() => {
      setRemaining(getRemainingSeconds(quota.resetAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [quota.resetAt]);

  const ready = remaining <= 0;
  const verb = action ?? t(actionKey === "evaluate" ? "quota.evaluate" : "quota.generate");
  const countdown = formatCountdown(remaining);

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <p className="font-medium text-foreground">
        {t("quota.message", { action: verb, countdown })}
      </p>
      <button
        type="button"
        onClick={onAcknowledge}
        disabled={!ready}
        className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
      >
        {ready ? t("quota.retry") : t("quota.wait", { countdown })}
      </button>
    </div>
  );
}

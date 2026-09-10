import * as React from "react";
import { formatCountdown, getRemainingSeconds } from "../../lib/quota";
import type { QuotaExceededInfo } from "../../types";

export interface QuotaCountdownAlertProps {
  quota: QuotaExceededInfo;
  onAcknowledge: () => void;
  /** Action verb shown in the countdown sentence. Defaults to "generar". */
  action?: string;
}

/**
 * Quota notice with a live mm:ss countdown until resetAt.
 * The action button stays disabled until the wait is over.
 */
export function QuotaCountdownAlert({ quota, onAcknowledge, action = "generar" }: QuotaCountdownAlertProps) {
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

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
    >
      <p className="font-medium text-foreground">
        Has alcanzado el límite gratuito de la IA. Podrás {action} de nuevo en {formatCountdown(remaining)}.
      </p>
      <button
        type="button"
        onClick={onAcknowledge}
        disabled={!ready}
        className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
      >
        {ready ? "Entendido, reintentar" : `Espera ${formatCountdown(remaining)}`}
      </button>
    </div>
  );
}

import { useState } from 'react';
import apiClient from '../lib/axios';
import { parseOverloaded, parseQuotaExceeded } from '../lib/quota';
import { useLanguage } from '../i18n/LanguageContext';
import type { EvaluationResult, ModelOverloadedInfo, QuotaExceededInfo } from '../types';


export function useEvaluator() {
  const { t } = useLanguage();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Structured quota state, same contract as useDeckGenerator.
  const [quotaExceeded, setQuotaExceeded] = useState<QuotaExceededInfo | null>(null);
  // Structured saturation state (503). Same countdown shape as the quota block.
  const [overloaded, setOverloaded] = useState<ModelOverloadedInfo | null>(null);

  const clearError = () => {
    setError(null);
    setQuotaExceeded(null);
    setOverloaded(null);
  };

  const evaluateAnswer = async (
    flashcardId: string,
    userAnswer: string
  ): Promise<EvaluationResult> => {
    setIsEvaluating(true);
    setError(null);
    setQuotaExceeded(null);
    setOverloaded(null);

    try {
      const response = await apiClient.post(`/evaluations/evaluate`, {
        flashcardId,
        userAnswer
      });

      return response.data;
    } catch (err: unknown) {
      const quota = parseQuotaExceeded(err);
      if (quota) {
        setQuotaExceeded(quota);
        const message =
          err instanceof Object &&
          err !== null &&
          'response' in err &&
          err.response instanceof Object &&
          err.response !== null &&
          'data' in err.response &&
          err.response.data instanceof Object &&
          err.response.data !== null &&
          'error' in err.response.data
            ? err.response.data.error
            : t('eval.quota');
        setError(message);
      } else if (parseOverloaded(err)) {
        const saturation = parseOverloaded(err);
        if (saturation) {
          setOverloaded(saturation);
          const message =
            err instanceof Object &&
            err !== null &&
            'response' in err &&
            err.response instanceof Object &&
            err.response !== null &&
            'data' in err.response &&
            err.response.data instanceof Object &&
            err.response.data !== null &&
            'error' in err.response.data
              ? err.response.data.error
              : t('eval.overloaded');
          setError(message);
        }
      } else {
        const message =
          err instanceof Object &&
          err !== null &&
          'response' in err &&
          err.response instanceof Object &&
          err.response !== null &&
          'data' in err.response &&
          err.response.data instanceof Object &&
          err.response.data !== null &&
          'error' in err.response.data
            ? err.response.data.error
            : err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : t('eval.generic');
        setError(message);
      }
      throw err;
    } finally {
      setIsEvaluating(false);
    }
  };

  return { evaluateAnswer, isEvaluating, error, quotaExceeded, overloaded, clearError };
}

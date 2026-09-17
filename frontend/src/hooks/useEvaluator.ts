import { useState } from 'react';
import apiClient from '../lib/axios';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { parseOverloaded, parseQuotaExceeded } from '../lib/quota';
import { useLanguage } from '../i18n/LanguageContext';
import type { EvaluationResult, ModelOverloadedInfo, QuotaExceededInfo } from '../types';

export function useEvaluator() {
  const { t } = useLanguage();
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<QuotaExceededInfo | null>(null);
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
        userAnswer,
      });

      return response.data;
    } catch (err: unknown) {
      const quota = parseQuotaExceeded(err);
      if (quota) {
        setQuotaExceeded(quota);
      } else {
        const saturation = parseOverloaded(err);
        if (saturation) {
          setOverloaded(saturation);
        }
      }
      setError(getApiErrorMessage(err, t, 'eval'));
      throw err;
    } finally {
      setIsEvaluating(false);
    }
  };

  return { evaluateAnswer, isEvaluating, error, quotaExceeded, overloaded, clearError };
}

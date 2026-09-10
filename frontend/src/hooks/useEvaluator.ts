import { useState } from 'react';
import apiClient from '../lib/axios';
import { parseQuotaExceeded } from '../lib/quota';
import type { EvaluationResult, QuotaExceededInfo } from '../types';


export function useEvaluator() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Structured quota state, same contract as useDeckGenerator.
  const [quotaExceeded, setQuotaExceeded] = useState<QuotaExceededInfo | null>(null);

  const clearError = () => {
    setError(null);
    setQuotaExceeded(null);
  };

  const evaluateAnswer = async (
    flashcardId: string,
    userAnswer: string
  ): Promise<EvaluationResult> => {
    setIsEvaluating(true);
    setError(null);
    setQuotaExceeded(null);

    try {
      const response = await apiClient.post(`/evaluations/evaluate`, {
        flashcardId,
        userAnswer
      });

      return response.data;
    } catch (err: any) {
      const quota = parseQuotaExceeded(err);
      if (quota) {
        setQuotaExceeded(quota);
        setError(err.response?.data?.error || 'Has alcanzado el límite gratuito de la IA.');
      } else {
        setError(err.response?.data?.error || err.message || 'Error al evaluar respuesta');
      }
      throw err;
    } finally {
      setIsEvaluating(false);
    }
  };

  return { evaluateAnswer, isEvaluating, error, quotaExceeded, clearError };
}

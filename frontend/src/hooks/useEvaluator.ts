import { useState } from 'react';
import apiClient from '../lib/axios';
import type { EvaluationResult } from '../types';


export function useEvaluator() {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluateAnswer = async (
    flashcardId: string,
    userAnswer: string
  ): Promise<EvaluationResult> => {
    setIsEvaluating(true);
    setError(null);

    try {
      const response = await apiClient.post(`/evaluations/evaluate`, {
        flashcardId,
        userAnswer
      });
      
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error al evaluar respuesta');
      throw err;
    } finally {
      setIsEvaluating(false);
    }
  };

  return { evaluateAnswer, isEvaluating, error };
}

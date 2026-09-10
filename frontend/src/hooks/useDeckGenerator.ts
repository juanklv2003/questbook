import { useState } from 'react';
import apiClient from '../lib/axios';
import { parseOverloaded, parseQuotaExceeded } from '../lib/quota';
import { useLanguage } from '../i18n/LanguageContext';
import type { DeckGenerationOptions, ModelOverloadedInfo, QuotaExceededInfo } from '../types';

export function useDeckGenerator() {
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Structured quota state (null = no quota block). Kept alongside the
  // legacy string error so existing callers keep working.
  const [quotaExceeded, setQuotaExceeded] = useState<QuotaExceededInfo | null>(null);
  // Structured saturation state (503). Same countdown shape as the quota block.
  const [overloaded, setOverloaded] = useState<ModelOverloadedInfo | null>(null);
  // true = upload finished and the AI is generating the cards
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const clearError = () => {
    setError(null);
    setQuotaExceeded(null);
    setOverloaded(null);
  };

  const generateDeckFromPdf = async (file: File, options: DeckGenerationOptions) => {
    setIsGenerating(true);
    setIsAiProcessing(false);
    setProgress(0);
    setError(null);
    setQuotaExceeded(null);
    setOverloaded(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', options.name);
      formData.append('cardCount', String(options.cardCount));
      formData.append('difficulty', options.difficulty);
      formData.append('color', options.color ?? 'primary');
      // New books land on the first shelf; the backend stores it on create.
      formData.append('shelf_index', '0');

      setProgress(20);

      const response = await apiClient.post(`/decks/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // The AI can be slow to respond: allow a wide margin (90s) instead
        // of hanging forever, and show a clear error when exceeded.
        timeout: 90000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          // File upload covers 20 -> 50 of the bar.
          setProgress(20 + percentCompleted * 0.3); // up to 50
          if (percentCompleted >= 100) {
            setIsAiProcessing(true);
            setProgress(60); // upload done, now the AI creates the cards
          }
        }
      });

      setProgress(100);
      setIsAiProcessing(false);

      return response.data;
    } catch (err: any) {
      setIsAiProcessing(false);
      const quota = parseQuotaExceeded(err);
      if (quota) {
        setQuotaExceeded(quota);
        setError(err.response?.data?.error || t('gen.quota'));
      } else if (parseOverloaded(err)) {
        const saturation = parseOverloaded(err);
        if (saturation) {
          setOverloaded(saturation);
          setError(err.response?.data?.error || t('gen.overloaded'));
        }
      } else if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        setError(t('gen.timeout'));
      } else {
        setError(err.response?.data?.error || err.message || t('gen.generic'));
      }
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateDeckFromPdf, isGenerating, isAiProcessing, progress, error, quotaExceeded, overloaded, clearError };
}

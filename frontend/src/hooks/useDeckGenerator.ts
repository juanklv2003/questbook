import { useState } from 'react';
import apiClient from '../lib/axios';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import { loadUploadLimits, getMaxPdfBytes, formatMaxPdfMb } from '../lib/uploadConfig';
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
      await loadUploadLimits();
      const maxBytes = getMaxPdfBytes();
      if (file.size > maxBytes) {
        const msg = t('gen.fileTooLarge', { maxMb: String(formatMaxPdfMb()) });
        setError(msg);
        throw new Error(msg);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', options.name);
      formData.append('cardCount', String(options.cardCount));
      formData.append('difficulty', options.difficulty);
      formData.append('color', options.color ?? 'primary');
      formData.append('language', options.language ?? 'en');
      // New books land on the first shelf; the backend stores it on create.
      formData.append('shelf_index', '0');

      setProgress(20);

      const response = await apiClient.post(`/decks/generate`, formData, {
        // Let axios/browser set the multipart boundary automatically — do NOT set Content-Type manually
        // (forcing 'multipart/form-data' without boundary breaks the upload)
        // Subida grande + IA con hasta 500k caracteres puede tardar varios minutos.
        timeout: 240000,
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
    } catch (err: unknown) {
      setIsAiProcessing(false);
      const quota = parseQuotaExceeded(err);
      if (quota) {
        setQuotaExceeded(quota);
      } else {
        const saturation = parseOverloaded(err);
        if (saturation) {
          setOverloaded(saturation);
        }
      }
      const status =
        err instanceof Object &&
        err !== null &&
        'response' in err &&
        (err as { response?: { status?: number } }).response?.status;
      if (status === 413) {
        setError(t('gen.fileTooLarge', { maxMb: String(formatMaxPdfMb()) }));
      } else {
        setError(getApiErrorMessage(err, t, 'deckGenerate'));
      }
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateDeckFromPdf, isGenerating, isAiProcessing, progress, error, quotaExceeded, overloaded, clearError };
}

import { useState } from 'react';
import apiClient from '../lib/axios';
import { fetchPdfUploadParams, uploadPdfToCloudinary } from '../lib/cloudinaryUpload';
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

      setProgress(5);
      const uploadParams = await fetchPdfUploadParams();
      const uploaded = await uploadPdfToCloudinary(file, uploadParams, (pct) => {
        setProgress(5 + Math.round(pct * 0.45));
      });

      setProgress(55);
      setIsAiProcessing(true);

      const response = await apiClient.post(
        `/decks/generate`,
        {
          name: options.name,
          cardCount: options.cardCount,
          difficulty: options.difficulty,
          color: options.color ?? 'primary',
          language: options.language ?? 'en',
          shelf_index: 0,
          pdfUrl: uploaded.url,
          pdfPublicId: uploaded.publicId,
        },
        {
          timeout: 240000,
          onUploadProgress: () => {
            setProgress((p) => Math.max(p, 60));
          },
        }
      );

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
      } else if (err instanceof Error && err.message.startsWith('cloudinary_upload')) {
        setError(t('gen.pdfStorage'));
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

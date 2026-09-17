import { useState } from 'react';
import apiClient from '../lib/axios';
import { fetchPdfUploadParams, uploadPdfToCloudinary } from '../lib/cloudinaryUpload';
import { generateDeckViaDirectUpload } from '../lib/directDeckUpload';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import {
  loadUploadLimits,
  getMaxPdfBytes,
  getCloudinaryMaxPdfBytes,
  getDirectUploadUrl,
  formatMaxPdfMb,
  formatCloudinaryMaxPdfMb,
} from '../lib/uploadConfig';
import { parseOverloaded, parseQuotaExceeded } from '../lib/quota';
import { useLanguage } from '../i18n/LanguageContext';
import type { DeckGenerationOptions, ModelOverloadedInfo, QuotaExceededInfo } from '../types';
import type { DirectUploadTokenResponse } from '../lib/directDeckUpload';

export function useDeckGenerator() {
  const { t } = useLanguage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<QuotaExceededInfo | null>(null);
  const [overloaded, setOverloaded] = useState<ModelOverloadedInfo | null>(null);
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

      const cloudinaryMax = getCloudinaryMaxPdfBytes();
      const useDirectApi = file.size > cloudinaryMax;

      if (useDirectApi) {
        const directUrl = getDirectUploadUrl();
        if (!directUrl) {
          const msg = t('gen.fileTooLargeCloudinary', {
            maxMb: String(formatCloudinaryMaxPdfMb()),
          });
          setError(msg);
          throw new Error(msg);
        }

        setProgress(5);
        const tokenRes = await apiClient.post<DirectUploadTokenResponse>('/decks/generate/direct-upload-token');
        setProgress(10);

        const result = await generateDeckViaDirectUpload(
          tokenRes.data.uploadUrl || directUrl,
          tokenRes.data.token,
          file,
          options,
          (pct) => {
            setProgress(10 + Math.round(pct * 0.45));
            if (pct >= 100) {
              setIsAiProcessing(true);
              setProgress(60);
            }
          }
        );

        setProgress(100);
        setIsAiProcessing(false);
        return result;
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
        const detail = err.message.split(':').slice(1).join(':').toLowerCase();
        if (detail.includes('file size too large')) {
          setError(
            t('gen.fileTooLargeCloudinary', { maxMb: String(formatCloudinaryMaxPdfMb()) })
          );
        } else {
          setError(t('gen.pdfStorage'));
        }
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

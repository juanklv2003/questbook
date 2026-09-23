import { useState } from 'react';
import apiClient from '../lib/axios';
import { generateDeckViaDirectUpload } from '../lib/directDeckUpload';
import { getApiErrorMessage } from '../lib/apiErrorMessage';
import {
  loadUploadLimits,
  getMaxPdfBytes,
  formatMaxPdfMb,
  formatCloudinaryMaxPdfMb,
} from '../lib/uploadConfig';
import { parseOverloaded, parseQuotaExceeded } from '../lib/quota';
import { useLanguage } from '../i18n/LanguageContext';
import type { DeckGenerationOptions, GenerateDeckResult, ModelOverloadedInfo, QuotaExceededInfo } from '../types';
import type { DirectUploadTokenResponse } from '../lib/directDeckUpload';

function readHttpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object' || !('response' in err)) return undefined;
  const response = (err as { response?: { status?: number } }).response;
  return response?.status;
}

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

  const generateDeckFromPdfs = async (files: File[], options: DeckGenerationOptions): Promise<GenerateDeckResult> => {
    if (files.length === 0) {
      throw new Error('no_files');
    }
    setIsGenerating(true);
    setIsAiProcessing(false);
    setProgress(0);
    setError(null);
    setQuotaExceeded(null);
    setOverloaded(null);

    try {
      await loadUploadLimits();
      const maxBytes = getMaxPdfBytes();
      for (const file of files) {
        if (file.size > maxBytes) {
          const msg = t('gen.fileTooLarge', { maxMb: String(formatMaxPdfMb()) });
          setError(msg);
          throw new Error(msg);
        }
      }

      const runDirectUpload = async (): Promise<GenerateDeckResult> => {
        setProgress(5);
        const tokenRes = await apiClient.post<DirectUploadTokenResponse>(
          '/decks/generate/direct-upload-token'
        );
        const uploadUrl = tokenRes.data.uploadUrl;
        if (!uploadUrl) {
          setError(t('gen.directUploadNotConfigured'));
          throw new Error('direct_upload_not_configured');
        }

        setProgress(10);
        const result = await generateDeckViaDirectUpload(
          uploadUrl,
          tokenRes.data.token,
          files,
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
      };

      try {
        return await runDirectUpload();
      } catch (directErr: unknown) {
        const payload =
          directErr && typeof directErr === 'object' && 'response' in directErr
            ? (directErr as { response?: { status?: number; data?: unknown } }).response
            : undefined;
        console.error('[deck-generate]', payload?.status, payload?.data);
        if (!error) {
          setError(getApiErrorMessage(directErr, t, 'deckGenerate'));
        }
        throw directErr;
      }
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
      const status = readHttpStatus(err);
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
      } else if (!error) {
        setError(getApiErrorMessage(err, t, 'deckGenerate'));
      }
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateDeckFromPdfs, isGenerating, isAiProcessing, progress, error, quotaExceeded, overloaded, clearError };
}

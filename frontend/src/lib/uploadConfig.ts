import apiClient from './axios';
import {
  setDeckGenerationBackendBudgetMs,
  setDeckGenerationClientTimeoutMs,
} from './deckGenerationTimeouts';

const DEFAULT_MAX_PDF_BYTES = 100 * 1024 * 1024;
const DEFAULT_CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024;

let maxPdfBytes = DEFAULT_MAX_PDF_BYTES;
let cloudinaryMaxPdfBytes = DEFAULT_CLOUDINARY_MAX_BYTES;
let deckSourceTextCap = 500_000;
let directUploadUrl: string | undefined;
let loaded = false;

type HealthUpload = {
  maxPdfBytes?: number;
  maxPdfMb?: number;
  deckSourceTextCap?: number;
  cloudinaryMaxPdfBytes?: number;
  cloudinaryMaxPdfMb?: number;
  directUploadBaseUrl?: string;
};

type HealthAi = {
  deckGenerationClientTimeoutMs?: number;
  deckGenerationTotalTimeoutMs?: number;
};

export async function loadUploadLimits(): Promise<number> {
  if (loaded) return maxPdfBytes;
  try {
    const { data } = await apiClient.get<{ upload?: HealthUpload; ai?: HealthAi }>('/health');
    if (typeof data.upload?.maxPdfBytes === 'number' && data.upload.maxPdfBytes > 0) {
      maxPdfBytes = data.upload.maxPdfBytes;
    }
    if (typeof data.upload?.deckSourceTextCap === 'number' && data.upload.deckSourceTextCap > 0) {
      deckSourceTextCap = data.upload.deckSourceTextCap;
    }
    if (typeof data.upload?.cloudinaryMaxPdfBytes === 'number' && data.upload.cloudinaryMaxPdfBytes > 0) {
      cloudinaryMaxPdfBytes = data.upload.cloudinaryMaxPdfBytes;
    }
    if (typeof data.upload?.directUploadBaseUrl === 'string' && data.upload.directUploadBaseUrl.length > 0) {
      directUploadUrl = data.upload.directUploadBaseUrl;
    }
    if (typeof data.ai?.deckGenerationClientTimeoutMs === 'number') {
      setDeckGenerationClientTimeoutMs(data.ai.deckGenerationClientTimeoutMs);
    }
    if (typeof data.ai?.deckGenerationTotalTimeoutMs === 'number') {
      setDeckGenerationBackendBudgetMs(data.ai.deckGenerationTotalTimeoutMs);
    }
  } catch {
    // Keep defaults aligned with backend
  }
  loaded = true;
  return maxPdfBytes;
}

export function getMaxPdfBytes(): number {
  return maxPdfBytes;
}

export function getCloudinaryMaxPdfBytes(): number {
  return cloudinaryMaxPdfBytes;
}

export function getDirectUploadUrl(): string | undefined {
  return directUploadUrl;
}

export function formatMaxPdfMb(): number {
  return Math.round(maxPdfBytes / (1024 * 1024));
}

export function formatCloudinaryMaxPdfMb(): number {
  return Math.round(cloudinaryMaxPdfBytes / (1024 * 1024));
}

export function getDeckSourceTextCap(): number {
  return deckSourceTextCap;
}

export function formatCharCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString();
}

import apiClient from './axios';

const DEFAULT_MAX_PDF_BYTES = 100 * 1024 * 1024;

let maxPdfBytes = DEFAULT_MAX_PDF_BYTES;
let loaded = false;

type HealthUpload = { maxPdfBytes?: number; maxPdfMb?: number };

export async function loadUploadLimits(): Promise<number> {
  if (loaded) return maxPdfBytes;
  try {
    const { data } = await apiClient.get<{ upload?: HealthUpload }>('/health');
    if (typeof data.upload?.maxPdfBytes === 'number' && data.upload.maxPdfBytes > 0) {
      maxPdfBytes = data.upload.maxPdfBytes;
    }
  } catch {
    // Keep default aligned with backend MAX_PDF_UPLOAD_MB=100
  }
  loaded = true;
  return maxPdfBytes;
}

export function getMaxPdfBytes(): number {
  return maxPdfBytes;
}

export function formatMaxPdfMb(): number {
  return Math.round(maxPdfBytes / (1024 * 1024));
}

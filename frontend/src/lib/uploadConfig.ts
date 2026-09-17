import apiClient from './axios';

const DEFAULT_MAX_PDF_BYTES = 100 * 1024 * 1024;
const DEFAULT_CLOUDINARY_MAX_BYTES = 10 * 1024 * 1024;

let maxPdfBytes = DEFAULT_MAX_PDF_BYTES;
let cloudinaryMaxPdfBytes = DEFAULT_CLOUDINARY_MAX_BYTES;
let directUploadUrl: string | undefined;
let loaded = false;

type HealthUpload = {
  maxPdfBytes?: number;
  maxPdfMb?: number;
  cloudinaryMaxPdfBytes?: number;
  cloudinaryMaxPdfMb?: number;
  directUploadBaseUrl?: string;
};

export async function loadUploadLimits(): Promise<number> {
  if (loaded) return maxPdfBytes;
  try {
    const { data } = await apiClient.get<{ upload?: HealthUpload }>('/health');
    if (typeof data.upload?.maxPdfBytes === 'number' && data.upload.maxPdfBytes > 0) {
      maxPdfBytes = data.upload.maxPdfBytes;
    }
    if (typeof data.upload?.cloudinaryMaxPdfBytes === 'number' && data.upload.cloudinaryMaxPdfBytes > 0) {
      cloudinaryMaxPdfBytes = data.upload.cloudinaryMaxPdfBytes;
    }
    if (typeof data.upload?.directUploadBaseUrl === 'string' && data.upload.directUploadBaseUrl.length > 0) {
      directUploadUrl = data.upload.directUploadBaseUrl;
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

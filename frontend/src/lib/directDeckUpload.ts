import axios from 'axios';
import type { DeckGenerationOptions } from '../types';

export type DirectUploadTokenResponse = {
  token: string;
  uploadUrl: string;
  expiresInSeconds: number;
  cloudinaryMaxPdfBytes: number;
};

export async function generateDeckViaDirectUpload(
  uploadUrl: string,
  token: string,
  file: File,
  options: DeckGenerationOptions,
  onProgress?: (percent: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', options.name);
  formData.append('cardCount', String(options.cardCount));
  formData.append('difficulty', options.difficulty);
  formData.append('color', options.color ?? 'primary');
  formData.append('language', options.language ?? 'es');
  formData.append('shelf_index', '0');

  const cards = options.cardCount ?? 15;
  const aiBatches = Math.max(1, Math.ceil(cards / 10));
  const timeoutMs = Math.min(
    600_000,
    60_000 + aiBatches * 100_000 + Math.ceil(file.size / (512 * 1024)) * 5_000
  );

  const response = await axios.post(uploadUrl, formData, {
    headers: { Authorization: `Bearer ${token}` },
    withCredentials: false,
    timeout: timeoutMs,
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.round((event.loaded * 100) / event.total));
    },
  });

  return response.data;
}

import axios from 'axios';
import type { DeckGenerationOptions } from '../types';
import { directDeckUploadTimeoutMs } from './deckGenerationTimeouts';

export type DirectUploadTokenResponse = {
  token: string;
  uploadUrl: string;
  expiresInSeconds: number;
  cloudinaryMaxPdfBytes: number;
};

export async function generateDeckViaDirectUpload(
  uploadUrl: string,
  token: string,
  files: File[],
  options: DeckGenerationOptions,
  onProgress?: (percent: number) => void
) {
  const formData = new FormData();
  if (files.length === 1) {
    formData.append('file', files[0]);
  } else {
    for (const f of files) {
      formData.append('files', f);
    }
  }
  formData.append('name', options.name);
  formData.append('cardCount', String(options.cardCount));
  formData.append('difficulty', options.difficulty);
  formData.append('color', options.color ?? 'primary');
  formData.append('language', options.language ?? 'es');
  formData.append('shelf_index', '0');

  const cards = options.cardCount ?? 15;
  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const timeoutMs = directDeckUploadTimeoutMs(
    { size: totalBytes, name: files[0]?.name ?? 'upload.pdf' } as File,
    cards,
    options.difficulty
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

import apiClient from './axios';

export async function fetchPdfCharacterCount(file: File): Promise<number> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<{ characters: number }>('/decks/pdf-text-stats', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return typeof data.characters === 'number' ? data.characters : 0;
}

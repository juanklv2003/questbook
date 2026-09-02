import { useState } from 'react';
import apiClient from '../lib/axios';
import type { DeckGenerationOptions } from '../types';

export function useDeckGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // true = el archivo ya subió y la IA está generando las tarjetas
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  const generateDeckFromPdf = async (file: File, options: DeckGenerationOptions) => {
    setIsGenerating(true);
    setIsAiProcessing(false);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', options.name);
      formData.append('cardCount', String(options.cardCount));
      formData.append('difficulty', options.difficulty);

      setProgress(20);

      const response = await apiClient.post(`/decks/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        // La IA puede tardar en responder: damos un margen amplio (90s) para no
        // colgar el request indefinidamente y mostrar un error claro si excede.
        timeout: 90000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          // El envío del archivo representa 20→50 de la barra.
          setProgress(20 + percentCompleted * 0.3); // up to 50
          if (percentCompleted >= 100) {
            setIsAiProcessing(true);
            setProgress(60); // subida terminada, ahora crea las tarjetas con IA
          }
        }
      });

      setProgress(100);
      setIsAiProcessing(false);

      return response.data;
    } catch (err: any) {
      setIsAiProcessing(false);
      // Si el servidor se queda sin responder (timeout) mostramos un mensaje útil.
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        setError('La IA está tardando demasiado. El documento es muy extenso; prueba con un PDF más corto o inténtalo de nuevo.');
      } else {
        setError(err.response?.data?.error || err.message || 'Error generating deck');
      }
      throw err;
    } finally {
      setIsGenerating(false);
    }
  };

  return { generateDeckFromPdf, isGenerating, isAiProcessing, progress, error };
}

import { useState } from 'react';
import type { Flashcard, EvaluationResult } from '../types';
import { useEvaluator } from './useEvaluator';

export function useFlashcardStudy(tarjetas: Flashcard[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [respuestaUsuario, setRespuestaUsuario] = useState('');
  const [feedbackIA, setFeedbackIA] = useState<EvaluationResult | null>(null);
  // Resultado por tarjeta (keyed by id: sobrevive a reordenados y evita
  // sincronizar longitudes si cambia el mazo). null/ausente = pendiente.
  const [resultsById, setResultsById] = useState<Record<string, boolean>>({});
  
  const { evaluateAnswer, isEvaluating } = useEvaluator();

  const tarjetaActual = tarjetas[currentIndex];
  const progreso = currentIndex + 1;
  const haTerminado = currentIndex >= tarjetas.length;

  const evaluar = async () => {
    if (!tarjetaActual || !respuestaUsuario.trim()) return;
    
    const result = await evaluateAnswer(
      tarjetaActual.id,
      respuestaUsuario
    );
    
    setResultsById(prev => ({ ...prev, [tarjetaActual.id]: result.isCorrect }));
    setFeedbackIA(result);
  };

  const siguienteTarjeta = () => {
    setCurrentIndex(prev => prev + 1);
    setRespuestaUsuario('');
    setFeedbackIA(null);
  };

  /** Salto directo a una tarjeta (lista de repaso). No altera resultados. */
  const goToCard = (index: number) => {
    if (index < 0 || index >= tarjetas.length) return;
    setCurrentIndex(index);
    setRespuestaUsuario('');
    setFeedbackIA(null);
  };

  const reintentar = () => {
    setRespuestaUsuario('');
    setFeedbackIA(null);
  };

  return {
    tarjetaActual,
    currentIndex,
    progreso,
    total: tarjetas.length,
    haTerminado,
    respuestaUsuario,
    setRespuestaUsuario,
    evaluarRespuesta: evaluar,
    isEvaluating,
    feedbackIA,
    siguienteTarjeta,
    reintentar,
    resultsById,
    goToCard
  };
}

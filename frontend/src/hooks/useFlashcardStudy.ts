import { useState } from 'react';
import type { Flashcard, EvaluationResult } from '../types';
import { useEvaluator } from './useEvaluator';

export function useFlashcardStudy(tarjetas: Flashcard[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [respuestaUsuario, setRespuestaUsuario] = useState('');
  const [feedbackIA, setFeedbackIA] = useState<EvaluationResult | null>(null);
  
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
    
    setFeedbackIA(result);
  };

  const siguienteTarjeta = () => {
    setCurrentIndex(prev => prev + 1);
    setRespuestaUsuario('');
    setFeedbackIA(null);
  };

  const reintentar = () => {
    setRespuestaUsuario('');
    setFeedbackIA(null);
  };

  return {
    tarjetaActual,
    progreso,
    total: tarjetas.length,
    haTerminado,
    respuestaUsuario,
    setRespuestaUsuario,
    evaluarRespuesta: evaluar,
    isEvaluating,
    feedbackIA,
    siguienteTarjeta,
    reintentar
  };
}

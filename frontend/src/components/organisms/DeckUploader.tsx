import * as React from "react"
import { UploadCloud, BrainCircuit, Loader2 } from "lucide-react"
import type { DeckGenerationOptions, Difficulty } from "../../types"

export interface DeckUploaderProps {
  onUpload: (file: File, options: DeckGenerationOptions) => void;
  isGenerating: boolean;
  progress: number;
  isAiProcessing?: boolean;
}

const CARD_COUNT_OPTIONS = [5, 10, 15, 20, 30];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; description: string }[] = [
  { value: 'easy', label: 'Fácil', description: 'Definiciones y conceptos básicos' },
  { value: 'medium', label: 'Media', description: 'Mezcla de definiciones y relaciones' },
  { value: 'hard', label: 'Difícil', description: 'Conceptos avanzados y relaciones complejas' },
];

export function DeckUploader({ onUpload, isGenerating, progress, isAiProcessing = false }: DeckUploaderProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [deckName, setDeckName] = React.useState('');
  const [cardCount, setCardCount] = React.useState<number>(15);
  const [difficulty, setDifficulty] = React.useState<Difficulty>('medium');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const name = deckName.trim() || file.name.replace('.pdf', '');
      onUpload(file, { name, cardCount, difficulty });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const name = deckName.trim() || file.name.replace('.pdf', '');
      onUpload(file, { name, cardCount, difficulty });
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
      {/* Generation options */}
      <div className="flex flex-col gap-4 p-4 rounded-xl border bg-card">
        <h4 className="text-sm font-medium text-muted-foreground">Configuración de generación</h4>

        {/* Deck name */}
        <div className="flex flex-col gap-2">
          <label htmlFor="deck-name" className="text-sm font-medium">Nombre del mazo</label>
          <input
            id="deck-name"
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Ej: Biología Celular, Derecho Penal..."
            className="w-full px-3 py-2 rounded-lg text-sm border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <p className="text-xs text-muted-foreground">Si lo dejás vacío, se usará el nombre del archivo PDF.</p>
        </div>

        {/* Card count */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Cantidad de tarjetas</label>
          <div className="flex gap-2">
            {CARD_COUNT_OPTIONS.map(count => (
              <button
                key={count}
                type="button"
                onClick={() => setCardCount(count)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  cardCount === count
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Dificultad</label>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDifficulty(option.value)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  difficulty === option.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <span className="block">{option.label}</span>
                <span className={`block text-xs mt-0.5 ${
                  difficulty === option.value ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dropzone */}
      <div
        className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl transition-all duration-200 ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 bg-card hover:bg-accent/50"
        } ${isGenerating ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleChange}
        />
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Generar Mazo desde PDF</h3>
            <p className="text-sm text-muted-foreground max-w-[260px]">
              Arrastra y suelta tu documento aquí, o haz clic para explorar. Deja que la IA haga el trabajo pesado.
            </p>
          </div>
        </div>
      </div>

      {isGenerating && (
        <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-bottom-4">
          <div className="flex justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              {isAiProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  La IA está generando tus tarjetas, puede tardar unos segundos...
                </>
              ) : (
                <>
                  <BrainCircuit className="w-4 h-4 text-primary" />
                  Subiendo y leyendo el PDF...
                </>
              )}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full bg-primary transition-all duration-300 ease-out ${isAiProcessing ? "animate-pulse" : ""}`}
              style={{ width: `${Math.min(progress, 95)}%` }}
            />
          </div>
          {isAiProcessing && (
            <p className="text-xs text-muted-foreground text-center">
              Los documentos muy extensos pueden tardar. No cierres ni recargues la página.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

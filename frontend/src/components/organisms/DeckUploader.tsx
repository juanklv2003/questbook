import * as React from "react"
import { UploadCloud, BrainCircuit, Loader2 } from "lucide-react"
export interface DeckUploaderProps {
  onUpload: (file: File) => void;
  isGenerating: boolean;
  progress: number;
  isAiProcessing?: boolean;
}

export function DeckUploader({ onUpload, isGenerating, progress, isAiProcessing = false }: DeckUploaderProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

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
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col gap-6">
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

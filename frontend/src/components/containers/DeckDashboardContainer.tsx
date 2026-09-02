import * as React from "react"
import { useDecks } from "../../hooks/useDecks"
import { useDeckGenerator } from "../../hooks/useDeckGenerator"
import { DeckUploader } from "../organisms/DeckUploader"
import { DeckDeleteButton } from "../atoms/DeckDeleteButton"
import { Button } from "../atoms/Button"
import { Play, Plus, BookOpen } from "lucide-react"
import type { DeckGenerationOptions } from "../../types"

export function DeckDashboardContainer({ onSelectDeck }: { onSelectDeck: (id: string) => void }) {
  const { decks, isLoading, setDecks } = useDecks();
  const { generateDeckFromPdf, isGenerating, isAiProcessing, progress, error } = useDeckGenerator();
  const [showUploader, setShowUploader] = React.useState(false);

  const handleUpload = async (file: File, options: DeckGenerationOptions) => {
    try {
      const result = await generateDeckFromPdf(file, options);
      // Optimistic addition
      setDecks(prev => [{
        id: result.deckId,
        name: result.name,
        flashcardsCount: result.flashcardsCount,
      } as any, ...prev]);
      setShowUploader(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (showUploader) {
    return (
      <div className="w-full flex flex-col items-center py-12 gap-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Crear Nuevo Mazo</h2>
          <p className="text-muted-foreground">Sube un PDF y generaremos tarjetas de estudio usando IA.</p>
        </div>
        <DeckUploader 
          onUpload={handleUpload} 
          isGenerating={isGenerating} 
          progress={progress} 
          isAiProcessing={isAiProcessing}
        />
        {error && <p className="text-rose-500 font-medium">{error}</p>}
        <Button variant="ghost" onClick={() => setShowUploader(false)} disabled={isGenerating}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-8 py-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tus Mazos</h2>
          <p className="text-muted-foreground mt-1">Selecciona un mazo para empezar a estudiar.</p>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Mazo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => (
            <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : decks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map(deck => (
            <div 
              key={deck.id} 
              className="group relative flex flex-col justify-between p-6 rounded-xl border bg-card hover:shadow-md transition-all hover:border-primary/50 cursor-pointer overflow-hidden"
              onClick={() => onSelectDeck(deck.id)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-semibold leading-tight pr-4">{deck.name || (deck as any).title}</h3>
                  <div className="-mt-2 -mr-2">
                    <DeckDeleteButton 
                      deckId={deck.id} 
                      onDeleteSuccess={() => {
                        setDecks(prev => prev.filter(d => d.id !== deck.id))
                      }} 
                    />
                  </div>
                </div>
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>{deck.flashcardsCount || (deck as any).cardCount} tarjetas</span>
                </div>
              </div>
              <div className="relative z-10 mt-6 flex justify-end">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Play className="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed rounded-2xl bg-muted/30">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2">No se encontraron mazos</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Aún no tienes ningún mazo de tarjetas. Crea uno subiendo un documento PDF.
          </p>
          <Button onClick={() => setShowUploader(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Primer Mazo
          </Button>
        </div>
      )}
    </div>
  )
}

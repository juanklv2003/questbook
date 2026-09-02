import * as React from "react"
import { useDecks } from "../../hooks/useDecks"
import { useDeckGenerator } from "../../hooks/useDeckGenerator"
import { DeckUploader } from "../organisms/DeckUploader"
import { BookCard } from "../molecules/BookCard"
import { Bookshelf } from "../molecules/Bookshelf"
import { Button } from "../atoms/Button"
import { Plus, BookOpen, Library } from "lucide-react"
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Library className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Mi Biblioteca</h2>
            <p className="text-muted-foreground mt-0.5">Tu colección de mazos de estudio.</p>
          </div>
        </div>
        <Button onClick={() => setShowUploader(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Mazo
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        /* Loading skeleton */
        <Bookshelf>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-44 w-full rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </Bookshelf>
      ) : decks.length > 0 ? (
        /* Bookshelf with books */
        <Bookshelf>
          {decks.map(deck => (
            <BookCard
              key={deck.id}
              deckId={deck.id}
              name={deck.name || (deck as any).title}
              flashcardsCount={deck.flashcardsCount || (deck as any).cardCount}
              onSelect={() => onSelectDeck(deck.id)}
              onDeleteSuccess={() => {
                setDecks(prev => prev.filter(d => d.id !== deck.id))
              }}
            />
          ))}
        </Bookshelf>
      ) : (
        /* Empty state */
        <div className="relative">
          {/* Empty bookshelf */}
          <Bookshelf>
            {/* Decorative empty books */}
            {[
              { h: "h-32", w: "w-8", color: "bg-primary/15", rotate: "rotate-[-2deg]" },
              { h: "h-36", w: "w-6", color: "bg-primary/10", rotate: "rotate-[1deg]" },
              { h: "h-28", w: "w-7", color: "bg-primary/12", rotate: "rotate-[-1deg]" },
            ].map((book, i) => (
              <div key={i} className="flex justify-center">
                <div className={`${book.h} ${book.w} ${book.color} ${book.rotate} rounded-sm`} />
              </div>
            ))}
          </Bookshelf>

          {/* Empty state overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
            <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 mb-4">
              <BookOpen className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-xl font-medium mb-2">Tu biblioteca está vacía</h3>
            <p className="text-muted-foreground max-w-sm mb-6 text-center px-4">
              Creá tu primer mazo subiendo un documento PDF y la IA generará tarjetas de estudio por vos.
            </p>
            <Button onClick={() => setShowUploader(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Mazo
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

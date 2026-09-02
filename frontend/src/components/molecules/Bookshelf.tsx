import { cn } from "../../lib/utils"
import { Children } from "react"

export interface BookshelfProps {
  children: React.ReactNode;
  className?: string;
  /** Number of shelves to display */
  shelves?: number;
}

/**
 * A wooden bookshelf with multiple shelves, dark interior, and realistic wood frame.
 * Books are distributed evenly across shelves.
 */
export function Bookshelf({ children, className, shelves = 3 }: BookshelfProps) {
  const childrenArray = Children.toArray(children);
  const booksPerShelf = Math.ceil(childrenArray.length / shelves);

  // Split children into shelves
  const shelfData = Array.from({ length: shelves }, (_, i) =>
    childrenArray.slice(i * booksPerShelf, (i + 1) * booksPerShelf)
  );

  return (
    <div className={cn("relative", className)}>
      {/* Main wooden frame */}
      <div className="relative rounded-lg overflow-hidden shadow-[0_12px_60px_-12px_rgba(60,30,10,0.35)]">
        {/* Top frame - thick wooden bar */}
        <div className="h-6 bg-gradient-to-b from-[#8B5A2B] via-[#A0522D] to-[#6B3E1F] relative">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-1 left-[5%] right-[10%] h-px bg-[#5D3A1A]/60" />
            <div className="absolute top-2 left-[15%] right-[5%] h-px bg-[#5D3A1A]/40" />
            <div className="absolute top-3 left-[8%] right-[20%] h-px bg-[#5D3A1A]/50" />
          </div>
          {/* Highlight on top edge */}
          <div className="absolute inset-x-0 top-0 h-px bg-[#C4884D]/60" />
        </div>

        {/* Side frames + shelves */}
        <div className="flex">
          {/* Left frame */}
          <div className="w-5 bg-gradient-to-r from-[#8B5A2B] via-[#A0522D] to-[#6B3E1F] relative flex-shrink-0">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute left-1.5 top-[10%] bottom-[10%] w-px bg-[#5D3A1A]/50" />
            </div>
            <div className="absolute inset-y-0 right-0 w-px bg-[#5D3A1A]/60" />
          </div>

          {/* Interior - dark background with shelves */}
          <div className="flex-1 bg-gradient-to-b from-[#3D2317] via-[#2D1810] to-[#3D2317]">
            {shelfData.map((shelfBooks, shelfIndex) => (
              <div key={shelfIndex}>
                {/* Shelf content */}
                <div className="relative px-4 h-[180px] flex flex-col justify-end">
                  {/* Back panel subtle texture */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#4A2C1A]/30 to-transparent" />
                  </div>

                  {/* Books on this shelf - aligned to bottom, touching shelf floor */}
                  <div className="relative flex items-end gap-1 pb-1">
                    {shelfBooks.map((child, bookIndex) => (
                      <div
                        key={bookIndex}
                        className={cn(
                          "flex-shrink-0",
                          // Slight random tilt for realism
                          bookIndex % 3 === 0 && "rotate-[-1deg]",
                          bookIndex % 3 === 1 && "rotate-[0.5deg]",
                          bookIndex % 3 === 2 && "rotate-[-0.5deg]"
                        )}
                      >
                        {child}
                      </div>
                    ))}
                    {/* Empty space fills the rest */}
                    {shelfBooks.length === 0 && (
                      <div className="text-[#8B6B4A]/30 text-sm italic">
                        Estantería vacía...
                      </div>
                    )}
                  </div>
                </div>

                {/* Wooden shelf board */}
                {shelfIndex < shelves - 1 && (
                  <div className="relative h-4">
                    {/* Main shelf board */}
                    <div className="absolute inset-x-0 h-full bg-gradient-to-b from-[#A0522D] via-[#8B5A2B] to-[#6B3E1F]" />
                    {/* Top highlight */}
                    <div className="absolute inset-x-0 top-0 h-px bg-[#C4884D]/50" />
                    {/* Bottom shadow */}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-[#3D2317]/80" />
                    {/* Wood grain */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute top-1 left-[10%] right-[15%] h-px bg-[#5D3A1A]/40" />
                      <div className="absolute top-2 left-[20%] right-[8%] h-px bg-[#5D3A1A]/30" />
                    </div>
                    {/* Shadow under shelf */}
                    <div className="absolute -bottom-1 inset-x-0 h-2 bg-gradient-to-b from-black/20 to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right frame */}
          <div className="w-5 bg-gradient-to-l from-[#8B5A2B] via-[#A0522D] to-[#6B3E1F] relative flex-shrink-0">
            <div className="absolute inset-0 opacity-40">
              <div className="absolute right-1.5 top-[10%] bottom-[10%] w-px bg-[#5D3A1A]/50" />
            </div>
            <div className="absolute inset-y-0 left-0 w-px bg-[#5D3A1A]/60" />
          </div>
        </div>

        {/* Bottom frame - thick wooden bar */}
        <div className="h-7 bg-gradient-to-b from-[#8B5A2B] via-[#7A4E2A] to-[#5D3A1A] relative">
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-1.5 left-[5%] right-[10%] h-px bg-[#4A2C1A]/50" />
            <div className="absolute top-2.5 left-[12%] right-[8%] h-px bg-[#4A2C1A]/40" />
            <div className="absolute top-3.5 left-[8%] right-[15%] h-px bg-[#4A2C1A]/50" />
          </div>
          {/* Top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-[#C4884D]/40" />
          {/* Bottom shadow */}
          <div className="absolute -bottom-3 inset-x-2 h-3 bg-gradient-to-b from-black/15 to-transparent" />
        </div>
      </div>
    </div>
  )
}

import * as React from "react"
import { cn } from "../../lib/utils"

export interface BookshelfProps {
  children: React.ReactNode;
  /** Number of shelves to render. If children exceed capacity, scrolls within shelves. */
  className?: string;
}

/**
 * A wooden bookshelf that displays BookCard children on horizontal shelves.
 * Inspired by classic library furniture with warm wood tones.
 */
export function Bookshelf({ children, className }: BookshelfProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={cn("relative", className)}>
      {/* Wooden frame - outer border */}
      <div className="relative rounded-xl overflow-hidden shadow-[0_8px_40px_-8px_rgba(120,53,15,0.2)]">
        {/* Top frame bar */}
        <div className="h-4 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-800 relative">
          <div className="absolute inset-x-0 bottom-0 h-px bg-amber-900/50" />
          {/* Wood grain lines */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1 left-[10%] right-[10%] h-px bg-amber-900/40" />
            <div className="absolute top-2 left-[20%] right-[5%] h-px bg-amber-900/30" />
          </div>
        </div>

        {/* Side frames + content area */}
        <div className="flex">
          {/* Left frame */}
          <div className="w-4 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 relative flex-shrink-0">
            <div className="absolute inset-y-0 right-0 w-px bg-amber-900/50" />
            <div className="absolute inset-0 opacity-30">
              <div className="absolute left-1 top-[15%] bottom-[15%] w-px bg-amber-900/40" />
            </div>
          </div>

          {/* Inner content with shelves */}
          <div className="flex-1 bg-gradient-to-b from-amber-950/20 via-amber-900/10 to-amber-950/20 p-4 md:p-6">
            {/* Books grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-6">
              {childrenArray.map((child, index) => (
                <div key={index} className="flex justify-center">
                  {child}
                </div>
              ))}
            </div>
          </div>

          {/* Right frame */}
          <div className="w-4 bg-gradient-to-l from-amber-700 via-amber-600 to-amber-800 relative flex-shrink-0">
            <div className="absolute inset-y-0 left-0 w-px bg-amber-900/50" />
            <div className="absolute inset-0 opacity-30">
              <div className="absolute right-1 top-[15%] bottom-[15%] w-px bg-amber-900/40" />
            </div>
          </div>
        </div>

        {/* Bottom frame bar */}
        <div className="h-5 bg-gradient-to-b from-amber-800 via-amber-700 to-amber-900 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-amber-900/50" />
          {/* Wood grain */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-2 left-[5%] right-[15%] h-px bg-amber-900/40" />
            <div className="absolute top-3 left-[15%] right-[10%] h-px bg-amber-900/30" />
          </div>
          {/* Shadow under shelf */}
          <div className="absolute -top-2 inset-x-4 h-2 bg-gradient-to-b from-black/10 to-transparent" />
        </div>
      </div>
    </div>
  )
}
